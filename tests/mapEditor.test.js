'use strict';
// R7 step 1 UI: dungeon/town nodes in the world editor (rooms hidden), the dungeon/town editor
// window over it (board, add/drag/resize rooms, connect, doors, inspector), close/cleanup.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHost, click, findButton, texts, selectNode, sleep } = require('./helpers/host');

async function uiHost(t) {
    const h = createHost(); t.after(h.close);
    h.window.KLITE_RPMod = { characters: [] };
    h.load('shell', 'worlds', 'worldsUI');
    await h.ready({ ui: true });
    await h.api().loadExample();
    return h;
}
const mouse = (w, el, type, x = 0, y = 0) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
const change = (w, el, value) => { el.value = value; el.dispatchEvent(new w.Event('change')); };
const byLabel = (root, label) => root.querySelector(`[aria-label="${label}"]`);

test('world editor: dungeon/town nodes with colour and room count, rooms hidden, kind picker', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    h.ui().openEditor();
    const ed = () => doc.getElementById('wm-editor');
    click(ed().querySelector('[data-add-kind="dungeon"]'), w);
    const crypt = W.activeWorld().locations.find(l => l.kind === 'dungeon');
    assert.ok(crypt, 'palette adds a dungeon');
    const r1 = W.addRoom(crypt.id, { name: 'Hall' }); W.addRoom(crypt.id, { name: 'Ossuary', near: r1.id, dir: 's' });
    h.ui().openEditor();   // reload the graph
    const node = doc.querySelector(`#wm-editor g[data-id="${crypt.id}"]`);
    assert.equal(node.getAttribute('data-kind'), 'dungeon');
    assert.match(node.textContent, /dungeon · 2 rooms/);
    assert.equal(doc.querySelector(`#wm-editor g[data-id="${r1.id}"]`), null, 'rooms are not drawn in the world graph');

    selectNode(h, 'loc_forest');
    const kind = byLabel(ed(), 'Location kind');
    assert.equal(kind.value, 'location');
    change(w, kind, 'town');
    assert.equal(W.locationKind('loc_forest'), 'town');
    assert.ok(findButton(ed(), /Open town editor/), 'container gets an editor button');
    // the Play tab / dropdowns name rooms with their dungeon
    selectNode(h, 'loc_village');
    assert.ok([...byLabel(ed(), 'Part of zone').options].some(o => o.text === 'New dungeon › Hall'));
});

