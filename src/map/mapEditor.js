// =============================================================================
// KLITE RPmod — Dungeon / town editor (R7): the inside of one dungeon or town, room by room
// -----------------------------------------------------------------------------
// A shell window ("mapeditor", large, flush) that opens over the world editor. The board is a
// grid RPmod draws itself (no map images, no tokens — not a VTT): rooms/places are
// rectangles in grid cells (drag to move, corner handle to resize), connections are drawn
// between them with a door marker (open/closed/locked/barred, secret, stairs). The Connect
// tool links two rooms; the direction follows where they sit. Inspector: the room (name,
// description, kind — a dungeon level opens its own map —, light, hazards, secret room),
// its exits and doors, features (furniture/containers/traps/lights = world objects in the
// room), inhabitants (world persons) and a saved encounter of SRD monsters; with nothing
// selected, the dungeon/town itself (name, description, style).
// Data: KLITE_RPMod_Worlds (addRoom/addExit/updateExit/setRoomRect/…, rules in
// src/game/map-rules.js). All DOM via createElement/textContent (world data is untrusted).
// Used by src/KLITE-RPmod_WorldsUI.js. Design: docs/design/R7-world-map.md.
// =============================================================================
import { el, clear, iconText } from '../shell/dom.js';
import { exitPoints, exitMarks } from './board.js';

const CELL = 28;                 // px per grid cell at 100 %
const SVGNS = 'http://www.w3.org/2000/svg';
const VIEW_ID = 'mapeditor';

const M = {
    mapId: null, selected: null, selectedExit: null, tool: 'select', linkFrom: null,
    scale: 1, tx: 40, ty: 40, drag: null, pan: null, board: null,
    root: null, svg: null, vp: null, gRooms: null, gExits: null, insp: null, saveBtn: null, crumbs: null,
    toast: (m) => { try { console.log(m); } catch (_) {} }, onClose: null,
};

function API() { return window.KLITE_RPMod_Worlds; }
function Shell() { return window.KLITE_RPMod_Shell; }
function MR() { return API().mapRules; }
function svg(tag, attrs) { const e = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); return e; }
function btn(text, onclick, opts = {}) {
    const cls = 'btn btn-primary rpm-btn' + (opts.variant ? ' rpm-' + opts.variant : '') + (opts.icon ? ' rpm-btn-icon' : '') + (opts.block ? ' rpm-block' : '');
    const b = opts.icon ? el('button', { type: 'button', class: cls, title: opts.title, 'aria-label': text ? null : opts.title, onclick }, [iconText(opts.icon, text)])
        : el('button', { type: 'button', class: cls, title: opts.title, text, onclick });
    if (opts.data) for (const [k, v] of Object.entries(opts.data)) b.setAttribute('data-' + k, v);
    return b;
}
function input(value, onChange, props = {}) {
    const i = el(props.area ? 'textarea' : 'input', Object.assign({ class: 'form-control rpm-input', type: props.area ? null : (props.type || 'text'), rows: props.area ? 3 : null }, props.attrs || {}));
    i.value = value == null ? '' : value;
    i.addEventListener(props.live ? 'input' : 'change', () => onChange(i.value));
    return i;
}
function select(options, value, onChange, attrs = {}) {
    const s = el('select', Object.assign({ class: 'form-control rpm-input' }, attrs));
    for (const [v, t] of options) { const o = el('option', { value: v, text: t }); if (String(v) === String(value == null ? '' : value)) o.selected = true; s.appendChild(o); }
    s.addEventListener('change', () => onChange(s.value));
    return s;
}
function lbl(t) { return el('label', { class: 'rpm-label', text: t }); }
function heading(t) { return el('div', { class: 'rpm-map-h', text: t }); }
function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ---- open / close ------------------------------------------------------------------------
export function openMapEditor(mapId) {
    const A = API(); if (!A || !A.entityById(mapId)) return false;
    M.mapId = mapId; M.selected = null; M.selectedExit = null; M.linkFrom = null;
    const sh = Shell(); if (!sh) return false;
    if (M.root) { rebuild(); fitSoon(); sh.open(VIEW_ID); }
    else sh.open(VIEW_ID);
    return true;
}
export function closeMapEditor() { const sh = Shell(); if (sh) sh.close(VIEW_ID); }
export function mapEditorState() { return { mapId: M.mapId, selected: M.selected, tool: M.tool }; }

