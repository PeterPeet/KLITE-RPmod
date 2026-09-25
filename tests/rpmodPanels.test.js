'use strict';
// The RP core and its right-side panels (Chars, Roles, Scenario, Tools; formerly "ALPHA"):
// the story-save round trip of the `rpmod` block and that every panel still renders in the
// shell. A guard for the cleanup and the split of that code (R1, known issues 8/10/13).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

async function until(fn, ms = 4000) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(25); } throw new Error('condition not met in time'); }
async function bundleHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    h.load('bundle'); await h.ready({ ui: true });
    await until(() => h.window.KLITE_RPMod && h.window.KLITE_RPMod.panels && h.window.KLITE_RPMod.panels.TOOLS && h.shell().views().includes('tools'));
    return h;
}

test('RP core: the story save carries the rpmod block and a loaded story restores it', async (t) => {
    const h = await bundleHost(t); const w = h.window; const R = w.KLITE_RPMod;
    const T = R.panels.TOOLS, G = R.panels.ROLES;
    T.rules = 'Keep it grim.';
    T.selectedPersona = { id: 'p1', name: 'Kara' }; T.personaEnabled = true;
    G.enabled = true; G.speakerMode = 'round-robin';
    G.activeChars = [{ id: 'c1', name: 'Bram', description: 'Innkeeper.', talkativeness: 70 }];

    const saved = w.generate_savefile(false, false, false);
    assert.ok(saved.rpmod, 'the save carries the rpmod block');
    const copy = JSON.parse(JSON.stringify(saved));

    T.rules = ''; T.selectedPersona = null; T.personaEnabled = false;
    G.enabled = false; G.speakerMode = 'manual'; G.activeChars = [];
    w.kai_json_load(copy);
    await until(() => T.rules === 'Keep it grim.');
    assert.equal(T.selectedPersona && T.selectedPersona.name, 'Kara');
    assert.equal(T.personaEnabled, true);
    assert.equal(G.enabled, true);
    assert.equal(G.speakerMode, 'round-robin');
    assert.deepEqual(Array.from(G.activeChars, c => [c.name, c.talkativeness]), [['Bram', 70]]);
});

test('RP panels: Chars, Roles, Scenario and Tools render in the shell', async (t) => {
    const h = await bundleHost(t); const w = h.window; const doc = w.document;
    for (const [id, key] of [['chars', 'CHARS'], ['roles', 'ROLES'], ['scenario', 'SCENARIO'], ['tools', 'TOOLS']]) {
        h.shell().open(id);
        await until(() => w.KLITE_RPMod.state.tabs.right === key);
        const panel = doc.getElementById('panel-right');
        assert.ok(panel && panel.closest('#rpm-shell'), `${id}: the panel lives in the shell`);
        await until(() => panel.textContent.trim().length > 40);
    }
});

// Known issue 18: a second `load` event started WorldsUI again; re-registering its views
// force-closed an open window (the "Combat window vanishes" flake).
test('startup runs once: a second load event does not close open windows', async (t) => {
    const h = await bundleHost(t); const w = h.window; const doc = w.document;
    await h.api().newWorld('Once');
    w.KLITE_RPMod_Shell.open('combat');
    await until(() => doc.querySelector('[data-window="combat"]'));
    w.dispatchEvent(new w.Event('load'));
    await sleep(600);   // longer than the modules' start-up polling
    assert.ok(doc.querySelector('[data-window="combat"]'), 'the Combat window is still open');
    assert.equal(doc.querySelectorAll('[data-window="combat"]').length, 1);
});
