'use strict';
// R7 step 1: location kinds, dungeon/town rooms hidden from the world graph, exits stored once
// and read from both sides, doors, layout, exploration state (per story, both slots),
// migrations of older worlds/saves, secrets kept out of the AI slice.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const MR = requireSrc('src/game/map-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

test('map rules: kinds, exits read from both sides, doors, secrets', () => {
    assert.equal(MR.kindOf({}), 'location');
    assert.equal(MR.kindOf({ kind: 'bogus' }), 'location', 'unknown kind reads as location');
    assert.ok(MR.isContainer({ kind: 'dungeon' }) && MR.isContainer({ kind: 'town' }) && !MR.isContainer({ kind: 'location' }));

    const a = { id: 'a', exits: [{ id: 'x1', to: 'b', dir: 'e', type: 'door', door: { state: 'locked' } }] };
    const b = { id: 'b', connectedLocationIds: ['c'] };
    const c = { id: 'c', connectedLocationIds: ['b'] };
    const locs = [a, b, c];
    const fromB = MR.exitsOf(b, locs);
    assert.deepEqual(fromB.map(e => [e.to, e.dir, e.mirrored, !!e.legacy]), [['a', 'w', true, false], ['c', null, false, true]]);
    assert.equal(fromB[0].id, 'x1', 'same exit id on both sides');
    assert.equal(MR.doorState(fromB[0]), 'locked');
    assert.equal(MR.doorState(fromB[0], { x1: 'open' }), 'open', 'runtime overrides authored');
    assert.equal(MR.authoredDoorState({ type: 'door' }), 'closed');
    assert.equal(MR.authoredDoorState({ type: 'corridor' }), 'open');
    assert.ok(MR.blocksMove('locked') && MR.blocksMove('barred') && !MR.blocksMove('closed'));
    const sec = { id: 's1', type: 'door', secretDC: 15 };
    assert.ok(MR.isSecret(sec) && MR.isSecret({ type: 'secret' }));
    assert.equal(MR.visibleExit(sec, { secrets: [] }), false);
    assert.equal(MR.visibleExit(sec, { secrets: ['s1'] }), true);

    const legacy = { name: 'North gate', locationId: 'b' };
    MR.normalizeExit(legacy, () => 'ex_1');
    assert.deepEqual(plain(legacy), { name: 'North gate', locationId: 'b', id: 'ex_1', to: 'b' }, 'legacy fields kept');
});

test('map rules: layout, free spots, directions', () => {
    const r = { x: 0, y: 0, w: 4, h: 3 };
    assert.deepEqual(MR.besideRect(r, 'e'), { x: 5, y: 0, w: 4, h: 3 });
    assert.deepEqual(MR.besideRect(r, 'n'), { x: 0, y: -4, w: 4, h: 3 });
    assert.equal(MR.dirBetween(r, { x: 5, y: 0, w: 4, h: 3 }), 'e');
    assert.equal(MR.dirBetween(r, { x: 0, y: 8, w: 4, h: 3 }), 's');
    const spot = MR.freeSpot({ x: 0, y: 0, w: 4, h: 3 }, [r], 1);
    assert.ok(!MR.overlaps(spot, r, 1), 'free spot keeps the gap');

    // a room without a position lands next to its neighbour, in the exit's direction
    const hall = { id: 'hall', map: { x: 0, y: 0, w: 4, h: 3 }, exits: [{ id: 'e1', to: 'ossuary', dir: 's' }] };
    const oss = { id: 'ossuary' };
    const crypt = { id: 'crypt', exits: [{ id: 'e2', to: 'hall', dir: 'w' }] };   // crypt -> hall is west: crypt east of hall
    const lone = { id: 'lone' };
    const placed = MR.layoutRooms([hall, oss, crypt, lone], [hall, oss, crypt, lone]);
    assert.deepEqual(placed.ossuary, { x: 0, y: 4, w: 4, h: 3 });
    assert.deepEqual(placed.crypt, { x: 5, y: 0, w: 4, h: 3 });
    const all = [MR.rectOf(hall), placed.ossuary, placed.crypt, placed.lone];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!MR.overlaps(all[i], all[j]), `rooms ${i} and ${j} do not overlap`);

    const ex = {}; assert.ok(MR.raiseExplored(ex, 'r', 'known')); assert.ok(MR.raiseExplored(ex, 'r', 'visited'));
    assert.ok(!MR.raiseExplored(ex, 'r', 'known'), 'never lowered'); assert.equal(ex.r, 'visited');
    assert.deepEqual(plain(MR.normalizeExploration({ found: { secrets: 'x' } })), { explored: {}, found: { secrets: [], traps: [] }, doorState: {} });
});

