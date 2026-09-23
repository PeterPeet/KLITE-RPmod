# Proposal for Esolite: Quick Start extension hook

*For Jaxxks (Esolite / Esobold maintainer), from the KLITE RPmod project, 2026-09-23.*

**Status:** implemented as commit `78e971ffb` on branch `quickstart-extensions` (based on
`remoteManagement` @ `2c3aed53d`), one file: `embd_res/js/characterManager.js` (+74 lines).
Verified in the browser: with RPmod the section appears via the hook, counts in "Selected
items", applies after the built-in roles and is cleared by "Clear all"; without RPmod
Quick Start is unchanged (same sections, no errors). Pushed to
`PeterPeet/esobold:quickstart-extensions` (1 commit ahead of `esolithe/esobold:remoteManagement`);
pull request to be opened by the owner.

## Why

Esolite's **Quick Start** (`static/js/characterManager.js`) is the natural place for a user
to begin a session. RPmod does not want a competing setup wizard (our old GuidedRP overlay is
retired). Instead RPmod adds one optional section, **"RPmod world"**, to Quick Start: pick a
world (e.g. the example "Eldoria"), Confirm, and RPmod enables it after Esolite has loaded
the save/characters/world info.

Today RPmod does this with an **adapter**: it wraps the top-level bindings
`showQuickStartPopup`, `applyQuickStartSelection` and `clearAllQuickStartSelections`, appends
its section to `popupUtils.contentElem` using your markup (`quick_start_preview_grid`,
`quick_start_preview_tile`, `helpicon`), and runs its apply after yours. It works, but it
depends on internal names. A tiny official hook would make it robust for both projects, and
other mods could use it too.

## Proposed API (small, optional)

```js
// characterManager.js
let quickStartExtensionList = []
window.quickStartExtensions = {
    // ext = { id, label, helpText,
    //         render(containerElem, rerender),   // build the section body
    //         hasSelection(),                   // counts as a selection for Confirm
    //         apply(): Promise,                 // runs after the built-in roles
    //         clear() }                         // "Clear all"
    register(ext) {
        if (!ext?.id || quickStartExtensionList.some(e => e.id === ext.id)) return
        quickStartExtensionList.push(ext)
    }
}
```

Four touch points in the existing code:

1. **`showQuickStartPopup`** — after the built-in `addChooserSection(...)` calls:
   ```js
   quickStartExtensionList.forEach(ext => {
       let body = document.createElement("div")
       body.style = "width: 100%; display: flex; flex-direction: column; gap: 8px;"
       try { ext.render(body, showQuickStartPopup) } catch (e) { console.error(e); return }
       createQuickStartSection(ext.label, ext.helpText || "", body)
   })
   ```
2. **`doesQuickStartHaveSelections`** — also `|| quickStartExtensionList.some(e => e.hasSelection())`.
3. **`applyQuickStartSelection`** — after world info, inside the existing `try`:
   ```js
   for (let ext of quickStartExtensionList) {
       if (!ext.hasSelection()) continue
       try { await ext.apply() }
       catch (e) { nonFatalErrors.push(`${ext.label}: ${e?.message || e}`); console.error(e) }
   }
   ```
4. **`clearAllQuickStartSelections`** — also `quickStartExtensionList.forEach(e => e.clear?.())`.

RPmod already checks for `window.quickStartExtensions.register` first and only falls back to
the adapter when it is missing (`src/onboarding/quickStart.js`), so nothing breaks either way.

## A newcomer observation (for your consideration)

For a brand-new user the Library is empty, so Quick Start shows five "(none selected)" slots
and nothing explains how to get content in. A short line or button there — "Your Library is
empty: import a character card, or pick a Scenario" (linking to `#loadfileinput` /
`display_scenarios()`) — would make Quick Start a complete first step on its own. RPmod's
Guide points newcomers to Quick Start and would profit from that too.
