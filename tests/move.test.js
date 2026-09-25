'use strict';
// R7 step 2: moving room by room (exits, doors, refusals in the game log), the AI's room
// context (exits with directions and door states, moving hint, optional text map), <move>
// through the rules, tags parsed when the reply arrives (known issue 12), mini-map + Map window.
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
const MR = requireSrc('src/game/map-rules.js');

// Forest Road → Old Crypt: Entrance -(closed door, e)- Hall -(locked iron door, s)- Ossuary,
// Hall -(secret door, e)- Vault (secret room). Entrance has the way out (w) to Forest Road.
function buildCrypt(W) {
    const crypt = W.addEntity('location', { name: 'Old Crypt' }); W.setLocationKind(crypt.id, 'dungeon');
    const ent = W.addRoom(crypt.id, { name: 'Entrance' });
    const hall = W.addRoom(crypt.id, { name: 'Hall', near: ent.id, dir: 'e' });
    W.updateEntity(hall.id, { light: 'dim' });
    const oss = W.addRoom(crypt.id, { name: 'Ossuary', near: hall.id, dir: 's', connect: false });
    const lock = W.addExit(hall.id, oss.id, { door: { state: 'locked', material: 'iron' } });
    const vault = W.addRoom(crypt.id, { name: 'Vault', near: hall.id, dir: 'e', connect: false, secret: true });
    const secret = W.addExit(hall.id, vault.id, { type: 'secret', secretDC: 15 });
    const out = W.addExit(ent.id, 'loc_forest', { type: 'open', dir: 'w' });
    const trap = W.addFeature(hall.id, { name: 'Pressure plate', kind: 'trap', trapDC: 12 });
    W.addFeature(hall.id, { name: 'Brazier', kind: 'light', lit: true });
    return { crypt, ent, hall, oss, vault, lock, secret, out, trap };
}
async function host(t, opts = {}) {
    const h = createHost(); t.after(h.close);
    if (opts.reply) h.window.handle_incoming_text = (txt) => { h.window.gametext_arr.push(txt); };
    h.load(...(opts.ui ? ['shell', 'gamelog', 'worlds', 'worldsUI'] : ['gamelog', 'worlds']));
    await h.ready({ ui: !!opts.ui });
    await h.api().loadExample();
    return h;
}
const logText = (w) => w.KLITE_RPMod_Log.entries().map(e => e.what).join('\n');

test('rules: direction words, name keys, text map', () => {
    assert.equal(MR.parseDir('north'), 'n'); assert.equal(MR.parseDir('the east door'), 'e'); assert.equal(MR.parseDir('downstairs'), 'down');
    assert.equal(MR.parseDir('Ossuary'), null);
    assert.equal(MR.nameKey('The Ossuary!'), 'ossuary');
    const txt = MR.asciiMap([{ id: 'a', name: 'Entrance', rect: { x: 0, y: 0, w: 4, h: 3 } }, { id: 'b', name: 'Hall', rect: { x: 5, y: 0, w: 4, h: 3 } }, { id: 'c', name: 'Ossuary', rect: { x: 5, y: 4, w: 4, h: 3 } }],
        [['a', 'b'], ['b', 'c']], 'b');
    assert.equal(txt, '[1]-[@]\n     |\n    [2]\n1 Entrance · @ Hall (you are here) · 2 Ossuary');
});

