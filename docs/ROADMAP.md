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

### What works (verified headless 2026-09-23 — `npm test`, 30 tests)
- Bundle builds (esbuild, ES-module sources); all four modules load (ALPHA core, GuidedRP, Worlds engine, Worlds UI).
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
- **UI:** node-graph editor overlay; tabbed Worlds panel (Play/Quests/Combat/Editor);
  Creator/Player lens; navbar button.
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
3. **Worlds panel overlaps ALPHA's right panel** on screen (R1 shell fixes).
4. **Two systems inject character data** — ALPHA (persona/character via WI
   `_imported_memory` entries and `pending_context_preinjection`) and Worlds persons. Need
   one owner (R1/R2).
5. **Never play-tested with a real AI backend** (only headless + page load).
6. `index.rpmod.html` boots the bundle at `window.load` (later than the usermod path); verify
   top-bar icon layout matches the usermod install.
7. Monster presets are SRD **5.1**; decision is SRD **5.2** (R3).
8. ALPHA is a 17.7k-line monolith; GuidedRP 5.2k lines; three independent UI systems.
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
- **Next:** build the shell skeleton (sidebars + window manager + top-bar entry), then
  migrate the Worlds panel/editor into it.
- App shell: docked sidebars + a window manager for sheet, quest log, compendium, combat,
  editor, map; one entry point in the Esolite top bar.
- Design system: tokens (color, type, spacing) bound to Esolite's theme variables,
  neutral look matching Esolite; icon set (Lucide, ISC) bundled offline.
- Migrate the Worlds panel and editor into the shell; migrate ALPHA panels one by one;
  decide GuidedRP's place (onboarding flow inside the shell).
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
