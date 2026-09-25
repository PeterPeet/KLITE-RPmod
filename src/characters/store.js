// =============================================================================
// KLITE RPmod — Character sheets: load/save on the card in Esolite's Library
// -----------------------------------------------------------------------------
// The sheet lives in the card (data.extensions.klite_rpmod.sheet, see sheet.js) and is
// written through the Library adapter (src/library/esoliteLibrary.js), which also refreshes
// the card embedded in the portrait PNG. A small cache gives synchronous access for the
// prompt context and Worlds combat (loaded on demand; `klite:sheet-change` on window when a
// sheet is loaded, saved or removed).
// =============================================================================
import { loadCharacter, saveCharacter } from '../library/esoliteLibrary.js';
import { readSheet, writeSheet, normalizeSheet, toCombatStats, sheetSummary, derive } from './sheet.js';
import * as SP from './spell-rules.js';

const cache = new Map();      // lower-case name -> { name, sheet | null, text: { personality, description } }
const pending = new Map();    // lower-case name -> Promise
const k = (name) => String(name || '').trim().toLowerCase();

function emit(name) { try { window.dispatchEvent(new CustomEvent('klite:sheet-change', { detail: { name } })); } catch (_) {} }

// Load (and cache) a character's sheet; null when the card has none. Throws if the
// character does not exist.
export async function loadSheet(name) {
    const rec = await loadCharacter(name);
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const sheet = readSheet(rec.data);
    cache.set(k(name), { name: rec.name || name, sheet, text: cardText(rec.data) });
    emit(name);
    return sheet;
}

// The card's own descriptive text (for short blurbs); untrusted, plain strings only.
function cardText(inner) {
    const d = inner && typeof inner === 'object' ? inner : {};
    const str = (v) => (typeof v === 'string' ? v : '');
    return { personality: str(d.personality), description: str(d.description) };
}

// Cached entry or undefined (not loaded yet — starts loading it for next time).
function cachedEntry(name) {
    const hit = cache.get(k(name));
    if (hit) return hit;
    if (!pending.has(k(name))) {
        const p = loadSheet(name).catch(() => { cache.set(k(name), { name, sheet: null, text: null }); }).finally(() => pending.delete(k(name)));
        pending.set(k(name), p);
    }
    return undefined;
}

// Cached sheet or undefined (not loaded yet — starts loading it for next time).
export function cachedSheet(name) {
    if (!name) return null;
    const hit = cachedEntry(name);
    return hit ? hit.sheet : undefined;
}

// Short plain-text blurb from the card (personality, else description): '' when the card
// has none or is not loaded yet (starts loading it; `klite:sheet-change` fires when ready).
export function blurbFor(name, maxLen = 160) {
    if (!name) return '';
    const hit = cachedEntry(name);
    const t = hit && hit.text ? (hit.text.personality || hit.text.description) : '';
    if (!t) return '';
    let s = String(t).replace(/\{\{char\}\}/gi, hit.name || name).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > maxLen) s = s.slice(0, maxLen - 1) + '…';
    return s;
}

// Write the sheet into the card (null removes it). Keeps every other card field.
export async function saveSheet(name, sheet) {
    const rec = await loadCharacter(name);
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const inner = writeSheet(rec.data, sheet ? normalizeSheet(sheet) : null);
    const res = await saveCharacter({ inner, oldName: rec.name || name });
    cache.set(k(res.name), { name: res.name, sheet: readSheet(inner), text: cardText(inner) });
    emit(res.name);
    return readSheet(inner);
}

export function forget(name) { cache.delete(k(name)); }

// Game changes to a sheet (items, coins, XP, HP from quests and fights): applied to the
// cached sheet at once (synchronous readers see it) and saved into the card in the
// background, one write at a time per character. `mutate(sheet)` edits a copy.
// onMissing() runs instead when the card has no sheet. Returns the new sheet (or undefined
// while the card is still loading — then it is applied once loaded).
const writes = new Map();   // lower-case name -> Promise (serialised saves)
export function updateSheet(name, mutate, opts) {
    const onMissing = opts && opts.onMissing;
    const apply = (entry) => {
        const next = normalizeSheet(entry.sheet); mutate(next);
        entry.sheet = normalizeSheet(next);
        emit(entry.name);
        const key = k(entry.name);
        const chain = (writes.get(key) || Promise.resolve()).then(() => {
            const latest = cache.get(key);
            return latest && latest.sheet ? saveSheet(latest.name, latest.sheet) : null;
        }).catch(() => {});
        writes.set(key, chain);
        return entry.sheet;
    };
    const hit = cache.get(k(name));
    if (hit && hit.sheet) return apply(hit);
    if (hit && hit.sheet === null) { if (onMissing) onMissing(); return null; }
    loadSheet(name).then(s => { const e = cache.get(k(name)); if (s && e && e.sheet) apply(e); else if (onMissing) onMissing(); }).catch(() => { if (onMissing) onMissing(); });
    return undefined;
}
// Wait until every background write of this character is done (tests, before export).
export function flushSheet(name) { return writes.get(k(name)) || Promise.resolve(); }

