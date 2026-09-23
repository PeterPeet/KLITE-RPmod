'use strict';
// src/context/context.js — the single owner of RPmod's per-turn prompt context:
// providers, ordering/dedupe, the one prepare_submit_generation wrapper, direct-submit
// turns (run), transient cleanup, save stripping; plus ALPHA's 'characters' provider.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

async function worldsHost(t) {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [{ id: 'c1', name: 'Captain Rowan', personality: 'stern, fair, tired of bandits' }] };
    h.load('worlds');
    await h.ready();
    return h;
}
const managed = (w) => w.current_wi.filter(e => e && e.wigroup === '__rpmod__');

test('context: one wrapper, providers ordered by priority, transient cleanup, saves stripped', async (t) => {
    const h = await worldsHost(t); const w = h.window; const C = w.KLITE_RPMod_Context; const W = h.api();
    assert.ok(C, 'context attached');
    assert.equal(w.prepare_submit_generation.__rpmod_context, true, 'context owns the prepare hook');
    assert.equal(w.prepare_submit_generation.__worlds_wrapped, undefined, 'Worlds no longer wraps it itself');
    const hook = w.prepare_submit_generation;
    C.install();
    assert.equal(w.prepare_submit_generation, hook, 'install is idempotent');

    const turns = [];
    C.register({ id: 'test', order: 5, beforeTurn: () => turns.push('before'), afterTurn: () => turns.push('after'),
        collect: () => [{ title: 'Low', priority: 1, text: 'low text' }, { title: 'High', priority: 99, text: 'high text' }] });
    await W.loadExample(); W.moveTo('The Crooked Kettle');
    await w.prepare_submit_generation();
    assert.deepEqual(turns, ['before', 'after']);
    const p = h.prompt;
    assert.ok(p.indexOf('[High]') < p.indexOf('[Current Location: The Crooked Kettle]'), 'priority 99 before location (80)');
    assert.ok(p.indexOf('[Current Location') < p.indexOf('[Low]'), 'priority 1 last');
    assert.equal(managed(w).length, 0, 'transient: removed after the turn');

    // persistent (Worlds' injectMode) keeps every provider's entries live; saves never contain them
    W.config.injectMode = 'persistent'; W.refresh();
    assert.ok(managed(w).some(e => e.comment === '__rpmod__:test') && managed(w).some(e => e.comment === '__rpmod__:worlds'));
    w.current_wi.push({ wigroup: '__worlds__', content: 'legacy entry', constant: true });
    const save = w.generate_savefile();
    assert.equal(save.worldinfo.filter(e => e.wigroup === '__rpmod__' || e.wigroup === '__worlds__').length, 0);
    W.config.injectMode = 'transient'; W.disable();
    assert.equal(managed(w).filter(e => e.comment === '__rpmod__:worlds').length, 0);
});

test('context: a fully described character is not repeated by Worlds; failing providers are isolated', async (t) => {
    const h = await worldsHost(t); const w = h.window; const C = w.KLITE_RPMod_Context; const W = h.api();
    await W.newWorld('D');
    const inn = W.addEntity('location', { name: 'Inn' });
    const p = W.addEntity('npc', { name: '' });
    W.linkCharacter(p.id, 'c1'); W.connect(p.id, inn.id); W.enable(); W.moveTo('Inn');
    assert.match(C.preview(), /Captain Rowan \| stern, fair/, 'blurb from the linked card');

    C.register({ id: 'boom', order: 1, collect: () => { throw new Error('provider bug'); } });
    C.register({ id: 'chars', order: 10, collect: (ctx) => { ctx.describe('captain rowan'); return [{ title: 'Character: Captain Rowan', priority: 87, text: 'Description: the full card' }]; } });
    const errors = []; const origErr = w.console.error; w.console.error = (...a) => errors.push(a.join(' '));
    try { await w.prepare_submit_generation(); } finally { w.console.error = origErr; }
    assert.match(h.prompt, /\[Character: Captain Rowan\]\nDescription: the full card/);
    assert.match(h.prompt, /- Captain Rowan\n|- Captain Rowan$/m, 'still listed as present');
    assert.doesNotMatch(h.prompt, /stern, fair/, 'card not repeated in Nearby NPCs');
    assert.ok(errors.some(e => /boom/.test(e)), 'provider error logged');
});

test('context: run() makes a direct submit a turn; nested prepare injects once; slash commands are not turns', async (t) => {
    const h = await worldsHost(t); const w = h.window; const C = w.KLITE_RPMod_Context;
    let before = 0, sizes = [];
    C.register({ id: 'x', beforeTurn: () => before++, collect: () => [{ title: 'X', priority: 50, text: 'x' }] });
    const origSubmit = w.submit_generation;
    w.submit_generation = (t2) => { sizes.push(managed(w).length); return origSubmit(t2); };

    C.run(() => w.submit_generation(''));              // e.g. group chat, same speaker again
    assert.match(h.prompt, /\[X\]/); assert.equal(before, 1);
    C.run(() => w.prepare_submit_generation());       // group chat via chat_submit_generation
    assert.equal(before, 2, 'nested prepare did not start a second turn');
    assert.deepEqual(sizes, [1, 1], 'entries injected exactly once');
    assert.equal(managed(w).length, 0);

    // Esolite >= 1.35 custom-tool slash command: runs the tool, no generation, no turn
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    w.customtools_sanitize_list = () => [{ name: 'roll', userCallable: true }];
    input.value = '/roll 1d20';
    h.prompt = '';
    await w.prepare_submit_generation();
    assert.equal(before, 2); assert.doesNotMatch(h.prompt, /\[X\]/);
});

test('bundle: ALPHA persona/character and group-chat speaker reach the prompt via the context', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('bundle');
    await h.ready();
    const w = h.window; const R = w.KLITE_RPMod; const C = w.KLITE_RPMod_Context;
    assert.deepEqual([...C.providers()].sort(), ['characters'], 'Worlds is disabled, ALPHA provides characters');
    Object.assign(R.panels.TOOLS, {
        personaEnabled: true, selectedPersona: { name: 'Mira', description: 'A ranger from the north.' },
        characterEnabled: true, selectedCharacter: { name: 'Captain Rowan', data: { description: 'Captain of the guard.', personality: 'stern' } },
    });
    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[User Character: Mira\]\nDescription: A ranger from the north\./);
    assert.match(h.prompt, /\[Character: Captain Rowan\]\nDescription: Captain of the guard\.\nPersonality: stern/);
    assert.equal(w.pending_context_preinjection, undefined, 'preinjection is not used');

    // group chat: the current speaker replaces the Tools character
    Object.assign(R.panels.ROLES, { enabled: true, activeChars: [{ name: 'Bram', description: 'Innkeeper.' }, { name: 'Lia', description: 'Bard.' }], currentSpeaker: 1 });
    try {
        await w.prepare_submit_generation();
        assert.match(h.prompt, /\[Character: Lia\]\nDescription: Bard\./);
        assert.doesNotMatch(h.prompt, /Captain Rowan|Bram/);
    } finally { R.panels.ROLES.enabled = false; }
    assert.equal(w.current_wi.filter(e => e && e.wigroup === '__rpmod__').length, 0, 'cleaned up');
});
