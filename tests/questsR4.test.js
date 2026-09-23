'use strict';
// R4 quests & world: rewards paid on turn-in (to the persona's sheet), choose-one rewards,
// abandon, inventory on the sheet, objectives with counters, prerequisites and markers,
// reputation, zones/hubs and phasing.
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
const QR = requireSrc('src/game/quest-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

test('rules: rewards parse/format, names, objective status, prerequisites, reputation tiers, phases', () => {
    assert.deepEqual(QR.parseReward('100 xp'), { type: 'xp', xp: 100 });
    assert.deepEqual(QR.parseReward('25 gold'), { type: 'gold', gold: 25 });
    assert.deepEqual(QR.parseReward('Silver Ring x2'), { type: 'item', item: 'Silver Ring', qty: 2 });
    assert.deepEqual(QR.parseReward('choose: Longsword | Shield | Healing Potion x2'), { type: 'choice', options: [{ item: 'Longsword', qty: 1 }, { item: 'Shield', qty: 1 }, { item: 'Healing Potion', qty: 2 }] });
    assert.deepEqual(QR.parseReward('rep Royal Guard +150', (n) => n === 'Royal Guard' ? 'fac_guard' : null), { type: 'reputation', factionId: 'fac_guard', amount: 150 });
    assert.equal(QR.parseReward('rep Nobody +5', () => null), null);
    assert.equal(QR.formatReward({ xp: 50 }), '50 XP', 'legacy reward without type');
    assert.equal(QR.formatReward({ type: 'reputation', factionId: 'f', amount: -50 }, () => 'Bandits'), '-50 reputation with Bandits');
    assert.ok(QR.sameName('Wolves', 'wolf') && QR.sameName('Wolf 2', 'Wolf') && !QR.sameName('Wolf', 'Dire Wolf'));

    assert.deepEqual(plain(QR.objectiveStatus({ kind: 'kill', count: 3 }, 2)), { current: 2, needed: 3, done: false });
    assert.deepEqual(plain(QR.objectiveStatus({ kind: 'collect', count: 2 }, null, 5)), { current: 2, needed: 2, done: true });
    assert.equal(QR.objectiveStatus({ text: 'Search' }, true).done, true, 'manual');
    assert.equal(QR.objectiveLabel({ kind: 'kill', text: 'Slay wolves', count: 3 }, { current: 1, needed: 3 }), 'Slay wolves (1/3)');

    const facts = { level: 2, questState: (id) => (id === 'a' ? 'turnedin' : 'active'), flag: (k) => k === 'ok', tierOf: () => 'Neutral', questTitle: (id) => id.toUpperCase(), factionName: () => 'Guard' };
    assert.deepEqual(QR.unmetPrerequisites({ prerequisites: { level: 2, quests: ['a'], flags: ['ok'] } }, facts), []);
    assert.deepEqual(QR.unmetPrerequisites({ prerequisites: { level: 3, quests: ['b'], flags: ['no'], reputation: { factionId: 'g', tier: 'Friendly' } } }, facts),
        ['Requires level 3', 'Requires the quest "B"', 'Requires: no', 'Requires Friendly with Guard']);

    assert.deepEqual([-2000, -500, -100, 0, 100, 600, 1500, 3000].map(QR.tierOf), ['Hated', 'Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Honored', 'Revered', 'Exalted']);
    assert.ok(QR.isHostileTier('Hated') && QR.isHostileTier('Hostile') && !QR.isHostileTier('Unfriendly'));
    assert.deepEqual(plain(QR.tierProgress(150)), { tier: 'Friendly', next: 'Honored', into: 50, span: 400 });

    const loc = { name: 'Millbrook', description: 'Quiet', phases: [
        { label: 'Burning', conditions: [{ field: 'flag.raid', op: '==', value: true }], description: 'On fire' },
        { label: 'Rebuilt', conditions: [{ field: 'flag.raid', op: '==', value: true }, { field: 'flag.rebuilt', op: '==', value: true }], description: 'New houses' }] };
    const ev = (flags) => (c) => flags[c.field.slice(5)] === c.value;
    assert.equal(QR.phased(loc, ev({})).description, 'Quiet');
    assert.equal(QR.phased(loc, ev({ raid: true })).description, 'On fire');
    assert.equal(QR.phased(loc, ev({ raid: true, rebuilt: true })).phase, 'Rebuilt', 'the last matching phase wins');
});

// ---- engine with a persona (bundle + fake Esolite Library) ----------------------------------
async function personaWorld(t, opts = {}) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    if (opts.persona !== false) {
        await w.__addEsoCharacter('Kara', { description: 'A fighter.' });
        await C.saveSheet('Kara', { className: 'Fighter', level: opts.level || 1, xp: opts.xp || 0, hp: { max: 12, current: 12 }, inventory: [{ name: 'Rope', qty: 1 }], coins: { gp: 5 } });
        w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    }
    await W.loadExample();
    return { h, w, W, C };
}

