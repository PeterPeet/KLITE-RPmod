// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Panel System Styles
// Unified styling system for all panels
// =============================================

window.KLITE_RPMod_PanelSystemStyles = `
    /* Panel System Variables */
    :root {
        --klite-panel-padding: 5px;
        --klite-panel-content-max-width: calc(100% - 40px);
        --klite-scrollbar-width: 8px;
        --klite-scrollbar-margin: 4px;
        --klite-panel-section-gap: 0px;
        --klite-panel-max-height-desktop: 830px;
        --klite-panel-max-height-tablet: 1180px;
    }

    /* Base panel wrapper */
    .klite-rpmod-panel-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Tablet mode adjustment */
    @media (min-width: 768px) and (max-width: 1400px) {
        .klite-rpmod-panel-wrapper {
        }
    }

    /* Main scrollable content area */
    .klite-rpmod-panel-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: var(--klite-panel-padding);
        padding-right: calc(var(--klite-panel-padding) - var(--klite-scrollbar-margin));
        scrollbar-gutter: stable;
        height: 100%;
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

    /* Section styling */
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

    /* Section headers */
    .klite-rpmod-section-header {
        background: #2d2d2d;
        padding: 10px 15px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #e0e0e0;
        font-size: 14px;
        user-select: none;
    }

    .klite-rpmod-section-header:hover {
        background: #333;
    }

    .klite-rpmod-section-header h3 {
        color: #e0e0e0;
        font-size: 16px;
        margin: 10px;
        font-weight: 500;
    }

    .klite-rpmod-section-header p {
        color: #999;
        font-size: 12px;
        margin: 0;
        line-height: 1.5;
    }

    /* Content boxes */
    .klite-rpmod-content-box {
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 15px;
    }

    /* Control groups (legacy support) */
    .klite-rpmod-control-group {
        margin-bottom: 20px; /* Add space between sections */
        padding-bottom: 20px; /* Add padding inside sections */
        border-bottom: 1px solid #333; /* Add horizontal line */
    }

    .klite-rpmod-control-group:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .klite-rpmod-control-group h3 {
        margin-bottom: 15px;
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

    /* Form elements */
    .klite-rpmod-panel-content textarea,
    .klite-rpmod-panel-content input[type="text"],
    .klite-rpmod-panel-content input[type="number"],
    .klite-rpmod-panel-content select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px;
        background: #0f0f0f;
        border: 1px solid #333;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 13px;
        font-family: inherit;
    }

    .klite-rpmod-panel-content textarea {
        padding: 10px;
        resize: vertical;
        line-height: 1.4;
    }

    .klite-rpmod-panel-content input,
    .klite-rpmod-panel-content select {
        padding: 8px;
    }

    /* Status indicators */
    .klite-rpmod-status-bar {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #666;
    }

    /* Action buttons */
    .klite-rpmod-action-button {
        width: 100%;
        padding: 10px 20px;
        background: #337ab7;
        border: 1px solid #2e6da4;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 15px;
    }

    .klite-rpmod-action-button:hover {
        background: #286090;
        border-color: #204d74;
    }

    /* Hide the background shadow when only the toggle is visible */
    .klite-rpmod-panel-group .klite-rpmod-control-group:only-child .klite-rpmod-control-group-background {
        display: none;
    }

    /* Or more specifically, when group chat is disabled */
    .klite-rpmod-panel-group .klite-rpmod-control-group:first-child:last-child .klite-rpmod-control-group-background {
        display: none;
    }

    /* Panel inner container */
    .klite-rpmod-panel-inner {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
    }

    /* Override base panel content to use new system */
    .klite-rpmod-content {
        flex: 1;
        padding: 0 !important;
        overflow: hidden !important;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    /* Section styling improvements */
    .klite-rpmod-section {
        margin-bottom: 20px;
        background: #262626;
        border-radius: 4px;
        overflow: hidden;
        border: none;
    }
    
    .klite-rpmod-section-header {
        background: #2d2d2d;
        padding: 10px 15px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #e0e0e0;
        font-size: 14px;
        user-select: none;
        margin: 0;
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
    
    .klite-rpmod-content-box {
        padding: 15px;
        background: transparent;
        border: none;
    }
    
    /* Make sections collapsible */
    .klite-rpmod-section.collapsed .klite-rpmod-section-content {
        display: none;
    }
    
    /* Panel wrapper for consistent structure */
    .klite-rpmod-panel-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #1a1a1a;
    }
    
    /* Panel content scrollable area */
    .klite-rpmod-panel-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 15px;
        height: 100%;
    }
    
    /* Button styling to match mockup */
    .klite-rpmod-button {
        width: 100%;
        padding: 8px 16px;
        background: #337ab7;
        border: 1px solid #2e6da4;
        border-radius: 4px;
        color: white;
        font-size: 13px;
        cursor: pointer;
        margin-top: 8px;
        transition: all 0.2s ease;
    }
    
    .klite-rpmod-button:hover {
        background: #286090;
        border-color: #204d74;
    }

    /* Special button variants */
    .klite-rpmod-button.delete-btn {
        background: #663333;
        border-color: #774444;
    }

    .klite-rpmod-button.delete-btn:hover {
        background: #774444;
        border-color: #885555;
    }
    
    .klite-rpmod-button.active {
        background: #337ab7;
        border-color: #2e6da4;
        color: white;
    }
    
    /* Special styles for dice buttons */
    .dice-btn {
        width: 32px;
        height: 32px;
        padding: 0;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
        margin: 0;
    }
    
    .dice-btn:hover {
        background: #444;
        border-color: #666;
    }

    /* =============================================
    KLITE RP Mod - Panel-specific Styles
    Styles for TOOLS, SCENE, and GROUP panels
    ============================================= */

    /* TOOLS Panel Styles */
    .klite-rpmod-panel-tools .klite-rpmod-token-stats,
    .klite-rpmod-panel-tools .klite-rpmod-analyzer-stats {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 12px;
        margin-top: 10px;
    }

    .klite-rpmod-panel-tools .klite-rpmod-stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 13px;
    }

    .klite-rpmod-panel-tools .klite-rpmod-stat-row span:first-child {
        color: #999;
    }

    .klite-rpmod-panel-tools .klite-rpmod-stat-row span:last-child {
        color: #e0e0e0;
        font-family: 'Courier New', monospace;
    }

    #klite-rpmod-memory-output {
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    /* SCENE Panel Styles */
    .klite-rpmod-scene-display {
        width: 100%;
        height: 200px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #444;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }

    .klite-rpmod-scene-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
        font-style: italic;
    }

    .klite-rpmod-scene-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 10px;
    }

    .klite-rpmod-scene-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #444;
        color: #e0e0e0;
        padding: 12px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .klite-rpmod-scene-btn:hover {
        background: rgba(74, 158, 255, 0.2);
        border-color: #4a9eff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
    }

    .klite-rpmod-scene-btn:active {
        transform: translateY(0);
    }

    .klite-rpmod-portrait-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 10px;
    }

    .klite-rpmod-portrait-item {
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #444;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .klite-rpmod-portrait-item:hover {
        border-color: #4a9eff;
        transform: scale(1.1);
        box-shadow: 0 0 12px rgba(74, 158, 255, 0.5);
    }

    .klite-rpmod-portrait-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* GROUP Panel Styles */
    .klite-rpmod-group-character-list {
        max-height: 300px;
        overflow-y: auto;
        padding-right: 5px;
    }

    .klite-rpmod-group-character-list::-webkit-scrollbar {
        width: 6px;
    }

    .klite-rpmod-group-character-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
    }

    .klite-rpmod-group-character-list::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 3px;
    }

    .klite-rpmod-group-character-list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .klite-rpmod-turn-display {
        margin-bottom: 15px;
    }

    #klite-rpmod-current-speaker {
        text-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
    }

    .klite-rpmod-character-grid {
        max-height: 400px;
        overflow-y: auto;
        padding: 10px;
    }

    .klite-rpmod-character-grid::-webkit-scrollbar {
        width: 8px;
    }

    .klite-rpmod-character-grid::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
    }

    .klite-rpmod-character-grid::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    /* Modal Styles */
    .klite-rpmod-modal {
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    }

    .klite-rpmod-modal-content {
        max-width: 90vw;
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

    /* Notification Styles */
    .klite-rpmod-notification {
        animation: notificationSlideIn 0.3s ease;
    }

    @keyframes notificationSlideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    /* Button Hover Effects */
    .klite-rpmod-button-secondary {
        background: transparent;
        border: 1px solid #666;
        color: #999;
    }

    .klite-rpmod-button-secondary:hover {
        border-color: #4a9eff;
        color: #4a9eff;
        background: rgba(74, 158, 255, 0.1);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .klite-rpmod-scene-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .klite-rpmod-character-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        }
    }

    /* Analysis Window Button */
    #klite-rpmod-detailed-analysis {
        position: relative;
        overflow: hidden;
    }

    #klite-rpmod-detailed-analysis::after {
        content: '→';
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        transition: transform 0.2s ease;
    }

    #klite-rpmod-detailed-analysis:hover::after {
        transform: translateY(-50%) translateX(3px);
    }

    /* Group Memory Textarea */
    #klite-rpmod-group-memory-text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.4;
    }

    #klite-rpmod-group-memory-text:focus {
        outline: none;
        border-color: #4a9eff;
        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
    }

    /* Character selection card hover state */
    .klite-rpmod-character-select-card {
        position: relative;
        overflow: hidden;
    }

    .klite-rpmod-character-select-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, transparent, rgba(74, 158, 255, 0.1));
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .klite-rpmod-character-select-card:hover::before {
        opacity: 1;
    }

    /* Export buttons special styling */
    #klite-rpmod-export-markdown,
    #klite-rpmod-export-json {
        position: relative;
    }

    #klite-rpmod-export-markdown::before,
    #klite-rpmod-export-json::before {
        content: '↓';
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
    }

    #klite-rpmod-export-markdown,
    #klite-rpmod-export-json {
        padding-left: 35px;
    }
`;