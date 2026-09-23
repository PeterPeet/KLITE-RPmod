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

## Commands
```
npm install          # once (dev dependency: jsdom)
npm run build        # src/* -> KLITE-RPmod.js (the file users load)
npm run build:index  # -> <host>/index.rpmod.html that autoloads the mod (generated, git-ignored)
npm test             # rebuilds, then runs all tests (node:test + jsdom)
```

## Layout
- `src/` — ES-module sources (ALPHA core, GuidedRP, Worlds engine, Worlds UI) + `main.js`
  entry; esbuild bundles them into one file. **Edit here.**
- `KLITE-RPmod.js` — **generated** bundle (committed for users). Never hand-edit.
- `scripts/` — build scripts. `tests/` — test suite (`tests/helpers/host.js` = fake Esolite host).
- `docs/` — USERSTORY, ROADMAP, ARCHITECTURE, diagrams, `exports/` (guide PDFs/HTML).
- `Esobold Esolite a fork of KoboldAI Lite very newest/` — Esolite host reference (read-only).
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
- **Copyright:** only SRD 5.2 (CC-BY-4.0) game content; no Wizards/Blizzard/Roll20/
  Foundry/Owlbear assets or branding; reimplement ideas, never copy AGPL/proprietary code
  (details in USERSTORY.md).
- **Enhance Esolite, don't replace it:** reuse its backends, templates, WorldInfo
  pipeline, RAG, TTS, image gen.
- Work on branch `FeatureImplementation`; `main` is the release branch.

## Esolite host constraints (details: ARCHITECTURE.md §2)
- Hook generation via `window.prepare_submit_generation`; `submit_generation` is a
  `const` and cannot be wrapped.
- Agent mode (`localsettings.opmode == 4 && agentBehaviour`) bypasses the prepare hook in
  its tool loop; websearch makes the submit chain async.
- Code that runs at page parse time is too early — Esolite builds its UI in an async
  init; defer to `window.load` (as the integrated loader does) or poll for globals.
- ALPHA wraps `localsettings` in a consent `Proxy`: writes are dropped until consent.
- Esolite's global CSS sets `pre{background:#f5f5f5}` — style our elements explicitly.
