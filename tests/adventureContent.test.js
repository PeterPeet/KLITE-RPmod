'use strict';
// R8 content: the starter adventure "The Drowned Lantern" — its package is valid, its pregens follow
// the character builder's rules, its shops can price everything, and layers 1–4 play through.
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

test('package: valid, no warnings (every place reachable, enough XP for level 5)', () => {
    const pkg = DL.drownedLantern();
    const r = AR.validateAdventure(pkg);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.stats.pregens, 4);
    assert.ok(r.stats.xp.perCharacter >= 6500, `all content together reaches level 5 (${r.stats.xp.perCharacter} XP)`);
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

    // Lanternport is reachable by both roads: the lake road enters at the Lake Gate (layer 3)
    W.moveTo('op_yard'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'lp_gate');
    W.moveTo('loc_windgap'); W.go('Lanternport');
    assert.equal(W.runtime.playerLocationId, 'lp_hilltop', 'the hill road comes down at the Hilltop');
});

test('layer 3 plays through: word to the mayor, the Lantern Fair (contests, cook-off, champion), whispers, the last night', async (t) => {
    const CH = requireSrc('src/chat/chat-rules.js');
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures; const C = w.KLITE_RPMod_Characters;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'oona', confirm: false });
    await sleep(50);
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 999); W.endEncounter(); };
    const say = async (text) => { w.gametext_arr.push(text); await w.prepare_submit_generation(); await sleep(60); };
    const log = () => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');
    const flag = (k) => W.runtime.flags[k];

    // the hook: after the Hollow Oak, Elder Holt sends word to Lanternport's mayor
    W.setQuestState('q_missing_carts', 'turnedin'); W.setQuestState('q_hollow_oak', 'turnedin');
    assert.ok(W.acceptQuest('q_word_lanternport'));
    W.moveTo('op_yard'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'lp_gate');
    assert.match(W.preview(), /Lake Gate & Market Square/);
    W.go('Guildhall & Counting House');
    await say('The mayor reads the letter. <talk>Mayor Isolde Varga</talk>');
    assert.equal(W.questState('q_word_lanternport'), 'complete');
    W.turnInQuest('q_word_lanternport');

    // B1: sign up (a ribbon from Nell, the Lantern in the guildhall) — the fair opens
    const r = W.go('Fairground');
    assert.ok(r.ok && r.via.length, 'walked through the town');
    assert.ok(W.acceptQuest('q_fair_signup'));
    await say('<talk>Nell</talk>'); W.go('Guildhall & Counting House'); W.go('Fairground');
    assert.equal(W.questState('q_fair_signup'), 'complete');
    W.turnInQuest('q_fair_signup');
    assert.equal(flag('fair_open'), true); assert.equal(flag('fair_day'), 1);
    const people = () => plain(W.here().people).map(p => p.id);
    assert.ok(people().includes('npc_baba'), 'Baba came to the fairground for the cook-off');

    // B2: a contest is a check objective RPmod rolls here, once a day; the Here row offers "Try"
    assert.ok(W.acceptQuest('q_contest_archery')); assert.ok(W.acceptQuest('q_contest_riddles'));
    const tries = CH.hereReplies(plain(W.here())).filter(x => x.kind === 'check').map(x => x.label);
    assert.deepEqual(tries.sort(), ['Try: Answer the riddle-keeper\'s three riddles (Intelligence)', 'Try: Hit the gold at the archery butts (Dexterity)']);
    h.seedRandom([0.99]);
    let res = W.tryObjective('Hit the gold at the archery butts');
    assert.ok(res.ok && res.success);
    assert.match(log(), /Hit the gold at the archery butts — Dexterity check \(DC 13\): \d+ \[d20 20[^\]]*\] — success\./);
    assert.equal(W.questState('q_contest_archery'), 'complete');
    W.turnInQuest('q_contest_archery');
    h.seedRandom([0.0]);
    res = W.tryObjective('The Riddle Tent');
    assert.ok(res.ok && !res.success, 'a natural 1');
    assert.equal(W.tryObjective('The Riddle Tent').ok, false, 'once a day');
    assert.match(log(), /try again tomorrow/);
    // the fair's days: a night, then the next morning
    W.setClock({ time: 'night' }); assert.equal(flag('fair_night1'), true);
    W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' }); assert.equal(flag('fair_day'), 2);
    h.seedRandom([0.99]);
    assert.ok(W.tryObjective('The Riddle Tent').success, 'a new day, a new try');
    W.turnInQuest('q_contest_riddles');
    // arm-wrestling at the Lamplighter, the boat race at the docks (Athletics)
    assert.ok(W.acceptQuest('q_contest_arms')); assert.ok(W.acceptQuest('q_contest_boats'));
    assert.equal(W.tryObjective('Arm-Wrestling at the Lamplighter').ok, false, 'not at the fairground: at the inn');
    W.go('The Lamplighter'); h.seedRandom([0.99]); assert.ok(W.tryObjective('Arm-Wrestling at the Lamplighter').success);
    W.go('Docks & Fish Market'); h.seedRandom([0.99]); assert.ok(W.tryObjective('The Boat Race').success);
    W.turnInQuest('q_contest_arms'); W.turnInQuest('q_contest_boats');
    // the champion: every contest won once
    assert.ok(W.acceptQuest('q_fair_champion'));
    await say('<talk>Magpie Marlow</talk>');
    W.turnInQuest('q_fair_champion', 0);
    await sleep(60);
    assert.ok(C.cachedSheet('Oona Greycairn').inventory.some(i => i.name === '+1 Longsword'), 'the champion\'s prize');
    // the cook-off: fish from the market, saffron from the alchemist
    assert.ok(W.acceptQuest('q_cookoff'));
    W.giveItem('Lake Fish', 2); W.giveItem('Lakeshore Saffron', 1); await sleep(30);
    assert.equal(W.questState('q_cookoff'), 'complete');
    W.turnInQuest('q_cookoff');

    // B3: whispers on the docks — toughs in Warehouse Row, three people to ask
    assert.ok(W.acceptQuest('q_whispers'));
    W.go('Warehouse Row');
    assert.ok(W.getCombat() && W.getCombat().active, 'someone does not like your questions');
    beat();
    await say('<talk>Old Fisk</talk> <talk>Jory</talk> <talk>Guildmaster Rashid Almeer</talk>');
    assert.equal(W.questState('q_whispers'), 'complete');
    W.turnInQuest('q_whispers');
    assert.equal(W.phased('fac_lanternport').phase, 'The truth is out');

    // B4: the last night — the third day's fireworks, in the guildhall
    assert.ok(W.acceptQuest('q_last_night'));
    W.setClock({ time: 'night' }); W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' });
    assert.equal(flag('fair_day'), 3);
    W.go('Guildhall & Counting House');
    assert.ok(!(W.getCombat() && W.getCombat().active), 'not before nightfall');
    W.setClock({ time: 'night' });
    assert.ok(W.getCombat() && W.getCombat().active, 'the thieves come with the fireworks');
    assert.ok(W.getCombat().order.some(o => o.name === 'Spy'));
    beat();
    assert.equal(W.questState('q_last_night'), 'complete');
    W.turnInQuest('q_last_night', 1);
    assert.equal(flag('lantern_saved'), true); assert.equal(flag('fair_over'), true);
    assert.match(W.questLocks('q_contest_archery').join(), /No longer: fair_over/, 'the contests end with the fair');
    W.go('Fairground');
    assert.ok(!people().includes('npc_baba'), 'Baba went home');
});

