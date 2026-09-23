// =============================================================================
// KLITE RPmod - Worlds System :: Editor UI (Phase 6)
// -----------------------------------------------------------------------------
// A node-graph editor for the Worlds data model, shown in a large shell window
// ("World editor": wheel-zoom, drag-pan, maximize), plus the Worlds views of the app
// shell (src/shell/): the right-dock "World" tab, the left-dock Party and Quests
// sections, and the Quest log / Combat windows.
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
import { icon, iconText } from './shell/dom.js';

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
            if (props[k] == null) continue;
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
        root: null, gEdges: null, gNodes: null, svgRoot: null, viewport: null,
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
        // automatic placement is not a user edit: { layout: true } keeps the world "saved"
        if (root && (root.x == null)) { root.x = 150; root.y = cy; API().setNodePos(root.id, root.x, root.y, { layout: true }); }
        let i = 0;
        for (const n of missing) {
            if (n.type === 'world') continue;
            const ang = (i / Math.max(1, missing.length)) * Math.PI * 2;
            n.x = Math.round(cx + Math.cos(ang) * (180 + (i % 3) * 70));
            n.y = Math.round(cy + Math.sin(ang) * (150 + (i % 4) * 55));
            API().setNodePos(n.id, n.x, n.y, { layout: true });
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
            const line = svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: e.kind === 'contains' ? 'stroke:var(--rpm-border);opacity:.8' : 'stroke:var(--rpm-fg-muted)', 'stroke-width': e.kind === 'contains' ? 1 : 1.6, 'marker-end': 'url(#wm-arrow)' });
            if (e.kind === 'contains') line.setAttribute('stroke-dasharray', '4 4');
            S.gEdges.appendChild(line);
            if (e.kind !== 'contains') {
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const t = svg('text', { x: mx, y: my - 3, 'text-anchor': 'middle', 'font-size': 9, style: 'fill:var(--rpm-fg-muted)' }); t.textContent = e.kind;
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
            if (n.id === S.selectedId) g.appendChild(svg('rect', { x: -3, y: -3, width: w + 6, height: h + 6, rx: 12, fill: 'none', style: 'stroke:var(--rpm-fg-hi)', 'stroke-width': 2.5 }));
            if (n.id === S.linkSource) g.appendChild(svg('rect', { x: -3, y: -3, width: w + 6, height: h + 6, rx: 12, fill: 'none', stroke: '#ff3ea5', 'stroke-width': 2 }));
            const name = svg('text', { x: 12, y: 22, 'font-size': 13, 'font-weight': 500, fill: '#fff' }); name.textContent = clip(n.name, 20);
            const type = svg('text', { x: 12, y: 37, 'font-size': 10, fill: 'rgba(255,255,255,.8)' }); type.textContent = isRoot ? 'World · root' : n.type + (n.id === S.selectedId ? ' · selected' : '');
            g.appendChild(name); g.appendChild(type);
            // WoW-style quest marker badge on giver / turn-in persons
            if (n.type === 'npc') {
                let mk = ''; try { mk = API().personQuestMarker(n.id) || ''; } catch (_) {}
                if (mk) {
                    g.appendChild(svg('circle', { cx: w - 10, cy: 10, r: 9, style: `fill:${mk === '!' ? 'var(--rpm-quest)' : 'var(--rpm-success)'}`, stroke: '#1b1b1b', 'stroke-width': 1.5 }));
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
        S.root.querySelectorAll('[data-tool]').forEach(b => b.style.outline = (b.getAttribute('data-tool') === t ? '2px solid var(--rpm-fg-hi)' : 'none'));
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
    function updateZoomLabel() { const z = S.root && S.root.querySelector('#wm-zoom'); if (z) z.textContent = Math.round(S.scale * 100) + '%'; }

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
        if (!S.selectedId) { box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs);padding:8px 2px', text: 'Select a node to edit, or add one from the palette.' })); return; }
        const type = A.entityType(S.selectedId) || (S.selectedId === '__world__' ? 'world' : null);
        const ent = A.entityById(S.selectedId);
        if (!ent || !type) return;
        box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:8px' }, [
            el('span', { style: `background:${TYPE_COLOR[type]};color:#fff;border-radius:6px;padding:2px 8px;font-size:var(--rpm-fs-sm);text-transform:capitalize`, text: type }),
            el('span', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm)', text: '#' + String(S.selectedId).slice(-4) })
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
            box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:8px 0 3px', text: label }));
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
        box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);font-weight:bold;margin:14px 0 4px', text: 'Connections' }));
        if (!conns.length) box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm)', text: 'None. Use the Link tool to connect nodes.' }));
        for (const e of conns) {
            const otherId = e.from === S.selectedId ? e.to : e.from;
            const other = nodeById(otherId);
            const row = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;background:var(--rpm-bg-alt);border:1px solid var(--rpm-border);border-radius:6px;padding:4px 8px;margin-top:4px' }, [
                el('span', { style: 'font-size:var(--rpm-fs-sm);color:var(--rpm-fg)' }, [`→ ${clip(other ? other.name : otherId, 18)} `, el('span', { style: 'color:var(--rpm-fg-muted)', text: e.kind })]),
                el('span', { style: 'cursor:pointer;color:var(--rpm-danger);font-size:var(--rpm-fs);padding:0 4px', text: '×', onclick: () => { API().disconnect(e.from, e.to); reloadGraph(); draw(); renderInspector(); } })
            ]);
            box.appendChild(row);
        }
        if (type !== 'world') {
            box.appendChild(el('button', {
                class: 'btn btn-primary rpm-btn rpm-block rpm-danger rpm-btn-icon', style: 'margin-top:16px',
                onclick: () => { if (confirm('Delete this node?')) { API().deleteEntity(S.selectedId); S.selectedId = null; reloadGraph(); draw(); renderInspector(); } }
            }, [iconText('trash-2', 'Delete node')]));
        }
    }
    function inputCss(area) { return `width:100%;box-sizing:border-box;background:var(--rpm-input-bg);color:var(--rpm-input-fg);border:1px solid var(--rpm-border);border-radius:4px;padding:4px 6px;font-size:var(--rpm-fs-sm);font-family:inherit;${area ? 'resize:vertical' : ''}`; }

    // Person-only inspector extras: link a library character + a d20 stat block.
    const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    function renderPersonExtras(box, ent) {
        const A = API();
        // ---- character link ----
        box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);font-weight:bold;margin:14px 0 4px', text: 'Character (from library)' }));
        const chars = A.listCharacters();
        const csel = el('select', { style: inputCss(false) + ';cursor:pointer' });
        csel.appendChild(el('option', { value: '', text: chars.length ? '— not linked —' : '(no characters in library)' }));
        const curRef = ent.characterRef && (ent.characterRef.id || ent.characterRef.name);
        // value = name: the Library's key (gallery ids are list positions)
        for (const c of chars) { const o = el('option', { value: c.name, text: c.name }); if (ent.characterRef && (ent.characterRef.id === c.id || (ent.characterRef.name && ent.characterRef.name === c.name))) o.selected = true; csel.appendChild(o); }
        csel.addEventListener('change', () => {
            if (csel.value) A.linkCharacter(S.selectedId, csel.value); else A.unlinkCharacter(S.selectedId);
            const n = nodeById(S.selectedId); if (n) { n.name = A.personName(S.selectedId); draw(); }
            renderInspector();
        });
        box.appendChild(csel);
        const resolved = A.resolvePersonCharacter(S.selectedId);
        if (ent.characterRef) box.appendChild(el('div', { style: `font-size:10px;margin-top:3px;color:${resolved ? 'var(--rpm-success)' : 'var(--rpm-quest)'}`, text: resolved ? `Linked: ${resolved.name}` : `Linked to "${ent.characterRef.name || ent.characterRef.id}" (not found in library)` }));

        // ---- d20 stat block ----
        box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:8px;margin:14px 0 4px' }, [
            el('span', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);font-weight:bold;flex:1', text: 'Stats (d20)' }),
            ent.stats
                ? el('span', { style: 'cursor:pointer;color:var(--rpm-danger);font-size:10px', text: 'remove', onclick: () => { A.clearStats(S.selectedId); renderInspector(); } })
                : el('span', { style: 'cursor:pointer;color:var(--rpm-info);font-size:10px', text: '+ add', onclick: () => { A.setStats(S.selectedId, {}); renderInspector(); } })
        ]));
        if (!ent.stats) { box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm)', text: 'No stat block. Add one for combat & checks.' })); return; }
        const s = A.getStats(S.selectedId);
        // ability grid
        const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px' });
        for (const a of ABIL) {
            const wrap = el('div', { style: 'text-align:center' });
            wrap.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:9px;text-transform:uppercase', text: a }));
            const inp = el('input', { type: 'number', value: s.abilities[a], style: inputCss(false) + ';text-align:center;padding:3px' });
            inp.addEventListener('change', () => { A.setStats(S.selectedId, { abilities: { [a]: Number(inp.value) } }); renderInspector(); });
            wrap.appendChild(inp);
            wrap.appendChild(el('div', { style: 'color:var(--rpm-info);font-size:9px', text: `(${A.abilityMod(Number(inp.value)) >= 0 ? '+' : ''}${A.abilityMod(Number(inp.value))})` }));
            grid.appendChild(wrap);
        }
        box.appendChild(grid);
        // derived numeric fields
        const numRow = (label, key) => {
            const wrap = el('div', {});
            wrap.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:10px', text: label }));
            const inp = el('input', { type: 'number', value: s[key], style: inputCss(false) + ';padding:4px' });
            inp.addEventListener('change', () => { A.setStats(S.selectedId, { [key]: Number(inp.value) }); });
            wrap.appendChild(inp); return wrap;
        };
        const r1 = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:5px' }, [numRow('AC', 'ac'), numRow('HP max', 'hpMax')]);
        const r2 = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:5px' }, [numRow('Speed', 'speed'), numRow('Prof', 'proficiency'), numRow('Init', 'initiativeMod')]);
        box.appendChild(r1); box.appendChild(r2);
        const monWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);cursor:pointer' });
        const mon = el('input', { type: 'checkbox', style: 'cursor:pointer' }); mon.checked = !!s.isMonster;
        mon.addEventListener('change', () => { A.setStats(S.selectedId, { isMonster: mon.checked }); });
        monWrap.appendChild(mon); monWrap.appendChild(document.createTextNode('Monster / NPC combatant'));
        box.appendChild(monWrap);
    }

    // Quest-only inspector extras: hidden flag, giver/turn-in persons, rewards, objectives.
    function renderQuestExtras(box, ent) {
        const A = API();
        // hidden checkbox
        const hidWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin:12px 0 4px;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);cursor:pointer' });
        const hid = el('input', { type: 'checkbox', style: 'cursor:pointer' }); hid.checked = !!ent.hidden;
        hid.addEventListener('change', () => { A.updateEntity(S.selectedId, { hidden: hid.checked }); });
        hidWrap.appendChild(hid); hidWrap.appendChild(document.createTextNode('Hidden from player until discovered'));
        box.appendChild(hidWrap);

        // giver / turn-in person dropdowns
        const persons = A.getGraph().nodes.filter(n => n.type === 'npc');
        const personSel = (field, label, marker) => {
            box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:8px 0 3px' }, [marker + ' ' + label]));
            const s = el('select', { style: inputCss(false) + ';cursor:pointer' });
            s.appendChild(el('option', { value: '', text: '— none —' }));
            for (const p of persons) { const o = el('option', { value: p.id, text: p.name }); if (ent[field] === p.id) o.selected = true; s.appendChild(o); }
            s.addEventListener('change', () => { A.updateEntity(S.selectedId, { [field]: s.value || null }); reloadGraph(); draw(); });
            box.appendChild(s);
        };
        personSel('giverPersonId', 'Quest giver', '!');
        personSel('turninPersonId', 'Turn-in to', '?');

        // rewards (simple text lines: "name xN" or "N xp")
        box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:10px 0 3px', text: 'Rewards' }));
        const rewards = asArrayU(ent.rewards);
        for (let i = 0; i < rewards.length; i++) {
            const r = rewards[i];
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:var(--rpm-bg-alt);border:1px solid var(--rpm-border);border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:var(--rpm-fg);font-size:var(--rpm-fs-sm)', text: r.xp ? `${r.xp} XP` : (r.item ? `${r.item}${r.qty > 1 ? ' ×' + r.qty : ''}` : JSON.stringify(r)) }),
                el('span', { style: 'cursor:pointer;color:var(--rpm-danger);font-size:var(--rpm-fs)', text: '×', onclick: () => { rewards.splice(i, 1); A.updateEntity(S.selectedId, { rewards }); renderInspector(); } })
            ]));
        }
        const rIn = el('input', { type: 'text', placeholder: 'e.g. Gold Ring x1  or  100 xp', style: inputCss(false) });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [rIn,
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon', title: 'Add reward', 'aria-label': 'Add reward', onclick: () => { const r = parseReward(rIn.value); if (!r) return; const rw = asArrayU(ent.rewards); rw.push(r); A.updateEntity(S.selectedId, { rewards: rw }); renderInspector(); } }, [icon('plus', 15)])
        ]));

        // objectives (text + hidden toggle)
        box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:10px 0 3px', text: 'Objectives' }));
        const objs = asArrayU(ent.objectives);
        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            box.appendChild(el('div', { style: 'display:flex;align-items:center;gap:6px;background:var(--rpm-bg-alt);border:1px solid var(--rpm-border);border-radius:6px;padding:3px 8px;margin-top:3px' }, [
                el('span', { style: 'flex:1;color:var(--rpm-fg);font-size:var(--rpm-fs-sm);display:flex;align-items:center;gap:4px', title: o.hidden ? 'Hidden objective' : null }, [o.hidden ? icon('lock', 12) : null, o.text || '']),
                el('span', { style: 'cursor:pointer;color:var(--rpm-danger);font-size:var(--rpm-fs)', text: '×', onclick: () => { objs.splice(i, 1); A.updateEntity(S.selectedId, { objectives: objs }); renderInspector(); } })
            ]));
        }
        const oIn = el('input', { type: 'text', placeholder: 'objective text', style: inputCss(false) });
        box.appendChild(el('div', { style: 'display:flex;gap:5px;margin-top:5px' }, [oIn,
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon', title: 'Add objective', 'aria-label': 'Add objective', onclick: () => { const t = oIn.value.trim(); if (!t) return; const ob = asArrayU(ent.objectives); ob.push({ id: 'obj_' + Math.random().toString(36).slice(2, 7), text: t, hidden: false }); A.updateEntity(S.selectedId, { objectives: ob }); renderInspector(); } }, [icon('plus', 15)])
        ]));
    }
    // World root extras: the World Rules list (one rule per line) — these are what the AI
    // sees as [World Rules]. Bound to world.rules; blank lines are trimmed at injection.
    function renderWorldExtras(box, ent) {
        const A = API();
        box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:12px 0 3px', text: 'World Rules (one per line)' }));
        const ta = el('textarea', { style: inputCss(true), rows: 5, placeholder: 'e.g.\nMedieval low-fantasy tone.\nWhen the scene changes location, emit <move>Name</move>.' });
        ta.value = (Array.isArray(ent.rules) ? ent.rules : []).join('\n');
        ta.addEventListener('input', () => { A.updateEntity('__world__', { rules: ta.value.split('\n') }); });
        box.appendChild(ta);
        box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:10px;margin-top:3px', text: 'Shown to the AI as [World Rules]. The Description above is shown as the world premise.' }));
    }

    // Faction-only extras: headquarters location.
    function renderFactionExtras(box, ent) {
        const A = API();
        box.appendChild(el('label', { style: 'display:block;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);margin:12px 0 3px;display:flex;align-items:center;gap:4px' }, [icon('castle', 13), 'Headquarters (location)']));
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
        box.appendChild(el('div', { style: 'color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);font-weight:bold;margin:12px 0 4px', text: label }));
        items.forEach((item, i) => {
            const row = el('div', { style: 'background:var(--rpm-bg-alt);border:1px solid var(--rpm-border);border-radius:6px;padding:5px;margin-bottom:4px' });
            const head = el('div', { style: 'display:flex;gap:5px;align-items:center' });
            const tsel = el('select', { style: inputCss(false) + ';cursor:pointer;flex:1' });
            for (const t of Object.keys(SPEC)) { const o = el('option', { value: t, text: t }); if (item.type === t) o.selected = true; tsel.appendChild(o); }
            tsel.addEventListener('change', () => { items[i] = { type: tsel.value }; onSave(items); });
            head.appendChild(tsel);
            head.appendChild(el('span', { style: 'cursor:pointer;color:var(--rpm-danger);font-size:var(--rpm-fs);padding:0 3px', text: '×', onclick: () => { items.splice(i, 1); onSave(items); } }));
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
        box.appendChild(el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon', onclick: () => { items.push({ type: firstType }); onSave(items); } }, [iconText('plus', 'Add')]));
    }
    function renderEventExtras(box, ent) {
        const A = API();
        // hidden + repeatable
        const flags = el('div', { style: 'display:flex;gap:14px;margin:12px 0 4px' });
        const mk = (label, key) => { const w = el('label', { style: 'display:flex;align-items:center;gap:5px;color:var(--rpm-fg-muted);font-size:var(--rpm-fs-sm);cursor:pointer' }); const c = el('input', { type: 'checkbox', style: 'cursor:pointer' }); c.checked = !!ent[key]; c.addEventListener('change', () => A.updateEntity(S.selectedId, { [key]: c.checked })); w.appendChild(c); w.appendChild(document.createTextNode(label)); return w; };
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
    //  EDITOR CHROME (inside the shell window "editor")
    // =======================================================================
    // editor toolbar button: Esolite .btn-primary (variant: 'success' | 'danger')
    function btn(label, onclick, variant) { return el('button', { type: 'button', class: 'btn btn-primary rpm-btn' + (variant ? ' rpm-' + variant : ''), text: label, onclick }); }

    function buildEditor() {
        const A = API();
        const root = el('div', { id: 'wm-editor', class: 'wm-editor' });

        // header
        S.worldNameInput = el('input', { type: 'text', class: 'form-control rpm-input', 'aria-label': 'World name', style: 'width:230px;font-size:var(--rpm-fs)' });
        S.worldNameInput.value = (A.activeWorld() && A.activeWorld().name) || '';
        S.worldNameInput.addEventListener('input', () => { A.updateEntity('__world__', { name: S.worldNameInput.value }); const n = nodeById('__world__'); if (n) { n.name = S.worldNameInput.value; draw(); } });
        const header = el('div', { class: 'wm-ed-toolbar' }, [
            el('span', { text: 'World' }), S.worldNameInput,
            el('div', { style: 'flex:1' }),
            btn('−', () => { S.scale = Math.max(0.2, S.scale / 1.1); applyViewport(); updateZoomLabel(); }),
            el('span', { id: 'wm-zoom', style: 'font-size:var(--rpm-fs-sm);min-width:42px;text-align:center', text: '100%' }),
            btn('+', () => { S.scale = Math.min(3, S.scale * 1.1); applyViewport(); updateZoomLabel(); }),
            btn('Fit', () => fit()),
            btn('Preview', () => showPreview()),
            S.revertBtn = btn('Revert', () => revertFlow()),
            S.saveBtn = btn('Save', () => saveFlow(), 'success')
        ]);
        S.saveBtn.setAttribute('data-save', 'world'); S.revertBtn.setAttribute('data-revert', 'world');

        // palette + tools rail
        const rail = el('div', { class: 'wm-ed-rail' });
        rail.appendChild(el('div', { class: 'wm-ed-label', text: 'Add node' }));
        const palette = el('div', { class: 'wm-ed-palette' });
        for (const t of TYPES) palette.appendChild(el('button', {
            type: 'button', class: 'wm-ed-add', style: `background:${TYPE_COLOR[t]}`,
            onclick: () => addNodeCentered(t)
        }, [iconText('plus', t, 14)]));
        rail.appendChild(palette);
        rail.appendChild(el('div', { class: 'wm-ed-label', text: 'Tool' }));
        const tools = el('div', { class: 'wm-ed-tools' }, ['select', 'link', 'pan'].map(t =>
            el('button', { type: 'button', 'data-tool': t, class: 'btn btn-primary rpm-btn', style: 'flex:1;text-transform:capitalize', text: t, onclick: () => setTool(t) })));
        rail.appendChild(tools);
        rail.appendChild(el('div', { class: 'wm-ed-help', text: 'Select: move nodes. Link: click two nodes to connect. Pan/empty-drag: move canvas. Wheel: zoom.' }));

        // canvas
        const svgRoot = svg('svg', { class: 'wm-ed-canvas' });
        const defs = svg('defs');
        const marker = svg('marker', { id: 'wm-arrow', markerWidth: 9, markerHeight: 9, refX: 8, refY: 3, orient: 'auto' });
        const mpath = svg('path', { d: 'M0,0 L8,3 L0,6 Z', style: 'fill:var(--rpm-fg-muted)' }); marker.appendChild(mpath); defs.appendChild(marker);
        svgRoot.appendChild(defs);
        const bg = svg('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: 'transparent' });
        const viewport = svg('g');
        const gEdges = svg('g'), gNodes = svg('g');
        viewport.appendChild(bg); viewport.appendChild(gEdges); viewport.appendChild(gNodes);
        svgRoot.appendChild(viewport);
        svgRoot.addEventListener('mousedown', ev => { if (ev.target === svgRoot || ev.target === bg) onCanvasDown(ev); });
        svgRoot.addEventListener('wheel', onWheel, { passive: false });

        // inspector
        const inspector = el('div', { class: 'wm-ed-insp' });
        inspector.appendChild(el('div', { style: 'color:var(--rpm-fg);font-size:var(--rpm-fs);font-weight:bold;margin-bottom:8px', text: 'Inspector' }));
        const inspBody = el('div');
        inspector.appendChild(inspBody);

        const body = el('div', { class: 'wm-ed-body' }, [rail, svgRoot, inspector]);
        root.appendChild(header); root.appendChild(body);

        S.root = root; S.header = header; S.svgRoot = svgRoot; S.viewport = viewport;
        S.gEdges = gEdges; S.gNodes = gNodes; S.inspector = inspBody;

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return root;
    }

    function addNodeCentered(type) {
        const r = S.svgRoot.getBoundingClientRect();
        const p = screenToGraph(r.left + r.width / 2, r.top + r.height / 2);
        const e = API().addEntity(type, { name: '', x: p.x, y: p.y });
        reloadGraph(); select(e.id); draw();
    }

    function showPreview() {
        // everything RPmod adds this turn (Worlds slice + persona/character), not just Worlds
        const ctx = window.KLITE_RPMod_Context;
        const txt = (ctx ? ctx.preview() : API().preview()) || '(nothing — enable the world and set a location, or enable a persona/character)';
        const modal = el('div', { class: 'rpm-themed', style: 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center', onclick: (ev) => { if (ev.target === modal) modal.remove(); } });
        const box = el('div', { role: 'dialog', 'aria-label': 'What the AI will see', style: 'width:min(760px,92vw);max-height:80%;display:flex;flex-direction:column;overflow:hidden;background:var(--rpm-bg);color:var(--rpm-fg);border:1px solid var(--rpm-border);border-radius:var(--rpm-radius-lg);box-shadow:var(--rpm-shadow)' }, [
            el('div', { style: 'padding:8px 10px;background:var(--rpm-accent-bg);color:var(--rpm-accent-fg);font-weight:bold', text: 'What RPmod adds to the prompt this turn' }),
            el('pre', { style: 'flex:1;overflow:auto;white-space:pre-wrap;color:var(--rpm-fg);background:var(--rpm-bg-chat);border:1px solid var(--rpm-border);border-radius:var(--rpm-radius);padding:10px;margin:10px;font-size:var(--rpm-fs-sm);line-height:1.5;font-family:ui-monospace,monospace' , text: txt }),
            el('div', { style: 'display:flex;justify-content:center;padding:8px;border-top:1px solid var(--rpm-border)' }, [el('button', { type: 'button', class: 'btn btn-primary rpm-btn', style: 'min-width:80px', text: 'Close', onclick: () => modal.remove() })])
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
        A.loadExample().then(() => { refreshPanel(); toast('Example world loaded — enabled & ready. Just start chatting!'); });
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
                if (S.root) { reloadGraph(); fit(); draw(); renderInspector(); }
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
        const t = el('div', { class: 'rpm-themed', role: 'status', style: `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100002;background:var(--rpm-bg);color:var(--rpm-fg);border:1px solid ${isErr ? 'var(--rpm-danger)' : 'var(--rpm-border-hi)'};box-shadow:inset 3px 0 0 ${isErr ? 'var(--rpm-danger)' : 'var(--rpm-success)'},var(--rpm-shadow);border-radius:var(--rpm-radius-lg);padding:8px 16px;font-size:var(--rpm-fs)`, text: msg });
        document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
    }

    // =======================================================================
    //  OPEN / CLOSE
    // =======================================================================
    // The editor is the shell window view "editor" (large, maximizable). openEditor()
    // creates a world first if there is none, then opens (or re-focuses and reloads) it.
    function openEditor() {
        const A = API();
        if (!A) { alert('Worlds engine not loaded'); return; }
        if (!A.activeWorld()) {
            const name = prompt('No active world. Name a new world to create:', 'New World');
            if (name == null) return;
            A.newWorld(name).then(() => openEditor());
            return;
        }
        const sh = Shell();
        if (S.root) { S.selectedId = null; S.linkSource = null; resetEditor(); }
        if (sh) sh.open('editor');
    }
    function closeEditor() { const sh = Shell(); if (sh) sh.close('editor'); }

    function mountEditor(container) {
        const A = API();
        if (!A || !A.activeWorld()) {
            container.appendChild(el('div', { class: 'rpm-view-pad' }, [
                el('p', { class: 'rpm-muted', text: 'No world loaded. Create one or load the example from the World tab.' }),
                uiBtn('Create a world', () => openEditor())
            ]));
            return;
        }
        container.appendChild(buildEditor());
        resetEditor();
        updateSaveState();
    }
    function resetEditor() {
        if (S.worldNameInput) S.worldNameInput.value = (API().activeWorld() && API().activeWorld().name) || '';
        reloadGraph(); setTool(S.tool || 'select'); draw(); renderInspector();
        // start reasonably framed (after the window has its size)
        setTimeout(() => { if (S.root) fit(); }, 30);
    }
    function unmountEditor() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        S.root = null; S.selectedId = null; S.linkSource = null; S.drag = null; S.pan = null; S.saveBtn = null; S.revertBtn = null;
        try { refreshPanel(); } catch (_) {}
    }

    // ---- unsaved world edits (engine: hasUnsavedChanges / revertToSaved; setting:
    //      Esolite Settings → RPmod → "Autosave world edits") ----
    const unsaved = () => { const A = API(); return !!(A && A.hasUnsavedChanges && A.hasUnsavedChanges()); };
    const autosave = () => { const A = API(); return !!(A && A.autosaveEnabled && A.autosaveEnabled()); };
    async function saveFlow() { await API().saveActiveWorld(); toast('World saved'); updateSaveState(); }
    async function revertFlow() {
        if (!unsaved()) return;
        if (!confirm('Revert to the last saved state? All unsaved world changes (including deletions) are undone.')) return;
        const ok = await API().revertToSaved();
        if (S.root) { S.selectedId = null; resetEditor(); }
        refreshPanel(); toast(ok ? 'Reverted to the last save' : 'Nothing saved yet to revert to', !ok);
    }
    function updateSaveState() {
        if (!S.saveBtn) return;
        const dirty = unsaved(), auto = autosave();
        S.saveBtn.textContent = dirty ? (auto ? 'Saving…' : 'Save •') : 'Saved';
        S.saveBtn.title = dirty ? (auto ? 'Autosave is on — saving shortly' : 'Unsaved changes — click to save') : 'All changes saved';
        S.saveBtn.classList.toggle('rpm-unsaved', dirty && !auto);
        S.revertBtn.hidden = !dirty || auto;
    }
    // Closing the editor with unsaved changes (autosave off): ask inside the window.
    function editorBeforeClose() {
        if (!unsaved() || autosave() || !S.root) return true;
        if (S.root.querySelector('.wm-ed-ask')) return false;
        const done = () => { const sh = Shell(); if (sh) sh.close('editor', { force: true }); };
        const ask = el('div', { class: 'wm-ed-ask', role: 'alertdialog', 'aria-label': 'Unsaved world changes' }, [
            el('div', { class: 'wm-ed-ask-box rpm-card' }, [
                el('div', { class: 'rpm-heading', text: 'Unsaved world changes' }),
                el('p', { class: 'rpm-muted', text: 'Save them before closing? Unsaved changes stay in this session until the page reloads; Revert undoes them.' }),
                row([
                    uiBtn('Save and close', async () => { await API().saveActiveWorld(); done(); }, { icon: 'check', variant: 'success' }),
                    uiBtn('Close, keep unsaved', () => done()),
                    uiBtn('Revert and close', async () => { if (!confirm('Undo all unsaved world changes?')) return; await API().revertToSaved(); done(); }, { icon: 'rotate-ccw', variant: 'danger' }),
                    uiBtn('Stay', () => ask.remove()),
                ], 'flex-wrap:wrap;margin-top:8px'),
            ]),
        ]);
        S.root.appendChild(ask);
        return false;
    }

    // =======================================================================
    //  SHELL VIEWS — right-dock "World" tab, left-dock sections, windows
    //  (the app shell in src/shell/ owns placement; see registerViews below).
    //  Look & feel: Esolite's own classes (btn btn-primary, form-control) plus the
    //  shell's rpm-* layout classes — no hard-coded colours (see src/shell/styles.js).
    // =======================================================================
    let panelEl = null;
    const TIME_SLOTS_UI = ['morning', 'noon', 'afternoon', 'evening', 'night'];
    const VIEW_IDS = ['world', 'party', 'quest-tracker', 'questlog', 'combat'];

    // ---- themed control helpers ----
    // opts.icon: a Lucide name (src/shell/icons.js); icon-only buttons take opts.title as label
    function uiBtn(text, onclick, opts) {
        opts = opts || {};
        const cls = 'btn btn-primary rpm-btn' + (opts.block ? ' rpm-block' : '') + (opts.grow ? ' rpm-grow' : '') + (opts.variant ? ' rpm-' + opts.variant : '') + (opts.lg ? ' rpm-lg' : '') + (opts.icon ? ' rpm-btn-icon' : '');
        if (!opts.icon) return el('button', { type: 'button', class: cls, title: opts.title, style: opts.style, text, onclick });
        return el('button', { type: 'button', class: cls, title: opts.title, 'aria-label': text ? null : opts.title, style: opts.style, onclick }, [iconText(opts.icon, text)]);
    }
    function uiInput(props) { return el('input', Object.assign({ type: 'text', class: 'form-control rpm-input' }, props)); }
    function uiSelect(props) { return el('select', Object.assign({ class: 'form-control rpm-input' }, props)); }
    function lbl(t) { return el('label', { class: 'rpm-label', text: t }); }
    function muted(t, extra) { return el('div', Object.assign({ class: 'rpm-muted', text: t }, extra || {})); }
    function row(kids, style) { return el('div', { class: 'rpm-row', style }, kids); }

    function uiMode() { if (!S.uiMode) { try { S.uiMode = localStorage.getItem('KLITE.worlds.uiMode') || 'creator'; } catch (_) { S.uiMode = 'creator'; } } return S.uiMode; }
    function setUiMode(m) { S.uiMode = m; try { localStorage.setItem('KLITE.worlds.uiMode', m); } catch (_) {} }

    function Shell() { return window.KLITE_RPMod_Shell; }
    function openView(id) { const sh = Shell(); if (sh) sh.open(id); }

    // Re-render every Worlds view; hidden ones re-render when they are shown.
    function refreshPanel(opts) { const sh = Shell(); if (sh) sh.refresh(VIEW_IDS, opts); else renderPanel(); }

    function mountPanel(container) {
        panelEl = el('div', { id: 'wm-panel', class: 'rpm-view-pad' });
        container.appendChild(panelEl);
        renderPanel();
    }

    function renderPanel() {
        if (!panelEl) return;
        const A = API(); const body = panelEl; clear(body);

        // ---- header: creator/player lens ----
        const mode = uiMode();
        body.appendChild(row([
            el('span', { class: 'rpm-heading rpm-grow', text: 'Worlds' }),
            el('span', {
                role: 'button', tabindex: '0', title: 'Toggle Creator / Player view',
                class: 'rpm-chip ' + (mode === 'creator' ? 'rpm-chip-quest' : 'rpm-chip-info'),
                text: mode === 'creator' ? 'Creator' : 'Player',
                onclick: () => { setUiMode(mode === 'creator' ? 'player' : 'creator'); refreshPanel(); },
                onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }
            })
        ], 'margin-bottom:8px'));

        // ---- world selector + new ----
        const worlds = A.listWorlds();
        const sel = uiSelect({ 'aria-label': 'Active world' });
        sel.appendChild(el('option', { value: '', text: worlds.length ? '— select world —' : '(no worlds yet)' }));
        for (const w of worlds) { const o = el('option', { value: w.id, text: w.name || w.id }); if (A.activeWorld() && A.activeWorld().id === w.id) o.selected = true; sel.appendChild(o); }
        sel.addEventListener('change', () => { if (sel.value) { A.useWorld(sel.value); refreshPanel(); } });
        body.appendChild(sel);
        body.appendChild(row([
            uiBtn('New', () => { const n = prompt('New world name:', 'New World'); if (n != null) A.newWorld(n).then(refreshPanel); }, { icon: 'plus', grow: true }),
            uiBtn('Example', () => loadExampleFlow(), { icon: 'sparkles', grow: true, title: 'Load the ready-to-play example world' }),
            uiBtn('Import', () => importFlow(), { icon: 'upload', grow: true }),
            uiBtn('Export', () => exportFlow(), { icon: 'download', grow: true })
        ], 'margin:6px 0 8px'));

        if (unsaved() && !autosave()) {
            body.appendChild(el('div', { class: 'rpm-card rpm-unsaved-card', 'data-unsaved': 'world', style: 'margin:0 0 8px' }, [
                el('div', { style: 'font-weight:bold;margin-bottom:4px', text: 'Unsaved world changes' }),
                row([uiBtn('Save', () => saveFlow().then(refreshPanel), { icon: 'check', grow: true, variant: 'success' }),
                     uiBtn('Revert', () => revertFlow(), { icon: 'rotate-ccw', grow: true })]),
            ]));
        }

        if (!A.activeWorld()) {
            body.appendChild(muted('New here? Load the ready-to-play example and just start chatting.', { style: 'margin:6px 0 8px' }));
            body.appendChild(uiBtn('Load example world', () => loadExampleFlow(), { icon: 'sparkles', block: true, lg: true }));
            return;
        }

        // ---- bigger views open as floating windows / the editor overlay ----
        body.appendChild(row([
            uiBtn('Quest log', () => openView('questlog'), { icon: 'scroll-text', grow: true }),
            uiBtn('Combat', () => openView('combat'), { icon: 'swords', grow: true }),
            uiBtn('Editor', () => openEditor(), { icon: 'workflow', grow: true, title: 'Build your world as a node graph' })
        ]));
        body.appendChild(el('hr', { class: 'rpm-divider' }));
        renderPlayTab(body);
    }

    // ---- left dock: party (persona + HP/AC, place, time, combat status) ----
    function hpBar(cur, max) {
        const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(cur / max * 100))) : 0;
        const bar = el('div', { class: 'rpm-bar', 'data-party': 'hpbar', role: 'meter', 'aria-label': 'Hit points', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(cur) });
        bar.appendChild(el('span', { style: `width:${pct}%;background:${pct > 50 ? 'var(--rpm-success)' : pct > 25 ? 'var(--rpm-quest)' : 'var(--rpm-danger)'}` }));
        return bar;
    }
    // The player character = the persona chosen in the Characters tab (ALPHA Tools).
    // Sheet values come from the card; during combat the tracker's HP is authoritative.
    function renderPersona(box, player, cb) {
        const C = window.KLITE_RPMod_Characters;
        const persona = C && C.personaName ? C.personaName() : '';
        box.appendChild(el('div', { class: 'rpm-heading', 'data-party': 'name', text: persona || player.name || 'You' }));
        if (!C) return;
        if (!persona) {
            box.appendChild(muted('No persona chosen — pick the character you play.', { 'data-party': 'no-persona' }));
            if (window.KLITE_RPMod_Gallery) box.appendChild(uiBtn('Choose in gallery', () => window.KLITE_RPMod_Gallery.open(), { icon: 'layout-grid', block: true, style: 'margin:4px 0' }));
            return;
        }
        const sheet = C.cachedSheet(persona);   // undefined while loading (klite:sheet-change re-renders)
        if (sheet) {
            const who = [sheet.species, sheet.className ? `${sheet.className} ${sheet.level}` : `Level ${sheet.level}`].filter(Boolean).join(' · ');
            if (who) box.appendChild(muted(who, { 'data-party': 'class' }));
            const inCombat = cb && cb.active && cb.hp && cb.hp.__player__ != null;
            const hp = inCombat ? cb.hp.__player__ : sheet.hp.current;
            const max = inCombat ? cb.maxHp.__player__ : sheet.hp.max;
            const temp = !inCombat && sheet.hp.temp ? ` (+${sheet.hp.temp})` : '';
            box.appendChild(row([
                el('span', { class: 'rpm-grow', 'data-party': 'hp', title: inCombat ? 'Hit points in the current fight' : 'Hit points on the character sheet', text: `HP ${hp}/${max}${temp}${inCombat ? ' ⚔' : ''}` }),
                el('span', { 'data-party': 'ac', title: sheet.acNote || 'Armor Class', text: `AC ${sheet.ac}` }),
                el('span', { class: 'rpm-muted', 'data-party': 'speed', text: `${sheet.speed} ft.` })
            ], 'margin-top:4px'));
            box.appendChild(hpBar(hp, max));
            box.appendChild(uiBtn('Character sheet', () => C.open(persona), { icon: 'id-card', block: true, style: 'margin:6px 0 4px', title: 'Abilities, skills, inventory — click values to roll' }));
        } else {
            if (sheet === null) box.appendChild(muted('No character sheet yet.', { 'data-party': 'no-sheet' }));
            const B = window.KLITE_RPMod_Builder;
            box.appendChild(row([
                B && sheet === null ? uiBtn('Build', () => B.open({ target: persona, name: persona }), { icon: 'sparkles', grow: true, title: 'Step-by-step character builder (SRD 5.2.1)' }) : null,
                uiBtn('Character sheet', () => C.open(persona), { icon: 'id-card', grow: true })
            ], 'margin:4px 0'));
        }
    }
    function renderParty(box) {
        const A = API(); const world = A.activeWorld();
        const player = (world && world.ruleset && world.ruleset.player) || {};
        const cb = world ? A.getCombat() : null;
        renderPersona(box, player, cb);
        if (!world) {
            box.appendChild(muted('No world loaded.', { style: 'margin-top:6px' }));
            box.appendChild(uiBtn('Choose a world', () => openView('world'), { block: true, style: 'margin-top:8px' }));
            return;
        }
        const rt = A.runtime || {};
        const loc = rt.playerLocationId ? A.entityById(rt.playerLocationId) : null;
        const c = rt.clock || {};
        box.appendChild(el('div', { class: 'rpm-muted', 'data-party': 'location', style: 'margin-top:2px;display:flex;align-items:center;gap:4px' }, [icon('map-pin', 13), loc ? (loc.name || loc.id) : 'nowhere']));
        box.appendChild(muted(`🕑 Day ${c.day || 1}, ${c.time || '—'}${c.weather ? ' · ' + c.weather : ''}`));
        if (cb && cb.active) {
            const cur = cb.order[cb.turnIndex];
            const hp = cb.hp.__player__, max = cb.maxHp.__player__;
            box.appendChild(uiBtn(`⚔ Round ${cb.round} · ${cur ? cur.name : ''}${hp != null ? ` · HP ${hp}/${max}` : ''}`, () => openView('combat'), { block: true, variant: 'danger', style: 'margin-top:8px' }));
        }
    }

    // ---- left dock: quest tracker (active + ready to turn in) ----
    function renderQuestTracker(box) {
        const A = API();
        if (!A.activeWorld()) { box.appendChild(muted('No quests yet.')); return; }
        const quests = A.listQuests(uiMode() === 'player' ? 'player' : 'creator')
            .filter(q => q.state === 'active' || q.state === 'complete')
            .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
        if (!quests.length) box.appendChild(muted('No active quests.'));
        for (const q of quests) {
            const ready = q.state === 'complete';
            box.appendChild(el('div', { 'data-quest': q.id, class: 'rpm-card' + (q.active ? ' rpm-card-hi' : '') }, [
                el('div', { style: 'font-weight:bold' }, [ready ? el('span', { class: 'rpm-quest-mark', text: '? ' }) : null, q.title]),
                ready && q.turnin ? muted('Turn in to ' + q.turnin) : null
            ]));
        }
        box.appendChild(uiBtn('Open quest log', () => openView('questlog'), { icon: 'scroll-text', block: true, style: 'margin-top:8px' }));
    }

    function renderQuestsTab(box) {
        const A = API();
        const mode = uiMode() === 'player' ? 'player' : 'creator';
        // per-world AI mode selector (gm vs player-facing)
        const aiSel = uiSelect({ 'aria-label': 'What the AI sees', style: 'width:auto' });
        for (const [v, t] of [['gm', 'GM (all)'], ['player', 'Player (visible only)']]) { const o = el('option', { value: v, text: t }); if (A.getAiMode() === v) o.selected = true; aiSel.appendChild(o); }
        aiSel.addEventListener('change', () => { A.setAiMode(aiSel.value); });
        box.appendChild(row([el('span', { class: 'rpm-muted rpm-grow', text: 'AI sees hidden content:' }), aiSel], 'margin-bottom:8px'));

        const quests = A.listQuests(mode);
        if (!quests.length) { box.appendChild(muted('No quests visible. Add Quest nodes in the editor.')); return; }
        const groups = [['available', 'Available'], ['active', 'Active'], ['complete', 'Ready to turn in'], ['turnedin', 'Completed'], ['failed', 'Failed']];
        for (const [st, label] of groups) {
            const inGroup = quests.filter(q => q.state === st);
            if (!inGroup.length) continue;
            box.appendChild(lbl(label));
            for (const q of inGroup) {
                const card = el('div', { class: 'rpm-card' + (q.active ? ' rpm-card-hi' : ''), 'data-quest': q.id });
                card.appendChild(row([
                    el('span', { class: 'rpm-grow', style: 'font-weight:bold' }, [
                        q.marker ? el('span', { class: 'rpm-quest-mark', text: q.marker + ' ' }) : null, q.title,
                        q.hidden ? el('span', { class: 'rpm-chip rpm-chip-danger', style: 'margin-left:6px', text: 'hidden' }) : null
                    ]),
                    q.active ? el('span', { class: 'rpm-chip rpm-chip-info', text: '● tracked' }) : null
                ]));
                if (q.description) card.appendChild(el('div', { style: 'margin-top:3px', text: q.description }));
                if (q.giver || q.turnin) card.appendChild(muted((q.giver ? `From: ${q.giver}` : '') + (q.turnin ? `  Turn-in: ${q.turnin}` : ''), { style: 'margin-top:2px' }));
                const ctl = el('div', { class: 'rpm-row', style: 'flex-wrap:wrap;margin-top:6px' });
                const act = (t, fn, variant) => uiBtn(t, () => { fn(); refreshPanel(); }, { variant });
                if (st === 'available') ctl.appendChild(act('Accept', () => A.acceptQuest(q.id), 'success'));
                if (st === 'active') { ctl.appendChild(act('Complete', () => A.completeQuest(q.id), 'success')); ctl.appendChild(act(q.active ? 'Untrack' : 'Track', () => A.setActiveQuest(q.active ? null : q.id))); ctl.appendChild(act('Fail', () => A.failQuest(q.id), 'danger')); }
                if (st === 'complete') ctl.appendChild(act('Turn in', () => A.turnInQuest(q.id), 'success'));
                if (mode === 'creator' && q.hidden) ctl.appendChild(act('Reveal to player', () => A.discoverQuest(q.id)));
                if (ctl.childNodes.length) card.appendChild(ctl);
                box.appendChild(card);
            }
        }
    }

    function renderCombatTab(box) {
        const A = API();
        const cb = A.getCombat();
        if (cb && cb.active) return renderActiveCombat(box, cb);

        // ---- encounter builder ----
        box.appendChild(muted('Select combatants for the encounter. NPCs need a stat block (add one in the editor).', { style: 'margin-bottom:6px' }));
        const persons = A.getGraph().nodes.filter(n => n.type === 'npc');
        const chosen = S._encPick || (S._encPick = {});
        if (!persons.length) box.appendChild(muted('No persons yet.'));
        for (const p of persons) {
            const st = A.getStats(p.id);
            const c = el('input', { type: 'checkbox' }); c.checked = !!chosen[p.id];
            c.addEventListener('change', () => { chosen[p.id] = c.checked; });
            box.appendChild(el('label', { class: 'rpm-row', style: 'padding:3px 0;cursor:pointer' }, [
                c,
                el('span', { class: 'rpm-grow' }, [p.name, st
                    ? el('span', { class: 'rpm-chip rpm-chip-info', style: 'margin-left:6px', text: `AC ${st.ac} HP ${st.hpMax}` })
                    : el('span', { class: 'rpm-chip rpm-chip-danger', style: 'margin-left:6px', text: 'no stats' })])
            ]));
        }
        // quick-add SRD monster
        box.appendChild(lbl('Quick-add monster (SRD)'));
        const tRow = el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' });
        for (const key of A.listTemplates()) tRow.appendChild(uiBtn(key.replace('_', ' '), () => { const p = A.addPersonFromTemplate(key); S._encPick[p.id] = true; refreshPanel(); }));
        box.appendChild(tRow);
        // include player + start
        const inc = el('input', { type: 'checkbox' }); inc.checked = S._encPlayer !== false;
        inc.addEventListener('change', () => { S._encPlayer = inc.checked; });
        box.appendChild(el('label', { class: 'rpm-row', style: 'margin:10px 0;cursor:pointer' }, [inc, el('span', { text: 'Include the player' })]));
        box.appendChild(uiBtn('Start encounter', () => { const ids = Object.keys(chosen).filter(k => chosen[k]); A.startEncounter(ids, { includePlayer: S._encPlayer !== false }); S._encPick = {}; refreshPanel(); }, { icon: 'swords', block: true, lg: true, variant: 'danger' }));
    }

    function renderActiveCombat(box, cb) {
        const A = API();
        const cur = cb.order[cb.turnIndex];
        box.appendChild(row([
            el('span', { class: 'rpm-heading rpm-grow', text: `Round ${cb.round}` }),
            el('span', { class: 'rpm-chip rpm-chip-danger', text: '▶ ' + cur.name })
        ], 'margin-bottom:8px'));
        // roster with HP bars
        for (const o of cb.order) {
            const hp = cb.hp[o.id], max = cb.maxHp[o.id] || 1, pct = Math.max(0, Math.min(100, Math.round(hp / max * 100)));
            const down = hp <= 0;
            const card = el('div', { class: 'rpm-card' + (o.id === cur.id ? ' rpm-card-hi' : ''), style: down ? 'opacity:.5' : null });
            card.appendChild(row([
                el('span', { class: 'rpm-grow', text: (o.id === cur.id ? '▶ ' : '') + o.name + (down ? ' (down)' : '') }),
                el('span', { class: 'rpm-muted', text: `${hp}/${max} · init ${o.init}` })
            ]));
            const bar = el('div', { class: 'rpm-bar' });
            bar.appendChild(el('span', { style: `width:${pct}%;background:${pct > 50 ? 'var(--rpm-success)' : pct > 25 ? 'var(--rpm-quest)' : 'var(--rpm-danger)'}` }));
            card.appendChild(bar);
            box.appendChild(card);
        }
        // attack controls
        const targets = cb.order.filter(o => cb.hp[o.id] > 0 && o.id !== cur.id);
        const tSel = uiSelect({ class: 'form-control rpm-input rpm-grow', 'aria-label': 'Target' });
        for (const o of targets) tSel.appendChild(el('option', { value: o.id, text: o.name }));
        box.appendChild(row([tSel, uiBtn(`${cur.name} attacks`, () => { if (tSel.value) A.attack(cur.id, tSel.value); refreshPanel(); }, { icon: 'swords', variant: 'danger' })], 'margin-top:8px'));
        // dice roller
        const rIn = uiInput({ value: '1d20', class: 'form-control rpm-input rpm-grow', 'aria-label': 'Dice expression' });
        box.appendChild(row([rIn, uiBtn('Roll', () => { A.applyTags(`<roll>${rIn.value}</roll>`); refreshPanel(); }, { icon: 'dice-5' })], 'margin-top:6px'));
        // turn/end
        box.appendChild(row([
            uiBtn('⏭ Next turn', () => { A.nextTurn(); refreshPanel(); }, { grow: true }),
            uiBtn('End', () => { A.endEncounter(); refreshPanel(); }, { icon: 'x', grow: true, variant: 'danger' })
        ], 'margin-top:6px'));
        // log
        box.appendChild(lbl('Combat log'));
        const log = el('div', { class: 'rpm-log' });
        for (const line of (cb.log || []).slice(-8)) log.appendChild(el('div', { text: line }));
        box.appendChild(log);
    }

    function renderPlayTab(box) {
        const A = API();
        // enable toggle
        const enabled = A.isEnabled();
        box.appendChild(uiBtn(enabled ? '● Enabled for this story' : '○ Enable for this story', () => { enabled ? A.disable() : A.enable(); refreshPanel(); }, { block: true, variant: enabled ? 'on' : null, style: 'margin-bottom:10px' }));

        // ---- state slots (base / working) ----
        const slot = A.activeSlot || 'working';
        const slotBox = el('div', { class: 'rpm-card', style: 'margin-bottom:6px' });
        slotBox.appendChild(row([
            el('span', { class: 'rpm-muted rpm-grow', text: 'State slot' }),
            el('span', { class: 'rpm-chip ' + (slot === 'working' ? 'rpm-chip-info' : 'rpm-chip-quest'), text: slot === 'working' ? 'WORKING (live)' : 'BASE (start)' })
        ], 'margin-bottom:6px'));
        slotBox.appendChild(row([
            uiBtn('Reset', () => { if (confirm('Reset the working state to the base (start) state? Live changes are lost.')) { A.resetToBase(); refreshPanel(); } }, { icon: 'rotate-ccw', grow: true, title: 'Discard live changes, back to the start state' }),
            uiBtn('Commit', () => { if (confirm('Set the current working state as the new base (start)?')) { A.commitToBase(); refreshPanel(); } }, { icon: 'check', grow: true, title: 'Make the current live state the new start state' }),
            uiBtn('Swap', () => { A.swapActive(); refreshPanel(); }, { icon: 'arrow-left-right', grow: true, title: 'Switch which slot is active' })
        ]));
        box.appendChild(slotBox);

        // ---- location ----
        const g = A.getGraph();
        const locs = g.nodes.filter(n => n.type === 'location');
        box.appendChild(lbl('Current location'));
        if (locs.length) {
            const msel = uiSelect({ 'aria-label': 'Current location' });
            msel.appendChild(el('option', { value: '', text: '— nowhere —' }));
            for (const l of locs) { const o = el('option', { value: l.id, text: l.name }); if (A.runtime && A.runtime.playerLocationId === l.id) o.selected = true; msel.appendChild(o); }
            msel.addEventListener('change', () => { try { if (msel.value) A.moveTo(msel.value); refreshPanel(); } catch (_) {} });
            box.appendChild(msel);
        } else box.appendChild(muted('No locations yet — add some in the editor.'));

        // ---- time / weather ----
        const c = (A.runtime && A.runtime.clock) || {};
        box.appendChild(lbl('Time & weather'));
        const tsel = uiSelect({ class: 'form-control rpm-input rpm-grow', 'aria-label': 'Time of day' });
        for (const t of TIME_SLOTS_UI) { const o = el('option', { value: t, text: t }); if ((c.time || '') === t) o.selected = true; tsel.appendChild(o); }
        tsel.addEventListener('change', () => { A.setClock({ time: tsel.value }); refreshPanel(); });
        box.appendChild(row([tsel, uiBtn('⏭', () => { A.advanceClock(1); refreshPanel(); }, { title: 'Advance time one step' })]));
        box.appendChild(muted(`Day ${c.day || 1}, month ${c.month || 1} · ${c.season || ''}`, { style: 'margin:4px 0' }));
        const wIn = uiInput({ value: c.weather || '', placeholder: 'weather', 'aria-label': 'Weather' });
        wIn.addEventListener('change', () => { A.setClock({ weather: wIn.value }); });
        box.appendChild(wIn);

        // ---- flags ----
        box.appendChild(lbl('Flags'));
        const flags = (A.runtime && A.runtime.flags) || {};
        const fkeys = Object.keys(flags);
        if (!fkeys.length) box.appendChild(muted('none'));
        for (const k of fkeys) {
            box.appendChild(el('div', { class: 'rpm-card rpm-row' }, [
                el('span', { class: 'rpm-grow' }, [k + ' = ', el('span', { style: 'color:var(--rpm-fg-hi)', text: String(flags[k]) })]),
                el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove flag', 'aria-label': 'Remove flag ' + k, style: 'color:var(--rpm-danger)', text: '×', onclick: () => { A.unsetFlag(k); refreshPanel(); } })
            ]));
        }
        const fk = uiInput({ placeholder: 'key', class: 'form-control rpm-input rpm-grow', 'aria-label': 'Flag name' });
        const fv = uiInput({ placeholder: 'value', class: 'form-control rpm-input rpm-grow', 'aria-label': 'Flag value' });
        box.appendChild(row([fk, fv, uiBtn('', () => { const k = fk.value.trim(); if (!k) return; A.setFlag(k, parseVal(fv.value)); refreshPanel(); }, { icon: 'plus', title: 'Set flag' })], 'margin-top:5px'));

        // ---- inventory ----
        box.appendChild(lbl('Inventory'));
        const inv = (A.runtime && A.runtime.inventory) || [];
        if (!inv.length) box.appendChild(muted('empty'));
        for (const it of inv) {
            box.appendChild(el('div', { class: 'rpm-card rpm-row' }, [
                el('span', { class: 'rpm-grow', text: it.name + (it.qty > 1 ? ` ×${it.qty}` : '') }),
                el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Add one', 'aria-label': 'Add one ' + it.name, style: 'color:var(--rpm-success)', onclick: () => { A.giveItem(it.name, 1); refreshPanel(); } }, [icon('plus', 14)]),
                el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove one', 'aria-label': 'Remove one ' + it.name, style: 'color:var(--rpm-danger)', text: '−', onclick: () => { A.takeItem(it.name, 1); refreshPanel(); } })
            ]));
        }
        const iIn = uiInput({ placeholder: 'item name', class: 'form-control rpm-input rpm-grow', 'aria-label': 'Item name' });
        box.appendChild(row([iIn, uiBtn('', () => { const n = iIn.value.trim(); if (!n) return; A.giveItem(n, 1); refreshPanel(); }, { icon: 'plus', title: 'Give item' })], 'margin-top:5px'));

        // ---- what the AI sees ----
        box.appendChild(uiBtn('Preview what the AI sees', () => showPreview(), { icon: 'eye', block: true, style: 'margin-top:12px' }));
    }
    function parseVal(raw) { const v = String(raw || '').trim(); if (v === '') return true; if (/^(true|false)$/i.test(v)) return /true/i.test(v); if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v); return v; }

    // =======================================================================
    //  INIT — register views with the app shell
    // =======================================================================
    function registerViews(sh) {
        const view = (render) => ({ mount: render, update: (c) => { clear(c); render(c); } });
        sh.registerView({ id: 'world', title: 'World', place: 'right', order: 10, mount: mountPanel, update: () => renderPanel() });
        sh.registerView(Object.assign({ id: 'party', title: 'Party', place: 'left', order: 10 }, view(renderParty)));
        sh.registerView(Object.assign({ id: 'quest-tracker', title: 'Quests', place: 'left', order: 20 }, view(renderQuestTracker)));
        sh.registerView(Object.assign({ id: 'questlog', title: 'Quest log', place: 'window', window: { width: 380, height: 520 } }, view((c) => {
            if (API().activeWorld()) renderQuestsTab(c); else c.appendChild(el('div', { class: 'rpm-muted', text: 'No world loaded.' }));
        })));
        sh.registerView(Object.assign({ id: 'combat', title: 'Combat', place: 'window', window: { width: 360, height: 560 } }, view((c) => {
            if (API().activeWorld()) renderCombatTab(c); else c.appendChild(el('div', { class: 'rpm-muted', text: 'No world loaded.' }));
        })));
        // not restored at startup: the world library loads asynchronously
        sh.registerView({ id: 'editor', title: 'World editor', place: 'window', window: { large: true, flush: true, minWidth: 320, minHeight: 300, restore: false },
            mount: mountEditor, unmount: unmountEditor, beforeClose: editorBeforeClose });
    }

    function init() {
        const sh = Shell();
        // expose openers on the engine API for convenience
        try { window.KLITE_RPMod_Worlds.openEditor = openEditor; window.KLITE_RPMod_Worlds.showPanel = () => sh.open('world'); } catch (_) {}
        registerViews(sh);
        // engine state changed (chat tags, triggers, API calls) -> re-render, but never
        // under the user's cursor while they type
        window.addEventListener('klite:worlds-change', () => { try { refreshPanel({ soft: true }); } catch (_) {} });
        // the persona or its sheet changed -> the Party section shows its name, HP and AC
        const refreshParty = () => { try { sh.refresh(['party'], { soft: true }); } catch (_) {} };
        window.addEventListener('klite:persona-change', refreshParty);
        window.addEventListener('klite:sheet-change', refreshParty);
        window.addEventListener('klite:worlds-dirty', () => { try { updateSaveState(); refreshPanel({ soft: true }); } catch (_) {} });
    }

    function whenReady() {
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            const engineReady = window.KLITE_RPMod_Worlds && typeof window.KLITE_RPMod_Worlds.getGraph === 'function';
            if (engineReady && window.KLITE_RPMod_Shell) { clearInterval(timer); try { init(); } catch (e) { console.error('[WorldsUI]', e); } }
            else if (tries > 300) clearInterval(timer);
        }, 100);
    }

    window.KLITE_RPMod_WorldsUI = { openEditor, closeEditor, refreshPanel };
    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady);
}
