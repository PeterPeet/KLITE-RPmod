// =============================================================================
// KLITE RPmod — Character sheets: load/save on the card in Esolite's Library
// -----------------------------------------------------------------------------
// The sheet lives in the card (data.extensions.klite_rpmod.sheet, see sheet.js) and is
// written through the Library adapter (src/library/esoliteLibrary.js), which also refreshes
// the card embedded in the portrait PNG. A small cache gives synchronous access for the
// prompt context and Worlds combat (loaded on demand; `klite:sheet-change` on window when a
// sheet is loaded, saved or removed).
//
// The live sheet (2026-10-20, a player's report of very high disk use): Esolite stores a
// character as ONE IndexedDB entry with its portrait (a PNG of often several MB, base64), so
// every game change written into the card rewrote megabytes — each HP change in a fight. Game
// changes (updateSheet) now go into a small entry of their own, `rpmod_sheet_<character id>`
// = { name, sheet, base, at }, written at once (nothing is lost if the browser crashes); the
// card is written ("folded") once the changes have been quiet for FOLD_IDLE_MS and no fight
// runs, when the page is hidden, and on flushSheet. `base` is a hash of the card's sheet the
// live sheet started from: a card changed elsewhere since (another device's sync, an import,
// an edit in Esolite) wins and the live sheet is dropped. Saves from the sheet window and the
// builder (saveSheet) write the card directly, as before.
// =============================================================================
import { loadCharacter, saveCharacter, characterIdOf } from '../library/esoliteLibrary.js';
import * as IR from '../game/inventory-rules.js';
import { readSheet, writeSheet, normalizeSheet, toCombatStats, sheetSummary, derive } from './sheet.js';
import * as SP from './spell-rules.js';

const cache = new Map();      // lower-case name -> { name, sheet | null, text: { personality, description }, rev, savedRev }
// rev counts the game changes applied to the cached sheet (updateSheet), savedRev the last one
// written to the card. While rev > savedRev the cache holds changes the card does not have yet:
// nothing read from the card (a reload, the result of an older save, a Library change) may
// replace it then — that lost XP, gold and items when rewards arrived close together (R8).
const dirty = (e) => !!e && (Number(e.rev) || 0) > (Number(e.savedRev) || 0);
const pending = new Map();    // lower-case name -> Promise
const k = (name) => String(name || '').trim().toLowerCase();

function emit(name) { try { window.dispatchEvent(new CustomEvent('klite:sheet-change', { detail: { name } })); } catch (_) {} }

// ---- the live sheet -------------------------------------------------------------------------
export const LIVE_PREFIX = 'rpmod_sheet_';
export const FOLD_IDLE_MS = 15000;
const liveKey = (name) => LIVE_PREFIX + (characterIdOf(name) || String(name || '').trim());
function sheetHash(sheet) {
    let t = ''; try { t = JSON.stringify(sheet == null ? null : normalizeSheet(sheet)); } catch (_) {}
    let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return `${t.length}:${(h >>> 0).toString(36)}`;
}
async function readLive(name) {
    try { const v = await window.indexeddb_load?.(liveKey(name), ''); const o = v ? JSON.parse(v) : null; return o && o.sheet && typeof o.sheet === 'object' ? o : null; } catch (_) { return null; }
}
function writeLive(entry) {
    try { return window.indexeddb_save?.(liveKey(entry.name), JSON.stringify({ name: entry.name, sheet: entry.sheet, base: entry.cardHash || null, at: Date.now() })); } catch (_) { return null; }
}
function dropLive(name) { try { return window.indexeddb_save?.(liveKey(name), ''); } catch (_) { return null; } }   // Esolite deletes with an empty value
const foldTimers = new Map();   // lower-case name -> timeout
function fightRunning() { try { const c = window.KLITE_RPMod_Worlds?.getCombat?.(); return !!(c && c.active && !c.outcome); } catch (_) { return false; } }
function scheduleFold(name) {
    const key = k(name); clearTimeout(foldTimers.get(key));
    foldTimers.set(key, setTimeout(() => { foldTimers.delete(key); if (fightRunning()) scheduleFold(name); else foldSheet(name); }, FOLD_IDLE_MS));
}
// Write the card now when the cache holds changes it does not have yet (one write at a time per character).
export function foldSheet(name) {
    const key = k(name); clearTimeout(foldTimers.get(key)); foldTimers.delete(key);
    const chain = (writes.get(key) || Promise.resolve()).then(() => {
        const latest = cache.get(key);
        return latest && latest.sheet && dirty(latest) ? saveSheet(latest.name, latest.sheet, { rev: latest.rev }) : null;
    }).catch(() => {});
    writes.set(key, chain);
    return chain;
}
export function foldAll() { return Promise.all([...cache.values()].filter(dirty).map(e => foldSheet(e.name))); }

