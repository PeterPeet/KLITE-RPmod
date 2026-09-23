// =============================================================================
// KLITE RPmod — App shell
// -----------------------------------------------------------------------------
// One coherent UI around Esolite's chat:
//   • left dock  — stacked collapsible sections (party/character, quest tracker)
//   • right dock — tabbed tools (World, Characters, …)
//   • floating windows — bigger views (quest log, combat, sheet, compendium, …)
//   • one button in Esolite's top bar that shows/hides the docks
//
// Modules contribute UI by registering views (see registerView below); the shell owns
// placement, layout, persistence and theming. Wide screens: the docks push Esolite's
// #maincontainer in ("docked"). Narrow screens: the docks become drawers over the chat
// ("overlay"); phones additionally show windows full-screen ("compact").
//
// Layout preferences are a per-browser convenience kept in localStorage
// (KLITE.shell.layout); losing them only resets positions.
// Public API: window.KLITE_RPMod_Shell
// =============================================================================
import { SHELL_CSS } from './styles.js';
import { createWindowManager } from './windows.js';
import { el, clear, icon, ICONS } from './dom.js';

const STORE_KEY = 'KLITE.shell.layout';
const MIN_CHAT_WIDTH = 560;   // below this the docks stop pushing the chat and overlay it
const COMPACT_WIDTH = 600;    // phones: full-screen windows

