// =============================================================================
// KLITE RPmod — Spell rules (SRD 5.2.1): pure functions, no DOM
// -----------------------------------------------------------------------------
// Which spells a character may choose and has: class cantrips and prepared spells (counts and
// highest spell level from the class table), the wizard's spellbook, spells that come without
// choosing (species lineage/legacy by character level, SRD subclass spells by class level,
// Circle of the Land by land type) and Magic Initiate (two cantrips + a level 1 spell from the
// Cleric, Druid or Wizard list; from the Acolyte/Sage background, the human's origin feat or an
// Ability Score Improvement feat). Choosing spells never blocks creating a character; too many
// or invalid spells do.
//
// The builder (builder-rules.js) passes a context so this module needs no builder imports:
// ctx = { cls, level, species, speciesOption, backgroundFeat, originFeat, asiFeats: [{ level, feat }],
//         abilities: { str, … } (final scores), spells: { cantrips, prepared, spellbook },
//         magicInitiate: { [source]: { list, ability, cantrips: [2 keys], spell: key } },
//         speciesSpellAbility, landType, divineOrder, primalOrder }
// Data: src/data/srd52-spells.js (SRD 5.2.1, CC-BY-4.0): per spell level, school, classes, casting
// time, range, components, duration, text, higher/upgrade, and best-effort attack, save, damage
// (+ damageType) and heal ('2d8+mod' = plus the spellcasting ability modifier).
// =============================================================================
import { SPELLS, SPELL_GRANTS } from '../data/srd52-spells.js';
import { SRD } from '../data/srd52.js';

export { SPELLS };
export const MENTAL = ['int', 'wis', 'cha'];
export const MAGIC_INITIATE_LISTS = ['cleric', 'druid', 'wizard'];
export const LAND_TYPES = ['arid', 'polar', 'temperate', 'tropical'];
const asArray = (v) => (Array.isArray(v) ? v : []);
const mod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

