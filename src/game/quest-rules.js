// =============================================================================
// KLITE RPmod — Quest & world rules (R4): pure functions, no DOM, no state
// -----------------------------------------------------------------------------
// Rewards (parse/format), objectives with counters, prerequisites, reputation tiers,
// phases (variants of a location/person chosen by world state). The Worlds engine
// (src/KLITE-RPmod_Worlds.js) keeps the state and calls these.
// Quest-log conventions (markers, objectives, rewards) are generic genre ideas; names
// and numbers here are our own.
// =============================================================================

// ---- names ------------------------------------------------------------------------------
export const norm = (v) => String(v == null ? '' : v).trim();
const low = (v) => norm(v).toLowerCase();
// "Wolves" ~ "Wolf", "Goblin Warriors" ~ "Goblin Warrior", "Wolf 2" ~ "Wolf"
export function sameName(a, b) {
    const x = low(a).replace(/\s+\d+$/, ''), y = low(b).replace(/\s+\d+$/, '');
    if (!x || !y) return false;
    if (x === y) return true;
    const forms = (s) => [s, s.replace(/ves$/, 'f'), s.replace(/es$/, ''), s.replace(/s$/, '')];
    return forms(x).some(f => forms(y).includes(f));
}

// ---- rewards ------------------------------------------------------------------------------
// { type: 'xp', xp } | { type: 'gold', gold } | { type: 'item', item, qty } |
// { type: 'reputation', factionId, amount } | { type: 'choice', options: [{ item, qty }] }
export function rewardType(r) {
    if (!r || typeof r !== 'object') return '';
    if (r.type) return r.type;
    if (r.xp != null) return 'xp';
    if (r.gold != null) return 'gold';
    if (r.options) return 'choice';
    if (r.factionId) return 'reputation';
    if (r.item) return 'item';
    return '';
}
function parseItem(s) { const m = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(s)); return { item: norm(m && m[1] || s), qty: Number(m && m[2]) || 1 }; }
// Text → reward. "100 xp", "25 gold" / "25 gp", "Silver Ring x2",
// "choose: Sword | Shield | Longbow", "rep Royal Guard +100" (faction by name → id via lookup).
export function parseReward(text, findFaction) {
    const s = norm(text); if (!s) return null;
    let m = /^(\d+)\s*xp$/i.exec(s); if (m) return { type: 'xp', xp: Number(m[1]) };
    m = /^(\d+)\s*(?:gold|gp)$/i.exec(s); if (m) return { type: 'gold', gold: Number(m[1]) };
    m = /^(?:choose|choice|one of)\s*:?\s*(.+)$/i.exec(s);
    if (m) { const options = m[1].split(/\s*[|/]\s*|\s+or\s+/i).map(parseItem).filter(o => o.item); return options.length > 1 ? { type: 'choice', options } : null; }
    m = /^(?:rep(?:utation)?)\s+(.+?)\s*([+-]\d+)$/i.exec(s);
    if (m) { const f = typeof findFaction === 'function' ? findFaction(m[1]) : null; return f ? { type: 'reputation', factionId: f, amount: Number(m[2]) } : null; }
    return Object.assign({ type: 'item' }, parseItem(s));
}
export function formatReward(r, factionName) {
    switch (rewardType(r)) {
        case 'xp': return `${r.xp} XP`;
        case 'gold': return `${r.gold} gold`;
        case 'item': return `${r.item}${(Number(r.qty) || 1) > 1 ? ' ×' + r.qty : ''}`;
        case 'reputation': return `${Number(r.amount) >= 0 ? '+' : ''}${r.amount} reputation with ${(factionName && factionName(r.factionId)) || r.factionId}`;
        case 'choice': return 'Choose one: ' + (r.options || []).map(o => `${o.item}${(Number(o.qty) || 1) > 1 ? ' ×' + o.qty : ''}`).join(' / ');
        default: return '';
    }
}

