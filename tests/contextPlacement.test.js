'use strict';
// World Info placement (owner's decision 2026-10-20): RPmod needs Esolite's World Info "Before A/N" with the
// Author's Note strength "Strong" — the game state and each turn's results then sit right before the newest
// messages. RPmod asks once (Yes/No) when the story's placement differs; Yes sets it and keeps it set after
// every New Session and story load; No is not asked again until the page is reloaded.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

// A host with Esolite's two story variables (After Memory / Medium, Esolite's defaults), its Yes/No box
// (records the question; the test answers it) and a restart_new_game that resets them as Esolite does.
async function host(t, { answer = 'yes' } = {}) {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    w.wi_insertlocation = 0; w.anote_strength = 320;
    w.__asked = [];
    w.msgboxYesNo = (text, title, onYes, onNo) => { w.__asked.push({ text, title }); (answer === 'yes' ? onYes : onNo)(); };
    w.restart_new_game = () => { w.wi_insertlocation = 0; w.anote_strength = 320; w.gametext_arr = []; };
    w.kai_json_load = (story) => { if (story && story.wiinsertlocation) w.wi_insertlocation = story.wiinsertlocation; if (story && story.anotestr) w.anote_strength = story.anotestr; return true; };
    const sel = (id, opts) => { const s = w.document.createElement('select'); s.id = id; for (const v of opts) { const o = w.document.createElement('option'); o.value = String(v); s.appendChild(o); } w.document.body.appendChild(s); return s; };
    sel('wi_insertlocation', [0, 1]); sel('anote_strength', [480, 320, 160, 0]);
    h.load('bundle'); await h.ready({ ui: false });
    return h;
}
const until = async (fn, ms = 3000) => { const t0 = Date.now(); while (!fn() && Date.now() - t0 < ms) await sleep(25); return fn(); };

test('start-up: asks once; Yes sets "Before A/N" + "Strong" and keeps it set after New Session and story loads', async (t) => {
    const h = await host(t); const w = h.window;
    assert.ok(await until(() => w.__asked.length === 1), 'asked at start-up');
    assert.match(w.__asked[0].text, /RPmod needs World Info "Before A\/N" with the Author's Note strength "Strong" to work[\s\S]*Should I set this now\?/);
    assert.deepEqual([w.wi_insertlocation, w.anote_strength], [1, 160]);
    assert.deepEqual([w.document.getElementById('wi_insertlocation').value, w.document.getElementById('anote_strength').value], ['1', '160'], 'the dialog controls follow');
    assert.equal(w.KLITE_RPMod_Settings.get('context_placement_auto'), true, 'remembered');
    // Esolite's New Session resets both; RPmod sets them again without asking
    w.restart_new_game();
    assert.ok(await until(() => w.wi_insertlocation === 1), 'set again after New Session');
    assert.equal(w.anote_strength, 160);
    // an older story saved with Medium
    w.kai_json_load({ anotestr: 320 });
    assert.ok(await until(() => w.anote_strength === 160), 'set again after loading a story');
    assert.equal(w.__asked.length, 1, 'asked only once');
});

test('No: nothing changes and it is not asked again on this page; the setting can switch it on later', async (t) => {
    const h = await host(t, { answer: 'no' }); const w = h.window;
    assert.ok(await until(() => w.__asked.length === 1));
    assert.deepEqual([w.wi_insertlocation, w.anote_strength], [0, 320], 'left as it was');
    w.restart_new_game(); w.kai_json_load({});
    await sleep(100);
    assert.equal(w.__asked.length, 1, 'not asked again until the page is reloaded');
    assert.notEqual(w.KLITE_RPMod_Settings.get('context_placement_auto'), true);
    // switched on in Settings → RPmod: from then on it is set
    w.KLITE_RPMod_Settings.set('context_placement_auto', true);
    w.restart_new_game();
    assert.ok(await until(() => w.wi_insertlocation === 1 && w.anote_strength === 160));
    assert.equal(w.__asked.length, 1);
});

test('already "Before A/N" + "Strong": no question; a host without the variables is never asked', async (t) => {
    const h = await host(t); const w = h.window;
    w.wi_insertlocation = 1; w.anote_strength = '160';   // Esolite's select gives a string
    await sleep(1800);
    assert.equal(w.__asked.length, 0);
    const h2 = createHost(); t.after(h2.close);
    let asked = 0; h2.window.msgboxYesNo = () => { asked++; };
    h2.load('bundle'); await h2.ready({ ui: false });
    await sleep(1800);
    assert.equal(asked, 0);
});
