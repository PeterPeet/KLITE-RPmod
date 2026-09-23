// =============================================================================
// KLITE RPmod — Combat rules (SRD 5.2.1): pure functions, no DOM, no state
// -----------------------------------------------------------------------------
// Monster stat blocks → combat stats, encounter XP budget and difficulty, advantage and
// disadvantage from conditions, death saving throws, how a monster picks its attack and
// target, XP → level. The Worlds engine (src/KLITE-RPmod_Worlds.js) keeps the encounter
// state and calls these. Data: src/data/srd52*.js (SRD 5.2.1, CC-BY-4.0).
// =============================================================================
import { SRD } from '../data/srd52.js';
import { MONSTERS } from '../data/srd52-monsters.js';

export { MONSTERS };
export const CONDITIONS = Object.keys(SRD.conditions || {});
export const DIFFICULTIES = ['low', 'moderate', 'high'];
export function conditionText(name) { return (SRD.conditions && SRD.conditions[name]) || []; }

// ---- monsters -----------------------------------------------------------------------------
export function crValue(cr) { const s = String(cr); if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return a / b; } return Number(s) || 0; }
export function monsterList() {
    return Object.entries(MONSTERS).map(([key, m]) => ({ key, name: m.name, cr: m.cr, crValue: crValue(m.cr), xp: m.xp, type: m.type }))
        .sort((a, b) => a.crValue - b.crValue || a.name.localeCompare(b.name));
}
export function findMonster(nameOrKey) {
    const q = String(nameOrKey || '').trim().toLowerCase();
    if (!q) return null;
    if (MONSTERS[q]) return q;
    const key = q.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (MONSTERS[key]) return key;
    // exact name, then singular forms ("Wolves", "Goblin Warriors", "Giant Bats")
    for (const n of [q, q.replace(/ves$/, 'f'), q.replace(/es$/, ''), q.replace(/s$/, '')]) {
        const hit = Object.entries(MONSTERS).find(([, m]) => m.name.toLowerCase() === n);
        if (hit) return hit[0];
    }
    return null;
}
// Combat stats (the Worlds stat-block shape plus monster extras).
export function monsterStats(key) {
    const m = MONSTERS[key]; if (!m) return null;
    const attacks = (m.attacks || []).filter(a => a.kind !== 'save' && a.damage).map(a => ({ name: a.name, toHit: a.toHit, damage: a.damage, type: a.type, kind: a.kind, avg: a.avg || 0 }));
    const saveActions = (m.attacks || []).filter(a => a.kind === 'save').map(a => ({ name: a.name, save: a.save, dc: a.dc, damage: a.damage, type: a.type, half: !!a.half }));
    const saves = {};
    for (const [ab, score] of Object.entries(m.abilities)) saves[ab] = m.saves && m.saves[ab] != null ? m.saves[ab] : Math.floor((score - 10) / 2);
    return {
        key, name: m.name, isMonster: true, abilities: { ...m.abilities }, ac: m.ac, hpMax: m.hp, speed: parseInt(m.speed, 10) || 30,
        proficiency: m.pb, initiativeMod: m.initiative, saves, skills: {}, attacks, saveActions, multiattack: m.multiattack || 1,
        xp: m.xp, cr: m.cr,
    };
}

// ---- encounter budget (SRD 5.2.1 "Combat Encounter Difficulty") ----------------------------
export function budget(level, size) {
    const row = SRD.xpBudget[Math.min(20, Math.max(1, Number(level) || 1))];
    const n = Math.max(1, Number(size) || 1);
    return { low: row.low * n, moderate: row.moderate * n, high: row.high * n };
}
// 'none' | 'trivial' (under half the low budget) | 'low' | 'moderate' | 'high' | 'beyond' (over high)
export function difficulty(xp, level, size) {
    const b = budget(level, size); xp = Number(xp) || 0;
    if (xp <= 0) return 'none';
    if (xp < b.low / 2) return 'trivial';
    if (xp <= b.low) return 'low';
    if (xp <= b.moderate) return 'moderate';
    if (xp <= b.high) return 'high';
    return 'beyond';
}
export function encounterXp(monsters) { return (monsters || []).reduce((n, m) => n + ((MONSTERS[m.key] || {}).xp || 0) * (Number(m.count) || 1), 0); }