// ---- objectives ---------------------------------------------------------------------------
// { id, text, hidden, kind: 'manual' | 'kill' | 'collect' | 'talk' | 'visit' | 'check', target, count }
//   kill: target = monster name or person id; collect: item name; talk: person id;
//   visit: location id (a zone counts all its places);
//   check (R8, a contest): { skill: 'athletics' | ability: 'dex', dc, at?: location id } — RPmod rolls
//   the persona's bonus against the DC (the Here row's "Try", /try), once per in-game day.
export const OBJECTIVE_KINDS = ['manual', 'kill', 'collect', 'talk', 'visit', 'check'];
const ABILITY_WORDS = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
// "Dexterity" / "Athletics" for a check objective.
export function checkWhat(o) {
    if (o && o.skill) return String(o.skill).split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return ABILITY_WORDS[o && o.ability] || 'Ability';
}
export const checkDC = (o) => Math.max(1, Number(o && o.dc) || 10);
export const objectiveKind = (o) => (o && OBJECTIVE_KINDS.includes(o.kind) ? o.kind : 'manual');
export const objectiveCount = (o) => Math.max(1, Number(o && o.count) || 1);
// progress: stored value (true/false for manual/talk/visit, a number for kill);
// have: items held (collect). Returns { current, needed, done }.
export function objectiveStatus(o, progress, have) {
    const kind = objectiveKind(o), needed = objectiveCount(o);
    if (kind === 'collect') { const current = Math.max(0, Number(have) || 0); return { current: Math.min(current, needed), needed, done: current >= needed }; }
    if (kind === 'kill') { const current = Math.max(0, Number(progress) || 0); return { current: Math.min(current, needed), needed, done: current >= needed }; }
    const done = progress === true || Number(progress) >= 1;
    return { current: done ? 1 : 0, needed: 1, done };
}
export function objectiveLabel(o, st) {
    const t = norm(o && o.text);
    if (objectiveKind(o) === 'check') return `${t} (${checkWhat(o)} check, DC ${checkDC(o)})`;
    return objectiveKind(o) === 'kill' || objectiveKind(o) === 'collect' ? `${t} (${st.current}/${st.needed})` : t;
}

// ---- repeatable / daily quests (R4 extra) ------------------------------------------------------
// q.repeat: '' (once) | 'repeatable' (available again right after turn-in) | 'daily' (again when
// a new in-game day begins). Each turn-in pays the rewards again.
export const REPEAT_KINDS = ['', 'repeatable', 'daily'];
export const repeatKind = (q) => (q && REPEAT_KINDS.includes(q.repeat) ? q.repeat : '');
// The in-game date as one day number (30-day months, 12 months — the Worlds clock).
export function absoluteDay(clock) {
    const c = clock || {};
    return ((Number(c.year) || 1) - 1) * 360 + ((Number(c.month) || 1) - 1) * 30 + (Number(c.day) || 1);
}
// Available again? rec = { count, day } of the last turn-in.
export function repeatReady(q, rec, today) {
    const k = repeatKind(q); if (!k || !rec) return false;
    return k === 'repeatable' || Number(today) > Number(rec.day);
}

// ---- prerequisites ------------------------------------------------------------------------
// q.prerequisites = { level, quests: [ids turned in], flags: [keys set], notFlags: [keys not set] (R8),
//   reputation: { factionId, tier } }
// facts: { level, questState(id), flag(key), tierOf(factionId), questTitle(id), factionName(id) }
export function unmetPrerequisites(q, facts) {
    const p = (q && q.prerequisites) || {}; const out = [];
    if (Number(p.level) > 1 && (Number(facts.level) || 1) < Number(p.level)) out.push(`Requires level ${p.level}`);
    for (const id of p.quests || []) if (facts.questState(id) !== 'turnedin') out.push(`Requires the quest "${(facts.questTitle && facts.questTitle(id)) || id}"`);
    for (const k of p.flags || []) if (!facts.flag(k)) out.push(`Requires: ${k}`);
    for (const k of p.notFlags || []) if (facts.flag(k)) out.push(`No longer: ${k}`);
    if (p.reputation && p.reputation.factionId && p.reputation.tier) {
        if (!tierAtLeastOrWorse(facts.tierOf(p.reputation.factionId), p.reputation.tier)) out.push(`Requires ${p.reputation.tier}${tierIndex(p.reputation.tier) < tierIndex('Neutral') ? ' (or worse)' : ''} with ${(facts.factionName && facts.factionName(p.reputation.factionId)) || p.reputation.factionId}`);
    }
    return out;
}

