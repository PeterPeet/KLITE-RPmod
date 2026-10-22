'use strict';
// R9 inventory in the game: loot that does not fit stays on the ground (logged, in the prompt and
// the Here row), /pickup and the AI's <give> take it from there, the sheet's Drop puts things down,
// a buy the player cannot carry is refused (nothing paid), and an overloaded character moves at
// most 5 ft (SRD) in combat and in the AI's view of the sheet.
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
const CH = requireSrc('src/chat/chat-rules.js');

async function adventure(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    await w.KLITE_RPMod_Characters.loadSheet('Tove Emberfall');
    return h;
}
const logText = (h) => h.window.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('loot that does not fit stays on the ground; the prompt and the Here row show it; /pickup and <give> take it from there', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    const sheet = () => C.cachedSheet('Tove Emberfall');
    const count = (n) => sheet().inventory.filter(i => i.name === n).reduce((a, i) => a + i.qty, 0);
    W.moveTo('The Tipsy Heron');
    // three barrels (70 lb each): two are dragged along (Overweight), the third does not fit anywhere
    W.applyTags('<give>Barrel</give> <give>Barrel</give> <give>Barrel</give>');
    await sleep(20);
    assert.equal(count('Barrel'), 2, 'two dragged along');
    assert.match(logText(h), /Barrel does not fit anywhere — left on the ground here\./);
    assert.deepEqual(plain(W.here().ground.map(g => [g.name, g.qty])), [['Barrel', 1]]);
    assert.match(W.preview(), /\[On the ground here\][^[]*- Barrel/);
    assert.match(C.summaryFor('Tove Emberfall'), /Speed 5 ft \(overloaded; normally 30 ft\)[\s\S]*Dragged along \(overweight\): Barrel x2/, 'the AI knows Tove is slowed');
    assert.deepEqual(CH.hereReplies(plain(W.here())).filter(x => x.kind === 'pickup').map(x => [x.label, x.text]), [['Pick up: Barrel', '/pickup Barrel | I pick up the Barrel.']]);
    // the Here row: Pick up — refused while it does not fit
    const r1 = w.KLITE_RPMod_Chat.run('/pickup Barrel', { send: false });
    assert.equal(r1.ok, false);
    assert.match(r1.error || '', /stays on the ground/);
    // the sheet's Drop (by item id) puts the whole stack on the ground (split it first to drop part)
    const b = sheet().inventory.find(i => i.name === 'Barrel');
    assert.equal(b.qty, 2, 'the two barrels are one stack');
    assert.equal(W.dropItem('Tove Emberfall', b.id).ok, true);
    assert.equal(count('Barrel'), 0);
    assert.deepEqual(plain(W.here().ground.map(g => [g.name, g.qty])), [['Barrel', 3]], 'stacked on the ground');
    assert.match(logText(h), /Tove Emberfall drops Barrel ×2 here\./);
    // a bag with things inside cannot be dropped
    const pack = sheet().inventory.find(i => i.name === 'Backpack');
    assert.match(W.dropItem('Tove Emberfall', pack.id).reason, /empty the Backpack first/);
    // drop the lamp, pick it up with /pickup
    const lamp = sheet().inventory.find(i => i.name === 'Lamp');
    W.dropItem('Tove Emberfall', lamp.id);
    assert.equal(count('Lamp'), 0);
    assert.ok(W.here().ground.some(g => g.name === 'Lamp'));
    const r2 = w.KLITE_RPMod_Chat.run('/pickup Lamp', { send: false });
    assert.equal(r2.ok, true);
    assert.equal(count('Lamp'), 1);
    assert.ok(!W.here().ground.some(g => g.name === 'Lamp'));
    // the AI picks the barrel up with <give>: taken from the ground, not made twice
    W.applyTags('<give>Barrel</give>');
    await sleep(20);
    assert.equal(count('Barrel'), 1);
    assert.deepEqual(plain(W.here().ground.map(g => [g.name, g.qty])), [['Barrel', 2]], 'two left on the ground');
    assert.match(logText(h), /The player picks up Barrel\./);
    // the AI explains the tags and may give a weight for things the SRD does not know
    assert.match(W.preview(), /\[Items\][^[]*<give>Broken cart axle \(40 lb\)<\/give>[^[]*<take>Item<\/take>/);
    W.applyTags('<give>Broken cart axle (40 lb)</give>');
    await sleep(20);
    const axle = sheet().inventory.find(i => i.name === 'Broken cart axle');
    assert.ok(axle, 'named without the weight');
    assert.equal(axle.weight, 40);
    // moving on: the barrel stays in the Tipsy Heron
    W.moveTo('Village Green');
    assert.equal(W.here().ground.length, 0);
    W.moveTo('The Tipsy Heron');
    assert.equal(W.here().ground.length, 1);
});

test('shop: a buy the player cannot carry is refused, nothing paid; a bundle "Arrows (20)" weighs 1 lb', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    const sheet = () => C.cachedSheet('Tove Emberfall');
    C.updateSheet('Tove Emberfall', (s) => { s.coins.gp = 200; s.abilities.str = 3; });   // carry 45 lb, drag up to 90
    W.moveTo(W.vendorsHere().length ? W.here().place : 'Village Green');
    const smith = 'npc_oskar';
    const gp0 = Number(sheet().coins.gp);
    const r = W.buy(smith, 'Chain Shirt');
    assert.equal(r.ok, false, JSON.stringify(r));
    assert.match(r.reason, /cannot carry it \(too heavy: you can drag at most 90 lb\)/);
    assert.equal(Number(sheet().coins.gp), gp0, 'nothing paid');
    C.updateSheet('Tove Emberfall', (s) => { s.abilities.str = 13; });
    assert.equal(W.buy(smith, 'Arrows (20)').ok, true);
    const arrows = sheet().inventory.find(i => i.name === 'Arrows (20)');
    assert.ok(arrows && arrows.at, 'packed');
});

test('combat: an overloaded character moves at most 5 ft (SRD)', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    assert.equal(C.combatStatsFor('Tove Emberfall').speed, 30);
    C.updateSheet('Tove Emberfall', (s) => { s.inventory.push({ name: 'Barrel', qty: 1 }); });
    assert.equal(C.combatStatsFor('Tove Emberfall').speed, 5, 'a barrel dragged along');
});
