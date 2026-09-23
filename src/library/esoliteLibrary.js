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
    if (image) record.image = image;
    else {
        // keep the stored portrait when the edit did not bring one
        try {
            const prev = JSON.parse(await window.indexeddb_load?.(storageKey(id), '{}') || '{}');
            if (prev && prev.image) record.image = prev.image;
        } catch (_) {}
    }
    await window.indexeddb_save?.(storageKey(id), JSON.stringify(record));
    const thumbnail = image ? await thumbnailFor(image) : (existing && existing.thumbnail);
    upsertMeta(Object.assign({}, existing || {}, { id, name, type: 'Character', favorite: !!(existing && existing.favorite) }, thumbnail ? { thumbnail } : {}));
    await saveList();
    return { id, name };
}

export async function deleteCharacter(name) {
    const meta = findMetaByName(name);
    const id = (meta && meta.id) || normalizeName(name);
    await window.indexeddb_save?.(storageKey(id));   // Esolite deletes by saving nothing
    hostSet('allCharacterNames', list().filter(m => meta ? `${m && m.id || ''}` !== `${meta.id}` : normalizeName(m && m.name) !== normalizeName(name)));
    await saveList();
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
    const api = { saveCharacter, deleteCharacter, findOrphans, recoverOrphans, isOrphanRecord };
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