export function registerMapEditor(sh, opts = {}) {
    if (opts.toast) M.toast = opts.toast;
    if (opts.onClose) M.onClose = opts.onClose;
    sh.registerView({ id: VIEW_ID, title: 'Dungeon / town editor', place: 'window',
        window: { large: true, flush: true, minWidth: 320, minHeight: 300, restore: false },
        mount, unmount });
    window.addEventListener('klite:worlds-dirty', updateSaveState);
}

function mount(container) {
    const A = API();
    if (!A || !M.mapId || !A.entityById(M.mapId)) {
        container.appendChild(el('div', { class: 'rpm-view-pad rpm-muted', text: 'Open a dungeon or town from the world editor (select it → "Open dungeon editor", or double-click it).' }));
        return;
    }
    container.appendChild(build());
    rebuild(); fitSoon();
}
function unmount() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    M.root = null; M.drag = null; M.pan = null; M.linkFrom = null; M.saveBtn = null;
    try { if (M.onClose) M.onClose(); } catch (_) {}
}

// ---- chrome --------------------------------------------------------------------------------
function build() {
    const root = el('div', { class: 'wm-editor rpm-map', id: 'rpm-map-editor' });
    M.crumbs = el('div', { class: 'rpm-map-crumbs' });
    M.addBtn = btn('Add room', () => addRoom(), { icon: 'plus', data: { map: 'add' } });
    M.toolBtns = ['select', 'connect'].map(t => btn(cap(t), () => setTool(t), { icon: t === 'select' ? 'mouse-pointer-2' : 'link-2', data: { tool: t }, title: t === 'select' ? 'Select, move and resize rooms' : 'Click two rooms to connect them' }));
    M.zoomLbl = el('span', { class: 'rpm-map-zoom', text: '100%' });
    M.saveBtn = btn('Save', async () => { await API().saveActiveWorld(); M.toast('World saved'); updateSaveState(); }, { variant: 'success', data: { save: 'map' } });
    const toolbar = el('div', { class: 'wm-ed-toolbar' }, [
        M.crumbs, el('div', { style: 'flex:1' }), M.addBtn, ...M.toolBtns,
        btn('−', () => zoom(1 / 1.15), { title: 'Zoom out' }), M.zoomLbl, btn('+', () => zoom(1.15), { title: 'Zoom in' }), btn('Fit', () => fit()),
        M.saveBtn,
    ]);
    const s = svg('svg', { class: 'wm-ed-canvas rpm-map-canvas', role: 'img', 'aria-label': 'Map board' });
    const defs = svg('defs');
    const pat = svg('pattern', { id: 'rpm-map-grid', width: CELL, height: CELL, patternUnits: 'userSpaceOnUse' });
    pat.appendChild(svg('path', { d: `M ${CELL} 0 L 0 0 0 ${CELL}`, class: 'rpm-map-gridline', fill: 'none' }));
    defs.appendChild(pat); s.appendChild(defs);
    const vp = svg('g');
    const bg = svg('rect', { x: -4000, y: -4000, width: 8000, height: 8000, fill: 'url(#rpm-map-grid)', class: 'rpm-map-bg' });
    M.gExits = svg('g'); M.gRooms = svg('g');
    vp.appendChild(bg); vp.appendChild(M.gExits); vp.appendChild(M.gRooms); s.appendChild(vp);
    s.addEventListener('mousedown', (ev) => { if (ev.target === s || ev.target === bg) onCanvasDown(ev); });
    s.addEventListener('wheel', onWheel, { passive: false });
    M.insp = el('div', { class: 'wm-ed-insp rpm-map-insp' });
    root.appendChild(toolbar);
    root.appendChild(el('div', { class: 'wm-ed-body' }, [s, M.insp]));
    M.root = root; M.svg = s; M.vp = vp;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return root;
}