test('rewards: turn-in pays XP, gold and items to the persona sheet once; choose-one; abandon', async (t) => {
    const { w, W, C } = await personaWorld(t, { xp: 250 });
    const L = w.KLITE_RPMod_Log;
    W.acceptQuest('q_merchant');
    assert.ok(L.entries().some(e => e.kind === 'quest' && /Quest accepted: The Missing Merchant\./.test(e.what)));
    W.completeQuest('q_merchant');
    W.turnInQuest('q_merchant');
    await C.flushSheet('Kara');
    let s = await C.loadSheet('Kara');
    assert.equal(s.xp, 350, '100 XP');
    assert.ok(s.inventory.some(i => i.name === 'Silver Ring' && i.qty === 1), 'item on the sheet');
    assert.ok(L.entries().some(e => /Quest turned in: The Missing Merchant\. Rewards: Silver Ring, 100 XP, 20 gold, \+100 reputation with Royal Guard\./.test(e.what)));
    assert.ok(L.entries().some(e => /Kara has enough XP for level 2/.test(e.what)));
    W.setQuestState('q_merchant', 'complete'); W.turnInQuest('q_merchant');
    await C.flushSheet('Kara');
    assert.equal((await C.loadSheet('Kara')).xp, 350, 'paid only once');

    // choose one of N + gold
    W.updateEntity('q_bounty', { rewards: [{ type: 'gold', gold: 40 }, { type: 'choice', options: [{ item: 'Longsword' }, { item: 'Shield' }] }] });
    W.acceptQuest('q_bounty'); W.completeQuest('q_bounty');
    assert.equal(W.turnInQuest('q_bounty'), null, 'needs a choice');
    assert.equal(W.questState('q_bounty'), 'complete');
    W.turnInQuest('q_bounty', 1);
    await C.flushSheet('Kara');
    s = await C.loadSheet('Kara');
    assert.equal(s.coins.gp, 5 + 20 + 40, 'start + merchant + bounty');
    assert.ok(s.inventory.some(i => i.name === 'Shield') && !s.inventory.some(i => i.name === 'Longsword'));

    // abandon: back to available, progress gone
    W.setQuestState('q_delivery', 'available'); W.acceptQuest('q_delivery');
    W.completeObjective('q_delivery', 'x', true);
    assert.equal(W.abandonQuest('q_delivery'), 'available');
    assert.equal(W.runtime.questObjectives.q_delivery, undefined);
    assert.equal(W.abandonQuest('q_delivery'), null, 'only accepted quests');
});

