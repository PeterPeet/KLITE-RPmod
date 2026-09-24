'use strict';
// R7 step 4: the seeded dungeon/town generator (src/game/map-gen.js), the engine applying a plan
// (generateMap: rooms, exits, features, encounters, way out, replace), the AI naming a placeholder
// room (<room>Name, here: …</room>), prepared encounters in the room context, the editor's
// Generate panel.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, click, findButton, selectNode, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const G = requireSrc('src/game/map-gen.js');
const MR = requireSrc('src/game/map-rules.js');
const CR = requireSrc('src/game/combat-rules.js');
const plain = (v) => JSON.parse(JSON.stringify(v));
const logText = (w) => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');

// Every room reachable from the entrance over the plan's exits (secret ones included).
function allReachable(plan) { return G.reachable(plan.rooms.find(r => r.entrance).key, plan.exits).size === plan.rooms.length; }
function checkLayout(plan) {
    const byKey = Object.fromEntries(plan.rooms.map(r => [r.key, r]));
    for (let i = 0; i < plan.rooms.length; i++) for (let j = i + 1; j < plan.rooms.length; j++)
        assert.ok(!MR.overlaps(plan.rooms[i].rect, plan.rooms[j].rect, 1), `rooms ${i} and ${j} keep a gap`);
    for (const e of plan.exits) {
        const a = byKey[e.from].rect, b = byKey[e.to].rect;
        assert.equal(MR.dirBetween(a, b), e.dir, `exit ${e.from}→${e.to} points the right way`);
        // straight connections: same centre on the shared axis
        if (e.dir === 'n' || e.dir === 's') assert.equal(a.x + a.w / 2, b.x + b.w / 2); else assert.equal(a.y + a.h / 2, b.y + b.h / 2);
    }
}

test('generator: seeded and reproducible, connected, laid out on the grid, one secret room', () => {
    for (const theme of Object.keys(G.THEMES)) for (const size of Object.keys(G.SIZES)) for (const seed of ['A', 'KR7Q2Z', 'seed-3']) {
        const p = G.generateDungeon({ theme, size, seed });
        assert.deepEqual(plain(p), plain(G.generateDungeon({ theme, size, seed })), 'same seed → same plan');
        assert.equal(p.rooms.length, G.SIZES[size] + 1, `${theme}/${size}/${seed}: rooms + a secret one`);
        assert.ok(allReachable(p), 'every room reachable');
        checkLayout(p);
        assert.equal(p.rooms.filter(r => r.secret).length, 1);
        assert.equal(p.exits.filter(e => e.type === 'secret').length, 1);
        assert.ok(p.exits.find(e => e.type === 'secret').secretDC >= 13);
        assert.equal(p.rooms[0].name, 'Entrance'); assert.ok(p.rooms.slice(1).every(r => /^Room \d+$/.test(r.name)), 'placeholder names');
        assert.ok(p.rooms.some(r => r.features.some(f => f.kind === 'trap' && f.trapDC >= 11)), 'at least one trap');
        assert.ok(!p.rooms[0].features.some(f => f.kind === 'trap'), 'no trap at the entrance');
        // the way out west of the entrance stays free
        assert.ok(!p.rooms.some(r => r.rect.x < 0 && r.rect.y === 0 && r.rect.x > -7));
        if (theme === 'cave') assert.ok(!p.exits.some(e => e.type === 'door'), 'caves have no doors');
    }
    assert.notDeepEqual(plain(G.generateDungeon({ seed: 'A' })), plain(G.generateDungeon({ seed: 'B' })), 'another seed, another map');
    const s = G.randomSeed(() => 0.5); assert.match(s, /^[A-Z2-9]{6}$/);
});

