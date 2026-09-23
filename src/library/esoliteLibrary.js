// =============================================================================
// KLITE RPmod — Esolite Library adapter
// -----------------------------------------------------------------------------
// Esolite's Library (index.html + static/js/characterManager.js) is the one store for
// characters. RPmod's gallery (ALPHA's CHARS panel) is a view on it and writes through
// here, using Esolite's own functions so records look exactly like Esolite's:
//
//   Esolite >= 1.35: every Library entry has an `id`; the record lives under
//   `character_<id>` = { id, name, data: <TavernCard v2 inner>, image? } and the list
//   `allCharacterNames` holds { id, name, thumbnail?, type: 'Character', favorite }.
//   updateCharacterListFromAll() DROPS list entries without an id.
//
// RPmod before this adapter wrote `character_<name>` without an id and pushed list
// entries without an id, so on 1.35 an edited or imported character disappeared from
// the Library (the record stayed in storage). recoverOrphans() puts such records back.
//
// Public API: window.KLITE_RPMod_Library (also imported by ALPHA).
// =============================================================================
import { hostGet, hostSet } from '../onboarding/hostGlobals.js';

const fn = (name) => (typeof window[name] === 'function' ? window[name] : hostGet(name));
const TAVERN_FIELDS = ['description', 'personality', 'scenario', 'first_mes', 'mes_example'];

