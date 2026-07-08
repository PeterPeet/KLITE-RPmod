# AGENTS.md — KLITE RPmod (developer guide)

This repo builds **KLITE RPmod**, a roleplay-tooling mod for the KoboldAI Lite fork
**Esobold Esolite**. It ships as a single JavaScript usermod (`KLITE-RPmod.js`) that
Esolite loads via its mod manager. That bundle is **generated** from several source
modules by a build script — see [Build & Packaging](#build--packaging).

For end-user documentation (what the mod does, the editor, and the in-chat Worlds
commands), see `USER_GUIDE.md`.

---

## Core principles

- **Enhance, don't replace.** Integrate with Esolite's own APIs and storage
  (`localsettings`, IndexedDB helpers, `current_wi`, save/load). Avoid invasive DOM
  rewrites.
- **Host-agnostic & defensive.** Detect Esolite functions before using them; guard
  every hook. A module must fail soft, never take the host down.
- **Never lose user data.** Savegames and characters are sacred. Changes to the save
  path must be additive and round-trip-safe; test carefully.
- **Performance-first.** Incremental updates, idempotent hooks, guarded observers.

---

## Repository layout

### Source modules (edit these)
- `KLITE-RPmod_ALPHA.js` — main mod (~18k lines). Right-side panels (CHARS, ROLES,
  TOOLS, CONTEXT, IMAGES), character gallery/editor, save-bundle embedding. Namespace
  `window.KLITE_RPMod`.
- `KLITE-RPmod_GuidedRP.js` — guided onboarding wizard (beginner "Easy mode" overlay,
  8-step setup). Namespace `window.KLITE_RPMod_GuidedRP`. (Renamed from
  `Guided_RPmod_esolite.js`.)
- `KLITE-RPmod_Worlds.js` — Wyvern Worlds engine: graph/state world model, retrieval,
  compile-to-WI injection, chat-tag simulation, import/export. Namespace
  `window.KLITE_RPMod_Worlds`. Self-contained; only needs host globals.
- `KLITE-RPmod_WorldsUI.js` — Worlds node-graph editor overlay + floating runtime panel
  + navbar button. Namespace `window.KLITE_RPMod_WorldsUI`. Depends on
  `window.KLITE_RPMod_Worlds`.

### Build & output
- `build_KLITE-RPmod.js` — the build script (concatenator).
- `KLITE-RPmod.js` — **GENERATED** single-file usermod. Do NOT hand-edit; it is
  overwritten on every build.

### Docs
- `AGENTS.md` — this file (developer guide).
- `USER_GUIDE.md` — end-user documentation, incl. in-chat Worlds commands. Sketches in
  `docs/`.

### Host reference (read-only)
- `Esobold Esolite a fork of KoboldAI Lite newest/` — the current Esolite host. Mostly a
  monolithic `index.html` (all Lite code + inline JS); some Esolite-specific extensions
  live in `static/js/` and are included near the end of `index.html`.
  - `static/js/characterManager.js` — Esolite's data-manager backend; most relevant host
    file for integration.
- `BackupData/` — archived / superseded material (old Esolite build, prior specs, old
  docs, previous file versions). Not part of the build.

---

## Build & Packaging

Esolite's mod manager imports exactly **one** JavaScript file, so everything ships as the
single combined usermod `KLITE-RPmod.js`, generated from the source modules.

**Build command** (run from the repo root after editing any source module):

```
node build_KLITE-RPmod.js
```

**What it does:** reads the modules listed in the `MODULES` array of
`build_KLITE-RPmod.js`, wraps each in its own `try { … } catch` block (so one module's
runtime error can't stop the others), and writes `KLITE-RPmod.js` with banner comments.

**Load order** (as concatenated):
1. `KLITE-RPmod_ALPHA.js`   — main core (`window.KLITE_RPMod`)
2. `KLITE-RPmod_GuidedRP.js` — onboarding (`window.KLITE_RPMod_GuidedRP`)
3. `KLITE-RPmod_Worlds.js`   — Worlds engine (must precede its UI)
4. `KLITE-RPmod_WorldsUI.js` — Worlds editor UI

**Why concatenation is safe:** each source is a self-contained IIFE with no top-level
`return`, so combining them into one `new Function` body (how Esolite runs usermods) is
scope-safe. Cross-module references always go through `window.*`, never bare identifiers.

**Add/remove a module** (e.g. to drop GuidedRP): edit the `MODULES` array and rebuild —
no other changes needed.

**Workflow:** edit a source module → `node build_KLITE-RPmod.js` → load/refresh
`KLITE-RPmod.js` in Esolite. Never edit `KLITE-RPmod.js` directly.

**Sanity checks:** `node --check KLITE-RPmod.js`. The Worlds modules are unit/smoke
testable in Node (and jsdom for the UI) by stubbing host globals — see
[Testing](#testing).

---

## Worlds system (developer notes)

The Worlds system replaces classic keyword-triggered lore with a **graph/state model**
(Locations, NPCs, Factions, Objects, Events + a Timeline and per-story runtime state) and
supplies the AI only the slice relevant to the player's current location/time.

**Injection = "compile-to-WI".** Each turn the engine computes an active slice and writes
it into the host's `current_wi` as `constant:true` entries tagged `wigroup:'__worlds__'`,
letting Esolite's own prepare/submit engine inject them (inheriting its size cap, context
meter, and insert-location). Two modes (`config.injectMode`):
- `transient` (default) — inject before a generation, remove right after. Safe cleanup
  only when the submit chain is synchronous (websearch off); when websearch runs async the
  entries are kept for that one turn.
- `persistent` — keep the managed entries live in `current_wi` while enabled.
Entries are **always** stripped from every savefile, so a saved story's `worldinfo` never
contains `__worlds__` entries.

**Host-hook constraints (important):**
- `submit_generation` is a host `const` — deliberately NOT overridable by usermods
  (`index.html` comment near the declarations). Do not try to wrap it. Hook
  `prepare_submit_generation` instead (a `window` function; all UI generation paths route
  through it).
- Host global kinds: `current_wi` / `gametext_arr` are `var` (on `window`, overridable).
  `generate_savefile` / `kai_json_load` / `prepare_submit_generation` / `update_wi` are
  `function` declarations (on `window`, wrappable). This is why the main mod already wraps
  those successfully.

**Persistence:**
- Per-story Worlds runtime state rides in the host savefile object under the key
  `rpmod_worlds` (the engine wraps `generate_savefile`/`kai_json_load`). Additive only —
  it never touches `worldinfo`.
- The static world library persists in IndexedDB under `KLITE_WORLDS_LIBRARY`.

**RPG engine (extends the Worlds foundation — all in `KLITE-RPmod_Worlds.js`):**
- **Two-slot runtime.** `runtime = { active, base, working }`; every per-story read/write
  goes through `rt()` (the active snapshot). Ops: `resetToBase`/`commitToBase`/`swapActive`.
  Old flat saves are migrated by `toRuntimeContainer()`. `API.runtime` returns the *active
  snapshot* (back-compat); `API.runtimeSlots`/`activeSlot` expose the container.
- **Persons = characters.** An `npc` may carry `characterRef` into `KLITE_RPMod.characters`
  (+ world overlay) and an optional d20 `stats` block; export embeds a `characterSnapshot`.
- **Quests** are a node type (`world.quests`): giver/turn-in persons (`!`/`?` markers),
  `hidden`/`hiddenDescription` gated by per-world `ruleset.aiMode` (`gm` vs `player`) +
  runtime `discovered`. State machine in the snapshot (`questState`, `activeQuestId`).
- **Trigger bus.** `fireTriggers(signal)` — bounded, loop-safe cascade. Events have
  `triggers[]` (onTurn/onTime/onEnterLocation/onFlag/onQuestState/onEvent/onAction/manual)
  + `conditions[]` + `effects[]`; `applyEffect` returns cascade signals so effects chain.
  Fired at generation (`'turn'`) and from discrete mutations (moveTo/setClock/setFlag/
  setQuestState) and the `<action>` tag. Events fired this turn inject via `firedEventsBuffer`
  (reset each generation); trigger-less/`onTurn` events are ambient via `eventActive`.
- **Combat** (SRD 5.1, CC-BY): deterministic dice (`rollExpr`/`rollD20`) + encounter state
  in the snapshot (`combat`): initiative, HP, turns. `startEncounter`/`attack`/`nextTurn`/
  `check`/`damage`/`heal`; injected as a high-priority `Combat` slice section; driven by UI
  or the `<attack>`/`<roll>`/`<hp>`/`<check>` tags. SRD monster presets in `SRD_TEMPLATES`.
- **Graph edges added:** faction→location (`hq`), quest→person (`gives`/`turnin`), plus
  derived chain edges (`onenter`/`onquest`/`affects`/`chains`) for visualising wiring.

**Editor (`KLITE-RPmod_WorldsUI.js`).** Full-screen overlay (same pattern as Esolite's
`TreeViewer`): node-graph canvas with pan/zoom, a palette, an inspector, and typed
auto-inferred edges. Drawing an arrow calls `KLITE_RPMod_Worlds.connect(a,b)`, which
infers the relationship from the two node types and writes the matching id-field — so the
graph *is* the retrieval data. All rendering uses `createElement`/`textContent` (no
`innerHTML` with user content).

**In-chat commands** (the AI or player can emit these; parsed each turn): `<move>`,
`<npcmove>`, `<mood>`, `<flag>`/`<unflag>`, `<give>`/`<take>`, `<quest>`, `<time>`,
`<weather>`, `<advance>`. Full reference and examples in `USER_GUIDE.md`.

---

## Guided RP (developer notes)

`KLITE-RPmod_GuidedRP.js` is a beginner onboarding overlay: an 8-step interactive setup
(provider config → persona → character import → writing style → greeting → play) that
turns the full Esolite UI into an "Easy mode" journey, with an Advanced toggle back to the
full interface. Vanilla JS, CSS grid/flexbox, `localStorage` for progress, and
`IntersectionObserver` for scroll tracking. It runs independently of the ALPHA core
(separate `window.KLITE_RPMod_GuidedRP` namespace) and can be dropped from the bundle
without affecting the rest.

---

## Security & sanitization

Character/world data is untrusted. To prevent execution of embedded HTML/JS and silent
network requests:

- **Escape everything user/character/world-sourced** before rendering. Use
  `KLITE_RPMod.escapeHtml(...)` (or the panel-local escaper). Applies to names, creators,
  tags, descriptions, personalities, scenarios, notes, example messages, system/jailbreak
  prompts, greetings, WorldInfo entries/keys, and all Worlds node fields. Prefer
  `textContent` over `innerHTML` for plain text; the Worlds editor builds DOM via
  `createElement`/`textContent`.
- **Images don't auto-load.** Route external images through
  `KLITE_RPMod.safeImageHTML(url, alt, style)`: `data:`/`blob:` auto-load; `http(s)` shows
  a placeholder + "Load image" button (`referrerpolicy="no-referrer"`).
- **Links** from user/character content get `rel="noopener noreferrer"`; consider a
  confirmation before navigation.
- Keep this model consistent across all panels and any new UI. When in doubt, escape first.

---

## Testing

- `node --check <file>` for syntax on every source and the bundle.
- Engine/graph/import logic: run in plain Node by stubbing host globals — minimum set:
  `current_wi`, `gametext_arr`, `generate_savefile`, `kai_json_load`,
  `prepare_submit_generation`, `update_wi` (and `localStorage`).
- Editor UI: jsdom, loading with `url: 'http://localhost/'` (so `localStorage` works) and
  stubbing `getBoundingClientRect` for SVG. Dispatch a `load` event and wait for the
  module's readiness poller.
- Always verify save-safety: a Worlds-off save round-trips byte-identical; no `__worlds__`
  entries ever appear in a saved `worldinfo`.

---

## Debugging (topic-based)

Fine-grained logs without modifying the host. Console helpers persist via localStorage:
- `KLITE_RPDebug.on('chat,storage,worlds')` / `.off('network')` / `.all()` / `.none()` /
  `.list()`
- Or set `localStorage['KLITE.debug.topics']` directly.

Topics include: `essential`, `chat`, `narrator`, `storage`, `network`, `esolite`,
`worlds`, `panels`, `group`, `avatars`, `chars`, `generation`, `state`, `hooks`, `ui`,
`mobile`, `integration`, `hotkeys`, `status`.

Instrumented paths include the Esolite submit flow (`prepare_submit_generation`,
`submit_generation`), the message sender, the narrator, storage
(`saveToLiteStorage`/`indexeddb_save`/`load`), key globals (`current_memory`,
`current_wi`, `pending_context_*`), the `gametext_arr` operations, and a `fetch` wrapper
(URL + light body preview, headers redacted).
