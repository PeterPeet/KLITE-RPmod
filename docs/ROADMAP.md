# Roadmap

> The plan for turning KLITE RPmod into the product described in
> [USERSTORY.md](USERSTORY.md). **Keep this file current:** after each phase (or any
> significant change) update the status markers and the "Current state" section, so work
> can resume without any chat history.
>
> Status: ⬜ not started · 🟨 in progress · ✅ done · ⏸ deferred
> Last updated: 2026-09-25 (R6 done: chat power features)

## Current state

**Now: features.** Done 2026-09-25: R1 cleanup steps 1–3 (step 4, top-bar icons / known issue 6,
is a check for the next browser session) and the R2 carry-overs (known issues 4 and 15). R5 is done
(✅ 2026-09-25: spells in the Combat window, companions' HP, Long rest, the Encounter node), and
R3 too (✅ 2026-09-25: the SRD 5.2.1 Compendium). The R4 extras are done too (2026-09-25: `<take>` semantics, faction phases, kill reputation, repeatable/daily quests, quest-giver dialogue, vendors/shops). R6 is done too (2026-09-25). The real-backend play
test (known issue 5) is postponed (owner, 2026-09-25). R7 is done (✅ 2026-09-25, acceptance passed).
R7 steps 1 (location kinds + dungeon/town editor), 2 (mini-map, moving room by room, AI context,
issue 12), 3 (AI map tags, fog, doors, Search checks), 4 (dungeon/town generator) and 5 (zone
combat: zones of the room, moving/fleeing, cover, hiding, Guide tab) are done.
Done since R1: R2 characters (✅ 2026-09-25), R5 combat (✅ 2026-09-25), R4 quests & world (✅), R7 world map (✅ 2026-09-25), R3 compendium
(✅ 2026-09-25), R6 chat power features (✅ 2026-09-25: slash commands, quick replies, hidden tags, lorebook
round trip; design `docs/design/R6-chat-power.md`). All phases R1–R7 are done; next: the real-backend play test
(known issue 5) and the open items below.

Baseline tag: **`worlds-baseline-2026-07`** (commit `99d4370`, 2026-07-08).
Supported host: **current Esobold** (esolithe/esobold `remoteManagement`), run from the local
clone `../esobold` via `npm run build:host` (2026-09-24; ARCHITECTURE §2). The mod is not
public, so it may rely on our unmerged Esobold PRs. The repo's Esolite 1.35.0 copy was
removed (git history; 1.32.0 is archived in `BackupData/`). Esobold has mod hooks
contributed by RPmod — Quick Start (esolithe/esobold#65, merged), settings tabs (#66) and a
top-bar Guide with mod tabs (#67, both open); RPmod uses them and keeps fallbacks for hosts
without them (live-checked against a build of #67 and against 1.35.0 on 2026-09-24).
Also open: **#68** — character downloads as V2 cards and two "Upload all" data-loss fixes (found
during R2's SillyTavern round trip; tested with backup/restore cycles in a build of the branch).

### What works (verified headless 2026-09-25 — `npm test`, 333 tests)
- Bundle builds (esbuild, ES-module sources); modules: app shell, context, ALPHA core, Worlds engine, Worlds UI, onboarding.
- **Context owner:** one wrapper/channel for everything RPmod adds to the prompt; persona
  and AI character (Tools tab / group-chat speaker) now actually reach the AI.
- **Worlds engine:** graph world model (locations, NPCs/persons, factions, objects,
  events, quests, lore), compile-to-WI injection (transient/persistent, websearch- and
  agent-mode-safe), per-turn active slice, 16 chat tags, import/export, example world
  ("Eldoria").
- **Two-slot runtime** (base/working) with reset/commit/swap; saved in the story file.
- **Persons** linked to library characters (`KLITE_RPMod.characters`) + optional d20 stats.
- **Quests:** giver/turn-in, yellow `!`/`?` markers, quest log, hidden/discovered,
  per-world `aiMode` (gm/player); repeatable/daily quests, the giver's words (R4 extras).
- **Vendors:** shops on persons, SRD prices, reputation prices, Shop window (R4 extras).
- **Trigger bus:** event triggers/conditions/effects with chains; faction HQs.
- **Combat:** dice, initiative, attack vs AC, HP, checks, 330 SRD 5.2.1 monsters; **zone combat**
  (R7 step 5): positions in zones of the room, moving/fleeing with opportunity attacks, reach and
  range by zone, −3 in melee, cover and hiding, drawn in the Combat window, explained in the Guide.
- **UI (in the app shell):** World tab, Party + Quests sections, Quest log / Combat /
  World editor (node graph) windows; Creator/Player lens.
- **Delivery:** usermod bundle, or `index.rpmod.html` that autoloads the mod after
  Esolite's `load` event; online at https://rp-lite.koboldai.net (released Esobold + RPmod,
  published with `npm run deploy:pages -- --push`; first deploy 2026-09-25).
- **Credits:** the exact SRD 5.2.1 attribution, the Ultimate Dungeon Terrain credit (zone combat idea)
  and Lucide appear in the Guide's **Credits** chapter, the header of `KLITE-RPmod.js` (taken verbatim
  from `src/data/srd52.js` at build time) and USER_GUIDE "Credits"; the SRD text also under every
  Compendium entry and in the Character builder.
- **Chat power (R6):** slash commands through the engine (`/go`, `/buy`, `/accept`, `/check` …, `/help`), quick
  replies with a world-aware Here row, optional hiding of control tags, lorebook round trip (SillyTavern / V3 /
  Esolite WI / Esolite's Library), `/summary` = Esolite's AutoGenerate Memory.
- RP panels (formerly "ALPHA"; split and restyled onto the shell in the R1 cleanup 2026-09-25): CHARS/ROLES/TOOLS/CONTEXT/IMAGES panels, card import
  (V2, partial V3), personas, group chat speaker modes, quick actions, chapters, image gen.

### Gap analysis vs. the user story
✅ done · 🟡 partial · ❌ missing

| From | Feature | Now |
|---|---|---|
| D&D Beyond | Step-by-step character builder | ✅ levels 1–20 with spells (SRD 5.2.1) |
| | Interactive sheet (modifiers, saves, skills, AC) | ✅ click-to-roll, stored in the card |
| | Rules compendium | ✅ Compendium window (R3): 330 monsters, 339 spells, 258 magic items, equipment, 155 rules terms |
| | Encounter builder with difficulty | ✅ SRD XP budget, 330 monsters, saved encounters |
| | Combat tracker | ✅ sides, conditions, death saves, auto enemy turns (spell slots not used in combat) |
| | Click-to-roll + game log | ✅ dice log the AI sees (combat log separate) |
| | Leveling / XP | ✅ level up 1–20; XP from quest rewards and fights is paid to the persona's sheet |
| SillyTavern | Character cards V1/V2/V3 | ✅ V2, 🟡 V3 (ALPHA) |
| | Personas, group chat | ✅ ALPHA |
| | World Info / lorebooks | ✅ Esolite + Worlds graph; round trip SillyTavern / V3 / Esolite (R6 step 4) |
| | Quick replies | ✅ R6 step 2: left dock, editor, world-aware "Here" row |
| | Slash commands | ✅ R6 step 1: `/go`, `/buy`, `/accept`, `/check` … through the engine |
| | RAG, TTS, image gen, summaries | ✅ Esolite's (`/summary`, running memory, TextDB) / RP panels |
| WoW | Marker set incl. grey `!`/`?` | ✅ |
| | Quest log: counters, track, abandon | ✅ |
| | Chains & prerequisites | ✅ level/quest/flag/reputation, item-started |
| | Rewards XP/gold/choose-one | ✅ paid to the persona's sheet |
| | Zones/subzones, hubs, phasing | ✅ |
| | Factions & reputation | ✅ tiers, faction phases, standing lost for defeating members, vendor prices |
| | Vendors, repeatable/daily quests, quest-giver dialogue | ✅ R4 extras (2026-09-25) |
| Map | Places room by room, board, fog, zone combat (no VTT) | ✅ R7: dungeon/town editor, mini-map with fog, moving with door rules, AI map tags, doors/Search checks, seeded generator, zone combat with cover and hiding |

### Known issues / tech debt
1. ~~"Monster / NPC combatant" flag does nothing~~ — decides the combat side since R5 (a monster is
   never an ally; victory = every enemy down).
2. ~~Chat tags remain visible~~ — optional since R6 step 3 (2026-09-25): Settings → RPmod → Display → "Hide control
   tags in the chat" (off by default) removes them from the shown chat; the story keeps them.
3. ~~Worlds panel overlaps ALPHA's right panel~~ — fixed by the shell (2026-09-23).
4. ~~Two systems inject character data~~ — one owner since 2026-09-23 (`src/context/`); the
   remaining double card (Start RP's `<name>_imported_memory` WI + the context's copy) fixed
   2026-09-25, owner's decision: **Esolite's WI carries the card text** (Esolite already picks
   the persona's and the current speaker's entries each turn); the context then adds only the
   d20 sheet. Without such entries the context sends the card as before. Live-checked: the
   captured prompt holds the card once. "Load as scenario" still writes Memory (story data).
5. **Never play-tested with a real AI backend** (only headless + page load).
6. `index.rpmod.html` boots the bundle at `window.load` (later than the usermod path); verify
   top-bar icon layout matches the usermod install.
7. ~~Monster presets are SRD 5.1~~ — replaced by the 330 SRD 5.2.1 monsters (R5, 2026-09-23).
8. ~~ALPHA is a 17.7k-line monolith~~ — split 2026-09-25 (R1 cleanup, step 2) into `src/rpmod/`
   (core, host helpers, templates, styles, RP mode, boot), `src/panels/` (tools, context, scenario,
   roles, chars) and `src/characters/cardEditor.js`, moving code without rewriting it; the
   "ALPHA" name is gone from the code. Still large: `rpmod/core.js` (one object literal, ~4k
   lines) and `panels/chars.js` (~2.5k).
9. ~~`<take>Item</take>` without a count removed the whole stack~~ — decided 2026-09-25 (R4):
   `<take>` without a count removes one, like `<give>` adds one; `<take>Item x all</take>` removes
   the stack. Covered by a test.
10. ~~Six duplicate object keys in ALPHA~~ — removed 2026-09-25 (R1 cleanup, step 1): the dead
    earlier copies of `updateSubmitBtn`, `setMode`, `loadSettings`, `saveSettings`,
    `extractTalkativeness`, `importWorldInfoEntry`; esbuild builds without warnings. Behaviour is
    unchanged (the last copy always won). Two dead copies did more than the live ones: the old
    `setMode` also switched RP formatting on/off and set `inject_chatnames_instruct` for chat/RP
    modes, and the old `extractTalkativeness` also scored lorebook entries and example-dialogue
    length — if either is wanted, it is a new feature (git history has the code). With them went
    69 methods nothing referenced (old overlay UI, an unused "unified save", PNG export helpers,
    character modal extras) — ALPHA 17,494 → 15,018 lines.
11. **Host bug (Esolite 1.35.0, not ours):** the plain `index.html` logs
    `SyntaxError: Identifier 'lastPendingResponse' has already been declared`
    (`static/js/postSubmitHandler.js`). Seen with and without the mod; no visible effect so
    far. Recheck on the next host upgrade.
12. ~~World state changed by AI chat tags reaches the UI only at the next send~~ — fixed in R7
    step 2: tags are parsed when the reply arrives (wrapper around Esolite's
    `handle_incoming_text`); the per-turn clock step stays at generation.
13. ~~The RP panels' inner markup carries many inline styles~~ — moved onto the shell's classes
    and spacing scale 2026-09-25 (R1 cleanup, step 3); a test keeps inline styles out.
14. **Quick Start adapter depends on Esolite internals** (`showQuickStartPopup`,
    `applyQuickStartSelection`, `clearAllQuickStartSelections`, `popupUtils.contentElem`).
    Falls back gracefully (no RPmod section) if they change. Only used on hosts without
    Esolite's mod hooks: Esobold merged the Quick Start hook (esolithe/esobold#65,
    `QuickStartExtension`), which RPmod prefers (2026-09-24). The same holds for RPmod's
    own settings tab (hook: #66) and guide window (hook: #67). Drop the fallbacks once the
    supported host version has the hooks.
15. ~~Two character libraries~~ — decided: Esolite's Library is the master; the RP core's
    `KLITE_RPMod.characters` is a gallery view rebuilt from it (plus RPmod-only rating/
    talkativeness/tag cache in `characters_v3`). Finished 2026-09-25: entries are keyed by the
    **Library id** (extras survive add/delete/rename; old position ids matched by name once;
    saved group participants, persona and AI character relinked), and the 5 s poll is replaced
    by wrapping Esolite's `updateCharacterListFromAll` + `upsertCharacterMetadata` (Esolite has
    no Library events; the poll stays only as a fallback without them). Live-checked: a new
    character shows up in ~50 ms; rename keeps id and rating; delete is picked up.
16. **Esolite 1.35 Library internals used by RPmod** (`resolveCharacterNameAndId`,
    `upsertCharacterMetadata`, `updateCharacterListFromAll`, `findCharacterMetaByName`,
    `getNextAutoincrementName`, `STORAGE_PREFIX`, `allCharacterNames`; the two list functions are also
    wrapped for syncing, issue 15): recheck on every host upgrade; a small official save/delete API
    with a "Library changed" event would be a good next proposal to Jaxxks.
17. ~~Combat HP and sheet HP are separate~~ — the fight starts at the persona sheet's current HP
    and writes HP/XP back (R5, owner's decision). Companions keep their HP too since 2026-09-25
    (their sheet, else the story's `partyHp`); the Long rest restores it.
18. ~~Flaky test seen once (2026-09-23)~~: "Combat window: build an encounter…" failed in one full
    run and passed in ~10 runs since; the failure text was not captured. Full-run output is now
    kept while developing; investigate if it shows up again. **Seen again 2026-09-24** (one full run
   during R7 step 3; passed in 6 isolated runs and the next full run; the failure text was again not
   captured — keep the full `npm test` output next time it fails).
   **Fixed 2026-09-25 (root cause found):** the failure was "Cannot read properties of null" —
   the Combat window had vanished. A second `load` event started WorldsUI again; registering its
   views a second time force-closed the open window (`registerView` of an existing id unregisters
   it). Reproduced under parallel load with a removal trace. Every module's load-time start now
   runs once (`{ once: true }`, plus run-once guards in the Worlds engine and WorldsUI); test
   "startup runs once" in `tests/rpmodPanels.test.js` fails without the fix.
19. ~~Worlds created right after page load could overwrite the stored worlds~~ — fixed 2026-09-25
    (found during the R7 acceptance check): the Worlds API exists before the library has loaded
    from IndexedDB, so an early "New world" / "Load example" saved a library without the stored
    worlds. Saves now wait for the load, the load keeps worlds created meanwhile, and a library
    that cannot be read is copied to `KLITE_WORLDS_LIBRARY_corrupt_<time>` before anything is saved
    over it. Tests in `tests/engine.test.js` ("library: …"). Whether this caused the example world
    to disappear from the test browser is unknown (another chat also used that browser).
20. **Two speaker choices in group chat** (found 2026-09-25 in the live check of issue 4): the
    Roles tab keeps its own "Next" speaker (speaker modes, round robin, talkativeness), but a
    normal chat submit lets Esolite's group chat pick the speaker itself (seen: Roles "Next:
    Borin", Esolite answered as Aria). They agree only when the turn is started with **Trigger
    Speaker**, which sets Esolite's opponent. The per-turn context follows the Roles choice, so on
    a normal submit the sheet it adds can belong to a different character than the one speaking.
    Decide: let Roles set Esolite's speaker on every submit, or follow Esolite's choice.

## Phases

Each phase ends **playable and tested**: `npm test` green, `ROADMAP.md` updated, commit.

### R0 — Foundation ✅ (2026-09-23)
Goal: restart on a clean, documented, tested base without changing behavior.
- [x] Baseline tag `worlds-baseline-2026-07`.
- [x] Repo cleanup: single host reference (`Esobold Esolite a fork of KoboldAI Lite very
      newest/`); older host copy + `klite.embd` + old `AGENTS.md` → `BackupData/`; guide
      exports → `docs/exports/`; generated files untracked + `.gitignore`.
- [x] Sources in `src/`, build scripts in `scripts/`, `package.json` with npm scripts.
- [x] Test suite in `tests/` (Node test runner + jsdom): syntax, engine, quests, triggers,
      combat, UI, bundle — 28 tests at R0, ~1.5 s.
- [x] Docs: `CLAUDE.md` (replaces outdated `AGENTS.md`), `docs/USERSTORY.md`,
      `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`.
Acceptance: `npm run build` produces an identical-behaving bundle; `npm test` green;
no functional change. ✔

### R1 — App shell + design system ✅ (2026-09-23)
Goal: one coherent application inside Esolite instead of three overlapping UIs.
- [x] Convert sources to ES modules bundled with **esbuild** into the same single file
      (2026-09-23). Sloppy-mode audit: nothing to fix — all four sources already ran as
      `'use strict'` IIFEs with no code outside them. Live-checked in `index.rpmod.html`.
- [x] Host upgraded to Esolite RMv1.35.0; Worlds no longer treats Esolite's new slash
      commands as game turns (test).
- [x] Shell layout decided with the owner (2026-09-23): **two docked sidebars** (left:
      party/character + quest tracker; right: tabbed tools) around Esolite's chat;
      bigger views (sheet, quest log, compendium, combat, editor, map) as **floating
      windows** (drag, resize, several open, positions remembered); **neutral style
      matching Esolite** (bind to its `--theme_color_*` variables); GuidedRP becomes a
      **first-run "start a session" flow** inside the shell.
- [x] Shell skeleton (2026-09-23, `src/shell/`): left/right docks (docked ⇄ overlay ⇄
      compact), view registry, floating window manager, layout persistence, `--rpm-*`
      design tokens bound to Esolite's theme, single top-bar button. Live-checked in
      Esolite 1.35 at 1440×900 and 375×812, dark theme + simulated light theme.
- [x] Worlds migrated: World tab (right), Party + Quests tracker (left), Quest log + Combat
      windows; views refresh on the engine's new `klite:worlds-change` event. Old floating
      `#wm-panel` and 🌐 navbar button removed.
- [x] ALPHA's right panel adopted as the **Characters** tab (no more overlap — known
      issue 3 fixed).
- [x] **Unified look (2026-09-23):** shell, Worlds views, Worlds editor, ALPHA panels and
      modals, GuidedRP variables all use Esolite's theme variables and native control
      classes (`btn-primary`, `form-control`, `nav-link`); RPmod's semantic colours are
      `--theme_color_rpmod_*` and show up in Esolite's theme editor. ALPHA's sub-tabs are
      shell tabs (Chars/Roles/Scenario/Tools). Live-checked in "Default (Cedo)", "Tako"
      and "Light Sand". Test guard against duplicate function names added.
- [x] **Onboarding (2026-09-23):** builds on Esolite's **Quick Start** (Jaxxks) instead of a
      wizard — RPmod adds an "RPmod world" section (adapter now; official hook proposed in
      `docs/proposals/quick-start-extensions.md`). New **RPmod Guide** window (11 chapters, 12 since R2,
      "Show me" highlights), "New here?" card and `?` button. **GuidedRP retired** (source in
      `BackupData/legacy/`, `guided_rp` save blocks preserved). Live-checked in Esolite.
- [x] **Esolite mod hooks (2026-09-24):** contributed upstream and adopted — Quick Start
      section via `QuickStartExtension` (esolithe/esobold#65, merged), RPmod settings tab via
      `SettingsExtension` (#66), RPmod Guide as a tab of Esolite's new top-bar Guide via
      `GuideExtension` (#67). Each falls back to RPmod's own adapter/tab/window on older
      hosts. Host now = the local Esobold clone: `npm run build:host` / `build:index` /
      `serve`; the 1.35.0 copy is removed from the repo.
      Two timing-sensitive tests (Combat window, reputation Quest log) now wait for their
      window instead of a fixed delay.
- [x] Test runner guard: `npm test` fails if fewer tests ran than `tests/.test-count`
      (a test file had been ending early without any failure).
- [x] **World editor is a shell window** (2026-09-23): the full-screen `#wm-overlay` is
      gone; view `editor` opens large (`window.large`), edge to edge (`flush`), is not
      restored at startup (`restore:false`) and cleans up via the new `unmount` hook. All
      windows gained **maximize/restore** (button or title-bar double-click, remembered).
      Narrow windows/phones stack palette strip → canvas → inspector. Live-checked in
      Esolite at 1024×768 and 375×812.
- [x] **Single context-injection owner** (2026-09-23): `src/context/context.js`
      (`KLITE_RPMod_Context`) owns the one `prepare_submit_generation` wrapper and the one
      channel (constant WI entries, wigroup `__rpmod__`, transient/persistent, websearch-
      and agent-safe, stripped from saves). Providers: **worlds** (the slice) and
      **characters** (ALPHA persona + AI character / group-chat speaker). A character
      described in full is only listed under Nearby NPCs. Found and removed three ALPHA
      paths that never reached the AI: group-chat text in `pending_context_preinjection`
      (Esolite overwrites it in chat mode and prints it into the reply otherwise), the
      Tools persona/character injection (hooked on the wrong object; would have written
      into the input box) and the panels-only-disabled `chat_submit_generation` wrapper.
      Group-chat triggers run as one context turn (`run`). Known issue 4 resolved.
      Live-checked the hook chain in Esolite (no backend).
- [x] **Character store decided + data-loss bug fixed** (2026-09-23): Esolite's Library is
      the master (USERSTORY decision); ALPHA's gallery is a Chub.ai-style view on it.
      Found that on Esolite 1.35 ALPHA's gallery **edit and import made characters vanish
      from the Library** (it wrote `character_<name>` and id-less list entries, which 1.35's
      `updateCharacterListFromAll` drops; the record stayed in storage). New
      `src/library/esoliteLibrary.js` writes through Esolite's own id-based functions
      (edit keeps id + favorite, rename keeps id, import follows Esolite's `Name_1` rule,
      delete by id) and **recovers orphans** once per load (only id-less, unreferenced
      TavernCard records; waits for Esolite's id migration). Worlds now resolves linked
      characters by name first (gallery ids are list positions) and the editor dropdown
      links by name (the numeric id never matched). Reproduced and verified live.
- [x] **Icon set** (2026-09-23): Lucide (ISC; Feather-derived icons MIT) — dev dependency
      `lucide-static` (1.43.0, the newest version the npm min-release-age policy allowed),
      `npm run icons` copies the used subset into the committed `src/shell/icons.js` with
      the licence as a legal comment (kept in the bundle). Shell chrome, Worlds views,
      editor, Guide and "New here?" use it; ALPHA's emoji stay until its panels migrate.
- [x] Test runner: dropped `--test-force-exit` — on Node 22 it ended a test file part-way
      (exit 0) once that file ran ~1 s, silently dropping tests; the count guard caught it.
      A 180 s timeout replaces it.
- [x] **RPmod settings in Esolite's Settings dialog + world autosave option** (2026-09-23):
      `src/settings/settings.js` adds an **RPmod** tab built like Esobold's own tabs
      (values in `localsettings.rpmod_*`, applied on OK, discarded on Cancel); ALPHA's
      debug/Corpo options moved there from Misc; the obsolete "sidepanel overlays chat" option
      is gone (it could push the chat aside next to the shell). Worlds: **"Autosave world
      edits"** (default off, owner's call); unsaved-change tracking (`Save •`, World-tab card,
      ask on editor close, browser warning on leave), **Revert to saved**. Live-checked.
- **R1 acceptance met** (no overlapping panels, everything reachable from the shell, tests
  green, live-checked). Carried into later phases: ALPHA's code still lives in the
  monolith (known issues 8, 10, 13) — its panels migrate as R2 rebuilds characters.
- **Cleanup of the old panel code (reopened 2026-09-25, owner).** The name "ALPHA" is a legacy
  version label and goes; the code ships in the one usermod file as before (Esobold runs a mod
  as one classic script via `new Function`; esbuild bundles `src/`).
  - [x] Step 1 (2026-09-25): duplicate keys and 69 unreferenced methods removed (issue 10), the
        fallback gallery grid removed; regression tests `tests/rpmodPanels.test.js` (`rpmod` save
        round trip, all panels render); found and fixed on the way: known issue 18 (double
        start-up closed open windows).
  - [x] Step 2 (2026-09-25): split into `src/rpmod/` (index, debug, characterContext, host,
        templates, liteApi, styles, core, rpMode, boot), `src/panels/` (tools, context, scenario,
        roles, chars) and `src/characters/cardEditor.js` — each part an `install…(S)` holding its
        old section unchanged, started in the old order (issue 8). Also removed: the 2,700-line
        overlay stylesheet `STYLES`, never injected (only `STYLES_PANELS_ONLY` is); the syntax
        test's legacy exemption (the new files pass the strict check). The "ALPHA" name is gone
        from code, tests and CLAUDE.md/ARCHITECTURE (kept in history notes); settings block id
        `alpha` → `rp-panels` (a DOM id, no stored data). Bundle 2.64 → 2.40 MB. Not split
        further: the image panel and the character selection modal live inside `core.js`'s
        object literal (moving them would mean rewriting). Live-checked in Esolite: all panels,
        New Character editor, context calculation, dice, gallery, `rpmod` save/load.
  - [x] Step 3 (2026-09-25): the RP panels (Chars incl. detail view and card editor, Roles,
        Scenario, Tools incl. Context and image panels), their two modals and the RPmod block in
        Esolite's settings use the shell's classes and spacing scale (issue 13): ~260 inline styles
        and ~70 style assignments gone; left only where a value comes from data (token-bar widths,
        auto-sender progress, image sizes). `STYLES_PANELS_ONLY` rewritten on `--rpm-*` tokens and
        trimmed to what the shell lacks (sections, modals, character rows, insets, token bar); the
        dead pre-shell rules (fixed panel, handle, own tab bar) and the shell's `!important`
        overrides of them are gone, as are the page-wide `:root` `--bg/--text/…` aliases. New shell
        helpers: `rpm-stack/wrap/fill/grid2/grid4/mt/mb/center/small/empty/check/note/avatar/tag/
        dim/disabled/text-*`, button sizes `rpm-sm`, `rpm-warning`. Also removed: the dead grid
        renderers of the old CHARS gallery (drew into the removed `#char-gallery`) and a no-op
        theme observer. Found and fixed on the way: untrusted names/fields went into HTML
        unescaped (group list, custom-character modal, Scenario fields from cards, lorebook
        "Import to WI", quick actions); `escapeHtml` now also escapes quotes. Visible changes:
        spacing on the 4/8/12 px scale; the token bar's story/quest and "next speaker" colours
        come from the theme's RPmod colours; the "Add Custom Character" modal (previously
        unstyled) has a title bar and padding; the selection modal's filters wrap on phones.
        Compared before/after in the browser (dark and light theme, dock 300/350/520 px, phone
        portrait/landscape). Tests: `tests/rpmodPanels.test.js` (no inline styles or old control
        classes in any panel view or modal, stylesheet on tokens only, names stay text).
  - [ ] Step 4: top-bar icons, usermod install vs `index.rpmod.html` (issue 6).
- App shell: docked sidebars + a window manager for sheet, quest log, compendium, combat,
  editor, map; one entry point in the Esolite top bar.
- Design system: tokens (color, type, spacing) bound to Esolite's theme variables,
  neutral look matching Esolite; icon set (Lucide, ISC) bundled offline.
- Migrate the Worlds panel and editor into the shell; migrate ALPHA panels one by one;
  onboarding on top of Esolite's Quick Start + RPmod Guide (GuidedRP retired).
- **Single context-injection owner** (resolve known issue 4).
Acceptance: no overlapping panels; all existing features reachable from the shell; tests
green; live check in `index.rpmod.html`.

### R2 — Characters (D&D Beyond × SillyTavern) ✅ (2026-09-25)
Rollback point before R2: tag **`r1-complete-2026-09-23`** (R2 started before the first
play test with a real backend, owner's decision 2026-09-23).
- [x] **Step 1 — sheet on the card** (2026-09-23): `src/characters/` — sheet model (SRD 5.2
      rules: modifiers, proficiency by level, saves, 18 skills incl. expertise, initiative,
      passive Perception, attacks, inventory, coins) stored in the card at
      `data.extensions.klite_rpmod.sheet` (older `klite_rpmod` keys such as ratings are kept);
      **Character sheet** window (any Library character; click-to-roll with advantage/
      disadvantage; draft + Save/Revert, optional autosave setting, ask on close; keyboard
      focus kept across re-renders); **dice + game log** `src/game/log.js` (per story, saved
      as `rpmod_log`; AI sees rolls since its last reply); persona/character sheet summary
      in the prompt; Worlds persons linked to a card use its sheet when they have no stat
      block, the player uses the persona sheet. Portrait PNG: old card chunks stripped, V2
      card embedded (Esolite appends chunks and embeds only the inner object — tell
      Jaxxks). Live-checked in Esolite.
- [x] **Character gallery** (2026-09-23, owner: new view, "I want to see my characters",
      big images like wyvern.chat, full screen): `src/characters/gallery.js` — window
      `gallery` (opens maximized, remembers a user-chosen smaller size), Wyvern-style cards
      (2:3 portrait, name/creator/tagline/tags/tokens over a dark gradient, badges You/AI/
      sheet), sizes Large/Medium/Small/List (ALPHA's views), search, sort, tag chips with
      counts, detail page (full card text, rating, actions: play as persona, AI plays, sheet,
      edit via ALPHA's editor, download/favorite via Esolite, delete). Lazy loading of records
      and full images (IntersectionObserver), summary cache `KLITE.gallery.index`. ALPHA's
      selection logic extracted to `TOOLS.usePersona/useCharacter`. Live-checked.
- [x] **SRD 5.2.1 data** (2026-09-23): official PDF downloaded (owner's request) to
      `docs/reference/` (git-ignored); `scripts/extract-srd.py` (pypdf) → `src/data/srd52.js`
      (114 KB): 12 classes (core traits, level 1–3 features, SRD subclass, spell progression,
      standard-array suggestion), 4 backgrounds, 9 species with traits, origin + fighting
      style feats, weapons, armor, XP table, languages, alignments, exact attribution.
- [x] **Character builder + level up (levels 1–3)** (2026-09-23): `builder-rules.js` (pure:
      standard array / point buy / 4d6, background +2/+1 or +1/+1/+1 capped at 20, skills incl.
      Human/Elf/Barbarian/Skilled picks, expertise, fighting styles, HP with fixed per-level
      values and Dwarven Toughness, AC from armor/shield/Unarmored Defense/Draconic Resilience
      /Defense, speed incl. Wood Elf and Unarmored Movement, weapon attacks with finesse and
      proficiency, starting equipment + coins, spellcasting incl. Pact Magic, feature list),
      `builder.js` (7-step window, SRD texts, review, create new Library character or sheet
      on an existing one), sheet: spellcasting section (DC, spell attack roll, slot tracking,
      spells text), proficiencies, AC note, **Level up**. Choices stored in `sheet.build`.
      Acceptance "build a level-1 character end to end, roll from the sheet, level up" covered
      by tests + live check; "export and re-import as a card": SillyTavern round trip done
      2026-09-24 (below).
- [x] **Party shows the persona; person blurbs from linked cards** (2026-09-23): the Party
      section shows the enabled persona (name, species · class level, HP bar, AC, speed; the
      combat tracker's HP during a fight), "Choose in gallery" without a persona and **Build**
      when its card has no sheet; it follows persona changes (`klite:persona-change`) and
      sheet saves. A Worlds person linked to a card and without its own text now gets a short
      blurb from the card (personality, else description) — before, the link only worked when
      ALPHA's gallery happened to hold the text. Card edits refresh it (`klite:library-change`).
      Worlds' player sheet now follows the *enabled* persona (as the AI context already did).
      Live-checked in Esolite.
- [x] **ALPHA's Chars tab → gallery** (2026-09-23): the tab keeps import (drop zone), backup
      and ALPHA's card editor (**New Character**, the gallery's **Edit**) and lists the Library's
      characters (favorites first) as shortcuts into the gallery; ALPHA's second gallery grid is
      no longer shown (its code stays as a fallback until ALPHA's CHARS code is removed). The
      gallery gained **Import** (Esolite's importer) and refreshes on Library writes. Live-checked.
- [x] **Exported card = complete V2** (2026-09-23): the card embedded in the portrait PNG fills
      every field the V2 spec requires (empty values; builder/editor cards lacked several) and
      leaves out ALPHA's WI-group *name* stored in `character_book` (the spec wants a lorebook
      object). The stored record is unchanged. (SillyTavern round trip and the portrait-less
      download: see below.)
- [x] **Levels 4–20** (2026-09-23): `extract-srd.py` now parses the 12 class tables (features,
      class resources, spell slots per level 1–20; level 1–3 results asserted against the old
      hand-checked values), all class/subclass feature levels and the 7 Epic Boon feats.
      Builder: start at any level, **Feats** step at Ability Score Improvement / Epic Boon levels
      (ASI +2 or +1/+1 max 20, Grappler, origin feats, fighting styles, boons max 30, with
      prerequisites and "already have it" checks), expertise at Rogue 6 / Bard 9 / Ranger 9,
      Champion's second fighting style, capstones, extra saves, movement, class resources on the
      sheet. Fixes found on the way: **Draconic Resilience HP** was missing (sorcerer 3+);
      **level up dropped the spells** written on the sheet (now kept, with used slots); level up
      computed AC/attacks from the starting equipment instead of the current inventory.
      Not modelled then (text only): Alert's initiative bonus, Jack of All Trades, Cleric/Druid
      order choices, Magic Initiate spells — all done since (spells and small rules, below). Live-checked.
- [x] **SillyTavern round trip** (2026-09-24, owner, SillyTavern; test card from
      `scripts/roundtrip-card.js make`, returned files checked with `… check`): RPmod's PNG comes back
      from SillyTavern as a **V3** card (`chara` + `ccv3`, same data) with **every field, the
      lorebook, an unknown extension and the RPmod sheet intact** — also after editing the card
      in SillyTavern (only line endings become CRLF). SillyTavern's edited V3 PNG imported back
      through Esolite's real importer (`managerUploadHandler`) keeps the sheet: RPmod reads it
      (live check). The **bare inner JSON** Esolite downloads for a character without a portrait
      is read as V1 and loses system prompt, post-history instructions, version, alternate
      greetings, lorebook and all extensions (the sheet) — so RPmod's gallery **Download** now
      writes a complete V2 JSON for such characters. Upstream fix for Esolite's own Library download
      (and two existing "Upload all" data-loss bugs found while testing it: a name race and old
      archives' empty-description characters): **esolithe/esobold#68** (open). Fixtures `tests/fixtures/sillytavern/`, test
      `tests/roundtrip.test.js`. **R2 acceptance met** except spells.
- [x] **Spells** (2026-09-25; SRD spell data pulled forward from R3 like the monsters):
      `extract-srd.py` → `src/data/srd52-spells.js` — **339 spells** (level, school, classes,
      casting time, range, components/material, duration, concentration, ritual, text, higher-level
      and cantrip-upgrade notes, best-effort attack/save/damage/heal; the summoned creatures' stat
      blocks attached to Animate Objects, Find Steed, Giant Insect, Summon Dragon). Checked against the
      eight class spell lists; SRD inconsistencies are reported (Flaming Sphere's school, Mind Spike
      and Phantasmal Force missing from lists — the spell's own header wins). `SPELL_GRANTS`: species
      spells (elf lineages, gnome lineages, tiefling legacies + Thaumaturgy) and the SRD subclass
      spells (Life Domain, Circle of the Land by land type, Oath of Devotion, Draconic, Fiend),
      transcribed and checked against the text. Rules `src/characters/spell-rules.js` (limits from the
      class table incl. pact magic and the wizard's spellbook 6 + 2/level, always-prepared spells,
      **Magic Initiate** from Acolyte/Sage/human origin feat/ASI feats with a different list each
      time, blocking errors for too many/invalid spells, non-blocking reminders, cantrip scaling,
      slot choice). Builder: **Spells** step (also at level up; optional, "choose later on the
      sheet"), species spell ability, land type. Sheet: spells by level with text, Hit/Dmg/Heal,
      save DC, **Cast** (lowest free slot, logged for the AI), free casts (once or PB per Long Rest),
      restore slots, **Change spells** (kept in `build.spells` for level up); the AI summary lists the
      spells. Sheet fields additive (`cantripsKnown, preparedSpells, spellbook, granted, freeUsed`;
      unknown spellcasting fields are now kept). Shared picker `spellPicker.js`. Tests
      `tests/spells.test.js`. Live-checked in Esolite (Life Domain cleric 3 with Magic Initiate).
- [x] **Small rules** (2026-09-25): **Alert** (from the human origin feat, the Criminal background
      or a feat level) adds the Proficiency Bonus to Initiative — on the sheet and in combat
      (`toCombatStats`); **Jack of All Trades** (Bard 2+) adds half the PB to skill checks without
      proficiency (and passive Perception); **Divine Order** (Cleric 1: Protector — Martial weapons +
      Heavy armor training; Thaumaturge — one extra cantrip + WIS modifier, min +1, on Arcana and
      Religion) and **Primal Order** (Druid 1: Magician — extra cantrip + WIS on Arcana and Nature;
      Warden — Martial weapons + Medium armor) are chosen in *Skills & choices* (required, like a
      Fighting Style; an older built sheet asks for it at level up). Sheet field `extras { alert,
      jackOfAllTrades, skillBonus }` (additive; `derive` applies it, so it follows level and scores).
      Tests in `tests/builder.test.js`. Live-checked (order cards with the SRD text).
- **R2 done** — acceptance ("build a level-1 character end to end, roll from the sheet, level up,
  export and re-import as a card without data loss") met, incl. the SillyTavern round trip.
  Carried over (not blocking): casting a spell at a higher level (Cast uses the lowest free slot),
  ritual casting and copying spells into a wizard's spellbook are narrated; spells in the Combat
  window came with R5 (2026-09-25; there a higher slot can be chosen). Done since: the old card code split out of the monolith (known issues 8,
  10) and the character list on Library ids / one copy of a card (known issues 15, 4; 2026-09-25).
- One **Character model** = TavernCard V2/V3 fields + d20 sheet (species, class, level,
  background, abilities, proficiencies, skills, saves, AC, HP, speed, equipment,
  inventory, spells, features). Migration from existing `characterRef` + `stats`.
- Step-by-step **builder** (SRD 5.2 species/classes/backgrounds).
- **Interactive sheet** with click-to-roll → game log.
- **Leveling / XP**; persona = player character; NPC persons use the same model.
Acceptance: build a level-1 character end to end, roll from the sheet, level up, export
and re-import as a card without data loss.

### R3 — Compendium (SRD 5.2) ✅ (2026-09-25)
- [x] **Data** (2026-09-25): `scripts/extract-srd.py compendium` → `src/data/srd52-compendium.js`
      (~315 KB): the **Rules Glossary** (155 entries with their tags: conditions, actions, areas of
      effect, attitudes, hazards), **Magic Items A–Z** (258: category, rarity, attunement, text) and
      **tools + adventuring gear** (105: cost, weight, ability, text); monsters, spells, weapons and
      armor were already bundled. SRD 5.1 presets were replaced in R5 (known issue 7).
- [x] **Compendium window** (2026-09-25): search over all 1,237 entries (names, summaries, full
      text), kind chips, entry views (monster stat block, spell, item, equipment, rule), monsters →
      **Add** to a saved encounter / **Fight it now**; the exact SRD attribution under every entry;
      one column with Back on narrow windows and phones. Cross-links from spell texts (sheet,
      builder), the Combat window's monster list and the encounter inspector.
      Tests `tests/compendium.test.js`; live-checked (desktop and phone).
- **R3 done** — acceptance ("search any SRD monster/spell, open it, add a monster to an encounter")
  met. Carried over: links from the chat (e.g. a `/lookup` command — R6 slash commands).
Acceptance: search any SRD monster/spell, open it, add a monster to an encounter.

### R4 — Quests & world (WoW) ✅ (2026-09-23)
Owner's decision (2026-09-23): **one inventory — the persona's sheet.** Quest rewards,
`<give>`/`<take>` and "collect" objectives use the persona's card; the story inventory is only
the fallback without a persona (items stay with the character across stories; resetting the
world's state slots does not take them back).
- [x] **Step 1 — rewards, abandon, one inventory** (2026-09-23): `src/game/quest-rules.js` (pure:
      rewards, objectives, prerequisites, reputation tiers, phases); turn-in pays XP, gold, items,
      reputation and "choose one of N" once (`rewardsPaid`), to the persona's sheet via the new
      `updateSheet` (applied at once, saved in the background; an unsaved sheet draft takes the
      game's changes to items/coins/XP/HP so Save cannot undo a reward); abandon; quest events in
      the game log (the AI narrates them); Quest log shows rewards with a picker; World tab
      shows the character's inventory, gold and XP.
- [x] **Step 2 — objectives with counters** (2026-09-23): kinds manual / kill (monster or person;
      counts every defeat in a fight) / collect (follows the inventory; handed over on turn-in) /
      talk (the person is here and named in a message, or `<talk>Name</talk>`) / visit (standing
      there; a zone counts its places). All done → "ready to turn in"; a collect objective lost
      again → back to active. Quest log (tick manual objectives) and tracker show counters;
      editor adds objectives by kind with target and count. Item stacks merge singular/plural.
- [x] **Step 3 — prerequisites, chains, item-started quests, marker set** (2026-09-23): level,
      earlier quests (turned in), flags, reputation tier; linking quest → quest in the editor makes
      a chain ("unlocks" edge). Accept refuses (with the reason in the log); the player sees a
      level-locked quest greyed, other locked quests not at all. Markers: yellow ? (turn in here)
      > yellow ! > grey ? (in progress) > grey ! (level too low) — editor badges grey; the AI only
      hears the yellow ones. `startItem`: the quest appears (and is announced) once the item is
      held. Quest editor: "Requires" (level, quests, flags, reputation) and starting item.
- [x] **Step 4 — factions & reputation** (2026-09-23): standing per faction in the story
      (`rt().reputation`, start value `faction.startReputation`), our own tier scale Hated (< −1000)
      · Hostile · Unfriendly (−300) · Neutral · Friendly (100) · Honored (500) · Revered (1200) ·
      Exalted (2500). Changed by quest rewards (`rep <faction> +N`), the event effect
      *reputation*, the tag `<rep>Faction=+N</rep>` and the creator's ±50 buttons; trigger
      *onReputation* (tier reached: above Neutral "or better", below "or worse") and condition fields `rep.<id>` /
      `tier.<id>`. Effects: the AI gets a Reputation section (tier + what it means) and each
      faction member's attitude; members of Hostile/Hated factions are "hostile to the player".
      Vendors/prices are narrated (no shop system yet). Quest log lists the standings with bars.
- [x] **Step 5 — zones, hubs, phasing** (2026-09-23): `location.parentId` (zones, no cycles),
      `hub`; phases on locations and persons (name/description/atmosphere/mood/location/gone)
      chosen by conditions; readable condition kinds (flag / quest / reputation / time /
      location) for phases and — new — event conditions in the editor; "Part of", "Places within",
      zone among the exits; dashed zone/unlocks edges.
- [x] **Step 6 — example world + acceptance** (2026-09-23): Eldoria now has a zone (Brookvale)
      with a hub village, a chain (The Missing Merchant → Bandit Bounty) with visit/talk/kill
      objectives, every reward type, reputation changes (Royal Guard up, Red Hand down), a saved
      encounter (Red Hand ambush) and phases after the bounty (Abandoned Camp, celebrating
      village, Kell gone, Rowan relaxed). Acceptance "play the example world's quest chain start
      to finish with rewards, a phased location and a reputation change" = test
      `acceptance: the example chain…` + live check in Esolite.
      Found on the way: the persona now wins over a world's default player stats in combat;
      combat's HP/XP write-back raced with quest rewards (now one queue); "Load example world"
      no longer overwrites a saved (maybe edited) example — it adds "Eldoria (Example 2)"; the
      example tavern was renamed "The Crooked Kettle" (it carried another work's inn name).
- **R4 extras** (started 2026-09-25, worked through autonomously while the owner was away;
  decisions below are the recommended defaults and can be revisited):
  - [x] **`<take>` semantics** (known issue 9): without a count it removes one; `x all` the stack.
  - [x] **Faction phases**: name, description, headquarters (moved / none) and *disbanded*
        (not in the AI's Reputation section; the standing is kept). Example: after the bounty the
        Red Hand is *Scattered* and has no headquarters.
  - [x] **Reputation from defeating faction members**: a person of the faction, or a monster of
        a saved encounter linked to the faction (new link encounter → faction), changes the
        standing by the faction's *killReputation* (default −25, 0 = off). Decision: no automatic
        gain with rival factions (events with *onReputation* can do that).
  - [x] **Repeatable/daily quests**: `repeat` = repeatable (again right after turn-in) or daily
        (again on a later in-game day); rewards pay each time; chains and "turned in" conditions
        count the first turn-in. Example: Captain Rowan's daily *Road Patrol*.
  - [x] **Quest-giver dialogue**: the giver's words on offering / in progress / on turn-in;
        Quest log shows them, the AI gets a *Quest givers here* section and the new tags
        `<accept>quest</accept>` / `<turnin>quest</turnin>` (through the rules; a choose-one
        reward stays with the Quest log).
  - [x] **Vendors/shops**: a person with a shop (editor: wares, price — empty = SRD 5.2.1 list
        price —, daily stock, buys or not, a note); Shop window where the player stands; prices ×
        reputation factor of the vendor's faction (Friendly −5 % … Exalted −20 %, Unfriendly
        +25 %, Hostile: no trade — our own numbers); the vendor buys at half price; the purse is
        the persona's coins (small coins first, change back); tags `<buy>`/`<sell>`; AI section
        *Trade*. SRD weapon and armor costs added to `srd52.js` (extractor checks them against
        the PDF) and shown in the Compendium. Example: Innkeeper Bram, Quartermaster Wren.
        Decisions: sell price is not changed by reputation; no buy-back list; stock refills daily.
  Tests `tests/r4extras.test.js` (+ Compendium costs); live-checked in Esolite (Shop window,
  buying, the vendor editor).
- Full marker set (yellow/grey `!`, yellow/grey `?`).
- Prerequisites (level, previous quest, flag, reputation); chains; item-started quests.
- Objective types with counters (kill/collect/talk/visit), auto-progress from tags/events.
- **Rewards paid out** on turn-in (XP, gold, items, choose-one-of-N); abandon.
- Zones/subzones (location hierarchy), hub flag, **phasing** (location/NPC variants by state).
- Faction **reputation** tiers (Hated → Exalted) with effects.
Acceptance: play the example world's quest chain start to finish with rewards, a phased
location and a reputation change.

### R5 — Encounters & combat (D&D Beyond) ✅ (2026-09-25)
Started before R3 (owner, 2026-09-23: "so I can already play"); R3's monster *data* was pulled
forward, the compendium window stays in R3. Owner's decisions: the mod rolls monster turns and
the AI narrates; HP and XP are written back to the persona sheet; all SRD monsters bundled.
- [x] **Step 1 — data + engine** (2026-09-23): 330 SRD 5.2.1 monsters (`src/data/srd52-monsters.js`,
      parsed stat blocks incl. attacks and saving-throw actions), 15 conditions, XP budget table;
      `src/game/combat-rules.js` (pure); Worlds combat v2: monster instances, sides, victory/
      defeat, death saves, conditions with attack effects and durations, automatic monster
      turns, saving-throw actions, saved encounters per world, `<encounter>` tag and trigger
      effect, combat events in the game log, persona HP/XP write-back. SRD 5.1 presets replaced
      (known issue 7), `isMonster` now decides sides (known issue 1), combat HP = sheet HP
      (known issue 17).
- [x] **Step 2 — Combat window** (2026-09-23): encounter builder (XP meter Low/Moderate/High for
      the party, monster search by name/type/CR, counts, persons as enemies/allies, saved
      encounters), fight view (party/enemies with HP, AC, conditions, death saves; your turn:
      weapon, target, advantage → Attack → End turn runs the enemies), tools (damage/heal,
      conditions with rounds, monster save actions), outcome banner. Setting "Run enemy turns
      automatically" (default on). AI: "Starting a fight" hint + `<encounter>` tag; event effect
      *encounter* in the editor. Combat log lines state the cause before the result. Live-checked
      (a wolf fight to victory in Esolite).
- [x] **Spells in combat + companions' HP** (2026-09-25): the turn panel has **Weapon / Spell**
      for the persona and companions with a sheet: spell, slot level (upcast; free casts), target(s),
      Cast. Rules `spell-rules.js` (`combatUse`, `rangeProfile`, `castDamage/castHealing` with the
      "higher-level slot" text — 51 of 109 spells scale automatically — `dartCount`, `spendSlot`);
      engine `castSpell`: spell attacks like weapon attacks (zones, cover, crits), save spells (one
      damage roll, every target saves, half when the text says so; area spells take several
      targets), healing (+ ability modifier, wakes a dying ally), Magic Missile's darts, everything
      else narrated (slot spent, logged; conditions with the Tools). Zones: the spell's range (Touch
      = same zone), Action vs Bonus Action. The slot is spent on the sheet through `updateSheet`; an
      open sheet takes it into its draft (`spellcasting` joined the game fields). Companions keep
      their HP between fights (sheet, else runtime `partyHp`; who fought on your side: runtime
      `companions`); the **Party** section lists them; **Long rest** there restores HP, slots and
      free casts. Tests `tests/spellsCombat.test.js`; live-checked in Esolite (cleric 3 + a fighter
      companion vs two wolves: Guiding Bolt, Healing Word, write-back, Long rest).
- [x] **Encounter node** (2026-09-25): saved encounters are nodes of the world graph (palette
      **+ Encounter**, dark red); edges Encounter → place (`at`), → person (`fights`), Event →
      Encounter (`starts`, the event effect); inspector with monster search/counts, place, enemy
      start, difficulty for the party, *Start this encounter now*; the event effect *encounter* is
      a select. Tests `tests/encounterNode.test.js`; live-checked in the editor.
- **R5 done** — acceptance met (tests + live checks). Carried over (not blocking): a play test with
  a real backend (does the AI stick to the logged results? known issue 5); monster recharge and
  legendary actions are manual (Tools);
  spells: concentration, monsters' spellcasting, companions casting on their automatic turns, and
  conditions from spells (added with the Tools). Range and movement exist since R7 (zone combat). Acceptance "build a Moderate encounter, fight it through victory and through defeat"
  is covered by tests (`tests/encounter.test.js`) and the live check.
- Encounter builder with SRD 5.2 XP budget / difficulty; Encounter node linked to
  locations/events. *(done)*
- Combat sides from `isMonster` (known issue 1) with victory/defeat detection.
- Conditions, spell slots/resources, death saves; AI turn hints for monsters.
- Shared game log (dice + combat), visible to the AI.
Acceptance: build a "medium" encounter, fight it through victory and through defeat.

### R6 — Chat power features (SillyTavern) ✅ (2026-09-25)
**Design: [docs/design/R6-chat-power.md](design/R6-chat-power.md)** (2026-09-25: how Esolite's slash
commands / custom tools, display pipeline, summaries and lorebook import work; decisions; commands → engine).
- [x] **Step 1 — slash commands** (2026-09-25): `/go`, `/look`, `/search`, doors, `/talk`, `/give`/`/take`/`/inv`,
      `/buy`/`/sell`/`/shop`, `/accept`/`/turnin`/`/abandon`/`/track`/`/quests`, `/rep`, `/roll`, `/check` (persona sheet),
      `/encounter`/`/attack`/`/endturn`/`/rest`, clock and flags, `/map`/`/sheet`/`/lookup`, `/summary` (Esolite's
      AutoGenerate Memory), `/help`; ` | ` and new lines chain commands and a message. Not in the user's custom
      tools: a wrapper on `prepare_submit_generation` handles only RPmod names (a user tool of the same name wins).
      Found and fixed on the way: the Tools panel's sender (`sendTextToEsolite`) called an undefined `this.log` and
      sent nothing — Quick Actions, Auto Sender and Trigger Narrator did nothing (since the ALPHA code). Tests
      `tests/slash.test.js`.
- [x] **Step 2 — quick replies** (2026-09-25): left-dock section "Quick replies" with an editor; the Tools panel's
      Quick Actions are migrated once (custom ones kept, sent as messages). The **Here** row follows the world
      (`W.here()`: ways out, people with quest markers, quests to accept/turn in, shop, search) — a session can be
      played by clicking. Tests `tests/quickReplies.test.js`.
- [x] **Step 3 — hide control tags** (2026-09-25, known issue 2): a Display setting; wrapper on Esolite's
      `apply_display_only_regex`, so only the shown chat changes (Allow Editing shows the tags, the engine reads them).
      Tests `tests/hideTags.test.js`.
- [x] **Step 4 — lorebook round trip** (2026-09-25): export as SillyTavern World Info (read by SillyTavern and by
      Esolite's own `load_tavern_wi` — tested with Esolite's function), Lorebook V3, Esolite WI, or into Esolite's
      Library; each entry has a `[Location: …]` header and `extensions.rpmod`, the book carries the world. Import
      restores that world as a copy with edits made elsewhere, or types entries by their header; other entries become
      Lore (disabled ones stay off). The World tab's Import also reads World JSON. Tests `tests/lorebook.test.js`.
- [x] **Step 5 — summaries / memory** (2026-09-25): Esolite's own tools, no RPmod summariser: `/summary` opens the
      Context dialog and runs Esolite's AutoGenerate Memory; the User Guide explains running memory and TextDB.
- **R6 done** — acceptance met (2026-09-25): `tests/acceptance-r6.test.js` plays the example world's first quest from
  offer to reward, shopping and a fight with slash commands and quick replies only (only the text parts reach the
  AI), then exports the world as a lorebook and re-imports it identical. Live in Esolite: commands through the real
  Send button and input box, `/look` in Esolite's msgbox, quick replies and the Here row in the left dock, tags hidden
  in the real display pipeline (instruct mode) and shown with Allow Editing, Esolite's own `load_tavern_wi` reading
  the exported book and RPmod restoring it. The AI's narration with a real backend stays with known issue 5.
- Quick replies panel; slash commands (`/roll`, `/move`, `/give`, …) mapped to the engine.
- Optional stripping of control tags from displayed chat (known issue 2).
- Lorebook round-trip (Worlds ↔ WI V2/V3); summaries / memory.
Acceptance: run a session using only slash commands and quick replies; export a world
as a lorebook and re-import it.

### R7 — World map: dungeons & towns, room by room ✅ (2026-09-25; revised 2026-09-23)
**Design: [docs/design/R7-world-map.md](design/R7-world-map.md)** (decisions, data model, AI
interface, UI, generator, zone combat, AI-capability analysis). Owner's decisions: no VTT;
room-by-room movement, towns as places; location kinds `location` / `dungeon` / `town`; a
dungeon/town is one node in the world graph with its own **dungeon/town editor over the world
editor**; rooms stay locations (`parentId`) hidden from the world graph; world state is the truth,
the board is derived (the LLM never writes coordinates); dungeons from editor, generator and AI;
**mini-map** for the player; **zone combat** (revised 2026-09-25 from "distance bands", which
misread the reference: creatures stand in zones of the room).
- [x] **Step 1 — location kinds + dungeon/town editor** (2026-09-23): `src/game/map-rules.js` (pure)
      + engine: `kind` dungeon/town, rooms = locations inside (hidden from the world graph, edges drawn
      at the dungeon/town node, labels "Crypt › Hall" in dropdowns), **exits stored once and read from
      both sides** (decision: one door state and one "found" per exit; legacy `connectedLocationIds`
      and `exits[{locationId}]` stay valid, migrated additively), doors (state/material/lock DC/key),
      secret exits/rooms, light, hazards, features (world objects with a kind), grid layout, runtime
      exploration `explored/found/doorState` in both slots (old saves migrated), unfound secrets and
      unknown dungeon rooms kept out of the AI slice. **Dungeon/town editor** window over the world
      editor (`src/map/mapEditor.js`): board, add/drag/resize, Connect tool, door markers, inspector
      (room, exits, way out, features, inhabitants, encounter), nested levels, styles stone/parchment/
      streets/plots; delete asks and takes the rooms along. Tests `tests/map.test.js`,
      `tests/mapEditor.test.js`. Live-checked in Esolite (build, drag, inspector, back to the world).
- [x] **Step 2 — mini-map + moving room by room** (2026-09-23): `go()` (known exits only, a closed
      door opens, locked/barred refuses, entrance room when going to a dungeon/town, leave only
      through a way out; direction words and forgiving names), refusals and UI moves in the game log
      (the AI narrates them), `<move>` through the same rules inside/into maps; AI context per room
      (light, hazards, exits with exact names/directions/door states, unfound traps hidden, "Moving"
      hint, optional text map — Settings → RPmod → Map, default off); **known issue 12 fixed** (tags
      parsed on reply arrival; clock step unchanged); left-dock **Map** section (fog, you are here,
      click a neighbour, exit buttons, refusal) and **Map** window (`src/map/minimap.js`, shared drawing
      `src/map/board.js`). Tests `tests/move.test.js`. Live-checked in Esolite, incl. replies through
      the real `handle_incoming_text`.
- [x] **Step 3 — AI tags + exploration** (2026-09-24): `src/game/map-tags.js` (pure) — map tags in
      **reply order** (`<go>`/`<move>`, `<open>`, `<close>`, `<unlock>`, `<search>`, `<room>`, `<door>`,
      `<light>`), forgiving targets (direction, name, plural, material, "door"), self-closing/empty tags.
      **Fog:** known (behind a closed door; name hidden from player and AI — "unexplored room", "?")
      / seen (open way or door) / visited. **Doors:** Open/Close/Unlock in the mini-map and by tag;
      key without a roll, else thieves' tools d20 + DEX (+PB) vs lock DC; barred refuses. **Search:**
      d20 + better of Perception/Investigation vs secret doors, secret rooms and traps (DC 15 default,
      never shown), passive Perception on entering; results in the log and the AI context.
      **`<room>`**: the AI adds a room beside the current one (placed, named, open door; stored in the
      world with `origin: 'ai'`, "AI" badge in the editor); **`<door>`** only makes doors harder;
      **`<light>`** per story. Owner's decisions on these four points: 2026-09-24 (design doc, step 3).
      New runtime fields `found.searched`, `roomLight` (additive, migration tested). Tests
      `tests/explore.test.js`. Live-checked in Esolite (clicks + replies through the real
      `handle_incoming_text`, editor badge).
- [x] **Step 4 — generator** (2026-09-24): `src/game/map-gen.js` (pure, seeded — the same seed gives
      the same map). Dungeons: size small/medium/large (5/8/12 rooms + a secret room), themes crypt/
      cave/ruin/sewer (doors or passages, light, furniture, containers, traps, hazards), all rooms
      reachable with a few loops, one secret room behind a secret door, one locked door with its key
      in a chest on the near side, optional encounters (none/few/some) from the theme's SRD 5.2.1
      monsters within the party's XP budget (deepest room moderate). Towns: the ticked places (16 to
      choose from) around a Town Square, open streets. Engine `generateMap` (world edit; replace only
      on request and never with the player inside; way out to the map's world neighbour, a level gets
      stairs up); dungeon/town editor **Generate** panel with seed and dice. Placeholder rooms
      ("Room 4") are named by the AI once with `<room>Name, here: …</room>`; saved encounters of a
      place reach the AI as **Waiting here** until started (runtime `startedEncounters`, additive).
      Tests `tests/generator.test.js`. Live-checked in Esolite (generate in the editor, play in,
      naming by a reply through the real `handle_incoming_text`).
- [x] **Step 5 — zone combat** (2026-09-25): `src/game/zone-rules.js` (pure) — layouts from the
      room (small ≤ 30 × 30 ft = one zone; large = centre + four sides; corridor = middle + its
      passages; plus just outside / out of range; 1 cell = 10 ft; `room.combatSpace` overrides),
      adjacency, line of fire, reach/range profiles (monster range text, SRD weapon properties),
      cover defaults by feature name, start positions. Engine: `cb.zones` (additive — fights saved
      without it keep the old rules; plain JSON), party on the side it came in by (`runtime.entry`,
      additive), enemies across/beside/next zone/outside (builder, saved encounters' `start`);
      move one zone (60 ft: two), **flee** two without attacking (opportunity attacks from the zone
      left; a one-zone retreat is safe), melee same zone, ranged ≤ 30 ft next zone / longer any in
      line of fire, **−3** vs. a melee attacker of last round (owner's choice over SRD
      disadvantage), one ranged attack per round through a doorway, **cover** +2/+5 from room
      features in the zone (SRD), **Hide** DC 15 → Invisible, **Search**; monster tactics (close
      in / dash / shoot; archers step out of melee and take cover; search when blind). AI:
      "Battlefield" + each combatant's zone/cover/hidden; everything in the combat log. Combat
      window: zone board drawn like the reference (`src/game/zoneBoard.js`), click to move,
      Move/Flee/Take cover/Hide/Search, attack reasons, "Enemies start", Tools "Put there".
      Dungeon editor: room fighting space, feature cover and zone. **Guide tab "Zone combat"**
      (Esolite's Guide gets a second RPmod tab `rpmod-zones`; RPmod's own guide window gets book
      tabs) with a diagrams window; linked from the Combat window and the "Dice & combat" chapter.
      Setting `combat_zones` (default on). Tests `tests/zones.test.js` (+ onboarding/editor).
      Live-checked in Esolite (a fight in a large hall: shoot, move, take cover, enemies close in;
      Guide tab and diagrams).
- **Open (step 5):** positions are per zone only (no facing, no flanking, no difficult terrain);
  areas of effect and spells in zones wait for spells in the Combat window (R5 — "a spell of 30 ft
  or less reaches the next zone" is prepared in the rules text only); companions use the same
  tactics as monsters; the player's own opportunity attacks are rolled automatically with their
  best melee attack; the AI cannot move creatures between zones by tag (it narrates, the UI acts);
  a fight stays in the room it started in (moving rooms mid-fight is not modelled).
- **Open (step 4):** generated rooms have no descriptions (the AI describes and names them in play);
  no multi-level dungeons from one click (generate a level inside a room instead); a generated key
  sits in a container but taking it is narrated (`<give>`), containers have no loot system; town
  places get no people (link persons in the inspector).
- **Open (step 3):** traps are only *found* — triggering, disarming and damage are not modelled;
  no forcing doors (Athletics); a door locked by the AI has no key unless the tag names one, so
  without thieves' tools it stays shut (by design: RPmod decides); `<room>` adds only beside the
  current room (no up/down stairs by tag); searching is unlimited (no time cost yet).
- **Open (step 1):** moving a room does not re-aim its exits' stored direction (set it in the
  inspector); a saved encounter keeps its room id when the room is deleted (it just no longer
  matches a place; regenerating a map does remove the encounters at its rooms).
Steps:
1. ~~Location kinds + dungeon/town editor~~ (done, see above).
2. ~~Mini-map + room-by-room movement~~ (done, see above).
3. ~~AI tags + exploration~~ (done, see above).
4. ~~Generator~~ (done, see above).
5. ~~Zone combat (zones of the room, moving/fleeing, cover, hiding, Guide tab)~~ (done, see above).
Acceptance: build a small dungeon and a town in the editor, generate a second dungeon, let the AI
add a room with a locked door, explore room by room with fog on the mini-map, find a secret door
by searching, and fight an encounter using zones and cover. **✅ Passed 2026-09-25:** end-to-end test `tests/acceptance-r7.test.js` (whole bundle + UI, AI
replies through `handle_incoming_text`) and live in Esolite (hand-built mine + town, generated
tomb, mini-map clicks with fog, the AI's `<room>`/`<door>` reply through Esolite's real reply
handler, Search button finding the secret door, `<encounter>` reply → zone fight in the large
hall: move, take cover, enemies close in, victory). A real AI backend is the separate play test
(known issue 5).

## Working agreement
1. Plan the phase (or item) briefly; confirm scope with the owner when unclear.
2. Implement in `src/`; never edit generated files (`KLITE-RPmod.js`, `index.rpmod.html`).
3. `npm test` must be green; add tests for new behavior.
4. Update this file (status + current state) and commit.
