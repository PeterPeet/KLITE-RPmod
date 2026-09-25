'use strict';
// RPmod options inside Esolite's Settings dialog (src/settings/settings.js) and the Worlds
// option that uses it: "Autosave world edits" with unsaved-change tracking and revert.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, sleep } = require('./helpers/host');

const $ = (w, sel) => w.document.querySelector(sel);

test('settings: RPmod tab like Esobold\'s tabs; OK applies and saves, Cancel discards; help is text', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeSettingsDialog();
    h.load('settings');
    h.window.dispatchEvent(new h.window.Event('load')); await sleep(20);
    const w = h.window; const S = w.KLITE_RPMod_Settings;
    const changes = [];
    S.registerSetting({ id: 'demo', section: 'Worlds', label: 'Demo option', help: '<b>not html</b>', default: false });
    S.onChange('demo', (v) => changes.push(v));

    w.display_settings();
    const li = $(w, '#settingsmenurpmod_tab'); const pane = $(w, '#settingsmenurpmod');
    assert.ok(li && pane, 'tab + pane added');
    assert.equal(li.textContent, 'RPmod');
    assert.ok(pane.classList.contains('settingsmenu') && pane.querySelector('.settingitem.wide'), 'Esolite markup');
    assert.equal(pane.querySelector('h3').textContent, 'Worlds');
    assert.equal(pane.querySelector('.helptext').textContent, '<b>not html</b>', 'help set as text');
    assert.equal(pane.querySelector('.helptext b'), null);
    click(li.querySelector('a'), w);
    assert.equal(w.__settingsTab, 3, 'clicking the tab shows it by its current position');
    assert.ok(!pane.classList.contains('hidden'));

    const cb = $(w, '#rpmodset_demo');
    assert.equal(cb.checked, false, 'default');
    cb.checked = true;                       // Cancel: Esolite just hides the dialog
    w.display_settings();
    assert.equal(cb.checked, false, 'reopening refills from localsettings (edit discarded)');
    assert.equal(S.get('demo'), false);

    cb.checked = true; w.confirm_settings(); // OK
    assert.equal(w.localsettings.rpmod_demo, true, 'stored in localsettings like Esolite options');
    assert.equal(S.get('demo'), true);
    assert.ok(w.__settingsSaved >= 1, 'saved by Esolite\'s confirm_settings');
    assert.deepEqual([...changes], [true]);
    w.display_settings();
    assert.equal($(w, '#settingsmenurpmod_tab') === li, true, 'tab created once');
    assert.equal(w.document.querySelectorAll('#settingsmenurpmod').length, 1);
});

test('settings: with Esolite\'s SettingsExtension hook the tab is Esolite\'s; OK applies, Cancel discards', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeSettingsDialog();
    h.installFakeEsoHooks({ settings: true });
    h.load('settings');
    h.window.dispatchEvent(new h.window.Event('load')); await sleep(20);
    const w = h.window; const S = w.KLITE_RPMod_Settings;
    assert.equal(S.mode(), 'eso');
    assert.ok(h.eval('window.eso.extensions.getByType(EsoExtensionType.SETTINGS)[0] instanceof SettingsExtension'));
    const changes = [];
    S.registerSetting({ id: 'demo', section: 'Worlds', label: 'Demo option', help: '<b>not html</b>', default: false });
    S.onChange('demo', (v) => changes.push(v));

    w.display_settings();
    assert.equal($(w, '#settingsmenurpmod'), null, 'no tab of our own');
    const pane = $(w, '#settingsmenuext_rpmod');
    assert.equal($(w, '#settingsmenuext_rpmod_tab').textContent, 'RPmod');
    assert.equal(pane.querySelector('h3').textContent, 'Worlds');
    assert.equal(pane.querySelector('.helptext').textContent, '<b>not html</b>');
    assert.equal(S.paneId, 'settingsmenuext_rpmod');

    // registered after the tab was built: shows up
    S.registerSetting({ id: 'late', section: 'Map', label: 'Late option', default: true });
    assert.equal($(w, '#rpmodset_late').checked, true);

    const cb = $(w, '#rpmodset_demo');
    cb.checked = true;                       // Cancel
    w.display_settings();
    assert.equal($(w, '#rpmodset_demo').checked, false, 'reopening refills from localsettings');
    $(w, '#rpmodset_demo').checked = true; w.confirm_settings();   // OK
    assert.equal(w.localsettings.rpmod_demo, true);
    assert.deepEqual([...changes], [true]);
    assert.equal(w.document.querySelectorAll('#settingsmenuext_rpmod').length, 1);
});

async function worldsHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeSettingsDialog();
    h.load('settings', 'shell', 'worlds', 'worldsUI');
    await h.ready({ ui: true });
    return h;
}