async function mapHost(t) {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    await h.api().loadExample();
    return h;
}
// A small dungeon off the Forest Road: Entrance -(door)- Hall -(secret door)- Vault (secret room),
// Hall -(locked door)- Ossuary.
function buildCrypt(W) {
    const crypt = W.addEntity('location', { name: 'Old Crypt' });
    W.setLocationKind(crypt.id, 'dungeon');
    const ent = W.addRoom(crypt.id, { name: 'Entrance' });
    const hall = W.addRoom(crypt.id, { name: 'Hall', near: ent.id, dir: 'e' });
    const oss = W.addRoom(crypt.id, { name: 'Ossuary', near: hall.id, dir: 's', connect: false });
    const lockDoor = W.addExit(hall.id, oss.id, { door: { state: 'locked', material: 'iron', lockDC: 15 } });
    const vault = W.addRoom(crypt.id, { name: 'Vault', near: hall.id, dir: 'e', connect: false, secret: true });
    const secret = W.addExit(hall.id, vault.id, { type: 'secret', secretDC: 15 });
    W.addExit(ent.id, 'loc_forest', { type: 'open', dir: 'w' });   // the way out to the world
    return { crypt, ent, hall, oss, vault, lockDoor, secret };
}

test('engine: dungeon rooms are locations hidden from the world graph', async (t) => {
    const h = await mapHost(t); const W = h.api();
    const d = buildCrypt(W);
    assert.equal(W.locationKind(d.crypt.id), 'dungeon');
    assert.deepEqual(plain(W.roomsOf(d.crypt.id)), [d.ent.id, d.hall.id, d.oss.id, d.vault.id]);
    assert.equal(W.mapOf(d.oss.id), d.crypt.id);
    assert.equal(W.entityById(d.hall.id).parentId, d.crypt.id, 'rooms keep parentId (zones from R4)');
    assert.deepEqual(plain(W.entityById(d.hall.id).map), { x: 5, y: 0, w: 4, h: 3 }, 'placed beside the entrance');
    assert.ok(!W.entityById(d.hall.id).exits.some(e => e.to === d.ent.id), 'stored once: the entrance holds the entrance–hall exit');
    assert.ok(W.entityById(d.ent.id).exits.some(e => e.to === d.hall.id));
    assert.equal(W.exitsOf(d.hall.id).find(e => e.to === d.ent.id).dir, 'w', 'mirrored direction');

    const g = W.getGraph();
    const node = (id) => g.nodes.find(n => n.id === id);
    assert.equal(node(d.crypt.id).kind, 'dungeon'); assert.equal(node(d.crypt.id).rooms, 4);
    assert.equal(node(d.hall.id).mapId, d.crypt.id, 'room marked as inside the map');
    assert.equal(node(d.hall.id).graphId, d.crypt.id);
    assert.equal(node(d.hall.id).label, 'Old Crypt › Hall');
    assert.equal(node('loc_forest').mapId, undefined, 'ordinary locations unchanged');
    assert.ok(g.edges.some(e => e.from === d.ent.id && e.to === 'loc_forest' && e.kind === 'exit'), 'exit to the outside is an edge');

    // rooms work like locations: move there, quests/visits, AI slice
    W.moveTo('Hall');
    assert.equal(W.runtime.playerLocationId, d.hall.id);
    assert.throws(() => W.addExit(d.hall.id, d.oss.id), /already connected/);
    assert.throws(() => W.addExit(d.hall.id, d.hall.id), /itself/);
});

test('engine: exploration state, doors, secrets stay out of the AI slice', async (t) => {
    const h = await mapHost(t); const W = h.api();
    const d = buildCrypt(W);
    W.moveTo('Hall');
    const ex = W.exploration();
    assert.equal(ex.explored[d.hall.id], 'visited');
    assert.equal(ex.explored[d.ent.id], 'known', 'neighbours behind visible exits become known');
    assert.equal(ex.explored[d.oss.id], 'known', 'a locked door still shows the room behind it');
    assert.equal(ex.explored[d.vault.id], undefined, 'secret room stays unknown');

    let s = W.preview();
    assert.match(s, /\[Current Location: Hall\][\s\S]*Part of: Old Crypt/);
    assert.match(s, /Exits:\n(- .*\n)*- west: Entrance/); assert.match(s, /- south: Ossuary \(locked iron door\)/);
    assert.doesNotMatch(s, /Vault/, 'unfound secret not in the AI context');
    assert.doesNotMatch(s, /- [a-z]+: Old Crypt/, 'the dungeon itself is not an exit from its rooms');

    // outside, the dungeon lists only rooms the player knows
    W.moveTo(d.crypt.id);
    assert.doesNotMatch(W.preview(), /Vault/);

    assert.equal(W.doorState(d.lockDoor.id), 'locked');
    assert.equal(W.setDoorState(d.lockDoor.id, 'open'), 'open');
    assert.equal(W.doorState(d.lockDoor.id), 'open');
    assert.equal(W.entityById(d.hall.id).exits.find(e => e.id === d.lockDoor.id).door.state, 'locked', 'authored state unchanged');
    assert.equal(W.setDoorState(d.lockDoor.id, 'ajar'), null, 'unknown state refused');

    W.markFound('secret', d.secret.id); W.markFound('secret', d.vault.id);
    W.moveTo('Hall');
    s = W.preview();
    assert.match(s, /- east: Vault \(closed secret door\)/, 'found secret door + room reach the AI');
    assert.equal(W.exploration().explored[d.vault.id], 'known');

    // board: creator sees all, the player only the known part
    const all = W.mapBoard(d.crypt.id), mine = W.mapBoard(d.crypt.id, { player: true });
    assert.equal(all.rooms.length, 4); assert.equal(all.here, d.hall.id);
    assert.ok(all.exits.find(e => e.id === d.secret.id).secret);
    assert.equal(all.outside[0].name, 'Forest Road');
    assert.ok(mine.rooms.every(r => r.explored || r.here));

    // exploration lives in the runtime slot (reset brings back the base)
    W.commitToBase(); W.setExplored(d.oss.id, 'visited'); W.resetToBase();
    assert.equal(W.exploration().explored[d.oss.id], 'known');
});

