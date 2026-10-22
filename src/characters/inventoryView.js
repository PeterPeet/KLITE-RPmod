// =============================================================================
// KLITE RPmod — Inventory screen (R9): paper doll, bag grids, Diablo-style packing
// -----------------------------------------------------------------------------
// The sheet's Inventory tab. Items take tiles by their SRD weight (src/game/inventory-rules.js
// has every rule; this file only draws and forwards what the player does):
//   - click an item to pick it up, then click a free spot, a slot, a bag or "Remove";
//     or drag it there (mouse and touch). R or the button turns it, Escape puts it back.
//   - a bag (worn or packed) opens as its own grid; the Overweight bag is what is dragged along.
// Changes go through `opts.apply(mutate, note)`: `mutate(sheet)` finds items by id, so it can be
// applied to the draft and the stored sheet alike (characters.js saves them at once, like a game
// change). Built with createElement/textContent only — item names are untrusted.
// =============================================================================
import { el, icon } from '../shell/dom.js';
import * as IR from '../game/inventory-rules.js';
import * as EQ from './equipment-rules.js';

const KIND_ICON = { weapon: 'sword', ranged: 'bow-arrow', armor: 'shirt', shield: 'shield', ammo: 'move-up', potion: 'flask-conical', bag: 'backpack', gear: 'package' };
const KIND_NAME = { weapon: 'Melee weapon', ranged: 'Ranged weapon', armor: 'Armor', shield: 'Shield', ammo: 'Ammunition', potion: 'Potion', bag: 'Bag', gear: 'Item' };
const lb = (n) => (Math.round(n * 10) / 10) + ' lb';
function hideTip() { for (const t of document.querySelectorAll('.rpm-inv-tip')) t.remove(); }
const DOLL = [
    ['Hands', ['main', 'off']],
    ['Body', ['armor', 'back', 'slung', 'slungShield']],
    ['Belt', ['belt1', 'belt2', 'sheath1', 'sheath2']],
    ['Straps on the pack', ['strap1', 'strap2']],
];

