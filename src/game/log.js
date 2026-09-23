// =============================================================================
// KLITE RPmod — Dice + game log
// -----------------------------------------------------------------------------
// roll('1d20+5', { mode: 'adv'|'dis' }) → { expr, dice, rolls, kept, modifier, total, natural }.
// The game log records rolls (from the character sheet, later combat and chat) per story:
// saved in the story file under `rpmod_log` (additive key, last 200 entries), shown in the
// left dock, and the rolls made since the AI's last turn go into its context ('gamelog'
// provider of src/context) so the game master can react to them.
// Public API: window.KLITE_RPMod_Log.
// =============================================================================
import { getContext } from '../context/context.js';
import { el, clear } from '../shell/dom.js';

const SAVE_KEY = 'rpmod_log';
const MAX_ENTRIES = 200;

// ---- dice ---------------------------------------------------------------------------
const DICE = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i;
const FLAT = /^\s*([+-]?\s*\d+)\s*$/;
function die(sides) { return 1 + Math.floor(Math.random() * sides); }

export function roll(expr, opts) {
    const mode = opts && opts.mode;
    const text = String(expr || '').replace(/\s+/g, '');
    let m = DICE.exec(text);
    if (!m) {
        const f = FLAT.exec(text);
        if (!f) throw new Error('Cannot roll "' + expr + '" (use e.g. 1d20+3 or 2d6)');
        const modifier = Number(f[1].replace(/\s+/g, ''));
        return { expr: text, dice: '', rolls: [], kept: [], modifier, total: modifier, natural: null };
    }
    const count = Math.min(100, Math.max(1, Number(m[1] || 1)));
    const sides = Math.min(1000, Math.max(2, Number(m[2])));
    const modifier = m[3] ? Number(m[3].replace(/\s+/g, '')) : 0;
    let rolls = Array.from({ length: count }, () => die(sides));
    let kept = rolls.slice();
    if (count === 1 && sides === 20 && (mode === 'adv' || mode === 'dis')) {
        rolls = [rolls[0], die(20)];
        kept = [mode === 'adv' ? Math.max(...rolls) : Math.min(...rolls)];
    }
    const total = kept.reduce((a, b) => a + b, 0) + modifier;
    return { expr: text, dice: `${count}d${sides}`, rolls, kept, modifier, total, natural: count === 1 && sides === 20 ? kept[0] : null, mode: mode || null };
}
export const d20 = (mod, opts) => roll('1d20' + (mod ? (mod > 0 ? '+' + mod : String(mod)) : ''), opts);