function rebuild() {
    const A = API();
    A.layoutMap(M.mapId);                        // rooms without a position (automatic, not an edit)
    M.board = A.mapBoard(M.mapId);
    if (!M.board) return;
    if (M.selected && !M.board.rooms.some(r => r.id === M.selected)) M.selected = null;
    if (M.selectedExit && !M.board.exits.some(e => e.id === M.selectedExit)) M.selectedExit = null;
    const town = M.board.kind === 'town';
    M.root.setAttribute('data-kind', M.board.kind);
    M.root.setAttribute('data-style', M.board.style);
    M.addBtn.lastChild.textContent = town ? 'Add place' : 'Add room';
    renderCrumbs(); setTool(M.tool, true); draw(); renderInspector(); updateSaveState();
}

function renderCrumbs() {
    clear(M.crumbs);
    const A = API();
    const chain = []; let id = M.mapId, guard = 0;
    while (id && guard++ < 10) { chain.unshift(id); id = A.mapOf(id); }
    M.crumbs.appendChild(btn('World', () => closeMapEditor(), { icon: 'arrow-left', title: 'Back to the world editor', data: { crumb: 'world' } }));
    chain.forEach((cid, i) => {
        M.crumbs.appendChild(el('span', { class: 'rpm-muted', text: '›' }));
        const name = (A.entityById(cid) || {}).name || 'Map';
        if (i === chain.length - 1) M.crumbs.appendChild(el('span', { class: 'rpm-map-title', text: name }));
        else M.crumbs.appendChild(btn(name, () => openMapEditor(cid), { data: { crumb: cid } }));
    });
    const sh = Shell();
    try { const t = sh && document.querySelector(`[data-window="${VIEW_ID}"] .rpm-window-title`); if (t) t.textContent = (M.board.kind === 'town' ? 'Town editor — ' : 'Dungeon editor — ') + (M.board.name || ''); } catch (_) {}
}

function setTool(t, quiet) {
    M.tool = t; M.linkFrom = null;
    for (const b of M.toolBtns || []) b.classList.toggle('rpm-on', b.getAttribute('data-tool') === t);
    if (!quiet) draw();
}
function updateSaveState() {
    if (!M.saveBtn) return;
    const A = API(); const dirty = !!(A && A.hasUnsavedChanges && A.hasUnsavedChanges()), auto = !!(A && A.autosaveEnabled && A.autosaveEnabled());
    M.saveBtn.textContent = dirty ? (auto ? 'Saving…' : 'Save •') : 'Saved';
    M.saveBtn.classList.toggle('rpm-unsaved', dirty && !auto);
}

