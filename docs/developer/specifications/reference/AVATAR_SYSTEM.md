# Avatar System (Simplified Overrides)

This document defines KLITE‑RPmod’s avatar behavior and integration with KoboldAI Lite.

## Overview

KLITE‑RPmod no longer parses message text or injects avatar `<img>` elements. Instead, it sets KoboldAI Lite’s own avatar variables and relies on the platform to render images naturally.

- `window.human_square`: the user’s avatar
- `window.niko_square`: the AI’s avatar

Styling for these images is applied post‑render to ensure a consistent circular appearance.

## Rules

1) User avatar (`human_square`)
- If a persona is selected in PLAY → RP, use that character’s avatar.
- Otherwise, use the NEW user default data‑URI.

2) AI avatar (`niko_square`)
- In single chat modes with a selected character, use that character’s avatar.
- In group chat or when no character is selected, use the robot default.

3) Styling
- All images whose `src` equals `human_square` or `niko_square` are styled:
  - `object-fit: cover`
  - `border: 2px solid #5a6b8c`
  - `border-radius: 50%`

## Implementation

Primary methods:
- `applyAvatarOverrides()` — resolves and applies `human_square`/`niko_square` and re-renders.
- `styleLiteAvatarImages()` — post-styles any matching `<img>` elements.

Called automatically:
- On init, group mode toggle, and persona/character changes.

## Migration Notes

- Removed: message regex parsing, DOM avatar injection, “pending speaker” queues.
- Tests updated to assert correct global overrides and circular styling.
- Requirements updated: REQ‑F‑080 reflects the simplified approach and styling.

