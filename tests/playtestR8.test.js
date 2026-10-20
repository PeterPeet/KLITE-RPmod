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
const STORE_KEY = 'KLITE.shell.layout';   // the shell's layout (src/shell/shell.js)
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
    w.last_request_str = JSON.stringify({ model: 'deepseek', reasoning_effort: 'high', max_tokens: 100, messages: [] });
    w.last_stop_reason = '';
    w.handle_incoming_text('We need answer as narrator. Maybe <go>Wolf Den</go>, or add <room>Name, east: a tunnel</room> and <door>east = locked, iron</door>. Then we need decide which of the exits to use and how to describe the den, the smell, the straw and the dead wolves near the wall');
    assert.equal(at(), 'Stolen Stores', 'no move from the reasoning');
    assert.equal(rooms(), n0, 'no room from the reasoning');
    assert.match(logText2(), /The AI's reply was cut off while it was still thinking: RPmod applied none of its tags\. Use Generate More/);
    // Generate More: the continuation closes the thought, then answers
    w.last_stop_reason = 'stop';
    w.handle_incoming_text(' decide: just go west.</think>Tove ducks back into the den. <go>Wolf Den</go>');
    assert.equal(at(), 'Wolf Den', 'the answer after </think> counts');
    assert.equal(rooms(), n0);
    // a short reply that ended by itself (no reasoning in it, the provider sent no stop reason): parsed
    w.last_request_str = JSON.stringify({ model: 'deepseek', reasoning_effort: 'low', max_tokens: 4096, messages: [] }); w.last_stop_reason = '';
    w.handle_incoming_text('Tove steps back. <go>Stolen Stores</go>');
    assert.equal(at(), 'Stolen Stores', 'far below its budget: not cut off');
    w.handle_incoming_text('And on. <go>Wolf Den</go>');
    // a normal reply with its thinking tagged, and one without reasoning requested, are parsed as before
    w.last_request_str = JSON.stringify({ model: 'x', messages: [] }); w.last_stop_reason = '';
    w.handle_incoming_text('Oona nods. <go>Stolen Stores</go>');
    assert.equal(at(), 'Stolen Stores', 'no reasoning requested: a long reply cut off still counts');
});

