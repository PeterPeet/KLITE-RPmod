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

### What works (verified headless 2026-09-23 — `npm test`, 137 tests)
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
| D&D Beyond | Step-by-step character builder | ✅ levels 1–20 (spell picking missing) |
| | Interactive sheet (modifiers, saves, skills, AC) | ✅ click-to-roll, stored in the card |
| | Rules compendium | 🟡 data: 330 SRD 5.2.1 monsters, conditions; no compendium window yet (R3) |
| | Encounter builder with difficulty | ✅ SRD XP budget, 330 monsters, saved encounters |
| | Combat tracker | ✅ sides, conditions, death saves, auto enemy turns (spell slots not used in combat) |
| | Click-to-roll + game log | ✅ dice log the AI sees (combat log separate) |
| | Leveling / XP | 🟡 level up 1–20; XP is not awarded yet |
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
1. ~~"Monster / NPC combatant" flag does nothing~~ — decides the combat side since R5 (a monster is
   never an ally; victory = every enemy down).
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
7. ~~Monster presets are SRD 5.1~~ — replaced by the 330 SRD 5.2.1 monsters (R5, 2026-09-23).
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
15. ~~Two character libraries~~ — decided: Esolite's Library is the master; ALPHA's
    `KLITE_RPMod.characters` is a gallery view rebuilt from it (plus RPmod-only rating/
    talkativeness/tag cache in `characters_v3`). Remaining (R2): gallery ids are list
    positions — key RPmod extras and links by the Library `id`; ALPHA still polls every
    5 s (`rebuildFromEsolite`) instead of only reacting to Esolite's events. ALPHA's gallery
    grid/filter/sort code in `panels.CHARS` is now unused (fallback only) — remove it with the
    ALPHA cleanup (known issues 8, 10).
16. **Esolite 1.35 Library internals used by RPmod** (`resolveCharacterNameAndId`,
    `upsertCharacterMetadata`, `updateCharacterListFromAll`, `findCharacterMetaByName`,
    `getNextAutoincrementName`, `STORAGE_PREFIX`, `allCharacterNames`): recheck on every host
    upgrade; a small official save/delete API would be a good next proposal to Jaxxks.
17. ~~Combat HP and sheet HP are separate~~ — the fight starts at the persona sheet's current HP
    and writes HP/XP back (R5, owner's decision). Companions (world persons) still start at full HP.

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
- App shell: docked sidebars + a window manager for sheet, quest log, compendium, combat,
  editor, map; one entry point in the Esolite top bar.
- Design system: tokens (color, type, spacing) bound to Esolite's theme variables,
  neutral look matching Esolite; icon set (Lucide, ISC) bundled offline.
- Migrate the Worlds panel and editor into the shell; migrate ALPHA panels one by one;
  onboarding on top of Esolite's Quick Start + RPmod Guide (GuidedRP retired).
- **Single context-injection owner** (resolve known issue 4).
Acceptance: no overlapping panels; all existing features reachable from the shell; tests
green; live check in `index.rpmod.html`.

### R2 — Characters (D&D Beyond × SillyTavern) 🟨
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
      by tests + live check; "export and re-import as a card" relies on the portrait/V2 card
      embedding (tested) — a real import round trip in SillyTavern is still to do.
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
      object). The stored record is unchanged. Still to do by hand: import into SillyTavern.
      Characters **without a portrait** download through Esolite as the bare inner object
      (SillyTavern then drops `extensions`, i.e. the sheet) — one of the points for Jaxxks.
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
      Not modelled (text only): Alert's initiative bonus, Jack of All Trades, Cleric/Druid
      order choices, Magic Initiate spells. Live-checked.
- **Next (R2):** spells from the SRD spell list (pick cantrips/prepared spells — with R3's
  compendium), SillyTavern import round trip (owner).
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

### R4 — Quests & world (WoW) 🟨
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
- Full marker set (yellow/grey `!`, yellow/grey `?`).
- Prerequisites (level, previous quest, flag, reputation); chains; item-started quests.
- Objective types with counters (kill/collect/talk/visit), auto-progress from tags/events.
- **Rewards paid out** on turn-in (XP, gold, items, choose-one-of-N); abandon.
- Zones/subzones (location hierarchy), hub flag, **phasing** (location/NPC variants by state).
- Faction **reputation** tiers (Hated → Exalted) with effects.
Acceptance: play the example world's quest chain start to finish with rewards, a phased
location and a reputation change.

### R5 — Encounters & combat (D&D Beyond) 🟨
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
- **Open (R5):** needs a play test with a real backend (does the AI stick to the logged results?);
  an Encounter node in the editor graph; spells in combat (spell attack/save DC, slots used from
  the Combat window); companions' HP kept between fights; monster recharge and legendary actions
  are manual (Tools); no map, so no range/movement — ranged monsters only prefer melee when they
  have it. Acceptance "build a Moderate encounter, fight it through victory and through defeat"
  is covered by tests (`tests/encounter.test.js`) and the live check.
- Encounter builder with SRD 5.2 XP budget / difficulty; Encounter node linked to
  locations/events. *(done: builder + saved encounters with location + event effect; an
  Encounter node in the editor graph is still open)*
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
