'use strict';
// R8 content: the starter adventure "The Drowned Lantern" — its package is valid, its pregens follow
// the character builder's rules, its shops can price everything, and layer 1 plays through.
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
const AR = requireSrc('src/adventures/adventure-rules.js');
const DL = requireSrc('src/adventures/content/drowned-lantern.js');
const B = requireSrc('src/characters/builder-rules.js');
const SHOP = requireSrc('src/game/shop-rules.js');
const plain = (v) => JSON.parse(JSON.stringify(v));

test('package: valid; only the XP warning while later layers are missing', () => {
    const pkg = DL.drownedLantern();
    const r = AR.validateAdventure(pkg);
    assert.deepEqual(r.errors, []);
    // until R8 step 7 the adventure cannot reach level 5 yet; nothing else may warn
    assert.deepEqual(r.warnings.filter(w => !/^XP per character/.test(w)), []);
    assert.equal(r.stats.pregens, 4);
    assert.ok(r.stats.xp.perCharacter >= 2700, `layers 1–2 carry a character to level 4 (${r.stats.xp.perCharacter} XP)`);
    assert.equal(pkg.credits[0], requireSrc('src/data/srd52.js').SRD.attribution, 'the exact SRD attribution');
});

test('pregens: valid builder choices, sheets on the cards, pronouns and bonds', () => {
    const pkg = DL.drownedLantern();
    assert.deepEqual(AR.pregens(pkg).map(g => [g.id, g.name, g.pronouns]), [
        ['oona', 'Oona Greycairn', 'she/her'], ['tove', 'Tove Emberfall', 'they/them'], ['kasimir', 'Kasimir Adeyemi', 'he/him'], ['pell', 'Pell Marrow', 'she/her']]);
    for (const [id, choices] of Object.entries(DL.PREGEN_CHOICES)) assert.deepEqual(B.validate(choices), [], id);
    for (const c of pkg.characters) {
        const k = c.data.extensions.klite_rpmod;
        assert.equal(k.sheet.level, 1, c.data.name);
        assert.ok(k.sheet.hp.max > 0 && k.sheet.ac >= 10, c.data.name);
        assert.ok(c.data.description.includes(`(${k.pronouns})`), `${c.data.name}: pronouns in the card`);
        assert.ok(k.sheet.notes, `${c.data.name}: sheet notes (trait, bond)`);
    }
    const tove = pkg.characters.find(c => c.data.extensions.klite_rpmod.pregen === 'tove');
    assert.match(tove.data.description, /short-sighted/);
    assert.match(tove.data.extensions.klite_rpmod.sheet.notes, /no rules penalty/);
    // every pregen is also a person in the world who can join the party
    for (const g of AR.pregens(pkg)) {
        const p = pkg.world.npcs.find(n => n.characterRef && n.characterRef.pregen === g.id);
        assert.ok(p && p.canJoin, g.id);
    }
});

test('shops: every ware has a price (its own or the SRD list price)', () => {
    const pkg = DL.drownedLantern();
    for (const p of pkg.world.npcs.filter(n => n.shop)) for (const it of p.shop.items)
        assert.ok(SHOP.parsePrice(it.price) > 0 || SHOP.srdPrice(it.item) > 0, `${p.name}: ${it.item}`);
});

