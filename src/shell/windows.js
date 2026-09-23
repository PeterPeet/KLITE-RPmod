// Floating window manager: draggable, resizable, focus/raise, geometry remembered via
// the callbacks, always kept inside the viewport. Mouse and touch both work (pointer
// events when available, mouse events otherwise).
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
        if (saved && [saved.x, saved.y, saved.w, saved.h].every(Number.isFinite)) return saved;
        const vp = viewport();
        const w = opts.width, h = opts.height;
        const off = (cascade++ % 6) * 28;
        return { x: (vp.w - w) / 2 + off, y: Math.max(40, (vp.h - h) / 3) + off, w, h };
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
        const closeBtn = el('button', { class: 'rpm-iconbtn', type: 'button', title: 'Close', 'aria-label': 'Close ' + opts.title }, [icon(ICONS.close, 16)]);
        const head = el('div', { class: 'rpm-window-head' }, [title, closeBtn]);
        const body = el('div', { class: 'rpm-window-body' });
        const grip = el('div', { class: 'rpm-window-grip', title: 'Resize' });
        const node = el('section', { class: 'rpm-window', role: 'dialog', 'aria-label': opts.title, 'data-window': opts.id }, [head, body, grip]);

        const win = { id: opts.id, el: node, body, opts, geom: null };
        wins.set(opts.id, win);
        layer.appendChild(node);
        applyGeom(win, clampGeom(initialGeom(opts), opts));
        focus(opts.id);

        node.addEventListener(EV.down, () => focus(opts.id), true);
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(opts.id); });
        head.addEventListener(EV.down, (e) => {
            if (e.button > 0 || e.target.closest('button')) return;
            const g0 = win.geom;
            track(e, (dx, dy) => applyGeom(win, clampGeom({ x: g0.x + dx, y: g0.y + dy, w: g0.w, h: g0.h }, opts)),
                () => setGeom(opts.id, win.geom));
        });
        grip.addEventListener(EV.down, (e) => {
            if (e.button > 0) return;
            e.stopPropagation();
            const g0 = win.geom;
            track(e, (dx, dy) => applyGeom(win, clampGeom({ x: g0.x, y: g0.y, w: g0.w + dx, h: g0.h + dy }, opts)),
                () => setGeom(opts.id, win.geom));
        });
        setGeom(opts.id, win.geom);
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
    function reclampAll() { for (const win of wins.values()) applyGeom(win, clampGeom(win.geom, win.opts)); }

    return {
        open, close, focus, reclampAll,
        isOpen: (id) => wins.has(id),
        get: (id) => wins.get(id) || null,
        list: () => [...wins.keys()],
    };
}
