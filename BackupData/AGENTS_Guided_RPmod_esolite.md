# AGENTS.md - Guided RPmod for Esolite

## Project Overview

**Guided_RPmod_esolite.js** is a beginner-friendly onboarding overlay for Esolite (KoboldAI Lite), designed to guide new users through setting up AI roleplay in 8 simple, interactive steps.

### Primary Goals

1. **Simplify AI Roleplay Setup** - Transform the complex Esolite interface into a guided, step-by-step experience
2. **Reduce Learning Curve** - Make AI roleplay accessible to complete beginners
3. **Maintain Flexibility** - Allow users to toggle between guided (Easy) and full (Advanced) modes
4. **Preserve State** - Save user progress through localStorage for seamless resumption
5. **Visual Appeal** - Create an engaging, modern UI with smooth animations and clear visual hierarchy

---

## Architecture

### File Structure

```
Guided_RPmod_esolite.js (3,923 lines, ~3MB with embedded image)
├── IIFE Wrapper (lines 1-3920)
│   ├── Constants & Configuration (lines 21-25)
│   ├── State Management (lines 27-50)
│   ├── Core Utilities (lines 52-180)
│   ├── CSS Styles (lines 182-3100)
│   ├── HTML Sections (lines 3102-3400)
│   ├── Event Handlers (lines 3402-3700)
│   └── Initialization (lines 3702-3920)
└── Global API Export (window.GuidedRPmod)
```

### Key Technologies

- **Vanilla JavaScript** - No external dependencies
- **CSS Grid & Flexbox** - Modern responsive layouts
- **CSS Variables** - Theme colors and consistent styling
- **localStorage** - Persistent state across sessions
- **IntersectionObserver** - Smart section tracking during scroll

---

## The 8-Section Journey

### Section 0: Introduction
- **Purpose**: Welcome screen with visual overview
- **Layout**: Image + text header, followed by staggered 7-step preview
- **Key Elements**:
  - 150x150px thumbnail (CSS variable `--img_theme_4`)
  - Gradient title: "Welcome to Esolite"
  - Staggered grid showing steps 1-7
- **File Location**: `createSection0()` ~line 844

### Section 1: Start Mode
- **Purpose**: Choose between "Start Fresh" or "Continue from Save"
- **Layout**: Two card selection
- **Actions**:
  - Start Fresh: Clears context, begins new session
  - Continue: Loads existing save file via file input
- **File Location**: `createSection1()` ~line 879

### Section 2: Connect AI
- **Purpose**: Select and configure AI backend
- **Options**:
  - AI Horde (with optional API key for priority)
  - KoboldCpp (local server)
  - Cloud Providers (OpenAI, Anthropic, etc.)
- **Key Feature**: Horde API key support stored in `state.config.apiKey`
- **File Location**: `createSection2()` ~line 920

### Section 3: Writing Style
- **Purpose**: Set generation parameters via preset templates
- **Options**: Chat, Normal, Creative
- **Storage**: `state.config.writingStyle`
- **File Location**: `createSection3()` ~line 1020

### Section 4: Your Persona
- **Purpose**: Create the user's character/persona
- **Methods**:
  - Manual entry (name + description)
  - Import from character card
- **Storage**: `state.config.persona` (name, description, avatar)
- **File Location**: `createSection4()` ~line 1080

### Section 5: Character
- **Purpose**: Import AI character card
- **Format**: JSON character cards (TavernAI/SillyTavern compatible)
- **Storage**: `state.config.character`
- **File Location**: `createSection5()` ~line 1160

### Section 6: Greeting
- **Purpose**: Select or write the first message
- **UI**: Large, readable carousel with left/right arrows to browse greetings
- **Sources**:
  - Character card default + alternate greetings (carousel)
  - Custom greeting input (overrides carousel)
- **Storage**: `state.config.firstMessage` (and `state.config.greetingIndex` for selection)
- **File Location**: `createSection6()` ~line 1220

