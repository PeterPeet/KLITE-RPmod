KLITE RP MOD TECHNICAL DOCUMENTATION
====================================
Version: 1.0.0
Target Platform: KoboldAI Lite (KoboldCpp Web Interface)
Architecture: Modular JavaScript User Modification

TABLE OF CONTENTS
-----------------
1. SYSTEM OVERVIEW
2. ARCHITECTURE LAYERS
3. MODULE SPECIFICATIONS
4. DATA STRUCTURES
5. INTEGRATION INTERFACES
6. THEMING SYSTEM
7. API REFERENCE
8. IMPLEMENTATION NOTES
9. USER INTERFACE SPECIFICATION
10. ACCESSIBILITY & USABILITY
11. USER WORKFLOWS
12. TROUBLESHOOTING GUIDE

================================================================================
1. SYSTEM OVERVIEW
================================================================================

KLITE RP Mod is a comprehensive user interface modification for KoboldAI Lite that 
replaces the default interface with a role-playing focused multi-panel system. The 
modification operates entirely client-side, integrating with KoboldAI's existing 
JavaScript API while providing enhanced functionality for character management, 
story organization, and user experience.

Key Features:
- Multi-panel interface with collapsible sections
- Character card manager with IndexedDB persistence
- Format detection and conversion for multiple character card standards
- Deep integration with KoboldAI's native functions
- Responsive design with mobile support
- Auto-save functionality across all editors
- Avatar synchronization system
- Drag-and-drop file handling
- Real-time token counting
- Intelligent panel state management

Technical Stack:
- Pure JavaScript (ES6+)
- IndexedDB for data persistence
- MutationObserver for DOM synchronization
- No external dependencies
- CSS Grid and Flexbox layouts
- Browser-native APIs only

Design Philosophy:
- Role-playing first: Optimized for character-driven storytelling
- Zero friction: Auto-save, smart defaults, intuitive workflows
- Power user friendly: Keyboard shortcuts, bulk operations
- Flexible theming: Comprehensive CSS architecture
- Privacy focused: All data stored locally

================================================================================
2. ARCHITECTURE LAYERS
================================================================================

The system implements a 5-layer architecture with clear separation of concerns:

LAYER 1: STORAGE LAYER (PERSISTENCE)
------------------------------------
Primary Database: IndexedDB
- Database Name: KLITECharacterManagerDB
- Version: 1
- Object Store: characters
  - KeyPath: id (timestamp + Math.random())
  - Indexes: name, creator, tags (multiEntry), rating
  - Schema:
    {
      id: number,              // Unique identifier
      name: string,            // Character display name
      description: string,     // Character description
      scenario: string,        // Scenario/setting text
      creator: string,         // Author name
      imageBlob: Blob,         // Portrait image blob
      tags: string[],          // User-defined tags
      rating: number,          // 0-5 rating (0=unrated)
      rawData: object,         // Complete v2 character data
      importedAt: string       // ISO 8601 timestamp
    }

Secondary Storage: LocalStorage
- KLITE_RPMod_State: UI state persistence (active tabs)
- KLITE_RPMod_PersonalNotes: User's private notes
- Native KoboldAI settings via localsettings object

Storage Quotas:
- IndexedDB: Browser-dependent (typically 50% of free disk)
- LocalStorage: 5-10MB limit
- Blob storage: Counted against IndexedDB quota

LAYER 2: DATA ACCESS LAYER (HELPERS)
------------------------------------
Location: window.KLITE_RPMod_Helpers

IndexedDB Manager:
- Singleton pattern implementation
- Automatic database initialization
- Promise-based async operations
- Methods:
  - init(): Initialize database connection
  - saveCharacter(character): Upsert operation
  - getAllCharacters(): Bulk retrieval
  - deleteCharacter(id): Single deletion
  - clearAllCharacters(): Bulk deletion

Security Module:
- XSS prevention via HTML sanitization
- Character data validation
- Format-preserving text cleaning
- Methods:
  - sanitizeHTML(text): Basic escaping
  - sanitizeCharacterDataPreserveFormat(data): Deep sanitization
  - sanitizeTextPreserveFormat(text): Dangerous content removal
  - sanitizeCharacterName(name): 100 char limit, control char removal
  - sanitizeCreatorName(creator): 50 char limit
  - sanitizeTags(tags): Max 20 tags, 30 chars each

TextEncoding Module:
- UTF-8 artifact correction
- Smart quote normalization
- Blob preservation during JSON operations
- Fixes common encoding issues from various sources

LAYER 3: BUSINESS LOGIC LAYER
------------------------------
PanelCharacterManager Class:
- Central character management logic
- File import/export handling
- Format detection and conversion
- State management for UI
- Integration with KoboldAI functions

FormatDetector Module:
- Supports formats: v1, v2, Agnai, Ooba, NovelAI, AID
- Unified conversion to v2 standard
- Preserves original data in _originalData field
- Handles embedded world info/lorebooks