test('layer 1 plays through: start as Oona, a companion, the road, the Hollow Oak, the old coin', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures; const C = w.KLITE_RPMod_Characters;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);

    const r = await ADV.start('drowned-lantern', { pregen: 'oona', confirm: false });
    assert.equal(r.persona, 'Oona Greycairn');
    assert.match(w.gametext_arr[0], /Elder Maren Holt comes in out of the mist/);
    assert.equal(W.runtime.playerLocationId, 'bw_heron');
    assert.equal(h.ui().uiMode(), 'player');
    const s = W.preview();
    assert.match(s, /\[Current Location: The Tipsy Heron\]/);
    assert.match(s, /Elder Maren Holt/, 'the elder waits at the inn in the morning');
    assert.match(s, /may join the player[^\n]*<join>Tove Emberfall<\/join>/);
    assert.doesNotMatch(s, /- Oona Greycairn/, 'you do not meet yourself');
    await sleep(50);
    const sheet0 = await C.loadSheet('Oona Greycairn');
    assert.equal(sheet0.level, 1); assert.equal(sheet0.xp, 0);

    // Tove joins
    assert.equal(W.joinParty('Tove').ok, true);

    // A1: Missing Carts
    assert.ok(W.acceptQuest('q_missing_carts'));
    W.go('west');                                       // the Heron → Wen's Farm
    assert.equal(W.runtime.playerLocationId, 'bw_farm');
    w.gametext_arr.push('Liu Wen wipes her hands. "The cart? Gone on the Forest Road." <talk>Liu Wen</talk>');
    await w.prepare_submit_generation();
    W.moveTo('bw_green'); W.go('Forest Road');
    assert.equal(W.runtime.playerLocationId, 'loc_forest_road');
    assert.ok(W.isHere('npc_tove'), 'Tove travels along');
    let cb = W.getCombat();
    assert.ok(cb && cb.active, 'the ambush starts at the cart');
    assert.ok(cb.order.some(o => o.id === 'npc_tove' && o.side === 'party'), 'Tove fights on your side');
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 99); };
    beat();
    assert.equal(W.getCombat().outcome, 'victory');
    assert.deepEqual([W.getCombat().xp, W.getCombat().xpEach], [100, 50], 'two goblins, split between Oona and Tove');
    W.endEncounter();
    assert.equal(W.questState('q_missing_carts'), 'complete');
    W.turnInQuest('q_missing_carts');

    // A2: The Hollow Oak — room by room through the den
    assert.ok(W.acceptQuest('q_hollow_oak'));
    W.go('The Hollow Oak');
    assert.equal(W.runtime.playerLocationId, 'ho_roots', 'enters by the root tunnel');
    for (const [room, enc] of [['Wolf Den', 'enc_den_wolves'], ['Hollow Trunk', 'enc_den_lookout']]) {
        W.go(room); assert.ok(W.startSavedEncounter(enc), enc); beat(); W.endEncounter();
        if (room === 'Hollow Trunk') W.go('south');
    }
    W.go('Stolen Stores');
    w.gametext_arr.push('You shoulder the sacks. <give>Grain Sack x3</give>');
    await w.prepare_submit_generation();
    W.go('west'); W.go('Sleeping Burrow');
    W.startSavedEncounter('enc_den_burrow'); beat(); W.endEncounter();
    W.go('east');
    assert.equal(W.runtime.playerLocationId, 'ho_burrow', 'the chief\'s door is locked');
    W.go('Flooded Burrow'); W.startSavedEncounter('enc_den_rats'); beat(); W.endEncounter();
    w.gametext_arr.push('In the soggy sack: a key carved from bone. <give>Bone Key</give>');
    await w.prepare_submit_generation();
    W.go('east'); W.door('unlock', 'east'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'ho_chief', 'the Bone Key opens the chief\'s door');
    W.startSavedEncounter('enc_den_chief'); beat(); W.endEncounter();
    assert.equal(W.questState('q_hollow_oak'), 'complete');
    w.gametext_arr.push('In the chest, among the coins, a green one. <give>Lake-green Coin</give>');
    await w.prepare_submit_generation();
    W.turnInQuest('q_hollow_oak', 0);
    assert.equal(W.questState('q_hollow_oak'), 'turnedin');

    // A3: An Old Coin (started by the item)
    assert.equal(W.questState('q_old_coin'), 'available', 'the coin starts the next quest');
    assert.ok(W.acceptQuest('q_old_coin'));
    W.moveTo('bw_shrine');   // (the creator's teleport: the walk is covered above)
    w.gametext_arr.push('<talk>Sister Imani</talk>'); await w.prepare_submit_generation();
    W.moveTo('bw_green'); W.go('Forest Road'); W.go('River Ford');
    w.gametext_arr.push('Odo puffs his pipe. <talk>Odo the ferryman</talk>'); await w.prepare_submit_generation();
    assert.equal(W.questState('q_old_coin'), 'complete');
    W.turnInQuest('q_old_coin');

    await sleep(80);
    if (process.env.DEBUG_XP) { await sleep(1500); console.log('cached', C.cachedSheet('Oona Greycairn').xp, 'stored', (await C.loadSheet('Oona Greycairn')).xp); }
    if (process.env.DEBUG_XP) console.log(w.KLITE_RPMod_Log.entries().map(e => e.kind + ': ' + e.what).filter(x => /XP|Victory|turned in|xp/i.test(x)).join('\n'));
    const sheet = await C.loadSheet('Oona Greycairn');
    // quests 50 + 150 + 100, fights (100 + 100 + 100 + 150 + 100 + 250) / 2
    assert.equal(sheet.xp, 300 + 400, 'XP on the sheet');
    assert.ok(sheet.level === 1 && sheet.xp >= 300, 'enough for level 2 (Level up on the sheet)');
    assert.equal((await C.loadSheet('Tove Emberfall')).xp, 400, 'the companion earned the combat share only');
});

