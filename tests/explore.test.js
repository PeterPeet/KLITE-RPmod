'use strict';
// R7 step 3: AI map tags (go/open/close/unlock/search/room/door/light) with a forgiving parser,
// fog states (unknown / known behind a closed door / seen / visited), secrets and traps found by
// Search checks (d20 + Perception/Investigation, logged) and passive Perception, door actions
// in the mini-map. RPmod decides, the AI narrates: refusals and rolls go to the game log.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, click, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const MT = requireSrc('src/game/map-tags.js');
const plain = (v) => JSON.parse(JSON.stringify(v));

// Old Crypt: Entrance -(closed door, e)- Hall -(locked iron door, s, key "Iron Key")- Ossuary,
// Hall -(secret door DC 15, e)- Vault (secret room); a trap (DC 12) in the Hall.
function buildCrypt(W) {
    const crypt = W.addEntity('location', { name: 'Old Crypt' }); W.setLocationKind(crypt.id, 'dungeon');
    const ent = W.addRoom(crypt.id, { name: 'Entrance' });
    const hall = W.addRoom(crypt.id, { name: 'Hall', near: ent.id, dir: 'e' });
    const oss = W.addRoom(crypt.id, { name: 'Ossuary', near: hall.id, dir: 's', connect: false });
    const lock = W.addExit(hall.id, oss.id, { dir: 's', door: { state: 'locked', material: 'iron', keyItem: 'Iron Key', lockDC: 14 } });
    const vault = W.addRoom(crypt.id, { name: 'Vault', near: hall.id, dir: 'e', connect: false, secret: true });
    const secret = W.addExit(hall.id, vault.id, { type: 'secret', secretDC: 15, dir: 'e' });
    W.addExit(ent.id, 'loc_forest', { type: 'open', dir: 'w' });
    const trap = W.addFeature(hall.id, { name: 'Pressure plate', kind: 'trap', trapDC: 12 });
    const toHall = W.exitsOf(ent.id).find(e => e.to === hall.id);
    return { crypt, ent, hall, oss, vault, lock, secret, trap, toHall };
}
async function host(t, opts = {}) {
    const h = createHost(); t.after(h.close);
    if (opts.reply) h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.load(...(opts.ui ? ['shell', 'gamelog', 'worlds', 'worldsUI'] : ['gamelog', 'worlds']));
    await h.ready({ ui: !!opts.ui });
    await h.api().loadExample();
    return h;
}
const logText = (w) => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
const HIGH = [0.99], LOW = [0];   // every d20 a 20 / a 1

test('tag parser: reply order, forgiving forms, room/door/light specs', () => {
    const tags = MT.scanMapTags('He fumbles. <UNLOCK>the south door</unlock> <open> south </open><search/> <Move>Ossuary</move> <search></search> <go>north</GO> <light>pitch black</light> <flag>x</flag>');
    assert.deepEqual(tags.map(t => [t.tag, t.arg]), [['unlock', 'the south door'], ['open', 'south'], ['search', ''], ['go', 'Ossuary'], ['search', ''], ['go', 'north'], ['light', 'pitch black']]);
    assert.deepEqual(MT.scanMapTags('<search>').map(t => t.tag), ['search'], 'a lone open tag counts');
    assert.equal(MT.looseKey('The Crypts!'), 'crypt');

    assert.deepEqual(MT.parseRoomSpec('Ossuary, east: bones stacked to the ceiling'), { name: 'Ossuary', dir: 'e', description: 'bones stacked to the ceiling' });
    assert.deepEqual(MT.parseRoomSpec('The Ossuary (north): cold'), { name: 'Ossuary', dir: 'n', description: 'cold' });
    assert.deepEqual(MT.parseRoomSpec('west: Guard Room, empty cots'), { name: 'Guard Room', dir: 'w', description: 'empty cots' });
    assert.deepEqual(MT.parseRoomSpec('Well Room to the south'), { name: 'Well Room', dir: 's', description: '' });
    assert.deepEqual(MT.parseRoomSpec('Chapel: candles'), { name: 'Chapel', dir: null, description: 'candles' });

    assert.deepEqual(MT.parseDoorSpec('east = locked, iron, DC 15, key: Iron Key'), { target: 'east', state: 'locked', material: 'iron', lockDC: 15, keyItem: 'Iron Key' });
    assert.deepEqual(MT.parseDoorSpec('the north door = oak door, barred'), { target: 'the north door', material: 'oak', state: 'barred' });
    assert.deepEqual(MT.parseDoorSpec('south = unlocked'), { target: 'south', state: 'closed' });
    assert.ok(MT.harderOrSame('closed', 'locked')); assert.ok(!MT.harderOrSame('locked', 'open'));
    assert.equal(MT.parseLight('dimly lit'), 'dim'); assert.equal(MT.parseLight('Dark'), 'dark'); assert.equal(MT.parseLight('bright daylight'), 'bright'); assert.equal(MT.parseLight('purple'), null);
});

