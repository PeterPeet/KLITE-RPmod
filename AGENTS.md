# KLITE RPmod – Developer Guide (BETA)

This repo contains the monolithic ALPHA implementation of KLITE RPmod and a browser-based test harness. It enhances KoboldAI Lite/Esolite with roleplay tooling, while maintaining compatibility with the host UI and storage.

## Core Principles
- Enhance, don’t replace: integrate with Lite/Esolite APIs (e.g., `localsettings`, IndexedDB helpers) and avoid invasive DOM rewrites.
- Host-agnostic: auto-detect Esolite vs Lite, and gracefully fall back when helpers are missing.
- Performance-first: incremental updates, idempotent hooks, and guarded observers.

## What’s implemented
- Panels: TOOLS, CONTEXT, SCENE, ROLES, HELP (left) and CHARS, MEMORY, NOTES, WI, TEXTDB (right).
- Save/restore: embeds RPmod bundle in `generate_savefile(...)` and restores in `kai_json_load(...)`; persists `rpmod_*` keys via Lite’s storage or direct IndexedDB fallback.
- ROLES trigger system: manual/round‑robin/random/keyword/talkative/party, tail injection and correct `chatopponent` semantics.
- Author’s Note: unified mode detection (Story/Chat/RP/Adventure), smart settings persistence.
- Avatar integration:
  - RPmod chat avatars (fast).
  - Esolite adapter (auto): MutationObserver updates only newly inserted rows scoped to chat containers; no mass document sweeps.
  - Lite experimental toggle: same approach, off by default.
  - Policy persisted as `ui.avatarPolicy` in the RPmod bundle; restored both from savefiles and autosave bundles.

## Testing
- Runner: open `Tests/Test_Runner_FunctionalTests.html` in a browser.
  - Includes functional, integration, ROLES/NOTES, save system, avatar tests, and character tests.
  - Log output and export JSON with per-test details.
- Key coverage:
  - Save/load embedding and Lite storage fallback
  - ROLES triggers (round‑robin/keyword/talkative)
  - Author’s Note mode detection + smart settings persistence
  - Avatar policy persistence, name mapping, and DOM injection for new rows (chat container scoped)

## Developer tips
- Hooks are idempotent; we double‑install save/load wrappers where needed to avoid timing issues.
- Use `KLITE_RPMod.enableLiteAvatarsExperimental(true)` to test Lite DOM avatars. The observer watches `#gametext`/`#chat-display`.
- Avatar sources resolve from CHARS cache (`getOptimizedAvatar(id,'avatar')`) with fallbacks; avoid blob URLs.
- Fullscreen layout uses a script‑toggled `.klite-fullscreen` class as a fallback for browsers without `:has()` support.
- Console restoration is gated: set `window.KLITE_RPMod_Config.enableConsoleRestore=true` or localStorage key `rpmod_enable_console_restore=1` to enable.

## Files of interest
- `KLITE-RPmod_ALPHA.js` – main implementation (~18k+ lines)
- `docs/developer/REQUIREMENTS.md` – derived requirements (updated to match ALPHA)
- `Tests/` – mocks, assertions, runner, and test suites

## Future work
- Optional topbar indicator of avatar adapter mode.
- Fine‑tune adapter caps and idle scheduling for ultra‑long sessions.
- Expand fork‑specific selectors/entries when DOM structures are known.
