# Architecture

> Technical internals as of 2026-09-23 (baseline `worlds-baseline-2026-07` + R0).
> Product goals: [USERSTORY.md](USERSTORY.md). Plan/status: [ROADMAP.md](ROADMAP.md).
> Update this file whenever the architecture changes (R1 will change it substantially).

## 1. Modules, bundle, delivery

| Source (`src/`) | Namespace | Role |
|---|---|---|
| `KLITE-RPmod_ALPHA.js` (~17.7k lines) | `window.KLITE_RPMod` | Original mod: right-side panels CHARS / ROLES / TOOLS / CONTEXT / IMAGES, character gallery & editor, personas, group chat, save-bundle embedding, debug system |
| `KLITE-RPmod_GuidedRP.js` (~5.2k) | `window.KLITE_RPMod_GuidedRP` | Beginner onboarding overlay (8-step setup, Easy/Advanced) |
| `KLITE-RPmod_Worlds.js` (~1.6k) | `window.KLITE_RPMod_Worlds` | Worlds engine: world graph, retrieval, injection, runtime state, quests, triggers, combat |
| `KLITE-RPmod_WorldsUI.js` (~1.0k) | `window.KLITE_RPMod_WorldsUI` | Worlds panel (Play/Quests/Combat/Editor tabs) + node-graph editor overlay + navbar button |

- **Sources are ES modules** (strict mode). Each exports one default init function
  (`initAlpha`, `initGuidedRP`, `initWorlds`, `initWorldsUI`) whose body is the former IIFE;
  cross-module access is still via `window.*` only. `src/main.js` imports all four and calls
  them in the order above, each in its own `try{…}catch` so one module's runtime error
  cannot stop the others.
- **Build** (`scripts/build-bundle.js`, `npm run build`): **esbuild** bundles `src/main.js`
  into one classic-script IIFE, `KLITE-RPmod.js` (repo root). Not minified; ordinary
  comments are dropped. Tests bundle single modules on the fly the same way
  (`tests/helpers/host.js`).
- **Delivery A — usermod:** load `KLITE-RPmod.js` through Esolite's mod manager
  ("Apply Mod On Startup"). Esolite executes usermods late in its boot (inside
  `Promise.all([indexeddb_load…]).then()`), after the UI and top bar exist.
- **Delivery B — integrated page** (`scripts/build-integrated-index.js`,
  `npm run build:index`): writes `index.rpmod.html` into the host folder (original
  `index.html` untouched) and copies the bundle next to it. The injected loader appends
  `KLITE-RPmod.js?v=<build time>` **after `window.load`** — a parse-time `<script>` would
  run before Esolite's init and break top-bar placement (GuidedRP boots on
  `DOMContentLoaded`, ALPHA hooks the top bar). The `?v=` query busts the browser cache.
  Injection point: before the **last** `<!-- EsoLite modifications end -->` marker (it
  occurs twice). Both outputs are generated and git-ignored.

## 2. Host integration (Esolite) — hard-won facts

Host reference: `Esobold Esolite a fork of KoboldAI Lite RMv1.35.0/` (monolithic
`index.html` + `static/js/*`). Vanilla KoboldAI Lite provides the same core globals, so
the Worlds modules also run there.

| Global | Kind | Use |
|---|---|---|
| `current_wi`, `gametext_arr` | `var` (on `window`) | WorldInfo array; chat history |
| `localsettings` | object on `window` | settings (`opmode`, `agentBehaviour`, `websearch_enabled`, …) |
| `prepare_submit_generation` | function (wrappable) | **our injection hook** — all UI generation routes through it |
| `submit_generation` | **`const`** | reads `current_wi`; **cannot be wrapped** by usermods (by design) |
| `generate_savefile`, `kai_json_load` | functions (wrappable) | save/load hooks |
| `update_wi` | function | re-render WI editor |
| `indexeddb_save/load` | functions | persistence (fallback: `localStorage`) |
| `isAgentModeEnabledAndSetCorrectly` | host `let` — **not** on `window` | replicate: `opmode == 4 && agentBehaviour` |

Gotchas:
- `submit_generation` reads `current_wi` **synchronously** before its first `yield`; with
  websearch off, `PerformWebsearch` calls back synchronously, so the whole chain runs inside
  our `prepare_submit_generation` wrapper.
- **Agent mode:** `static/js/agent.js` *reassigns* `prepare_submit_generation` to start
  the agent cycle; the tool loop then calls `submit_generation("")` directly (bypassing
  any prepare hook). Our wrapper wraps agent.js's version (loaded earlier).
- **Websearch** makes the chain async.
- **Slash commands (1.35+):** `prepare_submit_generation` first checks whether the input is
  `/name …` for a user-callable custom tool (`localsettings.custom_tools`,
  `customtools_sanitize_list`); if so it runs the tool and returns **without generating**.
  Our Worlds wrapper skips turn processing in that case (`isHostSlashCommand`). R6 should
  register RPmod slash commands as such custom tools instead of parsing its own.
