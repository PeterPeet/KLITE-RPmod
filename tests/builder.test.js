'use strict';
// Character builder rules (src/characters/builder-rules.js) against the SRD 5.2.1 rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const B = requireSrc('src/characters/builder-rules.js');
const { SRD } = requireSrc('src/data/srd52.js');
const S = requireSrc('src/characters/sheet.js');

const fighter = (over) => Object.assign({
    name: 'Kara', class: 'fighter', level: 1, background: 'soldier', species: 'human',
    method: 'standard', scores: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
    bgBonus: { plus2: 'str', plus1: 'con' }, classSkills: ['perception', 'survival'], speciesSkills: ['insight'],
    originFeat: 'Alert', fightingStyle: 'Defense', classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Neutral Good',
}, over || {});

test('SRD data: attribution, 12 classes, 4 backgrounds, 9 species, origin feats, weapons, armor', () => {
    assert.match(SRD.attribution, /^This work includes material from the System Reference Document 5\.2\.1 \("SRD 5\.2\.1"\) by Wizards of the Coast LLC/);
    assert.equal(Object.keys(SRD.classes).length, 12);
    assert.deepEqual(Object.keys(SRD.backgrounds), ['acolyte', 'criminal', 'sage', 'soldier']);
    assert.equal(Object.keys(SRD.species).length, 9);
    for (const f of ['Alert', 'Magic Initiate', 'Savage Attacker', 'Skilled', 'Archery', 'Defense', 'Great Weapon Fighting', 'Two-Weapon Fighting']) assert.ok(SRD.feats[f], f);
    for (const c of Object.values(SRD.classes)) {
        assert.ok(c.features.some(f => f.level === 1), c.name + ' has level 1 features');
        assert.ok(c.subclassFeatures.length >= 1, c.name + ' subclass features');
        for (const f of [...c.features, ...c.subclassFeatures]) for (const p of f.text) assert.doesNotMatch(p, /System Reference|=====PAGE/, c.name + '/' + f.name);
    }
    assert.equal(SRD.weapons.Greatsword.damage, '2d6'); assert.equal(SRD.armor['Chain Mail'].base, 16);
    assert.deepEqual(SRD.xp.slice(0, 3), [0, 300, 900]);
});

test('fighter (soldier, human): scores, AC with Defense, HP, attacks, skills, features', () => {
    assert.deepEqual(B.validate(fighter()), []);
    const s = B.buildSheet(fighter());
    assert.equal(s.abilities.str, 17); assert.equal(s.abilities.con, 14);
    assert.equal(s.ac, 17, 'Chain Mail 16 + Defense 1'); assert.equal(s.acNote, 'Chain Mail + Defense');
    assert.equal(s.hp.max, 12, 'd10 + CON 2');
    assert.deepEqual(s.saves, ['str', 'con']);
    for (const k of ['athletics', 'intimidation', 'perception', 'survival', 'insight']) assert.equal(s.skills[k], 1, k);
    const gs = s.attacks.find(a => a.name === 'Greatsword');
    assert.equal(gs.damage, '2d6+3'); assert.equal(gs.ability, 'str'); assert.equal(gs.proficient, true);
    assert.equal(S.derive(s).attacks.find(a => a.name === 'Greatsword').toHit, 5);
    assert.ok(s.inventory.some(i => i.name === 'Javelin' && i.qty === 8), '8 Javelins');
    assert.equal(s.coins.gp, 4 + 14);
    assert.match(s.features, /Second Wind \(Fighter 1\)/); assert.match(s.features, /Savage Attacker \(Soldier \(Origin feat\)\)/);
    assert.match(s.features, /Alert \(Human \(Versatile\)\)/); assert.match(s.features, /Defense \(Fighting Style\)/);
    assert.equal(s.build.class, 'fighter');

    const s3 = B.buildSheet(fighter({ level: 3 }));
    assert.equal(s3.hp.max, 12 + 2 * (6 + 2), 'fixed 6 + CON per level');
    assert.equal(s3.className, 'Fighter (Champion)'); assert.match(s3.features, /Improved Critical \(Champion 3\)/);
    assert.equal(s3.xp, 900);
    const up = B.nextLevelChoices(B.buildSheet(fighter({ level: 2 })));
    assert.equal(up.level, 3);
    assert.equal(B.nextLevelChoices(s3).level, 4, 'levels beyond 3');
    assert.equal(B.nextLevelChoices(B.buildSheet(fighter({ level: 20 }))), null, 'level 20 is the end');
});

