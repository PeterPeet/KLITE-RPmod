// =============================================================================
// KLITE RPmod — Mini-map (left dock section "Map") and the Map window (R7, reworked R8)
// -----------------------------------------------------------------------------
// Shows where the player is. Inside a dungeon/town: its board with fog (only rooms the player
// knows; known-but-unvisited ones as outlines) and "you are here". Outside: the places the player
// knows as points with their links (positions from the world editor), the current one highlighted.
// The map is a view: moving, searching and doors go through the chat and the quick replies' "Here"
// row, so the AI narrates them. With **Quick travel** ticked (per viewer), clicking a neighbouring
// room or place moves there at once — RPmod applies the rules (KLITE_RPMod_Worlds.go) and the log
// tells the AI the journey was skipped. Clicking the mini map opens the large Map window.
// Used by src/KLITE-RPmod_WorldsUI.js. Design: docs/design/R7-world-map.md.
// =============================================================================
import { el, iconText } from '../shell/dom.js';
import { renderPlayerBoard, svg } from './board.js';

export const MINIMAP_VIEWS = ['minimap', 'map'];
const U = { last: null, at: null };   // the last quick-travel refusal, shown while in that place
const QT_KEY = 'KLITE.map.quickTravel';

function API() { return window.KLITE_RPMod_Worlds; }
function here() { const A = API(); return A && A.runtime ? A.runtime.playerLocationId : null; }
function refresh() { U.at = here(); try { window.KLITE_RPMod_Shell?.refresh(MINIMAP_VIEWS); } catch (_) {} }
export function quickTravel() { try { return localStorage.getItem(QT_KEY) === '1'; } catch (_) { return false; } }
function setQuickTravel(on) { try { localStorage.setItem(QT_KEY, on ? '1' : '0'); } catch (_) {} refresh(); }

function doGo(targetId) {
    if (!quickTravel()) return null;
    const r = API().go(targetId, { source: 'quicktravel' });
    U.last = r.ok ? null : r.reason;
    refresh();
    return r;
}

