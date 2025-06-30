// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Unified Styles
// All styles combined into one organized file
// =============================================

window.KLITE_RPMod_CoreStylesCSS = `
/* =============================================
   1. CSS VARIABLES & ROOT DEFINITIONS
   ============================================= */
:root {
    color-scheme: dark;

    /* Colors */
    --klite-rpmod-bg: #1a1a1a;
    --klite-rpmod-text: #e0e0e0;
    --klite-rpmod-accent: #4a9eff;
    --klite-rpmod-accent-rgb: 74, 158, 255;
    --klite-rpmod-border: #444;
    --klite-rpmod-primary: #337ab7;
    --klite-rpmod-primary-hover: #286090;
    --klite-rpmod-primary-active: #204d74;
    --klite-rpmod-input-bg: #262626;
    --klite-rpmod-button-bg: #337ab7;
    --klite-rpmod-button-hover: #286090;
    --klite-rpmod-control-group-bg: #1a1a1a;
    
    /* Dimensions */
    --klite-panel-width: 350px;
    --klite-panel-padding: 5px;
    --klite-panel-content-max-width: calc(100% - 40px);
    --klite-scrollbar-width: 8px;
    --klite-scrollbar-margin: 4px;
    --klite-panel-section-gap: 0px;
    --klite-panel-max-height-desktop: 830px;
    --klite-panel-max-height-tablet: 1180px;
    --top-panel-height: 60px;
}

/* =============================================
   2. BASE CONTAINER & LAYOUT
   ============================================= */
   
/* Hide original UI elements */
.klite-rpmod-active #main_container,
.klite-rpmod-active #inputrow,
.klite-rpmod-active #buttonrow {
    display: none !important;
}

/* Main container */
.klite-rpmod-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--klite-rpmod-bg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 1;
    overflow: visible;
}

/* =============================================
   3. PANEL SYSTEM
   ============================================= */
   
/* Base panel styles */
.klite-rpmod-panel {
    position: fixed;
    background: #262626;
    transition: all 0.3s ease;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    overflow: visible;
    display: flex;
    flex-direction: column;
}

/* Left panel */
.klite-rpmod-panel-left {
    left: 0;
    top: 0;
    bottom: 5px;
    width: var(--klite-panel-width);
    transform: translateX(0);
    border-right: 1px solid var(--klite-rpmod-border);
    z-index: 2;
}

.klite-rpmod-panel-left.collapsed {
    transform: translateX(-350px);
}

/* Right panel */
.klite-rpmod-panel-right {
    right: 0;
    top: 0;
    bottom: 5px;
    width: var(--klite-panel-width);
    transform: translateX(0);
    border-left: 1px solid var(--klite-rpmod-border);
    z-index: 2;
}

.klite-rpmod-panel-right.collapsed {
    transform: translateX(350px);
}

/* Top panel - FIXED positioning logic */
.klite-rpmod-panel-top {
    position: fixed;
    top: 0;
    left: var(--klite-panel-width);
    right: var(--klite-panel-width);
    height: auto;
    transform: translateY(0);
    border-bottom: 1px solid var(--klite-rpmod-border);
    z-index: 2;
    transition: all 0.3s ease;
}

.klite-rpmod-panel-top.collapsed {
    transform: translateY(-100%);
}

/* Collapse handles */
.klite-rpmod-collapse-handle {
    position: absolute;
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 12px;
    transition: all 0.2s ease;
    z-index: 2;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.klite-rpmod-collapse-handle:hover {
    background: #333;
    color: #fff;
}

/* Panel handle positions */
.klite-rpmod-panel-left .klite-rpmod-collapse-handle {
    right: -15px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 50px;
    border-radius: 0 5px 5px 0;
    border-left: none;
}

.klite-rpmod-panel-right .klite-rpmod-collapse-handle {
    left: -15px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 50px;
    border-radius: 5px 0 0 5px;
    border-right: none;
}

/* Top panel handle - FIXED centering */
.klite-rpmod-panel-top .klite-rpmod-collapse-handle {
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 15px;
    border-radius: 0 0 5px 5px;
    border-top: none;
}

/* =============================================
   4. RESPONSIVE DESIGN
   ============================================= */

/* Tablet mode (768px - 1400px) */
@media (min-width: 768px) and (max-width: 1400px) {
    .klite-rpmod-panel-top {
        left: 0;
        right: 0;
    }
    
    /* Ensure handle stays centered */
    .klite-rpmod-panel-top .klite-rpmod-collapse-handle {
        left: 50%;
        transform: translateX(-50%);
    }
    
    .klite-rpmod-panel-left,
    .klite-rpmod-panel-right {
        z-index: 3;
    }
    
    .klite-rpmod-main-content {
        left: 15px !important;
        right: 15px !important;
    }
}

/* Mobile mode (below 768px) */
@media (max-width: 767px) {
    .klite-rpmod-panel-top {
        left: 0 !important;
        right: 0 !important;
    }
    
    /* Ensure handle stays centered */
    .klite-rpmod-panel-top .klite-rpmod-collapse-handle {
        left: 50% !important;
        transform: translateX(-50%) !important;
    }
    
    .klite-rpmod-main-content {
        left: 15px !important;
        right: 15px !important;
    }
    
    .klite-rpmod-panel-left,
    .klite-rpmod-panel-right {
        display: none !important;
    }
    
    .klite-rpmod-mobile-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

/* Fullscreen mode */
.klite-rpmod-main-content.fullscreen {
    left: 15px !important;
    right: 15px !important;
    max-width: 100% !important;
}

.klite-rpmod-panel-top.fullscreen {
    left: 0 !important;
    right: 0 !important;
}

/* Ensure handle stays centered in fullscreen */
.klite-rpmod-panel-top.fullscreen .klite-rpmod-collapse-handle {
    left: 50%;
    transform: translateX(-50%);
}

/* Panel scrolling */
.klite-rpmod-panel-content {
    overflow-y: auto !important;
    height: 100%;
}

.klite-rpmod-scrollable {
    overflow-y: auto !important;
}

/* =============================================
   5. TAB SYSTEM
   ============================================= */

.klite-rpmod-tabs {
    display: flex;
    background: rgb(51, 122, 183);
    padding: 10px;
    gap: 5px;
    border-bottom: 1px solid var(--klite-rpmod-border);
    box-sizing: border-box;
}

.klite-rpmod-tab {
    padding: 6px 8px;
    background-color: rgb(45, 107, 160);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 10px;
    font-weight: 400;
    transition: all 0.2s ease;
    width: 62px;
    text-align: center;
    flex: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
}

.klite-rpmod-tab:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-tab.active {
    background-color: #4CAAE5;
    border-color: #4CAAE5;
}

/* =============================================
   6. CONTENT AREAS
   ============================================= */

/* Panel content */
.klite-rpmod-content {
    flex: 1;
    padding: 0 !important;
    overflow: hidden !important;
    color: var(--klite-rpmod-text);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* Panel wrapper */
.klite-rpmod-panel-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Scrollable panel content */
.klite-rpmod-panel-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 15px;
    height: 100%;
}

.klite-rpmod-panel-scene,
.klite-rpmod-panel-group {
    width: calc(var(--klite-panel-width) - 15px) !important; /* Account for handle */
}

/* Sections */
.klite-rpmod-section {
    margin-bottom: 20px;
    background: #262626;
    border-radius: 4px;
    overflow: hidden;
    border: none;
}

.klite-rpmod-section:last-child {
    margin-bottom: 0;
}

.klite-rpmod-section-header {
    background: #2d2d2d;
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--klite-rpmod-text);
    font-size: 14px;
    user-select: none;
}

.klite-rpmod-section-header:hover {
    background: #333;
}

.klite-rpmod-section-content {
    padding: 15px;
    background: transparent;
    overflow: visible;
    transition: all 0.3s ease;
}

.klite-rpmod-section.collapsed .klite-rpmod-section-content {
    display: none;
}

/* =============================================
   7. MAIN CONTENT AREA
   ============================================= */

.klite-rpmod-main-content {
    position: fixed;
    top: 0;
    left: var(--klite-panel-width);
    right: var(--klite-panel-width);
    bottom: 0;
    display: flex;
    flex-direction: column;
}

.klite-rpmod-main-content.top-expanded {
    top: var(--top-panel-height, 60px);
}

/* Chat area */
.klite-rpmod-chat-area {
    flex: 1;
    background: var(--klite-rpmod-bg);
    color: var(--klite-rpmod-text);
    padding: 20px;
    margin-top: 25px;
    margin-bottom: 35px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Chat messages */
.klite-rpmod-chat-area > span:has(img) {
    display: block;
    background: #262626;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    border: 1px solid #333;
    position: relative;
}

.klite-rpmod-chat-area > span:hover {
    background: #2a2a2a;
    border-color: #3a3a3a;
}

/* Chat avatars */
.klite-rpmod-chat-area img {
    height: 30px !important;
    width: 30px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    margin-right: 10px !important;
    vertical-align: middle;
    display: inline-block;
}

/* =============================================
   8. INPUT AREA
   ============================================= */

.klite-rpmod-input-area {
    display: flex;
    padding: 0 15px 15px 15px;
    background: var(--klite-rpmod-bg);
    gap: 10px;
    align-items: stretch;
    position: relative;
}

.klite-rpmod-input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}

.klite-rpmod-text-input {
    width: 100%;
    min-height: 80px;
    max-height: 200px;
    padding: 10px;
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    border-radius: 4px;
    color: var(--klite-rpmod-text);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
}

.klite-rpmod-input-info {
    display: flex;
    justify-content: space-between;
    color: #888;
    font-size: 12px;
    margin-top: -3px;
}

/* =============================================
   9. BUTTONS
   ============================================= */

/* Base button style */
.klite-rpmod-button {
    padding: 8px 16px;
    background: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.klite-rpmod-button:hover {
    background: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-button:active {
    transform: translateY(1px);
}

/* Submit button */
.klite-rpmod-submit-button {
    flex: 2;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    border-radius: 4px 4px 0 0;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s ease;
    padding: 15px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    margin-bottom: 1px !important;
}

.klite-rpmod-submit-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-submit-button.aborting {
    background-color: #663333 !important;
    border: 1px solid #774444 !important;
}

/* Action buttons */
.klite-rpmod-action-buttons {
    display: flex;
    gap: 1px;
    flex: 1;
}

.klite-rpmod-action-button {
    flex: 1;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    color: white;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s ease;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border-radius: 0;
}

.klite-rpmod-action-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-action-button:first-child {
    border-radius: 0 0 0 4px;
}

.klite-rpmod-action-button:last-child {
    border-radius: 0 0 4px 0;
}

/* Bottom buttons */
.klite-rpmod-bottom-left-buttons {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 80px;
    flex-shrink: 0;
}

.klite-rpmod-bottom-button {
    flex: 1;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    color: white;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 26px;
    transition: all 0.2s ease;
    padding: 0 5px;
}

.klite-rpmod-bottom-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-bottom-button:first-child {
    border-radius: 4px 4px 0 0;
}

.klite-rpmod-bottom-button:last-child {
    border-radius: 0 0 4px 4px;
}

/* Right side buttons */
.klite-rpmod-right-buttons {
    display: flex;
    flex-direction: column;
    width: 120px;
    flex-shrink: 0;
    height: 100%;
}

/* =============================================
   10. FORM ELEMENTS
   ============================================= */

/* Control groups */
.klite-rpmod-control-group {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #333;
    position: relative;
}

.klite-rpmod-control-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.klite-rpmod-control-group h3 {
    color: var(--klite-rpmod-text);
    font-size: 16px;
    margin: 0 0 15px 0;
    font-weight: normal;
}

/* Control rows */
.klite-rpmod-control-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 10px;
}

.klite-rpmod-control-row:last-child {
    margin-bottom: 0;
}

.klite-rpmod-control-row label {
    color: #999;
    font-size: 12px;
    min-width: 100px;
    flex-shrink: 0;
}

/* Form inputs */
.klite-rpmod-control-row input[type="text"],
.klite-rpmod-control-row input[type="number"],
.klite-rpmod-control-row select,
.klite-rpmod-control-row textarea,
.klite-rpmod-panel-content input[type="text"],
.klite-rpmod-panel-content input[type="number"],
.klite-rpmod-panel-content select,
.klite-rpmod-panel-content textarea {
    flex: 1;
    padding: 8px;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 4px;
    color: var(--klite-rpmod-text);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
}

.klite-rpmod-control-row textarea,
.klite-rpmod-panel-content textarea {
    min-height: 60px;
    resize: vertical;
    line-height: 1.4;
}

/* Range sliders */
input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 16px;
    background: #333;
    border-radius: 3px;
    outline: none;
    margin: 8px 0;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--klite-rpmod-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    margin-top: -5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
    background: var(--klite-rpmod-primary-hover);
    transform: scale(1.1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--klite-rpmod-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* =============================================
   11. SCROLLBARS
   ============================================= */

 /* Scrollable content helper */
    .klite-rpmod-scrollable {
        overflow-y: auto !important;
        scrollbar-width: thin !important;
    }

/* =============================================
   12. MODALS
   ============================================= */

.klite-rpmod-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.klite-rpmod-modal.show {
    display: flex;
}

.klite-rpmod-modal-content {
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    padding: 20px;
    max-width: 400px;
    width: 90%;
    border-radius: 5px;
    max-height: 90vh;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* =============================================
   13. MOBILE ELEMENTS
   ============================================= */

.klite-rpmod-mobile-panel {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #262626;
    z-index: 4;
    flex-direction: column;
}

.klite-rpmod-mobile-panel.show {
    display: flex;
}

.klite-rpmod-mobile-toggle {
    display: none;
    position: fixed;
    bottom: 120px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: rgb(51, 122, 183);
    border: 2px solid #2e6da4;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 2;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
}

.klite-rpmod-mobile-toggle:hover {
    background-color: var(--klite-rpmod-primary-hover);
    transform: scale(1.1);
}

/* =============================================
   14. CHARACTER MANAGER SPECIFIC
   ============================================= */

.KLITECharacterManager-panel {
    width: 100%;
    height: 100%;
    background-color: transparent;
    color: var(--klite-rpmod-text);
    font-family: inherit;
    display: flex;
    flex-direction: column;
}

.KLITECharacterManager-character-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    overflow-y: auto;
    flex: 1;
    padding: 4px;
    max-height: 420px;
}

.KLITECharacterManager-character-card {
    background: #0f0f0f;
    border: 1px solid #333;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    border-radius: 6px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
}

.KLITECharacterManager-character-card:hover {
    border-color: var(--klite-rpmod-accent);
    background: #1a1a1a;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
}

.KLITECharacterManager-character-card.selected {
    border-color: var(--klite-rpmod-accent);
    background: #2a2a2a;
}

/* =============================================
   15. UTILITY CLASSES
   ============================================= */

.hidden {
    display: none !important;
}

.show {
    display: block !important;
}

.active {
    background-color: #4CAAE5 !important;
    border-color: #4CAAE5 !important;
}

/* Special button variants */
.delete-btn {
    background-color: #663333 !important;
    border-color: #774444 !important;
}

.delete-btn:hover {
    background-color: #774444 !important;
    border-color: #885555 !important;
}

/* Overlay mode for panels */
.klite-rpmod-panel.overlay-mode {
    position: fixed !important;
    z-index: 3 !important;
    box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

/* Edit mode */
#klite-rpmod-chat-display[contenteditable="true"] {
    background: rgba(255, 255, 255, 0.02);
}

#klite-rpmod-chat-display[contenteditable="true"]:focus {
    outline: 2px solid var(--klite-rpmod-accent) !important;
}

/* Narrator message */
.narrator-message {
    border-left: 3px solid #9b59b6 !important;
    background-color: rgba(155, 89, 182, 0.05) !important;
}

/* =============================================
   16. Z-INDEX HIERARCHY
   ============================================= */

/* Ensure proper layering */
.klite-rpmod-container { z-index: 1; }
.klite-rpmod-panel { z-index: 2; }
.klite-rpmod-panel.overlay-mode { z-index: 3; }
.popupcontainer, .popup-container, .modal, .msgbox { z-index: 3 !important; }
.klite-rpmod-mobile-panel { z-index: 4; }
.klite-rpmod-modal { z-index: 10000; }

/* =============================================
   17. ANIMATIONS
   ============================================= */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* Fade animations */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

/* Notification animations */
.klite-rpmod-notification-enter {
    animation: slideIn 0.3s ease;
}

.klite-rpmod-notification-exit {
    animation: slideOut 0.3s ease;
}
`;


