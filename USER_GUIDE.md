# KLITE-RPmod User Guide

*Transform KoboldAI Lite into the ultimate roleplay interface*

## 🚀 Quick Start

### What is KLITE-RPmod?
KLITE-RPmod enhances KoboldAI Lite with advanced roleplay features while preserving the familiar interface you already know. It adds:

- **Character Management** - Import and organize Tavern Cards (V1/V2/V3)
- **Enhanced UI** - Panel-based interface optimized for roleplay
- **Group Chat** - Multi-character conversations
- **Smart Memory** - Context management for local LLMs
- **Mobile Support** - Responsive design for any device

### Installation

1. **Open KoboldAI Lite** in your browser
2. **Go to Advanced Settings** tab
3. **Click "Apply User Script"** button
4. **Paste KLITE-RPmod code** from `KLITE-RPmod_ALPHA.js`
5. **Click OK** to activate

*KLITE-RPmod activates automatically when you switch to RP, Adventure, or Chat modes.*

---

## 🎭 Interface Overview

### Panel System
KLITE-RPmod uses a **two-panel layout** that adapts to your screen size:

**Left Panel (Workflow-Focused)**
- 🛠️ **TOOLS** - Generation controls, persona/character integration, narrator tools
- 📊 **CONTEXT** - Token usage, context parts (story/memory/WI/author)
- 🎨 **SCENE** - Themes, colors, lightness, scene helpers
- 👥 **ROLES** - Multi‑character (group) management and triggers
- ❓ **HELP** - Documentation and shortcuts

**Right Panel (Data-Focused)**
- 👤 **CHARS** - Character library
- 🧠 **MEMORY** - Context management
- 📝 **NOTES** - Private notes and AI instructions
- 🌍 **WI** - World Info database
- 📚 **TEXTDB** - Reference documents

### Navigation
- **Desktop**: Click panel tabs to switch content
- **Mobile**: Use arrow buttons for sequential navigation
- **Collapse**: Click panel headers to hide/show panels

---

## 📖 Common Use Cases

### 🎯 Quick Roleplay Start (Single Character)

**Goal**: Import a character and start chatting in under 30 seconds

**Steps**:
1. Switch KoboldAI Lite to **Chat** or **Instruct** mode
2. Open **CHARS** panel (right side)
3. **Drag & drop** character PNG/JSON file into the panel
4. Character details auto-populate - click **"Start Scenario"**
5. Begin chatting in the chat area (main view)

**Supported Formats**:
- PNG files with embedded character data
- JSON character files
- WEBP files with character metadata

### 👤 Character Library Management (CHARS)

**Goal**: Organize and manage multiple characters

**Importing Characters**:
- Drag files into CHARS panel
- Supports batch import of multiple files
- Automatically detects V1/V2/V3 Tavern Card formats

**Organizing Characters**:
- View character gallery with thumbnails
- Search by character name
- Filter by tags or creation date

**Editing Characters**:
- Click character to view details
- Edit any field (name, description, personality, etc.)
- Changes save automatically
- Duplicate characters for variations

### 🧠 Memory Management (MEMORY)

**Goal**: Maintain conversation continuity and context

**How Memory Works**:
- Important events automatically added during conversation
- Smart summarization prevents context overflow
- Character-specific memory isolation
- Persists across browser sessions

**Managing Memory**:
1. Open **MEMORY** panel
2. View accumulated context and token usage
3. Edit memory manually if needed
4. Use **TOOLS** panel for smart summarization

**Local LLM Optimization**:
- Monitor context usage in real-time
- Get warnings before hitting context limits
- Auto-compression maintains key details

### 👥 Group Chat (ROLES)

**Goal**: Multi-character conversations

**Setup**:
1. Open **ROLES** panel (left)
2. Add 2-4 characters to the group
3. Adjust character "talkativeness" settings
4. Set group scenario context
5. Use “Trigger Speaker” in ROLES, or submit in chat; ROLES sets the speaker and injects tail context automatically

