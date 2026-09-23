'use strict';
// Quests: node type, giver/turn-in markers, state machine, hidden/aiMode/discovery.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

async function exampleHost() {
    const h = createHost();
    h.load('worlds'); await h.ready();
    await h.api().loadExample();
    return h;
}

test('quest graph: node type and giver/turn-in edges', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    assert.equal(W.entityType('q_merchant'), 'quest');
    const g = W.getGraph();
    assert.ok(g.edges.some(e => e.from === 'q_merchant' && e.to === 'npc_bram' && e.kind === 'gives'));
    assert.ok(g.edges.some(e => e.from === 'q_merchant' && e.to === 'npc_rowan' && e.kind === 'turnin'));
});

test('lifecycle: ! -> accept -> active in slice -> complete -> ? -> turn in', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    assert.equal(W.personQuestMarker('npc_bram'), '!');
    W.acceptQuest('q_merchant');
    assert.equal(W.questState('q_merchant'), 'active');
    assert.equal(W.runtime.activeQuestId, 'q_merchant', 'first accepted quest is tracked');
    assert.match(W.preview(), /The Missing Merchant \[active\] \[tracked\]/);
    assert.equal(W.personQuestMarker('npc_bram'), '', 'giver ! clears once accepted');
    W.completeQuest('q_merchant');
    assert.equal(W.personQuestMarker('npc_rowan'), '?');
    W.turnInQuest('q_merchant');
    assert.equal(W.questState('q_merchant'), 'turnedin');
    assert.equal(W.runtime.activeQuestId, null);
});

test('hidden quests respect aiMode and discovery', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.setQuestState('q_delivery', 'active');
    W.setAiMode('gm');
    assert.match(W.preview(), /Urgent Delivery/, 'GM sees hidden quest');
    W.setAiMode('player');
    assert.doesNotMatch(W.preview(), /Urgent Delivery/, 'player-facing AI does not');
    assert.ok(!W.listQuests('player').some(q => q.id === 'q_delivery'));
    assert.ok(W.listQuests('creator').some(q => q.id === 'q_delivery'));
    W.discoverQuest('q_delivery');
    assert.match(W.preview(), /Urgent Delivery/, 'discovered quest becomes visible');
});
