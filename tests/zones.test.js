'use strict';
// R7 step 5: zone combat — layouts from the room (small / large / corridor), moving by zones,
// melee in the same zone, ranged by weapon range, −3 in melee, fleeing and opportunity attacks,
// cover from room features, hiding and searching, monster tactics, the doorway limit, the AI's
// battlefield text, fights saved without zones, and the Combat window's zone board.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const ZR = requireSrc('src/game/zone-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));
// d20 = 1 + floor(r × 20); every d20 draws two numbers (the second is for advantage).

test('rules: layouts, adjacency, line of fire, reach and range, cover, movement, starts', () => {
    const small = ZR.layoutFor({ map: { w: 3, h: 3 } }, ['e']);
    const large = ZR.layoutFor({ map: { w: 5, h: 3 } }, ['w', 'e']);
    const cross = ZR.layoutFor({ map: { w: 1, h: 5 }, combatSpace: 'corridor' }, ['n', 's', 'e', 'w']);
    const hall = ZR.layoutFor({ map: { w: 1, h: 6 } }, ['n']);
    const outdoors = ZR.layoutFor(null, []);
    assert.equal(small.kind, 'small'); assert.equal(large.kind, 'large'); assert.equal(outdoors.kind, 'large');
    assert.deepEqual(plain(cross.arms), ['n', 'e', 's', 'w']);
    assert.deepEqual(plain(hall), { kind: 'corridor', arms: ['n', 's'], open: ['n'] }, 'a dead end runs along its long side');
    assert.equal(ZR.layoutFor({ map: { w: 5, h: 5 }, combatSpace: 'small' }).kind, 'small', 'the creator can override');
    assert.deepEqual(plain(ZR.zonesOf(small)), ['inner', 'outer', 'out']);

    assert.equal(ZR.distance(large, 'n', 's'), 2, 'opposite sides: through the centre or around');
    assert.equal(ZR.distance(large, 'n', 'e'), 1, 'neighbours on the ring touch');
    assert.equal(ZR.distance(large, 'c', 'outer'), 2);
    assert.equal(ZR.distance(large, 'w', 'outer'), 1, 'through the west door');
    assert.equal(ZR.distance(large, 'n', 'outer'), 2, 'no door north');
    assert.equal(ZR.distance(cross, 'n', 'e'), 2, 'corridor arms only meet in the middle');
    assert.equal(ZR.stepToward(large, 'n', 's'), 'c');
    assert.equal(ZR.lineOfFire(cross, 'n', 's'), true); assert.equal(ZR.lineOfFire(cross, 'n', 'e'), false, 'around the corner');
    assert.equal(ZR.lineOfFire(large, 'outer', 'n'), false, 'from outside only through the doorways'); assert.equal(ZR.lineOfFire(large, 'outer', 'c'), true);
    assert.equal(ZR.throughDoorway('outer', 'c'), true);

    const scimitar = ZR.attackProfile({ kind: 'melee', reach: 'reach 5 ft.' });
    const shortbow = ZR.attackProfile({ kind: 'ranged', reach: 'range 80/320 ft.' });
    const dagger = ZR.attackProfile({ name: 'Dagger' }, 'Finesse, Light, Thrown (Range 20/60)', 'simple melee');
    const longbow = ZR.attackProfile({ name: 'Longbow' }, 'Ammunition (Range 150/600; Arrow), Heavy, Two-Handed', 'martial ranged');
    const whip = ZR.attackProfile({ kind: 'melee', reach: 'reach 40 ft.' });
    assert.deepEqual(plain(dagger), { melee: true, ranged: true, reachFt: 5, normalFt: 20, longFt: 60 });
    assert.deepEqual([longbow.melee, longbow.ranged, longbow.normalFt], [false, true, 150]);
    assert.equal(ZR.attackCheck(large, 'c', 'c', scimitar).ok, true);
    assert.match(ZR.attackCheck(large, 'c', 'n', scimitar).reason, /same zone/);
    assert.equal(ZR.attackCheck(large, 'c', 'n', whip).ok, true, 'reach over 30 ft: the next zone');
    assert.deepEqual(plain(ZR.attackCheck(large, 'c', 'n', dagger)), { ok: true, ranged: true }, 'thrown: the next zone');
    assert.match(ZR.attackCheck(large, 'n', 's', dagger).reason, /20 ft reaches only the next zone/);
    assert.equal(ZR.attackCheck(large, 'n', 's', shortbow).ok, true, 'over 30 ft: any zone');
    assert.match(ZR.attackCheck(cross, 'n', 'e', longbow).reason, /walls/);
    assert.match(ZR.attackCheck(large, 'n', 'out', longbow).reason, /out of range/);

    assert.equal(ZR.coverOf({ name: 'Collapsed pillar', kind: 'furniture' }), 'three');
    assert.equal(ZR.coverOf({ name: 'Rotted table', kind: 'furniture' }), 'half');
    assert.equal(ZR.coverOf({ name: 'Brazier', kind: 'light' }), null);
    assert.equal(ZR.coverOf({ name: 'Statue', cover: 'none' }), null);
    assert.equal(ZR.coverOf({ name: 'Crate', kind: 'container', cover: 'half' }), 'half');
    assert.equal(ZR.featureZone(large, { id: 'x', zone: 'e' }), 'e');
    assert.equal(ZR.featureZone(small, { id: 'x', zone: 'e' }), 'inner', 'a small room is one zone');
    assert.equal(ZR.featureZone(large, { id: 'x1' }), ZR.featureZone(large, { id: 'x1' }), 'stable');

    assert.equal(ZR.moveAllowance(30), 1); assert.equal(ZR.moveAllowance(60), 2); assert.equal(ZR.moveAllowance(30, true), 2);
    assert.equal(ZR.provokes(1, false), false, 'fighting retreat'); assert.equal(ZR.provokes(1, true), true); assert.equal(ZR.provokes(2, false), true);
    assert.equal(ZR.partyStart(large, 'w'), 'w'); assert.equal(ZR.partyStart(large, null), 'c'); assert.equal(ZR.partyStart(small, 'w'), 'inner');
    assert.equal(ZR.enemyStart(large, 'w', 'auto'), 'e'); assert.equal(ZR.enemyStart(large, 'w', 'near'), 'c');
    assert.equal(ZR.enemyStart(large, 'w', 'same'), 'w'); assert.equal(ZR.enemyStart(small, 'inner', 'auto'), 'inner');
    assert.equal(ZR.enemyStart(large, 'c', 'outside'), 'outer');
});

