'use strict';
// R2 acceptance "export and re-import as a card without data loss": cards that went through
// SillyTavern (owner's round trip, 2026-09-24; fixtures in tests/fixtures/sillytavern/, made
// with scripts/roundtrip-card.js). SillyTavern re-exports RPmod's PNG as a V3 card (chara +
// ccv3) and keeps every field, the lorebook and all extensions — the RPmod sheet included —
// also after an edit. The bare inner JSON Esolite downloads for a character without a
// portrait loses them, so RPmod's gallery downloads a complete V2 JSON instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { createHost, click, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const S = requireSrc('src/characters/sheet.js');
const FIX = path.join(ROOT, 'tests', 'fixtures', 'sillytavern');
const orig = JSON.parse(fs.readFileSync(path.join(FIX, 'kara-rpmod-export.json'), 'utf8')).data;
const plain = (v) => JSON.parse(JSON.stringify(v));
const lf = (s) => (typeof s === 'string' ? s.replace(/\r\n/g, '\n') : s);   // SillyTavern stores CRLF
const TEXT = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version'];

function assertKept(d, label, edited = []) {
    for (const k of TEXT) if (!edited.includes(k)) assert.equal(lf(d[k]), orig[k], `${label}: ${k}`);
    for (const k of edited) assert.ok(lf(d[k]).startsWith(orig[k]) && lf(d[k]).length > orig[k].length, `${label}: ${k} carries the edit`);
    assert.deepEqual(plain(d.alternate_greetings.map(lf)), orig.alternate_greetings, `${label}: alternate greetings`);
    assert.deepEqual(plain(d.tags), orig.tags);
    assert.deepEqual(plain(d.character_book.entries.map(e => [e.keys, e.content])), orig.character_book.entries.map(e => [e.keys, e.content]), `${label}: lorebook`);
    assert.deepEqual(plain(d.extensions.rpmod_roundtrip_marker), orig.extensions.rpmod_roundtrip_marker, `${label}: unknown extension kept`);
    assert.equal(d.extensions.klite_rpmod.rating, 4);
    const got = S.readSheet(d), want = S.readSheet(orig);
    assert.deepEqual(plain(got), plain(want), `${label}: RPmod sheet identical`);
    assert.equal(got.notes, 'Grüße aus Brückenstadt — „Kara“ trägt ein Schwert 🗡️ and <b>no HTML</b> & "quotes".', 'Unicode intact');
    assert.equal(S.derive(got).sheet.ac, S.derive(want).sheet.ac);
}

test('SillyTavern round trip: V3 PNG (edited in SillyTavern) and V3 JSON keep every field, the lorebook and the RPmod sheet', () => {
    const h = createHost(); h.installTavernTool();
    try {
        const T = h.window.tavernTool;
        const bytes = new Uint8Array(fs.readFileSync(path.join(FIX, 'kara-st-v3-edited.png')));
        const chara = T.extractCardFromPngBytes(bytes, ['chara']).card, ccv3 = T.extractCardFromPngBytes(bytes, ['ccv3']).card;
        assert.equal(chara.spec, 'chara_card_v3'); assert.equal(ccv3.spec, 'chara_card_v3');
        assertKept(chara.data, 'PNG chara', ['description', 'personality']);
        assertKept(ccv3.data, 'PNG ccv3', ['description', 'personality']);
        const json = JSON.parse(fs.readFileSync(path.join(FIX, 'kara-st-v3.json'), 'utf8'));
        assert.equal(json.spec, 'chara_card_v3');
        assertKept(json.data, 'JSON');
    } finally { h.close(); }
});

test('the bare inner JSON (no spec) loses data in SillyTavern — why RPmod downloads a V2 JSON instead', () => {
    const lost = JSON.parse(fs.readFileSync(path.join(FIX, 'kara-st-from-bare-json.json'), 'utf8')).data;
    assert.equal(lost.system_prompt, ''); assert.equal(lost.character_version, '');
    assert.equal(lost.character_book, undefined);
    assert.equal(S.readSheet(lost), null, 'the RPmod sheet is gone');
});

test('gallery Download: a character without a portrait downloads as a complete V2 card with the sheet', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    h.load('bundle');
    await h.ready({ ui: true });
    const w = h.window;
    const got = [];
    w.downloadB64URL = (fileName, url) => got.push({ fileName, url });
    w.getDownloadDataFromManager = async () => { throw new Error('Esolite download must not be used without a portrait'); };
    await w.__addEsoCharacter('Kara', Object.assign({}, orig, { name: 'Kara' }));
    w.KLITE_RPMod_Gallery.open('Kara');
    await sleep(80);
    click(w.document.querySelector('.rpm-gal-detail [data-gal-action="download"]'), w);
    await sleep(80);
    assert.equal(got.length, 1); assert.equal(got[0].fileName, 'Kara.json');
    assert.match(got[0].url, /^data:application\/json;base64,/);
    const card = JSON.parse(Buffer.from(got[0].url.split(',')[1], 'base64').toString('utf8'));
    assert.equal(card.spec, 'chara_card_v2'); assert.equal(card.spec_version, '2.0');
    assert.equal(card.data.system_prompt, orig.system_prompt);
    assert.equal(card.data.character_book.entries.length, 2);
    assert.deepEqual(plain(S.readSheet(card.data)), plain(S.readSheet(orig)), 'sheet in the download');
    assert.equal(S.readSheet(card.data).notes, S.readSheet(orig).notes, 'Unicode survives the base64 download');
    // with a portrait Esolite's own download (the PNG with the embedded card) is used
    await w.__addEsoCharacter('Mira', { description: 'A ranger.' }, { image: 'data:image/png;base64,iVBORw0KGgo=' });
    const esolite = [];
    w.getDownloadDataFromManager = async (n) => { esolite.push(n); return { fileName: n + '.png', b64Url: 'data:image/png;base64,AAAA' }; };
    w.KLITE_RPMod_Gallery.open('Mira'); await sleep(80);
    click(w.document.querySelector('.rpm-gal-detail [data-gal-action="download"]'), w); await sleep(80);
    assert.deepEqual(esolite, ['Mira']); assert.equal(got[1].fileName, 'Mira.png');
});