test('unarmored AC, speed, HP and choices by class and species', () => {
    const barb = B.buildSheet(fighter({ class: 'barbarian', fightingStyle: undefined, classSkills: ['athletics', 'survival'], scores: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 }, bgBonus: { plus2: 'con', plus1: 'str' } }));
    assert.equal(barb.ac, 10 + 1 + 3, 'Unarmored Defense: 10 + DEX + CON'); assert.equal(barb.acNote, 'Unarmored Defense');
    assert.equal(barb.hp.max, 12 + 3);
    const monk = (lvl) => B.buildSheet(fighter({ class: 'monk', level: lvl, fightingStyle: undefined, classSkills: ['acrobatics', 'stealth'], scores: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 }, bgBonus: { plus2: 'dex', plus1: 'con' } }));
    assert.equal(monk(1).ac, 10 + 3 + 2, 'Unarmored Defense: 10 + DEX + WIS');
    assert.equal(monk(1).speed, 30); assert.equal(monk(2).speed, 40, 'Unarmored Movement at level 2');
    const dwarf = B.buildSheet(fighter({ species: 'dwarf', speciesSkills: [], originFeat: undefined, level: 2 }));
    assert.equal(dwarf.hp.max, 12 + 8 + 2, 'Dwarven Toughness +1 per level');
    assert.deepEqual(B.validate(fighter({ species: 'elf', speciesSkills: [] })).filter(e => /Keen Senses/.test(e)).length, 1);
    assert.equal(B.buildSheet(fighter({ species: 'elf', speciesSkills: ['perception'], speciesOption: 'Wood Elf' })).speed, 35);
});

