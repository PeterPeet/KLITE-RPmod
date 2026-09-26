'use strict';
// R5: spells in the Combat window (spell attacks, saves, healing, Magic Missile, slots spent on the
// sheet, zones), companions keeping their HP between fights, and the Long rest.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const SP = requireSrc('src/characters/spell-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));
// d20 = 1 + floor(r × 20): 0.05 → 2, 0.5 → 11, 0.9 → 19, 0.99 → 20

test('rules: what a spell does in combat, damage and healing by slot level, slots, range', () => {
    const use = (k) => SP.combatUse(SP.spell(k));
    assert.equal(use('fire-bolt').kind, 'attack'); assert.equal(use('fire-bolt').ranged, true);
    assert.equal(use('shocking-grasp').kind, 'attack'); assert.equal(use('shocking-grasp').range.melee, true);
    assert.deepEqual([use('sacred-flame').kind, use('sacred-flame').save, use('sacred-flame').half], ['save', 'dex', false]);
    assert.deepEqual([use('fireball').half, use('fireball').area], [true, true]);
    assert.equal(use('hold-person').kind, 'save'); assert.equal(use('hold-person').damage, '');
    assert.equal(use('cure-wounds').kind, 'heal'); assert.equal(use('healing-word').bonus, true);
    assert.equal(use('magic-missile').kind, 'darts');
    assert.equal(use('bless').kind, 'other');
    assert.deepEqual(plain(SP.rangeProfile(SP.spell('cure-wounds'))), { melee: true, ranged: false, reachFt: 5, normalFt: 0, longFt: 0 });
    assert.equal(SP.rangeProfile(SP.spell('fireball')).normalFt, 150);

    assert.equal(SP.castDamage(SP.spell('fireball'), 5, 3), '8d6');
    assert.equal(SP.castDamage(SP.spell('fireball'), 5, 5), '10d6', 'one die per slot level above 3');
    assert.equal(SP.castDamage(SP.spell('sacred-flame'), 5, 0), '2d8', 'cantrips grow with the character level');
    assert.equal(SP.castHealing(SP.spell('cure-wounds'), 3, 1), '2d8+3');
    assert.equal(SP.castHealing(SP.spell('cure-wounds'), 3, 3), '6d8+3');
    assert.equal(SP.castHealing(SP.spell('healing-word'), -1, 1), '2d4-1');
    assert.deepEqual([SP.dartCount(1), SP.dartCount(3)], [3, 5]);

    assert.equal(SP.spendSlot([2, 1], [2], 1), null, 'no level 1 slot left');
    assert.deepEqual(plain(SP.spendSlot([2, 1], [1], 1)), [2]);
    assert.deepEqual(plain(SP.spendSlot([2, 1], [], 2)), [0, 1]);
    assert.deepEqual(plain(SP.castableSlots(1, [2, 1], [2])), [2], 'upcast when level 1 is used up');
    const entries = SP.spellEntries({ ability: 'wis', cantripsKnown: ['sacred-flame'], preparedSpells: ['cure-wounds', 'nonsense'], granted: [{ key: 'magic-missile', source: 'feat', free: 'long' }] });
    assert.deepEqual(entries.map(e => e.key), ['sacred-flame', 'cure-wounds', 'magic-missile']);
});

// A level-3 cleric persona (WIS 16: save DC 13, spell attack +5; slots 4 + 2), a companion with a
// character sheet (Bram) and one with world stats only (Ned).
async function field(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', { className: 'Cleric', level: 3, ac: 16, hp: { max: 24, current: 24 }, abilities: { wis: 16, dex: 10 },
        attacks: [{ name: 'Mace', ability: 'str', proficient: true, damage: '1d6' }],
        spellcasting: { ability: 'wis', slots: [4, 2], cantripsKnown: ['sacred-flame'], preparedSpells: ['cure-wounds', 'guiding-bolt', 'healing-word', 'bless', 'burning-hands', 'inflict-wounds'],
            granted: [{ key: 'magic-missile', source: 'Magic Initiate', free: 'long' }] } });
    await w.__addEsoCharacter('Bram', { description: 'A fighter.' });
    await C.saveSheet('Bram', { className: 'Fighter', level: 3, ac: 17, hp: { max: 28, current: 20 }, abilities: { str: 16 }, attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3' }] });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Mira' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    const bram = W.addEntity('npc', { name: 'Bram' }); W.linkCharacter(bram.id, 'Bram');
    const ned = W.addEntity('npc', { name: 'Ned' }); W.updateEntity(ned.id, { stats: { hpMax: 10, ac: 12, attacks: [{ name: 'Club', toHit: 2, damage: '1d4' }] } });
    C.cachedSheet('Bram'); await sleep(20);
    return { h, w, W, C, bram: bram.id, ned: ned.id };
}
const logText = (W) => W.getCombat().log.join('\n');
const monsterIds = (W) => W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.id);

