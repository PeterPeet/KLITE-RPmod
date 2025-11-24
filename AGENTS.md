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

## Files of interest
- `AGENTS.md` - this file
- `KLITE-RPmod_ALPHA.js` – main implementation (~18k+ lines)
- `Esobold Esolite a fork of KoboldAI Lite` – Folder with the Esolite UI. It's mainly a monolithic html and javascript index.html with most of the code only some css and javascripts are in subfolders and included at the very end of index.html. That are mostly the Esolite specific parts of the fork. All Lite code is in the index.html. 
- `Esobold Esolite a fork of KoboldAI Lite/static/js/`- important JS extensions making Esolite
- `Esobold Esolite a fork of KoboldAI Lite/static/js/characterManager.js` - Data manager functions from Esolite, most relevant backend file for our integration 

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
