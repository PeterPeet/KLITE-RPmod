'use strict';
// R5 encounters & combat: SRD 5.2.1 monsters, XP budget, sides, victory/defeat, death saves,
// conditions, automatic monster turns, the <encounter> tag and the persona sheet write-back.
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
const CR = requireSrc('src/game/combat-rules.js');
const plain = (x) => JSON.parse(JSON.stringify(x));
// d20 = 1 + floor(r × 20): 0 → 1, 0.45 → 10, 0.5 → 11, 0.999 → 20

test('rules: SRD monsters, XP budget and difficulty, conditions, death saves, tactics', () => {
    assert.ok(Object.keys(CR.MONSTERS).length >= 320, 'the SRD 5.2.1 monsters');
    const gob = CR.monsterStats('goblin-warrior');
    assert.deepEqual([gob.ac, gob.hpMax, gob.initiativeMod, gob.xp, gob.cr], [15, 10, 2, 50, '1/4']);
    assert.deepEqual(plain(gob.attacks[0]), { name: 'Scimitar', toHit: 4, damage: '1d6+2', type: 'Slashing', kind: 'melee', avg: 5, reach: 'reach 5 ft.' });
    const dragon = CR.monsterStats('adult-red-dragon');
    assert.equal(dragon.multiattack, 3); assert.equal(dragon.saves.dex, 6);
    assert.deepEqual(plain(dragon.saveActions[0]), { name: 'Fire Breath (Recharge 5–6)', save: 'dex', dc: 21, damage: '17d6', type: 'Fire', half: true });
    assert.equal(CR.findMonster('Wolves'), 'wolf'); assert.equal(CR.findMonster('Goblin Warrior'), 'goblin-warrior');

    assert.deepEqual(plain(CR.budget(1, 1)), { low: 50, moderate: 75, high: 100 });
    assert.deepEqual(plain(CR.budget(3, 5)), { low: 750, moderate: 1125, high: 2000 });
    assert.equal(CR.difficulty(0, 1, 1), 'none');
    assert.equal(CR.difficulty(20, 1, 1), 'trivial');
    assert.equal(CR.difficulty(50, 1, 1), 'low');
    assert.equal(CR.difficulty(75, 1, 1), 'moderate');
    assert.equal(CR.difficulty(100, 1, 1), 'high');
    assert.equal(CR.difficulty(101, 1, 1), 'beyond');
    assert.equal(CR.encounterXp([{ key: 'goblin-warrior', count: 3 }]), 150);

    assert.equal(CR.attackMode([{ name: 'Poisoned' }], [], false).mode, 'dis');
    assert.equal(CR.attackMode([], [{ name: 'Prone' }], false).mode, 'adv', 'melee vs prone');
    assert.equal(CR.attackMode([], [{ name: 'Prone' }], true).mode, 'dis', 'ranged vs prone');
    assert.equal(CR.attackMode([{ name: 'Poisoned' }], [{ name: 'Restrained' }], false).mode, null, 'they cancel');
    assert.equal(CR.attackMode([], [{ name: 'Unconscious' }], false).autoCrit, true);
    assert.equal(CR.cannotAct([{ name: 'Stunned' }]), true);

    let d = CR.deathSave(null, 12).state; assert.deepEqual(plain(d), { s: 1, f: 0, stable: false, dead: false });
    d = CR.deathSave(d, 1).state; assert.equal(d.f, 2, 'natural 1 = two failures');
    assert.equal(CR.deathSave(d, 5).result, 'dead');
    assert.equal(CR.deathSave({ s: 2, f: 0 }, 10).result, 'stable');
    assert.equal(CR.deathSave({ s: 0, f: 2 }, 20).result, 'revived');
    assert.equal(CR.damageAtZero({ s: 2, f: 1 }, true).dead, true, 'a crit while down = two failures');

    assert.equal(CR.pickAttack(CR.monsterStats('knight')), 0, 'Greatsword over the crossbow');
    assert.equal(CR.pickTarget(['a', 'b'], 'b', () => 0), 'b', 'keeps its target');
    assert.equal(CR.pickTarget(['a', 'b'], 'x', () => 0.9), 'b');
    assert.equal(CR.levelForXp(299), 1); assert.equal(CR.levelForXp(300), 2); assert.equal(CR.xpForLevel(3), 900);
});

