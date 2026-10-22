'use strict';
// Worlds engine: slice/injection, chat tags, clock, two-slot state, persistence,
// import/export, persons.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

async function exampleHost(opts) {
    const h = createHost(opts);
    h.load('worlds');
    await h.ready();
    await h.api().loadExample();
    return h;
}

test('active slice contains premise, rules, time, location, NPCs, lore', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.moveTo('The Crooked Kettle');
    const s = W.preview();
    assert.match(s, /\[World: Eldoria \(Example\)\]/);
    assert.match(s, /\[World Rules\][\s\S]*Medieval low-fantasy/);
    assert.match(s, /\[Current Time\]/);
    assert.match(s, /\[Current Location: The Crooked Kettle\]/);
    assert.match(s, /Innkeeper Bram/);
    assert.match(s, /The kingdom of Eldoria is ruled/); // always-on global lore
    assert.ok(s.indexOf('[World:') < s.indexOf('[Current Location'), 'premise leads');
    W.updateEntity('__world__', { description: '' });
    assert.doesNotMatch(W.preview(), /\[World:/, 'no premise when description empty');
});

test('chat tags mutate state; clock derives season', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.applyTags('<move>Forest Road</move><flag>metBram=true</flag><give>Torch x2</give>');
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    assert.equal(W.runtime.flags.metBram, true);
    assert.ok(W.runtime.inventory.some(i => i.name === 'Torch' && i.qty === 2));
    W.applyTags('<take>Torch x1</take>');
    assert.ok(W.runtime.inventory.some(i => i.name === 'Torch' && i.qty === 1), '<take> with count decrements');
    // Known issue 9 (decided 2026-09-25): <take> without a count removes one, like <give> adds one;
    // "x all" removes the stack.
    W.applyTags('<give>Torch x3</give><take>Torch</take>');
    assert.equal(W.runtime.inventory.find(i => i.name === 'Torch').qty, 3, '1 + 3 − 1');
    W.applyTags('<take>Torch x all</take><unflag>metBram</unflag><time>evening</time><weather>rain</weather>');
    assert.ok(!W.runtime.inventory.some(i => i.name === 'Torch'));
    assert.ok(!('metBram' in W.runtime.flags));
    assert.equal(W.runtime.clock.time, 'evening');
    assert.equal(W.runtime.clock.weather, 'rain');
    W.setClock({ time: 'night', day: 30, month: 5 });
    W.advanceClock(1);
    assert.equal(W.runtime.clock.time, 'morning');
    assert.equal(W.runtime.clock.day, 1);
    assert.equal(W.runtime.clock.month, 6);
    assert.equal(W.runtime.clock.season, 'summer');
});

test('two-slot runtime: commit, reset, swap, deep clones', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    assert.equal(W.activeSlot, 'working');
    assert.equal(W.runtimeSlots.base.playerLocationId, 'loc_village', 'example start is the base');
    W.moveTo('Forest Road'); W.setFlag('x', 1); W.giveItem('Sword');
    W.resetToBase();
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    assert.ok(!('x' in W.runtime.flags));
    W.moveTo('Forest Road'); W.commitToBase();
    W.runtime.flags.mut = 1;
    assert.equal(W.runtimeSlots.base.flags.mut, undefined, 'slots do not share references');
    W.moveTo('Millbrook Village');
    assert.equal(W.swapActive(), 'base');
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    W.swapActive();
    assert.equal(W.runtime.playerLocationId, 'loc_village');
});

test('two-slot runtime: Reset and Swap do not replay chat tags already applied', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api(); const w = h.window;
    // the chat so far: one reply moved the player and gave an item
    w.gametext_arr.push('We head out. <move>Forest Road</move><flag>left=true</flag><give>Torch x2</give>');
    await w.prepare_submit_generation();
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    assert.equal(W.runtime.inventory.find(i => i.name === 'Torch').qty, 2);

    // back to the start: the chat is not rewound, so its tags must not come back
    W.resetToBase();
    await w.prepare_submit_generation();
    assert.equal(W.runtime.playerLocationId, 'loc_village', 'Reset is not undone by the next turn');
    assert.ok(!('left' in W.runtime.flags));
    assert.ok(!W.runtime.inventory.some(i => i.name === 'Torch'), 'no item given a second time');

    // switching to the start state does not replay them into it either
    W.swapActive();
    await w.prepare_submit_generation();
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    W.swapActive();

    // new replies still apply as usual
    w.gametext_arr.push('On we go. <move>Forest Road</move>');
    await w.prepare_submit_generation();
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
});

