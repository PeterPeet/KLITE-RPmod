'use strict';
// Character gallery (src/characters/gallery.js): full-screen window over Esolite's Library,
// cards with text on the image, filters/sort/sizes, detail page and actions.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, sleep } = require('./helpers/host');

async function galleryHost(t) {
    const h = createHost(); t.after(h.close);
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    h.load('bundle');
    await h.ready({ ui: true });
    const w = h.window;
    await w.__addEsoCharacter('Mira', { description: 'A ranger from the north. She trusts wolves.', tags: ['Female', 'Ranger'], creator: 'Peter',
        creator_notes: '<b>Wild</b> ranger <script>window.__pwned = 1</script><img src=x onerror="window.__pwned=2">' });
    await w.__addEsoCharacter('Bram', { description: 'The innkeeper of {{char}}\'s inn greets {{user}}.', tags: ['Male'], first_mes: 'Welcome!' });
    await w.__addEsoCharacter('Lia', { description: 'A bard.', tags: ['Female', 'Bard'] });
    return h;
}
const $ = (w, s) => w.document.querySelector(s);
const $$ = (w, s) => [...w.document.querySelectorAll(s)];

test('gallery: opens full screen; cards show name, creator, tagline, tags over the image; untrusted HTML is only text', async (t) => {
    const h = await galleryHost(t); const w = h.window;
    click($(w, '[data-action="gallery"]'), w);          // right-dock action
    await sleep(80);
    const win = $(w, '[data-window="gallery"]');
    assert.ok(win && win.classList.contains('rpm-maximized'), 'full screen by default');
    const cards = $$(w, '.rpm-gal-card');
    assert.deepEqual(cards.map(c => c.getAttribute('data-name')), ['Bram', 'Lia', 'Mira']);
    const mira = $(w, '.rpm-gal-card[data-name="Mira"]');
    assert.equal(mira.querySelector('.rpm-gal-name').textContent, 'Mira');
    assert.equal(mira.querySelector('.rpm-gal-creator').textContent, 'by Peter');
    assert.equal(mira.querySelector('.rpm-gal-tagline').textContent, 'Wild ranger', 'creator notes as plain text');
    assert.equal(w.__pwned, undefined, 'no script or handler ran');
    assert.equal(mira.querySelector('script, img[onerror]'), null);
    assert.deepEqual($$(w, '.rpm-gal-card[data-name="Mira"] .rpm-gal-tag').map(e => e.textContent), ['Female', 'Ranger']);
    assert.match($(w, '.rpm-gal-card[data-name="Bram"] .rpm-gal-tagline').textContent, /innkeeper of Bram's inn greets you/, '{{char}}/{{user}} filled in');

    // tag chips (counts), filter, search, sort, sizes
    await sleep(350);
    const chips = $$(w, '.rpm-gal-tags .rpm-gal-chip').map(c => c.textContent);
    assert.deepEqual(chips.slice(0, 3), ['All', 'Female 2', 'Bard 1']);
    click($$(w, '.rpm-gal-tags .rpm-gal-chip').find(c => c.textContent === 'Female 2'), w);
    assert.deepEqual($$(w, '.rpm-gal-card').map(c => c.getAttribute('data-name')), ['Lia', 'Mira']);
    click($$(w, '.rpm-gal-tags .rpm-gal-chip').find(c => c.textContent === 'All'), w);
    const search = $(w, '.rpm-gal-search'); search.value = 'innkeeper'; search.dispatchEvent(new w.Event('input'));
    assert.deepEqual($$(w, '.rpm-gal-card').map(c => c.getAttribute('data-name')), ['Bram']);
    search.value = ''; search.dispatchEvent(new w.Event('input'));
    click($$(w, '.rpm-gal-sizes .rpm-gal-chip').find(c => c.textContent === 'List'), w);
    assert.ok($(w, '.rpm-gal.rpm-gal-list'));
    assert.equal(JSON.parse(w.localStorage.getItem('KLITE.gallery')).size, 'list', 'view remembered');
});

test('gallery: detail page with the full card; actions use the Tools persona/character and the sheet', async (t) => {
    const h = await galleryHost(t); const w = h.window;
    const used = [];
    w.KLITE_RPMod.panels.TOOLS.usePersona = (c) => { used.push(['persona', c.name, c.description]); w.KLITE_RPMod.panels.TOOLS.selectedPersona = c; };
    w.KLITE_RPMod.panels.TOOLS.useCharacter = (c) => used.push(['ai', c.name]);
    w.KLITE_RPMod_Gallery.open('Bram');
    await sleep(80);
    const d = $(w, '.rpm-gal-detail');
    assert.ok(d, 'detail page');
    assert.equal(d.querySelector('.rpm-gal-title').textContent, 'Bram');
    const secs = $$(w, '.rpm-gal-sec > summary').map(s => s.textContent);
    assert.deepEqual(secs, ['Description', 'First message']);
    click(d.querySelector('[data-gal-action="persona"]'), w);
    assert.deepEqual(used[0], ['persona', 'Bram', 'The innkeeper of {{char}}\'s inn greets {{user}}.'], 'full card data passed on');
    await sleep(10);
    assert.match($(w, '.rpm-gal-detail [data-gal-action="persona"]').textContent, /Your persona/);
    click($(w, '.rpm-gal-detail [data-gal-action="ai"]'), w);
    assert.deepEqual(used[1], ['ai', 'Bram']);
    click($(w, '.rpm-gal-detail [data-gal-action="sheet"]'), w);
    await sleep(40);
    assert.ok($(w, '[data-window="sheet"]'), 'character sheet opens');
    click(findButton($(w, '.rpm-gal-detail'), /All characters/), w);
    assert.equal($(w, '.rpm-gal-detail'), null);
    const card = $(w, '.rpm-gal-card[data-name="Bram"]');
    assert.equal(card.querySelector('.rpm-gal-badge-you').textContent, 'You', 'persona badge');
});

test('Chars tab points to the gallery; gallery imports through Esolite and follows Library writes', async (t) => {
    const h = await galleryHost(t); const w = h.window;
    // the Chars panel (its panel is not built in jsdom: render + action directly)
    const CH = w.KLITE_RPMod.panels.CHARS;
    w.KLITE_RPMod.characters = [];   // the RP core's copy may lag; the tab reads the Library list
    w.__lib().find(m => m.name === 'Mira').favorite = true;
    const tab = w.document.createElement('div'); tab.innerHTML = CH.render();
    const launcher = [...tab.querySelectorAll('[data-action="open-gallery"]')];
    assert.match(launcher[0].textContent, /Open character gallery \(3\)/, 'launcher with the count');
    assert.deepEqual(launcher.slice(1).map(b => b.textContent), ['★ Mira', 'Bram', 'Lia'], 'favorites first');
    assert.equal(tab.querySelector('#char-gallery'), null, 'no second gallery grid in the tab');
    assert.ok(tab.querySelector('#char-upload-zone'), 'import zone kept');
    CH.actions['open-gallery']({ target: launcher[1] }); await sleep(80);
    assert.ok($(w, '[data-window="gallery"]'), 'gallery opened');
    assert.ok($(w, '.rpm-gal-detail'), 'on Mira\'s page');

    // Import: Esolite's file prompt + import function; Esolite saves asynchronously
    const prompted = [];
    w.promptUserForLocalFile = (cb, exts) => { prompted.push(exts); cb({ fileName: 'Kira.json', ext: '.json', plaintext: JSON.stringify({ spec: 'chara_card_v2', spec_version: '2.0', data: { name: 'Kira', description: 'A thief.' } }) }); };
    w.saveCharacterDataToIndexDB = (_img, data) => { setTimeout(() => w.__addEsoCharacter(data.data.name, data.data), 100); };
    w.KLITE_RPMod_Gallery.refresh();   // Esolite's prompt exists from the start in the real page
    const importBtn = $(w, '[data-gal-action="import"]');
    assert.ok(importBtn, 'Import button in the gallery bar');
    click(importBtn, w);
    assert.deepEqual(plainArr(prompted[0]), ['.png', '.webp', '.json']);
    await sleep(900);
    assert.ok($(w, '.rpm-gal-card[data-name="Kira"]'), 'new card shows once Esolite saved it');

    // an edit written through RPmod's Library adapter refreshes that card
    const L = w.KLITE_RPMod_Library; const r = await L.loadCharacter('Lia');
    await L.saveCharacter({ inner: Object.assign({}, r.data, { creator_notes: 'Sings of old wars.' }), oldName: 'Lia' });
    await sleep(80);
    assert.equal($(w, '.rpm-gal-card[data-name="Lia"] .rpm-gal-tagline').textContent, 'Sings of old wars.');
});
const plainArr = (a) => JSON.parse(JSON.stringify(a));
