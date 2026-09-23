# Roadmap

> The plan for turning KLITE RPmod into the product described in
> [USERSTORY.md](USERSTORY.md). **Keep this file current:** after each phase (or any
> significant change) update the status markers and the "Current state" section, so work
> can resume without any chat history.
>
> Status: ⬜ not started · 🟨 in progress · ✅ done · ⏸ deferred
> Last updated: 2026-09-23

## Current state

Baseline tag: **`worlds-baseline-2026-07`** (commit `99d4370`, 2026-07-08).
Supported host: **Esolite RMv1.35.0** (upgraded from 1.32.0 on 2026-09-23; hooks diffed,
all present — see ARCHITECTURE §2 "Upgrading the host"). The 1.32.0 copy is archived in
`BackupData/`.

### What works (verified headless 2026-09-23 — `npm test`, 73 tests)
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
  per-world `aiMode` (gm/player).
- **Trigger bus:** event triggers/conditions/effects with chains; faction HQs.
- **Combat:** dice, initiative, attack vs AC, HP, checks, 6 SRD **5.1** monster presets.
- **UI (in the app shell):** World tab, Party + Quests sections, Quest log / Combat /
  World editor (node graph) windows; Creator/Player lens.
- **Delivery:** usermod bundle, or `index.rpmod.html` that autoloads the mod after
  Esolite's `load` event.
- ALPHA (unchanged since 2026-05): CHARS/ROLES/TOOLS/CONTEXT/IMAGES panels, card import
  (V2, partial V3), personas, group chat speaker modes, quick actions, chapters, image gen.

### Gap analysis vs. the user story
✅ done · 🟡 partial · ❌ missing

| From | Feature | Now |
|---|---|---|
| D&D Beyond | Step-by-step character builder | ❌ |
| | Interactive sheet (modifiers, saves, skills, AC) | 🟡 raw stat block |
| | Rules compendium | 🟡 6 monsters (SRD 5.1) |
| | Encounter builder with difficulty | 🟡 no XP budget |
| | Combat tracker | ✅ basic (no conditions, spell slots, death saves) |
| | Click-to-roll + game log | 🟡 roller + combat log only |
| | Leveling / XP | ❌ |
| SillyTavern | Character cards V1/V2/V3 | ✅ V2, 🟡 V3 (ALPHA) |
| | Personas, group chat | ✅ ALPHA |
| | World Info / lorebooks | ✅ Esolite + Worlds graph |
| | Quick replies | 🟡 ALPHA quick actions |
| | Slash commands | ❌ (chat tags instead) |
| | RAG, TTS, image gen, summaries | ✅ mostly Esolite/ALPHA |
| WoW | Marker set incl. grey `!`/`?` | 🟡 yellow only |
| | Quest log: counters, track, abandon | 🟡 checkboxes + track |
| | Chains & prerequisites | 🟡 via triggers, no prerequisite field |
| | Rewards XP/gold/choose-one | ❌ stored, never paid out |
| | Zones/subzones, hubs, phasing | 🟡 flat locations; phasing only via flags |
| | Factions & reputation | ❌ no reputation |
| VTT | Map, grid, tokens, fog | ❌ (R7) |

### Known issues / tech debt
1. **"Monster / NPC combatant" flag does nothing** — stored (`stats.isMonster`) but never
   read. Intended for combat sides + victory detection (R5).
2. **Chat tags remain visible** in the chat text (parsed, not stripped) (R6).
3. ~~Worlds panel overlaps ALPHA's right panel~~ — fixed by the shell (2026-09-23).
4. ~~Two systems inject character data~~ — one owner since 2026-09-23 (`src/context/`).
   Left for R2: ALPHA's **Start RP** still writes per-character WI entries
   (`<name>_imported_memory`, keyword-triggered) and "load as scenario" writes Memory. These
   are deliberate, user-editable story data, so the context module does not touch them.
   With group chat on, a speaker can therefore appear twice (card from the context +
   keyword-triggered WI). The R2 character model decides which one stays.
5. **Never play-tested with a real AI backend** (only headless + page load).
6. `index.rpmod.html` boots the bundle at `window.load` (later than the usermod path); verify
   top-bar icon layout matches the usermod install.
7. Monster presets are SRD **5.1**; decision is SRD **5.2** (R3).
8. ALPHA is a 17.7k-line monolith (its panels now live in the shell, its code does not yet).
9. `<take>Item</take>` **without a count removes the whole stack**, while `<give>Item</give>`
   adds one — asymmetric; decide the intended semantics (R4 or R6). Covered by a test.
10. **Six duplicate object keys in ALPHA** (esbuild warns on every build):
    `updateSubmitBtn`, `setMode`, `loadSettings`, `saveSettings`, `extractTalkativeness`,
    `importWorldInfoEntry`. The last definition wins (always has); the earlier ones are dead
    code. Remove them when those ALPHA panels migrate into the shell (R1).
11. **Host bug (Esolite 1.35.0, not ours):** the plain `index.html` logs
    `SyntaxError: Identifier 'lastPendingResponse' has already been declared`
    (`static/js/postSubmitHandler.js`). Seen with and without the mod; no visible effect so
    far. Recheck on the next host upgrade.