test('go: enter from outside, doors open, locked refuses (logged), secrets unknown, leave by the way out', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api();
    const d = buildCrypt(W);
    W.moveTo('Millbrook Village');
    // from a place with no way to the crypt: travelling to the dungeon enters at its entrance
    let r = W.go('Old Crypt', { source: 'ui' });
    assert.ok(r.ok); assert.equal(W.runtime.playerLocationId, d.ent.id, 'arrive at the entrance room');
    assert.match(logText(w), /Goes to Old Crypt \(Entrance\)/);
    // a deep room cannot be reached from outside / not by a known exit
    W.moveTo('Forest Road');
    r = W.go('Ossuary');
    assert.equal(r.ok, false); assert.match(r.reason, /no known way from Forest Road to Old Crypt \(Ossuary\)/);
    assert.match(logText(w), /Move to Ossuary refused/);
    // Forest Road → Entrance by the drawn way; then east through the closed door
    assert.ok(W.go('Old Crypt').ok);
    r = W.go('east', { source: 'ui' });
    assert.ok(r.ok && r.opened, 'closed door opened');
    assert.equal(W.doorState(W.exitsOf(d.hall.id).find(e => e.to === d.ent.id).id), 'open');
    assert.match(logText(w), /Opens the door and goes east to Hall/);
    // locked iron door refuses; the player stays
    r = W.go('Ossuary');
    assert.equal(r.ok, false); assert.equal(W.runtime.playerLocationId, d.hall.id);
    assert.match(logText(w), /Move to Ossuary refused: the iron door is locked\./);
    // unfound secret: no way; once found (and the door open) it works
    assert.equal(W.go('Vault').ok, false);
    W.markFound('secret', d.secret.id); W.markFound('secret', d.vault.id);
    assert.ok(W.go('Vault').ok);
    // leaving: only through a way out
    assert.equal(W.go('Millbrook Village').ok, false, 'no way out from the vault');
    W.go('Hall'); W.go('west');
    assert.ok(W.go('Forest Road').ok, 'the entrance leads out');
    assert.equal(W.exploration().explored[d.ent.id], 'visited');
    assert.equal(W.go('Nowhere Land').ok, false);
    // unlocked in the story → the move goes through
    W.go('Old Crypt'); W.go('east'); W.setDoorState(d.lock.id, 'closed');
    assert.ok(W.go('south').ok);
    assert.equal(W.exploration().explored[d.oss.id], 'visited');
});

test('AI context in a room: light, exits with directions and doors, visible features, moving hint, text map', async (t) => {
    const h = await host(t); const w = h.window; const W = h.api();
    const d = buildCrypt(W);
    W.moveTo('Hall');
    let s = W.preview();
    assert.match(s, /Light: dim/);
    assert.match(s, /Exits:\n- south: unexplored room \(locked iron door\)\n- west: unexplored room \(closed door\)/, 'directions and door states; unseen names hidden');
    W.go('west'); W.go('east');   // through the door: Entrance visited, its name known
    s = W.preview();
    assert.match(s, /Exits:\n- south: unexplored room \(locked iron door\)\n- west: Entrance \(open door\)/, 'exact names once seen');
    assert.doesNotMatch(s, /Vault|secret/i);
    assert.match(s, /Brazier \(lit\)/);
    assert.doesNotMatch(s, /Pressure plate/, 'unfound trap hidden');
    assert.match(s, /\[Exploring\][\s\S]*<go>name<\/go>[\s\S]*<search><\/search>[\s\S]*<room>Name, east/);
    assert.doesNotMatch(s, /\[Map \(explored\)\]/, 'text map off by default');
    W.markFound('trap', d.trap.id);
    assert.match(W.preview(), /Pressure plate \(trap\)/);
    // outside: the dungeon's room is named with the dungeon
    W.moveTo('Forest Road');
    assert.match(W.preview(), /Exits: [^\n]*Old Crypt \(Entrance\)/);
    assert.doesNotMatch(W.preview(), /\[Exploring\]/);
    // text map on request
    w.KLITE_RPMod_Settings = { get: (id) => id === 'map_ascii_ai', registerSetting() {}, onChange() {} };
    W.moveTo('Hall');
    assert.match(W.preview(), /\[Map \(explored\)\]\n\[1\]-\[@\][\s\S]*@ Hall \(you are here\)/);
});