test('fog: known behind a closed door (name hidden), seen through an open one, visited', async (t) => {
    const h = await host(t); const W = h.api();
    const d = buildCrypt(W);
    W.moveTo('Entrance');
    let ex = W.exploration().explored;
    assert.equal(ex[d.hall.id], 'known', 'behind a closed door');
    let b = W.mapBoard(d.crypt.id, { player: true });
    assert.equal(b.rooms.find(r => r.id === d.hall.id).name, '?', 'the player board hides the name');
    assert.equal(W.playerPlaceName(d.hall.id, d.ent.id), 'unexplored room');
    assert.equal(W.placeName(d.hall.id, d.ent.id), 'Hall', 'the creator view keeps it');
    // "unexplored room" (as the AI reads it) = the only unseen exit
    assert.equal(W.door('open', 'the unexplored room').ok, true); W.door('close', 'east');
    // open the door → the room behind is seen
    assert.ok(W.door('open', 'east', { source: 'ui' }).ok);
    assert.equal(W.exploration().explored[d.hall.id], 'discovered');
    b = W.mapBoard(d.crypt.id, { player: true });
    assert.equal(b.rooms.find(r => r.id === d.hall.id).name, 'Hall');
    W.go('Hall');
    ex = W.exploration().explored;
    assert.equal(ex[d.hall.id], 'visited'); assert.equal(ex[d.ent.id], 'visited'); assert.equal(ex[d.oss.id], 'known');
    // a level never drops (closing the door again)
    W.door('close', 'west');
    W.moveTo('Hall');
    assert.equal(W.exploration().explored[d.ent.id], 'visited');
    // town places are common knowledge: names always shown
    const town = W.addEntity('location', { name: 'Brightford' }); W.setLocationKind(town.id, 'town');
    const sq = W.addRoom(town.id, { name: 'Square' }); const mk = W.addRoom(town.id, { name: 'Market', near: sq.id, dir: 'e' });
    W.moveTo(sq.id);
    assert.equal(W.playerPlaceName(mk.id, sq.id), 'Market');
});