// Entrance (4×3) -e-> Hall (5×3, large; exits west and east) -e-> Closet (3×3, small).
// Hall: Collapsed pillar (three-quarters) on the west side, Rotted table (half) in the centre.
async function hall(t, playerStats) {
    const h = createHost(); t.after(h.close);
    h.load('gamelog', 'worlds'); await h.ready();
    const W = h.api();
    await W.newWorld('Crypt world');
    const crypt = W.addEntity('location', { name: 'Old Crypt' }); W.setLocationKind(crypt.id, 'dungeon');
    const ent = W.addRoom(crypt.id, { name: 'Entrance' });
    const hallR = W.addRoom(crypt.id, { name: 'Hall', near: ent.id, dir: 'e', w: 5, h: 3 });
    const closet = W.addRoom(crypt.id, { name: 'Closet', near: hallR.id, dir: 'e', w: 3, h: 3 });
    const pillar = W.addFeature(hallR.id, { name: 'Collapsed pillar', kind: 'furniture', zone: 'w' });
    const table = W.addFeature(hallR.id, { name: 'Rotted table', kind: 'furniture', zone: 'c' });
    W.setPlayerCombat({ name: 'Kara', stats: Object.assign({ abilities: { str: 16, dex: 14, wis: 12 }, ac: 16, hpMax: 60, speed: 30,
        attacks: [{ name: 'Longsword', toHit: 5, damage: '1d8+3' }, { name: 'Longbow', toHit: 4, damage: '1d8+2' }] }, playerStats || {}) });
    W.enable(); W.moveTo(ent.id);
    return { h, W, w: h.window, crypt, ent, hallR, closet, pillar, table };
}
const log = (W) => W.getCombat().log.join('\n');
function playerTurn(W) { const cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.isPlayer); cb.zones.turn = { id: '__player__', moved: 0, fled: false, attacked: false, acted: false }; }

