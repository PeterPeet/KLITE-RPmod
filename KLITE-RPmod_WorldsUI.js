// =============================================================================
// KLITE RPmod - Worlds System :: Editor UI (Phase 6)
// -----------------------------------------------------------------------------
// A node-graph editor for the Worlds data model, rendered as a full-screen
// overlay (same pattern as Esolite's TreeViewer: dim layer on document.body,
// wheel-zoom, drag-pan, close button), plus a compact floating runtime panel and
// a navbar launch button.
//
// Nodes are colour-coded world entities (Location/NPC/Faction/Object/Event/Lore
// + the World root). Edges are the id-reference fields: drawing an arrow calls
// KLITE_RPMod_Worlds.connect(a,b), which infers the relationship from the two
// node types and writes the matching field, so the graph IS the retrieval data.
//
// All rendering uses createElement/textContent (no innerHTML with user content),
// consistent with the mod's sanitisation model.
// Depends on window.KLITE_RPMod_Worlds (the data/engine module).
// =============================================================================
(function () {
    'use strict';
    if (window.KLITE_RPMod_WorldsUI) return;

    const NODE_W = 148, NODE_H = 46;
    const TYPE_COLOR = {
        world: '#5F5E5A', location: '#1D9E75', npc: '#7F77DD',
        faction: '#D4537E', object: '#BA7517', event: '#D85A30', lore: '#378ADD'
    };
    const TYPES = ['location', 'npc', 'faction', 'object', 'event', 'lore'];
    const SVGNS = 'http://www.w3.org/2000/svg';

    function API() { return window.KLITE_RPMod_Worlds; }

    // ---- tiny DOM helpers -------------------------------------------------
    function el(tag, props, kids) {
        const e = document.createElement(tag);
        if (props) for (const k in props) {
            if (k === 'style') e.style.cssText = props[k];
            else if (k === 'text') e.textContent = props[k];
            else if (k === 'class') e.className = props[k];
            else if (k.slice(0, 2) === 'on' && typeof props[k] === 'function') e.addEventListener(k.slice(2), props[k]);
            else if (props[k] != null) e.setAttribute(k, props[k]);
        }
        for (const c of [].concat(kids || [])) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        return e;
    }
    function svg(tag, attrs) {
        const e = document.createElementNS(SVGNS, tag);
        if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
        return e;
    }
    function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

    // ---- editor state -----------------------------------------------------
    const S = {
        overlay: null, gEdges: null, gNodes: null, svgRoot: null, viewport: null,
        inspector: null, header: null, worldNameInput: null,
        scale: 1, tx: 60, ty: 40,
        tool: 'select', selectedId: null, linkSource: null,
        G: { nodes: [], edges: [] },
        drag: null, pan: null
    };

    // =======================================================================
    //  LAYOUT — assign positions to nodes that don't have any
    // =======================================================================
    function ensureLayout() {
        const missing = S.G.nodes.filter(n => n.x == null || n.y == null);
        if (!missing.length) return;
        const cx = 460, cy = 300;
        const root = S.G.nodes.find(n => n.type === 'world');
        if (root && (root.x == null)) { root.x = 150; root.y = cy; API().setNodePos(root.id, root.x, root.y); }
        let i = 0;
        for (const n of missing) {
            if (n.type === 'world') continue;
            const ang = (i / Math.max(1, missing.length)) * Math.PI * 2;
            n.x = Math.round(cx + Math.cos(ang) * (180 + (i % 3) * 70));
            n.y = Math.round(cy + Math.sin(ang) * (150 + (i % 4) * 55));
            API().setNodePos(n.id, n.x, n.y);
            i++;
        }
    }

    function reloadGraph() {
        S.G = API().getGraph();
        ensureLayout();
    }

    // =======================================================================
    //  RENDER
    // =======================================================================
    function applyViewport() { S.viewport.setAttribute('transform', `translate(${S.tx},${S.ty}) scale(${S.scale})`); }

    function nodeById(id) { return S.G.nodes.find(n => n.id === id); }

    function draw() {
        clear(S.gEdges); clear(S.gNodes);
        // edges
        for (const e of S.G.edges) {
            const a = nodeById(e.from), b = nodeById(e.to);
            if (!a || !b) continue;
            const line = svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: e.kind === 'contains' ? '#555' : '#8a8a8a', 'stroke-width': e.kind === 'contains' ? 1 : 1.6, 'marker-end': 'url(#wm-arrow)' });
            if (e.kind === 'contains') line.setAttribute('stroke-dasharray', '4 4');
            S.gEdges.appendChild(line);
            if (e.kind !== 'contains') {
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const t = svg('text', { x: mx, y: my - 3, 'text-anchor': 'middle', 'font-size': 9, fill: '#999' }); t.textContent = e.kind;
                S.gEdges.appendChild(t);
            }
        }
        // in-progress link
        if (S.tool === 'link' && S.linkSource) {
            const a = nodeById(S.linkSource);
            if (a) { const l = svg('line', { x1: a.x, y1: a.y, x2: a.x, y2: a.y, stroke: '#e0a', 'stroke-width': 1.6, 'stroke-dasharray': '5 4', id: 'wm-linkline' }); S.gEdges.appendChild(l); }
        }
        // nodes
        for (const n of S.G.nodes) {
            const g = svg('g', { transform: `translate(${n.x - NODE_W / 2},${n.y - NODE_H / 2})`, 'data-id': n.id, style: 'cursor:pointer' });
            const isRoot = n.type === 'world';
            const w = isRoot ? NODE_W + 12 : NODE_W, h = isRoot ? NODE_H + 8 : NODE_H;
            if (isRoot) g.setAttribute('transform', `translate(${n.x - w / 2},${n.y - h / 2})`);
            const rect = svg('rect', { x: 0, y: 0, width: w, height: h, rx: 10, fill: TYPE_COLOR[n.type] || '#666' });
            g.appendChild(rect);
            if (n.id === S.selectedId) g.appendChild(svg('rect', { x: -3, y: -3, width: w + 6, height: h + 6, rx: 12, fill: 'none', stroke: '#fff', 'stroke-width': 2 }));
            if (n.id === S.linkSource) g.appendChild(svg('rect', { x: -3, y: -3, width: w + 6, height: h + 6, rx: 12, fill: 'none', stroke: '#ff3ea5', 'stroke-width': 2 }));
            const name = svg('text', { x: 12, y: 22, 'font-size': 13, 'font-weight': 500, fill: '#fff' }); name.textContent = clip(n.name, 20);
            const type = svg('text', { x: 12, y: 37, 'font-size': 10, fill: 'rgba(255,255,255,.8)' }); type.textContent = isRoot ? 'World · root' : n.type + (n.id === S.selectedId ? ' · selected' : '');
            g.appendChild(name); g.appendChild(type);
            g.addEventListener('mousedown', ev => onNodeDown(ev, n.id));
            S.gNodes.appendChild(g);
        }
    }
    function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

    // =======================================================================
    //  INTERACTIONS
    // =======================================================================
    function screenToGraph(clientX, clientY) {
        const r = S.svgRoot.getBoundingClientRect();
        return { x: (clientX - r.left - S.tx) / S.scale, y: (clientY - r.top - S.ty) / S.scale };
    }

    function onNodeDown(ev, id) {
        ev.stopPropagation();
        if (S.tool === 'link') {
            if (!S.linkSource) { S.linkSource = id; draw(); }
            else if (S.linkSource !== id) {
                try { API().connect(S.linkSource, id); } catch (e) { toast(e.message || 'cannot connect', true); }
                S.linkSource = null; reloadGraph(); draw();
            } else { S.linkSource = null; draw(); }
            return;
        }
        // select + start drag
        select(id);
        const start = screenToGraph(ev.clientX, ev.clientY);
        const n = nodeById(id);
        S.drag = { id, dx: start.x - n.x, dy: start.y - n.y, moved: false };
    }

    function onCanvasDown(ev) {
        if (S.tool === 'link') { S.linkSource = null; draw(); return; }
        select(null);
        S.pan = { x: ev.clientX, y: ev.clientY, tx: S.tx, ty: S.ty };
    }

    function onMove(ev) {
        if (S.drag) {
            const p = screenToGraph(ev.clientX, ev.clientY);
            const n = nodeById(S.drag.id);
            n.x = Math.round(p.x - S.drag.dx); n.y = Math.round(p.y - S.drag.dy);
            S.drag.moved = true;
            draw();
        } else if (S.pan) {
            S.tx = S.pan.tx + (ev.clientX - S.pan.x);
            S.ty = S.pan.ty + (ev.clientY - S.pan.y);
            applyViewport();
        } else if (S.tool === 'link' && S.linkSource) {
            const l = document.getElementById('wm-linkline');
            if (l) { const p = screenToGraph(ev.clientX, ev.clientY); l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); }
        }
    }
    function onUp() {
        if (S.drag && S.drag.moved) { const n = nodeById(S.drag.id); API().setNodePos(S.drag.id, n.x, n.y); }
        S.drag = null; S.pan = null;
    }
    function onWheel(ev) {
        ev.preventDefault();
        const r = S.svgRoot.getBoundingClientRect();
        const mx = ev.clientX - r.left, my = ev.clientY - r.top;
        const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
        const ns = Math.max(0.2, Math.min(3, S.scale * factor));
        // zoom toward cursor
        S.tx = mx - (mx - S.tx) * (ns / S.scale);
        S.ty = my - (my - S.ty) * (ns / S.scale);
        S.scale = ns;
        applyViewport(); updateZoomLabel();
    }

    function select(id) { S.selectedId = id; draw(); renderInspector(); }

    function setTool(t) {
        S.tool = t; S.linkSource = null;
        S.overlay.querySelectorAll('[data-tool]').forEach(b => b.style.outline = (b.getAttribute('data-tool') === t ? '2px solid #6cf' : 'none'));
        draw();
    }

    function fit() {
        const ns = S.G.nodes.filter(n => n.x != null);
        if (!ns.length) return;
        const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
        const minX = Math.min(...xs) - 100, maxX = Math.max(...xs) + 100;
        const minY = Math.min(...ys) - 80, maxY = Math.max(...ys) + 80;
        const cw = S.svgRoot.clientWidth || 700, ch = S.svgRoot.clientHeight || 500;
        S.scale = Math.max(0.2, Math.min(1.5, Math.min(cw / (maxX - minX), ch / (maxY - minY))));
        S.tx = -minX * S.scale + (cw - (maxX - minX) * S.scale) / 2;
        S.ty = -minY * S.scale + (ch - (maxY - minY) * S.scale) / 2;
        applyViewport(); updateZoomLabel();
    }
    function updateZoomLabel() { const z = S.overlay && S.overlay.querySelector('#wm-zoom'); if (z) z.textContent = Math.round(S.scale * 100) + '%'; }

    // =======================================================================
    //  INSPECTOR
    // =======================================================================
    const FIELDS = {
        world: [['name', 'Name', 'input'], ['description', 'Entry', 'area']],
        location: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['biome', 'Biome', 'input'], ['atmosphere', 'Atmosphere', 'input']],
        npc: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['personality', 'Personality', 'input'], ['mood', 'Mood', 'input']],
        faction: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['goals', 'Goals', 'input']],
        object: [['name', 'Name', 'input'], ['desc', 'Entry', 'area']],
        event: [['name', 'Name', 'input'], ['description', 'Entry', 'area']],
        lore: [['content', 'Entry', 'area'], ['keys', 'Keywords (comma)', 'input']]
    };

    function renderInspector() {
        const box = S.inspector; clear(box);
        const A = API();
        if (!S.selectedId) { box.appendChild(el('div', { style: 'color:#888;font-size:13px;padding:8px 2px', text: 'Select a node to edit, or add one from the palette.' })); return; }
        const type = A.entityType(S.selectedId) || (S.selectedId === '__world__' ? 'world' : null);
        const ent = A.entityById(S.selectedId);
        if (!ent || !type) return;
        box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:8px' }, [
            el('span', { style: `background:${TYPE_COLOR[type]};color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;text-transform:capitalize`, text: type }),
            el('span', { style: 'color:#999;font-size:11px', text: '#' + String(S.selectedId).slice(-4) })
        ]));
        if (type !== 'world') {
            const tsel = el('select', { style: inputCss(false) + ';cursor:pointer' });
            for (const tt of TYPES) { const o = el('option', { value: tt, text: 'Type: ' + tt }); if (tt === type) o.selected = true; tsel.appendChild(o); }
            tsel.addEventListener('change', () => {
                if (tsel.value !== type && confirm(`Change this node from ${type} to ${tsel.value}? Type-specific connections will be cleared.`)) {
                    const keep = S.selectedId; API().changeEntityType(keep, tsel.value); reloadGraph(); S.selectedId = keep; draw(); renderInspector();
                } else renderInspector();
            });
            box.appendChild(tsel);
        }
        for (const [field, label, kind] of (FIELDS[type] || [])) {
            box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:8px 0 3px', text: label }));
            let cur = ent[field]; if (field === 'keys') cur = Array.isArray(ent.keys) ? ent.keys.join(', ') : (ent.keys || '');
            const input = kind === 'area'
                ? el('textarea', { style: inputCss(true), rows: 4 })
                : el('input', { type: 'text', style: inputCss(false) });
            input.value = cur == null ? '' : cur;
            input.addEventListener('input', () => {
                let v = input.value;
                if (field === 'keys') v = v.split(',').map(s => s.trim()).filter(Boolean);
                A.updateEntity(S.selectedId, { [field]: v });
                // refresh only the node label live
                const n = nodeById(S.selectedId); if (n) { n.name = (type === 'lore') ? (v && v.length ? String(v).slice(0, 28) : n.name) : (field === 'name' ? input.value : n.name); if (field === 'description' || field === 'desc' || field === 'content') n.entry = input.value; }
                if (field === 'name' || (type === 'lore' && field === 'content')) draw();
                if (S.selectedId === '__world__' && field === 'name' && S.worldNameInput) S.worldNameInput.value = input.value;
            });
            box.appendChild(input);
        }
        // connections
        const conns = S.G.edges.filter(e => (e.from === S.selectedId || e.to === S.selectedId) && e.kind !== 'contains');
        box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;font-weight:500;margin:14px 0 4px', text: 'Connections' }));
        if (!conns.length) box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'None. Use the Link tool to connect nodes.' }));
        for (const e of conns) {
            const otherId = e.from === S.selectedId ? e.to : e.from;
            const other = nodeById(otherId);
            const row = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;background:#2a2a2a;border:1px solid #3a3a3a;border-radius:6px;padding:4px 8px;margin-top:4px' }, [
                el('span', { style: 'font-size:11px;color:#ddd' }, [`→ ${clip(other ? other.name : otherId, 18)} `, el('span', { style: 'color:#888', text: e.kind })]),
                el('span', { style: 'cursor:pointer;color:#e66;font-size:14px;padding:0 4px', text: '×', onclick: () => { API().disconnect(e.from, e.to); reloadGraph(); draw(); renderInspector(); } })
            ]);
            box.appendChild(row);
        }
        if (type !== 'world') {
            box.appendChild(el('button', {
                style: 'margin-top:16px;background:#5a1f1f;color:#f2b8b8;border:1px solid #7a2a2a;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;width:100%',
                text: '🗑  Delete node',
                onclick: () => { if (confirm('Delete this node?')) { API().deleteEntity(S.selectedId); S.selectedId = null; reloadGraph(); draw(); renderInspector(); } }
            }));
        }
    }
    function inputCss(area) { return `width:100%;box-sizing:border-box;background:#242424;color:#eee;border:1px solid #3a3a3a;border-radius:6px;padding:6px 8px;font-size:12px;${area ? 'resize:vertical;font-family:inherit' : ''}`; }

    // =======================================================================
    //  OVERLAY CHROME
    // =======================================================================
    function btn(label, onclick, extra) { return el('button', { style: `background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer;${extra || ''}`, text: label, onclick }); }

    function buildOverlay() {
        const A = API();
        const overlay = el('div', { id: 'wm-overlay', style: 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif' });
        const panel = el('div', { style: 'width:94%;height:92%;background:#1b1b1b;border:1px solid #3a3a3a;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.5)' });

        // header
        S.worldNameInput = el('input', { type: 'text', style: 'background:#262626;color:#fff;border:1px solid #3a3a3a;border-radius:6px;padding:5px 8px;font-size:14px;width:230px' });
        S.worldNameInput.value = (A.activeWorld() && A.activeWorld().name) || '';
        S.worldNameInput.addEventListener('input', () => { A.updateEntity('__world__', { name: S.worldNameInput.value }); const n = nodeById('__world__'); if (n) { n.name = S.worldNameInput.value; draw(); } });
        const header = el('div', { style: 'display:flex;align-items:center;gap:10px;padding:8px 12px;background:#242424;border-bottom:1px solid #333' }, [
            el('span', { style: 'color:#888;font-size:13px', text: 'World' }), S.worldNameInput,
            el('div', { style: 'flex:1' }),
            btn('−', () => { S.scale = Math.max(0.2, S.scale / 1.1); applyViewport(); updateZoomLabel(); }),
            el('span', { id: 'wm-zoom', style: 'color:#bbb;font-size:12px;min-width:42px;text-align:center', text: '100%' }),
            btn('+', () => { S.scale = Math.min(3, S.scale * 1.1); applyViewport(); updateZoomLabel(); }),
            btn('Fit', () => fit()),
            btn('Preview', () => showPreview()),
            btn('Save', async () => { await A.saveActiveWorld(); toast('World saved'); }, 'background:#1f4a2e;color:#b8f2c8;border-color:#2a7a45'),
            btn('✕', () => closeEditor(), 'background:#333')
        ]);

        // palette + tools rail
        const rail = el('div', { style: 'width:170px;background:#202020;border-right:1px solid #333;padding:10px;overflow:auto' });
        rail.appendChild(el('div', { style: 'color:#999;font-size:11px;font-weight:500;margin-bottom:6px', text: 'Add node' }));
        for (const t of TYPES) rail.appendChild(el('button', {
            style: `display:block;width:100%;text-align:left;background:${TYPE_COLOR[t]};color:#fff;border:none;border-radius:6px;padding:6px 9px;font-size:12px;cursor:pointer;margin-bottom:5px;text-transform:capitalize`,
            text: '＋ ' + t, onclick: () => addNodeCentered(t)
        }));
        rail.appendChild(el('div', { style: 'height:1px;background:#333;margin:10px 0' }));
        rail.appendChild(el('div', { style: 'color:#999;font-size:11px;font-weight:500;margin-bottom:6px', text: 'Tool' }));
        const tools = el('div', { style: 'display:flex;gap:6px' }, ['select', 'link', 'pan'].map(t =>
            el('button', { 'data-tool': t, style: 'flex:1;background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:6px 4px;font-size:11px;cursor:pointer;text-transform:capitalize', text: t, onclick: () => setTool(t) })));
        rail.appendChild(tools);
        rail.appendChild(el('div', { style: 'color:#777;font-size:10px;margin-top:8px;line-height:1.5', text: 'Select: move nodes. Link: click two nodes to connect. Pan/empty-drag: move canvas. Wheel: zoom.' }));

        // canvas
        const svgRoot = svg('svg', { style: 'flex:1;background:#151515;display:block' });
        const defs = svg('defs');
        const marker = svg('marker', { id: 'wm-arrow', markerWidth: 9, markerHeight: 9, refX: 8, refY: 3, orient: 'auto' });
        const mpath = svg('path', { d: 'M0,0 L8,3 L0,6 Z', fill: '#8a8a8a' }); marker.appendChild(mpath); defs.appendChild(marker);
        svgRoot.appendChild(defs);
        const bg = svg('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: 'transparent' });
        const viewport = svg('g');
        const gEdges = svg('g'), gNodes = svg('g');
        viewport.appendChild(bg); viewport.appendChild(gEdges); viewport.appendChild(gNodes);
        svgRoot.appendChild(viewport);
        svgRoot.addEventListener('mousedown', ev => { if (ev.target === svgRoot || ev.target === bg) onCanvasDown(ev); });
        svgRoot.addEventListener('wheel', onWheel, { passive: false });

        // inspector
        const inspector = el('div', { style: 'width:280px;background:#202020;border-left:1px solid #333;padding:12px;overflow:auto' });
        inspector.appendChild(el('div', { style: 'color:#ddd;font-size:14px;font-weight:500;margin-bottom:8px', text: 'Inspector' }));
        const inspBody = el('div');
        inspector.appendChild(inspBody);

        const body = el('div', { style: 'flex:1;display:flex;overflow:hidden' }, [rail, svgRoot, inspector]);
        panel.appendChild(header); panel.appendChild(body);
        overlay.appendChild(panel);

        S.overlay = overlay; S.header = header; S.svgRoot = svgRoot; S.viewport = viewport;
        S.gEdges = gEdges; S.gNodes = gNodes; S.inspector = inspBody;

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return overlay;
    }

    function addNodeCentered(type) {
        const r = S.svgRoot.getBoundingClientRect();
        const p = screenToGraph(r.left + r.width / 2, r.top + r.height / 2);
        const e = API().addEntity(type, { name: '', x: p.x, y: p.y });
        reloadGraph(); select(e.id); draw();
    }

    function showPreview() {
        const txt = API().preview() || '(nothing — enable the world and set a location)';
        const modal = el('div', { style: 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center', onclick: (ev) => { if (ev.target === modal) modal.remove(); } });
        const box = el('div', { style: 'width:60%;max-height:75%;overflow:auto;background:#1c1c1c;border:1px solid #3a3a3a;border-radius:12px;padding:16px' }, [
            el('div', { style: 'color:#ddd;font-size:14px;font-weight:500;margin-bottom:8px', text: 'What the AI will see (current runtime slice)' }),
            el('pre', { style: 'white-space:pre-wrap;color:#cfcfcf;font-size:12px;line-height:1.5;font-family:ui-monospace,monospace' , text: txt }),
            el('button', { style: 'margin-top:10px;background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:6px 12px;cursor:pointer', text: 'Close', onclick: () => modal.remove() })
        ]);
        modal.appendChild(box); document.body.appendChild(modal);
    }

    // ---- import / export helpers -----------------------------------------
    function pickFile(cb) {
        const inp = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
        inp.addEventListener('change', () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const rd = new FileReader();
            rd.onload = () => cb(rd.result, f.name);
            rd.readAsText(f);
            inp.remove();
        });
        document.body.appendChild(inp); inp.click();
    }
    function download(filename, text) {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = el('a', { href: url, download: filename });
        document.body.appendChild(a); a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
    }
    function importFlow() {
        const A = API();
        pickFile(async (txt, name) => {
            try {
                const data = JSON.parse(txt);
                const merge = A.activeWorld() ? confirm('Merge into the active world?  (Cancel = create a new world)') : false;
                const count = await A.importLorebook(data, { merge, worldName: (name || '').replace(/\.json$/i, '') });
                toast(`Imported ${count} lore entr${count === 1 ? 'y' : 'ies'}`);
                refreshPanel();
                if (S.overlay) { reloadGraph(); fit(); draw(); }
            } catch (e) { toast('Import failed: ' + (e.message || e), true); }
        });
    }
    function exportFlow() {
        const A = API(); const w = A.activeWorld(); if (!w) { toast('No active world', true); return; }
        const base = (w.name || 'world').replace(/[^\w-]+/g, '_');
        const choice = confirm('OK = export as World JSON.\nCancel = export as flat WorldInfo (vanilla-Lite).');
        if (choice) download(base + '.world.json', JSON.stringify(A.exportWorld(), null, 2));
        else download(base + '.worldinfo.json', JSON.stringify(A.exportWorldAsWI(), null, 2));
    }

    function toast(msg, isErr) {
        const t = el('div', { style: `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100002;background:${isErr ? '#5a1f1f' : '#243'};color:${isErr ? '#f2b8b8' : '#bfe'};border:1px solid ${isErr ? '#7a2a2a' : '#376'};border-radius:8px;padding:8px 16px;font-size:13px`, text: msg });
        document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
    }

    // =======================================================================
    //  OPEN / CLOSE
    // =======================================================================
    function openEditor() {
        const A = API();
        if (!A) { alert('Worlds engine not loaded'); return; }
        if (!A.activeWorld()) {
            const name = prompt('No active world. Name a new world to create:', 'New World');
            if (name == null) return;
            A.newWorld(name).then(() => openEditor());
            return;
        }
        if (S.overlay) closeEditor();
        document.body.appendChild(buildOverlay());
        reloadGraph(); setTool('select'); draw(); renderInspector();
        // start reasonably framed
        setTimeout(() => fit(), 30);
    }
    function closeEditor() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (S.overlay) S.overlay.remove();
        S.overlay = null; S.selectedId = null; S.linkSource = null;
        try { refreshPanel(); } catch (_) {}
    }

    // =======================================================================
    //  FLOATING RUNTIME PANEL
    // =======================================================================
    let panelEl = null;
    function buildPanel() {
        const A = API();
        const p = el('div', { id: 'wm-panel', style: 'position:fixed;right:14px;bottom:14px;z-index:99998;width:240px;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:10px;padding:10px;font-family:system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)' });
        p.appendChild(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px' }, [
            el('span', { style: 'color:#eee;font-size:13px;font-weight:500', text: '🌐 Worlds' }),
            el('span', { style: 'cursor:pointer;color:#888;font-size:14px', text: '—', onclick: () => { body.style.display = body.style.display === 'none' ? 'block' : 'none'; } })
        ]));
        const body = el('div');
        p.appendChild(body);
        panelEl = p; panelEl._body = body;
        refreshPanel();
        return p;
    }
    function refreshPanel() {
        if (!panelEl) return;
        const A = API(); const body = panelEl._body; clear(body);
        // world selector
        const worlds = A.listWorlds();
        const sel = el('select', { style: 'width:100%;background:#262626;color:#eee;border:1px solid #3a3a3a;border-radius:6px;padding:5px;font-size:12px;margin-bottom:6px' });
        sel.appendChild(el('option', { value: '', text: worlds.length ? '— select world —' : '(no worlds yet)' }));
        for (const w of worlds) { const o = el('option', { value: w.id, text: w.name || w.id }); if (A.activeWorld() && A.activeWorld().id === w.id) o.selected = true; sel.appendChild(o); }
        sel.addEventListener('change', () => { if (sel.value) { A.useWorld(sel.value); refreshPanel(); } });
        body.appendChild(sel);

        const row = el('div', { style: 'display:flex;gap:6px;margin-bottom:6px' }, [
            el('button', { style: miniBtn(), text: '＋ New', onclick: () => { const n = prompt('New world name:', 'New World'); if (n != null) A.newWorld(n).then(refreshPanel); } }),
            el('button', { style: miniBtn(), text: '✎ Editor', onclick: () => openEditor() })
        ]);
        body.appendChild(row);
        const row2 = el('div', { style: 'display:flex;gap:6px;margin-bottom:8px' }, [
            el('button', { style: miniBtn(), text: '⬇ Import', onclick: () => importFlow() }),
            el('button', { style: miniBtn(), text: '⬆ Export', onclick: () => exportFlow() })
        ]);
        body.appendChild(row2);

        if (!A.activeWorld()) return;
        // enable toggle
        const enabled = A.isEnabled();
        body.appendChild(el('button', {
            style: `width:100%;border-radius:6px;padding:6px;font-size:12px;cursor:pointer;margin-bottom:8px;border:1px solid ${enabled ? '#2a7a45' : '#444'};background:${enabled ? '#1f4a2e' : '#2a2a2a'};color:${enabled ? '#b8f2c8' : '#ccc'}`,
            text: enabled ? '● Enabled for this story' : '○ Enable for this story',
            onclick: () => { enabled ? A.disable() : A.enable(); refreshPanel(); }
        }));
        // move / location
        const g = A.getGraph();
        const locs = g.nodes.filter(n => n.type === 'location');
        if (locs.length) {
            body.appendChild(el('label', { style: 'color:#999;font-size:11px', text: 'Current location' }));
            const msel = el('select', { style: 'width:100%;background:#262626;color:#eee;border:1px solid #3a3a3a;border-radius:6px;padding:5px;font-size:12px;margin:2px 0 8px' });
            for (const l of locs) { const o = el('option', { value: l.id, text: l.name }); if (A.runtime && A.runtime.playerLocationId === l.id) o.selected = true; msel.appendChild(o); }
            msel.addEventListener('change', () => { try { A.moveTo(msel.value); } catch (_) {} });
            body.appendChild(msel);
        }
        // clock
        const c = (A.runtime && A.runtime.clock) || {};
        body.appendChild(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;background:#262626;border:1px solid #3a3a3a;border-radius:6px;padding:5px 8px' }, [
            el('span', { style: 'color:#ccc;font-size:11px', text: `Day ${c.day || 1} · ${c.time || '—'} · ${c.season || ''}` }),
            el('button', { style: miniBtn(), text: '⏭', onclick: () => { A.advanceClock(1); refreshPanel(); } })
        ]));
    }
    function miniBtn() { return 'flex:1;background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:5px;font-size:11px;cursor:pointer'; }

    // =======================================================================
    //  NAVBAR BUTTON (mirrors TreeViewer.showOpenButton pattern)
    // =======================================================================
    function installNavbarButton() {
        try {
            const ul = document.querySelector('#navbarNavDropdown > ul');
            if (!ul || document.getElementById('wm-navbtn')) return false;
            const li = el('li', { class: 'nav-item' });
            const b = el('span', { id: 'wm-navbtn', title: 'Worlds editor', style: 'display:block;cursor:pointer;height:42px;width:42px;line-height:42px;text-align:center;font-size:20px;color:#7fd', text: '🌐', onclick: () => openEditor() });
            li.appendChild(b); ul.appendChild(li);
            return true;
        } catch (_) { return false; }
    }

    // =======================================================================
    //  INIT
    // =======================================================================
    function init() {
        // expose openers on the engine API for convenience
        try { window.KLITE_RPMod_Worlds.openEditor = openEditor; window.KLITE_RPMod_Worlds.showPanel = () => { if (!panelEl) document.body.appendChild(buildPanel()); else refreshPanel(); }; } catch (_) {}
        installNavbarButton();
        if (!panelEl) document.body.appendChild(buildPanel());
    }

    function whenReady() {
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            if (window.KLITE_RPMod_Worlds && typeof window.KLITE_RPMod_Worlds.getGraph === 'function') { clearInterval(timer); try { init(); } catch (e) { console.error('[WorldsUI]', e); } }
            else if (tries > 300) clearInterval(timer);
        }, 100);
    }

    window.KLITE_RPMod_WorldsUI = { openEditor, closeEditor, refreshPanel };
    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady);
})();
