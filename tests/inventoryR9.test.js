'use strict';
// R9 inventory: item size from SRD weight, bags with pounds and a grid, the paper doll slots, the
// Overweight bag (Str × 15 lb more, Speed at most 5 ft), organizing older sheets without losing
// anything, and the game adding, removing and splitting items (src/game/inventory-rules.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const R = requireSrc('src/game/inventory-rules.js');
const { SRD } = requireSrc('src/data/srd52.js');
const plain = (v) => JSON.parse(JSON.stringify(v));
const sheet = (inventory, extra) => Object.assign({ abilities: { str: 10 }, species: 'Human', coins: {}, inventory }, extra || {});
const tally = (inv) => { const t = {}; for (const i of inv) t[i.name] = (t[i.name] || 0) + (i.qty || 1); return t; };

test('SRD 5.2.1 weights: weapons, armor, the Shield, ammunition, gear', () => {
    assert.equal(SRD.weapons.Longsword.weight, 3);
    assert.equal(SRD.weapons.Dart.weight, 0.25);
    assert.equal(SRD.weapons.Pike.weight, 18);
    assert.equal(SRD.armor['Plate Armor'].weight, 65);
    assert.equal(SRD.shieldWeight, 6);
    assert.deepEqual(plain(SRD.ammunition.Bolts), { amount: 20, storage: 'Case', weight: 1.5, cost: '1 GP' });
    for (const w of Object.values(SRD.weapons)) assert.equal(typeof w.weight, 'number');
    for (const a of Object.values(SRD.armor)) assert.equal(typeof a.weight, 'number');
    assert.equal(R.parseWeight('1/2 lb.'), 0.5);
    assert.equal(R.parseWeight('58½ lb.'), 58.5);
    assert.equal(R.parseWeight('5 lb. (full)'), 5);
    assert.equal(R.parseWeight('—'), 0);
    assert.equal(R.parseWeight('Varies'), null);
    const w = (name) => R.unitWeight({ name }).w;
    assert.equal(w('+1 Longsword'), 3);
    assert.equal(w('Elven Chain Shirt'), 20);
    assert.equal(w('Arrow'), 1 / 20);
    assert.equal(w('Potion of Healing'), 0.5);
    assert.equal(w('Torches'), 1);
    assert.equal(w('Hooded Lantern'), 2);
    assert.equal(w('Waterskin'), 5);
    assert.equal(w('Bag of Holding'), 5);
    assert.deepEqual(R.unitWeight({ name: 'Goblin ear' }), { w: 1, guess: true }, 'unknown: 1 lb, a guess');
    assert.equal(R.unitWeight({ name: 'Goblin ear', weight: 0.1 }).w, 0.1, 'the player can set it');
});

test('kinds and footprints: weight brackets per kind, small things share a tile, rotation', () => {
    const k = (name) => R.itemKind({ name });
    assert.deepEqual(['Longsword', 'Chain Mail', 'Shield', 'Arrow', 'Potion of Healing', 'Backpack', 'Rope'].map(k), ['weapon', 'armor', 'shield', 'ammo', 'potion', 'bag', 'gear']);
    const fp = (name, qty, rot) => R.footprint({ name, qty: qty || 1, rot }).join('x');
    assert.equal(fp('Dagger'), '1x1');
    assert.equal(fp('Longsword'), '1x3');
    assert.equal(fp('Longsword', 1, true), '3x1');
    assert.equal(fp('Greatsword'), '2x3');
    assert.equal(fp('Pike'), '2x5');
    assert.equal(fp('Chain Shirt'), '3x3');
    assert.equal(fp('Bedroll'), '3x3');
    assert.equal(fp('Arrow', 20), '1x1', '20 arrows: one tile');
    assert.equal(fp('Arrow', 40), '2x1');
    assert.equal(fp('Potion of Healing', 2), '1x1');
    assert.equal(fp('Potion of Healing', 3), '2x1');
    assert.equal(fp('Rations', 5), '4x3', '10 lb of rations');
    assert.equal(fp('Backpack'), '3x2', 'a bag by its own size, not its contents');
});