test('generator: the locked door\'s key lies on the near side; loops exist in bigger maps', () => {
    let locks = 0, loops = 0;
    for (let i = 0; i < 30; i++) {
        const p = G.generateDungeon({ theme: 'crypt', size: 'large', seed: 'L' + i });
        const nonSecret = p.exits.filter(e => e.type !== 'secret');
        if (nonSecret.length > p.rooms.length - 2) loops++;
        const lock = p.exits.find(e => e.door && e.door.state === 'locked'); if (!lock) continue;
        locks++;
        assert.ok(lock.door.lockDC >= 12 && lock.door.keyItem === 'Rusty Key');
        const entrance = p.rooms.find(r => r.entrance).key;
        const near = G.reachable(entrance, nonSecret, nonSecret.indexOf(lock));
        const keyRoom = p.rooms.find(r => r.features.some(f => (f.contains || []).includes('Rusty Key')));
        assert.ok(keyRoom && near.has(keyRoom.key), 'the key is reachable without passing the locked door');
        assert.ok(p.rooms.some(r => !near.has(r.key) && !r.secret), 'the lock shuts something off');
    }
    assert.ok(locks >= 20, `most large crypts get a locked door (${locks}/30)`);
    assert.ok(loops >= 20, `most large maps get loops (${loops}/30)`);
});

test('generator: encounters from the theme within the XP budget; towns from the ticked places', () => {
    for (const theme of Object.keys(G.THEMES)) assert.ok(G.themeMonsters(theme).length >= 8, `${theme} monsters resolve in the SRD data`);
    const p = G.generateDungeon({ theme: 'crypt', size: 'large', seed: 'E1', encounters: 'some', level: 3, partySize: 4 });
    const b = CR.budget(3, 4);
    const encs = p.rooms.filter(r => r.encounter);
    assert.ok(encs.length >= 5, 'some = about half the rooms');
    assert.equal(encs.filter(r => r.encounter.difficulty === 'moderate').length, 1, 'one tougher fight in the deepest room');
    assert.ok(!p.rooms.find(r => r.entrance).encounter && !p.rooms.find(r => r.secret).encounter);
    const undead = G.themeMonsters('crypt').map(m => m.key);
    for (const r of encs) {
        assert.ok(CR.encounterXp(r.encounter.monsters) <= b[r.encounter.difficulty], 'within the budget');
        assert.ok(r.encounter.monsters.every(m => undead.includes(m.key)));
    }
    assert.equal(G.generateDungeon({ seed: 'E1', encounters: 'none' }).rooms.filter(r => r.encounter).length, 0);

    const places = ['market', 'temple', 'inn', 'smithy', 'guild', 'stables', 'docks', 'library', 'bathhouse', 'graveyard'];
    const t = G.generateTown({ seed: 'T', places });
    assert.deepEqual(plain(t), plain(G.generateTown({ seed: 'T', places })));
    assert.equal(t.rooms.length, places.length + 1);
    assert.equal(t.rooms[0].name, 'Town Square');
    assert.deepEqual(t.rooms.slice(1).map(r => r.place).sort(), places.slice().sort());
    assert.ok(t.exits.every(e => e.type === 'open')); assert.ok(allReachable(t)); checkLayout(t);
    assert.ok(t.rooms.every(r => r.light === 'bright'));
    assert.ok(t.rooms.find(r => r.name === 'Inn').features.some(f => f.name === 'Hearth' && f.lit));
    assert.deepEqual(plain(G.generateTown({ seed: 'T' }).rooms.slice(1).map(r => r.place).sort()), G.DEFAULT_TOWN.slice().sort());
});

async function host(t, opts = {}) {
    const h = createHost(); t.after(h.close);
    if (opts.reply) h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    if (opts.ui) h.window.KLITE_RPMod = { characters: [] };
    h.load(...(opts.ui ? ['shell', 'gamelog', 'worlds', 'worldsUI'] : ['gamelog', 'worlds']));
    await h.ready({ ui: !!opts.ui });
    await h.api().loadExample();
    return h;
}
// A dungeon node linked to Forest Road in the world graph (the way out).
function newDungeon(W, name = 'Sunken Tomb') {
    const d = W.addEntity('location', { name }); W.setLocationKind(d.id, 'dungeon');
    W.addExit(d.id, 'loc_forest', { type: 'open' });
    return d;
}