async function field(t, playerStats) {
    const h = createHost(); t.after(h.close);
    h.load('bundle'); await h.ready({ ui: true });
    const W = h.api();
    h.window.KLITE_RPMod_Settings.set('combat_zones', false);   // these tests cover the rules without zones (zones: zones.test.js)
    await W.newWorld('Road');
    W.addEntity('location', { name: 'Road' });
    W.setPlayerCombat({ name: 'Kara', stats: Object.assign({ abilities: { str: 16, dex: 14 }, ac: 16, hpMax: 12, attacks: [{ name: 'Longsword', toHit: 5, damage: '1d8+3' }] }, playerStats || {}) });
    W.enable(); W.moveTo('Road');
    return { h, W, w: h.window };
}

test('encounter with SRD monsters: sides, victory, XP, the AI context and the game log', async (t) => {
    const { h, W, w } = await field(t);
    h.seedRandom([0.5]);
    const cb = W.startEncounter([], { monsters: [{ key: 'goblin-warrior', count: 2 }] });
    assert.equal(cb.version, 2);
    assert.deepEqual(cb.order.map(o => o.name).sort(), ['Goblin Warrior 1', 'Goblin Warrior 2', 'Kara']);
    const gobs = cb.order.filter(o => o.kind === 'monster');
    assert.ok(gobs.every(o => o.side === 'enemy')); assert.equal(cb.order.find(o => o.isPlayer).side, 'party');
    assert.equal(cb.hp[gobs[0].id], 10); assert.equal(W.combatantStats(gobs[0].id).ac, 15);
    assert.match(W.preview(), /Enemies:\n.*Goblin Warrior 1 \(Goblin Warrior, AC 15\) HP 10\/10/);
    assert.match(W.preview(), /RPmod rolls every attack/);

    W.damage(gobs[0].id, 20);
    assert.equal(W.getCombat().outcome, null);
    W.damage(gobs[1].id, 20);
    assert.equal(W.getCombat().outcome, 'victory');
    assert.equal(W.getCombat().xp, 100);
    assert.match(W.preview(), /OUTCOME: Victory — every enemy is defeated \(100 XP\)/);
    const L = w.KLITE_RPMod_Log;
    assert.ok(L.entries().some(e => e.kind === 'combat' && /Victory! All enemies are defeated\. 100 XP earned\./.test(e.what)), 'combat events in the game log');
    await w.prepare_submit_generation();
    assert.match(h.prompt, /\[Rolls and combat since your last reply\][\s\S]*Goblin Warrior 1 takes 20 damage → HP 0\/10 \(down!\)\n- Goblin Warrior 1 is defeated\./, 'the cause comes before the result');
    assert.equal(W.attack('__player__', gobs[0].id), null, 'no attacks after the outcome');
    W.endEncounter(); assert.equal(W.getCombat(), null);
});

test('defeat: the player falls, makes death saves, can be revived by a natural 20, then dies', async (t) => {
    const { h, W } = await field(t, { hpMax: 5 });
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'wolf', count: 1 }] });
    const wolf = W.getCombat().order.find(o => o.kind === 'monster').id;
    W.damage('__player__', 9);
    let cb = W.getCombat();
    assert.equal(cb.hp.__player__, 0);
    assert.deepEqual(plain(W.conditionsOf('__player__').map(c => c.name)), ['Unconscious']);
    assert.equal(cb.outcome, null, 'dying is not yet defeat');
    assert.equal(W.autoTurn(wolf).skipped, 'no target', 'monsters leave a dying character alone');
    h.seedRandom([0.999, 0.5]);
    assert.equal(W.deathSave().result, 'revived');
    assert.equal(W.getCombat().hp.__player__, 1); assert.deepEqual(plain(W.conditionsOf('__player__')), []);
    W.damage('__player__', 3);
    h.seedRandom([0.2, 0.5]); assert.equal(W.deathSave().result, 'failure');
    W.damage('__player__', 1);   // damage while down = one more failure
    assert.equal(W.getCombat().death.__player__.f, 2);
    h.seedRandom([0.2, 0.5]); assert.equal(W.deathSave().result, 'dead');
    cb = W.getCombat();
    assert.equal(cb.outcome, 'defeat');
    assert.match(W.preview(), /Kara HP 0\/5 \[Unconscious\] — dead[\s\S]*OUTCOME: Defeat/);
    assert.equal(W.heal('__player__', 5), 0, 'the dead are not healed');
});

