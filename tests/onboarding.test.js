'use strict';
// Onboarding: RPmod section inside Esolite's Quick Start, the RPmod Guide with "Show me",
// the "New here?" card, and the GuidedRP save passthrough.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, texts, sleep } = require('./helpers/host');

async function until(fn, ms = 3000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(25); }
    throw new Error('condition not met in time');
}

async function fullHost(t, { quickStart = true, before } = {}) {
    const h = createHost(); t.after(h.close);
    if (quickStart) h.installFakeQuickStart();
    if (before) before(h);
    h.load('shell', 'worlds', 'worldsUI', 'onboarding');
    await h.ready({ ui: true });
    await until(() => h.shell().views().includes('guide'));
    return h;
}
const $ = (h, sel) => h.window.document.querySelector(sel);

test('Quick Start: RPmod world section is added and applied after Esolite\'s own apply', async (t) => {
    const h = await fullHost(t); const w = h.window; const W = h.api();
    await until(() => w.KLITE_RPMod_Onboarding.quickStartMode() === 'adapter');
    w.showQuickStartPopup();
    const section = () => $(h, '[data-rpmod-quickstart="rpmod-world"]');
    assert.ok(section(), 'section appended to the Quick Start popup');
    assert.match(section().textContent, /\(none selected\)/);

    click(findButton(section(), /^Choose world$/), w);
    click(findButton(section(), /Eldoria \(example world\)/), w);
    assert.ok(texts(section()).some(s => s === 'Eldoria (example world)'), 'selection shown as a tile');

    // Esolite's own re-render (bare call to the top-level binding) keeps our section
    h.eval('showQuickStartPopup()');
    assert.ok(section() && /Eldoria/.test(section().textContent), 'survives host re-render');

    click(findButton($(h, '#popupContainer'), /^Confirm$/), w);
    await until(() => W.activeWorld());
    assert.equal(w.__qs.applied, 1, 'Esolite\'s apply still runs');
    assert.equal(W.activeWorld().id, 'world_example');
    assert.equal(W.isEnabled(), true, 'world enabled for this story');
    assert.equal($(h, '[data-tab="world"]').getAttribute('aria-selected'), 'true', 'World tab shown');

    // Clear all clears the RPmod selection too
    w.showQuickStartPopup();
    click(findButton(section(), /^Choose world$/), w);
    click(findButton(section(), /Eldoria/), w);
    click(findButton($(h, '#popupContainer'), /^Clear all$/), w);
    assert.equal(w.__qs.cleared, 1);
    assert.match(section().textContent, /\(none selected\)/);
});

test('Quick Start: an existing world without a current place starts at its first location', async (t) => {
    const h = await fullHost(t); const w = h.window; const W = h.api();
    await W.newWorld('Keep'); const loc = W.addEntity('location', { name: 'Gatehouse' });
    await W.newWorld('Other');   // switch away so Quick Start has to switch back
    await until(() => w.KLITE_RPMod_Onboarding.quickStartMode() === 'adapter');
    w.showQuickStartPopup();
    const section = () => $(h, '[data-rpmod-quickstart="rpmod-world"]');
    click(findButton(section(), /^Choose world$/), w);
    click(findButton(section(), /^Keep$/), w);
    click(findButton($(h, '#popupContainer'), /^Confirm$/), w);
    await until(() => W.activeWorld() && W.activeWorld().name === 'Keep' && W.isEnabled());
    assert.equal(W.runtime.playerLocationId, loc.id);
});

test('Quick Start: uses the official extension hook when Esolite provides one', async (t) => {
    const registered = [];
    const h = await fullHost(t, { quickStart: false, before: (hh) => { hh.window.quickStartExtensions = { register: (e) => registered.push(e) }; } });
    await until(() => h.window.KLITE_RPMod_Onboarding.quickStartMode() === 'api');
    assert.deepEqual(registered.map(e => e.id), ['rpmod-world']);
    assert.equal(typeof registered[0].render, 'function');
    assert.equal(typeof registered[0].apply, 'function');
});

test('Guide: chapters, navigation, remembered chapter, Show me opens and highlights', async (t) => {
    const h = await fullHost(t); const w = h.window; const O = w.KLITE_RPMod_Onboarding;
    O.openGuide('quests');
    const win = () => $(h, '[data-window="guide"]');
    assert.ok(win(), 'guide window open');
    assert.equal(win().querySelector('article').dataset.chapter, 'quests');
    assert.equal(w.localStorage.getItem('KLITE.guide.chapter'), 'quests');

    click(findButton(win(), /^Quest log$/), w);
    await until(() => $(h, '[data-window="questlog"]'));
    await until(() => $(h, '.rpm-spot-note'));
    assert.ok($(h, '.rpm-spot-note').closest('.rpm-themed') || $(h, '.rpm-spot-note').classList.contains('rpm-themed'));

    click(findButton(win(), /^Next: /), w);
    assert.equal(win().querySelector('article').dataset.chapter, 'combat');
    click(findButton(win(), /^Back$/), w);
    assert.equal(win().querySelector('article').dataset.chapter, 'quests');
    const toc = [...win().querySelectorAll('.rpm-guide-toc-item')];
    assert.ok(toc.length >= 10, 'table of contents');
    assert.equal(toc.find(b => b.getAttribute('aria-current') === 'page').textContent, '5. Quests');
    // all chapter text is rendered as text (no markup injection)
    click(toc.find(b => /Changing the world/.test(b.textContent)), w);
    assert.ok([...win().querySelectorAll('code')].some(c => c.textContent === '<move>Forest Road</move>'));
});

test('"New here?" card and the ? button in the Adventure panel', async (t) => {
    const h = await fullHost(t); const w = h.window;
    const card = () => $(h, '[data-section="welcome"]');
    assert.ok(card(), 'welcome card shown on first visit');
    assert.equal(card().parentNode.firstElementChild, card(), 'at the top of the Adventure panel');
    click($(h, '#rpm-dock-left [data-action="guide"]'), w);
    assert.ok($(h, '[data-window="guide"]'), '? opens the guide');
    click(findButton(card(), /Got it/), w);
    assert.equal(card(), null, 'dismissed');
    assert.equal(w.localStorage.getItem('KLITE.onboarding.welcome'), 'dismissed');

    const h2 = createHost(); t.after(h2.close);
    h2.window.localStorage.setItem('KLITE.onboarding.welcome', 'dismissed');
    h2.load('shell', 'worlds', 'worldsUI', 'onboarding'); await h2.ready({ ui: true });
    await until(() => h2.shell().views().includes('guide'));
    assert.equal(h2.window.document.querySelector('[data-section="welcome"]'), null, 'stays dismissed');
});

test('saves written by the retired GuidedRP keep their guided_rp block', async (t) => {
    const h = await fullHost(t); const w = h.window;
    await until(() => w.KLITE_RPMod_Onboarding.legacySaveHookInstalled());
    w.kai_json_load({ guided_rp: { version: 'old', config: { persona: { name: 'Ada' } } } });
    assert.equal(w.generate_savefile().guided_rp.config.persona.name, 'Ada');
    w.kai_json_load({});
    assert.equal(w.generate_savefile().guided_rp, undefined, 'not added to unrelated stories');
});