test('engine: generateMap builds rooms, doors, features, encounters and a way out; the player can enter and leave', async (t) => {
    const h = await host(t); const W = h.api();
    await W.saveActiveWorld();
    const d = newDungeon(W);
    const r = W.generateMap(d.id, { size: 'small', theme: 'crypt', seed: 'KR7Q2Z', encounters: 'few', level: 2, partySize: 2 });
    const plan = G.generateDungeon({ size: 'small', theme: 'crypt', seed: 'KR7Q2Z', encounters: 'few', level: 2, partySize: 2 });
    assert.equal(r.rooms, plan.rooms.length); assert.equal(r.seed, 'KR7Q2Z'); assert.equal(r.wayOut, 'Forest Road');
    assert.ok(W.hasUnsavedChanges(), 'a generated map is a world edit');
    const rooms = W.roomsOf(d.id).map(id => W.entityById(id));
    assert.deepEqual(plain(rooms.map(x => [x.name, x.map])), plain(plan.rooms.map(x => [x.name, x.rect])), 'rooms as planned');
    assert.ok(rooms.every(x => x.generated && x.parentId === d.id));
    assert.equal(rooms.filter(x => x.secret).length, 1);
    const feats = rooms.flatMap(x => W.featuresOf(x.id));
    assert.equal(feats.length, plan.rooms.reduce((n, x) => n + x.features.length, 0));
    assert.ok(feats.some(f => f.kind === 'trap' && f.trapDC));
    const encs = W.listEncounters().filter(e => rooms.some(x => x.id === e.locationId));
    assert.equal(encs.length, r.encounters); assert.ok(encs.length >= 1);
    assert.match(encs[0].name, /^Sunken Tomb: .+ \(Room \d+\)$/);
    assert.deepEqual(plain(W.entityById(d.id).mapGen), { seed: 'KR7Q2Z', size: 'small', theme: 'crypt', encounters: 'few' });

    // play: from Forest Road into the entrance, and back out the way out
    W.enable(); W.moveTo('Forest Road');
    assert.ok(W.go('Sunken Tomb').ok);
    const ent = rooms.find(x => x.name === 'Entrance');
    assert.equal(W.runtime.playerLocationId, ent.id);
    assert.match(W.preview(), /- west: Forest Road \(open, leads out\)/);
    assert.ok(W.go('west').ok, 'the way out works'); assert.equal(W.runtime.playerLocationId, 'loc_forest');
    // the secret room stays out of the AI context
    W.moveTo(ent.id);
    assert.doesNotMatch(W.preview(), new RegExp(rooms.find(x => x.secret).name + '\\b'));
});

