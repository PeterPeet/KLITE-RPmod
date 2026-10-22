'use strict';
// R8 character sheet overhaul: tabs (Overview · Combat · Spells · Inventory · Features · Notes), SRD
// autocomplete for attacks and items with item definitions, in hand vs. backpack (`inHand`, additive),
// the SRD draw-as-part-of-the-attack rule in combat, the auto-filled Features tab, Character notes
// (in the card) and Adventure notes (in the play of the world, wiped by Back to start).
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, click, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const EQ = requireSrc('src/characters/equipment-rules.js');
const SH = requireSrc('src/characters/sheet.js');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('equipment rules: SRD names, definitions, weapon → attack (finesse → DEX), hands, in hand', () => {
    assert.deepEqual(EQ.itemNames().filter(n => /^Lo/.test(n)), ['Lock', 'Longbow', 'Longsword'], 'typing "Lo" offers Longsword…');
    assert.ok(EQ.weaponNames().includes('Longsword') && !EQ.weaponNames().includes('Rope'));
    assert.ok(EQ.itemNames().includes('Potion of Healing') && EQ.itemNames().includes('Bag of Holding') && EQ.itemNames().includes('Chain Mail'));
    assert.match(EQ.itemInfo('Longsword').summary, /1d8 Slashing · Versatile \(1d10\) · Mastery: Sap · 15 GP/);
    assert.equal(EQ.itemInfo('Greatsword').hands, 2);
    assert.equal(EQ.itemInfo('Chain Mail').hands, 0);
    assert.equal(EQ.itemInfo('Shield').hands, 1);
    assert.match(EQ.itemInfo('Rope').text[0], /Utilize action/);
    assert.equal(EQ.itemInfo('Bag of Holding').kind, 'magic');
    assert.equal(EQ.itemInfo('Mysterious Thing'), null);
    const rapier = EQ.attackFromWeapon('Rapier', { str: 8, dex: 15 });
    assert.deepEqual([rapier.ability, rapier.damage], ['dex', '1d8+2'], 'finesse: the better of STR and DEX');
    assert.deepEqual([EQ.attackFromWeapon('Longsword', { str: 16, dex: 10 }).ability, EQ.attackFromWeapon('Longbow', { str: 16, dex: 12 }).ability], ['str', 'dex']);
    assert.equal(EQ.attackFromWeapon('Rope', {}), null);
    const inv = [{ name: 'Greatsword', inHand: true }, { name: 'Shield', inHand: true }, { name: 'Chain Mail', inHand: true }, { name: 'Dagger' }];
    assert.equal(EQ.handsUsed(inv), 3, 'two-handed 2 + shield 1 + armor 0');
    assert.equal(EQ.attackInHand(inv, 'Greatsword'), true);
    assert.equal(EQ.attackInHand(inv, 'Dagger'), false);
    assert.equal(EQ.attackInHand(inv, 'Unarmed Strike'), null, 'nothing to dim');
});

test('save format: inHand is additive — kept only when true; R9 gives every item a place (sheathed, pockets, bags)', () => {
    const old = SH.normalizeSheet({ inventory: [{ name: 'Longsword', qty: 1 }, { name: 'Rope', qty: 1, notes: '50 ft' }] });
    assert.deepEqual(plain(old.inventory), [{ name: 'Longsword', qty: 1, notes: '', id: 'it1', at: { slot: 'sheath1' } },
        { name: 'Rope', qty: 1, notes: '50 ft', id: 'it2', at: { bag: 'over', x: 0, y: 0 } }], 'no bag: the rope is dragged along');
    const s = SH.normalizeSheet({ inventory: [{ name: 'Longsword', qty: 1, inHand: true }, { name: 'Rope', inHand: false }, { name: 'Backpack' }] });
    assert.deepEqual(plain(s.inventory), [{ name: 'Longsword', qty: 1, notes: '', inHand: true, id: 'it1', at: { slot: 'main' } },
        { name: 'Rope', qty: 1, notes: '', id: 'it2', at: { bag: 'it3', x: 0, y: 0 } }, { name: 'Backpack', qty: 1, notes: '', id: 'it3', at: { slot: 'back' } }]);
    assert.deepEqual(plain(SH.normalizeSheet(plain(s)).inventory), plain(s.inventory), 'stable');
    const sum = SH.sheetSummary(s);
    assert.match(sum, /In hand \/ worn: Longsword/); assert.match(sum, /Carried: Backpack \(worn on the back\)/); assert.match(sum, /\nBackpack: Rope/);
    assert.match(sum, /Carrying 13 of 150 lb/);
    assert.match(SH.sheetSummary(old), /Carried: Longsword \(sheathed\)\nDragged along \(overweight\): Rope\nCarrying 8 of 150 lb — overloaded/);
});

