'use strict';
// R4 extras (2026-09-25): faction phases, reputation from defeating faction members,
// repeatable/daily quests, quest-giver dialogue, vendors/shops.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep, selectNode } = require('./helpers/host');

const plain = (x) => JSON.parse(JSON.stringify(x));

async function exampleWorld(t, opts = {}) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    if (opts.persona) {
        await w.__addEsoCharacter('Kara', { description: 'A fighter.' });
        await C.saveSheet('Kara', { className: 'Fighter', level: 1, xp: 0, hp: { max: 12, current: 12 }, inventory: [{ name: 'Rope', qty: 1 }], coins: { gp: opts.gp == null ? 5 : opts.gp } });
        w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    }
    await W.loadExample();
    return { h, w, W, C };
}

test('faction phases: the Red Hand loses its headquarters after the bounty; a disbanded faction leaves the AI context', async (t) => {
    const { W } = await exampleWorld(t);
    W.moveTo('Bandit Camp');
    assert.match(W.preview(), /Headquarters of: The Red Hand/);
    W.setQuestState('q_bounty', 'turnedin');
    const p = W.preview();
    assert.match(p, /\[Current Location: Abandoned Camp\]/);
    assert.doesNotMatch(p, /Headquarters of/, 'the scattered Red Hand has no headquarters any more');
    assert.equal(W.phased('fac_bandit').phase, 'Scattered');
    assert.match(p, /The Red Hand: Hostile/, 'still remembered: the standing stays');
    // a phase that disbands the faction: gone from the AI's Reputation section
    const ph0 = plain(W.entityById('fac_bandit').phases[0]);
    W.updateEntity('fac_bandit', { phases: [Object.assign({}, ph0, { gone: true, name: 'The Broken Hand' })] });
    const r = W.reputation().find(x => x.id === 'fac_bandit');
    assert.equal(r.gone, true); assert.equal(r.name, 'The Broken Hand');
    assert.doesNotMatch(W.preview(), /Hand: Hostile/);
    // the phase's new headquarters
    W.updateEntity('fac_bandit', { phases: [Object.assign({}, ph0, { hqLocationId: 'loc_forest' })] });
    W.moveTo('Forest Road');
    assert.match(W.preview(), /Headquarters of: The Red Hand/);
});

test('defeating faction members costs reputation: persons of the faction and monsters of its encounter', async (t) => {
    const { h, w, W } = await exampleWorld(t);
    const L = w.KLITE_RPMod_Log;
    W.moveTo('Bandit Camp');
    h.seedRandom([0.5]);
    W.startSavedEncounter('Red Hand ambush');
    for (const o of W.getCombat().order.filter(o => o.side === 'enemy')) W.damage(o.id, 99);
    assert.equal(W.getCombat().outcome, 'victory');
    assert.equal(W.reputation().find(r => r.id === 'fac_bandit').value, -400 - 3 * 25, 'Kell and two bandits');
    assert.ok(L.entries().some(e => /Reputation with The Red Hand -25/.test(e.what)));
    W.endEncounter();
    // the creator sets it per faction (0 = none); monsters without a faction cost nothing
    W.updateEntity('fac_bandit', { killReputation: 0 });
    W.startSavedEncounter('Red Hand ambush');
    for (const o of W.getCombat().order.filter(o => o.side === 'enemy')) W.damage(o.id, 99);
    W.endEncounter();
    W.startEncounter([], { monsters: [{ key: 'bandit', count: 1 }] });
    for (const o of W.getCombat().order.filter(o => o.side === 'enemy')) W.damage(o.id, 99);
    assert.equal(W.reputation().find(r => r.id === 'fac_bandit').value, -475);
    // saveEncounter keeps the faction; the graph shows the link
    const e = W.listEncounters().find(x => x.id === 'enc_redhand');
    W.saveEncounter(Object.assign({}, e, { name: 'Red Hand ambush' }));
    assert.equal(W.entityById('enc_redhand').factionId, 'fac_bandit');
    assert.ok(W.getGraph().edges.some(x => x.from === 'enc_redhand' && x.to === 'fac_bandit' && x.kind === 'faction'));
});

