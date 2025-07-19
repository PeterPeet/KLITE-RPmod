# KLITE RPmod - Complete Development Guide

## Project Overview

**Vision**: Advanced enhancement framework for KoboldAI Lite (AI text generation frontend)  
**Current Status**: ALPHA implementation - mature, feature-complete monolithic approach  
**Active File**: `KLITE-RPmod_ALPHA.js` (18,027 lines)  
**Philosophy**: Enhance rather than replace KoboldAI Lite's native functionality

## ALPHA Architecture Deep Dive

### Core Object Structure
```javascript
window.KLITE_RPMod = {
    version: '40',
    state: {
        tabs: { left: 'PLAY', right: 'MEMORY' },
        collapsed: { left: false, right: false, top: false },
        generating: false,
        adventureMode: 0,
        fullscreen: false,
        tabletSidepanel: false,
        mobile: { enabled: false, currentIndex: 5, sequence: [...] }
    },
    
    // Core data storage
    characters: [],           // Character card storage
    worldInfo: [],           // WorldInfo entries
    
    // System components
    panels: {},              // Panel instances
    generationControl: {},   // Parameter management
    
    // Avatar system
    aiAvatarCurrent: null,
    userAvatarCurrent: null,
    groupAvatars: new Map()
}
```

### Panel Lifecycle Architecture
Every panel follows a consistent lifecycle pattern:

```javascript
KLITE_RPMod.panels.PANEL_NAME = {
    // Core lifecycle methods
    render() {
        // Returns HTML string for panel content
        // Uses template literals with helper functions
        return `<div class="panel-content">...</div>`;
    },
    
    async init() {
        // Called after render(), sets up event handlers
        // Loads data from storage if needed
        await this.loadData();
        this.setupEventHandlers();
    },
    
    cleanup() {
        // Resource cleanup before panel reload
        // Clear timers, remove event listeners
        if (this.saveTimer) clearTimeout(this.saveTimer);
    },
    
    // Optional methods
    refresh() {
        // Trigger panel reload
        KLITE_RPMod.loadPanel('side', 'PANEL_NAME');
    }
}
```

### Panel Loading System
```javascript
loadPanel(side, name) {
    // Mode-aware panel selection for PLAY
    if (name === 'PLAY') {
        const mode = this.getMode();
        const modeMap = {
            'story': 'PLAY_STORY',
            'adventure': 'PLAY_ADV', 
            'chat': 'PLAY_CHAT',
            'instruct': 'PLAY_RP'
        };
        name = modeMap[mode] || 'PLAY_RP';
    }
    
    const panel = KLITE_RPMod.panels[name];
    const container = document.getElementById(`content-${side}`);
    
    // Render and initialize
    container.innerHTML = panel.render();
    if (panel.cleanup) panel.cleanup();
    if (panel.init) setTimeout(async () => await panel.init(), 10);
}
```

## Comprehensive Panel-to-Function Mapping

### 1. Generation Control System
**Panel**: Embedded in PLAY panels  
**KoboldAI Lite Integration**:
```javascript
// Direct parameter mapping
window.localsettings.temperature    ↔ generationControl.currentSettings.temperature
window.localsettings.top_p         ↔ generationControl.currentSettings.top_p
window.localsettings.top_k         ↔ generationControl.currentSettings.top_k
window.localsettings.min_p         ↔ generationControl.currentSettings.min_p
window.localsettings.rep_pen       ↔ generationControl.currentSettings.rep_pen
window.localsettings.rep_pen_range ↔ generationControl.currentSettings.rep_pen_range
window.localsettings.max_length    ↔ generationControl.currentSettings.max_length

// Preset system
generationControl.presets = {
    precise: { temperature: 0.2, top_p: 0.9, top_k: 20, ... },
    koboldai: { temperature: 0.7, top_p: 0.9, top_k: 0, ... },
    creative: { temperature: 1.2, top_p: 0.85, top_k: 50, ... },
    chaotic: { temperature: 1.8, top_p: 0.8, top_k: 80, ... }
}

// Auto-sync to all panels
saveToLite(settings) {
    Object.assign(window.localsettings, settings);
    window.save_settings?.();
    this.syncAllPanels();
}
```

