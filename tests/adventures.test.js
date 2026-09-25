'use strict';
// R8 adventures: the package validator and copyright guard (pure), the world start and switching
// worlds (engine, known issue 22), and the loader (pregens into Esolite's Library, persona, new
// session, Player view) with its picker window.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { createHost, click, findButton, texts, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const AR = requireSrc('src/adventures/adventure-rules.js');
const MINI = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'adventure-mini.json'), 'utf8'));
const mini = () => JSON.parse(JSON.stringify(MINI));
// values from the jsdom window are from another realm: compare plain copies
const plain = (v) => JSON.parse(JSON.stringify(v));

// ---- validator ----------------------------------------------------------------------------
test('validator: the test adventure is valid; stats and XP estimate', () => {
    const r = AR.validateAdventure(mini());
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.stats.pregens, 2);
    // quest 300 + 2 Goblin Warriors (50 XP each) divided among the authored party of two
    assert.deepEqual(r.stats.xp, { quest: 300, combat: 100, perCharacter: 350 });
    assert.deepEqual(AR.pregens(mini()).map(g => [g.id, g.name, g.pronouns]), [['ana', 'Ana Test', 'she/her'], ['bo', 'Bo Test', 'they/them']]);
});

test('validator: broken ids, pregens, monsters, loops, start and XP are reported', () => {
    const p = mini();
    p.world.locations[0].connectedLocationIds.push('loc_nowhere');
    p.world.npcs[2].factionId = 'fac_ghost';
    p.world.npcs[0].characterRef.pregen = 'zed';
    p.world.encounters[0].monsters.push({ key: 'Tarrasque Junior', count: 1 });
    p.world.quests.push({ id: 'q_a', title: 'A', prerequisites: { quests: ['q_b'] } }, { id: 'q_b', title: 'B', prerequisites: { quests: ['q_a'], level: 9 } });
    p.start.pregens.push('cy');
    p.characters[1].data.extensions.rpmod.adventure = 'other';
    const r = AR.validateAdventure(p);
    const has = (re) => assert.ok(r.errors.some(e => re.test(e)), `${re} in ${JSON.stringify(r.errors)}`);
    has(/unknown location "loc_nowhere"/);
    has(/unknown faction "fac_ghost"/);
    has(/unknown pregen "zed"/);
    has(/"Tarrasque Junior" is not an SRD 5\.2\.1 monster/);
    has(/prerequisites form a loop/);
    has(/needs level 9, above the adventure's 2/);
    has(/start\.pregens names an unknown pregen "cy"/);
    has(/belongs to adventure "other"/);
    assert.equal(r.ok, false);

    const q = mini(); delete q.world.start.locationId; q.world.quests[0].rewards = [];
    const r2 = AR.validateAdventure(q);
    assert.ok(r2.errors.some(e => /where does the game begin/.test(e)));
    const q3 = mini(); q3.world.quests[0].rewards = []; q3.world.locations[2].connectedLocationIds = []; q3.world.locations[1].connectedLocationIds = ['loc_green'];
    const r3 = AR.validateAdventure(q3);
    assert.ok(r3.warnings.some(w => /XP per character 50 < 300/.test(w)), JSON.stringify(r3.warnings));
    assert.ok(r3.warnings.some(w => /not reachable from the start: Mini Cave/.test(w)));
});

test('copyright guard: names from published adventures and settings are refused (whole words, case-sensitive)', () => {
    const p = mini();
    p.world.locations[1].description = 'The road to Phandalin, as the Cragmaw goblins know it.';
    p.characters[0].data.description = 'Born in Neverwinter on the Sword Coast.';
    const r = AR.validateAdventure(p);
    for (const n of ['Phandalin', 'Cragmaw', 'Neverwinter', 'Sword Coast']) assert.ok(r.errors.some(e => e.includes(`forbidden name "${n}"`)), n);
    // ordinary words and names that merely contain one are fine
    assert.deepEqual(AR.forbiddenNamesIn({ a: 'the greenest meadow', b: 'Beholders? no: beholden', c: 'Tiamatsu' }), []);
    assert.deepEqual(AR.forbiddenNamesIn('Welcome to Greenest.').map(h => h.name), ['Greenest']);
    assert.ok(AR.FORBIDDEN_NAMES.includes('Forgotten Realms'));
});

// ---- engine: world start, switching worlds (known issue 22) ------------------------------------
async function worldsHost(t) {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    return h;
}

test('world.start: a world begins at its start place and clock; switching parks and restores runtimes', async (t) => {
    const h = await worldsHost(t); const W = h.api();
    const a = await W.importWorld(mini().world, { activate: true });
    assert.equal(W.runtime.playerLocationId, 'loc_green', 'starts at world.start');
    assert.equal(W.runtime.clock.time, 'evening'); assert.equal(W.runtime.clock.weather, 'rain'); assert.equal(W.runtime.clock.season, 'spring');
    assert.equal(W.runtimeSlots.base.playerLocationId, 'loc_green', 'the start is the base');
    W.moveTo('Mini Road'); W.setFlag('met', 1);

    const b = await W.newWorld('Other');
    W.useWorld(b);
    assert.equal(W.runtime.playerLocationId, null, 'another world does not inherit the first world\'s place');
    assert.ok(!('met' in W.runtime.flags));
    assert.deepEqual(plain(W.parkedWorlds()), [a]);

    W.useWorld(a);
    assert.equal(W.runtime.playerLocationId, 'loc_road', 'the first world\'s game comes back');
    assert.equal(W.runtime.flags.met, 1);
    W.useWorld(a);
    assert.equal(W.runtime.playerLocationId, 'loc_road', 'the same world again keeps its game');
    W.useWorld(a, { fresh: true });
    assert.equal(W.runtime.playerLocationId, 'loc_green', 'fresh: begin anew at the start');

    // saved with the story (parked runtimes too), restored on load
    W.useWorld(b); W.useWorld(a); W.moveTo('Mini Cave');
    const save = h.window.generate_savefile();
    assert.ok(save.rpmod_worlds.parked && save.rpmod_worlds.parked[b], 'parked runtimes travel with the story');
    W.useWorld(b);
    h.window.kai_json_load(save);
    assert.equal(W.activeWorld().id, a);
    assert.equal(W.runtime.playerLocationId, 'loc_cave');
    assert.deepEqual(plain(W.parkedWorlds()), [b]);
    // stories saved before R8 (no `parked`) load as before
    const old = JSON.parse(JSON.stringify(save)); delete old.rpmod_worlds.parked;
    h.window.kai_json_load(old);
    assert.deepEqual(plain(W.parkedWorlds()), []);
});

test('world.start: authoring it (place, time, view; from the live game); the example world has one', async (t) => {
    const h = await worldsHost(t); const W = h.api();
    await W.loadExample();
    assert.equal(W.worldStart().locationId, 'loc_village');
    assert.equal(W.runtime.playerLocationId, 'loc_village');
    W.moveTo('Forest Road'); W.setClock({ time: 'night' });
    const st = W.setWorldStartFromLive();
    assert.equal(st.locationId, 'loc_forest'); assert.equal(st.clock.time, 'night');
    assert.equal(W.setWorldStart({ view: 'player' }).view, 'player');
    assert.equal(W.setWorldStart({ view: 'sideways' }).view, undefined, 'only player/creator');
    assert.equal(W.setWorldStart({ locationId: 'loc_nowhere' }).locationId, undefined, 'unknown places are dropped');
    // a world without a start behaves as before: an empty start state
    const id = await W.newWorld('Blank'); W.useWorld(id);
    assert.equal(W.worldStart(), null);
    assert.equal(W.runtime.playerLocationId, null);
    // deleting the active world does not hand its game to the next world
    await W.deleteWorld(id);
    assert.equal(W.runtimeSlots, null);
});

// ---- the loader ---------------------------------------------------------------------------------
async function advHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    const w = h.window;
    const personas = [];
    w.KLITE_RPMod = { characters: [], panels: { TOOLS: { usePersona(c) { personas.push(c); this.selectedPersona = c; this.personaEnabled = true; } } } };
    let restarts = 0;
    w.restart_new_game = () => { restarts++; w.gametext_arr = []; };
    w.render_gametext = () => {};
    h.load('shell', 'library', 'worlds', 'worldsUI', 'adventures');
    await h.ready({ ui: true });
    for (let i = 0; i < 40 && !w.KLITE_RPMod_Adventures; i++) await sleep(25);
    return { h, w, personas, restarts: () => restarts };
}

