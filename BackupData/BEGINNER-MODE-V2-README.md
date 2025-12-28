# Beginner Esolite v2.0 - Welcome Popup Integration

## Overview

This is a complete redesign of the beginner mode implementation that integrates with Esolite's native Welcome Popup.

## What Changed

### Old Behavior (beginner-esolite.js)
- Mod showed its own landing page immediately
- Reset completely cleared all settings and removed the mod
- No integration with Esolite's Welcome Popup

### New Behavior (beginner-esolite-v2.js)
- When mod activates → Shows Esolite's Welcome Popup
- Role Play mode selection → Starts beginner mode overlay
- Other modes → Shows "Switch to Beginner Mode" button
- Reset → Works like "New Session" (calls `restart_new_game(true, false)`)
- Mod persists across resets

## Implementation

### Key Files

1. **beginner-esolite-v2.js** - New mod implementation
2. **Esobold Esolite a fork of KoboldAI Lite/index.html** - Target Esolite installation
3. **Esolite-Prototype-old.html** - Source of Welcome Popup with Role Play option

### How It Works

#### 1. Initialization Flow

```
Page Load
    ↓
Mod Initializes
    ↓
Check State
    ↓
    ├─→ First Run? → Show Welcome Popup
    ├─→ Beginner Mode Active? → Resume Beginner Mode
    └─→ Mod Active? → Show Switch Button
```

#### 2. Welcome Popup Selection

```
Welcome Popup Shown
    ↓
User Selects Mode
    ↓
    ├─→ Role Play (value="4") → Start Beginner Mode Overlay
    └─→ Other Modes → Show "Switch to Beginner Mode" Button
```

#### 3. Reset/New Session

```
User Clicks Reset/New Session
    ↓
Call restart_new_game(true, false)
    - true = Keep AI settings
    - false = Clear context/memory
    ↓
Show Welcome Popup Again
```

## Integration Instructions

### Step 1: Add CSS Variable for Role Play Thumbnail

The Welcome Popup needs the `--img_theme_4` CSS variable defined. Extract it from Esolite-Prototype-old.html line 90:

```bash
sed -n '90p' "Esolite-Prototype-old.html" > img_theme_4_css.txt
```

Then add it to the `<style>` section in your target Esolite index.html.

### Step 2: Include the Mod Script

Add to the end of your `Esobold Esolite a fork of KoboldAI Lite/index.html`:

```html
<script src="../beginner-esolite-v2.js"></script>
```

Or inline the script content directly.

### Step 3: Verify Welcome Popup Exists

Make sure your target Esolite has the Welcome Popup with Role Play option:
- Check for `id="welcomecontainer"`
- Verify Role Play option: `<input name="welcometheme" value="4">`
- Ensure `show_welcome_panel()` function exists

### Step 4: Test the Flow

1. Clear localStorage: `localStorage.removeItem('beginnerEsolite')`
2. Reload page
3. Welcome Popup should appear
4. Select "Role Play" → Should trigger beginner mode
5. Select "Classic" → Should show switch button
6. Click "New Session" → Should reset and show popup again

## TODO: Integration of Full Beginner Mode Overlay

The current v2 implementation is a skeleton. You still need to:

1. **Extract the full overlay code** from original `beginner-esolite.js`:
   - Landing page HTML/CSS (lines ~500-2000)
   - All UI components (character import, AI setup, etc.)
   - Event handlers

2. **Integrate into v2**:
   - Replace `startBeginnerMode()` placeholder with actual overlay
   - Import all necessary functions from original file
   - Ensure compatibility with new state management

3. **Add missing CSS**:
   - Copy `STYLES` constant from original beginner-esolite.js
   - Add `--img_theme_4` CSS variable
   - Merge with WELCOME_POPUP_STYLES

## API Reference

### Global Object: `window.BeginnerEsoliteV2`

```javascript
// Get version
BeginnerEsoliteV2.version // "2.0.0"

// Get current state
BeginnerEsoliteV2.state
// {
//   initialized: boolean,
//   modActive: boolean,
//   beginnerModeActive: boolean,
//   welcomeShown: boolean,
//   easyMode: boolean
// }

// Functions
BeginnerEsoliteV2.newSession()        // Start new session (like Esolite's New Session)
BeginnerEsoliteV2.showWelcome()       // Show Welcome Popup
BeginnerEsoliteV2.startBeginnerMode() // Activate beginner mode overlay
BeginnerEsoliteV2.hideBeginnerMode()  // Hide beginner mode overlay
BeginnerEsoliteV2.clearState()        // Clear all mod state
```

## State Management

State is saved to `localStorage` with key `'beginnerEsolite'`:

```javascript
{
  initialized: false,      // Whether mod has initialized
  modActive: false,        // Whether mod is active
  beginnerModeActive: false, // Whether beginner overlay is shown
  welcomeShown: false,     // Whether welcome popup has been shown
  easyMode: true          // Easy vs advanced mode (for future use)
}
```

## Known Limitations

1. **Placeholder Alert**: `startBeginnerMode()` currently shows an alert instead of the full overlay
2. **No Overlay Code**: Full beginner mode overlay needs to be integrated from original file
3. **Missing Thumbnails**: Need to copy welcome theme thumbnail images from Esolite-Prototype
4. **Fallback Popup**: Custom fallback welcome popup is basic and could be enhanced

## Next Steps

1. Extract and integrate full beginner mode overlay from original beginner-esolite.js
2. Add all required CSS variables (especially --img_theme_4)
3. Test on actual Esolite installation
4. Handle edge cases (missing functions, incompatible Esolite versions)
5. Add error handling and user feedback
6. Document for end users

## File Structure

```
KLITE-RPmod/
├── beginner-esolite.js          # Original implementation
├── beginner-esolite-v2.js       # New implementation (this version)
├── BEGINNER-MODE-V2-README.md   # This file
└── Esobold Esolite a fork of KoboldAI Lite/
    └── index.html               # Target file for integration
```

## Questions?

Check the source code comments in `beginner-esolite-v2.js` for detailed implementation notes.
