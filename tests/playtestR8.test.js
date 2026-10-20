'use strict';
// Real-backend play test (2026-10-20, Gemma 4 31B with thinking): the AI copies places the way RPmod
// lists them ("east: Wolf Den (corridor)", "The Hollow Oak (Root Tunnel)") into <go>; tags a reasoning
// model only considers inside its thinking (<think>…</think>) must not be applied.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

async function adventure(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    return h;
}
const here = (W) => W.runtime.playerLocationId;
const logText = (h) => h.window.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');

test('<go> understands the names as RPmod lists them: exit type, town/dungeon (room), exit line', async (t) => {
    const h = await adventure(t); const W = h.api();
    W.moveTo('Root Tunnel');
    assert.match(W.preview(), /- east: Wolf Den \(corridor\)/, 'the prompt lists the exit with its type');
    W.applyTags('<go>Wolf Den (corridor)</go>');
    assert.equal(W.getGraph().nodes.find(n => n.id === here(W)).name, 'Wolf Den', 'the exit with its type in brackets');
    assert.doesNotMatch(logText(h), /refused: there is no such place/);
    W.endEncounter();
    W.applyTags('<go>west: Root Tunnel</go>');
    assert.equal(W.getGraph().nodes.find(n => n.id === here(W)).name, 'Root Tunnel', 'an exit line "west: Root Tunnel"');
    W.moveTo('Forest Road');
    W.applyTags('<go>The Hollow Oak (Root Tunnel)</go>');
    assert.equal(W.getGraph().nodes.find(n => n.id === here(W)).name, 'Root Tunnel', 'a dungeon and its room, as the Here row names it');
    W.applyTags('<go>Nowhere Land (corridor)</go>');
    assert.match(logText(h), /Move to Nowhere Land \(corridor\) refused: there is no such place/, 'unknown places are still refused');
});

test('tags inside the model\'s thinking are not applied; the reply\'s tags are, once', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window;
    W.applyTags('<think>Maybe I should write <flag>thought_only</flag> or <go>Village Green</go>.</think>Ada smiles. <flag>said_aloud</flag>');
    assert.equal(W.runtime.flags.thought_only, undefined, 'a tag in the thinking does nothing');
    assert.equal(W.runtime.flags.said_aloud, true, 'the reply\'s tag works');
    assert.equal(W.getGraph().nodes.find(n => n.id === here(W)).name, 'The Tipsy Heron', 'no move from the thinking');
    // a reply cut off while thinking: nothing after <think> counts
    W.applyTags('Ada nods. <think>Then <flag>cut_off</flag>');
    assert.equal(W.runtime.flags.cut_off, undefined);
    // Esolite's own thinking tags (Settings) are used when set
    w.localsettings.start_thinking_tag = '[[reason]]'; w.localsettings.stop_thinking_tag = '[[/reason]]';
    W.applyTags('[[reason]]<flag>custom_thought</flag>[[/reason]]Fine.');
    assert.equal(W.runtime.flags.custom_thought, undefined);
    // a <give> both in the thinking and in the reply gives the item once (it counted twice before)
    const C = w.KLITE_RPMod_Characters;
    const torches = () => { const s = C.cachedSheet('Tove Emberfall'); const it = s && s.inventory.find(i => i.name === 'Torch'); return it ? it.qty || 1 : 0; };
    const before = torches();
    W.applyTags('<think>Ada hands over a torch: <give>Torch</give>.</think>Ada hands you a torch. <give>Torch</give>');
    await sleep(30);
    assert.equal(torches(), before + 1);
});