test('rogue expertise, warlock pact magic, wizard spellcasting, point buy', () => {
    const rogue = fighter({ class: 'rogue', background: 'criminal', fightingStyle: undefined, bgBonus: { plus2: 'dex', plus1: 'int' }, classSkills: ['acrobatics', 'deception', 'perception', 'investigation'], expertise: ['stealth', 'perception'] });
    assert.deepEqual(B.validate(rogue), []);
    const r = B.buildSheet(rogue);
    assert.equal(r.skills.stealth, 2); assert.equal(r.skills.perception, 2);
    const rd = S.derive(r);
    assert.equal(rd.skills.stealth, 3 + 2 * 2, 'DEX 14 + 2 (background) = 16 → +3, expertise +4');
    assert.equal(r.attacks.find(a => a.name === 'Shortsword').ability, 'dex', 'finesse uses the better ability');
    assert.match(r.proficiencies, /Thieves' Cant/);

    const lock = B.buildSheet(fighter({ class: 'warlock', level: 3, fightingStyle: undefined, classSkills: ['arcana', 'deception'], scores: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 }, bgBonus: { plus2: 'dex', plus1: 'con' } }));
    assert.equal(lock.spellcasting.ability, 'cha'); assert.equal(lock.spellcasting.pact, true);
    assert.deepEqual(lock.spellcasting.slots, [0, 2]); assert.equal(lock.spellcasting.slotLevel, 2);
    const wiz = S.derive(B.buildSheet(fighter({ class: 'wizard', background: 'sage', fightingStyle: undefined, classSkills: ['arcana', 'investigation'], scores: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 }, bgBonus: { plus2: 'int', plus1: 'con' } })));
    assert.equal(wiz.spell.saveDC, 8 + 3 + 2); assert.equal(wiz.spell.attack, 5);
    assert.match(S.sheetSummary(wiz.sheet), /Spellcasting \(INT\): save DC 13, spell attack \+5, slots L1×2/);

    assert.equal(B.pointBuyCost({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
    assert.deepEqual(B.validate(fighter({ method: 'pointbuy', scores: { str: 15, dex: 15, con: 15, int: 10, wis: 8, cha: 8 } })).filter(e => /Point buy/.test(e)), ['Point buy: 29 of 27 points spent.']);
    assert.ok(B.validate(fighter({ scores: { str: 15, dex: 15, con: 13, int: 8, wis: 10, cha: 12 } })).some(e => /standard array/.test(e)));
    assert.deepEqual(B.parseItem('4 Handaxes'), { name: 'Handaxe', qty: 4 });
    assert.deepEqual(B.parseItem('20 Arrows'), { name: 'Arrow', qty: 20 });
    assert.deepEqual(B.parseItem('2 Pouches'), { name: 'Pouch', qty: 2 });
});

// ---- the builder window, driven like a player (bundle + fake Esolite Library) ----------
const { createHost, click, sleep } = require('./helpers/host');
test('builder window: create a level-1 fighter end to end, then level up keeping inventory', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const doc = w.document;
    const $ = (s) => doc.querySelector('[data-window="builder"] ' + s);
    const pick = (id) => click($(`[data-pick="${id}"]`), w);
    const next = () => click($('[data-bld="next"]'), w);
    const choose = (label, value) => { const s = $(`select[aria-label="${label}"]`); s.value = value; s.dispatchEvent(new w.Event('change')); };
    const check = (id, group) => { const c = $(`${group ? `[aria-label="${group}"] ` : ''}input[data-check="${id}"]`); c.checked = true; c.dispatchEvent(new w.Event('change')); };

    click(doc.querySelector('[data-gal-action="new"]') || doc.body, w);   // gallery not open: use the API
    w.KLITE_RPMod_Builder.open(); await sleep(20);
    assert.ok(doc.querySelector('[data-window="builder"]'), 'builder window');
    assert.match(doc.querySelector('[data-window="builder"]').textContent, /This work includes material from the System Reference Document 5\.2\.1/, 'attribution shown');

    pick('fighter'); assert.match($('.rpm-bld-detail').textContent, /Second Wind/); next();
    pick('soldier'); assert.match($('.rpm-bld-detail').textContent, /Savage Attacker/); next();
    pick('human'); choose('Origin feat', 'Alert'); next();
    click($('[data-bld="suggest"]'), w);
    choose('+2 ability', 'str'); choose('+1 ability', 'con'); next();
    check('perception', 'Class skills'); check('survival', 'Class skills'); check('insight', 'Species skill');   // class ×2, Skillful ×1
    pick('Defense'); check('Elvish'); check('Dwarvish'); next();
    next();                                                             // equipment: defaults A/A
    const name = $('input[aria-label="Character name"]'); name.value = 'Kara'; name.dispatchEvent(new w.Event('change'));
    assert.equal($('.rpm-bld-errors') && $('.rpm-bld-errors').textContent, null, 'no open choices');
    assert.match($('.rpm-bld-detail').textContent, /HP 12 · AC 17 \(Chain Mail \+ Defense\)/);
    click($('[data-bld="create"]'), w); await sleep(80);

    assert.ok(w.__lib().some(m => m.name === 'Kara'), 'new Library character');
    const rec = JSON.parse(await w.indexeddb_load('character_Kara', 'null'));
    const sheet = rec.data.extensions.klite_rpmod.sheet;
    assert.equal(sheet.className, 'Fighter'); assert.equal(sheet.ac, 17); assert.equal(sheet.build.class, 'fighter');
    assert.deepEqual(JSON.parse(JSON.stringify(rec.data.tags)), ['RPmod', 'Fighter', 'Human']);
    assert.equal(doc.querySelector('[data-window="builder"]'), null, 'builder closed');
    assert.ok(doc.querySelector('[data-window="sheet"]'), 'sheet opened');

    // the player changes the sheet, then levels up: inventory, coins and notes stay
    await w.KLITE_RPMod_Characters.saveSheet('Kara', Object.assign({}, sheet, { inventory: [{ name: 'Lucky coin', qty: 1 }], notes: 'Owes Bram 5 gp.' }));
    assert.equal(await w.KLITE_RPMod_Builder.levelUp('Kara'), true); await sleep(20);
    assert.match(doc.querySelector('[data-window="builder"]').textContent, /Level up: Kara → level 2/);
    click($('[data-step="review"]'), w);
    click($('[data-bld="create"]'), w); await sleep(80);
    const up = JSON.parse(await w.indexeddb_load('character_Kara', 'null')).data.extensions.klite_rpmod.sheet;
    assert.equal(up.level, 2); assert.equal(up.hp.max, 12 + 6 + 2); assert.equal(up.xp, 300);
    assert.match(up.features, /Action Surge \(Fighter 2\)/);
    assert.deepEqual(JSON.parse(JSON.stringify(up.inventory)), [{ name: 'Lucky coin', qty: 1, notes: '' }]);
    assert.equal(up.notes, 'Owes Bram 5 gp.');
});

// ---- levels 4–20 ---------------------------------------------------------------------------
test('SRD data 1–20: class tables, spell slots, subclass feature levels, epic boons', () => {
    const C = SRD.classes;
    assert.deepEqual(C.wizard.spellcasting.levels[20], { cantrips: 5, prepared: 25, slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] });
    assert.deepEqual(C.warlock.spellcasting.levels[17], { cantrips: 4, prepared: 14, slots: [0, 0, 0, 0, 4], slotLevel: 5 });
    assert.deepEqual(C.paladin.spellcasting.levels[5].slots, [4, 2]);
    assert.deepEqual(C.monk.columns[18], { martialArts: '1d12', focusPoints: 18, unarmoredMovement: 30 });
    assert.equal(C.rogue.columns[19].sneakAttack, '10d6');
    assert.deepEqual(C.fighter.levels[6], ['Ability Score Improvement']);
    assert.deepEqual(C.fighter.subclassFeatures.map(f => f.level), [3, 3, 7, 10, 15, 18]);
    for (const c of Object.values(C)) { assert.equal(Object.keys(c.levels).length, 20, c.name); assert.ok(c.levels[19].includes('Epic Boon'), c.name); }
    assert.deepEqual(plain(SRD.feats['Boon of Spell Recall'].increase), { choose: ['int', 'wis', 'cha'], by: 1, max: 30 });
    assert.deepEqual(plain(SRD.feats.Grappler.increase), { choose: ['str', 'dex'], by: 1, max: 20 });
    assert.equal(B.EPIC_BOONS.length, 7);
});
const plain = (x) => JSON.parse(JSON.stringify(x));