### 2. Memory Management Panel
**Panel**: `KLITE_RPMod.panels.MEMORY`  
**KoboldAI Lite Integration**:
```javascript
// Direct memory integration
window.current_memory     ↔ Memory panel textarea
document.getElementById('memorytext') ↔ Auto-sync with Lite UI

// Real-time synchronization
textarea.addEventListener('input', () => {
    window.current_memory = textarea.value;
    const liteMemory = document.getElementById('memorytext');
    if (liteMemory) liteMemory.value = value;
    
    // Token counting
    const tokenCount = Math.ceil(value.length / 4);
    document.getElementById('memory-tokens').textContent = tokenCount + ' tokens';
});
```

### 3. WorldInfo Management Panel
**Panel**: `KLITE_RPMod.panels.MEMORY` (WI mode)  
**KoboldAI Lite Integration**:
```javascript
// Native WI system integration
window.current_wi        ↔ Live WI storage
window.pending_wi_obj    ↔ Editing buffer (Lite's native editing pattern)
window.curr_wi_tab       ↔ Group tab state

// ALPHA follows Lite's exact editing workflow:
startEditing() {
    // Copy current_wi to pendingWI for editing
    this.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
}

saveCurrentEdits() {
    // Save DOM values to pendingWI (working buffer)
    // This preserves Lite's native editing patterns
}

commitChanges() {
    // Commit pendingWI back to current_wi
    window.current_wi = this.pendingWI;
    if (window.save_wi) window.save_wi();
}
```

### 4. Character Management Panel
**Panel**: `KLITE_RPMod.panels.CHARS`  
**Integration**: Custom storage + scenario loading
```javascript
// Character storage
characters: [],  // Custom array storage
saveCharacters() {
    // Uses Lite's IndexedDB via window.indexeddb_save
    await window.indexeddb_save('rpmod_characters', this.characters);
}

// Scenario integration
loadCharacterAsScenario(character) {
    // Populates Lite's native scenario fields
    if (character.description) {
        document.getElementById('scenariotext').value = character.description;
        window.current_scenario = character.description;
    }
    if (character.system_prompt) {
        document.getElementById('sprompttext').value = character.system_prompt;
        window.current_sprompt = character.system_prompt;
    }
}
```

### 5. TextDatabase Panel
**Panel**: `KLITE_RPMod.panels.TEXTDB`  
**KoboldAI Lite Integration**:
```javascript
// Direct integration with Lite's TextDB variables
window.documentdb_enabled      ↔ Enable/disable toggle
window.documentdb_searchhistory ↔ Search history option
window.documentdb_numresults   ↔ Number of results slider (1-10)
window.documentdb_searchrange  ↔ Search range slider (100-1000)
window.documentdb_chunksize    ↔ Chunk size slider (100-1000)
window.documentdb_data         ↔ Main text content textarea

// Real-time text editing with auto-save debouncing
setupTextareaSync() {
    const textarea = document.getElementById('textdb-content');
    let saveTimeout;
    
    textarea.addEventListener('input', () => {
        window.documentdb_data = textarea.value;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            window.save_settings?.();
        }, 1000);
    });
}
```

### 6. Group Chat Panel
**Panel**: `KLITE_RPMod.panels.GROUP`  
**Integration**: Chat interception + character rotation
```javascript
// Character management
activeCharacters: [],
currentCharacterIndex: 0,
talkativeness: new Map(), // character_id -> percentage

// Chat integration
setupInputMonitoring() {
    const inputElement = document.getElementById('input_text');
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            this.handleGroupMessage(inputElement.value);
        }
    });
}

rotateToNextCharacter() {
    // Cycles through active characters based on talkativeness
    // Integrates with character loading system
}
```

## Initialization and Lifecycle

