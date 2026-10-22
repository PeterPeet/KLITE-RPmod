'use strict';
// Trigger bus: event triggers/conditions/effects, chains, loop safety, hidden events,
// faction HQ.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

async function exampleHost() {
    const h = createHost();
    h.load('worlds'); await h.ready();
    await h.api().loadExample();
    return h;
}

test('example chain: accepting a quest makes the courier arrive with a new quest', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.acceptQuest('q_merchant');
    assert.ok(W.firedEvents().includes('ev_courier'));
    assert.equal(W.runtime.npcStateOverrides.npc_courier.locationId, 'loc_tavern');
    assert.equal(W.questState('q_delivery'), 'available');
    assert.ok(W.runtime.discovered.quests.includes('q_delivery'));
});

test('condition gate: the ambush only fires on the forest road at night', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.moveTo('Forest Road');
    assert.ok(!W.runtime.flags.ambush_ready, 'not by day');
    W.moveTo('Millbrook Village'); W.setClock({ time: 'night' }); W.moveTo('Forest Road');
    assert.equal(W.runtime.flags.ambush_ready, true);
});

test('faction HQ is noted at its location', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.moveTo('Royal Watchtower');
    assert.match(W.preview(), /Headquarters of: Royal Guard/);
    W.moveTo('Millbrook Village');
    assert.doesNotMatch(W.preview(), /Headquarters of: Royal Guard/);
});

test('fireEvent chains and cross-firing events terminate', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    const W = h.api();
    await W.newWorld('Chains'); W.addEntity('location', { name: 'Here' }); W.enable(); W.moveTo('Here');
    const a = W.addEntity('event', { name: 'A' }), b = W.addEntity('event', { name: 'B' });
    W.updateEntity(a.id, { triggers: [{ type: 'onFlag', key: 'go' }], effects: [{ type: 'fireEvent', eventId: b.id }] });
    W.updateEntity(b.id, { triggers: [{ type: 'manual' }], effects: [{ type: 'flag', key: 'bDone', value: true }] });
    W.setFlag('go', true);
    assert.equal(W.runtime.flags.bDone, true, 'A -> B chained');
    const x = W.addEntity('event', { name: 'X' }), y = W.addEntity('event', { name: 'Y' });
    W.updateEntity(x.id, { triggers: [{ type: 'manual' }], effects: [{ type: 'fireEvent', eventId: y.id }] });
    W.updateEntity(y.id, { triggers: [{ type: 'manual' }], effects: [{ type: 'fireEvent', eventId: x.id }] });
    W.fireTriggers('manual:' + x.id); // must return, not loop forever
});

test('hidden events respect aiMode; onTime events fire on the generation turn', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api(); const w = h.window;
    W.moveTo('Bandit Camp'); // fires the hidden, repeatable "Ill Omen"
    W.setAiMode('gm');
    assert.match(W.preview(), /Ill Omen/);
    W.setAiMode('player');
    assert.doesNotMatch(W.preview(), /Ill Omen/);
    W.setAiMode('gm');

    const ev = W.addEntity('event', { name: 'Night Market' });
    W.updateEntity(ev.id, { description: 'Stalls open.', repeatable: true, triggers: [{ type: 'onTime', time: 'night' }] });
    W.setClock({ time: 'noon' });
    await w.prepare_submit_generation();
    assert.doesNotMatch(h.prompt, /Night Market/);
    W.setClock({ time: 'night' });
    await w.prepare_submit_generation();
    assert.match(h.prompt, /Night Market/);
});

test('an Esolite slash command (user-callable custom tool) is not a game turn', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api(); const w = h.window;
    W.activeWorld().events.push({ id: 'ev_tick', name: 'Tick', triggers: [{ type: 'onTurn' }],
        effects: [{ type: 'flag', key: 'ticked', value: true }], repeatable: true });
    // host >= 1.35: slash commands run a custom tool and return without generating
    w.localsettings.custom_tools = [{ name: 'roll', userCallable: true }];
    w.customtools_sanitize_list = (tools) => tools || [];
    const input = w.document.createElement('textarea'); input.id = 'input_text';
    w.document.body.appendChild(input);

    input.value = '/roll 1d20';
    await w.prepare_submit_generation();
    assert.ok(!W.runtime.flags.ticked, 'slash command did not fire turn triggers');

    input.value = '/unknown text';   // not a registered tool -> normal turn
    await w.prepare_submit_generation();
    assert.equal(W.runtime.flags.ticked, true, 'a normal message is a turn');
});
