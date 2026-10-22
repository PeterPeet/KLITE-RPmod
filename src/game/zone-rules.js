// =============================================================================
// KLITE RPmod — zone combat rules (R7 step 5): pure functions, no DOM, no state
// -----------------------------------------------------------------------------
// No grid, no measuring: a fight happens in the zones of the room it starts in (idea from
// "Ultimate Dungeon Terrain" zone combat by Dungeon Craft — rules reimplemented here, nothing
// copied; cover and hiding follow SRD 5.2.1).
//
// Layouts (a board cell is 10 ft):
//   small    — a room of at most 30×30 ft: one zone for the whole room ('inner').
//   large    — a bigger room, a cavern, anything outdoors: a centre ('c') and four zones around
//              it ('n','e','s','w'); each touches the centre and its two neighbours.
//   corridor — a passage one cell wide: the centre plus only the arms its passages lead to
//              (walls keep the arms apart).
// Every layout also has 'outer' (just outside the room: behind its doors) and 'out' (out of
// range). Moving: to an adjacent zone (a creature of 60 ft speed or more: two zones); fleeing
// doubles that but allows no attack and provokes opportunity attacks; a one-zone "fighting
// retreat" does not. Melee: same zone (reach over 30 ft: the next zone). Ranged: a weapon with
// a range of 30 ft or less reaches the same or the next zone, a longer one any zone in line
// of fire; −3 against someone who attacked you in melee within the last round; one ranged
// attack per round through a doorway. Cover from room features: half +2, three-quarters +5
// AC against attacks from another zone.
// The Worlds engine (src/KLITE-RPmod_Worlds.js) keeps the fight's state and calls these.
// =============================================================================

export const LAYOUTS = ['small', 'large', 'corridor'];
export const RING = ['n', 'e', 's', 'w'];
export const COVER = { half: 2, three: 5 };
export const COVER_NAMES = { half: 'half cover', three: 'three-quarters cover' };
export const CELL_FT = 10;
export const HIDE_DC = 15;
export const IN_MELEE_PENALTY = 3;
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const NEXT = { n: ['e', 'w'], e: ['n', 's'], s: ['e', 'w'], w: ['n', 's'] };
const asArray = v => (Array.isArray(v) ? v : []);