test('slots: armor is worn, bags on the back and the belt, two-handed weapons need both hands', () => {
    const s = sheet([{ name: 'Greatsword', qty: 1 }, { name: 'Shield', qty: 1 }, { name: 'Leather Armor', qty: 1 }, { name: 'Backpack', qty: 1 }, { name: 'Pouch', qty: 1 }, { name: 'Rope', qty: 1 }]);
    R.ensureIds(s);
    const [gs, sh, la, bp, po, rope] = s.inventory;
    assert.equal(R.canPlace(s, la, { slot: 'armor' }), '');
    assert.match(R.canPlace(s, gs, { slot: 'armor' }), /only armor/);
    assert.match(R.canPlace(s, la, { slot: 'main' }), /armor slot/);
    assert.match(R.canPlace(s, rope, { slot: 'back' }), /only a bag/);
    assert.equal(R.canPlace(s, po, { slot: 'belt1' }), '');
    R.place(s, gs, { slot: 'main' });
    assert.equal(gs.inHand, true, 'hands and armor set inHand (combat)');
    assert.match(R.canPlace(s, sh, { slot: 'off' }), /Greatsword needs both hands/);
    R.place(s, gs, { bag: 'over', x: 0, y: 0 });
    assert.equal(gs.inHand, undefined);
    R.place(s, sh, { slot: 'off' });
    assert.match(R.canPlace(s, gs, { slot: 'main' }), /free the off hand/);
    R.place(s, bp, { slot: 'back' });
    assert.equal(bp.inHand, undefined, 'a worn bag is not held');
    assert.match(R.canPlace(s, la, { slot: 'back' }), /Back is taken/);
});

test('bags: pounds, grid, overlap, quiver, nesting, the Astral Plane', () => {
    const s = sheet([{ name: 'Backpack', qty: 1, at: { slot: 'back' } }, { name: 'Pouch', qty: 1 }, { name: 'Bedroll', qty: 1 },
        { name: 'Rope', qty: 1 }, { name: 'Quiver', qty: 1 }, { name: 'Arrow', qty: 20 }, { name: 'Dagger', qty: 1 },
        { name: 'Bag of Holding', qty: 1 }, { name: 'Handy Haversack', qty: 1 }], { abilities: { str: 14 } });
    R.ensureIds(s);
    const [bp, po, bed, rope, qv, arrows, dagger, boh, hh] = s.inventory;
    assert.equal(R.canPlace(s, bed, { bag: bp.id, x: 0, y: 0 }), '');
    R.place(s, bed, { bag: bp.id, x: 0, y: 0 });
    assert.match(R.canPlace(s, rope, { bag: bp.id, x: 2, y: 2 }), /Bedroll is in the way/);
    assert.match(R.canPlace(s, rope, { bag: bp.id, x: 4, y: 0 }), /does not fit/, '3x2 at x 4 sticks out');
    const put = (it, t) => { assert.equal(R.canPlace(s, it, t), '', it.name); R.place(s, it, t); };
    put(rope, { bag: bp.id, x: 4, y: 0, rot: true });                               // turned 2x3: 12 lb
    assert.equal(rope.rot, true);
    s.inventory.push({ name: 'Crowbar', qty: 1, id: 'cb' }, { name: 'Iron Spikes', qty: 1, id: 'sp' }, { name: 'Grappling Hook', qty: 1, id: 'gh' },
        { name: 'Lamp', qty: 1, id: 'la' }, { name: 'Light Hammer', qty: 1, id: 'lh' });
    const get = (id) => s.inventory.find(i => i.id === id);
    put(get('cb'), { bag: bp.id, x: 0, y: 3 });                                       // 5 lb: 17
    put(po, { bag: bp.id, x: 3, y: 3 });                                              // 1 lb: 18
    put(get('sp'), { bag: po.id, x: 0, y: 0 });                                       // 5 lb in the pouch: backpack 23
    assert.equal(R.totalWeight(s, po), 6);
    assert.equal(R.load(s, bp.id), 23);
    assert.match(R.canPlace(s, dagger, { bag: po.id, x: 1, y: 1 }), /Iron Spikes is in the way/, '5 lb of spikes fill the pouch');
    put(get('gh'), { bag: bp.id, x: 4, y: 3 });                                       // 4 lb: 27
    put(get('la'), { bag: bp.id, x: 3, y: 0 });                                       // 1 lb: 28
    put(get('lh'), { bag: bp.id, x: 3, y: 1 });                                       // 2 lb (1x2): 30 of 30
    assert.equal(R.load(s, bp.id), 30);
    assert.match(R.canPlace(s, dagger, { bag: bp.id, x: 3, y: 4 }), /too heavy for the backpack \(30 of 30 lb\)/);
    assert.match(R.canPlace(s, bp, { bag: po.id, x: 1, y: 0 }), /inside itself/);
    assert.match(R.canPlace(s, dagger, { bag: qv.id, x: 0, y: 0 }), /only holds arrows/);
    assert.equal(R.canPlace(s, arrows, { bag: qv.id, x: 0, y: 0 }), '');
    R.place(s, boh, { bag: 'over', x: 0, y: 0 });
    assert.match(R.canPlace(s, hh, { bag: boh.id, x: 0, y: 0 }), /Astral Plane/);
    // a Bag of Holding weighs 5 lb whatever is in it
    R.place(s, get('cb'), { bag: boh.id, x: 0, y: 0 });
    assert.equal(R.totalWeight(s, boh), 5);
});

