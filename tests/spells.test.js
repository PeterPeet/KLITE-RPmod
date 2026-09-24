'use strict';
// R2 spells: SRD 5.2.1 spell data (src/data/srd52-spells.js), the spell rules (limits, spells that
// come without choosing, Magic Initiate, checks, cantrip scaling, slots), the sheet model (additive
// fields, migration), the builder's Spells step and the sheet's spell list (cast, free casts,
// restore, change spells), driven like a player.
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
const D = requireSrc('src/data/srd52-spells.js');
const SP = requireSrc('src/characters/spell-rules.js');
const B = requireSrc('src/characters/builder-rules.js');
const S = requireSrc('src/characters/sheet.js');
const plain = (v) => JSON.parse(JSON.stringify(v));
const base = (over) => Object.assign({
    name: 'Mira', class: 'wizard', level: 1, background: 'sage', species: 'human', method: 'standard',
    scores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, bgBonus: { plus2: 'int', plus1: 'con' },
    classSkills: ['arcana', 'investigation'], speciesSkills: ['insight'], originFeat: 'Alert', classEquipment: 'A', backgroundEquipment: 'A',
}, over || {});

test('spell data: 339 SRD spells with lists, fields, stat blocks and grants', () => {
    const all = Object.values(D.SPELLS);
    assert.equal(all.length, 339);
    const fb = D.SPELLS['fire-bolt'];
    assert.deepEqual(plain({ level: fb.level, school: fb.school, classes: fb.classes, range: fb.range, attack: fb.attack, damage: fb.damage, damageType: fb.damageType }),
        { level: 0, school: 'Evocation', classes: ['sorcerer', 'wizard'], range: '120 feet', attack: 'ranged', damage: '1d10', damageType: 'Fire' });
    assert.equal(D.SPELLS.fireball.higher, 'The damage increases by 1d6 for each spell slot level above 3.', 'no stat block glued on');
    assert.equal(D.SPELLS['find-steed'].statBlock.name, 'Otherworldly Steed');
    assert.equal(D.SPELLS['acid-splash'].name, 'Acid Splash', 'small-caps name repaired');
    assert.equal(D.SPELLS.barkskin.material, 'a handful of bark', 'SRD typo "Component:" read');
    assert.equal(D.SPELLS['cure-wounds'].heal, '2d8+mod'); assert.equal(D.SPELLS['prayer-of-healing'].heal, '2d8'); assert.equal(D.SPELLS.regenerate.heal, '4d8+15');
    assert.ok(D.SPELLS['detect-magic'].ritual && D.SPELLS['detect-magic'].concentration);
    for (const s of all) { assert.ok(s.classes.length && s.text.length && s.castingTime && s.duration, s.name); for (const c of s.classes) assert.ok(['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'].includes(c), s.name); }
    assert.equal(SP.classSpells('paladin', { maxLevel: 0 }).length, 0);
    assert.equal(SP.classSpells('wizard', { maxLevel: 0 }).length, 15);
    // grants reference real spells
    const walk = (v) => Array.isArray(v) ? v.forEach(k => assert.ok(D.SPELLS[k], k)) : Object.values(v).forEach(walk);
    walk(D.SPELL_GRANTS);
});

test('limits: cantrips, prepared, spellbook, highest spell level (pact magic), non-casters', () => {
    const lim = (cls, level) => plain(SP.spellLimits(B.spellContext(base({ class: cls, level }))));
    assert.deepEqual(lim('wizard', 1), { caster: true, ability: 'int', cantrips: 3, prepared: 4, maxLevel: 1, spellbook: 6 });
    assert.deepEqual(lim('wizard', 5), { caster: true, ability: 'int', cantrips: 4, prepared: 9, maxLevel: 3, spellbook: 14 });
    assert.equal(lim('warlock', 3).maxLevel, 2); assert.equal(lim('warlock', 17).maxLevel, 5);
    assert.deepEqual(lim('paladin', 1), { caster: true, ability: 'cha', cantrips: 0, prepared: 2, maxLevel: 1, spellbook: 0 });
    assert.equal(lim('fighter', 5).caster, false);
});