- **Group chat (1.35+):** speaker choice goes through `groupchat_reply_order(names)` and
  names through `sanitize_groupchat_participant_name`; memory gains
  `get_groupchat_context_memory()`. Relevant when ALPHA's speaker modes are migrated.

### Upgrading the host
1. Add the new Esolite folder next to the current one (`Esobold Esolite a fork of KoboldAI
   Lite RMv<x.y.z>/`).
2. Diff the globals in the table above (`prepare_submit_generation`, `submit_generation`,
   `generate_savefile`, `kai_json_load`, `update_wi`, the injection marker
   `<!-- EsoLite modifications end -->`, `static/js/agent.js` override) between versions.
3. Change `ESO_DIR` in `scripts/build-integrated-index.js` and `.claude/launch.json`, run
   `npm test` and `npm run build:index`, live-check, update docs.
- Esolite has a global CSS rule `pre{background-color:#f5f5f5}` — always set explicit
  backgrounds on our `<pre>` elements.
- ALPHA installs a **consent `Proxy` on `window.localsettings`**
  (`installWriteGuards`, `src/KLITE-RPmod_ALPHA.js` ~l.4170): writes are silently dropped
  until the user grants consent. Relevant when testing/writing `localsettings` with ALPHA
  loaded.

## 3. Worlds engine (`src/KLITE-RPmod_Worlds.js`)

### 3.1 Data model (static, authored — the "world")
`world = { id, name, description, rules[], ruleset:{ aiMode:'gm'|'player', player:{name,stats} },
locations[], npcs[], factions[], objects[], events[], quests[], globalLore[], ui }`.
`TYPE_ARRAYS` maps node types → arrays. Key fields:
- location: `description, atmosphere, connectedLocationIds[], npcIds[], objectIds[], localLore[]`
- npc (person): `name, description, personality, mood, homeLocationId, factionId,
  schedule[{time,locationId}], characterRef{source,id,name}, characterSnapshot, stats`
- stats (d20): `abilities{str…cha}, ac, hpMax, speed, proficiency, initiativeMod,
  attacks[{name,toHit,damage}], skills, saves, isMonster` (*isMonster currently unused*)
- faction: `description, goals, hqLocationId`
- quest: `title, description, hiddenDescription, hidden, giverPersonId, turninPersonId,
  rewards[], objectives[{id,text,hidden}]`
- event: `name, description, hidden, repeatable, triggers[], conditions[], effects[], locationIds[]`
- lore: `content, keys[], label, always`
Library of worlds persists in IndexedDB key **`KLITE_WORLDS_LIBRARY`**.

### 3.2 Runtime state (per story, two slots)
`W.runtime = { active:'working'|'base', base:Snapshot, working:Snapshot }`; every engine
read/write goes through **`rt()`** (active snapshot). Snapshot:
`playerLocationId, party[], knownNpcIds[], visitedLocationIds[], flags{}, inventory[],
questState{}, questObjectives{}, activeQuestId, discovered{quests,events,descriptions},
combat, npcStateOverrides{}, completedEventIds[], lastParsedIndex, clock{day,month,year,time,season,weather}`.
Ops: `resetToBase / commitToBase / swapActive / setActiveSlot` (deep clones).
`toRuntimeContainer()` migrates old flat saves. Saved in the story file under key
**`rpmod_worlds`** (wrapped `generate_savefile` / `kai_json_load`). `API.runtime` returns
the active snapshot (back-compat); `API.runtimeSlots` the container.

### 3.3 Injection ("compile-to-WI")
Each turn `computeActiveSlice()` builds sections; `sliceToEntries()` turns them into
`constant:true` WI entries tagged `wigroup:'__worlds__'` pushed into `current_wi`, so
Esolite's own engine injects them (size cap, context meter, insert position).
Sections (priority, high first): World premise (100, `world.description`), World Rules
(100), Combat (96), Current Time (90), Player State (85), Current Location (80, always
emitted), Nearby NPCs (70, with `!`/`?` markers, character blurb, stat line), Nearby
Objects (50), Active Quests (45), Active Events (40), Relevant Lore (30).
`config.injectMode`:
- `transient` (default): inject in the prepare wrapper, remove right after — **except**
  when websearch is active or agent mode is enabled (then kept for the turn and refreshed
  next turn).
- `persistent`: managed entries stay live while enabled.
Managed entries are **always stripped from every savefile**. Generation flow in the
wrapper: `processPendingMutations()` (parse new chat tags) → `fireTriggers('turn')` →
`injectManaged({mutate:true})` → host generation → cleanup → reset fired-events buffer.
`preview()` is side-effect free.

