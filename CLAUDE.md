# KLITE RP mod - AI Assistant Guide

## Project Overview
- Pure JavaScript mod for KoboldAI Lite (AI frontend)
- Single .js file constraint - everything (CSS, logic) embedded in one file
- Runs in Lite context with full access to Lite's variables/functions
- Current version: KLITE-RPmod_ALPHA.js

## Architecture
- IIFE wrapper prevents duplicate loads (window.KLITE_RPMod_LOADED check)
- Console restoration via iframe (lines 18-25)
- CSS-in-JS with CSS variables (:root --bg, --text, --accent, etc.)
- Panel-based UI (left/right/top panels, collapsible)
- Mobile responsive (349px+ width support)

## Development Principles
- Reuse existing Lite code/functions
- No fallbacks - let errors happen gracefully, inform user if data loss possible
- Debug with KLITE_RPMod.log('<system>', '<message>') - new systems need debug activation
- Keep simple - present complex solutions as sketches first

## File Structure
- **KLITE-RPmod_ALPHA.js**: Current production version
- **Backup/KoboldAI-Lite-UI-fullcode-htmlandjs.html**: Full Lite sourcecode reference
- **specifications/**: Outdated docs useful for function name searches
- **Backup/**: Old multi-file versions (v001, v096) and test cases

## AI Development Notes
- Maintain single-file structure always
- Use existing CSS variables for consistency
- Follow established debug logging pattern
- Check Backup/ for Lite's native function references
- Evolution: Started as multi-file framework → refactored to monolithic approach