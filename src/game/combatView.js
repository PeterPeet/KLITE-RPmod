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
import { renderZoneBoard } from './zoneBoard.js';

export const AUTO_TURNS_SETTING = 'combat_auto_turns';
export const ZONES_SETTING = 'combat_zones';
const STARTS = [['auto', 'Enemies start: across the room'], ['same', 'Enemies start: right beside you'], ['near', 'Enemies start: the next zone'], ['outside', 'Enemies start: outside the room']];
const CR_BANDS = [['', 'Any CR'], ['0-0.25', 'CR 0–1/4'], ['0.5-1', 'CR 1/2–1'], ['2-4', 'CR 2–4'], ['5-10', 'CR 5–10'], ['11-30', 'CR 11+']];
const DIFF_LABEL = { none: 'No enemies yet', trivial: 'Trivial', low: 'Low', moderate: 'Moderate', high: 'High', beyond: 'Beyond High (deadly)' };

// Builder / fight choices that survive re-renders (per session).
const U = { monsters: {}, persons: {}, q: '', band: '', name: '', start: 'auto', atk: 0, target: '', mode: '', act: 'weapon', spell: '', slot: '', spellTarget: '', spellTargets: [], spellMsg: '', moveTo: '', cover: '', tool: { who: '', amount: 5, cond: 'Prone', rounds: 1, action: 0, actTarget: '', zone: '' } };