test('engine: replace needs the flag and never happens with the player inside; a level gets stairs up; towns', async (t) => {
    const h = await host(t); const W = h.api();
    const d = newDungeon(W);
    W.generateMap(d.id, { seed: 'ONE', encounters: 'some' });
    const first = W.roomsOf(d.id);
    assert.throws(() => W.generateMap(d.id, { seed: 'TWO' }), /already has rooms/);
    W.moveTo(first[0]);
    assert.throws(() => W.generateMap(d.id, { seed: 'TWO', replace: true }), /player is inside/);
    W.moveTo('Forest Road');
    const nEnc = W.listEncounters().length;
    W.generateMap(d.id, { seed: 'TWO', size: 'small', encounters: 'none', replace: true });
    const second = W.roomsOf(d.id);
    assert.ok(second.every(id => !first.includes(id)), 'old rooms are gone');
    assert.ok(first.every(id => !W.entityById(id)));
    assert.ok(W.activeWorld().objects.every(o => !first.includes(o.locationId)), 'with their features');
    assert.ok(W.listEncounters().length < nEnc && W.listEncounters().every(e => !first.includes(e.locationId)), 'and their encounters');
    // same seed in the engine → same layout
    const d2 = newDungeon(W, 'Twin Tomb');
    W.generateMap(d2.id, { seed: 'TWO', size: 'small', encounters: 'none' });
    assert.deepEqual(plain(W.roomsOf(d2.id).map(id => W.entityById(id).map)), plain(second.map(id => W.entityById(id).map)));
    // a dungeon level inside a room: stairs up to the neighbour room
    const [a, b] = second;
    W.setLocationKind(b, 'dungeon');
    const lr = W.generateMap(b, { seed: 'LVL', size: 'small' });
    const lvlEntrance = W.roomsOf(b).map(id => W.entityById(id)).find(x => x.name === 'Entrance');
    const up = W.exitsOf(lvlEntrance.id).find(e => !W.roomsOf(b).includes(e.to));
    assert.ok(up && up.type === 'stairs' && up.dir === 'up', 'stairs up out of the level'); assert.ok(lr.wayOut);
    // no way out when the map is not connected
    const lone = W.addEntity('location', { name: 'Lonely Barrow' }); W.setLocationKind(lone.id, 'dungeon');
    assert.equal(W.generateMap(lone.id, { seed: 'X' }).wayOut, null);
    // town
    const town = W.addEntity('location', { name: 'Brightford' }); W.setLocationKind(town.id, 'town'); W.addExit(town.id, 'loc_forest', { type: 'open' });
    const tr = W.generateMap(town.id, { seed: 'T', places: ['market', 'inn', 'temple'] });
    assert.equal(tr.rooms, 4); assert.equal(tr.wayOut, 'Forest Road');
    const names = W.roomsOf(town.id).map(id => W.entityById(id).name).sort();
    assert.deepEqual(plain(names), ['Inn', 'Market', 'Temple', 'Town Square']);
    assert.deepEqual(plain(W.entityById(town.id).mapGen), { seed: 'T', places: ['market', 'inn', 'temple'] });
    W.moveTo('Forest Road'); assert.ok(W.go('Brightford').ok);
    assert.equal(W.entityById(W.runtime.playerLocationId).name, 'Town Square');
});

test('AI: names a placeholder room once (<room>Name, here: …</room>); encounters waiting here', async (t) => {
    const h = await host(t, { reply: true }); const w = h.window; const W = h.api();
    const d = newDungeon(W); W.enable();
    W.generateMap(d.id, { seed: 'NAME1', size: 'small', encounters: 'some', level: 1, partySize: 1 });
    const enc = W.listEncounters().find(e => W.roomsOf(d.id).includes(e.locationId));
    const room = W.entityById(enc.locationId);
    assert.match(room.name, /^Room \d+$/);
    W.moveTo(room.id);
    let s = W.preview();
    assert.match(s, /This room has no proper name yet \("Room \d+"\)/);
    assert.match(s, new RegExp(`\\[Waiting here\\]\\n- ${enc.name.replace(/[()]/g, '\\$&')}\\n[^\\n]*<encounter>exact name<\\/encounter>`));
    const old = room.name;
    w.handle_incoming_text('Skulls line the walls. <room>Skull Gallery, here: skulls in niches from floor to ceiling</room>');
    assert.equal(W.entityById(room.id).name, 'Skull Gallery');
    assert.equal(W.entityById(room.id).description, 'skulls in niches from floor to ceiling');
    assert.match(logText(w), new RegExp(`${old} is now called Skull Gallery\\.`));
    assert.doesNotMatch(W.preview(), /no proper name yet/);
    const renamed = W.listEncounters().find(e => e.id === enc.id);
    assert.match(renamed.name, /\(Skull Gallery\)$/, 'the generated encounter follows the new name');
    enc.name = renamed.name;
    w.handle_incoming_text('<room>Bone Hall, here: bones</room>');
    assert.match(logText(w), /Room Bone Hall refused: this room is already called Skull Gallery\./);
    assert.equal(W.entityById(room.id).name, 'Skull Gallery');
    // starting it removes it from "waiting here"
    w.handle_incoming_text(`They rise! <encounter>${enc.name}</encounter>`);
    assert.ok(W.getCombat() && W.getCombat().active);
    W.endEncounter();
    assert.doesNotMatch(W.preview(), /\[Waiting here\]/);
    assert.ok(W.runtime.startedEncounters.includes(enc.id));
});

