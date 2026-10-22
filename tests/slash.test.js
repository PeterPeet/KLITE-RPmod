'use strict';
// R6 step 1: slash commands (src/chat/chat-rules.js pure, src/chat/slash.js in the bundle).
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const CR = requireSrc('src/chat/chat-rules.js');

test('chat rules: commands, " | " and new lines, arguments', () => {
    assert.deepEqual(CR.parseCommand('/Go  Forest Road'), { name: 'go', arg: 'Forest Road' });
    assert.deepEqual(CR.parseCommand('/search'), { name: 'search', arg: '' });
    assert.equal(CR.parseCommand('I go /home'), null);
    assert.deepEqual(CR.splitInput('/go Forest Road | I set off.\n/search'), [
        { kind: 'command', name: 'go', arg: 'Forest Road' }, { kind: 'text', text: 'I set off.' }, { kind: 'command', name: 'search', arg: '' }]);
    assert.equal(CR.messageOf(CR.splitInput('/go A | Hello\nthere')), 'Hello\nthere');
    assert.deepEqual(CR.splitInput('a|b'), [{ kind: 'text', text: 'a|b' }], 'a pipe needs spaces around it');
    const known = (n) => ['go', 'buy'].includes(n);
    assert.equal(CR.startsWithCommand('/buy Torch', known), true);
    assert.equal(CR.startsWithCommand('/me waves', known), false);
    assert.equal(CR.startsWithCommand('hello /go x', known), false);
    assert.equal(CR.cleanArg(' <b>Torch</b> '), 'bTorch/b');
    assert.deepEqual(CR.splitMode('1d20+2 adv'), { rest: '1d20+2', mode: 'adv' });
    assert.deepEqual(CR.splitMode('2d6'), { rest: '2d6', mode: null });
    assert.deepEqual(CR.parseCheck('sleight of hand 15 disadvantage'), { what: 'sleight of hand', dc: 15, mode: 'dis' });
    assert.deepEqual(CR.parseCheck('dex dc 12'), { what: 'dex', dc: 12, mode: null });
    assert.deepEqual(CR.parseCheck('Perception'), { what: 'Perception', dc: null, mode: null });
    assert.deepEqual(CR.parseAttack('Goblin 1 with Shortbow'), { target: 'Goblin 1', weapon: 'Shortbow' });
    assert.deepEqual(CR.parseAssign('Royal Guard = +50'), { key: 'Royal Guard', value: '+50' });
    assert.deepEqual(CR.parseAssign('metRowan'), { key: 'metRowan', value: null });
});

// The bundle with the example world, a persona with a sheet, Esolite's input box and msgbox.
// prepare_submit_generation records what was sent (the input text at the host).
async function session(t, { world = true } = {}) {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    const sent = [], boxes = [];
    w.prepare_submit_generation = () => { sent.push(input.value); input.value = ''; return w.submit_generation(''); };
    w.msgbox = (text, title) => boxes.push({ title, text });
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); const C = w.KLITE_RPMod_Characters; const L = w.KLITE_RPMod_Log;
    await w.__addEsoCharacter('Kara', { description: 'A scout.' });
    await C.saveSheet('Kara', { className: 'Rogue', level: 1, xp: 0, abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 10 }, skills: { perception: 1 },
        hp: { max: 10, current: 10 }, inventory: [{ name: 'Rope', qty: 1 }], coins: { gp: 5 } });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    if (world) await W.loadExample();
    const type = async (text) => { input.value = text; h.prompt = ''; await w.prepare_submit_generation(); };
    const lastLog = () => L.describe(L.entries()[L.entries().length - 1]);
    return { h, w, W, L, input, sent, boxes, type, lastLog };
}

test('slash commands: a session in the chat box — move, accept, buy, look, check; nothing is generated', async (t) => {
    const { h, w, W, L, input, sent, boxes, type, lastLog } = await session(t);
    assert.equal(w.KLITE_RPMod_Chat.installed(), true);
    assert.equal(W.isEnabled(), true);

    await type('/go The Crooked Kettle');
    assert.equal(W.runtime.playerLocationId, 'loc_tavern');
    assert.deepEqual(sent, [], 'a command is not sent to the AI');
    assert.equal(h.prompt, '', 'no generation, no turn');
    assert.equal(input.value, '');
    assert.match(lastLog(), /Goes to The Crooked Kettle/);
    assert.ok(w.document.querySelector('[data-rpm="slash-toast"]'), 'the result shows in a toast');

    await type('/accept The Missing Merchant');
    assert.equal(W.questState('q_merchant'), 'active');
    assert.match(L.entries().map(L.describe).join('\n'), /Quest accepted: The Missing Merchant/);

    await type('/buy Torch x2');
    assert.ok(W.inventory().items.some(i => i.name === 'Torch' && i.qty === 2), 'bought through the shop rules');

    await type('/look');
    assert.equal(boxes.length, 1);
    assert.match(boxes[0].text, /\[Current Location: The Crooked Kettle\]/);
    assert.match(boxes[0].text, /Innkeeper Bram/);

    h.seedRandom([0.45]);   // d20 = 10
    await type('/check perception 12');
    assert.match(lastLog(), /^Kara: Perception check \(DC 12\): success = 14/, 'd20 10 + Wis 2 + proficiency 2');

    // a command and a message: the command runs, then the message is sent as the turn
    await type('/go Millbrook Village | I step out into the square.');
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    assert.deepEqual(sent, ['I step out into the square.']);
    assert.match(h.prompt, /\[Current Location: Millbrook Village\]/, 'the message is a normal turn with the world context');
});

