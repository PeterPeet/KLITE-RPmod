// =============================================================================
// KLITE RPmod — Characters: the character sheet window
// -----------------------------------------------------------------------------
// A shell window ("Character sheet") for any character in Esolite's Library: identity,
// abilities, saving throws, skills, combat values, attacks, spells (cast, slots, change),
// inventory, coins, notes.
// Every bonus is a button that rolls (normal / advantage / disadvantage) into the game log
// (src/game/log.js), which the AI sees on its next turn.
// The sheet is stored in the card (src/characters/sheet.js, store.js). Edits are a draft
// until Save (or automatically with Settings → RPmod → "Autosave character sheets");
// Revert drops the draft; closing with unsaved edits asks.
// Public API: window.KLITE_RPMod_Characters.
// =============================================================================
import { el, clear, icon, iconText } from '../shell/dom.js';
import { ABILITIES, ABILITY_NAMES, SKILLS, defaultSheet, normalizeSheet, derive, fmt, fromCombatStats } from './sheet.js';
import { loadSheet, saveSheet, cachedSheet, combatStatsFor, summaryFor, blurbFor, updateSheet, flushSheet, combatSpellsFor, spendSpell, longRestSheet } from './store.js';
import { characterNames } from '../library/esoliteLibrary.js';
import * as SP from './spell-rules.js';
import * as BR from './builder-rules.js';
import { spellPicker, spellDetails, spellTags } from './spellPicker.js';

const LAST_KEY = 'KLITE.sheet.last';
const AUTOSAVE_SETTING = 'sheets_autosave';
const GAME_FIELDS = ['inventory', 'coins', 'xp', 'hp', 'spellcasting'];   // changed by quests and fights while you play (slots spent in combat)