test('inventory: <give>/<take> use the persona sheet; the World tab shows it; a sheet draft keeps the reward', async (t) => {
    const { h, w, W, C } = await personaWorld(t);
    W.applyTags('<give>Torch x3</give><take>Rope</take>');
    let s = C.cachedSheet('Kara');
    assert.ok(s.inventory.some(i => i.name === 'Torch' && i.qty === 3), 'at once in the cache');
    assert.ok(!s.inventory.some(i => i.name === 'Rope'));
    assert.equal(W.runtime.inventory.length, 0, 'not in the story inventory');
    assert.equal(W.itemCount('torches'), 3);
    await C.flushSheet('Kara');
    assert.ok((await C.loadSheet('Kara')).inventory.some(i => i.name === 'Torch'), 'saved in the card');
    assert.deepEqual(plain(W.inventory()).source, 'sheet');

    // the sheet window has an unsaved edit (notes); a quest reward arrives; Save keeps both
    C.open('Kara'); await sleep(30);
    const doc = w.document; const win = () => doc.querySelector('[data-window="sheet"]');
    const notes = win().querySelector('textarea[aria-label="Notes"]');
    notes.value = 'Owes Bram a drink.'; notes.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    W.giveItem('Silver Ring', 1); await sleep(20);
    win().querySelector('[data-save="sheet"]').click(); await sleep(40);
    await C.flushSheet('Kara');
    s = await C.loadSheet('Kara');
    assert.equal(s.notes, 'Owes Bram a drink.');
    assert.ok(s.inventory.some(i => i.name === 'Silver Ring'), 'the reward survived the draft save');
});

test('inventory without a persona: the story keeps items, gold and XP', async (t) => {
    const { W } = await personaWorld(t, { persona: false });
    W.acceptQuest('q_merchant'); W.completeQuest('q_merchant'); W.turnInQuest('q_merchant');
    assert.ok(W.runtime.inventory.some(i => i.name === 'Silver Ring'));
    assert.equal(W.runtime.xp, 100);
    assert.equal(W.inventory().source, 'story');
    assert.match(W.preview(), /Inventory: Silver Ring\nGold: 20, XP: 100/);
});

test('objectives: kill (combat), collect, talk, visit and manual progress by themselves; the quest completes', async (t) => {
    const { h, w, W } = await personaWorld(t, { persona: false });
    W.updateEntity('q_bounty', { prerequisites: {}, objectives: [
        { id: 'k', kind: 'kill', target: 'Wolf', count: 2, text: 'Defeat 2 Wolf' },
        { id: 'c', kind: 'collect', target: 'Wolf Pelt', count: 2, text: 'Collect 2 Wolf Pelt' },
        { id: 't', kind: 'talk', target: 'npc_bram', text: 'Talk to Innkeeper Bram' },
        { id: 'v', kind: 'visit', target: 'loc_forest', text: 'Go to the Forest Road' },
        { id: 'm', text: 'Think it over' },
    ] });
    W.acceptQuest('q_bounty');
    const st = (oid) => plain(W.objectiveStatus('q_bounty', oid));
    // kill: every defeated wolf in a fight counts
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 3 }] });
    const wolves = W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.id);
    W.damage(wolves[0], 50);
    assert.deepEqual(st('k'), { current: 1, needed: 2, done: false });
    W.damage(wolves[1], 50); W.damage(wolves[2], 50);
    assert.deepEqual(st('k'), { current: 2, needed: 2, done: true }, 'capped at the count');
    W.endEncounter();
    // collect: follows the inventory
    W.giveItem('Wolf Pelt', 1);
    assert.equal(st('c').current, 1);
    W.applyTags('<give>Wolf Pelts x2</give>');
    assert.equal(st('c').done, true);
    // talk: named in a message while the person is here (Bram is in the tavern)
    W.moveTo('The Crooked Kettle'); w.gametext_arr.push('I lean on the bar and ask Bram about the road.');
    await w.prepare_submit_generation();
    assert.equal(st('t').done, true);
    // visit
    assert.equal(st('v').done, false);
    W.moveTo('Forest Road');
    assert.equal(st('v').done, true);
    assert.equal(W.questState('q_bounty'), 'active', 'the manual objective is still open');
    assert.match(W.preview(), /☑ Defeat 2 Wolf \(2\/2\)[\s\S]*☐ Think it over/);
    W.completeObjective('q_bounty', 'm', true);
    assert.equal(W.questState('q_bounty'), 'complete', 'all done → ready to turn in');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Quest ready to turn in: Bandit Bounty \(to Captain Rowan\)\./.test(e.what)));
    // giving the pelts away drops it back to active; turn-in consumes them
    W.takeItem('Wolf Pelt', 3);
    assert.equal(W.questState('q_bounty'), 'active');
    W.giveItem('Wolf Pelt', 3);
    assert.equal(W.questState('q_bounty'), 'complete');
    assert.equal(W.turnInQuest('q_bounty', 0), 'turnedin', 'the example bounty lets you choose a reward');
    assert.equal(W.itemCount('Wolf Pelt'), 1, 'two pelts handed over');
    // <talk> tag
    W.updateEntity('q_merchant', { objectives: [{ id: 't2', kind: 'talk', target: 'npc_rowan', text: 'Talk to Rowan' }] });
    W.acceptQuest('q_merchant');
    W.applyTags('<talk>Captain Rowan</talk>');
    assert.equal(W.questState('q_merchant'), 'complete');
});