// ---- layout ---------------------------------------------------------------------------
// room: a location ({ map: { w, h }, combatSpace? }); exitDirs: n/e/s/w of its exits.
export function layoutFor(room, exitDirs) {
    const dirs = [...new Set(asArray(exitDirs).filter(d => RING.includes(d)))];
    let kind = room && LAYOUTS.includes(room.combatSpace) ? room.combatSpace : null;
    const m = room && room.map;
    if (!kind) {
        if (!m || !(Number(m.w) > 0) || !(Number(m.h) > 0)) kind = 'large';          // outdoors, a plain place
        else if (Math.min(m.w, m.h) <= 1) kind = 'corridor';
        else kind = (m.w * CELL_FT <= 30 && m.h * CELL_FT <= 30) ? 'small' : 'large';
    }
    let arms = [];
    if (kind === 'corridor') {
        arms = RING.filter(d => dirs.includes(d));
        if (arms.length < 2) {   // a dead end or no exits yet: the long axis
            const axis = m && Number(m.h) > Number(m.w) ? ['n', 's'] : ['e', 'w'];
            arms = RING.filter(d => arms.includes(d) || axis.includes(d));
        }
    }
    // openings to the outside: where the room has exits (outdoors, no walls: every side)
    const open = !m ? RING.slice() : RING.filter(d => dirs.includes(d));
    return { kind, arms, open };
}
export function zonesOf(L) {
    if (L.kind === 'small') return ['inner', 'outer', 'out'];
    if (L.kind === 'corridor') return ['c', ...L.arms, 'outer', 'out'];
    return ['c', ...RING, 'outer', 'out'];
}
export function isZone(L, z) { return zonesOf(L).includes(z); }
export function inside(L, z) { return z !== 'outer' && z !== 'out' && isZone(L, z); }
export function neighbours(L, z) {
    const zs = zonesOf(L); let out = [];
    if (L.kind === 'small') out = z === 'inner' ? ['outer'] : z === 'outer' ? ['inner', 'out'] : z === 'out' ? ['outer'] : [];
    else if (z === 'c') out = L.kind === 'corridor' ? L.arms.slice() : RING.slice();
    else if (RING.includes(z)) {
        out = ['c'];
        if (L.kind === 'large') out.push(...NEXT[z]);
        if (L.open.includes(z) || L.open.length === 0) out.push('outer');
    } else if (z === 'outer') {
        out = ['out'];
        const ins = L.kind === 'corridor' ? L.arms : RING;
        const doors = ins.filter(d => L.open.includes(d));
        out.push(...(doors.length ? doors : ins));
    } else if (z === 'out') out = ['outer'];
    return out.filter(x => zs.includes(x));
}
// Zones between a and b (0 = same zone); Infinity when there is no way.
export function distance(L, a, b) {
    if (a === b) return isZone(L, a) ? 0 : Infinity;
    const seen = new Set([a]); let frontier = [a], d = 0;
    while (frontier.length) {
        d++; const next = [];
        for (const z of frontier) for (const n of neighbours(L, z)) { if (n === b) return d; if (!seen.has(n)) { seen.add(n); next.push(n); } }
        frontier = next;
    }
    return Infinity;
}
// The next zone on a shortest way from a towards b (a itself when already there).
export function stepToward(L, a, b, steps = 1) {
    let cur = a;
    for (let i = 0; i < steps && cur !== b; i++) {
        const d = distance(L, cur, b);
        const n = neighbours(L, cur).find(x => distance(L, x, b) === d - 1);
        if (!n) break; cur = n;
    }
    return cur;
}
// Line of fire between two zones: inside a large room everything; in a corridor only along a
// straight line (the centre sees every arm, opposite arms see each other); from outside only
// through a doorway (see `throughDoorway`); nothing reaches 'out'.
export function lineOfFire(L, a, b) {
    if (a === 'out' || b === 'out' || !isZone(L, a) || !isZone(L, b)) return false;
    if (a === b) return true;
    if (a === 'outer' || b === 'outer') { const inz = a === 'outer' ? b : a; return L.kind === 'small' || inz === 'c' || neighbours(L, 'outer').includes(inz); }
    if (L.kind === 'corridor') return a === 'c' || b === 'c' || OPP[a] === b;
    return true;
}
export function throughDoorway(a, b) { return (a === 'outer') !== (b === 'outer'); }
export function oppositeZone(L, z) {
    if (L.kind === 'small') return 'inner';
    if (RING.includes(z) && isZone(L, OPP[z])) return OPP[z];
    if (z === 'c') return L.kind === 'corridor' ? L.arms[0] : 'n';
    return 'c';
}

// ---- names (the UI and the AI read these) -------------------------------------------------
const DIRN = { n: 'north', e: 'east', s: 'south', w: 'west' };
export function zoneName(L, z) {
    if (z === 'inner') return 'the room';
    if (z === 'c') return L.kind === 'corridor' ? 'the middle of the passage' : 'the centre';
    if (RING.includes(z)) return `the ${DIRN[z]} ${L.kind === 'corridor' ? 'arm' : 'side'}`;
    if (z === 'outer') return 'just outside';
    if (z === 'out') return 'out of range';
    return String(z);
}
export function zoneShort(z) { return { inner: 'room', c: 'centre', n: 'north', e: 'east', s: 'south', w: 'west', outer: 'outside', out: 'out of range' }[z] || String(z); }
export function layoutName(L) { return L.kind === 'small' ? 'small room (one zone)' : L.kind === 'corridor' ? `corridor (centre + ${L.arms.map(d => DIRN[d]).join(', ')})` : 'large space (centre + north, east, south, west)'; }