### Startup Sequence
```javascript
async init() {
    // 1. Inject CSS styles
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    
    // 2. Load persistent state
    await this.loadState();
    await this.initializeStorageKeys();
    await this.loadCharacters();
    
    // 3. Build UI structure
    this.buildUI();
    this.initializeMobileMode();
    
    // 4. Setup systems
    this.setupHooks();
    this.generationControl.init();
    this.initializeHotkeys();
    
    // 5. Load initial panels
    this.loadPanel('left', this.state.tabs.left);
    this.loadPanel('right', this.state.tabs.right);
    
    // 6. Activate interface
    document.body.classList.add('klite-active');
}
```

### UI Structure
```javascript
buildUI() {
    const container = document.createElement('div');
    container.className = 'klite-container';
    container.innerHTML = `
        <!-- Left Panel -->
        <div class="klite-panel klite-panel-left" id="panel-left">
            <div class="klite-tabs" data-panel="left">...</div>
            <div class="klite-content" id="content-left"></div>
            <div class="klite-handle">‹</div>
        </div>
        
        <!-- Main Content Area -->
        <div class="klite-maincontent" id="maincontent">
            <div class="klite-chat" id="chat-display"></div>
            <div class="klite-input-area">...</div>
        </div>
        
        <!-- Right Panel -->
        <div class="klite-panel klite-panel-right" id="panel-right">
            <div class="klite-tabs" data-panel="right">...</div>
            <div class="klite-content" id="content-right"></div>
            <div class="klite-handle">›</div>
        </div>
        
        <!-- Top Panel (optional) -->
        <div class="klite-panel klite-panel-top" id="panel-top">...</div>
    `;
    document.body.appendChild(container);
}
```

## Character Image Handling System

### Current Implementation Status
**Status**: ⚠️ **Needs Refinement** - Current implementation works but could be more robust

### Supported Formats and Extraction Methods

#### 1. PNG tEXt Chunk Extraction (Tavern Card V1/V2)
```javascript
extractPNGtEXt(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    let offset = 8; // Skip PNG signature
    
    while (offset < uint8Array.length) {
        const length = new DataView(arrayBuffer, offset).getUint32(0);
        const type = String.fromCharCode(...uint8Array.slice(offset + 4, offset + 8));
        
        if (type === 'tEXt') {
            const textData = uint8Array.slice(offset + 8, offset + 8 + length);
            const nullIndex = textData.indexOf(0);
            const keyword = String.fromCharCode(...textData.slice(0, nullIndex));
            
            if (keyword === 'chara') {
                const base64Data = String.fromCharCode(...textData.slice(nullIndex + 1));
                return JSON.parse(atob(base64Data)); // V1/V2 format
            } else if (keyword === 'ccv3') {
                const base64Data = String.fromCharCode(...textData.slice(nullIndex + 1));
                return JSON.parse(atob(base64Data)); // V3 format
            }
        }
        offset += 12 + length; // Move to next chunk
    }
    return null;
}
```

#### 2. WEBP EXIF Data Extraction
```javascript
extractWebPEXIF(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Look for EXIF chunk in WEBP
    let offset = 12; // Skip WEBP header
    while (offset < uint8Array.length) {
        const chunkType = String.fromCharCode(...uint8Array.slice(offset, offset + 4));
        const chunkSize = new DataView(arrayBuffer, offset + 4).getUint32(0, true);
        
        if (chunkType === 'EXIF') {
            // Extract character data from EXIF
            const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
            return this.parseEXIFCharacterData(exifData);
        }
        offset += 8 + chunkSize + (chunkSize % 2); // Align to even boundary
    }
    return null;
}
```

#### 3. Character Card V3 Asset Handling
```javascript
handleCCv3Assets(character) {
    if (character.data.assets) {
        character.data.assets.forEach(asset => {
            if (asset.type === 'icon' && asset.name === 'main') {
                // Handle main character icon
                this.setCharacterAvatar(character.id, asset.uri);
            } else if (asset.type === 'background') {
                // Handle background assets
                this.setCharacterBackground(character.id, asset.uri);
            } else if (asset.type === 'emotion') {
                // Handle emotion/expression assets
                this.addCharacterEmotion(character.id, asset.name, asset.uri);
            }
        });
    }
}
```