test('editor: kill reputation, faction phases and an encounter\'s faction', async (t) => {
    const { h, w, W } = await exampleWorld(t);
    h.ui().openEditor(); await sleep(20);
    selectNode(h, 'fac_guard');
    const doc = w.document;
    const kill = doc.querySelector('[data-faction="kill"]');
    assert.ok(kill);
    kill.value = '-40'; kill.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('fac_guard').killReputation, -40);
    doc.querySelector('[data-add-phase="faction"]').click();
    assert.equal(W.entityById('fac_guard').phases.length, 1);
    const hq = doc.querySelector('[aria-label="Phase headquarters"]');
    hq.value = 'none'; hq.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('fac_guard').phases[0].hqLocationId, 'none');
    selectNode(h, 'enc_redhand');
    const fs = doc.querySelector('[data-enc="faction"]');
    assert.equal(fs.value, 'fac_bandit');
    fs.value = ''; fs.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('enc_redhand').factionId, undefined);
    assert.ok(plain(W.getGraph().nodes).length);
});

test('daily and repeatable quests: available again, rewards pay again, chains and phases still see "turned in"', async (t) => {
    const { w, W, C } = await exampleWorld(t, { persona: true });
    const L = w.KLITE_RPMod_Log;
    W.setQuestState('q_merchant', 'turnedin');
    W.moveTo('Royal Watchtower');
    assert.ok(W.listQuests('player').some(q => q.id === 'q_patrol' && q.repeat === 'daily'));
    W.acceptQuest('q_patrol');
    W.moveTo('Forest Road');
    assert.equal(W.questState('q_patrol'), 'complete');
    W.moveTo('Royal Watchtower');
    assert.equal(W.turnInQuest('q_patrol'), 'turnedin');
    assert.ok(L.entries().some(e => /Quest turned in: Road Patrol\. Rewards: 5 gold, 25 XP, \+25 reputation with Royal Guard\. Captain Rowan: "Quiet, you say\?/.test(e.what)), 'the giver\'s words on turn-in');
    assert.equal(W.questState('q_patrol'), 'turnedin', 'daily: not again today');
    W.advanceClock(2);
    assert.equal(W.questState('q_patrol'), 'turnedin', 'still the same day');
    W.setClock({ day: 2, time: 'morning' });
    assert.equal(W.questState('q_patrol'), 'available', 'a new day');
    assert.ok(L.entries().some(e => /Quest available again: Road Patrol \(daily\)\./.test(e.what)));
    assert.equal(W.objectiveStatus('q_patrol', 'p1').done, false, 'progress reset');
    W.acceptQuest('q_patrol'); W.moveTo('Forest Road'); W.moveTo('Royal Watchtower'); W.turnInQuest('q_patrol');
    await C.flushSheet('Kara');
    assert.equal((await C.loadSheet('Kara')).coins.gp, 5 + 5 + 5, 'paid twice');
    assert.equal(W.listQuests('player').find(q => q.id === 'q_patrol').timesDone, 2);
    // repeatable: again at once; a chain and a phase condition still count it as turned in
    W.updateEntity('q_patrol', { repeat: 'repeatable' });
    W.setClock({ day: 3 });
    W.acceptQuest('q_patrol'); W.moveTo('Forest Road'); W.moveTo('Royal Watchtower'); W.turnInQuest('q_patrol');
    assert.equal(W.questState('q_patrol'), 'available');
    assert.equal(W.evalCondition({ type: 'quest', questId: 'q_patrol', state: 'turnedin' }), true);
    const q = W.addEntity('quest', { name: 'Next' }); W.updateEntity(q.id, { prerequisites: { quests: ['q_patrol'] } });
    assert.deepEqual(plain(W.questLocks(q.id)), []);
});

test('quest-giver dialogue reaches the AI; <accept> and <turnin> act through the rules', async (t) => {
    const { w, W } = await exampleWorld(t, { persona: true });
    const L = w.KLITE_RPMod_Log;
    W.moveTo('The Crooked Kettle');
    let p = W.preview();
    assert.match(p, /\[Quest givers here\]\n- Innkeeper Bram offers "The Missing Merchant" — "Old Tobin left/);
    assert.match(p, /<accept>quest title<\/accept>/);
    W.applyTags('<accept>The Missing Merchant</accept>');
    assert.equal(W.questState('q_merchant'), 'active');
    W.applyTags('<accept>Bandit Bounty</accept>');
    assert.equal(W.questState('q_bounty'), 'available', 'locked: the chain decides, not the AI');
    W.moveTo('Royal Watchtower');
    assert.match(W.preview(), /- Captain Rowan is waiting for "The Missing Merchant" \(in progress\) — "Any sign of the merchant/);
    W.applyTags('<turnin>The Missing Merchant</turnin>');
    assert.equal(W.questState('q_merchant'), 'active');
    assert.ok(L.entries().some(e => /cannot be turned in yet/.test(e.what)));
    W.completeQuest('q_merchant');
    assert.match(W.preview(), /will take "The Missing Merchant" \(ready to turn in\); on turn-in they say: "A burned cart/);
    W.applyTags('<turnin>missing merchant</turnin>');
    assert.equal(W.questState('q_merchant'), 'turnedin');
    p = W.preview();
    assert.match(p, /Captain Rowan offers "Bandit Bounty" — "Kell leads/);
    assert.match(p, /Captain Rowan offers "Road Patrol" \(daily\)/);
    // a choose-one reward cannot be picked by the AI
    W.acceptQuest('q_bounty'); W.completeQuest('q_bounty');
    W.applyTags('<turnin>Bandit Bounty</turnin>');
    assert.equal(W.questState('q_bounty'), 'complete');
    assert.ok(L.entries().some(e => /chooses a reward in the Quest log/.test(e.what)));
});

test('editor and Quest log: repeat and the giver\'s words', async (t) => {
    const { h, w, W } = await exampleWorld(t);
    h.ui().openEditor(); await sleep(20);
    selectNode(h, 'q_delivery');
    const doc = w.document;
    const rs = doc.querySelector('[data-quest-field="repeat"]');
    rs.value = 'daily'; rs.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('q_delivery').repeat, 'daily');
    const offer = doc.querySelector('[data-quest-field="offerText"]');
    offer.value = 'Please, take this letter!'; offer.dispatchEvent(new w.Event('input'));
    assert.equal(W.entityById('q_delivery').offerText, 'Please, take this letter!');
    // every quest with its words: the Quest editor (R8; the Quest log shows accepted ones)
    w.KLITE_RPMod_Shell.open('questeditor'); await sleep(30);
    const words = doc.querySelector('[data-window="questeditor"] [data-words="q_merchant"]');
    assert.ok(words && /Innkeeper Bram: “Old Tobin/.test(words.textContent));
    W.setQuestState('q_merchant', 'turnedin');
    w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.ok(doc.querySelector('[data-window="questeditor"] [data-repeat="q_patrol"]'), 'the daily chip');
});

// ---- vendors / shops ----
const esbuild = require('esbuild');
const path = require('path');
const { ROOT } = require('./helpers/host');
function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}

test('shop rules: prices, SRD list prices, reputation factor, paying with change', () => {
    const SH = requireSrc('src/game/shop-rules.js');
    assert.equal(SH.parsePrice('15 GP'), 1500); assert.equal(SH.parsePrice('1,500 gp'), 150000);
    assert.equal(SH.parsePrice('2 gp 5 sp'), 250); assert.equal(SH.parsePrice('4 cp'), 4); assert.equal(SH.parsePrice(2.5), 250);
    assert.equal(SH.parsePrice(''), null); assert.equal(SH.parsePrice('Varies'), null);
    assert.equal(SH.formatPrice(250), '2 gp 5 sp'); assert.equal(SH.formatPrice(0), '0 gp'); assert.equal(SH.formatPrice(150000), '1,500 gp');
    assert.equal(SH.srdPrice('Longsword'), 1500); assert.equal(SH.srdPrice('Plate Armor'), 150000); assert.equal(SH.srdPrice('Shield'), 1000);
    assert.equal(SH.srdPrice('Torch'), 1); assert.equal(SH.srdPrice('torches'), 1, 'plural'); assert.equal(SH.srdPrice("Traveler's Clothes"), 200);
    assert.equal(SH.srdPrice('Dragon Egg'), null);
    assert.equal(SH.buyPrice(1500, 'Friendly'), 1425); assert.equal(SH.buyPrice(1500, 'Exalted'), 1200); assert.equal(SH.buyPrice(1500, 'Unfriendly'), 1875);
    assert.equal(SH.canTrade('Hostile'), false); assert.equal(SH.canTrade('Unfriendly'), true);
    assert.equal(SH.sellPrice(1500), 750);
    // small coins first, a larger coin is broken and the change comes back
    assert.deepEqual(SH.payCoins({ cp: 5, sp: 0, gp: 3, pp: 0 }, 250), { cp: 5, sp: 5, gp: 0, pp: 0 });
    assert.equal(SH.wealthCp(SH.payCoins({ pp: 1, sp: 3 }, 50)), 980);
    assert.equal(SH.payCoins({ gp: 1 }, 101), null, 'not enough');
    assert.deepEqual(SH.addCoins({ gp: 1 }, 256), { gp: 3, sp: 5, cp: 6 });
});

test('vendors: buy and sell through the rules — purse on the sheet, reputation prices, stock restocks daily', async (t) => {
    const { w, W, C } = await exampleWorld(t, { persona: true, gp: 150 });
    const L = w.KLITE_RPMod_Log;
    W.moveTo('The Crooked Kettle');
    assert.deepEqual(plain(W.vendorsHere()), ['npc_bram']);
    const v = W.shopView('npc_bram');
    assert.equal(v.items.find(i => i.item === 'Torch').priceText, '1 cp');
    assert.equal(v.items.find(i => i.item === 'Potion of Healing').left, 2);
    assert.deepEqual(plain(W.buy('npc_bram', 'Torch', 3)), { ok: true, cost: 3 });
    await C.flushSheet('Kara');
    let s = await C.loadSheet('Kara');
    assert.ok(s.inventory.some(i => i.name === 'Torch' && i.qty === 3));
    assert.equal(SHwealth(s.coins), 15000 - 3);
    assert.ok(L.entries().some(e => /Bought Torch ×3 from Innkeeper Bram for 3 cp\./.test(e.what)));
    // stock: two potions a day
    assert.equal(W.buy('npc_bram', 'Potion of Healing', 2).ok, true);
    assert.equal(W.buy('npc_bram', 'Potion of Healing', 1).ok, false);
    assert.ok(L.entries().some(e => /does not sell Potion of Healing: sold out until tomorrow/.test(e.what)));
    W.setClock({ day: 2 });
    assert.equal(W.shopView('npc_bram').items.find(i => i.item === 'Potion of Healing').left, 2, 'restocked');
    // money
    const r = W.buy('npc_bram', 'Potion of Healing', 2);
    assert.equal(r.ok, false); assert.match(r.reason, /costs 100 gp and the player has/);
    // selling: half price, SRD items only (Rope is SRD gear, 1 gp)
    assert.ok(W.shopView('npc_bram').sell.some(x => x.item === 'Rope' && x.price === 50));
    assert.equal(W.sell('npc_bram', 'Rope').ok, true);
    await C.flushSheet('Kara'); s = await C.loadSheet('Kara');
    assert.ok(!s.inventory.some(i => i.name === 'Rope'));
    assert.equal(SHwealth(s.coins), 15000 - 3 - 10000 + 50, 'purse after two potions and a sold rope');
});
function SHwealth(c) { return (c.cp || 0) + (c.sp || 0) * 10 + (c.ep || 0) * 50 + (c.gp || 0) * 100 + (c.pp || 0) * 1000; }

test('vendors: the faction standing sets prices and refusals; tags <buy>/<sell>; the AI\'s Trade section', async (t) => {
    const { w, W } = await exampleWorld(t);   // no persona: the story keeps the purse
    const L = w.KLITE_RPMod_Log;
    W.moveTo('Royal Watchtower');
    let p = W.preview();
    assert.match(p, /\[Trade\]\n- Quartermaster Wren sells: Longsword 15 gp, Shield 10 gp, Chain Mail 75 gp \(1 left\), Shortbow 25 gp, Arrows 5 cp; buys items at half price\. Friends of the Guard pay less\./);
    assert.match(p, /The player's purse: 0 gp\. When the player buys or sells, write <buy>/);
    W.applyTags('<buy>Arrows x20</buy>');
    assert.ok(L.entries().some(e => /costs 1 gp and the player has 0 gp/.test(e.what)), 'no money: refused and logged');
    W.runtime.coins = { gp: 30 };
    W.changeReputation('fac_guard', 500);   // Honored: 10% off
    p = W.preview();
    assert.match(p, /Longsword 13 gp 5 sp/); assert.match(p, /prices 10% lower \(Royal Guard: Honored\)/);
    W.applyTags('<buy>Wren: Longsword</buy><buy>Arrows x20</buy>');
    assert.equal(W.itemCount('Longsword'), 1); assert.equal(W.itemCount('Arrows'), 20);
    assert.equal(SHwealth(W.runtime.coins), 3000 - 1350 - 100, 'the price per arrow is rounded: 4.5 → 5 cp');
    W.applyTags('<sell>Longsword</sell>');
    assert.equal(W.itemCount('Longsword'), 0);
    assert.equal(SHwealth(W.runtime.coins), 3000 - 1350 - 100 + 750, 'half of the listed base price');
    // Hostile: no trade
    W.changeReputation('fac_guard', -1000);   // 500 − 1000 = −500: Hostile
    assert.match(W.preview(), /Quartermaster Wren refuses to trade with the player \(Royal Guard: Hostile\)/);
    assert.equal(W.buy('npc_wren', 'Shield').ok, false);
    // nobody here
    W.moveTo('Forest Road');
    W.applyTags('<buy>Torch</buy>');
    assert.ok(L.entries().some(e => /No one here trades/.test(e.what)));
    assert.doesNotMatch(W.preview(), /\[Trade\]/);
});

test('Shop window and the vendor editor', async (t) => {
    const { h, w, W } = await exampleWorld(t, { persona: true, gp: 20 });
    const doc = w.document;
    W.moveTo('The Crooked Kettle');
    w.KLITE_RPMod_Shell.open('worldcreate'); await sleep(30);   // R8: the State editor (World Creation)
    assert.equal(doc.querySelector('[data-vendors-here]').textContent, 'Trade here: Innkeeper Bram');
    w.KLITE_RPMod_Shell.open('shop'); await sleep(30);
    const win = doc.querySelector('[data-window="shop"]');
    assert.ok(win.querySelector('[data-vendor="npc_bram"]'));
    win.querySelector('[data-ware="Ale"] [data-trade="buy"]').click(); await sleep(30);
    assert.equal(W.itemCount('Ale'), 1);
    assert.match(doc.querySelector('[data-window="shop"] [data-shop="purse"]').textContent, /19 gp 9 sp 6 cp/);
    assert.ok(doc.querySelector('[data-window="shop"] [data-trade="sell"][data-item="Rope"]'), 'Rope can be sold here');
    // editor: make Finn a vendor, add a ware with the SRD price, stock
    h.ui().openEditor(); await sleep(20);
    selectNode(h, 'npc_courier');
    const on = doc.querySelector('[data-shop-edit="vendor"]');
    on.checked = true; on.dispatchEvent(new w.Event('change'));
    assert.deepEqual(plain(W.entityById('npc_courier').shop), { items: [], buys: true });
    const add = doc.querySelector('[data-shop-edit="add"]'); add.value = 'Map';
    doc.querySelector('[data-shop-edit="add-btn"]').click();
    assert.equal(W.entityById('npc_courier').shop.items[0].item, 'Map');
    const price = doc.querySelector('[aria-label="Price of Map"]');
    assert.equal(price.getAttribute('placeholder'), '1 gp', 'the SRD price as a hint');
    const stock = doc.querySelector('[aria-label="Stock of Map"]'); stock.value = '3'; stock.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('npc_courier').shop.items[0].stock, 3);
    const buys = doc.querySelector('[data-shop-edit="buys"]'); buys.checked = false; buys.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('npc_courier').shop.buys, false);
    assert.equal(W.entityById('npc_courier').shop.items.length, 1, 'items kept');
});
