'use strict';
// Open items from the owner's play test (2026-09-26): one connection per pair of places (links on
// both sides and room exits), unlinking and relinking a town, walking out of a town from any of
// its places, quick travel that stops where something happens on the way, the regional map above
// the local one, and the editor inspector after linking.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

async function adventure(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'oona', confirm: false });
    return h;
}
const exitEdges = (W, a, b) => W.getGraph().edges.filter(e => e.kind === 'exit' && [e.from, e.to].sort().join() === [a, b].sort().join());
const logText = (h) => h.window.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('graph: one connection Brindlewick–Forest Road; removing it removes the way, relinking the town restores travel', async (t) => {
    const h = await adventure(t); const W = h.api();
    const e = exitEdges(W, 'loc_brindlewick', 'loc_forest_road');
    assert.equal(e.length, 1, 'one connection, not two');
    assert.deepEqual(plain(e[0].via.map(v => v.from)), ['bw_green'], 'made by the Village Green\'s exit');
    for (const x of W.getGraph().edges.filter(x => x.kind === 'exit')) assert.notEqual(x.from, x.to);
    // the content stores every connection once: no link where a room exit leads out
    const bw = W.entityById('loc_brindlewick');
    assert.ok(!(bw.connectedLocationIds || []).includes('loc_forest_road'));

    assert.ok(W.disconnect(e[0].from, e[0].to));
    assert.equal(exitEdges(W, 'loc_brindlewick', 'loc_forest_road').length, 0, 'gone from the graph');
    assert.ok(!W.exitsOf('bw_green').some(x => x.to === 'loc_forest_road'), 'the green\'s exit went with it');
    assert.equal(W.go('Forest Road').ok, false);

    W.connect('loc_brindlewick', 'loc_forest_road');
    assert.equal(exitEdges(W, 'loc_brindlewick', 'loc_forest_road').length, 1);
    const r = W.go('Forest Road');
    assert.ok(r.ok, 'a link on the town node leads out of the town again');
    assert.equal(W.runtime.playerLocationId, 'loc_forest_road');
});

test('towns: walk out from any place (via the green); the Here row offers the road', async (t) => {
    const h = await adventure(t); const W = h.api();
    assert.equal(W.runtime.playerLocationId, 'bw_heron');
    assert.ok(W.here().ways.some(x => x.id === 'loc_forest_road'), 'Forest Road from the inn');
    const r = W.go('Forest Road', { source: 'ai' });
    assert.ok(r.ok); assert.deepEqual(plain(r.via), ['bw_green']);
    assert.equal(W.runtime.playerLocationId, 'loc_forest_road');
    assert.match(logText(h), /Goes via Village Green to Forest Road/);
    // dungeons stay room by room
    W.go('The Hollow Oak'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'ho_wolfpen');
    assert.equal(W.go('Forest Road').ok, false, 'no walking through a dungeon without quick travel');
    assert.ok(W.go('Forest Road', { source: 'quicktravel' }).ok, 'quick travel through rooms you know');
});

test('quick travel stops where something happens on the way (the Night Raid in the Outpost yard)', async (t) => {
    const h = await adventure(t); const W = h.api();
    W.moveTo('op_common');
    W.setQuestState('q_kitchen_stores', 'turnedin');
    assert.ok(W.acceptQuest('q_night_raid'));
    W.setClock({ time: 'night' });
    assert.ok(!(W.getCombat() && W.getCombat().active));
    const r = W.go('loc_lanternport', { source: 'quicktravel' });
    assert.ok(r.ok && r.stopped && r.fight, JSON.stringify(r));
    assert.equal(W.runtime.playerLocationId, 'op_yard', 'stopped in the yard');
    assert.ok(W.getCombat().active, 'in the fight');
    assert.match(logText(h), /Quick travel to Lanternport \(Lake Gate & Market Square\) stops at Outpost Yard: a fight starts here/);
    const again = W.go('loc_lanternport', { source: 'quicktravel' });
    assert.equal(again.ok, false); assert.match(again.reason, /a fight is going on/);
});

test('mini-map: inside a town the regional map (with Forest Road) sits above the town board', async (t) => {
    const h = await adventure(t); const w = h.window; const doc = w.document;
    w.KLITE_RPMod_Shell.open('minimap'); await sleep(40);
    w.KLITE_RPMod_Shell.refresh(['minimap']); await sleep(40);
    const sec = doc.querySelector('[data-section="minimap"]');
    const region = sec.querySelector('[data-map-region]');
    assert.ok(region, 'regional map');
    assert.ok(region.querySelector('g[data-place="loc_brindlewick"].rpm-here'), 'the town is where you are');
    assert.ok(region.querySelector('g[data-place="loc_forest_road"]'), 'Forest Road is shown');
    assert.ok(sec.querySelector('g[data-room="bw_heron"]'), 'the local board below');
    assert.ok(region.compareDocumentPosition(sec.querySelector('g[data-room="bw_heron"]')) & w.Node.DOCUMENT_POSITION_FOLLOWING, 'region first');
});