KoboldAIIntegration Module:
- Bridge between mod and native KoboldAI
- Avatar synchronization
- World Info management
- Scenario loading via file simulation

LAYER 4: UI STATE MANAGEMENT LAYER
----------------------------------
Core State (KLITE_RPMod):
- Panel configuration and state
- Active tab tracking
- Collapse states
- Generation status
- Avatar management

Panel-Specific States:
- Character Manager: Filter states, selected character
- Memory Panel: Auto-save timers
- Notes Panel: Dual timer system
- WI/TextDB Panels: Synchronization states

State Persistence:
- LocalStorage for UI state
- Automatic save/restore on load
- Debounced updates

LAYER 5: PRESENTATION LAYER
---------------------------
DOM Structure:
- Fixed-position panel system
- Collapsible panels with animation
- Responsive breakpoint at 1400px
- Mobile-specific UI components

Panel System:
- Dynamic content loading
- Standardized panel API
- Event delegation pattern
- MutationObserver synchronization

================================================================================
3. MODULE SPECIFICATIONS
================================================================================

CORE MODULE: klite-rpmod-core.js
---------------------------------
Entry Point: KLITE_RPMod.init()
Dependencies: None
Responsibilities:
- Framework initialization
- Panel management
- Event coordination
- State persistence
- KoboldAI integration

Key Methods:
- init(): Initialize entire system
- buildUI(): Construct DOM structure
- syncWithKobold(): Synchronize with native elements
- connectButtons(): Wire up action buttons
- updateAIAvatar(imageUrl): Update chat avatars
- togglePanel(side): Collapse/expand panels
- handleResize(): Responsive layout management

HELPER MODULE: klite-rpmod-helpers.js
--------------------------------------
Export: window.KLITE_RPMod_Helpers
Dependencies: None
Responsibilities:
- Data access abstraction
- Security utilities
- Text encoding fixes
- UI helper functions

CHARACTER MANAGER MODULES: klite-rpmod-char-panel-part[1-3].js
---------------------------------------------------------------
Export: PanelCharacterManager class, KLITE_RPMod_Panels.CHARS
Dependencies: KLITE_RPMod_Helpers, FormatDetector, KoboldAIIntegration
Responsibilities:
- Character CRUD operations
- Import/export functionality
- Gallery rendering
- Fullscreen character view

File Format Support:
- PNG: tEXt chunk extraction for embedded data
- WEBP: EXIF UserComment extraction
- JSON: Direct format detection

PANEL MODULES: klite-rpmod-[panel]-panel.js
--------------------------------------------
Standard Interface:
```javascript
KLITE_RPMod_Panels.PANELNAME = {
    load(container, panel) {
        // Panel implementation
    }
}
```

Implemented Panels:
- START: Model configuration, file loading
- SAVES: Game state management
- MEMORY: Memory text editor
- NOTES: Dual notes system
- GROUP: Placeholder for future features
- SETUP: Configuration interface
- HELP: Documentation links
- WI: World Info embedding
- TEXTDB: Text database embedding

================================================================================
4. DATA STRUCTURES
================================================================================

CHARACTER V2 FORMAT
-------------------
```javascript
{
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
        // Required fields
        name: string,
        description: string,
        
        // Common fields
        personality: string,
        scenario: string,
        first_mes: string,
        mes_example: string,
        
        // Extended fields
        creator_notes: string,
        system_prompt: string,
        post_history_instructions: string,
        alternate_greetings: string[],
        
        // Metadata
        tags: string[],
        creator: string,
        character_version: string,
        extensions: object,
        
        // Character book (optional)
        character_book: {
            name: string,
            description: string,
            scan_depth: number,
            token_budget: number,
            recursive_scanning: boolean,
            entries: CharacterBookEntry[]
        },
        
        // Internal fields (added by mod)
        _format: string,        // Source format identifier
        _originalData: any,     // Original import data
        _imageData: string,     // Base64 image data
        _imageBlob: Blob        // Image blob object
    }
}
```

WORLD INFO ENTRY FORMAT
-----------------------
```javascript
{
    key: string,                // Primary trigger
    keysecondary: string,       // Secondary triggers
    keyanti: string,            // Negative triggers
    content: string,            // Entry content
    comment: string,            // User notes
    folder: string | null,      // Folder organization
    selective: boolean,         // Selective activation
    constant: boolean,          // Always active
    probability: number,        // Activation probability (0-100)
    wigroup: string,            // Group identifier
    widisabled: boolean         // Disabled state
}
```

PANEL STATE STRUCTURE
---------------------
```javascript
{
    activeTabs: {
        left: string,           // Active left panel tab
        right: string           // Active right panel tab
    },
    panelsCollapsed: {
        left: boolean,          // Left panel collapsed
        right: boolean,         // Right panel collapsed
        top: boolean            // Top panel collapsed
    },
    buttonState: {
        isGenerating: boolean,  // AI currently generating
        abortAnimation: number  // Animation interval ID
    }
}
```

================================================================================
5. INTEGRATION INTERFACES
================================================================================

