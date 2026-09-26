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

test('World Management: premade worlds, rename, enable, state slots; World Creation: launchers, lens, State editor (R8)', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    assert.ok(doc.getElementById('rpm-navbtn'), 'single shell entry in the top bar');
    assert.equal(doc.getElementById('wm-navbtn'), null, 'no separate Worlds navbar button');
    const panel = () => doc.getElementById('wm-panel');
    assert.ok(panel().closest('#rpm-dock-right'), 'World Management lives in the right dock');
    assert.deepEqual([...doc.querySelectorAll('.rpm-tabrow[data-group="adventure"] [role=tab]')].map(b => b.textContent), ['World Management', 'World Creation']);
    assert.ok(findButton(panel(), /Rename/).disabled, 'nothing to rename yet');
    click(findButton(panel().querySelector('[data-ui="premade"]'), /Load minimal example world/), w);
    await sleep(80);
    assert.ok(W.activeWorld() && W.isEnabled(), 'example loaded + enabled');
    assert.ok(!findButton(panel(), /^Example$/), 'the Example button became Rename');
    const origPrompt = w.prompt; w.prompt = () => 'Eldoria Reborn';
    click(findButton(panel(), /Rename/), w);
    w.prompt = origPrompt;
    assert.equal(W.activeWorld().name, 'Eldoria Reborn');
    for (const b of [/Quest log/, /Combat/, /^Editor$/]) assert.ok(!findButton(panel(), b), 'no creator windows in World Management: ' + b);
    // game state (engine: working / base slots)
    const gs = () => panel().querySelector('[data-ui="game-state"]');
    assert.ok(texts(gs()).includes('Live game'));
    assert.ok(findButton(gs(), /Back to start/) && findButton(gs(), /Save as start/) && findButton(gs(), /Edit start state/));
    click(findButton(gs(), /Edit start state/), w);
    assert.equal(W.activeSlot, 'base');
    assert.ok(texts(gs()).includes('Editing start state'));
    assert.ok(!findButton(gs(), /Back to start/) && !findButton(gs(), /Save as start/), 'no reset/commit while editing the start');
    click(findButton(gs(), /Back to the live game/), w);
    assert.equal(W.activeSlot, 'working');
    W.moveTo('Forest Road');
    const origConfirm = w.confirm; w.confirm = () => true;
    click(findButton(gs(), /Back to start/), w);
    w.confirm = origConfirm;
    assert.equal(W.runtime.playerLocationId, 'loc_village', 'Back to start resets the live game');

    // World Creation
    h.shell().open('worldcreate'); await sleep(20);
    const cr = () => doc.getElementById('wm-create');
    for (const b of [/Quest log/, /Reputation/, /Combat/, /^Editor$/, /Quest editor/, /Preview what the AI sees/]) assert.ok(findButton(cr(), b), String(b));
    assert.ok(cr().querySelector('[data-ui="state-editor"]'), 'State editor (Creator view)');
    assert.ok(cr().querySelector('[aria-label="Current location"]') && cr().querySelector('[aria-label="Time of day"]') && cr().querySelector('[aria-label="Flag name"]'));
    assert.equal(cr().querySelector('[aria-label="Item name"]'), null, 'no inventory in the State editor');
    click(cr().querySelector('[data-lens="player"]'), w);
    assert.equal(w.localStorage.getItem('KLITE.worlds.uiMode'), 'player');
    assert.equal(cr().querySelector('[data-lens="player"]').getAttribute('aria-pressed'), 'true');
    assert.ok(!findButton(cr(), /Quest editor/), 'Player view: no Quest editor');
    assert.equal(cr().querySelector('[data-ui="state-editor"]'), null, 'Player view: no State editor');
    h.shell().open('world'); await sleep(20);
    assert.ok(!findButton(gs(), /Edit start state/), 'Player view: no start-state editing');
    assert.ok(findButton(gs(), /Back to start/), 'Player view keeps Back to start');
});

test('Adventure panel: the Inventory section (the persona\'s items; R8 moved it out of the World tab)', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel(); await sleep(20);
    const sec = () => doc.querySelector('#rpm-dock-left [data-section="inventory"]');
    assert.ok(sec(), 'a left-dock section');
    const ids = [...doc.querySelectorAll('#rpm-dock-left [data-section]')].map(e => e.getAttribute('data-section'));
    assert.equal(ids[ids.indexOf('party') + 1], 'inventory', 'right below the Party');
    const inp = sec().querySelector('[aria-label="Item name"]'); inp.value = 'Lantern';
    click(findButton(sec(), /Give item/) || sec().querySelector('button[title="Give item"]'), w);
    assert.equal(W.itemCount('Lantern'), 1);
    await sleep(30);
    assert.ok(texts(sec()).some(t => /Lantern/.test(t)));
});