12. **World state changed by AI chat tags reaches the UI only at the next send** — tags are
    parsed in `processPendingMutations()` at generation time, not when the reply arrives.
    The views refresh then (via `klite:worlds-change`). Parse on reply arrival in R6.
13. **ALPHA inner markup** still carries many inline styles (sizes/spacing); colours follow
    the theme via its variables, but spacing is not yet on the shell's scale.
14. **Quick Start adapter depends on Esolite internals** (`showQuickStartPopup`,
    `applyQuickStartSelection`, `clearAllQuickStartSelections`, `popupUtils.contentElem`).
    Falls back gracefully (no RPmod section) if they change; goes away once Esolite adopts
    `window.quickStartExtensions` — implemented for Esobold on branch
    `quickstart-extensions` (pushed to fork PeterPeet/esobold), PR to be opened. RPmod already prefers the
    hook (verified live).
15. **Two character libraries**: ALPHA's (`KLITE_RPMod.characters`) and Esolite's Library
    (`characterManager.js`, used by Quick Start). Overlap noted by Jaxxks; resolve in R2.

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

### R1 — App shell + design system 🟨
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
      `docs/proposals/quick-start-extensions.md`). New **RPmod Guide** window (11 chapters,
      "Show me" highlights), "New here?" card and `?` button. **GuidedRP retired** (source in
      `BackupData/legacy/`, `guided_rp` save blocks preserved). Live-checked in Esolite.
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
- **Next:** ALPHA's own character library vs Esolite's Library (overlap Jaxxks pointed
  out — decide in R2); icon set.
- App shell: docked sidebars + a window manager for sheet, quest log, compendium, combat,
  editor, map; one entry point in the Esolite top bar.
- Design system: tokens (color, type, spacing) bound to Esolite's theme variables,
  neutral look matching Esolite; icon set (Lucide, ISC) bundled offline.
- Migrate the Worlds panel and editor into the shell; migrate ALPHA panels one by one;
  onboarding on top of Esolite's Quick Start + RPmod Guide (GuidedRP retired).
- **Single context-injection owner** (resolve known issue 4).
Acceptance: no overlapping panels; all existing features reachable from the shell; tests
green; live check in `index.rpmod.html`.

### R2 — Characters (D&D Beyond × SillyTavern) ⬜
- One **Character model** = TavernCard V2/V3 fields + d20 sheet (species, class, level,
  background, abilities, proficiencies, skills, saves, AC, HP, speed, equipment,
  inventory, spells, features). Migration from existing `characterRef` + `stats`.
- Step-by-step **builder** (SRD 5.2 species/classes/backgrounds).
- **Interactive sheet** with click-to-roll → game log.
- **Leveling / XP**; persona = player character; NPC persons use the same model.
Acceptance: build a level-1 character end to end, roll from the sheet, level up, export
and re-import as a card without data loss.

### R3 — Compendium (SRD 5.2) ⬜
- Bundled SRD 5.2 data: monsters, spells, magic items, equipment, conditions, rules
  glossary; attribution page. Replace SRD 5.1 presets.
- Searchable compendium window; cross-links from sheets, encounters and chat.
Acceptance: search any SRD monster/spell, open it, add a monster to an encounter.

### R4 — Quests & world (WoW) ⬜
- Full marker set (yellow/grey `!`, yellow/grey `?`).
- Prerequisites (level, previous quest, flag, reputation); chains; item-started quests.
- Objective types with counters (kill/collect/talk/visit), auto-progress from tags/events.
- **Rewards paid out** on turn-in (XP, gold, items, choose-one-of-N); abandon.
- Zones/subzones (location hierarchy), hub flag, **phasing** (location/NPC variants by state).
- Faction **reputation** tiers (Hated → Exalted) with effects.
Acceptance: play the example world's quest chain start to finish with rewards, a phased
location and a reputation change.

### R5 — Encounters & combat (D&D Beyond) ⬜
- Encounter builder with SRD 5.2 XP budget / difficulty; Encounter node linked to
  locations/events.
- Combat sides from `isMonster` (known issue 1) with victory/defeat detection.
- Conditions, spell slots/resources, death saves; AI turn hints for monsters.
- Shared game log (dice + combat), visible to the AI.
Acceptance: build a "medium" encounter, fight it through victory and through defeat.

### R6 — Chat power features (SillyTavern) ⬜
- Quick replies panel; slash commands (`/roll`, `/move`, `/give`, …) mapped to the engine.
- Optional stripping of control tags from displayed chat (known issue 2).
- Lorebook round-trip (Worlds ↔ WI V2/V3); summaries / memory.
Acceptance: run a session using only slash commands and quick replies; export a world
as a lorebook and re-import it.

### R7 — Map / VTT (optional) ⬜
- Map image per location, grid, tokens linked to persons, fog of war, measurement,
  pan/zoom (reuse the editor canvas); token positions tied to combat.
Acceptance: load a map, place tokens, reveal fog, fight an encounter on it.

## Working agreement
1. Plan the phase (or item) briefly; confirm scope with the owner when unclear.
2. Implement in `src/`; never edit generated files (`KLITE-RPmod.js`, `index.rpmod.html`).
3. `npm test` must be green; add tests for new behavior.
4. Update this file (status + current state) and commit.
