# KoboldAI Lite Complete Developer Documentation
*Version 257 - Comprehensive Reference*

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Core Systems](#2-architecture--core-systems)
3. [UI Modes & Variants](#3-ui-modes--variants)
4. [Operation Modes](#4-operation-modes)
5. [World Info System](#5-world-info-system)
6. [Character Management & Import](#6-character-management--import)
7. [Group Chat System](#7-group-chat-system)
8. [Storage Systems](#8-storage-systems)
9. [API Integration](#9-api-integration)
10. [User Scripts & Extensions](#10-user-scripts--extensions)
11. [UI Elements Reference](#11-ui-elements-reference)
12. [Import/Export Formats](#12-importexport-formats)
13. [Tavern Card Manager](#13-tavern-card-manager)
14. [CSS Theming Reference](#14-css-theming-reference)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)

---

## 1. Project Overview

KoboldAI Lite is a standalone web interface for AI text generation supporting multiple backends. Version 257 (LITEVER = 257) is a single-page application built with vanilla JavaScript.

### Key Global Variables

```javascript
// Core State
var LITEVER = 257;                    // Version number
var gametext_arr = [];               // Main story/chat content array
var current_memory = "";             // Memory field content
var current_anote = "";              // Author's note content
var current_wi = [];                 // World Info entries array
var localsettings = {};              // All user settings

// Generation State
var pending_response_id = "";        // Active generation ID
var synchro_pending_stream = "";     // Streaming response buffer
var retry_in_progress = false;       // Retry state
var last_reply_was_empty = false;    // Empty response tracking

// API Configuration
var custom_kobold_endpoint = "";     // Current Kobold API endpoint
var custom_oai_endpoint = "";        // OpenAI-compatible endpoint
var custom_oai_key = "";             // API key

// Chat State
var groupchat_removals = [];         // Disabled chat participants
var is_impersonate_user = false;     // User impersonation mode
var cosmetic_corpo_ai_nick = "KoboldAI"; // Display name for AI

// UI State
var prev_hl_chunk = null;            // Highlighted text chunk
var memory_tab = 0;                  // Current memory tab
var settings_tab = 0;                // Current settings tab
```

### Architecture Overview

- **Event-driven** architecture with no formal MVC pattern
- **Single HTML file** with all UI modes embedded
- **No external framework** dependencies (vanilla JS)
- **Modular function** organization by feature area

---

## 2. Architecture & Core Systems

### Main Entry Points

```javascript
attempt_connect(popup_aiselect)      // Initial connection setup
render_gametext(save, use_mode_var)  // Main UI rendering function
submit_generation()                  // AI generation submission
autosave()                          // Automatic session saving
```

### Core Generation Flow

```
User Input → prepare_submit_generation() → escape_for_ai()
    ↓
inject_wi_in_prompt() → prepare_submit_payload()
    ↓
dispatch_submit_generation() → API Call
    ↓
handle_incoming_text() → render_gametext()
    ↓
UI Update (mode-specific rendering)
```

### Session Management

```javascript
restart_new_game(save = true, keep_memory = false)
// Resets session, optionally preserving memory/WI
// Sets: gametext_arr = [], resets all state variables

safe_to_overwrite()
// Returns: true if session is empty (safe to load new content)
// Checks: gametext_arr, memory, anote, wi, redo_arr

autosave()
// Saves to localStorage/IndexedDB based on persist_session
// Includes: story, settings, WI, images
```

---

## 3. UI Modes & Variants

### Three UI Variants

| Mode | ID | Description | Target Users |
|------|-----|-------------|--------------|
| Classic | 1 | Basic flexible editor | Power users |
| Aesthetic | 2 | Chat bubbles with portraits | Visual users |
| Corpo | 3 | Commercial chat style | Casual users |

### Mode Selection Functions

```javascript
classic_mode_select()    // Switch to Classic UI
aesthetic_mode_select()  // Switch to Aesthetic UI  
corpo_mode_select()      // Switch to Corpo UI

// Settings tracked per operation mode:
localsettings.gui_type_story     // UI for story mode
localsettings.gui_type_adventure // UI for adventure mode
localsettings.gui_type_chat      // UI for chat mode
localsettings.gui_type_instruct  // UI for instruct mode
```

### Aesthetic UI Configuration

```javascript
class AestheticInstructUISettings {
    // Colors
    bubbleColor_sys = 'rgb(18, 36, 36)';
    bubbleColor_you = 'rgb(41, 52, 58)';
    bubbleColor_AI = 'rgb(20, 20, 40)';
    
    // Layout
    background_margin = [5, 5, 5, 0];
    background_padding = [15, 15, 10, 5];
    
    // Portraits
    you_portrait = null;              // User avatar
    AI_portrait = "default";          // AI avatar
    portrait_width_AI = 80;
    portrait_ratio_AI = 1.0;
    
    // Features
    show_chat_names = true;
    rounded_bubbles = true;
    use_markdown = true;
}
```

---

## 4. Operation Modes

### Mode Configuration

```javascript
localsettings.opmode = 1; // Story Mode
localsettings.opmode = 2; // Adventure Mode  
localsettings.opmode = 3; // Chat Mode
localsettings.opmode = 4; // Instruct Mode
```

### Chat Mode (opmode = 3)

```javascript
// Format: "\nName: Message"
localsettings.chatname = "User";           // Your name
localsettings.chatopponent = "AI";         // Single character
// OR for group chat:
localsettings.chatopponent = "Alice||$||Bob||$||Charlie";
```

### Instruct Mode (opmode = 4)

```javascript
localsettings.instruct_starttag = "{{[INPUT]}}";
localsettings.instruct_endtag = "{{[OUTPUT]}}";
localsettings.instruct_systag = "{{[SYSTEM]}}";
localsettings.instruct_sysprompt = "System instructions...";
```

### Adventure Mode (opmode = 2)

```javascript
localsettings.adventure_switch_mode = 0; // Story sub-mode
localsettings.adventure_switch_mode = 1; // Action sub-mode
localsettings.adventure_switch_mode = 2; // Dice sub-mode

// Player actions prefixed with: "\n\n> action\n\n"
```

---

## 5. World Info System

### Core Structure

```javascript
const worldInfoEntry = {
    // Triggers
    "key": "alice,dr chen",              // Primary keywords (CSV)
    "keysecondary": "laboratory,quantum", // Secondary keywords
    "keyanti": "sleeping,away",          // Anti-keywords
    
    // Content
    "content": "Dr. Alice Chen is...",   // Information to inject
    "comment": "Description",             // ⚠️ CRITICAL for imports!
    
    // Behavior
    "selective": false,      // false = any primary key
                            // true = needs primary AND secondary
    "constant": false,       // true = always active
    "probability": 100,      // 1-100% trigger chance
    
    // Organization
    "wigroup": "Characters", // Group name
    "widisabled": false,     // Enable/disable
    
    // Legacy
    "folder": null          // Not used
};
```

### ⚠️ CRITICAL: Character Import Comment Format

**When importing characters into World Info, the comment field MUST be:**

```javascript
comment: "${characterName}_imported_memory"

// Examples:
// "Alice_imported_memory"
// "Dr. Smith_imported_memory"
// "Bot-7_imported_memory"
```

**This is MANDATORY for imported characters to function correctly!**

### WI Injection Process

```javascript
function inject_wi_in_prompt(context) {
    // 1. Scan context for keywords (respecting wi_searchdepth)
    // 2. Check selective/constant/probability rules
    // 3. Inject content at wi_insertlocation (0=before, 1=after memory)
    
    for (let wi of current_wi) {
        if (wi.widisabled) continue;
        
        if (wi.constant) {
            // Always include
            wistr += wi.content + "\n";
        } else if (wi.selective) {
            // Need primary AND secondary keys
            let hasPrimary = checkKeys(wi.key, context);
            let hasSecondary = checkKeys(wi.keysecondary, context);
            let hasAnti = checkKeys(wi.keyanti, context);
            
            if (hasPrimary && hasSecondary && !hasAnti) {
                if (Math.random() * 100 < wi.probability) {
                    wistr += wi.content + "\n";
                }
            }
        } else {
            // Just need primary key
            if (checkKeys(wi.key, context)) {
                if (Math.random() * 100 < wi.probability) {
                    wistr += wi.content + "\n";
                }
            }
        }
    }
}
```

### WI Management Functions

```javascript
// Editing workflow
start_editing_wi()      // Copy current_wi to pending_wi_obj
save_wi()              // Save UI changes to pending_wi_obj
commit_wi_changes()    // Copy pending_wi_obj to current_wi
update_wi()            // Refresh UI display

// CRUD operations
add_wi()               // Add new entry
del_wi(idx)            // Delete entry
up_wi(idx)             // Move up (within group)
down_wi(idx)           // Move down (within group)

// Group management
add_wi_group()         // Create new group
select_wi_group(name)  // Switch active group
wi_group_export()      // Export group as JSON
```

---

## 6. Character Management & Import

### Tavern Card V2 Structure

```javascript
const tavernCard = {
    "spec": "chara_card_v2",
    "spec_version": "2.0",
    "data": {
        "name": "Character Name",
        "description": "Persona/appearance",
        "personality": "Traits and behavior",
        "scenario": "Setting/context",
        "first_mes": "Greeting message",
        "mes_example": "Example dialogue",
        "system_prompt": "System instructions",
        "alternate_greetings": ["Alt1", "Alt2"],
        "avatar": "base64_image_data",
        "character_book": {
            "entries": {
                "0": {
                    "key": ["trigger1", "trigger2"],
                    "content": "World info content",
                    "selective": false,
                    "constant": false
                }
            }
        },
        "tags": ["fantasy", "female"],
        "creator": "Author name"
    }
};
```

### Character Import Functions

```javascript
// Main PNG/WEBP reader
function readTavernPngFromBlob(blob, onDone) {
    var fileReader = new FileReader();
    fileReader.onload = function(event) {
        var arr = new Uint8Array(event.target.result);
        var result = convertTavernPng(arr);     // Try PNG
        if(!result) {
            result = getTavernExifJSON(arr);    // Try WEBP
        }
        if(!result) {
            result = extractRisuData(arr);      // Try Risu
        }
        if(onDone) onDone(result);
    };
    fileReader.readAsArrayBuffer(blob);
}

// Load character into session
function load_tavern_obj(obj) {
    // Handles greeting selection
    // Sets up chat/instruct mode
    // Imports world info if present
    // Configures UI and names
}

// Import character as World Info
function importCharacterToWI(characterData) {
    const charName = characterData.name;
    
    const wiEntry = {
        key: charName,
        keysecondary: extractAliases(characterData),
        content: buildCharacterContent(characterData),
        comment: `${charName}_imported_memory`, // ⚠️ CRITICAL!
        selective: false,
        constant: false,
        probability: 100,
        wigroup: "Characters",
        widisabled: false
    };
    
    current_wi.push(wiEntry);
    
    // Import character book if present
    if (characterData.character_book) {
        const bookEntries = load_tavern_wi(characterData.character_book);
        bookEntries.forEach(entry => {
            entry.wigroup = "Characters";
            current_wi.push(entry);
        });
    }
}
```

### Character Content Builder

```javascript
function buildCharacterContent(data) {
    let content = `[Character: ${data.name}]\n`;
    
    if (data.description) {
        content += `Persona: ${data.description}\n`;
    }
    if (data.personality) {
        content += `Personality: ${data.personality}\n`;
    }
    if (data.scenario) {
        content += `Background: ${data.scenario}\n`;
    }
    if (data.mes_example) {
        content += `\nExample Dialogue:\n${data.mes_example}\n`;
    }
    
    return content;
}
```

---

## 7. Group Chat System

### Configuration

```javascript
// Multiple participants separated by ||$||
localsettings.chatopponent = "Alice||$||Bob||$||Charlie";

// Excluded participants (won't respond)
groupchat_removals = ["Bob"]; // Bob is muted

// Detection patterns
var othernamesregex = new RegExp("(?!" + localsettings.chatname + ").+?\: ", "gi");
```

### Group Chat Functions

```javascript
function show_groupchat_select() {
    // Shows UI for enabling/disabling participants
    // Allows impersonation of any character
    // Manages groupchat_removals array
}

function get_random_participant(excluded = []) {
    let participants = localsettings.chatopponent.split("||$||");
    let active = participants.filter(p => 
        !groupchat_removals.includes(p) && 
        !excluded.includes(p)
    );
    
    // Smart selection based on context
    return selectNextSpeaker(active);
}

function impersonate_message(index) {
    // Add message as specific character
    let grouplist = localsettings.chatopponent.split("||$||");
    let target = grouplist[index];
    
    gametext_arr.push("\n" + target + ": " + message);
}
```

### WI-Based Group Chat

```javascript
function setupGroupChatFromWI() {
    // 1. Find all character entries
    let characters = current_wi.filter(wi => 
        wi.wigroup === "Characters" && !wi.widisabled
    );
    
    // 2. Build participant list
    let participants = characters.map(wi => wi.key);
    localsettings.chatopponent = participants.join("||$||");
    
    // 3. Clear exclusions
    groupchat_removals = [];
    
    // 4. Update UI
    handle_bot_name_onchange();
}
```

---

## 8. Storage Systems

### Storage Hierarchy

```javascript
// 1. Runtime Variables (temporary)
gametext_arr, current_memory, current_wi

// 2. localStorage (settings)
localsettings → "settings"

// 3. IndexedDB (large data)
"story" → compressed story data
"slot_X_data" → save slot data
"slot_X_meta" → save slot metadata
"tavern_cards_library" → character library
"savedcustomcss" → custom styles
"savedusermod" → user scripts

// 4. Image Storage
image_db → runtime cache
"completed_imgs_meta" → image metadata

// 5. Server Storage (KoboldCpp)
"/api/extra/saveslots/" → remote saves
```

### Save/Load Functions

```javascript
// Auto-save
autosave() // Called periodically, saves to current location

// Manual saves
save_button() // Download as file
save_to_slot(slot, islocal, showcontainer) // Save to slot
quicksave() // Save to last used slot

// Loading
load_selected_file(file) // Load from file
load_from_slot(slot, islocal, switch_to_corpo) // Load slot
quickload() // Load last used slot

// Compression
generate_compressed_story(export_settings, aesthetic, share)
decompress_story(compressed)
```

---

## 9. API Integration

### Supported Backends

1. **AI Horde** (default)
2. **KoboldCpp** (local/remote)
3. **OpenAI** (and compatible)
4. **Claude** (Anthropic)
5. **Google Gemini**
6. **Mistral AI**
7. **Cohere**
8. **Custom endpoints**

### Connection Management

```javascript
function connect_custom_endpoint() {
    let epchoice = document.getElementById("customapidropdown").value;
    
    switch(epchoice) {
        case 0: // Horde
            selected_models = [];
            selected_workers = [];
            break;
        case 1: // KoboldCpp
            custom_kobold_endpoint = url;
            break;
        case 2: // OpenAI
            custom_oai_endpoint = url;
            custom_oai_key = key;
            break;
    }
}

// Feature detection
is_using_kcpp_with_added_memory()
is_using_kcpp_with_websearch()
is_using_kcpp_with_streaming()
is_using_kcpp_with_llava()
```

---

## 10. User Scripts & Extensions

### Loading User Scripts

```javascript
function apply_user_mod() {
    indexeddb_load("savedusermod","").then(currmod => {
        inputBoxOkCancel("Apply user script", currmod, 
            "Paste script here", () => {
            let script = getInputBoxValue().trim();
            indexeddb_save("savedusermod", script);
            if(script != "") {
                var userModScript = new Function(script);
                userModScript(); // Full page access!
            }
        });
    });
}
```

### Extension Patterns

```javascript
// 1. Hook into generation
let original_submit = submit_generation;
submit_generation = function(text) {
    text = myPreprocess(text);
    return original_submit(text);
};

// 2. Add UI elements
document.getElementById("actionmenuitems").insertAdjacentHTML(
    'beforeend', '<button onclick="myFunction()">My Tool</button>'
);

// 3. Process story text
let story = concat_gametext(true);
story = processStory(story);
gametext_arr = [story];
render_gametext();

// 4. Custom commands
if (text.startsWith("/mycommand")) {
    handleCustomCommand(text);
    return false; // Prevent normal processing
}
```

---

## 11. UI Elements Reference

### Main Input/Output Elements

| Element | ID | Function | Description |
|---------|-----|----------|-------------|
| Story Display | `gametext` | Main text area | Classic mode |
| User Input | `input_text` | Text input | Classic mode |
| Chat Input | `cht_inp` | Chat input | Aesthetic mode |
| Corpo Input | `corpo_cht_inp` | Chat input | Corpo mode |
| Submit Button | `btnsend` | `submit_generation()` | Send text |
| Abort Button | `abortgen` | `abort_generation()` | Stop generation |

### Context Controls

| Element | ID | Function | Description |
|---------|-----|----------|-------------|
| Memory | `memorytext` | Context memory | Always included |
| Author's Note | `anotetext` | Mid-context | Injected text |
| AN Template | `anotetemplate` | Template | `[Author's note: <\|>]` |
| AN Strength | `anote_strength` | Position | 480/320/160/0 |

### Settings Controls

| Element | ID | Function | Range |
|---------|-----|----------|-------|
| Temperature | `temperature` | Randomness | 0.1-2.0 |
| Max Length | `max_length` | Output tokens | 1-2048 |
| Rep Penalty | `rep_pen` | Repetition | 1.0-3.0 |
| Top-P | `top_p` | Nucleus sampling | 0-1 |
| Context Size | `max_context_length` | Max tokens | 1024-32768 |

---

## 12. Import/Export Formats

### KoboldAI Story Format

```javascript
{
    "kobold_lite_ver": 257,
    "story_name": "Title",
    "story_chunks": ["text1", "text2"],
    "memory": "Memory content",
    "authorsnote": "AN content",
    "anotestr": 320,
    "anotetemplate": "[Author's note: <|>]",
    "worldinfo": [...],
    "initial_opmode": 3,
    "chatname": "User",
    "chatopponent": "AI||$||Bot2",
    "initial_wi_searchdepth": 0,
    "initial_wi_insertlocation": 0,
    "documentdb_data": "...",
    "groupchat_removals": ["Bot2"],
    "savedsettings": {...},
    "savedaestheticsettings": {...}
}
```

### SillyTavern World Info Import

```javascript
function has_tavern_wi_check(obj) {
    // Check for 'uid' field in entries
    return obj?.entries?.[Object.keys(obj.entries)[0]]?.hasOwnProperty("uid");
}

function load_tavern_wi(obj) {
    // Converts SillyTavern format to KoboldAI format
    // Maps: key, keysecondary, content, comment, selective, constant
    // Lost: position, depth, recursion, role, cooldown, etc.
}
```

---

## 13. Tavern Card Manager

### Card Library Structure

```javascript
const cardLibraryEntry = {
    id: "unique_hash",
    name: "Character Name",
    description: "Short description",
    thumbnail: "data:image/jpeg;base64,...",
    tags: ["fantasy", "female"],
    dateAdded: "2025-01-01",
    lastUsed: "2025-01-15",
    useCount: 5,
    favorite: false,
    category: "Fantasy"
};
```

### Card Management Functions

```javascript
async function addCardToLibrary(file) {
    // 1. Read PNG/WEBP file
    // 2. Extract character data
    // 3. Compress portrait
    // 4. Store in IndexedDB
    // 5. Update library index
}

async function loadCharacter(cardId, mode) {
    switch(mode) {
        case "scenario":
            // Full session restart
            restart_new_game(false);
            load_tavern_obj(characterData);
            break;
            
        case "worldinfo":
            // Add to WI with proper comment format
            importCharacterToWI(characterData);
            break;
            
        case "memory":
            // Add to current memory
            current_memory += buildCharacterContent(characterData);
            break;
    }
}
```

---

## 14. CSS Theming Reference

### Main Layout Classes

```css
/* Global */
.connected          /* Connection established */
.disconnected       /* No connection */
.mainwrapper        /* Main container */

/* Classic UI */
#gametext           /* Story text area */
#inputrow           /* Input controls row */
#topbtnrow          /* Top buttons */

/* Aesthetic UI */
.aes_Prt_YPc       /* Portrait container */
.aes_Cmb_GWd       /* Chat bubble */
.current_char_speaker  /* User messages */
.another_char_speaker  /* AI messages */

/* Corpo UI */
.corpo_body         /* Message area */
.corpo_leftpanel    /* Sidebar */
.corpo_chat_outer   /* Input area */

/* Common */
.btn-primary        /* Primary buttons */
.popupcontainer     /* Modal dialogs */
.settingitem        /* Settings rows */
.color_green        /* Success text */
.color_red          /* Error text */
```

### Custom CSS Application

```javascript
function apply_custom_css() {
    let css = getInputBoxValue();
    css = sanitize_css(css); // Security filter
    document.getElementById('custom_css').innerHTML = css;
    indexeddb_save("savedcustomcss", css);
}
```

---

## 15. Keyboard Shortcuts

| Key | Function | Condition |
|-----|----------|-----------|
| ESC | Close popups | Popup open |
| Enter | Submit text | "Enter Sends" checked |
| Shift+Enter | New line | Always |
| Ctrl+Enter | Submit text | Alternative |

### Event Handlers

```javascript
function handle_typing(event) {
    var charCode = event.keyCode || event.which;
    warn_unsaved = true;
    
    if (!event.shiftKey && charCode == 13) {
        if (document.getElementById("entersubmit").checked) {
            submit_generation_button();
            event.preventDefault();
        }
    }
}

function handle_escape_button(event) {
    if (event.key === "Escape" && is_popup_open()) {
        hide_popups();
    }
}
```

---

## Quick Reference

### Essential Functions

```javascript
// Generation
submit_generation()          // Send to AI
abort_generation()          // Stop generation
btn_retry()                 // Retry last
btn_redo()                  // Redo from point

// Story Management  
render_gametext()           // Update display
concat_gametext()           // Get full text
gametext_arr.push(text)     // Add text
restart_new_game()          // Clear story

// UI Control
msgbox(text, title)         // Show message
inputBox(text, title, ...)  // Get user input
hide_popups()               // Close all dialogs
update_submit_button()      // Update send button

// Storage
autosave()                  // Save session
indexeddb_save(key, value)  // Save data
indexeddb_load(key, default) // Load data
```

### Development Tips

1. **Always use** `render_gametext()` after modifying `gametext_arr`
2. **Check mode** with `localsettings.opmode` before processing
3. **Escape HTML** with `escape_html()` for user content
4. **Test all three** UI modes when adding features
5. **Use IndexedDB** for large data, localStorage for settings
6. **Hook carefully** - save original functions before overriding
7. **Handle errors** - users have diverse setups and data

This documentation represents the complete KoboldAI Lite v257 system as of January 2025.