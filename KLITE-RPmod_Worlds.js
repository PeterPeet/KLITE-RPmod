// =============================================================================
// KLITE RPmod - Worlds System (Phase 1-5: engine + simulation)
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
            lastParsedIndex: 0,      // gametext_arr index up to which tags were applied
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
            if (raw) {
                W.library = JSON.parse(raw) || {};
                for (const w of Object.values(W.library)) { try { normalizeWorld(w); } catch (_) {} }
                dbg('library loaded', Object.keys(W.library).length, 'worlds');
            }
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
    //  STATE MUTATION — timeline, tag parsing, event effects (Phase 4-5)
    // =======================================================================
    const TIME_SLOTS = ['morning', 'noon', 'afternoon', 'evening', 'night'];
    const DAYS_PER_MONTH = 30, MONTHS_PER_YEAR = 12;
    function deriveSeason(month) {
        const m = ((Number(month) || 1) - 1) % MONTHS_PER_YEAR; // 0-11
        if (m <= 1 || m === 11) return 'winter';   // Dec, Jan, Feb
        if (m <= 4) return 'spring';               // Mar-May
        if (m <= 7) return 'summer';               // Jun-Aug
        return 'autumn';                           // Sep-Nov
    }
    function advanceClock(slots = 1) {
        if (!W.runtime) return null;
        const c = W.runtime.clock;
        let idx = TIME_SLOTS.indexOf(norm(c.time).toLowerCase());
        if (idx < 0) idx = 0;
        for (let i = 0; i < slots; i++) {
            idx++;
            if (idx >= TIME_SLOTS.length) {
                idx = 0;
                c.day = (Number(c.day) || 1) + 1;
                if (c.day > DAYS_PER_MONTH) { c.day = 1; c.month = (Number(c.month) || 1) + 1;
                    if (c.month > MONTHS_PER_YEAR) { c.month = 1; c.year = (Number(c.year) || 1) + 1; } }
            }
        }
        c.time = TIME_SLOTS[idx];
        c.season = deriveSeason(c.month);
        dbg('clock advanced ->', `d${c.day} m${c.month} ${c.time} ${c.season}`);
        return { ...c };
    }

    function findNpcByName(world, name) {
        const n = norm(name).toLowerCase(); if (!n) return null;
        return asArray(world.npcs).find(x => norm(x.name).toLowerCase() === n) || findById(world.npcs, name);
    }
    function parseFlagValue(raw) {
        const v = norm(raw);
        if (v === '') return true;
        if (/^(true|yes|on)$/i.test(v)) return true;
        if (/^(false|no|off)$/i.test(v)) return false;
        if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
        return v;
    }
    function inventoryAdd(name, qty) {
        const n = norm(name); if (!n) return;
        qty = Number(qty) || 1;
        const inv = W.runtime.inventory;
        const ex = inv.find(i => norm(i.name).toLowerCase() === n.toLowerCase());
        if (ex) ex.qty = (Number(ex.qty) || 1) + qty; else inv.push({ id: uid('item'), name: n, qty });
    }
    function inventoryRemove(name, qty) {
        const n = norm(name).toLowerCase(); if (!n) return;
        const inv = W.runtime.inventory;
        const i = inv.findIndex(x => norm(x.name).toLowerCase() === n);
        if (i < 0) return;
        if (qty && (Number(inv[i].qty) || 1) > Number(qty)) inv[i].qty -= Number(qty);
        else inv.splice(i, 1);
    }

    // Parse explicit control tags out of one message. Returns true if state changed.
    // Supported: <move>, <npcmove>NPC=Loc, <mood>NPC=Mood, <flag>k=v, <unflag>k,
    //            <give>Item [xN], <take>Item [xN], <quest>id=state,
    //            <time>slot, <weather>desc, <advance> (advance clock one slot)
    function parseMutations(text) {
        const world = activeWorld(); if (!world || !W.runtime) return false;
        let changed = false;
        const s = String(text || '');
        const scan = (re, fn) => { let m; re.lastIndex = 0; while ((m = re.exec(s)) !== null) { try { if (fn(m) !== false) changed = true; } catch (_) {} } };

        scan(/<move>\s*([^<>]+?)\s*<\/move>/gi, m => {
            const l = findById(world.locations, m[1]) || locationByName(world, m[1]);
            if (l) { W.runtime.playerLocationId = l.id; return true; } return false;
        });
        scan(/<npcmove>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/npcmove>/gi, m => {
            const npc = findNpcByName(world, m[1]); const l = findById(world.locations, m[2]) || locationByName(world, m[2]);
            if (npc && l) { (W.runtime.npcStateOverrides[npc.id] = W.runtime.npcStateOverrides[npc.id] || {}).locationId = l.id; return true; } return false;
        });
        scan(/<mood>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/mood>/gi, m => {
            const npc = findNpcByName(world, m[1]);
            if (npc) { (W.runtime.npcStateOverrides[npc.id] = W.runtime.npcStateOverrides[npc.id] || {}).mood = norm(m[2]); return true; } return false;
        });
        scan(/<flag>\s*([^=<>]+?)\s*(?:=\s*([^<>]*?))?\s*<\/flag>/gi, m => { W.runtime.flags[norm(m[1])] = parseFlagValue(m[2]); return true; });
        scan(/<unflag>\s*([^<>]+?)\s*<\/unflag>/gi, m => { delete W.runtime.flags[norm(m[1])]; return true; });
        scan(/<give>\s*([^<>]+?)\s*<\/give>/gi, m => { const [, nm, q] = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(m[1])) || []; inventoryAdd(nm, q); return true; });
        scan(/<take>\s*([^<>]+?)\s*<\/take>/gi, m => { const [, nm, q] = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(m[1])) || []; inventoryRemove(nm, q); return true; });
        scan(/<quest>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/quest>/gi, m => { W.runtime.questState[norm(m[1])] = norm(m[2]); return true; });
        scan(/<time>\s*([^<>]+?)\s*<\/time>/gi, m => { const t = norm(m[1]).toLowerCase(); if (TIME_SLOTS.includes(t)) { W.runtime.clock.time = t; return true; } return false; });
        scan(/<weather>\s*([^<>]+?)\s*<\/weather>/gi, m => { W.runtime.clock.weather = norm(m[1]); return true; });
        scan(/<advance\s*\/?>/gi, () => { advanceClock(1); return true; });
        return changed;
    }

    // A single event effect op (used by event definitions' `effects` array).
    function applyEffect(effect) {
        if (!effect || typeof effect !== 'object' || !W.runtime) return;
        const world = activeWorld();
        switch (norm(effect.type)) {
            case 'flag': W.runtime.flags[norm(effect.key)] = ('value' in effect) ? effect.value : true; break;
            case 'unflag': delete W.runtime.flags[norm(effect.key)]; break;
            case 'give': inventoryAdd(effect.name, effect.qty); break;
            case 'take': inventoryRemove(effect.name, effect.qty); break;
            case 'quest': W.runtime.questState[norm(effect.id)] = norm(effect.state); break;
            case 'move': { const l = findById(world && world.locations, effect.locationId) || locationByName(world, effect.location); if (l) W.runtime.playerLocationId = l.id; break; }
            case 'advance': advanceClock(Number(effect.slots) || 1); break;
            default: break;
        }
    }

    // Scan any chat messages we haven't parsed yet, apply their tags, advance the
    // per-turn clock if configured. Called at generation time (before slice build).
    function processPendingMutations() {
        if (!W.runtime) return false;
        const arr = window.gametext_arr;
        if (!Array.isArray(arr)) return false;
        const start = Math.max(0, Math.min(Number(W.runtime.lastParsedIndex) || 0, arr.length));
        let changed = false;
        for (let i = start; i < arr.length; i++) changed = parseMutations(arr[i]) || changed;
        const advanced = W.config.advanceClockPerTurn && arr.length > start;
        W.runtime.lastParsedIndex = arr.length;
        if (advanced) advanceClock(1);
        if (changed || advanced) dbg('applied pending mutations; loc=', W.runtime.playerLocationId);
        return changed || advanced;
    }

    // =======================================================================
    //  RETRIEVAL ENGINE — computeActiveSlice()
    // =======================================================================
    // Resolve current location: explicit runtime id, else keyword scan of chat.
    // Only persists the resolved id back to runtime when mutate=true.
    function resolveCurrentLocation(world, mutate) {
        let loc = findById(world.locations, W.runtime?.playerLocationId);
        if (loc) return loc;
        const ctx = recentContext().toLowerCase();
        if (ctx) {
            // longest name first so "Village Tavern" beats "Village"
            const sorted = asArray(world.locations).slice().sort((a, b) => norm(b.name).length - norm(a.name).length);
            for (const l of sorted) {
                const n = norm(l.name).toLowerCase();
                if (n && ctx.includes(n)) { if (mutate && W.runtime) W.runtime.playerLocationId = l.id; return l; }
            }
        }
        // fallback: first location
        loc = asArray(world.locations)[0] || null;
        if (loc && mutate && W.runtime && !W.runtime.playerLocationId) W.runtime.playerLocationId = loc.id;
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
    // opts.mutate=true (generation path) allows recording visited/known, persisting
    // resolved location, and firing event side-effects. Preview passes mutate=false.
    function computeActiveSlice(opts) {
        const mutate = !!(opts && opts.mutate);
        const world = activeWorld();
        if (!world || !W.runtime) return { sections: [], location: null };
        const loc = resolveCurrentLocation(world, mutate);
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

        // 2b. Player state (runtime) — high priority per spec
        const stateBits = [];
        const inv = asArray(W.runtime.inventory).filter(i => i && norm(i.name));
        if (inv.length) stateBits.push('Inventory: ' + inv.map(i => norm(i.name) + ((Number(i.qty) || 1) > 1 ? ` x${i.qty}` : '')).join(', '));
        const party = asArray(W.runtime.party).map(id => (findById(world.npcs, id) || {}).name).filter(Boolean);
        if (party.length) stateBits.push('Party: ' + party.map(norm).join(', '));
        push('Player State', 85, stateBits.join('\n'));

        if (!loc) { return { sections, location: null }; }
        // mark visited
        if (mutate && W.runtime && !asArray(W.runtime.visitedLocationIds).includes(loc.id)) W.runtime.visitedLocationIds.push(loc.id);

        // 3. Current location
        const exits = asArray(loc.exits).map(e => norm(e && e.name) || (findById(world.locations, e && e.locationId) || {}).name)
            .filter(Boolean)
            .concat(connectedLocations(world, loc, 1).map(l => norm(l.name)));
        const exitsUniq = [...new Set(exits.map(norm).filter(Boolean))];
        let locText = norm(loc.description);
        if (norm(loc.atmosphere)) locText += `${locText ? '\n' : ''}Atmosphere: ${norm(loc.atmosphere)}`;
        if (exitsUniq.length) locText += `${locText ? '\n' : ''}Exits: ${exitsUniq.join(', ')}`;
        // Always emit the location header (even with an empty body) — location
        // awareness is the core purpose, the AI must always know where it is.
        sections.push({ title: `Current Location: ${norm(loc.name)}`, priority: 80, text: locText });

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
            if (mutate && W.runtime && !asArray(W.runtime.knownNpcIds).includes(npc.id)) W.runtime.knownNpcIds.push(npc.id);
        }
        push('Nearby NPCs', 70, npcLines.join('\n'));

        // 5. Nearby objects
        const objsHere = asArray(world.objects).filter(o => o.locationId === loc.id || asArray(loc.objectIds).includes(o.id));
        const objLines = objsHere.map(o => '- ' + norm(o.name) + (norm(o.desc) ? `: ${norm(o.desc)}` : ''));
        push('Nearby Objects', 50, objLines.join('\n'));

        // 5b. Active quests
        const questLines = [];
        for (const [qid, qstate] of Object.entries(W.runtime.questState || {})) {
            if (norm(qstate).toLowerCase() === 'done' || qstate === false) continue;
            const qdef = findById(world.quests, qid) || {};
            const label = norm(qdef.name) || qid;
            const desc = norm(qdef.description);
            questLines.push('- ' + label + (norm(qstate) && qstate !== true ? ` [${norm(qstate)}]` : '') + (desc ? `: ${desc}` : ''));
        }
        push('Active Quests', 45, questLines.join('\n'));

        // 6. Active events (fire side-effects + mark completed on the generation path)
        const activeEvents = asArray(world.events).filter(ev => eventActive(world, ev));
        const evLines = activeEvents.map(ev => '- ' + (norm(ev.name) ? norm(ev.name) + ': ' : '') + norm(ev.description));
        push('Active Events', 40, evLines.join('\n'));
        if (mutate) {
            for (const ev of activeEvents) {
                for (const eff of asArray(ev.effects)) applyEffect(eff);
                if (!ev.repeatable && ev.id && !asArray(W.runtime.completedEventIds).includes(ev.id)) W.runtime.completedEventIds.push(ev.id);
            }
        }

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
    function sliceToEntries(opts) {
        const { sections } = computeActiveSlice(opts);
        // priority order (higher first), matching spec context priorities
        sections.sort((a, b) => b.priority - a.priority);
        return sections.map(s => ({
            key: '',
            keysecondary: '',
            keyanti: '',
            content: s.text ? `[${s.title}]\n${s.text}` : `[${s.title}]`,
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
    // opts.mutate=true (generation path) lets the slice record visited/known and
    // fire event side-effects. Called with no opts elsewhere (pure render).
    function injectManaged(opts) {
        try {
            if (!Array.isArray(window.current_wi)) window.current_wi = [];
            removeWorldsEntries();
            if (!W.config.enabled || !activeWorld() || !W.runtime) { refreshWiEditor(); return 0; }
            const entries = sliceToEntries(opts);
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
                if (W.config.enabled && activeWorld() && W.runtime) {
                    // Apply any state-change tags from prior messages, then build
                    // this turn's slice (mutate: record visited/known, fire events).
                    processPendingMutations();
                    injectManaged({ mutate: true });
                    injected = true;
                }
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
                    if (pending) {
                        restoreSaveState(pending);
                        // Don't re-apply tags from the loaded chat history; state is
                        // already baked into the restored runtime.
                        try { if (W.runtime && Array.isArray(window.gametext_arr)) W.runtime.lastParsedIndex = window.gametext_arr.length; } catch (_) {}
                        syncLive();
                    }
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

    // =======================================================================
    //  GRAPH EDITING API (used by the node-graph editor UI - Phase 6)
    // =======================================================================
    const TYPE_ARRAYS = { location: 'locations', npc: 'npcs', faction: 'factions', object: 'objects', event: 'events', lore: 'globalLore' };
    // Which primitive field holds a node's "entry" text, per type.
    const ENTRY_FIELD = { location: 'description', npc: 'description', faction: 'description', object: 'desc', event: 'description', lore: 'content' };

    // Ensure every entity has an id and the arrays exist.
    function normalizeWorld(world) {
        if (!world || typeof world !== 'object') return world;
        for (const t of Object.keys(TYPE_ARRAYS)) {
            const key = TYPE_ARRAYS[t];
            world[key] = asArray(world[key]);
            for (const e of world[key]) { if (e && !e.id) e.id = uid(t); }
        }
        world.rules = asArray(world.rules);
        world.quests = asArray(world.quests);
        return world;
    }

    function entityType(world, id) {
        if (id === '__world__') return 'world';
        for (const t of Object.keys(TYPE_ARRAYS)) if (findById(world[TYPE_ARRAYS[t]], id)) return t;
        return null;
    }
    function entityById(world, id) {
        if (id === '__world__') return world;
        for (const t of Object.keys(TYPE_ARRAYS)) { const e = findById(world[TYPE_ARRAYS[t]], id); if (e) return e; }
        return null;
    }
    function nodeName(type, e) {
        if (type === 'world') return norm(e.name) || 'World';
        if (type === 'lore') return norm(e.label) || (norm(e.content).slice(0, 28) || 'Lore');
        return norm(e.name) || ('New ' + type);
    }
    function nodeEntry(type, e) { return norm(e[ENTRY_FIELD[type]] || ''); }

    // Build render-ready {world, nodes[], edges[]} from the active world.
    function getGraph() {
        const world = activeWorld();
        if (!world) return { world: null, nodes: [], edges: [] };
        normalizeWorld(world);
        const nodes = [{ id: '__world__', type: 'world', name: nodeName('world', world), entry: norm(world.description), x: world.ui?.x, y: world.ui?.y }];
        const edges = [];
        for (const t of Object.keys(TYPE_ARRAYS)) {
            for (const e of asArray(world[TYPE_ARRAYS[t]])) {
                nodes.push({ id: e.id, type: t, name: nodeName(t, e), entry: nodeEntry(t, e), x: e.ui?.x, y: e.ui?.y });
            }
        }
        for (const l of asArray(world.locations)) {
            edges.push({ from: '__world__', to: l.id, kind: 'contains' });
            for (const cid of asArray(l.connectedLocationIds)) if (findById(world.locations, cid)) edges.push({ from: l.id, to: cid, kind: 'exit' });
        }
        for (const n of asArray(world.npcs)) {
            if (n.homeLocationId && findById(world.locations, n.homeLocationId)) edges.push({ from: n.id, to: n.homeLocationId, kind: 'resident' });
            if (n.factionId && findById(world.factions, n.factionId)) edges.push({ from: n.id, to: n.factionId, kind: 'faction' });
        }
        for (const o of asArray(world.objects)) {
            if (o.locationId && findById(world.locations, o.locationId)) edges.push({ from: o.id, to: o.locationId, kind: 'in' });
            if (o.ownerNpcId && findById(world.npcs, o.ownerNpcId)) edges.push({ from: o.id, to: o.ownerNpcId, kind: 'owned' });
        }
        for (const ev of asArray(world.events)) for (const lid of asArray(ev.locationIds)) if (findById(world.locations, lid)) edges.push({ from: ev.id, to: lid, kind: 'occurs' });
        return { world, nodes, edges };
    }

    function addEntity(type, fields = {}) {
        const world = activeWorld(); if (!world) throw new Error('no active world');
        const key = TYPE_ARRAYS[type]; if (!key) throw new Error('bad type ' + type);
        normalizeWorld(world);
        const e = { id: uid(type), ui: { x: Number(fields.x) || 300, y: Number(fields.y) || 200 } };
        if (type === 'lore') e.content = norm(fields.name) || '';
        else e.name = norm(fields.name) || ('New ' + type);
        world[key].push(e);
        dbg('addEntity', type, e.id);
        return e;
    }

    // Generic patch merge. Callers pass entity-native fields (name/description/
    // content/desc/personality/factionId/...). Never touches id.
    function updateEntity(id, patch) {
        const world = activeWorld(); if (!world) return null;
        const e = entityById(world, id); if (!e) return null;
        for (const [k, v] of Object.entries(patch || {})) { if (k !== 'id') e[k] = v; }
        return e;
    }

    function setNodePos(id, x, y) {
        const e = entityById(activeWorld(), id); if (!e) return;
        e.ui = e.ui || {}; e.ui.x = Math.round(x); e.ui.y = Math.round(y);
    }

    function deleteEntity(id) {
        const world = activeWorld(); if (!world || id === '__world__') return false;
        const type = entityType(world, id); if (!type) return false;
        world[TYPE_ARRAYS[type]] = asArray(world[TYPE_ARRAYS[type]]).filter(e => e.id !== id);
        // scrub references from every other entity
        for (const l of asArray(world.locations)) {
            l.connectedLocationIds = asArray(l.connectedLocationIds).filter(x => x !== id);
            l.npcIds = asArray(l.npcIds).filter(x => x !== id);
            l.objectIds = asArray(l.objectIds).filter(x => x !== id);
        }
        for (const n of asArray(world.npcs)) { if (n.homeLocationId === id) n.homeLocationId = null; if (n.factionId === id) n.factionId = null; }
        for (const o of asArray(world.objects)) { if (o.locationId === id) o.locationId = null; if (o.ownerNpcId === id) o.ownerNpcId = null; }
        for (const ev of asArray(world.events)) ev.locationIds = asArray(ev.locationIds).filter(x => x !== id);
        if (W.runtime && W.runtime.playerLocationId === id) W.runtime.playerLocationId = null;
        dbg('deleteEntity', id);
        return true;
    }

    // Infer the relationship from the two node types and write the id-field.
    // Returns { kind } on success or throws with a reason if the pair is invalid.
    function connect(fromId, toId) {
        const world = activeWorld(); if (!world) throw new Error('no active world');
        if (fromId === toId) throw new Error('cannot connect a node to itself');
        const ta = entityType(world, fromId), tb = entityType(world, toId);
        const a = entityById(world, fromId), b = entityById(world, toId);
        if (!a || !b) throw new Error('unknown node');
        const pair = [ta, tb];
        const is = (x, y) => (ta === x && tb === y) || (ta === y && tb === x);
        const locOf = () => (ta === 'location' ? a : b);
        const other = loc => (loc === a ? b : a);
        if (is('location', 'location')) {
            a.connectedLocationIds = asArray(a.connectedLocationIds); if (!a.connectedLocationIds.includes(toId)) a.connectedLocationIds.push(toId);
            b.connectedLocationIds = asArray(b.connectedLocationIds); if (!b.connectedLocationIds.includes(fromId)) b.connectedLocationIds.push(fromId);
            return { kind: 'exit' };
        }
        if (is('npc', 'location')) { const npc = ta === 'npc' ? a : b, loc = locOf(); npc.homeLocationId = loc.id; loc.npcIds = asArray(loc.npcIds); if (!loc.npcIds.includes(npc.id)) loc.npcIds.push(npc.id); return { kind: 'resident' }; }
        if (is('npc', 'faction')) { const npc = ta === 'npc' ? a : b, fac = ta === 'faction' ? a : b; npc.factionId = fac.id; return { kind: 'faction' }; }
        if (is('object', 'location')) { const obj = ta === 'object' ? a : b, loc = locOf(); obj.locationId = loc.id; loc.objectIds = asArray(loc.objectIds); if (!loc.objectIds.includes(obj.id)) loc.objectIds.push(obj.id); return { kind: 'in' }; }
        if (is('object', 'npc')) { const obj = ta === 'object' ? a : b, npc = ta === 'npc' ? a : b; obj.ownerNpcId = npc.id; return { kind: 'owned' }; }
        if (is('event', 'location')) { const ev = ta === 'event' ? a : b, loc = locOf(); ev.locationIds = asArray(ev.locationIds); if (!ev.locationIds.includes(loc.id)) ev.locationIds.push(loc.id); return { kind: 'occurs' }; }
        if (is('world', 'location')) return { kind: 'contains' }; // implicit; no-op
        throw new Error(`no relationship defined between ${ta} and ${tb}`);
    }

    function disconnect(fromId, toId) {
        const world = activeWorld(); if (!world) return false;
        const a = entityById(world, fromId), b = entityById(world, toId);
        if (!a || !b) return false;
        // remove any reference in either direction
        for (const [x, yId] of [[a, toId], [b, fromId]]) {
            if (Array.isArray(x.connectedLocationIds)) x.connectedLocationIds = x.connectedLocationIds.filter(v => v !== yId);
            if (Array.isArray(x.npcIds)) x.npcIds = x.npcIds.filter(v => v !== yId);
            if (Array.isArray(x.objectIds)) x.objectIds = x.objectIds.filter(v => v !== yId);
            if (Array.isArray(x.locationIds)) x.locationIds = x.locationIds.filter(v => v !== yId);
            if (x.homeLocationId === yId) x.homeLocationId = null;
            if (x.factionId === yId) x.factionId = null;
            if (x.locationId === yId) x.locationId = null;
            if (x.ownerNpcId === yId) x.ownerNpcId = null;
        }
        return true;
    }

    // Move an entity to a different type, preserving id/name/entry/position.
    // Type-specific relationship refs are dropped (reconnect in the editor).
    function changeEntityType(id, newType) {
        const world = activeWorld(); if (!world) return false;
        const oldType = entityType(world, id);
        const e = entityById(world, id);
        if (!e || !oldType || oldType === 'world' || newType === 'world' || !TYPE_ARRAYS[newType] || oldType === newType) return false;
        const entry = nodeEntry(oldType, e), name = nodeName(oldType, e);
        world[TYPE_ARRAYS[oldType]] = asArray(world[TYPE_ARRAYS[oldType]]).filter(x => x.id !== id);
        const n = { id, ui: e.ui || {} };
        if (newType === 'lore') { n.content = entry || name; n.label = name; }
        else { n.name = name; n[ENTRY_FIELD[newType]] = entry; }
        world[TYPE_ARRAYS[newType]].push(n);
        dbg('changeEntityType', id, oldType, '->', newType);
        return true;
    }

    async function createWorld(name) {
        const w = normalizeWorld({ id: uid('world'), name: norm(name) || 'New World', description: '', ui: { x: 120, y: 260 } });
        W.library[w.id] = w;
        await saveLibrary();
        W.activeWorldId = w.id;
        if (!W.runtime) W.runtime = defaultRuntime();
        return w.id;
    }

    // =======================================================================
    //  IMPORT / EXPORT (Phase 7)
    // =======================================================================
    // Normalise one entry from any supported WI/lorebook shape.
    function normWiEntry(e) {
        if (!e || typeof e !== 'object') return null;
        const keys = Array.isArray(e.keys) ? e.keys : Array.isArray(e.key) ? e.key : (typeof e.key === 'string' ? e.key.split(',') : []);
        const sec = Array.isArray(e.secondary_keys) ? e.secondary_keys : (typeof e.keysecondary === 'string' ? e.keysecondary.split(',') : []);
        const content = norm(e.content);
        if (!content) return null;
        return {
            keys: keys.map(norm).filter(Boolean), secondary: sec.map(norm).filter(Boolean),
            content, comment: norm(e.comment || e.name || ''), constant: !!e.constant, wigroup: norm(e.wigroup || '')
        };
    }
    // Accepts: Esolite current_wi array, TavernCard character_book {entries:[]|{}},
    // {character_book}, {data:{character_book}}, or a raw {entries} lorebook.
    function wiEntriesFrom(data) {
        if (!data) return [];
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) { return []; } }
        if (Array.isArray(data)) return data.map(normWiEntry).filter(Boolean);
        if (data.entries) { const es = Array.isArray(data.entries) ? data.entries : Object.values(data.entries); return es.map(normWiEntry).filter(Boolean); }
        if (data.character_book) return wiEntriesFrom(data.character_book);
        if (data.data && data.data.character_book) return wiEntriesFrom(data.data.character_book);
        return [];
    }

    // Import classic WorldInfo / lorebook entries as globalLore nodes. Each becomes
    // a Lore node (promotable to Location/NPC in the editor). Creates a new world
    // unless opts.merge and a world is active.
    async function importLorebook(data, opts = {}) {
        const entries = wiEntriesFrom(data);
        if (!entries.length) throw new Error('no WorldInfo / lorebook entries found');
        let world = opts.merge ? activeWorld() : null;
        if (!world) { await createWorld(opts.worldName || (data && (data.name || (data.data && data.data.name))) || 'Imported World'); world = activeWorld(); }
        world.globalLore = asArray(world.globalLore);
        let gy = 120;
        for (const e of entries) {
            world.globalLore.push({
                id: uid('lore'), content: e.content, keys: e.keys, secondary: e.secondary,
                label: e.comment || e.keys[0] || 'Lore', always: e.constant, wigroup: e.wigroup,
                ui: { x: 700, y: gy }
            });
            gy += 60;
        }
        await saveLibrary(); syncLive();
        dbg('imported', entries.length, 'lore entries');
        return entries.length;
    }

    // Export the world as portable JSON (deep clone).
    function exportWorld(worldId) {
        const w = W.library[worldId || W.activeWorldId]; if (!w) return null;
        return JSON.parse(JSON.stringify(w));
    }
    // Down-convert a world to a flat Esolite WI array (vanilla-Lite compatible).
    function exportWorldAsWI(worldId) {
        const w = W.library[worldId || W.activeWorldId]; if (!w) return [];
        const mk = (key, content, comment, constant) => ({ key: norm(key), keysecondary: '', keyanti: '', content, comment: norm(comment), wigroup: '', constant: !!constant, selective: false, probability: 100, widisabled: false });
        const out = [];
        for (const l of asArray(w.locations)) out.push(mk(l.name, `[Location: ${norm(l.name)}]${norm(l.description) ? '\n' + norm(l.description) : ''}`, l.name));
        for (const n of asArray(w.npcs)) out.push(mk(n.name, `[Character: ${norm(n.name)}]${norm(n.personality || n.description) ? '\n' + norm(n.personality || n.description) : ''}`, n.name));
        for (const f of asArray(w.factions)) out.push(mk(f.name, `[Faction: ${norm(f.name)}]${norm(f.description || f.goals) ? '\n' + norm(f.description || f.goals) : ''}`, f.name));
        for (const o of asArray(w.objects)) out.push(mk(o.name, `[Object: ${norm(o.name)}]${norm(o.desc) ? '\n' + norm(o.desc) : ''}`, o.name));
        for (const ev of asArray(w.events)) out.push(mk(ev.name, `[Event: ${norm(ev.name)}]${norm(ev.description) ? '\n' + norm(ev.description) : ''}`, ev.name));
        for (const gl of asArray(w.globalLore)) out.push(mk(asArray(gl.keys).join(',') || gl.label, norm(gl.content), gl.label, gl.always || gl.constant));
        return out;
    }

    const API = {
        _state: W,
        get config() { return W.config; },
        get library() { return W.library; },
        get runtime() { return W.runtime; },
        activeWorld,

        // ----- graph editing (for the editor UI) -----
        getGraph, addEntity, updateEntity, deleteEntity, connect, disconnect, setNodePos, changeEntityType,
        entityById(id) { return entityById(activeWorld(), id); },
        entityType(id) { return entityType(activeWorld(), id); },
        async saveActiveWorld() { await saveLibrary(); syncLive(); return true; },
        async newWorld(name) { const id = await createWorld(name); syncLive(); return id; },

        // ----- import / export -----
        importLorebook, exportWorld, exportWorldAsWI,

        // ----- world library -----
        async importWorld(world, { activate = true } = {}) {
            if (!world || typeof world !== 'object') throw new Error('world object required');
            if (!world.id) world.id = uid('world');
            normalizeWorld(world);
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
        setClock(patch) { if (!W.runtime) W.runtime = defaultRuntime(); Object.assign(W.runtime.clock, patch || {}); if (patch && patch.month != null) W.runtime.clock.season = deriveSeason(W.runtime.clock.month); syncLive(); return { ...W.runtime.clock }; },
        setFlag(k, v) { if (!W.runtime) W.runtime = defaultRuntime(); W.runtime.flags[k] = v; syncLive(); return W.runtime.flags; },
        advanceClock(slots) { const c = advanceClock(Number(slots) || 1); syncLive(); return c; },
        giveItem(name, qty) { if (!W.runtime) W.runtime = defaultRuntime(); inventoryAdd(name, qty); syncLive(); return W.runtime.inventory; },
        takeItem(name, qty) { if (!W.runtime) W.runtime = defaultRuntime(); inventoryRemove(name, qty); syncLive(); return W.runtime.inventory; },
        setQuest(id, state) { if (!W.runtime) W.runtime = defaultRuntime(); W.runtime.questState[norm(id)] = norm(state); syncLive(); return W.runtime.questState; },
        // Apply control tags from a raw string (as the AI would emit). Returns changed.
        applyTags(text) { const c = parseMutations(text); syncLive(); return c; },
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