test('layer 2 plays through: the mountain road, the Watchtower, the Outpost and its false stablemaster, the owlbear', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'kasimir', confirm: false });
    assert.equal(W.joinParty('Oona').ok, true);
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 999); W.endEncounter(); };
    // items go to the persona's sheet, which loads on first use: give it a moment
    const say = async (text) => { w.gametext_arr.push(text); await w.prepare_submit_generation(); await sleep(60); };

    // the mountain road: a night at the campfire brings wolves
    W.moveTo('bw_green'); W.go('Forest Road');
    W.setClock({ time: 'night' });
    W.go('Gravel Road');
    assert.ok(W.getCombat() && W.getCombat().active, 'wolves at the campfire at night');
    assert.deepEqual(plain(W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.name)).sort(), ['Dire Wolf', 'Wolf 1', 'Wolf 2']);
    beat();
    W.setClock({ time: 'morning' });
    W.go('Windgap Pass');
    assert.match(W.preview(), /Windgap Pass/);

    // the Outpost by the shepherds' trail: its people and quests
    W.go("Shepherds' Trail"); W.go("Traveler's Outpost");
    assert.equal(W.runtime.playerLocationId, 'op_stables', 'the trail comes in at the stables');
    assert.ok(W.acceptQuest('q_sick_mare'));
    W.go('north'); W.go('north');
    assert.equal(W.runtime.playerLocationId, 'op_common');
    W.go('east'); assert.ok(W.acceptQuest('q_kitchen_stores'));
    // gather on the Meadow Road, bring it back
    W.moveTo('loc_meadow_road');
    await say('You fill your arms. <give>Wild Garlic x3</give> <give>Feverfew x2</give>');
    assert.equal(W.questState('q_kitchen_stores'), 'complete'); assert.equal(W.questState('q_sick_mare'), 'complete');
    W.turnInQuest('q_kitchen_stores'); W.turnInQuest('q_sick_mare');

    // the Night Raid: at night in the yard
    assert.ok(W.acceptQuest('q_night_raid'));
    W.moveTo('op_yard'); W.setClock({ time: 'night' });
    assert.ok(W.getCombat() && W.getCombat().active, 'raiders come over the wall at night');
    beat();
    assert.equal(W.questState('q_night_raid'), 'complete');
    W.turnInQuest('q_night_raid');
    assert.ok(W.reputation().find(r => r.id === 'fac_reedcloaks').value < -100, 'killing Reedcloaks costs standing with them');
    W.setClock({ time: 'morning' });

    // the Old Watchtower: harpies, guards, the key, the prisoner
    assert.ok(W.acceptQuest('q_watchtower'));
    W.moveTo('loc_windgap'); W.go('Watchtower Ruin');
    assert.equal(W.runtime.playerLocationId, 'wt_gate');
    W.go('east'); W.go('south');
    assert.equal(W.runtime.playerLocationId, 'wt_guard');
    assert.ok(W.startSavedEncounter('enc_tower_guards')); beat();
    W.go('east'); assert.equal(W.runtime.playerLocationId, 'wt_guard', 'the cellar is locked');
    await say('Under the bedrolls: an iron key. <give>Iron Key</give>');
    W.door('unlock', 'east'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'wt_cellar');
    await say('"I am Corwin Lark," the prisoner whispers. <talk>Chained prisoner</talk>');
    assert.equal(W.questState('q_watchtower'), 'complete');
    assert.equal(W.joinParty('prisoner').ok, true, 'the prisoner comes along');
    W.turnInQuest('q_watchtower');

    // the Stablemaster: entering the stables unmasks the Doppelganger
    assert.ok(W.acceptQuest('q_stablemaster'));
    W.moveTo('op_yard'); W.go('south');
    assert.equal(W.runtime.flags.corwin_unmasked, true);
    assert.deepEqual(plain(W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.name)), ['Doppelganger']);
    assert.doesNotMatch(W.preview(), /- Corwin Lark \|/, 'the false stablemaster is gone from the people here');
    beat();
    assert.equal(W.questState('q_stablemaster'), 'complete');
    W.turnInQuest('q_stablemaster', 0);
    W.leaveParty('prisoner');
    assert.equal(W.phased('npc_prisoner').name, 'Corwin Lark', 'the real Corwin is home');

    // Harrowfield's sheep: the owlbear and the lamb
    W.moveTo('loc_meadow_road'); assert.ok(W.acceptQuest('q_lost_sheep'));
    W.go('Owlbear Hollow'); W.go('east');
    assert.ok(W.startSavedEncounter('enc_owlbear')); beat();
    W.go('east'); await say('Behind the rock: the lamb. <give>Lost Lamb</give>');
    assert.equal(W.questState('q_lost_sheep'), 'complete');
    W.turnInQuest('q_lost_sheep', 0);

    // Lanternport is reachable by both roads (its streets open with the next part)
    W.moveTo('op_yard'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'loc_lanternport');
});