export function renderCombat(box, refresh) {
    const A = window.KLITE_RPMod_Worlds;
    const cb = A.getCombat();
    const root = el('div', { class: 'rpm-cb' }); box.appendChild(root);
    if (cb && cb.active) return renderFight(root, cb, A, refresh);
    return renderBuilder(root, A, refresh);
}
export function zonesOn() { try { const S = window.KLITE_RPMod_Settings; const v = S && S.get(ZONES_SETTING); return v !== false; } catch (_) { return true; } }
// "How zone combat works": the Guide's zone tab (Esolite's Guide or RPmod's own window).
export function openZoneGuide() { try { window.KLITE_RPMod_Onboarding?.openZoneGuide?.(); } catch (_) {} }
function zoneHelp() {
    return el('button', { type: 'button', class: 'rpm-linkbtn', 'data-cb': 'zone-help', text: 'How zone combat works', onclick: openZoneGuide });
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
                window.KLITE_RPMod_Compendium ? btn('', () => window.KLITE_RPMod_Compendium.open({ kind: 'monster', key: m.key }), { icon: 'book-marked', label: m.name + ' in the compendium', id: 'info-' + m.key }) : null,
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
        A.saveEncounter({ name: U.name || 'Encounter', monsters: chosen, personIds: Object.keys(U.persons).filter(id => U.persons[id] === 'enemy'), locationId: (A.runtime || {}).playerLocationId || null, difficulty: diff, start: U.start });
        refresh();
    }, { disabled: !chosen.length, id: 'save' })], 'margin-top:12px'));
    if (zonesOn()) box.appendChild(row([sel(STARTS, U.start, v => { U.start = v; }, 'Where the enemies start', 'enemy-start'), zoneHelp()], 'margin-top:8px;align-items:center'));
    box.appendChild(btn('Start encounter', () => {
        const ids = Object.keys(U.persons);
        A.startEncounter(ids, { monsters: chosen, sides: U.persons, difficulty: diff, enemyStart: U.start });
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
            muted(cb.outcome === 'victory' ? `${cb.xp || 0} XP earned${cb.xpShares > 1 ? ` — ${cb.xpEach} XP each for ${cb.xpShares} characters` : ''}${cb.persona ? `, saved to ${cb.persona}'s sheet${cb.xpShares > 1 ? ' and your companions\' sheets' : ''}` : ''}. Send a message so the AI narrates the end of the fight.` : 'The party has fallen. Send a message so the AI tells what happens next.'),
        ]));
    }

    const zv = A.zoneView && A.zoneView();
    if (zv) renderZones(box, cb, cur, zv, A, refresh);

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
                    zv ? el('span', { class: 'rpm-chip', 'data-cb': 'zone-' + o.id, text: zoneChip(zv, o.id) }) : null,
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
        const book = A.combatSpells ? A.combatSpells(cur.id) : null;
        if (book && book.spells.length) {
            wrap.appendChild(row([
                btn('Weapon', () => { U.act = 'weapon'; U.spellMsg = ''; refresh(); }, { icon: 'swords', on: U.act !== 'spell', id: 'act-weapon', grow: true }),
                btn('Spell', () => { U.act = 'spell'; refresh(); }, { icon: 'wand-sparkles', on: U.act === 'spell', id: 'act-spell', grow: true }),
            ], 'margin-top:4px'));
        }
        if (U.act === 'spell' && book && book.spells.length) {
            const zv0 = A.zoneView && A.zoneView();
            if (zv0) zoneControls(wrap, cb, cur, zv0, A, refresh);
            renderSpellRow(wrap, cb, cur, book, A, refresh, endTurn);
            return;
        }
        wrap.appendChild(row([
            attacks.length ? sel(attacks, U.atk, v => { U.atk = Number(v); refresh(); }, 'Weapon', 'weapon') : muted('No attacks on the sheet — Unarmed Strike.'),
            sel(foes.map(f => [f.id, `${f.name} (${cb.hp[f.id]} HP)`]), U.target, v => { U.target = v; refresh(); }, 'Target', 'target'),
            sel([['', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']], U.mode, v => { U.mode = v; }, 'Roll mode', 'mode'),
        ], 'margin-top:4px'));
        const zv = A.zoneView && A.zoneView();
        const why = zv && U.target ? zv.canAttack(cur.id, U.target, U.atk) : null;
        if (zv) zoneControls(wrap, cb, cur, zv, A, refresh);
        if (why && !why.ok) wrap.appendChild(muted(`Attack not possible: ${why.reason}.`, { 'data-cb': 'attack-why', style: 'margin-top:4px' }));
        else if (why && (why.penalty || why.cover)) wrap.appendChild(muted([why.penalty ? `−${why.penalty} to hit (the target attacked you in melee)` : '', why.cover ? `the target is in ${why.cover === 'three' ? 'three-quarters' : 'half'} cover` : ''].filter(Boolean).join(' · '), { 'data-cb': 'attack-note', style: 'margin-top:4px' }));
        wrap.appendChild(row([
            btn('Attack', () => { if (U.target) A.attack(cur.id, U.target, U.atk, { mode: U.mode || undefined }); refresh(); }, { icon: 'swords', variant: 'danger', grow: true, disabled: !foes.length || (why && !why.ok), id: 'attack' }),
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

// ---- spells (R5): cast from the caster's sheet ------------------------------------------------
const SAVE_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
function spellInfo(sp, slotLevel, charLevel) {
    const u = sp.use;
    if (u.kind === 'attack') return `Spell attack ${sp.attack >= 0 ? '+' : ''}${sp.attack}${u.damageType ? ' · ' + u.damageType.toLowerCase() + ' damage' : ''}`;
    if (u.kind === 'save') return `${SAVE_NAMES[u.save] || u.save} save, DC ${sp.dc}${u.damage ? ` · ${u.damageType ? u.damageType.toLowerCase() + ' damage' : 'damage'}${u.half ? ', half on a success' : ''}` : ' · no damage: the AI narrates the effect'}${u.area ? ' · area: choose every creature in it' : ''}`;
    if (u.kind === 'heal') return 'Healing';
    if (u.kind === 'darts') return `${3 + Math.max(0, (Number(slotLevel) || 1) - 1)} darts, each 1d4+1 force, always hit (spread them over the chosen targets)`;
    return 'The slot is spent and the cast logged; the AI narrates the effect (conditions with the Tools).';
}
function renderSpellRow(wrap, cb, cur, book, A, refresh, endTurn) {
    const spells = book.spells;
    if (!spells.some(x => x.key === U.spell)) U.spell = spells[0].key;
    const sp = spells.find(x => x.key === U.spell), u = sp.use;
    const opts = spells.map(x => [x.key, `${x.level ? 'Level ' + x.level : 'Cantrip'}: ${x.name}${x.level && !x.slots.length && !x.freeLeft ? ' (no slot left)' : ''}`]);
    const kids = [sel(opts, U.spell, v => { U.spell = v; U.slot = ''; U.spellMsg = ''; refresh(); }, 'Spell', 'spell')];
    if (sp.level) {
        const slotOpts = sp.slots.map(l => [String(l), `Level ${l} slot`]);
        if (sp.freeLeft > 0) slotOpts.push(['free', `Free cast (${sp.freeLeft} left)`]);
        if (!slotOpts.some(o => o[0] === U.slot)) U.slot = slotOpts.length ? slotOpts[0][0] : '';
        kids.push(slotOpts.length ? sel(slotOpts, U.slot, v => { U.slot = v; refresh(); }, 'Spell slot', 'slot') : muted('No spell slot left', { 'data-cb': 'no-slot' }));
    }
    const party = cb.order.filter(o => o.side === cur.side && (cb.hp[o.id] > 0 || (cb.death && cb.death[o.id] && !cb.death[o.id].dead)));
    const foes = cb.order.filter(o => o.side !== cur.side && cb.hp[o.id] > 0);
    const pool = u.kind === 'heal' ? party : foes;
    const multi = (u.kind === 'save' && u.area) || u.kind === 'darts';
    if (u.kind !== 'other') {
        if (multi) {
            U.spellTargets = U.spellTargets.filter(id => pool.some(o => o.id === id));
            if (!U.spellTargets.length && pool[0]) U.spellTargets = [pool[0].id];
        } else if (!pool.some(o => o.id === U.spellTarget)) U.spellTarget = pool[0] ? pool[0].id : '';
        if (!multi) kids.push(sel(pool.map(o => [o.id, `${o.name} (${cb.hp[o.id]} HP)`]), U.spellTarget, v => { U.spellTarget = v; }, 'Target', 'spell-target'));
    }
    if (u.kind === 'attack') kids.push(sel([['', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']], U.mode, v => { U.mode = v; }, 'Roll mode', 'mode'));
    wrap.appendChild(row(kids, 'margin-top:4px'));
    if (multi && u.kind !== 'other') {
        const list = el('div', { class: 'rpm-wrap', 'data-cb': 'spell-targets', style: 'margin-top:4px' });
        for (const o of pool) {
            const cbx = el('input', { type: 'checkbox', value: o.id });
            cbx.checked = U.spellTargets.includes(o.id);
            cbx.addEventListener('change', () => { U.spellTargets = cbx.checked ? [...U.spellTargets, o.id] : U.spellTargets.filter(x => x !== o.id); });
            list.appendChild(el('label', { class: 'rpm-check' }, [cbx, el('span', { text: `${o.name} (${cb.hp[o.id]} HP)` })]));
        }
        wrap.appendChild(list);
    }
    const slotLevel = U.slot && U.slot !== 'free' ? Number(U.slot) : sp.level;
    wrap.appendChild(muted(spellInfo(sp, slotLevel, book.level) + (u.bonus ? ' · Bonus Action' : ''), { 'data-cb': 'spell-info', style: 'margin-top:4px' }));
    if (U.spellMsg) wrap.appendChild(muted(U.spellMsg, { 'data-cb': 'spell-why', style: 'margin-top:4px' }));
    const canPay = !sp.level || sp.slots.length || sp.freeLeft > 0;
    wrap.appendChild(row([
        btn('Cast', () => {
            const targets = u.kind === 'other' ? [] : (multi ? U.spellTargets : [U.spellTarget].filter(Boolean));
            const r = A.castSpell(cur.id, sp.key, { targets, slot: U.slot && U.slot !== 'free' ? Number(U.slot) : undefined, free: U.slot === 'free', mode: U.mode || undefined });
            U.spellMsg = r && !r.ok ? `Cannot cast: ${r.reason}.` : '';
            refresh();
        }, { icon: 'wand-sparkles', variant: 'danger', grow: true, disabled: !canPay, id: 'cast' }),
        btn('End turn', () => { U.spellMsg = ''; endTurn(); }, { icon: 'arrow-right', grow: true, id: 'end-turn' }),
    ], 'margin-top:6px'));
    wrap.appendChild(muted('Then tell the AI in the chat what you do — it narrates the rolls from the log.', { style: 'margin-top:4px' }));
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
    const zv = A.zoneView && A.zoneView();
    if (zv) {
        const zs = zv.zones.map(z => [z.id, z.short]);
        if (!zs.some(z => z[0] === T.zone)) T.zone = zs[0][0];
        box.appendChild(row([
            sel(zs, T.zone, v => { T.zone = v; }, 'Zone', 'set-zone'),
            btn('Put there', () => { A.zoneMove(T.who, T.zone, { free: true }); refresh(); }, { id: 'put-zone', title: 'Game master: place the creature without rules or opportunity attacks' }),
        ], 'margin-top:6px'));
    }
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

// ---- zones ----------------------------------------------------------------------------------
function zoneChip(zv, id) {
    const z = zv.zones.find(x => x.id === zv.pos[id]);
    return (z ? z.short : '?') + (zv.cover[id] ? ' · cover' : '') + (zv.hidden.includes(id) ? ' · hidden' : '');
}
function renderZones(box, cb, cur, zv, A, refresh) {
    const mover = !cb.outcome && (cur.isPlayer || cur.side === 'party') && cb.hp[cur.id] > 0 ? cur.id : null;
    const reach = new Set();
    if (mover) { const left = zv.movesLeft(mover); for (const z of zv.zones) { const d = zv.distanceTo(mover, z.id); if (d > 0 && d <= left) reach.add(z.id); } }
    const tokens = cb.order.map(o => ({ id: o.id, name: o.name, side: o.side || (o.isPlayer ? 'party' : 'enemy'), current: o.id === cur.id && !cb.outcome, down: cb.hp[o.id] <= 0, hidden: zv.hidden.includes(o.id), cover: !!zv.cover[o.id] }));
    const { svg, outOfRange } = renderZoneBoard(zv, { tokens, reachable: reach, onZone: (z) => { A.zoneMove(mover, z); refresh(); }, label: `Zones of ${zv.room || 'the fight'}` });
    const card = el('div', { class: 'rpm-card rpm-zone-card', 'data-cb': 'zones' }, [
        row([el('span', { class: 'rpm-grow', style: 'font-weight:bold', text: zv.room || 'Battlefield' }), el('span', { class: 'rpm-muted', text: zv.name + (zv.dark ? ' · dark' : '') })]),
    ]);
    card.appendChild(svg);
    if (outOfRange.length) card.appendChild(muted('Out of range: ' + outOfRange.map(t => t.name).join(', '), { 'data-cb': 'out-of-range' }));
    card.appendChild(row([muted(mover && reach.size ? 'Click a highlighted zone to move there.' : 'Same zone = melee; ranged by weapon range.', { class: 'rpm-muted rpm-grow' }), zoneHelp()], 'align-items:center'));
    box.appendChild(card);
}
function zoneControls(wrap, cb, cur, zv, A, refresh) {
    const here = zv.zones.find(z => z.id === zv.pos[cur.id]);
    const left = zv.movesLeft(cur.id);
    const T = zv.turn && zv.turn.id === cur.id ? zv.turn : { moved: 0 };
    const action = T.fled ? 'used (fled)' : T.acted ? 'used' : T.attacked ? 'attacking' : 'free';
    wrap.appendChild(muted(`At ${here ? here.name : '?'} · movement left: ${Math.max(0, left)} zone${left === 1 ? '' : 's'} · action: ${action}`, { 'data-cb': 'zone-status', style: 'margin-top:4px' }));
    const dests = zv.zones.filter(z => z.id !== zv.pos[cur.id] && Number.isFinite(zv.distanceTo(cur.id, z.id))).map(z => [z.id, `${z.short} (${zv.distanceTo(cur.id, z.id)})`]);
    if (!dests.some(d => d[0] === U.moveTo)) U.moveTo = dests[0] ? dests[0][0] : '';
    const feats = zv.features.filter(f => f.cover && f.zone === zv.pos[cur.id]);
    if (!feats.some(f => f.id === U.cover)) U.cover = feats[0] ? feats[0].id : '';
    const kids = [
        sel(dests, U.moveTo, v => { U.moveTo = v; }, 'Move to zone', 'move-to'),
        btn('Move', () => { A.zoneMove(cur.id, U.moveTo); refresh(); }, { icon: 'footprints', id: 'move', disabled: !U.moveTo || left <= 0, title: 'One zone per turn; leaving by one zone provokes no opportunity attack' }),
        btn('Flee', () => { A.zoneFlee(cur.id, U.moveTo); refresh(); }, { icon: 'wind', id: 'flee', disabled: !U.moveTo || T.attacked || T.acted, title: 'Up to two zones, no attack this turn; enemies in your zone get an opportunity attack' }),
    ];
    if (feats.length) kids.push(sel(feats.map(f => [f.id, `${f.name} (${f.cover === 'three' ? '¾' : '½'} cover)`]), U.cover, v => { U.cover = v; }, 'Cover', 'cover-pick'),
        btn('Take cover', () => { A.takeCover(cur.id, U.cover); refresh(); }, { icon: 'shield', id: 'take-cover', disabled: zv.cover[cur.id] === U.cover }));
    kids.push(btn('Hide', () => { A.hide(cur.id); refresh(); }, { icon: 'eye-off', id: 'hide', disabled: T.attacked || T.acted || T.fled || zv.hidden.includes(cur.id), title: 'Stealth DC 15 behind three-quarters cover or in darkness (your action)' }));
    if (cb.order.some(o => o.side !== cur.side && zv.hidden.includes(o.id))) kids.push(btn('Search', () => { A.zoneSearch(cur.id); refresh(); }, { icon: 'search', id: 'search', disabled: T.attacked || T.acted }));
    wrap.appendChild(row(kids, 'margin-top:4px'));
}
