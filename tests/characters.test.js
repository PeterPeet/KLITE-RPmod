'use strict';
// R2 step 1: character sheet stored in the card (src/characters), the sheet window,
// dice + game log (src/game/log.js), and their use by the AI context and Worlds.
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const esbuild = require('esbuild');
const { createHost, click, findButton, sleep, ROOT } = require('./helpers/host');

// Pure modules, bundled to CommonJS for direct use.
function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [require('path').join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', 'window', out.outputFiles[0].text)(m, m.exports, {});
    return m.exports;
}
const S = requireSrc('src/characters/sheet.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

// Minimal valid 1×1 PNG.
function makePng() {
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = crcTable[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.from([0, 200, 100, 50]))), chunk('IEND', Buffer.alloc(0))]);
}
// tEXt chunks of a PNG data URL: [{ key, text }]
function textChunks(dataUrl) {
    const b = Buffer.from(dataUrl.split(',')[1], 'base64'); const out = []; let p = 8;
    while (p + 12 <= b.length) { const len = b.readUInt32BE(p); const type = b.toString('latin1', p + 4, p + 8); if (type === 'tEXt') { const d = b.subarray(p + 8, p + 8 + len); const z = d.indexOf(0); out.push({ key: d.toString('latin1', 0, z), text: d.toString('latin1', z + 1) }); } p += 12 + len; }
    return out;
}

test('sheet rules (SRD 5.2): modifiers, proficiency, saves, skills with expertise, passive Perception', () => {
    assert.deepEqual([1, 8, 9, 10, 11, 15, 20, 30].map(S.abilityMod), [-5, -1, -1, 0, 0, 2, 5, 10]);
    assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(S.proficiencyBonus), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    const d = S.derive({ level: 5, abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 8 }, saves: ['str', 'con'],
        skills: { athletics: 1, perception: 2, bogus: 1 }, attacks: [{ name: 'Longsword', ability: 'str', damage: '1d8+3' }] });
    assert.equal(d.pb, 3);
    assert.equal(d.saves.str, 6); assert.equal(d.saves.dex, 2);
    assert.equal(d.skills.athletics, 6); assert.equal(d.skills.perception, 7, 'expertise doubles');
    assert.equal(d.skills.stealth, 2);
    assert.equal(d.passivePerception, 17); assert.equal(d.initiative, 2);
    assert.equal(d.attacks[0].toHit, 6);
    assert.equal(d.sheet.skills.bogus, undefined, 'unknown skills dropped');
    const n = S.normalizeSheet({ level: 99, abilities: { str: 50 }, hp: { max: 0, current: 99 }, custom: 'kept' });
    assert.equal(n.level, 20); assert.equal(n.abilities.str, 30); assert.equal(n.hp.max, 1); assert.equal(n.hp.current, 1);
    assert.equal(n.custom, 'kept', 'unknown fields survive (forward compatible)');
});

test('sheet in the card: extensions.klite_rpmod.sheet; other extensions and old RPmod keys preserved', () => {
    const inner = { name: 'Mira', description: 'Ranger', extensions: { depth_prompt: { prompt: 'x', depth: 4 }, klite_rpmod: { rating: { overall: 5 } } } };
    assert.equal(S.readSheet(inner), null);
    const withSheet = S.writeSheet(inner, { level: 3, className: 'Ranger' });
    assert.equal(withSheet.extensions.depth_prompt.depth, 4);
    assert.equal(withSheet.extensions.klite_rpmod.rating.overall, 5, 'old RPmod data kept');
    assert.equal(S.readSheet(withSheet).className, 'Ranger');
    assert.equal(inner.extensions.klite_rpmod.sheet, undefined, 'input not mutated');
    const removed = S.writeSheet(withSheet, null);
    assert.equal(removed.extensions.klite_rpmod.sheet, undefined); assert.equal(removed.extensions.klite_rpmod.rating.overall, 5);
    const stats = S.toCombatStats({ level: 1, abilities: { dex: 16 }, ac: 14, hp: { max: 12 }, attacks: [{ name: 'Bow', ability: 'dex', damage: '1d8+3' }] });
    assert.equal(stats.ac, 14); assert.equal(stats.hpMax, 12); assert.equal(stats.initiativeMod, 3); assert.equal(stats.attacks[0].toHit, 5);
    assert.match(S.sheetSummary({ className: 'Ranger', level: 3, species: 'Elf', inventory: [{ name: 'Rope', qty: 2 }] }), /Elf Ranger 3 — HP 10\/10, AC 10[\s\S]*Inventory: Rope x2/);
});

async function charHost(t, { image } = {}) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle');
    await h.ready({ ui: true });
    const w = h.window;
    const extra = image ? { image } : {};
    await w.__addEsoCharacter('Mira', { description: 'A ranger from the north.', extensions: { klite_rpmod: { rating: { overall: 4 } } } }, extra);
    return h;
}
const rec = async (w, key) => JSON.parse(await w.indexeddb_load(key, 'null'));