test('slash commands: refusals and errors show in msgbox and keep the text; other /text goes to Esolite', async (t) => {
    const { w, W, input, sent, boxes, type } = await session(t);
    await type('/go Nowhere Land');
    assert.equal(boxes.length, 1); assert.match(boxes[0].text, /refused: there is no such place/);
    assert.equal(input.value, '/go Nowhere Land', 'the typed command stays in the box');
    assert.deepEqual(sent, []);

    await type('/go Millbrook Village | hello\n/frobnicate');
    assert.match(boxes[1].text, /Unknown command \/frobnicate/);
    assert.deepEqual(sent, [], 'a failed command stops the message');

    await type('/accept Bandit Bounty');
    assert.match(boxes[2].text, /Cannot accept "Bandit Bounty" yet/, 'the quest rules refuse (prerequisite)');
    assert.equal(W.questState('q_bounty'), 'available');

    await type('/me waves');
    assert.deepEqual(sent, ['/me waves'], 'not an RPmod command: Esolite gets it unchanged');

    // a user custom tool with the same name wins
    w.customtools_sanitize_list = (list) => list || [];
    w.localsettings.custom_tools = [{ name: 'roll', userCallable: true }];
    const n = w.KLITE_RPMod_Log.entries().length;
    await type('/roll 1d20');
    assert.deepEqual(sent, ['/me waves', '/roll 1d20'], "Esolite runs the user's tool");
    assert.equal(w.KLITE_RPMod_Log.entries().length, n);
});

test('slash commands: without a world, world commands explain; dice and help still work', async (t) => {
    const { w, boxes, type, lastLog } = await session(t, { world: false });
    await type('/go Forest Road');
    assert.match(boxes[0].text, /No world is active/);
    await type('/roll 2d6+1');
    assert.match(lastLog(), /^Kara: Roll 2d6\+1 = \d+/);
    await type('/help');
    const helpText = boxes[1].text;
    for (const c of w.KLITE_RPMod_Chat.commands()) assert.ok(helpText.includes(c.usage), 'help lists ' + c.name);
    await type('/help buy');
    assert.match(boxes[2].text, /\/buy \[vendor:\] <item> \[xN\]/);
});

test('slash commands: inventory, flags, time, reputation, a fight — all through the engine', async (t) => {
    const { h, w, W, L, boxes, type, lastLog } = await session(t);
    await type('/give Silver Key');
    assert.ok(W.inventory().items.some(i => i.name === 'Silver Key'));
    assert.match(lastLog(), /Kara: Gets Silver Key\./, 'logged so the AI learns of it');
    await type('/take Rope');
    assert.ok(!W.inventory().items.some(i => i.name === 'Rope'));
    await type('/flag metRowan=true | /time evening');
    assert.equal(W.runtime.flags.metRowan, true);
    assert.equal(W.runtime.clock.time, 'evening');
    await type('/rep Royal Guard=+50');
    await type('/rep');
    assert.match(boxes[boxes.length - 1].text, /Royal Guard: \w+ \(50\)/);
    await type('/inv');
    assert.match(boxes[boxes.length - 1].text, /Silver Key[\s\S]*Purse: /);

    h.seedRandom([0.99]);
    await type('/encounter 1 Wolf');
    assert.ok(W.getCombat() && W.getCombat().active, 'the fight started');
    assert.ok(h.shell().isOpen('combat'));
    await type('/attack Wolf with Nothing');
    assert.match(boxes[boxes.length - 1].text, /You have no attack "Nothing"/);
    const n = L.entries().length;
    await type('/attack Wolf');
    assert.ok(L.entries().length > n, 'the attack is rolled and logged');
    await type('/encounter 1 Wolf');
    assert.match(boxes[boxes.length - 1].text, /A fight is already on/);
});

test('slash commands: run() for quick replies — send, or leave the message in the box', async (t) => {
    const { w, W, input, sent } = await session(t);
    const Chat = w.KLITE_RPMod_Chat;
    let r = Chat.run('/go Forest Road\nI draw my sword.', { send: false });
    assert.equal(r.ok, true);
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    assert.equal(input.value, 'I draw my sword.');
    assert.deepEqual(sent, []);
    input.value = '';
    r = Chat.run('/go Millbrook Village | Onward.', { send: true });
    assert.deepEqual(sent, ['Onward.']);
    assert.equal(Chat.isCommand('/go x'), true);
    // regression: the Tools panel's sender used this.log (undefined) and sent nothing
    w.KLITE_RPMod.panels.TOOLS.sendQuickAction(0);
    assert.equal(sent.length, 2, 'a Quick Action reaches Esolite');
    assert.equal(Chat.isCommand('/nothing'), false);
});
