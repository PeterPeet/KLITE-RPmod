// =============================================================================
// KLITE RPmod — Inventory rules (R9): pure functions, no DOM, no storage
// -----------------------------------------------------------------------------
// A Diablo-like inventory where an item's size comes from its SRD weight, not its type.
// Two rules, both from the SRD 5.2.1: a bag holds at most its pounds (Backpack 30 lb, Pouch 6 lb,
// Bag of Holding 500 lb …), and you carry up to Str × 15 lb (× 30 for Goliath's Powerful Build:
// one size larger). Beyond that, up to twice as much, you can only drag it: Speed at most 5 ft —
// that range is the "Overweight" bag. More than that cannot be taken at all. The tiles of a grid
// are a rough volume, so packing is the puzzle: footprints come from a weight bracket per kind
// (our own table, below).
//
// Data (additive on the sheet's inventory items, older sheets have none of it):
//   id     'it7'                              stable id (bags are found by it)
//   at     { bag: id | 'over' | 'pockets', x, y } | { slot: 'main'|'off'|'armor'|'back'|'belt1'|'belt2'|
//          'strap1'|'strap2'|'sheath1'|'sheath2'|'slung'|'slungShield' }
//          missing = not packed (shown in its own strip, never lost)
//   rot    true: footprint turned by 90°
//   weight number (lb per piece) — set by the player for items the SRD does not know
// `inHand` (R8) stays the truth for combat: it is set exactly for the main/off/armor slots.
// SRD 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0 (data: src/data/srd52.js, srd52-compendium.js).
// =============================================================================
import { SRD } from '../data/srd52.js';
import { COMPENDIUM } from '../data/srd52-compendium.js';

const low = (s) => String(s == null ? '' : s).trim().toLowerCase();
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const round = (n) => Math.round(n * 100) / 100;

export const OVER = 'over';
export const POCKETS = 'pockets';         // everyone has pockets (owner): a coin or a key never means Speed 5 ft
export const POCKETS_SPEC = { name: 'pockets', cap: 2, cols: 3, rows: 1 };
// Where things are carried outside the bags (owner, R9: the SRD's own packs overfill a Backpack, so
// bulky gear is strapped to it and weapons are sheathed at the belt or slung on the back):
// straps exist only while a Backpack (or Handy Haversack) is worn; one item or stack per slot; the
// back carries one weapon and one shield together (owner).
export const SLOTS = ['main', 'off', 'armor', 'back', 'belt1', 'belt2', 'strap1', 'strap2', 'sheath1', 'sheath2', 'slung', 'slungShield'];
export const SLOT_NAMES = { main: 'Main hand', off: 'Off hand', armor: 'Armor', back: 'Back', belt1: 'Belt', belt2: 'Belt',
    strap1: 'Strapped to the pack', strap2: 'Strapped to the pack', sheath1: 'Sheath', sheath2: 'Sheath', slung: 'Weapon on the back', slungShield: 'Shield on the back' };
export const STRAP_LB = 20, SHEATH_LB = 10, SLUNG_LB = 20;
const STRAPS = /^(backpack|handy haversack)$/;
export const DEFAULT_WEIGHT = 1;          // an item the SRD does not know (AI loot, a custom name)
export const COINS_PER_LB = 50;           // SRD: fifty coins weigh a pound