test('worlds: edits are unsaved until Save; Revert undoes a deletion; indicator in the World tab', async (t) => {
    const h = await worldsHost(t); const w = h.window; const W = h.api();
    await W.loadExample(); h.ui().refreshPanel();
    assert.equal(W.hasUnsavedChanges(), false, 'fresh example is saved');
    W.deleteEntity('npc_rowan');
    assert.equal(W.hasUnsavedChanges(), true);
    await sleep(1200);
    assert.equal(W.hasUnsavedChanges(), true, 'autosave is off by default');
    await sleep(20);
    assert.ok($(w, '[data-unsaved="world"]'), 'World tab shows unsaved changes');

    await W.revertToSaved();
    assert.ok(W.entityById('npc_rowan'), 'deleted person is back');
    assert.equal(W.hasUnsavedChanges(), false);

    W.updateEntity('__world__', { description: 'Changed.' });
    await W.saveActiveWorld();
    assert.equal(W.hasUnsavedChanges(), false);
    await W.revertToSaved();
    assert.equal(W.activeWorld().description, 'Changed.', 'saved change survives a revert');
});

test('worlds: autosave setting saves about a second after the last change', async (t) => {
    const h = await worldsHost(t); const w = h.window; const W = h.api();
    await W.loadExample();
    w.KLITE_RPMod_Settings.set('worlds_autosave', true);
    assert.equal(W.autosaveEnabled(), true);
    W.updateEntity('__world__', { description: 'Auto.' });
    assert.equal(W.hasUnsavedChanges(), true);
    await sleep(1300);
    assert.equal(W.hasUnsavedChanges(), false, 'saved');
    await W.revertToSaved();
    assert.equal(W.activeWorld().description, 'Auto.');
});

test('worlds: closing the editor with unsaved changes asks; leaving the page warns', async (t) => {
    const h = await worldsHost(t); const w = h.window; const W = h.api(); const doc = w.document;
    await W.loadExample();
    h.ui().openEditor();
    assert.equal(W.hasUnsavedChanges(), false, 'opening the editor (auto-layout) is not an edit');
    assert.match($(w, '[data-save="world"]').textContent, /Saved/);
    W.updateEntity('__world__', { name: 'Renamed' });
    await sleep(10);
    assert.match($(w, '[data-save="world"]').textContent, /Save •/);
    assert.equal($(w, '[data-revert="world"]').hidden, false);

    click($(w, '[data-window="editor"] [data-winbtn="close"]'), w);
    assert.ok($(w, '[data-window="editor"]'), 'still open');
    const ask = () => $(w, '.wm-ed-ask');
    assert.ok(ask(), 'asks');
    click(findButton(ask(), /^Stay$/), w);
    assert.equal(ask(), null);
    click($(w, '[data-window="editor"] [data-winbtn="close"]'), w);
    click(findButton(ask(), /Save and close/), w);
    await sleep(20);
    assert.equal($(w, '[data-window="editor"]'), null, 'closed after saving');
    assert.equal(W.hasUnsavedChanges(), false);

    W.updateEntity('__world__', { name: 'Again' });
    const ev = new w.Event('beforeunload', { cancelable: true });
    w.dispatchEvent(ev);
    assert.equal(ev.defaultPrevented, true, 'browser warns before leaving with unsaved changes');
    await W.saveActiveWorld();
    const ev2 = new w.Event('beforeunload', { cancelable: true });
    w.dispatchEvent(ev2);
    assert.equal(ev2.defaultPrevented, false);
});

test('bundle: the RP core\'s options sit in the RPmod tab; the old overlay option is gone', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeSettingsDialog();
    h.load('bundle');
    await h.ready();
    const w = h.window;
    // the RP core's full start-up needs the real Esolite page; call its settings hook directly
    // (live-checked in Esolite that start-up installs it).
    w.KLITE_RPMod.installSettingsEnhancer();
    w.display_settings();
    await sleep(150);
    const pane = $(w, '#settingsmenurpmod');
    assert.ok(pane, 'RPmod tab');
    assert.ok(pane.querySelector('#rpmodset_worlds_autosave'), 'Worlds autosave option');
    assert.ok(pane.querySelector('#rpmod-settings-rp-panels #rpmod-debug-settings'), 'the RP core\'s debug options moved here');
    assert.equal($(w, '#settingsmenuadvanced #rpmod-settings-wrapper'), null, 'not in Misc any more');
    assert.equal($(w, '#rpmod-overlay-sidepanel'), null, 'obsolete overlay option removed');
    w.display_settings(); await sleep(150);
    assert.equal(w.document.querySelectorAll('#rpmod-settings-wrapper').length, 1, 'no duplicates on reopen');
});
