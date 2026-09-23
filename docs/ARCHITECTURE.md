# Architecture

> Technical internals as of 2026-09-23 (baseline `worlds-baseline-2026-07` + R0).
> Product goals: [USERSTORY.md](USERSTORY.md). Plan/status: [ROADMAP.md](ROADMAP.md).
> Update this file whenever the architecture changes (R1 will change it substantially).

## 1. Modules, bundle, delivery

| Source (`src/`) | Namespace | Role |
|---|---|---|
| `KLITE-RPmod_ALPHA.js` (~17.7k lines) | `window.KLITE_RPMod` | Original mod: right-side panels CHARS / ROLES / TOOLS / CONTEXT / IMAGES, character gallery & editor, personas, group chat, save-bundle embedding, debug system |
| `KLITE-RPmod_Worlds.js` (~1.6k) | `window.KLITE_RPMod_Worlds` | Worlds engine: world graph, retrieval, injection, runtime state, quests, triggers, combat |
| `KLITE-RPmod_WorldsUI.js` (~1.0k) | `window.KLITE_RPMod_WorldsUI` | Worlds views for the shell (World tab, Party/Quests sections, Quest log/Combat/World editor windows) |
| `context/context.js` | `window.KLITE_RPMod_Context` | **Single owner of per-turn prompt context**: providers, the one `prepare_submit_generation` wrapper, managed WI entries, save stripping (§3.3) |
| `settings/settings.js` | `window.KLITE_RPMod_Settings` | "RPmod" tab in Esolite's Settings dialog; modules register options (§4c) |
| `library/esoliteLibrary.js` | `window.KLITE_RPMod_Library` | Writes characters through Esolite's own Library (id-based since 1.35); recovers characters an older RPmod hid (§5a) |
| `shell/shell.js`, `windows.js`, `styles.js`, `dom.js` | `window.KLITE_RPMod_Shell` | App shell: docks, view registry, floating windows, design tokens, top-bar button (§4a) |
| `onboarding/onboarding.js`, `quickStart.js`, `guide.js`, `chapters.js`, `hostGlobals.js` | `window.KLITE_RPMod_Onboarding` | Getting started: RPmod section in Esolite's Quick Start, the Guide window with "Show me", "New here?" card, GuidedRP save passthrough (§4b) |

- **Sources are ES modules** (strict mode). Each exports one default init function
  (`initShell`, `initAlpha`, `initWorlds`, `initWorldsUI`, `initOnboarding`); cross-module
  access is via `window.*` only — except `context/context.js`, which ALPHA and Worlds
  import (`getContext()`); it is a `window.KLITE_RPMod_Context` singleton, so separately
  bundled copies (tests) share one instance. `src/main.js` imports them and calls them (shell first), each in its own `try{…}catch` so one module's runtime error
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
  run before Esolite's init and break top-bar placement (ALPHA hooks the top bar). The `?v=` query busts the browser cache.
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

### 3.3 Injection ("compile-to-WI") — owned by `src/context/context.js`
All per-turn prompt context of RPmod goes through **`KLITE_RPMod_Context`**:
- **Providers** `register({ id, order, enabled(), collect(ctx), persistent?(),
  beforeTurn?(), afterTurn?() })`; `collect` returns `[{title, priority, text}]`.
  Providers run by `order` (low first) and may call `ctx.describe(name)` /
  `ctx.isDescribed(name)` to avoid repeating a character. Sections are sorted by
  priority (high first, stable) and become `constant:true` WI entries
  (`wigroup:'__rpmod__'`, `comment:'__rpmod__:<provider>'`) in `current_wi`, so Esolite's
  own engine injects them (size cap, context meter, insert position).
- **Current providers:** `characters` (ALPHA, order 10: persona 88, AI character /
  group-chat speaker 87) and `worlds` (order 50, the slice below; its NPC line skips the
  blurb for a described character).
- **Why not `pending_context_preinjection`:** Esolite treats it as the start of the AI's
  reply (printed into the output; overwritten in chat mode) — not a context channel.
- **Turn:** the one wrapper around `prepare_submit_generation` (skipped for host slash
  commands): `beforeTurn` hooks → `inject({mutate:true})` → host → cleanup → `afterTurn`.
  `run(fn)` does the same for direct submits (ALPHA group chat); nested turns inject
  once (depth counter). `install()` is idempotent (other wrappers may sit on top).
- API: `register/unregister/providers/compose/preview/inject/remove/sync/run/install/
  inTurn/isManaged`.
- **Setup data is not context:** ALPHA's Start RP WI entries (`<name>_imported_memory`),
  "load as scenario" Memory and Esolite's Quick Start write ordinary story data on
  purpose; the context module does not manage them.