test('layer 4 plays through: the river to the hidden beach, the sea cave and its ledger, the Old Dam, the boat', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'pell', confirm: false });
    await sleep(50);
    assert.equal(W.joinParty('Oona').ok, true);
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 999); W.endEncounter(); };
    const say = async (text) => { w.gametext_arr.push(text); await w.prepare_submit_generation(); await sleep(60); };
    const ways = () => plain(W.here().ways).map(x => x.name);
    const fighting = () => !!(W.getCombat() && W.getCombat().active && !W.getCombat().outcome);
    const monsters = () => plain(W.getCombat().order.filter(o => o.kind === 'monster').map(o => o.name)).sort();

    // A4: the path along the river is hidden until searched for — or until Odo shows it
    for (const id of ['q_missing_carts', 'q_hollow_oak', 'q_old_coin']) W.setQuestState(id, 'turnedin');
    // (Pell's passive Perception, 16, would notice it on arrival: she knows this shore)
    assert.deepEqual(plain(W.hiddenIn('loc_river_ford')).map(c => c.id), ['ex_ford_beach'], 'a Search could find it');
    assert.ok(W.acceptQuest('q_follow_river'));
    assert.deepEqual(plain(W.hiddenIn('loc_river_ford')), [], 'Odo shows the way');
    W.moveTo('loc_river_ford');
    assert.ok(ways().includes('Hidden Beach'));
    W.go('Hidden Beach');
    assert.equal(W.runtime.playerLocationId, 'loc_hidden_beach');
    assert.ok(fighting(), 'giant crabs by day');
    assert.deepEqual(monsters(), ['Giant Crab 1', 'Giant Crab 2', 'Giant Crab 3', 'Giant Crab 4']);
    beat();
    assert.equal(W.questState('q_follow_river'), 'complete');
    W.turnInQuest('q_follow_river');
    W.setClock({ time: 'night' });
    assert.ok(fighting(), 'giant frogs at night');
    assert.deepEqual(monsters(), ['Giant Frog 1', 'Giant Frog 2', 'Giant Toad']);
    beat();
    W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' });

    // A5: the Reedcloaks' cave
    assert.ok(W.acceptQuest('q_reedcloak_cave'));
    assert.match(W.questLocks('q_stablemaster').join(), /stablemaster_suspected/);
    W.go('The Sea Cave');
    assert.equal(W.runtime.playerLocationId, 'sc_mouth');
    W.go('east'); assert.ok(W.startSavedEncounter('enc_cave_dock')); beat();
    W.go('south'); assert.ok(W.startSavedEncounter('enc_cave_bunks')); beat();
    await say('In a sea chest, on a string: a small brass key. <give>Brass Key</give>');
    W.go('north'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'sc_stores');
    await say('On a peg by the door hangs a heavy iron crank. <give>Sluice Crank</give>');
    W.go('north');
    assert.equal(W.runtime.playerLocationId, 'sc_captain');
    assert.ok(fighting(), 'Captain Vesna Kral waits in her cabin');
    assert.deepEqual(monsters(), ['Bandit 1', 'Bandit 2', 'Bandit Captain']);
    beat();
    await say('In the strongbox, wrapped in oilcloth: a ledger. <give>Reedcloak Ledger</give>');
    assert.equal(W.questState('q_reedcloak_cave'), 'complete');
    // the captain's bolt-hole to the lookout is a secret door
    assert.deepEqual(plain(W.hiddenIn('sc_captain')).map(c => c.id), ['ex_sc_lookout_cabin']);
    // the sorting room: behind a locked grille (the brass key); no Lantern there — it was never stolen
    W.go('south'); W.go('south');
    assert.equal(W.runtime.playerLocationId, 'sc_stores', 'the grille is locked');
    W.door('unlock', 'south'); W.go('south');
    assert.equal(W.runtime.playerLocationId, 'sc_relics');
    assert.ok(!fighting(), 'nobody waits with a Lantern');
    assert.match(W.preview(), /Relic tables/);
    assert.doesNotMatch(W.preview(), /Founders' Lantern/, 'the hidden Lantern stays hidden');
    W.turnInQuest('q_reedcloak_cave', 0);
    assert.equal(W.runtime.flags.ledger_read, true);
    assert.deepEqual(plain(W.questLocks('q_stablemaster')), [], 'the ledger names the stablemaster');
    assert.equal(W.phased('fac_reedcloaks').phase, 'Scattered');
    assert.equal(W.phased('npc_ashcombe').phase, 'Named in the ledger');

    // The Sluice: the crank back to the keeper of the Old Dam
    W.moveTo('loc_hidden_beach'); W.go('The Old Dam');
    assert.equal(W.runtime.playerLocationId, 'od_crest');
    assert.ok(W.startSavedEncounter('enc_dam_dredgers')); beat();
    W.go('east'); assert.equal(W.runtime.playerLocationId, 'od_sluice');
    assert.ok(plain(W.here().people).some(p => p.id === 'npc_anselm'));
    assert.ok(W.acceptQuest('q_sluice'));
    assert.equal(W.questState('q_sluice'), 'complete', 'the crank is already in the pack');
    W.turnInQuest('q_sluice');
    assert.equal(W.questState('q_sluice'), 'turnedin');
    W.go('down'); assert.match(W.preview(), /The wall of names/);

    // the boat: hired at Lanternport's docks, it rows to the hidden beach and back
    W.moveTo('lp_docks');
    assert.ok(!ways().includes('Hidden Beach'), 'no boat before it is hired');
    assert.ok(W.acceptQuest('q_hire_boat'));
    W.giveItem('Boat Passage', 1); await sleep(30);
    assert.equal(W.questState('q_hire_boat'), 'complete');
    W.turnInQuest('q_hire_boat');
    assert.equal(W.runtime.flags.boat_hired, true);
    assert.ok(ways().includes('Hidden Beach'), 'Ines rows you across');
    W.go('Hidden Beach'); assert.equal(W.runtime.playerLocationId, 'loc_hidden_beach');
    W.go('Lanternport'); assert.equal(W.runtime.playerLocationId, 'lp_docks', 'and back to the docks');
});