// ---- bags ----------------------------------------------------------------------------------
// cap: pounds it holds; cols × rows: its grid; accepts: only this kind of thing (quiver, case);
// fixed: it always weighs this much, whatever is inside; extra: extradimensional (never nest two).
const BAGS = {
    // Backpack 50 lb (owner, R9; the SRD says 30 lb, but its own equipment packs put ~50 lb of gear
    // into one): a fresh character's starting pack fits.
    'backpack': { cap: 50, cols: 8, rows: 6 },
    'sack': { cap: 30, cols: 6, rows: 5 },
    'pouch': { cap: 6, cols: 3, rows: 2 },
    'quiver': { cap: 1, cols: 1, rows: 1, accepts: /arrow/ },
    'case, crossbow bolt': { cap: 1.5, cols: 1, rows: 1, accepts: /\bbolt/ },
    'bag of holding': { cap: 500, cols: 10, rows: 10, fixed: 5, extra: true },
    'handy haversack': { cap: 900, cols: 12, rows: 10, fixed: 5, extra: true },
};
const BAG_ALIASES = { 'crossbow bolt case': 'case, crossbow bolt', 'bolt case': 'case, crossbow bolt' };
const EXTRADIMENSIONAL = /bag of holding|handy haversack|portable hole/;
export function bagSpec(item) {
    const n = low(item && item.name).replace(/\s*\(.*\)$/, '');
    const key = BAGS[n] ? n : BAG_ALIASES[n];
    return key ? Object.assign({ name: key }, BAGS[key]) : null;
}
export const isBag = (item) => !!bagSpec(item);