test('casting: spell attack, save spells (one damage roll, half on success), healing, slots spent on the sheet', async (t) => {
    const { h, W, C, ned } = await field(t);
    h.seedRandom([0.5]);
    W.startEncounter([ned], { monsters: [{ key: 'goblin-warrior', count: 3 }], sides: { [ned]: 'party' }, zones: false });
    const book = W.combatSpells('__player__');
    const gb = book.spells.find(s => s.key === 'guiding-bolt');
    assert.deepEqual([gb.attack, gb.dc, gb.level, plain(gb.slots)], [5, 13, 1, [1, 2]]);
    const [g1, g2, g3] = monsterIds(W);

    h.seedRandom([0.9]);   // d20 19 (+5 = 24 vs AC 15), every damage die high
    let r = W.castSpell('__player__', 'guiding-bolt', { targets: [g1] });
    assert.equal(r.ok, true); assert.equal(r.slotLevel, 1);
    assert.equal(r.results[0].hit, true);
    assert.match(logText(W), /Mira casts Guiding Bolt \(level 1 spell slot\) at Goblin Warrior 1\.\nHit: Mira → Goblin Warrior 1 with Guiding Bolt/);
    assert.equal(W.getCombat().hp[g1], 0, 'the goblin is down');
    assert.deepEqual(plain(C.cachedSheet('Mira').spellcasting.used), [1], 'the slot is spent on the sheet');

    // area save spell: one damage roll, every target saves; half on a success
    h.seedRandom([0.99]);   // saves succeed (20), damage dice 6 each: 3d6 = 18 → 9
    r = W.castSpell('__player__', 'burning-hands', { targets: [g2, g3] });
    assert.deepEqual(plain(r.results.map(x => [x.success, x.damage])), [[true, 9], [true, 9]]);
    assert.match(logText(W), /Goblin Warrior 2: DEX save \d+ vs DC 13 — success, 9 fire damage/);
    assert.deepEqual(plain(C.cachedSheet('Mira').spellcasting.used), [2]);

    // cantrip: no slot; failed save = full damage
    h.seedRandom([0.05]);
    r = W.castSpell('__player__', 'sacred-flame', { targets: [g3] });
    assert.equal(r.slotLevel, 0); assert.equal(r.results[0].success, false); assert.ok(r.results[0].damage > 0);
    assert.deepEqual(plain(C.cachedSheet('Mira').spellcasting.used), [2], 'cantrips spend nothing');

    // healing brings a dying companion back; upcasting heals more and uses the higher slot
    W.damage(ned, 99);
    assert.ok(W.getCombat().death[ned], 'Ned is dying');
    h.seedRandom([0.5]);
    r = W.castSpell('__player__', 'cure-wounds', { targets: [ned], slot: 2 });
    assert.equal(r.slotLevel, 2); assert.equal(r.results[0].healed, 4 * 5 + 3, '4d8+3 with every die 5');
    assert.equal(W.getCombat().hp[ned], 10); assert.equal(W.getCombat().death[ned], undefined);
    assert.match(logText(W), /Ned is back on their feet/);

    // no slot left: refused, nothing spent, nothing logged
    W.castSpell('__player__', 'healing-word', { targets: ['__player__'], slot: 2 });
    const before = W.getCombat().log.length, used = plain(C.cachedSheet('Mira').spellcasting.used);
    r = W.castSpell('__player__', 'cure-wounds', { targets: ['__player__'], slot: 2 });
    assert.equal(r.ok, false); assert.match(r.reason, /no level 2 spell slot left/);
    assert.equal(W.getCombat().log.length, before); assert.deepEqual(plain(C.cachedSheet('Mira').spellcasting.used), used);
    await sleep(40);
    assert.deepEqual(plain((await C.loadSheet('Mira')).spellcasting.used), used, 'saved on the card');
});