test('Quest log and tracker show objectives with counters; manual ones can be ticked', async (t) => {
    const { w, W } = await personaWorld(t, { persona: false });
    W.updateEntity('q_merchant', { objectives: [{ id: 'o1', text: 'Search the Forest Road' }, { id: 'k', kind: 'kill', target: 'Wolf', count: 3, text: 'Defeat 3 Wolf' }] });
    W.acceptQuest('q_merchant');
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    const doc = w.document; const win = doc.querySelector('[data-window="questlog"]');
    assert.match(win.querySelector('[data-objectives="q_merchant"]').textContent, /Search the Forest Road[\s\S]*Defeat 3 Wolf \(0\/3\)/);
    const cbx = win.querySelector('[data-objective="o1"] input');
    cbx.checked = true; cbx.dispatchEvent(new w.Event('change'));
    await sleep(30);
    assert.equal(W.objectiveStatus('q_merchant', 'o1').done, true);
    const tracker = doc.querySelector('[data-section="quest-tracker"]');
    assert.match(tracker.textContent, /☑ Search the Forest Road[\s\S]*☐ Defeat 3 Wolf \(0\/3\)/);
});

test('prerequisites and chains, item-started quests, the full marker set', async (t) => {
    const { W, w, C } = await personaWorld(t, { level: 1 });
    // chain: the bounty needs the merchant quest turned in (editor link quest → quest)
    W.connect('q_merchant', 'q_bounty');
    assert.deepEqual(plain(W.questLocks('q_bounty')), ['Requires the quest "The Missing Merchant"']);
    assert.ok(W.getGraph().edges.some(e => e.from === 'q_merchant' && e.to === 'q_bounty' && e.kind === 'unlocks'));
    assert.equal(W.acceptQuest('q_bounty'), null, 'locked');
    assert.ok(!W.listQuests('player').some(q => q.id === 'q_bounty'), 'hidden from the player until unlocked');
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan', 'player')), null, 'no marker for a chained quest');
    // merchant: Bram gives it (yellow !), Rowan takes it (grey ? while in progress, yellow ? when done)
    assert.deepEqual(plain(W.questMarkerInfo('npc_bram')), { mark: '!', grey: false });
    W.acceptQuest('q_merchant');
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan')), { mark: '?', grey: true });
    W.completeQuest('q_merchant');
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan')), { mark: '?', grey: false });
    W.turnInQuest('q_merchant');
    assert.deepEqual(plain(W.questLocks('q_bounty')), []);
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan')), { mark: '!', grey: false }, 'the next quest in the chain');
    // level: grey ! until the level is reached
    W.updateEntity('q_bounty', { prerequisites: { level: 3, quests: ['q_merchant'] } });
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan')), { mark: '!', grey: true });
    assert.equal(W.personQuestMarker('npc_rowan'), '', 'the AI only hears about yellow markers');
    assert.ok(W.listQuests('player').some(q => q.id === 'q_bounty' && q.locks.length === 1), 'level-locked quests are shown (greyed)');
    await C.saveSheet('Kara', Object.assign({}, await C.loadSheet('Kara'), { level: 3 }));
    assert.deepEqual(plain(W.questMarkerInfo('npc_rowan')), { mark: '!', grey: false });
    // flags
    W.updateEntity('q_bounty', { prerequisites: { flags: ['metRowan'] } });
    assert.equal(W.acceptQuest('q_bounty'), null);
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Cannot accept "Bandit Bounty" yet: Requires: metRowan\./.test(e.what)));
    W.setFlag('metRowan', true);
    assert.equal(W.acceptQuest('q_bounty'), 'active');
    // item-started quest: appears when the item is picked up
    const q = W.addEntity('quest', { name: 'The Torn Map' }); W.updateEntity(q.id, { title: 'The Torn Map', startItem: 'Torn Map' });
    assert.ok(!W.listQuests('player').some(x => x.id === q.id));
    W.applyTags('<give>Torn Map</give>');
    assert.ok(W.listQuests('player').some(x => x.id === q.id && x.startItem === 'Torn Map'));
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /The Torn Map starts a quest: The Torn Map\./.test(e.what)));
    W.disconnect('q_merchant', 'q_bounty');
    assert.deepEqual(plain(W.getGraph().edges.filter(e => e.kind === 'unlocks')), []);
});