// Outside dungeons and towns: the known world places as points (R8). Known = visited, where you
// are, and the places you can go to from here. Positions: the editor's; missing ones laid out in
// rings around where you are.
function renderPlaces(A, hereId, large, quick) {
    const g = A.getGraph();
    // the regions you are in (zones around the current place) are named in the header, not drawn
    const around = new Set((A.zonePath(hereId) || []).map(z => z.id));
    const places = g.nodes.filter(n => n.type === 'location' && !n.mapId && !around.has(n.id));
    const byId = new Map(places.map(n => [n.id, n]));
    const rt = A.runtime || {};
    const visited = new Set((rt.visitedLocationIds || []).filter(id => byId.has(id)));
    const anchorOf = (id) => { const n = g.nodes.find(x => x.id === id); return n && n.graphId ? n.graphId : id; };
    const cur = anchorOf(hereId);
    const near = new Set(((A.here() || {}).ways || []).map(w => anchorOf(w.id)).filter(id => byId.has(id) && id !== cur));
    const shown = places.filter(n => n.id === cur || visited.has(n.id) || near.has(n.id));
    if (!shown.length) return null;
    // positions: the editor's when every shown place has one, else rings around the current place
    let pos = new Map();
    if (shown.every(n => n.x != null && n.y != null)) for (const n of shown) pos.set(n.id, { x: n.x, y: n.y });
    else {
        const links = new Map(shown.map(n => [n.id, new Set()]));
        for (const e of g.edges) if (e.kind === 'exit' && links.has(e.from) && links.has(e.to)) { links.get(e.from).add(e.to); links.get(e.to).add(e.from); }
        const depth = new Map([[cur, 0]]); const todo = [cur];
        while (todo.length) { const id = todo.shift(); for (const n of links.get(id) || []) if (!depth.has(n)) { depth.set(n, depth.get(id) + 1); todo.push(n); } }
        const rings = new Map();
        for (const n of shown) { const d = depth.has(n.id) ? depth.get(n.id) : 3; if (!rings.has(d)) rings.set(d, []); rings.get(d).push(n.id); }
        for (const [d, ids] of rings) ids.forEach((id, i) => { const a = (i / ids.length) * Math.PI * 2 + d; pos.set(id, d === 0 ? { x: 0, y: 0 } : { x: Math.cos(a) * 160 * d, y: Math.sin(a) * 110 * d }); });
    }
    const xs = [...pos.values()].map(p => p.x), ys = [...pos.values()].map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 70, w = Math.max(maxX - minX, 1) + pad * 2, h = Math.max(maxY - minY, 1) + pad * 2;
    const s = svg('svg', { class: 'rpm-map-board rpm-map-places', role: 'img', 'aria-label': 'Map of the places you know', viewBox: `${minX - pad} ${minY - pad} ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' });
    // units per screen pixel (the drawing is fitted into ~240×200 px in the dock, ~560×420 in the window):
    // dots and names keep their size on screen however large the world is
    const scale = Math.max(w / (large ? 560 : 240), h / (large ? 420 : 200), 0.5);
    const gl = svg('g'), gn = svg('g'); s.appendChild(gl); s.appendChild(gn);
    const drawn = new Set();
    for (const e of g.edges) {
        if (e.kind !== 'exit' || !pos.has(e.from) || !pos.has(e.to)) continue;
        const key = [e.from, e.to].sort().join('|'); if (drawn.has(key)) continue; drawn.add(key);
        const a = pos.get(e.from), b = pos.get(e.to);
        gl.appendChild(svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'rpm-map-placelink' + (visited.has(e.from) && visited.has(e.to) ? '' : ' rpm-map-fog'), 'stroke-width': 2 * scale }));
    }
    for (const n of shown) {
        const p = pos.get(n.id); const isHere = n.id === cur; const reach = quick && near.has(n.id);
        const kind = (A.entityById(n.id) || {}).kind || 'location';
        const cls = 'rpm-map-place' + (isHere ? ' rpm-here' : '') + (visited.has(n.id) || isHere ? '' : ' rpm-map-fog') + (reach ? ' rpm-map-reach' : '');
        const gp = svg('g', { class: cls, 'data-place': n.id, 'data-kind': kind });
        const r = (isHere ? 12 : 9) * scale;
        gp.appendChild(kind === 'location' ? svg('circle', { cx: p.x, cy: p.y, r, class: 'rpm-map-dot' })
            : svg('rect', { x: p.x - r, y: p.y - r, width: r * 2, height: r * 2, rx: 3 * scale, class: 'rpm-map-dot' }));
        const t = svg('text', { x: p.x, y: p.y + r + 17 * scale, 'text-anchor': 'middle', class: 'rpm-map-name', 'font-size': 16 * scale });
        t.textContent = (A.phased(n.id) || {}).name || n.name; gp.appendChild(t);
        if (reach) gp.addEventListener('click', (ev) => { ev.stopPropagation(); doGo(n.id); });
        gn.appendChild(gp);
    }
    return s;
}

// box: the view container; large: the Map window
export function renderMap(box, large) {
    const A = API();
    const root = el('div', { class: 'rpm-map rpm-map-player' + (large ? ' rpm-map-large' : ''), 'data-map-view': large ? 'window' : 'dock' });
    box.appendChild(root);
    if (!A || !A.activeWorld()) { root.appendChild(el('div', { class: 'rpm-muted', text: 'No world loaded. Load one (or the example) in the World tab.' })); return; }
    const hereId = A.runtime && A.runtime.playerLocationId;
    if (!hereId || !A.entityById(hereId)) { root.appendChild(el('div', { class: 'rpm-muted', text: 'Nowhere yet — choose a starting place in the World tab.' })); return; }
    const R = A.mapRules;
    const mapId = A.mapOf(hereId);
    const quick = quickTravel();

    // header: where you are, quick travel, open the big map
    const path = (A.zonePath(hereId) || []).map(z => z.name);
    const qt = el('input', { type: 'checkbox', 'data-map-quick': '1' }); qt.checked = quick;
    qt.addEventListener('change', () => setQuickTravel(qt.checked));
    root.appendChild(el('div', { class: 'rpm-map-where' }, [
        el('span', { class: 'rpm-grow' }, [el('strong', { text: (A.phased(hereId) || {}).name || A.entityById(hereId).name }), path.length ? el('span', { class: 'rpm-muted', text: ' · ' + path.join(' › ') }) : null]),
        large ? null : el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Open the map', 'aria-label': 'Open the map', 'data-map-open': '1', onclick: () => window.KLITE_RPMod_Shell?.open('map') }, [iconText('map', '', 16)]),
    ]));

    let drawing = null;
    if (mapId) {
        const board = A.mapBoard(mapId, { player: true });
        root.setAttribute('data-kind', board.kind); root.setAttribute('data-style', board.style);
        const exits = A.exitsOf(hereId, { player: true });
        const reachable = quick ? new Set(exits.filter(e => board.rooms.some(r => r.id === e.to)).map(e => e.to)) : new Set();
        drawing = renderPlayerBoard(board, { R, cell: large ? 28 : 16, reachable, onRoom: doGo });
    } else drawing = renderPlaces(A, hereId, large, quick);
    if (drawing) {
        const wrap = el('div', { class: 'rpm-map-boardwrap', title: large ? null : (quick ? 'Quick travel: click a neighbouring place to go there; click elsewhere to open the map' : 'Click to open the map') });
        wrap.appendChild(drawing);
        if (!large) wrap.addEventListener('click', () => window.KLITE_RPMod_Shell?.open('map'));
        root.appendChild(wrap);
    }
    const light = mapId && A.roomLight ? A.roomLight(hereId) : null;
    root.appendChild(el('div', { class: 'rpm-map-actions' }, [
        el('label', { class: 'rpm-map-quick', title: 'Click the map to move at once. The AI is told you skipped the journey. Off: walk, search and open doors with the quick replies or in the chat, and the AI narrates it.' }, [qt, el('span', { text: 'Quick travel' })]),
        light ? el('span', { class: 'rpm-chip', 'data-map-light': light, text: light === 'bright' ? 'bright light' : light === 'dim' ? 'dim light' : 'darkness' }) : null,
    ]));
    if (U.last && U.at === hereId) root.appendChild(el('div', { class: 'rpm-map-refused', role: 'status', text: U.last }));
    if (large) root.appendChild(el('div', { class: 'rpm-muted', style: 'margin-top:6px', text: mapId
        ? 'Dashed rooms are seen but not yet visited; "?" marks a room behind a closed door. Unknown rooms and undiscovered secrets are not shown.'
        : 'Dashed places are known but not yet visited. Walk with the quick replies ("Here") or in the chat; tick Quick travel to move by clicking.' }));
}

export function registerMinimap(sh) {
    sh.registerView({ id: 'minimap', title: 'Map', place: 'left', order: 15,
        mount: (c) => renderMap(c, false), update: (c) => { while (c.firstChild) c.removeChild(c.firstChild); renderMap(c, false); } });
    sh.registerView({ id: 'map', title: 'Map', place: 'window', window: { width: 640, height: 560, minWidth: 300, minHeight: 260 },
        mount: (c) => renderMap(c, true), update: (c) => { while (c.firstChild) c.removeChild(c.firstChild); renderMap(c, true); } });
}