test('spells without choosing: species by character level, subclass by class level, land type, Magic Initiate', () => {
    const g = (over) => plain(SP.grantedSpells(B.spellContext(base(over))));
    assert.deepEqual(g({ class: 'fighter', species: 'elf', speciesOption: 'Drow', speciesSkills: ['perception'] }).map(x => x.key), ['dancing-lights']);
    const drow5 = g({ class: 'fighter', level: 5, species: 'elf', speciesOption: 'Drow', speciesSkills: ['perception'], speciesSpellAbility: 'cha' });
    assert.deepEqual(drow5.map(x => [x.key, x.ability, x.free || null]), [['dancing-lights', 'cha', null], ['faerie-fire', 'cha', 'long'], ['darkness', 'cha', 'long']]);
    assert.deepEqual(g({ class: 'rogue', level: 3, species: 'tiefling', speciesOption: 'Infernal' }).map(x => x.key), ['thaumaturgy', 'fire-bolt', 'hellish-rebuke']);
    assert.deepEqual(g({ class: 'fighter', species: 'gnome', speciesOption: 'Forest Gnome' }).map(x => [x.key, x.free || null]), [['minor-illusion', null], ['speak-with-animals', 'pb']]);
    assert.deepEqual(g({ class: 'cleric', level: 5, background: 'soldier' }).map(x => x.key), ['aid', 'bless', 'cure-wounds', 'lesser-restoration', 'mass-healing-word', 'revivify']);
    assert.deepEqual(g({ class: 'druid', level: 3, background: 'soldier' }), [], 'land type not chosen yet');
    assert.deepEqual(g({ class: 'druid', level: 3, background: 'soldier', landType: 'polar' }).map(x => x.key), ['fog-cloud', 'hold-person', 'ray-of-frost']);
    // Magic Initiate: Sage → Wizard list (fixed), human origin feat → a chosen list
    const mi = g({ class: 'fighter', magicInitiate: { background: { ability: 'int', cantrips: ['fire-bolt', 'light'], spell: 'magic-missile' } } });
    assert.deepEqual(mi.map(x => [x.key, x.source, x.free || null]), [['fire-bolt', 'Magic Initiate (Wizard)', null], ['light', 'Magic Initiate (Wizard)', null], ['magic-missile', 'Magic Initiate (Wizard)', 'long']]);
    const two = B.spellContext(base({ class: 'fighter', background: 'acolyte', originFeat: 'Magic Initiate',
        magicInitiate: { background: { cantrips: ['guidance', 'light'], spell: 'bless' }, origin: { list: 'druid', cantrips: ['druidcraft', 'shillelagh'], spell: 'goodberry' } } }));
    assert.equal(SP.grantedSpells(two).length, 6);
    assert.deepEqual(SP.spellErrors(two), []);
});

