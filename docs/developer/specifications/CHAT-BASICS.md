# Basic Chat – User Story, Use Cases, Requirements

## User Story
- As a user, I type a prompt and press `Send`.
- The `Send` button switches to an in-progress state (e.g., `Abort`).
- After the AI responds, the new message appears in chat.
- The input field is cleared and ready for the next prompt.
- The `Send` button returns to the idle state (`Send`).

## Primary Use Cases
- Submit a single prompt and receive a single AI response.
- Abort an in-flight generation and return to idle safely.
- Edit mode: toggle editing, make changes, save once back to the underlying store.
- Switch roles/modes without resetting chat or causing extra refreshes.

## Non-Goals (Out of Scope Here)
- Advanced group chat behavior beyond avatar display.
- Rich message operations (multi-select, drag/drop) or batch operations.

## Functional Requirements
- R1: Submitting a prompt sets a “generating” state and toggles the submit button to `Abort`.
- R2: When a response arrives (render completes), “generating” resets to `false` and the submit button returns to `Send`.
- R3: The input field is cleared immediately after submit to accept the next prompt.
- R4: New chat output appears without re-render loops; existing content is preserved.
- R5: Avatar decoration runs once per newly rendered message; no polling or cyclic updates.
- R6: No autosave loop: the chat view must not continuously rewrite the underlying content.

## Quality/UX Requirements
- Q1: Auto-scroll only when the user was already at the bottom prior to the new message.
- Q2: No flicker or button state resets outside of true state changes.
- Q3: Mobile/Desktop modes keep identical state behavior; only layout differs.

## Implementation Notes (Current Architecture)
- Hook `render_gametext` once to detect new content and then mirror into `#chat-display`.
- Mirror logic must be idempotent and gated by content signature:
  - Compute a quick hash of `#gametext.innerHTML` and only update `#chat-display` if the signature changed.
  - Do not call `render_gametext` from the mirror function (prevents feedback loops).
- Avatar images are controlled via Lite variables (`human_square`, `niko_square`).
  - Only update these variables when persona/character changes.
  - Never schedule timer-based avatar re-writes of chat DOM.

## Acceptance Criteria
- AC1: Pressing `Send` immediately clears input and button shows `Abort` during generation.
- AC2: After AI replies, chat shows the new message once, input is empty, button shows `Send`.
- AC3: No continuous “autosave pending” loop when idle.
- AC4: Avatars appear correctly and do not cause cyclic refreshes.