test('conditions change attack rolls and wear off; monster turns run until the player acts', async (t) => {
    const { h, W } = await field(t, { hpMax: 60, ac: 10 });
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior', count: 2 }] });
    let cb = W.getCombat();
    const [g1, g2] = cb.order.filter(o => o.kind === 'monster').map(o => o.id);
    W.addCondition(g1, 'Prone', 1);
    h.seedRandom([0.1, 0.9, 0.5]);   // two d20s (advantage keeps 19), damage die
    const r = W.attack('__player__', g1);
    assert.equal(r.roll, 19 + 5);
    assert.match(cb.log.find(l => /Hit: Kara → Goblin Warrior 1/.test(l)), /advantage: target Prone/);
    W.addCondition('__player__', 'Poisoned');
    h.seedRandom([0.9, 0.1, 0.5]);
    assert.equal(W.attack('__player__', g2).roll, 3 + 5, 'poisoned: disadvantage');
    // condition durations tick at the end of the creature's turn
    cb.turnIndex = cb.order.findIndex(o => o.id === g1); W.nextTurn();
    assert.deepEqual(plain(W.conditionsOf(g1)), []);
    // automatic monster turns stop at the player
    cb = W.getCombat(); cb.turnIndex = cb.order.findIndex(o => o.id === g1);
    h.seedRandom([0.5]);
    const done = W.runAutoTurns();
    assert.ok(done.length >= 1 && done.every(d => d.id !== '__player__'));
    assert.equal(W.getCombat().order[W.getCombat().turnIndex].id, '__player__');
    assert.ok(W.getCombat().hp.__player__ < 60, 'the goblins attacked');
    // a stunned monster cannot act
    W.addCondition(g2, 'Stunned', 1);
    assert.equal(W.autoTurn(g2).skipped, 'incapacitated');
});

test('saving-throw actions, saved encounters, the <encounter> tag and trigger effect, budget helpers', async (t) => {
    const { h, W, w } = await field(t, { hpMax: 200 });
    // budget helpers
    assert.deepEqual(plain(W.partyInfo()), { level: 1, size: 1, allies: [] });
    assert.equal(W.encounterXp([{ key: 'wolf', count: 2 }]), 100);
    assert.equal(W.encounterDifficulty(100, 1, 1), 'high');
    // saved encounter (authoring → world unsaved)
    const enc = W.saveEncounter({ name: 'Wolf Pack', monsters: [{ name: 'Wolf', count: 3 }] });
    assert.equal(W.listEncounters()[0].xp, 150);
    h.seedRandom([0.5]);
    W.startSavedEncounter('wolf pack');
    assert.equal(W.getCombat().order.filter(o => o.kind === 'monster').length, 3);
    assert.equal(W.getCombat().encounter, enc.id);
    W.endEncounter();
    // the AI (as GM) is told how to start a fight, and does it with a tag
    assert.match(W.preview(), /\[Starting a fight\]\nWhen a fight breaks out, write <encounter>2 Wolf, Goblin Warrior<\/encounter>[^\n]*prepared encounter \(Wolf Pack\)/);
    w.gametext_arr.push('Wolves burst from the trees! <encounter>2 Wolf, Goblin Warrior</encounter>');
    await w.prepare_submit_generation();
    const names = plain(W.getCombat().order.map(o => o.name).sort());
    assert.deepEqual(names, ['Goblin Warrior', 'Kara', 'Wolf 1', 'Wolf 2']);
    assert.match(h.prompt, /\[Combat\][\s\S]*Wolf 1/);
    // a dragon's breath: DEX save, half damage on a success
    W.endEncounter();
    W.startEncounter([], { monsters: [{ key: 'adult-red-dragon' }] });
    const dragon = W.getCombat().order.find(o => o.kind === 'monster').id;
    h.seedRandom([0.999, 0.5, 0.5]);   // save roll 20 → success
    const br = W.saveAction(dragon, '__player__', 0);
    assert.equal(br.success, true); assert.ok(br.damage > 0 && br.damage < 102);
    W.endEncounter();
    // trigger effect
    const ev = W.addEntity('event', { name: 'Ambush' });
    W.updateEntity(ev.id, { triggers: [{ type: 'manual' }], effects: [{ type: 'encounter', value: 'Wolf Pack' }] });
    W.fireTriggers('manual:' + ev.id);
    assert.equal(W.getCombat() && W.getCombat().encounter, enc.id, 'event started the saved encounter');
});

