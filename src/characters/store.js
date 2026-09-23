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

const cache = new Map();      // lower-case name -> { name, sheet | null }
const pending = new Map();    // lower-case name -> Promise
const k = (name) => String(name || '').trim().toLowerCase();

function emit(name) { try { window.dispatchEvent(new CustomEvent('klite:sheet-change', { detail: { name } })); } catch (_) {} }

// Load (and cache) a character's sheet; null when the card has none. Throws if the
// character does not exist.
export async function loadSheet(name) {
    const rec = await loadCharacter(name);
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const sheet = readSheet(rec.data);
    cache.set(k(name), { name: rec.name || name, sheet });
    emit(name);
    return sheet;
}

// Cached sheet or undefined (not loaded yet — starts loading it for next time).
export function cachedSheet(name) {
    if (!name) return null;
    const hit = cache.get(k(name));
    if (hit) return hit.sheet;
    if (!pending.has(k(name))) {
        const p = loadSheet(name).catch(() => { cache.set(k(name), { name, sheet: null }); }).finally(() => pending.delete(k(name)));
        pending.set(k(name), p);
    }
    return undefined;
}

// Write the sheet into the card (null removes it). Keeps every other card field.
export async function saveSheet(name, sheet) {
    const rec = await loadCharacter(name);
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const inner = writeSheet(rec.data, sheet ? normalizeSheet(sheet) : null);
    const res = await saveCharacter({ inner, oldName: rec.name || name });
    cache.set(k(res.name), { name: res.name, sheet: readSheet(inner) });
    emit(res.name);
    return readSheet(inner);
}

export function forget(name) { cache.delete(k(name)); }

// For Worlds combat / the AI context (synchronous; undefined/null when unknown).
export function combatStatsFor(name) { const s = cachedSheet(name); return s ? toCombatStats(s) : null; }
export function summaryFor(name) { const s = cachedSheet(name); return s ? sheetSummary(s) : ''; }