KOBOLDAI NATIVE FUNCTIONS
-------------------------
Required Functions:
- load_selected_file(file): Load character/save file
- update_wi(): Refresh World Info display
- confirm_memory(): Save memory and author notes
- save_settings(): Persist general settings
- btn_retry(): Regenerate last response
- btn_back(): Undo last action
- btn_redo(): Redo action
- impersonate_message(mode): AI impersonation
- impersonate_user(): User impersonation
- add_img_btn_menu(): Image management
- submit_generation_button(cont): Submit for generation
- abort_generation(): Stop current generation
- toggle_editable(): Toggle story edit mode
- display_settings(): Show settings dialog
- save_file_button(): Download story file
- load_file_button(): Upload story file
- share_story_button(): Share story function

Global Variables:
- localsettings: Configuration object
- current_wi: World Info entries array
- pending_wi_obj: Pending WI changes
- gametext: Story content container
- input_text: User input field
- allowediting: Edit mode state

DOM ELEMENTS
------------
Required Elements:
- #gametext: Story display area
- #input_text: User input field
- #connectstatus: Connection status
- #abortgen: Abort button (for state detection)
- #allowediting: Edit mode checkbox
- #anote_strength: Author note strength
- #anotetext: Author note text
- #memorytext: Memory text
- #wi_tab_container: World Info container
- #documentdb_tab_container: TextDB container
- #loadfileinput: File input element
- #saveslotlocationdropdown: Save location selector
- #saveslotselecteddropdown: Save slot selector

SYNCHRONIZATION POINTS
----------------------
1. Story Content: MutationObserver on #gametext
2. Input Field: Two-way binding with #input_text
3. Generation State: Monitor #abortgen visibility
4. WI Updates: Clone and sync #wi_tab_container
5. TextDB Updates: Clone and sync #documentdb_tab_container
6. Save Slots: Monitor dropdown changes
7. Edit Mode: Track #allowediting state

================================================================================
6. THEMING SYSTEM
================================================================================

CSS ARCHITECTURE
----------------
Naming Convention: .klite-rpmod-[component]
Character Manager: .KLITECharacterManager-[component]
Scope: All styles prefixed to avoid conflicts
Method: Runtime style injection via <style> tags

THEME STRUCTURE
---------------
Base Theme Location: klite-rpmod-char-panel-css.js
Theme Application: Via style injection in injectStyles()

Color Palette:
- Background Primary: #1a1a1a
- Background Secondary: #262626
- Background Tertiary: #333333
- Border Default: #444444
- Border Hover: #555555
- Border Active: #666666
- Text Primary: #e0e0e0
- Text Secondary: #999999
- Text Muted: #666666
- Accent Primary: #4a90e2 (blue)
- Accent Secondary: #4CAAE5 (light blue)
- Accent Hover: #5bb5ee
- Button Primary: rgb(51, 122, 183)
- Button Hover: #286090
- Button Active: #204d74
- Success: #5cb85c
- Warning: #f0ad4e
- Danger: #d9534f

Component Styling:
```css
/* Panel Structure */
.klite-rpmod-panel-[side] {
    background: #262626;
    border: 1px solid #444;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    transition: all 0.3s ease;
}

/* Tab System */
.klite-rpmod-tab {
    background-color: rgb(45, 107, 160);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.klite-rpmod-tab:hover {
    background-color: #286090;
    border-color: #204d74;
}

.klite-rpmod-tab.active {
    background-color: #4CAAE5;
    border-color: #4CAAE5;
}

/* Content Areas */
.klite-rpmod-content {
    background: transparent;
    color: #e0e0e0;
    padding: 20px;
    overflow-y: auto;
}

/* Input Components */
.klite-rpmod-text-input {
    background: #262626;
    border: 1px solid #444;
    color: #e0e0e0;
    transition: all 0.2s ease;
}

.klite-rpmod-text-input:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}
```

CUSTOM THEME IMPLEMENTATION
---------------------------
To create a custom theme:

1. Define color variables:
```javascript
const CUSTOM_THEME = {
    colors: {
        bg_primary: '#0a0a0a',
        bg_secondary: '#1a1a1a',
        bg_tertiary: '#2a2a2a',
        border_default: '#3a3a3a',
        text_primary: '#f0f0f0',
        text_secondary: '#aaaaaa',
        accent_primary: '#ff6b6b',
        accent_secondary: '#ffa8a8',
        button_primary: '#ff6b6b',
        button_hover: '#ff5252'
    },
    fonts: {
        primary: '"Inter", -apple-system, sans-serif',
        mono: '"Fira Code", monospace'
    },
    spacing: {
        panel_width: 380,
        panel_margin: 20
    }
};
```

