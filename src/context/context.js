// =============================================================================
// KLITE RPmod — Context: the single owner of what RPmod adds to the prompt
// -----------------------------------------------------------------------------
// Every per-turn text RPmod gives the AI (the Worlds slice, the user's persona, the
// active character / group-chat speaker) goes through here and nowhere else:
//
//   providers  — modules register { id, order, enabled(), collect(ctx), persistent?(),
//                beforeTurn?(), afterTurn?() }. collect() returns sections
//                [{ title, priority, text }]. Providers run in `order` (low first);
//                ctx.describe(name) marks a character as fully described so later
//                providers can skip repeating it (ctx.isDescribed(name)).
//   channel    — sections become constant WorldInfo entries (wigroup '__rpmod__') in
//                Esolite's current_wi, so Esolite's own engine places and budgets them
//                (context meter, size cap). pending_context_preinjection is NOT a
//                context channel: Esolite prints it at the start of the AI's reply and
//                overwrites it in chat mode.
//   turn       — one wrapper around window.prepare_submit_generation (every UI send,
//                chat_submit_generation included): beforeTurn hooks → inject → host
//                generation → cleanup → afterTurn hooks. run(fn) does the same around
//                a direct submit (e.g. a group-chat trigger); nested turns inject once.
//   transient  — entries are removed right after the synchronous submit chain, except
//                when websearch (async chain) or agent mode (tool loop calls
//                submit_generation directly) is on, or a provider asks to stay
//                persistent; then they stay for the turn and are refreshed next turn.
//   saves      — every savefile is stripped of managed entries ('__rpmod__' and the
//                legacy Worlds group '__worlds__').
//
// Character/persona setup actions that write user-visible story data on purpose
// (the Scenario panel's "Start RP" WI entries, "load as scenario" memory, Esolite's Quick Start) are
// not per-turn context and stay the user's data.
// Public API: window.KLITE_RPMod_Context (created on first getContext() call).
// =============================================================================

export const WI_GROUP = '__rpmod__';
const LEGACY_GROUPS = ['__worlds__'];

const norm = (s) => String(s == null ? '' : s).replace(/\r\n/g, '\n').trim();
const charKey = (name) => norm(name).toLowerCase();
const isManaged = (e) => !!(e && (e.wigroup === WI_GROUP || LEGACY_GROUPS.includes(e.wigroup)));

export function getContext() {
    if (window.KLITE_RPMod_Context) return window.KLITE_RPMod_Context;
    const api = createContext();
    window.KLITE_RPMod_Context = api;
    return api;
}

