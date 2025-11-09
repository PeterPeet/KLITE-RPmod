# KLITE-RPmod BETA – Derived Requirements (v2.1)

Source of truth: current KLITE-RPmod_ALPHA.js implementation. This replaces outdated items (e.g., PLAY/GROUP) and documents new behavior (ROLES, CONTEXT, top menu, Lite/Esolite detection, unified save hooks).

## Functional

- UI Shell: Hides original Lite UI when active; injects full-screen container, left/right side panels, a top panel, and a custom input area.
- Tabs (Left): TOOLS, CONTEXT, SCENE, ROLES, HELP.
- Tabs (Right): CHARS, MEMORY, NOTES, WI, TEXTDB.
- Mobile Modes: Dedicated mobile layout with mode-aware quick buttons; tablet sidepanel modes; fullscreen toggle.
- Generation Wrapper: Intercepts submit to inject persona/character context and to respect ROLES speaker routing when enabled.
- Top Menu: Adds an RPmod topbar inside the top panel and mirrors Lite’s nav; augments with extra Esolite links when detected.
- Characters: Import/export, search/filter, basic CRUD; optional embedded v2/v3 metadata and derived stats; multi-tier image optimization when canvas available.
- ROLES: Group-to-roles rename; manages participants, current/last speaker, modes (manual/round-robin), history; integrates with submit flow.
- CONTEXT/SCENE/HELP: Context readouts, visual themes (lite0 default), help search with categories, and token budget utilities.

## Lite/Esolite Detection & Compatibility

- Detection: Treats presence of `#topbtn_data_manager`, `#openTreeDiagram`, `#topbtn_remote_mods` as Esolite indicators.
- Hooks: Makes `setupHooks` idempotent and wraps `submit_generation_button` only once; mirrors Lite nav text/buttons; copies connection status to RPmod bar.
- Bootstrap: Fallback bootstrap initializes even if host timing differs; tolerates missing DOM IDs; ensures init after short delay.

## Save System (Unified Behavior)

- Storage API: Uses Lite’s `indexeddb_save/load` when present; provides a direct IndexedDB adapter fallback (single store keyed by `STORAGE_PREFIX`).
- Keys Used: `rpmod_state`, `rpmod_characters`, `rpmod_visual_style`, `rpmod_autosave`, `rpmod_chat_settings`, `rpmod_chat_saves`, `rpmod_group_settings`, `rpmod_playrp_settings`, `rpmod_rp_rules`, `rpmod_story_chapters`, `rpmod_adv_actions`, `rpmod_unified_char_filters`.
- Autosave Hook: Wraps `window.autosave` to write a consolidated `rpmod_autosave` bundle keyed by a stable story hash.
- Embed Hook: Wraps `generate_savefile(...)` to embed `rpmod` bundle into host story saves without editing host sources.
- Restore Hook: Wraps `kai_json_load(...)` to restore `rpmod` bundle post-load (TOOLS/ROLES/SCENE/chat/UI state) without forcing host opmode.
- Consent: Write-guards default to “consented” (modal disabled in ALPHA); preserves host stability.

## Avatar Integration

- RPmod Chat Avatars: Renders avatars efficiently in RPmod’s own chat view without rewriting Lite’s DOM.
- Esolite Adapter: Auto-detects Esolite and installs a lightweight MutationObserver to set per-message avatars for newly inserted rows only; observer is scoped to chat containers (`#gametext`, `#chat-display`) to reduce overhead; no bulk reflows.
- Lite Experimental Mode: Optional toggle to enable the same new-nodes-only adapter on Lite classic UI; off by default for performance.
- Performance Constraints: Limits per-batch processing, uses a WeakSet to avoid rework, and resolves optimized avatar URLs (`avatar`/`thumbnail`) from CHARS cache to avoid blob churn.
- Persistence: Saves `ui.avatarPolicy` (esoliteAdapter, liteExperimental) with the bundle and restores it from both savefiles and autosave bundles; also persists `avatars.userCurrent/aiCurrent`.

## Persistence & State

- State Object: Persists tabs, collapse toggles, adventureMode, fullscreen, tabletSidepanel.
- Characters: Persist array with metadata; batch import mode optimizes writes; backward-compatible `image` retained alongside optimized images.
- Visual Style: Persisted theme and colors; defaults to `lite0` if unknown; restored at init.

## Generation Settings

- Sliders: Creativity (temperature/top_p), Focus (top_k/min_p), Repetition (rep_pen/range/slope), Max Length; synced across panels.
- Presets: Built-in presets write directly to `localsettings` with immediate UI sync; `save_settings()` invoked when available.

## Non-Functional

- Robustness: Guards around missing host APIs, DOM ids, and timing; idempotent hooks to prevent double wrapping.
- Performance: Token stats and UI sync performed incrementally; autosave is non-blocking and decoupled.
- Compatibility: Works with both Lite and Esolite forks; falls back to direct IndexedDB if Lite helpers absent.
- Security: User-provided values used in HTML templates are escaped to mitigate XSS vectors from imported character data.
- UX/Compat: Fullscreen layout includes a `.klite-fullscreen` class fallback so browsers without `:has()` render correctly.

## Developer Notes (Testing Targets)

- Verify tab sets reflect TOOLS/CONTEXT/SCENE/ROLES/HELP and CHARS/MEMORY/NOTES/WI/TEXTDB.
- Verify storage keys exist after first-run initialization and survive reloads.
- Verify `saveToLiteStorage/loadFromLiteStorage` both with and without `indexeddb_*` helpers.
- Verify autosave hook writes `rpmod_autosave` after `window.autosave()`.
- Verify generate/load hooks embed and restore `rpmod` bundle (UI state, ROLES participants, SCENE theme, TOOLS selections).
- Verify Esolite detection toggles extra RPmod topbar links when Esolite nav nodes are present.
- Verify avatar adapter processes rows appended under `#gametext` or `#chat-display`.