test('carrying: Str × 15 (Goliath × 30), coins 50 per lb, the Overweight bag and Speed 5 ft, nothing beyond twice', () => {
    assert.equal(R.capacity(sheet([], { abilities: { str: 14 } })), 210);
    assert.equal(R.capacity(sheet([], { abilities: { str: 14 }, species: 'Goliath' })), 420);
    const s = sheet([{ name: 'Backpack', qty: 1, at: { slot: 'back' } }], { abilities: { str: 2 }, coins: { gp: 100 } });   // 30 lb
    R.ensureIds(s);
    assert.equal(R.coinWeight(s), 2);
    assert.equal(R.carried(s).total, 7);
    assert.equal(R.carried(s).slowed, false);
    assert.deepEqual([R.overSpec(s).cap, R.overSpec(s).cols], [30, 10]);
    const r = R.addItem(s, 'Chain Mail', 1);                                          // 55 lb: 62 > 60
    assert.equal(r.placed, false);
    assert.match(r.reason, /too heavy: you can drag at most 60 lb/);
    assert.equal(s.inventory.length, 1, 'refused: nothing added');
    const pot = R.addItem(s, 'Iron Pot', 1);                                          // 10 lb: backpack
    assert.equal(pot.item.at.bag, s.inventory[0].id);
    const crow = R.addItem(s, 'Crowbar', 1);                                          // 5 lb, 3x2: still room
    assert.equal(crow.item.at.bag, s.inventory[0].id);
    const bed = R.addItem(s, 'Bedroll', 1);                                           // 7 lb, 3x3: no room left → a strap
    assert.equal(bed.item.at.slot, 'strap1');
    assert.equal(R.addItem(s, 'Tent', 1).item.at.slot, 'strap2');                     // 20 lb
    assert.equal(R.carried(s).slowed, true, 'over Str × 15: Speed 5 ft');
    const chain = R.addItem(s, 'Chain', 1);                                           // 10 lb, 4x3: no room, no strap → Overweight
    assert.equal(chain.item.at.bag, R.OVER);
    assert.equal(R.carried(s).slowed, true, 'something is dragged along: Speed 5 ft');
    assert.match(R.carryLine(s), /^Carrying 59 of 30 lb — overloaded: Speed at most 5 ft/);
});

