// =============================================================================
// KLITE RPmod — Mini-map (left dock section "Map") and the Map window (R7)
// -----------------------------------------------------------------------------
// Shows where the player is. Inside a dungeon/town: its board with fog (only rooms the player
// knows; known-but-unvisited ones as outlines), "you are here", and the current room's exits.
// Click a neighbouring room (or an exit button) to go there — RPmod applies the rules
// (KLITE_RPMod_Worlds.go: known exits only, a closed door opens, a locked/barred one refuses)
// and writes the move or the refusal to the game log, which the AI narrates. Outside:
// the current place and its exits. Clicking the mini board opens the large Map window.
// Used by src/KLITE-RPmod_WorldsUI.js. Design: docs/design/R7-world-map.md.
// =============================================================================
import { el, iconText } from '../shell/dom.js';
import { renderPlayerBoard } from './board.js';

export const MINIMAP_VIEWS = ['minimap', 'map'];
const U = { last: null, ok: false, at: null };   // the last action's result or refusal, shown while in that room

function API() { return window.KLITE_RPMod_Worlds; }
function here() { const A = API(); return A && A.runtime ? A.runtime.playerLocationId : null; }
function refresh() { U.at = here(); try { window.KLITE_RPMod_Shell?.refresh(MINIMAP_VIEWS); } catch (_) {} }

function doGo(targetId) {
    const A = API();
    const r = A.go(targetId, { source: 'ui' });
    U.last = r.ok ? null : r.reason; U.ok = false;
    refresh();
    return r;
}
// Door buttons and Search (R7 step 3): RPmod rolls/decides, the log tells the AI.
function doDoor(action, exitId) {
    const r = API().door(action, exitId, { source: 'ui' });
    U.last = r.ok ? (r.text || null) : r.reason; U.ok = !!r.ok;
    refresh();
    return r;
}
function doSearch() {
    const r = API().search({ source: 'ui' });
    U.last = r.ok ? r.text : r.reason; U.ok = !!r.ok;
    refresh();
    return r;
}

// box: the view container; large: the Map window
export function renderMap(box, large) {
    const A = API();
    const root = el('div', { class: 'rpm-map rpm-map-player' + (large ? ' rpm-map-large' : ''), 'data-map-view': large ? 'window' : 'dock' });
    box.appendChild(root);
    if (!A || !A.activeWorld()) { root.appendChild(el('div', { class: 'rpm-muted', text: 'No world loaded. Load one (or the example) in the World tab.' })); return; }
    const here = A.runtime && A.runtime.playerLocationId;
    if (!here || !A.entityById(here)) { root.appendChild(el('div', { class: 'rpm-muted', text: 'Nowhere yet — choose a starting place in the World tab.' })); return; }
    const R = A.mapRules;
    const mapId = A.mapOf(here);
    const exits = A.exitsOf(here, { player: true });

    // header: where you are
    const path = (A.zonePath(here) || []).map(z => z.name);
    root.appendChild(el('div', { class: 'rpm-map-where' }, [
        el('span', { class: 'rpm-grow' }, [el('strong', { text: (A.phased(here) || {}).name || A.entityById(here).name }), path.length ? el('span', { class: 'rpm-muted', text: ' · ' + path.join(' › ') }) : null]),
        large ? null : el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Open the map', 'aria-label': 'Open the map', 'data-map-open': '1', onclick: () => window.KLITE_RPMod_Shell?.open('map') }, [iconText('map', '', 16)]),
    ]));

    if (mapId) {
        const board = A.mapBoard(mapId, { player: true });
        root.setAttribute('data-kind', board.kind); root.setAttribute('data-style', board.style);
        const reachable = new Set(exits.filter(e => board.rooms.some(r => r.id === e.to)).map(e => e.to));
        const sv = renderPlayerBoard(board, { R, cell: large ? 28 : 16, reachable, onRoom: doGo });
        const wrap = el('div', { class: 'rpm-map-boardwrap', title: large ? null : 'Click a neighbouring room to go there; click elsewhere to open the map' });
        wrap.appendChild(sv);
        if (!large) wrap.addEventListener('click', () => window.KLITE_RPMod_Shell?.open('map'));
        root.appendChild(wrap);
    }
    if (mapId || (A.hiddenIn && exits.length)) {
        const light = A.roomLight ? A.roomLight(here) : null;
        root.appendChild(el('div', { class: 'rpm-map-actions' }, [
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn', 'data-map-search': '1', title: 'Search this room (d20 + Perception or Investigation)', onclick: doSearch }, [iconText('search', 'Search', 14)]),
            light ? el('span', { class: 'rpm-chip', 'data-map-light': light, text: light === 'bright' ? 'bright light' : light === 'dim' ? 'dim light' : 'darkness' }) : null,
        ]));
    }
    if (U.last && U.at === here) root.appendChild(el('div', { class: U.ok ? 'rpm-map-result' : 'rpm-map-refused', role: 'status', text: U.last }));

    // exits of the current place (also the keyboard way to move)
    const list = el('div', { class: 'rpm-map-exits' });
    if (!exits.length) list.appendChild(el('div', { class: 'rpm-muted', text: 'No known way on from here.' }));
    for (const e of exits) {
        const st = e.type === 'door' || e.type === 'secret' ? A.doorState(e.id) : null;
        const label = `${e.dir ? R.dirName(e.dir) + ': ' : ''}${(A.playerPlaceName || A.placeName)(e.to, here)}`;
        const b = el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-map-go', 'data-go': e.to, title: st ? `Door: ${st}` : 'Go there', onclick: () => doGo(e.to) }, [
            el('span', { class: 'rpm-grow', text: label }),
            st && st !== 'open' ? el('span', { class: 'rpm-chip' + (R.blocksMove(st) ? ' rpm-chip-danger' : ''), text: st }) : null,
        ]);
        if (!st) { list.appendChild(b); continue; }
        // door controls next to the exit: open / close / unlock
        const act = st === 'open' ? ['close', 'Close'] : st === 'closed' ? ['open', 'Open'] : st === 'locked' ? ['unlock', 'Unlock'] : null;
        list.appendChild(el('div', { class: 'rpm-map-exitrow' }, [b,
            act ? el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-map-door-btn', 'data-door': act[0], 'data-exit': e.id,
                title: `${act[1]} the door`, onclick: () => doDoor(act[0], e.id) }, [el('span', { text: act[1] })]) : null]));
    }
    root.appendChild(list);
    if (large && mapId) root.appendChild(el('div', { class: 'rpm-muted', style: 'margin-top:6px', text: 'Dashed rooms are seen but not yet visited; "?" marks a room behind a closed door. Unknown rooms and undiscovered secrets are not shown.' }));
}

export function registerMinimap(sh) {
    sh.registerView({ id: 'minimap', title: 'Map', place: 'left', order: 15,
        mount: (c) => renderMap(c, false), update: (c) => { while (c.firstChild) c.removeChild(c.firstChild); renderMap(c, false); } });
    sh.registerView({ id: 'map', title: 'Map', place: 'window', window: { width: 640, height: 560, minWidth: 300, minHeight: 260 },
        mount: (c) => renderMap(c, true), update: (c) => { while (c.firstChild) c.removeChild(c.firstChild); renderMap(c, true); } });
}
