'use strict';
// Combat turns (fixes 2026-10-20): a dying companion takes its turn in the real turn order (End turn →
// automatic turns) and rolls its death saves, so a fight with the player stable and a companion dying
// still ends; one Attack action per turn (with or without zones) — Extra Attack from the sheet's class
// and level, Multiattack for monsters; an action spell and an attack exclude each other.
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
const SH = requireSrc('src/characters/sheet.js');

// The example world's watchtower with Captain Rowan in the party.
async function watchtower(t) {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready({ ui: false });
    const W = h.api();
    await W.loadExample();
    W.moveTo('Royal Watchtower');
    W.updateEntity('npc_rowan', { canJoin: true });
    assert.equal(W.joinParty('Captain Rowan').ok, true);
    return h;
}
const turnOf = (cb, id) => { cb.turnIndex = cb.order.findIndex(o => o.id === id); cb.turnUse = null; };

test('a dying companion rolls its death saves in the turn order (End turn → automatic turns)', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb = W.getCombat();
    W.damage('npc_rowan', 99);
    assert.ok(cb.death.npc_rowan && !cb.death.npc_rowan.stable, 'Rowan is dying');
    turnOf(cb, '__player__');
    h.seedRandom([0.2]);   // every d20 a 5: Rowan's death save fails, the wolf misses
    W.nextTurn(); const done = W.runAutoTurns();
    const rowan = done.find(d => d.id === 'npc_rowan');
    assert.ok(rowan && rowan.deathSave, 'Rowan took a turn: ' + JSON.stringify(done));
    assert.equal(rowan.deathSave.result, 'failure');
    assert.equal(cb.death.npc_rowan.f, 1);
    assert.ok(cb.log.some(l => /Captain Rowan death saving throw: 5 — failure/.test(l)));
});

test('the player stable and a companion dying: the companion\'s saves end the fight', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb = W.getCombat();
    W.damage('__player__', 99); cb.death.__player__ = { s: 3, f: 0, stable: true, dead: false };
    W.damage('npc_rowan', 99);
    assert.equal(cb.outcome, null, 'Rowan is still dying');
    h.seedRandom([0.7]);   // death saves of 15: three successes → stable
    for (let i = 0; i < 4 && !cb.outcome; i++) { W.nextTurn(); W.runAutoTurns(); }
    assert.equal(cb.outcome, 'defeat', 'the fight ends instead of looping');
    assert.ok(cb.death.npc_rowan.stable);
    assert.ok(!cb.wipe, 'fallen but stable is no game over');
});

test('one Attack action per turn, with and without zones; a new turn gives a new one', async (t) => {
    for (const zones of [false, true]) {
        const h = createHost();
        try {
            h.load('worlds'); await h.ready({ ui: false });
            const W = h.api(); await W.loadExample(); W.moveTo('Royal Watchtower');
            W.startEncounter([], { monsters: [{ key: 'ogre' }], zones });
            const cb = W.getCombat(); const ogre = cb.order.find(o => o.kind === 'monster').id;
            if (zones) cb.zones.pos.__player__ = cb.zones.pos[ogre];
            turnOf(cb, '__player__'); if (zones) cb.zones.turn = { id: '__player__', moved: 0, fled: false, attacked: false, acted: false };
            assert.equal(W.attacksLeft('__player__'), 1);
            const first = W.attack('__player__', ogre, 0);
            assert.ok(first && !first.refused, `zones=${zones}: the first attack is made`);
            assert.equal(W.attacksLeft('__player__'), 0);
            const second = W.attack('__player__', ogre, 0);
            assert.match(second.refused || '', /Attack action is used up \(1 attack this turn\)/, `zones=${zones}: the second is refused`);
            assert.ok(cb.log.some(l => /cannot attack Ogre again: the Attack action is used up/.test(l)));
            assert.equal(W.attacksLeft(ogre), 0, 'not the ogre\'s turn');
            // the next round: a fresh Attack action
            cb.round++; cb.turnUse = null;
            assert.equal(W.attacksLeft('__player__'), 1, `zones=${zones}: a new turn`);
        } finally { h.close(); }
    }
});

test('Extra Attack: attacks per Attack action from the class and level (SRD 5.2.1)', () => {
    const per = (className, level, build) => SH.attacksPerAction({ className, level, build });
    assert.equal(per('Fighter', 4), 1);
    assert.equal(per('Fighter', 5), 2);
    assert.equal(per('Fighter', 11), 3, 'Two Extra Attacks');
    assert.equal(per('Fighter', 20), 4, 'Three Extra Attacks');
    assert.equal(per('Paladin', 5), 2);
    assert.equal(per('Half-Elf Ranger', 6), 2, 'the class named in the field');
    assert.equal(per('Wizard', 20), 1);
    assert.equal(per('', 5), 1);
    assert.equal(per('Hero', 5, { class: 'barbarian' }), 2, 'the builder\'s class wins');
    assert.equal(SH.toCombatStats({ className: 'Fighter', level: 5 }).attacksPerAction, 2, 'combat stats carry it');
});

