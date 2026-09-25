'use strict';
// R8: game over — when everyone in the party has died (not just fallen and stable), RPmod says so,
// tells the AI to end the story, and offers to start again (from the start, or with a new hero).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, sleep } = require('./helpers/host');

const plain = (v) => JSON.parse(JSON.stringify(v));

async function watchtower(t, load = ['worlds']) {
    const h = createHost(); t.after(h.close);
    h.load(...load); await h.ready({ ui: load.includes('worldsUI') });
    const W = h.api();
    await W.loadExample();
    W.moveTo('Royal Watchtower');
    W.updateEntity('npc_rowan', { canJoin: true });
    assert.equal(W.joinParty('Captain Rowan').ok, true);
    return h;
}
const kill = (W, id) => { W.damage(id, 99); for (let i = 0; i < 3 && !(W.getCombat().death[id] || {}).dead; i++) W.damage(id, 1); };

test('everyone dead: game over (state, log, event, the AI ends the story); dying companions roll their own death saves', async (t) => {
    const h = await watchtower(t); const W = h.api(); const w = h.window;
    let fired = null; w.addEventListener('klite:game-over', (e) => { fired = e.detail; });
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 2 }], zones: false });
    assert.ok(W.getCombat().order.some(o => o.id === 'npc_rowan' && o.side === 'party'), 'the companion fights along');
    kill(W, '__player__');
    assert.equal(W.getCombat().outcome, null, 'Rowan still stands');
    W.damage('npc_rowan', 99);
    assert.equal(W.getCombat().outcome, null, 'Rowan is dying, not dead');
    h.seedRandom([0.2]);                               // a death save of 5: a failure
    const r = W.autoTurn('npc_rowan');
    assert.equal(r.deathSave && r.deathSave.result, 'failure', 'a dying companion rolls on its own turn');
    kill(W, 'npc_rowan');
    const cb = W.getCombat();
    assert.deepEqual([cb.outcome, cb.wipe], ['defeat', true]);
    assert.ok(cb.log.some(l => /Game over\. Everyone in the party has died: You, Captain Rowan\./.test(l)), JSON.stringify(cb.log.slice(-3)));
    assert.match(W.preview(), /OUTCOME: Game over — every member of the party has died\. Narrate their fall[^\n]*Do not continue the story and do not revive anyone\./);
    assert.deepEqual(plain(W.gameOver().fallen), ['You', 'Captain Rowan']);
    await sleep(10);
    assert.deepEqual(plain(fired), { fallen: ['You', 'Captain Rowan'] });

    // saved with the story
    const save = w.generate_savefile();
    W.restartAtStart();
    assert.equal(W.gameOver(), null);
    w.kai_json_load(save);
    assert.ok(W.gameOver(), 'a story that ended in a game over still says so when loaded');
});

test('fallen but stable is a defeat, not a game over', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    kill(W, '__player__');
    W.damage('npc_rowan', 99);
    h.seedRandom([0.7]);                               // death saves of 15: three successes → stable
    for (let i = 0; i < 3 && !W.getCombat().outcome; i++) W.autoTurn('npc_rowan');
    const cb = W.getCombat();
    assert.equal(cb.outcome, 'defeat');
    assert.ok(!cb.wipe);
    assert.equal(W.gameOver(), null);
    assert.match(W.preview(), /OUTCOME: Defeat — the party has fallen/);
});

test('restart from the start: the fight ends, everyone at full HP, the world at its start', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    kill(W, '__player__'); W.damage('npc_rowan', 99); kill(W, 'npc_rowan');
    assert.ok(W.gameOver());
    W.restartAtStart();
    assert.equal(W.getCombat(), null);
    assert.equal(W.gameOver(), null);
    assert.equal(W.runtime.playerLocationId, 'loc_village', 'back at the world\'s start');
    assert.deepEqual(plain(W.runtime.partyHp || {}), {}, 'companions without a sheet are healed');
    assert.ok(W.isEnabled());
});

test('the Game over window opens by itself and offers the choices; the Party section keeps a banner', async (t) => {
    const h = await watchtower(t, ['shell', 'worlds', 'worldsUI']); const W = h.api(); const w = h.window; const doc = w.document;
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    kill(W, '__player__'); W.damage('npc_rowan', 99); kill(W, 'npc_rowan');
    await sleep(40);
    const win = () => doc.querySelector('[data-window="gameover"]');
    assert.ok(win(), 'opened by the game over');
    assert.match(win().textContent, /Game over/);
    assert.match(win().textContent, /Everyone in your party has fallen: You, Captain Rowan\./);
    for (const id of ['go-restart', 'go-new-hero', 'go-close']) assert.ok(win().querySelector(`[data-ui="${id}"]`), id);
    assert.equal(win().querySelector('[data-ui="go-choose"]'), null, 'not an adventure: no other characters to choose');
    click(win().querySelector('[data-ui="go-close"]'), w);
    assert.equal(win(), null);
    const party = doc.querySelector('[data-section="party"]');
    assert.ok(party.querySelector('[data-party="gameover"]'), 'the banner stays');
    click(party.querySelector('[data-ui="go-open"]'), w);
    let restarted = 0; w.restart_new_game = () => { restarted++; w.gametext_arr = []; };
    w.gametext_arr.push('The wolves howl over the fallen.');
    w.confirm = () => true;
    click(win().querySelector('[data-ui="go-restart"]'), w);
    await sleep(60);
    assert.equal(restarted, 1, 'a new session');
    assert.equal(W.gameOver(), null);
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    assert.equal(win(), null, 'the window closes');
});

test('adventure: restart with the same pregen (optionally reset to level 1), or with a new hero', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures; const C = w.KLITE_RPMod_Characters;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'pell', confirm: false });
    await sleep(50);
    C.updateSheet('Pell Marrow', s => { s.xp = 450; }); await C.flushSheet('Pell Marrow');
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    kill(W, '__player__');
    assert.ok(W.gameOver());
    await sleep(60);
    assert.equal((await C.loadSheet('Pell Marrow')).hp.current, 0, 'the fall is on the sheet');
    assert.deepEqual(plain(await ADV.current()), { id: 'drowned-lantern', title: 'The Drowned Lantern', persona: 'Pell Marrow', pregen: 'pell' });

    await ADV.restart();
    await sleep(80);
    assert.equal(W.gameOver(), null);
    assert.equal(W.runtime.playerLocationId, 'bw_heron');
    assert.match(w.gametext_arr[0], /Mist lies over Stillwater Mere/);
    let s = await C.loadSheet('Pell Marrow');
    assert.equal(s.hp.current, s.hp.max, 'back at full HP');
    assert.equal(s.xp, 450, 'level and gear are kept');
    assert.equal(W.runtime.flags.pregen_pell, true);

    await ADV.restart({ resetPregens: true }); await sleep(80);
    assert.equal((await C.loadSheet('Pell Marrow')).xp, 0, 'asked for: the starting sheet again');

    // a new hero of your own
    await w.__addEsoCharacter('Mira', { description: 'A ranger.' });
    const r = await ADV.restart({ hero: 'Mira' });
    assert.equal(r.persona, 'Mira');
    assert.ok(!Object.keys(W.runtime.flags).some(k => /^pregen_/.test(k)), 'no pregen is "you"');
    assert.match(W.preview(), /Pell Marrow/, 'all four pregens can be met now');
});