export default function initCharacters() {
    'use strict';
    if (window.KLITE_RPMod_Characters) return;

    const V = { name: null, saved: null, draft: null, loading: false, error: '', mode: null, box: null, timer: null, manage: false, spellSearch: {} };
    const Shell = () => window.KLITE_RPMod_Shell;
    const Log = () => window.KLITE_RPMod_Log;
    const autosave = () => { try { return !!window.KLITE_RPMod_Settings?.get(AUTOSAVE_SETTING); } catch (_) { return false; } };
    const dirty = () => !!(V.draft && JSON.stringify(V.draft) !== JSON.stringify(V.saved));

    function personaName() { try { const T = window.KLITE_RPMod?.panels?.TOOLS; return (T && T.selectedPersona && T.selectedPersona.name) || ''; } catch (_) { return ''; } }
    function defaultName() {
        let last = ''; try { last = localStorage.getItem(LAST_KEY) || ''; } catch (_) {}
        const names = characterNames();
        return [last, personaName()].find(n => n && names.includes(n)) || names[0] || '';
    }

    // ---- load / save ----------------------------------------------------------------------
    async function select(name) {
        if (V.draft && dirty() && name !== V.name && !confirm(`Discard unsaved changes to ${V.name}'s sheet?`)) { render(); return; }
        V.name = name || null; V.saved = null; V.draft = null; V.error = '';
        V.manage = false;
        try { localStorage.setItem(LAST_KEY, V.name || ''); } catch (_) {}
        if (!V.name) { render(); return; }
        V.loading = true; render();
        try {
            const s = await loadSheet(V.name);
            V.saved = s ? normalizeSheet(s) : null;
            V.draft = s ? normalizeSheet(s) : null;
        } catch (e) { V.error = e.message || String(e); }
        V.loading = false; render();
    }
    async function save() {
        if (!V.name || !V.draft) return;
        clearTimeout(V.timer); V.timer = null;
        try {
            const s = await saveSheet(V.name, V.draft);
            V.saved = normalizeSheet(s); V.draft = normalizeSheet(s);
            toast('Sheet saved to the card');
        } catch (e) { toast('Save failed: ' + (e.message || e), true); }
        render();
    }
    function revert() {
        if (!dirty() || !confirm('Undo all unsaved changes to this sheet?')) return;
        V.draft = V.saved ? normalizeSheet(V.saved) : null; render();
    }
    function edited() {
        V.draft = normalizeSheet(V.draft);
        clearTimeout(V.timer); V.timer = null;
        if (autosave()) V.timer = setTimeout(() => { V.timer = null; if (dirty()) save(); }, 1000);
        // after the focus has moved (a `change` fires before Tab moves focus)
        setTimeout(render, 0);
    }
    async function createSheet(from) {
        V.draft = from ? normalizeSheet(from) : defaultSheet();
        await save();
    }

    // ---- rolls ----------------------------------------------------------------------------
    function rollD20(what, mod, kind) {
        const L = Log(); if (!L) { toast('Game log not loaded', true); return; }
        const e = L.rollAndLog({ who: V.name, what, expr: '1d20' + (mod ? (mod > 0 ? '+' + mod : String(mod)) : ''), mode: V.mode, kind });
        toast(L.describe(e));
    }
    function rollExpr(what, expr, kind) {
        const L = Log(); if (!L) return;
        try { const e = L.rollAndLog({ who: V.name, what, expr, kind }); toast(L.describe(e)); }
        catch (err) { toast(err.message, true); }
    }

    // ---- UI helpers -------------------------------------------------------------------------
    function btn(text, onclick, opts) {
        opts = opts || {};
        const cls = 'btn btn-primary rpm-btn' + (opts.icon ? ' rpm-btn-icon' : '') + (opts.variant ? ' rpm-' + opts.variant : '') + (opts.cls ? ' ' + opts.cls : '');
        return el('button', { type: 'button', class: cls, title: opts.title, 'aria-label': opts.label || (text ? null : opts.title), 'data-roll': opts.roll, onclick }, opts.icon ? [iconText(opts.icon, text)] : [text]);
    }
    function field(label, input) { return el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: label }), input]); }
    // One-line fields opt out of Esolite's full-screen edit button (fullScreenEditor.js);
    // the notes/features text areas keep it.
    function textIn(value, onChange, props) {
        const i = el('input', Object.assign({ type: 'text', class: 'form-control rpm-input' }, props || {}));
        i.classList.add('fullScreenTextEditExclude');
        i.value = value == null ? '' : value;
        i.addEventListener('change', () => onChange(i.value));
        return i;
    }
    function numIn(value, onChange, props) { return textIn(value, (v) => onChange(Number(v)), Object.assign({ type: 'number', inputmode: 'numeric' }, props || {})); }
    function heading(t) { return el('div', { class: 'rpm-heading rpm-sheet-h', text: t }); }
    // one toast at a time: a new message replaces the current one
    let toastEl = null, toastTimer = null;
    function toast(msg, isErr) {
        if (!toastEl || !toastEl.isConnected) { toastEl = el('div', { class: 'rpm-themed rpm-toast', role: 'status' }); document.body.appendChild(toastEl); }
        toastEl.textContent = msg; toastEl.classList.toggle('rpm-toast-err', !!isErr);
        clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl && toastEl.remove(); toastEl = null; }, 2600);
    }

    // ---- spells on the sheet ------------------------------------------------------------------
    // The chosen and always-prepared spells by level: text on demand, spell attack / damage rolls,
    // save DC, Cast (uses the lowest free slot of the spell's level or higher; cantrips need none),
    // free casts of species/Magic Initiate spells, restoring slots, and — for builder sheets —
    // changing the spells (kept in sheet.build.spells too, so level up keeps them).
    function logSpell(what) {
        const L = Log(); if (!L) return;
        const e = L.add({ who: V.name, what, kind: 'spell' }); toast(L.describe(e));
    }
    function castSpell(sv, entry, D) {
        const sc = V.draft.spellcasting;
        if (!sv.level) { logSpell(`casts ${sv.name}.`); return; }
        const lvl = SP.slotFor(sv.level, sc.slots, sc.used);
        if (!lvl) { toast(`No spell slot of level ${sv.level} or higher left${entry.free ? ' — use the free cast' : ''}.`, true); return; }
        const u = sc.used = (sc.used || []).slice(); while (u.length < lvl) u.push(0); u[lvl - 1] = (u[lvl - 1] || 0) + 1;
        edited(); logSpell(`casts ${sv.name} (level ${lvl} spell slot).`);
    }
    function freeCast(sv, entry, D) {
        const sc = V.draft.spellcasting; const f = sc.freeUsed = Object.assign({}, sc.freeUsed);
        f[entry.key] = (f[entry.key] || 0) + 1; edited();
        logSpell(`casts ${sv.name} without a spell slot (${entry.source}).`);
    }
    function spellsSection(D, s) {
        const sp = D.spell, box = el('div', { class: 'rpm-sheet-spells', 'data-spells': 'sheet' });
        const entries = [
            ...sp.cantripsKnown.map(k => ({ key: k, ability: sp.ability })),
            ...sp.preparedSpells.map(k => ({ key: k, ability: sp.ability })),
            ...sp.granted.map(g => ({ key: g.key, ability: g.ability || sp.ability, source: g.source, free: g.free })),
        ].filter(e => SP.spell(e.key)).sort((a, b) => SP.spell(a.key).level - SP.spell(b.key).level || SP.spell(a.key).name.localeCompare(SP.spell(b.key).name));
        const freeUsed = (s.spellcasting && s.spellcasting.freeUsed) || {};
        let last = -1;
        for (const e of entries) {
            const sv = SP.spell(e.key), nums = SP.castingNumbers(s.abilities, e.ability, D.pb);
            if (sv.level !== last) { last = sv.level; box.appendChild(el('div', { class: 'rpm-spell-lvl', text: sv.level ? `Level ${sv.level}` : 'Cantrips' })); }
            const freeMax = e.free === 'pb' ? D.pb : e.free === 'long' ? 1 : 0, freeLeft = freeMax - (Number(freeUsed[e.key]) || 0);
            const dmg = sv.damage ? SP.cantripDamage(sv, s.level) : '';
            box.appendChild(el('div', { class: 'rpm-sheet-spell', 'data-spell': e.key }, [
                el('details', { class: 'rpm-gal-sec rpm-grow' }, [el('summary', {}, [el('strong', { text: sv.name }), el('span', { class: 'rpm-muted', text: ` ${spellTags(sv)}${e.source ? ' · ' + e.source : ''}` })]), spellDetails(sv)]),
                el('div', { class: 'rpm-row rpm-sheet-spell-btns' }, [
                    sv.attack ? btn('Hit ' + fmt(nums.attack), () => rollD20(`${sv.name} (spell attack)`, nums.attack, 'attack'), { roll: 'spell-hit-' + e.key, title: 'Roll the spell attack' }) : null,
                    sv.save ? el('span', { class: 'rpm-chip', title: 'The target makes this saving throw', text: `DC ${nums.dc} ${sv.save.toUpperCase()}` }) : null,
                    dmg ? btn('Dmg', () => rollExpr(`${sv.name} damage (${sv.damageType})`, dmg, 'damage'), { roll: 'spell-dmg-' + e.key, title: `Roll damage (${dmg} ${sv.damageType})` }) : null,
                    sv.heal ? btn('Heal', () => { const m = D.mods[e.ability] || 0; rollExpr(`${sv.name} healing`, sv.heal.replace('+mod', m ? (m > 0 ? '+' + m : String(m)) : ''), 'heal'); }, { roll: 'spell-heal-' + e.key, title: `Roll healing (${sv.heal.replace('+mod', ' + ' + (e.ability || '').toUpperCase())})` }) : null,
                    btn('Cast', () => castSpell(sv, e, D), { roll: 'cast-' + e.key, title: sv.level ? 'Cast it: uses a spell slot and tells the AI' : 'Cast it (tells the AI)' }),
                    freeMax ? btn(`Free ${Math.max(0, freeLeft)}/${freeMax}`, () => freeCast(sv, e, D), { roll: 'free-' + e.key, title: 'Cast without a spell slot (back after a Long Rest)', cls: freeLeft > 0 ? '' : 'rpm-off' }) : null,
                ]),
            ]));
            const fb = box.querySelector(`[data-roll="free-${e.key}"]`); if (fb && freeLeft <= 0) fb.disabled = true;
        }
        if (!entries.length) box.appendChild(el('p', { class: 'rpm-muted', text: 'No spells chosen yet.' + (s.build ? ' Use "Change spells".' : ' Write them in the notes below.') }));
        const hasUsed = (s.spellcasting.used || []).some(Boolean) || Object.values(freeUsed).some(Boolean);
        box.appendChild(el('div', { class: 'rpm-row', style: 'flex-wrap:wrap;margin-top:4px' }, [
            s.build ? btn(V.manage ? 'Done' : 'Change spells', () => { V.manage = !V.manage; render(); }, { icon: V.manage ? null : 'sparkles', title: 'Choose cantrips and prepared spells (SRD 5.2.1 lists)', roll: 'manage-spells' }) : null,
            hasUsed ? btn('Restore slots (Long Rest)', () => { V.draft.spellcasting.used = []; V.draft.spellcasting.freeUsed = {}; edited(); logSpell('finishes a Long Rest: spell slots restored.'); }, { roll: 'restore-slots' }) : null,
        ]));
        if (V.manage && s.build) box.appendChild(spellManager(s));
        return box;
    }
    // Change spells on a builder sheet (the same rules and limits as the builder).
    function spellManager(s) {
        const b = V.draft.build;
        b.spells = Object.assign({ cantrips: [], prepared: [], spellbook: [] }, b.spells || {}, {
            cantrips: s.spellcasting.cantripsKnown, prepared: s.spellcasting.preparedSpells, spellbook: s.spellcasting.spellbook });
        const ctx = BR.spellContext(b), lim = SP.spellLimits(ctx), granted = new Set(SP.grantedSpells(ctx).map(g => g.key));
        const apply = (patch) => {
            Object.assign(b.spells, patch);
            if (patch.spellbook) b.spells.prepared = b.spells.prepared.filter(k => patch.spellbook.includes(k));
            const sc = V.draft.spellcasting;
            sc.cantripsKnown = b.spells.cantrips.slice(); sc.preparedSpells = b.spells.prepared.slice(); sc.spellbook = b.spells.spellbook.slice();
            sc.granted = SP.grantedSpells(BR.spellContext(b));
            edited();
        };
        V.spellSearch = V.spellSearch || {};
        const box = el('div', { class: 'rpm-bld-detail', 'data-spells': 'manage' });
        if (b.class === 'druid' && s.level >= 3) {
            const sel = el('select', { class: 'form-control rpm-input', 'aria-label': 'Land type' });
            sel.appendChild(el('option', { value: '', text: '— land type —' }));
            for (const t of SP.LAND_TYPES) { const o = el('option', { value: t, text: t.charAt(0).toUpperCase() + t.slice(1) }); if (t === b.landType) o.selected = true; sel.appendChild(o); }
            sel.addEventListener('change', () => { b.landType = sel.value || undefined; apply({}); });
            box.appendChild(field('Circle of the Land (after a Long Rest)', sel));
        }
        if (!lim.caster) { box.appendChild(el('p', { class: 'rpm-muted', text: 'Your class has no spell list; species and feat spells come from the builder.' })); return box; }
        const opt = (label, title) => ({ label, title, search: V.spellSearch });
        if (lim.cantrips) box.appendChild(spellPicker(SP.classSpells(b.class, { maxLevel: 0 }).filter(x => !granted.has(x.key)), b.spells.cantrips, lim.cantrips, v => apply({ cantrips: v }), opt('Sheet cantrips', `Cantrips — ${lim.cantrips}`)));
        if (lim.maxLevel) {
            const leveled = SP.classSpells(b.class, { minLevel: 1, maxLevel: lim.maxLevel }).filter(x => !granted.has(x.key));
            if (lim.spellbook) box.appendChild(spellPicker(leveled, b.spells.spellbook, lim.spellbook, v => apply({ spellbook: v }), opt('Sheet spellbook', `Spellbook — ${lim.spellbook}`)));
            const from = lim.spellbook ? leveled.filter(x => b.spells.spellbook.includes(x.key)) : leveled;
            box.appendChild(spellPicker(from, b.spells.prepared, lim.prepared, v => apply({ prepared: v }), opt('Sheet prepared', `Prepared spells — ${lim.prepared}`)));
        }
        const errs = SP.spellErrors(BR.spellContext(b));
        if (errs.length) box.appendChild(el('ul', { class: 'rpm-bld-errors', role: 'alert' }, errs.map(x => el('li', { text: x }))));
        return box;
    }

    // ---- render -------------------------------------------------------------------------------
    // Re-rendering after a change must not steal keyboard focus: remember the focused
    // control's position among the focusable controls and restore it afterwards.
    const FOCUSABLE = 'input, select, textarea, button';
    function render() {
        const box = V.box; if (!box) return;
        const a = document.activeElement;
        const focusIdx = a && box.contains(a) ? [...box.querySelectorAll(FOCUSABLE)].indexOf(a) : -1;
        let sel = null; try { if (a && a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd]; } catch (_) {}
        renderInto(box);
        if (focusIdx < 0) return;
        const t = box.querySelectorAll(FOCUSABLE)[focusIdx]; if (!t) return;
        try {
            t.focus({ preventScroll: true });
            // keep the caret/selection (Tab selects the next field's text; number inputs
            // have no selection API, so select them whole like Tab does)
            if (sel && t.setSelectionRange) t.setSelectionRange(sel[0], sel[1]);
            else if (t.tagName === 'INPUT' && t.select) t.select();
        } catch (_) {}
    }
    function renderInto(box) {
        clear(box);
        const root = el('div', { class: 'rpm-sheet', 'data-sheet': V.name || '' });
        box.appendChild(root);

        // header: character + save state
        const names = characterNames();
        const sel = el('select', { class: 'form-control rpm-input rpm-grow', 'aria-label': 'Character' });
        sel.appendChild(el('option', { value: '', text: names.length ? '— choose a character —' : '(no characters in the Library)' }));
        for (const n of names) { const o = el('option', { value: n, text: n + (n === personaName() ? ' (your persona)' : '') }); if (n === V.name) o.selected = true; sel.appendChild(o); }
        sel.addEventListener('change', () => select(sel.value));
        const head = el('div', { class: 'rpm-row' }, [sel]);
        if (V.draft) {
            const d = dirty(), auto = autosave();
            const saveBtn = btn(d ? (auto ? 'Saving…' : 'Save •') : 'Saved', () => save(), { variant: 'success', title: d ? 'Save the sheet into the card' : 'All changes saved', cls: d && !auto ? 'rpm-unsaved' : '' });
            saveBtn.setAttribute('data-save', 'sheet');
            const revertBtn = btn('Revert', () => revert(), { title: 'Undo unsaved changes' });
            revertBtn.setAttribute('data-revert', 'sheet'); revertBtn.hidden = !d || auto;
            head.append(revertBtn, saveBtn);
        }
        root.appendChild(head);

        if (V.loading) { root.appendChild(el('div', { class: 'rpm-muted', text: 'Loading…' })); return; }
        if (V.error) { root.appendChild(el('div', { class: 'rpm-muted', text: V.error })); return; }
        if (!V.name) { root.appendChild(el('p', { class: 'rpm-muted', text: 'Choose a character from your Library. Their sheet is stored inside the character card, so it travels with it when you export the card.' })); return; }
        if (!V.draft) {
            root.appendChild(el('p', { class: 'rpm-muted', text: `${V.name} has no character sheet yet.` }));
            const row = el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, [
                window.KLITE_RPMod_Builder ? btn('Build with the SRD rules', () => window.KLITE_RPMod_Builder.open({ target: V.name, name: V.name }), { icon: 'sparkles', title: 'Step-by-step builder: class, background, species, abilities, skills, equipment' }) : null,
                btn('Create sheet', () => createSheet(null), { icon: 'plus', title: 'An empty sheet you fill in yourself' })]);
            const ws = worldStatsFor(V.name);
            if (ws) row.appendChild(btn('Create from world stats', () => createSheet(fromCombatStats(ws)), { title: 'Use the d20 stat block this person has in the active world' }));
            root.appendChild(row);
            return;
        }

        const D = derive(V.draft); const s = D.sheet;
        const set = (mutate) => (v) => { mutate(v); edited(); };

        // roll mode
        const modes = [[null, 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']];
        root.appendChild(el('div', { class: 'rpm-row rpm-sheet-modes', role: 'radiogroup', 'aria-label': 'd20 roll mode' }, modes.map(([m, t]) =>
            el('button', { type: 'button', role: 'radio', 'aria-checked': String(V.mode === m), class: 'btn btn-primary rpm-btn' + (V.mode === m ? ' rpm-on' : ''), text: t, onclick: () => { V.mode = m; render(); } }))));

        // identity
        root.appendChild(el('div', { class: 'rpm-sheet-grid4' }, [
            field('Species', textIn(s.species, set(v => { V.draft.species = v; }))),
            field('Class', textIn(s.className, set(v => { V.draft.className = v; }))),
            field('Level', numIn(s.level, set(v => { V.draft.level = v; }), { min: 1, max: 20 })),
            field('Background', textIn(s.background, set(v => { V.draft.background = v; }))),
        ]));
        root.appendChild(el('div', { class: 'rpm-row', style: 'margin:2px 0 6px;flex-wrap:wrap' }, [
            el('span', { class: 'rpm-muted rpm-grow', text: `Proficiency bonus ${fmt(D.pb)} · XP ${s.xp}${s.alignment ? ' · ' + s.alignment : ''}` }),
            s.build && s.level < 20 && window.KLITE_RPMod_Builder ? btn('Level up', () => {
                if (dirty() && !confirm('Level up uses the saved sheet; discard unsaved changes?')) return;
                window.KLITE_RPMod_Builder.levelUp(V.name);
            }, { icon: 'sparkles', title: `Rebuild at level ${s.level + 1} with the builder (keeps inventory, coins and notes)` }) : null,
        ]));

        // abilities
        root.appendChild(heading('Abilities'));
        root.appendChild(el('div', { class: 'rpm-sheet-abilities' }, ABILITIES.map(a => el('div', { class: 'rpm-sheet-ability' }, [
            el('div', { class: 'rpm-label', text: ABILITY_NAMES[a] }),
            btn(fmt(D.mods[a]), () => rollD20(ABILITY_NAMES[a] + ' check', D.mods[a], 'check'), { title: `Roll a ${ABILITY_NAMES[a]} check`, roll: 'check-' + a, cls: 'rpm-sheet-mod' }),
            numIn(s.abilities[a], set(v => { V.draft.abilities[a] = v; }), { min: 1, max: 30, 'aria-label': ABILITY_NAMES[a] + ' score' }),
        ]))));

        // combat line
        root.appendChild(heading('Combat'));
        root.appendChild(el('div', { class: 'rpm-sheet-grid4' }, [
            field('Armor Class', numIn(s.ac, set(v => { V.draft.ac = v; }))),
            field('Speed', numIn(s.speed, set(v => { V.draft.speed = v; }))),
            field('Initiative', btn(fmt(D.initiative), () => rollD20('Initiative', D.initiative, 'initiative'), { roll: 'initiative', title: 'Roll initiative' })),
            field('Passive Perception', el('div', { class: 'rpm-sheet-static', text: String(D.passivePerception) })),
        ]));
        if (s.acNote) root.appendChild(el('div', { class: 'rpm-muted', text: 'AC: ' + s.acNote }));
        if (s.extras) {   // rules the builder applies (Alert, Jack of All Trades, Thaumaturge/Magician)
            const ex = s.extras, bits = [];
            if (ex.alert) bits.push(`Alert: +${D.pb} to Initiative`);
            if (ex.jackOfAllTrades) bits.push(`Jack of All Trades: +${Math.floor(D.pb / 2)} to skill checks without proficiency`);
            const sb = Object.entries(ex.skillBonus || {});
            if (sb.length) bits.push(`${sb.map(([k]) => (SKILLS.find(x => x.id === k) || {}).name).join(' and ')}: +${ABILITY_NAMES[sb[0][1]]} modifier (min +1)`);
            if (bits.length) root.appendChild(el('div', { class: 'rpm-muted', 'data-extras': '1', text: bits.join(' · ') }));
        }
        root.appendChild(el('div', { class: 'rpm-sheet-grid4' }, [
            field('HP', numIn(s.hp.current, set(v => { V.draft.hp.current = v; }), { 'aria-label': 'Current hit points' })),
            field('HP max', numIn(s.hp.max, set(v => { V.draft.hp.max = v; }))),
            field('Temp HP', numIn(s.hp.temp, set(v => { V.draft.hp.temp = v; }))),
            field('XP', numIn(s.xp, set(v => { V.draft.xp = v; }))),
        ]));

        // saves + skills
        const profBox = (checked, onToggle, label) => { const c = el('input', { type: 'checkbox', 'aria-label': label }); c.checked = checked; c.addEventListener('change', () => onToggle(c.checked)); return c; };
        root.appendChild(heading('Saving throws'));
        root.appendChild(el('div', { class: 'rpm-sheet-list' }, ABILITIES.map(a => el('div', { class: 'rpm-sheet-line' }, [
            profBox(s.saves.includes(a), set(on => { V.draft.saves = on ? [...V.draft.saves, a] : V.draft.saves.filter(x => x !== a); }), ABILITY_NAMES[a] + ' save proficiency'),
            el('span', { class: 'rpm-grow', text: ABILITY_NAMES[a] }),
            btn(fmt(D.saves[a]), () => rollD20(ABILITY_NAMES[a] + ' saving throw', D.saves[a], 'save'), { roll: 'save-' + a, title: 'Roll the saving throw', cls: 'rpm-sheet-mod' }),
        ]))));
        root.appendChild(heading('Skills'));
        root.appendChild(el('div', { class: 'rpm-sheet-list rpm-sheet-skills' }, SKILLS.map(k => {
            const lvl = s.skills[k.id] || 0;
            const tog = el('button', { type: 'button', class: 'rpm-iconbtn rpm-sheet-prof', 'data-prof': String(lvl), title: ['Not proficient', 'Proficient', 'Expertise'][lvl] + ' — click to change', 'aria-label': `${k.name}: ${['not proficient', 'proficient', 'expertise'][lvl]}`, text: ['○', '●', '◎'][lvl],
                onclick: () => { const n = (lvl + 1) % 3; if (n) V.draft.skills[k.id] = n; else delete V.draft.skills[k.id]; edited(); } });
            return el('div', { class: 'rpm-sheet-line' }, [tog, el('span', { class: 'rpm-grow' }, [k.name + ' ', el('span', { class: 'rpm-muted', text: k.ability.toUpperCase() })]),
                btn(fmt(D.skills[k.id]), () => rollD20(k.name + ' check', D.skills[k.id], 'skill'), { roll: 'skill-' + k.id, title: 'Roll ' + k.name, cls: 'rpm-sheet-mod' })]);
        })));

        // attacks
        root.appendChild(heading('Attacks'));
        D.attacks.forEach((a, i) => {
            const abSel = el('select', { class: 'form-control rpm-input', 'aria-label': 'Attack ability' });
            for (const ab of ABILITIES) { const o = el('option', { value: ab, text: ab.toUpperCase() }); if (ab === a.ability) o.selected = true; abSel.appendChild(o); }
            abSel.addEventListener('change', () => { V.draft.attacks[i].ability = abSel.value; edited(); });
            root.appendChild(el('div', { class: 'rpm-sheet-line rpm-sheet-attack' }, [
                textIn(a.name, set(v => { V.draft.attacks[i].name = v; }), { 'aria-label': 'Attack name' }), abSel,
                textIn(a.damage, set(v => { V.draft.attacks[i].damage = v; }), { placeholder: '1d8+3', 'aria-label': 'Damage dice' }),
                btn('Hit ' + fmt(a.toHit), () => rollD20(a.name + ' attack', a.toHit, 'attack'), { roll: 'attack-' + i, title: 'Roll to hit' }),
                btn('Dmg', () => rollExpr(a.name + ' damage', a.damage || '1d4', 'damage'), { roll: 'damage-' + i, title: 'Roll damage (' + (a.damage || '1d4') + ')' }),
                el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove attack', 'aria-label': 'Remove ' + a.name, onclick: () => { V.draft.attacks.splice(i, 1); edited(); } }, [icon('trash-2', 14)]),
            ]));
        });
        const atkName = el('input', { type: 'text', class: 'form-control rpm-input rpm-grow', placeholder: 'e.g. Longsword', 'aria-label': 'New attack' });
        root.appendChild(el('div', { class: 'rpm-row', style: 'margin-top:4px' }, [atkName, btn('', () => {
            const n = atkName.value.trim(); if (!n) return; V.draft.attacks.push({ name: n, ability: 'str', proficient: true, damage: '1d8', notes: '' }); edited();
        }, { icon: 'plus', title: 'Add attack' })]));

        // spellcasting (from the builder)
        if (D.spell) {
            const sp = D.spell;
            root.appendChild(heading('Spellcasting'));
            root.appendChild(el('div', { class: 'rpm-sheet-grid4' }, [
                field('Ability', el('div', { class: 'rpm-sheet-static', text: ABILITY_NAMES[sp.ability] })),
                field('Save DC', el('div', { class: 'rpm-sheet-static', text: String(sp.saveDC) })),
                field('Spell attack', btn(fmt(sp.attack), () => rollD20('Spell attack', sp.attack, 'attack'), { roll: 'spell-attack', title: 'Roll a spell attack' })),
                field('Cantrips / prepared', el('div', { class: 'rpm-sheet-static', text: `${sp.cantripsKnown.length}/${sp.cantrips} · ${sp.preparedSpells.length}/${sp.prepared}` })),
            ]));
            const slotRow = el('div', { class: 'rpm-row', style: 'flex-wrap:wrap;margin-top:4px' });
            sp.slots.forEach((n, i) => {
                if (!n) return;
                const used = (sp.used && sp.used[i]) || 0;
                slotRow.appendChild(el('span', { class: 'rpm-label', text: `${sp.pact ? `Pact slots (level ${i + 1})` : 'Level ' + (i + 1)}:` }));
                for (let k = 0; k < n; k++) {
                    const c = el('input', { type: 'checkbox', 'aria-label': `${sp.pact ? 'Pact' : 'Level ' + (i + 1)} slot ${k + 1} used` });
                    c.checked = k < used;
                    c.addEventListener('change', () => { const u = (V.draft.spellcasting.used = V.draft.spellcasting.used || []); u[i] = [...slotRow.querySelectorAll(`input[data-slot="${i}"]`)].filter(x => x.checked).length; edited(); });
                    c.setAttribute('data-slot', String(i));
                    slotRow.appendChild(c);
                }
            });
            if (slotRow.children.length) root.appendChild(slotRow);
            root.appendChild(spellsSection(D, s));
            const spells = el('textarea', { class: 'form-control rpm-input', rows: 2, 'aria-label': 'Other spells and notes', placeholder: 'Other spells and notes (e.g. from items or a scroll)' });
            spells.value = sp.spells || '';
            spells.addEventListener('change', () => { V.draft.spellcasting.spells = spells.value; edited(); });
            root.appendChild(spells);
        }
        if (s.proficiencies) { root.appendChild(heading('Proficiencies')); root.appendChild(el('div', { class: 'rpm-gal-text', text: s.proficiencies })); }

        // inventory + coins
        root.appendChild(heading('Inventory'));
        s.inventory.forEach((it, i) => root.appendChild(el('div', { class: 'rpm-sheet-line' }, [
            textIn(it.name, set(v => { V.draft.inventory[i].name = v; }), { class: 'form-control rpm-input rpm-grow', 'aria-label': 'Item name' }),
            numIn(it.qty, set(v => { V.draft.inventory[i].qty = v; }), { class: 'form-control rpm-input rpm-sheet-qty', min: 1, 'aria-label': 'Quantity' }),
            el('button', { type: 'button', class: 'rpm-iconbtn', title: 'Remove item', 'aria-label': 'Remove ' + it.name, onclick: () => { V.draft.inventory.splice(i, 1); edited(); } }, [icon('trash-2', 14)]),
        ])));
        const itemName = el('input', { type: 'text', class: 'form-control rpm-input rpm-grow', placeholder: 'Add an item', 'aria-label': 'New item' });
        root.appendChild(el('div', { class: 'rpm-row', style: 'margin-top:4px' }, [itemName, btn('', () => {
            const n = itemName.value.trim(); if (!n) return; V.draft.inventory.push({ name: n, qty: 1, notes: '' }); edited();
        }, { icon: 'plus', title: 'Add item' })]));
        root.appendChild(el('div', { class: 'rpm-sheet-grid4', style: 'margin-top:6px' }, ['cp', 'sp', 'gp', 'pp'].map(c =>
            field(c.toUpperCase(), numIn(s.coins[c], set(v => { V.draft.coins[c] = v; }), { min: 0 })))));

        // notes
        root.appendChild(heading('Features & notes'));
        const area = (value, onChange, label) => { const t = el('textarea', { class: 'form-control rpm-input', rows: 3, 'aria-label': label }); t.value = value; t.addEventListener('change', () => onChange(t.value)); return t; };
        root.appendChild(area(s.features, set(v => { V.draft.features = v; }), 'Features and traits'));
        root.appendChild(area(s.notes, set(v => { V.draft.notes = v; }), 'Notes'));
    }

    // A Worlds person with the same name (or linked to this card) and a stat block.
    function worldStatsFor(name) {
        try {
            const W = window.KLITE_RPMod_Worlds; const w = W && W.activeWorld && W.activeWorld();
            if (!w) return null;
            const n = String(name).toLowerCase();
            const p = (w.npcs || []).find(x => x && x.stats && ((x.characterRef && String(x.characterRef.name || '').toLowerCase() === n) || String(x.name || '').toLowerCase() === n));
            return p ? p.stats : null;
        } catch (_) { return null; }
    }

    // ---- shell window ------------------------------------------------------------------
    function beforeClose() {
        if (!dirty() || autosave()) return true;
        const choice = confirm(`Save the changes to ${V.name}'s sheet before closing?\n\nOK = save and close · Cancel = close and discard them`);
        if (choice) { save().then(() => Shell()?.close('sheet', { force: true })); return false; }
        V.draft = V.saved ? normalizeSheet(V.saved) : null;
        return true;
    }
    function register() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({
            id: 'sheet', title: 'Character sheet', place: 'window', window: { width: 560, height: 680, minWidth: 320, minHeight: 300 },
            mount: (c) => { V.box = c; if (V.name && V.draft) render(); else select(V.name || defaultName()); },
            unmount: () => { V.box = null; clearTimeout(V.timer); V.timer = null; },
            beforeClose,
        });
        try {
            window.KLITE_RPMod_Settings?.registerSetting({
                id: AUTOSAVE_SETTING, section: 'Characters', order: 10, default: false, label: 'Autosave character sheets',
                help: 'Saves sheet changes into the character card automatically, about a second after each change. Off: changes stay a draft until you press Save (or Revert).',
            });
        } catch (_) {}
        window.addEventListener('klite:sheet-change', (e) => {
            if (!V.box || !e.detail || e.detail.name !== V.name) return;
            const s = cachedSheet(V.name); if (!s) return;
            if (!dirty()) { V.saved = normalizeSheet(s); V.draft = normalizeSheet(s); render(); return; }
            // unsaved edits: take the game's changes (items, coins, XP, HP) into the draft for
            // every field the player has not edited, so Save does not undo a quest reward
            const fresh = normalizeSheet(s);
            for (const key of GAME_FIELDS) {
                if (JSON.stringify(V.draft[key]) === JSON.stringify(V.saved[key])) V.draft[key] = JSON.parse(JSON.stringify(fresh[key]));
            }
            V.saved = fresh; render();
        });
        return true;
    }

    const api = {
        open(name) { const sh = Shell(); if (!sh) return false; if (name && name !== V.name) { V.name = null; V.draft = null; select(name); } sh.open('sheet'); return true; },
        loadSheet, saveSheet, cachedSheet, combatStatsFor, summaryFor, blurbFor, updateSheet, flushSheet,
        combatSpellsFor, spendSpell, longRestSheet,
        // the player's persona (Tools panel): name when chosen and enabled, else ''
        personaName: () => { try { const T = window.KLITE_RPMod?.panels?.TOOLS; return (T && T.personaEnabled && T.selectedPersona && T.selectedPersona.name) || ''; } catch (_) { return ''; } },
        current: () => ({ name: V.name, sheet: V.draft ? normalizeSheet(V.draft) : null, dirty: dirty() }),
    };
    window.KLITE_RPMod_Characters = api;

    let tries = 0;
    const attempt = () => { if (!register() && ++tries < 120) setTimeout(attempt, 250); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt, { once: true });   // once: a second load event must not start it again
}