async function sheetHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    for (let i = 0; i < 100 && !(w.KLITE_RPMod_Shell && w.KLITE_RPMod_Shell.views().includes('sheet')); i++) await sleep(20);
    return { h, w, W, C, doc: w.document };
}
const win = (doc) => doc.querySelector('[data-window="sheet"]');
const tab = async (w, doc, id) => { click(win(doc).querySelector(`[data-sheet-tab="${id}"]`), w); await sleep(10); };

test('sheet: tabs like Esolite\'s settings; attacks with SRD autocomplete; in hand vs. backpack; item definitions', async (t) => {
    const { w, C, doc } = await sheetHost(t);
    await w.__addEsoCharacter('Mira', { description: 'A rogue.' });
    await C.saveSheet('Mira', { className: 'Rogue', level: 1, abilities: { str: 8, dex: 16 },
        inventory: [{ name: 'Rapier', qty: 1 }, { name: 'Greatsword', qty: 1 }, { name: 'Shield', qty: 1 }, { name: 'Rope', qty: 1 }] });
    C.open('Mira'); await sleep(40);
    const tabs = [...win(doc).querySelectorAll('ul.nav.nav-tabs.settingsnav [data-sheet-tab]')].map(a => a.textContent);
    assert.deepEqual(tabs, ['Overview', 'Combat', 'Spells', 'Inventory', 'Features', 'Notes']);
    assert.ok(win(doc).querySelector('[data-roll="check-dex"]'), 'Overview: abilities');
    assert.equal(win(doc).querySelector('[data-roll="initiative"]'), null, 'combat values on their own tab');

    // Combat: add "Rapier" — the weapon fills damage and ability (finesse → DEX)
    await tab(w, doc, 'combat');
    const add = win(doc).querySelector('input[aria-label="New attack"]');
    assert.equal(add.getAttribute('list'), 'rpm-sheet-weapons');
    assert.ok(doc.querySelector('#rpm-sheet-weapons option[value="Rapier"]'), 'SRD weapons offered');
    add.value = 'Rapier'; click(win(doc).querySelector('button[title="Add attack"]'), w); await sleep(10);
    const atk = C.current().sheet.attacks.find(a => a.name === 'Rapier');
    assert.deepEqual([atk.ability, atk.damage], ['dex', '1d8+3']);
    const row = () => win(doc).querySelector('[data-attack="Rapier"]');
    assert.ok(row().classList.contains('rpm-stowed'), 'in the backpack: dimmed');
    assert.match(win(doc).querySelector('[data-rule="hands"]').textContent, /draw or stow one weapon as part of each attack/);

    // Combat: the toggle takes the rapier in hand (R9: into the main hand) → green in Attacks
    click(row().querySelector('[data-bp]'), w); await sleep(20);
    assert.ok(row().classList.contains('rpm-inhand'), 'green in Attacks');
    // Inventory (R9): the paper doll shows it in the main hand; the greatsword cannot join it
    await tab(w, doc, 'inventory');
    const slot = (k) => win(doc).querySelector(`[data-slot="${k}"]`);
    assert.match(slot('main').textContent, /Rapier/);
    const pickUp = async (n) => { click(win(doc).querySelector(`[data-id][data-item="${n}"]`) || [...win(doc).querySelectorAll('[data-slot]')].find(x => x.textContent.includes(n)), w); await sleep(20); };
    await pickUp('Greatsword');
    assert.equal(win(doc).querySelector('[data-inv-details]').getAttribute('data-inv-details'), 'Greatsword');
    click(slot('off'), w); await sleep(20);
    assert.match(doc.querySelector('.rpm-toast').textContent, /Greatsword needs both hands: hold it in the main hand/);
    // the shield goes to the off hand
    await pickUp('Shield');
    click(slot('off'), w); await sleep(20);
    assert.match(slot('off').textContent, /Shield/);
    assert.equal(win(doc).querySelector('[data-hands]'), null, 'no hands line on the inventory tab (the slots show it)');
    // definitions and the autocomplete
    await pickUp('Rope');
    assert.match(win(doc).querySelector('[data-inv-details]').textContent, /Adventuring gear/);
    assert.ok(doc.querySelector('#rpm-sheet-items option[value="Potion of Healing"]'));
    // saved at once, without the Save button: moves are game changes
    await C.flushSheet('Mira');
    const s = await C.loadSheet('Mira');
    assert.deepEqual(plain(s.inventory.map(i => [i.name, !!i.inHand])), [['Rapier', true], ['Greatsword', false], ['Shield', true], ['Rope', false]]);
});

