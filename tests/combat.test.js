'use strict';
// Dice + combat engine with a seeded RNG (Math.random is stubbed inside the page).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost } = require('./helpers/host');

async function arena(t) {
    const h = createHost(); t.after(h.close);
    h.load('worlds'); await h.ready();
    const W = h.api();
    await W.newWorld('Arena');
    W.addEntity('location', { name: 'Ring', description: 'A sandy arena.' });
    const hero = W.addEntity('npc', { name: 'Hero' });
    W.setStats(hero.id, { abilities: { str: 16, dex: 14 }, ac: 15, hpMax: 20, attacks: [{ name: 'Sword', toHit: 5, damage: '1d8+3' }] });
    const gob = W.addPersonFromTemplate('goblin');
    W.setPlayerCombat({ name: 'You', stats: { abilities: { dex: 16 }, ac: 16, hpMax: 24, attacks: [{ name: 'Bow', toHit: 5, damage: '1d6+3' }] } });
    W.enable(); W.moveTo('Ring');
    return { h, W, hero, gob };
}

test('dice expressions and advantage', async (t) => {
    const { h, W } = await arena(t);
    h.seedRandom([0]);      assert.equal(W.roll('1d20').total, 1);
    h.seedRandom([0.999]);  assert.equal(W.roll('1d20').total, 20);
    h.seedRandom([0.5]);    assert.equal(W.roll('2d6+3').total, 11);
    h.seedRandom([0]);      assert.equal(W.roll('1d8-1').total, 0);
    h.seedRandom([0.95, 0.05]); assert.equal(W.rollD20(0, 'adv').die, 20);
    h.seedRandom([0.95, 0.05]); assert.equal(W.rollD20(0, 'dis').die, 2);
});

test('encounter: initiative order, HP, hit/crit/miss, damage, heal, turns', async (t) => {
    const { h, W, hero, gob } = await arena(t);
    assert.equal(W.getStats(gob.id).hpMax, 10, 'SRD 5.2.1 Goblin Warrior preset');
    h.seedRandom([0.9, 0.1, 0.5]);
    const cb = W.startEncounter([hero.id, gob.id], { zones: false });   // the rules without zones (zones: zones.test.js)
    assert.equal(cb.order.length, 3, 'player auto-included');
    for (let i = 1; i < cb.order.length; i++) assert.ok(cb.order[i - 1].init >= cb.order[i].init);
    assert.equal(cb.hp.__player__, 24);

    h.seedRandom([0.999, 0.5]);
    assert.equal(W.attack('__player__', gob.id).crit, true);
    assert.ok(W.getCombat().hp[gob.id] < 10);
    W.getCombat().hp[gob.id] = 10;
    h.seedRandom([0]);
    assert.equal(W.attack('__player__', gob.id).hit, false, 'natural 1 misses');
    assert.equal(W.getCombat().hp[gob.id], 10);

    W.damage(gob.id, 100); assert.equal(W.getCombat().hp[gob.id], 0);
    W.heal(gob.id, 5);     assert.equal(W.getCombat().hp[gob.id], 5);
    W.damage(gob.id, 100);
    const next = W.nextTurn();
    assert.ok(W.getCombat().hp[next.id] > 0, 'downed combatants are skipped');

    const s = W.preview();
    assert.match(s, /\[Combat\][\s\S]*Round \d/);
    assert.ok(s.indexOf('[Combat]') < s.indexOf('[Current Location'), 'combat has top priority');
    W.endEncounter();
    assert.equal(W.getCombat(), null);
    assert.doesNotMatch(W.preview(), /\[Combat\]/);
});

test('combat chat tags', async (t) => {
    const { h, W, gob } = await arena(t);
    W.startEncounter([gob.id], { zones: false });
    h.seedRandom([0.999, 0.5]);
    W.applyTags('<attack>You->Goblin</attack>');
    assert.ok(W.getCombat().hp[gob.id] < 7, '<attack>');
    W.getCombat().hp[gob.id] = 7;
    W.applyTags('<hp>Goblin=-3</hp>');
    assert.equal(W.getCombat().hp[gob.id], 4, '<hp>');
    W.applyTags('<roll>2d6</roll><check>You=dex 12</check>');
    assert.ok(W.getCombat().log.some(l => /Roll 2d6/.test(l)), '<roll>');
    assert.ok(W.getCombat().log.some(l => /DEX check/.test(l)), '<check>');
});