### Refinement Needs
1. **Error Handling**: More robust error handling for corrupted image files
2. **Format Support**: Enhanced WEBP EXIF parsing reliability  
3. **Asset Caching**: Better caching system for extracted assets
4. **Performance**: Optimize for large character collections
5. **V3 Assets**: Full implementation of embedded asset system

## Edit Mode System

### Current Implementation Status
**Status**: ⚠️ **Needs Refinement** - Functional but UX could be enhanced

### WorldInfo Edit Mode (Current)
```javascript
startEditing() {
    // Copy current WI to editing buffer (mirrors Lite's approach)
    this.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
    this.isEditing = true;
    
    // Enable UI controls
    this.updateEditControls();
}

// Direct inline editing - no modals for basic operations
renderWIEntry(entry, index) {
    return `
        <div class="wi-entry" data-index="${index}">
            <input type="text" class="wi-keys" value="${entry.keys.join(', ')}" 
                   onchange="KLITE_RPMod.panels.MEMORY.updateEntryKeys(${index}, this.value)">
            <textarea class="wi-content" 
                      onchange="KLITE_RPMod.panels.MEMORY.updateEntryContent(${index}, this.value)"
                      >${entry.content}</textarea>
            <div class="wi-controls">
                <button onclick="KLITE_RPMod.panels.MEMORY.deleteEntry(${index})">Delete</button>
                <button onclick="KLITE_RPMod.panels.MEMORY.moveEntryUp(${index})">↑</button>
                <button onclick="KLITE_RPMod.panels.MEMORY.moveEntryDown(${index})">↓</button>
            </div>
        </div>
    `;
}
```

### TextDatabase Edit Mode (Current)
```javascript
// Real-time textarea editing with auto-save debouncing
setupTextareaEditing() {
    const textarea = document.getElementById('textdb-content');
    let saveTimeout;
    
    textarea.addEventListener('input', (e) => {
        // Update live data
        window.documentdb_data = e.target.value;
        
        // Debounced save
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            this.saveToStorage();
            this.updateStatus('✓ Saved');
        }, 1000);
        
        // Real-time character count
        this.updateCharacterCount(e.target.value.length);
    });
}
```

### Refinement Needs
1. **Rich Text Support**: Enhanced editing with syntax highlighting
2. **Undo/Redo**: Built-in undo/redo functionality  
3. **Auto-completion**: Smart suggestions for keys and content
4. **Validation**: Real-time validation and error highlighting
5. **Bulk Operations**: Multi-select for bulk edit operations
6. **Import/Export**: Better import/export workflow UX

## Group Chat System

### Current Implementation Status
**Status**: ⚠️ **Needs Significant Refinement** - Basic functionality exists but needs iteration

### Character Management
```javascript
KLITE_RPMod.panels.GROUP = {
    enabled: false,
    activeCharacters: [],
    currentCharacterIndex: 0,
    talkativeness: new Map(), // character_id -> percentage (0-100)
    
    addCharacter(characterId) {
        if (!this.activeCharacters.includes(characterId)) {
            this.activeCharacters.push(characterId);
            this.talkativeness.set(characterId, 50); // Default 50%
            this.refreshCharacterList();
        }
    },
    
    removeCharacter(characterId) {
        const index = this.activeCharacters.indexOf(characterId);
        if (index > -1) {
            this.activeCharacters.splice(index, 1);
            this.talkativeness.delete(characterId);
            this.refreshCharacterList();
        }
    }
}
```

### Conversation Flow
```javascript
handleGroupMessage(userMessage) {
    if (!this.enabled || this.activeCharacters.length === 0) return;
    
    // Determine next character to respond
    const nextCharacter = this.selectNextCharacter();
    
    // Load character context
    this.loadCharacterContext(nextCharacter);
    
    // Trigger AI response with character context
    this.triggerCharacterResponse(nextCharacter, userMessage);
}

selectNextCharacter() {
    // Weighted selection based on talkativeness settings
    const weights = this.activeCharacters.map(id => 
        this.talkativeness.get(id) || 50
    );
    
    return this.weightedRandomSelection(this.activeCharacters, weights);
}
```