// ---- drawing -----------------------------------------------------------------------------
const px = (c) => c * CELL;
function roomById(id) { return M.board && M.board.rooms.find(r => r.id === id); }
function draw() {
    if (!M.board) return;
    clear(M.gExits); clear(M.gRooms);
    const R = MR();
    for (const e of M.board.exits) {
        const a = roomById(e.from), b = roomById(e.to); if (!a || !b) continue;
        const { p, q } = exitPoints(a.rect, b.rect, e.dir, CELL, R);
        const g = svg('g', { class: 'rpm-map-exit' + (e.id === M.selectedExit ? ' rpm-sel' : ''), 'data-exit': e.id, 'data-type': e.type, 'data-state': e.state });
        g.appendChild(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'rpm-map-hit' }));
        g.appendChild(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'rpm-map-link' + (e.secret ? ' rpm-map-secret' : '') + (e.type === 'corridor' ? ' rpm-map-corridor' : '') }));
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        exitMarks(g, e, mx, my);
        g.addEventListener('mousedown', (ev) => { ev.stopPropagation(); M.selected = null; M.selectedExit = e.id; draw(); renderInspector(); });
        M.gExits.appendChild(g);
    }
    for (const r of M.board.rooms) {
        const x = px(r.rect.x), y = px(r.rect.y), w = px(r.rect.w), h = px(r.rect.h);
        const g = svg('g', { class: 'rpm-map-room' + (r.id === M.selected ? ' rpm-sel' : '') + (r.id === M.linkFrom ? ' rpm-link' : '') + (r.secret ? ' rpm-map-secretroom' : '') + (r.origin === 'ai' ? ' rpm-map-airoom' : ''), 'data-room': r.id, 'data-kind': r.kind, 'data-origin': r.origin || null });
        g.appendChild(svg('rect', { x, y, width: w, height: h, rx: M.board.kind === 'town' ? 6 : 1, class: 'rpm-map-roomrect' }));
        const name = svg('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', class: 'rpm-map-name' });
        name.textContent = clip(r.name, Math.max(4, Math.floor(r.rect.w * 3.2)));
        g.appendChild(name);
        const sub = r.kind !== 'location' ? `${r.kind === 'town' ? 'town' : 'level'} · ${r.rooms}` : (r.light && r.light !== 'bright' ? r.light : '');
        if (sub) { const t = svg('text', { x: x + w / 2, y: y + h / 2 + 17, 'text-anchor': 'middle', class: 'rpm-map-sub' }); t.textContent = sub; g.appendChild(t); }
        if (r.here) g.appendChild(svg('circle', { cx: x + 9, cy: y + 9, r: 4, class: 'rpm-map-here' }));
        if (r.origin === 'ai') { const t = svg('text', { x: x + w - 5, y: y + 12, 'text-anchor': 'end', class: 'rpm-map-sub rpm-map-aibadge' }); t.textContent = 'AI'; const tt = svg('title'); tt.textContent = 'Added by the AI during play'; t.appendChild(tt); g.appendChild(t); }
        g.addEventListener('mousedown', (ev) => onRoomDown(ev, r.id));
        g.addEventListener('dblclick', () => { if (r.kind !== 'location') openMapEditor(r.id); });
        if (r.id === M.selected && M.tool === 'select') {
            const hd = svg('rect', { x: x + w - 7, y: y + h - 7, width: 10, height: 10, class: 'rpm-map-handle', 'data-handle': r.id });
            hd.addEventListener('mousedown', (ev) => { ev.stopPropagation(); M.drag = { id: r.id, resize: true, start: toCell(ev), rect: { ...r.rect }, moved: false }; });
            g.appendChild(hd);
        }
        M.gRooms.appendChild(g);
    }
    applyViewport();
}
function applyViewport() { if (M.vp) M.vp.setAttribute('transform', `translate(${M.tx},${M.ty}) scale(${M.scale})`); if (M.zoomLbl) M.zoomLbl.textContent = Math.round(M.scale * 100) + '%'; }
function zoom(f) { M.scale = Math.max(0.3, Math.min(3, M.scale * f)); applyViewport(); }
function fit() {
    if (!M.board || !M.svg) return;
    const b = MR().boardBounds(M.board.rooms.map(r => r.rect));
    const cw = M.svg.clientWidth || 700, ch = M.svg.clientHeight || 500;
    const W = px(b.w) + 2 * CELL, H = px(b.h) + 2 * CELL;
    M.scale = Math.max(0.3, Math.min(1.6, Math.min(cw / W, ch / H)));
    M.tx = (cw - W * M.scale) / 2 - px(b.x - 1) * M.scale;
    M.ty = (ch - H * M.scale) / 2 - px(b.y - 1) * M.scale;
    applyViewport();
}
function fitSoon() { setTimeout(() => { if (M.root) fit(); }, 30); }

