// =============================================================================
// KLITE RPmod — Adventure packages (R8): format, validator, copyright guard. Pure: no DOM,
// no window; the loader (adventures.js) and the tests use it.
// -----------------------------------------------------------------------------
// An adventure = a world + pregenerated characters + where and how a new game starts:
//   { format: 'rpmod-adventure', version: 1, id, title, summary, levels: [from, to], credits[],
//     world: <world object as exportWorld() writes it>,
//     characters: [ TavernCard V2 { spec: 'chara_card_v2', data: { name, …,
//                   extensions: { rpmod: { adventure: id, pregen: '<pregen id>', line, sheet? } } } } ],
//     start: { view: 'player'|'creator', pregens: [pregen ids offered], opening: '<first message>' } }
// The world's own `start` (place, clock, view) says where the game begins. World persons link a
// pregen with `characterRef: { pregen: '<pregen id>' }`; the loader turns that into a Library link.
// Design: docs/design/R8-starter-adventure.md.
// =============================================================================
import { findMonster, MONSTERS, xpForLevel } from '../game/combat-rules.js';

export const FORMAT = 'rpmod-adventure';
export const VERSION = 1;
// Fights are authored for a party of two (the owner's decision, 2026-09-25): the XP estimate
// divides combat XP by this.
export const AUTHORED_PARTY = 2;

// Names from published, non-SRD adventures and settings that must never appear in an RPmod
// adventure (copyright: docs/USERSTORY.md). Reference material in docs/reference/ is used for
// size and structure only. English and German forms. Whole words, case-sensitive (proper nouns:
// "the greenest meadow" is fine, "Greenest" the town is not).
export const FORBIDDEN_NAMES = [
    // the starter set used as a size reference (and its German edition)
    'Phandelver', 'Phandalin', 'Cragmaw', 'Redbrand', 'Redbrands', 'Rotbrenner', 'Glasstaff', 'Glasstab',
    'Gundren', 'Rockseeker', 'Felsensucher', 'Sildar', 'Hallwinter', 'Klarg', 'Yeemik', 'Nezznar',
    'Black Spider', 'Schwarze Spinne', 'Wave Echo', 'Wellenhall', 'Wellenhallhöhle', 'Thundertree', 'Donnerbaum',
    'Conyberry', 'Tresendar', 'Wyvern Tor', 'Wyvernkuppe', 'Old Owl Well', 'Eulenbrunnen', 'Triboar',
    'Venomfang', 'Iarno', 'Toblen', 'Halia Thornton', 'Linene', 'Graywind', 'Daran Edermath',
    'Qelline', 'Alderleaf', 'Harbin Wester', 'Garaele', 'Reidoth', 'Hamun Kost', 'Dreieber',
    // other reference adventures
    'Frozen Sick', 'Palebank', 'Icewind Dale', 'Ten-Towns', 'Ten Towns', 'Hoard of the Dragon Queen',
    'Greenest', 'Cult of the Dragon', 'Tiamat', 'Rezmir', 'Mondath', 'Cyanwrath',
    // the setting
    'Forgotten Realms', 'Vergessene Reiche', 'Vergessenen Reiche', 'Faerûn', 'Faerun', 'Sword Coast',
    'Schwertküste', 'Neverwinter', 'Niewinter', 'Waterdeep', 'Tiefwasser', 'Baldur\'s Gate',
    // product identity outside the SRD
    'Dungeons & Dragons', 'Dungeons and Dragons', 'Beholder', 'Mind Flayer', 'Illithid',
    'Displacer Beast', 'Githyanki', 'Githzerai', 'Yuan-ti', 'Carrion Crawler', 'Umber Hulk',
];

const asArray = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? '' : String(v));
const lc = (v) => str(v).trim().toLowerCase();

// Every string in a value (deep), for the forbidden-names scan.
function strings(v, out = []) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) for (const x of v) strings(x, out);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
    return out;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Forbidden names found in a value: [{ name, sample }] (sample = up to 60 characters around it).