function normalizeName(name, fallback = 'Untitled') {
    const host = fn('normalizeCharacterStorageName');
    if (typeof host === 'function') return host(name, fallback);
    const n = `${name || ''}`.replaceAll(/[^\w()_\-'",!\[\].]/g, ' ').replaceAll(/\s+/g, ' ').trim();
    return n || fallback;
}
function list() { const l = hostGet('allCharacterNames'); return Array.isArray(l) ? l : []; }
function findMetaByName(name) {
    const host = fn('findCharacterMetaByName');
    if (typeof host === 'function') return host(name);
    const n = normalizeName(name);
    return list().find(m => normalizeName(m && m.name) === n);
}
const storageKey = (id) => `character_${id}`;

// ---- portrait PNG = the exported card -------------------------------------------------
// Esolite's "Download character" exports the stored PNG as-is, so the card inside it must be
// current. tavernTool.injectTextChunk appends tEXt chunks without removing old ones, and
// importers read the FIRST `chara` chunk — so old card chunks are removed before embedding.
// The card is embedded as V2 (spec + data, V1 fields mirrored) so `data.extensions` (where
// the RPmod sheet lives) survives SillyTavern/Chub imports; Esolite's importer reads both.
const CARD_KEYS = new Set(['chara', 'ccv3', 'chara_encoding', 'chara_spec']);
// Required fields of a TavernCard V2 `data` object and their empty values (spec
// "chara_card_v2"); strict importers reject a card that lacks one. Only the exported copy is
// completed — the stored record stays as it is.
const V2_DEFAULTS = { name: '', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
    creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [],
    creator: '', character_version: '', extensions: {} };
export function v2Card(inner) {
    const src = inner && typeof inner === 'object' ? inner : {};
    const d = Object.assign({}, src);
    for (const [k, v] of Object.entries(V2_DEFAULTS)) {
        const ok = Array.isArray(v) ? Array.isArray(d[k]) : (v && typeof v === 'object') ? (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) : typeof d[k] === 'string';
        if (!ok) d[k] = Array.isArray(v) ? [] : (v && typeof v === 'object') ? {} : (d[k] == null ? '' : String(d[k]));
    }
    // optional lorebook must be an object (ALPHA's editor stores a WI group name or null here)
    if ('character_book' in d && !(d.character_book && typeof d.character_book === 'object' && !Array.isArray(d.character_book))) delete d.character_book;
    return { spec: 'chara_card_v2', spec_version: '2.0', name: d.name || '', description: d.description || '', personality: d.personality || '',
        scenario: d.scenario || '', first_mes: d.first_mes || '', mes_example: d.mes_example || '', data: d };
}
export function stripCardChunks(bytes) {
    const SIG = 8; if (!bytes || bytes.length < SIG) return bytes;
    const parts = [bytes.subarray(0, SIG)]; let pos = SIG, total = SIG;
    while (pos + 12 <= bytes.length) {
        const len = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
        const end = pos + 12 + len; if (end > bytes.length) break;
        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        let drop = false;
        if (type === 'tEXt') {
            let k = pos + 8, key = '';
            while (k < pos + 8 + len && bytes[k] !== 0 && key.length < 80) key += String.fromCharCode(bytes[k++]);
            drop = CARD_KEYS.has(key);
        }
        if (!drop) { parts.push(bytes.subarray(pos, end)); total += end - pos; }
        pos = end;
        if (type === 'IEND') break;
    }
    const out = new Uint8Array(total); let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}
const PNG_PREFIX = 'data:image/png;base64,';
export function embedCardInImage(image, inner) {
    const tool = window.tavernTool;
    if (typeof image !== 'string' || !image.startsWith(PNG_PREFIX) || !tool || typeof tool.embedIntoPng !== 'function') return image;
    try {
        const bin = atob(image.slice(PNG_PREFIX.length));
        const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const out = tool.embedIntoPng(stripCardChunks(bytes), v2Card(inner));
        let text = '';
        for (let i = 0; i < out.length; i += 32768) text += String.fromCharCode.apply(null, out.subarray(i, Math.min(i + 32768, out.length)));
        return PNG_PREFIX + btoa(text);
    } catch (e) { console.error('[RPmod library] could not embed the card into the portrait', e); return image; }
}

async function thumbnailFor(image) {
    const gen = fn('generateThumbnail');
    if (!image || typeof gen !== 'function') return undefined;
    try { return await gen(image, [256, 256]); } catch (_) { return undefined; }
}
async function saveList() {
    const upd = fn('updateCharacterListFromAll');
    if (typeof upd === 'function') { await upd(); return; }
    await window.indexeddb_save?.('characterList', JSON.stringify(list()));
}
function upsertMeta(meta) {
    const host = fn('upsertCharacterMetadata');
    if (typeof host === 'function') { host(meta); return; }
    const next = list().filter(m => `${m && m.id || ''}` !== `${meta.id}`);
    next.push(meta);
    hostSet('allCharacterNames', next);
}

// Save a character: `inner` is the TavernCard v2 `data` object.
//   oldName given  → edit of that Library entry (a rename keeps its id, so links stay valid)
//   no oldName     → new entry, resolved like Esolite's own import (a taken name becomes
//                    "Name_1" unless the user enabled overwriting on name collision)
// Returns { id, name }.
export async function saveCharacter({ inner, image, oldName }) {
    const rawName = (inner && inner.name) || '';
    if (!String(rawName).trim()) throw new Error('Character must have a name.');
    let existing = oldName ? findMetaByName(oldName) : null;
    if (existing && existing.type && existing.type !== 'Character') existing = null;
    let name = normalizeName(rawName, 'No character name');
    let id;
    if (existing) {
        id = existing.id || normalizeName(existing.name);
        const clash = findMetaByName(name);
        if (clash && `${clash.id}` !== `${id}`) {   // renamed onto another entry's name
            const next = fn('getNextAutoincrementName');
            name = typeof next === 'function' ? next(name) : `${name}_1`;
        }
    } else {
        const resolve = fn('resolveCharacterNameAndId');
        const r = typeof resolve === 'function' ? resolve(rawName, 'No character name') : { name, id: name };
        name = r.name; id = r.id;
    }
    const record = { id, name, data: Object.assign({}, inner, { name: normalizeName(rawName, 'No character name') }) };
    let img = image;
    if (!img) {
        // keep the stored portrait when the edit did not bring one
        try {
            const prev = JSON.parse(await window.indexeddb_load?.(storageKey(id), '{}') || '{}');
            if (prev && prev.image) img = prev.image;
        } catch (_) {}
    }
    if (img) record.image = embedCardInImage(img, record.data);   // the exported card stays current
    await window.indexeddb_save?.(storageKey(id), JSON.stringify(record));
    const thumbnail = image ? await thumbnailFor(image) : (existing && existing.thumbnail);
    upsertMeta(Object.assign({}, existing || {}, { id, name, type: 'Character', favorite: !!(existing && existing.favorite) }, thumbnail ? { thumbnail } : {}));
    await saveList();
    libraryChanged({ name, oldName: oldName || null });
    return { id, name };
}

// `klite:library-change` on window after RPmod wrote or deleted a character
// (detail { name, oldName, deleted }) — caches keyed by name drop the entry.
function libraryChanged(detail) { try { window.dispatchEvent(new CustomEvent('klite:library-change', { detail })); } catch (_) {} }

// Load a character record ({ id, name, data, image? }) via Esolite's getCharacterData.
export async function loadCharacter(name) {
    const get = fn('getCharacterData');
    if (typeof get !== 'function' || !name) return null;
    try {
        let r = await get(name);
        if (typeof r === 'string') r = JSON.parse(r || '{}');
        return r && r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r : null;
    } catch (_) { return null; }
}
// Library entries of type Character ({ id, name, favorite, thumbnail? }), and their names.
export function characterList() { return list().filter(m => m && m.name && (m.type || 'Character') === 'Character'); }
export function characterNames() { return characterList().map(m => m.name); }

export async function deleteCharacter(name) {
    const meta = findMetaByName(name);
    const id = (meta && meta.id) || normalizeName(name);
    await window.indexeddb_save?.(storageKey(id));   // Esolite deletes by saving nothing
    hostSet('allCharacterNames', list().filter(m => meta ? `${m && m.id || ''}` !== `${meta.id}` : normalizeName(m && m.name) !== normalizeName(name)));
    await saveList();
    libraryChanged({ name, oldName: null, deleted: true });
}

// ---- recovery ---------------------------------------------------------------------
// A record is an RPmod orphan when: its key is `character_*`, no Library entry has that
// id, the record has no `id` (Esolite always writes one), and it is a TavernCard
// (data object with a name and card fields). Anything else is left alone.
function storagePrefix() { const p = hostGet('STORAGE_PREFIX'); return typeof p === 'string' ? p : null; }

export function isOrphanRecord(record) {
    if (!record || typeof record !== 'object' || record.id != null || record.dataType) return false;
    const d = record.data;
    return !!(d && typeof d === 'object' && !Array.isArray(d) && typeof d.name === 'string' && d.name.trim() &&
        TAVERN_FIELDS.some(f => f in d));
}

export async function findOrphans() {
    const prefix = storagePrefix();
    if (prefix == null || typeof window.indexeddb_load !== 'function') return [];
    // Only once Esolite has migrated its list to ids (otherwise legacy records look unreferenced).
    let stored = [];
    try { stored = JSON.parse(await window.indexeddb_load('characterList', '[]') || '[]'); } catch (_) { return []; }
    if (!Array.isArray(stored) || stored.some(m => m && !m.id)) return [];
    const referenced = new Set([...stored, ...list()].map(m => m && `${m.id}`).filter(Boolean));
    const keys = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix + 'character_')) keys.push(k.slice(prefix.length));
        }
    } catch (_) { return []; }
    const out = [];
    for (const key of keys) {
        const id = key.slice('character_'.length);
        if (!id || referenced.has(id)) continue;
        let record = null;
        try { record = JSON.parse(await window.indexeddb_load(key, '') || 'null'); } catch (_) { continue; }
        if (isOrphanRecord(record)) out.push({ key, id, record });
    }
    return out;
}