function createContext() {
    'use strict';
    const providers = new Map();
    let depth = 0;   // >0 while a turn runs (nested sends inject once)

    // ---- providers --------------------------------------------------------------
    function register(def) {
        if (!def || !def.id || typeof def.collect !== 'function') throw new Error('KLITE_RPMod_Context.register: need { id, collect }');
        providers.set(def.id, def);
        return api;
    }
    function unregister(id) { providers.delete(id); }

    function call(p, fn, arg) {
        try { return typeof p[fn] === 'function' ? p[fn](arg) : undefined; }
        catch (e) { console.error('[RPmod context] provider failed:', p.id, fn, e); return undefined; }
    }
    function active() {
        return [...providers.values()]
            .filter(p => typeof p.enabled !== 'function' || call(p, 'enabled'))
            .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || String(a.id).localeCompare(String(b.id)));
    }
    const persistent = () => active().some(p => call(p, 'persistent'));

    // ---- compose -------------------------------------------------------------------
    // Returns [{ provider, title, priority, text }] sorted by priority (high first;
    // stable for equal priorities). opts.mutate = true only on the generation path.
    function compose(opts) {
        const mutate = !!(opts && opts.mutate);
        const only = opts && opts.provider;
        const described = new Set();
        const ctx = {
            mutate,
            describe(name) { const k = charKey(name); if (k) described.add(k); },
            isDescribed(name) { return described.has(charKey(name)); },
        };
        const out = [];
        for (const p of active()) {
            const secs = call(p, 'collect', ctx);
            if (only && p.id !== only) continue;
            for (const s of Array.isArray(secs) ? secs : []) {
                if (!s || (!norm(s.title) && !norm(s.text))) continue;
                out.push({ provider: p.id, title: norm(s.title), priority: Number(s.priority) || 0, text: norm(s.text) });
            }
        }
        return out.map((s, i) => [s, i]).sort((a, b) => b[0].priority - a[0].priority || a[1] - b[1]).map(x => x[0]);
    }

    const formatSection = (s) => s.text ? (s.title ? `[${s.title}]\n${s.text}` : s.text) : `[${s.title}]`;
    function toEntry(s) {
        return {
            key: '', keysecondary: '', keyanti: '',
            content: formatSection(s),
            comment: WI_GROUP + ':' + s.provider,
            wigroup: WI_GROUP,
            constant: true, selective: false, probability: 100, widisabled: false,
        };
    }

    // ---- channel: managed WorldInfo entries ----------------------------------------------
    function refreshWiEditor() {
        try {
            if (typeof window.update_wi !== 'function') return;
            const cont = document.getElementById('wi_tab_container');
            if (cont && cont.classList && !cont.classList.contains('hidden')) window.update_wi();
        } catch (_) {}
    }
    function remove() {
        try { if (Array.isArray(window.current_wi)) window.current_wi = window.current_wi.filter(e => !isManaged(e)); }
        catch (e) { console.error('[RPmod context] remove failed', e); }
    }
    function inject(opts) {
        try {
            if (!Array.isArray(window.current_wi)) window.current_wi = [];
            remove();
            const entries = compose(opts).map(toEntry);
            for (const e of entries) window.current_wi.push(e);
            refreshWiEditor();
            return entries.length;
        } catch (e) { console.error('[RPmod context] inject failed', e); return 0; }
    }
    // Outside a turn: persistent providers keep their entries live, otherwise keep
    // current_wi clean (entries are added at generation time).
    function sync() {
        if (depth > 0) return;
        if (persistent()) inject(); else { remove(); refreshWiEditor(); }
    }
    function preview(opts) { return compose(opts).map(formatSection).join('\n\n'); }

    // ---- turn --------------------------------------------------------------------
    function websearchActive() {
        try {
            return !!(window.localsettings && window.localsettings.websearch_enabled &&
                typeof window.is_using_kcpp_with_websearch === 'function' && window.is_using_kcpp_with_websearch());
        } catch (_) { return false; }
    }
    // mirrors Esolite's isAgentModeEnabledAndSetCorrectly (a host `let`, not on window)
    function agentModeEnabled() {
        try { const ls = window.localsettings; return !!(ls && ls.opmode == 4 && ls.agentBehaviour); } catch (_) { return false; }
    }
    // Esolite >= 1.35: `/name …` for a user-callable custom tool runs the tool and
    // returns without generating — not a turn. Neither is an RPmod command (R6, src/chat/slash.js):
    // it sends its message part as a new submit, which is the turn.
    function isHostSlashCommand() {
        try {
            const input = document.getElementById('input_text');
            const text = input ? String(input.value || '') : '';
            if (!text.startsWith('/')) return false;
            if (window.KLITE_RPMod_Chat && window.KLITE_RPMod_Chat.isCommand(text)) return true;
            if (typeof window.customtools_sanitize_list !== 'function') return false;
            const name = (text.slice(1).match(/^\S*/) || [''])[0];
            const tools = window.customtools_sanitize_list(window.localsettings && window.localsettings.custom_tools);
            return Array.isArray(tools) && tools.some(t => t && t.name === name && t.userCallable);
        } catch (_) { return false; }
    }

    function runTurn(fn, thisArg, args, skip) {
        if (depth > 0 || skip) return fn.apply(thisArg, args || []);
        depth++;
        const turnProviders = active();
        try {
            for (const p of turnProviders) call(p, 'beforeTurn');
            inject({ mutate: true });
        } catch (_) {}
        try {
            return fn.apply(thisArg, args || []);
        } finally {
            depth--;
            try {
                if (!persistent() && !websearchActive() && !agentModeEnabled()) { remove(); refreshWiEditor(); }
                for (const p of turnProviders) call(p, 'afterTurn');
            } catch (_) {}
        }
    }
    // Run a direct generation call (one that bypasses prepare_submit_generation) as a turn.
    function run(fn) { return runTurn(fn, null, [], false); }

    // ---- host hooks -----------------------------------------------------------------
    // Installed once: other wrappers (the RP core's debug logger, Esolite's agent.js) may sit
    // on top of ours later, so the flag on window.prepare_submit_generation is not proof.
    let hooked = { prepare: false, save: false };
    function install() {
        if (!hooked.prepare && typeof window.prepare_submit_generation === 'function') {
            const orig = window.prepare_submit_generation;
            const wrapped = function () { return runTurn(orig, this, arguments, isHostSlashCommand()); };
            wrapped.__rpmod_context = true;
            window.prepare_submit_generation = wrapped;
            hooked.prepare = true;
        }
        if (!hooked.save && typeof window.generate_savefile === 'function') {
            hooked.save = true;
            const origGen = window.generate_savefile;
            const wrappedGen = function () {
                const obj = origGen.apply(this, arguments);
                try { if (obj && Array.isArray(obj.worldinfo)) obj.worldinfo = obj.worldinfo.filter(e => !isManaged(e)); } catch (_) {}
                return obj;
            };
            wrappedGen.__rpmod_context = true;
            window.generate_savefile = wrappedGen;
        }
        return hooked.prepare;
    }

    const api = {
        WI_GROUP,
        register, unregister, providers: () => active().map(p => p.id),
        compose, preview, inject, remove, sync, run, install,
        inTurn: () => depth > 0,
        isManaged,
    };
    return api;
}