test('doors: open/close, locked refuses, key unlocks, thieves\' tools roll, barred, logged', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api();
    const d = buildCrypt(W);
    W.moveTo('Hall');
    let r = W.door('open', 'south', { source: 'ui' });
    assert.equal(r.ok, false); assert.match(logText(w), /Open south refused: the south iron door is locked\./);
    r = W.door('open', 'north');
    assert.match(r.reason, /no such door/);
    r = W.door('unlock', 'the iron door');
    assert.equal(r.ok, false); assert.match(r.reason, /locked, and there is no key or thieves' tools/, 'no key, no tools: refused without a roll');
    // thieves' tools: d20 + DEX vs lockDC 14
    W.giveItem("Thieves' Tools");
    W.setPlayerCombat({ stats: { abilities: { dex: 16 } } });
    h.seedRandom(LOW);
    r = W.door('unlock', 'south');
    assert.equal(r.ok, false); assert.equal(W.doorState(d.lock.id), 'locked');
    assert.match(logText(w), /Picks the lock of the south iron door \(Thieves' Tools\): 4 \[d20 1\+3\] — the lock holds\./);
    assert.doesNotMatch(logText(w), /DC 14/, 'the lock DC is not revealed');
    h.seedRandom(HIGH);
    r = W.door('unlock', 'south');
    assert.ok(r.ok); assert.equal(W.doorState(d.lock.id), 'closed');
    assert.match(logText(w), /the lock opens\./);
    // the key works without a roll
    W.setDoorState(d.lock.id, 'locked'); W.takeItem("Thieves' Tools"); W.giveItem('Iron Key');
    r = W.door('unlock', 'Ossuary');
    assert.ok(r.ok && !r.roll); assert.match(logText(w), /Unlocks the south iron door with the Iron Key\./);
    assert.ok(W.door('open', 'south', { source: 'ui' }).ok); assert.match(logText(w), /Opens the south iron door\./);
    assert.equal(W.exploration().explored[d.oss.id], 'discovered');
    assert.ok(W.door('close', 'south', { source: 'ui' }).ok); assert.equal(W.doorState(d.lock.id), 'closed');
    // barred
    W.setDoorState(d.lock.id, 'barred');
    assert.match(W.door('unlock', 'south').reason, /barred from the other side/);
    // a way without a door
    W.moveTo('Entrance');
    assert.match(W.door('open', 'west').reason, /the way west has no door/);
    // "door" alone when there is exactly one door
    assert.ok(W.door('open', 'door').ok);
    assert.equal(W.doorState(d.toHall.id), 'open');
});

test('search: d20 + best of Perception/Investigation, finds secret doors, hidden rooms and traps; DCs stay hidden', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api();
    const d = buildCrypt(W);
    W.setPlayerCombat({ stats: { abilities: { wis: 12, int: 8 } } });   // Perception +1 beats Investigation −1
    W.moveTo('Hall');
    assert.deepEqual(plain(W.hiddenIn(d.hall.id).map(x => x.kind).sort()), ['secret', 'trap']);
    h.seedRandom(LOW);
    let r = W.search({ source: 'ui' });
    assert.ok(r.ok); assert.equal(r.found.length, 0); assert.equal(r.skill, 'Perception');
    assert.match(logText(w), /Searches Hall \(Perception\): 2 \[d20 1\+1\] — nothing found\./);
    assert.doesNotMatch(logText(w), /DC/, 'no DC in the log');
    assert.doesNotMatch(W.preview(), /Vault|Pressure plate/, 'nothing leaks into the AI context');
    h.seedRandom(HIGH);
    r = W.search();
    assert.deepEqual(plain(r.found.map(f => f.kind).sort()), ['secret', 'trap']);
    assert.match(logText(w), /found a secret door \(east\), a trap \(Pressure plate\)\./);
    assert.equal(W.exploration().found.searched[d.hall.id], 2);
    // the secret room is found with its door; the way is known, the room behind a closed door unseen
    assert.ok(W.exploration().found.secrets.includes(d.vault.id));
    let s = W.preview();
    assert.match(s, /- east: unexplored room \(closed secret door\)/);
    assert.match(s, /Pressure plate \(trap\)/);
    assert.ok(W.go('east').ok, 'the found secret door can be used');
    assert.match(W.preview(), /\[Current Location: Vault\]/);
    // Investigation wins when it is higher
    W.setPlayerCombat({ stats: { abilities: { wis: 8, int: 16 } } });
    assert.equal(W.search().skill, 'Investigation');
});

test('passive Perception on entering finds what it beats (logged), a sheet skill total counts', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api();
    const d = buildCrypt(W);
    W.setPlayerCombat({ stats: { abilities: { wis: 10 }, skills: { perception: 3 } } });   // passive 13
    assert.equal(W.passivePerception(), 13);
    W.moveTo('Entrance'); W.go('east');
    assert.ok(W.exploration().found.traps.includes(d.trap.id), 'trap DC 12 noticed');
    assert.ok(!W.exploration().found.secrets.includes(d.secret.id), 'secret DC 15 not');
    assert.match(logText(w), /Notices a trap \(Pressure plate\) in Hall \(passive Perception 13\)\./);
});