test('a world enabled in the middle of a chat does not apply that chat\'s older tags', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    const w = h.window; const W = h.api();
    w.gametext_arr.push('An old story. <move>Forest Road</move><give>Old Coin</give>');
    await W.loadExample();
    await w.prepare_submit_generation();
    assert.equal(W.runtime.playerLocationId, 'loc_village', 'the example starts in its village');
    assert.ok(!W.runtime.inventory.some(i => i.name === 'Old Coin'));
});

test('persistence: save round-trip and legacy migration', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api();
    W.moveTo('Forest Road'); W.setFlag('k', 'v'); W.setActiveSlot('base');
    const st = W.collectSaveState();
    assert.ok(st.runtime.base && st.runtime.working);
    W._state.runtime = null; W._state.activeWorldId = null; W.config.enabled = false;
    W.restoreSaveState(st);
    assert.equal(W.activeSlot, 'base');
    assert.equal(W.runtimeSlots.working.flags.k, 'v');
    assert.ok(W.isEnabled());
    // pre-two-slot saves stored a flat runtime
    W.restoreSaveState({ version: 1, enabled: true, activeWorldId: W._state.activeWorldId,
        runtime: { playerLocationId: 'loc_forest', flags: { legacy: true }, clock: { day: 3 } } });
    assert.equal(W.runtime.flags.legacy, true);
    assert.equal(W.runtimeSlots.base.playerLocationId, 'loc_forest');
    assert.equal(W.runtime.clock.day, 3);
    assert.ok(Array.isArray(W.runtime.inventory), 'missing fields filled from defaults');
});

test('injection lifecycle: transient, websearch, agent mode, persistent, saves', async (t) => {
    const h = await exampleHost(); t.after(h.close);
    const W = h.api(); const w = h.window;
    w.current_wi.push({ key: 'classic', content: 'classic entry', wigroup: '' });

    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[Current Location/, 'host saw the slice');
    assert.equal(h.worldsEntries().length, 0, 'transient: cleaned after a sync generation');
    assert.equal(w.current_wi[0].content, 'classic entry', 'classic WI untouched');

    w.localsettings.websearch_enabled = true; w.is_using_kcpp_with_websearch = () => true;
    await w.prepare_submit_generation();
    assert.ok(h.worldsEntries().length > 0, 'websearch: kept for the async turn');
    w.localsettings.websearch_enabled = false;

    w.localsettings.opmode = 4; w.localsettings.agentBehaviour = true;
    await w.prepare_submit_generation();
    assert.ok(h.worldsEntries().length > 0, 'agent mode: kept for tool-loop continuations');
    await w.submit_generation(''); // agent loop calls this directly
    assert.match(h.prompt, /\[World Rules\]/);
    w.localsettings.opmode = 1; w.localsettings.agentBehaviour = false;

    W.config.injectMode = 'persistent'; W.refresh();
    assert.ok(h.worldsEntries().length > 0, 'persistent: entries live');
    const save = w.generate_savefile();
    assert.equal(save.worldinfo.filter(e => e.wigroup === '__rpmod__' || e.wigroup === '__worlds__').length, 0, 'saves strip managed entries');
    assert.ok(save.worldinfo.some(e => e.content === 'classic entry'));
    assert.ok(save.rpmod_worlds, 'runtime embedded in save');
    W.disable();
    assert.equal(h.worldsEntries().length, 0, 'disable removes managed entries');
});