Worlds' part: each turn `computeActiveSlice()` builds the sections.
Sections (priority, high first): World premise (100, `world.description`), World Rules
(100), Combat (96), Current Time (90), Player State (85), Current Location (80, always
emitted), Nearby NPCs (70, with `!`/`?` markers, character blurb, stat line), Nearby
Objects (50), Active Quests (45), Active Events (40), Relevant Lore (30).
`config.injectMode` (Worlds' `persistent()` for the context):
- `transient` (default): inject in the prepare wrapper, remove right after — **except**
  when websearch is active or agent mode is enabled (then kept for the turn and refreshed
  next turn).
- `persistent`: managed entries (all providers') stay live while enabled.
Managed entries (`__rpmod__`, legacy `__worlds__`) are **always stripped from every
savefile**. Worlds' turn hooks: `beforeTurn` = `processPendingMutations()` (parse new chat
tags) → `fireTriggers('turn')`; `afterTurn` = reset fired-events buffer + notify views.
`W.preview()` is the Worlds part only, `KLITE_RPMod_Context.preview()` everything; both
side-effect free.

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

## 4a. App shell (`src/shell/`)
- **Layout:** `#rpm-shell` is one fixed layer at **z-index 2** (below Esolite popups, z 3)
  holding the left dock (`#rpm-dock-left`, stacked collapsible sections), the right dock
  (`#rpm-dock-right`, tabs), edge handles and the window layer. **Docked** mode (viewport ≥
  left + right + 560 px) pushes Esolite's `#maincontainer` in via margins
  (`--rpm-push-left/right`); **overlay** mode turns docks into drawers (one at a time,
  Escape closes); **compact** (< 600 px) makes windows full-screen and does not restore
  them on load.
- **Views:** modules call `KLITE_RPMod_Shell.registerView({ id, title, place:
  'left'|'right'|'window', order, mount(container), update?(container), window?, eager? })`.
  Right-dock views mount on first show (or at once with `eager`); hidden views are marked
  dirty by `refresh(ids)` and re-render when shown; `refresh(ids, {soft:true})` skips a view
  while the user types in it. A throwing view shows an error box, the shell keeps working.
  Window views may add `unmount(container)` (called on close) and `window: { width, height,
  minWidth, minHeight, large, flush, restore }` — `large` opens nearly full-screen,
  `flush` drops the body padding (view lays itself out), `restore:false` never reopens it
  at startup.
  API: `open(id)`, `close(id)`, `maximize(id, on)`, `refresh`, `setDockOpen/toggleDock/dockOpen`, `mode`, `layout`.
- **Windows** (`windows.js`): drag by title bar, resize by grip (min size), click raises,
  clamped so the title bar stays on screen; **maximize/restore** (button `[data-winbtn=max]`
  or title-bar double-click; the normal geometry is kept and `max` is saved); pointer
  events (mouse fallback).
- **Persistence:** `localStorage['KLITE.shell.layout']` — dock open/width, saved tab (only
  explicit clicks), collapsed sections, window geometry/open/max. Per-browser convenience;
  corrupt data falls back to defaults.
- **Look & feel = Esolite's own** (`styles.js`). No RPmod palette: `--rpm-*` tokens are
  aliases of Esolite's `--theme_color_*` / `--theme_font_*` (1.35 names, older names, then
  fallbacks for vanilla Lite); tokens are defined on `#rpm-shell` and on any element with
  class `rpm-themed` (overlays outside the shell). Controls use Esolite's classes —
  buttons `btn btn-primary rpm-btn` (+ `rpm-block/grow/lg/danger/success/on`), inputs
  `form-control rpm-input` — dock headers/tabs mirror the top menu and `.nav-link`,
  windows mirror `.context-usage-popup`, sections mirror `.popuptitlebar`. The top-bar
  entry is a real `a.nav-link.mainnav`. Building blocks: `rpm-row/grow/label/muted/
  heading/card/chip/bar/log/divider`. New UI must not hard-code colours or font sizes.
- **RPmod theme variables in Esolite's theme editor:** `--theme_color_rpmod_quest`,
  `_danger`, `_success`, `_info` get defaults on `:root`; Esolite's "Theme colours" editor
  lists every `--theme_*` variable, so users can edit them and they are saved with a
  custom theme (`localsettings.customThemeColours`).
