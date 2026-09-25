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
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    const words = doc.querySelector('[data-window="questlog"] [data-words="q_merchant"]');
    assert.ok(words && /Innkeeper Bram: “Old Tobin/.test(words.textContent));
    W.setQuestState('q_merchant', 'turnedin');
    w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.ok(doc.querySelector('[data-window="questlog"] [data-repeat="q_patrol"]'), 'the daily chip');
});