Modes available:
- Manual, Round‑Robin, Random, Keyword, Talkative (weighted), Party (one per round)

**Managing Group Flow**:
- Characters respond in natural turn order
- Each maintains distinct personality
- Direct conversations to specific characters
- Adjust participation rates as needed

### 🌍 World Building (WI)

**Goal**: Create persistent, detailed roleplay worlds

**World Info Setup**:
1. Open **WI** panel
2. Create entries for locations, NPCs, lore
3. Set keyword triggers (e.g., "tavern", "kingdom")
4. Organize entries by categories/groups

**Advanced Features**:
- Conditional activation based on context
- Import world data from text files
- Share world info between characters
- Visual organization tools

---

## ⚙️ Generation Settings (TOOLS)

### Quick Presets
Use the **TOOLS** panel for instant generation adjustments:

- **Precise** - Focused, consistent responses
- **KoboldAI** - Balanced, general-purpose
- **Creative** - More varied and imaginative  
- **Chaotic** - Highly unpredictable output

### Custom Settings
Fine‑tune parameters in **TOOLS**:

- **Creativity** (Temperature/Top-p) - Response variation
- **Focus** (Top-k/Min-p) - Attention control
- **Repetition** - Penalty settings
- **Length** - Maximum response tokens

Settings write to Lite’s `localsettings` and sync across panels automatically.

### Persona & Character
- Enable “User Character” (persona) and “AI Character” (single mode) in TOOLS; ROLES manages AI speakers in group mode.
- RPmod injects a compact persona/character block at tail with capacity checks.

### Author’s Note (NOTES)
- Editor with token/word counts and smart insertion settings (boundaries/paragraphs/fallback).
- Mode detection uses RPmod’s unified mode mapping (Story / Chat/RP / Adventure) to describe behavior.

---

## 📱 Mobile Experience

### Mobile Navigation
KLITE-RPmod provides optimized mobile navigation:

**Sequential Flow**: PLAY → TOOLS → SCENE → GROUP → HELP → MAIN → CHARS → MEMORY → NOTES → WI → TEXTDB
Note: Left panel is TOOLS/CONTEXT/SCENE/ROLES/HELP; right panel is CHARS/MEMORY/NOTES/WI/TEXTDB.

**Controls**:
- Arrow buttons for panel navigation
- Current position indicator
- Touch-friendly interface elements
- Swipe support (where available)

### Mobile Tips
- All core features work on mobile
- Text scales appropriately
- Touch targets meet accessibility standards
- Works on screens down to 349px width

---

## 🛠️ Advanced Features

### Context Analysis (TOOLS Panel)
Monitor and optimize your context usage:
- Real-time token counting by category
- Context efficiency metrics
- Smart compression suggestions
- Overflow warnings for local LLMs

### Session Management (Save/Restore)
Save and resume roleplay sessions:
- RPmod embeds its data into host saves (`generate_savefile(...)`) and restores from loads (`kai_json_load(...)`).
- Autosave bundle links to story hash and includes ROLES/TOOLS/SCENE/UI state.
- Persists via Lite’s `indexeddb_save/load` or direct IndexedDB fallback.

### Mood & Theming (SCENE)
Enhance immersion:
- Theme selection by genre/mood
- Dynamic UI adaptation
- Optional AI-generated scene images
- Atmospheric narrator mode

### Avatar Integration
- RPmod chat view always shows avatars efficiently.
- Esolite: RPmod auto‑enables an adapter that updates only newly inserted chat rows (no mass rewrites).
- Lite: Optional “Avatar Adapter” toggle in TOOLS enables the same new‑nodes‑only update path for classic UI (experimental).
- Policy persists in saves (see TOOLS → Avatar Adapter status).

---

## 💡 Tips & Best Practices