test('loader: pregens into the Library, new session with the opening, world at its start, persona, Player view', async (t) => {
    const { h, w, personas, restarts } = await advHost(t); const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    assert.deepEqual(plain(ADV.list()), []);
    assert.equal(ADV.register(mini()).ok, true);
    assert.deepEqual(plain(ADV.list().map(a => a.id)), ['mini']);
    w.gametext_arr.push('an older story');

    const r = await ADV.start('mini', { pregen: 'bo', confirm: false });
    assert.equal(restarts(), 1, 'a new session');
    assert.deepEqual(plain(w.gametext_arr), ['The rain falls on Mini Green. The elder waves you over.']);
    assert.deepEqual(plain(w.__lib().map(m => m.name).sort()), ['Ana Test', 'Bo Test'], 'both pregens added');
    assert.equal(r.persona, 'Bo Test');
    assert.equal(personas.at(-1).name, 'Bo Test', 'the chosen pregen is the persona');
    assert.ok(W.isEnabled());
    assert.equal(W.activeWorld().adventure.id, 'mini');
    assert.equal(W.runtime.playerLocationId, 'loc_green');
    assert.equal(W.runtime.flags.pregen_bo, true);
    assert.equal(W.runtimeSlots.base.flags.pregen_bo, true, 'the choice is part of the start state');
    assert.equal(W.runtime.lastParsedIndex, 1, 'the opening is not read as tags');
    assert.equal(h.ui().uiMode(), 'player');
    const bo = W.activeWorld().npcs.find(p => p.id === 'npc_bo');
    assert.deepEqual(plain([bo.characterRef.source, bo.characterRef.name, bo.characterRef.pregen]), ['library', 'Bo Test', 'bo'], 'persons link the Library cards');
    const s = W.preview();
    assert.match(s, /Ana Test/, 'the other pregen is there to meet');
    assert.doesNotMatch(s, /Bo Test/, 'you do not meet yourself');

    // play a little, then start again as Ana: no duplicates, the played card is untouched
    const key = 'character_Bo Test';
    const played = JSON.parse(await w.indexeddb_load(key, '{}'));
    played.data.description = 'Bo, after a long adventure.';
    await w.indexeddb_save(key, JSON.stringify(played));
    const worlds = W.listWorlds().length;
    const r2 = await ADV.start('mini', { pregen: 'ana', confirm: false });
    assert.equal(w.__lib().length, 2, 'no pregen added twice');
    assert.equal(JSON.parse(await w.indexeddb_load(key, '{}')).data.description, 'Bo, after a long adventure.', 'an existing card is never overwritten');
    assert.equal(r2.pregens.bo.added, false);
    assert.equal(W.listWorlds().length, worlds, 'the installed adventure world is reused');
    assert.equal(W.runtime.flags.pregen_ana, true);
    assert.ok(!W.runtime.flags.pregen_bo, 'a new game: the earlier choice is gone');
});