test('zones: positions from the entry side, melee/ranged by zone, moving, −3, fleeing, opportunity attacks', async (t) => {
    const { h, W, hallR } = await hall(t);
    assert.ok(W.go('Hall').ok);
    assert.deepEqual(plain(W.runtime.entry), { roomId: hallR.id, dir: 'w' }, 'came in on the west side');
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior', count: 1 }] });
    const gob = W.getCombat().order.find(o => o.kind === 'monster').id;
    let v = W.zoneView();
    assert.equal(v.kind, 'large');
    assert.deepEqual([v.pos.__player__, v.pos[gob]], ['w', 'e'], 'party at the door it came in by, enemies across the room');
    assert.match(log(W), /Zones: large space .*Party: the west side; enemies: the east side\./);
    const txt = W.combatText();
    assert.match(txt, /Battlefield — Old Crypt \(Hall\): large space/);
    assert.match(txt, /- the west side: .*door to Entrance; Collapsed pillar \(three-quarters cover\)/);
    assert.match(txt, /Goblin Warrior \(Goblin Warrior, AC 15\) HP 10\/10 — the east side/);
    assert.match(txt, /Kara HP 60\/60 — the west side/);

    playerTurn(W);
    let r = W.attack('__player__', gob, 0);
    assert.match(r.refused, /too far away for a melee attack/);
    assert.match(log(W), /Kara cannot attack Goblin Warrior with Longsword: the target is too far away/);
    assert.equal(W.zoneMove('__player__', 'e').ok, false, 'two zones is too far for one move');
    assert.match(log(W), /only 1 zone of movement left \(Flee moves two/);
    h.seedRandom([0.7, 0.5, 0]);   // 15 to hit, 1 on the damage die
    r = W.attack('__player__', gob, 1);   // Longbow across the room
    assert.equal(r.roll, 15 + 4);
    assert.ok(W.zoneMove('__player__', 'c').ok);
    assert.equal(W.zoneMove('__player__', 'n').ok, false, 'no movement left');
    assert.match(log(W), /Kara moves to the centre\./);

    // the goblin's turn: it closes in (one zone) and attacks with its scimitar
    let cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.id === gob); cb.zones.turn = { id: gob, moved: 0, fled: false, attacked: false, acted: false };
    h.seedRandom([0.5]);
    r = W.autoTurn(gob);
    assert.equal(W.zoneView().pos[gob], 'c');
    assert.match(log(W), /Goblin Warrior moves to the centre\.\n(Hit|Miss): Goblin Warrior → Kara with Scimitar/);

    // shooting an enemy who attacked you in melee last round: −3
    playerTurn(W);
    h.seedRandom([0.7, 0.5, 0]);
    r = W.attack('__player__', gob, 1);
    assert.equal(r.roll, 15 + 4 - 3);
    assert.match(log(W), /\[−3: Goblin Warrior attacked in melee\]/);

    // fleeing: two zones, no attack, the goblin gets an opportunity attack (once per round)
    playerTurn(W);
    h.seedRandom([0.05, 0.5]);   // the goblin's opportunity attack misses (natural 2)
    r = W.zoneFlee('__player__', 'outer');
    assert.equal(r.ok, true); assert.equal(W.zoneView().pos.__player__, 'outer');
    assert.match(log(W), /Goblin Warrior makes an opportunity attack as Kara flees\.\nMiss: Goblin Warrior → Kara with Scimitar[\s\S]*Kara flees to just outside\./);
    assert.match(W.attack('__player__', gob, 1).refused, /flees or dashes cannot attack/);
    // a one-zone fighting retreat provokes nothing
    cb = W.getCombat(); cb.zones.pos.__player__ = 'c'; cb.zones.reaction = {}; playerTurn(W);
    const before = cb.log.length;
    assert.ok(W.zoneMove('__player__', 'w').ok);
    assert.doesNotMatch(cb.log.slice(before).join('\n'), /opportunity/);
});

