// =============================================================================
// KLITE RPmod - Worlds System (Phase 1-5: engine + simulation)
// -----------------------------------------------------------------------------
// Adds a graph/state-based "Worlds" retrieval layer on top of Esolite.
//
// Design: "Compile-to-WI".  Worlds keeps its OWN data model as the source of
// truth (persisted separately). Each generation turn we compute the "active
// slice" (only the world state relevant to the player's current location/time).
// The slice is handed to RPmod's context owner (src/context/context.js) as the
// 'worlds' provider; that module turns it into constant WI entries in Esolite's
// current_wi for the turn (inheriting Esolite's size cap, context-usage meter and
// insert-location), removes them afterwards and strips them from every savefile.
//
//   injectMode 'transient' (default): entries exist only during a generation
//     (kept for the turn when websearch/agent mode make the chain async).
//   injectMode 'persistent': entries stay live in current_wi while enabled.
//
// Runtime state rides in a separate savefile key (rpmod_worlds). Nothing runs
// until a World is enabled for the current story.
// =============================================================================
import { getContext } from './context/context.js';
import * as CR from './game/combat-rules.js';
import * as QR from './game/quest-rules.js';
import * as MR from './game/map-rules.js';
import * as MT from './game/map-tags.js';
import * as MG from './game/map-gen.js';
import { derive as deriveSheet } from './characters/sheet.js';