### Section 7: Review & Start
- **Purpose**: Final overview before launching roleplay
- **Display**: Summary of all previous selections
- **Action**: "Start Roleplay" button transitions to simplified chat UI
- **File Location**: `createSection7()` ~line 1280

---

## State Management

### State Structure

```javascript
{
    initialized: false,           // Has the mod been initialized?
    modActive: false,             // Is the mod currently active?
    rpModeActive: false,          // Is RP mode enabled?
    welcomeShown: false,          // Has welcome been shown?
    currentSection: 0,            // Current section index (0-7)
    setupComplete: false,         // Has user completed all steps?
    easyMode: true,               // Easy (true) or Advanced (false) mode?

    config: {
        aiType: null,             // 'horde' | 'koboldcpp' | 'cloud'
        cloudProvider: null,      // Cloud provider if aiType is 'cloud'
        apiKey: '',               // Horde or cloud API key
        endpoint: '',             // KoboldCpp endpoint URL
        model: '',                // Model name
        writingStyle: 'normal',   // 'chat' | 'normal' | 'creative'

        persona: {
            name: '',             // User's persona name
            description: '',      // User's persona description
            avatar: null          // Base64 avatar image (optional)
        },

        character: null,          // Full character card JSON
        firstMessage: ''          // Selected or custom greeting
    }
}
```

### Storage Key

- **localStorage key**: `guidedRPmod`
- **Saved on**: Every state change via `saveState()`
- **Loaded on**: Page load via `loadState()`

---

## Key CSS Classes and Conventions

### Naming Convention
- **Prefix**: All classes use `grp-*` (Guided RPmod)
- **Example**: `.grp-section`, `.grp-nav`, `.grp-card`

### Important CSS Variables

```css
--grp-bg: Background color
--grp-text: Primary text color
--grp-accent: Accent color (buttons, borders)
--grp-card-bg: Card background
--grp-card-border: Card border color
--grp-radius: Border radius (12px)
--grp-radius-sm: Small radius (8px)
--img_theme_4: Role Play thumbnail (base64 PNG)
```

### Layout Structure

```
body.grp-mode
└── #grp-overlay
    ├── .grp-header (navigation dots)
    ├── .grp-container
    │   └── .grp-sections-scroll
    │       ├── section.grp-section[data-section="0"]
    │       ├── section.grp-section[data-section="1"]
    │       └── ... (sections 2-7)
    └── nav.grp-nav (bottom navigation)
```

---

## Navigation System

### Dot Navigation
- **Location**: Top of overlay
- **Function**: Jump to any section
- **Visual States**:
  - Active: Highlighted with accent color
  - Completed: Shows checkmark (✓)
  - Available: Default style
  - Unavailable: Dimmed

### Button Navigation
- **Next Button**: `.btn-next` - Advances to next section
- **Back Button**: `.btn-back` - Returns to previous section
- **Validation**: Next button disabled until section requirements met

### Scroll-Based Tracking
- Uses **IntersectionObserver** to detect which section is visible
- Automatically updates active dot indicator
- Triggers section-specific event bindings

---

## Integration with Esolite

### EsoliteBridge Module

The `EsoliteBridge` (lines ~200-400) handles all communication with Esolite:

```javascript
EsoliteBridge.applyAIConfig()        // Apply AI backend settings
EsoliteBridge.applyPersona()         // Set user persona
EsoliteBridge.applyCharacter()       // Load character card
EsoliteBridge.applyFirstMessage()    // Set initial greeting
EsoliteBridge.startGeneration()      // Begin AI generation
```

### Key Esolite Functions Used

- `window.restart_new_game(clearContext, keepSettings)` - Reset session
- `window.selected_model` - Currently selected model
- `window.eso.forceCompleteHideOfCorpoLeftPanel` - Hide/show left panel
- `window.render_gametext()` - Refresh UI
- `localsettings.my_api_key` - Horde API key storage

---

## Header Buttons

Two emoji buttons are added to Esolite's navigation bar:

