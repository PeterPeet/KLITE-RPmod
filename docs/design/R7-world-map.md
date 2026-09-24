# R7 — World map: dungeons & towns, room by room (design)

> Agreed with the owner on 2026-09-23. Status and steps: [ROADMAP.md](../ROADMAP.md) (R7).
> Product decisions: [USERSTORY.md](../USERSTORY.md). Engine internals: [ARCHITECTURE.md](../ARCHITECTURE.md)
> (§3 Worlds, §3.6 zones/phases/conditions, §3.7 combat).

## Goal
The player should *see* where they are. The world is a set of places the player moves between
— dungeon rooms and town places — drawn by RPmod as a board with fog of war and shown as a
mini-map. **No virtual tabletop** (no free tokens, no measuring, no map images).

## Decisions (owner, 2026-09-23)
1. **Room-by-room movement.** Towns work the same way with places: market, temple garden,
   adventurers' guild, bathhouse — exactly the places the creator adds.
2. **Three location kinds:** `location` (as today), `dungeon`, `town`. A dungeon or town is
   **one node in the world graph**; its inside is edited in a **dungeon/town editor that opens
   over the world editor** (an editor in the editor).
3. **Rooms stay locations** (children with `parentId` = the dungeon/town, the zones from R4),
   **hidden from the world graph** and shown only in the dungeon/town editor. Everything that
   works for locations keeps working for rooms: moving, "Go to" objectives, `onEnterLocation`,
   persons living there, phases, encounters, the AI slice.
4. **The world state is the truth; the board is derived.** RPmod lays places out on a grid and
   draws them. **The LLM never writes coordinates or ASCII** — it names places and uses tags.
5. **Dungeons come from three sources:** the editor, a generator, the AI during play.
6. **Mini-map for the player** (left dock) with fog and "you are here"; click a neighbouring room
   to go there; opens large as a window.
7. **Combat distance bands** instead of a grid: close / near / far / out; one move action = one
   band; cover and hiding from the SRD (idea from "Ultimate Dungeon Terrain", Dungeon Craft —
   rules reimplemented, nothing copied).

## Data model (additive — never break old worlds)
- `location.kind: 'location' | 'dungeon' | 'town'` (missing = `location`).
- A room/place = a location with `parentId` = its dungeon/town (may nest: dungeon level 2 inside
  the dungeon). Board position `map: { x, y, w, h }` in grid cells (set by the layout engine or
  by dragging in the dungeon/town editor).
- **Connections** between rooms: `exits: [{ id, to, dir: 'n'|'e'|'s'|'w'|'up'|'down', type:
  'door'|'corridor'|'stairs'|'secret'|'open', door: { state: 'open'|'closed'|'locked'|'barred',
  material, lockDC, keyItem }, secretDC }]` — stored on one side, mirrored when read (or both
  sides kept in sync; decide in step 1 and test it). **Decided (step 1): stored once**, on the room
  where it was made; `exitsOf` mirrors it for the other side — one door state and one "secret found"
  per exit id. Existing `connectedLocationIds` stay valid (= `open` connections without direction);
  older `exits[{ name, locationId }]` gain `id`/`to` and keep their fields.
- **Features** = world objects in the room with `kind: 'furniture'|'container'|'trap'|'light'`
  (+ `contains[]`, `trapDC`, `lit`). A room can be secret (`secret: true`, found by searching).
- **Environment per room:** `light: 'bright'|'dim'|'dark'`, `hazards: ['fire', 'water', …]`
  (can be phased, R4).
- **Exploration per story** (runtime, both slots): `explored: { [roomId]: 'known'|'discovered'|
  'visited' }` (missing = unknown; known = behind a closed door, name hidden; discovered = seen);
  `found: { secrets: [exitIds], traps: [ids], searched: { [roomId]: n } }`; door states in
  `doorState: { [exitId]: state }` and light in `roomLight: { [roomId]: light }` (runtime overrides
  the authored values; step 3 fields added additively).

## AI interface (why and how — see "Would the AI manage it?" below)
- **Context section every turn:** current room (name, description as phased, light), **exits
  with exact names, directions and door states**, visible features/persons/monsters; a small
  **read-only ASCII minimap** of explored rooms (optional, off for small models). Never the whole
  dungeon; **secrets and unfound traps are not in the AI's context** until found.
- **Tags by name** (short, forgiving parser — plurals, articles, "the north door" by direction):
  `<go>Ossuary</go>` / `<go>north</go>`, `<open>…</open>`, `<close>…</close>`, `<unlock>…</unlock>`,
  `<search>…</search>`, `<room>Ossuary, east: bones stacked to the ceiling</room>` (AI adds a room
  next to the current one; RPmod places it and names it exactly), `<door>east = locked, iron</door>`,
  `<light>dark</light>`.