test('organize: older sheets keep every item, held things go to the slots, invalid places are cleared, idempotent', () => {
    const old = [{ name: 'Longsword', qty: 1, notes: 'family blade', inHand: true }, { name: 'Shield', qty: 1, inHand: true }, { name: 'Chain Mail', qty: 1, inHand: true },
        { name: 'Torch', qty: 1, inHand: true }, { name: 'Backpack', qty: 1 }, { name: 'Rations', qty: 5 }, { name: 'Rope', qty: 1 }, { name: 'Arrow', qty: 20 },
        { name: 'Wolf Pelt', qty: 3 }, { name: 'Anvil of the Mountain King', qty: 1 }];
    const s = sheet(plain(old), { abilities: { str: 15 } });
    R.organize(s);
    assert.deepEqual(tally(s.inventory), tally(old), 'nothing lost, nothing added');
    const at = (n) => s.inventory.find(i => i.name === n).at;
    assert.deepEqual(at('Chain Mail'), { slot: 'armor' });
    assert.deepEqual(at('Longsword'), { slot: 'main' });
    assert.deepEqual(at('Shield'), { slot: 'off' });
    assert.equal(at('Torch').slot, undefined, 'no free hand: the torch is packed');
    assert.equal(s.inventory.find(i => i.name === 'Torch').inHand, undefined);
    assert.deepEqual(at('Backpack'), { slot: 'back' }, 'a bag is worn');
    assert.equal(at('Rations').bag, s.inventory.find(i => i.name === 'Backpack').id);
    assert.equal(s.inventory.find(i => i.name === 'Longsword').notes, 'family blade');
    assert.equal(R.unpacked(s).length, 0);
    const once = plain(s); R.organize(s);
    assert.deepEqual(plain(s), once, 'a second run changes nothing');
    // a lost bag, an overlap, a place outside the grid → packed again elsewhere
    const bp = s.inventory.find(i => i.name === 'Backpack');
    s.inventory.find(i => i.name === 'Rope').at = { bag: 'it999', x: 0, y: 0 };
    s.inventory.find(i => i.name === 'Arrow').at = { bag: bp.id, x: 9, y: 9 };
    s.inventory.find(i => i.name === 'Wolf Pelt').at = Object.assign({}, at('Rations'));
    R.organize(s);
    assert.deepEqual(tally(s.inventory), tally(old));
    for (const n of ['Rope', 'Arrow', 'Wolf Pelt']) assert.ok(at(n) && !R.canPlace(s, s.inventory.find(i => i.name === n), Object.assign({}, at(n), { rot: !!s.inventory.find(i => i.name === n).rot })), n + ' placed validly');
});

test('organize and addItem unpack SRD equipment packs into their contents', () => {
    const s = sheet([{ name: "Explorer's Pack", qty: 1 }], { abilities: { str: 15 } });
    R.organize(s);
    assert.deepEqual(tally(s.inventory), { Backpack: 1, Bedroll: 1, Oil: 2, Rations: 10, Rope: 1, Tinderbox: 1, Torch: 10, Waterskin: 1 });
    assert.deepEqual(s.inventory.find(i => i.name === 'Backpack').at, { slot: 'back' });
    const b = sheet([], { abilities: { str: 15 } });
    R.addItem(b, "Priest's Pack", 1);
    assert.deepEqual(tally(b.inventory), { Backpack: 1, Blanket: 1, 'Holy Water': 1, Lamp: 1, Rations: 7, Robe: 1, Tinderbox: 1 });
});

