# KLITE RPmod – Developer Guide (BETA)

This repo contains the monolithic ALPHA implementation of KLITE RPmod. It enhances KoboldAI Lite based fork Esobold Esolite with roleplay tooling, while maintaining compatibility with Esolite as the host UI and storage.

## Core Principles
- Enhance, don’t replace: integrate with Esolite APIs (e.g., `localsettings`, IndexedDB helpers) and avoid invasive DOM rewrites.
- Host-agnostic: auto-detect Esolite and it's functions for the mod to work properly.
- Performance-first: incremental updates, idempotent hooks, and guarded observers.
- NEVER loose savegames or characters of the user. We must always try to keep those save when doing changes on the mod or bugfixes. When we change things on the save system we need to test carefully.

## Goals
- View, create, edit characters (in CHARS Panel)
- Select Persona and character or build a group (in ROLES Panel)
- Have some tools that help with general things, the context and images (in TOOLS, CONTEXT, IMAGES Panels)

## What’s implemented
- Right Panels: CHARS, ROLES, TOOLS, CONTEXT, IMAGES
- Right panel can collapse or expand. Also can be set to a mode where it overlays or thins the chat window down by the user in advanced settings after load.
- Integrates into Esolite's functions and storage as much as possible.
- Tools and Context Panels give standalone Tools for interaction with the chat history, general tools or interacting with the context of the chat.
- Images is a direct way to create images from the chat.
- Character gallery, Filters, Editor and Dialogue to sho details and export and edit the characters.
- Wyvern Worlds system (in `KLITE-RPmod_Worlds.js` + `KLITE-RPmod_WorldsUI.js`): a graph/state world model (Locations/NPCs/Factions/Objects/Events + timeline/runtime state) that replaces keyword lore with location/time-scoped retrieval, driven by a node-graph editor overlay. See Build & Packaging and the Worlds integration notes below.

## Security & Sanitization (Hardening Summary)

To prevent execution of arbitrary HTML/JS embedded in character data and to avoid untrusted network requests, the following changes are in place:

- Text escaping everywhere: All character-sourced fields render using escaping, e.g. `KLITE_RPMod.escapeHtml(...)` or `KLITE_RPMod.panels.CHARS.escapeHTML(...)`. This applies to names, creator, tags, descriptions, personalities, scenarios, notes, example messages, system/jailbreak/depth prompts, greetings, and WorldInfo entries/keys.
- Safe images: External images no longer auto-load. Use `KLITE_RPMod.safeImageHTML(url, alt, style)` which:
  - Auto-loads only `data:` and `blob:` URLs.
  - For `http/https` URLs shows a placeholder and a “Load image” button. A delegated click handler (`data-action="rpmod-load-image"`) replaces the placeholder with an `<img>` using `referrerpolicy="no-referrer"`.
  - This is applied across CHARS gallery/list/detail, selection modals, persona/character cards, group list, editor preview, and detail prefetch/upgrade paths.
- Tag safety: Tag pills, lists, and dropdown options escape both attribute and text values.
- Misc UI: Chapter titles in the timeline, greeting selection previews, and WorldInfo JSON modal headers are escaped.
- Overlay chat mirror: In panels-only mode it’s unused; if overlay chat mirroring is enabled, be aware it copies host chat HTML. Consider disabling it or sanitizing if reactivated.

### Developer guidance for future changes
- Never insert untrusted strings with `innerHTML` (or template interpolation) unless explicitly escaped. Prefer `textContent` for plain text.
- For any new images, route through `KLITE_RPMod.safeImageHTML` (or equivalent) to avoid silent external requests.
- If you introduce links from user/character content, set `rel="noopener noreferrer"` and consider confirmation before navigation.
- Keep this security model consistent in all panels (CHARS/ROLES/TOOLS/etc.). When in doubt, escape first.

## Files of interest
- `AGENTS.md` - this file
- `KLITE-RPmod_ALPHA.js` – main implementation (~18k+ lines)
- `KLITE-RPmod_Worlds.js` – Wyvern Worlds engine (graph/state world model, retrieval, compile-to-WI injection, simulation, import/export). Self-contained; exposes `window.KLITE_RPMod_Worlds`.
- `KLITE-RPmod_WorldsUI.js` – Worlds node-graph editor overlay + floating runtime panel + navbar button. Depends on `window.KLITE_RPMod_Worlds`; exposes `window.KLITE_RPMod_WorldsUI`.
- `Guided_RPmod_esolite.js` – Guided onboarding wizard mod (separate namespace `window.GuidedRPmod`).
- `build_KLITE-RPmod.js` – build script that concatenates the source modules into the single shippable `KLITE-RPmod.js` (see Build & Packaging below).
- `KLITE-RPmod.js` – GENERATED single-file usermod bundle. Do NOT edit by hand; edit the sources and re-run the build.
- `Esobold Esolite a fork of KoboldAI Lite` – Folder with the Esolite UI. It's mainly a monolithic html and javascript index.html with most of the code only some css and javascripts are in subfolders and included at the very end of index.html. That are mostly the Esolite specific parts of the fork. All Lite code is in the index.html. 
- `Esobold Esolite a fork of KoboldAI Lite/static/js/`- important JS extensions making Esolite
- `Esobold Esolite a fork of KoboldAI Lite/static/js/characterManager.js` - Data manager functions from Esolite, most relevant backend file for our integration 

