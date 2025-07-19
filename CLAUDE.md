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

## Project Structure

### Core Files (Top Level)
- `KLITE-RPmod_ALPHA.js` - Main implementation (18K+ lines) - **Primary deliverable**
- `USER_GUIDE.md` - End-user documentation and common workflows
- `README.md` - Project overview and installation guide
- `LICENSE` - Project licensing
- `CLAUDE.md` - Development context and project guide

### Documentation (`docs/`)

#### User Documentation (`docs/user/`)
- Reserved for future user-facing documentation and tutorials

#### Developer Documentation (`docs/developer/`)
- `ARCHITECTURE.md` - Complete technical architecture and development best practices
- `REQUIREMENTS.md` - Comprehensive functional & non-functional requirements (200+ requirements)
- `specifications/` - Technical specifications and reference materials
  - `tavern-cards/` - Character card format specifications
    - `spec_v1.md`, `spec_v2.md`, `SPEC_V3.md` - Format specifications
    - `concepts_V3.md` - Advanced V3 format concepts  
    - `keyword_definitions_spec_v1-v2.md` - Legacy format reference
  - `reference/` - Reference implementations and source code
    - `KoboldAI-Lite_sourcecode_v263_index.html` - Reference Lite source

#### Project Documentation (`docs/project/`)
- `USER_STORIES.md` - User personas, workflows, and detailed use cases
- `TESTING_STRATEGY.md` - Testing framework documentation and QA approach
- `archive/` - Historical project documentation
  - `Userstories-RPmod.md` - Legacy user story documentation

### Testing Framework (`tests/`)
- `README.md` - Testing framework documentation and usage guide
- `KLITE_Test_Runner.js` - Core test execution engine
- `KLITE_Test_Assertions.js` - KLITE-specific validation methods
- `KLITE_Test_Mocks.js` - KoboldAI Lite environment simulation
- `Core_System_Tests.js` - System initialization and functionality tests
- `Panel_System_Tests.js` - Panel lifecycle and organization tests  
- `Character_Management_Tests.js` - Character card format and CRUD tests
- `Integration_Tests.js` - KoboldAI Lite integration and API tests
- `KLITE_Functional_Tests.js` - High-level functional validation
- `Test_Runner_FunctionalTests.html` - Browser-based functional test runner
- `Test_Runner_ImplementationTests.html` - Browser-based implementation test runner
- `examples/` - Test data and edge cases
  - `problematic-characters/` - Worst-case character cards for manual testing

### Project Archive (`archive/`)
- Historical backups and deprecated content

### Development Milestones
The project has evolved through systematic development phases:
1. **ALPHA Implementation** - Core monolithic UI replacement (complete)
2. **Requirements Analysis** - Comprehensive requirement extraction from implementation 
3. **User Story Definition** - Structured personas and workflow documentation
4. **Testing Framework** - Comprehensive validation covering 200+ requirements
5. **Quality Assurance** - Systematic testing and validation infrastructure

The ALPHA implementation represents a mature, battle-tested approach to enhancing KoboldAI Lite with advanced features while maintaining the core philosophy of enhancement over replacement. The project now includes comprehensive documentation, structured requirements, and systematic testing to ensure quality and maintainability.