// ---- interactions -------------------------------------------------------------------------
function toCell(ev) {
    const r = M.svg.getBoundingClientRect();
    return { x: (ev.clientX - r.left - M.tx) / M.scale / CELL, y: (ev.clientY - r.top - M.ty) / M.scale / CELL };
}
function onRoomDown(ev, id) {
    ev.stopPropagation();
    if (M.tool === 'connect') {
        if (!M.linkFrom) { M.linkFrom = id; draw(); return; }
        if (M.linkFrom !== id) {
            try { const ex = API().addExit(M.linkFrom, id); M.selectedExit = ex.id; M.selected = null; }
            catch (e) { M.toast(e.message || 'Cannot connect', true); }
        }
        M.linkFrom = null; rebuild(); return;
    }
    M.selected = id; M.selectedExit = null;
    const r = roomById(id);
    M.drag = { id, start: toCell(ev), rect: { ...r.rect }, moved: false };
    draw(); renderInspector();
}
function onCanvasDown(ev) {
    if (M.tool === 'connect') { M.linkFrom = null; draw(); return; }
    M.selected = null; M.selectedExit = null; draw(); renderInspector();
    M.pan = { x: ev.clientX, y: ev.clientY, tx: M.tx, ty: M.ty };
}
function onMove(ev) {
    if (M.drag) {
        const c = toCell(ev), r = roomById(M.drag.id); if (!r) return;
        const dx = Math.round(c.x - M.drag.start.x), dy = Math.round(c.y - M.drag.start.y);
        if (M.drag.resize) r.rect = { ...M.drag.rect, w: Math.max(1, M.drag.rect.w + dx), h: Math.max(1, M.drag.rect.h + dy) };
        else r.rect = { ...M.drag.rect, x: M.drag.rect.x + dx, y: M.drag.rect.y + dy };
        M.drag.moved = M.drag.moved || dx !== 0 || dy !== 0;
        draw();
    } else if (M.pan) {
        M.tx = M.pan.tx + (ev.clientX - M.pan.x); M.ty = M.pan.ty + (ev.clientY - M.pan.y); applyViewport();
    }
}
function onUp() {
    if (M.drag && M.drag.moved) { const r = roomById(M.drag.id); if (r) API().setRoomRect(r.id, r.rect); M.drag = null; rebuild(); }
    M.drag = null; M.pan = null;
}
function onWheel(ev) {
    ev.preventDefault();
    const r = M.svg.getBoundingClientRect(); const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const ns = Math.max(0.3, Math.min(3, M.scale * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)));
    M.tx = mx - (mx - M.tx) * (ns / M.scale); M.ty = my - (my - M.ty) * (ns / M.scale); M.scale = ns;
    applyViewport();
}
function addRoom() {
    const near = M.selected || null;
    const room = API().addRoom(M.mapId, near ? { near, dir: freeDir(near) } : {});
    M.selected = room.id; M.selectedExit = null; rebuild();
}
// First side of a room without a neighbour (for "Add room" next to the selection).
function freeDir(id) {
    const r = roomById(id); if (!r) return 'e';
    const others = M.board.rooms.filter(o => o.id !== id).map(o => o.rect);
    for (const d of ['e', 's', 'w', 'n']) { const c = MR().besideRect(r.rect, d); if (!others.some(o => MR().overlaps(c, o))) return d; }
    return 'e';
}

// ---- inspector ----------------------------------------------------------------------------
function renderInspector() {
    const box = M.insp; if (!box) return; clear(box);
    if (M.selectedExit) return renderExitOnly(box);
    if (!M.selected) return renderMapInfo(box);
    return renderRoom(box, M.selected);
}
function refreshAll() { rebuild(); }

function renderMapInfo(box) {
    const A = API(); const map = A.entityById(M.mapId); const town = M.board.kind === 'town';
    box.appendChild(heading(town ? 'Town' : 'Dungeon'));
    box.appendChild(lbl('Name'));
    box.appendChild(input(map.name, v => { A.updateEntity(M.mapId, { name: v }); renderCrumbs(); }, { attrs: { 'aria-label': 'Map name' } }));
    box.appendChild(lbl('Description'));
    box.appendChild(input(map.description, v => A.updateEntity(M.mapId, { description: v }), { area: true, attrs: { 'aria-label': 'Map description' } }));
    box.appendChild(lbl('Style'));
    box.appendChild(select(MR().STYLES[M.board.kind].map(s => [s, cap(s)]), M.board.style, v => { A.updateEntity(M.mapId, { mapStyle: v }); rebuild(); }, { 'aria-label': 'Map style' }));
    box.appendChild(el('p', { class: 'rpm-muted', style: 'margin-top:10px', text: `${M.board.rooms.length} ${town ? 'places' : 'rooms'}. ` +
        (town ? 'Add places (market, temple garden, guild, bathhouse …), then connect them with the Connect tool.' : 'Add rooms, then connect them with the Connect tool: click one room, then another. The direction follows where they sit; doors start closed.') +
        ' Drag a room to move it, drag its corner to resize. Double-click a dungeon level to open it.' }));
    if (M.board.outside.length) {
        box.appendChild(heading('Ways out'));
        for (const o of M.board.outside) box.appendChild(el('div', { class: 'rpm-muted', text: `${(roomById(o.room) || {}).name} → ${o.name}` }));
    }
}