test('addItem stacks where it still fits; removeItem repacks a bag\'s contents; splitStack', () => {
    const s = sheet([{ name: 'Backpack', qty: 1, at: { slot: 'back' } }], { abilities: { str: 15 } });
    R.ensureIds(s);
    const a = R.addItem(s, 'Arrow', 20);
    const b = R.addItem(s, 'Arrows', 20, { same: (x, y) => x.toLowerCase().replace(/s$/, '') === y.toLowerCase().replace(/s$/, '') });
    assert.equal(a.item, b.item, 'onto the same stack');
    assert.equal(a.item.qty, 40);
    assert.equal(R.footprint(a.item).join('x'), '2x1');
    const part = R.splitStack(s, a.item, 15);
    assert.equal(a.item.qty, 25);
    assert.equal(part.qty, 15);
    assert.ok(part.at && part.at.bag, 'the split-off part is packed');
    const forced = R.addItem(sheet([], { abilities: { str: 1 } }), 'Anvil', 1, { force: true });
    assert.equal(forced.item.name, 'Anvil', 'force: added even when it cannot be packed');
    // taking the backpack away packs what was inside elsewhere — or leaves it not packed
    const rope = R.addItem(s, 'Rope', 1).item;
    R.removeItem(s, s.inventory[0]);
    assert.ok(s.inventory.includes(rope), 'the rope stays');
    assert.equal(rope.at.bag, R.OVER, 'no other bag: dragged along');
});

test('straps, sheaths, slung on the back: an SRD fighter start nearly fits, the Explorer\'s Pack fits', () => {
    const f = sheet([{ name: 'Chain Mail', qty: 1, inHand: true }, { name: 'Greatsword', qty: 1 }, { name: 'Flail', qty: 1 }, { name: 'Javelin', qty: 8 },
        { name: "Dungeoneer's Pack", qty: 1 }], { abilities: { str: 15 }, coins: { gp: 4 } });
    R.organize(f);
    const at = (s, n) => (s.inventory.find(i => i.name === n) || {}).at || {};
    assert.equal(at(f, 'Flail').slot, 'sheath1');
    assert.equal(at(f, 'Javelin').slot, 'slung');
    assert.equal(at(f, 'Waterskin').slot, 'belt1');
    assert.ok(['strap1', 'strap2'].includes(at(f, 'Torch').slot));
    assert.ok(R.load(f, R.OVER) <= 6, 'a small leftover only: ' + R.load(f, R.OVER) + ' lb');
    assert.match(R.carryLine(f), /^Carrying 134\.1 of 225 lb/);
    const e = sheet([{ name: "Explorer's Pack", qty: 1 }]);
    R.organize(e);
    assert.equal(R.load(e, R.OVER), 0, 'the whole Explorer\'s Pack is carried');
    assert.equal(R.carried(e).slowed, false);
    // slot rules
    R.ensureIds(f);
    const gs = f.inventory.find(i => i.name === 'Greatsword'), rope = f.inventory.find(i => i.name === 'Rope');
    assert.match(R.canPlace(f, gs, { slot: 'sheath2' }), /too big for a sheath: sling it/);
    assert.match(R.canPlace(f, rope, { slot: 'sheath2' }), /only a weapon/);
    const worn = sheet([{ name: 'Backpack', qty: 1, id: 'p', at: { slot: 'back' } }, { name: 'Greatsword', qty: 1, id: 'g' }]);
    assert.match(R.canPlace(worn, worn.inventory[1], { slot: 'strap1' }), /sheath or on the back/);
    // the back carries one weapon and one shield together
    worn.inventory.push({ name: 'Shield', qty: 1, id: 's' });
    assert.deepEqual(R.findSpot(worn, worn.inventory[1]), { slot: 'slung' });
    assert.deepEqual(R.findSpot(worn, worn.inventory[2]), { slot: 'slungShield' });
    assert.match(R.canPlace(worn, worn.inventory[2], { slot: 'slung' }), /own place on the back/);
    assert.match(R.canPlace(worn, worn.inventory[1], { slot: 'slungShield' }), /only a shield/);
    const bare = sheet([{ name: 'Bedroll', qty: 1, id: 'b' }]);
    assert.match(R.canPlace(bare, bare.inventory[0], { slot: 'strap1' }), /wear a backpack/);
    // taking the backpack off: what was strapped to it is packed again, nothing lost
    const before = tally(e.inventory);
    R.removeItem(e, e.inventory.find(i => i.name === 'Backpack'));
    delete before.Backpack;
    assert.deepEqual(tally(e.inventory), before);
    assert.ok(!e.inventory.some(i => i.at && /^strap/.test(i.at.slot || '')), 'no straps without the backpack');
});