test('levels 4+: feats at ASI levels (ability increases, caps, prerequisites, Skilled, fighting styles)', () => {
    const f4 = fighter({ level: 4 });
    assert.deepEqual(plain(B.featLevels(f4)), [{ level: 4, kind: 'asi' }]);
    assert.ok(B.validate(f4).some(e => /Level 4 .*choose a feat/.test(e)));
    const plus2 = fighter({ level: 4, asi: { 4: { feat: 'Ability Score Improvement', abilities: ['str', 'str'] } } });
    assert.deepEqual(B.validate(plus2), []);
    assert.equal(B.buildSheet(plus2).abilities.str, 19, '17 + 2');
    assert.match(B.buildSheet(plus2).features, /Ability Score Improvement \(STR, STR\) \(Fighter 4 feat\)/);
    const split = B.buildSheet(fighter({ level: 4, asi: { 4: { feat: 'Ability Score Improvement', abilities: ['str', 'con'] } } }));
    assert.equal(split.abilities.str, 18); assert.equal(split.abilities.con, 15);
    // fighters get more ASIs (4, 6, 8, 12, 14, 16); 19 is an Epic Boon
    assert.deepEqual(plain(B.featLevels(fighter({ level: 19 })).map(x => x.level + x.kind)), ['4asi', '6asi', '8asi', '12asi', '14asi', '16asi', '19boon']);
    // over 20 is refused
    const over = fighter({ level: 6, asi: { 4: { feat: 'Ability Score Improvement', abilities: ['str', 'str'] }, 6: { feat: 'Ability Score Improvement', abilities: ['str', 'str'] } } });
    assert.ok(B.validate(over).some(e => /STR is already at its maximum/.test(e)));
    assert.equal(B.buildSheet(over).abilities.str, 20);
    // Grappler needs STR or DEX 13; Alert is already the human's origin feat
    const weak = fighter({ level: 4, scores: { str: 8, dex: 10, con: 15, int: 14, wis: 13, cha: 12 }, method: 'roll', bgBonus: { plus2: 'con', plus1: 'str' }, asi: { 4: { feat: 'Grappler', abilities: ['str'] } } });
    assert.ok(B.validate(weak).some(e => /Grappler needs Strength or Dexterity 13/.test(e)));
    assert.ok(B.validate(fighter({ level: 4, asi: { 4: { feat: 'Alert' } } })).some(e => /already have Alert/.test(e)));
    // Skilled adds three proficiencies
    const skilled = fighter({ level: 4, asi: { 4: { feat: 'Skilled', skills: ['stealth', 'arcana', 'history'] } } });
    assert.deepEqual(B.validate(skilled), []);
    assert.equal(B.buildSheet(skilled).skills.arcana, 1);
    // a Fighting Style feat as ASI: Archery adds +2 to ranged attacks; Champion 7 needs a second style
    const archer = fighter({ level: 7, fightingStyle2: 'Two-Weapon Fighting', asi: { 4: { feat: 'Archery' }, 6: { feat: 'Ability Score Improvement', abilities: ['dex', 'con'] } } });
    assert.deepEqual(B.validate(archer), []);
    const bowman = B.buildSheet(Object.assign({}, archer, { classEquipment: 'B' }));
    assert.equal(bowman.attacks.find(a => a.name === 'Longbow').bonus, 2, 'Archery: +2 to ranged');
    assert.equal(bowman.attacks.find(a => a.name === 'Scimitar').bonus, 0);
    assert.ok(B.validate(fighter({ level: 7, asi: archer.asi })).some(e => /second, different Fighting Style/.test(e)));
    assert.ok(B.validate(fighter({ level: 4, asi: { 4: { feat: 'Defense' } } })).some(e => /only once/.test(e)), 'Defense is already the class style');
});

