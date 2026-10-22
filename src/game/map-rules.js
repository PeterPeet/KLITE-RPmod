// =============================================================================
// KLITE RPmod — map rules (R7): dungeons & towns, room by room (pure, no DOM)
// -----------------------------------------------------------------------------
// A dungeon or town is a location with `kind: 'dungeon'|'town'`; its rooms/places are
// locations with `parentId` = the dungeon/town (they may nest: a dungeon level inside a
// dungeon). Rooms are hidden from the world graph and drawn on a board RPmod lays out.
//
// Exits are stored ONCE, on the room where they were made (`loc.exits[]`), and read from
// both sides (`exitsOf` mirrors the direction). One exit = one door = one state = one
// "secret found", so the two sides can never disagree. Legacy data stays valid:
// `connectedLocationIds` = open connections without a direction; old `exits[{ name,
// locationId }]` gain `id`/`to` (all other fields are kept).
//
// Board position: `room.map = { x, y, w, h }` in grid cells (layout engine or dragging).
// Exploration per story (runtime, both slots): `explored { [roomId]: 'known'|'discovered'|
// 'visited' }` (missing = unknown; known = behind a closed door, name hidden in dungeons;
// discovered = seen), `found { secrets: [exit or room ids], traps: [ids], searched: { [roomId]: n } }`,
// `doorState { [exitId]: state }` and `roomLight { [roomId]: light }` (override the authored ones).
// The AI's map tags: map-tags.js.
// Design: docs/design/R7-world-map.md.
// =============================================================================

export const KINDS = ['location', 'dungeon', 'town'];
export const DIRS = ['n', 'e', 's', 'w', 'up', 'down'];
export const DIR_NAMES = { n: 'north', e: 'east', s: 'south', w: 'west', up: 'up', down: 'down' };
export const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e', up: 'down', down: 'up' };
export const EXIT_TYPES = ['door', 'corridor', 'stairs', 'secret', 'open'];
export const DOOR_STATES = ['open', 'closed', 'locked', 'barred'];
export const LIGHT = ['bright', 'dim', 'dark'];
export const FEATURE_KINDS = ['furniture', 'container', 'trap', 'light'];
export const EXPLORE = ['known', 'discovered', 'visited'];   // rising; missing = unknown
export const STYLES = { dungeon: ['stone', 'parchment'], town: ['streets', 'plots'] };
export const ROOM = { w: 4, h: 3, gap: 1 };                  // default room size, gap in cells

const asArray = v => (Array.isArray(v) ? v : []);

export function kindOf(loc) { return loc && KINDS.includes(loc.kind) ? loc.kind : 'location'; }
export function isContainer(loc) { const k = kindOf(loc); return k === 'dungeon' || k === 'town'; }
export function mirrorDir(d) { return OPPOSITE[d] || null; }
export function dirName(d) { return DIR_NAMES[d] || ''; }

// ---- exits --------------------------------------------------------------------------
// Adds `id` and `to` to a stored exit (legacy `locationId` kept). Returns the same object.
export function normalizeExit(ex, uid) {
    if (!ex || typeof ex !== 'object') return ex;
    if (!ex.id) ex.id = uid ? uid() : 'ex_' + Math.random().toString(36).slice(2, 9);
    if (!ex.to && ex.locationId) ex.to = ex.locationId;
    return ex;
}
export function isSecret(ex) { return !!ex && (ex.type === 'secret' || Number(ex.secretDC) > 0); }
// Authored door state (runtime overrides it): doors and secret doors start closed.
export function authoredDoorState(ex) {
    const s = ex && ex.door && ex.door.state;
    if (DOOR_STATES.includes(s)) return s;
    return ex && (ex.type === 'door' || ex.type === 'secret') ? 'closed' : 'open';
}
export function doorState(ex, runtimeDoorState) {
    const r = runtimeDoorState && ex && runtimeDoorState[ex.id];
    return DOOR_STATES.includes(r) ? r : authoredDoorState(ex);
}
export function blocksMove(state) { return state === 'locked' || state === 'barred'; }

// Every connection of `loc`, seen from `loc`: its own exits, exits other locations store
// towards it (direction mirrored), then legacy `connectedLocationIds` not covered by an exit.
// View: { id, from, to, dir, type, door, secretDC, owner, mirrored, legacy? } (+ other stored fields).
export function exitsOf(loc, locations) {
    if (!loc) return [];
    const out = [], seen = new Set();
    for (const ex of asArray(loc.exits)) {
        const to = ex && (ex.to || ex.locationId); if (!to) continue;
        out.push(Object.assign({}, ex, { from: loc.id, to, owner: loc.id, mirrored: false })); seen.add(to);
    }
    for (const other of asArray(locations)) {
        if (!other || other.id === loc.id) continue;
        for (const ex of asArray(other.exits)) {
            if (!ex || (ex.to || ex.locationId) !== loc.id) continue;
            out.push(Object.assign({}, ex, { from: loc.id, to: other.id, dir: mirrorDir(ex.dir), owner: other.id, mirrored: true })); seen.add(other.id);
        }
    }
    for (const id of asArray(loc.connectedLocationIds)) {
        if (!id || seen.has(id)) continue;
        out.push({ id: 'link:' + loc.id + ':' + id, from: loc.id, to: id, dir: null, type: 'open', owner: loc.id, mirrored: false, legacy: true }); seen.add(id);
    }
    return out;
}
// Exits the player (and the AI) may know about: secret ones only once found.
export function visibleExit(ex, found) {
    return !isSecret(ex) || asArray(found && found.secrets).includes(ex.id);
}

