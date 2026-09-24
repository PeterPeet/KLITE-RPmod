// =============================================================================
// KLITE RPmod — dungeon & town generator (R7 step 4): pure, seeded, no DOM
// -----------------------------------------------------------------------------
// generateDungeon / generateTown return a *plan* — rooms (grid rects, light, features,
// encounter) and exits (direction, type, door) keyed 'r0', 'r1', … — that the Worlds engine
// turns into locations (KLITE-RPmod_Worlds.js generateMap). The same seed and options always
// give the same plan (a small seeded RNG; Math.random is never used here).
//
// Dungeon: rooms grow as a tree on a lattice (every room reachable), a few extra connections
// make loops, one secret room behind a secret door, doors/passages by theme, one locked door
// whose key lies in a chest on the near side, traps, lights and furniture by theme, optional
// encounters from a theme's SRD 5.2.1 monsters within the party's XP budget. Names are
// placeholders ("Room 4") — the AI names a room once with <room>Name, here: …</room>.
// Town: the places the creator ticked around a square, joined by open streets.
// Design: docs/design/R7-world-map.md ("Generator").
// =============================================================================
import { findMonster, MONSTERS, budget } from './combat-rules.js';

export const SIZES = { small: 5, medium: 8, large: 12 };        // rooms (+1 secret room)
export const ENCOUNTER_LEVELS = ['none', 'few', 'some'];
const STEP = { x: 6, y: 4 };                                    // lattice spacing in grid cells
const DELTA = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const CARD = ['n', 'e', 's', 'w'];

