'use strict';
// App shell (src/shell/): docks, views, floating windows, layout persistence, Esolite
// layout push, ALPHA panel adoption.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, sleep } = require('./helpers/host');

async function shellHost(t, { width } = {}) {
    const h = createHost(); t.after(h.close);
    if (width) { h.window.innerWidth = width; }
    h.load('shell');
    h.window.dispatchEvent(new h.window.Event('load'));
    await sleep(10);
    return h;
}
const $ = (h, sel) => h.window.document.querySelector(sel);
const $$ = (h, sel) => [...h.window.document.querySelectorAll(sel)];
const cssVar = (h, name) => h.window.document.documentElement.style.getPropertyValue(name);

function addViews(sh) {
    const log = [];
    sh.registerView({ id: 'a', title: 'Alpha', place: 'right', order: 20, mount: (c) => { log.push('mount a'); c.textContent = 'view A'; } });
    sh.registerView({ id: 'b', title: 'Beta', place: 'right', order: 10, mount: (c) => { log.push('mount b'); c.textContent = 'view B'; }, update: (c) => { log.push('update b'); } });
    sh.registerView({ id: 'side', title: 'Side', place: 'left', mount: (c) => { c.textContent = 'side view'; } });
    sh.registerView({ id: 'win', title: 'A Window', place: 'window', window: { width: 300, height: 200 }, mount: (c) => { c.textContent = 'window body'; } });
    return log;
}

test('shell: docks, top-bar button, tabs in order, lazy mount', async (t) => {
    const h = await shellHost(t); const sh = h.shell();
    assert.ok($(h, '#rpm-shell'), 'shell root');
    assert.ok($(h, '#rpm-navbtn'), 'single top-bar entry');
    assert.ok($(h, '#rpm-shell-styles'), 'styles injected');
    const log = addViews(sh);

    const tabs = $$(h, '#rpm-dock-right [role=tab]').map(b => b.textContent);
    assert.deepEqual(tabs, ['Beta', 'Alpha'], 'tabs sorted by order');
    // 'a' was the only view when it registered, so it mounted; once 'b' (lower order)
    // exists, b is the default tab. The default is not saved as a user choice.
    assert.deepEqual(log, ['mount a', 'mount b']);
    assert.equal($(h, '[data-tab="b"]').getAttribute('aria-selected'), 'true', 'first by order is the default');
    assert.equal(sh.layout().right.tab, null, 'default not persisted');
    click($(h, '[data-tab="a"]'), h.window);
    assert.equal(sh.layout().right.tab, 'a', 'explicit choice persisted');
    assert.deepEqual(log, ['mount a', 'mount b'], 'already mounted: no re-mount on tab switch');
    assert.equal($(h, '[data-tab="a"]').getAttribute('aria-selected'), 'true');
    assert.ok($(h, '#rpm-view-a').classList.contains('rpm-active'));
    assert.ok(!$(h, '#rpm-view-b').classList.contains('rpm-active'));

    // refresh: hidden view is marked dirty, updated when shown again
    sh.refresh(['b']);
    assert.deepEqual(log, ['mount a', 'mount b']);
    click($(h, '[data-tab="b"]'), h.window);
    assert.deepEqual(log, ['mount a', 'mount b', 'update b']);

    assert.match($(h, '[data-section="side"]').textContent, /side view/);
});

test('shell: docked mode pushes Esolite in; top-bar button hides both docks', async (t) => {
    const h = await shellHost(t); const sh = h.shell(); addViews(sh);
    assert.equal(sh.mode(), 'docked');
    assert.ok(h.window.document.body.classList.contains('rpm-docked'));
    assert.equal(cssVar(h, '--rpm-push-left'), '260px');
    assert.equal(cssVar(h, '--rpm-push-right'), '350px');

    click($(h, '#rpm-navbtn'), h.window);
    assert.ok(!sh.dockOpen('left') && !sh.dockOpen('right'));
    assert.equal(cssVar(h, '--rpm-push-right'), '0px');
    assert.ok($(h, '#rpm-dock-right').classList.contains('rpm-closed'));
    assert.equal($(h, '.rpm-handle-right').hidden, false, 'edge handle to reopen');
    click($(h, '.rpm-handle-right'), h.window);
    assert.ok(sh.dockOpen('right') && !sh.dockOpen('left'));
    assert.equal(sh.layout().left.open, false, 'dock state persisted');
});

test('shell: narrow screens switch to overlay drawers (no push, one at a time)', async (t) => {
    const h = await shellHost(t); const sh = h.shell(); addViews(sh);
    await h.resize(900);
    assert.equal(sh.mode(), 'overlay');
    assert.ok(!h.window.document.body.classList.contains('rpm-docked'));
    assert.ok(!sh.dockOpen('left') && !sh.dockOpen('right'), 'drawers start closed');
    sh.setDockOpen('left', true); sh.setDockOpen('right', true);
    assert.ok(sh.dockOpen('right') && !sh.dockOpen('left'), 'only one drawer open');
    assert.equal(cssVar(h, '--rpm-push-right'), '0px', 'overlay does not push the chat');
    await h.resize(1400);
    assert.equal(sh.mode(), 'docked');
    assert.ok(sh.dockOpen('left') && sh.dockOpen('right'), 'docked layout restored from prefs');
});