## Build & Packaging
Esolite's mod manager imports exactly ONE JavaScript file, so the mod ships as a single combined usermod, `KLITE-RPmod.js`, generated from the source modules.

- Build command (run from the project root after editing any source module):
  - `node build_KLITE-RPmod.js`
- What it does: reads the sources listed in the `MODULES` array of `build_KLITE-RPmod.js`, wraps each in its own `try { ... } catch` block (so one module's runtime error can't stop the others), and writes `KLITE-RPmod.js` with banner comments.
- Load order (as concatenated by the build):
  1. `KLITE-RPmod_ALPHA.js`   (main mod core – `window.KLITE_RPMod`)
  2. `Guided_RPmod_esolite.js` (onboarding – `window.GuidedRPmod`)
  3. `KLITE-RPmod_Worlds.js`   (Worlds engine – must load before its UI)
  4. `KLITE-RPmod_WorldsUI.js` (Worlds editor UI)
- Why it works: every source is a self-contained IIFE with no top-level `return`, so concatenation into one `new Function` body (how Esolite runs usermods) is scope-safe. Cross-module references go through `window.*`, never bare identifiers.
- To add/remove a module (e.g. drop Guided) edit the `MODULES` array in `build_KLITE-RPmod.js` and rebuild — no other changes needed.
- Sanity checks after building: `node --check KLITE-RPmod.js` (syntax). The Worlds modules are unit-testable in Node/jsdom by stubbing the host globals (`current_wi`, `gametext_arr`, `generate_savefile`, `kai_json_load`, `prepare_submit_generation`, `update_wi`).
- Workflow: edit a source module → `node build_KLITE-RPmod.js` → load/refresh `KLITE-RPmod.js` in Esolite. NEVER hand-edit `KLITE-RPmod.js`; changes there are overwritten on the next build.

### Worlds integration notes (for future changes)
- Injection is "compile-to-WI": the engine computes an active world slice and writes it into the host's `current_wi` as `constant:true` entries tagged `wigroup:'__worlds__'`, letting Esolite's own prepare/submit engine inject them. Default `injectMode` is `transient` (entries added before a generation, removed after when the submit chain is synchronous i.e. websearch off); `persistent` keeps them live. Entries are always stripped from savefiles.
- `submit_generation` is a host `const` and CANNOT be wrapped; hook `prepare_submit_generation` (a `window` function) instead. `current_wi`/`gametext_arr` are `var` (on `window`); `generate_savefile`/`kai_json_load`/`prepare_submit_generation`/`update_wi` are `function` decls (on `window`).
- Per-story Worlds runtime state persists via the host savefile object under the key `rpmod_worlds` (engine wraps `generate_savefile`/`kai_json_load`). The static world library persists in IndexedDB under `KLITE_WORLDS_LIBRARY`.

## Addition
- `Esobold Esolite a fork of KoboldAI Lite` now has an old and a new version in the project folder. The new folder holds the newest version, the old version the Esolite we initially developed against.

## Debugging (Topic-based)
- Enable fine-grained debug logs without modifying the host UI.
- Toggle topics via console or localStorage:
  - Console helpers (persist via localStorage):
    - `KLITE_RPDebug.on('chat,network,storage,narrator')` — enable selected topics.
    - `KLITE_RPDebug.off('network')` — disable selected topics.
    - `KLITE_RPDebug.all()` / `KLITE_RPDebug.none()` — enable all / disable all.
    - `KLITE_RPDebug.list()` — print current topic map.
  - Direct localStorage keys:
    - `localStorage.setItem('KLITE.debug.topics', 'chat,network,storage,narrator')`
    - `localStorage.setItem('KLITE.debug.off', 'network')`

### Topics
- `essential`: init and critical paths (always useful)
- `chat`: message flow (inputs, submit, routing)
- `narrator`: narrator trigger details and prompt preview
- `storage`: Lite/IndexedDB saves/loads, sizes, memory/context writes
- `network`: `fetch` calls (URLs + light body preview)
- `esolite`: `localsettings` writes and host-side state changes
- `panels`, `group`, `avatars`, `chars`, `generation`, `state`, `hooks`, `ui`, `mobile`, `integration`, `hotkeys`, `status`

### What’s instrumented
- Esolite chat submit path: `chat_submit_generation`, `prepare_submit_generation`, `submit_generation`.
- Message sender: `sendTextToEsolite` (mode, length, target call).
- Narrator: style/focus + full prompt preview (truncated).
- Storage: `saveToLiteStorage`, `loadFromLiteStorage`, `indexeddb_save/load` (keys, sizes).
- Globals: watchers for `current_memory`, `current_temp_memory`, `current_anote`, `pending_context_preinjection/postinjection` with length + preview.
- Chat array: `gametext_arr` operations (`push`, `splice`, ...).
- Network: global `fetch` wrapper with URL + light body preview (headers redacted).