test('Features tab: the SRD features of a built character, level-appropriate, with the attribution', async (t) => {
    const { w, C, doc } = await sheetHost(t);
    const ADV = w.KLITE_RPMod_Adventures; for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.installPregens('drowned-lantern');
    const oona = await C.loadSheet('Oona Greycairn');
    assert.deepEqual(plain(oona.inventory.filter(i => i.inHand).map(i => i.name)), ['Chain Mail', 'Greatsword'], 'a new character wears the armor its AC counts; Oona carries her greatsword (R9)');
    C.open('Oona Greycairn'); await sleep(40);
    await tab(w, doc, 'features');
    const text = win(doc).querySelector('[data-features="srd"]').textContent;
    for (const f of ['Fighting Style', 'Second Wind', 'Weapon Mastery', 'Relentless Endurance', 'Savage Attacker · Soldier (Origin feat)', 'Great Weapon Fighting']) assert.ok(text.includes(f), f);
    assert.doesNotMatch(text, /Action Surge/, 'a level 2 feature is not there at level 1');
    assert.match(win(doc).textContent, /System Reference Document 5\.2\.1/);
    assert.ok(win(doc).querySelector('textarea[aria-label="Features and traits"]'), 'own features stay editable');
});

test('Notes: Character notes in the card (Save / Cancel / Delete); Adventure notes in the play, wiped by Back to start', async (t) => {
    const { w, W, C, doc } = await sheetHost(t);
    await w.__addEsoCharacter('Kara', { description: 'A ranger.' });
    await C.saveSheet('Kara', { className: 'Ranger', level: 1 });
    C.open('Kara'); await sleep(40);
    await tab(w, doc, 'notes');
    assert.match(win(doc).textContent, /Load a world to keep adventure notes/);
    const box = (k) => win(doc).querySelector(`textarea[data-note="${k}"]`);
    const type = (k, v) => { box(k).value = v; box(k).dispatchEvent(new w.Event('input')); };
    type('character', 'Afraid of deep water.');
    click(win(doc).querySelector('[data-roll="note-cancel-character"]'), w); await sleep(10);
    assert.equal(box('character').value, '', 'Cancel drops the edit');
    type('character', 'Afraid of deep water.');
    click(win(doc).querySelector('[data-roll="note-save-character"]'), w); await sleep(10); await C.flushSheet('Kara');
    assert.equal((await C.loadSheet('Kara')).notes, 'Afraid of deep water.', 'saved in the card at once');
    w.confirm = () => true;
    click(win(doc).querySelector('[data-roll="note-delete-character"]'), w); await sleep(10); await C.flushSheet('Kara');
    assert.equal((await C.loadSheet('Kara')).notes, '');

    await W.newWorld('Vale'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road'); W.commitToBase();
    C.open('Kara'); w.KLITE_RPMod_Shell.refresh(['sheet']); await sleep(20);
    await tab(w, doc, 'notes');
    assert.match([...win(doc).querySelectorAll('.rpm-sheet-notehint')].pop().textContent, /wiped when a new game starts or on Back to start/);
    type('adventure', 'The miller lied about the grain.');
    click(win(doc).querySelector('[data-roll="note-save-adventure"]'), w); await sleep(10);
    assert.equal(W.adventureNote('Kara'), 'The miller lied about the grain.');
    const saved = w.generate_savefile();
    assert.equal(saved.rpmod_worlds.runtime.working.adventureNotes.Kara, 'The miller lied about the grain.', 'saved with the story');
    W.commitToBase();
    assert.equal(saved.rpmod_worlds.runtime.base.adventureNotes, undefined, 'never part of the start state');
    assert.equal(W.adventureNote('Kara'), 'The miller lied about the grain.', 'Save as start keeps the live notes');
    W.resetToBase();
    assert.equal(W.adventureNote('Kara'), '', 'Back to start wipes them');
    assert.equal((await C.loadSheet('Kara')).notes, '', 'character notes untouched by the world');
});

test('combat: a weapon in the backpack is drawn as part of the attack (SRD), the combat view states the rule', async (t) => {
    const { h, w, W, C, doc } = await sheetHost(t);
    await w.__addEsoCharacter('Bram', { description: 'A fighter.' });
    await C.saveSheet('Bram', { className: 'Fighter', level: 1, abilities: { str: 16 }, attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3' }],
        inventory: [{ name: 'Longsword', qty: 1 }] });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Bram' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    C.cachedSheet('Bram'); await sleep(20);
    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    h.seedRandom([0.9]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior' }], zones: false });
    for (let i = 0; i < 3 && W.getCombat().order[W.getCombat().turnIndex].id !== '__player__'; i++) W.runAutoTurns();   // the goblin may go first
    w.KLITE_RPMod_Shell.open('combat'); await sleep(20);
    assert.match(doc.querySelector('[data-window="combat"] [data-cb="draw"]').textContent, /Longsword is in the backpack: it is drawn as part of this attack/);
    assert.match(doc.querySelector('[data-window="combat"]').textContent, /draw or stow one weapon as part of each attack/);
    const foe = W.getCombat().order.find(o => o.kind === 'monster').id;
    W.attack('__player__', foe, 0);
    assert.match(W.getCombat().log.join('\n'), /Bram draws the Longsword as part of the attack\./);
    assert.equal(C.cachedSheet('Bram').inventory[0].inHand, true, 'now in hand on the sheet');
    W.attack('__player__', foe, 0);
    assert.equal(W.getCombat().log.join('\n').match(/draws the Longsword/g).length, 1, 'drawn once');
});