test('levels 5–20: epic boons, capstones, saves, speed, HP, spell slots, expertise; level up keeps spells', () => {
    const asi = (lvls, ab) => Object.fromEntries(lvls.map(l => [l, { feat: 'Ability Score Improvement', abilities: ab }]));
    // Boon at 19: +1 up to 30; Boon of Spell Recall needs Spellcasting
    const f19 = fighter({ level: 19, fightingStyle2: 'Archery', asi: Object.assign(asi([4, 6, 8], ['str', 'con']), asi([12, 14, 16], ['con', 'dex']), { 19: { feat: 'Boon of Fate', abilities: ['str'] } }) });
    assert.deepEqual(B.validate(f19), []);
    assert.equal(B.buildSheet(f19).abilities.str, 21, 'boon goes past 20');
    assert.ok(B.validate(Object.assign({}, f19, { asi: Object.assign({}, f19.asi, { 19: { feat: 'Boon of Spell Recall', abilities: ['int'] } }) })).some(e => /needs the Spellcasting feature/.test(e)));
    // Barbarian 20: STR and CON +4 (max 25); Fast Movement +10 ft (no heavy armor)
    const barb = B.buildSheet(fighter({ class: 'barbarian', level: 20, fightingStyle: undefined, classSkills: ['perception', 'survival'] }));
    assert.equal(barb.abilities.str, 21); assert.equal(barb.abilities.con, 18);
    assert.equal(barb.speed, 40);
    assert.match(barb.features, /^Barbarian 20: Rages 6 · Rage Damage \+4 · Weapon Mastery 4/);
    // Monk: unarmored movement from the table, all saves at 14
    const monk = B.buildSheet(fighter({ class: 'monk', level: 14, fightingStyle: undefined, classSkills: ['acrobatics', 'stealth'] }));
    assert.equal(monk.speed, 30 + 25); assert.deepEqual(plain(monk.saves), ['str', 'dex', 'con', 'int', 'wis', 'cha']);
    // Rogue 15: Slippery Mind; 4 expertise picks from level 6
    const rogueC = { class: 'rogue', background: 'criminal', fightingStyle: undefined, bgBonus: { plus2: 'dex', plus1: 'int' }, classSkills: ['acrobatics', 'deception', 'perception', 'investigation'], expertise: ['stealth', 'perception'] };
    assert.ok(B.validate(fighter(Object.assign({ level: 6, asi: asi([4], ['dex', 'dex']) }, rogueC))).some(e => /Choose 4 skills for Expertise/.test(e)));
    assert.deepEqual(plain(B.buildSheet(fighter(Object.assign({ level: 15 }, rogueC))).saves), ['dex', 'int', 'wis', 'cha']);
    // Sorcerer: Draconic Resilience adds 3 HP at level 3 and 1 per level after
    const sorc = (level) => B.buildSheet(fighter({ class: 'sorcerer', level, fightingStyle: undefined, classSkills: ['arcana', 'insight'], scores: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 }, bgBonus: { plus2: 'cha', plus1: 'con' } })).hp.max;
    assert.equal(sorc(3) - sorc(2), 4 + 2 + 3, 'd6 fixed 4 + CON 2 + Draconic Resilience 3');
    assert.equal(sorc(4) - sorc(3), 4 + 2 + 1);
    // Wizard 20 slots on the sheet; level up keeps the spells written on the sheet
    const wizC = fighter({ class: 'wizard', background: 'sage', fightingStyle: undefined, classSkills: ['arcana', 'investigation'], scores: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 }, bgBonus: { plus2: 'int', plus1: 'con' } });
    const w3 = B.buildSheet(Object.assign({}, wizC, { level: 3 }));
    w3.spellcasting.spells = 'Fire Bolt, Magic Missile, Shield'; w3.spellcasting.used = [3, 1];
    const w4 = B.buildSheet(Object.assign(B.nextLevelChoices(w3), { asi: asi([4], ['int', 'int']) }), w3);
    assert.equal(w4.spellcasting.spells, 'Fire Bolt, Magic Missile, Shield', 'spells kept');
    assert.deepEqual(plain(w4.spellcasting.used), [3, 1]);
    assert.equal(w4.abilities.int, 19);
    assert.deepEqual(plain(B.buildSheet(Object.assign({}, wizC, { level: 20 })).spellcasting.slots), [4, 3, 3, 3, 3, 2, 2, 1, 1]);
});