// ---- seeded random ---------------------------------------------------------------------
// xmur3 string hash → mulberry32. rng(seed)() ∈ [0, 1).
function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
}
export function rng(seed) {
    let a = hash(String(seed == null ? '' : seed));
    return function () {
        a = (a + 0x6D2B79F5) >>> 0; let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// A short seed to show and type (the caller passes its own random source, e.g. Math.random).
export function randomSeed(rand) { let s = ''; for (let i = 0; i < 6; i++) s += SEED_CHARS[Math.floor((rand || Math.random)() * SEED_CHARS.length)]; return s; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const chance = (R, p) => R() < p;
const between = (R, lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
function shuffle(R, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- themes ----------------------------------------------------------------------------
// connect(R) → { type, door? }; monsters = SRD 5.2.1 names (resolved with findMonster).
export const THEMES = {
    crypt: {
        label: 'Crypt', style: 'stone', key: 'Rusty Key', lockable: true,
        connect: (R) => { const x = R(); return x < 0.65 ? { type: 'door', door: { state: 'closed', material: pick(R, ['stone', 'iron', 'oak']) } } : x < 0.8 ? { type: 'door', door: { state: 'open', material: 'oak' } } : { type: 'corridor' }; },
        light: (R) => (chance(R, 0.7) ? 'dark' : 'dim'),
        furniture: ['Sarcophagus', 'Bone niches', 'Cracked altar', 'Stone bench', 'Toppled statue', 'Row of burial slabs'],
        containers: ['Burial urn', 'Iron-bound chest', 'Reliquary', 'Offering bowl'],
        traps: ['Pressure plate', 'Poison needle in a lid', 'Scything blade', 'Collapsing floor'],
        lights: ['Brazier', 'Guttering candles'],
        monsters: ['Skeleton', 'Zombie', 'Ghoul', 'Shadow', 'Specter', 'Ghast', 'Wight', 'Mummy', 'Giant Rat', 'Swarm of Crawling Claws'],
    },
    cave: {
        label: 'Cave', style: 'stone', key: null, lockable: false,
        connect: (R) => (chance(R, 0.7) ? { type: 'open' } : { type: 'corridor' }),
        light: (R) => (chance(R, 0.85) ? 'dark' : 'dim'),
        furniture: ['Stalagmites', 'Underground pool', 'Pile of bones', 'Fallen boulder', 'Dripping stalactites'],
        containers: ["Explorer's pack", 'Mouldy sack', 'Nest of rags'],
        traps: ['Loose rocks overhead', 'Hidden pit', 'Slippery ledge'],
        lights: ['Glowing fungus'],
        monsters: ['Wolf', 'Giant Spider', 'Giant Bat', 'Giant Centipede', 'Stirge', 'Goblin Warrior', 'Ogre', 'Brown Bear', 'Owlbear', 'Giant Lizard', 'Gray Ooze', 'Ochre Jelly'],
        hazard: ['water', 0.15],
    },
    ruin: {
        label: 'Ruin', style: 'parchment', key: 'Iron Key', lockable: true,
        connect: (R) => { const x = R(); return x < 0.3 ? { type: 'door', door: { state: 'closed', material: 'wood' } } : x < 0.45 ? { type: 'door', door: { state: 'open', material: 'rotten wood' } } : x < 0.75 ? { type: 'corridor' } : { type: 'open' }; },
        light: (R) => (chance(R, 0.2) ? 'bright' : chance(R, 0.6) ? 'dim' : 'dark'),
        furniture: ['Collapsed pillar', 'Rotted table', 'Weathered statue', 'Overgrown fountain', 'Broken throne'],
        containers: ['Old crate', 'Strongbox', 'Rotting wardrobe'],
        traps: ['Tripwire', 'Falling masonry', 'Rigged floorboards'],
        lights: ['Torch sconce', 'Shaft of daylight'],
        monsters: ['Bandit', 'Cultist', 'Tough', 'Scout', 'Goblin Warrior', 'Bandit Captain', 'Cultist Fanatic', 'Animated Armor', 'Giant Rat', 'Harpy'],
    },
    sewer: {
        label: 'Sewer', style: 'stone', key: 'Grate Key', lockable: true,
        connect: (R) => { const x = R(); return x < 0.5 ? { type: 'corridor' } : x < 0.8 ? { type: 'door', door: { state: 'closed', material: 'iron grate' } } : { type: 'open' }; },
        light: (R) => (chance(R, 0.75) ? 'dark' : 'dim'),
        furniture: ['Sluice gate', 'Narrow walkway', 'Overflowing drain', 'Rusted pipes'],
        containers: ['Heap of flotsam', 'Lost satchel', 'Smugglers\' barrel'],
        traps: ['Slick ledge', 'Rusted grate that gives way', 'Pocket of foul gas'],
        lights: ['Hanging lantern', 'Light from a grate above'],
        monsters: ['Giant Rat', 'Swarm of Rats', 'Gray Ooze', 'Wererat', 'Giant Centipede', 'Ochre Jelly', 'Crocodile', 'Bandit', 'Otyugh'],
        hazard: ['water', 0.5],
    },
};

// Places a creator can tick for a town (design: "market, temple, guild, inn, bathhouse, smithy, …").
export const TOWN_PLACES = [
    { key: 'market', name: 'Market', features: [['Market stalls', 'furniture'], ['Fruit cart', 'furniture']] },
    { key: 'temple', name: 'Temple', features: [['Altar', 'furniture'], ['Rows of candles', 'light']] },
    { key: 'garden', name: 'Temple Garden', features: [['Fountain', 'furniture'], ['Herb beds', 'furniture']] },
    { key: 'guild', name: "Adventurers' Guild", features: [['Notice board', 'furniture'], ['Trophy wall', 'furniture']] },
    { key: 'inn', name: 'Inn', features: [['Hearth', 'light'], ['Bar counter', 'furniture']] },
    { key: 'bathhouse', name: 'Bathhouse', features: [['Warm pool', 'furniture']] },
    { key: 'smithy', name: 'Smithy', features: [['Forge', 'light'], ['Anvil', 'furniture']] },
    { key: 'shop', name: 'General Store', features: [['Crowded shelves', 'furniture'], ['Counter', 'furniture']] },
    { key: 'alchemist', name: "Alchemist's Shop", features: [['Shelves of vials', 'furniture']] },
    { key: 'stables', name: 'Stables', features: [['Horse stalls', 'furniture']] },
    { key: 'townhall', name: 'Town Hall', features: [['Council table', 'furniture']] },
    { key: 'library', name: 'Library', features: [['Bookshelves', 'furniture'], ['Reading lamp', 'light']] },
    { key: 'barracks', name: 'Guard Barracks', features: [['Weapon racks', 'furniture']] },
    { key: 'docks', name: 'Docks', features: [['Moored boats', 'furniture']] },
    { key: 'graveyard', name: 'Graveyard', features: [['Weathered gravestones', 'furniture']] },
    { key: 'tannery', name: 'Tannery', features: [['Drying racks', 'furniture']] },
];
export const DEFAULT_TOWN = ['market', 'temple', 'guild', 'inn', 'smithy'];

// A theme's monsters that exist in the bundled SRD data: [{ key, name, xp }]
export function themeMonsters(theme) {
    const t = THEMES[theme] || THEMES.crypt;
    const out = [];
    for (const n of t.monsters) { const key = findMonster(n); if (key && MONSTERS[key] && !out.some(m => m.key === key)) out.push({ key, name: MONSTERS[key].name, xp: MONSTERS[key].xp || 0 }); }
    return out;
}
// One encounter within `target` XP: one monster kind (sometimes a second) from the pool.
export function buildEncounter(R, pool, target) {
    let fit = pool.filter(m => m.xp > 0 && m.xp <= target && m.xp >= target / 8);
    if (!fit.length) fit = pool.filter(m => m.xp > 0 && m.xp <= target);
    if (!fit.length) { const low = pool.filter(m => m.xp > 0).sort((a, b) => a.xp - b.xp)[0]; return low ? [{ key: low.key, count: 1 }] : []; }
    const first = pick(R, fit);
    const count = Math.max(1, Math.min(6, Math.floor(target / first.xp) - (chance(R, 0.4) ? 1 : 0)));
    const out = [{ key: first.key, count }];
    const rest = target - count * first.xp;
    const second = pool.filter(m => m.key !== first.key && m.xp > 0 && m.xp <= rest);
    if (second.length && chance(R, 0.4)) out.push({ key: pick(R, second).key, count: 1 });
    return out;
}

// ---- lattice helpers ---------------------------------------------------------------------
const slotKey = (i, j) => i + ',' + j;
// Rooms are centred in their lattice slot (widths 3 or 5 share a centre), so connections
// between rooms in the same column or row stay straight.
function rectAt(i, j, w, h) { return { x: i * STEP.x + (5 - w) / 2, y: j * STEP.y, w, h }; }
function neighbours(i, j) { return CARD.map(d => ({ d, i: i + DELTA[d][0], j: j + DELTA[d][1] })); }
// Rooms reachable from `start` over `edges` (optionally skipping one edge index).
export function reachable(start, edges, skip) {
    const seen = new Set([start]); const todo = [start];
    while (todo.length) {
        const cur = todo.pop();
        edges.forEach((e, k) => {
            if (k === skip) return;
            const nxt = e.from === cur ? e.to : e.to === cur ? e.from : null;
            if (nxt && !seen.has(nxt)) { seen.add(nxt); todo.push(nxt); }
        });
    }
    return seen;
}
function depths(start, edges) {
    const d = { [start]: 0 }; const q = [start];
    while (q.length) { const cur = q.shift(); for (const e of edges) { const n = e.from === cur ? e.to : e.to === cur ? e.from : null; if (n && d[n] == null) { d[n] = d[cur] + 1; q.push(n); } } }
    return d;
}

// ---- dungeon -----------------------------------------------------------------------------
// opts: { size: 'small'|'medium'|'large', theme, seed, encounters: 'none'|'few'|'some',
//         level, partySize } → { kind:'dungeon', seed, theme, size, style, rooms, exits, wayOut }
export function generateDungeon(opts = {}) {
    const size = SIZES[opts.size] ? opts.size : 'medium';
    const theme = THEMES[opts.theme] ? opts.theme : 'crypt';
    const seed = String(opts.seed || 'seed');
    const T = THEMES[theme];
    const R = rng(`${seed}|dungeon|${theme}|${size}`);
    const n = SIZES[size];
    const rooms = [], edges = [], slots = new Map();
    const reserved = new Set([slotKey(-1, 0)]);          // the way out, west of the entrance
    const addRoomAt = (i, j, extra) => {
        const key = 'r' + rooms.length;
        const room = Object.assign({ key, slot: [i, j], name: `Room ${rooms.length + 1}`, rect: rectAt(i, j, chance(R, 0.3) ? 3 : 5, 3), features: [] }, extra || {});
        rooms.push(room); slots.set(slotKey(i, j), key); return room;
    };
    const free = (i, j) => !slots.has(slotKey(i, j)) && !reserved.has(slotKey(i, j));
    const entrance = addRoomAt(0, 0, { name: 'Entrance', entrance: true });
    // tree growth: extend mostly from recent rooms (corridor-like), sometimes from any
    let guard = 0;
    while (rooms.length < n && guard++ < 500) {
        const from = chance(R, 0.6) ? rooms[Math.max(0, rooms.length - 1 - Math.floor(R() * 3))] : pick(R, rooms);
        const opts2 = neighbours(...from.slot).filter(x => free(x.i, x.j));
        if (!opts2.length) continue;
        const nb = pick(R, opts2);
        const room = addRoomAt(nb.i, nb.j);
        edges.push(Object.assign({ from: from.key, to: room.key, dir: nb.d }, T.connect(R)));
    }
    // loops: a few extra connections between neighbours that are not yet linked
    const linked = (a, b) => edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    const loopCands = [];
    for (const r of rooms) for (const nb of neighbours(...r.slot)) {
        const other = slots.get(slotKey(nb.i, nb.j));
        if (other && (nb.d === 'e' || nb.d === 's') && !linked(r.key, other) && !r.secret) loopCands.push({ from: r.key, to: other, dir: nb.d });
    }
    for (const c of shuffle(R, loopCands).slice(0, Math.floor(n / 4))) edges.push(Object.assign(c, T.connect(R)));
    // one secret room behind a secret door (off a room that is not the entrance)
    const hosts = shuffle(R, rooms.filter(r => !r.entrance)).filter(r => neighbours(...r.slot).some(x => free(x.i, x.j)));
    if (hosts.length) {
        const host = hosts[0]; const nb = pick(R, neighbours(...host.slot).filter(x => free(x.i, x.j)));
        const secret = addRoomAt(nb.i, nb.j, { secret: true });
        edges.push({ from: host.key, to: secret.key, dir: nb.d, type: 'secret', door: { state: 'closed', material: 'stone' }, secretDC: between(R, 13, 16) });
        secret.features.push({ name: pick(R, T.containers), kind: 'container', desc: 'Hidden away and untouched.' });
    }
    // one locked door (not the secret one, not at the entrance) with its key on the near side
    if (T.lockable) {
        const cands = edges.map((e, k) => ({ e, k })).filter(x => x.e.type !== 'secret' && x.e.from !== entrance.key && x.e.to !== entrance.key);
        for (const { e, k } of shuffle(R, cands)) {
            const near = reachable(entrance.key, edges.filter(x => x.type !== 'secret'), edges.filter(x => x.type !== 'secret').indexOf(e));
            const far = rooms.filter(r => !near.has(r.key) && !r.secret);
            if (!far.length) continue;                        // locking it would not shut anything off
            const keyRooms = rooms.filter(r => near.has(r.key) && !r.entrance && !r.secret);
            if (!keyRooms.length) continue;
            e.type = 'door'; e.door = { state: 'locked', material: (e.door && e.door.material) || 'iron', lockDC: between(R, 12, 15), keyItem: T.key };
            const kr = pick(R, keyRooms);
            kr.features.push({ name: pick(R, T.containers), kind: 'container', desc: `Inside: ${T.key.toLowerCase()}.`, contains: [T.key] });
            edges[k] = e;
            break;
        }
    }
    // light, hazards, furniture, containers, lights
    for (const r of rooms) {
        r.light = T.light(R);
        if (T.hazard && chance(R, T.hazard[1])) r.hazards = [T.hazard[0]];
        if (chance(R, 0.7)) r.features.push({ name: pick(R, T.furniture), kind: 'furniture' });
        if (chance(R, 0.25)) r.features.push({ name: pick(R, T.containers), kind: 'container' });
        if (r.light !== 'dark' && chance(R, 0.6)) r.features.push({ name: pick(R, T.lights), kind: 'light', lit: true });
    }
    // traps: about one per five rooms, never in the entrance
    const trapRooms = shuffle(R, rooms.filter(r => !r.entrance)).slice(0, Math.max(1, Math.floor(rooms.length / 5)));
    for (const r of trapRooms) r.features.push({ name: pick(R, T.traps), kind: 'trap', trapDC: between(R, 11, 15) });
    // encounters: the deepest room moderate, the others low
    const encLevel = ENCOUNTER_LEVELS.includes(opts.encounters) ? opts.encounters : 'none';
    if (encLevel !== 'none') {
        const pool = themeMonsters(theme);
        const b = budget(opts.level || 1, opts.partySize || 1);
        const dep = depths(entrance.key, edges);
        const cands = rooms.filter(r => !r.entrance && !r.secret).sort((a, c) => (dep[c.key] || 0) - (dep[a.key] || 0));
        const count = Math.min(cands.length, encLevel === 'few' ? Math.max(1, Math.round(n / 4)) : Math.max(2, Math.round(n / 2)));
        const chosen = [cands[0]].concat(shuffle(R, cands.slice(1)).slice(0, count - 1)).filter(Boolean);
        chosen.forEach((r, i) => {
            const difficulty = i === 0 ? 'moderate' : 'low';
            const monsters = buildEncounter(R, pool, b[difficulty]);
            if (monsters.length) r.encounter = { monsters, difficulty };
        });
    }
    return { kind: 'dungeon', seed, theme, size, style: T.style, rooms: rooms.map(stripSlot), exits: edges, wayOut: { room: entrance.key, dir: 'w' } };
}
function stripSlot(r) { const { slot, ...rest } = r; return rest; }

// ---- town --------------------------------------------------------------------------------
// opts: { places: [keys of TOWN_PLACES], seed } → { kind:'town', seed, rooms, exits, wayOut }
// The square sits in the middle; places fill the nearest free spots around it, each joined by
// an open street to a neighbour nearer the square; a few extra streets make loops.
export function generateTown(opts = {}) {
    const seed = String(opts.seed || 'seed');
    const keys = (Array.isArray(opts.places) && opts.places.length ? opts.places : DEFAULT_TOWN).filter(k => TOWN_PLACES.some(p => p.key === k));
    const R = rng(`${seed}|town|${keys.join(',')}`);
    const rooms = [], edges = [], slots = new Map();
    const reserved = new Set([slotKey(0, 1)]);           // the town gate, south of the square
    const add = (i, j, fields) => { const key = 'r' + rooms.length; const r = Object.assign({ key, slot: [i, j], rect: rectAt(i, j, 5, 3), light: 'bright', features: [] }, fields); rooms.push(r); slots.set(slotKey(i, j), key); return r; };
    const square = add(0, 0, { name: 'Town Square', entrance: true, features: [{ name: 'Well', kind: 'furniture' }] });
    for (const k of shuffle(R, keys)) {
        const place = TOWN_PLACES.find(p => p.key === k);
        const cands = [];
        for (const r of rooms) for (const nb of neighbours(...r.slot)) {
            const sk = slotKey(nb.i, nb.j); if (slots.has(sk) || reserved.has(sk)) continue;
            cands.push({ i: nb.i, j: nb.j, dist: Math.abs(nb.i) + Math.abs(nb.j) });
        }
        const best = Math.min(...cands.map(c => c.dist));
        const spot = pick(R, cands.filter(c => c.dist === best));
        const room = add(spot.i, spot.j, { name: place.name, place: k, features: place.features.map(([name, kind]) => (kind === 'light' ? { name, kind, lit: true } : { name, kind })) });
        // the street: to the placed neighbour nearest the square
        const nbs = neighbours(spot.i, spot.j).map(x => ({ d: x.d, key: slots.get(slotKey(x.i, x.j)), dist: Math.abs(x.i) + Math.abs(x.j) })).filter(x => x.key && x.key !== room.key).sort((a, b) => a.dist - b.dist);
        const to = nbs[0];
        edges.push({ from: to.key, to: room.key, dir: OPP[to.d], type: 'open' });
    }
    const linked = (a, b) => edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    const loopCands = [];
    for (const r of rooms) for (const nb of neighbours(...r.slot)) {
        const other = slots.get(slotKey(nb.i, nb.j));
        if (other && (nb.d === 'e' || nb.d === 's') && !linked(r.key, other)) loopCands.push({ from: r.key, to: other, dir: nb.d, type: 'open' });
    }
    for (const c of shuffle(R, loopCands).slice(0, Math.floor(rooms.length / 3))) edges.push(c);
    return { kind: 'town', seed, places: keys, style: 'streets', rooms: rooms.map(stripSlot), exits: edges, wayOut: { room: square.key, dir: 's' } };
}
