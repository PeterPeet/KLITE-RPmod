'use strict';
// R8 play-test fixes: the Quest log shows the quests the player accepted (and what is offered
// here), the Quest editor (Creator view) every quest; the Reputation window only the factions the
// player has met; the Here quick replies offer "Ask to join" and "Unlock".
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, click, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const plain = (v) => JSON.parse(JSON.stringify(v));

async function uiWorld(t, view = 'player') {
    const h = createHost(); t.after(h.close);
    h.window.localStorage.setItem('KLITE.worlds.uiMode', view);
    h.load('shell', 'gamelog', 'worlds', 'worldsUI'); await h.ready({ ui: true });
    await h.api().loadExample(); h.ui().refreshPanel(); await sleep(20);
    h.window.KLITE_RPMod_Shell.open('worldcreate'); await sleep(20);   // R8: the window launchers live in World Creation
    return h;
}
const cards = (win) => [...win.querySelectorAll('[data-quest]')].map(c => c.getAttribute('data-quest'));

test('Quest log: accepted quests only, plus the ones offered by people here', async (t) => {
    const h = await uiWorld(t); const w = h.window; const doc = w.document; const W = h.api();
    w.KLITE_RPMod_Shell.open('questlog'); await sleep(30);
    const win = () => doc.querySelector('[data-window="questlog"]');
    assert.deepEqual(cards(win()), [], 'nothing accepted, no one here offers a quest');
    assert.match(win().textContent, /People with a yellow ! offer you one/);
    W.moveTo('The Crooked Kettle'); w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.deepEqual(cards(win()), ['q_merchant'], 'Bram offers his quest here');
    assert.match(win().textContent, /Offered here/);
    const accept = [...win().querySelectorAll('button')].find(b => b.textContent === 'Accept');
    click(accept, w); await sleep(30);
    assert.equal(W.questState('q_merchant'), 'active');
    W.moveTo('Millbrook Village'); w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.deepEqual(cards(win()), ['q_merchant'], 'accepted quests stay in the log anywhere');
    assert.equal(doc.querySelector('[data-ui="open-questeditor"]'), null, 'no Quest editor in the Player view');
    assert.equal(doc.querySelector('[data-link="questeditor"]'), null, 'nor among the Quick Links');
});

test('Quest editor (Creator view): every quest, its state, edit in the editor, a new quest', async (t) => {
    const h = await uiWorld(t, 'creator'); const w = h.window; const doc = w.document; const W = h.api();
    assert.ok(doc.querySelector('[data-link="questeditor"]'), 'a Quick Link in the Creator view');
    click(doc.querySelector('[data-ui="open-questeditor"]'), w); await sleep(30);
    const win = () => doc.querySelector('[data-window="questeditor"]');
    assert.deepEqual(cards(win()).sort(), ['q_bounty', 'q_delivery', 'q_merchant', 'q_patrol']);
    const st = win().querySelector('[data-qstate="q_bounty"]');
    st.value = 'active'; st.dispatchEvent(new w.Event('change')); await sleep(30);
    assert.equal(W.questState('q_bounty'), 'active');
    click(win().querySelector('[data-quest="q_merchant"] [data-ui="edit-quest"]'), w); await sleep(40);
    assert.ok(doc.querySelector('[data-window="editor"]'), 'the editor opens');
    assert.match(doc.querySelector('#wm-editor').textContent, /The Missing Merchant/);
    h.ui().closeEditor(); await sleep(20);
    const before = W.listQuests('gm').length;
    click(win().querySelector('[data-ui="new-quest"]'), w); await sleep(40);
    assert.equal(W.listQuests('gm').length, before + 1);
});

test('Reputation window: the Player view shows only factions you have met', async (t) => {
    const h = await uiWorld(t); const w = h.window; const doc = w.document; const W = h.api();
    click(doc.querySelector('[data-ui="open-reputation"]'), w); await sleep(30);
    const reps = () => [...doc.querySelectorAll('[data-window="reputation"] [data-rep]')].map(e => e.getAttribute('data-rep'));
    assert.deepEqual(reps(), [], 'no faction met yet');
    assert.match(doc.querySelector('[data-window="reputation"]').textContent, /not met any faction yet/);
    W.moveTo('Royal Watchtower'); await w.prepare_submit_generation(); w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.deepEqual(reps(), ['fac_guard'], 'met the Guard at their headquarters');
    W.changeReputation('fac_bandit', -50); w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.deepEqual(reps().sort(), ['fac_bandit', 'fac_guard'], 'a changed standing counts as met');
    assert.equal(plain(W.reputation()).length, 3, 'the engine still knows every faction');
});

test('Here quick replies: "Ask to join" for people who can join', async (t) => {
    const CH = requireSrc('src/chat/chat-rules.js');
    const h = await uiWorld(t); const W = h.api();
    W.moveTo('The Crooked Kettle'); W.updateEntity('npc_bram', { canJoin: true });
    const r = CH.hereReplies(plain(W.here())).find(x => x.kind === 'join');
    assert.deepEqual([r.label, r.text], ['Ask to join: Innkeeper Bram', '/join Innkeeper Bram | I ask Innkeeper Bram to travel with me.']);
    W.joinParty('Bram');
    assert.equal(CH.hereReplies(plain(W.here())).find(x => x.kind === 'join'), undefined, 'not once they travel with you');
});

test('Adventure panel: a Reputation section (between Quests and Dice log) with the factions met', async (t) => {
    const h = await uiWorld(t); const w = h.window; const doc = w.document; const W = h.api();
    const sec = () => doc.querySelector('[data-section="rep-tracker"]');
    assert.ok(sec(), 'the section exists');
    const ids = [...doc.querySelectorAll('#rpm-dock-left [data-section]')].map(e => e.getAttribute('data-section'));
    assert.ok(ids.indexOf('quest-tracker') < ids.indexOf('rep-tracker'), JSON.stringify(ids));
    assert.match(sec().textContent, /No faction met yet/);
    W.changeReputation('fac_guard', 150); w.KLITE_RPMod_Shell.refresh(); await sleep(30);
    assert.equal(sec().querySelector('[data-rep-track="fac_guard"] [data-tier]').textContent, 'Friendly');
    click(sec().querySelector('[data-ui="open-rep"]'), w); await sleep(30);
    assert.ok(doc.querySelector('[data-window="reputation"]'), 'the button opens the Reputation window');
});
