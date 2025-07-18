# KLITE RP mod - AI Assistant Guide

## Project Overview
- **Vision**: Modular enhancement framework for KoboldAI Lite (AI frontend)
- **Current Status**: Migration from monolithic to modular architecture in progress
- **Active Files**: KLITE-Tools-Modular.js (new implementation), KLITE-RPmod_ALPHA.js (reference)
- **Philosophy**: Enhance rather than replace KoboldAI Lite's UI

## Architecture Revolution

### From Monolithic to Modular
**Before (ALPHA)**: 
- 10,000+ line monolithic file
- Full UI takeover (hides original Lite interface)
- All-or-nothing feature set
- Manual state sync with Lite

**Now (Modular)**:
- User-configurable panel system
- Smart activation only in aesthetic mode
- Independent, hot-swappable panels
- Graceful state management

### Smart Mode Detection
```javascript
// Uses KoboldAI Lite's exact logic for aesthetic mode detection
isAestheticUIActive() {
    return ((localsettings.gui_type_story==1 || localsettings.gui_type_story==2) && localsettings.opmode==1)
        ||((localsettings.gui_type_adventure==1 || localsettings.gui_type_adventure==2) && localsettings.opmode==2)
        ||((localsettings.gui_type_chat==1 || localsettings.gui_type_chat==2) && localsettings.opmode==3)
        ||((localsettings.gui_type_instruct==1 || localsettings.gui_type_instruct==2) && localsettings.opmode==4);
}
```

**Key Discovery**: Messenger (1) and Aesthetic (2) UI modes both use enhanced rendering with bubbles and portraits.

## Development Principles

### Core Philosophy
- **Enhance, don't replace** - Work with user's preferred mode
- **Smart integration** - Only activate when user chooses enhanced modes
- **Graceful degradation** - Hide seamlessly when not needed
- **State preservation** - Restore exact state when returning

### Technical Guidelines
- Reuse existing Lite code/functions
- Use KoboldAI Lite's indexedDB storage (window.indexeddb_save/load)
- Debug with KLiteModular.log('<system>', '<message>')
- Follow async/await patterns for storage operations
- Maintain responsive design (349px+ width support)

## Current Implementation Status

### File Structure
- **KLITE-Tools-Modular.js**: Current modular implementation (active development)
- **KLITE-RPmod_ALPHA.js**: Reference implementation (source for panel extraction)
- **KLITE-Tools-Migration-Plan.md**: Detailed 23-panel breakdown strategy
- **reinventing-notes-rpmod-as-KLITE-Modular.md**: Architecture insights and design principles
- **KoboldAI-Lite-UI-fullcode-htmlandjs.html**: Full Lite sourcecode reference
- **specifications/**: Legacy docs useful for function name searches

### Phase 1 Status: Core Essentials ✅ COMPLETE
**Implemented Panels**:
- ✅ **SystemPrompt Panel**: Prompts, presets, author's note integration
- ✅ **GenerationControl Panel**: Temperature, top-p, tokens, generation settings  
- ✅ **Character Panel**: Full import/export, modal detail view, rating system
- ✅ **Memory Panel**: Entry management, sync with KoboldAI Lite

**Framework Features**:
- ✅ Smart aesthetic mode detection
- ✅ Graceful show/hide with state preservation
- ✅ Async panel loading and initialization
- ✅ IndexedDB storage integration
- ✅ Dynamic panel configuration
- ✅ Comprehensive debug logging system
- ✅ Event handler timing fixes
- ✅ Drag & drop file handling

### Phase 2 Status: Automation Panels ✅ COMPLETE
**Implemented Panels**:
- ✅ **Auto-Regenerate Panel**: Automatic regeneration with quality filters
- ✅ **Auto Sender Panel**: Automatic response sending with timing controls
- ✅ **Smart Memory Writer Panel**: AI-powered memory generation and management
- ✅ **Auto-Save Panel**: Session state preservation with slot management

### Phase 3A Status: Utility Panels ✅ COMPLETE
**Implemented Panels**:
- ✅ **Quick Dice Roll Panel**: RPG dice system with custom notation support
- ✅ **Export Context History Panel**: Multi-format story export (MD, JSON, HTML)
- ✅ **Context Analyzer Panel**: Visual token analysis and context optimization

### Phase 4 Status: Content Management Panels ✅ COMPLETE  
**Implemented Panels**:
- ✅ **Timeline/Index Panel**: Chapter management and story navigation
- ✅ **Quick Actions Panel**: Customizable action templates for Adventure mode

### Phase 5A Status: WorldInfo Management ✅ COMPLETE
**Implemented Panels**:
- ✅ **WorldInfo Management Panel**: Complete WI editor with ALPHA-style direct editing
  - Direct inline editing (no unnecessary modals)
  - Group tabs for organization  
  - Live search filtering
  - Toggle/move/delete controls per entry
  - Settings panel toggle
  - Full KoboldAI Lite integration with `pending_wi_obj` and `current_wi`

### Phase 5B Status: Content Systems ⏳ IN PROGRESS
**Implemented Panels**:
- ✅ **Text Database Panel**: Complete ALPHA port with direct editing, import/export, sliders
  - Real-time textarea editing with auto-save debouncing
  - Advanced settings with sliders (numresults, searchrange, chunksize)
  - File import/export with drag & drop functionality
  - Modal system for file management
  - Direct KoboldAI Lite integration with `window.documentdb_*` variables
  
**Remaining Panels**:
- ⏳ **Group Chat Panel**: Multi-character conversation system
- ⏳ **Help & Reference Panel**: Multi-database help system

### Character Panel Features
**Import/Export**:
- PNG tEXt chunk extraction (Tavern Card format)
- WEBP EXIF data processing
- JSON character data handling
- Drag & drop + click import
- PNG export with metadata embedding

**Display Options**:
- **Overview**: Background images with text overlay (maximized image size)
- **Grid**: 2-column card layout
- **List**: Compact row layout (DEFAULT)
- Search, filter, and sort functionality

**Management**:
- Modal detail view with character info
- Star rating system
- Load as scenario integration
- Add to World Info/Memory
- Behavioral analysis and keyword extraction

## Panel Architecture

### Base Class Structure
```javascript
class KLitePanel {
    constructor(name) {
        this.name = name;
        this.displayName = name.toUpperCase();
        this.storage_prefix = `klite_panel_${name}_`;
    }
    
    // Lifecycle methods
    async init() { /* panel initialization */ }
    render() { /* return HTML string */ }
    postRender() { /* setup event handlers after DOM */ }
    cleanup() { /* cleanup resources */ }
    
    // State management
    saveState() { /* return state object */ }
    restoreState(state) { /* restore from state */ }
    
    // Data persistence
    async saveData(key, data) { /* async storage */ }
    async loadData(key) { /* async retrieval */ }
}
```

### Dynamic Configuration
```javascript
// User-configurable panel positioning
config: {
    leftPanels: ['systemprompt', 'generationcontrol', 'characters'],
    rightPanels: ['memory'],
    panelWidth: 320,
    autoHide: true,
    showIndicator: true
}
```

## ALPHA Architecture Discovery

### **Smart Wrapper Pattern (ALPHA's Secret Sauce)**
**ALPHA was NOT a replacement UI** - it was a **smart wrapper** around KoboldAI Lite's native functions:

```javascript
// ALPHA mirrored Lite's core systems:
this.pendingWI ↔ window.pending_wi_obj  // Lite's native editing buffer
window.current_wi                       // Lite's native storage
window.curr_wi_tab                      // Lite's native group state