// A level-5 fighter persona with Extra Attack, and a level-3 cleric for the spell rule.
async function heroes(t, persona) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Bram', { description: 'A fighter.' });
    await C.saveSheet('Bram', { className: 'Fighter', level: 5, ac: 17, hp: { max: 44, current: 44 }, abilities: { str: 16 }, attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3' }] });
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', { className: 'Cleric', level: 3, ac: 16, hp: { max: 24, current: 24 }, abilities: { wis: 16 },
        attacks: [{ name: 'Mace', ability: 'str', proficient: true, damage: '1d6' }],
        spellcasting: { ability: 'wis', slots: [4, 2], cantripsKnown: ['sacred-flame'], preparedSpells: ['guiding-bolt', 'healing-word'] } });
    C.cachedSheet('Bram'); C.cachedSheet('Mira'); await sleep(20);
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: persona }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    return { h, W };
}

test('Extra Attack in a fight: a level-5 fighter attacks twice per turn, not three times', async (t) => {
    const { W } = await heroes(t, 'Bram');
    W.startEncounter([], { monsters: [{ key: 'ogre' }], zones: false });
    const cb = W.getCombat(); const ogre = cb.order.find(o => o.kind === 'monster').id;
    turnOf(cb, '__player__');
    assert.equal(W.attacksLeft('__player__'), 2);
    assert.ok(!W.attack('__player__', ogre, 0).refused);
    assert.ok(!W.attack('__player__', ogre, 0).refused, 'the second attack of Extra Attack');
    assert.ok(W.attack('__player__', ogre, 0).refused, 'no third');
});

test('an action spell and the Attack action exclude each other; a bonus action spell does not', async (t) => {
    const { W } = await heroes(t, 'Mira');
    W.startEncounter([], { monsters: [{ key: 'ogre' }], zones: false });
    const cb = W.getCombat(); const ogre = cb.order.find(o => o.kind === 'monster').id;
    turnOf(cb, '__player__');
    assert.ok(!W.attack('__player__', ogre, 0).refused, 'the mace attack');
    const gb = W.castSpell('__player__', 'guiding-bolt', { targets: [ogre] });
    assert.deepEqual([gb.ok, gb.reason], [false, 'the action is already used this turn']);
    const hw = W.castSpell('__player__', 'healing-word', { targets: ['__player__'] });
    assert.equal(hw.ok, true, 'Healing Word is a bonus action');
    // next turn: the spell first, then no attack
    cb.round++; cb.turnUse = null;
    assert.equal(W.castSpell('__player__', 'guiding-bolt', { targets: [ogre] }).ok, true);
    assert.equal(W.attacksLeft('__player__'), 0);
    assert.match(W.attack('__player__', ogre, 0).refused || '', /action is already used/);
});

// Play test 2026-10-20: a victory while the player was dying left them at 0 HP outside the fight, with no way to
// stabilise (the AI asked for a death save that has no button outside a fight).
test('victory: whoever is still dying is stabilised after the fight and comes round with 1 HP; the dead stay dead', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb = W.getCombat(); const wolf = cb.order.find(o => o.kind === 'monster').id;
    W.damage('__player__', 99);
    assert.ok(cb.death.__player__ && !cb.death.__player__.stable, 'the player is dying');
    W.damage(wolf, 99);
    assert.equal(cb.outcome, 'victory');
    assert.equal(cb.hp.__player__, 1);
    assert.equal(cb.death.__player__, undefined);
    assert.ok(!W.conditionsOf('__player__').some(c => c.name === 'Unconscious'));
    assert.ok(cb.log.some(l => /^After the fight: You — stabilised, back on 1 HP\.$/.test(l)), JSON.stringify(cb.log.slice(-3)));
    assert.match(W.preview(), /\n  You HP 1\/12\n/, 'the prompt: up again, not dying');
    // a companion who died stays dead
    W.endEncounter();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb2 = W.getCombat(); const wolf2 = cb2.order.find(o => o.kind === 'monster').id;
    W.damage('npc_rowan', 99); for (let i = 0; i < 3; i++) W.damage('npc_rowan', 1);
    assert.ok(cb2.death.npc_rowan.dead);
    W.damage(wolf2, 99);
    assert.equal(cb2.hp.npc_rowan, 0, 'the dead are not revived');
});

test('combat log wording: "1 success", the natural 20 before "back up", "no one left to attack" once', async (t) => {
    const h = await watchtower(t); const W = h.api();
    W.startEncounter([], { monsters: [{ key: 'wolf' }], zones: false });
    const cb = W.getCombat();
    W.damage('__player__', 99); W.damage('npc_rowan', 99);
    h.seedRandom([0.6]);   // a death save of 13
    W.deathSave('__player__');
    assert.ok(cb.log.some(l => /\(1 success \/ 0 failures\)\./.test(l)), JSON.stringify(cb.log.slice(-2)));
    h.seedRandom([0.99]);   // a natural 20
    W.deathSave('npc_rowan');
    const i = cb.log.findIndex(l => /Captain Rowan rolls a natural 20/.test(l));
    assert.ok(i >= 0 && /Captain Rowan is back up\./.test(cb.log[i + 1]), JSON.stringify(cb.log.slice(-3)));
    W.damage('npc_rowan', 99);
    h.seedRandom([0.6]);
    for (let k = 0; k < 4; k++) { W.nextTurn(); W.runAutoTurns(); }
    assert.ok(cb.log.filter(l => /Wolf has no one left to attack/.test(l)).length <= 1, 'once');
});