// ---- conditions → advantage / disadvantage -------------------------------------------------
const has = (conds, n) => (conds || []).some(c => (c && c.name || c) === n);
export const CANNOT_ACT = ['Incapacitated', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
export function cannotAct(conds) { return CANNOT_ACT.some(n => has(conds, n)); }
// { mode: 'adv' | 'dis' | null, autoCrit, why[] } for an attack roll.
export function attackMode(attackerConds, targetConds, ranged, extra) {
    let adv = extra === 'adv', dis = extra === 'dis'; const why = [];
    for (const n of ['Blinded', 'Frightened', 'Poisoned', 'Prone', 'Restrained']) if (has(attackerConds, n)) { dis = true; why.push(`attacker ${n}`); }
    if (has(attackerConds, 'Invisible')) { adv = true; why.push('attacker Invisible'); }
    for (const n of ['Blinded', 'Paralyzed', 'Petrified', 'Restrained', 'Stunned', 'Unconscious']) if (has(targetConds, n)) { adv = true; why.push(`target ${n}`); }
    if (has(targetConds, 'Prone')) { if (ranged) dis = true; else adv = true; why.push('target Prone'); }
    if (has(targetConds, 'Invisible')) { dis = true; why.push('target Invisible'); }
    const autoCrit = !ranged && (has(targetConds, 'Paralyzed') || has(targetConds, 'Unconscious'));
    return { mode: adv && dis ? null : adv ? 'adv' : dis ? 'dis' : null, autoCrit, why };
}
export function isRanged(attack) {
    if (!attack) return false;
    if (attack.kind) return attack.kind === 'ranged';
    const w = SRD.weapons[attack.name];
    return !!(w && /ranged/.test(w.category));
}

// ---- death saving throws -------------------------------------------------------------------
// state { s, f, stable, dead }; die = the d20 result.
export function deathSave(state, die) {
    const st = Object.assign({ s: 0, f: 0, stable: false, dead: false }, state || {});
    if (st.dead || st.stable) return { state: st, result: st.dead ? 'dead' : 'stable' };
    if (die === 20) return { state: { s: 0, f: 0, stable: false, dead: false }, result: 'revived' };
    if (die === 1) st.f += 2; else if (die >= 10) st.s += 1; else st.f += 1;
    if (st.f >= 3) { st.f = 3; st.dead = true; return { state: st, result: 'dead' }; }
    if (st.s >= 3) { st.s = 3; st.stable = true; return { state: st, result: 'stable' }; }
    return { state: st, result: die >= 10 ? 'success' : 'failure' };
}
// Damage to a creature at 0 HP: one failure, two on a critical hit.
export function damageAtZero(state, crit) {
    const st = Object.assign({ s: 0, f: 0, stable: false, dead: false }, state || {});
    if (st.dead) return st;
    st.stable = false; st.f += crit ? 2 : 1;
    if (st.f >= 3) { st.f = 3; st.dead = true; }
    return st;
}

// ---- monster tactics -----------------------------------------------------------------------
// The weapon attack with the best average damage; ranged attacks count for 3/4, so a
// monster that can fight in melee closes in (the fight has no map yet).
export function pickAttack(stats) {
    const list = (stats && stats.attacks) || [];
    if (!list.length) return -1;
    let best = -1, bestScore = -Infinity;
    list.forEach((a, i) => { const score = (a.avg || avgDamage(a.damage)) * (isRanged(a) ? 0.75 : 1); if (score > bestScore) { best = i; bestScore = score; } });
    return best;
}
export function avgDamage(expr) {
    let total = 0; const s = String(expr || '').replace(/\s+/g, '');
    for (const m of s.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
        if (m[3]) total += (m[1] === '-' ? -1 : 1) * (Number(m[2]) || 1) * (Number(m[3]) + 1) / 2;
        else if (m[4]) total += Number(m[4]);
    }
    return total;
}
// Keep hitting the last target while it stands; otherwise a random conscious opponent.
export function pickTarget(candidates, lastTarget, rnd) {
    if (!candidates.length) return null;
    if (lastTarget && candidates.includes(lastTarget)) return lastTarget;
    const r = typeof rnd === 'function' ? rnd() : Math.random();
    return candidates[Math.min(candidates.length - 1, Math.floor(r * candidates.length))];
}

// ---- XP and levels -------------------------------------------------------------------------
export function levelForXp(xp) { let lvl = 1; for (let i = 0; i < SRD.xp.length; i++) if ((Number(xp) || 0) >= SRD.xp[i]) lvl = i + 1; return lvl; }
export function xpForLevel(level) { return SRD.xp[Math.min(20, Math.max(1, Number(level) || 1)) - 1]; }