### Integration with Character Loading
```javascript
loadCharacterContext(characterId) {
    const character = KLITE_RPMod.characters.find(c => c.id === characterId);
    if (!character) return;
    
    // Temporarily set character data for AI response
    this.tempScenario = window.current_scenario;
    this.tempSprompt = window.current_sprompt;
    
    // Load character context
    window.current_scenario = character.description || '';
    window.current_sprompt = character.system_prompt || '';
    
    // Update UI to show active character
    this.displayActiveCharacter(character);
}

restoreContext() {
    // Restore original context after response
    window.current_scenario = this.tempScenario;
    window.current_sprompt = this.tempSprompt;
}
```

### Refinement Needs
1. **Character Personality Persistence**: Better character consistency across conversations
2. **Context Memory**: Character-specific memory management
3. **Conflict Resolution**: Handle character interaction conflicts
4. **Turn Management**: More sophisticated turn-taking algorithms
5. **Group Dynamics**: Character relationship modeling
6. **Performance**: Optimize for larger groups (5+ characters)

## Tavern Card Format Specifications

### Character Card V1 (Legacy Format)
```typescript
type TavernCardV1 = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
}
```

**Embedding**: PNG tEXt chunk named "chara" with base64-encoded JSON  
**Usage**: Legacy support only, migrate to V2/V3 when possible

### Character Card V2 (Current Standard)
```typescript
type TavernCardV2 = {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: {
    // V1 fields
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    
    // V2 additions
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: Array<string>
    character_book?: CharacterBook
    tags: Array<string>
    creator: string
    character_version: string
    extensions: Record<string, any>
  }
}

type CharacterBook = {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions: Record<string, any>
  entries: Array<{
    keys: Array<string>
    content: string
    extensions: Record<string, any>
    enabled: boolean
    insertion_order: number
    case_sensitive?: boolean
    constant?: boolean
    name?: string
    priority?: number
    id?: number|string
    comment?: string
    selective?: boolean
    secondary_keys?: Array<string>
    position?: 'before_char' | 'after_char'
  }>
}
```

### Character Card V3 (Modern Format)
```typescript
interface CharacterCardV3 {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: {
    // All V2 fields plus:
    
    // Enhanced asset system
    assets?: Array<{
      type: string        // 'icon', 'background', 'user_icon', 'emotion'
      uri: string         // URL, base64, 'embeded://path', 'ccdefault:'
      name: string        // 'main' for primary assets
      ext: string         // File extension
    }>
    
    // Extended metadata
    nickname?: string                           // Alternative name for {{char}}
    creator_notes_multilingual?: Record<string, string>  // Multi-language notes
    source?: string[]                          // Source URLs/IDs
    group_only_greetings: Array<string>        // Group chat specific greetings
    creation_date?: number                     // Unix timestamp
    modification_date?: number                 // Unix timestamp
    
    // Enhanced lorebook with decorators
    character_book?: LorebookV3
  }
}
```

### Lorebook V3 Decorators
Advanced lorebook entries support decorator syntax for precise control:

```
@@depth 5
@@role assistant
@@activate_only_after 3
@@position after_desc

Your lorebook content here.
```

**Key Decorators**:
- `@@depth N` - Insert at specific message depth
- `@@activate_only_after N` - Only activate after N messages
- `@@activate_only_every N` - Activate every N messages  
- `@@role user|assistant|system` - Set message role
- `@@position after_desc|before_desc|personality|scenario` - Positioning
- `@@use_regex` - Enable regex matching in keys
- `@@constant` - Always active regardless of keys

### Curly Braced Syntax (CBS/Macros)
V3 introduces standardized macro system:

- `{{char}}` - Character name (or nickname)
- `{{user}}` - User name
- `{{random:A,B,C}}` - Random selection
- `{{pick:A,B,C}}` - Consistent random selection
- `{{roll:6}}` or `{{roll:d6}}` - Dice roll (1-6)
- `{{// comment}}` - Hidden comments
- `{{comment: text}}` - Visible inline comments

## Storage and Persistence

### KoboldAI Lite Integration
```javascript
// Uses Lite's native IndexedDB system
async saveData(key, data) {
    if (typeof window.indexeddb_save === 'function') {
        await window.indexeddb_save(key, data);
    } else {
        console.warn('IndexedDB not available');
    }
}

async loadData(key) {
    if (typeof window.indexeddb_load === 'function') {
        return await window.indexeddb_load(key);
    }
    return null;
}
```

### Storage Keys
- `rpmod_state` - UI state (panels, collapsed states, etc.)
- `rpmod_characters` - Character collection
- `rpmod_personal_notes` - Personal notes and templates
- `klite_visual_style` - Visual customization settings

## Mobile and Responsive Design

### Breakpoint System
```css
/* Desktop: Full panel layout */
@media (min-width: 1400px) {
    .klite-maincontent { left: 350px; right: 350px; }
}

/* Tablet: Selective panel display */
@media (min-width: 768px) and (max-width: 1400px) {
    .klite-maincontent { left: 0; right: 0; }
    /* Panels toggleable via tablet-sidepanel mode */
}

/* Mobile: Hidden panels, swipe navigation */
@media (max-width: 768px) {
    .klite-panel-left, .klite-panel-right { display: none; }
    .klite-maincontent { left: 0 !important; right: 0 !important; }
}
```

### Mobile Navigation
```javascript
mobile: {
    enabled: false,
    currentIndex: 5, // Start at Main view
    sequence: ['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP', 'MAIN', 'CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
}

// Swipe navigation between panels
navigateToIndex(index) {
    this.state.mobile.currentIndex = index;
    const panelName = this.state.mobile.sequence[index];
    this.loadMobilePanel(panelName);
}
```

## Development Best Practices

### 1. Preserve Lite Integration
- Always use Lite's native functions (`window.submit_generation`, `window.save_settings`, etc.)
- Maintain compatibility with Lite's state management
- Test with real Lite installations, not just development environments

### 2. Panel Development Pattern
```javascript
// Follow established pattern
KLITE_RPMod.panels.NEW_PANEL = {
    render() {
        // Use template helpers for consistent UI
        return t.section('Section Title', content);
    },
    
    async init() {
        // Setup after DOM creation
        await this.loadData();
        this.setupEventHandlers();
    },
    
    cleanup() {
        // Prevent memory leaks
        this.clearTimers();
        this.removeEventListeners();
    }
}
```

### 3. Error Handling
```javascript
try {
    // Panel operations
} catch (error) {
    KLITE_RPMod.error('Panel operation failed:', error);
    // Graceful degradation
}
```

### 4. Logging System
```javascript
KLITE_RPMod.log('system', 'Initialization complete');
KLITE_RPMod.log('panels', 'Loading panel: MEMORY');
KLITE_RPMod.log('chars', 'Character imported successfully');
```

## Performance Considerations

### 1. Lazy Loading
- Panels initialize only when first displayed
- Character assets loaded on demand
- Heavy operations deferred with setTimeout

### 2. Memory Management
- Cleanup timers and event listeners in panel.cleanup()
- Avoid memory leaks in long-running sessions
- Efficient character data structures

### 3. DOM Optimization
- Use event delegation for dynamic content
- Minimize DOM manipulation frequency
- Efficient template rendering

## Future Enhancement Areas

### 1. Character System
- Enhanced emotion/expression support
- Better asset management for V3 cards
- Character relationship modeling

### 2. Content Creation
- Advanced prompt engineering tools
- Visual style editor improvements
- Enhanced timeline/chapter management

### 3. Integration
- Better third-party model support
- Enhanced API integration options
- Plugin/extension system

This guide represents the complete technical architecture of the ALPHA implementation and provides the foundation for continued development of the KLITE RPmod enhancement framework.