test('windows: open, focus, drag (clamped), resize, close; geometry remembered', async (t) => {
    const h = await shellHost(t); const sh = h.shell(); const w = h.window; addViews(sh);
    sh.open('win');
    const win = $(h, '[data-window="win"]');
    assert.ok(win, 'window open');
    assert.match(win.textContent, /window body/);
    assert.equal(win.style.width, '300px');
    assert.equal(win.getAttribute('role'), 'dialog');

    // drag the title bar far off-screen: must stay reachable (title bar on screen)
    const head = win.querySelector('.rpm-window-head');
    const P = (type, x, y) => new w.PointerEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    head.dispatchEvent(P('pointerdown', 100, 100));
    w.dispatchEvent(P('pointermove', 5000, -500));
    w.dispatchEvent(P('pointerup', 5000, -500));
    assert.equal(win.style.top, '0px', 'not above the viewport');
    assert.ok(parseInt(win.style.left, 10) <= 1400 - 48, 'right edge clamp');

    // resize via grip, respecting min size
    const grip = win.querySelector('.rpm-window-grip');
    grip.dispatchEvent(P('pointerdown', 0, 0));
    w.dispatchEvent(P('pointermove', -1000, -1000));
    w.dispatchEvent(P('pointerup', -1000, -1000));
    assert.equal(win.style.width, '240px', 'min width');
    assert.equal(win.style.height, '140px', 'min height');
    const saved = sh.layout().windows.win;
    assert.equal(saved.w, 240); assert.equal(saved.open, true);

    // focus raises
    sh.registerView({ id: 'win2', title: 'Two', place: 'window', mount: () => {} });
    sh.open('win2');
    const z = (id) => Number($(h, `[data-window="${id}"]`).style.zIndex);
    assert.ok(z('win2') > z('win'));
    $(h, '[data-window="win"]').dispatchEvent(P('pointerdown', 1, 1));
    assert.ok(z('win') > z('win2'));

    click(win.querySelector('.rpm-window-head button'), w);
    assert.equal($(h, '[data-window="win"]'), null, 'closed');
    assert.equal(sh.layout().windows.win.open, false);
    assert.equal(sh.layout().windows.win.w, 240, 'geometry kept after close');
});

test('layout persists across reloads (localStorage) and survives corrupt data', async (t) => {
    const h = await shellHost(t); const sh = h.shell(); addViews(sh);
    click($(h, '[data-tab="a"]'), h.window);
    sh.open('win');
    const saved = h.window.localStorage.getItem('KLITE.shell.layout');

    const h2 = createHost(); t.after(h2.close);
    h2.window.localStorage.setItem('KLITE.shell.layout', saved);
    h2.load('shell'); h2.window.dispatchEvent(new h2.window.Event('load')); await sleep(10);
    addViews(h2.shell());
    assert.equal(h2.window.document.querySelector('[data-tab="a"]').getAttribute('aria-selected'), 'true', 'tab restored');
    assert.ok(h2.window.document.querySelector('[data-window="win"]'), 'open window restored');

    // phones: the open window is not restored at startup (it would cover the chat)
    const h4 = createHost(); t.after(h4.close);
    h4.window.innerWidth = 375;
    h4.window.localStorage.setItem('KLITE.shell.layout', saved);
    h4.load('shell'); h4.window.dispatchEvent(new h4.window.Event('load')); await sleep(10);
    addViews(h4.shell());
    assert.equal(h4.window.document.querySelector('[data-window="win"]'), null);

    const h3 = createHost(); t.after(h3.close);
    h3.window.localStorage.setItem('KLITE.shell.layout', '{not json');
    h3.load('shell'); h3.window.dispatchEvent(new h3.window.Event('load')); await sleep(10);
    addViews(h3.shell());
    assert.equal(h3.shell().mode(), 'docked', 'defaults used');
});

test('a failing view shows a message instead of breaking the shell', async (t) => {
    const h = await shellHost(t); const sh = h.shell();
    const origErr = h.window.console.error; h.window.console.error = () => {};
    t.after(() => { h.window.console.error = origErr; });
    sh.registerView({ id: 'bad', title: 'Bad', place: 'right', mount: () => { throw new Error('boom'); } });
    sh.registerView({ id: 'good', title: 'Good', place: 'left', mount: (c) => { c.textContent = 'fine'; } });
    assert.match($(h, '#rpm-view-bad').textContent, /failed to load/);
    assert.match($(h, '[data-section="good"]').textContent, /fine/);
    assert.throws(() => sh.registerView({ id: 'x', place: 'nowhere', mount() {} }));
});

test("ALPHA's right panel is adopted into the right dock as a tab", async (t) => {
    const h = await shellHost(t); const doc = h.window.document;
    h.shell().registerView({ id: 'first', title: 'First', place: 'right', order: 1, mount: () => {} });
    // what ALPHA's buildPanelsOnlyUI() creates, asynchronously
    const wrap = doc.createElement('div'); wrap.id = 'klite-panels-only';
    wrap.innerHTML = '<div class="klite-panel klite-panel-right collapsed" id="panel-right"><div class="klite-handle" data-panel="right">▶</div><div class="klite-content" id="content-right">chars</div></div>';
    doc.body.appendChild(wrap);
    await sleep(400);
    const panel = doc.getElementById('panel-right');
    assert.ok(panel.closest('#rpm-shell'), 'moved into the shell');
    assert.ok(!panel.classList.contains('collapsed'), 'ALPHA collapse state neutralised');
    assert.ok($(h, '[data-tab="alpha"]'), 'Characters tab');
    assert.equal($(h, '[data-tab="alpha"]').getAttribute('aria-selected'), 'false', 'adopted even while its tab is not shown');
    assert.equal(doc.querySelectorAll('#panel-right').length, 1);
});
