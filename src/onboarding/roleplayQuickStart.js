// =============================================================================
// KLITE RPmod — "RPmod role play" section of Esolite's Quick Start (R8 play/build split)
// -----------------------------------------------------------------------------
// The former Scenario tab of the right panel: its "Start Role Play" now runs as part of Quick
// Start. After Esolite has applied its own choices (main character, extra characters, player
// character), this section puts the characters, the persona and the scenario into World Info
// and the first message into the chat (KLITE_RPMod.panels.SCENARIO.startRoleplay).
// Extension shape: see quickStart.js.
// =============================================================================
import { el } from '../shell/dom.js';

export function roleplayExtension() {
    const blank = () => ({ on: false, scenario: '', example: '', first: '' });
    let st = blank();
    const field = (key, label, placeholder, rows) => {
        const ta = el('textarea', { class: 'form-control', rows: String(rows), placeholder, 'aria-label': label, 'data-rp-qs': key, style: 'width:100%;margin-top:2px' });
        ta.value = st[key];
        ta.addEventListener('input', () => { st[key] = ta.value; });
        return el('label', { style: 'display:block;margin-top:6px' }, [el('span', { text: label }), ta]);
    };
    return {
        id: 'rpmod-roleplay', label: 'RPmod role play (optional)',
        helpText: 'Set up a role play with the characters chosen above: their cards, your player character and the scenario go into World Info, and the first message starts the chat (formerly the Scenario tab).',
        hasSelection: () => st.on,
        clear: () => { st = blank(); },
        render(body, rerender) {
            const cb = el('input', { type: 'checkbox', 'data-rp-qs': 'on' }); cb.checked = st.on;
            cb.addEventListener('change', () => { st.on = cb.checked; rerender(); });
            body.appendChild(el('label', { style: 'display:flex;align-items:center;gap:6px' }, [cb, el('span', { text: 'Set up role play' })]));
            if (!st.on) return;
            body.appendChild(field('scenario', 'Scenario', 'Describe the world, setting and background.', 3));
            body.appendChild(field('example', 'Example dialogue', 'Example dialogue lines (kept disabled in World Info).', 2));
            body.appendChild(field('first', 'First message', 'The first message of the chat.', 3));
        },
        async apply() {
            const P = window.KLITE_RPMod && window.KLITE_RPMod.panels && window.KLITE_RPMod.panels.SCENARIO;
            if (!P || typeof P.startRoleplay !== 'function') throw new Error('RPmod role play is not available');
            const r = await P.startRoleplay({ scenario: st.scenario, example: st.example, first: st.first }, { quiet: true });
            st = blank();
            if (r && r.ok === false) throw new Error('Role play: ' + (r.reason || 'could not be set up') + ' — choose a main character above.');
        },
    };
}
