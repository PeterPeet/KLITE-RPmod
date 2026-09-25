'use strict';
// R8: the travelling party — people the author marked "can join" join the player when they are
// here (API, <join>/<leave> tags, /join, the Party section), travel with the player, fight on the
// party side and stay where the party parts.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, sleep } = require('./helpers/host');

const plain = (v) => JSON.parse(JSON.stringify(v));

async function exampleHost(t, load = ['worlds']) {
    const h = createHost(); t.after(h.close);
    h.load(...load); await h.ready({ ui: load.includes('worldsUI') });
    await h.api().loadExample();
    return h;
}

test('join: only people who can join, only when they are here; then they travel along and leave where you part', async (t) => {
    const h = await exampleHost(t); const W = h.api();
    W.moveTo('The Crooked Kettle');
    assert.equal(W.joinParty('Innkeeper Bram').ok, false, 'not marked "can join"');
    W.updateEntity('npc_bram', { canJoin: true });
    W.moveTo('Millbrook Village');
    assert.match(W.joinParty('Innkeeper Bram').reason, /not here/, 'the tavern is not "here" from the village square');
    W.moveTo('The Crooked Kettle');
    const r = W.joinParty('Bram');
    assert.equal(r.ok, true); assert.equal(r.person, 'Innkeeper Bram');
    assert.deepEqual(plain(W.partyMembers()), [{ id: 'npc_bram', name: 'Innkeeper Bram' }]);
    assert.equal(W.joinParty('npc_bram').already, true, 'joining twice is harmless');

    W.moveTo('Forest Road');
    assert.ok(W.isHere('npc_bram'), 'travels with the player');
    assert.match(W.preview(), /Innkeeper Bram[^\n]*travels with the player \(party\); if they part ways, write <leave>Innkeeper Bram<\/leave>/);
    assert.match(W.preview(), /Party: Innkeeper Bram/);

    assert.equal(W.leaveParty('Bram').ok, true);
    W.moveTo('Millbrook Village');
    assert.ok(!W.isHere('npc_bram'));
    W.moveTo('Forest Road');
    assert.ok(W.isHere('npc_bram'), 'stays where the party parted');
    assert.equal(W.leaveParty('Bram').ok, false, 'not in the party any more');
    assert.equal(W.joinParty('Bandit Leader Kell').ok, false, 'monsters never join');
});

test('join: the AI\'s tags and hint, fighting on the party side, saved with the story', async (t) => {
    const h = await exampleHost(t); const W = h.api(); const w = h.window;
    W.updateEntity('npc_bram', { canJoin: true });
    W.moveTo('The Crooked Kettle');
    assert.match(W.preview(), /may join the player: when they agree to travel together, write <join>Innkeeper Bram<\/join>/);
    w.gametext_arr.push('Bram unties his apron. "Fine, I\'m coming." <join>Innkeeper Bram</join>');
    await w.prepare_submit_generation();
    assert.deepEqual(plain(W.runtime.party), ['npc_bram']);
    W.startEncounter(['npc_bram'], { monsters: [{ key: 'wolf' }], zones: false });
    assert.equal(W.getCombat().order.find(o => o.id === 'npc_bram').side, 'party', 'a party member fights on your side');
    W.endEncounter();
    const save = w.generate_savefile();
    w.gametext_arr.push('"I\'ll mind the inn." <leave>Innkeeper Bram</leave>');
    await w.prepare_submit_generation();
    assert.deepEqual(plain(W.runtime.party), []);
    w.kai_json_load(save);
    assert.deepEqual(plain(W.runtime.party), ['npc_bram'], 'the party is part of the saved story');
});

test('join: the Party section offers "Ask … to join" and a leave button; the editor marks who can join', async (t) => {
    const h = await exampleHost(t, ['shell', 'worlds', 'worldsUI']); const W = h.api(); const w = h.window; const doc = w.document;
    const party = () => doc.querySelector('[data-section="party"]');
    W.moveTo('The Crooked Kettle'); await sleep(40);
    assert.equal(party().querySelector('[data-ui="join-party"]'), null, 'no one here can join yet');
    h.ui().openEditor();
    const { selectNode } = require('./helpers/host');
    selectNode(h, 'npc_bram');
    const cb = doc.querySelector('#wm-editor [data-person="can-join"]');
    cb.checked = true; cb.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById('npc_bram').canJoin, true);
    h.ui().closeEditor();
    w.KLITE_RPMod_Shell.refresh(['party']); await sleep(40);
    click(party().querySelector('[data-ui="join-party"]'), w); await sleep(40);
    assert.deepEqual(plain(W.runtime.party), ['npc_bram']);
    w.KLITE_RPMod_Shell.refresh(['party']); await sleep(40);
    assert.ok(party().querySelector('[data-party-member="npc_bram"]'), 'shown as a companion');
    click(party().querySelector('[data-ui="leave-party"]'), w); await sleep(40);
    assert.deepEqual(plain(W.runtime.party), []);
});