test('sheet window: create, roll into the game log, edit, save into the card (portrait PNG stays current)', async (t) => {
    const png = 'data:image/png;base64,' + makePng().toString('base64');
    const h = await charHost(t, { image: png }); const w = h.window; const doc = w.document;
    const C = w.KLITE_RPMod_Characters;
    C.open('Mira'); await sleep(30);
    const win = () => doc.querySelector('[data-window="sheet"]');
    assert.ok(win(), 'sheet window open');
    assert.match(win().textContent, /Mira has no character sheet yet/);
    click(findButton(win(), /^Create sheet$/), w); await sleep(30);
    let r = await rec(w, 'character_Mira');
    assert.ok(r.data.extensions.klite_rpmod.sheet, 'sheet stored in the card');
    assert.equal(r.data.extensions.klite_rpmod.rating.overall, 4, 'old RPmod key kept');

    // edit STR (draft) → unsaved; roll uses the draft
    const str = win().querySelector('input[aria-label="Strength score"]');
    str.value = '16'; str.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    assert.match(win().querySelector('[data-save="sheet"]').textContent, /Save •/);
    assert.equal((await rec(w, 'character_Mira')).data.extensions.klite_rpmod.sheet.abilities.str, 10, 'not saved yet');
    h.seedRandom([0.5]);   // d20 → 11
    click(win().querySelector('[data-roll="check-str"]'), w);
    const L = w.KLITE_RPMod_Log;
    assert.equal(L.entries().length, 1);
    assert.equal(L.entries()[0].roll.total, 14, '11 + 3');
    assert.match(L.describe(L.entries()[0]), /^Mira: Strength check = 14/);

    // advantage
    click([...win().querySelectorAll('[role="radio"]')].find(b => b.textContent === 'Advantage'), w); await sleep(5);
    h.seedRandom([0.1, 0.9]);
    click(win().querySelector('[data-roll="skill-athletics"]'), w);
    assert.equal(L.entries()[1].roll.total, 19 + 3, 'kept the higher die');
    assert.deepEqual(plain(L.entries()[1].roll.rolls), [3, 19]);

    click(win().querySelector('[data-save="sheet"]'), w); await sleep(30);
    r = await rec(w, 'character_Mira');
    assert.equal(r.data.extensions.klite_rpmod.sheet.abilities.str, 16, 'saved into the card');
    // the portrait PNG carries exactly one, current, V2 card
    const charas = textChunks(r.image).filter(c => c.key === 'chara');
    assert.equal(charas.length, 1, 'old card chunks removed');
    const card = JSON.parse(Buffer.from(charas[0].text, 'base64').toString('utf8'));
    assert.equal(card.spec, 'chara_card_v2');
    assert.equal(card.name, 'Mira');
    assert.equal(card.data.extensions.klite_rpmod.sheet.abilities.str, 16, 'exported card contains the sheet');
    assert.deepEqual(plain(w.__lib().map(m => m.name)), ['Mira'], 'still listed in the Library');
});

test('updateSheet: changes that arrive while a save is running are never lost (R8 data-loss fix)', async (t) => {
    const h = await charHost(t); const w = h.window; const C = w.KLITE_RPMod_Characters;
    await C.saveSheet('Mira', { className: 'Ranger', level: 1, xp: 0, hp: { max: 10, current: 10 } });
    // rewards arriving close together: each lands while the previous save is still running
    for (let i = 0; i < 12; i++) {
        C.updateSheet('Mira', s => { s.xp += 10; s.coins.gp = (s.coins.gp || 0) + 1; });
        await new Promise(r => setTimeout(r, i % 3));
    }
    assert.equal(C.cachedSheet('Mira').xp, 120, 'the cache has every change');
    await C.flushSheet('Mira'); await sleep(20);
    assert.equal(C.cachedSheet('Mira').xp, 120, 'a finished save does not bring back an older sheet');
    const stored = (await rec(w, 'character_Mira')).data.extensions.klite_rpmod.sheet;
    assert.deepEqual([stored.xp, stored.coins.gp], [120, 12], 'the card has every change');
    // a reload while changes are unsaved keeps them
    C.updateSheet('Mira', s => { s.xp += 5; });
    assert.equal((await C.loadSheet('Mira')).xp, 125);
    await C.flushSheet('Mira'); await sleep(20);
    assert.equal((await rec(w, 'character_Mira')).data.extensions.klite_rpmod.sheet.xp, 125);
});