export default function initWorlds() {
    'use strict';

    if (window.KLITE_RPMod_Worlds) return; // idempotent

    // ---- Constants --------------------------------------------------------
    const LEGACY_WI_GROUP = '__worlds__';        // managed-entry group before src/context (stripped from saves)
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
            inventory: [],           // { id, name, qty } — story inventory (used when no persona is set)
            coins: { gp: 0 },        // story gold (no persona)
            xp: 0,                   // story XP (no persona)
            rewardsPaid: {},         // { [questId]: { at, choice } } — each quest pays once
            reputation: {},          // { [factionId]: number }
            questState: {},          // { [questId]: 'available'|'active'|'complete'|'turnedin'|'failed' }
            questObjectives: {},     // { [questId]: { [objId]: true } }
            activeQuestId: null,     // the quest the player is currently tracking
            discovered: { quests: [], events: [], descriptions: [] }, // ids the player has revealed
            combat: null,            // active encounter state (see startEncounter)
            npcStateOverrides: {},   // { [npcId]: { locationId, mood, ... } }
            completedEventIds: [],   // non-repeatable events already fired
            startedEncounters: [],   // saved encounters already started (R7: "waiting here" hint)
            lastParsedIndex: 0,      // gametext_arr index up to which tags were applied
            // R7 exploration of dungeons/towns (map-rules.js): { [roomId]: 'known'|'discovered'|'visited' },
            // found secrets (exit/room ids) and traps, rooms searched, door states and room light
            // that override the authored ones
            explored: {}, found: { secrets: [], traps: [], searched: {} }, doorState: {}, roomLight: {},
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
                        base: MR.normalizeExploration({ ...defaultRuntime(), ...(v.base || v.working || {}) }),
                        working: MR.normalizeExploration({ ...defaultRuntime(), ...(v.working || v.base || {}) }) };
            return c;
        }
        // old flat snapshot -> seed both slots from it
        const snap = MR.normalizeExploration({ ...defaultRuntime(), ...v });
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
        const rev = edits.rev;
        try {
            await idbSave(IDB_LIBRARY_KEY, JSON.stringify(W.library)); dbg('library saved');
            if (edits.rev === rev) setDirty(false);   // edits made during the save stay unsaved
            return true;
        } catch (e) { err('saveLibrary failed', e); return false; }
    }

    // ---- unsaved world edits + optional autosave ----------------------------------
    // Authoring changes (editor, API) live in memory until saved. With the RPmod setting
    // "Autosave world edits" (Esolite Settings → RPmod; default off) they are saved about a
    // second after the last change; otherwise the UI shows them as unsaved, asks before the
    // editor closes and the browser warns before leaving. "Revert to saved" reloads the
    // library from storage (undoes e.g. an accidental delete).
    const AUTOSAVE_SETTING = 'worlds_autosave';
    const AUTOSAVE_DELAY = 1000;
    const ASCII_MAP_SETTING = 'map_ascii_ai';
    function settingOn(id, dflt) { try { const v = window.KLITE_RPMod_Settings?.get(id); return v == null ? dflt : !!v; } catch (_) { return dflt; } }
    const edits = { dirty: false, rev: 0, timer: null };
    function autosaveOn() { try { return !!window.KLITE_RPMod_Settings?.get(AUTOSAVE_SETTING); } catch (_) { return false; } }
    function setDirty(v) {
        if (edits.dirty === !!v) return;
        edits.dirty = !!v;
        try { window.dispatchEvent(new CustomEvent('klite:worlds-dirty', { detail: { dirty: edits.dirty } })); } catch (_) {}
    }
    function markDirty() {
        edits.rev++;
        setDirty(true);
        clearTimeout(edits.timer); edits.timer = null;
        if (autosaveOn()) edits.timer = setTimeout(() => { edits.timer = null; saveLibrary(); }, AUTOSAVE_DELAY);
    }
    async function revertLibrary() {
        clearTimeout(edits.timer); edits.timer = null;
        let raw = null;
        try { raw = await idbLoad(IDB_LIBRARY_KEY); } catch (_) {}
        if (!raw) return false;
        try { W.library = JSON.parse(raw) || {}; } catch (e) { err('revert failed', e); return false; }
        for (const w of Object.values(W.library)) { try { normalizeWorld(w); } catch (_) {} }
        edits.rev++; setDirty(false);
        syncLive();
        return true;
    }
    function registerSettingAndGuards() {
        try {
            window.KLITE_RPMod_Settings?.registerSetting({
                id: AUTOSAVE_SETTING, section: 'Worlds', order: 10, default: false,
                label: 'Autosave world edits',
                help: 'Saves changes made in the world editor automatically, about a second after each change. Off: changes stay unsaved until you press Save (or Revert to saved); RPmod warns before they could be lost. With autosave on, a deletion is saved at once and cannot be reverted.',
            });
            window.KLITE_RPMod_Settings?.onChange(AUTOSAVE_SETTING, (on) => { if (on && edits.dirty) saveLibrary(); });
            window.KLITE_RPMod_Settings?.registerSetting({
                id: ASCII_MAP_SETTING, section: 'Map', order: 10, default: false,
                label: 'Send a small text map to the AI',
                help: 'Inside a dungeon or town the AI also gets a small text map of the rooms the player knows (numbers, @ = you are here). Helps larger models keep the layout straight; small models may do better without it.',
            });
        } catch (_) {}
        window.addEventListener('beforeunload', (e) => {
            if (!edits.dirty) return;
            if (autosaveOn()) { saveLibrary(); if (!edits.timer) return; }
            e.preventDefault(); e.returnValue = '';
        });
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
    // ---- phasing: a location/person as the world state shows it now (quest-rules.phased) ----
    function phasedEntity(e) { try { return e && Array.isArray(e.phases) && e.phases.length ? QR.phased(e, evalCondition) : e; } catch (_) { return e; } }
    // ---- zones: locations inside locations (parentId), hubs ----
    function zonePath(locId) {
        const w = activeWorld(); const out = []; let cur = findById(w && w.locations, locId), guard = 0;
        while (cur && cur.parentId && guard++ < 20) { cur = findById(w.locations, cur.parentId); if (cur) out.unshift(cur); }
        return out;   // outermost first, without the location itself
    }
    function childLocations(locId) { return asArray(activeWorld() && activeWorld().locations).filter(l => l.parentId === locId); }
    function setLocationParent(locId, parentId) {
        const w = activeWorld(); const l = findById(w && w.locations, locId); if (!l) return false;
        if (!parentId) { l.parentId = null; return true; }
        if (parentId === locId || !findById(w.locations, parentId) || isInsideLocation(parentId, locId)) return false;   // no cycles
        l.parentId = parentId; return true;
    }
    // ---- R7 maps: dungeons & towns, room by room (rules: src/game/map-rules.js) ----
    // A room/place is a location inside a dungeon/town (parentId chain); it is hidden from the
    // world graph. mapOf = the nearest dungeon/town around it, graphAnchor = the outermost one
    // (the node that stands for it in the world graph).
    function locOf(id) { return findById(activeWorld() && activeWorld().locations, id); }
    function mapOf(locId) { const z = zonePath(locId); for (let i = z.length - 1; i >= 0; i--) if (MR.isContainer(z[i])) return z[i]; return null; }
    function graphAnchor(locId) { const z = zonePath(locId); const top = z.find(MR.isContainer); return top ? top.id : locId; }
    function roomsOf(mapId) { return childLocations(mapId); }
    function exitsOfLoc(locId) { const w = activeWorld(); return MR.exitsOf(locOf(locId), w && w.locations); }
    function foundState() { return (rt() && rt().found) || { secrets: [], traps: [] }; }
    // A secret room stays unknown to the player (and the AI) until found.
    function roomFound(loc) { return !!loc && (!loc.secret || asArray(foundState().secrets).includes(loc.id)); }
    // Exits the player may know about: secret ones once found, never into an unfound secret room.
    // sorted n, e, s, w, up, down, then undirected (a stable order for the AI and the UI)
    function playerExits(locId) {
        const rank = (e) => { const i = MR.DIRS.indexOf(e.dir); return i < 0 ? 99 : i; };
        return exitsOfLoc(locId).filter(e => MR.visibleExit(e, foundState()) && roomFound(locOf(e.to))).sort((a, b) => rank(a) - rank(b));
    }
    function findExit(exitId) {
        for (const l of asArray(activeWorld() && activeWorld().locations)) { const ex = asArray(l.exits).find(e => e && e.id === exitId); if (ex) return { owner: l, exit: ex }; }
        return null;
    }
    // Entering a room: visited; the rooms behind its visible exits become known — or
    // discovered (seen, name known) when the way is open (fog, R7 step 3).
    function markVisitedRoom(locId) {
        const r = rt(); if (!r || !mapOf(locId)) return false;
        MR.normalizeExploration(r);
        let changed = MR.raiseExplored(r.explored, locId, 'visited');
        for (const e of playerExits(locId)) if (mapOf(e.to)) changed = MR.raiseExplored(r.explored, e.to, MR.seeThrough(e, MR.doorState(e, r.doorState)) ? 'discovered' : 'known') || changed;
        return changed;
    }
    // Does the player know this room's name? Dungeon rooms only once seen (discovered) or
    // visited; a town's places and everything outside dungeons always.
    function roomNameKnown(locId) {
        const m = mapOf(locId); if (!m || MR.kindOf(m) === 'town') return true;
        const r = rt(); if (!r) return true;
        if (r.playerLocationId === locId) return true;
        return MR.exploreRank((r.explored || {})[locId]) >= MR.exploreRank('discovered');
    }
    // placeName as the player sees it from `fromId`: an unseen room of the same dungeon is
    // "unexplored room" (the AI gets the same, so it cannot leak the name).
    function playerPlaceName(locId, fromId) {
        const m = mapOf(locId), fm = fromId && mapOf(fromId);
        if (m && fm && m.id === fm.id && !roomNameKnown(locId)) return 'unexplored room';
        return placeName(locId, fromId);
    }
    function roomLightOf(loc) { const o = rt() && rt().roomLight && loc && rt().roomLight[loc.id]; return MR.LIGHT.includes(o) ? o : (loc && loc.light) || null; }
    function defaultRoomName(map) { const n = roomsOf(map.id).length + 1; return (MR.kindOf(map) === 'town' ? 'Place ' : 'Room ') + n; }
    function addRoom(mapId, fields = {}) {
        const map = locOf(mapId); if (!map) throw new Error('unknown dungeon/town ' + mapId);
        const size = { w: Math.max(1, Number(fields.w) || MR.ROOM.w), h: Math.max(1, Number(fields.h) || MR.ROOM.h) };
        const placed = roomsOf(mapId).filter(MR.hasRect).map(MR.rectOf);
        let want;
        if (Number.isFinite(Number(fields.x)) && Number.isFinite(Number(fields.y)) && fields.x !== null && fields.y !== null) want = { x: Math.round(fields.x), y: Math.round(fields.y), ...size };
        else if (fields.near && locOf(fields.near)) want = MR.besideRect(MR.rectOf(locOf(fields.near)), fields.dir || 'e', size.w, size.h);
        else want = placed.length ? { x: 0, y: Math.max(...placed.map(p => p.y + p.h)) + MR.ROOM.gap, ...size } : { x: 0, y: 0, ...size };
        const rect = (fields.x != null && fields.y != null) ? want : MR.freeSpot(want, placed, MR.ROOM.gap);
        const room = { id: uid('location'), name: norm(fields.name) || defaultRoomName(map), parentId: map.id, map: rect };
        for (const k of ['description', 'kind', 'light', 'secret', 'hazards', 'origin']) if (fields[k] != null) room[k] = fields[k];
        activeWorld().locations.push(room);
        if (fields.near && locOf(fields.near) && fields.connect !== false) addExit(fields.near, room.id, { dir: fields.dir });
        return room;
    }
    // A connection between two locations, stored on `fromId`. dir: from the rooms' positions
    // when both have one; type: door in a dungeon, open in a town. Refuses a second exit
    // between the same pair (either side).
    function addExit(fromId, toId, opts = {}) {
        const a = locOf(fromId), b = locOf(toId);
        if (!a || !b) throw new Error('unknown location');
        if (fromId === toId) throw new Error('a room cannot connect to itself');
        if (MR.exitsOf(a, activeWorld().locations).some(e => e.to === toId && !e.legacy)) throw new Error('these two are already connected');
        const map = mapOf(fromId) || mapOf(toId);
        const type = MR.EXIT_TYPES.includes(opts.type) ? opts.type : (map && MR.kindOf(map) === 'town' ? 'open' : 'door');
        const dir = MR.DIRS.includes(opts.dir) ? opts.dir : (MR.hasRect(a) && MR.hasRect(b) ? MR.dirBetween(MR.rectOf(a), MR.rectOf(b)) : null);
        const ex = MR.normalizeExit({ to: toId, dir, type }, () => uid('ex'));
        if (type === 'door' || type === 'secret') ex.door = Object.assign({ state: 'closed' }, opts.door || {});
        if (opts.secretDC != null) ex.secretDC = Number(opts.secretDC) || 0;
        a.exits = asArray(a.exits); a.exits.push(ex);
        return ex;
    }
    // patch.dir is stored as the owning room sees it (callers mirror it for the other side).
    function updateExit(exitId, patch = {}) {
        const f = findExit(exitId); if (!f) return null;
        for (const [k, v] of Object.entries(patch)) {
            if (k === 'id' || k === 'to') continue;
            if (k === 'door') f.exit.door = v ? Object.assign({}, f.exit.door || {}, v) : undefined;
            else if (v === undefined || v === null || v === '') delete f.exit[k];
            else f.exit[k] = v;
        }
        if ((f.exit.type === 'door' || f.exit.type === 'secret') && !f.exit.door) f.exit.door = { state: 'closed' };
        return f.exit;
    }
    function removeExit(exitId) {
        const f = findExit(exitId); if (!f) return false;
        f.owner.exits = asArray(f.owner.exits).filter(e => e.id !== exitId);
        return true;
    }
    function setRoomRect(id, rect) {
        const l = locOf(id); if (!l || !rect) return null;
        const cur = MR.rectOf(l);
        l.map = { x: Math.round(rect.x != null ? rect.x : cur.x), y: Math.round(rect.y != null ? rect.y : cur.y), w: Math.max(1, Math.round(rect.w || cur.w)), h: Math.max(1, Math.round(rect.h || cur.h)) };
        return l.map;
    }
    function setLocationKind(id, kind) {
        const l = locOf(id); if (!l || !MR.KINDS.includes(kind)) return null;
        if (kind === 'location') delete l.kind; else l.kind = kind;
        return MR.kindOf(l);
    }
    // Positions for rooms that have none yet (e.g. added by the AI). Automatic, not an edit.
    function layoutMap(mapId) {
        const w = activeWorld(); const placed = MR.layoutRooms(roomsOf(mapId), w && w.locations);
        for (const [id, r] of Object.entries(placed)) { const l = locOf(id); if (l) l.map = r; }
        return Object.keys(placed).length;
    }
    // The board of one dungeon/town. opts.player: only what the player knows (fog, secrets).
    function mapBoard(mapId, opts = {}) {
        const map = locOf(mapId); if (!map) return null;
        const r = rt(); if (r) MR.normalizeExploration(r);
        const explored = (r && r.explored) || {}, here = r && r.playerLocationId;
        const hereRoom = here && (here === mapId ? null : (isInsideLocation(here, mapId) ? zonePath(here).concat([locOf(here)]).find(l => l && l.parentId === mapId) : null));
        let rooms = roomsOf(mapId).map(l => ({
            id: l.id, name: opts.player && !roomNameKnown(l.id) ? '?' : norm(phasedEntity(l).name), named: !opts.player || roomNameKnown(l.id),
            kind: MR.kindOf(l), rect: MR.rectOf(l), placed: MR.hasRect(l), origin: l.origin || null,
            light: opts.player ? roomLightOf(l) : (l.light || null), secret: !!l.secret, found: roomFound(l), explored: explored[l.id] || null,
            here: !!hereRoom && hereRoom.id === l.id, rooms: roomsOf(l.id).length,
        }));
        if (opts.player) rooms = rooms.filter(x => x.found && (MR.kindOf(map) === 'town' || x.explored || x.here));
        const ids = new Set(rooms.map(x => x.id)); const seen = new Set(); const exits = [];
        for (const room of rooms) for (const e of exitsOfLoc(room.id)) {
            if (seen.has(e.id) || !ids.has(e.to)) continue;
            if (opts.player && !MR.visibleExit(e, foundState())) continue;
            seen.add(e.id);
            exits.push({ id: e.id, from: e.owner, to: e.owner === room.id ? e.to : room.id, dir: e.owner === room.id ? e.dir : MR.mirrorDir(e.dir), type: e.type || 'open',
                state: MR.doorState(e, r && r.doorState), secret: MR.isSecret(e), found: asArray(foundState().secrets).includes(e.id), legacy: !!e.legacy,
                door: e.door ? { ...e.door } : null, secretDC: e.secretDC || null });
        }
        // exits leaving the map (to the world outside) are listed per room
        const outside = [];
        for (const room of rooms) for (const e of exitsOfLoc(room.id)) if (!ids.has(e.to) && !isInsideLocation(e.to, mapId) && e.to !== mapId) outside.push({ room: room.id, to: e.to, name: norm((locOf(e.to) || {}).name), dir: e.dir });
        return { id: map.id, name: norm(phasedEntity(map).name), kind: MR.kindOf(map), style: map.mapStyle || MR.STYLES[MR.kindOf(map)]?.[0] || 'stone',
            parentMap: mapOf(mapId) ? mapOf(mapId).id : null, rooms, exits, outside, here: hereRoom ? hereRoom.id : null };
    }
    // ---- R7 moving room by room: RPmod decides, the AI narrates ----
    // A place as named to the player/AI: a room seen from outside its dungeon/town carries the
    // dungeon's name ("Old Crypt (Entrance)").
    function placeName(locId, fromId) {
        const l = locOf(locId); if (!l) return String(locId || '');
        const n = norm(phasedEntity(l).name); const m = mapOf(locId);
        return m && !(fromId && isInsideLocation(fromId, graphAnchor(locId))) ? `${norm(phasedEntity(locOf(graphAnchor(locId))).name)} (${n})` : n;
    }
    // The room you arrive in when you go to a dungeon/town: the one with a way out to where
    // you stand (or to a place around it), else one with any way out, else the first room.
    function entranceRoom(mapId, fromId) {
        const rooms = roomsOf(mapId); if (!rooms.length) return null;
        const outward = (r) => exitsOfLoc(r.id).filter(e => !isInsideLocation(e.to, mapId) && e.to !== mapId);
        return (fromId && rooms.find(r => outward(r).some(e => e.to === fromId || isInsideLocation(fromId, e.to)))) || rooms.find(r => outward(r).length) || rooms[0];
    }
    // "unexplored room" (as the AI reads an unseen exit) = that exit when it is the only one.
    function unexploredExit(exits, key, curId) {
        if (!/^unexplored( room)?$/.test(key) || !curId) return null;
        const u = exits.filter(e => playerPlaceName(e.to, curId) === 'unexplored room');
        return u.length === 1 ? u[0] : null;
    }
    // Target of a move: an id, a direction ("north"), a neighbour's name, else any place's name.
    function resolveGoTarget(target, curId) {
        const w = activeWorld(); const raw = norm(target);
        const byId = findById(w.locations, raw); if (byId) return byId;
        const exits = curId ? playerExits(curId) : [];
        const d = MR.parseDir(raw);
        if (d) { const e = exits.find(x => x.dir === d); return e ? locOf(e.to) : null; }
        const key = MR.nameKey(raw);
        const unseen = unexploredExit(exits, key, curId); if (unseen) return locOf(unseen.to);
        const hit = exits.map(e => locOf(e.to)).filter(Boolean).find(l => MR.nameKey(phasedEntity(l).name) === key || MR.nameKey(l.name) === key);
        if (hit) return hit;
        return asArray(w.locations).find(l => MR.nameKey(phasedEntity(l).name) === key || MR.nameKey(l.name) === key) || null;
    }
    // go(target, { source: 'ui'|'ai'|'api' }) → { ok, to, dir, opened, reason }
    // Inside a dungeon/town you move only through known exits; a closed door is opened, a locked
    // or barred one refuses the move. Refusals always go to the game log (the AI then narrates
    // them); a move made in the UI is logged too, so the AI can describe it.
    function go(target, opts = {}) {
        const w = activeWorld(); if (!w || !ensureRuntime()) return { ok: false, reason: 'No world is active.' };
        MR.normalizeExploration(rt());
        const curId = rt().playerLocationId; const cur = locOf(curId);
        const refuse = (why) => { const msg = `Move to ${norm(target)} refused: ${why}.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; };
        let dest = resolveGoTarget(target, curId);
        if (!dest) return refuse('there is no such place');
        const destIsMap = MR.isContainer(dest);
        if (cur && destIsMap && isInsideLocation(curId, dest.id)) return refuse(`you are already inside ${norm(dest.name)}`);
        let viaEntrance = false;
        if (destIsMap) { const ent = entranceRoom(dest.id, curId); if (ent) { dest = ent; viaEntrance = true; } }
        if (cur && dest.id === curId) return { ok: true, to: dest.id, same: true };
        let ex = null, opened = false;
        if (cur && (mapOf(curId) || mapOf(dest.id))) {
            ex = playerExits(curId).find(e => e.to === dest.id) || null;
            // from the world outside you may travel to a dungeon/town's entrance without a drawn way
            if (!ex && !(viaEntrance && !mapOf(curId))) return refuse(`there is no known way from ${placeName(curId)} to ${placeName(dest.id, curId)}`);
            if (ex) {
                const st = MR.doorState(ex, rt().doorState);
                const mat = ex.door && norm(ex.door.material);
                if (MR.blocksMove(st)) return refuse(`the ${mat ? mat + ' ' : ''}door is ${st}`);
                if (st === 'closed') { rt().doorState[ex.id] = 'open'; opened = true; }
            }
        }
        rt().playerLocationId = dest.id;
        markVisitedRoom(dest.id);
        passiveNotice(dest.id);
        const dir = ex && ex.dir ? MR.dirName(ex.dir) : '';
        if (opts.source === 'ui') gameLog(`${opened ? 'Opens the door and goes' : 'Goes'}${dir ? ' ' + dir : ''} to ${placeName(dest.id, curId)}.`, 'map');
        try { fireTriggers('enter:' + dest.id); } catch (_) {}
        return { ok: true, to: dest.id, dir: ex ? ex.dir : null, opened };
    }
    // Exits of a room as the AI reads them: "- north: Ossuary (locked iron door)".
    function exitLines(locId) {
        const r = rt();
        return playerExits(locId).map(e => {
            const st = MR.doorState(e, r && r.doorState); const mat = e.door && norm(e.door.material);
            const how = (e.type === 'door' || e.type === 'secret') ? `${st} ${mat ? mat + ' ' : ''}${e.type === 'secret' ? 'secret door' : 'door'}`
                : e.type === 'open' || !e.type ? 'open' : e.type;
            const out = !isInsideLocation(e.to, graphAnchor(locId)) ? ', leads out' : '';
            return `- ${e.dir ? MR.dirName(e.dir) + ': ' : ''}${playerPlaceName(e.to, locId)} (${how}${out})`;
        });
    }
    // Small text map of the explored part of the current dungeon/town (setting, default off).
    function asciiMapText(locId) {
        const m = mapOf(locId); if (!m) return '';
        const b = mapBoard(m.id, { player: true }); if (!b || !b.rooms.length) return '';
        return MR.asciiMap(b.rooms.map(x => ({ id: x.id, name: x.named ? x.name : 'unexplored', rect: x.rect })), b.exits.map(e => [e.from, e.to]), b.here);
    }
    // A feature the player can see: traps only once found, nothing marked hidden.
    function featureVisible(o) {
        if (o.hidden) return false;
        return o.kind !== 'trap' || asArray(foundState().traps).includes(o.id);
    }
    // ---- R7 step 3: doors, searching, rooms and light — RPmod decides, the AI narrates ----
    // Player actions (UI buttons or the AI's tags) go through these rules; results and refusals
    // go to the game log, which the AI reads before its next reply.
    const isDoorExit = (e) => !!e && (e.type === 'door' || e.type === 'secret');
    const SKILL_ABILITY = { perception: 'wis', investigation: 'int' };
    // "the north iron door" / "the door to Ossuary"
    function doorLabel(e, fromId) {
        const mat = e.door && norm(e.door.material);
        const kind = e.type === 'secret' ? 'secret door' : 'door';
        return e.dir ? `the ${MR.dirName(e.dir)} ${mat ? mat + ' ' : ''}${kind}` : `the ${mat ? mat + ' ' : ''}${kind} to ${playerPlaceName(e.to, fromId)}`;
    }
    // An exit of the current room named by the player/AI: its id, a direction, the room behind
    // it, a door's material ("the iron door"), or just "door" when there is only one.
    function exitForTarget(target, curId) {
        const exits = playerExits(curId); const raw = norm(target);
        const byId = exits.find(e => e.id === raw || e.to === raw); if (byId) return byId;
        const bare = raw.toLowerCase().replace(/\b(the|a|an)\b/g, ' ').trim();
        if (!bare || bare === 'door' || bare === 'doors') { const doors = exits.filter(isDoorExit); return doors.length === 1 ? doors[0] : null; }
        const d = MR.parseDir(raw); if (d) return exits.find(e => e.dir === d) || null;
        const unseen = unexploredExit(exits, MR.nameKey(raw), curId); if (unseen) return unseen;
        const key = MT.looseKey(raw.replace(/\b(door|doors|gate|passage|way)\b/gi, ' '));
        const hit = exits.find(e => { const l = locOf(e.to); return l && (MT.looseKey(phasedEntity(l).name) === key || MT.looseKey(l.name) === key); });
        if (hit) return hit;
        const byMat = exits.filter(e => isDoorExit(e) && e.door && e.door.material && MT.looseKey(e.door.material) === key);
        return byMat.length === 1 ? byMat[0] : null;
    }
    // The player's skill bonus: the persona's sheet, else the world's player stats.
    function playerStatsBlock() { return normalizeStats(playerCombatCfg().stats || {}); }
    function playerSkill(skill) {
        const sh = personaSheet();
        if (sh) { try { const v = deriveSheet(sh).skills[skill]; if (Number.isFinite(v)) return v; } catch (_) {} }
        const st = playerStatsBlock();
        if (Number.isFinite(Number(st.skills[skill]))) return Number(st.skills[skill]);
        return abilityMod(st.abilities[SKILL_ABILITY[skill] || 'wis']);
    }
    function passivePerception() { return 10 + playerSkill('perception'); }
    // Search = d20 + the better of Perception and Investigation.
    function searchSkill() {
        const p = playerSkill('perception'), i = playerSkill('investigation');
        return i > p ? { name: 'Investigation', bonus: i } : { name: 'Perception', bonus: p };
    }
    // Picking a lock needs thieves' tools: d20 + DEX (+ proficiency when the sheet lists them).
    function hasThievesTools() { return asArray(inventoryView().items).some(i => /thie(f|ves)['’]?s?\s*tools/i.test(norm(i && i.name))); }
    function lockpickBonus() {
        const sh = personaSheet();
        if (sh) { try { const d = deriveSheet(sh); return d.mods.dex + (/thie(f|ves)['’]?s?\s*tools/i.test(norm(d.sheet.proficiencies)) ? d.pb : 0); } catch (_) {} }
        return abilityMod(playerStatsBlock().abilities.dex);
    }
    function rollText(r) { return `${r.total} [d20 ${r.die}${r.mod ? (r.mod > 0 ? '+' : '') + r.mod : ''}]`; }

    // Open / close / unlock a door of the current room. action: 'open'|'close'|'unlock'.
    // → { ok, same?, state, reason?, text?, roll? }
    function doorAction(action, target, opts = {}) {
        if (!activeWorld() || !ensureRuntime()) return { ok: false, reason: 'No world is active.' };
        MR.normalizeExploration(rt());
        const verb = { open: 'Open', close: 'Close', unlock: 'Unlock' }[action]; if (!verb) return { ok: false, reason: 'unknown action' };
        const curId = rt().playerLocationId;
        const refuse = (why) => { const msg = `${verb} ${norm(target) || 'door'} refused: ${why}.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; };
        const ex = curId ? exitForTarget(target, curId) : null;
        if (!ex) return refuse(norm(target) ? 'there is no such door here' : 'name the door or give its direction');
        if (!isDoorExit(ex)) return refuse(`the way ${ex.dir ? MR.dirName(ex.dir) : 'to ' + playerPlaceName(ex.to, curId)} has no door`);
        const label = doorLabel(ex, curId), st = MR.doorState(ex, rt().doorState);
        const done = (state, text, extra) => { if (text) gameLog(text, 'map'); return Object.assign({ ok: true, state, text: text || null }, extra || {}); };
        if (action === 'open') {
            if (st === 'open') return done('open', null, { same: true });
            if (MR.blocksMove(st)) return refuse(`${label} is ${st}`);
            rt().doorState[ex.id] = 'open';
            if (mapOf(ex.to)) MR.raiseExplored(rt().explored, ex.to, 'discovered');
            return done('open', opts.source === 'ui' ? `Opens ${label}.` : null);
        }
        if (action === 'close') {
            if (st !== 'open') return done(st, null, { same: true });
            rt().doorState[ex.id] = 'closed';
            return done('closed', opts.source === 'ui' ? `Closes ${label}.` : null);
        }
        // unlock
        if (st === 'open' || st === 'closed') return done(st, null, { same: true });
        if (st === 'barred') return refuse(`${label} is barred from the other side`);
        const key = ex.door && norm(ex.door.keyItem);
        if (key && itemCount(key) > 0) { rt().doorState[ex.id] = 'closed'; return done('closed', `Unlocks ${label} with the ${key}.`); }
        if (!hasThievesTools()) return refuse(`${label} is locked, and there is no key or thieves' tools to open it`);
        const r = rollD20(lockpickBonus()); const dc = Number(ex.door && ex.door.lockDC) || MR.DEFAULT_DC;
        if (r.total >= dc) { rt().doorState[ex.id] = 'closed'; return done('closed', `Picks the lock of ${label} (Thieves' Tools): ${rollText(r)} — the lock opens.`, { roll: r }); }
        const msg = `Picks the lock of ${label} (Thieves' Tools): ${rollText(r)} — the lock holds.`;
        gameLog(msg, 'map');
        return { ok: false, state: st, reason: msg, text: msg, roll: r };
    }

    // What is still hidden in a room: unfound secret doors, hidden rooms behind its exits and
    // unfound traps (not those the creator marked hidden). [{ kind, id, dc, label, room? }]
    function hiddenHere(locId) {
        const f = foundState(), out = [];
        for (const e of exitsOfLoc(locId)) {
            const to = locOf(e.to);
            const dirTxt = e.dir ? ` (${MR.dirName(e.dir)})` : '';
            if (MR.isSecret(e) && !asArray(f.secrets).includes(e.id)) out.push({ kind: 'secret', id: e.id, dc: Number(e.secretDC) || MR.DEFAULT_DC, label: `a secret door${dirTxt}`, room: to && to.secret && !roomFound(to) ? to.id : null, exit: e });
            else if (to && to.secret && !roomFound(to) && MR.visibleExit(e, f)) out.push({ kind: 'room', id: to.id, dc: Number(to.secretDC) || MR.DEFAULT_DC, label: `a hidden way${dirTxt}`, exit: e });
        }
        for (const o of asArray(activeWorld() && activeWorld().objects)) {
            if (o.locationId !== locId || o.kind !== 'trap' || o.hidden || asArray(f.traps).includes(o.id)) continue;
            out.push({ kind: 'trap', id: o.id, dc: Number(o.trapDC) || MR.DEFAULT_DC, label: `a trap (${norm(o.name) || 'trap'})` });
        }
        return out;
    }
    function reveal(c) {
        const f = rt().found;
        if (c.kind === 'trap') { if (!f.traps.includes(c.id)) f.traps.push(c.id); return; }
        for (const id of [c.id, c.room].filter(Boolean)) if (!f.secrets.includes(id)) f.secrets.push(id);
        const to = c.exit && c.exit.to;
        if (to && mapOf(to)) MR.raiseExplored(rt().explored, to, MR.seeThrough(c.exit, MR.doorState(c.exit, rt().doorState)) ? 'discovered' : 'known');
    }
    // Search the current room (Search action). The DCs are never revealed.
    function searchRoom(opts = {}) {
        if (!activeWorld() || !ensureRuntime()) return { ok: false, reason: 'No world is active.' };
        MR.normalizeExploration(rt());
        const curId = rt().playerLocationId;
        if (!curId || !locOf(curId)) { const msg = 'Search refused: you are nowhere yet.'; gameLog(msg, 'map'); return { ok: false, reason: msg }; }
        const sk = searchSkill(); const r = rollD20(sk.bonus);
        const hits = hiddenHere(curId).filter(c => r.total >= c.dc);
        hits.forEach(reveal);
        rt().found.searched[curId] = (Number(rt().found.searched[curId]) || 0) + 1;
        const text = `Searches ${playerPlaceName(curId, curId)} (${sk.name}): ${rollText(r)} — ${hits.length ? 'found ' + hits.map(h => h.label).join(', ') : 'nothing found'}.`;
        gameLog(text, 'map');
        return { ok: true, text, roll: r, skill: sk.name, found: hits.map(h => ({ kind: h.kind, id: h.id, label: h.label })), source: opts.source || null };
    }
    // Passive Perception on entering a room: whatever it beats is found without a roll.
    function passiveNotice(locId) {
        if (!rt() || !locOf(locId)) return [];
        MR.normalizeExploration(rt());
        const pp = passivePerception();
        const hits = hiddenHere(locId).filter(c => pp >= c.dc);
        if (!hits.length) return [];
        hits.forEach(reveal);
        gameLog(`Notices ${hits.map(h => h.label).join(', ')} in ${playerPlaceName(locId, locId)} (passive Perception ${pp}).`, 'map');
        return hits;
    }
    // <room>Ossuary, east: bones…</room> — the AI adds a room next to the current one. RPmod
    // places it, names it exactly and connects it (dungeon: an open door, town: an open way).
    // Stored in the world (origin 'ai'), so the creator sees it in the dungeon/town editor.
    function aiAddRoom(arg) {
        const spec = MT.parseRoomSpec(arg);
        if (spec.dir === 'here') return aiNameRoom(spec);
        const curId = rt().playerLocationId; const map = curId && mapOf(curId);
        const refuse = (why) => { const msg = `Room ${spec.name || norm(arg) || '(no name)'} refused: ${why}.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; };
        if (!spec.name) return refuse('it needs a name');
        if (!map) return refuse('new rooms can only be added inside a dungeon or town');
        MR.normalizeExploration(rt());
        const town = MR.kindOf(map) === 'town';
        const existing = roomsOf(map.id).find(l => MT.looseKey(l.name) === MT.looseKey(spec.name));
        if (existing) {
            let w = false;
            if (spec.description && !norm(existing.description)) { existing.description = spec.description; w = true; }
            const ex = playerExits(curId).find(e => e.to === existing.id);
            if (ex && MR.seeThrough(ex, MR.doorState(ex, rt().doorState))) MR.raiseExplored(rt().explored, existing.id, 'discovered');
            if (w) markDirty();
            return { ok: true, room: existing.id, existing: true };
        }
        const all = exitsOfLoc(curId), taken = new Set(all.map(e => e.dir).filter(Boolean));
        let dir = spec.dir;
        if (dir && taken.has(dir)) {
            const vis = playerExits(curId).find(e => e.dir === dir);
            return refuse(vis ? `there is already a way ${MR.dirName(dir)} (${playerPlaceName(vis.to, curId)})` : `there is no space for it to the ${MR.dirName(dir)}`);
        }
        if (!dir) dir = ['n', 'e', 's', 'w'].find(d => !taken.has(d));
        if (!dir) return refuse(`${placeName(curId, curId)} has no free side`);
        const room = addRoom(map.id, { name: spec.name, near: curId, dir, description: spec.description || null, origin: 'ai', connect: false });
        const ex = addExit(curId, room.id, { dir, type: town ? 'open' : 'door', door: town ? undefined : { state: 'open' } });
        MR.raiseExplored(rt().explored, room.id, 'discovered');
        markDirty();
        gameLog(`New ${town ? 'place' : 'room'}: ${room.name}, ${MR.dirName(dir)} of ${placeName(curId, curId)}.`, 'map');
        return { ok: true, room: room.id, exit: ex.id };
    }
    // <door>east = locked, iron, DC 15, key: Iron Key</door> — the AI may only make a door
    // harder (open → closed → locked → barred); opening goes through <open>/<unlock>. A way
    // without a door gets one. Material, lock DC and key fill in only what the creator left empty.
    function aiDoor(arg) {
        const spec = MT.parseDoorSpec(arg); const curId = rt().playerLocationId;
        const refuse = (why) => { const msg = `Door ${spec.target || '(no direction)'} refused: ${why}.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; };
        MR.normalizeExploration(rt());
        const ex = curId ? exitForTarget(spec.target, curId) : null;
        if (!ex) return refuse('there is no such way here');
        const f = findExit(ex.id); if (!f) return refuse('this way cannot have a door');
        let world = false;
        if (!isDoorExit(f.exit)) {
            if (!spec.state && !spec.material) return { ok: true, same: true };
            updateExit(ex.id, { type: 'door', door: { state: 'open' } }); world = true;
        }
        f.exit.door = f.exit.door || { state: 'closed' };
        const st = MR.doorState(f.exit, rt().doorState);
        if (spec.state && spec.state !== st) {
            if (!MT.harderOrSame(st, spec.state)) { if (world) markDirty(); return refuse(`the door is ${st} — only <open> or <unlock> opens it`); }
            rt().doorState[ex.id] = spec.state;
        }
        for (const k of ['material', 'lockDC', 'keyItem']) if (spec[k] != null && (f.exit.door[k] == null || f.exit.door[k] === '')) { f.exit.door[k] = spec[k]; world = true; }
        if (world) markDirty();
        if (spec.state && spec.state !== st) gameLog(`${doorLabel(Object.assign({}, ex, { door: f.exit.door }), curId).replace(/^the/, 'The')} is now ${spec.state}.`, 'map');
        return { ok: true, state: MR.doorState(f.exit, rt().doorState) };
    }
    // <light>dark</light> — the current room's light for the rest of the story.
    function setRoomLight(arg, roomId) {
        const lvl = MR.LIGHT.includes(arg) ? arg : MT.parseLight(arg); const id = roomId || rt().playerLocationId;
        if (!lvl || !locOf(id)) { const msg = `Light ${norm(arg)} refused: use bright, dim or dark.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; }
        MR.normalizeExploration(rt());
        rt().roomLight[id] = lvl;
        return { ok: true, light: lvl };
    }
    // ---- R7 step 4: generator (plans from src/game/map-gen.js) ----
    // A room still carrying its placeholder name ("Room 4", "Place 2") — the AI may name it once.
    const isPlaceholderName = (name) => /^(room|place) \d+$/i.test(norm(name));
    // A feature (world object with a kind) in a room.
    function addFeatureTo(roomId, fields = {}) {
        const o = addEntity('object', { name: fields.name || 'Feature' });
        o.locationId = roomId; o.kind = MR.FEATURE_KINDS.includes(fields.kind) ? fields.kind : 'furniture';
        for (const k of ['desc', 'contains', 'trapDC', 'lit', 'hidden']) if (fields[k] != null) o[k] = fields[k];
        return o;
    }
    // Encounters saved at a place (generated ones name the dungeon and room).
    function encountersAt(locId) { return asArray(activeWorld() && activeWorld().encounters).filter(e => e.locationId === locId); }
    function encounterSummary(monsters) { return asArray(monsters).map(m => `${m.count > 1 ? m.count + ' ' : ''}${(CR.MONSTERS[m.key] || {}).name || m.key}`).join(', '); }
    // Fill an empty dungeon/town from the generator. opts: dungeon { size, theme, seed,
    // encounters, level, partySize }, town { places, seed }; replace: true to swap existing rooms
    // (never while the player is inside). The entrance gets a way out to the place the map is
    // connected to in the world (a level inside a dungeon: stairs up to its neighbour room).
    // → { rooms, exits, encounters, wayOut: name|null, seed }
    function generateMap(mapId, opts = {}) {
        const w = activeWorld(); const map = locOf(mapId);
        if (!w || !map || !MR.isContainer(map)) throw new Error('not a dungeon or town');
        const old = roomsOf(mapId);
        if (old.length) {
            if (!opts.replace) throw new Error('this map already has rooms');
            const here = rt() && rt().playerLocationId;
            if (here && isInsideLocation(here, mapId)) throw new Error('the player is inside this map — move them out first');
            const inner = new Set(asArray(w.locations).filter(l => isInsideLocation(l.id, mapId)).map(l => l.id));
            w.encounters = asArray(w.encounters).filter(e => !inner.has(e.locationId));
            for (const r of old) deleteEntity(r.id, { withRooms: true });
        }
        const town = MR.kindOf(map) === 'town';
        const party = partyInfo();
        const seed = norm(opts.seed) || MG.randomSeed();
        const plan = town ? MG.generateTown({ places: opts.places, seed })
            : MG.generateDungeon({ size: opts.size, theme: opts.theme, seed, encounters: opts.encounters, level: Number(opts.level) || party.level, partySize: Number(opts.partySize) || party.size });
        const ids = {};
        for (const r of plan.rooms) {
            const room = { id: uid('location'), name: r.name, parentId: mapId, map: { ...r.rect }, generated: true };
            if (r.light) room.light = r.light;
            if (r.hazards) room.hazards = r.hazards.slice();
            if (r.secret) room.secret = true;
            w.locations.push(room); ids[r.key] = room.id;
            for (const f of r.features) addFeatureTo(room.id, f);
        }
        for (const e of plan.exits) addExit(ids[e.from], ids[e.to], { dir: e.dir, type: e.type, door: e.door, secretDC: e.secretDC });
        let encounters = 0;
        for (const r of plan.rooms) if (r.encounter) {
            w.encounters = asArray(w.encounters);
            w.encounters.push({ id: uid('enc'), name: `${norm(map.name)}: ${encounterSummary(r.encounter.monsters)} (${r.name})`, monsters: r.encounter.monsters,
                personIds: [], locationId: ids[r.key], difficulty: r.encounter.difficulty, generated: true });
            encounters++;
        }
        // the way out: to where the map node leads in the world (or, for a level, its neighbour room)
        const outside = exitsOfLoc(mapId).find(e => !isInsideLocation(e.to, mapId) && e.to !== mapId);
        let wayOut = null;
        if (outside) {
            const nested = !!mapOf(mapId);
            addExit(ids[plan.wayOut.room], outside.to, nested ? { type: 'stairs', dir: 'up' } : { type: 'open', dir: plan.wayOut.dir });
            wayOut = placeName(outside.to);
        }
        map.mapStyle = map.mapStyle || plan.style;
        map.mapGen = town ? { seed, places: plan.places } : { seed, size: plan.size, theme: plan.theme, encounters: opts.encounters || 'none' };
        return { rooms: plan.rooms.length, exits: plan.exits.length, encounters, wayOut, seed };
    }
    // <room>Name, here: description</room> — the AI names (and describes) the room the player is
    // in, once: only while it has a placeholder name; a named room only takes an empty description.
    function aiNameRoom(spec) {
        const curId = rt().playerLocationId; const cur = locOf(curId);
        const refuse = (why) => { const msg = `Room ${spec.name || '(no name)'} refused: ${why}.`; gameLog(msg, 'map'); return { ok: false, reason: msg }; };
        if (!cur || !mapOf(curId)) return refuse('only a room inside a dungeon or town can be named');
        if (!spec.name) return refuse('it needs a name');
        let changed = false;
        if (MT.looseKey(cur.name) !== MT.looseKey(spec.name)) {
            if (!isPlaceholderName(cur.name)) return refuse(`this room is already called ${norm(cur.name)}`);
            if (roomsOf(mapOf(curId).id).some(l => l.id !== curId && MT.looseKey(l.name) === MT.looseKey(spec.name))) return refuse(`another room is already called ${spec.name}`);
            const was = norm(cur.name); cur.name = spec.name; changed = true;
            // generated encounters carry the room's name: "Tomb: 2 Skeleton (Room 6)"
            for (const e of encountersAt(curId)) if (e.generated) e.name = norm(e.name).replace(`(${was})`, `(${spec.name})`);
            gameLog(`${was} is now called ${spec.name}.`, 'map');
        }
        if (spec.description && !norm(cur.description)) { cur.description = spec.description; changed = true; }
        if (changed) markDirty();
        return { ok: true, room: curId, renamed: changed };
    }
    // One map tag from the AI's reply (map-tags.js), applied through the rules above.
    function applyMapTag(t) {
        switch (t.tag) {
            case 'go': {
                // inside or into a dungeon/town RPmod checks exits and doors (R7); refusals go to the log
                const cur = rt().playerLocationId; const l = resolveGoTarget(t.arg, cur);
                if (l && (mapOf(cur) || mapOf(l.id) || MR.isContainer(l))) return go(t.arg, { source: 'ai' }).ok;
                if (l) { rt().playerLocationId = l.id; return true; }
                if (mapOf(cur)) return go(t.arg, { source: 'ai' }).ok;   // logs the refusal
                return false;
            }
            case 'open': case 'close': case 'unlock': doorAction(t.tag, t.arg, { source: 'ai' }); return true;
            case 'search': searchRoom({ source: 'ai' }); return true;
            case 'room': aiAddRoom(t.arg); return true;
            case 'door': aiDoor(t.arg); return true;
            case 'light': return setRoomLight(t.arg).ok;
        }
        return false;
    }
    function resolveNpcLocationId(npc) {
        const ov = rt()?.npcStateOverrides?.[npc.id];
        if (ov && ov.locationId) return ov.locationId;
        npc = phasedEntity(npc);
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
        npc = phasedEntity(npc);
        return norm(ov?.mood || npc.mood || npc.defaultState?.mood || '');
    }

    // =======================================================================
    //  PERSON = CHARACTER + d20 STATS (Phase C)
    // =======================================================================
    // A Person (npc) may reference a character from the host library
    // (KLITE_RPMod.characters) via characterRef, and/or carry a d20 stat block.
    // ALPHA's gallery view of the Library; Esolite's Library itself (names) when the gallery
    // is empty (ALPHA not loaded yet or at all).
    function characterLibrary() {
        try {
            const gallery = asArray(window.KLITE_RPMod && window.KLITE_RPMod.characters);
            if (gallery.length) return gallery;
            const L = window.KLITE_RPMod_Library;
            return L && typeof L.characterNames === 'function' ? L.characterNames().map(name => ({ id: name, name })) : [];
        } catch (_) { return []; }
    }
    // Resolve the linked library character (by id, else by name), or the embedded
    // export snapshot as a fallback so worlds stay portable without the library.
    function resolveCharacter(person) {
        if (!person) return null;
        const ref = person.characterRef;
        if (ref) {
            const lib = characterLibrary();
            // Name first: it is the Esolite Library's key, while gallery ids are list
            // positions that shift when a character is added or removed.
            let hit = null;
            if (ref.name) { const n = norm(ref.name).toLowerCase(); hit = lib.find(c => norm(c && c.name).toLowerCase() === n); }
            if (!hit && ref.id && !ref.name) hit = lib.find(c => c && (c.id === ref.id));
            if (hit) return hit;
            if (person.characterSnapshot) return person.characterSnapshot;
        }
        return null;
    }
    // The linked card's character sheet (src/characters) as a stat block — used when the
    // person has no stat block of its own. Synchronous cache; null until loaded.
    function cardSheetStats(person) {
        try { const C = window.KLITE_RPMod_Characters; const ref = person && person.characterRef; return C && ref && ref.name ? C.combatStatsFor(ref.name) : null; } catch (_) { return null; }
    }
    // The player's persona sheet (ALPHA Tools persona) when the world sets no player stats.
    function personaSheetStats() {
        try { const C = window.KLITE_RPMod_Characters; const n = C && C.personaName ? C.personaName() : ''; return n ? C.combatStatsFor(n) : null; } catch (_) { return null; }
    }
    function personName(person) {
        return norm(person && person.name) || norm(resolveCharacter(person)?.name) || 'Unnamed';
    }
    // Short descriptive line for the slice: overlay description > character personality/desc.
    function personBlurb(person, maxLen = 160) {
        let t = norm(person && person.description) || norm(person && person.personality);
        if (!t) { const c = resolveCharacter(person); t = norm(c && (c.personality || c.description)); }
        if (!t) {   // the linked card's own text from Esolite's Library (cached; loads on first use)
            try { const C = window.KLITE_RPMod_Characters; const ref = person && person.characterRef; if (C && C.blurbFor && ref && ref.name) t = norm(C.blurbFor(ref.name, maxLen)); } catch (_) {}
        }
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
    // Quick presets = SRD 5.2.1 monsters (src/data/srd52-monsters.js). Old preset keys of the
    // SRD 5.1 era ('goblin', 'giant_rat') map to their 5.2.1 counterparts.
    const TEMPLATE_KEYS = { goblin: 'goblin-warrior', wolf: 'wolf', bandit: 'bandit', skeleton: 'skeleton', guard: 'guard', giant_rat: 'giant-rat' };
    function normalizeStats(s) {
        const d = defaultStats();
        if (!s || typeof s !== 'object') return d;
        d.abilities = { ...d.abilities, ...(s.abilities || {}) };
        for (const k of ['ac', 'hpMax', 'speed', 'proficiency', 'initiativeMod']) if (s[k] != null) d[k] = Number(s[k]);
        d.isMonster = !!s.isMonster;
        d.skills = s.skills && typeof s.skills === 'object' ? { ...s.skills } : {};
        d.saves = s.saves && typeof s.saves === 'object' ? { ...s.saves } : {};
        d.attacks = asArray(s.attacks);
        // monster extras (SRD stat blocks) are kept as they are
        for (const k of ['saveActions', 'multiattack', 'xp', 'cr', 'key', 'name']) if (s[k] != null) d[k] = s[k];
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
        if (q.hidden && !isDiscovered('quests', q.id)) return false;
        // an item-started quest shows up once the player holds the item (or has taken it)
        if (q.startItem && questStateOf(q) === 'available' && !isDiscovered('quests', q.id) && itemCount(q.startItem) <= 0) return false;
        return true;
    }
    // ---- prerequisites (level, earlier quests, flags, reputation) ----
    function questFacts() {
        return {
            level: partyInfo().level,
            questState: (id) => { const q = questById(id); return q ? questStateOf(q) : ''; },
            flag: (k) => { const v = rt() && rt().flags ? rt().flags[k] : undefined; return v != null && v !== false && v !== 'false' && v !== 0; },
            tierOf: (fid) => QR.tierOf(repValue(fid)),
            questTitle: (id) => questTitle(questById(id)),
            factionName,
        };
    }
    function questLocks(q) { return q ? QR.unmetPrerequisites(q, questFacts()) : []; }
    // Only the level is missing → shown as "available later" (grey !); anything else hides it
    // from the player until it is met (chains).
    function onlyLevelLocked(q) { const p = q.prerequisites || {}; const locks = questLocks(q); return locks.length > 0 && locks.length === 1 && Number(p.level) > 1 && /^Requires level/.test(locks[0]); }
    // The description to show a given viewer (real vs hidden/??? until discovered).
    function questDescription(q, mode) {
        const revealed = (mode === 'gm' || mode === 'creator') || !q.hiddenDescription || isDiscovered('descriptions', q.id);
        return revealed ? norm(q.description) : (norm(q.hiddenDescription) || '???');
    }
    // WoW-style marker for a person: '?' = has a completable turn-in, '!' = offers
    // an available quest. '' otherwise.
    function personQuestMarker(personId, mode) {
        const m = questMarkerInfo(personId, mode);
        return m && !m.grey ? m.mark : '';
    }
    // Full marker set: yellow ? (ready to turn in here) > yellow ! (can be accepted) >
    // grey ? (accepted, in progress, turn in here) > grey ! (available later: level too low).
    function questMarkerInfo(personId, mode) {
        const world = activeWorld(); if (!world || !personId) return null;
        const quests = asArray(world.quests).filter(q => questVisible(q, mode));
        if (quests.some(q => q.turninPersonId === personId && questStateOf(q) === 'complete')) return { mark: '?', grey: false };
        if (quests.some(q => q.giverPersonId === personId && questStateOf(q) === 'available' && !questLocks(q).length)) return { mark: '!', grey: false };
        if (quests.some(q => q.turninPersonId === personId && questStateOf(q) === 'active')) return { mark: '?', grey: true };
        if (quests.some(q => q.giverPersonId === personId && questStateOf(q) === 'available' && onlyLevelLocked(q))) return { mark: '!', grey: true };
        return null;
    }
    function questTitle(q) { return norm(q && (q.title || q.name)) || 'Quest'; }
    function factionName(id) { const f = findById(activeWorld() && activeWorld().factions, id); return f ? norm(f.name) : id; }
    // Pay a quest's rewards once (turn-in). choice = index into the "choose one" options
    // (per choice reward, in order: a number or an array of numbers).
    function payRewards(q, choice) {
        rt().rewardsPaid = rt().rewardsPaid || {};
        if (rt().rewardsPaid[q.id]) return [];
        const picks = [].concat(choice == null ? [] : choice); let ci = 0;
        const got = [];
        for (const r of asArray(q.rewards)) {
            switch (QR.rewardType(r)) {
                case 'xp': addXp(r.xp); got.push(`${r.xp} XP`); break;
                case 'gold': addCoins(r.gold); got.push(`${r.gold} gold`); break;
                case 'item': inventoryAdd(r.item, r.qty); got.push(QR.formatReward(r)); break;
                case 'reputation': changeReputation(r.factionId, Number(r.amount) || 0, 'quest'); got.push(QR.formatReward(r, factionName)); break;
                case 'choice': { const o = asArray(r.options)[Number(picks[ci++]) || 0]; if (o) { inventoryAdd(o.item, o.qty); got.push(QR.formatReward({ type: 'item', ...o })); } break; }
                default: break;
            }
        }
        rt().rewardsPaid[q.id] = { at: Date.now(), choice: picks };
        return got;
    }
    function changeReputation(factionId, amount, why) {
        if (!factionId || !amount) return;
        rt().reputation = rt().reputation || {};
        const before = QR.tierOf(repValue(factionId));
        rt().reputation[factionId] = repValue(factionId) + amount;
        const after = QR.tierOf(rt().reputation[factionId]);
        gameLog(`Reputation with ${factionName(factionId)} ${amount > 0 ? '+' : ''}${amount}${after !== before ? ` — now ${after}` : ''}.`, 'quest');
        try { fireTriggers('reputation:' + factionId); } catch (_) {}
    }
    function factionIdOf(idOrName) {
        const fs = asArray(activeWorld() && activeWorld().factions); const q = norm(idOrName);
        const f = fs.find(x => x.id === q) || fs.find(x => QR.sameName(x.name, q)) || fs.find(x => norm(x.name).toLowerCase().includes(q.toLowerCase()) && q.length > 3);
        return f ? f.id : null;
    }
    function reputationList() {
        return asArray(activeWorld() && activeWorld().factions).map(f => {
            const value = repValue(f.id); const pr = QR.tierProgress(value); const tier = pr.tier;
            return { id: f.id, name: norm(f.name), value, tier, next: pr.next, into: pr.into, span: pr.span, effect: QR.tierEffect(tier), hostile: QR.isHostileTier(tier) };
        });
    }
    function personAttitude(npc) { if (!npc || !npc.factionId) return null; const r = reputationList().find(x => x.id === npc.factionId); return r && r.tier !== 'Neutral' ? r : null; }
    function repValue(factionId) {
        const v = rt() && rt().reputation && rt().reputation[factionId];
        if (v != null) return Number(v) || 0;
        const f = findById(activeWorld() && activeWorld().factions, factionId);
        return Number(f && f.startReputation) || 0;
    }
    function needsChoice(q) { return asArray(q && q.rewards).filter(r => QR.rewardType(r) === 'choice').length; }
    function setQuestState(questId, state) {
        ensureRuntime();
        if (!QUEST_STATES.includes(state)) return null;
        rt().questState[questId] = state;
        if (state === 'active' && !rt().activeQuestId) rt().activeQuestId = questId;
        dbg('quest', questId, '->', state);
        try { fireTriggers('quest:' + questId + ':' + state); } catch (_) {}   // quest -> event chains
        return state;
    }
    function questById(id) { return findById(activeWorld() && activeWorld().quests, id); }
    function acceptQuest(id, force) {
        const q = questById(id); if (!q) return null;
        const locks = questLocks(q);
        if (locks.length && !force) { gameLog(`Cannot accept "${questTitle(q)}" yet: ${locks.join('; ')}.`); return null; }
        const s = setQuestState(id, 'active');
        if (s) gameLog(`Quest accepted: ${questTitle(q)}.`);
        return s;
    }
    // Turn in: pays the rewards (once) and closes the quest. A "choose one" reward needs a choice.
    function turnInQuest(id, choice) {
        const q = questById(id); if (!q) return null;
        if (needsChoice(q) && choice == null && !(rt().rewardsPaid && rt().rewardsPaid[id])) return null;
        if (!(rt().rewardsPaid && rt().rewardsPaid[id])) for (const o of asArray(q.objectives)) if (QR.objectiveKind(o) === 'collect' && o.consume !== false) inventoryRemove(o.target || o.text, QR.objectiveCount(o));
        const got = payRewards(q, choice);
        const s = setQuestState(id, 'turnedin');
        if (rt().activeQuestId === id) rt().activeQuestId = null;
        gameLog(`Quest turned in: ${questTitle(q)}.${got.length ? ' Rewards: ' + got.join(', ') + '.' : ''}`);
        return s;
    }
    // ---- objectives with counters (kill / collect / talk / visit / manual) ----
    function objProgress(qid, oid) { return rt() && rt().questObjectives && rt().questObjectives[qid] ? rt().questObjectives[qid][oid] : undefined; }
    function setObjProgress(qid, oid, v) { rt().questObjectives = rt().questObjectives || {}; (rt().questObjectives[qid] = rt().questObjectives[qid] || {})[oid] = v; }
    function objectiveStatusOf(q, o) {
        const kind = QR.objectiveKind(o);
        return QR.objectiveStatus(o, objProgress(q.id, o.id), kind === 'collect' ? itemCount(o.target || o.text) : null);
    }
    function objectiveTargetName(o) {
        const w = activeWorld(); const t = o && o.target;
        const p = findById(w && w.npcs, t) || findById(w && w.locations, t);
        return p ? norm(p.name) : norm(t);
    }
    // Something happened in the game: advance matching objectives of accepted quests.
    // kill: { key, name, personId } · talk: { personId } · visit: { locationId }
    function questEvent(kind, info) {
        const w = activeWorld(); if (!w || !rt()) return;
        for (const q of asArray(w.quests)) {
            if (questStateOf(q) !== 'active') continue;
            for (const o of asArray(q.objectives)) {
                if (QR.objectiveKind(o) !== kind) continue;
                const st = objectiveStatusOf(q, o); if (st.done) continue;
                let hit = false;
                if (kind === 'kill') hit = (info.personId && o.target === info.personId) || QR.sameName(o.target, info.name) || (info.key && QR.sameName(o.target, (CR.MONSTERS[info.key] || {}).name));
                else if (kind === 'talk') hit = o.target === info.personId;
                else if (kind === 'visit') hit = isInsideLocation(info.locationId, o.target);
                if (!hit) continue;
                if (kind === 'kill') { const n = (Number(objProgress(q.id, o.id)) || 0) + 1; setObjProgress(q.id, o.id, n); gameLog(`${questTitle(q)}: ${QR.objectiveLabel(o, QR.objectiveStatus(o, n))}.`); }
                else { setObjProgress(q.id, o.id, true); gameLog(`${questTitle(q)}: ${norm(o.text)} — done.`); }
            }
        }
        updateQuestProgress();
    }
    // A location "is inside" a target when it is the target or one of its sub-places (zones, step 5).
    function isInsideLocation(locId, targetId) {
        const w = activeWorld(); let cur = locId, guard = 0;
        while (cur && guard++ < 20) { if (cur === targetId) return true; const l = findById(w && w.locations, cur); cur = l && l.parentId; }
        return false;
    }
    // Completion follows the objectives: all done → ready to turn in ('complete'); a collect
    // objective no longer met (items given away) → back to active. Visit = standing there.
    let progressing = false;
    function updateQuestProgress() {
        const w = activeWorld(); if (!w || !rt() || progressing) return;
        progressing = true;
        try {
            const here = rt().playerLocationId;
            // an item that starts a quest: the quest appears (and is announced) once held
            for (const q of asArray(w.quests)) {
                if (!q.startItem || questStateOf(q) !== 'available' || isDiscovered('quests', q.id) || itemCount(q.startItem) <= 0) continue;
                discover('quests', q.id); discover('descriptions', q.id);
                gameLog(`The ${norm(q.startItem)} starts a quest: ${questTitle(q)}.`);
            }
            for (const q of asArray(w.quests)) {
                const st = questStateOf(q); if (st !== 'active' && st !== 'complete') continue;
                const objs = asArray(q.objectives); if (!objs.length) continue;
                if (st === 'active' && here) for (const o of objs) if (QR.objectiveKind(o) === 'visit' && !objectiveStatusOf(q, o).done && isInsideLocation(here, o.target)) { setObjProgress(q.id, o.id, true); gameLog(`${questTitle(q)}: ${norm(o.text)} — done.`); }
                const all = objs.every(o => objectiveStatusOf(q, o).done);
                if (st === 'active' && all) { setQuestState(q.id, 'complete'); gameLog(`Quest ready to turn in: ${questTitle(q)}${q.turninPersonId ? ` (to ${objectiveTargetName({ target: q.turninPersonId })})` : ''}.`); }
                else if (st === 'complete' && !all && !(rt().rewardsPaid && rt().rewardsPaid[q.id]) && objs.some(o => QR.objectiveKind(o) === 'collect' && !objectiveStatusOf(q, o).done)) setQuestState(q.id, 'active');
            }
        } finally { progressing = false; }
    }
    // Talking: a person with an open "talk" objective who is here and named in the new messages.
    function detectTalk(text) {
        const w = activeWorld(); if (!w || !rt()) return;
        const here = rt().playerLocationId; const t = norm(text).toLowerCase(); if (!t) return;
        for (const q of asArray(w.quests)) {
            if (questStateOf(q) !== 'active') continue;
            for (const o of asArray(q.objectives)) {
                if (QR.objectiveKind(o) !== 'talk' || objectiveStatusOf(q, o).done) continue;
                const npc = findById(w.npcs, o.target); if (!npc || resolveNpcLocationId(npc) !== here) continue;
                const name = personName(npc).toLowerCase(); const first = name.split(/\s+/).pop();
                if (t.includes(name) || (first.length > 2 && new RegExp('\\b' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t))) questEvent('talk', { personId: npc.id });
            }
        }
    }
    // Abandon: back to available, progress reset (can be accepted again).
    function abandonQuest(id) {
        const q = questById(id); if (!q) return null;
        const st = questStateOf(q); if (st !== 'active' && st !== 'complete') return null;
        if (rt().questObjectives) delete rt().questObjectives[id];
        if (rt().activeQuestId === id) rt().activeQuestId = null;
        const s = setQuestState(id, 'available');
        gameLog(`Quest abandoned: ${questTitle(q)}.`);
        return s;
    }
    // Render-ready quest list for the log UI (respects the given viewer mode).
    function listQuests(mode) {
        const world = activeWorld(); if (!world) return [];
        mode = mode || 'gm';
        // the player does not see quests locked by more than their level (chains)
        return asArray(world.quests).filter(q => questVisible(q, mode) && !(mode === 'player' && questStateOf(q) === 'available' && questLocks(q).length && !onlyLevelLocked(q))).map(q => {
            const giver = findById(world.npcs, q.giverPersonId), turnin = findById(world.npcs, q.turninPersonId);
            return {
                id: q.id, title: norm(q.title) || norm(q.name) || 'Quest',
                description: questDescription(q, mode), hidden: !!q.hidden,
                state: questStateOf(q), active: rt() && rt().activeQuestId === q.id,
                giver: giver ? personName(giver) : '', turnin: turnin ? personName(turnin) : '',
                rewards: asArray(q.rewards),
                objectives: asArray(q.objectives).filter(o => mode !== 'player' || !o.hidden).map(o => { const os = objectiveStatusOf(q, o); return { ...o, kind: QR.objectiveKind(o), ...os, label: QR.objectiveLabel(o, os) }; }),
                marker: personQuestMarker(q.giverPersonId, mode) || personQuestMarker(q.turninPersonId, mode),
                locks: questLocks(q), startItem: norm(q.startItem) || '', prerequisites: q.prerequisites || null,
                paid: (rt() && rt().rewardsPaid && rt().rewardsPaid[q.id]) || null
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
                if (field && field.indexOf('rep.') === 0) return repValue(factionIdOf(field.slice(4)));
                if (field && field.indexOf('tier.') === 0) return QR.tierOf(repValue(factionIdOf(field.slice(5)))).toLowerCase();
                return undefined;
        }
    }
    // Editor-friendly conditions { type: 'flag' | 'quest' | 'reputation' | 'time' | 'location', … }
    // are translated to { field, op, value } here.
    function expandCondition(c) {
        switch (c.type) {
            case 'flag': { const v = norm(c.value); if (!v) return { field: 'flag.' + norm(c.key), op: 'has_flag', value: norm(c.key) }; return { field: 'flag.' + norm(c.key), op: '==', value: /^(true|false)$/i.test(v) ? /true/i.test(v) : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v }; }
            case 'quest': return { field: 'quest.' + norm(c.questId), op: '==', value: norm(c.state) || 'active' };
            case 'reputation': return { field: 'tier.' + norm(c.factionId), op: 'tier>=', value: norm(c.tier) || 'Friendly' };
            case 'time': return { field: 'time', op: '==', value: norm(c.time) };
            case 'location': return { field: 'location', op: 'is', value: norm(c.locationId) };
            default: return c;
        }
    }
    function evalCondition(cond) {
        if (!cond || typeof cond !== 'object') return true;
        if (cond.type && !cond.field) cond = expandCondition(cond);
        if (cond.op === 'is') return factValue(cond.field) === cond.value;
        if (cond.op === 'tier>=') { const have = factValue(cond.field); return QR.tierAtLeastOrWorse(have, cond.value); }
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
    // ---- inventory, coins, XP: the persona's sheet (owner's decision, R4), else the story ----
    // The persona is the player character; its card holds items, coins and XP across stories.
    // Without a persona (or a persona without a sheet) the story's runtime keeps them.
    function sheetOwner() { const n = personaName(); const C = window.KLITE_RPMod_Characters; return n && C && typeof C.updateSheet === 'function' ? n : ''; }
    function withSheet(mutate, fallback) {
        const n = sheetOwner(); if (!n) { fallback(); return; }
        window.KLITE_RPMod_Characters.updateSheet(n, mutate, { onMissing: () => { fallback(); syncLive(); } });
    }
    const sameItem = (a, b) => QR.sameName(a, b);   // "Wolf Pelts" stacks with "Wolf Pelt"
    function inventoryAdd(name, qty) {
        const n = norm(name); if (!n) return;
        qty = Number(qty) || 1;
        withSheet(s => { const ex = s.inventory.find(i => sameItem(i.name, n)); if (ex) ex.qty = (Number(ex.qty) || 1) + qty; else s.inventory.push({ name: n, qty, notes: '' }); }, () => {
            const inv = rt().inventory;
            const ex = inv.find(i => sameItem(i.name, n));
            if (ex) ex.qty = (Number(ex.qty) || 1) + qty; else inv.push({ id: uid('item'), name: n, qty });
        });
    }
    function inventoryRemove(name, qty) {
        const n = norm(name); if (!n) return;
        const cut = (inv) => { const i = inv.findIndex(x => sameItem(x.name, n)); if (i < 0) return; if (qty && (Number(inv[i].qty) || 1) > Number(qty)) inv[i].qty -= Number(qty); else inv.splice(i, 1); };
        withSheet(s => cut(s.inventory), () => cut(rt().inventory));
    }
    // Items the player holds (sheet + story inventory).
    function itemCount(name) {
        let n = 0;
        for (const i of asArray(rt() && rt().inventory)) if (QR.sameName(i.name, name)) n += Number(i.qty) || 1;
        const sh = sheetOwner() && personaSheet();
        if (sh) for (const i of asArray(sh.inventory)) if (QR.sameName(i.name, name)) n += Number(i.qty) || 1;
        return n;
    }
    function addCoins(gp) { gp = Number(gp) || 0; if (!gp) return; withSheet(s => { s.coins.gp = (Number(s.coins.gp) || 0) + gp; }, () => { rt().coins = rt().coins || { gp: 0 }; rt().coins.gp = (Number(rt().coins.gp) || 0) + gp; }); }
    function addXp(xp, why) {
        xp = Number(xp) || 0; if (!xp) return;
        const n = sheetOwner();
        withSheet(s => {
            const before = CR.levelForXp(s.xp); s.xp = (Number(s.xp) || 0) + xp;
            if (CR.levelForXp(s.xp) > (Number(s.level) || 1) && CR.levelForXp(s.xp) > before) gameLog(`${n} has enough XP for level ${(Number(s.level) || 1) + 1} — use Level up on the character sheet.`, 'quest');
        }, () => { rt().xp = (Number(rt().xp) || 0) + xp; });
    }
    // What the player carries now: { source: 'sheet' | 'story', owner, items, gp, xp }.
    function inventoryView() {
        const sh = sheetOwner() && personaSheet();
        const story = asArray(rt() && rt().inventory);
        if (sh) return { source: 'sheet', owner: personaName(), items: asArray(sh.inventory).concat(story), gp: Number(sh.coins && sh.coins.gp) || 0, xp: Number(sh.xp) || 0 };
        return { source: 'story', owner: '', items: story, gp: Number(rt() && rt().coins && rt().coins.gp) || 0, xp: Number(rt() && rt().xp) || 0 };
    }
    function gameLog(what, kind) { try { window.KLITE_RPMod_Log?.add({ what, kind: kind || 'quest' }); } catch (_) {} dbg(kind || 'quest', what); }

    // Parse explicit control tags out of one message. Returns true if state changed.
    // Supported: <move>/<go> and the other map tags (applyMapTag), <npcmove>NPC=Loc, <mood>NPC=Mood, <flag>k=v, <unflag>k,
    //            <give>Item [xN], <take>Item [xN], <quest>id=state,
    //            <time>slot, <weather>desc, <advance> (advance clock one slot)
    function parseMutations(text) {
        const world = activeWorld(); if (!world || !rt()) return false;
        let changed = false;
        const s = String(text || '');
        const scan = (re, fn) => { let m; re.lastIndex = 0; while ((m = re.exec(s)) !== null) { try { if (fn(m) !== false) changed = true; } catch (_) {} } };

        // map tags (R7): <move>/<go>, <open>, <close>, <unlock>, <search>, <room>, <door>, <light>
        // in the order they appear in the reply ("unlock, open, go" works in one message)
        for (const t of MT.scanMapTags(s)) { try { if (applyMapTag(t) !== false) changed = true; } catch (e) { err('map tag failed', t.tag, e); } }
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
        // <rep>Royal Guard=+50</rep>: the player's standing with a faction changes
        scan(/<rep>\s*([^=<>]+?)\s*=\s*([+-]?\d+)\s*<\/rep>/gi, m => { const fid = factionIdOf(m[1]); if (!fid) return false; changeReputation(fid, Number(m[2]), 'tag'); return true; });
        // <talk>Captain Rowan</talk>: the player spoke with this person (quest "talk" objectives)
        scan(/<talk>\s*([^<>]+?)\s*<\/talk>/gi, m => { const npc = findNpcByName(world, m[1]); if (!npc) return false; questEvent('talk', { personId: npc.id }); return true; });
        // <encounter>Wolf Pack</encounter> (a saved encounter) or <encounter>2 Wolf, Goblin Warrior</encounter>
        scan(/<encounter>\s*([^<>]+?)\s*<\/encounter>/gi, m => { if (getCombat() && getCombat().active && !getCombat().outcome) return false; return !!startSavedEncounter(m[1]); });
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
            case 'encounter': if (effect.value || effect.encounterId) startSavedEncounter(effect.encounterId || effect.value); break;
            case 'reputation': { const fid = factionIdOf(effect.factionId); if (fid) changeReputation(fid, Number(effect.amount) || 0, 'event'); break; }
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
            // standing with a faction reaches a tier: above Neutral "or better", below "or worse"
            case 'onReputation': {
                const fid = factionIdOf(trig.factionId); if (!fid || (signal !== 'reputation:' + fid && signal !== 'turn')) return false;
                return QR.tierAtLeastOrWorse(QR.tierOf(repValue(fid)), trig.tier || 'Friendly');
            }
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
    function personaName() { try { const C = window.KLITE_RPMod_Characters; return C && C.personaName ? C.personaName() : ''; } catch (_) { return ''; } }
    function personaSheet() { try { const n = personaName(); return n ? window.KLITE_RPMod_Characters.cachedSheet(n) || null : null; } catch (_) { return null; } }
    function combatantStats(id) {
        const cb = getCombat();
        if (cb && cb.stats && cb.stats[id]) return cb.stats[id];          // monster instance (snapshot)
        if (id === '__player__') return normalizeStats(personaSheetStats() || playerCombatCfg().stats || {});
        const p = entityById(activeWorld(), id); return normalizeStats(p && (p.stats || cardSheetStats(p)) || {});
    }
    function combatantName(id) {
        const cb = getCombat(); const o = cb && asArray(cb.order).find(x => x.id === id);
        if (o && o.name) return o.name;
        if (id === '__player__') return (personaSheet() && personaName()) || norm(playerCombatCfg().name) || personaName() || 'You';
        const p = entityById(activeWorld(), id); return p ? personName(p) : String(id);
    }
    // Combat events: the encounter's own log (last 24) + the shared game log the AI reads.
    function combatLog(msg) {
        const cb = rt() && rt().combat; if (cb) { cb.log.push(msg); if (cb.log.length > 24) cb.log.shift(); }
        try { window.KLITE_RPMod_Log?.add({ what: msg, kind: 'combat' }); } catch (_) {}
        dbg('combat:', msg);
    }
    // Resolve a combatant id from a name/keyword ('you'/'player' → __player__, else NPC).
    function resolveCombatant(name) {
        const n = norm(name).toLowerCase(); if (!n) return null;
        if (n === 'you' || n === 'player' || n === 'self' || (personaName() && n === personaName().toLowerCase())) return '__player__';
        const cb = getCombat();
        if (cb) { const hit = cb.order.find(o => norm(o.name).toLowerCase() === n) || cb.order.find(o => norm(o.name).toLowerCase().startsWith(n)); if (hit) return hit.id; }
        const npc = findNpcByName(activeWorld(), name); return npc ? npc.id : null;
    }

    // ---- encounters (v2: sides, monster instances, conditions, death saves, outcome) ----
    // combat = { version: 2, active, round, turnIndex, order[{ id, name, init, isPlayer, side, kind, key? }],
    //   hp, maxHp, log, stats{ id: monster stats }, conditions{ id: [{ name, rounds }] },
    //   death{ id: { s, f, stable, dead } }, lastTarget{}, outcome: null|'victory'|'defeat',
    //   xp, persona, synced }
    function sideOf(id, opts) {
        if (id === '__player__') return 'party';
        if (opts && opts.sides && opts.sides[id]) return opts.sides[id] === 'party' ? 'party' : 'enemy';
        const p = entityById(activeWorld(), id);
        const monster = !!(p && (p.isMonster || (p.stats && p.stats.isMonster)));
        return !monster && asArray(rt() && rt().party).includes(id) ? 'party' : 'enemy';
    }
    function startEncounter(ids, opts = {}) {
        ensureRuntime();
        const entries = asArray(ids).map(id => ({ id, kind: id === '__player__' ? 'player' : 'person' }));
        if (opts.includePlayer !== false && !entries.some(e => e.id === '__player__')) entries.unshift({ id: '__player__', kind: 'player' });
        const stats = {}, names = new Set();
        for (const m of asArray(opts.monsters)) {
            const key = CR.findMonster(m.key || m.name); if (!key) continue;
            const count = Math.max(1, Math.min(20, Number(m.count) || 1));
            const base = CR.MONSTERS[key].name;
            for (let i = 1; i <= count; i++) {
                let n = count > 1 ? `${base} ${i}` : base, k = i;
                while (names.has(n.toLowerCase())) n = `${base} ${++k}`;
                names.add(n.toLowerCase());
                const id = `m:${key}:${names.size}`;
                stats[id] = CR.monsterStats(key);
                entries.push({ id, kind: 'monster', key, name: n });
            }
        }
        const cbStats = { stats };   // lets combatantStats see monster snapshots while rolling initiative
        const statOf = (id) => stats[id] || (id === '__player__' ? normalizeStats(personaSheetStats() || playerCombatCfg().stats || {}) : combatantStatsNoCombat(id));
        const order = entries.map(e => {
            const st = statOf(e.id);
            const init = rollD20(st.initiativeMod != null ? st.initiativeMod : abilityMod(st.abilities.dex)).total;
            const side = e.kind === 'monster' ? 'enemy' : sideOf(e.id, opts);
            return { id: e.id, name: e.name || (e.id === '__player__' ? ((personaSheet() && personaName()) || norm(playerCombatCfg().name) || personaName() || 'You') : combatantNameNoCombat(e.id)), init, isPlayer: e.id === '__player__', side, kind: e.kind, key: e.key };
        });
        order.sort((a, b) => b.init - a.init || (b.isPlayer - a.isPlayer));
        const hp = {}, maxHp = {}, death = {};
        const sheet = personaSheet(); const usePersona = !!sheet;   // the persona is the player character; world stats are the fallback
        for (const c of order) {
            const st = statOf(c.id); maxHp[c.id] = st.hpMax; hp[c.id] = st.hpMax;
            if (c.id === '__player__' && usePersona) { maxHp[c.id] = sheet.hp.max; hp[c.id] = Math.max(0, Math.min(sheet.hp.max, sheet.hp.current)); }
        }
        rt().combat = { version: 2, active: true, round: 1, turnIndex: 0, order, hp, maxHp, log: [], stats: cbStats.stats, conditions: {}, death,
            lastTarget: {}, outcome: null, xp: 0, persona: usePersona ? personaName() : '', synced: false,
            encounter: opts.encounterId || null, difficulty: opts.difficulty || null };
        const cb = rt().combat;
        for (const c of order) if (hp[c.id] <= 0) { if (c.side === 'party') { addCond(c.id, 'Unconscious'); death[c.id] = { s: 0, f: 0, stable: false, dead: false }; } }
        combatLog(`Combat begins. Initiative: ${order.map(o => `${o.name} ${o.init}`).join(', ')}`);
        skipUnableAtStart(cb);
        return cb;
    }
    function combatantStatsNoCombat(id) { const p = entityById(activeWorld(), id); return normalizeStats(p && (p.stats || cardSheetStats(p)) || {}); }
    function combatantNameNoCombat(id) { const p = entityById(activeWorld(), id); return p ? personName(p) : String(id); }
    function skipUnableAtStart(cb) { if (!canTakeTurn(cb, cb.order[cb.turnIndex])) nextTurn(); }
    function endEncounter() {
        const cb = getCombat();
        if (cb && !cb.synced) syncPersonaSheet(cb);
        if (rt()) rt().combat = null;
    }
    function getCombat() { return rt() && rt().combat; }
    const isV2 = (cb) => cb && cb.version === 2;
    function sideList(cb, side) { return cb.order.filter(o => (o.side || (o.isPlayer ? 'party' : 'enemy')) === side); }
    function isDown(cb, id) { return (cb.hp[id] || 0) <= 0; }
    function deathOf(cb, id) { return (cb.death && cb.death[id]) || null; }
    // A combatant takes a turn if it is up, or if it is a dying party member (death save).
    function canTakeTurn(cb, o) {
        if (!o) return false;
        if (!isDown(cb, o.id)) return true;
        const d = deathOf(cb, o.id);
        return (o.side || (o.isPlayer ? 'party' : 'enemy')) === 'party' && o.isPlayer && d && !d.stable && !d.dead;
    }
    function conds(id) { const cb = getCombat(); return (cb && cb.conditions && cb.conditions[id]) || []; }
    function addCond(id, name, rounds) {
        const cb = getCombat(); if (!cb) return; cb.conditions = cb.conditions || {};
        const list = cb.conditions[id] = asArray(cb.conditions[id]).filter(c => c.name !== name);
        list.push({ name, rounds: rounds ? Number(rounds) : null });
    }
    function removeCond(id, name) { const cb = getCombat(); if (cb && cb.conditions && cb.conditions[id]) cb.conditions[id] = cb.conditions[id].filter(c => c.name !== name); }
    function tickConditions(id) {
        const cb = getCombat(); if (!cb || !cb.conditions || !cb.conditions[id]) return;
        const keep = [];
        for (const c of cb.conditions[id]) { if (c.rounds == null) { keep.push(c); continue; } c.rounds--; if (c.rounds > 0) keep.push(c); else combatLog(`${combatantName(id)} is no longer ${c.name}.`); }
        cb.conditions[id] = keep;
    }
    function nextTurn() {
        const cb = getCombat(); if (!cb) return null;
        const cur = cb.order[cb.turnIndex];
        if (cur && isV2(cb)) tickConditions(cur.id);
        let guard = 0;
        do { cb.turnIndex++; if (cb.turnIndex >= cb.order.length) { cb.turnIndex = 0; cb.round++; combatLog(`— Round ${cb.round} —`); } guard++; }
        while (guard < cb.order.length + 1 && !(isV2(cb) ? canTakeTurn(cb, cb.order[cb.turnIndex]) : (cb.hp[cb.order[cb.turnIndex].id] || 0) > 0));
        return cb.order[cb.turnIndex];
    }
    // HP changes: party members at 0 HP fall Unconscious and make death saves; others die.
    function setHp(id, value) {
        const cb = getCombat(); const before = cb.hp[id] != null ? cb.hp[id] : combatantStats(id).hpMax;
        cb.hp[id] = Math.max(0, Math.min(cb.maxHp[id] || 999, value));
        if (!isV2(cb)) return cb.hp[id];
        const o = cb.order.find(x => x.id === id); const party = o && o.side === 'party';
        if (before > 0 && cb.hp[id] <= 0) {
            if (party) { addCond(id, 'Unconscious'); cb.death[id] = { s: 0, f: 0, stable: false, dead: false }; combatLog(`${combatantName(id)} falls unconscious${o.isPlayer ? ' and is dying (death saving throws)' : ''}.`); }
            else { combatLog(`${combatantName(id)} is defeated.`); questEvent('kill', { key: o && o.key, name: o && o.key ? CR.MONSTERS[o.key].name : combatantName(id), personId: o && o.kind === 'person' ? id : null }); }
        }
        if (before <= 0 && cb.hp[id] > 0) { removeCond(id, 'Unconscious'); if (cb.death[id]) delete cb.death[id]; combatLog(`${combatantName(id)} is back on their feet.`); }
        return cb.hp[id];
    }
    function hitWhileDown(id, crit) {
        const cb = getCombat(); const d = deathOf(cb, id); if (!d || d.dead) return;
        cb.death[id] = CR.damageAtZero(d, crit);
        combatLog(`${combatantName(id)} takes damage while down: ${crit ? 'two death save failures' : 'a death save failure'} (${cb.death[id].f}/3).`);
        if (cb.death[id].dead) combatLog(`${combatantName(id)} dies.`);
    }
    function combatDamage(targetId, amount) {
        const cb = getCombat(); if (!cb) return;
        if (isV2(cb) && isDown(cb, targetId) && deathOf(cb, targetId)) { hitWhileDown(targetId, false); checkOutcome(); return 0; }
        const from = cb.hp[targetId] != null ? cb.hp[targetId] : combatantStats(targetId).hpMax;
        const next = Math.max(0, from - Number(amount));
        combatLog(`${combatantName(targetId)} takes ${amount} damage → HP ${next}/${cb.maxHp[targetId]}${next <= 0 ? ' (down!)' : ''}`);
        const left = setHp(targetId, next);
        checkOutcome();
        return left;
    }
    function combatHeal(targetId, amount) {
        const cb = getCombat(); if (!cb) return;
        const d = deathOf(cb, targetId); if (d && d.dead) { combatLog(`${combatantName(targetId)} is dead and cannot be healed.`); return cb.hp[targetId]; }
        const next = Math.min(cb.maxHp[targetId] || 999, (cb.hp[targetId] || 0) + Number(amount));
        combatLog(`${combatantName(targetId)} heals ${amount} → HP ${next}/${cb.maxHp[targetId]}`);
        const left = setHp(targetId, next);
        checkOutcome();
        return left;
    }
    // Attack roll (weapon attack index of the attacker's stats). opts.mode: 'adv' | 'dis'.
    function combatAttack(attackerId, targetId, attackIndex, opts = {}) {
        const cb = getCombat(); if (!cb) return null;
        if (cb.outcome) return null;
        const aSt = combatantStats(attackerId), tSt = combatantStats(targetId);
        const atk = asArray(aSt.attacks)[Number(attackIndex) || 0] || { name: 'Unarmed Strike', toHit: aSt.proficiency + abilityMod(aSt.abilities.str), damage: String(Math.max(1, 1 + abilityMod(aSt.abilities.str))) };
        const toHit = (atk.toHit != null) ? Number(atk.toHit) : (aSt.proficiency + abilityMod(aSt.abilities.str));
        const ranged = CR.isRanged(atk);
        const m = isV2(cb) ? CR.attackMode(conds(attackerId), conds(targetId), ranged, opts.mode) : { mode: opts.mode || null, autoCrit: false, why: [] };
        const hit = rollD20(toHit, m.mode);
        const how = `${m.mode ? ` (${m.mode === 'adv' ? 'advantage' : 'disadvantage'}${m.why.length ? ': ' + m.why.join(', ') : ''})` : ''}`;
        const A = combatantName(attackerId), T = combatantName(targetId);
        if (isV2(cb)) cb.lastTarget[attackerId] = targetId;
        if (hit.fumble) { combatLog(`Miss (natural 1): ${A} → ${T} with ${atk.name}${how}.`); return { hit: false, fumble: true, roll: hit.total }; }
        if (hit.total >= tSt.ac || hit.crit) {
            const crit = hit.crit || m.autoCrit;
            if (isV2(cb) && isDown(cb, targetId) && deathOf(cb, targetId)) {
                combatLog(`${crit ? 'Critical hit' : 'Hit'}: ${A} → ${T} with ${atk.name}${how} (${hit.total} vs AC ${tSt.ac}).`);
                hitWhileDown(targetId, crit); checkOutcome();
                return { hit: true, crit, roll: hit.total, ac: tSt.ac, damage: 0, targetHp: 0 };
            }
            const base = rollExpr(atk.damage || '1d6'); let dmg = base.total;
            if (crit) dmg += rollDiceOnly(atk.damage || '1d6');   // crit: roll the damage dice twice
            dmg = Math.max(1, dmg);
            const next = Math.max(0, (cb.hp[targetId] != null ? cb.hp[targetId] : tSt.hpMax) - dmg);
            combatLog(`${crit ? 'Critical hit' : 'Hit'}: ${A} → ${T} with ${atk.name}${how} (${hit.total} vs AC ${tSt.ac}), ${dmg}${atk.type ? ' ' + atk.type.toLowerCase() : ''} damage → HP ${next}/${cb.maxHp[targetId]}${next <= 0 ? ' (down!)' : ''}`);
            const left = setHp(targetId, next);
            checkOutcome();
            return { hit: true, crit, roll: hit.total, ac: tSt.ac, damage: dmg, targetHp: left };
        }
        combatLog(`Miss: ${A} → ${T} with ${atk.name}${how} (${hit.total} vs AC ${tSt.ac}).`);
        return { hit: false, roll: hit.total, ac: tSt.ac };
    }
    function rollDiceOnly(expr) { let t = 0; for (const m of String(expr).replace(/\s+/g, '').matchAll(/(\d*)d(\d+)/g)) for (let i = 0; i < (Number(m[1]) || 1); i++) t += rollDie(Number(m[2])); return t; }
    // Saving-throw action (breath weapon etc.): the target saves against the DC.
    function saveAction(attackerId, targetId, actionIndex) {
        const cb = getCombat(); if (!cb || cb.outcome) return null;
        const act = asArray(combatantStats(attackerId).saveActions)[Number(actionIndex) || 0]; if (!act) return null;
        const r = savingThrow(targetId, act.save, act.dc, { quiet: true });
        let dmg = act.damage ? rollExpr(act.damage).total : 0;
        if (r.success) dmg = act.half ? Math.floor(dmg / 2) : 0;
        combatLog(`${combatantName(attackerId)} → ${combatantName(targetId)}: ${act.name}, ${act.save.toUpperCase()} save ${r.total} vs DC ${act.dc} — ${r.success ? 'success' : 'failure'}${dmg ? `, ${dmg} ${act.type ? act.type.toLowerCase() + ' ' : ''}damage` : ''}.`);
        if (dmg) { if (isDown(cb, targetId) && deathOf(cb, targetId)) hitWhileDown(targetId, false); else setHp(targetId, (cb.hp[targetId] || 0) - dmg); }
        checkOutcome();
        return { ...r, damage: dmg };
    }
    function savingThrow(id, ability, dc, opts = {}) {
        const st = combatantStats(id); const ab = norm(ability).toLowerCase().slice(0, 3);
        const mod = st.saves && st.saves[ab] != null && typeof st.saves[ab] === 'number' ? st.saves[ab] : abilityMod(st.abilities[ab] != null ? st.abilities[ab] : 10);
        const autoFail = (ab === 'str' || ab === 'dex') && CR.cannotAct(conds(id)) && !conds(id).some(c => c.name === 'Incapacitated' && conds(id).length === 1);
        const r = rollD20(mod, opts.mode); const success = !autoFail && r.total >= Number(dc);
        if (!opts.quiet) combatLog(`${combatantName(id)} ${ab.toUpperCase()} saving throw: ${r.total} vs DC ${dc} — ${success ? 'success' : 'failure'}${autoFail ? ' (automatic)' : ''}`);
        return { ...r, ability: ab, dc: Number(dc), success };
    }
    function deathSaveRoll(id) {
        const cb = getCombat(); if (!cb) return null;
        const d = deathOf(cb, id); if (!d || d.dead || d.stable) return null;
        const r = rollD20(0); const res = CR.deathSave(d, r.die);
        const name = combatantName(id);
        if (res.result === 'revived') { cb.death[id] = null; delete cb.death[id]; setHp(id, 1); combatLog(`${name} rolls a natural 20 on a death saving throw and regains 1 HP!`); }
        else {
            cb.death[id] = res.state;
            combatLog(`${name} death saving throw: ${r.die} — ${res.result === 'success' ? 'success' : res.result === 'failure' ? (r.die === 1 ? 'natural 1, two failures' : 'failure') : res.result === 'stable' ? 'third success, stable' : 'third failure, dies'} (${res.state.s} successes / ${res.state.f} failures).`);
        }
        checkOutcome();
        return { die: r.die, ...res };
    }
    // Victory: every enemy down. Defeat: no party member standing and none still dying.
    function checkOutcome() {
        const cb = getCombat(); if (!isV2(cb) || cb.outcome) return cb && cb.outcome;
        const enemies = sideList(cb, 'enemy'), party = sideList(cb, 'party');
        if (enemies.length && enemies.every(o => isDown(cb, o.id))) {
            cb.outcome = 'victory';
            cb.xp = enemies.reduce((n, o) => n + (Number(combatantStats(o.id).xp) || 0), 0);
            combatLog(`Victory! All enemies are defeated.${cb.xp ? ` ${cb.xp} XP earned.` : ''}`);
        } else if (party.length && party.every(o => isDown(cb, o.id) && !(deathOf(cb, o.id) && !deathOf(cb, o.id).stable && !deathOf(cb, o.id).dead))) {
            cb.outcome = 'defeat';
            const p = deathOf(cb, '__player__');
            combatLog(`Defeat. ${p && p.dead ? 'You have died.' : 'You are unconscious but stable, at the mercy of your foes.'}`);
        }
        if (cb.outcome) syncPersonaSheet(cb);
        return cb.outcome;
    }
    // Write HP (and XP on victory) back to the persona's sheet, once per encounter.
    function syncPersonaSheet(cb) {
        if (!cb || cb.synced || !cb.persona) return;
        cb.synced = true;
        const C = window.KLITE_RPMod_Characters; if (!C || !C.updateSheet) return;
        const name = cb.persona, hp = cb.hp.__player__, xp = cb.outcome === 'victory' ? (Number(cb.xp) || 0) : 0;
        // through the same queue as quest rewards (applied to the cached sheet at once), so
        // neither write can overwrite the other
        C.updateSheet(name, s => {
            if (hp != null) s.hp.current = hp;
            const before = CR.levelForXp(s.xp); s.xp = (Number(s.xp) || 0) + xp;
            if (xp && CR.levelForXp(s.xp) > (Number(s.level) || 1) && CR.levelForXp(s.xp) > before) gameLog(`${name} has enough XP for level ${(Number(s.level) || 1) + 1} — use Level up on the character sheet.`, 'combat');
        });
    }
    // A monster's (or ally's) turn: pick a target on the other side and attack
    // (multiattack = several attacks). Returns what happened.
    function autoTurn(id) {
        const cb = getCombat(); if (!cb || cb.outcome) return null;
        const o = cb.order.find(x => x.id === id); if (!o) return null;
        if (isDown(cb, id)) return { skipped: 'down' };
        if (CR.cannotAct(conds(id))) { combatLog(`${o.name} cannot act (${conds(id).map(c => c.name).join(', ')}).`); return { skipped: 'incapacitated' }; }
        const st = combatantStats(id);
        const foes = cb.order.filter(x => x.side !== o.side && !isDown(cb, x.id)).map(x => x.id);
        if (!foes.length) { combatLog(`${o.name} has no one left to attack.`); return { skipped: 'no target' }; }
        const idx = CR.pickAttack(st);
        if (idx < 0) { combatLog(`${o.name} has no attack to use.`); return { skipped: 'no attack' }; }
        const results = [];
        for (let i = 0; i < (st.multiattack || 1) && !cb.outcome; i++) {
            const live = cb.order.filter(x => x.side !== o.side && !isDown(cb, x.id)).map(x => x.id);
            if (!live.length) break;
            const target = CR.pickTarget(live, cb.lastTarget[id], Math.random);
            results.push(combatAttack(id, target, idx));
        }
        return { attacks: results };
    }
    // Run every non-player turn until it is the player's turn again (or the fight ends).
    function runAutoTurns() {
        const cb = getCombat(); if (!cb || !isV2(cb)) return [];
        const done = []; let guard = 0;
        while (!cb.outcome && guard++ < 60) {
            const cur = cb.order[cb.turnIndex];
            if (!cur || cur.isPlayer) break;
            done.push({ id: cur.id, ...(autoTurn(cur.id) || {}) });
            if (cb.outcome) break;
            nextTurn();
        }
        return done;
    }
    // Party for the encounter budget: the player (persona sheet level, else 1) + companions.
    function partyInfo() {
        const sheet = personaSheet();
        const level = Math.max(1, Number(sheet && sheet.level) || Number(playerCombatCfg().level) || 1);
        const allies = asArray(rt() && rt().party).filter(id => { const p = entityById(activeWorld(), id); return p && !p.isMonster; });
        return { level, size: 1 + allies.length, allies };
    }
    // A saved encounter of the world (id or name), or an ad-hoc list "2 Wolf, Goblin Warrior".
    function parseMonsterList(text) {
        const out = [];
        for (const part of String(text || '').split(/[,;]| and /)) {
            const m = /^\s*(?:(\d+)\s*[x×]?\s+)?(.+?)\s*(?:[x×]\s*(\d+))?\s*$/i.exec(part); if (!m || !m[2]) continue;
            const key = CR.findMonster(m[2]); if (key) out.push({ key, count: Number(m[1] || m[3]) || 1 });
        }
        return out;
    }
    function startSavedEncounter(idOrName) {
        const w = activeWorld(); const q = norm(idOrName).toLowerCase();
        const enc = asArray(w && w.encounters).find(e => e.id === idOrName || norm(e.name).toLowerCase() === q);
        if (enc) {
            const c = startEncounter(asArray(enc.personIds), { monsters: enc.monsters, encounterId: enc.id, difficulty: enc.difficulty });
            if (c && rt()) { rt().startedEncounters = asArray(rt().startedEncounters); if (!rt().startedEncounters.includes(enc.id)) rt().startedEncounters.push(enc.id); }
            return c;
        }
        const monsters = parseMonsterList(idOrName);
        return monsters.length ? startEncounter([], { monsters }) : null;
    }
    function abilityCheck(id, ability, dc, mode) {
        const st = combatantStats(id); const ab = norm(ability).toLowerCase();
        const mod = abilityMod(st.abilities[ab] != null ? st.abilities[ab] : 10);
        const r = rollD20(mod, mode); const success = r.total >= Number(dc);
        combatLog(`${combatantName(id)} ${ab.toUpperCase()} check: ${r.total} vs DC ${dc} — ${success ? 'success' : 'fail'}`);
        return { ...r, ability: ab, dc: Number(dc), success };
    }
    // Human-readable combat state for injection (the AI narrates, RPmod adjudicates).
    function combatText() {
        const cb = getCombat(); if (!cb || !cb.active) return '';
        const cur = cb.order[cb.turnIndex];
        const line = (o) => {
            const c = conds(o.id).map(x => x.name + (x.rounds ? ` ${x.rounds} rd` : ''));
            const d = deathOf(cb, o.id);
            const state = d ? (d.dead ? ' — dead' : d.stable ? ' — unconscious, stable' : ` — dying (${d.s}/3 successes, ${d.f}/3 failures)`) : (isDown(cb, o.id) ? (o.side === 'enemy' ? ' — defeated' : ' — down') : '');
            return `${o.id === cur.id && !cb.outcome ? '▶ ' : '  '}${o.name}${o.key ? ` (${CR.MONSTERS[o.key].name}, AC ${cb.stats[o.id].ac})` : ''} HP ${cb.hp[o.id]}/${cb.maxHp[o.id]}${c.length ? ` [${c.join(', ')}]` : ''}${state}`;
        };
        if (!isV2(cb)) {
            const roster = cb.order.map(o => `${o.id === cur.id ? '▶ ' : '  '}${o.name} (init ${o.init}) HP ${cb.hp[o.id]}/${cb.maxHp[o.id]}${cb.hp[o.id] <= 0 ? ' — down' : ''}`).join('\n');
            const recent = cb.log.slice(-4).join('\n');
            return `Round ${cb.round}. Current turn: ${cur.name}.\n${roster}` + (recent ? `\nRecent:\n${recent}` : '');
        }
        const parts = [`Round ${cb.round}.` + (cb.outcome ? '' : ` Current turn: ${cur.name}${cur.isPlayer ? ' (the player)' : ''}.`)];
        parts.push('Party:\n' + sideList(cb, 'party').map(line).join('\n'));
        parts.push('Enemies:\n' + sideList(cb, 'enemy').map(line).join('\n'));
        if (cb.outcome === 'victory') parts.push(`OUTCOME: Victory — every enemy is defeated${cb.xp ? ` (${cb.xp} XP)` : ''}. Narrate the end of the fight.`);
        else if (cb.outcome === 'defeat') parts.push('OUTCOME: Defeat — the party has fallen. Narrate what happens to the player character now; do not revive them by yourself.');
        else parts.push(`RPmod rolls every attack, saving throw and HP change; narrate only the results listed under "Rolls and combat" — do not invent hits, damage or deaths.${cur.isPlayer ? ' It is the player\'s turn: set the scene and wait for their action.' : ''}`);
        if (!window.KLITE_RPMod_Log) { const recent = cb.log.slice(-6).join('\n'); if (recent) parts.push('Recent:\n' + recent); }
        return parts.join('\n');
    }
    // Scan any chat messages we haven't parsed yet, apply their tags, advance the
    // per-turn clock if configured. Called at generation time (before slice build).
    // opts.advance === false: parse only (a reply just arrived); the per-turn clock step
    // happens at the next generation, as before.
    function processPendingMutations(opts) {
        if (!rt()) return false;
        const arr = window.gametext_arr;
        if (!Array.isArray(arr)) return false;
        const start = Math.max(0, Math.min(Number(rt().lastParsedIndex) || 0, arr.length));
        let changed = false;
        for (let i = start; i < arr.length; i++) { changed = parseMutations(arr[i]) || changed; try { detectTalk(arr[i]); } catch (_) {} }
        const advanced = W.config.advanceClockPerTurn && arr.length > start && !(opts && opts.advance === false);
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
                // both directions of stored exits + legacy links; unfound secrets stay out (R7)
                const ids = playerExits(cur.id).map(e => e.to);
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
        if (inv.length) stateBits.push((sheetOwner() && personaSheet() ? 'Story items: ' : 'Inventory: ') + inv.map(i => norm(i.name) + ((Number(i.qty) || 1) > 1 ? ` x${i.qty}` : '')).join(', '));
        if (!(sheetOwner() && personaSheet())) { const gp = Number(rt().coins && rt().coins.gp) || 0, xp = Number(rt().xp) || 0; if (gp || xp) stateBits.push(`Gold: ${gp}, XP: ${xp}`); }
        const party = asArray(rt().party).map(id => (findById(world.npcs, id) || {}).name).filter(Boolean);
        if (party.length) stateBits.push('Party: ' + party.map(norm).join(', '));
        push('Player State', 85, stateBits.join('\n'));

        // 2c. Combat state (top priority when an encounter is active)
        push('Combat', 96, combatText());
        // 2d. How the AI (as GM) starts a fight — RPmod then runs it (outside of combat only)
        if (!(getCombat() && getCombat().active)) {
            const saved = asArray(world.encounters).map(e => e.name).filter(Boolean);
            push('Starting a fight', 20, 'When a fight breaks out, write <encounter>2 Wolf, Goblin Warrior</encounter> (SRD monster names and counts)' +
                (saved.length ? ` or the name of a prepared encounter (${saved.slice(0, 8).join(', ')})` : '') + '. RPmod then rolls initiative and every attack; you narrate the results.');
        }

        if (!loc) { return { sections, location: null }; }
        // mark visited
        if (mutate && rt() && !asArray(rt().visitedLocationIds).includes(loc.id)) rt().visitedLocationIds.push(loc.id);
        if (mutate) markVisitedRoom(loc.id);

        // 3. Current location (as phased now; zone path, places within, hub)
        const pLoc = phasedEntity(loc);   // text as phased now; ids/relations use the stored one
        const zones = zonePath(loc.id), inRoom = !!mapOf(loc.id);
        // places within: a town's (non-secret) places are common knowledge; a dungeon only
        // shows the rooms the player knows — never the whole dungeon or its secrets (R7)
        const inner = childLocations(loc.id).filter(l => MR.kindOf(loc) === 'town' ? roomFound(l)
            : MR.kindOf(loc) === 'dungeon' ? (roomFound(l) && roomNameKnown(l.id)) : true);
        const exits = playerExits(loc.id).filter(e => !e.mirrored).map(e => norm(e.name)).filter(Boolean)
            .concat(connectedLocations(world, loc, 1).map(l => placeName(l.id, loc.id)))
            .concat(zones.length && !inRoom ? [norm(phasedEntity(zones[zones.length - 1]).name)] : []);
        const exitsUniq = [...new Set(exits.map(norm).filter(Boolean))];
        let locText = norm(pLoc.description);
        const light = roomLightOf(loc);
        if (light && (inRoom || light !== loc.light)) locText += `${locText ? '\n' : ''}Light: ${light}`;
        if (inRoom && asArray(loc.hazards).length) locText += `${locText ? '\n' : ''}Hazards: ${asArray(loc.hazards).join(', ')}`;
        if (zones.length) locText = `Part of: ${zones.map(z => norm(phasedEntity(z).name)).join(' › ')}` + (locText ? '\n' + locText : '');
        if (norm(pLoc.atmosphere)) locText += `${locText ? '\n' : ''}Atmosphere: ${norm(pLoc.atmosphere)}`;
        if (loc.hub) locText += `${locText ? '\n' : ''}A hub: travellers, traders and quest givers gather here.`;
        if (inner.length) locText += `${locText ? '\n' : ''}Places within: ${inner.map(l => norm(phasedEntity(l).name)).join(', ')}`;
        // in a room: every exit with direction and door state (exact names for <move>)
        if (inRoom) { const xl = exitLines(loc.id); if (xl.length) locText += `${locText ? '\n' : ''}Exits:\n${xl.join('\n')}`; }
        else if (exitsUniq.length) locText += `${locText ? '\n' : ''}Exits: ${exitsUniq.join(', ')}`;
        const hqFactions = asArray(world.factions).filter(f => f.hqLocationId === loc.id).map(f => norm(f.name)).filter(Boolean);
        if (hqFactions.length) locText += `${locText ? '\n' : ''}Headquarters of: ${hqFactions.join(', ')}`;
        // Always emit the location header (even with an empty body) — location
        // awareness is the core purpose, the AI must always know where it is.
        sections.push({ title: `Current Location: ${norm(pLoc.name)}`, priority: 80, text: locText });

        // 4. Nearby NPCs (resident here or scheduled here now)
        const npcsHere = asArray(world.npcs).filter(npc => resolveNpcLocationId(npc) === loc.id ||
            asArray(loc.npcIds).includes(npc.id));
        const npcSeen = new Set();
        const npcLines = [];
        const mode = aiMode();
        for (const rawNpc of npcsHere) {
            if (npcSeen.has(rawNpc.id)) continue; npcSeen.add(rawNpc.id);
            const npc = phasedEntity(rawNpc);
            if (npc.gone) continue;   // phased out (left, died, …)
            const faction = findById(world.factions, npc.factionId);
            const marker = personQuestMarker(npc.id, mode);   // ! offers a quest, ? turn-in ready
            const att = personAttitude(npc);
            const bits = [(marker ? marker + ' ' : '') + personName(npc) + (att ? ` (${att.name}: ${att.tier}${att.hostile ? ' — hostile to the player' : ''})` : '')];
            // skip the blurb when the context already describes this character in full
            // (active character / group-chat speaker / persona — see src/context)
            const described = opts && typeof opts.isDescribed === 'function' && opts.isDescribed(personName(npc));
            const blurb = described ? '' : personBlurb(npc); if (blurb) bits.push(blurb);
            const md = npcMood(npc); if (md) bits.push(`Mood: ${md}`);
            if (faction) bits.push(`Faction: ${norm(faction.name)}`);
            const npcStats = npc.stats || cardSheetStats(npc);   // own block, else the card's sheet
            if (npcStats) bits.push(statSummary(npcStats));  // d20 block when present
            npcLines.push('- ' + bits.join(' | '));
            if (mutate && rt() && !asArray(rt().knownNpcIds).includes(npc.id)) rt().knownNpcIds.push(npc.id);
        }
        push('Nearby NPCs', 70, npcLines.join('\n'));

        // 5. Nearby objects
        const objsHere = asArray(world.objects).filter(o => (o.locationId === loc.id || asArray(loc.objectIds).includes(o.id)) && featureVisible(o));
        const objLines = objsHere.map(o => '- ' + norm(o.name) + (MR.FEATURE_KINDS.includes(o.kind) && o.kind !== 'furniture' ? ` (${o.kind === 'light' ? (o.lit ? 'lit' : 'unlit') : o.kind})` : '') + (norm(o.desc) ? `: ${norm(o.desc)}` : ''));
        push('Nearby Objects', 50, objLines.join('\n'));
        // 5-. Prepared encounters at this place not yet fought (R7 step 4: generated ones too)
        if (!(getCombat() && getCombat().active)) {
            const waiting = encountersAt(loc.id).filter(e => !asArray(rt().startedEncounters).includes(e.id));
            if (waiting.length) push('Waiting here', 64, waiting.map(e => `- ${norm(e.name)}`).join('\n') +
                '\nWhen they notice the player (or the player attacks), write <encounter>exact name</encounter>; RPmod then runs the fight.');
        }
        // 5a. Moving room by room (R7): how the AI moves the player; optional text map
        if (inRoom) {
            push('Exploring', 24, 'The player explores room by room. Use a name or direction from the exits above: <go>name</go> moves (a closed door opens on the way), <open>north</open>, <close>north</close>, <unlock>north</unlock> (RPmod uses a key or rolls thieves\' tools), <search></search> when the player searches this room (RPmod rolls Perception/Investigation). ' +
                'To add a room next to this one: <room>Name, east: short description</room>; to give a way a door or lock it: <door>east = locked, iron</door>; to change the light here: <light>dark</light>. ' +
                'RPmod applies the rules: rolls, results and refusals appear in the log — narrate what actually happened, and describe hidden doors or traps only once the log says they were found.' +
                (isPlaceholderName(loc.name) ? ` This room has no proper name yet ("${norm(loc.name)}"): name and describe it once with <room>Name, here: short description</room>.` : ''));
            if (settingOn(ASCII_MAP_SETTING, false)) push('Map (explored)', 60, asciiMapText(loc.id));
        }

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
                .map(o => { const os = objectiveStatusOf(q, o); return `    ${os.done ? '☑' : '☐'} ${QR.objectiveLabel(o, os)}`; }).filter(Boolean);
            questLines.push(`- ${title} [${st}]${track}` + (desc ? `: ${desc}` : '') + (objs.length ? '\n' + objs.join('\n') : ''));
        }
        push('Active Quests', 45, questLines.join('\n'));
        // 5c. Standing with factions (only what differs from Neutral)
        const reps = reputationList().filter(r => r.tier !== 'Neutral');
        push('Reputation', 42, reps.map(r => `- ${r.name}: ${r.tier}${r.effect ? ` — ${r.effect}` : ''}`).join('\n'));

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

    // Human-readable preview of what Worlds adds this turn (the context module
    // formats and injects it; see src/context/context.js).
    function previewSlice() {
        return getContext().preview({ provider: 'worlds' });
    }

    // =======================================================================
    //  INJECTION — Worlds is the 'worlds' provider of RPmod's context owner
    // -----------------------------------------------------------------------
    // Esolite's submit_generation is a `const` and is the function that reads
    // current_wi, so it cannot be wrapped; src/context/context.js wraps
    // prepare_submit_generation once for all of RPmod and places each turn's
    // sections as constant WI entries. Worlds supplies the slice and its turn hooks.
    // =======================================================================
    function registerProvider() {
        getContext().register({
            id: 'worlds', order: 50,
            enabled: () => !!(W.config.enabled && activeWorld() && rt()),
            persistent: () => W.config.injectMode === 'persistent',
            // apply state-change tags from prior messages, then run the trigger bus
            // for this turn (onTurn/onTime/onEnter/… + chains) before the slice is built
            beforeTurn: () => { processPendingMutations(); try { fireTriggers('turn'); } catch (_) {} },
            collect: (ctx) => computeActiveSlice({ mutate: ctx.mutate, isDescribed: ctx.isDescribed }).sections,
            // the fired-events buffer is consumed by this turn's slice
            afterTurn: () => { firedEventsBuffer = []; notifyChange(); },
        });
    }
    // Worlds just got disabled/unloaded: let the context drop its entries.
    function removeWorldsEntries() { getContext().sync(); }
    function injectManaged(opts) { return getContext().inject(opts); }

    // Keep current_wi consistent after a state change outside of generation.
    function syncLive() {
        try { updateQuestProgress(); } catch (e) { dbg('quest progress', e); }
        getContext().sync();
        notifyChange();
    }

    // Tell UIs (shell views) that world/runtime state changed. Coalesced: many
    // mutations in one tick produce one 'klite:worlds-change' event on window.
    let changeQueued = false;
    function notifyChange() {
        if (changeQueued) return;
        changeQueued = true;
        setTimeout(() => {
            changeQueued = false;
            warmLinkedCards();
            try { window.dispatchEvent(new CustomEvent('klite:worlds-change')); } catch (_) {}
        }, 0);
    }
    // Start loading the linked cards (sheet + text) so the next turn's slice has them.
    function warmLinkedCards() {
        try {
            const C = window.KLITE_RPMod_Characters; const w = activeWorld();
            if (!C || !w) return;
            for (const p of asArray(w.npcs)) if (p && p.characterRef && p.characterRef.name) C.cachedSheet(p.characterRef.name);
        } catch (_) {}
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
                        obj.worldinfo = obj.worldinfo.filter(w => !(w && w.wigroup === LEGACY_WI_GROUP));
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
        // R7: exits get an id and `to` (legacy `locationId` kept)
        for (const l of world.locations) if (l && Array.isArray(l.exits)) for (const ex of l.exits) MR.normalizeExit(ex, () => uid('ex'));
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
                const n = { id: e.id, type: t, name: nodeName(t, e), entry: nodeEntry(t, e), x: e.ui?.x, y: e.ui?.y };
                // R7: rooms/places (and features in them) are drawn by the dungeon/town editor;
                // graphId = the node that stands for them in the world graph
                const inLoc = t === 'location' ? e.id : (t === 'object' ? e.locationId : null);
                if (inLoc && findById(world.locations, inLoc)) {
                    const m = mapOf(inLoc); const anchor = graphAnchor(inLoc);
                    if (t === 'location') { n.kind = MR.kindOf(e); if (MR.isContainer(e)) n.rooms = roomsOf(e.id).length; }
                    if (m && (t === 'location' || MR.FEATURE_KINDS.includes(e.kind))) { n.mapId = m.id; n.graphId = anchor; }
                    if (t === 'location' && m) n.label = zonePath(e.id).filter(z => z.id === anchor || isInsideLocation(z.id, anchor)).map(z => norm(z.name)).concat([n.name]).join(' › ');
                }
                nodes.push(n);
            }
        }
        for (const l of asArray(world.locations)) {
            edges.push({ from: '__world__', to: l.id, kind: 'contains' });
            for (const cid of asArray(l.connectedLocationIds)) if (findById(world.locations, cid)) edges.push({ from: l.id, to: cid, kind: 'exit' });
            for (const ex of asArray(l.exits)) { const to = ex && (ex.to || ex.locationId); if (to && to !== l.id && findById(world.locations, to) && !asArray(l.connectedLocationIds).includes(to)) edges.push({ from: l.id, to, kind: 'exit', exitId: ex.id }); }
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
            for (const pid of asArray(q.prerequisites && q.prerequisites.quests)) if (findById(world.quests, pid)) edges.push({ from: pid, to: q.id, kind: 'unlocks' });
        }
        for (const l of asArray(world.locations)) {
            if (l.parentId && findById(world.locations, l.parentId)) edges.push({ from: l.parentId, to: l.id, kind: 'zone' });
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

    // opts.withRooms: deleting a dungeon/town (or any zone) also deletes the places inside it
    // and the features (furniture/containers/traps/lights) in them. Without it the rooms stay
    // (their parent is gone, so they show up in the world graph again) — nothing is lost.
    function deleteEntity(id, opts) {
        const world = activeWorld(); if (!world || id === '__world__') return false;
        const type = entityType(world, id); if (!type) return false;
        if (type === 'location' && opts && opts.withRooms) {
            const inner = asArray(world.locations).filter(l => l.id !== id && isInsideLocation(l.id, id)).map(l => l.id);
            for (const rid of inner.concat([id])) for (const o of asArray(world.objects).filter(o => o.locationId === rid && MR.FEATURE_KINDS.includes(o.kind))) deleteEntity(o.id);
            for (const rid of inner) deleteEntity(rid);
        }
        world[TYPE_ARRAYS[type]] = asArray(world[TYPE_ARRAYS[type]]).filter(e => e.id !== id);
        // scrub references from every other entity
        for (const l of asArray(world.locations)) {
            if (Array.isArray(l.exits)) l.exits = l.exits.filter(ex => !ex || (ex.to || ex.locationId) !== id);
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
        if (ta === 'quest' && tb === 'quest') {   // chain: the second quest requires the first
            b.prerequisites = Object.assign({}, b.prerequisites || {}); b.prerequisites.quests = asArray(b.prerequisites.quests);
            if (!b.prerequisites.quests.includes(a.id)) b.prerequisites.quests.push(a.id);
            return { kind: 'unlocks' };
        }
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
            if (Array.isArray(x.exits)) x.exits = x.exits.filter(ex => !ex || (ex.to || ex.locationId) !== yId);
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
            if (x.prerequisites && Array.isArray(x.prerequisites.quests)) x.prerequisites.quests = x.prerequisites.quests.filter(v => v !== yId);
            if (x.parentId === yId) x.parentId = null;
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
            { id: 'loc_vale', name: 'Brookvale', description: 'A green valley on the frontier: farms, woods and one old trade road.', atmosphere: 'open', ui: { x: 520, y: 700 } },
            { id: 'loc_village', name: 'Millbrook Village', parentId: 'loc_vale', hub: true, description: 'A small farming village gathered around an old stone well.', atmosphere: 'peaceful', connectedLocationIds: ['loc_tavern', 'loc_forest'], ui: { x: 380, y: 320 },
              phases: [{ id: 'ph_feast', label: 'After the bounty', conditions: [{ type: 'quest', questId: 'q_bounty', state: 'turnedin' }], description: 'Millbrook is celebrating: lanterns hang over the well and the road is safe again.', atmosphere: 'festive' }] },
            { id: 'loc_tavern', name: 'The Crooked Kettle', parentId: 'loc_village', description: 'A cozy tavern; hearth crackling, rumors flowing.', atmosphere: 'warm', connectedLocationIds: ['loc_village'], ui: { x: 380, y: 150 } },
            { id: 'loc_forest', name: 'Forest Road', parentId: 'loc_vale', description: 'An old trade road winding through dense woodland.', atmosphere: 'tense', connectedLocationIds: ['loc_village', 'loc_watchtower', 'loc_camp'], ui: { x: 620, y: 320 } },
            { id: 'loc_watchtower', name: 'Royal Watchtower', description: 'A stone tower guarding the frontier road.', atmosphere: 'disciplined', connectedLocationIds: ['loc_forest'], ui: { x: 860, y: 210 } },
            { id: 'loc_camp', name: 'Bandit Camp', parentId: 'loc_vale', description: 'A hidden camp tucked among the trees.', atmosphere: 'dangerous', connectedLocationIds: ['loc_forest'], ui: { x: 860, y: 440 },
              phases: [{ id: 'ph_abandoned', label: 'Abandoned', conditions: [{ type: 'quest', questId: 'q_bounty', state: 'turnedin' }], name: 'Abandoned Camp', description: 'Cold fire pits and torn red banners; the Red Hand is gone.', atmosphere: 'eerie' }] }
        ],
        npcs: [
            { id: 'npc_bram', name: 'Innkeeper Bram', personality: 'friendly, gossipy, knows everyone in town', homeLocationId: 'loc_tavern', factionId: 'fac_town', mood: 'cheerful', ui: { x: 200, y: 150 } },
            { id: 'npc_rowan', name: 'Captain Rowan', personality: 'stern, dutiful veteran of the Royal Guard', homeLocationId: 'loc_watchtower', factionId: 'fac_guard', mood: 'watchful',
              phases: [{ id: 'ph_grateful', label: 'Grateful', conditions: [{ type: 'quest', questId: 'q_bounty', state: 'turnedin' }], mood: 'grateful, relaxed' }], stats: { abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 12, cha: 11 }, ac: 18, hpMax: 22, proficiency: 2, attacks: [{ name: 'Longsword', toHit: 4, damage: '1d8+2' }] }, ui: { x: 1080, y: 170 } },
            { id: 'npc_courier', name: 'Courier Finn', personality: 'nervous, always out of breath', homeLocationId: 'loc_village', ui: { x: 200, y: 320 } },
            { id: 'npc_kell', name: 'Bandit Leader Kell', personality: 'ruthless and greedy', homeLocationId: 'loc_camp', factionId: 'fac_bandit', isMonster: true,
              phases: [{ id: 'ph_gone', label: 'Defeated', conditions: [{ type: 'quest', questId: 'q_bounty', state: 'turnedin' }], gone: true }], stats: { abilities: { str: 14, dex: 14, con: 13, int: 11, wis: 10, cha: 12 }, ac: 15, hpMax: 27, proficiency: 2, attacks: [{ name: 'Scimitar', toHit: 4, damage: '1d6+2' }, { name: 'Light Crossbow', toHit: 4, damage: '1d8+2' }] }, ui: { x: 1080, y: 450 } }
        ],
        factions: [
            { id: 'fac_town', name: 'Millbrook Townsfolk', description: 'Ordinary villagers who keep to themselves.', ui: { x: 60, y: 80 } },
            { id: 'fac_guard', name: 'Royal Guard', description: 'Protect the kingdom and keep its roads safe.', hqLocationId: 'loc_watchtower', ui: { x: 1080, y: 60 } },
            { id: 'fac_bandit', name: 'The Red Hand', description: 'Bandits preying on the frontier trade road.', hqLocationId: 'loc_camp', startReputation: -400, ui: { x: 1080, y: 600 } }
        ],
        objects: [
            { id: 'obj_well', name: 'Stone Well', desc: 'The village water source; children dare each other to peer in.', locationId: 'loc_village', ui: { x: 380, y: 470 } },
            { id: 'obj_poster', name: 'Wanted Poster', desc: 'A bounty for the bandit leader — dead or alive.', locationId: 'loc_tavern', ui: { x: 200, y: 60 } }
        ],
        quests: [
            { id: 'q_merchant', title: 'The Missing Merchant', description: 'A merchant vanished on the Forest Road. Bram asks you to find out what happened.', giverPersonId: 'npc_bram', turninPersonId: 'npc_rowan',
              rewards: [{ type: 'item', item: 'Silver Ring', qty: 1 }, { type: 'xp', xp: 100 }, { type: 'gold', gold: 20 }, { type: 'reputation', factionId: 'fac_guard', amount: 100 }],
              objectives: [{ id: 'o1', kind: 'visit', target: 'loc_forest', text: 'Search the Forest Road' }, { id: 'o2', kind: 'talk', target: 'npc_rowan', text: 'Report to Captain Rowan' }], ui: { x: 200, y: 230 } },
            { id: 'q_bounty', title: 'Bandit Bounty', description: 'Captain Rowan will pay a bounty for the head of the bandit leader.', giverPersonId: 'npc_rowan', turninPersonId: 'npc_rowan',
              prerequisites: { quests: ['q_merchant'] },
              rewards: [{ type: 'xp', xp: 200 }, { type: 'gold', gold: 50 }, { type: 'choice', options: [{ item: 'Longsword', qty: 1 }, { item: 'Shield', qty: 1 }, { item: 'Potion of Healing', qty: 2 }] }, { type: 'reputation', factionId: 'fac_guard', amount: 150 }, { type: 'reputation', factionId: 'fac_bandit', amount: -300 }],
              objectives: [{ id: 'b1', kind: 'kill', target: 'npc_kell', count: 1, text: 'Defeat Bandit Leader Kell' }], ui: { x: 1240, y: 300 } },
            { id: 'q_delivery', title: 'Urgent Delivery', description: 'Carry a sealed letter from Finn to the Watchtower.', giverPersonId: 'npc_courier', turninPersonId: 'npc_rowan', hidden: true, hiddenDescription: '??? — a courier may yet find you', ui: { x: 60, y: 320 } }
        ],
        encounters: [
            { id: 'enc_redhand', name: 'Red Hand ambush', monsters: [{ key: 'bandit', count: 2 }], personIds: ['npc_kell'], locationId: 'loc_camp' }
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
        // never overwrite a saved example (the user may have changed it): load a fresh copy beside it
        if (W.library[w.id]) {
            let n = 2; while (W.library[`${w.id}_${n}`]) n++;
            w.id = `${w.id}_${n}`; w.name = `${EXAMPLE_WORLD.name.replace(/\)$/, '')} ${n})`;
        }
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
            const key = norm(idOrName).toLowerCase();
            const c = lib.find(x => x && norm(x.name).toLowerCase() === key) || lib.find(x => x && x.id != null && String(x.id) === String(idOrName));
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
        inventory: () => inventoryView(),
        itemCount: (name) => itemCount(name),
        rewardText: (r) => QR.formatReward(r, factionName),
        parseReward: (text) => QR.parseReward(text, (n) => { const f = asArray(activeWorld() && activeWorld().factions).find(x => QR.sameName(x.name, n) || x.id === n); return f ? f.id : null; }),
        questState(id) { const q = findById(activeWorld() && activeWorld().quests, id); return q ? questStateOf(q) : null; },
        setQuestState(id, state) { const s = setQuestState(id, state); syncLive(); return s; },
        acceptQuest(id, force) { const s = acceptQuest(id, force); syncLive(); return s; },
        questLocks: (id) => questLocks(questById(id)),
        reputationTiers: () => QR.TIERS.map(t => t.name),
        reputation: () => reputationList(),
        setLocationParent(id, parentId) { const ok = setLocationParent(id, parentId); syncLive(); return ok; },

        // ----- R7 maps: dungeons & towns, room by room (src/game/map-rules.js) -----
        mapRules: MR,
        setLocationKind(id, kind) { const k = setLocationKind(id, kind); syncLive(); return k; },
        locationKind: (id) => MR.kindOf(locOf(id)),
        mapOf: (id) => { const m = mapOf(id); return m ? m.id : null; },
        graphAnchor: (id) => graphAnchor(id),
        roomsOf: (mapId) => roomsOf(mapId).map(l => l.id),
        addRoom(mapId, fields) { const r = addRoom(mapId, fields || {}); syncLive(); return r; },
        addExit(fromId, toId, opts) { const e = addExit(fromId, toId, opts || {}); syncLive(); return e; },
        updateExit(exitId, patch) { const e = updateExit(exitId, patch || {}); syncLive(); return e; },
        removeExit(exitId) { const ok = removeExit(exitId); syncLive(); return ok; },
        findExit(exitId) { const f = findExit(exitId); return f ? { owner: f.owner.id, exit: f.exit } : null; },
        exitsOf: (locId, opts) => (opts && opts.player ? playerExits(locId) : exitsOfLoc(locId)),
        setRoomRect(id, rect) { return setRoomRect(id, rect); },
        layoutMap(mapId) { return layoutMap(mapId); },
        mapBoard: (mapId, opts) => mapBoard(mapId, opts || {}),
        go(target, opts) { const r = go(target, opts || {}); syncLive(); return r; },
        placeName: (id, fromId) => placeName(id, fromId),
        asciiMap: (locId) => asciiMapText(locId || (rt() && rt().playerLocationId)),
        featuresOf: (roomId) => asArray(activeWorld() && activeWorld().objects).filter(o => o.locationId === roomId),
        addFeature(roomId, fields = {}) { const o = addFeatureTo(roomId, fields); syncLive(); return o; },
        // R7 step 4: generator (src/game/map-gen.js)
        generateMap(mapId, opts) { const r = generateMap(mapId, opts || {}); syncLive(); return r; },
        mapGen: MG,
        randomSeed: () => MG.randomSeed(),
        // exploration (runtime, per story; both state slots)
        exploration() { const r = ensureRuntime(); MR.normalizeExploration(r); return deepClone({ explored: r.explored, found: r.found, doorState: r.doorState, roomLight: r.roomLight }); },
        // R7 step 3: player actions (UI or API) through the rules; results/refusals are logged
        door(action, target, opts) { const r = doorAction(action, target, opts || {}); syncLive(); return r; },
        search(opts) { const r = searchRoom(opts || {}); syncLive(); return r; },
        setRoomLight(level, roomId) { ensureRuntime(); const r = setRoomLight(level, roomId); syncLive(); return r; },
        roomLight: (id) => roomLightOf(locOf(id || (rt() && rt().playerLocationId))),
        playerPlaceName: (id, fromId) => playerPlaceName(id, fromId),
        hiddenIn: (roomId) => hiddenHere(roomId).map(c => ({ kind: c.kind, id: c.id, dc: c.dc })),
        passivePerception: () => passivePerception(),
        setExplored(roomId, level) { const r = ensureRuntime(); MR.normalizeExploration(r); if (!level) delete r.explored[roomId]; else if (MR.EXPLORE.includes(level)) r.explored[roomId] = level; syncLive(); return r.explored[roomId] || null; },
        setDoorState(exitId, state) { const r = ensureRuntime(); MR.normalizeExploration(r); if (!findExit(exitId) || !MR.DOOR_STATES.includes(state)) return null; r.doorState[exitId] = state; syncLive(); return state; },
        doorState(exitId) { const f = findExit(exitId); return f ? MR.doorState(f.exit, rt() && rt().doorState) : null; },
        markFound(kind, id) { const r = ensureRuntime(); MR.normalizeExploration(r); const list = kind === 'trap' ? r.found.traps : r.found.secrets; if (!list.includes(id)) list.push(id); syncLive(); return true; },
        zonePath: (id) => zonePath(id).map(z => ({ id: z.id, name: norm(phasedEntity(z).name) })),
        phased: (id) => { const e = entityById(activeWorld(), id); const p = phasedEntity(e); return p ? { name: norm(p.name), description: norm(p.description), atmosphere: norm(p.atmosphere), mood: norm(p.mood), gone: !!p.gone, phase: p.phase || null } : null; },
        evalCondition: (c) => evalCondition(c),
        changeReputation(idOrName, amount) { ensureRuntime(); const fid = factionIdOf(idOrName); if (!fid) return null; changeReputation(fid, Number(amount) || 0, 'api'); syncLive(); return repValue(fid); },
        questMarkerInfo: (personId, mode) => questMarkerInfo(personId, mode || aiMode()),
        completeQuest(id) { const s = setQuestState(id, 'complete'); const q = questById(id); if (s && q) gameLog(`Quest ready to turn in: ${questTitle(q)}.`); syncLive(); return s; },
        // choice: index of the chosen "choose one" reward (array for several choice rewards)
        turnInQuest(id, choice) { const s = turnInQuest(id, choice); syncLive(); return s; },
        abandonQuest(id) { const s = abandonQuest(id); syncLive(); return s; },
        failQuest(id) { const s = setQuestState(id, 'failed'); const q = questById(id); if (s && q) gameLog(`Quest failed: ${questTitle(q)}.`); syncLive(); return s; },
        questNeedsChoice: (id) => needsChoice(questById(id)),
        rewardsPaid: (id) => !!(rt() && rt().rewardsPaid && rt().rewardsPaid[id]),
        setActiveQuest(id) { ensureRuntime(); rt().activeQuestId = id; syncLive(); return id; },
        discoverQuest(id) { discover('quests', id); discover('descriptions', id); syncLive(); return true; },
        completeObjective(qid, oid, done = true) { ensureRuntime(); setObjProgress(qid, oid, !!done); updateQuestProgress(); syncLive(); return rt().questObjectives[qid]; },
        objectiveStatus(qid, oid) { const q = questById(qid); const o = q && asArray(q.objectives).find(x => x.id === oid); return o ? objectiveStatusOf(q, o) : null; },
        questEvent(kind, info) { questEvent(kind, info || {}); syncLive(); },
        personQuestMarker(personId) { return personQuestMarker(personId, aiMode()); },
        setAiMode(mode) { const w = activeWorld(); if (w) { w.ruleset = w.ruleset || {}; w.ruleset.aiMode = (mode === 'player' ? 'player' : 'gm'); } return w && w.ruleset.aiMode; },
        getAiMode() { return aiMode(); },

        // ----- Dice & combat (Phase F) -----
        roll(expr) { return rollExpr(expr); },
        rollD20(mod, mode) { return rollD20(mod, mode); },
        startEncounter(ids, opts) { const c = startEncounter(ids, opts); syncLive(); return c; },
        endEncounter() { endEncounter(); syncLive(); return true; },
        getCombat, combatText, combatantStats, combatantName, resolveCombatant,
        attack(a, t, i, opts) { const r = combatAttack(a, t, i, opts || {}); syncLive(); return r; },
        damage(id, n) { const r = combatDamage(id, n); syncLive(); return r; },
        heal(id, n) { const r = combatHeal(id, n); syncLive(); return r; },
        nextTurn() { const r = nextTurn(); syncLive(); return r; },
        check(id, ability, dc, mode) { const r = abilityCheck(id, ability, dc, mode); syncLive(); return r; },
        listTemplates() { return Object.keys(TEMPLATE_KEYS); },
        // A world person with an SRD monster's stat block (key of MONSTERS, a monster name or an old preset key).
        addPersonFromTemplate(key, fields = {}) {
            const mk = CR.findMonster(TEMPLATE_KEYS[key] || key); if (!mk) throw new Error('unknown monster ' + key);
            const tpl = CR.monsterStats(mk);
            const p = addEntity('npc', { name: fields.name || tpl.name, x: fields.x, y: fields.y });
            const { name, ...stats } = tpl; p.stats = normalizeStats(stats); p.isMonster = true;
            return p;
        },
        // ----- R5 encounters -----
        monsters: () => CR.monsterList(),
        monsterStats: (key) => CR.monsterStats(CR.findMonster(key)),
        findMonster: (q) => CR.findMonster(q),
        encounterBudget: (level, size) => CR.budget(level, size),
        encounterDifficulty: (xp, level, size) => CR.difficulty(xp, level, size),
        encounterXp: (monsters) => CR.encounterXp(asArray(monsters).map(m => ({ key: CR.findMonster(m.key || m.name), count: m.count }))),
        partyInfo,
        autoTurn(id) { const r = autoTurn(id); syncLive(); return r; },
        runAutoTurns() { const r = runAutoTurns(); syncLive(); return r; },
        deathSave(id) { const r = deathSaveRoll(id || '__player__'); syncLive(); return r; },
        savingThrow(id, ability, dc, mode) { const r = savingThrow(id, ability, dc, { mode }); syncLive(); return r; },
        saveAction(a, t, i) { const r = saveAction(a, t, i); syncLive(); return r; },
        addCondition(id, name, rounds) { addCond(id, name, rounds); combatLog(`${combatantName(id)} is ${name}${rounds ? ` for ${rounds} round${rounds > 1 ? 's' : ''}` : ''}.`); syncLive(); return conds(id); },
        removeCondition(id, name) { removeCond(id, name); combatLog(`${combatantName(id)} is no longer ${name}.`); syncLive(); return conds(id); },
        conditionsOf: (id) => conds(id).slice(),
        conditionNames: () => CR.CONDITIONS.slice(),
        conditionText: (name) => CR.conditionText(name),
        listEncounters() { const w = activeWorld(); return asArray(w && w.encounters).map(e => ({ ...e, xp: CR.encounterXp(e.monsters) })); },
        saveEncounter(enc) {
            const w = activeWorld(); if (!w) return null;
            w.encounters = asArray(w.encounters);
            const e = { id: enc.id || uid('enc'), name: norm(enc.name) || 'Encounter', monsters: asArray(enc.monsters).map(m => ({ key: CR.findMonster(m.key || m.name), count: Math.max(1, Number(m.count) || 1) })).filter(m => m.key),
                personIds: asArray(enc.personIds), locationId: enc.locationId || null, difficulty: enc.difficulty || null };
            const i = w.encounters.findIndex(x => x.id === e.id);
            if (i >= 0) w.encounters[i] = e; else w.encounters.push(e);
            return e;
        },
        deleteEncounter(id) { const w = activeWorld(); if (!w) return false; w.encounters = asArray(w.encounters).filter(e => e.id !== id); return true; },
        startSavedEncounter(idOrName) { const c = startSavedEncounter(idOrName); syncLive(); return c; },
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
        disable() { W.config.enabled = false; removeWorldsEntries(); dbg('disabled'); return true; },
        isEnabled() { return !!W.config.enabled; },

        // ----- runtime controls -----
        moveTo(locationNameOrId) {
            const world = activeWorld(); if (!world) throw new Error('no active world');
            let loc = findById(world.locations, locationNameOrId) || locationByName(world, locationNameOrId);
            if (!loc) throw new Error('unknown location: ' + locationNameOrId);
            ensureRuntime();
            rt().playerLocationId = loc.id;
            markVisitedRoom(loc.id);
            passiveNotice(loc.id);
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
        installReplyHook,
        refresh() { return injectManaged(); },

        // ----- introspection -----
        preview() { return previewSlice(); },
        previewSlice: computeActiveSlice,

        // ----- persistence passthrough (used by save wrappers) -----
        collectSaveState, restoreSaveState, saveLibrary, loadLibrary,

        // ----- unsaved edits (see markDirty) -----
        hasUnsavedChanges() { return edits.dirty; },
        async revertToSaved() { return revertLibrary(); },
        autosaveEnabled: autosaveOn,
    };
    // Every authoring change to a world marks it unsaved (and schedules autosave if on).
    for (const name of ['addEntity', 'updateEntity', 'deleteEntity', 'connect', 'disconnect', 'setNodePos', 'changeEntityType',
        'linkCharacter', 'unlinkCharacter', 'addPersonFromCharacter', 'setStats', 'clearStats', 'addPersonFromTemplate',
        'setPlayerCombat', 'setAiMode', 'saveEncounter', 'deleteEncounter',
        'setLocationParent', 'setLocationKind', 'addRoom', 'addExit', 'updateExit', 'removeExit', 'setRoomRect', 'addFeature', 'generateMap']) {
        const fn = API[name];
        if (typeof fn !== 'function') { err('authoring API missing: ' + name); continue; }
        API[name] = function () {
            const r = fn.apply(this, arguments);
            const auto = name === 'setNodePos' && arguments[3] && arguments[3].layout;   // editor auto-layout
            if (activeWorld() && !auto) markDirty();
            return r;
        };
    }

    // =======================================================================
    //  INIT — wait for host + main mod, then install hooks
    // =======================================================================
    // Known issue 12 (fixed in R7): the AI's tags take effect when its reply arrives, not at the
    // next send. Esolite appends the reply to gametext_arr inside handle_incoming_text (it wraps
    // that function itself, static/js/contextUsage.js); RPmod wraps it the same way.
    function installReplyHook() {
        const orig = window.handle_incoming_text;
        if (typeof orig !== 'function' || orig.__rpmod_worlds) return !!(orig && orig.__rpmod_worlds);
        const wrapped = function () {
            const res = orig.apply(this, arguments);
            try { if (W.config.enabled && activeWorld() && rt()) { processPendingMutations({ advance: false }); syncLive(); } } catch (e) { err('reply tags failed', e); }
            return res;
        };
        wrapped.__rpmod_worlds = true;
        window.handle_incoming_text = wrapped;
        return true;
    }

    async function init() {
        if (W.ready) return;
        await loadLibrary();
        installSaveWrappers();
        installReplyHook();
        registerProvider();
        registerSettingAndGuards();
        const okPrepare = getContext().install();
        // the persona's items changed (sheet window, rewards): "collect" objectives follow
        window.addEventListener('klite:sheet-change', () => { try { if (activeWorld() && rt()) { updateQuestProgress(); notifyChange(); } } catch (_) {} });
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
