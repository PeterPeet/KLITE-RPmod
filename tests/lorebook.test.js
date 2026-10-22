'use strict';
// R6 step 4: lorebook round trip — a world ↔ SillyTavern World Info / Lorebook V3 / cards / Esolite WI.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { createHost, click, sleep, ROOT } = require('./helpers/host');
const { ESOBOLD_DIR } = require('../scripts/esolite-paths');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const LB = requireSrc('src/game/lorebook-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

// Esolite's own lorebook importer (index.html = the clone's embd_res/klite.embd), cut out by name.
function esoliteFunction(name) {
    const src = fs.readFileSync(path.join(ESOBOLD_DIR, 'embd_res', 'klite.embd'), 'utf8');
    const start = src.indexOf(`function ${name}(`); assert.ok(start > 0, name + ' not found in klite.embd');
    let i = src.indexOf('{', start), depth = 0;
    for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
    return src.slice(start, i + 1);
}
const esolite = new Function(`${esoliteFunction('has_tavern_wi_check')}\n${esoliteFunction('load_tavern_wi')}\nreturn { has_tavern_wi_check, load_tavern_wi };`)();

const WORLD = {
    id: 'w1', name: 'Vale', description: 'A quiet vale.',
    locations: [{ id: 'l1', name: 'Mill', description: 'An old mill.' }, { id: 'l2', name: 'Ford', description: '' }],
    npcs: [{ id: 'n1', name: 'Bram', personality: 'gossipy' }], factions: [{ id: 'f1', name: 'Guard', description: 'The watch.' }],
    objects: [], events: [], quests: [{ id: 'q1', title: 'Lost Cat', description: 'Find the cat.' }],
    globalLore: [{ id: 'g1', label: 'The Old War', keys: ['war', 'old war'], secondary: ['veteran'], content: 'Forty years ago…', always: false },
        { id: 'g2', label: 'Curfew', keys: ['night'], content: 'Nobody walks at night.', always: true, disabled: true }],
};

test('lorebook export: SillyTavern World Info that Esolite\'s own importer reads; V3; headers and RPmod data', () => {
    const st = LB.toTavern(WORLD);
    assert.equal(st.extensions.rpmod.world, WORLD, 'the whole world travels with the book');
    const es = Object.values(st.entries);
    assert.equal(es.length, 7, '2 places, 1 person, 1 faction, 1 quest, 2 lore');
    const mill = es.find(e => e.name === 'Mill');
    assert.deepEqual(plain(mill), { uid: 0, key: ['Mill'], keysecondary: [], keys: ['Mill'], secondary_keys: [], comment: 'Mill', name: 'Mill',
        content: '[Location: Mill]\nAn old mill.', constant: false, selective: false, disable: false, enabled: true, order: 100, insertion_order: 100, position: 0,
        extensions: { rpmod: { kind: 'location', id: 'l1', field: 'description' } } });
    assert.equal(es.find(e => e.name === 'Bram').content, '[Character: Bram]\ngossipy');
    assert.equal(es.find(e => e.name === 'Bram').extensions.rpmod.field, 'personality', 'the example-world style: text in personality');
    const war = es.find(e => e.name === 'The Old War');
    assert.deepEqual([war.key, war.keysecondary, war.selective, war.content], [['war', 'old war'], ['veteran'], true, 'Forty years ago…']);
    assert.equal(es.find(e => e.name === 'Curfew').disable, true);

    // Esolite: detected as a Tavern lorebook, loaded into WorldInfo with keys and text
    assert.equal(esolite.has_tavern_wi_check(st), true);
    const wi = esolite.load_tavern_wi(st);
    assert.equal(wi.length, 7);
    const wwar = wi.find(e => e.comment === 'The Old War');
    assert.deepEqual([wwar.key, wwar.keysecondary, wwar.content], ['war,old war', 'veteran', 'Forty years ago…']);
    assert.equal(wi[0].content, '[Location: Mill]\nAn old mill.');

    const v3 = LB.toV3(WORLD);
    assert.equal(v3.spec, 'lorebook_v3');
    assert.ok(Array.isArray(v3.data.entries));
    assert.deepEqual(plain(v3.data.entries[0]).extensions, { rpmod: { kind: 'location', id: 'l1', field: 'description' } });
    assert.equal(v3.data.entries.find(e => e.name === 'Curfew').enabled, false);
    assert.equal(LB.toTavern(WORLD, { embed: false }).extensions.rpmod.world, undefined);
});

test('lorebook read: every shape; typed entries from RPmod data or header', () => {
    const shapes = {
        tavern: LB.toTavern(WORLD), v3: LB.toV3(WORLD),
        cardV2: { spec: 'chara_card_v2', data: { name: 'Card', character_book: { entries: [{ keys: ['a'], content: 'A.', enabled: false }] } } },
        esolite: [{ key: 'x,y', keysecondary: 'z', content: '[Location: Pier]\nWet planks.', comment: 'Pier', widisabled: false }],
        bare: { entries: { 5: { key: ['k'], content: 'K.', uid: 5, disable: true } } },
    };
    assert.equal(LB.readBook(shapes.tavern).world.id, 'w1');
    assert.equal(LB.readBook(shapes.v3).entries.length, 7);
    assert.equal(LB.readBook(shapes.v3).world.name, 'Vale');
    assert.deepEqual(plain(LB.readBook(shapes.cardV2)), { name: 'Card', world: null, entries: [{ keys: ['a'], secondary: [], content: 'A.', comment: '', constant: false, enabled: false, wigroup: '', rpmod: null }] });
    const pier = LB.readBook(shapes.esolite).entries[0];
    assert.deepEqual([pier.keys, pier.secondary], [['x', 'y'], ['z']]);
    assert.deepEqual(plain(LB.typedEntry(pier)), { kind: 'location', name: 'Pier', text: 'Wet planks.' }, 'typed by its header');
    assert.equal(LB.readBook(shapes.bare).entries[0].enabled, false);
    assert.deepEqual(plain(LB.typedEntry({ content: 'Just lore.', keys: ['q'], comment: '' })), { kind: 'lore', name: 'q', text: 'Just lore.' });
    assert.deepEqual(plain(LB.readBook('not json')), { name: '', world: null, entries: [] });
});

async function example(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api(); await W.loadExample();
    return { h, w: h.window, W };
}
// A world without its id, name and the fields the test changed — to compare a restored copy.
function body(w, drop = []) { const c = plain(w); delete c.id; delete c.name; for (const f of drop) f(c); return c; }

for (const format of ['tavern', 'v3']) {
    test(`lorebook round trip (${format}): export, edit an entry elsewhere, re-import — the world comes back with the edit`, async (t) => {
        const { W } = await example(t);
        const original = W.exportWorld();
        const book = plain(W.exportWorldAsLorebook(null, format));
        const entries = format === 'v3' ? book.data.entries : Object.values(book.entries);
        // edits made in SillyTavern: Bram's text, and a new entry
        entries.find(e => e.name === 'Innkeeper Bram').content = '[Character: Innkeeper Bram]\nfriendly, but owes the Red Hand money';
        const extra = { keys: ['river'], key: ['river'], content: 'The river floods every spring.', comment: 'River', uid: 99 };
        if (format === 'v3') book.data.entries.push(extra); else book.entries['99'] = extra;

        const n = await W.importLorebook(book, {});
        assert.equal(n, entries.length + (format === 'v3' ? 0 : 1));
        const back = W.activeWorld();
        assert.notEqual(back.id, original.id, 'a new world — the original is never overwritten');
        assert.equal(back.name, 'Eldoria (Example) (imported)');
        assert.equal(W.listWorlds().length, 2);
        assert.equal(W.entityById('npc_bram').personality, 'friendly, but owes the Red Hand money', 'the edit is applied to the field it came from');
        const river = back.globalLore.find(g => g.label === 'River');
        assert.ok(river && river.content === 'The river floods every spring.', 'a new entry becomes lore');
        // everything else is exactly the original world: places, quests, shops, maps, encounters…
        const strip = [c => { c.npcs.find(p => p.id === 'npc_bram').personality = ''; c.globalLore = c.globalLore.filter(g => g.label !== 'River'); }];
        assert.deepEqual(body(back, strip), body(original, strip));
    });
}

test('lorebook import without an RPmod world: headers become typed nodes, other entries lore; disabled lore stays out of the AI context', async (t) => {
    const { W } = await example(t);
    const book = plain(W.exportWorldAsLorebook(null, 'tavern'));
    delete book.extensions;   // e.g. saved again by another tool
    for (const e of Object.values(book.entries)) delete e.extensions;
    book.entries.x = { uid: 1000, key: ['toll'], content: 'The bridge toll is two copper.', comment: 'Toll', disable: true };
    await W.importLorebook(book, { worldName: 'From ST' });
    const w = W.activeWorld();
    assert.equal(w.name, 'From ST', 'the file name (the book name without one)');
    assert.ok(w.locations.some(l => l.name === 'Millbrook Village' && /stone well/.test(l.description)), 'a location from its header');
    assert.ok(w.npcs.some(p => p.name === 'Captain Rowan'));
    assert.ok(w.quests.some(q => q.title === 'Bandit Bounty'));
    const toll = w.globalLore.find(g => g.label === 'Toll');
    assert.equal(toll.disabled, true);
    W.enable(); W.moveTo(w.locations[0].id);
    W.updateEntity(toll.id, { always: true });
    assert.doesNotMatch(W.preview(), /bridge toll/, 'a disabled entry is not sent');
    W.updateEntity(toll.id, { disabled: false });
    assert.match(W.preview(), /bridge toll/);
    // merge: the entries of a book are added to the active world
    const before = W.activeWorld().globalLore.length;
    await W.importLorebook([{ key: 'fog', content: 'Fog rolls in.' }], { merge: true });
    assert.equal(W.activeWorld().globalLore.length, before + 1);
});

test('World tab: Export shows the formats; Save to Esolite\'s Library stores the world as World Info', async (t) => {
    const { h, w, W } = await example(t);
    const saved = [];
    w.saveLorebookToIndexDB = (name, data, original) => saved.push({ name, data, original });
    h.shell().open('world'); await sleep(30);
    const btn = (id) => w.document.querySelector(`#wm-panel [data-ui="${id}"]`);
    const exportBtn = [...w.document.querySelectorAll('#wm-panel button')].find(b => /Export/.test(b.textContent));
    click(exportBtn, w); await sleep(30);
    for (const id of ['world', 'tavern', 'v3', 'wi', 'library']) assert.ok(btn('export-' + id), id);
    click(btn('export-library'), w);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, 'Eldoria (Example)');
    assert.ok(saved[0].data.every(e => e.wigroup === 'Eldoria (Example)' && typeof e.key === 'string'), 'Esolite WI entries in one group');
    assert.equal(saved[0].original.extensions.rpmod.world.id, W.activeWorld().id);
    await sleep(30);
    assert.equal(btn('export-world'), null, 'the list closes after a choice');
});