export default function initShell() {
    'use strict';
    if (window.KLITE_RPMod_Shell) return;

    // ---- layout persistence -------------------------------------------------
    const DEFAULT_LAYOUT = { left: { open: true, width: 260 }, right: { open: true, width: 350, tab: null }, sections: {}, windows: {} };
    const layout = loadLayout();
    function loadLayout() {
        const base = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
        try {
            const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
            if (saved && typeof saved === 'object') {
                for (const k of ['left', 'right']) if (saved[k] && typeof saved[k] === 'object') Object.assign(base[k], saved[k]);
                for (const k of ['sections', 'windows']) if (saved[k] && typeof saved[k] === 'object') base[k] = saved[k];
            }
        } catch (_) {}
        return base;
    }
    function saveLayout() { try { localStorage.setItem(STORE_KEY, JSON.stringify(layout)); } catch (_) {} }

    // ---- state ----------------------------------------------------------------
    const views = new Map();   // id -> { def, container, mounted, dirty, tab?, section? }
    const open = { left: false, right: false };   // runtime dock visibility
    let mode = 'docked';       // 'docked' | 'overlay'
    let compact = false;
    let dom = null;            // built by mount()
    let wm = null;
    let shownTab = null;       // right-dock view whose show() ran last

    const PLACES = new Set(['left', 'right', 'window']);
    function sortedViews(place) {
        return [...views.values()].filter(v => v.def.place === place)
            .sort((a, b) => (a.def.order ?? 100) - (b.def.order ?? 100) || String(a.def.id).localeCompare(String(b.def.id)));
    }
    const hasViews = (place) => sortedViews(place).length > 0;

    // ---- views ----------------------------------------------------------------
    // def = { id, title, place: 'left'|'right'|'window', order?, mount(container, api),
    //         update?(container, api), window?: { width, height, minWidth, minHeight },
    //         eager?: true — right-dock view mounts at once instead of on first show,
    //         show?(container, api) — called every time a right-dock view becomes the
    //         selected tab (after mount/update),
    //         unmount?(container, api) — window views: called when the window closes
    //         (remove global listeners etc.) }
    // def.window may also carry { large, flush } (see windows.js) and restore: false —
    // do not reopen the window at startup even if it was open last time.
    function registerView(def) {
        if (!def || !def.id || !PLACES.has(def.place) || typeof def.mount !== 'function') {
            throw new Error('KLITE_RPMod_Shell.registerView: need { id, place: left|right|window, mount }');
        }
        if (views.has(def.id)) unregisterView(def.id);
        views.set(def.id, { def, container: null, mounted: false, dirty: false });
        if (dom) {
            // first view on a side: honour the saved dock preference
            if (def.place !== 'window' && mode === 'docked' && layout[def.place].open) open[def.place] = true;
            placeView(views.get(def.id));
            if (def.place === 'window' && shouldRestoreWindow(def.id)) openView(def.id);
            applyLayout();
        }
        return api;
    }

    function unregisterView(id) {
        const v = views.get(id); if (!v) return;
        if (v.def.place === 'window' && wm) wm.close(id);
        try { v.tab && v.tab.remove(); v.section && v.section.remove(); v.def.place === 'right' && v.container && v.container.remove(); } catch (_) {}
        views.delete(id);
        if (shownTab === id) shownTab = null;
        if (dom) { if (v.def.place === 'right') renderTabs(); applyLayout(); }
    }

    function mountView(v) {
        if (!v.container) return;
        clear(v.container);
        try { v.def.mount(v.container, api); v.mounted = true; v.dirty = false; }
        catch (e) { console.error('[RPmod shell] view failed to render:', v.def.id, e); v.container.appendChild(el('div', { class: 'rpm-muted rpm-view-pad', text: 'This panel failed to load. See the browser console.' })); }
    }

    function placeView(v) {
        const { def } = v;
        if (def.place === 'right') {
            v.container = el('div', { class: 'rpm-view', role: 'tabpanel', id: 'rpm-view-' + def.id, 'data-view': def.id });
            dom.rightBody.appendChild(v.container);
            if (def.eager) mountView(v);
            renderTabs();
        } else if (def.place === 'left') {
            const collapsed = !!(layout.sections[def.id] && layout.sections[def.id].collapsed);
            const head = el('button', { class: 'rpm-section-head', type: 'button', 'aria-expanded': String(!collapsed) }, [icon(ICONS.chevronDown, 14), el('span', { text: def.title || def.id })]);
            v.container = el('div', { class: 'rpm-section-body', 'data-view': def.id });
            v.section = el('section', { class: 'rpm-section' + (collapsed ? ' rpm-collapsed' : ''), 'data-section': def.id }, [head, v.container]);
            head.addEventListener('click', () => setSectionCollapsed(def.id, !v.section.classList.contains('rpm-collapsed')));
            // keep sections in order
            const after = sortedViews('left').map(x => x.section).filter(Boolean);
            const idx = after.indexOf(v.section);
            const next = after.slice(idx + 1).find(s => s.parentNode === dom.leftBody);
            dom.leftBody.insertBefore(v.section, next || null);
            mountView(v);
        }
    }

    function setSectionCollapsed(id, collapsed) {
        const v = views.get(id); if (!v || !v.section) return;
        v.section.classList.toggle('rpm-collapsed', collapsed);
        v.section.querySelector('.rpm-section-head').setAttribute('aria-expanded', String(!collapsed));
        layout.sections[id] = { collapsed }; saveLayout();
        if (!collapsed && v.dirty) mountOrUpdate(v);
    }

    // The selected tab: the user's saved choice if that view exists (it may register
    // later, e.g. ALPHA), else the first by order. Only explicit clicks are saved.
    function currentTab() {
        const list = sortedViews('right');
        return list.some(v => v.def.id === layout.right.tab) ? layout.right.tab : (list.length ? list[0].def.id : null);
    }

    function renderTabs() {
        clear(dom.tabs);
        const list = sortedViews('right');
        const active = currentTab();
        for (const v of list) {
            const sel = v.def.id === active;
            v.tab = el('button', { class: 'rpm-tab', type: 'button', role: 'tab', 'aria-selected': String(sel), 'aria-controls': 'rpm-view-' + v.def.id, 'data-tab': v.def.id, text: v.def.title || v.def.id });
            v.tab.addEventListener('click', () => selectTab(v.def.id));
            dom.tabs.appendChild(v.tab);
            v.container.classList.toggle('rpm-active', sel);
            if (sel && (!v.mounted || v.dirty)) mountOrUpdate(v);
            if (sel && v.def.id !== shownTab) callShow(v);
        }
    }

    function callShow(v) {
        shownTab = v.def.id;
        if (typeof v.def.show !== 'function') return;
        try { v.def.show(v.container, api); } catch (e) { console.error('[RPmod shell] view show failed:', v.def.id, e); }
    }

    function selectTab(id, { save = true } = {}) {
        if (save) { layout.right.tab = id; saveLayout(); }
        for (const v of sortedViews('right')) {
            const sel = v.def.id === id;
            if (v.tab) v.tab.setAttribute('aria-selected', String(sel));
            if (v.container) v.container.classList.toggle('rpm-active', sel);
            if (sel && (!v.mounted || v.dirty)) mountOrUpdate(v);
            if (sel && id !== shownTab) callShow(v);
        }
    }

    function mountOrUpdate(v) {
        if (v.mounted && typeof v.def.update === 'function') {
            try { v.def.update(v.container, api); v.dirty = false; } catch (e) { console.error('[RPmod shell] view update failed:', v.def.id, e); }
        } else mountView(v);
    }

    function isVisible(v) {
        if (!v.container) return false;
        if (v.def.place === 'right') return v.def.id === currentTab();
        if (v.def.place === 'left') return !v.section.classList.contains('rpm-collapsed');
        return wm && wm.isOpen(v.def.id);
    }

    // Re-render views (all, or the given ids). Hidden views are marked dirty and render
    // when they become visible. soft=true skips a view while the user is typing in it.
    function refresh(ids, { soft = false } = {}) {
        const want = ids ? new Set([].concat(ids)) : null;
        for (const v of views.values()) {
            if (want && !want.has(v.def.id)) continue;
            if (!v.container) continue;
            if (!isVisible(v)) { v.dirty = true; continue; }
            if (soft) {
                const a = document.activeElement;
                if (a && v.container.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { v.dirty = true; continue; }
            }
            mountOrUpdate(v);
        }
    }

    // Windows left open last time come back on load — except on phones, where a window
    // is full-screen and would hide the chat at startup.
    function shouldRestoreWindow(id) {
        const v = views.get(id);
        if (v && v.def.window && v.def.window.restore === false) return false;
        return !compact && !!(layout.windows[id] && layout.windows[id].open);
    }

    function openView(id) {
        const v = views.get(id); if (!v) return false;
        const { def } = v;
        if (def.place === 'right') { setDockOpen('right', true); selectTab(id); return true; }
        if (def.place === 'left') { setDockOpen('left', true); setSectionCollapsed(id, false); return true; }
        if (!wm) return false;
        const already = wm.isOpen(id);
        const win = wm.open(Object.assign({ id, title: def.title || id }, def.window || {}));
        if (!already) { v.container = win.body; v.mounted = false; mountView(v); }
        layout.windows[id] = Object.assign({}, layout.windows[id], { open: true }); saveLayout();
        return true;
    }

    function closeView(id) {
        const v = views.get(id); if (!v) return false;
        if (v.def.place === 'window') return wm ? wm.close(id) : false;
        return false;
    }

    // ---- docks + layout --------------------------------------------------------
    function setDockOpen(side, value) {
        if (value && !hasViews(side)) value = false;
        open[side] = !!value;
        if (mode === 'docked') { layout[side].open = open[side]; saveLayout(); }
        if (open[side] && mode === 'overlay') {   // drawers: only one at a time
            const other = side === 'left' ? 'right' : 'left';
            open[other] = false;
        }
        applyLayout();
        if (open[side]) refresh(sortedViews(side).filter(v => v.dirty).map(v => v.def.id));
    }
    function toggleDock(side) { setDockOpen(side, !open[side]); }

    function computeMode() {
        const vw = window.innerWidth || 1024;
        compact = vw < COMPACT_WIDTH;
        const need = layout.left.width + layout.right.width + MIN_CHAT_WIDTH;
        return vw >= need ? 'docked' : 'overlay';
    }

    function syncMode(initial) {
        const next = computeMode();
        if (initial || next !== mode) {
            mode = next;
            if (mode === 'docked') { open.left = layout.left.open && hasViews('left'); open.right = layout.right.open && hasViews('right'); }
            else { open.left = false; open.right = false; }
        }
        applyLayout();
        if (wm) wm.reclampAll();
    }

    function applyLayout() {
        if (!dom) return;
        if (!hasViews('left')) open.left = false;
        if (!hasViews('right')) open.right = false;
        const root = document.documentElement.style;
        root.setProperty('--rpm-left-w', layout.left.width + 'px');
        root.setProperty('--rpm-right-w', layout.right.width + 'px');
        root.setProperty('--rpm-push-left', (mode === 'docked' && open.left ? layout.left.width : 0) + 'px');
        root.setProperty('--rpm-push-right', (mode === 'docked' && open.right ? layout.right.width : 0) + 'px');
        document.body.classList.toggle('rpm-docked', mode === 'docked');
        dom.root.classList.toggle('rpm-overlay', mode === 'overlay');
        dom.root.classList.toggle('rpm-compact', compact);
        for (const side of ['left', 'right']) {
            dom[side].classList.toggle('rpm-closed', !open[side]);
            dom[side].setAttribute('aria-hidden', String(!open[side]));
            dom['handle_' + side].hidden = open[side] || !hasViews(side);
        }
        if (dom.navBtn) dom.navBtn.setAttribute('aria-pressed', String(open.left || open.right));
    }

    // ---- build DOM -------------------------------------------------------------
    function buildDock(side) {
        const closeBtn = el('button', { class: 'rpm-iconbtn', type: 'button', title: 'Hide panel', 'aria-label': 'Hide ' + side + ' panel' }, [icon(side === 'left' ? ICONS.chevronLeft : ICONS.chevronRight, 16)]);
        closeBtn.addEventListener('click', () => setDockOpen(side, false));
        const head = el('div', { class: 'rpm-dock-head' });
        const body = el('div', { class: 'rpm-dock-body' });
        const dock = el('aside', { class: 'rpm-dock rpm-dock-' + side, id: 'rpm-dock-' + side, 'aria-label': side === 'left' ? 'RPmod adventure panel' : 'RPmod tools panel' }, [head, body]);
        let tabs = null;
        const actions = el('div', { class: 'rpm-dock-actions', style: 'display:flex;gap:2px' });
        if (side === 'left') {
            head.appendChild(el('span', { class: 'rpm-title', text: 'Adventure' }));
            head.appendChild(actions);
            head.appendChild(closeBtn);
        } else {
            head.appendChild(closeBtn);
            tabs = el('div', { class: 'rpm-tabs', role: 'tablist', 'aria-label': 'RPmod tools' });
            head.appendChild(tabs);
            head.appendChild(actions);
        }
        return { dock, body, tabs, actions };
    }

    function mount() {
        if (dom || !document.body) return;
        if (!document.getElementById('rpm-shell-styles')) {
            document.head.appendChild(el('style', { id: 'rpm-shell-styles', text: SHELL_CSS }));
        }
        const L = buildDock('left'), R = buildDock('right');
        const hl = el('button', { class: 'rpm-handle rpm-handle-left', type: 'button', title: 'Show adventure panel', 'aria-label': 'Show adventure panel' }, [icon(ICONS.chevronRight, 14)]);
        const hr = el('button', { class: 'rpm-handle rpm-handle-right', type: 'button', title: 'Show tools panel', 'aria-label': 'Show tools panel' }, [icon(ICONS.chevronLeft, 14)]);
        hl.addEventListener('click', () => setDockOpen('left', true));
        hr.addEventListener('click', () => setDockOpen('right', true));
        const layer = el('div', { class: 'rpm-windows' });
        const root = el('div', { id: 'rpm-shell' }, [L.dock, R.dock, hl, hr, layer]);
        document.body.appendChild(root);

        dom = { root, left: L.dock, right: R.dock, leftBody: L.body, rightBody: R.body, tabs: R.tabs, actions_left: L.actions, actions_right: R.actions, handle_left: hl, handle_right: hr, layer, navBtn: null };
        for (const a of dockActions) renderDockAction(a);
        wm = createWindowManager({
            layer,
            getGeom: (id) => layout.windows[id] || null,
            setGeom: (id, g) => { layout.windows[id] = Object.assign({}, layout.windows[id], g, { open: true }); saveLayout(); },
            onClose: (id) => {
                layout.windows[id] = Object.assign({}, layout.windows[id], { open: false }); saveLayout();
                const v = views.get(id); if (!v) return;
                if (v.container && typeof v.def.unmount === 'function') {
                    try { v.def.unmount(v.container, api); } catch (e) { console.error('[RPmod shell] view unmount failed:', id, e); }
                }
                v.container = null; v.mounted = false;
            },
        });

        for (const place of ['left', 'right']) for (const v of sortedViews(place)) placeView(v);
        syncMode(true);
        for (const v of sortedViews('window')) if (shouldRestoreWindow(v.def.id)) openView(v.def.id);

        let resizeTimer = null;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => syncMode(false), 80); });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || mode !== 'overlay' || !(open.left || open.right)) return;
            if (document.querySelector('.popupcontainer:not(.hidden)')) return;   // host dialog has Escape
            open.left = open.right = false; applyLayout();
        });

        installNavButton();
        adoptAlphaPanel();
    }

    // ---- small header buttons (e.g. the Guide's "?") ------------------------------
    const dockActions = [];
    function addDockAction(side, action) {
        if (!action || !action.id || (side !== 'left' && side !== 'right') || typeof action.onClick !== 'function') return;
        if (dockActions.some(a => a.id === action.id)) return;
        const a = Object.assign({ side }, action);
        dockActions.push(a);
        if (dom) renderDockAction(a);
    }
    function renderDockAction(a) {
        // action.icon: a Lucide name (icons.js); otherwise the text label
        const b = a.icon
            ? el('button', { class: 'rpm-iconbtn', type: 'button', title: a.title || a.id, 'aria-label': a.title || a.id, 'data-action': a.id }, [icon(a.icon, 16)])
            : el('button', { class: 'rpm-iconbtn', type: 'button', title: a.title || a.id, 'aria-label': a.title || a.id, 'data-action': a.id, text: a.label || '•', style: 'font-weight:bold' });
        b.addEventListener('click', () => { try { a.onClick(); } catch (e) { console.error('[RPmod shell] action failed:', a.id, e); } });
        dom['actions_' + a.side].appendChild(b);
    }

    // ---- Esolite top bar: the single RPmod entry point ------------------------
    function installNavButton() {
        let tries = 0;
        const attempt = () => {
            if (document.getElementById('rpm-navbtn')) return true;
            const ul = document.querySelector('#navbarNavDropdown > ul');
            if (!ul) return false;
            // Esolite's own top-bar button markup (a.nav-link.mainnav), so it is themed
            // and sized exactly like "Library" / "Quick Start".
            const btn = el('a', { id: 'rpm-navbtn', href: '#', role: 'button', class: 'nav-link mainnav', title: 'Show or hide the RPmod panels', 'aria-pressed': 'false',
                style: 'display:flex;align-items:center;gap:6px' }, [icon(ICONS.shell, 16), el('span', { text: 'RPmod' })]);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const anyOpen = open.left || open.right;
                if (mode === 'overlay') setDockOpen('right', !anyOpen);
                else { setDockOpen('left', !anyOpen); setDockOpen('right', !anyOpen); }
            });
            ul.appendChild(el('li', { class: 'nav-item' }, [btn]));
            dom.navBtn = btn; applyLayout();
            return true;
        };
        if (attempt()) return;
        const timer = setInterval(() => { if (attempt() || ++tries > 120) clearInterval(timer); }, 500);
    }

    // ---- ALPHA: its right panel becomes four shell tabs ---------------------------
    // ALPHA builds one #panel-right (sub-tabs CHARS/ROLES/SCENARIO/TOOLS) asynchronously
    // in its own fixed wrapper. We move that element into the shell at once (a hidden
    // stash, so it never floats over the page), hide ALPHA's own tab bar, and register one
    // shell tab per sub-tab: showing a tab moves the panel into it and asks ALPHA to
    // render that sub-tab. ALPHA's event delegation (closest('#panel-right')) keeps working.
    const ALPHA_TABS = [
        { key: 'CHARS', id: 'chars', title: 'Chars', order: 50 },
        { key: 'ROLES', id: 'roles', title: 'Roles', order: 51 },
        { key: 'SCENARIO', id: 'scenario', title: 'Scenario', order: 52 },
        { key: 'TOOLS', id: 'tools', title: 'Tools', order: 53 },
    ];
    function adoptAlphaPanel() {
        let tries = 0;
        const attempt = () => {
            const panel = document.getElementById('panel-right');
            if (!panel || !panel.classList.contains('klite-panel')) return false;
            if (panel.closest('#rpm-shell')) return true;
            const stash = el('div', { class: 'rpm-stash', 'aria-hidden': 'true' });
            dom.root.appendChild(stash);
            stash.appendChild(panel);
            panel.classList.remove('collapsed');
            const alpha = () => window.KLITE_RPMod;
            for (const tab of ALPHA_TABS) {
                registerView({
                    id: tab.id, title: tab.title, place: 'right', order: tab.order,
                    mount() {}, update() {},   // ALPHA renders itself
                    show(container) {
                        if (panel.parentNode !== container) container.appendChild(panel);
                        const A = alpha();
                        const current = A && A.state && A.state.tabs && A.state.tabs.right;
                        if (A && typeof A.switchTab === 'function' && current !== tab.key) A.switchTab('right', tab.key);
                    },
                });
            }
            return true;
        };
        if (attempt()) return;
        const timer = setInterval(() => { if (attempt() || ++tries > 200) clearInterval(timer); }, 300);
    }

    // ---- public API --------------------------------------------------------------
    const api = {
        registerView, unregisterView,
        open: openView, close: closeView, refresh,
        isOpen: (id) => { const v = views.get(id); return !!(v && isVisible(v) && (v.def.place !== 'right' || open.right) && (v.def.place !== 'left' || open.left)); },
        maximize: (id, on = true) => !!(wm && wm.maximize(id, on)),
        setDockOpen, toggleDock, addDockAction,
        dockOpen: (side) => !!open[side],
        mode: () => mode,
        views: () => [...views.keys()],
        layout: () => JSON.parse(JSON.stringify(layout)),
        mount,
    };
    window.KLITE_RPMod_Shell = api;

    if (document.readyState === 'complete') mount();
    else window.addEventListener('load', mount);
}