test('AI tags on reply arrival, in order: unlock → open → go; <room>, <door>, <light>; refusals logged', async (t) => {
    const h = await host(t, { reply: true }); const w = h.window; const W = h.api();
    const d = buildCrypt(W); W.enable();
    await W.saveActiveWorld();
    W.moveTo('Hall'); W.giveItem('Iron Key');
    w.handle_incoming_text('You try the key. <unlock>south</unlock> <open>the south door</open> <go>south</go>');
    assert.equal(W.runtime.playerLocationId, d.oss.id, 'unlocked, opened and moved in one reply');
    assert.equal(W.doorState(d.lock.id), 'open');

    // <room>: placed next to the current room, named exactly, joined by an open door, seen
    w.handle_incoming_text('A narrow arch leads on. <room>Bone Pit, west: a pit full of old bones</room>');
    const pit = W.entityById(W.roomsOf(d.crypt.id).find(id => W.entityById(id).name === 'Bone Pit'));
    assert.ok(pit, 'room added'); assert.equal(pit.origin, 'ai'); assert.equal(pit.parentId, d.crypt.id);
    assert.equal(pit.description, 'a pit full of old bones');
    const pitExit = W.exitsOf(d.oss.id).find(e => e.to === pit.id);
    assert.equal(pitExit.dir, 'w'); assert.equal(W.doorState(pitExit.id), 'open');
    assert.ok(pit.map.x < W.entityById(d.oss.id).map.x, 'laid out to the west');
    assert.equal(W.exploration().explored[pit.id], 'discovered');
    assert.ok(W.hasUnsavedChanges(), 'an AI room is a world edit (the creator keeps or deletes it)');
    assert.match(logText(w), /New room: Bone Pit, west of Ossuary\./);
    assert.equal(W.mapBoard(d.crypt.id).rooms.find(r => r.id === pit.id).origin, 'ai');
    // the same side twice: refused; the same name again: no second room
    w.handle_incoming_text('<room>Crypt Annex, west: dusty</room> <room>bone pit, west: a deep pit</room>');
    assert.match(logText(w), /Room Crypt Annex refused: there is already a way west \(Bone Pit\)\./);
    assert.equal(W.roomsOf(d.crypt.id).length, 5);

    // <door>: only harder; material/DC/key fill in what is empty
    w.handle_incoming_text('The arch slams shut. <door>west = locked, iron, DC 18</door>');
    assert.equal(W.doorState(pitExit.id), 'locked');
    const stored = W.findExit(pitExit.id).exit.door;
    assert.equal(stored.material, 'iron'); assert.equal(stored.lockDC, 18);
    assert.match(logText(w), /The west iron door is now locked\./);
    w.handle_incoming_text('It swings open by itself. <door>west = open</door> <go>Bone Pit</go>');
    assert.equal(W.doorState(pitExit.id), 'locked', 'the AI cannot open a door with <door>');
    assert.match(logText(w), /Door west refused: the door is locked — only <open> or <unlock> opens it\./);
    assert.match(logText(w), /Move to Bone Pit refused: the iron door is locked\./);
    assert.equal(W.runtime.playerLocationId, d.oss.id);
    w.handle_incoming_text('<door>east = locked</door>');
    assert.match(logText(w), /Door east refused: there is no such way here\./);

    // <light>
    w.handle_incoming_text('Your torch gutters out. <light>pitch dark</light>');
    assert.match(W.preview(), /Light: dark/);
    assert.equal(W.exploration().roomLight[d.oss.id], 'dark');
    const st = JSON.parse(JSON.stringify(W.collectSaveState()));
    W.restoreSaveState(st);
    assert.equal(W.roomLight(d.oss.id), 'dark', 'room light is saved with the story');

    // <search> from the AI rolls like the Search button
    W.moveTo('Hall'); h.seedRandom(HIGH);
    w.handle_incoming_text('You run your hands along the walls. <search/>');
    assert.ok(W.exploration().found.secrets.includes(d.secret.id));

    // outside a dungeon <room> is refused
    W.moveTo('Millbrook Village');
    w.handle_incoming_text('<room>Cellar, down: damp</room>');
    assert.match(logText(w), /Room Cellar refused: new rooms can only be added inside a dungeon or town\./);
    // the AI hears the refusals in the next turn
    await w.prepare_submit_generation();
    assert.match(h.prompt, /Room Cellar refused/);
});