export function forbiddenNamesIn(value, names = FORBIDDEN_NAMES) {
    const hits = [];
    const texts = strings(value);
    for (const name of names) {
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(name)}(?=$|[^\\p{L}\\p{N}])`, 'u');
        for (const t of texts) {
            const m = re.exec(t);
            if (m) { const at = m.index + m[1].length; hits.push({ name, sample: t.slice(Math.max(0, at - 20), at + name.length + 20) }); break; }
        }
    }
    return hits;
}

// The pregen id of a card (extensions.rpmod.pregen), '' when it is none.
export function pregenOf(card) { const r = card && card.data && card.data.extensions && card.data.extensions.rpmod; return r && r.pregen ? str(r.pregen) : ''; }
export function adventureOf(card) { const r = card && card.data && card.data.extensions && card.data.extensions.rpmod; return r && r.adventure ? str(r.adventure) : ''; }

// The offered pregens, in order: [{ id, name, line, card }].
export function pregens(pkg) {
    const cards = asArray(pkg && pkg.characters);
    const ids = asArray(pkg && pkg.start && pkg.start.pregens);
    const order = ids.length ? ids : cards.map(pregenOf).filter(Boolean);
    const out = [];
    for (const id of order) {
        const card = cards.find(c => pregenOf(c) === id); if (!card) continue;
        const r = card.data.extensions.rpmod;
        out.push({ id, name: str(card.data.name), line: str(r.line), pronouns: str(r.pronouns), card });
    }
    return out;
}

// Locations reachable from `fromId`: links (connectedLocationIds), exits (both ways, secret ones
// too — found in play), and places inside places (parentId, both ways).
export function reachableLocations(world, fromId) {
    const locs = asArray(world && world.locations);
    const byId = new Map(locs.map(l => [l.id, l]));
    const adj = new Map(locs.map(l => [l.id, new Set()]));
    const link = (a, b) => { if (adj.has(a) && adj.has(b)) { adj.get(a).add(b); adj.get(b).add(a); } };
    for (const l of locs) {
        for (const id of asArray(l.connectedLocationIds)) link(l.id, id);
        for (const ex of asArray(l.exits)) link(l.id, ex.to || ex.locationId);
        if (l.parentId) link(l.id, l.parentId);
    }
    const seen = new Set();
    if (!byId.has(fromId)) return seen;
    const todo = [fromId];
    while (todo.length) { const id = todo.pop(); if (seen.has(id)) continue; seen.add(id); for (const n of adj.get(id) || []) if (!seen.has(n)) todo.push(n); }
    return seen;
}

// XP a character can earn: quest XP (per character) + encounter XP divided among the authored party.
export function xpEstimate(world, partySize = AUTHORED_PARTY) {
    let quest = 0, combat = 0;
    // quest rewards { type: 'xp', xp } (quest-rules); a repeatable quest counts once
    for (const q of asArray(world && world.quests)) for (const r of asArray(q.rewards)) if ((r.type === 'xp' || !r.type) && Number(r.xp) > 0) quest += Number(r.xp);
    for (const e of asArray(world && world.encounters)) {
        for (const m of asArray(e.monsters)) { const key = findMonster(m.key || m.name); const mon = key && MONSTERS[key]; if (mon) combat += (Number(mon.xp) || 0) * Math.max(1, Number(m.count) || 1); }
    }
    return { quest, combat, perCharacter: quest + Math.floor(combat / Math.max(1, partySize)) };
}

// Check a package. { ok, errors[], warnings[], stats }. Errors block loading; warnings are for
// the author (and the content tests).
export function validateAdventure(pkg) {
    const errors = [], warnings = [];
    const E = (m) => errors.push(m), Wn = (m) => warnings.push(m);
    if (!pkg || typeof pkg !== 'object') return { ok: false, errors: ['not an adventure package'], warnings, stats: {} };
    if (pkg.format !== FORMAT) E(`format must be "${FORMAT}"`);
    if (!(Number(pkg.version) >= 1)) E('version missing');
    if (!str(pkg.id).trim()) E('id missing');
    if (!str(pkg.title).trim()) E('title missing');
    const w = pkg.world;
    if (!w || typeof w !== 'object' || !str(w.id) || !str(w.name)) { E('world missing (needs id and name)'); return { ok: false, errors, warnings, stats: {} }; }

    // ---- pregens ----
    const cards = asArray(pkg.characters);
    const seen = new Set();
    for (const c of cards) {
        const id = pregenOf(c);
        if (!c || !c.data || !str(c.data.name).trim()) { E('a character without a name'); continue; }
        if (!id) E(`character "${c.data.name}" has no extensions.rpmod.pregen`);
        else if (seen.has(id)) E(`pregen id "${id}" used twice`);
        else seen.add(id);
        if (id && adventureOf(c) !== str(pkg.id)) E(`character "${c.data.name}" belongs to adventure "${adventureOf(c)}", not "${pkg.id}"`);
    }
    const st = pkg.start || {};
    for (const id of asArray(st.pregens)) if (!seen.has(id)) E(`start.pregens names an unknown pregen "${id}"`);
    if (st.view && st.view !== 'player' && st.view !== 'creator') E('start.view must be "player" or "creator"');

    // ---- ids resolve ----
    const ids = {};
    const TYPES = { locations: 'location', npcs: 'person', factions: 'faction', objects: 'object', events: 'event', quests: 'quest', encounters: 'encounter', globalLore: 'lore' };
    for (const [key, type] of Object.entries(TYPES)) for (const e of asArray(w[key])) {
        if (!e || !e.id) { E(`a ${type} without an id`); continue; }
        if (ids[e.id]) E(`id "${e.id}" used twice`);
        ids[e.id] = type;
    }
    const need = (id, type, where) => { if (id && ids[id] !== type) E(`${where}: unknown ${type} "${id}"`); };
    for (const l of asArray(w.locations)) {
        for (const id of asArray(l.connectedLocationIds)) need(id, 'location', `location ${l.id} link`);
        for (const ex of asArray(l.exits)) need(ex.to || ex.locationId, 'location', `location ${l.id} exit`);
        need(l.parentId, 'location', `location ${l.id} parentId`);
        for (const id of asArray(l.npcIds)) need(id, 'person', `location ${l.id} npcIds`);
        for (const id of asArray(l.objectIds)) need(id, 'object', `location ${l.id} objectIds`);
    }
    for (const p of asArray(w.npcs)) {
        need(p.homeLocationId, 'location', `person ${p.id} home`);
        need(p.factionId, 'faction', `person ${p.id} faction`);
        for (const s of asArray(p.schedule)) need(s.locationId, 'location', `person ${p.id} schedule`);
        const ref = p.characterRef;
        if (ref && ref.pregen && !seen.has(ref.pregen)) E(`person ${p.id} links an unknown pregen "${ref.pregen}"`);
    }
    for (const f of asArray(w.factions)) if (f.hqLocationId && f.hqLocationId !== 'none') need(f.hqLocationId, 'location', `faction ${f.id} headquarters`);
    for (const q of asArray(w.quests)) {
        need(q.giverPersonId, 'person', `quest ${q.id} giver`);
        need(q.turninPersonId, 'person', `quest ${q.id} turn-in`);
        for (const id of asArray(q.prerequisites && q.prerequisites.quests)) need(id, 'quest', `quest ${q.id} prerequisite`);
    }
    for (const e of asArray(w.encounters)) {
        need(e.locationId, 'location', `encounter ${e.id} place`);
        for (const id of asArray(e.personIds)) need(id, 'person', `encounter ${e.id} person`);
        for (const m of asArray(e.monsters)) if (!findMonster(m.key || m.name)) E(`encounter ${e.id}: "${m.key || m.name}" is not an SRD 5.2.1 monster`);
    }
    for (const ev of asArray(w.events)) for (const id of asArray(ev.locationIds)) need(id, 'location', `event ${ev.id} place`);

    // ---- quest chains: no cycles; level locks within the adventure's range ----
    const qs = new Map(asArray(w.quests).map(q => [q.id, q]));
    const state = new Map();
    const visit = (id, path) => {
        if (state.get(id) === 2) return; if (state.get(id) === 1) { E(`quest prerequisites form a loop: ${[...path, id].join(' → ')}`); return; }
        state.set(id, 1);
        const q = qs.get(id); for (const p of asArray(q && q.prerequisites && q.prerequisites.quests)) if (qs.has(p)) visit(p, [...path, id]);
        state.set(id, 2);
    };
    for (const id of qs.keys()) visit(id, []);
    const levels = asArray(pkg.levels).map(Number);
    const maxLevel = levels[1] || levels[0] || 20;
    for (const q of qs.values()) { const lv = Number(q.prerequisites && q.prerequisites.level); if (lv > maxLevel) E(`quest ${q.id} needs level ${lv}, above the adventure's ${maxLevel}`); }

    // ---- the start and reachability ----
    const ws = w.start || {};
    if (!ws.locationId) E('world.start.locationId missing: where does the game begin?');
    else if (ids[ws.locationId] !== 'location') E(`world.start.locationId: unknown location "${ws.locationId}"`);
    else {
        const reach = reachableLocations(w, ws.locationId);
        const lost = asArray(w.locations).filter(l => !reach.has(l.id)).map(l => l.name || l.id);
        if (lost.length) Wn(`not reachable from the start: ${lost.join(', ')}`);
    }

    // ---- XP: enough to reach the last level ----
    const xp = xpEstimate(w);
    if (levels.length === 2 && levels[1] > levels[0]) {
        const needXp = xpForLevel(levels[1]) - xpForLevel(levels[0]);
        if (xp.perCharacter < needXp) Wn(`XP per character ${xp.perCharacter} < ${needXp} needed for level ${levels[1]} (quests ${xp.quest}, fights ${xp.combat} / ${AUTHORED_PARTY})`);
    }

    // ---- copyright guard ----
    for (const h of forbiddenNamesIn({ title: pkg.title, summary: pkg.summary, world: w, characters: cards, start: st })) E(`forbidden name "${h.name}" (…${h.sample}…)`);

    const stats = { locations: asArray(w.locations).length, persons: asArray(w.npcs).length, quests: qs.size, encounters: asArray(w.encounters).length, pregens: seen.size, xp };
    return { ok: errors.length === 0, errors, warnings, stats };
}

// For the content tests: every monster name the validator knows (SRD 5.2.1).
export const SRD_MONSTER_COUNT = Object.keys(MONSTERS || {}).length;