test('world editor: the inspector shows a new connection right after linking', async (t) => {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [] };
    h.load('shell', 'worlds', 'worldsUI');
    await h.ready({ ui: true });
    await h.api().loadExample();
    const w = h.window; const doc = w.document;
    h.ui().openEditor();
    const node = (id) => doc.querySelector(`#wm-editor g[data-id="${id}"]`);
    const down = (el) => el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
    down(node('loc_tavern'));   // select
    const insp = () => doc.querySelector('#wm-editor .wm-ed-insp').textContent.split('Connections')[1] || '';
    assert.doesNotMatch(insp(), /Royal Watchtower/);
    doc.querySelector('#wm-editor [data-tool="link"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    down(node('loc_tavern')); down(node('loc_watchtower'));
    assert.match(insp(), /Royal Watchtower/, 'listed without re-selecting');
});

// A host with Esolite's New Session / Reset ALL and a slow IndexedDB (reads and writes take a while,
// as in the browser), set up before the bundle loads so every wrapper is installed; the RP core's
// host hooks are installed directly.
async function sessionHost(t, stored) {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    // RPmod reloads its panels after a new session; each panel load re-inits the Tools panel, which
    // reads its stored settings (the fake host has no panel containers, so do it here as loadPanel does)
    const toolsInit = () => setTimeout(() => { try { w.KLITE_RPMod.panels.TOOLS.loadSettings(); } catch (_) {} }, 0);
    w.restart_new_game = function () { w.gametext_arr = []; toolsInit(); };
    w.reset_all_settings = function () { w.restart_new_game(); };   // as Esolite's, once confirmed
    w.submit_generation_button = function () {};                   // setupHooks wraps this
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    for (const [k, v] of Object.entries(stored || {})) w.__idb.set(k, v);
    const save0 = w.indexeddb_save, load0 = w.indexeddb_load;
    w.indexeddb_save = (k, v) => new Promise(r => setTimeout(() => r(save0(k, v)), 30));
    w.indexeddb_load = (k, d) => new Promise(r => setTimeout(() => r(load0(k, d)), 30));
    h.load('bundle'); await h.ready({ ui: true });
    const ADV = w.KLITE_RPMod_Adventures;
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    w.KLITE_RPMod.setupHooks();                          // the core's host hooks (New Session reset), without its full start
    await w.KLITE_RPMod.panels.TOOLS.loadSettings();     // the Tools panel's first read of its settings
    const db = { get rpmod_playrp_settings() { return w.__idb.get('rpmod_playrp_settings'); } };
    return { h, w, db, ADV, T: () => w.KLITE_RPMod.panels.TOOLS };
}

test('adventure start: the pregen replaces a persona chosen before (not read back from storage)', async (t) => {
    const stored = { rpmod_playrp_settings: JSON.stringify({ selectedPersona: { name: 'Tove Emberfall' }, personaEnabled: true }) };
    const { h, ADV, T } = await sessionHost(t, stored);
    assert.equal(T().selectedPersona && T().selectedPersona.name, 'Tove Emberfall', 'the stored persona at boot');
    await ADV.start('drowned-lantern', { pregen: 'kasimir', confirm: false });
    await sleep(200);   // panel reloads and pending storage reads
    assert.equal(T().selectedPersona && T().selectedPersona.name, 'Kasimir Adeyemi');
    assert.ok(T().personaEnabled);
    assert.equal(h.window.localsettings.chatname, 'Kasimir Adeyemi');
});

test('New Session: RPmod starts blank — no persona, no world, no party', async (t) => {
    const { h, w, db, ADV, T } = await sessionHost(t);
    const W = h.api();
    await ADV.start('drowned-lantern', { pregen: 'oona', confirm: false });
    await sleep(80);
    assert.ok(W.joinParty('npc_tove').ok !== false);
    assert.ok(W.activeWorld() && W.config.enabled);
    w.restart_new_game(true, false);   // Esolite's New Session
    await sleep(200);
    assert.equal(T().selectedPersona, null, 'no persona');
    assert.equal(T().personaEnabled, false);
    assert.equal(W.activeWorld(), null, 'no world for the new story');
    assert.equal(W.config.enabled, false);
    assert.equal(W.runtime, null, 'no game state, no party');
    assert.equal(JSON.parse(db.rpmod_playrp_settings).selectedPersona, null, 'the blank persona is saved');
    // the adventure can be started again after that
    await ADV.start('drowned-lantern', { pregen: 'pell', confirm: false });
    await sleep(80);
    assert.equal(W.runtime.playerLocationId, 'bw_heron');
    assert.equal(T().selectedPersona.name, 'Pell Marrow');
});