// Live test 2026-10-20 (GLM 5.3, 4096): a reply cut off while thinking stayed in the chat untagged, and Esolite sent it
// to the AI as the reply — 17,000 characters of reasoning in a 31,000-character request, again after every Generate
// More (GLM does not continue a thought: it starts a new reply with its own <think>). The orphan is wrapped in the
// thinking tags once the next chunk shows the reasoning will not be continued; DeepSeek's continuation is left alone.
test('a cut-off reasoning chunk is wrapped as thinking when a new reply restarts it or the player writes on', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo('Stolen Stores');
    const arr = () => w.gametext_arr;
    const cut = (txt) => { w.last_request_str = JSON.stringify({ model: 'glm', reasoning_effort: 'low', max_tokens: 20, messages: [] }); w.last_stop_reason = ''; w.handle_incoming_text(txt); };
    const reasoning = 'Let me look at the current state. The player moved; maybe <go>Wolf Den</go>. I should describe the straw and the smell';
    // GLM: cut off, Generate More cut off again, Retry (removes the newest), then a whole reply with its own thinking
    cut(reasoning);
    const first = arr().length - 1;
    cut('Let me look at the current state carefully. Again <go>Wolf Den</go> maybe, and the wolves asleep in the straw');
    arr().pop();   // Retry removes the newest chunk and generates again (empty input)
    let input = w.document.getElementById('input_text');
    if (!input) { input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input); }
    input.value = ''; await w.prepare_submit_generation();
    assert.equal(arr()[first], reasoning, 'not yet: the thought might still go on');
    w.last_stop_reason = 'stop';
    w.handle_incoming_text('<think>Short.</think>Tove steps into the den. <go>Wolf Den</go>');
    assert.equal(arr()[first], '<think>' + reasoning + '</think>', 'the orphan is folded as thinking');
    assert.equal(W.getGraph().nodes.find(n => n.id === W.runtime.playerLocationId).name, 'Wolf Den', 'the new reply counts');
    // DeepSeek: the continuation closes the thought with a lone </think> — left for Esolite to pair
    cut(reasoning);
    const ds = arr().length - 1;
    w.last_stop_reason = 'stop';
    w.handle_incoming_text(' so: stay.</think>Tove waits.');
    assert.equal(arr()[ds], reasoning, 'a continued thought is not touched');
    // reasoning switched off after a cut-off reply: the Retry's answer has no thinking at all — folded as well
    cut(reasoning);
    const off = arr().length - 1;
    w.last_request_str = JSON.stringify({ model: 'glm', max_tokens: 4096, messages: [] }); w.last_stop_reason = '';
    w.handle_incoming_text('Tove waits by the door.');
    assert.equal(arr()[off], '<think>' + reasoning + '</think>', 'a finished reply without thinking');
    // the player writes on after a cut-off reply: folded before the prompt is built
    cut(reasoning);
    const p = arr().length - 1;
    input.value = 'Tove looks around.';
    await w.prepare_submit_generation();
    assert.equal(arr()[p], '<think>' + reasoning + '</think>');
    // a slash command or Generate More (empty input) does not
    cut(reasoning);
    const q = arr().length - 1;
    input.value = '';
    await w.prepare_submit_generation();
    assert.equal(arr()[q], reasoning, 'Generate More: the thought may still go on');
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
    assert.match(p, /\[Set the story straight\]\nYour last reply described things that did not happen — RPmod refused them:\n- Unlock west refused: [^\n]*\n- Move to Sleeping Burrow refused: [^\n]*\nWhere things really stand: the party is at The Hollow Oak \(Chief's Hollow\)[^\n]*only the items listed in the inventory exist\.( There is no enemy here[^.]*\.[^.]*\.)? Begin your next reply by setting this straight/);
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

// The Long Rest restored everything without time passing — anywhere, any number of times (play test).
test('Long Rest takes the night: to the next morning; night events happen and a fight interrupts it', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window; const C = w.KLITE_RPMod_Characters;
    const clock = () => `${W.runtime.clock.day} ${W.runtime.clock.time}`;
    C.updateSheet('Tove Emberfall', s => { s.hp.current = 3; }); await sleep(20);
    assert.equal(clock(), '1 morning');
    let r = W.longRest();
    assert.equal(r.ok, true);
    assert.equal(clock(), '2 morning', 'a whole night later');
    await sleep(20);
    assert.equal(C.cachedSheet('Tove Emberfall').hp.current, 11);
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Long Rest: HP, spell slots and free casts are restored\. It is morning of day 2\./.test(e.what)));
    // at the old campfire on the Gravel Road the wolves come in the night
    W.moveTo('Gravel Road'); W.endEncounter();
    C.updateSheet('Tove Emberfall', s => { s.hp.current = 3; }); await sleep(20);
    r = W.longRest();
    assert.equal(r.ok, false); assert.equal(r.interrupted, true);
    assert.equal(W.runtime.clock.time, 'night', 'the rest stopped when the fight broke out');
    assert.ok(W.getCombat() && W.getCombat().active, 'Wolves at the campfire');
    await sleep(20);
    assert.ok(C.cachedSheet('Tove Emberfall').hp.current <= 3, 'nothing restored');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /The Long Rest is interrupted .*: a fight breaks out\./.test(e.what)));
});