test('casting: Magic Missile darts (free cast), narrated spells, refusals', async (t) => {
    const { h, W, C } = await field(t);
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 2 }], zones: false });
    const [w1, w2] = monsterIds(W);
    h.seedRandom([0.5]);   // 1d4+1 = 4 per dart
    let r = W.castSpell('__player__', 'magic-missile', { targets: [w1, w2], free: true });
    assert.equal(r.ok, true); assert.equal(r.free, true);
    assert.deepEqual(plain(r.results.map(x => x.damage)), [8, 4], 'three darts: two at the first wolf, one at the second');
    assert.match(logText(W), /casts Magic Missile without a spell slot at Wolf 1, Wolf 2\.\n2 darts hit Wolf 1 \(force\)/);
    assert.equal(C.cachedSheet('Mira').spellcasting.freeUsed['magic-missile'], 1);
    r = W.castSpell('__player__', 'magic-missile', { targets: [w1], free: true });
    assert.equal(r.ok, false); assert.match(r.reason, /no free cast/);

    r = W.castSpell('__player__', 'bless', {});
    assert.equal(r.ok, true); assert.equal(r.kind, 'other');
    assert.match(logText(W), /Mira casts Bless \(level 1 spell slot\)\.\nBless: its effect is narrated/);
    assert.equal(W.castSpell('__player__', 'guiding-bolt', {}).reason, 'choose a target');
    assert.equal(W.castSpell('__player__', 'fireball', { targets: [w1] }).ok, false, 'not on the sheet');
    assert.equal(W.castSpell(w1, 'guiding-bolt', { targets: ['__player__'] }).ok, false, 'a wolf has no spells');
});

test('casting in zone combat: range, touch spells, the action and the bonus action', async (t) => {
    const { h, W } = await field(t);
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior' }], zones: true, positions: { __player__: 'w' } });
    const [g] = monsterIds(W);
    W.zoneMove(g, 'e', { free: true });
    while (W.getCombat().order[W.getCombat().turnIndex].id !== '__player__') W.nextTurn();
    let r = W.castSpell('__player__', 'inflict-wounds', { targets: [g] });
    assert.equal(r.ok, false); assert.match(r.reason, /Goblin Warrior/, 'touch cannot reach the other side of the room');
    h.seedRandom([0.05]);
    r = W.castSpell('__player__', 'sacred-flame', { targets: [g] });
    assert.equal(r.ok, true, '60 feet reaches across the room');
    r = W.castSpell('__player__', 'guiding-bolt', { targets: [g] });
    assert.equal(r.ok, false); assert.match(r.reason, /action is already used/);
    r = W.castSpell('__player__', 'healing-word', { targets: ['__player__'] });
    assert.equal(r.ok, true, 'a Bonus Action spell still works');
    assert.match(W.castSpell('__player__', 'healing-word', { targets: ['__player__'] }).reason, /bonus action is already used/);
});

test('companions keep their HP between fights; the Long rest restores HP, slots and free casts', async (t) => {
    const { h, W, C, bram, ned } = await field(t);
    h.seedRandom([0.5]);
    W.startEncounter([bram, ned], { monsters: [{ key: 'goblin-warrior' }], sides: { [bram]: 'party', [ned]: 'party' }, zones: false });
    let cb = W.getCombat();
    assert.deepEqual([cb.hp[bram], cb.maxHp[bram], cb.hp[ned], cb.maxHp[ned]], [20, 28, 10, 10], 'Bram starts at his sheet\'s current HP');
    W.damage(bram, 5); W.damage(ned, 4);
    W.castSpell('__player__', 'guiding-bolt', { targets: [monsterIds(W)[0]] });
    W.damage(monsterIds(W)[0], 50);
    assert.equal(W.getCombat().outcome, 'victory');
    await sleep(40);
    assert.equal((await C.loadSheet('Bram')).hp.current, 15, 'written to Bram\'s sheet');
    assert.deepEqual(plain(W.runtime.partyHp), { [ned]: 6 }, 'Ned (no sheet) in the story');
    assert.deepEqual(plain(W.partyStatus().map(m => [m.name, m.hp, m.max])), [['Bram', 15, 28], ['Ned', 6, 10]]);
    W.endEncounter();

    W.startEncounter([bram, ned], { monsters: [{ key: 'wolf' }], sides: { [bram]: 'party', [ned]: 'party' }, zones: false });
    cb = W.getCombat();
    assert.deepEqual([cb.hp[bram], cb.hp[ned]], [15, 6], 'the next fight starts with the kept HP');
    assert.equal(W.longRest().ok, false, 'no Long rest during a fight');
    W.endEncounter();

    const r = W.longRest();
    assert.equal(r.ok, true);
    await sleep(40);
    assert.equal((await C.loadSheet('Bram')).hp.current, 28);
    const mira = await C.loadSheet('Mira');
    assert.deepEqual(plain(mira.spellcasting.used), []); assert.deepEqual(plain(mira.spellcasting.freeUsed), {});
    assert.deepEqual(plain(W.runtime.partyHp), {});
    assert.deepEqual(plain(W.partyStatus().map(m => m.hp)), [28, 10]);
    assert.ok(h.window.KLITE_RPMod_Log.entries().some(e => /finish a Long Rest: HP, spell slots and free casts are restored/.test(e.what)));
});