test('reputation: rewards, tags, effects, triggers and conditions; tiers reach the AI and the Quest log', async (t) => {
    const { w, W } = await personaWorld(t, { persona: false });
    const guard = W.reputation().find(r => /Guard/.test(r.name)); assert.ok(guard, 'the example has a guard faction');
    assert.equal(guard.tier, 'Neutral');
    // quest reward
    W.updateEntity('q_merchant', { rewards: [W.parseReward(`rep ${guard.name} +150`)] });
    assert.equal(W.listQuests('gm').find(q => q.id === 'q_merchant').rewards[0].factionId, guard.id);
    W.acceptQuest('q_merchant'); W.completeQuest('q_merchant'); W.turnInQuest('q_merchant');
    assert.equal(W.reputation().find(r => r.id === guard.id).tier, 'Friendly');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => new RegExp(`Reputation with ${guard.name} \\+150 — now Friendly\\.`).test(e.what)));
    // the AI: a reputation section and the attitude of the faction's members
    assert.match(W.preview(), new RegExp(`\\[Reputation\\]\\n- ${guard.name}: Friendly — welcoming`));
    // a trigger on reaching Honored; the tag; a condition field
    const ev = W.addEntity('event', { name: 'Knighted' });
    W.updateEntity(ev.id, { triggers: [{ type: 'onReputation', factionId: guard.id, tier: 'Honored' }], effects: [{ type: 'flag', key: 'honored', value: true }] });
    W.applyTags(`<rep>${guard.name}=+400</rep>`);
    assert.equal(W.reputation().find(r => r.id === guard.id).tier, 'Honored');
    assert.equal(W.runtime.flags.honored, true, 'onReputation fired');
    // an event effect lowers another faction's standing, guarded by a tier condition
    const bandits = W.reputation().find(r => r.id !== guard.id);
    const raid = W.addEntity('event', { name: 'Raid the camp' });
    W.updateEntity(raid.id, { triggers: [{ type: 'manual' }], conditions: [{ field: 'tier.' + guard.id, op: '==', value: 'Honored' }], effects: [{ type: 'reputation', factionId: bandits.id, amount: -1200 }] });
    W.fireTriggers('manual:' + raid.id);
    const b = W.reputation().find(r => r.id === bandits.id);
    assert.equal(b.tier, 'Hated'); assert.equal(b.hostile, true);
    // the Quest log window lists the standings
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    const win = w.document.querySelector('[data-window="questlog"]');
    assert.equal(win.querySelector(`[data-rep="${guard.id}"] [data-tier]`).textContent, 'Honored');
    assert.equal(win.querySelector(`[data-rep="${bandits.id}"] [data-tier]`).textContent, 'Hated');
    // starting reputation of a faction
    W.updateEntity(bandits.id, { startReputation: -400 });
    assert.equal(W.reputation().find(r => r.id === bandits.id).value, -1200, 'story standing wins once it exists');
});

