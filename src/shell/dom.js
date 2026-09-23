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

// Small inline SVG icon from path data (24×24 viewBox, stroke style). Icons are drawn
// for this project; no third-party icon files are copied.
export function icon(paths, size = 18) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    for (const d of [].concat(paths)) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); }
    return s;
}

export const ICONS = {
    // two sidebars around a centre column
    shell: ['M3 4h18v16H3z', 'M8 4v16', 'M16 4v16'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    maximize: 'M5 5h14v14H5z',
    restore: ['M8 8h11v11H8z', 'M5 16V5h11'],
    chevronLeft: 'M15 6l-6 6 6 6',
    chevronRight: 'M9 6l6 6-6 6',
    chevronDown: 'M6 9l6 6 6-6',
};
