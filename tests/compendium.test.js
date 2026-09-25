'use strict';
// R3: the SRD 5.2.1 compendium — extracted data (rules glossary, magic items, tools and gear), the
// search index, the Compendium window (search, open, add a monster to an encounter, fight it) and the
// cross-links from the sheet, the Combat window and the encounter inspector.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, sleep, click, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const CP = requireSrc('src/compendium/rules.js');
const { COMPENDIUM } = requireSrc('src/data/srd52-compendium.js');
const { SRD } = requireSrc('src/data/srd52.js');

test('data: glossary, magic items, tools and gear extracted from the SRD 5.2.1', () => {
    const G = COMPENDIUM.glossary, M = COMPENDIUM.magicItems, E = COMPENDIUM.gear;
    assert.ok(Object.keys(G).length >= 150, 'the rules glossary');
    assert.ok(Object.keys(M).length >= 250, 'the magic items A–Z');
    assert.ok(Object.keys(E).length >= 100, 'tools and adventuring gear');
    for (const [k, e] of [...Object.entries(G), ...Object.entries(M), ...Object.entries(E)]) {
        assert.ok(e.name && !/[.:]$/.test(e.name), `a clean name: ${k} "${e.name}"`);
        assert.ok(Array.isArray(e.text) && e.text.join('').length > 10, `text for ${k}`);
        assert.doesNotMatch(e.text.join(' '), /System Reference Document 5\.2\.1/, `no running header in ${k}`);
    }
    // every SRD condition has its glossary entry with the tag
    for (const c of Object.keys(SRD.conditions)) assert.equal(G[c.toLowerCase()] && G[c.toLowerCase()].tag, 'Condition', c);
    assert.match(G['long-rest'].text[0], /at least 8 hours/);
    assert.deepEqual([G.cone.tag, G['climb-speed'].name, G.hide.tag], ['Area of Effect', 'Climb Speed', 'Action']);
    assert.deepEqual([M['bag-of-holding'].category, M['bag-of-holding'].rarity, M['bag-of-holding'].attunement], ['Wondrous Item', 'Uncommon', false]);
    assert.equal(M['amulet-of-proof-against-detection-and-location'].attunement, true, 'a name wrapped over two lines');
    assert.equal(M['armor-1-2-or-3'].category, 'Armor');
    assert.match(M['vorpal-sword'].type, /Legendary \(Requires Attunement\)/);
    assert.deepEqual([E.acid.cost, E.acid.weight, E.acid.kind], ['25 GP', '1 lb.', 'gear']);
    assert.deepEqual([E['thieves-tools'].kind, E['thieves-tools'].ability], ['tool', 'Dexterity']);
    assert.ok(E.torch && E.waterskin, 'gear up to the end of the list');
});

test('search: names first, then summaries, then the text; entries; attribution', () => {
    const ix = CP.index();
    const count = (k) => ix.filter(e => e.kind === k).length;
    assert.deepEqual([count('monster'), count('spell')], [330, 339]);
    assert.equal(count('equipment'), Object.keys(SRD.weapons).length + Object.keys(SRD.armor).length + Object.keys(COMPENDIUM.gear).length);
    const top = (q, k) => CP.search(q, k, 3).map(e => e.kind + ':' + e.name);
    assert.equal(top('fireball')[0], 'spell:Fireball');
    assert.equal(top('Goblin Warrior')[0], 'monster:Goblin Warrior');
    assert.equal(top('prone')[0], 'rule:Prone');
    assert.equal(top('bag of holding')[0], 'item:Bag of Holding');
    assert.equal(top('longsword')[0], 'equipment:Longsword');
    assert.ok(CP.search('cr 1/4', 'monster').some(e => e.name === 'Goblin Warrior'), 'CR in the summary line');
    assert.ok(CP.search('half as much damage', 'spell').some(e => e.name === 'Fireball'), 'full text for longer queries');
    assert.equal(CP.search('xyzzy').length, 0);
    assert.equal(CP.find('fire bolt').key, 'fire-bolt');
    assert.equal(CP.entry('monster', 'goblin-warrior').data.ac, 15);
    assert.equal(CP.entry('equipment', 'weapon:Longsword').data.damage, '1d8');
    assert.equal(CP.entry('equipment', 'gear:acid').name, 'Acid');
    assert.equal(CP.entry('spell', 'nope'), null);
    assert.equal(CP.ATTRIBUTION, SRD.attribution);
    assert.match(CP.ATTRIBUTION, /^This work includes material from the System Reference Document 5\.2\.1/);
});