test('XP is divided among the party (SRD): persona and companions with a sheet get a share each', async (t) => {
    const { h, W, C, bram, ned } = await field(t);
    const before = { mira: Number((await C.loadSheet('Mira')).xp) || 0, bram: Number((await C.loadSheet('Bram')).xp) || 0 };
    h.seedRandom([0.5]);
    // two Goblin Warriors (100 XP) for a party of three: Mira (persona), Bram (sheet), Ned (no sheet)
    W.startEncounter([bram, ned], { monsters: [{ key: 'goblin-warrior', count: 2 }], sides: { [bram]: 'party', [ned]: 'party' }, zones: false });
    for (const id of monsterIds(W)) W.damage(id, 50);
    const cb = W.getCombat();
    assert.equal(cb.outcome, 'victory');
    assert.deepEqual([cb.xp, cb.xpShares, cb.xpEach], [100, 3, 33]);
    assert.ok(cb.log.some(l => /100 XP, 33 XP each for 3 characters/.test(l)));
    assert.match(W.preview(), /Victory — every enemy is defeated \(100 XP, 33 XP each\)/);
    await sleep(40);
    assert.equal((await C.loadSheet('Mira')).xp, before.mira + 33, 'the persona gets a share');
    assert.equal((await C.loadSheet('Bram')).xp, before.bram + 33, 'a companion with a sheet gets a share');
    W.endEncounter(); await sleep(30);
    assert.equal((await C.loadSheet('Mira')).xp, before.mira + 33, 'written once');

    // alone, the persona keeps the whole XP
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior' }], zones: false });
    W.damage(monsterIds(W)[0], 50);
    assert.deepEqual([W.getCombat().xpShares, W.getCombat().xpEach], [1, 50]);
    await sleep(40);
    assert.equal((await C.loadSheet('Mira')).xp, before.mira + 33 + 50);
});

test('Combat window: Weapon/Spell switch, cast from the window; Party section shows companions and Long rest', async (t) => {
    const { h, w, W, ned } = await field(t);
    const doc = w.document;
    h.seedRandom([0.9, 0.1, 0.5]);   // the player wins initiative
    W.startEncounter([ned], { monsters: [{ key: 'goblin-warrior' }], sides: { [ned]: 'party' }, zones: false });
    while (W.getCombat().order[W.getCombat().turnIndex].id !== '__player__') W.nextTurn();
    w.KLITE_RPMod_Shell.open('combat');
    const win = () => doc.querySelector('[data-window="combat"]');
    for (let i = 0; i < 100 && !win(); i++) await sleep(20);
    const $ = (s) => win().querySelector(s);
    assert.ok($('[data-cb="act-spell"]'), 'a caster gets the Spell switch');
    $('[data-cb="act-spell"]').click(); await sleep(20);
    const spell = $('[data-cb="spell"]');
    spell.value = 'guiding-bolt'; spell.dispatchEvent(new w.Event('change')); await sleep(20);
    assert.match($('[data-cb="spell-info"]').textContent, /Spell attack \+5/);
    assert.deepEqual(Array.from($('[data-cb="slot"]').options, o => o.value), ['1', '2']);
    h.seedRandom([0.9]);
    $('[data-cb="cast"]').click(); await sleep(20);
    assert.match(W.getCombat().log.join('\n'), /Mira casts Guiding Bolt/);
    assert.equal(W.getCombat().outcome, 'victory');
    W.endEncounter(); await sleep(40);

    w.KLITE_RPMod_Shell.refresh(['party']); await sleep(40);
    const party = doc.querySelector('[data-section="party"]');
    assert.ok(party.querySelector(`[data-party-member="${ned}"]`), 'the companion is listed');
    party.querySelector('[data-ui="long-rest"]').click(); await sleep(40);
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Long Rest/.test(e.what)));
});

test('an open sheet with unsaved edits takes the slot spent in combat; Save keeps both', async (t) => {
    const { h, w, W, C } = await field(t);
    C.open('Mira'); await sleep(30);
    const doc = w.document; const win = () => doc.querySelector('[data-window="sheet"]');
    win().querySelector('[data-sheet-tab="features"]').click(); await sleep(10);   // R8: a draft edit (the notes save on their own now)
    const notes = win().querySelector('textarea[aria-label="Features and traits"]');
    notes.value = 'Owes the temple a tithe.'; notes.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(10);
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    W.castSpell('__player__', 'bless', {}); await sleep(20);
    win().querySelector('[data-save="sheet"]').click(); await sleep(40);
    await C.flushSheet('Mira');
    const s = await C.loadSheet('Mira');
    assert.equal(s.features, 'Owes the temple a tithe.');
    assert.deepEqual(plain(s.spellcasting.used), [1], 'the spent slot survived the draft save');
});