### Character Management
- **Organize by genre** - Use consistent naming conventions
- **Test before long sessions** - Import and test characters briefly
- **Backup important characters** - Export modified characters regularly
- **Use descriptive tags** - Makes searching easier

### Memory Optimization
- **Edit memory periodically** - Remove outdated information  
- **Use smart summarization** - Let KLITE-RPmod compress context efficiently
- **Monitor token usage** - Especially important for local LLMs
- **Character-specific memory** - Each character maintains separate context

### Group Chat Success
- **Start with 2-3 characters** - Add more as you get comfortable
- **Define relationships** - Characters interact better with clear dynamics
- **Adjust talkativeness** - Prevent one character from dominating
- **Guide conversations** - Direct interactions to develop storylines

### Performance Tips
- **Close unused panels** - Improves performance on mobile
- **Regular saves** - Prevent data loss during long sessions
- **Clear browser cache** - If experiencing slow performance
- **Use recent browser** - KLITE-RPmod requires modern JavaScript features

---

## 🔧 Troubleshooting

### Common Issues

**KLITE-RPmod not activating**
- Ensure you're in Chat, Instruct, or Adventure mode
- Check browser console for error messages
- Try refreshing the page and reactivating

**Character import fails**
- Verify file format (PNG with character data, JSON, or WEBP)
- Check file size (max 5MB for images)
- Ensure file isn't corrupted

**Performance issues**
- Close unused browser tabs
- Clear browser cache and data
- Check available system memory
- Reduce number of open panels

**Avatars slow on Lite**
- Turn off the “Avatar Adapter” toggle in TOOLS to disable experimental Lite DOM updates.
- RPmod chat avatars remain enabled and performant.

**Group triggers not rotating**
- Verify ROLES speaker mode (Round‑Robin/Random/Keyword/Talkative/Party) and participants.
- Check that Chat mode is active (ROLES forces mode when enabled).

**Memory/context problems**
- Monitor token usage in TOOLS panel
- Use smart summarization for long conversations
- Consider character memory cleanup
- Adjust generation length settings

**Mobile navigation problems**
- Use arrow buttons instead of swiping
- Ensure touch targets are properly tapped
- Try landscape orientation for more space
- Clear mobile browser cache

### Error Recovery

**Data not saving**
- Check browser storage permissions
- Ensure sufficient storage space
- Try exporting characters as backup
- Clear browser data and re-import

**UI broken/not responsive**
- Refresh the page
- Deactivate and reactivate KLITE-RPmod
- Check browser console for JavaScript errors
- Try different browser or incognito mode

**Character behavior inconsistent**
- Verify character data integrity
- Check memory for conflicting information
- Review world info activation
- Test character in isolation

---

## 📚 Additional Resources

### Learning More
- **Requirements** - `docs/developer/REQUIREMENTS.md`
- **Developer Guide** - `AGENTS.md`
- **Tests** - Open `Tests/Test_Runner_FunctionalTests.html` in your browser

### Community
- **KoboldAI Discord** - https://discord.gg/koboldai
- **Share your creations** - Characters, world builds, and modifications
- **Get help** - Community support and troubleshooting

### Development
- **Bug Reports** - Report issues with specific error details
- **Feature Requests** - Suggest improvements and new features
- **Testing** - Help validate new features and fixes

---

## 🎯 Success Metrics

You'll know KLITE-RPmod is working well when:

✅ **Character import takes under 10 seconds**  
✅ **Panel switching feels smooth and responsive**  
✅ **Characters maintain personality across conversations**  
✅ **Memory references previous events naturally**  
✅ **Group conversations feel dynamic and realistic**  
✅ **Mobile interface works comfortably on your device**

---

*KLITE-RPmod transforms KoboldAI Lite into a specialized roleplay platform while preserving everything you love about the original interface. Start with simple character imports and gradually explore advanced features as you become comfortable with the system.*

**Happy roleplaying!** 🎭
