// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Core Styles
// Main framework styles extracted from core.js
// =============================================

window.KLITE_RPMod_CoreStyles = `
    /* CSS Variables */
    :root {
        --klite-rpmod-bg: #1a1a1a;
        --klite-rpmod-text: #e0e0e0;
        --klite-rpmod-accent: #4a9eff;
        --klite-rpmod-accent-rgb: 74, 158, 255;
        --klite-rpmod-border: #444;
        --klite-rpmod-primary: #337ab7;
        --klite-rpmod-input-bg: #262626;
        --klite-rpmod-button-bg: #337ab7;
        --klite-rpmod-button-hover: #286090;
        --klite-rpmod-control-group-bg: #1a1a1a;
    }

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
        background: #1a1a1a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 1;
        overflow: visible;
    }

    /* Panel styles */
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
        top: 0px;
        bottom: 5px;
        width: 350px;
        transform: translateX(0);
        border-right: 1px solid #444;
        z-index: 2;
    }

    .klite-rpmod-panel-left.collapsed {
        transform: translateX(-350px);
    }

    /* Right panel */
    .klite-rpmod-panel-right {
        right: 0;
        top: 0px;
        bottom: 5px;
        width: 350px;
        transform: translateX(0);
        border-left: 1px solid #444;
        z-index: 2;
    }

    .klite-rpmod-panel-right.collapsed {
        transform: translateX(350px);
    }

    /* Top panel */
    .klite-rpmod-panel-top {
        top: 0;
        left: 350px;
        right: 350px;
        height: auto;
        transform: translateY(0);
        border-bottom: 1px solid #444;
        z-index: 2;
        transition: all 0.3s ease;
    }

    .klite-rpmod-panel-top.collapsed {
        transform: translateY(-100%);
    }

    .klite-rpmod-panel-top .navbar-collapse {
        display: none;
    }

    .klite-rpmod-panel-top .navbar-collapse.in,
    .klite-rpmod-panel-top .navbar-collapse.show {
        display: block !important;
    }

    /* Tablet mode overrides (768px - 1400px) */
    @media (min-width: 768px) and (max-width: 1400px) {
        .klite-rpmod-panel-top {
            left: 15px;
            right: 15px;
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
        .klite-rpmod-main-content {
            left: 15px !important;
            right: 15px !important;
        }
        
        .klite-rpmod-panel-left,
        .klite-rpmod-panel-right {
            display: none !important;
        }
        
        .klite-rpmod-panel-top {
            left: 15px !important;
            right: 15px !important;
        }
    }

    /* Collapse handles */
    .klite-rpmod-collapse-handle {
        position: absolute;
        background: #262626;
        border: 1px solid #444;
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

    /* Left panel handle */
    .klite-rpmod-panel-left .klite-rpmod-collapse-handle {
        right: -15px;
        top: 50%;
        transform: translateY(-50%);
        width: 15px;
        height: 50px;
        border-radius: 0 5px 5px 0;
        border-left: none;
    }

    /* Right panel handle */
    .klite-rpmod-panel-right .klite-rpmod-collapse-handle {
        left: -15px;
        top: 50%;
        transform: translateY(-50%);
        width: 15px;
        height: 50px;
        border-radius: 5px 0 0 5px;
        border-right: none;
    }

    /* Top panel handle */
    .klite-rpmod-panel-top .klite-rpmod-collapse-handle {
        bottom: -15px;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 15px;
        border-radius: 0 0 5px 5px;
        border-top: none;
    }

    /* Tab bar */
    .klite-rpmod-tabs {
        display: flex;
        background: rgb(51, 122, 183);
        padding: 10px;
        gap: 5px;
        border-bottom: 1px solid #444;
        box-sizing: border-box;
    }

    /* Tab buttons */
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
        background-color: #286090;
        border-color: #204d74;
    }

    .klite-rpmod-tab.active {
        background-color: #4CAAE5;
        border-color: #4CAAE5;
    }

    /* Panel content - Standardized */
    .klite-rpmod-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        overflow-x: hidden;
        color: #e0e0e0;
        box-sizing: border-box;
    }

    /* Scrollable content helper */
    .klite-rpmod-scrollable {
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: #444 #1a1a1a;
    }

    .klite-rpmod-scrollable::-webkit-scrollbar {
        width: 8px;
    }

    .klite-rpmod-scrollable::-webkit-scrollbar-track {
        background: #1a1a1a;
    }

    .klite-rpmod-scrollable::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    .klite-rpmod-scrollable::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    /* Left panel scrollbar styling */
    .klite-rpmod-left-panel::-webkit-scrollbar {
        width: 8px;
    }

    .klite-rpmod-left-panel::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }

    .klite-rpmod-left-panel::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    .klite-rpmod-left-panel::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    /* Apply scrollbar styling to panel content areas */
    .klite-rpmod-content {
        overflow-y: auto;
        overflow-x: hidden;
    }

    /* WebKit browsers (Chrome, Safari, Edge) */
    .klite-rpmod-content::-webkit-scrollbar {
        width: 8px;
    }

    .klite-rpmod-content::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }

    .klite-rpmod-content::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    .klite-rpmod-content::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    /* Firefox - use @supports to prevent errors in other browsers */
    @supports (scrollbar-width: thin) {
        .klite-rpmod-content {
            scrollbar-width: thin;
            scrollbar-color: #444 #1a1a1a;
        }
    }

    /* Control groups */
    .klite-rpmod-control-group {
        border: none;
        margin-bottom: 20px;
        position: relative;
    }

    .klite-rpmod-control-group h3 {
        border: none;
        color: #e0e0e0;
        font-size: 16px;
        margin: 0 0 15px 0;
        font-weight: normal;
    }

    .klite-rpmod-control-group > div:not(.klite-rpmod-control-group-background):not(h3) {
        border-radius: 4px;
        padding: 15px;
        position: relative;
    }

    .klite-rpmod-control-group-background {
        display: none;
    }

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

    .klite-rpmod-control-row input[type="text"],
    .klite-rpmod-control-row input[type="number"],
    .klite-rpmod-control-row select,
    .klite-rpmod-control-row textarea {
        flex: 1;
        padding: 8px;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 13px;
    }

    .klite-rpmod-control-row input[type="checkbox"] {
        margin-right: 8px;
    }

    .klite-rpmod-control-row textarea {
        min-height: 60px;
        resize: vertical;
        font-family: inherit;
        line-height: 1.4;
    }

    /* Buttons - Consistent styling */
    .klite-rpmod-button {
        padding: 8px 16px;
        background: #337ab7;
        border: 1px solid #2e6da4;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .klite-rpmod-button:hover {
        background: #286090;
        border-color: #204d74;
    }

    .klite-rpmod-button:active {
        transform: translateY(1px);
    }

    /* Main content area */
    .klite-rpmod-main-content {
        position: fixed;
        top: 0;
        left: 350px;
        right: 350px;
        bottom: 0;
        display: flex;
        flex-direction: column;
    }

    .klite-rpmod-main-content.top-expanded {
        top: var(--top-panel-height, 60px);
    }

    /* Chat area base styling */
    .klite-rpmod-chat-area {
        flex: 1;
        background: #1a1a1a;
        color: #e0e0e0;
        padding: 20px;
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.6;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Style the HR separator - hiding them but keeping the spacing */
    .klite-rpmod-chat-area hr {
        border: none;
        height: 0;
        margin: 12px 0;
    }

    /* Create message blocks for each span */
    .klite-rpmod-chat-area > span:has(img) {
        display: block;
        background: #262626;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        border: 1px solid #333;
        position: relative;
    }

    /* Style the inline images (avatars) */
    .klite-rpmod-chat-area img {
        height: 30px !important;
        width: 30px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        margin-right: 10px !important;
        vertical-align: middle;
        display: inline-block;
    }

    /* Add background colors to avatars */
    .klite-rpmod-chat-area .color_cyan img {
        background: #4a90e2;
        padding: 2px !important;
    }

    .klite-rpmod-chat-area > span:not(.color_cyan) img {
        background: #5a6b8c;
        padding: 2px !important;
    }

    /* Hover effect for messages */
    .klite-rpmod-chat-area > span:hover {
        background: #2a2a2a;
        border-color: #3a3a3a;
    }

    /* Style links in chat */
    .klite-rpmod-chat-area a {
        color: #4a90e2;
        text-decoration: none;
    }

    .klite-rpmod-chat-area a:hover {
        text-decoration: underline;
    }

    /* For messages being edited */
    .klite-rpmod-chat-area span[contenteditable="true"] {
        border-color: #4a90e2;
        box-shadow: 0 0 0 1px #4a90e2;
        outline: none;
    }

    /* Ensure proper text color for user messages */
    .klite-rpmod-chat-area .color_cyan {
        color: #e0e0e0 !important;
    }

    /* Fix first message spacing */
    .klite-rpmod-chat-area > span:first-of-type {
        margin-top: 0;
    }

    /* Fix last message spacing */
    .klite-rpmod-chat-area > span:last-of-type {
        margin-bottom: 0;
    }

    /* Style for empty chat placeholder */
    .klite-rpmod-chat-area > p {
        text-align: center;
        margin-top: 100px;
        font-style: italic;
        color: #666;
    }

    /* Input area - Fixed flex layout */
    .klite-rpmod-input-area {
        display: flex;
        padding: 0 15px 15px 15px;
        background: #1a1a1a;
        gap: 10px;
        align-items: stretch;
        position: relative;
    }

    /* Bottom left buttons */
    .klite-rpmod-bottom-left-buttons {
        display: flex;
        flex-direction: column;
        gap: 1px;
        width: 80px;
        flex-shrink: 0;
    }

    .klite-rpmod-bottom-button {
        flex: 1;
        background-color: #337ab7;
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
        background-color: #286090;
        border-color: #204d74;
    }

    .klite-rpmod-bottom-button:first-child {
        border-radius: 4px 4px 0 0;
    }

    .klite-rpmod-bottom-button:last-child {
        border-radius: 0 0 4px 4px;
    }

    /* Style for code blocks in chat */
    .klite-rpmod-chat-area pre {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        overflow-x: auto;
    }

    .klite-rpmod-chat-area pre code {
        color: #e0e0e0;
        background: transparent;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
    }

    /* Style the copy button */
    .klite-rpmod-chat-area pre button {
        background: #444;
        border: 1px solid #555;
        color: #ccc;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .klite-rpmod-chat-area pre button:hover {
        background: #555;
        color: #fff;
    }

    /* Mobile panel header */
    .klite-rpmod-mobile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgb(51, 122, 183);
        padding: 10px 15px;
        border-bottom: 1px solid #444;
        gap: 15px;
    }

    /* Mobile dropdown */
    .klite-rpmod-mobile-dropdown {
        flex: 1;
        padding: 6px 10px;
        background-color: rgb(45, 107, 160);
        border: 1px solid #2e6da4;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        cursor: pointer;
    }

    /* Mobile close button */
    .klite-rpmod-mobile-close {
        padding: 6px 15px;
        background-color: rgb(45, 107, 160);
        border: 1px solid #2e6da4;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
    }

    .klite-rpmod-mobile-close:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    /* Mobile content */
    .klite-rpmod-mobile-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        color: #e0e0e0;
    }

    /* Ensure all direct content wrappers can scroll */
    .klite-rpmod-panel > .klite-rpmod-content > div {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }

    /* For text areas that should scroll independently */
    .klite-rpmod-scrollable-textarea {
        overflow-y: auto;
        resize: none;
    }

    /* Fullscreen modal for embedded Stable UI */
    .klite-rpmod-fullscreen-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10002;
        display: flex;
        flex-direction: column;
    }

    .klite-rpmod-fullscreen-modal .klite-rpmod-modal-header {
        background: #1a1a1a;
        border-bottom: 2px solid #4a9eff;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .klite-rpmod-fullscreen-modal .klite-rpmod-modal-header h2 {
        margin: 0;
        color: #4a9eff;
        font-size: 20px;
    }

    .klite-rpmod-fullscreen-modal .klite-rpmod-modal-close {
        background: transparent;
        border: none;
        color: #e0e0e0;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .klite-rpmod-fullscreen-modal .klite-rpmod-modal-close:hover {
        color: #4a9eff;
        transform: rotate(90deg);
    }

    .klite-rpmod-fullscreen-modal .klite-rpmod-modal-body {
        flex: 1;
        overflow: hidden;
        position: relative;
    }

    #klite-rpmod-chat-display[contenteditable="true"] {
        background: rgba(255, 255, 255, 0.02);
    }

    #klite-rpmod-chat-display[contenteditable="true"]:focus {
        outline: 2px solid #4a90e2 !important;
    }

    /* Style for editable messages */
    #klite-rpmod-chat-display[contenteditable="true"] span:hover {
        background: rgba(74, 144, 226, 0.1);
        border-radius: 4px;
    }

    .narrator-message {
        border-left: 3px solid #9b59b6 !important;
        background-color: rgba(155, 89, 182, 0.05) !important;
    }

`;