// ALPHA's Workflow (mirrors Lite exactly):
startEditing() → copies current_wi to pendingWI 
User edits → updates pendingWI in memory
saveCurrentEdits() → saves DOM values to pendingWI
commitChanges() → commits pendingWI back to current_wi 
refresh() → rebuilds panel UI
```

**Key Insight**: ALPHA wrapped Lite's functions but kept the same logic flow, making it **seamlessly compatible** with Lite's state management.

### **Proven UX Patterns**
ALPHA established working UX patterns that should be **preserved, not reinvented**:

- ✅ **Direct inline editing** - No modals for basic operations
- ✅ **Group tab navigation** - Click tabs to switch contexts  
- ✅ **Live field updates** - Changes save immediately to working buffer
- ✅ **Familiar workflows** - Users expect ALPHA's proven interaction patterns

### **Integration Strategy**
**DON'T**: Create new abstractions or change working UX  
**DO**: Port ALPHA's proven implementations directly with minimal framework adaptation

## Migration Strategy

### **Direct ALPHA Porting (PROVEN APPROACH)**
1. **Copy ALPHA's render() method** - Keep exact HTML structure and interaction patterns
2. **Port ALPHA's actions{} object** - Preserve proven event handling logic  
3. **Adapt framework calls** - Change `KLITE_RPMod.log()` → `KLiteModular.log()`
4. **Keep ALPHA workflows** - Maintain `startEditing/commitChanges` patterns
5. **Test with real data** - Verify seamless Lite integration

### **Panel Extraction Process (UPDATED)**
1. **Locate ALPHA implementation** in KLITE-RPmod_ALPHA.js
2. **Copy render() method directly** - Minimal HTML changes  
3. **Port actions{} object** - Keep exact event handling logic
4. **Adapt postRender()** - Wire up actions to framework event system
5. **Test core functionality** - Verify integration with Lite's native functions

### Storage Integration
- **ALPHA approach**: Direct integration with `window.current_wi`, `window.current_memory`, etc.
- **Modular framework**: Preserve ALPHA's direct integration (don't abstract)
- **Benefit**: Zero compatibility issues with Lite's state management

## AI Development Notes

### Framework Integration
- Framework activates automatically when KoboldAI Lite loads
- Monitors mode changes and shows/hides panels accordingly
- Preserves panel states when switching between modes
- Provides status indicator for user feedback

### Panel Development (UPDATED APPROACH)
- **Port ALPHA implementations directly** - Don't reinvent working patterns
- **Preserve proven UX workflows** - Users expect ALPHA's interaction patterns  
- **Use Lite's native functions** - Direct integration like `window.current_wi`
- **Minimal framework adaptation** - Change only logging and event wiring
- **Test with real scenarios** - Verify seamless Lite compatibility

### Known Issues Fixed
- ✅ Event handler timing (handlers set before DOM exists)
- ✅ Spread syntax errors (async data loading)
- ✅ Storage consistency (indexedDB integration)
- ✅ Configuration persistence (invalid panel cleanup)
- ✅ Character import functionality (drag & drop, file processing)
- ✅ **UX consistency** - WorldInfo panel now uses ALPHA's proven direct editing
- ✅ **State management** - Proper integration with Lite's `pending_wi_obj` system

## Remaining ALPHA Panels Migration

### **Next Priority (Phase 5B)**: Finish Content Systems  
**Estimated: 12-18 hours remaining**
- ⏳ **Group Chat Panel**: Multi-character conversation system (10-12 hours)
  - Character selection modal (appropriate use case)
  - Active character management with remove buttons  
  - Talkativeness settings per character
  - Integration with KoboldAI chat settings

- ⏳ **Help & Reference Panel**: Multi-database help system (6-8 hours)
  - Searchable knowledge base with categories
  - RPmod documentation and guides
  - D&D 5e rules and mechanics integration

### Phase 6: Advanced Features & Integrations ⏳ PLANNED
**Complex Features** (30-40 hours total):
- ⏳ **Character & Persona Integration Panel**: Dual character system
  - Character profile management with detailed personas
  - Behavioral pattern analysis and consistency tracking
  - Context-aware character responses
  - Integration with memory and world info systems
  
- ⏳ **Narrator Controls Panel**: Advanced storytelling controls
  - Perspective switching (1st, 2nd, 3rd person)
  - Narrative voice adjustment and tone controls
  - Scene pacing and tension management
  - Advanced prompt engineering for narration

- ⏳ **Advanced Visual Style Panel**: Complete theme system
  - Theme presets (Dark, Light, High Contrast, Custom)
  - Color customization with live preview
  - Font scaling and typography controls
  - Panel opacity and visual effects
  - Background customization options

### Phase 7: Creative Tools & Scene Management ⏳ PLANNED
**Specialized Systems** (25-35 hours total):
- ⏳ **Image Generation Panel**: Multi-provider image creation
  - Support for multiple AI image providers
  - Prompt engineering and style presets
  - Character appearance consistency tools
  - Scene visualization and mood boarding
  
- ⏳ **Scene Setup Panel**: Comprehensive scene management
  - **Generic Scene Presets**: Common scene templates
  - **Detailed Scene Presets**: Specific scenario setups
  - Environment and atmosphere configuration
  - Character placement and scene composition
  - Quick scene switching and transitions

## Current Progress & Next Steps

### **Completed Phases** ✅
- **Phase 1-3**: 11 panels (Core essentials, automation, utilities)
- **Phase 4**: 2 panels (Timeline/Index, Quick Actions) 
- **Phase 5A**: 1 panel (WorldInfo Management with full ALPHA port)
- **Phase 5B**: 1 panel (Text Database with full ALPHA port)
- **Total Complete**: **15/24 panels (63% complete)**

### **Next Priority (Phase 5B)**: Finish Content Systems
- **Group Chat Panel** (10-12 hours) - Complex multi-character system  
- **Help & Reference Panel** (6-8 hours) - Documentation system

### **Remaining Phases** ⏳  
- **Phase 6**: Advanced integrations (Character/Persona, Narrator, Visual Style)
- **Phase 7**: Creative tools (Image Generation, Scene Setup)

## Migration Strategy Success
**✅ ALPHA Direct Porting Approach PROVEN** with WorldInfo and TextDatabase panels:
- **WorldInfo Panel**: Complete WI management with direct editing and group navigation
- **TextDatabase Panel**: Full text management with sliders, import/export, and auto-save
- Preserved familiar UX workflows from ALPHA
- Maintained seamless KoboldAI Lite integration  
- Avoided unnecessary modal complications
- **Result**: Full-featured panels with proven usability

## Estimated Remaining Effort
- **Remaining panels**: 9 panels  
- **Total estimated hours**: 50-70 hours (reduced from successful porting experience)
- **Current completion**: **15/24 panels (63% complete)**
- **Approach**: Continue direct ALPHA porting for maximum compatibility

## Evolution Summary
**Started**: Multi-file framework → **ALPHA**: Monolithic approach → **Current**: Modular enhancement framework

The project has evolved from replacing KoboldAI Lite's UI to intelligently enhancing it, creating a sustainable and user-friendly ecosystem where users choose only the tools they need.