// =============================================================================
// KLITE RPmod — equipment on the character sheet (pure, no DOM): SRD 5.2.1 names for the
// autocomplete, an item's SRD definition, an attack from a weapon, and what is in hand.
// -----------------------------------------------------------------------------
// In hand vs. backpack (R8 sheet overhaul): an inventory item carries `inHand: true` when it is
// held (weapons, a shield, a torch) or worn (armor); without the flag it is in the backpack —
// sheets saved before have everything in the backpack. SRD 5.2.1 rules this module follows:
// you can draw or stow one weapon as part of each attack you make with it; other items need the
// Utilize action; a Two-Handed weapon needs both hands, a Shield one, armor none (it is worn).
// SRD 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0 (data: src/data/srd52.js, src/compendium/rules.js).
// =============================================================================
import { SRD } from '../data/srd52.js';
import * as CP from '../compendium/rules.js';

const low = (s) => String(s == null ? '' : s).trim().toLowerCase();
const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

// "+1 Longsword" / "Longsword +1" / "Longsword of Warning" → the base weapon's name (or '').
export function baseWeapon(name) {
    const n = low(name).replace(/^\+\d\s+/, '').replace(/\s+\+\d$/, '');
    const hit = Object.keys(SRD.weapons).find(w => low(w) === n) || Object.keys(SRD.weapons).find(w => n.startsWith(low(w) + ' of '));
    return hit || '';
}
export function weaponOf(name) { const b = baseWeapon(name); return b ? Object.assign({ name: b }, SRD.weapons[b]) : null; }
export const isRangedWeapon = (w) => !!w && /ranged$/.test(w.category);
export const isTwoHanded = (w) => !!w && /Two-Handed/i.test(w.properties || '');

// Names for the autocomplete (sorted, no duplicates): weapons for attacks; for the inventory
// every weapon, armor, the Shield, adventuring gear, tools and magic item of the SRD.
let ITEM_NAMES = null;
export function weaponNames() { return ['Unarmed Strike', ...Object.keys(SRD.weapons).sort()]; }
export function itemNames() {
    if (ITEM_NAMES) return ITEM_NAMES;
    const set = new Set([...Object.keys(SRD.weapons), ...Object.keys(SRD.armor), 'Shield']);
    for (const e of CP.index()) if (e.kind === 'equipment' || e.kind === 'item') set.add(e.name);
    ITEM_NAMES = [...set].sort((a, b) => a.localeCompare(b));
    return ITEM_NAMES;
}

