// =============================================================================
// KLITE RPmod — Compendium window (R3): search and read the SRD 5.2.1 — monsters, spells,
// magic items, equipment and the rules glossary; add a monster to an encounter.
// -----------------------------------------------------------------------------
// A large shell window "compendium": search box, kind chips and the result list on the left,
// the entry on the right (one column with a Back button in a narrow window or on a phone).
// Opened from the right dock (book icon) and cross-linked from the character sheet (spells),
// the Combat window and the encounter inspector (monsters): KLITE_RPMod_Compendium.open().
// Data is bundled (src/compendium/rules.js); everything is built with textContent.
// SRD 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0: the exact attribution is shown in the window.
// =============================================================================
import { el, clear, iconText } from '../shell/dom.js';
import * as CP from './rules.js';

export default function initCompendium() {
    if (window.KLITE_RPMod_Compendium) return;
    const V = { box: null, q: '', kind: '', sel: null, msg: '' };
    const Shell = () => window.KLITE_RPMod_Shell;
    const Worlds = () => window.KLITE_RPMod_Worlds;

    const btn = (text, onclick, opts = {}) => el('button', { type: 'button', class: 'btn btn-primary rpm-btn' + (opts.icon ? ' rpm-btn-icon' : '') + (opts.cls ? ' ' + opts.cls : ''), 'data-cmp': opts.id, title: opts.title, onclick }, opts.icon ? [iconText(opts.icon, text)] : [text]);
    const para = (t) => el('p', { class: 'rpm-cmp-p', text: t });
    const line = (label, value) => (value == null || value === '' ? null : el('div', { class: 'rpm-cmp-line' }, [el('strong', { text: label + ' ' }), String(value)]));
    // "Name. Text" paragraphs (monster traits/actions, feature-like SRD text)
    const named = (list) => (Array.isArray(list) ? list : []).map(a => el('p', { class: 'rpm-cmp-p' }, [el('strong', { text: a.name + '. ' }), a.text || '']));
    const section = (title, kids) => (kids && kids.length ? [el('div', { class: 'rpm-cmp-sec', text: title }), ...kids] : []);

    // ---- detail renderers ---------------------------------------------------------------
    function monsterDetail(e) {
        const m = e.data;
        const abil = el('div', { class: 'rpm-cmp-abil' }, ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(a => el('div', {}, [
            el('div', { class: 'rpm-muted', text: a.toUpperCase() }), el('strong', { text: String(m.abilities[a]) }),
            el('div', { class: 'rpm-muted', text: CP.signed(CP.abilityMod(m.abilities[a])) + (m.saves && m.saves[a] != null ? ` · save ${CP.signed(m.saves[a])}` : '') }),
        ])));
        return [
            el('div', { class: 'rpm-muted', text: m.type }),
            el('div', { class: 'rpm-cmp-stats' }, [line('AC', m.ac), line('HP', `${m.hp}${m.hitDice ? ` (${m.hitDice})` : ''}`), line('Speed', m.speed), line('Initiative', CP.signed(m.initiative || 0))]),
            abil,
            line('Skills', m.skills), line('Vulnerabilities', m.vulnerabilities), line('Resistances', m.resistances), line('Immunities', m.immunities),
            line('Senses', m.senses), line('Languages', m.languages), line('CR', `${m.cr} (XP ${m.xp}; PB ${CP.signed(m.pb || 2)})`),
            ...section('Traits', named(m.traits)), ...section('Actions', named(m.actions)), ...section('Bonus Actions', named(m.bonusActions)),
            ...section('Reactions', named(m.reactions)), ...section('Legendary Actions', named(m.legendary)),
            encounterBox(e.key),
        ];
    }
    // "Add to encounter" (a saved encounter of the active world, or a new one) and "Fight it now"
    function encounterBox(key) {
        const A = Worlds(); const box = el('div', { class: 'rpm-card rpm-cmp-enc', 'data-cmp': 'encounter-box' });
        if (!A || !A.activeWorld || !A.activeWorld()) { box.appendChild(el('div', { class: 'rpm-muted', text: 'Load a world (World tab) to add this monster to its encounters.' })); return box; }
        const encs = A.listEncounters();
        const s = el('select', { class: 'form-control rpm-input rpm-grow', 'aria-label': 'Encounter', 'data-cmp': 'encounter' });
        s.appendChild(el('option', { value: '', text: 'New encounter' }));
        for (const en of encs) s.appendChild(el('option', { value: en.id, text: en.name }));
        box.appendChild(el('div', { class: 'rpm-label', style: 'margin-top:0', text: 'Encounters of this world' }));
        box.appendChild(el('div', { class: 'rpm-row' }, [s, btn('Add', () => {
            const cur = encs.find(x => x.id === s.value);
            const name = CP.entry('monster', key).name;
            const mons = cur ? cur.monsters.map(m => Object.assign({}, m)) : [];
            const hit = mons.find(m => m.key === key); if (hit) hit.count = Math.min(20, hit.count + 1); else mons.push({ key, count: 1 });
            const saved = A.saveEncounter(Object.assign({}, cur || { name: `${name} encounter` }, { monsters: mons }));
            V.msg = saved ? `Added to "${saved.name}" (${mons.map(m => `${m.count} × ${CP.entry('monster', m.key).name}`).join(', ')}).` : 'Could not save the encounter.';
            render();
        }, { id: 'add-to-encounter', icon: 'plus' })]));
        const fighting = A.getCombat && A.getCombat() && A.getCombat().active && !A.getCombat().outcome;
        box.appendChild(btn('Fight it now', () => { A.startEncounter([], { monsters: [{ key, count: 1 }] }); try { Shell().open('combat'); } catch (_) {} }, { id: 'fight-now', icon: 'swords', cls: 'rpm-block rpm-mt' }));
        if (fighting) box.lastChild.disabled = true;
        if (V.msg) box.appendChild(el('div', { class: 'rpm-muted rpm-mt', 'data-cmp': 'msg', text: V.msg }));
        return box;
    }
    function spellDetail(e) {
        const s = e.data;
        const comps = s.components.join(', ') + (s.material ? ` (${s.material})` : '');
        return [
            el('div', { class: 'rpm-muted', text: `${CP.levelSchool(s)}${s.ritual ? ' (ritual)' : ''} · ${s.classes.map(c => c[0].toUpperCase() + c.slice(1)).join(', ')}` }),
            el('div', { class: 'rpm-cmp-stats' }, [line('Casting Time', s.castingTime), line('Range', s.range), line('Components', comps), line('Duration', s.duration)]),
            ...s.text.map(para),
            s.higher ? el('p', { class: 'rpm-cmp-p' }, [el('strong', { text: 'Using a Higher-Level Spell Slot. ' }), s.higher]) : null,
            s.upgrade ? el('p', { class: 'rpm-cmp-p' }, [el('strong', { text: 'Cantrip Upgrade. ' }), s.upgrade]) : null,
        ];
    }
    function itemDetail(e) {
        const d = e.data;
        return [el('div', { class: 'rpm-muted', text: d.type }), ...d.text.map(para)];
    }
    function equipmentDetail(e) {
        const d = e.data;
        if (d.equipment === 'weapon') return [el('div', { class: 'rpm-muted', text: `Weapon · ${d.category}` }), el('div', { class: 'rpm-cmp-stats' }, [line('Damage', `${d.damage} ${d.type}`), line('Properties', d.properties || '—'), line('Mastery', d.mastery)])];
        if (d.equipment === 'armor') return [el('div', { class: 'rpm-muted', text: `Armor · ${d.category}` }), el('div', { class: 'rpm-cmp-stats' }, [line('Armor Class', d.category === 'shield' ? `+${d.base}` : `${d.base}${d.dexCap === 0 ? '' : ` + Dex modifier${d.dexCap ? ` (max ${d.dexCap})` : ''}`}`)])];
        return [el('div', { class: 'rpm-muted', text: d.kind === 'tool' ? 'Tool' : 'Adventuring gear' }), el('div', { class: 'rpm-cmp-stats' }, [line('Cost', d.cost), d.kind !== 'tool' ? line('Weight', d.weight) : null]), ...d.text.map(para)];
    }
    function ruleDetail(e) { return [el('div', { class: 'rpm-muted', text: e.data.tag || 'Rules Glossary' }), ...e.data.text.map(para)]; }
    const DETAIL = { monster: monsterDetail, spell: spellDetail, item: itemDetail, equipment: equipmentDetail, rule: ruleDetail };

    // ---- window ------------------------------------------------------------------------
    function render() {
        if (!V.box) return;
        clear(V.box);
        const root = el('div', { class: 'rpm-cmp' + (V.sel ? ' rpm-cmp-has-sel' : '') });
        V.box.appendChild(root);
        // left: search, kinds, results
        const side = el('div', { class: 'rpm-cmp-side' });
        const q = el('input', { type: 'search', class: 'form-control rpm-input', placeholder: 'Search monsters, spells, items, rules…', 'aria-label': 'Search the compendium', 'data-cmp': 'search' });
        q.value = V.q;
        q.addEventListener('input', () => { V.q = q.value; renderList(); });
        side.appendChild(q);
        const chips = el('div', { class: 'rpm-wrap rpm-mt' });
        for (const [k, label] of [['', 'All'], ...Object.entries(CP.KINDS)]) {
            chips.appendChild(el('button', { type: 'button', class: 'rpm-chip' + (V.kind === k ? '' : ' rpm-chip-off'), 'aria-pressed': String(V.kind === k), 'data-cmp-kind': k || 'all', text: label, onclick: () => { V.kind = k; render(); } }));
        }
        side.appendChild(chips);
        const list = el('div', { class: 'rpm-cmp-list', role: 'list', 'data-cmp': 'results' });
        side.appendChild(list);
        root.appendChild(side);
        function renderList() {
            clear(list);
            const hits = CP.search(V.q, V.kind || null, 150);
            if (!hits.length) list.appendChild(el('div', { class: 'rpm-empty', text: 'Nothing found.' }));
            for (const h of hits) {
                const on = V.sel && V.sel.kind === h.kind && V.sel.key === h.key;
                list.appendChild(el('button', { type: 'button', role: 'listitem', class: 'rpm-cmp-hit' + (on ? ' rpm-on' : ''), 'data-cmp-hit': h.kind + ':' + h.key, onclick: () => { V.sel = { kind: h.kind, key: h.key }; V.msg = ''; render(); } }, [
                    el('span', { class: 'rpm-cmp-hit-name', text: h.name }), el('span', { class: 'rpm-muted', text: `${CP.KINDS[h.kind].replace(/s$/, '')} · ${h.sub}` }),
                ]));
            }
        }
        renderList();
        // right: the entry
        const main = el('div', { class: 'rpm-cmp-main', 'data-cmp': 'detail' });
        const e = V.sel && CP.entry(V.sel.kind, V.sel.key);
        if (e) {
            main.appendChild(el('div', { class: 'rpm-row rpm-cmp-head' }, [
                btn('Back', () => { V.sel = null; render(); }, { id: 'back', icon: 'arrow-left', cls: 'rpm-cmp-back' }),
                el('h2', { class: 'rpm-heading rpm-grow', text: e.name }),
            ]));
            for (const k of DETAIL[e.kind](e)) if (k) main.appendChild(k);
        } else {
            main.appendChild(el('div', { class: 'rpm-empty' }, [el('div', { class: 'rpm-heading', text: 'SRD 5.2.1 Compendium' }),
                el('p', { text: `${CP.index().length} entries: every monster, spell, magic item, piece of equipment and rules term of the System Reference Document. Search on the left.` })]));
        }
        main.appendChild(el('p', { class: 'rpm-muted rpm-cmp-attr', 'data-cmp': 'attribution', text: CP.ATTRIBUTION }));
        root.appendChild(main);
        if (document.activeElement === document.body && !V.sel) try { q.focus({ preventScroll: true }); } catch (_) {}
    }

    // open(): the window; open('Fireball') / open({ kind, key }) shows that entry
    function open(what) {
        if (what && typeof what === 'object' && what.kind && CP.entry(what.kind, what.key)) V.sel = { kind: what.kind, key: what.key };
        else if (typeof what === 'string' && what.trim()) { const hit = CP.find(what); if (hit) V.sel = { kind: hit.kind, key: hit.key }; else { V.q = what; V.sel = null; } }
        if (V.sel && what) { V.q = CP.entry(V.sel.kind, V.sel.key).name; V.kind = ''; }   // the list shows the entry
        V.msg = '';
        const sh = Shell(); if (!sh) return false;
        sh.open('compendium'); render();
        return true;
    }
    const api = { open, search: CP.search, entry: CP.entry, find: CP.find, kinds: () => Object.assign({}, CP.KINDS) };
    window.KLITE_RPMod_Compendium = api;

    function register() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({
            id: 'compendium', title: 'Compendium', place: 'window', window: { large: true, flush: true, minWidth: 320, minHeight: 320, restore: false },
            mount: (c) => { V.box = el('div', { class: 'rpm-cmp-scroll' }); c.appendChild(V.box); render(); },
            unmount: () => { V.box = null; },
        });
        sh.addDockAction('right', { id: 'compendium', title: 'Compendium (SRD monsters, spells, items, rules)', icon: 'book-marked', onClick: () => open() });
        return true;
    }
    let tries = 0;
    const attempt = () => { if (!register() && ++tries < 120) setTimeout(attempt, 250); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt, { once: true });   // once: a second load event must not start it again
}