test('loader: a pregen renamed by a name clash is found again by its pregen id; a broken package is refused', async (t) => {
    const { h, w } = await advHost(t); const ADV = w.KLITE_RPMod_Adventures;
    await w.__addEsoCharacter('Ana Test', { description: 'Someone else entirely.' });
    ADV.register(mini());
    const r = await ADV.start('mini', { pregen: 'ana', confirm: false });
    assert.equal(r.persona, 'Ana Test_1', 'Esolite names the new card Name_1');
    assert.equal(JSON.parse(await w.indexeddb_load('character_Ana Test', '{}')).data.description, 'Someone else entirely.');
    localStorage_clear(w);
    const r2 = await ADV.start('mini', { pregen: 'ana', confirm: false });
    assert.equal(r2.pregens.ana.name, 'Ana Test_1', 'found by its pregen id, not added again');
    assert.equal(r2.pregens.ana.added, false);

    const bad = mini(); bad.id = 'bad'; bad.world.locations[0].description = 'Near Phandalin.';
    for (const c of bad.characters) c.data.extensions.rpmod.adventure = 'bad';
    const res = ADV.register(bad);
    assert.equal(res.ok, false);
    assert.ok(!ADV.list().some(a => a.id === 'bad'), 'not registered');
    await assert.rejects(() => ADV.start(bad, { confirm: false }), /forbidden name "Phandalin"/);
});
function localStorage_clear(w) { w.localStorage.removeItem('KLITE.adventures.pregens'); }

test('picker and entry points: World tab button, pregen cards, start', async (t) => {
    const { h, w, personas } = await advHost(t); const ADV = w.KLITE_RPMod_Adventures; const doc = w.document;
    const panel = () => doc.getElementById('wm-panel');
    assert.equal(panel().querySelector('[data-ui="play-adventure"]'), null, 'no button without adventures');
    ADV.register(mini());
    await sleep(30);
    click(panel().querySelector('[data-ui="play-adventure"]'), w);
    const win = () => doc.querySelector('[data-window="adventure"]');
    assert.ok(win(), 'the picker window');
    assert.ok(texts(win()).includes('The Mini Test'));
    const cards = [...win().querySelectorAll('[data-pregen]')];
    assert.deepEqual(cards.map(c => c.getAttribute('data-pregen')), ['ana', 'bo']);
    assert.equal(cards[0].getAttribute('aria-checked'), 'true', 'the first is chosen');
    assert.equal(cards[0].querySelector('.rpm-adv-avatar').textContent, 'AT', 'initials avatar');
    click(win().querySelector('[data-pregen="bo"]'), w);
    assert.equal(win().querySelector('[data-pregen="bo"]').getAttribute('aria-checked'), 'true');
    click(win().querySelector('[data-adv="start"]'), w);
    for (let i = 0; i < 80 && !personas.length; i++) await sleep(25);
    assert.equal(personas.at(-1).name, 'Bo Test');
    assert.ok(h.api().isEnabled());
});