2. Generate CSS from theme:
```javascript
function generateThemeCSS(theme) {
    return `
        .klite-rpmod-container {
            background: ${theme.colors.bg_primary};
            font-family: ${theme.fonts.primary};
        }
        .klite-rpmod-panel {
            background: ${theme.colors.bg_secondary};
            border-color: ${theme.colors.border_default};
            width: ${theme.spacing.panel_width}px;
        }
        .klite-rpmod-tab {
            background-color: ${theme.colors.button_primary};
        }
        .klite-rpmod-tab:hover {
            background-color: ${theme.colors.button_hover};
        }
        /* ... more styles ... */
    `;
}
```

3. Apply theme:
```javascript
function applyTheme(theme) {
    // Remove existing theme
    const existingTheme = document.getElementById('klite-custom-theme');
    if (existingTheme) existingTheme.remove();
    
    // Inject new theme
    const styleElement = document.createElement('style');
    styleElement.id = 'klite-custom-theme';
    styleElement.textContent = generateThemeCSS(theme);
    document.head.appendChild(styleElement);
}
```

RESPONSIVE DESIGN
-----------------
Breakpoint: 1400px
Behavior Changes:
- Desktop (>1400px):
  - Three-column layout
  - Fixed panel widths (350px)
  - Hover effects enabled
  - Keyboard shortcuts active
  - Collapse handles visible

- Mobile (<1400px):
  - Single column layout
  - Side panels hidden
  - Mobile menu button appears
  - Touch-optimized controls
  - Larger tap targets (min 44px)
  - Simplified animations

CSS Media Queries:
```css
@media (max-width: 1400px) {
    .klite-rpmod-main-content {
        left: 15px;
        right: 15px;
    }
    
    .klite-rpmod-panel-left,
    .klite-rpmod-panel-right {
        display: none;
    }
    
    .klite-rpmod-mobile-toggle {
        display: flex;
    }
}
```

================================================================================
7. API REFERENCE
================================================================================

PUBLIC API (window.KLITE_RPMod)
--------------------------------
Methods:
- getActiveTab(panel): Get active tab name
  - Parameters: panel (string) - 'left' or 'right'
  - Returns: string - Active tab name
  
- switchTab(panel, tab): Switch to specific tab
  - Parameters: panel (string), tab (string)
  - Returns: void
  
- getContentElement(panel): Get panel content container
  - Parameters: panel (string) - 'left' or 'right'
  - Returns: HTMLElement
  
- toggle(): Show/hide entire mod
  - Parameters: none
  - Returns: void

CHARACTER MANAGER API
---------------------
Access: KLITE_RPMod_Panels.CHARS.instance
Methods:
- loadCharacters(): Refresh character list
  - Returns: Promise<void>
  
- updateGallery(): Update character grid display
  - Returns: void
  
- openFullscreen(character): Show character details
  - Parameters: character (object)
  - Returns: void
  
- addCharacter(data): Import new character
  - Parameters: data (object) - Character data
  - Returns: Promise<void>
  
- removeCharacter(character): Delete character
  - Parameters: character (object)
  - Returns: Promise<void>

HELPER API (window.KLITE_RPMod_Helpers)
----------------------------------------
IndexedDB:
- All database operations return Promises
- Automatic initialization on first use
- Error handling via Promise rejection

Security:
- All methods are synchronous
- Return sanitized copies, not mutations
- Preserve formatting where specified

UI:
- showSuccessMessage(message, elementId)
  - Parameters: message (string), elementId (string)
  - Returns: void
  
- handleSectionHeader(event)
  - Parameters: event (Event)
  - Returns: boolean - true if handled

================================================================================
8. IMPLEMENTATION NOTES
================================================================================

PERFORMANCE CONSIDERATIONS
--------------------------
1. Debouncing:
   - Auto-save: 1-1.5 second delay
   - Search: Immediate filter, no debounce
   - Token counting: On input event
   - Panel resize: 16ms throttle

2. Resource Management:
   - Blob URLs revoked after use
   - Event listeners cleaned on unload
   - MutationObservers disconnected properly
   - Character images lazy-loaded

3. Rendering Optimization:
   - Virtual scrolling not implemented
   - Gallery updates are full refreshes
   - Consider pagination for large collections
   - CSS containment for panel content

SECURITY NOTES
--------------
1. XSS Prevention:
   - All user input sanitized
   - HTML content escaped
   - No eval() or innerHTML with user data
   - CSP-compliant implementation

2. Data Validation:
   - File size limit: 50MB
   - Character limits enforced
   - Array bounds checked
   - Type checking on imports

3. Storage Security:
   - IndexedDB origin-isolated
   - No sensitive data in LocalStorage
   - Blob URLs are temporary
   - No cross-origin requests

BROWSER COMPATIBILITY
---------------------
Minimum Requirements:
- ES6 support (const, let, arrow functions)
- IndexedDB API
- Blob API
- MutationObserver API
- CSS Grid and Flexbox
- FileReader API

Tested Browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+

Mobile Browsers:
- Chrome Android 90+
- Safari iOS 14+
- Firefox Android 88+

KNOWN LIMITATIONS
-----------------
1. Character portraits must be embedded in files
2. No server-side storage (browser-only)
3. Limited to browser storage quotas
4. No character sharing mechanism
5. Single-user design
6. No offline support
7. Limited to web platform APIs

