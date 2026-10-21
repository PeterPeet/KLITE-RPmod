'use strict';
// The live sheet (2026-10-20, a player's report of very high disk use): Esolite stores a character as ONE IndexedDB
// entry with its portrait, so every game change written into the card rewrote megabytes (measured: 2.9 MB per HP
// change with a 2.8 MB portrait, after reading the record twice). Game changes now go into `rpmod_sheet_<id>`; the
// card is written once the changes are quiet, on flushSheet and when the page is hidden.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, sleep } = require('./helpers/host');

async function setup(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: false });
    const w = h.window; const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Bram', { description: 'A fighter.' }, { image: 'data:image/png;base64,' + 'A'.repeat(4000) });
    await C.saveSheet('Bram', { className: 'Fighter', level: 3, hp: { max: 28, current: 28 } });
    const ops = { save: [], load: [] };
    const os = w.indexeddb_save, ol = w.indexeddb_load;
    w.indexeddb_save = (k, v) => { ops.save.push([k, String(v || '').length]); return os(k, v); };
    w.indexeddb_load = (k, d) => { ops.load.push(k); return ol(k, d); };
    const card = async () => JSON.parse(await ol('character_Bram', '{}'));
    const live = async () => { const v = await ol('rpmod_sheet_Bram', ''); return v ? JSON.parse(v) : null; };
    return { h, w, C, ops, card, live };
}
const cardHp = (rec) => rec.data.extensions.klite_rpmod.sheet.hp.current;

test('a game change goes into the live sheet at once; the card is written only on flush (then the live sheet is gone)', async (t) => {
    const { C, ops, card, live } = await setup(t);
    for (const hp of [20, 14, 9]) C.updateSheet('Bram', s => { s.hp.current = hp; });
    await sleep(30);
    assert.equal(C.cachedSheet('Bram').hp.current, 9, 'synchronous readers see it');
    assert.equal(ops.save.filter(([k]) => k === 'character_Bram').length, 0, 'the card (with its portrait) is not written per change');
    assert.ok(ops.save.every(([k, n]) => k !== 'rpmod_sheet_Bram' || n < 3000), 'the live sheet is small');
    assert.equal((await live()).sheet.hp.current, 9, 'and it is on disk (a crash loses nothing)');
    assert.equal(cardHp(await card()), 28);
    await C.flushSheet('Bram');
    assert.equal(cardHp(await card()), 9, 'flush writes the card');
    assert.equal(ops.save.filter(([k]) => k === 'character_Bram').length, 1, 'once');
    assert.equal(await live(), null, 'the live sheet is folded in');
    assert.ok((await card()).image.startsWith('data:image/png;base64,'), 'the portrait is kept');
});

test('a card write reads the record once (the portrait comes from that read, not a second one)', async (t) => {
    const { C, ops } = await setup(t);
    ops.load.length = 0;
    await C.saveSheet('Bram', Object.assign({}, C.cachedSheet('Bram'), { notes: 'x' }));
    assert.equal(ops.load.filter(k => k === 'character_Bram').length, 1, JSON.stringify(ops.load));
});

test('after a reload the live sheet wins over the card it started from; a card changed elsewhere wins over it', async (t) => {
    const { w, C, card, live } = await setup(t);
    C.updateSheet('Bram', s => { s.hp.current = 5; });
    await sleep(30);
    // a reload before the card was written: the cache is empty, the card still says 28
    C.forget('Bram');
    assert.equal((await C.loadSheet('Bram')).hp.current, 5, 'the live sheet wins');
    await C.flushSheet('Bram');
    assert.equal(cardHp(await card()), 5);
    // another device synced a newer card (or the player imported one): the card wins, the live sheet is dropped
    C.updateSheet('Bram', s => { s.hp.current = 3; });
    await sleep(30);
    const rec = await card(); rec.data.extensions.klite_rpmod.sheet.hp.current = 17;
    await w.__addEsoCharacter('Bram', rec.data, { image: rec.image });
    C.forget('Bram');
    assert.equal((await C.loadSheet('Bram')).hp.current, 17, 'the card changed elsewhere wins');
    await sleep(20);
    assert.equal(await live(), null, 'the stale live sheet is dropped');
});

test('Retry/Undo restores a sheet through the live sheet (no card write)', async (t) => {
    const { C, ops, live } = await setup(t);
    const before = JSON.parse(JSON.stringify(C.cachedSheet('Bram')));
    C.updateSheet('Bram', s => { s.hp.current = 1; s.inventory.push({ name: 'Rope', qty: 1 }); });
    C.restoreSheet('Bram', before);
    await sleep(30);
    assert.equal(C.cachedSheet('Bram').hp.current, 28);
    assert.ok(!C.cachedSheet('Bram').inventory.some(i => i.name === 'Rope'));
    assert.equal(ops.save.filter(([k]) => k === 'character_Bram').length, 0);
    assert.equal((await live()).sheet.hp.current, 28);
});
