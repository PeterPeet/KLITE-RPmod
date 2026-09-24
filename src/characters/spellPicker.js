// =============================================================================
// KLITE RPmod — spell picker and spell details (shared by the builder and the sheet)
// -----------------------------------------------------------------------------
// spellPicker(list, chosen, limit, onChange, { label, title, search }) → a searchable list with
// checkboxes (at most `limit`), level headings, each spell's SRD text on demand.
// spellDetails(spell) → the text block. DOM via createElement/textContent only.
// Data: src/data/srd52-spells.js (SRD 5.2.1, CC-BY-4.0).
// =============================================================================
import { el } from '../shell/dom.js';
import { spellLine, levelSchool } from './spell-rules.js';

const para = (t) => el('p', { class: 'rpm-bld-p', text: t });
export function spellDetails(s) {
    return el('div', { class: 'rpm-bld-text' }, [el('p', { class: 'rpm-muted', text: `${levelSchool(s)} · ${spellLine(s)}` }), ...s.text.map(para),
        s.higher ? para('At higher levels: ' + s.higher) : null, s.upgrade ? para('Cantrip upgrade: ' + s.upgrade) : null]);
}
export function spellTags(s) { return [s.level ? `L${s.level}` : 'cantrip', s.school, s.concentration ? 'C' : '', s.ritual ? 'R' : ''].filter(Boolean).join(' · '); }
// opts.search: an object that keeps the search text per label across re-renders
export function spellPicker(list, chosen, limit, onChange, opts = {}) {
    const label = opts.label || 'Spells', memo = opts.search || {};
    const picked = new Set(chosen || []);
    const box = el('div', { class: 'rpm-spell-picker', 'data-picker': label });
    box.appendChild(el('h3', { text: `${opts.title || label} (${picked.size}/${limit})` }));
    const search = el('input', { type: 'search', class: 'form-control rpm-input fullScreenTextEditExclude', placeholder: 'Search spells…', 'aria-label': `Search ${label}` });
    search.value = memo[label] || '';
    const rows = el('div', { class: 'rpm-spell-rows', role: 'group', 'aria-label': label });
    const apply = () => { const q = search.value.trim().toLowerCase(); memo[label] = search.value;
        for (const r of rows.children) r.style.display = !q || r.getAttribute('data-name').includes(q) ? '' : 'none'; };
    search.addEventListener('input', apply);
    if (list.length > 12) box.appendChild(search);
    const multi = list.some(x => x.level !== (list[0] || {}).level);
    let lastLevel = -1;
    for (const s of list) {
        if (multi && s.level !== lastLevel) { lastLevel = s.level; rows.appendChild(el('div', { class: 'rpm-spell-lvl', 'data-name': '', text: s.level ? `Level ${s.level}` : 'Cantrips' })); }
        const cb = el('input', { type: 'checkbox', 'data-spell': s.key, 'aria-label': s.name });
        cb.checked = picked.has(s.key); cb.disabled = !cb.checked && picked.size >= limit;
        cb.addEventListener('change', () => { if (cb.checked) picked.add(s.key); else picked.delete(s.key); onChange([...picked]); });
        // one line per spell; the ⓘ button shows its text below the line
        const info = el('div', { class: 'rpm-spell-info', hidden: '' }, [spellDetails(s)]);
        const toggle = el('button', { type: 'button', class: 'rpm-iconbtn rpm-spell-more', 'aria-expanded': 'false', 'aria-label': `About ${s.name}`, title: 'Show the spell', text: 'ⓘ',
            onclick: () => { const open = info.hidden; info.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); } });
        rows.appendChild(el('div', { class: 'rpm-spell-row' + (cb.checked ? ' rpm-on' : ''), 'data-name': s.name.toLowerCase() }, [
            el('label', { class: 'rpm-bld-check' }, [cb, ' ' + s.name]), el('span', { class: 'rpm-muted rpm-spell-tags', text: spellTags(s) }), toggle, info,
        ]));
    }
    box.appendChild(rows);
    apply();
    return box;
}