test('zones: cover from room features, hiding and being found, monster search', async (t) => {
    const { h, W, pillar, table } = await hall(t, { skills: { stealth: 6 } });
    W.go('Hall');
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior', count: 1 }] });
    const gob = W.getCombat().order.find(o => o.kind === 'monster').id;
    playerTurn(W);
    assert.match(W.takeCover('__player__', table.id).reason, /Rotted table is at the centre — move there first/);
    assert.ok(W.takeCover('__player__', 'the collapsed pillar').ok, 'by name');
    assert.match(W.combatText(), /Kara HP 60\/60 — the west side, behind Collapsed pillar \(three-quarters cover\)/);
    // the goblin's shortbow from the east side: AC 16 + 5
    let cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.id === gob);
    h.seedRandom([0.8, 0.5, 0.5]);   // 17 + 4 = 21 vs AC 21 → hit
    const r = W.attack(gob, '__player__', 1);
    assert.equal(r.ac, 21);
    assert.match(log(W), /three-quarters cover \+5 AC/);
    // hiding: behind three-quarters cover, nobody in the zone; Stealth 14 + 6 = 20
    playerTurn(W);
    h.seedRandom([0.65, 0.5]);
    assert.deepEqual(plain(W.hide()), { ok: true, hidden: true, total: 20 });
    assert.ok(W.conditionsOf('__player__').some(c => c.name === 'Invisible'));
    assert.match(W.combatText(), /Kara HP \d+\/60 \[Invisible\] — the west side, behind Collapsed pillar \(three-quarters cover\), hidden/);
    assert.match(W.attack('__player__', gob, 1).refused, /action is already used/);
    // the goblin sees no one and searches: Perception (Passive 9 → −1) 19 − 1 = 18 < 20
    cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.id === gob); cb.zones.turn = { id: gob, moved: 0, fled: false, attacked: false, acted: false };
    h.seedRandom([0.9, 0.5]);
    assert.deepEqual(plain(W.autoTurn(gob).searched.found), []);
    assert.match(log(W), /Goblin Warrior searches: Perception 18 — finds no one\./);
    // attacking ends hiding (after the roll, which had advantage)
    playerTurn(W);
    h.seedRandom([0.1, 0.9, 0.5]);
    assert.equal(W.attack('__player__', gob, 1).roll, 19 + 4, 'advantage while unseen');
    assert.equal(W.zoneView().hidden.length, 0);
    assert.ok(!W.conditionsOf('__player__').some(c => c.name === 'Invisible'));
    // no hiding in the open, or with the goblin in your zone
    playerTurn(W); cb = W.getCombat(); cb.zones.pos[gob] = 'w';
    assert.match(W.hide().reason, /Goblin Warrior is right there/);
    cb.zones.cover = {}; playerTurn(W);
    assert.match(W.hide().reason, /three-quarters cover or darkness/);
    assert.ok(pillar.id);
});

