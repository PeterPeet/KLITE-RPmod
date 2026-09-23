import { LUCIDE } from './icons.js';

// Tiny DOM helpers for the shell. Content is set with textContent only — character and
// world data is untrusted (see CLAUDE.md, Security).

export function el(tag, props, kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
        const v = props[k];
        if (v == null) continue;
        if (k === 'style') e.style.cssText = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'class') e.className = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
    }
    for (const c of [].concat(kids || [])) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
}

export function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

// Small inline SVG icon (24×24 viewBox, stroke style, colour = currentColor).
// `shapes` is a Lucide icon name (see icons.js, generated from lucide-static — ISC), a
// list of [tag, attributes] (the generated format), or SVG path data (string/array).
// Icons are decorative: aria-hidden; the button keeps its text or aria-label.
const SHAPE_TAGS = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
export function icon(shapes, size = 18) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'rpm-icon');
    if (typeof shapes === 'string' && LUCIDE[shapes]) shapes = LUCIDE[shapes];
    for (const item of [].concat(shapes || [])) {
        const [tag, attrs] = Array.isArray(item) ? item : ['path', { d: item }];
        if (!SHAPE_TAGS.has(tag)) continue;
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        s.appendChild(e);
    }
    return s;
}

// Icon followed by a text label, for buttons: iconText('swords', 'Combat').
export function iconText(name, text, size = 15) {
    const frag = document.createDocumentFragment();
    frag.appendChild(icon(name, size));
    if (text) frag.appendChild(el('span', { text }));
    return frag;
}

export const ICONS = {
    shell: 'columns-3',
    close: 'x',
    chevronLeft: 'chevron-left',
    chevronRight: 'chevron-right',
    chevronDown: 'chevron-down',
    maximize: 'maximize-2',
    restore: 'minimize-2',
    help: 'circle-help',
};
