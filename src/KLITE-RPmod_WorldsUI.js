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
export default function initWorldsUI() {
    'use strict';
    if (window.KLITE_RPMod_WorldsUI) return;

    const NODE_W = 148, NODE_H = 46;
    const TYPE_COLOR = {
        world: '#5F5E5A', location: '#1D9E75', npc: '#7F77DD',
        faction: '#D4537E', object: '#BA7517', event: '#D85A30', quest: '#C9A227', lore: '#378ADD'
    };
    const TYPES = ['location', 'npc', 'faction', 'object', 'event', 'quest', 'lore'];
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
            // WoW-style quest marker badge on giver / turn-in persons
            if (n.type === 'npc') {
                let mk = ''; try { mk = API().personQuestMarker(n.id) || ''; } catch (_) {}
                if (mk) {
                    g.appendChild(svg('circle', { cx: w - 10, cy: 10, r: 9, fill: mk === '!' ? '#E5B93B' : '#7Fc97F', stroke: '#1b1b1b', 'stroke-width': 1.5 }));
                    const mt = svg('text', { x: w - 10, y: 14, 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle', fill: '#1b1b1b' }); mt.textContent = mk;
                    g.appendChild(mt);
                }
            }
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
        world: [['name', 'Name', 'input'], ['description', 'Description', 'area']],
        location: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['biome', 'Biome', 'input'], ['atmosphere', 'Atmosphere', 'input']],
        npc: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['personality', 'Personality', 'input'], ['mood', 'Mood', 'input']],
        faction: [['name', 'Name', 'input'], ['description', 'Entry', 'area'], ['goals', 'Goals', 'input']],
        object: [['name', 'Name', 'input'], ['desc', 'Entry', 'area']],
        event: [['name', 'Name', 'input'], ['description', 'Entry', 'area']],
        quest: [['title', 'Title', 'input'], ['description', 'Description', 'area'], ['hiddenDescription', 'Hidden description (until discovered)', 'area']],
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
        if (type === 'world') renderWorldExtras(box, ent);
        if (type === 'npc') renderPersonExtras(box, ent);
        if (type === 'quest') renderQuestExtras(box, ent);
        if (type === 'event') renderEventExtras(box, ent);
        if (type === 'faction') renderFactionExtras(box, ent);
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

    // Person-only inspector extras: link a library character + a d20 stat block.
    const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    function renderPersonExtras(box, ent) {
        const A = API();
        // ---- character link ----
        box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;font-weight:500;margin:14px 0 4px', text: 'Character (from library)' }));
        const chars = A.listCharacters();
        const csel = el('select', { style: inputCss(false) + ';cursor:pointer' });
        csel.appendChild(el('option', { value: '', text: chars.length ? '— not linked —' : '(no characters in library)' }));
        const curRef = ent.characterRef && (ent.characterRef.id || ent.characterRef.name);
        for (const c of chars) { const o = el('option', { value: c.id || c.name, text: c.name }); if (ent.characterRef && (ent.characterRef.id === c.id || (ent.characterRef.name && ent.characterRef.name === c.name))) o.selected = true; csel.appendChild(o); }
        csel.addEventListener('change', () => {
            if (csel.value) A.linkCharacter(S.selectedId, csel.value); else A.unlinkCharacter(S.selectedId);
            const n = nodeById(S.selectedId); if (n) { n.name = A.personName(S.selectedId); draw(); }
            renderInspector();
        });
        box.appendChild(csel);
        const resolved = A.resolvePersonCharacter(S.selectedId);
        if (ent.characterRef) box.appendChild(el('div', { style: `font-size:10px;margin-top:3px;color:${resolved ? '#8fca8f' : '#e0a24a'}`, text: resolved ? `Linked: ${resolved.name}` : `Linked to "${ent.characterRef.name || ent.characterRef.id}" (not found in library)` }));

        // ---- d20 stat block ----
        box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:8px;margin:14px 0 4px' }, [
            el('span', { style: 'color:#aaa;font-size:11px;font-weight:500;flex:1', text: 'Stats (d20)' }),
            ent.stats
                ? el('span', { style: 'cursor:pointer;color:#e66;font-size:10px', text: 'remove', onclick: () => { A.clearStats(S.selectedId); renderInspector(); } })
                : el('span', { style: 'cursor:pointer;color:#8ac6f0;font-size:10px', text: '+ add', onclick: () => { A.setStats(S.selectedId, {}); renderInspector(); } })
        ]));
        if (!ent.stats) { box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'No stat block. Add one for combat & checks.' })); return; }
        const s = A.getStats(S.selectedId);
        // ability grid
        const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px' });
        for (const a of ABIL) {
            const wrap = el('div', { style: 'text-align:center' });
            wrap.appendChild(el('div', { style: 'color:#999;font-size:9px;text-transform:uppercase', text: a }));
            const inp = el('input', { type: 'number', value: s.abilities[a], style: inputCss(false) + ';text-align:center;padding:3px' });
            inp.addEventListener('change', () => { A.setStats(S.selectedId, { abilities: { [a]: Number(inp.value) } }); renderInspector(); });
            wrap.appendChild(inp);
            wrap.appendChild(el('div', { style: 'color:#8ac6f0;font-size:9px', text: `(${A.abilityMod(Number(inp.value)) >= 0 ? '+' : ''}${A.abilityMod(Number(inp.value))})` }));
            grid.appendChild(wrap);
        }
        box.appendChild(grid);
        // derived numeric fields
        const numRow = (label, key) => {
            const wrap = el('div', {});
            wrap.appendChild(el('label', { style: 'display:block;color:#999;font-size:10px', text: label }));
            const inp = el('input', { type: 'number', value: s[key], style: inputCss(false) + ';padding:4px' });
            inp.addEventListener('change', () => { A.setStats(S.selectedId, { [key]: Number(inp.value) }); });
            wrap.appendChild(inp); return wrap;
        };
        const r1 = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:5px' }, [numRow('AC', 'ac'), numRow('HP max', 'hpMax')]);
        const r2 = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:5px' }, [numRow('Speed', 'speed'), numRow('Prof', 'proficiency'), numRow('Init', 'initiativeMod')]);
        box.appendChild(r1); box.appendChild(r2);
        const monWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin-top:6px;color:#bbb;font-size:11px;cursor:pointer' });
        const mon = el('input', { type: 'checkbox', style: 'cursor:pointer' }); mon.checked = !!s.isMonster;
        mon.addEventListener('change', () => { A.setStats(S.selectedId, { isMonster: mon.checked }); });
        monWrap.appendChild(mon); monWrap.appendChild(document.createTextNode('Monster / NPC combatant'));
        box.appendChild(monWrap);
    }

    // Quest-only inspector extras: hidden flag, giver/turn-in persons, rewards, objectives.
    function renderQuestExtras(box, ent) {
        const A = API();
        // hidden checkbox
        const hidWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin:12px 0 4px;color:#bbb;font-size:11px;cursor:pointer' });
        const hid = el('input', { type: 'checkbox', style: 'cursor:pointer' }); hid.checked = !!ent.hidden;
        hid.addEventListener('change', () => { A.updateEntity(S.selectedId, { hidden: hid.checked }); });
        hidWrap.appendChild(hid); hidWrap.appendChild(document.createTextNode('Hidden from player until discovered'));
        box.appendChild(hidWrap);

        // giver / turn-in person dropdowns
        const persons = A.getGraph().nodes.filter(n => n.type === 'npc');
        const personSel = (field, label, marker) => {
            box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:8px 0 3px' }, [marker + ' ' + label]));
            const s = el('select', { style: inputCss(false) + ';cursor:pointer' });
            s.appendChild(el('option', { value: '', text: '— none —' }));
            for (const p of persons) { const o = el('option', { value: p.id, text: p.name }); if (ent[field] === p.id) o.selected = true; s.appendChild(o); }
            s.addEventListener('change', () => { A.updateEntity(S.selectedId, { [field]: s.value || null }); reloadGraph(); draw(); });
            box.appendChild(s);
        };
        personSel('giverPersonId', 'Quest giver', '!');
        personSel('turninPersonId', 'Turn-in to', '?');

        // rewards (simple text lines: "name xN" or "N xp")
        box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:10px 0 3px', text: 'Rewards' }));
        const rewards = asArrayU(ent.rewards);
        for (let i = 0; i < rewards.length; i++) {
            const r = rewards[i];
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:#242424;border:1px solid #3a3a3a;border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:#ddd;font-size:11px', text: r.xp ? `${r.xp} XP` : (r.item ? `${r.item}${r.qty > 1 ? ' ×' + r.qty : ''}` : JSON.stringify(r)) }),
                el('span', { style: 'cursor:pointer;color:#e66;font-size:13px', text: '×', onclick: () => { rewards.splice(i, 1); A.updateEntity(S.selectedId, { rewards }); renderInspector(); } })
            ]));
        }
        const rIn = el('input', { type: 'text', placeholder: 'e.g. Gold Ring x1  or  100 xp', style: inputCss(false) });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [rIn,
            el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:0 10px;font-size:12px;cursor:pointer', text: '＋', onclick: () => { const r = parseReward(rIn.value); if (!r) return; const rw = asArrayU(ent.rewards); rw.push(r); A.updateEntity(S.selectedId, { rewards: rw }); renderInspector(); } })
        ]));

        // objectives (text + hidden toggle)
        box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:10px 0 3px', text: 'Objectives' }));
        const objs = asArrayU(ent.objectives);
        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:#242424;border:1px solid #3a3a3a;border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:#ddd;font-size:11px', text: (o.hidden ? '🔒 ' : '') + (o.text || '') }),
                el('span', { style: 'cursor:pointer;color:#e66;font-size:13px', text: '×', onclick: () => { objs.splice(i, 1); A.updateEntity(S.selectedId, { objectives: objs }); renderInspector(); } })
            ]));
        }
        const oIn = el('input', { type: 'text', placeholder: 'objective text', style: inputCss(false) });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [oIn,
            el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:0 10px;font-size:12px;cursor:pointer', text: '＋', onclick: () => { const t = oIn.value.trim(); if (!t) return; const ob = asArrayU(ent.objectives); ob.push({ id: 'obj_' + Math.random().toString(36).slice(2, 7), text: t, hidden: false }); A.updateEntity(S.selectedId, { objectives: ob }); renderInspector(); } })
        ]));
    }
    // World root extras: the World Rules list (one rule per line) — these are what the AI
    // sees as [World Rules]. Bound to world.rules; blank lines are trimmed at injection.
    function renderWorldExtras(box, ent) {
        const A = API();
        box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:12px 0 3px', text: 'World Rules (one per line)' }));
        const ta = el('textarea', { style: inputCss(true), rows: 5, placeholder: 'e.g.\nMedieval low-fantasy tone.\nWhen the scene changes location, emit <move>Name</move>.' });
        ta.value = (Array.isArray(ent.rules) ? ent.rules : []).join('\n');
        ta.addEventListener('input', () => { A.updateEntity('__world__', { rules: ta.value.split('\n') }); });
        box.appendChild(ta);
        box.appendChild(el('div', { style: 'color:#777;font-size:10px;margin-top:3px', text: 'Shown to the AI as [World Rules]. The Description above is shown as the world premise.' }));
    }

    // Faction-only extras: headquarters location.
    function renderFactionExtras(box, ent) {
        const A = API();
        box.appendChild(el('label', { style: 'display:block;color:#aaa;font-size:11px;margin:12px 0 3px', text: '🏰 Headquarters (location)' }));
        const locs = A.getGraph().nodes.filter(n => n.type === 'location');
        const s = el('select', { style: inputCss(false) + ';cursor:pointer' });
        s.appendChild(el('option', { value: '', text: '— none —' }));
        for (const l of locs) { const o = el('option', { value: l.id, text: l.name }); if (ent.hqLocationId === l.id) o.selected = true; s.appendChild(o); }
        s.addEventListener('change', () => { A.updateEntity(S.selectedId, { hqLocationId: s.value || null }); reloadGraph(); draw(); });
        box.appendChild(s);
    }

    // ---- Event trigger/effect editor (Phase E) ----
    const QSTATES = ['available', 'active', 'complete', 'turnedin', 'failed'];
    const TRIGGER_SPEC = {
        onTurn: [], manual: [],
        onTime: [['time', 'time'], ['season', 'text']],
        onEnterLocation: [['locationId', 'location']],
        onFlag: [['key', 'text'], ['value', 'text']],
        onQuestState: [['questId', 'quest'], ['state', 'qstate']],
        onEvent: [['eventId', 'event']],
        onAction: [['pattern', 'text']]
    };
    const EFFECT_SPEC = {
        flag: [['key', 'text'], ['value', 'text']], unflag: [['key', 'text']],
        give: [['name', 'text'], ['qty', 'number']], take: [['name', 'text'], ['qty', 'number']],
        quest: [['questId', 'quest'], ['state', 'qstate']], discover: [['quest', 'quest']],
        move: [['locationId', 'location']], npcmove: [['npcId', 'npc'], ['locationId', 'location']],
        advance: [['slots', 'number']], fireEvent: [['eventId', 'event']]
    };
    function paramInput(kind, value, onChange) {
        const A = API();
        if (kind === 'time' || kind === 'qstate') {
            const opts = kind === 'time' ? TIME_SLOTS_UI : QSTATES;
            const s = el('select', { style: inputCss(false) + ';cursor:pointer;flex:1' });
            s.appendChild(el('option', { value: '', text: kind === 'time' ? 'time' : 'state' }));
            for (const o of opts) { const op = el('option', { value: o, text: o }); if (value === o) op.selected = true; s.appendChild(op); }
            s.addEventListener('change', () => onChange(s.value)); return s;
        }
        if (kind === 'location' || kind === 'quest' || kind === 'event' || kind === 'npc') {
            const nodes = A.getGraph().nodes.filter(n => n.type === kind);
            const s = el('select', { style: inputCss(false) + ';cursor:pointer;flex:1' });
            s.appendChild(el('option', { value: '', text: kind }));
            for (const n of nodes) { const op = el('option', { value: n.id, text: n.name }); if (value === n.id) op.selected = true; s.appendChild(op); }
            s.addEventListener('change', () => onChange(s.value)); return s;
        }
        const inp = el('input', { type: kind === 'number' ? 'number' : 'text', placeholder: '', style: inputCss(false) + ';flex:1' });
        inp.value = value == null ? '' : value;
        inp.addEventListener('input', () => onChange(kind === 'number' ? Number(inp.value) : inp.value));
        return inp;
    }
    // Renders an editable list of {type, ...params} against a SPEC; saves via onSave.
    function structuredList(box, label, items, SPEC, onSave) {
        box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;font-weight:500;margin:12px 0 4px', text: label }));
        items.forEach((item, i) => {
            const row = el('div', { style: 'background:#242424;border:1px solid #3a3a3a;border-radius:6px;padding:5px;margin-bottom:4px' });
            const head = el('div', { style: 'display:flex;gap:5px;align-items:center' });
            const tsel = el('select', { style: inputCss(false) + ';cursor:pointer;flex:1' });
            for (const t of Object.keys(SPEC)) { const o = el('option', { value: t, text: t }); if (item.type === t) o.selected = true; tsel.appendChild(o); }
            tsel.addEventListener('change', () => { items[i] = { type: tsel.value }; onSave(items); });
            head.appendChild(tsel);
            head.appendChild(el('span', { style: 'cursor:pointer;color:#e66;font-size:14px;padding:0 3px', text: '×', onclick: () => { items.splice(i, 1); onSave(items); } }));
            row.appendChild(head);
            const spec = SPEC[item.type] || [];
            if (spec.length) {
                const prow = el('div', { style: 'display:flex;gap:5px;margin-top:4px' });
                for (const [field, kind] of spec) prow.appendChild(paramInput(kind, item[field], v => { item[field] = v; onSave(items); }));
                row.appendChild(prow);
            }
            box.appendChild(row);
        });
        const firstType = Object.keys(SPEC)[0];
        box.appendChild(el('button', { style: 'background:#2e2e2e;color:#9cf;border:1px solid #345;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer', text: '＋ add', onclick: () => { items.push({ type: firstType }); onSave(items); } }));
    }
    function renderEventExtras(box, ent) {
        const A = API();
        // hidden + repeatable
        const flags = el('div', { style: 'display:flex;gap:14px;margin:12px 0 4px' });
        const mk = (label, key) => { const w = el('label', { style: 'display:flex;align-items:center;gap:5px;color:#bbb;font-size:11px;cursor:pointer' }); const c = el('input', { type: 'checkbox', style: 'cursor:pointer' }); c.checked = !!ent[key]; c.addEventListener('change', () => A.updateEntity(S.selectedId, { [key]: c.checked })); w.appendChild(c); w.appendChild(document.createTextNode(label)); return w; };
        flags.appendChild(mk('Hidden', 'hidden')); flags.appendChild(mk('Repeatable', 'repeatable'));
        box.appendChild(flags);
        structuredList(box, 'Triggers (any fires the event)', asArrayU(ent.triggers), TRIGGER_SPEC, its => { A.updateEntity(S.selectedId, { triggers: its }); reloadGraph(); draw(); renderInspectorParamsOnly(); });
        structuredList(box, 'Effects (run when it fires)', asArrayU(ent.effects), EFFECT_SPEC, its => { A.updateEntity(S.selectedId, { effects: its }); reloadGraph(); draw(); renderInspectorParamsOnly(); });
    }
    // Re-render inspector without losing scroll for structured edits.
    function renderInspectorParamsOnly() { renderInspector(); }

    function asArrayU(v) { return Array.isArray(v) ? v.slice() : []; }
    function parseReward(s) { s = String(s || '').trim(); if (!s) return null; const xp = /^(\d+)\s*xp$/i.exec(s); if (xp) return { type: 'xp', xp: Number(xp[1]) }; const m = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(s); return { type: 'item', item: (m[1] || s).trim(), qty: Number(m[2]) || 1 }; }

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
            el('pre', { style: 'white-space:pre-wrap;color:#cfcfcf;background:#141414;border:1px solid #333;border-radius:8px;padding:10px;margin:0;font-size:12px;line-height:1.5;font-family:ui-monospace,monospace' , text: txt }),
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
    function loadExampleFlow() {
        const A = API();
        if (A.hasExample() && !confirm('Reload the example world? Changes you made to it will be discarded.')) return;
        A.loadExample().then(() => { S.tab = 'play'; refreshPanel(); toast('Example world loaded — enabled & ready. Just start chatting!'); });
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
    const TIME_SLOTS_UI = ['morning', 'noon', 'afternoon', 'evening', 'night'];
    function miniBtn() { return 'flex:1;background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:5px;font-size:11px;cursor:pointer'; }
    function selCss() { return 'width:100%;box-sizing:border-box;background:#262626;color:#eee;border:1px solid #3a3a3a;border-radius:6px;padding:5px;font-size:12px'; }
    function lbl(t) { return el('label', { style: 'display:block;color:#999;font-size:11px;margin:8px 0 3px', text: t }); }

    function uiMode() { if (!S.uiMode) { try { S.uiMode = localStorage.getItem('KLITE.worlds.uiMode') || 'creator'; } catch (_) { S.uiMode = 'creator'; } } return S.uiMode; }
    function setUiMode(m) { S.uiMode = m; try { localStorage.setItem('KLITE.worlds.uiMode', m); } catch (_) {} }

    function buildPanel() {
        const p = el('div', { id: 'wm-panel', style: 'position:fixed;right:14px;bottom:14px;z-index:99998;width:300px;max-height:76vh;display:flex;flex-direction:column;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:10px;font-family:system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.45)' });
        const body = el('div', { style: 'padding:10px;overflow:auto' });
        p.appendChild(body);
        panelEl = p; panelEl._body = body;
        if (!S.tab) S.tab = 'play';
        refreshPanel();
        return p;
    }

    function refreshPanel() {
        if (!panelEl) return;
        const A = API(); const body = panelEl._body; clear(body);

        // ---- header: title + creator/player lens + collapse ----
        const mode = uiMode();
        const header = el('div', { style: 'display:flex;align-items:center;gap:6px;margin-bottom:8px' }, [
            el('span', { style: 'color:#eee;font-size:13px;font-weight:500;flex:1', text: '🌐 Worlds' }),
            el('span', {
                title: 'Toggle Creator / Player view', style: `cursor:pointer;font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid ${mode === 'creator' ? '#7a5a2a' : '#2a5a7a'};color:${mode === 'creator' ? '#f0c68a' : '#8ac6f0'};background:${mode === 'creator' ? '#3a2e1a' : '#1a2e3a'}`,
                text: mode === 'creator' ? 'Creator' : 'Player',
                onclick: () => { setUiMode(mode === 'creator' ? 'player' : 'creator'); refreshPanel(); }
            }),
            el('span', { style: 'cursor:pointer;color:#888;font-size:14px', text: S.panelCollapsed ? '▢' : '—', onclick: () => { S.panelCollapsed = !S.panelCollapsed; refreshPanel(); } })
        ]);
        body.appendChild(header);
        if (S.panelCollapsed) return;

        // ---- world selector + new ----
        const worlds = A.listWorlds();
        const sel = el('select', { style: selCss() + ';margin-bottom:6px' });
        sel.appendChild(el('option', { value: '', text: worlds.length ? '— select world —' : '(no worlds yet)' }));
        for (const w of worlds) { const o = el('option', { value: w.id, text: w.name || w.id }); if (A.activeWorld() && A.activeWorld().id === w.id) o.selected = true; sel.appendChild(o); }
        sel.addEventListener('change', () => { if (sel.value) { A.useWorld(sel.value); refreshPanel(); } });
        body.appendChild(sel);
        body.appendChild(el('div', { style: 'display:flex;gap:6px;margin-bottom:8px' }, [
            el('button', { style: miniBtn(), text: '＋ New', onclick: () => { const n = prompt('New world name:', 'New World'); if (n != null) A.newWorld(n).then(refreshPanel); } }),
            el('button', { style: miniBtn(), title: 'Load the ready-to-play example world', text: '🎁 Example', onclick: () => loadExampleFlow() }),
            el('button', { style: miniBtn(), text: '⬇ Import', onclick: () => importFlow() }),
            el('button', { style: miniBtn(), text: '⬆ Export', onclick: () => exportFlow() })
        ]));

        if (!A.activeWorld()) {
            body.appendChild(el('div', { style: 'color:#aaa;font-size:11px;margin:6px 0 8px', text: 'New here? Load the ready-to-play example and just start chatting.' }));
            body.appendChild(el('button', {
                style: 'width:100%;background:#1f3a4a;color:#bfe;border:1px solid #2a6a8a;border-radius:6px;padding:8px;font-size:12px;cursor:pointer',
                text: '🎁 Load example world',
                onclick: () => loadExampleFlow()
            }));
            return;
        }

        // ---- tab bar ----
        const tabs = [['play', 'Play'], ['quests', 'Quests'], ['combat', 'Combat'], ['editor', 'Editor']];
        const bar = el('div', { style: 'display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:6px' });
        for (const [id, label] of tabs) {
            const on = S.tab === id;
            bar.appendChild(el('button', {
                style: `flex:1;font-size:11px;padding:5px 2px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#4a7ab0' : '#3a3a3a'};background:${on ? '#1c3450' : '#242424'};color:${on ? '#bfe' : '#bbb'}`,
                text: label, onclick: () => { S.tab = id; refreshPanel(); }
            }));
        }
        body.appendChild(bar);

        const content = el('div');
        body.appendChild(content);
        if (S.tab === 'play') renderPlayTab(content);
        else if (S.tab === 'editor') renderEditorTab(content);
        else if (S.tab === 'quests') renderQuestsTab(content);
        else if (S.tab === 'combat') renderCombatTab(content);
    }

    function renderStubTab(box, title, msg) {
        box.appendChild(el('div', { style: 'color:#aaa;font-size:12px;font-weight:500;margin-bottom:4px', text: title }));
        box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: msg }));
    }

    function renderQuestsTab(box) {
        const A = API();
        const mode = uiMode() === 'player' ? 'player' : 'creator';
        // per-world AI mode selector (gm vs player-facing)
        const aiRow = el('div', { style: 'display:flex;align-items:center;gap:6px;margin-bottom:8px' }, [
            el('span', { style: 'color:#999;font-size:11px;flex:1', text: 'AI sees hidden content:' })
        ]);
        const aiSel = el('select', { style: 'background:#262626;color:#eee;border:1px solid #3a3a3a;border-radius:6px;padding:3px 6px;font-size:11px' });
        for (const [v, t] of [['gm', 'GM (all)'], ['player', 'Player (visible only)']]) { const o = el('option', { value: v, text: t }); if (A.getAiMode() === v) o.selected = true; aiSel.appendChild(o); }
        aiSel.addEventListener('change', () => { A.setAiMode(aiSel.value); });
        aiRow.appendChild(aiSel); box.appendChild(aiRow);

        const quests = A.listQuests(mode);
        if (!quests.length) { box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'No quests visible. Add Quest nodes in the editor.' })); return; }
        const groups = [['available', 'Available'], ['active', 'Active'], ['complete', 'Ready to turn in'], ['turnedin', 'Completed'], ['failed', 'Failed']];
        for (const [st, label] of groups) {
            const inGroup = quests.filter(q => q.state === st);
            if (!inGroup.length) continue;
            box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;font-weight:500;margin:10px 0 4px', text: label }));
            for (const q of inGroup) {
                const card = el('div', { style: `background:#242424;border:1px solid ${q.active ? '#4a7ab0' : '#3a3a3a'};border-radius:8px;padding:7px 9px;margin-bottom:5px` });
                card.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px' }, [
                    el('span', { style: 'color:#eee;font-size:12px;font-weight:500;flex:1' }, [(q.marker ? q.marker + ' ' : '') + q.title, q.hidden ? el('span', { style: 'color:#c98;font-size:9px;margin-left:5px', text: 'hidden' }) : null]),
                    q.active ? el('span', { style: 'font-size:9px;color:#8ac6f0', text: '● tracked' }) : null
                ]));
                if (q.description) card.appendChild(el('div', { style: 'color:#aaa;font-size:11px;margin-top:2px', text: q.description }));
                if (q.giver || q.turnin) card.appendChild(el('div', { style: 'color:#888;font-size:10px;margin-top:2px', text: (q.giver ? `From: ${q.giver}` : '') + (q.turnin ? `  Turn-in: ${q.turnin}` : '') }));
                // controls
                const ctl = el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;margin-top:5px' });
                const btn = (t, fn) => el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer', text: t, onclick: () => { fn(); refreshPanel(); } });
                if (st === 'available') ctl.appendChild(btn('Accept', () => A.acceptQuest(q.id)));
                if (st === 'active') { ctl.appendChild(btn('Complete', () => A.completeQuest(q.id))); ctl.appendChild(btn(q.active ? 'Untrack' : 'Track', () => A.setActiveQuest(q.active ? null : q.id))); ctl.appendChild(btn('Fail', () => A.failQuest(q.id))); }
                if (st === 'complete') ctl.appendChild(btn('Turn in', () => A.turnInQuest(q.id)));
                if (mode === 'creator' && q.hidden) ctl.appendChild(btn('Reveal to player', () => A.discoverQuest(q.id)));
                card.appendChild(ctl);
                box.appendChild(card);
            }
        }
    }

    function renderCombatTab(box) {
        const A = API();
        const cb = A.getCombat();
        if (cb && cb.active) return renderActiveCombat(box, cb);

        // ---- encounter builder ----
        box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;margin-bottom:6px', text: 'Select combatants for the encounter. NPCs need a stat block (add one in the editor).' }));
        const persons = A.getGraph().nodes.filter(n => n.type === 'npc');
        const chosen = S._encPick || (S._encPick = {});
        if (!persons.length) box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'No persons yet.' }));
        for (const p of persons) {
            const st = A.getStats(p.id);
            const row = el('label', { style: 'display:flex;align-items:center;gap:6px;font-size:11px;color:#ddd;padding:2px 0;cursor:pointer' });
            const c = el('input', { type: 'checkbox', style: 'cursor:pointer' }); c.checked = !!chosen[p.id];
            c.addEventListener('change', () => { chosen[p.id] = c.checked; });
            row.appendChild(c);
            row.appendChild(el('span', { style: 'flex:1' }, [p.name, st ? el('span', { style: 'color:#8ac6f0;font-size:9px;margin-left:5px', text: `AC ${st.ac} HP ${st.hpMax}` }) : el('span', { style: 'color:#c96;font-size:9px;margin-left:5px', text: 'no stats' })]));
            box.appendChild(row);
        }
        // quick-add SRD monster
        box.appendChild(el('div', { style: 'color:#999;font-size:11px;margin:10px 0 4px', text: 'Quick-add monster (SRD)' }));
        const tRow = el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px' });
        for (const key of A.listTemplates()) tRow.appendChild(el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer', text: key.replace('_', ' '), onclick: () => { const p = A.addPersonFromTemplate(key); S._encPick[p.id] = true; refreshPanel(); } }));
        box.appendChild(tRow);
        // include player + start
        const incWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin:10px 0;color:#bbb;font-size:11px;cursor:pointer' });
        const inc = el('input', { type: 'checkbox', style: 'cursor:pointer' }); inc.checked = S._encPlayer !== false;
        inc.addEventListener('change', () => { S._encPlayer = inc.checked; });
        incWrap.appendChild(inc); incWrap.appendChild(document.createTextNode('Include the player'));
        box.appendChild(incWrap);
        box.appendChild(el('button', {
            style: 'width:100%;background:#5a2e1f;color:#f2c8b8;border:1px solid #7a452a;border-radius:6px;padding:8px;font-size:12px;cursor:pointer',
            text: '⚔ Start encounter',
            onclick: () => { const ids = Object.keys(chosen).filter(k => chosen[k]); A.startEncounter(ids, { includePlayer: S._encPlayer !== false }); S._encPick = {}; refreshPanel(); }
        }));
    }

    function renderActiveCombat(box, cb) {
        const A = API();
        const cur = cb.order[cb.turnIndex];
        box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;margin-bottom:8px' }, [
            el('span', { style: 'color:#eee;font-size:12px;font-weight:500;flex:1', text: `Round ${cb.round}` }),
            el('span', { style: 'font-size:10px;color:#f2c8b8;background:#5a2e1f;border-radius:10px;padding:2px 8px', text: '▶ ' + cur.name })
        ]));
        // roster with HP bars
        for (const o of cb.order) {
            const hp = cb.hp[o.id], max = cb.maxHp[o.id] || 1, pct = Math.max(0, Math.min(100, Math.round(hp / max * 100)));
            const down = hp <= 0;
            const row = el('div', { style: `background:#242424;border:1px solid ${o.id === cur.id ? '#7a452a' : '#3a3a3a'};border-radius:6px;padding:4px 8px;margin-bottom:4px;${down ? 'opacity:.5' : ''}` });
            row.appendChild(el('div', { style: 'display:flex;justify-content:space-between;font-size:11px;color:#ddd' }, [
                el('span', {}, [(o.id === cur.id ? '▶ ' : '') + o.name + (down ? ' (down)' : '')]),
                el('span', { style: 'color:#999', text: `${hp}/${max} · init ${o.init}` })
            ]));
            const bar = el('div', { style: 'height:5px;background:#111;border-radius:3px;margin-top:3px;overflow:hidden' });
            bar.appendChild(el('div', { style: `height:100%;width:${pct}%;background:${pct > 50 ? '#3b8f4f' : pct > 25 ? '#b8912a' : '#a33'}` }));
            row.appendChild(bar);
            box.appendChild(row);
        }
        // attack controls
        const targets = cb.order.filter(o => cb.hp[o.id] > 0 && o.id !== cur.id);
        const atkRow = el('div', { style: 'display:flex;gap:5px;margin-top:8px' });
        const tSel = el('select', { style: selCss() + ';flex:1' });
        for (const o of targets) tSel.appendChild(el('option', { value: o.id, text: o.name }));
        atkRow.appendChild(tSel);
        atkRow.appendChild(el('button', { style: 'background:#5a2e1f;color:#f2c8b8;border:1px solid #7a452a;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer', text: `⚔ ${cur.name} attacks`, onclick: () => { if (tSel.value) A.attack(cur.id, tSel.value); refreshPanel(); } }));
        box.appendChild(atkRow);
        // dice roller
        const rollRow = el('div', { style: 'display:flex;gap:5px;margin-top:6px' });
        const rIn = el('input', { type: 'text', value: '1d20', style: selCss() + ';flex:1' });
        rollRow.appendChild(rIn);
        rollRow.appendChild(el('button', { style: miniBtn(), text: '🎲 Roll', onclick: () => { A.applyTags(`<roll>${rIn.value}</roll>`); refreshPanel(); } }));
        box.appendChild(rollRow);
        // turn/end
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:6px' }, [
            el('button', { style: miniBtn(), text: '⏭ Next turn', onclick: () => { A.nextTurn(); refreshPanel(); } }),
            el('button', { style: miniBtn() + ';color:#f2b8b8;border-color:#7a2a2a;background:#3a1f1f', text: '✕ End', onclick: () => { A.endEncounter(); refreshPanel(); } })
        ]));
        // log
        box.appendChild(el('div', { style: 'color:#999;font-size:10px;font-weight:500;margin:10px 0 3px', text: 'Combat log' }));
        const log = el('div', { style: 'background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:6px;font-size:10px;color:#bbb;max-height:120px;overflow:auto;line-height:1.5' });
        for (const line of (cb.log || []).slice(-8)) log.appendChild(el('div', { text: line }));
        box.appendChild(log);
    }

    function renderEditorTab(box) {
        box.appendChild(el('div', { style: 'color:#aaa;font-size:11px;margin-bottom:8px', text: 'Build your world as a node graph — locations, people, factions, objects, events and lore.' }));
        box.appendChild(el('button', { style: 'width:100%;background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:8px;font-size:12px;cursor:pointer', text: '✎ Open graph editor', onclick: () => openEditor() }));
    }

    function renderPlayTab(box) {
        const A = API();
        // enable toggle
        const enabled = A.isEnabled();
        box.appendChild(el('button', {
            style: `width:100%;box-sizing:border-box;border-radius:6px;padding:7px;font-size:12px;cursor:pointer;margin-bottom:10px;border:1px solid ${enabled ? '#2a7a45' : '#444'};background:${enabled ? '#1f4a2e' : '#2a2a2a'};color:${enabled ? '#b8f2c8' : '#ccc'}`,
            text: enabled ? '● Enabled for this story' : '○ Enable for this story',
            onclick: () => { enabled ? A.disable() : A.enable(); refreshPanel(); }
        }));

        // ---- state slots (base / working) ----
        const slot = A.activeSlot || 'working';
        const slotBox = el('div', { style: 'background:#242424;border:1px solid #3a3a3a;border-radius:8px;padding:8px;margin-bottom:10px' });
        slotBox.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;margin-bottom:6px' }, [
            el('span', { style: 'color:#999;font-size:11px;flex:1', text: 'State slot' }),
            el('span', { style: `font-size:10px;padding:2px 8px;border-radius:10px;background:${slot === 'working' ? '#1c3450' : '#3a2e1a'};color:${slot === 'working' ? '#8ac6f0' : '#f0c68a'}`, text: slot === 'working' ? 'WORKING (live)' : 'BASE (start)' })
        ]));
        slotBox.appendChild(el('div', { style: 'display:flex;gap:5px' }, [
            el('button', { title: 'Discard live changes, back to the start state', style: miniBtn(), text: '↺ Reset', onclick: () => { if (confirm('Reset the working state to the base (start) state? Live changes are lost.')) { A.resetToBase(); refreshPanel(); } } }),
            el('button', { title: 'Make the current live state the new start state', style: miniBtn(), text: '✔ Commit', onclick: () => { if (confirm('Set the current working state as the new base (start)?')) { A.commitToBase(); refreshPanel(); } } }),
            el('button', { title: 'Switch which slot is active', style: miniBtn(), text: '⇄ Swap', onclick: () => { A.swapActive(); refreshPanel(); } })
        ]));
        box.appendChild(slotBox);

        // ---- location ----
        const g = A.getGraph();
        const locs = g.nodes.filter(n => n.type === 'location');
        box.appendChild(lbl('Current location'));
        if (locs.length) {
            const msel = el('select', { style: selCss() });
            msel.appendChild(el('option', { value: '', text: '— nowhere —' }));
            for (const l of locs) { const o = el('option', { value: l.id, text: l.name }); if (A.runtime && A.runtime.playerLocationId === l.id) o.selected = true; msel.appendChild(o); }
            msel.addEventListener('change', () => { try { if (msel.value) A.moveTo(msel.value); refreshPanel(); } catch (_) {} });
            box.appendChild(msel);
        } else box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'No locations yet — add some in the editor.' }));

        // ---- time / weather ----
        const c = (A.runtime && A.runtime.clock) || {};
        box.appendChild(lbl('Time & weather'));
        const timeRow = el('div', { style: 'display:flex;gap:6px;align-items:center' });
        const tsel = el('select', { style: selCss() + ';flex:1' });
        for (const t of TIME_SLOTS_UI) { const o = el('option', { value: t, text: t }); if ((c.time || '') === t) o.selected = true; tsel.appendChild(o); }
        tsel.addEventListener('change', () => { A.setClock({ time: tsel.value }); refreshPanel(); });
        timeRow.appendChild(tsel);
        timeRow.appendChild(el('button', { title: 'Advance time one step', style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer', text: '⏭', onclick: () => { A.advanceClock(1); refreshPanel(); } }));
        box.appendChild(timeRow);
        box.appendChild(el('div', { style: 'color:#888;font-size:10px;margin:4px 0 2px', text: `Day ${c.day || 1}, month ${c.month || 1} · ${c.season || ''}` }));
        const wIn = el('input', { type: 'text', value: c.weather || '', placeholder: 'weather', style: selCss() });
        wIn.addEventListener('change', () => { A.setClock({ weather: wIn.value }); });
        box.appendChild(wIn);

        // ---- flags ----
        box.appendChild(lbl('Flags'));
        const flags = (A.runtime && A.runtime.flags) || {};
        const fkeys = Object.keys(flags);
        if (!fkeys.length) box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'none' }));
        for (const k of fkeys) {
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:#242424;border:1px solid #3a3a3a;border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:#ddd;font-size:11px' }, [k + ' = ', el('span', { style: 'color:#8ac6f0', text: String(flags[k]) })]),
                el('span', { style: 'cursor:pointer;color:#e66;font-size:13px', text: '×', onclick: () => { A.unsetFlag(k); refreshPanel(); } })
            ]));
        }
        const fk = el('input', { type: 'text', placeholder: 'key', style: selCss() + ';flex:2' });
        const fv = el('input', { type: 'text', placeholder: 'value', style: selCss() + ';flex:1' });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [fk, fv,
            el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:0 10px;font-size:12px;cursor:pointer', text: '＋', onclick: () => { const k = fk.value.trim(); if (!k) return; A.setFlag(k, parseVal(fv.value)); refreshPanel(); } })
        ]));

        // ---- inventory ----
        box.appendChild(lbl('Inventory'));
        const inv = (A.runtime && A.runtime.inventory) || [];
        if (!inv.length) box.appendChild(el('div', { style: 'color:#777;font-size:11px', text: 'empty' }));
        for (const it of inv) {
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:#242424;border:1px solid #3a3a3a;border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:#ddd;font-size:11px', text: it.name + (it.qty > 1 ? ` ×${it.qty}` : '') }),
                el('span', { style: 'cursor:pointer;color:#9c9;font-size:13px', text: '＋', onclick: () => { A.giveItem(it.name, 1); refreshPanel(); } }),
                el('span', { style: 'cursor:pointer;color:#e66;font-size:13px', text: '−', onclick: () => { A.takeItem(it.name, 1); refreshPanel(); } })
            ]));
        }
        const iIn = el('input', { type: 'text', placeholder: 'item name', style: selCss() });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [iIn,
            el('button', { style: 'background:#2e2e2e;color:#ddd;border:1px solid #444;border-radius:6px;padding:0 10px;font-size:12px;cursor:pointer', text: '＋', onclick: () => { const n = iIn.value.trim(); if (!n) return; A.giveItem(n, 1); refreshPanel(); } })
        ]));

        // ---- what the AI sees ----
        box.appendChild(el('button', { style: 'width:100%;margin-top:12px;background:#242424;color:#9cf;border:1px solid #345;border-radius:6px;padding:6px;font-size:11px;cursor:pointer', text: '👁 Preview what the AI sees', onclick: () => showPreview() }));
    }
    function parseVal(raw) { const v = String(raw || '').trim(); if (v === '') return true; if (/^(true|false)$/i.test(v)) return /true/i.test(v); if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v); return v; }

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
}
