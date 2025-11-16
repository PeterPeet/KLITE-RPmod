// =============================================
// KLITE RP mod - ALPHA Release
// Creator: Peter Hauer | GPL-3.0 License
// https://github.com/PeterPeet/
// =============================================

(function () {
    'use strict';

    // Prevent duplicate loads
    if (window.KLITE_RPMod_LOADED) {
        console.warn('[KLITE RPMod] Already loaded, skipping duplicate load');
        return;
    }
    window.KLITE_RPMod_LOADED = true;
    // Default config
    window.KLITE_RPMod_Config = window.KLITE_RPMod_Config || {};
    window.KLITE_RPMod_Config.panelsOnly = true; // Panels-only mode (requested): render only side panels, keep host UI intact
    window.KLITE_RPMod_Config.embedInSave = true; // Embed RPmod data by default
    window.KLITE_RPMod_Config.rpmodAutosave = false; // Do not use separate RPmod autosave by default
    window.KLITE_RPMod_Config.enableConsoleRestore = false; // Console restoration (access by iFrame) disabled by default (can be seen as intrusive by some browsers)

    // =============================================
    // CONSOLE RESTORATION FOR KOBOLDAI LITE (GATED)
    // =============================================
    // Gate behind a config flag to avoid intrusive behavior / CSP issues.
    // Enable by setting window.KLITE_RPMod_Config = { enableConsoleRestore: true } before script load,
    // or by setting localStorage key 'rpmod_enable_console_restore' to '1'.
    (function(){
      try {
        const cfgEnabled = !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.enableConsoleRestore);
        const lsEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('rpmod_enable_console_restore') === '1');
        if (!(cfgEnabled || lsEnabled)) return;
        const consoleFrame = document.createElement('iframe');
        consoleFrame.style.display = 'none';
        document.body.appendChild(consoleFrame);
        if (consoleFrame.contentWindow && consoleFrame.contentWindow.console) {
          window.console = consoleFrame.contentWindow.console;
          try { window.console.log('[KLITE RPMod] Console access restored via iframe'); } catch(_){}
        }
      } catch (e) {
        // Keep existing console; do not fail initialization
      }
    })();

    // =============================================
    // 0. LIGHTWEIGHT SHIMS FOR CONTEXT/COUNT ACCESS
    // =============================================
    function rpmod_count_tokens_safe(txt) {
      try { return (window.count_tokens ? window.count_tokens(String(txt||"")) : Math.ceil(String(txt||"").length/4)); } catch(_) { return Math.ceil(String(txt||"").length/4); }
    }
    function rpmod_concat_history_safe() {
      try { return (window.concat_gametext ? window.concat_gametext(true, "","","",false,true) : (Array.isArray(window.gametext_arr)?window.gametext_arr.join(""):"")); } catch(_) { return ""; }
    }
    function rpmod_get_max_allowed_chars(base) {
      try {
        if (typeof window.getMaxAllowedCharacters === 'function' && window.localsettings) {
          return window.getMaxAllowedCharacters(String(base||""), window.localsettings.max_context_length, window.localsettings.max_length);
        }
      } catch(_){ }
      // Fallback estimate: context minus generation, assume ~3.5 chars/token nominal
      try {
        const ls = window.localsettings || { max_context_length: 2048, max_length: 256 };
        const chars_per_token = 3.5 * ((ls.token_count_multiplier||100) * 0.01);
        return Math.max(1, Math.floor(((ls.max_context_length - ls.max_length) * chars_per_token)) - 12);
      } catch(_) { return 2048; }
    }
    // Prepend into Lite's pending_context_preinjection so our text sits at the end
    function rpmod_prepend_preinjection(injection) {
      if (!injection) return;
      try {
        const existing = (typeof window.pending_context_preinjection === 'string') ? window.pending_context_preinjection : '';
        const sep = (existing && !existing.startsWith("\n")) ? "\n\n" : "\n\n";
        window.pending_context_preinjection = String(injection) + sep + existing;
      } catch(_) {}
    }

    // Wrap Lite's chat_submit_generation so regular submit respects ROLES management
    (function setupSubmitWrapper(){
      try {
        // In panels-only mode, do not wrap/alter host submit behavior
        if (window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly) return;
        if (typeof window.chat_submit_generation === 'function' && !window._orig_chat_submit_generation) {
          window._orig_chat_submit_generation = window.chat_submit_generation;
          window.chat_submit_generation = function(){
            try {
              // If ROLES group is enabled, route to the panel's trigger
              if (KLITE_RPMod?.panels?.ROLES?.enabled) {
                return KLITE_RPMod.panels.ROLES.triggerCurrentSpeaker();
              }
              // Single mode: if persona/character are enabled, build a tail injection
              const tools = KLITE_RPMod?.panels?.TOOLS;
              const blocks = [];
              if (tools?.personaEnabled && tools?.selectedPersona) {
                const p = tools.selectedPersona;
                const pdesc = (p.description || p.content || '').trim();
                const ppers = (p.personality || '').trim();
                const pparts = [`[User Character: ${(p.name||'').trim()}]`];
                if (pdesc) pparts.push(`Description: ${pdesc}`);
                if (ppers) pparts.push(`Personality: ${ppers}`);
                blocks.push(pparts.join('\n'));
              }
              if (tools?.characterEnabled && tools?.selectedCharacter) {
                const c = tools.selectedCharacter;
                const cdesc = (c.description || c.content || '').trim();
                const cpers = (c.personality || '').trim();
                const cscn = (c.scenario || '').trim();
                const cn = (c.creator_notes || c.post_history_instructions || '').trim();
                const cparts = [`[Character: ${(c.name||'').trim()}]`];
                if (cdesc) cparts.push(`Description: ${cdesc}`);
                if (cpers) cparts.push(`Personality: ${cpers}`);
                if (cscn) cparts.push(`Scenario: ${cscn}`);
                if (cn) cparts.push(`Notes: ${cn}`);
                blocks.push(cparts.join('\n'));
                // also align AI name for single mode
                try { if (window.localsettings) window.localsettings.chatopponent = (c.name||window.localsettings.chatopponent||'AI'); } catch(_){ }
              }
              if (blocks.length>0) {
                const base = (window.current_temp_memory||'') + rpmod_concat_history_safe();
                const inj = blocks.join('\n\n');
                const cap = rpmod_get_max_allowed_chars(base);
                if (base.length + inj.length > cap) {
                  alert('Character data exceeds available context budget. Reduce character data to proceed.');
                  return;
                }
                rpmod_prepend_preinjection(inj);
              }
            } catch(_){ }
            return window._orig_chat_submit_generation();
          };
        }
      } catch(_){ }
    })();

    // =============================================
    // 1. COMPLETE CSS WITH ALL PANEL STYLES
    // =============================================

    // Some forks (e.g., esolite) may expose read-only globals; set avatars defensively
    try { if (typeof window.niko_square === 'undefined') window.niko_square = ''; } catch(_) {}
    try { if (typeof window.human_square === 'undefined') window.human_square = ''; } catch(_) {}
    
    // NOTE: Large portions of the CSS below relate to the full overlay UI and left/top panels.
    // In Esobold/Esolite panels-only integration, those sections are UNUSED and kept only
    // for reference. The right-panel styles and shared tokens remain relevant.
    const STYLES = `
        /* Map RPmod internal tokens to Esolite theme variables */
        :root {
            /* Background layers */
            --bg: var(--theme_color_bg_outer);
            --bg2: var(--theme_color_bg);
            --bg3: var(--theme_color_bg_dark);

            /* Text colors */
            --text: var(--theme_color_text);
            --glowtext: var(--theme_color_glow_text);
            --muted: var(--theme_color_placeholder_text);

            /* Borders and accents */
            --border: var(--theme_color_border);
            --border-highlight: var(--theme_color_border_highlight);
            --accent: var(--theme_color_highlight);

            /* Buttons and states */
            --primary: var(--theme_color_button_bg);
            --primary-text: var(--theme_color_button_text);
            --danger: #d9534f;
            --success: #5cb85c;
            --warning: #f0ad4e;
        }
        
        /* In full overlay mode, host UI is hidden via .klite-active (panelsOnly disables this) */
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
        
        /* UNUSED overlay/left UI START: left panel rules */
        .klite-panel-left {
            left: 0;
            top: 0;
            bottom: 0;
            width: 350px;
            border-right: 1px solid var(--border);
            z-index: 2;
        }
        
        .klite-panel-left.collapsed { transform: translateX(-350px); }
        /* UNUSED overlay/left UI END */
        
        .klite-panel-right {
            right: 0;
            top: 0;
            bottom: 0;
            width: 350px;
            border-left: 1px solid var(--border);
            z-index: 2;
        }
        
        .klite-panel-right.collapsed { transform: translateX(350px); }
        
        /* UNUSED overlay/left UI START: top panel rules */
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
        /* Fallback for browsers without :has() support: class is toggled on container */
        .klite-container.klite-fullscreen .klite-panel-top,
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

        /* Hide mode switch buttons across desktop and mobile */
        .klite-quick-btn[data-action="mode-1"],
        .klite-quick-btn[data-action="mode-2"],
        .klite-quick-btn[data-action="mode-3"],
        .klite-quick-btn[data-action="mode-4"] {
            display: none !important;
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
        /* Tablet sidepanel classes are overlay-only */
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
        /* UNUSED overlay/left UI END: top panel rules */
        
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
        
        /* UNUSED overlay/left UI: left handle */
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
        
        /* UNUSED overlay/left UI: top handle */
        .klite-panel-top .klite-handle {
            bottom: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 15px;
            border-radius: 0 0 5px 5px;
        }
        
        /* UNUSED overlay/left UI START: maincontent */
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
            top: 26px; 
        }

        /* Fullscreen mode */
        .klite-maincontent.fullscreen { 
            left: 0 !important; 
            right: 0 !important; 
        }

        /* Chat display (overlay-only) */
        .klite-chat {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px;
            margin: 25px 0 34px 0;
        }
        
        /* Input area (overlay-only) */
        .klite-input-area {
            display: flex;
            padding: 0 15px 15px;
            gap: 10px;
            position: relative;
        }
        /* UNUSED overlay/left UI END: maincontent */
        
        /* Tabs */
        .klite-tabs {
            display: flex;
            gap: 5px;
            padding: 10px;
            background: var(--theme_color_tabs);
            border-bottom: 1px solid var(--border);
        }
        
        .klite-tab {
            padding: 6px 12px;
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            min-width: 56px;
            white-space: nowrap;
            text-align: center;
        }
        /* Make klite-tab look like action buttons */
        .klite-tab.btn.btn-primary {
            background-color: var(--theme_color_button_bg) !important;
            color: var(--theme_color_button_text) !important;
            border-color: var(--theme_color_border) !important;
        }
        .klite-tab.btn.btn-primary:hover { background-color: var(--theme_color_topbtn_highlight) !important; }
        .klite-tab.btn.btn-primary.active { background-color: var(--theme_color_tabs_highlight) !important; }
        
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
            color: var(--glowtext);
        }
        
        .klite-section-header:hover { background: var(--bg3); }
        .klite-section.collapsed .klite-section-content { display: none; }
        
        .klite-section-content {
            padding: 15px;
        }
        
        /* Forms */
        .klite-input, .klite-textarea, .klite-select {
            width: 100%;
            padding: 8px;
            background: var(--theme_color_input_bg);
            border: 1px solid var(--theme_color_border);
            border-radius: 4px;
            color: var(--theme_color_input_text);
            font: inherit;
        }
        
        /* Default input height for desktop/tablet */
        .klite-textarea { resize: vertical; min-height: 80px; }
        /* Double-height input toggle (mobile-only) */
        .klite-container { --mobile-input-bottom: 212px; }
        .klite-textarea-fullheight { 
            resize: vertical; 
            min-height: 200px; 
            flex: 1; 
            height: 0; /* Important: allows flex to grow */
        }
        
        .klite-input:focus, .klite-textarea:focus, .klite-select:focus {
            outline: none;
            border-color: var(--border-highlight);
            box-shadow: none;
        }
        
        /* Buttons */
        .klite-btn {
            padding: 4px 8px;
            background: var(--primary);
            border: 1px solid var(--theme_color_border);
            border-radius: 4px;
            color: var(--primary-text);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .klite-btn:hover { background: var(--theme_color_topbtn_highlight); }
        /* When paired with Bootstrap classes, force theme colours */
        .klite-btn.btn.btn-primary {
            background-color: var(--theme_color_button_bg) !important;
            color: var(--theme_color_button_text) !important;
            border-color: var(--theme_color_border) !important;
        }
        
        /* Non-overlay mode: shift host content so panel doesn't overlap */
        body.klite-panels-nonoverlay-right { padding-right: 350px !important; box-sizing: border-box; }
        /* In case site uses common wrappers, nudge them too */
        body.klite-panels-nonoverlay-right #main,
        body.klite-panels-nonoverlay-right .container,
        body.klite-panels-nonoverlay-right .content,
        body.klite-panels-nonoverlay-right #content,
        body.klite-panels-nonoverlay-right .wrapper { padding-right: 350px; box-sizing: border-box; }
        .klite-btn.danger { background: var(--danger); border-color: var(--theme_color_border); }
        .klite-btn.danger:hover { filter: brightness(0.95); }
        .klite-btn.success { background: var(--success); border-color: var(--theme_color_border); }
        .klite-btn.warning { background: var(--warning); border-color: var(--theme_color_border); }
        .klite-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .klite-btn.danger:disabled { background: var(--theme_color_disabled_bg); border-color: var(--theme_color_border); color: var(--muted); }
        
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
            background: var(--theme_color_topbtn);
        }
        
        /* Info line */
        .klite-info {
            display: flex;
            justify-content: space-between;
            color: var(--muted);
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
        
        /* Tabs also look good using nav-link/mainnav; these ensure theme vars apply */
        .klite-tab.nav-link.mainnav { 
            color: var(--theme_color_topmenu_text);
            background-color: var(--theme_color_topbtn);
            border-color: var(--theme_color_border);
        }
        .klite-tab.nav-link.mainnav:hover { background-color: var(--theme_color_topbtn_highlight); }
        .klite-tab.nav-link.mainnav.active { background-color: var(--theme_color_tabs_highlight); }
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
        
        .klite-timeline-item:hover { background: var(--bg3); }
        
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
            border-color: var(--border-highlight) !important;
        }

        /* Character Avatar in Chat */
        .klite-chat-avatar {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            display: block;
            margin: 0 0 8px 0;
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
        
        .klite-character-item:hover { background: var(--bg3); }
        .klite-character-item.selected { background: var(--bg3); border: 1px solid var(--border-highlight); }
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
        /* Reduce image height in 2-column grid for better fit */
        .klite-character-grid .klite-char-image img {
            height: 180px;
            width: 100%;
            object-fit: cover;
            aspect-ratio: auto;
        }
        
        /* Detail view: allow full image scaling */
        .klite-character-detail .klite-char-image img {
            height: auto;
            width: 100%;
            aspect-ratio: 2/3;
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
            background: var(--bg3);
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
        
        .klite-memory-segment { background: #5bc0de; }
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
        
        .klite-dice-btn:hover { background: var(--bg3); border-color: var(--border-highlight); }
        
        .klite-dice-result { background: var(--bg3); border-radius: 4px; padding: 15px; text-align: center; min-height: 80px; }
        
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
            border-color: var(--border-highlight);
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
            border: 1px solid var(--theme_color_border);
            border-radius: 4px;
            color: var(--primary-text);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .klite-chars-empty-action:hover { background: var(--theme_color_topbtn_highlight); }
        
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
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
        }
        
        .klite-help-db-btn:hover { background: var(--bg2); border-color: var(--border-highlight); }
        
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
            background: var(--theme_color_input_bg);
            border: 1px solid var(--theme_color_border);
            border-radius: 4px;
            color: var(--theme_color_input_text);
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .klite-help-search-input:focus { outline: none; border-color: var(--border-highlight); box-shadow: none; }
        
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
        
        .klite-help-search-results { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; max-height: 400px; overflow-y: auto; }
        
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
        
        .klite-help-search-result:hover { background: var(--bg2); }
        
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
        
        .klite-help-result-category { font-size: 10px; color: var(--muted); background: var(--bg2); padding: 2px 6px; border-radius: 2px; white-space: nowrap; }
        
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
        
        .klite-help-modal-keywords { font-size: 12px; color: var(--muted); padding: 10px; background: var(--bg3); border-radius: 4px; border-left: 3px solid var(--border-highlight); }
        
        /* Help feature styles (existing, enhanced) */
        .klite-help-feature { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        
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
            border: 1px solid var(--theme_color_border);
            border-radius: 4px;
            color: var(--primary-text);
            cursor: pointer;
            font-size: 11px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .klite-char-worldinfo-action:hover { background: var(--theme_color_topbtn_highlight); }
        
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
            border-color: var(--theme_color_border);
            color: var(--primary-text);
        }
        
        .klite-char-action-btn.primary:hover { background: var(--theme_color_topbtn_highlight); }
        
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
        /* Double-height input toggle for mobile */
        .klite-mobile .klite-container.input-2x .klite-textarea { min-height: 244px !important; }
        .klite-mobile .klite-container.input-2x .klite-mobile-quick-buttons { bottom: var(--mobile-input-bottom) !important; }
        .klite-mobile .klite-container.input-2x .klite-mobile-edit-btn { bottom: var(--mobile-input-bottom) !important; }
        
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
            padding-bottom: 20px !important; /* Leave room for action buttons anchored at bottom */
        }
        
        .klite-mobile .klite-submit-btn {
            width: 32px !important;
            height: 100% !important; /* Fill column height above action buttons */
            font-size: 14px !important;
            flex: none !important;
            align-self: stretch !important;
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
        
        /* Mobile: show and reposition side handles so they remain usable */
        .klite-mobile .klite-panel-left .klite-handle,
        .klite-mobile .klite-panel-right .klite-handle {
            display: flex !important;
        }
        /* Left panel: keep handle visible in both states */
        .klite-mobile .klite-panel-left:not(.collapsed) .klite-handle { left: 0 !important; right: auto !important; }
        .klite-mobile .klite-panel-left.collapsed .klite-handle { right: -15px !important; left: auto !important; }
        /* Right panel: keep handle visible in both states */
        .klite-mobile .klite-panel-right:not(.collapsed) .klite-handle { right: 0 !important; left: auto !important; }
        .klite-mobile .klite-panel-right.collapsed .klite-handle { left: -15px !important; right: auto !important; }
        
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
            border: 1px solid var(--theme_color_border) !important;
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
            <button class="klite-btn btn btn-primary actbtn mainnav ${className}" ${action ? `data-action="${action}"` : ''}>${text}</button>
        `,

        textarea: (id, placeholder = '', value = '') => `
            <textarea id="${id}" class="klite-textarea form-control" placeholder="${placeholder}">${value}</textarea>
        `,

        input: (id, placeholder = '', type = 'text', value = '') => `
            <input type="${type}" id="${id}" class="klite-input form-control textbox" placeholder="${placeholder}" value="${value}">
        `,

        select: (id, options) => `
            <select id="${id}" class="klite-select form-control">
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
    // 3. KOBOLDAI LITE INTEGRATION VERIFICATION
    // =============================================

    const LiteAPI = {
        get settings() {
            return window.localsettings || null;
        },

        get memory() {
            return typeof window.current_memory === 'string' ? window.current_memory : '';
        },

        set memory(value) {
            if (typeof value === 'string') {
                window.current_memory = value;
            }
        },

        get worldInfo() {
            return Array.isArray(window.current_wi) ? window.current_wi : [];
        },

        set worldInfo(value) {
            if (Array.isArray(value)) {
                window.current_wi = value;
            }
        },

        get storage() {
            return {
                save: typeof window.indexeddb_save === 'function' ? window.indexeddb_save : null,
                load: typeof window.indexeddb_load === 'function' ? window.indexeddb_load : null
            };
        },

        generate() {
            if (typeof window.submit_generation_button === 'function') {
                return window.submit_generation_button();
            } else {
                console.warn('[KLITE RPMod] Generation function unavailable');
                return false;
            }
        },

        updateSettings(newSettings) {
            if (this.settings && typeof newSettings === 'object') {
                Object.assign(window.localsettings, newSettings);
                return true;
            }
            console.warn('[KLITE RPMod] Cannot update settings - localsettings unavailable');
            return false;
        },

        isAvailable() {
            return !!(window.localsettings && window.indexeddb_save && window.indexeddb_load);
        }
    };

    // Minimal CSS for panels-only mode (no full-screen overlay, no maincontent, no top panel)
    const STYLES_PANELS_ONLY = `
        :root {
            --bg: var(--theme_color_bg_outer);
            --bg2: var(--theme_color_bg);
            --bg3: var(--theme_color_bg_dark);
            --text: var(--theme_color_text);
            --glowtext: var(--theme_color_glow_text);
            --muted: var(--theme_color_placeholder_text);
            --border: var(--theme_color_border);
            --border-highlight: var(--theme_color_border_highlight);
            --accent: var(--theme_color_highlight);
            --primary: var(--theme_color_button_bg);
            --primary-text: var(--theme_color_button_text);
            --danger: #d9534f;
            --success: #5cb85c;
            --warning: #f0ad4e;
        }
        /* Wrapper that doesn't block host interactions */
        #klite-panels-only { position: fixed; inset: 0; pointer-events: none; z-index: 2147483638; }
        /* Panels remain interactive */
        .klite-panel { pointer-events: auto; position: fixed; background: var(--bg2); box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        /* v2: left panel removed */
        .klite-panel-right { right: 0; top: 0; bottom: 0; width: 350px; border-left: 1px solid var(--border); transition: transform 0.2s ease; }
        
        /* Move full panel width; left:-15px handle remains visible */
        .klite-panel-right.collapsed { transform: translateX(350px); }
        .klite-handle { position: absolute; background: var(--bg2); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; z-index: 9; pointer-events: auto; }
        .klite-handle:hover { background: var(--bg3); color: var(--text); }
        
        .klite-panel-right .klite-handle { left: -15px; top: 50%; transform: translateY(-50%); width: 15px; height: 50px; border-radius: 5px 0 0 5px; }
        .klite-tabs { display: flex; gap: 5px; padding: 10px; background: var(--theme_color_tabs); border-bottom: 1px solid var(--border); }
        .klite-tab { padding: 6px 12px; border: 1px solid transparent; border-radius: 6px; color: var(--theme_color_tabs_text); cursor: pointer; font-size: 10px; font-weight: bold; min-width: 56px; white-space: nowrap; text-align: center; background: var(--theme_color_topbtn); }
        .klite-tab:hover { background: var(--theme_color_topbtn_highlight); }
        .klite-tab.active { background: var(--theme_color_tabs_highlight); }
        .klite-content { overflow-y: auto; overflow-x: hidden; padding: 15px; max-height: calc(100vh - 60px); color: var(--text); }
        .klite-section { margin-bottom: 20px; background: var(--bg); border-radius: 5px; overflow: hidden; }
        .klite-section-header { padding: 10px 15px; background: var(--bg3); cursor: pointer; display: flex; justify-content: space-between; user-select: none; color: var(--glowtext); }
        .klite-section-header:hover { background: var(--bg3); }
        .klite-section.collapsed .klite-section-content { display: none; }
        .klite-section-content { padding: 15px; }
        /* Utilities */
        .klite-row { display: flex; gap: 2px; align-items: center; }
        .klite-buttons-left { display: flex; gap: 2px; justify-content: flex-start; }
        .klite-buttons-center { display: flex; gap: 2px; justify-content: center; }
        .klite-buttons-right { display: flex; gap: 2px; justify-content: flex-end; }
        .klite-buttons-spread { display: flex; gap: 2px; justify-content: space-between; }
        /* Inputs */
        .klite-input, .klite-textarea, .klite-select { width: 100%; padding: 6px 8px; background: var(--theme_color_input_bg); border: 1px solid var(--theme_color_border); border-radius: 4px; color: var(--theme_color_input_text); font: inherit; }
        .klite-textarea { resize: vertical; min-height: 80px; }
        .klite-input:focus, .klite-textarea:focus, .klite-select:focus { outline: none; border-color: var(--border-highlight); box-shadow: none; }
        /* Buttons */
        .klite-btn { padding: 4px 8px; background: var(--primary); border: 1px solid var(--theme_color_border); border-radius: 4px; color: var(--primary-text); cursor: pointer; font-size: 14px; transition: all 0.2s; }
        .klite-btn:hover { background: var(--theme_color_topbtn_highlight); }
        .klite-btn.btn.btn-primary { background-color: var(--theme_color_button_bg) !important; color: var(--theme_color_button_text) !important; border-color: var(--theme_color_border) !important; }
        .klite-btn.danger { background: var(--danger); border-color: #c9302c; }
        .klite-btn.danger:hover { background: #c9302c; }
        .klite-btn.success { background: var(--success); border-color: #4cae4c; }
        .klite-btn.warning { background: var(--warning); border-color: #eea236; }
        .klite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .klite-btn-sm { font-size: 12px; padding: 3px 6px; min-width: 26px; text-align: center; }
        .klite-btn-xs { font-size: 10px; padding: 2px 6px; min-height: 22px; }
        /* Dice (match v1) */
        .klite-dice-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 10px; }
        .klite-dice-btn { padding: 10px; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; transition: all 0.2s; }
        .klite-dice-btn:hover { background: var(--bg3); border-color: var(--border-highlight); }
        .klite-dice-result { background: var(--bg3); border-radius: 4px; padding: 15px; text-align: center; min-height: 80px; }

        /* Context Analyzer (token bar + legend) */
        .klite-token-bar-container { margin-bottom: 10px; }
        .klite-token-bar { display: flex; height: 20px; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
        .klite-token-segment { height: 100%; transition: width 0.3s ease; }
        .klite-memory-segment { background: #5bc0de; }
        .klite-wi-segment { background: #5cb85c; }
        .klite-story-segment { background: #f0ad4e; }
        .klite-anote-segment { background: #d9534f; }
        .klite-free-segment { background: var(--bg3); }
        .klite-token-legend { margin-bottom: 10px; font-size: 11px; }
        .klite-token-legend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
        .klite-token-legend-item { display: flex; align-items: center; gap: 4px; }
        .klite-token-legend-color { width: 12px; height: 12px; border-radius: 2px; }
        .klite-token-legend-label { color: var(--muted); }
        .klite-token-legend-value { color: var(--text); font-weight: bold; }

        /* Timeline (Bookmarks / Index) */
        .klite-timeline { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 8px; min-height: 200px; max-height: 400px; overflow-y: auto; }
        .klite-timeline-item { padding: 8px; margin-bottom: 4px; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
        .klite-timeline-item:hover { background: var(--bg3); }
    `;

    

    // =============================================
    // 3a. RPmod Host Adapter (Esolite-first)
    // =============================================

    // Thin wrapper over host (Esolite/Lite) state and storage.
    // RPmod should read/write host-native structures only.
    window.RPmodHostAdapter = {
        get settings() { return window.localsettings || null; },
        get theme() { return window.aestheticInstructUISettings || null; },
        async save(key, data) {
            if (!LiteAPI.storage.save) throw new Error('Host storage.save unavailable');
            return LiteAPI.storage.save(key, data);
        },
        async load(key) {
            if (!LiteAPI.storage.load) throw new Error('Host storage.load unavailable');
            return LiteAPI.storage.load(key, null);
        },
        updateSettings(patch) {
            if (!window.localsettings) return false;
            Object.assign(window.localsettings, patch || {});
            return true;
        },
        setTheme(patch) {
            if (!window.aestheticInstructUISettings) return false;
            Object.assign(window.aestheticInstructUISettings, patch || {});
            return true;
        },
        setMode(opmode, subMode) {
            if (!window.localsettings) return false;
            window.localsettings.opmode = opmode;
            if (typeof subMode === 'number') window.localsettings.adventure_switch_mode = subMode;
            return true;
        },
        // Characters unified store (no RPmod prefixes)
        async loadCharactersV3() {
            const raw = await this.load('characters_v3');
            if (!raw || raw === 'offload_to_indexeddb') return [];
            try {
                const data = JSON.parse(raw);
                if (Array.isArray(data)) return data;
                if (data && Array.isArray(data.characters)) return data.characters;
                return [];
            } catch(_) { return []; }
        },
        async saveCharactersV3(list) {
            const payload = JSON.stringify({ version:'3', saved:new Date().toISOString(), characters: Array.isArray(list)?list:[] });
            await this.save('characters_v3', payload);
        },
        applyCharacter(char, opts = {}) {
            if (!char || !window.localsettings) return false;
            // Single-opponent session
            window.localsettings.chatopponent = char.name || window.localsettings.chatopponent || 'AI';
            // Mirror portrait into Aesthetic
            try {
                if (window.aestheticInstructUISettings && (char.avatar || char.image)) {
                    window.aestheticInstructUISettings.AI_portrait = char.avatar || char.image;
                }
            } catch(_){}
            // Optional WI injection toggle handled by caller
            return true;
        },
        applyGroup(participantChars = []) {
            try {
                if (!window.localsettings) return false;
                const names = participantChars.map(c => (c && c.name) ? String(c.name).trim() : '').filter(Boolean);
                window.localsettings.chatopponent = names.join('\n');
                return true;
            } catch(_) { return false; }
        }
    };

    // =============================================
    // 4. DOM ELEMENT SAFETY UTILITIES
    // =============================================

    const DOMUtil = {
        safeGet(selector, context = document) {
            const element = context.getElementById ? context.getElementById(selector) : context.querySelector(`#${selector}`);
            if (!element) {
                console.warn(`[KLITE RPMod] Element not found: ${selector}`);
            }
            return element;
        },

        safeQuery(selector, context = document) {
            try {
                const element = context.querySelector(selector);
                if (!element) {
                    console.warn(`[KLITE RPMod] Element not found: ${selector}`);
                }
                return element;
            } catch (error) {
                console.warn(`[KLITE RPMod] Invalid selector: ${selector}`, error.message);
                return null;
            }
        },

        safeQueryAll(selector, context = document) {
            try {
                const elements = context.querySelectorAll(selector);
                if (elements.length === 0) {
                    console.warn(`[KLITE RPMod] No elements found: ${selector}`);
                }
                // Convert NodeList to Array for consistent return type
                return Array.from(elements);
            } catch (error) {
                console.warn(`[KLITE RPMod] Invalid selector: ${selector}`, error.message);
                return [];
            }
        },

        safeSet(elementOrId, property, value, context = document) {
            const element = typeof elementOrId === 'string' ? this.safeGet(elementOrId, context) : elementOrId;
            if (element && property in element) {
                element[property] = value;
                return true;
            }
            return false;
        },

        safeCall(elementOrId, method, ...args) {
            const element = typeof elementOrId === 'string' ? this.safeGet(elementOrId) : elementOrId;
            if (element && typeof element[method] === 'function') {
                return element[method](...args);
            }
            console.warn(`[KLITE RPMod] Cannot call ${method} on element:`, elementOrId);
            return null;
        }
    };

    // =============================================
    // 5. GLOBAL API EXPOSURE
    // =============================================

    // Expose LiteAPI and DOMUtil globally for testing and external access
    window.LiteAPI = LiteAPI;
    window.DOMUtil = DOMUtil;

    // =============================================
    // 6. MAIN MODULE WITH INTEGRATED PANELS  
    // =============================================

    window.KLITE_RPMod = {
        state: {
            tabs: { left: 'TOOLS', right: 'MEMORY' },
            collapsed: { left: false, right: false, top: false },
            generating: false,
            adventureMode: 0, // Default adventure sub-mode (0=story, 1=action, 2=dice)
            fullscreen: false,
            tabletSidepanel: false,
            // Mobile mode state
            mobile: {
                enabled: false,
                currentIndex: 5, // Start at Main view (index 5)
                sequence: ['TOOLS', 'CONTEXT', 'IMAGE', 'ROLES', 'HELP', 'MAIN', 'CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
            },
            inputScale2x: false
        },

        // Shared data
        characters: [],
        worldInfo: [],
        userConsentGranted: true,

        // Avatar system (disabled in chat)
        avatarsEnabled: false,
        groupAvatars: new Map(), // Map character ID -> avatar URL for group chat
        batchImportMode: false, // Flag to prevent individual saves during batch character imports

        // ===== Avatar Adapter (Esolite-first, Lite-optional) =====
        _avatarObserver: null,
        _avatarProcessed: new WeakSet(),

        enableLiteAvatarsExperimental(on) {
            try { this.state.avatarPolicy = this.state.avatarPolicy || {}; } catch(_){}
            this.state.avatarPolicy.liteExperimental = !!on;
            try { this.saveState(); } catch(_){}
            this.installAvatarAdapter();
        },

        getBestAvatarForName(name, isUser) {
            try {
                if (isUser) {
                    const persona = this.panels.TOOLS?.selectedPersona;
                    if (persona) return this.getBestCharacterAvatar(persona);
                    return this.userAvatarCurrent || this.userAvatarDefault;
                }
                const roles = this.panels.ROLES;
                if (roles?.activeChars && name) {
                    const found = roles.activeChars.find(c => c.name === name);
                    if (found) return this.getBestCharacterAvatar(found) || this.aiAvatarCurrent || this.aiAvatarDefault;
                }
                const character = this.panels.TOOLS?.selectedCharacter;
                if (character) return this.getBestCharacterAvatar(character) || this.aiAvatarCurrent || this.aiAvatarDefault;
                return this.aiAvatarCurrent || this.aiAvatarDefault;
            } catch(_) { return this.aiAvatarCurrent || this.aiAvatarDefault; }
        },

        processChatNodeForAvatar(node) {
            try {
                if (!node || this._avatarProcessed.has(node)) return;
                const img = node.querySelector?.('img, .avatar, .chat-avatar, .rp-avatar, .niko-avatar, .human-avatar');
                if (!img) return;
                const isUser = !!node.querySelector?.('.user, .message-user, .from-user, .right, .me');
                let speakerName = null;
                const nameEl = node.querySelector?.('.name, .speaker, .message-author, .author, .sender');
                if (nameEl && nameEl.textContent) speakerName = nameEl.textContent.trim();
                const avatarUrl = this.getBestAvatarForName(speakerName || (isUser ? (this.panels.TOOLS?.selectedPersona?.name || 'You') : (this.panels.TOOLS?.selectedCharacter?.name || 'AI')), isUser);
                if (avatarUrl && img && !img._rpmodAvatarSet) {
                    if (img.tagName === 'IMG') {
                        img.src = avatarUrl;
                    } else {
                        img.style.backgroundImage = `url(${avatarUrl})`;
                        img.style.backgroundSize = 'cover';
                    }
                    img._rpmodAvatarSet = true;
                    this._avatarProcessed.add(node);
                }
            } catch(_){}
        },

        installAvatarAdapter() {
            try {
                // Decide enablement: Esolite or Lite experimental
                const isEsolite = !!(document.getElementById('topbtn_data_manager') || document.getElementById('openTreeDiagram') || document.getElementById('topbtn_remote_mods'));
                this.state.avatarPolicy = this.state.avatarPolicy || { esoliteAdapter:false, liteExperimental:false };
                this.state.avatarPolicy.esoliteAdapter = !!isEsolite;
                const shouldEnable = isEsolite || this.state.avatarPolicy.liteExperimental;
                this.avatarsEnabled = shouldEnable;
                if (!shouldEnable) { this.uninstallAvatarAdapter(); return; }
                if (this._avatarObserver) return;
                const mo = new MutationObserver((mutations) => {
                    let count = 0;
                    for (const m of mutations) {
                        if (m.type !== 'childList') continue;
                        m.addedNodes?.forEach(n => {
                            if (!(n instanceof HTMLElement)) return;
                            if (count > 50) return; // cap
                            const hasText = n.textContent && n.textContent.trim().length > 0;
                            if (!hasText) return;
                            this.processChatNodeForAvatar(n);
                            count++;
                        });
                    }
                });
                // Observe primary chat containers if available, else fallback to body
                const targets = [];
                const t1 = document.getElementById('gametext');
                const t2 = document.getElementById('chat-display');
                if (t1) targets.push(t1);
                if (t2 && t2 !== t1) targets.push(t2);
                if (targets.length === 0) targets.push(document.body);
                targets.forEach(t => { try { mo.observe(t, { childList: true, subtree: true }); } catch(_){} });
                this._avatarObserver = mo;
                this._avatarProcessed = new WeakSet();
                this.log('avatars', `Avatar adapter installed (mode=${isEsolite?'esolite':'lite'}).`);
            } catch (e) {
                this.log('avatars', `Avatar adapter error: ${e?.message}`);
            }
        },

        uninstallAvatarAdapter() {
            try { this._avatarObserver?.disconnect?.(); } catch(_){}
            this._avatarObserver = null;
            this._avatarProcessed = new WeakSet();
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
            // 'Ctrl+Shift+U': { action: 'hotswap_ui', description: 'Toggle RPmod ↔ Lite UI' },
            'Ctrl+Shift+E': { action: 'toggle_edit_mode', description: 'Toggle Edit Mode' },

            // Panel Navigation (right panel only)
            'Ctrl+Shift+C': { action: 'switch_panel_chars', description: 'Switch to CHARS Panel' },
            'Ctrl+Shift+G': { action: 'switch_panel_group', description: 'Switch to ROLES Panel' },
            'Ctrl+Shift+T': { action: 'switch_panel_tools', description: 'Switch to TOOLS Panel' },
            'Ctrl+Shift+M': { action: 'switch_panel_context', description: 'Switch to CONTEXT Panel' },
            'Ctrl+Shift+S': { action: 'switch_panel_image', description: 'Switch to IMAGE Panel' },

            // Panel Toggle (Right panel)
            'Ctrl+Shift+K': { action: 'toggle_right_panel', description: 'Toggle Right Panel' },

            // Input Focus Management
            'Tab': { action: 'cycle_input_focus', description: 'Cycle Input Focus' },
            'Ctrl+Shift+F': { action: 'focus_main_input', description: 'Focus Main Input' }
        },

        // Debug configuration
        debug: true, // Enable debug mode
        debugLevels: {
            essential: true,    // Major operations (init, save, import, scenario start)
            init: false,
            hooks: false,
            panels: false,
            group: true,
            avatars: true,
            chars: false,
            generation: false,  // Disable Horde status logging
            state: false,
            integration: false,
            hotkeys: false,
            debug: false,       // Disable debug logging
            errors: true,       // Always show errors
            chat: false,
            mobile: false,
            status: false
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

        essential(message, ...args) {
            // Always log essential operations regardless of debug levels
            this.log('essential', message, ...args);
        },

        // Helper to toggle avatar/chat debugging; pass 'verbose' for URL preview
        debugAvatars(enable = true) {
            this.debugLevels.avatars = !!enable;
            this.debugLevels.chat = !!enable;
            this.log('avatars', `Debug avatars set to ${enable}`);
            // Print quick summary of active defaults and group participants
            try {
                this.ensureDefaultAvatars();
                const verbose = (enable === 'verbose');
                const trim = (s) => (typeof s === 'string' ? (s.length > 80 ? s.slice(0, 80) + '…' : s) : s);
                const describe = (u) => {
                    if (!u) return 'none';
                    if (typeof u !== 'string') return 'unknown';
                    if (u.startsWith('data:')) {
                        const m = u.match(/^data:([^;]+);base64,(.*)$/);
                        const mime = m ? m[1] : 'data';
                        const len = m ? m[2].length : u.length;
                        return verbose ? `data:${mime} len=${len} ${trim(u)}` : `data:${mime} len=${len}`;
                    }
                    try {
                        const url = new URL(u, window.location.href);
                        return verbose ? `${url.origin}${url.pathname} ${trim(u)}` : url.origin;
                    } catch (_) {
                        return verbose ? trim(u) : 'string';
                    }
                };
                this.log('avatars', `aiAvatarDefault=${describe(this.aiAvatarDefault)}, userAvatarDefault=${describe(this.userAvatarDefault)}`);
                this.log('avatars', `aiAvatarCurrent=${describe(this.aiAvatarCurrent)}, userAvatarCurrent=${describe(this.userAvatarCurrent)}`);
                if (this.panels.ROLES?.enabled) {
                    const names = (this.panels.ROLES.activeChars || []).map(c => `${c.name} (avatar=${!!c.avatar}, image=${!!c.image})`);
                    this.log('avatars', `group enabled, participants=${names.join(', ')}`);
                } else {
                    this.log('avatars', 'group disabled');
                }
            } catch (e) {
                this.log('avatars', `debugAvatars summary error: ${e.message}`);
            }
        },

        async init() {
            if (this._initialized) { this.log('init', 'Already initialized, skipping'); return; }
            this._initialized = true;
            this.essential('🚀 KLITE RP Mod initializing...');

            try {
                // Inject CSS
                const style = document.createElement('style');
                style.id = 'klite-rpmod-styles';
                // v2: Esobold-only; always use panels-only CSS
                style.textContent = STYLES_PANELS_ONLY;
                document.head.appendChild(style);
                this.log('init', 'CSS injected');

                // Load state (non-blocking failure ok)
                try {
                    await this.loadState();
                    this.log('init', 'State loaded:', this.state);
                } catch (e) {
                    this.log('init', 'State load skipped/failed (non-blocking):', e.message);
                }

                const panelsOnly = !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly);

                // In panels-only mode, do not wrap host or replace main content
                if (panelsOnly) {
                    // Ensure the minimal right-panel container exists before loading content
                    try { this.buildPanelsOnlyUI(); } catch(_) {}
                    this.loadPanel('right', this.state.tabs.right);
                    this.syncTabButtonStates();

                    // Install settings enhancer to add RPmod checkbox under Advanced
                    try { this.installSettingsEnhancer(); } catch(_){}
                    // Apply initial non-overlay state (if set)
                    try { this.updatePanelsOnlyOverlayPadding(); } catch(_){}

                    // Initialize mobile detection and attach resize listener in panels-only mode
                    try { this.initializeMobileMode(); } catch(_){}
                    try { window.addEventListener('resize', () => { try { this.handleResize(); } catch(_){} }); } catch(_){}

                    // Sync colors with Esobold/Lite active theme
                    this.applyPanelsHostTheme();
                    this.startPanelsThemeObserver();

                    // Defer storage init and character load so CHARS data is available for selection modals
                    Promise.resolve().then(async () => {
                        try { await this.initializeStorageKeys(); } catch(_) {}
                        try { await this.loadCharacters(); this.log('init', 'Characters loaded (panels-only):', this.characters.length); } catch(_) {}
                    });

                    this.essential('✅ KLITE RP Mod (panels-only) ready');
                    return; // Skip the rest of invasive hooks/features
                }

                // Install write guards before any potential writes
                this.installWriteGuards();

                // Build full overlay UI
                this.buildUI();
                this.log('init', 'UI built');

                // Initialize mobile mode detection
                this.initializeMobileMode();
                // Ensure submit button reflects current mode immediately (icons on mobile)
                this.updateSubmitBtn();
                // Initialize input scale toggle label and class (mobile only)
                setTimeout(() => {
                    try {
                        const container = document.getElementById('klite-container');
                        container.classList.toggle('input-2x', this.state.inputScale2x);
                        const b = document.getElementById('btn-input-scale-mobile');
                        if (b) b.textContent = this.state.inputScale2x ? '1x' : '2x';
                    } catch(_){}
                }, 0);

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

                // Restore visual theme (non-blocking)
                try { await this.restoreVisualTheme(); } catch (e) { this.log('init', 'Visual theme restore skipped:', e.message); }
                // Start live theme sync to host
                this.startThemeObserver();

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

                // Mark active (only for full overlay mode)
                document.body.classList.add('klite-active');

                // Avatars disabled for chat stability; do not override Lite avatar globals

                // Defer storage init and character load until after UI is visible
                Promise.resolve().then(async () => {
                    try {
                        await this.initializeStorageKeys();
                    } catch (e) {
                        this.log('init', 'initializeStorageKeys failed/declined (non-blocking):', e.message || e);
                    }
                    // Load unified embed preference (default: true)
                    try {
                        const raw = await this.loadFromLiteStorage('rpmod_unified_embed');
                        window._rpmod_embed_unified = (raw === null) ? true : (raw === '1' || raw === 'true');
                    } catch (_) { window._rpmod_embed_unified = true; }
                    try {
                        await this.loadCharacters();
                        this.log('init', 'Characters loaded (deferred):', this.characters.length);
                        // Refresh panels that depend on characters
                        this.panels.CHARS?.refresh?.();
                        this.panels.ROLES?.refresh?.();
                    } catch (e) {
                        this.log('init', 'Deferred character load failed:', e.message || e);
                    }
                });

                this.essential('✅ KLITE RP Mod initialized successfully');
                try { this.installAvatarAdapter(); } catch(_){}
                // Ensure save/load hooks are installed even if bootstrap timing differed
                try {
                    // Only embed RPmod bundle if explicitly enabled by config
                    window.KLITE_RPMod_Config = window.KLITE_RPMod_Config || {};
                    if (!window._rpmod_orig_generate_savefile && typeof window.generate_savefile === 'function') {
                        window._rpmod_orig_generate_savefile = window.generate_savefile;
                        window.generate_savefile = function(save_images, export_settings, export_aesthetic_settings){
                            const obj = window._rpmod_orig_generate_savefile.apply(this, arguments);
                            try {
                                if (window.KLITE_RPMod_Config.embedInSave === true) {
                                    const bundle = window.KLITE_RPMod?.getSaveBundle?.();
                                    if (bundle) obj.rpmod = bundle;
                                }
                            } catch(_){}
                            return obj;
                        };
                    }
                } catch(_){}
                try {
                    if (!window._rpmod_orig_kai_json_load && typeof window.kai_json_load === 'function') {
                        window._rpmod_orig_kai_json_load = window.kai_json_load;
                        window.kai_json_load = function(){
                            try {
                                const storyobj = arguments[0];
                                if (storyobj && storyobj.rpmod) {
                                    window._rpmod_pending_restore_bundle = storyobj.rpmod;
                                }
                            } catch(_){}
                            const res = window._rpmod_orig_kai_json_load.apply(this, arguments);
                            try {
                                if (window._rpmod_pending_restore_bundle && window.KLITE_RPMod?.restoreFromSaveBundle) {
                                    window.KLITE_RPMod.restoreFromSaveBundle(window._rpmod_pending_restore_bundle);
                                    window._rpmod_pending_restore_bundle = null;
                                }
                            } catch(_){}
                            return res;
                        };
                    }
                } catch(_){}
            } catch (error) {
                this.error('Failed to initialize:', error);
                this._initialized = false; // allow retry on failure
                throw error;
            }
        },

        installWriteGuards() {
            try {
                if (window.indexeddb_save && !window._rpmod_indexeddb_save_wrapped) {
                    const orig = window.indexeddb_save;
                    window.indexeddb_save = async (...args) => {
                        const ok = await KLITE_RPMod.ensureConsent();
                        if (!ok) return Promise.reject('User declined consent');
                        return orig.apply(window, args);
                    };
                    window._rpmod_indexeddb_save_wrapped = true;
                }
                if (window.localsettings && !window._rpmod_localsettings_wrapped) {
                    const target = window.localsettings;
                    window.localsettings = new Proxy(target, {
                        set(obj, prop, value) {
                            if (!KLITE_RPMod.userConsentGranted) {
                                try { KLITE_RPMod.showConsentModal(); } catch (_) {}
                                return true;
                            }
                            obj[prop] = value;
                            // React to host theme changes instantly
                            if (prop === 'colortheme') {
                                try { KLITE_RPMod.onHostThemeChanged(value); } catch(_){}
                            }
                            return true;
                        }
                    });
                    window._rpmod_localsettings_wrapped = true;
                }
            } catch (e) {
                this.log('init', 'installWriteGuards error:', e.message);
            }
        },

        // =============== Unified Save helpers (available after init) ===============
        buildUnifiedSave() {
            try {
                const core = generate_savefile(true, true, true);
                core.rpmod = this.collectRpmodState();
                core.rpmod_version = '1';
                return core;
            } catch (e) {
                this.error('Failed to build unified save:', e);
                return generate_savefile(true, true, true);
            }
        },

        buildUnifiedCompressed() {
            const unified = this.buildUnifiedSave();
            const storyjson = JSON.stringify(unified);
            return buf_to_b64(lz_c.compress(storyjson, 1));
        },

        collectRpmodState() {
            const scene = null; // theming handled by host
            const playrp = this.panels.TOOLS ? {
                rules: this.panels.TOOLS.rules || '',
                selectedCharacter: this.panels.TOOLS.selectedCharacter || null,
                characterEnabled: !!this.panels.TOOLS.characterEnabled,
                selectedPersona: this.panels.TOOLS.selectedPersona || null,
                personaEnabled: !!this.panels.TOOLS.personaEnabled,
                autoSender: this.panels.TOOLS.autoSender ? { ...this.panels.TOOLS.autoSender } : null
            } : null;
            const group = this.panels.ROLES ? {
                participants: Array.isArray(this.panels.ROLES.activeChars)
                  ? this.panels.ROLES.activeChars.map(c => ({
                      id: c.id,
                      name: c.name,
                      description: c.description || c.content || '',
                      personality: c.personality || '',
                      scenario: c.scenario || '',
                      creator_notes: c.creator_notes || c.post_history_instructions || '',
                      image: c.image,
                      avatar: c.avatar,
                      isCustom: !!c.isCustom,
                      talkativeness: c.talkativeness,
                      keywords: Array.isArray(c.keywords) ? [...c.keywords] : undefined
                  }))
                  : [],
                currentSpeaker: typeof this.panels.ROLES.currentSpeaker === 'number' ? this.panels.ROLES.currentSpeaker : 0,
                lastSpeaker: typeof this.panels.ROLES.lastSpeaker === 'number' ? this.panels.ROLES.lastSpeaker : -1,
                speakerMode: this.panels.ROLES.speakerMode || 'manual',
                speakerHistory: Array.isArray(this.panels.ROLES.speakerHistory) ? this.panels.ROLES.speakerHistory.slice(-20) : []
            } : null;
            const chat = this.panels.PLAY_CHAT ? {
                chatStyle: this.panels.PLAY_CHAT.chatStyle || 'mobile'
            } : null;
            const avatars = {
                userCurrent: this.userAvatarCurrent || null,
                aiCurrent: this.aiAvatarCurrent || null
            };
            const ui = {
                tabs: { ...this.state.tabs },
                collapsed: { ...this.state.collapsed },
                adventureMode: this.state.adventureMode || 0,
                fullscreen: !!this.state.fullscreen,
                tabletSidepanel: !!this.state.tabletSidepanel,
                avatarPolicy: this.state.avatarPolicy ? { ...this.state.avatarPolicy } : { esoliteAdapter:false, liteExperimental:false }
            };
            return { scene, playRP: playrp, group, chat, avatars, ui };
        },

        importRpmodBlock(block) {
            try {
                if (!block || typeof block !== 'object') return;
                // Scene/theme import removed
                if (block.playRP && this.panels.TOOLS) {
                    const p = block.playRP;
                    this.panels.TOOLS.rules = p.rules || '';
                    this.panels.TOOLS.selectedCharacter = p.selectedCharacter || null;
                    this.panels.TOOLS.characterEnabled = !!p.characterEnabled;
                    this.panels.TOOLS.selectedPersona = p.selectedPersona || null;
                    this.panels.TOOLS.personaEnabled = !!p.personaEnabled;
                    if (p.autoSender) this.panels.TOOLS.autoSender = { ...p.autoSender };
                }
                if (block.group && this.panels.ROLES) {
                    const g = block.group;
                    // Prefer full participant data when present; otherwise keep minimal
                    this.panels.ROLES.activeChars = Array.isArray(g.participants)
                      ? g.participants.map(c => ({ ...c }))
                      : [];
                    this.panels.ROLES.currentSpeaker = typeof g.currentSpeaker === 'number' ? g.currentSpeaker : 0;
                    if (typeof g.lastSpeaker === 'number') this.panels.ROLES.lastSpeaker = g.lastSpeaker;
                    this.panels.ROLES.speakerMode = g.speakerMode || 'manual';
                    if (Array.isArray(g.speakerHistory)) this.panels.ROLES.speakerHistory = g.speakerHistory.slice(-20);
                }
                if (block.chat && this.panels.PLAY_CHAT) {
                    this.panels.PLAY_CHAT.chatStyle = block.chat.chatStyle || this.panels.PLAY_CHAT.chatStyle;
                }
                if (block.ui) {
                    this.state.tabs = { ...this.state.tabs, ...block.ui.tabs };
                    this.state.collapsed = { ...this.state.collapsed, ...block.ui.collapsed };
                    this.state.adventureMode = block.ui.adventureMode || 0;
                    this.state.fullscreen = !!block.ui.fullscreen;
                    this.state.tabletSidepanel = !!block.ui.tabletSidepanel;
                    if (block.ui.avatarPolicy) this.state.avatarPolicy = { ...block.ui.avatarPolicy };
                    try { this.installAvatarAdapter(); } catch(_){}
                }
                if (block.avatars) {
                    if (block.avatars.userCurrent) this.userAvatarCurrent = block.avatars.userCurrent;
                    if (block.avatars.aiCurrent) this.aiAvatarCurrent = block.avatars.aiCurrent;
                }
                this.updateModeButtons?.();
                // Make sure quick-save slots load before re-rendering slot labels
                try {
                    // quick save slots removed in TOOLS (formerly PLAY_RP); no load required
                    if (loadSlots && typeof loadSlots.then === 'function') {
                        loadSlots.then(() => {
                            // Refresh only if TOOLS is the active left tab
                            if (this.state?.tabs?.left === 'TOOLS') this.loadPanel('left', 'TOOLS');
                        }).catch(() => {
                            // Refresh only if TOOLS is the active left tab
                            if (this.state?.tabs?.left === 'TOOLS') this.loadPanel('left', 'TOOLS');
                        });
                    } else {
                        // Synchronous fallback: refresh only if TOOLS is active
                        if (this.state?.tabs?.left === 'TOOLS') this.loadPanel('left', 'TOOLS');
                    }
                } catch(_) {}
                this.panels.ROLES?.refresh?.();
                this.panels.PLAY_CHAT?.formatChatContent?.();
            } catch (e) {
                this.error('Failed to import rpmod block:', e);
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
            this.state.tabs.left = 'TOOLS';
            this.state.tabs.right = 'CHARS';

            this.log('init', `Startup configuration: Synced to Lite's mode ${currentMode} (${this.getMode()})`);
        },

        async restoreVisualTheme() {
            // Sync RPmod to the host (Lite/Esolite) theme without changing host UI.
            try {
                const cs = document.body.classList;
                // Prefer explicit setting from host settings, fallback to body class detection.
                let ct = (typeof window.localsettings !== 'undefined' && typeof window.localsettings.colortheme !== 'undefined')
                    ? Number(window.localsettings.colortheme) : null;

                if (ct == null || Number.isNaN(ct)) {
                    // Detect active theme class from host (theme-1..theme-10)
                    for (let i = 10; i >= 1; i--) {
                        if (cs.contains(`theme-${i}`)) { ct = i; break; }
                    }
                    if (ct == null) ct = 0; // Default host theme
                }

                // Map to RPmod's Lite theme keys (lite0..liteN)
                const themeKey = `lite${Math.max(0, Math.min(10, ct))}`;

                // Apply mapping via SCENE's theme engine to reuse its CSS variable bridge
                if (this.panels?.SCENE?.applyTheme) {
                    this.panels.SCENE.applyTheme(themeKey);
                    this.log('init', `Applied host theme to RPmod: ${themeKey}`);
                }
            } catch (e) {
                this.log('init', `Theme sync skipped: ${e?.message || e}`);
            }
        },

        startThemeObserver() {
            try {
                // Prevent duplicates
                if (this._themeObserver) return;

                // Helper to read current host theme index from body classes
                const readHostThemeIndex = () => {
                    const cs = document.body.classList;
                    for (let i = 10; i >= 0; i--) {
                        if (cs.contains(`theme-${i}`)) return i;
                    }
                    return 0; // default
                };

                // Initial cache of applied theme
                this._lastAppliedHostThemeKey = this._lastAppliedHostThemeKey || null;

                // Observe body.class changes
                this._themeObserver = new MutationObserver(() => {
                    try {
                        const idx = readHostThemeIndex();
                        const key = `lite${Math.max(0, Math.min(10, Number(idx) || 0))}`;
                        if (this._lastAppliedHostThemeKey === key) return; // no-op
                        if (this.panels?.SCENE?.applyTheme) {
                            this.panels.SCENE.applyTheme(key);
                            this._lastAppliedHostThemeKey = key;
                            this.log('init', `Theme observer: host class changed → ${key}`);
                        }
                    } catch (e) {
                        this.log('init', `Theme observer error: ${e?.message || e}`);
                    }
                });
                this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                this.log('init', 'Theme observer installed');
            } catch (e) {
                this.log('init', `Theme observer skipped: ${e?.message || e}`);
            }
        },

        onHostThemeChanged(idx) {
            try {
                const key = `lite${Math.max(0, Math.min(10, Number(idx) || 0))}`;
                if (this._lastAppliedHostThemeKey === key) return; // no-op
                if (this.panels?.SCENE?.applyTheme) {
                    this.panels.SCENE.applyTheme(key);
                    this._lastAppliedHostThemeKey = key;
                    this.log('init', `Host theme changed → ${key}`);
                }
            } catch (e) {
                this.log('init', `onHostThemeChanged error: ${e?.message || e}`);
            }
        },

        // Panels-only UI: only right panel, no top/main overlay
        buildPanelsOnlyUI() {
            this.log('init', 'Building panels-only UI...');

            // Wrapper that doesn't block host interactions
            let wrapper = document.getElementById('klite-panels-only');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'klite-panels-only';
                document.body.appendChild(wrapper);
            }

            // Construct only the right panel with requested tabs
            wrapper.innerHTML = `
                <div class="klite-panel klite-panel-right ${this.state.collapsed?.right ? 'collapsed' : ''}" id="panel-right">
                    <div class="klite-handle" data-panel="right">${this.state.collapsed?.right ? '◀' : '▶'}</div>
                    <div class="klite-tabs" data-panel="right">
                        ${['CHARS', 'ROLES', 'TOOLS', 'CONTEXT', 'IMAGE'].map(t =>
                            `<div class=\"klite-tab btn actbtn btn-primary mainnav ${t === this.state.tabs?.right ? 'active' : ''}\" data-tab=\"${t}\">${t}</div>`
                        ).join('')}
                    </div>
                    <div class="klite-content" id="content-right"></div>
                </div>
            `;

            // Limit event delegation to panel wrapper only
            wrapper.addEventListener('click', e => this.handleClick(e));
            wrapper.addEventListener('input', e => this.handleInput(e));
            wrapper.addEventListener('change', e => this.handleChange(e));
            wrapper.addEventListener('dragover', e => this.handleDragOver(e));
            wrapper.addEventListener('dragleave', e => this.handleDragLeave(e));
            wrapper.addEventListener('drop', e => this.handleDrop(e));

            // In panels-only mode, also delegate modal clicks at document level
            document.addEventListener('click', e => {
                if (e.target.closest('.klite-modal')) {
                    this.handleModalClick(e);
                }
            }, true);

            // Safety net: route any clicks within the panels-only wrapper to handler (in case wrapper listeners miss)
            document.addEventListener('click', e => {
                if (e.target.closest('#klite-panels-only')) {
                    this.handleClick(e);
                }
            }, true);

            // Ensure initial overlay padding state is applied
            try { this.updatePanelsOnlyOverlayPadding?.(); } catch(_) {}

            this.log('init', 'Panels-only UI built');
        },

        // Right Panel-only theme: approximate Esobold’s active theme by sampling host styles
        applyPanelsHostTheme() {
            try {
                const wrap = document.getElementById('klite-panels-only');
                if (!wrap) return;

                // Bind panel CSS vars directly to Esolite theme vars (no hardcoded RGBs)
                const binding = {
                    bg: 'var(--theme_color_bg_outer)',
                    bg2: 'var(--theme_color_bg)',
                    bg3: 'var(--theme_color_bg_dark)',
                    text: 'var(--theme_color_text)',
                    muted: 'var(--theme_color_placeholder_text)',
                    border: 'var(--theme_color_border)',
                    'border-highlight': 'var(--theme_color_border_highlight)',
                    accent: 'var(--theme_color_highlight)',
                    primary: 'var(--theme_color_button_bg)',
                    'primary-text': 'var(--theme_color_button_text)'
                };
                Object.entries(binding).forEach(([k, v]) => { try { wrap.style.setProperty(`--${k}`, v); } catch(_){} });
                this.log('init', 'Applied theme variable bindings to panels-only wrapper');
            } catch (e) { this.log('init', `Theme apply skipped: ${e?.message || e}`); }
        },

        startPanelsThemeObserver() {
            try {
                if (this._panelsThemeObserver) return;
                this._panelsThemeObserver = new MutationObserver(() => {
                    try { this.applyPanelsHostTheme(); } catch(_){}
                });
                this._panelsThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
                // Also listen to color theme changes via localsettings proxy if available
                this.log('init', 'Panels theme observer installed');
            } catch (e) { this.log('init', `Panels theme observer skipped: ${e?.message || e}`); }
        },

        // computeHostColorsFromDOM removed in v2 (unused)

        handleClick(e) {
            // Collapse/expand handle
            const handleEl = e.target.closest('.klite-handle');
            if (handleEl && handleEl.dataset.panel) {
                e.preventDefault();
                e.stopPropagation();
                this.togglePanel(handleEl.dataset.panel);
                try { if (this.state.mobile.enabled) this.updateMobileNavigationButtons?.(); } catch(_){}
                return;
            }

            // Tabs
            const tabEl = e.target.closest('.klite-tab');
            if (tabEl) {
                e.preventDefault();
                e.stopPropagation();
                const panelSide = tabEl.closest('[data-panel]')?.dataset?.panel || 'right';
                const tab = tabEl.dataset.tab;
                this.switchTab(panelSide, tab);
                return;
            }

            // Actions
            const actionElement = e.target.closest('[data-action]');
            if (actionElement) {
                e.preventDefault();
                e.stopPropagation();
                this.handleAction(actionElement.dataset.action, e, actionElement);
                return;
            }

            // Bottom buttons
            if (['btn-1', 'btn-1-mobile-story', 'btn-1-mobile-adventure', 'btn-1-mobile-chat'].includes(e.target.id)) {
                this.bottomAction(0); return;
            }
            if (['btn-2', 'btn-2-mobile-story', 'btn-2-mobile-adventure', 'btn-2-mobile-chat'].includes(e.target.id)) {
                this.bottomAction(1); return;
            }
            if (['btn-3', 'btn-3-mobile-story', 'btn-3-mobile-adventure', 'btn-3-mobile-chat'].includes(e.target.id)) {
                this.bottomAction(2); return;
            }

            // Section headers
            if (e.target.closest('.klite-section-header')) {
                this.handleSectionToggle(e);
                return;
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
            // Find the closest actionable element inside the modal
            const actionElement = e.target.closest('[data-action]');
            const action = actionElement?.dataset?.action;
            this.log('state', `Handling modal action: ${action || 'none'}`);
            if (action) {
                // Route modal actions to main handleAction function
                this.handleAction(action, e, actionElement);
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

        // Align floating quick controls to sit right above the input area in mobile mode
        updateMobileInputLift() {
            if (!this.state.mobile.enabled) return;
            try {
                const container = document.getElementById('klite-container');
                if (!container) return;
                const is2x = container.classList.contains('input-2x');
                // In 1x keep original positions; in 2x place quick/edit at 276px from bottom
                const quickBottom = is2x ? 276 : 90;
                container.style.setProperty('--mobile-input-bottom', quickBottom + 'px');
                this.log('mobile', `Floating controls bottom set to ${quickBottom}px`);

                // Move mobile nav arrows to match quick/edit position in 2x
                const leftArrow = document.getElementById('mobile-nav-left');
                const rightArrow = document.getElementById('mobile-nav-right');
                const navBottom = is2x ? 276 : 155;
                if (leftArrow) leftArrow.style.bottom = navBottom + 'px';
                if (rightArrow) rightArrow.style.bottom = navBottom + 'px';
            } catch (e) {
                this.log('mobile', 'updateMobileInputLift error:', e.message);
            }
        },

        executeHotkeyAction(action) {
            this.log('hotkeys', `Executing action: ${action}`);

            switch (action) {
                // case 'hotswap_ui':
                //     this.toggleUI();
                //     break;
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
                case 'switch_panel_chars':
                    this.switchTab('right', 'CHARS');
                    break;
                case 'switch_panel_image':
                    this.switchTab('right', 'IMAGE');
                    break;
                case 'switch_panel_group':
                    this.switchTab('right', 'ROLES');
                    break;
                case 'switch_panel_tools':
                    this.switchTab('right', 'TOOLS');
                    break;
                case 'switch_panel_context':
                    this.switchTab('right', 'CONTEXT');
                    break;
                // Panel toggles
                case 'toggle_right_panel':
                    this.togglePanel('right');
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

        // UI toggle is unused in v2 (Esobold panels-only). Keep a tiny no-op.
        toggleUI() {
            this.log('hotkeys', 'toggleUI is disabled in v2 (panels-only)');
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

        handleAction(action, event, target = event.target) {
            this.log('state', `Handling action: ${action}`);

            switch (action) {
                case 'back': window.btn_back?.(); break;
                case 'forward': window.btn_redo?.(); break;
                case 'retry': window.btn_retry?.(); break;
                case 'fullscreen': this.toggleFullscreen(); break;
                case 'tablet-sidepanel': this.toggleTabletSidepanel(); break;
                case 'toggle-input-scale':
                    // Toggle 2x/1x input height (mobile-only effect)
                    this.state.inputScale2x = !this.state.inputScale2x;
                    try {
                        const container = document.getElementById('klite-container');
                        container.classList.toggle('input-2x', this.state.inputScale2x);
                        const b = document.getElementById('btn-input-scale-mobile');
                        if (b) b.textContent = this.state.inputScale2x ? '1x' : '2x';
                        // Recompute alignment to input top after layout settles
                        setTimeout(() => { try { this.updateMobileInputLift(); } catch(_){} }, 0);
                    } catch(_){}
                    break;
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
                case 'context': this.switchTab('left', 'CONTEXT'); break;
                case 'memory': this.switchTab('right', 'MEMORY'); break;
                case 'images': window.add_media_btn_menu?.(); break;
                case 'samplers': window.display_settings?.(); break;
                case 'edit': this.toggleEdit(); break;

                // Modal actions
                case 'confirm-unified-char-selection':
                    const mode = target.dataset.mode || target.closest('[data-mode]')?.dataset.mode;
                    if (mode) this.confirmUnifiedCharacterSelection(mode);
                    break;
                case 'close-unified-char-modal':
                    this.closeUnifiedCharacterModal();
                    break;
                case 'toggle-unified-char-selection':
                    const charId = target.dataset.charId || target.closest('[data-char-id]')?.dataset.charId;
                    const selectionType = target.dataset.selectionType || target.closest('[data-selection-type]')?.dataset.selectionType;
                    if (charId && selectionType) this.toggleUnifiedCharacterSelection(charId, selectionType);
                    break;
                case 'confirm-group-char-selection':
                    KLITE_RPMod.panels.ROLES?.confirmCharacterSelection();
                    break;
                case 'close-group-char-modal':
                    KLITE_RPMod.panels.ROLES?.closeCharacterModal();
                    break;
                case 'confirm-custom-character':
                    const editCharId = target.dataset.editCharId || null;
                    KLITE_RPMod.panels.ROLES?.confirmCustomCharacter(editCharId);
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
                        'instruct': 'TOOLS'
                    };
                        const activePlayPanel = modeMap[mode] || 'TOOLS';
                        const panel = KLITE_RPMod.panels[activePlayPanel];
                        if (panel?.actions?.[action]) {
                            this.log('panels', `Action ${action} handled by ${activePlayPanel}`);
                            panel.actions[action](event);
                            handled = true;
                        }
                    } else {
                        // For non-PLAY left panels (ROLES, TOOLS, CONTEXT, IMAGE, HELP), check directly
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

        // Inject custom checkbox into KoboldAI Lite Settings/Advanced tab
        installSettingsEnhancer() {
            try {
                if (this._settingsEnhanced) return;
                if (typeof window.display_settings === 'function') {
                    const orig = window.display_settings;
                    const self = this;
                    window.display_settings = function(...args) {
                        const ret = orig.apply(this, args);
                        setTimeout(() => { try { self.injectOverlayCheckboxIntoSettings(); } catch(_){} }, 50);
                        return ret;
                    };
                }
                if (typeof window.display_settings_tab === 'function') {
                    const origTab = window.display_settings_tab;
                    const self2 = this;
                    window.display_settings_tab = function(tabidx, ...rest) {
                        const r = origTab.apply(this, [tabidx, ...rest]);
                        if (tabidx === 4) {
                            setTimeout(() => { try { self2.injectOverlayCheckboxIntoSettings(); } catch(_){} }, 20);
                        }
                        return r;
                    };
                }
                this._settingsEnhanced = true;
                this.log('init', 'Settings enhancer installed');
            } catch (e) {
                this.log('init', `Settings enhancer skipped: ${e?.message || e}`);
            }
        },
        injectOverlayCheckboxIntoSettings() {
            try {
                // Find the Advanced tab content pane
                let pane = document.querySelector('#settingsmenuadvanced') || document.querySelector('#advanced') || document.querySelector('#settings-advanced');
                if (!pane) {
                    // Try to resolve via nav link text
                    const links = Array.from(document.querySelectorAll('.settingsnav a, .nav-tabs a'));
                    const advLink = links.find(a => /advanced/i.test(a.textContent || ''));
                    if (advLink) {
                        const href = advLink.getAttribute('href');
                        if (href && href.startsWith('#')) pane = document.querySelector(href);
                    }
                }
                // Fallback: append into settings body if needed
                if (!pane) pane = document.querySelector('.settingsbody') || document.body;

                if (!pane || pane.querySelector('#rpmod-overlay-sidepanel')) return; // already injected

                const wrap = document.createElement('div');
                wrap.style.margin = '8px 0';
                wrap.innerHTML = `
                    <label style="display:flex; align-items:center; gap:8px; font-size: 13px;">
                        <input type="checkbox" id="rpmod-overlay-sidepanel" ${this.getOverlaySidepanelEnabled() ? 'checked' : ''}>
                        RPmod sidepanel overlays chat area
                    </label>
                    <div style="color: var(--muted); font-size: 11px; margin-left: 24px;">Disable to make space so chat stays fully visible.</div>
                `;
                pane.appendChild(wrap);

                const cb = wrap.querySelector('#rpmod-overlay-sidepanel');
                cb.addEventListener('change', () => {
                    this.setOverlaySidepanelEnabled(cb.checked);
                    try {
                        // Persist if possible
                        if (typeof window.indexeddb_save === 'function') {
                            window.indexeddb_save('localsettings', window.localsettings);
                        }
                    } catch(_){}
                });

                this.log('init', 'Injected RPmod overlay checkbox into Settings/Advanced');
            } catch (e) {
                this.log('init', `Failed to inject overlay checkbox: ${e?.message || e}`);
            }
        },

        // Panel system
        panels: {},

        // Panels-only overlay mode: when disabled, shrink host content width to make space
        getOverlaySidepanelEnabled() {
            try {
                // Default enabled unless explicitly set false
                return window.localsettings?.rpmod_overlay_sidepanel !== false;
            } catch(_) { return true; }
        },
        setOverlaySidepanelEnabled(val) {
            try {
                if (window.localsettings) window.localsettings.rpmod_overlay_sidepanel = !!val;
            } catch(_){}
            try { this.updatePanelsOnlyOverlayPadding(); } catch(_){}
        },
        updatePanelsOnlyOverlayPadding() {
            try {
                const panelsOnly = !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly);
                if (!panelsOnly) return;
                const overlay = this.getOverlaySidepanelEnabled();
                const right = document.getElementById('panel-right');
                const isOpen = !!(right && !right.classList.contains('collapsed'));
                const maincon = document.getElementById('maincontainer');
                const isMobile = !!(this.state?.mobile?.enabled);

                // Reset any previous adjustments
                document.body.classList.remove('klite-panels-nonoverlay-right');
                if (maincon) maincon.style.marginRight = '';

                // Only apply non-overlay spacing on desktop/tablet widths
                if (!overlay && isOpen && !isMobile) {
                    if (maincon) {
                        maincon.style.marginRight = '350px';
                    } else {
                        // Fallback to body class if maincontainer not found
                        document.body.classList.add('klite-panels-nonoverlay-right');
                    }
                }
            } catch(_){}
        },

        switchTab(panel, tab) {
            this.log('panels', `Switching ${panel} panel to ${tab}`);

            // In Esobold panels-only mode, ignore left-panel switches entirely
            if ((window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly) && panel === 'left') {
                this.log('panels', 'Ignored left-panel switch in panels-only mode');
                return;
            }

            // Update state; if switching 'left' while only right panel is visible, mirror to right
            this.state.tabs[panel] = tab;
            if (panel === 'left') {
                this.state.tabs.right = tab;
            }
            this.saveState();

            // Update UI (alias left→right when needed)
            const targetPanel = (panel === 'left') ? 'right' : panel;
            document.querySelectorAll(`[data-panel="${targetPanel}"] .klite-tab`).forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tab);
            });

            this.loadPanel(targetPanel, tab);
        },

        syncTabButtonStates() {
            // Ensure button states match the current state.tabs during initialization
            this.log('panels', 'Syncing tab button states with current state');

            // Update left panel buttons if present (left panel may not exist)
            const leftTabs = document.querySelectorAll('[data-panel="left"] .klite-tab');
            if (leftTabs && leftTabs.length) {
                leftTabs.forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === this.state.tabs.left);
                });
            }

            // Update right panel buttons  
            document.querySelectorAll('[data-panel="right"] .klite-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === this.state.tabs.right);
            });

            this.log('panels', `Button states synced: left=${this.state.tabs.left}, right=${this.state.tabs.right}`);
        },

        loadPanel(side, name) {
            this.log('panels', `Loading panel: ${side}/${name}`);

            // Single-right-panel behavior: render any 'left' loads into 'right'
            if (side === 'left') side = 'right';

            const container = document.getElementById(`content-${side}`);
            if (!container) {
                this.error(`loadPanel: container not found for side='${side}' (expected #content-${side})`);
                return;
            }

            // Reset panel-specific CSS classes
            container.className = 'klite-content';

            // In panels-only mode, only allow known right-panel tabs
            if (window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly && side === 'right') {
                const allowed = new Set(['CHARS','ROLES','TOOLS','CONTEXT','IMAGE','MEMORY','NOTES','WI','TEXTDB']);
                if (!allowed.has(name)) {
                    this.log('panels', `Skipped loading unused panel '${name}' in panels-only mode`);
                    return;
                }
            }

            // Lazy-register IMAGE panel if requested and not yet present
            if (name === 'IMAGE' && !KLITE_RPMod.panels.IMAGE) {
                try {
                    KLITE_RPMod.panels.IMAGE = {
                        render() {
                            return `
                                ${t.section('🎨 Image Generation', `
                                    <div class="klite-image-status" style="margin-bottom: 12px; padding: 8px; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px;">
                                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">Image Generation Status</div>
                                        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                                            <div><span style="color: var(--muted);">Provider:</span> <span id="scene-mode-status" style="color: var(--text); font-weight: bold;">${KLITE_RPMod.getGenerationMode?.(window.localsettings?.generate_images_mode) || 'auto'}</span></div>
                                            <div><span style="color: var(--muted);">Model:</span> <span id="scene-model-status" style="color: var(--text); font-weight: bold;">${window.localsettings?.generate_images_model || 'Default'}</span></div>
                                        </div>
                                    </div>
                                    <div class="klite-image-controls" style="margin-bottom: 12px;">
                                        <label style="display: block; margin-bottom: 4px; font-size: 12px;">Auto-generate:</label>
                                        ${t.select('scene-autogen', [
                                            { value: '0', text: 'Disabled', selected: true },
                                            { value: '1', text: 'Immersive Mode' },
                                            { value: '2', text: 'All Messages' },
                                            { value: '3', text: 'User Messages Only' },
                                            { value: '4', text: 'Non-User Messages Only' }
                                        ])}
                                        <div style="margin-top: 8px;">${t.checkbox('scene-detect', 'Detect ImgGen Instructions', false)}</div>
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
                                    </div>
                                `)}
                            `;
                        },
                        init() {},
                        isImageGenerationAvailable() {
                            if (!window.do_manual_gen_image || typeof window.do_manual_gen_image !== 'function') {
                                return { available: false, reason: 'Image generation function not available' };
                            }
                            if (window.localsettings?.image_generation_enabled === false) return { available: false, reason: 'Image generation disabled' };
                            return { available: true, provider: 'Host' };
                        },
                        generateImage(prompt) {
                            const status = this.isImageGenerationAvailable();
                            if (!status.available) return false;
                            try { window.do_manual_gen_image(prompt); KLITE_RPMod.log('image', `Image generation: ${prompt}`); return true; }
                            catch (e) { KLITE_RPMod.error('Image generation failed:', e); return false; }
                        },
                        actions: {
                            'gen-custom': () => {
                                const input = window.prompt('Enter an image prompt:');
                                const prompt = (input || '').trim();
                                if (!prompt) return;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-scene': () => {
                                try {
                                    const arr = Array.isArray(window.gametext_arr) ? window.gametext_arr : [];
                                    const recent = arr.slice(-3).join(' ').trim();
                                    const base = recent || (window.current_memory || '').trim();
                                    const excerpt = base ? base.substring(0, 250) : 'current story context';
                                    const prompt = `Illustrate the current scene: ${excerpt} — cinematic, detailed, cohesive style`;
                                    KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                                } catch (_) {
                                    KLITE_RPMod.panels.IMAGE.generateImage('Illustrate the current scene, cinematic, detailed, cohesive style');
                                }
                            },
                            'gen-ai-portrait': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const prompt = `Portrait of ${aiName}, detailed character art, high quality`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-user-portrait': () => {
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `Portrait of ${userName}, detailed character art, high quality`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-group': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `Group shot of ${userName} and ${aiName}, dynamic composition, detailed character art`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-combat': () => {
                                const location = document.getElementById('scene-location')?.value || 'battlefield';
                                const prompt = `Intense combat scene in ${location}, action scene, dynamic angles, dramatic lighting`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-dialogue': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `${userName} and ${aiName} having an intimate conversation, emotional expressions`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-dramatic': () => {
                                const location = document.getElementById('scene-location')?.value || 'scene';
                                const mood = document.getElementById('scene-mood')?.value || 'dramatic';
                                const prompt = `Dramatic ${mood} moment in ${location}, cinematic composition, emotional intensity`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-atmosphere': () => {
                                KLITE_RPMod.panels.IMAGE.generateImage('Atmospheric environmental scene, mood lighting, evocative ambience');
                            },
                            'gen-memory': () => {
                                const memoryText = window.current_memory || '';
                                const prompt = memoryText ? `Scene based on: ${memoryText.substring(0, 200)}...` : 'Scene based on current memory context';
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt + ', detailed illustration, narrative art');
                            },
                            'gen-last-message': () => {
                                const lastMessage = window.gametext_arr?.[window.gametext_arr.length - 1] || '';
                                const prompt = lastMessage ? `Scene depicting: ${lastMessage.substring(0, 200)}...` : 'Scene based on last message';
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt + ', detailed illustration, story art');
                            },
                            'gen-recent': () => {
                                try {
                                    const arr = Array.isArray(window.gametext_arr) ? window.gametext_arr : [];
                                    const recent = arr.slice(-6).join(' ').trim();
                                    const excerpt = recent ? recent.substring(0, 400) : 'recent dialogue and narration';
                                    const prompt = `Key recent events: ${excerpt} — story illustration, cohesive multi-panel feel`;
                                    KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                                } catch (_) {
                                    KLITE_RPMod.panels.IMAGE.generateImage('Illustrate recent events — story illustration, cohesive style');
                                }
                            }
                        }
                    };
                } catch (e) {
                    this.error('Failed to register IMAGE panel:', e);
                }
            }

            // Mode-aware panel selection for PLAY
            if (name === 'PLAY') {
                const mode = this.getMode();
                const modeMap = {
                    'story': 'PLAY_STORY',
                    'adventure': 'PLAY_ADV',
                    'chat': 'PLAY_CHAT',
                    'instruct': 'TOOLS'
                };
                name = modeMap[mode] || 'TOOLS';
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

            // Update tablet/fullscreen UI if available
            try { this.updateTabletSidepanelPositions?.(); } catch(_){}
            try { this.updateTabletSidepanelButton?.(); } catch(_){}
            try { this.updateFullscreenButton?.(); } catch(_){}

            // In panels-only mode, update non-overlay body padding state
            try { this.updatePanelsOnlyOverlayPadding(); } catch(_){}

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

                    // Ensure Horde models are loaded on first submit
                    const ensureModelsThenSubmit = () => {
                        self.state.generating = true;
                        self.updateSubmitBtn();
                        self.generationStart = Date.now();
                        const result = orig.apply(window, args);
                        return result;
                    };

                    try {
                        const usingCustom = typeof window.is_using_custom_ep === 'function' && window.is_using_custom_ep();
                        if (!usingCustom && Array.isArray(window.selected_models) && window.selected_models.length === 0) {
                            if (typeof window.fetch_horde_models === 'function') {
                                window.fetch_horde_models((mdls) => {
                                    try {
                                        if (Array.isArray(mdls) && mdls.length > 0 && Array.isArray(window.selected_models) && window.selected_models.length === 0) {
                                            window.selected_models = [mdls[0]];
                                        }
                                    } catch (_) {}
                                    ensureModelsThenSubmit();
                                });
                                return;
                            }
                        }
                    } catch (e) {
                        // non-fatal
                    }

                    return ensureModelsThenSubmit();
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

                    // Sanitize known numeric fields that may be strings
                    if (payload && payload.params) {
                        const numKeys = ['max_length','max_context_length','temperature','top_p','top_k','typical_p','tfs','rep_pen','rep_pen_range','mirostat_tau','mirostat_lr'];
                        numKeys.forEach(k => {
                            if (k in payload.params && typeof payload.params[k] === 'string') {
                                const n = Number(payload.params[k]);
                                if (!Number.isNaN(n)) payload.params[k] = n;
                            }
                        });
                    }

                    return orig.apply(window, [payload, ...args]);
                };
                this.log('hooks', 'Hooked dispatch_submit_generation');
            }

            // (Removed) pending single-role hooks; avatar selection now uses Lite variables

            // Hook abort
            if (window.abort_generation) {
                const orig = window.abort_generation;
                const self = this; // Preserve reference to KLITE_RPMod
                window.abort_generation = (...args) => {
                    self.log('generation', 'Abort generation triggered');

                    // Check if memory generation is active and abort it
            if (self.panels.CONTEXT?.memoryGenerationState?.active) {
                self.panels.CONTEXT.abortMemoryGeneration('user_abort');
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
                    // Check if gametext element was at bottom before rendering
                    const gametext = document.getElementById('gametext');
                    const wasAtBottom = gametext ? self.isScrolledToBottom(gametext) : true;

                    const result = orig.apply(window, args);
                    self.log('integration', 'render_gametext called, syncing chat display');
                    // Avatar overrides are applied globally via Lite variables
                    self.syncChat();
                    // For chat mode, apply message formatting with avatars in display
                    try {
                        if (window.localsettings?.opmode === 3 && KLITE_RPMod.panels?.PLAY_CHAT?.formatChatContent) {
                            KLITE_RPMod.panels.PLAY_CHAT.formatChatContent();
                        }
                    } catch (_) {}

                    // Do not forcibly flip generating state here; rely on pending_response_id watcher
                    // Handle auto scroll for main gametext element too
                    if (gametext) {
                        self.handleAutoScroll(gametext, wasAtBottom);
                    }

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

            // Comprehensive Horde queue/wait time handling via fetch AND XMLHttpRequest intercept

            // Hook fetch requests
            const origFetch = window.fetch;
            window.fetch = function (...args) {
                const url = args[0];

                // Only log Horde requests, not all fetch requests

                // Check for any Horde-related URLs (broader pattern)
                if (url && typeof url === 'string' && (
                    url.includes('/api/v2/generate/status/') ||
                    url.includes('/generate/status/') ||
                    url.includes('horde') ||
                    url.includes('status')
                )) {
                    return origFetch.apply(window, args).then(response => {
                        // Clone the response so we can read it without consuming it
                        const cloned = response.clone();
                        cloned.json().then(data => {
                            // Use centralized status update method
                            KLITE_RPMod.updateHordeStatusFromData(data);
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

            // Also hook XMLHttpRequest in case KoboldAI Lite uses that
            const origXHROpen = XMLHttpRequest.prototype.open;
            const origXHRSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (method, url, ...args) {
                this._requestURL = url;

                // Check for Horde-related URLs
                if (url && typeof url === 'string' && (
                    url.includes('/api/v2/generate/status/') ||
                    url.includes('/generate/status/') ||
                    url.includes('horde') ||
                    url.includes('status')
                )) {
                    this._isHordeRequest = true;
                }

                return origXHROpen.apply(this, [method, url, ...args]);
            };

            XMLHttpRequest.prototype.send = function (...args) {
                if (this._isHordeRequest) {
                    // Hook the response
                    this.addEventListener('load', function () {
                        if (this.status === 200) {
                            try {
                                const data = JSON.parse(this.responseText);
                                KLITE_RPMod.updateHordeStatusFromData(data);
                            } catch (error) {
                                KLITE_RPMod.log('error', 'Failed to parse XHR Horde response:', error);
                            }
                        }
                    });
                }

                return origXHRSend.apply(this, args);
            };

            this.log('hooks', 'Hooked XMLHttpRequest for Horde status interception');

            // Hook restart_new_game for proper RPmod state reset
            if (window.restart_new_game) {
                const orig = window.restart_new_game;
                const self = this; // Preserve reference to KLITE_RPMod
                window.restart_new_game = function (ask_confirm, keep_memory) {
                    self.log('init', 'New game restart triggered, resetting RPmod state...');

                    // Call original Lite reset function first
                    const result = orig.apply(window, arguments);

                    // Reset KLITE-RPmod state after Lite reset
                    self.resetRPModState(keep_memory);

                    return result;
                };
                this.log('hooks', 'Hooked restart_new_game for RPmod state reset');
            }

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

            // Hook autosave (optional) to persist RPmod bundle
            if (window.KLITE_RPMod_Config?.rpmodAutosave && window.autosave) {
                const origAutosave = window.autosave;
                window.autosave = (...args) => {
                    this.log('integration', 'Autosave triggered');
                    const res = origAutosave.apply(window, args);
                    try { this.saveAutosaveBundle(); } catch (_) {}
                    return res;
                };
                this.log('hooks', 'Hooked autosave for RPmod bundle');
            }

            // Add RP topbar for Lite/Esolite inside RPmod's top panel once the host has injected its nav items
            (function setupTopbarOnceReady(self){
                const ensureTopbar = () => {
                    // Build when either esobold OR lite nav is present AND RPmod top panel exists
                    const topContent = document.getElementById('top-content');
                    // New behavior: do not depend on backend nav; always create our own topbar when top panel exists
                    if (!topContent) return false;

                    let rpbar = document.getElementById('rpmod-topbar');
                    if (!rpbar) {
                        rpbar = document.createElement('div');
                        rpbar.id = 'rpmod-topbar';
                        rpbar.className = 'topmenu rpmod-esolite-topbar';
                        rpbar.innerHTML = `
                            <div class="rpmod-esolite-inner" style="width: 100%; display:flex; align-items:center; gap:8px;">
                                <div class="rpmod-esolite-nav" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
                                <div id="rpmod-connectstatus" class="rpmod-esolite-status" style="margin-left:auto;color:#cccccc;font-weight:bold;">&nbsp;</div>
                            </div>`;
                        topContent.appendChild(rpbar);
                    }
                    // Populate/refresh nav entries; if backend anchors are missing, build default nav entries
                    const nav = rpbar.querySelector('.rpmod-esolite-nav');
                    if (nav) nav.innerHTML = '';
                    const isEsolite = !!(document.getElementById('topbtn_data_manager') || document.getElementById('openTreeDiagram') || document.getElementById('topbtn_remote_mods'));
                    const addMirrorLink = (selector, fallbackText, handler) => {
                        const src = document.querySelector(selector);
                        if (!src) return false;
                        // Skip hidden items to mirror only visible defaults
                        try {
                            const li = src.closest('li');
                            if (li && li.classList.contains('hidden')) return false;
                        } catch(_) {}
                        const a = document.createElement('a');
                        a.className = 'nav-link mainnav';
                        a.href = '#';
                        a.textContent = (src.textContent && src.textContent.trim()) || fallbackText || '';
                        a.onclick = (e) => { e.preventDefault(); e.stopPropagation(); try { handler ? handler() : src.click(); } catch(_){} return false; };
                        nav.appendChild(a);
                        return true;
                    };

                    // Mirror Lite default visible set, else add our own entries
                    const mirrors = [
                        ['#topbtn_ai a.nav-link.mainnav', 'AI', () => { try{ closeTopNav?.(); }catch(_){ } try{ display_endpoint_container?.(); }catch(_){ } }],
                        ['#topbtn_newgame a.nav-link.mainnav', 'New Session', () => { try{ closeTopNav?.(); }catch(_){ } try{ display_newgame?.(); }catch(_){ } }],
                        ['#topbtn_scenarios a.nav-link.mainnav', 'Scenarios', () => { try{ closeTopNav?.(); }catch(_){ } try{ display_scenarios?.(); }catch(_){ } }],
                        ['#topbtn_save_load a.nav-link.mainnav', 'Save / Load', () => { try{ closeTopNav?.(); }catch(_){ } try{ display_saveloadcontainer?.(); }catch(_){ } }],
                        ['#topbtn_settings a.nav-link.mainnav', 'Settings', () => { try{ closeTopNav?.(); }catch(_){ } try{ display_settings?.(); }catch(_){ } }]
                    ];
                    let addedAny=false;
                    for (const m of mirrors){ addedAny = addMirrorLink(m[0], m[1], m[2]) || addedAny; }
                    if (!addedAny){
                        // Build default nav entries managed by RPmod
                        const defaults = [
                            ['AI', () => { try{ display_endpoint_container?.(); }catch(_){ } }],
                            ['New Session', () => { try{ display_newgame?.(); }catch(_){ } }],
                            ['Scenarios', () => { try{ display_scenarios?.(); }catch(_){ } }],
                            ['Save / Load', () => { try{ display_saveloadcontainer?.(); }catch(_){ } }],
                            ['Settings', () => { try{ display_settings?.(); }catch(_){ } }]
                        ];
                        for (const [label, handler] of defaults){
                            const a = document.createElement('a'); a.className='nav-link mainnav'; a.href='#'; a.textContent=label;
                            a.onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); try{ handler?.(); }catch(_){} return false; };
                            nav.appendChild(a);
                        }
                    }

                    // Esolite-only extras
                    if (isEsolite) {
                        addMirrorLink('#topbtn_data_manager a.nav-link.mainnav', 'Data', () => { try{ closeTopNav?.(); }catch(_){ } try{ showCharacterList?.(); }catch(_){ } });
                        // Chat tree entry (text link instead of icon)
                        (function(){
                            const tree = document.getElementById('openTreeDiagram');
                            if (!tree) return;
                            const a = document.createElement('a');
                            a.className = 'nav-link mainnav';
                            a.href = '#';
                            a.textContent = 'Chat-Tree';
                            a.onclick = (e) => { e.preventDefault(); e.stopPropagation(); try { tree.click(); } catch(_){} return false; };
                            nav.appendChild(a);
                        })();
                    }
                    self.log('integration', 'Synced RP topbar (Lite/Esolite)');

                    // Mirror connection text if available
                    const src = document.getElementById('connectstatus');
                    const dst = document.getElementById('rpmod-connectstatus');
                    if (src && dst) dst.textContent = src.textContent || '';
                    return true;
                };

                // Try immediately in case everything is ready
                if (ensureTopbar()) return;

                // Observe DOM mutations until both esobold nav and RPmod top-content are present
                const mo = new MutationObserver(() => {
                    if (ensureTopbar()) { try { mo.disconnect(); } catch(_){} }
                });
                try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(_){ /* ignore */ }

                // Fallback timeout: stop observing after 10s to avoid leaks
                setTimeout(() => { try { mo.disconnect(); } catch(_){} ensureTopbar(); }, 10000);
            })(this);
        },

        // Submit button visual sync helper (host-aware)
        updateSubmitBtn() {
            try {
                if (typeof window.update_submit_button === 'function') {
                    window.update_submit_button(false);
                }
            } catch(_){}
        },

        // Minimal resize handling to keep panels-only layout sane
        handleResize() {
            try { this.updatePanelsOnlyOverlayPadding?.(); } catch(_){}
        },

        // Adventure mode guard: return true to allow generation
        handleAdventureMode() {
            try {
                // If needed, wire adventure-specific preconditions here.
                return true;
            } catch(_) { return true; }
        },

        // Actions
        submitWithRole(role = 'user') {
            return this.submit();
        },

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

            // Clear our input and reflect token change immediately
            input.value = '';
            this.updateTokens();

            // Optimistic UI: mark generating immediately so the button flips to Abort
            this.state.generating = true;
            this.updateSubmitBtn();

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

        resetRPModState(keepMemory = false) {
            this.log('init', `Resetting RPmod state (keepMemory: ${keepMemory})`);

            // Reset character selections
            if (this.panels.TOOLS) {
                this.panels.TOOLS.selectedCharacter = null;
                this.panels.TOOLS.characterEnabled = false;
                this.panels.TOOLS.selectedPersona = null;
                this.panels.TOOLS.personaEnabled = false;

                // Reset any character-specific rules if not keeping memory
                if (!keepMemory) {
                    this.panels.TOOLS.rules = '';
                }

                this.log('init', 'Reset TOOLS panel character selections');
            }

            // Reset group chat data
            if (this.groupAvatars) {
                this.groupAvatars.clear();
                this.log('init', 'Cleared group chat avatars');
            }

            // Reset avatar states to defaults
            this.userAvatarCurrent = this.userAvatarDefault;
            this.aiAvatarCurrent = this.aiAvatarDefault;
            this.log('init', 'Reset avatars to defaults');

            // Reset generating state
            this.state.generating = false;
            this.updateSubmitBtn();

            // Reset save slots if not keeping memory
            if (!keepMemory) {
                // Clear quick save slots for all panels that have them
                Object.values(this.panels).forEach(panel => {
                    if (panel.saveSlots) {
                        // Initialize with null values to show empty slots
                        panel.saveSlots.saves = [null, null, null, null, null];
                        panel.saveSlots.currentSlot = 0;
                        panel.saveSlots.current = 0;
                    }
                });
                this.log('init', 'Cleared quick save slots');
            }

            // Refresh active panels to show reset state
            if (this.state.tabs.left) {
                this.loadPanel('left', this.state.tabs.left);
            }
            if (this.state.tabs.right) {
                this.loadPanel('right', this.state.tabs.right);
            }

            this.log('init', 'RPmod state reset complete');
        },

        toggleEdit() {
            const checkbox = document.getElementById('allowediting');
            const wasChecked = checkbox?.checked;

            this.log('state', `Edit toggle start - wasChecked: ${wasChecked}, current mode: ${window.localsettings?.opmode}`);

            // When entering edit mode, store the current RPmod PLAY state
            if (!wasChecked) {
                this.quickButtonState.storedModeBeforeEdit = window.localsettings?.opmode;
                // Also disable placeholder replacement to avoid token injection during edits
                if (window.localsettings) {
                    this.quickButtonState.placeholderBeforeEdit = window.localsettings.placeholder_tags;
                    this.quickButtonState.randomSeedBeforeEdit = window.localsettings.inject_randomness_seed;
                    window.localsettings.placeholder_tags = false;
                    window.localsettings.inject_randomness_seed = 0;
                }
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
                // Restore placeholder settings
                if (window.localsettings) {
                    if (this.quickButtonState.placeholderBeforeEdit !== undefined) {
                        window.localsettings.placeholder_tags = this.quickButtonState.placeholderBeforeEdit;
                    }
                    if (this.quickButtonState.randomSeedBeforeEdit !== undefined) {
                        window.localsettings.inject_randomness_seed = this.quickButtonState.randomSeedBeforeEdit;
                    }
                }
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

            // Prefer native Lite edit: edit #gametext, keep our #chat-display read-only mirror
            const chatDisplay = document.getElementById('chat-display');
            const gametext = document.getElementById('gametext');
            if (chatDisplay && gametext) {
                chatDisplay.contentEditable = 'false';
                gametext.contentEditable = isEditMode ? 'true' : 'false';
                this.log('state', `Set gametext editable: ${isEditMode}, chat-display editable: false`);
            }

            this.log('state', `Edit mode completed - final state: ${isEditMode}, mode: ${window.localsettings?.opmode}`);
        },

        saveEditChanges() {
            const gametext = document.getElementById('gametext');
            const chatDisplay = document.getElementById('chat-display');

            // Edits are done in native #gametext; do not copy styled chat-display back.

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
                    // Prefer aesthetic/corpo look if Messenger style is selected
                    if (typeof window.localsettings.gui_type_chat === 'number') {
                        // Keep the GUI stable; RPmod handles bubbles. Default to Classic unless user opted Messenger.
                        // No-op here; a dedicated Messenger toggle can set gui_type_chat to 2 or 3.
                    }
                }
                this.log('state', `Configured Chat mode settings`);
            } else if (mode === 4) {
                // RP mode (Instruct) - Enable inject_chatnames_instruct
                if (window.localsettings) {
                    window.localsettings.inject_chatnames_instruct = true;
                }
                this.log('state', `Enabled inject_chatnames_instruct for RP mode`);
            }

            // Do NOT override user's GUI type selections; preserve Lite theme settings.

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

            // UNUSED (overlay-only): would reload PLAY panel; ignored in panels-only
            // this.switchTab('left', 'PLAY');
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
                if (window.localsettings) {
                    window.localsettings.adventure_switch_mode = 0;
                }
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

        // UNUSED (overlay UI): Quick button state management and visual toggles
        quickButtonState: {
            activeButton: null,
            lastActiveMode: null,
            storedModeBeforeEdit: null, // Store mode before edit mode
            isUpdating: false
        },

        // UNUSED (overlay UI): Updates quick mode buttons
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

        // UNUSED (overlay UI): Applies active state to quick mode buttons
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

        setMode(mode) {
            try {
                if (!window.localsettings) return;
                window.localsettings.opmode = mode;
                this.onModeChange(mode);
                this.updateModeButtons();
                // UNUSED (overlay-only): would reload PLAY panel; ignored in panels-only
                // this.switchTab('left', 'PLAY');
            } catch (e) {
                this.error('Failed to set mode', e);
            }
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
        ensureDefaultAvatars() {
            try {
                // Prefer KoboldAI Lite root CSS variables when available
                const rs = getComputedStyle(document.documentElement);
                const nikoVar = rs.getPropertyValue('--img_nikosquare');
                const humanVar = rs.getPropertyValue('--img_humansquare');
                const extractUrl = (v) => {
                    if (!v) return null;
                    const m = String(v).match(/url\("?(.*)"?\)/);
                    return m && m[1] ? m[1] : null;
                };
                const aiDefault = extractUrl(nikoVar);
                const userDefault = extractUrl(humanVar);
                if (aiDefault) this.aiAvatarDefault = aiDefault;
                if (userDefault) this.userAvatarDefault = userDefault;
            } catch (_) {
                // Ignore; fall back to legacy defaults
            }
        },

        // Normalize avatar source strings (handles CSS url(), quotes, HTML entities, whitespace)
        normalizeAvatarSrc(src) {
            try {
                if (!src || typeof src !== 'string') return src;
                let s = src.trim();
                // Extract from CSS url("...") if present
                const m = s.match(/^url\((['"]?)(.*)\1\)$/i);
                if (m) s = m[2];
                // Decode common HTML entity for quotes
                s = s.replace(/&quot;/g, '"');
                // Strip wrapping quotes
                s = s.replace(/^['"]|['"]$/g, '').trim();
                // If data URL, remove whitespace in base64 payload only
                if (/^data:image\//i.test(s)) {
                    const idx = s.indexOf(';base64,');
                    if (idx !== -1) {
                        const head = s.slice(0, idx + 8);
                        const b64 = s.slice(idx + 8).replace(/\s+/g, '');
                        s = head + b64;
                    }
                }
                return s;
            } catch (_) { return src; }
        },
        
        // Resolve best avatar URL using Character Manager (IndexedDB cache)
        getBestCharacterAvatar(char) {
            try {
                if (!char) return null;
                const cached = (char.id && KLITE_RPMod.panels?.CHARS?.getOptimizedAvatar)
                    ? KLITE_RPMod.panels.CHARS.getOptimizedAvatar(char.id, 'avatar')
                    : null;
                return cached || char.avatar || char.images?.avatar || char.image || null;
            } catch (_) { return null; }
        },

        // Current persona (user) avatar
        resolveUserAvatar() {
            this.ensureDefaultAvatars();
            const persona = this.panels.TOOLS?.selectedPersona || null;
            const best = this.getBestCharacterAvatar(persona);
            return best || this.userAvatarCurrent || this.userAvatarDefault || null;
        },

        // Current selected character (AI) avatar
        resolveAIAvatar() {
            this.ensureDefaultAvatars();
            const character = this.panels.TOOLS?.selectedCharacter || null;
            const best = this.getBestCharacterAvatar(character);
            return best || this.aiAvatarCurrent || this.aiAvatarDefault || null;
        },

        // Group character avatar by name, fallback to AI
        resolveGroupAvatarByName(name) {
            try {
                if (!name || !this.panels.ROLES?.activeChars) return this.resolveAIAvatar();
                const char = this.panels.ROLES.activeChars.find(c => c.name === name);
                return this.getBestCharacterAvatar(char) || this.resolveAIAvatar();
            } catch (_) { return this.resolveAIAvatar(); }
        },
        
        // Diagnostics helper to inspect avatar selection state
        dumpAvatarState() {
            try {
                const persona = this.panels.TOOLS?.selectedPersona || null;
                const character = this.panels.TOOLS?.selectedCharacter || null;
                const personaCached = persona?.id && this.panels?.CHARS?.getOptimizedAvatar ? !!this.panels.CHARS.getOptimizedAvatar(persona.id, 'avatar') : false;
                const characterCached = character?.id && this.panels?.CHARS?.getOptimizedAvatar ? !!this.panels.CHARS.getOptimizedAvatar(character.id, 'avatar') : false;
                const personaBest = this.getBestCharacterAvatar(persona);
                const characterBest = this.getBestCharacterAvatar(character);
                const summary = {
                    aiAvatarDefault: !!this.aiAvatarDefault,
                    userAvatarDefault: !!this.userAvatarDefault,
                    aiAvatarCurrent: !!this.aiAvatarCurrent,
                    userAvatarCurrent: !!this.userAvatarCurrent,
                    selectedPersona: persona ? { id: persona.id, name: persona.name, hasImages: !!persona?.images?.avatar, hasImage: !!persona?.image, cached: personaCached } : null,
                    selectedCharacter: character ? { id: character.id, name: character.name, hasImages: !!character?.images?.avatar, hasImage: !!character?.image, cached: characterCached } : null,
                    resolvedUser: !!(personaBest || this.userAvatarCurrent || this.userAvatarDefault),
                    resolvedAI: !!(characterBest || this.aiAvatarCurrent || this.aiAvatarDefault)
                };
                this.log('avatars', `dumpAvatarState: ${JSON.stringify(summary)}`);
                return summary;
            } catch (e) {
                this.log('avatars', `dumpAvatarState error: ${e?.message}`);
                return null;
            }
        },


        updateGroupAvatars() {
            // Sync group avatars map with current active characters
            if (KLITE_RPMod.panels.ROLES?.enabled && KLITE_RPMod.panels.ROLES.activeChars) {
                this.groupAvatars.clear();
                KLITE_RPMod.panels.ROLES.activeChars.forEach(char => {
                    const av = this.getBestCharacterAvatar(char);
                    if (av) {
                        this.groupAvatars.set(char.id, av);
                    }
                });
            }
        },

        // Update Horde status from response data (used by fetch/XHR hooks)
        updateHordeStatusFromData(data) {
            try {
                if (!data || data.faulted) return;

                const updateHordeStatusElement = (id, value, retries = 3) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.textContent = value;
                        return true;
                    }
                    if (retries > 0) setTimeout(() => updateHordeStatusElement(id, value, retries - 1), 100);
                    return false;
                };

                if (data.queue_position !== undefined) {
                    updateHordeStatusElement('queue', `#${data.queue_position}`);
                }
                if (data.wait_time !== undefined) {
                    updateHordeStatusElement('wait', `${data.wait_time}s`);
                }
            } catch (e) {
                this.error('Horde status update failed:', e);
            }
        },

        // Auto scroll helper functions (restored)
        isScrolledToBottom(element, threshold = 50) {
            try {
                if (!element) return false;
                const { scrollTop, scrollHeight, clientHeight } = element;
                return (scrollHeight - scrollTop - clientHeight) <= threshold;
            } catch (_) { return false; }
        },

        handleAutoScroll(element, wasAtBottom = true) {
            try {
                if (!element) return;
                // Respect host autoscroll setting when available
                if (window.localsettings && !window.localsettings.autoscroll) return;
                if (wasAtBottom) {
                    element.scrollTop = element.scrollHeight;
                    this.log('integration', 'Auto scrolled to bottom');
                }
            } catch (_) {}
        },

        // Lightweight chat mirror for overlay-only UIs; safe no-op if not present
        syncChat() {
            try {
                const gametext = document.getElementById('gametext');
                const display = document.getElementById('chat-display');
                if (!gametext || !display) return; // Panels-only mode or missing overlay

                const wasAtBottom = this.isScrolledToBottom(display);
                const html = gametext.innerHTML || '';

                // Simple signature to avoid unnecessary DOM writes
                let signature = 0;
                for (let i = 0; i < html.length; i++) {
                    signature = ((signature << 5) - signature) + html.charCodeAt(i);
                    signature |= 0;
                }
                if (this._lastChatSignature !== signature) {
                    display.innerHTML = html || '<p class="klite-center klite-muted">No content yet...</p>';
                    this._lastChatSignature = signature;
                    // Update group avatars used by chat bubble formatting
                    this.updateGroupAvatars();
                }

                this.handleAutoScroll(display, wasAtBottom);
            } catch (e) {
                // Do not throw; keep host UI stable
                try { this.log('integration', `syncChat error: ${e?.message}`); } catch(_) {}
            }
        },

        triggerCurrentSpeaker() {
            // Trigger the current speaker/character (used by ROLES panel)
            if (KLITE_RPMod.panels.ROLES?.enabled) {
                // Use ROLES panel functionality
                KLITE_RPMod.panels.ROLES.triggerCurrentSpeaker();
            } else {
                // In single character mode, trigger current speaker (index 0)
                if (typeof window.impersonate_message === 'function') {
                    window.impersonate_message(0);
                    // Triggering current speaker
                }
            }
        },

        updateStatus() {
            // Connection status with debug
            const status = document.getElementById('connectstatus');
            const connEl = document.getElementById('connection');

            this.log('status', `updateStatus called - status element: ${status ? 'found' : 'missing'}, connEl: ${connEl ? 'found' : 'missing'}`);

            if (!status) {
                this.log('status', 'No base connectstatus element yet');
                return;
            }

            const connectionText = status.textContent || 'Disconnected';
            const hasDisconnectedClass = status.classList.contains('disconnected');

            this.log('status', `Reading from connectstatus: "${connectionText}", disconnected class: ${hasDisconnectedClass}`);

            // Mirror to RPmod topbar status if present, regardless of TOOLS render state
            const rpmodStatus = document.getElementById('rpmod-connectstatus');
            if (rpmodStatus) {
                rpmodStatus.textContent = connectionText;
            }

            // Update in-panel connection indicator if present
            if (connEl) {
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
            // Optionally restore RPmod autosave bundle (disabled by default)
            if (window.KLITE_RPMod_Config?.rpmodAutosave) {
                setTimeout(() => this.tryRestoreAutosaveBundle(), 600);
            }

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
                    if (this.state?.tabs?.left === 'PLAY') {
                        this.state.tabs.left = 'TOOLS';
                    }
                    this.log('state', 'State loaded from KoboldAI Lite storage:', stateData);
                } else {
                    this.log('state', 'No saved state found, using defaults');
                }
            } catch (e) {
                this.error('Failed to load state:', e);
            }
        },


        // Produce a serializable snapshot for embedding into host savefiles
        getSaveBundle() {
            try {
                const autosave = {
                    version: '1',
                    timestamp: new Date().toISOString(),
                    rp: this.panels.TOOLS ? {
                        rules: this.panels.TOOLS.rules || '',
                        selectedCharacter: this.panels.TOOLS.selectedCharacter || null,
                        characterEnabled: !!this.panels.TOOLS.characterEnabled,
                        selectedPersona: this.panels.TOOLS.selectedPersona || null,
                        personaEnabled: !!this.panels.TOOLS.personaEnabled,
                        autoSender: this.panels.TOOLS.autoSender ? { ...this.panels.TOOLS.autoSender } : null,
                        quickActions: Array.isArray(this.panels.TOOLS.quickActions) ? [...this.panels.TOOLS.quickActions] : [],
                        chapters: Array.isArray(this.panels.TOOLS.chapters) ? [...this.panels.TOOLS.chapters] : []
                    } : null,
                    group: this.panels.ROLES ? {
                        enabled: !!this.panels.ROLES.enabled,
                        participants: Array.isArray(this.panels.ROLES.activeChars)
                          ? this.panels.ROLES.activeChars.map(c => ({
                              id: c.id,
                              name: c.name,
                              description: c.description || c.content || '',
                              personality: c.personality || '',
                              scenario: c.scenario || '',
                              creator_notes: c.creator_notes || c.post_history_instructions || '',
                              image: c.image,
                              avatar: c.avatar,
                              isCustom: !!c.isCustom,
                              talkativeness: c.talkativeness,
                              keywords: Array.isArray(c.keywords) ? [...c.keywords] : undefined
                          })) : [],
                        currentSpeaker: typeof this.panels.ROLES.currentSpeaker === 'number' ? this.panels.ROLES.currentSpeaker : 0,
                        lastSpeaker: typeof this.panels.ROLES.lastSpeaker === 'number' ? this.panels.ROLES.lastSpeaker : -1,
                        speakerMode: this.panels.ROLES.speakerMode || 'manual',
                        autoResponses: this.panels.ROLES.autoResponses ? { ...this.panels.ROLES.autoResponses } : null,
                        roundRobinPosition: typeof this.panels.ROLES.roundRobinPosition === 'number' ? this.panels.ROLES.roundRobinPosition : 0,
                        speakerHistory: Array.isArray(this.panels.ROLES.speakerHistory) ? this.panels.ROLES.speakerHistory.slice(-20) : []
                    } : null,
                    chat: this.panels.PLAY_CHAT ? {
                        chatStyle: this.panels.PLAY_CHAT.chatStyle || 'mobile',
                        saveSlots: this.panels.PLAY_CHAT.saveSlots ? { ...this.panels.PLAY_CHAT.saveSlots } : null
                    } : null,
                    // Scene visual style removed
                    ui: {
                        tabs: { ...this.state.tabs },
                        collapsed: { ...this.state.collapsed },
                        adventureMode: this.state.adventureMode || 0,
                        fullscreen: !!this.state.fullscreen,
                        tabletSidepanel: !!this.state.tabletSidepanel,
                        avatarPolicy: this.state.avatarPolicy ? { ...this.state.avatarPolicy } : { esoliteAdapter:false, liteExperimental:false }
                    },
                    gen: window.localsettings ? {
                        chatname: window.localsettings.chatname,
                        chatopponent: window.localsettings.chatopponent,
                        opmode: window.localsettings.opmode
                    } : null
                };
                return autosave;
            } catch (e) {
                this.error('getSaveBundle failed:', e);
                return null;
            }
        },

        // Restore from a bundle embedded in a savefile
        restoreFromSaveBundle(bundle) {
            try {
                if (!bundle || typeof bundle !== 'object') return;
                if (bundle.rp && this.panels.TOOLS) {
                    this.panels.TOOLS.rules = bundle.rp.rules || '';
                    this.panels.TOOLS.selectedCharacter = bundle.rp.selectedCharacter || null;
                    this.panels.TOOLS.characterEnabled = !!bundle.rp.characterEnabled;
                    this.panels.TOOLS.selectedPersona = bundle.rp.selectedPersona || null;
                    this.panels.TOOLS.personaEnabled = !!bundle.rp.personaEnabled;
                    if (bundle.rp.autoSender) this.panels.TOOLS.autoSender = { ...bundle.rp.autoSender };
                    if (Array.isArray(bundle.rp.quickActions)) this.panels.TOOLS.quickActions = [...bundle.rp.quickActions];
                    if (Array.isArray(bundle.rp.chapters)) this.panels.TOOLS.chapters = [...bundle.rp.chapters];
                }
                if (bundle.group && this.panels.ROLES) {
                    this.panels.ROLES.enabled = !!bundle.group.enabled;
                    if (Array.isArray(bundle.group.participants)) {
                        this.panels.ROLES.activeChars = bundle.group.participants.map(c => {
                            if (c && c.name && (!c.description && !c.personality && this.characters)) {
                                const found = this.characters.find(ch => ch.name === c.name);
                                return found ? { ...found } : { ...c };
                            }
                            return { ...c };
                        });
                    } else {
                        this.panels.ROLES.activeChars = [];
                    }
                    this.panels.ROLES.currentSpeaker = typeof bundle.group.currentSpeaker === 'number' ? bundle.group.currentSpeaker : 0;
                    if (typeof bundle.group.lastSpeaker === 'number') this.panels.ROLES.lastSpeaker = bundle.group.lastSpeaker;
                    this.panels.ROLES.speakerMode = bundle.group.speakerMode || 'manual';
                    if (bundle.group.autoResponses) this.panels.ROLES.autoResponses = { ...bundle.group.autoResponses };
                    if (typeof bundle.group.roundRobinPosition === 'number') this.panels.ROLES.roundRobinPosition = bundle.group.roundRobinPosition;
                    if (Array.isArray(bundle.group.speakerHistory)) this.panels.ROLES.speakerHistory = bundle.group.speakerHistory.slice(-20);
                }
                if (bundle.chat && this.panels.PLAY_CHAT) {
                    this.panels.PLAY_CHAT.chatStyle = bundle.chat.chatStyle || 'mobile';
                    if (bundle.chat.saveSlots) this.panels.PLAY_CHAT.saveSlots = { ...bundle.chat.saveSlots };
                }
                // Removed SCENE visual style restore; theming relies on host
                if (bundle.ui) {
                    this.state.tabs = { ...bundle.ui.tabs };
                    this.state.collapsed = { ...bundle.ui.collapsed };
                    this.state.adventureMode = bundle.ui.adventureMode || 0;
                    this.state.fullscreen = !!bundle.ui.fullscreen;
                    this.state.tabletSidepanel = !!bundle.ui.tabletSidepanel;
                    if (bundle.ui.avatarPolicy) this.state.avatarPolicy = { ...bundle.ui.avatarPolicy };
                }
                try { this.installAvatarAdapter(); } catch(_){}
                if (bundle.gen && window.localsettings) {
                    window.localsettings.chatname = bundle.gen.chatname || window.localsettings.chatname;
                    window.localsettings.chatopponent = bundle.gen.chatopponent || window.localsettings.chatopponent;
                }
                // Refresh
                if (this.panels.TOOLS?.refresh) this.panels.TOOLS.refresh();
                if (this.panels.ROLES?.refresh) this.panels.ROLES.refresh();
                if (this.panels.PLAY_CHAT?.formatChatContent) this.panels.PLAY_CHAT.formatChatContent();
                this.syncChat();
                this.log('state', 'RPmod save bundle restored from file');
            } catch (e) {
                this.error('restoreFromSaveBundle failed:', e);
            }
        },


        // Helper functions
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

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
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2px; margin-bottom: 10px;">
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
                            <select id="unified-char-sort" style="padding: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                                <option value="name">Name</option>
                                <option value="rating">Rating</option>
                                <option value="talk">Talkativeness</option>
                                <option value="created">Import Date</option>
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

            // Load character data and setup filters (ensuring initial data readiness)
            setTimeout(async () => {
                try { await this.ensureCharactersLoaded(); } catch(_) {}
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

            // Filter out already active characters for ROLES mode
            if (isMultiSelect && KLITE_RPMod.panels.ROLES?.activeChars) {
                availableChars = availableChars.filter(c =>
                    !KLITE_RPMod.panels.ROLES.activeChars.find(ac => ac.id === c.id)
                );
            }

            // Add WI characters if checkbox is enabled
            const includeWI = document.getElementById('unified-include-wi')?.checked;
            let wiCharacters = [];
            if (includeWI) {
                const wiEntries = window.worldinfo || [];
                wiCharacters = KLITE_RPMod.panels.TOOLS.extractWICharacters(wiEntries);

                // Filter out duplicates that might exist in both CHARS and WI
                wiCharacters = wiCharacters.filter(wiChar =>
                    !availableChars.find(char => char.name === wiChar.name)
                );
            }

            let allCharacters = [...availableChars, ...wiCharacters];

            // Apply filters
            const searchInput = document.getElementById('unified-char-search');
            const tagFilter = document.getElementById('unified-char-tag-filter');
            const ratingFilter = document.getElementById('unified-char-rating-filter');
            const talkFilter = document.getElementById('unified-char-talkativeness-filter');

            const q = (searchInput?.value || '').trim().toLowerCase();
            const tag = tagFilter?.value || '';
            const ratingMin = parseInt(ratingFilter?.value || '0');
            const talkBand = talkFilter?.value || '';
            const sortMode = (document.getElementById('unified-char-sort')?.value || 'name');

            if (q) {
                allCharacters = allCharacters.filter(c => (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.description || c.content || '').toLowerCase().includes(q) ||
                    (Array.isArray(c.tags) && c.tags.join(' ').toLowerCase().includes(q))
                ));
            }
            if (tag) {
                allCharacters = allCharacters.filter(c => Array.isArray(c.tags) && c.tags.includes(tag));
            }
            if (ratingMin > 0) {
                allCharacters = allCharacters.filter(c => (c.rating || 0) >= ratingMin);
            }
            if (talkBand) {
                allCharacters = allCharacters.filter(c => {
                    const t = c.talkativeness || 50;
                    if (talkBand === 'high') return t >= 80;
                    if (talkBand === 'medium') return t >= 40 && t <= 79;
                    if (talkBand === 'low') return t >= 10 && t <= 39;
                    return true;
                });
            }

            // Sort
            allCharacters.sort((a, b) => {
                switch (sortMode) {
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    case 'talk':
                        return (b.talkativeness || 0) - (a.talkativeness || 0);
                    case 'created':
                        return (b.created || 0) - (a.created || 0);
                    default:
                        return (a.name || '').localeCompare(b.name || '');
                }
            });

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
                const descriptionRaw = char.description || char.content || 'No description available';
                const description = KLITE_RPMod.escapeHtml(descriptionRaw.length > 100 ? descriptionRaw.substring(0, 100) + '...' : descriptionRaw);
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
                                <img src="${avatar}" alt="${KLITE_RPMod.escapeHtml(char.name || '')}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: var(--text); display: flex; align-items: center; gap: 2px;">
                                ${KLITE_RPMod.escapeHtml(char.name || '')}
                                ${isWIChar ? '<span style="font-size: 9px; background: var(--accent); color: white; padding: 1px 4px; border-radius: 2px;">WI</span>' : ''}
                            </div>
                            <div style="font-size: 11px; color: var(--muted); margin: 2px 0; max-height: 32px; overflow: hidden;">${description}</div>
                            <div style="font-size: 10px; color: var(--muted); display: flex; align-items: center; gap: 2px;">
                                ${!isWIChar ? `<span>Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>` : ''}
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
            const sortSelect = document.getElementById('unified-char-sort');

            const refreshList = () => {
                const mode = this.currentUnifiedModal?.dataset.mode || 'multi-select';
                this.loadUnifiedCharacterList(mode);
                // Persist filter state
                try {
                    const payload = {
                        q: searchInput?.value || '',
                        tag: tagFilter?.value || '',
                        rating: ratingFilter?.value || '',
                        talk: talkFilter?.value || '',
                        includeWI: wiCheckbox?.checked || false,
                        sort: sortSelect?.value || 'name'
                    };
                    KLITE_RPMod.saveToLiteStorage('rpmod_unified_char_filters', JSON.stringify(payload));
                } catch (_) {}
            };

            // Load persisted filters
            (async () => {
                try {
                    const raw = await KLITE_RPMod.loadFromLiteStorage('rpmod_unified_char_filters');
                    if (raw && raw !== 'offload_to_indexeddb') {
                        const payload = JSON.parse(raw);
                        if (searchInput) searchInput.value = payload.q || '';
                        if (tagFilter) tagFilter.value = payload.tag || '';
                        if (ratingFilter) ratingFilter.value = payload.rating || '';
                        if (talkFilter) talkFilter.value = payload.talk || '';
                        if (wiCheckbox) wiCheckbox.checked = !!payload.includeWI;
                        const sortEl = document.getElementById('unified-char-sort');
                        if (sortEl && payload.sort) sortEl.value = payload.sort;
                        const mode = this.currentUnifiedModal?.dataset.mode || 'multi-select';
                        this.loadUnifiedCharacterList(mode);
                    }
                } catch (_) {}
            })();

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
            if (sortSelect) {
                sortSelect.addEventListener('change', refreshList);
            }
        },

        confirmUnifiedCharacterSelection(mode) {
            const isMultiSelect = mode === 'multi-select';

            if (isMultiSelect) {
                // ROLES mode - handle multiple selections
                const checkboxes = document.querySelectorAll('#unified-character-selection-list input[type="checkbox"]:checked');

                if (checkboxes.length === 0) {
                    alert('No characters selected');
                    return;
                }

                // Add to ROLES panel
                if (KLITE_RPMod.panels.ROLES) {
                    let added = 0;
                    checkboxes.forEach(checkbox => {
                        const charId = checkbox.value;
                        const char = this.findCharacterForUnifiedModal(charId);
                        if (char && !KLITE_RPMod.panels.ROLES.activeChars.find(ac => ac.id === char.id || ac.name === char.name)) {
                            char.isCustom = false;
                            KLITE_RPMod.panels.ROLES.activeChars.push(char);
                            added++;
                        }
                    });

                    KLITE_RPMod.panels.ROLES.refresh();
                    try { KLITE_RPMod.panels.ROLES.saveSettings?.(); } catch (_) {}
                    // We do not write multi-opponent to host; speaker is set on trigger.
                    // Character addition confirmed by visual update in group list
                }
            } else {
                // TOOLS panel (RP) mode - handle single selection
                const radio = document.querySelector('#unified-character-selection-list input[type="radio"]:checked');

                if (!radio) {
                    alert('Please select a character');
                    return;
                }

                const charId = radio.value;
                const char = this.findCharacterForUnifiedModal(charId);

                if (char) {
                    // Call the callback if provided, or apply directly to TOOLS
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
            const wiCharacters = KLITE_RPMod.panels.TOOLS.extractWICharacters(wiEntries);
            return wiCharacters.find(c => c.name === charId);
        },

        applyCharacterToPlayRP(char) {
            // Apply character to TOOLS panel (formerly PLAY_RP)
            if (KLITE_RPMod.panels.TOOLS) {
                KLITE_RPMod.panels.TOOLS.selectedCharacter = char;
                KLITE_RPMod.panels.TOOLS.characterEnabled = true;

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
                    KLITE_RPMod.panels.TOOLS.applyCharacterData(char);
                }

                // Refresh current left panel (TOOLS or ROLES) without switching
                const left = KLITE_RPMod.state?.tabs?.left;
                if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);
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

                await this.saveToLiteStorage('characters_v3', jsonData);
                this.essential(`💾 Characters saved: ${this.characters.length} characters (${Math.round(jsonData.length / 1024)}KB)`);

            } catch (error) {
                this.error('CRITICAL: Failed to save characters - data will be lost on reload!', error);
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

            // Initialize characters_v3 if it doesn't exist
            const charactersExists = await this.loadFromLiteStorage('characters_v3');
            if (!charactersExists) {
                this.log('init', 'Creating default characters_v3');
                await this.saveCharacters();
            }
        },

        async saveToLiteStorage(key, data) {
            if (!LiteAPI.storage.save) {
                this.error(`Storage not ready yet, data will be lost on reload: ${key}`);
                return false;
            }

            try {
                await LiteAPI.storage.save(key, data);
                this.log('state', `Storage saved: ${key}`);
                return true;
            } catch (error) {
                this.error(`Failed to save to storage: ${key}`, error);
                return false;
            }
        },

        async loadFromLiteStorage(key) {
            if (!LiteAPI.storage.load) {
                this.error(`Storage not ready yet, cannot load: ${key}`);
                return null;
            }

            try {
                const result = await LiteAPI.storage.load(key, null);
                return result;
            } catch (error) {
                // Key doesn't exist yet - this is expected for first-time users
                this.log('state', `Storage key does not exist yet, will be created on first save: ${key}`);
                return null;
            }
        },

        async loadCharacters() {
            try {
                const liteStorageData = await this.loadFromLiteStorage('characters_v3');
                if (liteStorageData && liteStorageData !== 'offload_to_indexeddb') {
                    const data = JSON.parse(liteStorageData);

                    if (data) {
                        // Handle both legacy format and new format
                        if (Array.isArray(data)) {
                            // Legacy format: direct array
                            this.characters = data;
                            this.essential(`📚 Characters loaded (legacy): ${this.characters.length} characters`);
                        } else if (data.characters && Array.isArray(data.characters)) {
                            // New format: wrapper object
                            this.characters = data.characters;
                            this.essential(`📚 Characters loaded: ${this.characters.length} characters`);
                        } else {
                            this.error('Invalid character data format found in storage. Starting fresh.', data);
                            this.characters = [];
                        }
                    } else {
                        this.characters = [];
                    }
                } else {
                    this.characters = [];
                }

            } catch (error) {
                this.characters = [];
                this.error('Failed to load characters - starting with empty list:', error);
            }
        },

        // Ensure character data is ready before opening selection modals or actions
        async ensureCharactersLoaded() {
            try {
                if (!Array.isArray(this.characters) || this.characters.length === 0) {
                    try { await this.initializeStorageKeys(); } catch(_) {}
                    try { await this.loadCharacters(); } catch(_) {}

                    // If still empty, try to rebuild from esolite and wait a moment
                    if (!Array.isArray(this.characters) || this.characters.length === 0) {
                        try { this.panels.CHARS?.installEsoliteAdapter?.(); } catch(_) {}
                        await new Promise(r => setTimeout(r, 150));
                        try { this.panels.CHARS?.rebuildFromEsolite?.(); } catch(_) {}
                        await new Promise(r => setTimeout(r, 150));
                    }
                }
            } catch (_) {}
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
        async importCharactersFromData(data) {
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

                // Enable batch mode for multiple imports
                const isBatchImport = charactersToImport.length > 1;
                if (isBatchImport) {
                    this.batchImportMode = true;
                    this.log('state', `🔄 Starting batch import of ${charactersToImport.length} characters`);
                }

                for (const charData of charactersToImport) {
                    // Check if character already exists (by name and creator)
                    const existing = this.characters.find(char =>
                        char.name === charData.name &&
                        char.creator === charData.creator
                    );

                    if (!existing) {
                        // Always use the CHARS panel's addCharacter method for proper metadata preservation
                        if (KLITE_RPMod.panels?.CHARS?.addCharacter) {
                            await KLITE_RPMod.panels.CHARS.addCharacter(charData);
                            imported++;
                        } else {
                            throw new Error('CHARS panel not available. Character import requires proper panel initialization.');
                        }
                    }
                }

                // Save once at the end for batch imports, or individual save for single imports
                if (imported > 0) {
                    if (isBatchImport) {
                        this.batchImportMode = false;
                        this.log('state', `💾 Completing batch import with single save operation`);
                    }
                    this.saveCharacters();
                    // Imported ${imported} characters
                }

                if (imported > 0) {
                    this.essential(`📥 Import complete: ${imported} characters imported`);
                }
                return imported;

            } catch (error) {
                // Ensure batch mode is disabled on error
                this.batchImportMode = false;
                this.error('Failed to import characters:', error);
                return 0;
            }
        },

        // Export all characters as separate files (PNG preferred, otherwise JSON)
        async exportCharactersToFile() {
            try {
                const list = this.getEsoliteCharacterList();
                // Support both string-based lists and object metadata lists
                const names = list
                    .map(m => typeof m === 'string' ? m : (m && m.name) ? m.name : null)
                    .filter(Boolean);
                if (names.length === 0) { try { alert('No characters found to export.'); } catch(_) {} return; }

                // Some environments (file://, Safari) restrict multiple auto-downloads.
                const isFileProtocol = (typeof location !== 'undefined' && location.protocol === 'file:');
                const isSafari = (typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios/i.test(navigator.userAgent));
                const constrained = isFileProtocol || isSafari;

                if (constrained && names.length > 0) {
                    // Prefer ZIP export in constrained environments (file://, Safari)
                    try {
                        await this.exportCharactersAsZip(names);
                        return;
                    } catch (zipErr) {
                        try { alert('ZIP export failed, falling back to single JSON bundle.'); } catch(_) {}
                        try { await this.exportAllFromEsolite(); } catch(_) {}
                        return;
                    }
                }

                const toBlobFromDataURL = (dataURL) => {
                    try {
                        const parts = dataURL.split(',');
                        const header = parts[0];
                        const b64 = parts[1];
                        const mime = header.substring(header.indexOf(':') + 1, header.indexOf(';')) || 'application/octet-stream';
                        const bin = atob(b64);
                        const bytes = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                        return new Blob([bytes], { type: mime });
                    } catch (_) { return null; }
                };

                let delay = 0;
                for (const name of names) {
                    try {
                        const d = await window.getCharacterData?.(name);
                        if (!d) continue;
                        const safe = String(name).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
                        let blob, filename;
                        if (d.image && /^data:image\//.test(String(d.image))) {
                            blob = toBlobFromDataURL(String(d.image));
                            filename = `${safe}.png`;
                        } else {
                            const json = JSON.stringify(d.data || {}, null, 2);
                            blob = new Blob([json], { type: 'application/json' });
                            filename = `${safe}.json`;
                        }
                        if (!blob) continue;
                        const url = URL.createObjectURL(blob);
                        setTimeout(() => {
                            try {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = filename;
                                a.style.display = 'none';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            } finally {
                                setTimeout(() => URL.revokeObjectURL(url), 5000);
                            }
                        }, delay);
                        delay += 150; // stagger to improve reliability
                    } catch (_) {}
                }
            } catch (error) {
                this.error('Failed to export all characters (separate):', error);
            }
        }
    };

    // =============================================
    // RP MODE FORMATTING SYSTEM
    // =============================================

    KLITE_RPMod.onRPModeEnter = function () {
        this.log('rp', 'Entering RP mode - applying roleplay formatting');
        this.updateRPStyle();
        setTimeout(() => {
            this.formatRPContent();
        }, 200);
    };

    KLITE_RPMod.onRPModeExit = function () {
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

    KLITE_RPMod.updateRPStyle = function () {
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

    KLITE_RPMod.formatRPContent = function () {
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

    KLITE_RPMod.getRPMessageInfo = function (isUserMessage, content) {
        if (isUserMessage) {
            // User message - get persona info or use default
            const personaName = this.panels.TOOLS?.selectedPersona?.name || 'You';
            const personaAvatar = this.userAvatarCurrent || this.userAvatarDefault;
            const isCharacter = this.panels.TOOLS?.selectedPersona ? true : false;

            return {
                name: personaName,
                avatar: personaAvatar,
                isCharacter: isCharacter
            };
        } else {
            // AI message - resolve speaker without parsing text
            const isGroupChatActive = this.panels.ROLES?.enabled || false;

            if (isGroupChatActive && this.panels.ROLES?.activeChars) {
                // Prefer explicit pending speaker set when triggering generation
                // Fallback to current speaker tracked by ROLES panel
                const currentSpeaker = this.panels.ROLES.getCurrentSpeaker?.();
                if (currentSpeaker) {
                    return {
                        name: currentSpeaker.name,
                        avatar: currentSpeaker.avatar || currentSpeaker.image || this.aiAvatarCurrent || this.aiAvatarDefault,
                        isCharacter: true
                    };
                }
            }

            // Single-chat or unknown: use selected character if available, else default AI
            const characterName = this.panels.TOOLS?.selectedCharacter?.name || 'AI Assistant';
            const characterAvatar =
                this.panels.TOOLS?.selectedCharacter?.avatar ||
                this.panels.TOOLS?.selectedCharacter?.image ||
                this.aiAvatarCurrent || this.aiAvatarDefault;
            const isCharacter = !!this.panels.TOOLS?.selectedCharacter;

            return { name: characterName, avatar: characterAvatar, isCharacter };
        }
    };

    // =============================================
    // 4. PANEL DEFINITIONS
    // =============================================  

    // TOOLS Panel (formerly PLAY_RP)
    KLITE_RPMod.panels.TOOLS = {
        rules: '',
        personaEnabled: false,
        characterEnabled: false,
        selectedPersona: null,
        selectedCharacter: null,
        storedModeBeforeEdit: null,
        // Moved from PLAY_ADV: quick actions config for top of panel
        quickActions: ['>Look Around', '>Search', '>Check Inventory', '>Rest', '>Continue'],
        // Moved from PLAY_STORY: bookmarks/chapters list
        chapters: [],
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
        // Quick save slots removed in TOOLS

        render() {
            return `
                <!-- Bookmarks / Index -->
                ${t.section('Bookmarks / Index',
                `<div id="story-timeline" class="klite-timeline">
                        ${this.chapters.length ? this.renderChapters() : '<div class="klite-center klite-muted">No bookmarks yet</div>'}
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Add Bookmark', '', 'add-chapter')}
                        ${t.button('Delete All', 'danger', 'delete-chapters')}
                    </div>`
            )}

                <!-- Quick Actions (from ADV) -->
                ${t.section('Quick Actions',
                `<div style="display: grid; gap: 4px;">
                        ${this.quickActions.map((action, i) => `
                            <div class="klite-row" style="display: grid; grid-template-columns: minmax(0,1fr) 32px; gap: 2px; align-items: center;">
                                <div class="klite-input-wrap" style="position: relative; display: flex; align-items: center;">
                                    <input id="adv-quick-${i}" type="text" value="${action}" 
                                           style="flex:1; min-width:0; padding: 4px 8px; font-size: 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; color: var(--text);"
                                           placeholder="">
                                </div>
                                <button class="klite-btn klite-btn-sm" data-action="quick-${i}" 
                                        style="width: 32px; min-width: 32px; padding: 4px 0; font-size: 12px;">
                                    ${i + 1}
                                </button>
                            </div>
                        `).join('')}
                    </div>`
            )}


                

                <!-- Narrator Controls -->
                ${t.section('Narrator Controls',
                `<div class="klite-narrator-controls">
                        <div class="klite-row">
                            ${t.select('narrator-style', [
                    { value: 'omniscient', text: 'Omniscient', selected: true },
                    { value: 'limited', text: 'Limited' },
                    { value: 'objective', text: 'Objective' },
                    { value: 'character', text: 'Character POV' }
                ])}
                        </div>
                        <div class="klite-row" style="margin-top: 6px;">
                            ${t.select('narrator-focus', [
                    { value: 'environment', text: 'Environment' },
                    { value: 'emotions', text: 'Emotions' },
                    { value: 'action', text: 'Actions' },
                    { value: 'dialogue', text: 'Dialogue' },
                    { value: 'mixed', text: 'Mixed', selected: true }
                ])}
                        </div>
                        <div class="klite-narrator-explanation" style="margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px; color: var(--muted);">
                            <div id="narrator-explanation-text">
                                <strong>Omniscient:</strong> The narrator knows all characters' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.
                            </div>
                        </div>
                        <div class="klite-row" style="font-size: 11px; color: var(--muted); margin-bottom: 6px;">
                            The quality of the generated output depends highly on the model and it's capability to understand OOC instructions.
                        </div>
                        <div class="klite-row" style="margin-top: 10px;">
                            ${t.button('🎬 Trigger Narrator', 'klite-btn-primary', 'narrator')}
                        </div>
                    </div>`
            )}
                
                <!-- Quick Dice (moved from CONTEXT) -->
                ${t.section('🎲 Quick Dice',
                `<div class=\"klite-dice-grid\" style=\"gap: 4px;\">\n\
                        ${['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d =>
                    `
                            <button class=\"klite-btn klite-btn-sm\" data-action=\"roll-${d}\" style=\"width: 100%;\">${d}</button>
                        `
                ).join('')}\n\
                    </div>
                    <div class=\"klite-row\">\n\
                        ${t.input('tools-custom-dice', 'e.g., 2d6+3')}\n\
                        ${t.button('🎲 Roll', '', 'roll-custom')}\n\
                    </div>
                    <div id=\"tools-dice-result\" class=\"klite-dice-result klite-mt\"></div>`
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
            await this.loadSettings();
            this.setupCharacterIntegration();
            await this.setupAutoSender();
            // Initialize moved features (no quick save slots in TOOLS)
            await this.loadQuickActions();
            this.initQuickActions();
            await this.loadChapters();
            this.updateTimeline();
        },

        async loadSettings() {
            try {
                const raw = await KLITE_RPMod.loadFromLiteStorage('rpmod_tools_settings');
                if (!raw || raw === 'offload_to_indexeddb') return;
                const s = JSON.parse(raw);
                if (s) {
                    this.personaEnabled = !!s.personaEnabled;
                    this.characterEnabled = !!s.characterEnabled;
                    this.selectedPersona = s.selectedPersona || null;
                    this.selectedCharacter = s.selectedCharacter || null;
                    // Optionally restore names if provided
                    if (s.chatname && window.localsettings) {
                        window.localsettings.chatname = s.chatname;
                    }
                    if (s.chatopponent && window.localsettings) {
                        window.localsettings.chatopponent = s.chatopponent;
                    }
                    // Refresh avatars
                    try {
                        if (this.selectedPersona && this.personaEnabled) {
                            const up = this.selectedPersona.avatar || this.selectedPersona.image || null;
                            KLITE_RPMod.updateUserAvatar(up);
                        }
                        if (this.selectedCharacter && this.characterEnabled) {
                            const ap = this.selectedCharacter.avatar || this.selectedCharacter.image || null;
                            KLITE_RPMod.updateAIAvatar(ap);
                        }
                    } catch(_) {}
                }
            } catch (e) {
                KLITE_RPMod.log('panels', 'TOOLS.loadSettings failed:', e?.message || e);
            }
        },

        saveSettings() {
            try {
                const payload = {
                    personaEnabled: !!this.personaEnabled,
                    characterEnabled: !!this.characterEnabled,
                    selectedPersona: this.selectedPersona ? {
                        id: this.selectedPersona.id,
                        name: this.selectedPersona.name,
                        image: this.selectedPersona.image || this.selectedPersona.avatar || null,
                        type: this.selectedPersona.type
                    } : null,
                    selectedCharacter: this.selectedCharacter ? {
                        id: this.selectedCharacter.id,
                        name: this.selectedCharacter.name,
                        image: this.selectedCharacter.image || this.selectedCharacter.avatar || null,
                        type: this.selectedCharacter.type
                    } : null,
                    chatname: window.localsettings?.chatname || null,
                    chatopponent: window.localsettings?.chatopponent || null
                };
                KLITE_RPMod.saveToLiteStorage('rpmod_tools_settings', JSON.stringify(payload));
            } catch (e) {
                KLITE_RPMod.log('panels', 'TOOLS.saveSettings failed:', e?.message || e);
            }
        },

        actions: {
            'narrator': () => KLITE_RPMod.panels.TOOLS.triggerNarrator(),
            'skip-time': () => KLITE_RPMod.panels.TOOLS.skipTime(),
            'edit-last': () => KLITE_RPMod.panels.TOOLS.editLast(),
            'delete-last': () => KLITE_RPMod.panels.TOOLS.deleteLast(),
            'regenerate': () => KLITE_RPMod.panels.TOOLS.regenerate(),
            'undo': () => KLITE_RPMod.panels.TOOLS.undo(),
            'redo': () => KLITE_RPMod.panels.TOOLS.redo(),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic'),
            'auto-start': () => KLITE_RPMod.panels.TOOLS.handleAutoStart(),
            'auto-pause': () => KLITE_RPMod.panels.TOOLS.handleAutoPause(),
            'auto-continue': () => KLITE_RPMod.panels.TOOLS.handleAutoContinue(),
            'auto-stop': () => KLITE_RPMod.panels.TOOLS.handleAutoStop(),
            'auto-reset': () => KLITE_RPMod.panels.TOOLS.handleAutoReset(),
            'quick-send-1': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(1),
            'quick-send-2': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(2),
            'quick-send-3': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(3),
            'quick-send-4': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(4),
            'quick-send-5': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(5),
            // Quick Actions (from ADV)
            'quick-0': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(0),
            'quick-1': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(1),
            'quick-2': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(2),
            'quick-3': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(3),
            'quick-4': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(4),

            // Bookmarks/Chapters (from STORY)
            'add-chapter': () => KLITE_RPMod.panels.TOOLS.addChapter(),
            'delete-chapters': () => KLITE_RPMod.panels.TOOLS.deleteAllChapters(),
            'goto-chapter': (e) => {
                const chapterIndex = parseInt(e.target.closest('[data-chapter]').dataset.chapter);
                KLITE_RPMod.panels.TOOLS.goToChapter(chapterIndex);
            },

            // Save/Load slot actions removed from PLAY_RP

            // Character Integration actions
            'apply-persona': () => KLITE_RPMod.panels.TOOLS.applyPersona(),
            'apply-character': () => KLITE_RPMod.panels.TOOLS.applyCharacter(),
            'select-character': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => {
                    KLITE_RPMod.panels.TOOLS.selectedCharacter = char;
                    KLITE_RPMod.panels.TOOLS.characterEnabled = true;

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
                        KLITE_RPMod.panels.TOOLS.applyCharacterData(char);
                    }

                    // Refresh current left panel (TOOLS or ROLES) without switching
                    const left = KLITE_RPMod.state?.tabs?.left;
                    if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);
                    // Character application confirmed by UI state change
                });
            },
            'select-persona': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => {
                    const tools = KLITE_RPMod.panels.TOOLS;
                    tools.selectedPersona = char;
                    tools.personaEnabled = true;

                    // Update user avatar with persona image if available
                    if (char.avatar || char.image) {
                        KLITE_RPMod.updateUserAvatar(char.avatar || char.image);
                    } else {
                        KLITE_RPMod.updateUserAvatar(null);
                    }

                    // Update character context and persist selection
                    tools.updateCharacterContext();
                    try { tools.saveSettings?.(); } catch(_) {}

                    // Refresh panels immediately so the persona tile appears without tab switching
                    try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
                    const left2 = KLITE_RPMod.state?.tabs?.left;
                    if (left2 === 'TOOLS' || left2 === 'ROLES') KLITE_RPMod.loadPanel('left', left2);
                });
            },
            'remove-persona': () => KLITE_RPMod.panels.TOOLS.removePersona(),
            'remove-character': () => KLITE_RPMod.panels.TOOLS.removeCharacter(),
            // Quick Dice actions relocated here (panel now TOOLS)
            'roll-d2': () => KLITE_RPMod.panels.CONTEXT.rollDice('d2'),
            'roll-d4': () => KLITE_RPMod.panels.CONTEXT.rollDice('d4'),
            'roll-d6': () => KLITE_RPMod.panels.CONTEXT.rollDice('d6'),
            'roll-d8': () => KLITE_RPMod.panels.CONTEXT.rollDice('d8'),
            'roll-d10': () => KLITE_RPMod.panels.CONTEXT.rollDice('d10'),
            'roll-d12': () => KLITE_RPMod.panels.CONTEXT.rollDice('d12'),
            'roll-d20': () => KLITE_RPMod.panels.CONTEXT.rollDice('d20'),
            'roll-d100': () => KLITE_RPMod.panels.CONTEXT.rollDice('d100'),
            'roll-custom': () => {
                const input = document.getElementById('tools-custom-dice');
                if (input?.value) { KLITE_RPMod.panels.CONTEXT.rollDice(input.value); }
            }
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
            const isGroupChatActive = KLITE_RPMod.panels.ROLES?.enabled || false;
            const isEsolite = !!(document.getElementById('topbtn_data_manager') || document.getElementById('openTreeDiagram') || document.getElementById('topbtn_remote_mods'));
            const policy = KLITE_RPMod.state?.avatarPolicy || { esoliteAdapter:false, liteExperimental:false };
            const adapterStatus = isEsolite ? 'Esolite (active)' : (policy.liteExperimental ? 'Lite Experimental (active)' : 'Off');

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

        async loadSettings() {
            try {
                const raw = await KLITE_RPMod.loadFromLiteStorage('rpmod_playrp_settings');
                if (raw && raw !== 'offload_to_indexeddb') {
                    const s = JSON.parse(raw);
                    this.rules = typeof s.rules === 'string' ? s.rules : this.rules;
                    this.selectedCharacter = s.selectedCharacter || this.selectedCharacter;
                    this.characterEnabled = !!s.characterEnabled;
                    this.selectedPersona = s.selectedPersona || this.selectedPersona;
                    this.personaEnabled = !!s.personaEnabled;
                    if (s.autoSender) this.autoSender = { ...this.autoSender, ...s.autoSender };
                    KLITE_RPMod.log('panels', 'TOOLS (RP) settings loaded');
                }
            } catch (e) { KLITE_RPMod.error('Failed to load TOOLS (RP) settings', e); }
        },

        saveSettings() {
            try {
                const s = {
                    rules: this.rules || '',
                    selectedCharacter: this.selectedCharacter || null,
                    characterEnabled: !!this.characterEnabled,
                    selectedPersona: this.selectedPersona || null,
                    personaEnabled: !!this.personaEnabled,
                    autoSender: this.autoSender ? { enabled: !!this.autoSender.enabled, interval: this.autoSender.interval, message: this.autoSender.message } : null
                };
                KLITE_RPMod.saveToLiteStorage('rpmod_playrp_settings', JSON.stringify(s));
                KLITE_RPMod.log('panels', 'TOOLS (RP) settings saved');
            } catch (e) { KLITE_RPMod.error('Failed to save TOOLS (RP) settings', e); }
        },

        saveRules() {
            KLITE_RPMod.saveToLiteStorage('rpmod_rp_rules', this.rules);
            KLITE_RPMod.log('panels', 'RP rules saved to storage');
        },

        async setupAutoSave() {
            let saveTimer = null;
            const textarea = document.getElementById('rp-rules');
            // autosave checkbox was part of removed quick save section; guard for null
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
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            document.getElementById('rp-ai-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatopponent = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `AI name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            // Periodic autosave guard when enabled and not generating
            try {
                if (this._autosaveGuard) clearInterval(this._autosaveGuard);
                const isGenerating = () => {
                    try { return (window.pending_response_id && window.pending_response_id !== '') || (typeof window.synchro_pending_stream !== 'undefined' && window.synchro_pending_stream !== ''); } catch (_) { return false; }
                };
                this._autosaveGuard = setInterval(() => {
                    const enabled = document.getElementById('rp-autosave')?.checked;
                    if (!enabled) return;
                    if (isGenerating()) return;
                    try { window.autosave?.(); } catch (_) {}
                }, 60000);
            } catch (_) {}
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
                KLITE_RPMod.submitWithRole('ai');
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

            const userTextEl = document.getElementById('input_text');
            const chatEl = document.getElementById('cht_inp') || document.getElementById('corpo_cht_inp');
            const currentUser = (chatEl?.value || userTextEl?.value || '').trim();
            const combined = instruction + (currentUser ? '\n\n' + currentUser : '');
            this.sendTextToEsolite(combined);
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

            // Name inputs (bind here so they work when controls are rendered in ROLES)
            document.getElementById('rp-user-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatname = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `User name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            document.getElementById('rp-ai-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatopponent = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `AI name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            // Lite avatars experimental toggle
            document.getElementById('lite-avatars-experimental')?.addEventListener('change', e => {
                try { KLITE_RPMod.enableLiteAvatarsExperimental(!!e.target.checked); } catch(_){}
                // Re-render to reflect status
                const left = KLITE_RPMod.state?.tabs?.left;
                if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);
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
                        this.autoSender.quickMessages[i - 1] = e.target.value;
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
            const qm = this.autoSender.quickMessages[slot - 1];
            if (qm && qm.trim()) {
                this.sendQuickMessage(qm);
                KLITE_RPMod.log('panels', `Quick message ${slot} sent: ${qm}`);
                return;
            }
            // Fallback to Quick Actions if slot empty
            const idx = slot - 1;
            const action = this.quickActions[idx];
            if (action && action.trim()) {
                this.sendTextToEsolite(action);
                KLITE_RPMod.log('panels', `Fallback quick action ${slot} sent: ${action}`);
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

            switch (state) {
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

        // Unified sender for Auto Sender and helpers
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
            // Route to correct Esobold input and submit
            this.sendTextToEsolite(contextMessage);
        },

        // Low-level sender that targets Esobold/Lite inputs directly
        sendTextToEsolite(text) {
            try {
                const mode = window.localsettings?.opmode || 3;
                if (mode === 3) {
                    // Chat mode: prefer chat inputs
                    const chatInputs = [
                        document.getElementById('cht_inp'),
                        document.getElementById('corpo_cht_inp')
                    ].filter(Boolean);
                    if (chatInputs.length) {
                        chatInputs[0].value = text;
                        if (typeof window.chat_submit_generation === 'function') {
                            return window.chat_submit_generation();
                        }
                        if (typeof window.submit_generation_button === 'function') {
                            return window.submit_generation_button(true);
                        }
                    }
                }
                // Fallback to classic input
                const liteInput = document.getElementById('input_text');
                if (liteInput) {
                    liteInput.value = text;
                    if (typeof window.prepare_submit_generation === 'function') {
                        return window.prepare_submit_generation();
                    }
                    return LiteAPI.generate();
                }
                KLITE_RPMod.log('panels', 'sendTextToEsolite: No suitable input found');
            } catch (e) {
                KLITE_RPMod.error('sendTextToEsolite failed', e);
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
                    quickInput.value = this.autoSender.quickMessages[i - 1] || '';
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

        // Quick Actions (moved from PLAY_ADV)
        async loadQuickActions() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_adv_actions');
            if (saved) {
                this.quickActions = JSON.parse(saved);
                KLITE_RPMod.log('state', `Loaded ${this.quickActions.length} quick actions from storage`);
            }
        },

        initQuickActions() {
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
            if (action && action.trim()) {
                KLITE_RPMod.log('panels', `Quick action sent: ${action}`);
                this.sendTextToEsolite(action);
            }
        },

        // Bookmarks/Chapters (moved from PLAY_STORY)
        renderChapters() {
            return this.chapters.map((ch, i) => `
                <div class="klite-timeline-item" data-chapter="${i}" data-action="goto-chapter" style="cursor: pointer;">
                    <strong>Chapter ${ch.number}:</strong> ${ch.title}
                    <div style="font-size: 11px; color: var(--muted);">${ch.wordCount} words</div>
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
            const title = prompt('Enter bookmark title:', `Bookmark ${this.chapters.length + 1}`);
            if (!title) return;

            const wordCount = window.gametext_arr ?
                gametext_arr.join(' ').split(/\s+/).filter(w => w).length : 0;

            // Determine current scroll position using host container
            const container = this.getChatScrollContainer();
            const position = container ? container.scrollTop : (document.documentElement.scrollTop || window.scrollY || 0);

            this.chapters.push({
                number: this.chapters.length + 1,
                title: title,
                wordCount: wordCount,
                position: position
            });

            this.saveChapters();
            this.updateTimeline();
            KLITE_RPMod.log('panels', `Bookmark added: ${title}`);
        },

        deleteAllChapters() {
            if (confirm('Delete all bookmarks?')) {
                this.chapters = [];
                this.saveChapters();
                this.updateTimeline();
                KLITE_RPMod.log('panels', 'All bookmarks deleted');
            }
        },

        updateTimeline() {
            const timeline = document.getElementById('story-timeline');
            if (timeline) {
                timeline.innerHTML = this.chapters.length ? this.renderChapters() : '<div class="klite-center klite-muted">No bookmarks yet</div>';
            }
        },

        goToChapter(index) {
            const chapter = this.chapters[index];
            if (!chapter || typeof chapter.position !== 'number') return;

            const container = this.getChatScrollContainer();
            if (container) {
                container.scrollTop = chapter.position;
            } else {
                // Fallback to window scrolling
                try { window.scrollTo({ top: chapter.position, behavior: 'smooth' }); } catch(_) { window.scrollTo(0, chapter.position); }
            }
            KLITE_RPMod.log('panels', `Scrolled to bookmark ${chapter.number} at position ${chapter.position}`);
        },

        // Find the primary scroll container for chat/story content
        getChatScrollContainer() {
            // Esobold primary container
            const gamescreen = document.getElementById('gamescreen');
            if (gamescreen) return gamescreen;
            // Prefer RPmod mirror if present (overlay mode)
            const mirror = document.getElementById('chat-display');
            if (mirror) return mirror;
            // Else find nearest scrollable ancestor of #gametext
            const content = document.getElementById('gametext');
            let el = content ? content.parentElement : null;
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                const oy = style.overflowY;
                if (oy === 'auto' || oy === 'scroll') return el;
                el = el.parentElement;
            }
            return null;
        },


        refresh() {
            const left = KLITE_RPMod.state?.tabs?.left;
            if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);
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
            const msg = '[Time passes. Continue the story from a later moment]';
            this.sendTextToEsolite(msg);
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
                this.personaEnabled = true;
                this.saveSettings?.();

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

                // Update user avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(personaData);
                KLITE_RPMod.updateUserAvatar(best || null);

                // Update character context in memory
                this.updateCharacterContext();
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
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
                this.characterEnabled = true;
                this.saveSettings?.();

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

                // Update AI avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(characterData);
                KLITE_RPMod.updateAIAvatar(best || null);

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
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
            } else {
                alert('Failed to apply character');
            }
        },

        applyCharacterData(characterData) {
            if (characterData) {
                this.selectedCharacter = characterData;
                this.characterEnabled = true;
                this.saveSettings?.();

                // Update AI avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(characterData);
                KLITE_RPMod.updateAIAvatar(best || null);

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
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
            }
        },

        removePersona() {
            this.selectedPersona = null;
            this.personaEnabled = false;
            this.saveSettings?.();

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

            // Refresh current left panel (TOOLS or ROLES) without switching
            const left = KLITE_RPMod.state?.tabs?.left;
            if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);

            // Update character context in memory
            this.updateCharacterContext();
            // Ensure ROLES panel reflects changes immediately if visible
            try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
        },

        removeCharacter() {
            this.selectedCharacter = null;
            this.characterEnabled = false;
            this.saveSettings?.();

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

            // Refresh current left panel (TOOLS or ROLES) without switching
            const left2 = KLITE_RPMod.state?.tabs?.left;
            if (left2 === 'TOOLS' || left2 === 'ROLES') KLITE_RPMod.loadPanel('left', left2);

            // Update character context in memory
            this.updateCharacterContext();
            // Ensure ROLES panel reflects changes immediately if visible
            try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
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
    };

    // CONTEXT PANEL (formerly TOOLS)
    KLITE_RPMod.panels.CONTEXT = {
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
                    { value: 'entire', text: 'Entire Story' },
                    { value: 'last50', text: 'Last 50 Messages' },
                    { value: 'recent', text: 'Recent Messages (10)', selected: true },
                    { value: 'last3', text: 'Most Recent (3)' }
                ])}
                        ${t.select('tools-memory-type', [
                    { value: 'summary', text: 'Summary', selected: true },
                    { value: 'keywords', text: 'Keywords' },
                    { value: 'outline', text: 'Outline' }
                ])}
                    </div>
                    <div style="text-align: center; margin: 15px 0;">
                        ${t.button('🧠 Generate Memory', '', 'generate-memory')}
                    </div>
                    ${t.textarea('tools-memory-output', 'Generated memory will appear here.')}
                    <div class="klite-row" style="font-size: 11px; color: var(--muted); margin-top: 6px;">
                        The quality of the generated output depends highly on the model and it's capability to understand OOC instructions.
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('✓ Apply', '', 'apply-memory')}
                        ${t.button('➕ Append', '', 'append-memory')}
                    </div>`
            )}
                
                <!-- Auto-Regenerate -->
                ${t.section('🔄 Auto-Regenerate',
                `<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="tools-auto-regen-toggle" style="width: auto;">
                        <label for="tools-auto-regen-toggle" style="color: var(--muted); font-size: 13px;">Enable Auto-Regenerate</label>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-bottom: 10px;">
                        <div>
                            <label style="color: var(--muted); font-size: 11px;">Delay (ms):</label>
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
                            <label style="color: var(--muted); font-size: 11px;">Max Retries:</label>
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
                        <label style="color: var(--muted); font-size: 11px;">Keyword Triggers:</label>
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
                                <label style="color: var(--muted); font-size: 11px;">Required matches:</label>
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
                                <label for="tools-keyword-case" style="color: var(--muted); font-size: 11px;">Case sensitive</label>
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
                        background: var(--bg3); 
                        border: 1px solid var(--border);
                        border-radius: 4px; 
                        color: var(--muted); 
                        font-size: 11px; 
                        text-align: center;
                    ">
                        Auto-regenerate is disabled
                    </div>`
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
            'generate-memory': () => { KLITE_RPMod.panels.CONTEXT.generateMemory(); },
            'apply-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(false),
            'append-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(true),
            'export-markdown': () => KLITE_RPMod.panels.CONTEXT.exportAs('markdown'),
            'export-json': () => KLITE_RPMod.panels.CONTEXT.exportAs('json'),
            'export-html': () => KLITE_RPMod.panels.CONTEXT.exportAs('html'),
            'calculate-context': () => KLITE_RPMod.panels.CONTEXT.analyzeContext(),
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
                const currentMemory = LiteAPI.memory;
                LiteAPI.memory = currentMemory + (currentMemory.length > 0 ? '\n\n' : '') + memory;
            } else {
                // Replace existing memory completely
                LiteAPI.memory = memory;
            }

            // Update memory field in KoboldAI Lite
            const liteMemory = DOMUtil.safeGet('memorytext');
            if (liteMemory) {
                liteMemory.value = LiteAPI.memory;
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
                    status.style.color = 'var(--success)';
                } else {
                    this.stopAutoRegenerate();
                    status.textContent = 'Auto-regenerate is disabled';
                    status.style.color = 'var(--muted)';
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

                KLITE_RPMod.log('tools', `Auto-regen keywords updated: ${keywords.length} keywords set`);
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

            KLITE_RPMod.log('tools', `Auto-regenerate started with ${delay}ms delay`);

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
                KLITE_RPMod.log('tools', 'Auto-regenerate max retries reached, stopping');
                this.stopAutoRegenerate();

                const status = document.getElementById('tools-auto-regen-status');
                if (status) {
                    status.textContent = '⚠️ Max retries reached';
                    status.style.color = '#f0ad4e';
                }
                return;
            }

            KLITE_RPMod.log('tools', `Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);

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
                KLITE_RPMod.log('tools', 'Auto-regen trigger: Short message');
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

    // ROLES PANEL (formerly GROUP)
    KLITE_RPMod.panels.ROLES = {
        enabled: false,
        activeChars: [],
        // Next speaker index
        currentSpeaker: 0,
        // Last speaker index (-1 = none yet)
        lastSpeaker: -1,
        speakerHistory: [],

        // Auto-response system
        speakerMode: 'manual', // 'manual', 'round-robin', 'random', 'keyword', 'talkative', 'party'
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
            // Ensure Character & Persona controls (rendered here from TOOLS) are wired immediately
            setTimeout(() => { try { KLITE_RPMod.panels.TOOLS?.setupCharacterIntegration?.(); } catch (_) {} }, 120);
        },


        render() {
            return `
                ${t.section('Group Chat Control',
                `<label>
                        <input type=\"checkbox\" id=\"group-enabled\" ${this.enabled ? 'checked' : ''}>
                        Enable advanced Group Chat in Esobold
                    </label>`
            )}
                
                ${t.section('Character & Persona Integration',
                `<div class=\"klite-char-persona-controls\">\n\
                        ${KLITE_RPMod.panels.TOOLS.renderPersonaControls()}\n\
                        ${KLITE_RPMod.panels.TOOLS.renderCharacterControls()}\n\
                    </div>`
            )}
                
                ${this.enabled ? this.renderGroupControls() : ''}
            `;
        },

        setupEventHandlers() {
            document.getElementById('group-enabled')?.addEventListener('change', e => {
                this.enabled = e.target.checked;
                this.refresh();
                try { this.saveSettings?.(); } catch(_) {}

                if (this.enabled) {
                    // Entering group chat: force chat mode, but do NOT set a multi-name chatopponent.
                    if (window.localsettings) window.localsettings.opmode = 3;
                    try { if (KLITE_RPMod.panels.TOOLS) KLITE_RPMod.panels.TOOLS.characterEnabled = false; } catch(_){}
                } else {
                    // Leaving group chat: restore AI name to selected character or input field
                    try {
                        if (window.localsettings) {
                            const selected = KLITE_RPMod.panels.TOOLS?.selectedCharacter;
                            const aiNameInput = document.getElementById('rp-ai-name');
                            const fallback = (aiNameInput && aiNameInput.value) ? aiNameInput.value : (selected?.name || window.localsettings.chatopponent || 'AI');
                            window.localsettings.chatopponent = fallback;
                            window.save_settings?.();
                            window.handle_bot_name_onchange?.();
                        }
                    } catch(_){}
                }

                // Refresh TOOLS panel to update character controls (works in panels-only mode as well)
                try {
                    const left = KLITE_RPMod.state?.tabs?.left;
                    if (left === 'TOOLS' || left === 'ROLES') {
                        KLITE_RPMod.loadPanel('left', left);
                    }
                } catch(_){}

                // Update Lite's avatar variables to reflect group/single state
                try { KLITE_RPMod.applyAvatarOverrides(); } catch (_) {}
            });


        },

        changeSpeakerMode(newMode) {
            this.speakerMode = newMode;
            this.saveSettings(); // Save the new setting
            this.clearAutoResponseTimer();
            KLITE_RPMod.loadPanel('left', 'ROLES');
        },

        getSpeakerModeDescription() {
            switch (this.speakerMode) {
                case 'manual':
                    return 'Manual order: Characters speak only when triggered manually.';
                case 'round-robin':
                    return 'Round Robin: Characters take turns speaking in a circular order.';
                case 'random':
                    return 'Random Selection: A random character is chosen for each turn, with optional exclusion of recent speakers.';
                case 'keyword':
                    return 'Keyword Triggered: Characters respond when mentioned by name or specific keywords in the conversation.';
                case 'talkative':
                    return 'Talkative Weighted: Characters speak based on their talkativeness rating with cooldown periods.';
                case 'party':
                    return 'Party Round Robin: Everyone speaks once per round before anyone gets to speak again.';
                default:
                    return 'Manual order: Characters speak only when triggered manually.';
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
                
                ${t.section('Character selection',
                `<div class="klite-muted" style="display: flex; gap: 12px; align-items: center;">
                        <span>Last: <strong style="color: #e0b400;">${(this.lastSpeaker >= 0 ? (this.activeChars[this.lastSpeaker]?.name) : '—') || '—'}</strong></span>
                        <span>Next: <strong style="color: #2aa84a;">${this.getCurrentSpeaker()?.name || '—'}</strong></span>
                    </div>
                    <div class="klite-mt">
                        <label>Next Speaker Selection:</label>
                        <select id="speaker-mode" class="klite-select" style="width: 100%;" onchange="KLITE_RPMod.panels.ROLES.changeSpeakerMode(this.value)">
                            <option value="manual" ${this.speakerMode === 'manual' ? 'selected' : ''}>Manual Order</option>
                            <option value="round-robin" ${this.speakerMode === 'round-robin' ? 'selected' : ''}>Round Robin</option>
                            <option value="random" ${this.speakerMode === 'random' ? 'selected' : ''}>Random Selection</option>
                            <option value="keyword" ${this.speakerMode === 'keyword' ? 'selected' : ''}>Keyword Triggered</option>
                            <option value="talkative" ${this.speakerMode === 'talkative' ? 'selected' : ''}>Talkative Weighted</option>
                            <option value="party" ${this.speakerMode === 'party' ? 'selected' : ''}>Party Round Robin</option>
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
                `<div style="max-height: 140px; overflow-y: auto; font-size: 11px;">
                        ${this.speakerHistory.slice(-20).map((entry, i) => `
                            <div data-action="goto-history" data-index="${i}" style="padding: 4px 6px; margin: 2px 0; background: rgba(0,0,0,0.1); border-radius: 3px; display: flex; justify-content: space-between; cursor: pointer;">
                                <span>${entry.name}</span>
                                <span style="color: var(--muted);">${typeof entry.tokens === 'number' ? entry.tokens : '—'}</span>
                            </div>
                        `).join('')}
                    </div>`
            ) : ''}
            `;
        },

        renderAutoResponseControls() {
            const isManual = this.speakerMode === 'manual';
            const isDisabled = isManual || !this.autoResponses.enabled;

            return `
                <div style="margin-top: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg3); ${isManual ? 'opacity: 0.5;' : ''}">
                    <div style="margin-bottom: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: ${isManual ? 'not-allowed' : 'pointer'};">
                            <input type="checkbox" id="auto-responses-enabled" ${this.autoResponses.enabled ? 'checked' : ''} 
                                   ${isManual ? 'disabled' : ''}
                                   onchange="KLITE_RPMod.panels.ROLES.toggleAutoResponses(this.checked)">
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
                                   onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseDelay(this.value)">
                            <span style="font-size: 12px; color: var(--muted);">seconds</span>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="enable-self-answers" ${this.autoResponses.enableSelfAnswers ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('enableSelfAnswers', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Enable self-answers</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="continue-without-player" ${this.autoResponses.continueWithoutPlayer ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('continueWithoutPlayer', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Continue without player input</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="auto-advance-after-trigger" ${this.autoResponses.autoAdvanceAfterTrigger ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('autoAdvanceAfterTrigger', this.checked)">
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
                const isNext = (i === this.currentSpeaker);
                const isLast = (i === this.lastSpeaker);
                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2); ${isNext ? 'border-color: var(--accent); background: rgba(42, 168, 74, 0.12);' : isLast ? 'border-color: #e0b400; background: rgba(224, 180, 0, 0.12);' : ''}">
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
                            <div style="font-weight: bold; color: var(--text);">
                                ${char.name}
                                ${isLast ? '<span style="margin-left:6px; padding:1px 4px; font-size:10px; border-radius:3px; background:#e0b400; color:#000;">Last</span>' : ''}
                                ${isNext ? '<span style="margin-left:6px; padding:1px 4px; font-size:10px; border-radius:3px; background:#2aa84a; color:#fff;">Next</span>' : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button class="klite-btn" data-action="set-speaker" data-index="${i}" style="padding: 4px 8px; font-size: 11px;">Set Next</button>
                            <button class="klite-btn danger" data-action="remove-from-group" data-index="${i}" style="padding: 4px 8px; font-size: 11px;">Remove</button>
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
            try { this.saveSettings?.(); } catch(_) {}

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
            try { this.saveSettings?.(); } catch(_) {}
        },

        updateAutoResponseSetting(setting, value) {
            this.autoResponses[setting] = value;
            try { this.saveSettings?.(); } catch(_) {}
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
            const nextSpeaker = this.selectNextSpeaker(this.speakerMode, true);
            if (nextSpeaker !== null) {
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

            // Update Next speaker and UI if requested (no history change; trigger handles history)
            if (updateCurrent && nextSpeaker !== null) {
                this.currentSpeaker = nextSpeaker;
                this.refresh();
                KLITE_RPMod.log('panels', `Speaker selection (${mode}): ${this.activeChars[this.currentSpeaker]?.name} (index ${this.currentSpeaker})`);
            }

            return nextSpeaker;
        },

        actions: {
            // Proxy persona/character actions to TOOLS so ROLES buttons work immediately
            'select-persona': () => KLITE_RPMod.panels.TOOLS.actions['select-persona'](),
            'select-character': () => KLITE_RPMod.panels.TOOLS.actions['select-character'](),
            'apply-persona': () => KLITE_RPMod.panels.TOOLS.applyPersona?.(),
            'apply-character': () => KLITE_RPMod.panels.TOOLS.applyCharacter?.(),
            'remove-persona': () => KLITE_RPMod.panels.TOOLS.removePersona?.(),
            'remove-character': () => KLITE_RPMod.panels.TOOLS.removeCharacter?.(),

            'add-from-library': () => {
                KLITE_RPMod.showUnifiedCharacterModal('multi-select');
            },

            'add-custom': () => {
                KLITE_RPMod.panels.ROLES.showCustomCharacterModal();
            },

            'edit-current': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const currentSpeaker = groupPanel.getCurrentSpeaker();
                if (currentSpeaker && currentSpeaker.isCustom) {
                    groupPanel.showCustomCharacterModal(currentSpeaker);
                }
            },

            'goto-history': (e) => {
                try {
                    const target = e.target.closest('[data-index]');
                    if (!target) return;
                    const idx = parseInt(target.dataset.index);
                    KLITE_RPMod.panels.ROLES.gotoHistory(idx);
                } catch (_) {}
            },


            'set-speaker': (e) => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                groupPanel.currentSpeaker = parseInt(e.target.dataset.index);
                groupPanel.refresh();
                groupPanel.saveSettings?.();
            },

            'next-speaker': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const next = groupPanel.selectNextSpeaker(groupPanel.speakerMode, false);
                if (next !== null && typeof next === 'number') {
                    groupPanel.currentSpeaker = next;
                    groupPanel.refresh();
                    KLITE_RPMod.log('panels', `Selected next speaker: ${groupPanel.getCurrentSpeaker()?.name}`);
                    groupPanel.saveSettings?.();
                }
            },

            'trigger-response': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                KLITE_RPMod.log('group', `Trigger Speaker clicked; next speaker: ${groupPanel.getCurrentSpeaker()?.name || 'none'}`);
                // Ensure backend knows we are in chat group mode and participants are synced
                if (window.localsettings) {
                    window.localsettings.opmode = 3; // chat
                }
                groupPanel.updateKoboldSettings();
                try {
                    const chatDisplay = document.getElementById('chat-display');
                    groupPanel._preTriggerScroll = chatDisplay ? chatDisplay.scrollTop : 0;
                } catch (_) {}
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
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const index = parseInt(e.target.dataset.index);
                const char = groupPanel.activeChars[index];

                // Remove character avatar from group avatars map
                if (char) {
                    KLITE_RPMod.groupAvatars.delete(char.id);
                }

                groupPanel.activeChars.splice(index, 1);
                if (groupPanel.currentSpeaker >= groupPanel.activeChars.length) {
                    groupPanel.currentSpeaker = Math.max(0, groupPanel.activeChars.length - 1);
                }
                if (groupPanel.lastSpeaker === index) {
                    groupPanel.lastSpeaker = -1;
                } else if (groupPanel.lastSpeaker > index) {
                    groupPanel.lastSpeaker -= 1;
                }
                groupPanel.refresh();
                groupPanel.saveSettings?.();
            },


        },


        getCurrentSpeaker() {
            return this.activeChars[this.currentSpeaker];
        },

        // Build a compact character snippet suitable for tail injection
        _buildCharacterSnippet(charObj, label) {
            if (!charObj) return '';
            const name = (charObj.name || '').trim();
            const desc = (charObj.description || charObj.content || '').trim();
            const personality = (charObj.personality || '').trim();
            const scenario = (charObj.scenario || '').trim();
            const notes = (charObj.creator_notes || charObj.post_history_instructions || '').trim();
            const parts = [];
            parts.push(`[${label}: ${name}]`);
            if (desc) parts.push(`Description: ${desc}`);
            if (personality) parts.push(`Personality: ${personality}`);
            if (scenario) parts.push(`Scenario: ${scenario}`);
            if (notes) parts.push(`Notes: ${notes}`);
            return parts.join('\n');
        },

        // Prepare and set tail injection for current turn; returns {ok:boolean, reason?:string}
        _prepareTailInjectionForTurn() {
            try {
                const speaker = this.getCurrentSpeaker();
                const personaEnabled = !!KLITE_RPMod.panels.TOOLS?.personaEnabled;
                const selectedPersona = KLITE_RPMod.panels.TOOLS?.selectedPersona;

                const blocks = [];
                // User persona (if enabled)
                if (personaEnabled && selectedPersona) {
                    blocks.push(this._buildCharacterSnippet(selectedPersona, 'User Character'));
                } else {
                    // at minimum annotate the user name if present
                    const uname = (window.localsettings?.chatname || '').trim();
                    if (uname) blocks.push(`[User: ${uname}]`);
                }
                // AI current speaker
                if (speaker) {
                    blocks.push(this._buildCharacterSnippet(speaker, 'Character'));
                }
                const injection = blocks.filter(Boolean).join('\n\n');

                // Capacity check using Lite's estimator
                const base = (window.current_temp_memory||'') + rpmod_concat_history_safe();
                const cap = rpmod_get_max_allowed_chars(base);
                const projected = base.length + injection.length;
                if (projected > cap) {
                    return { ok:false, reason:'Character data exceeds available context budget. Reduce character data or disable some roles.' };
                }

                // Prepend into pending_context_preinjection so it becomes part of tail
                rpmod_prepend_preinjection(injection);
                return { ok:true };
            } catch (e) {
                return { ok:true }; // fail open
            }
        },

        triggerCurrentSpeaker() {
            KLITE_RPMod.log('group', 'Triggering current speaker via advanced handler');
            const speaker = this.getCurrentSpeaker();
            KLITE_RPMod.log('panels', `Triggering speaker: ${speaker?.name || 'none'} (index: ${this.currentSpeaker})`);

            if (!speaker) {
                // No speaker selected
                return;
            }

            // (Removed) pending speaker tracking; avatars now use Lite variables

            // Force chat mode in Lite
            if (window.localsettings) {
                window.localsettings.opmode = 3; // chat mode
            }

            // Set the active speaker as the AI opponent for this turn
            try {
                if (window.localsettings && speaker?.name) {
                    window.localsettings.chatopponent = speaker.name;
                    window.save_settings?.();
                    window.handle_bot_name_onchange?.();
                }
                // Update AI avatar to speaker's best avatar if available
                try {
                    const best = KLITE_RPMod.getBestCharacterAvatar?.(speaker);
                    if (best) KLITE_RPMod.updateAIAvatar?.(best);
                } catch(_){}
            } catch(_) {}

            // Track last trigger time for talkative/weighted modes
            try {
                this.lastTriggerTime = this.lastTriggerTime || {};
                this.lastTriggerTime[this.currentSpeaker] = Date.now();
            } catch (_) {}

            // Seed first-turn context if absolutely empty to allow empty submit
            try {
                const noContext = Array.isArray(window.gametext_arr) && window.gametext_arr.length === 0 &&
                    (!window.current_memory || window.current_memory.trim() === '') &&
                    (!window.current_anote || window.current_anote.trim() === '');
                if (noContext) {
                    window.gametext_arr.push('');
                }
            } catch (_) {}

            // Do not override group participants list in host; keep chatopponent as full group.

            // Build tail injection for this turn; warn and abort if overflowing
            const prep = this._prepareTailInjectionForTurn();
            if (!prep.ok) {
                try { alert(prep.reason); } catch(_) {}
                return;
            }

            // Trigger generation in Lite: align with narrator flow
            // If same speaker as last turn, prefer a fresh turn routine
            // Prefer original chat_submit_generation so inputs are piped correctly
            const callOrig = (fn)=>{ try { return fn(); } catch(_){ return; } };
            if (this.lastSpeaker === this.currentSpeaker && typeof window.submit_generation === 'function' && !window._orig_chat_submit_generation) {
                window.submit_generation('');
            } else if (typeof window._orig_chat_submit_generation === 'function') {
                callOrig(window._orig_chat_submit_generation);
            } else if (typeof window.chat_submit_generation === 'function') {
                window.chat_submit_generation();
            } else if (typeof window.submit_generation === 'function') {
                window.submit_generation('');
            } else if (typeof window.submit_generation_button === 'function') {
                window.submit_generation_button();
            } else {
                KLITE_RPMod.log('panels', 'Generation function unavailable');
            }

            // Update Last marker and history entry
            try {
                const idx = this.currentSpeaker;
                this.lastSpeaker = idx;
                const chatDisplay = document.getElementById('chat-display');
                const scrollPos = typeof this._preTriggerScroll === 'number' ? this._preTriggerScroll : (chatDisplay ? chatDisplay.scrollTop : 0);
                this.addToSpeakerHistory(idx, { scrollPos });
                this.saveSettings?.();
            } catch (_) {}

            // Nothing to restore (we do not use groupchat_removals). chatopponent is kept as current speaker.
        },

        advanceSpeaker() {
            if (this.activeChars.length <= 1) return;

            const next = this.selectNextSpeaker(this.speakerMode, false);
            if (next !== null && typeof next === 'number') {
                this.currentSpeaker = next;
                this.refresh();
                KLITE_RPMod.log('panels', `Selected next speaker: ${this.getCurrentSpeaker()?.name}`);
            }
        },

        updateKoboldSettings() {
            // Intentionally do not write group opponents into chatopponent.
            // Group is managed as parallel 1:1 sessions; chatopponent is set per trigger.
            try { window.save_settings?.(); } catch(_) {}
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

            // Load character data and setup filters (ensure initial data readiness)
            setTimeout(async () => {
                try { await KLITE_RPMod.ensureCharactersLoaded(); } catch(_) {}
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
                const descriptionRaw = char.description || char.first_mes || 'No description available';
                const description = KLITE_RPMod.escapeHtml(descriptionRaw.length > 100 ? descriptionRaw.substring(0, 100) + '...' : descriptionRaw);
                const tags = char.tags || [];
                const talkativeness = char.talkativeness || 50;

                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2);">
                        <input type="checkbox" id="char-${char.id}" value="${char.id}" style="margin: 0;">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                <img src="${avatar}" alt="${KLITE_RPMod.escapeHtml(char.name || '')}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${char.name.charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: var(--text);">${KLITE_RPMod.escapeHtml(char.name || '')}</div>
                            <div style="font-size: 11px; color: var(--muted); margin: 2px 0; max-height: 32px; overflow: hidden;">${description}</div>
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
                    const av = char.avatar || char.image;
                    if (av) {
                        KLITE_RPMod.groupAvatars.set(char.id, av);
                    }

                    added++;
                }
            });

            // Persist and update UI/state
            try { this.saveSettings?.(); } catch(_) {}
            this.closeCharacterModal();
            this.refresh();
            // Do not set multi-opponent; will set speaker name per trigger

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
                this.applyGroupToHost();
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
            const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.activeChars.forEach((char, index) => {
                const charKeywords = char.keywords || [char.name.toLowerCase()];
                const score = charKeywords.reduce((total, keyword) => {
                    const safe = escapeRegExp(String(keyword).toLowerCase());
                    if (!safe) return total;
                    const regex = new RegExp('\\b' + safe + '\\b', 'gi');
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

        addToSpeakerHistory(speakerIndex, meta = {}) {
            // Estimate a content index similar to Bookmarks/Index: use word count as proxy
            let approxWords = 0;
            try {
                approxWords = window.gametext_arr ? gametext_arr.join(' ').split(/\s+/).filter(w => w).length : 0;
            } catch (_) {}
            this.speakerHistory.push({
                index: speakerIndex,
                name: this.activeChars[speakerIndex]?.name,
                tokens: typeof meta.tokens === 'number' ? meta.tokens : approxWords,
                scrollPos: typeof meta.scrollPos === 'number' ? meta.scrollPos : 0,
            });

            // Keep only last 20 entries
            if (this.speakerHistory.length > 20) {
                this.speakerHistory = this.speakerHistory.slice(-20);
            }
        },

        gotoHistory(index) {
            const entry = this.speakerHistory[index];
            if (!entry) return;
            const chatDisplay = document.getElementById('chat-display');
            if (chatDisplay && typeof entry.scrollPos === 'number') {
                chatDisplay.scrollTop = entry.scrollPos;
            }
        },

        async loadSettings() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_group_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                // Backward compatibility: migrate numeric modes to string identifiers
                const mode = settings.speakerMode;
                if (typeof mode === 'number' || (typeof mode === 'string' && /^\d+$/.test(mode))) {
                    const map = {
                        1: 'manual',
                        2: 'round-robin',
                        3: 'random',
                        4: 'keyword',
                        5: 'talkative',
                        6: 'party'
                    };
                    this.speakerMode = map[parseInt(mode, 10)] || 'manual';
                } else {
                    this.speakerMode = mode || 'manual';
                }
                if (settings.autoResponses) {
                    Object.assign(this.autoResponses, settings.autoResponses);
                }
                if (typeof settings.currentSpeaker === 'number') {
                    this.currentSpeaker = settings.currentSpeaker;
                }
                if (typeof settings.lastSpeaker === 'number') {
                    this.lastSpeaker = settings.lastSpeaker;
                }
                if (typeof settings.enabled === 'boolean') {
                    this.enabled = settings.enabled;
                }
                if (Array.isArray(settings.participants)) {
                    this.activeChars = settings.participants.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        isCustom: !!c.isCustom,
                        talkativeness: typeof c.talkativeness === 'number' ? c.talkativeness : undefined,
                        keywords: Array.isArray(c.keywords) ? c.keywords : undefined
                    }));
                    // Do not update chatopponent here (managed per trigger)
                }
                // Restore history if present
                if (Array.isArray(settings.speakerHistory)) {
                    this.speakerHistory = settings.speakerHistory.slice(-20);
                }
                KLITE_RPMod.log('panels', `Loaded ROLES settings: speakerMode=${this.speakerMode}`);
            }
        },

        saveSettings() {
            const settings = {
                enabled: !!this.enabled,
                speakerMode: this.speakerMode,
                autoResponses: this.autoResponses,
                currentSpeaker: this.currentSpeaker,
                lastSpeaker: this.lastSpeaker,
                participants: Array.isArray(this.activeChars)
                    ? this.activeChars.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        isCustom: !!c.isCustom,
                        talkativeness: typeof c.talkativeness === 'number' ? c.talkativeness : undefined,
                        keywords: Array.isArray(c.keywords) ? c.keywords : undefined
                    }))
                    : [],
                speakerHistory: Array.isArray(this.speakerHistory) ? this.speakerHistory.slice(-20) : []
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_group_settings', JSON.stringify(settings));
            KLITE_RPMod.log('panels', `Saved ROLES settings: speakerMode=${this.speakerMode}`);
        },

        refresh() {
            // Re-render ROLES if it is currently visible on either logical side.
            // loadPanel('left', ...) maps to the active container in both full and panels-only modes.
            const leftActive = KLITE_RPMod.state?.tabs?.left === 'ROLES';
            const rightActive = KLITE_RPMod.state?.tabs?.right === 'ROLES';
            if (leftActive || rightActive) {
                KLITE_RPMod.loadPanel('left', 'ROLES');
            }
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

        // Basic HTML escaping helpers to prevent HTML/JS injection when rendering
        escapeHTML(str = '') {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        // Escape content specifically for placement inside <textarea> ... </textarea>
        escapeTextarea(str = '') {
            // Also break any closing tag sequence
            return this.escapeHTML(String(str)).replace(/<\/textarea/gi, '&lt;/textarea');
        },
        // Attempt to fix common UTF-8 mojibake (e.g., “ — ” becoming â / â)
        fixMojibake(str = '') {
            const s = String(str);
            // Heuristic: if it contains common mojibake markers (C1 controls/Latin-1 noise + sequences like Ã/Â/â), try latin1->utf8 roundtrip
            const looksMojibake = /[\u0080-\u00FF]/.test(s) && /(Ã|Â|â)/.test(s);
            if (looksMojibake) {
                try {
                    const bytes = new Uint8Array(Array.from(s, ch => ch.charCodeAt(0) & 0xFF));
                    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                    return decoded.normalize('NFC');
                } catch (_) { /* fall through */ }
            }
            return s.normalize('NFC');
        },
        // Sanitize imported text fields: fix encoding, normalize, strip unsafe control chars
        sanitizeImportedString(str = '') {
            let out = this.fixMojibake(str);
            // Normalize line endings and remove non-text control chars except tab/newline
            out = out.replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            return out;
        },

        render() {
            const charCount = KLITE_RPMod.characters.length;
            const filteredChars = this.getFilteredCharacters();

            return `
                ${t.section('Import Characters',
                `<div id="char-upload-zone" style="text-align:center;">
                        <button class="klite-btn" style="width:100%; padding: 18px 12px; font-size: 14px;">
                            Click or drag characters, saves, lorebooks, world info or PDFs here to add
                        </button>
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Backup the Characters', 'secondary', 'export-chars')}
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
                        
                        <div id="char-count" class="klite-muted" style="font-size: 11px;">
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
            // Ensure gallery CSS is present even in panels-only mode or strict hosts
            try {
                if (!document.getElementById('klite-chars-gallery-styles')) {
                    const s = document.createElement('style');
                    s.id = 'klite-chars-gallery-styles';
                    s.textContent = `
                        .klite-character-overview { display: grid !important; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
                        .klite-character-grid { display: grid !important; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; }
                        .klite-character-overview .klite-overview-thumb { width: 100%; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
                        .klite-character-overview .klite-overview-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                        /* Ensure grid items can shrink to fit tracks */
                        .klite-character-grid > * , .klite-character-overview > * { min-width: 0 !important; max-width: 100% !important; width: 100% !important; box-sizing: border-box; }
                        .klite-character-grid .klite-grid-thumb { width: 100%; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
                        .klite-character-grid .klite-grid-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
                    `;
                    document.head.appendChild(s);
                }
            } catch(_) {}

            // Load persisted gallery preferences (view, sort, filters)
            try { this.loadGalleryPrefs?.(); } catch(_) {}
            // Use esolite data as primary; install adapter
            try { this.installEsoliteAdapter?.(); } catch(_) {}

            // Setup search functionality
            const searchInput = document.getElementById('char-search');
            if (searchInput) {
                searchInput.addEventListener('input', e => {
                    this.currentFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            // Setup filter handlers
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                tagFilter.addEventListener('change', e => {
                    this.tagFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            const starFilter = document.getElementById('char-star-filter');
            if (starFilter) {
                starFilter.addEventListener('change', e => {
                    this.starFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            // Setup sort and view change handlers
            const sortSelect = document.getElementById('char-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', e => {
                    this.currentSort = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            const viewSelect = document.getElementById('char-view');
            if (viewSelect) {
                viewSelect.addEventListener('change', e => {
                    this.currentView = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
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
                    try {
                        const files = e.dataTransfer?.files;
                        if (files && typeof window.fileInputToFiles === 'function') {
                            window.fileInputToFiles(Array.from(files), async (result) => {
                                try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                            });
                        } else if (files && files.length > 0) {
                            // Fallback to RPmod handler
                            this.handleFiles(files);
                        }
                    } catch(_) {}
                });

                uploadZone.addEventListener('click', () => {
                    try {
                        if (typeof window.promptUserForLocalFile === 'function') {
                            window.promptUserForLocalFile(async (result) => {
                                try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                            }, [".png", ".webp", ".json", ".txt", ".pdf"], true);
                        }
                    } catch(_) {}
                });
            }

            // Apply persisted prefs onto current gallery view
            try { this.refreshGallery?.(); } catch(_) {}

            // Wire up action handling for CHARS panel buttons
            try {
                const container = document.querySelector('div#content-right.klite-content');
                if (container) {
                    if (container._charsActionHandler) {
                        container.removeEventListener('click', container._charsActionHandler);
                    }
                    const actionHandler = (e) => {
                        const el = e.target.closest('[data-action]');
                        if (!el) return;
                        const action = el.dataset.action;
                        const fn = KLITE_RPMod.panels.CHARS.actions && KLITE_RPMod.panels.CHARS.actions[action];
                        if (typeof fn === 'function') {
                            e.preventDefault();
                            e.stopPropagation();
                            try { fn(e); } catch (err) { KLITE_RPMod.error('CHARS action failed:', err); }
                        }
                    };
                    container.addEventListener('click', actionHandler);
                    container._charsActionHandler = actionHandler;
                }
            } catch(_) {}
        },

        // Persist gallery preferences (view, sort, filters) using esolite IndexedDB helpers
        prefsKey: 'esolite_chars_panel_prefs',
        async loadGalleryPrefs() {
            try {
                const raw = await window.indexeddb_load?.(this.prefsKey, null);
                if (!raw) return;
                const prefs = JSON.parse(raw);
                if (typeof prefs.currentFilter === 'string') this.currentFilter = prefs.currentFilter;
                if (typeof prefs.currentSort === 'string') this.currentSort = prefs.currentSort;
                if (typeof prefs.currentView === 'string') this.currentView = prefs.currentView;
                if (typeof prefs.tagFilter === 'string') this.tagFilter = prefs.tagFilter;
                if (typeof prefs.starFilter === 'string') this.starFilter = prefs.starFilter;
            } catch(_) {}
        },
        async saveGalleryPrefs() {
            try {
                const prefs = {
                    currentFilter: this.currentFilter,
                    currentSort: this.currentSort,
                    currentView: this.currentView,
                    tagFilter: this.tagFilter,
                    starFilter: this.starFilter,
                };
                await window.indexeddb_save?.(this.prefsKey, JSON.stringify(prefs));
            } catch(_) {}
        },

        // Fallback import processor using Esolite’s global functions
        async processEsoliteImportResult(result) {
            try {
                const { fileName, ext, plaintext, dataArr } = result || {};
                const lowerExt = (ext || '').toLowerCase();

                if (lowerExt === '.png') {
                    const arr = new Uint8Array(dataArr);
                    const ok = window.convertTavernPng?.(arr, fileName);
                    if (ok === null) throw new Error(`${fileName}: PNG is not a valid Tavern card`);
                } else if (lowerExt === '.webp') {
                    const arr = new Uint8Array(dataArr);
                    const ok = window.getTavernExifJSON?.(arr, fileName);
                    if (ok === null) throw new Error(`${fileName}: WEBP is not a valid Tavern card`);
                } else if (lowerExt === '.txt') {
                    const arr = new Uint8Array(dataArr);
                    await window.saveDocumentToIndexDB?.(fileName, arr, 'text/plain');
                } else if (lowerExt === '.pdf') {
                    const arr = new Uint8Array(dataArr);
                    await window.saveDocumentToIndexDB?.(fileName, arr, 'application/pdf');
                } else {
                    let data = null;
                    try { data = JSON.parse(plaintext); } catch (_) {}
                    if (!data) throw new Error(`${fileName}: Unsupported or invalid file`);

                    if (typeof window.is_kai_json === 'function' && window.is_kai_json(data) && !data?.scenarioVersion) {
                        window.saveKLiteSaveToIndexDB?.(fileName, data);
                    } else {
                        const looksLikeChar = (data?.spec === 'chara_card_v2' || data?.spec === 'chara_card_v3') ||
                            (data?.name != null || data?.description != null || data?.personality != null);
                        if (looksLikeChar) {
                            window.saveCharacterDataToIndexDB?.(undefined, data, fileName);
                        } else {
                            let wiToAdd = data;
                            let wiName = fileName;
                            const hasTavWI = typeof window.has_tavern_wi_check === 'function' ? window.has_tavern_wi_check(wiToAdd) : false;
                            if (hasTavWI) {
                                if (wiToAdd?.name && wiToAdd.name.trim().length > 0) wiName = wiToAdd.name;
                                wiToAdd = window.load_tavern_wi?.(wiToAdd);
                                if (Array.isArray(wiToAdd) && wiToAdd.length > 0) wiToAdd.forEach(wi => wi.wigroup = fileName.replace("'", ""));
                            } else if (Array.isArray(wiToAdd)) {
                                try {
                                    const hasNoGeneralWI = wiToAdd.length === 0 || wiToAdd.find(wi => (wi?.wigroup === undefined || wi.wigroup == null || wi.wigroup.trim() === '' || wi.wigroup === 'General')) === undefined;
                                    if (hasNoGeneralWI) {
                                        const wiAllHaveSameGroup = wiToAdd.find((e, p, a) => a.find(c => c?.wigroup !== e.wigroup)) === undefined;
                                        if (wiAllHaveSameGroup && wiToAdd[0]?.wigroup) wiName = wiToAdd[0].wigroup;
                                    }
                                } catch(_) {}
                            }
                            if (Array.isArray(wiToAdd)) {
                                wiToAdd = wiToAdd.filter(wi => wi?.key !== undefined);
                                if (wiToAdd.length > 0) {
                                    window.saveLorebookToIndexDB?.(wiName, wiToAdd, data);
                                } else {
                                    throw new Error(`${fileName}: JSON does not contain WI or lorebook entries`);
                                }
                            } else {
                                throw new Error(`${fileName}: JSON not recognized as character or WI`);
                            }
                        }
                    }
                }

                // Sync our list with Esolite after save
                try { await this.rebuildFromEsolite?.(); } catch(_) {}
                this.refreshGallery?.();
            } catch (e) {
                KLITE_RPMod.error('Import error', e);
                try { alert(e?.message || String(e)); } catch(_) {}
            }
        },

        actions: {
            'import-chars': () => {
                try {
                    if (typeof window.promptUserForLocalFile === 'function') {
                        window.promptUserForLocalFile(async (result) => {
                            try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                        }, [".png", ".webp", ".json", ".txt", ".pdf"], true);
                    }
                } catch(_) {}
            },
            'export-chars': () => KLITE_RPMod.panels.CHARS.exportCharactersAsZip?.(),
            'server-saves': async () => {
                try {
                    if (typeof window.showServerSavesPopup === 'function') {
                        await window.showServerSavesPopup();
                    } else {
                        alert('Server Saves UI is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server saves popup failed', e); }
            },
            'server-control': async () => {
                try {
                    if (typeof window.controlRemoteDataStore === 'function') {
                        await window.controlRemoteDataStore();
                    } else {
                        alert('Server control UI is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server control failed', e); }
            },
            'server-overwrite': async () => {
                try {
                    if (typeof window.putAllCharacterManagerData === 'function') {
                        await window.putAllCharacterManagerData();
                        try { await KLITE_RPMod.panels.CHARS.rebuildFromEsolite?.(); } catch(_) {}
                    } else {
                        alert('Server overwrite is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server overwrite failed', e); }
            },
            'server-load': async () => {
                try {
                    if (typeof window.loadAllCharacterManagerData === 'function') {
                        await window.loadAllCharacterManagerData();
                        try { await KLITE_RPMod.panels.CHARS.rebuildFromEsolite?.(); } catch(_) {}
                    } else {
                        alert('Server load is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server load failed', e); }
            },
            'load-char': async (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.loadAsScenarioByName(char.name);
            },
            'view-char': async (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.showCharacterFullscreenByName(char.name);
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
            'load-char-scenario': async (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.loadAsScenarioByName(char.name);
            },
            // 'add-char-worldinfo' removed (use WI panel and Esolite directly)
            'export-char-json': async (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.exportCharacterJSONByName(char.name);
            },
            'export-char-png': async (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.exportCharacterPNGByName(char.name);
            },
            'edit-character': async (e) => {
                const charId = e.target.dataset.charId || e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) {
                    const d = await window.getCharacterData?.(char.name);
                    if (d) {
                        const full = { id: char.id, name: d.data?.name || char.name, image: d.image || null, ...d.data, rawData: { data: d.data || {} } };
                        KLITE_RPMod.panels.CHARS.setEditMode('edit', full);
                    }
                }
            },
            'clone-character': async (e) => {
                const charId = e.target.dataset.charId || e.target.closest('[data-char-id]')?.dataset.charId;
                const orig = KLITE_RPMod.characters.find(c => c.id == charId);
                if (orig?.name) {
                    const d = await window.getCharacterData?.(orig.name);
                    if (d) {
                        const full = { id: undefined, name: (d.data?.name || orig.name) + ' (Clone)', image: d.image || null, ...d.data, rawData: { data: d.data || {} } };
                        KLITE_RPMod.panels.CHARS.setEditMode('clone', full);
                    }
                }
            },
            'delete-char-modal': (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char && confirm(`Delete "${char.name}"? This cannot be undone.`)) {
                    KLITE_RPMod.panels.CHARS.deleteCharacter(charId);
                    const modal = document.getElementById('char-modal-' + charId);
                    if (modal) modal.remove();
                }
            }
        },

        getFilteredCharacters() {
            let filtered = [...KLITE_RPMod.characters];

            // Apply search filter (safe guards for missing fields)
            if (this.currentFilter) {
                const filter = String(this.currentFilter || '').toLowerCase();
                filtered = filtered.filter(char => {
                    const name = String(char.name || '').toLowerCase();
                    const desc = String(char.description || '').toLowerCase();
                    const pers = String(char.personality || '').toLowerCase();
                    const creator = String(char.creator || '').toLowerCase();
                    const keywords = Array.isArray(char.keywords) ? char.keywords : [];
                    const kwMatch = keywords.some(k => String(k || '').toLowerCase().includes(filter));
                    return name.includes(filter) || desc.includes(filter) || pers.includes(filter) || creator.includes(filter) || kwMatch;
                });
            }

            // Apply tag filter
            if (this.tagFilter) {
                const tag = String(this.tagFilter);
                filtered = filtered.filter(char => Array.isArray(char.tags) && char.tags.includes(tag));
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

            // Apply sorting (safe defaults)
            filtered.sort((a, b) => {
                switch (this.currentSort) {
                    case 'name-asc':
                        return String(a.name||'').localeCompare(String(b.name||''));
                    case 'name-desc':
                        return String(b.name||'').localeCompare(String(a.name||''));
                    case 'created':
                        return (b.created ?? 0) - (a.created ?? 0);
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
                default: // grid (2 per row)
                    return characters.map(char => this.renderCharacterGridItem(char)).join('');
            }
        },

        renderCharacterOverviewItem(char) {
            return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg2); cursor: pointer; text-align: center;" 
                     data-char-id="${char.id}" data-action="view-char">
                    ${(char.thumbnail || char.image) ? `
                        <div class="klite-overview-thumb" style="width: 100%; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; margin-bottom: 6px; border: 1px solid var(--border);">
                            <img src="${char.thumbnail || char.image}" alt="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy">
                        </div>
                    ` : `
                        <div class="klite-overview-thumb" style="width: 100%; aspect-ratio: 2/3; border-radius: 4px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
                            <span style="font-size: 24px;">${KLITE_RPMod.panels.CHARS.escapeHTML((char.name || '?').charAt(0))}</span>
                        </div>
                    `}
                    <div style="font-size: 12px; font-weight: bold; color: var(--text); line-height: 1.2; word-wrap: break-word; max-width: 100%;">
                        ${(KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')).length > 12 ? KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '').substring(0, 12) + '...' : KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}
                    </div>
                    <div style="font-size: 10px; color: var(--muted);">${KLITE_RPMod.panels.CHARS.escapeHTML(char.creator || 'Unknown')}</div>
                </div>
            `;
        },

        // New: 2-per-row grid tile similar to overview, with rating
        renderCharacterGridItem(char) {
            const rating = char.rating || 0;
            return `
                <div class="klite-char-grid-item" data-char-id="${char.id}" data-action="view-char" style="display: flex; flex-direction: column; align-items: center; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg2); cursor: pointer; text-align: center;">
                    ${(char.thumbnail || char.image) ? `
                        <div class=\"klite-grid-thumb\" style=\"width: 100%; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; margin-bottom: 8px; border: 1px solid var(--border);\">\n                            <img src=\"${char.thumbnail || char.image}\" alt=\"${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}\" style=\"width: 100%; height: 100%; object-fit: cover; display: block;\" loading=\"lazy\">\n                        </div>
                    ` : `
                        <div class=\"klite-grid-thumb\" style=\"width: 100%; aspect-ratio: 2/3; border-radius: 4px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;\">\n                            <span style=\"font-size: 36px;\">👤</span>\n                        </div>
                    `}
                    <div class="klite-char-name" style="font-weight: bold; color: var(--text); margin-bottom: 4px;">${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}</div>
                    <div class="klite-char-creator" style="font-size: 11px; color: var(--muted); margin-bottom: 8px;">by ${KLITE_RPMod.panels.CHARS.escapeHTML(char.creator || 'Unknown')}</div>
                    <div style="text-align: center;">
                        <select class="klite-select" style="font-size: 10px; padding: 2px 4px;" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)" onclick="event.stopPropagation();">
                            <option value=\"0\" ${rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                            <option value=\"1\" ${rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                            <option value=\"2\" ${rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                            <option value=\"3\" ${rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                            <option value=\"4\" ${rating === 4 ? 'selected' : ''}>★★★★☆</option>
                            <option value=\"5\" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                        </select>
                    </div>
                </div>
            `;
        },

        renderCharacterCard(char) {
            const rating = char.rating || 0;

            return `
                <div class="klite-char-card" data-char-id="${char.id}" data-action="view-char" style="cursor: pointer;">
                    <div class="klite-char-image">
                        ${(char.thumbnail || char.image) ? `<img src="${char.thumbnail || char.image}" alt="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}" loading="lazy">` : '<div class="klite-char-placeholder">👤</div>'}
                    </div>
                    <div class="klite-char-name">${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}</div>
                    <div class="klite-char-creator">by ${KLITE_RPMod.panels.CHARS.escapeHTML(char.creator || 'Unknown')}</div>
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
                    ${(char.thumbnail || char.image) ? `
                        <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                            <img src="${char.thumbnail || char.image}" alt="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 18px;">${KLITE_RPMod.panels.CHARS.escapeHTML((char.name || '?').charAt(0))}</span>
                        </div>
                    `}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; color: var(--text); margin-bottom: 2px;">${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}</div>
                        <div style="font-size: 10px; color: var(--muted); display: flex; gap: 8px; align-items: center;">
                            <span>by ${KLITE_RPMod.panels.CHARS.escapeHTML(char.creator || 'Unknown')}</span>
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
                        ${char.image ? `<img src="${char.image}" alt="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}" style="width: 100%; height: auto; display: block;">` : '<div style="width: 100%; height: 200px; background: var(--bg3); display: flex; align-items: center; justify-content: center; font-size: 48px;">👤</div>'}
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: var(--text); margin-bottom: 8px;">${KLITE_RPMod.panels.CHARS.escapeHTML(char.name || '')}</div>
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
                        <div style="color: var(--muted); margin-bottom: 12px;">by ${KLITE_RPMod.panels.CHARS.escapeHTML(char.creator || 'Unknown')}</div>
                        <div style="text-align: left; margin-bottom: 12px; color: var(--text); line-height: 1.4;">${KLITE_RPMod.panels.CHARS.escapeHTML((char.description || 'No description available').substring(0, 300) + ((char.description || '').length > 300 ? '...' : ''))}</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; color: var(--muted);">
                            <span>Talk: ${talkLevel} (${char.talkativeness || 0})</span>
                            <span>Keywords: ${char.keywords ? char.keywords.length : 0}</span>
                        </div>
                        <div style="margin-bottom: 15px;">${char.tags && char.tags.length > 0 ? char.tags.map(tag => `<span class=\"klite-tag\">${KLITE_RPMod.panels.CHARS.escapeHTML(tag)}</span>`).join('') : '<span class=\"klite-tag-empty\">No tags</span>'}</div>
                    </div>
                </div>
                <hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;">
            `;
        },

        refreshGallery() {
            const gallery = document.getElementById('char-gallery');
            if (gallery) {
                gallery.className = `klite-character-${this.currentView}`;
                // Force grid layout inline to beat hostile styles
                if (this.currentView === 'overview') {
                    gallery.style.display = 'grid';
                    gallery.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    gallery.style.gap = '6px';
                } else if (this.currentView === 'grid') {
                    gallery.style.display = 'grid';
                    gallery.style.gridTemplateColumns = 'repeat(2, 1fr)';
                    gallery.style.gap = '10px';
                } else {
                    gallery.style.display = '';
                    gallery.style.gridTemplateColumns = '';
                    gallery.style.gap = '';
                }
                gallery.innerHTML = this.renderCharacters();
                // Update count line
                try {
                    const countEl = document.getElementById('char-count');
                    if (countEl) {
                        const total = Array.isArray(KLITE_RPMod.characters) ? KLITE_RPMod.characters.length : 0;
                        const shown = this.getFilteredCharacters().length;
                        countEl.textContent = `${shown} of ${total} characters shown`;
                    }
                } catch(_) {}
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
                try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}

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
                        try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
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
                try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
                // Deleted ${char.name}
            }
        },

        exportCharacters() {
            KLITE_RPMod.exportCharactersAsZip?.();
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
                        await this.addCharacter(this.normalizeCharacterData(data));
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

            // Sanitize/normalize common text fields to preserve emojis and smart quotes correctly
            ['name','description','personality','scenario','first_mes','mes_example','creator','system_prompt','post_history_instructions','creator_notes']
                .forEach(k => { if (k in normalized && typeof normalized[k] === 'string') normalized[k] = this.sanitizeImportedString(normalized[k]); });
            // Sanitize alternate greetings if present
            if (Array.isArray(normalized.alternate_greetings)) {
                normalized.alternate_greetings = normalized.alternate_greetings.map(g => this.sanitizeImportedString(g));
            }

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

        async addCharacter(data) {
            try {
                const name = (data?.name || '').trim();
                if (!name) throw new Error('Character must have a name.');
                // Match Esobold/Esolite key sanitization used by getCharacterData
                const sanitizeForKey = (s) => String(s)
                    .replaceAll(/[^\w()_\-'",!\[\].]/g, ' ')
                    .replaceAll(/\s+/g, ' ')
                    .trim();
                const storeKeyName = sanitizeForKey(name);

                // Build inner Tavern v2 object from provided fields if not already present
                const inner = data?.rawData?.data || {
                    name,
                    description: data?.description || '',
                    personality: data?.personality || '',
                    mes_example: data?.mes_example || '',
                    first_mes: data?.first_mes || '',
                    creator: data?.creator || '',
                    creator_notes: data?.creator_notes || '',
                    system_prompt: data?.system_prompt || '',
                    post_history_instructions: data?.post_history_instructions || '',
                    alternate_greetings: Array.isArray(data?.alternate_greetings) ? data.alternate_greetings : [],
                    character_book: data?.character_book || null,
                    tags: Array.isArray(data?.tags) ? data.tags : [],
                    character_version: data?.character_version || data?.version || '1.0.0'
                };

                // If we have a PNG data URL, embed JSON into PNG; else store JSON-only
                let stored = { name, data: inner };
                if (data?.image || data?.avatar) {
                    const dataUrl = String(data.image || data.avatar);
                    if (dataUrl.startsWith('data:image/png;base64,')) {
                        try {
                            const b64 = dataUrl.split(',')[1];
                            const pngBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                            const out = window.tavernTool?.embedIntoPng?.(pngBytes, inner);
                            if (out && out.length) {
                                let text = '';
                                for (let i = 0; i < Math.ceil(out.length / 32768.0); i++) {
                                    text += String.fromCharCode.apply(null, out.slice(i * 32768, Math.min((i + 1) * 32768, out.length)));
                                }
                                stored.image = `data:image/png;base64,${btoa(text)}`;
                            } else {
                                stored.image = dataUrl; // fallback
                            }
                        } catch(_) { stored.image = dataUrl; }
                    } else {
                        // Non-PNG provided; store JSON-only for compatibility
                        stored.image = undefined;
                    }
                }

                await window.indexeddb_save?.(`character_${storeKeyName}`, JSON.stringify(stored));
                // Ensure list entry and thumbnail
                try {
                    if (stored.image && typeof window.generateThumbnail === 'function') {
                        const thumb = await window.generateThumbnail(stored.image, [256, 256]);
                        this.setEsoliteCharacterList((arr) => {
                            const next = (Array.isArray(arr) ? arr : []).filter(c => c?.name !== name);
                            next.push({ name, thumbnail: thumb, type: 'Character' });
                            return next;
                        });
                    } else {
                        this.setEsoliteCharacterList((arr) => {
                            const next = (Array.isArray(arr) ? arr : []).filter(c => c?.name !== name);
                            next.push({ name, type: 'Character' });
                            return next;
                        });
                    }
                } catch(_) {}

                await window.updateCharacterListFromAll?.();
                await this.rebuildFromEsolite?.();
            } catch(e) {
                console.error('[CHARS] addCharacter error', e);
            }
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

            switch (mode) {
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
                            try { if (!KLITE_RPMod.panels.ROLES?.enabled) KLITE_RPMod._pendingSingleRole = 'ai'; } catch (_) {}
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

                // 6. Load the character into TOOLS panel
                if (KLITE_RPMod.panels.TOOLS) {
                    KLITE_RPMod.panels.TOOLS.selectedCharacter = character;
                    KLITE_RPMod.panels.TOOLS.characterEnabled = true;
                    KLITE_RPMod.panels.TOOLS.applyCharacterData(character);
                    KLITE_RPMod.log('chars', 'Character applied to TOOLS panel');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: TOOLS panel not available');
                }

                // Disable ROLES if active
                if (KLITE_RPMod.panels.ROLES && KLITE_RPMod.panels.ROLES.enabled) {
                    KLITE_RPMod.panels.ROLES.enabled = false;
                    KLITE_RPMod.panels.ROLES.updateKoboldSettings();
                    KLITE_RPMod.log('chars', 'Disabled ROLES chat');
                }

                // Refresh panels
                const currentLeftPanel = KLITE_RPMod.state.tabs.left;
                if (currentLeftPanel === 'ROLES') {
                    KLITE_RPMod.loadPanel('left', 'ROLES');
                } else if (currentLeftPanel === 'PLAY') {
                    // If left panel is PLAY, do not switch tabs; refresh current
                    KLITE_RPMod.loadPanel('left', currentLeftPanel);
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
            if (Array.isArray(characterData.tags) && characterData.tags.length > 0) {
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
                        <div style="color: var(--muted); font-size: 14px;">by ${KLITE_RPMod.panels.CHARS.escapeHTML(characterData?.creator || 'Unknown')}</div>
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
                        <button class="klite-btn secondary" data-action="export-char-json" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}" data-char-id="${char.id}">Export as JSON</button>
                        <button class="klite-btn secondary" data-action="export-char-png" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}" data-char-id="${char.id}">Export as V2 PNG</button>
                        <button class="klite-btn secondary" data-action="edit-character" data-char-id="${char.id}">✏️ Edit</button>
                        <button class="klite-btn secondary" data-action="clone-character" data-char-id="${char.id}">📄 Clone</button>
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
                const charName = actionElement.dataset.charName || char?.name;

                // Verify this is for the current character if id is present
                if (charId && (charId != char.id)) return;

                KLITE_RPMod.log('chars', `Detail view action: ${action} for character ${char.id}`);

                // Route to appropriate action handler
                switch (action) {
                    case 'load-char-scenario':
                        if (charName) this.loadAsScenarioByName?.(charName); else this.loadAsScenario(char);
                        break;
                    case 'export-char-json':
                        if (charName) this.exportCharacterJSONByName?.(charName); else this.exportCharacterJSON(char);
                        break;
                    case 'export-char-png':
                        if (charName) this.exportCharacterPNGByName?.(charName); else this.exportCharacterPNG(char);
                        break;
                    case 'delete-char-modal':
                        if (confirm('Delete this character?')) {
                            if (charName) this.deleteCharacterByName?.(charName); else this.deleteCharacter(char.id);
                        }
                        break;
                    case 'edit-character':
                        KLITE_RPMod.panels.CHARS.setEditMode('edit', char);
                        break;
                    case 'clone-character':
                        const copy = JSON.parse(JSON.stringify(char));
                        delete copy.id;
                        copy.name += ' (Clone)';
                        KLITE_RPMod.panels.CHARS.setEditMode('clone', copy);
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

                // Sync our WI panel's pending state to the updated WI data
                if (KLITE_RPMod.panels.WI) {
                    KLITE_RPMod.panels.WI.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
                    if (KLITE_RPMod.state.tabs.right === 'WI') {
                        KLITE_RPMod.panels.WI.refresh();
                    }
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

        // =============================================
        // MULTI-TIER IMAGE STORAGE OPTIMIZATION
        // =============================================

        async createOptimizedImages(originalImage, filename = 'character') {
            // Check if we're in a test environment or Canvas API is available
            if (typeof document === 'undefined' || !document.createElement) {
                KLITE_RPMod.log('chars', `Canvas API not available, using original image for ${filename}`);
                return {
                    original: originalImage,
                    preview: originalImage,
                    avatar: originalImage,
                    thumbnail: originalImage
                };
            }

            return new Promise((resolve) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            // Create optimized images for different use cases
                            const images = {
                                original: originalImage,                    // Full resolution for export
                                preview: this.createPreviewImage(img),     // 256x256 for gallery
                                avatar: this.createAvatarImage(img),       // 64x64 for chat
                                thumbnail: this.createThumbnailImage(img)  // 32x32 for mobile/list view
                            };

                            KLITE_RPMod.log('chars', `🖼️ Created optimized images for ${filename}: original (${originalImage.length}B), preview (${images.preview.length}B), avatar (${images.avatar.length}B), thumbnail (${images.thumbnail.length}B)`);
                            resolve(images);
                        } catch (error) {
                            KLITE_RPMod.log('chars', `Image optimization failed for ${filename}, using original:`, error.message);
                            // Fallback to original image for all uses
                            resolve({
                                original: originalImage,
                                preview: originalImage,
                                avatar: originalImage,
                                thumbnail: originalImage
                            });
                        }
                    };
                    img.onerror = () => {
                        KLITE_RPMod.log('chars', `Failed to load image for optimization: ${filename}, using original`);
                        // Fallback to original image for all uses
                        resolve({
                            original: originalImage,
                            preview: originalImage,
                            avatar: originalImage,
                            thumbnail: originalImage
                        });
                    };
                    img.src = originalImage;
                } catch (error) {
                    KLITE_RPMod.log('chars', `Image optimization setup failed for ${filename}, using original:`, error.message);
                    resolve({
                        original: originalImage,
                        preview: originalImage,
                        avatar: originalImage,
                        thumbnail: originalImage
                    });
                }
            });
        },


        createPreviewImage(img) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas 2D context not available');
                const size = 256;

                canvas.width = size;
                canvas.height = size;

                // Calculate dimensions to maintain aspect ratio
                const scale = Math.min(size / img.width, size / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (size - width) / 2;
                const y = (size - height) / 2;

                // Fill background and draw scaled image
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, x, y, width, height);

                return canvas.toDataURL('image/jpeg', 0.8);
            } catch (error) {
                KLITE_RPMod.log('chars', 'Preview image creation failed, using original');
                return img.src;
            }
        },

        createAvatarImage(img) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas 2D context not available');
                const size = 64;

                canvas.width = size;
                canvas.height = size;

                // Calculate dimensions to maintain aspect ratio
                const scale = Math.min(size / img.width, size / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (size - width) / 2;
                const y = (size - height) / 2;

                // Fill background and draw scaled image
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, x, y, width, height);

                return canvas.toDataURL('image/jpeg', 0.7);
            } catch (error) {
                KLITE_RPMod.log('chars', 'Avatar image creation failed, using original');
                return img.src;
            }
        },

        createThumbnailImage(img) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas 2D context not available');
                const size = 32;

                canvas.width = size;
                canvas.height = size;

                // Calculate dimensions to maintain aspect ratio
                const scale = Math.min(size / img.width, size / img.height);
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (size - width) / 2;
                const y = (size - height) / 2;

                // Fill background and draw scaled image
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, x, y, width, height);

                return canvas.toDataURL('image/jpeg', 0.6);
            } catch (error) {
                KLITE_RPMod.log('chars', 'Thumbnail image creation failed, using original');
                return img.src;
            }
        },

        // =============================================
        // AVATAR CACHING SYSTEM
        // =============================================

        avatarCache: null, // Will be initialized safely

        initAvatarCache() {
            if (!this.avatarCache) {
                try {
                    this.avatarCache = new Map();
                    KLITE_RPMod.log('chars', '🖼️ Avatar cache initialized');
                } catch (error) {
                    KLITE_RPMod.log('chars', 'Avatar cache initialization failed, using fallback');
                    this.avatarCache = {
                        get: () => null,
                        set: () => { },
                        delete: () => { },
                        clear: () => { },
                        size: 0
                    };
                }
            }
        },

        getOptimizedAvatar(characterId, type = 'avatar') {
            this.initAvatarCache();
            const cacheKey = `${characterId}_${type}`;
            return this.avatarCache.get(cacheKey);
        },

        setOptimizedAvatar(characterId, type, imageData) {
            this.initAvatarCache();
            const cacheKey = `${characterId}_${type}`;
            this.avatarCache.set(cacheKey, imageData);

            // Limit cache size to prevent memory issues
            if (this.avatarCache.size > 200) {
                const firstKey = this.avatarCache.keys().next().value;
                this.avatarCache.delete(firstKey);
                KLITE_RPMod.log('chars', '🗑️ Avatar cache size limit reached, removed oldest entry');
            }
        },

        clearAvatarCache() {
            this.initAvatarCache();
            this.avatarCache.clear();
            KLITE_RPMod.log('chars', '🗑️ Avatar cache cleared');
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
        },

        // ==============================
        // Esolite adapter and sync layer
        // ==============================
        installEsoliteAdapter() {
            // Rebuild characters from esolite immediately, then hook updates
            this.rebuildFromEsolite?.();

            // Hook into Esolite's list updater if available
            try {
                const origUpd = window.updateCharacterListFromAll;
                if (typeof origUpd === 'function' && !origUpd.__klite_rpmod_wrapped) {
                    window.updateCharacterListFromAll = async function() {
                        try { await origUpd.apply(this, arguments); } catch(_) {}
                        try { KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch(_) {}
                    };
                    window.updateCharacterListFromAll.__klite_rpmod_wrapped = true;
                }
            } catch(_) {}

            // Also listen for explicit esolite events so we sync on initial load and debounced saves
            try {
                const onSync = () => { try { KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch(_) {} };
                document.removeEventListener('esolite:characterListUpdated', onSync);
                document.removeEventListener('esolite:characterListLoaded', onSync);
                document.addEventListener('esolite:characterListUpdated', onSync);
                document.addEventListener('esolite:characterListLoaded', onSync);
            } catch(_) {}

            // Periodic safety sync (in case external code bypasses wrapper)
            if (!this._esoliteSyncTimer) {
                this._esoliteSyncTimer = setInterval(() => {
                    try { this.rebuildFromEsolite?.(); } catch(_) {}
                }, 5000);
            }
        },

        getEsoliteCharacterList() {
            try {
                if (typeof allCharacterNames !== 'undefined' && Array.isArray(allCharacterNames)) {
                    return allCharacterNames;
                }
            } catch(_) {}
            try {
                if (Array.isArray(window.allCharacterNames)) {
                    return window.allCharacterNames;
                }
            } catch(_) {}
            return [];
        },

        async fetchEsoliteCharacterList() {
            const list = this.getEsoliteCharacterList();
            if (Array.isArray(list) && list.length > 0) return list;
            try {
                const raw = await window.indexeddb_load?.('characterList', '[]');
                const arr = JSON.parse(raw || '[]');
                if (Array.isArray(arr)) return arr;
            } catch(_) {}
            return [];
        },

        setEsoliteCharacterList(updater) {
            // updater: (arr) => newArray
            try {
                if (typeof allCharacterNames !== 'undefined' && Array.isArray(allCharacterNames)) {
                    allCharacterNames = updater(allCharacterNames);
                    return true;
                }
            } catch(_) {}
            try {
                if (Array.isArray(window.allCharacterNames)) {
                    window.allCharacterNames = updater(window.allCharacterNames);
                    return true;
                }
            } catch(_) {}
            return false;
        },

        async rebuildFromEsolite() {
            try {
                const list = await this.fetchEsoliteCharacterList();
                // Only consider actual Characters for the CHAR gallery
                const charMetas = list.filter(m => (m?.type || 'Character') === 'Character');
                this._esoliteLastCount = charMetas.length;

                // Build lightweight view model only from metadata; defer heavy loads
                const built = [];
                for (let i = 0; i < charMetas.length; i++) {
                    const meta = charMetas[i];
                    if (!meta?.name) continue;
                    built.push({
                        id: i + 1,
                        name: meta.name,
                        created: typeof meta?.created === 'number' ? meta.created : i,
                        // Lightweight fields; details loaded on demand
                        creator: 'Unknown',
                        rating: 0,
                        talkativeness: 0,
                        tags: [],
                        keywords: [],
                        // Use small thumbnail only for gallery
                        thumbnail: meta?.thumbnail || null,
                        image: null,
                        rawData: null,
                    });
                }
                KLITE_RPMod.characters = built;
                this.refreshGallery?.();
            } catch(e) {
                // ignore
            }
        },

        async exportAllFromEsolite() {
            try {
                const list = this.getEsoliteCharacterList();
                const bundle = [];
                for (const meta of list) {
                    try {
                        const d = await window.getCharacterData?.(meta.name);
                        if (d) bundle.push(d);
                    } catch(_) {}
                }
                const blob = new Blob([JSON.stringify({ characters: bundle }, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'esolite_characters.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 500);
            } catch(e) {}
        },

        // Convert base64 data URL to Uint8Array
        _dataURLToUint8(dataURL) {
            try {
                const parts = String(dataURL).split(',');
                const b64 = parts[1] || '';
                const bin = atob(b64);
                const out = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                return out;
            } catch (_) { return null; }
        },

        // Try to convert any image data URL to PNG Uint8Array; returns null on failure
        async _imageDataUrlToPngUint8(dataURL) {
            try {
                if (/^data:image\/png/i.test(String(dataURL))) {
                    return this._dataURLToUint8(dataURL);
                }
                // Render into canvas and export as PNG
                const img = new Image();
                // Ensure same-origin for data URLs
                img.crossOrigin = 'anonymous';
                const loaded = new Promise((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = (e) => reject(e);
                });
                img.src = dataURL;
                await loaded;
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 1;
                canvas.height = img.naturalHeight || img.height || 1;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                return this._dataURLToUint8(pngUrl);
            } catch (_) { return null; }
        },

        // CRC32 implementation for ZIP
        _crc32(bytes) {
            let crc = 0 ^ (-1);
            for (let i = 0; i < bytes.length; i++) {
                crc = (crc >>> 8) ^ this._crcTable[(crc ^ bytes[i]) & 0xFF];
            }
            return (crc ^ (-1)) >>> 0;
        },
        _makeCrcTable() {
            const table = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[n] = c >>> 0;
            }
            return table;
        },
        _crcTable: null,
        _ensureCrc() { if (!this._crcTable) this._crcTable = this._makeCrcTable(); },

        _dosTimeDate(d = new Date()) {
            // Returns { time, date } packed DOS format
            const year = d.getFullYear();
            const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
            const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | ((d.getSeconds() / 2) | 0);
            return { time: dosTime & 0xFFFF, date: dosDate & 0xFFFF };
        },

        _writeU16LE(buf, off, val) { buf[off] = val & 0xFF; buf[off + 1] = (val >>> 8) & 0xFF; },
        _writeU32LE(buf, off, val) {
            buf[off] = val & 0xFF;
            buf[off + 1] = (val >>> 8) & 0xFF;
            buf[off + 2] = (val >>> 16) & 0xFF;
            buf[off + 3] = (val >>> 24) & 0xFF;
        },

        _buildZip(files) {
            // files: [{ name: string, data: Uint8Array, date?: Date }]
            this._ensureCrc();
            const chunks = [];
            const central = [];
            let offset = 0;
            const now = new Date();

            files.forEach(({ name, data, date }) => {
                const utf8name = new TextEncoder().encode(name);
                const { time, date: dosDate } = this._dosTimeDate(date || now);
                const crc = this._crc32(data);
                const compMethod = 0; // store

                // Local File Header
                const lfHeader = new Uint8Array(30 + utf8name.length);
                this._writeU32LE(lfHeader, 0, 0x04034b50);
                this._writeU16LE(lfHeader, 4, 20);
                this._writeU16LE(lfHeader, 6, 0);
                this._writeU16LE(lfHeader, 8, compMethod);
                this._writeU16LE(lfHeader, 10, time);
                this._writeU16LE(lfHeader, 12, dosDate);
                this._writeU32LE(lfHeader, 14, crc);
                this._writeU32LE(lfHeader, 18, data.length);
                this._writeU32LE(lfHeader, 22, data.length);
                this._writeU16LE(lfHeader, 26, utf8name.length);
                this._writeU16LE(lfHeader, 28, 0);
                lfHeader.set(utf8name, 30);

                chunks.push(lfHeader);
                chunks.push(data);

                // Central Directory Header
                const cdHeader = new Uint8Array(46 + utf8name.length);
                this._writeU32LE(cdHeader, 0, 0x02014b50);
                this._writeU16LE(cdHeader, 4, 20);
                this._writeU16LE(cdHeader, 6, 20);
                this._writeU16LE(cdHeader, 8, 0);
                this._writeU16LE(cdHeader, 10, compMethod);
                this._writeU16LE(cdHeader, 12, time);
                this._writeU16LE(cdHeader, 14, dosDate);
                this._writeU32LE(cdHeader, 16, crc);
                this._writeU32LE(cdHeader, 20, data.length);
                this._writeU32LE(cdHeader, 24, data.length);
                this._writeU16LE(cdHeader, 28, utf8name.length);
                this._writeU16LE(cdHeader, 30, 0);
                this._writeU16LE(cdHeader, 32, 0);
                this._writeU16LE(cdHeader, 34, 0);
                this._writeU16LE(cdHeader, 36, 0);
                this._writeU32LE(cdHeader, 38, 0);
                this._writeU32LE(cdHeader, 42, offset);
                cdHeader.set(utf8name, 46);

                central.push(cdHeader);
                offset += lfHeader.length + data.length;
            });

            // Concatenate chunks and central directory
            let totalSize = 0;
            chunks.forEach(c => totalSize += c.length);
            const centralOffset = totalSize;
            central.forEach(c => totalSize += c.length);

            // End of central directory
            const end = new Uint8Array(22);
            this._writeU32LE(end, 0, 0x06054b50);
            this._writeU16LE(end, 4, 0);
            this._writeU16LE(end, 6, 0);
            this._writeU16LE(end, 8, files.length);
            this._writeU16LE(end, 10, files.length);
            let centralSize = 0; central.forEach(c => centralSize += c.length);
            this._writeU32LE(end, 12, centralSize);
            this._writeU32LE(end, 16, centralOffset);
            this._writeU16LE(end, 20, 0);

            totalSize += end.length;
            const out = new Uint8Array(totalSize);
            let pos = 0;
            chunks.forEach(c => { out.set(c, pos); pos += c.length; });
            central.forEach(c => { out.set(c, pos); pos += c.length; });
            out.set(end, pos);
            return out;
        },

        async exportCharactersAsZip(names = null) {
            try {
                let charNames = names;
                if (!Array.isArray(charNames)) {
                    const list = this.getEsoliteCharacterList();
                    charNames = list.map(m => typeof m === 'string' ? m : (m && m.name) ? m.name : null).filter(Boolean);
                }
                if (!charNames.length) { try { alert('No characters found to export.'); } catch(_) {} return; }

                const files = [];
                for (const name of charNames) {
                    try {
                        const d = await window.getCharacterData?.(name);
                        if (!d) continue;
                        const safe = String(name).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

                        let data = null;
                        let filename = null;
                        if (d.image && /^data:image\//.test(String(d.image))) {
                            const pngBytes = await this._imageDataUrlToPngUint8(String(d.image));
                            if (pngBytes && pngBytes.length) {
                                data = pngBytes;
                                filename = `${safe}.png`;
                            }
                        }
                        if (!data) {
                            const json = JSON.stringify(d.data || {}, null, 2);
                            data = new TextEncoder().encode(json);
                            filename = `${safe}.json`;
                        }
                        files.push({ name: filename, data });
                    } catch (_) {}
                }

                if (!files.length) { try { alert('No exportable character data found.'); } catch(_) {} return; }
                const zipBytes = this._buildZip(files);
                const blob = new Blob([zipBytes], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'characters.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            } catch (e) {
                KLITE_RPMod.error('ZIP export failed', e);
                throw e;
            }
        },

        async deleteCharacterByName(name) {
            try {
                if (!name) return;
                await window.indexeddb_save?.(`character_${name}`);
                this.setEsoliteCharacterList((arr) => arr.filter(c => c?.name !== name));
                await window.updateCharacterListFromAll?.();
                await this.rebuildFromEsolite?.();
            } catch(_) {}
        },

        async loadCharacterByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (d?.data) window.load_tavern_obj?.(d.data);
            } catch(_) {}
        },

        async exportCharacterJSONByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                const text = JSON.stringify(d.data || {}, null, 2);
                const a = document.createElement('a');
                a.href = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(text)));
                a.download = `${name}.json`;
                a.click();
            } catch(_) {}
        },

        async exportCharacterPNGByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                if (d.image) {
                    const a = document.createElement('a');
                    a.href = d.image;
                    a.download = `${name}.png`;
                    a.click();
                } else {
                    // Fallback: JSON if no image present
                    await this.exportCharacterJSONByName(name);
                }
            } catch(_) {}
        },

        async loadAsScenarioByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (d?.data) window.load_tavern_obj?.(d.data);
            } catch(_) {}
        },

        async showCharacterFullscreenByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                const inner = d.data || {};
                const char = {
                    id: Date.now(),
                    name: inner?.name || name,
                    image: d.image || null,
                    rawData: { data: inner }
                };
                this.showCharacterFullscreen(char);
            } catch(_) {}
        },
    };
    // === Character Editor Extension for CHARS Panel ===
    KLITE_RPMod.panels.CHARS.editMode = 'none';
    KLITE_RPMod.panels.CHARS.editData = null;

    KLITE_RPMod.panels.CHARS.abortEdit = function () {
        this.editMode = 'none';
        this.editData = null;
        this.currentChar = null;
        this.showGroupSelector = false;
        this.hideCharacterFullscreen();
        KLITE_RPMod.loadPanel('right', 'CHARS');
        try { document.getElementById('content-right')?.scrollTo?.(0,0); } catch(_) {}
    };

    KLITE_RPMod.panels.CHARS.saveCharacter = function () {
        const data = this.editData;
        if (!data.name?.trim()) {
            alert('Character must have a name.');
            return;
        }

        // Map tags into the metadata if needed
        if (!data.tags || !Array.isArray(data.tags)) {
            data.tags = [];
        }

        // Fallback spec
        data.spec = 'chara_card_v2';

        this.addCharacter(data);
        this.abortEdit();
    };

    KLITE_RPMod.panels.CHARS.uploadImage = function (event) {
        const file = event?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgData = e.target.result;

            // ✅ Mutate a local reference (in case CHARS panel re-renders)
            const panel = KLITE_RPMod.panels.CHARS;
            if (!panel.editData) panel.editData = {};

            panel.editData.avatar = imgData;
            panel.editData.image = imgData; // ensure compatibility

            // 🔄 Trigger rerender *after* data is safely assigned
            KLITE_RPMod.loadPanel('right', 'CHARS');
        };
        reader.readAsDataURL(file);
    };


    KLITE_RPMod.panels.CHARS.renderEditor = function (charData = null) {
        // Initialize editData once per session or when switching target
        if (!this.editData) {
            this.editData = {};
        }
        if (charData) {
            // If entering edit/clone with provided data, seed missing fields only
            const d = this.editData;
            this.editData = {
                // Preserve any already-typed fields in current session
                id: d.id ?? (charData?.id || null),
                name: d.name ?? (charData?.name || ''),
                description: d.description ?? (charData?.description || ''),
                personality: d.personality ?? (charData?.personality || ''),
                scenario: d.scenario ?? (charData?.scenario || ''),
                first_mes: d.first_mes ?? (charData?.first_mes || ''),
                mes_example: d.mes_example ?? (charData?.mes_example || ''),

                tags: Array.isArray(d.tags) ? d.tags : (Array.isArray(charData?.tags) ? charData.tags : []),
                creator: d.creator ?? (charData?.creator || ''),
                character_version: d.character_version ?? (charData?.character_version || charData?.version || ''),
                creator_notes: d.creator_notes ?? (charData?.creator_notes || charData?.userNotes || ''),
                system_prompt: d.system_prompt ?? (charData?.system_prompt || (charData?.extensions?.depth_prompt?.prompt || '')),
                post_history_instructions: d.post_history_instructions ?? (charData?.post_history_instructions || ''),

                alternate_greetings: Array.isArray(d.alternate_greetings)
                    ? d.alternate_greetings
                    : (Array.isArray(charData?.alternate_greetings)
                        ? charData.alternate_greetings
                        : (Array.isArray(charData?.alternateGreetings) ? charData.alternateGreetings : [])),
                avatar: d.avatar || charData?.avatar || charData?.image || charData?.images?.avatar || '',
                wi_group: d.wi_group ?? (charData?.wi_group || charData?.category || 'General'),

                importSource: d.importSource ?? (charData?.importSource || ''),
                importDate: d.importDate ?? (charData?.importDate || Date.now()),
                originalFilename: d.originalFilename ?? (charData?.originalFilename || ''),
                isFavorite: d.isFavorite ?? !!charData?.isFavorite,
                isArchived: d.isArchived ?? !!charData?.isArchived,

                extensions: d.extensions || (charData?.extensions
                    ? JSON.parse(JSON.stringify(charData.extensions))
                    : {}),

                keywords: Array.isArray(d.keywords) ? [...d.keywords] : (Array.isArray(charData?.keywords) ? [...charData.keywords] : []),
                relationships: Array.isArray(d.relationships) ? [...d.relationships] : (Array.isArray(charData?.relationships) ? [...charData.relationships] : []),
                preferences: d.preferences ? { ...d.preferences } : (charData?.preferences ? { ...charData.preferences } : {}),
                traits: Array.isArray(d.traits) ? [...d.traits] : (Array.isArray(charData?.traits) ? [...charData.traits] : []),
                rating: d.rating ? { ...d.rating } : (charData?.rating ? { ...charData.rating } : {}),
                stats: d.stats ? { ...d.stats } : (charData?.stats ? { ...charData.stats } : {}),
                worldInfo: d.worldInfo ? { ...d.worldInfo } : (charData?.worldInfo ? { ...charData.worldInfo } : {}),
            };
        }

        const d = this.editData;
        if (KLITE_RPMod.panels.WI && typeof KLITE_RPMod.panels.WI.init === 'function') {
            KLITE_RPMod.panels.WI.init();
        }


        return `
    <div class="klite-char-editor">
        <h3>${d.id ? 'Edit Character' : charData ? 'Clone Character' : 'Create New Character'}</h3>

        <label>Name:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.name)}" oninput="KLITE_RPMod.panels.CHARS.editData.name=this.value"><br>

        <label>Description:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.description=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.description)}</textarea><br>

        <label>Personality:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.personality=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.personality)}</textarea><br>

        <label>Scenario:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.scenario=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.scenario)}</textarea><br>

        <label>Greeting (first message):</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.first_mes=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.first_mes)}</textarea><br>

        <label>Example Dialogue:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.mes_example=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.mes_example)}</textarea><br>

        <label>Tags (comma-separated):</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML((Array.isArray(d.tags) ? d.tags : []).join(', '))}" oninput="KLITE_RPMod.panels.CHARS.editData.tags=this.value.split(',').map(t=>t.trim()).filter(Boolean)"><br>

        <label>Creator:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.creator)}" oninput="KLITE_RPMod.panels.CHARS.editData.creator=this.value"><br>

        <label>Character Version:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.character_version)}" oninput="KLITE_RPMod.panels.CHARS.editData.character_version=this.value"><br>

        <label>Creator Notes (not shown to AI):</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.creator_notes=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.creator_notes)}</textarea><br>

        <label>System Prompt Override:</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.system_prompt=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.system_prompt)}</textarea><br>

        <label>Post-History Instructions:</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.post_history_instructions=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.post_history_instructions)}</textarea><br>

        <label>Alternate Greetings (one per line):</label>
        <textarea class="klite-input" rows="3"
            oninput="KLITE_RPMod.panels.CHARS.editData.alternate_greetings = this.value.split('\\n').map(l => l.trim()).filter(Boolean)">${KLITE_RPMod.panels.CHARS.escapeTextarea((d.alternate_greetings || []).join('\\n'))}</textarea><br>

        <label>Upload Avatar:</label>
        <input type="file" accept="image/png" onchange="KLITE_RPMod.panels.CHARS.uploadImage(event)">
        <div><img src="${d.avatar || ''}" alt="Avatar preview" style="max-height:120px;margin-top:8px;"></div>

        ${this.renderGroupSelector()}

        <div class="klite-buttons-fill klite-mt">
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.saveCharacterwithWI()">💾 Save</button>
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.abortEdit()">↩️ Back</button>
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.toggleGroupSelector()">🔗 Connect WI Group</button>
        </div>
    </div>`;
    };

    // Extend render() to show New Character button and swap view regarding mode
    const originalRender = KLITE_RPMod.panels.CHARS.render;
    KLITE_RPMod.panels.CHARS.render = function () {
        if (this.editMode === 'new') return this.renderEditor();
        if (this.editMode === 'edit') return this.renderEditor(this.currentChar);
        if (this.editMode === 'clone') return this.renderEditor(this.currentChar);

        const base = originalRender.call(this);
        const newBtn = '<div class="klite-buttons-fill klite-mb">' +
            '<button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.setEditMode(\'new\')">➕ New Character</button>' +
            '</div>';
        return newBtn + base;
    };

    // Helper setter methode to set mode and re-render
    KLITE_RPMod.panels.CHARS.setEditMode = function (mode, char = null) {
        this.editMode = mode;
        this.currentChar = char;
        // Reset editData when switching modes/targets to avoid stale merges
        this.editData = null;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    KLITE_RPMod.panels.CHARS.showGroupSelector = false;

    KLITE_RPMod.panels.CHARS.toggleGroupSelector = function () {
        this.showGroupSelector = !this.showGroupSelector;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    KLITE_RPMod.panels.CHARS.renderGroupSelector = function () {
        if (!this.showGroupSelector) return '';

        const wiPanel = KLITE_RPMod.panels.WI;
        const groups = (wiPanel && wiPanel.getGroups && typeof wiPanel.getGroups === 'function')
            ? wiPanel.getGroups() : [];

        if (!groups.length) return '<div class="klite-muted">No WorldInfo groups available.</div>';

        const selected = this.editData.character_book || '';
        const options = groups.map(g =>
            `<option value="${g}" ${selected === g ? 'selected' : ''}>${g || '[Unassigned]'}</option>`
        ).join('');

        return `
        <label>WorldInfo Group:</label>
        <select class="klite-select" onchange="KLITE_RPMod.panels.CHARS.selectGroup(this.value)">
            <option value="">— Select Group —</option>
            ${options}
        </select>
    `;
    };

    KLITE_RPMod.panels.CHARS.selectGroup = function (groupName) {
        this.editData.character_book = groupName || null;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    if (!KLITE_RPMod.panels.CHARS.saveCharacterwithWI) {
        KLITE_RPMod.panels.CHARS.saveCharacterwithWI = async function () {
            const data = this.editData;
            if (!data.name?.trim()) {
                alert('Character must have a name.');
                return;
            }
            // Image is optional; if absent, we will save JSON-only.

            data.spec = 'chara_card_v2';
            data.spec_version = '2.0';
            data.character_book = null;

            try {
                if (KLITE_RPMod.panels?.CHARS?.addCharacter) {
                    await KLITE_RPMod.panels.CHARS.addCharacter(data);
                    // If name changed, remove old list entry to avoid duplicates
                    try {
                        const oldName = this.currentChar?.name;
                        if (oldName && oldName !== data.name) {
                            this.setEsoliteCharacterList(arr => (Array.isArray(arr) ? arr : []).filter(c => c?.name !== oldName));
                        }
                    } catch(_) {}
                } else {
                    throw new Error('CHARS panel not available. Character import requires proper panel initialization.');
                }
            } catch (err) {
                console.error('[KLITE RPMod][ERROR] Character save failed:', err);
                alert('Failed to save character: ' + err.message);
                return;
            }

            this.abortEdit?.();
        };
    }


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

    // Start original Lite initialization (kept for compatibility)
    // Note: For broader host support, a more flexible bootstrap runs below.
    waitForKobold();

    // =============================================
    // 6b. ESOLITE-COMPATIBLE BOOTSTRAP + FALLBACKS
    // =============================================
    // Some forks (e.g., Esobold esolite) use different DOM ids or init timing.
    // We add a permissive bootstrap that:
    // - Initializes once the document is ready or after a short timeout
    // - Provides storage fallbacks when indexeddb_* are unavailable
    // - Re-applies hooks if the generation function appears later

    (function esoliteBootstrap(){
        // Storage adaptor for forks missing Lite's indexeddb_* helpers (no localStorage fallback)
        try {
            if (window.KLITE_RPMod) {
                // Direct IndexedDB helpers using STORAGE_PREFIX and a single object store
                const idbOpen = () => new Promise((resolve, reject) => {
                    try {
                        const prefix = (typeof window.STORAGE_PREFIX === 'string') ? window.STORAGE_PREFIX : 'kaihordewebui_';
                        const req = indexedDB.open(prefix, 1);
                        req.onupgradeneeded = (ev) => {
                            const db = ev.target.result;
                            if (!db.objectStoreNames.contains(prefix)) {
                                db.createObjectStore(prefix, { keyPath: 'key' });
                            }
                        };
                        req.onsuccess = () => resolve({ db: req.result, storeName: prefix });
                        req.onerror = () => reject(req.error);
                    } catch (e) { reject(e); }
                });

                const directSave = async (key, data) => {
                    const { db, storeName } = await idbOpen();
                    return await new Promise((resolve, reject) => {
                        const tx = db.transaction(storeName, 'readwrite');
                        const st = tx.objectStore(storeName);
                        const putReq = st.put({ key, value: data });
                        putReq.onsuccess = () => resolve(true);
                        putReq.onerror = () => reject(putReq.error);
                    });
                };

                const directLoad = async (key) => {
                    const { db, storeName } = await idbOpen();
                    return await new Promise((resolve, reject) => {
                        const tx = db.transaction(storeName, 'readonly');
                        const st = tx.objectStore(storeName);
                        const getReq = st.get(key);
                        getReq.onsuccess = () => resolve(getReq.result ? getReq.result.value : null);
                        getReq.onerror = () => reject(getReq.error);
                    });
                };

                KLITE_RPMod.saveToLiteStorage = async function(key, data){
                    if (window.indexeddb_save && typeof window.indexeddb_save === 'function') {
                        return await window.indexeddb_save(key, data).then(() => true).catch(() => directSave(key, data));
                    }
                    return await directSave(key, data);
                };

                KLITE_RPMod.loadFromLiteStorage = async function(key){
                    if (window.indexeddb_load && typeof window.indexeddb_load === 'function') {
                        try { return await window.indexeddb_load(key, null); } catch(_) { /* fallthrough */ }
                    }
                    return await directLoad(key);
                };
            }
        } catch(e) { console.warn('[RPMod] Failed to install IndexedDB adapter:', e); }

        // Make setupHooks idempotent and mark when wrapped
        try {
            if (window.KLITE_RPMod && typeof KLITE_RPMod.setupHooks === 'function') {
                const origSetupHooks = KLITE_RPMod.setupHooks.bind(KLITE_RPMod);
                KLITE_RPMod.setupHooks = function(){
                    try {
                        // If Lite generation function exists and is not wrapped, run original hook logic
                        if (typeof window.submit_generation_button === 'function' && !window.submit_generation_button.__rpmod_wrapped) {
                            origSetupHooks();
                            // Mark the new global wrapper function so we don't double-wrap on forks
                            if (typeof window.submit_generation_button === 'function') {
                                window.submit_generation_button.__rpmod_wrapped = true;
                            }
                        }
                    } catch(e) {
                        try { origSetupHooks(); } catch(_){}
                    }
                };
            }
        } catch(e) { console.warn('[RPMod] Failed to make setupHooks idempotent:', e); }

        // Panels-only stubs: disable overlay/left-only operations at runtime
        try {
            (function(){
                try {
                    if (!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly)) return;
                    if (!window.KLITE_RPMod) return;
                    const M = window.KLITE_RPMod;
                    const noop = function(){};
                    [
                        'toggleFullscreen',
                        'toggleTabletSidepanel',
                        'updateTabletSidepanelPositions',
                        'removeTabletSidepanelClasses',
                        'restoreUIStates',
                        'updateTabletSidepanelButton',
                        'updateFullscreenButton',
                        'bottomAction',
                        'updateModeButtons',
                        'setActiveQuickButton',
                        'onModeChange',
                        'switchToClassicUI',
                        'addMobileNavigationButtons',
                        'toggleUI'
                    ].forEach(k => { try { if (typeof M[k] === 'function') M[k] = noop; } catch(_){} });

                    // Generation controls/UI are unused in panels-only
                    try {
                        if (M.generationControl) Object.assign(M.generationControl, {
                            init: noop,
                            setupEventHandlers: noop,
                            saveToLite: noop,
                            applyPreset: noop,
                            updateFromSlider: noop,
                            updateDisplaysOnly: noop,
                            syncAllPanels: noop,
                            syncPanel: noop,
                            updatePresetButtons: noop
                        });
                        M.renderGenerationControl = () => '';
                    } catch(_) {}
                } catch(_) {}
            })();
        } catch(_) {}

        // Flexible readiness detector that works on Lite and forks
        function isLiteReady(){
            const hasGame = !!(document.getElementById('gametext'));
            const hasInput = !!(document.getElementById('input_text') || document.getElementById('corpo_cht_inp'));
            const hasSubmit = (typeof window.submit_generation_button === 'function') || !!document.querySelector('#submit_generation_button, #btnmode_submit, #btn_submit, #btnsend');
            return hasGame && hasInput && hasSubmit;
        }

        function basicReady(){ return document.readyState !== 'loading'; }

        let tries = 0; const maxTries = 30; // ~7.5s @ 250ms
        (function loop(){
            tries++;
            if (isLiteReady() || (basicReady() && tries > 8)) { // after ~2s, allow fallback init
                try {
                    if (window.KLITE_RPMod && !window.KLITE_RPMod._initialized) {
                        // Delay slightly to let host finish layout
                        setTimeout(() => { try { KLITE_RPMod.init(); } catch(e){ console.warn('[RPMod] init() failed in bootstrap:', e); } }, 120);
                        // Install save/load hooks for embedding RPMod data into savefiles without touching host sources
                        try {
                            if (!window._rpmod_orig_generate_savefile && typeof window.generate_savefile === 'function' && window.KLITE_RPMod) {
                                window._rpmod_orig_generate_savefile = window.generate_savefile;
                                window.generate_savefile = function(save_images, export_settings, export_aesthetic_settings){
                                    const obj = window._rpmod_orig_generate_savefile.apply(this, arguments);
                                    try {
                                        const bundle = window.KLITE_RPMod.getSaveBundle?.();
                                        if (bundle) obj.rpmod = bundle;
                                    } catch(_) {}
                                    return obj;
                                };
                            }
                        } catch(e) { console.warn('[RPMod] Save hook error:', e); }

                        try {
                            if (!window._rpmod_orig_kai_json_load && typeof window.kai_json_load === 'function' && window.KLITE_RPMod) {
                                window._rpmod_orig_kai_json_load = window.kai_json_load;
                                window.kai_json_load = function(){
                                    try {
                                        const storyobj = arguments[0];
                                        if (storyobj && storyobj.rpmod) {
                                            window._rpmod_pending_restore_bundle = storyobj.rpmod;
                                        }
                                    } catch(_){}
                                    const res = window._rpmod_orig_kai_json_load.apply(this, arguments);
                                    try {
                                        if (window._rpmod_pending_restore_bundle && window.KLITE_RPMod?.restoreFromSaveBundle) {
                                            window.KLITE_RPMod.restoreFromSaveBundle(window._rpmod_pending_restore_bundle);
                                            window._rpmod_pending_restore_bundle = null;
                                        }
                                    } catch(_){}
                                    return res;
                                };
                            }
                        } catch(e) { console.warn('[RPMod] Load hook error:', e); }
                    }
                } catch(e) { console.warn('[RPMod] bootstrap init error:', e); }

                // Start a watcher to apply hooks if submit function appears later (common on forks)
                try {
                    let hookTries = 0; const hookMax = 120; // ~2min safety cap
                    const w = setInterval(() => {
                        hookTries++;
                        try {
                            if (window.KLITE_RPMod && typeof KLITE_RPMod.setupHooks === 'function') KLITE_RPMod.setupHooks();
                            if (typeof window.submit_generation_button === 'function' && window.submit_generation_button.__rpmod_wrapped) {
                                clearInterval(w);
                            }
                            if (hookTries > hookMax) clearInterval(w);
                        } catch(_){}
                    }, 1500);
                } catch(_){}
                return; // done
            }
            if (tries < maxTries) { setTimeout(loop, 250); }
            else {
                // Last-resort init even if host never exposed expected nodes
                try { if (window.KLITE_RPMod && !window.KLITE_RPMod._initialized) KLITE_RPMod.init(); } catch(e){ console.warn('[RPMod] fallback init failed:', e); }
            }
        })();
    })();

})();