// Load (and cache) a character's sheet; null when the card has none. Throws if the
// character does not exist.
export async function loadSheet(name) {
    const [rec, live0] = await Promise.all([loadCharacter(name), readLive(name)]);   // in parallel: as fast as the card alone
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const cur = cache.get(k(name));
    if (dirty(cur)) { cur.text = cardText(rec.data); return cur.sheet; }   // unsaved game changes win
    const sheet = readSheet(rec.data); const cardHash = sheetHash(sheet);
    const live = live0 || (k(rec.name) !== k(name) ? await readLive(rec.name) : null);
    const now = cache.get(k(name));
    if (dirty(now)) { now.text = cardText(rec.data); return now.sheet; }   // a game change arrived while loading
    if (live && live.base === cardHash) {
        // game changes the card does not have yet (a reload before the card was written): the live sheet wins
        const rev = (now ? Number(now.rev) || 0 : 0) + 1;
        cache.set(k(name), { name: rec.name || name, sheet: normalizeSheet(live.sheet), text: cardText(rec.data), rev, savedRev: rev - 1, cardHash });
        scheduleFold(rec.name || name);
        emit(name);
        return cache.get(k(name)).sheet;
    }
    if (live) dropLive(rec.name || name);   // the card changed elsewhere since: it wins
    cache.set(k(name), { name: rec.name || name, sheet, text: cardText(rec.data), rev: now ? now.rev : 0, savedRev: now ? now.rev : 0, cardHash });
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
// opts.rev: the change count of the cached sheet being saved (updateSheet's background write);
// without it (a direct save: the sheet window, the builder) the saved sheet is the new truth.
export async function saveSheet(name, sheet, opts) {
    const rev = opts && opts.rev != null ? Number(opts.rev) : null;
    const rec = await loadCharacter(name);
    if (!rec) throw new Error('Character not found in the Library: ' + name);
    const inner = writeSheet(rec.data, sheet ? normalizeSheet(sheet) : null);
    const before = cache.get(k(name));
    const res = await saveCharacter({ inner, oldName: rec.name || name, storedImage: rec.image || null });
    const cardHash = sheetHash(readSheet(inner));
    const cur = cache.get(k(res.name)) || cache.get(k(name)) || before;
    if (rev != null && cur && (Number(cur.rev) || 0) > rev) {
        // newer changes arrived while this save ran: keep them (their own write follows)
        cur.savedRev = Math.max(Number(cur.savedRev) || 0, rev); cur.name = res.name; cur.text = cardText(inner); cur.cardHash = cardHash;
        cache.set(k(res.name), cur);
        writeLive(cur);   // the live sheet now starts from the card just written
        emit(res.name);
        return cur.sheet;
    }
    const n = cur ? (Number(cur.rev) || 0) : 0;
    cache.set(k(res.name), { name: res.name, sheet: readSheet(inner), text: cardText(inner), rev: n, savedRev: n, cardHash });
    dropLive(res.name); if (k(res.name) !== k(name)) dropLive(name);
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
        entry.rev = (Number(entry.rev) || 0) + 1;
        emit(entry.name);
        const key = k(entry.name);
        // the live sheet at once (small), in the same queue as the card writes; the card later (scheduleFold)
        const chain = (writes.get(key) || Promise.resolve()).then(() => { const latest = cache.get(key); return latest && latest.sheet && dirty(latest) ? writeLive(latest) : null; }).catch(() => {});
        writes.set(key, chain);
        scheduleFold(entry.name);
        return entry.sheet;
    };
    const hit = cache.get(k(name));
    if (hit && hit.sheet) return apply(hit);
    if (hit && hit.sheet === null) { if (onMissing) onMissing(); return null; }
    loadSheet(name).then(s => { const e = cache.get(k(name)); if (s && e && e.sheet) apply(e); else if (onMissing) onMissing(); }).catch(() => { if (onMissing) onMissing(); });
    return undefined;
}
// R8: draw (inHand: true) or stow an inventory item — through updateSheet, so an open sheet and
// background writes agree. → the item's new state, or null when the item is not on the sheet.
export function setItemInHand(name, itemName, on) {
    let result = null;
    const n = String(itemName || '').trim().toLowerCase();
    updateSheet(name, (s) => {
        const it = s.inventory.find(i => i.name.toLowerCase() === n); if (!it) return;
        // R9: into a free hand (no free hand: held anyway, as before), or put away into a sheath or a bag
        if (on) { if (IR.takeInHand(s, it)) { delete it.at; it.inHand = true; } }
        else IR.stow(s, it);
        result = !!on;
    });
    return result;
}
// Retry/Undo of a reply puts a sheet back as it was: a game change like any other (live sheet, card later).
export function restoreSheet(name, sheet) {
    const copy = JSON.parse(JSON.stringify(sheet));
    return updateSheet(name, (s) => { for (const key of Object.keys(s)) delete s[key]; Object.assign(s, copy); });
}
// Write the card now and wait until every write of this character is done (tests, before export).
export function flushSheet(name) { return foldSheet(name); }

// A card written elsewhere (gallery editor, import, delete) may have new text or a new sheet.
// (saveSheet refills the cache right after its own write.)
if (typeof window !== 'undefined') {
    // leaving the page: write the cards (the live sheets are there in case this does not finish)
    window.addEventListener('pagehide', () => { foldAll(); });
    try { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') foldAll(); }); } catch (_) {}
    window.addEventListener('klite:library-change', (e) => {
        const d = (e && e.detail) || {};
        if (d.deleted && d.name) dropLive(d.name);
        for (const n of [d.oldName, d.name]) if (n && !dirty(cache.get(k(n)))) forget(n);   // unsaved game changes stay
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