test('layer 4: the last night the other way — let the thieves take the Lantern and follow them to the sea cave', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures; const C = w.KLITE_RPMod_Characters;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'kasimir', confirm: false });
    await sleep(50);
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 999); W.endEncounter(); };
    const say = async (text) => { w.gametext_arr.push(text); await w.prepare_submit_generation(); await sleep(60); };
    const flag = (k) => W.runtime.flags[k];
    const fighting = () => !!(W.getCombat() && W.getCombat().active && !W.getCombat().outcome);

    // Kasimir (passive Perception 13) walks past the hidden path by the ford (DC 14)
    W.moveTo('loc_river_ford');
    assert.ok(!plain(W.here().ways).some(x => x.name === 'Hidden Beach'), 'the beach is not on the map');
    h.seedRandom([0.99]);
    assert.match(W.search().text, /found a hidden way \(south\)/, 'a path, not a "secret door"');
    assert.ok(plain(W.here().ways).some(x => x.name === 'Hidden Beach'), 'found by searching');

    // the fair is open and the whispers heard (layer 3 covers how)
    W.setQuestState('q_fair_signup', 'turnedin');
    assert.equal(flag('fair_day'), 1);
    W.setQuestState('q_whispers', 'turnedin');
    assert.equal(W.questState('q_last_night'), 'available'); assert.equal(W.questState('q_follow_thieves'), 'available');
    // choosing one plan closes the other
    assert.ok(W.acceptQuest('q_follow_thieves'));
    assert.equal(flag('follow_plan'), true);
    assert.match(W.questLocks('q_last_night').join(), /No longer: follow_plan/);
    assert.ok(!W.acceptQuest('q_last_night'), 'Dahl does not offer both');

    // the third night in the guildhall: the thieves take the Lantern, nobody fights
    W.moveTo('lp_guildhall');
    W.setClock({ time: 'night' }); W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' });
    W.setClock({ time: 'night' }); W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' });
    assert.equal(flag('fair_day'), 3);
    W.setClock({ time: 'night' });
    assert.ok(!fighting(), 'no fight in the hall');
    assert.equal(flag('lantern_stolen'), true); assert.equal(flag('fair_over'), true);
    assert.doesNotMatch(W.preview(), /The Founders' Lantern/, 'the plinth is empty');
    assert.match(W.preview(), /plinth where the Founders' Lantern stood is empty/);
    assert.equal(W.phased('loc_lanternport').phase, 'The Lantern stolen');
    assert.match(W.questLocks('q_contest_archery').join(), /No longer: fair_over/, 'the fair ends that night');

    // Dahl's watch boat: from the docks to the hidden beach, into the cave
    W.go('Docks & Fish Market');
    assert.ok(plain(W.here().ways).some(x => x.name === 'Hidden Beach'), 'the watch boat waits');
    W.setClock({ day: W.runtime.clock.day + 1, time: 'morning' });
    W.go('Hidden Beach'); if (fighting()) beat();
    W.go('The Sea Cave'); W.go('east'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'sc_stores');
    W.go('east'); W.go('south'); W.go('west');   // round by the grotto and the flooded passage
    assert.equal(W.runtime.playerLocationId, 'sc_relics');
    assert.ok(fighting(), 'Slate and his crew, with the Lantern');
    assert.ok(W.getCombat().order.some(o => o.name === 'Spy'));
    assert.match(W.preview(), /The Founders' Lantern/, 'the Lantern on the sorting table');
    beat();
    await say('The Lantern, still burning. <give>Founders\' Lantern</give>');
    assert.equal(W.questState('q_follow_thieves'), 'complete');
    W.turnInQuest('q_follow_thieves', 0);
    assert.equal(flag('lantern_recovered'), true); assert.equal(flag('lantern_saved'), true);
    assert.equal(W.phased('loc_lanternport').phase, 'The Lantern saved');
    assert.equal(W.phased('npc_ashcombe').phase, 'Found out');
    await sleep(60);
    const inv = C.cachedSheet('Kasimir Adeyemi').inventory.map(i => i.name);
    assert.ok(inv.includes('Bag of Holding'), 'the bigger reward');
    assert.ok(!inv.includes("Founders' Lantern"), 'the Lantern went back');
    W.moveTo('lp_guildhall');
    assert.match(W.preview(), /The Founders' Lantern/, 'back on its plinth');
    // more gold and a better prize than stopping it, less standing in town
    const reward = (id, type) => DL.drownedLantern().world.quests.find(q => q.id === id).rewards.filter(r => r.type === type);
    assert.ok(reward('q_follow_thieves', 'gold')[0].gold > reward('q_last_night', 'gold')[0].gold);
    assert.ok(reward('q_follow_thieves', 'reputation').find(r => r.factionId === 'fac_lanternport').amount < reward('q_last_night', 'reputation').find(r => r.factionId === 'fac_lanternport').amount);
});

test('XP balance: a typical playthrough (one companion) reaches level 5 in the Lost Chapel, not before', () => {
    const w = DL.drownedLantern().world; const CR = requireSrc('src/game/combat-rules.js');
    const qxp = (id) => { const q = w.quests.find(x => x.id === id); assert.ok(q, id); return q.rewards.filter(r => r.type === 'xp').reduce((a, r) => a + r.xp, 0); };
    const exp = (id) => { const e = w.encounters.find(x => x.id === id); assert.ok(e, id); return e.monsters.reduce((a, m) => a + CR.MONSTERS[CR.findMonster(m.key)].xp * (m.count || 1), 0) / 2; };
    const level = (xp) => { let l = 1; while (l < 20 && xp >= CR.xpForLevel(l + 1)) l++; return l; };
    // the main line with the side quests on the way; no owlbear, no repeats, one way of each choice
    const stages = [
        ['layer 1', ['q_missing_carts', 'q_hollow_oak', 'q_old_coin', 'q_mill_rats'], ['enc_road_ambush', 'enc_mill_rats', 'enc_den_wolves', 'enc_den_lookout', 'enc_den_burrow', 'enc_den_rats', 'enc_den_chief'], 2],
        ['layer 2', ['q_sick_mare', 'q_kitchen_stores', 'q_night_raid', 'q_watchtower', 'q_stablemaster'], ['enc_campfire_wolves', 'enc_tower_bats', 'enc_tower_harpies', 'enc_tower_guards', 'enc_night_raid', 'enc_doppelganger'], 3],
        ['layer 3', ['q_word_lanternport', 'q_fair_signup', 'q_contest_archery', 'q_contest_arms', 'q_contest_riddles', 'q_contest_boats', 'q_cookoff', 'q_fair_champion', 'q_whispers', 'q_last_night'], ['enc_warehouse_toughs', 'enc_heist'], 4],
        ['layer 4', ['q_follow_river', 'q_reedcloak_cave', 'q_sluice'], ['enc_beach_crabs', 'enc_cave_dock', 'enc_cave_lookout', 'enc_cave_bunks', 'enc_cave_grotto', 'enc_cave_captain', 'enc_dam_dredgers'], 4],
        ['the chapel, before the hag', ['q_hag_wants', 'q_low_water', 'q_into_mere'], ['enc_lc_street', 'enc_lc_mill', 'enc_lc_houses', 'enc_lc_nave', 'enc_lc_ossuary', 'enc_lc_aldric'], 5],
        ['the end', ['q_drowned_light', 'q_light_rest', 'q_home'], ['enc_lc_hag'], 5],
    ];
    let xp = 0; const table = [];
    for (const [name, qs, es, want] of stages) {
        xp += qs.reduce((a, id) => a + qxp(id), 0) + es.reduce((a, id) => a + exp(id), 0);
        table.push(`${name}: ${xp} XP, level ${level(xp)}`);
        assert.equal(level(xp), want, table.join(' · '));
    }
    assert.ok(xp < CR.xpForLevel(6), 'never beyond level 5');
});

test('layer 5 plays through: what the hag wants, low water, the Lost Chapel, the light put out, home', async (t) => {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog(); h.installTavernTool();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window; const W = h.api(); const ADV = w.KLITE_RPMod_Adventures;
    w.restart_new_game = () => { w.gametext_arr = []; };
    for (let i = 0; i < 40 && !ADV.list().length; i++) await sleep(25);
    await ADV.start('drowned-lantern', { pregen: 'tove', confirm: false });
    await sleep(50);
    const beat = () => { for (const o of W.getCombat().order.filter(o => o.kind === 'monster')) W.damage(o.id, 999); W.endEncounter(); };
    const say = async (text) => { w.gametext_arr.push(text); await w.prepare_submit_generation(); await sleep(60); };
    const fighting = () => !!(W.getCombat() && W.getCombat().active && !W.getCombat().outcome);
    const flag = (k) => W.runtime.flags[k];
    const ways = () => plain(W.here().ways).map(x => x.name);

    for (const id of ['q_reedcloak_cave', 'q_sluice', 'q_last_night']) W.setQuestState(id, 'turnedin');
    W.setFlag('lantern_saved', true);
    // C1: the Lantern is lent, the long swim shown
    assert.ok(W.acceptQuest('q_hag_wants'));
    await say('<talk>Keeper Anselm Roe</talk> <talk>Sister Imani</talk>');
    W.turnInQuest('q_hag_wants'); await sleep(60);
    assert.equal(flag('lantern_lent'), true);
    assert.deepEqual(plain(W.hiddenIn('sc_flooded')), [], 'the long swim is known');
    W.moveTo('lp_guildhall'); assert.doesNotMatch(W.preview(), /The Founders' Lantern/, 'the Lantern left the guildhall with you');

    // low water: the winch at the sluice house
    assert.ok(W.acceptQuest('q_low_water'));
    W.moveTo('od_sluice'); h.seedRandom([0.99]);
    assert.ok(W.tryObjective('Low Water').success);
    W.turnInQuest('q_low_water');
    assert.equal(flag('low_water'), true);
    assert.equal(W.phased('loc_brindlewick').phase, 'The mill runs dry');
    W.moveTo('loc_hidden_beach');
    assert.ok(ways().some(n => /Lost Chapel/.test(n)), 'the causeway: ' + ways().join(', '));

    // C2 + C3 through the village and the chapel
    assert.ok(W.acceptQuest('q_into_mere'));
    W.go('The Lost Chapel'); if (fighting()) beat();
    assert.equal(W.runtime.playerLocationId, 'lc_causeway');
    W.go('east'); W.go('east'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'lc_narthex');
    await say('A grey figure bows. <talk>Brother Oswin</talk>');
    W.turnInQuest('q_into_mere');
    assert.ok(W.acceptQuest('q_drowned_light'));
    W.go('east'); W.go('south'); W.go('down');
    assert.equal(W.runtime.playerLocationId, 'lc_crypt');
    assert.ok(fighting() && W.getCombat().order.some(o => o.name === 'Wight'), 'Sir Aldric rises');
    beat();
    W.go('up'); W.go('north'); W.door('unlock', 'east'); W.go('east');
    assert.equal(W.runtime.playerLocationId, 'lc_sanctum', 'the Lantern opens the bronze doors');
    assert.ok(fighting() && W.getCombat().order.some(o => o.name === 'Green Hag'), 'Mother Reedwater');
    beat();
    assert.equal(W.questState('q_drowned_light'), 'complete');
    W.turnInQuest('q_drowned_light');

    // the choice: put out the light (closes "carry it home")
    assert.ok(W.acceptQuest('q_light_rest'));
    assert.ok(!W.acceptQuest('q_light_home'));
    h.seedRandom([0.99]);
    assert.ok(W.tryObjective('Let the Light Rest').success);
    await sleep(30);
    assert.equal(W.questState('q_light_rest'), 'complete');
    W.turnInQuest('q_light_rest');
    assert.equal(flag('lantern_doused'), true); assert.equal(flag('chapel_done'), true);
    assert.equal(W.phased('npc_oswin').gone, true, 'Oswin rests');

    // C4: home
    assert.ok(W.acceptQuest('q_home'));
    await say('<talk>Mayor Isolde Varga</talk>');
    W.turnInQuest('q_home', 0);
    assert.equal(W.phased('loc_brindlewick').phase, 'Peace on the road');
    assert.equal(W.phased('loc_forest_road').phase, 'The road is safe');

    // the other way in: the long swim comes up in the cistern, where the drowned wait
    W.moveTo('sc_flooded'); W.go('down');
    assert.equal(W.runtime.playerLocationId, 'lc_cistern');
    assert.ok(fighting(), 'the drowned in the cistern');
});