test('dungeon editor: opens over the world editor, add/drag/resize/connect rooms, doors, delete', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    const crypt = W.addEntity('location', { name: 'Old Crypt' }); W.setLocationKind(crypt.id, 'dungeon');
    h.ui().openEditor();
    selectNode(h, crypt.id);
    click(findButton(doc.getElementById('wm-editor'), /Open dungeon editor/), w);
    const win = () => doc.querySelector('[data-window="mapeditor"]');
    const map = () => doc.getElementById('rpm-map-editor');
    assert.ok(win() && doc.querySelector('[data-window="editor"]'), 'both windows open');
    assert.match(win().querySelector('.rpm-window-title').textContent, /Dungeon editor — Old Crypt/);
    assert.equal(map().getAttribute('data-style'), 'stone');

    click(map().querySelector('[data-map="add"]'), w);
    const [a] = W.roomsOf(crypt.id);
    assert.equal(W.entityById(a).name, 'Room 1');
    click(map().querySelector('[data-map="add"]'), w);          // next to the selected room, connected
    const [, b] = W.roomsOf(crypt.id);
    assert.equal(W.exitsOf(b)[0].to, a, 'added beside the selection and connected');
    assert.equal(map().querySelectorAll('g[data-room]').length, 2);
    assert.equal(map().querySelectorAll('g[data-exit]').length, 1);

    // drag room b to the right, then resize it via the handle (the scale depends on "Fit",
    // so only the direction and the grid snapping are checked)
    const gB = () => map().querySelector(`g[data-room="${b}"]`);
    const before = { ...W.entityById(b).map };
    mouse(w, gB(), 'mousedown', 0, 0);
    w.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 90, clientY: 0 })); w.dispatchEvent(new w.MouseEvent('mouseup', {}));
    const after = W.entityById(b).map;
    assert.ok(after.x > before.x && Number.isInteger(after.x) && after.y === before.y, 'moved right on the grid');
    mouse(w, gB(), 'mousedown');
    w.dispatchEvent(new w.MouseEvent('mouseup', {}));
    const handle = map().querySelector(`[data-handle="${b}"]`);
    assert.ok(handle, 'resize handle on the selected room');
    mouse(w, handle, 'mousedown', 0, 0); w.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 200, clientY: 200 })); w.dispatchEvent(new w.MouseEvent('mouseup', {}));
    assert.ok(W.entityById(b).map.w > before.w, 'resized');

    // third room + Connect tool
    click(map().querySelector('[data-map="add"]'), w);
    const c = W.roomsOf(crypt.id)[2];
    W.removeExit(W.exitsOf(c).find(e => e.to === b).id);
    click(map().querySelector('[data-tool="connect"]'), w);
    mouse(w, map().querySelector(`g[data-room="${a}"]`), 'mousedown');
    mouse(w, map().querySelector(`g[data-room="${c}"]`), 'mousedown');
    const ex = W.exitsOf(a).find(e => e.to === c);
    assert.ok(ex && ex.type === 'door' && ['n', 'e', 's', 'w'].includes(ex.dir), 'dungeon connection = door with a direction');
    const card = map().querySelector(`[data-exitcard="${ex.id}"]`);
    assert.ok(card, 'the new connection is selected in the inspector');
    change(w, byLabel(card, 'Door state'), 'locked');
    assert.equal(W.doorState(ex.id), 'locked');
    assert.equal(map().querySelector(`g[data-exit="${ex.id}"]`).getAttribute('data-state'), 'locked', 'board shows the lock');
    change(w, byLabel(map().querySelector(`[data-exitcard="${ex.id}"]`), 'Secret DC'), '15');
    assert.equal(W.findExit(ex.id).exit.secretDC, 15);

    // room inspector: features, secret, light, encounter
    click(map().querySelector('[data-tool="select"]'), w);
    mouse(w, map().querySelector(`g[data-room="${c}"]`), 'mousedown'); w.dispatchEvent(new w.MouseEvent('mouseup', {}));
    const insp = () => map().querySelector('.rpm-map-insp');
    const name = byLabel(insp(), 'Room name'); name.value = 'Ossuary'; name.dispatchEvent(new w.Event('input'));
    assert.equal(W.entityById(c).name, 'Ossuary');
    assert.match(map().querySelector(`g[data-room="${c}"]`).textContent, /Ossuary/);
    change(w, byLabel(insp(), 'Light'), 'dark');
    assert.equal(W.entityById(c).light, 'dark');
    click(insp().querySelector('[data-feature="add"]'), w);
    const f = W.featuresOf(c)[0];
    assert.ok(f && f.kind === 'furniture');
    change(w, byLabel(insp(), 'Feature kind'), 'container');
    change(w, byLabel(insp(), 'Contains'), 'Silver Ring, Old Coin');
    assert.equal(JSON.stringify(W.entityById(f.id).contains), '["Silver Ring","Old Coin"]');
    byLabel(insp(), 'Monster').value = 'Skeleton'; byLabel(insp(), 'Count').value = '3';
    click(insp().querySelector('[data-monster="add"]'), w);
    const enc = W.listEncounters().find(e => e.locationId === c);
    assert.ok(enc && enc.monsters[0].count === 3, 'saved encounter in this room');
    // zone combat: the fighting space of the room, cover and zone of a feature
    assert.match(byLabel(insp(), 'Fighting space').options[0].text, /Automatic: large space/);
    change(w, byLabel(insp(), 'Fighting space'), 'small');
    assert.equal(W.entityById(c).combatSpace, 'small');
    change(w, byLabel(insp(), 'Fighting space'), '');
    assert.equal(W.entityById(c).combatSpace, undefined);
    assert.match(byLabel(insp(), 'Cover').options[0].text, /automatic \(none\)/, 'a container gives no cover by default');
    change(w, byLabel(insp(), 'Cover'), 'half');
    assert.equal(W.entityById(f.id).cover, 'half');
    change(w, byLabel(insp(), 'Zone'), 'n');
    assert.equal(W.entityById(f.id).zone, 'n');
    const sec = byLabel(insp(), 'Secret room'); sec.checked = true; sec.dispatchEvent(new w.Event('change'));
    assert.equal(W.entityById(c).secret, true);
    assert.ok(W.hasUnsavedChanges(), 'unsaved state shown');
    assert.match(map().querySelector('[data-save="map"]').textContent, /Save •/);

    // delete the room (with its features)
    click(insp().querySelector('[data-room="delete"]'), w);
    assert.equal(W.entityById(c), null);
    assert.ok(!W.activeWorld().objects.some(o => o.id === f.id));

    // back to the world: closes the map editor, room count updated in the graph
    click(map().querySelector('[data-crumb="world"]'), w);
    assert.equal(win(), null);
    assert.match(doc.querySelector(`#wm-editor g[data-id="${crypt.id}"]`).textContent, /2 rooms/);
});

test('dungeon editor: double-click opens it, nested level, town style, closes with the world editor', async (t) => {
    const h = await uiHost(t); const w = h.window; const doc = w.document; const W = h.api();
    const town = W.addEntity('location', { name: 'Millbrook Town' }); W.setLocationKind(town.id, 'town');
    const market = W.addRoom(town.id, { name: 'Market' });
    const under = W.addRoom(town.id, { name: 'Undercity', near: market.id, dir: 's', kind: 'dungeon' });
    W.addRoom(under.id, { name: 'Sewer' });
    h.ui().openEditor();
    const g = doc.querySelector(`#wm-editor g[data-id="${town.id}"]`);
    g.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
    const map = () => doc.getElementById('rpm-map-editor');
    assert.ok(map(), 'double-click opens the town editor');
    assert.equal(map().getAttribute('data-kind'), 'town');
    assert.match(findButton(map(), /Add place/).textContent, /Add place/);
    assert.equal(W.exitsOf(market.id)[0].type, 'open', 'town connections are open by default');
    const style = byLabel(map(), 'Map style');
    change(w, style, 'plots');
    assert.equal(map().getAttribute('data-style'), 'plots');

    map().querySelector(`g[data-room="${under.id}"]`).dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
    assert.match(texts(map().querySelector('.rpm-map-crumbs')).join(' '), /Millbrook Town/);
    assert.ok(map().querySelector('[data-crumb]:not([data-crumb="world"])'), 'breadcrumb back to the town');
    assert.equal(map().querySelectorAll('g[data-room]').length, 1, 'the nested level shows its own rooms');
    click(map().querySelector(`[data-crumb="${town.id}"]`), w);
    assert.equal(map().querySelectorAll('g[data-room]').length, 2);

    await W.saveActiveWorld();   // unsaved changes would keep the world editor open (it asks)
    h.ui().closeEditor();
    await sleep(0);
    assert.equal(doc.querySelector('[data-window="mapeditor"]'), null, 'map editor closes with the world editor');
    w.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 3, clientY: 3 }));   // listeners removed
});
