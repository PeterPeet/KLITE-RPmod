// =============================================================================
// KLITE RPmod — map board drawing (R7), shared by the mini-map, the Map window and the
// dungeon/town editor. Input is the engine's derived board (KLITE_RPMod_Worlds.mapBoard) —
// RPmod lays out and draws; nobody (and no AI) writes coordinates here.
// =============================================================================
const SVGNS = 'http://www.w3.org/2000/svg';
const CARD = ['n', 'e', 's', 'w'];

export function svg(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
}
function center(r, cell) { return { x: (r.x + r.w / 2) * cell, y: (r.y + r.h / 2) * cell }; }
// Point on a room's wall facing `dir` (n/e/s/w), else the centre.
export function wallPoint(r, dir, cell) {
    const c = center(r, cell);
    if (dir === 'n') return { x: c.x, y: r.y * cell };
    if (dir === 's') return { x: c.x, y: (r.y + r.h) * cell };
    if (dir === 'e') return { x: (r.x + r.w) * cell, y: c.y };
    if (dir === 'w') return { x: r.x * cell, y: c.y };
    return c;
}
// Line of a connection between two room rects: from a's wall in `dir` to b's opposite wall
// (direction from the positions when the exit has none or is up/down).
export function exitPoints(a, b, dir, cell, R) {
    const d = CARD.includes(dir) ? dir : R.dirBetween(a, b);
    return { p: wallPoint(a, d, cell), q: wallPoint(b, R.mirrorDir(d), cell) };
}
// Door / stairs / secret markers at the middle of a connection.
export function exitMarks(g, e, mx, my) {
    if (e.type === 'door' || e.type === 'secret') {
        g.appendChild(svg('rect', { x: mx - 6, y: my - 6, width: 12, height: 12, rx: 2, class: 'rpm-map-door' }));
        if (e.state === 'locked' || e.state === 'barred') { const t = svg('text', { x: mx, y: my + 4, 'text-anchor': 'middle', class: 'rpm-map-glyph' }); t.textContent = e.state === 'locked' ? '⚿' : '#'; g.appendChild(t); }
    }
    if (e.type === 'stairs' || e.dir === 'up' || e.dir === 'down') { const t = svg('text', { x: mx, y: my - 9, 'text-anchor': 'middle', class: 'rpm-map-glyph' }); t.textContent = e.dir === 'up' ? '▲' : e.dir === 'down' ? '▼' : '≡'; g.appendChild(t); }
    if (e.secret) { const t = svg('text', { x: mx, y: my + 19, 'text-anchor': 'middle', class: 'rpm-map-glyph' }); t.textContent = 'S'; g.appendChild(t); }
}

// The player's board: fog (only known/seen/visited rooms are in a player board; seen ones are
// dashed outlines, known ones behind a closed door "?"), "you are here", reachable neighbours
// clickable.
// opts: { cell, reachable: Set of room ids, onRoom(id), R: map rules }
export function renderPlayerBoard(board, opts) {
    const R = opts.R, cell = opts.cell || 20;
    const rects = board.rooms.map(r => r.rect);
    const b = R.boardBounds(rects);
    const pad = 1;
    const s = svg('svg', { class: 'rpm-map-board', role: 'img', 'aria-label': `Map of ${board.name}`,
        viewBox: `${(b.x - pad) * cell} ${(b.y - pad) * cell} ${(b.w + 2 * pad) * cell} ${(b.h + 2 * pad) * cell}`, preserveAspectRatio: 'xMidYMid meet' });
    const gx = svg('g'), gr = svg('g'); s.appendChild(gx); s.appendChild(gr);
    const byId = new Map(board.rooms.map(r => [r.id, r]));
    for (const e of board.exits) {
        const a = byId.get(e.from), c = byId.get(e.to); if (!a || !c) continue;
        const { p, q } = exitPoints(a.rect, c.rect, e.dir, cell, R);
        const g = svg('g', { class: 'rpm-map-exit', 'data-exit': e.id, 'data-type': e.type, 'data-state': e.state });
        g.appendChild(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'rpm-map-link' + (e.secret ? ' rpm-map-secret' : '') + (e.type === 'corridor' ? ' rpm-map-corridor' : '') }));
        exitMarks(g, e, (p.x + q.x) / 2, (p.y + q.y) / 2);
        gx.appendChild(g);
    }
    for (const r of board.rooms) {
        const x = r.rect.x * cell, y = r.rect.y * cell, w = r.rect.w * cell, h = r.rect.h * cell;
        const fog = !r.here && r.explored !== 'visited';
        const unseen = fog && r.named === false;   // behind a closed door: "?" (name unknown)
        const reach = opts.reachable && opts.reachable.has(r.id);
        const g = svg('g', { class: 'rpm-map-room' + (r.here ? ' rpm-here' : '') + (fog ? ' rpm-map-fog' : '') + (unseen ? ' rpm-map-unseen' : '') + (reach ? ' rpm-map-reach' : '') + (r.light === 'dark' ? ' rpm-map-dark' : ''),
            'data-room': r.id, 'data-explored': r.here ? 'here' : (r.explored || 'known') });
        const title = svg('title'); title.textContent = (unseen ? 'Unexplored room' : r.name) + (r.here ? ' — you are here' : reach ? ' — click to go there' : ''); g.appendChild(title);
        g.appendChild(svg('rect', { x, y, width: w, height: h, rx: board.kind === 'town' ? 6 : 1, class: 'rpm-map-roomrect' }));
        const t = svg('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', class: 'rpm-map-name' });
        t.textContent = r.name.length > r.rect.w * 3 ? r.name.slice(0, Math.max(3, r.rect.w * 3 - 1)) + '…' : r.name;
        g.appendChild(t);
        if (r.here) g.appendChild(svg('circle', { cx: x + w / 2, cy: y + h - Math.min(9, h / 4), r: Math.min(5, cell / 4), class: 'rpm-map-here' }));
        if (reach && opts.onRoom) g.addEventListener('click', (ev) => { ev.stopPropagation(); opts.onRoom(r.id); });
        gr.appendChild(g);
    }
    return s;
}