// ---- weight --------------------------------------------------------------------------------
// "1/2 lb." → 0.5, "58½ lb." → 58.5, "5 lb. (full)" → 5, "—" → 0, "Varies" / '' → null.
export function parseWeight(text) {
    if (typeof text === 'number') return Number.isFinite(text) && text >= 0 ? text : null;
    const s = String(text == null ? '' : text).trim();
    if (s === '—' || s === '-') return 0;
    const m = /^(\d+)?\s*(½|\d+\/\d+)?\s*lb/.exec(s); if (!m || (!m[1] && !m[2])) return null;
    let n = m[1] ? Number(m[1]) : 0;
    if (m[2] === '½') n += 0.5; else if (m[2]) { const [a, b] = m[2].split('/').map(Number); n += a / b; }
    return n;
}
let GEAR = null;
function gearByName() {
    if (GEAR) return GEAR;
    GEAR = {};
    for (const g of Object.values(COMPENDIUM.gear || {})) GEAR[low(g.name)] = g;
    return GEAR;
}
// The SRD's Adventuring Gear table weighs the Waterskin "5 lb. (full)"; its text entry has no weight.
const GEAR_FIX = { 'waterskin': 5 };
// A gear entry by a name as players and the SRD's lists write it: "Torches", "Hooded Lantern"
// (table: "Lantern, Hooded"), "Map or Scroll Cases" ("Case, Map or Scroll").
export function gear(name) {
    const G = gearByName(), n = low(name).replace(/\s*\(.*\)$/, '');
    if (!n) return null;
    for (const f of [n, n.replace(/s$/, ''), n.replace(/es$/, ''), n.replace(/ies$/, 'y')]) {
        if (G[f]) return G[f];
        const w = f.split(' '); if (w.length > 1) { const inv = w[w.length - 1] + ', ' + w.slice(0, -1).join(' '); if (G[inv]) return G[inv]; }
    }
    return null;
}
// An SRD equipment pack's contents ([{ name, qty }]) or null: "…contains the following items:
// Backpack, Bedroll, 2 flasks of Oil, 10 days of Rations, …, and Waterskin."
export function kitContents(name) {
    const g = gear(name); if (!g || !/pack$/i.test(g.name)) return null;
    const m = /contains the following items: (.+?)\.?$/.exec((g.text || []).join(' ')); if (!m) return null;
    return m[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map(t => {
        const q = /^(\d+)\s+(?:(?:flasks?|days?|sheets?) of\s+)?(.+)$/.exec(t.trim());
        const qty = q ? Number(q[1]) : 1, raw = q ? q[2] : t.trim(), hit = gear(raw);
        return { name: hit ? hit.name : raw, qty };
    }).filter(k => k.name);
}
const stripMagic = (n) => n.replace(/^\+\d\s+/, '').replace(/\s+\+\d$/, '');
function weaponName(n) {
    const b = stripMagic(n);
    return Object.keys(SRD.weapons).find(w => low(w) === b) || Object.keys(SRD.weapons).find(w => b.startsWith(low(w) + ' of ')) || '';
}
function armorName(n) {
    const b = stripMagic(n);
    return Object.keys(SRD.armor).find(a => low(a) === b) || Object.keys(SRD.armor).find(a => b.endsWith(' ' + low(a)) || b.startsWith(low(a) + ' of ')) || '';
}
// "Arrow", "20 Arrows", "Crossbow Bolts", "Sling Bullets" → the SRD Ammunition table's row.
function ammoRow(n) {
    const A = SRD.ammunition || {};
    if (/case|quiver|pouch/.test(n)) return null;
    const key = /arrow/.test(n) ? 'Arrows' : /\bbolt/.test(n) ? 'Bolts' : /sling/.test(n) && /bullet/.test(n) ? 'Bullets, Sling'
        : /bullet/.test(n) ? 'Bullets, Firearm' : /needle/.test(n) ? 'Needles' : '';
    return key && A[key] ? Object.assign({ key }, A[key]) : null;
}

// Pounds per piece: { w, guess } — guess: the SRD does not know the item (or says "Varies").
export function unitWeight(item) {
    const own = num(item && item.weight);
    if (own != null && own >= 0) return { w: own, guess: false };
    const n = low(item && item.name).replace(/\s*\(.*\)$/, '');
    if (!n) return { w: DEFAULT_WEIGHT, guess: true };
    const bag = bagSpec(item); if (bag && bag.fixed != null) return { w: bag.fixed, guess: false };
    if (/shield$/.test(n)) return { w: SRD.shieldWeight != null ? SRD.shieldWeight : 6, guess: false };
    const wn = weaponName(n); if (wn) return { w: num(SRD.weapons[wn].weight) || 0, guess: false };
    const an = armorName(n); if (an) return { w: num(SRD.armor[an].weight) || 0, guess: false };
    const ammo = ammoRow(n); if (ammo) return { w: ammo.weight / ammo.amount, guess: false };
    if (GEAR_FIX[n] != null) return { w: GEAR_FIX[n], guess: false };
    const g = gear(n);
    if (g) { const w = parseWeight(g.weight); if (w != null) return { w, guess: false }; if (GEAR_FIX[low(g.name)] != null) return { w: GEAR_FIX[low(g.name)], guess: false }; }
    return { w: DEFAULT_WEIGHT, guess: true };
}
const qtyOf = (item) => Math.max(1, Math.trunc(Number(item && item.qty) || 1));

// ---- kind (the icon) -----------------------------------------------------------------------
// weapon | armor | shield | ammo | potion | bag | gear
export function itemKind(item) {
    const n = low(item && item.name);
    if (isBag(item)) return 'bag';
    if (/shield$/.test(n)) return 'shield';
    if (weaponName(n)) return 'weapon';
    if (armorName(n)) return 'armor';
    if (ammoRow(n)) return 'ammo';
    if (/potion|elixir|philter|antitoxin/.test(n)) return 'potion';
    return 'gear';
}

// ---- footprint -----------------------------------------------------------------------------
// Pieces of up to 1 lb share a tile (2 potions, 4 darts; ammunition: one table amount per tile,
// 20 arrows, 50 needles); everything else takes tiles by its stack's weight and its kind.
export function perTile(item) {
    const n = low(item && item.name), ammo = ammoRow(n);
    if (ammo) return ammo.amount;
    const { w } = unitWeight(item);
    if (isBag(item) || w >= 1) return 1;
    return w > 0 ? Math.floor(1 / w) : 10;
}
function bracket(kind, w) {
    if (kind === 'weapon') return w <= 1 ? [1, 1] : w <= 2 ? [1, 2] : w <= 3 ? [1, 3] : w <= 4 ? [1, 4] : w <= 6 ? [2, 3] : w <= 10 ? [2, 4] : [2, 5];
    if (kind === 'armor') return w <= 12 ? [2, 3] : w <= 20 ? [3, 3] : [3, 4];
    if (kind === 'shield') return [2, 2];
    return w <= 1 ? [1, 1] : w <= 2 ? [2, 1] : w <= 4 ? [2, 2] : w <= 6 ? [3, 2] : w <= 9 ? [3, 3] : w <= 12 ? [4, 3] : w <= 20 ? [4, 4] : [5, 5];
}
// [cols, rows] of an item in a grid (turned when `rot`).
export function footprint(item) {
    const kind = itemKind(item), per = perTile(item), q = qtyOf(item);
    let fp;
    if (per > 1) fp = bracket('gear', Math.ceil(q / per));
    else {
        const { w } = unitWeight(item);
        // a bag takes room by its own size, not by what is inside
        fp = bracket(kind === 'bag' ? 'gear' : kind, Math.max(w * (kind === 'bag' ? 1 : q), 0.01));
    }
    return item && item.rot ? [fp[1], fp[0]] : fp;
}

// ---- the inventory as a tree -----------------------------------------------------------------
const ofSheet = (s) => (s && Array.isArray(s.inventory) ? s.inventory : []);
const byId = (s, id) => ofSheet(s).find(i => i && i.id === id) || null;
export function ensureIds(sheet) {
    const inv = ofSheet(sheet);
    let n = 0;
    for (const it of inv) { const m = /^it(\d+)$/.exec(it && it.id || ''); if (m) n = Math.max(n, Number(m[1])); }
    const seen = new Set();
    for (const it of inv) {
        if (!it.id || seen.has(it.id)) it.id = 'it' + (++n);
        seen.add(it.id);
    }
    return sheet;
}
export const contents = (sheet, bagId) => ofSheet(sheet).filter(i => i.at && i.at.bag === bagId);
// Weight of an item with everything inside it (a fixed-weight bag weighs only itself).
export function totalWeight(sheet, item) {
    const own = unitWeight(item).w * qtyOf(item);
    const bag = bagSpec(item);
    if (!bag || bag.fixed != null) return round(own);
    return round(own + contents(sheet, item.id).reduce((s, i) => s + totalWeight(sheet, i), 0));
}
// Pounds inside a bag (or the Overweight bag).
export function load(sheet, bagId, skip) {
    return round(contents(sheet, bagId).filter(i => i !== skip).reduce((s, i) => s + totalWeight(sheet, i), 0));
}
const isTopLevel = (sheet, it) => !it.at || it.at.slot || it.at.bag === OVER || !byId(sheet, it.at.bag);
export function coinWeight(sheet) {
    const c = (sheet && sheet.coins) || {};
    return round(Object.values(c).reduce((s, v) => s + (Number(v) || 0), 0) / COINS_PER_LB);
}
// Str × 15 lb, one size larger (× 2) with Goliath's Powerful Build.
export function capacity(sheet) {
    const str = Number(sheet && sheet.abilities && sheet.abilities.str) || 10;
    return str * 15 * (/goliath/.test(low(sheet && sheet.species)) ? 2 : 1);
}
export function carried(sheet) {
    const items = round(ofSheet(sheet).filter(i => isTopLevel(sheet, i)).reduce((s, i) => s + totalWeight(sheet, i), 0));
    const total = round(items + coinWeight(sheet)), cap = capacity(sheet);
    // slowed (SRD): more than Str × 15 lb — or anything in the Overweight bag (dragged along)
    return { total, items, coins: coinWeight(sheet), capacity: cap, limit: cap * 2, slowed: total > cap || load(sheet, OVER) > 0, over: total > cap * 2 };
}
// The Overweight bag: what you carry beyond Str × 15 lb, up to twice that (Speed at most 5 ft).
export function overSpec(sheet) {
    const cap = capacity(sheet);
    return { name: 'Overweight', cap, cols: 10, rows: Math.max(4, Math.ceil(cap / 10)) };
}
export function specOf(sheet, bagId) {
    if (bagId === OVER) return overSpec(sheet);
    if (bagId === POCKETS) return POCKETS_SPEC;
    const b = byId(sheet, bagId); return b ? bagSpec(b) : null;
}
function ancestors(sheet, bagId) {
    const out = []; let id = bagId;
    while (id && id !== OVER && id !== POCKETS && out.length < 20) { out.push(id); const b = byId(sheet, id); id = b && b.at && b.at.bag; }
    return out;
}
// Bags in the order things are packed: the bag on the back, the belt bags, bags inside those.
export function bagOrder(sheet) {
    const inv = ofSheet(sheet), order = [];
    const add = (it) => { if (!it || !isBag(it) || order.includes(it.id)) return; order.push(it.id); contents(sheet, it.id).forEach(add); };
    for (const slot of ['back', 'belt1', 'belt2']) add(inv.find(i => i.at && i.at.slot === slot));
    inv.filter(i => i.at && i.at.bag && isBag(i)).forEach(add);
    return order;
}

// ---- placing -------------------------------------------------------------------------------
const weaponOf = (item) => SRD.weapons[weaponName(low(item.name))] || null;
const isTwoHanded = (item) => { const w = weaponOf(item); return !!w && /Two-Handed/.test(w.properties || ''); };
const isHeavy = (item) => { const w = weaponOf(item); return !!w && /Heavy/.test(w.properties || ''); };
const inSlot = (sheet, slot, skip) => ofSheet(sheet).find(i => i !== skip && i.at && i.at.slot === slot) || null;
const BELT_OK = /component pouch|waterskin/;   // hung on the belt besides the bags
// '' when `item` may go to `target`, else the reason (for the player). `adding`: it comes from
// outside the inventory (loot, a buy), so the carrying limit counts it too.
export function canPlace(sheet, item, target, opts) {
    const o = opts || {}, kind = itemKind(item);
    if (!target) return 'nowhere';
    if (o.adding) {
        const c = carried(sheet), w = unitWeight(item).w * qtyOf(item);
        if (c.total + w > c.limit + 1e-9) return `too heavy: you can drag at most ${c.limit} lb`;
    }
    if (target.slot) {
        const s = target.slot, other = inSlot(sheet, s, item);
        if (!SLOTS.includes(s)) return 'no such slot';
        if (other) return `${SLOT_NAMES[s]} is taken (${other.name})`;
        if (s === 'armor') return kind === 'armor' ? '' : 'only armor is worn there';
        if (kind === 'armor') return 'armor is worn in the armor slot';
        if (s === 'back') return kind === 'bag' ? '' : 'only a bag goes on the back';
        if (s === 'belt1' || s === 'belt2') return kind === 'bag' || BELT_OK.test(low(item.name)) ? '' : 'only a pouch, a quiver, a case or a waterskin goes on the belt';
        const w = totalWeight(sheet, item);
        if (s === 'strap1' || s === 'strap2') {
            const back = inSlot(sheet, 'back', item);
            if (!back || !STRAPS.test(low(back.name))) return 'wear a backpack to strap things to it';
            if (kind === 'weapon' || kind === 'shield' || kind === 'bag') return kind === 'weapon' ? 'weapons go in a sheath or on the back' : 'that does not go on a strap';
            return w <= STRAP_LB + 1e-9 ? '' : `too heavy to strap on (more than ${STRAP_LB} lb)`;
        }
        if (s === 'sheath1' || s === 'sheath2') {
            if (kind !== 'weapon') return 'only a weapon goes in a sheath';
            if (isTwoHanded(item) || isHeavy(item)) return `${item.name} is too big for a sheath: sling it on the back`;
            return w <= SHEATH_LB + 1e-9 ? '' : `too heavy for a sheath (more than ${SHEATH_LB} lb)`;
        }
        if (s === 'slung') {
            if (kind !== 'weapon') return kind === 'shield' ? 'the shield has its own place on the back' : 'only a weapon is slung on the back';
            return w <= SLUNG_LB + 1e-9 ? '' : `too heavy to sling (more than ${SLUNG_LB} lb)`;
        }
        if (s === 'slungShield') return kind === 'shield' ? '' : 'only a shield goes there';
        const main = inSlot(sheet, 'main', item);
        if (s === 'off' && main && isTwoHanded(main)) return `${main.name} needs both hands`;
        if (s === 'off' && isTwoHanded(item)) return `${item.name} needs both hands: hold it in the main hand`;
        if (s === 'main' && isTwoHanded(item) && inSlot(sheet, 'off', item)) return `${item.name} needs both hands: free the off hand first`;
        if (kind === 'bag' && contents(sheet, item.id).length) return 'empty the bag first, or wear it';
        return '';
    }
    const spec = specOf(sheet, target.bag);
    if (!spec) return 'no such bag';
    if (target.bag === item.id || ancestors(sheet, target.bag).includes(item.id)) return 'a bag cannot go inside itself';
    if (target.bag === POCKETS && isBag(item)) return 'a bag does not go into your pockets';
    if (spec.accepts && !spec.accepts.test(low(item.name))) return `the ${spec.name} only holds ${spec.accepts.source.replace(/\\b/g, '')}s`;
    if (isBag(item) && EXTRADIMENSIONAL.test(low(item.name)) && ancestors(sheet, target.bag).some(id => EXTRADIMENSIONAL.test(low((byId(sheet, id) || {}).name))))
        return 'never put one extradimensional bag into another: it opens a gate to the Astral Plane (SRD)';
    const t = Object.assign({}, item, { rot: !!target.rot });
    const [cw, ch] = footprint(t), x = target.x | 0, y = target.y | 0;
    if (x < 0 || y < 0 || x + cw > spec.cols || y + ch > spec.rows) return 'it does not fit there';
    for (const other of contents(sheet, target.bag)) {
        if (other === item) continue;
        const [ow, oh] = footprint(other), ox = other.at.x | 0, oy = other.at.y | 0;
        if (x < ox + ow && ox < x + cw && y < oy + oh && oy < y + ch) return `${other.name} is in the way`;
    }
    // every bag on the way up must hold the extra pounds (a fixed-weight bag stops the chain)
    const w = totalWeight(sheet, item), from = item.at && item.at.bag;
    for (const id of [target.bag, ...ancestors(sheet, target.bag).slice(1)]) {
        const sp = specOf(sheet, id); if (!sp) break;
        const here = id === from || ancestors(sheet, from).includes(id);
        if (!here && load(sheet, id) + w > sp.cap + 1e-9)
            return id === OVER ? `too heavy even to drag (${load(sheet, id)} of ${sp.cap} lb overweight)` : `too heavy for the ${sp.name} (${load(sheet, id)} of ${sp.cap} lb)`;
        if (sp.fixed != null) break;
    }
    return '';
}
// Puts `item` there (no check — call canPlace first). Keeps `inHand` in step with the slots.
export function place(sheet, item, target) {
    if (!target) { delete item.at; delete item.inHand; return item; }
    if (target.slot) item.at = { slot: target.slot };
    else item.at = { bag: target.bag, x: target.x | 0, y: target.y | 0 };
    if (target.rot != null && !target.slot) { if (target.rot) item.rot = true; else delete item.rot; }
    if (target.slot && /^(main|off|armor)$/.test(target.slot)) item.inHand = true; else delete item.inHand;
    return item;
}
// The first free spot for `item` in one bag ({ bag, x, y, rot } or null), upright first.
export function spotIn(sheet, item, bagId, opts) {
    const spec = specOf(sheet, bagId); if (!spec) return null;
    for (const rot of [!!item.rot, !item.rot]) {
        for (let y = 0; y < spec.rows; y++) for (let x = 0; x < spec.cols; x++) {
            const t = { bag: bagId, x, y, rot };
            if (!canPlace(sheet, item, t, opts)) return t;
        }
    }
    return null;
}
// Where a new or unpacked item goes (never into a hand): a weapon to a sheath or slung on the
// back first, then the bags in order, the pockets, gear onto the straps, then the Overweight bag.
// null: nowhere (no room, or too heavy even to drag).
export function findSpot(sheet, item, opts) {
    const kind = itemKind(item), slot = (list) => list.find(sl => !canPlace(sheet, item, { slot: sl }, opts));
    if (BELT_OK.test(low(item.name))) { const sl = slot(['belt1', 'belt2']); if (sl) return { slot: sl }; }
    if (kind === 'weapon' || kind === 'shield') { const sl = slot(kind === 'shield' ? ['slungShield'] : ['sheath1', 'sheath2', 'slung']); if (sl) return { slot: sl }; }
    for (const id of [...bagOrder(sheet), POCKETS]) { const t = spotIn(sheet, item, id, opts); if (t) return t; }
    if (kind === 'gear' || kind === 'potion' || kind === 'ammo') { const sl = slot(['strap1', 'strap2']); if (sl) return { slot: sl }; }
    if (!(opts && opts.noOver)) return spotIn(sheet, item, OVER, opts);
    return null;
}

// ---- organize (migration, and after the game changed the list) -------------------------------
// Idempotent; never removes an item — only `at` changes. Invalid places (bag gone, out of the
// grid, overlapping, a bag overloaded) are cleared; held items (inHand, older sheets) go to the
// slots; then everything not packed is packed, largest first. What still does not fit stays
// "not packed". Returns the sheet.
export function organize(sheet) {
    const inv = ofSheet(sheet);
    if (!inv.length) return sheet;
    for (let i = inv.length - 1; i >= 0; i--) {   // an SRD equipment pack becomes its contents
        const kit = kitContents(inv[i].name); if (!kit) continue;
        const q = qtyOf(inv[i]);
        inv.splice(i, 1, ...kit.map(k => ({ name: k.name, qty: k.qty * q, notes: '' })));
    }
    ensureIds(sheet);
    const want = inv.map(i => i.at ? Object.assign({}, i.at, i.rot ? { rot: true } : {}) : null);
    for (const it of inv) { delete it.at; }
    // slots first (in list order), then bags from the outside in, so a bag exists before its contents
    const order = inv.map((it, i) => i).sort((a, b) => rank(want[a]) - rank(want[b]) || a - b);
    function rank(t) { return !t ? 9 : t.slot === 'back' ? 0 : t.slot ? 0.5 : t.bag === OVER ? 1 : 2 + depthOf(t.bag); }   // straps need the backpack
    function depthOf(id) { let d = 0, t = want[inv.findIndex(x => x.id === id)]; while (t && t.bag && t.bag !== OVER && d < 20) { d++; t = want[inv.findIndex(x => x.id === t.bag)]; } return d; }
    for (const i of order) {
        const it = inv[i], t = want[i];
        if (t && !canPlace(sheet, it, t)) place(sheet, it, t);   // else: stays unplaced (inHand kept for the hands pass)
    }
    // older sheets: what is held goes to the hands and the armor slot
    for (const it of inv) {
        if (it.at || !it.inHand) continue;
        const k = itemKind(it);
        const slots = k === 'armor' ? ['armor'] : k === 'shield' ? ['off', 'main'] : ['main', 'off'];
        const s = slots.find(sl => !canPlace(sheet, it, { slot: sl }));
        if (s) place(sheet, it, { slot: s }); else delete it.inHand;
    }
    // a bag that is not packed is worn when it can be (back, then belt)
    for (const it of inv) {
        if (it.at || !isBag(it)) continue;
        const s = ['back', 'belt1', 'belt2'].find(sl => !canPlace(sheet, it, { slot: sl }));
        if (s) place(sheet, it, { slot: s });
    }
    const loose = inv.filter(it => !it.at).sort((a, b) => totalWeight(sheet, b) - totalWeight(sheet, a));
    for (const it of loose) { const t = findSpot(sheet, it); if (t) place(sheet, it, t); }
    return sheet;
}
export const unpacked = (sheet) => ofSheet(sheet).filter(i => !i.at);

// ---- the game adds and takes things ------------------------------------------------------------
// Adds `qty` × `name`: onto a stack of the same thing when it still fits where it is, else as a
// new item in the first free spot. { item, placed, reason } — placed false: no room or too heavy
// (the caller decides: loot stays in the room, a buy is refused). With `force` it is added
// unpacked anyway (nothing the game hands out may vanish).
export function addItem(sheet, name, qty, opts) {
    const o = opts || {}, n = String(name || '').trim(); qty = Math.max(1, Math.trunc(Number(qty) || 1));
    if (!n) return { item: null, placed: false, reason: 'no name' };
    if (!Array.isArray(sheet.inventory)) sheet.inventory = [];
    const kit = kitContents(n);
    if (kit) {   // an equipment pack comes unpacked: its Backpack first, then the rest
        const res = kit.map(k => addItem(sheet, k.name, k.qty * qty, Object.assign({}, o, { force: true })));
        return { item: res[0] && res[0].item, placed: res.every(r => r.placed), reason: res.some(r => !r.placed) ? 'some of it did not fit: not packed' : '' };
    }
    ensureIds(sheet);
    const same = o.same || ((a, b) => low(a) === low(b));
    const probe = { name: n, qty };
    const c = carried(sheet), w = unitWeight(probe).w * qty;
    if (c.total + w > c.limit + 1e-9 && !o.force) return { item: null, placed: false, reason: `too heavy: you can drag at most ${c.limit} lb` };
    const ex = ofSheet(sheet).find(i => same(i.name, n) && i.at && i.at.bag);
    if (ex) {
        const grown = Object.assign({}, ex, { qty: qtyOf(ex) + qty });
        const at = Object.assign({}, ex.at, { rot: !!ex.rot });
        const before = ex.qty; ex.qty = grown.qty;
        if (!canPlace(sheet, ex, at)) return { item: ex, placed: true, reason: '' };
        ex.qty = before;
    }
    const item = { name: n, qty, notes: '' };
    sheet.inventory.push(item); ensureIds(sheet);
    const t = findSpot(sheet, item, { adding: false });
    if (t) { place(sheet, item, t); return { item, placed: true, reason: '' }; }
    if (o.force) return { item, placed: false, reason: 'no room: not packed' };
    sheet.inventory.splice(sheet.inventory.indexOf(item), 1);
    return { item: null, placed: false, reason: 'no room in your bags' };
}
// Takes an item out of the inventory (dropped, sold, given away). What was inside a bag is
// packed elsewhere (or left not packed) — never lost. Returns the removed item.
export function removeItem(sheet, item) {
    const inv = ofSheet(sheet), i = inv.indexOf(item); if (i < 0) return null;
    inv.splice(i, 1);
    for (const it of inv) if (it.at && it.at.bag === item.id) delete it.at;
    organize(sheet);
    return item;
}
// Splits `n` pieces off a stack as a new item, put in the first free spot (or not packed).
export function splitStack(sheet, item, n) {
    const q = qtyOf(item); n = Math.trunc(Number(n) || 0);
    if (q < 2 || n < 1 || n >= q) return null;
    item.qty = q - n;
    const part = { name: item.name, qty: n, notes: item.notes || '' };
    if (item.weight != null) part.weight = item.weight;
    sheet.inventory.push(part); ensureIds(sheet);
    const t = findSpot(sheet, part); if (t) place(sheet, part, t);
    return part;
}
// One line for the AI and the sheet: "Carrying 42 of 210 lb" (+ the 5 ft rule when slowed).
export function carryLine(sheet) {
    const c = carried(sheet), lb = (n) => Math.round(n * 10) / 10;
    return `Carrying ${lb(c.total)} of ${c.capacity} lb` + (c.slowed ? ` — overloaded: Speed at most 5 ft (can drag up to ${c.limit} lb)` : '');
}
// Takes an item in hand (armor: puts it on): main hand, else off hand. '' or the reason.
export function takeInHand(sheet, item) {
    const slots = itemKind(item) === 'armor' ? ['armor'] : itemKind(item) === 'shield' ? ['off', 'main'] : ['main', 'off'];
    let why = '';
    for (const sl of slots) { why = canPlace(sheet, item, { slot: sl }); if (!why) { place(sheet, item, { slot: sl }); return ''; } }
    return why;
}
// Puts a held (or any) item away: a sheath or the back for weapons, else the bags, else the
// Overweight bag; nowhere → not packed (never lost).
export function stow(sheet, item) {
    const was = item.at; delete item.at; delete item.inHand;
    const t = findSpot(sheet, item);
    if (t) place(sheet, item, t);
    else if (was && !was.slot) item.at = was;
    return item;
}
