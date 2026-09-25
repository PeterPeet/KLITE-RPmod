'use strict';
// R6 step 2: quick replies (left dock), the migration of the Tools panel's Quick Actions, and
// the "Here" row built from W.here().
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
const CR = requireSrc('src/chat/chat-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

test('quick replies: stored replies win; custom Quick Actions are migrated; the old defaults become the new ones', () => {
    const saved = { version: 1, replies: [{ label: 'Hi', text: 'Hello!', send: false }] };
    assert.deepEqual(CR.loadReplies(saved, ['> Dance']), [{ label: 'Hi', text: 'Hello!', send: false }]);
    assert.deepEqual(CR.loadReplies(null, ['> Dance', '', 'Sing a song']), [
        { label: 'Dance', text: '> Dance', send: true }, { label: 'Sing a song', text: 'Sing a song', send: true }], 'sent as a message, as before');
    assert.deepEqual(CR.loadReplies(null, CR.OLD_QUICK_DEFAULTS), CR.defaultReplies());
    assert.deepEqual(CR.loadReplies(null, null), CR.defaultReplies());
    assert.deepEqual(CR.normalizeReplies([{ text: '/look\nmore' }, null, 'x']), [{ label: '/look', text: '/look\nmore', send: true }]);
    assert.equal(CR.normalizeReplies('nope'), null);
});

test('quick replies: the Here row from W.here() — quests, ways out, people, shop, search', () => {
    const r = CR.hereReplies({ place: 'Hall', inMap: true, trade: true,
        quests: [{ id: 'q1', title: 'Rats | Cellar', action: 'accept' }, { id: 'q2', title: 'Old Debt', action: 'turnin' }],
        ways: [{ id: 'a', name: 'Ossuary', dir: 'n' }, { id: 'b', name: 'Village <Green>', dir: null }],
        people: [{ id: 'p', name: 'Bram', marker: '!' }] });
    assert.deepEqual(r.map(x => x.label), ['Accept: Rats Cellar', 'Turn in: Old Debt', 'north: Ossuary', '→ Village Green', '! Talk: Bram', 'Shop', 'Search']);
    assert.equal(r[0].text, '/accept Rats Cellar | I take on the task: Rats Cellar.', 'names cannot split the reply or open a tag');
    assert.equal(r[2].text, '/go north | I go to Ossuary.', 'rooms by direction');
    assert.equal(r[5].send, false);
    assert.deepEqual(CR.hereReplies({ place: null }), []);
});

async function play(t, { oldActions } = {}) {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    const input = w.document.createElement('textarea'); input.id = 'input_text'; w.document.body.appendChild(input);
    const sent = [];
    w.prepare_submit_generation = () => { sent.push(input.value); input.value = ''; return w.submit_generation(''); };
    w.msgbox = () => {};
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    if (oldActions) w.__idb.set('rpmod_adv_actions', JSON.stringify(oldActions));
    h.load('bundle'); await h.ready({ ui: true });
    const Q = w.KLITE_RPMod_Chat.quickReplies;
    for (let i = 0; i < 80 && !Q.ready(); i++) await sleep(25);
    h.shell().open('quick-replies');
    const box = () => w.document.querySelector('[data-qr-action="edit"]').closest('.rpm-qr-head').parentNode;
    const btn = (re, row = 'here') => [...w.document.querySelectorAll(`[data-qr-row="${row}"] button`)].find(b => re.test(b.textContent));
    return { h, w, W: h.api(), Q, sent, input, box, btn };
}

test('quick replies: a session by clicking — the Here row follows the world', async (t) => {
    const { h, w, W, sent, btn } = await play(t);
    assert.ok(btn(/Look around/, 'mine'), 'the default replies');
    assert.equal(btn(/Talk/), undefined, 'no Here row without an enabled world');
    await W.loadExample(); W.moveTo('The Crooked Kettle'); await sleep(30);
    const here = W.here();
    assert.equal(here.place, 'The Crooked Kettle');
    assert.ok(here.ways.some(x => x.name === 'Millbrook Village'));
    assert.deepEqual(plain(here.people.map(p => [p.name, p.marker])), [['Innkeeper Bram', '!']]);
    assert.deepEqual(plain(here.quests), [{ id: 'q_merchant', title: 'The Missing Merchant', action: 'accept' }]);
    assert.equal(here.trade, true);

    click(btn(/Accept: The Missing Merchant/), w);
    assert.equal(W.questState('q_merchant'), 'active');
    assert.deepEqual(plain(sent), ['I take on the task: The Missing Merchant.'], 'the command ran, then the message was sent');
    await sleep(30);
    assert.equal(btn(/Accept: The Missing Merchant/), undefined, 'the row followed the world');
    assert.ok(btn(/Talk: Courier Finn/), 'the courier event brought Finn to the tavern');

    click(btn(/Millbrook Village/), w);
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    assert.equal(sent[1], 'I go to Millbrook Village.');
    await sleep(30);
    assert.ok(btn(/Forest Road/), 'new ways out from the village');

    click(btn(/Inventory/, 'mine'), w);
    assert.equal(sent.length, 2, '/inv sends nothing');
    click(btn(/Continue/, 'mine'), w);
    assert.deepEqual(plain(sent.slice(2)), [''], 'an empty send: the AI continues');

    w.KLITE_RPMod_Settings.set('quick_replies_here', false); await sleep(30);
    assert.equal(w.document.querySelector('[data-qr-row="here"]'), null, 'the Here row can be switched off');
});

test('quick replies: custom Quick Actions are migrated once; edits are stored; the old key stays', async (t) => {
    const { w, Q, box, sent } = await play(t, { oldActions: ['> Dance wildly', '> Sing'] });
    assert.deepEqual(plain(Q.replies().map(r => r.label)), ['Dance wildly', 'Sing']);
    click([...box().querySelectorAll('button')].find(b => b.textContent === 'Sing'), w);
    assert.deepEqual(plain(sent), ['> Sing'], 'sent like the old Quick Action');

    click(box().querySelector('[data-qr-action="edit"]'), w);
    click(box().querySelector('[data-qr-action="add"]'), w);
    const items = box().querySelectorAll('[data-qr-item]');
    assert.equal(items.length, 3);
    const [label, text] = [items[2].querySelector('input[type=text]'), items[2].querySelector('textarea')];
    label.value = 'Buy torch'; label.dispatchEvent(new w.Event('input'));
    text.value = '/buy Torch | I pay Bram.'; text.dispatchEvent(new w.Event('input'));
    await sleep(400);
    const stored = JSON.parse(w.__idb.get('rpmod_quick_replies'));
    assert.deepEqual(stored.replies[2], { label: 'Buy torch', text: '/buy Torch | I pay Bram.', send: true });
    assert.ok(w.__idb.has('rpmod_adv_actions'), 'the old key is left in place');
    // escape: labels are text
    Q.setReplies([{ label: '<img src=x onerror=alert(1)>', text: 'hi' }]);
    click(box().querySelector('[data-qr-action="edit"]'), w);
    assert.equal(box().querySelector('img'), null);
    assert.equal(box().querySelector('[data-qr-row="mine"] button').textContent, '<img src=x onerror=alert(1)>');
});