test('builder window: level up a level-3 fighter to 4 with an Ability Score Improvement', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const doc = w.document;
    const $ = (s) => doc.querySelector('[data-window="builder"] ' + s);
    const choose = (label, value) => { const s = $(`select[aria-label="${label}"]`); s.value = value; s.dispatchEvent(new w.Event('change')); };
    const s3 = B.buildSheet(fighter({ level: 3 }));
    await w.__addEsoCharacter('Kara', { description: 'x' });
    await w.KLITE_RPMod_Characters.saveSheet('Kara', s3);
    assert.equal(await w.KLITE_RPMod_Builder.levelUp('Kara'), true); await sleep(20);
    assert.deepEqual([...doc.querySelectorAll('[data-window="builder"] [data-step]')].map(b => b.getAttribute('data-step')), ['class', 'feats', 'skills', 'review']);
    click($('[data-step="feats"]'), w);
    assert.ok($('[data-feat-level="4"]'), 'only the new feat level');
    choose('Level 4 feat', 'Ability Score Improvement');
    choose('Level 4 increase 1', 'str'); choose('Level 4 increase 2', 'con');
    click($('[data-step="review"]'), w);
    assert.equal($('.rpm-bld-errors'), null, 'nothing missing');
    click($('[data-bld="create"]'), w); await sleep(80);
    const up = JSON.parse(await w.indexeddb_load('character_Kara', 'null')).data.extensions.klite_rpmod.sheet;
    assert.equal(up.level, 4); assert.equal(up.abilities.str, 18); assert.equal(up.abilities.con, 15);
    assert.equal(up.build.asi[4].feat, 'Ability Score Improvement');
});

