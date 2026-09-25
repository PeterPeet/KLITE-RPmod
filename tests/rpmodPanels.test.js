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

// Known issue 13 (R1 cleanup step 3): the panels use the shell's classes and spacing scale.
// Inline styles are left only where a value comes from data (token-bar widths, the auto-sender
// progress, image sizes passed to safeImageHTML).
function styleViolations(root) {
    const bad = [];
    for (const el of root.querySelectorAll('[style]')) {
        const style = el.getAttribute('style').trim();
        if (!style) continue;
        if (el.tagName === 'IMG' || el.classList.contains('klite-image-blocked')) continue;   // caller-given image size
        if (el.classList.contains('klite-token-segment') && /^width:\s*[\d.]+%;?$/.test(style)) continue;
        if (el.id === 'auto-countdown' && /^--klite-progress:\s*[\d.]+%;?$/.test(style)) continue;
        bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${el.className}: ${style}`);
    }
    for (const el of root.querySelectorAll('.klite-btn, .klite-input, .klite-select, .klite-textarea')) bad.push(`old class: ${el.className}`);
    return bad;
}

test('RP panels: no inline styles or old control classes (shell classes, spacing scale)', async (t) => {
    const h = await bundleHost(t); const w = h.window; const doc = w.document; const R = w.KLITE_RPMod;
    const aria = { id: 'c1', name: 'Aria', description: 'Bard.', tags: ['bard'], talkativeness: 60 };
    const borin = { id: 'c2', name: 'Borin', description: 'Smith.', talkativeness: 40, type: 'worldinfo' };
    R.characters = [aria, borin];
    R.panels.TOOLS.selectedPersona = borin; R.panels.TOOLS.personaEnabled = true;
    R.panels.TOOLS.selectedCharacter = aria; R.panels.TOOLS.characterEnabled = true;
    R.panels.ROLES.enabled = true; R.panels.ROLES.activeChars = [aria, borin]; R.panels.ROLES.currentSpeaker = 0; R.panels.ROLES.lastSpeaker = 1;
    const panel = () => doc.getElementById('panel-right');
    for (const [id, key] of [['chars', 'CHARS'], ['roles', 'ROLES'], ['scenario', 'SCENARIO'], ['tools', 'TOOLS']]) {
        h.shell().open(id);
        await until(() => R.state.tabs.right === key && panel().textContent.trim().length > 40);
        R.loadPanel('right', key);
        assert.deepEqual(styleViolations(panel()), [], `${id} tab`);
    }
    h.shell().open('chars');
    await until(() => R.state.tabs.right === 'CHARS');
    R.panels.CHARS.setEditMode('new');
    await until(() => panel().querySelector('.klite-char-editor'));
    assert.deepEqual(styleViolations(panel()), [], 'card editor');
    R.panels.CHARS.abortEdit();
    R.panels.CHARS.showCharacterFullscreen(Object.assign({ rawData: { data: { first_mes: 'Hi.', alternate_greetings: ['Yo.'], character_book: { entries: [{ keys: ['lute'], content: 'A lute.' }] } } } }, aria));
    await until(() => panel().querySelector('.klite-detail-head'));
    assert.deepEqual(styleViolations(panel()), [], 'character detail view');
    R.showUnifiedCharacterModal('multi-select');
    R.panels.ROLES.showCustomCharacterModal();
    const modals = doc.querySelectorAll('.klite-modal');
    assert.equal(modals.length, 2);
    for (const m of modals) {
        assert.ok(m.classList.contains('rpm-themed'), 'modals get the shell tokens');
        assert.deepEqual(styleViolations(m), [], 'modal');
    }
});

test('RP panels: the panel stylesheet uses the shell tokens only', async (t) => {
    const h = await bundleHost(t);
    const css = h.window.document.getElementById('klite-rpmod-styles').textContent;
    assert.doesNotMatch(css, /var\(--(bg|bg2|bg3|text|muted|border|primary|primary-text|accent|danger|success|warning)\)/, 'no old short aliases');
    assert.doesNotMatch(css, /:root\s*\{/, 'defines no page-wide variables');
    const colours = (css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || []).filter(c => !/^(#000|#fff|rgba\(0,\s*0,\s*0,\s*0?\.\d+\))$/i.test(c));
    assert.deepEqual(colours, [], 'colours come from --rpm-* tokens (black/white shading aside)');
});

test('RP panels: character names and fields from cards stay text', async (t) => {
    const h = await bundleHost(t); const w = h.window; const doc = w.document; const R = w.KLITE_RPMod;
    const evil = '<img src=x onerror="window.__pwned=1">"\'';
    assert.equal(R.escapeHtml('a"b\'c<d>&'), 'a&quot;b&#39;c&lt;d&gt;&amp;');
    R.panels.ROLES.enabled = true; R.panels.ROLES.activeChars = [{ id: 'x', name: evil }];
    R.state.scenario = { scenario: `</textarea>${evil}`, example: '', first: '' };
    for (const [id, key] of [['roles', 'ROLES'], ['scenario', 'SCENARIO']]) {
        h.shell().open(id);
        await until(() => R.state.tabs.right === key);
        R.loadPanel('right', key);
    }
    R.panels.ROLES.showCustomCharacterModal({ id: 'x', name: evil, description: `</textarea>${evil}`, keywords: [evil] });
    await sleep(50);
    assert.equal(doc.querySelectorAll('img[src="x"]').length, 0, 'no injected element');
    assert.equal(doc.getElementById('group-custom-char-name').value, evil);
    assert.equal(doc.getElementById('group-custom-char-description').value, `</textarea>${evil}`);
    assert.equal(w.__pwned, undefined);
});