test('AI context: persona sheet and rolls since the last reply reach the prompt; log saved per story', async (t) => {
    const h = await charHost(t); const w = h.window; const C = w.KLITE_RPMod_Characters;
    await C.saveSheet('Mira', { className: 'Ranger', level: 3, hp: { max: 24, current: 20 }, inventory: [{ name: 'Longbow', qty: 1 }] });
    Object.assign(w.KLITE_RPMod.panels.TOOLS, { personaEnabled: true, selectedPersona: { name: 'Mira', description: 'A ranger from the north.' } });
    h.seedRandom([0.95]);
    w.KLITE_RPMod_Log.rollAndLog({ who: 'Mira', what: 'Stealth check', expr: '1d20+5', kind: 'skill' });
    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[User Character: Mira\][\s\S]*Character sheet: Ranger 3 — HP 20\/24/);
    assert.match(h.prompt, /Inventory: Longbow/);
    assert.match(h.prompt, /\[Rolls and combat since your last reply\]\n- Mira: Stealth check = 25 \(20\+5\) — natural 20!/);
    await w.prepare_submit_generation();
    assert.doesNotMatch(h.prompt, /Rolls and combat/, 'only new rolls');

    const save = w.generate_savefile();
    assert.equal(save.rpmod_log.entries.length, 1, 'log in the story file');
    w.kai_json_load({});                       // another story without a log
    assert.equal(w.KLITE_RPMod_Log.entries().length, 0);
    w.kai_json_load(save);
    assert.equal(w.KLITE_RPMod_Log.entries().length, 1, 'restored with the story');
});

test('Worlds: a person linked to a card without own stats uses the card sheet (slice + combat)', async (t) => {
    const h = await charHost(t); const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    await C.saveSheet('Mira', { level: 1, ac: 15, hp: { max: 11 }, abilities: { dex: 16 } });
    await W.newWorld('T'); const inn = W.addEntity('location', { name: 'Inn' });
    const p = W.addEntity('npc', { name: '' }); W.linkCharacter(p.id, 'Mira'); W.connect(p.id, inn.id);
    W.enable(); W.moveTo('Inn');
    assert.match(W.preview(), /- Mira \|[^\n]*AC 15/, 'named after the card, stats from its sheet');
    W.startEncounter([p.id], { includePlayer: false });
    const cb = W.getCombat();
    assert.equal(cb.maxHp[p.id], 11);
});

test('Party section: the persona\'s HP, AC and class from its sheet; follows persona and sheet changes', async (t) => {
    const h = await charHost(t); const w = h.window; const doc = w.document; const C = w.KLITE_RPMod_Characters;
    const party = () => doc.querySelector('[data-section="party"]');
    const q = (k) => party().querySelector(`[data-party="${k}"]`);
    w.KLITE_RPMod_Shell.refresh(['party']); await sleep(10);
    assert.ok(q('no-persona'), 'asks to choose a persona');
    assert.ok(findButton(party(), /Choose in gallery/));

    // persona without a sheet → offer the builder
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Mira' };
    w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    await sleep(40);
    assert.equal(q('name').textContent, 'Mira');
    assert.ok(q('no-sheet'), 'card has no sheet');
    assert.ok(findButton(party(), /^Build$/));

    await C.saveSheet('Mira', { species: 'Elf', className: 'Ranger', level: 3, ac: 15, speed: 35, hp: { max: 24, current: 18 } });
    await sleep(40);
    assert.equal(q('hp').textContent, 'HP 18/24');
    assert.equal(q('ac').textContent, 'AC 15');
    assert.match(q('class').textContent, /Elf · Ranger 3/);
    assert.equal(q('hpbar').getAttribute('aria-valuenow'), '18');

    // in a fight the tracker's HP counts
    const W = h.api(); await W.newWorld('T'); W.enable();
    W.startEncounter([], { includePlayer: true }); await sleep(40);
    assert.match(q('hp').textContent, /^HP 18\/24/, 'the fight starts at the sheet\'s current HP');
    W.damage('__player__', 5); await sleep(40);
    assert.match(q('hp').textContent, /^HP 13\/24/);

    // persona switched off → no persona
    w.KLITE_RPMod.panels.TOOLS.personaEnabled = false; await sleep(40);
    assert.ok(q('no-persona'));
});

test('Worlds: a linked person without its own text uses the card\'s blurb; card edits refresh it', async (t) => {
    const h = await charHost(t); const w = h.window; const W = h.api();
    await W.newWorld('T'); const inn = W.addEntity('location', { name: 'Inn' });
    const p = W.addEntity('npc', { name: '' }); W.linkCharacter(p.id, 'Mira'); W.connect(p.id, inn.id);
    W.enable(); W.moveTo('Inn');
    await sleep(40);   // the card loads on first use (warmed on world change)
    assert.match(W.preview(), /- Mira \| A ranger from the north\./);

    const L = w.KLITE_RPMod_Library;
    const r = await L.loadCharacter('Mira');
    await L.saveCharacter({ inner: Object.assign({}, r.data, { personality: '{{char}} is <b>wary</b> of strangers.' }), oldName: 'Mira' });
    W.preview(); await sleep(40);
    assert.match(W.preview(), /- Mira \| Mira is wary of strangers\./, 'personality first, macros and markup cleaned');
    W.updateEntity(p.id, { description: 'Own text wins.' });
    assert.match(W.preview(), /- Mira \| Own text wins\./);
});
