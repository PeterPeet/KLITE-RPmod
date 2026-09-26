# CLAUDE.md — KLITE RPmod

KLITE RPmod turns **Esobold Esolite** (a KoboldAI Lite fork) into a solo AI-roleplay
application that combines **D&D Beyond** (sheets, rules, encounters, dice),
**SillyTavern** (cards, personas, group chat, lorebooks) and **World of Warcraft**-style
questing, with the AI as game master and the mod enforcing rules. It ships as one
JavaScript usermod.

## Read first (every session)
1. [docs/ROADMAP.md](docs/ROADMAP.md) — **current state, known issues, active phase**. Resume from here.
2. [docs/USERSTORY.md](docs/USERSTORY.md) — the product vision, locked decisions, copyright guardrails.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — internals and the Esolite host constraints.
4. [USER_GUIDE.md](USER_GUIDE.md) — end-user documentation (keep in sync with features).
5. `docs/design/` — design of the active phase when it has one (R6, done: [docs/design/R6-chat-power.md](docs/design/R6-chat-power.md); R7: [docs/design/R7-world-map.md](docs/design/R7-world-map.md); R8, draft: [docs/design/R8-starter-adventure.md](docs/design/R8-starter-adventure.md)).

## Commands
```
npm install          # once (dev dependency: jsdom)
npm run build        # src/* -> KLITE-RPmod.js (the file users load)
npm run build:host   # Esobold clone (../esobold) -> Esolite site in ~/.cache/klite-rpmod/esolite
npm run build:index  # -> index.rpmod.html in that site, autoloads the mod
npm run serve        # serve it: http://localhost:8747/index.rpmod.html (preview: "esolite-rpmod")
npm run deploy:pages # build released Esobold + mod, test, commit to ../rp-lite.koboldai.net (redirect branch = rp-lite.koboldai.net); add -- --push to publish
npm test             # rebuilds, then runs all tests (node:test + jsdom); needs the Esobold clone
npm run icons        # after changing the icon list: regenerates src/shell/icons.js (Lucide)
```

## Layout
- `src/` — ES-module sources: `shell/` (app shell), `rpmod/` + `panels/` (RP core and its panels), Worlds engine, Worlds UI,
  `game/` (rules + combat/log, lorebooks), `map/` (R7 dungeon/town editor), `chat/` (R6 slash commands, quick replies), `characters/`, `compendium/` (R3), `onboarding/`
  (Quick Start extension + Guide) + `main.js` entry; esbuild bundles them
  into one file. **Edit here.**
- `KLITE-RPmod.js` — **generated** bundle (committed for users). Never hand-edit.
- `scripts/` — build scripts. `tests/` — test suite (`tests/helpers/host.js` = fake Esolite host).
- `docs/` — USERSTORY, ROADMAP, ARCHITECTURE, `design/` (phase designs), diagrams, `exports/` (guide PDFs/HTML).
- Host: **current Esobold** (esolithe/esobold, branch `remoteManagement`) from the local clone
  `../esobold` (`ESOBOLD_DIR`); `npm run build:host` builds the site from whatever branch it has
  checked out (incl. our open PRs). Paths: `scripts/esolite-paths.js`. Read Esolite code in
  the clone's `embd_res/` (source; its `docs/` is the generated site).
- `BackupData/` — archived material (old host copy, old AGENTS.md, specs). Not built.

## Rules
- **Never lose user data.** Saves, characters and worlds must survive every change;
  save-format changes are additive with migrations and tests.
- **Tests before commit.** `npm test` must be green; add tests for new behavior.
- **Keep docs true.** After each phase or notable change, update `docs/ROADMAP.md`
  (status, current state, known issues) and, if needed, ARCHITECTURE/USER_GUIDE.
- **Security:** character/world data is untrusted — build DOM with
  `createElement`/`textContent` or escape (`KLITE_RPMod.escapeHtml`); external images via
  `KLITE_RPMod.safeImageHTML`.
- **Copyright:** only SRD 5.2.1 (CC-BY-4.0) game content, with its exact attribution
  statement (`SRD.attribution` in `src/data/srd52.js`) and no other attribution to Wizards; no Wizards/Blizzard/Roll20/
  Foundry/Owlbear assets or branding; reimplement ideas, never copy AGPL/proprietary code
  (details in USERSTORY.md).
- **Enhance Esolite, don't replace it:** reuse its backends, templates, WorldInfo
  pipeline, RAG, TTS, image gen.
- Branches: `main` ← `development` ← feature branches (now `FeatureImplementation`). Feature work
  starts from and merges (PR) into `development`; keep a feature branch current with
  `git rebase origin/development` (then `git push --force-with-lease`).
- **`main` is frozen:** it holds the legacy `Guided_RPmod_esolite.js` and `KLITE-RPmod_ALPHA.js`,
  which users fetch directly from `main` (no pinned commit). Never merge into, push to or
  overwrite `main` until the owner says that fetch has moved.

## Esolite host constraints (details: ARCHITECTURE.md §2)
- Hook generation via `window.prepare_submit_generation`; `submit_generation` is a
  `const` and cannot be wrapped.
- Agent mode (`localsettings.opmode == 4 && agentBehaviour`) bypasses the prepare hook in
  its tool loop; websearch makes the submit chain async.
- Code that runs at page parse time is too early — Esolite builds its UI in an async
  init; defer to `window.load` (as the integrated loader does) or poll for globals.
- The RP core (`src/rpmod/core.js`) wraps `localsettings` in a consent `Proxy`: writes are dropped until consent.
- Esolite's global CSS sets `pre{background:#f5f5f5}` — style our elements explicitly.