test('Reset ALL Settings resets the Guide: "New here?" shows again; a New Session does not', async (t) => {
    const { h, w } = await sessionHost(t);
    const doc = w.document;
    w.localStorage.setItem('KLITE.onboarding.welcome', 'dismissed');
    w.localStorage.setItem('KLITE.guide.chapter', 'combat');
    w.KLITE_RPMod_Shell.unregisterView('welcome');
    w.restart_new_game(true, false);
    assert.equal(w.localStorage.getItem('KLITE.onboarding.welcome'), 'dismissed', 'New Session keeps the Guide');
    w.reset_all_settings();
    await sleep(40);
    assert.equal(w.localStorage.getItem('KLITE.onboarding.welcome'), null);
    assert.ok([null, 'welcome'].includes(w.localStorage.getItem('KLITE.guide.chapter')), 'the Guide opens at its first chapter again');
    assert.ok(doc.querySelector('[data-section="welcome"]'), '"New here?" is back');
});

test('adventure start: the story is saved again once the world is chosen (a reload keeps the adventure)', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    const saves = [];
    h.window.autosave = () => { saves.push(h.window.generate_savefile()); };
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'oona', confirm: false });
    const last = saves[saves.length - 1];
    assert.ok(last && last.rpmod_worlds && last.rpmod_worlds.enabled, 'the last autosave has the world');
    assert.equal(last.rpmod_worlds.runtime.working.playerLocationId, 'bw_heron');
});

// Esolite restores its autosaved story during its own start-up (before RPmod's hooks) and autosaves
// it again without RPmod's blocks; RPmod keeps a side copy per chat and restores it on the reload.
test('page reload: the story\'s world state and persona come back from RPmod\'s side copy (same chat only)', async (t) => {
    const page = async (idb, chat) => {
        const h = createHost(); t.after(h.close);
        const w = h.window;
        w.restart_new_game = function () { w.gametext_arr = []; };
        w.submit_generation_button = function () {};
        h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
        for (const [k, v] of idb) w.__idb.set(k, v);
        if (chat) w.gametext_arr = chat.slice();   // what Esolite restored before RPmod started
        h.load('bundle'); await h.ready({ ui: true });
        for (let i = 0; i < 100 && !(w.KLITE_RPMod && w.KLITE_RPMod.panels && w.KLITE_RPMod.panels.TOOLS); i++) await sleep(20);
        w.KLITE_RPMod.setupHooks();
        return h;
    };
    const h1 = await page([]);
    const w1 = h1.window; const ADV = w1.KLITE_RPMod_Adventures;
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'kasimir', confirm: false });
    h1.api().go('Village Green');
    for (let i = 0; i < 100 && !w1.generate_savefile.toString().includes('saveStoryCopy') && !w1._rpmod_orig_generate_savefile; i++) await sleep(25);
    w1.generate_savefile(false, false, false);   // an autosave
    await sleep(600);                            // the copy is written after a short pause
    const idb = [...w1.__idb.entries()];
    assert.ok(idb.some(([k]) => k === 'rpmod_storycopy_worlds'), 'side copy of the world block');
    const chat = w1.gametext_arr.slice();

    const h2 = await page(idb, chat);
    const W2 = h2.api();
    for (let i = 0; i < 100 && !W2.activeWorld(); i++) await sleep(20);
    assert.equal(W2.activeWorld() && W2.activeWorld().id, 'world_drowned_lantern');
    assert.equal(W2.runtime.playerLocationId, 'bw_green');
    assert.equal(W2.isEnabled(), true);
    for (let i = 0; i < 100 && !h2.window.KLITE_RPMod.panels.TOOLS.selectedPersona; i++) await sleep(20);
    assert.equal(h2.window.KLITE_RPMod.panels.TOOLS.selectedPersona.name, 'Kasimir Adeyemi');

    // another chat (a different story was restored): nothing is restored
    const h3 = await page(idb, ['A different story.']);
    await sleep(300);
    assert.equal(h3.api().activeWorld(), null);
});
