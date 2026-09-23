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
    assert.equal(w.KLITE_RPMod_LOADED, true, 'ALPHA core ran');
    assert.equal(typeof w.KLITE_RPMod_Onboarding, 'object', 'onboarding attached');
    assert.equal(w.KLITE_RPMod_GuidedRP, undefined, 'retired GuidedRP is not bundled');
    assert.equal(w.document.getElementById('grpSwitchBtn'), null, 'no GuidedRP top-bar icons');
    assert.ok(w.KLITE_RPMod_WorldsUI, 'Worlds UI attached');

    await W.loadExample();
    W.moveTo('The Prancing Pony');
    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[Current Location: The Prancing Pony\]/, 'slice reached the prompt');
    assert.equal(h.worldsEntries().length, 0, 'transient cleanup');
    const save = w.generate_savefile();
    assert.ok(save.rpmod_worlds, 'Worlds state embedded in save');
    assert.ok(!save.worldinfo.some(e => e.wigroup === '__rpmod__' || e.wigroup === '__worlds__'), 'no temp WI in save');
});