test('dungeon editor: Generate panel (size, theme, encounters, seed), replace asks, town place checkboxes', async (t) => {
    const h = await host(t, { ui: true }); const w = h.window; const doc = w.document; const W = h.api();
    const d = newDungeon(W);
    h.ui().openEditor(); selectNode(h, d.id);
    click(findButton(doc.getElementById('wm-editor'), /Open dungeon editor/), w);
    const map = () => doc.getElementById('rpm-map-editor');
    const insp = () => map().querySelector('.rpm-map-insp');
    const change = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change')); };
    click(map().querySelector('[data-map="generate"]'), w);
    assert.equal(insp().getAttribute('data-panel'), 'generate');
    change(insp().querySelector('[data-gen="size"]'), 'small');
    change(insp().querySelector('[data-gen="theme"]'), 'cave');
    change(insp().querySelector('[data-gen="encounters"]'), 'none');
    change(insp().querySelector('[data-gen="seed"]'), 'CAVE01');
    click(insp().querySelector('[data-gen="go"]'), w);
    await sleep(60);
    assert.equal(W.roomsOf(d.id).length, 6);
    assert.equal(map().querySelectorAll('g.rpm-map-room').length, 6, 'drawn on the board');
    assert.deepEqual(plain(W.entityById(d.id).mapGen), { seed: 'CAVE01', size: 'small', theme: 'cave', encounters: 'none' });
    // replace asks first
    click(insp().querySelector('[data-gen="open"]'), w);
    assert.match(insp().querySelector('[data-gen="go"]').textContent, /Replace/);
    w.confirm = () => false;
    click(insp().querySelector('[data-gen="go"]'), w);
    assert.deepEqual(plain(W.entityById(d.id).mapGen).seed, 'CAVE01', 'cancelled: nothing replaced');
    w.confirm = () => true;
    click(insp().querySelector('[data-gen="reseed"]'), w);
    const seed = insp().querySelector('[data-gen="seed"]').value;
    assert.notEqual(seed, 'CAVE01');
    click(insp().querySelector('[data-gen="go"]'), w); await sleep(60);
    assert.equal(W.entityById(d.id).mapGen.seed, seed);
    // unconnected dungeon: warning about the missing way out
    const lone = W.addEntity('location', { name: 'Lonely Barrow' }); W.setLocationKind(lone.id, 'dungeon');
    W.generateMap(lone.id, { seed: 'X' });
    h.ui().openEditor(); selectNode(h, lone.id);
    click(findButton(doc.getElementById('wm-editor'), /Open dungeon editor/), w); await sleep(40);
    assert.ok(insp().querySelector('[data-noway]'), 'warns: no way out');
    // a town: place checkboxes
    const town = W.addEntity('location', { name: 'Brightford' }); W.setLocationKind(town.id, 'town');
    h.ui().openEditor(); selectNode(h, town.id);
    click(findButton(doc.getElementById('wm-editor'), /Open town editor/), w); await sleep(40);
    click(map().querySelector('[data-map="generate"]'), w);
    const box = (k) => insp().querySelector(`[data-place="${k}"]`);
    assert.ok(box('market').checked && !box('docks').checked, 'default places ticked');
    box('docks').checked = true; box('docks').dispatchEvent(new w.Event('change'));
    box('smithy').checked = false; box('smithy').dispatchEvent(new w.Event('change'));
    click(insp().querySelector('[data-gen="go"]'), w); await sleep(60);
    const names = W.roomsOf(town.id).map(id => W.entityById(id).name);
    assert.ok(names.includes('Docks') && !names.includes('Smithy') && names.includes('Town Square'));
});