EXTENSION POINTS
----------------
For developers extending this mod:

1. Add New Panel:
```javascript
// Define panel module
KLITE_RPMod_Panels.NEWPANEL = {
    load(container, panel) {
        container.innerHTML = `
            <div class="my-panel-content">
                <!-- Panel HTML -->
            </div>
        `;
        // Initialize panel logic
    }
};

// Register in config
KLITE_RPMod.config.panels.left.push('NEWPANEL');
```

2. Add Character Format:
```javascript
// Add detection
const originalDetect = FormatDetector.detectFormat;
FormatDetector.detectFormat = function(data) {
    if (data.myFormat === true) return 'myformat';
    return originalDetect.call(this, data);
};

// Add converter
FormatDetector.convertMyFormatToV2 = function(data) {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: data.charName,
            description: data.charDesc,
            // ... map fields ...
        }
    };
};
```

3. Hook into Events:
```javascript
// Monitor state changes
const originalSwitchTab = KLITE_RPMod.switchTab;
KLITE_RPMod.switchTab = function(panel, tab) {
    console.log(`Switching to ${tab} in ${panel}`);
    // Custom logic here
    return originalSwitchTab.apply(this, arguments);
};

// Monitor character operations
const originalAdd = KLITE_RPMod_Helpers.IndexedDB.saveCharacter;
KLITE_RPMod_Helpers.IndexedDB.saveCharacter = async function(character) {
    console.log('Saving character:', character.name);
    // Custom logic here
    return originalAdd.apply(this, arguments);
};
```

ERROR HANDLING
--------------
1. Database Errors:
   - Automatic retry on init
   - Fallback to memory-only mode
   - User notification on persistent failure

2. Import Errors:
   - Per-file error messages
   - Continue with remaining files
   - Detailed console logging

3. Integration Errors:
   - Graceful degradation
   - Feature detection
   - Fallback UI elements

DEBUGGING
---------
Enable debug mode:
```javascript
KLITE_RPMod.debug = true;
```

Console commands:
```javascript
// View current state
console.log(KLITE_RPMod.state);

// Access character manager
const cm = KLITE_RPMod_Panels.CHARS.instance;
console.log(cm.characters);

// Force refresh
cm.updateGallery();

// Check IndexedDB
KLITE_RPMod_Helpers.IndexedDB.getAllCharacters().then(console.log);

// Test character import
const testChar = {
    name: "Test Character",
    description: "Test description"
};
cm.addCharacter(testChar);

// Monitor panel switches
KLITE_RPMod.debug = true; // Enables console logging
```

DEPLOYMENT
----------
1. Concatenate all source files in order (see make.sh)
2. Minification optional but recommended
3. Single file output: KLITE-RPmod.js
4. Load via browser console or userscript manager
5. Auto-initializes on load

Deployment methods:
- Browser Console: Copy/paste entire script
- Userscript: Wrap in userscript metadata
- Bookmarklet: Minify and encode
- Browser Extension: Package as content script

================================================================================
9. USER INTERFACE SPECIFICATION
================================================================================

UI LAYOUT STRUCTURE
-------------------
```
┌─────────────────────────────────────────────────────────────────────┐
│                         TOP PANEL (60px, Collapsible)               │
│  [☰] KoboldAI | New Session | Scenarios | Save/Load | Settings     │
├──────────────┬────────────────────────────────────┬─────────────────┤
│              │                                    │                 │
│   LEFT       │         MAIN CONTENT               │     RIGHT       │
│   PANEL      │                                    │     PANEL       │
│  (350px)     │    ┌────────────────────────────┐ │    (350px)      │
│              │    │                            │ │                 │
│ ┌──────────┐ │    │     Chat Display Area      │ │ ┌─────────────┐ │
│ │ [START]  │ │    │                            │ │ │  [CHARS]    │ │
│ │ [SAVES]  │ │    │   (Synced with #gametext)  │ │ │  [MEMORY]   │ │
│ │ [GROUP]  │ │    │                            │ │ │  [NOTES]    │ │
│ │ [SETUP]  │ │    │                            │ │ │  [WI]       │ │
│ │ [HELP]   │ │    │                            │ │ │  [TEXTDB]   │ │
│ └──────────┘ │    └────────────────────────────┘ │ └─────────────┘ │
│              │    ┌────────────────────────────┐ │                 │
│  < Handle    │    │  [ME AS AI][AI AS ME][IMG] │ │    Handle >     │
│              │    │  ┌──────────────────────┐  │ │                 │
│              │    │  │   Input Text Area    │  │ │                 │
│              │    │  └──────────────────────┘  │ │                 │
│              │    │  Tokens: 0/0 | Connected   │ │                 │
│              │    │  [↩︎][↪︎][↻] [✏️] [Submit] │ │                 │
│              │    └────────────────────────────┘ │                 │
│              │                                    │                 │
└──────────────┴────────────────────────────────────┴─────────────────┘
                                [☰] Mobile Menu Button (Hidden >1400px)
```

