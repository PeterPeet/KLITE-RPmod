'use strict';
// Worlds UI in jsdom: shell views (World tab, Party/Quests sections, Quest log and
// Combat windows) + the world editor window.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, texts, selectNode, sleep } = require('./helpers/host');

async function uiHost(t) {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [{ id: 'c1', name: 'Captain Rowan', personality: 'stern' }] };
    h.load('shell', 'worlds', 'worldsUI');
    await h.ready({ ui: true });
    return h;
}

test('World tab: example button, window launchers, creator/player lens, state slots', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    assert.ok(doc.getElementById('rpm-navbtn'), 'single shell entry in the top bar');
    assert.equal(doc.getElementById('wm-navbtn'), null, 'no separate Worlds navbar button');
    const panel = () => doc.getElementById('wm-panel');
    assert.ok(panel().closest('#rpm-dock-right'), 'World view lives in the right dock');
    click(findButton(panel(), /Load example world/), w);
    await sleep(80);
    assert.ok(W.activeWorld() && W.isEnabled(), 'example loaded + enabled');
    for (const b of [/Quest log/, /Combat/, /Editor/]) assert.ok(findButton(panel(), b), String(b));
    assert.ok(findButton(panel(), /Reset/) && findButton(panel(), /Commit/) && findButton(panel(), /Swap/));
    const chip = [...panel().querySelectorAll('span')].find(s => s.textContent === 'Creator');
    click(chip, w);
    assert.ok([...panel().querySelectorAll('span')].some(s => s.textContent === 'Player'));
    assert.equal(w.localStorage.getItem('KLITE.worlds.uiMode'), 'player');
});

test('quest log + combat windows, quest tracker and party sections stay in sync', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel();
    const panel = () => doc.getElementById('wm-panel');
    const win = (id) => doc.querySelector(`[data-window="${id}"]`);
    const tracker = () => doc.querySelector('[data-section="quest-tracker"]');

    click(findButton(panel(), /Quest log/), w);
    assert.ok(win('questlog'), 'quest log window');
    assert.ok(texts(win('questlog')).some(s => /The Missing Merchant/.test(s)));
    assert.ok(!texts(tracker()).some(s => /The Missing Merchant/.test(s)), 'not tracked before accepting');
    click(findButton(win('questlog'), /^Accept$/), w);
    assert.equal(W.questState('q_merchant'), 'active');
    assert.ok(tracker().querySelector('[data-quest="q_merchant"]'), 'tracker shows the accepted quest');

    click(findButton(panel(), /Combat/), w);
    assert.ok(findButton(win('combat'), /Start encounter/));
    W.startEncounter(['npc_kell']); h.ui().refreshPanel();
    assert.ok(texts(win('combat')).some(s => /Round 1/.test(s)));
    assert.ok(findButton(doc.querySelector('[data-section="party"]'), /Round 1/), 'party shows combat status');
    click(findButton(win('combat'), /End/), w);
    assert.equal(W.getCombat(), null);
});

test('engine changes outside the UI (chat tags, API) refresh the views', async (t) => {
    const h = await uiHost(t); const doc = h.window.document; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel();
    W.moveTo('Forest Road');
    await sleep(30);
    assert.match(doc.querySelector('[data-party="location"]').textContent, /Forest Road/);
});

test('editor: World Rules + Description on the root node', async (t) => {
    const h = await uiHost(t); const w = h.window; const W = h.api();
    await W.loadExample();
    h.ui().openEditor();
    selectNode(h, '__world__');
    const ov = w.document.getElementById('wm-editor');
    assert.ok([...ov.querySelectorAll('label')].some(l => l.textContent === 'Description'));
    const rules = [...ov.querySelectorAll('textarea')].find(ta => /Medieval low-fantasy/.test(ta.value));
    assert.ok(rules, 'World Rules editor shows existing rules');
    rules.value = 'Grimdark tone.\nSecond person.';
    rules.dispatchEvent(new w.Event('input'));
    // arrays created in the page realm: compare by value
    assert.equal(JSON.stringify(W.activeWorld().rules), JSON.stringify(['Grimdark tone.', 'Second person.']));
    assert.match(W.preview(), /Grimdark tone/);
});

