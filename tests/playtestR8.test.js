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

// The prompt said "It is the player's turn: set the scene and wait for their action" while the results showed
// the player's attack — the model spent its whole reasoning on the contradiction (thinking loop, reply cut off).
test('combat prompt: before and after the player has acted on their turn; another\'s turn next', async (t) => {
    const h = await adventure(t); const W = h.api();
    W.moveTo('Root Tunnel');
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb = W.getCombat(); const wolf = cb.order.find(o => o.kind === 'monster').id;
    cb.turnIndex = cb.order.findIndex(o => o.isPlayer); cb.turnUse = null;
    let p = W.preview();
    assert.match(p, /narrate every result listed under "Rolls and combat", in order/);
    assert.match(p, /It is the player's turn and they have not acted yet/);
    assert.doesNotMatch(p, /set the scene and wait for their action/);
    h.seedRandom([0.05]);   // a miss: still the player's action (a hit could end the fight, and then the outcome is shown)
    W.attack('__player__', wolf, 0);
    p = W.preview();
    assert.match(p, /The player has already acted on this turn: those results are what they just did/);
    assert.match(p, /Their turn is not over: do not narrate anyone else's turn/);
    assert.doesNotMatch(p, /they have not acted yet/);
    W.nextTurn();
    const next = W.getCombat().order[W.getCombat().turnIndex];
    if (!next.isPlayer) assert.match(W.preview(), new RegExp(`It is ${next.name}'s turn next: RPmod runs it`));
});

// After a page reload the dice/combat log was empty (Esolite's start-up autosave drops RPmod's blocks; the
// world state already had a side copy, the log had none) — and so a Retry had no results to send again.
test('page reload: the game log (with its Retry marks) comes back from the side copy (same chat only)', async (t) => {
    const page = async (idb, chat) => {
        const h = createHost(); t.after(h.close); const w = h.window;
        h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
        for (const [k, v] of idb) w.__idb.set(k, v);
        if (chat) w.gametext_arr = chat.slice();
        h.load('bundle'); await h.ready({ ui: false });
        return h;
    };
    const h1 = await page([]); const w1 = h1.window;
    const input = w1.document.createElement('textarea'); input.id = 'input_text'; w1.document.body.appendChild(input);
    w1.KLITE_RPMod_Log.add({ what: 'Hit: Wolf → Oona, 6 damage', kind: 'combat' });
    input.value = 'I swing.'; await w1.prepare_submit_generation(); input.value = '';
    w1.gametext_arr.push('\n{{[INPUT]}}\nI swing.\n{{[OUTPUT]}}\n', 'The wolf bites Oona.');
    w1.generate_savefile();   // an autosave
    await sleep(600);
    const idb = [...w1.__idb.entries()];
    assert.ok(idb.some(([k]) => k === 'rpmod_storycopy_log'), 'side copy of the log');
    const chat = w1.gametext_arr.slice();

    const h2 = await page(idb, chat); const w2 = h2.window;

    for (let i = 0; i < 100 && !w2.KLITE_RPMod_Log.entries().length; i++) await sleep(20);
    assert.deepEqual(JSON.parse(JSON.stringify(w2.KLITE_RPMod_Log.entries().map(e => e.what))), ['Hit: Wolf → Oona, 6 damage'], 'the log is back');
    // and a Retry right after the reload sends the results again
    w2.gametext_arr.pop(); await w2.prepare_submit_generation();
    assert.match(h2.prompt, /\[Rolls and combat since your last reply\]\n- Hit: Wolf → Oona, 6 damage/);

    const h3 = await page(idb, ['A different story.']);
    await sleep(300);
    assert.equal(h3.window.KLITE_RPMod_Log.entries().length, 0, 'another chat: nothing restored');
});

// The Here row's "/go east | I go to unexplored room." moved the party into the storeroom; the AI echoed
// <go>unexplored room</go>, which by then meant the next unknown exit (a secret door found on arrival), and
// the party ended up in the chief's hollow without the player asking. The message now names the real place.
test('Here row: the message names where the move led, so the AI\'s echo of it moves nobody', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window;
    W.moveTo('Wolf Den'); W.endEncounter();
    const go = W.here().ways.find(x => x.name === 'unexplored room');
    assert.ok(go, 'the plank door leads to an unexplored room');
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    const res = w.KLITE_RPMod_Chat.run('/go east | I go to {here}.', { send: false });
    assert.equal(res.ok, true);
    const at = () => W.getGraph().nodes.find(n => n.id === W.runtime.playerLocationId).name;
    assert.equal(at(), 'Stolen Stores');
    assert.equal(input.value, 'I go to Stolen Stores.', 'the real name, not "unexplored room"');
    W.applyTags('<go>Stolen Stores</go> Sacks of grain everywhere.');   // the AI repeats the move
    assert.equal(at(), 'Stolen Stores', 'the echo is a move to where the party already is');
});

// Containers hold keys and quest items (the Bone Key, the Lake-green Coin), but nothing handed them out: the AI
// was not told what is inside and made something up; <give>14 gp</give> made an item called "14 gp".
test('containers: opened once (Here row, /open, the AI\'s <open>), contents to the inventory and purse; coins in <give>', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    const sheet = () => C.cachedSheet('Tove Emberfall');
    const has = (n) => sheet().inventory.some(i => i.name === n);
    const logText2 = () => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    W.moveTo("Chief's Hollow"); W.endEncounter();
    assert.match(W.preview(), /The chief's chest \(container, unopened — when the player opens it, write <open>The chief's chest<\/open>; RPmod hands out what is inside/);
    assert.ok(W.here().containers.some(c => c.name === "The chief's chest"), 'the Here row offers it');
    // a fight is going on: not now
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior' }], zones: false });
    assert.equal(W.openContainer("The chief's chest").ok, false);
    W.endEncounter();
    const gp0 = Number(sheet().coins.gp) || 0;
    const r = w.KLITE_RPMod_Chat.run("/open The chief's chest", { send: false });
    assert.equal(r.ok, true);
    await sleep(30);
    assert.ok(has('Lake-green Coin') && has('Potion of Healing'), JSON.stringify(sheet().inventory.map(i => i.name)));
    assert.equal(Number(sheet().coins.gp), gp0 + 14, '14 gp into the purse, not an item');
    assert.ok(!has('14 gp'));
    assert.match(logText2(), /Opens The chief's chest: Lake-green Coin, 14 gp, Potion of Healing — added to Tove Emberfall's inventory\./);
    assert.match(W.preview(), /The chief's chest \(container, emptied\)/);
    assert.ok(!W.here().containers.length, 'gone from the Here row');
    W.applyTags("<open>The chief's chest</open>");
    assert.match(logText2(), /The chief's chest is empty — it was opened before\./);
    assert.equal(sheet().inventory.filter(i => i.name === 'Lake-green Coin').length, 1);
    // the AI opens the sack in the flooded burrow by a loose name: the Bone Key
    W.moveTo('Flooded Burrow'); W.endEncounter();
    W.applyTags('Tove fishes in the soggy sack. <open>the sack</open>');
    await sleep(30);
    assert.ok(has('Bone Key'), 'the key for the chief\'s door');
    // coins in <give>
    const sp0 = Number(sheet().coins.sp) || 0;
    W.applyTags('<give>6 sp</give>');
    await sleep(30);
    assert.equal(Number(sheet().coins.sp), sp0 + 6, 'silver into the purse');
});

// A reply cut off at max_tokens while the model was still thinking: Esolite leaves the reasoning untagged (it
// wraps it in <think>…</think> only on a proper stop) so that Generate More continues the thought, which then
// ends with a lone </think>. RPmod applied the tags in that reasoning (a junk room "Name", a locked door, a move).
test('a reply cut off while thinking applies no tags; Generate More\'s continuation counts only after </think>', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };   // Esolite appends the reply
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo('Stolen Stores');
    const at = () => W.getGraph().nodes.find(n => n.id === W.runtime.playerLocationId).name;
    const rooms = () => W.activeWorld().locations.length;
    const logText2 = () => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    const n0 = rooms();
    // the request asked for reasoning; the stream ended without a proper stop (finish_reason "length")
    w.last_request_str = JSON.stringify({ model: 'deepseek', reasoning_effort: 'high', messages: [] });
    w.last_stop_reason = '';
    w.handle_incoming_text('We need answer as narrator. Maybe <go>Wolf Den</go>, or add <room>Name, east: a tunnel</room> and <door>east = locked, iron</door>. Then');
    assert.equal(at(), 'Stolen Stores', 'no move from the reasoning');
    assert.equal(rooms(), n0, 'no room from the reasoning');
    assert.match(logText2(), /The AI's reply was cut off while it was still thinking: RPmod applied none of its tags\. Use Generate More/);
    // Generate More: the continuation closes the thought, then answers
    w.last_stop_reason = 'stop';
    w.handle_incoming_text(' decide: just go west.</think>Tove ducks back into the den. <go>Wolf Den</go>');
    assert.equal(at(), 'Wolf Den', 'the answer after </think> counts');
    assert.equal(rooms(), n0);
    // a normal reply with its thinking tagged, and one without reasoning requested, are parsed as before
    w.last_request_str = JSON.stringify({ model: 'x', messages: [] }); w.last_stop_reason = '';
    w.handle_incoming_text('Oona nods. <go>Stolen Stores</go>');
    assert.equal(at(), 'Stolen Stores', 'no reasoning requested: a long reply cut off still counts');
});

// Gemma narrated an invented key opening a door RPmod kept locked, and the party walking into a room it never
// reached; the refusal reached the next prompt only as one log line. Now the next prompt asks to set it straight.
test('story correction: the AI\'s refused tags come back as "Set the story straight" (until the reply is retried)', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo("Chief's Hollow"); W.endEncounter();
    w.gametext_arr.push('\n{{[INPUT]}}\nTove tries the iron key.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('<unlock>west</unlock> The key turns with a snick. <go>Sleeping Burrow</go> Hammocks everywhere.');
    let p = W.preview();
    assert.match(p, /\[Set the story straight\]\nYour last reply described things that did not happen — RPmod refused them:\n- Unlock west refused: [^\n]*\n- Move to Sleeping Burrow refused: [^\n]*\nWhere things really stand: the party is at The Hollow Oak \(Chief's Hollow\)[^\n]*only the items listed in the inventory exist\. Begin your next reply by setting this straight/);
    // Retry removes that reply (and sends again, as Esolite's btn_retry): no correction for the next attempt
    w.gametext_arr.pop();
    assert.doesNotMatch(W.preview(), /Set the story straight/);
    await w.prepare_submit_generation();
    w.handle_incoming_text('The key does not turn. The door stays shut.');   // the retried reply, without refused tags
    assert.doesNotMatch(W.preview(), /Set the story straight/, 'a clean reply clears it');
});

// Cure Wounds after a fight was narrated, but Oona's HP and Tove's slots did not change: outside a fight there was
// no way to cast. Now /cast, the AI's <cast> and the prompt's "Casting spells" go through RPmod.
test('spells outside a fight: /cast and <cast> spend the slot and roll the healing onto the target', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    assert.equal(W.joinParty('Oona Greycairn').ok, true);
    C.cachedSheet('Oona Greycairn'); await sleep(20);
    C.updateSheet('Oona Greycairn', s => { s.hp.current = 2; }); C.updateSheet('Tove Emberfall', s => { s.hp.current = 4; });
    await sleep(30);
    const used = () => (C.cachedSheet('Tove Emberfall').spellcasting.used || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const logText2 = () => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    assert.match(W.preview(), /\[Casting spells\]\nOutside a fight, when the player casts a spell, write <cast>Spell name = target<\/cast>/);
    h.seedRandom([0.5]);
    const r = w.KLITE_RPMod_Chat.run('/cast Cure Wounds -> Oona', { send: false });   // typed: "->" (cleanArg makes it "-")
    assert.equal(r.ok, true, JSON.stringify(r));
    await sleep(30);
    const oona = C.cachedSheet('Oona Greycairn').hp.current;
    assert.ok(oona > 2, 'Oona is healed: ' + oona);
    assert.equal(used(), 1, 'a level 1 slot is spent');
    assert.match(logText2(), new RegExp(`Tove Emberfall casts Cure Wounds \\(level 1 spell slot\\) on Oona Greycairn: heals \\d+ → HP ${oona}/12\\.`));
    // the AI's tag, on the caster
    W.applyTags('Tove whispers a word. <cast>Healing Word on me</cast>');
    await sleep(30);
    assert.ok(C.cachedSheet('Tove Emberfall').hp.current > 4);
    assert.equal(used(), 2);
    // a spell without healing: logged for the AI to narrate, no slot for a cantrip
    W.applyTags('<cast>Light</cast>');
    assert.match(logText2(), /Tove Emberfall casts Light — its effect is narrated\./);
    assert.equal(used(), 2);
    // refusals
    W.applyTags('<cast>Fireball = goblin</cast>');
    assert.match(logText2(), /Cast Fireball = goblin refused: Tove Emberfall cannot cast "Fireball"\./);
    W.applyTags('<cast>Cure Wounds = Liu Wen</cast>');
    assert.match(logText2(), /refused: no one called "Liu Wen" is with the party\./);
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    assert.equal(W.castOutside('Cure Wounds = Oona').ok, false, 'in a fight: the Combat window');
    W.endEncounter();
    // out of slots
    w.KLITE_RPMod_Chat.run('/cast Cure Wounds -> Oona', { send: false });
    const last = w.KLITE_RPMod_Chat.run('/cast Cure Wounds -> Oona', { send: false });
    assert.equal(last.ok, false);
    assert.match(last.error, /no spell slot of level 1 or higher left/);
});

// Fights the AI (or an event, e.g. on arrival) started waited for "Run enemy turns" when an enemy won the
// initiative, and the Combat window had to be found through the Party banner.
test('a fight started by the AI\'s tag runs the first enemy turns at once and opens the Combat window', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window;
    W.moveTo('Root Tunnel');
    w.KLITE_RPMod_Shell.close('combat');
    h.seedRandom([0.01, 0.99]);   // initiative: Tove 1, the wolf 20
    W.applyTags('A wolf lunges from the dark! <encounter>Wolf</encounter>');
    const cb = W.getCombat();
    assert.ok(cb && cb.active);
    assert.equal(cb.order[0].kind, 'monster', 'the wolf won the initiative');
    assert.ok(cb.outcome || cb.order[cb.turnIndex].isPlayer, 'it is the player\'s turn now: ' + cb.order[cb.turnIndex].name);
    assert.ok(cb.log.some(l => /^(Hit|Miss)[^:]*: Wolf → Tove Emberfall|^Wolf (moves|dashes)/.test(l)), 'the wolf acted: ' + JSON.stringify(cb.log));
    assert.equal(w.KLITE_RPMod_Shell.isOpen('combat'), true, 'the Combat window is open');
    // with automatic turns switched off, the wolf's turn waits as before
    W.endEncounter();
    w.KLITE_RPMod_Settings.set('combat_auto_turns', false);
    h.seedRandom([0.01, 0.99]);
    W.applyTags('<encounter>Wolf</encounter>');
    const cb2 = W.getCombat();
    assert.equal(cb2.order[cb2.turnIndex].kind, 'monster', 'the wolf\'s turn waits');
});