// ---- the small rules that close R2 ---------------------------------------------------------
test('Alert, Jack of All Trades, Divine Order / Primal Order: numbers on the sheet and in combat', () => {
    const d = (c) => S.derive(B.buildSheet(c));
    // Alert: human origin feat → initiative = DEX + PB (also in the combat stat block)
    const alert = d(fighter());   // fighter(): human with originFeat 'Alert', DEX 14 → +2, PB +2
    assert.equal(alert.initiative, 4);
    assert.equal(S.toCombatStats(B.buildSheet(fighter())).initiativeMod, 4);
    assert.equal(d(fighter({ originFeat: 'Skilled', extraSkills: ['arcana', 'history', 'nature'] })).initiative, 2, 'without Alert');
    assert.equal(d(fighter({ background: 'criminal', originFeat: 'Skilled', extraSkills: ['arcana', 'history', 'nature'], bgBonus: { plus2: 'dex', plus1: 'con' } })).sheet.extras.alert, true, 'Criminal background gives Alert');
    // Jack of All Trades: bard 2+, half PB on skills without proficiency (passive Perception too)
    const bardC = (level) => fighter({ class: 'bard', level, fightingStyle: undefined, classSkills: ['performance', 'persuasion', 'deception'], scores: { str: 8, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }, bgBonus: { plus2: 'cha', plus1: 'dex' } });
    const b1 = d(bardC(1)), b2 = d(bardC(2)), b5 = d(bardC(5));
    assert.equal(b2.skills.nature - b1.skills.nature, 1, 'half of PB 2 (Nature: no proficiency)');
    assert.equal(b2.skills.performance, b1.skills.performance, 'proficient skills unchanged');
    assert.equal(b5.skills.nature, 0 + 1, 'INT 10 (0) + half of PB 3 (1)');
    assert.equal(b2.skills.athletics, b1.skills.athletics, 'Athletics is proficient (Soldier): no Jack of All Trades');
    assert.equal(b2.passivePerception - b1.passivePerception, 1);
    // Divine Order: required at cleric 1; Thaumaturge = +1 cantrip and WIS on Arcana/Religion
    const cleric = (over) => fighter(Object.assign({ class: 'cleric', fightingStyle: undefined, classSkills: ['medicine', 'religion'], scores: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, bgBonus: { plus2: 'wis', plus1: 'con' } }, over));
    assert.match(B.validate(cleric()).join(), /Choose your Divine Order \(Protector or Thaumaturge\)/);
    assert.deepEqual(B.validate(cleric({ divineOrder: 'thaumaturge' })), []);
    const th = d(cleric({ divineOrder: 'thaumaturge' })), plainC = d(cleric({ divineOrder: 'protector' }));
    assert.equal(th.skills.arcana - plainC.skills.arcana, 2, 'WIS 15 → +2 (the Soldier background cannot raise WIS)');
    assert.equal(th.skills.nature, plainC.skills.nature, 'Nature is not part of it');
    assert.equal(th.sheet.spellcasting.cantrips, 4, 'one extra cantrip (3 + 1)');
    assert.match(th.sheet.features, /Divine Order: Thaumaturge \(Cleric 1\)/);
    // Protector: martial weapons proficient, heavy armor training in the proficiencies
    const prot = B.buildSheet(cleric({ divineOrder: 'protector' }));
    assert.match(prot.proficiencies, /Martial weapons \(Protector\)/); assert.match(prot.proficiencies, /Heavy armor \(Protector\)/);
    // Primal Order: Warden → martial weapons + medium armor; Magician → extra cantrip, WIS on Arcana/Nature (min +1)
    const druid = (over) => fighter(Object.assign({ class: 'druid', fightingStyle: undefined, classSkills: ['nature', 'survival'], scores: { str: 10, dex: 13, con: 14, int: 12, wis: 8, cha: 15 }, bgBonus: { plus2: 'con', plus1: 'str' } }, over));
    const mag = d(druid({ primalOrder: 'magician' })), war = B.buildSheet(druid({ primalOrder: 'warden' }));
    assert.equal(mag.skills.arcana - S.derive(war).skills.arcana, 1, 'WIS 8 (−1) → minimum +1');
    assert.equal(mag.sheet.spellcasting.cantrips, 3);
    assert.match(war.proficiencies, /Martial weapons \(Warden\)/); assert.match(war.proficiencies, /Medium armor \(Warden\)/);
    // an old cleric sheet built before the choice existed: level up asks for it
    const old = B.buildSheet(cleric({ divineOrder: 'protector' })); delete old.build.divineOrder;
    assert.match(B.validate(B.nextLevelChoices(old)).join(), /Divine Order/);
    // hand-made sheets without extras behave as before
    assert.equal(S.derive({ abilities: { dex: 14 } }).initiative, 2);
});

test('builder window: Divine Order is chosen with the skills (SRD text on the cards)', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const doc = w.document;
    const $ = (s) => doc.querySelector('[data-window="builder"] ' + s);
    w.KLITE_RPMod_Builder.open(); await sleep(20);
    click($('[data-pick="cleric"]'), w);
    click($('[data-step="skills"]'), w);
    const box = $('[data-order="divineOrder"]');
    assert.ok(box, 'Divine Order shown');
    assert.match(box.querySelector('[data-pick="protector"]').textContent, /Trained for battle, you gain proficiency with Martial weapons/);
    click(box.querySelector('[data-pick="thaumaturge"]'), w);
    assert.equal(w.KLITE_RPMod_Builder._state.c.divineOrder, 'thaumaturge');
    assert.equal($('[data-order="divineOrder"] [data-pick="thaumaturge"]').getAttribute('aria-pressed'), 'true');
});
