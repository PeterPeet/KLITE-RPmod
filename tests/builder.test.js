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
    assert.equal(B.nextLevelChoices(s3), null, 'builder covers levels 1–3');
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