- **ALPHA adoption:** the shell moves ALPHA's `#panel-right` (built async) into a hidden
  stash at once, hides ALPHA's own tab bar, and registers four tabs **Chars / Roles /
  Scenario / Tools**; a view's `show()` hook moves the panel into the shown tab and calls
  `KLITE_RPMod.switchTab('right', KEY)`. ALPHA's event delegation
  (`closest('#panel-right')`) keeps working. ALPHA's panels-only CSS binds its `--bg/--text/
  --primary…` to the same Esolite variables and styles its buttons, inputs, sections and
  modals like Esolite's (`.klite-modal` now fully styled in panels-only mode).
- **Top bar:** one `#rpm-navbtn` in `#navbarNavDropdown > ul` toggles the docks.
- **Icons:** Lucide subset in `shell/icons.js` (generated by `scripts/build-icons.js` from the
  `lucide-static` dev dependency; edit `NAMES` there and run `npm run icons`; licence kept as
  a `/*! */` legal comment). `dom.js`: `icon(name|shapes, size)` (decorative, `aria-hidden`,
  `currentColor`), `iconText(name, text)` for buttons (add class `rpm-btn-icon`);
  icon-only buttons need an `aria-label`. Dock actions accept `icon`.

## 4b. Onboarding (`src/onboarding/`)
- **Principle:** Esolite's **Quick Start** (Jaxxks, `static/js/characterManager.js`) is the
  way to begin a session; RPmod extends it instead of shipping its own wizard. GuidedRP is
  retired (source in `BackupData/legacy/`).