### 🎭 Easy/Advanced Toggle
- **Function**: Toggles between Easy (simplified chat) and Advanced (full UI) modes.
- **Behavior**:
  - If not yet in RP mode: enters Easy mode and shows the simplified chat.
  - If in Easy mode: switches to Advanced mode (removes simplified header).
  - If in Advanced mode: switches back to Easy mode (recreates simplified header, reapplies avatar/name).
  - Note: This button does not open the guided setup overlay.

### ✨ Start New Guided RPmod
- **Function**: Starts fresh guided setup (shows overlay, Step 0).
- **Behavior**:
  - Warns if unsaved progress exists.
  - Clears state and shows Section 0.
  - Calls `restart_new_game(true, false)`.

---

## Easy vs Advanced Mode

### Easy Mode (Default)
- **UI**: Simplified chat interface
- **Features**:
  - Clean message bubbles
  - Hidden Esolite controls
  - Large, readable text
  - "Advanced Mode" button (⚙️) in header

### Advanced Mode
- **UI**: Full Esolite interface
- **Features**:
  - All Esolite controls visible
  - Left panel restored
  - "Return to Easy Mode" button (📖) in header

### Toggle Mechanism
```javascript
switchToEasyMode()    // Ensure/recreate simplified header, bind buttons, reapply avatar/name
switchToAdvancedMode() // Remove simplified header, show full Esolite UI
```

### Avatar Persistence
- When switching from Advanced ➜ Easy, the simplified header is recreated and the character avatar/name are reapplied from `state.config.character`.
- This prevents the `#chat-avatar` element from losing its `src` after UI toggles or reloads.

---

## Working with This Project

### Common Tasks

#### 1. Adding a New Section
```javascript
// Step 1: Create section HTML
createSection8() {
    return `<section class="grp-section" data-section="8">
        <!-- Your content -->
    </section>`;
}

// Step 2: Add to sections array
const sections = [
    this.createSection0(),
    // ... existing sections
    this.createSection8()
];

// Step 3: Create event handler
bindSection8() {
    // Bind your events
}

// Step 4: Update navigation
// Add 9th dot to navigation HTML
```

#### 2. Modifying Styles
- All styles are in the `<style>` block (lines 182-3100)
- Use CSS variables for colors/spacing
- Follow `.grp-*` naming convention
- Test in both light/dark themes

#### 3. Changing State
```javascript
// Always use saveState() after modifying state
state.currentSection = 2;
saveState();

// Or use helper functions
goToSection(2);
```

#### 4. Updating Images
```python
# Use the provided Python scripts:
python3 convert_image_to_css.py your_image.png img_theme_4
python3 update_image.py
```

### Important Files

- **Guided_RPmod_esolite.js** - Main mod file
- **convert_image_to_css.py** - Converts images to CSS variables
- **update_image.py** - Updates image in JS file
- **GUIDED-RPMOD-COMPLETE.md** - Project documentation
- **AGENTS.md** - This file

---

## Design Principles

### 1. Progressive Disclosure
- Show only what's needed at each step
- Reveal complexity gradually
- Use expandable sections for advanced options

### 2. Visual Feedback
- Immediate response to user actions
- Loading states for async operations
- Success/error messages
- Progress indicators

### 3. Forgiving UX
- Allow going back to previous steps
- Auto-save progress
- Confirm destructive actions
- Provide clear error messages

### 4. Accessibility
- Semantic HTML structure
- Keyboard navigation support
- High contrast colors
- Clear focus states

### 5. Performance
- Minimal dependencies (vanilla JS)
- Efficient event delegation
- IntersectionObserver for scroll tracking
- Debounced input handlers

---

## Debugging

### Debug Mode
```javascript
// Enable logging
const DEBUG = true; // Line 24

// View state in console
GuidedRPmod.state

// Test functions
GuidedRPmod.toggleUI()
GuidedRPmod.startNew()
GuidedRPmod.showSetup()
```

### Common Issues

**1. Sections not navigating**
- Check EventHandlers.init() was called
- Verify all 8 sections exist in DOM
- Check scroll container class

**2. State not persisting**
- Check localStorage quota
- Verify saveState() is called
- Check browser console for errors