// ---- log ----------------------------------------------------------------------------
export default function initGameLog() {
    'use strict';
    if (window.KLITE_RPMod_Log) return;

    const state = { entries: [], lastTurnIndex: 0 };

    function describe(e) {
        const r = e.roll;
        const detail = r ? (r.rolls.length > 1 || r.modifier ? ` (${r.mode ? r.mode + ' ' : ''}${r.rolls.join(r.mode ? '/' : '+')}${r.modifier ? (r.modifier > 0 ? '+' : '') + r.modifier : ''})` : '') : '';
        const nat = r && r.natural === 20 ? ' — natural 20!' : r && r.natural === 1 ? ' — natural 1' : '';
        return `${e.who ? e.who + ': ' : ''}${e.what}${r ? ` = ${r.total}${detail}${nat}` : ''}`;
    }
    function changed() { try { window.dispatchEvent(new CustomEvent('klite:log-change')); } catch (_) {} try { window.KLITE_RPMod_Shell?.refresh(['gamelog'], { soft: true }); } catch (_) {} }

    // add({ who, what, roll?, kind? }) → entry
    function add(entry) {
        const e = { t: Date.now(), who: String(entry.who || ''), what: String(entry.what || ''), kind: entry.kind || 'roll', roll: entry.roll || null };
        state.entries.push(e);
        if (state.entries.length > MAX_ENTRIES) {
            const cut = state.entries.length - MAX_ENTRIES;
            state.entries.splice(0, cut); state.lastTurnIndex = Math.max(0, state.lastTurnIndex - cut);
        }
        changed();
        return e;
    }
    // Roll and log in one step: rollAndLog({ who, what, expr, mode, kind })
    function rollAndLog({ who, what, expr, mode, kind }) { return add({ who, what, kind, roll: roll(expr, { mode }) }); }
    function sinceLastTurn() { return state.entries.slice(state.lastTurnIndex); }
    function clearLog() { state.entries = []; state.lastTurnIndex = 0; changed(); }

    // ---- AI context: rolls since the last turn -----------------------------------------
    getContext().register({
        id: 'gamelog', order: 60,
        enabled: () => state.entries.length > state.lastTurnIndex,
        collect: () => {
            const lines = sinceLastTurn().map(e => '- ' + describe(e));
            return lines.length ? [{ title: 'Rolls and combat since your last reply', priority: 92, text: lines.join('\n') }] : [];
        },
        afterTurn: () => { state.lastTurnIndex = state.entries.length; },
    });

    // ---- story file: additive key -------------------------------------------------------
    function installSaveHooks() {
        let ok = true;
        if (typeof window.generate_savefile === 'function' && !window.generate_savefile.__rpmod_log) {
            const orig = window.generate_savefile;
            const wrapped = function () {
                const obj = orig.apply(this, arguments);
                try { if (obj && state.entries.length) obj[SAVE_KEY] = { version: 1, entries: state.entries.slice(-MAX_ENTRIES), lastTurnIndex: state.lastTurnIndex }; } catch (_) {}
                return obj;
            };
            wrapped.__rpmod_log = true; window.generate_savefile = wrapped;
        } else if (typeof window.generate_savefile !== 'function') ok = false;
        if (typeof window.kai_json_load === 'function' && !window.kai_json_load.__rpmod_log) {
            const orig = window.kai_json_load;
            const wrapped = function (storyobj) {
                const res = orig.apply(this, arguments);
                try {
                    const saved = storyobj && storyobj[SAVE_KEY];
                    state.entries = saved && Array.isArray(saved.entries) ? saved.entries.filter(e => e && typeof e === 'object').slice(-MAX_ENTRIES) : [];
                    state.lastTurnIndex = saved ? Math.min(state.entries.length, Math.max(0, Number(saved.lastTurnIndex) || 0)) : 0;
                    changed();
                } catch (_) {}
                return res;
            };
            wrapped.__rpmod_log = true; window.kai_json_load = wrapped;
        } else if (typeof window.kai_json_load !== 'function') ok = false;
        return ok;
    }

    // ---- left dock section --------------------------------------------------------------
    function renderLog(box) {
        clear(box);
        const last = state.entries.slice(-8).reverse();
        if (!last.length) { box.appendChild(el('div', { class: 'rpm-muted', text: 'No rolls yet. Click a value on a character sheet to roll.' })); return; }
        for (const e of last) {
            const crit = e.roll && e.roll.natural === 20, fumble = e.roll && e.roll.natural === 1;
            box.appendChild(el('div', { class: 'rpm-log-line' + (crit ? ' rpm-log-crit' : fumble ? ' rpm-log-fumble' : ''), 'data-log': e.kind }, [describe(e)]));
        }
        box.appendChild(el('button', { type: 'button', class: 'btn btn-primary rpm-btn', style: 'margin-top:6px', text: 'Clear log', onclick: () => { if (confirm('Clear the game log of this story?')) clearLog(); } }));
    }

    const api = { roll, d20, add, rollAndLog, entries: () => state.entries.slice(), sinceLastTurn, clear: clearLog, describe };
    window.KLITE_RPMod_Log = api;

    let tries = 0;
    const attempt = () => {
        const saves = installSaveHooks();
        const sh = window.KLITE_RPMod_Shell;
        if (sh && !sh.views().includes('gamelog')) sh.registerView({ id: 'gamelog', title: 'Dice log', place: 'left', order: 30, mount: renderLog, update: renderLog });
        if ((!saves || !sh) && ++tries < 120) setTimeout(attempt, 250);
    };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt);
}