VISUAL HIERARCHY
----------------
1. Primary Focus: Chat display and input area
2. Secondary: Active panel content
3. Tertiary: Navigation tabs
4. Background: Collapsed panels and handles

Z-INDEX LAYERS
--------------
- Base (0): Main container
- Panels (1): Left/right panels
- Top Panel (2): Navigation bar
- Modals (3): Character fullscreen, tag modal
- Popups (4): KoboldAI native popups
- Notifications (5): Success messages

COMPONENT SPECIFICATIONS
------------------------

Panels:
- Width: 350px (configurable)
- Background: #262626
- Border: 1px solid #444
- Shadow: 0 0 10px rgba(0,0,0,0.5)
- Transition: all 0.3s ease
- Collapse Animation: translateX for sides, translateY for top

Tabs:
- Height: 32px
- Width: 62px
- Padding: 6px 8px
- Font Size: 10px
- Active State: #4CAAE5 background
- Hover State: #286090 background

Chat Display:
- Background: #1a1a1a
- Text Color: #e0e0e0
- Font Size: 14px
- Line Height: 1.6
- Message Blocks: #262626 background, 8px border-radius
- Avatar Size: 30x30px, circular

Input Area:
- Height: 80px min, 200px max
- Background: #262626
- Border: 1px solid #444
- Focus Border: #4a90e2
- Resize: Vertical only

Buttons:
- Primary: #337ab7 background
- Hover: #286090 background
- Active: #4CAAE5 background
- Height: 26px (action buttons)
- Font Size: 14px
- Border Radius: 4px

INTERACTION STATES
------------------

Button States:
```
Default:
  background: #337ab7
  border: 1px solid #2e6da4
  cursor: pointer

Hover:
  background: #286090
  border-color: #204d74
  transform: translateY(-1px)

Active/Pressed:
  background: #4CAAE5
  border-color: #4CAAE5
  transform: translateY(0)

Disabled:
  opacity: 0.5
  cursor: not-allowed

Generating (Submit button):
  animation: pulse 0.6s infinite
  content changes to "Abort"
```

Input States:
```
Default:
  background: #262626
  border: 1px solid #444

Focus:
  border-color: #4a90e2
  box-shadow: 0 0 0 3px rgba(74,144,226,0.1)

Typing:
  real-time token counter updates
  debounced auto-save indicator

Error:
  border-color: #d9534f
  background: rgba(217,83,79,0.1)
```

Panel States:
```
Expanded:
  transform: translateX(0)
  content visible
  handle shows collapse arrow

Collapsed:
  transform: translateX(-350px) or translateX(350px)
  only handle visible
  handle shows expand arrow

Transitioning:
  0.3s ease animation
  pointer-events disabled
```

ANIMATION SPECIFICATIONS
------------------------

Panel Collapse/Expand:
- Duration: 300ms
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1)
- Properties: transform, opacity

Tab Switch:
- Duration: 200ms
- Easing: ease-out
- Fade out old content, fade in new

Button Interactions:
- Duration: 200ms
- Hover: translateY(-1px), shadow increase
- Active: translateY(0), shadow decrease

Success Messages:
- Fade In: 300ms ease
- Display: 3000ms
- Fade Out: 300ms ease

Generation Pulse:
- Duration: 600ms
- Animation: scale(0.94) to scale(1.0)
- Opacity: 0.8 to 1.0

RESPONSIVE BEHAVIOR
-------------------

Desktop Mode (>1400px):
- Full three-column layout
- All panels visible
- Hover effects enabled
- Keyboard navigation active
- Drag-drop enabled everywhere

Tablet Mode (768px - 1400px):
- Side panels hidden by default
- Mobile menu button visible
- Touch-optimized tap targets
- Swipe gestures for panel access
- Larger font sizes

Mobile Mode (<768px):
- Single column layout
- Bottom navigation bar
- Full-screen panels
- Simplified animations
- Virtual keyboard awareness

TOUCH INTERACTIONS
------------------

Tap Targets:
- Minimum size: 44x44px
- Padding: 8px minimum
- Visual feedback on touch

Swipe Gestures:
- Left swipe: Open right panel
- Right swipe: Open left panel
- Down swipe: Close panel
- Velocity threshold: 0.3

Long Press:
- On character card: Quick actions menu
- On message: Edit mode
- On button: Show tooltip

================================================================================
10. ACCESSIBILITY & USABILITY
================================================================================

KEYBOARD NAVIGATION
-------------------

Global Shortcuts:
- Alt+R: Toggle RP Mod visibility
- Escape: Close any open modal/panel
- Tab: Navigate through interactive elements
- Shift+Tab: Navigate backwards

Panel Navigation:
- Ctrl+Left: Focus left panel
- Ctrl+Right: Focus right panel
- Ctrl+Up: Focus top panel
- Arrow keys: Navigate within panel

Character Manager:
- Enter: Open selected character
- Delete: Remove selected character
- Ctrl+F: Focus search field
- Space: Toggle character selection

