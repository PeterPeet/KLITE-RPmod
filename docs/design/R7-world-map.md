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
7. **Zone combat** instead of a grid (idea from the zone combat of "Ultimate Dungeon Terrain",
   Dungeon Craft — rules reimplemented, nothing copied; reference PDF in `docs/reference/`); cover
   and hiding from the SRD. *Revised 2026-09-25:* first written as "distance bands close/near/far/
   out", which misread the idea — creatures stand in **zones of the room**, and adjacency of zones
   decides reach (see "Zone combat (step 5)").

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

## Zone combat (step 5)
Agreed with the owner 2026-09-25 (−3 instead of SRD disadvantage; 1 board cell = 10 ft; an
explanation in the Guide as its own tab, linked from the Combat window).
- **Every creature stands in one zone of the room the fight starts in.** Layout from the room:
  **small** (≤ 30 × 30 ft, i.e. ≤ 3 × 3 cells) = one zone; **large** (bigger rooms, anything
  outdoors / without a board) = centre + north/east/south/west, each side touching the centre and
  its two neighbours; **corridor** (a side of 1 cell) = the middle + only the arms its exits lead to
  (walls between the arms). Plus **just outside** (reached only through the room's openings: the
  sides with an exit) and **out of range**. The creator can override (`room.combatSpace`).
- **Moving:** stay in the zone (e.g. take cover) or move to an adjacent zone; speed ≥ 60 ft → two
  zones. **Flee** (Dash): double, no attack that turn, opportunity attacks from enemies in the zone
  left; a one-zone fighting retreat provokes nothing (UDT's rule; also: moving 2+ zones at once
  provokes).
- **Melee:** same zone (reach > 30 ft: adjacent). **Ranged:** normal range ≤ 30 ft → same or
  adjacent zone; longer → any zone in line of fire (corridor corners block; from outside only
  through an opening; out of range never). **−3** to hit against an enemy that attempted a melee
  attack on the shooter within the last round (replaces SRD's disadvantage within 5 ft). **One
  ranged attack per round through a doorway.**
- **Cover** (SRD 5.2.1): room features stand in a zone (`feature.zone`, else a stable spread) and
  give `half` (+2) or `three` (+5) AC (`feature.cover`, else by name: pillar/statue/boulder… three,
  other furniture half); counts against attacks from another zone. **Hide** (SRD 5.2.1): action,
  DC 15 Stealth behind three-quarters cover with no enemy in the zone, or in a dark room →
  Invisible, total = DC to find; ends on attacking (or moving into light); enemies **Search**
  (Perception) when they see no one.
- **Start:** party on the side it came in by (`runtime.entry`, set by `go`), else the centre;
  enemies across the room / beside you / next zone / outside (builder; saved with an encounter).
- **Monsters:** melee closes in (dash if out of one move, or shoots when it has a bow), ranged
  steps out of melee to a zone with a shot (preferring cover), takes cover, shoots.
- **UI:** the Combat window draws the room as circles like the reference (small: room + ring;
  large: centre + four sectors + ring; corridor: a cross of passages cut into rock), doors on the
  rim, features, tokens; reachable zones are clickable; Move/Flee/Take cover/Hide/Search; attack
  reasons. **Guide tab "Zone combat"** (Esolite's Guide: a second RPmod tab; own guide window: a
  book tab) + a diagrams window; "How zone combat works" in the Combat window.
- **AI:** "Battlefield" (layout, zones with doors and terrain, one-line rules) and each
  combatant's zone/cover/hidden in the Combat section; moves, opportunity attacks, cover and hide
  results in the combat log.

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
4. ✅ **Generator** for dungeons and towns (2026-09-24): `src/game/map-gen.js` (seeded plans) +
   engine `generateMap` + Generate panel in the dungeon/town editor. Themes crypt/cave/ruin/sewer,
   sizes 5/8/12 rooms + a secret room, a locked door with its key on the near side, traps, theme
   encounters within the party's XP budget; towns from ticked places around a square. A way out
   to the map's world neighbour (a level: stairs up). Placeholder rooms are named by the AI with
   `<room>Name, here: …</room>`; prepared encounters reach the AI as "Waiting here".
5. ✅ **Zone combat** (2026-09-25): `src/game/zone-rules.js` (pure) + engine (`cb.zones`, additive:
   fights without it keep the old rules) + Combat window board (`src/game/zoneBoard.js`) + editor
   fields (fighting space, feature cover/zone) + Guide tab "Zone combat" with a diagrams window.
   Setting `combat_zones` (default on).

Acceptance: build a small dungeon and a town in the editor, generate a second dungeon, let the AI
add a room with a locked door, explore room by room with fog on the mini-map, find a secret door
by searching, and fight an encounter using zones and cover.
