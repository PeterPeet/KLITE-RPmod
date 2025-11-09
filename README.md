# KLITE RPmod (BETA)

KLITE RPmod is an enhancement layer for KoboldAI Lite/Esolite that adds advanced roleplay tools, organized panels, and a fast save/restore system — without replacing the host UI. It can run as a user-mod injected via Lite’s Advanced Settings.

## Highlights
- Panels: TOOLS, CONTEXT, SCENE, ROLES, HELP (left) and CHARS, MEMORY, NOTES, WI, TEXTDB (right)
- Save/Load: Embeds RPmod data in host saves; persists `rpmod_*` keys via Lite/IndexedDB
- ROLES: Multi‑speaker trigger modes with correct context/tail injection
- Author’s Note: Correct mode detection (Story/Chat/RP/Adventure) and smart settings
- Avatars: RPmod chat avatars are fast; Esolite adapter auto‑updates per message; Lite experimental toggle available

## Install (User‑Mod in Lite)
1) In KoboldAI Lite, open Advanced Settings → “Apply User Mod”
2) Paste the contents of `KLITE-RPmod_ALPHA.js` (or link to a hosted copy)
3) Confirm to activate

Tip: You can switch between classic UI and RPmod from the RPmod top menu.

## Avatar Integration
- Esolite: Detected automatically. An avatar adapter updates only newly inserted chat rows within the chat container (no slow bulk sweeps across the whole document).
- Lite (optional): Enable the experimental toggle in TOOLS → “Avatar Adapter”. Same new‑nodes‑only approach scoped to chat containers.
- Policy persists across saves; RPmod’s own chat format always shows avatars efficiently.

## Testing
Open `Tests/Test_Runner_FunctionalTests.html` in a browser. It runs functional and integration tests covering:
- Save/load embedding and Lite storage
- ROLES triggers (round‑robin/keyword/talkative) and `chatopponent` behavior
- Author’s Note mode detection and smart settings persistence
- Avatar policy persistence, name mapping, and new‑row DOM updates

## Notes
- Fullscreen layout now includes a class‑based fallback (`.klite-fullscreen`) for browsers without `:has()` support; the script toggles this class on the container.
- Console restoration is gated: set `window.KLITE_RPMod_Config = { enableConsoleRestore: true }` before loading, or `localStorage['rpmod_enable_console_restore']='1'` to enable.
- User‑provided values interpolated in HTML templates are escaped for safety.

Export results from the page for a detailed JSON report.

## Docs
- Developer requirements are in `docs/developer/REQUIREMENTS.md` (kept in sync with ALPHA).
- See `AGENTS.md` for a developer‑oriented overview and test notes.

## Support
Come say hi on Discord: https://discord.gg/koboldai