**3. Buttons not appearing**
- Verify `#navbarNavDropdown > ul` exists
- Run `GuidedRPmod.showButtons()` in console
- Check header structure matches Esolite's

**4. Image not loading**
- Verify `--img_theme_4` CSS variable exists
- Check base64 data is complete
- Test with smaller placeholder image

**5. Special characters look wrong (e.g., `\'`, `` ` ``, `´`)**
- PNG TavernCard decoding uses UTF‑8 for the embedded JSON; the extractor decodes base64 bytes with `TextDecoder('utf-8')` to preserve all characters.
- Ensure your card JSON actually contains UTF‑8 text; importing via JSON files is read in UTF‑8 by default.

---

## API Reference

### Global API: `window.GuidedRPmod`

```javascript
// Properties
GuidedRPmod.version           // "3.0.0"
GuidedRPmod.state             // Current state object

// Main Actions
GuidedRPmod.toggleUI()        // Toggle overlay on/off
GuidedRPmod.startNew()        // Start new session with warning

// Mode Control
GuidedRPmod.startGRPMode()    // Enable RP mode, show overlay
GuidedRPmod.hideGRPMode()     // Disable RP mode

// Utilities
GuidedRPmod.clearState()      // Clear all saved state
GuidedRPmod.showSetup()       // Show setup overlay
GuidedRPmod.showButtons()     // Show header buttons
GuidedRPmod.hideButtons()     // Hide header buttons
```

---

## Version History

### v3.0.0 (Current)
- Complete refactor from "Beginner Esolite" to "Guided RPmod"
- Expanded from 5 to 8 sections
- Added Horde API key support
- Removed welcome popup dependency
- Added header buttons for direct access
- Improved navigation with scroll tracking
- Enhanced visual design

### v2.0.0
- Original "Beginner Esolite" implementation
- 5-section setup flow
- Welcome popup integration
- Basic state management

---

## Future Considerations

### Potential Enhancements
- Multi-language support
- Theme customization (colors, fonts)
- Export/import of complete setups
- Guided tour tooltips
- Voice input for persona/character creation
- Built-in character gallery
- Community preset sharing

### Known Limitations
- Single-user focus (no multi-user support)
- Requires Esolite's existing infrastructure
- Large file size due to embedded base64 image
- No mobile optimization (desktop-first design)

---

## Contributing Guidelines

When modifying this project:

1. **Maintain consistency** - Follow existing naming conventions
2. **Test thoroughly** - Verify all 8 sections work correctly
3. **Update documentation** - Keep AGENTS.md and GUIDED-RPMOD-COMPLETE.md in sync
4. **Preserve state compatibility** - Ensure state migrations if structure changes
5. **Comment complex logic** - Explain non-obvious code decisions
6. **Validate syntax** - Run `node -c Guided_RPmod_esolite.js` before committing

---

## Quick Reference

### File Locations (Line Numbers)

| Component | Lines |
|-----------|-------|
| Constants | 21-25 |
| State | 27-50 |
| CSS Variables | 1425-1435 |
| Section Styles | 2580-2900 |
| Section HTML | 844-1400 |
| Event Handlers | 3402-3700 |
| Initialization | 3702-3920 |
| EsoliteBridge | 200-400 |

### Key Selectors

| Element | Selector |
|---------|----------|
| Overlay | `#grp-overlay` |
| Sections Container | `.grp-sections-scroll` |
| Individual Section | `.grp-section[data-section="N"]` |
| Navigation Dots | `.nav-dots button` |
| Header Buttons | `#grp-toggle-btn`, `#grp-new-btn` |
| Simplified Chat | `.grp-easy-mode` |

---

## Support & Resources

- **Project Documentation**: GUIDED-RPMOD-COMPLETE.md
- **Esolite Repository**: [KoboldAI Lite](https://github.com/LostRuins/lite.koboldai.net)
- **Character Card Format**: TavernAI/SillyTavern compatible JSON

---

**Last Updated**: 2024-12-14
**File Version**: 3.0.0
**Maintained by**: AI Development Team
