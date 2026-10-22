'use strict';
// The generated single-file bundle (what users actually load) runs in a fake host.
// `npm test` rebuilds the bundle first, so this always tests current sources.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

test('bundle: all modules attach and the Worlds pipeline works end to end', async (t) => {
    const h = createHost(); t.after(h.close);
    h.load('bundle');
    await h.ready({ ui: true });
    const w = h.window; const W = h.api();
    assert.equal(w.KLITE_RPMod_LOADED, true, 'the RP core ran');
    assert.equal(typeof w.KLITE_RPMod_Onboarding, 'object', 'onboarding attached');
    assert.equal(w.KLITE_RPMod_GuidedRP, undefined, 'retired GuidedRP is not bundled');
    assert.equal(w.document.getElementById('grpSwitchBtn'), null, 'no GuidedRP top-bar icons');
    assert.ok(w.KLITE_RPMod_WorldsUI, 'Worlds UI attached');

    await W.loadExample();
    W.moveTo('The Crooked Kettle');
    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[Current Location: The Crooked Kettle\]/, 'slice reached the prompt');
    assert.equal(h.worldsEntries().length, 0, 'transient cleanup');
    const save = w.generate_savefile();
    assert.ok(save.rpmod_worlds, 'Worlds state embedded in save');
    assert.ok(!save.worldinfo.some(e => e.wigroup === '__rpmod__' || e.wigroup === '__worlds__'), 'no temp WI in save');
});

test('bundle: the header credits SRD 5.2.1 (exact attribution), UDT and Lucide', () => {
    const fs = require('fs'); const path = require('path');
    const root = path.join(__dirname, '..');
    const attribution = fs.readFileSync(path.join(root, 'src', 'data', 'srd52.js'), 'utf8').split('\n')[1].replace(/^\/\/ /, '');
    assert.match(attribution, /^This work includes material from the System Reference Document 5\.2\.1/);
    const header = fs.readFileSync(path.join(root, 'KLITE-RPmod.js'), 'utf8').split('(() => {')[0];
    assert.ok(header.includes('// ' + attribution), 'exact SRD attribution in the bundle header');
    assert.match(header, /Ultimate Dungeon Terrain \(Dungeon Craft\)/);
    assert.match(header, /Lucide/);
});
