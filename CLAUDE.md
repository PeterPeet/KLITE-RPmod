# KLITE RPmod - Project Guide

## What We're Building
A comprehensive enhancement layer for KoboldAI Lite (AI text generation frontend) that provides advanced roleplay and content creation tools while preserving full compatibility with the original interface.

## Core Philosophy
**Enhance, don't replace** - We wrap and extend KoboldAI Lite's native functions rather than rebuilding them, ensuring seamless integration and maintaining user familiarity.

## Current Implementation: ALPHA
We are developing the **ALPHA implementation** - a monolithic, full-featured UI replacement that demonstrates our complete vision. The ALPHA approach provides:

- **Complete UI replacement** when active
- **Panel-based architecture** with render(), init(), cleanup() lifecycle
- **Direct integration** with KoboldAI Lite's native functions
- **Smart mode detection** - activates only when user chooses enhanced UI modes
- **18,000+ lines** of mature, feature-rich code

## Key Features
- **Character Management**: Full Tavern Card V1/V2/V3 support with image handling
- **Generation Control**: Advanced parameter management with presets
- **WorldInfo/Memory**: Enhanced editing with group organization
- **RP Mode**: Discord-style message formatting with avatars
- **Mobile Support**: Responsive design down to 349px width
- **Storage Integration**: Uses KoboldAI Lite's IndexedDB system

## Technical Architecture
```javascript
window.KLITE_RPMod = {
    // State management for panels and UI modes
    state: { tabs: {}, collapsed: {}, generating: false },
    
    // Panel system - each panel has:
    panels: {
        PANEL_NAME: {
            render() { /* returns HTML */ },
            init() { /* setup after DOM */ },
            cleanup() { /* resource cleanup */ }
        }
    },
    
    // Direct integration with Lite
    generationControl: { /* wraps window.localsettings */ },
    characters: [ /* manages character cards */ ]
}
```

## Panel-to-Function Integration
Our panels wrap KoboldAI Lite's core functions:

- **Memory Panel** ↔ `window.current_memory`, `window.memorytext`
- **WorldInfo Panel** ↔ `window.current_wi`, `window.pending_wi_obj`
- **Generation Control** ↔ `window.localsettings` (temperature, top_p, etc.)
- **Character System** ↔ Custom character storage + scenario loading
- **TextDatabase Panel** ↔ `window.documentdb_*` variables

## Character Card Support
Full support for all Tavern Card formats:
- **V1**: Basic fields (name, description, personality, scenario, first_mes, mes_example)
- **V2**: Advanced features (system_prompt, alternate_greetings, character_book, tags)
- **V3**: Modern format (assets, decorators, multilingual notes, group_only_greetings)

## Areas Needing Refinement
1. **Character Image Handling**: PNG tEXt/WEBP EXIF extraction could be more robust
2. **Edit Mode**: Current textarea editing works but could use enhanced UX
3. **Group Chat**: Multi-character conversation system needs iteration

## Development Approach
1. **Use existing ALPHA code** as the proven foundation
2. **Preserve familiar UX patterns** that users already know
3. **Maintain direct Lite integration** - avoid unnecessary abstractions
4. **Test with real data** to ensure compatibility

## File Structure
- `KLITE-RPmod_ALPHA.js` - Main implementation (18K+ lines)
- `Project-Development-Guide.md`- Self created developer documentation (somtimes outdated)
- `KoboldAI-Lite_sourcecode_v263_index.html` - Reference Lite source
- `specifications/` - Character card format documentation
- `specifications/problematic-characters-examples/` - Some TavernCards for manual testing

The ALPHA implementation represents a mature, battle-tested approach to enhancing KoboldAI Lite with advanced features while maintaining the core philosophy of enhancement over replacement.