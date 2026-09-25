// =============================================================================
// KLITE RPmod — Quick replies (R6 step 2; design: docs/design/R6-chat-power.md)
// -----------------------------------------------------------------------------
// A left-dock section of one-click replies. Each reply is chat-box text (slash commands,
// " | ", a message) run through KLITE_RPMod_Chat.run: the commands act, the message is sent
// (send: true; an empty one lets the AI continue) or left in the input box.
// The player's replies are stored per browser (`rpmod_quick_replies`, like the Tools panel's
// Quick Actions they replace; those are migrated once, their key is left in place).
// The "Here" row is built from the world state each time (W.here(): ways out, people, quests
// to accept or turn in, the shop). World names are untrusted: DOM built with textContent.
// =============================================================================
import { el, clear, icon } from '../shell/dom.js';
import { QUICK_KEY, OLD_QUICK_KEY, loadReplies, normalizeReplies, defaultReplies, hereReplies } from './chat-rules.js';

export const VIEW_ID = 'quick-replies';
export const HERE_SETTING = 'quick_replies_here';

export function installQuickReplies(chat) {
    const Shell = () => window.KLITE_RPMod_Shell;
    const W = () => window.KLITE_RPMod_Worlds;
    const S = { replies: defaultReplies(), loaded: false, editing: false, saveTimer: null };

    // ---- storage: Esolite's IndexedDB (the RP core's adapter), else localStorage ---------------
    async function load(key) {
        try { const R = window.KLITE_RPMod; if (R && typeof R.loadFromLiteStorage === 'function') return await R.loadFromLiteStorage(key); } catch (_) {}
        try { if (typeof window.indexeddb_load === 'function') return await window.indexeddb_load(key, null); } catch (_) {}
        try { return localStorage.getItem('KLITE.' + key); } catch (_) { return null; }
    }
    async function store(key, text) {
        try { const R = window.KLITE_RPMod; if (R && typeof R.saveToLiteStorage === 'function') { await R.saveToLiteStorage(key, text); return; } } catch (_) {}
        try { if (typeof window.indexeddb_save === 'function') { await window.indexeddb_save(key, text); return; } } catch (_) {}
        try { localStorage.setItem('KLITE.' + key, text); } catch (_) {}
    }
    const parse = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; } };
    async function loadAll() {
        const saved = parse(await load(QUICK_KEY));
        const old = saved ? null : parse(await load(OLD_QUICK_KEY));
        S.replies = loadReplies(saved, old);
        S.loaded = true;
        refresh();
    }
    function save() {
        clearTimeout(S.saveTimer);
        S.saveTimer = setTimeout(() => { store(QUICK_KEY, JSON.stringify({ version: 1, replies: S.replies })); }, 300);
    }
    function setReplies(list) { S.replies = normalizeReplies(list) || []; save(); refresh(); }

    // ---- running a reply ------------------------------------------------------------------------
    function runReply(r) { return chat.run(r.text, { send: r.send, continueIfEmpty: r.send }); }

    // ---- rendering -------------------------------------------------------------------------------
    const hereOn = () => { try { const v = window.KLITE_RPMod_Settings?.get(HERE_SETTING); return v !== false; } catch (_) { return true; } };
    function hereList() {
        try { const A = W(); if (!A || !A.activeWorld() || !A.isEnabled()) return []; return hereReplies(A.here()); } catch (_) { return []; }
    }
    function replyButton(r, extra) {
        return el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm rpm-qr-btn' + (extra ? ' ' + extra : ''), 'data-qr': r.kind || 'mine',
            title: (r.text || (r.send ? '(send: the AI continues)' : '')) + (r.send ? '' : '\n(fills the input box)'), text: r.label, onclick: () => runReply(r) });
    }
    function render(box) {
        clear(box);
        const head = el('div', { class: 'rpm-qr-head' }, [
            el('span', { class: 'rpm-muted rpm-small', text: S.editing ? 'Edit your replies' : '' }),
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', 'data-qr-action': 'edit', 'aria-label': S.editing ? 'Done' : 'Edit quick replies', title: S.editing ? 'Done' : 'Edit quick replies',
                onclick: () => { S.editing = !S.editing; refresh(); } }, [S.editing ? 'Done' : icon('pencil', 14)]),
        ]);
        box.appendChild(head);
        if (S.editing) { renderEditor(box); return; }
        const mine = el('div', { class: 'rpm-qr-row', 'data-qr-row': 'mine' }, S.replies.map(r => replyButton(r)));
        if (!S.replies.length) mine.appendChild(el('span', { class: 'rpm-muted rpm-small', text: 'No replies yet — press the pencil to add some.' }));
        box.appendChild(mine);
        if (hereOn()) {
            const here = hereList();
            if (here.length) {
                box.appendChild(el('div', { class: 'rpm-muted rpm-small rpm-qr-label', text: 'Here' }));
                box.appendChild(el('div', { class: 'rpm-qr-row', 'data-qr-row': 'here' }, here.map(r => replyButton(r, 'rpm-qr-here'))));
            }
        }
    }
    function renderEditor(box) {
        const list = el('div', { class: 'rpm-qr-edit' });
        S.replies.forEach((r, i) => {
            const label = el('input', { type: 'text', class: 'form-control rpm-input', 'aria-label': 'Label', placeholder: 'Label', value: r.label });
            label.addEventListener('input', () => { S.replies[i].label = label.value; save(); });
            const text = el('textarea', { class: 'form-control rpm-input', rows: '2', 'aria-label': 'Text', placeholder: '/command … | message' });
            text.value = r.text;
            text.addEventListener('input', () => { S.replies[i].text = text.value; save(); });
            const send = el('input', { type: 'checkbox', 'aria-label': 'Send at once' }); send.checked = r.send;
            send.addEventListener('change', () => { S.replies[i].send = send.checked; save(); });
            const move = (d) => { const j = i + d; if (j < 0 || j >= S.replies.length) return; const a = S.replies.slice(); [a[i], a[j]] = [a[j], a[i]]; setReplies(a); };
            list.appendChild(el('div', { class: 'rpm-qr-item', 'data-qr-item': String(i) }, [
                label, text,
                el('div', { class: 'rpm-row' }, [
                    el('label', { class: 'rpm-small rpm-grow' }, [send, ' send at once']),
                    el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', title: 'Move up', 'aria-label': 'Move up', onclick: () => move(-1) }, [icon('arrow-up', 14)]),
                    el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', title: 'Remove', 'aria-label': 'Remove', onclick: () => setReplies(S.replies.filter((_, k) => k !== i)) }, [icon('trash-2', 14)]),
                ]),
            ]));
        });
        box.appendChild(list);
        box.appendChild(el('div', { class: 'rpm-row rpm-mt' }, [
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', 'data-qr-action': 'add', onclick: () => setReplies(S.replies.concat([{ label: 'New reply', text: '', send: true }])) }, [icon('plus', 14), ' Add']),
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', 'data-qr-action': 'reset', onclick: () => { if (confirm('Replace your quick replies with the defaults?')) setReplies(defaultReplies()); } }, ['Defaults']),
        ]));
        box.appendChild(el('p', { class: 'rpm-muted rpm-small', text: 'Text works like the chat box: /commands run first (/help lists them), " | " or new lines separate parts, other text is your message. "Send at once": the message goes to the AI (empty = the AI continues); otherwise it waits in the input box.' }));
    }
    function refresh() { try { Shell()?.refresh([VIEW_ID], { soft: true }); } catch (_) {} }

    function register() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({ id: VIEW_ID, title: 'Quick replies', place: 'left', order: 5, mount: render, update: render });
        try {
            window.KLITE_RPMod_Settings?.registerSetting({ id: HERE_SETTING, section: 'Display', order: 20, default: true, label: 'Quick replies: show the "Here" row',
                help: 'Adds one-click replies for the current place: ways out, people to talk to, quests to accept or turn in, the shop.' });
            window.KLITE_RPMod_Settings?.onChange(HERE_SETTING, refresh);
        } catch (_) {}
        window.addEventListener('klite:worlds-change', refresh);
        loadAll();
        return true;
    }

    return {
        register,
        replies: () => S.replies.map(r => ({ ...r })),
        setReplies,
        here: hereList,
        runReply,
        ready: () => S.loaded,
    };
}