// "Ask Liu Wen about the cart" was done the moment the party reached Wen's Farm: the talk check matched the
// name part "Wen" in the place's name.
test('talk objectives: a person\'s name inside a place name is no talk ("I go to Wen\'s Farm")', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.applyTags('<accept>Missing Carts</accept>');
    W.moveTo("Wen's Farm");
    const done = () => !!(W.runtime.questObjectives.q_missing_carts || {}).o1;
    w.gametext_arr.push("\n{{[INPUT]}}\nI go to Wen's Farm.\n{{[OUTPUT]}}\n");
    w.handle_incoming_text("Tove reaches Wen's Farm. The goose pond is still.");
    assert.equal(done(), false, 'arriving is not talking');
    w.gametext_arr.push('\n{{[INPUT]}}\n"Liu! Which way did the cart go?"\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('Liu Wen whirls around. "The Forest Road!"');
    assert.equal(done(), true, 'speaking to Liu counts');
});

// A new start of the adventure kept the pregens' sheets from the last play (Oona at 0 HP, Pell dead): the picker
// now lists what they kept and offers their starting sheets back (a visible choice: it replaces levels and items).
test('adventure picker: pregens from an earlier play are listed; "starting sheets back" resets them, unticked keeps them', async (t) => {
    const h = await adventure(t); const w = h.window; const C = w.KLITE_RPMod_Characters; const ADV = w.KLITE_RPMod_Adventures;
    await C.loadSheet('Oona Greycairn');
    C.updateSheet('Oona Greycairn', s => { s.hp.current = 0; s.xp = 225; }); await sleep(50); await C.flushSheet?.('Oona Greycairn');
    const listed = await ADV.changedPregens('drowned-lantern');
    assert.deepEqual(JSON.parse(JSON.stringify(listed)), [{ name: 'Oona Greycairn', what: '225 XP, HP 0/12' }]);
    ADV.open('drowned-lantern');
    for (let i = 0; i < 50 && !w.document.querySelector('[data-adv="reset"]'); i++) await sleep(20);
    const box = w.document.querySelector('[data-adv="reset"]');
    assert.ok(box && box.checked, 'offered, ticked');
    assert.match(w.document.querySelector('[data-adv="changed"]').textContent, /Oona Greycairn: 225 XP, HP 0\/12/);
    // unticked: kept as they are
    box.checked = false; box.dispatchEvent(new w.Event('change'));
    w.document.querySelector('[data-adv="start"]').click();
    for (let i = 0; i < 50 && w.document.querySelector('[data-adv="start"]') && /Starting/.test(w.document.querySelector('[data-adv="start"]').textContent); i++) await sleep(20);
    await sleep(100);
    assert.equal((await C.loadSheet('Oona Greycairn')).hp.current, 0, 'not reset when unticked');
    // ticked: their starting sheets back
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false, resetPregens: true });
    await sleep(50);
    const oona = await C.loadSheet('Oona Greycairn');
    assert.deepEqual([oona.hp.current, Number(oona.xp) || 0], [12, 0]);
    assert.deepEqual(JSON.parse(JSON.stringify(await ADV.changedPregens('drowned-lantern'))), []);
});

test('a companion in the prompt: armour from the sheet and the HP they have now', async (t) => {
    const h = await adventure(t); const W = h.api(); const C = h.window.KLITE_RPMod_Characters;
    assert.equal(W.joinParty('Oona Greycairn').ok, true);
    await C.loadSheet('Oona Greycairn'); C.updateSheet('Oona Greycairn', s => { s.hp.current = 2; }); await sleep(30);
    const line = W.preview().split('\n').find(l => /^- Oona Greycairn/.test(l));
    assert.match(line, /Armour: Chain Mail/);
    assert.match(line, /HP now 2\/12 \(badly hurt\)/);
});

test('the Combat window comes back after a reload only while a fight is running', async (t) => {
    // the shell asks the view when it restores windows: open last time, but no fight → stays closed
    const page = async (layoutJson) => {
        const h = createHost(); t.after(h.close);
        if (layoutJson) h.window.localStorage.setItem(STORE_KEY, layoutJson);
        h.load('bundle'); await h.ready({ ui: true });
        return h;
    };
    const h1 = await page(null); const S1 = h1.window.KLITE_RPMod_Shell;
    S1.open('combat'); assert.equal(S1.isOpen('combat'), true);
    const saved = h1.window.localStorage.getItem(STORE_KEY);
    assert.match(saved, /"combat":\{[^}]*"open":true/);
    const h2 = await page(saved);
    await sleep(100);
    assert.equal(h2.window.KLITE_RPMod_Shell.isOpen('combat'), false, 'no fight: not reopened');
});