test('editor: event triggers, person character link, themed preview', async (t) => {
    const h = await uiHost(t); const w = h.window; const W = h.api();
    await W.newWorld('E'); W.addEntity('location', { name: 'Tavern' });
    const ev = W.addEntity('event', { name: 'Ev' });
    const p = W.addEntity('npc', { name: '' });
    W.enable();
    h.ui().openEditor();
    const ov = () => w.document.getElementById('wm-editor');

    selectNode(h, ev.id);
    assert.ok(texts(ov()).some(s => /Triggers/.test(s)));
    click([...ov().querySelectorAll('button')].filter(b => b.textContent === 'Add')[0], w);
    assert.equal(W.entityById(ev.id).triggers.length, 1);

    selectNode(h, p.id);
    const sel = [...ov().querySelectorAll('select')].find(s => [...s.options].some(o => o.text === 'Captain Rowan'));
    assert.ok(sel, 'character-link dropdown lists library characters');
    sel.value = 'Captain Rowan'; sel.dispatchEvent(new w.Event('change'));
    assert.equal(W.personName(p.id), 'Captain Rowan');

    click(findButton(ov(), /Preview/), w);
    const pre = [...w.document.querySelectorAll('pre')].find(x => /\[Current Time\]/.test(x.textContent));
    assert.ok(pre, 'preview modal open');
    // Esolite's global `pre{background-color:#f5f5f5}` must be overridden by an inline
    // themed background. jsdom's CSS parser drops this (valid) combined style string, so we
    // guard the fix at source level; it was verified live in the browser.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'KLITE-RPmod_WorldsUI.js'), 'utf8');
    const showPreview = src.slice(src.indexOf('function showPreview'), src.indexOf('function showPreview') + 1500);
    assert.match(showPreview, /el\('pre', \{ style: '[^']*background:var\(--rpm-bg-chat\)/, 'preview <pre> declares a themed background');
    assert.ok(pre.closest('.rpm-themed'), 'preview modal carries the theme token scope');
});

test('editor: opens as a large shell window, reopens without duplicates, cleans up on close', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    await W.loadExample();
    h.ui().openEditor();
    const win = doc.querySelector('[data-window="editor"]');
    assert.ok(win, 'editor is a shell window');
    assert.ok(win.closest('#rpm-shell'), 'inside the shell layer, not a body overlay');
    assert.ok(doc.getElementById('wm-editor').closest('.rpm-window-body-flush'));
    assert.ok(parseInt(win.style.width, 10) >= 1300, 'large by default');
    assert.equal(doc.getElementById('wm-overlay'), null, 'old overlay gone');
    assert.ok(doc.querySelectorAll('#wm-editor g[data-id]').length > 5, 'graph drawn');

    selectNode(h, '__world__');
    h.ui().openEditor();   // again: same window, reloaded, selection reset
    assert.equal(doc.querySelectorAll('[data-window="editor"]').length, 1);
    assert.equal(doc.querySelectorAll('#wm-editor').length, 1);
    assert.match(doc.getElementById('wm-editor').textContent, /Select a node to edit/);

    h.ui().closeEditor();
    assert.equal(doc.querySelector('[data-window="editor"]'), null);
    assert.equal(h.shell().layout().windows.editor.open, false);
    // listeners removed: a stray mouse move after close must not throw
    w.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 5, clientY: 5 }));

    // World tab button opens it too
    h.shell().open('world');
    click(findButton(doc.getElementById('wm-panel'), /Editor/), w);
    assert.ok(doc.querySelector('[data-window="editor"]'));
});