test('checks: too many / not on the list / too high block; missing choices only remind', () => {
    const errs = (over) => SP.spellErrors(B.spellContext(base(over)));
    assert.deepEqual(errs({ spells: { cantrips: ['fire-bolt'], spellbook: ['magic-missile'], prepared: ['magic-missile'] } }), []);
    assert.match(errs({ spells: { cantrips: ['fire-bolt', 'light', 'mage-hand', 'message'] } }).join(), /Too many cantrips: 4 of 3/);
    assert.match(errs({ spells: { cantrips: ['sacred-flame'] } }).join(), /Sacred Flame is not a wizard cantrip/);
    assert.match(errs({ spells: { spellbook: ['fireball'] } }).join(), /Fireball is not a wizard spell of level 1–1/);
    assert.match(errs({ spells: { spellbook: ['shield'], prepared: ['magic-missile'] } }).join(), /Magic Missile must be in the spellbook/);
    assert.match(errs({ class: 'cleric', level: 3, background: 'soldier', spells: { prepared: ['bless'] } }).join(), /Bless is always prepared already/);
    assert.match(SP.spellErrors(B.spellContext(base({ class: 'fighter', originFeat: 'Magic Initiate', magicInitiate: { origin: { list: 'wizard' } } }))).join(), /different spell list each time/);
    assert.match(B.validate(base({ spells: { cantrips: ['sacred-flame'] } })).join(), /not a wizard cantrip/, 'validate blocks invalid spells');
    assert.ok(!B.validate(base()).some(e => /spell|cantrip/i.test(e)), 'no spells chosen does not block');
    assert.deepEqual(plain(SP.spellTodo(B.spellContext(base()))), ['3 cantrips to choose', '6 spellbook spells to choose', '4 spells to prepare',
        'Magic Initiate (Background): choose 2 cantrips and a level 1 spell']);
});

test('in play: cantrip scaling, slot choice (incl. pact slots), casting numbers', () => {
    const fb = D.SPELLS['fire-bolt'];
    assert.equal(SP.cantripDamage(fb, 1), '1d10'); assert.equal(SP.cantripDamage(fb, 5), '2d10'); assert.equal(SP.cantripDamage(fb, 17), '4d10');
    assert.equal(SP.cantripDamage(D.SPELLS['magic-missile'], 9), '1d4+1', 'leveled spells unchanged');
    assert.equal(SP.slotFor(1, [2, 1], [2, 0]), 2, 'level 1 spell uses a level 2 slot when level 1 is spent');
    assert.equal(SP.slotFor(1, [2, 1], [2, 1]), 0);
    assert.equal(SP.slotFor(1, [0, 2], [0, 1]), 2, 'warlock pact slots');
    assert.deepEqual(plain(SP.castingNumbers({ int: 16 }, 'int', 2)), { dc: 13, attack: 5 });
});

test('sheet: chosen and granted spells on the sheet, level up keeps them, old sheets load, AI summary', () => {
    const c = base({ spells: { cantrips: ['fire-bolt', 'mage-hand'], spellbook: ['magic-missile', 'shield', 'sleep'], prepared: ['magic-missile', 'shield'] },
        magicInitiate: { background: { cantrips: ['light', 'message'], spell: 'find-familiar' } } });
    const s = B.buildSheet(c);
    assert.deepEqual(plain(s.spellcasting.cantripsKnown), ['fire-bolt', 'mage-hand']);
    assert.deepEqual(plain(s.spellcasting.preparedSpells), ['magic-missile', 'shield']);
    assert.deepEqual(plain(s.spellcasting.granted.map(g => g.key)), ['light', 'message', 'find-familiar']);
    const up = B.buildSheet(B.nextLevelChoices(s), Object.assign({}, s, { spellcasting: Object.assign({}, s.spellcasting, { used: [1], spells: 'Scroll of Fly' }) }));
    assert.equal(up.level, 2); assert.deepEqual(plain(up.spellcasting.preparedSpells), ['magic-missile', 'shield'], 'level up keeps the spells');
    assert.equal(up.spellcasting.spells, 'Scroll of Fly'); assert.deepEqual(plain(up.spellcasting.used), [1]);
    // a fighter drow gets a spellcasting block for the species spells
    const f = B.buildSheet(base({ class: 'fighter', level: 3, species: 'elf', speciesOption: 'Drow', speciesSkills: ['perception'], speciesSpellAbility: 'wis', background: 'soldier', classSkills: ['athletics', 'survival'], fightingStyle: 'Defense' }));
    assert.equal(f.spellcasting.ability, 'wis'); assert.deepEqual(plain(f.spellcasting.granted.map(g => g.key)), ['dancing-lights', 'faerie-fire']);
    // an old builder sheet (before spells) loads with empty lists; its notes stay
    const old = S.normalizeSheet({ level: 1, spellcasting: { ability: 'int', cantrips: 3, prepared: 4, slots: [2], spells: 'Fire Bolt, Shield' } });
    assert.deepEqual(plain([old.spellcasting.cantripsKnown, old.spellcasting.preparedSpells, old.spellcasting.granted]), [[], [], []]);
    assert.equal(old.spellcasting.spells, 'Fire Bolt, Shield');
    // unknown spellcasting fields survive (a newer RPmod may add some)
    assert.equal(S.normalizeSheet({ spellcasting: { ability: 'int', futureField: { a: 1 } } }).spellcasting.futureField.a, 1);
    assert.match(S.sheetSummary(s), /Spells: cantrips Fire Bolt, Mage Hand; prepared Magic Missile, Shield; always prepared Light, Message, Find Familiar/);
});