- **RPmod decides, the AI narrates.** Player actions go through the UI first (click a room, open,
  unlock, search); RPmod applies the rules (a locked door blocks; Search = d20 + Perception/
  Investigation vs DC, rolled and logged), writes the result to the game log, the AI narrates it.
- **Refusals are visible:** "Move to Ossuary refused: the door is locked." goes to the log so the
  next reply corrects the story. **Fix known issue 12 in this phase:** parse tags when the AI's
  reply arrives, not at the next send.

## UI
- **World editor:** dungeon/town nodes with their own icon, colour and a room count; inspector
  button "Open dungeon editor" / "Open town editor" (also double-click). Rooms are not drawn in
  the world graph.
- **Dungeon/town editor** (shell window over the world editor, `large`, `flush`): grid board;
  add/drag/resize rooms (town: places), connect rooms (door/corridor/stairs/secret/open, door
  state), inspector for the selected room (name, description, light, features, inhabitants — link
  existing persons or add SRD monsters as a saved encounter — secret), **Generate** (size, theme,
  seed), style (dungeon: stone/parchment; town: streets/plots), close → back to the world editor.
- **Mini-map** (left dock section "Map"): current dungeon/town board with fog, "you are here",
  exits of the current room; click a neighbour to move; click the map to open the **Map window**
  (large board, same interactions). Outside dungeons/towns: current location and its exits.
- Look: Esolite theme variables (`--rpm-*`), Lucide icons; our own drawing style.

## Generator (step 4)
Seeded (reproducible), parameters size/theme; places rooms on a grid, connects them as a tree
plus a few loops, one secret room/door, doors with states, features by theme, optional
encounters (SRD monsters by the party's level/XP budget, R5). Names are placeholders ("Room 4");
the AI can rename/describe them via `<room>`. Towns: places from a list the creator ticks
(market, temple, guild, inn, bathhouse, smithy, …) around a square.

## Combat distance bands (step 5)
Bands per combatant: close · near · far · out. Move action = one band (Dash = two). Melee only at
close; ranged at near/far (long range → disadvantage; ranged attack at close → disadvantage,
SRD). Leaving close provokes an opportunity attack unless Disengage. Monsters choose a band by
their attacks (melee closes in, ranged keeps near). Cover: half +2 / three-quarters +5 AC (from
room features: pillars, tables); Hide → Invisible (SRD 5.2.1). Shown in the Combat window as
three rings/columns; the AI gets each combatant's band.

## Would the AI manage it? (analysis, 2026-09-23)
Handles well: narrating from the per-turn state, choosing exits by name from a list, short tags,
inventing rooms, reading a small minimap. Slips (more with small local models): forgetting state
not re-sent, name drift, contradictory geometry, narrating a move before the rules allow it,
leaking secrets it knows, forgetting/malforming tags. Hence the rules above: re-send the relevant
state with exact names, forgiving parser, UI-first actions, refusals in the log, secrets hidden,
few short tags. **Untested with a real backend** — the play test should include a scripted check
of how well the owner's model keeps names and tags; if it does not, the UI-first design still
works and the AI only narrates.

## Steps (each ends tested, documented, committed)
1. ✅ **Location kinds + dungeon/town editor** (2026-09-23): `kind`, rooms hidden from the world graph, the
   editor window with board, rooms, connections, doors, inspector; data model incl. exploration
   state and migrations/tests.
2. ✅ **Mini-map + moving room by room** (2026-09-23): left-dock Map, Map window, click to move, door rules,
   refusals in the log; context section for the AI; tags parsed on reply arrival (issue 12).
3. ✅ **AI tags + exploration** (2026-09-24): go/open/close/unlock/search/room/door/light (ordered,
   forgiving parser `src/game/map-tags.js`); fog states; secrets and traps found by Search checks
   and passive Perception; door buttons and Search in the mini-map. **Decided (owner, 2026-09-24):**
   rooms the AI adds are stored in the world (`origin: 'ai'`, shown in the editor); a room behind
   a closed door keeps its name hidden until seen ("unexplored room", "?" on the map); `<door>` may
   only make a door harder; unlocking needs the key or thieves' tools (no forcing yet).
4. **Generator** for dungeons and towns.
5. **Distance bands** in combat (+ cover, hiding).

Acceptance: build a small dungeon and a town in the editor, generate a second dungeon, let the AI
add a room with a locked door, explore room by room with fog on the mini-map, find a secret door
by searching, and fight an encounter using distance bands and cover.