function renderRoom(box, id) {
    const A = API(); const R = MR(); const room = A.entityById(id); if (!room) return;
    const town = M.board.kind === 'town';
    box.appendChild(heading(town ? 'Place' : 'Room'));
    if (room.origin === 'ai') box.appendChild(el('p', { class: 'rpm-muted', 'data-ai-room': '1', text: 'Added by the AI during play. Keep it, edit it, or delete it.' }));
    box.appendChild(lbl('Name'));
    box.appendChild(input(room.name, v => { A.updateEntity(id, { name: v }); const r = roomById(id); if (r) { r.name = v; draw(); } }, { live: true, attrs: { 'aria-label': 'Room name' } }));
    box.appendChild(lbl('Description'));
    box.appendChild(input(room.description, v => A.updateEntity(id, { description: v }), { area: true, attrs: { 'aria-label': 'Room description' } }));
    box.appendChild(lbl('Kind'));
    const kindOpts = [['location', town ? 'Place' : 'Room'], ['dungeon', 'Dungeon level (own map)'], ['town', 'Town district (own map)']];
    box.appendChild(select(kindOpts, R.kindOf(room), v => { A.setLocationKind(id, v); refreshAll(); }, { 'aria-label': 'Room kind' }));
    if (R.isContainer(room)) box.appendChild(btn(`Open ${R.kindOf(room) === 'town' ? 'district' : 'level'} (${A.roomsOf(id).length})`, () => openMapEditor(id), { icon: 'door-open', block: true, data: { open: id } }));
    box.appendChild(lbl('Light'));
    box.appendChild(select([['', '— not set —'], ...R.LIGHT.map(l => [l, cap(l)])], room.light || '', v => { A.updateEntity(id, { light: v || undefined }); refreshAll(); }, { 'aria-label': 'Light' }));
    box.appendChild(lbl('Hazards (comma separated, e.g. fire, water)'));
    box.appendChild(input((room.hazards || []).join(', '), v => A.updateEntity(id, { hazards: v.split(',').map(s => s.trim()).filter(Boolean) }), { attrs: { 'aria-label': 'Hazards' } }));
    const sw = el('label', { class: 'rpm-map-check' });
    const sc = el('input', { type: 'checkbox', 'aria-label': 'Secret room' }); sc.checked = !!room.secret;
    sc.addEventListener('change', () => { A.updateEntity(id, { secret: sc.checked || undefined }); refreshAll(); });
    sw.appendChild(sc); sw.appendChild(document.createTextNode(' Secret room (unknown to the player and the AI until found)'));
    box.appendChild(sw);

    // exits
    box.appendChild(heading('Exits'));
    const exits = A.exitsOf(id);
    if (!exits.length) box.appendChild(el('div', { class: 'rpm-muted', text: 'None yet — use the Connect tool.' }));
    for (const e of exits) box.appendChild(exitCard(id, e));
    // a way out to the world (e.g. the dungeon entrance on the forest road)
    const outside = A.getGraph().nodes.filter(n => n.type === 'location' && !n.mapId && n.id !== M.mapId && !exits.some(e => e.to === n.id));
    if (outside.length) {
        const s = select([['', '— add a way out to … —'], ...outside.map(n => [n.id, n.name])], '', v => { if (!v) return; try { A.addExit(id, v, { type: 'open' }); } catch (e) { M.toast(e.message, true); } refreshAll(); }, { 'aria-label': 'Add a way out' });
        box.appendChild(s);
    }

    // features
    box.appendChild(heading('Features'));
    for (const f of A.featuresOf(id).filter(o => R.FEATURE_KINDS.includes(o.kind))) box.appendChild(featureCard(f));
    box.appendChild(btn('Add feature', () => { A.addFeature(id, { name: 'Feature', kind: 'furniture' }); renderInspector(); }, { icon: 'plus', data: { feature: 'add' } }));

    // inhabitants
    box.appendChild(heading('Inhabitants'));
    const g = A.getGraph();
    const persons = g.nodes.filter(n => n.type === 'npc');
    const here = persons.filter(n => (A.entityById(n.id) || {}).homeLocationId === id);
    for (const p of here) box.appendChild(el('div', { class: 'rpm-card rpm-row' }, [
        el('span', { class: 'rpm-grow', text: p.name }),
        el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Moves out', 'aria-label': 'Remove ' + p.name, text: '×', onclick: () => { A.disconnect(p.id, id); renderInspector(); } }),
    ]));
    const others = persons.filter(n => !here.includes(n));
    if (others.length) box.appendChild(select([['', '— a person lives here … —'], ...others.map(n => [n.id, n.name])], '', v => { if (v) { A.connect(v, id); renderInspector(); } }, { 'aria-label': 'Add inhabitant' }));
    // encounter: SRD monsters saved as an encounter at this room
    const encs = A.listEncounters().filter(e => e.locationId === id);
    for (const enc of encs) box.appendChild(el('div', { class: 'rpm-card rpm-row', 'data-encounter': enc.id }, [
        el('span', { class: 'rpm-grow', text: `${enc.name}: ` + enc.monsters.map(m => `${m.count}× ${m.key}`).join(', ') }),
        el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Delete encounter', 'aria-label': 'Delete encounter ' + enc.name, text: '×', onclick: () => { A.deleteEncounter(enc.id); renderInspector(); } }),
    ]));
    const mIn = el('input', { type: 'text', class: 'form-control rpm-input rpm-grow', placeholder: 'SRD monster, e.g. Skeleton', 'aria-label': 'Monster' });
    const cIn = el('input', { type: 'number', min: '1', value: '1', class: 'form-control rpm-input', style: 'width:4.5em', 'aria-label': 'Count' });
    box.appendChild(el('div', { class: 'rpm-row', style: 'margin-top:4px' }, [mIn, cIn, btn('', () => {
        const key = A.findMonster(mIn.value.trim()); if (!key) { M.toast('No SRD monster named "' + mIn.value.trim() + '"', true); return; }
        const cur = encs[0];
        const monsters = cur ? cur.monsters.concat([{ key, count: Number(cIn.value) || 1 }]) : [{ key, count: Number(cIn.value) || 1 }];
        A.saveEncounter({ id: cur && cur.id, name: cur ? cur.name : (room.name || 'Room') + ' encounter', monsters, locationId: id, personIds: cur ? cur.personIds : [] });
        renderInspector();
    }, { icon: 'plus', title: 'Add monster to this room\'s encounter', data: { monster: 'add' } })]));

    box.appendChild(btn(town ? 'Delete place' : 'Delete room', () => {
        const inner = A.roomsOf(id).length;
        if (!confirm(`Delete "${room.name}"${inner ? ` and the ${inner} rooms inside it` : ''}? Its exits and features go with it.`)) return;
        A.deleteEntity(id, { withRooms: true }); M.selected = null; refreshAll();
    }, { icon: 'trash-2', variant: 'danger', block: true, data: { room: 'delete' } }));
}