export function spellKey(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function spell(key) { return SPELLS[key] || null; }
export function spellName(key) { return (SPELLS[key] && SPELLS[key].name) || key; }
// "Level 1 Evocation" / "Evocation cantrip"
export function levelSchool(s) { return s.level ? `Level ${s.level} ${s.school}` : `${s.school} cantrip`; }
// One line for lists: "Action · 120 feet · V, S, M · Concentration, up to 1 minute"
export function spellLine(s) { return [s.castingTime, s.range, s.components.join(', '), s.duration].filter(Boolean).join(' · '); }

// Spells of a class list, sorted by level then name. opts: { minLevel, maxLevel }
export function classSpells(cls, opts = {}) {
    const lo = opts.minLevel != null ? opts.minLevel : 0, hi = opts.maxLevel != null ? opts.maxLevel : 9;
    return Object.entries(SPELLS).filter(([, s]) => s.classes.includes(cls) && s.level >= lo && s.level <= hi)
        .map(([key, s]) => ({ key, ...s })).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

// Highest spell level the class can cast at this class level (0 = cantrips only / none).
export function maxSpellLevel(cls, level) {
    const sc = SRD.classes[cls] && SRD.classes[cls].spellcasting; if (!sc) return 0;
    const row = sc.levels[Math.min(20, Math.max(1, Number(level) || 1))]; if (!row) return 0;
    if (sc.pact) return row.slotLevel || 0;
    let hi = 0; asArray(row.slots).forEach((n, i) => { if (n > 0) hi = i + 1; });
    return hi;
}
// How many spells the class lets you choose at this level.
export function spellLimits(ctx) {
    const sc = SRD.classes[ctx.cls] && SRD.classes[ctx.cls].spellcasting;
    if (!sc) return { caster: false, cantrips: 0, prepared: 0, maxLevel: 0, spellbook: 0 };
    const row = sc.levels[Math.min(20, Math.max(1, Number(ctx.level) || 1))] || {};
    const extra = (ctx.cls === 'cleric' && ctx.divineOrder === 'thaumaturge') || (ctx.cls === 'druid' && ctx.primalOrder === 'magician') ? 1 : 0;   // one extra cantrip
    return { caster: true, ability: sc.ability, cantrips: (row.cantrips || 0) + extra, prepared: row.prepared || 0, maxLevel: maxSpellLevel(ctx.cls, ctx.level),
        spellbook: ctx.cls === 'wizard' ? 6 + 2 * (Math.max(1, Number(ctx.level) || 1) - 1) : 0 };   // Wizard: 6 level 1 spells, +2 per level
}

// ---- spells that come without choosing ------------------------------------------------------
// The ability for species/feat spells: chosen, else the class's spellcasting ability when it is
// Intelligence, Wisdom or Charisma, else the best of those three.
export function defaultMentalAbility(ctx) {
    const sc = SRD.classes[ctx.cls] && SRD.classes[ctx.cls].spellcasting;
    if (sc && MENTAL.includes(sc.ability)) return sc.ability;
    const ab = ctx.abilities || {};
    return MENTAL.slice().sort((a, b) => (Number(ab[b]) || 10) - (Number(ab[a]) || 10))[0];
}
function upTo(table, level) {
    const out = [];
    for (const [lvl, keys] of Object.entries(table || {})) if (Number(lvl) <= level) out.push(...keys);
    return out;
}
// → [{ key, source, ability?, free?: 'long'|'pb' }] (always prepared; don't count against the limits)
export function grantedSpells(ctx) {
    const out = [], seen = new Set();
    const add = (key, source, extra) => { if (seen.has(key) || !SPELLS[key]) return; seen.add(key); out.push(Object.assign({ key, source }, extra || {})); };
    const level = Math.max(1, Number(ctx.level) || 1);
    // species (character level)
    const sp = SPELL_GRANTS.species[ctx.species];
    if (sp) {
        const ability = MENTAL.includes(ctx.speciesSpellAbility) ? ctx.speciesSpellAbility : defaultMentalAbility(ctx);
        const label = ctx.speciesOption || (SRD.species[ctx.species] || {}).name || ctx.species;
        for (const k of upTo(sp['*'], level)) add(k, (SRD.species[ctx.species] || {}).name || ctx.species, { ability });
        const opt = Object.keys(sp).find(o => o !== '*' && ctx.speciesOption && ctx.speciesOption.startsWith(o));
        if (opt) for (const k of upTo(sp[opt], level)) add(k, label, { ability, free: SPELLS[k].level ? (ctx.species === 'gnome' ? 'pb' : 'long') : undefined });
    }
    // SRD subclass (class level 3+)
    const sub = SPELL_GRANTS.subclass[ctx.cls];
    if (sub && level >= 3) {
        const subName = (SRD.classes[ctx.cls] || {}).subclass || 'Subclass';
        if (ctx.cls === 'druid') { if (LAND_TYPES.includes(ctx.landType)) for (const k of upTo(sub[ctx.landType], level)) add(k, `${subName} (${ctx.landType})`); }
        else for (const k of upTo(sub, level)) add(k, subName);
    }
    // Magic Initiate
    for (const src of magicInitiateSources(ctx)) {
        const mi = (ctx.magicInitiate || {})[src.id] || {};
        const list = src.list || mi.list; if (!MAGIC_INITIATE_LISTS.includes(list)) continue;
        const ability = MENTAL.includes(mi.ability) ? mi.ability : defaultMentalAbility(ctx);
        const label = `Magic Initiate (${list.charAt(0).toUpperCase() + list.slice(1)})`;
        for (const k of asArray(mi.cantrips).slice(0, 2)) add(k, label, { ability });
        if (mi.spell) add(mi.spell, label, { ability, free: 'long' });
    }
    return out;
}
// Where Magic Initiate comes from: the background (fixed list), the human's origin feat, and
// Ability Score Improvement levels where it was taken (list chosen; a different one each time).
export function magicInitiateSources(ctx) {
    const out = [];
    const m = /^Magic Initiate \((\w+)\)/.exec(ctx.backgroundFeat || '');
    if (m) out.push({ id: 'background', list: m[1].toLowerCase(), label: 'Background' });
    if (ctx.species === 'human' && ctx.originFeat === 'Magic Initiate') out.push({ id: 'origin', list: null, label: 'Human (Versatile)' });
    for (const f of asArray(ctx.asiFeats)) if (f.feat === 'Magic Initiate' && f.level <= (Number(ctx.level) || 1)) out.push({ id: 'asi-' + f.level, list: null, label: `Level ${f.level} feat` });
    return out;
}

// ---- checks ---------------------------------------------------------------------------------
// Blocking problems: too many spells, spells not on the list or too high, Magic Initiate lists.
export function spellErrors(ctx) {
    const errs = [], lim = spellLimits(ctx), ch = ctx.spells || {};
    const granted = new Set(grantedSpells(ctx).map(g => g.key));
    const onList = (k, lo, hi) => SPELLS[k] && SPELLS[k].classes.includes(ctx.cls) && SPELLS[k].level >= lo && SPELLS[k].level <= hi;
    const cantrips = asArray(ch.cantrips), prepared = asArray(ch.prepared), book = asArray(ch.spellbook);
    if (cantrips.length > lim.cantrips) errs.push(`Too many cantrips: ${cantrips.length} of ${lim.cantrips}.`);
    if (prepared.length > lim.prepared) errs.push(`Too many prepared spells: ${prepared.length} of ${lim.prepared}.`);
    if (lim.spellbook && book.length > lim.spellbook) errs.push(`Too many spells in the spellbook: ${book.length} of ${lim.spellbook}.`);
    for (const k of cantrips) if (!onList(k, 0, 0)) errs.push(`${spellName(k)} is not a ${ctx.cls} cantrip.`);
    for (const k of [...prepared, ...book]) if (!onList(k, 1, lim.maxLevel)) errs.push(`${spellName(k)} is not a ${ctx.cls} spell of level 1–${lim.maxLevel}.`);
    if (lim.spellbook) for (const k of prepared) if (!book.includes(k)) errs.push(`${spellName(k)} must be in the spellbook to be prepared.`);
    for (const k of prepared) if (granted.has(k)) errs.push(`${spellName(k)} is always prepared already — choose another spell.`);
    if (new Set(cantrips).size !== cantrips.length || new Set(prepared).size !== prepared.length) errs.push('A spell is chosen twice.');
    const lists = [];
    for (const src of magicInitiateSources(ctx)) {
        const mi = (ctx.magicInitiate || {})[src.id] || {};
        const list = src.list || mi.list;
        if (!list) continue;
        if (lists.includes(list)) errs.push(`Magic Initiate: choose a different spell list each time (${list} twice).`);
        lists.push(list);
        for (const k of asArray(mi.cantrips)) if (!(SPELLS[k] && SPELLS[k].level === 0 && SPELLS[k].classes.includes(list))) errs.push(`Magic Initiate: ${spellName(k)} is not a ${list} cantrip.`);
        if (asArray(mi.cantrips).length > 2) errs.push('Magic Initiate: two cantrips.');
        if (mi.spell && !(SPELLS[mi.spell] && SPELLS[mi.spell].level === 1 && SPELLS[mi.spell].classes.includes(list))) errs.push(`Magic Initiate: ${spellName(mi.spell)} is not a level 1 ${list} spell.`);
    }
    return errs;
}
// Reminders that do not block ("2 more cantrips to choose").
export function spellTodo(ctx) {
    const out = [], lim = spellLimits(ctx), ch = ctx.spells || {};
    const n = (a) => asArray(a).length;
    if (lim.cantrips > n(ch.cantrips)) out.push(`${lim.cantrips - n(ch.cantrips)} cantrip${lim.cantrips - n(ch.cantrips) === 1 ? '' : 's'} to choose`);
    if (lim.spellbook > n(ch.spellbook)) out.push(`${lim.spellbook - n(ch.spellbook)} spellbook spell${lim.spellbook - n(ch.spellbook) === 1 ? '' : 's'} to choose`);
    if (lim.prepared > n(ch.prepared)) out.push(`${lim.prepared - n(ch.prepared)} spell${lim.prepared - n(ch.prepared) === 1 ? '' : 's'} to prepare`);
    if (ctx.cls === 'druid' && (Number(ctx.level) || 1) >= 3 && !LAND_TYPES.includes(ctx.landType)) out.push('Circle of the Land: choose a land type');
    for (const src of magicInitiateSources(ctx)) {
        const mi = (ctx.magicInitiate || {})[src.id] || {};
        if (!(src.list || mi.list) || n(mi.cantrips) < 2 || !mi.spell) out.push(`Magic Initiate (${src.label}): choose ${src.list ? '' : 'a spell list, '}2 cantrips and a level 1 spell`);
    }
    return out;
}

// ---- in play ----------------------------------------------------------------------------------
// A cantrip's damage at a character level (Cantrip Upgrade: "increases by 1d10 when you reach
// levels 5 (2d10), 11 (3d10), and 17 (4d10)").
export function cantripDamage(s, charLevel) {
    if (!s || !s.damage) return '';
    if (s.level !== 0 || !s.upgrade) return s.damage;
    const tier = charLevel >= 17 ? 3 : charLevel >= 11 ? 2 : charLevel >= 5 ? 1 : 0;
    const inc = /increases by (\d+)d(\d+)/.exec(s.upgrade); const base = /^(\d+)d(\d+)(.*)$/.exec(s.damage);
    if (!inc || !base || inc[2] !== base[2]) return s.damage;
    return `${Number(base[1]) + tier * Number(inc[1])}d${base[2]}${base[3] || ''}`;
}
// The spell slot to use for a spell: the lowest level ≥ the spell's level with a free slot.
// slots/used: arrays per spell level (index 0 = level 1). → slot level or 0.
export function slotFor(spellLevel, slots, used) {
    for (let l = Math.max(1, spellLevel); l <= asArray(slots).length; l++) if ((Number(slots[l - 1]) || 0) > (Number(asArray(used)[l - 1]) || 0)) return l;
    return 0;
}
// Save DC and spell attack for an ability (8 + mod + PB / mod + PB).
export function castingNumbers(abilities, ability, pb) { const m = mod(abilities && abilities[ability]); return { dc: 8 + m + pb, attack: m + pb }; }
