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
export default function initWorlds() {
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
        // Two-slot runtime: { active:'working'|'base', base:Snapshot, working:Snapshot }.
        // `base` is the state we loaded/started with; `working` is the live, mutating one.
        // Reset/commit/swap between them; both persist in the savefile + export/import.
        runtime: null
    };

    // One runtime "Snapshot" — the mutable per-story state that lives in each slot.
    function defaultRuntime() {
        return {
            playerLocationId: null,
            party: [],               // npc ids travelling with the player
            knownNpcIds: [],
            visitedLocationIds: [],
            flags: {},               // arbitrary string/number/bool flags
            inventory: [],           // { id, name, qty }
            questState: {},          // { [questId]: 'available'|'active'|'complete'|'turnedin'|'failed' }
            questObjectives: {},     // { [questId]: { [objId]: true } }
            activeQuestId: null,     // the quest the player is currently tracking
            discovered: { quests: [], events: [], descriptions: [] }, // ids the player has revealed
            combat: null,            // active encounter state (see startEncounter)
            npcStateOverrides: {},   // { [npcId]: { locationId, mood, ... } }
            completedEventIds: [],   // non-repeatable events already fired
            lastParsedIndex: 0,      // gametext_arr index up to which tags were applied
            clock: { day: 1, month: 1, year: 1, time: 'morning', season: 'spring', weather: 'clear' }
        };
    }

    const deepClone = o => JSON.parse(JSON.stringify(o));
    function newRuntime() { return { active: 'working', base: defaultRuntime(), working: defaultRuntime() }; }
    // rt() = the ACTIVE snapshot. All engine reads/writes of per-story state go through it.
    function rt() { return (W.runtime && W.runtime[W.runtime.active]) ? W.runtime[W.runtime.active] : null; }
    function ensureRuntime() { if (!W.runtime) W.runtime = newRuntime(); return rt(); }
    // Normalise any runtime value into the two-slot container (migrates old flat saves).
    function toRuntimeContainer(v) {
        if (!v || typeof v !== 'object') return newRuntime();
        if (v.working || v.base) { // already a container
            const c = { active: (v.active === 'base' ? 'base' : 'working'),
                        base: { ...defaultRuntime(), ...(v.base || v.working || {}) },
                        working: { ...defaultRuntime(), ...(v.working || v.base || {}) } };
            return c;
        }
        // old flat snapshot -> seed both slots from it
        const snap = { ...defaultRuntime(), ...v };
        return { active: 'working', base: deepClone(snap), working: deepClone(snap) };
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
            W.runtime = state.runtime ? toRuntimeContainer(state.runtime) : (W.activeWorldId ? newRuntime() : null);
            dbg('runtime state restored; world=', W.activeWorldId, 'enabled=', W.config.enabled);
        } catch (e) { err('restoreSaveState failed', e); }
    }

    // =======================================================================
    //  CLOCK / SCHEDULE / EVENT helpers
    // =======================================================================
    // Resolve where an NPC currently is: explicit override > schedule@clock > home.
    function resolveNpcLocationId(npc) {
        const ov = rt()?.npcStateOverrides?.[npc.id];
        if (ov && ov.locationId) return ov.locationId;
        const sched = asArray(npc.schedule);
        if (sched.length && rt()?.clock) {
            const t = norm(rt().clock.time).toLowerCase();
            const hit = sched.find(row => norm(row.time).toLowerCase() === t);
            if (hit && hit.locationId) return hit.locationId;
        }
        return npc.homeLocationId || npc.currentLocationId || (npc.defaultState && npc.defaultState.locationId) || null;
    }
    function npcMood(npc) {
        const ov = rt()?.npcStateOverrides?.[npc.id];
        return norm(ov?.mood || npc.defaultState?.mood || npc.mood || '');
    }

    // =======================================================================
    //  PERSON = CHARACTER + d20 STATS (Phase C)
    // =======================================================================
    // A Person (npc) may reference a character from the host library
    // (KLITE_RPMod.characters) via characterRef, and/or carry a d20 stat block.
    function characterLibrary() { try { return asArray(window.KLITE_RPMod && window.KLITE_RPMod.characters); } catch (_) { return []; } }
    // Resolve the linked library character (by id, else by name), or the embedded
    // export snapshot as a fallback so worlds stay portable without the library.
    function resolveCharacter(person) {
        if (!person) return null;
        const ref = person.characterRef;
        if (ref) {
            const lib = characterLibrary();
            let hit = null;
            if (ref.id) hit = lib.find(c => c && (c.id === ref.id));
            if (!hit && ref.name) { const n = norm(ref.name).toLowerCase(); hit = lib.find(c => norm(c && c.name).toLowerCase() === n); }
            if (hit) return hit;
            if (person.characterSnapshot) return person.characterSnapshot;
        }
        return null;
    }
    function personName(person) {
        return norm(person && person.name) || norm(resolveCharacter(person)?.name) || 'Unnamed';
    }
    // Short descriptive line for the slice: overlay description > character personality/desc.
    function personBlurb(person, maxLen = 160) {
        let t = norm(person && person.description) || norm(person && person.personality);
        if (!t) { const c = resolveCharacter(person); t = norm(c && (c.personality || c.description)); }
        if (t.length > maxLen) t = t.slice(0, maxLen - 1) + '…';
        return t;
    }

    const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    function abilityMod(score) { return Math.floor(((Number(score) || 10) - 10) / 2); }
    function fmtMod(m) { return (m >= 0 ? '+' : '') + m; }
    function defaultStats() {
        return { abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                 ac: 10, hpMax: 10, speed: 30, proficiency: 2, initiativeMod: 0,
                 skills: {}, saves: {}, attacks: [], isMonster: false };
    }
    // A few SRD 5.1 stat blocks (WotC, CC-BY-4.0) as quick encounter presets.
    const SRD_TEMPLATES = {
        goblin: { name: 'Goblin', isMonster: true, ac: 15, hpMax: 7, speed: 30, proficiency: 2, initiativeMod: 2, abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, attacks: [{ name: 'Scimitar', toHit: 4, damage: '1d6+2' }] },
        wolf: { name: 'Wolf', isMonster: true, ac: 13, hpMax: 11, speed: 40, proficiency: 2, initiativeMod: 2, abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, attacks: [{ name: 'Bite', toHit: 4, damage: '2d4+2' }] },
        bandit: { name: 'Bandit', isMonster: true, ac: 12, hpMax: 11, speed: 30, proficiency: 2, initiativeMod: 1, abilities: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 }, attacks: [{ name: 'Scimitar', toHit: 3, damage: '1d6+1' }] },
        skeleton: { name: 'Skeleton', isMonster: true, ac: 13, hpMax: 13, speed: 30, proficiency: 2, initiativeMod: 2, abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, attacks: [{ name: 'Shortsword', toHit: 4, damage: '1d6+2' }] },
        guard: { name: 'Guard', isMonster: true, ac: 16, hpMax: 11, speed: 30, proficiency: 2, initiativeMod: 1, abilities: { str: 13, dex: 12, con: 12, int: 10, wis: 11, cha: 10 }, attacks: [{ name: 'Spear', toHit: 3, damage: '1d6+1' }] },
        giant_rat: { name: 'Giant Rat', isMonster: true, ac: 12, hpMax: 7, speed: 30, proficiency: 2, initiativeMod: 2, abilities: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 }, attacks: [{ name: 'Bite', toHit: 4, damage: '1d4+2' }] }
    };
    function normalizeStats(s) {
        const d = defaultStats();
        if (!s || typeof s !== 'object') return d;
        d.abilities = { ...d.abilities, ...(s.abilities || {}) };
        for (const k of ['ac', 'hpMax', 'speed', 'proficiency', 'initiativeMod']) if (s[k] != null) d[k] = Number(s[k]);
        d.isMonster = !!s.isMonster;
        d.skills = s.skills && typeof s.skills === 'object' ? { ...s.skills } : {};
        d.saves = s.saves && typeof s.saves === 'object' ? { ...s.saves } : {};
        d.attacks = asArray(s.attacks);
        return d;
    }
    // Compact stat summary for injection, e.g. "AC 14, HP 30, STR 16(+3) DEX 12(+1)…, Init +2".
    function statSummary(stats) {
        if (!stats) return '';
        const s = normalizeStats(stats);
        const abil = ABILITIES.map(a => `${a.toUpperCase()} ${s.abilities[a]}(${fmtMod(abilityMod(s.abilities[a]))})`).join(' ');
        const init = (s.initiativeMod || abilityMod(s.abilities.dex));
        const atk = asArray(s.attacks).map(a => norm(a && a.name)).filter(Boolean).join(', ');
        return `AC ${s.ac}, HP ${s.hpMax}, ${abil}, Init ${fmtMod(init)}` + (atk ? `; Attacks: ${atk}` : '');
    }

    // =======================================================================
    //  QUESTS (Phase D)
    // =======================================================================
    const QUEST_STATES = ['available', 'active', 'complete', 'turnedin', 'failed'];
    function aiMode() { const w = activeWorld(); return (w && w.ruleset && w.ruleset.aiMode === 'player') ? 'player' : 'gm'; }
    function questStateOf(q) { const s = rt() && rt().questState && rt().questState[q.id]; return s || 'available'; }
    function isDiscovered(kind, id) { return !!(rt() && rt().discovered && asArray(rt().discovered[kind]).includes(id)); }
    function discover(kind, id) { if (!rt()) return; rt().discovered = rt().discovered || { quests: [], events: [], descriptions: [] }; const a = rt().discovered[kind] = asArray(rt().discovered[kind]); if (!a.includes(id)) a.push(id); }
    // Is this quest visible to the given viewer? gm/creator see all; player sees
    // non-hidden or already-discovered quests.
    function questVisible(q, mode) {
        if (!q) return false;
        if (mode === 'gm' || mode === 'creator') return true;
        return !q.hidden || isDiscovered('quests', q.id);
    }
    // The description to show a given viewer (real vs hidden/??? until discovered).
    function questDescription(q, mode) {
        const revealed = (mode === 'gm' || mode === 'creator') || !q.hiddenDescription || isDiscovered('descriptions', q.id);
        return revealed ? norm(q.description) : (norm(q.hiddenDescription) || '???');
    }
    // WoW-style marker for a person: '?' = has a completable turn-in, '!' = offers
    // an available quest. '' otherwise.
    function personQuestMarker(personId, mode) {
        const world = activeWorld(); if (!world || !personId) return '';
        const quests = asArray(world.quests);
        for (const q of quests) if (q.turninPersonId === personId && questStateOf(q) === 'complete' && questVisible(q, mode)) return '?';
        for (const q of quests) if (q.giverPersonId === personId && questStateOf(q) === 'available' && questVisible(q, mode)) return '!';
        return '';
    }
    function setQuestState(questId, state) {
        ensureRuntime();
        if (!QUEST_STATES.includes(state)) return null;
        rt().questState[questId] = state;
        if (state === 'active' && !rt().activeQuestId) rt().activeQuestId = questId;
        dbg('quest', questId, '->', state);
        try { fireTriggers('quest:' + questId + ':' + state); } catch (_) {}   // quest -> event chains
        return state;
    }
    // Render-ready quest list for the log UI (respects the given viewer mode).
    function listQuests(mode) {
        const world = activeWorld(); if (!world) return [];
        mode = mode || 'gm';
        return asArray(world.quests).filter(q => questVisible(q, mode)).map(q => {
            const giver = findById(world.npcs, q.giverPersonId), turnin = findById(world.npcs, q.turninPersonId);
            return {
                id: q.id, title: norm(q.title) || norm(q.name) || 'Quest',
                description: questDescription(q, mode), hidden: !!q.hidden,
                state: questStateOf(q), active: rt() && rt().activeQuestId === q.id,
                giver: giver ? personName(giver) : '', turnin: turnin ? personName(turnin) : '',
                rewards: asArray(q.rewards), objectives: asArray(q.objectives),
                marker: personQuestMarker(q.giverPersonId, mode) || personQuestMarker(q.turninPersonId, mode)
            };
        });
    }

    // Safe, non-eval condition evaluator over runtime facts.
    function factValue(field) {
        const c = rt()?.clock || {};
        switch (norm(field)) {
            case 'time': return norm(c.time).toLowerCase();
            case 'season': return norm(c.season).toLowerCase();
            case 'weather': return norm(c.weather).toLowerCase();
            case 'day': return Number(c.day) || 0;
            case 'month': return Number(c.month) || 0;
            case 'year': return Number(c.year) || 0;
            case 'location': return rt()?.playerLocationId || '';
            default:
                if (field && field.indexOf('flag.') === 0) return rt()?.flags?.[field.slice(5)];
                if (field && field.indexOf('quest.') === 0) return rt()?.questState?.[field.slice(6)];
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
            case 'has_flag': return !!rt()?.flags?.[cond.value];
            case 'not_flag': return !rt()?.flags?.[cond.value];
            default: return false;
        }
    }
    function eventActive(world, ev) {
        if (!ev) return false;
        if (!ev.repeatable && asArray(rt()?.completedEventIds).includes(ev.id)) return false;
        // location gate: if event lists locationIds, require player to be there
        if (asArray(ev.locationIds).length && !ev.locationIds.includes(rt()?.playerLocationId)) return false;
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
        if (!rt()) return null;
        const c = rt().clock;
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
        const inv = rt().inventory;
        const ex = inv.find(i => norm(i.name).toLowerCase() === n.toLowerCase());
        if (ex) ex.qty = (Number(ex.qty) || 1) + qty; else inv.push({ id: uid('item'), name: n, qty });
    }
    function inventoryRemove(name, qty) {
        const n = norm(name).toLowerCase(); if (!n) return;
        const inv = rt().inventory;
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
        const world = activeWorld(); if (!world || !rt()) return false;
        let changed = false;
        const s = String(text || '');
        const scan = (re, fn) => { let m; re.lastIndex = 0; while ((m = re.exec(s)) !== null) { try { if (fn(m) !== false) changed = true; } catch (_) {} } };

        scan(/<move>\s*([^<>]+?)\s*<\/move>/gi, m => {
            const l = findById(world.locations, m[1]) || locationByName(world, m[1]);
            if (l) { rt().playerLocationId = l.id; return true; } return false;
        });
        scan(/<npcmove>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/npcmove>/gi, m => {
            const npc = findNpcByName(world, m[1]); const l = findById(world.locations, m[2]) || locationByName(world, m[2]);
            if (npc && l) { (rt().npcStateOverrides[npc.id] = rt().npcStateOverrides[npc.id] || {}).locationId = l.id; return true; } return false;
        });
        scan(/<mood>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/mood>/gi, m => {
            const npc = findNpcByName(world, m[1]);
            if (npc) { (rt().npcStateOverrides[npc.id] = rt().npcStateOverrides[npc.id] || {}).mood = norm(m[2]); return true; } return false;
        });
        scan(/<flag>\s*([^=<>]+?)\s*(?:=\s*([^<>]*?))?\s*<\/flag>/gi, m => { rt().flags[norm(m[1])] = parseFlagValue(m[2]); return true; });
        scan(/<unflag>\s*([^<>]+?)\s*<\/unflag>/gi, m => { delete rt().flags[norm(m[1])]; return true; });
        scan(/<give>\s*([^<>]+?)\s*<\/give>/gi, m => { const [, nm, q] = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(m[1])) || []; inventoryAdd(nm, q); return true; });
        scan(/<take>\s*([^<>]+?)\s*<\/take>/gi, m => { const [, nm, q] = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(m[1])) || []; inventoryRemove(nm, q); return true; });
        scan(/<quest>\s*([^=<>]+?)\s*=\s*([^<>]+?)\s*<\/quest>/gi, m => { rt().questState[norm(m[1])] = norm(m[2]); return true; });
        scan(/<time>\s*([^<>]+?)\s*<\/time>/gi, m => { const t = norm(m[1]).toLowerCase(); if (TIME_SLOTS.includes(t)) { rt().clock.time = t; return true; } return false; });
        scan(/<weather>\s*([^<>]+?)\s*<\/weather>/gi, m => { rt().clock.weather = norm(m[1]); return true; });
        scan(/<advance\s*\/?>/gi, () => { advanceClock(1); return true; });
        scan(/<action>\s*([^<>]+?)\s*<\/action>/gi, m => { try { fireTriggers('action:' + norm(m[1])); } catch (_) {} return true; });
        // combat tags
        scan(/<roll>\s*([^<>]+?)\s*<\/roll>/gi, m => { const r = rollExpr(m[1]); combatLog(`Roll ${r.expr} = ${r.total} [${r.rolls.join(',')}]`); return true; });
        scan(/<attack>\s*([^=<>]+?)\s*->\s*([^<>]+?)\s*<\/attack>/gi, m => { const a = resolveCombatant(m[1]), t = resolveCombatant(m[2]); if (a && t) combatAttack(a, t); return true; });
        scan(/<hp>\s*([^=<>]+?)\s*=\s*([+-]?\d+)\s*<\/hp>/gi, m => { const id = resolveCombatant(m[1]); if (!id) return false; const n = Number(m[2]); if (n < 0) combatDamage(id, -n); else combatHeal(id, n); return true; });
        scan(/<check>\s*([^=<>]+?)\s*=\s*([a-z]{3})\s*(\d+)\s*<\/check>/gi, m => { const id = resolveCombatant(m[1]); if (id) abilityCheck(id, m[2], Number(m[3])); return true; });
        return changed;
    }

    // Apply one effect op and return the cascade signals it produces (so the
    // trigger bus can chain). Used by event `effects` and by the effect editor.
    function applyEffect(effect) {
        if (!effect || typeof effect !== 'object' || !rt()) return [];
        const world = activeWorld(); const sigs = [];
        switch (norm(effect.type)) {
            case 'flag': rt().flags[norm(effect.key)] = ('value' in effect) ? effect.value : true; sigs.push('flag:' + norm(effect.key)); break;
            case 'unflag': delete rt().flags[norm(effect.key)]; sigs.push('flag:' + norm(effect.key)); break;
            case 'give': inventoryAdd(effect.name, effect.qty); break;
            case 'take': inventoryRemove(effect.name, effect.qty); break;
            case 'quest': { const id = norm(effect.id || effect.questId); const st = norm(effect.state) || 'available'; rt().questState[id] = st; sigs.push('quest:' + id + ':' + st); break; }
            case 'discover': { if (effect.quest) discover('quests', norm(effect.quest)); if (effect.description) discover('descriptions', norm(effect.description)); if (effect.event) discover('events', norm(effect.event)); break; }
            case 'move': { const l = findById(world && world.locations, effect.locationId) || locationByName(world, effect.location); if (l) { rt().playerLocationId = l.id; sigs.push('enter:' + l.id); } break; }
            case 'npcmove': { const npc = findById(world && world.npcs, effect.npcId) || findNpcByName(world, effect.npc); const l = findById(world && world.locations, effect.locationId) || locationByName(world, effect.location); if (npc && l) (rt().npcStateOverrides[npc.id] = rt().npcStateOverrides[npc.id] || {}).locationId = l.id; break; }
            case 'advance': advanceClock(Number(effect.slots) || 1); sigs.push('time'); break;
            case 'fireEvent': if (effect.eventId) sigs.push('manual:' + norm(effect.eventId)); break;
            default: break;
        }
        return sigs;
    }

    // =======================================================================
    //  TRIGGER BUS — events fire on signals; chains cascade (Phase E)
    // =======================================================================
    // Signals: 'turn', 'time', 'enter:<locId>', 'flag:<key>',
    //          'quest:<qid>:<state>', 'event:<evId>', 'action:<text>', 'manual:<evId>'.
    let firedEventsBuffer = [];   // event ids fired since the last generation (for injection)
    let firing = false, pendingSignals = [];
    function eventTriggers(ev) { const t = asArray(ev.triggers); return t.length ? t : [{ type: 'onTurn' }]; }
    function triggerMatches(trig, signal, ev) {
        const c = (rt() && rt().clock) || {};
        switch (norm(trig.type)) {
            case 'onTurn': return signal === 'turn';
            case 'onTime':
                if (signal !== 'turn' && signal !== 'time') return false;
                if (trig.time && norm(trig.time).toLowerCase() !== norm(c.time).toLowerCase()) return false;
                if (trig.season && norm(trig.season).toLowerCase() !== norm(c.season).toLowerCase()) return false;
                if (trig.day != null && Number(trig.day) !== Number(c.day)) return false;
                return true;
            case 'onEnterLocation':
                return signal === 'enter:' + trig.locationId || (signal === 'turn' && rt().playerLocationId === trig.locationId);
            case 'onFlag': {
                if (signal !== 'flag:' + norm(trig.key) && signal !== 'turn') return false;
                const v = rt().flags[norm(trig.key)];
                return ('value' in trig) ? (v == trig.value) : !!v;
            }
            case 'onQuestState':
                return signal === 'quest:' + norm(trig.questId) + ':' + norm(trig.state) ||
                       (signal === 'turn' && norm(rt().questState[norm(trig.questId)]) === norm(trig.state));
            case 'onEvent': return signal === 'event:' + norm(trig.eventId);
            case 'onAction': return typeof signal === 'string' && signal.indexOf('action:') === 0 &&
                       (norm(trig.pattern) === '' || signal.slice(7).toLowerCase().includes(norm(trig.pattern).toLowerCase()));
            case 'manual': return signal === 'manual:' + ev.id;
            default: return signal === 'turn';
        }
    }
    // Fire all events matching `signal` (and their chains). Bounded + loop-safe.
    function fireTriggers(signal) {
        const world = activeWorld(); if (!world || !rt()) return [];
        if (firing) { pendingSignals.push(signal); return []; }
        firing = true;
        const fired = [];
        try {
            const queue = [signal]; let steps = 0; const firedNow = new Set();
            while (queue.length && steps < 400) {
                steps++;
                const sig = queue.shift();
                for (const ev of asArray(world.events)) {
                    if (firedNow.has(ev.id)) continue;
                    if (!ev.repeatable && asArray(rt().completedEventIds).includes(ev.id)) continue;
                    if (!eventTriggers(ev).some(t => triggerMatches(t, sig, ev))) continue;
                    if (asArray(ev.locationIds).length && !ev.locationIds.includes(rt().playerLocationId)) continue;
                    if (!asArray(ev.conditions).every(evalCondition)) continue;
                    // FIRE
                    firedNow.add(ev.id); fired.push(ev.id);
                    if (!firedEventsBuffer.includes(ev.id)) firedEventsBuffer.push(ev.id);
                    if (!ev.repeatable && !asArray(rt().completedEventIds).includes(ev.id)) rt().completedEventIds.push(ev.id);
                    for (const eff of asArray(ev.effects)) for (const s of applyEffect(eff)) queue.push(s);
                    queue.push('event:' + ev.id);
                    dbg('event fired:', ev.id, 'via', sig);
                }
            }
        } catch (e) { err('fireTriggers', e); }
        finally { firing = false; }
        while (pendingSignals.length) fireTriggers(pendingSignals.shift());
        return fired;
    }

    // =======================================================================
    //  DICE + COMBAT — deterministic d20 engine (Phase F)
    //  Rules based on the SRD 5.1 (WotC, CC-BY-4.0). The mod is authoritative for
    //  rolls/HP/initiative; the AI narrates the injected outcomes.
    // =======================================================================
    function rollDie(sides) { return 1 + Math.floor(Math.random() * Math.max(1, Number(sides) || 20)); }
    // Roll a dice expression like "2d6+3", "d20", "1d8-1". Returns {total, rolls, expr}.
    function rollExpr(expr) {
        const s = norm(expr).toLowerCase().replace(/\s+/g, '');
        const rolls = []; let total = 0;
        const re = /([+-]?)(\d*)d(\d+)|([+-]?\d+)/g; let m;
        while ((m = re.exec(s)) !== null) {
            if (m[3]) { const sign = m[1] === '-' ? -1 : 1, n = m[2] === '' ? 1 : Number(m[2]), sides = Number(m[3]);
                for (let i = 0; i < n; i++) { const r = rollDie(sides); rolls.push(r); total += sign * r; } }
            else if (m[4] != null && m[4] !== '') total += Number(m[4]);
        }
        return { total, rolls, expr: s || String(expr) };
    }
    // Roll a d20 with modifier and optional advantage/disadvantage.
    function rollD20(mod, mode) {
        const a = rollDie(20), b = rollDie(20);
        const die = mode === 'adv' ? Math.max(a, b) : (mode === 'dis' ? Math.min(a, b) : a);
        return { die, total: die + (Number(mod) || 0), mod: Number(mod) || 0, rolls: mode ? [a, b] : [a], crit: die === 20, fumble: die === 1 };
    }

    function playerCombatCfg() { const w = activeWorld(); return (w && w.ruleset && w.ruleset.player) || {}; }
    function combatantStats(id) {
        if (id === '__player__') return normalizeStats(playerCombatCfg().stats || {});
        const p = entityById(activeWorld(), id); return normalizeStats(p && p.stats || {});
    }
    function combatantName(id) {
        if (id === '__player__') return norm(playerCombatCfg().name) || 'You';
        const p = entityById(activeWorld(), id); return p ? personName(p) : String(id);
    }
    function combatLog(msg) { const cb = rt() && rt().combat; if (cb) { cb.log.push(msg); if (cb.log.length > 24) cb.log.shift(); } dbg('combat:', msg); }
    // Resolve a combatant id from a name/keyword ('you'/'player' → __player__, else NPC).
    function resolveCombatant(name) {
        const n = norm(name).toLowerCase(); if (!n) return null;
        if (n === 'you' || n === 'player' || n === 'self') return '__player__';
        const cb = getCombat();
        if (cb) { const hit = cb.order.find(o => norm(o.name).toLowerCase() === n); if (hit) return hit.id; }
        const npc = findNpcByName(activeWorld(), name); return npc ? npc.id : null;
    }

    function startEncounter(ids, opts = {}) {
        ensureRuntime();
        const list = asArray(ids).slice();
        if (opts.includePlayer !== false && !list.includes('__player__')) list.unshift('__player__');
        const order = list.map(id => { const st = combatantStats(id); const init = rollD20(st.initiativeMod || abilityMod(st.abilities.dex)).total; return { id, name: combatantName(id), init, isPlayer: id === '__player__' }; });
        order.sort((a, b) => b.init - a.init || (b.isPlayer - a.isPlayer));
        const hp = {}, maxHp = {};
        for (const c of order) { const st = combatantStats(c.id); maxHp[c.id] = st.hpMax; hp[c.id] = st.hpMax; }
        rt().combat = { active: true, round: 1, turnIndex: 0, order, hp, maxHp, log: [] };
        combatLog(`Combat begins. Initiative: ${order.map(o => `${o.name} ${o.init}`).join(', ')}`);
        return rt().combat;
    }
    function endEncounter() { if (rt()) rt().combat = null; }
    function getCombat() { return rt() && rt().combat; }
    function nextTurn() {
        const cb = getCombat(); if (!cb) return null;
        // skip downed combatants
        let guard = 0;
        do { cb.turnIndex++; if (cb.turnIndex >= cb.order.length) { cb.turnIndex = 0; cb.round++; combatLog(`— Round ${cb.round} —`); } guard++; }
        while (guard < cb.order.length + 1 && (cb.hp[cb.order[cb.turnIndex].id] || 0) <= 0);
        return cb.order[cb.turnIndex];
    }
    function combatDamage(targetId, amount) { const cb = getCombat(); if (!cb) return; cb.hp[targetId] = Math.max(0, (cb.hp[targetId] != null ? cb.hp[targetId] : combatantStats(targetId).hpMax) - Number(amount)); combatLog(`${combatantName(targetId)} takes ${amount} damage → HP ${cb.hp[targetId]}/${cb.maxHp[targetId]}${cb.hp[targetId] <= 0 ? ' (down!)' : ''}`); return cb.hp[targetId]; }
    function combatHeal(targetId, amount) { const cb = getCombat(); if (!cb) return; cb.hp[targetId] = Math.min(cb.maxHp[targetId] || 999, (cb.hp[targetId] || 0) + Number(amount)); combatLog(`${combatantName(targetId)} heals ${amount} → HP ${cb.hp[targetId]}/${cb.maxHp[targetId]}`); return cb.hp[targetId]; }
    function combatAttack(attackerId, targetId, attackIndex) {
        const cb = getCombat(); if (!cb) return null;
        const aSt = combatantStats(attackerId), tSt = combatantStats(targetId);
        const atk = asArray(aSt.attacks)[Number(attackIndex) || 0] || { name: 'Attack', toHit: aSt.proficiency + abilityMod(aSt.abilities.str), damage: '1d6' };
        const toHit = (atk.toHit != null) ? Number(atk.toHit) : (aSt.proficiency + abilityMod(aSt.abilities.str));
        const hit = rollD20(toHit);
        if (hit.fumble) { combatLog(`${combatantName(attackerId)} attacks ${combatantName(targetId)} with ${atk.name}: natural 1 — miss.`); return { hit: false, fumble: true, roll: hit.total }; }
        if (hit.total >= tSt.ac || hit.crit) {
            const base = rollExpr(atk.damage || '1d6'); let dmg = base.total;
            if (hit.crit) dmg += rollExpr(atk.damage || '1d6').total; // crit: double the dice
            const hpLeft = combatDamageInternal(targetId, dmg, tSt);
            combatLog(`${combatantName(attackerId)} ${hit.crit ? 'CRITS' : 'hits'} ${combatantName(targetId)} with ${atk.name} (${hit.total} vs AC ${tSt.ac}) for ${dmg} → HP ${hpLeft}/${cb.maxHp[targetId]}${hpLeft <= 0 ? ' (down!)' : ''}`);
            return { hit: true, crit: hit.crit, roll: hit.total, ac: tSt.ac, damage: dmg, targetHp: hpLeft };
        }
        combatLog(`${combatantName(attackerId)} misses ${combatantName(targetId)} with ${atk.name} (${hit.total} vs AC ${tSt.ac}).`);
        return { hit: false, roll: hit.total, ac: tSt.ac };
    }
    function combatDamageInternal(targetId, amount, tSt) { const cb = getCombat(); cb.hp[targetId] = Math.max(0, (cb.hp[targetId] != null ? cb.hp[targetId] : (tSt || combatantStats(targetId)).hpMax) - Number(amount)); return cb.hp[targetId]; }
    function abilityCheck(id, ability, dc, mode) {
        const st = combatantStats(id); const ab = norm(ability).toLowerCase();
        const mod = abilityMod(st.abilities[ab] != null ? st.abilities[ab] : 10);
        const r = rollD20(mod, mode); const success = r.total >= Number(dc);
        combatLog(`${combatantName(id)} ${ab.toUpperCase()} check: ${r.total} vs DC ${dc} — ${success ? 'success' : 'fail'}`);
        return { ...r, ability: ab, dc: Number(dc), success };
    }
    // Human-readable combat state for injection.
    function combatText() {
        const cb = getCombat(); if (!cb || !cb.active) return '';
        const cur = cb.order[cb.turnIndex];
        const roster = cb.order.map(o => `${o.id === cur.id ? '▶ ' : '  '}${o.name} (init ${o.init}) HP ${cb.hp[o.id]}/${cb.maxHp[o.id]}${cb.hp[o.id] <= 0 ? ' — down' : ''}`).join('\n');
        const recent = cb.log.slice(-4).join('\n');
        return `Round ${cb.round}. Current turn: ${cur.name}.\n${roster}` + (recent ? `\nRecent:\n${recent}` : '');
    }
    // Scan any chat messages we haven't parsed yet, apply their tags, advance the
    // per-turn clock if configured. Called at generation time (before slice build).
    function processPendingMutations() {
        if (!rt()) return false;
        const arr = window.gametext_arr;
        if (!Array.isArray(arr)) return false;
        const start = Math.max(0, Math.min(Number(rt().lastParsedIndex) || 0, arr.length));
        let changed = false;
        for (let i = start; i < arr.length; i++) changed = parseMutations(arr[i]) || changed;
        const advanced = W.config.advanceClockPerTurn && arr.length > start;
        rt().lastParsedIndex = arr.length;
        if (advanced) advanceClock(1);
        if (changed || advanced) dbg('applied pending mutations; loc=', rt().playerLocationId);
        return changed || advanced;
    }

    // =======================================================================
    //  RETRIEVAL ENGINE — computeActiveSlice()
    // =======================================================================
    // Resolve current location: explicit runtime id, else keyword scan of chat.
    // Only persists the resolved id back to runtime when mutate=true.
    function resolveCurrentLocation(world, mutate) {
        let loc = findById(world.locations, rt()?.playerLocationId);
        if (loc) return loc;
        const ctx = recentContext().toLowerCase();
        if (ctx) {
            // longest name first so "Village Tavern" beats "Village"
            const sorted = asArray(world.locations).slice().sort((a, b) => norm(b.name).length - norm(a.name).length);
            for (const l of sorted) {
                const n = norm(l.name).toLowerCase();
                if (n && ctx.includes(n)) { if (mutate && rt()) rt().playerLocationId = l.id; return l; }
            }
        }
        // fallback: first location
        loc = asArray(world.locations)[0] || null;
        if (loc && mutate && rt() && !rt().playerLocationId) rt().playerLocationId = loc.id;
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
        if (!world || !rt()) return { sections: [], location: null };
        const loc = resolveCurrentLocation(world, mutate);
        const sections = [];
        const push = (title, priority, text) => { if (norm(text)) sections.push({ title, priority, text: norm(text) }); };

        // 0. World premise (the root node's Description) — leads the slice.
        push('World: ' + nodeName('world', world), 100, norm(world.description));
        // 1. World rules (constant framing)
        if (W.config.insertRules) {
            const rules = asArray(world.rules).map(norm).filter(Boolean).join('\n');
            push('World Rules', 100, rules);
        }
        // 2. Current time
        const c = rt().clock || {};
        push('Current Time', 90,
            `Day ${c.day}, ${c.season} (${c.time}). Weather: ${c.weather}.`);

        // 2b. Player state (runtime) — high priority per spec
        const stateBits = [];
        const inv = asArray(rt().inventory).filter(i => i && norm(i.name));
        if (inv.length) stateBits.push('Inventory: ' + inv.map(i => norm(i.name) + ((Number(i.qty) || 1) > 1 ? ` x${i.qty}` : '')).join(', '));
        const party = asArray(rt().party).map(id => (findById(world.npcs, id) || {}).name).filter(Boolean);
        if (party.length) stateBits.push('Party: ' + party.map(norm).join(', '));
        push('Player State', 85, stateBits.join('\n'));

        // 2c. Combat state (top priority when an encounter is active)
        push('Combat', 96, combatText());

        if (!loc) { return { sections, location: null }; }
        // mark visited
        if (mutate && rt() && !asArray(rt().visitedLocationIds).includes(loc.id)) rt().visitedLocationIds.push(loc.id);

        // 3. Current location
        const exits = asArray(loc.exits).map(e => norm(e && e.name) || (findById(world.locations, e && e.locationId) || {}).name)
            .filter(Boolean)
            .concat(connectedLocations(world, loc, 1).map(l => norm(l.name)));
        const exitsUniq = [...new Set(exits.map(norm).filter(Boolean))];
        let locText = norm(loc.description);
        if (norm(loc.atmosphere)) locText += `${locText ? '\n' : ''}Atmosphere: ${norm(loc.atmosphere)}`;
        if (exitsUniq.length) locText += `${locText ? '\n' : ''}Exits: ${exitsUniq.join(', ')}`;
        const hqFactions = asArray(world.factions).filter(f => f.hqLocationId === loc.id).map(f => norm(f.name)).filter(Boolean);
        if (hqFactions.length) locText += `${locText ? '\n' : ''}Headquarters of: ${hqFactions.join(', ')}`;
        // Always emit the location header (even with an empty body) — location
        // awareness is the core purpose, the AI must always know where it is.
        sections.push({ title: `Current Location: ${norm(loc.name)}`, priority: 80, text: locText });

        // 4. Nearby NPCs (resident here or scheduled here now)
        const npcsHere = asArray(world.npcs).filter(npc => resolveNpcLocationId(npc) === loc.id ||
            asArray(loc.npcIds).includes(npc.id));
        const npcSeen = new Set();
        const npcLines = [];
        const mode = aiMode();
        for (const npc of npcsHere) {
            if (npcSeen.has(npc.id)) continue; npcSeen.add(npc.id);
            const faction = findById(world.factions, npc.factionId);
            const marker = personQuestMarker(npc.id, mode);   // ! offers a quest, ? turn-in ready
            const bits = [(marker ? marker + ' ' : '') + personName(npc)];
            const blurb = personBlurb(npc); if (blurb) bits.push(blurb);
            const md = npcMood(npc); if (md) bits.push(`Mood: ${md}`);
            if (faction) bits.push(`Faction: ${norm(faction.name)}`);
            if (npc.stats) bits.push(statSummary(npc.stats));  // d20 block when present
            npcLines.push('- ' + bits.join(' | '));
            if (mutate && rt() && !asArray(rt().knownNpcIds).includes(npc.id)) rt().knownNpcIds.push(npc.id);
        }
        push('Nearby NPCs', 70, npcLines.join('\n'));

        // 5. Nearby objects
        const objsHere = asArray(world.objects).filter(o => o.locationId === loc.id || asArray(loc.objectIds).includes(o.id));
        const objLines = objsHere.map(o => '- ' + norm(o.name) + (norm(o.desc) ? `: ${norm(o.desc)}` : ''));
        push('Nearby Objects', 50, objLines.join('\n'));

        // 5b. Quests — active (tracked) ones in detail; visible per aiMode.
        const questLines = [];
        for (const q of asArray(world.quests)) {
            const st = questStateOf(q);
            if (st !== 'active' && st !== 'complete') continue;     // only accepted quests
            if (!questVisible(q, mode)) continue;
            const title = norm(q.title) || norm(q.name) || 'Quest';
            const track = (rt().activeQuestId === q.id) ? ' [tracked]' : '';
            const desc = questDescription(q, mode);
            const objs = asArray(q.objectives).filter(o => questVisible(q, mode) && !o.hidden)
                .map(o => `    ${(rt().questObjectives?.[q.id]?.[o.id]) ? '☑' : '☐'} ${norm(o.text)}`).filter(Boolean);
            questLines.push(`- ${title} [${st}]${track}` + (desc ? `: ${desc}` : '') + (objs.length ? '\n' + objs.join('\n') : ''));
        }
        push('Active Quests', 45, questLines.join('\n'));

        // 6. Active events — fired this turn (via the trigger bus) + ambient
        // conditional events. Firing/completion is handled by fireTriggers(), not here.
        const evLines = []; const seenEv = new Set();
        for (const ev of asArray(world.events)) {
            // Events with an explicit discrete trigger show only when they fire;
            // trigger-less / onTurn events are ambient (governed by conditions).
            const ambient = !asArray(ev.triggers).length || asArray(ev.triggers).some(t => norm(t.type) === 'onTurn');
            const show = firedEventsBuffer.includes(ev.id) || (ambient && eventActive(world, ev));
            if (!show || seenEv.has(ev.id)) continue;
            if (ev.hidden && mode === 'player' && !isDiscovered('events', ev.id)) continue; // hidden from player AI
            seenEv.add(ev.id);
            evLines.push('- ' + (norm(ev.name) ? norm(ev.name) + ': ' : '') + norm(ev.description));
        }
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
            if (!W.config.enabled || !activeWorld() || !rt()) { refreshWiEditor(); return 0; }
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
    // Is Esolite's agent mode enabled? (mirrors the host's own
    // isAgentModeEnabledAndSetCorrectly: opmode 4 + agentBehaviour). In agent mode the
    // tool-loop calls submit_generation("") directly, bypassing our prepare hook, so we
    // must NOT clean up the managed entries synchronously — keep them for the turn.
    function agentModeEnabled() {
        try {
            const ls = window.localsettings;
            return !!(ls && ls.opmode == 4 && ls.agentBehaviour);
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
                if (W.config.enabled && activeWorld() && rt()) {
                    // Apply state-change tags from prior messages, run the trigger bus
                    // for this turn (onTurn/onTime/onEnter/… + chains), then build the slice.
                    processPendingMutations();
                    try { fireTriggers('turn'); } catch (_) {}
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
                    if (injected && W.config.injectMode === 'transient' && !websearchActive() && !agentModeEnabled()) {
                        removeWorldsEntries();
                        refreshWiEditor();
                    }
                    if (injected) firedEventsBuffer = []; // consumed by this turn's slice
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
                        try { if (rt() && Array.isArray(window.gametext_arr)) rt().lastParsedIndex = window.gametext_arr.length; } catch (_) {}
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
    const TYPE_ARRAYS = { location: 'locations', npc: 'npcs', faction: 'factions', object: 'objects', event: 'events', quest: 'quests', lore: 'globalLore' };
    // Which primitive field holds a node's "entry" text, per type.
    const ENTRY_FIELD = { location: 'description', npc: 'description', faction: 'description', object: 'desc', event: 'description', quest: 'description', lore: 'content' };

    // Ensure every entity has an id and the arrays exist.
    function normalizeWorld(world) {
        if (!world || typeof world !== 'object') return world;
        for (const t of Object.keys(TYPE_ARRAYS)) {
            const key = TYPE_ARRAYS[t];
            world[key] = asArray(world[key]);
            for (const e of world[key]) { if (e && !e.id) e.id = uid(t); }
        }
        world.rules = asArray(world.rules);
        if (!world.ruleset || typeof world.ruleset !== 'object') world.ruleset = {};
        if (world.ruleset.aiMode !== 'player') world.ruleset.aiMode = 'gm'; // GM-omniscient by default
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
        if (type === 'npc') return norm(e.name) || norm(resolveCharacter(e)?.name) || 'New npc';
        if (type === 'quest') return norm(e.title) || norm(e.name) || 'New quest';
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
        for (const f of asArray(world.factions)) if (f.hqLocationId && findById(world.locations, f.hqLocationId)) edges.push({ from: f.id, to: f.hqLocationId, kind: 'hq' });
        for (const o of asArray(world.objects)) {
            if (o.locationId && findById(world.locations, o.locationId)) edges.push({ from: o.id, to: o.locationId, kind: 'in' });
            if (o.ownerNpcId && findById(world.npcs, o.ownerNpcId)) edges.push({ from: o.id, to: o.ownerNpcId, kind: 'owned' });
        }
        for (const ev of asArray(world.events)) for (const lid of asArray(ev.locationIds)) if (findById(world.locations, lid)) edges.push({ from: ev.id, to: lid, kind: 'occurs' });
        for (const q of asArray(world.quests)) {
            if (q.giverPersonId && findById(world.npcs, q.giverPersonId)) edges.push({ from: q.id, to: q.giverPersonId, kind: 'gives' });
            if (q.turninPersonId && findById(world.npcs, q.turninPersonId)) edges.push({ from: q.id, to: q.turninPersonId, kind: 'turnin' });
        }
        // Derived chain edges (visualise trigger/effect wiring)
        for (const ev of asArray(world.events)) {
            for (const t of asArray(ev.triggers)) {
                if (norm(t.type) === 'onQuestState' && findById(world.quests, t.questId)) edges.push({ from: t.questId, to: ev.id, kind: 'onquest' });
                if (norm(t.type) === 'onEnterLocation' && findById(world.locations, t.locationId)) edges.push({ from: t.locationId, to: ev.id, kind: 'onenter' });
            }
            for (const eff of asArray(ev.effects)) {
                const qid = eff.questId || eff.quest;
                if ((norm(eff.type) === 'quest' || norm(eff.type) === 'discover') && findById(world.quests, qid)) edges.push({ from: ev.id, to: qid, kind: 'affects' });
                if (norm(eff.type) === 'fireEvent' && findById(world.events, eff.eventId)) edges.push({ from: ev.id, to: eff.eventId, kind: 'chains' });
            }
        }
        return { world, nodes, edges };
    }

    function addEntity(type, fields = {}) {
        const world = activeWorld(); if (!world) throw new Error('no active world');
        const key = TYPE_ARRAYS[type]; if (!key) throw new Error('bad type ' + type);
        normalizeWorld(world);
        const e = { id: uid(type), ui: { x: Number(fields.x) || 300, y: Number(fields.y) || 200 } };
        if (type === 'lore') e.content = norm(fields.name) || '';
        else if (type === 'quest') e.title = norm(fields.title || fields.name) || 'New quest';
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
        for (const f of asArray(world.factions)) { if (f.hqLocationId === id) f.hqLocationId = null; }
        for (const o of asArray(world.objects)) { if (o.locationId === id) o.locationId = null; if (o.ownerNpcId === id) o.ownerNpcId = null; }
        for (const ev of asArray(world.events)) ev.locationIds = asArray(ev.locationIds).filter(x => x !== id);
        for (const q of asArray(world.quests)) { if (q.giverPersonId === id) q.giverPersonId = null; if (q.turninPersonId === id) q.turninPersonId = null; }
        if (rt() && rt().playerLocationId === id) rt().playerLocationId = null;
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
        if (is('faction', 'location')) { const fac = ta === 'faction' ? a : b, loc = locOf(); fac.hqLocationId = loc.id; return { kind: 'hq' }; }
        if (is('object', 'location')) { const obj = ta === 'object' ? a : b, loc = locOf(); obj.locationId = loc.id; loc.objectIds = asArray(loc.objectIds); if (!loc.objectIds.includes(obj.id)) loc.objectIds.push(obj.id); return { kind: 'in' }; }
        if (is('object', 'npc')) { const obj = ta === 'object' ? a : b, npc = ta === 'npc' ? a : b; obj.ownerNpcId = npc.id; return { kind: 'owned' }; }
        if (is('event', 'location')) { const ev = ta === 'event' ? a : b, loc = locOf(); ev.locationIds = asArray(ev.locationIds); if (!ev.locationIds.includes(loc.id)) ev.locationIds.push(loc.id); return { kind: 'occurs' }; }
        if (is('quest', 'npc')) { const q = ta === 'quest' ? a : b, npc = ta === 'npc' ? a : b; if (!q.giverPersonId) { q.giverPersonId = npc.id; return { kind: 'gives' }; } if (!q.turninPersonId) { q.turninPersonId = npc.id; return { kind: 'turnin' }; } q.giverPersonId = npc.id; return { kind: 'gives' }; }
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
            if (x.hqLocationId === yId) x.hqLocationId = null;
            if (x.locationId === yId) x.locationId = null;
            if (x.ownerNpcId === yId) x.ownerNpcId = null;
            if (x.giverPersonId === yId) x.giverPersonId = null;
            if (x.turninPersonId === yId) x.turninPersonId = null;
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
        ensureRuntime();
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

    // Export the world as portable JSON (deep clone). Embeds a snapshot of each
    // linked library character so the world stays usable without that library.
    function exportWorld(worldId) {
        const w = W.library[worldId || W.activeWorldId]; if (!w) return null;
        const clone = JSON.parse(JSON.stringify(w));
        for (const p of asArray(clone.npcs)) {
            if (p.characterRef && !p.characterSnapshot) {
                const c = resolveCharacter(p);
                if (c) p.characterSnapshot = { name: c.name, description: c.description || '', personality: c.personality || '', scenario: c.scenario || '' };
            }
        }
        return clone;
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

    // =======================================================================
    //  EXAMPLE WORLD — a ready-to-play showcase (Phase H)
    // =======================================================================
    const EXAMPLE_WORLD = {
        id: 'world_example', name: 'Eldoria (Example)',
        description: 'A small medieval low-fantasy starter world for the road between a village and the frontier.',
        rules: ['Medieval low-fantasy tone.', 'Keep replies vivid but concise.', 'When the scene changes location, emit <move>Location Name</move>.'],
        ruleset: { aiMode: 'gm', player: { name: 'You', stats: { abilities: { str: 14, dex: 14, con: 13, int: 10, wis: 12, cha: 11 }, ac: 16, hpMax: 12, proficiency: 2, attacks: [{ name: 'Longsword', toHit: 4, damage: '1d8+2' }, { name: 'Shortbow', toHit: 4, damage: '1d6+2' }] } } },
        ui: { x: 120, y: 320 },
        locations: [
            { id: 'loc_village', name: 'Millbrook Village', description: 'A small farming village gathered around an old stone well.', atmosphere: 'peaceful', connectedLocationIds: ['loc_tavern', 'loc_forest'], ui: { x: 380, y: 320 } },
            { id: 'loc_tavern', name: 'The Prancing Pony', description: 'A cozy tavern; hearth crackling, rumors flowing.', atmosphere: 'warm', connectedLocationIds: ['loc_village'], ui: { x: 380, y: 150 } },
            { id: 'loc_forest', name: 'Forest Road', description: 'An old trade road winding through dense woodland.', atmosphere: 'tense', connectedLocationIds: ['loc_village', 'loc_watchtower', 'loc_camp'], ui: { x: 620, y: 320 } },
            { id: 'loc_watchtower', name: 'Royal Watchtower', description: 'A stone tower guarding the frontier road.', atmosphere: 'disciplined', connectedLocationIds: ['loc_forest'], ui: { x: 860, y: 210 } },
            { id: 'loc_camp', name: 'Bandit Camp', description: 'A hidden camp tucked among the trees.', atmosphere: 'dangerous', connectedLocationIds: ['loc_forest'], ui: { x: 860, y: 440 } }
        ],
        npcs: [
            { id: 'npc_bram', name: 'Innkeeper Bram', personality: 'friendly, gossipy, knows everyone in town', homeLocationId: 'loc_tavern', factionId: 'fac_town', mood: 'cheerful', ui: { x: 200, y: 150 } },
            { id: 'npc_rowan', name: 'Captain Rowan', personality: 'stern, dutiful veteran of the Royal Guard', homeLocationId: 'loc_watchtower', factionId: 'fac_guard', mood: 'watchful', stats: { abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 12, cha: 11 }, ac: 18, hpMax: 22, proficiency: 2, attacks: [{ name: 'Longsword', toHit: 4, damage: '1d8+2' }] }, ui: { x: 1080, y: 170 } },
            { id: 'npc_courier', name: 'Courier Finn', personality: 'nervous, always out of breath', homeLocationId: 'loc_village', ui: { x: 200, y: 320 } },
            { id: 'npc_kell', name: 'Bandit Leader Kell', personality: 'ruthless and greedy', homeLocationId: 'loc_camp', factionId: 'fac_bandit', isMonster: true, stats: { abilities: { str: 14, dex: 14, con: 13, int: 11, wis: 10, cha: 12 }, ac: 15, hpMax: 27, proficiency: 2, attacks: [{ name: 'Scimitar', toHit: 4, damage: '1d6+2' }, { name: 'Light Crossbow', toHit: 4, damage: '1d8+2' }] }, ui: { x: 1080, y: 450 } }
        ],
        factions: [
            { id: 'fac_town', name: 'Millbrook Townsfolk', description: 'Ordinary villagers who keep to themselves.', ui: { x: 60, y: 80 } },
            { id: 'fac_guard', name: 'Royal Guard', description: 'Protect the kingdom and keep its roads safe.', hqLocationId: 'loc_watchtower', ui: { x: 1080, y: 60 } },
            { id: 'fac_bandit', name: 'The Red Hand', description: 'Bandits preying on the frontier trade road.', hqLocationId: 'loc_camp', ui: { x: 1080, y: 600 } }
        ],
        objects: [
            { id: 'obj_well', name: 'Stone Well', desc: 'The village water source; children dare each other to peer in.', locationId: 'loc_village', ui: { x: 380, y: 470 } },
            { id: 'obj_poster', name: 'Wanted Poster', desc: 'A bounty for the bandit leader — dead or alive.', locationId: 'loc_tavern', ui: { x: 200, y: 60 } }
        ],
        quests: [
            { id: 'q_merchant', title: 'The Missing Merchant', description: 'A merchant vanished on the Forest Road. Bram asks you to find out what happened.', giverPersonId: 'npc_bram', turninPersonId: 'npc_rowan', rewards: [{ type: 'item', item: 'Silver Ring', qty: 1 }, { type: 'xp', xp: 100 }], objectives: [{ id: 'o1', text: 'Search the Forest Road' }, { id: 'o2', text: 'Report to Captain Rowan' }], ui: { x: 200, y: 230 } },
            { id: 'q_bounty', title: 'Bandit Bounty', description: 'Captain Rowan will pay a bounty for the head of the bandit leader.', giverPersonId: 'npc_rowan', turninPersonId: 'npc_rowan', rewards: [{ type: 'xp', xp: 200 }], ui: { x: 1240, y: 300 } },
            { id: 'q_delivery', title: 'Urgent Delivery', description: 'Carry a sealed letter from Finn to the Watchtower.', giverPersonId: 'npc_courier', turninPersonId: 'npc_rowan', hidden: true, hiddenDescription: '??? — a courier may yet find you', ui: { x: 60, y: 320 } }
        ],
        events: [
            { id: 'ev_courier', name: 'A Courier Arrives', description: 'Finn the courier rushes in, clutching a sealed letter and begging for help.', triggers: [{ type: 'onQuestState', questId: 'q_merchant', state: 'active' }], effects: [{ type: 'npcmove', npcId: 'npc_courier', locationId: 'loc_tavern' }, { type: 'quest', questId: 'q_delivery', state: 'available' }, { type: 'discover', quest: 'q_delivery' }], repeatable: false, ui: { x: 200, y: 400 } },
            { id: 'ev_ambush', name: 'Bandit Ambush', description: 'Figures with red-painted hands spring from the treeline!', triggers: [{ type: 'onEnterLocation', locationId: 'loc_forest' }], conditions: [{ field: 'time', op: '==', value: 'night' }], effects: [{ type: 'flag', key: 'ambush_ready', value: true }], repeatable: true, ui: { x: 620, y: 470 } },
            { id: 'ev_omen', name: 'Ill Omen', description: 'A cold wind carries a whisper of danger.', hidden: true, triggers: [{ type: 'onEnterLocation', locationId: 'loc_camp' }], repeatable: true, ui: { x: 1080, y: 660 } }
        ],
        globalLore: [
            { id: 'gl_king', content: 'The kingdom of Eldoria is ruled by a distant king; the Royal Guard keeps its roads.', always: true },
            { id: 'gl_dragon', content: 'Old tales speak of a dragon sleeping beneath the northern mountains.', keys: ['dragon', 'mountain'] }
        ]
    };
    async function loadExample() {
        const w = deepClone(EXAMPLE_WORLD);
        normalizeWorld(w);
        W.library[w.id] = w;
        await saveLibrary();
        W.activeWorldId = w.id;
        W.runtime = newRuntime();
        const start = rt();
        start.playerLocationId = 'loc_village';
        start.clock = { day: 1, month: 4, year: 1, time: 'morning', season: 'spring', weather: 'clear' };
        commitToBase();            // authored start becomes the base checkpoint
        W.config.enabled = true;
        syncLive();
        dbg('example world loaded');
        return w.id;
    }

    // ----- two-slot state operations (base / working) -----
    function resetToBase() { if (!W.runtime) return false; W.runtime.working = deepClone(W.runtime.base); dbg('reset working <- base'); return true; }
    function commitToBase() { if (!W.runtime) return false; W.runtime.base = deepClone(W.runtime.working); dbg('commit base <- working'); return true; }
    function swapActive() { if (!W.runtime) return null; W.runtime.active = (W.runtime.active === 'working' ? 'base' : 'working'); dbg('active slot =', W.runtime.active); return W.runtime.active; }
    function setActiveSlot(slot) { if (!W.runtime || (slot !== 'base' && slot !== 'working')) return null; W.runtime.active = slot; return slot; }

    const API = {
        _state: W,
        get config() { return W.config; },
        get library() { return W.library; },
        // Backward-compatible: `runtime` is the ACTIVE snapshot; `runtimeSlots` is the container.
        get runtime() { return rt(); },
        get runtimeSlots() { return W.runtime; },
        get activeSlot() { return W.runtime ? W.runtime.active : null; },
        activeWorld,

        // ----- base / working state -----
        resetToBase() { const ok = resetToBase(); if (ok) syncLive(); return ok; },
        commitToBase, swapActive() { const s = swapActive(); syncLive(); return s; }, setActiveSlot(slot) { const s = setActiveSlot(slot); if (s) syncLive(); return s; },

        // ----- graph editing (for the editor UI) -----
        getGraph, addEntity, updateEntity, deleteEntity, connect, disconnect, setNodePos, changeEntityType,

        // ----- Person = Character + d20 stats (Phase C) -----
        listCharacters() { return characterLibrary().map(c => ({ id: c.id, name: c.name })).filter(c => c.name); },
        linkCharacter(personId, idOrName) {
            const p = entityById(activeWorld(), personId); if (!p) return false;
            const lib = characterLibrary();
            const c = lib.find(x => x && (x.id === idOrName || norm(x.name).toLowerCase() === norm(idOrName).toLowerCase()));
            p.characterRef = c ? { source: 'library', id: c.id, name: c.name } : { source: 'library', name: norm(idOrName) };
            // adopt the character's name if the person only has a placeholder
            if (c && (!norm(p.name) || p.name === 'New npc')) p.name = c.name;
            return true;
        },
        unlinkCharacter(personId) { const p = entityById(activeWorld(), personId); if (!p) return false; delete p.characterRef; delete p.characterSnapshot; return true; },
        resolvePersonCharacter(personId) { return resolveCharacter(entityById(activeWorld(), personId)); },
        personName(personId) { return personName(entityById(activeWorld(), personId)); },
        // Create a Person node pre-linked to a library character.
        addPersonFromCharacter(idOrName, fields = {}) {
            const p = addEntity('npc', fields);
            this.linkCharacter(p.id, idOrName);
            return p;
        },
        getStats(personId) { const p = entityById(activeWorld(), personId); return p && p.stats ? normalizeStats(p.stats) : null; },
        setStats(personId, patch) {
            const p = entityById(activeWorld(), personId); if (!p) return null;
            p.stats = normalizeStats({ ...(p.stats || {}), ...(patch || {}),
                abilities: { ...((p.stats || {}).abilities || {}), ...((patch || {}).abilities || {}) } });
            return p.stats;
        },
        clearStats(personId) { const p = entityById(activeWorld(), personId); if (p) delete p.stats; return true; },
        abilityMod, statSummary,

        // ----- Quests (Phase D) -----
        listQuests(mode) { return listQuests(mode || aiMode()); },
        questState(id) { const q = findById(activeWorld() && activeWorld().quests, id); return q ? questStateOf(q) : null; },
        setQuestState(id, state) { const s = setQuestState(id, state); syncLive(); return s; },
        acceptQuest(id) { const s = setQuestState(id, 'active'); syncLive(); return s; },
        completeQuest(id) { const s = setQuestState(id, 'complete'); syncLive(); return s; },
        turnInQuest(id) { const s = setQuestState(id, 'turnedin'); if (rt() && rt().activeQuestId === id) rt().activeQuestId = null; syncLive(); return s; },
        failQuest(id) { const s = setQuestState(id, 'failed'); syncLive(); return s; },
        setActiveQuest(id) { ensureRuntime(); rt().activeQuestId = id; syncLive(); return id; },
        discoverQuest(id) { discover('quests', id); discover('descriptions', id); syncLive(); return true; },
        completeObjective(qid, oid, done = true) { ensureRuntime(); const o = rt().questObjectives[qid] = rt().questObjectives[qid] || {}; o[oid] = !!done; syncLive(); return o; },
        personQuestMarker(personId) { return personQuestMarker(personId, aiMode()); },
        setAiMode(mode) { const w = activeWorld(); if (w) { w.ruleset = w.ruleset || {}; w.ruleset.aiMode = (mode === 'player' ? 'player' : 'gm'); } return w && w.ruleset.aiMode; },
        getAiMode() { return aiMode(); },

        // ----- Dice & combat (Phase F) -----
        roll(expr) { return rollExpr(expr); },
        rollD20(mod, mode) { return rollD20(mod, mode); },
        startEncounter(ids, opts) { const c = startEncounter(ids, opts); syncLive(); return c; },
        endEncounter() { endEncounter(); syncLive(); return true; },
        getCombat, combatText, combatantStats, combatantName, resolveCombatant,
        attack(a, t, i) { const r = combatAttack(a, t, i); syncLive(); return r; },
        damage(id, n) { const r = combatDamage(id, n); syncLive(); return r; },
        heal(id, n) { const r = combatHeal(id, n); syncLive(); return r; },
        nextTurn() { const r = nextTurn(); syncLive(); return r; },
        check(id, ability, dc, mode) { const r = abilityCheck(id, ability, dc, mode); syncLive(); return r; },
        listTemplates() { return Object.keys(SRD_TEMPLATES); },
        addPersonFromTemplate(key, fields = {}) {
            const tpl = SRD_TEMPLATES[key]; if (!tpl) throw new Error('unknown template ' + key);
            const p = addEntity('npc', { name: fields.name || tpl.name, x: fields.x, y: fields.y });
            const { name, ...stats } = tpl; p.stats = normalizeStats(stats); p.isMonster = true;
            return p;
        },
        setPlayerCombat(cfg) { const w = activeWorld(); if (w) { w.ruleset = w.ruleset || {}; w.ruleset.player = { ...(w.ruleset.player || {}), ...cfg }; if (cfg && cfg.stats) w.ruleset.player.stats = normalizeStats(cfg.stats); } return w && w.ruleset.player; },
        entityById(id) { return entityById(activeWorld(), id); },
        entityType(id) { return entityType(activeWorld(), id); },
        async saveActiveWorld() { await saveLibrary(); syncLive(); return true; },
        async newWorld(name) { const id = await createWorld(name); syncLive(); return id; },
        loadExample() { return loadExample(); },
        hasExample() { return !!W.library['world_example']; },

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
            ensureRuntime();
            syncLive();
            dbg('active world =', worldId);
            return true;
        },
        async deleteWorld(worldId) { delete W.library[worldId]; if (W.activeWorldId === worldId) { W.activeWorldId = null; W.config.enabled = false; syncLive(); } await saveLibrary(); },

        // ----- enable / disable per story -----
        enable() { if (!W.activeWorldId) throw new Error('select a world first (useWorld)'); ensureRuntime(); W.config.enabled = true; syncLive(); dbg('ENABLED'); return true; },
        disable() { W.config.enabled = false; removeWorldsEntries(); refreshWiEditor(); dbg('disabled'); return true; },
        isEnabled() { return !!W.config.enabled; },

        // ----- runtime controls -----
        moveTo(locationNameOrId) {
            const world = activeWorld(); if (!world) throw new Error('no active world');
            let loc = findById(world.locations, locationNameOrId) || locationByName(world, locationNameOrId);
            if (!loc) throw new Error('unknown location: ' + locationNameOrId);
            ensureRuntime();
            rt().playerLocationId = loc.id;
            try { fireTriggers('enter:' + loc.id); } catch (_) {}
            syncLive();
            dbg('moved to', loc.name);
            return loc.name;
        },
        setClock(patch) { ensureRuntime(); Object.assign(rt().clock, patch || {}); if (patch && patch.month != null) rt().clock.season = deriveSeason(rt().clock.month); try { fireTriggers('time'); } catch (_) {} syncLive(); return { ...rt().clock }; },
        setFlag(k, v) { ensureRuntime(); rt().flags[k] = v; try { fireTriggers('flag:' + k); } catch (_) {} syncLive(); return rt().flags; },
        unsetFlag(k) { ensureRuntime(); delete rt().flags[k]; try { fireTriggers('flag:' + k); } catch (_) {} syncLive(); return rt().flags; },
        advanceClock(slots) { const c = advanceClock(Number(slots) || 1); try { fireTriggers('time'); } catch (_) {} syncLive(); return c; },
        // Fire a named action signal (for onAction event triggers), e.g. from chat.
        fireAction(text) { const f = fireTriggers('action:' + norm(text)); syncLive(); return f; },
        fireTriggers(signal) { const f = fireTriggers(signal); syncLive(); return f; },
        firedEvents() { return firedEventsBuffer.slice(); },
        giveItem(name, qty) { ensureRuntime(); inventoryAdd(name, qty); syncLive(); return rt().inventory; },
        takeItem(name, qty) { ensureRuntime(); inventoryRemove(name, qty); syncLive(); return rt().inventory; },
        setQuest(id, state) { ensureRuntime(); rt().questState[norm(id)] = norm(state); syncLive(); return rt().questState; },
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

}