test('acceptance: the example chain start to finish — rewards, reputation, zones, a fight, phasing', async (t) => {
    const { h, w, W, C } = await personaWorld(t, { level: 1 });
    const mk = (id) => plain(W.questMarkerInfo(id, 'player'));
    W.moveTo('The Crooked Kettle');
    assert.match(W.preview(), /\[Current Location: The Crooked Kettle\]\nPart of: Brookvale › Millbrook Village/);
    assert.deepEqual(mk('npc_bram'), { mark: '!', grey: false });
    assert.ok(!W.listQuests('player').some(q => q.id === 'q_bounty'), 'the bounty waits for the merchant quest');
    // 1. The Missing Merchant: go to the road, report to Rowan
    W.acceptQuest('q_merchant');
    assert.deepEqual(mk('npc_rowan'), { mark: '?', grey: true });
    W.moveTo('Forest Road');
    assert.match(W.preview(), /Part of: Brookvale/);
    W.moveTo('Royal Watchtower');
    w.gametext_arr.push('I tell Captain Rowan about the burned cart on the road.');
    await w.prepare_submit_generation();
    assert.equal(W.questState('q_merchant'), 'complete');
    assert.deepEqual(mk('npc_rowan'), { mark: '?', grey: false });
    W.turnInQuest('q_merchant');
    // 2. Bandit Bounty is unlocked: Rowan offers it
    assert.deepEqual(mk('npc_rowan'), { mark: '!', grey: false });
    W.acceptQuest('q_bounty');
    W.moveTo('Bandit Camp');
    h.seedRandom([0.5]);
    W.startSavedEncounter('Red Hand ambush');
    const cb = W.getCombat();
    assert.deepEqual(plain(cb.order.map(o => o.name).sort()), ['Bandit 1', 'Bandit 2', 'Bandit Leader Kell', 'Kara'], 'the persona fights, not the example world default player');
    for (const o of cb.order.filter(o => o.side === 'enemy')) W.damage(o.id, 99);
    assert.equal(W.getCombat().outcome, 'victory');
    W.endEncounter();
    assert.equal(W.questState('q_bounty'), 'complete', 'defeating Kell completed the objective');
    assert.equal(W.turnInQuest('q_bounty', 1), 'turnedin');
    // rewards on the sheet
    await C.flushSheet('Kara'); await sleep(30); await C.flushSheet('Kara');
    const s = await C.loadSheet('Kara');
    assert.ok(s.inventory.some(i => i.name === 'Silver Ring') && s.inventory.some(i => i.name === 'Shield'));
    assert.equal(s.coins.gp, 5 + 20 + 50);
    assert.ok(s.xp >= 300 + cb.xp, 'quest XP + combat XP');
    // reputation
    const rep = Object.fromEntries(W.reputation().map(r => [r.id, r.tier]));
    assert.equal(rep.fac_guard, 'Friendly'); assert.equal(rep.fac_bandit, 'Hostile');
    // phasing: the camp is abandoned, Kell is gone, the village celebrates, Rowan relaxes
    const p = W.preview();
    assert.match(p, /\[Current Location: Abandoned Camp\]\nPart of: Brookvale\nCold fire pits/);
    assert.doesNotMatch(p, /Bandit Leader Kell/);
    assert.match(p, /\[Reputation\]\n- Royal Guard: Friendly[\s\S]*- The Red Hand: Hostile — hostile/);
    W.moveTo('Millbrook Village');
    assert.match(W.preview(), /Millbrook is celebrating[\s\S]*Atmosphere: festive[\s\S]*A hub: travellers/);
    assert.equal(W.phased('npc_rowan').mood, 'grateful, relaxed');
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    assert.equal(w.document.querySelector('[data-window="questlog"] [data-chosen="q_bounty"]').textContent, 'Shield', 'the chosen reward is shown');
});