test('import lorebook, promote node type, export as WorldInfo', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    const W = h.api();
    const n = await W.importLorebook({ data: { name: 'Card', character_book: { entries: [
        { keys: ['village'], content: 'A farming village.', comment: 'Village' },
        { keys: ['king'], content: 'The King rules.', comment: 'King', constant: true } ] } } });
    assert.equal(n, 2);
    const lore = W.activeWorld().globalLore.find(l => l.label === 'Village');
    assert.ok(W.changeEntityType(lore.id, 'location'));
    assert.equal(W.entityType(lore.id), 'location');
    assert.equal(W.entityById(lore.id).description, 'A farming village.');
    const wi = W.exportWorldAsWI();
    assert.ok(wi.some(e => e.content.includes('[Location: Village]')));
    assert.ok(wi.some(e => e.content.includes('The King rules') && e.constant === true));
});

test('persons: library character link, stats in slice, export snapshot', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [{ id: 'c1', name: 'Captain Rowan', personality: 'stern, dutiful' }] };
    h.load('worlds'); await h.ready();
    const W = h.api();
    await W.newWorld('P');
    const tavern = W.addEntity('location', { name: 'Tavern' });
    const p = W.addEntity('npc', { name: '' });
    W.connect(p.id, tavern.id);
    W.enable(); W.moveTo('Tavern');
    W.linkCharacter(p.id, 'Captain Rowan');
    assert.equal(W.personName(p.id), 'Captain Rowan');
    W.setStats(p.id, { abilities: { str: 16 }, ac: 16, hpMax: 30, attacks: [{ name: 'Longsword' }] });
    assert.equal(W.abilityMod(16), 3);
    const s = W.preview();
    assert.match(s, /Captain Rowan/);
    assert.match(s, /stern/);
    assert.match(s, /AC 16, HP 30/);
    const exp = W.exportWorld();
    assert.equal(exp.npcs.find(x => x.id === p.id).characterSnapshot.name, 'Captain Rowan');
});

// Never lose stored worlds: the API exists before the library has loaded from IndexedDB, and
// a corrupt stored library is kept aside instead of being overwritten.
test('library: a world created before the stored library has loaded does not overwrite it', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    h.eval(`__idb.set('KLITE_WORLDS_LIBRARY', JSON.stringify({ world_keep: { id: 'world_keep', name: 'Kept', locations: [] } }));
        const __slowLoad = indexeddb_load; indexeddb_load = function (k, d) { return new Promise(r => setTimeout(() => r(__slowLoad(k, d)), 150)); };`);
    h.load('worlds');
    h.window.dispatchEvent(new h.window.Event('load'));
    const W = h.window.KLITE_RPMod_Worlds;
    await new Promise(r => setTimeout(r, 30));   // init has started, the library is still loading
    const id = await W.newWorld('Early');
    await h.ready();
    const stored = JSON.parse(h.eval(`__idb.get('KLITE_WORLDS_LIBRARY')`));
    assert.deepEqual(Object.keys(stored).sort(), ['world_keep', id].sort(), 'both worlds stored');
    assert.deepEqual(Array.from(W.listWorlds(), x => x.name).sort(), ['Early', 'Kept']);
    assert.equal(W.activeWorld().id, id);
});

test('library: a corrupt stored library is kept aside, not overwritten', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    h.eval(`__idb.set('KLITE_WORLDS_LIBRARY', '{"world_a": {"id": "world_a", broken');`);
    h.load('worlds'); await h.ready();
    const W = h.api();
    await W.newWorld('Fresh');
    const keys = JSON.parse(h.eval(`JSON.stringify([...__idb.keys()])`));
    const backup = keys.find(k => /^KLITE_WORLDS_LIBRARY_corrupt_/.test(k));
    assert.ok(backup, 'the unreadable library is saved under a backup key');
    assert.equal(h.eval(`__idb.get(${JSON.stringify(backup)})`), '{"world_a": {"id": "world_a", broken');
    assert.deepEqual(Object.values(JSON.parse(h.eval(`__idb.get('KLITE_WORLDS_LIBRARY')`))).map(x => x.name), ['Fresh']);
});