// ---- attacks -------------------------------------------------------------------------------
// { melee, ranged, reachFt, normalFt, longFt } from an attack: its `kind` ('melee' | 'ranged' |
// 'melee or ranged'), its range text ("reach 5 ft. or range 20/60 ft."), else an SRD weapon's
// properties ("Thrown (Range 20/60)", "Ammunition (Range 150/600; …)").
export function attackProfile(atk, weaponProps, weaponCategory) {
    const a = atk || {};
    const text = [a.reach, a.range, a.notes].filter(x => typeof x === 'string').join(' ') + ' ' + (weaponProps || '');
    const reach = /reach\s+(\d+)/i.exec(text);
    const rng = /range\s*\(?\s*(\d+)(?:\s*\/\s*(\d+))?/i.exec(text);
    let melee, ranged;
    if (a.kind === 'melee') { melee = true; ranged = !!rng; }
    else if (a.kind === 'ranged') { melee = false; ranged = true; }
    else if (a.kind === 'melee or ranged') { melee = true; ranged = true; }
    else { ranged = !!rng; melee = !(weaponCategory && /ranged/.test(weaponCategory)); if (!rng && weaponCategory && /ranged/.test(weaponCategory)) ranged = true; }
    const normalFt = rng ? Number(rng[1]) : (ranged ? 80 : 0);
    return { melee: !!melee, ranged: !!ranged, reachFt: reach ? Number(reach[1]) : 5, normalFt, longFt: rng && rng[2] ? Number(rng[2]) : normalFt };
}
// Can an attack with profile P go from zone a to zone b? → { ok, ranged, reason }
export function attackCheck(L, a, b, P) {
    if (a === 'out') return { ok: false, reason: 'the attacker is out of range of the fight' };
    if (b === 'out') return { ok: false, reason: 'the target is out of range' };
    const d = distance(L, a, b);
    if (P.melee && (d === 0 || (d === 1 && P.reachFt > 30))) return { ok: true, ranged: false };
    if (!P.ranged) return { ok: false, reason: d === 1 ? 'melee reaches only the same zone — move there first' : 'the target is too far away for a melee attack' };
    if (!lineOfFire(L, a, b)) return { ok: false, reason: 'walls block the line of fire' };
    if (P.normalFt <= 30 && d > 1) return { ok: false, reason: `a range of ${P.normalFt} ft reaches only the next zone` };
    return { ok: true, ranged: true };
}

// ---- terrain -------------------------------------------------------------------------------
const THREE_Q = /pillar|column|statue|boulder|stalagmite|sarcophag|bookshel|shelves|throne|wall|colossus|monolith|pile of rubble/i;
// 'half' | 'three' | null for a room feature (explicit `cover`, else from its kind and name).
export function coverOf(f) {
    if (!f) return null;
    if (f.cover === 'none') return null;
    if (f.cover === 'half' || f.cover === 'three') return f.cover;
    if (f.kind && f.kind !== 'furniture') return null;
    return THREE_Q.test(String(f.name || '')) ? 'three' : 'half';
}
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// The zone a feature stands in (explicit `zone` when valid in this layout, else stable spread).
export function featureZone(L, f) {
    if (f && f.zone && inside(L, f.zone)) return f.zone;
    if (L.kind === 'small') return 'inner';
    const ins = L.kind === 'corridor' ? ['c', ...L.arms] : ['c', ...RING];
    return ins[hash(f && f.id) % ins.length];
}
export function coverBonus(level) { return COVER[level] || 0; }

// ---- movement ------------------------------------------------------------------------------
// Zones a creature may move in one turn: 1, or 2 at 60 ft speed and more; fleeing doubles it.
export function moveAllowance(speedFt, flee) { const base = (Number(speedFt) || 30) >= 60 ? 2 : 1; return flee ? base * 2 : base; }
// Leaving a zone provokes opportunity attacks when fleeing or moving more than one zone.
export function provokes(zonesMoved, flee) { return !!flee || zonesMoved > 1; }

// ---- start positions ------------------------------------------------------------------------
// Party zone: the side of the room it came in by, else the centre (small: the room).
export function partyStart(L, entryDir) {
    if (L.kind === 'small') return 'inner';
    if (entryDir && isZone(L, entryDir) && inside(L, entryDir)) return entryDir;
    return 'c';
}
// Enemies: 'auto' (across the room), 'same' (with the party), 'near' (the next zone),
// 'outside' (behind the doors).
export const ENEMY_STARTS = ['auto', 'same', 'near', 'outside'];
export function enemyStart(L, partyZone, how) {
    if (how === 'outside') return 'outer';
    if (how === 'same' || L.kind === 'small') return partyZone;
    if (how === 'near') return partyZone === 'c' ? (L.kind === 'corridor' ? L.arms[0] : 'n') : 'c';
    return oppositeZone(L, partyZone);
}
