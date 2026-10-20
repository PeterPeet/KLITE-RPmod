// =============================================================================
// KLITE RPmod — where Esolite puts World Info in the prompt
// -----------------------------------------------------------------------------
// RPmod's context (world slice, fight, rolls since the last reply, outcome) travels as World Info.
// With Esolite's default "After Memory" it sits at the very top, before the whole chat, and models
// follow the recent chat over it (real-backend play test 2026-10-20: a wolf the AI had narrated
// earlier was "still circling" although RPmod reported both dead). RPmod needs World Info
// "Before A/N" with the Author's Note placed "Turn based", 1 user turn before the end (Esolite's
// js/authorNotePositioningUtils.js: right before the player's newest message) — owner's decision
// 2026-10-20. ("Strong", 160 characters before the end, cut longer player messages in half: the model
// read "They [World: …] then push through the door" and wondered whether a system prompt was pasted.)
// Hosts without "Turn based" (no anTurnOffset) keep "Strong".
//
// The values are story settings in Esolite (`var wi_insertlocation`, `anote_strength`, `anTurnOffset`,
// `anTurnType`, saved in the story file) and New Session (restart_new_game) resets them. So RPmod checks at start-up, after a
// story is loaded and after every new session: when they are not set, it asks once (Esolite's Yes/No
// box). Yes → set now and keep them set from then on (setting `context_placement_auto`); No → not
// asked again until the page is reloaded. The setting can be switched off in Settings → RPmod.
// =============================================================================

export const AUTO_SETTING = 'context_placement_auto';
export const WI_BEFORE_AN = 1;        // Esolite's "Before A/N"
export const AN_TURN = 'turn';        // Esolite's "Turn based" …
export const TURN_OFFSET = 1;         // … 1 turn before the end …
export const TURN_TYPE = 'user';      // … counting the player's turns: right before the newest player message
export const AN_STRONG = 160;         // older hosts: "Strong", 160 characters before the end
export const QUESTION = 'RPmod needs World Info "Before A/N" with the Author\'s Note placed "Turn based", 1 user turn before the end, to work: then the game state and the results of each turn sit right before the player\'s newest message, where the AI pays attention. Should I set this now?';

export function turnSupported(win) { try { return win.anTurnOffset !== undefined && win.anTurnType !== undefined; } catch (_) { return false; } }
// A host without these Esolite variables has nothing to set: treated as fine (never asked).
export function placementOk(win) {
    try {
        if (win.wi_insertlocation === undefined || win.anote_strength === undefined) return true;
        if (Number(win.wi_insertlocation) !== WI_BEFORE_AN) return false;
        if (!turnSupported(win)) return Number(win.anote_strength) === AN_STRONG;
        return String(win.anote_strength) === AN_TURN && Number(win.anTurnOffset) === TURN_OFFSET && String(win.anTurnType) === TURN_TYPE;
    } catch (_) { return true; }
}
// Sets the values and the (hidden) dialog controls Esolite reads them back from on OK.
export function applyPlacement(win) {
    try {
        const d = win.document; const set = (id, v) => { const e = d.getElementById(id); if (e) e.value = String(v); };
        win.wi_insertlocation = WI_BEFORE_AN; set('wi_insertlocation', WI_BEFORE_AN);
        if (turnSupported(win)) {
            win.anote_strength = AN_TURN; win.anTurnOffset = TURN_OFFSET; win.anTurnType = TURN_TYPE;
            set('anote_strength', AN_TURN); set('anTurnOffset', TURN_OFFSET); set('anTurnType', TURN_TYPE);
            try { d.getElementById('aNoteTurnStrength')?.classList.remove('hidden'); } catch (_) {}
        } else { win.anote_strength = AN_STRONG; set('anote_strength', AN_STRONG); }
        return true;
    } catch (_) { return false; }
}

export default function initContextPlacement() {
    'use strict';
    if (window.KLITE_RPMod_ContextPlacement) return;
    const S = () => window.KLITE_RPMod_Settings;
    let declined = false, asking = false;

    function auto() { try { return S() ? S().get(AUTO_SETTING) === true : false; } catch (_) { return false; } }
    // Esolite's Yes/No box is shared (e.g. "Reconnect to previous custom endpoint?" right after a page
    // load): wait until it is free instead of replacing someone else's question.
    function boxBusy() {
        try { const b = document.getElementById('yesnocontainer'); return !!(b && !b.classList.contains('hidden')); } catch (_) { return false; }
    }
    function ask(onYes) {
        asking = true;
        if (boxBusy()) { const wait = () => { if (boxBusy()) setTimeout(wait, 500); else { asking = false; check(); } }; setTimeout(wait, 500); return; }
        const done = () => { asking = false; };
        const yes = () => { done(); onYes(); };
        const no = () => { done(); declined = true; };
        if (typeof window.msgboxYesNo === 'function') {
            try { window.msgboxYesNo(QUESTION, 'RPmod: World Info placement', yes, no); return; } catch (_) {}
        }
        try { (window.confirm(QUESTION) ? yes : no)(); } catch (_) { done(); }
    }
    // check(): set the placement when it is wrong — silently in auto mode, else ask once.
    function check() {
        if (placementOk(window) || asking) return;
        if (auto()) { applyPlacement(window); return; }
        if (declined) return;
        ask(() => { applyPlacement(window); try { S() && S().set(AUTO_SETTING, true); } catch (_) {} });
    }

    function wrap(name, flag) {
        const orig = window[name];
        if (typeof orig !== 'function' || orig[flag]) return false;
        const wrapped = function () { const r = orig.apply(this, arguments); try { setTimeout(check, 0); } catch (_) {} return r; };
        wrapped[flag] = true; window[name] = wrapped;
        return true;
    }

    const api = { check, placementOk: () => placementOk(window), apply: () => applyPlacement(window), question: QUESTION };
    window.KLITE_RPMod_ContextPlacement = api;

    try {
        S()?.registerSetting({ id: AUTO_SETTING, section: 'Worlds', order: 5, default: false,
            label: 'Keep World Info "Before A/N" (Turn based, 1 user turn) in every story',
            help: 'RPmod\'s game state and the results of each turn then sit right before the player\'s newest message, where the AI follows them. Esolite resets this placement on New Session; RPmod sets it again.' });
    } catch (_) {}

    let tries = 0;
    const hook = () => {
        const a = typeof window.restart_new_game === 'function' && (wrap('restart_new_game', '__rpmod_placement') || window.restart_new_game.__rpmod_placement);
        const b = typeof window.kai_json_load === 'function' && (wrap('kai_json_load', '__rpmod_placement') || window.kai_json_load.__rpmod_placement);
        if ((!a || !b) && ++tries < 120) setTimeout(hook, 250);
    };
    const start = () => {
        hook();
        // Esolite restores the autosaved story during its own start-up: check after it settled
        setTimeout(check, 1500);
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
}
