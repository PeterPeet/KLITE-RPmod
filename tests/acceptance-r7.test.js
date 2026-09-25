'use strict';
// R7 acceptance (docs/ROADMAP.md, docs/design/R7-world-map.md "Steps"): build a small dungeon and
// a town, generate a second dungeon, let the AI add a room with a locked door, explore room by
// room with fog on the mini-map, find a secret door by searching, and fight an encounter using
// zones and cover — one story, the whole bundle with its UI, AI replies through
// handle_incoming_text (a real backend is the separate play test, known issue 5).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

const logText = (w) => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
async function until(fn, ms = 3000) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(20); } throw new Error('condition not met in time'); }

test('R7 acceptance: dungeon + town, generated dungeon, AI room with a locked door, fog, secret door, zone fight with cover', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };   // Esolite appends the reply
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); const w = h.window; const doc = w.document;
    await W.newWorld('Acceptance');
    const road = W.addEntity('location', { name: 'Forest Road' });
    W.setPlayerCombat({ name: 'Kara', stats: { abilities: { str: 16, dex: 14, wis: 14, int: 10 }, ac: 15, hpMax: 40, speed: 30,
        attacks: [{ name: 'Longsword', toHit: 5, damage: '1d8+3' }, { name: 'Longbow', toHit: 4, damage: '1d8+2' }] } });

    // 1. a small dungeon, built by hand: Entrance -(closed door, e)- Pillar Hall (large) -(secret door, n)- Vault
    const mine = W.addEntity('location', { name: 'Old Mine' }); W.setLocationKind(mine.id, 'dungeon');
    W.addExit(mine.id, road.id, { type: 'open' });
    const ent = W.addRoom(mine.id, { name: 'Entrance' });
    W.addExit(ent.id, road.id, { type: 'open', dir: 'w' });
    const hall = W.addRoom(mine.id, { name: 'Pillar Hall', near: ent.id, dir: 'e', w: 5, h: 4 });
    const vault = W.addRoom(mine.id, { name: 'Vault', near: hall.id, dir: 'n', connect: false, w: 3, h: 3, secret: true });
    W.addExit(hall.id, vault.id, { type: 'secret', dir: 'n', secretDC: 14 });
    W.addFeature(hall.id, { name: 'Cracked pillar', kind: 'furniture', zone: 'c' });
    W.saveEncounter({ name: 'Mine guards', monsters: [{ key: 'goblin-warrior', count: 2 }], locationId: hall.id });
    // 2. a town with places
    const town = W.addEntity('location', { name: 'Millford' }); W.setLocationKind(town.id, 'town');
    W.addExit(town.id, road.id, { type: 'open' });
    const sq = W.addRoom(town.id, { name: 'Town Square' });
    W.addRoom(town.id, { name: 'Market', near: sq.id, dir: 'e' }); W.addRoom(town.id, { name: 'Inn', near: sq.id, dir: 's' });
    // 3. a second dungeon from the generator
    const tomb = W.addEntity('location', { name: 'Sunken Tomb' }); W.setLocationKind(tomb.id, 'dungeon');
    W.addExit(tomb.id, road.id, { type: 'open' });
    const gen = W.generateMap(tomb.id, { size: 'small', theme: 'crypt', seed: 'ACCEPT', encounters: 'few', level: 1, partySize: 1 });
    assert.ok(gen.rooms >= 5 && gen.wayOut === 'Forest Road');
    await W.saveActiveWorld();
    assert.equal(W.hasUnsavedChanges(), false);

    // the town is walkable, its places are known by name
    W.enable(); W.moveTo(road.id);
    assert.ok(W.go('Millford').ok); assert.equal(W.runtime.playerLocationId, sq.id);
    assert.ok(W.go('Market').ok);
    // the generated dungeon can be entered and left
    W.moveTo(road.id);
    assert.ok(W.go('Sunken Tomb').ok); assert.ok(W.go('west').ok); assert.equal(W.runtime.playerLocationId, road.id);

    // 4. into the mine: fog on the mini-map, then room by room by clicking
    assert.ok(W.go('Old Mine').ok); assert.equal(W.runtime.playerLocationId, ent.id);
    w.localStorage.setItem('KLITE.map.quickTravel', '1');   // R8: the map moves you only with Quick travel
    w.KLITE_RPMod_Shell.open('minimap');
    const map = () => doc.querySelector('[data-section="minimap"]');
    const room = (id) => map() && map().querySelector(`g[data-room="${id}"]`);
    await until(() => room(ent.id));
    assert.equal(room(ent.id).getAttribute('data-explored'), 'here');
    assert.equal(room(hall.id).getAttribute('data-explored'), 'known', 'behind a closed door: fog');
    assert.equal(room(vault.id), null, 'the secret room is not on the player map');
    room(hall.id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await until(() => W.runtime.playerLocationId === hall.id);
    await until(() => room(hall.id) && room(hall.id).getAttribute('data-explored') === 'here');
    assert.match(logText(w), /Quick travel: the player skipped the journey and is now at Pillar Hall \(a door was opened on the way\)/);

    // 5. the AI adds a room with a locked door (tags parsed when the reply arrives)
    w.handle_incoming_text('A draught comes from the south. <room>Ore Store, south: carts of rusty ore</room> <door>south = locked, iron</door>');
    const store = W.roomsOf(mine.id).map(id => W.entityById(id)).find(r => r.name === 'Ore Store');
    assert.ok(store && store.origin === 'ai');
    const toStore = W.exitsOf(hall.id).find(e => e.to === store.id);
    assert.equal(W.doorState(toStore.id), 'locked');
    assert.equal(W.go('Ore Store', { source: 'ui' }).ok, false, 'the locked door holds');
    assert.match(logText(w), /Move to Ore Store refused: the iron door is locked\./);
    assert.match(W.preview(), /- south: Ore Store \(locked iron door\)/);

    // 6. search: the secret door to the vault (Perception +2, a 20 on the die)
    assert.doesNotMatch(W.preview(), /Vault/, 'secret until found');
    h.seedRandom([0.99]);
    const found = W.search({ source: 'ui' });
    assert.ok(found.found.some(f => f.kind === 'secret'));
    assert.match(W.preview(), /- north: unexplored room \(closed secret door\)/);
    await until(() => room(vault.id));

    // 7. the guards: the AI starts the saved encounter; a zone fight with cover
    h.seedRandom([0.99, 0.5, 0.1, 0.5, 0.1, 0.5]);   // Kara wins initiative
    w.handle_incoming_text('Two goblins burst in! <encounter>Mine guards</encounter>');
    const cb = W.getCombat();
    assert.ok(cb && cb.active && cb.zones, 'a zone fight');
    const v = W.zoneView();
    assert.equal(v.kind, 'large');
    const gobs = cb.order.filter(o => o.kind === 'monster').map(o => o.id);
    assert.equal(v.pos.__player__, 'w', 'the party stands where it came in');
    assert.ok(gobs.every(id => v.pos[id] === 'e'), 'the goblins across the hall');
    assert.match(W.preview(), /Battlefield — Old Mine \(Pillar Hall\): large space[\s\S]*- the centre: Cracked pillar \(three-quarters cover\)/);
    w.KLITE_RPMod_Shell.open('combat');
    const cw = () => doc.querySelector('[data-window="combat"]');
    await until(() => cw() && cw().querySelector('svg.rpm-zone-board'));
    assert.equal(cb.order[cb.turnIndex].id, '__player__');
    // move to the centre and take cover behind the pillar
    cw().querySelector('svg.rpm-zone-board [data-zone="c"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await until(() => W.zoneView().pos.__player__ === 'c');
    await until(() => cw().querySelector('[data-cb="take-cover"]'));
    cw().querySelector('[data-cb="take-cover"]').click();
    await until(() => W.zoneView().cover.__player__);
    // a goblin shoots from its side: AC 15 + 5
    const r = W.attack(gobs[0], '__player__', 1);
    assert.equal(r.ac, 20);
    assert.match(logText(w), /three-quarters cover \+5 AC/);
    // finish them: the fight ends in victory
    W.damage(gobs[0], 99); W.damage(gobs[1], 99);
    assert.equal(W.getCombat().outcome, 'victory');
    assert.match(W.preview(), /OUTCOME: Victory/);
    W.endEncounter();
    assert.equal(W.getCombat(), null);
});