// An item's SRD definition: { kind: weapon|armor|shield|gear|tool|magic, name, summary, text[],
// hands, ref: { kind, key } for the Compendium } or null when the SRD does not know it.
export function itemInfo(name) {
    const n = String(name || '').trim(); if (!n) return null;
    const w = weaponOf(n);
    if (w) {
        const magic = low(n) !== low(w.name) ? magicEntry(n) : null;
        return { kind: 'weapon', name: w.name, hands: isTwoHanded(w) ? 2 : 1,
            summary: `${cap(w.category)} weapon · ${w.damage} ${w.type}${w.properties ? ' · ' + w.properties : ''}${w.mastery ? ' · Mastery: ' + w.mastery : ''} · ${w.cost}`,
            text: magic ? magic.text : [], ref: magic ? magic.ref : { kind: 'equipment', key: 'weapon:' + w.name } };
    }
    if (low(n) === 'shield') return { kind: 'shield', name: 'Shield', hands: 1, summary: `Shield · +2 AC · ${SRD.shieldCost || '10 GP'}`, text: [], ref: CP.entry('equipment', 'armor:Shield') ? { kind: 'equipment', key: 'armor:Shield' } : null };
    const armorName = Object.keys(SRD.armor).find(a => low(a) === low(n));
    if (armorName) {
        const a = SRD.armor[armorName];
        const ac = `AC ${a.base}${a.dexCap === 0 ? '' : a.dexCap == null ? ' + Dex modifier' : ` + Dex modifier (max ${a.dexCap})`}`;
        return { kind: 'armor', name: armorName, hands: 0, summary: `${cap(a.category)} armor · ${ac} · ${a.cost}`, text: [], ref: { kind: 'equipment', key: 'armor:' + armorName } };
    }
    const eq = CP.find(n, 'equipment');
    if (eq && low(eq.name) === low(n)) {
        const e = CP.entry(eq.kind, eq.key); const d = (e && e.data) || {};
        const kind = d.equipment === 'tool' ? 'tool' : 'gear';
        return { kind, name: e.name, hands: 1, summary: [kind === 'tool' ? 'Tool' : 'Adventuring gear', d.weight, d.cost].filter(Boolean).join(' · '), text: (d.text || []).slice(), ref: { kind: eq.kind, key: eq.key } };
    }
    const m = magicEntry(n);
    if (m) return { kind: 'magic', name: m.name, hands: 1, summary: m.summary, text: m.text, ref: m.ref };
    return null;
}
function magicEntry(n) {
    const hit = CP.find(n, 'item'); if (!hit || low(hit.name) !== low(n)) return null;
    const e = CP.entry(hit.kind, hit.key); const d = (e && e.data) || {};
    return { name: e.name, summary: [d.type || 'Magic item', d.attunement ? 'requires attunement' : ''].filter(Boolean).join(' · '), text: (d.text || []).slice(), ref: { kind: hit.kind, key: hit.key } };
}
function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

// An attack for the sheet from a weapon name, as the builder makes it (finesse → the better of
// STR and DEX, ranged → DEX; damage dice + the ability modifier). `proficient` is left to the
// caller (the builder knows the class; a hand-made sheet assumes proficiency). null: no SRD weapon.
export function attackFromWeapon(name, abilities) {
    const w = weaponOf(name); if (!w) return null;
    const ab = abilities || {};
    const ranged = isRangedWeapon(w), finesse = /Finesse/.test(w.properties || '');
    let ability = ranged ? 'dex' : 'str';
    if (finesse && abilityMod(ab.dex) > abilityMod(ab.str)) ability = 'dex';
    const mod = abilityMod(ab[ability]);
    return { name: String(name).trim(), ability, proficient: true, bonus: 0,
        damage: w.damage + (mod ? (mod > 0 ? '+' : '') + mod : ''),
        notes: [w.type, w.properties, w.mastery && 'Mastery: ' + w.mastery].filter(Boolean).join(' · ') };
}

// ---- in hand ---------------------------------------------------------------------------------
// The inventory item an attack uses (same name, or the same base weapon), or null.
export function itemForAttack(inventory, attackName) {
    const inv = Array.isArray(inventory) ? inventory : [];
    const n = low(attackName); if (!n) return null;
    return inv.find(i => i && low(i.name) === n) || (weaponOf(attackName) ? inv.find(i => i && weaponOf(i.name) && low(i.name) === n) : null) || null;
}
// true: the attack's weapon is in hand; false: it is in the backpack; null: not a carried weapon
// (Unarmed Strike, a natural weapon, a weapon not in the inventory) — nothing to dim.
export function attackInHand(inventory, attackName) {
    const it = itemForAttack(inventory, attackName);
    if (!it || !weaponOf(it.name)) return null;
    return !!it.inHand;
}
// Hands used by what is held: a Two-Handed weapon 2, a Shield or another held item 1, worn armor 0.
export function handsUsed(inventory) {
    let n = 0;
    for (const it of Array.isArray(inventory) ? inventory : []) {
        if (!it || !it.inHand) continue;
        const info = itemInfo(it.name);
        n += info ? info.hands : 1;
    }
    return n;
}
export const HAND_RULE = 'SRD: you can draw or stow one weapon as part of each attack you make with it; getting out or putting away any other item takes the Utilize action.';