### 3.4 Chat tags (`parseMutations`)
`<move>`, `<npcmove>N=L`, `<mood>N=M`, `<flag>k=v`, `<unflag>`, `<give>Item xN`,
`<take>Item xN` (*without a count removes the whole stack*), `<quest>id=state`, `<time>`,
`<weather>`, `<advance>`, `<action>` (fires `action:` signal), `<roll>expr`,
`<attack>A->B`, `<hp>N=±n`, `<check>N=abi DC`. Parsed at the start of the next generation
from new `gametext_arr` messages (`lastParsedIndex`); tags stay visible in chat.

### 3.5 Trigger bus
`fireTriggers(signal)` — bounded queue (≤400 steps), per-cascade `firedNow` set,
completion marking for non-repeatable events, re-entrancy queue. Signals: `turn`, `time`,
`enter:<loc>`, `flag:<key>`, `quest:<id>:<state>`, `event:<id>`, `action:<text>`,
`manual:<id>`. Trigger types: `onTurn` (default), `onTime`, `onEnterLocation`, `onFlag`,
`onQuestState`, `onEvent`, `onAction`, `manual`. Conditions `{field, op, value}` over
clock/location/`flag.x`/`quest.x`. Effects (`applyEffect` returns follow-up signals):
`flag, unflag, give, take, quest, discover, move, npcmove, advance, fireEvent`. Fired
from the generation turn and from discrete API mutations (moveTo, setClock, advanceClock,
setFlag, setQuestState). Events fired since the last generation are injected; trigger-less
/`onTurn` events are "ambient" (shown while conditions hold).

### 3.6 Quests
States `available → active → complete → turnedin` (+ `failed`); first accepted quest is
tracked. Markers: `?` = turn-in person of a completed quest, `!` = giver of an available
quest. Visibility: `gm`/`creator` see all; `player` sees non-hidden or discovered.
*Rewards are stored but not paid out; no prerequisites yet.*

### 3.7 Persons & combat
Persons may reference `KLITE_RPMod.characters` (by id, then name); export embeds a
`characterSnapshot`. Combat state lives in the snapshot (`combat`): `startEncounter`
(initiative, HP from stats; player = `__player__` with `ruleset.player.stats`), `attack`
(d20 + toHit vs AC, crit doubles dice, nat 1 misses), `damage/heal`, `nextTurn` (skips
downed), `check` (ability vs DC). `SRD_TEMPLATES`: 6 SRD **5.1** monsters (to be replaced
by SRD 5.2 in R3).

### 3.8 Example world
`EXAMPLE_WORLD` ("Eldoria (Example)") + `loadExample()`: 5 locations, 4 persons, 3
factions (2 HQs), 3 quests (one hidden), 3 events (courier chain on quest accept, night
ambush, hidden omen). Sets the authored start as the base slot and enables the world.

## 4. Worlds UI (`src/KLITE-RPmod_WorldsUI.js`)
- **Floating panel** (bottom-right, `#wm-panel`): world selector, New/Example/Import/Export,
  Creator⇄Player lens (`localStorage['KLITE.worlds.uiMode']`), tabs Play (enable, state
  slots, location, time/weather, flags, inventory, preview), Quests (log, GM/player AI
  mode), Combat (builder with SRD quick-add, live tracker), Editor.
- **Editor overlay** (`#wm-overlay`): hand-rolled SVG canvas (no libraries): pan/zoom,
  palette, Select/Link tools, typed auto-inferred edges via `connect()`, derived chain
  edges, `!`/`?` badges, inspector with per-type extras (world rules, person
  character-link + stat block, quest giver/turn-in/rewards/objectives, event
  triggers/effects, faction HQ), preview modal.
- All DOM built with `createElement`/`textContent` (no `innerHTML` with user data).

## 5. ALPHA core (`src/KLITE-RPmod_ALPHA.js`) — overview
Right-side panels; character gallery/import (TavernCard V2, partial V3) and editor;
personas; group chat (speaker modes, round robin, talkativeness); quick actions; chapters;
image generation panel. Saves its own state under savefile key **`rpmod`**. Injects
character/persona data itself via WI entries with comment suffix `_imported_memory` and
via `pending_context_preinjection` (`rpmod_prepend_preinjection`) — overlaps with Worlds
persons (roadmap known issue). Security helpers: `KLITE_RPMod.escapeHtml`,
`KLITE_RPMod.safeImageHTML`. Debug: `KLITE_RPDebug.on('worlds,chat,…')`.

## 6. Tests (`tests/`)
Node's built-in runner + jsdom. `tests/helpers/host.js` builds a fake Esolite host (the
globals in §2, a recording `submit_generation`, `seedRandom` for dice) and loads sources
via `vm` like a usermod. Suites: `syntax`, `engine`, `quests`, `triggers`, `combat`, `ui`,
`bundle` (built file end-to-end). Known jsdom limits: no layout (stubbed
`getBoundingClientRect`); its CSS parser rejects some valid combined style strings; arrays
from the page realm need value comparison, not `deepStrictEqual`.