// A card written elsewhere (gallery editor, import, delete) may have new text or a new sheet.
// (saveSheet refills the cache right after its own write.)
if (typeof window !== 'undefined') {
    window.addEventListener('klite:library-change', (e) => {
        const d = (e && e.detail) || {};
        if (d.oldName) forget(d.oldName);
        if (d.name) forget(d.name);
    });
}

// For Worlds combat / the AI context (synchronous; undefined/null when unknown).
export function combatStatsFor(name) { const s = cachedSheet(name); return s ? toCombatStats(s) : null; }
export function summaryFor(name) { const s = cachedSheet(name); return s ? sheetSummary(s) : ''; }

// ---- spells in combat (R5) and the long rest ------------------------------------------------
// The spells a character can cast right now (from the cached sheet): each with its combat use,
// save DC / spell attack for its ability, the slot levels it can use and free casts left.
export function combatSpellsFor(name) {
    const s = cachedSheet(name); if (!s || !s.spellcasting) return null;
    const D = derive(s), sc = D.sheet.spellcasting;
    const freeUsed = sc.freeUsed || {};
    const spells = SP.spellEntries(sc).map(e => {
        const sv = SP.spell(e.key), nums = SP.castingNumbers(D.sheet.abilities, e.ability, D.pb);
        const freeMax = e.free === 'pb' ? D.pb : e.free === 'long' ? 1 : 0;
        return { key: e.key, name: sv.name, level: sv.level, ability: e.ability, source: e.source || '', dc: nums.dc, attack: nums.attack, mod: D.mods[e.ability] || 0,
            use: SP.combatUse(sv), slots: sv.level ? SP.castableSlots(sv.level, sc.slots, sc.used) : [], freeLeft: Math.max(0, freeMax - (Number(freeUsed[e.key]) || 0)) };
    });
    return { name, level: D.sheet.level, spells, slots: sc.slots.slice(), used: (sc.used || []).slice() };
}
// Spend what a cast costs on the sheet: a slot of `slotLevel` (or the free cast); cantrips
// cost nothing. → { ok, slotLevel } or { ok: false, reason }. Goes through updateSheet (the
// same queue as HP/XP), so an open sheet takes the change into its draft.
export function spendSpell(name, key, opts = {}) {
    const info = combatSpellsFor(name); const e = info && info.spells.find(x => x.key === key);
    if (!e) return { ok: false, reason: `${name} cannot cast that spell` };
    if (!e.level) return { ok: true, slotLevel: 0 };
    if (opts.free) {
        if (e.freeLeft <= 0) return { ok: false, reason: `no free cast of ${e.name} left (back after a Long Rest)` };
        updateSheet(name, s => { const f = s.spellcasting.freeUsed = Object.assign({}, s.spellcasting.freeUsed); f[key] = (Number(f[key]) || 0) + 1; });
        return { ok: true, slotLevel: e.level, free: true };
    }
    const lvl = Number(opts.slotLevel) || e.slots[0] || 0;
    if (!lvl || lvl < e.level || !e.slots.includes(lvl)) return { ok: false, reason: lvl ? `no level ${lvl} spell slot left` : `no spell slot of level ${e.level} or higher left` };
    let ok = false;
    updateSheet(name, s => { const u = SP.spendSlot(s.spellcasting.slots, s.spellcasting.used, lvl); if (u) { s.spellcasting.used = u; ok = true; } });
    return ok ? { ok: true, slotLevel: lvl } : { ok: false, reason: `no level ${lvl} spell slot left` };
}
// Long Rest on a sheet: full HP, no temporary HP, spell slots and free casts back.
export function longRestSheet(name) {
    return updateSheet(name, s => {
        s.hp.current = s.hp.max; s.hp.temp = 0;
        if (s.spellcasting) { s.spellcasting.used = []; s.spellcasting.freeUsed = {}; }
    });
}
