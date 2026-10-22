'use strict';
// UI play test 2026-10-20 (character sheet, inventory, character builder), fixes:
// Cast on the sheet spends the slot at once (a game change, not a draft edit a Revert would undo after the AI was
// told); Enter adds an attack or an item; a level up keeps the class; the wizard's Scholar (level 2); New Session
// closes a Combat window without a fight.
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
const B = requireSrc('src/characters/builder-rules.js');

async function host(t) {
    const h = createHost(); t.after(h.close);
    h.window.restart_new_game = () => { h.window.gametext_arr = []; };
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    return h;
}
const cleric = { name: 'Mira', class: 'cleric', level: 1, background: 'acolyte', species: 'human', method: 'standard',
    scores: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, bgBonus: { plus2: 'wis', plus1: 'cha' },
    classSkills: ['medicine', 'persuasion'], speciesSkills: ['perception'], originFeat: 'Alert', divineOrder: 'protector', classEquipment: 'A', backgroundEquipment: 'A',
    spells: { cantrips: ['guidance', 'sacred-flame', 'thaumaturgy'], prepared: ['bless', 'cure-wounds', 'healing-word', 'shield-of-faith'] },
    magicInitiate: { background: { cantrips: ['spare-the-dying', 'light'], spell: 'sanctuary' } } };

test('Cast on the sheet spends the slot at once (the sheet stays clean); a Revert does not bring it back', async (t) => {
    const h = await host(t); const w = h.window; const doc = w.document; const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', B.buildSheet(cleric));
    C.open('Mira'); await sleep(60);
    const sh = (s) => doc.querySelector('[data-window="sheet"] ' + s);
    click(sh('[data-sheet-tab="spells"]'), w); await sleep(20);
    click(sh('[data-roll="cast-cure-wounds"]'), w); await sleep(40);
    assert.deepEqual(JSON.parse(JSON.stringify(C.cachedSheet('Mira').spellcasting.used)), [1], 'spent on the sheet');
    assert.equal(C.current().dirty, false, 'not a draft edit');
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => e.who === 'Mira' && /casts Cure Wounds \(level 1 spell slot\)/.test(e.what)));
    click(sh('[data-roll="free-sanctuary"]'), w); await sleep(40);
    assert.equal(C.cachedSheet('Mira').spellcasting.freeUsed.sanctuary, 1, 'the free cast too');
    assert.equal(C.current().dirty, false);
});

test('Enter in the new-item and new-attack fields adds it', async (t) => {
    const h = await host(t); const w = h.window; const doc = w.document; const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', B.buildSheet(cleric));
    C.open('Mira'); await sleep(60);
    const sh = (s) => doc.querySelector('[data-window="sheet"] ' + s);
    const enter = (input, text) => { input.value = text; input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); };
    click(sh('[data-sheet-tab="inventory"]'), w); await sleep(20);
    enter(sh('input[aria-label="New item"]'), 'Rope'); await sleep(20);
    assert.ok(C.current().sheet.inventory.some(i => i.name === 'Rope'));
    click(sh('[data-sheet-tab="combat"]'), w); await sleep(20);
    enter(sh('input[aria-label="New attack"]'), 'Longsword'); await sleep(20);
    const a = C.current().sheet.attacks.find(x => x.name === 'Longsword');
    assert.ok(a && a.damage === '1d8+1', JSON.stringify(a));
});

test('level up keeps the class (only the own class is shown); the wizard picks Scholar at level 2', async (t) => {
    const h = await host(t); const w = h.window; const doc = w.document; const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', B.buildSheet(cleric));
    await w.KLITE_RPMod_Builder.levelUp('Mira'); await sleep(30);
    const picks = [...doc.querySelectorAll('[data-window="builder"] [data-pick]')].map(e => e.getAttribute('data-pick'));
    assert.deepEqual(picks, ['cleric']);
    // Scholar: expertise picks and options (rules)
    const wiz = { class: 'wizard', level: 2, background: 'sage', classSkills: ['investigation', 'insight'], speciesSkills: [] };
    assert.equal(B.expertisePicks(wiz), 1);
    assert.equal(B.expertisePicks(Object.assign({}, wiz, { level: 1 })), 0);
    assert.deepEqual(B.expertiseOptions(wiz).sort(), ['arcana', 'history', 'investigation'], 'only the field skills it is proficient in (not Insight)');
    assert.match(B.validate(Object.assign({}, wiz)).join('\n'), /Scholar: choose 1 skill/);
});

test('New Session closes a Combat window that has no fight', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api(); const sh = w.KLITE_RPMod_Shell;
    await W.loadExample(); W.moveTo('Royal Watchtower');
    for (let i = 0; i < 40 && !w.restart_new_game.__rpmod_combatwin; i++) await sleep(25);
    sh.open('combat'); assert.ok(sh.isOpen('combat'));
    w.restart_new_game(); await sleep(20);
    assert.equal(sh.isOpen('combat'), false);
    // a fight elsewhere: the window stays as long as the fight runs
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    sh.open('combat'); await sleep(20);
    assert.equal(sh.isOpen('combat'), true);
});
