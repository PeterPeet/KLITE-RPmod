'use strict';
// src/library/esoliteLibrary.js — RPmod writes characters through Esolite 1.35's own
// id-based Library, and re-lists characters an older RPmod version had hidden.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

async function libHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    h.load('library');
    return h;
}
// page-realm values → plain Node values (jsdom realms differ; see ARCHITECTURE §6)
const plain = (x) => JSON.parse(JSON.stringify(x));
const names = (w) => plain(w.__lib().map(m => `${m.name}#${m.id}`));
const rec = async (w, key) => JSON.parse(await w.indexeddb_load(key, 'null'));

test('library: edit keeps the Library entry and id; rename keeps id; new name collision → Name_1; delete', async (t) => {
    const h = await libHost(t); const w = h.window; const L = w.KLITE_RPMod_Library;
    await w.__addEsoCharacter('Bram', { description: 'Innkeeper.' });
    w.eval(`allCharacterNames[0].favorite = true`);

    await L.saveCharacter({ inner: { name: 'Bram', description: 'Innkeeper, edited.' }, oldName: 'Bram' });
    assert.deepEqual(names(w), ['Bram#Bram'], 'still listed, same id');
    assert.equal((await rec(w, 'character_Bram')).data.description, 'Innkeeper, edited.');
    assert.equal((await rec(w, 'character_Bram')).id, 'Bram', 'record carries its id like Esolite writes it');
    assert.equal(w.__lib()[0].favorite, true, 'favorite kept');

    await L.saveCharacter({ inner: { name: 'Bram the Bold', description: 'x' }, oldName: 'Bram' });
    assert.deepEqual(names(w), ['Bram the Bold#Bram'], 'rename keeps the id (links stay valid)');

    await L.saveCharacter({ inner: { name: 'Lia', description: 'Bard.' } });
    await L.saveCharacter({ inner: { name: 'Lia', description: 'Another bard.' } });
    assert.deepEqual(names(w).sort(), ['Bram the Bold#Bram', 'Lia#Lia', 'Lia_1#Lia_1'], 'import never overwrites (Esolite rule)');
    assert.equal((await rec(w, 'character_Lia')).data.description, 'Bard.');

    await L.deleteCharacter('Lia_1');
    assert.ok(!names(w).includes('Lia_1#Lia_1'));
    assert.equal(await w.indexeddb_load('character_Lia_1', 'gone'), '', 'deleted the Esolite way');
});

test('library: recovery re-lists only RPmod orphans and is repeatable', async (t) => {
    const h = await libHost(t); const w = h.window; const L = w.KLITE_RPMod_Library;
    await w.__addEsoCharacter('Bram', { description: 'Innkeeper.' });
    const put = (k, v) => w.indexeddb_save(k, JSON.stringify(v));
    // the orphan: old RPmod format (no id), not referenced by any list entry
    await put('character_Old Rowan', { name: 'Old Rowan', data: { name: 'Old Rowan', description: 'Captain.', personality: 'stern' }, image: undefined });
    // decoys that must stay untouched
    await put('character_Some Save', { id: 'Some Save', name: 'Some Save', data: { gamestarted: true } });
    await put('character_Doc', { name: 'Doc', data: 'data:application/pdf;base64,AA', dataType: 'application/pdf' });
    await put('character_Odd', { name: 'Odd', data: [1, 2, 3] });
    await w.indexeddb_save('character_Deleted');                                  // Esolite delete = ''
    await put('character_Bram_copy', { name: 'Bram', data: { name: 'Bram', description: 'dup' } }); // orphan whose name is taken

    const found = plain((await L.findOrphans()).map(o => o.id)).sort();
    assert.deepEqual(found, ['Bram_copy', 'Old Rowan']);
    const recovered = plain(await L.recoverOrphans());
    assert.deepEqual(recovered.sort(), ['Bram_1', 'Old Rowan']);
    assert.ok(names(w).includes('Old Rowan#Old Rowan'));
    assert.ok(names(w).includes('Bram_1#Bram_copy'), 'name clash → Esolite-style new name, same key');
    const r = await rec(w, 'character_Old Rowan');
    assert.equal(r.id, 'Old Rowan'); assert.equal(r.data.personality, 'stern', 'card data untouched');
    assert.equal((await rec(w, 'character_Some Save')).data.gamestarted, true);
    assert.deepEqual(plain(await L.recoverOrphans()), [], 'second run finds nothing');
});

test('library: no recovery before Esolite has migrated its list to ids', async (t) => {
    const h = await libHost(t); const w = h.window; const L = w.KLITE_RPMod_Library;
    await w.indexeddb_save('characterList', JSON.stringify([{ name: 'Legacy' }]));   // pre-1.35 list
    await w.indexeddb_save('character_Legacy', JSON.stringify({ name: 'Legacy', data: { name: 'Legacy', description: 'x' } }));
    assert.deepEqual(plain(await L.findOrphans()), []);
});

test('bundle: editing and importing in the RPmod gallery keeps characters in the Esolite Library', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary();
    h.load('bundle');
    await h.ready();
    const w = h.window; const CH = w.KLITE_RPMod.panels.CHARS;
    await w.__addEsoCharacter('Bram', { description: 'Innkeeper.' });
    await CH.rebuildFromEsolite();
    assert.ok(w.KLITE_RPMod.characters.some(c => c.name === 'Bram'), 'gallery mirrors the Library');

    await CH.addCharacter({ name: 'Bram', description: 'Innkeeper, edited.', __oldName: 'Bram' });   // gallery editor save
    await CH.addCharacter({ name: 'Nia', description: 'Healer.' });                                   // gallery import
    await sleep(10);
    assert.deepEqual(names(w).sort(), ['Bram#Bram', 'Nia#Nia'], 'both listed (1.35 drops id-less entries)');
    assert.equal((await rec(w, 'character_Bram')).data.description, 'Innkeeper, edited.');
    assert.deepEqual(plain(w.KLITE_RPMod.characters.map(c => c.name)).sort(), ['Bram', 'Nia']);

    await CH.deleteCharacterByName('Nia');
    assert.deepEqual(names(w), ['Bram#Bram']);
});

test('library: the exported V2 card has every required field; stored data unchanged; bad lorebook left out', async (t) => {
    const h = await libHost(t); const L = h.window.KLITE_RPMod_Library;
    const inner = { name: 'Kira', description: 'A thief.', tags: 'not-an-array', character_version: 2, character_book: 'MyWIGroup',
        extensions: { klite_rpmod: { sheet: { level: 1 } } } };
    const card = plain(L.v2Card(inner));
    assert.equal(card.spec, 'chara_card_v2'); assert.equal(card.spec_version, '2.0');
    const strings = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version'];
    for (const k of strings) assert.equal(typeof card.data[k], 'string', k);
    assert.deepEqual(card.data.alternate_greetings, []); assert.deepEqual(card.data.tags, []);
    assert.equal(card.data.character_version, '2');
    assert.equal(card.data.extensions.klite_rpmod.sheet.level, 1, 'extensions kept');
    assert.equal('character_book' in card.data, false, 'a WI group name is not a lorebook');
    assert.equal(card.data.description, 'A thief.');
    assert.equal(inner.tags, 'not-an-array', 'input not changed');
    const book = { entries: [] };
    assert.deepEqual(plain(L.v2Card({ name: 'X', character_book: book }).data.character_book), book, 'a real lorebook stays');
});
