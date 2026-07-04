// =============================================================================
// KLITE RPmod - Wyvern Worlds System (Phase 1-3 foundation)
// -----------------------------------------------------------------------------
// Adds a graph/state-based "Worlds" retrieval layer on top of Esolite.
//
// Design: "Compile-to-WI".  Worlds keeps its OWN data model as the source of
// truth (persisted separately). Each generation turn we compute the "active
// slice" (only the world state relevant to the player's current location/time)
// and push it into Esolite's current_wi as constant entries tagged
// wigroup:'__worlds__'. Esolite's own prepare/submit engine then injects them
// (inheriting its size cap, context-usage meter and insert-location).
//
// We cannot wrap the function that READS current_wi (submit_generation is a
// `const`, deliberately non-overridable by usermods - index.html:3673). Instead
// we hook prepare_submit_generation (a window function) and manage the entries:
//
//   injectMode 'transient' (default): inject before generation, then remove
//     right after. When websearch is off, PerformWebsearch -> submit_generation
//     runs SYNCHRONOUSLY inside our wrapper, so the host has already read
//     current_wi by the time we remove -> current_wi stays clean between turns.
//     When websearch runs async we can't time the removal, so we leave the
//     entries for that one turn (refreshed next turn).
//   injectMode 'persistent': keep the managed entries in current_wi while
//     enabled (covers every generation path incl. direct tool-loop calls).
//
// Either way the entries are ALWAYS stripped from every savefile
// (generate_savefile wrapper), so a saved story's `worldinfo` never contains
// them. Runtime state rides in a separate savefile key (rpmod_worlds).
//
// This module is fully self-contained: it installs its own function wrappers and
// its own persistence, so it can be removed without touching the host or the
// main mod. Nothing runs until a World is enabled for the current story.
// =============================================================================
(function () {
    'use strict';

    if (window.KLITE_RPMod_Worlds) return; // idempotent

    // ---- Constants --------------------------------------------------------
    const WI_GROUP = '__worlds__';               // marker tag on temp WI entries
    const IDB_LIBRARY_KEY = 'KLITE_WORLDS_LIBRARY'; // static authored worlds
    const SAVE_KEY = 'rpmod_worlds';             // key added to host savefile obj
    const NEIGHBOR_DEPTH = 1;                     // graph BFS depth for exits

    // ---- Module state -----------------------------------------------------
    const W = {
        ready: false,
        config: {
            enabled: false,          // master per-story switch (off => host untouched)
            insertRules: true,       // include world.rules block
            neighborDepth: NEIGHBOR_DEPTH,
            advanceClockPerTurn: false,
            // 'transient'  : inject only during a generation, then remove (clean
            //                current_wi between turns). Safe when the submit chain
            //                is synchronous (websearch off). Falls back to keeping
            //                entries for one turn when websearch runs async.
            // 'persistent' : keep managed entries in current_wi while enabled.
            injectMode: 'transient',
            debug: false
        },
        library: {},                 // { [worldId]: World }  (static, authored)
        activeWorldId: null,         // which world this story uses
        runtime: null                // dynamic per-story state (see defaultRuntime)
    };

    function defaultRuntime() {
        return {
            playerLocationId: null,
            party: [],               // npc ids travelling with the player
            knownNpcIds: [],
            visitedLocationIds: [],
            flags: {},               // arbitrary string/number/bool flags
            inventory: [],           // { id, name, qty }
            questState: {},          // { [questId]: 'active'|'done'|stepIndex }
            npcStateOverrides: {},   // { [npcId]: { locationId, mood, ... } }
            completedEventIds: [],   // non-repeatable events already fired
            clock: { day: 1, month: 1, year: 1, time: 'morning', season: 'spring', weather: 'clear' }
        };
    }

    // ---- Small utilities --------------------------------------------------
    function dbg(...args) {
        try {
            if (window.KLITE_RPMod?.log) { window.KLITE_RPMod.log('worlds', ...args); return; }
            if (W.config.debug) console.log('[Worlds]', ...args);
        } catch (_) {}
    }
    function err(...args) { try { console.error('[Worlds]', ...args); } catch (_) {} }

    const asArray = v => (Array.isArray(v) ? v : []);
    const norm = s => String(s == null ? '' : s).trim();
    function uid(prefix) { return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9); }

    function activeWorld() { return W.activeWorldId ? W.library[W.activeWorldId] : null; }

    function findById(list, id) {
        if (!id) return null;
        for (const it of asArray(list)) if (it && it.id === id) return it;
        return null;
    }
    function locationByName(world, name) {
        const n = norm(name).toLowerCase();
        if (!n) return null;
        for (const l of asArray(world.locations)) {
            if (norm(l.name).toLowerCase() === n) return l;
        }
        return null;
    }

    // ---- Recent chat context (for keyword fallbacks) ----------------------
    function recentContext(maxChars = 1200) {
        try {
            const arr = window.gametext_arr;
            if (Array.isArray(arr) && arr.length) {
                let s = arr.slice(-8).join('\n');
                if (s.length > maxChars) s = s.slice(-maxChars);
                return s;
            }
        } catch (_) {}
        return '';
    }

    // =======================================================================
    //  PERSISTENCE
    // =======================================================================
    function idbSave(key, valStr) {
        try {
            if (typeof window.indexeddb_save === 'function') return window.indexeddb_save(key, valStr);
        } catch (_) {}
        try { localStorage.setItem(key, valStr); } catch (_) {}
        return Promise.resolve();
    }
    async function idbLoad(key) {
        try {
            if (typeof window.indexeddb_load === 'function') {
                const v = await window.indexeddb_load(key);
                if (v !== undefined && v !== null) return v;
            }
        } catch (_) {}
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    async function loadLibrary() {
        try {
            const raw = await idbLoad(IDB_LIBRARY_KEY);
            if (raw) { W.library = JSON.parse(raw) || {}; dbg('library loaded', Object.keys(W.library).length, 'worlds'); }
        } catch (e) { err('loadLibrary failed', e); W.library = {}; }
    }
    async function saveLibrary() {
        try { await idbSave(IDB_LIBRARY_KEY, JSON.stringify(W.library)); dbg('library saved'); }
        catch (e) { err('saveLibrary failed', e); }
    }

    // Per-story state that rides inside the host savefile object.
    function collectSaveState() {
        if (!W.config.enabled && !W.activeWorldId) return undefined;
        return {
            version: 1,
            enabled: !!W.config.enabled,
            activeWorldId: W.activeWorldId,
            config: { ...W.config },
            runtime: W.runtime ? JSON.parse(JSON.stringify(W.runtime)) : null
        };
    }
    function restoreSaveState(state) {
        try {
            if (!state || typeof state !== 'object') return;
            W.activeWorldId = state.activeWorldId || null;
            if (state.config && typeof state.config === 'object') W.config = { ...W.config, ...state.config };
            W.config.enabled = !!state.enabled;
            W.runtime = state.runtime ? { ...defaultRuntime(), ...state.runtime } : (W.activeWorldId ? defaultRuntime() : null);
            dbg('runtime state restored; world=', W.activeWorldId, 'enabled=', W.config.enabled);
        } catch (e) { err('restoreSaveState failed', e); }
    }

    // =======================================================================
    //  CLOCK / SCHEDULE / EVENT helpers
    // =======================================================================
    // Resolve where an NPC currently is: explicit override > schedule@clock > home.
    function resolveNpcLocationId(npc) {
        const ov = W.runtime?.npcStateOverrides?.[npc.id];
        if (ov && ov.locationId) return ov.locationId;
        const sched = asArray(npc.schedule);
        if (sched.length && W.runtime?.clock) {
            const t = norm(W.runtime.clock.time).toLowerCase();
            const hit = sched.find(row => norm(row.time).toLowerCase() === t);
            if (hit && hit.locationId) return hit.locationId;
        }
        return npc.homeLocationId || npc.currentLocationId || (npc.defaultState && npc.defaultState.locationId) || null;
    }
    function npcMood(npc) {
        const ov = W.runtime?.npcStateOverrides?.[npc.id];
        return norm(ov?.mood || npc.defaultState?.mood || npc.mood || '');
    }

    // Safe, non-eval condition evaluator over runtime facts.
    function factValue(field) {
        const c = W.runtime?.clock || {};
        switch (norm(field)) {
            case 'time': return norm(c.time).toLowerCase();
            case 'season': return norm(c.season).toLowerCase();
            case 'weather': return norm(c.weather).toLowerCase();
            case 'day': return Number(c.day) || 0;
            case 'month': return Number(c.month) || 0;
            case 'year': return Number(c.year) || 0;
            case 'location': return W.runtime?.playerLocationId || '';
            default:
                if (field && field.indexOf('flag.') === 0) return W.runtime?.flags?.[field.slice(5)];
                if (field && field.indexOf('quest.') === 0) return W.runtime?.questState?.[field.slice(6)];
                return undefined;
        }
    }
    function evalCondition(cond) {
        if (!cond || typeof cond !== 'object') return true;
        const lhs = factValue(cond.field);
        const rhs = (typeof cond.value === 'string') ? cond.value.toLowerCase() : cond.value;
        switch (norm(cond.op) || '==') {
            case '==': return lhs == rhs;
            case '!=': return lhs != rhs;
            case '>': return Number(lhs) > Number(rhs);
            case '<': return Number(lhs) < Number(rhs);
            case '>=': return Number(lhs) >= Number(rhs);
            case '<=': return Number(lhs) <= Number(rhs);
            case 'includes': return String(lhs).includes(String(rhs));
            case 'has_flag': return !!W.runtime?.flags?.[cond.value];
            case 'not_flag': return !W.runtime?.flags?.[cond.value];
            default: return false;
        }
    }
    function eventActive(world, ev) {
        if (!ev) return false;
        if (!ev.repeatable && asArray(W.runtime?.completedEventIds).includes(ev.id)) return false;
        // location gate: if event lists locationIds, require player to be there
        if (asArray(ev.locationIds).length && !ev.locationIds.includes(W.runtime?.playerLocationId)) return false;
        return asArray(ev.conditions).every(evalCondition);
    }

    // =======================================================================
    //  RETRIEVAL ENGINE — computeActiveSlice()
    // =======================================================================
    // Resolve current location: explicit runtime id, else keyword scan of chat.
    function resolveCurrentLocation(world) {
        let loc = findById(world.locations, W.runtime?.playerLocationId);
        if (loc) return loc;
        const ctx = recentContext().toLowerCase();
        if (ctx) {
            // longest name first so "Village Tavern" beats "Village"
            const sorted = asArray(world.locations).slice().sort((a, b) => norm(b.name).length - norm(a.name).length);
            for (const l of sorted) {
                const n = norm(l.name).toLowerCase();
                if (n && ctx.includes(n)) { if (W.runtime) W.runtime.playerLocationId = l.id; return l; }
            }
        }
        // fallback: first location
        loc = asArray(world.locations)[0] || null;
        if (loc && W.runtime && !W.runtime.playerLocationId) W.runtime.playerLocationId = loc.id;
        return loc;
    }

    function connectedLocations(world, loc, depth) {
        const out = [];
        const seen = new Set([loc.id]);
        let frontier = [loc];
        for (let d = 0; d < depth; d++) {
            const next = [];
            for (const cur of frontier) {
                const ids = asArray(cur.connectedLocationIds).concat(asArray(cur.exits).map(e => e && e.locationId).filter(Boolean));
                for (const id of ids) {
                    if (seen.has(id)) continue;
                    seen.add(id);
                    const l = findById(world.locations, id);
                    if (l) { out.push(l); next.push(l); }
                }
            }
            frontier = next;
        }
        return out;
    }

    // Returns { sections: [{title, priority, text}], location }
    function computeActiveSlice() {
        const world = activeWorld();
        if (!world || !W.runtime) return { sections: [], location: null };
        const loc = resolveCurrentLocation(world);
        const sections = [];
        const push = (title, priority, text) => { if (norm(text)) sections.push({ title, priority, text: norm(text) }); };

        // 1. World rules (constant framing)
        if (W.config.insertRules) {
            const rules = asArray(world.rules).map(norm).filter(Boolean).join('\n');
            push('World Rules', 100, rules);
        }
        // 2. Current time
        const c = W.runtime.clock || {};
        push('Current Time', 90,
            `Day ${c.day}, ${c.season} (${c.time}). Weather: ${c.weather}.`);

        if (!loc) { return { sections, location: null }; }
        // mark visited
        if (W.runtime && !asArray(W.runtime.visitedLocationIds).includes(loc.id)) W.runtime.visitedLocationIds.push(loc.id);

        // 3. Current location
        const exits = asArray(loc.exits).map(e => norm(e && e.name) || (findById(world.locations, e && e.locationId) || {}).name)
            .filter(Boolean)
            .concat(connectedLocations(world, loc, 1).map(l => norm(l.name)));
        const exitsUniq = [...new Set(exits.map(norm).filter(Boolean))];
        let locText = norm(loc.description);
        if (norm(loc.atmosphere)) locText += `\nAtmosphere: ${norm(loc.atmosphere)}`;
        if (exitsUniq.length) locText += `\nExits: ${exitsUniq.join(', ')}`;
        push(`Current Location: ${norm(loc.name)}`, 80, locText);

        // 4. Nearby NPCs (resident here or scheduled here now)
        const npcsHere = asArray(world.npcs).filter(npc => resolveNpcLocationId(npc) === loc.id ||
            asArray(loc.npcIds).includes(npc.id));
        const npcSeen = new Set();
        const npcLines = [];
        for (const npc of npcsHere) {
            if (npcSeen.has(npc.id)) continue; npcSeen.add(npc.id);
            const faction = findById(world.factions, npc.factionId);
            const bits = [norm(npc.name)];
            if (norm(npc.personality)) bits.push(norm(npc.personality));
            const mood = npcMood(npc); if (mood) bits.push(`Mood: ${mood}`);
            if (faction) bits.push(`Faction: ${norm(faction.name)}`);
            npcLines.push('- ' + bits.join(' | '));
            if (W.runtime && !asArray(W.runtime.knownNpcIds).includes(npc.id)) W.runtime.knownNpcIds.push(npc.id);
        }
        push('Nearby NPCs', 70, npcLines.join('\n'));

        // 5. Nearby objects
        const objsHere = asArray(world.objects).filter(o => o.locationId === loc.id || asArray(loc.objectIds).includes(o.id));
        const objLines = objsHere.map(o => '- ' + norm(o.name) + (norm(o.desc) ? `: ${norm(o.desc)}` : ''));
        push('Nearby Objects', 50, objLines.join('\n'));

        // 6. Active events
        const evLines = asArray(world.events).filter(ev => eventActive(world, ev))
            .map(ev => '- ' + (norm(ev.name) ? norm(ev.name) + ': ' : '') + norm(ev.description));
        push('Active Events', 40, evLines.join('\n'));

        // 7. Relevant lore (local always; global by keyword/always)
        const loreLines = [];
        for (const ll of asArray(loc.localLore)) { const t = norm(typeof ll === 'string' ? ll : ll.content); if (t) loreLines.push(t); }
        const ctx = recentContext().toLowerCase();
        for (const gl of asArray(world.globalLore)) {
            const content = norm(typeof gl === 'string' ? gl : gl.content);
            if (!content) continue;
            const always = (gl && (gl.always || gl.constant));
            const keys = asArray(gl && gl.keys).map(k => norm(k).toLowerCase()).filter(Boolean);
            const hit = always || (keys.length && keys.some(k => ctx.includes(k)));
            if (hit) loreLines.push(content);
        }
        push('Relevant Lore', 30, loreLines.join('\n'));

        return { sections, location: loc };
    }

    // Format the slice into labelled text blocks (one per WI entry).
    function sliceToEntries() {
        const { sections } = computeActiveSlice();
        // priority order (higher first), matching spec context priorities
        sections.sort((a, b) => b.priority - a.priority);
        return sections.map(s => ({
            key: '',
            keysecondary: '',
            keyanti: '',
            content: `[${s.title}]\n${s.text}`,
            comment: WI_GROUP,
            wigroup: WI_GROUP,
            constant: true,
            selective: false,
            probability: 100,
            widisabled: false
        }));
    }

    // Human-readable preview of what the AI will receive this turn.
    function previewSlice() {
        return sliceToEntries().map(e => e.content).join('\n\n');
    }

    // =======================================================================
    //  COMPILE-TO-WI INJECTION (persistent managed entries)
    // -----------------------------------------------------------------------
    // Esolite's submit_generation is a `const` (deliberately not overridable by
    // usermods, see index.html:3673) and is the function that reads current_wi.
    // We therefore cannot wrap the read itself. Instead we keep our slice present
    // in current_wi as constant `__worlds__` entries whenever Worlds is enabled,
    // refreshing them before each generation and on state changes. This covers
    // ALL generation paths (they all read current_wi) with no timing races.
    // Every savefile is stripped of these entries (generate_savefile wrapper), so
    // they never persist to a saved story's worldinfo.
    // =======================================================================
    function removeWorldsEntries() {
        try {
            if (!Array.isArray(window.current_wi)) return;
            window.current_wi = window.current_wi.filter(w => !(w && w.wigroup === WI_GROUP));
        } catch (e) { err('removeWorldsEntries failed', e); }
    }

    // Recompute the active slice and (re)place the managed entries in current_wi.
    function injectManaged() {
        try {
            if (!Array.isArray(window.current_wi)) window.current_wi = [];
            removeWorldsEntries();
            if (!W.config.enabled || !activeWorld() || !W.runtime) { refreshWiEditor(); return 0; }
            const entries = sliceToEntries();
            for (const e of entries) window.current_wi.push(e);
            dbg('injected', entries.length, 'managed WI entries');
            refreshWiEditor();
            return entries.length;
        } catch (e) { err('injectManaged failed', e); return 0; }
    }

    // Is the host's async websearch active this turn? (async submit chain)
    function websearchActive() {
        try {
            return !!(window.localsettings && window.localsettings.websearch_enabled &&
                      typeof window.is_using_kcpp_with_websearch === 'function' &&
                      window.is_using_kcpp_with_websearch());
        } catch (_) { return false; }
    }

    // Keep current_wi consistent after a state change outside of generation.
    // Persistent mode => keep entries live. Transient mode => keep it clean;
    // entries are (re)injected at generation time by the prepare wrapper.
    function syncLive() {
        if (W.config.injectMode === 'persistent') injectManaged();
        else { removeWorldsEntries(); refreshWiEditor(); }
    }

    // Keep the host WI editor panel in sync if it happens to be visible.
    function refreshWiEditor() {
        try {
            if (typeof window.update_wi !== 'function') return;
            const cont = document.getElementById('wi_tab_container');
            if (cont && cont.classList && !cont.classList.contains('hidden')) {
                window.update_wi();
            }
        } catch (_) {}
    }

    function installPrepareWrapper() {
        if (typeof window.prepare_submit_generation !== 'function') return false;
        if (window.prepare_submit_generation.__worlds_wrapped) return true;
        const orig = window.prepare_submit_generation;
        const wrapped = function () {
            let injected = false;
            try {
                if (W.config.enabled && activeWorld() && W.runtime) { injectManaged(); injected = true; }
            } catch (_) {}
            let ret;
            try {
                // When websearch is off, PerformWebsearch -> submit_generation runs
                // synchronously here, so the host reads current_wi (incl. our
                // constant entries) before orig returns.
                ret = orig.apply(this, arguments);
            } finally {
                try {
                    // Transient cleanup: only safe if the submit chain was
                    // synchronous (websearch off). Otherwise leave entries for
                    // this turn; they're refreshed next turn and stripped from saves.
                    if (injected && W.config.injectMode === 'transient' && !websearchActive()) {
                        removeWorldsEntries();
                        refreshWiEditor();
                    }
                } catch (_) {}
            }
            return ret;
        };
        wrapped.__worlds_wrapped = true;
        window.prepare_submit_generation = wrapped;
        dbg('prepare_submit_generation wrapped');
        return true;
    }

    // Defensive: even though temp entries are removed synchronously, strip them
    // from any savefile object as belt-and-suspenders, and embed our runtime.
    function installSaveWrappers() {
        // generate_savefile: strip temp WI + attach worlds state
        if (typeof window.generate_savefile === 'function' && !window.generate_savefile.__worlds_wrapped) {
            const origGen = window.generate_savefile;
            const wrappedGen = function () {
                const obj = origGen.apply(this, arguments);
                try {
                    if (obj && Array.isArray(obj.worldinfo)) {
                        obj.worldinfo = obj.worldinfo.filter(w => !(w && w.wigroup === WI_GROUP));
                    }
                    const st = collectSaveState();
                    if (obj && st) obj[SAVE_KEY] = st;
                } catch (e) { err('save embed failed', e); }
                return obj;
            };
            wrappedGen.__worlds_wrapped = true;
            window.generate_savefile = wrappedGen;
            dbg('generate_savefile wrapped');
        }
        // kai_json_load: restore worlds state after host load
        if (typeof window.kai_json_load === 'function' && !window.kai_json_load.__worlds_wrapped) {
            const origLoad = window.kai_json_load;
            const wrappedLoad = function () {
                let pending = null;
                try { const s = arguments[0]; if (s && s[SAVE_KEY]) pending = s[SAVE_KEY]; } catch (_) {}
                const res = origLoad.apply(this, arguments);
                try {
                    if (pending) { restoreSaveState(pending); syncLive(); }
                    else {
                        // story without worlds data: ensure no stale managed state leaks in
                        W.config.enabled = false; W.activeWorldId = null; W.runtime = null;
                        removeWorldsEntries();
                    }
                } catch (e) { err('restore failed', e); }
                return res;
            };
            wrappedLoad.__worlds_wrapped = true;
            window.kai_json_load = wrappedLoad;
            dbg('kai_json_load wrapped');
        }
    }

    // =======================================================================
    //  PUBLIC / CONSOLE API (temporary until the WORLDS panel lands)
    // =======================================================================
    const API = {
        _state: W,
        get config() { return W.config; },
        get library() { return W.library; },
        get runtime() { return W.runtime; },
        activeWorld,

        // ----- world library -----
        async importWorld(world, { activate = true } = {}) {
            if (!world || typeof world !== 'object') throw new Error('world object required');
            if (!world.id) world.id = uid('world');
            world.locations = asArray(world.locations); world.npcs = asArray(world.npcs);
            world.factions = asArray(world.factions); world.objects = asArray(world.objects);
            world.events = asArray(world.events); world.globalLore = asArray(world.globalLore);
            world.rules = asArray(world.rules);
            W.library[world.id] = world;
            await saveLibrary();
            if (activate) this.useWorld(world.id);
            dbg('world imported', world.id, world.name);
            return world.id;
        },
        listWorlds() { return Object.values(W.library).map(w => ({ id: w.id, name: w.name, locations: asArray(w.locations).length })); },
        useWorld(worldId) {
            if (!W.library[worldId]) throw new Error('unknown world ' + worldId);
            W.activeWorldId = worldId;
            if (!W.runtime) W.runtime = defaultRuntime();
            syncLive();
            dbg('active world =', worldId);
            return true;
        },
        async deleteWorld(worldId) { delete W.library[worldId]; if (W.activeWorldId === worldId) { W.activeWorldId = null; W.config.enabled = false; syncLive(); } await saveLibrary(); },

        // ----- enable / disable per story -----
        enable() { if (!W.activeWorldId) throw new Error('select a world first (useWorld)'); if (!W.runtime) W.runtime = defaultRuntime(); W.config.enabled = true; syncLive(); dbg('ENABLED'); return true; },
        disable() { W.config.enabled = false; removeWorldsEntries(); refreshWiEditor(); dbg('disabled'); return true; },
        isEnabled() { return !!W.config.enabled; },

        // ----- runtime controls -----
        moveTo(locationNameOrId) {
            const world = activeWorld(); if (!world) throw new Error('no active world');
            let loc = findById(world.locations, locationNameOrId) || locationByName(world, locationNameOrId);
            if (!loc) throw new Error('unknown location: ' + locationNameOrId);
            if (!W.runtime) W.runtime = defaultRuntime();
            W.runtime.playerLocationId = loc.id;
            syncLive();
            dbg('moved to', loc.name);
            return loc.name;
        },
        setClock(patch) { if (!W.runtime) W.runtime = defaultRuntime(); Object.assign(W.runtime.clock, patch || {}); syncLive(); return { ...W.runtime.clock }; },
        setFlag(k, v) { if (!W.runtime) W.runtime = defaultRuntime(); W.runtime.flags[k] = v; syncLive(); return W.runtime.flags; },
        refresh() { return injectManaged(); },

        // ----- introspection -----
        preview() { return previewSlice(); },
        previewSlice: computeActiveSlice,

        // ----- persistence passthrough (used by save wrappers) -----
        collectSaveState, restoreSaveState, saveLibrary, loadLibrary
    };

    // =======================================================================
    //  INIT — wait for host + main mod, then install hooks
    // =======================================================================
    async function init() {
        if (W.ready) return;
        await loadLibrary();
        installSaveWrappers();
        const okPrepare = installPrepareWrapper();
        W.ready = true;
        try { if (W.config.enabled) syncLive(); } catch (_) {}
        dbg('KLITE Worlds ready. prepare-wrap=', okPrepare, '— use KLITE_RPMod_Worlds API to import/enable a world.');
    }

    function whenReady() {
        // Need host globals: prepare_submit_generation + generate_savefile (all
        // `function` declarations / window props, unlike const submit_generation).
        let tries = 0;
        const timer = setInterval(() => {
            tries++;
            const hostReady = typeof window.prepare_submit_generation === 'function' &&
                              typeof window.generate_savefile === 'function';
            if (hostReady) { clearInterval(timer); init().catch(err); }
            else if (tries > 300) { clearInterval(timer); err('host globals not found after wait; Worlds inactive'); }
        }, 100);
    }

    window.KLITE_RPMod_Worlds = API;
    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady);

})();