Text Editing:
- Ctrl+Enter: Save and close
- Ctrl+S: Quick save
- Ctrl+Z: Undo
- Ctrl+Y: Redo

ARIA IMPLEMENTATION
-------------------

Landmarks:
```html
<div role="navigation" aria-label="Main panels">
<div role="main" aria-label="Story content">
<div role="complementary" aria-label="Character management">
```

Interactive Elements:
```html
<button aria-label="Submit message" aria-pressed="false">
<div role="tab" aria-selected="true" aria-controls="panel-content">
<textarea aria-label="Story input" aria-describedby="token-count">
```

Live Regions:
```html
<div aria-live="polite" aria-atomic="true">Saved!</div>
<div aria-live="assertive">Connection lost</div>
<span role="status">Loading characters...</span>
```

SCREEN READER SUPPORT
---------------------

Navigation Announcements:
- "Left panel, START tab selected"
- "Entering character gallery, 15 characters"
- "Character card, Aria Delacroix, 5 stars"

Status Updates:
- "Auto-saving memory"
- "Character imported successfully"
- "3 of 10 characters match filter"

Form Controls:
- Labels for all inputs
- Error messages linked to fields
- Required fields marked

VISUAL ACCESSIBILITY
--------------------

Color Contrast:
- Text on background: 7:1 minimum
- Interactive elements: 4.5:1 minimum
- Focus indicators: 3:1 minimum

