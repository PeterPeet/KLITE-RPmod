# KLITE-RPmod General Developer Documentation

**Version:** 5.0.0  
**Platform:** KoboldAI Lite v257+ (KoboldCpp Web Interface)  
**License:** GPL-3.0  
**Repository:** https://github.com/PeterPeet/KLITE-RPmod

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [KoboldAI Lite Foundation](#3-koboldai-lite-foundation)
4. [KLITE-RPmod Architecture](#4-klite-rpmod-architecture)
5. [Panel Development Guide](#5-panel-development-guide)
6. [UI/UX Design System](#6-uiux-design-system)
7. [API Reference](#7-api-reference)
8. [Character Card Specifications](#8-character-card-specifications)
9. [Development Workflow](#9-development-workflow)
10. [Testing & Debugging](#10-testing--debugging)
11. [Quick Reference Tables](#11-quick-reference-tables)

---

## 1. Introduction

### What is KoboldAI Lite?

KoboldAI Lite (v257) is a lightweight, browser-based interface for AI text generation that runs as part of KoboldCpp. It's a single-page application built with vanilla JavaScript, requiring no external dependencies or frameworks. The interface supports multiple AI backends including local models via KoboldCpp, OpenAI, Claude, and various other providers.

Key characteristics:
- **Single HTML file** with all UI modes embedded
- **Event-driven architecture** with no formal MVC pattern
- **Multiple operation modes**: Story, Adventure, Chat, and Instruct
- **Three UI variants**: Classic, Aesthetic, and Corpo
- **Extensive customization** through settings and user scripts

### What is KLITE-RPmod?

KLITE-RPmod is a comprehensive user modification that enhances KoboldAI Lite with a modern, multi-panel interface specifically designed for role-playing scenarios. Instead of modifying KoboldAI Lite's code, it operates as an overlay that integrates deeply with the existing functionality.

Key features:
- **Multi-panel layout** with collapsible left, right, and top panels
- **Mode-aware panels** that adapt to the current operation mode
- **Clean functional architecture** with 70% less code than traditional OOP approaches
- **Zero dependencies** - pure vanilla JavaScript
- **Non-destructive** - can be toggled on/off without affecting KoboldAI Lite

### Design Philosophy

The mod follows these core principles:

1. **Simplicity Over Complexity**
   - No class inheritance or complex OOP patterns
   - Functional programming where appropriate
   - Single source of truth for state

2. **Module Pattern**
   - Simple objects instead of classes
   - Each panel is self-contained
   - Shared utilities through template functions

3. **Event Delegation**
   - Single event listener for all interactions
   - Data attributes for action mapping
   - Minimal DOM manipulation

4. **CSS Grid Layout**
   - Entire layout handled by CSS
   - No JavaScript positioning code
   - Responsive by default

---

## 2. Architecture Overview

### System Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              KoboldAI Lite (Base Layer)              │  │
│  │                                                      │  │
│  │  • gametext_arr[] - Story content                   │  │
│  │  • localsettings{} - All settings                   │  │
│  │  • current_memory - Memory field                    │  │
│  │  • submit_generation() - AI generation              │  │
│  │  • render_gametext() - UI updates                   │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                      │ Hooks & Integration                  │
│  ┌──────────────────▼──────────────────────────────────┐  │
│  │            KLITE-RPmod (Enhancement Layer)          │  │
│  │                                                      │  │
│  │  • Overlays custom UI while preserving original     │  │
│  │  • Syncs with KoboldAI data structures              │  │
│  │  • Enhances without modifying core functionality    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### KLITE-RPmod Structure

```javascript
window.KLITE_RPMod = {
    // Core properties
    version: '5.0.0',
    state: { /* UI state */ },
    panels: { /* Panel registry */ },
    
    // Core methods
    init(),           // Initialize mod
    buildUI(),        // Create interface
    setupHooks(),     // Hook into KoboldAI
    
    // Panel management
    loadPanel(side, name),
    switchTab(panel, tab),
    
    // Integration
    syncChat(),       // Sync story display
    updateTokens(),   // Update counters
    submit()          // Handle submission
}
```

---

## 3. KoboldAI Lite Foundation

### Core Global Variables

Understanding these is crucial for mod development:

```javascript
// Story/Chat Content
gametext_arr = []           // Array of all story chunks
redo_arr = []              // Redo stack

// Settings & Configuration  
localsettings = {
    opmode: 3,             // 1=Story, 2=Adventure, 3=Chat, 4=Instruct
    chatname: "User",      // User's name in chat
    chatopponent: "AI",    // AI name(s), ||$|| separated for groups
    temperature: 0.7,      // Generation randomness
    max_length: 200,       // Max generation length
    rep_pen: 1.1,         // Repetition penalty
    // ... many more settings
}

// Context Elements
current_memory = ""        // Memory/context field content  
current_anote = ""        // Author's note content
current_wi = []           // World Info entries array

// Generation State
pending_response_id = ""  // Active generation ID
retry_in_progress = false // Retry state
```

### Critical Functions

These are the main functions the mod interacts with:

```javascript
// Generation Control
submit_generation(text)          // Submit text for generation
abort_generation()              // Stop current generation
btn_retry()                     // Retry last generation
btn_back()                      // Undo last action
btn_redo()                      // Redo action

// UI Updates  
render_gametext(save, scroll)   // Update story display
handle_incoming_text(text)      // Process AI response
update_submit_button()          // Update button state

// Settings
save_settings()                 // Save localsettings
display_settings()             // Show settings panel
confirm_settings()             // Apply settings changes

// Modes
toggle_opmode()                // Switch operation mode
impersonate_message(index)     // Speak as character
impersonate_user()            // AI speaks as user
```

### DOM Structure

Key elements KoboldAI Lite expects:

```html
<!-- Main display -->
<div id="gametext">Story content here</div>

<!-- Input -->
<textarea id="input_text">User input</textarea>
<button id="btnsend">Submit</button>

<!-- Memory/Context -->
<textarea id="memorytext">Memory content</textarea>
<textarea id="anotetext">Author's note</textarea>

<!-- Connection status -->
<div id="connectstatus" class="connected">Connected</div>

<!-- Settings -->
<input type="checkbox" id="entersubmit"> <!-- Enter to send -->
```

---

## 4. KLITE-RPmod Architecture

### Module Pattern Implementation

The entire mod follows a clean module pattern:

```javascript
(function() {
    'use strict';
    
    // 1. CSS Definition
    const STYLES = `...`;
    
    // 2. Template Utilities
    const t = {
        section: (title, content) => `...`,
        button: (text, className, action) => `...`,
        // ... more templates
    };
    
    // 3. Main Module
    window.KLITE_RPMod = {
        version: '5.0.0',
        state: {},
        panels: {},
        
        init() { /* ... */ },
        buildUI() { /* ... */ },
        // ... methods
    };
    
    // 4. Panel Definitions
    KLITE_RPMod.panels.PANELNAME = {
        render() { return 'HTML'; },
        init() { /* setup */ },
        actions: { 'action': handler }
    };
    
    // 5. Auto-initialization
    waitForKobold();
})();
```

### State Management

Simple, centralized state:

```javascript
state: {
    tabs: { 
        left: 'PLAY',      // Active left panel tab
        right: 'MEMORY'    // Active right panel tab
    },
    collapsed: {
        left: false,       // Panel visibility
        right: false,
        top: false
    },
    generating: false      // AI generation in progress
}
```

### Event Delegation Pattern

All events handled through a single listener:

```javascript
container.addEventListener('click', e => {
    // Tab switching
    if (e.target.classList.contains('klite-tab')) {
        this.switchTab(panel, tab);
    }
    
    // Action buttons
    const action = e.target.dataset.action;
    if (action) {
        // Find handler in current panel
        const panel = this.panels[currentPanel];
        if (panel?.actions?.[action]) {
            panel.actions[action](e);
        }
    }
});
```

### Integration Hooks

The mod hooks into KoboldAI functions:

```javascript
// Hook submission
const orig = window.submit_generation_button;
window.submit_generation_button = (...args) => {
    this.state.generating = true;
    this.updateSubmitBtn();
    return orig.apply(window, args);
};

// Hook rendering
const origRender = window.render_gametext;
window.render_gametext = (...args) => {
    const result = origRender.apply(window, args);
    this.syncChat();  // Sync our display
    this.state.generating = false;
    return result;
};
```

---

## 5. Panel Development Guide

### Panel Interface

Each panel is a simple object with three methods:

```javascript
KLITE_RPMod.panels.MY_PANEL = {
    // Required: Returns HTML string for panel content
    render() {
        return t.section('My Panel', 
            t.input('my-input', 'placeholder') +
            t.button('Do Something', '', 'my-action')
        );
    },
    
    // Optional: Called after HTML is inserted
    init() {
        // Set up event listeners, load saved data, etc.
        document.getElementById('my-input').value = savedValue;
    },
    
    // Optional: Action handlers
    actions: {
        'my-action': (event) => {
            const value = document.getElementById('my-input').value;
            // Do something with value
        }
    },
    
    // Optional: Handle input events
    oninput(event) {
        if (event.target.id === 'my-input') {
            // Handle typing
        }
    }
};
```

### Template System

Use the built-in template utilities:

```javascript
const t = {
    // Create collapsible section
    section: (title, content, collapsed = false) => 
        `<div class="klite-section ${collapsed ? 'collapsed' : ''}">...</div>`,
    
    // Create button with optional action
    button: (text, className = '', action = '') => 
        `<button class="klite-btn ${className}" 
                 ${action ? `data-action="${action}"` : ''}>${text}</button>`,
    
    // Create textarea
    textarea: (id, placeholder = '', value = '') => 
        `<textarea id="${id}" class="klite-textarea" 
                   placeholder="${placeholder}">${value}</textarea>`,
    
    // Create input field
    input: (id, placeholder = '', type = 'text', value = '') => 
        `<input type="${type}" id="${id}" class="klite-input" 
                placeholder="${placeholder}" value="${value}">`,
    
    // Create select dropdown
    select: (id, options) => 
        `<select id="${id}" class="klite-select">
            ${options.map(o => 
                `<option value="${o.value}" ${o.selected ? 'selected' : ''}>
                    ${o.text}
                </option>`
            ).join('')}
        </select>`,
    
    // Utility wrappers
    row: (content) => `<div class="klite-row">${content}</div>`,
    muted: (text) => `<div class="klite-muted">${text}</div>`
};
```

### Adding a New Panel

1. Define your panel object:

```javascript
KLITE_RPMod.panels.CUSTOM = {
    data: {
        items: []
    },
    
    render() {
        return `
            ${t.section('My Custom Panel',
                `<div id="custom-list">
                    ${this.renderItems()}
                </div>
                ${t.button('Add Item', 'success', 'add-item')}`
            )}
        `;
    },
    
    renderItems() {
        if (this.data.items.length === 0) {
            return '<div class="klite-center klite-muted">No items yet</div>';
        }
        return this.data.items.map((item, i) => 
            `<div class="klite-control-group">
                ${item.name}
                ${t.button('Delete', 'danger', `delete-${i}`)}
            </div>`
        ).join('');
    },
    
    init() {
        // Load saved data
        const saved = localStorage.getItem('klite-custom-data');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    },
    
    actions: {
        'add-item': () => {
            const name = prompt('Item name:');
            if (name) {
                KLITE_RPMod.panels.CUSTOM.data.items.push({name});
                KLITE_RPMod.panels.CUSTOM.save();
                KLITE_RPMod.loadPanel('left', 'CUSTOM');
            }
        }
    },
    
    save() {
        localStorage.setItem('klite-custom-data', JSON.stringify(this.data));
    }
};
```

2. Add tab in `buildUI()`:

```javascript
// In the left panel tabs section
${['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP', 'CUSTOM'].map(t => 
    `<div class="klite-tab ${t === this.state.tabs.left ? 'active' : ''}" 
          data-tab="${t}">${t}</div>`
).join('')}
```

### Mode-Aware Panels

For panels that change based on KoboldAI's mode:

```javascript
// In loadPanel method
if (name === 'PLAY') {
    const mode = this.getMode();  // Returns 'story', 'adventure', 'chat', etc.
    const modeMap = {
        'story': 'PLAY_STORY',
        'adventure': 'PLAY_ADV', 
        'chat': 'PLAY_RP',
        'instruct': 'PLAY_RP'
    };
    name = modeMap[mode] || 'PLAY_RP';
}
```

---

## 6. UI/UX Design System

### Color Palette

The mod uses a consistent dark theme:

```css
:root {
    /* Backgrounds */
    --bg: #1a1a1a;        /* Primary background */
    --bg2: #262626;       /* Panel background */
    --bg3: #333;          /* Section headers */
    
    /* Text */
    --text: #e0e0e0;      /* Primary text */
    --muted: #666;        /* Muted/secondary text */
    
    /* Borders */
    --border: #444;       /* Default borders */
    
    /* Accent Colors */
    --accent: #4a9eff;    /* Primary accent (blue) */
    --primary: #337ab7;   /* Primary button */
    --danger: #d9534f;    /* Danger/delete (red) */
    --success: #5cb85c;   /* Success (green) */
    --warning: #f0ad4e;   /* Warning (orange) */
}
```

### Common CSS Classes

```css
/* Layout */
.klite-container       /* Main container */
.klite-panel          /* Panel base class */
.klite-panel-left     /* Left panel */
.klite-panel-right    /* Right panel */
.klite-panel-top      /* Top panel */
.klite-main           /* Main content area */

/* Components */
.klite-section        /* Collapsible section */
.klite-section-header /* Section header */
.klite-tabs           /* Tab container */
.klite-tab            /* Individual tab */
.klite-tab.active     /* Active tab */

/* Forms */
.klite-input          /* Text input */
.klite-textarea       /* Textarea */
.klite-select         /* Dropdown */
.klite-btn            /* Button */
.klite-btn.danger     /* Red button */
.klite-btn.success    /* Green button */

/* Utilities */
.klite-row            /* Flex row */
.klite-center         /* Center text */
.klite-muted          /* Muted text color */
.klite-mt             /* Margin top */
.collapsed            /* Hidden/collapsed state */
.active               /* Active state */
```

### Responsive Design

```css
/* Desktop (1400px+) */
@media (min-width: 1401px) {
    .klite-panel { width: 350px; }
}

/* Tablet (768px-1400px) */
@media (max-width: 1400px) {
    .klite-panel-top { left: 0; right: 0; }
    .klite-main { left: 15px !important; right: 15px !important; }
}

/* Mobile (<768px) */
@media (max-width: 768px) {
    .klite-panel-left, .klite-panel-right { display: none; }
}
```

### Component Examples

#### Section with Controls
```javascript
t.section('Generation Control',
    `<div class="klite-control-group">
        ${t.slider('creativity', 0, 100, 50, 'Creativity')}
        ${t.slider('focus', 0, 100, 50, 'Focus')}
        <div class="klite-row klite-mt">
            ${t.button('Low', '', 'preset-low')}
            ${t.button('Medium', 'active', 'preset-med')}
            ${t.button('High', '', 'preset-high')}
        </div>
    </div>`
)
```

#### Character List
```javascript
`<div class="klite-character-item">
    <div style="flex: 1;">
        <strong>${char.name}</strong>
        <div class="klite-muted" style="font-size: 11px;">
            ${char.description}
        </div>
    </div>
    ${t.button('Load', 'success', `load-${char.id}`)}
</div>`
```

---

## 7. API Reference

### KLITE-RPmod Public API

```javascript
// Access the mod
window.KLITE_RPMod

// Common operations
KLITE_RPMod.switchTab('left', 'TOOLS')    // Switch panel tab
KLITE_RPMod.togglePanel('left')            // Collapse/expand panel
KLITE_RPMod.loadPanel('right', 'MEMORY')  // Reload panel
KLITE_RPMod.submit()                       // Submit current input
KLITE_RPMod.syncChat()                     // Force sync display

// State access
KLITE_RPMod.state                          // Current UI state
KLITE_RPMod.panels                         // All registered panels
KLITE_RPMod.getMode()                      // Current KoboldAI mode

// Utilities
KLITE_RPMod.escapeHtml(text)              // Escape HTML
KLITE_RPMod.showSuccessMessage(msg)        // Show notification
```

### KoboldAI Lite Functions

Key functions your panel can use:

```javascript
// Story Management
window.gametext_arr.push(text)             // Add to story
window.render_gametext()                   // Update display
window.concat_gametext()                   // Get full story text

// Generation
window.submit_generation_button()          // Start generation
window.abort_generation()                  // Stop generation
window.btn_retry()                         // Retry last
window.btn_back()                          // Undo
window.btn_redo()                          // Redo

// Settings
window.save_settings()                     // Save settings
window.localsettings.temperature = 0.8     // Change setting

// World Info
window.current_wi.push(entry)              // Add WI entry
window.inject_wi_in_prompt(context)        // Inject WI

// Utilities
window.count_words(text)                   // Count words
window.escape_html(text)                   // Escape HTML
```

### Event System

```javascript
// Panel actions use data attributes
<button data-action="my-action">Click</button>

// In panel definition
actions: {
    'my-action': (event) => {
        // Handle click
    }
}

// Input handling
oninput(event) {
    if (event.target.id === 'my-field') {
        // Handle input
    }
}
```

---

## 8. Character Card Specifications

### Supported Formats

KLITE-RPmod supports multiple character card formats:

#### Tavern Card V2 (Most Common)
```javascript
{
    "spec": "chara_card_v2",
    "spec_version": "2.0",
    "data": {
        "name": "Character Name",
        "description": "Physical appearance and persona",
        "personality": "Personality traits",
        "scenario": "Current scenario/setting",
        "first_mes": "Greeting message",
        "mes_example": "Example dialogue",
        "creator": "Creator name",
        "system_prompt": "System instructions",
        "alternate_greetings": ["Alt greeting 1", "Alt greeting 2"],
        "character_book": {
            "entries": [{
                "keys": ["trigger1", "trigger2"],
                "content": "Lore content",
                "enabled": true
            }]
        }
    }
}
```

#### Character Import to World Info
When importing as World Info, the comment field MUST follow this format:
```javascript
comment: "${characterName}_imported_memory"  // CRITICAL!
```

### Character Handling Example
```javascript
// Extract from PNG/WEBP
function readTavernPng(file) {
    // Try multiple extraction methods
    // 1. PNG tEXt chunks
    // 2. WEBP EXIF data  
    // 3. Risu format
}

// Convert to World Info
function importCharacterToWI(char) {
    const entry = {
        key: char.name,
        content: buildCharacterContent(char),
        comment: `${char.name}_imported_memory`, // Required format!
        wigroup: "Characters",
        probability: 100
    };
    window.current_wi.push(entry);
}
```

---

## 9. Development Workflow

### Setting Up

1. **Development Environment**
   ```bash
   # Clone repository
   git clone https://github.com/PeterPeet/KLITE-RPmod.git
   cd KLITE-RPmod
   
   # No build needed - it's vanilla JS!
   ```

2. **Testing Setup**
   - Run KoboldCpp with web interface
   - Open http://localhost:5001
   - Open browser console (F12)
   - Paste mod code or use userscript manager

### Development Cycle

1. **Make Changes**
   - Edit in your preferred editor
   - Use the modular structure

2. **Test**
   - Reload KoboldAI Lite page
   - Paste updated code in console
   - Check for errors

3. **Debug**
   ```javascript
   // Enable debug mode
   KLITE_RPMod.debug = true;
   
   // Check state
   console.log(KLITE_RPMod.state);
   
   // Test specific panel
   KLITE_RPMod.loadPanel('left', 'MY_PANEL');
   ```

### Best Practices

1. **Follow the Pattern**
   - Keep panels self-contained
   - Use template utilities
   - Handle errors gracefully

2. **State Management**
   - Save panel state to localStorage
   - Load state in init()
   - Clean up when switching

3. **Performance**
   - Minimize DOM manipulation
   - Use event delegation
   - Debounce frequent operations

4. **Compatibility**
   - Test all KoboldAI modes
   - Test with empty story
   - Test error conditions

---

## 10. Testing & Debugging

### Console Commands

```javascript
// Check initialization
KLITE_RPMod.state

// Reload specific panel
KLITE_RPMod.loadPanel('left', 'TOOLS')

// Test integration
KLITE_RPMod.syncChat()
KLITE_RPMod.updateTokens()

// Debug mode
KLITE_RPMod.debug = true

// Force UI toggle
KLITE_RPMod.toggleUI()

// Check KoboldAI state
console.log({
    mode: localsettings.opmode,
    story: gametext_arr.length,
    memory: current_memory,
    generating: KLITE_RPMod.state.generating
})
```

### Common Issues

#### Mod not loading
- Check `window.KLITE_RPMod_LOADED`
- Ensure KoboldAI Lite is ready
- Look for console errors

#### Panels not appearing
- Check CSS injection
- Verify panel registration
- Test with: `Object.keys(KLITE_RPMod.panels)`

#### Actions not working
- Check data-action attributes
- Verify action name matches
- Debug with: `console.log(panel.actions)`

#### State not saving
- Check localStorage permissions
- Verify save/load in panel
- Test with: `localStorage.getItem('klite-state')`

### Error Recovery

```javascript
// Reset state
localStorage.removeItem('klite-state');
location.reload();

// Force reinitialization  
delete window.KLITE_RPMod_LOADED;
KLITE_RPMod.init();

// Emergency disable
document.getElementById('klite-container')?.remove();
document.body.classList.remove('klite-active');
```

---

## 11. Quick Reference Tables

### KoboldAI Lite Global Variables

| Variable | Type | Description |
|----------|------|-------------|
| `gametext_arr` | Array | All story/chat chunks |
| `localsettings` | Object | All user settings |
| `current_memory` | String | Memory field content |
| `current_anote` | String | Author's note |
| `current_wi` | Array | World Info entries |
| `pending_response_id` | String | Active generation ID |

### Essential Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `submit_generation(text)` | Submit text to AI | void |
| `render_gametext()` | Update story display | void |
| `concat_gametext()` | Get full story | string |
| `save_settings()` | Save all settings | void |
| `btn_retry()` | Retry last generation | void |

### Operation Modes

| Mode | Value | Description |
|------|-------|-------------|
| Story | 1 | Traditional story writing |
| Adventure | 2 | Text adventure with actions |
| Chat | 3 | Character conversation |
| Instruct | 4 | Instruction following |

### Required DOM Elements

| Element | ID | Purpose |
|---------|-----|---------|
| Story Display | `gametext` | Main story content |
| Input Field | `input_text` | User text input |
| Memory | `memorytext` | Context memory |
| Submit Button | `btnsend` | Send to AI |
| Connection | `connectstatus` | Connection state |

### KLITE-RPmod Structure

| Component | Purpose |
|-----------|---------|
| `KLITE_RPMod` | Main controller object |
| `KLITE_RPMod.panels` | Panel registry |
| `KLITE_RPMod.state` | UI state |
| Template `t` | HTML generators |

### Panel Interface

| Method | Required | Purpose |
|--------|----------|---------|
| `render()` | Yes | Return panel HTML |
| `init()` | No | Setup after render |
| `actions` | No | Button handlers |
| `oninput()` | No | Input handlers |

### CSS Color Variables

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | #1a1a1a | Main background |
| `--bg2` | #262626 | Panel background |
| `--bg3` | #333 | Headers |
| `--text` | #e0e0e0 | Primary text |
| `--muted` | #666 | Secondary text |
| `--accent` | #4a9eff | Primary accent |
| `--danger` | #d9534f | Delete/error |
| `--success` | #5cb85c | Success/confirm |

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Code Style**
   - Use the functional pattern
   - Keep panels self-contained
   - Use template utilities
   - Add error handling

2. **Testing**
   - Test all operation modes
   - Test with empty/full stories
   - Verify mobile responsiveness
   - Check error conditions

3. **Documentation**
   - Update this doc for new features
   - Add JSDoc comments
   - Include usage examples

4. **Submission**
   - Fork the repository
   - Create feature branch
   - Submit pull request
   - Describe changes clearly

---

## License

KLITE-RPmod is licensed under GPL-3.0. See [LICENSE](https://github.com/PeterPeet/KLITE-RPmod/blob/main/LICENSE) for details.

---

## Resources

- **Repository**: https://github.com/PeterPeet/KLITE-RPmod
- **KoboldCpp**: https://github.com/LostRuins/koboldcpp
- **Discord**: https://discord.gg/koboldai
- **Author**: Peter Hauer (@PeterPeet)

---

*This documentation covers KLITE-RPmod v5.0.0 for KoboldAI Lite v257+. For updates, check the GitHub repository.*


# KLITE-RPmod More Detailed Developer Documentation

**Version:** 5.0.0  
**Platform:** KoboldAI Lite v257+ (KoboldCpp Web Interface)  
**License:** GPL-3.0  
**Repository:** https://github.com/PeterPeet/KLITE-RPmod

---

## Table of Contents

1. [Introduction & Overview](#1-introduction--overview)
2. [KoboldAI Lite Deep Dive](#2-koboldai-lite-deep-dive)
3. [KLITE-RPmod Architecture](#3-klite-rpmod-architecture)
4. [Complete Panel Development Guide](#4-complete-panel-development-guide)
5. [UI/UX Design System Reference](#5-uiux-design-system-reference)
6. [Character Card Specifications (V1/V2/V3)](#6-character-card-specifications-v1v2v3)
7. [KoboldAI Lite API Reference](#7-koboldai-lite-api-reference)
8. [KLITE-RPmod API Reference](#8-klite-rpmod-api-reference)
9. [Advanced Integration Techniques](#9-advanced-integration-techniques)
10. [World Info System](#10-world-info-system)
11. [Sampler Parameters & Generation](#11-sampler-parameters--generation)
12. [Storage & Data Management](#12-storage--data-management)
13. [Testing, Debugging & Troubleshooting](#13-testing-debugging--troubleshooting)
14. [Complete Reference Tables](#14-complete-reference-tables)
15. [Development Best Practices](#15-development-best-practices)

---

## 1. Introduction & Overview

### What is KoboldAI Lite?

KoboldAI Lite (LITEVER = 257) is a sophisticated single-page web application that serves as the frontend for KoboldCpp and other AI backends. Built entirely with vanilla JavaScript, it provides a feature-rich interface for AI text generation without any external dependencies.

**Core Architecture:**
- **Event-driven design** with direct DOM manipulation
- **No frameworks** - pure vanilla JavaScript
- **Single HTML file** containing all UI modes
- **Modular function organization** by feature area
- **Multiple backend support** including local and cloud AI

**Key Capabilities:**
- Four operation modes (Story, Adventure, Chat, Instruct)
- Three UI styles (Classic, Aesthetic, Corpo)
- Advanced sampler control with 20+ parameters
- Character card support (V1/V2/V3 formats)
- World Info system with complex triggers
- Group chat with multiple participants
- Image generation integration
- Speech-to-text and text-to-speech
- Multiplayer support
- Custom CSS and JavaScript modifications

### What is KLITE-RPmod?

KLITE-RPmod is a comprehensive enhancement layer that transforms KoboldAI Lite's interface into a modern, multi-panel system optimized for role-playing scenarios. It operates non-destructively, preserving all original functionality while adding powerful new features.

**Design Philosophy:**
1. **Clean Architecture** - Functional programming with simple object patterns
2. **Zero Dependencies** - No external libraries or frameworks
3. **Mode-Aware** - Adapts to KoboldAI's current operation mode
4. **Minimal Code** - 70% less code than traditional OOP approaches
5. **Full Integration** - Deep hooks into KoboldAI's systems

**Key Enhancements:**
- Multi-panel layout with intelligent panel management
- Enhanced character management with gallery view
- Advanced scene and atmosphere controls
- Comprehensive tools panel with analysis features
- Smart memory generation
- Group chat orchestration
- Real-time synchronization
- Responsive design for all devices

### System Requirements

**Browser Support:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES6 support

**KoboldAI Lite Compatibility:**
- Version 257+ required
- All operation modes supported
- All UI variants compatible
- Works with all backends (KoboldCpp, Horde, OpenAI, etc.)

---

## 2. KoboldAI Lite Deep Dive

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KoboldAI Lite Structure                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Entry Points                                               │
│  ├─ init() - Main initialization                          │
│  ├─ attempt_connect(popup_aiselect) - Connection setup    │
│  └─ render_gametext() - UI rendering                      │
│                                                             │
│  Core Systems                                               │
│  ├─ Generation Flow                                        │
│  │  ├─ prepare_submit_generation()                        │
│  │  ├─ inject_wi_in_prompt()                             │
│  │  ├─ dispatch_submit_generation()                       │
│  │  └─ handle_incoming_text()                            │
│  │                                                         │
│  ├─ UI Management                                          │
│  │  ├─ render_gametext() - Main renderer                 │
│  │  ├─ display_settings() - Settings panel               │
│  │  └─ Mode-specific renderers                           │
│  │                                                         │
│  └─ Storage Systems                                        │
│     ├─ localStorage (settings)                            │
│     ├─ IndexedDB (large data)                            │
│     └─ Server storage (KoboldCpp)                        │
└─────────────────────────────────────────────────────────────┘
```

### Global Variables Reference

```javascript
// Core State Variables
var LITEVER = 257;                    // Version number
var gametext_arr = [];               // Main story/chat content array
var redo_arr = [];                   // Redo stack for text
var retry_prev_text = [];            // Previous retry attempts

// Memory & Context
var current_memory = "";             // Memory field content
var current_anote = "";              // Author's note content
var current_anotetemplate = "[Author's note: <|>]"; // AN template
var anote_strength = 320;            // AN insertion depth
var newlineaftermemory = true;       // Add newline after memory

// World Info
var current_wi = [];                 // World Info entries array
var wi_insertlocation = 0;           // 0=after memory, 1=before AN, 2=after AN
var wi_searchdepth = 0;              // How deep to search for triggers

// Generation State
var pending_response_id = "";        // Active generation ID
var synchro_pending_stream = "";     // Streaming response buffer
var retry_in_progress = false;       // Retry state flag
var last_reply_was_empty = false;    // Empty response tracking
var poll_in_progress = false;        // Polling active
var pending_context_preinjection = ""; // Text to inject before response

// Settings Object
var localsettings = {
    // Operation mode
    opmode: 3,                       // 1=Story, 2=Adventure, 3=Chat, 4=Instruct
    
    // Chat settings
    chatname: "User",                // Your name in chat
    chatopponent: "AI",              // AI name(s), ||$|| separated
    inject_timestamps: false,        // Add timestamps to messages
    
    // Generation parameters
    temperature: 0.7,                // Randomness (0.01-5.0)
    max_length: 200,                 // Max generation length
    max_context_length: 8192,        // Context window size
    rep_pen: 1.1,                    // Repetition penalty (0.1-5.0)
    rep_pen_range: 320,              // Rep penalty range
    rep_pen_slope: 0,                // Rep penalty decay
    top_p: 0.9,                      // Nucleus sampling (0.002-1.0)
    top_k: 40,                       // Top-K sampling (0-300)
    min_p: 0.0,                      // Min-P sampling
    
    // Advanced samplers
    miro_type: 0,                    // Mirostat (0=off, 1=v1, 2=v2)
    miro_tau: 5.0,                   // Mirostat tau
    miro_eta: 0.1,                   // Mirostat eta
    dry_multiplier: 0.8,             // DRY penalty strength
    dry_base: 1.75,                  // DRY base
    dry_allowed_length: 2,           // DRY sequence length
    xtc_threshold: 0.1,              // XTC threshold
    xtc_probability: 0.5,            // XTC probability
    
    // UI settings
    gui_type_chat: 1,                // UI for chat mode (1=Classic, 2=Aesthetic, 3=Corpo)
    darkmode: true,                  // Dark mode enabled
    autoscroll: true,                // Auto-scroll to bottom
    entersubmit: true,               // Enter key sends
    
    // Features
    generate_images_mode: "0",       // Image generation mode
    websearch_enabled: false,        // Web search integration
    speech_synth: 0,                 // TTS engine selection
    
    // Advanced
    extrastopseq: "",                // Extra stop sequences ||$|| separated
    tokenbans: "",                   // Banned tokens ||$|| separated
    grammar: "",                     // GBNF grammar string
    guidance_scale: 1.0,             // CFG guidance scale
    guidance_prompt: ""              // CFG guidance prompt
};

// API Configuration
var custom_kobold_endpoint = "";     // Current Kobold API endpoint
var custom_oai_endpoint = "";        // OpenAI-compatible endpoint
var custom_oai_key = "";             // API key
var custom_oai_model = "";           // Selected model

// Connection State
var koboldcpp_version = null;        // Detected KoboldCpp version
var koboldcpp_has_vision = false;    // Vision/multimodal support
var koboldcpp_has_websearch = false; // Web search support
var koboldcpp_has_tts = false;       // TTS support
var multiplayer_active = false;      // Multiplayer session

// UI State Variables
var prev_hl_chunk = null;            // Previously highlighted chunk
var memory_tab = 0;                  // Current memory tab (0-3)
var settings_tab = 0;                // Current settings tab
var mainmenu_is_untab = false;       // Main menu visibility
var is_impersonate_user = false;     // User impersonation mode
var cosmetic_corpo_ai_nick = "KoboldAI"; // Display name for AI
```

### Operation Modes Explained

#### Story Mode (opmode = 1)
Traditional storytelling mode where the AI continues your narrative.
```javascript
// No special formatting
// Direct text continuation
// Suitable for novels, creative writing
```

#### Adventure Mode (opmode = 2)
Text adventure game mode with action formatting.
```javascript
// Player actions prefixed with: "\n\n> action\n\n"
// Three sub-modes:
adventure_switch_mode = 0; // Story sub-mode
adventure_switch_mode = 1; // Action sub-mode  
adventure_switch_mode = 2; // Dice sub-mode
```

#### Chat Mode (opmode = 3)
Character conversation mode with named speakers.
```javascript
// Format: "\nName: Message"
// Group chat: names separated by ||$||
localsettings.chatopponent = "Alice||$||Bob||$||Charlie";
groupchat_removals = ["Bob"]; // Excluded participants
```

#### Instruct Mode (opmode = 4)
Instruction-following mode with special tags.
```javascript
localsettings.instruct_starttag = "{{[INPUT]}}";
localsettings.instruct_endtag = "{{[OUTPUT]}}";
localsettings.instruct_systag = "{{[SYSTEM]}}";
localsettings.instruct_sysprompt = "You are a helpful assistant.";
```

### UI Variants

#### Classic UI (gui_type = 1)
- Traditional text editor interface
- Full-width text area
- Bottom input controls
- Maximum flexibility

#### Aesthetic UI (gui_type = 2)
- Chat bubble interface
- Character portraits
- Markdown rendering
- Visual novel style

#### Corpo UI (gui_type = 3)
- Corporate chat interface
- Left sidebar with history
- Professional appearance
- Mobile-optimized

### Generation Flow Deep Dive

```javascript
// 1. User Input Processing
prepare_submit_generation() {
    // Get input text
    // Apply mode-specific formatting
    // Handle special commands
}

// 2. Context Building
inject_wi_in_prompt(context) {
    // Scan for WI triggers
    // Check selective/constant rules
    // Apply probability
    // Inject matching entries
}

// 3. Submission
dispatch_submit_generation(payload) {
    // Route to appropriate API
    // Handle streaming vs sync
    // Manage stop sequences
    // Apply sampler parameters
}

// 4. Response Handling
handle_incoming_text(text, worker, model) {
    // Clean response
    // Apply post-processing
    // Update UI
    // Trigger hooks
}
```

---

## 3. KLITE-RPmod Architecture

### Clean Architecture Principles

```javascript
// Traditional OOP approach (what we DON'T do)
class BasePanel extends Component {
    constructor() { super(); }
    render() { }
}
class MemoryPanel extends BasePanel { }

// Our functional approach (what we DO)
const MemoryPanel = {
    render: () => template,
    init: () => setup,
    actions: { 'action-name': handler }
}
```

### Core Structure

```javascript
(function() {
    'use strict';
    
    // Prevent duplicate loads
    if (window.KLITE_RPMod_LOADED) {
        console.warn('KLITE RPMod already loaded');
        return;
    }
    window.KLITE_RPMod_LOADED = true;
    
    // 1. CSS Definition (under 150 lines)
    const STYLES = `
        :root {
            --bg: #1a1a1a;
            --bg2: #262626;
            --bg3: #333;
            --text: #e0e0e0;
            --muted: #666;
            --border: #444;
            --accent: #4a9eff;
            --primary: #337ab7;
            --danger: #d9534f;
            --success: #5cb85c;
            --warning: #f0ad4e;
        }
        /* ... complete styles ... */
    `;
    
    // 2. Template System
    const t = {
        section: (title, content, collapsed = false) => `
            <div class="klite-section ${collapsed ? 'collapsed' : ''}">
                <div class="klite-section-header" data-section="${title}">
                    <span>${title}</span>
                    <span>${collapsed ? '▶' : '▼'}</span>
                </div>
                <div class="klite-section-content">${content}</div>
            </div>
        `,
        
        button: (text, className = '', action = '') => `
            <button class="klite-btn ${className}" 
                    ${action ? `data-action="${action}"` : ''}>${text}</button>
        `,
        
        textarea: (id, placeholder = '', value = '') => `
            <textarea id="${id}" class="klite-textarea" 
                      placeholder="${placeholder}">${value}</textarea>
        `,
        
        input: (id, placeholder = '', type = 'text', value = '') => `
            <input type="${type}" id="${id}" class="klite-input" 
                   placeholder="${placeholder}" value="${value}">
        `,
        
        select: (id, options) => `
            <select id="${id}" class="klite-select">
                ${options.map(o => 
                    `<option value="${o.value}" ${o.selected ? 'selected' : ''}>
                        ${o.text}
                    </option>`
                ).join('')}
            </select>
        `,
        
        checkbox: (id, label, checked = false) => `
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span>${label}</span>
            </label>
        `,
        
        slider: (id, min, max, value, label = '') => `
            <div>
                ${label ? `<label for="${id}" style="font-size: 12px;">${label}</label>` : ''}
                <input type="range" id="${id}" class="klite-slider" 
                       min="${min}" max="${max}" value="${value}">
            </div>
        `,
        
        row: (content) => `<div class="klite-row">${content}</div>`,
        muted: (text) => `<div class="klite-muted">${text}</div>`
    };
    
    // 3. Main Module
    window.KLITE_RPMod = {
        version: '5.0.0',
        state: {
            tabs: { left: 'PLAY', right: 'MEMORY' },
            collapsed: { left: false, right: false, top: false },
            generating: false
        },
        panels: {},
        
        // Core methods
        init() { /* ... */ },
        buildUI() { /* ... */ },
        setupHooks() { /* ... */ },
        
        // Panel management
        loadPanel(side, name) { /* ... */ },
        switchTab(panel, tab) { /* ... */ }
    };
    
    // 4. Panel Definitions
    // ... panel implementations ...
    
    // 5. Auto-initialization
    function waitForKobold() {
        if (document.getElementById('gametext') && 
            typeof submit_generation_button === 'function') {
            setTimeout(() => KLITE_RPMod.init(), 100);
        } else {
            setTimeout(waitForKobold, 100);
        }
    }
    
    waitForKobold();
})();
```

### Event Delegation System

```javascript
handleClick(e) {
    // Collapse handles
    if (e.target.classList.contains('klite-handle')) {
        this.togglePanel(e.target.dataset.panel);
    }
    // Tab switching
    else if (e.target.classList.contains('klite-tab')) {
        const panel = e.target.closest('[data-panel]').dataset.panel;
        const tab = e.target.dataset.tab;
        this.switchTab(panel, tab);
    }
    // Action buttons
    else if (e.target.dataset.action) {
        this.handleAction(e.target.dataset.action, e);
    }
    // Section headers
    else if (e.target.closest('.klite-section-header')) {
        this.handleSectionToggle(e);
    }
}

handleAction(action, event) {
    // Check all panels for this action
    for (const panelName in this.panels) {
        const panel = this.panels[panelName];
        if (panel?.actions?.[action]) {
            panel.actions[action](event);
            break;
        }
    }
}
```

### State Management

```javascript
state: {
    tabs: {
        left: 'PLAY',      // Active left panel
        right: 'MEMORY'    // Active right panel
    },
    collapsed: {
        left: false,       // Panel visibility states
        right: false,
        top: false
    },
    generating: false      // AI generation in progress
},

saveState() {
    localStorage.setItem('klite-state', JSON.stringify(this.state));
},

loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem('klite-state') || '{}');
        Object.assign(this.state, saved);
    } catch (e) {
        console.warn('Failed to load state:', e);
    }
}
```

### Hook System

```javascript
setupHooks() {
    // Hook submit_generation_button
    if (window.submit_generation_button) {
        const orig = window.submit_generation_button;
        window.submit_generation_button = (...args) => {
            this.state.generating = true;
            this.updateSubmitBtn();
            this.generationStart = Date.now();
            return orig.apply(window, args);
        };
    }
    
    // Hook abort_generation
    if (window.abort_generation) {
        const orig = window.abort_generation;
        window.abort_generation = (...args) => {
            this.state.generating = false;
            this.updateSubmitBtn();
            return orig.apply(window, args);
        };
    }
    
    // Hook render_gametext
    if (window.render_gametext) {
        const orig = window.render_gametext;
        window.render_gametext = (...args) => {
            const result = orig.apply(window, args);
            this.syncChat();
            this.state.generating = false;
            this.updateSubmitBtn();
            return result;
        };
    }
    
    // Embed top menu
    setTimeout(() => {
        const topContent = document.getElementById('top-content');
        const topmenu = document.getElementById('topmenu');
        if (topContent && topmenu) {
            topContent.appendChild(topmenu.cloneNode(true));
            topmenu.style.display = 'none';
        }
    }, 100);
}
```

---

## 4. Complete Panel Development Guide

### Panel Interface Specification

```javascript
// Standard panel interface
{
    // Required: Returns HTML string for the panel
    render() {
        return 'HTML content';
    },
    
    // Optional: Called after DOM insertion
    init() {
        // Set up event listeners
        // Load saved data
        // Initialize UI elements
    },
    
    // Optional: Button click handlers
    actions: {
        'action-name': (event) => {
            // Handle action
        }
    },
    
    // Optional: Input event handler
    oninput(event) {
        if (event.target.id === 'my-input') {
            // Handle typing
        }
    },
    
    // Optional: Change event handler
    onchange(event) {
        if (event.target.id === 'my-select') {
            // Handle selection
        }
    }
}
```

### Complete Panel Example

Here's a fully functional custom panel:

```javascript
KLITE_RPMod.panels.QUEST_TRACKER = {
    // Panel data
    quests: [],
    
    // Main render method
    render() {
        return `
            ${t.section('📜 Active Quests',
                `<div id="quest-list" class="klite-quest-list">
                    ${this.renderQuests()}
                </div>
                <div class="klite-row klite-mt">
                    ${t.button('Add Quest', 'success', 'add-quest')}
                    ${t.button('Clear Completed', '', 'clear-completed')}
                </div>`
            )}
            
            ${t.section('🎯 Quest Statistics',
                `<div class="klite-stats-grid">
                    <div class="klite-stat-card">
                        <div class="klite-stat-label">Active</div>
                        <div class="klite-stat-value">${this.getActiveCount()}</div>
                    </div>
                    <div class="klite-stat-card">
                        <div class="klite-stat-label">Completed</div>
                        <div class="klite-stat-value">${this.getCompletedCount()}</div>
                    </div>
                </div>`
            )}
        `;
    },
    
    // Render quest list
    renderQuests() {
        if (this.quests.length === 0) {
            return '<div class="klite-center klite-muted">No quests yet</div>';
        }
        
        return this.quests.map((quest, i) => `
            <div class="klite-quest-item ${quest.completed ? 'completed' : ''}">
                <div style="flex: 1;">
                    <strong>${KLITE_RPMod.escapeHtml(quest.title)}</strong>
                    <div class="klite-muted" style="font-size: 11px;">
                        ${KLITE_RPMod.escapeHtml(quest.description)}
                    </div>
                </div>
                <div class="klite-row">
                    ${quest.completed ? 
                        t.button('✓', 'success', `uncomplete-${i}`) :
                        t.button('Complete', '', `complete-${i}`)
                    }
                    ${t.button('×', 'danger', `delete-${i}`)}
                </div>
            </div>
        `).join('');
    },
    
    // Initialize panel
    init() {
        this.loadQuests();
    },
    
    // Action handlers
    actions: {
        'add-quest': () => {
            const title = prompt('Quest title:');
            if (!title) return;
            
            const description = prompt('Quest description:');
            
            KLITE_RPMod.panels.QUEST_TRACKER.quests.push({
                title,
                description: description || '',
                completed: false,
                created: Date.now()
            });
            
            KLITE_RPMod.panels.QUEST_TRACKER.saveQuests();
            KLITE_RPMod.loadPanel('left', 'QUEST_TRACKER');
        },
        
        'clear-completed': () => {
            if (confirm('Remove all completed quests?')) {
                KLITE_RPMod.panels.QUEST_TRACKER.quests = 
                    KLITE_RPMod.panels.QUEST_TRACKER.quests.filter(q => !q.completed);
                KLITE_RPMod.panels.QUEST_TRACKER.saveQuests();
                KLITE_RPMod.loadPanel('left', 'QUEST_TRACKER');
            }
        }
    },
    
    // Helper methods
    getActiveCount() {
        return this.quests.filter(q => !q.completed).length;
    },
    
    getCompletedCount() {
        return this.quests.filter(q => q.completed).length;
    },
    
    loadQuests() {
        const saved = localStorage.getItem('klite-quests');
        if (saved) {
            try {
                this.quests = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load quests:', e);
            }
        }
    },
    
    saveQuests() {
        localStorage.setItem('klite-quests', JSON.stringify(this.quests));
    }
};

// Dynamic action generation for quest items
KLITE_RPMod.panels.QUEST_TRACKER.actions = new Proxy(
    KLITE_RPMod.panels.QUEST_TRACKER.actions, 
    {
        get(target, prop) {
            if (prop in target) return target[prop];
            
            if (prop.startsWith('complete-')) {
                return () => {
                    const index = parseInt(prop.split('-')[1]);
                    KLITE_RPMod.panels.QUEST_TRACKER.quests[index].completed = true;
                    KLITE_RPMod.panels.QUEST_TRACKER.saveQuests();
                    KLITE_RPMod.loadPanel('left', 'QUEST_TRACKER');
                };
            }
            
            if (prop.startsWith('uncomplete-')) {
                return () => {
                    const index = parseInt(prop.split('-')[1]);
                    KLITE_RPMod.panels.QUEST_TRACKER.quests[index].completed = false;
                    KLITE_RPMod.panels.QUEST_TRACKER.saveQuests();
                    KLITE_RPMod.loadPanel('left', 'QUEST_TRACKER');
                };
            }
            
            if (prop.startsWith('delete-')) {
                return () => {
                    const index = parseInt(prop.split('-')[1]);
                    if (confirm('Delete this quest?')) {
                        KLITE_RPMod.panels.QUEST_TRACKER.quests.splice(index, 1);
                        KLITE_RPMod.panels.QUEST_TRACKER.saveQuests();
                        KLITE_RPMod.loadPanel('left', 'QUEST_TRACKER');
                    }
                };
            }
        }
    }
);
```

### Mode-Aware Panel Pattern

```javascript
// Main PLAY panel switches based on mode
loadPanel(side, name) {
    const container = document.getElementById(`content-${side}`);
    
    // Mode-aware panel selection
    if (name === 'PLAY') {
        const mode = this.getMode();
        const modeMap = {
            'story': 'PLAY_STORY',
            'adventure': 'PLAY_ADV',
            'chat': 'PLAY_RP',
            'instruct': 'PLAY_RP'
        };
        name = modeMap[mode] || 'PLAY_RP';
    }
    
    const panel = this.panels[name];
    if (!container || !panel) return;
    
    container.innerHTML = panel.render();
    
    if (panel.init) {
        setTimeout(() => panel.init(), 0);
    }
}
```

### Advanced Panel Features

#### 1. Drag & Drop Support
```javascript
render() {
    return `
        <div class="klite-upload-zone" id="my-drop-zone">
            Drop files here
        </div>
    `;
},

init() {
    const zone = document.getElementById('my-drop-zone');
    
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        this.handleFiles(e.dataTransfer.files);
    });
}
```

#### 2. Real-time Updates
```javascript
init() {
    // Update every second
    this.updateInterval = setInterval(() => {
        this.updateStats();
    }, 1000);
},

onDeactivate() {
    // Clean up when panel is hidden
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
    }
}
```

#### 3. Modal Dialogs
```javascript
showDetails(item) {
    const modal = document.createElement('div');
    modal.className = 'klite-modal';
    modal.innerHTML = `
        <div class="klite-modal-content">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            ${t.button('Close', '', 'close-modal')}
        </div>
    `;
    
    modal.addEventListener('click', e => {
        if (e.target.dataset.action === 'close-modal' || 
            e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}
```

---

## 5. UI/UX Design System Reference

### Complete Color System

```css
:root {
    /* Primary Colors */
    --bg: #1a1a1a;          /* Main background */
    --bg2: #262626;         /* Panel backgrounds */
    --bg3: #333333;         /* Section headers, elevated surfaces */
    
    /* Text Colors */
    --text: #e0e0e0;        /* Primary text */
    --text-secondary: #b0b0b0; /* Secondary text */
    --muted: #666666;       /* Muted/disabled text */
    
    /* Border Colors */
    --border: #444444;      /* Default borders */
    --border-hover: #555555; /* Hover state borders */
    --border-active: #4a90e2; /* Active/focused borders */
    
    /* Semantic Colors */
    --accent: #4a9eff;      /* Primary accent (blue) */
    --primary: #337ab7;     /* Primary button color */
    --danger: #d9534f;      /* Error/delete (red) */
    --success: #5cb85c;     /* Success/confirm (green) */
    --warning: #f0ad4e;     /* Warning (orange) */
    --info: #5bc0de;        /* Info (light blue) */
    
    /* Special Purpose */
    --shadow: rgba(0,0,0,0.5); /* Box shadows */
    --overlay: rgba(0,0,0,0.8); /* Modal overlays */
}
```

### Typography System

```css
/* Base Typography */
body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
}

/* Heading Scales */
h1, .klite-h1 { font-size: 24px; font-weight: 600; }
h2, .klite-h2 { font-size: 20px; font-weight: 600; }
h3, .klite-h3 { font-size: 16px; font-weight: 600; }

/* Text Variants */
.klite-small { font-size: 12px; }
.klite-muted { color: var(--muted); }
.klite-mono { font-family: 'Consolas', 'Monaco', monospace; }
```

### Component Library

#### Buttons
```css
/* Base Button */
.klite-btn {
    padding: 8px 16px;
    background: var(--primary);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

/* Button Variants */
.klite-btn.danger { 
    background: var(--danger); 
    border-color: #c9302c; 
}
.klite-btn.success { 
    background: var(--success); 
    border-color: #4cae4c; 
}
.klite-btn.warning { 
    background: var(--warning); 
    border-color: #eea236; 
}

/* Button Sizes */
.klite-btn-sm { padding: 4px 8px; font-size: 12px; }
.klite-btn-lg { padding: 12px 24px; font-size: 16px; }

/* Button States */
.klite-btn:hover { filter: brightness(1.1); }
.klite-btn:active { transform: translateY(1px); }
.klite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

#### Forms
```css
/* Input Base */
.klite-input,
.klite-textarea,
.klite-select {
    width: 100%;
    padding: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font: inherit;
}

/* Focus States */
.klite-input:focus,
.klite-textarea:focus,
.klite-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}

/* Textarea Specific */
.klite-textarea {
    resize: vertical;
    min-height: 100px;
}

/* Checkbox & Radio */
input[type="checkbox"],
input[type="radio"] {
    margin-right: 8px;
}
```

#### Sections & Cards
```css
/* Section Container */
.klite-section {
    margin-bottom: 20px;
    background: var(--bg);
    border-radius: 5px;
    overflow: hidden;
}

/* Section Header */
.klite-section-header {
    padding: 10px 15px;
    background: var(--bg3);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    user-select: none;
}

/* Control Group */
.klite-control-group {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 15px;
}

/* Card Component */
.klite-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
}
```

### Layout Utilities

```css
/* Flexbox Utilities */
.klite-row { 
    display: flex; 
    gap: 10px; 
}
.klite-col { 
    flex: 1; 
}

/* Spacing */
.klite-mt { margin-top: 10px; }
.klite-mb { margin-bottom: 10px; }
.klite-mx { margin-left: 10px; margin-right: 10px; }
.klite-my { margin-top: 10px; margin-bottom: 10px; }

/* Text Alignment */
.klite-center { text-align: center; }
.klite-right { text-align: right; }
.klite-left { text-align: left; }

/* Display */
.klite-hidden { display: none; }
.klite-block { display: block; }
.klite-inline { display: inline; }
```

### Animation System

```css
/* Transitions */
.klite-transition {
    transition: all 0.3s ease;
}

/* Panel Animations */
.klite-panel {
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Fade In/Out */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

/* Slide Animations */
@keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
}

@keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}

/* Success Message Animation */
@keyframes successPulse {
    0% { opacity: 0; transform: translateY(20px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}
```

---

## 6. Character Card Specifications (V1/V2/V3)

### Character Card V1 Specification

The original, simplest format:

```javascript
{
    "name": "Character Name",
    "description": "Character appearance and basic info",
    "personality": "Personality traits",
    "scenario": "Current scenario or setting",
    "first_mes": "Greeting/first message",
    "mes_example": "Example dialogue format"
}
```

**Embedding Methods:**
- PNG: Base64 in EXIF "Chara" field
- WEBP: Base64 in EXIF metadata
- JSON: Direct file

### Character Card V2 Specification

Extended format with nested structure and advanced features:

```javascript
{
    "spec": "chara_card_v2",
    "spec_version": "2.0",
    "data": {
        // Core V1 fields
        "name": "Character Name",
        "description": "{{char}} is a...",  // Supports {{char}} and {{user}} macros
        "personality": "Detailed personality",
        "scenario": "Setting and context",
        "first_mes": "Greeting message",
        "mes_example": "<START>\n{{user}}: Hello\n{{char}}: Response\n<START>",
        
        // V2 additions
        "creator_notes": "Notes for users of this character",
        "system_prompt": "Override system prompt",
        "post_history_instructions": "Instructions after chat history",
        "alternate_greetings": [
            "Alternative greeting 1",
            "Alternative greeting 2"
        ],
        "character_book": {
            "entries": [
                {
                    "keys": ["trigger1", "trigger2"],
                    "content": "Information to inject",
                    "enabled": true,
                    "insertion_order": 100,
                    "case_sensitive": false,
                    "name": "Entry Name",
                    "priority": 10,
                    "id": 1,
                    "comment": "Developer notes",
                    "selective": false,
                    "secondary_keys": ["secondary1"],
                    "constant": false,
                    "position": "before_char",
                    "extensions": {
                        "position": 0,
                        "exclude_recursion": false,
                        "display_index": 1,
                        "probability": 100,
                        "useProbability": true
                    }
                }
            ]
        },
        "tags": ["fantasy", "female", "elf"],
        "creator": "Creator Name",
        "character_version": "1.0",
        "extensions": {
            "talkativeness": "0.5",
            "fav": false,
            "world": "Fantasy World"
        }
    }
}
```

### Character Card V3 Specification

Latest format with multimedia support:

```javascript
{
    "spec": "chara_card_v3",
    "spec_version": "3.0",
    "data": {
        // All V2 fields plus:
        "assets": [
            {
                "type": "icon",
                "uri": "embeded://path/to/asset.png",
                "name": "main",
                "ext": "png"
            },
            {
                "type": "emotion",
                "uri": "embeded://emotions/happy.png",
                "name": "happy",
                "ext": "png"
            }
        ],
        
        "nickname": "Display name if different from name",
        
        "creator_notes_multilingual": {
            "en": "English notes",
            "ja": "日本語のノート",
            "es": "Notas en español"
        },
        
        "character_book": {
            // V2 structure plus:
            "name": "Lorebook Name",
            "description": "Lorebook description",
            "scan_depth": 1000,
            "token_budget": 512,
            "recursive_scanning": false,
            "extensions": {
                "regex_triggers": true
            },
            "entries": {
                "1": {
                    // V2 entry structure plus:
                    "regex": "\\b(sword|blade)\\b",
                    "decorators": [
                        "@@activate_only_after 5",
                        "@@depth 3",
                        "@@role assistant",
                        "@@scan_depth 1000"
                    ],
                    "automation_id": "combat_scene"
                }
            }
        },
        
        "group_only_greetings": [
            "Greeting used only in group chats"
        ],
        
        "source": ["https://original-source.com"],
        "creation_date": 1704067200,
        "modification_date": 1704153600
    }
}
```

### V3 Lorebook Decorators

Advanced control over lorebook behavior:

```
@@activate_only_after [number]    // Active after N messages
@@activate_only_every [number]    // Active every N messages
@@dont_activate_after [number]     // Stop after N messages
@@dont_activate_for [number]       // Skip next N messages
@@activate_only_for [number]       // Active for next N messages
@@depth [number]                   // Injection depth (0=immediate)
@@role [user|assistant|system]     // Message role
@@position [position]              // Override insertion position
@@ignore_on_max_context           // Skip if context full
@@use_regex                       // Enable regex matching
@@automations [ids]               // Trigger automations
@@scan_depth [number]             // Override scan depth
```

### Character Import Process

```javascript
// 1. Extract from file
async function readCharacterFile(file) {
    if (file.name.endsWith('.png') || file.name.endsWith('.webp')) {
        return readTavernPngFromBlob(file);
    } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        return JSON.parse(text);
    }
}

// 2. Normalize format
function normalizeCharacter(data) {
    // Handle V1 (direct format)
    if (!data.spec) {
        return { data: data, version: 1 };
    }
    
    // Handle V2/V3 (nested format)
    if (data.spec === 'chara_card_v2') {
        return { data: data.data, version: 2 };
    }
    
    if (data.spec === 'chara_card_v3') {
        return { data: data.data, version: 3 };
    }
}

// 3. Import to KoboldAI
function importCharacter(charData, mode) {
    switch(mode) {
        case 'scenario':
            // Full character load
            window.restart_new_game(false);
            window.current_memory = buildCharacterContext(charData);
            if (charData.first_mes) {
                window.gametext_arr = [charData.first_mes];
            }
            break;
            
        case 'worldinfo':
            // Add to World Info
            const wiEntry = {
                key: charData.name,
                content: buildCharacterContent(charData),
                comment: `${charData.name}_imported_memory`, // CRITICAL!
                wigroup: "Characters",
                probability: 100
            };
            window.current_wi.push(wiEntry);
            break;
            
        case 'memory':
            // Append to memory
            window.current_memory += '\n\n' + buildCharacterContent(charData);
            break;
    }
}
```

### Character Content Building

```javascript
function buildCharacterContent(char) {
    let content = `[Character: ${char.name}]\n`;
    
    // Basic info
    if (char.description) {
        content += `Description: ${char.description}\n`;
    }
    if (char.personality) {
        content += `Personality: ${char.personality}\n`;
    }
    if (char.scenario) {
        content += `Scenario: ${char.scenario}\n`;
    }
    
    // V2+ features
    if (char.creator_notes) {
        content += `\nNotes: ${char.creator_notes}\n`;
    }
    
    // Example dialogue
    if (char.mes_example) {
        content += `\nExample Dialogue:\n${char.mes_example}\n`;
    }
    
    return content;
}
```

---

## 7. KoboldAI Lite API Reference

### Core Functions

#### Generation Control

```javascript
// Submit text for AI generation
submit_generation(senttext)
// Parameters:
//   senttext: Text to append before generating
// Process:
//   1. Applies regex replacements
//   2. Mode-specific formatting
//   3. Context building and WI injection
//   4. Sends to selected backend

// Prepare submission (internal)
prepare_submit_generation()
// Returns: formatted text ready for submission
// Handles: mode detection, special formatting

// Dispatch to backend
dispatch_submit_generation(submit_payload, input_was_empty)
// Parameters:
//   submit_payload: {prompt, params}
//   input_was_empty: boolean
// Routes to: Horde, KoboldCpp, OpenAI, etc.

// Abort current generation
abort_generation()
// Cancels: active request
// Cleans: UI state, pending flags

// Retry last generation
btn_retry()
// Restores: previous context
// Resubmits: with same parameters
```

#### Story Management

```javascript
// Render story display
render_gametext(save = true, use_mode_var = false)
// Parameters:
//   save: trigger autosave
//   use_mode_var: force specific mode
// Updates: all UI variants

// Get concatenated story
concat_gametext(stripimg = false, stripimg_replace_str = "", 
                append_before_segment = "", append_after_segment = "",
                escapeTxt = false, insertAIVision = false)
// Returns: full story text with options

// Handle incoming AI text
handle_incoming_text(gentxt, genworker, genmdl, genkudos)
// Parameters:
//   gentxt: generated text
//   genworker: worker name (Horde)
//   genmdl: model name
//   genkudos: kudos spent (Horde)

// Undo/Redo
btn_back()      // Remove last action
btn_redo()      // Restore removed action
```

#### Settings Management

```javascript
// Save all settings
save_settings()
// Saves: localsettings to localStorage

// Confirm and apply settings
confirm_settings()
// Validates: all inputs
// Clamps: values to valid ranges
// Triggers: autosave

// Display settings panel
display_settings()
// Shows: settings popup
// Loads: current values

// Toggle operation mode
toggle_opmode()
// Cycles: through Story->Adventure->Chat->Instruct
```

#### World Info Functions

```javascript
// Inject WI into context
inject_wi_in_prompt(inputctx, calling_from_cfgmem = false)
// Parameters:
//   inputctx: current context
//   calling_from_cfgmem: internal flag
// Returns: context with WI injected

// Add new WI entry
add_wi()
// Creates: empty WI entry
// Shows: WI editor

// Save WI changes
save_wi()
// Updates: current_wi array
// Triggers: autosave

// Toggle WI entry
toggle_wi_enabled(idx)
// Parameters:
//   idx: entry index
// Toggles: widisabled flag
```

#### Character/Chat Functions

```javascript
// Impersonate character
impersonate_message(mode)
// Parameters:
//   mode: character index or special value
// Adds: message as character

// AI speaks as user
impersonate_user()
// Reverses: speaker roles

// Handle group chat
show_groupchat_select()
// Shows: participant selector
// Manages: groupchat_removals

// Get random participant
get_random_participant(excluded = [])
// Parameters:
//   excluded: names to exclude
// Returns: selected participant name
```

#### Storage Functions

```javascript
// IndexedDB operations
indexeddb_save(objkey, objdatastr)
indexeddb_load(objkey, defaultvalue)
// Async functions for large data

// Save/Load slots
save_to_slot(slot, islocal, showcontainer)
load_from_slot(slot, islocal, switch_to_corpo)
// Parameters:
//   slot: 0-9
//   islocal: true for browser, false for server
//   showcontainer: show save/load UI

// Quick save/load
quicksave()      // Save to last slot
quickload()      // Load from last slot

// Generate story export
generate_compressed_story(save_images, export_settings, export_aesthetic_settings)
// Returns: compressed story object
```

#### UI Functions

```javascript
// Message box
msgbox(text, title = "Error Encountered", isHtml = false, noBtn = false, onDoneFn = null)
// Shows: modal message

// Input dialog
inputBox(text, title, inputVal, inputPlaceholder, onDone, 
         isHtml = false, isTextArea = false, isPassword = false)
// Shows: input dialog
// Returns: via onDone callback

// Hide popups
hide_popups()
// Closes: all open dialogs

// Update UI elements
update_submit_button(full_update)
handle_autoscroll(alwaysscroll = true)
```

#### Connection Management

```javascript
// Initial connection
attempt_connect(popup_aiselect = true)
// Parameters:
//   popup_aiselect: show model selector
// Connects: to selected backend

// Connect to custom endpoint
connect_custom_endpoint()
// Reads: dropdown selection
// Configures: API settings

// Check connection features
is_using_kcpp_with_streaming()
is_using_kcpp_with_mirostat()
is_using_kcpp_with_grammar()
is_using_kcpp_with_websearch()
// Returns: boolean for feature support
```

### Utility Functions

```javascript
// Text processing
escape_html(unsafe)                    // HTML escape
escape_for_ai(text)                   // AI-safe escaping
end_trim_to_sentence(input, include_newline = false)
start_trim_to_sentence(input)
count_words(str)

// Format validation
validate_regex(pattern)               // Test regex validity
is_numeric(n)                        // Check if numeric
format_json_error(data)             // Format JSON errors

// Image handling
readTavernPngFromBlob(blob, onDone)  // Extract character from PNG
compressImage(inputDataUri, onDone, fixedSize = true)

// Hashing
cyrb_hash(str, seed = 0)             // Generate hash
```

### Global Variables Reference

```javascript
// Arrays
gametext_arr[]        // Story chunks
redo_arr[]           // Redo stack
current_wi[]         // World Info entries
retry_prev_text[]    // Retry history
defaultmodels[]      // Default AI models
ignoredmodels[]      // Blacklisted models

// Strings
current_memory       // Memory content
current_anote        // Author's note
pending_response_id  // Active generation
custom_kobold_endpoint // API endpoint
custom_oai_key       // API key

// Objects
localsettings{}      // All settings
koboldcpp_version{}  // Version info
perfdata{}          // Performance data
models_data[]       // Available models
worker_data[]       // Horde workers

// Booleans
retry_in_progress    // Retry active
poll_in_progress     // Polling active
multiplayer_active   // Multiplayer on
koboldcpp_has_vision // Vision support
```

---

## 8. KLITE-RPmod API Reference

### Main Controller

```javascript
window.KLITE_RPMod = {
    // Properties
    version: '5.0.0',              // Mod version
    state: {},                     // UI state
    panels: {},                    // Panel registry
    characters: [],                // Loaded characters
    worldInfo: [],                 // WI entries
    
    // Core Methods
    init(),                        // Initialize mod
    buildUI(),                     // Create interface
    setupHooks(),                  // Hook KoboldAI
    startSync(),                   // Start synchronization
    
    // Panel Management
    loadPanel(side, name),         // Load panel content
    switchTab(panel, tab),         // Switch active tab
    togglePanel(side),             // Collapse/expand
    
    // State Management
    saveState(),                   // Save to localStorage
    loadState(),                   // Load from localStorage
    
    // UI Operations
    toggleUI(),                    // Switch rpmod/lite
    syncChat(),                    // Sync story display
    updateTokens(),                // Update counters
    updateStatus(),                // Update connection
    updateSubmitBtn(),             // Update button state
    toggleEdit(),                  // Toggle edit mode
    toggleFullscreen(),            // Fullscreen mode
    
    // Mode Operations
    getMode(),                     // Get current mode
    setMode(mode),                 // Set operation mode
    updateModeButtons(),           // Update mode UI
    bottomAction(index),           // Handle bottom buttons
    
    // Generation
    submit(),                      // Submit input
    
    // Utilities
    escapeHtml(text),             // HTML escape
    showSuccessMessage(msg),       // Show notification
    createErrorPanel(title, error) // Error display
}
```

### Panel Interface

```javascript
{
    // Required
    render(): string,              // Return panel HTML
    
    // Optional Lifecycle
    init(): void,                  // After DOM insertion
    onActivate(): void,            // Panel shown
    onDeactivate(): void,          // Panel hidden
    onDestroy(): void,             // Panel removed
    
    // Optional Handlers
    actions: {                     // Button handlers
        'action-name': (event) => {}
    },
    oninput(event): void,         // Input handler
    onchange(event): void,        // Change handler
    
    // Optional State
    state: {},                    // Panel state
    save(): void,                 // Save state
    load(): void                  // Load state
}
```

### Event System

```javascript
// Handle all clicks through delegation
handleClick(event) {
    if (event.target.classList.contains('klite-handle')) {
        // Panel collapse/expand
    } else if (event.target.classList.contains('klite-tab')) {
        // Tab switching
    } else if (event.target.dataset.action) {
        // Action button
    }
}

// Handle all inputs
handleInput(event) {
    // Delegate to active panel
    const panel = this.panels[this.state.tabs[side]];
    if (panel?.oninput) {
        panel.oninput(event);
    }
}
```

### Template System API

```javascript
const t = {
    // Containers
    section(title: string, content: string, collapsed: boolean = false): string,
    row(content: string): string,
    
    // Form Elements
    button(text: string, className: string = '', action: string = ''): string,
    input(id: string, placeholder: string = '', type: string = 'text', value: string = ''): string,
    textarea(id: string, placeholder: string = '', value: string = ''): string,
    select(id: string, options: Array<{value: string, text: string, selected?: boolean}>): string,
    checkbox(id: string, label: string, checked: boolean = false): string,
    slider(id: string, min: number, max: number, value: number, label: string = ''): string,
    
    // Text
    muted(text: string): string
}
```

### Utility Functions

```javascript
// HTML escaping
KLITE_RPMod.escapeHtml(text: string): string

// Notifications
KLITE_RPMod.showSuccessMessage(message: string): void

// Panel refresh
KLITE_RPMod.loadPanel(side: 'left'|'right', name: string): void

// Tab switching
KLITE_RPMod.switchTab(panel: 'left'|'right', tab: string): void

// Mode detection
KLITE_RPMod.getMode(): 'story'|'adventure'|'chat'|'instruct'

// Token counting
KLITE_RPMod.updateTokens(): void
```

---

## 9. Advanced Integration Techniques

### Deep KoboldAI Integration

#### 1. Generation Pipeline Hooking

```javascript
// Complete generation pipeline override
const originalSubmit = window.submit_generation;
window.submit_generation = function(text) {
    // Pre-processing
    console.log('Pre-process:', text);
    
    // Modify input
    if (KLITE_RPMod.panels.CURRENT?.preProcess) {
        text = KLITE_RPMod.panels.CURRENT.preProcess(text);
    }
    
    // Call original
    const result = originalSubmit.call(window, text);
    
    // Post-processing hook
    const originalHandle = window.handle_incoming_text;
    window.handle_incoming_text = function(gentxt, ...args) {
        // Modify response
        if (KLITE_RPMod.panels.CURRENT?.postProcess) {
            gentxt = KLITE_RPMod.panels.CURRENT.postProcess(gentxt);
        }
        
        // Restore and call
        window.handle_incoming_text = originalHandle;
        return originalHandle.call(window, gentxt, ...args);
    };
    
    return result;
};
```

#### 2. Context Manipulation

```javascript
// Hook context building
const originalConcat = window.concat_gametext;
window.concat_gametext = function(...args) {
    let context = originalConcat.apply(window, args);
    
    // Inject custom context
    if (KLITE_RPMod.customContext) {
        const injectPoint = context.lastIndexOf('\n\n');
        context = context.slice(0, injectPoint) + 
                  '\n\n' + KLITE_RPMod.customContext + 
                  context.slice(injectPoint);
    }
    
    return context;
};
```

#### 3. Dynamic Stop Sequences

```javascript
// Add custom stop sequences
const originalGetStops = window.get_stop_sequences;
window.get_stop_sequences = function() {
    const stops = originalGetStops();
    
    // Add panel-specific stops
    if (KLITE_RPMod.panels.CURRENT?.getStopSequences) {
        stops.push(...KLITE_RPMod.panels.CURRENT.getStopSequences());
    }
    
    return stops;
};
```

### Advanced Panel Patterns

#### 1. Stateful Panel with Persistence

```javascript
KLITE_RPMod.panels.STATEFUL = {
    state: {
        counter: 0,
        history: [],
        settings: {}
    },
    
    render() {
        return `
            <div>Counter: ${this.state.counter}</div>
            ${t.button('Increment', '', 'increment')}
        `;
    },
    
    init() {
        // Load persisted state
        const saved = localStorage.getItem('klite-stateful');
        if (saved) {
            Object.assign(this.state, JSON.parse(saved));
        }
        
        // Auto-save on changes
        this.autoSave = () => {
            localStorage.setItem('klite-stateful', 
                JSON.stringify(this.state));
        };
    },
    
    actions: {
        'increment': () => {
            KLITE_RPMod.panels.STATEFUL.state.counter++;
            KLITE_RPMod.panels.STATEFUL.autoSave();
            KLITE_RPMod.loadPanel('left', 'STATEFUL');
        }
    }
};
```

#### 2. Real-time Data Panel

```javascript
KLITE_RPMod.panels.REALTIME = {
    updateInterval: null,
    
    render() {
        return `
            <div id="realtime-stats">Loading...</div>
        `;
    },
    
    init() {
        this.update();
        this.updateInterval = setInterval(() => {
            this.update();
        }, 1000);
    },
    
    onDeactivate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },
    
    update() {
        const stats = document.getElementById('realtime-stats');
        if (stats) {
            stats.innerHTML = `
                <div>Time: ${new Date().toLocaleTimeString()}</div>
                <div>Tokens: ${window.gametext_arr.join('').length / 4}</div>
                <div>Messages: ${window.gametext_arr.length}</div>
            `;
        }
    }
};
```

#### 3. Cross-Panel Communication

```javascript
// Event-based communication
KLITE_RPMod.events = {
    listeners: {},
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
};

// Panel A emits
KLITE_RPMod.events.emit('character-selected', { name: 'Alice' });

// Panel B listens
KLITE_RPMod.events.on('character-selected', (data) => {
    console.log('Character selected:', data.name);
});
```

### Performance Optimization

#### 1. Debounced Updates

```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Use in panel
const debouncedSave = debounce(() => {
    localStorage.setItem('data', JSON.stringify(this.state));
}, 1000);
```

#### 2. Virtual Scrolling

```javascript
KLITE_RPMod.panels.VIRTUAL_LIST = {
    items: Array(10000).fill(0).map((_, i) => `Item ${i}`),
    
    render() {
        return `
            <div id="virtual-container" style="height: 400px; overflow-y: auto;">
                <div id="virtual-content"></div>
            </div>
        `;
    },
    
    init() {
        const container = document.getElementById('virtual-container');
        const content = document.getElementById('virtual-content');
        const itemHeight = 30;
        const visibleItems = Math.ceil(400 / itemHeight);
        
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = startIndex + visibleItems;
            
            content.style.height = `${this.items.length * itemHeight}px`;
            content.style.paddingTop = `${startIndex * itemHeight}px`;
            
            content.innerHTML = this.items
                .slice(startIndex, endIndex)
                .map(item => `<div style="height: ${itemHeight}px">${item}</div>`)
                .join('');
        });
        
        // Initial render
        container.dispatchEvent(new Event('scroll'));
    }
};
```

---

## 10. World Info System

### Complete WI Entry Structure

```javascript
const worldInfoEntry = {
    // Core fields
    "key": "alice,dr chen,doctor chen",    // Primary triggers (CSV)
    "keysecondary": "laboratory,quantum",  // Secondary triggers
    "keyanti": "sleeping,away,absent",     // Anti-triggers
    "content": "Dr. Alice Chen is a...",   // Information to inject
    "comment": "Description for editor",    // Editor description
    
    // Behavior controls
    "selective": false,      // false = any primary trigger
                            // true = needs primary AND secondary
    "constant": false,       // true = always active
    "probability": 100,      // 1-100% trigger chance
    "widisabled": false,     // Enable/disable
    
    // Organization
    "wigroup": "Characters", // Group/folder name
    "folder": null,         // Legacy, not used
    
    // Advanced (V2+ features)
    "position": 0,          // Insertion position
    "depth": 4,            // Scan depth
    "caseSensitive": false, // Case sensitivity
    "matchWholeWord": true, // Word boundaries
    "priority": 10,        // Higher = earlier injection
    "uid": "unique-id-123" // Unique identifier
};
```

### WI Injection Logic

```javascript
function inject_wi_in_prompt(context) {
    let wistr = "";
    const wimatch_context = prepareMatchContext(context);
    
    for (let wi of current_wi) {
        if (wi.widisabled || !wi.content) continue;
        
        // Constant entries always activate
        if (wi.constant) {
            if (rollProbability(wi.probability)) {
                wistr += wi.content + "\n";
            }
            continue;
        }
        
        // Check triggers
        const primaryMatch = checkPrimaryKeys(wi, wimatch_context);
        
        if (wi.selective) {
            // Need both primary AND secondary
            if (primaryMatch && checkSecondaryKeys(wi, wimatch_context)) {
                if (!checkAntiKeys(wi, wimatch_context)) {
                    if (rollProbability(wi.probability)) {
                        wistr += wi.content + "\n";
                    }
                }
            }
        } else {
            // Just need primary
            if (primaryMatch && !checkAntiKeys(wi, wimatch_context)) {
                if (rollProbability(wi.probability)) {
                    wistr += wi.content + "\n";
                }
            }
        }
    }
    
    return insertWIAtPosition(context, wistr);
}
```

### Advanced WI Patterns

#### 1. Character Memory Import

```javascript
// CRITICAL: Comment format for imported characters
function importCharacterAsWI(character) {
    const entry = {
        key: character.name.toLowerCase(),
        keysecondary: extractAliases(character),
        content: buildCharacterWI(character),
        comment: `${character.name}_imported_memory`, // MUST follow this format!
        selective: false,
        constant: false,
        probability: 100,
        wigroup: "Characters",
        widisabled: false
    };
    
    current_wi.push(entry);
}
```

#### 2. Dynamic WI Groups

```javascript
// Create contextual WI groups
function createLocationWI(location) {
    return {
        key: location.name,
        keysecondary: location.landmarks.join(','),
        keyanti: location.excludeWhen.join(','),
        content: location.description,
        comment: `Location: ${location.name}`,
        selective: true,
        wigroup: "Locations",
        probability: 90
    };
}
```

#### 3. Conditional WI

```javascript
// WI that activates based on story state
function createConditionalWI(condition, content) {
    return {
        key: "!!!NEVER_MATCH!!!",  // Never trigger normally
        content: content,
        comment: `Conditional: ${condition}`,
        constant: false,
        // Custom activation logic
        customCheck: () => evaluateCondition(condition)
    };
}
```

### WI Best Practices

1. **Key Selection**
   - Use multiple variations: "bob,robert,bobby"
   - Include common misspellings
   - Consider context: "dr chen,doctor chen,chen"

2. **Content Writing**
   - Keep concise (under 200 tokens)
   - Front-load important information
   - Use consistent formatting

3. **Performance**
   - Limit active entries (< 100)
   - Use selective triggers wisely
   - Set appropriate scan depths

4. **Organization**
   - Use groups for categories
   - Maintain consistent naming
   - Document with comments

---

## 11. Sampler Parameters & Generation

### Complete Sampler Reference

#### Standard Samplers

```javascript
// Temperature (0.01 - 5.0)
// Controls randomness. Lower = more deterministic
localsettings.temperature = 0.7;

// Top-K (0 - 300) 
// Limits to top K most likely tokens. 0 = disabled
localsettings.top_k = 40;

// Top-P / Nucleus (0.002 - 1.0)
// Cumulative probability cutoff
localsettings.top_p = 0.9;

// Min-P (0.0 - 1.0)
// Minimum probability threshold
localsettings.min_p = 0.05;

// Top-A (0.0 - 1.0)
// Top-A sampling
localsettings.top_a = 0.0;

// Typical (0.0 - 1.0)
// Typical sampling. 1.0 = disabled
localsettings.typ_s = 1.0;

// TFS (0.0 - 1.0)
// Tail-free sampling. 1.0 = disabled
localsettings.tfs_s = 1.0;
```

#### Repetition Control

```javascript
// Repetition Penalty (0.1 - 5.0)
// Penalty for repeated tokens
localsettings.rep_pen = 1.1;

// Rep Pen Range (0 - context size)
// How many tokens to consider
localsettings.rep_pen_range = 320;

// Rep Pen Slope (0 - 20)
// Penalty decay over distance
localsettings.rep_pen_slope = 0;

// Presence Penalty (-2.0 to 2.0)
// OpenAI-style penalty
localsettings.presence_penalty = 0.0;
```

#### Advanced Samplers (KoboldCpp)

```javascript
// Mirostat (0, 1, 2)
// 0 = disabled, 1 = Mirostat v1, 2 = Mirostat v2
localsettings.miro_type = 0;

// Mirostat Tau (0 - 30)
// Target perplexity
localsettings.miro_tau = 5.0;

// Mirostat Eta (0 - 10)
// Learning rate
localsettings.miro_eta = 0.1;

// Dynamic Temperature
localsettings.dynatemp_range = 0.5;    // Range (-5 to 5)
localsettings.dynatemp_exponent = 1.0; // Curve (0-10)

// Smoothing Factor (0 - 10)
// Quadratic sampling
localsettings.smoothing_factor = 0.0;

// N-Sigma (0 - 5)
// Sigma cutoff
localsettings.nsigma = 0.0;
```

#### DRY (Don't Repeat Yourself)

```javascript
// DRY Multiplier (0 - 100)
// Penalty strength for repetition
localsettings.dry_multiplier = 0.8;

// DRY Base (0 - 8)
// Base penalty value
localsettings.dry_base = 1.75;

// DRY Allowed Length (0 - 100)
// Allowed sequence length before penalty
localsettings.dry_allowed_length = 2;

// DRY Sequence Breakers
// Tokens that reset DRY detection
localsettings.dry_sequence_breakers = "\\n,*,:,>"; // Comma-separated
```

#### XTC (Exclude Top Choices)

```javascript
// XTC Threshold (0 - 1)
// Probability threshold
localsettings.xtc_threshold = 0.1;

// XTC Probability (0 - 1)
// Chance to apply XTC
localsettings.xtc_probability = 0.5;
```

### Sampler Presets

```javascript
const samplerPresets = {
    // Deterministic (precise, consistent)
    "Precise": {
        temperature: 0.3,
        top_p: 0.85,
        top_k: 20,
        rep_pen: 1.2,
        rep_pen_range: 512
    },
    
    // Balanced (default, versatile)
    "Balanced": {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        rep_pen: 1.1,
        rep_pen_range: 320
    },
    
    // Creative (varied, surprising)
    "Creative": {
        temperature: 1.2,
        top_p: 0.95,
        top_k: 100,
        rep_pen: 1.05,
        rep_pen_range: 256
    },
    
    // Chaotic (experimental, wild)
    "Chaotic": {
        temperature: 2.0,
        top_p: 0.99,
        top_k: 0,
        rep_pen: 1.0,
        miro_type: 2,
        miro_tau: 8.0
    }
};
```

### Generation Payload Structure

```javascript
const generationPayload = {
    // Core parameters
    "prompt": "Full context string",
    "max_context_length": 8192,
    "max_length": 200,
    "temperature": 0.7,
    
    // Samplers
    "top_p": 0.9,
    "top_k": 40,
    "min_p": 0.05,
    "typical": 1.0,
    "tfs": 1.0,
    
    // Repetition
    "rep_pen": 1.1,
    "rep_pen_range": 320,
    "rep_pen_slope": 0,
    
    // Advanced
    "mirostat": 0,
    "mirostat_tau": 5.0,
    "mirostat_eta": 0.1,
    
    // Stop sequences
    "stop_sequence": ["\\n", "User:"],
    
    // Special
    "use_default_badwordsids": false,
    "grammar": "",  // GBNF grammar string
    "sampler_seed": -1,  // -1 = random
    
    // Token bans
    "custom_token_bans": [1234, 5678],
    
    // Logit bias
    "logit_bias": {
        "1234": -100,  // Ban token
        "5678": 5      // Boost token
    },
    
    // Guidance
    "guidance_scale": 1.0,
    "guidance_prompt": "Alternative prompt",
    
    // Backend specific
    "genkey": "KCPP1234",  // KoboldCpp polling key
    "quiet": true          // Suppress backend logs
};
```

### Custom Sampler Logic

```javascript
// Implement custom sampling logic
function customSampler(logits, temperature) {
    // Apply temperature
    if (temperature !== 1.0) {
        logits = logits.map(l => l / temperature);
    }
    
    // Convert to probabilities
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probs = expLogits.map(e => e / sumExp);
    
    // Custom filtering
    const filtered = probs.map((p, i) => {
        // Your custom logic here
        return p;
    });
    
    // Sample
    return sampleFromDistribution(filtered);
}
```

---

## 12. Storage & Data Management

### Storage Hierarchy

```javascript
// 1. Runtime Variables (session only)
gametext_arr        // Story content
current_memory      // Memory field
current_wi          // World Info

// 2. localStorage (small data, settings)
"settings"          // localsettings object
"KLITE_RPMod_State" // Mod UI state
"klite-*"          // Panel-specific data

// 3. IndexedDB (large data)
"story"            // Compressed story
"slot_X_data"      // Save slot data
"slot_X_meta"      // Save metadata
"tavern_cards_library" // Character library
"savedcustomcss"   // Custom styles
"savedusermod"     // User scripts

// 4. Server Storage (KoboldCpp only)
"/api/extra/data/save" // Remote saves
"/api/extra/data/load" // Remote loads
```

### Save File Format

```javascript
{
    // KoboldAI Story Format
    "kobold_lite_ver": 257,
    "story_name": "My Adventure",
    "story_chunks": ["text1", "text2"],
    "memory": "Memory content",
    "authorsnote": "Author's note",
    "anotestr": 320,  // AN strength
    "anotetemplate": "[Author's note: <|>]",
    "worldinfo": [...],
    "initial_opmode": 3,  // Chat mode
    "chatname": "User",
    "chatopponent": "AI||$||Bot2",
    "groupchat_removals": ["Bot2"],
    "savedsettings": {...},
    "savedaestheticsettings": {...},
    
    // Additional data
    "documentdb_data": "...",
    "completed_imgs_meta": [...],
    "initial_seed": -1,
    "timestamp": 1704067200000
}
```

### Compression System

```javascript
// Story compression for export
function generate_compressed_story(
    save_images = true,
    export_settings = true,
    export_aesthetic_settings = true
) {
    const storyData = {
        version: LITEVER,
        timestamp: Date.now(),
        story: gametext_arr,
        settings: export_settings ? localsettings : null,
        images: save_images ? collectImages() : null
    };
    
    // Compress with LZMA
    const jsonStr = JSON.stringify(storyData);
    const compressed = lz_c.compress(jsonStr);
    
    return btoa(String.fromCharCode(...compressed));
}

// Decompression
function decompress_story(compressed) {
    const bytes = atob(compressed).split('').map(c => c.charCodeAt(0));
    const decompressed = lz_d.decompress(bytes);
    const jsonStr = String.fromCharCode(...decompressed);
    
    return JSON.parse(jsonStr);
}
```

### Data Migration

```javascript
// Migrate old format to new
function migrateData() {
    // Check version
    const oldVersion = localStorage.getItem('kobold_version');
    
    if (oldVersion && oldVersion < 257) {
        // Migrate settings
        const oldSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        
        // Map old fields to new
        if (oldSettings.temp !== undefined) {
            oldSettings.temperature = oldSettings.temp;
            delete oldSettings.temp;
        }
        
        // Save migrated data
        localStorage.setItem('settings', JSON.stringify(oldSettings));
        localStorage.setItem('kobold_version', '257');
    }
}
```

### Backup & Restore

```javascript
// Create full backup
function createBackup() {
    const backup = {
        version: LITEVER,
        timestamp: Date.now(),
        localStorage: {},
        indexedDB: {}
    };
    
    // Backup localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        backup.localStorage[key] = localStorage.getItem(key);
    }
    
    // Backup IndexedDB (async)
    return backupIndexedDB().then(idbData => {
        backup.indexedDB = idbData;
        return backup;
    });
}

// Restore from backup
function restoreBackup(backup) {
    // Verify version compatibility
    if (backup.version > LITEVER) {
        throw new Error('Backup from newer version');
    }
    
    // Clear existing data
    localStorage.clear();
    
    // Restore localStorage
    for (const [key, value] of Object.entries(backup.localStorage)) {
        localStorage.setItem(key, value);
    }
    
    // Restore IndexedDB
    return restoreIndexedDB(backup.indexedDB);
}
```

---

## 13. Testing, Debugging & Troubleshooting

### Debug Console

```javascript
// Enable debug mode
KLITE_RPMod.debug = true;

// Check mod state
console.log(KLITE_RPMod.state);

// Verify KoboldAI integration
console.log({
    koboldReady: typeof submit_generation_button === 'function',
    gametext: document.getElementById('gametext') !== null,
    settings: typeof localsettings === 'object',
    memory: typeof current_memory === 'string'
});

// Test panel loading
KLITE_RPMod.loadPanel('left', 'TOOLS');

// Force refresh
KLITE_RPMod.syncChat();
KLITE_RPMod.updateTokens();

// Check hooks
console.log({
    submitHooked: window.submit_generation_button.toString().includes('KLITE'),
    renderHooked: window.render_gametext.toString().includes('KLITE')
});
```

### Common Issues & Solutions

#### 1. Mod Not Loading

**Symptoms:** No UI changes, console errors

**Checks:**
```javascript
// Check duplicate load protection
console.log(window.KLITE_RPMod_LOADED);

// Check KoboldAI ready
console.log(document.getElementById('gametext'));
console.log(typeof submit_generation_button);

// Manual init
delete window.KLITE_RPMod_LOADED;
KLITE_RPMod.init();
```

**Solutions:**
- Ensure KoboldAI Lite is fully loaded
- Check for JavaScript errors
- Try different browser
- Clear cache and reload

#### 2. Panels Not Appearing

**Symptoms:** Buttons work but no panels show

**Checks:**
```javascript
// Check CSS injection
console.log(document.getElementById('klite-rpmod-styles'));

// Check container
console.log(document.querySelector('.klite-container'));

// Force visibility
document.querySelectorAll('.klite-panel').forEach(p => {
    p.style.display = 'block';
    p.classList.remove('collapsed');
});
```

**Solutions:**
- Check for CSS conflicts
- Verify panel registration
- Inspect DOM structure
- Reset localStorage state

#### 3. Actions Not Working

**Symptoms:** Buttons don't respond

**Checks:**
```javascript
// Check event delegation
const container = document.querySelector('.klite-container');
console.log(container._events); // Should be undefined (using delegation)

// Test action directly
KLITE_RPMod.handleAction('your-action');

// Check panel actions
console.log(KLITE_RPMod.panels.CURRENT.actions);
```

**Solutions:**
- Verify data-action attributes
- Check action name spelling
- Ensure panel has actions object
- Test in console directly

#### 4. State Not Saving

**Symptoms:** Settings reset on reload

**Checks:**
```javascript
// Check localStorage
console.log(localStorage.getItem('klite-state'));

// Test save
KLITE_RPMod.saveState();
console.log(localStorage.getItem('klite-state'));

// Check quota
try {
    localStorage.setItem('test', 'x'.repeat(1024*1024));
} catch(e) {
    console.log('Storage full:', e);
}
```

**Solutions:**
- Clear old localStorage data
- Check browser storage settings
- Use incognito mode test
- Implement data cleanup

### Performance Profiling

```javascript
// Measure render time
console.time('panel-render');
KLITE_RPMod.loadPanel('left', 'TOOLS');
console.timeEnd('panel-render');

// Memory usage
console.log({
    heapUsed: performance.memory.usedJSHeapSize / 1024 / 1024 + ' MB',
    heapTotal: performance.memory.totalJSHeapSize / 1024 / 1024 + ' MB'
});

// Check for leaks
const initialHeap = performance.memory.usedJSHeapSize;
// Perform operations
const finalHeap = performance.memory.usedJSHeapSize;
console.log('Memory delta:', (finalHeap - initialHeap) / 1024 + ' KB');
```

### Error Recovery

```javascript
// Complete reset
function fullReset() {
    // Remove mod
    document.getElementById('klite-container')?.remove();
    document.getElementById('klite-rpmod-styles')?.remove();
    
    // Clear state
    delete window.KLITE_RPMod;
    delete window.KLITE_RPMod_LOADED;
    
    // Clear storage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('klite-')) {
            localStorage.removeItem(key);
        }
    });
    
    // Restore KoboldAI
    document.body.classList.remove('klite-active');
    location.reload();
}

// Soft reset
function softReset() {
    localStorage.removeItem('klite-state');
    KLITE_RPMod.state = {
        tabs: { left: 'PLAY', right: 'MEMORY' },
        collapsed: { left: false, right: false, top: false },
        generating: false
    };
    KLITE_RPMod.buildUI();
}
```

### Testing Checklist

#### Before Release
- [ ] Test all operation modes
- [ ] Test all UI variants
- [ ] Test with empty story
- [ ] Test with large story (1000+ messages)
- [ ] Test all panels
- [ ] Test mobile view
- [ ] Test with different backends
- [ ] Test error conditions
- [ ] Test state persistence
- [ ] Test character import

#### Browser Testing
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Mobile Chrome
- [ ] Mobile Safari

#### Integration Testing
- [ ] KoboldCpp local
- [ ] Horde connection
- [ ] OpenAI connection
- [ ] Multiplayer mode
- [ ] Image generation
- [ ] TTS/STT features

---

## 14. Complete Reference Tables

### KoboldAI Lite Functions

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `submit_generation(text)` | Submit to AI | text: string | void |
| `abort_generation()` | Stop generation | none | void |
| `render_gametext(save, scroll)` | Update display | save: bool, scroll: bool | void |
| `concat_gametext(stripimg, ...)` | Get story text | multiple options | string |
| `handle_incoming_text(text, ...)` | Process response | text, worker, model, kudos | void |
| `btn_retry()` | Retry last | none | void |
| `btn_back()` | Undo | none | void |
| `btn_redo()` | Redo | none | void |
| `save_settings()` | Save settings | none | void |
| `display_settings()` | Show settings | none | void |
| `toggle_opmode()` | Change mode | none | void |
| `inject_wi_in_prompt(ctx)` | Add WI | context: string | string |
| `impersonate_message(idx)` | Speak as char | index: number | void |
| `impersonate_user()` | AI as user | none | void |
| `indexeddb_save(key, data)` | Save large data | key: string, data: string | Promise |
| `indexeddb_load(key, default)` | Load large data | key: string, default: any | Promise |

### Global Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `LITEVER` | number | Version | 257 |
| `gametext_arr` | string[] | Story chunks | ["Hello", "World"] |
| `localsettings` | object | All settings | {opmode: 3, ...} |
| `current_memory` | string | Memory | "You are..." |
| `current_anote` | string | Author's note | "Style: verbose" |
| `current_wi` | array | World Info | [{key: "alice", ...}] |
| `pending_response_id` | string | Gen ID | "HORDE#123" |
| `retry_in_progress` | boolean | Retrying | false |
| `custom_kobold_endpoint` | string | API URL | "http://localhost:5001" |

### Operation Modes

| Mode | Value | Name | Description | Format |
|------|-------|------|-------------|--------|
| Story | 1 | Story Mode | Traditional narrative | Direct text |
| Adventure | 2 | Adventure Mode | Text adventure | `> action` |
| Chat | 3 | Chat Mode | Conversation | `Name: message` |
| Instruct | 4 | Instruct Mode | Instructions | `{{[INPUT]}}...{{[OUTPUT]}}` |

### UI Variants

| Variant | Value | Name | Best For |
|---------|-------|------|----------|
| Classic | 1 | Classic UI | Power users, editing |
| Aesthetic | 2 | Aesthetic UI | Visual novels, RP |
| Corpo | 3 | Corpo UI | Mobile, casual chat |

### DOM Elements

| Element | ID | Purpose | Required |
|---------|-----|---------|----------|
| Story Display | `gametext` | Main story area | Yes |
| Input Field | `input_text` | User input | Yes |
| Memory Field | `memorytext` | Context memory | Yes |
| Author's Note | `anotetext` | AN field | Yes |
| Top Menu | `topmenu` | Navigation | Yes |
| Status | `connectstatus` | Connection | No |
| Submit | `btnsend` | Send button | Yes |

### CSS Variables

| Variable | Default | Usage |
|----------|---------|-------|
| `--bg` | #1a1a1a | Main background |
| `--bg2` | #262626 | Panel background |
| `--bg3` | #333333 | Headers |
| `--text` | #e0e0e0 | Primary text |
| `--muted` | #666666 | Secondary text |
| `--border` | #444444 | Borders |
| `--accent` | #4a9eff | Primary accent |
| `--primary` | #337ab7 | Buttons |
| `--danger` | #d9534f | Delete/error |
| `--success` | #5cb85c | Success |
| `--warning` | #f0ad4e | Warning |

### Sampler Ranges

| Parameter | Min | Max | Default | Description |
|-----------|-----|-----|---------|-------------|
| temperature | 0.01 | 5.0 | 0.7 | Randomness |
| top_p | 0.002 | 1.0 | 0.9 | Nucleus sampling |
| top_k | 0 | 300 | 40 | Top-K sampling |
| rep_pen | 0.1 | 5.0 | 1.1 | Repetition penalty |
| rep_pen_range | 0 | 8192 | 320 | Rep pen range |
| miro_tau | 0 | 30 | 5.0 | Mirostat tau |
| dry_multiplier | 0 | 100 | 0.8 | DRY strength |

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `settings` | localStorage | KoboldAI settings |
| `KLITE_RPMod_State` | localStorage | Mod UI state |
| `klite-*` | localStorage | Panel data |
| `story` | IndexedDB | Compressed story |
| `slot_*_data` | IndexedDB | Save slots |
| `tavern_cards_library` | IndexedDB | Characters |

---

## 15. Development Best Practices

### Code Organization

```javascript
// 1. Module Structure
(function() {
    'use strict';
    
    // Constants at top
    const VERSION = '5.0.0';
    const STYLES = `...`;
    
    // Utilities
    const utils = { /* ... */ };
    
    // Main module
    const MODULE = { /* ... */ };
    
    // Initialization
    init();
})();

// 2. Naming Conventions
const CONSTANTS_IN_CAPS = true;
let camelCaseVariables = true;
function camelCaseFunctions() {}
data-kebab-case-attributes = true;
.css-class-names { }

// 3. Error Handling
try {
    riskyOperation();
} catch (error) {
    console.error('Context:', error);
    fallbackBehavior();
}
```

### Panel Development Guidelines

1. **Keep Panels Focused**
   - Single responsibility
   - Clear purpose
   - Minimal dependencies

2. **Use Templates**
   - Consistent HTML structure
   - Reuse template utilities
   - Avoid string concatenation

3. **Handle State Properly**
   - Save important data
   - Clean up on deactivate
   - Validate loaded data

4. **Optimize Performance**
   - Debounce expensive operations
   - Use event delegation
   - Minimize DOM updates

### Integration Guidelines

1. **Respect KoboldAI**
   - Don't break native features
   - Preserve original functions
   - Handle missing elements

2. **Test Thoroughly**
   - All operation modes
   - All UI variants
   - Edge cases

3. **Document Everything**
   - Clear comments
   - Usage examples
   - Known limitations

---

## Conclusion

KLITE-RPmod represents a new approach to enhancing KoboldAI Lite - one that prioritizes simplicity, maintainability, and user experience. By following the patterns and practices outlined in this documentation, you can create powerful extensions that seamlessly integrate with KoboldAI Lite's functionality.

Remember:
- **Keep it simple** - Functional patterns over complex OOP
- **Keep it clean** - Clear code over clever code
- **Keep it compatible** - Test across all modes and variants
- **Keep it documented** - Help others understand and contribute

Happy modding!

---

*This documentation covers KLITE-RPmod v5.0.0 for KoboldAI Lite v257+. For the latest updates, visit the [GitHub repository](https://github.com/PeterPeet/KLITE-RPmod).*