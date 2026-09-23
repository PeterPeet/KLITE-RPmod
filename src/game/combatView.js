// =============================================================================
// KLITE RPmod — Combat window (R5): encounter builder + running a fight
// -----------------------------------------------------------------------------
// Builder: SRD 5.2.1 monsters by search/CR, counts, world persons with their side, the XP
// budget meter (Low / Moderate / High for the party's level and size), saved encounters.
// Fight: initiative list with HP, AC, conditions and death saves; on the player's turn
// attack (weapon, target, advantage), then "End turn" runs the enemies' turns (automatic
// unless switched off in Settings → RPmod); tools for damage/heal, conditions and monster
// saving-throw actions. The engine (Worlds API) rolls everything and writes the game log;
// the AI narrates the results on its next reply.
// Used by src/KLITE-RPmod_WorldsUI.js for the window view "combat".
// =============================================================================
import { el } from '../shell/dom.js';
import { iconText } from '../shell/dom.js';

export const AUTO_TURNS_SETTING = 'combat_auto_turns';
const CR_BANDS = [['', 'Any CR'], ['0-0.25', 'CR 0–1/4'], ['0.5-1', 'CR 1/2–1'], ['2-4', 'CR 2–4'], ['5-10', 'CR 5–10'], ['11-30', 'CR 11+']];
const DIFF_LABEL = { none: 'No enemies yet', trivial: 'Trivial', low: 'Low', moderate: 'Moderate', high: 'High', beyond: 'Beyond High (deadly)' };

// Builder / fight choices that survive re-renders (per session).
const U = { monsters: {}, persons: {}, q: '', band: '', name: '', atk: 0, target: '', mode: '', tool: { who: '', amount: 5, cond: 'Prone', rounds: 1, action: 0, actTarget: '' } };

export function renderCombat(box, refresh) {
    const A = window.KLITE_RPMod_Worlds;
    const cb = A.getCombat();
    const root = el('div', { class: 'rpm-cb' }); box.appendChild(root);
    if (cb && cb.active) return renderFight(root, cb, A, refresh);
    return renderBuilder(root, A, refresh);
}
export function autoTurnsOn() { try { const S = window.KLITE_RPMod_Settings; const v = S && S.get(AUTO_TURNS_SETTING); return v !== false; } catch (_) { return true; } }

// ---- helpers --------------------------------------------------------------------------------
function btn(text, onclick, opts) {
    opts = opts || {};
    const cls = 'btn btn-primary rpm-btn' + (opts.variant ? ' rpm-' + opts.variant : '') + (opts.grow ? ' rpm-grow' : '') + (opts.block ? ' rpm-block' : '') + (opts.icon ? ' rpm-btn-icon' : '') + (opts.on ? ' rpm-on' : '');
    return el('button', { type: 'button', class: cls, title: opts.title, 'aria-label': opts.label, 'data-cb': opts.id, disabled: opts.disabled ? '' : null, onclick }, opts.icon ? [iconText(opts.icon, text)] : [text]);
}
function sel(options, value, onChange, label, id) {
    const s = el('select', { class: 'form-control rpm-input', 'aria-label': label, 'data-cb': id });
    for (const o of options) { const op = el('option', { value: o[0], text: o[1] }); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); }
    s.addEventListener('change', () => onChange(s.value));
    return s;
}
const row = (kids, style) => el('div', { class: 'rpm-row', style: 'flex-wrap:wrap;' + (style || '') }, kids);
const muted = (t, extra) => el('div', Object.assign({ class: 'rpm-muted', text: t }, extra || {}));
const label = (t) => el('div', { class: 'rpm-label', text: t });
function hpBar(hp, max) {
    const pct = max > 0 ? Math.max(0, Math.min(100, Math.round(hp / max * 100))) : 0;
    const b = el('div', { class: 'rpm-bar' });
    b.appendChild(el('span', { style: `width:${pct}%;background:${pct > 50 ? 'var(--rpm-success)' : pct > 25 ? 'var(--rpm-quest)' : 'var(--rpm-danger)'}` }));
    return b;
}

// ---- builder --------------------------------------------------------------------------------
function chosenMonsters() { return Object.entries(U.monsters).filter(([, n]) => n > 0).map(([key, count]) => ({ key, count })); }

