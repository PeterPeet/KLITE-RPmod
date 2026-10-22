// =============================================================================
// KLITE RPmod — Compendium (R3): search index over the bundled SRD 5.2.1 data. Pure, no DOM.
// -----------------------------------------------------------------------------
// Kinds: monster (srd52-monsters.js), spell (srd52-spells.js), item (magic items), equipment
// (weapons and armor from srd52.js, tools and adventuring gear), rule (the Rules Glossary,
// conditions included). Keys are the data keys; equipment keys carry a prefix ("weapon:",
// "armor:", "gear:") because the three tables share names.
// search(q, kind): name matches first (exact, prefix, all words), then the entry's summary
// line, then — for queries of 4+ letters — its full text. SRD 5.2.1, CC-BY-4.0 (SRD.attribution).
// =============================================================================
import { MONSTERS } from '../data/srd52-monsters.js';
import { SPELLS } from '../data/srd52-spells.js';
import { SRD } from '../data/srd52.js';
import { COMPENDIUM } from '../data/srd52-compendium.js';

export const KINDS = { monster: 'Monsters', spell: 'Spells', item: 'Magic items', equipment: 'Equipment', rule: 'Rules' };
export const ATTRIBUTION = SRD.attribution;

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const cap = (s) => String(s || '').replace(/\b[a-z]/g, c => c.toUpperCase());
const levelSchool = (s) => (s.level ? `Level ${s.level} ${s.school}` : `${s.school} cantrip`);

let INDEX = null;
// → [{ kind, key, name, sub }] (built once)
export function index() {
    if (INDEX) return INDEX;
    const out = [];
    for (const [key, m] of Object.entries(MONSTERS)) out.push({ kind: 'monster', key, name: m.name, sub: `CR ${m.cr} · ${m.type}` });
    for (const [key, s] of Object.entries(SPELLS)) out.push({ kind: 'spell', key, name: s.name, sub: `${levelSchool(s)} · ${s.classes.map(cap).join(', ')}` });
    for (const [key, it] of Object.entries(COMPENDIUM.magicItems)) out.push({ kind: 'item', key, name: it.name, sub: it.type });
    for (const [name, w] of Object.entries(SRD.weapons)) out.push({ kind: 'equipment', key: 'weapon:' + name, name, sub: `Weapon · ${cap(w.category)} · ${w.damage} ${w.type}` });
    for (const [name, a] of Object.entries(SRD.armor)) out.push({ kind: 'equipment', key: 'armor:' + name, name, sub: `Armor · ${cap(a.category)}` });
    for (const [key, g] of Object.entries(COMPENDIUM.gear)) out.push({ kind: 'equipment', key: 'gear:' + key, name: g.name, sub: `${g.kind === 'tool' ? 'Tool' : 'Adventuring gear'} · ${g.cost}` });
    for (const [key, r] of Object.entries(COMPENDIUM.glossary)) out.push({ kind: 'rule', key, name: r.name, sub: r.tag || 'Rule' });
    INDEX = out;
    return out;
}

// The full record of an entry (null when unknown).
export function entry(kind, key) {
    if (kind === 'monster') return MONSTERS[key] ? { kind, key, name: MONSTERS[key].name, data: MONSTERS[key] } : null;
    if (kind === 'spell') return SPELLS[key] ? { kind, key, name: SPELLS[key].name, data: SPELLS[key] } : null;
    if (kind === 'item') { const d = COMPENDIUM.magicItems[key]; return d ? { kind, key, name: d.name, data: d } : null; }
    if (kind === 'rule') { const d = COMPENDIUM.glossary[key]; return d ? { kind, key, name: d.name, data: d } : null; }
    if (kind === 'equipment') {
        const [t, k] = String(key).split(/:(.*)/s);
        if (t === 'weapon' && SRD.weapons[k]) return { kind, key, name: k, data: Object.assign({ equipment: 'weapon' }, SRD.weapons[k]) };
        if (t === 'armor' && SRD.armor[k]) return { kind, key, name: k, data: Object.assign({ equipment: 'armor' }, SRD.armor[k]) };
        if (t === 'gear' && COMPENDIUM.gear[k]) return { kind, key, name: COMPENDIUM.gear[k].name, data: Object.assign({ equipment: COMPENDIUM.gear[k].kind }, COMPENDIUM.gear[k]) };
    }
    return null;
}

// Plain text of an entry for full-text search (cached).
const TEXT = new Map();
function textOf(e) {
    const id = e.kind + '|' + e.key;
    if (!TEXT.has(id)) {
        const r = entry(e.kind, e.key); const d = (r && r.data) || {};
        const parts = [];
        const walk = (v) => { if (typeof v === 'string') parts.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
        walk([d.text, d.higher, d.upgrade, d.traits, d.actions, d.bonusActions, d.reactions, d.legendary]);
        TEXT.set(id, norm(parts.join(' ')));
    }
    return TEXT.get(id);
}

// → [{ kind, key, name, sub, score }] best first (score 0 = exact name … 4 = found in the text)
export function search(q, kind, limit = 150) {
    const list = index().filter(e => !kind || e.kind === kind);
    const t = norm(q);
    if (!t) return list.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit).map(e => Object.assign({ score: 5 }, e));
    const words = t.split(' ');
    const hits = [];
    for (const e of list) {
        const n = norm(e.name), s = norm(e.sub);
        let score = -1;
        if (n === t) score = 0;
        else if (n.startsWith(t)) score = 1;
        else if (words.every(w => n.includes(w))) score = 2;
        else if (words.every(w => (n + ' ' + s).includes(w))) score = 3;
        else if (t.length >= 4 && textOf(e).includes(t)) score = 4;
        if (score >= 0) hits.push(Object.assign({ score }, e));
    }
    return hits.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, limit);
}

// The best single entry for a name ("Fireball", "goblin warrior", "Prone"), optionally of a kind.
export function find(q, kind) { const r = search(q, kind, 1)[0]; return r && r.score <= 2 ? r : null; }

export const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
export const signed = (n) => (n >= 0 ? '+' : '') + n;
export { levelSchool };
