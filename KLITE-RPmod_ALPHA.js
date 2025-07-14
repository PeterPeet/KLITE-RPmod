// =============================================
// KLITE RP mod - Complete Version v40
// Creator: Peter Hauer | GPL-3.0 License
// https://github.com/PeterPeet/
// =============================================

(function() {
    'use strict';
    
    // Prevent duplicate loads
    if (window.KLITE_RPMod_LOADED) {
        console.warn('[KLITE RPMod] Already loaded, skipping duplicate load');
        return;
    }
    window.KLITE_RPMod_LOADED = true;

    // =============================================
    // CONSOLE RESTORATION FOR KOBOLDAI LITE
    // =============================================
    const consoleFrame = document.createElement('iframe');
    consoleFrame.style.display = 'none';
    document.body.appendChild(consoleFrame);
    window.console = consoleFrame.contentWindow.console;
    
    console.log('[KLITE RPMod] Console access restored via iframe');
    
    // =============================================
    // 1. COMPLETE CSS WITH ALL PANEL STYLES
    // =============================================
    
    const STYLES = `
        :root {
            --bg: #1a1a1a;
            --bg2: #262626;
            --bg3: #333;
            --text: #e0e0e0;
            --muted: #666;
            --border: #444;
            --accent: #4a9eff;
            --primary: #337ab7;
            --danger: #d9534f;
            --success: #5cb85c;
            --warning: #f0ad4e;
        }
        
        /* Hide original UI */
        .klite-active #gamecontainer,
        .klite-active #main_container,
        .klite-active #inputrow { display: none !important; }

        hr {
            height: 0 !important;
            border: none !important;
            border-top: 1px solid rgba(68, 68, 68, 0.3) !important;
            margin: 12px 0 !important;
            background: transparent !important;
        }
        
        /* Container */
        .klite-container {
            position: fixed;
            inset: 0;
            background: var(--bg);
            color: var(--text);
            font-family: system-ui, sans-serif;
            z-index: 1;
        }
        
        /* Panels */
        .klite-panel {
            position: fixed;
            background: var(--bg2);
            transition: transform 0.3s ease;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        
        .klite-panel-left {
            left: 0;
            top: 0;
            bottom: 0;
            width: 350px;
            border-right: 1px solid var(--border);
            z-index: 2;
        }
        
        .klite-panel-left.collapsed { transform: translateX(-350px); }
        
        .klite-panel-right {
            right: 0;
            top: 0;
            bottom: 0;
            width: 350px;
            border-left: 1px solid var(--border);
            z-index: 2;
        }
        
        .klite-panel-right.collapsed { transform: translateX(350px); }
        
        .klite-panel-top {
            top: 0;
            left: 350px;
            right: 350px;
            height: auto;
            border-bottom: 1px solid var(--border);
            transition: all 0.3s ease;
            z-index: 2;
        }

        /* When maincontent is fullscreen, top panel should also adjust */
        .klite-maincontent.fullscreen ~ .klite-panel-top,
        .klite-container:has(.klite-maincontent.fullscreen) .klite-panel-top {
            left: 0 !important;
            right: 0 !important;
        }
        
        .klite-panel-top.collapsed { transform: translateY(-100%); }
        
        /* Responsive */
        @media (max-width: 1400px) {
            .klite-panel-top { left: 0; right: 0; }
            .klite-maincontent { left: 0 !important; right: 0 !important; }
            
            /* Hide fullscreen button in iPad mode (768-1400px) - already fullscreen */
            .klite-desktop-quick-buttons .klite-quick-btn[data-action="fullscreen"] {
                display: none;
            }
        }
        
        /* Hide tablet sidepanel button by default */
        .klite-desktop-quick-buttons .klite-quick-btn[data-action="tablet-sidepanel"] {
            display: none;
        }
        
        /* Show tablet sidepanel button only in tablet mode (768-1400px) */
        @media (min-width: 768px) and (max-width: 1400px) {
            .klite-desktop-quick-buttons .klite-quick-btn[data-action="tablet-sidepanel"] {
                display: block;
            }
            
            /* Active state for tablet sidepanel button */
            .klite-desktop-quick-buttons .klite-quick-btn[data-action="tablet-sidepanel"].active {
                background: var(--success) !important;
                color: white !important;
            }
        }
        
        /* Active state for fullscreen button (shows in desktop mode) */
        .klite-desktop-quick-buttons .klite-quick-btn[data-action="fullscreen"].active {
            background: var(--success) !important;
            color: white !important;
        }
        
        @media (min-width: 768px) and (max-width: 1400px) {
            /* Tablet sidepanel mode classes - only apply in tablet mode */
            .klite-container.tablet-sidepanel-both .klite-panel-top,
            .klite-container.tablet-sidepanel-both .klite-maincontent {
                left: 0 !important;
                right: 0 !important;
            }
            
            .klite-container.tablet-sidepanel-left .klite-panel-top,
            .klite-container.tablet-sidepanel-left .klite-maincontent {
                left: 350px !important;
                right: 0 !important;
            }
            
            .klite-container.tablet-sidepanel-right .klite-panel-top,
            .klite-container.tablet-sidepanel-right .klite-maincontent {
                left: 0 !important;
                right: 350px !important;
            }
            
            .klite-container.tablet-sidepanel-none .klite-panel-top,
            .klite-container.tablet-sidepanel-none .klite-maincontent {
                left: 0 !important;
                right: 0 !important;
            }
        }
        
        /* Fullscreen mode overrides tablet sidepanel mode */
        .klite-maincontent.fullscreen { 
            left: 0 !important; 
            right: 0 !important; 
        }
        
        @media (max-width: 768px) {
            .klite-panel-left, .klite-panel-right { display: none; }
            .klite-maincontent { left: 0 !important; right: 0 !important; }
        }
        
        /* Override media query for mobile mode - panels should be available via arrows */
        .klite-mobile .klite-panel-left,
        .klite-mobile .klite-panel-right {
            display: block !important; /* Override the media query display: none */
        }
        
        /* Collapse handles */
        .klite-handle {
            position: absolute;
            background: var(--bg2);
            border: 1px solid var(--border);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            font-size: 12px;
            z-index: 2;
        }
        
        .klite-handle:hover { background: var(--bg3); color: var(--text); }
        
        .klite-panel-left .klite-handle {
            right: -15px;
            top: 50%;
            transform: translateY(-50%);
            width: 15px;
            height: 50px;
            border-radius: 0 5px 5px 0;
        }
        
        .klite-panel-right .klite-handle {
            left: -15px;
            top: 50%;
            transform: translateY(-50%);
            width: 15px;
            height: 50px;
            border-radius: 5px 0 0 5px;
        }
        
        .klite-panel-top .klite-handle {
            bottom: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 15px;
            border-radius: 0 0 5px 5px;
        }
        
        /* maincontent content */
        .klite-maincontent {
            position: fixed;
            top: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
            /* Default desktop layout */
            left: 350px;
            right: 350px;
        }

        /* When top panel is expanded */
        .klite-maincontent.top-expanded { 
            top: 60px; 
        }

        /* Fullscreen mode */
        .klite-maincontent.fullscreen { 
            left: 0 !important; 
            right: 0 !important; 
        }
        
        /* Chat display */
        .klite-chat {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
            margin: 25px 0 34px 0;
        }
        
        /* Input area */
        .klite-input-area {
            display: flex;
            padding: 0 15px 15px;
            gap: 10px;
            position: relative;
        }
        
        /* Tabs */
        .klite-tabs {
            display: flex;
            gap: 5px;
            padding: 10px;
            background: var(--primary);
            border-bottom: 1px solid var(--border);
        }
        
        .klite-tab {
            padding: 6px 8px;
            background: rgba(255,255,255,0.1);
            border: 1px solid transparent;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            width: 62px;
            text-align: center;
        }
        
        .klite-tab:hover { background: rgba(255,255,255,0.2); }
        .klite-tab.active { background: rgba(255,255,255,0.3); }
        
        /* Content */
        .klite-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 15px;
            max-height: calc(100vh - 60px);
        }
        
        /* Panel-specific styles for Memory and TextDB - not needed anymore */
        
        /* Sections */
        .klite-section {
            margin-bottom: 20px;
            background: var(--bg);
            border-radius: 5px;
            overflow: hidden;
        }
        
        
        .klite-section-header {
            padding: 10px 15px;
            background: var(--bg3);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            user-select: none;
        }
        
        .klite-section-header:hover { background: #3a3a3a; }
        .klite-section.collapsed .klite-section-content { display: none; }
        
        .klite-section-content {
            padding: 15px;
        }
        
        /* Forms */
        .klite-input, .klite-textarea, .klite-select {
            width: 100%;
            padding: 8px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font: inherit;
        }
        
        .klite-textarea { resize: vertical; min-height: 200px; }
        .klite-textarea-fullheight { 
            resize: vertical; 
            min-height: 200px; 
            flex: 1; 
            height: 0; /* Important: allows flex to grow */
        }
        
        .klite-input:focus, .klite-textarea:focus, .klite-select:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        /* Buttons */
        .klite-btn {
            padding: 4px 8px;
            background: var(--primary);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .klite-btn:hover { background: #286090; }
        .klite-btn.danger { background: var(--danger); border-color: #c9302c; }
        .klite-btn.danger:hover { background: #c9302c; }
        .klite-btn.success { background: var(--success); border-color: #4cae4c; }
        .klite-btn.warning { background: var(--warning); border-color: #eea236; }
        .klite-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .klite-btn.danger:disabled { background: #666; border-color: #555; color: #999; }
        
        .klite-btn-xs {
            font-size: 10px;
            padding: 2px 6px;
            min-height: 22px;
        }
        
        .klite-btn-sm {
            font-size: 12px;
            padding: 3px 6px;
            min-width: 26px;
            text-align: center;
        }
        
        /* Input area specifics */
        .klite-left-btns, .klite-right-btns {
            display: flex;
            flex-direction: column;
            gap: 1px;
        }
        
        .klite-left-btns { width: 80px; }
        .klite-right-btns { width: 120px; }
        
        .klite-bottom-btn {
            flex: 1;
            min-height: 26px;
            font-size: 11px;
            padding: 2px;
        }
        
        .klite-bottom-btn.adventure-active {
            background: var(--success) !important;
            color: white !important;
            box-shadow: 0 0 10px rgba(92, 184, 92, 0.5);
        }
        
        .klite-submit-btn {
            flex: 2;
            font-size: 16px;
            font-weight: 500;
        }
        
        .klite-action-btns {
            display: flex;
            gap: 1px;
            flex: 1;
        }
        
        .klite-action-btn {
            flex: 1;
            font-size: 18px;
            padding: 0;
        }
        
        /* Quick buttons */
        .klite-quick-btn {
            width: 26px;
            height: 26px;
            padding: 0;
            font-size: 14px;
            background: #2d6ba0;
        }
        
        /* Info line */
        .klite-info {
            display: flex;
            justify-content: space-between;
            color: #888;
            font-size: 12px;
            margin-top: 2px !important;
        }
        
        /* Utilities */
        .klite-row { 
            display: flex; 
            gap: 2px; 
            align-items: center;
        }
        
        /* Button alignment utilities */
        .klite-buttons-left {
            display: flex;
            gap: 2px;
            justify-content: flex-start;
        }
        
        .klite-buttons-center {
            display: flex;
            gap: 2px;
            justify-content: center;
        }
        
        .klite-buttons-right {
            display: flex;
            gap: 2px;
            justify-content: flex-end;
        }
        
        .klite-buttons-spread {
            display: flex;
            gap: 2px;
            justify-content: space-between;
        }
        
        .klite-buttons-fill {
            display: flex;
            gap: 2px;
        }
        
        .klite-buttons-fill .klite-btn {
            flex: 1;
        }
        
        .klite-buttons-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px;
        }
        
        .klite-buttons-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 2px;
        }
        .klite-muted { color: var(--muted); }
        .klite-center { text-align: center; }
        .klite-mt { margin-top: 10px; }
        .active { background: var(--success) !important; }
        
        /* Panel-specific styles */
        
        /* Control groups */
        .klite-control-group {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
            position: relative;
        }
        
        /* Sliders */
        .klite-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: var(--bg3);
            border-radius: 3px;
            outline: none;
        }
        
        .klite-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: var(--accent);
            border-radius: 50%;
            cursor: pointer;
        }
        
        /* Timeline */
        .klite-timeline {
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .klite-timeline-item {
            padding: 8px;
            margin-bottom: 4px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .klite-timeline-item:hover { background: rgba(255,255,255,0.05); }
        
        /* Gametext Array Styling - targeting actual Lite elements */
        .klite-active #gametext {
            background: var(--bg) !important;
            padding: 15px !important;
            border-radius: 8px !important;
            border: 1px solid var(--border) !important;
            color: var(--text) !important;
        }
        
        .klite-active #gametext hr {
            height: 0 !important;
            border: none !important;
            border-top: 1px solid rgba(68, 68, 68, 0.3) !important;
            margin: 12px 0 !important;
            background: transparent !important;
        }
        
        .klite-active #gametext chunk,
        .klite-active #gametext .message,
        .klite-active #gametext p {
            background: var(--bg2) !important;
            padding: 12px 15px !important;
            margin: 8px 0 !important;
            border-radius: 6px !important;
            border: 1px solid var(--border) !important;
            color: var(--text) !important;
            line-height: 1.5 !important;
            position: relative !important;
            display: block !important;
        }

        .klite-active #gametext > span:has(img) {
            background: var(--bg2) !important;
            padding: 12px 15px !important;
            margin: 8px 0 !important;
            border-radius: 6px !important;
            border: 1px solid var(--border) !important;
            color: var(--text) !important;
            line-height: 1.5 !important;
            position: relative !important;
            display: block !important;
        }
        
        .klite-active #gametext chunk:hover,
        .klite-active #gametext .message:hover,
        .klite-active #gametext p:hover {
            background: var(--bg3) !important;
            border-color: var(--accent) !important;
        }

        /* Character Avatar in Chat */
        .klite-chat-avatar {
            width: 24px;
            height: 24px;
            border-radius: 12px;
            border: 2px solid var(--border);
            object-fit: cover;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
            background: var(--bg3);
        }
        
        /* Character list */
        .klite-character-item {
            display: flex;
            align-items: center;
            padding: 6px;
            margin-bottom: 4px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .klite-character-item:hover { background: rgba(255,255,255,0.05); }
        .klite-character-item.selected { background: rgba(74,158,255,0.2); }
        .klite-character-item.current-speaker { 
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.1);
        }
        
        /* Upload zone */
        .klite-upload-zone {
            border: 2px dashed var(--border);
            border-radius: 8px;
            padding: 40px 20px;
            text-align: center;
            color: var(--muted);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .klite-upload-zone:hover {
            border-color: var(--accent);
            background: rgba(74, 158, 255, 0.05);
            color: var(--text);
        }
        
        .klite-upload-zone.dragover {
            border-color: var(--accent);
            background: rgba(74, 158, 255, 0.1);
            color: var(--accent);
        }
        
        /* Character overview - 3 columns for better name visibility */
        .klite-character-overview {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            width: 100%;
        }
        
        /* Character grid - 2 columns exactly */
        .klite-character-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
        }
        
        .klite-character-card {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
        }
        
        .klite-character-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-color: var(--accent);
        }
        
        /* Character image with 2:3 aspect ratio */
        .klite-char-image img {
            width: 100%;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .klite-char-placeholder {
            width: 100%;
            aspect-ratio: 2/3;
            background: var(--bg3);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: var(--muted);
        }
        
        /* Character name and creator with text wrapping */
        .klite-char-name {
            width: 100%;
            text-align: center;
            font-weight: bold;
            margin: 8px 0 4px 0;
            overflow-wrap: break-word;
            hyphens: auto;
            font-size: 14px;
        }
        
        .klite-char-creator {
            width: 100%;
            text-align: center;
            color: var(--muted);
            font-size: 11px;
            margin-bottom: 8px;
            overflow-wrap: break-word;
            hyphens: auto;
        }
        
        .klite-char-stats {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        
        /* Filter layout - full width elements */
        .klite-filter-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
        }
        
        .klite-filter-input,
        .klite-filter-dropdown {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--bg2);
            color: var(--text);
        }
        
        /* Character fullscreen modal layout */
        .klite-char-modal-layout {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .klite-char-modal-left {
            min-width: 250px;
        }
        
        .klite-char-modal-image img {
            height: 375px;
            width: auto;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: 8px;
        }
        
        .klite-char-placeholder-large {
            height: 375px;
            width: 250px;
            background: var(--bg3);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 64px;
            color: var(--muted);
        }
        
        .klite-char-modal-info {
            margin-top: 15px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .klite-char-modal-right {
            flex: 1;
        }
        
        .klite-char-modal-section {
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
        }
        
        .klite-char-modal-section h3 {
            color: var(--accent);
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        
        .klite-char-modal-text {
            line-height: 1.5;
            color: var(--text);
        }
        
        /* Character tags */
        .klite-tag {
            display: inline-block;
            background: var(--accent);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin-right: 4px;
            margin-bottom: 2px;
        }
        
        .klite-tag-pill {
            display: inline-block;
            padding: 6px 12px;
            margin: 3px;
            background: var(--bg2) !important;
            color: var(--text) !important;
            border: 1px solid var(--border) !important;
            border-radius: 20px !important;
            cursor: pointer;
            font-size: 12px;
            user-select: none;
            transition: all 0.2s;
        }
        
        .klite-tag-pill:hover {
            background: var(--bg3) !important;
            border-color: var(--accent) !important;
        }
        
        .klite-tag-pill.selected {
            background: var(--accent) !important;
            color: white !important;
            border-color: var(--accent) !important;
        }
        
        /* Tools Panel Styles */
        .klite-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .klite-stat-card {
            background: rgba(255,255,255,0.02);
            border-radius: 4px;
            padding: 10px;
            text-align: center;
        }
        
        .klite-stat-label {
            font-size: 10px;
            color: var(--muted);
            text-transform: uppercase;
        }
        
        .klite-stat-value {
            font-size: 18px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-token-bar-container {
            margin-bottom: 10px;
        }
        
        .klite-token-bar {
            display: flex;
            height: 20px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .klite-token-segment {
            height: 100%;
            transition: width 0.3s ease;
        }
        
        .klite-memory-segment { background: #4a9eff; }
        .klite-wi-segment { background: #5cb85c; }
        .klite-story-segment { background: #f0ad4e; }
        .klite-anote-segment { background: #d9534f; }
        .klite-free-segment { background: var(--bg3); }
        
        .klite-token-legend {
            margin-bottom: 10px;
            font-size: 11px;
        }
        
        .klite-token-legend-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
        }
        
        .klite-token-legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .klite-token-legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
        }
        
        .klite-token-legend-label {
            color: var(--muted);
        }
        
        .klite-token-legend-value {
            color: var(--text);
            font-weight: bold;
        }
        
        /* Dice */
        .klite-dice-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            margin-bottom: 10px;
        }
        
        .klite-dice-btn {
            padding: 10px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .klite-dice-btn:hover {
            background: #3a3a3a;
            border-color: var(--accent);
        }
        
        .klite-dice-result {
            background: rgba(255,255,255,0.02);
            border-radius: 4px;
            padding: 15px;
            text-align: center;
            min-height: 80px;
        }
        
        .klite-analytics-tab {
            font-size: 12px;
            padding: 6px 8px;
        }
        
        .klite-analytics-tab.active {
            background: var(--accent);
        }
        
        .klite-analytics-content {
            min-height: 200px;
            background: rgba(0,0,0,0.1);
            border-radius: 4px;
            padding: 10px;
        }
        
        .klite-analytics-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .klite-analytics-metric:last-child {
            border-bottom: none;
        }
        
        .klite-analytics-chart {
            height: 100px;
            background: var(--bg3);
            border-radius: 4px;
            margin: 8px 0;
            position: relative;
            overflow: hidden;
        }
        
        .metric-value {
            font-size: 18px;
            font-weight: bold;
            color: var(--accent);
        }
        
        .metric-label {
            font-size: 10px;
            color: var(--muted);
            margin-top: 2px;
        }
        
        .klite-trend-item {
            padding: 8px;
            background: rgba(0,0,0,0.1);
            border-radius: 4px;
        }
        
        .trend-indicator {
            font-weight: bold;
            font-size: 12px;
        }
        
        .trend-indicator.positive {
            color: var(--success);
        }
        
        .trend-indicator.negative {
            color: var(--danger);
        }
        
        .trend-indicator.neutral {
            color: var(--muted);
        }
        
        .klite-quality-metric {
            padding: 8px;
            background: rgba(0,0,0,0.1);
            border-radius: 4px;
        }
        
        .quality-bar {
            width: 60px;
            height: 8px;
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .quality-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--danger) 0%, var(--warning) 50%, var(--success) 100%);
            transition: width 0.3s ease;
        }
        
        /* WI Panel */
        .klite-wi-groups {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            margin: 15px 0;
        }
        
        .klite-wi-entry {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
        }
        
        .klite-wi-entry.disabled { opacity: 0.5; }
        
        /* Scene controls */
        .klite-scene-control-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .klite-scene-label {
            min-width: 70px;
            font-size: 12px;
            color: var(--muted);
        }
        
        /* Help features */
        .klite-help-feature {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: rgba(255,255,255,0.02);
            border-radius: 6px;
            margin-bottom: 12px;
        }
        
        .klite-help-feature-icon { font-size: 24px; line-height: 1; }
        .klite-help-feature-content { flex: 1; }
        .klite-help-feature-title { font-weight: bold; margin-bottom: 4px; }
        .klite-help-feature-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }
        
        /* klite-message styles removed - showMessage system eliminated */
        
        
        /* Collapsible Sections */
        .klite-char-section {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .klite-char-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--bg3);
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
        }
        
        .klite-char-section-header:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        .klite-char-section-title {
            font-weight: 600;
            color: var(--text);
        }
        
        .klite-char-section-toggle {
            color: var(--muted);
            font-size: 14px;
            transition: transform 0.2s ease;
        }
        
        .klite-char-section.collapsed .klite-char-section-toggle {
            transform: rotate(-90deg);
        }
        
        .klite-char-section-content {
            padding: 16px;
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease;
        }
        
        .klite-char-section.collapsed .klite-char-section-content {
            max-height: 0;
            padding: 0 16px;
        }
        
        
        .klite-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border);
        }
        
        .klite-modal-header h3 {
            margin: 0;
            color: var(--text);
        }
        
        .klite-modal-close {
            background: none;
            border: none;
            color: var(--muted);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        
        .klite-modal-close:hover {
            background: var(--border);
            color: var(--text);
        }
        
        .klite-modal-body {
            flex: 1;
            overflow-y: auto;
        }
        
        .klite-modal-footer {
            display: flex;
            gap: 2px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid var(--border);
        }
        
        .klite-modal-footer .klite-btn {
            flex: 1;
        }
        
        /* Animations */
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
        
        /* =============================================
           ENHANCED CHARS PANEL STYLES
           ============================================= */
        
        /* Character Management Controls */
        .klite-char-management {
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-management-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .klite-char-management-title {
            font-size: 14px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-management-controls {
            display: flex;
            gap: 2px;
        }
        
        .klite-char-view-toggle {
            display: flex;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .klite-char-view-btn {
            padding: 6px 12px;
            background: transparent;
            border: none;
            color: var(--muted);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .klite-char-view-btn:hover {
            background: var(--bg2);
            color: var(--text);
        }
        
        .klite-char-view-btn.active {
            background: var(--accent);
            color: white;
        }
        
        /* Search and Filter Controls */
        .klite-char-search-filter {
            display: flex;
            gap: 2px;
            margin-bottom: 15px;
        }
        
        .klite-char-search {
            flex: 1;
            padding: 8px 12px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font-size: 12px;
        }
        
        .klite-char-search:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        .klite-char-search::placeholder {
            color: var(--muted);
        }
        
        .klite-char-filter {
            padding: 8px 12px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font-size: 12px;
            min-width: 120px;
        }
        
        .klite-char-filter:focus {
            outline: none;
            border-color: var(--accent);
        }
        
        /* Character Cards - Grid View */
        .klite-chars-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-card {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        
        .klite-char-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-color: var(--accent);
        }
        
        .klite-char-card.selected {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(74,158,255,0.3);
        }
        
        .klite-char-card-avatar {
            width: 100%;
            height: 120px;
            background: var(--bg3);
            background-size: cover;
            background-position: center;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            font-size: 48px;
        }
        
        .klite-char-card-content {
            padding: 12px;
        }
        
        .klite-char-card-name {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .klite-char-card-description {
            font-size: 11px;
            color: var(--muted);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .klite-char-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
        }
        
        .klite-char-card-actions {
            display: flex;
            gap: 2px;
        }
        
        .klite-char-card-action {
            width: 20px;
            height: 20px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            color: var(--muted);
            transition: all 0.2s;
        }
        
        .klite-char-card-action:hover {
            background: var(--bg3);
            color: var(--text);
        }
        
        .klite-char-card-action.danger:hover {
            background: var(--danger);
            color: white;
        }
        
        /* Character List - List View */
        .klite-chars-list {
            display: block;
        }
        
        .klite-char-list-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .klite-char-list-item:hover {
            background: var(--bg3);
            border-color: var(--accent);
        }
        
        .klite-char-list-item.selected {
            background: rgba(74,158,255,0.1);
            border-color: var(--accent);
        }
        
        .klite-char-list-avatar {
            width: 40px;
            height: 40px;
            background: var(--bg3);
            background-size: cover;
            background-position: center;
            border-radius: 50%;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            font-size: 16px;
        }
        
        .klite-char-list-content {
            flex: 1;
            min-width: 0;
        }
        
        .klite-char-list-name {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .klite-char-list-description {
            font-size: 11px;
            color: var(--muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .klite-char-list-actions {
            display: flex;
            gap: 2px;
        }
        
        .klite-char-list-action {
            width: 24px;
            height: 24px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 11px;
            color: var(--muted);
            transition: all 0.2s;
        }
        
        .klite-char-list-action:hover {
            background: var(--bg3);
            color: var(--text);
        }
        
        .klite-char-list-action.danger:hover {
            background: var(--danger);
            color: white;
        }
        
        /* Character Modal */
        .klite-char-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .klite-char-modal.hidden {
            display: none;
        }
        
        .klite-char-modal-content {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .klite-char-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: var(--bg3);
            border-bottom: 1px solid var(--border);
        }
        
        .klite-char-modal-title {
            font-size: 16px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-modal-close {
            background: none;
            border: none;
            color: var(--muted);
            cursor: pointer;
            font-size: 20px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .klite-char-modal-close:hover {
            background: rgba(255,255,255,0.1);
            color: var(--text);
        }
        
        .klite-char-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .klite-char-modal-section {
            margin-bottom: 20px;
        }
        
        .klite-char-modal-section:last-child {
            margin-bottom: 0;
        }
        
        .klite-char-modal-section-title {
            font-size: 14px;
            font-weight: bold;
            color: var(--text);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .klite-char-modal-avatar {
            width: 120px;
            height: 120px;
            background: var(--bg3);
            background-size: cover;
            background-position: center;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--muted);
            font-size: 48px;
        }
        
        .klite-char-modal-name {
            font-size: 20px;
            font-weight: bold;
            color: var(--text);
            margin-bottom: 8px;
        }
        
        .klite-char-modal-description {
            font-size: 13px;
            color: var(--muted);
            line-height: 1.4;
            margin-bottom: 15px;
        }
        
        .klite-char-modal-actions {
            display: flex;
            gap: 2px;
            margin-top: 15px;
        }
        
        /* Rating Stars */
        .klite-rating-stars {
            display: flex;
            gap: 2px;
            margin-bottom: 8px;
        }
        
        .klite-rating-star {
            cursor: pointer;
            color: #555;
            font-size: 16px;
            transition: color 0.2s;
        }
        
        .klite-rating-star:hover,
        .klite-rating-star.active {
            color: #ffd700;
        }
        
        .klite-rating-star.hover {
            color: #ffed4a;
        }
        
        .klite-rating-display {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .klite-rating-display .klite-rating-star {
            cursor: default;
            font-size: 12px;
        }
        
        .klite-rating-text {
            font-size: 11px;
            color: var(--muted);
        }
        
        /* World Info Entries Display */
        .klite-char-worldinfo {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-worldinfo-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .klite-char-worldinfo-title {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-worldinfo-count {
            font-size: 11px;
            color: var(--muted);
            background: var(--bg2);
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .klite-char-worldinfo-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .klite-char-worldinfo-item {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .klite-char-worldinfo-item:hover {
            background: var(--bg3);
            border-color: var(--accent);
        }
        
        .klite-char-worldinfo-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .klite-char-worldinfo-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        
        .klite-char-worldinfo-item-key {
            font-size: 12px;
            font-weight: bold;
            color: var(--text);
            font-family: monospace;
        }
        
        .klite-char-worldinfo-item-enabled {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--muted);
        }
        
        .klite-char-worldinfo-item-enabled.active {
            color: var(--success);
        }
        
        .klite-char-worldinfo-item-content {
            font-size: 11px;
            color: var(--muted);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        /* Greeting Items Display */
        .klite-char-greetings {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-greetings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .klite-char-greetings-title {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-greetings-count {
            font-size: 11px;
            color: var(--muted);
            background: var(--bg2);
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .klite-char-greetings-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .klite-char-greeting-item {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .klite-char-greeting-item:hover {
            background: var(--bg3);
            border-color: var(--accent);
        }
        
        .klite-char-greeting-item.selected {
            border-color: var(--accent);
            background: rgba(74,158,255,0.1);
        }
        
        .klite-char-greeting-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        
        .klite-char-greeting-item-label {
            font-size: 12px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-greeting-item-actions {
            display: flex;
            gap: 2px;
        }
        
        .klite-char-greeting-item-action {
            width: 20px;
            height: 20px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            color: var(--muted);
            transition: all 0.2s;
        }
        
        .klite-char-greeting-item-action:hover {
            background: var(--bg3);
            color: var(--text);
        }
        
        .klite-char-greeting-item-action.primary:hover {
            background: var(--primary);
            color: white;
        }
        
        .klite-char-greeting-item-content {
            font-size: 11px;
            color: var(--muted);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        /* Character Statistics */
        .klite-char-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .klite-char-stat {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 8px;
            text-align: center;
        }
        
        .klite-char-stat-value {
            font-size: 16px;
            font-weight: bold;
            color: var(--text);
            margin-bottom: 2px;
        }
        
        .klite-char-stat-label {
            font-size: 10px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Empty States */
        .klite-chars-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--muted);
        }
        
        .klite-chars-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        .klite-chars-empty-text {
            font-size: 14px;
            margin-bottom: 16px;
        }
        
        .klite-chars-empty-action {
            padding: 8px 16px;
            background: var(--primary);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .klite-chars-empty-action:hover {
            background: #286090;
        }
        
        /* Loading States */
        .klite-chars-loading {
            text-align: center;
            padding: 40px 20px;
            color: var(--muted);
        }
        
        .klite-chars-loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--border);
            border-top: 2px solid var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .klite-chars-loading-text {
            font-size: 12px;
        }
        
        /* HELP Panel Search Styles */
        .klite-help-search-section {
            margin-bottom: 20px;
        }
        
        .klite-help-database-selector {
            display: flex;
            gap: 2px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .klite-help-db-btn {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
        }
        
        .klite-help-db-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--accent);
        }
        
        .klite-help-db-btn.active {
            background: var(--accent);
            border-color: var(--accent);
            color: white;
        }
        
        .klite-help-search-input-container {
            position: relative;
            margin-bottom: 15px;
        }
        
        .klite-help-search-input {
            width: 100%;
            padding: 10px 40px 10px 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .klite-help-search-input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }
        
        .klite-help-search-clear {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--muted);
            cursor: pointer;
            font-size: 18px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .klite-help-search-clear:hover {
            color: var(--text);
        }
        
        .klite-help-search-results {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border);
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .klite-help-search-placeholder,
        .klite-help-no-results {
            padding: 20px;
            text-align: center;
            color: var(--muted);
            font-style: italic;
        }
        
        .klite-help-search-result {
            padding: 12px;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .klite-help-search-result:last-child {
            border-bottom: none;
        }
        
        .klite-help-search-result:hover {
            background: rgba(74, 158, 255, 0.1);
        }
        
        .klite-help-result-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .klite-help-result-title {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
        }
        
        .klite-help-result-category {
            font-size: 10px;
            color: var(--muted);
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 2px;
            white-space: nowrap;
        }
        
        .klite-help-result-content {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.4;
            margin-bottom: 6px;
        }
        
        .klite-help-result-score {
            font-size: 10px;
            color: var(--muted);
            text-align: right;
        }
        
        /* Search term highlighting */
        .klite-help-search-result mark {
            background: var(--accent);
            color: white;
            padding: 1px 2px;
            border-radius: 2px;
        }
        
        /* Modal styles for detailed entry view */
        .klite-help-modal-category {
            font-size: 12px;
            color: var(--accent);
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .klite-help-modal-content {
            line-height: 1.6;
            margin-bottom: 20px;
        }
        
        .klite-help-modal-keywords {
            font-size: 12px;
            color: var(--muted);
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            border-left: 3px solid var(--accent);
        }
        
        /* Help feature styles (existing, enhanced) */
        .klite-help-feature {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .klite-help-feature:last-child {
            border-bottom: none;
        }
        
        .klite-help-feature-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .klite-help-feature-content {
            flex: 1;
        }
        
        .klite-help-feature-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text);
        }
        
        .klite-help-feature-desc {
            font-size: 12px;
            color: var(--muted);
            line-height: 1.4;
        }

        /* Behavioral Analysis Styles */
        .klite-char-behavioral {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-behavioral-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .klite-char-behavioral-title {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-behavioral-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .klite-char-behavioral-item {
            background: var(--bg2);
            border-radius: 4px;
            padding: 8px;
            text-align: center;
        }
        
        .klite-char-behavioral-label {
            font-size: 10px;
            color: var(--muted);
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .klite-char-behavioral-value {
            font-size: 14px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-behavioral-keywords {
            margin-top: 10px;
            padding: 8px;
            background: var(--bg2);
            border-radius: 4px;
        }
        
        .klite-char-behavioral-keywords-title {
            font-size: 11px;
            color: var(--muted);
            margin-bottom: 6px;
        }
        
        .klite-char-behavioral-keywords-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .klite-char-behavioral-keyword {
            background: var(--accent);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
        }
        
        /* Character Version Info Styles */
        .klite-char-version {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
        }
        
        .klite-char-version-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .klite-char-version-title {
            font-size: 13px;
            font-weight: bold;
            color: var(--text);
        }
        
        .klite-char-version-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        
        .klite-char-version-item {
            background: var(--bg2);
            border-radius: 4px;
            padding: 8px;
        }
        
        .klite-char-version-label {
            font-size: 10px;
            color: var(--muted);
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .klite-char-version-value {
            font-size: 12px;
            color: var(--text);
            font-family: monospace;
        }
        
        /* WorldInfo Import Button Styles */
        .klite-char-worldinfo-actions {
            display: flex;
            gap: 2px;
            margin-top: 10px;
        }
        
        .klite-char-worldinfo-action {
            flex: 1;
            padding: 6px 12px;
            background: var(--primary);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 11px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .klite-char-worldinfo-action:hover {
            background: #286090;
        }
        
        .klite-char-worldinfo-action.secondary {
            background: var(--bg3);
            border-color: var(--border);
            color: var(--text);
        }
        
        .klite-char-worldinfo-action.secondary:hover {
            background: var(--bg2);
            border-color: var(--accent);
        }
        
        /* Character Action Button Styles */
        .klite-char-modal-footer {
            padding: 16px 20px;
            background: var(--bg3);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 2px;
            justify-content: flex-end;
        }
        
        .klite-char-action-btn {
            padding: 8px 16px;
            border: 1px solid var(--border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .klite-char-action-btn.primary {
            background: var(--primary);
            border-color: #2e6da4;
            color: white;
        }
        
        .klite-char-action-btn.primary:hover {
            background: #286090;
        }
        
        .klite-char-action-btn.secondary {
            background: var(--bg2);
            color: var(--text);
        }
        
        .klite-char-action-btn.secondary:hover {
            background: var(--bg3);
            border-color: var(--accent);
        }
        
        /* Responsive adjustments for character panels */
        @media (max-width: 768px) {
            .klite-chars-grid {
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 8px;
            }
            
            .klite-char-card-avatar {
                height: 100px;
            }
            
            .klite-char-card-content {
                padding: 10px;
            }
            
            .klite-char-modal-content {
                width: 95%;
                max-height: 95vh;
            }
            
            .klite-char-modal-body {
                padding: 15px;
            }
            
            .klite-char-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .klite-char-behavioral-grid,
            .klite-char-version-info {
                grid-template-columns: 1fr;
            }
        }
        
        /* =============================================
           MOBILE MODE STYLES
           ============================================= */
        
        /* Button visibility swapping */
        .klite-desktop-btn {
            display: block;
        }
        
        .klite-mobile-btn {
            display: none;
        }
        
        /* Hide desktop buttons in mobile mode */
        .klite-mobile .klite-desktop-btn {
            display: none !important;
        }
        
        /* Show mobile buttons in mobile mode */
        .klite-mobile .klite-mobile-btn {
            display: block !important;
        }

        /* Mobile button sets - hide mode-specific buttons by default */
        .klite-mobile .klite-mobile-story,
        .klite-mobile .klite-mobile-adventure,
        .klite-mobile .klite-mobile-chat {
            display: none !important;
        }
        
        
        /* Show correct mobile button set based on mode */
        .klite-mobile.mode-1 .klite-mobile-story {
            display: block !important;
        }
        
        .klite-mobile.mode-2 .klite-mobile-adventure {
            display: block !important;
        }
        
        .klite-mobile.mode-3 .klite-mobile-chat,
        .klite-mobile.mode-4 .klite-mobile-chat {
            display: block !important;
        }
        
        /* Mobile input area - maximized layout with relative positioning */
        .klite-mobile .klite-input-area {
            gap: 4px !important;
            padding: 8px !important;
            position: relative !important;
        }
        
        /* Mobile textarea - maximize space */
        .klite-mobile .klite-textarea {
            min-height: 122px !important;
            flex: 1 !important;
        }
        
        .klite-mobile .klite-textarea-container {
            flex: 1 !important;
        }
        
        /* Mobile left buttons - make them narrower and input area larger */
        .klite-mobile .klite-left-btns {
            width: 32px !important; /* Fixed narrow width for mobile */
            flex: none !important;
            flex-direction: column !important; /* Stack buttons vertically */
            gap: 1px !important;
        }
        
        /* Mobile right buttons - restructured layout */
        .klite-mobile .klite-right-btns {
            width: 32px !important;
            flex: none !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1px !important;
            position: relative !important;
        }
        
        .klite-mobile .klite-submit-btn {
            width: 32px !important;
            height: 125px !important;
            font-size: 14px !important;
            flex: none !important;
        }
        
        /* Position action buttons outside the right column */
        .klite-mobile .klite-action-btns {
            height: 16px !important;
            flex: none !important;
            display: flex !important;
            gap: 1px !important;
            position: absolute !important;
            bottom: 0px !important;
            right: 0px !important;
            width: 100px !important;
            z-index: 10 !important;
        }
        
        .klite-mobile .klite-action-btn {
            height: 19px !important;
            font-size: 12px !important;
            flex: 1 !important;
            border: 1px solid var(--border) !important;
            padding-top: 0px !important;
        }
        
        /* Mobile info area - make space for action buttons */
        .klite-mobile .klite-info {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 8px !important;
            padding-right: 4px !important;
            font-size: 11px !important;
            background: transparent !important;
        }
        
        .klite-mobile .klite-info span:first-child {
            flex: 1 !important;
        }
        
        .klite-mobile .klite-info span:last-child {
            flex: 1 !important;
            text-align: right !important;
        }
        
        .klite-mobile .klite-mobile-btn {
            width: 32px !important;
            min-width: 32px !important;
            height: 25px !important;
            padding: 0 !important;
            font-size: 14px !important;
        }
        
        /* Mobile - keep quick buttons and edit button visible */
        
        /* Mobile panel fullscreen display - only when not collapsed */
        .klite-mobile .klite-panel-left:not(.collapsed),
        .klite-mobile .klite-panel-right:not(.collapsed) {
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 32768 !important;
        }
        
        /* Mobile collapsed panels - override fullscreen when collapsed */
        .klite-mobile .klite-panel-left.collapsed {
            transform: translateX(-100%) !important;
        }
        
        .klite-mobile .klite-panel-right.collapsed {
            transform: translateX(100%) !important;
        }
        
        /* Mobile expanded panels - no transform when not collapsed */
        .klite-mobile .klite-panel-left:not(.collapsed) {
            transform: translateX(0) !important;
        }
        
        .klite-mobile .klite-panel-right:not(.collapsed) {
            transform: translateX(0) !important;
        }
        
        /* Hide desktop-specific elements in mobile */
        .klite-mobile .klite-tabs {
            display: none !important;
        }
        
        /* Hide left/right panel handles in mobile but keep top handle */
        .klite-mobile .klite-panel-left .klite-handle,
        .klite-mobile .klite-panel-right .klite-handle {
            display: none !important;
        }
        
        /* Default state: Show desktop buttons, hide mobile buttons */
        .klite-desktop-quick-buttons,
        .klite-desktop-mode-buttons {
            display: flex;
        }
        
        .klite-desktop-edit-btn {
            display: block;
        }
        
        .klite-mobile-quick-buttons,
        .klite-mobile-edit-btn {
            display: none !important;
        }
        
        /* Mobile mode: Hide desktop buttons, show mobile buttons */
        .klite-mobile .klite-desktop-quick-buttons,
        .klite-mobile .klite-desktop-mode-buttons {
            display: none !important;
        }
        
        .klite-mobile .klite-desktop-edit-btn {
            display: none !important;
        }
        
        .klite-mobile .klite-mobile-quick-buttons {
            display: flex !important;
        }
        
        .klite-mobile .klite-mobile-edit-btn {
            display: block !important;
            height: 30px !important;
            width: 64px !important;
            bottom: 155px !important;
        }
        
        /* Mobile content adjustments */
        .klite-mobile .klite-content {
            padding-top: 20px !important;
        }
        
        /* Quick buttons positioning for mobile */
        .klite-mobile .klite-quick-btn {
            width: 30px !important;
            height: 30px !important;
            font-size: 14px !important;
        }
        
        /* Ensure active state works in mobile mode */
        .klite-mobile .klite-quick-btn.active {
            background: var(--success) !important;
            color: white !important;
        }
        
        /* Mobile quick button container positioning */
        .klite-mobile .klite-mobile-quick-buttons {
            bottom: 155px !important;
        }
        
        /* Connection info repositioning for mobile */
        .klite-mobile .klite-info {
            font-size: 12px !important;
        }
        
        .klite-mobile .klite-info span:has(#prompt-tokens),
        .klite-mobile .klite-info span:has(#story-tokens) {
            display: none !important; /* Hide token counter text in mobile */
        }
        
        .klite-mobile .klite-info span:last-child {
            text-align: left !important; /* Left align connection/queue/timer */
        }
        
        /* Mobile navigation button theme integration */
        .klite-mobile-nav-btn {
            background: var(--primary) !important;
            border: 1px solid var(--border) !important;
        }
        
        .klite-mobile-nav-btn:hover {
            background: var(--accent) !important;
        }
        
        .klite-mobile-nav-btn:disabled,
        .klite-mobile-nav-btn[style*="opacity: 0.5"] {
            background: var(--muted) !important;
            color: var(--border) !important;
        }
    `;
    
    // =============================================
    // 2. TEMPLATE SYSTEM
    // =============================================
    
    const t = {
        section: (title, content, collapsed = false) => `
            <div class="klite-section ${collapsed ? 'collapsed' : ''}">
                <div class="klite-section-header" data-section="${title}">
                    <span>${title}</span>
                    <span>${collapsed ? '▶' : '▼'}</span>
                </div>
                <div class="klite-section-content">${content}</div>
            </div>
        `,
        
        button: (text, className = '', action = '') => `
            <button class="klite-btn ${className}" ${action ? `data-action="${action}"` : ''}>${text}</button>
        `,
        
        textarea: (id, placeholder = '', value = '') => `
            <textarea id="${id}" class="klite-textarea" placeholder="${placeholder}">${value}</textarea>
        `,
        
        input: (id, placeholder = '', type = 'text', value = '') => `
            <input type="${type}" id="${id}" class="klite-input" placeholder="${placeholder}" value="${value}">
        `,
        
        select: (id, options) => `
            <select id="${id}" class="klite-select">
                ${options.map(o => `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.text}</option>`).join('')}
            </select>
        `,
        
        checkbox: (id, label, checked = false) => `
            <label style="display: flex; align-items: center; gap: 2px; cursor: pointer;">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span>${label}</span>
            </label>
        `,
        
        row: (content) => `<div class="klite-row">${content}</div>`,
        muted: (text) => `<div class="klite-muted">${text}</div>`,
        
        slider: (id, min, max, value, label = '') => `
            <div>
                ${label ? `<label for="${id}" style="display: block; margin-bottom: 5px; font-size: 12px;">${label}</label>` : ''}
                <input type="range" id="${id}" class="klite-slider" min="${min}" max="${max}" value="${value}">
            </div>
        `
    };
    
    // =============================================
    // 3. MAIN MODULE WITH INTEGRATED PANELS
    // =============================================
    
    window.KLITE_RPMod = {
        version: '40',
        state: {
            tabs: { left: 'PLAY', right: 'MEMORY' },
            collapsed: { left: false, right: false, top: false },
            generating: false,
            adventureMode: 0, // Default adventure sub-mode (0=story, 1=action, 2=dice)
            fullscreen: false,
            tabletSidepanel: false,
            // Mobile mode state
            mobile: {
                enabled: false,
                currentIndex: 5, // Start at Main view (index 5)
                sequence: ['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP', 'MAIN', 'CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
            }
        },
        
        // Shared data
        characters: [],
        worldInfo: [],
        
        // Mobile mode configuration
        mobileIcons: {
            'Me as AI': '👤',
            'AI as me': '🤖', 
            'Narrator': '📖',
            'Story': '✍️',
            'Action': '⚔️',
            'Roll': '🎲',
            'Fallen': '😈',
            'Reject': '🚫',
            'Twist': '🔀'
        },
        
        // Avatar system
        aiAvatarCurrent: null,
        aiAvatarDefault: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAAH/UlEQVRYCc1ZXWwcVxX+ZnZ2dr3e9b8du/Y6dmyHNGliSJzgUiRAogmoEi8Iyk8jxANCbfoQSgXiLUCRoKIQlSaVQOpLWwI8gQRCtXkI0DZNnCAS/9RtfuzYtWuvvbazu7P/M8N3xr9Ze9frNA290u7eOfecc78599xzzz2r4A7aNx4/XakqyU9asA9CsfcCSitgt1CVf0ldjLRR0kZgK/0qlD7L9p7//YtPzC+NF/2jFM1Jxq8/8ctPqyoesYGHYePAVmSh4BIn67Us/O3M6adfL1a2KIBfe/JXXSqsx6j0qwTWUKzyDfkUvE/6nyyor/zhhacubsizhlgQ4IkTJ9SrM4HHuZTfIWPnGrkP3OUqXObS/66jNvoi57HyKcwL8LHjv26wM9YPbNjH8wnfDboC5aTiVp995eT3xLLrmmsdhYRHjz23U7Gsn7L73Y3G7zKt27bsut2HjgwO9vWEc3WvAyiWWwJ3NJf5Q3zuVIGKzoe++NaVt15jBFhttwEUnwtH9Z9w+F5YbhXFYq8TFlxffuRTvWfPnqWLLjYCX22yIT5sn1udbX1P5hYMa0dWAEookd26dvD/0RcMgmV57hWAEufudihZnmQrv4JhKeY6Yo4PygmhKDhBSmArypZ5JVa1V8Zx9IF30d0QQjjpx3zSvTy89V8F2x/oOnx+oK9nzLGgHF8f5ITQNQuH2/rRdSSJri+kcbhjAB7S7rjxtHIwUYEmB7+N+MN3rEwEbQXxmSRu/f1NeWD/EOyVfXhnmuW8J7ZnNScr2eLB79ZdKA14OLMF07SQiSTwxvB+TGhtBGbhWtoPpYz+UqHD5ZJFUhGLJpFNb8GqxCTYuBBMmbbQKqp92NcZRGNTHVxuDSrXYi4UxqWe/6L37YRjuW33V+DzR/ajqq4KFl/AzJoYG5/C4JVxLIQTRc8m2LTFfK44GU+Jhk8c2I6DBztpnRoKLa6jsltFW+fH8G7/kKNo597dqKmsA7KrFmtqbkSJV8e5f1+FEUsVNyFzTW0p2dxUgLsc27aVY3tLE/xlVVw0mymeNBsWLVRbXof6z93nUMxsluBM8khTyGEjUFaJpuZ6VNdOIm6kivRRpZUA7RZHzyZfChGWlHrgK/VBp19FUyau0q90VcEOvwdetw0zlXG0kIRk1sYNWipFI3f4dZR73JQt5ccL0WUXtYvsFgJcSdMLQnRzQ+g2raLYmIxn8PxEDCnQUgSwxzDxaEMpQS7azMiY+OP7MQwkU1BcCtzzaRxv9MNFWbeZgejiSMH5lgb9AnDTpllZdI0NYodnBrHILvw17sNN7tbTbdV4J5HFSxNRdMxmsadSlxXFUDiFC3yJbwcrcD/99tjIHF6dvIUvpW+hc3QAgdEpXGjag6y6+fTCIemNtxBKlReJpmwMpT4dw5PTmI7MoDvgx759QfgTC+i5OoyxujI0DoWcpRsL1KFxOoIDwS60+Xx4cOwSRm/FMFJmYSfdpMmM4SJ1LjlpoaljBOjcvmRL5m0mR25QW0k8iamZMNp1P964OIpT9Ku5qIHIe+P0xWrUn/sXFMuG/tBnEJ2g1f6poKbcj74LA+juqMPkjAHTSCJBXaJz86aMEiCvhsBK9rCRkMlJ+8duMqbF4G0IojYYQEuNF38+/x/6nQvNDVXwvj0I6+aoIy792mAb+q5dRzKTRXN1Cdz0z6mpBYxe6Yc6EYbZuH+jqXJo9ogm91bGwq/kjOQ82jAMA9FpE74IPSJiwMMJWxi0XZqLgTiL8bkIerQSyimYYj97XxaNVT6GoCxUbpQQZWYpmwjNwh9PwCW7a7NGbJpzqd6EWXVpqNm5D3HLwHSMC2Qk+E6Mg4qK9Nw8UvNhvJdKYyhQ4QC02VcGh+CprITbH3D8UqKmyPoZwOtqA5inztUwvjFSwabJjR9q/BIx5r2I21QWbfs4YqkFTMVT0OlHvI0hm0kjaMzgwWANbgy/g+aOHc5MY9dvYEewAVcmZjBuKtA0t+QTmGKArm3chYi/FqKzYONF37K851UpR1C2txCzLEbK5UaCwdfgRplLZxBKphEiUN3jRW1bO0pLPKhpaXU+0heajIVoNeGdo1WNRBKm6kZa0zdZMyda9Qo25zWkHMHV+halClYNvHzrDEFFeIwpTBIsjwfnGO+G//IP5+h687XXF9+Tb3SOtIXyGiQJVo5F8OXSDNweLzOdQtaQMVYfBJN0nYxaMte9hw4H+dwtxHzNy7ASioSR4FGl+0odkKbuRay8GjGetUZZNT9Vi33STN2zcqwZs7Pwxgx0VDdAs2+7TK6fTsFLZ049/VsZWHEEqZUosD7Lt8tb4ihxedBRUY/LI9cxOxOCxiCsuGSytTYRh1h+ZppgmsjE4/BwqXc10xU0L303fxSk9GWbWASctGVNzsM3jz13jCpfcB7yfNk8T8PGAq5NjiLDEKO63c5uvl0ThTmTJK9WJgOdaVdHUysqS8q5+/MoXiJz8z356qnvn1rmWrGgEKSQw3tpO0Hmrcco3I41vkpUtDJ8UEYyk0JNshbh0GTXbg7upGBYq2+ddil9WBnzF2Q6upbxHvRfVt2uH+YWkdZ5q9RGpJDDxEmibl5/vMuAX2ZceObMb566lat3HUBhkCqTFHIY6mW84M7OVbjVZym/0XI/3gic6NoQoAyIJaWQMxf3zNB1GukL9UK/W406pYD5DH3uZ8///EfRfHrX+eBGjB/ZEnAu2I9sET0X6L38G+J/l15BUb3szcMAAAAASUVORK5CYII=', // The robot emoji
        userAvatarCurrent: null,
        userAvatarDefault: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAAFoElEQVRYCc1ZPWwcRRT+Znbv/2KfCY5tCRNb/HSIIgQaCpoI5PSpQFQpQEgBIoWGwgUNSEDSQOEyVPS2QGkjJAiRQNCAhBLjSIfy5zvf+W5vb3eG92Z371bru2T3cEzG2pvdN2/e+/bNvDdvnwUmaKe/2pzRffmKhj4ptHgB0MskZgkCVSNOo039TUDc0EL/JiCuiZz6cf3d49tmPMOPyMCLNy5tviq1PE2ATtG8E1nmEu91AnxFCbX+3bnjV9POTQVw5Yu/X4Il3oTWZ0jwQlrhY/jqEOJb+PqbjQ+f/nkMz4D8QICrq1r+NL31DnGfpeV7cTDrIG40fiUxay83F79eXRVqnMixAF//8s6CLboXNPD+uMkHQScAFz1d+uz7D2bro+SNBLjy+V/PQ9of01K8NWrSgdO0vgzlfbJx/pk/k7JlksCWO1RwDIANQQYxuhOA9gDkPcfLemiWi4MhkKybMcTJex7YIR71nosrT96z7tApB0MDgCaUsLf+/+1siMUgGQA0ce6gQ8kkL8sYOOaGzXhxcEJQ8JwgCEuSUKsKzD8BVPN9I7bbt/HPtsD9loY/NsJFEEb2dSX0GT5xbB4Oj6/MJ4QlNRamPcyVd6B223CavtFmSwvHK2VUc1O4tZ1H3x8ZzUYiC4kLASZcFebgd8UVGsh6tmKm5GKxeg/a7ZDjU0oQSte02zX9yHwRdecobreLDwIzbuy6yOtTkrOSScCx1FqOLNfrGDBaaSgCpahncPznu13UrCaBJ8TZ2wnGZpuUKftk2MJH3m9BIVhWIyIyIT+EmCzRQl7U0NOFzFoYmx3mc5knS+1Cew4Ue4lBE6GLW0uQNX1YyiGe7AAZGzmJSTYzA7SkouX0CUAC3whJ7Exk6gmaXmYvXppgJqpWG8G+CzVHBowLY/DkPEfsNlpuLT6S9n7JNml6fFVSTu20mihR3CP90XYzMxlnJM5gJobddgMoPZVScoyNPiFMHIyRUt92xCxKzjZKBctYUocWpF1Hyx48CNqf/b6HHcynlptktEkef+BkDlS6UMPuTgE5yzFhZY/ZzNLS6iqJdo9UTM0l9aZ7Jmx8Ft9Mx53kEnCsWXS6LhSdZ77vB5cX9Exzuj105JOEdHjkJ6U85PkmzRQ3HsI0dlgVZ9H0Z9Dt9QmcB88LLgbbc/toeFNQpcwnaEyfuCH5uzVGyXQrrDzUkWV0VZXADa3IQLt+Eaq6BGFnj38RCMZm80f10O+iofS9zFfA+9HrkKcOThUBVTgCkQ++49NL28vJ2CR/8ROZPqonaxyw8xbvOw8+7z9zebCJZltRwJlI9nXGJoNyhMlmUkuxLKBSljh2VGO+ehd2rw6/78YcxYPl3sUcZTrMU6lI8JxsTVxhbCYOcjmCNuPbJGDsjpaUkZRyDip2C3DuoX+viVZrB932Lu0QSq0k+xtJCENMp9lA55cfUKhWUJyapheahijNYNefRqdfoMzngZ5NCata5xcKwyuwcmnrIik6x8Rk4+Bb1HeB5h/o3r8NjzyUm8kBLWn6CJjpzSBh5dRLqSBOEs3K2SjPzELUnkNXzhHrGJBCXNo4t2gKBsOThGolBPc1uvaVOIS3Sxb7HU7jDqumsDYUbEAMUJnhvT+cyPJ5SI33587tOoqOC3GsBG2POJ+5JKIIS9gGmsJCzlo0EO/91i1K5+8MLGESUk5KM16RzF7rPvzGZvSY7NfiRaWhBYmNCznXalvP0jYy5o1mOj0KvGqKjEuW+E+OGUjkF8u7QDlSEPYk/eJJwrARowe2jxG4/GCh8ymty+HUZSLdVJ/xUf4oWUQaLHHEZxiokEPrdzmiPfI+LB4lwbHefRaMwDwu5bd9FowA8tucbCyepz33Hl1cbDzYxjJJNusYZblI2VgLRgzcP7Yl4DhIvn9si+hJoIf5b4h/AQQEqIODkoUZAAAAAElFTkSuQmCC',
        groupAvatars: new Map(), // Map character ID -> avatar URL for group chat
        
        // =============================================
        // UNIFIED GENERATION CONTROL SYSTEM
        // =============================================
        
        generationControl: {
            currentPreset: null,
            panels: ['story', 'adv', 'rp', 'chat'],
            currentSettings: {},
            
            // Preset definitions using parameters from KoboldAI Lite
            presets: {
                precise: {
                    name: 'Precise',
                    temperature: 0.2,
                    top_p: 0.9,
                    top_k: 20,
                    min_p: 0.05,
                    rep_pen: 1.05,
                    rep_pen_range: 1024,
                    rep_pen_slope: 0.5
                },
                koboldai: {
                    name: 'KoboldAI',
                    temperature: 0.7,
                    top_p: 0.9,
                    top_k: 0,
                    min_p: 0.0,
                    rep_pen: 1.1,
                    rep_pen_range: 1024,
                    rep_pen_slope: 0.7
                },
                creative: {
                    name: 'Creative',
                    temperature: 1.2,
                    top_p: 0.85,
                    top_k: 50,
                    min_p: 0.02,
                    rep_pen: 1.05,
                    rep_pen_range: 512,
                    rep_pen_slope: 0.7
                },
                chaotic: {
                    name: 'Chaotic',
                    temperature: 1.8,
                    top_p: 0.8,
                    top_k: 80,
                    min_p: 0.01,
                    rep_pen: 1.02,
                    rep_pen_range: 256,
                    rep_pen_slope: 0.9
                }
            },
            
            // Convert between slider values (0-100) and actual parameters
            sliderToParam: {
                creativity: {
                    temperature: (value) => 0.5 + (value / 100) * 1.5, // Range 0.5-2.0
                    top_p: (value) => 0.85 + (value / 100) * 0.14 // Range 0.85-0.99
                },
                focus: {
                    top_k: (value) => Math.round(10 + (value / 100) * 90), // Range 10-100
                    min_p: (value) => 0.01 + (value / 100) * 0.09 // Range 0.01-0.10
                },
                repetition: {
                    rep_pen: (value) => 1.0 + (value / 100) * 0.5, // Range 1.0-1.5
                    rep_pen_range: (value) => Math.round(256 + (value / 100) * 1792), // Range 256-2048
                    rep_pen_slope: (value) => 0.1 + (value / 100) * 0.9 // Range 0.1-1.0
                }
            },
            
            paramToSlider: {
                creativity: (temp) => Math.round(((temp - 0.5) / 1.5) * 100),
                focus: (top_k) => Math.round(((top_k - 10) / 90) * 100),
                repetition: (rep_pen) => Math.round(((rep_pen - 1.0) / 0.5) * 100)
            },
            
            // Initialize the generation control system
            init() {
                // Setup event delegation for all sliders and buttons
                this.setupEventHandlers();
                
                KLITE_RPMod.log('generation', 'Generation control system initialized');
            },
            
            // Setup event handlers using delegation
            setupEventHandlers() {
                // Use event delegation on the container
                document.addEventListener('input', (e) => {
                    if (e.target.matches('[id$="-creativity-slider"]')) {
                        this.updateFromSlider('creativity', parseInt(e.target.value));
                    } else if (e.target.matches('[id$="-focus-slider"]')) {
                        this.updateFromSlider('focus', parseInt(e.target.value));
                    } else if (e.target.matches('[id$="-repetition-slider"]')) {
                        this.updateFromSlider('repetition', parseInt(e.target.value));
                    } else if (e.target.matches('[id$="-max-length"]')) {
                        const value = parseInt(e.target.value);
                        this.updateFromSlider('max_length', value);
                        // Update the display for this specific slider
                        const panelPrefix = e.target.id.split('-')[0];
                        const valueElement = document.getElementById(`${panelPrefix}-max-length-value`);
                        if (valueElement) {
                            valueElement.textContent = `${value} tokens`;
                        }
                    }
                });
            },
            
            // Load current settings from KoboldAI Lite
            loadFromLite() {
                if (!window.localsettings) return;
                
                this.currentSettings = {
                    temperature: window.localsettings.temperature || 0.7,
                    top_p: window.localsettings.top_p || 0.9,
                    top_k: window.localsettings.top_k || 0,
                    min_p: window.localsettings.min_p || 0.0,
                    rep_pen: window.localsettings.rep_pen || 1.1,
                    rep_pen_range: window.localsettings.rep_pen_range || 1024,
                    max_length: window.localsettings.max_length || 512
                };
            },
            
            // Save settings to KoboldAI Lite and sync all panels
            saveToLite(settings) {
                if (!window.localsettings) return;
                
                // Update KoboldAI Lite settings
                Object.assign(window.localsettings, settings);
                
                // Save to localStorage
                if (window.save_settings) {
                    window.save_settings();
                }
                
                // Sync all panels
                this.syncAllPanels();
                
                KLITE_RPMod.log('generation', 'Settings saved to Lite and synced to all panels');
            },
            
            // Apply a preset and sync to all panels
            applyPreset(presetName) {
                const preset = this.presets[presetName];
                if (!preset) return;
                
                // Apply ALL 7 settings directly to KoboldAI Lite localsettings
                if (window.localsettings) {
                    // Creativity parameters
                    window.localsettings.temperature = preset.temperature;
                    window.localsettings.top_p = preset.top_p;
                    // Focus parameters  
                    window.localsettings.top_k = preset.top_k;
                    window.localsettings.min_p = preset.min_p;
                    // Repetition parameters
                    window.localsettings.rep_pen = preset.rep_pen;
                    window.localsettings.rep_pen_range = preset.rep_pen_range;
                    window.localsettings.rep_pen_slope = preset.rep_pen_slope;
                    window.save_settings?.();
                }
                
                // Sync all panels to reflect new preset
                this.syncAllPanels();
                
                KLITE_RPMod.log('generation', `Applied preset: ${preset.name}`);
            },
            
            // Update settings from a single slider
            updateFromSlider(sliderType, value) {
                if (!window.localsettings) return;
                
                switch(sliderType) {
                    case 'creativity':
                        window.localsettings.temperature = this.sliderToParam.creativity.temperature(value);
                        window.localsettings.top_p = this.sliderToParam.creativity.top_p(value);
                        break;
                    case 'focus':
                        window.localsettings.top_k = this.sliderToParam.focus.top_k(value);
                        window.localsettings.min_p = this.sliderToParam.focus.min_p(value);
                        break;
                    case 'repetition':
                        window.localsettings.rep_pen = this.sliderToParam.repetition.rep_pen(value);
                        window.localsettings.rep_pen_range = this.sliderToParam.repetition.rep_pen_range(value);
                        window.localsettings.rep_pen_slope = this.sliderToParam.repetition.rep_pen_slope(value);
                        break;
                    case 'max_length':
                        window.localsettings.max_length = value;
                        break;
                }
                
                window.save_settings?.();
                
                // Update displays immediately
                this.updateDisplaysOnly();
                
                KLITE_RPMod.log('generation', `Updated ${sliderType} to ${value}`);
            },
            
            
            // Update parameter displays in real-time
            updateParameterDisplays(panelPrefix, temp, topP, topK, minP, repPen, repPenRange, repPenSlope, maxLength) {
                // Update all parameter displays
                const tempDisplay = document.getElementById(`${panelPrefix}-temp-val`);
                const toppDisplay = document.getElementById(`${panelPrefix}-topp-val`);
                const topkDisplay = document.getElementById(`${panelPrefix}-topk-val`);
                const minpDisplay = document.getElementById(`${panelPrefix}-minp-val`);
                const repenDisplay = document.getElementById(`${panelPrefix}-repen-val`);
                const maxLengthDisplay = document.getElementById(`${panelPrefix}-max-length-value`);
                
                if (tempDisplay) tempDisplay.textContent = temp.toFixed(2);
                if (toppDisplay) toppDisplay.textContent = topP.toFixed(3);
                if (topkDisplay) topkDisplay.textContent = topK.toString();
                if (minpDisplay) minpDisplay.textContent = minP.toFixed(3);
                if (repenDisplay) repenDisplay.textContent = repPen.toFixed(2);
                if (maxLengthDisplay) maxLengthDisplay.textContent = `${maxLength} tokens`;
            },
            
            // Determine which preset is currently active (if any)
            updateCurrentPreset() {
                this.loadFromLite();
                
                for (const [name, preset] of Object.entries(this.presets)) {
                    const matches = ['temperature', 'top_k', 'rep_pen'].every(param => 
                        Math.abs(this.currentSettings[param] - preset[param]) < 0.01
                    );
                    
                    if (matches) {
                        this.currentPreset = name;
                        return;
                    }
                }
                
                this.currentPreset = null; // Custom settings
            },
            
            // Update only the displays without touching sliders
            updateDisplaysOnly() {
                if (!window.localsettings) return;
                
                const settings = {
                    temperature: window.localsettings.temperature || 0.7,
                    top_p: window.localsettings.top_p || 0.9,
                    top_k: window.localsettings.top_k || 0,
                    min_p: window.localsettings.min_p || 0.0,
                    rep_pen: window.localsettings.rep_pen || 1.1,
                    rep_pen_range: window.localsettings.rep_pen_range || 1024,
                    rep_pen_slope: window.localsettings.rep_pen_slope || 0.7,
                    max_length: window.localsettings.max_length || 512
                };
                
                // Update parameter displays only
                document.querySelectorAll('[id$=\"-temp-val\"]').forEach(el => {
                    if (el) el.textContent = settings.temperature.toFixed(2);
                });
                document.querySelectorAll('[id$=\"-topp-val\"]').forEach(el => {
                    if (el) el.textContent = settings.top_p.toFixed(2);
                });
                document.querySelectorAll('[id$=\"-topk-val\"]').forEach(el => {
                    if (el) el.textContent = settings.top_k;
                });
                document.querySelectorAll('[id$=\"-minp-val\"]').forEach(el => {
                    if (el) el.textContent = settings.min_p.toFixed(3);
                });
                document.querySelectorAll('[id$=\"-repen-val\"]').forEach(el => {
                    if (el) el.textContent = settings.rep_pen.toFixed(2);
                });
                document.querySelectorAll('[id$=\"-max-length-value\"]').forEach(el => {
                    if (el) el.textContent = settings.max_length + ' tokens';
                });
                
                // Update all panel repetition range and slope displays
                document.querySelectorAll('[id$="-rng-val"]').forEach(el => {
                    if (el) el.textContent = settings.rep_pen_range;
                });
                document.querySelectorAll('[id$="-slp-val"]').forEach(el => {
                    if (el) el.textContent = settings.rep_pen_slope.toFixed(1);
                });
                
            },
            
            
            // Sync all panels with current settings
            syncAllPanels() {
                ['rp', 'story', 'adv', 'chat'].forEach(panelPrefix => {
                    this.syncPanel(panelPrefix);
                });
            },
            
            // Sync a specific panel with current settings
            syncPanel(panelPrefix) {
                // Load current settings from KoboldAI Lite localsettings
                const currentTemp = window.localsettings?.temperature || 0.7;
                const currentTopP = window.localsettings?.top_p || 0.9;
                const currentTopK = window.localsettings?.top_k || 40;
                const currentMinP = window.localsettings?.min_p || 0.05;
                const currentRepPen = window.localsettings?.rep_pen || 1.1;
                const currentRepPenRange = window.localsettings?.rep_pen_range || 1024;
                const currentRepPenSlope = window.localsettings?.rep_pen_slope || 0;
                const currentMaxLength = window.localsettings?.max_length || 512;
                
                // Convert to slider values using correct inverse calculations
                const creativityValue = this.paramToSlider.creativity(currentTemp);
                const focusValue = this.paramToSlider.focus(currentTopK);
                const repetitionValue = this.paramToSlider.repetition(currentRepPen);
                
                // Update sliders
                const creativitySlider = document.getElementById(`${panelPrefix}-creativity-slider`);
                const focusSlider = document.getElementById(`${panelPrefix}-focus-slider`);
                const repetitionSlider = document.getElementById(`${panelPrefix}-repetition-slider`);
                const lengthSlider = document.getElementById(`${panelPrefix}-max-length`);
                
                if (creativitySlider) creativitySlider.value = creativityValue;
                if (focusSlider) focusSlider.value = focusValue;
                if (repetitionSlider) repetitionSlider.value = repetitionValue;
                if (lengthSlider) lengthSlider.value = currentMaxLength;
                
                // Update parameter displays
                this.updateParameterDisplays(panelPrefix, currentTemp, currentTopP, currentTopK, currentMinP, currentRepPen, currentRepPenRange, currentRepPenSlope, currentMaxLength);
                
                // Update preset buttons
                this.updatePresetButtons(panelPrefix);
            },
            
            // Update preset button states
            updatePresetButtons(panelPrefix) {
                // Preset buttons don't need visual highlighting
                // They apply settings when clicked without needing to show active state
            },
            
        },
        
        // Shared Generation Control HTML
        renderGenerationControl(panelPrefix = 'rp') {
            // Load current settings from KoboldAI Lite localsettings
            const currentTemp = window.localsettings?.temperature || 0.7;
            const currentTopP = window.localsettings?.top_p || 0.9;
            const currentTopK = window.localsettings?.top_k || 40;
            const currentMinP = window.localsettings?.min_p || 0.05;
            const currentRepPen = window.localsettings?.rep_pen || 1.1;
            const currentRepPenRange = window.localsettings?.rep_pen_range || 1024;
            const currentRepPenSlope = window.localsettings?.rep_pen_slope || 0;
            const currentMaxLength = window.localsettings?.max_length || 512;
            const maxContextLength = window.localsettings?.max_context_length_slide || 8192;
            
            // Convert to slider values using correct inverse calculations
            const creativityValue = this.generationControl.paramToSlider.creativity(currentTemp);
            const focusValue = this.generationControl.paramToSlider.focus(currentTopK);
            const repetitionValue = this.generationControl.paramToSlider.repetition(currentRepPen);
            
            
            return `
                <div class="klite-generation-control">
                    <!-- Quick Presets -->
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 15px;">
                        ${['precise', 'koboldai', 'creative', 'chaotic'].map(p => 
                            t.button(p.charAt(0).toUpperCase() + p.slice(1), '', `preset-${p}`)
                        ).join('')}
                    </div>
                    
                    <!-- Slider Controls with detailed parameter info -->
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Creativity</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">temp: <span id="${panelPrefix}-temp-val">${currentTemp.toFixed(2)}</span> | top_p: <span id="${panelPrefix}-topp-val">${currentTopP.toFixed(2)}</span></span>
                        </div>
                        <input type="range" id="${panelPrefix}-creativity-slider" class="klite-slider" 
                               min="0" max="100" value="${creativityValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Conservative</span>
                            <span style="font-size: 10px; color: #888;">Creative</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Focus</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">top_k: <span id="${panelPrefix}-topk-val">${currentTopK}</span> | min_p: <span id="${panelPrefix}-minp-val">${currentMinP.toFixed(3)}</span></span>
                        </div>
                        <input type="range" id="${panelPrefix}-focus-slider" class="klite-slider" 
                               min="0" max="100" value="${focusValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Broad</span>
                            <span style="font-size: 10px; color: #888;">Focused</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Repetition</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">pen: <span id="${panelPrefix}-repen-val">${currentRepPen.toFixed(2)}</span> | rng: <span id="${panelPrefix}-rng-val">${currentRepPenRange}</span> | slp: <span id="${panelPrefix}-slp-val">${currentRepPenSlope.toFixed(1)}</span></span>
                        </div>
                        <input type="range" id="${panelPrefix}-repetition-slider" class="klite-slider" 
                               min="0" max="100" value="${repetitionValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Repetitive</span>
                            <span style="font-size: 10px; color: #888;">Varied</span>
                        </div>
                    </div>
                    
                    <div class="klite-max-length-control" style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <label style="font-size: 12px; color: var(--text);">Response Max Length</label>
                            <span id="${panelPrefix}-max-length-value" style="font-size: 11px; color: var(--muted); font-family: monospace;">${currentMaxLength} tokens</span>
                        </div>
                        <input type="range" 
                               id="${panelPrefix}-max-length" 
                               class="klite-slider" 
                               min="256" 
                               max="${maxContextLength}" 
                               step="256" 
                               value="${currentMaxLength}" 
                               style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">256</span>
                            <span style="font-size: 10px; color: #888;">${maxContextLength}</span>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Shared slider update methods
        updateSettingsFromSlider(key, value) {
            if (!window.localsettings) return;
            
            const normalizedValue = value / 100;
            
            switch(key) {
                case 'creativity':
                    localsettings.temperature = 0.5 + normalizedValue * 1.5;
                    localsettings.top_p = 0.85 + normalizedValue * 0.14;
                    break;
                case 'focus':
                    localsettings.top_k = Math.round(10 + normalizedValue * 90);
                    localsettings.min_p = 0.01 + normalizedValue * 0.09;
                    break;
                case 'repetition':
                    localsettings.rep_pen = 1.0 + normalizedValue * 0.5;
                    localsettings.rep_pen_range = Math.round(256 + normalizedValue * 1792);
                    localsettings.rep_pen_slope = 0.1 + normalizedValue * 0.9;
                    break;
            }
            
            // Synchronize all other panels after update
            this.syncAllSliders();
        },
        
        // Update slider display values
        updateSliderDisplays(key, value, panel) {
            const normalizedValue = value / 100;
            
            switch(key) {
                case 'creativity':
                    const temp = 0.5 + normalizedValue * 1.5;
                    const topP = 0.85 + normalizedValue * 0.14;
                    
                    const tempEl = document.getElementById(`${panel}-temp-val`);
                    const toppEl = document.getElementById(`${panel}-topp-val`);
                    if (tempEl) tempEl.textContent = temp.toFixed(2);
                    if (toppEl) toppEl.textContent = topP.toFixed(3);
                    break;
                    
                case 'focus':
                    const topK = Math.round(10 + normalizedValue * 90);
                    const minP = 0.01 + normalizedValue * 0.09;
                    
                    const topkEl = document.getElementById(`${panel}-topk-val`);
                    const minpEl = document.getElementById(`${panel}-minp-val`);
                    if (topkEl) topkEl.textContent = topK;
                    if (minpEl) minpEl.textContent = minP.toFixed(3);
                    break;
                    
                case 'repetition':
                    const repPen = 1.0 + normalizedValue * 0.5;
                    const repRange = Math.round(256 + normalizedValue * 1792);
                    const repSlope = 0.1 + normalizedValue * 0.9;
                    
                    // Handle different ID patterns for RP panel vs others
                    const repEl = panel === 'rp' ? 
                        document.getElementById(`${panel}-rep-val`) : 
                        document.getElementById(`${panel}-repen-val`);
                    const rngEl = document.getElementById(`${panel}-rng-val`);
                    const slpEl = document.getElementById(`${panel}-slp-val`);
                    
                    if (repEl) repEl.textContent = repPen.toFixed(2);
                    if (rngEl) rngEl.textContent = repRange;
                    if (slpEl) slpEl.textContent = repSlope.toFixed(1);
                    break;
            }
        },
        
        // Synchronize all slider displays across all panels
        syncAllSliders() {
            const panels = ['story', 'adv', 'rp', 'chat'];
            const sliders = ['creativity', 'focus', 'repetition'];
            
            panels.forEach(panel => {
                sliders.forEach(slider => {
                    const sliderId = `${panel}-${slider}-slider`;
                    const sliderEl = document.getElementById(sliderId);
                    if (sliderEl) {
                        const value = this.getSliderValueFromSettings(slider);
                        sliderEl.value = value;
                        this.updateSliderDisplays(slider, value, panel);
                    }
                });
            });
        },
        
        // Get slider value from current localsettings
        getSliderValueFromSettings(key) {
            const settings = window.localsettings;
            if (!settings) return 50;
            
            switch(key) {
                case 'creativity':
                    const temp = settings.temperature || 0.7;
                    return Math.round(((temp - 0.5) / 1.5) * 100);
                case 'focus':
                    const topK = settings.top_k || 40;
                    return Math.round(((topK - 10) / 90) * 100);
                case 'repetition':
                    const repPen = settings.rep_pen || 1.1;
                    return Math.round(((repPen - 1.0) / 0.5) * 100);
                default:
                    return 50;
            }
        },
        
        // Setup unified slider event handlers for all panels
        setupUnifiedSliders() {
            const panels = ['story', 'adv', 'rp', 'chat'];
            const sliders = ['creativity', 'focus', 'repetition'];
            
            panels.forEach(panel => {
                sliders.forEach(slider => {
                    const sliderId = `${panel}-${slider}-slider`;
                    const sliderEl = document.getElementById(sliderId);
                    if (sliderEl) {
                        sliderEl.addEventListener('input', e => {
                            const value = parseInt(e.target.value);
                            this.updateSettingsFromSlider(slider, value);
                            window.save_settings?.();
                        });
                    }
                });
                
                // Max length slider for each panel
                const maxLengthEl = document.getElementById(`${panel}-max-length`);
                if (maxLengthEl) {
                    maxLengthEl.addEventListener('input', e => {
                        const value = parseInt(e.target.value);
                        if (window.localsettings) {
                            window.localsettings.max_length = value;
                        }
                        const displayEl = document.getElementById(`${panel}-max-length-val`);
                        if (displayEl) displayEl.textContent = value;
                        window.save_settings?.();
                    });
                }
            });
        },
        
        
        // Hotkey system configuration
        hotkeys: {
            // Core Generation Actions
            'Ctrl+Shift+Enter': { action: 'submit_generation', description: 'Submit/Generate' },
            'Ctrl+Shift+R': { action: 'retry_generation', description: 'Retry/Regenerate' },
            'Ctrl+Shift+Z': { action: 'undo_generation', description: 'Undo/Back' },
            'Ctrl+Shift+Y': { action: 'redo_generation', description: 'Redo/Forward' },
            'Ctrl+Shift+A': { action: 'abort_generation', description: 'Abort Generation' },
            
            // UI Control (CRITICAL)
            'Ctrl+Shift+U': { action: 'hotswap_ui', description: 'Toggle RPmod ↔ Lite UI' },
            'Ctrl+Shift+E': { action: 'toggle_edit_mode', description: 'Toggle Edit Mode' },
            
            // Panel Navigation
            'Ctrl+Shift+P': { action: 'switch_panel_play', description: 'Switch to PLAY Panel' },
            'Ctrl+Shift+C': { action: 'switch_panel_chars', description: 'Switch to CHARS Panel' },
            'Ctrl+Shift+M': { action: 'switch_panel_memory', description: 'Switch to MEMORY Panel' },
            'Ctrl+Shift+W': { action: 'switch_panel_wi', description: 'Switch to WORLD INFO Panel' },
            'Ctrl+Shift+S': { action: 'switch_panel_scene', description: 'Switch to SCENE Panel' },
            'Ctrl+Shift+G': { action: 'switch_panel_group', description: 'Switch to GROUP Panel' },
            'Ctrl+Shift+T': { action: 'switch_panel_tools', description: 'Switch to TOOLS Panel' },
            'Ctrl+Shift+N': { action: 'switch_panel_notes', description: 'Switch to NOTES Panel' },
            'Ctrl+Shift+D': { action: 'switch_panel_textdb', description: 'Switch to TEXTDB Panel' },
            'Ctrl+Shift+H': { action: 'switch_panel_help', description: 'Switch to HELP Panel' },
            
            // Panel Toggle (Left/Right panels)
            'Ctrl+Shift+L': { action: 'toggle_left_panel', description: 'Toggle Left Panel' },
            'Ctrl+Shift+K': { action: 'toggle_right_panel', description: 'Toggle Right Panel' },
            'Ctrl+Shift+I': { action: 'toggle_top_panel', description: 'Toggle Info Panel' },
            
            // Input Focus Management
            'Tab': { action: 'cycle_input_focus', description: 'Cycle Input Focus' },
            'Ctrl+Shift+F': { action: 'focus_main_input', description: 'Focus Main Input' }
        },

        // Debug configuration
        debug: true, // Enable debug mode
        debugLevels: {
            init: true,
            hooks: true,
            panels: true,
            chars: true,
            generation: true,
            state: true,
            integration: true,
            hotkeys: true,
            errors: true,
            chat: true,
            mobile: true,
            status: true
        },
        
        log(category, message, ...args) {
            if (this.debug && this.debugLevels[category]) {
                const prefix = `[KLITE RPMod][${category.toUpperCase()}]`;
                console.log(`${prefix} ${message}`, ...args);
            }
        },
        
        error(message, ...args) {
            if (this.debug) {
                console.error(`[KLITE RPMod][ERROR] ${message}`, ...args);
            }
        },
        
        async init() {
            this.log('init', '🚀 KLITE RP Mod initializing...');
            
            try {
                // Inject CSS
                const style = document.createElement('style');
                style.id = 'klite-rpmod-styles';
                style.textContent = STYLES;
                document.head.appendChild(style);
                this.log('init', 'CSS injected');
                
                // Load state
                await this.loadState();
                this.log('init', 'State loaded:', this.state);
                
                // Initialize storage keys for first-time users
                await this.initializeStorageKeys();
                
                // Load characters
                await this.loadCharacters();
                this.log('init', 'Characters loaded:', this.characters.length);
                
                // Build UI
                this.buildUI();
                this.log('init', 'UI built');
                
                // Initialize mobile mode detection
                this.initializeMobileMode();
                
                // Initialize dynamic buttons
                setTimeout(() => {
                    this.updateGameModeButtons();
                    this.log('init', 'Dynamic buttons initialized');
                }, 200);
                
                // Setup hooks
                this.setupHooks();
                this.log('init', 'Hooks setup complete');
                
                // Initialize generation control system
                setTimeout(() => {
                    this.generationControl.init();
                    this.log('init', 'Generation control system initialized');
                }, 100);
                
                // Initialize hotkey system
                this.initializeHotkeys();
                this.log('init', 'Hotkey system initialized');
                
                // Set startup configuration
                this.setupStartupConfiguration();
                
                // Initialize panels
                this.loadPanel('left', this.state.tabs.left);
                this.loadPanel('right', this.state.tabs.right);
                
                // Sync button states after UI is built and panels loaded
                this.syncTabButtonStates();
                this.log('init', 'Panels initialized and button states synced');
                
                // Restore fullscreen and tablet sidepanel states
                this.restoreUIStates();
                this.log('init', 'UI states restored');
                
                // Start sync
                this.startSync();
                this.log('init', 'Sync started');
                
                // Mark active
                document.body.classList.add('klite-active');
                
                this.log('init', '✅ KLITE RP Mod initialized successfully');
            } catch (error) {
                this.error('Failed to initialize:', error);
                throw error;
            }
        },
        
        setupStartupConfiguration() {
            this.log('init', 'Setting up startup configuration...');
            
            // Read current mode from KoboldAI Lite and sync RPmod to match
            const currentMode = window.localsettings?.opmode || 1;
            this.log('init', `Reading Lite's current mode: ${currentMode} (${this.getMode()})`);
            
            // Update RPmod buttons to match Lite's current mode
            this.updateModeButtons();
            
            // Set default panels
            this.state.tabs.left = 'PLAY';
            this.state.tabs.right = 'CHARS';
            
            this.log('init', `Startup configuration: Synced to Lite's mode ${currentMode} (${this.getMode()})`);
        },
        
        buildUI() {
            this.log('init', 'Building UI structure...');
            
            const container = document.createElement('div');
            container.className = 'klite-container';
            container.id = 'klite-container';
            container.innerHTML = `
                <!-- Top Panel -->
                <div class="klite-panel klite-panel-top ${this.state.collapsed.top ? 'collapsed' : ''}" id="panel-top">
                    <div class="klite-handle" data-panel="top">${this.state.collapsed.top ? '▼' : '▲'}</div>
                    <div id="top-content"></div>
                </div>
                
                <!-- Left Panel -->
                <div class="klite-panel klite-panel-left ${this.state.collapsed.left ? 'collapsed' : ''}" id="panel-left">
                    <div class="klite-handle" data-panel="left">${this.state.collapsed.left ? '▶' : '◀'}</div>
                    <div class="klite-tabs" data-panel="left">
                        ${['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP'].map(t => 
                            `<div class="klite-tab ${t === this.state.tabs.left ? 'active' : ''}" data-tab="${t}">${t}</div>`
                        ).join('')}
                    </div>
                    <div class="klite-content" id="content-left"></div>
                </div>
                
                <!-- Right Panel -->
                <div class="klite-panel klite-panel-right ${this.state.collapsed.right ? 'collapsed' : ''}" id="panel-right">
                    <div class="klite-handle" data-panel="right">${this.state.collapsed.right ? '◀' : '▶'}</div>
                    <div class="klite-tabs" data-panel="right">
                        ${['CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB'].map(t => 
                            `<div class="klite-tab ${t === this.state.tabs.right ? 'active' : ''}" data-tab="${t}">${t}</div>`
                        ).join('')}
                    </div>
                    <div class="klite-content" id="content-right"></div>
                </div>
                
                <!-- maincontent Content -->
                <div class="klite-maincontent ${!this.state.collapsed.top ? 'top-expanded' : ''}" id="maincontent">
                    <div class="klite-chat" id="chat-display"></div>
                    <div class="klite-input-area">
                        <!-- Left buttons -->
                        <div class="klite-left-btns">
                            <!-- Desktop buttons -->
                            <button class="klite-btn klite-bottom-btn klite-desktop-btn" id="btn-1">ME AS AI</button>
                            <button class="klite-btn klite-bottom-btn klite-desktop-btn" id="btn-2">AI AS ME</button>
                            <button class="klite-btn klite-bottom-btn klite-desktop-btn" id="btn-3">NARRATOR</button>
                            
                            <!-- Mobile icon buttons - Story Mode (Mode 1) -->
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-story" id="btn-1-mobile-story" title="Fallen">😈</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-story" id="btn-2-mobile-story" title="Reject">🚫</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-story" id="btn-3-mobile-story" title="Twist">🔀</button>
                            
                            <!-- Mobile icon buttons - Adventure Mode (Mode 2) -->
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-adventure" id="btn-1-mobile-adventure" title="Story">✍️</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-adventure" id="btn-2-mobile-adventure" title="Action">⚔️</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-adventure" id="btn-3-mobile-adventure" title="Roll">🎲</button>
                            
                            <!-- Mobile icon buttons - Chat/RP Mode (Mode 3&4) -->
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-chat" id="btn-1-mobile-chat" title="Me as AI">👤</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-chat" id="btn-2-mobile-chat" title="AI as me">🤖</button>
                            <button class="klite-btn klite-bottom-btn klite-mobile-btn klite-mobile-chat" id="btn-3-mobile-chat" title="Narrator">📖</button>
                        </div>
                        
                        <!-- Input -->
                        <div class="klite-textarea-container" style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                            <textarea id="input" class="klite-textarea" placeholder="Enter your prompt here..." style="min-height: 80px;"></textarea>
                            <div class="klite-info">
                                <span>✍️ <span id="prompt-tokens">0</span> | 🗒️ <span id="story-tokens">0</span></span>
                                <span>🔌 <span id="connection">Disconnected</span> | 💤 <span id="queue">#0</span> | ⏱️ <span id="wait">0s</span></span>
                            </div>
                        </div>
                        
                        <!-- Right buttons -->
                        <div class="klite-right-btns">
                            <button class="klite-btn klite-submit-btn" id="btn-submit">Submit</button>
                            <div class="klite-action-btns">
                                <button class="klite-btn klite-action-btn" data-action="back">↩︎</button>
                                <button class="klite-btn klite-action-btn" data-action="forward">↪︎</button>
                                <button class="klite-btn klite-action-btn" data-action="retry">↻</button>
                            </div>
                        </div>
                        
                        <!-- Original v36 quick buttons (desktop mode) -->
                        <div class="klite-desktop-quick-buttons" style="position: absolute; bottom: 118px; left: 15px; display: flex; gap: 2px;">
                            <button class="klite-btn klite-quick-btn" data-action="context" title="Context">📊</button>
                            <button class="klite-btn klite-quick-btn" data-action="memory" title="Memory">🧠</button>
                            <button class="klite-btn klite-quick-btn" data-action="samplers" title="Open Settings">⚙️</button>
                            <button class="klite-btn klite-quick-btn" data-action="images" title="Images Options">🎨</button>
                            <button class="klite-btn klite-quick-btn" data-action="fullscreen" title="Fullscreen">🖼️</button>
                            <button class="klite-btn klite-quick-btn" data-action="tablet-sidepanel" title="Tablet Sidepanel Mode">↔️</button>
                        </div>
                        
                        <!-- Original v36 edit button (desktop mode) -->
                        <button class="klite-btn klite-desktop-edit-btn" id="btn-edit-desktop" style="position: absolute; bottom: 118px; right: 15px; width: 120px;">✏️ Edit</button>
                        
                        <!-- Original v36 mode buttons (desktop mode) -->
                        <div class="klite-desktop-mode-buttons" style="position: absolute; bottom: 118px; right: 146px; display: flex; gap: 2px;">
                            <button class="klite-btn klite-quick-btn" data-action="mode-1" title="Story Mode">📖</button>
                            <button class="klite-btn klite-quick-btn" data-action="mode-2" title="Adventure Mode">⚔️</button>
                            <button class="klite-btn klite-quick-btn" data-action="mode-3" title="Chat Mode">💬</button>
                            <button class="klite-btn klite-quick-btn active" data-action="mode-4" title="RP Mode">🎭</button>
                        </div>
                        
                        <!-- Mobile-specific buttons (mobile only) -->
                        <div class="klite-mobile-quick-buttons" style="position: absolute; bottom: 90px; left: 48px; gap: 2px;">
                            <button class="klite-btn klite-quick-btn" data-action="mode-1" title="Story Mode">📖</button>
                            <button class="klite-btn klite-quick-btn" data-action="mode-2" title="Adventure Mode">⚔️</button>
                            <button class="klite-btn klite-quick-btn" data-action="mode-3" title="Chat Mode">💬</button>
                            <button class="klite-btn klite-quick-btn active" data-action="mode-4" title="RP Mode">🎭</button>
                            <button class="klite-btn klite-quick-btn" data-action="images" title="Images Options">🎨</button>
                        </div>
                        
                        <button class="klite-btn klite-mobile-edit-btn" id="btn-edit" style="position: absolute; bottom: 90px; right: 48px; width: 40px; height: 40px;">✏️</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(container);
            
            // Event delegation
            container.addEventListener('click', e => this.handleClick(e));
            container.addEventListener('input', e => this.handleInput(e));
            container.addEventListener('change', e => this.handleChange(e));
            
            // Drag events
            container.addEventListener('dragover', e => this.handleDragOver(e));
            container.addEventListener('dragleave', e => this.handleDragLeave(e));
            container.addEventListener('drop', e => this.handleDrop(e));
            
            // Delegate modal events to document for dynamic content
            document.addEventListener('click', e => {
                if (e.target.closest('.klite-modal')) {
                    this.handleModalClick(e);
                }
            });
            
            // Enter key
            document.getElementById('input').addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const enterSubmits = document.getElementById('entersubmit')?.checked ?? true;
                    if (enterSubmits) {
                        e.preventDefault();
                        this.submit();
                    }
                }
            });
            
            this.log('init', 'UI event listeners attached');
        },
        
        // =============================================
        // MOBILE MODE DETECTION AND INITIALIZATION
        // =============================================
        
        initializeMobileMode() {
            this.log('init', 'Initializing mobile mode detection...');
            
            // Detect mobile device - use screen width only (like original CSS)
            const screenWidth = window.innerWidth;
            const isNarrowScreen = screenWidth <= 768; // Mobile mode only below 768px
            
            this.state.mobile.enabled = isNarrowScreen;
            
            this.log('init', `Screen: ${screenWidth}px, Narrow: ${isNarrowScreen}, Mobile enabled: ${this.state.mobile.enabled}`);
            
            if (this.state.mobile.enabled) {
                this.log('init', `Mobile mode enabled - adding mobile class and navigation`);
                document.body.classList.add('klite-mobile');
                this.addMobileNavigationButtons();
                
                // Set initial mode class
                const currentMode = window.localsettings?.opmode || 4;
                this.updateMobileModeClass(currentMode);
            } else {
                this.log('init', `Desktop/iPad mode - using original v36 behavior`);
                // Ensure mobile class is removed if screen size changed
                document.body.classList.remove('klite-mobile');
            }
        },
        
        setupConnectionObserver() {
            const status = document.getElementById('connectstatus');
            if (!status) {
                this.log('init', 'Connection status element not found, retrying in 1s...');
                setTimeout(() => this.setupConnectionObserver(), 1000);
                return;
            }
            
            // Initial update
            this.updateStatus();
            
            // Create observer to watch for connection status changes
            this.connectionObserver = new MutationObserver(() => {
                this.updateStatus();
            });
            
            // Start observing the connection status element
            this.connectionObserver.observe(status, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class'] // Watch for disconnected class changes
            });
            
            this.log('init', 'Connection status observer set up - no more polling!');
        },
        
        handleResize() {
            // Re-check mobile mode on window resize
            const screenWidth = window.innerWidth;
            const shouldBeMobile = screenWidth <= 768;
            const currentlyMobile = this.state.mobile.enabled;
            
            if (shouldBeMobile !== currentlyMobile) {
                this.log('init', `Screen size changed: ${screenWidth}px - switching from ${currentlyMobile ? 'mobile' : 'desktop'} to ${shouldBeMobile ? 'mobile' : 'desktop'} mode`);
                
                this.state.mobile.enabled = shouldBeMobile;
                
                if (shouldBeMobile) {
                    // Switch to mobile mode
                    document.body.classList.add('klite-mobile');
                    this.addMobileNavigationButtons();
                    
                    // Set initial mode class
                    const currentMode = window.localsettings?.opmode || 4;
                    this.updateMobileModeClass(currentMode);
                } else {
                    // Switch to desktop mode
                    document.body.classList.remove('klite-mobile');
                    this.removeMobileNavigationButtons();
                }
                
                // Update submit button text for the new mode
                this.updateSubmitBtn();
            }
            
            // Update tablet sidepanel positioning on any resize
            // This will clean up classes when not in tablet mode
            this.updateTabletSidepanelPositions();
            
            // Update button active states after resize
            this.updateTabletSidepanelButton();
            this.updateFullscreenButton();
        },
        
        removeMobileNavigationButtons() {
            // Remove mobile navigation arrows when switching back to desktop
            const leftArrow = document.getElementById('mobile-nav-left');
            const rightArrow = document.getElementById('mobile-nav-right');
            
            if (leftArrow) {
                leftArrow.remove();
                this.log('init', 'Removed left mobile navigation button');
            }
            if (rightArrow) {
                rightArrow.remove();
                this.log('init', 'Removed right mobile navigation button');
            }
        },
        
        addMobileNavigationButtons() {
            const leftArrow = document.createElement('button');
            leftArrow.className = 'klite-btn klite-mobile-nav-btn klite-mobile-nav-left';
            leftArrow.innerHTML = '◀';
            leftArrow.id = 'mobile-nav-left';
            leftArrow.style.cssText = `
                position: fixed !important;
                left: 8px !important;
                bottom: 155px !important;
                width: 32px !important;
                height: 32px !important;
                z-index: 9999 !important;
                border-radius: 4px !important;
                background: var(--primary) !important;
                color: white !important;
                border: none !important;
                font-size: 16px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            `;
            
            const rightArrow = document.createElement('button');
            rightArrow.className = 'klite-btn klite-mobile-nav-btn klite-mobile-nav-right';
            rightArrow.innerHTML = '▶';
            rightArrow.id = 'mobile-nav-right';
            rightArrow.style.cssText = `
                position: fixed !important;
                right: 8px !important;
                bottom: 155px !important;
                width: 32px !important;
                height: 32px !important;
                z-index: 9999 !important;
                border-radius: 4px !important;
                background: var(--primary) !important;
                color: white !important;
                border: none !important;
                font-size: 16px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            `;
            
            document.body.appendChild(leftArrow);
            document.body.appendChild(rightArrow);
            
            // Add event listeners
            leftArrow.addEventListener('click', () => {
                console.log('[KLITE] Left arrow clicked');
                this.navigateMobilePanel(-1);
            });
            rightArrow.addEventListener('click', () => {
                console.log('[KLITE] Right arrow clicked'); 
                this.navigateMobilePanel(1);
            });
            
            this.updateMobileNavigationButtons();
            this.log('init', 'Mobile navigation buttons added');
        },
        
        navigateMobilePanel(direction) {
            this.log('mobile', `navigateMobilePanel called with direction: ${direction}`);
            const newIndex = this.state.mobile.currentIndex + direction;
            
            // Boundary checks
            if (newIndex < 0 || newIndex >= this.state.mobile.sequence.length) {
                this.log('mobile', `Navigation blocked - at boundary (current: ${this.state.mobile.currentIndex})`);
                return;
            }
            
            this.state.mobile.currentIndex = newIndex;
            const targetPanel = this.state.mobile.sequence[newIndex];
            
            this.log('mobile', `Navigating to panel: ${targetPanel} (index: ${newIndex})`);
            
            if (targetPanel === 'MAIN') {
                // Show main view
                this.showMainView();
            } else {
                // Show panel
                this.showMobilePanel(targetPanel);
            }
            
            this.updateMobileNavigationButtons();
        },
        
        showMainView() {
            // Simple approach: just ensure both panels are collapsed
            if (!this.state.collapsed.left) {
                this.togglePanel('left');
            }
            if (!this.state.collapsed.right) {
                this.togglePanel('right');
            }
            
            // Update status when switching to main view
            this.updateStatus();
            
            this.log('mobile', 'Main view shown');
        },
        
        showMobilePanel(panelName) {
            const leftPanels = ['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP'];
            const rightPanels = ['CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB'];
            
            if (leftPanels.includes(panelName)) {
                // Switch to the correct tab first
                this.switchTab('left', panelName);
                // Ensure left panel is open
                if (this.state.collapsed.left) {
                    this.togglePanel('left');
                }
                // Ensure right panel is closed
                if (!this.state.collapsed.right) {
                    this.togglePanel('right');
                }
                
            } else if (rightPanels.includes(panelName)) {
                // Switch to the correct tab first
                this.switchTab('right', panelName);
                // Ensure right panel is open
                if (this.state.collapsed.right) {
                    this.togglePanel('right');
                }
                // Ensure left panel is closed
                if (!this.state.collapsed.left) {
                    this.togglePanel('left');
                }
            }
            
            // Update status when switching panels
            this.updateStatus();
            
            this.log('mobile', `Panel ${panelName} shown using togglePanel`);
        },
        
        updateMobileNavigationButtons() {
            if (!this.state.mobile.enabled) return;
            
            const leftBtn = document.getElementById('mobile-nav-left');
            const rightBtn = document.getElementById('mobile-nav-right');
            
            if (leftBtn && rightBtn) {
                // Gray out buttons at sequence endpoints
                if (this.state.mobile.currentIndex === 0) {
                    leftBtn.style.opacity = '0.5';
                    leftBtn.style.pointerEvents = 'none';
                } else {
                    leftBtn.style.opacity = '1';
                    leftBtn.style.pointerEvents = 'auto';
                }
                
                if (this.state.mobile.currentIndex === this.state.mobile.sequence.length - 1) {
                    rightBtn.style.opacity = '0.5';
                    rightBtn.style.pointerEvents = 'none';
                } else {
                    rightBtn.style.opacity = '1';
                    rightBtn.style.pointerEvents = 'auto';
                }
                
                this.log('mobile', `Navigation buttons updated - index: ${this.state.mobile.currentIndex}/${this.state.mobile.sequence.length - 1}`);
            }
        },
        
        updateMobileModeClass(mode) {
            if (!this.state.mobile.enabled) return;
            
            // Remove all existing mode classes
            document.body.classList.remove('mode-1', 'mode-2', 'mode-3', 'mode-4');
            
            // Add the current mode class
            document.body.classList.add(`mode-${mode}`);
            
            this.log('mobile', `Mobile mode class updated to mode-${mode}`);
        },
        
        handleClick(e) {
            // Collapse handles
            if (e.target.classList.contains('klite-handle')) {
                this.togglePanel(e.target.dataset.panel);
            }
            // Tabs
            else if (e.target.classList.contains('klite-tab')) {
                this.switchTab(e.target.closest('[data-panel]').dataset.panel, e.target.dataset.tab);
            }
            // Actions - check for data-action on clicked element or closest parent
            else if (e.target.dataset.action || e.target.closest('[data-action]')) {
                const actionElement = e.target.dataset.action ? e.target : e.target.closest('[data-action]');
                this.handleAction(actionElement.dataset.action, e);
            }
            // Submit
            else if (e.target.id === 'btn-submit') {
                this.submit();
            }
            // Edit (both mobile and desktop versions)
            else if (e.target.id === 'btn-edit' || e.target.id === 'btn-edit-desktop') {
                this.toggleEdit();
            }
            // Bottom buttons (both desktop and mobile versions for all modes)
            else if (e.target.id === 'btn-1' || 
                     e.target.id === 'btn-1-mobile-story' || 
                     e.target.id === 'btn-1-mobile-adventure' || 
                     e.target.id === 'btn-1-mobile-chat') {
                this.bottomAction(0);
            }
            else if (e.target.id === 'btn-2' || 
                     e.target.id === 'btn-2-mobile-story' || 
                     e.target.id === 'btn-2-mobile-adventure' || 
                     e.target.id === 'btn-2-mobile-chat') {
                this.bottomAction(1);
            }
            else if (e.target.id === 'btn-3' || 
                     e.target.id === 'btn-3-mobile-story' || 
                     e.target.id === 'btn-3-mobile-adventure' || 
                     e.target.id === 'btn-3-mobile-chat') {
                this.bottomAction(2);
            }
            // Section headers
            else if (e.target.closest('.klite-section-header')) {
                this.handleSectionToggle(e);
            }
        },
        
        handleInput(e) {
            if (e.target.id === 'input') {
                this.updateTokens();
            }
        },
        
        handleChange(e) {
            // Handle data-action changes (like select dropdowns)
            if (e.target.dataset.action || e.target.closest('[data-action]')) {
                const actionElement = e.target.dataset.action ? e.target : e.target.closest('[data-action]');
                this.handleAction(actionElement.dataset.action, e);
            }
        },
        
        handleDragOver(e) {
            e.preventDefault();
        },
        
        handleDragLeave(e) {
            // Handled by panels
        },
        
        handleDrop(e) {
            e.preventDefault();
        },
        
        handleSectionToggle(e) {
            const sectionHeader = e.target.closest('.klite-section-header');
            if (sectionHeader) {
                e.preventDefault();
                const section = sectionHeader.closest('.klite-section');
                section.classList.toggle('collapsed');
                const arrow = sectionHeader.querySelector('span:last-child');
                arrow.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
            }
        },
        
        handleModalClick(e) {
            // Handle clicks on dynamically created modals
            if (e.target.dataset.action) {
                // Route modal actions to main handleAction function
                this.handleAction(e.target.dataset.action, e);
            }
        },
        
        // =============================================
        // HOTKEY SYSTEM IMPLEMENTATION
        // =============================================
        
        initializeHotkeys() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
            this.log('hotkeys', '🎹 KLITE RPMod Hotkey System Initialized');
            this.logActiveHotkeys();
        },
        
        handleKeyDown(e) {
            // Don't intercept keystrokes when user is typing in input fields
            const activeElement = document.activeElement;
            const isTypingInInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            
            // Only process hotkeys with modifier keys or when not typing in inputs
            const hasModifiers = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
            if (isTypingInInput && !hasModifiers) {
                return; // Let the input handle the keystroke normally
            }
            
            const hotkey = this.buildHotkeyString(e);
            const hotkeyConfig = this.hotkeys[hotkey];
            
            if (hotkeyConfig) {
                e.preventDefault();
                e.stopPropagation();
                
                this.log('hotkeys', `Executing hotkey: ${hotkey} -> ${hotkeyConfig.action}`);
                this.executeHotkeyAction(hotkeyConfig.action);
                
                return false; // Stop all propagation
            }
        },
        
        buildHotkeyString(e) {
            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.shiftKey) parts.push('Shift');
            if (e.altKey) parts.push('Alt');
            if (e.metaKey) parts.push('Meta');
            
            // Handle special keys
            let key = e.key;
            if (key === 'Enter') key = 'Enter';
            else if (key === ' ') key = 'Space';
            else if (key.length === 1) key = key.toUpperCase();
            
            parts.push(key);
            return parts.join('+');
        },
        
        executeHotkeyAction(action) {
            this.log('hotkeys', `Executing action: ${action}`);
            
            switch (action) {
                case 'hotswap_ui':
                    this.toggleUI();
                    break;
                case 'submit_generation':
                    if (typeof window.submit_generation === 'function') {
                        window.submit_generation();
                    } else if (typeof window.submit_generation_button === 'function') {
                        window.submit_generation_button(false);
                    } else {
                        this.submit();
                    }
                    break;
                case 'retry_generation':
                    if (typeof window.btn_retry === 'function') {
                        window.btn_retry();
                    } else {
                        this.handleAction('retry');
                    }
                    break;
                case 'abort_generation':
                    if (typeof window.abort_generation === 'function') {
                        window.abort_generation();
                    }
                    break;
                case 'undo_generation':
                    this.handleAction('back');
                    break;
                case 'redo_generation':
                    this.handleAction('forward');
                    break;
                // Panel switching
                case 'switch_panel_play':
                    this.switchTab('left', 'PLAY');
                    break;
                case 'switch_panel_chars':
                    this.switchTab('right', 'CHARS');
                    break;
                case 'switch_panel_memory':
                    this.switchTab('right', 'MEMORY');
                    break;
                case 'switch_panel_wi':
                    this.switchTab('right', 'WI');
                    break;
                case 'switch_panel_scene':
                    this.switchTab('left', 'SCENE');
                    break;
                case 'switch_panel_group':
                    this.switchTab('left', 'GROUP');
                    break;
                case 'switch_panel_tools':
                    this.switchTab('left', 'TOOLS');
                    break;
                case 'switch_panel_notes':
                    this.switchTab('right', 'NOTES');
                    break;
                case 'switch_panel_textdb':
                    this.switchTab('right', 'TEXTDB');
                    break;
                case 'switch_panel_help':
                    this.switchTab('left', 'HELP');
                    break;
                // Panel toggles
                case 'toggle_left_panel':
                    this.togglePanel('left');
                    break;
                case 'toggle_right_panel':
                    this.togglePanel('right');
                    break;
                case 'toggle_top_panel':
                    this.togglePanel('top');
                    break;
                case 'toggle_edit_mode':
                    this.toggleEdit();
                    break;
                // Input focus
                case 'focus_main_input':
                    const input = document.getElementById('input');
                    if (input) input.focus();
                    break;
                case 'cycle_input_focus':
                    this.cycleFocus();
                    break;
                default:
                    this.log('hotkeys', `Unknown action: ${action}`);
            }
        },
        
        cycleFocus() {
            const inputs = document.querySelectorAll('input, textarea, select');
            const activeElement = document.activeElement;
            let currentIndex = Array.from(inputs).indexOf(activeElement);
            
            if (currentIndex === -1) currentIndex = 0;
            else currentIndex = (currentIndex + 1) % inputs.length;
            
            if (inputs[currentIndex]) {
                inputs[currentIndex].focus();
                this.log('hotkeys', `Focus cycled to: ${inputs[currentIndex].tagName}#${inputs[currentIndex].id}`);
            }
        },
        
        logActiveHotkeys() {
            this.log('hotkeys', '🎹 Active Hotkeys:');
            Object.entries(this.hotkeys).forEach(([hotkey, config]) => {
                console.log(`  ${hotkey.padEnd(20)} -> ${config.description}`);
            });
        },
        
        // UI Toggle/Hotswap Implementation
        toggleUI() {
            const isRPModActive = document.body.classList.contains('klite-active');
            const editCheckbox = document.getElementById('allowediting');
            const isInEditMode = editCheckbox?.checked;
            
            // Handle edit mode before switching
            if (isInEditMode) {
                this.log('hotkeys', 'Edit mode detected during hotswap - saving changes');
                
                if (isRPModActive) {
                    // Switching FROM RPmod TO Lite: save chat-display changes to gametext
                    const chatDisplay = document.getElementById('chat-display');
                    const gametext = document.getElementById('gametext');
                    if (chatDisplay && gametext) {
                        gametext.innerHTML = chatDisplay.innerHTML;
                        this.log('hotkeys', 'Synced chat-display edits to gametext for Lite UI');
                    }
                } else {
                    // Switching FROM Lite TO RPmod: sync gametext to chat-display  
                    this.syncChat();
                    this.log('hotkeys', 'Synced gametext edits to chat-display for RPmod UI');
                }
            }
            
            if (isRPModActive) {
                // Switch to Lite UI
                document.body.classList.remove('klite-active');
                const container = document.getElementById('klite-container');
                if (container) container.style.display = 'none';
                
                // Show original Lite elements with explicit restoration
                const liteElements = ['#gamecontainer', '#main_container', '#inputrow'];
                liteElements.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (element) {
                        element.style.display = '';
                        element.style.visibility = '';
                        // Remove any potential hidden attributes
                        element.removeAttribute('hidden');
                        this.log('hotkeys', `Restored element: ${selector}`);
                    }
                });
                
                // Also ensure input and submit button are functional
                const inputText = document.getElementById('input_text');
                const submitBtn = document.getElementById('submit');
                if (inputText) {
                    inputText.style.display = '';
                    inputText.disabled = false;
                }
                if (submitBtn) {
                    submitBtn.style.display = '';
                    submitBtn.disabled = false;
                }
                
                // Sync input values
                this.syncInputValues('to-lite');
                
                // In edit mode, make sure gametext is editable in Lite UI
                if (isInEditMode) {
                    const gametext = document.getElementById('gametext');
                    if (gametext) gametext.contentEditable = 'true';
                }
                
                // UI switched to KoboldAI Lite
                this.log('hotkeys', '🔄 UI switched to KoboldAI Lite');
                
            } else {
                // Switch to RPMod UI
                document.body.classList.add('klite-active');
                const container = document.getElementById('klite-container');
                if (container) container.style.display = 'grid';
                
                // Sync input values
                this.syncInputValues('to-rpmod');
                
                // In edit mode, make sure chat-display is editable in RPmod UI
                if (isInEditMode) {
                    const chatDisplay = document.getElementById('chat-display');
                    const gametext = document.getElementById('gametext');
                    if (chatDisplay && gametext) {
                        chatDisplay.contentEditable = 'true';
                        gametext.contentEditable = 'false'; // Avoid dual editing
                    }
                }
                
                // UI switched to KLITE RPMod
                this.log('hotkeys', '🔄 UI switched to KLITE RPMod');
            }
        },
        
        // Input synchronization between UIs
        syncInputValues(direction) {
            const rpmodInput = document.getElementById('input');
            const liteInput = document.getElementById('input_text') || 
                             document.getElementById('cht_inp') || 
                             document.getElementById('corpo_cht_inp');
            
            if (!rpmodInput || !liteInput) {
                this.log('hotkeys', 'Input sync failed - missing input elements');
                return;
            }
            
            if (direction === 'to-lite') {
                liteInput.value = rpmodInput.value;
                this.log('hotkeys', 'Input synced to Lite UI');
            } else if (direction === 'to-rpmod') {
                rpmodInput.value = liteInput.value;
                this.log('hotkeys', 'Input synced to RPMod UI');
            }
        },
        
        handleAction(action, event) {
            this.log('state', `Handling action: ${action}`);
            
            switch(action) {
                case 'back': window.btn_back?.(); break;
                case 'forward': window.btn_redo?.(); break;
                case 'retry': window.btn_retry?.(); break;
                case 'fullscreen': this.toggleFullscreen(); break;
                case 'tablet-sidepanel': this.toggleTabletSidepanel(); break;
                case 'mode-1': 
                    this.setMode(1); // Story mode + Classic UI
                    break;
                case 'mode-2': 
                    this.setMode(2); // Adventure mode + Classic UI
                    break;
                case 'mode-3': 
                    this.setMode(3); // Chat mode + Classic UI
                    break;
                case 'mode-4': 
                    this.setMode(4); // RP mode = Instruct mode + Classic UI + inject_chatnames_instruct
                    break;
                case 'context': this.switchTab('left', 'TOOLS'); break;
                case 'memory': this.switchTab('right', 'MEMORY'); break;
                case 'images': window.add_media_btn_menu?.(); break;
                case 'samplers': window.display_settings?.(); break;
                
                // Modal actions
                case 'confirm-unified-char-selection':
                    const mode = event.target.dataset.mode || event.target.closest('[data-mode]')?.dataset.mode;
                    if (mode) this.confirmUnifiedCharacterSelection(mode);
                    break;
                case 'close-unified-char-modal':
                    this.closeUnifiedCharacterModal();
                    break;
                case 'toggle-unified-char-selection':
                    const charId = event.target.dataset.charId || event.target.closest('[data-char-id]')?.dataset.charId;
                    const selectionType = event.target.dataset.selectionType || event.target.closest('[data-selection-type]')?.dataset.selectionType;
                    if (charId && selectionType) this.toggleUnifiedCharacterSelection(charId, selectionType);
                    break;
                case 'confirm-group-char-selection':
                    KLITE_RPMod.panels.GROUP?.confirmCharacterSelection();
                    break;
                case 'close-group-char-modal':
                    KLITE_RPMod.panels.GROUP?.closeCharacterModal();
                    break;
                case 'confirm-custom-character':
                    const editCharId = event.target.dataset.editCharId || null;
                    KLITE_RPMod.panels.GROUP?.confirmCustomCharacter(editCharId);
                    break;
                
                default:
                    // Check currently active panels first, then all panels
                    let handled = false;
                    
                    // First try the currently active left panel
                    const activeLeftPanel = this.state.tabs.left;
                    if (activeLeftPanel === 'PLAY') {
                        // For PLAY panel, map to specific PLAY_* panel based on mode
                        const mode = this.getMode();
                        const modeMap = {
                            'story': 'PLAY_STORY',
                            'adventure': 'PLAY_ADV',
                            'chat': 'PLAY_CHAT',
                            'instruct': 'PLAY_RP'
                        };
                        const activePlayPanel = modeMap[mode] || 'PLAY_RP';
                        const panel = KLITE_RPMod.panels[activePlayPanel];
                        if (panel?.actions?.[action]) {
                            this.log('panels', `Action ${action} handled by ${activePlayPanel}`);
                            panel.actions[action](event);
                            handled = true;
                        }
                    } else {
                        // For non-PLAY left panels (GROUP, TOOLS, SCENE, HELP), check directly
                        const panel = KLITE_RPMod.panels[activeLeftPanel];
                        if (panel?.actions?.[action]) {
                            this.log('panels', `Action ${action} handled by ${activeLeftPanel}`);
                            panel.actions[action](event);
                            handled = true;
                        }
                    }
                    
                    // If not handled by left panel, try currently active right panel
                    if (!handled) {
                        const activeRightPanel = this.state.tabs.right;
                        const panel = KLITE_RPMod.panels[activeRightPanel];
                        if (panel?.actions?.[action]) {
                            this.log('panels', `Action ${action} handled by ${activeRightPanel}`);
                            panel.actions[action](event);
                            handled = true;
                        }
                    }
                    
                    // If not handled, log error - no fallback search
                    if (!handled) {
                        this.error(`Unhandled action: ${action}. Check panel configuration.`);
                    }
            }
        },
        
        // Panel system
        panels: {},
        
        switchTab(panel, tab) {
            this.log('panels', `Switching ${panel} panel to ${tab}`);
            
            this.state.tabs[panel] = tab;
            this.saveState();
            
            // Update UI
            document.querySelectorAll(`[data-panel="${panel}"] .klite-tab`).forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tab);
            });
            
            this.loadPanel(panel, tab);
        },
        
        syncTabButtonStates() {
            // Ensure button states match the current state.tabs during initialization
            this.log('panels', 'Syncing tab button states with current state');
            
            // Wait for DOM to be ready if called too early
            if (!document.querySelector('[data-panel="left"]')) {
                this.log('panels', 'DOM not ready, deferring button state sync');
                setTimeout(() => this.syncTabButtonStates(), 10);
                return;
            }
            
            // Update left panel buttons
            document.querySelectorAll('[data-panel="left"] .klite-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === this.state.tabs.left);
            });
            
            // Update right panel buttons  
            document.querySelectorAll('[data-panel="right"] .klite-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === this.state.tabs.right);
            });
            
            this.log('panels', `Button states synced: left=${this.state.tabs.left}, right=${this.state.tabs.right}`);
        },
        
        loadPanel(side, name) {
            this.log('panels', `Loading panel: ${side}/${name}`);
            
            const container = document.getElementById(`content-${side}`);
            
            // Reset panel-specific CSS classes
            container.className = 'klite-content';
            
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
                this.log('panels', `PLAY panel mapped to ${name} for mode ${mode}`);
            }
            
            
            const panel = KLITE_RPMod.panels[name];
            if (!container || !panel) {
                this.error(`Panel not found: ${name}`);
                return;
            }
            
            try {
                container.innerHTML = panel.render();
                
                // Cleanup existing listeners before reinitializing
                if (panel.cleanup) {
                    this.log('panels', `Cleaning up panel: ${name}`);
                    panel.cleanup();
                }
                
                // Additional cleanup: clear any stored timers or intervals
                if (panel.autoSender?.timer) {
                    clearTimeout(panel.autoSender.timer);
                    panel.autoSender.timer = null;
                }
                if (panel.saveTimer) {
                    clearTimeout(panel.saveTimer);
                    panel.saveTimer = null;
                }
                
                if (panel.init) {
                    setTimeout(async () => {
                        this.log('panels', `Initializing panel: ${name}`);
                        await panel.init();
                    }, 0);
                }
                
                // Update mode buttons when loading PLAY panels
                if (name.startsWith('PLAY_')) {
                    setTimeout(() => {
                        this.updateModeButtons();
                        this.log('panels', `Updated mode buttons for ${name}`);
                    }, 50);
                }
            } catch (error) {
                this.error(`Error loading panel ${name}:`, error);
            }
        },
        
        togglePanel(side) {
            this.log('state', `Toggling ${side} panel`);
            
            const panel = document.getElementById(`panel-${side}`);
            if (!panel) return;
            
            this.state.collapsed[side] = !this.state.collapsed[side];
            panel.classList.toggle('collapsed');
            
            // Update handle
            const handle = panel.querySelector('.klite-handle');
            if (handle) {
                const icons = {
                    left: this.state.collapsed[side] ? '▶' : '◀',
                    right: this.state.collapsed[side] ? '◀' : '▶',
                    top: this.state.collapsed[side] ? '▼' : '▲'
                };
                handle.textContent = icons[side];
            }
            
            // Update main for top panel
            if (side === 'top') {
                document.getElementById('maincontent').classList.toggle('top-expanded', !this.state.collapsed[side]);
            }
            
            // Update tablet sidepanel positions if in tablet sidepanel mode
            this.updateTabletSidepanelPositions();
            
            // Update button active states when panels are toggled
            this.updateTabletSidepanelButton();
            this.updateFullscreenButton();
            
            this.saveState();
        },
        
        // Hooks with optimal queue/wait handling
        setupHooks() {
            this.log('hooks', 'Setting up KoboldAI Lite hooks...');
            
            // Hook submit
            if (window.submit_generation_button) {
                const orig = window.submit_generation_button;
                const self = this; // Preserve reference to KLITE_RPMod
                window.submit_generation_button = (...args) => {
                    self.log('generation', 'Submit generation triggered');
                    
                    // Inject character context dynamically
                    if (self.injectCharacterContext) {
                        self.injectCharacterContext();
                    }
                    
                    // Handle adventure mode behavior - may cancel generation
                    if (self.handleAdventureMode() === false) {
                        self.log('generation', 'Generation cancelled by adventure mode handler');
                        return;
                    }
                    
                    self.state.generating = true;
                    self.updateSubmitBtn();
                    self.generationStart = Date.now();
                    return orig.apply(window, args);
                };
                this.log('hooks', 'Hooked submit_generation_button');
            }

            // Hook dispatch for debugging
            if (window.dispatch_submit_generation) {
                const orig = window.dispatch_submit_generation;
                window.dispatch_submit_generation = (payload, ...args) => {
                    this.log('generation', '=== DISPATCH PAYLOAD ===');
                    this.log('generation', 'Max length:', payload.params?.max_length);
                    this.log('generation', 'Max context:', payload.params?.max_context_length);
                    this.log('generation', 'Temperature:', payload.params?.temperature);
                    this.log('generation', 'Top P:', payload.params?.top_p);
                    this.log('generation', 'Full params:', payload.params);
                    return orig.apply(window, [payload, ...args]);
                };
                this.log('hooks', 'Hooked dispatch_submit_generation');
            }
            
            // Hook abort
            if (window.abort_generation) {
                const orig = window.abort_generation;
                const self = this; // Preserve reference to KLITE_RPMod
                window.abort_generation = (...args) => {
                    self.log('generation', 'Abort generation triggered');
                    
                    // Check if memory generation is active and abort it
                    if (self.panels.TOOLS?.memoryGenerationState?.active) {
                        self.panels.TOOLS.abortMemoryGeneration('user_abort');
                    }
                    
                    self.state.generating = false;
                    self.updateSubmitBtn();
                    return orig.apply(window, args);
                };
                this.log('hooks', 'Hooked abort_generation');
            }
            
            // Hook render
            if (window.render_gametext) {
                const orig = window.render_gametext;
                const self = this; // Preserve reference to KLITE_RPMod
                window.render_gametext = (...args) => {
                    const result = orig.apply(window, args);
                    self.log('integration', 'render_gametext called, syncing chat display');
                    self.syncChat();
                    self.addCharacterAvatars();
                    self.state.generating = false;
                    self.updateSubmitBtn();
                    
                    // Trigger auto-ambient color generation if enabled and not in default theme
                    if (self.panels.SCENE?.visualStyle?.autoGenerate && self.panels.SCENE?.visualStyle?.theme !== 'default') {
                        setTimeout(() => {
                            self.panels.SCENE.autoGenerateAmbientColor();
                        }, 500);
                    }
                    
                    return result;
                };
                this.log('hooks', 'Hooked render_gametext');
            }

            // Optimal Horde queue/wait time handling via fetch intercept
            const origFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                
                // Check if this is a Horde status poll
                if (url && typeof url === 'string' && url.includes('/api/v2/generate/status/')) {
                    KLITE_RPMod.log('generation', 'Intercepted Horde status poll:', url);
                    
                    return origFetch.apply(window, args).then(response => {
                        // Clone the response so we can read it without consuming it
                        const cloned = response.clone();
                        cloned.json().then(data => {
                            KLITE_RPMod.log('generation', 'Horde status data:', data);
                            
                            // Update our UI with the Horde status
                            if (data && !data.faulted) {
                                const queueEl = document.getElementById('queue');
                                const waitEl = document.getElementById('wait');
                                
                                if (queueEl && data.queue_position !== undefined) {
                                    queueEl.textContent = `#${data.queue_position}`;
                                }
                                if (waitEl && data.wait_time !== undefined) {
                                    waitEl.textContent = `${data.wait_time}s`;
                                }
                                
                                // Update generating state based on done flag
                                if (data.done === false && !KLITE_RPMod.state.generating) {
                                    KLITE_RPMod.log('generation', 'Setting generating state from Horde poll');
                                    KLITE_RPMod.state.generating = true;
                                    KLITE_RPMod.updateSubmitBtn();
                                } else if (data.done === true && KLITE_RPMod.state.generating) {
                                    KLITE_RPMod.log('generation', 'Generation complete per Horde status');
                                    // Delay slightly as Lite fetches the result
                                    setTimeout(() => {
                                        KLITE_RPMod.state.generating = false;
                                        KLITE_RPMod.updateSubmitBtn();
                                        // Reset queue/wait displays
                                        if (queueEl) queueEl.textContent = '#0';
                                        if (waitEl) waitEl.textContent = '0s';
                                    }, 600);
                                }
                            }
                        }).catch(err => {
                            KLITE_RPMod.error('Failed to parse Horde status:', err);
                        });
                        
                        return response;
                    });
                }
                
                // For all other requests, just pass through
                return origFetch.apply(window, args);
            };
            this.log('hooks', 'Hooked fetch for Horde status interception');
            
            // Also monitor the Lite's own queue display element
            setInterval(() => {
                const loaderNum = document.getElementById('outerloadernum');
                if (loaderNum && loaderNum.innerText) {
                    const queueEl = document.getElementById('queue');
                    if (queueEl && queueEl.textContent !== `#${loaderNum.innerText}`) {
                        this.log('integration', `Syncing queue from Lite display: ${loaderNum.innerText}`);
                        queueEl.textContent = loaderNum.innerText ? `#${loaderNum.innerText}` : '#0';
                    }
                }
            }, 500);
            
            // Monitor pending_response_id for generation state
            setInterval(() => {
                const isGenerating = window.pending_response_id && window.pending_response_id !== "";
                if (isGenerating !== this.state.generating) {
                    this.log('generation', `Generation state changed via pending_response_id: ${isGenerating}`);
                    this.state.generating = isGenerating;
                    this.updateSubmitBtn();
                    if (!isGenerating) {
                        // Reset displays when generation ends
                        setTimeout(() => {
                            const queueEl = document.getElementById('queue');
                            const waitEl = document.getElementById('wait');
                            if (queueEl) queueEl.textContent = '#0';
                            if (waitEl) waitEl.textContent = '0s';
                        }, 100);
                    }
                }
            }, 250);
            
            // Hook autosave to ensure our data is saved
            if (window.autosave) {
                const origAutosave = window.autosave;
                window.autosave = (...args) => {
                    this.log('integration', 'Autosave triggered');
                    return origAutosave.apply(window, args);
                };
                this.log('hooks', 'Hooked autosave');
            }
            
            // Embed top menu
            setTimeout(() => {
                const topContent = document.getElementById('top-content');
                const topmenu = document.getElementById('topmenu');
                if (topContent && topmenu) {
                    // Move the menu into our panel
                    topContent.appendChild(topmenu);
                    topmenu.style.display = '';
                    this.log('integration', 'Embedded top menu');
                }
            }, 100);
        },
        
        // Actions
        submit() {
            // Update status on submit
            this.updateStatus();
            
            this.log('generation', '=== SUBMISSION DEBUG ===');
            this.log('generation', 'Our input:', document.getElementById('input')?.value);
            this.log('generation', 'KoboldAI input:', document.getElementById('input_text')?.value);
            this.log('generation', 'Memory length:', window.current_memory?.length || 0);
            this.log('generation', 'Story length:', window.gametext_arr?.join('').length || 0);
            this.log('generation', 'Max context:', window.localsettings?.max_context_length || 'unknown');
            this.log('generation', 'Max length:', window.localsettings?.max_length || 'unknown');

            const input = document.getElementById('input');
            const liteInput = document.getElementById('input_text');
            
            if (!input || !liteInput) {
                this.error('Input elements not found');
                return;
            }
            
            if (this.state.generating) {
                this.log('generation', 'Aborting current generation');
                window.abort_generation?.();
                return;
            }
            
            const text = input.value.trim();
            if (!text) {
                this.log('generation', 'Empty input, skipping submission');
                return;
            }
            
            // Sync text to KoboldAI input
            liteInput.value = text;
            this.log('generation', `Synced text to Lite input: "${text}"`);
            
            // Clear our input
            input.value = '';
            this.updateTokens();
            
            // Submit using KoboldAI's native function
            this.log('generation', 'Calling submit_generation_button');
            window.submit_generation_button?.();
        },
        
        updateSubmitBtn() {
            const btn = document.getElementById('btn-submit');
            if (btn) {
                if (this.state.generating) {
                    btn.textContent = this.state.mobile.enabled ? '⏹️' : 'Abort';
                    btn.classList.add('danger');
                } else {
                    btn.textContent = this.state.mobile.enabled ? '🚀' : 'Submit';
                    btn.classList.remove('danger');
                }
                this.log('state', `Submit button updated: ${btn.textContent}`);
            }
        },
        
        toggleEdit() {
            const checkbox = document.getElementById('allowediting');
            const wasChecked = checkbox?.checked;
            
            this.log('state', `Edit toggle start - wasChecked: ${wasChecked}, current mode: ${window.localsettings?.opmode}`);
            
            // When entering edit mode, store the current RPmod PLAY state
            if (!wasChecked) {
                this.quickButtonState.storedModeBeforeEdit = window.localsettings?.opmode;
                this.log('state', `📝 Entering edit mode - storing current mode: ${this.quickButtonState.storedModeBeforeEdit}`);
            }
            
            // If we're exiting edit mode, save changes first
            if (wasChecked) {
                this.saveEditChanges();
            }
            
            // Toggle checkbox state
            if (checkbox) checkbox.checked = !checkbox.checked;
            
            // Call the original toggle function
            window.toggle_editable?.();
            
            // When exiting edit mode, restore the stored RPmod PLAY state
            if (wasChecked && this.quickButtonState.storedModeBeforeEdit !== null) {
                const restoredMode = this.quickButtonState.storedModeBeforeEdit;
                window.localsettings.opmode = restoredMode;
                this.updateModeButtons();
                this.log('state', `📝 Exiting edit mode - restoring mode: ${restoredMode} (${this.getMode()})`);
                
                
                // Clear stored mode
                this.quickButtonState.storedModeBeforeEdit = null;
            }
            
            // Update edit button state
            const btn = document.getElementById('btn-edit');
            const isEditMode = checkbox?.checked;
            if (btn) {
                if (isEditMode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
            
            // Make our chat display editable and hide original gametext to avoid confusion
            const chatDisplay = document.getElementById('chat-display');
            const gametext = document.getElementById('gametext');
            if (chatDisplay && gametext) {
                chatDisplay.contentEditable = isEditMode ? 'true' : 'false';
                // In edit mode, user edits in chat-display, so make gametext non-editable to avoid confusion
                gametext.contentEditable = 'false';
                this.log('state', `Set chat-display editable: ${isEditMode}, gametext editable: false`);
            }
            
            this.log('state', `Edit mode completed - final state: ${isEditMode}, mode: ${window.localsettings?.opmode}`);
        },
        
        saveEditChanges() {
            const gametext = document.getElementById('gametext');
            const chatDisplay = document.getElementById('chat-display');
            
            // CRITICAL: Sync FROM chat-display TO gametext before saving
            // Users edit in chat-display, but merge_edit_field() only reads from gametext
            if (chatDisplay && gametext) {
                gametext.innerHTML = chatDisplay.innerHTML;
                this.log('state', 'Synced chat-display changes to gametext element');
            }
            
            // Now let KoboldAI Lite save from gametext to gametext_arr
            if (gametext && typeof window.merge_edit_field === 'function') {
                window.merge_edit_field();
                this.log('state', 'Triggered merge_edit_field() to save changes');
            }
            
            // Sync back to ensure consistency (should be no-op now)
            this.syncChat();
        },
        
        setMode(mode) {
            // Set the mode in KoboldAI Lite
            if (window.localsettings) window.localsettings.opmode = mode;
            window.toggle_opmode?.(mode);
            
            this.log('state', `Setting mode to ${mode} (${this.getMode()})`);
            
            // Configure specific mode settings
            if (mode === 3) {
                // Chat mode - Disable special instruct features
                if (window.localsettings) {
                    window.localsettings.inject_chatnames_instruct = false;
                }
                this.log('state', `Configured Chat mode settings`);
            } else if (mode === 4) {
                // RP mode (Instruct) - Enable inject_chatnames_instruct
                if (window.localsettings) {
                    window.localsettings.inject_chatnames_instruct = true;
                }
                this.log('state', `Enabled inject_chatnames_instruct for RP mode`);
            }
            
            // Switch to Classic UI for all modes
            this.switchToClassicUI();
            
            // Update mode buttons immediately
            this.updateModeButtons();
            
            // Update mobile mode class for correct button set
            this.updateMobileModeClass(mode);
            
            // Update dynamic buttons
            this.onModeChange(mode);
            
            // Handle special mode formatting
            if (mode === 3) {
                // Entering Chat mode
                setTimeout(() => {
                    if (KLITE_RPMod.panels.PLAY_CHAT?.onModeEnter) {
                        KLITE_RPMod.panels.PLAY_CHAT.onModeEnter();
                    }
                }, 200);
            } else if (mode === 4) {
                // Entering RP mode
                setTimeout(() => {
                    KLITE_RPMod.onRPModeEnter();
                }, 200);
            } else {
                // Leaving special modes
                if (KLITE_RPMod.panels.PLAY_CHAT?.onModeExit) {
                    KLITE_RPMod.panels.PLAY_CHAT.onModeExit();
                }
                KLITE_RPMod.onRPModeExit();
            }
            
            // Reload PLAY panel with new mode
            this.switchTab('left', 'PLAY');
        },
        
        switchToClassicUI() {
            // Switch back to KoboldAI Lite's classic UI
            if (document.body.classList.contains('klite-active')) {
                document.body.classList.remove('klite-active');
                this.log('ui', 'Switched to Classic UI');
            }
        },
        
        getMode() {
            const mode = window.localsettings?.opmode || 3;
            return ['', 'story', 'adventure', 'chat', 'instruct'][mode] || 'chat';
        },
        
        onModeChange(mode) {
            // Reset adventure mode to story when entering adventure mode
            if (mode === 2) {
                this.state.adventureMode = 0; // Reset to story mode (0)
            } else {
                // When leaving adventure mode, clear adventure highlighting from all buttons (desktop and mobile)
                const bottomButtons = [
                    document.getElementById('btn-1'),
                    document.getElementById('btn-2'), 
                    document.getElementById('btn-3')
                ];
                
                // All mobile button sets
                const mobileButtons = [
                    // Story mode mobile buttons
                    document.getElementById('btn-1-mobile-story'),
                    document.getElementById('btn-2-mobile-story'),
                    document.getElementById('btn-3-mobile-story'),
                    // Adventure mode mobile buttons  
                    document.getElementById('btn-1-mobile-adventure'),
                    document.getElementById('btn-2-mobile-adventure'),
                    document.getElementById('btn-3-mobile-adventure'),
                    // Chat mode mobile buttons
                    document.getElementById('btn-1-mobile-chat'),
                    document.getElementById('btn-2-mobile-chat'),
                    document.getElementById('btn-3-mobile-chat')
                ];
                
                // Clear desktop buttons
                bottomButtons.forEach(btn => {
                    if (btn) btn.classList.remove('adventure-active');
                });
                
                // Clear mobile buttons
                mobileButtons.forEach(btn => {
                    if (btn) btn.classList.remove('adventure-active');
                });
                
                this.log('state', `Cleared adventure highlighting from all buttons when leaving adventure mode to ${mode}`);
            }
            
            // Update dynamic buttons when mode changes
            setTimeout(() => {
                this.updateGameModeButtons();
                this.log('state', `Updated buttons for mode: ${mode}`);
            }, 100);
        },
        
        // Quick button state management
        quickButtonState: {
            activeButton: null,
            lastActiveMode: null,
            storedModeBeforeEdit: null, // Store mode before edit mode
            isUpdating: false
        },

        updateModeButtons() {
            let mode = window.localsettings?.opmode || 1; // Default to story mode
            
            // Prevent unnecessary updates if we're already in the right state
            if (mode === this.quickButtonState.lastActiveMode) {
                return;
            }
            
            // Direct 1:1 mapping of modes to buttons
            // Mode 1→Button 1 (Story), Mode 2→Button 2 (Adventure), Mode 3→Button 3 (Chat), Mode 4→Button 4 (RP/Instruct)
            const buttonToHighlight = mode;
            this.setActiveQuickButton(buttonToHighlight, mode);
        },

        setActiveQuickButton(buttonNumber, actualMode) {
            const modeButtons = document.querySelectorAll('[data-action^="mode-"]');
            const targetBtns = document.querySelectorAll(`[data-action="mode-${buttonNumber}"]`);
            const targetMode = actualMode || buttonNumber;
            
            // Check if this is actually a change
            const isRealChange = this.quickButtonState.activeButton !== buttonNumber || 
                                this.quickButtonState.lastActiveMode !== targetMode;
            
            if (!isRealChange) {
                return; // No change needed
            }
            
            // Clear all active states
            modeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Set new active button(s) - both desktop and mobile versions
            if (targetBtns.length > 0) {
                targetBtns.forEach(btn => btn.classList.add('active'));
                this.quickButtonState.activeButton = buttonNumber;
                this.quickButtonState.lastActiveMode = targetMode;
                this.log('panels', `Quick button ${buttonNumber} activated (for mode ${targetMode}) - updated ${targetBtns.length} button(s)`);
            }
            
            // Update bottom buttons
            this.updateBottomButtons(targetMode);
            
            this.log('state', `Mode buttons updated for mode ${targetMode}`);
        },


        updateBottomButtons(mode) {
            const btns = ['#btn-1', '#btn-2', '#btn-3'].map(id => document.querySelector(id));
            const labels = {
                1: ['FALLEN', 'REJECT', 'TWIST'],
                2: ['STORY', 'ACTION', 'ROLL'],
                3: ['ME AS AI', 'AI AS ME', 'NARRATOR'],
                4: ['ME AS AI', 'AI AS ME', 'NARRATOR'] // Same as mode 3 for Instruct
            };
            
            (labels[mode] || labels[3]).forEach((label, i) => {
                if (btns[i]) btns[i].textContent = label;
            });
            
            // Update mobile mode class for correct button set
            this.updateMobileModeClass(mode);
        },


        
        bottomAction(index) {
            const mode = window.localsettings?.opmode || 3;
            this.log('state', `Bottom action ${index} triggered in mode ${mode}`);
            
            if (mode === 3) {
                if (index === 0) window.impersonate_message?.(0);
                else if (index === 1) window.impersonate_user?.();
                else if (index === 2) {
                    // Trigger narrator from current RP panel if available
                    const rpPanel = KLITE_RPMod.panels.PLAY_RP;
                    if (rpPanel?.actions?.narrator) {
                        rpPanel.actions.narrator();
                    } else {
                        document.getElementById('input').value = '[System instruction: Switch out of character (OOC) now and as a Narrator: Describe the scene. Then switch back into character and continue the role play like this System instruction did not happened.]';
                        this.submit();
                    }
                }
            }
        },
        
        toggleFullscreen() {
            const maincontent = document.getElementById('maincontent');
            const isFullscreen = maincontent.classList.contains('fullscreen');
            
            maincontent.classList.toggle('fullscreen');
            this.state.fullscreen = !isFullscreen;
            
            // In fullscreen, auto-collapse panels (but they can still be opened)
            if (!isFullscreen) {
                // Entering fullscreen
                if (!this.state.collapsed.left) {
                    this.togglePanel('left');
                }
                if (!this.state.collapsed.right) {
                    this.togglePanel('right');
                }
            }
            
            // Update button active state
            this.updateFullscreenButton();
            
            this.saveState();
            this.log('state', `Fullscreen ${!isFullscreen ? 'enabled' : 'disabled'}`);
        },
        
        toggleTabletSidepanel() {
            // Only allow toggling when in tablet mode
            if (!this.isTabletMode()) {
                this.log('state', 'Tablet sidepanel mode only available in tablet mode (768-1400px)');
                return;
            }
            
            this.state.tabletSidepanel = !this.state.tabletSidepanel;
            
            if (this.state.tabletSidepanel) {
                this.updateTabletSidepanelPositions();
                this.log('state', 'Tablet sidepanel mode enabled');
            } else {
                this.removeTabletSidepanelClasses();
                this.log('state', 'Tablet sidepanel mode disabled');
            }
            
            // Update button active state
            this.updateTabletSidepanelButton();
            
            this.saveState();
        },
        
        updateTabletSidepanelPositions() {
            if (!this.state.tabletSidepanel) {
                this.removeTabletSidepanelClasses();
                return;
            }
            
            // Only apply tablet sidepanel in tablet mode (768-1400px)
            if (!this.isTabletMode()) {
                this.removeTabletSidepanelClasses();
                return;
            }
            
            const container = document.getElementById('klite-container');
            
            // Remove all tablet sidepanel classes first
            this.removeTabletSidepanelClasses();
            
            const leftOpen = !this.state.collapsed.left;
            const rightOpen = !this.state.collapsed.right;
            
            if (leftOpen && rightOpen) {
                // Both panels open: left:0 right:0
                container.classList.add('tablet-sidepanel-both');
            } else if (leftOpen && !rightOpen) {
                // Only left panel open: left:350 right:0
                container.classList.add('tablet-sidepanel-left');
            } else if (!leftOpen && rightOpen) {
                // Only right panel open: left:0 right:350
                container.classList.add('tablet-sidepanel-right');
            } else {
                // Both panels closed: left:0 right:0
                container.classList.add('tablet-sidepanel-none');
            }
        },
        
        isTabletMode() {
            return window.innerWidth >= 768 && window.innerWidth <= 1400;
        },
        
        removeTabletSidepanelClasses() {
            const container = document.getElementById('klite-container');
            container.classList.remove('tablet-sidepanel-both', 'tablet-sidepanel-left', 'tablet-sidepanel-right', 'tablet-sidepanel-none');
        },
        
        restoreUIStates() {
            // Restore fullscreen state
            if (this.state.fullscreen) {
                const maincontent = document.getElementById('maincontent');
                maincontent.classList.add('fullscreen');
            }
            
            // Restore tablet sidepanel state (this will also clean up if not in tablet mode)
            this.updateTabletSidepanelPositions();
            
            // Update button active states
            this.updateTabletSidepanelButton();
            this.updateFullscreenButton();
        },
        
        updateTabletSidepanelButton() {
            const button = document.querySelector('.klite-quick-btn[data-action="tablet-sidepanel"]');
            if (button) {
                // Only show active state when in tablet mode and tablet sidepanel is enabled
                const shouldBeActive = this.isTabletMode() && this.state.tabletSidepanel;
                button.classList.toggle('active', shouldBeActive);
            }
        },
        
        updateFullscreenButton() {
            const button = document.querySelector('.klite-quick-btn[data-action="fullscreen"]');
            if (button) {
                // Show active state when fullscreen is enabled
                button.classList.toggle('active', this.state.fullscreen);
            }
        },
        
        addCharacterAvatars() {
            const gametext = document.getElementById('gametext');
            if (!gametext) return;
            
            // Remove existing base64 default avatars
            gametext.innerHTML = gametext.innerHTML.replace(/data:image\/png;base64,[^"]+/g, '');
            
            // Find all text chunks and add character avatars
            const chunks = gametext.querySelectorAll('chunk, p, .message');
            chunks.forEach(chunk => {
                const text = chunk.textContent;
                if (!text) return;
                
                // Skip if already has avatar
                if (chunk.querySelector('.klite-chat-avatar')) return;
                
                // Try to identify character by name in text
                let characterFound = null;
                
                // Check CHARS data first
                if (this.characters && this.characters.length > 0) {
                    characterFound = this.characters.find(char => {
                        const name = char.name.toLowerCase();
                        return text.toLowerCase().includes(name + ':') || 
                               text.toLowerCase().startsWith(name);
                    });
                }
                
                // Check GROUP characters if no CHARS match
                if (!characterFound && KLITE_RPMod.panels.GROUP?.activeChars) {
                    characterFound = KLITE_RPMod.panels.GROUP.activeChars.find(char => {
                        const name = char.name.toLowerCase();
                        return text.toLowerCase().includes(name + ':') || 
                               text.toLowerCase().startsWith(name);
                    });
                }
                
                if (characterFound) {
                    this.insertCharacterAvatar(chunk, characterFound);
                }
            });
        },
        
        insertCharacterAvatar(chunk, character) {
            let avatarSrc = '';
            
            if (character.image) {
                // Use character image from CHARS
                avatarSrc = character.image;
            } else if (character.isCustom) {
                // Use GROUP chat style icon for custom characters
                avatarSrc = this.generateCustomAvatar(character.name);
            } else {
                // Default AI avatar
                avatarSrc = this.generateDefaultAvatar(character.name);
            }
            
            // Create avatar element
            const avatar = document.createElement('img');
            avatar.className = 'klite-chat-avatar';
            avatar.src = avatarSrc;
            avatar.alt = character.name;
            avatar.title = character.name;
            
            // Insert at beginning of chunk
            chunk.insertBefore(avatar, chunk.firstChild);
        },
        
        generateCustomAvatar(name) {
            // Generate GROUP chat style icon (like your good template)
            const initial = name.charAt(0).toUpperCase();
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
            const color = colors[name.length % colors.length];
            
            return `data:image/svg+xml;base64,${btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="${color}"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-family="system-ui" font-size="12" font-weight="bold">${initial}</text>
                </svg>
            `)}`;
        },
        
        generateDefaultAvatar(name) {
            // Default avatar for AI/unknown
            const initial = name ? name.charAt(0).toUpperCase() : 'A';
            return `data:image/svg+xml;base64,${btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="#5cb85c"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-family="system-ui" font-size="12" font-weight="bold">${initial}</text>
                </svg>
            `)}`;
        },
        
        // Sync
        syncChat() {
            const gametext = document.getElementById('gametext');
            const display = document.getElementById('chat-display');
            if (gametext && display) {
                display.innerHTML = gametext.innerHTML || '<p class="klite-center klite-muted">No content yet...</p>';
                this.log('integration', 'Chat display synced');
                
                // Update group avatars for group chat mode
                this.updateGroupAvatars();
                
                // Apply avatar replacements after syncing
                setTimeout(() => this.replaceAvatarsInChat(), 100);
            }
        },
        
        updateTokens() {
            // Prompt tokens
            const input = document.getElementById('input');
            const promptTokens = document.getElementById('prompt-tokens');
            if (input && promptTokens) {
                // Use Lite's token counting if available
                const tokens = window.count_tokens ? window.count_tokens(input.value) : Math.ceil(input.value.length / 4);
                promptTokens.textContent = tokens;
            }
            
            // Story tokens
            const storyTokens = document.getElementById('story-tokens');
            if (storyTokens && window.gametext_arr) {
                const fullText = window.gametext_arr.join('');
                const tokens = window.count_tokens ? window.count_tokens(fullText) : Math.ceil(fullText.length / 4);
                storyTokens.textContent = tokens;
            }
        },
        
        // Avatar system methods
        updateAIAvatar(imageUrl) {
            if (imageUrl) {
                this.aiAvatarCurrent = imageUrl;
            } else {
                // Reset to default robot avatar
                this.aiAvatarCurrent = this.aiAvatarDefault;
            }
            
            // Force refresh of all avatars in chat
            this.replaceAvatarsInChat();
        },
        
        updateGroupAvatars() {
            // Sync group avatars map with current active characters
            if (KLITE_RPMod.panels.GROUP?.enabled && KLITE_RPMod.panels.GROUP.activeChars) {
                this.groupAvatars.clear();
                KLITE_RPMod.panels.GROUP.activeChars.forEach(char => {
                    if (char.avatar) {
                        this.groupAvatars.set(char.id, char.avatar);
                    }
                });
            }
        },
        
        updateUserAvatar(imageUrl) {
            if (imageUrl) {
                this.userAvatarCurrent = imageUrl;
            } else {
                // Reset to default user avatar
                this.userAvatarCurrent = this.userAvatarDefault;
            }
            
            // Force refresh of all avatars in chat
            this.replaceAvatarsInChat();
        },
        
        // Dynamic button system
        updateGameModeButtons() {
            // Update the main UI buttons based on game mode
            const bottomButtons = [
                document.getElementById('btn-1'),
                document.getElementById('btn-2'), 
                document.getElementById('btn-3')
            ];
            
            if (!bottomButtons[0] || !bottomButtons[1] || !bottomButtons[2]) return;
            
            // Get the current opmode directly
            const currentOpmode = (typeof window.localsettings !== 'undefined') ? window.localsettings.opmode : 3;
            
            switch (currentOpmode) {
                case 1: // Story mode
                    bottomButtons[0].textContent = 'FALLEN';
                    bottomButtons[1].textContent = 'REJECT';
                    bottomButtons[2].textContent = 'TWIST';
                    
                    bottomButtons[0].onclick = () => this.applyStoryModifier('fallen');
                    bottomButtons[1].onclick = () => this.applyStoryModifier('reject');
                    bottomButtons[2].onclick = () => this.applyStoryModifier('twist');
                    
                    // Setup mobile story button handlers
                    const mobileStoryButtons = [
                        document.getElementById('btn-1-mobile-story'),
                        document.getElementById('btn-2-mobile-story'),
                        document.getElementById('btn-3-mobile-story')
                    ];
                    
                    if (mobileStoryButtons[0] && mobileStoryButtons[1] && mobileStoryButtons[2]) {
                        mobileStoryButtons[0].onclick = () => this.applyStoryModifier('fallen');
                        mobileStoryButtons[1].onclick = () => this.applyStoryModifier('reject');
                        mobileStoryButtons[2].onclick = () => this.applyStoryModifier('twist');
                    }
                    break;
                    
                case 2: // Adventure mode
                    bottomButtons[0].textContent = 'STORY';
                    bottomButtons[1].textContent = 'ACTION';
                    bottomButtons[2].textContent = 'ROLL';
                    
                    bottomButtons[0].onclick = () => this.setAdventureMode(0);
                    bottomButtons[1].onclick = () => this.setAdventureMode(1);
                    bottomButtons[2].onclick = () => this.setAdventureMode(2);
                    
                    // Setup mobile adventure button handlers
                    const mobileAdventureButtons = [
                        document.getElementById('btn-1-mobile-adventure'),
                        document.getElementById('btn-2-mobile-adventure'),
                        document.getElementById('btn-3-mobile-adventure')
                    ];
                    
                    if (mobileAdventureButtons[0] && mobileAdventureButtons[1] && mobileAdventureButtons[2]) {
                        mobileAdventureButtons[0].onclick = () => this.setAdventureMode(0);
                        mobileAdventureButtons[1].onclick = () => this.setAdventureMode(1);
                        mobileAdventureButtons[2].onclick = () => this.setAdventureMode(2);
                    }
                    
                    // Update visual state for current adventure mode
                    this.updateAdventureModeButtons();
                    break;
                    
                case 3: // Chat mode
                case 4: // Instruct mode
                default: // Roleplay mode
                    bottomButtons[0].textContent = 'ME AS AI';
                    bottomButtons[1].textContent = 'AI AS ME';
                    bottomButtons[2].textContent = 'NARRATOR';
                    
                    bottomButtons[0].onclick = () => {
                        if (typeof window.impersonate_message === 'function') {
                            window.impersonate_message(0);
                        }
                    };
                    
                    bottomButtons[1].onclick = () => {
                        if (typeof window.impersonate_user === 'function') {
                            window.impersonate_user();
                        }
                    };
                    
                    bottomButtons[2].onclick = () => {
                        // Call PLAY_RP panel narrator with Omniscient Mixed preset
                        KLITE_RPMod.panels.PLAY_RP.triggerNarratorWithPreset('omniscient', 'mixed');
                    };
                    
                    // Setup mobile chat button handlers
                    const mobileChatButtons = [
                        document.getElementById('btn-1-mobile-chat'),
                        document.getElementById('btn-2-mobile-chat'),
                        document.getElementById('btn-3-mobile-chat')
                    ];
                    
                    if (mobileChatButtons[0] && mobileChatButtons[1] && mobileChatButtons[2]) {
                        mobileChatButtons[0].onclick = () => {
                            if (typeof window.impersonate_message === 'function') {
                                window.impersonate_message(0);
                            }
                        };
                        
                        mobileChatButtons[1].onclick = () => {
                            if (typeof window.impersonate_user === 'function') {
                                window.impersonate_user();
                            }
                        };
                        
                        mobileChatButtons[2].onclick = () => {
                            // Call PLAY_RP panel narrator with Omniscient Mixed preset
                            KLITE_RPMod.panels.PLAY_RP.triggerNarratorWithPreset('omniscient', 'mixed');
                        };
                    }
            }
        },

        applyStoryModifier(modifier) {
            const modifierPrompts = {
                fallen: "The narrative takes a darker turn. Characters reveal their worst traits, and the situation becomes more desperate or morally ambiguous.",
                reject: "The characters face rejection, failure, or obstacles. Their plans go awry, and they must deal with unexpected setbacks.",
                twist: "An unexpected plot twist occurs. Hidden information is revealed, or the situation suddenly changes in a surprising way."
            };
            
            const prompt = modifierPrompts[modifier];
            if (prompt && window.gametext_arr) {
                // Add the modifier text with story guidance formatting
                window.gametext_arr.push(`\n\nStory guidance: ${prompt}\n\n`);
                
                // Re-render the gametext to show the new content
                if (typeof window.render_gametext === 'function') {
                    window.render_gametext();
                }
                
                // Applied modifier: ${modifier}
                this.log('story', `Added story modifier: ${modifier}`);
            }
        },

        setAdventureMode(mode) {
            // Set the adventure sub-mode state (0=story, 1=action, 2=dice)
            this.state.adventureMode = mode;
            
            // Update visual highlighting
            this.updateAdventureModeButtons();
            
            // Log the mode change
            const modeNames = ['story', 'action', 'dice'];
            this.log('adventure', `Adventure mode set to: ${modeNames[mode]} (${mode})`);
        },
        
        updateAdventureModeButtons() {
            // Desktop buttons
            const bottomButtons = [
                document.getElementById('btn-1'),
                document.getElementById('btn-2'), 
                document.getElementById('btn-3')
            ];
            
            // Mobile buttons for adventure mode
            const mobileAdventureButtons = [
                document.getElementById('btn-1-mobile-adventure'),
                document.getElementById('btn-2-mobile-adventure'), 
                document.getElementById('btn-3-mobile-adventure')
            ];
            
            // Remove active class from all desktop buttons
            if (bottomButtons[0] && bottomButtons[1] && bottomButtons[2]) {
                bottomButtons.forEach(btn => btn.classList.remove('adventure-active'));
                
                // Add active class to current mode button (desktop)
                if (this.state.adventureMode >= 0 && this.state.adventureMode <= 2) {
                    bottomButtons[this.state.adventureMode].classList.add('adventure-active');
                }
            }
            
            // Remove active class from all mobile adventure buttons
            if (mobileAdventureButtons[0] && mobileAdventureButtons[1] && mobileAdventureButtons[2]) {
                mobileAdventureButtons.forEach(btn => btn.classList.remove('adventure-active'));
                
                // Add active class to current mode button (mobile)
                if (this.state.adventureMode >= 0 && this.state.adventureMode <= 2) {
                    mobileAdventureButtons[this.state.adventureMode].classList.add('adventure-active');
                }
            }
        },
        
        handleAdventureMode() {
            // Only apply adventure mode behavior when in adventure mode (mode 2)
            const currentOpmode = (typeof window.localsettings !== 'undefined') ? window.localsettings.opmode : 3;
            if (currentOpmode !== 2) return;
            
            const input = document.getElementById('input_text') || document.getElementById('input');
            if (!input) return;
            
            let newgen = input.value.trim();
            if (!newgen) return;
            
            // Apply KoboldAI Lite's exact adventure mode logic
            if (this.state.adventureMode !== 0) {
                // Action mode (1) or Dice mode (2): Add action formatting
                let diceaddon = "";
                if (this.state.adventureMode === 2) {
                    // Dice mode: Add dice roll result
                    let roll = Math.floor(Math.random() * 20) + 1;
                    let outcome = (roll === 20 ? "Perfect" : 
                                  (roll > 16 ? "Excellent" : 
                                  (roll > 12 ? "Good" : 
                                  (roll > 8 ? "Fair" : 
                                  (roll > 4 ? "Poor" : "Terrible")))));
                    diceaddon = ` (Rolled 1d20=${roll}/20, Outcome: ${outcome})`;
                }
                newgen = "\n\n\> " + newgen + diceaddon + "\n\n";
                input.value = newgen;
                this.log('adventure', `Applied adventure formatting: mode ${this.state.adventureMode}${diceaddon ? ', with dice roll' : ''}`);
            } else {
                // Story mode (0): Check if this is the first submission and auto-switch
                if (window.gametext_arr && window.gametext_arr.length === 0) {
                    this.state.adventureMode = 1; // Auto-switch to action mode
                    this.updateAdventureModeButtons();
                    this.log('adventure', 'First submission in story mode: auto-switched to action mode');
                    
                    // Don't generate if memory is empty (like KoboldAI Lite)
                    if (window.current_memory && window.current_memory.trim() === "") {
                        // Cancel the generation
                        input.value = '';
                        return false;
                    }
                }
            }
            
            return true;
        },
        
        triggerCurrentSpeaker() {
            // Trigger the current speaker/character (used by GROUP panel)
            if (KLITE_RPMod.panels.GROUP?.enabled) {
                // Use GROUP panel functionality
                KLITE_RPMod.panels.GROUP.triggerCurrentSpeaker();
            } else {
                // In single character mode, trigger current speaker (index 0)
                if (typeof window.impersonate_message === 'function') {
                    window.impersonate_message(0);
                    // Triggering current speaker
                }
            }
        },

        replaceAvatarsInChat() {
            // The exact base64 strings to look for (original KoboldAI Lite avatars)
            const USER_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAAXNSR0IB2cksfwAAAAlwSFlzAAACTwAAAk8B95E4kAAAAB5QTFRFFIqj/v//V6u9ksnUFIqjx+PpcbjHFIqjFIqjAAAAcfUgXwAAAAp0Uk5T/////9z//5IQAKod7AcAAACKSURBVHicY5hRwoAE3DsZWhhQgAdDAaoAO4MDqgALA/lAOQmVzyooaIAiYCgoKIYiICgoKIouIIhfBYYZGLYwKBuh8oHcVAUkfqKgaKCgMILPJggGCFMUIQIIewIhAnCXMAlCgQKqEQhDmGECAegCBmiGws1gYFICA2SnIgEHVC4LZlRiRDZ6cgAAfnASgWRzByEAAAAASUVORK5CYII=';
            
            const AI_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAADxQTFRFS2Si+X5+pmBfHyApLjZSS2SjP057Vzw5EA4Sf1ZT+9Sv1WpqnYx/7qaYw7vUAAAAS2Sj9PPzgnrLS2SjAzrF9gAAABR0Uk5T///////w////////////AKj//yMlHqVpAAAD3klEQVR4nKWXi7KjIAyGFSgxEjhV3/9d90+8onZPd810prWSDwi50fyoTNP7/X79g2D4NJlqo+rvV/Mf8npPM2B6/4+6ihKaB/pGaH4e6IPw00y3+48xhBC3J32Id+NeUzN9UPfer4RoD/eIqbnuwLS7zncLAfqdPvvDmvY9XAE6vuuImEAw8fNT1/kr4Qqw+YhdIocfJl0glxyTvyG8m7MNY1B9diAkmgGUODnH7Km7AF53AGEjUJtWYdUPzn0LyC6AQO0qCUCi1PKXAM5tCwXeAC0ROf36AqA2VACmbQ8yP9DVimeA6lPKkLaW3EPylXAARBXV701OhOVPI6hcAXH1mTyP7e8AMyEc4mQDzP7XrfOfl5D7ndAdfXID6NwMyXACEpEbgPTCLJn1hEGoAep/OKheQiCEEhj1HgBQX1ZxQMPLlyVsABwejkp8EGEQAkxRA4RgIRYhTxme1fkKoBZwAHjLA+b/cgLQ8gZ4gZ+tVtgAnboaa+Lg0IwRhBqAmX0cI0WFqHN3FUAXAOPpzIWhPzZYQgUAu4ljiaKTaKwtZtwAIdv8XkocR9+UYM5/BMTRxzJKsWEu+RPAAsBxKSWWgTHS18cofiwhlCJD4cApUb0CNWKA/5dhwAqKD2UIXAEoFgUMkIJTCCcjzkGE890BQhXA685WQNqD6ujKWDRhhI7EdKUCtKSGxd8ASEr+6sqNApKPeD/iFEpT6nAUcAMgMmBzqwVPgJCd80X3AIlDDcjSzH8PJbD7AGiT020WjfcCN0jI5WwJGk5axP4eikeyvQd4HE5i7I4xEpWANKg0m2p0OUIcQKJnd7uCaABMRebOSOoB1WUVYACzaGSs012NaI5gAC0GcPWD9iLI6/qVdGeXY7R6xu1M0FAhG7s865ctw97Zoz85kuXi5T2EbaZatLileQA+VifrYGrT7ruL+lbZ0orYcXQJpry/tl+26l1s8sOy+BxMqKjr23nf7mhFnktbOgJOGQmnVG0ZVve06VvDUFmEztGIhHAy2YHA+qsCuFNS1T0Edf41AOZ1b7uwH1tYYFA4p3U1owiOOu+AsyxrQ3AIXwrLXtryL4BPpW0rrvMaPgHSx+K6l3cj3Oin1lH6S3nfd+KDa51lAjJhE6ddz7XRu29xUH51O95SgNOahDTB3PPvLc7cZPWYEVlVlp5AkGtJK/63XZoq0jBsvUrPeNDvr/tE1SnD3qxIEVuNfAsY0J9w4Ux2ZKizHPLHFdw127r7HIS2ZpvFTHHbbN+3+2Qm29p9NvXv2v3twkHHCwd9vnA8vvI8vnQ9vvY9v3g+vvo+v3w/u/7/AZoAPJwrbZ1IAAAAAElFTkSuQmCC';
            
            // Your new avatars
            const NEW_USER_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAAFoElEQVRYCc1ZPWwcRRT+Znbv/2KfCY5tCRNb/HSIIgQaCpoI5PSpQFQpQEgBIoWGwgUNSEDSQOEyVPS2QGkjJAiRQNCAhBLjSIfy5zvf+W5vb3eG92Z379bru2T3cEzG2pvdN2/e+/bNvDdvnwUmaKe/2pzRffmKhj4ptHgB0MskZgkCVSNOo039TUDc0EL/JiCuiZz6cf3d49tmPMOPyMCLNy5tviq1PE2ATtG8E1nmEu91AnxFCbX+3bnjV9POTQVw5Yu/X4Il3oTWZ0jwQlrhY/jqEOJb+PqbjQ+f/nkMz4D8QICrq1r+NL31DnGfpeV7cTDrIG40fiUxay83F79eXRVqnMixAF//8s6CLboXNPD+uMkHQScAFz1d+uz7D2bro+SNBLjy+V/PQ9of01K8NWrSgdO0vgzlfbJx/pk/k7JlksCWO1RwDIANQQYxuhOA9gDkPcfLemiWi4MhkKybMcTJex7YIR71nosrT96z7tApB0MDgCaUsLf+/+1siMUgGQA0ce6gQ8kkL8sYOOaGzXhxcEJQ8JwgCEuSUKsKzD8BVPN9I7bbt/HPtsD9loY/NsJFEEb2dSX0GT5xbB4Oj6/MJ4QlNRamPcyVd6B223CavtFmSwvHK2VUc1O4tZ1H3x8ZzUYiC4kLASZcFebgd8UVGsh6tmKm5GKxeg/a7ZDjU0oQSte02zX9yHwRdecobreLDwIzbuy6yOtTkrOSScCx1FqOLNfrGDBaaSgCpahncPznu13UrCaBJ8TZ2wnGZpuUKftk2MJH3m9BIVhWIyIyIT+EmCzRQl7U0NOFzFoYmx3mc5knS+1Cew4Ue4lBE6GLW0uQNX1YyiGe7AAZGzmJSTYzA7SkouX0CUAC3whJ7Exk6gmaXmYvXppgJqpWG8G+CzVHBowLY/DkPEfsNlpuLT6S9n7JNml6fFVSTu20mihR3CP90XYzMxlnJM5gJobddgMoPZVScoyNPiFMHIyRUt92xCxKzjZKBctYUocWpF1Hyx48CNqf/b6HHcynlptktEkef+BkDlS6UMPuTgE5yzFhZY/ZzNLS6iqJdo9UTM0l9aZ7Jmx8Ft9Mx53kEnCsWXS6LhSdZ77vB5cX9Exzuj105JOEdHjkJ6U85PkmzRQ3HsI0dlgVZ9H0Z9Dt9QmcB88LLgbbc/toeFNQpcwnaEyfuCH5uzVGyXQrrDzUkWV0VZXADa3IQLt+Eaq6BGFnj38RCMZm80f10O+iofS9zFfA+9HrkKcOThUBVTgCkQ++49NL28vJ2CR/8ROZPqonaxyw8xbvOw8+7z9zebCJZltRwJlI9nXGJoNyhMlmUkuxLKBSljh2VGO+ehd2rw6/78YcxYPl3sUcZTrMU6lI8JxsTVxhbCYOcjmCNuPbJGDsjpaUkZRyDip2C3DuoX+viVZrB932Lu0QSq0k+xtJCENMp9lA55cfUKhWUJyapheahijNYNefRqdfoMzngZ5NCata5xcKwyuwcmnrIik6x8Rk4+Bb1HeB5h/o3r8NjzyUm8kBLWn6CJjpzSBh5dRLqSBOEs3K2SjPzELUnkNXzhHrGJBCXNo4t2gKBsOThGolBPc1uvaVOIS3Sxb7HU7jDqumsDYUbEAMUJnhvT+cyPJ5SI33587tOoqOC3GsBG2POJ+5JKIIS9gGmsJCzlo0EO/91i1K5+8MLGESUk5KM16RzF7rPvzGZvSY7NfiRaWhBYmNCznXalvP0jYy5o1mOj0KvGqKjEuW+E+OGUjkF8u7QDlSEPYk/eJJwrARowe2jxG4/GCh8ymty+HUZSLdVJ/xUf4oWUQaLHHEZxiokEPrdzmiPfI+LB4lwbHefRaMwDwu5bd9FowA8ducbCyepz33Hl1cbDzYxjJJNusYZblI2VgLRgzcP7Yl4DhIvn9si+hJoIf5b4h/AQQEqIODkoUZAAAAAElFTkSuQmCC';
            
            // Check if group chat is enabled
            const isGroupChatActive = KLITE_RPMod.panels.GROUP?.enabled || false;
            
            // Get all images in the chat area
            const chatArea = document.getElementById('chat-display');
            if (!chatArea) return;
            
            const images = chatArea.querySelectorAll('img');
            images.forEach(img => {
                if (img.src === USER_AVATAR_ORIGINAL) {
                    img.src = this.userAvatarCurrent || NEW_USER_AVATAR;
                    // Apply styling for persona avatars
                    if (this.userAvatarCurrent && this.userAvatarCurrent !== this.userAvatarDefault) {
                        img.style.objectFit = 'cover';
                        img.style.border = '2px solid #5cb85c';
                        img.style.borderRadius = '50%';
                    }
                } else if (img.src === AI_AVATAR_ORIGINAL) {
                    let avatarToUse = this.aiAvatarDefault;
                    
                    if (isGroupChatActive) {
                        // For group chat, try to determine which character is speaking
                        // by looking at the text content near the image
                        const parent = img.closest('chunk, p, .message');
                        if (parent) {
                            const textContent = parent.textContent || '';
                            
                            // Try to match character names in the text content
                            for (const [charId, avatarUrl] of this.groupAvatars) {
                                const character = this.characters.find(c => c.id == charId);
                                if (character && textContent.includes(character.name)) {
                                    avatarToUse = avatarUrl;
                                    break;
                                }
                            }
                        }
                    } else {
                        // Single character mode
                        avatarToUse = this.aiAvatarCurrent || this.aiAvatarDefault;
                    }
                    
                    img.src = avatarToUse;
                    
                    // Apply styling for character avatars to fit nicely
                    if (avatarToUse !== this.aiAvatarDefault) {
                        img.style.objectFit = 'cover';
                        img.style.border = '2px solid #5a6b8c';
                        img.style.borderRadius = '50%';
                    }
                }
            });
        },
        
        updateStatus() {
            // Connection status with debug
            const status = document.getElementById('connectstatus');
            const connEl = document.getElementById('connection');
            
            this.log('status', `updateStatus called - status element: ${status ? 'found' : 'missing'}, connEl: ${connEl ? 'found' : 'missing'}`);
            
            if (status && connEl) {
                const connectionText = status.textContent || 'Disconnected';
                const hasDisconnectedClass = status.classList.contains('disconnected');
                
                this.log('status', `Reading from connectstatus: "${connectionText}", disconnected class: ${hasDisconnectedClass}`);
                
                connEl.textContent = connectionText;
                const isConnected = !hasDisconnectedClass;
                connEl.style.color = isConnected ? '#5cb85c' : '#d9534f';
                
                // Clean up any debug styling
                connEl.style.backgroundColor = '';
                connEl.style.padding = '';
                connEl.style.borderRadius = '';
                connEl.style.fontWeight = '';
                
                // Clean up parent info div debug styling
                const infoDiv = connEl.closest('.klite-info');
                if (infoDiv) {
                    infoDiv.style.border = '';
                    infoDiv.style.backgroundColor = '';
                }
                
                this.log('status', `Updated connection span to: "${connectionText}", color: ${isConnected ? 'green' : 'red'}`);
            } else {
                this.log('status', 'Missing elements for status update');
            }
            
            // Queue and wait are handled by Horde hooks
            // Just update elapsed time for non-Horde generation
            const waitEl = document.getElementById('wait');
            if (waitEl && this.state.generating && !window.pending_response_id?.includes('#')) {
                const seconds = Math.floor((Date.now() - (this.generationStart || Date.now())) / 1000);
                waitEl.textContent = seconds + 's';
            }
        },
        
        startSync() {
            this.log('init', 'Starting synchronization loops');
            
            // Initial sync
            this.syncChat();
            this.updateTokens();
            this.updateModeButtons();
            
            // Add window resize listener for dynamic mobile mode detection
            window.addEventListener('resize', () => {
                this.handleResize();
            });
            
            // Set up connection status observer (no polling!)
            this.setupConnectionObserver();
            
            // Reduced polling - only tokens and mode detection (no connection status)
            setInterval(() => {
                this.updateTokens();
                
                // Check for mode changes and handle them smartly
                const currentMode = window.localsettings?.opmode;
                const lastMode = this.quickButtonState.lastActiveMode;
                
                // Only process if there's a real change and not the initial null state
                if (currentMode && lastMode !== null && currentMode !== lastMode) {
                    this.log('state', `Mode change detected: ${lastMode} → ${currentMode}`);
                    this.updateModeButtons();
                }
            }, 3000); // Reduced frequency since no connection status
        },
        
        // State
        async saveState() {
            try {
                await this.saveToLiteStorage('rpmod_state', JSON.stringify(this.state));
                this.log('state', 'State saved to KoboldAI Lite storage');
            } catch (error) {
                this.error('Failed to save state:', error);
            }
        },
        
        async loadState() {
            try {
                const saved = await this.loadFromLiteStorage('rpmod_state');
                
                if (saved) {
                    const stateData = JSON.parse(saved);
                    Object.assign(this.state, stateData);
                    this.log('state', 'State loaded from KoboldAI Lite storage:', stateData);
                } else {
                    this.log('state', 'No saved state found, using defaults');
                }
            } catch (e) {
                this.error('Failed to load state:', e);
            }
        },
        
        // Helper functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        
        // showMessage() function removed - replaced with alert() for critical messages and console.warn() for development placeholders
        
        // =============================================
        // UNIFIED CHARACTER SELECTION MODAL
        // =============================================
        
        showUnifiedCharacterModal(mode = 'multi-select', onSelectCallback = null) {
            // Create unified modal for character selection
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            
            const isMultiSelect = mode === 'multi-select';
            const title = isMultiSelect ? 'Select Characters for Group' : 'Select Character';
            const description = isMultiSelect ? 
                'Choose characters from the library to add to your group chat.' :
                'Choose a character to apply to your conversation.';
            const buttonText = isMultiSelect ? 'Add Selected Characters' : 'Select Character';
            const selectionType = isMultiSelect ? 'checkbox' : 'radio';
            
            modal.innerHTML = `
                <div class="klite-modal-content" style="background: var(--bg2); border-radius: 8px; padding: 20px; border: 1px solid var(--border); min-width: 600px; max-width: 800px;">
                    <div class="klite-modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="klite-modal-body">
                        <p style="color: var(--muted); font-size: 12px; margin-bottom: 15px;">
                            ${description}
                        </p>
                    
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="unified-char-search" placeholder="Search characters..." 
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin-bottom: 10px;">
                            <select id="unified-char-tag-filter" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="">All Tags</option>
                            </select>
                            <select id="unified-char-rating-filter" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="">All Ratings</option>
                                <option value="5">★★★★★</option>
                                <option value="4">★★★★☆</option>
                                <option value="3">★★★☆☆</option>
                                <option value="2">★★☆☆☆</option>
                                <option value="1">★☆☆☆☆</option>
                            </select>
                            <select id="unified-char-talkativeness-filter" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="">All Talkativeness</option>
                                <option value="high">Very Talkative (80+)</option>
                                <option value="medium">Moderate (40-79)</option>
                                <option value="low">Quiet (10-39)</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 2px; cursor: pointer;">
                                <input type="checkbox" id="unified-include-wi" style="margin: 0;">
                                <span>Include characters from World Info</span>
                            </label>
                        </div>
                    </div>
                    
                    <div id="unified-character-selection-list" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 10px; background: var(--bg); margin-bottom: 15px;">
                        <div style="text-align: center; color: var(--muted); padding: 20px;">Loading characters...</div>
                    </div>
                    
                        <div class="klite-modal-footer">
                            <button class="klite-btn klite-btn-primary" data-action="confirm-unified-char-selection" data-mode="${mode}">
                                ${buttonText}
                            </button>
                            <button class="klite-btn" data-action="close-unified-char-modal">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Store modal settings
            modal.dataset.mode = mode;
            modal.dataset.selectionType = selectionType;
            if (onSelectCallback) {
                window._unifiedModalCallback = onSelectCallback;
            }
            
            document.body.appendChild(modal);
            this.currentUnifiedModal = modal;
            
            // Handle escape key and click outside
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closeUnifiedCharacterModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeUnifiedCharacterModal();
                }
            });
            document.addEventListener('keydown', handleEscape);
            
            // Load character data and setup filters
            setTimeout(() => {
                this.loadUnifiedCharacterList(mode);
                this.setupUnifiedCharacterModalFilters();
            }, 100);
        },
        
        closeUnifiedCharacterModal() {
            if (this.currentUnifiedModal) {
                this.currentUnifiedModal.remove();
                this.currentUnifiedModal = null;
                window._unifiedModalCallback = null;
            }
        },
        
        loadUnifiedCharacterList(mode) {
            const isMultiSelect = mode === 'multi-select';
            const selectionType = isMultiSelect ? 'checkbox' : 'radio';
            
            // Get characters from CHARS panel
            let availableChars = [...(this.characters || [])];
            
            // Filter out already active characters for GROUP mode
            if (isMultiSelect && KLITE_RPMod.panels.GROUP?.activeChars) {
                availableChars = availableChars.filter(c => 
                    !KLITE_RPMod.panels.GROUP.activeChars.find(ac => ac.id === c.id)
                );
            }
            
            // Add WI characters if checkbox is enabled
            const includeWI = document.getElementById('unified-include-wi')?.checked;
            let wiCharacters = [];
            if (includeWI) {
                const wiEntries = window.worldinfo || [];
                wiCharacters = KLITE_RPMod.panels.PLAY_RP.extractWICharacters(wiEntries);
                
                // Filter out duplicates that might exist in both CHARS and WI
                wiCharacters = wiCharacters.filter(wiChar => 
                    !availableChars.find(char => char.name === wiChar.name)
                );
            }
            
            const allCharacters = [...availableChars, ...wiCharacters];
            
            // Populate tag filter
            this.populateUnifiedTagFilter(allCharacters);
            
            // Render character list
            this.renderUnifiedCharacterList(allCharacters, selectionType);
        },
        
        populateUnifiedTagFilter(characters) {
            const tagFilter = document.getElementById('unified-char-tag-filter');
            if (tagFilter) {
                const allTags = new Set();
                characters.forEach(char => {
                    if (char.tags && Array.isArray(char.tags)) {
                        char.tags.forEach(tag => allTags.add(tag));
                    }
                });
                
                // Keep the "All Tags" option and add unique tags
                const currentOptions = Array.from(tagFilter.options).slice(1);
                currentOptions.forEach(option => option.remove());
                
                Array.from(allTags).sort().forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
                    tagFilter.appendChild(option);
                });
            }
        },
        
        renderUnifiedCharacterList(characters, selectionType) {
            const list = document.getElementById('unified-character-selection-list');
            if (!list) return;
            
            if (characters.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; color: var(--muted); padding: 20px;">
                        No characters available. Import some characters first.
                    </div>
                `;
                return;
            }
            
            list.innerHTML = characters.map(char => {
                const avatar = char.image || '';
                const description = char.description || char.content || 'No description available';
                const tags = char.tags || [];
                const talkativeness = char.talkativeness || 50;
                const rating = char.rating || 0;
                const isWIChar = char.type === 'worldinfo';
                const charId = char.id || char.name;
                
                return `
                    <div style="display: flex; align-items: center; gap: 2px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2); cursor: pointer;" 
                         data-action="toggle-unified-char-selection" data-char-id="${charId}" data-selection-type="${selectionType}">
                        <input type="${selectionType}" name="unified-char-selection" value="${charId}" style="margin: 0;" onclick="event.stopPropagation();">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 2px;">
                                ${char.name}
                                ${isWIChar ? '<span style="font-size: 9px; background: var(--accent); color: white; padding: 1px 4px; border-radius: 2px;">WI</span>' : ''}
                            </div>
                            <div style="font-size: 11px; color: var(--muted); margin: 2px 0; max-height: 32px; overflow: hidden;">${description.length > 100 ? description.substring(0, 100) + '...' : description}</div>
                            <div style="font-size: 10px; color: var(--muted); display: flex; align-items: center; gap: 2px;">
                                ${!isWIChar ? `<span>Rating: ${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>` : ''}
                                <span>Talkativeness: ${talkativeness}</span>
                                ${tags.length > 0 ? `<span>Tags: ${tags.slice(0, 3).join(', ')}${tags.length > 3 ? '...' : ''}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        toggleUnifiedCharacterSelection(charId, selectionType) {
            const input = document.querySelector(`input[value="${charId}"]`);
            if (input) {
                if (selectionType === 'radio') {
                    input.checked = true;
                } else {
                    input.checked = !input.checked;
                }
            }
        },
        
        setupUnifiedCharacterModalFilters() {
            const searchInput = document.getElementById('unified-char-search');
            const tagFilter = document.getElementById('unified-char-tag-filter');
            const ratingFilter = document.getElementById('unified-char-rating-filter');
            const talkFilter = document.getElementById('unified-char-talkativeness-filter');
            const wiCheckbox = document.getElementById('unified-include-wi');
            
            const refreshList = () => {
                const mode = this.currentUnifiedModal?.dataset.mode || 'multi-select';
                this.loadUnifiedCharacterList(mode);
            };
            
            if (searchInput) {
                searchInput.addEventListener('input', refreshList);
            }
            if (tagFilter) {
                tagFilter.addEventListener('change', refreshList);
            }
            if (ratingFilter) {
                ratingFilter.addEventListener('change', refreshList);
            }
            if (talkFilter) {
                talkFilter.addEventListener('change', refreshList);
            }
            if (wiCheckbox) {
                wiCheckbox.addEventListener('change', refreshList);
            }
        },
        
        confirmUnifiedCharacterSelection(mode) {
            const isMultiSelect = mode === 'multi-select';
            
            if (isMultiSelect) {
                // GROUP mode - handle multiple selections
                const checkboxes = document.querySelectorAll('#unified-character-selection-list input[type="checkbox"]:checked');
                
                if (checkboxes.length === 0) {
                    alert('No characters selected');
                    return;
                }
                
                // Add to GROUP panel
                if (KLITE_RPMod.panels.GROUP) {
                    let added = 0;
                    checkboxes.forEach(checkbox => {
                        const charId = checkbox.value;
                        const char = this.findCharacterForUnifiedModal(charId);
                        if (char && !KLITE_RPMod.panels.GROUP.activeChars.find(ac => ac.id === char.id || ac.name === char.name)) {
                            char.isCustom = false;
                            KLITE_RPMod.panels.GROUP.activeChars.push(char);
                            added++;
                        }
                    });
                    
                    KLITE_RPMod.panels.GROUP.refresh();
                    // Character addition confirmed by visual update in group list
                }
            } else {
                // PLAY_RP mode - handle single selection
                const radio = document.querySelector('#unified-character-selection-list input[type="radio"]:checked');
                
                if (!radio) {
                    alert('Please select a character');
                    return;
                }
                
                const charId = radio.value;
                const char = this.findCharacterForUnifiedModal(charId);
                
                if (char) {
                    // Call the callback if provided, or apply directly to PLAY_RP
                    if (window._unifiedModalCallback) {
                        window._unifiedModalCallback(char);
                    } else {
                        this.applyCharacterToPlayRP(char);
                    }
                }
            }
            
            this.closeUnifiedCharacterModal();
        },
        
        findCharacterForUnifiedModal(charId) {
            // First check CHARS
            let char = this.characters.find(c => c.id == charId);
            if (char) return char;
            
            // Then check WI characters
            const wiEntries = window.worldinfo || [];
            const wiCharacters = KLITE_RPMod.panels.PLAY_RP.extractWICharacters(wiEntries);
            return wiCharacters.find(c => c.name === charId);
        },
        
        applyCharacterToPlayRP(char) {
            // Apply character to PLAY_RP panel
            if (KLITE_RPMod.panels.PLAY_RP) {
                KLITE_RPMod.panels.PLAY_RP.selectedCharacter = char;
                KLITE_RPMod.panels.PLAY_RP.characterEnabled = true;
                
                // Apply to Lite
                if (char.type === 'worldinfo') {
                    // WI character
                    if (window.current_memory) {
                        window.current_memory += '\\n\\n' + char.content;
                    } else {
                        window.current_memory = char.content;
                    }
                } else {
                    // CHARS character
                    KLITE_RPMod.panels.PLAY_RP.applyCharacterData(char);
                }
                
                // Refresh the panel
                this.loadPanel('left', 'PLAY');
                // Character application confirmed by UI state change
            }
        },
        
        // =============================================
        // CHARACTER HELPER METHODS
        // =============================================
        
        async saveCharacters() {
            try {
                const charactersData = {
                    version: '1.0',
                    saved: new Date().toISOString(),
                    characters: this.characters
                };
                
                const jsonData = JSON.stringify(charactersData);
                console.log('[KLITE RPMod] Saving:', this.characters.length, 'characters, data size:', Math.round(jsonData.length / 1024), 'KB');
                
                await this.saveToLiteStorage('rpmod_characters', jsonData);
                console.log('[KLITE RPMod] SUCCESS: Characters saved to KoboldAI Lite storage');
                this.log('state', `Characters saved: ${this.characters.length} characters`);
                
            } catch (error) {
                console.error('[KLITE RPMod] CRITICAL: Failed to save characters:', error);
                console.error('[KLITE RPMod] CRITICAL: Failed to save characters - data will be lost on reload!', error.message);
                this.error('Failed to save characters:', error);
            }
        },
        
        async initializeStorageKeys() {
            this.log('init', 'Initializing storage keys for first-time users...');
            
            // Initialize rpmod_state if it doesn't exist
            const stateExists = await this.loadFromLiteStorage('rpmod_state');
            if (!stateExists) {
                this.log('init', 'Creating default rpmod_state');
                await this.saveState();
            }
            
            // Initialize rpmod_characters if it doesn't exist
            const charactersExists = await this.loadFromLiteStorage('rpmod_characters');
            if (!charactersExists) {
                this.log('init', 'Creating default rpmod_characters');
                await this.saveCharacters();
            }
        },
        
        async saveToLiteStorage(key, data) {
            if (typeof window.indexeddb_save !== 'function') {
                console.warn('[KLITE RPMod] Storage not ready yet, data will be lost on reload:', key);
                return false;
            }
            
            try {
                await window.indexeddb_save(key, data);
                console.log('[KLITE RPMod] Successfully saved to storage:', key);
                return true;
            } catch (error) {
                console.error('[KLITE RPMod] Failed to save to storage:', key, error);
                return false;
            }
        },
        
        async loadFromLiteStorage(key) {
            if (typeof window.indexeddb_load !== 'function') {
                console.warn('[KLITE RPMod] Storage not ready yet, cannot load:', key);
                return null;
            }
            
            try {
                const result = await window.indexeddb_load(key, null);
                return result;
            } catch (error) {
                // Key doesn't exist yet - this is expected for first-time users
                console.log('[KLITE RPMod] Storage key does not exist yet, will be created on first save:', key);
                return null;
            }
        },
        
        async loadCharacters() {
            try {
                console.log('[KLITE RPMod] Loading characters from KoboldAI Lite storage...');
                
                const liteStorageData = await this.loadFromLiteStorage('rpmod_characters');
                if (liteStorageData && liteStorageData !== 'offload_to_indexeddb') {
                    const data = JSON.parse(liteStorageData);
                    console.log('[KLITE RPMod] Found characters in storage:', data?.characters?.length || 0);
                    
                    if (data) {
                        // Handle both legacy format and new format
                        if (Array.isArray(data)) {
                            // Legacy format: direct array
                            this.characters = data;
                            console.log('[KLITE RPMod] SUCCESS: Loaded legacy format:', this.characters.length, 'characters');
                            this.log('state', `Characters loaded (legacy format): ${this.characters.length} characters`);
                        } else if (data.characters && Array.isArray(data.characters)) {
                            // New format: wrapper object
                            this.characters = data.characters;
                            console.log('[KLITE RPMod] SUCCESS: Loaded v' + data.version + ':', this.characters.length, 'characters');
                            this.log('state', `Characters loaded (v${data.version}): ${this.characters.length} characters`);
                        } else {
                            console.error('[KLITE RPMod] ERROR: Invalid data format!', data);
                            this.characters = [];
                            console.warn('[KLITE RPMod] Invalid character data format found in storage. Starting fresh.');
                        }
                    } else {
                        this.characters = [];
                    }
                } else {
                    console.log('[KLITE RPMod] No character data found in storage - starting fresh');
                    this.characters = [];
                }
                
            } catch (error) {
                console.error('[KLITE RPMod] CRITICAL: Failed to load characters:', error);
                this.characters = [];
                console.warn('[KLITE RPMod] Starting with empty character list due to storage error:', error.message);
                this.error('Failed to load characters:', error);
            }
        },
        
        // Find character by ID
        findCharacterById(id) {
            return this.characters.find(char => char.id == id);
        },
        
        // Find characters by name (case-insensitive)
        findCharactersByName(name) {
            const searchName = name.toLowerCase();
            return this.characters.filter(char => 
                char.name.toLowerCase().includes(searchName)
            );
        },
        
        // Update character data
        updateCharacter(id, updates) {
            const index = this.characters.findIndex(char => char.id == id);
            if (index !== -1) {
                const char = this.characters[index];
                Object.assign(char, updates);
                char.lastModified = Date.now();
                this.saveCharacters();
                this.log('state', `Character updated: ${char.name}`);
                return char;
            }
            return null;
        },
        
        // Get character usage statistics
        getCharacterStats() {
            const stats = {
                total: this.characters.length,
                byCategory: {},
                byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                mostUsed: null,
                recentlyAdded: [],
                favorites: []
            };
            
            this.characters.forEach(char => {
                // Category stats
                const category = char.category || 'General';
                stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
                
                // Rating stats
                const rating = Math.round(char.rating?.userRating || 0);
                if (rating >= 1 && rating <= 5) {
                    stats.byRating[rating]++;
                }
                
                // Most used
                if (!stats.mostUsed || char.stats?.timesUsed > stats.mostUsed.stats?.timesUsed) {
                    stats.mostUsed = char;
                }
                
                // Favorites
                if (char.isFavorite) {
                    stats.favorites.push(char);
                }
            });
            
            // Recently added (last 7 days)
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            stats.recentlyAdded = this.characters
                .filter(char => char.created > weekAgo)
                .sort((a, b) => b.created - a.created);
            
            return stats;
        },
        
        // Mark character as used (for statistics)
        markCharacterAsUsed(id) {
            const char = this.findCharacterById(id);
            if (char) {
                char.lastUsed = Date.now();
                if (!char.stats) char.stats = {};
                char.stats.timesUsed = (char.stats.timesUsed || 0) + 1;
                this.saveCharacters();
                this.log('state', `Character marked as used: ${char.name} (${char.stats.timesUsed} times)`);
            }
        },
        
        // Import characters from file data
        importCharactersFromData(data) {
            let imported = 0;
            
            try {
                // Handle different import formats
                let charactersToImport = [];
                
                if (Array.isArray(data)) {
                    charactersToImport = data;
                } else if (data.characters && Array.isArray(data.characters)) {
                    charactersToImport = data.characters;
                } else if (data.name) {
                    // Single character
                    charactersToImport = [data];
                }
                
                charactersToImport.forEach(charData => {
                    // Check if character already exists (by name and creator)
                    const existing = this.characters.find(char => 
                        char.name === charData.name && 
                        char.creator === charData.creator
                    );
                    
                    if (!existing) {
                        // Always use the CHARS panel's addCharacter method for proper metadata preservation
                        if (KLITE_RPMod.panels?.CHARS?.addCharacter) {
                            KLITE_RPMod.panels.CHARS.addCharacter(charData);
                            imported++;
                        } else {
                            throw new Error('CHARS panel not available. Character import requires proper panel initialization.');
                        }
                    }
                });
                
                if (imported > 0) {
                    this.saveCharacters();
                    // Imported ${imported} characters
                }
                
                this.log('state', `Import complete: ${imported} characters imported`);
                return imported;
                
            } catch (error) {
                this.error('Failed to import characters:', error);
                return 0;
            }
        },
        
        // Export characters to downloadable file
        exportCharactersToFile(filename) {
            try {
                const exportData = {
                    version: '1.0',
                    exported: new Date().toISOString(),
                    characters: this.characters
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || `klite-characters-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Exported ${this.characters.length} characters
                this.log('state', `Characters exported to file: ${a.download}`);
                
            } catch (error) {
                this.error('Failed to export characters:', error);
            }
        }
    };

    // =============================================
    // RP MODE FORMATTING SYSTEM
    // =============================================
    
    KLITE_RPMod.onRPModeEnter = function() {
        this.log('rp', 'Entering RP mode - applying roleplay formatting');
        this.updateRPStyle();
        setTimeout(() => {
            this.formatRPContent();
        }, 200);
    };
    
    KLITE_RPMod.onRPModeExit = function() {
        this.log('rp', 'Exiting RP mode - removing roleplay formatting');
        
        // Remove RP formatting
        const gametext = document.getElementById('gametext');
        if (!gametext) return;
        
        // Remove all RP classes and containers
        const chunks = Array.from(gametext.children);
        chunks.forEach(chunk => {
            if (chunk.classList.contains('rp-message-container')) {
                // Extract original content from container and restore it
                const messageElement = chunk.querySelector('.rp-message-content');
                if (messageElement) {
                    messageElement.classList.remove('rp-message-content', 'rp-user-message', 'rp-ai-message');
                    messageElement.style.animation = '';
                    // Replace container with original message element
                    chunk.parentNode.insertBefore(messageElement, chunk);
                }
                chunk.remove();
            } else {
                // Old format cleanup
                chunk.classList.remove('rp-message-container', 'rp-message-content', 'rp-user-message', 'rp-ai-message');
                chunk.style.animation = '';
            }
        });
        
        // Remove RP CSS
        const rpStyle = document.getElementById('rp-style-css');
        if (rpStyle) rpStyle.remove();
    };
    
    KLITE_RPMod.updateRPStyle = function() {
        // Add RP styles to the page
        const existingStyle = document.getElementById('rp-style-css');
        if (existingStyle) existingStyle.remove();
        
        const rpStyles = `
            <style id="rp-style-css">
                /* RP Mode Styling - Discord/Forum Style */
                
                /* RP Message Container */
                .rp-message-container {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    background: var(--bg2);
                    border: 1px solid var(--border);
                    gap: 12px;
                    transition: background-color 0.2s ease;
                }
                
                .rp-message-container:hover {
                    background: var(--bg3);
                }
                
                /* RP Avatar */
                .rp-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid var(--border);
                    object-fit: cover;
                    flex-shrink: 0;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .rp-avatar.user-avatar {
                    border-color: var(--accent);
                }
                
                .rp-avatar.ai-avatar {
                    border-color: var(--success);
                }
                
                /* RP Message Content Area */
                .rp-message-content-area {
                    flex: 1;
                    min-width: 0;
                }
                
                /* RP Message Header */
                .rp-message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }
                
                .rp-speaker-name {
                    font-weight: bold;
                    font-size: 14px;
                    color: var(--text);
                }
                
                .rp-speaker-name.user-speaker {
                    color: var(--accent);
                }
                
                .rp-speaker-name.ai-speaker {
                    color: var(--success);
                }
                
                .rp-message-timestamp {
                    font-size: 11px;
                    color: var(--muted);
                    margin-left: auto;
                }
                
                .rp-character-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 12px;
                    background: var(--bg3);
                    color: var(--muted);
                    border: 1px solid var(--border);
                }
                
                /* RP Message Content */
                .rp-message-content {
                    font-size: 14px;
                    line-height: 1.5;
                    color: var(--text);
                    word-wrap: break-word;
                    margin: 0;
                    padding: 0;
                }
                
                .rp-message-content.rp-user-message {
                    font-style: italic;
                }
                
                /* Special styling for actions (text in asterisks) */
                .rp-message-content em,
                .rp-message-content i {
                    color: var(--muted);
                    font-style: italic;
                }
                
                /* Animation for new messages */
                @keyframes rpMessageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .rp-message-container {
                    animation: rpMessageSlideIn 0.3s ease-out;
                }
                
                /* Dark mode adjustments */
                .klite-active .rp-message-container {
                    background: var(--bg2);
                    border-color: var(--border);
                }
                
                .klite-active .rp-message-container:hover {
                    background: var(--bg3);
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', rpStyles);
    };
    
    KLITE_RPMod.formatRPContent = function() {
        // Only format content when in RP mode (mode 4)
        if (window.localsettings?.opmode !== 4) return;
        
        const gametext = document.getElementById('gametext');
        if (!gametext) return;
        
        // Get all text chunks in the game text
        const chunks = Array.from(gametext.children);
        
        chunks.forEach(chunk => {
            // Skip if already formatted (has container or is a container)
            if (chunk.classList.contains('rp-message-container') || 
                chunk.classList.contains('rp-message-content') ||
                chunk.closest('.rp-message-container')) return;
            
            const content = chunk.textContent.trim();
            if (!content) return;
            
            // Enhanced user message detection for RP mode
            const isUserMessage = 
                // KoboldAI Lite native detection
                chunk.classList.contains('usermessage') ||
                chunk.id === 'usermessage' ||
                chunk.getAttribute('data-source') === 'user' ||
                
                // RP mode patterns
                content.startsWith('You ') ||
                content.startsWith('You:') ||
                content.match(/^[A-Z][a-z]+\s*:/) ||
                content.match(/^\*[A-Z][a-z]+/) ||
                content.match(/^".*"$/) ||
                
                // User input detection
                content.match(/^\[[Yy]ou\]/) ||
                content.match(/^\[[Uu]ser\]/) ||
                content.match(/^\[[Pp]layer\]/) ||
                
                // Input field detection
                (chunk.style && chunk.style.textAlign === 'right') ||
                chunk.classList.contains('user-input');
            
            // Get appropriate avatar and character info
            const avatarInfo = this.getRPMessageInfo(isUserMessage, content);
            
            // Create container div
            const container = document.createElement('div');
            container.className = 'rp-message-container';
            
            // Create avatar element
            const avatar = document.createElement('img');
            avatar.className = `rp-avatar ${isUserMessage ? 'user-avatar' : 'ai-avatar'}`;
            avatar.src = avatarInfo.avatar;
            avatar.alt = avatarInfo.name;
            avatar.title = avatarInfo.name;
            
            // Create content area
            const contentArea = document.createElement('div');
            contentArea.className = 'rp-message-content-area';
            
            // Create message header
            const header = document.createElement('div');
            header.className = 'rp-message-header';
            
            const speakerName = document.createElement('span');
            speakerName.className = `rp-speaker-name ${isUserMessage ? 'user-speaker' : 'ai-speaker'}`;
            speakerName.textContent = avatarInfo.name;
            header.appendChild(speakerName);
            
            // Add character badge if it's a character (not default)
            if (avatarInfo.isCharacter) {
                const badge = document.createElement('span');
                badge.className = 'rp-character-badge';
                badge.textContent = 'Character';
                header.appendChild(badge);
            }
            
            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'rp-message-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();
            header.appendChild(timestamp);
            
            contentArea.appendChild(header);
            
            // Clone the original chunk to preserve its content and styling
            const messageElement = chunk.cloneNode(true);
            
            // Remove any existing formatting from the cloned element
            messageElement.classList.remove('rp-message-container', 'rp-message-content', 'rp-user-message', 'rp-ai-message');
            
            // Add new formatting to the message element
            messageElement.className = 'rp-message-content';
            if (isUserMessage) {
                messageElement.classList.add('rp-user-message');
            } else {
                messageElement.classList.add('rp-ai-message');
            }
            
            contentArea.appendChild(messageElement);
            
            // Assemble the container
            container.appendChild(avatar);
            container.appendChild(contentArea);
            
            // Replace original chunk with container
            chunk.parentNode.insertBefore(container, chunk);
            chunk.remove();
            
            // Debug log
            this.log('rp', `Formatted RP message: ${isUserMessage ? 'USER' : 'AI'} (${avatarInfo.name}) - "${content.substring(0, 50)}..."`);
        });
    };
    
    KLITE_RPMod.getRPMessageInfo = function(isUserMessage, content) {
        if (isUserMessage) {
            // User message - get persona info or use default
            const personaName = this.panels.PLAY_RP?.selectedPersona?.name || 'You';
            const personaAvatar = this.userAvatarCurrent || this.userAvatarDefault;
            const isCharacter = this.panels.PLAY_RP?.selectedPersona ? true : false;
            
            return {
                name: personaName,
                avatar: personaAvatar,
                isCharacter: isCharacter
            };
        } else {
            // AI message - get character info
            const isGroupChatActive = this.panels.GROUP?.enabled || false;
            
            if (isGroupChatActive && this.panels.GROUP?.activeChars) {
                // Try to determine which character is speaking based on content
                const speakingChar = this.panels.GROUP.activeChars.find(char => {
                    const name = char.name.toLowerCase();
                    return content.toLowerCase().includes(name + ':') || 
                           content.toLowerCase().startsWith(name);
                });
                
                if (speakingChar) {
                    return {
                        name: speakingChar.name,
                        avatar: speakingChar.avatar || this.aiAvatarDefault,
                        isCharacter: true
                    };
                }
                
                // Fallback: use current speaker
                const currentSpeaker = this.panels.GROUP.getCurrentSpeaker();
                if (currentSpeaker) {
                    return {
                        name: currentSpeaker.name,
                        avatar: currentSpeaker.avatar || this.aiAvatarDefault,
                        isCharacter: true
                    };
                }
            }
            
            // Single character mode or fallback
            const characterName = this.panels.PLAY_RP?.selectedCharacter?.name || 'AI Assistant';
            const characterAvatar = this.aiAvatarCurrent || this.aiAvatarDefault;
            const isCharacter = this.panels.PLAY_RP?.selectedCharacter ? true : false;
            
            return {
                name: characterName,
                avatar: characterAvatar,
                isCharacter: isCharacter
            };
        }
    };

// =============================================
    // 4. PANEL DEFINITIONS - PART 1
    // =============================================
    
    // PLAY_STORY Panel
    KLITE_RPMod.panels.PLAY_STORY = {
        chapters: [],
        
        render() {
            return `
                <!-- Timeline -->
                ${t.section('Timeline / Index',
                    `<div id="story-timeline" class="klite-timeline">
                        ${this.chapters.length ? this.renderChapters() : '<div class="klite-center klite-muted">No chapters yet</div>'}
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Add Chapter', '', 'add-chapter')}
                        ${t.button('Delete All', 'danger', 'delete-chapters')}
                    </div>`
                )}
                
                <!-- Generation Control -->
                ${t.section('Generation Control',
                    KLITE_RPMod.renderGenerationControl('story')
                )}
            `;
        },
        
        async init() {
            await this.loadChapters();
        },
        
        actions: {
            'add-chapter': () => KLITE_RPMod.panels.PLAY_STORY.addChapter(),
            'delete-chapters': () => KLITE_RPMod.panels.PLAY_STORY.deleteAllChapters(),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic'),
            'goto-chapter': (e) => {
                const chapterIndex = parseInt(e.target.closest('[data-chapter]').dataset.chapter);
                KLITE_RPMod.panels.PLAY_STORY.goToChapter(chapterIndex);
            }
        },
        
        renderChapters() {
            return this.chapters.map((ch, i) => `
                <div class="klite-timeline-item" data-chapter="${i}" data-action="goto-chapter" style="cursor: pointer;">
                    <strong>Chapter ${ch.number}:</strong> ${ch.title}
                    <div style="font-size: 11px; color: #999;">${ch.wordCount} words</div>
                </div>
            `).join('');
        },
        
        
        async loadChapters() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_story_chapters');
            if (saved) {
                this.chapters = JSON.parse(saved);
                KLITE_RPMod.log('state', `Loaded ${this.chapters.length} chapters from storage`);
            }
        },
        
        saveChapters() {
            KLITE_RPMod.saveToLiteStorage('rpmod_story_chapters', JSON.stringify(this.chapters));
            KLITE_RPMod.log('state', `Saved ${this.chapters.length} chapters to storage`);
        },
        
        addChapter() {
            const title = prompt('Enter chapter title:', `Chapter ${this.chapters.length + 1}`);
            if (!title) return;
            
            const wordCount = window.gametext_arr ? 
                gametext_arr.join(' ').split(/\s+/).filter(w => w).length : 0;
            
            this.chapters.push({
                number: this.chapters.length + 1,
                title: title,
                wordCount: wordCount,
                position: document.getElementById('chat-display')?.scrollTop || 0
            });
            
            this.saveChapters();
            this.updateTimeline();
            KLITE_RPMod.log('panels', `Chapter added: ${title}`);
        },
        
        deleteAllChapters() {
            if (confirm('Delete all chapters?')) {
                this.chapters = [];
                this.saveChapters();
                this.updateTimeline();
                KLITE_RPMod.log('panels', 'All chapters deleted');
            }
        },
        
        updateTimeline() {
            const timeline = document.getElementById('story-timeline');
            if (timeline) {
                timeline.innerHTML = this.chapters.length ? this.renderChapters() : '<div class="klite-center klite-muted">No chapters yet</div>';
            }
        },
        
        goToChapter(index) {
            const chapter = this.chapters[index];
            if (chapter && typeof chapter.position === 'number') {
                const chatDisplay = document.getElementById('chat-display');
                if (chatDisplay) {
                    chatDisplay.scrollTop = chapter.position;
                    // Chapter jump confirmed by scroll position
                    KLITE_RPMod.log('panels', `Scrolled to chapter ${chapter.number} at position ${chapter.position}`);
                }
            }
        },
        
        
        applyPreset(preset) {
            KLITE_RPMod.log('panels', `Applying story preset: ${preset}`);
            
            const presets = {
                precise: { creativity: 20, focus: 20, repetition: 80 },
                koboldai: { creativity: 16, focus: 100, repetition: 19 },
                creative: { creativity: 80, focus: 60, repetition: 40 },
                chaotic: { creativity: 95, focus: 90, repetition: 10 }
            };
            
            const settings = presets[preset];
            if (settings) {
                // Update sliders with correct IDs and trigger their change events
                Object.entries(settings).forEach(([key, value]) => {
                    const sliderId = `story-${key}-slider`;
                    const slider = document.getElementById(sliderId);
                    if (slider) {
                        slider.value = value;
                        // Use shared methods
                        KLITE_RPMod.updateSettingsFromSlider(key, value);
                        KLITE_RPMod.updateSliderDisplays(key, value, 'story');
                    }
                });
                
                // Update active button
                document.querySelectorAll('[data-action^="preset-"]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.action === `preset-${preset}`);
                });
                
                // Save settings
                window.save_settings?.();
                // Preset application confirmed by UI changes
            }
        }
    };
    
    // PLAY_ADV Panel
    KLITE_RPMod.panels.PLAY_ADV = {
        quickActions: ['>Look Around', '>Search', '>Check Inventory', '>Rest', '>Continue'],
        
        render() {
            return `
                <!-- Quick Actions -->
                ${t.section('Quick Actions',
                    `<div style="display: grid; gap: 4px;">
                        ${this.quickActions.map((action, i) => `
                            <div class="klite-row" style="display: grid; grid-template-columns: 1fr auto; gap: 2px; align-items: center;">
                                <input id="adv-quick-${i}" type="text" value="${action}" 
                                       style="padding: 4px 8px; font-size: 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; color: var(--text);"
                                       placeholder="">
                                <button class="klite-btn klite-btn-sm" data-action="quick-${i}" 
                                        style="padding: 4px 12px; font-size: 12px; min-width: 32px;">
                                    ${i+1}
                                </button>
                            </div>
                        `).join('')}
                    </div>`
                )}
                
                <!-- Generation Control -->
                ${t.section('Generation Control',
                    KLITE_RPMod.renderGenerationControl('adv')
                )}
            `;
        },
        
        async init() {
            await this.loadQuickActions();
            this.initQuickActions();
        },
        
        cleanup() {
            // Remove event listeners to prevent memory leaks
            this.quickActions.forEach((action, i) => {
                const input = document.getElementById(`adv-quick-${i}`);
                if (input) {
                    // Clone and replace element to remove all listeners
                    const newInput = input.cloneNode(true);
                    input.parentNode.replaceChild(newInput, input);
                }
            });
        },
        
        actions: {
            'quick-0': () => KLITE_RPMod.panels.PLAY_ADV.sendQuickAction(0),
            'quick-1': () => KLITE_RPMod.panels.PLAY_ADV.sendQuickAction(1),
            'quick-2': () => KLITE_RPMod.panels.PLAY_ADV.sendQuickAction(2),
            'quick-3': () => KLITE_RPMod.panels.PLAY_ADV.sendQuickAction(3),
            'quick-4': () => KLITE_RPMod.panels.PLAY_ADV.sendQuickAction(4),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic')
        },
        
        
        async loadQuickActions() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_adv_actions');
            if (saved) {
                this.quickActions = JSON.parse(saved);
                KLITE_RPMod.log('state', `Loaded ${this.quickActions.length} quick actions from storage`);
            }
        },
        
        initQuickActions() {
            // Set up DOM event listeners and sync values
            this.quickActions.forEach((action, i) => {
                const input = document.getElementById(`adv-quick-${i}`);
                if (input) {
                    input.value = action;
                    input.addEventListener('input', () => {
                        this.quickActions[i] = input.value;
                        this.saveQuickActions();
                    });
                }
            });
        },
        
        saveQuickActions() {
            KLITE_RPMod.saveToLiteStorage('rpmod_adv_actions', JSON.stringify(this.quickActions));
            KLITE_RPMod.log('state', `Saved ${this.quickActions.length} quick actions to storage`);
        },
        
        sendQuickAction(index) {
            const action = this.quickActions[index];
            if (action) {
                const input = document.getElementById('input');
                if (input) {
                    input.value = action;
                    KLITE_RPMod.log('panels', `Quick action sent: ${action}`);
                    KLITE_RPMod.submit();
                }
            }
        },
        
        
        
        applyPreset(preset) {
            KLITE_RPMod.log('panels', `Applying adventure preset: ${preset}`);
            
            const presets = {
                precise: { creativity: 20, focus: 20, repetition: 80 },
                koboldai: { creativity: 16, focus: 100, repetition: 19 },
                creative: { creativity: 80, focus: 60, repetition: 40 },
                chaotic: { creativity: 95, focus: 90, repetition: 10 }
            };
            
            const settings = presets[preset];
            if (settings) {
                // Update sliders with correct IDs and trigger their change events
                Object.entries(settings).forEach(([key, value]) => {
                    const sliderId = `adv-${key}-slider`;
                    const slider = document.getElementById(sliderId);
                    if (slider) {
                        slider.value = value;
                        // Use shared methods
                        KLITE_RPMod.updateSettingsFromSlider(key, value);
                        KLITE_RPMod.updateSliderDisplays(key, value, 'adv');
                    }
                });
                
                // Update active button
                document.querySelectorAll('[data-action^="preset-"]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.action === `preset-${preset}`);
                });
                
                // Save settings
                window.save_settings?.();
                // Preset application confirmed by UI changes
            }
        }
    };
    
    // PLAY_RP Panel
    KLITE_RPMod.panels.PLAY_RP = {
        rules: '',
        personaEnabled: false,
        characterEnabled: false,
        selectedPersona: null,
        selectedCharacter: null,
        storedModeBeforeEdit: null,
        autoSender: {
            enabled: false,
            interval: 30,
            message: 'Continue.',
            startMessage: '',
            quickMessages: ['', '', '', '', ''],
            currentCount: 0,
            timer: null,
            isPaused: false,
            isStarted: false
        },
        saveSlots: {
            current: 0,
            saves: new Array(5).fill(null)
        },
        
        render() {
            return `
                <!-- System Prompt -->
                ${t.section('System Prompt / Rules',
                    `<textarea id="rp-rules" class="klite-textarea" placeholder="SP / JB / Rules for the AI..." style="min-height: 120px;">${this.rules || ''}</textarea>
                    <div class="klite-narrator-explanation" style="margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px; color: var(--muted);">
                        System prompt and rules for the AI get added after context to have the highest relevance before prompt.
                    </div>`
                )}
                
                <!-- Auto-Save & Quick Save Slots -->
                ${t.section('Auto-Save & Quick Save Slots',
                    `<div class="klite-save-controls">
                        <div class="klite-row">
                            ${t.checkbox('rp-autosave', 'Auto-save enabled (Lite\'s)', true)}
                            <span id="rp-rules-status" style="font-size: 11px; color: var(--muted); margin-left: auto;"></span>
                        </div>
                        <div class="klite-save-slots" style="margin-top: 10px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 12px;">Quick Save Slots (only TEMPORARY per session!!)</label>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                ${[1, 2, 3, 4, 5].map(i => {
                                    const hasSave = this.saveSlots.saves[i-1] !== null;
                                    const slotClass = hasSave ? 'klite-save-slot-filled' : 'klite-save-slot-empty';
                                    const slotName = hasSave ? (this.saveSlots.saves[i-1]?.name || `Slot ${i}`) : `Empty Slot ${i}`;
                                    return `
                                    <div class="klite-save-slot-row ${slotClass}" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2px; align-items: center;">
                                        <div class="klite-slot-name" style="padding: 4px 8px; background: var(--bg3); border-radius: 4px; font-size: 12px; ${hasSave ? 'color: var(--success); font-weight: bold;' : 'color: var(--muted);'}">${slotName}</div>
                                        ${t.button('Save', 'klite-btn-sm', `save-slot-${i}`)}
                                        ${t.button('Load', hasSave ? 'klite-btn-sm' : 'klite-btn-sm disabled', `load-slot-${i}`)}
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                    </div>`
                )}
                
                <!-- Chat Settings -->
                ${t.section('Chat Settings',
                    `<div style="display: grid; gap: 2px;">
                        <div class="klite-row">
                            ${t.checkbox('streaming-enabled', 'Enable Streaming', window.localsettings?.stream || false)}
                        </div>
                        <div class="klite-row">
                            ${t.checkbox('auto-scroll', 'Auto Scroll', true)}
                        </div>
                    </div>`
                )}
                
                <!-- Generation Control -->
                ${t.section('Generation Control',
                    KLITE_RPMod.renderGenerationControl('rp')
                )}
                
                <!-- Character & Persona Integration -->
                ${t.section('Character & Persona Integration',
                    `<div class="klite-char-persona-controls">
                        ${this.renderPersonaControls()}
                        ${this.renderCharacterControls()}
                    </div>`
                )}
                
                <!-- Narrator Controls -->
                ${t.section('Narrator Controls',
                    `<div class="klite-narrator-controls">
                        <div class="klite-row">
                            ${t.select('narrator-style', [
                                {value: 'omniscient', text: 'Omniscient', selected: true},
                                {value: 'limited', text: 'Limited'},
                                {value: 'objective', text: 'Objective'},
                                {value: 'character', text: 'Character POV'}
                            ])}
                        </div>
                        <div class="klite-row" style="margin-top: 6px;">
                            ${t.select('narrator-focus', [
                                {value: 'environment', text: 'Environment'},
                                {value: 'emotions', text: 'Emotions'},
                                {value: 'action', text: 'Actions'},
                                {value: 'dialogue', text: 'Dialogue'},
                                {value: 'mixed', text: 'Mixed', selected: true}
                            ])}
                        </div>
                        <div class="klite-narrator-explanation" style="margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px; color: var(--muted);">
                            <div id="narrator-explanation-text">
                                <strong>Omniscient:</strong> The narrator knows all characters' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.
                            </div>
                        </div>
                        <div class="klite-row" style="margin-top: 10px;">
                            ${t.button('🎬 Trigger Narrator', 'klite-btn-primary', 'narrator')}
                        </div>
                    </div>`
                )}
                
                <!-- Auto Sender -->
                ${t.section('Auto Sender', 
                    `<div class="klite-auto-sender">
                        ${this.renderAutoSender()}
                    </div>`
                )}
                
            `;
        },
        
        async init() {
            await this.setupAutoSave();
            this.setupCharacterIntegration();
            await this.setupAutoSender();
            this.setupQuickActions();
        },
        
        actions: {
            'narrator': () => KLITE_RPMod.panels.PLAY_RP.triggerNarrator(),
            'skip-time': () => KLITE_RPMod.panels.PLAY_RP.skipTime(),
            'edit-last': () => KLITE_RPMod.panels.PLAY_RP.editLast(),
            'delete-last': () => KLITE_RPMod.panels.PLAY_RP.deleteLast(),
            'regenerate': () => KLITE_RPMod.panels.PLAY_RP.regenerate(),
            'undo': () => KLITE_RPMod.panels.PLAY_RP.undo(),
            'redo': () => KLITE_RPMod.panels.PLAY_RP.redo(),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic'),
            'auto-start': () => KLITE_RPMod.panels.PLAY_RP.handleAutoStart(),
            'auto-pause': () => KLITE_RPMod.panels.PLAY_RP.handleAutoPause(),
            'auto-continue': () => KLITE_RPMod.panels.PLAY_RP.handleAutoContinue(),
            'auto-stop': () => KLITE_RPMod.panels.PLAY_RP.handleAutoStop(),
            'auto-reset': () => KLITE_RPMod.panels.PLAY_RP.handleAutoReset(),
            'quick-send-1': () => KLITE_RPMod.panels.PLAY_RP.handleQuickSend(1),
            'quick-send-2': () => KLITE_RPMod.panels.PLAY_RP.handleQuickSend(2),
            'quick-send-3': () => KLITE_RPMod.panels.PLAY_RP.handleQuickSend(3),
            'quick-send-4': () => KLITE_RPMod.panels.PLAY_RP.handleQuickSend(4),
            'quick-send-5': () => KLITE_RPMod.panels.PLAY_RP.handleQuickSend(5),
            
            // Save/Load slot actions
            'save-slot-1': () => KLITE_RPMod.panels.PLAY_RP.handleSaveSlot(1),
            'save-slot-2': () => KLITE_RPMod.panels.PLAY_RP.handleSaveSlot(2),
            'save-slot-3': () => KLITE_RPMod.panels.PLAY_RP.handleSaveSlot(3),
            'save-slot-4': () => KLITE_RPMod.panels.PLAY_RP.handleSaveSlot(4),
            'save-slot-5': () => KLITE_RPMod.panels.PLAY_RP.handleSaveSlot(5),
            'load-slot-1': () => KLITE_RPMod.panels.PLAY_RP.handleLoadSlot(1),
            'load-slot-2': () => KLITE_RPMod.panels.PLAY_RP.handleLoadSlot(2),
            'load-slot-3': () => KLITE_RPMod.panels.PLAY_RP.handleLoadSlot(3),
            'load-slot-4': () => KLITE_RPMod.panels.PLAY_RP.handleLoadSlot(4),
            'load-slot-5': () => KLITE_RPMod.panels.PLAY_RP.handleLoadSlot(5),
            
            // Character & Persona Integration actions
            'import-persona': () => KLITE_RPMod.panels.PLAY_RP.importPersona(),
            'manage-personas': () => KLITE_RPMod.panels.PLAY_RP.managePersonas(),
            'load-from-chars': () => KLITE_RPMod.panels.PLAY_RP.loadFromChars(),
            'open-char-manager': () => KLITE_RPMod.panels.PLAY_RP.openCharManager(),
            'apply-persona': () => KLITE_RPMod.panels.PLAY_RP.applyPersona(),
            'apply-character': () => KLITE_RPMod.panels.PLAY_RP.applyCharacter(),
            'select-character': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => {
                    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = char;
                    KLITE_RPMod.panels.PLAY_RP.characterEnabled = true;
                    
                    // Apply the character data
                    if (char.type === 'worldinfo') {
                        // WI character - add to memory
                        if (window.current_memory) {
                            window.current_memory += '\n\n' + char.content;
                        } else {
                            window.current_memory = char.content;
                        }
                    } else {
                        // CHARS character - use existing apply logic
                        KLITE_RPMod.panels.PLAY_RP.applyCharacterData(char);
                    }
                    
                    // Refresh the panel to show the new character
                    KLITE_RPMod.loadPanel('left', 'PLAY');
                    // Character application confirmed by UI state change
                });
            },
            'select-persona': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => {
                    KLITE_RPMod.panels.PLAY_RP.selectedPersona = char;
                    KLITE_RPMod.panels.PLAY_RP.personaEnabled = true;
                    KLITE_RPMod.panels.PLAY_RP.applyCharacterData(char);
                    
                    // Refresh the panel to show the new character
                    KLITE_RPMod.loadPanel('left', 'PLAY');
                    // Character application confirmed by UI state change
                });
            },
            'remove-persona': () => KLITE_RPMod.panels.PLAY_RP.removePersona(),
            'remove-character': () => KLITE_RPMod.panels.PLAY_RP.removeCharacter()
        },
        
        
        
        renderPersonaControls() {
            const userName = window.localsettings?.chatname || 'User';
            return `
                <div class="klite-persona-section" style="margin-bottom: 15px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text);">Username (for the human player):</label>
                        ${t.input('rp-user-name', '', 'text', userName, 'width: 100%; margin-bottom: 8px;')}
                        
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            ${t.checkbox('persona-enabled', 'Enable User Character', this.personaEnabled)}
                        </div>
                        
                        <div class="persona-controls" style="${this.personaEnabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
                            ${this.selectedPersona ? this.renderActivePersona() : this.renderSelectPersonaButton()}
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderSelectPersonaButton() {
            return `
                <div style="text-align: center; padding: 20px;">
                    <button class="klite-btn primary" data-action="select-persona" style="font-size: 14px; padding: 12px 24px;">
                        📋 Select Character
                    </button>
                    <div style="margin-top: 8px; font-size: 11px; color: var(--muted);">
                        Choose a character for the user to roleplay
                    </div>
                </div>
            `;
        },
        
        renderActivePersona() {
            const char = this.selectedPersona;
            const avatar = char.image || '';
            const isWIChar = char.type === 'worldinfo';
            
            return `
                <div style="display: flex; align-items: center; gap: 2px; padding: 12px; border: 1px solid var(--success); border-radius: 6px; background: rgba(34, 197, 94, 0.1); margin-bottom: 8px;">
                    ${avatar ? `
                        <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                            <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                        </div>
                    `}
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 8px;">
                            ${char.name}
                            ${isWIChar ? '<span style="font-size: 9px; background: var(--accent); color: white; padding: 1px 4px; border-radius: 2px;">WI</span>' : ''}
                        </div>
                    </div>
                    <button class="klite-btn secondary" data-action="remove-persona" style="padding: 6px 12px; font-size: 11px;">
                        ✕ Remove
                    </button>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="klite-btn" data-action="select-persona" style="flex: 1;">
                        📋 Change Character
                    </button>
                </div>
            `;
        },
        
        renderCharacterControls() {
            const aiName = window.localsettings?.chatopponent || 'AI';
            const isGroupChatActive = KLITE_RPMod.panels.GROUP?.enabled || false;
            
            return `
                <div class="klite-character-section" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                    ${isGroupChatActive ? `<div style="margin-bottom: 10px; padding: 8px; background: rgba(255,165,0,0.1); border: 1px solid rgba(255,165,0,0.3); border-radius: 4px; font-size: 12px; color: var(--text);">
                        <strong>Note:</strong> Character integration is disabled when Group Chat is active.
                    </div>` : ''}
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--text);">Charactername (for the AI):</label>
                        <input type="text" id="rp-ai-name" class="klite-input" value="${aiName}" style="width: 100%; margin-bottom: 8px;" ${isGroupChatActive ? 'readonly disabled' : ''}>
                        
                        <div style="display: flex; align-items: center; margin-bottom: 8px;${isGroupChatActive ? ' opacity: 0.5; pointer-events: none;' : ''}">
                            ${t.checkbox('character-enabled', 'Enable AI Character', isGroupChatActive ? false : this.characterEnabled)}
                        </div>
                        
                        <div class="character-controls" style="${this.characterEnabled && !isGroupChatActive ? '' : 'opacity: 0.5; pointer-events: none;'}">
                            ${this.selectedCharacter ? this.renderActiveCharacter() : this.renderSelectCharacterButton()}
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderSelectCharacterButton() {
            return `
                <div style="text-align: center; padding: 20px;">
                    <button class="klite-btn primary" data-action="select-character" style="font-size: 14px; padding: 12px 24px;">
                        📋 Select Character
                    </button>
                    <div style="margin-top: 8px; font-size: 11px; color: var(--muted);">
                        Choose from your character library or World Info
                    </div>
                </div>
            `;
        },
        
        renderActiveCharacter() {
            const char = this.selectedCharacter;
            const avatar = char.image || '';
            const isWIChar = char.type === 'worldinfo';
            
            return `
                <div style="display: flex; align-items: center; gap: 2px; padding: 12px; border: 1px solid var(--accent); border-radius: 6px; background: rgba(74, 158, 255, 0.1); margin-bottom: 8px;">
                    ${avatar ? `
                        <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                            <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                        </div>
                    `}
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 8px;">
                            ${char.name}
                            ${isWIChar ? '<span style="font-size: 9px; background: var(--accent); color: white; padding: 1px 4px; border-radius: 2px;">WI</span>' : ''}
                        </div>
                    </div>
                    <button class="klite-btn secondary" data-action="remove-character" style="padding: 6px 12px; font-size: 11px;">
                        ✕ Remove
                    </button>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="klite-btn" data-action="select-character" style="flex: 1;">
                        📋 Change Character
                    </button>
                </div>
            `;
        },
        
        renderAutoSender() {
            return `
                <div class="klite-auto-sender-wrapper">
                    <div class="klite-auto-sender-controls" style="display: grid; grid-template-columns: 1fr auto; gap: 2px; margin-bottom: 8px;">
                        <div class="klite-auto-sender-buttons">
                            ${t.button('Start', 'klite-btn-sm', 'auto-start', 'auto-start-btn')}
                            ${t.button('Pause', 'klite-btn-sm klite-btn-success', 'auto-pause', 'auto-pause-btn', 'display: none;')}
                            ${t.button('Continue', 'klite-btn-sm', 'auto-continue', 'auto-continue-btn', 'display: none;')}
                        </div>
                        <div id="auto-countdown" class="klite-auto-countdown" style="width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#333 0% 100%); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: white; border: 2px solid #555;">--</div>
                    </div>
                    <div class="klite-auto-sender-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-bottom: 8px;">
                        ${t.button('Stop', 'klite-btn-sm', 'auto-stop')}
                        ${t.button('Reset', 'klite-btn-sm', 'auto-reset')}
                    </div>
                    <div class="klite-auto-sender-interval" style="margin-bottom: 8px;">
                        <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Interval: <span id="auto-interval-display">30</span> seconds</label>
                        <input type="range" min="10" max="300" value="30" step="5" class="klite-slider" id="auto-interval-slider" style="width: 100%;">
                    </div>
                    <div class="klite-auto-sender-start-message" style="margin-bottom: 8px;">
                        <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Start Message:</label>
                        <textarea id="auto-start-message" placeholder="Start Message (optional)" style="width: 100%; min-height: 40px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 4px; border-radius: 4px; font-size: 11px; resize: vertical;"></textarea>
                    </div>
                    <div class="klite-auto-sender-auto-message" style="margin-bottom: 8px;">
                        <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Automatic Message:</label>
                        <textarea id="auto-message" placeholder="Automatic Message" style="width: 100%; min-height: 40px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 4px; border-radius: 4px; font-size: 11px; resize: vertical;">Continue.</textarea>
                    </div>
                    <div class="klite-auto-sender-quick-messages" style="margin-bottom: 0;">
                        <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Quick Slot Messages:</label>
                        <div class="klite-quick-messages-grid" style="display: grid; grid-template-columns: 1fr; gap: 2px;">
                            ${[1, 2, 3, 4, 5].map(i => `
                                <div class="klite-quick-message-row" style="display: flex; gap: 2px;">
                                    <input type="text" id="auto-quick-${i}" placeholder="Quick Message ${i}" style="flex: 1; padding: 3px 4px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 11px;">
                                    ${t.button(i.toString(), 'klite-btn-sm', `quick-send-${i}`, '', 'width: 26px; padding: 3px; font-size: 11px;')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        },
        
        async loadRules() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_rp_rules');
            if (saved) {
                this.rules = saved;
                KLITE_RPMod.log('panels', 'RP rules loaded from storage');
            }
        },
        
        saveRules() {
            KLITE_RPMod.saveToLiteStorage('rpmod_rp_rules', this.rules);
            KLITE_RPMod.log('panels', 'RP rules saved to storage');
        },
        
        async setupAutoSave() {
            let saveTimer = null;
            const textarea = document.getElementById('rp-rules');
            const autosave = document.getElementById('rp-autosave');
            
            if (textarea) {
                // Load existing rules into textarea
                await this.loadRules();
                textarea.value = this.rules;
                
                textarea.addEventListener('input', () => {
                    if (autosave?.checked) {
                        clearTimeout(saveTimer);
                        saveTimer = setTimeout(() => {
                            this.rules = textarea.value;
                            this.saveRules();
                            KLITE_RPMod.log('panels', 'RP rules auto-saved');
                        }, 1000);
                    }
                });
            }
            
            // Name inputs
            document.getElementById('rp-user-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatname = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `User name changed to: ${e.target.value}`);
                }
            });
            
            document.getElementById('rp-ai-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatopponent = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `AI name changed to: ${e.target.value}`);
                }
            });
        },
        
        triggerNarrator() {
            const style = document.getElementById('narrator-style')?.value || 'omniscient';
            const focus = document.getElementById('narrator-focus')?.value || 'mixed';
            
            KLITE_RPMod.log('panels', `Triggering narrator: ${style}/${focus}`);
            
            const narratorPrompts = {
                omniscient: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on environment and setting descriptions, providing rich sensory details about the surroundings, atmosphere, and physical spaces. Answer now for one reply as the omniscient narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on revealing inner thoughts, feelings, and emotional states of characters, providing deep psychological insights. Answer now for one reply as the omniscient narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on describing actions, events, and physical movements in detail. Answer now for one reply as the omniscient narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on dialogue and conversation, providing context and subtext to spoken words. Answer now for one reply as the omniscient narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator provides a balanced narrative covering environment, emotions, actions, and dialogue as appropriate. Answer now for one reply as the omniscient narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                limited: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on environment from one perspective, describing only what that character would notice about their surroundings. Answer now for one reply as the limited narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on one perspective and hints at emotions rather than revealing them directly. Answer now for one reply as the limited narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on actions and events from one character\'s perspective only. Answer now for one reply as the limited narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on dialogue from one character\'s perspective, including what they hear and their reactions. Answer now for one reply as the limited narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator provides a balanced but limited perspective covering what one character would experience. Answer now for one reply as the limited narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                objective: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on environmental details in a detached, observational manner. Answer now for one reply as the objective narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator can only describe observable emotional expressions and reactions, not internal feelings. Answer now for one reply as the objective narrator focused on observable emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on documenting actions and movements in a factual manner. Answer now for one reply as the objective narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on reporting dialogue and verbal exchanges without interpretation. Answer now for one reply as the objective narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator provides balanced objective observation of the scene. Answer now for one reply as the objective narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                character: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on environment as seen through the character\'s eyes and experiences. Answer now for one reply as the character POV narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on the character\'s internal emotional state and reactions. Answer now for one reply as the character POV narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on actions and events as experienced by the character. Answer now for one reply as the character POV narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on dialogue and conversations from the character\'s perspective. Answer now for one reply as the character POV narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator provides a balanced character-centered narrative. Answer now for one reply as the character POV narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                }
            };
            
            const instruction = narratorPrompts[style]?.[focus] || narratorPrompts.omniscient.mixed;
            
            const input = document.getElementById('input');
            if (input) {
                const userText = input.value.trim();
                input.value = instruction + (userText ? '\n\n' + userText : '');
                KLITE_RPMod.submit();
            }
        },
        
        triggerNarratorWithPreset(style = 'omniscient', focus = 'mixed') {
            KLITE_RPMod.log('panels', `Triggering narrator with preset: ${style}/${focus}`);
            
            const narratorPrompts = {
                omniscient: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on environment and setting descriptions, providing rich sensory details about the surroundings, atmosphere, and physical spaces. Answer now for one reply as the omniscient narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on revealing inner thoughts, feelings, and emotional states of characters, providing deep psychological insights. Answer now for one reply as the omniscient narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on describing actions, events, and physical movements in detail. Answer now for one reply as the omniscient narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on dialogue and conversation, providing context and subtext to spoken words. Answer now for one reply as the omniscient narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator provides a balanced narrative covering environment, emotions, actions, and dialogue as appropriate. Answer now for one reply as the omniscient narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                limited: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on environment from one perspective, describing only what that character would notice about their surroundings. Answer now for one reply as the limited narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on emotions from one perspective, revealing only what that character would think and feel. Answer now for one reply as the limited narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on actions from one perspective, describing only what that character would witness. Answer now for one reply as the limited narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on dialogue from one perspective, providing context only for what that character would hear and understand. Answer now for one reply as the limited narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator provides a balanced narrative from one perspective, covering environment, emotions, actions, and dialogue as that character would experience them. Answer now for one reply as the limited narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                }
            };
            
            const instruction = narratorPrompts[style]?.[focus] || narratorPrompts.omniscient.mixed;
            
            const input = document.getElementById('input');
            if (input) {
                const userText = input.value.trim();
                input.value = instruction + (userText ? '\n\n' + userText : '');
                KLITE_RPMod.submit();
            }
        },
        
        
        applyPreset(preset) {
            KLITE_RPMod.log('panels', `Applying RP preset: ${preset}`);
            
            const presets = {
                precise: { creativity: 20, focus: 20, repetition: 80 },
                koboldai: { creativity: 16, focus: 100, repetition: 19 },
                creative: { creativity: 80, focus: 60, repetition: 40 },
                chaotic: { creativity: 95, focus: 90, repetition: 10 }
            };
            
            const settings = presets[preset];
            if (settings) {
                // Update sliders with correct IDs and trigger their change events
                Object.entries(settings).forEach(([key, value]) => {
                    const sliderId = `rp-${key}-slider`;  // Use correct slider IDs
                    const slider = document.getElementById(sliderId);
                    if (slider) {
                        slider.value = value;
                        // Use shared methods
                        KLITE_RPMod.updateSettingsFromSlider(key, value);
                        KLITE_RPMod.updateSliderDisplays(key, value, 'rp');
                    }
                });
                
                // Update active button
                document.querySelectorAll('[data-action^="preset-"]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.action === `preset-${preset}`);
                });
                
                // Save settings
                window.save_settings?.();
                // Preset application confirmed by UI changes
            }
        },
        
        setupCharacterIntegration() {
            // Persona toggle
            document.getElementById('persona-enabled')?.addEventListener('change', e => {
                this.personaEnabled = e.target.checked;
                const controls = document.querySelector('.persona-controls');
                if (controls) {
                    controls.style.opacity = e.target.checked ? '1' : '0.5';
                    controls.style.pointerEvents = e.target.checked ? 'auto' : 'none';
                }
                this.updateCharacterContext();
            });
            
            // Character toggle
            document.getElementById('character-enabled')?.addEventListener('change', e => {
                this.characterEnabled = e.target.checked;
                const controls = document.querySelector('.character-controls');
                if (controls) {
                    controls.style.opacity = e.target.checked ? '1' : '0.5';
                    controls.style.pointerEvents = e.target.checked ? 'auto' : 'none';
                }
                this.updateCharacterContext();
            });
            
            // Character integration now uses unified modal system
            
            // WI integration now handled by unified modal system
            
            
            // Narrator style explanations
            const narratorStyleSelect = document.getElementById('narrator-style');
            const narratorExplanation = document.getElementById('narrator-explanation-text');
            
            if (narratorStyleSelect && narratorExplanation) {
                narratorStyleSelect.addEventListener('change', e => {
                    this.updateNarratorExplanation(e.target.value);
                });
                
                // Initialize with current value
                this.updateNarratorExplanation(narratorStyleSelect.value);
            }
        },
        
        async setupAutoSender() {
            // Load settings from storage first
            await this.loadAutoSenderSettings();
            
            // Initialize Auto Sender controls
            this.countdownEl = document.getElementById('auto-countdown');
            
            // Apply loaded settings to UI
            this.initAutoSenderUI();
            
            // Setup interval slider
            const intervalSlider = document.getElementById('auto-interval-slider');
            const intervalDisplay = document.getElementById('auto-interval-display');
            
            if (intervalSlider) {
                intervalSlider.addEventListener('input', e => {
                    const value = parseInt(e.target.value);
                    this.autoSender.interval = value;
                    if (intervalDisplay) intervalDisplay.textContent = value;
                    this.saveAutoSenderSettings();
                });
            }
            
            // Setup message inputs
            const startMessageEl = document.getElementById('auto-start-message');
            const autoMessageEl = document.getElementById('auto-message');
            
            if (startMessageEl) {
                startMessageEl.addEventListener('input', e => {
                    this.autoSender.startMessage = e.target.value;
                    this.saveAutoSenderSettings();
                });
            }
            
            if (autoMessageEl) {
                autoMessageEl.addEventListener('input', e => {
                    this.autoSender.message = e.target.value || 'Continue.';
                    this.saveAutoSenderSettings();
                });
            }
            
            // Setup quick message inputs
            for (let i = 1; i <= 5; i++) {
                const quickInput = document.getElementById(`auto-quick-${i}`);
                if (quickInput) {
                    quickInput.addEventListener('input', e => {
                        this.autoSender.quickMessages[i-1] = e.target.value;
                        this.saveAutoSenderSettings();
                    });
                }
            }
        },
        
        handleAutoStart() {
            // Start always resets and starts fresh
            this.autoSender.currentCount = 0;
            this.autoSender.isStarted = true;
            this.autoSender.isPaused = false;
            
            // Send start message instantly if available
            const startMessage = document.getElementById('auto-start-message')?.value;
            if (startMessage && startMessage.trim()) {
                this.sendMessage(startMessage);
            }
            
            this.updateAutoButtons('running');
            this.startAutomaticTimer();
            KLITE_RPMod.log('panels', 'Auto sender started - reset and countdown begun');
        },
        
        handleAutoPause() {
            this.autoSender.isPaused = true;
            // Keep timer running but in paused state - count preserved
            this.updateAutoButtons('paused');
            KLITE_RPMod.log('panels', `Auto sender paused - keeping count at ${this.autoSender.currentCount}`);
        },
        
        handleAutoContinue() {
            if (!this.autoSender.isStarted) {
                // Starting without start message - just begin countdown
                this.autoSender.isStarted = true;
                this.autoSender.currentCount = 0;
                this.startAutomaticTimer();
            }
            this.autoSender.isPaused = false;
            this.updateAutoButtons('running');
            KLITE_RPMod.log('panels', 'Auto sender continued - resuming from current count');
        },
        
        handleAutoStop() {
            // Stop interval and abort any pending generation
            clearInterval(this.autoSender.timer);
            this.autoSender.timer = null;
            this.autoSender.isPaused = true;
            this.autoSender.currentCount = 0; // Reset interval count
            
            // Abort any pending generation
            if (window.abort_generation) {
                window.abort_generation();
            }
            
            this.updateAutoButtons('stopped');
            if (this.countdownEl) {
                this.countdownEl.textContent = '--';
                this.countdownEl.style.background = 'conic-gradient(#333 0% 100%)';
            }
            KLITE_RPMod.log('panels', 'Auto sender stopped - aborted generation and reset interval');
        },
        
        handleAutoReset() {
            // Complete reset of Auto Sender
            this.autoSender.isStarted = false;
            this.autoSender.isPaused = false;
            this.autoSender.currentCount = 0;
            clearInterval(this.autoSender.timer);
            this.autoSender.timer = null;
            
            // Reset UI
            this.updateAutoButtons('reset');
            if (this.countdownEl) {
                this.countdownEl.textContent = '--';
                this.countdownEl.style.background = 'conic-gradient(#333 0% 100%)';
            }
            KLITE_RPMod.log('panels', 'Auto sender completely reset');
        },
        
        handleQuickSend(slot) {
            const message = this.autoSender.quickMessages[slot - 1];
            if (message) {
                this.sendQuickMessage(message);
                KLITE_RPMod.log('panels', `Quick message ${slot} sent: ${message}`);
            }
        },
        
        startAutomaticTimer() {
            clearInterval(this.autoSender.timer);
            
            if (this.countdownEl && this.autoSender.isStarted && !this.autoSender.isPaused) {
                const remaining = this.autoSender.interval - this.autoSender.currentCount;
                this.countdownEl.textContent = remaining;
            }
            
            this.autoSender.timer = setInterval(() => {
                if (!this.autoSender.isPaused && this.autoSender.isStarted) {
                    this.autoSender.currentCount++;
                    
                    if (this.autoSender.currentCount >= this.autoSender.interval) {
                        this.autoSender.currentCount = 0;
                        this.sendMessage(this.autoSender.message);
                    }
                    
                    if (this.countdownEl) {
                        const remaining = this.autoSender.interval - this.autoSender.currentCount;
                        const progress = (this.autoSender.currentCount / this.autoSender.interval) * 100;
                        
                        this.countdownEl.textContent = remaining;
                        this.countdownEl.style.background = `conic-gradient(#4a9eff 0% ${progress}%, #333 ${progress}% 100%)`;
                    }
                }
            }, 1000);
        },
        
        updateAutoButtons(state) {
            const startBtn = document.getElementById('auto-start-btn');
            const pauseBtn = document.getElementById('auto-pause-btn');
            const continueBtn = document.getElementById('auto-continue-btn');
            
            switch(state) {
                case 'running':
                    if (startBtn) startBtn.style.display = 'none';
                    if (pauseBtn) pauseBtn.style.display = 'block';
                    if (continueBtn) continueBtn.style.display = 'none';
                    break;
                case 'paused':
                    if (startBtn) startBtn.style.display = 'none';
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (continueBtn) continueBtn.style.display = 'block';
                    break;
                case 'stopped':
                    if (startBtn) {
                        startBtn.textContent = 'Continue';
                        startBtn.style.display = 'block';
                    }
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (continueBtn) continueBtn.style.display = 'none';
                    break;
                case 'reset':
                    if (startBtn) {
                        startBtn.textContent = 'Start';
                        startBtn.style.display = 'block';
                    }
                    if (pauseBtn) pauseBtn.style.display = 'none';
                    if (continueBtn) continueBtn.style.display = 'block';
                    break;
            }
        },
        
        sendMessage(message) {
            if (!message || !message.trim()) {
                KLITE_RPMod.log('panels', 'Auto sender: Empty message, skipping');
                return;
            }
            
            if (KLITE_RPMod.state.generating) {
                KLITE_RPMod.log('panels', 'Auto sender: Generation in progress, skipping');
                return;
            }
            
            // Add context from rules if available
            let contextMessage = message.trim();
            if (this.rules) {
                contextMessage = this.rules + '\n\n' + contextMessage;
            }
            
            // Use the same approach as main submit function
            const input = document.getElementById('input');
            const liteInput = document.getElementById('input_text');
            
            if (!input || !liteInput) {
                KLITE_RPMod.log('panels', 'Auto sender: Input elements not found');
                return;
            }
            
            // Set the message in KoboldAI's input
            liteInput.value = contextMessage;
            KLITE_RPMod.log('panels', `Auto sender: Submitting message: "${contextMessage}"`);
            
            // Submit using KoboldAI's native function
            if (window.submit_generation_button) {
                window.submit_generation_button();
            }
        },
        
        sendQuickMessage(message) {
            if (window.abort_generation) {
                window.abort_generation();
            }
            
            this.autoSender.currentCount = 0;
            this.sendMessage(message);
        },
        
        async loadAutoSenderSettings() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_auto_sender_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.autoSender = { ...this.autoSender, ...settings };
                KLITE_RPMod.log('state', 'Loaded auto-sender settings from storage');
            }
        },
        
        initAutoSenderUI() {
            // Apply settings to UI elements
            const intervalSlider = document.getElementById('auto-interval-slider');
            const intervalDisplay = document.getElementById('auto-interval-display');
            const startMessageEl = document.getElementById('auto-start-message');
            const autoMessageEl = document.getElementById('auto-message');
            
            if (intervalSlider) intervalSlider.value = this.autoSender.interval;
            if (intervalDisplay) intervalDisplay.textContent = this.autoSender.interval;
            if (startMessageEl) startMessageEl.value = this.autoSender.startMessage || '';
            if (autoMessageEl) autoMessageEl.value = this.autoSender.message || 'Continue.';
            
            // Load quick messages
            for (let i = 1; i <= 5; i++) {
                const quickInput = document.getElementById(`auto-quick-${i}`);
                if (quickInput) {
                    quickInput.value = this.autoSender.quickMessages[i-1] || '';
                }
            }
        },
        
        saveAutoSenderSettings() {
            const settings = {
                interval: this.autoSender.interval,
                message: this.autoSender.message,
                startMessage: this.autoSender.startMessage,
                quickMessages: this.autoSender.quickMessages
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_auto_sender_settings', JSON.stringify(settings));
            KLITE_RPMod.log('state', 'Saved auto-sender settings to storage');
        },
        
        setupQuickActions() {
            // These actions integrate with KoboldAI Lite's existing functions
            // The actual implementation depends on Lite's API availability
        },
        
        
        refresh() {
            KLITE_RPMod.loadPanel('left', 'PLAY_RP');
        },
        
        updateNarratorExplanation(style) {
            const explanations = {
                omniscient: '<strong>Omniscient:</strong> The narrator knows all characters\' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.',
                limited: '<strong>Limited:</strong> The narrator can only describe what a specific character can see and experience. Focuses on one perspective and hints at emotions rather than revealing them directly.',
                objective: '<strong>Objective:</strong> The narrator acts like a camera, describing only what can be observed externally. No access to thoughts or emotions, focuses purely on actions and dialogue.',
                character: '<strong>Character POV:</strong> The narrator speaks as if they are one of the characters in the scene. Uses first person perspective and personal knowledge.'
            };
            
            const explanationEl = document.getElementById('narrator-explanation-text');
            if (explanationEl && explanations[style]) {
                explanationEl.innerHTML = explanations[style];
            }
        },
        
        updateCharacterContext() {
            // Integration with CHARS panel and context system
            KLITE_RPMod.log('panels', 'Character context updated');
        },
        
        
        
        
        
        
        
        
        extractWICharacters(wiEntries) {
            const wiCharacters = {};
            
            // Look for entries with comment pattern "${charName}_imported_memory" and "${charName}_imported_image"
            wiEntries.forEach(entry => {
                if (entry.comment && entry.comment.endsWith('_imported_memory')) {
                    const charName = entry.comment.replace('_imported_memory', '');
                    
                    if (!wiCharacters[charName]) {
                        wiCharacters[charName] = {
                            name: charName,
                            content: [],
                            type: 'worldinfo',
                            image: null // For storing character image
                        };
                    }
                    
                    // Concatenate content from multiple entries for the same character
                    if (entry.content) {
                        wiCharacters[charName].content.push(entry.content);
                    }
                } else if (entry.comment && entry.comment.endsWith('_imported_image')) {
                    // NEW: Extract character image from WI
                    const charName = entry.comment.replace('_imported_image', '');
                    
                    if (!wiCharacters[charName]) {
                        wiCharacters[charName] = {
                            name: charName,
                            content: [],
                            type: 'worldinfo',
                            image: null
                        };
                    }
                    
                    // Store the image data
                    if (entry.content) {
                        wiCharacters[charName].image = entry.content;
                    }
                }
            });
            
            // Convert to array and join content
            return Object.values(wiCharacters).map(char => ({
                ...char,
                content: char.content.join('\n\n'),
                description: char.content.join('\n\n'), // For compatibility
                // Include image if available
                ...(char.image && { image: char.image })
            }));
        },
        
        
        skipTime() {
            const input = document.getElementById('input');
            if (input) {
                input.value = '[Time passes. Continue the story from a later moment]';
                KLITE_RPMod.submit();
            }
        },

        applyPersona() {
            const personaSelect = document.getElementById('persona-list');
            const selectedValue = personaSelect?.value;
            
            if (!selectedValue) {
                alert('Please select a persona first');
                return;
            }

            const parts = selectedValue.split('_');
            let personaData = null;

            if (parts[0] === 'char') {
                const allCharacters = KLITE_RPMod.characters || [];
                personaData = allCharacters.find(char => char.id == parts[1]);
            } else if (parts[0] === 'wi' && parts[1] === 'char') {
                // Handle WI character: wi_char_CharacterName
                const charName = parts.slice(2).join('_'); // In case character name has underscores
                const wiEntries = window.worldinfo || [];
                const wiCharacters = this.extractWICharacters(wiEntries);
                personaData = wiCharacters.find(char => char.name === charName);
            }

            if (personaData) {
                this.selectedPersona = personaData;
                
                // Update the Applied Persona display immediately
                const appliedPersonaName = document.getElementById('applied-persona-name');
                if (appliedPersonaName) {
                    appliedPersonaName.textContent = personaData.name;
                }
                
                // Update remove button state
                const removeBtn = document.getElementById('remove-persona-btn');
                if (removeBtn) {
                    removeBtn.style.opacity = '1';
                    removeBtn.style.pointerEvents = 'auto';
                }
                
                // Applied persona: ${personaData.name}
                
                // Update user avatar with persona image if available
                if (personaData.avatar) {
                    KLITE_RPMod.updateUserAvatar(personaData.avatar);
                } else {
                    // Reset to default if no persona avatar
                    KLITE_RPMod.updateUserAvatar(null);
                }
                
                // Update character context in memory
                this.updateCharacterContext();
            } else {
                alert('Failed to apply persona');
            }
        },

        applyCharacter() {
            const characterSelect = document.getElementById('character-list');
            const selectedValue = characterSelect?.value;
            
            KLITE_RPMod.log('panels', `Applying character: selectedValue=${selectedValue}`);
            
            if (!selectedValue) {
                alert('Please select a character first');
                return;
            }

            const parts = selectedValue.split('_');
            let characterData = null;

            KLITE_RPMod.log('panels', `Character selection: parts=${parts}`);

            if (parts[0] === 'char') {
                const allCharacters = KLITE_RPMod.characters || [];
                KLITE_RPMod.log('panels', `Available characters: ${allCharacters.length}`);
                characterData = allCharacters.find(char => char.id == parts[1]);
                KLITE_RPMod.log('panels', `Found character data:`, characterData);
            } else if (parts[0] === 'wi' && parts[1] === 'char') {
                // Handle WI character: wi_char_CharacterName
                const charName = parts.slice(2).join('_'); // In case character name has underscores
                const wiEntries = window.current_wi || [];
                const wiCharacters = this.extractWICharacters(wiEntries);
                characterData = wiCharacters.find(char => char.name === charName);
                KLITE_RPMod.log('panels', `Found WI character data:`, characterData);
            }

            if (characterData) {
                this.selectedCharacter = characterData;
                
                // Update the Applied Character display immediately
                const appliedCharacterName = document.getElementById('applied-character-name');
                if (appliedCharacterName) {
                    appliedCharacterName.textContent = characterData.name;
                }
                
                // Update remove button state
                const removeBtn = document.getElementById('remove-character-btn');
                if (removeBtn) {
                    removeBtn.style.opacity = '1';
                    removeBtn.style.pointerEvents = 'auto';
                }
                
                // Applied character: ${characterData.name}
                
                // Update AI avatar with character image if available
                if (characterData.avatar) {
                    KLITE_RPMod.updateAIAvatar(characterData.avatar);
                } else {
                    // Reset to default if no character avatar
                    KLITE_RPMod.updateAIAvatar(null);
                }
                
                // Update username to character name when character is applied
                const userNameInput = document.getElementById('rp-user-name');
                if (userNameInput && characterData.name) {
                    userNameInput.value = characterData.name;
                    // Trigger the change event to save the setting
                    if (window.localsettings) {
                        window.localsettings.chatname = characterData.name;
                        window.save_settings?.();
                        KLITE_RPMod.log('panels', `Username automatically updated to character name: ${characterData.name}`);
                    }
                }
                
                // Update character context in memory
                this.updateCharacterContext();
            } else {
                alert('Failed to apply character');
            }
        },
        
        applyCharacterData(characterData) {
            if (characterData) {
                this.selectedCharacter = characterData;
                
                // Update AI avatar with character image if available
                if (characterData.image) {
                    KLITE_RPMod.updateAIAvatar(characterData.image);
                } else {
                    // Reset to default if no character avatar
                    KLITE_RPMod.updateAIAvatar(null);
                }
                
                // Update AI name to character name when character is applied
                const aiNameInput = document.getElementById('rp-ai-name');
                if (aiNameInput && characterData.name) {
                    aiNameInput.value = characterData.name;
                    // Trigger the change event to save the setting
                    if (window.localsettings) {
                        window.localsettings.chatopponent = characterData.name;
                        window.save_settings?.();
                        KLITE_RPMod.log('panels', `AI name automatically updated to character name: ${characterData.name}`);
                    }
                }
                
                // Apply character data to memory if it's a CHARS character
                if (characterData.rawData || characterData.description) {
                    const description = characterData.description || characterData.rawData?.data?.description || '';
                    const personality = characterData.personality || characterData.rawData?.data?.personality || '';
                    const scenario = characterData.scenario || characterData.rawData?.data?.scenario || '';
                    
                    let characterContent = '';
                    if (description) characterContent += `Description: ${description}\n\n`;
                    if (personality) characterContent += `Personality: ${personality}\n\n`;
                    if (scenario) characterContent += `Scenario: ${scenario}\n\n`;
                    
                    if (characterContent) {
                        if (window.current_memory) {
                            window.current_memory += '\n\n' + characterContent.trim();
                        } else {
                            window.current_memory = characterContent.trim();
                        }
                    }
                }
                
                // Update character context
                this.updateCharacterContext();
                
                KLITE_RPMod.log('panels', `Applied character data for: ${characterData.name}`);
            }
        },

        removePersona() {
            this.selectedPersona = null;
            
            // Update the Applied Persona display immediately
            const appliedPersonaName = document.getElementById('applied-persona-name');
            if (appliedPersonaName) {
                appliedPersonaName.textContent = 'None';
            }
            
            // Update remove button state
            const removeBtn = document.getElementById('remove-persona-btn');
            if (removeBtn) {
                removeBtn.style.opacity = '0.5';
                removeBtn.style.pointerEvents = 'none';
            }
            
            // Persona removed
            
            // Reset user avatar to default when persona is removed
            KLITE_RPMod.updateUserAvatar(null);
            
            // Refresh the panel to update UI
            KLITE_RPMod.loadPanel('left', 'PLAY');
            
            // Update character context in memory
            this.updateCharacterContext();
        },

        removeCharacter() {
            this.selectedCharacter = null;
            
            // Update the Applied Character display immediately
            const appliedCharacterName = document.getElementById('applied-character-name');
            if (appliedCharacterName) {
                appliedCharacterName.textContent = 'None';
            }
            
            // Update remove button state
            const removeBtn = document.getElementById('remove-character-btn');
            if (removeBtn) {
                removeBtn.style.opacity = '0.5';
                removeBtn.style.pointerEvents = 'none';
            }
            
            // Character removed
            
            // Reset AI avatar to default when character is removed
            KLITE_RPMod.updateAIAvatar(null);
            
            // Refresh the panel to update UI
            KLITE_RPMod.loadPanel('left', 'PLAY');
            
            // Update character context in memory
            this.updateCharacterContext();
        },
        
        
        getCharacterContext() {
            // Build character context for dynamic injection during generation
            let characterContext = '';
            
            // Add persona context if enabled and selected
            if (this.personaEnabled && this.selectedPersona) {
                const description = this.selectedPersona.description || this.selectedPersona.content || 'No description available';
                characterContext += `[The human player impersonates ${this.selectedPersona.name} with the following description:\n${description}]\n\n`;
            }
            
            // Add character context if enabled and selected
            if (this.characterEnabled && this.selectedCharacter) {
                const description = this.selectedCharacter.description || this.selectedCharacter.content || 'No description available';
                characterContext += `[The AI impersonates ${this.selectedCharacter.name} with the following character description:\n${description}]\n\n`;
            }
            
            return characterContext;
        },
        
        injectCharacterContext() {
            // Get character context data
            const characterContext = this.getCharacterContext();
            
            // Only inject if there's context to add
            if (!characterContext.trim()) {
                this.log('generation', 'No character context to inject');
                return;
            }
            
            // Get the input element
            const input = document.getElementById('input_text');
            if (!input) {
                this.log('generation', 'Input element not found, cannot inject character context');
                return;
            }
            
            // Get current input value
            const currentInput = input.value || '';
            
            // Inject character context at the beginning of the input
            // This ensures character context is applied without permanently modifying memory
            const injectedInput = characterContext + currentInput;
            
            // Temporarily set the modified input
            input.value = injectedInput;
            
            this.log('generation', `Character context injected (${characterContext.length} chars)`);
            this.log('generation', `Persona enabled: ${this.personaEnabled}, Character enabled: ${this.characterEnabled}`);
            if (this.selectedPersona) {
                this.log('generation', `Active persona: ${this.selectedPersona.name}`);
            }
            if (this.selectedCharacter) {
                this.log('generation', `Active character: ${this.selectedCharacter.name}`);
            }
        },
        
        editLast() {
            if (window.gametext_arr && gametext_arr.length > 0) {
                const lastEntry = gametext_arr[gametext_arr.length - 1];
                // Enter edit mode for last entry
                KLITE_RPMod.log('panels', 'Editing last entry');
            }
        },
        
        deleteLast() {
            if (window.gametext_arr && gametext_arr.length > 0 && 
                confirm('Delete the last message? This cannot be undone.')) {
                gametext_arr.pop();
                if (window.render_gametext) {
                    render_gametext();
                }
                KLITE_RPMod.log('panels', 'Deleted last entry');
            }
        },
        
        regenerate() {
            if (window.retry_generation_button) {
                retry_generation_button();
            }
        },
        
        undo() {
            if (window.undo_generation_button) {
                undo_generation_button();
            }
        },
        
        redo() {
            if (window.redo_generation_button) {
                redo_generation_button();
            }
        },
        
        startAutoSender() {
            if (this.autoSender.timer) {
                clearInterval(this.autoSender.timer);
            }
            
            this.autoSender.timer = setInterval(() => {
                if (!KLITE_RPMod.state.generating && this.autoSender.enabled) {
                    const input = document.getElementById('input');
                    if (input && !input.value.trim()) {
                        input.value = this.autoSender.message;
                        KLITE_RPMod.submit();
                        this.autoSender.currentCount++;
                        this.updateAutoSenderStatus();
                    }
                }
            }, this.autoSender.interval * 1000);
            
            this.updateAutoSenderStatus();
        },
        
        stopAutoSender() {
            if (this.autoSender.timer) {
                clearInterval(this.autoSender.timer);
                this.autoSender.timer = null;
            }
            this.updateAutoSenderStatus();
        },
        
        updateAutoSenderStatus() {
            const status = document.getElementById('auto-sender-status');
            if (status) {
                if (this.autoSender.enabled) {
                    status.textContent = `Active (${this.autoSender.currentCount} sent)`;
                    status.style.color = 'var(--success)';
                } else {
                    status.textContent = 'Disabled';
                    status.style.color = 'var(--muted)';
                }
            }
        },
        
        handleSaveSlot(slotNumber) {
            const slotIndex = slotNumber - 1;
            const existingSave = this.saveSlots.saves[slotIndex];
            
            // If slot has existing save, ask for confirmation
            if (existingSave) {
                const confirmMessage = `Slot ${slotNumber} already contains a save (${existingSave.name}). Do you want to overwrite it?`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }
            
            // Prompt for save name
            const saveName = prompt(`Enter name for save slot ${slotNumber}:`, `Save ${slotNumber}`);
            if (!saveName) return;
            
            // Create save data
            const saveData = {
                name: saveName,
                timestamp: new Date().toISOString(),
                gametext: [...(window.gametext_arr || [])],
                memory: window.current_memory || '',
                rules: this.rules || '',
                settings: {
                    chatname: window.localsettings?.chatname || 'User',
                    chatopponent: window.localsettings?.chatopponent || 'AI'
                }
            };
            
            // Save to slot
            this.saveSlots.saves[slotIndex] = saveData;
            this.saveSlots.current = slotIndex;
            
            // Refresh UI to show green slot
            KLITE_RPMod.switchTab('left', 'PLAY');
            // Saved to slot ${slotNumber}: ${saveName}
        },
        
        handleLoadSlot(slotNumber) {
            const slotIndex = slotNumber - 1;
            const saveData = this.saveSlots.saves[slotIndex];
            
            // Check if slot has save
            if (!saveData) {
                // Slot is empty
                return;
            }
            
            // Confirm load
            if (!confirm(`Load save "${saveData.name}" from slot ${slotNumber}? This will replace your current session.`)) {
                return;
            }
            
            // Load save data
            try {
                // Restore game text
                if (saveData.gametext) {
                    window.gametext_arr = [...saveData.gametext];
                    window.render_gametext?.();
                }
                
                // Restore memory
                if (saveData.memory !== undefined) {
                    window.current_memory = saveData.memory;
                }
                
                // Restore rules
                if (saveData.rules !== undefined) {
                    this.rules = saveData.rules;
                }
                
                // Restore settings
                if (saveData.settings && window.localsettings) {
                    Object.assign(window.localsettings, saveData.settings);
                }
                
                this.saveSlots.current = slotIndex;
                
                // Refresh UI
                KLITE_RPMod.switchTab('left', 'PLAY');
                // Loaded save: ${saveData.name}
                
            } catch (error) {
                console.error('Failed to load save:', error);
                // Failed to load save
            }
        },
        
        // Character & Persona Integration methods
        importPersona() {
            KLITE_RPMod.log('panels', 'Import Persona clicked');
            console.warn('[PLACEHOLDER] Import Persona functionality - integrate with CHARS panel personas');
        },
        
        managePersonas() {
            KLITE_RPMod.log('panels', 'Manage Personas clicked');
            console.warn('[PLACEHOLDER] Manage Personas functionality - open persona manager');
        },
        
        loadFromChars() {
            KLITE_RPMod.log('panels', 'Load from CHARS clicked');
            // Try to switch to CHARS panel if available
            if (KLITE_RPMod.panels.CHARS) {
                KLITE_RPMod.switchTab('right', 'CHARS');
                // Panel switch visually obvious
            } else {
                console.warn('[PLACEHOLDER] CHARS panel integration - load character data');
            }
        },
        
        openCharManager() {
            KLITE_RPMod.log('panels', 'Character Manager clicked');
            // Try to switch to CHARS panel if available
            if (KLITE_RPMod.panels.CHARS) {
                KLITE_RPMod.switchTab('right', 'CHARS');
                // Panel opening visually obvious
            } else {
                console.warn('[PLACEHOLDER] Character Manager functionality - open character manager');
            }
        }
    };
    
    // PLAY_CHAT Panel - Mobile Phone Chat Interface
    KLITE_RPMod.panels.PLAY_CHAT = {
        saveSlots: {
            current: 0,
            saves: new Array(5).fill(null)
        },
        chatStyle: 'mobile', // mobile or classic
        
        render() {
            return `
                <!-- Chat Format Settings -->
                ${t.section('Chat Format',
                    `<div style="display: grid; gap: 2px;">
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 8px; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                            💡 <strong>Chat mode</strong> is compatible with base models, while newer instruct models are better used in <strong>RP mode</strong> 🎭
                        </div>
                        <div class="klite-row">
                            <label style="font-size: 12px; margin-right: 10px;">Chat Style:</label>
                            <select id="chat-style-select" class="klite-select" style="flex: 1;" data-action="chat-style-select">
                                <option value="mobile" ${this.chatStyle === 'mobile' ? 'selected' : ''}>📱 Mobile Phone Style</option>
                                <option value="classic" ${this.chatStyle === 'classic' ? 'selected' : ''}>💬 Classic Chat</option>
                            </select>
                        </div>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 8px;">
                            ${this.chatStyle === 'mobile' ? '<strong>Mobile Phone Style:</strong> User messages right-aligned (blue) with your avatar, AI messages left-aligned (gray) with character avatars. Looks like WhatsApp/iMessage!' : '<strong>Classic Style:</strong> Messages under each other without special formatting'}
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="klite-btn klite-btn-sm" data-action="refresh-chat-formatting">🔄 Refresh Formatting</button>
                        </div>
                    </div>`
                )}
                
                <!-- Auto-Save & Quick Save Slots -->
                ${t.section('Auto-Save & Quick Save Slots',
                    `<div class="klite-save-controls">
                        <div class="klite-row">
                            ${t.checkbox('chat-autosave', 'Auto-save enabled', true)}
                            <span id="chat-save-status" style="font-size: 11px; color: var(--muted); margin-left: auto;"></span>
                        </div>
                        <div class="klite-save-slots" style="margin-top: 10px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 12px;">Quick Save Slots (temporary per session)</label>
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                ${[1, 2, 3, 4, 5].map(i => {
                                    const hasSave = this.saveSlots.saves[i-1] !== null;
                                    const slotClass = hasSave ? 'klite-save-slot-filled' : 'klite-save-slot-empty';
                                    const slotName = hasSave ? (this.saveSlots.saves[i-1]?.name || `Chat Slot ${i}`) : `Empty Slot ${i}`;
                                    return `
                                    <div class="klite-save-slot-row ${slotClass}" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2px; align-items: center;">
                                        <div class="klite-slot-name" style="padding: 4px 8px; background: var(--bg3); border-radius: 4px; font-size: 12px; ${hasSave ? 'color: var(--success); font-weight: bold;' : 'color: var(--muted);'}">${slotName}</div>
                                        ${t.button('Save', 'klite-btn-sm', `chat-save-slot-${i}`)}
                                        ${t.button('Load', hasSave ? 'klite-btn-sm' : 'klite-btn-sm disabled', `chat-load-slot-${i}`)}
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                    </div>`
                )}
                
                <!-- Generation Control -->
                ${t.section('Generation Control',
                    KLITE_RPMod.renderGenerationControl('chat')
                )}
            `;
        },
        
        async init() {
            await this.loadSettings();
            this.updateChatStyle();
            
            
            // Set up chat formatting observer
            this.setupChatFormatting();
        },
        
        setupChatFormatting() {
            // Monitor for new content in gametext and format it
            const gametext = document.getElementById('gametext');
            if (!gametext) return;
            
            // Store observer reference to avoid creating multiple
            if (this.chatObserver) {
                this.chatObserver.disconnect();
            }
            
            // Create observer to watch for new content
            this.chatObserver = new MutationObserver(() => {
                const mode = window.localsettings?.opmode;
                if (mode === 3) { // Chat mode
                    setTimeout(() => this.formatChatContent(), 100);
                } else if (mode === 4) { // RP/Instruct mode  
                    setTimeout(() => KLITE_RPMod.formatRPContent(), 100);
                }
            });
            
            // Start observing
            this.chatObserver.observe(gametext, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            // Format existing content based on mode
            const mode = window.localsettings?.opmode;
            if (mode === 3) {
                setTimeout(() => this.formatChatContent(), 100);
            } else if (mode === 4) {
                setTimeout(() => KLITE_RPMod.formatRPContent(), 100);
            }
            
            // Also trigger on scroll events (in case content loads dynamically)
            gametext.addEventListener('scroll', () => {
                const mode = window.localsettings?.opmode;
                if (mode === 3) {
                    this.formatChatContent();
                } else if (mode === 4) {
                    KLITE_RPMod.formatRPContent();
                }
            });
        },
        
        actions: {
            'chat-style-select': (e) => {
                const selectedValue = e.target.value;
                // Store the value directly (mobile or classic)
                KLITE_RPMod.panels.PLAY_CHAT.chatStyle = selectedValue;
                KLITE_RPMod.panels.PLAY_CHAT.updateChatStyle();
                KLITE_RPMod.panels.PLAY_CHAT.saveSettings();
                // Reload panel to update description text
                KLITE_RPMod.loadPanel('left', 'PLAY');
                KLITE_RPMod.log('chat', `Chat style changed to: ${selectedValue} (${selectedValue === 'mobile' ? 'Mobile' : 'Classic'})`);
            },
            'chat-save-slot-1': () => KLITE_RPMod.panels.PLAY_CHAT.saveToSlot(1),
            'chat-save-slot-2': () => KLITE_RPMod.panels.PLAY_CHAT.saveToSlot(2),
            'chat-save-slot-3': () => KLITE_RPMod.panels.PLAY_CHAT.saveToSlot(3),
            'chat-save-slot-4': () => KLITE_RPMod.panels.PLAY_CHAT.saveToSlot(4),
            'chat-save-slot-5': () => KLITE_RPMod.panels.PLAY_CHAT.saveToSlot(5),
            'chat-load-slot-1': () => KLITE_RPMod.panels.PLAY_CHAT.loadFromSlot(1),
            'chat-load-slot-2': () => KLITE_RPMod.panels.PLAY_CHAT.loadFromSlot(2),
            'chat-load-slot-3': () => KLITE_RPMod.panels.PLAY_CHAT.loadFromSlot(3),
            'chat-load-slot-4': () => KLITE_RPMod.panels.PLAY_CHAT.loadFromSlot(4),
            'chat-load-slot-5': () => KLITE_RPMod.panels.PLAY_CHAT.loadFromSlot(5),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic'),
            'refresh-chat-formatting': () => {
                KLITE_RPMod.panels.PLAY_CHAT.updateChatStyle();
                KLITE_RPMod.panels.PLAY_CHAT.formatChatContent();
                KLITE_RPMod.log('chat', 'Chat formatting manually refreshed');
            }
        },
        
        updateChatStyle() {
            // Add chat styles to the page
            const existingStyle = document.getElementById('chat-style-css');
            if (existingStyle) existingStyle.remove();
            
            const chatStyles = `
                <style id="chat-style-css">
                    /* Chat message styling */
                    .chat-message {
                        margin: 12px 0;
                        padding: 8px 12px;
                        border-radius: 8px;
                        max-width: 85%;
                        word-wrap: break-word;
                    }
                    
                    ${this.chatStyle === 'mobile' ? `
                        /* Modern Mobile Phone Style - WhatsApp/iMessage inspired */
                        
                        /* Chat container improvements */
                        #gametext {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 15px;
                            min-height: 100vh;
                        }
                        
                        /* Message container with avatar */
                        .chat-message-container {
                            display: flex;
                            align-items: flex-end;
                            margin-bottom: 8px;
                            gap: 8px;
                        }
                        
                        .chat-message-container.user-container {
                            flex-direction: row-reverse;
                            margin-right: 8px;
                        }
                        
                        .chat-message-container.ai-container {
                            flex-direction: row;
                            margin-left: 8px;
                        }
                        
                        /* Avatar styling */
                        .chat-avatar {
                            width: 32px;
                            height: 32px;
                            border-radius: 16px;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                            object-fit: cover;
                            flex-shrink: 0;
                        }
                        
                        .chat-avatar.user-avatar {
                            border-color: #007AFF;
                        }
                        
                        .chat-avatar.ai-avatar {
                            border-color: #E5E5EA;
                        }
                        
                        /* User messages (right side - blue bubbles) */
                        .chat-message.user-message {
                            background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
                            color: white;
                            padding: 12px 16px;
                            border-radius: 20px 20px 6px 20px;
                            max-width: 70%;
                            box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
                            position: relative;
                            font-size: 15px;
                            line-height: 1.4;
                            word-break: break-word;
                            margin: 0;
                        }
                        
                        /* User message tail */
                        .chat-message.user-message::after {
                            content: '';
                            position: absolute;
                            bottom: 0;
                            right: -8px;
                            width: 0;
                            height: 0;
                            border: 8px solid transparent;
                            border-bottom-color: #0056CC;
                            border-right: 0;
                            border-bottom-right-radius: 6px;
                        }
                        
                        /* AI messages (left side - gray bubbles) */
                        .chat-message.ai-message {
                            background: #F1F1F1;
                            color: #000;
                            padding: 12px 16px;
                            border-radius: 20px 20px 20px 6px;
                            max-width: 70%;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                            position: relative;
                            font-size: 15px;
                            line-height: 1.4;
                            word-break: break-word;
                            margin: 0;
                        }
                        
                        /* AI message tail */
                        .chat-message.ai-message::after {
                            content: '';
                            position: absolute;
                            bottom: 0;
                            left: -8px;
                            width: 0;
                            height: 0;
                            border: 8px solid transparent;
                            border-bottom-color: #F1F1F1;
                            border-left: 0;
                            border-bottom-left-radius: 6px;
                        }
                        
                        /* Dark mode adjustments */
                        .klite-active .chat-message.ai-message {
                            background: #2C2C2E;
                            color: #FFFFFF;
                        }
                        
                        .klite-active .chat-message.ai-message::after {
                            border-bottom-color: #2C2C2E;
                        }
                        
                        .klite-active #gametext {
                            background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%);
                        }
                        
                        /* Message spacing improvements */
                        .chat-message-container + .chat-message-container {
                            margin-top: 4px;
                        }
                        
                        /* Consecutive same-sender messages (tighter spacing) */
                        .chat-message-container.user-container + .chat-message-container.user-container,
                        .chat-message-container.ai-container + .chat-message-container.ai-container {
                            margin-top: 2px;
                        }
                        
                        /* Animation for new messages */
                        @keyframes messageSlideIn {
                            from {
                                opacity: 0;
                                transform: translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        .chat-message-container {
                            animation: messageSlideIn 0.3s ease-out;
                        }
                    ` : `
                        /* Classic Style - All left aligned */
                        .chat-message.user-message,
                        .chat-message.ai-message {
                            background: var(--bg2);
                            color: var(--text);
                            border: 1px solid var(--border);
                            margin-left: 0;
                            margin-right: auto;
                        }
                        
                        .chat-message.user-message {
                            border-left: 3px solid var(--accent);
                        }
                    `}
                </style>
            `;
            
            document.head.insertAdjacentHTML('beforeend', chatStyles);
            
            // Format existing game content if in Chat mode
            this.formatChatContent();
        },
        
        // Called when switching to Chat mode
        onModeEnter() {
            KLITE_RPMod.log('chat', 'Entering Chat mode - applying mobile formatting');
            this.updateChatStyle();
            setTimeout(() => {
                this.formatChatContent();
                this.setupChatFormatting();
            }, 200);
        },
        
        // Called when leaving Chat mode
        onModeExit() {
            KLITE_RPMod.log('chat', 'Exiting Chat mode - removing mobile formatting');
            
            // Clean up observer
            if (this.chatObserver) {
                this.chatObserver.disconnect();
                this.chatObserver = null;
            }
            
            // Remove chat formatting
            const gametext = document.getElementById('gametext');
            if (!gametext) return;
            
            // Remove all chat classes and reset styles
            const chunks = Array.from(gametext.children);
            chunks.forEach(chunk => {
                // Handle both new container format and old format
                if (chunk.classList.contains('chat-message-container')) {
                    // Extract original content from container and restore it
                    const messageElement = chunk.querySelector('.chat-message');
                    if (messageElement) {
                        messageElement.classList.remove('chat-message', 'user-message', 'ai-message');
                        messageElement.style.animation = '';
                        // Replace container with original message element
                        chunk.parentNode.insertBefore(messageElement, chunk);
                    }
                    chunk.remove();
                } else {
                    // Old format cleanup
                    chunk.classList.remove('chat-message', 'user-message', 'ai-message', 'chat-message-container', 'user-container', 'ai-container');
                    chunk.style.animation = '';
                }
            });
            
            // Remove chat CSS
            const chatStyle = document.getElementById('chat-style-css');
            if (chatStyle) chatStyle.remove();
        },
        
        formatChatContent() {
            // Only format content when in Chat mode (mode 3)
            if (window.localsettings?.opmode !== 3) return;
            
            const gametext = document.getElementById('gametext');
            if (!gametext) return;
            
            // Get all text chunks in the game text
            const chunks = Array.from(gametext.children);
            
            chunks.forEach(chunk => {
                // Skip if already formatted (has container or is a container)
                if (chunk.classList.contains('chat-message-container') || 
                    chunk.classList.contains('chat-message') ||
                    chunk.closest('.chat-message-container')) return;
                
                const content = chunk.textContent.trim();
                if (!content) return;
                
                // Enhanced user message detection
                const isUserMessage = 
                    // KoboldAI Lite native detection
                    chunk.classList.contains('usermessage') ||   // Existing user message class
                    chunk.id === 'usermessage' ||               // Existing user message ID
                    chunk.getAttribute('data-source') === 'user' || // Data attribute
                    
                    // Adventure mode patterns
                    content.startsWith('>') ||                    // Adventure commands
                    content.startsWith('>> ') ||                 // Double arrow commands
                    content.match(/^>\s*[a-zA-Z]/) ||            // "> action"
                    
                    // Chat/RP mode patterns
                    content.startsWith('You ') ||               // "You say something"
                    content.startsWith('You:') ||               // "You: message"
                    content.match(/^[A-Z][a-z]+\s*:/) ||        // "Player: message"
                    content.match(/^\*[A-Z][a-z]+/) ||          // "*Player does something"
                    content.match(/^".*"$/) ||                   // Quoted speech
                    
                    // User input detection
                    content.match(/^\[[Yy]ou\]/) ||             // "[You] message"
                    content.match(/^\[[Uu]ser\]/) ||            // "[User] message"
                    content.match(/^\[[Pp]layer\]/) ||          // "[Player] message"
                    
                    // Chat style detection
                    content.match(/^Me:/) ||                     // "Me: message"
                    content.match(/^User:/) ||                   // "User: message"
                    content.match(/^Player:/) ||                 // "Player: message"
                    
                    // Input field detection (messages added via input)
                    (chunk.style && chunk.style.textAlign === 'right') || // Right-aligned (common for user)
                    chunk.classList.contains('user-input') ||    // User input class
                    
                    // Fallback: if it's very short and ends with punctuation, might be user input
                    (content.length < 100 && content.match(/[.!?]$/));
                
                // Get appropriate avatar
                const avatarSrc = this.getMessageAvatar(isUserMessage, content);
                
                // Create container div
                const container = document.createElement('div');
                container.className = `chat-message-container ${isUserMessage ? 'user-container' : 'ai-container'}`;
                
                // Create avatar element
                const avatar = document.createElement('img');
                avatar.className = `chat-avatar ${isUserMessage ? 'user-avatar' : 'ai-avatar'}`;
                avatar.src = avatarSrc;
                avatar.alt = isUserMessage ? 'User' : 'AI';
                avatar.title = isUserMessage ? 'You' : 'AI Assistant';
                
                // Clone the original chunk to preserve its content and styling
                const messageElement = chunk.cloneNode(true);
                
                // Remove any existing formatting from the cloned element
                messageElement.classList.remove('chat-message', 'user-message', 'ai-message');
                
                // Add new formatting to the message element
                messageElement.classList.add('chat-message');
                messageElement.classList.add(isUserMessage ? 'user-message' : 'ai-message');
                
                // Assemble the container
                container.appendChild(avatar);
                container.appendChild(messageElement);
                
                // Replace original chunk with container
                chunk.parentNode.insertBefore(container, chunk);
                chunk.remove();
                
                // Debug log
                KLITE_RPMod.log('chat', `Formatted message with avatar: ${isUserMessage ? 'USER' : 'AI'} - "${content.substring(0, 50)}..."`);
            });
        },
        
        getMessageAvatar(isUserMessage, content) {
            if (isUserMessage) {
                // User message - use current user avatar or default
                return KLITE_RPMod.userAvatarCurrent || KLITE_RPMod.userAvatarDefault;
            } else {
                // AI message - check if GROUP chat is active
                const isGroupChatActive = KLITE_RPMod.panels.GROUP?.enabled || false;
                
                if (isGroupChatActive && KLITE_RPMod.panels.GROUP?.activeChars) {
                    // Try to determine which character is speaking based on content
                    const speakingChar = KLITE_RPMod.panels.GROUP.activeChars.find(char => {
                        const name = char.name.toLowerCase();
                        return content.toLowerCase().includes(name + ':') || 
                               content.toLowerCase().startsWith(name);
                    });
                    
                    if (speakingChar && speakingChar.avatar) {
                        return speakingChar.avatar;
                    }
                    
                    // Fallback: use current speaker's avatar
                    const currentSpeaker = KLITE_RPMod.panels.GROUP.getCurrentSpeaker();
                    if (currentSpeaker && currentSpeaker.avatar) {
                        return currentSpeaker.avatar;
                    }
                }
                
                // Single character mode or fallback - use current AI avatar or default
                return KLITE_RPMod.aiAvatarCurrent || KLITE_RPMod.aiAvatarDefault;
            }
        },
        
        saveToSlot(slotNumber) {
            const gameState = {
                gametext: window.gametext_arr ? [...window.gametext_arr] : [],
                timestamp: new Date().toISOString(),
                name: `Chat ${new Date().toLocaleTimeString()}`
            };
            
            this.saveSlots.saves[slotNumber - 1] = gameState;
            
            // Persist save slots to Lite storage
            KLITE_RPMod.saveToLiteStorage('rpmod_chat_saves', JSON.stringify(this.saveSlots));
            
            // Reload panel to update UI
            KLITE_RPMod.loadPanel('left', 'PLAY');
            KLITE_RPMod.log('saves', `Chat saved to slot ${slotNumber}`);
            // Save confirmed by UI state update
        },
        
        loadFromSlot(slotNumber) {
            const save = this.saveSlots.saves[slotNumber - 1];
            if (!save) {
                alert(`Slot ${slotNumber} is empty`);
                return;
            }
            
            if (window.gametext_arr && save.gametext) {
                window.gametext_arr.length = 0;
                window.gametext_arr.push(...save.gametext);
                if (typeof window.render_gametext === 'function') {
                    window.render_gametext();
                }
            }
            
            KLITE_RPMod.log('saves', `Chat loaded from slot ${slotNumber}`);
            // Load confirmed by chat content change
        },
        
        async loadSettings() {
            // Load chat style settings
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_chat_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.chatStyle = settings.chatStyle || 'mobile';
            }
            
            // Load save slots
            const savedSlots = await KLITE_RPMod.loadFromLiteStorage('rpmod_chat_saves');
            if (savedSlots) {
                const slots = JSON.parse(savedSlots);
                this.saveSlots = slots;
            }
        },
        
        saveSettings() {
            const settings = {
                chatStyle: this.chatStyle
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_chat_settings', JSON.stringify(settings));
        }
    };
    
    // TOOLS PANEL
    KLITE_RPMod.panels.TOOLS = {
        // State
        analysisWindow: null,
        contextCache: null,
        lastRoll: null,
        saveTimer: null,
        autoRegenerateInterval: null,
        autoRegenerateState: {
            enabled: false,
            retryCount: 0,
            maxRetries: 3,
            lastMessageHash: '',
            keywords: [],
            keywordThreshold: 2,
            keywordCaseSensitive: false
        },
        
        render() {
            return `              
                <!-- Context Analyzer -->
                ${t.section('🔍 Context Analyzer',
                    `<div class="klite-token-bar-container">
                        <div class="klite-token-bar">
                            <div id="tools-memory-bar" class="klite-token-segment klite-memory-segment" title="Memory"></div>
                            <div id="tools-wi-bar" class="klite-token-segment klite-wi-segment" title="Minimum WI (Always Active)"></div>
                            <div id="tools-story-bar" class="klite-token-segment klite-story-segment" title="Story"></div>
                            <div id="tools-anote-bar" class="klite-token-segment klite-anote-segment" title="Author's Note"></div>
                            <div id="tools-free-bar" class="klite-token-segment klite-free-segment" title="Free Space"></div>
                        </div>
                    </div>
                    <div class="klite-token-legend">
                        <div class="klite-token-legend-grid">
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-memory-segment"></div>
                                <span class="klite-token-legend-label">Memory:</span>
                                <span id="tools-memory-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-wi-segment"></div>
                                <span class="klite-token-legend-label">min. WI:</span>
                                <span id="tools-wi-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-story-segment"></div>
                                <span class="klite-token-legend-label">Context History:</span>
                                <span id="tools-story-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-anote-segment"></div>
                                <span class="klite-token-legend-label">Author's Note:</span>
                                <span id="tools-anote-tokens" class="klite-token-legend-value">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="klite-context-summary" style="margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 12px;">
                        <div style="margin-bottom: 4px;">
                            <strong>Total Context:</strong> 
                            <span id="tools-total-context">0</span> / <span id="tools-max-context">8192</span> tokens
                        </div>
                        <div>
                            <span style="color: var(--muted);">Free:</span> 
                            <span id="tools-free-tokens" style="color: var(--text); font-weight: bold;">8192</span> tokens 
                            (<span id="tools-free-percent" style="color: var(--text); font-weight: bold;">100</span>%)
                        </div>
                        <div style="margin-top: 8px;">
                            <button class="klite-btn" data-action="calculate-context" style="width: 100%; padding: 6px;">Calculate Context</button>
                        </div>
                    </div>`
                )}
                
                <!-- Smart Memory Writer -->
                ${t.section('🧠 Smart Memory Writer',
                    `<div class="klite-row">
                        ${t.select('tools-memory-context', [
                            {value: 'entire', text: 'Entire Story'},
                            {value: 'last50', text: 'Last 50 Messages'},
                            {value: 'recent', text: 'Recent Messages (10)', selected: true},
                            {value: 'last3', text: 'Most Recent (3)'}
                        ])}
                        ${t.select('tools-memory-type', [
                            {value: 'summary', text: 'Summary', selected: true},
                            {value: 'keywords', text: 'Keywords'},
                            {value: 'outline', text: 'Outline'}
                        ])}
                    </div>
                    <div style="text-align: center; margin: 15px 0;">
                        ${t.button('🧠 Generate Memory', '', 'generate-memory')}
                    </div>
                    ${t.textarea('tools-memory-output', 'Generated memory will appear here...')}
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('✓ Apply', '', 'apply-memory')}
                        ${t.button('➕ Append', '', 'append-memory')}
                    </div>`
                )}
                
                <!-- Auto-Regenerate -->
                ${t.section('🔄 Auto-Regenerate',
                    `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="tools-auto-regen-toggle" style="width: auto;">
                        <label for="tools-auto-regen-toggle" style="color: #999; font-size: 13px;">Enable Auto-Regenerate</label>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-bottom: 10px;">
                        <div>
                            <label style="color: #999; font-size: 11px;">Delay (ms):</label>
                            <input type="number" id="tools-auto-regen-delay" value="3000" min="1000" max="10000" step="500" style="
                                width: 100%; 
                                background: var(--bg2); 
                                border: 1px solid var(--border); 
                                color: var(--text); 
                                padding: 4px;
                                border-radius: 3px;
                            ">
                        </div>
                        <div>
                            <label style="color: #999; font-size: 11px;">Max Retries:</label>
                            <input type="number" id="tools-auto-regen-max" value="3" min="1" max="10" style="
                                width: 100%; 
                                background: var(--bg2); 
                                border: 1px solid var(--border); 
                                color: var(--text); 
                                padding: 4px;
                                border-radius: 3px;
                            ">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="color: #999; font-size: 11px;">Keyword Triggers:</label>
                        <textarea id="tools-regen-keywords" placeholder="Enter keywords, one per line" style="
                            width: 100%;
                            height: 60px;
                            background: var(--bg2);
                            border: 1px solid var(--border);
                            color: var(--text);
                            padding: 6px;
                            font-size: 11px;
                            resize: vertical;
                            border-radius: 3px;
                            margin-top: 5px;
                        "></textarea>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                            <div>
                                <label style="color: #999; font-size: 11px;">Required matches:</label>
                                <input type="number" id="tools-keyword-threshold" value="2" min="1" max="10" style="
                                    width: 100%;
                                    background: var(--bg2);
                                    border: 1px solid var(--border);
                                    color: var(--text);
                                    padding: 4px;
                                    border-radius: 3px;
                                ">
                            </div>
                            <div style="display: flex; align-items: center; gap: 2px; margin-top: 16px;">
                                <input type="checkbox" id="tools-keyword-case">
                                <label for="tools-keyword-case" style="color: #888; font-size: 11px;">Case sensitive</label>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="color: #999; font-size: 11px;">Trigger Conditions:</label>
                        <div style="margin-top: 5px;">
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="tools-regen-short" checked>
                                <label for="tools-regen-short" style="color: #888; font-size: 11px;">Short messages (<50 chars)</label>
                            </div>
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="tools-regen-incomplete" checked>
                                <label for="tools-regen-incomplete" style="color: #888; font-size: 11px;">Incomplete sentences</label>
                            </div>
                            <div>
                                <input type="checkbox" id="tools-regen-error">
                                <label for="tools-regen-error" style="color: #888; font-size: 11px;">Error responses</label>
                            </div>
                        </div>
                    </div>
                    
                    <div id="tools-auto-regen-status" style="
                        padding: 8px; 
                        background: rgba(0,0,0,0.3); 
                        border-radius: 4px; 
                        color: #666; 
                        font-size: 11px; 
                        text-align: center;
                    ">
                        Auto-regenerate is disabled
                    </div>`
                )}
                
                <!-- Quick Dice -->
                ${t.section('🎲 Quick Dice',
                    `<div class="klite-dice-grid">
                        ${['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d => 
                            `<button class="klite-dice-btn" data-action="roll-${d}">${d}</button>`
                        ).join('')}
                    </div>
                    <div class="klite-row">
                        ${t.input('tools-custom-dice', 'e.g., 2d6+3')}
                        ${t.button('🎲 Roll', '', 'roll-custom')}
                    </div>
                    <div id="tools-dice-result" class="klite-dice-result klite-mt"></div>`
                )}
                
                <!-- Export Tools -->
                ${t.section('📤 Export Context History',
                    `<div class="klite-buttons-fill">
                        ${t.button('📝 Markdown', '', 'export-markdown')}
                        ${t.button('📊 JSON', '', 'export-json')}
                        ${t.button('🌐 HTML', '', 'export-html')}
                    </div>`
                )}
            `;
        },
        
        init() {
            this.initializeAutoRegenerate();
        },
        
        actions: {
            'generate-memory': () => KLITE_RPMod.panels.TOOLS.generateMemory(),
            'apply-memory': () => KLITE_RPMod.panels.TOOLS.applyMemory(false),
            'append-memory': () => KLITE_RPMod.panels.TOOLS.applyMemory(true),
            'roll-custom': () => {
                const input = document.getElementById('tools-custom-dice');
                if (input?.value) KLITE_RPMod.panels.TOOLS.rollDice(input.value);
            },
            'export-markdown': () => KLITE_RPMod.panels.TOOLS.exportAs('markdown'),
            'export-json': () => KLITE_RPMod.panels.TOOLS.exportAs('json'),
            'export-html': () => KLITE_RPMod.panels.TOOLS.exportAs('html'),
            // Dice buttons
            'roll-d2': () => KLITE_RPMod.panels.TOOLS.rollDice('d2'),
            'roll-d4': () => KLITE_RPMod.panels.TOOLS.rollDice('d4'),
            'roll-d6': () => KLITE_RPMod.panels.TOOLS.rollDice('d6'),
            'roll-d8': () => KLITE_RPMod.panels.TOOLS.rollDice('d8'),
            'roll-d10': () => KLITE_RPMod.panels.TOOLS.rollDice('d10'),
            'roll-d12': () => KLITE_RPMod.panels.TOOLS.rollDice('d12'),
            'roll-d20': () => KLITE_RPMod.panels.TOOLS.rollDice('d20'),
            'roll-d100': () => KLITE_RPMod.panels.TOOLS.rollDice('d100'),
            'calculate-context': () => KLITE_RPMod.panels.TOOLS.analyzeContext(),
        },
        
        analyzeContext() {
            KLITE_RPMod.log('panels', 'Analyzing context');
            
            const maxContext = window.localsettings?.max_context_length || 8192;
            const contextParts = this.buildContextParts();
            
            // Update token bar segments
            const total = contextParts.total;
            const freeTokens = Math.max(0, maxContext - total);
            const freePercent = Math.round((freeTokens / maxContext) * 100);
            
            const memoryBar = document.getElementById('tools-memory-bar');
            const wiBar = document.getElementById('tools-wi-bar');
            const storyBar = document.getElementById('tools-story-bar');
            const anoteBar = document.getElementById('tools-anote-bar');
            const freeBar = document.getElementById('tools-free-bar');
            
            if (memoryBar) memoryBar.style.width = `${(contextParts.memory.tokens / maxContext) * 100}%`;
            if (wiBar) wiBar.style.width = `${(contextParts.worldInfo.tokens / maxContext) * 100}%`;
            if (storyBar) storyBar.style.width = `${(contextParts.story.tokens / maxContext) * 100}%`;
            if (anoteBar) anoteBar.style.width = `${(contextParts.authorNote.tokens / maxContext) * 100}%`;
            if (freeBar) freeBar.style.width = `${(freeTokens / maxContext) * 100}%`;
            
            // Update legend values
            document.getElementById('tools-memory-tokens').textContent = contextParts.memory.tokens;
            document.getElementById('tools-wi-tokens').textContent = contextParts.worldInfo.tokens;
            document.getElementById('tools-story-tokens').textContent = contextParts.story.tokens;
            document.getElementById('tools-anote-tokens').textContent = contextParts.authorNote.tokens;
            
            // Update totals and free space
            document.getElementById('tools-total-context').textContent = total;
            document.getElementById('tools-max-context').textContent = maxContext;
            document.getElementById('tools-free-tokens').textContent = freeTokens;
            document.getElementById('tools-free-percent').textContent = freePercent;
            
            this.contextCache = contextParts;
        },
        
        buildContextParts() {
            const parts = {
                memory: { text: window.current_memory || '', tokens: 0 },
                worldInfo: { text: '', tokens: 0 },
                story: { text: '', tokens: 0 },
                authorNote: { text: window.current_anote || '', tokens: 0 },
                total: 0
            };
            
            // Calculate tokens using Lite's function if available, but exclude images
            const countTokens = window.count_tokens || (text => Math.ceil(text.length / 4));
            
            // Helper function to filter out image data from text before counting tokens
            const filterImages = (text) => {
                if (!text) return '';
                // Remove base64 image data (data:image/...)
                return text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+/g, '[IMAGE]');
            };
            
            parts.memory.tokens = countTokens(filterImages(parts.memory.text));
            parts.authorNote.tokens = countTokens(filterImages(parts.authorNote.text));
            
            // Minimum WI - only count constant (always-active) WI entries and filter out images
            if (window.current_wi) {
                const constantWI = current_wi.filter(wi => wi.content && !wi.widisabled && wi.constant);
                parts.worldInfo.text = constantWI.map(wi => wi.content).join('\n');
                parts.worldInfo.tokens = countTokens(filterImages(parts.worldInfo.text));
            }
            
            // Story - filter out images from story content
            if (window.gametext_arr) {
                const recentMessages = gametext_arr.slice(-50).filter(msg => msg);
                parts.story.text = recentMessages.join('\n');
                parts.story.tokens = countTokens(filterImages(parts.story.text));
            }
            
            parts.total = parts.memory.tokens + parts.worldInfo.tokens + 
                         parts.story.tokens + parts.authorNote.tokens;
            
            return parts;
        },
               
        generateMemory() {
            const contextSize = document.getElementById('tools-memory-context')?.value || 'recent';
            const outputType = document.getElementById('tools-memory-type')?.value || 'summary';
            const outputArea = document.getElementById('tools-memory-output');
            
            KLITE_RPMod.log('panels', `Generating memory: ${outputType} from ${contextSize}`);
            
            if (!outputArea || !window.gametext_arr) return;
            
            // Prevent multiple simultaneous generations
            if (this.memoryGenerationState?.active) {
                alert('Memory generation already in progress');
                return;
            }
            
            // Get context
            const messages = gametext_arr.filter(msg => msg && msg.trim());
            const numMessages = {
                'entire': messages.length,
                'last50': 50,
                'recent': 10,
                'last3': 3
            }[contextSize] || 10;
            
            const selectedMessages = messages.slice(-numMessages);
            const contextText = selectedMessages.join('\n\n');
            
            if (!contextText) {
                outputArea.value = 'No story content to analyze.';
                return;
            }
            
            // Build prompt based on type
            const prompts = {
                'summary': `[SYSTEM: Summarize the following story content into a concise memory. Include key characters, events, and important details. Format as a brief paragraph.]

Story content:
${contextText}

Memory summary:`,
                'keywords': `[SYSTEM: Extract the most important keywords, names, places, and concepts from the following story. List them in categories.]

Story content:
${contextText}

Keywords:`,
                'outline': `[SYSTEM: Create a bullet-point outline of the main events and key information from the following story.]

Story content:
${contextText}

Outline:`
            };
            
            // Save current state for restoration
            const currentState = {
                inputValue: document.getElementById('input_text')?.value || '',
                gameTextLength: window.gametext_arr?.length || 0,
                generating: KLITE_RPMod.state.generating
            };
            
            // Initialize memory generation state
            this.memoryGenerationState = {
                active: true,
                prompt: prompts[outputType],
                outputArea: outputArea,
                originalState: currentState,
                timeout: null,
                startTime: Date.now()
            };
            
            // Set up the smart memory generation with timeout
            this.startSmartMemoryGeneration();
        },
        
        startSmartMemoryGeneration() {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;
            
            // Show initial countdown
            state.outputArea.value = 'Aborting Memory Generation in 120s';
            // Smart memory generation started
            
            // Set up 120-second timeout
            state.timeout = setTimeout(() => {
                this.abortMemoryGeneration('timeout');
            }, 120000);
            
            // Set up countdown indicator
            state.progressInterval = setInterval(() => {
                if (!state.active) return;
                
                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                const remaining = Math.max(0, 120 - elapsed);
                state.outputArea.value = `Aborting Memory Generation in ${remaining}s`;
            }, 1000);
            
            // Hook into handle_incoming_text to intercept response before it reaches chat
            state.originalHandleIncoming = window.handle_incoming_text;
            window.handle_incoming_text = (text, worker, model) => {
                // If memory generation is active, intercept the response
                if (state.active) {
                    this.captureMemoryGeneration(text);
                    return; // Don't pass to original handler - prevents adding to chat
                }
                
                // Normal processing for non-memory generations
                if (state.originalHandleIncoming) {
                    return state.originalHandleIncoming(text, worker, model);
                }
            };
            
            // Hook error handling
            this.setupMemoryGenerationErrorHandling();
            
            // Submit the memory generation prompt
            const input = document.getElementById('input_text');
            if (input) {
                input.value = state.prompt;
                KLITE_RPMod.log('panels', 'Submitting memory generation prompt');
                
                if (window.submit_generation_button) {
                    window.submit_generation_button();
                }
            }
        },
        
        captureMemoryGeneration(responseText) {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;
            
            KLITE_RPMod.log('panels', 'Capturing memory generation response');
            
            if (responseText && responseText.trim()) {
                // Clean up the response - remove system prompts and format nicely
                let memoryContent = responseText.trim();
                
                // Remove common system/prompt artifacts
                memoryContent = memoryContent
                    .replace(/^\[SYSTEM:.*?\]/i, '')
                    .replace(/^(Memory summary:|Keywords:|Outline:)/i, '')
                    .replace(/^\*\*(Memory summary|Keywords|Outline):\*\*/i, '')
                    .trim();
                
                state.outputArea.value = memoryContent || responseText.trim();
                // Memory generation completed
            } else {
                state.outputArea.value = 'Memory generation failed - no response received';
                // Memory generation failed - no response received
            }
            
            // Clean up and restore state
            this.cleanupMemoryGeneration(true);
        },
        
        setupMemoryGenerationErrorHandling() {
            const state = this.memoryGenerationState;
            if (!state) return;
            
            // Monitor for common error conditions
            const checkForErrors = () => {
                if (!state.active) return;
                
                // Check for connection errors, API errors, etc.
                const connectStatus = document.getElementById('connectstatus');
                if (connectStatus && connectStatus.classList.contains('error')) {
                    state.lastError = 'Connection error';
                    this.abortMemoryGeneration('error');
                    return;
                }
                
                // Check for actual error messages (not just elements with error classes)
                const errorElements = document.querySelectorAll('.error:not(.klite-btn), .danger:not(.klite-btn)');
                if (errorElements.length > 0) {
                    const errorText = Array.from(errorElements)
                        .map(el => el.textContent?.trim())
                        .filter(text => text && text.length > 0 && !text.includes('Clear') && !text.includes('Delete'))
                        .join('; ');
                    
                    if (errorText) {
                        state.lastError = errorText;
                        this.abortMemoryGeneration('error');
                        return;
                    }
                }
            };
            
            // Check for errors every 2 seconds
            state.errorCheckInterval = setInterval(checkForErrors, 2000);
        },
        
        abortMemoryGeneration(reason = 'manual') {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;
            
            KLITE_RPMod.log('panels', `Aborting memory generation: ${reason}`);
            
            // Abort any ongoing generation
            if (window.abort_generation) {
                window.abort_generation();
            }
            
            // Update output area
            if (reason === 'timeout') {
                state.outputArea.value = "Smart Memory couldn't be generated in 120s.";
                // Memory generation timed out
            } else if (reason === 'error') {
                state.outputArea.value = `Smart Memory Writer got the Error: ${state.lastError || 'Unknown error'}`;
                // Memory generation failed due to error
            } else if (reason === 'user_abort') {
                state.outputArea.value = 'Generation aborted by user.';
                // Memory generation aborted by user
            } else {
                state.outputArea.value = 'Memory generation cancelled';
                // Memory generation cancelled
            }
            
            // Clean up and restore state
            this.cleanupMemoryGeneration(false);
        },
        
        cleanupMemoryGeneration(success) {
            const state = this.memoryGenerationState;
            if (!state) return;
            
            // Clear timers
            if (state.timeout) {
                clearTimeout(state.timeout);
            }
            if (state.progressInterval) {
                clearInterval(state.progressInterval);
            }
            if (state.errorCheckInterval) {
                clearInterval(state.errorCheckInterval);
            }
            
            // Restore original hooks
            if (state.originalHandleIncoming) {
                window.handle_incoming_text = state.originalHandleIncoming;
            }
            if (state.originalRender) {
                window.render_gametext = state.originalRender;
            }
            
            // Remove memory generation from chat history if present
            const currentLength = window.gametext_arr?.length || 0;
            if (currentLength > state.originalState.gameTextLength) {
                // Remove the memory generation messages
                const toRemove = currentLength - state.originalState.gameTextLength;
                for (let i = 0; i < toRemove; i++) {
                    window.gametext_arr.pop();
                }
                
                // Re-render the gametext to reflect the removal
                if (state.originalRender) {
                    state.originalRender();
                }
            }
            
            // Restore input value
            const input = document.getElementById('input_text');
            if (input) {
                input.value = state.originalState.inputValue;
            }
            
            // Reset generation state
            this.memoryGenerationState = null;
            
            KLITE_RPMod.log('panels', `Memory generation cleanup completed (success: ${success})`);
        },
        
        applyMemory(append) {
            const outputArea = document.getElementById('tools-memory-output');
            const memory = outputArea?.value;
            
            if (!memory || !memory.trim() || memory.includes('Aborting Memory Generation') || memory.includes('Smart Memory couldn\'t be generated') || memory.includes('Smart Memory Writer got the Error')) {
                // No memory to apply
                return;
            }
            
            // If applying (not appending), ask for confirmation to overwrite existing memory
            if (!append && window.current_memory && window.current_memory.trim()) {
                const confirmed = confirm('Are you sure you want to overwrite MEMORY completely and remove everything that is already stored?');
                if (!confirmed) {
                    return;
                }
            }
            
            KLITE_RPMod.log('panels', `Applying memory (append: ${append})`);
            
            if (append) {
                // Append to existing memory
                const currentMemory = window.current_memory || '';
                window.current_memory = currentMemory + (currentMemory.length > 0 ? '\n\n' : '') + memory;
            } else {
                // Replace existing memory completely
                window.current_memory = memory;
            }
            
            // Update memory field in KoboldAI Lite
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory) {
                liteMemory.value = window.current_memory;
                liteMemory.dispatchEvent(new Event('input'));
            }
            
            // Trigger autosave
            window.autosave?.();
            window.save_settings?.();
            
            // Switch to memory panel to show result
            KLITE_RPMod.switchTab('right', 'MEMORY');
            // Memory ${append ? 'appended to existing memory' : 'applied (replaced existing memory)'}
            
            // Clear the output area after successful application
            outputArea.value = '';
        },
        
        rollDice(diceString) {
            const resultDiv = document.getElementById('tools-dice-result');
            if (!resultDiv) return;
            
            KLITE_RPMod.log('panels', `Rolling dice: ${diceString}`);
            
            try {
                const result = this.parseDiceRoll(diceString);
                
                resultDiv.innerHTML = `
                    <div style="font-size: 24px; font-weight: bold; color: #4a9eff;">${result.total}</div>
                    <div style="margin-top: 5px; color: #999;">${result.formula} = ${result.breakdown}</div>
                `;
                
                this.lastRoll = result;
                
                // Add to chat with proper formatting
                if (window.gametext_arr) {
                    const rollText = `\n🎲 Dice Roll: ${result.formula}\nResult: ${result.total} (${result.breakdown})\n`;
                    gametext_arr.push(rollText);
                    window.render_gametext?.();
                }
                
            } catch (error) {
                resultDiv.innerHTML = `<div style="color: #d9534f;">Error: ${error.message}</div>`;
                KLITE_RPMod.error('Dice roll error:', error);
            }
        },
        
        parseDiceRoll(diceString) {
            const match = diceString.match(/^(\d*)d(\d+)(([+-])(\d+))?$/i);
            
            if (!match) {
                throw new Error('Invalid dice format. Use format like: d20, 2d6, 3d8+5');
            }
            
            const count = parseInt(match[1] || '1');
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[4] + match[5]) : 0;
            
            if (count > 100) throw new Error('Too many dice (max 100)');
            if (sides > 1000) throw new Error('Too many sides (max 1000)');
            
            const rolls = [];
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            const sum = rolls.reduce((a, b) => a + b, 0);
            const total = sum + modifier;
            
            let breakdown = rolls.join(' + ');
            if (modifier !== 0) {
                breakdown += ` ${modifier >= 0 ? '+' : ''} ${modifier}`;
            }
            
            return { formula: diceString, rolls, modifier, sum, total, breakdown };
        },
        
        exportAs(format) {
            KLITE_RPMod.log('panels', `Exporting as ${format}`);
            
            if (!window.gametext_arr) {
                // No story content to export
                return;
            }
            
            const data = {
                title: 'KLITE RPMod Story Export',
                date: new Date().toISOString(),
                version: KLITE_RPMod.version,
                messages: gametext_arr.filter(msg => msg && msg.trim()),
                memory: window.current_memory || '',
                authorNote: window.current_anote || '',
                worldInfo: window.current_wi || [],
                settings: {
                    mode: KLITE_RPMod.getMode(),
                    temperature: window.localsettings?.temperature || 0.7,
                    rep_pen: window.localsettings?.rep_pen || 1.1,
                    top_p: window.localsettings?.top_p || 0.9
                },
                stats: {
                    totalMessages: gametext_arr.length,
                    totalWords: gametext_arr.join(' ').split(/\s+/).filter(w => w).length,
                    totalTokens: window.count_tokens ? 
                        window.count_tokens(gametext_arr.join('')) : 
                        Math.ceil(gametext_arr.join('').length / 4)
                }
            };
            
            let content, filename, mimeType;
            
            switch (format) {
                case 'markdown':
                    content = this.exportAsMarkdown(data);
                    filename = 'klite-rpmod-export.md';
                    mimeType = 'text/markdown';
                    break;
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    filename = 'klite-rpmod-export.json';
                    mimeType = 'application/json';
                    break;
                case 'html':
                    content = this.exportAsHTML(data);
                    filename = 'klite-rpmod-export.html';
                    mimeType = 'text/html';
                    break;
            }
            
            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            // Exported as ${filename}
        },
        
        exportAsMarkdown(data) {
            let md = `# ${data.title}\n\n`;
            md += `*Exported on ${new Date(data.date).toLocaleString()}*\n`;
            md += `*KLITE RPMod v${data.version}*\n\n`;
            
            md += `## Statistics\n\n`;
            md += `- **Total Messages:** ${data.stats.totalMessages}\n`;
            md += `- **Total Words:** ${data.stats.totalWords.toLocaleString()}\n`;
            md += `- **Total Tokens:** ${data.stats.totalTokens.toLocaleString()}\n\n`;
            
            if (data.memory) {
                md += `## Memory\n\n${data.memory}\n\n`;
            }
            
            if (data.authorNote) {
                md += `## Author's Note\n\n${data.authorNote}\n\n`;
            }
            
            if (data.worldInfo.length > 0) {
                md += `## World Info\n\n`;
                data.worldInfo.forEach(wi => {
                    if (!wi.widisabled && wi.content) {
                        md += `### ${wi.key || 'Untitled'}\n\n${wi.content}\n\n`;
                    }
                });
            }
            
            md += `## Story\n\n`;
            data.messages.forEach((msg, i) => {
                md += msg.trim() + '\n\n---\n\n';
            });
            
            return md;
        },
        
        exportAsHTML(data) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body { 
            font-family: Georgia, serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        h1, h2 { color: #2c3e50; }
        .metadata { 
            color: #666; 
            font-style: italic; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .memory, .author-note, .world-info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
        }
        .message { 
            margin-bottom: 30px; 
            padding: 20px; 
            background: white; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .message:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        hr { 
            border: none; 
            border-top: 1px solid #ddd; 
            margin: 30px 0; 
        }
    </style>
</head>
<body>
    <h1>${data.title}</h1>
    <div class="metadata">
        <p>Exported on ${new Date(data.date).toLocaleString()}</p>
        <p>KLITE RPMod v${data.version}</p>
    </div>
    
    <div class="stats">
        <h2>Statistics</h2>
        <ul>
            <li><strong>Total Messages:</strong> ${data.stats.totalMessages}</li>
            <li><strong>Total Words:</strong> ${data.stats.totalWords.toLocaleString()}</li>
            <li><strong>Total Tokens:</strong> ${data.stats.totalTokens.toLocaleString()}</li>
            <li><strong>Mode:</strong> ${data.settings.mode}</li>
        </ul>
    </div>
    
    ${data.memory ? `<div class="memory"><h2>Memory</h2><p>${KLITE_RPMod.escapeHtml(data.memory).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${data.authorNote ? `<div class="author-note"><h2>Author's Note</h2><p>${KLITE_RPMod.escapeHtml(data.authorNote).replace(/\n/g, '<br>')}</p></div>` : ''}
    
    ${data.worldInfo.length > 0 ? `
        <div class="world-info">
            <h2>World Info</h2>
            ${data.worldInfo.filter(wi => !wi.widisabled && wi.content).map(wi => `
                <h3>${KLITE_RPMod.escapeHtml(wi.key || 'Untitled')}</h3>
                <p>${KLITE_RPMod.escapeHtml(wi.content).replace(/\n/g, '<br>')}</p>
            `).join('')}
        </div>
    ` : ''}
    
    <h2>Story</h2>
    ${data.messages.map(msg => `<div class="message">${KLITE_RPMod.escapeHtml(msg).replace(/\n/g, '<br>')}</div>`).join('')}
</body>
</html>`;
        },

        // ==================== AUTO-REGENERATE ====================
        initializeAutoRegenerate() {
            const toggle = document.getElementById('tools-auto-regen-toggle');
            const delayInput = document.getElementById('tools-auto-regen-delay');
            const maxInput = document.getElementById('tools-auto-regen-max');
            const status = document.getElementById('tools-auto-regen-status');
            
            toggle?.addEventListener('change', (e) => {
                this.autoRegenerateState.enabled = e.target.checked;
                
                if (this.autoRegenerateState.enabled) {
                    this.startAutoRegenerate();
                    status.textContent = '✓ Auto-regenerate is active';
                    status.style.color = '#5cb85c';
                } else {
                    this.stopAutoRegenerate();
                    status.textContent = 'Auto-regenerate is disabled';
                    status.style.color = '#666';
                }
            });
            
            delayInput?.addEventListener('change', () => {
                if (this.autoRegenerateState.enabled) {
                    this.stopAutoRegenerate();
                    this.startAutoRegenerate();
                }
            });
            
            maxInput?.addEventListener('change', (e) => {
                this.autoRegenerateState.maxRetries = parseInt(e.target.value);
            });

            // Keyword input handler
            const keywordTextarea = document.getElementById('tools-regen-keywords');
            keywordTextarea?.addEventListener('input', (e) => {
                const keywords = e.target.value
                    .split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                this.autoRegenerateState.keywords = keywords;
                
                console.log(`🔄 Updated keywords: ${keywords.length} keywords set`);
            });

            // Threshold handler
            const thresholdInput = document.getElementById('tools-keyword-threshold');
            thresholdInput?.addEventListener('change', (e) => {
                this.autoRegenerateState.keywordThreshold = parseInt(e.target.value) || 1;
            });

            // Case sensitivity handler
            const caseCheckbox = document.getElementById('tools-keyword-case');
            caseCheckbox?.addEventListener('change', (e) => {
                this.autoRegenerateState.keywordCaseSensitive = e.target.checked;
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                this.stopAutoRegenerate();
            });
        },

        startAutoRegenerate() {
            const delayInput = document.getElementById('tools-auto-regen-delay');
            const delay = parseInt(delayInput?.value || '3000');
            
            console.log(`🔄 Starting auto-regenerate with ${delay}ms delay`);
            
            // Clear any existing interval
            this.stopAutoRegenerate();
            
            // Reset retry count
            this.autoRegenerateState.retryCount = 0;
            
            this.autoRegenerateInterval = setInterval(() => {
                this.checkAndRegenerate();
            }, delay);
        },

        stopAutoRegenerate() {
            if (this.autoRegenerateInterval) {
                clearInterval(this.autoRegenerateInterval);
                this.autoRegenerateInterval = null;
            }
        },

        checkAndRegenerate() {
            // Check if we should regenerate
            if (!this.shouldRegenerate()) {
                return;
            }
            
            // Check retry limit
            if (this.autoRegenerateState.retryCount >= this.autoRegenerateState.maxRetries) {
                console.log('🔄 Max retries reached, stopping auto-regenerate');
                this.stopAutoRegenerate();
                
                const status = document.getElementById('tools-auto-regen-status');
                if (status) {
                    status.textContent = '⚠️ Max retries reached';
                    status.style.color = '#f0ad4e';
                }
                return;
            }
            
            console.log(`🔄 Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);
            
            // Increment retry count
            this.autoRegenerateState.retryCount++;
            
            // Update status
            const status = document.getElementById('tools-auto-regen-status');
            if (status) {
                status.textContent = `🔄 Regenerating... (${this.autoRegenerateState.retryCount}/${this.autoRegenerateState.maxRetries})`;
                status.style.color = '#5bc0de';
            }
            
            // Call Lite's retry function
            if (typeof btn_retry === 'function') {
                btn_retry();
            }
        },

        shouldRegenerate() {
            // Check if not currently generating
            const isGenerating = document.getElementById('input_text')?.disabled === true;
            if (isGenerating) return false;
            
            // Get the last message
            const messages = document.querySelectorAll('.message');
            if (!messages.length) return false;
            
            const lastMessage = messages[messages.length - 1];
            const messageText = lastMessage?.textContent || '';
            
            // Check if it's a new message
            const messageHash = this.hashString(messageText);
            if (messageHash === this.autoRegenerateState.lastMessageHash) {
                return false;
            }
            this.autoRegenerateState.lastMessageHash = messageHash;
            
            // Check if it's an AI message
            const isAIMessage = lastMessage?.classList.contains('ai');
            if (!isAIMessage) return false;
            
            // Check trigger conditions
            const shortCheck = document.getElementById('tools-regen-short')?.checked;
            const incompleteCheck = document.getElementById('tools-regen-incomplete')?.checked;
            const errorCheck = document.getElementById('tools-regen-error')?.checked;
            
            // Check short messages
            if (shortCheck && messageText.length < 50) {
                console.log('🔄 Triggering regenerate: Short message');
                return true;
            }
            
            // Check incomplete sentences
            if (incompleteCheck) {
                const lastChar = messageText.trim().slice(-1);
                if (!['.', '!', '?', '"', '\'', '"'].includes(lastChar)) {
                    console.log('🔄 Triggering regenerate: Incomplete sentence');
                    return true;
                }
            }
            
            // Check error responses
            if (errorCheck && (messageText.includes('Error:') || messageText.includes('error'))) {
                console.log('🔄 Triggering regenerate: Error detected');
                return true;
            }
            
            // Check keyword triggers
            if (this.autoRegenerateState.keywords.length > 0) {
                const keywordMatches = this.checkKeywordTriggers(messageText);
                if (keywordMatches >= this.autoRegenerateState.keywordThreshold) {
                    console.log(`🔄 Triggering regenerate: ${keywordMatches} keywords matched (threshold: ${this.autoRegenerateState.keywordThreshold})`);
                    return true;
                }
            }
            
            return false;
        },

        checkKeywordTriggers(text) {
            const keywords = this.autoRegenerateState.keywords;
            const caseSensitive = this.autoRegenerateState.keywordCaseSensitive;
            
            let matchCount = 0;
            const checkText = caseSensitive ? text : text.toLowerCase();
            
            for (const keyword of keywords) {
                const checkKeyword = caseSensitive ? keyword : keyword.toLowerCase();
                if (checkText.includes(checkKeyword)) {
                    matchCount++;
                }
            }
            
            return matchCount;
        },

        hashString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }
    };
    
    // SCENE PANEL
    KLITE_RPMod.panels.SCENE = {
        visualStyle: {
            theme: 'default',
            ambientColor: '#4a9eff',
            highlightColor: '#5cbc5c',
            lightness: 50,
            autoGenerate: false,
            detectedEnvironment: null,
            customTheme: {
                ambientColor: '#4a9eff',
                highlightColor: '#5cbc5c', 
                lightness: 50
            }
        },
        
        environmentColors: {
            // Natural Environments
            forest: { ambient: '#4a7c59', highlight: '#6bb76b' },
            woodland: { ambient: '#4a7c59', highlight: '#6bb76b' },
            trees: { ambient: '#4a7c59', highlight: '#6bb76b' },
            jungle: { ambient: '#2d5016', highlight: '#4a7c30' },
            desert: { ambient: '#deb887', highlight: '#f4d03f' },
            sand: { ambient: '#deb887', highlight: '#f4d03f' },
            dunes: { ambient: '#c19a6b', highlight: '#e8c547' },
            ocean: { ambient: '#4682b4', highlight: '#5bc0de' },
            sea: { ambient: '#4682b4', highlight: '#5bc0de' },
            water: { ambient: '#4682b4', highlight: '#5bc0de' },
            beach: { ambient: '#f4a460', highlight: '#ffd700' },
            mountain: { ambient: '#696969', highlight: '#b0b0b0' },
            cliff: { ambient: '#696969', highlight: '#b0b0b0' },
            stone: { ambient: '#696969', highlight: '#b0b0b0' },
            cave: { ambient: '#2f2f2f', highlight: '#666666' },
            underground: { ambient: '#2f2f2f', highlight: '#666666' },
            swamp: { ambient: '#556b2f', highlight: '#8fbc8f' },
            ice: { ambient: '#b0e0e6', highlight: '#e0ffff' },
            snow: { ambient: '#f0f8ff', highlight: '#ffffff' },
            
            // Buildings & Structures  
            castle: { ambient: '#8b7355', highlight: '#d2b48c' },
            fortress: { ambient: '#8b7355', highlight: '#d2b48c' },
            tower: { ambient: '#8b7355', highlight: '#d2b48c' },
            temple: { ambient: '#daa520', highlight: '#ffd700' },
            church: { ambient: '#daa520', highlight: '#ffd700' },
            tavern: { ambient: '#8b4513', highlight: '#cd853f' },
            inn: { ambient: '#8b4513', highlight: '#cd853f' },
            library: { ambient: '#4b0082', highlight: '#9370db' },
            hospital: { ambient: '#ffffff', highlight: '#f0f8ff' },
            prison: { ambient: '#2f2f2f', highlight: '#555555' },
            dungeon: { ambient: '#1a1a1a', highlight: '#444444' },
            
            // Sci-Fi & Modern
            spaceship: { ambient: '#4169e1', highlight: '#87ceeb' },
            station: { ambient: '#4169e1', highlight: '#87ceeb' },
            space: { ambient: '#191970', highlight: '#4169e1' },
            laboratory: { ambient: '#00ffff', highlight: '#afeeee' },
            lab: { ambient: '#00ffff', highlight: '#afeeee' },
            research: { ambient: '#00ced1', highlight: '#40e0d0' },
            cyberpunk: { ambient: '#ff1493', highlight: '#ff69b4' },
            neon: { ambient: '#ff1493', highlight: '#ff69b4' },
            cyber: { ambient: '#9400d3', highlight: '#da70d6' },
            matrix: { ambient: '#00ff00', highlight: '#7fff00' },
            factory: { ambient: '#808080', highlight: '#c0c0c0' },
            
            // Horror & Dark
            graveyard: { ambient: '#2f2f2f', highlight: '#696969' },
            cemetery: { ambient: '#2f2f2f', highlight: '#696969' },
            haunted: { ambient: '#4b0082', highlight: '#8a2be2' },
            ghost: { ambient: '#4b0082', highlight: '#8a2be2' },
            blood: { ambient: '#8b0000', highlight: '#dc143c' },
            vampire: { ambient: '#8b0000', highlight: '#dc143c' },
            shadow: { ambient: '#2f2f2f', highlight: '#666666' },
            darkness: { ambient: '#1a1a1a', highlight: '#444444' },
            
            // Magic & Fantasy
            magic: { ambient: '#9370db', highlight: '#da70d6' },
            magical: { ambient: '#9370db', highlight: '#da70d6' },
            crystal: { ambient: '#00ffff', highlight: '#e0ffff' },
            gem: { ambient: '#00ffff', highlight: '#e0ffff' },
            fire: { ambient: '#ff4500', highlight: '#ff6347' },
            flame: { ambient: '#ff4500', highlight: '#ff6347' },
            lightning: { ambient: '#ffff00', highlight: '#ffffe0' },
            thunder: { ambient: '#ffd700', highlight: '#ffffe0' },
            
            // Social & Urban
            city: { ambient: '#708090', highlight: '#b0c4de' },
            urban: { ambient: '#708090', highlight: '#b0c4de' },
            market: { ambient: '#daa520', highlight: '#ffd700' },
            party: { ambient: '#ff69b4', highlight: '#ffb6c1' },
            royal: { ambient: '#800080', highlight: '#da70d6' }
        },
        
        sceneData: {
            locations: [
                // Natural Environments
                'Forest', 'Plains', 'Desert', 'Mountains', 'Beach', 'Swamp', 'Tundra', 'Jungle', 'Cave', 'River', 'Lake', 'Ocean', 'Valley', 'Cliff',
                // Urban/Rural  
                'City', 'Town', 'Village', 'Market', 'Harbor', 'Farm', 'Ranch',
                // Buildings/Structures
                'Castle', 'Tower', 'Temple', 'Church', 'Mansion', 'Cottage', 'Inn', 'Tavern', 'Library', 'Museum', 'Prison', 'Hospital', 'School', 'Stadium', 'Arena',
                // Industrial/Modern
                'Factory', 'Warehouse', 'Laboratory', 'Oil Rig', 'Space Station', 'Spaceship', 'Subway', 'Airport', 'Train Station',
                // Specific/Named Places
                'Adventurers Guild', 'Thieves Guild', 'Mage Tower', 'Royal Palace', 'Underground Bunker', 'Ancient Ruins', 'Graveyard', 'Pharmacy', 'Police Station', 'Fire Station'
            ],
            times: ['early dawn', 'dawn', 'late dawn', 'early morning', 'morning', 'late morning', 'early noon', 'noon', 'late noon', 'early afternoon', 'afternoon', 'late afternoon', 'early evening', 'evening', 'late evening', 'early night', 'night', 'late night', 'midnight', 'witching hour'],
            weather: ['clear', 'cloudy', 'overcast', 'light rain', 'rain', 'heavy rain', 'drizzle', 'storm', 'thunderstorm', 'snow', 'heavy snow', 'blizzard', 'hail', 'fog', 'mist', 'windy', 'hurricane', 'tornado', 'extreme heat', 'extreme cold', 'scorching sun', 'shadowed'],
            moods: ['neutral', 'tense', 'mysterious', 'cheerful', 'ominous', 'peaceful', 'chaotic', 'romantic', 'melancholic', 'eerie', 'festive', 'solemn', 'hostile', 'magical'],
            presets: {
                // Fantasy & Adventure
                'medieval-castle': '[Scene-description: The imposing stone walls of the medieval castle rise majestically against the clear afternoon sky. Banners flutter from the towers as guards patrol the battlements, their armor glinting in the warm sunlight. The courtyard bustles with activity as knights practice their swordplay and servants hurry about their duties.]',
                'forest-clearing': '[Scene-description: A tranquil clearing opens up in the heart of the ancient forest, where shafts of golden morning light filter through the emerald canopy above. The air is fresh with the scent of pine and blooming wildflowers, while birds sing melodiously from hidden perches. A gentle stream bubbles nearby, its crystal waters reflecting the dappled sunlight.]',
                'tavern-evening': '[Scene-description: The warm glow of the tavern spills out into the cool evening air as hearty laughter and folk music emanate from within. Travelers and locals gather around worn wooden tables, sharing tales and gossip over flagons of foaming ale. The air is thick with the scents of roasted meat, pipe smoke, and spilled wine.]',
                'mountain-peak': '[Scene-description: The majestic mountain peak stands silhouetted against the dawn sky, its snow-capped summit catching the first golden rays of sunlight. The air is thin and crisp, filled with the pure essence of high altitude. Breathtaking views stretch endlessly to the horizon, revealing valleys shrouded in morning mist far below.]',
                'ancient-temple': '[Scene-description: Ancient stone columns support the weathered temple roof, their surfaces covered in intricate carvings that seem to whisper forgotten secrets. Shadows dance mysteriously between the pillars as storm clouds drift overhead. The air is heavy with the weight of countless centuries and unspoken rituals.]',
                'stormy-coast': '[Scene-description: Dark storm clouds gather menacingly over the rocky coastline as powerful waves crash violently against the jagged cliffs below. Lightning illuminates the churning sea in brilliant flashes while thunder echoes across the desolate shore. Salt spray fills the air with the raw power of nature unleashed.]',
                
                // Modern & Urban
                'city-night': '[Scene-description: The bustling metropolis pulses with electric energy as neon lights cast vibrant reflections on wet pavement throughout the clear night. Towering glass skyscrapers pierce the star-speckled sky while streams of people hurry along sidewalks, their faces intermittently illuminated by the blue glow of smartphones and the warm amber of street lamps. The air hums with tension and possibility as the urban jungle comes alive in the darkness.]',
                'cozy-cafe': '[Scene-description: The intimate neighborhood café radiates warmth and tranquility as gentle morning rain creates a rhythmic percussion against the large windows. Aromatic steam spirals upward from ceramic coffee cups while smooth jazz melodies drift softly through the air, punctuated by the quiet murmur of conversation. Patrons find perfect refuge from the light drizzle outside, nestled in comfortable chairs surrounded by the comforting scents of freshly ground beans and warm pastries.]',
                'hospital-room': '[Scene-description: The pristine hospital room maintains an atmosphere of quiet dignity under the soft hum of fluorescent lighting and the gentle whisper of medical equipment. Muted afternoon light filters through venetian blinds, creating delicate patterns of light and shadow that dance across the stark white walls. The air carries the faint scent of antiseptic while the overcast sky outside mirrors the solemn, contemplative mood within.]',
                'suburban-home': '[Scene-description: The charming suburban residence sits serenely along a tree-lined street as golden evening light bathes the neighborhood in peaceful tranquility. Warm yellow light spills from the windows while a meticulously maintained garden bursts with colorful blooms that frame the welcoming front entrance. The clear sky above is painted in soft pastel hues, and the distant laughter of children playing echoes gently through the calm evening air.]',
                'subway-station': '[Scene-description: The subterranean transit hub thrums with the urgent energy of morning rush hour as waves of commuters surge across the platform with purposeful determination. Trains glide in and out with mechanical precision while harsh fluorescent lights flicker overhead, casting stark shadows between the concrete pillars. The air vibrates with tension as the distant thunder of approaching trains reverberates through the underground tunnels, punctuated by the sharp screech of brakes and the electronic chime of opening doors.]',
                'office-building': '[Scene-description: The sleek glass and steel tower stretches ambitiously toward the clear afternoon sky, its reflective facade creating a brilliant mirror that captures and multiplies the warm sunlight. Within the modern interior, the steady hum of focused productivity permeates the air as professionals move efficiently between ergonomic workstations and glass-walled conference rooms. The atmosphere maintains a balanced, professional energy where the rhythm of keyboards and quiet conversations creates the soundtrack of corporate achievement.]',
                
                // Sci-Fi & Future
                'space-station': '[Scene-description: The advanced orbital facility drifts silently through the infinite void of space, its interconnected modules and gleaming metallic corridors alive with the steady hum of life support systems and atmospheric processors. Through reinforced viewports of transparent aluminum, the magnificent blue marble of Earth hangs suspended like a precious jewel against the velvet tapestry of star-filled darkness. The station maintains perfect environmental equilibrium while distant nebulae paint the cosmic horizon in ethereal colors.]',
                'research-lab': '[Scene-description: The cutting-edge research facility pulses with an otherworldly luminescence as holographic displays project complex data streams and experimental readouts into the sterile night air. Dedicated scientists work with focused intensity through the clear night hours, their faces bathed in the ethereal blue-white glow of quantum computers and molecular analyzers. The mysterious atmosphere crackles with scientific potential as breakthrough discoveries hover tantalizingly close within the lab\'s pristine, technology-laden environment.]',
                'alien-world': '[Scene-description: The exotic extraterrestrial landscape extends infinitely beneath an alien sky painted in magnificent gradients of deep purple, burnished gold, and shimmering copper hues. Towering crystalline formations of unknown composition pierce the earth like prismatic monuments, refracting the dawn light into spectacular rainbows. Twin binary stars emerge slowly on the distant horizon, casting long mysterious shadows that shift and dance across the alien terrain in patterns never seen on Earth.]',
                'cyberpunk-city': '[Scene-description: Torrential rain cascades relentlessly through the neon-saturated cyberpunk metropolis, transforming the dark asphalt streets into flowing rivers of liquid rainbow light. Towering megascrapers pierce the stormy night sky while massive holographic advertisements flicker and glitch between their imposing facades, casting an ominous glow over the urban canyon below. The city\'s digital pulse throbs through fiber optic networks and neural implants, creating an atmosphere thick with technological menace and electronic dystopia.]',
                'spaceship-bridge': '[Scene-description: The command bridge of the starship vibrates with urgent activity as crew members maintain vigilant watch over their sophisticated control stations during the clear afternoon shift rotation. The massive main viewscreen dominates the forward bulkhead, displaying the breathtaking yet dangerous expanse of deep space that stretches endlessly ahead. Amber alert lights pulse rhythmically throughout the command center, casting tense shadows across focused faces while the ship hurtles through the cosmos toward an uncertain destination.]',
                'energy-facility': '[Scene-description: The colossal power generation complex pulses ominously with barely contained nuclear forces as the reactor core bathes the clear night in an eerie, supernatural blue radiance. Massive cooling towers exhale clouds of steam into the starlit sky while countless warning lights blink in hypnotic patterns across the industrial complex. Automated systems work tirelessly to maintain the precarious balance of atomic forces within, creating an atmosphere of technological dread where the boundary between progress and catastrophe remains razor-thin.]',
                
                // Horror & Mystery
                'abandoned-house': '[Scene-description: The derelict Victorian mansion looms menacingly through the thick, swirling fog like a malevolent specter from forgotten nightmares. Shattered windows stare blankly into the darkness like hollow eye sockets while weathered shutters hang askew on rusted hinges. The night air carries the haunting symphony of creaking floorboards, groaning timbers, and rattling shutters that create an unsettling cacophony of decay and abandonment.]',
                'graveyard': '[Scene-description: The ancient cemetery emerges from the ghostly fog like a realm suspended between the world of the living and the dead as the midnight hour strikes. Weathered headstones and crumbling mausoleums rise from the mist like silent stone sentinels keeping eternal vigil over their charges. A massive withered oak tree stands as the cemetery\'s gnarled guardian, its twisted branches clawing desperately toward the moonless sky while shadows dance between the weathered monuments in the eerie, supernatural stillness.]',
                'foggy-moor': '[Scene-description: The bleak moorland extends endlessly into the fog-choked night, where gnarled trees twist into grotesque shapes and brackish pools reflect nothing but darkness. The marshland creates an otherworldly landscape of treacherous terrain and stagnant water that harbors unknown dangers. Ominous sounds drift across the desolate expanse as indistinct shadows move just beyond the edge of vision, suggesting malevolent presences lurking within the impenetrable mist.]',
                'dark-cave': '[Scene-description: The massive cave entrance gapes open like the ravenous maw of some primordial beast, its throat disappearing into unfathomable darkness that seems to swallow light itself. The steady percussion of water droplets falling from invisible stalactites echoes through the stone chambers while the clear night air mingles with the cave\'s ancient breath. The atmosphere carries whispers of geological secrets and prehistoric dangers that have slumbered in the depths for millennia, creating an ominous sense of trespassing in a realm where humans were never meant to venture.]',
                'midnight-forest': '[Scene-description: The primeval forest maintains an unnatural silence beneath the pale silver moonlight that filters through the dense canopy like ethereal fingers. Ancient trees tower overhead like silent giants while their elongated shadows writhe and shift across the forest floor as if possessed by supernatural forces. The clear midnight air amplifies every subtle sound until each rustle of leaves and snap of twigs resonates with eerie significance, suggesting that unseen watchers move through the darkness with mysterious and possibly malevolent intent.]',
                'crime-scene': '[Scene-description: Yellow police tape flutters ominously in the rain-drenched urban alleyway where harsh portable floodlights cut through the darkness, creating stark contrasts of light and shadow. Forensic investigators work methodically through the night while steady rain washes the asphalt, threatening to erase crucial evidence. The crime scene whispers its dark secrets through scattered clues and blood-stained pavement as the restless city continues its nocturnal pulse beyond the cordoned perimeter, indifferent to the tragedy that has unfolded within.]'
            }
        },
        
        getGenerationMode(modeValue) {
            switch(modeValue) {
                case "0": return 'Disabled';
                case "1": return 'AI Horde';
                case "2": return 'KCPP / Forge / A1111';
                case "3": return 'OpenAI DALL-E';
                case "4": return 'ComfyUI';
                case "5": return 'Pollinations.ai';
                default: return 'Detecting...';
            }
        },
        
        render() {
            return `
                <!-- Visual Style -->
                ${t.section('🌈 Visual Style',
                    `<div class="klite-visual-style-controls">
                        <div class="klite-row" style="margin-bottom: 8px;">
                            ${t.checkbox('auto-ambient-color', 'Auto-generate ambient color', this.visualStyle?.autoGenerate || false)}
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--text);">Theme:</label>
                            ${t.select('visual-theme', [
                                {value: 'default', text: 'Default (No Colors)', selected: (this.visualStyle?.theme || 'default') === 'default'},
                                {value: 'custom', text: 'Custom', selected: (this.visualStyle?.theme || 'default') === 'custom'},
                                {value: 'blue', text: 'Blue/Dark', selected: (this.visualStyle?.theme || 'default') === 'blue'},
                                {value: 'light', text: 'Sandstorm', selected: (this.visualStyle?.theme || 'default') === 'light'},
                                {value: 'dark', text: 'Full Dark Mode', selected: (this.visualStyle?.theme || 'default') === 'dark'},
                                {value: 'corpo', text: 'Corpo Mode', selected: (this.visualStyle?.theme || 'default') === 'corpo'},
                                {value: 'coder', text: 'Coder (Matrix Green)', selected: (this.visualStyle?.theme || 'default') === 'coder'},
                                {value: 'rainbow', text: 'Candy UI', selected: (this.visualStyle?.theme || 'default') === 'rainbow'},
                                {value: 'pink', text: 'Pink Edition', selected: (this.visualStyle?.theme || 'default') === 'pink'},
                                {value: 'transparent', text: 'Transparent Edition', selected: (this.visualStyle?.theme || 'default') === 'transparent'}
                            ])}
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--text);">Ambient color:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <div id="ambient-color-preview" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border); background-color: ${this.visualStyle?.ambientColor || '#4a9eff'};"></div>
                                <input type="color" id="ambient-color-picker" value="${this.visualStyle?.ambientColor || '#4a9eff'}" style="width: 40px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
                            </div>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--text);">Highlight color:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <div id="highlight-color-preview" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border); background-color: ${this.visualStyle?.highlightColor || '#5cbc5c'};"></div>
                                <input type="color" id="highlight-color-picker" value="${this.visualStyle?.highlightColor || '#5cbc5c'}" style="width: 40px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
                            </div>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--text);">Lightness:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <span style="font-size: 11px; color: var(--muted);">Dark</span>
                                <input type="range" id="ambient-lightness" min="0" max="100" value="${this.visualStyle?.lightness || 50}" class="klite-slider" style="flex: 1;">
                                <span style="font-size: 11px; color: var(--muted);">Light</span>
                                <span id="ambient-lightness-display" style="font-size: 11px; color: var(--muted); min-width: 30px;">${this.visualStyle?.lightness || 50}</span>
                            </div>
                        </div>
                        <div id="ambient-status" style="font-size: 11px; color: var(--muted); margin-top: 4px;">
                            ${this.visualStyle?.detectedEnvironment ? `Detected: ${this.visualStyle.detectedEnvironment}` : 'No environment detected'}
                        </div>
                    </div>`
                )}
                
                ${t.section('🎨 Image Generation',
                    `<div class="klite-image-status" style="margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">Image Generation Status</div>
                        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                            <div>
                                <span style="color: var(--muted);">Provider:</span>
                                <span id="scene-mode-status" style="color: var(--text); font-weight: bold;">${this.getGenerationMode(window.localsettings?.generate_images_mode)}</span>
                            </div>
                            <div>
                                <span style="color: var(--muted);">Model:</span>
                                <span id="scene-model-status" style="color: var(--text); font-weight: bold;">${window.localsettings?.generate_images_model || 'Default'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="klite-image-controls" style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px;">Auto-generate:</label>
                        ${t.select('scene-autogen', [
                            {value: '0', text: 'Disabled', selected: true},
                            {value: '1', text: 'Immersive Mode'},
                            {value: '2', text: 'All Messages'},
                            {value: '3', text: 'User Messages Only'},
                            {value: '4', text: 'Non-User Messages Only'}
                        ])}
                        <div style="margin-top: 8px;">
                            ${t.checkbox('scene-detect', 'Detect ImgGen Instructions', false)}
                        </div>
                    </div>
                    <div class="klite-image-generation-section">
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Scene & Characters</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 10px;">
                            ${t.button('🏞️ Current Scene', 'klite-btn-sm', 'gen-scene')}
                            ${t.button('🤖 AI Character', 'klite-btn-sm', 'gen-ai-portrait')}
                            ${t.button('👤 Persona', 'klite-btn-sm', 'gen-user-portrait')}
                            ${t.button('👥 Group Shot', 'klite-btn-sm', 'gen-group')}
                        </div>
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Events & Actions</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 10px;">
                            ${t.button('⚔️ Combat', 'klite-btn-sm', 'gen-combat')}
                            ${t.button('💬 Dialogue', 'klite-btn-sm', 'gen-dialogue')}
                            ${t.button('🎭 Plot', 'klite-btn-sm', 'gen-dramatic')}
                            ${t.button('🌅 Atmosphere', 'klite-btn-sm', 'gen-atmosphere')}
                        </div>
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Context-Based</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px;">
                            ${t.button('📝 Memory', 'klite-btn-sm', 'gen-memory')}
                            ${t.button('📄 Last Message', 'klite-btn-sm', 'gen-last-message')}
                            ${t.button('🔄 Recent Events', 'klite-btn-sm', 'gen-recent')}
                            ${t.button('🎯 Custom', 'klite-btn-sm', 'gen-custom')}
                        </div>
                    </div>`
                )}
                
                ${t.section('🎭 Quick Scene Setup',
                    `<div style="margin-bottom: 12px; font-size: 11px; color: var(--muted);">
                        Presets below build a scene description here for your convenience.
                    </div>
                    ${t.textarea('scene-desc', 'Scene description will auto-generate here...', 'min-height: 200px !important;')}
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Append to Memory', 'primary', 'append-scene')}
                        ${t.button('Append to Context', 'primary', 'apply-scene')}
                    </div>`
                )}
                
                ${t.section('🎛️ Generic Scene Presets',
                    `<div class="klite-scene-controls">
                        <div class="klite-scene-control-row">
                            <label class="klite-scene-label">Location:</label>
                            ${t.select('scene-location', this.sceneData.locations.map(l => ({value: l, text: l})))}
                        </div>
                        <div class="klite-scene-control-row">
                            <label class="klite-scene-label">Time:</label>
                            ${t.select('scene-time', this.sceneData.times.map(t => ({value: t, text: t})))}
                        </div>
                        <div class="klite-scene-control-row">
                            <label class="klite-scene-label">Weather:</label>
                            ${t.select('scene-weather', this.sceneData.weather.map(w => ({value: w, text: w})))}
                        </div>
                        <div class="klite-scene-control-row">
                            <label class="klite-scene-label">Mood:</label>
                            ${t.select('scene-mood', this.sceneData.moods.map(m => ({value: m, text: m})))}
                        </div>
                    </div>`
                )}
                
                ${t.section('📚 Detailed Scene Presets',
                    `<div class="klite-scene-presets">
                        <div style="margin-bottom: 12px; font-size: 11px; color: var(--muted);">
                            Quick-apply preset scenes for common scenarios
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--muted); grid-column: 1 / -1; margin-bottom: 4px;">FANTASY & ADVENTURE</div>
                            ${t.button('🏰 Medieval Castle', 'klite-btn-xs', 'preset-medieval-castle')}
                            ${t.button('🌲 Forest Clearing', 'klite-btn-xs', 'preset-forest-clearing')}
                            ${t.button('🏪 Tavern Evening', 'klite-btn-xs', 'preset-tavern-evening')}
                            ${t.button('🗻 Mountain Peak', 'klite-btn-xs', 'preset-mountain-peak')}
                            ${t.button('🏛️ Ancient Temple', 'klite-btn-xs', 'preset-ancient-temple')}
                            ${t.button('🌊 Stormy Coast', 'klite-btn-xs', 'preset-stormy-coast')}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--muted); grid-column: 1 / -1; margin-bottom: 4px;">MODERN & URBAN</div>
                            ${t.button('🌃 City Night', 'klite-btn-xs', 'preset-city-night')}
                            ${t.button('☕ Cozy Cafe', 'klite-btn-xs', 'preset-cozy-cafe')}
                            ${t.button('🏥 Hospital Room', 'klite-btn-xs', 'preset-hospital-room')}
                            ${t.button('🏠 Suburban Home', 'klite-btn-xs', 'preset-suburban-home')}
                            ${t.button('🚇 Subway Station', 'klite-btn-xs', 'preset-subway-station')}
                            ${t.button('🏢 Office Building', 'klite-btn-xs', 'preset-office-building')}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--muted); grid-column: 1 / -1; margin-bottom: 4px;">SCI-FI & FUTURE</div>
                            ${t.button('🚀 Space Station', 'klite-btn-xs', 'preset-space-station')}
                            ${t.button('🔬 Research Lab', 'klite-btn-xs', 'preset-research-lab')}
                            ${t.button('🌌 Alien World', 'klite-btn-xs', 'preset-alien-world')}
                            ${t.button('🤖 Cyberpunk City', 'klite-btn-xs', 'preset-cyberpunk-city')}
                            ${t.button('🛸 Spaceship Bridge', 'klite-btn-xs', 'preset-spaceship-bridge')}
                            ${t.button('⚡ Energy Facility', 'klite-btn-xs', 'preset-energy-facility')}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--muted); grid-column: 1 / -1; margin-bottom: 4px;">HORROR & MYSTERY</div>
                            ${t.button('🏚️ Abandoned House', 'klite-btn-xs', 'preset-abandoned-house')}
                            ${t.button('⚰️ Graveyard', 'klite-btn-xs', 'preset-graveyard')}
                            ${t.button('🌫️ Foggy Moor', 'klite-btn-xs', 'preset-foggy-moor')}
                            ${t.button('🕳️ Dark Cave', 'klite-btn-xs', 'preset-dark-cave')}
                            ${t.button('🌙 Midnight Forest', 'klite-btn-xs', 'preset-midnight-forest')}
                            ${t.button('🔍 Crime Scene', 'klite-btn-xs', 'preset-crime-scene')}
                        </div>
                    </div>`
                )}
                
            `;
        },
        
        init() {
            this.updateDescription();
            this.updateImageGenerationStatus();
            
            // Add change listeners
            ['scene-location', 'scene-time', 'scene-weather', 'scene-mood'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.updateDescription());
            });
        },
        
        updateImageGenerationStatus() {
            const modeStatus = document.getElementById('scene-mode-status');
            const modelStatus = document.getElementById('scene-model-status');
            
            if (typeof localsettings !== 'undefined') {
                // Update mode status
                if (modeStatus && localsettings.generate_images_mode !== undefined) {
                    const mode = this.getGenerationMode(localsettings.generate_images_mode);
                    modeStatus.textContent = mode;
                    
                    if (localsettings.generate_images_mode === '0') {
                        modeStatus.style.color = '#999';
                    } else {
                        modeStatus.style.color = '#4a9eff';
                    }
                }
                
                // Update model status
                if (modelStatus && localsettings.generate_images_model !== undefined) {
                    modelStatus.textContent = localsettings.generate_images_model;
                    
                    if (localsettings.generate_images_mode === '0') {
                        modelStatus.style.color = '#999';
                    } else {
                        modelStatus.style.color = '#4a9eff';
                    }
                }
            }
        },
        
        // Image generation provider detection
        isImageGenerationAvailable() {
            // Check if image generation function exists
            if (!window.do_manual_gen_image || typeof window.do_manual_gen_image !== 'function') {
                return { available: false, reason: 'Image generation function not available' };
            }
            
            // Check if KoboldAI Lite has image generation enabled
            if (window.localsettings) {
                const settings = window.localsettings;
                
                // Check for various image generation settings that might indicate it's configured
                if (settings.image_generation_enabled === false) {
                    return { available: false, reason: 'Image generation disabled in settings' };
                }
                
                // Check for AI Horde image generation
                if (settings.horde_image_enabled) {
                    return { available: true, provider: 'AI Horde', reason: 'AI Horde image generation enabled' };
                }
                
                // Check for AUTOMATIC1111 (local Stable Diffusion)
                if (settings.a1111_enabled || settings.sd_enabled) {
                    return { available: true, provider: 'AUTOMATIC1111', reason: 'Local Stable Diffusion enabled' };
                }
                
                // Check for other image providers
                if (settings.image_provider || settings.imggen_provider) {
                    return { available: true, provider: settings.image_provider || settings.imggen_provider, reason: 'Custom image provider configured' };
                }
            }
            
            // Default to available if function exists (optimistic approach)
            return { available: true, provider: 'Unknown', reason: 'Image generation function available' };
        },
        
        generateImage(prompt, action = 'image generation') {
            const status = this.isImageGenerationAvailable();
            
            if (!status.available) {
                // Image generation unavailable: ${status.reason}
                return false;
            }
            
            try {
                window.do_manual_gen_image(prompt);
                // ${action} started (${status.provider || 'Provider'})
                KLITE_RPMod.log('scene', `Image generation: ${prompt} via ${status.provider}`);
                return true;
            } catch (error) {
                KLITE_RPMod.error('Image generation failed:', error);
                // Image generation failed - check console for details
                return false;
            }
        },

        applyScenePreset(presetId) {
            const preset = this.sceneData.presets[presetId];
            if (!preset) return;
            
            // Set the description directly (now a simple string)
            const descTextarea = document.getElementById('scene-desc');
            if (descTextarea) descTextarea.value = preset;
            
            // Applied ${presetId.replace('-', ' ')} preset
        },

        // Visual Style Management
        detectEnvironment() {
            if (!window.gametext_arr) return null;
            
            // Get recent text to analyze
            const recentText = window.gametext_arr.slice(-3).join(' ').toLowerCase();
            const words = recentText.split(/\s+/);
            
            // Score different environments based on keyword frequency
            const environmentScores = {};
            
            for (const word of words) {
                if (this.environmentColors[word]) {
                    environmentScores[word] = (environmentScores[word] || 0) + 1;
                }
            }
            
            // Find environment with highest score
            let bestEnvironment = null;
            let bestScore = 0;
            
            for (const [env, score] of Object.entries(environmentScores)) {
                if (score > bestScore) {
                    bestScore = score;
                    bestEnvironment = env;
                }
            }
            
            return bestEnvironment;
        },
        
        updateVisualColors(ambientColor, highlightColor, lightness) {
            this.visualStyle.ambientColor = ambientColor;
            this.visualStyle.highlightColor = highlightColor;
            this.visualStyle.lightness = lightness;
            
            // Apply colors to CSS custom properties
            const root = document.documentElement;
            const ambientRgb = this.hexToRgb(ambientColor);
            const highlightRgb = this.hexToRgb(highlightColor);
            const alpha = lightness / 100;
            
            // Update CSS variables for button colors and highlights
            root.style.setProperty('--ambient-color', ambientColor);
            root.style.setProperty('--ambient-color-rgb', `${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}`);
            root.style.setProperty('--highlight-color', highlightColor);
            root.style.setProperty('--highlight-color-rgb', `${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}`);
            root.style.setProperty('--ambient-alpha', alpha.toString());
            root.style.setProperty('--accent', ambientColor);
            
            // Only apply visual styling if not in 'default' theme
            if (this.visualStyle.theme !== 'default') {
                this.applyDualColorToAllElements(ambientColor, highlightColor, lightness);
            } else {
                // Remove any existing color styling for default theme
                this.removeColorStyling();
            }
            
            // Update previews
            const ambientPreview = document.getElementById('ambient-color-preview');
            if (ambientPreview) ambientPreview.style.backgroundColor = ambientColor;
            
            const highlightPreview = document.getElementById('highlight-color-preview');
            if (highlightPreview) highlightPreview.style.backgroundColor = highlightColor;
            
            // Save to storage
            this.saveVisualStyle();
        },
        
        applyDualColorToAllElements(ambientColor, highlightColor, lightness) {
            const alpha = lightness / 100;
            const ambientRgb = this.hexToRgb(ambientColor);
            const highlightRgb = this.hexToRgb(highlightColor);
            
            // Create comprehensive CSS for dual-color styling across ALL UI elements
            const globalStyle = `
                /* Update CSS custom properties */
                :root {
                    --accent: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                    --primary: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                
                /* Buttons */
                .klite-btn, .klite-btn-primary, .klite-submit-btn {
                    background-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                    border-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.min(alpha + 0.3, 1)}) !important;
                }
                .klite-btn:hover, .klite-btn-primary:hover, .klite-submit-btn:hover {
                    background-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${Math.min(alpha + 0.2, 1)}) !important;
                    border-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                .klite-btn.active, .klite-btn-primary.active {
                    background-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${Math.min(alpha + 0.3, 1)}) !important;
                    border-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                
                /* Tabs - Apply lightness consistently */
                .klite-tabs {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.max(alpha, 0.8)}) !important;
                }
                .klite-tab {
                    background: rgba(255,255,255,${alpha * 0.2}) !important;
                }
                .klite-tab:hover {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${alpha * 0.6}) !important;
                }
                .klite-tab.active {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${Math.min(alpha + 0.3, 1)}) !important;
                }
                
                /* Navigation and Status Elements - Apply lightness */
                #topmenu, .topmenu {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.max(alpha, 0.7)}) !important;
                }
                #topmenu .nav-link, .topmenu .nav-link,
                #topmenu .navtoggler, .topmenu .navtoggler,
                #topmenu .mainnav, .topmenu .mainnav,
                .navbar-nav .nav-link,
                #topbtn_admin, #topbtn_reconnect, #topbtn_customendpt,
                #topbtn_ai, #topbtn_newgame, #topbtn_scenarios,
                #topbtn_quickplay, #topbtn_save_load, #topbtn_settings,
                #topbtn_multiplayer_join, #topbtn_multiplayer_leave {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                    border-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.min(alpha + 0.2, 1)}) !important;
                }
                #topmenu .nav-link:hover, .topmenu .nav-link:hover,
                #topmenu .navtoggler:hover, .topmenu .navtoggler:hover,
                #topmenu .mainnav:hover, .topmenu .mainnav:hover,
                .navbar-nav .nav-link:hover {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${Math.min(alpha + 0.2, 1)}) !important;
                    border-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                #connectstatus {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                
                /* Progress and Indicators - Apply lightness */
                .klite-progress-bar {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                .klite-memory-segment {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                
                /* WI Badges and Tags - Apply lightness */
                span[style*="background: var(--accent)"] {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                
                /* Speaker indicators and highlights - Apply lightness */
                [style*="border-color: var(--accent)"] {
                    border-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                [style*="background: rgba(74, 158, 255"] {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha * 0.2}) !important;
                }
                [style*="background: rgba(74,158,255"] {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha * 0.3}) !important;
                }
                
                /* Dropdown selects and inputs with accent colors - Apply lightness */
                .klite-select:focus, .klite-textarea:focus, .klite-input:focus {
                    border-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                    box-shadow: 0 0 0 2px rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha * 0.4}) !important;
                }
                
                /* Checkboxes - Apply lightness */
                .klite-checkbox:checked {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                    border-color: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                .klite-checkbox:checked:hover {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, ${Math.min(alpha + 0.2, 1)}) !important;
                    border-color: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                
                /* Sliders - Apply lightness */
                .klite-slider::-webkit-slider-thumb {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.max(alpha, 0.8)}) !important;
                }
                .klite-slider::-webkit-slider-thumb:hover {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                .klite-slider::-moz-range-thumb {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${Math.max(alpha, 0.8)}) !important;
                }
                .klite-slider::-moz-range-thumb:hover {
                    background: rgba(${highlightRgb.r}, ${highlightRgb.g}, ${highlightRgb.b}, 1) !important;
                }
                
                /* Any remaining elements using the old hardcoded blue - Apply lightness */
                [style*="#4a9eff"] {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
                [style*="#337ab7"] {
                    background: rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${alpha}) !important;
                }
            `;
            
            // Apply or update the comprehensive dual-color style
            let styleElement = document.getElementById('ambient-color-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'ambient-color-style';
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = globalStyle;
        },
        
        removeColorStyling() {
            // Remove the ambient color style element to restore default colors
            const styleElement = document.getElementById('ambient-color-style');
            if (styleElement) {
                styleElement.remove();
            }
            
            // Reset CSS custom properties to defaults
            const root = document.documentElement;
            root.style.setProperty('--accent', '#4a9eff');
            root.style.setProperty('--primary', '#337ab7');
        },
        
        switchToCustomTheme(ambientColor, highlightColor, lightness) {
            // Save current colors as custom theme
            this.visualStyle.customTheme = {
                ambientColor: ambientColor,
                highlightColor: highlightColor,
                lightness: lightness
            };
            
            // Switch to custom theme
            this.visualStyle.theme = 'custom';
            
            // Update theme dropdown
            const themeSelect = document.getElementById('visual-theme');
            if (themeSelect) {
                themeSelect.value = 'custom';
            }
            
            // Apply the visual colors immediately
            this.updateVisualColors(ambientColor, highlightColor, lightness);
            
            // Update UI controls to reflect the new values
            setTimeout(() => this.updateUIControls(), 50);
            
            KLITE_RPMod.log('scene', `Switched to custom theme with ambient: ${ambientColor}, highlight: ${highlightColor}, lightness: ${lightness}`);
        },
        
        applyTheme(theme) {
            this.visualStyle.theme = theme;
            
            // Remove existing theme classes
            document.body.classList.remove('theme-default', 'theme-light', 'theme-dark', 'theme-corpo');
            
            // Apply new theme class
            document.body.classList.add(`theme-${theme}`);
            
            // Apply theme-specific CSS (this will override everything)
            this.injectThemeCSS(theme);
            
            // Update colors and lightness based on theme defaults
            const themeDefaults = {
                default: { ambientColor: '#4a9eff', highlightColor: '#5cbc5c', lightness: 50 }, // No styling applied
                custom: this.visualStyle.customTheme, // Use saved custom settings
                blue: { ambientColor: '#4a9eff', highlightColor: '#5cbc5c', lightness: 50 },    // Original blue theme
                light: { ambientColor: '#b8860b', highlightColor: '#ffd700', lightness: 40 },  // Golden/Yellow
                dark: { ambientColor: '#555555', highlightColor: '#888888', lightness: 30 },   // Subtle grays
                corpo: { ambientColor: '#dc8b47', highlightColor: '#ff7f00', lightness: 45 },   // Orange theme
                coder: { ambientColor: '#00ff00', highlightColor: '#7fff00', lightness: 60 },   // Matrix green
                rainbow: { ambientColor: '#ff69b4', highlightColor: '#00bfff', lightness: 55 }, // Pink/Blue
                pink: { ambientColor: '#ff1493', highlightColor: '#ffb6c1', lightness: 50 },    // Deep/Light pink
                transparent: { ambientColor: '#ffffff', highlightColor: '#cccccc', lightness: 20 } // Low opacity white/gray
            };
            
            const defaults = themeDefaults[theme];
            this.visualStyle.ambientColor = defaults.ambientColor;
            this.visualStyle.highlightColor = defaults.highlightColor;
            this.visualStyle.lightness = defaults.lightness;
            
            // Update the UI controls to reflect new values
            this.updateUIControls();
            
            // Apply the colors with new lightness
            this.updateVisualColors(this.visualStyle.ambientColor, this.visualStyle.highlightColor, this.visualStyle.lightness);
            
            // Save to storage
            this.saveVisualStyle();
            
            KLITE_RPMod.log('scene', `Applied theme: ${theme} with ambient: ${defaults.ambientColor}, highlight: ${defaults.highlightColor}, lightness: ${defaults.lightness}`);
        },
        
        injectThemeCSS(theme) {
            // Remove existing theme CSS completely
            const existingTheme = document.getElementById('theme-style');
            if (existingTheme) existingTheme.remove();
            
            // Also remove ambient color style to reset button colors
            const existingAmbient = document.getElementById('ambient-color-style');
            if (existingAmbient) existingAmbient.remove();
            
            const themeCSS = document.createElement('style');
            themeCSS.id = 'theme-style';
            
            switch (theme) {
                case 'light':
                    themeCSS.textContent = this.getLightThemeCSS();
                    break;
                case 'dark':
                    themeCSS.textContent = this.getDarkThemeCSS();
                    break;
                case 'corpo':
                    themeCSS.textContent = this.getCorpoThemeCSS();
                    break;
                default:
                    // Default theme - reset everything to original RPmod styles
                    themeCSS.textContent = this.getDefaultThemeCSS();
                    break;
            }
            
            document.head.appendChild(themeCSS);
        },
        
        getDefaultThemeCSS() {
            return `
                /* Default RPmod Theme Reset */
                .klite-active {
                    --bg: #1e1e1e !important;
                    --bg2: #2a2a2a !important;
                    --bg3: #3a3a3a !important;
                    --text: #e0e0e0 !important;
                    --muted: #888888 !important;
                    --border: #444444 !important;
                    --accent: #4a9eff !important;
                }
                .klite-active .klite-panel-left,
                .klite-active .klite-panel-right,
                .klite-active .klite-panel-top {
                    background: #1e1e1e !important;
                    color: #e0e0e0 !important;
                }
                .klite-active .klite-panel-header h3 {
                    color: #4a9eff !important;
                }
                .klite-active .klite-section-header {
                    background: #2a2a2a !important;
                    color: #4a9eff !important;
                }
            `;
        },
        
        getLightThemeCSS() {
            return `
                /* Light Theme CSS - Clean & Neutral */
                .klite-active {
                    --bg: #f8f9fa !important;
                    --bg2: #ffffff !important;
                    --bg3: #f1f3f4 !important;
                    --text: #202124 !important;
                    --muted: #5f6368 !important;
                    --border: #dadce0 !important;
                    --accent: #b8860b !important;
                }
                .klite-active .klite-panel-left,
                .klite-active .klite-panel-right,
                .klite-active .klite-panel-top {
                    background: #f8f9fa !important;
                    color: #202124 !important;
                    border-color: #dadce0 !important;
                }
                .klite-active .klite-panel-header h3 {
                    color: #b8860b !important;
                }
                .klite-active .klite-section-header {
                    background: #f1f3f4 !important;
                    color: #b8860b !important;
                }
                .klite-active input, .klite-active textarea, .klite-active select {
                    background: #ffffff !important;
                    color: #202124 !important;
                    border-color: #dadce0 !important;
                }
                .klite-active .klite-maincontent {
                    background: #ffffff !important;
                }
            `;
        },
        
        getDarkThemeCSS() {
            return `
                /* Full Dark Theme CSS */
                .klite-active {
                    --bg: #0a0a0a !important;
                    --bg2: #1a1a1a !important;
                    --bg3: #2a2a2a !important;
                    --text: #ffffff !important;
                    --muted: #888888 !important;
                    --border: #333333 !important;
                    --accent: #555555 !important;
                }
                .klite-active .klite-panel-left,
                .klite-active .klite-panel-right,
                .klite-active .klite-panel-top {
                    background: #0a0a0a !important;
                    color: #ffffff !important;
                    border-color: #333333 !important;
                }
                .klite-active .klite-panel-header h3 {
                    color: #888888 !important;
                }
                .klite-active .klite-section-header {
                    background: #1a1a1a !important;
                    color: #888888 !important;
                }
                .klite-active .klite-btn {
                    background: transparent !important;
                    border: 1px solid #333333 !important;
                    color: #ffffff !important;
                }
                .klite-active .klite-btn:hover {
                    background: #2a2a2a !important;
                }
                .klite-active .klite-maincontent {
                    background: #0a0a0a !important;
                }
            `;
        },
        
        getCorpoThemeCSS() {
            return `
                /* Corpo Theme CSS (Claude.ai inspired) */
                .klite-active {
                    --bg: #fafafa !important;
                    --bg2: #ffffff !important;
                    --bg3: #f5f5f5 !important;
                    --text: #1a1a1a !important;
                    --muted: #666666 !important;
                    --border: #e5e7eb !important;
                    --accent: #dc8b47 !important;
                }
                .klite-active .klite-panel-left,
                .klite-active .klite-panel-right,
                .klite-active .klite-panel-top {
                    background: #fafafa !important;
                    color: #1a1a1a !important;
                    border-color: #e5e7eb !important;
                }
                .klite-active .klite-panel-header h3 {
                    color: #dc8b47 !important;
                }
                .klite-active .klite-section-header {
                    background: #f5f5f5 !important;
                    color: #dc8b47 !important;
                }
                .klite-active input, .klite-active textarea, .klite-active select {
                    background: #ffffff !important;
                    color: #1a1a1a !important;
                    border-color: #e5e7eb !important;
                }
                .klite-active .klite-btn {
                    background: #dc8b47 !important;
                    border-color: #dc8b47 !important;
                    color: white !important;
                    border-radius: 8px !important;
                }
                .klite-active .klite-btn:hover {
                    background: #c77a3a !important;
                }
                .klite-active .klite-maincontent {
                    background: #ffffff !important;
                }
            `;
        },
        
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        
        autoGenerateAmbientColor() {
            if (!this.visualStyle.autoGenerate || this.visualStyle.theme === 'default') return;
            
            const detectedEnvironment = this.detectEnvironment();
            if (detectedEnvironment && this.environmentColors[detectedEnvironment]) {
                this.visualStyle.detectedEnvironment = detectedEnvironment;
                const envColors = this.environmentColors[detectedEnvironment];
                
                // If auto-generation changes colors on a preset theme, switch to custom
                if (this.visualStyle.theme !== 'custom' && this.visualStyle.theme !== 'default') {
                    // Switch to custom and apply the detected colors (switchToCustomTheme handles everything)
                    this.switchToCustomTheme(envColors.ambient, envColors.highlight, this.visualStyle.lightness);
                } else {
                    this.updateVisualColors(envColors.ambient, envColors.highlight, this.visualStyle.lightness);
                }
                
                // Update status display
                const statusEl = document.getElementById('ambient-status');
                if (statusEl) {
                    statusEl.textContent = `Detected: ${detectedEnvironment}`;
                }
                
                KLITE_RPMod.log('scene', `Auto-generated dual colors for: ${detectedEnvironment} (ambient: ${envColors.ambient}, highlight: ${envColors.highlight})`);
            }
        },
        
        async loadVisualStyle() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_visual_style');
            if (saved) {
                try {
                    const savedStyle = JSON.parse(saved);
                    this.visualStyle = {...this.visualStyle, ...savedStyle};
                    
                    // Handle legacy data migration
                    if (savedStyle.intensity && !savedStyle.lightness) {
                        this.visualStyle.lightness = savedStyle.intensity;
                    }
                    if (!this.visualStyle.highlightColor) {
                        this.visualStyle.highlightColor = '#5cbc5c';
                    }
                    if (!this.visualStyle.customTheme) {
                        this.visualStyle.customTheme = {
                            ambientColor: this.visualStyle.ambientColor,
                            highlightColor: this.visualStyle.highlightColor,
                            lightness: this.visualStyle.lightness
                        };
                    }
                    
                    this.applyTheme(this.visualStyle.theme);
                    this.updateVisualColors(this.visualStyle.ambientColor, this.visualStyle.highlightColor, this.visualStyle.lightness);
                } catch (e) {
                    KLITE_RPMod.error('Failed to load visual style:', e);
                }
            }
        },
        
        saveVisualStyle() {
            KLITE_RPMod.saveToLiteStorage('rpmod_visual_style', JSON.stringify(this.visualStyle));
        },
        
        updateUIControls() {
            // Update ambient color picker
            const ambientColorPicker = document.getElementById('ambient-color-picker');
            if (ambientColorPicker) {
                ambientColorPicker.value = this.visualStyle.ambientColor;
            }
            
            // Update ambient color preview
            const ambientPreview = document.getElementById('ambient-color-preview');
            if (ambientPreview) {
                ambientPreview.style.backgroundColor = this.visualStyle.ambientColor;
            }
            
            // Update highlight color picker
            const highlightColorPicker = document.getElementById('highlight-color-picker');
            if (highlightColorPicker) {
                highlightColorPicker.value = this.visualStyle.highlightColor;
            }
            
            // Update highlight color preview
            const highlightPreview = document.getElementById('highlight-color-preview');
            if (highlightPreview) {
                highlightPreview.style.backgroundColor = this.visualStyle.highlightColor;
            }
            
            // Update lightness slider and display
            const lightnessSlider = document.getElementById('ambient-lightness');
            const lightnessDisplay = document.getElementById('ambient-lightness-display');
            if (lightnessSlider) {
                lightnessSlider.value = this.visualStyle.lightness;
            }
            if (lightnessDisplay) {
                lightnessDisplay.textContent = this.visualStyle.lightness;
            }
            
            // Update theme dropdown
            const themeSelect = document.getElementById('visual-theme');
            if (themeSelect) {
                themeSelect.value = this.visualStyle.theme;
            }
            
            // Update auto-generate checkbox
            const autoCheckbox = document.getElementById('auto-ambient-color');
            if (autoCheckbox) {
                autoCheckbox.checked = this.visualStyle.autoGenerate;
            }
        },

        actions: {
            // Scene Preset Actions
            'preset-medieval-castle': () => KLITE_RPMod.panels.SCENE.applyScenePreset('medieval-castle'),
            'preset-forest-clearing': () => KLITE_RPMod.panels.SCENE.applyScenePreset('forest-clearing'),
            'preset-tavern-evening': () => KLITE_RPMod.panels.SCENE.applyScenePreset('tavern-evening'),
            'preset-mountain-peak': () => KLITE_RPMod.panels.SCENE.applyScenePreset('mountain-peak'),
            'preset-ancient-temple': () => KLITE_RPMod.panels.SCENE.applyScenePreset('ancient-temple'),
            'preset-stormy-coast': () => KLITE_RPMod.panels.SCENE.applyScenePreset('stormy-coast'),
            'preset-city-night': () => KLITE_RPMod.panels.SCENE.applyScenePreset('city-night'),
            'preset-cozy-cafe': () => KLITE_RPMod.panels.SCENE.applyScenePreset('cozy-cafe'),
            'preset-hospital-room': () => KLITE_RPMod.panels.SCENE.applyScenePreset('hospital-room'),
            'preset-suburban-home': () => KLITE_RPMod.panels.SCENE.applyScenePreset('suburban-home'),
            'preset-subway-station': () => KLITE_RPMod.panels.SCENE.applyScenePreset('subway-station'),
            'preset-office-building': () => KLITE_RPMod.panels.SCENE.applyScenePreset('office-building'),
            'preset-space-station': () => KLITE_RPMod.panels.SCENE.applyScenePreset('space-station'),
            'preset-research-lab': () => KLITE_RPMod.panels.SCENE.applyScenePreset('research-lab'),
            'preset-alien-world': () => KLITE_RPMod.panels.SCENE.applyScenePreset('alien-world'),
            'preset-cyberpunk-city': () => KLITE_RPMod.panels.SCENE.applyScenePreset('cyberpunk-city'),
            'preset-spaceship-bridge': () => KLITE_RPMod.panels.SCENE.applyScenePreset('spaceship-bridge'),
            'preset-energy-facility': () => KLITE_RPMod.panels.SCENE.applyScenePreset('energy-facility'),
            'preset-abandoned-house': () => KLITE_RPMod.panels.SCENE.applyScenePreset('abandoned-house'),
            'preset-graveyard': () => KLITE_RPMod.panels.SCENE.applyScenePreset('graveyard'),
            'preset-foggy-moor': () => KLITE_RPMod.panels.SCENE.applyScenePreset('foggy-moor'),
            'preset-dark-cave': () => KLITE_RPMod.panels.SCENE.applyScenePreset('dark-cave'),
            'preset-midnight-forest': () => KLITE_RPMod.panels.SCENE.applyScenePreset('midnight-forest'),
            'preset-crime-scene': () => KLITE_RPMod.panels.SCENE.applyScenePreset('crime-scene'),
            
            'append-scene': () => {
                const desc = document.getElementById('scene-desc')?.value;
                if (!desc) return;
                
                const formattedDesc = '\n' + desc + '\n';
                
                if (window.current_memory) {
                    window.current_memory = formattedDesc + '\n' + window.current_memory;
                } else {
                    window.current_memory = formattedDesc;
                }
                
                // Update memory field
                const liteMemory = document.getElementById('memorytext');
                if (liteMemory) {
                    liteMemory.value = window.current_memory;
                    liteMemory.dispatchEvent(new Event('input'));
                }
                
                KLITE_RPMod.switchTab('right', 'MEMORY');
                // Scene appended to memory
            },
            
            'apply-scene': () => {
                const desc = document.getElementById('scene-desc')?.value;
                if (!desc) return;
                
                const formattedDesc = '\n' + desc + '\n';
                
                // Add to story
                if (window.gametext_arr) {
                    gametext_arr.push(formattedDesc);
                    window.render_gametext?.();
                }
                
                // Scene applied to story
            },
            
            'gen-scene': () => {
                const desc = document.getElementById('scene-desc')?.value;
                const location = document.getElementById('scene-location')?.value;
                const time = document.getElementById('scene-time')?.value;
                const weather = document.getElementById('scene-weather')?.value;
                const mood = document.getElementById('scene-mood')?.value;
                
                const imagePrompt = `${mood} ${location} during ${time}, ${weather} weather, highly detailed scene, landscape art`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Scene generation');
            },
            
            'gen-ai-portrait': () => {
                const name = window.localsettings?.chatopponent?.split('||$||')[0] || 'character';
                const mood = document.getElementById('scene-mood')?.value || 'neutral';
                const imagePrompt = `Portrait of ${name}, ${mood} expression, detailed character art, high quality`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'AI character portrait generation');
            },
            
            'gen-user-portrait': () => {
                const userName = window.localsettings?.chatname || 'User';
                const mood = document.getElementById('scene-mood')?.value || 'neutral';
                const imagePrompt = `Portrait of ${userName}, ${mood} expression, detailed character art, high quality`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'User character portrait generation');
            },
            
            'gen-group': () => {
                const aiName = window.localsettings?.chatopponent?.split('||$||')[0] || 'character';
                const userName = window.localsettings?.chatname || 'User';
                const location = document.getElementById('scene-location')?.value || 'scene';
                const imagePrompt = `Group shot of ${userName} and ${aiName} in ${location}, detailed character art, dynamic composition`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Group shot generation');
            },
            
            'gen-combat': () => {
                const location = document.getElementById('scene-location')?.value || 'battlefield';
                const imagePrompt = `Intense combat scene in ${location}, action scene, dynamic angles, dramatic lighting`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Generating combat scene');
            },
            
            'gen-dialogue': () => {
                const aiName = window.localsettings?.chatopponent?.split('||$||')[0] || 'character';
                const userName = window.localsettings?.chatname || 'User';
                const imagePrompt = `${userName} and ${aiName} having an intimate conversation, dialogue scene, emotional expressions`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Generating dialogue scene');
            },
            
            'gen-dramatic': () => {
                const location = document.getElementById('scene-location')?.value || 'scene';
                const mood = document.getElementById('scene-mood')?.value || 'dramatic';
                const imagePrompt = `Dramatic ${mood} moment in ${location}, cinematic composition, emotional intensity`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Generating dramatic moment');
            },
            
            'gen-atmosphere': () => {
                const location = document.getElementById('scene-location')?.value || 'location';
                const time = document.getElementById('scene-time')?.value || 'time';
                const weather = document.getElementById('scene-weather')?.value || 'weather';
                const mood = document.getElementById('scene-mood')?.value || 'atmospheric';
                const imagePrompt = `Atmospheric ${mood} ${location} during ${time} with ${weather} weather, environmental art, mood lighting`;
                KLITE_RPMod.panels.SCENE.generateImage(imagePrompt, 'Generating atmospheric scene');
            },
            
            'gen-memory': () => {
                const memoryText = window.current_memory || '';
                const prompt = memoryText ? `Scene based on: ${memoryText.substring(0, 200)}...` : 'Scene based on current memory context';
                KLITE_RPMod.panels.SCENE.generateImage(prompt + ', detailed illustration, narrative art', 'Memory-based image generation');
            },
            
            'gen-last-message': () => {
                const lastMessage = window.gametext_arr?.[window.gametext_arr.length - 1] || '';
                const prompt = lastMessage ? `Scene depicting: ${lastMessage.substring(0, 200)}...` : 'Scene based on last message';
                KLITE_RPMod.panels.SCENE.generateImage(prompt + ', detailed illustration, story art', 'Last message scene generation');
            },
            
            'gen-recent': () => {
                const recentMessages = window.gametext_arr?.slice(-3).join(' ') || '';
                const prompt = recentMessages ? `Scene depicting recent events: ${recentMessages.substring(0, 200)}...` : 'Scene based on recent events';
                KLITE_RPMod.panels.SCENE.generateImage(prompt + ', detailed illustration, story continuation', 'Recent events scene generation');
            },
            
            'gen-custom': () => {
                const customPrompt = prompt('Enter custom image prompt:');
                if (customPrompt) {
                    KLITE_RPMod.panels.SCENE.generateImage(customPrompt, 'Custom image generation');
                }
            }
        },
        
        async init() {
            // Load saved visual style
            await this.loadVisualStyle();
            
            // Set up event handlers for visual style controls
            this.setupVisualStyleHandlers();
            
            // Update UI controls to reflect loaded values
            setTimeout(() => this.updateUIControls(), 100);
            
            // Auto-generate ambient color on init if enabled and not in default theme
            if (this.visualStyle.autoGenerate && this.visualStyle.theme !== 'default') {
                setTimeout(() => this.autoGenerateAmbientColor(), 1000);
            }
        },
        
        setupVisualStyleHandlers() {
            // Auto-generate checkbox
            const autoCheckbox = document.getElementById('auto-ambient-color');
            if (autoCheckbox) {
                autoCheckbox.addEventListener('change', (e) => {
                    this.visualStyle.autoGenerate = e.target.checked;
                    this.saveVisualStyle();
                    
                    if (e.target.checked) {
                        // Don't auto-switch to custom when toggling the checkbox, only when detection actually happens
                        this.autoGenerateAmbientColor();
                    }
                });
            }
            
            // Theme dropdown
            const themeSelect = document.getElementById('visual-theme');
            if (themeSelect) {
                themeSelect.addEventListener('change', (e) => {
                    this.applyTheme(e.target.value);
                    // Update UI controls to reflect changes, but don't refresh panel to avoid breaking handlers
                    setTimeout(() => this.updateUIControls(), 100);
                });
            }
            
            // Ambient color picker
            const ambientColorPicker = document.getElementById('ambient-color-picker');
            if (ambientColorPicker) {
                ambientColorPicker.addEventListener('change', (e) => {
                    // Check if we need to switch to custom theme (manual color change on preset)
                    if (this.visualStyle.theme !== 'custom' && this.visualStyle.theme !== 'default') {
                        this.switchToCustomTheme(e.target.value, this.visualStyle.highlightColor, this.visualStyle.lightness);
                    } else {
                        this.updateVisualColors(e.target.value, this.visualStyle.highlightColor, this.visualStyle.lightness);
                    }
                    // Update preview without refreshing panel
                    const preview = document.getElementById('ambient-color-preview');
                    if (preview) {
                        preview.style.backgroundColor = e.target.value;
                    }
                });
            }
            
            // Highlight color picker
            const highlightColorPicker = document.getElementById('highlight-color-picker');
            if (highlightColorPicker) {
                highlightColorPicker.addEventListener('change', (e) => {
                    // Check if we need to switch to custom theme (manual color change on preset)
                    if (this.visualStyle.theme !== 'custom' && this.visualStyle.theme !== 'default') {
                        this.switchToCustomTheme(this.visualStyle.ambientColor, e.target.value, this.visualStyle.lightness);
                    } else {
                        this.updateVisualColors(this.visualStyle.ambientColor, e.target.value, this.visualStyle.lightness);
                    }
                    // Update preview without refreshing panel
                    const preview = document.getElementById('highlight-color-preview');
                    if (preview) {
                        preview.style.backgroundColor = e.target.value;
                    }
                });
            }
            
            // Lightness slider
            const lightnessSlider = document.getElementById('ambient-lightness');
            const lightnessDisplay = document.getElementById('ambient-lightness-display');
            if (lightnessSlider && lightnessDisplay) {
                lightnessSlider.addEventListener('input', (e) => {
                    const lightness = parseInt(e.target.value);
                    lightnessDisplay.textContent = lightness;
                    // Check if we need to switch to custom theme (manual lightness change on preset)
                    if (this.visualStyle.theme !== 'custom' && this.visualStyle.theme !== 'default') {
                        this.switchToCustomTheme(this.visualStyle.ambientColor, this.visualStyle.highlightColor, lightness);
                    } else {
                        this.updateVisualColors(this.visualStyle.ambientColor, this.visualStyle.highlightColor, lightness);
                    }
                });
            }
        },
        
        updateDescription() {
            const location = document.getElementById('scene-location')?.value;
            const time = document.getElementById('scene-time')?.value;
            const weather = document.getElementById('scene-weather')?.value;
            const mood = document.getElementById('scene-mood')?.value;
            
            const descriptions = {
                'Forest': {
                    'dawn': 'The first rays of golden sunlight filter through the emerald canopy, casting dancing shadows on the forest floor covered in morning dew',
                    'night': 'Moonlight barely penetrates the thick foliage, creating mysterious silhouettes and deep shadows between the ancient trunks',
                    'default': 'Ancient trees tower overhead like natural cathedrals, their branches intertwining to form a living roof above the moss-covered ground'
                },
                'Castle': {
                    'twilight': 'The weathered stone walls glow with warm amber light as the last rays of day illuminate the ancient battlements and towering spires',
                    'night': 'Torches flicker along the battlements, casting dancing shadows on the worn stone while guards patrol the moonlit ramparts',
                    'default': 'Massive stone walls rise imposingly from the earth, their weathered surfaces telling tales of countless battles and royal ceremonies'
                },
                'City': {
                    'night': 'Neon lights reflect off rain-slicked pavement as the urban landscape pulses with electric energy and distant traffic sounds',
                    'morning': 'The sprawling city awakens with bustling activity as commuters fill the sidewalks and the air fills with the sounds of urban life',
                    'default': 'Towering buildings stretch toward the sky like glass and steel monuments, their windows glinting in the light above busy streets'
                },
                'Space Station': {
                    'default': 'Countless stars glitter through reinforced viewports, the vast cosmic void stretching endlessly beyond the humming corridors of gleaming metal'
                }
            };
            
            const locationDesc = descriptions[location]?.[time] || descriptions[location]?.default || `The ${location.toLowerCase()} stretches before you`;
            
            const weatherEffects = {
                'rain': 'Rain patters steadily against surfaces, creating rhythmic melodies and fresh, petrichor-scented air',
                'storm': 'Thunder rumbles ominously overhead while lightning illuminates the darkened sky in brief, dramatic flashes',
                'snow': 'Snow falls silently, blanketing everything in pristine white and muffling all sounds to create an ethereal quiet',
                'fog': 'Thick fog obscures distant shapes, creating an atmosphere of mystery where familiar landmarks become ghostly silhouettes',
                'clear': 'The air is crystal clear, offering perfect visibility and a sense of crisp, invigorating freshness',
                'windy': 'Strong winds whip through the area, carrying distant scents and sounds while making fabrics and loose objects dance',
                'hot': 'Intense heat shimmers in the air, creating wavering mirages and a sense of languid, heavy atmosphere'
            };
            
            const moodColors = {
                'peaceful': 'A profound sense of tranquility pervades the space, filling every corner with calm and gentle harmony',
                'tense': 'Electric tension crackles in the air, every shadow and sound seeming charged with anticipation and unspoken anxiety',
                'mysterious': 'An air of profound mystery hangs heavy, as if ancient secrets whisper just beyond the edge of perception',
                'cheerful': 'A bright, infectious cheerfulness fills the atmosphere, lifting spirits and bringing warmth to every interaction',
                'ominous': 'Something feels deeply and fundamentally wrong, as if dark forces are gathering just beyond sight',
                'romantic': 'Romance tinges the atmosphere with soft passion, making every moment feel intimate and emotionally charged',
                'chaotic': 'Pure chaos reigns supreme, with energy crackling unpredictably and order seeming like a distant memory',
                'serene': 'Perfect serenity blankets everything in peaceful stillness, creating a sanctuary of calm and spiritual rest'
            };
            
            const desc = `[Scene-tags: ${location}, ${time}, ${weather}, ${mood}]
[Scene-description: ${locationDesc}. ${weatherEffects[weather] || 'The weather is ' + weather}. ${moodColors[mood] || 'The mood is ' + mood}. The atmosphere is thick with anticipation, every detail contributing to the immersive environment that surrounds the characters.]`;
            
            const textarea = document.getElementById('scene-desc');
            if (textarea) textarea.value = desc;
        }
    };
    
    // GROUP PANEL
    KLITE_RPMod.panels.GROUP = {
        enabled: false,
        activeChars: [],
        currentSpeaker: 0,
        speakerHistory: [],
        
        // Auto-response system
        speakerMode: 1, // 1=manual, 2=round-robin, 3=random, 4=keyword, 5=talkative, 6=party
        autoResponses: {
            enabled: false,
            delay: 10,
            enableSelfAnswers: false,
            continueWithoutPlayer: false,
            autoAdvanceAfterTrigger: true
        },
        autoResponseTimer: null,
        isUserTyping: false,
        roundRobinPosition: 0,
        lastTriggerTime: {},
        
        async init() {
            // Load saved settings
            await this.loadSettings();
            // Setup input monitoring when panel is first used
            this.setupInputMonitoring();
            // Setup event handlers after render
            setTimeout(() => this.setupEventHandlers(), 100);
        },
        
        render() {
            return `
                ${t.section('Group Chat Control',
                    `<label>
                        <input type="checkbox" id="group-enabled" ${this.enabled ? 'checked' : ''}>
                        Enable Group Chat Mode
                    </label>
                    <div class="klite-muted klite-mt">
                        When enabled, multiple characters will participate in the conversation.
                    </div>`
                )}
                
                ${this.enabled ? this.renderGroupControls() : ''}
            `;
        },
        
        setupEventHandlers() {
            document.getElementById('group-enabled')?.addEventListener('change', e => {
                this.enabled = e.target.checked;
                this.refresh();
                
                if (this.enabled) {
                    window.localsettings.opmode = 3; // Force chat mode
                    this.updateKoboldSettings();
                }
                
                // Refresh PLAY_RP panel to update character controls without switching to it
                if (KLITE_RPMod.panels.PLAY_RP) {
                    // Check if PLAY panel is currently visible and showing PLAY_RP
                    if (KLITE_RPMod.state.tabs.left === 'PLAY') {
                        const mode = KLITE_RPMod.getMode();
                        const isRPMode = mode === 'chat' || mode === 'instruct';
                        
                        if (isRPMode) {
                            // Re-render the panel content without switching tabs
                            const container = document.getElementById('content-left');
                            if (container) {
                                container.innerHTML = KLITE_RPMod.panels.PLAY_RP.render();
                                // Re-initialize the panel
                                setTimeout(async () => {
                                    await KLITE_RPMod.panels.PLAY_RP.init();
                                }, 10);
                            }
                        }
                    }
                    
                    // Always update the state so it shows correctly when switching to it
                    if (!this.enabled) {
                        KLITE_RPMod.panels.PLAY_RP.characterEnabled = false;
                    }
                }
            });
            
            
        },
        
        changeSpeakerMode(newMode) {
            this.speakerMode = parseInt(newMode);
            this.saveSettings(); // Save the new setting
            this.clearAutoResponseTimer();
            KLITE_RPMod.loadPanel('left', 'GROUP');
        },
        
        getSpeakerModeDescription() {
            switch(this.speakerMode) {
                case 1: return 'Manual order: Characters speak only when triggered manually.';
                case 2: return 'Round Robin: Characters take turns speaking in a circular order.';
                case 3: return 'Random Selection: A random character is chosen for each turn, with optional exclusion of recent speakers.';
                case 4: return 'Keyword Triggered: Characters respond when mentioned by name or specific keywords in the conversation.';
                case 5: return 'Talkative Weighted: Characters speak based on their talkativeness rating with cooldown periods.';
                case 6: return 'Party Round Robin: Everyone speaks once per round before anyone gets to speak again.';
                default: return 'Manual order: Characters speak only when triggered manually.';
            }
        },
        
        renderGroupControls() {
            return `
                ${t.section('Characters in Group',
                    `<div id="group-chars">
                        ${this.renderActiveChars()}
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('+Char', '', 'add-from-library')}
                        ${t.button('+Custom', '', 'add-custom')}
                        ${this.getCurrentSpeaker()?.isCustom ? t.button('Edit', 'primary', 'edit-current') : ''}
                    </div>`
                )}
                
                ${t.section('Current Status',
                    `<div class="klite-muted">
                        Current Speaker: <strong>${this.getCurrentSpeaker()?.name || '—'}</strong>
                    </div>
                    <div class="klite-mt">
                        <label>Next Speaker Selection:</label>
                        <select id="speaker-mode" class="klite-select" style="width: 100%;" onchange="KLITE_RPMod.panels.GROUP.changeSpeakerMode(this.value)">
                            <option value="1" ${this.speakerMode === 1 ? 'selected' : ''}>Manual Order</option>
                            <option value="2" ${this.speakerMode === 2 ? 'selected' : ''}>Round Robin</option>
                            <option value="3" ${this.speakerMode === 3 ? 'selected' : ''}>Random Selection</option>
                            <option value="4" ${this.speakerMode === 4 ? 'selected' : ''}>Keyword Triggered</option>
                            <option value="5" ${this.speakerMode === 5 ? 'selected' : ''}>Talkative Weighted</option>
                            <option value="6" ${this.speakerMode === 6 ? 'selected' : ''}>Party Round Robin</option>
                        </select>
                    </div>
                    <div id="speaker-mode-description" style="margin-top: 6px; font-size: 11px; color: var(--muted); padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        ${this.getSpeakerModeDescription()}
                    </div>
                    
                    ${this.renderAutoResponseControls()}
                    
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Advance Speaker', '', 'next-speaker')}
                        ${t.button('Trigger Speaker', 'primary', 'trigger-response')}
                    </div>`
                )}
                
                ${this.speakerHistory.length > 0 ? t.section('Speaker History',
                    `<div style="max-height: 120px; overflow-y: auto; font-size: 11px;">
                        ${this.speakerHistory.slice(-10).reverse().map((entry, i) => `
                            <div style="padding: 2px 4px; margin: 1px 0; background: rgba(0,0,0,0.1); border-radius: 3px; display: flex; justify-content: space-between;">
                                <span>${entry.name}</span>
                                <span style="color: var(--muted);">${this.formatTime(entry.timestamp)}</span>
                            </div>
                        `).join('')}
                    </div>`
                ) : ''}
            `;
        },
        
        renderAutoResponseControls() {
            const isManual = this.speakerMode === 1;
            const isDisabled = isManual || !this.autoResponses.enabled;
            
            return `
                <div style="margin-top: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg3); ${isManual ? 'opacity: 0.5;' : ''}">
                    <div style="margin-bottom: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: ${isManual ? 'not-allowed' : 'pointer'};">
                            <input type="checkbox" id="auto-responses-enabled" ${this.autoResponses.enabled ? 'checked' : ''} 
                                   ${isManual ? 'disabled' : ''}
                                   onchange="KLITE_RPMod.panels.GROUP.toggleAutoResponses(this.checked)">
                            <span style="font-weight: bold; color: ${isManual ? 'var(--muted)' : 'var(--text)'};">Enable Auto Responses</span>
                        </label>
                        ${isManual ? '<div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Auto responses are disabled in Manual Order mode</div>' : ''}
                    </div>
                    
                    <div style="margin-left: 20px;">
                        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 12px; color: var(--muted);">Delay between triggers:</label>
                            <input type="number" id="auto-response-delay" min="1" max="300" value="${this.autoResponses.delay}" 
                                   ${isDisabled ? 'disabled' : ''}
                                   style="width: 60px; padding: 2px 4px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 2px; ${isDisabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                                   onchange="KLITE_RPMod.panels.GROUP.updateAutoResponseDelay(this.value)">
                            <span style="font-size: 12px; color: var(--muted);">seconds</span>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="enable-self-answers" ${this.autoResponses.enableSelfAnswers ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.GROUP.updateAutoResponseSetting('enableSelfAnswers', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Enable self-answers</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="continue-without-player" ${this.autoResponses.continueWithoutPlayer ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.GROUP.updateAutoResponseSetting('continueWithoutPlayer', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Continue without player input</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="auto-advance-after-trigger" ${this.autoResponses.autoAdvanceAfterTrigger ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.GROUP.updateAutoResponseSetting('autoAdvanceAfterTrigger', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Auto advance after trigger</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderActiveChars() {
            if (this.activeChars.length === 0) {
                return '<div class="klite-center klite-muted">No characters in group</div>';
            }
            
            return this.activeChars.map((char, i) => {
                const avatar = char.image || '';
                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2); ${i === this.currentSpeaker ? 'border-color: var(--accent); background: rgba(74, 158, 255, 0.1);' : ''}">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: bold; color: var(--text); ${i === this.currentSpeaker ? 'color: var(--accent);' : ''}">${char.name}${i === this.currentSpeaker ? ' (Current)' : ''}</div>
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button class="klite-btn" data-action="set-speaker" data-index="${i}" style="padding: 4px 8px; font-size: 11px;">Set</button>
                            <button class="klite-btn danger" data-action="remove-from-group" data-index="${i}" style="padding: 4px 8px; font-size: 11px;"> -->
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        
        // Auto-response system methods
        toggleAutoResponses(enabled) {
            this.autoResponses.enabled = enabled;
            this.clearAutoResponseTimer();
            this.refresh();
            
            if (enabled) {
                this.setupInputMonitoring();
                // Auto responses enabled
            } else {
                // Auto responses disabled
            }
        },
        
        updateAutoResponseDelay(delay) {
            this.autoResponses.delay = parseInt(delay) || 10;
            this.clearAutoResponseTimer();
        },
        
        updateAutoResponseSetting(setting, value) {
            this.autoResponses[setting] = value;
        },
        
        setupInputMonitoring() {
            const inputField = document.getElementById('input');
            if (inputField && !inputField.hasAttribute('data-group-monitored')) {
                inputField.setAttribute('data-group-monitored', 'true');
                
                // Monitor typing
                inputField.addEventListener('input', () => {
                    this.isUserTyping = true;
                    this.clearAutoResponseTimer();
                });
                
                inputField.addEventListener('blur', () => {
                    setTimeout(() => {
                        this.isUserTyping = false;
                    }, 500);
                });
            }
            
            // Speaker mode dropdown handled via onchange attribute
        },
        
        clearAutoResponseTimer() {
            if (this.autoResponseTimer) {
                clearTimeout(this.autoResponseTimer);
                this.autoResponseTimer = null;
            }
        },
        
        startAutoResponseTimer() {
            if (!this.autoResponses.enabled) return;
            
            this.clearAutoResponseTimer();
            this.autoResponseTimer = setTimeout(() => {
                this.handleAutoResponse();
            }, this.autoResponses.delay * 1000);
        },
        
        handleAutoResponse() {
            if (!this.autoResponses.enabled || this.isUserTyping) return;
            
            if (this.speakerMode === 'manual') return;
            
            // Determine next speaker based on mode
            const nextSpeaker = this.selectNextSpeaker(this.speakerMode);
            if (nextSpeaker !== null) {
                this.currentSpeaker = nextSpeaker;
                this.triggerCurrentSpeaker();
                
                // Continue without player input if enabled
                if (this.autoResponses.continueWithoutPlayer) {
                    this.startAutoResponseTimer();
                }
            }
        },
        
        selectNextSpeaker(mode, updateCurrent = false) {
            if (this.activeChars.length === 0) return null;
            
            const previousSpeaker = this.currentSpeaker;
            let nextSpeaker = null;
            
            switch (mode) {
                case 'manual':
                    nextSpeaker = (this.currentSpeaker + 1) % this.activeChars.length;
                    break;
                    
                case 'round-robin':
                    this.roundRobinPosition = (this.roundRobinPosition + 1) % this.activeChars.length;
                    nextSpeaker = this.roundRobinPosition;
                    break;
                    
                case 'random':
                    // Enhanced: Avoid same speaker twice in a row if possible
                    if (this.activeChars.length > 1) {
                        do {
                            nextSpeaker = Math.floor(Math.random() * this.activeChars.length);
                        } while (nextSpeaker === previousSpeaker);
                    } else {
                        nextSpeaker = 0;
                    }
                    break;
                    
                case 'keyword':
                    nextSpeaker = this.selectByKeyword();
                    break;
                    
                case 'talkative':
                    nextSpeaker = this.selectByTalkativeness();
                    break;
                    
                case 'party':
                    nextSpeaker = this.selectPartyRoundRobin();
                    break;
                    
                default:
                    return null;
            }
            
            // Update current speaker and UI if requested
            if (updateCurrent && nextSpeaker !== null) {
                this.currentSpeaker = nextSpeaker;
                this.addToSpeakerHistory(this.currentSpeaker);
                this.refresh();
                KLITE_RPMod.log('panels', `Speaker selection (${mode}): ${this.activeChars[this.currentSpeaker]?.name} (index ${this.currentSpeaker})`);
            }
            
            return nextSpeaker;
        },
        
        actions: {
            'add-from-library': () => {
                KLITE_RPMod.showUnifiedCharacterModal('multi-select');
            },
            
            'add-custom': () => {
                KLITE_RPMod.panels.GROUP.showCustomCharacterModal();
            },
            
            'edit-current': () => {
                const groupPanel = KLITE_RPMod.panels.GROUP;
                const currentSpeaker = groupPanel.getCurrentSpeaker();
                if (currentSpeaker && currentSpeaker.isCustom) {
                    groupPanel.showCustomCharacterModal(currentSpeaker);
                }
            },
            
            
            'set-speaker': (e) => {
                const groupPanel = KLITE_RPMod.panels.GROUP;
                groupPanel.currentSpeaker = parseInt(e.target.dataset.index);
                groupPanel.refresh();
            },
            
            'next-speaker': () => {
                const groupPanel = KLITE_RPMod.panels.GROUP;
                groupPanel.advanceSpeaker();
            },
            
            'trigger-response': () => {
                const groupPanel = KLITE_RPMod.panels.GROUP;
                groupPanel.triggerCurrentSpeaker();
                
                // Auto advance if enabled
                if (groupPanel.autoResponses.autoAdvanceAfterTrigger) {
                    setTimeout(() => {
                        groupPanel.advanceSpeaker();
                    }, 100);
                }
                
                // Start auto-response timer if enabled
                groupPanel.startAutoResponseTimer();
            },
            
            'remove-from-group': (e) => {
                const groupPanel = KLITE_RPMod.panels.GROUP;
                const index = parseInt(e.target.dataset.index);
                const char = groupPanel.activeChars[index];
                
                // Remove character avatar from group avatars map
                if (char) {
                    KLITE_RPMod.groupAvatars.delete(char.id);
                }
                
                groupPanel.activeChars.splice(index, 1);
                if (groupPanel.currentSpeaker >= groupPanel.activeChars.length) {
                    groupPanel.currentSpeaker = 0;
                }
                groupPanel.refresh();
                groupPanel.updateKoboldSettings();
            },
            
            
        },
        
        
        getCurrentSpeaker() {
            return this.activeChars[this.currentSpeaker];
        },
        
        triggerCurrentSpeaker() {
            const speaker = this.getCurrentSpeaker();
            KLITE_RPMod.log('panels', `Triggering speaker: ${speaker?.name || 'none'} (index: ${this.currentSpeaker})`);
            
            if (!speaker) {
                // No speaker selected
                return;
            }
            
            // Set up for impersonation
            KLITE_RPMod.log('panels', `Calling impersonate_message with index: ${this.currentSpeaker}`);
            window.impersonate_message?.(this.currentSpeaker);
            // Generating as ${speaker.name}
        },
        
        advanceSpeaker() {
            if (this.activeChars.length <= 1) return;
            
            this.currentSpeaker = (this.currentSpeaker + 1) % this.activeChars.length;
            this.refresh();
            KLITE_RPMod.log('panels', `Advanced to next speaker: ${this.getCurrentSpeaker()?.name}`);
        },
        
        updateKoboldSettings() {
            KLITE_RPMod.log('panels', `Updating KoboldAI settings for group chat (enabled: ${this.enabled})`);
            
            if (!this.enabled || this.activeChars.length === 0) {
                // Reset to single character
                if (window.localsettings) {
                    const originalName = localsettings.chatopponent;
                    localsettings.chatopponent = localsettings.chatopponent?.split('||$||')[0] || 'AI';
                    KLITE_RPMod.log('panels', `Reset to single character: ${originalName} -> ${localsettings.chatopponent}`);
                }
                return;
            }
            
            // Build participant list
            const names = this.activeChars.map(c => c.name).join('||$||');
            KLITE_RPMod.log('panels', `Setting group participants: ${names}`);
            KLITE_RPMod.log('panels', `Active characters: ${this.activeChars.length}`, this.activeChars);
            
            if (window.localsettings) {
                localsettings.chatopponent = names;
            }
            
            // Clear any exclusions
            window.groupchat_removals = [];
            KLITE_RPMod.log('panels', 'Cleared groupchat_removals');
            
            window.save_settings?.();
            window.handle_bot_name_onchange?.();
        },
        
        showCharacterSelectorModal() {
            // Create modal for character selection
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            
            modal.innerHTML = `
                <div class="klite-modal-content" style="background: var(--bg2); border-radius: 8px; padding: 20px; border: 1px solid var(--border);">
                    <div class="klite-modal-header">
                        <h3>Select Characters for Group</h3>
                    </div>
                    <div class="klite-modal-body">
                        <p style="color: var(--muted); font-size: 12px; margin-bottom: 15px;">
                            Choose characters from the library to add to your group chat.
                        </p>
                    
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="group-char-search" placeholder="Search characters..." 
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <select id="group-char-tag-filter" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="">All Tags</option>
                            </select>
                            <select id="group-char-talkativeness-filter" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="">All Talkativeness</option>
                                <option value="high">Very Talkative (80+)</option>
                                <option value="medium">Moderate (40-79)</option>
                                <option value="low">Quiet (10-39)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="group-character-selection-list" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 10px; background: var(--bg); margin-bottom: 15px;">
                        <div style="text-align: center; color: var(--muted); padding: 20px;">Loading characters...</div>
                    </div>
                    
                        <div class="klite-modal-footer">
                            <button class="klite-btn klite-btn-primary" data-action="confirm-group-char-selection">
                                Add Selected Characters
                            </button>
                            <button class="klite-btn" data-action="close-group-char-modal">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.currentModal = modal;
            
            // Close modal when clicking outside or pressing escape
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCharacterModal();
                }
            });
            
            // Close modal on escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closeCharacterModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
            
            // Load character data and setup filters
            setTimeout(() => {
                this.loadAvailableCharacters();
                this.setupCharacterModalFilters();
            }, 100);
        },
        
        setupCharacterModalFilters() {
            const searchInput = document.getElementById('group-char-search');
            const tagFilter = document.getElementById('group-char-tag-filter');
            const talkFilter = document.getElementById('group-char-talkativeness-filter');
            
            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterAvailableCharacters());
            }
            if (tagFilter) {
                tagFilter.addEventListener('change', () => this.filterAvailableCharacters());
            }
            if (talkFilter) {
                talkFilter.addEventListener('change', () => this.filterAvailableCharacters());
            }
        },
        
        filterAvailableCharacters() {
            const searchTerm = document.getElementById('group-char-search')?.value.toLowerCase() || '';
            const tagFilter = document.getElementById('group-char-tag-filter')?.value || '';
            const talkFilter = document.getElementById('group-char-talkativeness-filter')?.value || '';
            
            let available = KLITE_RPMod.characters.filter(c => 
                !this.activeChars.find(ac => ac.id === c.id)
            );
            
            // Apply search filter
            if (searchTerm) {
                available = available.filter(char => 
                    char.name.toLowerCase().includes(searchTerm) ||
                    (char.description || '').toLowerCase().includes(searchTerm) ||
                    (char.creator || '').toLowerCase().includes(searchTerm)
                );
            }
            
            // Apply tag filter
            if (tagFilter) {
                available = available.filter(char => 
                    char.tags && char.tags.includes(tagFilter)
                );
            }
            
            // Apply talkativeness filter
            if (talkFilter) {
                available = available.filter(char => {
                    const talk = char.talkativeness || 50;
                    switch (talkFilter) {
                        case 'high': return talk >= 80;
                        case 'medium': return talk >= 40 && talk < 80;
                        case 'low': return talk >= 10 && talk < 40;
                        default: return true;
                    }
                });
            }
            
            // Update the character list
            const list = document.getElementById('group-character-selection-list');
            if (!list) return;
            
            if (available.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; color: var(--muted); padding: 20px;">
                        No characters match the current filters.
                    </div>
                `;
                return;
            }
            
            list.innerHTML = available.map(char => {
                const avatar = char.image || '';
                const description = char.description || char.first_mes || 'No description available';
                const tags = char.tags || [];
                const talkativeness = char.talkativeness || 50;
                
                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2);">
                        <input type="checkbox" id="char-${char.id}" value="${char.id}" style="margin: 0;">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: var(--text);">${char.name}</div>
                            <div style="font-size: 11px; color: var(--muted); margin: 2px 0; max-height: 32px; overflow: hidden;">${description.length > 100 ? description.substring(0, 100) + '...' : description}</div>
                            <div style="font-size: 10px; color: var(--muted);">
                                Talkativeness: ${talkativeness} | Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        showCustomCharacterModal(editChar = null) {
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            
            modal.innerHTML = `
                <div class="klite-modal-content" style="background: var(--bg2); border-radius: 8px; padding: 20px; max-width: 400px; border: 1px solid var(--border);">
                    <h3 style="margin-top: 0; color: var(--text);">${editChar ? 'Edit Custom Character' : 'Add Custom Character'}</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Name</label>
                        <input type="text" id="group-custom-char-name" placeholder="Character name" value="${editChar?.name || ''}"
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Talkativeness (1-100)</label>
                        <input type="number" id="group-custom-char-talkativeness" min="1" max="100" value="${editChar?.talkativeness || 50}" 
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Keywords (comma separated)</label>
                        <input type="text" id="group-custom-char-keywords" placeholder="keyword1, keyword2, keyword3" value="${editChar?.keywords ? editChar.keywords.join(', ') : ''}"
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Description</label>
                        <textarea id="group-custom-char-description" placeholder="Brief character description" 
                            style="width: 100%; height: 60px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; resize: vertical;">${editChar?.description || ''}</textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="klite-btn klite-btn-primary" data-action="confirm-custom-character" ${editChar ? `data-edit-char-id="${editChar.id}"` : ''} style="flex: 1;">
                            ${editChar ? 'Update Character' : 'Add Character'}
                        </button>
                        <button class="klite-btn" data-action="close-group-char-modal" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.currentModal = modal;
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCharacterModal();
                }
            });
        },
        
        loadAvailableCharacters() {
            // Load characters from CHARS panel, excluding already active ones
            const available = KLITE_RPMod.characters.filter(c => 
                !this.activeChars.find(ac => ac.id === c.id)
            );
            
            // Populate tag filter with unique tags from available characters
            const tagFilter = document.getElementById('group-char-tag-filter');
            if (tagFilter) {
                const allTags = new Set();
                available.forEach(char => {
                    if (char.tags && Array.isArray(char.tags)) {
                        char.tags.forEach(tag => allTags.add(tag));
                    }
                });
                
                // Keep the "All Tags" option and add unique tags
                const currentOptions = Array.from(tagFilter.options).slice(1); // Keep first option
                currentOptions.forEach(option => option.remove());
                
                Array.from(allTags).sort().forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
                    tagFilter.appendChild(option);
                });
            }
            
            const list = document.getElementById('group-character-selection-list');
            if (!list) return;
            
            if (available.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; color: var(--muted); padding: 20px;">
                        No characters available. Import some characters from the CHARS panel first.
                    </div>
                `;
                return;
            }
            
            list.innerHTML = available.map(char => {
                const avatar = char.image || '';
                const description = char.description || char.first_mes || 'No description available';
                const tags = char.tags || [];
                const talkativeness = char.talkativeness || 50;
                
                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2);">
                        <input type="checkbox" id="char-${char.id}" value="${char.id}" style="margin: 0;">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                <img src="${avatar}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: var(--text);">${char.name}</div>
                            <div style="font-size: 11px; color: var(--muted); margin: 2px 0; max-height: 32px; overflow: hidden;">${description.length > 100 ? description.substring(0, 100) + '...' : description}</div>
                            <div style="font-size: 10px; color: var(--muted);">
                                Talkativeness: ${talkativeness} | Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        confirmCharacterSelection() {
            const checkboxes = document.querySelectorAll('#group-character-selection-list input[type="checkbox"]:checked');
            
            if (checkboxes.length === 0) {
                // No characters selected
                return;
            }
            
            let added = 0;
            checkboxes.forEach(checkbox => {
                const charId = checkbox.value; // Keep as string to handle both string and number IDs
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char && !this.activeChars.find(ac => ac.id == char.id)) {
                    // Mark CHARS characters as not custom
                    char.isCustom = false;
                    this.activeChars.push(char);
                    
                    // Add character avatar to group avatars map
                    if (char.avatar) {
                        KLITE_RPMod.groupAvatars.set(char.id, char.avatar);
                    }
                    
                    added++;
                }
            });
            
            this.closeCharacterModal();
            this.refresh();
            this.updateKoboldSettings();
            
            if (added > 0) {
                // Added ${added} character${added === 1 ? '' : 's'} to group
            }
        },
        
        confirmCustomCharacter(editId = null) {
            const name = document.getElementById('group-custom-char-name')?.value;
            const talkativeness = parseInt(document.getElementById('group-custom-char-talkativeness')?.value) || 50;
            const keywords = document.getElementById('group-custom-char-keywords')?.value || '';
            const description = document.getElementById('group-custom-char-description')?.value || '';
            
            if (name) {
                if (editId) {
                    // Edit existing character
                    const charIndex = this.activeChars.findIndex(c => c.id === editId);
                    if (charIndex !== -1) {
                        this.activeChars[charIndex].name = name;
                        this.activeChars[charIndex].description = description;
                        this.activeChars[charIndex].talkativeness = talkativeness;
                        this.activeChars[charIndex].keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
                    }
                } else {
                    // Add new character
                    const char = {
                        id: 'custom-' + Date.now(),
                        name: name,
                        description: description,
                        talkativeness: talkativeness,
                        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
                        isCustom: true
                    };
                    this.activeChars.push(char);
                }
                this.closeCharacterModal();
                this.refresh();
                this.updateKoboldSettings();
            }
        },
        
        closeCharacterModal() {
            if (this.currentModal) {
                try {
                    if (this.currentModal.parentNode) {
                        this.currentModal.parentNode.removeChild(this.currentModal);
                    }
                } catch (e) {
                    KLITE_RPMod.error('Error closing character modal:', e);
                }
                this.currentModal = null;
            }
            
            // Also clean up any stray modals
            const strayModals = document.querySelectorAll('.klite-modal');
            strayModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });
        },
        
        
        selectByKeyword() {
            const lastMessage = window.gametext_arr?.[window.gametext_arr.length - 1] || '';
            const keywords = lastMessage.toLowerCase();
            
            // Check each character for keyword matches
            const matches = [];
            this.activeChars.forEach((char, index) => {
                const charKeywords = char.keywords || [char.name.toLowerCase()];
                const score = charKeywords.reduce((total, keyword) => {
                    const regex = new RegExp('\\b' + keyword.toLowerCase() + '\\b', 'gi');
                    return total + (keywords.match(regex) || []).length;
                }, 0);
                
                if (score > 0) {
                    matches.push({ index, score, name: char.name });
                }
            });
            
            if (matches.length > 0) {
                // Sort by score and return highest match
                matches.sort((a, b) => b.score - a.score);
                KLITE_RPMod.log('panels', `Keyword matches:`, matches);
                return matches[0].index;
            }
            
            // Fallback to round-robin if no keyword matches
            return (this.currentSpeaker + 1) % this.activeChars.length;
        },
        
        selectByTalkativeness() {
            const now = Date.now();
            const cooldownTime = 30000; // 30 seconds cooldown
            
            // Calculate weights based on talkativeness and cooldown
            const weights = this.activeChars.map((char, index) => {
                const baseTalkativeness = char.talkativeness || 50;
                const lastTrigger = this.lastTriggerTime[index] || 0;
                const timeSinceLastTrigger = now - lastTrigger;
                
                // Reduce weight if recently triggered
                let weight = baseTalkativeness;
                if (timeSinceLastTrigger < cooldownTime) {
                    const cooldownFactor = timeSinceLastTrigger / cooldownTime;
                    weight *= cooldownFactor;
                }
                
                return { index, weight, name: char.name };
            });
            
            // Weighted random selection
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
            if (totalWeight === 0) return 0;
            
            let random = Math.random() * totalWeight;
            for (const weight of weights) {
                random -= weight.weight;
                if (random <= 0) {
                    this.lastTriggerTime[weight.index] = now;
                    KLITE_RPMod.log('panels', `Talkativeness selection: ${weight.name} (weight: ${weight.weight.toFixed(1)})`);
                    return weight.index;
                }
            }
            
            return 0;
        },
        
        selectPartyRoundRobin() {
            // Everyone speaks once per round before anyone speaks again
            if (!this.partyRoundSpeakers) {
                this.partyRoundSpeakers = [...Array(this.activeChars.length).keys()];
                this.shuffleArray(this.partyRoundSpeakers);
            }
            
            if (this.partyRoundSpeakers.length === 0) {
                // Start new round
                this.partyRoundSpeakers = [...Array(this.activeChars.length).keys()];
                this.shuffleArray(this.partyRoundSpeakers);
            }
            
            return this.partyRoundSpeakers.pop();
        },
        
        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        },
        
        addToSpeakerHistory(speakerIndex) {
            this.speakerHistory.push({
                index: speakerIndex,
                name: this.activeChars[speakerIndex]?.name,
                timestamp: Date.now()
            });
            
            // Keep only last 20 entries
            if (this.speakerHistory.length > 20) {
                this.speakerHistory = this.speakerHistory.slice(-20);
            }
        },
        
        triggerCurrentSpeaker() {
            if (this.activeChars.length === 0) return;
            
            const currentChar = this.activeChars[this.currentSpeaker];
            if (!currentChar) return;
            
            // Update trigger time for talkativeness mode
            this.lastTriggerTime[this.currentSpeaker] = Date.now();
            
            // Set the character for generation
            if (window.localsettings) {
                window.localsettings.chatopponent = currentChar.name;
            }
            
            // Trigger AI generation
            if (window.submit_generation) {
                window.submit_generation();
            }
            
            // Triggered response from ${currentChar.name}
            KLITE_RPMod.log('panels', `Triggered speaker: ${currentChar.name}`);
        },
        
        formatTime(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            
            if (diff < 60000) { // Less than 1 minute
                return `${Math.floor(diff / 1000)}s ago`;
            } else if (diff < 3600000) { // Less than 1 hour
                return `${Math.floor(diff / 60000)}m ago`;
            } else if (diff < 86400000) { // Less than 1 day
                return `${Math.floor(diff / 3600000)}h ago`;
            } else {
                return new Date(timestamp).toLocaleDateString();
            }
        },

        async loadSettings() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_group_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.speakerMode = settings.speakerMode || 1;
                if (settings.autoResponses) {
                    Object.assign(this.autoResponses, settings.autoResponses);
                }
                KLITE_RPMod.log('panels', `Loaded GROUP settings: speakerMode=${this.speakerMode}`);
            }
        },

        saveSettings() {
            const settings = {
                speakerMode: this.speakerMode,
                autoResponses: this.autoResponses
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_group_settings', JSON.stringify(settings));
            KLITE_RPMod.log('panels', `Saved GROUP settings: speakerMode=${this.speakerMode}`);
        },

        refresh() {
            KLITE_RPMod.loadPanel('left', 'GROUP');
        }
    };

    // HELP PANEL - Enhanced with Search System
    KLITE_RPMod.panels.HELP = {
        currentDatabase: 'rpmod',
        searchQuery: '',
        searchResults: [],
        searchTimeout: null,
        currentSortMode: 'relevance',
        currentDatabaseFilter: '',
        
        // Database configuration
        databases: {
            rpmod: {
                name: 'RPMod Features',
                icon: '🎭',
                placeholder: 'Search RPMod features, hotkeys, usage...',
                entries: [
                    {
                        id: 'char-import',
                        title: 'Character Card Import',
                        category: 'Character Management',
                        content: 'Import PNG/WEBP character cards with embedded JSON metadata. Supports Tavern Card V1, V2, and V3 formats. Cards automatically populate name, description, personality, scenario, and alternate greetings.',
                        keywords: ['character', 'import', 'png', 'webp', 'tavern', 'card', 'json', 'metadata']
                    },
                    {
                        id: 'char-gallery',
                        title: 'Character Gallery',
                        category: 'Character Management',
                        content: 'Browse imported characters in grid or list view. Filter by creator, rating, or tags. Rate characters with 5-star system. View detailed character modals with all card data.',
                        keywords: ['gallery', 'character', 'filter', 'rating', 'tags', 'view', 'modal']
                    },
                    {
                        id: 'group-chat',
                        title: 'Group Chat Mode',
                        category: 'Chat Features',
                        content: 'Run multiple characters simultaneously with intelligent speaker rotation. Choose from round-robin, random, keyword-triggered, talkativeness-weighted, or manual rotation modes.',
                        keywords: ['group', 'chat', 'multiple', 'characters', 'rotation', 'speaker', 'round-robin', 'random']
                    },
                    {
                        id: 'memory-system',
                        title: 'Enhanced Memory',
                        category: 'Memory & Context',
                        content: 'Persistent memory system with templates, token counting, and AI-assisted generation. Memory persists across sessions and integrates with KoboldAI\'s native memory system.',
                        keywords: ['memory', 'persistent', 'templates', 'tokens', 'ai-generated', 'context']
                    },
                    {
                        id: 'scene-manager',
                        title: 'Scene Management',
                        category: 'World Building',
                        content: 'Quick scene setup with 84+ locations, time/weather/mood controls. Generate atmospheric descriptions and integrate with image generation. Context vs memory injection modes.',
                        keywords: ['scene', 'location', 'weather', 'mood', 'atmospheric', 'image', 'generation', 'context']
                    },
                    {
                        id: 'world-info',
                        title: 'World Info Editor',
                        category: 'World Building',
                        content: 'Advanced World Info management with group organization, selective mode, probability controls, and import/export capabilities. Visual indicators for active entries.',
                        keywords: ['world', 'info', 'wi', 'groups', 'selective', 'probability', 'import', 'export']
                    },
                    {
                        id: 'hotkeys',
                        title: 'Keyboard Shortcuts',
                        category: 'User Interface',
                        content: 'Comprehensive hotkey system with 16+ shortcuts. Ctrl+Shift+U for UI toggle, Ctrl+Shift+[P,C,M,etc] for panel navigation, Ctrl+Shift+Enter for generation.',
                        keywords: ['hotkeys', 'shortcuts', 'keyboard', 'ctrl', 'shift', 'navigation', 'ui', 'toggle']
                    },
                    {
                        id: 'ui-toggle',
                        title: 'UI Hotswap (Ctrl+Shift+U)',
                        category: 'User Interface',
                        content: 'Toggle between RPMod enhanced UI and original KoboldAI Lite UI. Input values sync automatically. Perfect for compatibility testing or preference switching.',
                        keywords: ['ui', 'toggle', 'hotswap', 'switch', 'lite', 'compatibility', 'ctrl+shift+u']
                    },
                    {
                        id: 'notes-system',
                        title: 'Notes & Author\'s Notes',
                        category: 'Writing Tools',
                        content: 'Personal notes for private tracking and Author\'s Notes for AI guidance. Template system, token counting, injection depth control, and auto-save functionality.',
                        keywords: ['notes', 'author', 'personal', 'templates', 'tokens', 'injection', 'depth', 'autosave']
                    },
                    {
                        id: 'textdb',
                        title: 'Text Database',
                        category: 'Reference System',
                        content: 'Searchable reference database for lore, characters, and background information. Import/export documents, search history integration, and smart chunk management.',
                        keywords: ['textdb', 'database', 'search', 'reference', 'lore', 'import', 'export', 'chunks']
                    }
                ]
            },
            kobold: {
                name: 'KoboldCpp Guide',
                icon: '🤖',
                placeholder: 'Search KoboldCpp settings, features, troubleshooting...',
                entries: [
                    // Getting Started
                    {
                        id: 'starting-koboldcpp',
                        title: 'Starting KoboldCpp',
                        category: 'Getting Started',
                        content: 'Run koboldcpp.exe or use command line. Basic usage: koboldcpp --model [modelfile.gguf] --contextsize 4096 --gpulayers 20. Use --help for all options.',
                        keywords: ['start', 'koboldcpp', 'run', 'launch', 'command', 'line', 'basic']
                    },
                    {
                        id: 'model-loading',
                        title: 'Model Loading',
                        category: 'Models',
                        content: 'Supports GGUF format (recommended), legacy GGML. Use --model flag. GPU acceleration with --gpulayers. Split large models with --tensor_split. Quantization affects quality/speed.',
                        keywords: ['model', 'loading', 'gguf', 'ggml', 'gpu', 'layers', 'quantization', 'tensor', 'split']
                    },
                    {
                        id: 'context-size',
                        title: 'Context Size',
                        category: 'Settings',
                        content: 'Set with --contextsize or -c. Default 2048. Higher = more memory usage but longer conversations. Common values: 2048, 4096, 8192, 16384. Match model training.',
                        keywords: ['context', 'size', 'memory', 'contextsize', 'length', 'conversation']
                    },
                    {
                        id: 'gpu-acceleration',
                        title: 'GPU Acceleration',
                        category: 'Performance',
                        content: '--gpulayers N offloads N layers to GPU. Use --usecublas for NVIDIA, --useclblast for AMD/Intel. Check VRAM usage. Partial offloading supported.',
                        keywords: ['gpu', 'acceleration', 'gpulayers', 'cublas', 'clblast', 'vram', 'nvidia', 'amd']
                    },
                    
                    // Sampling Parameters
                    {
                        id: 'temperature',
                        title: 'Temperature',
                        category: 'Sampling',
                        content: 'Controls randomness. 0.1 = very deterministic, 2.0 = very random. Default 0.7. For RP: 0.8-1.2. For coherent: 0.3-0.7. Affects creativity vs consistency.',
                        keywords: ['temperature', 'sampling', 'randomness', 'creativity', 'deterministic', 'parameter']
                    },
                    {
                        id: 'top-p',
                        title: 'Top-P (Nucleus Sampling)',
                        category: 'Sampling',
                        content: 'Cumulative probability cutoff. 0.9 = top 90% probable tokens. Lower = more focused. Works with temperature. Common: 0.9-0.95. Set to 1.0 to disable.',
                        keywords: ['top-p', 'top_p', 'nucleus', 'sampling', 'probability', 'cutoff', 'parameter']
                    },
                    {
                        id: 'top-k',
                        title: 'Top-K',
                        category: 'Sampling',
                        content: 'Limits token choices to K most likely. 40 = consider top 40 tokens. Lower = more predictable. 0 = disabled. Often combined with Top-P.',
                        keywords: ['top-k', 'top_k', 'sampling', 'tokens', 'choices', 'limit', 'parameter']
                    },
                    {
                        id: 'repetition-penalty',
                        title: 'Repetition Penalty',
                        category: 'Sampling',
                        content: 'Reduces repetition. 1.0 = no penalty. 1.1-1.3 common. Too high causes incoherence. Repetition penalty range sets how far back to check.',
                        keywords: ['repetition', 'penalty', 'repeat', 'sampling', 'range', 'parameter']
                    },
                    {
                        id: 'mirostat',
                        title: 'Mirostat',
                        category: 'Sampling',
                        content: 'Alternative sampling for consistent quality. Mirostat 2 recommended. Set tau (target entropy). Replaces temperature/top-k/top-p when enabled.',
                        keywords: ['mirostat', 'sampling', 'tau', 'entropy', 'alternative', 'parameter']
                    },
                    
                    // Lite Interface
                    {
                        id: 'lite-ui',
                        title: 'Lite UI Overview',
                        category: 'Interface',
                        content: 'Minimal web interface. Access via browser at localhost:5001. Mobile friendly. Features: chat, settings, model info. Use lite.html for classic version.',
                        keywords: ['lite', 'ui', 'interface', 'web', 'browser', 'localhost', 'mobile']
                    },
                    {
                        id: 'memory-authors-note',
                        title: 'Memory and Author\'s Note',
                        category: 'Features',
                        content: 'Memory: Persistent info at context start. Author\'s Note: Injected at specified depth. Use for character traits, world state, style guidance. Token budget aware.',
                        keywords: ['memory', 'author', 'note', 'authors', 'persistent', 'injection', 'depth']
                    },
                    {
                        id: 'world-info',
                        title: 'World Info',
                        category: 'Features',
                        content: 'Triggered by keywords. Each entry has keys, content, and settings. Scan depth determines how far to search. Selective activation saves tokens. Import/export JSON.',
                        keywords: ['world', 'info', 'wi', 'entries', 'keywords', 'triggers', 'selective', 'scan']
                    },
                    {
                        id: 'instruct-mode',
                        title: 'Instruct Mode',
                        category: 'Features',
                        content: 'For instruction-tuned models. Configure template, system prompt, sequences. Common formats: Alpaca, Vicuna, ChatML. Enable for better instruction following.',
                        keywords: ['instruct', 'mode', 'instruction', 'template', 'system', 'prompt', 'format']
                    },
                    {
                        id: 'adventure-mode',
                        title: 'Adventure Mode',
                        category: 'Features',
                        content: 'Second-person narration for text adventures. You do/say format. Automatic formatting. Good for dungeon crawls, interactive fiction. Toggle in settings.',
                        keywords: ['adventure', 'mode', 'second', 'person', 'narration', 'text', 'interactive']
                    },
                    
                    // Advanced Features
                    {
                        id: 'smart-context',
                        title: 'Smart Context',
                        category: 'Advanced',
                        content: 'Automatically manages context to fit limits. Trims oldest messages while preserving recent context, memory, world info. Configure retention settings.',
                        keywords: ['smart', 'context', 'management', 'trim', 'retention', 'automatic']
                    },
                    {
                        id: 'token-streaming',
                        title: 'Token Streaming',
                        category: 'Advanced',
                        content: 'See tokens as generated. Enable with --stream. Reduces perceived latency. May affect performance slightly. Works with all frontends.',
                        keywords: ['token', 'streaming', 'stream', 'real-time', 'generation', 'latency']
                    },
                    {
                        id: 'api-endpoints',
                        title: 'API Endpoints',
                        category: 'API',
                        content: '/api/v1/generate - Main generation. /api/v1/model - Model info. /api/extra/tokencount - Count tokens. Compatible with various frontends.',
                        keywords: ['api', 'endpoints', 'generate', 'model', 'tokencount', 'rest', 'http']
                    },
                    {
                        id: 'multiuser-mode',
                        title: 'Multi-user Mode',
                        category: 'Advanced',
                        content: 'Enable with --multiuser. Separate sessions per user. Good for shared instances. Each user has own context. Password protection available.',
                        keywords: ['multiuser', 'multi-user', 'shared', 'sessions', 'password', 'instance']
                    },
                    
                    // Troubleshooting
                    {
                        id: 'out-of-memory',
                        title: 'Out of Memory',
                        category: 'Troubleshooting',
                        content: 'Reduce context size, lower GPU layers, use smaller model, enable 8-bit cache. Check VRAM with nvidia-smi or GPU-Z. Consider quantized models.',
                        keywords: ['memory', 'oom', 'vram', 'error', 'troubleshoot', 'gpu', 'ram']
                    },
                    {
                        id: 'slow-generation',
                        title: 'Slow Generation',
                        category: 'Troubleshooting',
                        content: 'Increase GPU layers, reduce context size, disable smart context, use faster sampler settings. Check CPU/GPU usage. Consider smaller model.',
                        keywords: ['slow', 'performance', 'speed', 'generation', 'optimize', 'troubleshoot']
                    },
                    {
                        id: 'connection-issues',
                        title: 'Connection Issues',
                        category: 'Troubleshooting',
                        content: 'Check firewall, use --host 0.0.0.0 for network access, verify port not in use. Default port 5001. Use --port to change. Check localhost vs IP.',
                        keywords: ['connection', 'network', 'firewall', 'port', 'host', 'access', 'troubleshoot']
                    },
                    
                    // RPMod Specific
                    {
                        id: 'rpmod-overview',
                        title: 'RPMod Overview',
                        category: 'RPMod',
                        content: 'Enhanced Lite UI for roleplay. Features: character cards, group chat, dice rolling, persistent memory, world info integration. Optimized for narrative gameplay.',
                        keywords: ['rpmod', 'roleplay', 'mod', 'enhanced', 'features', 'overview']
                    },
                    {
                        id: 'character-cards',
                        title: 'Character Cards',
                        category: 'RPMod',
                        content: 'Import PNG cards with embedded JSON. Supports name, description, personality, scenario, examples. Drag & drop or use import button. Compatible with various formats.',
                        keywords: ['character', 'cards', 'png', 'import', 'json', 'embedded', 'rpmod']
                    },
                    {
                        id: 'group-chat',
                        title: 'Group Chat',
                        category: 'RPMod',
                        content: 'Multiple characters in one conversation. Set active character, manage turn order. Each character maintains personality. Good for party dynamics.',
                        keywords: ['group', 'chat', 'multiple', 'characters', 'party', 'rpmod']
                    },
                    {
                        id: 'dice-integration',
                        title: 'Dice Integration',
                        category: 'RPMod',
                        content: 'Type dice notation in chat. Supports complex rolls: 1d20+5, 3d6, 2d10+1d4. Results shown inline. Can trigger on keywords for automatic rolls.',
                        keywords: ['dice', 'rolling', 'd20', 'notation', 'tabletop', 'rpg', 'rpmod']
                    }
                ]
            },
            dnd: {
                name: 'D&D 5e Reference',
                icon: '🎲',
                placeholder: 'Search D&D rules, spells, monsters...',
                entries: [
                    // Core Rules
                    {
                        id: 'ability-scores',
                        title: 'Ability Scores',
                        category: 'Core Rules',
                        content: 'The six ability scores are Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Modifiers range from -5 (score 1) to +10 (score 30). Standard array: 15, 14, 13, 12, 10, 8.',
                        keywords: ['ability', 'scores', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'modifiers']
                    },
                    {
                        id: 'advantage-disadvantage',
                        title: 'Advantage and Disadvantage',
                        category: 'Core Rules',
                        content: 'Roll 2d20 and take the higher (advantage) or lower (disadvantage) result. Multiple instances don\'t stack. If you have both, they cancel out.',
                        keywords: ['advantage', 'disadvantage', 'roll', '2d20', 'mechanics']
                    },
                    {
                        id: 'proficiency-bonus',
                        title: 'Proficiency Bonus',
                        category: 'Core Rules',
                        content: 'Starts at +2 at level 1. Increases: +3 (level 5), +4 (level 9), +5 (level 13), +6 (level 17). Applied to attack rolls, ability checks, and saving throws you\'re proficient in.',
                        keywords: ['proficiency', 'bonus', 'level', 'progression']
                    },
                    {
                        id: 'actions-combat',
                        title: 'Actions in Combat',
                        category: 'Combat',
                        content: 'Attack, Cast a Spell, Dash (double movement), Dodge (attacks have disadvantage), Help (give ally advantage), Hide, Ready (prepare action), Search, Use an Object.',
                        keywords: ['actions', 'combat', 'attack', 'dash', 'dodge', 'help', 'hide', 'ready', 'search']
                    },
                    {
                        id: 'conditions',
                        title: 'Conditions',
                        category: 'Core Rules',
                        content: 'Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.',
                        keywords: ['conditions', 'status', 'effects', 'blinded', 'charmed', 'frightened', 'paralyzed', 'stunned']
                    },
                    
                    // Common Spells
                    {
                        id: 'fireball',
                        title: 'Fireball',
                        category: 'Spell',
                        content: '3rd level evocation. Range: 150 feet. 20-foot radius sphere. 8d6 fire damage, Dexterity save for half. Damage increases by 1d6 per slot above 3rd.',
                        keywords: ['fireball', 'spell', 'evocation', '3rd', 'level', 'fire', 'damage', 'area', 'aoe']
                    },
                    {
                        id: 'cure-wounds',
                        title: 'Cure Wounds',
                        category: 'Spell',
                        content: '1st level evocation. Touch range. Restore 1d8 + spellcasting modifier hit points. No effect on undead or constructs. +1d8 per slot above 1st.',
                        keywords: ['cure', 'wounds', 'healing', 'spell', 'evocation', '1st', 'level', 'touch']
                    },
                    {
                        id: 'mage-armor',
                        title: 'Mage Armor',
                        category: 'Spell',
                        content: '1st level abjuration. Touch range. 8 hours duration. AC becomes 13 + Dex modifier if not wearing armor. Ends if target dons armor.',
                        keywords: ['mage', 'armor', 'spell', 'abjuration', '1st', 'level', 'ac', 'defense']
                    },
                    {
                        id: 'shield',
                        title: 'Shield',
                        category: 'Spell',
                        content: '1st level abjuration. Reaction spell. +5 bonus to AC until start of next turn, including against triggering attack. No damage from magic missile.',
                        keywords: ['shield', 'spell', 'abjuration', '1st', 'level', 'reaction', 'ac', 'defense']
                    },
                    {
                        id: 'counterspell',
                        title: 'Counterspell',
                        category: 'Spell',
                        content: '3rd level abjuration. Reaction when creature within 60 feet casts a spell. Automatically stops spells 3rd level or lower. Higher requires ability check DC 10 + spell level.',
                        keywords: ['counterspell', 'spell', 'abjuration', '3rd', 'level', 'reaction', 'counter']
                    },
                    
                    // Common Monsters
                    {
                        id: 'goblin',
                        title: 'Goblin',
                        category: 'Monster',
                        content: 'Small humanoid. AC 15, HP 7 (2d6). Speed 30 ft. Nimble Escape: Disengage or Hide as bonus action. Scimitar +4 (1d6+2). Shortbow +4 (1d6+2).',
                        keywords: ['goblin', 'monster', 'humanoid', 'small', 'cr', 'nimble', 'escape']
                    },
                    {
                        id: 'orc',
                        title: 'Orc',
                        category: 'Monster',
                        content: 'Medium humanoid. AC 13, HP 15 (2d8+6). Speed 30 ft. Aggressive: Bonus action move toward hostile. Greataxe +5 (1d12+3). Javelin +5 (1d6+3).',
                        keywords: ['orc', 'monster', 'humanoid', 'medium', 'aggressive', 'cr']
                    },
                    {
                        id: 'dragon-young-red',
                        title: 'Dragon (Young Red)',
                        category: 'Monster',
                        content: 'Large dragon. AC 18, HP 178 (17d10+85). Fire breath (DC 17, 16d6). Bite +10 (2d10+6 plus 1d6 fire). Frightful Presence DC 16.',
                        keywords: ['dragon', 'red', 'young', 'monster', 'large', 'fire', 'breath', 'legendary']
                    },
                    {
                        id: 'zombie',
                        title: 'Zombie',
                        category: 'Monster',
                        content: 'Medium undead. AC 8, HP 22 (3d8+9). Speed 20 ft. Undead Fortitude: Con save to drop to 1 HP instead of 0. Slam +3 (1d6+1).',
                        keywords: ['zombie', 'undead', 'monster', 'medium', 'fortitude', 'cr']
                    },
                    {
                        id: 'skeleton',
                        title: 'Skeleton',
                        category: 'Monster',
                        content: 'Medium undead. AC 13, HP 13 (2d8+4). Vulnerable to bludgeoning. Immune to poison. Shortsword +4 (1d6+2). Shortbow +4 (1d6+2).',
                        keywords: ['skeleton', 'undead', 'monster', 'medium', 'vulnerable', 'immune', 'cr']
                    },
                    
                    // Magic Items
                    {
                        id: 'healing-potion',
                        title: 'Healing Potion',
                        category: 'Magic Item',
                        content: 'Potion of Healing restores 2d4+2 hit points. Greater: 4d4+4. Superior: 8d4+8. Supreme: 10d4+20. Action to drink, bonus action to administer.',
                        keywords: ['healing', 'potion', 'magic', 'item', 'restore', 'hp', 'consumable']
                    },
                    {
                        id: 'bag-of-holding',
                        title: 'Bag of Holding',
                        category: 'Magic Item',
                        content: 'Holds 500 pounds, up to 64 cubic feet. Weighs 15 pounds. Ruptures if pierced or overloaded. Extradimensional space. Breathing creature suffocates in 10 minutes.',
                        keywords: ['bag', 'holding', 'magic', 'item', 'storage', 'extradimensional', 'space']
                    },
                    {
                        id: 'plus-one-weapon',
                        title: '+1 Weapon',
                        category: 'Magic Item',
                        content: 'Uncommon magic weapon. +1 bonus to attack and damage rolls. Overcomes resistance to nonmagical attacks. Can be any weapon type.',
                        keywords: ['+1', 'weapon', 'magic', 'item', 'bonus', 'attack', 'damage', 'enchantment']
                    },
                    
                    // Character Creation
                    {
                        id: 'races-overview',
                        title: 'Races Overview',
                        category: 'Character Creation',
                        content: 'Human (+1 all), Elf (+2 Dex), Dwarf (+2 Con), Halfling (+2 Dex), Dragonborn (+2 Str, +1 Cha), Gnome (+2 Int), Half-Elf (+2 Cha, +1 two others), Half-Orc (+2 Str, +1 Con), Tiefling (+2 Cha, +1 Int).',
                        keywords: ['races', 'human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'tiefling', 'creation']
                    },
                    {
                        id: 'classes-overview',
                        title: 'Classes Overview',
                        category: 'Character Creation',
                        content: 'Barbarian (d12 HP), Bard (d8), Cleric (d8), Druid (d8), Fighter (d10), Monk (d8), Paladin (d10), Ranger (d10), Rogue (d8), Sorcerer (d6), Warlock (d8), Wizard (d6).',
                        keywords: ['classes', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']
                    },
                    {
                        id: 'ability-score-generation',
                        title: 'Ability Score Generation',
                        category: 'Character Creation',
                        content: 'Standard Array: 15, 14, 13, 12, 10, 8. Point Buy: 27 points, all scores start at 8. Rolling: 4d6 drop lowest, six times. Assign as desired.',
                        keywords: ['ability', 'score', 'generation', 'array', 'point', 'buy', 'rolling', 'creation']
                    }
                ]
            }
        },
        
        render() {
            return `
                <!-- RPmod, KoboldAI and D&D Reference -->
                ${t.section('📚 RPmod, KoboldAI and D&D Reference',
                    `<div class="klite-help-search-section">
                        <!-- Advanced Search Controls -->
                        <div class="klite-help-search-input-container">
                            <input type="text" id="help-search-input" class="klite-help-search-input" 
                                   placeholder="Search across all knowledge bases..."
                                   value="${this.searchQuery}">
                            <button class="klite-help-search-clear" data-action="clear-search" 
                                    style="display: ${this.searchQuery ? 'block' : 'none'}"> -->
                        </div>
                        
                        <!-- Advanced Filters -->
                        <div class="klite-help-search-filters" style="display: grid; grid-template-columns: 2fr 1fr; gap: 6px; margin: 8px 0; font-size: 11px;">
                            <select id="help-database-filter" style="padding: 4px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 3px;">
                                <option value="" ${this.currentDatabaseFilter === '' ? 'selected' : ''}>All Knowledge Bases</option>
                                <option value="rpmod" ${this.currentDatabaseFilter === 'rpmod' ? 'selected' : ''}>🎭 RPMod Features</option>
                                <option value="kobold" ${this.currentDatabaseFilter === 'kobold' ? 'selected' : ''}>🤖 KoboldCpp Guide</option>
                                <option value="dnd" ${this.currentDatabaseFilter === 'dnd' ? 'selected' : ''}>🐉 D&D Reference</option>
                            </select>
                            <select id="help-sort-mode" style="padding: 4px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 3px;">
                                <option value="relevance" ${this.currentSortMode === 'relevance' ? 'selected' : ''}>By Relevance</option>
                                <option value="title" ${this.currentSortMode === 'title' ? 'selected' : ''}>By Title</option>
                                <option value="category" ${this.currentSortMode === 'category' ? 'selected' : ''}>By Category</option>
                            </select>
                        </div>
                        
                        <!-- Search Stats & Quick Actions -->
                        ${this.searchQuery ? `
                            <div class="klite-help-search-stats" style="font-size: 11px; color: var(--muted); margin-bottom: 8px; text-align: center;">
                                <span>${this.searchResults.length} results found</span>
                            </div>
                        ` : ''}
                        
                        
                        <!-- Search Results -->
                        <div id="help-search-results" class="klite-help-search-results">
                            ${this.renderSearchResults()}
                        </div>
                    </div>`
                )}
                
                <!-- Keep RPMod Features (as requested) -->
                ${this.currentDatabase === 'rpmod' && !this.searchQuery ? t.section('📝 RPMod Features',
                    `<div class="klite-help-feature-list">
                        ${this.renderFeature('🎭', 'Character Cards', 'Import PNG/WEBP cards with embedded metadata for immersive roleplay. Supports Tavern Card V1/V2/V3 formats and more.')}
                        ${this.renderFeature('👥', 'Group Chat', 'Run multiple characters simultaneously with smart speaker rotation and individual personality tracking.')}
                        ${this.renderFeature('🧠', 'Memory System', 'Persistent memory and world info that enhances your narrative. AI-assisted memory generation from story context.')}
                        ${this.renderFeature('🌍', 'Scene Manager', 'Quick scene setup with atmospheric controls, automatic descriptions, and image generation support.')}
                        ${this.renderFeature('🎲', 'Game Modes', 'Switch between Story, Adventure, Chat, and Instruct modes with mode-specific UI adaptations.')}
                        ${this.renderFeature('📊', 'Tools & Analysis', 'Context analyzer, dice roller, memory generator, statistics dashboard, and multi-format export.')}
                    </div>`
                ) : ''}
                
                <!-- Enhanced Keyboard Shortcuts -->
                ${this.currentDatabase === 'rpmod' && !this.searchQuery ? t.section('⌨️ Enhanced Keyboard Shortcuts',
                    `<div style="font-family: monospace; font-size: 12px; line-height: 1.8;">
                        <div><strong>🎹 Generation Control:</strong></div>
                        <div>Ctrl+Shift+Enter - Submit/Generate</div>
                        <div>Ctrl+Shift+R - Retry/Regenerate</div>
                        <div>Ctrl+Shift+A - Abort Generation</div>
                        <div>Ctrl+Shift+Z - Undo</div>
                        <div>Ctrl+Shift+Y - Redo</div>
                        <br>
                        <div><strong>🎛️ UI Control:</strong></div>
                        <div>Ctrl+Shift+U - Toggle RPmod ↔ Lite UI</div>
                        <div>Ctrl+Shift+E - Toggle Edit Mode</div>
                        <br>
                        <div><strong>📋 Panel Navigation:</strong></div>
                        <div>Ctrl+Shift+P - PLAY Panel</div>
                        <div>Ctrl+Shift+C - CHARS Panel</div>
                        <div>Ctrl+Shift+M - MEMORY Panel</div>
                        <div>Ctrl+Shift+W - WORLD INFO Panel</div>
                        <div>Ctrl+Shift+S - SCENE Panel</div>
                        <div>Ctrl+Shift+T - TOOLS Panel</div>
                        <div>Ctrl+Shift+N - NOTES Panel</div>
                        <div>Ctrl+Shift+H - HELP Panel</div>
                        <br>
                        <div><strong>🎚️ Panel Toggle:</strong></div>
                        <div>Ctrl+Shift+L - Toggle Left Panel</div>
                        <div>Ctrl+Shift+K - Toggle Right Panel</div>
                        <div>Tab - Cycle Input Focus</div>
                    </div>`
                ) : ''}
                
                ${this.currentDatabase === 'rpmod' && !this.searchQuery ? t.section('🔗 Quick Links',
                    `<div style="line-height: 1.8;">
                        <a href="https://github.com/PeterPeet/KLITE-RPmod" target="_blank" style="color: var(--accent);">🌟 RPMod GitHub</a><br>
                        <a href="https://github.com/LostRuins/koboldcpp/wiki" target="_blank" style="color: var(--accent);">📚 KoboldCpp Wiki</a><br>
                        <a href="https://github.com/LostRuins/koboldcpp/releases" target="_blank" style="color: var(--accent);">📦 Latest Releases</a><br>
                        <a href="https://discord.gg/koboldai" target="_blank" style="color: var(--accent);">💬 Discord Community</a>
                    </div>`
                ) : ''}
                
                ${this.currentDatabase === 'rpmod' && !this.searchQuery ? t.section('ℹ️ About',
                    `<div style="line-height: 1.5;">
                        <strong>KLITE RP Mod v${KLITE_RPMod.version}</strong><br>
                        <span class="klite-muted">Enhanced roleplay interface for KoboldAI Lite</span><br><br>
                        
                        Created by <strong>Peter Hauer</strong><br>
                        <span class="klite-muted">GPL-3.0 License</span><br><br>
                        
                        <div style="font-size: 11px; color: var(--muted); margin-top: 15px;">
                            This mod enhances KoboldAI Lite with a modern multi-panel interface,
                            character management, world info editor, scene tools, and comprehensive
                            hotkey system. All functionality runs client-side in your browser.
                        </div>
                    </div>`
                ) : ''}
                
                <!-- Modal for detailed entry viewing -->
                <div id="help-entry-modal" class="klite-modal" style="display: none;">
                    <div class="klite-modal-content" style="max-width: 700px;">
                        <div class="klite-modal-header">
                            <h3 id="help-modal-title"></h3>
                            <button class="klite-modal-close" data-action="close-modal"> -->
                        </div>
                        <div class="klite-modal-body">
                            <div id="help-modal-content"></div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        init() {
            // Initialize search functionality
            this.setupSearch();
        },
        
        setupSearch() {
            const searchInput = document.getElementById('help-search-input');
            if (!searchInput) return;
            
            // Real-time search with debouncing
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.trim();
                    if (this.searchQuery.length >= 2) {
                        this.performAdvancedSearch(this.searchQuery);
                    } else {
                        this.clearSearchResults();
                    }
                }, 800);
            });
            
            // Filter change listeners
            ['help-database-filter', 'help-sort-mode'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => {
                        // Save the dropdown selections
                        if (id === 'help-sort-mode') {
                            this.currentSortMode = element.value;
                        } else if (id === 'help-database-filter') {
                            this.currentDatabaseFilter = element.value;
                        }
                        
                        if (this.searchQuery.length >= 2) {
                            this.performAdvancedSearch(this.searchQuery);
                        }
                    });
                }
            });
            
            // Focus search on Ctrl+F
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'f' && 
                    KLITE_RPMod.state.tabs.left === 'HELP') {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
        },
        
        performSearch(query) {
            const results = [];
            const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
            
            // Search across ALL databases
            Object.entries(this.databases).forEach(([dbKey, database]) => {
                database.entries.forEach(entry => {
                    let score = 0;
                    
                    searchTerms.forEach(term => {
                        // Title matches (highest priority)
                        if (entry.title.toLowerCase().includes(term)) score += 10;
                        
                        // Category matches
                        if (entry.category.toLowerCase().includes(term)) score += 5;
                        
                        // Content matches
                        if (entry.content.toLowerCase().includes(term)) score += 3;
                        
                        // Keyword matches
                        if (entry.keywords.some(k => k.includes(term))) score += 7;
                    });
                    
                    if (score > 0) {
                        results.push({ ...entry, score, database: dbKey, icon: database.icon });
                    }
                });
            });
            
            // Sort by score and display
            this.searchResults = results.sort((a, b) => b.score - a.score);
            this.displaySearchResults();
            
            KLITE_RPMod.log('panels', `HELP search: "${query}" found ${results.length} results across all databases`);
        },
        
        renderSearchResults() {
            if (!this.searchQuery) {
                return '<div class="klite-help-search-placeholder">Receive help/knowledge while offline.</div>';
            }
            
            if (this.searchResults.length === 0) {
                return '<div class="klite-help-no-results">No results found. Try different keywords.</div>';
            }
            
            return this.searchResults.map(result => `
                <div class="klite-help-search-result" data-action="show-entry" data-entry-id="${result.id}" data-database="${result.database || 'rpmod'}">
                    <div class="klite-help-result-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="klite-help-result-icon" style="font-size: 16px;">${result.icon || '🎭'}</span>
                            <h4 class="klite-help-result-title" style="margin: 0; flex: 1;">${this.highlightSearchTerms(result.title)}</h4>
                            <span class="klite-help-result-category" style="font-size: 11px; color: var(--muted); text-transform: uppercase;">${result.category}</span>
                        </div>
                    </div>
                    <div class="klite-help-result-content" style="margin: 6px 0; color: var(--text); font-size: 12px; line-height: 1.4;">
                        ${this.highlightSearchTerms(result.content.substring(0, 200))}${result.content.length > 200 ? '...' : ''}
                    </div>
                    <div class="klite-help-result-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--muted); margin-top: 6px;">
                        <span class="klite-help-result-database">${this.databases[result.database || 'rpmod']?.name || 'RPMod'}</span>
                        <span class="klite-help-result-score">Score: ${result.score}</span>
                    </div>
                </div>
            `).join('');
        },
        
        highlightSearchTerms(text) {
            if (!this.searchQuery) return text;
            
            const terms = this.searchQuery.toLowerCase().split(' ').filter(t => t.length > 1);
            let highlighted = text;
            
            terms.forEach(term => {
                const regex = new RegExp(`(${term})`, 'gi');
                highlighted = highlighted.replace(regex, '<mark>$1</mark>');
            });
            
            return highlighted;
        },
        
        displaySearchResults() {
            const resultsContainer = document.getElementById('help-search-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = this.renderSearchResults();
            }
            
            // Update clear button visibility
            const clearBtn = document.querySelector('.klite-help-search-clear');
            if (clearBtn) {
                clearBtn.style.display = this.searchQuery ? 'block' : 'none';
            }
            
            // Update search stats
            const statsContainer = document.querySelector('.klite-help-search-stats');
            if (this.searchQuery && this.searchResults.length > 0) {
                if (!statsContainer) {
                    // Add stats if they don't exist
                    const filtersDiv = document.querySelector('.klite-help-search-filters');
                    if (filtersDiv) {
                        const statsDiv = document.createElement('div');
                        statsDiv.className = 'klite-help-search-stats';
                        statsDiv.style.cssText = 'font-size: 11px; color: var(--muted); margin-bottom: 8px; text-align: center;';
                        statsDiv.innerHTML = `<span>${this.searchResults.length} results found</span>`;
                        filtersDiv.parentNode.insertBefore(statsDiv, filtersDiv.nextSibling);
                    }
                } else {
                    statsContainer.innerHTML = `<span>${this.searchResults.length} results found</span>`;
                }
            } else if (statsContainer) {
                statsContainer.remove();
            }
        },
        
        clearSearchResults() {
            this.searchQuery = '';
            this.searchResults = [];
            this.refresh();
        },
        
        showEntryModal(entryId, databaseKey = null) {
            // Find entry in search results first (includes database info)
            let entry = this.searchResults.find(e => e.id === entryId);
            
            // If not in search results, search all databases
            if (!entry) {
                Object.entries(this.databases).forEach(([dbKey, database]) => {
                    if (!entry) {
                        const found = database.entries.find(e => e.id === entryId);
                        if (found) {
                            entry = { ...found, database: dbKey, icon: database.icon };
                        }
                    }
                });
            }
            
            if (!entry) return;
            
            const modal = document.getElementById('help-entry-modal');
            const title = document.getElementById('help-modal-title');
            const content = document.getElementById('help-modal-content');
            
            title.textContent = entry.title;
            content.innerHTML = `
                <div class="klite-help-modal-category">${entry.category}</div>
                <div class="klite-help-modal-content">${entry.content}</div>
                <div class="klite-help-modal-keywords">
                    <strong>Keywords:</strong> ${entry.keywords.join(', ')}
                </div>
            `;
            
            modal.style.display = 'block';
        },
        
        // Enhanced Search Helper Methods
        
        performAdvancedSearch(query) {
            const dbFilter = this.currentDatabaseFilter;
            const sortMode = this.currentSortMode;
            
            const results = [];
            const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
            
            // Search across filtered databases
            Object.entries(this.databases).forEach(([dbKey, database]) => {
                if (dbFilter && dbFilter !== dbKey) return;
                
                database.entries.forEach(entry => {
                    
                    let score = 0;
                    
                    searchTerms.forEach(term => {
                        // Title matches (highest priority)
                        if (entry.title.toLowerCase().includes(term)) score += 10;
                        
                        // Category matches
                        if (entry.category.toLowerCase().includes(term)) score += 5;
                        
                        // Content matches
                        if (entry.content.toLowerCase().includes(term)) score += 3;
                        
                        // Keyword matches
                        if (entry.keywords.some(k => k.includes(term))) score += 7;
                    });
                    
                    if (score > 0) {
                        results.push({ ...entry, score, database: dbKey, icon: database.icon });
                    }
                });
            });
            
            // Apply sorting
            switch (sortMode) {
                case 'title':
                    results.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'category':
                    results.sort((a, b) => a.category.localeCompare(b.category) || b.score - a.score);
                    break;
                default: // relevance
                    results.sort((a, b) => b.score - a.score);
            }
            
            this.searchResults = results;
            this.displaySearchResults();
            
            
            KLITE_RPMod.log('panels', `Advanced HELP search: "${query}" with filters (db:${dbFilter}, sort:${sortMode}) found ${results.length} results`);
        },

        actions: {
            'clear-search': () => {
                const searchInput = document.getElementById('help-search-input');
                if (searchInput) searchInput.value = '';
                KLITE_RPMod.panels.HELP.clearSearchResults();
            },
            'show-entry': (e) => {
                const entryId = e.target.closest('[data-entry-id]').dataset.entryId;
                const database = e.target.closest('[data-database]')?.dataset.database;
                KLITE_RPMod.panels.HELP.showEntryModal(entryId, database);
            },
            'close-modal': () => {
                document.getElementById('help-entry-modal').style.display = 'none';
            },
        },
        
        renderFeature(icon, title, desc) {
            return `
                <div class="klite-help-feature">
                    <div class="klite-help-feature-icon">${icon}</div>
                    <div class="klite-help-feature-content">
                        <div class="klite-help-feature-title">${title}</div>
                        <div class="klite-help-feature-desc">${desc}</div>
                    </div>
                </div>
            `;
        },
        
        refresh() {
            KLITE_RPMod.loadPanel('left', 'HELP');
        }
    };
    
    // WI PANEL - Complete WorldInfo Implementation
    KLITE_RPMod.panels.WI = {
        currentGroup: '',
        searchFilter: '',
        pendingWI: null, // For editing operations
        showSettings: false, // For collapsible settings
        
        render() {
            // Initialize pending WI from current if needed
            if (!this.pendingWI) {
                this.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
            }
            
            const groups = this.getGroups();
            const entries = this.getFilteredEntries();
            const groupEntries = this.pendingWI.filter(e => (e.wigroup || '') === this.currentGroup);
            const activeEntries = groupEntries.filter(e => !e.widisabled).length;
            
            // Get WI settings
            const caseSensitive = window.localsettings?.case_sensitive_wi || false;
            const insertLocation = window.wi_insertlocation || "0";
            const searchDepth = window.wi_searchdepth || "0";
            
            return `
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">🌍 World Info</h3>
                    <div style="text-align: right; font-size: 11px; color: var(--muted);">
                        <div>${activeEntries}/${groupEntries.length} active in group</div>
                        <div>${this.pendingWI.length} total entries</div>
                    </div>
                </div>
                
                <!-- Search and Controls -->
                <div class="klite-row" style="margin-bottom: 10px;">
                    ${t.input('wi-search', '🔍 Quick search...', 'text', this.searchFilter)}
                    ${t.button('+Entry', '', 'add-wi')}
                </div>
                
                <!-- Group Tabs -->
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 15px; padding: 10px; background: var(--bg); border-radius: 4px;">
                    ${groups.map(g => 
                        `<button class="klite-btn ${g === this.currentGroup ? 'active' : ''}" 
                                 data-action="wi-group" data-group="${g}" 
                                 style="padding: 4px 12px; font-size: 11px;">
                            ${g || 'General'}
                        </button>`
                    ).join('')}
                    <button class="klite-btn" data-action="add-wi-group" 
                            style="padding: 4px 12px; font-size: 11px;">
                        📁+
                    </button>
                    <button class="klite-btn" data-action="rename-wi-group" 
                            style="padding: 4px 12px; font-size: 11px;"
                            title="Rename current group">
                        ✏️
                    </button>
                    <button class="klite-btn danger" data-action="delete-wi-group" 
                            style="padding: 4px 12px; font-size: 11px;"
                            title="Delete current group">
                        🗑️
                    </button>
                </div>
                
                <!-- Control Buttons -->
                <div class="klite-buttons-fill" style="margin-bottom: 10px;">
                    ${t.button('⚙️ WI Settings', 'secondary', 'toggle-wi-settings')}
                    ${t.button('Export/Import', 'secondary', 'wi-group-export')}
                </div>
                
                <!-- Toggle Group -->
                <div style="margin-bottom: 15px;">
                    ${t.checkbox('wi-toggle-group', 'Toggle Entire Group', !groupEntries.some(e => e.widisabled))}
                </div>
                
                <!-- Settings -->
                ${this.showSettings ? t.section('⚙️ World Info Settings', `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
                        <div>
                            <label style="font-size: 12px; color: var(--muted);">Insert Location:</label>
                            ${t.select('wi-insert-location', [
                                {value: '0', text: 'After Memory', selected: insertLocation === '0'},
                                {value: '1', text: 'Before A/N', selected: insertLocation === '1'}
                            ])}
                        </div>
                        <div>
                            <label style="font-size: 12px; color: var(--muted);">Search Depth:</label>
                            ${t.select('wi-search-depth', [
                                {value: '0', text: 'Full Context', selected: searchDepth === '0'},
                                {value: '8192', text: 'Last 8192', selected: searchDepth === '8192'},
                                {value: '4096', text: 'Last 4096', selected: searchDepth === '4096'},
                                {value: '2048', text: 'Last 2048', selected: searchDepth === '2048'},
                                {value: '1024', text: 'Last 1024', selected: searchDepth === '1024'},
                                {value: '512', text: 'Last 512', selected: searchDepth === '512'},
                                {value: '256', text: 'Last 256', selected: searchDepth === '256'}
                            ])}
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        ${t.checkbox('wi-case-sensitive', 'Case Sensitive Keys', caseSensitive)}
                    </div>
                `) : ''}
                
                <!-- Entries -->
                <div id="wi-entries">
                    ${entries.length ? entries.map((e, displayIndex) => this.renderEntry(e, displayIndex)).join('') : 
                      '<div style="text-align: center; padding: 40px; color: var(--muted);">No world info entries.<br>Click [+Entry] to add a new entry to current group.</div>'}
                </div>
            `;
        },
        
        init() {
            // Initialize WI if needed
            if (!window.current_wi) window.current_wi = [];
            if (!window.pending_wi_obj) window.pending_wi_obj = [];
            
            // Start editing mode like Lite does
            this.startEditing();
            
            // Set initial group
            const groups = this.getGroups();
            this.currentGroup = window.curr_wi_tab || groups[0] || '';
            
            // Setup event handlers
            this.setupEventHandlers();
        },
        
        setupEventHandlers() {
            // Search handler with debouncing
            const searchInput = document.getElementById('wi-search');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', e => {
                    KLITE_RPMod.panels.WI.searchFilter = e.target.value;
                    // Clear previous timeout
                    clearTimeout(searchTimeout);
                    // Set new timeout for delayed refresh
                    searchTimeout = setTimeout(() => {
                        KLITE_RPMod.panels.WI.refresh();
                    }, 300); // 300ms delay
                });
            }
            
            // Settings handlers
            const insertLocation = document.getElementById('wi-insert-location');
            if (insertLocation) {
                insertLocation.addEventListener('change', e => {
                    window.wi_insertlocation = e.target.value;
                    window.autosave?.();
                });
            }
            
            const searchDepth = document.getElementById('wi-search-depth');
            if (searchDepth) {
                searchDepth.addEventListener('change', e => {
                    window.wi_searchdepth = e.target.value;
                    window.autosave?.();
                });
            }
            
            const caseSensitive = document.getElementById('wi-case-sensitive');
            if (caseSensitive) {
                caseSensitive.addEventListener('change', e => {
                    if (window.localsettings) {
                        window.localsettings.case_sensitive_wi = e.target.checked;
                        window.autosave?.();
                    }
                });
            }
            
            // Toggle group handler
            const toggleGroup = document.getElementById('wi-toggle-group');
            if (toggleGroup) {
                toggleGroup.addEventListener('change', e => {
                    KLITE_RPMod.panels.WI.toggleGroupEnabled(e.target.checked);
                });
            }
        },
        
        actions: {
            'add-wi': () => {
                const panel = KLITE_RPMod.panels.WI;
                panel.saveCurrentEdits();
                const newEntry = {
                    key: '',
                    keysecondary: '',
                    keyanti: '',
                    content: '',
                    comment: '',
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: panel.currentGroup,
                    widisabled: false
                };
                panel.pendingWI.push(newEntry);
                panel.commitChanges();
                panel.refresh();
            },
            
            'add-wi-group': () => {
                const panel = KLITE_RPMod.panels.WI;
                const groupName = prompt('Enter name of new WorldInfo Group:\n\nGroups can be used to segment data, e.g. entries for a specific place, person or event. Each entire group can be toggled on/off on demand.\n\nNote: You cannot rename a group after creation.');
                if (groupName) {
                    const sanitized = groupName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
                    if (sanitized) {
                        panel.saveCurrentEdits();
                        // Add a dummy entry to create the group
                        const newEntry = {
                            key: '',
                            keysecondary: '',
                            keyanti: '',
                            content: '',
                            comment: '',
                            folder: null,
                            selective: false,
                            constant: false,
                            probability: 100,
                            wigroup: sanitized,
                            widisabled: false
                        };
                        panel.pendingWI.push(newEntry);
                        panel.currentGroup = sanitized;
                        window.curr_wi_tab = sanitized;
                        panel.commitChanges();
                        panel.refresh();
                    }
                }
            },
            
            'wi-group': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                panel.saveCurrentEdits();
                panel.currentGroup = e.target.dataset.group;
                window.curr_wi_tab = panel.currentGroup;
                panel.refresh();
            },
            
            'wi-toggle': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                const entry = panel.pendingWI[index];
                if (entry) {
                    entry.widisabled = !entry.widisabled;
                    panel.commitChanges();
                    panel.refresh();
                }
            },
            
            'wi-selective': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                const entry = panel.pendingWI[index];
                if (entry) {
                    entry.selective = !entry.selective;
                    panel.commitChanges();
                    panel.refresh();
                }
            },
            
            'wi-constant': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                const entry = panel.pendingWI[index];
                if (entry) {
                    entry.constant = !entry.constant;
                    panel.commitChanges();
                    panel.refresh();
                }
            },
            
            'wi-delete': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                if (confirm('Delete this World Info entry?')) {
                    panel.saveCurrentEdits();
                    panel.pendingWI.splice(index, 1);
                    panel.commitChanges();
                    panel.refresh();
                }
            },
            
            'wi-up': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                panel.moveEntry(index, -1);
            },
            
            'wi-down': (e) => {
                const panel = KLITE_RPMod.panels.WI;
                const index = parseInt(e.target.dataset.index);
                panel.moveEntry(index, 1);
            },
            
            'toggle-wi-settings': () => {
                const panel = KLITE_RPMod.panels.WI;
                panel.showSettings = !panel.showSettings;
                panel.refresh();
            },
            
            'wi-group-export': () => {
                const panel = KLITE_RPMod.panels.WI;
                panel.exportImportGroup();
            },
            
            'rename-wi-group': () => {
                const panel = KLITE_RPMod.panels.WI;
                panel.renameGroup();
            },
            
            'delete-wi-group': () => {
                const panel = KLITE_RPMod.panels.WI;
                panel.deleteGroup();
            }
        },
        
        startEditing() {
            // Copy current_wi to pending for editing
            this.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
            
            // Sort by groups like Lite does
            this.pendingWI = this.stableSort(this.pendingWI, (a, b) => {
                const nameA = a.wigroup || '';
                const nameB = b.wigroup || '';
                return nameA.localeCompare(nameB);
            });
        },
        
        commitChanges() {
            // Save pending changes to current_wi
            window.current_wi = JSON.parse(JSON.stringify(this.pendingWI));
            window.pending_wi_obj = this.pendingWI;
            window.autosave?.();
        },
        
        saveCurrentEdits() {
            // Save all current input values
            const entries = document.querySelectorAll('[data-wi-index]');
            entries.forEach(elem => {
                const index = parseInt(elem.dataset.wiIndex);
                const field = elem.dataset.wiField;
                if (this.pendingWI[index] && field) {
                    if (field === 'probability') {
                        this.pendingWI[index][field] = parseInt(elem.value) || 100;
                    } else {
                        this.pendingWI[index][field] = elem.value;
                    }
                }
            });
        },
        
        toggleGroupEnabled(enabled) {
            this.pendingWI.forEach(entry => {
                if ((entry.wigroup || '') === this.currentGroup) {
                    entry.widisabled = !enabled;
                }
            });
            this.commitChanges();
            this.refresh();
        },
        
        moveEntry(index, direction) {
            const panel = KLITE_RPMod.panels.WI;
            panel.saveCurrentEdits();
            const entry = panel.pendingWI[index];
            const newIndex = index + direction;
            
            if (newIndex >= 0 && newIndex < panel.pendingWI.length) {
                const targetEntry = panel.pendingWI[newIndex];
                // Only swap if same group
                if ((entry.wigroup || '') === (targetEntry.wigroup || '')) {
                    panel.pendingWI[index] = targetEntry;
                    panel.pendingWI[newIndex] = entry;
                    panel.commitChanges();
                    // Force immediate refresh
                    KLITE_RPMod.loadPanel('right', 'WI');
                }
            }
        },
        
        exportImportGroup() {
            this.saveCurrentEdits();
            
            // Collect entries for current group
            const groupEntries = [];
            const indices = [];
            this.pendingWI.forEach((entry, i) => {
                if ((entry.wigroup || '') === this.currentGroup) {
                    const copied = JSON.parse(JSON.stringify(entry));
                    delete copied.wigroup; // Remove group for export
                    groupEntries.push(copied);
                    indices.push(i);
                }
            });
            
            const json = JSON.stringify(groupEntries, null, 2);
            
            // Create modal for import/export
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            modal.innerHTML = `
                <div class="klite-modal-content" style="background: var(--bg2); border-radius: 8px; padding: 20px; border: 1px solid var(--border); max-width: 600px;">
                    <div class="klite-modal-header">
                        <h3>World Info Import / Export - ${this.currentGroup || 'General'}</h3>
                        <button class="klite-modal-close" onclick="this.closest('.klite-modal').remove()">×</button>
                    </div>
                    <div class="klite-modal-body">
                        <p style="margin-bottom: 10px;">Copy or paste World Info JSON to modify the entries in this group:</p>
                        <textarea id="wi-json-textarea" style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;">${json}</textarea>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn" onclick="navigator.clipboard.writeText(document.getElementById('wi-json-textarea').value)">Copy</button>
                        <button class="klite-btn success" onclick="KLITE_RPMod.panels.WI.importGroupJSON('${this.currentGroup}')">Import</button>
                        <button class="klite-btn secondary" onclick="this.closest('.klite-modal').remove()">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },
        
        importGroupJSON(group) {
            const textarea = document.getElementById('wi-json-textarea');
            if (!textarea) return;
            
            try {
                const newEntries = JSON.parse(textarea.value);
                if (Array.isArray(newEntries)) {
                    // Remove old entries from this group
                    this.pendingWI = this.pendingWI.filter(e => (e.wigroup || '') !== group);
                    
                    // Add new entries with group
                    newEntries.forEach(entry => {
                        entry.wigroup = group;
                        this.pendingWI.push(entry);
                    });
                    
                    this.commitChanges();
                    this.refresh();
                    document.querySelector('.klite-modal').remove();
                    // World Info imported successfully
                }
            } catch (e) {
                alert('Invalid JSON format!');
            }
        },
        
        getGroups() {
            const groups = new Set();
            this.pendingWI.forEach(e => groups.add(e.wigroup || ''));
            return Array.from(groups).sort();
        },
        
        getFilteredEntries() {
            const filtered = this.pendingWI.filter((e, index) => {
                const matchGroup = (e.wigroup || '') === this.currentGroup;
                const matchSearch = !this.searchFilter || 
                    e.key?.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
                    e.keysecondary?.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
                    e.content?.toLowerCase().includes(this.searchFilter.toLowerCase()) ||
                    e.comment?.toLowerCase().includes(this.searchFilter.toLowerCase());
                return matchGroup && matchSearch;
            });
            
            return filtered;
        },
        
        renderEntry(entry, displayIndex) {
            const actualIndex = this.pendingWI.indexOf(entry);
            const isFirst = displayIndex === 0;
            const isLast = displayIndex === this.getFilteredEntries().length - 1;
            
            return `
                <div class="klite-wi-entry ${entry.widisabled ? 'disabled' : ''}" 
                     style="margin-bottom: 10px; padding: 10px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; opacity: ${entry.widisabled ? '0.5' : '1'};">
                    
                    <!-- Header Row -->
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                        <button class="klite-btn ${entry.widisabled ? 'danger' : 'success'}" 
                                data-action="wi-toggle" data-index="${actualIndex}" 
                                style="width: 24px; height: 24px; padding: 0; font-size: 12px;"
                                title="${entry.widisabled ? 'Enable entry' : 'Disable entry'}">
                            ⚡
                        </button>
                        
                        <button class="klite-btn danger" data-action="wi-delete" data-index="${actualIndex}" 
                                style="width: 24px; height: 24px; padding: 0; font-size: 12px;"
                                title="Delete entry">
                            ×
                        </button>
                        
                        <button class="klite-btn" data-action="wi-up" data-index="${actualIndex}" 
                                style="width: 24px; height: 24px; padding: 0; font-size: 12px;"
                                title="Move up"
                                ${isFirst ? 'disabled' : ''}>
                            ▲
                        </button>
                        
                        <button class="klite-btn" data-action="wi-down" data-index="${actualIndex}" 
                                style="width: 24px; height: 24px; padding: 0; font-size: 12px;"
                                title="Move down"
                                ${isLast ? 'disabled' : ''}>
                            ▼
                        </button>
                        
                        <div style="flex: 1; text-align: right; display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
                            <!-- Toggles -->
                            <button class="klite-btn ${entry.selective ? 'active' : ''}" 
                                    data-action="wi-selective" data-index="${actualIndex}" 
                                    style="width: 30px; height: 24px; padding: 0; font-size: 12px;"
                                    title="Selective Key mode (requires both primary and secondary keys)">
                                📑
                            </button>
                            
                            <button class="klite-btn ${entry.constant ? 'active' : ''}" 
                                    data-action="wi-constant" data-index="${actualIndex}" 
                                    style="width: 30px; height: 24px; padding: 0; font-size: 12px;"
                                    title="Constant Key mode (always included)">
                                📌
                            </button>
                            
                            <!-- Probability -->
                            <select class="klite-select" data-wi-index="${actualIndex}" data-wi-field="probability" 
                                    style="width: 70px; height: 24px; padding: 2px; font-size: 11px;"
                                    onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'probability', parseInt(this.value))">
                                ${[100, 90, 75, 50, 25, 10, 5, 1].map(p => 
                                    `<option value="${p}" ${entry.probability === p ? 'selected' : ''}>${p}%</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Primary Key Row -->
                    <div style="margin-bottom: 8px;">
                        <input class="klite-input" placeholder="Key(s) - comma separated" 
                               value="${KLITE_RPMod.escapeHtml(entry.key || '')}"
                               data-wi-index="${actualIndex}" data-wi-field="key"
                               style="font-size: 12px;"
                               onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'key', this.value)">
                    </div>
                    
                    <!-- Secondary Keys (if selective) -->
                    ${entry.selective ? `
                        <div style="margin-bottom: 8px;">
                            <input class="klite-input" placeholder="Secondary Key(s) - comma separated" 
                                   value="${KLITE_RPMod.escapeHtml(entry.keysecondary || '')}"
                                   data-wi-index="${actualIndex}" data-wi-field="keysecondary"
                                   style="font-size: 12px;"
                                   onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'keysecondary', this.value)">
                        </div>
                        <div style="margin-bottom: 8px;">
                            <input class="klite-input" placeholder="Anti Key(s) - comma separated (optional)" 
                                   value="${KLITE_RPMod.escapeHtml(entry.keyanti || '')}"
                                   data-wi-index="${actualIndex}" data-wi-field="keyanti"
                                   style="font-size: 12px;"
                                   onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'keyanti', this.value)">
                        </div>
                    ` : ''}
                    
                    <!-- Content -->
                    <textarea class="klite-textarea" placeholder="WI Entry..." 
                              style="min-height: 80px; font-size: 12px; margin-bottom: 8px;"
                              data-wi-index="${actualIndex}" data-wi-field="content"
                              onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'content', this.value)">${KLITE_RPMod.escapeHtml(entry.content || '')}</textarea>
                    
                    <!-- Comment -->
                    <input class="klite-input" placeholder="Comment (only here for debugging)" 
                           value="${KLITE_RPMod.escapeHtml(entry.comment || '')}"
                           data-wi-index="${actualIndex}" data-wi-field="comment"
                           style="font-size: 11px;"
                           onchange="KLITE_RPMod.panels.WI.updateField(${actualIndex}, 'comment', this.value)">
                </div>
            `;
        },
        
        updateField(index, field, value) {
            if (this.pendingWI[index]) {
                this.pendingWI[index][field] = value;
                this.commitChanges();
            }
        },
        
        stableSort(arr, compareFn) {
            // Stable sort implementation
            return arr.map((item, index) => ({item, index}))
                .sort((a, b) => compareFn(a.item, b.item) || a.index - b.index)
                .map(({item}) => item);
        },
        
        refresh() {
            this.saveCurrentEdits();
            KLITE_RPMod.loadPanel('right', 'WI');
        },
        
        renameGroup() {
            const currentGroupName = this.currentGroup || 'General';
            const newName = prompt(`Rename group "${currentGroupName}" to:`, currentGroupName === 'General' ? '' : currentGroupName);
            
            if (newName === null) return; // User cancelled
            
            const trimmedName = newName.trim();
            
            // Check if new name already exists (and is different from current)
            const groups = this.getGroups();
            if (trimmedName !== (this.currentGroup || '') && groups.includes(trimmedName)) {
                alert(`Group "${trimmedName || 'General'}" already exists!`);
                return;
            }
            
            // Update all entries in this group
            this.pendingWI.forEach(entry => {
                if ((entry.wigroup || '') === this.currentGroup) {
                    entry.wigroup = trimmedName;
                }
            });
            
            // Update current group selection
            this.currentGroup = trimmedName;
            
            this.commitChanges();
            this.refresh();
            
            KLITE_RPMod.log('wi', `Renamed group "${currentGroupName}" to "${trimmedName || 'General'}"`);
        },
        
        deleteGroup() {
            const groupName = this.currentGroup || 'General';
            const groupEntries = this.pendingWI.filter(e => (e.wigroup || '') === this.currentGroup);
            
            if (groupEntries.length === 0) {
                alert('This group has no entries to delete.');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete the group "${groupName}" and all ${groupEntries.length} entries in it?\n\nThis action cannot be undone.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Remove all entries from this group
            this.pendingWI = this.pendingWI.filter(e => (e.wigroup || '') !== this.currentGroup);
            
            // Switch to General group or first available group
            const remainingGroups = this.getGroups();
            this.currentGroup = remainingGroups.length > 0 ? remainingGroups[0] : '';
            
            this.commitChanges();
            this.refresh();
            
            KLITE_RPMod.log('wi', `Deleted group "${groupName}" with ${groupEntries.length} entries`);
        }
    };
    
    // TEXTDB PANEL - Complete KoboldAI Lite Feature Parity
    KLITE_RPMod.panels.TEXTDB = {
        showAdvanced: false,
        
        render() {
            this.ensureTextDBInitialized();
            
            const data = window.documentdb_data || '';
            const enabled = window.documentdb_enabled || false;
            const searchHistory = window.documentdb_searchhistory || false;
            const numResults = window.documentdb_numresults || 3;
            const searchRange = window.documentdb_searchrange || 300;
            const chunkSize = window.documentdb_chunksize || 800;
            
            // Calculate statistics
            const wordCount = data.split(/\s+/).filter(w => w.length > 0).length;
            const charCount = data.length;
            const chunks = Math.ceil(charCount / chunkSize);
            const memorySizeMB = (charCount * 2) / (1024 * 1024); // Rough JS memory estimate
            
            return `
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">📚 Text Database</h3>
                    <div style="font-size: 11px; color: ${enabled ? 'var(--success)' : 'var(--muted)'}; font-weight: bold;">
                        ${enabled ? '✓ ACTIVE' : '✗ DISABLED'}
                    </div>
                </div>
                
                <!-- Main Controls -->
                ${t.section('🎛️ Database Control',
                    `<div class="klite-row" style="margin-bottom: 15px;">
                        ${t.checkbox('textdb-enabled', 'Enable Text Database', enabled)}
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div class="klite-buttons-fill" style="margin-bottom: 8px;">
                            ${t.button('📁 Import Files', 'secondary', 'import-textdb')}
                            ${t.button('📤 Export', 'secondary', 'export-textdb')}
                        </div>
                        <div class="klite-buttons-fill">
                            ${t.button('🔧 Advanced', '', 'toggle-textdb-advanced')}
                            ${t.button('🗑️ Clear All', 'danger', 'clear-textdb')}
                        </div>
                    </div>`
                )}
                
                <!-- Advanced Settings -->
                ${this.showAdvanced ? `
                    ${t.section('⚙️ Advanced Settings',
                        `<div class="klite-control-group">
                            
                            <!-- Search Configuration -->
                            <h4 style="margin-top: 0;">Search Configuration</h4>
                            
                            <label>Number of Results (1-5):</label>
                            <div class="klite-row" style="margin-bottom: 10px;">
                                <input id="textdb-num-results" type="range" min="1" max="5" value="${numResults}" 
                                       class="klite-input" style="flex: 1; margin-right: 10px;">
                                <span id="textdb-num-results-value" style="min-width: 30px; font-weight: bold;">${numResults}</span>
                            </div>
                            
                            <label>Search Range - Recent Text (0-1024 chars):</label>
                            <div class="klite-row" style="margin-bottom: 10px;">
                                <input id="textdb-search-range" type="range" min="0" max="1024" step="50" value="${searchRange}" 
                                       class="klite-input" style="flex: 1; margin-right: 10px;">
                                <span id="textdb-search-range-value" style="min-width: 60px; font-weight: bold;">${searchRange}</span>
                            </div>
                            
                            <label>Chunk Size (32-2048 chars):</label>
                            <div class="klite-row" style="margin-bottom: 15px;">
                                <input id="textdb-chunk-size" type="range" min="32" max="2048" step="32" value="${chunkSize}" 
                                       class="klite-input" style="flex: 1; margin-right: 10px;">
                                <span id="textdb-chunk-size-value" style="min-width: 60px; font-weight: bold;">${chunkSize}</span>
                            </div>
                            
                            <!-- Search Options -->
                            <h4>Search Options</h4>
                            ${t.checkbox('textdb-search-history', 'Include Story History in Search', searchHistory)}
                            
                            <!-- Performance Info -->
                            <div class="klite-info klite-mt">
                                <strong>Performance Impact:</strong><br>
                                <span style="font-size: 11px; color: var(--muted);">
                                    Higher chunk size = better context but more memory.<br>
                                    More results = better coverage but slower generation.<br>
                                    Search range 0 = current prompt only.
                                </span>
                            </div>
                            
                        </div>`
                    )}
                ` : ''}
                
                <!-- Text Editor -->
                ${t.section('📝 Database Content',
                    `<div style="margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 5px; font-size: 11px;">
                            <div>
                                <label style="font-weight: bold; font-size: 12px;">Database Text:</label>
                            </div>
                            <div style="text-align: right; color: var(--muted);">
                                Auto-saved • ${charCount.toLocaleString()} characters
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; height: calc(100vh - 350px);">
                        <textarea id="textdb-data" class="klite-textarea klite-textarea-fullheight" 
                                  style="font-family: monospace; font-size: 12px; height: 100%;"
                                  placeholder="TextDB data...">${KLITE_RPMod.escapeHtml(data)}</textarea>
                    </div>`)}
                
                <!-- Import Modal Placeholder -->
                <div id="textdb-import-modal" class="klite-modal" style="display: none;">
                    <div class="klite-modal-content">
                        <div class="klite-modal-header">
                            <h3>📁 Import Text Database</h3>
                            <button class="klite-modal-close" onclick="document.getElementById('textdb-import-modal').style.display='none'"> -->
                        </div>
                        <div class="klite-modal-body">
                            <div class="klite-control-group">
                                <label>Import Mode:</label>
                                <select id="textdb-import-mode" class="klite-input">
                                    <option value="append">Append to existing content</option>
                                    <option value="replace">Replace all content</option>
                                </select>
                            </div>
                            
                            <div class="klite-control-group">
                                <label>File Format:</label>
                                <div id="textdb-file-drop" style="border: 2px dashed var(--border); padding: 20px; text-align: center; margin: 10px 0; border-radius: 4px; cursor: pointer;">
                                    <div>📁 Drop files here or click to select</div>
                                    <div style="font-size: 11px; color: var(--muted); margin-top: 5px;">Supports: .txt, .md, .json</div>
                                </div>
                                <input type="file" id="textdb-file-input" accept=".txt,.md,.json" multiple style="display: none;">
                            </div>
                        </div>
                        <div class="klite-modal-footer">
                            ${t.button('Import', 'primary', 'execute-textdb-import')}
                            ${t.button('Cancel', 'secondary', 'close-textdb-import')}
                        </div>
                    </div>
                </div>
            `;
        },
        
        init() {
            this.ensureTextDBInitialized();
            
            setTimeout(() => {
                this.setupEventHandlers();
                this.setupAdvancedControls();
                this.setupImportModal();
            }, 100);
        },
        
        ensureTextDBInitialized() {
            // Initialize all TextDB variables if they don't exist
            if (typeof window.documentdb_enabled === 'undefined') window.documentdb_enabled = false;
            if (typeof window.documentdb_searchhistory === 'undefined') window.documentdb_searchhistory = false;
            if (typeof window.documentdb_numresults === 'undefined') window.documentdb_numresults = 3;
            if (typeof window.documentdb_searchrange === 'undefined') window.documentdb_searchrange = 300;
            if (typeof window.documentdb_chunksize === 'undefined') window.documentdb_chunksize = 800;
            if (typeof window.documentdb_data === 'undefined') window.documentdb_data = '';
            
            KLITE_RPMod.log('panels', 'TextDB variables initialized');
        },
        
        setupEventHandlers() {
            // Main enable/disable
            const enabledCheckbox = document.getElementById('textdb-enabled');
            if (enabledCheckbox) {
                enabledCheckbox.addEventListener('change', e => {
                    window.documentdb_enabled = e.target.checked;
                    this.save();
                    this.refresh();
                    KLITE_RPMod.log('panels', `TextDB enabled: ${e.target.checked}`);
                });
            }
            
            // Text data editor
            const dataTextarea = document.getElementById('textdb-data');
            if (dataTextarea) {
                let saveTimeout;
                dataTextarea.addEventListener('input', e => {
                    window.documentdb_data = e.target.value;
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.save();
                        this.updateStatistics();
                    }, 1000);
                });
            }
            
            // Search history checkbox
            const searchHistoryCheckbox = document.getElementById('textdb-search-history');
            if (searchHistoryCheckbox) {
                searchHistoryCheckbox.addEventListener('change', e => {
                    window.documentdb_searchhistory = e.target.checked;
                    this.save();
                    KLITE_RPMod.log('panels', `TextDB search history: ${e.target.checked}`);
                });
            }
        },
        
        setupAdvancedControls() {
            // Number of results slider
            const numResultsSlider = document.getElementById('textdb-num-results');
            const numResultsValue = document.getElementById('textdb-num-results-value');
            if (numResultsSlider && numResultsValue) {
                numResultsSlider.addEventListener('input', e => {
                    const value = parseInt(e.target.value);
                    numResultsValue.textContent = value;
                    window.documentdb_numresults = value;
                    this.save();
                });
            }
            
            // Search range slider
            const searchRangeSlider = document.getElementById('textdb-search-range');
            const searchRangeValue = document.getElementById('textdb-search-range-value');
            if (searchRangeSlider && searchRangeValue) {
                searchRangeSlider.addEventListener('input', e => {
                    const value = parseInt(e.target.value);
                    searchRangeValue.textContent = value;
                    window.documentdb_searchrange = value;
                    this.save();
                });
            }
            
            // Chunk size slider
            const chunkSizeSlider = document.getElementById('textdb-chunk-size');
            const chunkSizeValue = document.getElementById('textdb-chunk-size-value');
            if (chunkSizeSlider && chunkSizeValue) {
                chunkSizeSlider.addEventListener('input', e => {
                    const value = parseInt(e.target.value);
                    chunkSizeValue.textContent = value;
                    window.documentdb_chunksize = value;
                    this.save();
                });
            }
        },
        
        setupImportModal() {
            const fileInput = document.getElementById('textdb-file-input');
            const dropZone = document.getElementById('textdb-file-drop');
            
            if (dropZone && fileInput) {
                // Click to select files
                dropZone.addEventListener('click', () => fileInput.click());
                
                // Drag and drop
                dropZone.addEventListener('dragover', e => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--accent)';
                    dropZone.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
                });
                
                dropZone.addEventListener('dragleave', e => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--border)';
                    dropZone.style.backgroundColor = 'transparent';
                });
                
                dropZone.addEventListener('drop', e => {
                    e.preventDefault();
                    dropZone.style.borderColor = 'var(--border)';
                    dropZone.style.backgroundColor = 'transparent';
                    
                    const files = Array.from(e.dataTransfer.files).filter(f => 
                        f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.json')
                    );
                    
                    if (files.length > 0) {
                        this.processImportFiles(files);
                    }
                });
                
                // File input change
                fileInput.addEventListener('change', e => {
                    if (e.target.files.length > 0) {
                        this.processImportFiles(Array.from(e.target.files));
                    }
                });
            }
        },
        
        processImportFiles(files) {
            const mode = document.getElementById('textdb-import-mode')?.value || 'append';
            let processedFiles = 0;
            let totalContent = mode === 'replace' ? '' : (window.documentdb_data || '');
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let content = e.target.result;
                    
                    // Process JSON files
                    if (file.name.endsWith('.json')) {
                        try {
                            const json = JSON.parse(content);
                            content = JSON.stringify(json, null, 2);
                        } catch (error) {
                            // Warning: ${file.name} is not valid JSON
                        }
                    }
                    
                    // Add separator and content
                    if (totalContent.length > 0 && !totalContent.endsWith('\n')) {
                        totalContent += '\n';
                    }
                    totalContent += `\n=== ${file.name} ===\n${content}\n`;
                    
                    processedFiles++;
                    
                    // When all files are processed
                    if (processedFiles === files.length) {
                        window.documentdb_data = totalContent;
                        document.getElementById('textdb-data').value = totalContent;
                        this.save();
                        document.getElementById('textdb-import-modal').style.display = 'none';
                        this.refresh();
                        
                        // Imported ${files.length} files (${mode} mode)
                        KLITE_RPMod.log('panels', `TextDB import: ${files.length} files, mode: ${mode}`);
                    }
                };
                reader.readAsText(file);
            });
        },
        
        updateStatistics() {
            // Update statistics display if visible
            setTimeout(() => this.refresh(), 100);
        },
        
        actions: {
            'toggle-textdb-advanced': () => {
                KLITE_RPMod.panels.TEXTDB.showAdvanced = !KLITE_RPMod.panels.TEXTDB.showAdvanced;
                KLITE_RPMod.panels.TEXTDB.refresh();
            },
            
            'import-textdb': () => {
                document.getElementById('textdb-import-modal').style.display = 'block';
            },
            
            'export-textdb': () => {
                const data = {
                    version: '1.0',
                    exported: new Date().toISOString(),
                    settings: {
                        documentdb_enabled: window.documentdb_enabled,
                        documentdb_searchhistory: window.documentdb_searchhistory,
                        documentdb_numresults: window.documentdb_numresults,
                        documentdb_searchrange: window.documentdb_searchrange,
                        documentdb_chunksize: window.documentdb_chunksize
                    },
                    content: window.documentdb_data || ''
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `textdb-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Text database exported with settings
                KLITE_RPMod.log('panels', 'TextDB exported with full settings');
            },
            
            'clear-textdb': () => {
                if (confirm('Clear all text database content? This cannot be undone.')) {
                    window.documentdb_data = '';
                    document.getElementById('textdb-data').value = '';
                    KLITE_RPMod.panels.TEXTDB.save();
                    KLITE_RPMod.panels.TEXTDB.refresh();
                    // Text database cleared
                }
            },
            
            'execute-textdb-import': () => {
                const fileInput = document.getElementById('textdb-file-input');
                if (fileInput.files.length > 0) {
                    KLITE_RPMod.panels.TEXTDB.processImportFiles(Array.from(fileInput.files));
                } else {
                    // Please select files to import
                }
            },
            
            'close-textdb-import': () => {
                document.getElementById('textdb-import-modal').style.display = 'none';
                document.getElementById('textdb-file-input').value = '';
            }
        },
        
        save() {
            clearTimeout(this.saveTimer);
            
            this.saveTimer = setTimeout(() => {
                // Validate numeric settings
                window.documentdb_numresults = Math.max(1, Math.min(5, window.documentdb_numresults || 3));
                window.documentdb_searchrange = Math.max(0, Math.min(1024, window.documentdb_searchrange || 300));
                window.documentdb_chunksize = Math.max(32, Math.min(2048, window.documentdb_chunksize || 800));
                
                // Save to KoboldAI
                window.save_settings?.();
                window.autosave?.();
                
                KLITE_RPMod.log('panels', `TextDB saved: ${window.documentdb_data?.length || 0} chars, enabled: ${window.documentdb_enabled}`);
            }, 500);
        },
        
        refresh() {
            KLITE_RPMod.loadPanel('right', 'TEXTDB');
        }
    };

    // MEMORY PANEL - Enhanced with Template System
    KLITE_RPMod.panels.MEMORY = {
        showTemplates: false,
        
        render() {
            const memory = window.current_memory || '';
            const wordCount = memory.split(/\s+/).filter(w => w.length > 0).length;
            const tokenCount = Math.ceil(memory.length / 4);
            const charCount = memory.length;
            
            return `
                <!-- Header with Statistics -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">🧠 Memory Context</h3>
                    <div style="font-size: 11px; color: var(--muted); text-align: right;">
                        <div>${tokenCount} tokens</div>
                        <div>${wordCount} words</div>
                    </div>
                </div>
                
                <!-- Main Memory Editor -->
                ${t.section('📝 Memory Content',
                    `<div style="margin-bottom: 10px;">
                        <label style="font-weight: bold;">Persistent Memory:</label>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">This content is always included at the start of the AI's context</div>
                    </div>
                    <div style="display: flex; flex-direction: column; height: calc(100vh - 300px);">
                        <textarea id="memory-text" class="klite-textarea klite-textarea-fullheight" 
                                  style="font-family: monospace; font-size: 12px; height: 100%;"
                                  placeholder="Enter persistent memory...">${KLITE_RPMod.escapeHtml(memory)}</textarea>
                    </div>
                    
                    <div class="klite-info klite-mt" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px;">
                        <div>
                            <span id="memory-status">Ready</span> • 
                            <span id="memory-tokens">${tokenCount} tokens</span>
                        </div>
                        <div style="text-align: right;">Auto-saved</div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <div class="klite-buttons-fill" style="margin-bottom: 8px;">
                            ${t.button('📥 Import', 'secondary', 'import-memory')}
                            ${t.button('📤 Export', 'secondary', 'export-memory')}
                        </div>
                        <div class="klite-buttons-fill">
                            ${t.button('📋 Templates', '', 'toggle-memory-templates')}
                            ${t.button('🗑️ Clear All', 'danger', 'clear-memory')}
                        </div>
                    </div>`)}
                
                <!-- Template System -->
                ${this.showTemplates ? `
                    ${t.section('📋 Memory Templates',
                        `<div class="klite-control-group">
                            <h4 style="margin-top: 0;">Quick Templates</h4>
                            <div style="margin-bottom: 15px; font-size: 12px; color: var(--muted);">
                                Templates get appended to the existing memory.
                            </div>
                            <div class="klite-buttons-grid-2" style="margin-bottom: 15px;">
                                ${t.button('🎭 Basic Character', 'secondary', 'template-basic-char')}
                                ${t.button('🎭 Complex Character', 'secondary', 'template-complex-char')}
                                ${t.button('🌍 World Setting', 'secondary', 'template-world')}
                                ${t.button('📖 Story Context', 'secondary', 'template-story')}
                            </div>
                        </div>`
                    )}
                ` : ''}
                
            `;
        },
        
        init() {
            const textarea = document.getElementById('memory-text');
            if (textarea) {
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    window.current_memory = value;
                    
                    // Sync with Lite UI
                    const liteMemory = document.getElementById('memorytext');
                    if (liteMemory) liteMemory.value = value;
                    
                    // Update statistics
                    const tokenCount = Math.ceil(value.length / 4);
                    document.getElementById('memory-tokens').textContent = tokenCount + ' tokens';
                    document.getElementById('memory-status').textContent = '✓ Saved';
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        window.autosave?.();
                        document.getElementById('memory-status').textContent = 'Ready';
                    }, 1000);
                });
            }
        },
        
        templates: {
            basicCharacter: `[Character: {{char}}]
Personality: 
Background: 
Goals: 
Appearance: 
Speech Style: `,
            
            complexCharacter: `# Character Profile: {{char}}

**General Descriptions of {{char}}:**
Gender: 
Species: 
Age: 
Height: 
Weight: 
Build: 
Hair: 
Eyes: 
Eyebrows: 
Ticklish Areas: 
Clothing Preferences: 
(*Optional for NSFW* Sexuality: )
(*Optional for NSFW* Private parts: )

**Personality, Likes, Dislikes, Mannerisms of {{char}}:**
Personality: 
Mind: 
Speech: 
Accent: 
Mannerisms: 
Likes: 
Dislikes: 
Hobbies: 

(*Optional for NSFW
**Sexual Likings, Boundaries and No-Go Areas:**
Sexual cravings: 
{{char}}'s fetishes: 
{{char}}'s absolute no-go areas: *)

**Goals of {{char}}:**
Short-term Goals: 
Long-term Goals: 
Material Wishes: 
{{char}}'s primary goal is: 

**Memories and History of {{char}}:**
Childhood: 
Long-term Memories of {{char}}: 
Short-term Memories relevant for the scenario: `,
            
            world: `[World Setting: ]
Location: 
Time Period: 
Technology Level: 
Magic System: 
Political Structure: 
Important Locations: 
Key NPCs: 
Current Events: 
Rules & Laws: 
Culture & Customs: `,
            
            story: `[Story Context]
Genre: 
Tone: 
Current Scene: 
Recent Events: 
Active Plot Threads: 
Character Relationships: 
Mood & Atmosphere: 
Pacing Notes: `
        },
        
        
        applyTemplate(templateKey) {
            const template = this.templates[templateKey];
            if (!template) return;
            
            // Always append template to existing memory
            this.executeTemplateApplication(template, 'append');
        },
        
        executeTemplateApplication(template, mode) {
            const currentMemory = window.current_memory || '';
            
            // Replace {{char}} placeholder with default "Character"
            let processedTemplate = template.replace(/\{\{char\}\}/g, 'Character');
            
            // Always append to existing memory
            const newMemory = currentMemory + (currentMemory.length > 0 ? '\n\n' : '') + processedTemplate;
            
            // Apply to textarea and trigger save
            const textarea = document.getElementById('memory-text');
            if (textarea) {
                textarea.value = newMemory;
                textarea.dispatchEvent(new Event('input'));
            }
            
            // Template appended to memory
            KLITE_RPMod.log('panels', 'Memory template appended');
        },
        
        
        actions: {
            'toggle-memory-templates': () => {
                KLITE_RPMod.panels.MEMORY.showTemplates = !KLITE_RPMod.panels.MEMORY.showTemplates;
                KLITE_RPMod.panels.MEMORY.refresh();
            },
            
            'clear-memory': () => {
                const currentMemory = window.current_memory || '';
                if (currentMemory.length === 0) {
                    // Memory is already empty
                    return;
                }
                
                if (confirm(`Clear all memory content? This will delete ${currentMemory.length} characters of memory data.`)) {
                    const textarea = document.getElementById('memory-text');
                    if (textarea) {
                        textarea.value = '';
                        textarea.dispatchEvent(new Event('input'));
                    }
                    // Memory cleared
                }
            },
            
            'export-memory': () => {
                const memory = window.current_memory || '';
                if (memory.length === 0) {
                    // No memory content to export
                    return;
                }
                
                const data = {
                    version: '1.0',
                    exported: new Date().toISOString(),
                    type: 'memory',
                    content: memory,
                    statistics: {
                        characters: memory.length,
                        words: memory.split(/\\s+/).filter(w => w.length > 0).length,
                        tokens: Math.ceil(memory.length / 4)
                    }
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `memory-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Memory exported successfully
            },
            
            'import-memory': () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,.txt';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                let content;
                                if (file.name.endsWith('.json')) {
                                    const data = JSON.parse(e.target.result);
                                    content = data.content || data.memory || e.target.result;
                                } else {
                                    content = e.target.result;
                                }
                                
                                const currentMemory = window.current_memory || '';
                                const mode = currentMemory.length > 0 ? 
                                    confirm('Append to existing memory? (Cancel to replace)') ? 'append' : 'replace' :
                                    'replace';
                                
                                KLITE_RPMod.panels.MEMORY.executeTemplateApplication(content, mode);
                                // Memory imported (${mode} mode)
                                
                            } catch (error) {
                                // Error importing memory: ' + error.message
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            },
            
            'template-basic-char': () => {
                KLITE_RPMod.panels.MEMORY.applyTemplate('basicCharacter');
            },
            
            'template-complex-char': () => {
                KLITE_RPMod.panels.MEMORY.applyTemplate('complexCharacter');
            },
            
            'template-world': () => {
                KLITE_RPMod.panels.MEMORY.applyTemplate('world');
            },
            
            'template-story': () => {
                KLITE_RPMod.panels.MEMORY.applyTemplate('story');
            },
            
        },
        
        refresh() {
            KLITE_RPMod.loadPanel('right', 'MEMORY');
        }
    };
    
    // NOTES PANEL - Enhanced with Sophisticated Injection System
    KLITE_RPMod.panels.NOTES = {
        showAdvanced: false,
        personalNotes: '', // Store personal notes in memory
        
        render() {
            const personal = this.personalNotes || '';
            const author = window.current_anote || '';
            const authorTemplate = window.current_anotetemplate || '<|>';
            const injectionDepth = window.anote_strength || 320;
            
            // Calculate statistics
            const personalWordCount = personal.split(/\s+/).filter(w => w.length > 0).length;
            const personalTokenCount = Math.ceil(personal.length / 4);
            const authorWordCount = author.split(/\s+/).filter(w => w.length > 0).length;
            const authorTokenCount = Math.ceil(author.length / 4);
            
            // Detect current mode for injection guidance
            const currentMode = this.detectStoryMode();
            
            return `
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">📝 Notes & Author's Note</h3>
                    <div style="font-size: 11px; color: var(--muted); text-align: right;">
                        <div>Mode: ${currentMode}</div>
                        <div>Total: ${personalTokenCount + authorTokenCount} tokens</div>
                    </div>
                </div>
                
                <!-- Personal Notes Section -->
                ${t.section('📝 Personal Notes',
                    `<div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <label style="font-weight: bold;">Private Notes:</label>
                            <span style="font-size: 11px; color: var(--muted);">${personalTokenCount} tokens • ${personalWordCount} words</span>
                        </div>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Private notes saved with your story (not sent to AI)</div>
                    </div>
                    <textarea id="personal-notes" class="klite-textarea" 
                              style="min-height: 200px; font-family: monospace; font-size: 12px;"
                              placeholder="Personal notes, never sent to the AI...
">${KLITE_RPMod.escapeHtml(personal)}</textarea>
                    
                    <div class="klite-info klite-mt">
                        <span id="personal-status">Ready</span> • 
                        <span id="personal-tokens">${personalTokenCount} tokens</span> • 
                        Auto-saved
                    </div>
                    
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('📥 Import', 'secondary', 'import-personal')}
                        ${t.button('📤 Export', 'secondary', 'export-personal')}
                        ${t.button('🗑️ Clear', 'danger', 'clear-personal')}
                    </div>`
                )}
                
                <!-- Author's Note Section -->
                ${t.section('✍️ Author\'s Note',
                    `<div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <label style="font-weight: bold;">Author\'s Note:</label>
                            <span style="font-size: 11px; color: var(--muted);">${authorTokenCount} tokens • ${authorWordCount} words</span>
                        </div>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Guidance text injected into AI context during generation</div>
                    </div>
                    <textarea id="author-notes" class="klite-textarea" 
                              style="min-height: 200px; font-family: monospace; font-size: 12px;"
                              placeholder="Author's Notes for the AI...">${KLITE_RPMod.escapeHtml(author)}</textarea>
                    
                    <div class="klite-info klite-mt">
                        <span id="author-status">Ready</span> • 
                        <span id="author-tokens">${authorTokenCount} tokens</span> • 
                        Auto-saved
                    </div>`
                )}
                
                <!-- Injection Settings -->
                ${t.section('⚙️ Injection Settings',
                    `<div class="klite-control-group">
                        
                        <!-- Mode-Specific Injection Info -->
                        <div class="klite-info" style="margin-bottom: 5px;">
                            <strong>Current Mode: ${currentMode}</strong>
                        </div>
                        <div class="klite-info" style="margin-bottom: 10px;">
                            <span style="font-size: 11px; color: var(--muted);">
                                ${this.getModeInjectionInfo(currentMode)}
                            </span>
                        </div>
                        
                        <!-- Injection Depth -->
                        <label>Injection Depth:</label>
                        <select id="author-depth" class="klite-input" style="margin-bottom: 15px;">
                            <option value="0" ${injectionDepth === 0 ? 'selected' : ''}>Immediate (0) - Very end of context</option>
                            <option value="80" ${injectionDepth === 80 ? 'selected' : ''}>Very Strong (80) - Near end</option>
                            <option value="160" ${injectionDepth === 160 ? 'selected' : ''}>Strong (160) - Strong influence</option>
                            <option value="240" ${injectionDepth === 240 ? 'selected' : ''}>Medium-Strong (240) - Above average</option>
                            <option value="320" ${injectionDepth === 320 ? 'selected' : ''}>Medium (320) - Balanced (Recommended)</option>
                            <option value="400" ${injectionDepth === 400 ? 'selected' : ''}>Medium-Weak (400) - Below average</option>
                            <option value="480" ${injectionDepth === 480 ? 'selected' : ''}>Weak (480) - Background guidance</option>
                            <option value="640" ${injectionDepth === 640 ? 'selected' : ''}>Very Weak (640) - Minimal influence</option>
                            <option value="800" ${injectionDepth === 800 ? 'selected' : ''}>Ultra Weak (800) - Subtle hints</option>
                            <option value="-1" ${injectionDepth === -1 ? 'selected' : ''}>Auto-Detect - Smart boundary detection</option>
                        </select>
                        
                        <!-- Smart Injection Options -->
                        ${injectionDepth === -1 ? `
                            <div class="klite-control-group" style="background: var(--bg3); padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                                <h4 style="margin-top: 0;">🧠 Smart Injection Settings</h4>
                                
                                ${t.checkbox('author-smart-boundaries', 'Use Dialogue Boundaries (RP/Chat modes)', true)}
                                ${t.checkbox('author-smart-paragraphs', 'Respect Paragraph Breaks (Story mode)', true)}
                                ${t.checkbox('author-smart-fallback', 'Fallback to Token Depth if No Boundary Found', true)}
                                
                                <div class="klite-mt">
                                    <label>Fallback Depth:</label>
                                    <select id="author-smart-fallback-depth" class="klite-input">
                                        <option value="320" selected>Medium (320)</option>
                                        <option value="160">Strong (160)</option>
                                        <option value="480">Weak (480)</option>
                                    </select>
                                </div>
                                
                                <div class="klite-info klite-mt">
                                    <strong>Smart Injection:</strong><br>
                                    <span style="font-size: 11px; color: var(--muted);">
                                        • <strong>RP/Chat:</strong> Finds gaps between character messages<br>
                                        • <strong>Story:</strong> Inserts at paragraph boundaries<br>
                                        • <strong>Adventure:</strong> Places after "You" actions<br>
                                        • Falls back to token depth if no good boundary found
                                    </span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="klite-buttons-fill">
                            ${t.button('🔧 Template', '', 'toggle-notes-advanced')}
                            ${t.button('🗑️ Clear', 'danger', 'clear-author')}
                        </div>
                    </div>`
                )}
                
                <!-- Advanced Template System -->
                ${this.showAdvanced ? `
                    ${t.section('🏷️ Author\'s Note Template',
                        `<div class="klite-control-group">
                            <label>Template Format:</label>
                            <input id="author-template" class="klite-input" 
                                   value="${KLITE_RPMod.escapeHtml(authorTemplate)}" 
                                   placeholder="<|>" style="margin-bottom: 10px;">
                            <div class="klite-muted" style="margin-bottom: 15px; font-size: 11px;">
                                Use &lt;|&gt; where the note should be inserted. Example: "[Style: &lt;|&gt;]"
                            </div>
                        </div>`
                    )}
                ` : ''}
            `;
        },
        
        init() {
            // Load personal notes from IndexedDB first
            this.loadPersonalNotes().then(() => {
                setTimeout(() => {
                    this.setupPersonalNotes();
                    this.setupAuthorNotes();
                    this.setupInjectionSettings();
                    this.setupTemplateSystem();
                }, 100);
            });
        },
        
        async loadPersonalNotes() {
            if (!window.indexeddb_load) {
                throw new Error('IndexedDB not available. Personal notes require KoboldAI Lite v257+');
            }
            this.personalNotes = await window.indexeddb_load('klite_personal_notes', '');
            KLITE_RPMod.log('panels', `Loaded personal notes from IndexedDB: ${this.personalNotes.length} chars`);
        },
        
        async savePersonalNotes() {
            if (!window.indexeddb_save) {
                throw new Error('IndexedDB not available. Personal notes require KoboldAI Lite v257+');
            }
            await window.indexeddb_save('klite_personal_notes', this.personalNotes);
            KLITE_RPMod.log('panels', `Saved personal notes to IndexedDB: ${this.personalNotes.length} chars`);
        },
        
        setupPersonalNotes() {
            const textarea = document.getElementById('personal-notes');
            if (textarea) {
                // Set initial value from loaded data
                textarea.value = this.personalNotes;
                
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    this.personalNotes = value;
                    
                    // Update statistics
                    const wordCount = value.split(/\s+/).filter(w => w.length > 0).length;
                    const tokenCount = Math.ceil(value.length / 4);
                    document.getElementById('personal-tokens').textContent = tokenCount + ' tokens';
                    document.getElementById('personal-status').textContent = '✓ Saving...';
                    
                    // Debounced save to IndexedDB
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(async () => {
                        await this.savePersonalNotes();
                        document.getElementById('personal-status').textContent = 'Ready';
                    }, 1000);
                });
            }
        },
        
        setupAuthorNotes() {
            const textarea = document.getElementById('author-notes');
            if (textarea) {
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    window.current_anote = value;
                    
                    // Sync with Lite UI
                    const liteField = document.getElementById('anotetext');
                    if (liteField) liteField.value = value;
                    
                    // Update statistics
                    const wordCount = value.split(/\s+/).filter(w => w.length > 0).length;
                    const tokenCount = Math.ceil(value.length / 4);
                    document.getElementById('author-tokens').textContent = tokenCount + ' tokens';
                    document.getElementById('author-status').textContent = '✓ Saved';
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        window.autosave?.();
                        document.getElementById('author-status').textContent = 'Ready';
                    }, 1000);
                });
            }
        },
        
        setupInjectionSettings() {
            // Injection depth
            const depthSelect = document.getElementById('author-depth');
            if (depthSelect) {
                if (typeof window.anote_strength !== 'undefined') {
                    depthSelect.value = window.anote_strength;
                }
                
                depthSelect.addEventListener('change', e => {
                    const newDepth = parseInt(e.target.value);
                    window.anote_strength = newDepth;
                    
                    // Sync with Lite UI
                    const liteField = document.getElementById('anotedepth');
                    if (liteField) liteField.value = newDepth;
                    
                    window.save_settings?.();
                    this.refresh(); // Refresh to show/hide smart injection options
                    
                    KLITE_RPMod.log('panels', `Author's note injection depth changed to: ${newDepth}`);
                });
            }
            
            // Smart injection checkboxes
            const smartBoundaries = document.getElementById('author-smart-boundaries');
            const smartParagraphs = document.getElementById('author-smart-paragraphs');
            const smartFallback = document.getElementById('author-smart-fallback');
            const fallbackDepth = document.getElementById('author-smart-fallback-depth');
            
            [smartBoundaries, smartParagraphs, smartFallback].forEach(checkbox => {
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        this.saveSmartInjectionSettings();
                    });
                }
            });
            
            if (fallbackDepth) {
                fallbackDepth.addEventListener('change', () => {
                    this.saveSmartInjectionSettings();
                });
            }
        },
        
        setupTemplateSystem() {
            const templateInput = document.getElementById('author-template');
            if (templateInput) {
                if (window.current_anotetemplate) {
                    templateInput.value = window.current_anotetemplate;
                }
                
                templateInput.addEventListener('change', e => {
                    window.current_anotetemplate = e.target.value;
                    
                    // Sync with Lite UI
                    const liteField = document.getElementById('anotetemplate');
                    if (liteField) liteField.value = e.target.value;
                    
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `Author's note template changed to: ${e.target.value}`);
                });
            }
        },
        
        detectStoryMode() {
            // Try to detect current mode from KoboldAI Lite settings
            if (window.adventure) return 'Adventure';
            if (window.localsettings?.chatmode) return 'Chat/RP';
            return 'Story';
        },
        
        getModeInjectionInfo(mode) {
            switch (mode) {
                case 'Story':
                    return 'Story mode: Direct token-based injection. Author\'s note inserted at exact token depth.';
                case 'Chat/RP':
                    return 'RP mode: Smart boundary detection available. Can find gaps between character messages.';
                case 'Adventure':
                    return 'Adventure mode: Places after "You" actions when using smart detection.';
                default:
                    return 'Mixed mode: Injection behavior depends on current scene type.';
            }
        },
        
        saveSmartInjectionSettings() {
            const settings = {
                boundaries: document.getElementById('author-smart-boundaries')?.checked || false,
                paragraphs: document.getElementById('author-smart-paragraphs')?.checked || false,
                fallback: document.getElementById('author-smart-fallback')?.checked || false,
                fallbackDepth: parseInt(document.getElementById('author-smart-fallback-depth')?.value || 320)
            };
            
            // Store in localsettings
            if (!window.localsettings) window.localsettings = {};
            window.localsettings.smart_injection = settings;
            window.save_settings?.();
            
            KLITE_RPMod.log('panels', 'Smart injection settings saved:', settings);
        },
        
        templates: {
            basic: '<|>',
            style: '[Style: <|>]',
            character: '[{{char}} should <|>]',
            mood: '[Set the mood to be <|>]'
        },
        
        applyTemplate(templateKey) {
            const template = this.templates[templateKey];
            if (!template) return;
            
            const selectedMode = document.querySelector('input[name="notes-template-mode"]:checked')?.value || 'replace';
            const currentNote = window.current_anote || '';
            
            let newNote;
            if (selectedMode === 'append') {
                newNote = currentNote + (currentNote.length > 0 ? '\\n' : '') + template;
            } else {
                newNote = template;
            }
            
            const textarea = document.getElementById('author-notes');
            if (textarea) {
                textarea.value = newNote;
                textarea.dispatchEvent(new Event('input'));
            }
            
            // Applied ${templateKey} template (${selectedMode} mode)
        },
        
        actions: {
            'toggle-notes-advanced': () => {
                KLITE_RPMod.panels.NOTES.showAdvanced = !KLITE_RPMod.panels.NOTES.showAdvanced;
                KLITE_RPMod.panels.NOTES.refresh();
            },
            
            'clear-personal': async () => {
                const panel = KLITE_RPMod.panels.NOTES;
                const current = panel.personalNotes || '';
                if (current.length === 0) {
                    // Personal notes are already empty
                    return;
                }
                
                if (confirm(`Clear all personal notes? This will delete ${current.length} characters.`)) {
                    panel.personalNotes = '';
                    await panel.savePersonalNotes();
                    
                    const textarea = document.getElementById('personal-notes');
                    if (textarea) {
                        textarea.value = '';
                        textarea.dispatchEvent(new Event('input'));
                    }
                    // Personal notes cleared
                }
            },
            
            'clear-author': () => {
                const current = window.current_anote || '';
                if (current.length === 0) {
                    // Author's note is already empty
                    return;
                }
                
                if (confirm(`Clear author's note? This will delete ${current.length} characters.`)) {
                    const textarea = document.getElementById('author-notes');
                    if (textarea) {
                        textarea.value = '';
                        textarea.dispatchEvent(new Event('input'));
                    }
                    // Author's note cleared
                }
            },
            
            'export-personal': () => {
                const panel = KLITE_RPMod.panels.NOTES;
                const notes = panel?.personalNotes || '';
                if (notes.length === 0) {
                    // No personal notes to export
                    return;
                }
                
                const data = {
                    version: '1.0',
                    exported: new Date().toISOString(),
                    type: 'personal_notes',
                    content: notes
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `personal-notes-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                // Personal notes exported
            },
            
            'import-personal': () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,.txt';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                let content;
                                if (file.name.endsWith('.json')) {
                                    const data = JSON.parse(e.target.result);
                                    content = data.content || e.target.result;
                                } else {
                                    content = e.target.result;
                                }
                                
                                const panel = KLITE_RPMod.panels.NOTES;
                                const currentNotes = panel?.personalNotes || '';
                                const mode = currentNotes.length > 0 ? 
                                    confirm('Append to existing notes? (Cancel to replace)') ? 'append' : 'replace' :
                                    'replace';
                                
                                let newNotes;
                                if (mode === 'append') {
                                    newNotes = currentNotes + (currentNotes.length > 0 ? '\\n\\n' : '') + content;
                                } else {
                                    newNotes = content;
                                }
                                
                                const textarea = document.getElementById('personal-notes');
                                if (textarea) {
                                    textarea.value = newNotes;
                                    textarea.dispatchEvent(new Event('input'));
                                }
                                
                                // Personal notes imported (${mode} mode)
                                
                            } catch (error) {
                                // Error importing notes: ' + error.message
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            },
            
            'template-basic': () => KLITE_RPMod.panels.NOTES.applyTemplate('basic'),
            'template-style': () => KLITE_RPMod.panels.NOTES.applyTemplate('style'),
            'template-character': () => KLITE_RPMod.panels.NOTES.applyTemplate('character'),
            'template-mood': () => KLITE_RPMod.panels.NOTES.applyTemplate('mood')
        },
        
        refresh() {
            KLITE_RPMod.loadPanel('right', 'NOTES');
        }
    };
    
    // CHARS PANEL
    KLITE_RPMod.panels.CHARS = {
        fileInput: null,
        currentFilter: '',
        currentSort: 'name-asc',
        currentView: 'grid',
        tagFilter: '',
        starFilter: '',
        
        render() {
            const charCount = KLITE_RPMod.characters.length;
            const filteredChars = this.getFilteredCharacters();
            
            return `
                ${t.section('Import Characters',
                    `<div class="klite-upload-zone" id="char-upload-zone" style="height: 60px; padding: 8px;">
                        Drop character-file here or<br>click here to import files.
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Export All', 'secondary', 'export-chars')}
                        ${t.button('Clear All', 'danger', 'clear-chars')}
                    </div>`
                )}
                
                ${t.section('Character Management',
                    `<div class="klite-char-controls">
                        <input type="text" id="char-search" placeholder="Search characters..." 
                               value="${this.currentFilter}" class="klite-input" style="width: 100%; margin-bottom: 10px;">
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: block;">Filter by:</label>
                                <select id="char-tag-filter" class="klite-select" style="width: 100%;">
                                    <option value="">All Tags</option>
                                    ${this.getUniqueTags().map(tag => 
                                        `<option value="${tag}" ${this.tagFilter === tag ? 'selected' : ''}>${tag}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: block;">&nbsp;</label>
                                <select id="char-star-filter" class="klite-select" style="width: 100%;">
                                    <option value="">Any Rating</option>
                                    <option value="unrated">Unrated</option>
                                    <option value="0">0 Stars</option>
                                    <option value="1">1 Star</option>
                                    <option value="2">2 Stars</option>
                                    <option value="3">3 Stars</option>
                                    <option value="4">4 Stars</option>
                                    <option value="5">5 Stars</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: block;">Sort by:</label>
                                <select id="char-sort" class="klite-select" style="width: 100%;">
                                    <option value="name-asc" ${this.currentSort === 'name-asc' ? 'selected' : ''}>Name (A-Z)</option>
                                    <option value="name-desc" ${this.currentSort === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
                                    <option value="created" ${this.currentSort === 'created' ? 'selected' : ''}>Import Date</option>
                                    <option value="talkativeness" ${this.currentSort === 'talkativeness' ? 'selected' : ''}>Talkativeness</option>
                                    <option value="rating" ${this.currentSort === 'rating' ? 'selected' : ''}>Rating</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: block;">&nbsp;</label>
                                <select id="char-view" class="klite-select" style="width: 100%;">
                                    <option value="overview" ${this.currentView === 'overview' ? 'selected' : ''}>Grid Overview (3 per row)</option>
                                    <option value="grid" ${this.currentView === 'grid' ? 'selected' : ''}>Grid View (2 per row)</option>
                                    <option value="detail" ${this.currentView === 'detail' ? 'selected' : ''}>Detail View (1 per row)</option>
                                    <option value="list" ${this.currentView === 'list' ? 'selected' : ''}>List View (compact)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="klite-muted" style="font-size: 11px;">
                            ${filteredChars.length} of ${charCount} characters shown
                        </div>
                    </div>`
                )}
                
                ${t.section('Character Gallery',
                    `<div class="klite-character-${this.currentView}" id="char-gallery">
                        ${this.renderCharacters()}
                    </div>`
                )}
            `;
        },
        
        init() {
            if (!this.fileInput) {
                this.fileInput = document.createElement('input');
                this.fileInput.type = 'file';
                this.fileInput.accept = '.png,.webp,.json';
                this.fileInput.multiple = true;
                this.fileInput.style.display = 'none';
                document.body.appendChild(this.fileInput);
                
                this.fileInput.onchange = e => this.handleFiles(e.target.files);
            }
            
            // Setup search functionality
            const searchInput = document.getElementById('char-search');
            if (searchInput) {
                searchInput.addEventListener('input', e => {
                    this.currentFilter = e.target.value;
                    this.refreshGallery();
                });
            }
            
            // Setup filter handlers
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                tagFilter.addEventListener('change', e => {
                    this.tagFilter = e.target.value;
                    this.refreshGallery();
                });
            }
            
            const starFilter = document.getElementById('char-star-filter');
            if (starFilter) {
                starFilter.addEventListener('change', e => {
                    this.starFilter = e.target.value;
                    this.refreshGallery();
                });
            }
            
            // Setup sort and view change handlers
            const sortSelect = document.getElementById('char-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', e => {
                    this.currentSort = e.target.value;
                    this.refreshGallery();
                });
            }
            
            const viewSelect = document.getElementById('char-view');
            if (viewSelect) {
                viewSelect.addEventListener('change', e => {
                    this.currentView = e.target.value;
                    this.refreshGallery();
                });
            }
            
            // Setup drag and drop
            const uploadZone = document.getElementById('char-upload-zone');
            if (uploadZone) {
                uploadZone.addEventListener('dragover', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.add('dragover');
                });
                
                uploadZone.addEventListener('dragleave', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.remove('dragover');
                });
                
                uploadZone.addEventListener('drop', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.remove('dragover');
                    this.handleFiles(e.dataTransfer.files);
                });
                
                uploadZone.addEventListener('click', () => {
                    this.fileInput.click();
                });
            }
        },
        
        actions: {
            'import-chars': () => KLITE_RPMod.panels.CHARS.fileInput.click(),
            'clear-chars': () => {
                if (confirm('Delete all characters?')) {
                    KLITE_RPMod.characters = [];
                    KLITE_RPMod.saveCharacters();
                    KLITE_RPMod.panels.CHARS.refresh();
                    // All characters cleared
                }
            },
            'export-chars': () => KLITE_RPMod.panels.CHARS.exportCharacters(),
            'load-char': (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char) KLITE_RPMod.panels.CHARS.loadCharacter(char);
            },
            'view-char': (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                KLITE_RPMod.log('chars', charId);
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                KLITE_RPMod.log('chars', char);
                if (char) KLITE_RPMod.panels.CHARS.showCharacterFullscreen(char);
            },
            'rate-char': (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const rating = parseInt(e.target.dataset.rating);
                KLITE_RPMod.panels.CHARS.updateCharacterRating(charId, rating);
            },
            'delete-char': (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                if (confirm('Delete this character?')) {
                    KLITE_RPMod.panels.CHARS.deleteCharacter(charId);
                }
            },
            // New modal actions
            'load-char-scenario': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char) KLITE_RPMod.panels.CHARS.loadAsScenario(char);
            },
            'add-char-worldinfo': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char) KLITE_RPMod.panels.CHARS.addToWorldInfo(char);
            },
            'export-char-json': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char) KLITE_RPMod.panels.CHARS.exportCharacterJSON(char);
            },
            'export-char-png': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char) KLITE_RPMod.panels.CHARS.exportCharacterPNG(char);
            },
            'delete-char-modal': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char && confirm(`Delete "${char.name}"? This cannot be undone.`)) {
                    KLITE_RPMod.panels.CHARS.deleteCharacter(charId);
                    document.getElementById('char-modal-' + charId).remove();
                }
            }
        },
        
        getFilteredCharacters() {
            let filtered = [...KLITE_RPMod.characters];
            
            // Apply search filter
            if (this.currentFilter) {
                const filter = this.currentFilter.toLowerCase();
                filtered = filtered.filter(char => 
                    char.name.toLowerCase().includes(filter) ||
                    char.description.toLowerCase().includes(filter) ||
                    char.personality.toLowerCase().includes(filter) ||
                    char.creator.toLowerCase().includes(filter) ||
                    char.keywords.some(k => k.includes(filter))
                );
            }
            
            // Apply tag filter
            if (this.tagFilter) {
                filtered = filtered.filter(char => 
                    char.tags && char.tags.includes(this.tagFilter)
                );
            }
            
            // Apply star filter
            if (this.starFilter) {
                if (this.starFilter === 'unrated') {
                    filtered = filtered.filter(char => !char.rating || char.rating === 0);
                } else {
                    const rating = parseInt(this.starFilter);
                    filtered = filtered.filter(char => char.rating === rating);
                }
            }
            
            // Apply sorting
            filtered.sort((a, b) => {
                switch (this.currentSort) {
                    case 'name-asc':
                        return a.name.localeCompare(b.name);
                    case 'name-desc':
                        return b.name.localeCompare(a.name);
                    case 'created':
                        return (b.created || 0) - (a.created || 0);
                    case 'talkativeness':
                        return (b.talkativeness || 0) - (a.talkativeness || 0);
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    default:
                        return 0;
                }
            });
            
            return filtered;
        },
        
        getUniqueTags() {
            const allTags = new Set();
            KLITE_RPMod.characters.forEach(char => {
                if (char.tags && Array.isArray(char.tags)) {
                    char.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            allTags.add(tag.trim());
                        }
                    });
                }
            });
            return Array.from(allTags).sort();
        },
        
        renderCharacters() {
            const characters = this.getFilteredCharacters();
            
            if (characters.length === 0) {
                return '<div class="klite-center klite-muted">No characters found</div>';
            }
            
            switch (this.currentView) {
                case 'overview':
                    return characters.map(char => this.renderCharacterOverviewItem(char)).join('');
                case 'list':
                    return characters.map(char => this.renderCharacterListItem(char)).join('');
                case 'detail':
                    return characters.map(char => this.renderCharacterDetailItem(char)).join('');
                default: // grid
                    return characters.map(char => this.renderCharacterCard(char)).join('');
            }
        },
        
        renderCharacterOverviewItem(char) {
            return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg2); cursor: pointer; text-align: center;" 
                     data-char-id="${char.id}" data-action="view-char">
                    ${char.image ? `
                        <div style="width: 60px; height: 60px; border-radius: 30px; overflow: hidden; margin-bottom: 6px; border: 1px solid var(--border);">
                            <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 60px; height: 60px; border-radius: 30px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                            <span style="font-size: 24px;">${char.name.charAt(0)}</span>
                        </div>
                    `}
                    <div style="font-size: 12px; font-weight: bold; color: var(--text); line-height: 1.2; word-wrap: break-word; max-width: 100%;">
                        ${char.name.length > 12 ? char.name.substring(0, 12) + '...' : char.name}
                    </div>
                </div>
            `;
        },
        
        renderCharacterCard(char) {
            const rating = char.rating || 0;
            
            return `
                <div class="klite-char-card" data-char-id="${char.id}" data-action="view-char" style="cursor: pointer;">
                    <div class="klite-char-image">
                        ${char.image ? `<img src="${char.image}" alt="${char.name}">` : '<div class="klite-char-placeholder">👤</div>'}
                    </div>
                    <div class="klite-char-name">${char.name}</div>
                    <div class="klite-char-creator">by ${char.creator || 'Unknown'}</div>
                    <div class="klite-char-stats" style="text-align: center; margin-top: 8px;">
                        <select class="klite-select" style="font-size: 10px; padding: 2px 4px;" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)" onclick="event.stopPropagation();">
                            <option value="0" ${rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                            <option value="1" ${rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                            <option value="2" ${rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                            <option value="3" ${rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                            <option value="4" ${rating === 4 ? 'selected' : ''}>★★★★☆</option>
                            <option value="5" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                        </select>
                    </div>
                </div>
            `;
        },
        
        renderCharacterListItem(char) {
            const rating = char.rating || 0;
            
            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2); cursor: pointer;" 
                     data-char-id="${char.id}" data-action="view-char">
                    ${char.image ? `
                        <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                            <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                        </div>
                    `}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; color: var(--text); margin-bottom: 2px;">${char.name}</div>
                        <div style="font-size: 10px; color: var(--muted); display: flex; gap: 8px; align-items: center;">
                            <span>by ${char.creator || 'Unknown'}</span>
                            <select class="klite-select" style="font-size: 9px; padding: 2px 4px;" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)" onclick="event.stopPropagation();">
                                <option value="0" ${rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                                <option value="1" ${rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                                <option value="2" ${rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                                <option value="3" ${rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                                <option value="4" ${rating === 4 ? 'selected' : ''}>★★★★☆</option>
                                <option value="5" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderCharacterDetailItem(char) {
            const rating = char.rating || 0;
            const tags = char.tags && char.tags.length > 0 ? char.tags.map(tag => `<span class="klite-tag">${tag}</span>`).join('') : '<span class="klite-tag-empty">No tags</span>';
            const talkLevel = char.talkativeness >= 80 ? 'Very Talkative' : char.talkativeness >= 40 ? 'Moderate' : 'Quiet';
            
            return `
                <div style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 8px; padding: 15px; background: var(--bg2);" data-char-id="${char.id}" data-action="view-char">
                    <div style="width: 100%; margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
                        ${char.image ? `<img src="${char.image}" alt="${char.name}" style="width: 100%; height: auto; display: block;">` : '<div style="width: 100%; height: 200px; background: var(--bg3); display: flex; align-items: center; justify-content: center; font-size: 48px;">👤</div>'}
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: var(--text); margin-bottom: 8px;">${char.name}</div>
                        <div style="margin-bottom: 12px;">
                            <select class="klite-select" style="margin: 0 auto;" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)">
                                <option value="0" ${rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                                <option value="1" ${rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                                <option value="2" ${rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                                <option value="3" ${rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                                <option value="4" ${rating === 4 ? 'selected' : ''}>★★★★☆</option>
                                <option value="5" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                            </select>
                        </div>
                        <div style="color: var(--muted); margin-bottom: 12px;">by ${char.creator || 'Unknown'}</div>
                        <div style="text-align: left; margin-bottom: 12px; color: var(--text); line-height: 1.4;">
                            ${(char.description || 'No description available').substring(0, 300)}${(char.description || '').length > 300 ? '...' : ''}
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--muted);">
                            <span>Talk: ${talkLevel} (${char.talkativeness || 0})</span>
                            <span>Keywords: ${char.keywords ? char.keywords.length : 0}</span>
                        </div>
                        <div style="margin-bottom: 15px;">${tags}</div>
                    </div>
                </div>
                <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
            `;
        },
        
        refreshGallery() {
            const gallery = document.getElementById('char-gallery');
            if (gallery) {
                gallery.className = `klite-character-${this.currentView}`;
                gallery.innerHTML = this.renderCharacters();
            }
        },
        
        refreshTagDropdown() {
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                const currentValue = tagFilter.value;
                const uniqueTags = this.getUniqueTags();
                tagFilter.innerHTML = `
                    <option value="">All Tags</option>
                    ${uniqueTags.map(tag => 
                        `<option value="${tag}" ${currentValue === tag ? 'selected' : ''}>${tag}</option>`
                    ).join('')}
                `;
            }
        },
        
        
        renderCharacterDataSection(title, content) {
            if (!content || content.trim() === '') return '';
            
            return `
                <div class="klite-char-modal-section">
                    <h3>${title}</h3>
                    <div class="klite-char-modal-text">${content}</div>
                </div>
            `;
        },
        
        updateCharacterRating(charId, rating) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (char) {
                char.rating = parseInt(rating);
                this.refreshGallery();
                KLITE_RPMod.saveCharacters();
                
                // Refresh fullscreen view if currently viewing this character
                const rightPanel = document.querySelector('div#content-right.klite-content');
                const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                if (backButton) {
                    this.showCharacterFullscreen(char);
                }
                
                // Updated ${char.name} rating to ${rating} stars
            }
        },
        
        addTag(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (char) {
                const tag = prompt('Enter new tag:');
                if (tag && tag.trim()) {
                    if (!char.tags) char.tags = [];
                    if (!char.tags.includes(tag.trim())) {
                        char.tags.push(tag.trim());
                        KLITE_RPMod.saveCharacters();
                        // Refresh fullscreen view if currently viewing this character
                        const rightPanel = document.querySelector('div#content-right.klite-content');
                        const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                        if (backButton) {
                            this.showCharacterFullscreen(char);
                        }
                        this.refreshTagDropdown();
                        // Added tag "${tag}" to ${char.name}
                    }
                }
            }
        },
        
        renderRatingStars(rating) {
            return Array(5).fill(0).map((_, i) => 
                `<span class="klite-star ${i < rating ? 'active' : ''}">★</span>`
            ).join('');
        },
        
        
        deleteCharacter(charId) {
            const index = KLITE_RPMod.characters.findIndex(c => c.id == charId);
            if (index !== -1) {
                const char = KLITE_RPMod.characters[index];
                KLITE_RPMod.characters.splice(index, 1);
                this.refreshGallery();
                KLITE_RPMod.saveCharacters();
                // Deleted ${char.name}
            }
        },
        
        exportCharacters() {
            KLITE_RPMod.exportCharactersToFile();
        },
        
        importWorldInfo(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const worldInfo = char.rawData?.data?.character_book?.entries || char.rawData?.character_book?.entries || [];
            if (worldInfo.length === 0) {
                // No World Info found in character
                return;
            }
            
            // Import to KoboldAI's World Info system
            worldInfo.forEach(entry => {
                if (window.wi_entries) {
                    window.wi_entries.push({
                        key: entry.keys?.join(', ') || char.name,
                        keysecondary: entry.secondary_keys?.join(', ') || '',
                        content: entry.content,
                        comment: `Imported from ${char.name}`,
                        folder: 'Characters',
                        selective: entry.selective || false,
                        constant: entry.constant || false
                    });
                }
            });
            
            // Imported ${worldInfo.length} World Info entries from ${char.name}
            
            // Close modal
            const modal = document.getElementById('char-modal-' + charId);
            if (modal) modal.remove();
        },
        
        async handleFiles(files) {
            KLITE_RPMod.log('panels', `Processing ${files.length} character files`);
            
            for (const file of files) {
                try {
                    KLITE_RPMod.log('panels', `Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
                    
                    if (file.name.endsWith('.json')) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        KLITE_RPMod.log('panels', `Parsed JSON character data:`, data);
                        this.addCharacter(this.normalizeCharacterData(data));
                    } else if (file.name.endsWith('.png')) {
                        await this.loadPNGFile(file);
                    } else if (file.name.endsWith('.webp')) {
                        await this.loadWEBPFile(file);
                    }
                } catch (err) {
                    KLITE_RPMod.error(`Failed to load file: ${file.name}`, err);
                    // Failed to load ${file.name}: ${err.message}
                }
            }
            this.refresh();
        },
        
        async loadPNGFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Extract tEXt chunks from PNG
                        const textChunks = this.extractPNGTextChunks(uint8Array);
                        let characterData = null;
                        
                        for (const chunk of textChunks) {
                            if (['chara', 'ccv2', 'ccv3', 'character'].includes(chunk.keyword.toLowerCase())) {
                                try {
                                    let jsonStr = chunk.text;
                                    // Try to decode from base64 first
                                    try {
                                        jsonStr = atob(chunk.text);
                                    } catch (e) {
                                        // Not base64, use as-is
                                    }
                                    
                                    const parsed = JSON.parse(jsonStr);
                                    characterData = this.normalizeCharacterData(parsed);
                                    KLITE_RPMod.log('panels', `Found character data in PNG chunk '${chunk.keyword}'`);
                                    break;
                                } catch (e) {
                                    KLITE_RPMod.log('panels', `Failed to parse chunk '${chunk.keyword}': ${e.message}`);
                                }
                            }
                        }
                        
                        if (characterData) {
                            // Read image as base64
                            const blob = new Blob([uint8Array], { type: 'image/png' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            reject(new Error('No character data found in PNG'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        },
        
        async loadWEBPFile(file) {
            // Similar to PNG but for WEBP EXIF data
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // For WEBP, check for EXIF data in the RIFF chunks
                        const characterData = this.extractWEBPCharacterData(uint8Array);
                        
                        if (characterData) {
                            const blob = new Blob([uint8Array], { type: 'image/webp' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            // Try loading as simple image
                            const imageReader = new FileReader();
                            imageReader.onload = () => {
                                this.addCharacter({
                                    name: file.name.replace(/\.webp$/, ''),
                                    description: 'Imported character',
                                    creator: 'Unknown',
                                    image: imageReader.result,
                                    originalFilename: file.name
                                });
                                resolve();
                            };
                            imageReader.readAsDataURL(file);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        },
        
        extractPNGTextChunks(uint8Array) {
            const chunks = [];
            let offset = 8; // Skip PNG signature
            
            while (offset < uint8Array.length - 8) {
                // Read chunk length
                const length = (uint8Array[offset] << 24) | 
                              (uint8Array[offset + 1] << 16) | 
                              (uint8Array[offset + 2] << 8) | 
                              uint8Array[offset + 3];
                
                // Read chunk type
                const type = String.fromCharCode(
                    uint8Array[offset + 4],
                    uint8Array[offset + 5],
                    uint8Array[offset + 6],
                    uint8Array[offset + 7]
                );
                
                if (type === 'tEXt' && length > 0) {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                    const nullIndex = chunkData.indexOf(0);
                    
                    if (nullIndex !== -1) {
                        const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex));
                        const text = String.fromCharCode(...chunkData.slice(nullIndex + 1));
                        chunks.push({ keyword, text });
                        KLITE_RPMod.log('panels', `Found PNG tEXt chunk: ${keyword} (${text.length} chars)`);
                    }
                }
                
                // End of PNG
                if (type === 'IEND') break;
                
                // Move to next chunk (length + type + data + CRC)
                offset += 8 + length + 4;
            }
            
            return chunks;
        },
        
        extractWEBPCharacterData(uint8Array) {
            // Basic WEBP RIFF header check
            const riff = String.fromCharCode(...uint8Array.slice(0, 4));
            const webp = String.fromCharCode(...uint8Array.slice(8, 12));
            
            if (riff !== 'RIFF' || webp !== 'WEBP') {
                return null;
            }
            
            // Look for EXIF chunk
            let offset = 12;
            while (offset < uint8Array.length - 8) {
                const chunkType = String.fromCharCode(...uint8Array.slice(offset, offset + 4));
                const chunkSize = (uint8Array[offset + 4]) | 
                                 (uint8Array[offset + 5] << 8) | 
                                 (uint8Array[offset + 6] << 16) | 
                                 (uint8Array[offset + 7] << 24);
                
                if (chunkType === 'EXIF') {
                    // Try to extract character data from EXIF
                    const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
                    // This is a simplified approach - real EXIF parsing is more complex
                    try {
                        const exifString = String.fromCharCode(...exifData);
                        const jsonMatch = exifString.match(/{[^}]+}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            return this.normalizeCharacterData(parsed);
                        }
                    } catch (e) {
                        // Failed to parse EXIF
                    }
                }
                
                offset += 8 + chunkSize;
                if (chunkSize % 2 === 1) offset++; // Padding
            }
            
            return null;
        },
        
        normalizeCharacterData(data) {
            KLITE_RPMod.log('panels', `Normalizing character data, spec: ${data.spec || 'v1'}`);
            
            let characterData;
            if (data.spec === 'chara_card_v2' || data.spec === 'chara_card_v3') {
                KLITE_RPMod.log('panels', 'Character card v2/v3 detected, extracting nested data');
                characterData = data.data;
            } else {
                KLITE_RPMod.log('panels', 'Character card v1 or direct format detected');
                characterData = data;
            }
            
            // Enhanced behavioral extraction from old source
            const normalized = {
                ...characterData,
                // Preserve original data for V3 export
                _originalData: data,
                _spec: data.spec || 'v1',
                
                // Enhanced behavioral analysis
                talkativeness: this.extractTalkativeness(characterData),
                keywords: this.extractCharacterKeywords(characterData),
                responseStyle: this.analyzeResponseStyle(characterData)
            };
            
            KLITE_RPMod.log('panels', `Enhanced character analysis - Talkativeness: ${normalized.talkativeness}, Keywords: ${normalized.keywords.length}, Style: ${JSON.stringify(normalized.responseStyle)}`);
            
            return normalized;
        },
        
        // Enhanced talkativeness extraction from old source (lines 488-539)
        extractTalkativeness(cardData) {
            let score = 50; // Default baseline
            
            // 1. Count constant lorebook entries (V2/V3 feature)
            if (cardData.character_book?.entries) {
                const entries = Array.isArray(cardData.character_book.entries) ? 
                    cardData.character_book.entries : Object.values(cardData.character_book.entries);
                
                const constantEntries = entries.filter(entry => entry.constant).length;
                score += constantEntries * 15; // More constant entries = more talkative
            }
            
            // 2. Analyze personality text (works for V1/V2/V3)
            const personalityText = (cardData.personality || '').toLowerCase();
            const descriptionText = (cardData.description || '').toLowerCase();
            const combinedText = personalityText + ' ' + descriptionText;
            
            // Talkative indicators
            const talkativeWords = [
                'talkative', 'chatty', 'outgoing', 'social', 'extroverted',
                'friendly', 'enthusiastic', 'expressive', 'vocal', 'outspoken',
                'gregarious', 'sociable', 'animated', 'lively'
            ];
            
            // Quiet indicators  
            const quietWords = [
                'quiet', 'shy', 'introverted', 'reserved', 'silent',
                'mysterious', 'stoic', 'withdrawn', 'antisocial', 'timid',
                'reclusive', 'taciturn', 'laconic'
            ];
            
            talkativeWords.forEach(word => {
                if (combinedText.includes(word)) score += 20;
            });
            
            quietWords.forEach(word => {
                if (combinedText.includes(word)) score -= 20;
            });
            
            // 3. Example dialogue length (V1/V2/V3 feature)
            const exampleLength = (cardData.mes_example || '').length;
            if (exampleLength > 800) score += 15;      // Long examples = talkative
            else if (exampleLength < 200) score -= 10; // Short examples = reserved
            
            // 4. First message length
            const firstMessageLength = (cardData.first_mes || '').length;
            if (firstMessageLength > 400) score += 10;
            else if (firstMessageLength < 100) score -= 5;
            
            return Math.max(10, Math.min(100, score));
        },
        
        // Enhanced keyword extraction from old source (lines 541-581)
        extractCharacterKeywords(cardData) {
            const keywords = new Set();
            
            // Add name variations
            const name = cardData.name || '';
            keywords.add(name.toLowerCase());
            
            // Add nickname if present
            if (cardData.nickname) {
                keywords.add(cardData.nickname.toLowerCase());
            }
            
            // Extract from character book (V2/V3)
            if (cardData.character_book?.entries) {
                const entries = Array.isArray(cardData.character_book.entries) ? 
                    cardData.character_book.entries : Object.values(cardData.character_book.entries);
                
                entries.forEach(entry => {
                    // Handle both array and string key formats
                    const keys = Array.isArray(entry.key) ? entry.key : 
                                typeof entry.key === 'string' ? entry.key.split(',') : 
                                entry.keys || [];
                    
                    keys.forEach(key => {
                        if (key && typeof key === 'string') {
                            keywords.add(key.trim().toLowerCase());
                        }
                    });
                });
            }
            
            // Extract from personality (key traits)
            const personality = cardData.personality || '';
            const traits = personality.match(/\b\w{4,}\b/g) || [];
            traits.slice(0, 5).forEach(trait => {
                keywords.add(trait.toLowerCase());
            });
            
            return Array.from(keywords);
        },
        
        // Enhanced response style analysis from old source (lines 583-629)
        analyzeResponseStyle(cardData) {
            const personality = (cardData.personality || '').toLowerCase();
            const description = (cardData.description || '').toLowerCase();
            const examples = (cardData.mes_example || '').toLowerCase();
            const combined = personality + ' ' + description + ' ' + examples;
            
            const style = {
                formality: 'casual',
                verbosity: 'medium',
                emotional: 'balanced',
                initiative: 'reactive'
            };
            
            // Analyze formality
            if (combined.includes('proper') || combined.includes('formal') || 
                combined.includes('polite') || combined.includes('courteous')) {
                style.formality = 'formal';
            }
            
            // Analyze verbosity
            const avgExampleLength = (cardData.mes_example || '').length;
            if (avgExampleLength > 600) style.verbosity = 'verbose';
            else if (avgExampleLength < 200) style.verbosity = 'brief';
            
            // Analyze emotional expression
            const emotionalWords = ['emotional', 'expressive', 'passionate', 'dramatic'];
            const reservedWords = ['stoic', 'calm', 'controlled', 'composed'];
            
            if (emotionalWords.some(word => combined.includes(word))) {
                style.emotional = 'expressive';
            } else if (reservedWords.some(word => combined.includes(word))) {
                style.emotional = 'reserved';
            }
            
            // Analyze initiative
            const proactiveWords = ['leader', 'assertive', 'dominant', 'commanding'];
            const passiveWords = ['follower', 'submissive', 'passive', 'obedient'];
            
            if (proactiveWords.some(word => combined.includes(word))) {
                style.initiative = 'proactive';
            } else if (passiveWords.some(word => combined.includes(word))) {
                style.initiative = 'passive';
            }
            
            return style;
        },
        
        addCharacter(data) {
            const now = Date.now();
            const char = {
                id: now + Math.random(),
                name: data.name || 'Unknown',
                description: data.description || '',
                personality: data.personality || '',
                scenario: data.scenario || '',
                first_mes: data.first_mes || '',
                mes_example: data.mes_example || '',
                creator: data.creator || 'Unknown',
                image: data.image || data.avatar || null,
                rawData: data,
                
                // Timestamps
                created: now,
                lastUsed: null,
                lastModified: now,
                
                // Enhanced metadata
                version: data.spec || 'v1',
                category: data.category || 'General',
                
                // Rating system
                rating: {
                    overall: 0,
                    creativity: 0,
                    consistency: 0,
                    entertainment: 0,
                    userRating: 0,
                    totalRatings: 0
                },
                
                // Usage statistics
                stats: {
                    timesUsed: 0,
                    totalMessages: 0,
                    averageSessionLength: 0,
                    lastSessionDuration: 0
                },
                
                // Enhanced keywords system
                keywords: this.extractKeywords(data),
                
                // For GROUP panel
                talkativeness: this.extractTalkativeness(data),
                
                // Advanced character features
                traits: this.extractTraits(data),
                relationships: [],
                preferences: {
                    genres: this.extractGenres(data),
                    themes: this.extractThemes(data),
                    contentRating: this.extractContentRating(data)
                },
                
                // Custom user fields
                userNotes: '',
                userTags: [],
                isFavorite: false,
                isArchived: false,
                
                // Character card extensions
                extensions: data.extensions || {},
                alternateGreetings: data.alternate_greetings || [],
                worldInfo: data.character_book || null,
                
                // Import metadata
                importSource: 'manual',
                importDate: now,
                originalFilename: data.originalFilename || null
            };
            
            KLITE_RPMod.characters.push(char);
            KLITE_RPMod.saveCharacters();
            // Added character: ${char.name}
        },
        
        extractTalkativeness(data) {
            const text = ((data.personality || '') + ' ' + (data.description || '')).toLowerCase();
            let score = 50;
            
            const talkativeWords = ['talkative', 'chatty', 'outgoing', 'verbose', 'loquacious'];
            const quietWords = ['quiet', 'shy', 'reserved', 'taciturn', 'silent'];
            
            talkativeWords.forEach(word => {
                if (text.includes(word)) score += 15;
            });
            
            quietWords.forEach(word => {
                if (text.includes(word)) score -= 15;
            });
            
            return Math.max(10, Math.min(100, score));
        },
        
        extractKeywords(data) {
            const keywords = [data.name?.toLowerCase()].filter(Boolean);
            
            // Add tags
            if (data.tags && Array.isArray(data.tags)) {
                keywords.push(...data.tags.map(t => t.toLowerCase()));
            }
            
            // Extract keywords from description and personality
            const text = ((data.description || '') + ' ' + (data.personality || '')).toLowerCase();
            const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
            
            const words = text.match(/\b\w{3,}\b/g) || [];
            const significantWords = words.filter(word => 
                !commonWords.includes(word) && 
                word.length >= 3 && 
                !keywords.includes(word)
            );
            
            // Add most frequent significant words
            const wordFreq = {};
            significantWords.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            const topWords = Object.entries(wordFreq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([word]) => word);
            
            keywords.push(...topWords);
            
            return [...new Set(keywords)]; // Remove duplicates
        },
        
        extractTraits(data) {
            const text = ((data.personality || '') + ' ' + (data.description || '')).toLowerCase();
            const traits = [];
            
            // Personality traits mapping
            const traitKeywords = {
                'confident': ['confident', 'bold', 'assertive', 'self-assured'],
                'shy': ['shy', 'timid', 'bashful', 'reserved', 'introverted'],
                'friendly': ['friendly', 'warm', 'kind', 'welcoming', 'approachable'],
                'serious': ['serious', 'stern', 'formal', 'businesslike'],
                'playful': ['playful', 'mischievous', 'teasing', 'fun-loving'],
                'intelligent': ['intelligent', 'smart', 'clever', 'brilliant', 'wise'],
                'caring': ['caring', 'compassionate', 'nurturing', 'empathetic'],
                'mysterious': ['mysterious', 'enigmatic', 'secretive', 'cryptic'],
                'energetic': ['energetic', 'enthusiastic', 'vibrant', 'lively'],
                'calm': ['calm', 'peaceful', 'serene', 'tranquil', 'composed']
            };
            
            Object.entries(traitKeywords).forEach(([trait, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    traits.push(trait);
                }
            });
            
            return traits;
        },
        
        extractGenres(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            const genres = [];
            
            const genreKeywords = {
                'fantasy': ['magic', 'fantasy', 'wizard', 'dragon', 'medieval', 'kingdom', 'spell', 'enchant'],
                'sci-fi': ['space', 'robot', 'alien', 'future', 'technology', 'cyberpunk', 'android', 'laser'],
                'romance': ['love', 'romance', 'romantic', 'heart', 'kiss', 'date', 'relationship'],
                'adventure': ['adventure', 'quest', 'journey', 'explore', 'treasure', 'danger'],
                'horror': ['horror', 'scary', 'dark', 'fear', 'nightmare', 'ghost', 'demon'],
                'comedy': ['funny', 'humor', 'joke', 'laugh', 'comedy', 'amusing', 'silly'],
                'slice-of-life': ['daily', 'normal', 'everyday', 'routine', 'ordinary', 'casual'],
                'drama': ['drama', 'emotional', 'tragic', 'conflict', 'tension']
            };
            
            Object.entries(genreKeywords).forEach(([genre, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    genres.push(genre);
                }
            });
            
            return genres.length > 0 ? genres : ['general'];
        },
        
        extractThemes(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            const themes = [];
            
            const themeKeywords = {
                'friendship': ['friend', 'friendship', 'companion', 'buddy', 'pal'],
                'family': ['family', 'parent', 'sibling', 'mother', 'father', 'sister', 'brother'],
                'school': ['school', 'student', 'teacher', 'class', 'university', 'college'],
                'work': ['work', 'job', 'office', 'business', 'career', 'professional'],
                'supernatural': ['supernatural', 'paranormal', 'spirit', 'ghost', 'magic', 'mystical'],
                'historical': ['historical', 'history', 'past', 'ancient', 'period', 'era'],
                'modern': ['modern', 'contemporary', 'current', 'present', 'today'],
                'military': ['military', 'soldier', 'army', 'war', 'battle', 'combat']
            };
            
            Object.entries(themeKeywords).forEach(([theme, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    themes.push(theme);
                }
            });
            
            return themes;
        },
        
        extractContentRating(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            
            // Check for mature content indicators
            const matureKeywords = ['nsfw', 'adult', 'mature', 'explicit', 'sexual', 'erotic'];
            const violenceKeywords = ['violence', 'blood', 'kill', 'murder', 'death', 'gore'];
            
            if (matureKeywords.some(keyword => text.includes(keyword))) {
                return 'mature';
            }
            
            if (violenceKeywords.some(keyword => text.includes(keyword))) {
                return 'teen';
            }
            
            return 'general';
        },
        
        loadCharacter(char) {
            const mode = document.getElementById('char-import-mode')?.value || 'scenario';
            KLITE_RPMod.log('panels', `Loading character "${char.name}" as ${mode}`);
            
            switch(mode) {
                case 'scenario':
                    if (confirm(`Load "${char.name}" as scenario?`)) {
                        KLITE_RPMod.log('panels', 'User confirmed scenario load');
                        window.restart_new_game?.(false);
                        
                        // Build comprehensive character context
                        let context = `[Character: ${char.name}]\n`;
                        if (char.description) context += `Description: ${char.description}\n`;
                        if (char.personality) context += `Personality: ${char.personality}\n`;
                        if (char.scenario) context += `Scenario: ${char.scenario}\n`;
                        
                        KLITE_RPMod.log('panels', `Built character context (${context.length} chars)`);
                        window.current_memory = context;
                        
                        // Set up chat mode
                        if (window.localsettings) {
                            KLITE_RPMod.log('panels', `Setting chat mode with opponent: ${char.name}`);
                            localsettings.opmode = 3; // Chat mode
                            localsettings.chatopponent = char.name;
                        }
                        
                        // Add greeting based on activeGreeting setting
                        const characterData = char.rawData?.data || char.rawData || {};
                        let selectedGreeting = null;
                        
                        if (char.activeGreeting === null || char.activeGreeting === undefined) {
                            // Use default first_mes
                            selectedGreeting = char.first_mes || characterData.first_mes;
                        } else if (typeof char.activeGreeting === 'number') {
                            // Use alternate greeting
                            const alternateGreetings = characterData.alternate_greetings || [];
                            selectedGreeting = alternateGreetings[char.activeGreeting] || char.first_mes || characterData.first_mes;
                        }
                        
                        if (selectedGreeting) {
                            const greetingType = char.activeGreeting === null || char.activeGreeting === undefined ? 'default' : `alternate ${char.activeGreeting + 1}`;
                            KLITE_RPMod.log('panels', `Adding ${greetingType} greeting (${selectedGreeting.length} chars)`);
                            window.gametext_arr = [selectedGreeting];
                        }
                        
                        window.render_gametext?.();
                        // Loaded ${char.name}
                        KLITE_RPMod.switchTab('right', 'MEMORY');
                    }
                    break;
                    
                case 'worldinfo':
                    KLITE_RPMod.log('panels', `Adding "${char.name}" to World Info`);
                    this.addCharacterToWI(char);
                    KLITE_RPMod.switchTab('right', 'WI');
                    break;
                    
                case 'memory':
                    KLITE_RPMod.log('panels', `Adding "${char.name}" to Memory`);
                    this.addCharacterToMemory(char);
                    KLITE_RPMod.switchTab('right', 'MEMORY');
                    break;
            }
            
            // Mark character as used for statistics
            KLITE_RPMod.markCharacterAsUsed(char.id);
        },
        
        addToWorldInfo(char) {
            if (!window.current_wi) {
                window.current_wi = [];
            }
            
            KLITE_RPMod.log('panels', `Creating multiple WI entries for ${char.name}`);
            
            const wiGroup = `Character: ${char.name}`;
            const entries = [];
            const characterData = char.rawData?.data || char.rawData || {};
            
            // Description entry with special comment
            if (characterData.description) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} description, appearance`,
                    content: characterData.description,
                    comment: `${char.name}_imported_memory`, // Required format!
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Personality entry with special comment
            if (characterData.personality) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} personality, traits`,
                    content: characterData.personality,
                    comment: `${char.name}_imported_memory`, // Required format!
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Scenario entry
            if (characterData.scenario) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} scenario, background`,
                    content: characterData.scenario,
                    comment: `${char.name}_imported_scenario`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // First message entry
            if (characterData.first_mes) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} greeting, first message`,
                    content: characterData.first_mes,
                    comment: `${char.name}_imported_greeting`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Alternate greetings (if any)
            if (characterData.alternate_greetings) {
                characterData.alternate_greetings.forEach((greeting, index) => {
                    entries.push({
                        key: char.name,
                        keysecondary: `${char.name} greeting ${index + 2}`,
                        content: greeting,
                        comment: `${char.name}_imported_greeting_${index + 2}`,
                        selective: false,
                        constant: false,
                        probability: 100,
                        wigroup: wiGroup,
                        widisabled: false
                    });
                });
            }
            
            // Example messages entry
            if (characterData.mes_example) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} examples, dialogue`,
                    content: characterData.mes_example,
                    comment: `${char.name}_imported_examples`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Post History Instructions entry (if exists)
            if (characterData.post_history_instructions) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} instructions`,
                    content: characterData.post_history_instructions,
                    comment: `${char.name}_imported_instructions`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // System Prompt entry (if exists)
            if (characterData.system_prompt) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} system`,
                    content: characterData.system_prompt,
                    comment: `${char.name}_imported_system`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Creator Notes entry (if exists)
            if (characterData.creator_notes) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} notes`,
                    content: characterData.creator_notes,
                    comment: `${char.name}_imported_notes`,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Character Image entry (if exists) - NEW ENHANCEMENT
            if (char.image) {
                entries.push({
                    key: char.name,
                    keysecondary: `${char.name} image, avatar`,
                    content: char.image, // Store base64 image data
                    comment: `${char.name}_imported_image`, // Special pattern for image extraction
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: wiGroup,
                    widisabled: false
                });
            }
            
            // Add all entries to World Info
            entries.forEach(entry => window.current_wi.push(entry));
            
            KLITE_RPMod.log('panels', `Created ${entries.length} WI entries for ${char.name} (including image)`, entries);
            
            // Save settings
            if (window.autosave) {
                window.autosave();
            } else if (window.save_settings) {
                window.save_settings();
            }
            
            // Added ${entries.length} World Info entries for ${char.name}
        },
        
        // Complete Scenario Loading Implementation
        async loadAsScenario(character) {
            try {
                KLITE_RPMod.log('chars', `Starting loadAsScenario for character: ${character.name}`);
                
                if (!confirm(`Load "${character.name}" as scenario? This will restart the session and overwrite your current data.`)) {
                    KLITE_RPMod.log('chars', 'User cancelled scenario loading');
                    return;
                }
                
                KLITE_RPMod.log('chars', 'User confirmed scenario loading, proceeding...');
                
                // Clear current game state
                if (typeof window.restart_new_game === 'function') {
                    window.restart_new_game(false);
                    KLITE_RPMod.log('chars', 'Game state restarted');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: restart_new_game function not available');
                }
                
                const characterData = character.rawData?.data || character.rawData || {};
                KLITE_RPMod.log('chars', 'Character data extracted', characterData);
                
                // 1. Load the selected active first message into the chat
                KLITE_RPMod.log('chars', 'Selecting greeting...');
                const selectedGreeting = await this.selectGreeting(character);
                KLITE_RPMod.log('chars', 'Selected greeting:', selectedGreeting);
                
                if (window.gametext_arr) {
                    window.gametext_arr = [selectedGreeting];
                    KLITE_RPMod.log('chars', 'Greeting added to gametext_arr');
                }
                
                // 2. Add description, personality and scenario into MEMORY
                KLITE_RPMod.log('chars', 'Building memory...');
                const memory = this.buildV3Memory(character);
                if (typeof window.current_memory !== 'undefined') {
                    window.current_memory = memory;
                    KLITE_RPMod.log('chars', 'Memory set:', memory);
                }
                
                // 3. Add Author's Note and Character's Note into AUTHOR'S NOTE
                const authorNoteParts = [];
                if (characterData.creator_notes && characterData.creator_notes.trim()) {
                    authorNoteParts.push(characterData.creator_notes.trim());
                    KLITE_RPMod.log('chars', 'Added creator_notes to author note');
                }
                if (characterData.system_prompt && characterData.system_prompt.trim()) {
                    authorNoteParts.push(characterData.system_prompt.trim());
                    KLITE_RPMod.log('chars', 'Added system_prompt to author note');
                }
                
                if (authorNoteParts.length > 0) {
                    window.current_anote = authorNoteParts.join('\n\n');
                    KLITE_RPMod.log('chars', 'Author note set:', window.current_anote);
                }
                
                // 4. Check for World Info and ask user about import
                KLITE_RPMod.log('chars', 'Checking for World Info...');
                const worldInfoEntries = this.extractWorldInfoEntries(characterData);
                if (worldInfoEntries.length > 0) {
                    KLITE_RPMod.log('chars', `Found ${worldInfoEntries.length} World Info entries`);
                    const importWI = confirm(`This character has ${worldInfoEntries.length} World Info entries. Import them to your World Info?`);
                    if (importWI) {
                        KLITE_RPMod.log('chars', 'User chose to import World Info');
                        await this.importCharacterWorldInfo(worldInfoEntries);
                    }
                }
                
                // 5. Set RP mode with character name
                if (window.localsettings) {
                    window.localsettings.opmode = 4; // RP mode
                    window.localsettings.chatopponent = character.name;
                    KLITE_RPMod.log('chars', 'Set RP mode and character name');
                }
                
                // Sync the UI to RP mode
                KLITE_RPMod.setMode(4);
                KLITE_RPMod.log('chars', 'UI synced to RP mode');
                
                // 6. Load the character into PLAY_RP panel
                if (KLITE_RPMod.panels.PLAY_RP) {
                    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = character;
                    KLITE_RPMod.panels.PLAY_RP.characterEnabled = true;
                    KLITE_RPMod.panels.PLAY_RP.applyCharacterData(character);
                    KLITE_RPMod.log('chars', 'Character applied to PLAY_RP panel');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: PLAY_RP panel not available');
                }
                
                // Disable GROUP if active
                if (KLITE_RPMod.panels.GROUP && KLITE_RPMod.panels.GROUP.enabled) {
                    KLITE_RPMod.panels.GROUP.enabled = false;
                    KLITE_RPMod.panels.GROUP.updateKoboldSettings();
                    KLITE_RPMod.log('chars', 'Disabled GROUP chat');
                }
                
                // Refresh panels
                const currentLeftPanel = KLITE_RPMod.state.tabs.left;
                if (currentLeftPanel === 'GROUP') {
                    KLITE_RPMod.loadPanel('left', 'GROUP');
                } else if (currentLeftPanel === 'PLAY') {
                    KLITE_RPMod.switchTab('left', 'PLAY');
                    KLITE_RPMod.loadPanel('left', 'PLAY');
                }
                
                // Apply V3-specific settings
                if (characterData.extensions) {
                    this.applyV3Extensions(characterData.extensions);
                    KLITE_RPMod.log('chars', 'Applied V3 extensions');
                }
                
                // Refresh UI
                if (typeof window.render_gametext === 'function') {
                    window.render_gametext();
                    KLITE_RPMod.log('chars', 'UI refreshed');
                }
                
                KLITE_RPMod.log('chars', `✅ "${character.name}" loaded as scenario successfully!`);
                alert(`"${character.name}" loaded as scenario successfully!`);
                
                // Close modal/detail view if open
                const modal = document.getElementById('char-modal-' + character.id);
                if (modal) modal.remove();
                
                // Return to main CHARS view if in detail view
                this.hideCharacterFullscreen();
                
            } catch (error) {
                KLITE_RPMod.error('Error loading character as scenario:', error);
                alert(`Failed to load character as scenario: ${error.message}`);
            }
        },
        
        // Intelligent memory building for V3 cards
        buildV3Memory(character) {
            const parts = [];
            const characterData = character.rawData?.data || character.rawData || {};
            
            // Character header
            parts.push(`[Character: ${character.name}]`);
            
            // Creator notes (V3 feature)
            if (characterData.creator_notes) {
                parts.push(`[Creator Notes: ${characterData.creator_notes}]`);
            }
            
            // Character version (V3 feature)
            if (characterData.character_version) {
                parts.push(`[Version: ${characterData.character_version}]`);
            }
            
            // Core character data
            if (characterData.description) {
                parts.push(`\n### Description\n${characterData.description}`);
            }
            
            if (characterData.personality) {
                parts.push(`\n### Personality\n${characterData.personality}`);
            }
            
            if (characterData.scenario) {
                parts.push(`\n### Scenario\n${characterData.scenario}`);
            }
            
            // Post-history instructions (V3 feature)
            if (characterData.post_history_instructions) {
                parts.push(`\n### Instructions\n${characterData.post_history_instructions}`);
            }
            
            // System prompt override (V3 feature)
            if (characterData.system_prompt) {
                parts.push(`\n### System Context\n${characterData.system_prompt}`);
            }
            
            // Tags (V3 feature)
            if (characterData.tags && characterData.tags.length > 0) {
                parts.push(`\n[Tags: ${characterData.tags.join(', ')}]`);
            }
            
            return parts.join('\n');
        },
        
        // Handle alternate greetings (V3 feature)
        async selectGreeting(character) {
            KLITE_RPMod.log('chars', 'selectGreeting: Starting greeting selection');
            const characterData = character.rawData?.data || character.rawData || {};
            
            KLITE_RPMod.log('chars', `selectGreeting: Character activeGreeting: ${character.activeGreeting}`);
            KLITE_RPMod.log('chars', 'selectGreeting: Available greetings:', {
                first_mes: !!characterData.first_mes,
                alternate_greetings: characterData.alternate_greetings?.length || 0
            });
            
            // Use the active greeting that's already selected for this character
            // activeGreeting: null/-1 = default first_mes, 0+ = alternate greeting index
            const activeGreetingIndex = character.activeGreeting;
            
            if (activeGreetingIndex === null || activeGreetingIndex === -1) {
                // Use default first message
                if (characterData.first_mes) {
                    KLITE_RPMod.log('chars', 'selectGreeting: Using default first_mes (active greeting)');
                    return characterData.first_mes;
                } else {
                    KLITE_RPMod.log('chars', 'selectGreeting: No first_mes found, using fallback');
                    return `Hello! I'm ${character.name}.`;
                }
            } else {
                // Use specific alternate greeting
                if (characterData.alternate_greetings && 
                    Array.isArray(characterData.alternate_greetings) && 
                    activeGreetingIndex < characterData.alternate_greetings.length) {
                    
                    const selectedGreeting = characterData.alternate_greetings[activeGreetingIndex];
                    KLITE_RPMod.log('chars', `selectGreeting: Using alternate greeting ${activeGreetingIndex} (active greeting)`);
                    return selectedGreeting;
                } else {
                    KLITE_RPMod.log('chars', `selectGreeting: Active greeting index ${activeGreetingIndex} not found, falling back to first_mes`);
                    return characterData.first_mes || `Hello! I'm ${character.name}.`;
                }
            }
        },
        
        // Show greeting selection modal
        async showGreetingSelector(greetings) {
            return new Promise((resolve) => {
                const modalId = 'greeting-selector-modal';
                
                // Create modal element
                const modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'klite-modal';
                modal.innerHTML = `
                    <div class="klite-modal-content" style="max-width: 600px;">
                        <div class="klite-modal-header">
                            <h2>Select Greeting</h2>
                            <button class="klite-modal-close">×</button>
                        </div>
                        <div class="klite-modal-body">
                            <p>This character has multiple greetings. Please select one:</p>
                            <div id="greeting-options"></div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Add event listeners properly
                const closeBtn = modal.querySelector('.klite-modal-close');
                closeBtn.addEventListener('click', () => {
                    modal.remove();
                    resolve(greetings[0].content); // Default to first greeting if closed
                });
                
                // Add greeting options with proper event handlers
                const optionsContainer = modal.querySelector('#greeting-options');
                greetings.forEach((greeting, index) => {
                    const option = document.createElement('div');
                    option.className = 'klite-greeting-option';
                    option.style.cssText = 'margin-bottom: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 4px; cursor: pointer;';
                    option.innerHTML = `
                        <strong>${greeting.label}</strong>
                        <div style="margin-top: 5px; color: var(--muted); font-size: 12px;">
                            ${greeting.content.length > 100 ? greeting.content.substring(0, 100) + '...' : greeting.content}
                        </div>
                    `;
                    
                    option.addEventListener('click', () => {
                        modal.remove();
                        resolve(greeting.content);
                    });
                    
                    optionsContainer.appendChild(option);
                });
                
                // Close on background click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                        resolve(greetings[0].content); // Default to first greeting
                    }
                });
            });
        },
        
        // Apply V3-specific extensions
        applyV3Extensions(extensions) {
            KLITE_RPMod.log('panels', 'Applying V3 extensions:', extensions);
            
            // Handle depth/frequency penalties
            if (extensions.depth_prompt) {
                // Apply to generation settings if available
                if (window.localsettings) {
                    // Apply depth prompt settings
                }
            }
            
            // Handle world info overrides
            if (extensions.world_info_override) {
                // Apply WI settings
            }
            
            // Handle other V3 extensions as needed
        },
        
        // Export character functionality
        exportCharacterJSON(character) {
            if (!character.rawData) {
                alert('Cannot export: No original character data available');
                return;
            }
            
            try {
                // Determine export format based on original card
                const cardFormat = character.rawData?.spec === 'chara_card_v3' ? 'V3' : 
                                  character.rawData?.spec === 'chara_card_v2' ? 'V2' : 'V1';
                
                let exportData;
                if (cardFormat === 'V3' || cardFormat === 'V2') {
                    exportData = {
                        spec: character.rawData.spec,
                        data: character.rawData.data
                    };
                } else {
                    exportData = character.rawData;
                }
                
                // Create and download JSON file
                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `${character.name.replace(/[^\w\s]/gi, '')}_${cardFormat}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert(`Exported ${character.name} as ${cardFormat} JSON`);
            } catch (error) {
                KLITE_RPMod.error('Failed to export character JSON:', error);
                alert('Failed to export character JSON');
            }
        },

        exportCharacterPNG(character) {
            if (!character.rawData) {
                alert('Cannot export: No original character data available');
                return;
            }
            
            try {
                // Prepare V2 character card data
                const exportData = {
                    spec: 'chara_card_v2',
                    spec_version: '2.0',
                    data: character.rawData.data || character.rawData
                };
                
                // Create canvas for PNG generation
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 512;
                canvas.height = 512;
                
                // Create a simple character card background
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, 512, 512);
                
                // If character has an image, try to use it as background
                if (character.image && character.image.startsWith('data:image/')) {
                    const img = new Image();
                    img.onload = () => {
                        // Draw character image
                        ctx.drawImage(img, 0, 0, 512, 512);
                        
                        // Add character name overlay
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(0, 450, 512, 62);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(character.name, 256, 485);
                        
                        this.finalizePNGExport(canvas, exportData, character.name);
                    };
                    img.onerror = () => {
                        // Fallback if image fails to load
                        this.createFallbackPNG(ctx, character, exportData);
                    };
                    img.src = character.image;
                } else {
                    // No image - create text-based card
                    this.createFallbackPNG(ctx, character, exportData);
                }
            } catch (error) {
                KLITE_RPMod.error('Failed to export character PNG:', error);
                alert('Failed to export character PNG');
            }
        },

        createFallbackPNG(ctx, character, exportData) {
            // Create a text-based character card
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(50, 50, 412, 412);
            
            // Character name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(character.name, 256, 150);
            
            // Add some character info
            ctx.font = '16px Arial';
            ctx.fillStyle = '#cccccc';
            if (character.description) {
                const desc = character.description.substring(0, 100) + '...';
                this.wrapText(ctx, desc, 256, 200, 300, 20);
            }
            
            this.finalizePNGExport(ctx.canvas, exportData, character.name);
        },

        wrapText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, y);
        },

        finalizePNGExport(canvas, exportData, characterName) {
            try {
                // Convert character data to base64 for embedding
                const jsonString = JSON.stringify(exportData);
                const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                
                // Get PNG data from canvas
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        alert('Failed to create PNG blob');
                        return;
                    }
                    
                    try {
                        // Read the PNG blob as array buffer
                        const arrayBuffer = await blob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Embed character data in PNG tEXt chunk
                        const pngWithMetadata = this.embedPNGMetadata(uint8Array, 'chara', base64Data);
                        
                        // Create final blob and download
                        const finalBlob = new Blob([pngWithMetadata], { type: 'image/png' });
                        const url = URL.createObjectURL(finalBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${characterName.replace(/[^\w\s]/gi, '')}_V2.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        alert(`Exported ${characterName} as V2 PNG with embedded character data`);
                    } catch (error) {
                        KLITE_RPMod.error('Failed to embed PNG metadata:', error);
                        alert('Failed to embed character data in PNG');
                    }
                }, 'image/png');
            } catch (error) {
                KLITE_RPMod.error('Failed to finalize PNG export:', error);
                alert('Failed to finalize PNG export');
            }
        },

        embedPNGMetadata(pngData, keyword, text) {
            // Create tEXt chunk with character data
            const keywordBytes = new TextEncoder().encode(keyword);
            const textBytes = new TextEncoder().encode(text);
            const nullSeparator = new Uint8Array([0]);
            
            // Calculate chunk data (keyword + null + text)
            const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
            chunkData.set(keywordBytes, 0);
            chunkData.set(nullSeparator, keywordBytes.length);
            chunkData.set(textBytes, keywordBytes.length + 1);
            
            // Calculate CRC32 for chunk type + data
            const chunkType = new TextEncoder().encode('tEXt');
            const crcData = new Uint8Array(chunkType.length + chunkData.length);
            crcData.set(chunkType, 0);
            crcData.set(chunkData, chunkType.length);
            const crc32 = this.calculateCRC32(crcData);
            
            // Create complete tEXt chunk
            const chunkLength = chunkData.length;
            const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
            
            // Length (4 bytes, big-endian)
            chunk[0] = (chunkLength >> 24) & 0xFF;
            chunk[1] = (chunkLength >> 16) & 0xFF;
            chunk[2] = (chunkLength >> 8) & 0xFF;
            chunk[3] = chunkLength & 0xFF;
            
            // Type (4 bytes)
            chunk.set(chunkType, 4);
            
            // Data
            chunk.set(chunkData, 8);
            
            // CRC (4 bytes, big-endian)
            chunk[8 + chunkData.length] = (crc32 >> 24) & 0xFF;
            chunk[8 + chunkData.length + 1] = (crc32 >> 16) & 0xFF;
            chunk[8 + chunkData.length + 2] = (crc32 >> 8) & 0xFF;
            chunk[8 + chunkData.length + 3] = crc32 & 0xFF;
            
            // Find IEND chunk position in original PNG
            let iendPos = -1;
            for (let i = pngData.length - 12; i >= 8; i--) {
                if (pngData[i + 4] === 73 && pngData[i + 5] === 69 && // 'IE'
                    pngData[i + 6] === 78 && pngData[i + 7] === 68) { // 'ND'
                    iendPos = i;
                    break;
                }
            }
            
            if (iendPos === -1) {
                throw new Error('Invalid PNG: IEND chunk not found');
            }
            
            // Create new PNG with embedded tEXt chunk before IEND
            const newPNG = new Uint8Array(pngData.length + chunk.length);
            newPNG.set(pngData.slice(0, iendPos), 0);  // Everything before IEND
            newPNG.set(chunk, iendPos);                 // Our tEXt chunk
            newPNG.set(pngData.slice(iendPos), iendPos + chunk.length); // IEND chunk
            
            return newPNG;
        },

        calculateCRC32(data) {
            // Standard CRC32 implementation for PNG
            const crcTable = this.getCRC32Table();
            let crc = 0xFFFFFFFF;
            
            for (let i = 0; i < data.length; i++) {
                crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
            }
            
            return (crc ^ 0xFFFFFFFF) >>> 0;
        },

        getCRC32Table() {
            if (!this._crc32Table) {
                this._crc32Table = new Array(256);
                for (let n = 0; n < 256; n++) {
                    let c = n;
                    for (let k = 0; k < 8; k++) {
                        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                    }
                    this._crc32Table[n] = c;
                }
            }
            return this._crc32Table;
        },
        
        
        addCharacterToMemory(char) {
            const content = this.buildCharacterContent(char);
            
            if (window.current_memory) {
                window.current_memory += '\n\n' + content;
            } else {
                window.current_memory = content;
            }
            
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory) {
                liteMemory.value = window.current_memory;
                liteMemory.dispatchEvent(new Event('input'));
            }
            
            // Added ${char.name} to Memory
        },
        
        buildCharacterContent(char) {
            let content = `[Character: ${char.name}]\n`;
            
            if (char.description) content += `Description: ${char.description}\n`;
            if (char.personality) content += `Personality: ${char.personality}\n`;
            if (char.scenario) content += `Background: ${char.scenario}\n`;
            if (char.mes_example) content += `\nExample Dialogue:\n${char.mes_example}\n`;
            
            return content;
        },
        
        // Import all WorldInfo entries from a character
        importAllWorldInfo(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const characterData = char.rawData?.data || char.rawData || {};
            const worldInfo = [];
            if (characterData.character_book?.entries) {
                const entries = Array.isArray(characterData.character_book.entries) ? 
                    characterData.character_book.entries : 
                    Object.values(characterData.character_book.entries);
                worldInfo.push(...entries);
            }
            
            if (worldInfo.length === 0) {
                // No World Info entries to import
                return;
            }
            
            if (!window.current_wi) window.current_wi = [];
            
            worldInfo.forEach(entry => {
                const keys = entry.keys || entry.key || [];
                const keyList = Array.isArray(keys) ? keys : 
                               typeof keys === 'string' ? keys.split(',').map(k => k.trim()) : [];
                const secondary = entry.secondary_keys || entry.keysecondary || [];
                const secondaryList = Array.isArray(secondary) ? secondary : 
                                     typeof secondary === 'string' ? secondary.split(',').map(k => k.trim()) : [];
                
                window.current_wi.push({
                    key: keyList.join(', '),
                    keysecondary: secondaryList.join(', '),
                    keyanti: entry.keyanti || '',
                    content: entry.content || '',
                    comment: entry.comment || entry.title || `Imported from ${char.name}`,
                    selective: entry.selective || false,
                    constant: entry.constant || false,
                    probability: entry.probability || 100,
                    wigroup: `Character: ${char.name}`,
                    widisabled: false
                });
            });
            
            // Save
            window.autosave?.();
            
            // Imported ${worldInfo.length} World Info entries from ${char.name}
            
            // Close modal and switch to WI panel
            document.getElementById('char-modal-' + charId)?.remove();
            KLITE_RPMod.switchTab('right', 'WI');
        },
        
        // Import a single WorldInfo entry
        importWorldInfoEntry(charId, entryIndex) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const characterData = char.rawData?.data || char.rawData || {};
            const worldInfo = [];
            if (characterData.character_book?.entries) {
                const entries = Array.isArray(characterData.character_book.entries) ? 
                    characterData.character_book.entries : 
                    Object.values(characterData.character_book.entries);
                worldInfo.push(...entries);
            }
            
            const entry = worldInfo[entryIndex];
            if (!entry) return;
            
            if (!window.current_wi) window.current_wi = [];
            
            const keys = entry.keys || entry.key || [];
            const keyList = Array.isArray(keys) ? keys : 
                           typeof keys === 'string' ? keys.split(',').map(k => k.trim()) : [];
            const secondary = entry.secondary_keys || entry.keysecondary || [];
            const secondaryList = Array.isArray(secondary) ? secondary : 
                                 typeof secondary === 'string' ? secondary.split(',').map(k => k.trim()) : [];
            
            window.current_wi.push({
                key: keyList.join(', '),
                keysecondary: secondaryList.join(', '),
                keyanti: entry.keyanti || '',
                content: entry.content || '',
                comment: entry.comment || entry.title || `Imported from ${char.name}`,
                selective: entry.selective || false,
                constant: entry.constant || false,
                probability: entry.probability || 100,
                wigroup: `Character: ${char.name}`,
                widisabled: false
            });
            
            // Save
            window.autosave?.();
            
            // Imported World Info entry from ${char.name}
        },
        
        // View WorldInfo as JSON
        viewWorldInfoJSON(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const characterData = char.rawData?.data || char.rawData || {};
            const worldInfo = characterData.character_book || { entries: [] };
            
            const modalHTML = `
                <div id="wi-json-modal" class="klite-modal">
                    <div class="klite-modal-content" style="max-width: 800px;">
                        <div class="klite-modal-header">
                            <h3>World Info JSON - ${char.name}</h3>
                            <button class="klite-modal-close" onclick="document.getElementById('wi-json-modal').remove()"> -->
                        </div>
                        <div class="klite-modal-body">
                            <textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px;">${JSON.stringify(worldInfo, null, 2)}</textarea>
                        </div>
                        <div class="klite-modal-footer">
                            <button class="klite-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.querySelector('textarea').value)">Copy to Clipboard</button>
                            <button class="klite-btn secondary" onclick="document.getElementById('wi-json-modal').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        },
        
        // Use a specific greeting
        useGreeting(charId, greetingIndex) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const characterData = char.rawData?.data || char.rawData || {};
            const greetings = [];
            
            if (characterData.first_mes) {
                greetings.push(characterData.first_mes);
            }
            if (characterData.alternate_greetings && Array.isArray(characterData.alternate_greetings)) {
                greetings.push(...characterData.alternate_greetings);
            }
            
            const selectedGreeting = greetings[greetingIndex];
            if (!selectedGreeting) return;
            
            // Copy to clipboard
            if (!navigator.clipboard) {
                throw new Error('Clipboard API not available. Use a modern browser with HTTPS.');
            }
            navigator.clipboard.writeText(selectedGreeting).then(() => {
                // Greeting copied to clipboard!
            });
        },
        
        toggleCharacterModalFullscreen(button) {
            const modalContent = button.closest('.klite-modal-content');
            if (!modalContent) return;
            
            const isFullscreen = modalContent.classList.contains('fullscreen');
            modalContent.classList.toggle('fullscreen');
            
            // Update button text/icon to indicate state
            button.textContent = isFullscreen ? '⛶' : '+';
            button.title = isFullscreen ? 'Enter Fullscreen' : 'Exit Fullscreen';
            
            KLITE_RPMod.log('chars', `Toggled fullscreen: ${!isFullscreen}`);
        },
        
        removeTag(charId, tag) {
            const character = KLITE_RPMod.characters.find(c => c.id === charId);
            if (!character || !character.tags) return;
            
            const tagIndex = character.tags.indexOf(tag);
            if (tagIndex > -1) {
                character.tags.splice(tagIndex, 1);
                KLITE_RPMod.saveCharacters();
                
                // Refresh the fullscreen view if currently viewing this character
                const rightPanel = document.querySelector('div#content-right.klite-content');
                const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                if (backButton) {
                    // We're in fullscreen character view, refresh it
                    this.showCharacterFullscreen(character);
                }
                
                KLITE_RPMod.log('chars', `Removed tag "${tag}" from character ${character.name}`);
            }
        },
        
        setActiveGreeting(charId, greetingIndex) {
            const character = KLITE_RPMod.characters.find(c => c.id === charId);
            if (!character) return;
            
            // Set active greeting (null = default first_mes, 0+ = alternate greeting index)
            character.activeGreeting = greetingIndex === -1 ? null : greetingIndex;
            KLITE_RPMod.saveCharacters();
            
            // Refresh the fullscreen view if currently viewing this character
            const rightPanel = document.querySelector('div#content-right.klite-content');
            const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
            if (backButton) {
                // We're in fullscreen character view, refresh it
                this.showCharacterFullscreen(character);
            }
            
            const greetingName = greetingIndex === -1 ? 'default' : `alternate ${greetingIndex + 1}`;
            KLITE_RPMod.log('chars', `Set active greeting to ${greetingName} for character ${character.name}`);
        },
        
        copyGreeting(content) {
            if (!navigator.clipboard) {
                throw new Error('Clipboard API not available. Use a modern browser with HTTPS.');
            }
            navigator.clipboard.writeText(content).then(() => {
                KLITE_RPMod.log('chars', 'Greeting copied to clipboard');
            });
        },
        
        showCharacterFullscreen(char) {
            // Instead of using separate panel, replace CHARS panel content
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (!rightPanel) return;
            
            const characterData = char.rawData?.data || char.rawData || {};
            
            // Extract greetings data
            const greetings = [];
            if (characterData.first_mes) {
                greetings.push({ label: 'Default Greeting', content: characterData.first_mes, index: -1 });
            }
            if (characterData.alternate_greetings && Array.isArray(characterData.alternate_greetings)) {
                characterData.alternate_greetings.forEach((greeting, i) => {
                    greetings.push({ label: `Alternate Greeting ${i + 1}`, content: greeting, index: i });
                });
            }
            
            // Extract WorldInfo entries
            const worldInfo = [];
            if (characterData.character_book?.entries) {
                const entries = Array.isArray(characterData.character_book.entries) ? 
                    characterData.character_book.entries : 
                    Object.values(characterData.character_book.entries);
                worldInfo.push(...entries);
            }
            
            // Replace the CHARS panel content with character details using proper t.section structure
            rightPanel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                    <h2 style="margin: 0; font-size: 20px; color: var(--text);">${char.name}</h2>
                    <button class="klite-btn" onclick="KLITE_RPMod.panels.CHARS.hideCharacterFullscreen()">← Back</button>
                </div>
                
                ${t.section('Character Profile',
                    `<div style="text-align: center; margin-bottom: 15px;">
                        ${char.image ? `<img src="${char.image}" alt="${char.name}" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 8px;">` : '<div style="width: 100px; height: 100px; background: var(--bg2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; margin: 0 auto 8px; color: var(--muted);">👤</div>'}
                        <div style="font-weight: 600; font-size: 18px; color: var(--text);">${char.name}</div>
                        <div style="color: var(--muted); font-size: 14px;">by ${char.creator || 'Unknown'}</div>
                    </div>`
                )}

                
                ${t.section('Tags',
                    `<div id="tags-container-${char.id}" style="margin-bottom: 12px;">
                        ${(char.tags || []).map(tag => `
                            <span class="klite-tag-pill" data-tag="${tag}" onclick="KLITE_RPMod.panels.CHARS.toggleTagSelection(this)">
                                ${tag}
                            </span>
                        `).join(' ')}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="klite-btn" onclick="KLITE_RPMod.panels.CHARS.addTag(${char.id})">Add Tag</button>
                        <button class="klite-btn danger disabled" id="remove-tag-btn-${char.id}" onclick="KLITE_RPMod.panels.CHARS.removeSelectedTags(${char.id})" disabled>✕ Remove Selected</button>
                    </div>`
                )}
                
                ${t.section('Rating',
                    `<select class="klite-select" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)" style="width: 100%;">
                        <option value="0" ${char.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="1" ${char.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                        <option value="2" ${char.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="3" ${char.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="4" ${char.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="5" ${char.rating === 5 ? 'selected' : ''}>★★★★★</option>
                    </select>`
                )}
                
                ${t.section('Actions',
                    `<div style="display: flex; flex-direction: column; gap: 6px;">
                        <button class="klite-btn" data-action="load-char-scenario" data-char-id="${char.id}">Load as Scenario</button>
                        <button class="klite-btn secondary" data-action="add-char-worldinfo" data-char-id="${char.id}">Add to World Info</button>
                        <button class="klite-btn secondary" data-action="export-char-json" data-char-id="${char.id}">Export as JSON</button>
                        <button class="klite-btn secondary" data-action="export-char-png" data-char-id="${char.id}">Export as V2 PNG</button>
                        <button class="klite-btn danger" data-action="delete-char-modal" data-char-id="${char.id}">Delete Character</button>
                    </div>`
                )}
                
                ${characterData.description ? t.section('Description', characterData.description) : ''}
                ${characterData.personality ? t.section('Personality', characterData.personality) : ''}
                ${characterData.scenario ? t.section('Scenario', characterData.scenario) : ''}
                ${characterData.creator_notes ? t.section('Creator Notes', characterData.creator_notes) : ''}
                ${characterData.post_history_instructions ? t.section('Post History Instructions', characterData.post_history_instructions) : ''}
                ${characterData.mes_example ? t.section('Example Messages', characterData.mes_example) : ''}
                ${characterData.system_prompt ? t.section('System Prompt', characterData.system_prompt) : ''}
                ${characterData.jailbreak ? t.section('Jailbreak', characterData.jailbreak) : ''}
                ${characterData.depth_prompt_prompt ? t.section('Depth Prompt', characterData.depth_prompt_prompt) : ''}
                
                ${greetings.length > 0 ? t.section(`First Messages (${greetings.length})`,
                    greetings.map(greeting => `
                        <div style="margin-bottom: 16px; padding: 12px; background: ${greeting.index === (char.activeGreeting ?? -1) ? 'rgba(74,158,255,0.15)' : 'var(--bg3)'}; border-radius: 6px; border: ${greeting.index === (char.activeGreeting ?? -1) ? '1px solid var(--accent)' : '1px solid var(--border)'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong>${greeting.label} ${greeting.index === (char.activeGreeting ?? -1) ? '(Active)' : ''}</strong>
                                ${greeting.index !== (char.activeGreeting ?? -1) ? `<button class="klite-btn" onclick="KLITE_RPMod.panels.CHARS.setActiveGreeting(${char.id}, ${greeting.index})" style="font-size: 12px; padding: 6px 12px; background: var(--accent); color: white;">Set</button>` : ''}
                            </div>
                            <div style="white-space: pre-wrap; line-height: 1.5; color: var(--text);">${greeting.content}</div>
                        </div>
                    `).join('')
                ) : ''}
                
                ${worldInfo.length > 0 ? t.section(`World Info / Character Book (${worldInfo.length})`,
                    worldInfo.map((entry, i) => `
                        <div style="margin-bottom: 12px; padding: 12px; background: var(--bg3); border-radius: 6px; border: 1px solid var(--border);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong>Entry ${i + 1}</strong>
                                <button class="klite-btn secondary" onclick="KLITE_RPMod.panels.CHARS.importWorldInfoEntry(${JSON.stringify(entry).replace(/"/g, '&quot;')})" style="font-size: 11px; padding: 4px 8px;">📥 Import to WI</button>
                            </div>
                            <div style="margin-bottom: 6px;"><strong>Keys:</strong> ${(entry.keys || []).join(', ')}</div>
                            <div style="white-space: pre-wrap; line-height: 1.5; color: var(--text);">${entry.content || ''}</div>
                        </div>
                    `).join('')
                ) : ''}
            `;
            
            // Set up event delegation for the detail view content
            this.setupDetailViewEventHandlers(rightPanel, char);
            
            // Character fullscreen view ready - all sections start expanded
            KLITE_RPMod.log('chars', 'Character fullscreen view ready with all sections expanded');
        },
        
        // Set up event handlers for detail view action buttons
        setupDetailViewEventHandlers(rightPanel, char) {
            // Add click event listener to the right panel for detail view actions
            const detailEventHandler = (e) => {
                const actionElement = e.target.closest('[data-action]');
                if (!actionElement) return;
                
                const action = actionElement.dataset.action;
                const charId = actionElement.dataset.charId;
                
                // Verify this is for the current character
                if (charId != char.id) return;
                
                KLITE_RPMod.log('chars', `Detail view action: ${action} for character ${char.id}`);
                
                // Route to appropriate action handler
                switch (action) {
                    case 'load-char-scenario':
                        this.loadAsScenario(char);
                        break;
                    case 'add-char-worldinfo':
                        this.addToWorldInfo(char);
                        break;
                    case 'export-char-json':
                        this.exportCharacterJSON(char);
                        break;
                    case 'export-char-png':
                        this.exportCharacterPNG(char);
                        break;
                    case 'delete-char-modal':
                        if (confirm('Delete this character?')) {
                            this.deleteCharacter(char.id);
                        }
                        break;
                    default:
                        KLITE_RPMod.log('chars', `Unknown detail view action: ${action}`);
                }
                
                e.stopPropagation();
            };
            
            // Remove any existing detail view event handler
            if (rightPanel._detailEventHandler) {
                rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
            }
            
            // Add the new event handler
            rightPanel.addEventListener('click', detailEventHandler);
            rightPanel._detailEventHandler = detailEventHandler;
            
            KLITE_RPMod.log('chars', 'Detail view event handlers set up successfully');
        },
        
        hideCharacterFullscreen() {
            // Clean up detail view event handlers
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (rightPanel && rightPanel._detailEventHandler) {
                rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
                rightPanel._detailEventHandler = null;
                KLITE_RPMod.log('chars', 'Detail view event handlers cleaned up');
            }
            
            // Restore normal CHARS panel view
            KLITE_RPMod.loadPanel('right', 'CHARS');
        },
        
        // Extract World Info entries from character data
        extractWorldInfoEntries(characterData) {
            const entries = [];
            
            // V3 character book format
            if (characterData.character_book?.entries) {
                const bookEntries = Array.isArray(characterData.character_book.entries) ? 
                    characterData.character_book.entries : 
                    Object.values(characterData.character_book.entries);
                entries.push(...bookEntries);
            }
            
            // V2 world_info format (legacy)
            if (characterData.world_info && Array.isArray(characterData.world_info)) {
                entries.push(...characterData.world_info);
            }
            
            return entries.filter(entry => entry && (entry.content || entry.entry));
        },
        
        // Import character World Info entries to main WI system
        async importCharacterWorldInfo(worldInfoEntries) {
            let importedCount = 0;
            
            // Check if entries have explicit group names
            const firstEntry = worldInfoEntries[0];
            const hasExplicitGroup = firstEntry && (firstEntry.group || firstEntry.wigroup);
            
            let userGroupName = '';
            if (!hasExplicitGroup) {
                // Ask user for group name
                userGroupName = prompt('Enter a group name for the imported World Info entries (leave empty for General):') || '';
                KLITE_RPMod.log('chars', `User chose group name: "${userGroupName}"`);
            }
            
            for (const entry of worldInfoEntries) {
                // Convert to KoboldAI Lite's World Info format
                const keys = entry.keys || entry.key || [];
                const keyList = Array.isArray(keys) ? keys : 
                               typeof keys === 'string' ? keys.split(',').map(k => k.trim()) : [];
                
                const secondary = entry.keysecondary || entry.secondary || [];
                const secondaryList = Array.isArray(secondary) ? secondary : 
                                     typeof secondary === 'string' ? secondary.split(',').map(k => k.trim()) : [];
                
                // Use explicit group from character data, or user-provided group name
                const groupName = entry.group || entry.wigroup || userGroupName;
                
                const normalizedEntry = {
                    key: keyList.join(', '),
                    keysecondary: secondaryList.join(', '),
                    keyanti: entry.keyanti || '',
                    content: entry.content || entry.entry || '',
                    wiposition: entry.position || entry.wiposition || 'after',
                    widisabled: entry.enabled === false || entry.disabled === true,
                    wicasesensitive: entry.case_sensitive || entry.wicasesensitive || false,
                    wiselective: entry.selective || entry.wiselective || false,
                    wipriority: entry.priority || entry.wipriority || 400,
                    wiorder: entry.order || entry.wiorder || 100,
                    wicomment: entry.comment || `Imported from character`,
                    wigroup: groupName,
                    constant: entry.constant || false
                };
                
                // Only import if has meaningful content
                if (normalizedEntry.content.trim() && normalizedEntry.key.trim()) {
                    // Add to KoboldAI Lite's native World Info system
                    if (!window.current_wi) {
                        window.current_wi = [];
                    }
                    window.current_wi.push(normalizedEntry);
                    importedCount++;
                    
                    KLITE_RPMod.log('chars', `Added WI entry: ${normalizedEntry.key}`);
                }
            }
            
            if (importedCount > 0) {
                // Save to KoboldAI Lite's native storage system
                if (typeof window.save_wi === 'function') {
                    window.save_wi();
                    KLITE_RPMod.log('chars', 'Saved WI using KoboldAI Lite native function');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: save_wi function not available');
                }
                
                // Refresh WI panels if active
                if (KLITE_RPMod.state.tabs.right === 'MEMORY' && KLITE_RPMod.panels.MEMORY) {
                    KLITE_RPMod.panels.MEMORY.refresh();
                }
                
                // Also refresh native WI UI if it exists
                if (typeof window.wi_refresh === 'function') {
                    window.wi_refresh();
                }
                
                KLITE_RPMod.log('chars', `✅ Imported ${importedCount} World Info entries to KoboldAI Lite WI system`);
            }
            
            return importedCount;
        },
        
        toggleTagSelection(tagElement) {
            tagElement.classList.toggle('selected');
            const isSelected = tagElement.classList.contains('selected');
            
            if (isSelected) {
                tagElement.style.background = 'var(--accent)';
                tagElement.style.color = 'white';
                tagElement.style.borderColor = 'var(--accent)';
            } else {
                tagElement.style.background = 'var(--bg2)';
                tagElement.style.color = 'var(--text)';
                tagElement.style.borderColor = 'var(--border)';
            }
            
            // Enable/disable remove button based on selections
            const container = tagElement.closest('[id^="tags-container-"]');
            const charId = container.id.replace('tags-container-', '');
            const removeBtn = document.getElementById(`remove-tag-btn-${charId}`);
            const hasSelected = container.querySelectorAll('.klite-tag-pill.selected').length > 0;
            
            if (removeBtn) {
                if (hasSelected) {
                    removeBtn.disabled = false;
                    removeBtn.classList.remove('disabled');
                } else {
                    removeBtn.disabled = true;
                    removeBtn.classList.add('disabled');
                }
            }
        },
        
        removeSelectedTags(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;
            
            const container = document.getElementById(`tags-container-${charId}`);
            const selectedTags = container.querySelectorAll('.klite-tag-pill.selected');
            
            if (selectedTags.length === 0) return;
            
            const tagsToRemove = Array.from(selectedTags).map(el => el.dataset.tag);
            
            if (confirm(`Remove ${tagsToRemove.length} selected tag(s)?`)) {
                tagsToRemove.forEach(tag => {
                    const tagIndex = char.tags.indexOf(tag);
                    if (tagIndex > -1) {
                        char.tags.splice(tagIndex, 1);
                    }
                });
                
                KLITE_RPMod.saveCharacters();
                // Refresh fullscreen view if currently viewing this character
                const rightPanel = document.querySelector('div#content-right.klite-content');
                const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                if (backButton) {
                    this.showCharacterFullscreen(char);
                }
                // Removed ${tagsToRemove.length} tag(s) from ${char.name}
            }
        },
        
        refresh() {
            // Clean up any detail view event handlers before refreshing
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (rightPanel && rightPanel._detailEventHandler) {
                rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
                rightPanel._detailEventHandler = null;
                KLITE_RPMod.log('chars', 'Cleaned up detail view event handlers on refresh');
            }
            
            KLITE_RPMod.loadPanel('right', 'CHARS');
        }
    };
    
    // =============================================
    // 5. AUTO-INITIALIZATION
    // =============================================
    
    function waitForKobold() {
        KLITE_RPMod.log('init', 'Checking for KoboldAI Lite readiness...');
        
        // Check for required elements
        if (document.getElementById('gametext') && 
            document.getElementById('input_text') && 
            typeof submit_generation_button === 'function' &&
            document.readyState !== 'loading') {
            
            KLITE_RPMod.log('init', '✅ All requirements met, initializing in 100ms');
            // Initialize after a short delay to ensure everything is ready
            setTimeout(async () => await KLITE_RPMod.init(), 100);
        } else {
            KLITE_RPMod.log('init', `⏳ Waiting for requirements: gametext=${!!document.getElementById('gametext')}, input_text=${!!document.getElementById('input_text')}, submit_function=${typeof submit_generation_button === 'function'}, readyState=${document.readyState}`);
            // Keep checking every 100ms
            setTimeout(waitForKobold, 100);
        }
    }
    
    // Start initialization process
    waitForKobold();
    
})();