test('<move> goes through the rules; tags apply when the reply arrives (known issue 12)', async (t) => {
    const h = await host(t, { reply: true }); const w = h.window; const W = h.api();
    const d = buildCrypt(W); W.enable();
    W.moveTo('Hall');
    W.config.advanceClockPerTurn = true;
    const day = { ...W.runtime.clock };
    w.handle_incoming_text('The heavy door will not budge. <move>Ossuary</move> <flag>tried=1</flag>');
    assert.equal(W.runtime.playerLocationId, d.hall.id, 'refused at once');
    assert.equal(W.runtime.flags.tried, 1, 'other tags applied on arrival');
    assert.match(logText(w), /Move to Ossuary refused: the iron door is locked/);
    assert.equal(W.runtime.clock.time, day.time, 'the clock does not advance on reply arrival');
    w.handle_incoming_text('You step back west. <move>west</move>');
    assert.equal(W.runtime.playerLocationId, d.ent.id, 'direction word works');
    // the next generation does not apply them twice
    const n = w.KLITE_RPMod_Log.entries().length;
    await w.prepare_submit_generation();
    assert.equal(w.KLITE_RPMod_Log.entries().length, n);
    assert.match(h.prompt, /Move to Ossuary refused/, 'the AI hears the refusal in the next turn');
    // plain world moves keep their old behaviour
    W.moveTo('Millbrook Village');
    W.applyTags('<move>The Crooked Kettle</move>');
    assert.equal(W.runtime.playerLocationId, 'loc_tavern');
});

test('mini-map: places as points, fog, you are here; clicks move only with Quick travel; refusal shown; Map window', async (t) => {
    const h = await host(t, { ui: true }); const w = h.window; const doc = w.document; const W = h.api();
    const d = buildCrypt(W);
    const sec = () => doc.querySelector('[data-section="minimap"]');
    W.moveTo('Forest Road'); await sleep(40);
    assert.ok(sec(), 'Map section in the left dock');
    // outside dungeons and towns: the known places as points (R8), no exit buttons
    const place = (id) => sec().querySelector(`g[data-place="${id}"]`);
    assert.ok(place('loc_forest').classList.contains('rpm-here'), 'you are here');
    assert.ok(place(d.crypt.id), 'the crypt you can go to is on the map');
    assert.ok(place(d.crypt.id).classList.contains('rpm-map-fog'), 'known, not yet visited: dashed');
    assert.ok(place('loc_watchtower'), 'a neighbour is known');
    assert.equal(place('loc_tavern'), null, 'places you do not know yet are not drawn');
    assert.equal(sec().querySelector('[data-go]'), null, 'no exit buttons any more');
    assert.equal(sec().querySelector('[data-map-search]'), null, 'no Search button (quick replies)');
    // without Quick travel the map is a view
    place(d.crypt.id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(W.runtime.playerLocationId, 'loc_forest', 'no move without Quick travel');
    const qt = sec().querySelector('[data-map-quick]');
    qt.checked = true; qt.dispatchEvent(new w.Event('change')); await sleep(30);
    place(d.crypt.id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(W.runtime.playerLocationId, d.ent.id, 'quick travel into the crypt');
    assert.match(logText(w), /Quick travel: the player skipped the journey and is now at Old Crypt \(Entrance\)|Quick travel: the player skipped the journey and is now at Entrance/);
    await sleep(40);
    const room = (id) => sec().querySelector(`g[data-room="${id}"]`);
    assert.equal(room(d.ent.id).getAttribute('data-explored'), 'here');
    assert.equal(room(d.hall.id).getAttribute('data-explored'), 'known', 'neighbour in fog (outline)');
    assert.equal(room(d.oss.id), null, 'unknown rooms not drawn');
    assert.equal(room(d.vault.id), null);
    room(d.hall.id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(W.runtime.playerLocationId, d.hall.id);
    await sleep(40);
    assert.ok(room(d.oss.id), 'the room behind the locked door is known now');
    assert.equal(room(d.vault.id), null, 'secret room still hidden');
    room(d.oss.id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await sleep(40);
    assert.equal(W.runtime.playerLocationId, d.hall.id);
    assert.match(sec().querySelector('.rpm-map-refused').textContent, /door is locked/);
    // Map window
    click(sec().querySelector('[data-map-open]'), w);
    const win = doc.querySelector('[data-window="map"]');
    assert.ok(win && win.querySelector(`g[data-room="${d.hall.id}"].rpm-here`), 'large map shows you are here');
    win.querySelector(`g[data-room="${d.ent.id}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.equal(W.runtime.playerLocationId, d.ent.id, 'move from the Map window');
    qt.checked = false; w.localStorage.removeItem('KLITE.map.quickTravel');
});