// One exit as seen from room `fromId` (direction shown from there).
function exitCard(fromId, e) {
    const A = API(); const R = MR();
    const target = A.entityById(e.to); const mirrored = e.owner !== fromId;
    const card = el('div', { class: 'rpm-card rpm-map-exitcard' + (e.id === M.selectedExit ? ' rpm-sel' : ''), 'data-exitcard': e.id });
    const st = A.doorState(e.id);
    card.appendChild(el('div', { class: 'rpm-row' }, [
        el('span', { class: 'rpm-grow', text: `→ ${(target && target.name) || e.to}` + (e.dir ? ` (${R.dirName(e.dir)})` : '') }),
        e.legacy ? null : el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove connection', 'aria-label': 'Remove connection', text: '×', onclick: () => { A.removeExit(e.id); M.selectedExit = null; refreshAll(); } }),
    ]));
    if (e.legacy) { card.appendChild(el('div', { class: 'rpm-muted', text: 'Open connection from the world editor.' })); return card; }
    const patch = (p) => { A.updateExit(e.id, p); refreshAll(); };
    const row1 = el('div', { class: 'rpm-row' }, [
        select([['', '— direction —'], ...R.DIRS.map(d => [d, R.dirName(d)])], e.dir || '', v => patch({ dir: v ? (mirrored ? R.mirrorDir(v) : v) : null }), { 'aria-label': 'Direction' }),
        select(R.EXIT_TYPES.map(t => [t, cap(t)]), e.type || 'open', v => patch({ type: v }), { 'aria-label': 'Connection type' }),
    ]);
    card.appendChild(row1);
    if (e.type === 'door' || e.type === 'secret') {
        const d = e.door || {};
        card.appendChild(el('div', { class: 'rpm-row' }, [
            select(R.DOOR_STATES.map(s => [s, cap(s)]), (d.state || 'closed'), v => patch({ door: { state: v } }), { 'aria-label': 'Door state' }),
            input(d.material, v => patch({ door: { material: v || undefined } }), { attrs: { placeholder: 'material (wood, iron …)', 'aria-label': 'Door material' } }),
        ]));
        card.appendChild(el('div', { class: 'rpm-row' }, [
            input(d.lockDC, v => patch({ door: { lockDC: v ? Number(v) : undefined } }), { type: 'number', attrs: { placeholder: 'lock DC', 'aria-label': 'Lock DC', min: '1' } }),
            input(d.keyItem, v => patch({ door: { keyItem: v || undefined } }), { attrs: { placeholder: 'key item', 'aria-label': 'Key item' } }),
        ]));
        if (st !== (d.state || 'closed')) card.appendChild(el('div', { class: 'rpm-muted', text: `In this story now: ${st}` }));
    }
    card.appendChild(el('div', { class: 'rpm-row' }, [
        el('span', { class: 'rpm-muted rpm-grow', text: 'Secret: Search DC' }),
        input(e.secretDC, v => patch({ secretDC: v ? Number(v) : null }), { type: 'number', attrs: { placeholder: '—', 'aria-label': 'Secret DC', min: '1', style: 'width:5em' } }),
    ]));
    return card;
}
function renderExitOnly(box) {
    const e = M.board.exits.find(x => x.id === M.selectedExit); if (!e) return renderMapInfo(box);
    const full = API().exitsOf(e.from).find(x => x.id === e.id);
    box.appendChild(heading('Connection'));
    box.appendChild(el('div', { class: 'rpm-muted', text: `${(roomById(e.from) || {}).name} ↔ ${(roomById(e.to) || {}).name}` }));
    if (full) box.appendChild(exitCard(e.from, full));
}
function featureCard(f) {
    const A = API(); const R = MR();
    const card = el('div', { class: 'rpm-card', 'data-featurecard': f.id });
    const up = (p) => A.updateEntity(f.id, p);
    card.appendChild(el('div', { class: 'rpm-row' }, [
        input(f.name, v => up({ name: v }), { attrs: { 'aria-label': 'Feature name', class: 'form-control rpm-input rpm-grow' } }),
        select(R.FEATURE_KINDS.map(k => [k, cap(k)]), f.kind, v => { up({ kind: v }); renderInspector(); }, { 'aria-label': 'Feature kind' }),
        el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove feature', 'aria-label': 'Remove feature ' + f.name, text: '×', onclick: () => { A.deleteEntity(f.id); renderInspector(); } }),
    ]));
    card.appendChild(input(f.desc, v => up({ desc: v }), { attrs: { placeholder: 'description', 'aria-label': 'Feature description' } }));
    if (f.kind === 'container') card.appendChild(input((f.contains || []).join(', '), v => up({ contains: v.split(',').map(s => s.trim()).filter(Boolean) }), { attrs: { placeholder: 'contains (comma separated)', 'aria-label': 'Contains' } }));
    if (f.kind === 'trap') card.appendChild(input(f.trapDC, v => up({ trapDC: v ? Number(v) : undefined }), { type: 'number', attrs: { placeholder: 'trap DC (to find)', 'aria-label': 'Trap DC', min: '1' } }));
    if (f.kind === 'light') {
        const w = el('label', { class: 'rpm-map-check' }); const c = el('input', { type: 'checkbox', 'aria-label': 'Lit' }); c.checked = !!f.lit;
        c.addEventListener('change', () => up({ lit: c.checked })); w.appendChild(c); w.appendChild(document.createTextNode(' Lit')); card.appendChild(w);
    }
    return card;
}