// Retry and Undo removed the AI's reply, but what its tags did stayed (a <give> stayed given, a fight it started
// stayed running). Now that reply's effects are undone — after asking, when a sheet changed since.
async function undoHost(t, answer = 'yes') {
    const h = createHost(); t.after(h.close); const w = h.window;
    w.handle_incoming_text = (txt) => { w.gametext_arr.push(txt); };
    w.btn_retry = function () { w.__retried = (w.__retried || 0) + 1; w.gametext_arr.pop(); };   // Esolite: pop, then send again
    w.btn_back = function () { w.__undone = (w.__undone || 0) + 1; w.gametext_arr.pop(); };
    w.__asked = []; w.msgboxYesNo = (text, title, yes, no) => { w.__asked.push(text); (answer === 'yes' ? yes : no)(); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const ADV = w.KLITE_RPMod_Adventures; w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    for (let i = 0; i < 40 && !w.btn_retry.__rpmod_undo; i++) await sleep(25);
    return h;
}
const hasItem = (w, n) => w.KLITE_RPMod_Characters.cachedSheet('Tove Emberfall').inventory.some(i => i.name === n);

test('Retry undoes what the discarded reply did (items, flags, a fight, the world, its log lines)', async (t) => {
    const h = await undoHost(t); const w = h.window; const W = h.api();
    W.moveTo('Stolen Stores'); W.endEncounter();
    const rooms = W.activeWorld().locations.length, log0 = w.KLITE_RPMod_Log.entries().length;
    w.gametext_arr.push('\n{{[INPUT]}}\nI look around.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('A rope! <give>Rope</give> <flag>found_rope</flag> <room>Larder, east: shelves</room> Goblins! <encounter>Goblin Warrior</encounter>');
    await sleep(30);
    assert.ok(hasItem(w, 'Rope') && W.runtime.flags.found_rope && W.getCombat() && W.activeWorld().locations.length === rooms + 1);
    w.btn_retry();
    await sleep(60);
    assert.equal(w.__retried, 1);
    assert.equal(w.__asked.length, 0, 'no sheet changed since: no question');
    assert.ok(!hasItem(w, 'Rope'), 'the item is gone');
    assert.equal(W.runtime.flags.found_rope, undefined);
    assert.equal(W.getCombat(), null, 'the fight it started is gone');
    assert.equal(W.activeWorld().locations.length, rooms, 'the room it added is gone');
    assert.equal(w.KLITE_RPMod_Log.entries().length, log0, 'its log lines are gone');
    // a reply that changed nothing: nothing to undo, Undo just removes the text
    w.handle_incoming_text('Dust and grain sacks.');
    w.btn_back();
    assert.equal(w.__undone, 1); assert.equal(w.__asked.length, 0);
});

test('Retry after the sheet changed: RPmod asks — Yes undoes everything, No keeps the game as it is', async (t) => {
    for (const answer of ['yes', 'no']) {
        const h = await undoHost(t, answer); const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
        w.gametext_arr.push('\n{{[INPUT]}}\nI ask Ada.\n{{[OUTPUT]}}\n');
        w.handle_incoming_text('Ada hands you a rope. <give>Rope</give>');
        await sleep(30);
        C.updateSheet('Tove Emberfall', s => { s.notes = 'My own note'; });   // the player edits the sheet afterwards
        await sleep(30);
        w.btn_retry();
        await sleep(60);
        assert.equal(w.__asked.length, 1, answer);
        assert.match(w.__asked[0], /since then Tove Emberfall's character sheet changed too\. Yes: undo everything that reply did — those later changes are lost as well\. No: keep the game as it is and only retry/);
        assert.equal(w.__retried, 1, 'the retry happens either way');
        assert.equal(hasItem(w, 'Rope'), answer === 'no');
        assert.equal(C.cachedSheet('Tove Emberfall').notes === 'My own note', answer === 'no');
    }
});

test('Retry after fighting on: the turns played since the reply count as a change — RPmod asks', async (t) => {
    const h = await undoHost(t, 'no'); const w = h.window; const W = h.api();
    W.moveTo('Root Tunnel');
    w.gametext_arr.push('\n{{[INPUT]}}\nI go on.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('A wolf! <encounter>Wolf</encounter>');
    const cb = W.getCombat(); assert.ok(cb);
    const wolf = cb.order.find(o => o.kind === 'monster').id;
    W.damage(wolf, 3);   // the player fights on in the Combat window
    w.btn_retry(); await sleep(40);
    assert.equal(w.__asked.length, 1);
    assert.match(w.__asked[0], /since then the game \(moves, fight turns, quests\) changed too/);
    assert.ok(W.getCombat() && W.getCombat().hp[wolf] < W.getCombat().maxHp[wolf], 'No: the fight and its turns stay');
});

// DeepSeek narrated "back through the grain stores … into the wolf den" without a <go>: the party stayed in the
// chief's hollow. The Here row now offers "Story: go to Wolf Den" (a known place of the same dungeon, by a route).
test('"Story: go to …": a reply that moved no one but walked the party somewhere offers that place', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo('Root Tunnel'); W.endEncounter();
    for (const d of ['east', 'east']) { W.go(d); W.endEncounter(); }   // walked: Wolf Den, Stolen Stores
    const found = W.runtime.found; if (!found.secrets.includes('ex_ho_stores_chief')) found.secrets.push('ex_ho_stores_chief');   // the secret door, noticed
    W.go('south'); W.endEncounter();
    const at = () => W.getGraph().nodes.find(n => n.id === W.runtime.playerLocationId).name;
    w.gametext_arr.push('\n{{[INPUT]}}\nBack to the wolf den.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('<think>Maybe <go>Sleeping Burrow</go>.</think>Tove and Oona pass back through the Stolen Stores and step into the Wolf Den. The dead wolves lie still.');
    assert.equal(at(), "Chief's Hollow", 'no tag moved them');
    assert.deepEqual(JSON.parse(JSON.stringify(W.here().storyGo)), { id: 'ho_wolfpen', name: 'Wolf Den' }, 'the place named last, not one from the thinking: ' + JSON.stringify(W.here().storyGo));
    const r = w.KLITE_RPMod_Chat.run('/storygo Wolf Den', { send: true });
    assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.message, '', 'nothing is sent to the AI');
    assert.equal(at(), 'Wolf Den', 'moved, by the route through the stores');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /As the story told, the party went via Stolen Stores to Wolf Den\./.test(e.what)), JSON.stringify(w.KLITE_RPMod_Log.entries().slice(-2).map(e => e.what)));
    assert.equal(W.here().storyGo, null, 'the offer is gone once they are there');
    // a reply whose tag moved the party offers nothing; nor does one that names only a locked way
    w.handle_incoming_text('They go on. <go>Stolen Stores</go> Grain everywhere, and the Root Tunnel behind.');
    assert.equal(at(), 'Stolen Stores'); assert.equal(W.here().storyGo, null);
    W.moveTo("Chief's Hollow"); W.endEncounter();
    w.handle_incoming_text('Tove stares at the door to the Sleeping Burrow.');
    assert.equal(W.here().storyGo, null, 'a locked door is no way');
    // a mere mention is no move ("… is west of here"); a sentence that moves is
    W.moveTo('Stolen Stores'); W.endEncounter();
    w.handle_incoming_text('Oona nods. The Root Tunnel is behind us, the Wolf Den is just west of here.');
    assert.equal(W.here().storyGo, null, 'mentioned, not walked');
    // names with an apostrophe, written with a typographic one (as models do)
    W.moveTo('Stolen Stores'); W.endEncounter();
    w.handle_incoming_text('They slip back through the secret door into the Chief’s Hollow.');
    assert.deepEqual(JSON.parse(JSON.stringify(W.here().storyGo)), { id: 'ho_chief', name: "Chief's Hollow" });
});

// Owner, 2026-10-20: Branch, Allow Editing and the chat tree change the chat far back — RPmod's game state cannot
// follow. A notice once per page (while a world is active); the action itself goes on.
test('Branch, Allow Editing and the chat tree: a notice once per page while a world is active', async (t) => {
    const h = createHost(); t.after(h.close); const w = h.window;
    const calls = []; w.__boxes = [];
    w.btn_branch = () => calls.push('branch'); w.toggle_editable = () => calls.push('edit'); w.btn_editmode = () => calls.push('editmode');
    w.treeViewer = { openTreeView: () => calls.push('tree'), openPaginatedTreeView: () => calls.push('tree2') };
    w.msgbox = (text, title) => w.__boxes.push([title, text]);
    const cb = w.document.createElement('input'); cb.type = 'checkbox'; cb.id = 'allowediting'; w.document.body.appendChild(cb);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    for (let i = 0; i < 40 && !w.btn_branch.__rpmod_history; i++) await sleep(25);
    w.btn_branch();
    assert.deepEqual(calls, ['branch']); assert.equal(w.__boxes.length, 0, 'no world: no notice');
    const ADV = w.KLITE_RPMod_Adventures; w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    cb.checked = false; w.toggle_editable();   // switched off: no notice
    assert.equal(w.__boxes.length, 0);
    cb.checked = true; w.toggle_editable();
    assert.equal(w.__boxes.length, 1);
    assert.match(w.__boxes[0][1], /does not follow edited, branched or reloaded chat history: it stays as it is now\. To take back the AI's last reply, use Retry or Undo/);
    w.treeViewer.openTreeView(); w.btn_branch();
    assert.equal(w.__boxes.length, 1, 'once per page');
    assert.deepEqual(calls, ['branch', 'edit', 'edit', 'tree', 'branch'], 'the actions go on as usual');
});

// Live test: DeepSeek started "Chief Snagtooth and a guard" in the Stolen Stores (the chief sits next door).
test('a prepared encounter that belongs to a place starts there only (the AI\'s tag); elsewhere it is refused', async (t) => {
    const h = await adventure(t); const W = h.api(); const w = h.window;
    W.moveTo('Stolen Stores'); W.endEncounter();
    W.applyTags('The chief rises! <encounter>Chief Snagtooth and a guard</encounter>');
    assert.equal(W.getCombat(), null, 'not in the storeroom');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Encounter Chief Snagtooth and a guard refused: they are at Chief's Hollow, not here\./.test(e.what)));
    W.applyTags('Two rats! <encounter>2 Giant Rat</encounter>');
    assert.ok(W.getCombat() && W.getCombat().active, 'an ad-hoc list still starts anywhere');
    W.endEncounter();
    W.moveTo("Chief's Hollow"); W.endEncounter();
    W.applyTags('<encounter>Chief Snagtooth and a guard</encounter>');
    assert.ok(W.getCombat() && W.getCombat().order.some(o => o.key === 'goblin-boss'), 'in the chief\'s hollow it starts');
});

// Live test: the Combat window asks attacksLeft() on every render, which wrote the turn record — so an undo saw
// "fight turns" nobody played and asked needlessly.
test('Retry right after a reply that started a fight: the open Combat window is no change — no question', async (t) => {
    const h = await undoHost(t); const w = h.window; const W = h.api();
    W.moveTo('Root Tunnel');
    w.gametext_arr.push('\n{{[INPUT]}}\nOn.\n{{[OUTPUT]}}\n');
    h.seedRandom([0.99, 0.01]);   // Tove wins the initiative: the window shows the player's turn panel
    w.handle_incoming_text('A wolf! <encounter>Wolf</encounter>');
    w.KLITE_RPMod_Shell.open('combat'); await sleep(50);
    for (let i = 0; i < 3; i++) { W.attacksLeft('__player__'); w.KLITE_RPMod_Shell.refresh && w.KLITE_RPMod_Shell.refresh(['combat']); }
    await sleep(30);
    w.btn_retry(); await sleep(40);
    assert.equal(w.__asked.length, 0, 'nothing was played: no question');
    assert.equal(W.getCombat(), null, 'the fight is undone');
});

test('story correction: when no one hostile is here, it says so (no enemy, no fight)', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo('Stolen Stores'); W.endEncounter();
    w.gametext_arr.push('\n{{[INPUT]}}\nOn.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('The chief rises! <encounter>Chief Snagtooth and a guard</encounter>');
    assert.match(W.preview(), /only the items listed in the inventory exist\. There is no enemy here — no one to fight; no fight is running\./);
    // where an encounter still waits, nothing of the kind is claimed
    W.moveTo("Chief's Hollow"); W.endEncounter();
    w.gametext_arr.push('\n{{[INPUT]}}\nIn.\n{{[OUTPUT]}}\n');
    w.handle_incoming_text('<go>Nowhere Hall</go> The chief glares.');
    assert.doesNotMatch(W.preview(), /There is no enemy here/);
});

// Live test (GLM 5.3 Flash: "this seems to be a replay/loop of the same day"): after a new adventure start the old
// runs' log stayed, and the Retry marks rewound to its oldest entries — 12,000 characters of other fights went to
// the AI as "since your last reply". A new session now starts with an empty log.
test('a new session (adventure start) starts with an empty game log; nothing of the old story reaches the AI', async (t) => {
    const h = await adventure(t); const w = h.window; const W = h.api(); const L = w.KLITE_RPMod_Log;
    for (let i = 0; i < 40 && !(w.restart_new_game && w.restart_new_game.__rpmod_log); i++) await sleep(25);
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    for (let k = 0; k < 3; k++) {   // a few turns of the old story, with rolls
        L.add({ what: `Old fight line ${k}`, kind: 'combat' });
        input.value = 'Attack!'; await w.prepare_submit_generation(); input.value = '';
        w.gametext_arr.push('\n{{[INPUT]}}\nAttack!\n{{[OUTPUT]}}\n', `The goblin falls (${k}).`);
    }
    assert.ok(L.entries().length >= 3);
    await w.KLITE_RPMod_Adventures.start('drowned-lantern', { pregen: 'tove', confirm: false });
    assert.equal(L.entries().length, 0, 'the old story\'s log is gone with the old story');
    input.value = 'Hello, Elder.'; await w.prepare_submit_generation();
    assert.doesNotMatch(h.prompt, /Old fight line/, 'nothing of it in the new game\'s prompt');
});

// Live test 2026-10-20: the prompt named a waiting encounter only ("Goblin wolves") and GLM narrated four wolves for two.
test('a waiting encounter in the prompt says who is in it', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    W.moveTo('Wolf Den');
    assert.match(W.preview(), /\[Waiting here\]\n- Goblin wolves: 2 Wolf\n/);
    // the AI copies the line instead of the name: the prepared encounter starts, not a second pack
    w.handle_incoming_text('The wolves wake. <encounter>2 Wolf</encounter>');
    assert.equal(W.getCombat().encounter, 'enc_den_wolves');
    assert.ok(W.runtime.startedEncounters.includes('enc_den_wolves'));
    W.endEncounter();
    assert.doesNotMatch(W.preview(), /Waiting here/, 'no longer waiting');
    assert.equal(W.startSavedEncounter('Goblin wolves: 2 Wolf').encounter, 'enc_den_wolves', 'the name with its line');
});