// =============================================
// KLITE Character Manager - Panel CSS
// Styles separated for better maintainability
// =============================================

window.KLITE_CharacterManager_CSS = `
    .KLITECharacterManager-panel {
        width: 100%;
        height: 100%;
        background-color: transparent;
        color: #e0e0e0;
        font-family: inherit;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container {
        overflow-y: auto;
        width: 100%;
        flex-grow: 1;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section {
        margin-bottom: 10px;
        border-bottom: 1px solid #444;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header span:last-child {
        margin-left: 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-content {
        padding: 10px;
        transition: all 0.3s ease;
        overflow: hidden;
        will-change: height;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section.collapsed .KLITECharacterManager-section-content {
        display: none;
        border-bottom: 1px solid #444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin-top: 2px;
        align-items: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-tag {
        background: #333;
        color: #ccc;
        padding: 2px 5px;
        font-size: 9px;
        border: 1px solid #444;
        border-radius: 3px;
        line-height: 1.2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn {
        background: #333;
        color: #ccc;
        border: 1px solid #444;
        width: 16px;
        height: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s;
        border-radius: 3px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn:hover {
        background: #444;
        color: #fff;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button {
        padding: 6px 12px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        background-color: #337ab7;
        border: 1px solid #2e6da4;
        color: white;
        cursor: pointer;
        margin: 2px 0;
        transition: background-color 0.3s ease;
        white-space: nowrap;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled:hover {
        opacity: 0.5;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.scenario-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.worldinfo-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn {
        background-color: #663333;
        border-color: #774444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn:hover {
        background-color: #774444;
        border-color: #885555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        border: 1px solid #333;
        color: #e0e0e0;
        margin-bottom: 5px;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone {
        border: 1px dashed #444;
        background: #0f0f0f;
        padding: 8px;
        text-align: center;
        margin-bottom: 8px;
        cursor: pointer;
        font-size: 11px;
        color: #888;
        transition: all 0.2s;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone:hover,
    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone.dragover {
        border-color: #4a90e2;
        background: #1a1a1a;
        color: #4a90e2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding: 4px;
        max-height: 420px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card {
        background: #0f0f0f;
        border: 1px solid #333;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        border-radius: 6px;
        min-height: 180px;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card:hover {
        border-color: #4a90e2;
        background: #1a1a1a;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card.selected {
        border-color: #4a90e2;
        background: #2a2a2a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-image {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        background: #333;
        display: block;
        flex-shrink: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-info {
        padding: 6px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 40px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-name {
        font-weight: 600;
        font-size: 12px;
        color: #e0e0e0;
        line-height: 1.2;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        max-height: 30px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-creator {
        font-size: 10px;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        margin-bottom: 2px;
        line-height: 1.2;
        max-height: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-rating {
        margin-top: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown {
        width: 100%;
        padding: 2px 4px;
        font-size: 8px;
        background: #0f0f0f;
        color: #ccc;
        border: 1px solid #333;
        border-radius: 2px;
        cursor: pointer;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 1;
        display: none;
        overflow-y: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view.show {
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-header {
        background: #262626;
        border-bottom: 1px solid #444;
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions {
        grid-template-columns: 1fr 1fr;
        display: grid;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        max-width: 600px;
        margin: 2px 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions .KLITECharacterManager-button {
        padding: 4px 8px;
        font-size: 12px;
        margin: 1px 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-content {
        padding: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal:not(.hidden) {
        display: flex;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content {
        background: #262626;
        border: 1px solid #444;
        padding: 20px;
        max-width: 400px;
        width: 90%;
        border-radius: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content h3 {
        margin-bottom: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input {
        width: 100%;
        padding: 8px;
        border: 1px solid #444;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 15px;
        box-sizing: border-box;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message {
        background: #1a4a2a;
        color: #6aff8a;
        padding: 8px 12px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5;
        border: 1px solid #2a7a4a;
        display: none;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message.show {
        display: block;
    }

    /* Fullscreen section styles */
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section {
        margin-bottom: 10px;
        border: 1px solid #444;
        border-radius: 5px;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        color: #e0e0e0;
        font-weight: 600;
        font-size: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content {
        padding: 10px;
        background-color: #262626;
        color: #ccc;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: none;
        overflow: visible;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-content {
        display: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-arrow {
        transition: transform 0.2s ease;
        color: #888;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-arrow {
        transform: rotate(-90deg);
    }

    /* Rating filter styles */
    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 5px;
        border: 1px solid #333;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    /* Character info header section */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header {
        background: #262626;
        border: 1px solid #444;
        border-radius: 5px;
        padding: 20px;
        margin-bottom: 10px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-image {
        width: 250px;
        height: 375px;
        object-fit: cover;
        border: 1px solid #333;
        background: #1a1a1a;
        border-radius: 8px;
        margin: 0 auto 15px auto;
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-info {
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-name {
        font-size: 24px;
        font-weight: 600;
        color: #e0e0e0;
        margin-bottom: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-meta {
        font-size: 13px;
        color: #888;
        margin-bottom: 10px;
    }

    /* Tags in header */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 10px;
        justify-content: center;
    }

    /* World info entry styling */
    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry {
        background: #2d2d2d;
        border: 1px solid #3a3a3a;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-keys {
        font-weight: 600;
        color: #4a90e2;
        font-size: 12px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-options {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #777;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-content {
        color: #ccc;
        font-size: 11px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating {
        margin-bottom: 15px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating select {
        padding: 4px 8px;
        background: #0f0f0f;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 4px;
        font-size: 12px;
    }
`;