test('zones: a small room is one zone, ranged monsters keep their distance, the doorway limit, fast movers', async (t) => {
    const { h, W, closet } = await hall(t);
    W.go('Hall'); W.go('Closet');
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior', count: 2 }] });
    const [g1, g2] = W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.id);
    let v = W.zoneView();
    assert.equal(v.kind, 'small');
    assert.deepEqual([v.pos.__player__, v.pos[g1]], ['inner', 'inner'], 'a small room: everyone in reach');
    playerTurn(W);
    h.seedRandom([0.7, 0.5, 0.5]);
    assert.ok(!W.attack('__player__', g1, 0).refused, 'melee right away');
    // two goblins outside the doorway: only one arrow per round goes through
    let cb = W.getCombat(); cb.zones.pos[g1] = 'outer'; cb.zones.pos[g2] = 'outer';
    h.seedRandom([0.5]);
    cb.turnIndex = cb.order.findIndex(o => o.id === g1); cb.zones.turn = { id: g1, moved: 0, fled: false, attacked: false, acted: false };
    assert.ok(!W.attack(g1, '__player__', 1).refused);
    cb.turnIndex = cb.order.findIndex(o => o.id === g2); cb.zones.turn = { id: g2, moved: 0, fled: false, attacked: false, acted: false };
    assert.match(W.attack(g2, '__player__', 1).refused, /one ranged attack per round can go through a doorway/);
    // an archer steps out of melee (one zone, no opportunity attack) and shoots
    const R = W.combatantStats(g1); R.attacks = [R.attacks[1]];   // shortbow only
    cb.zones.pos[g1] = 'inner'; cb.round++; cb.turnIndex = cb.order.findIndex(o => o.id === g1); cb.zones.turn = { id: g1, moved: 0, fled: false, attacked: false, acted: false };
    h.seedRandom([0.5]);
    W.autoTurn(g1);
    assert.equal(W.zoneView().pos[g1], 'outer');
    assert.match(log(W), /Goblin Warrior 1 moves to just outside\.\n(Hit|Miss): Goblin Warrior 1 → Kara with Shortbow/);
    // a fast creature (60 ft) moves two zones
    cb.zones.pos.__player__ = 'out'; W.combatantStats(g2).speed = 60;
    cb.turnIndex = cb.order.findIndex(o => o.id === g2); cb.zones.turn = { id: g2, moved: 0, fled: false, attacked: false, acted: false };
    cb.zones.pos[g2] = 'inner';
    assert.ok(W.zoneMove(g2, 'out').ok, 'inner → outer → out in one move');
    assert.ok(closet.id);
});

test('zones: monsters dash to close in; a fight saved without zones keeps the old rules; zones survive a save', async (t) => {
    const { h, W } = await hall(t);
    W.go('Hall');
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 1 }], enemyStart: 'outside' });
    const wolf = W.getCombat().order.find(o => o.kind === 'monster').id;
    let cb = W.getCombat();
    assert.equal(cb.zones.pos[wolf], 'outer');
    cb.zones.pos.__player__ = 'n';   // no door north: outer → west/east side → north = 2 zones
    cb.turnIndex = cb.order.findIndex(o => o.id === wolf); cb.zones.turn = { id: wolf, moved: 0, fled: false, attacked: false, acted: false };
    W.combatantStats(wolf).speed = 40;
    W.autoTurn(wolf);
    assert.equal(W.zoneView().pos[wolf], 'n', 'a melee monster too far for one move dashes');
    assert.match(log(W), /Wolf dashes to the north side\./);
    assert.doesNotMatch(log(W), /Hit: Wolf|Miss: Wolf/, 'no attack after a dash');

    // saved and loaded (JSON): the zone state is plain data
    W.runtime.combat = JSON.parse(JSON.stringify(W.runtime.combat));
    assert.equal(W.zoneView().pos[wolf], 'n');
    // a fight saved before zones existed: no `zones` → melee from anywhere, as before
    delete W.runtime.combat.zones;
    assert.equal(W.zoneView(), null);
    cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.isPlayer);
    h.seedRandom([0.7, 0.5, 0.5]);
    assert.ok(!W.attack('__player__', wolf, 0).refused);
    assert.doesNotMatch(W.combatText(), /Battlefield/);
    const mark = W.getCombat().log.length;
    W.autoTurn(wolf);
    assert.doesNotMatch(W.getCombat().log.slice(mark).join('\n'), /moves to|dashes/);
    // zones switched off for one fight
    W.endEncounter();
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 1 }], zones: false });
    assert.equal(W.getCombat().zones, undefined);
});

