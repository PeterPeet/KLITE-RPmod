'use strict';
// R8 step 5 mechanics for the Lantern Fair: check objectives (contests RPmod rolls, once per in-game
// day, at a place), prerequisites.notFlags, /try, the Here row, the Quest log's Try button, the
// editor's "Check (contest)" objective and the validator's objective checks.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, click, sleep, selectNode, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const QR = requireSrc('src/game/quest-rules.js');
const AR = requireSrc('src/adventures/adventure-rules.js');
const DL = requireSrc('src/adventures/content/drowned-lantern.js');
const CH = requireSrc('src/chat/chat-rules.js');

test('rules: check objectives and notFlags', () => {
    assert.ok(QR.OBJECTIVE_KINDS.includes('check'));
    const o = { id: 'o1', kind: 'check', skill: 'sleight_of_hand', dc: 14, text: 'Pick the judge\'s pocket' };
    assert.equal(QR.checkWhat(o), 'Sleight Of Hand');
    assert.equal(QR.checkWhat({ ability: 'dex' }), 'Dexterity');
    assert.equal(QR.objectiveLabel(o, QR.objectiveStatus(o, false)), 'Pick the judge\'s pocket (Sleight Of Hand check, DC 14)');
    assert.equal(QR.objectiveStatus(o, true).done, true);
    const facts = { level: 3, questState: () => '', flag: (k) => k === 'fair_over' };
    assert.deepEqual(QR.unmetPrerequisites({ prerequisites: { notFlags: ['fair_over'] } }, facts), ['No longer: fair_over']);
    assert.deepEqual(QR.unmetPrerequisites({ prerequisites: { notFlags: ['heist_night'] } }, facts), []);
    assert.deepEqual(CH.hereReplies({ place: 'Fairground', checks: [{ questId: 'q', objId: 'o1', text: 'Win the archery', what: 'Dexterity', dc: 13 }] }).map(r => [r.label, r.text, r.kind]),
        [['Try: Win the archery (Dexterity)', '/try Win the archery | I try: Win the archery.', 'check']]);
});

test('validator: objectives need known people and places; a check needs a skill or ability and a DC', () => {
    const pkg = DL.drownedLantern();
    const q = pkg.world.quests.find(x => x.id === 'q_contest_archery');
    q.objectives[0] = { id: 'o1', kind: 'check', ability: 'luck', text: 'x', at: 'lp_nowhere' };
    pkg.world.quests.find(x => x.id === 'q_whispers').objectives[0].target = 'npc_nobody';
    const errs = AR.validateAdventure(pkg).errors.join('\n');
    assert.match(errs, /q_contest_archery objective o1 place: unknown location "lp_nowhere"/);
    assert.match(errs, /q_contest_archery objective o1: a check needs a skill or an ability/);
    assert.match(errs, /q_contest_archery objective o1: a check needs a DC/);
    assert.match(errs, /q_whispers objective o1: unknown person "npc_nobody"/);
});

async function exampleWithContest(t) {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    w.prepare_submit_generation = () => { input.value = ''; return w.submit_generation(''); };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Kara', { description: 'A scout.' });
    await C.saveSheet('Kara', { className: 'Rogue', level: 1, abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 10 }, skills: { athletics: 1 } });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    C.cachedSheet('Kara'); await sleep(30);
    await W.loadExample();
    const q = W.addEntity('quest', { name: 'Village Games' });
    W.updateEntity(q.id, { objectives: [{ id: 'o1', kind: 'check', skill: 'athletics', dc: 12, at: 'loc_village', text: 'Win the tug of war' }] });
    return { h, w, W, q: q.id, input };
}

test('/try and the Here row: the persona\'s bonus against the DC, at the place, once a day; the AI is told to narrate', async (t) => {
    const { h, w, W, q, input } = await exampleWithContest(t);
    W.acceptQuest(q);
    W.moveTo('Forest Road');
    assert.deepEqual(JSON.parse(JSON.stringify(W.here().checks)), [], 'not here: in the village (its places count too)');
    input.value = '/try tug of war'; await w.prepare_submit_generation();
    assert.match(w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n'), /Try tug of war refused: there is nothing like that to try here/);
    W.moveTo('Millbrook Village');
    assert.equal(W.here().checks.length, 1);
    assert.match(W.preview(), /Win the tug of war \(Athletics check, DC 12\)[\s\S]*rolled by RPmod when the player tries them/);
    h.seedRandom([0.45]);   // d20 = 10, +2 (Athletics, proficiency) = 12: success
    input.value = '/try Win the tug of war'; await w.prepare_submit_generation();
    const last = w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    assert.match(last, /Win the tug of war — Athletics check \(DC 12\): 12 \[d20 10\+2\] — success\./);
    assert.equal(W.questState(q), 'complete');
    assert.deepEqual(JSON.parse(JSON.stringify(W.here().checks)), [], 'done: nothing left to try');
});

test('Quest log: a contest that can be tried here has a Try button', async (t) => {
    const { h, w, W, q } = await exampleWithContest(t);
    W.acceptQuest(q); W.moveTo('Millbrook Village');
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    const btn = w.document.querySelector(`[data-window="questlog"] [data-quest="${q}"] [data-ui="try-o1"]`);
    assert.ok(btn, 'Try');
    h.seedRandom([0.0]);
    click(btn, w); await sleep(30);
    assert.equal(W.questState(q), 'active', 'a natural 1');
    assert.equal(w.document.querySelector(`[data-window="questlog"] [data-ui="try-o1"]`), null, 'no second try today');
});

test('editor: a "Check (contest)" objective with a skill and a DC', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [] };
    h.load('shell', 'worlds', 'worldsUI'); await h.ready({ ui: true });
    const W = h.api(); const w = h.window; const doc = w.document;
    await W.loadExample();
    h.ui().openEditor();
    selectNode(h, 'q_merchant');
    const ed = () => doc.getElementById('wm-editor');
    const kind = ed().querySelector('[aria-label="Objective kind"]'); kind.value = 'check'; kind.dispatchEvent(new w.Event('change'));
    const what = ed().querySelector('[aria-label="Check skill or ability"]'); what.value = 'skill:persuasion';
    const dc = ed().querySelector('[aria-label="Check DC"]'); dc.value = '15';
    click(ed().querySelector('[aria-label="Add objective"]'), w);
    const o = W.entityById('q_merchant').objectives.slice(-1)[0];
    assert.deepEqual(JSON.parse(JSON.stringify(o, ['kind', 'skill', 'dc', 'text'])), { text: 'Pass a Persuasion check', kind: 'check', skill: 'persuasion', dc: 15 });
});