test('migration: a step-2 save gains the new exploration fields and keeps its state', async (t) => {
    const h = await host(t); const W = h.api();
    W.restoreSaveState({ version: 1, enabled: true, activeWorldId: W.activeWorld().id, runtime: { active: 'working',
        base: { explored: { r1: 'known' }, found: { secrets: ['x'], traps: [] }, doorState: { e1: 'open' } },
        working: { explored: { r1: 'visited' }, found: { secrets: ['x'], traps: ['t'] }, doorState: { e1: 'locked' } } } });
    assert.deepEqual(plain(W.exploration()), { explored: { r1: 'visited' }, found: { secrets: ['x'], traps: ['t'], searched: {} }, doorState: { e1: 'locked' }, roomLight: {} });
    assert.deepEqual(plain(W.runtimeSlots.base.found), { secrets: ['x'], traps: [], searched: {} });
    assert.deepEqual(plain(W.runtimeSlots.base.roomLight), {});
});

test('mini-map: door buttons, Search with its result, unexplored rooms as "?"', async (t) => {
    const h = await host(t, { ui: true }); const w = h.window; const doc = w.document; const W = h.api();
    const d = buildCrypt(W);
    const sec = () => doc.querySelector('[data-section="minimap"]');
    W.moveTo('Entrance'); await sleep(40);
    const hall = () => sec().querySelector(`g[data-room="${d.hall.id}"]`);
    assert.ok(hall().classList.contains('rpm-map-unseen'), 'behind a closed door');
    assert.equal(hall().querySelector('text').textContent, '?');
    assert.match(sec().querySelector(`[data-go="${d.hall.id}"]`).textContent, /east: unexplored room/);
    click(sec().querySelector(`[data-door="open"][data-exit="${d.toHall.id}"]`), w);
    await sleep(40);
    assert.equal(W.doorState(d.toHall.id), 'open');
    assert.equal(hall().querySelector('text').textContent, 'Hall');
    assert.match(sec().querySelector('.rpm-map-result').textContent, /Opens the east door/);
    assert.ok(sec().querySelector(`[data-door="close"][data-exit="${d.toHall.id}"]`), 'now it offers Close');
    click(sec().querySelector(`[data-go="${d.hall.id}"]`), w); await sleep(40);
    // locked door: Unlock button; refused without key/tools
    click(sec().querySelector(`[data-door="unlock"][data-exit="${d.lock.id}"]`), w); await sleep(40);
    assert.match(sec().querySelector('.rpm-map-refused').textContent, /no key or thieves' tools/);
    // Search
    h.seedRandom(HIGH);
    click(sec().querySelector('[data-map-search]'), w); await sleep(40);
    assert.match(sec().querySelector('.rpm-map-result').textContent, /found a secret door \(east\)/);
    assert.ok(sec().querySelector(`[data-go="${d.vault.id}"]`), 'the found secret door is an exit now');
    // light chip
    W.setRoomLight('dark'); await sleep(40);
    assert.equal(sec().querySelector('[data-map-light]').getAttribute('data-map-light'), 'dark');
});