Focus Indicators:
- 2px solid outline
- 3px offset
- High contrast color (#4a90e2)
- Visible on all themes

Text Sizing:
- Base font: 14px
- Minimum: 12px
- User scalable to 200%
- Responsive units (rem/em)

Motion Sensitivity:
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

ERROR HANDLING
--------------

User-Friendly Messages:
- "Cannot load character: File too large (max 50MB)"
- "Connection lost. Your work is saved locally."
- "Import failed: Unknown file format"

Recovery Options:
- Retry buttons for failed operations
- Fallback to manual save
- Export data before clearing

Validation Feedback:
- Inline error messages
- Field highlighting
- Success confirmations
- Progress indicators

USABILITY FEATURES
------------------

Auto-Save:
- 1 second delay after typing stops
- Visual indicator during save
- Confirmation when complete
- Conflict resolution

Smart Defaults:
- Remember last active tabs
- Preserve collapse states
- Maintain search filters
- Keep scroll positions

Bulk Operations:
- Select multiple characters
- Batch delete with confirmation
- Export all as ZIP
- Import folder of files

Undo/Redo:
- Last 10 operations
- Clear undo history option
- Visual feedback
- Keyboard shortcuts

================================================================================
11. USER WORKFLOWS
================================================================================

GETTING STARTED WORKFLOW
------------------------
1. First Launch:
   - RP Mod auto-initializes
   - Panels appear with 3-second delay
   - Auto-collapse to show main content
   - START tab active by default

2. Initial Setup:
   - Drag KoboldAI model to START panel
   - Configure AI settings via sliders
   - Set roleplay rules (optional)
   - Load a character or start blank

CHARACTER IMPORT WORKFLOW
-------------------------
1. Navigate to CHARS tab
2. Drag & drop character files:
   - PNG with embedded data
   - WEBP with EXIF data
   - JSON character cards
3. System detects format automatically
4. Character appears in gallery
5. Click to view details
6. Load as scenario or add to World Info

STORY CREATION WORKFLOW
-----------------------
1. Setup Phase:
   - Load character (optional)
   - Configure memory (MEMORY tab)
   - Set author's note (NOTES tab)
   - Configure AI settings (START tab)

2. Writing Phase:
   - Type in input area
   - Submit for AI response
   - Use ME AS AI for character voice
   - Use AI AS ME for player voice
   - Edit previous messages inline

3. Management Phase:
   - Save to slot (SAVES tab)
   - Export as file
   - Manage World Info entries
   - Update character ratings

CHARACTER MANAGEMENT WORKFLOW
-----------------------------
1. Organization:
   - Add tags to characters
   - Rate characters (1-5 stars)
   - Search by name/creator/tag
   - Filter by rating

2. Bulk Operations:
   - Select multiple via Ctrl+Click
   - Delete selected
   - Export selected
   - Change tags in bulk

3. Character Editing:
   - Open fullscreen view
   - Edit fields directly
   - Update portrait
   - Save changes

WORLD INFO WORKFLOW
-------------------
1. Access WI tab
2. Create entry groups:
   - Character knowledge
   - Location details
   - Plot elements
   - Game mechanics

3. Configure triggers:
   - Primary keywords
   - Secondary keywords
   - Anti-keywords
   - Probability settings

4. Organize entries:
   - Group by category
   - Set priorities
   - Enable/disable
   - Test activation

COLLABORATION WORKFLOW
----------------------
1. Export Session:
   - SAVES > Download File
   - Includes all settings
   - Preserves character data
   - Maintains WI entries

2. Share Character:
   - CHARS > Select character
   - Export as PNG/JSON
   - Includes portrait
   - Preserves all fields

3. Import Session:
   - START > Drag save file
   - Or SAVES > Open File
   - Restores full state
   - Continues story

MOBILE WORKFLOW
---------------
1. Access panels via menu (☰)
2. Select panel from dropdown
3. Perform operations
4. Close to return to story
5. Swipe gestures for quick access

POWER USER WORKFLOW
--------------------
1. Keyboard Navigation:
   - Alt+R to toggle mod
   - Tab through elements
   - Ctrl+S to quick save
   - Escape to close panels

2. Advanced Features:
   - Custom CSS themes
   - JavaScript console commands
   - Direct API access
   - Batch operations

3. Optimization:
   - Pre-load characters
   - Organize with tags
   - Template management
   - Hotkey customization

================================================================================
12. TROUBLESHOOTING GUIDE
================================================================================

COMMON ISSUES
-------------

Issue: Mod doesn't load
Solution:
1. Check browser console for errors
2. Ensure KoboldAI Lite is fully loaded
3. Try refreshing the page
4. Re-paste the script

Issue: Characters won't import
Solution:
1. Check file size (<50MB)
2. Verify file format (PNG/WEBP/JSON)
3. Check browser console for errors
4. Try different browser

Issue: Panels won't collapse/expand
Solution:
1. Click the collapse handle, not the panel
2. Check for JavaScript errors
3. Try manual toggle: KLITE_RPMod.togglePanel('left')
4. Refresh the page

Issue: Auto-save not working
Solution:
1. Check browser storage quota
2. Enable cookies/storage for site
3. Check localStorage availability
4. Manual save still available

Issue: Characters disappeared
Solution:
1. Check IndexedDB in browser tools
2. Different browser profile?
3. Incognito mode doesn't persist
4. Check storage quota

BROWSER-SPECIFIC ISSUES
-----------------------

Chrome/Edge:
- Storage quota: ~60% of free disk
- Extensions may interfere
- Check site settings for storage

Firefox:
- Enhanced tracking protection may block
- Check permissions for IndexedDB
- Storage quota more restrictive

Safari:
- Limited IndexedDB support
- May require user interaction
- Check Develop menu settings

Mobile Browsers:
- Limited storage space
- Background tabs may suspend
- Touch events vs mouse events

ERROR MESSAGES
--------------

"IndexedDB not available":
- Browser doesn't support it
- Private/incognito mode
- Storage disabled in settings

"Failed to parse character":
- Corrupted file
- Wrong format
- Encoding issues

"Storage quota exceeded":
- Too many characters
- Large portrait images
- Clear browser data

"WebSocket connection failed":
- KoboldAI backend issue
- Not a mod problem
- Check KoboldAI logs

RECOVERY PROCEDURES
-------------------

Export All Data:
```javascript
// In browser console
const backup = await KLITE_RPMod_Helpers.IndexedDB.getAllCharacters();
const json = JSON.stringify(backup, null, 2);
const blob = new Blob([json], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'klite-backup.json';
a.click();
```

Reset Mod:
```javascript
// Clear all data and reload
localStorage.removeItem('KLITE_RPMod_State');
await KLITE_RPMod_Helpers.IndexedDB.clearAllCharacters();
location.reload();
```

Manual Panel Control:
```javascript
// Force panel states
KLITE_RPMod.togglePanel('left');
KLITE_RPMod.togglePanel('right');
KLITE_RPMod.togglePanel('top');
```

Debug Mode:
```javascript
// Enable verbose logging
KLITE_RPMod.debug = true;
// Check state
console.log(KLITE_RPMod.state);
// List characters
KLITE_RPMod_Panels.CHARS.instance.characters.forEach(c => 
    console.log(c.name, c.tags, c.rating)
);
```

PERFORMANCE OPTIMIZATION
------------------------

Reduce Character Count:
- Archive unused characters
- Export and remove
- Use tags for organization

Optimize Images:
- Resize portraits to 512x512
- Use JPEG for photos
- PNG for artwork
- Compress before import

Browser Maintenance:
- Clear cache periodically
- Update browser
- Disable unnecessary extensions
- Use dedicated profile

Storage Management:
- Monitor quota usage
- Export old sessions
- Clear completed stories
- Compress save files

GETTING HELP
------------

Resources:
1. Check browser console for errors
2. Read the error message carefully
3. Search the issue in documentation
4. Check GitHub issues
5. Ask in KoboldAI Discord

When Reporting Issues:
- Browser name and version
- KoboldAI Lite version
- Error messages from console
- Steps to reproduce
- Screenshots if relevant

Debug Information:
```javascript
console.log({
    modVersion: KLITE_RPMod.version,
    browser: navigator.userAgent,
    storage: navigator.storage.estimate(),
    characters: KLITE_RPMod_Panels.CHARS.instance?.characters.length,
    state: KLITE_RPMod.state
});
```

================================================================================
END OF DOCUMENTATION
================================================================================

