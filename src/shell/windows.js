// Floating window manager: draggable, resizable, maximizable, focus/raise, geometry
// remembered via the callbacks, always kept inside the viewport. Mouse and touch both work
// (pointer events when available, mouse events otherwise).
// Window options: { id, title, width, height, minWidth, minHeight,
//   large: true — first opening fills most of the screen (e.g. the world editor),
//   flush: true — body without padding (the view lays itself out edge to edge) }
import { el, icon, ICONS } from './dom.js';

const MIN_VISIBLE = 48;   // px of a window that must stay on screen when clamping

export function createWindowManager({ layer, getGeom, setGeom, onClose }) {
    const wins = new Map();   // id -> { el, body, opts }
    let zTop = 1;
    let cascade = 0;
    const usePointer = typeof window.PointerEvent === 'function';
    const EV = usePointer
        ? { down: 'pointerdown', move: 'pointermove', up: 'pointerup' }
        : { down: 'mousedown', move: 'mousemove', up: 'mouseup' };

    function viewport() { return { w: window.innerWidth || 1024, h: window.innerHeight || 768 }; }

    function clampGeom(g, opts) {
        const vp = viewport();
        const w = Math.max(opts.minWidth, Math.min(g.w, vp.w));
        const h = Math.max(opts.minHeight, Math.min(g.h, vp.h));
        const x = Math.min(Math.max(g.x, MIN_VISIBLE - w), vp.w - MIN_VISIBLE);
        const y = Math.min(Math.max(g.y, 0), vp.h - MIN_VISIBLE);   // title bar never above the top
        return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    }

    function applyGeom(win, g) {
        const s = win.el.style;
        s.left = g.x + 'px'; s.top = g.y + 'px'; s.width = g.w + 'px'; s.height = g.h + 'px';
        win.geom = g;
    }

    function initialGeom(opts) {
        const saved = getGeom(opts.id);
        if (saved && [saved.x, saved.y, saved.w, saved.h].every(Number.isFinite)) return { x: saved.x, y: saved.y, w: saved.w, h: saved.h };
        const vp = viewport();
        if (opts.large) {
            const w = Math.min(vp.w - 48, 1500), h = Math.max(opts.minHeight, vp.h - 96);
            return { x: (vp.w - w) / 2, y: 64, w, h };
        }
        const w = opts.width, h = opts.height;
        const off = (cascade++ % 6) * 28;
        return { x: (vp.w - w) / 2 + off, y: Math.max(40, (vp.h - h) / 3) + off, w, h };
    }

    function fullGeom() { const vp = viewport(); return { x: 0, y: 0, w: vp.w, h: vp.h }; }

    // Maximize fills the viewport; the normal geometry is kept and comes back on restore.
    function setMaximized(win, on) {
        win.max = !!on;
        win.el.classList.toggle('rpm-maximized', win.max);
        win.maxBtn.setAttribute('aria-pressed', String(win.max));
        win.maxBtn.title = win.max ? 'Restore' : 'Maximize';
        win.maxBtn.replaceChildren(icon(win.max ? ICONS.restore : ICONS.maximize, 14));
        applyGeom(win, win.max ? fullGeom() : clampGeom(win.normal, win.opts));
        setGeom(win.id, Object.assign({}, win.normal, { max: win.max }));
    }

    function focus(id) {
        const win = wins.get(id); if (!win) return;
        for (const other of wins.values()) other.el.classList.toggle('rpm-focused', other === win);
        win.el.style.zIndex = String(++zTop);
    }

    // Drag helper: calls onMove(dx, dy) until release, then onEnd().
    function track(startEv, onMove, onEnd) {
        const sx = startEv.clientX, sy = startEv.clientY;
        const move = (e) => { onMove(e.clientX - sx, e.clientY - sy); if (e.cancelable) e.preventDefault(); };
        const up = () => {
            window.removeEventListener(EV.move, move); window.removeEventListener(EV.up, up);
            if (usePointer) window.removeEventListener('pointercancel', up);
            onEnd();
        };
        window.addEventListener(EV.move, move); window.addEventListener(EV.up, up);
        if (usePointer) window.addEventListener('pointercancel', up);
    }

    function open(opts) {
        opts = Object.assign({ width: 420, height: 480, minWidth: 240, minHeight: 140, title: opts.id }, opts);
        if (wins.has(opts.id)) { focus(opts.id); return wins.get(opts.id); }

        const title = el('span', { class: 'rpm-window-title', text: opts.title });
        const maxBtn = el('button', { class: 'rpm-iconbtn', type: 'button', title: 'Maximize', 'aria-label': 'Maximize ' + opts.title, 'aria-pressed': 'false', 'data-winbtn': 'max' }, [icon(ICONS.maximize, 14)]);
        const closeBtn = el('button', { class: 'rpm-iconbtn', type: 'button', title: 'Close', 'aria-label': 'Close ' + opts.title, 'data-winbtn': 'close' }, [icon(ICONS.close, 16)]);
        const head = el('div', { class: 'rpm-window-head' }, [title, maxBtn, closeBtn]);
        const body = el('div', { class: 'rpm-window-body' + (opts.flush ? ' rpm-window-body-flush' : '') });
        const grip = el('div', { class: 'rpm-window-grip', title: 'Resize' });
        const node = el('section', { class: 'rpm-window', role: 'dialog', 'aria-label': opts.title, 'data-window': opts.id }, [head, body, grip]);

        const win = { id: opts.id, el: node, body, opts, geom: null, normal: null, max: false, maxBtn };
        wins.set(opts.id, win);
        layer.appendChild(node);
        const saved = getGeom(opts.id);
        win.normal = clampGeom(initialGeom(opts), opts);
        applyGeom(win, win.normal);
        focus(opts.id);

        // after a move/resize the current geometry becomes the normal one
        const settle = () => { win.normal = win.geom; setGeom(opts.id, Object.assign({}, win.geom, { max: false })); };
        node.addEventListener(EV.down, () => focus(opts.id), true);
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(opts.id); });
        maxBtn.addEventListener('click', (e) => { e.stopPropagation(); setMaximized(win, !win.max); });
        head.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) setMaximized(win, !win.max); });
        head.addEventListener(EV.down, (e) => {
            if (e.button > 0 || e.target.closest('button') || win.max) return;
            const g0 = win.geom;
            track(e, (dx, dy) => applyGeom(win, clampGeom({ x: g0.x + dx, y: g0.y + dy, w: g0.w, h: g0.h }, opts)), settle);
        });
        grip.addEventListener(EV.down, (e) => {
            if (e.button > 0 || win.max) return;
            e.stopPropagation();
            const g0 = win.geom;
            track(e, (dx, dy) => applyGeom(win, clampGeom({ x: g0.x, y: g0.y, w: g0.w + dx, h: g0.h + dy }, opts)), settle);
        });
        if (saved && saved.max) setMaximized(win, true);
        else setGeom(opts.id, Object.assign({}, win.geom, { max: false }));
        return win;
    }

    function close(id) {
        const win = wins.get(id); if (!win) return false;
        wins.delete(id);
        try { win.el.remove(); } catch (_) {}
        try { onClose(id); } catch (_) {}
        return true;
    }

    // Keep every window reachable after the browser window shrinks.
    function reclampAll() {
        for (const win of wins.values()) {
            win.normal = clampGeom(win.normal, win.opts);
            applyGeom(win, win.max ? fullGeom() : win.normal);
        }
    }

    return {
        open, close, focus, reclampAll,
        maximize: (id, on = true) => { const win = wins.get(id); if (win) setMaximized(win, on); return !!win; },
        isOpen: (id) => wins.has(id),
        get: (id) => wins.get(id) || null,
        list: () => [...wins.keys()],
    };
}