function renderBuilder(box, A, refresh) {
    const world = A.activeWorld();
    const party = A.partyInfo();
    const xp = A.encounterXp(chosenMonsters()) + Object.entries(U.persons).filter(([, s]) => s === 'enemy').reduce((n, [id]) => n + (Number((A.getStats(id) || {}).xp) || 0), 0);
    const b = A.encounterBudget(party.level, party.size);
    const diff = A.encounterDifficulty(xp, party.level, party.size);

    // difficulty meter
    const max = Math.max(b.high * 1.25, xp, 1);
    const meter = el('div', { class: 'rpm-cb-meter', role: 'meter', 'aria-label': 'Encounter difficulty', 'aria-valuemin': '0', 'aria-valuemax': String(b.high), 'aria-valuenow': String(xp), 'data-cb': 'meter' }, [
        el('span', { class: 'rpm-cb-fill rpm-cb-' + diff, style: `width:${Math.min(100, xp / max * 100)}%` }),
        ...['low', 'moderate', 'high'].map(k => el('span', { class: 'rpm-cb-tick', style: `left:${b[k] / max * 100}%`, title: `${k}: ${b[k]} XP` })),
    ]);
    box.appendChild(el('div', { class: 'rpm-card' }, [
        row([el('span', { class: 'rpm-heading rpm-grow', text: 'New encounter' }), el('span', { class: 'rpm-chip ' + (diff === 'high' || diff === 'beyond' ? 'rpm-chip-danger' : diff === 'moderate' ? 'rpm-chip-quest' : 'rpm-chip-info'), 'data-cb': 'difficulty', text: DIFF_LABEL[diff] })]),
        muted(`Party: level ${party.level}, ${party.size} character${party.size > 1 ? 's' : ''} · budget Low ${b.low} · Moderate ${b.moderate} · High ${b.high} XP`),
        meter,
        muted(`${xp} XP in this encounter`, { 'data-cb': 'xp' }),
    ]));

    // chosen monsters
    const chosen = chosenMonsters();
    if (chosen.length) {
        box.appendChild(label('Monsters'));
        for (const { key, count } of chosen) {
            const m = A.monsterStats(key);
            box.appendChild(row([
                el('span', { class: 'rpm-grow', text: `${m.name} ×${count}` }),
                el('span', { class: 'rpm-muted', text: `CR ${m.cr} · ${m.xp * count} XP` }),
                btn('−', () => { U.monsters[key] = count - 1; refresh(); }, { label: `One ${m.name} less`, id: 'less-' + key }),
                btn('+', () => { U.monsters[key] = count + 1; refresh(); }, { label: `One more ${m.name}`, id: 'more-' + key }),
            ], 'margin-top:4px'));
        }
    }

    // monster search
    box.appendChild(label('Add SRD monsters'));
    const q = el('input', { type: 'search', class: 'form-control rpm-input rpm-grow fullScreenTextEditExclude', placeholder: 'Search monsters…', 'aria-label': 'Search monsters', 'data-cb': 'search' });
    q.value = U.q;
    q.addEventListener('input', () => { U.q = q.value; renderList(); });
    box.appendChild(row([q, sel(CR_BANDS, U.band, v => { U.band = v; renderList(); }, 'Challenge rating', 'band')]));
    const list = el('div', { class: 'rpm-cb-list', 'data-cb': 'monster-list' });
    box.appendChild(list);
    function renderList() {
        while (list.firstChild) list.removeChild(list.firstChild);
        const [lo, hi] = U.band ? U.band.split('-').map(Number) : [0, 99];
        const qq = U.q.trim().toLowerCase();
        const hits = A.monsters().filter(m => m.crValue >= lo && m.crValue <= hi && (!qq || m.name.toLowerCase().includes(qq) || m.type.toLowerCase().includes(qq)));
        for (const m of hits.slice(0, 40)) {
            list.appendChild(el('div', { class: 'rpm-cb-item', 'data-monster': m.key }, [
                el('span', { class: 'rpm-grow' }, [el('b', { text: m.name }), el('span', { class: 'rpm-muted', text: ` · CR ${m.cr} · ${m.xp} XP · ${m.type.split(',')[0]}` })]),
                btn('Add', () => { U.monsters[m.key] = (U.monsters[m.key] || 0) + 1; refresh(); }, { label: 'Add ' + m.name, id: 'add-' + m.key }),
            ]));
        }
        if (hits.length > 40) list.appendChild(muted(`${hits.length - 40} more — refine the search.`));
        if (!hits.length) list.appendChild(muted('No monster matches.'));
    }
    renderList();

    // world persons
    const persons = world ? A.getGraph().nodes.filter(n => n.type === 'npc') : [];
    if (persons.length) {
        box.appendChild(label('Persons of this world'));
        for (const p of persons) {
            const st = A.getStats(p.id);
            const side = U.persons[p.id] || '';
            box.appendChild(row([
                el('span', { class: 'rpm-grow', text: p.name }),
                st ? el('span', { class: 'rpm-muted', text: `AC ${st.ac} · HP ${st.hpMax}` }) : el('span', { class: 'rpm-chip rpm-chip-danger', text: 'no stats' }),
                sel([['', '—'], ['enemy', 'Enemy'], ['party', 'Ally']], side, v => { if (v) U.persons[p.id] = v; else delete U.persons[p.id]; refresh(); }, `${p.name}: side`, 'side-' + p.id),
            ], 'margin-top:3px'));
        }
    }

    // saved encounters
    const saved = world ? A.listEncounters() : [];
    if (saved.length) {
        box.appendChild(label('Saved encounters'));
        for (const e of saved) {
            const d = A.encounterDifficulty(e.xp, party.level, party.size);
            box.appendChild(row([
                el('span', { class: 'rpm-grow', text: `${e.name} — ${e.monsters.map(m => `${A.monsterStats(m.key).name} ×${m.count}`).join(', ')}` }),
                el('span', { class: 'rpm-muted', text: `${e.xp} XP · ${DIFF_LABEL[d]}` }),
                btn('Load', () => { U.monsters = Object.fromEntries(e.monsters.map(m => [m.key, m.count])); U.persons = Object.fromEntries(e.personIds.map(id => [id, 'enemy'])); U.name = e.name; refresh(); }, { id: 'load-' + e.id }),
                btn('Start', () => { A.startSavedEncounter(e.id); afterStart(A); refresh(); }, { variant: 'danger', id: 'start-' + e.id }),
                btn('', () => { if (confirm(`Delete the encounter "${e.name}"?`)) { A.deleteEncounter(e.id); refresh(); } }, { icon: 'trash-2', label: 'Delete ' + e.name, id: 'delete-' + e.id }),
            ], 'margin-top:3px'));
        }
    }

    // start / save
    const hasAny = chosen.length || Object.keys(U.persons).length;
    const name = el('input', { type: 'text', class: 'form-control rpm-input rpm-grow fullScreenTextEditExclude', placeholder: 'Name, e.g. Wolf pack', 'aria-label': 'Encounter name', 'data-cb': 'name' });
    name.value = U.name;
    name.addEventListener('input', () => { U.name = name.value; });
    if (world) box.appendChild(row([name, btn('Save to world', () => {
        A.saveEncounter({ name: U.name || 'Encounter', monsters: chosen, personIds: Object.keys(U.persons).filter(id => U.persons[id] === 'enemy'), locationId: (A.runtime || {}).playerLocationId || null, difficulty: diff });
        refresh();
    }, { disabled: !chosen.length, id: 'save' })], 'margin-top:12px'));
    box.appendChild(btn('Start encounter', () => {
        const ids = Object.keys(U.persons);
        A.startEncounter(ids, { monsters: chosen, sides: U.persons, difficulty: diff });
        U.monsters = {}; U.persons = {}; U.name = '';
        afterStart(A); refresh();
    }, { icon: 'swords', block: true, variant: 'danger', disabled: !hasAny, id: 'start' }));
    box.appendChild(muted('Tip: the AI can start a fight too — it writes <encounter>2 Wolf</encounter> or the name of a saved encounter.', { style: 'margin-top:6px' }));
}
// Enemies who beat the player at initiative act right away (when automatic turns are on).
function afterStart(A) { if (autoTurnsOn()) A.runAutoTurns(); }

