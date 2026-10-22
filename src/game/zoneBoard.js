// =============================================================================
// KLITE RPmod — zone board drawing (R7 step 5): the room of a fight as circles and zones
// -----------------------------------------------------------------------------
// Small room: one circle (the room) inside a ring (just outside). Large space: a centre
// circle and four sides (north at the top) inside a ring (just outside). Corridor: the centre
// and only its passages; the rest is wall. Doors sit on the room's rim in their direction,
// terrain features as small squares in their zone, combatants as round tokens. Everything
// is SVG built with createElementNS/textContent (names are untrusted data).
// Used by the Combat window (combatView.js) and the Guide's zone demo.
// =============================================================================
const SVGNS = 'http://www.w3.org/2000/svg';
const S = 320, C = S / 2;                  // view box and centre
const R_OUT = 154, R_ROOM = 122, R_MID = 48, R_SMALL = 78;
const HW = 40, ARM = 116;                  // corridor: half width of a passage, its length from the centre
const ANG = { n: -90, e: 0, s: 90, w: 180 };

function svg(tag, attrs, text) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
}
const pt = (r, deg) => { const a = deg * Math.PI / 180; return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }; };
// Annular sector from angle a1 to a2 (degrees, clockwise), radii r1 < r2.
function sector(r1, r2, a1, a2) {
    const p1 = pt(r2, a1), p2 = pt(r2, a2), p3 = pt(r1, a2), p4 = pt(r1, a1);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M${p1.x},${p1.y} A${r2},${r2} 0 ${large} 1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${r1},${r1} 0 ${large} 0 ${p4.x},${p4.y} Z`;
}
function ring(r1, r2) { return `M${C - r2},${C} a${r2},${r2} 0 1 0 ${2 * r2},0 a${r2},${r2} 0 1 0 ${-2 * r2},0 Z M${C - r1},${C} a${r1},${r1} 0 1 1 ${2 * r1},0 a${r1},${r1} 0 1 1 ${-2 * r1},0 Z`; }
function rect(x, y, w, h) { return `M${x},${y} h${w} v${h} h${-w} Z`; }
function circle(r) { return `M${C - r},${C} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`; }

// Shape and anchor point (where tokens gather) of each zone.
function zoneShapes(kind, arms) {
    const out = {};
    if (kind === 'small') {
        out.inner = { d: circle(R_SMALL), at: { x: C, y: C } };
        out.outer = { d: ring(R_SMALL, R_OUT), at: pt((R_SMALL + R_OUT) / 2, -60) };
        return out;
    }
    if (kind === 'corridor') {   // narrow passages: a square in the middle, a strip per arm
        const len = ARM - HW;
        const strips = { n: rect(C - HW, C - ARM, 2 * HW, len), s: rect(C - HW, C + HW, 2 * HW, len), e: rect(C + HW, C - HW, len, 2 * HW), w: rect(C - ARM, C - HW, len, 2 * HW) };
        out.c = { d: rect(C - HW, C - HW, 2 * HW, 2 * HW), at: { x: C, y: C } };
        for (const z of arms) out[z] = { d: strips[z], at: pt((HW + ARM) / 2, ANG[z]) };
        out.outer = { d: ring(R_ROOM, R_OUT), at: pt((R_ROOM + R_OUT) / 2, -60) };
        return out;
    }
    out.c = { d: circle(R_MID), at: { x: C, y: C } };
    for (const z of ['n', 'e', 's', 'w']) out[z] = { d: sector(R_MID, R_ROOM, ANG[z] - 45, ANG[z] + 45), at: pt((R_MID + R_ROOM) / 2, ANG[z]) };
    out.outer = { d: ring(R_ROOM, R_OUT), at: pt((R_ROOM + R_OUT) / 2, -60) };
    return out;
}
// Token offsets around a zone's anchor (after 9 tokens the spots repeat).
const SPOTS = [[0, 0], [-24, 0], [24, 0], [0, -24], [0, 24], [-24, -24], [24, 24], [24, -24], [-24, 24]];

// view: the engine's zoneView() (or a demo of the same shape); opts: {
//   tokens: [{ id, name, side: 'party'|'enemy', current, down, hidden, cover }],
//   reachable: Set of zone ids the current mover may go to, onZone(zone), label }
export function renderZoneBoard(view, opts = {}) {
    const kind = view.kind, arms = (view.layout && view.layout.arms) || [];
    const shapes = zoneShapes(kind, arms);
    const root = svg('svg', { class: 'rpm-zone-board', viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': opts.label || `Zones: ${view.name || kind}`, 'data-layout': kind });
    // a corridor is cut into rock: everything but its passages is wall
    if (kind === 'corridor') root.appendChild(svg('path', { d: circle(R_ROOM), class: 'rpm-zone-wall', 'data-wall': '1' }));
    const names = {}; for (const z of view.zones || []) names[z.id] = z;
    for (const [z, sh] of Object.entries(shapes)) {
        const reach = opts.reachable && opts.reachable.has(z);
        const g = svg('g', { class: 'rpm-zone' + (z === 'outer' ? ' rpm-zone-outer' : '') + (reach ? ' rpm-zone-reach' : '') + (view.dark && z !== 'outer' ? ' rpm-zone-dark' : ''), 'data-zone': z });
        g.appendChild(svg('title', null, (names[z] ? names[z].name : z) + (reach ? ' — click to move here' : '')));
        g.appendChild(svg('path', { d: sh.d, 'fill-rule': 'evenodd', class: 'rpm-zone-area' }));
        if (reach && opts.onZone) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.addEventListener('click', () => opts.onZone(z)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onZone(z); } }); }
        root.appendChild(g);
    }
    // zone labels
    const lab = (z, p, text) => root.appendChild(svg('text', { x: p.x, y: p.y, 'text-anchor': 'middle', class: 'rpm-zone-label', 'data-zone-label': z }, text));
    if (kind === 'small') { lab('inner', { x: C, y: C - R_SMALL + 16 }, 'the room'); lab('outer', { x: C, y: C - R_OUT + 20 }, 'just outside'); }
    else {
        lab('c', { x: C, y: C - (kind === 'corridor' ? HW : R_MID) + 14 }, kind === 'corridor' ? 'middle' : 'centre');
        // side labels above the tokens, clear of the doors on the rim
        // (north a little lower, so a door on the north rim does not cover its label)
        for (const z of Object.keys(shapes)) if (ANG[z] != null) { const p = shapes[z].at; lab(z, { x: p.x, y: p.y - (z === 'n' ? 18 : 28) }, { n: 'north', e: 'east', s: 'south', w: 'west' }[z]); }
        lab('outer', { x: C, y: C - R_OUT + 13 }, 'just outside');
    }
    // doors on the rim
    const rim = kind === 'small' ? R_SMALL : kind === 'corridor' ? ARM : R_ROOM;
    for (const d of view.doors || []) {
        if (ANG[d.dir] == null) continue;
        const p = pt(rim, ANG[d.dir]);
        const g = svg('g', { class: 'rpm-zone-door', 'data-door-dir': d.dir, 'data-state': d.state });
        g.appendChild(svg('title', null, `${d.type === 'door' || d.type === 'secret' ? d.state + ' door' : 'way'} to ${d.to}`));
        g.appendChild(svg('rect', { x: p.x - 7, y: p.y - 7, width: 14, height: 14, rx: 2 }));
        root.appendChild(g);
    }
    // terrain features, then tokens
    const used = {};
    const place = (z) => { const sh = shapes[z]; if (!sh) return null; const i = used[z] = (used[z] || 0) + 1; const o = SPOTS[(i - 1) % SPOTS.length]; return { x: sh.at.x + o[0], y: sh.at.y + o[1], i }; };
    const featIdx = {};
    for (const f of view.features || []) {
        const sh = shapes[f.zone]; if (!sh) continue;
        const i = featIdx[f.zone] = (featIdx[f.zone] || 0) + 1;
        const p = { x: sh.at.x - 30 + (i - 1) * 14, y: sh.at.y + (kind === 'small' || f.zone === 'c' ? 30 : 24) };
        const g = svg('g', { class: 'rpm-zone-feature' + (f.cover ? ' rpm-zone-cover-' + f.cover : ''), 'data-feature': f.id });
        g.appendChild(svg('title', null, f.name + (f.cover ? (f.cover === 'three' ? ' — three-quarters cover (+5 AC)' : ' — half cover (+2 AC)') : ' — no cover')));
        g.appendChild(svg('rect', { x: p.x - 5, y: p.y - 5, width: 10, height: 10, rx: 1 }));
        root.appendChild(g);
    }
    const outOfRange = [];
    for (const t of opts.tokens || []) {
        const z = view.pos && view.pos[t.id];
        if (z === 'out' || !shapes[z]) { outOfRange.push(t); continue; }
        const p = place(z); if (!p) continue;
        const g = svg('g', { class: `rpm-zone-token rpm-zone-${t.side === 'party' ? 'party' : 'enemy'}` + (t.current ? ' rpm-zone-current' : '') + (t.down ? ' rpm-zone-down' : '') + (t.hidden ? ' rpm-zone-hidden' : ''), 'data-token': t.id });
        g.appendChild(svg('title', null, `${t.name}${t.cover ? ' — in cover' : ''}${t.hidden ? ' — hidden' : ''}${t.down ? ' — down' : ''}`));
        g.appendChild(svg('circle', { cx: p.x, cy: p.y, r: 11 }));
        g.appendChild(svg('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle' }, initials(t.name)));
        if (t.cover) g.appendChild(svg('text', { x: p.x + 10, y: p.y - 7, 'text-anchor': 'middle', class: 'rpm-zone-shield' }, '◆'));
        root.appendChild(g);
    }
    return { svg: root, outOfRange };
}
function initials(name) {
    const s = String(name || '?').trim();
    const num = /(\d+)$/.exec(s);
    const words = s.replace(/\s*\d+$/, '').split(/\s+/).filter(Boolean);
    return ((words[0] || '?')[0] + (num ? num[1] : (words[1] ? words[1][0] : ''))).toUpperCase().slice(0, 3);
}