// Re-list orphaned characters under their existing key (id = the key's suffix). Never
// deletes or overwrites anything; returns the recovered names.
export async function recoverOrphans() {
    const orphans = await findOrphans();
    const names = [];
    for (const { key, id, record } of orphans) {
        let name = normalizeName(record.name || record.data.name, 'Recovered character');
        const clash = findMetaByName(name);
        if (clash) { const next = fn('getNextAutoincrementName'); name = typeof next === 'function' ? next(name) : `${name}_recovered`; }
        const fixed = Object.assign({}, record, { id, name });
        await window.indexeddb_save(key, JSON.stringify(fixed));
        const thumbnail = await thumbnailFor(record.image);
        upsertMeta(Object.assign({ id, name, type: 'Character', favorite: false }, thumbnail ? { thumbnail } : {}));
        names.push(name);
    }
    if (names.length) await saveList();
    return names;
}

export default function initLibrary() {
    'use strict';
    if (window.KLITE_RPMod_Library) return;
    const api = { saveCharacter, deleteCharacter, loadCharacter, characterNames, characterList, findOrphans, recoverOrphans, isOrphanRecord, embedCardInImage, stripCardChunks, v2Card };
    window.KLITE_RPMod_Library = api;

    // Recovery runs once per page load, after Esolite has loaded and migrated its list.
    let tries = 0;
    const attempt = async () => {
        tries++;
        // Esolite's load handler fills and migrates allCharacterNames asynchronously; an
        // empty Library is also fine after a while (findOrphans checks the stored list).
        const listReady = list().length > 0 ? list().every(m => m && m.id) : tries >= 6;
        const ready = typeof window.indexeddb_load === 'function' && storagePrefix() != null && listReady;
        if (!ready) { if (tries < 40) setTimeout(attempt, 1500); return; }
        try {
            const names = await recoverOrphans();
            if (names.length) {
                console.warn('[RPmod library] re-listed characters that an older RPmod version had hidden:', names);
                try { window.KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch (_) {}
                try { window.dispatchEvent(new CustomEvent('klite:library-recovered', { detail: { names } })); } catch (_) {}
            }
        } catch (e) { console.error('[RPmod library] recovery failed', e); }
    };
    const start = () => setTimeout(attempt, 1500);
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
}