// ---- the builder and the sheet, driven like a player ---------------------------------------------
test('builder Spells step + sheet: choose spells, cast (slot + log), free cast, restore, change spells, level up', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const doc = w.document;
    const $ = (s) => doc.querySelector('[data-window="builder"] ' + s);
    const pick = (id) => click($(`[data-pick="${id}"]`), w);
    const choose = (label, value) => { const s = $(`select[aria-label="${label}"]`); s.value = value; s.dispatchEvent(new w.Event('change')); };
    const check = (sel) => { const c = $(sel); c.checked = true; c.dispatchEvent(new w.Event('change')); };
    w.KLITE_RPMod_Builder.open(); await sleep(20);
    pick('wizard'); click($('[data-bld="next"]'), w);
    pick('sage'); click($('[data-bld="next"]'), w);
    pick('elf'); choose('Elven lineage', 'High Elf'); click($('[data-bld="next"]'), w);
    click($('[data-bld="suggest"]'), w); choose('+2 ability', 'int'); choose('+1 ability', 'con'); click($('[data-bld="next"]'), w);
    check('[aria-label="Class skills"] input[data-check="investigation"]'); check('[aria-label="Class skills"] input[data-check="medicine"]');
    check('[aria-label="Species skill"] input[data-check="perception"]'); check('input[data-check="Elvish"]'); check('input[data-check="Dwarvish"]');
    click($('[data-bld="next"]'), w);
    // Spells step
    assert.ok($('[data-step="spells"]').getAttribute('aria-current'), 'on the Spells step');
    assert.match($('[data-spells="granted"]').textContent, /Prestidigitation — Transmutation cantrip · High Elf/);
    assert.ok(!$('[data-picker="Cantrips"] input[data-spell="prestidigitation"]'), 'a granted cantrip is not offered again');
    for (const k of ['fire-bolt', 'mage-hand', 'light']) check(`[data-picker="Cantrips"] input[data-spell="${k}"]`);
    assert.ok($('[data-picker="Cantrips"] input[data-spell="message"]').disabled, 'limit reached: the rest is disabled');
    for (const k of ['magic-missile', 'shield', 'sleep', 'mage-armor', 'detect-magic', 'burning-hands']) check(`[data-picker="Spellbook"] input[data-spell="${k}"]`);
    for (const k of ['magic-missile', 'shield', 'sleep', 'mage-armor']) check(`[data-picker="Prepared spells"] input[data-spell="${k}"]`);
    // Magic Initiate (Wizard) from the Sage background
    for (const k of ['message', 'minor-illusion']) check(`[data-picker="Magic Initiate background cantrips"] input[data-spell="${k}"]`);
    check('[data-picker="Magic Initiate background spell"] input[data-spell="find-familiar"]');
    click($('[data-step="review"]'), w);
    const nm = $('input[aria-label="Character name"]'); nm.value = 'Mira'; nm.dispatchEvent(new w.Event('change'));
    assert.equal($('[data-spell-todo]'), null, 'nothing left open');
    assert.match($('.rpm-bld-detail').textContent, /Spells: Fire Bolt, Mage Hand, Light, Magic Missile, Shield, Sleep, Mage Armor, Prestidigitation/);
    click($('[data-bld="create"]'), w); await sleep(100);
    const rec = JSON.parse(await w.indexeddb_load('character_Mira', 'null'));
    const sc = rec.data.extensions.klite_rpmod.sheet.spellcasting;
    assert.deepEqual(plain(sc.spellbook), ['magic-missile', 'shield', 'sleep', 'mage-armor', 'detect-magic', 'burning-hands']);
    assert.deepEqual(plain(sc.granted.map(g => g.key)), ['prestidigitation', 'message', 'minor-illusion', 'find-familiar']);

    // the sheet: spells listed, Cast uses a slot and logs, the free cast, restore
    const sh = (s) => doc.querySelector('[data-window="sheet"] ' + s);
    assert.ok(sh('[data-spell="magic-missile"]') && sh('[data-spell="prestidigitation"]'));
    assert.match(sh('[data-spell="fire-bolt"]').textContent, /Hit \+5/);
    assert.equal(sh('[data-roll="spell-heal-magic-missile"]'), null, 'no heal button on a damage spell');
    click(sh('[data-roll="cast-magic-missile"]'), w); await sleep(20);
    const log = () => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    assert.match(log(), /casts Magic Missile \(level 1 spell slot\)\./);
    click(sh('[data-roll="cast-shield"]'), w); await sleep(20);
    click(sh('[data-roll="cast-sleep"]'), w); await sleep(20);
    assert.equal(log().match(/spell slot/g).length, 2, 'only two level 1 slots');
    click(sh('[data-roll="free-find-familiar"]'), w); await sleep(20);
    assert.match(log(), /casts Find Familiar without a spell slot \(Magic Initiate \(Wizard\)\)\./);
    assert.ok(sh('[data-roll="free-find-familiar"]').disabled, 'free cast used');
    click(sh('[data-roll="restore-slots"]'), w); await sleep(20);
    assert.ok(!sh('[data-roll="free-find-familiar"]').disabled, 'restored');
    // change spells on the sheet (kept in build.spells for level up)
    click(sh('[data-roll="manage-spells"]'), w); await sleep(20);
    const box = sh('[data-picker="Sheet prepared"] input[data-spell="mage-armor"]'); box.checked = false; box.dispatchEvent(new w.Event('change')); await sleep(20);
    const add = sh('[data-picker="Sheet prepared"] input[data-spell="burning-hands"]'); add.checked = true; add.dispatchEvent(new w.Event('change')); await sleep(20);
    click(sh('[data-save="sheet"]'), w); await sleep(80);
    const saved = JSON.parse(await w.indexeddb_load('character_Mira', 'null')).data.extensions.klite_rpmod.sheet;
    assert.deepEqual(plain(saved.spellcasting.preparedSpells), ['magic-missile', 'shield', 'sleep', 'burning-hands']);
    assert.deepEqual(plain(saved.build.spells.prepared), ['magic-missile', 'shield', 'sleep', 'burning-hands']);
    // level up to 2: the spellbook grows by 2 (8), the chosen spells stay
    await w.KLITE_RPMod_Builder.levelUp('Mira'); await sleep(20);
    click($('[data-step="spells"]'), w);
    assert.ok($('[data-picker="Spellbook"] input[data-spell="magic-missile"]').checked);
    assert.match($('[data-picker="Spellbook"] h3').textContent, /Spellbook — choose 8 .*\(6\/8\)/);
    click($('[data-step="review"]'), w); click($('[data-bld="create"]'), w); await sleep(100);
    const l2 = JSON.parse(await w.indexeddb_load('character_Mira', 'null')).data.extensions.klite_rpmod.sheet;
    assert.equal(l2.level, 2); assert.deepEqual(plain(l2.spellcasting.preparedSpells), ['magic-missile', 'shield', 'sleep', 'burning-hands']);
});
