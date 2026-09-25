'use strict';
// R5: saved encounters as nodes of the world graph — edges to their place, the persons who fight
// and the events that start them; connect/disconnect/delete keep the data consistent; the
// editor's encounter inspector (monsters, place, enemy start, difficulty, start now).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, selectNode, sleep } = require('./helpers/host');

async function uiHost(t) {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [] };
    h.load('shell', 'worlds', 'worldsUI');
    await h.ready({ ui: true });
    await h.api().loadExample();
    return h;
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const edgesOf = (W, id) => plain(W.getGraph().edges.filter(e => e.from === id || e.to === id).map(e => [e.from === id ? e.to : e.from, e.kind]));

test('engine: encounters are graph nodes; connect, disconnect, delete, event effects', async (t) => {
    const h = await uiHost(t); const W = h.api();
    const enc = W.saveEncounter({ name: 'Wolf Pack', monsters: [{ key: 'wolf', count: 2 }] });
    const node = W.getGraph().nodes.find(n => n.id === enc.id);
    assert.deepEqual([node.type, node.name], ['encounter', 'Wolf Pack']);
    assert.equal(W.entityType(enc.id), 'encounter');

    const loc = W.addEntity('location', { name: 'Den' });
    const npc = W.addEntity('npc', { name: 'Bandit Chief' });
    const ev = W.addEntity('event', { name: 'Howling' });
    assert.equal(W.connect(enc.id, loc.id).kind, 'at');
    assert.equal(W.connect(npc.id, enc.id).kind, 'fights');
    assert.equal(W.connect(ev.id, enc.id).kind, 'starts');
    let e = W.entityById(enc.id);
    assert.equal(e.locationId, loc.id); assert.deepEqual(plain(e.personIds), [npc.id]);
    assert.deepEqual(plain(W.entityById(ev.id).effects), [{ type: 'encounter', value: enc.id }]);
    assert.deepEqual(plain(W.entityById(ev.id).triggers), [{ type: 'manual' }], 'a new event gets a manual trigger');
    assert.deepEqual(edgesOf(W, enc.id).sort(), [[ev.id, 'starts'], [loc.id, 'at'], [npc.id, 'fights']].sort());
    W.connect(ev.id, enc.id);
    assert.equal(W.entityById(ev.id).effects.length, 1, 'linking twice adds no second effect');

    // an older effect naming the encounter still draws the edge
    const ev2 = W.addEntity('event', { name: 'Old' }); W.updateEntity(ev2.id, { effects: [{ type: 'encounter', value: 'wolf pack' }] });
    assert.ok(edgesOf(W, enc.id).some(([id, k]) => id === ev2.id && k === 'starts'));

    // the event starts the encounter (with the person on the enemy side)
    W.fireTriggers('manual:' + ev.id);
    const cb = W.getCombat();
    assert.ok(cb && cb.active); assert.equal(cb.encounter, enc.id);
    assert.ok(cb.order.some(o => o.id === npc.id && o.side === 'enemy'));
    W.endEncounter();

    assert.equal(W.changeEntityType(enc.id, 'npc'), false, 'an encounter cannot become a story entity');
    assert.equal(W.changeEntityType(npc.id, 'encounter'), false);

    // saving from the Combat window keeps the node's place in the graph and its notes
    W.setNodePos(enc.id, 123, 456); W.updateEntity(enc.id, { notes: 'at dusk' });
    W.saveEncounter(Object.assign({}, W.entityById(enc.id), { monsters: [{ key: 'wolf', count: 3 }] }));
    e = W.entityById(enc.id);
    assert.deepEqual([e.ui.x, e.ui.y, e.notes, e.monsters[0].count], [123, 456, 'at dusk', 3]);
    const info = W.encounterInfo(enc.id);
    assert.equal(info.xp, 150); assert.equal(info.party.size, 1);

    W.disconnect(ev.id, enc.id);
    assert.deepEqual(plain(W.entityById(ev.id).effects), []);
    W.deleteEntity(npc.id);
    assert.deepEqual(plain(W.entityById(enc.id).personIds), [], 'deleting a person scrubs it');
    W.connect(ev.id, enc.id);
    assert.equal(W.deleteEncounter(enc.id), true);
    assert.deepEqual(plain(W.entityById(ev.id).effects), [], 'deleting the encounter scrubs the event effect');
    assert.equal(W.getGraph().nodes.some(n => n.id === enc.id), false);
});

test('editor: add an encounter node, pick monsters, place and start, see the difficulty, start it', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    h.ui().openEditor();
    const ed = () => doc.getElementById('wm-editor');
    click(ed().querySelector('[data-add-type="encounter"]'), w);
    const enc = W.listEncounters().find(e => e.name === 'New encounter');
    assert.ok(enc, 'the palette adds an encounter');
    assert.ok(doc.querySelector(`#wm-editor g[data-id="${enc.id}"]`), 'drawn in the graph');
    selectNode(h, enc.id);
    assert.match(ed().querySelector('[data-enc="difficulty"]').textContent, /no monsters yet/);
    assert.ok(ed().querySelector('[data-enc="start-now"]').disabled, 'nothing to fight yet');
    const addMonster = async (text, key) => {   // the inspector re-renders after each change
        const q = ed().querySelector('[data-enc="search"]');
        q.value = text; q.dispatchEvent(new w.Event('input'));
        click(ed().querySelector(`[data-enc-add="${key}"]`), w); await sleep(10);
    };
    await addMonster('goblin warrior', 'goblin-warrior');
    await addMonster('goblin warrior', 'goblin-warrior');
    assert.deepEqual(plain(W.entityById(enc.id).monsters), [{ key: 'goblin-warrior', count: 2 }]);
    assert.match(ed().querySelector('[data-enc="difficulty"]').textContent, /High · 100 XP/);
    assert.equal(W.entityById(enc.id).difficulty, 'high');
    const loc = ed().querySelector('[data-enc="location"]');
    loc.value = 'loc_forest'; loc.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById(enc.id).locationId, 'loc_forest');
    const st = ed().querySelector('[data-enc="start"]');
    st.value = 'outside'; st.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById(enc.id).start, 'outside');
    click(ed().querySelector('[data-enc-monster="goblin-warrior"] [aria-label="One less"]'), w);
    assert.equal(W.entityById(enc.id).monsters[0].count, 1);
    click(ed().querySelector('[data-enc="start-now"]'), w);
    assert.ok(W.getCombat() && W.getCombat().active, 'started from the editor');
    assert.equal(W.getCombat().encounter, enc.id);
});