// ---- reputation ---------------------------------------------------------------------------
// Standing is a number; tiers are our own scale (a quest usually gives +50 … +250).
export const TIERS = [
    { name: 'Hated', min: -Infinity }, { name: 'Hostile', min: -1000 }, { name: 'Unfriendly', min: -300 },
    { name: 'Neutral', min: -50 }, { name: 'Friendly', min: 100 }, { name: 'Honored', min: 500 },
    { name: 'Revered', min: 1200 }, { name: 'Exalted', min: 2500 },
];
export function tierOf(value) { const v = Number(value) || 0; let t = TIERS[0]; for (const x of TIERS) if (v >= x.min) t = x; return t.name; }
export function tierIndex(name) { const i = TIERS.findIndex(t => t.name.toLowerCase() === low(name)); return i < 0 ? 3 : i; }
// Progress within the tier: { tier, next, into, span } (next = null at the top).
export function tierProgress(value) {
    const v = Number(value) || 0; const i = tierIndex(tierOf(v)); const cur = TIERS[i], next = TIERS[i + 1] || null;
    const base = cur.min === -Infinity ? TIERS[1].min - 1000 : cur.min;
    return { tier: cur.name, next: next ? next.name : null, into: v - base, span: next ? next.min - base : 0 };
}
// What a tier means for the story (the AI narrates it; vendors come with later phases).
export function tierEffect(name) {
    switch (name) {
        case 'Hated': return 'attacks on sight';
        case 'Hostile': return 'hostile: refuses to deal with you and may attack';
        case 'Unfriendly': return 'cold and distrustful; prices higher';
        case 'Neutral': return '';
        case 'Friendly': return 'welcoming; small favours';
        case 'Honored': return 'trusted; better prices and access to members-only places';
        case 'Revered': return 'deeply trusted; shares secrets';
        case 'Exalted': return 'treats you as a hero of the faction';
        default: return '';
    }
}
export const isHostileTier = (name) => tierIndex(name) <= tierIndex('Hostile');
// A tier requirement: above Neutral means "this or better", below Neutral "this or worse"
// (Neutral itself: exactly Neutral).
export function tierAtLeastOrWorse(have, want) {
    const h = tierIndex(have), w = tierIndex(want), n = tierIndex('Neutral');
    return w > n ? h >= w : w < n ? h <= w : h === n;
}

// ---- phases ---------------------------------------------------------------------------------
// entity.phases = [{ id, label, conditions: [{ field, op, value }], ...overrides }]; the LAST
// phase whose conditions all hold wins (so later phases can refine earlier ones).
export function activePhase(entity, evalCondition) {
    let hit = null;
    for (const ph of (entity && Array.isArray(entity.phases) ? entity.phases : [])) {
        const conds = Array.isArray(ph.conditions) ? ph.conditions : [];
        if (conds.length && conds.every(c => { try { return !!evalCondition(c); } catch (_) { return false; } })) hit = ph;
    }
    return hit;
}
// The entity as the player sees it now (phase fields override; `gone` hides a person or
// disbands a faction; a faction phase's hqLocationId 'none' = no headquarters).
export function phased(entity, evalCondition) {
    const ph = activePhase(entity, evalCondition);
    if (!ph) return entity;
    const out = Object.assign({}, entity);
    for (const k of ['name', 'description', 'atmosphere', 'mood', 'personality', 'homeLocationId', 'hqLocationId', 'gone']) if (ph[k] != null && ph[k] !== '') out[k] = ph[k];
    if (out.hqLocationId === 'none') out.hqLocationId = null;   // a faction phase: "no headquarters any more"
    out.phase = ph.label || ph.id || 'phase';
    return out;
}