- **Quick Start extension** (`quickStart.js`): extensions `{ id, label, helpText,
  render(container, rerender), hasSelection(), apply(), clear() }`. Uses
  `window.quickStartExtensions.register` if Esolite provides it (proposal:
  `docs/proposals/quick-start-extensions.md`); otherwise an **adapter** wraps the top-level
  `let` bindings `showQuickStartPopup` / `applyQuickStartSelection` /
  `clearAllQuickStartSelections` through `hostGlobals.js` (`new Function` code runs in the
  page's global scope and can read/reassign such bindings — they are not on `window`).
  RPmod's apply runs after Esolite's. Section "RPmod world": choose a Worlds world or the
  example; apply = `useWorld`/`loadExample` + `enable` + first location if none + show the
  World tab.
- **Guide** (`guide.js`, content `chapters.js`): window view `guide`; chapters of
  paragraphs/lists/tables/tips rendered as text; `show` actions get `{ open, highlight,
  hostCall, navLink }`. `highlight()` draws a ring + note (`.rpm-spot-*`, z-index above
  everything), ends on click, Escape or after 6 s. Chapter remembered in
  `localStorage['KLITE.guide.chapter']`.
- **Entry points:** "New here?" left-dock section (dismiss →
  `localStorage['KLITE.onboarding.welcome']='dismissed'`), `?` dock action
  (`KLITE_RPMod_Shell.addDockAction`), "What is RPmod?" in the Quick Start section.
- **GuidedRP save passthrough:** remembers `guided_rp` from a loaded save and re-attaches
  it on `generate_savefile` so old stories keep it.

## 4c. Settings (`src/settings/settings.js`)
- An **RPmod** tab in Esolite's Settings dialog, built like Esobold's `createNewSettingsSection`
  (`static/js/newMenuOptions.js`): `li#settingsmenurpmod_tab` in `.settingsnav`, pane
  `div#settingsmenurpmod.settingsmenu` with `.settingitem.wide`; rows `.settinglabel` /
  `.settingsmall` / `.helpicon` (built with `textContent`). The tab is created on the first
  `display_settings` (after Esobold's own tabs); its click computes its index at click time.
- Values live in `localsettings.rpmod_<id>` (Esolite keeps unknown keys): filled in the
  wrapped `display_settings`, written in the wrapped `confirm_settings` (which saves), so OK
  applies and Cancel discards — like Esolite's options.
- API: `registerSetting({ id, section, label, help, default, order })` (checkbox),
  `registerBlock({ id, section, mount })` (free-form; ALPHA's debug block = `alpha`, which
  ALPHA fills into `#rpmod-settings-alpha` and which applies immediately),
  `get/set/onChange/open`.
- **Worlds autosave** (`worlds_autosave`, default off): the Worlds API wraps every authoring
  method (add/update/delete entity, connect, positions, stats, links, player combat, AI
  mode) to mark the library unsaved (`klite:worlds-dirty`); autosave saves 1 s after the last
  change; `saveLibrary` clears the flag only if nothing changed meanwhile; `revertToSaved()`
  reloads from IndexedDB; editor auto-layout (`setNodePos(…, { layout: true })`) is not an
  edit. The editor window's `beforeClose` asks (save / keep unsaved / revert / stay);
  `beforeunload` warns. Shell windows support `beforeClose` (`close(id, { force })`).

## 4. Worlds UI (`src/KLITE-RPmod_WorldsUI.js`)
- **Shell views:** right tab **World** (`#wm-panel`: world selector,
  New/Example/Import/Export, Creator⇄Player lens `localStorage['KLITE.worlds.uiMode']`,
  window launchers, enable, state slots, location, time/weather, flags, inventory,
  preview); left sections **Party** and **Quests** (tracker); windows **Quest log** (GM/player
  AI mode), **Combat** (builder with SRD quick-add, live tracker) and **World editor**. All re-render on the
  engine's `klite:worlds-change` window event (coalesced, fired from `syncLive()` and after
  each generation).
- **World editor** (window view `editor`, root `#wm-editor`, CSS `.wm-ed-*` in
  `shell/styles.js`, stacks vertically under a 720 px container query; global mouse
  listeners are removed in `unmount`): hand-rolled SVG canvas (no libraries): pan/zoom,
  palette, Select/Link tools, typed auto-inferred edges via `connect()`, derived chain
  edges, `!`/`?` badges, inspector with per-type extras (world rules, person
  character-link + stat block, quest giver/turn-in/rewards/objectives, event
  triggers/effects, faction HQ), preview modal.
- All DOM built with `createElement`/`textContent` (no `innerHTML` with user data).

## 5a. Character store = Esolite's Library (`src/library/esoliteLibrary.js`)
- **Master:** Esolite's Library. 1.35 storage: record `character_<id>` =
  `{ id, name, data: <TavernCard v2 inner>, image? }`; list `let allCharacterNames` of
  `{ id, name, thumbnail?, type, favorite }` saved as `characterList`. The same keys hold
  every Library item type (Character, Save, Autosave, World Info, Scenario, Document,
  Manager). `updateCharacterListFromAll()` **drops entries without an id**.
- **RPmod view:** ALPHA's `KLITE_RPMod.characters` is rebuilt from `allCharacterNames`
  (`rebuildFromEsolite`) and adds rating/talkativeness/tag cache (`characters_v3`).
  Gallery ids are list positions (not stable) — link by name / Library id.
- **Writes:** `saveCharacter({ inner, image, oldName })` — with `oldName` an edit of that
  entry (id and favorite kept, rename keeps the id; clash → `getNextAutoincrementName`),
  without it a new entry via Esolite's `resolveCharacterNameAndId` (taken name → `Name_1`
  unless the user enabled overwriting). `deleteCharacter(name)` saves nothing under
  `character_<id>` (Esolite's delete) and drops the list entry by id.
- **Recovery** (once per load, after Esolite's id migration; `findOrphans`/`recoverOrphans`):
  keys come from the `localStorage` markers Esolite writes per IndexedDB key
  (`STORAGE_PREFIX + key`). An orphan = `character_*` key not referenced by any list id,
  record without `id`, TavernCard-shaped `data`. It is re-listed under its own key with
  `id` added; never deletes or overwrites.
- Host functions come from `window` or, for `let`/`const` bindings, `hostGlobals.js`.

## 5. ALPHA core (`src/KLITE-RPmod_ALPHA.js`) — overview
Right-side panels; character gallery/import (TavernCard V2, partial V3) and editor;
personas; group chat (speaker modes, round robin, talkativeness); quick actions; chapters;
image generation panel. Saves its own state under savefile key **`rpmod`**. Per-turn
persona/character context is its `characters` provider (§3.3). Setup actions still write
story data: Start RP → WI entries with comment suffix `_imported_memory`; load as scenario
→ Memory (R2 decides with the character model). Security helpers: `KLITE_RPMod.escapeHtml`,
`KLITE_RPMod.safeImageHTML`. Debug: `KLITE_RPDebug.on('worlds,chat,…')`.

## 6. Tests (`tests/`)
Node's built-in runner + jsdom. `tests/helpers/host.js` builds a fake Esolite host (the
globals in §2, a recording `submit_generation`, `seedRandom` for dice) and loads sources
via `vm` like a usermod (single `src/` modules are bundled on the fly with esbuild; the
viewport is 1400×900, `host.resize()` changes it). Suites: `syntax`, `engine`, `quests`,
`triggers`, `combat`, `context`, `library`, `shell`, `ui`, `onboarding`, `bundle` (built file end-to-end).
`host.installFakeLibrary()` mimics Esolite 1.35's id-based Library (incl. the id-less drop).
`host.installFakeQuickStart()` mimics Esolite's Quick Start (top-level `let` bindings +
popupUtils). The helper uses jsdom's own VM context (`runScripts: 'outside-only'`) so page
intrinsics behave like a browser. `npm test` runs `scripts/run-tests.js`, which fails if
fewer tests ran than `tests/.test-count` (guards against a test file ending early). It does
not use `--test-force-exit` (Node 22 cut long-running files short); a 180 s timeout guards
against hangs. Known jsdom limits: no layout (stubbed
`getBoundingClientRect`); its CSS parser rejects some valid combined style strings; arrays
from the page realm need value comparison, not `deepStrictEqual`.
