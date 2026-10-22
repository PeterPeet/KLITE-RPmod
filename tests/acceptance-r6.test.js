'use strict';
// R6 acceptance (ROADMAP): run a session using only slash commands and quick replies; export a
// world as a lorebook and re-import it. Headless, with the bundle and the example world; the AI's
// narration is not part of it (no backend — known issue 5), every message is recorded instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, sleep } = require('./helpers/host');

const plain = (x) => JSON.parse(JSON.stringify(x));

test('R6 acceptance: a quest from offer to reward with commands and quick replies only; the world survives a lorebook round trip', async (t) => {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    const sent = [], boxes = [];
    w.prepare_submit_generation = () => { sent.push(input.value); input.value = ''; return w.submit_generation(''); };
    w.msgbox = (text, title) => boxes.push({ title, text });
    w.btn_memory = () => boxes.push({ title: 'Context' });
    w.autogenerate_summary_memory = () => boxes.push({ title: 'AutoGenerate Memory' });
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); const C = w.KLITE_RPMod_Characters; const L = w.KLITE_RPMod_Log;
    await w.__addEsoCharacter('Kara', { description: 'A scout.' });
    await C.saveSheet('Kara', { className: 'Fighter', level: 1, xp: 0, abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
        hp: { max: 12, current: 12 }, attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3' }], inventory: [], coins: { gp: 10 } });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    const Q = w.KLITE_RPMod_Chat.quickReplies;
    for (let i = 0; i < 80 && !Q.ready(); i++) await sleep(25);
    h.shell().open('quick-replies');
    const type = async (text) => { input.value = text; await w.prepare_submit_generation(); await sleep(20); };
    const here = (re) => { const b = [...w.document.querySelectorAll('[data-qr-row="here"] button')].find(x => re.test(x.textContent)); assert.ok(b, 'Here reply ' + re); return b; };
    const reply = async (re) => { click(here(re), w); await sleep(30); };

    // the world, typed
    await type('/help');
    assert.match(boxes.pop().text, /\/go <place or direction>/);
    await W.loadExample(); await sleep(30);
    await type('/go The Crooked Kettle | I shake the rain off my cloak and step inside.');
    assert.equal(W.runtime.playerLocationId, 'loc_tavern');

    // Bram offers the quest: accept it from the Here row, buy supplies by command
    await reply(/Accept: The Missing Merchant/);
    assert.equal(W.questState('q_merchant'), 'active');
    await type('/buy Torch x2 | "Two torches, Bram."');
    assert.ok(W.inventory().items.some(i => i.name === 'Torch' && i.qty === 2));

    // off to the Forest Road (objective 1) and the watchtower
    await reply(/Millbrook Village/);
    await reply(/Forest Road/);
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    h.seedRandom([0.5]);
    await type('/check perception 10 | I look for tracks.');
    assert.match(L.describe(L.entries().at(-1)), /Perception check \(DC 10\)/);
    await reply(/Royal Watchtower/);
    assert.equal(W.runtime.playerLocationId, 'loc_watchtower');

    // report to Rowan (objective 2) and turn the quest in: the rules pay the rewards
    await reply(/Talk: Captain Rowan/);
    assert.equal(W.questState('q_merchant'), 'complete');
    await reply(/Turn in: The Missing Merchant/);
    assert.equal(W.questState('q_merchant'), 'turnedin');
    assert.ok(W.inventory().items.some(i => i.name === 'Silver Ring'), 'reward item');
    assert.equal(W.inventory().xp, 100, 'reward XP on the sheet');
    await type('/rep');
    assert.match(boxes.pop().text, /Royal Guard: \w+ \(100\)/);

    // a fight, by command
    h.seedRandom([0.95]);
    await type('/encounter 1 Wolf');
    assert.ok(W.getCombat().active);
    for (let i = 0; i < 6 && !W.getCombat().outcome; i++) { await type('/attack Wolf'); if (!W.getCombat().outcome) await type('/endturn'); }
    assert.equal(W.getCombat().outcome, 'victory');

    // quick replies of my own and Esolite's summary
    click([...w.document.querySelectorAll('[data-qr-row="mine"] button')].find(b => b.textContent === 'Continue'), w);
    await type('/summary');
    assert.match(boxes.pop().text, /The story is empty/, 'Esolite would summarise nothing');
    w.gametext_arr.push('Kara went to the tavern.');
    await type('/summary');
    assert.deepEqual(boxes.slice(-2).map(b => b.title), ['Context', 'AutoGenerate Memory'], "Esolite's AutoGenerate Memory");

    // only the text parts reached the AI, in order; no command text
    assert.deepEqual(plain(sent), ['I shake the rain off my cloak and step inside.', 'I take on the task: The Missing Merchant.', '"Two torches, Bram."',
        'I go to Millbrook Village.', 'I go to Forest Road.', 'I look for tracks.', 'I go to Royal Watchtower.', 'I talk to Captain Rowan.',
        'I report back: The Missing Merchant.', '']);
    assert.ok(sent.every(s => !s.startsWith('/')));

    // export as a lorebook, re-import: the world comes back as a copy
    const book = plain(W.exportWorldAsLorebook(null, 'tavern'));
    const original = plain(W.exportWorld());
    await W.importLorebook(book, {});
    const copy = plain(W.activeWorld());
    assert.notEqual(copy.id, original.id);
    delete copy.id; delete copy.name; delete original.id; delete original.name;
    assert.deepEqual(copy, original);
});