test('zones and phases: no cycles, places within, exits to the zone; conditions in readable kinds', async (t) => {
    const { W } = await personaWorld(t, { persona: false });
    assert.equal(W.setLocationParent('loc_vale', 'loc_tavern'), false, 'a zone cannot sit inside its own place');
    assert.deepEqual(plain(W.zonePath('loc_tavern').map(z => z.name)), ['Brookvale', 'Millbrook Village']);
    W.moveTo('Millbrook Village');
    assert.match(W.preview(), /Places within: The Crooked Kettle/);
    W.moveTo('The Crooked Kettle');
    assert.match(W.preview(), /Exits: [^\n]*Millbrook Village/);
    // visiting a zone counts any place inside it
    W.updateEntity('q_merchant', { objectives: [{ id: 'z', kind: 'visit', target: 'loc_vale', text: 'Reach Brookvale' }] });
    W.acceptQuest('q_merchant');
    assert.equal(W.questState('q_merchant'), 'complete', 'already inside Brookvale');
    // readable conditions
    W.setFlag('raid', true);
    assert.equal(W.evalCondition({ type: 'flag', key: 'raid' }), true);
    assert.equal(W.evalCondition({ type: 'flag', key: 'raid', value: 'false' }), false);
    assert.equal(W.evalCondition({ type: 'quest', questId: 'q_merchant', state: 'complete' }), true);
    assert.equal(W.evalCondition({ type: 'reputation', factionId: 'fac_bandit', tier: 'Unfriendly' }), true, 'Red Hand starts at -400 (Hostile) — "or worse"');
    assert.equal(W.evalCondition({ type: 'reputation', factionId: 'fac_guard', tier: 'Friendly' }), false);
    assert.equal(W.evalCondition({ type: 'location', locationId: 'loc_tavern' }), true);
});

test('editor: zone and hub on a location, a phase with a condition, event conditions', async (t) => {
    const { h, w, W } = await personaWorld(t, { persona: false });
    const { selectNode } = require('./helpers/host');
    h.ui().openEditor(); await sleep(20);
    selectNode(h, 'loc_watchtower');
    const ed = w.document.getElementById('wm-editor');
    const zone = ed.querySelector('select[aria-label="Part of zone"]');
    zone.value = 'loc_vale'; zone.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('loc_watchtower').parentId, 'loc_vale');
    const hub = ed.querySelector('input[aria-label="Hub"]'); hub.checked = true; hub.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('loc_watchtower').hub, true);
    ed.querySelector('[data-add-phase="location"]').click(); await sleep(10);
    const ph = W.entityById('loc_watchtower').phases;
    assert.equal(ph.length, 1); assert.equal(ph[0].conditions[0].type, 'flag');
    const desc = ed.querySelector('textarea[aria-label="Phase Description"]');
    desc.value = 'The tower flies a black flag.'; desc.dispatchEvent(new w.Event('change'));
    W.updateEntity('loc_watchtower', { phases: [Object.assign({}, W.entityById('loc_watchtower').phases[0], { conditions: [{ type: 'flag', key: 'mourning' }] })] });
    assert.equal(W.phased('loc_watchtower').description, 'A stone tower guarding the frontier road.');
    W.setFlag('mourning', true);
    assert.equal(W.phased('loc_watchtower').description, 'The tower flies a black flag.');
    selectNode(h, 'ev_ambush');
    assert.ok([...ed.querySelectorAll('div')].some(d => /Conditions \(all must hold/.test(d.textContent)), 'event conditions are editable');
});

test('loading the example again keeps the saved (maybe edited) example and adds a fresh copy', async (t) => {
    const { W } = await personaWorld(t, { persona: false });
    W.updateEntity('loc_village', { description: 'My own village text.' });
    await W.saveActiveWorld();
    const id2 = await W.loadExample();
    assert.equal(id2, 'world_example_2');
    assert.equal(W.activeWorld().name, 'Eldoria (Example 2)');
    const names = plain(W.listWorlds().map(x => x.name));
    assert.ok(names.includes('Eldoria (Example)') && names.includes('Eldoria (Example 2)'));
    await W.useWorld('world_example');
    assert.equal(W.entityById('loc_village').description, 'My own village text.', 'the edited example is untouched');
});