test('Combat window: the zone board, click to move, attack reasons, cover and hide buttons, where enemies start', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); const w = h.window; const doc = w.document;
    await W.newWorld('Crypt world');
    const crypt = W.addEntity('location', { name: 'Old Crypt' }); W.setLocationKind(crypt.id, 'dungeon');
    const ent = W.addRoom(crypt.id, { name: 'Entrance' });
    const hallR = W.addRoom(crypt.id, { name: 'Hall', near: ent.id, dir: 'e', w: 5, h: 3 });
    W.addFeature(hallR.id, { name: 'Collapsed pillar', kind: 'furniture', zone: 'c' });
    W.setPlayerCombat({ name: 'Kara', stats: { abilities: { str: 16, dex: 14 }, ac: 16, hpMax: 60, attacks: [{ name: 'Longsword', toHit: 5, damage: '1d8+3' }] } });
    W.enable(); W.moveTo(ent.id); W.go('Hall');
    w.KLITE_RPMod_Shell.open('combat');
    const win = () => doc.querySelector('[data-window="combat"]');
    for (let i = 0; i < 100 && !win(); i++) await sleep(20);
    const $ = (s) => win().querySelector(s);
    $('[data-cb="search"]').value = 'goblin warrior'; $('[data-cb="search"]').dispatchEvent(new w.Event('input'));
    $('[data-cb="add-goblin-warrior"]').click(); await sleep(10);
    const start = $('[data-cb="enemy-start"]');
    assert.ok(start, 'where the enemies start');
    start.value = 'auto'; start.dispatchEvent(new w.Event('change'));
    h.seedRandom([0.9, 0.1, 0.5]);   // the player wins initiative
    $('[data-cb="start"]').click(); await sleep(10);
    const gob = W.getCombat().order.find(o => o.kind === 'monster').id;
    const board = $('svg.rpm-zone-board');
    assert.equal(board.getAttribute('data-layout'), 'large');
    assert.ok(board.querySelector(`[data-token="${gob}"]`) && board.querySelector('[data-token="__player__"]'));
    assert.ok(board.querySelector('[data-door-dir="w"]'), 'the door you came in by');
    assert.ok(board.querySelector('[data-feature]'), 'the pillar');
    assert.match($('[data-cb="zone-status"]').textContent, /At the west side · movement left: 1 zone · action: free/);
    assert.match($('[data-cb="attack-why"]').textContent, /too far away for a melee attack/);
    assert.ok($('[data-cb="attack"]').disabled);
    assert.match($(`[data-cb="zone-${gob}"]`).textContent, /east/);
    // reachable zones are highlighted; click the centre
    const reach = [...board.querySelectorAll('.rpm-zone-reach')].map(g => g.getAttribute('data-zone')).sort();
    assert.deepEqual(reach, ['c', 'n', 'outer', 's']);
    board.querySelector('[data-zone="c"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sleep(10);
    assert.equal(W.zoneView().pos.__player__, 'c');
    assert.match($('[data-cb="zone-status"]').textContent, /movement left: 0 zones/);
    $('[data-cb="take-cover"]').click(); await sleep(10);
    assert.ok(W.zoneView().cover.__player__);
    assert.match($('[data-cb="zone-__player__"]').textContent, /centre · cover/);
    h.seedRandom([0.9, 0.5]);
    $('[data-cb="hide"]').click(); await sleep(10);
    assert.ok(W.zoneView().hidden.includes('__player__'));
    assert.ok($('[data-cb="hide"]').disabled, 'action used');
    // the GM tool places a creature without rules
    const tools = $('.rpm-cb-tools'); tools.open = true;
    $('[data-cb="who"]').value = gob; $('[data-cb="who"]').dispatchEvent(new w.Event('change'));
    $('[data-cb="set-zone"]').value = 'c'; $('[data-cb="set-zone"]').dispatchEvent(new w.Event('change'));
    $('[data-cb="put-zone"]').click(); await sleep(10);
    assert.equal(W.zoneView().pos[gob], 'c');
    assert.ok($('[data-cb="zone-help"]'), 'link to the Guide');
    // a saved encounter keeps where its enemies start
    W.endEncounter();
    const e = W.saveEncounter({ name: 'Ambush', monsters: [{ key: 'wolf', count: 1 }], start: 'outside' });
    assert.equal(e.start, 'outside');
    W.startSavedEncounter('Ambush');
    assert.equal(W.zoneView().pos[W.getCombat().order.find(o => o.kind === 'monster').id], 'outer');
    assert.equal(W.saveEncounter({ name: 'Plain', monsters: [{ key: 'wolf', count: 1 }], start: 'auto' }).start, undefined, 'the default is not stored');
});