test('engine: exits edit/remove, delete a dungeon with its rooms, kind change marks unsaved', async (t) => {
    const h = await mapHost(t); const W = h.api();
    await W.saveActiveWorld();
    const d = buildCrypt(W);
    assert.ok(W.hasUnsavedChanges(), 'map edits are world edits');
    const e = W.updateExit(d.lockDoor.id, { dir: 's', door: { state: 'barred' }, secretDC: null });
    assert.equal(e.door.state, 'barred'); assert.equal(e.door.material, 'iron', 'door patch merges');
    W.updateExit(d.lockDoor.id, { type: 'corridor', door: null });
    assert.equal(W.doorState(d.lockDoor.id), 'open');
    assert.ok(W.removeExit(d.lockDoor.id));
    assert.equal(W.findExit(d.lockDoor.id), null);

    const feat = W.addFeature(d.hall.id, { name: 'Sarcophagus', kind: 'container', contains: ['Silver Ring'] });
    assert.equal(W.getGraph().nodes.find(n => n.id === feat.id).mapId, d.crypt.id, 'features in rooms are hidden from the world graph too');

    // without withRooms: nothing lost, rooms come back as top-level locations
    const n0 = W.activeWorld().locations.length;
    W.deleteEntity(d.crypt.id);
    assert.equal(W.activeWorld().locations.length, n0 - 1);
    assert.equal(W.getGraph().nodes.find(n => n.id === d.hall.id).mapId, undefined);
    await W.revertToSaved();
    const d2 = buildCrypt(W);
    W.addFeature(d2.hall.id, { name: 'Brazier', kind: 'light', lit: true });
    W.deleteEntity(d2.crypt.id, { withRooms: true });
    assert.ok(!W.activeWorld().locations.some(l => /Entrance|Hall|Ossuary|Vault|Old Crypt/.test(l.name)));
    assert.ok(!W.activeWorld().objects.some(o => o.name === 'Brazier'), 'features deleted with their room');
    assert.ok(!(W.entityById('loc_forest').exits || []).length, 'no exit left pointing into the deleted dungeon');
});

test('migration: older worlds and saves load with R7 fields, nothing lost', async (t) => {
    const h = await mapHost(t); const W = h.api();
    // an old world with legacy exits {name, locationId}
    await W.importWorld({ id: 'w_old', name: 'Old', locations: [
        { id: 'l1', name: 'Gate', exits: [{ name: 'North road', locationId: 'l2', note: 'kept' }] },
        { id: 'l2', name: 'Road', connectedLocationIds: ['l3'] }, { id: 'l3', name: 'Inn', connectedLocationIds: ['l2'] }] });
    const ex = W.entityById('l1').exits[0];
    assert.ok(ex.id && ex.to === 'l2' && ex.locationId === 'l2' && ex.note === 'kept' && ex.name === 'North road');
    assert.equal(W.locationKind('l1'), 'location');
    assert.deepEqual(plain(W.exitsOf('l2').map(e => e.to).sort()), ['l1', 'l3'], 'legacy exits + links read from both sides');
    W.enable(); W.moveTo('Road');
    assert.match(W.preview(), /Exits: [^\n]*Gate/);

    // an old save without exploration fields (flat and two-slot)
    W.restoreSaveState({ version: 1, enabled: true, activeWorldId: 'w_old', runtime: { playerLocationId: 'l2', flags: { a: 1 } } });
    assert.deepEqual(plain(W.exploration()), { explored: {}, found: { secrets: [], traps: [] }, doorState: {} });
    assert.equal(W.runtime.flags.a, 1);
    W.restoreSaveState({ version: 1, enabled: true, activeWorldId: 'w_old', runtime: { active: 'working', base: { flags: { b: 2 } }, working: { flags: { c: 3 }, found: { secrets: ['s'] } } } });
    assert.deepEqual(plain(W.runtimeSlots.base.found), { secrets: [], traps: [] });
    assert.deepEqual(plain(W.runtimeSlots.working.found), { secrets: ['s'], traps: [] }, 'existing found kept, traps added');
    assert.equal(W.runtimeSlots.working.flags.c, 3);
    // exploration survives the story save round trip
    W.setExplored('l1', 'visited');
    const st = JSON.parse(JSON.stringify(W.collectSaveState()));
    W.restoreSaveState(st);
    assert.equal(W.exploration().explored.l1, 'visited');
});