// ---- board layout (grid cells) ---------------------------------------------------------
export function rectOf(room) {
    const m = (room && room.map) || {};
    const num = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.round(Number(v)) : d);
    return { x: num(m.x, 0), y: num(m.y, 0), w: Math.max(1, num(m.w, ROOM.w)), h: Math.max(1, num(m.h, ROOM.h)) };
}
export function hasRect(room) { return !!(room && room.map && Number.isFinite(Number(room.map.x)) && Number.isFinite(Number(room.map.y))); }
// Overlap test with a margin (cells kept free around a room).
export function overlaps(a, b, gap = 0) {
    return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}
// Nearest spot to `want` (same size) that keeps `gap` cells from every placed rect.
export function freeSpot(want, placed, gap = 0) {
    const ok = r => !placed.some(p => overlaps(r, p, gap));
    if (ok(want)) return { ...want };
    for (let ring = 1; ring <= 60; ring++) {
        const cands = [];
        for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            cands.push({ x: want.x + dx, y: want.y + dy, w: want.w, h: want.h, d: dx * dx + dy * dy });
        }
        cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        for (const c of cands) if (ok(c)) return { x: c.x, y: c.y, w: c.w, h: c.h };
    }
    return { ...want, y: Math.max(0, ...placed.map(p => p.y + p.h)) + gap };
}
// The spot next to `from` in direction `dir` for a room of size w×h.
export function besideRect(from, dir, w = ROOM.w, h = ROOM.h, gap = ROOM.gap) {
    switch (dir) {
        case 'n': return { x: from.x, y: from.y - h - gap, w, h };
        case 's': return { x: from.x, y: from.y + from.h + gap, w, h };
        case 'w': return { x: from.x - w - gap, y: from.y, w, h };
        default: return { x: from.x + from.w + gap, y: from.y, w, h };   // e, up, down, none
    }
}
// Direction from rect a to rect b (dominant axis of the centres).
export function dirBetween(a, b) {
    const dx = (b.x + b.w / 2) - (a.x + a.w / 2), dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
    return dy >= 0 ? 's' : 'n';
}
// Positions for rooms without one: next to a placed neighbour in the exit's direction,
// else below everything. Returns { [roomId]: rect } for the rooms it placed (in order).
export function layoutRooms(rooms, allLocations) {
    rooms = asArray(rooms).filter(Boolean);
    const placed = new Map(rooms.filter(hasRect).map(r => [r.id, rectOf(r)]));
    const todo = rooms.filter(r => !placed.has(r.id));
    const out = {};
    const inRooms = new Set(rooms.map(r => r.id));
    while (todo.length) {
        let pick = -1, anchor = null;
        for (let i = 0; i < todo.length && pick < 0; i++) {
            const ex = exitsOf(todo[i], allLocations || rooms).find(e => inRooms.has(e.to) && placed.has(e.to));
            if (ex) { pick = i; anchor = ex; }
        }
        if (pick < 0) pick = 0;
        const room = todo.splice(pick, 1)[0];
        const size = rectOf(room);
        let want;
        if (anchor) want = besideRect(placed.get(anchor.to), mirrorDir(anchor.dir) || 'e', size.w, size.h);
        else if (!placed.size) want = { x: 0, y: 0, w: size.w, h: size.h };
        else want = { x: 0, y: Math.max(...[...placed.values()].map(p => p.y + p.h)) + ROOM.gap, w: size.w, h: size.h };
        const r = freeSpot(want, [...placed.values()], ROOM.gap);
        placed.set(room.id, r); out[room.id] = r;
    }
    return out;
}
export function boardBounds(rects) {
    rects = asArray(rects);
    if (!rects.length) return { x: 0, y: 0, w: ROOM.w, h: ROOM.h };
    const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
    return { x, y, w: Math.max(...rects.map(r => r.x + r.w)) - x, h: Math.max(...rects.map(r => r.y + r.h)) - y };
}