// ---- the fight ------------------------------------------------------------------------------
function renderFight(box, cb, A, refresh) {
    const cur = cb.order[cb.turnIndex];
    const conds = (id) => A.conditionsOf(id);
    box.appendChild(row([
        el('span', { class: 'rpm-heading rpm-grow', text: `Round ${cb.round}` }),
        cb.outcome ? null : el('span', { class: 'rpm-chip rpm-chip-danger', 'data-cb': 'turn', text: '▶ ' + cur.name }),
    ], 'margin-bottom:6px'));
    if (cb.outcome) {
        box.appendChild(el('div', { class: 'rpm-card rpm-cb-outcome rpm-cb-' + cb.outcome, 'data-cb': 'outcome' }, [
            el('div', { class: 'rpm-heading', text: cb.outcome === 'victory' ? 'Victory!' : 'Defeat' }),
            muted(cb.outcome === 'victory' ? `${cb.xp || 0} XP earned${cb.persona ? ` — saved to ${cb.persona}'s sheet` : ''}. Send a message so the AI narrates the end of the fight.` : 'The party has fallen. Send a message so the AI tells what happens next.'),
        ]));
    }

    // initiative list
    for (const side of ['party', 'enemy']) {
        box.appendChild(label(side === 'party' ? 'Party' : 'Enemies'));
        for (const o of cb.order.filter(x => (x.side || (x.isPlayer ? 'party' : 'enemy')) === side)) {
            const hp = cb.hp[o.id], max = cb.maxHp[o.id] || 1, st = A.combatantStats(o.id);
            const d = cb.death && cb.death[o.id];
            const down = hp <= 0;
            const card = el('div', { class: 'rpm-card' + (o.id === cur.id && !cb.outcome ? ' rpm-card-hi' : ''), 'data-combatant': o.id, style: down ? 'opacity:.6' : null }, [
                row([
                    el('span', { class: 'rpm-grow', style: 'font-weight:bold', text: o.name }),
                    el('span', { class: 'rpm-muted', text: `AC ${st.ac} · init ${o.init}` }),
                    el('span', { 'data-cb': 'hp', text: `${hp}/${max}` }),
                ]),
                hpBar(hp, max),
            ]);
            const cs = conds(o.id);
            if (cs.length || d) card.appendChild(row([
                ...cs.map(c => btn(`${c.name}${c.rounds ? ` (${c.rounds})` : ''} ×`, () => { A.removeCondition(o.id, c.name); refresh(); }, { title: 'Remove ' + c.name, id: `cond-${o.id}-${c.name}` })),
                d ? el('span', { class: 'rpm-chip ' + (d.dead ? 'rpm-chip-danger' : 'rpm-chip-quest'), 'data-cb': 'death', text: d.dead ? 'dead' : d.stable ? 'stable' : `death saves ✓${d.s} ✗${d.f}` }) : null,
            ], 'margin-top:4px'));
            box.appendChild(card);
        }
    }
    if (!cb.outcome) renderTurn(box, cb, cur, A, refresh);

    // tools
    box.appendChild(el('details', { class: 'rpm-cb-tools' }, [el('summary', { text: 'Tools: damage, healing, conditions, special actions' }), toolsPanel(cb, A, refresh)]));
    box.appendChild(label('Combat log'));
    const log = el('div', { class: 'rpm-log', 'data-cb': 'log' });
    for (const line of (cb.log || []).slice(-10)) log.appendChild(el('div', { text: line }));
    box.appendChild(log);
    box.appendChild(btn(cb.outcome ? 'Close the fight' : 'End encounter', () => { if (cb.outcome || confirm('End the fight now (flee / stop)? HP is kept.')) { A.endEncounter(); refresh(); } }, { icon: 'x', block: true, variant: cb.outcome ? null : 'danger', id: 'end' }));
}

function renderTurn(box, cb, cur, A, refresh) {
    const wrap = el('div', { class: 'rpm-card rpm-cb-turn', 'data-cb': 'turn-panel' });
    box.appendChild(wrap);
    const endTurn = () => { A.nextTurn(); if (autoTurnsOn()) A.runAutoTurns(); refresh(); };
    const d = cb.death && cb.death[cur.id];
    if (cur.isPlayer && d && !d.dead && !d.stable) {
        wrap.appendChild(muted('You are dying. Roll a death saving throw: 10+ succeeds, 20 brings you back with 1 HP, 1 counts twice.'));
        wrap.appendChild(btn('Roll death save', () => { A.deathSave('__player__'); endTurn(); }, { icon: 'dice-5', block: true, variant: 'danger', id: 'death-save' }));
        return;
    }
    if (cur.isPlayer || cur.side === 'party') {
        const st = A.combatantStats(cur.id);
        const foes = cb.order.filter(o => o.side !== cur.side && cb.hp[o.id] > 0);
        if (!foes.some(f => f.id === U.target)) U.target = foes[0] ? foes[0].id : '';
        const attacks = (st.attacks || []).map((a, i) => [i, `${a.name} (${a.toHit >= 0 ? '+' : ''}${a.toHit}, ${a.damage})`]);
        if (U.atk >= attacks.length) U.atk = 0;
        wrap.appendChild(el('div', { style: 'font-weight:bold', text: cur.isPlayer ? 'Your turn' : `${cur.name}'s turn` }));
        wrap.appendChild(row([
            attacks.length ? sel(attacks, U.atk, v => { U.atk = Number(v); }, 'Weapon', 'weapon') : muted('No attacks on the sheet — Unarmed Strike.'),
            sel(foes.map(f => [f.id, `${f.name} (${cb.hp[f.id]} HP)`]), U.target, v => { U.target = v; }, 'Target', 'target'),
            sel([['', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']], U.mode, v => { U.mode = v; }, 'Roll mode', 'mode'),
        ], 'margin-top:4px'));
        wrap.appendChild(row([
            btn('Attack', () => { if (U.target) A.attack(cur.id, U.target, U.atk, { mode: U.mode || undefined }); refresh(); }, { icon: 'swords', variant: 'danger', grow: true, disabled: !foes.length, id: 'attack' }),
            btn('End turn', endTurn, { icon: 'arrow-right', grow: true, id: 'end-turn' }),
        ], 'margin-top:6px'));
        wrap.appendChild(muted('Then tell the AI in the chat what you do — it narrates the rolls from the log.', { style: 'margin-top:4px' }));
        return;
    }
    wrap.appendChild(row([
        el('span', { class: 'rpm-grow', text: `${cur.name}'s turn` }),
        btn('Run enemy turns', () => { A.runAutoTurns(); refresh(); }, { icon: 'play', variant: 'danger', id: 'run-enemies' }),
        btn('Skip', () => { A.nextTurn(); refresh(); }, { id: 'skip' }),
    ]));
}

function toolsPanel(cb, A, refresh) {
    const T = U.tool;
    const people = cb.order.map(o => [o.id, o.name]);
    if (!people.some(p => p[0] === T.who)) T.who = '__player__';
    const box = el('div', { style: 'margin-top:6px' });
    const amount = el('input', { type: 'number', min: '0', class: 'form-control rpm-input fullScreenTextEditExclude', style: 'width:5em', 'aria-label': 'Amount', 'data-cb': 'amount' });
    amount.value = T.amount; amount.addEventListener('change', () => { T.amount = Math.max(0, Number(amount.value) || 0); });
    box.appendChild(row([
        sel(people, T.who, v => { T.who = v; }, 'Creature', 'who'), amount,
        btn('Damage', () => { A.damage(T.who, T.amount); refresh(); }, { variant: 'danger', id: 'damage' }),
        btn('Heal', () => { A.heal(T.who, T.amount); refresh(); }, { variant: 'success', id: 'heal' }),
    ]));
    const rounds = el('input', { type: 'number', min: '0', class: 'form-control rpm-input fullScreenTextEditExclude', style: 'width:4.5em', 'aria-label': 'Rounds (0 = until removed)', title: 'Rounds (0 = until removed)', 'data-cb': 'rounds' });
    rounds.value = T.rounds; rounds.addEventListener('change', () => { T.rounds = Math.max(0, Number(rounds.value) || 0); });
    box.appendChild(row([
        sel(A.conditionNames().map(c => [c, c]), T.cond, v => { T.cond = v; }, 'Condition', 'condition'), rounds,
        btn('Add condition', () => { A.addCondition(T.who, T.cond, T.rounds || null); refresh(); }, { id: 'add-condition' }),
    ], 'margin-top:6px'));
    const ct = A.conditionText(T.cond);
    if (ct.length) box.appendChild(muted(ct.slice(0, 3).join(' '), { style: 'margin-top:2px' }));
    // monster saving-throw actions (breath weapons, …)
    const casters = cb.order.filter(o => (A.combatantStats(o.id).saveActions || []).length && cb.hp[o.id] > 0);
    if (casters.length) {
        const opts = [];
        for (const o of casters) A.combatantStats(o.id).saveActions.forEach((a, i) => opts.push([`${o.id}|${i}`, `${o.name}: ${a.name} (DC ${a.dc} ${a.save.toUpperCase()})`]));
        if (!opts.some(o => o[0] === T.action)) T.action = opts[0][0];
        box.appendChild(row([
            sel(opts, T.action, v => { T.action = v; }, 'Special action', 'save-action'),
            sel(people, T.actTarget || '__player__', v => { T.actTarget = v; }, 'Special action target', 'save-target'),
            btn('Use', () => { const [id, i] = T.action.split('|'); A.saveAction(id, T.actTarget || '__player__', Number(i)); refresh(); }, { id: 'use-action' }),
        ], 'margin-top:6px'));
    }
    return box;
}
