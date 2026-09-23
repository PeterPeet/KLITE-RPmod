'use strict';
// Worlds UI (panel + editor overlay) in jsdom.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, texts, selectNode, sleep } = require('./helpers/host');

async function uiHost(t) {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [{ id: 'c1', name: 'Captain Rowan', personality: 'stern' }] };
    h.load('worlds', 'worldsUI');
    await h.ready({ ui: true });
    return h;
}

test('panel: example button, tabs, creator/player lens, state slots', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    assert.ok(doc.getElementById('wm-navbtn'), 'navbar button');
    const panel = () => doc.getElementById('wm-panel');
    click(findButton(panel(), /Load example world/), w);
    await sleep(80);
    assert.ok(W.activeWorld() && W.isEnabled(), 'example loaded + enabled');
    for (const tab of ['Play', 'Quests', 'Combat', 'Editor']) assert.ok(findButton(panel(), new RegExp('^' + tab + '$')), tab + ' tab');
    assert.ok(findButton(panel(), /Reset/) && findButton(panel(), /Commit/) && findButton(panel(), /Swap/));
    const chip = [...panel().querySelectorAll('span')].find(s => s.textContent === 'Creator');
    click(chip, w);
    assert.ok([...panel().querySelectorAll('span')].some(s => s.textContent === 'Player'));
    assert.equal(w.localStorage.getItem('KLITE.worlds.uiMode'), 'player');
});

test('quest log and combat tab', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel();
    const panel = () => doc.getElementById('wm-panel');
    click(findButton(panel(), /^Quests$/), w);
    assert.ok(texts(panel()).some(s => /The Missing Merchant/.test(s)));
    click(findButton(panel(), /^Accept$/), w);
    assert.equal(W.questState('q_merchant'), 'active');
    click(findButton(panel(), /^Combat$/), w);
    assert.ok(findButton(panel(), /Start encounter/));
    W.startEncounter(['npc_kell']); h.ui().refreshPanel();
    click(findButton(panel(), /^Combat$/), w);
    assert.ok(texts(panel()).some(s => /Round 1/.test(s)));
    click(findButton(panel(), /End/), w);
    assert.equal(W.getCombat(), null);
});

test('editor: World Rules + Description on the root node', async (t) => {
    const h = await uiHost(t); const w = h.window; const W = h.api();
    await W.loadExample();
    h.ui().openEditor();
    selectNode(h, '__world__');
    const ov = w.document.getElementById('wm-overlay');
    assert.ok([...ov.querySelectorAll('label')].some(l => l.textContent === 'Description'));
    const rules = [...ov.querySelectorAll('textarea')].find(ta => /Medieval low-fantasy/.test(ta.value));
    assert.ok(rules, 'World Rules editor shows existing rules');
    rules.value = 'Grimdark tone.\nSecond person.';
    rules.dispatchEvent(new w.Event('input'));
    // arrays created in the page realm: compare by value
    assert.equal(JSON.stringify(W.activeWorld().rules), JSON.stringify(['Grimdark tone.', 'Second person.']));
    assert.match(W.preview(), /Grimdark tone/);
});

test('editor: event triggers, person character link, dark preview', async (t) => {
    const h = await uiHost(t); const w = h.window; const W = h.api();
    await W.newWorld('E'); W.addEntity('location', { name: 'Tavern' });
    const ev = W.addEntity('event', { name: 'Ev' });
    const p = W.addEntity('npc', { name: '' });
    W.enable();
    h.ui().openEditor();
    const ov = () => w.document.getElementById('wm-overlay');

    selectNode(h, ev.id);
    assert.ok(texts(ov()).some(s => /Triggers/.test(s)));
    click([...ov().querySelectorAll('button')].filter(b => b.textContent === '＋ add')[0], w);
    assert.equal(W.entityById(ev.id).triggers.length, 1);

    selectNode(h, p.id);
    const sel = [...ov().querySelectorAll('select')].find(s => [...s.options].some(o => o.text === 'Captain Rowan'));
    assert.ok(sel, 'character-link dropdown lists library characters');
    sel.value = 'c1'; sel.dispatchEvent(new w.Event('change'));
    assert.equal(W.personName(p.id), 'Captain Rowan');

    click(findButton(ov(), /Preview/), w);
    const pre = [...w.document.querySelectorAll('pre')].find(x => /\[Current Time\]/.test(x.textContent));
    assert.ok(pre, 'preview modal open');
    // Esolite's global `pre{background-color:#f5f5f5}` must be overridden by an inline dark
    // background. jsdom's CSS parser drops this (valid) combined style string entirely, so we
    // guard the fix at source level; it was verified live in the browser (rgb(20,20,20)).
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'KLITE-RPmod_WorldsUI.js'), 'utf8');
    const showPreview = src.slice(src.indexOf('function showPreview'), src.indexOf('function showPreview') + 1500);
    assert.match(showPreview, /el\('pre', \{ style: '[^']*background:#141414/, 'preview <pre> declares a dark background');
});