test('quest log + combat windows, quest tracker and party sections stay in sync', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel();
    const panel = () => doc.getElementById('wm-panel');
    const win = (id) => doc.querySelector(`[data-window="${id}"]`);
    const tracker = () => doc.querySelector('[data-section="quest-tracker"]');

    W.moveTo('The Crooked Kettle'); h.ui().refreshPanel();   // R8: the log offers the quests of the people here
    h.shell().open('worldcreate'); await sleep(20);
    const create = () => doc.getElementById('wm-create');
    click(findButton(create(), /Quest log/), w);   // Creator view: every quest
    assert.ok(win('questlog-all'), 'quest log window (all quests)');
    w.KLITE_RPMod_Shell.open('questlog');           // the player's log (Adventure panel)
    assert.ok(win('questlog'), 'quest log window');
    assert.ok(texts(win('questlog')).some(s => /The Missing Merchant/.test(s)));
    assert.ok(!texts(tracker()).some(s => /The Missing Merchant/.test(s)), 'not tracked before accepting');
    click(findButton(win('questlog'), /^Accept$/), w);
    assert.equal(W.questState('q_merchant'), 'active');
    assert.ok(tracker().querySelector('[data-quest="q_merchant"]'), 'tracker shows the accepted quest');

    click(findButton(create(), /Combat/), w);
    assert.ok(findButton(win('combat'), /Start encounter/));
    W.startEncounter(['npc_kell']); h.ui().refreshPanel();
    assert.ok(texts(win('combat')).some(s => /Round 1/.test(s)));
    assert.ok(findButton(doc.querySelector('[data-section="party"]'), /Round 1/), 'party shows combat status');
    click(win('combat').querySelector('[data-cb="end"]'), w);   // "End encounter" (not "End turn")
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

test('editor: the world\'s start (place, time, view, from the live game); choosing a world applies its view', async (t) => {
    const h = await uiHost(t); const w = h.window; const W = h.api();
    await W.loadExample();
    h.ui().openEditor();
    selectNode(h, '__world__');
    const card = () => w.document.querySelector('#wm-editor [data-ui="world-start"]');
    assert.ok(card(), 'Start of a new game');
    const place = card().querySelector('[data-start="place"]');
    assert.equal(place.value, 'loc_village', 'shows the example\'s start');
    place.value = 'loc_forest'; place.dispatchEvent(new w.Event('change'));
    assert.equal(W.worldStart().locationId, 'loc_forest');
    const time = card().querySelector('[data-start="time"]');
    time.value = 'night'; time.dispatchEvent(new w.Event('change'));
    assert.equal(W.worldStart().clock.time, 'night');
    const view = card().querySelector('[data-start="view"]');
    view.value = 'player'; view.dispatchEvent(new w.Event('change'));
    assert.equal(W.worldStart().view, 'player');
    W.moveTo('The Crooked Kettle');
    click(card().querySelector('[data-ui="start-from-live"]'), w);
    assert.equal(W.worldStart().locationId, W.runtime.playerLocationId);
    assert.equal(W.worldStart().view, 'player', 'the view is kept');
    h.ui().closeEditor();
    // the World tab's selector applies the chosen world's view
    await W.newWorld('Other'); h.ui().setUiMode('creator'); h.ui().refreshPanel();
    const sel = w.document.querySelector('#wm-panel select[aria-label="Active world"]');
    sel.value = W.listWorlds().find(x => /Eldoria/.test(x.name)).id; sel.dispatchEvent(new w.Event('change'));
    assert.equal(h.ui().uiMode(), 'player');
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

    // World Creation's button opens it too, and so does the Quick Link
    h.shell().open('worldcreate');
    click(findButton(doc.getElementById('wm-create'), /^Editor$/), w);
    assert.ok(doc.querySelector('[data-window="editor"]'));
    h.ui().closeEditor();
    click(doc.querySelector('[data-link="editor"]'), w);
    assert.ok(doc.querySelector('[data-window="editor"]'));
});