// opts: { sheet, state: { sel, drag }, apply(mutate, note), toast(msg, isError), openRef(ref), drop(item) → '' | reason }
export function inventoryView(opts) {
    const s = opts.sheet, st = opts.state;
    const inv = s.inventory;
    const byId = (id) => inv.find(i => i.id === id) || null;
    const sel = st.sel ? byId(st.sel) : null;
    if (st.sel && !sel) st.sel = null;
    const root = el('div', { class: 'rpm-inv' + (sel ? ' rpm-inv-holding' : ''), 'data-inv': '1' });

    // ---- what the player does ---------------------------------------------------------------
    function act(mutate, note) { opts.apply(mutate, note); }
    function pick(it) { st.sel = st.sel === it.id ? null : it.id; opts.apply(null); }
    // put the picked item to `target` ({ bag, x, y, rot } or { slot }); tells why not
    function putTo(target, item) {
        const it = item || sel; if (!it) return;
        const why = IR.canPlace(s, it, target);
        if (why) { opts.toast(`${it.name}: ${why}.`, true); return; }
        const id = it.id;
        st.sel = null;
        act((sh) => { const x = sh.inventory.find(i => i.id === id); if (x && !IR.canPlace(sh, x, target)) IR.place(sh, x, target); },
            target.slot ? `${it.name}: ${IR.SLOT_NAMES[target.slot]}` : `${it.name} packed`);
    }
    function intoBag(bag, item) {
        const it = item || sel; if (!it || it === bag) return;
        const t = IR.spotIn(s, it, bag.id);
        if (!t) { opts.toast(`${it.name}: no room in the ${bag.name}` + (IR.canPlace(s, it, { bag: bag.id, x: 0, y: 0 }).startsWith('too heavy') ? ' (too heavy)' : '') + '.', true); return; }
        putTo(t, it);
    }
    // in a bag: turned in place when it fits there; elsewhere the turn is kept for the next drop
    function rotate() {
        if (!sel) return;
        const id = sel.id, at = sel.at;
        if (at && at.bag) {
            const t = { bag: at.bag, x: at.x, y: at.y, rot: !sel.rot };
            const why = IR.canPlace(s, sel, t);
            if (why) { opts.toast(`No room to turn the ${sel.name} here (${why}).`, true); return; }
            act((sh) => { const x = sh.inventory.find(i => i.id === id); if (x) IR.place(sh, x, t); });
            return;
        }
        act((sh) => { const x = sh.inventory.find(i => i.id === id); if (!x) return; if (x.rot) delete x.rot; else x.rot = true; });
    }

    // ---- carried weight -------------------------------------------------------------------
    const c = IR.carried(s);
    root.appendChild(el('div', { class: 'rpm-inv-carry', 'data-carry': c.slowed ? 'slowed' : 'ok', title: `You carry up to Str × 15 = ${c.capacity} lb; up to ${c.limit} lb you can only drag (Speed at most 5 ft).` }, [
        icon('weight', 14),
        el('span', { class: 'rpm-grow', text: `${lb(c.total)} of ${c.capacity} lb` + (c.coins >= 0.1 ? ` (coins ${lb(c.coins)})` : '') }),
        el('span', { class: 'rpm-inv-bar', 'aria-hidden': 'true' }, [el('span', { style: `width:${Math.min(100, Math.round(c.total / c.capacity * 100))}%` })]),
    ]));
    if (c.slowed) root.appendChild(el('div', { class: 'rpm-inv-warn', role: 'status', text: IR.load(s, IR.OVER) > 0
        ? 'You drag things along (Overweight): Speed at most 5 ft. Pack, drop or sell something.'
        : `More than ${c.capacity} lb: Speed at most 5 ft.` }));

    const main = el('div', { class: 'rpm-inv-main' });
    root.appendChild(main);

    // ---- paper doll ---------------------------------------------------------------------------
    const doll = el('div', { class: 'rpm-inv-doll', 'aria-label': 'Carried on the body' });
    const back = inv.find(i => i.at && i.at.slot === 'back');
    for (const [title, slots] of DOLL) {
        if (title === 'Straps on the pack' && !(back && /^(backpack|handy haversack)$/i.test(back.name))) continue;
        doll.appendChild(el('div', { class: 'rpm-label', text: title }));
        doll.appendChild(el('div', { class: 'rpm-inv-slots' }, slots.map(slotCell)));
    }
    main.appendChild(doll);

    function slotCell(slot) {
        const it = inv.find(i => i.at && i.at.slot === slot);
        const main = inv.find(i => i.at && i.at.slot === 'main');
        const both = slot === 'off' && !it && main && /Two-Handed/.test((EQ.weaponOf(main.name) || {}).properties || '');
        const label = both ? `Off hand — ${main.name} needs both` : IR.SLOT_NAMES[slot];
        const cell = el('button', { type: 'button', class: 'rpm-inv-slot' + (it ? ' rpm-full' : '') + (it && it === sel ? ' rpm-sel' : ''), 'data-slot': slot, 'data-id': it ? it.id : null,
            'data-kind': it ? IR.iconKind(it) : null, title: it ? `${it.name} — ${label}` : `${label} (empty)`,
            'aria-label': it ? `${label}: ${it.name}` : `${label}, empty`,
            onclick: () => {
                if (sel && it && it !== sel && IR.isBag(it)) return intoBag(it);
                if (sel && !it) return putTo({ slot });
                if (it) { if (st.sel !== it.id) st.sel = null; pick(it); }   // an occupied slot: pick what is in it
            } }, it ? [icon(KIND_ICON[IR.iconKind(it)], 16), el('span', { class: 'rpm-inv-name', text: it.name + (it.qty > 1 ? ' ×' + it.qty : '') }), el('span', { class: 'rpm-inv-where', text: label })]
            : [el('span', { class: 'rpm-inv-where', text: label })]);
        if (it) dragSource(cell, it, 0, 0);
        return cell;
    }

    // ---- bags ---------------------------------------------------------------------------------
    const bags = el('div', { class: 'rpm-inv-bags' });
    main.appendChild(bags);
    const ids = [...IR.bagOrder(s), IR.POCKETS];
    if (IR.contents(s, IR.OVER).length || sel) ids.push(IR.OVER);
    for (const id of ids) bags.appendChild(bagBox(id));

    function bagBox(id) {
        const spec = IR.specOf(s, id), bag = byId(id);
        const title = id === IR.OVER ? 'Overweight — dragged along' : id === IR.POCKETS ? 'Pockets' : bag.name;
        const parent = bag && bag.at && bag.at.bag ? byId(bag.at.bag) : null;
        const box = el('div', { class: 'rpm-inv-bag', 'data-bag': id });
        box.appendChild(el('div', { class: 'rpm-inv-bag-h' }, [
            icon(id === IR.OVER ? 'weight' : 'backpack', 14),
            el('span', { class: 'rpm-grow', text: title + (parent ? ` (in the ${parent.name})` : '') }),
            el('span', { class: 'rpm-muted', text: `${lb(IR.load(s, id))} / ${spec.cap} lb` }),
        ]));
        const grid = el('div', { class: 'rpm-inv-grid', 'data-grid': id, role: 'grid', 'aria-label': title,
            style: `--cols:${spec.cols};--rows:${spec.rows}` });
        grid.addEventListener('click', (e) => {
            if (!sel || e.target.closest('.rpm-inv-item')) return;
            const p = cellAt(grid, e.clientX, e.clientY, spec); if (!p) return;
            putTo({ bag: id, x: p.x, y: p.y, rot: !!sel.rot });
        });
        grid.addEventListener('pointermove', (e) => preview(grid, id, spec, e));
        grid.addEventListener('pointerleave', () => { const g = grid.querySelector('.rpm-inv-ghost'); if (g) g.remove(); });
        for (const it of IR.contents(s, id)) grid.appendChild(tile(it));
        box.appendChild(el('div', { class: 'rpm-inv-gridwrap' }, [grid]));
        return box;
    }
    function tile(it) {
        const [w, h] = IR.footprint(it), kind = IR.iconKind(it);
        const t = el('button', { type: 'button', class: 'rpm-inv-item' + (it === sel ? ' rpm-sel' : ''), 'data-item': it.name, 'data-id': it.id, 'data-kind': kind,
            style: `--x:${it.at.x};--y:${it.at.y};--w:${w};--h:${h}`,
            'aria-label': `${it.name}${it.qty > 1 ? ', ' + it.qty : ''}`,
            onclick: (e) => {
                e.stopPropagation();
                if (sel && it !== sel && IR.isBag(it)) return intoBag(it);
                if (sel && it !== sel) {   // onto another item: drop there if it fits, else pick that one
                    const grid = t.closest('[data-grid]'); const spec = IR.specOf(s, grid.getAttribute('data-grid'));
                    const p = cellAt(grid, e.clientX, e.clientY, spec);
                    if (p && !IR.canPlace(s, sel, { bag: grid.getAttribute('data-grid'), x: p.x, y: p.y, rot: !!sel.rot })) return putTo({ bag: grid.getAttribute('data-grid'), x: p.x, y: p.y, rot: !!sel.rot });
                }
                pick(it);
            } }, [
                // one row high (owner): the name only, no icon; the colour still tells the kind
                h > 1 ? icon(KIND_ICON[kind], 16) : null,
                el('span', { class: 'rpm-inv-name rpm-inv-two' + (h === 1 || w === 1 ? ' rpm-inv-small' : ''), text: it.name }),   // two lines for every item (owner)
                it.qty > 1 ? el('span', { class: 'rpm-inv-qty', text: String(it.qty) }) : null]);
        tip(t, it);
        dragSource(t, it, w, h);
        return t;
    }
    // UI play test 2026-10-22: a one-tile item could not be read. An instant tooltip on hover and keyboard
    // focus (name, quantity, weight, where), fixed above the item so the grid's edge does not cut it.
    function tip(node, it) {
        const where = () => it.at ? (it.at.slot ? IR.SLOT_NAMES[it.at.slot] : it.at.bag === IR.OVER ? 'Overweight' : it.at.bag === IR.POCKETS ? 'Pockets' : (byId(it.at.bag) || {}).name || '') : 'not packed';
        const text = () => `${it.name}${it.qty > 1 ? ' ×' + it.qty : ''} · ${lb(IR.totalWeight(s, it))}${IR.unitWeight(it).guess ? ' (a guess)' : ''} · ${where()}`;
        const show = () => {
            if (st.drag) return;
            hideTip();
            const r = node.getBoundingClientRect();
            const t = el('div', { class: 'rpm-themed rpm-inv-tip', role: 'tooltip', text: text() });
            document.body.appendChild(t);
            const tw = t.offsetWidth || 120, th = t.offsetHeight || 20;
            const x = Math.max(4, Math.min(window.innerWidth - tw - 4, r.left + r.width / 2 - tw / 2));
            const y = r.top - th - 6 >= 4 ? r.top - th - 6 : r.bottom + 6;
            t.style.left = x + 'px'; t.style.top = y + 'px';
        };
        node.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') show(); });
        node.addEventListener('pointerleave', hideTip);
        node.addEventListener('focus', show);
        node.addEventListener('blur', hideTip);
        node.addEventListener('pointerdown', hideTip);
    }
    function cellAt(grid, cx, cy, spec) {
        const r = grid.getBoundingClientRect(); if (!r.width) return null;
        const x = Math.floor((cx - r.left) / (r.width / spec.cols)), y = Math.floor((cy - r.top) / (r.height / spec.rows));
        return x >= 0 && y >= 0 && x < spec.cols && y < spec.rows ? { x, y } : null;
    }
    // while holding an item: its footprint under the pointer, green when it fits, red when not
    function preview(grid, id, spec, e) {
        if (!sel) return;
        const p = cellAt(grid, e.clientX, e.clientY, spec); let g = grid.querySelector('.rpm-inv-ghost');
        if (!p) { if (g) g.remove(); return; }
        const dx = st.drag ? st.drag.gx : 0, dy = st.drag ? st.drag.gy : 0;
        const x = p.x - dx, y = p.y - dy, [w, h] = IR.footprint(sel);
        const ok = !IR.canPlace(s, sel, { bag: id, x, y, rot: !!sel.rot });
        if (!g) { g = el('div', { class: 'rpm-inv-ghost', 'aria-hidden': 'true' }); grid.appendChild(g); }
        g.style.cssText = `--x:${x};--y:${y};--w:${w};--h:${h}`;
        g.setAttribute('data-ok', ok ? '1' : '0');
    }

    // ---- drag and drop (pointer events: mouse, pen, touch) -------------------------------------
    function dragSource(node, it, w, h) {
        node.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const r = node.getBoundingClientRect();
            const gx = w ? Math.min(w - 1, Math.floor((e.clientX - r.left) / (r.width / w))) : 0;
            const gy = h ? Math.min(h - 1, Math.floor((e.clientY - r.top) / (r.height / h))) : 0;
            const start = { x: e.clientX, y: e.clientY }; let moving = false, ghost = null;
            const move = (ev) => {
                if (!moving && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
                if (!moving) {
                    moving = true; st.drag = { gx, gy };
                    if (st.sel !== it.id) { st.sel = it.id; }
                    ghost = el('div', { class: 'rpm-inv-dragghost', 'data-kind': IR.iconKind(it), 'aria-hidden': 'true' }, [icon(KIND_ICON[IR.iconKind(it)], 16), el('span', { text: it.name })]);
                    document.body.appendChild(ghost);
                    root.classList.add('rpm-inv-holding');
                }
                ghost.style.left = ev.clientX + 8 + 'px'; ghost.style.top = ev.clientY + 8 + 'px';
                const over = document.elementFromPoint(ev.clientX, ev.clientY);
                const grid = over && over.closest && over.closest('[data-grid]');
                if (grid) preview(grid, grid.getAttribute('data-grid'), IR.specOf(s, grid.getAttribute('data-grid')), ev);
            };
            const up = (ev) => {
                document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
                if (ghost) ghost.remove();
                if (!moving) return;   // a click: the click handler picks it
                node.addEventListener('click', (c) => { c.stopPropagation(); c.preventDefault(); }, { once: true, capture: true });
                const drag = st.drag; st.drag = null;
                const over = document.elementFromPoint(ev.clientX, ev.clientY);
                dropOn(over, ev, drag, it);
            };
            document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
        });
    }
    function dropOn(over, ev, drag, it) {
        const held = byId(it.id); if (!held || !over || !over.closest) { opts.apply(null); return; }
        const slot = over.closest('[data-slot]'), grid = over.closest('[data-grid]'), tileEl = over.closest('.rpm-inv-item'), remove = over.closest('[data-inv-remove]');
        const target = (() => {
            if (remove) return 'remove';
            if (slot) {
                const occ = inv.find(i => i.at && i.at.slot === slot.getAttribute('data-slot'));
                if (occ && occ !== held && IR.isBag(occ)) return { bagOf: occ };
                return { slot: slot.getAttribute('data-slot') };
            }
            if (grid) {
                const id = grid.getAttribute('data-grid'), spec = IR.specOf(s, id), p = cellAt(grid, ev.clientX, ev.clientY, spec);
                const occ = tileEl ? byId(tileEl.getAttribute('data-id')) : null;
                const t = p ? { bag: id, x: p.x - drag.gx, y: p.y - drag.gy, rot: !!held.rot } : null;
                if (t && !IR.canPlace(s, held, t)) return t;
                if (occ && occ !== held && IR.isBag(occ)) return { bagOf: occ };
                return t;
            }
            return null;
        })();
        st.sel = held.id;
        if (target === 'remove') return removeItem(held);
        if (!target) { st.sel = null; opts.apply(null); return; }
        if (target.bagOf) return intoBag(target.bagOf, held);
        putTo(target, held);
    }

    // ---- not packed ---------------------------------------------------------------------------
    const loose = IR.unpacked(s).filter(i => !i.inHand);
    if (loose.length) {
        root.appendChild(el('div', { class: 'rpm-inv-loose', 'data-inv-loose': '1' }, [
            el('div', { class: 'rpm-label', text: 'Not packed — no room and too heavy to drag. Make room, then pick it and put it somewhere, or remove it.' }),
            el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, loose.map(it => {
                const b = el('button', { type: 'button', class: 'rpm-inv-chip' + (it === sel ? ' rpm-sel' : ''), 'data-item': it.name, 'data-id': it.id, 'data-kind': IR.iconKind(it), onclick: () => pick(it) },
                    [icon(KIND_ICON[IR.iconKind(it)], 14), el('span', { text: it.name + (it.qty > 1 ? ' ×' + it.qty : '') })]);
                dragSource(b, it, 0, 0);
                return b;
            })),
        ]));
    }

    // ---- the picked item -------------------------------------------------------------------------
    root.appendChild(sel ? details(sel) : el('div', { class: 'rpm-muted rpm-inv-hint', text: 'Click an item to pick it up, then click where it goes — or drag it. R turns it, Esc puts it back.' }));

    function removeItem(it) {
        if (!confirm(`Remove ${it.name}${it.qty > 1 ? ' ×' + it.qty : ''} from the inventory?`)) { opts.apply(null); return; }
        const id = it.id; st.sel = null;
        act((sh) => { const x = sh.inventory.find(i => i.id === id); if (x) IR.removeItem(sh, x); }, `${it.name} removed`);
    }
    function details(it) {
        const info = EQ.itemInfo(it.name), w = IR.unitWeight(it), kind = IR.iconKind(it), id = it.id;
        const where = it.at ? (it.at.slot ? IR.SLOT_NAMES[it.at.slot] : it.at.bag === IR.OVER ? 'Overweight' : it.at.bag === IR.POCKETS ? 'Pockets' : (byId(it.at.bag) || {}).name) : 'not packed';
        const setField = (mutate) => act((sh) => { const x = sh.inventory.find(i => i.id === id); if (x) mutate(x, sh); });
        const input = (value, onChange, props) => {
            const i = el('input', Object.assign({ class: 'form-control rpm-input fullScreenTextEditExclude' }, props)); i.value = value == null ? '' : value;
            i.addEventListener('change', () => onChange(i.value)); return i;
        };
        const box = el('div', { class: 'rpm-inv-details', 'data-inv-details': it.name }, [
            el('div', { class: 'rpm-row' }, [icon(KIND_ICON[kind], 16), el('strong', { class: 'rpm-grow', text: it.name }),
                el('span', { class: 'rpm-muted', text: `${KIND_NAME[kind]} · ${where} · ${lb(IR.totalWeight(s, it))}` })]),
            info ? el('div', { class: 'rpm-muted', text: info.summary }) : null,
            el('div', { class: 'rpm-inv-fields' }, [
                el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Name' }),
                    input(it.name, (v) => { v = v.trim(); if (v) setField(x => { x.name = v; }); }, { type: 'text', 'aria-label': 'Item name', list: 'rpm-sheet-items', autocomplete: 'off' })]),
                el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Quantity' }),
                    input(it.qty, (v) => setField(x => { x.qty = Math.max(1, Math.trunc(Number(v) || 1)); }), { type: 'number', min: 1, inputmode: 'numeric', 'aria-label': 'Quantity' })]),
                el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: w.guess ? 'Weight (lb each, a guess)' : 'Weight (lb each)' }),
                    input(it.weight != null ? it.weight : '', (v) => setField(x => { const n = Number(v); if (v === '' || !Number.isFinite(n) || n < 0) delete x.weight; else x.weight = n; }),
                        { type: 'number', min: 0, step: '0.1', placeholder: String(Math.round(w.w * 100) / 100), 'aria-label': 'Weight per piece in pounds' })]),
            ]),
            input(it.notes, (v) => setField(x => { x.notes = v; }), { type: 'text', placeholder: 'Notes', 'aria-label': 'Notes' }),
            el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, [
                button('rotate-cw', 'Turn (R)', rotate, 'Turn it by 90°'),
                it.qty > 1 ? button('split', 'Split', () => {
                    const n = Math.floor(it.qty / 2);
                    act((sh) => { const x = sh.inventory.find(i => i.id === id); if (x) IR.splitStack(sh, x, n); }, `${n} split off`);
                }, 'Split the stack in half') : null,
                kind !== 'bag' && !it.inHand ? button('hand', kind === 'armor' ? 'Put on' : 'Take in hand', () => {
                    const copy = JSON.parse(JSON.stringify(s)), why = IR.takeInHand(copy, copy.inventory.find(i => i.id === id));
                    if (why) { opts.toast(`${it.name}: ${why}.`, true); return; }
                    st.sel = null; setField((x, sh) => { IR.takeInHand(sh, x); });
                }, kind === 'armor' ? 'Wear it' : 'Hold it in a free hand') : null,
                it.inHand ? button('backpack', 'Put away', () => { st.sel = null; setField((x, sh) => { IR.stow(sh, x); }); }, 'A sheath or the back for weapons, else a bag') : null,
                opts.drop ? button('arrow-down-to-line', 'Drop', () => {
                    const why = opts.drop(it); if (why) { opts.toast(`${it.name}: ${why}.`, true); return; }
                    st.sel = null; opts.apply(null);
                }, 'Put it down here: it stays in this place, you can pick it up again') : null,
                el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-danger', 'data-inv-remove': '1', title: 'Remove it from the inventory (or drop it here)', onclick: () => removeItem(it) }, [icon('trash-2', 14), el('span', { text: 'Remove' })]),
                info && info.ref && opts.openRef ? button('book-marked', 'Compendium', () => opts.openRef(info.ref), 'Open the SRD entry') : null,
                button('x', 'Put back', () => { st.sel = null; opts.apply(null); }, 'Put it back where it was (Esc)'),
            ]),
        ]);
        return box;
    }
    function button(ic, text, onclick, title) {
        return el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon', title, onclick }, [icon(ic, 14), el('span', { text })]);
    }

    hideTip();   // a redraw removes the tooltip of the item it replaced
    // keyboard: R turns, Esc puts back (only while this view is in the page)
    root.addEventListener('keydown', (e) => {
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if ((e.key === 'r' || e.key === 'R') && sel) { e.preventDefault(); rotate(); }
        else if (e.key === 'Escape' && sel) { e.preventDefault(); e.stopPropagation(); st.sel = null; opts.apply(null); }
    });
    return root;
}
