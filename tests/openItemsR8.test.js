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
    assert.match(logText(h), /Quick travel to Lanternport stops at .*Yard.*a fight starts here/);
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