test('persona sheet: the fight starts at its current HP; HP and XP are written back after victory', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Kara', { description: 'A fighter.' });
    await C.saveSheet('Kara', { className: 'Fighter', level: 1, xp: 250, ac: 16, hp: { max: 12, current: 9 }, abilities: { str: 16 }, attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3' }] });
    w.KLITE_RPMod.panels.TOOLS.selectedPersona = { name: 'Kara' }; w.KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    h.seedRandom([0.5]);
    W.startEncounter([], { monsters: [{ key: 'goblin-warrior' }] });
    let cb = W.getCombat();
    assert.equal(cb.hp.__player__, 9); assert.equal(cb.maxHp.__player__, 12); assert.equal(cb.persona, 'Kara');
    assert.equal(W.combatantStats('__player__').attacks[0].toHit, 5, 'attacks from the sheet');
    W.damage('__player__', 4);
    W.damage(cb.order.find(o => o.kind === 'monster').id, 50);
    assert.equal(W.getCombat().outcome, 'victory');
    await sleep(60);
    const s = await C.loadSheet('Kara');
    assert.equal(s.hp.current, 5); assert.equal(s.xp, 300);
    assert.ok(w.KLITE_RPMod_Log.entries().some(e => /Kara has enough XP for level 2/.test(e.what)));
    W.endEncounter(); await sleep(30);
    assert.equal((await C.loadSheet('Kara')).xp, 300, 'written once');
});

test('Combat window: build an encounter with the XP meter, save it, fight it through to victory', async (t) => {
    const { h, W, w } = await field(t, { hpMax: 40, ac: 18, attacks: [{ name: 'Longsword', toHit: 7, damage: '1d8+30' }] });
    const doc = w.document;
    w.KLITE_RPMod_Shell.open('combat');
    const win = () => doc.querySelector('[data-window="combat"]');
    for (let i = 0; i < 100 && !win(); i++) await sleep(20);   // under load the window can take longer
    const $ = (s) => win().querySelector(s);
    assert.match($('[data-cb="difficulty"]').textContent, /No enemies yet/);
    const search = $('[data-cb="search"]'); search.value = 'goblin warrior'; search.dispatchEvent(new w.Event('input'));
    assert.ok($('[data-monster="goblin-warrior"]'), 'search finds the Goblin Warrior');
    $('[data-cb="add-goblin-warrior"]').click(); await sleep(10);
    assert.match($('[data-cb="difficulty"]').textContent, /Low/, '50 XP for one level-1 character');
    $('[data-cb="more-goblin-warrior"]').click(); await sleep(10);
    assert.match($('[data-cb="difficulty"]').textContent, /High/, '100 XP');
    $('[data-cb="less-goblin-warrior"]').click(); await sleep(10);
    const name = $('[data-cb="name"]'); name.value = 'Lone goblin'; name.dispatchEvent(new w.Event('input'));
    $('[data-cb="save"]').click(); await sleep(10);
    assert.equal(W.listEncounters()[0].name, 'Lone goblin');
    h.seedRandom([0.9, 0.1, 0.5]);   // the player wins initiative
    $('[data-cb="start"]').click(); await sleep(10);
    assert.ok(W.getCombat() && W.getCombat().active);
    assert.match($('[data-cb="turn"]').textContent, /Kara/);
    h.seedRandom([0.9, 0.9, 0.5]);
    $('[data-cb="attack"]').click(); await sleep(10);
    assert.equal(W.getCombat().outcome, 'victory');
    assert.match($('[data-cb="outcome"]').textContent, /Victory![\s\S]*50 XP earned/);
    $('[data-cb="end"]').click(); await sleep(10);
    assert.equal(W.getCombat(), null);
    assert.ok($('[data-cb="start-' + W.listEncounters()[0].id + '"]'), 'saved encounter can be started again');
});