// ---- exploration (runtime, per story) ----------------------------------------------------
export function defaultExploration() { return { explored: {}, found: { secrets: [], traps: [], searched: {} }, doorState: {}, roomLight: {} }; }
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
// Ensures the exploration fields on a runtime snapshot (older saves have none). Mutates.
// Step 3 added found.searched { [roomId]: n } and roomLight { [roomId]: light } (additive).
export function normalizeExploration(snap) {
    if (!snap || typeof snap !== 'object') return snap;
    if (!isMap(snap.explored)) snap.explored = {};
    if (!snap.found || typeof snap.found !== 'object') snap.found = {};
    snap.found.secrets = asArray(snap.found.secrets);
    snap.found.traps = asArray(snap.found.traps);
    if (!isMap(snap.found.searched)) snap.found.searched = {};
    if (!isMap(snap.doorState)) snap.doorState = {};
    if (!isMap(snap.roomLight)) snap.roomLight = {};
    return snap;
}
// Fog: a room behind an exit the player can see through (open way, open door) is
// 'discovered' (seen, name known); behind a closed door only 'known' (there is something).
export function seeThrough(ex, state) { return !!ex && (!(ex.type === 'door' || ex.type === 'secret') || state === 'open'); }
export const DEFAULT_DC = 15;   // secret doors/rooms, traps and locks without a DC of their own
export function exploreRank(level) { return EXPLORE.indexOf(level) + 1; }   // 0 = unknown
// Raises a room's exploration level (never lowers it). Returns true if it changed.
export function raiseExplored(explored, id, level) {
    if (!explored || !id || !EXPLORE.includes(level)) return false;
    if (exploreRank(explored[id]) >= exploreRank(level)) return false;
    explored[id] = level; return true;
}

// ---- directions typed by the player / the AI ---------------------------------------------
const DIR_WORDS = { n: 'n', north: 'n', northward: 'n', e: 'e', east: 'e', eastward: 'e', s: 's', south: 's', southward: 's',
    w: 'w', west: 'w', westward: 'w', u: 'up', up: 'up', upstairs: 'up', d: 'down', down: 'down', downstairs: 'down' };
// "north", "the north door", "go east" → 'n' / 'e'; else null.
export function parseDir(text) {
    const t = String(text || '').toLowerCase().replace(/\b(the|a|an|go|to|door|passage|exit|way|stairs|corridor|through)\b/g, ' ').trim();
    return DIR_WORDS[t] || null;
}
// "The Ossuary" / "ossuary room" → "ossuary" (for forgiving name matching)
export function nameKey(text) {
    return String(text || '').toLowerCase().replace(/^\s*(the|a|an)\s+/, '').replace(/[.,!?;:"'`]+/g, '').replace(/\s+/g, ' ').trim();
}

// ---- small read-only text map for the AI (explored rooms only) ----------------------------
// rooms: [{ id, name, rect }], links: [[idA, idB]], hereId → lines like
//   [1]-[@]
//        |
//       [2]
//   @ Hall (you are here) · 1 Entrance · 2 Ossuary
// Markers sit on a coarse grid from the rooms' positions; a dash/bar joins neighbours on the
// same row/column. The AI reads it; it never writes coordinates back.
export function asciiMap(rooms, links, hereId) {
    rooms = asArray(rooms); if (!rooms.length) return '';
    const step = ROOM.w + ROOM.gap, stepY = ROOM.h + ROOM.gap;
    const cells = new Map(); const pos = {};
    const byOrder = rooms.slice().sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x));
    for (const r of byOrder) {
        let c = Math.round((r.rect.x + r.rect.w / 2) / step), row = Math.round((r.rect.y + r.rect.h / 2) / stepY);
        while (cells.has(c + ',' + row)) c++;
        cells.set(c + ',' + row, r.id); pos[r.id] = { c, row };
    }
    const cs = Object.values(pos).map(p => p.c), rs = Object.values(pos).map(p => p.row);
    const c0 = Math.min(...cs), r0 = Math.min(...rs), W = (Math.max(...cs) - c0) * 4 + 3, H = (Math.max(...rs) - r0) * 2 + 1;
    const grid = Array.from({ length: H }, () => Array(W).fill(' '));
    const label = {}; let n = 0;
    for (const r of byOrder) label[r.id] = r.id === hereId ? '@' : String(++n <= 9 ? n : String.fromCharCode(55 + n));   // 1-9, then A…
    for (const [a, b] of asArray(links)) {
        const p = pos[a], q = pos[b]; if (!p || !q) continue;
        if (p.row === q.row && Math.abs(p.c - q.c) === 1) grid[(p.row - r0) * 2][(Math.min(p.c, q.c) - c0) * 4 + 3] = '-';
        else if (p.c === q.c && Math.abs(p.row - q.row) === 1) grid[(Math.min(p.row, q.row) - r0) * 2 + 1][(p.c - c0) * 4 + 1] = '|';
    }
    for (const r of rooms) { const p = pos[r.id], y = (p.row - r0) * 2, x = (p.c - c0) * 4; grid[y][x] = '['; grid[y][x + 1] = label[r.id]; grid[y][x + 2] = ']'; }
    const legend = byOrder.map(r => `${label[r.id]} ${r.name}${r.id === hereId ? ' (you are here)' : ''}`);
    return grid.map(l => l.join('').replace(/\s+$/, '')).join('\n') + '\n' + legend.join(' · ');
}