async function host(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    h.load('bundle'); await h.ready({ ui: true });
    const w = h.window;
    for (let i = 0; i < 100 && !w.KLITE_RPMod_Shell.views().includes('compendium'); i++) await sleep(20);
    return { h, w, W: h.api(), doc: w.document };
}
const win = (doc) => doc.querySelector('[data-window="compendium"]');

test('Compendium window: search a monster, open it, add it to an encounter, fight it; spells and rules', async (t) => {
    const { h, w, W, doc } = await host(t);
    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    const dock = doc.querySelector('[data-action="compendium"], [data-dock-action="compendium"]');
    assert.ok(dock, 'a right-dock button');
    click(dock, w); await sleep(20);
    assert.ok(win(doc), 'the window opens');
    const $ = (s) => win(doc).querySelector(s);
    assert.match($('[data-cmp="attribution"]').textContent, /Creative Commons Attribution 4\.0/);
    const q = $('[data-cmp="search"]'); q.value = 'goblin warrior'; q.dispatchEvent(new w.Event('input'));
    click($('[data-cmp-hit="monster:goblin-warrior"]'), w); await sleep(10);
    assert.match($('[data-cmp="detail"]').textContent, /Goblin Warrior[\s\S]*AC 15[\s\S]*Scimitar/);
    click($('[data-cmp="add-to-encounter"]'), w); await sleep(10);
    let enc = W.listEncounters();
    assert.equal(enc.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(enc[0].monsters)), [{ key: 'goblin-warrior', count: 1 }]);
    assert.match($('[data-cmp="msg"]').textContent, /Added to "Goblin Warrior encounter"/);
    const sel = $('[data-cmp="encounter"]'); sel.value = enc[0].id; sel.dispatchEvent(new w.Event('change'));
    click($('[data-cmp="add-to-encounter"]'), w); await sleep(10);
    enc = W.listEncounters();
    assert.equal(enc.length, 1); assert.equal(enc[0].monsters[0].count, 2, 'added to the chosen encounter');
    h.seedRandom([0.5]);
    click($('[data-cmp="fight-now"]'), w); await sleep(20);
    assert.ok(W.getCombat() && W.getCombat().active); assert.ok(doc.querySelector('[data-window="combat"]'));
    W.endEncounter();

    w.KLITE_RPMod_Compendium.open('Fireball'); await sleep(10);
    assert.match($('[data-cmp="detail"]').textContent, /Fireball[\s\S]*Level 3 Evocation[\s\S]*150 feet[\s\S]*Using a Higher-Level Spell Slot/);
    click($('[data-cmp-kind="rule"]'), w); await sleep(10);
    const q2 = $('[data-cmp="search"]'); q2.value = 'exhaustion'; q2.dispatchEvent(new w.Event('input'));
    assert.ok($('[data-cmp-hit="rule:exhaustion"]')); assert.equal($('[data-cmp-hit^="spell:"]'), null, 'kind filter');
    w.KLITE_RPMod_Compendium.open({ kind: 'item', key: 'bag-of-holding' }); await sleep(10);
    assert.match($('[data-cmp="detail"]').textContent, /Wondrous Item, Uncommon/);
    // untrusted-free: all text, no markup from the data
    assert.equal(win(doc).querySelectorAll('script').length, 0);
});

test('cross-links: sheet spells and the monster list of the Combat window open the compendium', async (t) => {
    const { h, w, W, doc } = await host(t);
    const C = w.KLITE_RPMod_Characters;
    await w.__addEsoCharacter('Mira', { description: 'A cleric.' });
    await C.saveSheet('Mira', { className: 'Cleric', level: 1, abilities: { wis: 14 }, spellcasting: { ability: 'wis', slots: [2], cantripsKnown: ['sacred-flame'], preparedSpells: ['bless'] } });
    C.open('Mira'); await sleep(40);
    const link = doc.querySelector('[data-window="sheet"] [data-compendium="spell:sacred-flame"]');
    assert.ok(link, 'the spell text has the link');
    click(link, w); await sleep(20);
    assert.match(win(doc).querySelector('[data-cmp="detail"]').textContent, /Sacred Flame/);

    await W.newWorld('T'); W.addEntity('location', { name: 'Road' }); W.enable(); W.moveTo('Road');
    w.KLITE_RPMod_Shell.open('combat'); await sleep(40);
    const cwin = doc.querySelector('[data-window="combat"]');
    const s = cwin.querySelector('[data-cb="search"]'); s.value = 'wolf'; s.dispatchEvent(new w.Event('input'));
    click(cwin.querySelector('[data-cb="info-wolf"]'), w); await sleep(20);
    assert.match(win(doc).querySelector('[data-cmp="detail"]').textContent, /^[\s\S]*Wolf[\s\S]*Pack Tactics/);
});
