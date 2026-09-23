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
import { readSheet, writeSheet, normalizeSheet, toCombatStats, sheetSummary } from './sheet.js';

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
