// =============================================
// KLITE RP mod - MINIMAL (Refactored from ALPHA)
// Creator: Peter Hauer | GPL-3.0 License
// https://github.com/PeterPeet/
// =============================================
// This is a cleaned, minimal version removing:
// - All overlay UI code (left panel, top panel, full overlay)
// - All mobile UI code
// - Unused mode switching (PLAY_STORY, PLAY_ADV, PLAY_CHAT)
// - Dead/duplicate code
// =============================================

(function () {
    'use strict';

    // Prevent duplicate loads
    if (window.KLITE_RPMod_LOADED) {
        console.warn('[KLITE RPMod] Already loaded, skipping duplicate load');
        return;
    }
    window.KLITE_RPMod_LOADED = true;

    // Configuration - panels-only mode is the only mode now
    window.KLITE_RPMod_Config = window.KLITE_RPMod_Config || {};
    window.KLITE_RPMod_Config.panelsOnly = true;
    window.KLITE_RPMod_Config.embedInSave = true;
    window.KLITE_RPMod_Config.rpmodAutosave = false;
    window.KLITE_RPMod_Config.enableConsoleRestore = false;

    // =============================================
    // CONSOLE RESTORATION (GATED)
    // =============================================
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
            }
        } catch (e) {}
    })();

    // =============================================
    // DEBUG SYSTEM
    // =============================================
    (function setupRpmodDebugCore(){
        try {
            const TOPICS_DEFAULTS = {
                essential: true, init: false, panels: false, group: true,
                avatars: true, chars: false, generation: false, state: false,
                integration: false, hotkeys: false, debug: false, errors: true,
                storage: false, network: false, esolite: false, hooks: false,
                ui: false, narrator: false
            };

            if (!window.KLITE_RPMod) window.KLITE_RPMod = {};
            if (!window.KLITE_RPMod.debugLevels) window.KLITE_RPMod.debugLevels = {};
            for (const k of Object.keys(TOPICS_DEFAULTS)) {
                if (typeof window.KLITE_RPMod.debugLevels[k] === 'undefined') {
                    window.KLITE_RPMod.debugLevels[k] = TOPICS_DEFAULTS[k];
                }
            }
            if (typeof window.KLITE_RPMod.debug !== 'boolean') window.KLITE_RPMod.debug = true;

            function applyTopicsFromLocalStorage() {
                try {
                    const raw = localStorage.getItem('KLITE.debug.topics') || '';
                    const off = localStorage.getItem('KLITE.debug.off') || '';
                    const dbg = localStorage.getItem('KLITE.debug.enabled');
                    if (dbg != null) {
                        window.KLITE_RPMod.debug = (dbg === '1' || /^true$/i.test(dbg));
                    }
                    const onAll = /(\*|^all$)/i.test(raw.trim());
                    const offAll = /(\*|^all$)/i.test(off.trim());
                    const onSet = new Set(raw.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean));
                    const offSet = new Set(off.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean));
                    const levels = window.KLITE_RPMod.debugLevels || {};
                    Object.keys(levels).forEach(k => {
                        if (offAll) { levels[k] = false; return; }
                        if (onAll) { levels[k] = true; return; }
                        if (onSet.size>0) levels[k] = onSet.has(k);
                        if (offSet.has(k)) levels[k] = false;
                    });
                } catch(_) {}
            }

            function setTopics(topicsStr){ try { localStorage.setItem('KLITE.debug.topics', topicsStr||''); applyTopicsFromLocalStorage(); } catch(_){} }
            function setTopicsOff(topicsStr){ try { localStorage.setItem('KLITE.debug.off', topicsStr||''); applyTopicsFromLocalStorage(); } catch(_){} }
            function setEnabled(enabled){ try { localStorage.setItem('KLITE.debug.enabled', enabled? '1' : '0'); applyTopicsFromLocalStorage(); } catch(_){} }
            function on(){ setTopics(Array.from(arguments).join(',')); setTopicsOff(''); }
            function off(){ setTopics(''); setTopicsOff(Array.from(arguments).join(',')); }
            function all(){ setTopics('all'); setTopicsOff(''); }
            function none(){ setTopics(''); setTopicsOff('all'); }

            window.KLITE_RPDebug = window.KLITE_RPDebug || {};
            Object.assign(window.KLITE_RPDebug, { setTopics, setTopicsOff, setEnabled, on, off, all, none, applyTopicsFromLocalStorage });
            applyTopicsFromLocalStorage();
        } catch(_) {}
    })();

    // =============================================
    // TOKEN/CONTEXT HELPERS
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
        try {
            const ls = window.localsettings || { max_context_length: 2048, max_length: 256 };
            const chars_per_token = 3.5 * ((ls.token_count_multiplier||100) * 0.01);
            return Math.max(1, Math.floor(((ls.max_context_length - ls.max_length) * chars_per_token)) - 12);
        } catch(_) { return 2048; }
    }
    function rpmod_prepend_preinjection(injection) {
        if (!injection) return;
        try {
            const existing = (typeof window.pending_context_preinjection === 'string') ? window.pending_context_preinjection : '';
            const sep = (existing && !existing.startsWith("\n")) ? "\n\n" : "\n\n";
            window.pending_context_preinjection = String(injection) + sep + existing;
        } catch(_) {}
    }

    // =============================================
    // CSS STYLES (Right Panel Only)
    // =============================================
    try { if (typeof window.niko_square === 'undefined') window.niko_square = ''; } catch(_) {}
    try { if (typeof window.human_square === 'undefined') window.human_square = ''; } catch(_) {}

    const STYLES = `
        /* Theme variable mappings */
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

        hr {
            height: 0 !important;
            border: none !important;
            border-top: 1px solid rgba(68, 68, 68, 0.3) !important;
            margin: 12px 0 !important;
            background: transparent !important;
        }

        /* Right Panel Only */
        .klite-panel {
            position: fixed;
            background: var(--bg2);
            transition: transform 0.3s ease;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }

        .klite-panel-right {
            right: 0;
            top: 0;
            bottom: 0;
            width: 350px;
            border-left: 1px solid var(--border);
            z-index: 2;
        }

        .klite-panel-right.collapsed { transform: translateX(350px); }

        .klite-panel-right .klite-handle {
            position: absolute;
            left: -15px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--bg2);
            padding: 8px 4px;
            cursor: pointer;
            border: 1px solid var(--border);
            border-radius: 4px 0 0 4px;
            z-index: 3;
        }

        /* Non-overlay mode: body padding adjustment */
        .klite-panels-nonoverlay-right { padding-right: 350px !important; }

        /* Panels-only wrapper */
        #klite-panels-only {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 999;
        }
        #klite-panels-only .klite-panel { pointer-events: auto; }
        #klite-panels-only .klite-modal { pointer-events: auto; }

        /* Tabs */
        .klite-tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            background: var(--bg3);
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .klite-tabs::-webkit-scrollbar { display: none; }

        .klite-tab {
            flex: 1;
            padding: 8px 4px;
            text-align: center;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            background: transparent;
            border: none;
            color: var(--muted);
            transition: all 0.2s;
            min-width: 50px;
            white-space: nowrap;
        }

        .klite-tab:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        .klite-tab.active { background: var(--primary); color: var(--primary-text); }

        /* Content area */
        .klite-content {
            padding: 10px;
            overflow-y: auto;
            height: calc(100% - 50px);
        }

        /* Sections */
        .klite-section {
            margin-bottom: 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
        }

        .klite-section-header {
            padding: 8px 10px;
            background: var(--bg3);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 12px;
        }

        .klite-section-content {
            padding: 10px;
            display: block;
        }

        .klite-section.collapsed .klite-section-content { display: none; }

        /* Form elements */
        .klite-row {
            display: flex;
            gap: 6px;
            margin-bottom: 6px;
            align-items: center;
        }

        .klite-btn {
            padding: 6px 12px;
            background: var(--primary);
            color: var(--primary-text);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .klite-btn:hover { filter: brightness(1.1); }
        .klite-btn.active { background: var(--accent); }
        .klite-btn.danger { background: var(--danger); }
        .klite-btn-sm { padding: 4px 8px; font-size: 11px; }

        .klite-input, .klite-select, .klite-textarea {
            width: 100%;
            padding: 6px 8px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text);
            font-size: 12px;
        }

        .klite-textarea {
            min-height: 80px;
            resize: vertical;
            font-family: inherit;
        }

        .klite-checkbox {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
        }

        /* Character cards */
        .klite-char-card {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 6px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .klite-char-card:hover { border-color: var(--accent); }
        .klite-char-card.selected { border-color: var(--accent); background: rgba(var(--accent), 0.1); }

        .klite-char-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            background: var(--bg);
        }

        .klite-char-info { flex: 1; min-width: 0; }
        .klite-char-name { font-weight: bold; font-size: 12px; }
        .klite-char-desc { font-size: 10px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Token bar */
        .klite-token-bar-container { margin-bottom: 8px; }
        .klite-token-bar {
            height: 12px;
            background: var(--bg3);
            border-radius: 6px;
            overflow: hidden;
            display: flex;
        }
        .klite-token-segment { height: 100%; transition: width 0.3s ease; }
        .klite-memory-segment { background: #4a90d9; }
        .klite-wi-segment { background: #9b59b6; }
        .klite-story-segment { background: #2ecc71; }
        .klite-anote-segment { background: #e67e22; }
        .klite-free-segment { background: var(--bg); }

        .klite-token-legend { font-size: 10px; margin-top: 6px; }
        .klite-token-legend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
        .klite-token-legend-item { display: flex; align-items: center; gap: 4px; }
        .klite-token-legend-color { width: 10px; height: 10px; border-radius: 2px; }

        /* Dice grid */
        .klite-dice-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; }
        .klite-dice-result { padding: 8px; background: var(--bg3); border-radius: 4px; text-align: center; min-height: 20px; }

        /* Modal */
        .klite-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .klite-modal-content {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 8px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            padding: 16px;
        }

        .klite-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border);
        }

        .klite-modal-title { font-size: 16px; font-weight: bold; }
        .klite-modal-close { background: none; border: none; color: var(--text); font-size: 20px; cursor: pointer; }
        .klite-modal-body { margin-bottom: 12px; }
        .klite-modal-footer { display: flex; gap: 8px; justify-content: flex-end; }

        /* Group chat speaker list */
        .klite-speaker-list { display: flex; flex-direction: column; gap: 4px; }
        .klite-speaker-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 4px;
            cursor: pointer;
        }
        .klite-speaker-item:hover { border-color: var(--accent); }
        .klite-speaker-item.active { border-color: var(--accent); background: rgba(100,149,237,0.2); }
        .klite-speaker-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .klite-speaker-name { font-size: 12px; font-weight: bold; flex: 1; }

        /* Misc utilities */
        .klite-mt { margin-top: 8px; }
        .klite-mb { margin-bottom: 8px; }
        .klite-center { text-align: center; }
        .klite-muted { color: var(--muted); }
        .klite-small { font-size: 11px; }
    `;

    // =============================================
    // TEMPLATE HELPERS
    // =============================================
    const t = {
        section: (title, content, collapsed = false) => `
            <div class="klite-section ${collapsed ? 'collapsed' : ''}">
                <div class="klite-section-header">
                    <span>${title}</span>
                    <span>${collapsed ? '▶' : '▼'}</span>
                </div>
                <div class="klite-section-content">${content}</div>
            </div>`,
        button: (text, className = '', action = '') =>
            `<button class="klite-btn ${className}" ${action ? `data-action="${action}"` : ''}>${text}</button>`,
        input: (id, placeholder = '', value = '') =>
            `<input type="text" id="${id}" class="klite-input" placeholder="${placeholder}" value="${value}">`,
        textarea: (id, placeholder = '', value = '', rows = 3) =>
            `<textarea id="${id}" class="klite-textarea" placeholder="${placeholder}" rows="${rows}">${value}</textarea>`,
        select: (id, options) =>
            `<select id="${id}" class="klite-select">${options.map(o =>
                `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.text}</option>`
            ).join('')}</select>`,
        checkbox: (id, label, checked = false) =>
            `<label class="klite-checkbox"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span>${label}</span></label>`
    };

    // =============================================
    // MAIN KLITE_RPMod OBJECT
    // =============================================
    const KLITE_RPMod = window.KLITE_RPMod || {};
    window.KLITE_RPMod = KLITE_RPMod;

    Object.assign(KLITE_RPMod, {
        version: 'minimal-1.0',
        _initialized: false,
        panels: {},
        characters: [],
        groupAvatars: new Map(),

        // State
        state: {
            tabs: { right: 'CHARS' },
            collapsed: { right: false },
            generating: false
        },

        // Logging
        log(topic, ...args) {
            if (!this.debug) return;
            if (this.debugLevels && !this.debugLevels[topic]) return;
            console.log(`[RPMod][${topic}]`, ...args);
        },
        error(...args) {
            console.error('[RPMod][ERROR]', ...args);
        },

        // =============================================
        // STORAGE HELPERS (LiteAPI)
        // =============================================
        async saveToLiteStorage(key, value) {
            try {
                if (window.localDB && typeof window.localDB.setItem === 'function') {
                    await window.localDB.setItem(key, value);
                    return true;
                }
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                this.error('Storage save failed:', e);
                return false;
            }
        },

        async loadFromLiteStorage(key) {
            try {
                if (window.localDB && typeof window.localDB.getItem === 'function') {
                    return await window.localDB.getItem(key);
                }
                return localStorage.getItem(key);
            } catch (e) {
                this.error('Storage load failed:', e);
                return null;
            }
        },

        async deleteFromLiteStorage(key) {
            try {
                if (window.localDB && typeof window.localDB.removeItem === 'function') {
                    await window.localDB.removeItem(key);
                    return true;
                }
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                this.error('Storage delete failed:', e);
                return false;
            }
        },

        // =============================================
        // INITIALIZATION
        // =============================================
        async init() {
            if (this._initialized) return;
            this._initialized = true;

            this.log('init', 'Initializing KLITE RPMod (Minimal)...');

            // Inject styles
            const style = document.createElement('style');
            style.textContent = STYLES;
            document.head.appendChild(style);

            // Load state
            await this.loadState();

            // Build panels-only UI
            this.buildPanelsOnlyUI();
            this.applyPanelsHostTheme();
            this.startPanelsThemeObserver();

            // Load initial panel
            this.loadPanel('right', this.state.tabs.right);

            // Setup hooks
            this.setupHooks();
            this.initializeHotkeys();

            this.log('init', 'KLITE RPMod (Minimal) initialized');
        },

        // =============================================
        // PANELS-ONLY UI BUILDER
        // =============================================
        buildPanelsOnlyUI() {
            this.log('init', 'Building panels-only UI...');

            let wrapper = document.getElementById('klite-panels-only');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'klite-panels-only';
                document.body.appendChild(wrapper);
            }

            wrapper.innerHTML = `
                <div class="klite-panel klite-panel-right ${this.state.collapsed?.right ? 'collapsed' : ''}" id="panel-right">
                    <div class="klite-handle" data-panel="right">${this.state.collapsed?.right ? '◀' : '▶'}</div>
                    <div class="klite-tabs" data-panel="right">
                        ${[
                            { key: 'CHARS', label: 'MANAGE<br>CHARS' },
                            { key: 'ROLES', label: 'SELECT<br>ROLES' },
                            { key: 'SCENARIO', label: 'CREATE<br>SCENARIO' },
                            { key: 'TOOLS', label: 'USE<br>TOOLS' }
                        ].map(tab =>
                            `<div class="klite-tab ${tab.key === this.state.tabs?.right ? 'active' : ''}" data-tab="${tab.key}">${tab.label}</div>`
                        ).join('')}
                    </div>
                    <div class="klite-content" id="content-right"></div>
                </div>
            `;

            // Event delegation
            const panelEl = wrapper.querySelector('#panel-right');
            if (panelEl) {
                const dispatchClick = (e) => {
                    if (e.__kliteHandled) return;
                    const inPanel = e.target?.closest?.('#panel-right');
                    if (!inPanel) return;
                    e.__kliteHandled = true;
                    this.handleClick(e);
                };
                const dispatchInput = (e) => {
                    if (e.__kliteHandledInput) return;
                    const inPanel = e.target?.closest?.('#panel-right');
                    if (!inPanel) return;
                    e.__kliteHandledInput = true;
                    this.handleInput(e);
                };
                const dispatchChange = (e) => {
                    if (e.__kliteHandledChange) return;
                    const inPanel = e.target?.closest?.('#panel-right');
                    if (!inPanel) return;
                    e.__kliteHandledChange = true;
                    this.handleChange(e);
                };

                panelEl.addEventListener('click', dispatchClick);
                panelEl.addEventListener('input', dispatchInput);
                panelEl.addEventListener('change', dispatchChange);
                document.addEventListener('click', dispatchClick, true);
                document.addEventListener('input', dispatchInput, true);
                document.addEventListener('change', dispatchChange, true);
            }

            // Modal click handler
            document.addEventListener('click', e => {
                if (e.target.closest('.klite-modal')) {
                    this.handleModalClick(e);
                }
            }, true);

            this.updatePanelsOnlyOverlayPadding();
            this.log('init', 'Panels-only UI built');
        },

        // =============================================
        // THEME HANDLING
        // =============================================
        applyPanelsHostTheme() {
            try {
                const wrap = document.getElementById('klite-panels-only');
                if (!wrap) return;
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
                Object.entries(binding).forEach(([k, v]) => {
                    try { wrap.style.setProperty(`--${k}`, v); } catch(_){}
                });
            } catch (e) {}
        },

        startPanelsThemeObserver() {
            try {
                if (this._panelsThemeObserver) return;
                this._panelsThemeObserver = new MutationObserver(() => {
                    try { this.applyPanelsHostTheme(); } catch(_){}
                });
                this._panelsThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
            } catch (e) {}
        },

        // =============================================
        // OVERLAY PADDING (NON-OVERLAY MODE)
        // =============================================
        getOverlaySidepanelEnabled() {
            try {
                return window.localsettings?.rpmod_overlay_sidepanel !== false;
            } catch(_) { return true; }
        },

        updatePanelsOnlyOverlayPadding() {
            try {
                const overlay = this.getOverlaySidepanelEnabled();
                const right = document.getElementById('panel-right');
                const isOpen = !!(right && !right.classList.contains('collapsed'));
                const maincon = document.getElementById('maincontainer');

                document.body.classList.remove('klite-panels-nonoverlay-right');
                if (maincon) maincon.style.marginRight = '';

                if (!overlay && isOpen) {
                    if (maincon) {
                        maincon.style.marginRight = '350px';
                    } else {
                        document.body.classList.add('klite-panels-nonoverlay-right');
                    }
                }
            } catch(_){}
        },

        // =============================================
        // EVENT HANDLERS
        // =============================================
        handleClick(e) {
            // Panel handle
            const handleEl = e.target.closest('.klite-handle');
            if (handleEl && handleEl.dataset.panel) {
                e.preventDefault();
                e.stopPropagation();
                this.togglePanel(handleEl.dataset.panel);
                return;
            }

            // Section headers
            if (e.target.closest('.klite-section-header')) {
                this.handleSectionToggle(e);
                return;
            }

            // Tabs
            const tabEl = e.target.closest('.klite-tab');
            if (tabEl) {
                e.preventDefault();
                e.stopPropagation();
                const tab = tabEl.dataset.tab;
                this.switchTab('right', tab);
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
        },

        handleInput(e) {
            try {
                const actionEl = e.target?.closest?.('[data-action]');
                if (actionEl?.dataset?.action) {
                    this.handleAction(actionEl.dataset.action, e, actionEl);
                }
            } catch(_) {}
        },

        handleChange(e) {
            try {
                const actionEl = e.target?.closest?.('[data-action]');
                if (actionEl?.dataset?.action) {
                    this.handleAction(actionEl.dataset.action, e, actionEl);
                }
            } catch(_) {}
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
            const actionElement = e.target.closest('[data-action]');
            const action = actionElement?.dataset?.action;
            if (action) {
                this.handleAction(action, e, actionElement);
            }
        },

        handleAction(action, event, target = event.target) {
            this.log('state', `Handling action: ${action}`);

            switch (action) {
                case 'back': window.btn_back?.(); break;
                case 'forward': window.btn_redo?.(); break;
                case 'retry': window.btn_retry?.(); break;

                // Modal actions
                case 'confirm-unified-char-selection':
                    const mode = target.dataset.mode || target.closest('[data-mode]')?.dataset.mode;
                    if (mode) this.confirmUnifiedCharacterSelection(mode);
                    break;
                case 'close-unified-char-modal':
                    this.closeUnifiedCharacterModal();
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
                    // Try active panel
                    let handled = false;
                    const activeRightPanel = this.state.tabs.right;
                    const panel = KLITE_RPMod.panels[activeRightPanel];
                    if (panel?.actions?.[action]) {
                        panel.actions[action](event);
                        handled = true;
                    }
                    if (!handled) {
                        // Try all panels
                        for (const [name, p] of Object.entries(KLITE_RPMod.panels)) {
                            if (p?.actions?.[action]) {
                                p.actions[action](event);
                                handled = true;
                                break;
                            }
                        }
                    }
                    if (!handled) {
                        this.log('state', `Unhandled action: ${action}`);
                    }
            }
        },

        // =============================================
        // PANEL MANAGEMENT
        // =============================================
        switchTab(panel, tab) {
            this.log('panels', `Switching to ${tab}`);
            this.state.tabs.right = tab;
            this.saveState();

            document.querySelectorAll(`[data-panel="right"] .klite-tab`).forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tab);
            });

            this.loadPanel('right', tab);
        },

        loadPanel(side, name) {
            this.log('panels', `Loading panel: ${name}`);

            const container = document.getElementById(`content-${side}`);
            if (!container) {
                this.error(`Panel container not found: content-${side}`);
                return;
            }

            container.className = 'klite-content';

            const allowed = new Set(['CHARS','ROLES','TOOLS','SCENARIO','CONTEXT','IMAGE']);
            if (!allowed.has(name)) {
                this.log('panels', `Unknown panel: ${name}`);
                return;
            }

            const panel = KLITE_RPMod.panels[name];
            if (!panel) {
                this.error(`Panel not found: ${name}`);
                return;
            }

            try {
                if (panel.cleanup) panel.cleanup();
                container.innerHTML = panel.render();
                if (panel.init) {
                    setTimeout(async () => {
                        await panel.init();
                    }, 0);
                }
            } catch (error) {
                this.error(`Error loading panel ${name}:`, error);
            }
        },

        togglePanel(side) {
            const panel = document.getElementById(`panel-${side}`);
            if (!panel) return;

            this.state.collapsed[side] = !this.state.collapsed[side];
            panel.classList.toggle('collapsed');

            const handle = panel.querySelector('.klite-handle');
            if (handle) {
                handle.textContent = this.state.collapsed[side] ? '◀' : '▶';
            }

            this.updatePanelsOnlyOverlayPadding();
            this.saveState();
        },

        // =============================================
        // STATE MANAGEMENT
        // =============================================
        async saveState() {
            try {
                await this.saveToLiteStorage('rpmod_state', JSON.stringify(this.state));
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
                }
            } catch (e) {
                this.error('Failed to load state:', e);
            }
        },

        // =============================================
        // SAVE/LOAD BUNDLE
        // =============================================
        getSaveBundle() {
            try {
                return {
                    version: '1',
                    timestamp: new Date().toISOString(),
                    rp: this.panels.TOOLS ? {
                        rules: this.panels.TOOLS.rules || '',
                        selectedCharacter: this.panels.TOOLS.selectedCharacter || null,
                        characterEnabled: !!this.panels.TOOLS.characterEnabled,
                        selectedPersona: this.panels.TOOLS.selectedPersona || null,
                        personaEnabled: !!this.panels.TOOLS.personaEnabled,
                        quickActions: Array.isArray(this.panels.TOOLS.quickActions) ? [...this.panels.TOOLS.quickActions] : []
                    } : null,
                    group: this.panels.ROLES ? {
                        enabled: !!this.panels.ROLES.enabled,
                        participants: Array.isArray(this.panels.ROLES.activeChars)
                            ? this.panels.ROLES.activeChars.map(c => ({
                                id: c.id, name: c.name,
                                description: c.description || c.content || '',
                                personality: c.personality || '',
                                scenario: c.scenario || '',
                                image: c.image, avatar: c.avatar,
                                isCustom: !!c.isCustom
                            })) : [],
                        currentSpeaker: this.panels.ROLES.currentSpeaker || 0,
                        speakerMode: this.panels.ROLES.speakerMode || 'manual'
                    } : null,
                    ui: {
                        tabs: { ...this.state.tabs },
                        collapsed: { ...this.state.collapsed }
                    }
                };
            } catch (e) {
                this.error('getSaveBundle error:', e);
                return null;
            }
        },

        restoreFromSaveBundle(bundle) {
            if (!bundle) return;
            try {
                if (bundle.rp && this.panels.TOOLS) {
                    Object.assign(this.panels.TOOLS, {
                        rules: bundle.rp.rules || '',
                        selectedCharacter: bundle.rp.selectedCharacter || null,
                        characterEnabled: !!bundle.rp.characterEnabled,
                        selectedPersona: bundle.rp.selectedPersona || null,
                        personaEnabled: !!bundle.rp.personaEnabled
                    });
                    if (bundle.rp.quickActions) {
                        this.panels.TOOLS.quickActions = bundle.rp.quickActions;
                    }
                }
                if (bundle.group && this.panels.ROLES) {
                    this.panels.ROLES.enabled = !!bundle.group.enabled;
                    if (bundle.group.participants) {
                        this.panels.ROLES.activeChars = bundle.group.participants;
                    }
                    this.panels.ROLES.currentSpeaker = bundle.group.currentSpeaker || 0;
                    this.panels.ROLES.speakerMode = bundle.group.speakerMode || 'manual';
                }
                if (bundle.ui) {
                    if (bundle.ui.tabs) Object.assign(this.state.tabs, bundle.ui.tabs);
                    if (bundle.ui.collapsed) Object.assign(this.state.collapsed, bundle.ui.collapsed);
                }
                this.loadPanel('right', this.state.tabs.right);
            } catch (e) {
                this.error('restoreFromSaveBundle error:', e);
            }
        },

        // =============================================
        // HOOKS
        // =============================================
        setupHooks() {
            this.log('hooks', 'Setting up hooks...');

            // Hook submit
            if (window.submit_generation_button && !window.submit_generation_button.__rpmod_wrapped) {
                const orig = window.submit_generation_button;
                const self = this;
                window.submit_generation_button = function(...args) {
                    self.log('generation', 'Submit generation triggered');
                    if (self.injectCharacterContext) {
                        self.injectCharacterContext();
                    }
                    self.state.generating = true;
                    return orig.apply(window, args);
                };
                window.submit_generation_button.__rpmod_wrapped = true;
            }

            // Monitor generation state
            setInterval(() => {
                const isGenerating = window.pending_response_id && window.pending_response_id !== "";
                if (isGenerating !== this.state.generating) {
                    this.state.generating = isGenerating;
                }
            }, 250);
        },

        // =============================================
        // HOTKEYS
        // =============================================
        hotkeys: {
            'Ctrl+Enter': { action: 'submit_generation', description: 'Submit generation' },
            'Ctrl+Shift+R': { action: 'retry_generation', description: 'Retry generation' },
            'Escape': { action: 'abort_generation', description: 'Abort generation' },
            'Alt+1': { action: 'switch_panel_chars', description: 'Switch to CHARS panel' },
            'Alt+2': { action: 'switch_panel_roles', description: 'Switch to ROLES panel' },
            'Alt+3': { action: 'switch_panel_scenario', description: 'Switch to SCENARIO panel' },
            'Alt+4': { action: 'switch_panel_tools', description: 'Switch to TOOLS panel' },
            'Alt+P': { action: 'toggle_right_panel', description: 'Toggle right panel' }
        },

        initializeHotkeys() {
            document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
        },

        handleKeyDown(e) {
            const activeElement = document.activeElement;
            const isTyping = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            const hasModifiers = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
            if (isTyping && !hasModifiers) return;

            const hotkey = this.buildHotkeyString(e);
            const config = this.hotkeys[hotkey];
            if (config) {
                e.preventDefault();
                e.stopPropagation();
                this.executeHotkeyAction(config.action);
            }
        },

        buildHotkeyString(e) {
            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.shiftKey) parts.push('Shift');
            if (e.altKey) parts.push('Alt');
            if (e.metaKey) parts.push('Meta');
            let key = e.key;
            if (key === ' ') key = 'Space';
            else if (key.length === 1) key = key.toUpperCase();
            parts.push(key);
            return parts.join('+');
        },

        executeHotkeyAction(action) {
            switch (action) {
                case 'submit_generation':
                    window.submit_generation_button?.();
                    break;
                case 'retry_generation':
                    window.btn_retry?.();
                    break;
                case 'abort_generation':
                    window.abort_generation?.();
                    break;
                case 'switch_panel_chars':
                    this.switchTab('right', 'CHARS');
                    break;
                case 'switch_panel_roles':
                    this.switchTab('right', 'ROLES');
                    break;
                case 'switch_panel_scenario':
                    this.switchTab('right', 'SCENARIO');
                    break;
                case 'switch_panel_tools':
                    this.switchTab('right', 'TOOLS');
                    break;
                case 'toggle_right_panel':
                    this.togglePanel('right');
                    break;
            }
        },

        // =============================================
        // CHARACTER/AVATAR HELPERS
        // =============================================
        getBestCharacterAvatar(char) {
            try {
                if (!char) return null;
                return char.avatar || char.images?.avatar || char.image || null;
            } catch (_) { return null; }
        },

        // =============================================
        // UNIFIED CHARACTER MODAL
        // =============================================
        showUnifiedCharacterModal(mode) {
            // Implementation delegated to CHARS panel
            if (this.panels.CHARS?.showUnifiedModal) {
                this.panels.CHARS.showUnifiedModal(mode);
            }
        },

        closeUnifiedCharacterModal() {
            const modal = document.querySelector('.klite-modal');
            if (modal) modal.remove();
        },

        confirmUnifiedCharacterSelection(mode) {
            if (this.panels.CHARS?.confirmUnifiedSelection) {
                this.panels.CHARS.confirmUnifiedSelection(mode);
            }
        }
    });

    // =============================================
    // PANEL: TOOLS
    // =============================================
    KLITE_RPMod.panels.TOOLS = {
        rules: '',
        personaEnabled: false,
        characterEnabled: false,
        selectedPersona: null,
        selectedCharacter: null,
        quickActions: ['> Look Around', '> Search', '> Check Inventory', '> Rest', '> Continue'],

        render() {
            return `
                ${t.section('🔍 Context Analyzer', `
                    <div class="klite-token-bar-container">
                        <div class="klite-token-bar">
                            <div id="tools-memory-bar" class="klite-token-segment klite-memory-segment" title="Memory"></div>
                            <div id="tools-wi-bar" class="klite-token-segment klite-wi-segment" title="World Info"></div>
                            <div id="tools-story-bar" class="klite-token-segment klite-story-segment" title="Story"></div>
                            <div id="tools-anote-bar" class="klite-token-segment klite-anote-segment" title="Author's Note"></div>
                            <div id="tools-free-bar" class="klite-token-segment klite-free-segment" title="Free Space"></div>
                        </div>
                    </div>
                    <div class="klite-token-legend">
                        <div class="klite-token-legend-grid">
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-memory-segment"></div>
                                <span>Memory:</span>
                                <span id="tools-memory-tokens">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-wi-segment"></div>
                                <span>WI:</span>
                                <span id="tools-wi-tokens">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-story-segment"></div>
                                <span>Story:</span>
                                <span id="tools-story-tokens">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-anote-segment"></div>
                                <span>A.Note:</span>
                                <span id="tools-anote-tokens">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="klite-context-summary klite-mt">
                        <div><strong>Total:</strong> <span id="tools-total-context">0</span> / <span id="tools-max-context">8192</span> tokens</div>
                        <div class="klite-mt">${t.button('Calculate Context', '', 'calculate-context')}</div>
                    </div>
                `)}

                ${t.section('Quick Actions', `
                    <div style="display: grid; gap: 4px;">
                        ${this.quickActions.map((action, i) => `
                            <div class="klite-row">
                                <input id="adv-quick-${i}" type="text" value="${action}" class="klite-input" style="flex:1;">
                                <button class="klite-btn klite-btn-sm" data-action="quick-${i}">${i + 1}</button>
                            </div>
                        `).join('')}
                    </div>
                `)}

                ${t.section('Narrator Controls', `
                    <div class="klite-row">
                        ${t.select('narrator-style', [
                            { value: 'omniscient', text: 'Omniscient', selected: true },
                            { value: 'limited', text: 'Limited' },
                            { value: 'objective', text: 'Objective' },
                            { value: 'character', text: 'Character POV' }
                        ])}
                    </div>
                    <div class="klite-row klite-mt">
                        ${t.select('narrator-focus', [
                            { value: 'environment', text: 'Environment' },
                            { value: 'emotions', text: 'Emotions' },
                            { value: 'action', text: 'Actions' },
                            { value: 'dialogue', text: 'Dialogue' },
                            { value: 'mixed', text: 'Mixed', selected: true }
                        ])}
                    </div>
                    <div class="klite-mt">${t.button('🎬 Trigger Narrator', '', 'narrator')}</div>
                `)}

                ${t.section('🎲 Quick Dice', `
                    <div class="klite-dice-grid">
                        ${['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d =>
                            `<button class="klite-btn klite-btn-sm" data-action="roll-${d}">${d}</button>`
                        ).join('')}
                    </div>
                    <div class="klite-row">
                        ${t.input('tools-custom-dice', 'e.g., 2d6+3')}
                        ${t.button('🎲 Roll', '', 'roll-custom')}
                    </div>
                    <div id="tools-dice-result" class="klite-dice-result klite-mt"></div>
                `)}
            `;
        },

        async init() {
            this.initQuickActions();
            this.calculateContext();
        },

        initQuickActions() {
            this.quickActions.forEach((_, i) => {
                const input = document.getElementById(`adv-quick-${i}`);
                if (input) {
                    input.addEventListener('change', () => {
                        this.quickActions[i] = input.value;
                        this.saveQuickActions();
                    });
                }
            });
        },

        async saveQuickActions() {
            try {
                await KLITE_RPMod.saveToLiteStorage('rpmod_quick_actions', JSON.stringify(this.quickActions));
            } catch(_) {}
        },

        async loadQuickActions() {
            try {
                const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_quick_actions');
                if (saved) this.quickActions = JSON.parse(saved);
            } catch(_) {}
        },

        calculateContext() {
            try {
                const maxCtx = window.localsettings?.max_context_length || 8192;
                const memory = window.current_memory || '';
                const story = rpmod_concat_history_safe();
                const anote = window.current_anote || '';

                const memTokens = rpmod_count_tokens_safe(memory);
                const storyTokens = rpmod_count_tokens_safe(story);
                const anoteTokens = rpmod_count_tokens_safe(anote);
                const wiTokens = 0; // Simplified
                const total = memTokens + storyTokens + anoteTokens + wiTokens;
                const free = Math.max(0, maxCtx - total);

                // Update display
                const update = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                update('tools-memory-tokens', memTokens);
                update('tools-wi-tokens', wiTokens);
                update('tools-story-tokens', storyTokens);
                update('tools-anote-tokens', anoteTokens);
                update('tools-total-context', total);
                update('tools-max-context', maxCtx);

                // Update bars
                const pct = (v) => Math.min(100, (v / maxCtx) * 100);
                const bar = (id, p) => { const el = document.getElementById(id); if (el) el.style.width = p + '%'; };
                bar('tools-memory-bar', pct(memTokens));
                bar('tools-wi-bar', pct(wiTokens));
                bar('tools-story-bar', pct(storyTokens));
                bar('tools-anote-bar', pct(anoteTokens));
                bar('tools-free-bar', pct(free));
            } catch(e) {
                KLITE_RPMod.error('calculateContext error:', e);
            }
        },

        rollDice(notation) {
            try {
                const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
                if (!match) return { error: 'Invalid format' };
                const count = parseInt(match[1]) || 1;
                const sides = parseInt(match[2]);
                const mod = parseInt(match[3]) || 0;
                let total = 0;
                const rolls = [];
                for (let i = 0; i < count; i++) {
                    const roll = Math.floor(Math.random() * sides) + 1;
                    rolls.push(roll);
                    total += roll;
                }
                total += mod;
                return { rolls, total, notation: `${count}d${sides}${mod >= 0 ? '+' + mod : mod}` };
            } catch(e) {
                return { error: e.message };
            }
        },

        sendTextToEsolite(text) {
            try {
                const input = document.getElementById('input_text') || document.getElementById('corpo_cht_inp');
                if (input) {
                    input.value = text;
                    window.submit_generation_button?.();
                }
            } catch(_) {}
        },

        actions: {
            'calculate-context': () => KLITE_RPMod.panels.TOOLS.calculateContext(),
            'narrator': () => {
                const style = document.getElementById('narrator-style')?.value || 'omniscient';
                const focus = document.getElementById('narrator-focus')?.value || 'mixed';
                const prompt = `[System: As the ${style} narrator, focusing on ${focus}, describe the current scene.]`;
                KLITE_RPMod.panels.TOOLS.sendTextToEsolite(prompt);
            },
            'roll-custom': () => {
                const input = document.getElementById('tools-custom-dice');
                const result = KLITE_RPMod.panels.TOOLS.rollDice(input?.value || '1d20');
                const el = document.getElementById('tools-dice-result');
                if (el) el.innerHTML = result.error ? result.error : `<strong>${result.total}</strong> (${result.rolls.join(', ')})`;
            },
            ...Object.fromEntries(['d2','d4','d6','d8','d10','d12','d20','d100'].map(d => [
                `roll-${d}`,
                () => {
                    const result = KLITE_RPMod.panels.TOOLS.rollDice(`1${d}`);
                    const el = document.getElementById('tools-dice-result');
                    if (el) el.innerHTML = `<strong>${d}:</strong> ${result.total}`;
                }
            ])),
            ...Object.fromEntries([0,1,2,3,4].map(i => [
                `quick-${i}`,
                () => {
                    const action = KLITE_RPMod.panels.TOOLS.quickActions[i];
                    if (action) KLITE_RPMod.panels.TOOLS.sendTextToEsolite(action);
                }
            ]))
        }
    };

    // =============================================
    // PANEL: CONTEXT (Embedded in TOOLS but can be standalone)
    // =============================================
    KLITE_RPMod.panels.CONTEXT = {
        render() {
            return `
                ${t.section('📝 Memory', `
                    <div class="klite-small klite-muted klite-mb">Memory is injected at the start of context.</div>
                    ${t.textarea('context-memory', 'Enter memory/context here...', window.current_memory || '')}
                    <div class="klite-row klite-mt">
                        ${t.button('Save Memory', '', 'save-memory')}
                        ${t.button('Clear', 'danger', 'clear-memory')}
                    </div>
                `)}

                ${t.section("📖 Author's Note", `
                    <div class="klite-small klite-muted klite-mb">Injected a few paragraphs before the end.</div>
                    ${t.textarea('context-anote', "Enter author's note...", window.current_anote || '', 2)}
                    <div class="klite-row klite-mt">
                        ${t.button("Save A.Note", '', 'save-anote')}
                        ${t.button('Clear', 'danger', 'clear-anote')}
                    </div>
                `)}
            `;
        },

        init() {},

        actions: {
            'save-memory': () => {
                const val = document.getElementById('context-memory')?.value || '';
                if (window.localsettings) window.current_memory = val;
                try { document.getElementById('memorytext').value = val; } catch(_) {}
            },
            'clear-memory': () => {
                if (window.localsettings) window.current_memory = '';
                const el = document.getElementById('context-memory');
                if (el) el.value = '';
                try { document.getElementById('memorytext').value = ''; } catch(_) {}
            },
            'save-anote': () => {
                const val = document.getElementById('context-anote')?.value || '';
                if (window.localsettings) window.current_anote = val;
                try { document.getElementById('anotetext').value = val; } catch(_) {}
            },
            'clear-anote': () => {
                if (window.localsettings) window.current_anote = '';
                const el = document.getElementById('context-anote');
                if (el) el.value = '';
                try { document.getElementById('anotetext').value = ''; } catch(_) {}
            }
        }
    };

    // =============================================
    // PANEL: SCENARIO
    // =============================================
    KLITE_RPMod.panels.SCENARIO = {
        render() {
            return `
                ${t.section('📜 Scenario Setup', `
                    <div class="klite-mb">
                        <label class="klite-small">Scenario Name</label>
                        ${t.input('scenario-name', 'My Scenario')}
                    </div>
                    <div class="klite-mb">
                        <label class="klite-small">Description</label>
                        ${t.textarea('scenario-desc', 'Describe your scenario...', '', 4)}
                    </div>
                    <div class="klite-mb">
                        <label class="klite-small">First Message / Greeting</label>
                        ${t.textarea('scenario-greeting', 'The opening message...', '', 3)}
                    </div>
                    <div class="klite-row">
                        ${t.button('Apply Scenario', '', 'apply-scenario')}
                        ${t.button('Clear', 'danger', 'clear-scenario')}
                    </div>
                `)}

                ${t.section('🎭 Quick Scenario Templates', `
                    <div style="display: grid; gap: 4px;">
                        ${['Fantasy Adventure', 'Sci-Fi Exploration', 'Mystery Investigation', 'Slice of Life', 'Horror Survival'].map(s =>
                            `<button class="klite-btn klite-btn-sm" data-action="template-scenario" data-template="${s}">${s}</button>`
                        ).join('')}
                    </div>
                `, true)}
            `;
        },

        init() {},

        actions: {
            'apply-scenario': () => {
                const name = document.getElementById('scenario-name')?.value || '';
                const desc = document.getElementById('scenario-desc')?.value || '';
                const greeting = document.getElementById('scenario-greeting')?.value || '';

                // Apply to memory
                if (desc && window.localsettings) {
                    window.current_memory = `[Scenario: ${name}]\n${desc}\n\n${window.current_memory || ''}`;
                }

                // Apply greeting as first message
                if (greeting && window.gametext_arr) {
                    if (window.gametext_arr.length === 0) {
                        window.gametext_arr.push(greeting);
                        try { document.getElementById('gametext').innerHTML = greeting; } catch(_) {}
                    }
                }

                KLITE_RPMod.log('panels', `Applied scenario: ${name}`);
            },
            'clear-scenario': () => {
                ['scenario-name', 'scenario-desc', 'scenario-greeting'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
            },
            'template-scenario': (e) => {
                const template = e.target.dataset.template;
                const templates = {
                    'Fantasy Adventure': { desc: 'A world of magic and mythical creatures awaits...', greeting: 'You stand at the entrance of an ancient dungeon...' },
                    'Sci-Fi Exploration': { desc: 'The vast expanse of space holds infinite possibilities...', greeting: 'Your ship emerges from hyperspace near an uncharted planet...' },
                    'Mystery Investigation': { desc: 'A puzzling case that needs solving...', greeting: 'The crime scene is fresh, and clues await discovery...' },
                    'Slice of Life': { desc: 'Everyday moments in an ordinary world...', greeting: 'Another peaceful morning begins...' },
                    'Horror Survival': { desc: 'Something terrible lurks in the shadows...', greeting: 'The abandoned building creaks ominously as you enter...' }
                };
                const t = templates[template];
                if (t) {
                    const nameEl = document.getElementById('scenario-name');
                    const descEl = document.getElementById('scenario-desc');
                    const greetEl = document.getElementById('scenario-greeting');
                    if (nameEl) nameEl.value = template;
                    if (descEl) descEl.value = t.desc;
                    if (greetEl) greetEl.value = t.greeting;
                }
            }
        }
    };

    // =============================================
    // PANEL: ROLES (Group Chat)
    // =============================================
    KLITE_RPMod.panels.ROLES = {
        enabled: false,
        activeChars: [],
        currentSpeaker: 0,
        speakerMode: 'manual',

        render() {
            return `
                ${t.section('👥 Group Chat', `
                    <div class="klite-row">
                        ${t.checkbox('roles-enabled', 'Enable Group Chat', this.enabled)}
                    </div>
                    <div class="klite-small klite-muted klite-mb">Add multiple characters to participate in the conversation.</div>
                `)}

                ${t.section('🎭 Participants', `
                    <div id="roles-participant-list" class="klite-speaker-list">
                        ${this.activeChars.length === 0 ?
                            '<div class="klite-center klite-muted klite-small">No participants added</div>' :
                            this.activeChars.map((char, i) => `
                                <div class="klite-speaker-item ${i === this.currentSpeaker ? 'active' : ''}" data-index="${i}">
                                    <img class="klite-speaker-avatar" src="${KLITE_RPMod.getBestCharacterAvatar(char) || ''}" onerror="this.style.display='none'">
                                    <span class="klite-speaker-name">${char.name || 'Unknown'}</span>
                                    <button class="klite-btn klite-btn-sm danger" data-action="remove-participant" data-index="${i}">×</button>
                                </div>
                            `).join('')
                        }
                    </div>
                    <div class="klite-row klite-mt">
                        ${t.button('+ Add Character', '', 'add-participant')}
                        ${t.button('+ Custom', '', 'add-custom-participant')}
                    </div>
                `)}

                ${t.section('🎯 Speaker Control', `
                    <div class="klite-row">
                        ${t.select('speaker-mode', [
                            { value: 'manual', text: 'Manual Selection', selected: this.speakerMode === 'manual' },
                            { value: 'round-robin', text: 'Round Robin', selected: this.speakerMode === 'round-robin' },
                            { value: 'random', text: 'Random', selected: this.speakerMode === 'random' }
                        ])}
                    </div>
                    <div class="klite-row klite-mt">
                        ${t.button('◀ Prev', '', 'prev-speaker')}
                        ${t.button('Next ▶', '', 'next-speaker')}
                        ${t.button('🎲 Random', '', 'random-speaker')}
                    </div>
                `)}
            `;
        },

        init() {
            const enabledCb = document.getElementById('roles-enabled');
            if (enabledCb) {
                enabledCb.checked = this.enabled;
                enabledCb.addEventListener('change', () => {
                    this.enabled = enabledCb.checked;
                    this.save();
                });
            }

            const modeSel = document.getElementById('speaker-mode');
            if (modeSel) {
                modeSel.value = this.speakerMode;
                modeSel.addEventListener('change', () => {
                    this.speakerMode = modeSel.value;
                    this.save();
                });
            }

            // Click handlers for speaker selection
            document.querySelectorAll('.klite-speaker-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('[data-action]')) return;
                    const index = parseInt(item.dataset.index);
                    this.selectSpeaker(index);
                });
            });
        },

        selectSpeaker(index) {
            if (index >= 0 && index < this.activeChars.length) {
                this.currentSpeaker = index;
                this.refresh();
                this.save();
            }
        },

        refresh() {
            KLITE_RPMod.loadPanel('right', 'ROLES');
        },

        async save() {
            try {
                await KLITE_RPMod.saveToLiteStorage('rpmod_roles', JSON.stringify({
                    enabled: this.enabled,
                    activeChars: this.activeChars,
                    currentSpeaker: this.currentSpeaker,
                    speakerMode: this.speakerMode
                }));
            } catch(_) {}
        },

        async load() {
            try {
                const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_roles');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.enabled = data.enabled || false;
                    this.activeChars = data.activeChars || [];
                    this.currentSpeaker = data.currentSpeaker || 0;
                    this.speakerMode = data.speakerMode || 'manual';
                }
            } catch(_) {}
        },

        showCharacterModal() {
            KLITE_RPMod.showUnifiedCharacterModal('group');
        },

        closeCharacterModal() {
            KLITE_RPMod.closeUnifiedCharacterModal();
        },

        addParticipant(char) {
            if (!this.activeChars.some(c => c.id === char.id)) {
                this.activeChars.push(char);
                this.refresh();
                this.save();
            }
        },

        removeParticipant(index) {
            this.activeChars.splice(index, 1);
            if (this.currentSpeaker >= this.activeChars.length) {
                this.currentSpeaker = Math.max(0, this.activeChars.length - 1);
            }
            this.refresh();
            this.save();
        },

        triggerCurrentSpeaker() {
            if (!this.enabled || this.activeChars.length === 0) return;
            const char = this.activeChars[this.currentSpeaker];
            if (char) {
                // Inject character context
                const parts = [`[Speaking as: ${char.name}]`];
                if (char.description) parts.push(`Description: ${char.description}`);
                if (char.personality) parts.push(`Personality: ${char.personality}`);
                rpmod_prepend_preinjection(parts.join('\n'));

                // Advance speaker if auto mode
                if (this.speakerMode === 'round-robin') {
                    this.currentSpeaker = (this.currentSpeaker + 1) % this.activeChars.length;
                } else if (this.speakerMode === 'random') {
                    this.currentSpeaker = Math.floor(Math.random() * this.activeChars.length);
                }
                this.refresh();
            }
        },

        actions: {
            'add-participant': () => KLITE_RPMod.panels.ROLES.showCharacterModal(),
            'add-custom-participant': () => {
                const name = prompt('Enter character name:');
                if (name) {
                    KLITE_RPMod.panels.ROLES.addParticipant({
                        id: 'custom_' + Date.now(),
                        name: name,
                        isCustom: true
                    });
                }
            },
            'remove-participant': (e) => {
                const index = parseInt(e.target.dataset.index);
                KLITE_RPMod.panels.ROLES.removeParticipant(index);
            },
            'prev-speaker': () => {
                const roles = KLITE_RPMod.panels.ROLES;
                if (roles.activeChars.length > 0) {
                    roles.currentSpeaker = (roles.currentSpeaker - 1 + roles.activeChars.length) % roles.activeChars.length;
                    roles.refresh();
                    roles.save();
                }
            },
            'next-speaker': () => {
                const roles = KLITE_RPMod.panels.ROLES;
                if (roles.activeChars.length > 0) {
                    roles.currentSpeaker = (roles.currentSpeaker + 1) % roles.activeChars.length;
                    roles.refresh();
                    roles.save();
                }
            },
            'random-speaker': () => {
                const roles = KLITE_RPMod.panels.ROLES;
                if (roles.activeChars.length > 0) {
                    roles.currentSpeaker = Math.floor(Math.random() * roles.activeChars.length);
                    roles.refresh();
                    roles.save();
                }
            }
        }
    };

    // =============================================
    // PANEL: CHARS (Character Manager)
    // =============================================
    KLITE_RPMod.panels.CHARS = {
        characters: [],
        searchQuery: '',

        render() {
            const filtered = this.characters.filter(c =>
                !this.searchQuery ||
                (c.name || '').toLowerCase().includes(this.searchQuery.toLowerCase())
            );

            return `
                ${t.section('📚 Character Library', `
                    <div class="klite-row">
                        ${t.input('chars-search', 'Search characters...')}
                    </div>
                    <div class="klite-row klite-mt">
                        ${t.button('📥 Import', '', 'import-character')}
                        ${t.button('🔄 Refresh', '', 'refresh-characters')}
                    </div>
                `)}

                ${t.section('🎭 Characters', `
                    <div id="chars-list" style="max-height: 400px; overflow-y: auto;">
                        ${filtered.length === 0 ?
                            '<div class="klite-center klite-muted klite-small">No characters found</div>' :
                            filtered.map(char => `
                                <div class="klite-char-card" data-char-id="${char.id}">
                                    <img class="klite-char-avatar" src="${KLITE_RPMod.getBestCharacterAvatar(char) || ''}" onerror="this.style.display='none'">
                                    <div class="klite-char-info">
                                        <div class="klite-char-name">${char.name || 'Unknown'}</div>
                                        <div class="klite-char-desc">${(char.description || '').slice(0, 50)}...</div>
                                    </div>
                                    <button class="klite-btn klite-btn-sm" data-action="select-character" data-char-id="${char.id}">Use</button>
                                </div>
                            `).join('')
                        }
                    </div>
                `)}

                ${t.section('⚙️ Current Selection', `
                    <div id="chars-current-selection">
                        ${this.renderCurrentSelection()}
                    </div>
                `)}
            `;
        },

        renderCurrentSelection() {
            const tools = KLITE_RPMod.panels.TOOLS;
            const persona = tools?.selectedPersona;
            const character = tools?.selectedCharacter;

            return `
                <div class="klite-mb">
                    <strong>Persona (You):</strong>
                    ${persona ? `<span>${persona.name}</span>` : '<span class="klite-muted">None</span>'}
                    ${persona ? `<button class="klite-btn klite-btn-sm danger" data-action="clear-persona">×</button>` : ''}
                </div>
                <div>
                    <strong>Character (AI):</strong>
                    ${character ? `<span>${character.name}</span>` : '<span class="klite-muted">None</span>'}
                    ${character ? `<button class="klite-btn klite-btn-sm danger" data-action="clear-character">×</button>` : ''}
                </div>
            `;
        },

        async init() {
            await this.loadCharacters();

            // Search handler
            const search = document.getElementById('chars-search');
            if (search) {
                search.addEventListener('input', () => {
                    this.searchQuery = search.value;
                    this.refresh();
                });
            }

            // Character card click handlers
            document.querySelectorAll('.klite-char-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('[data-action]')) return;
                    const charId = card.dataset.charId;
                    this.showCharacterDetails(charId);
                });
            });
        },

        async loadCharacters() {
            try {
                // Try to load from host's character list
                if (window.characters && Array.isArray(window.characters)) {
                    this.characters = window.characters;
                    return;
                }

                // Try Esolite character manager
                if (typeof window.getAllCharactersFromDB === 'function') {
                    this.characters = await window.getAllCharactersFromDB();
                    return;
                }

                // Try local storage
                const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_characters');
                if (saved) {
                    this.characters = JSON.parse(saved);
                }
            } catch (e) {
                KLITE_RPMod.error('Failed to load characters:', e);
            }
        },

        refresh() {
            KLITE_RPMod.loadPanel('right', 'CHARS');
        },

        showCharacterDetails(charId) {
            const char = this.characters.find(c => c.id === charId);
            if (!char) return;

            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.innerHTML = `
                <div class="klite-modal-content" style="max-width: 500px;">
                    <div class="klite-modal-header">
                        <span class="klite-modal-title">${char.name || 'Character'}</span>
                        <button class="klite-modal-close" data-action="close-char-detail">×</button>
                    </div>
                    <div class="klite-modal-body">
                        <div class="klite-center klite-mb">
                            <img src="${KLITE_RPMod.getBestCharacterAvatar(char) || ''}" style="max-width: 150px; border-radius: 8px;" onerror="this.style.display='none'">
                        </div>
                        ${char.description ? `<div class="klite-mb"><strong>Description:</strong><br>${char.description}</div>` : ''}
                        ${char.personality ? `<div class="klite-mb"><strong>Personality:</strong><br>${char.personality}</div>` : ''}
                        ${char.scenario ? `<div class="klite-mb"><strong>Scenario:</strong><br>${char.scenario}</div>` : ''}
                    </div>
                    <div class="klite-modal-footer">
                        ${t.button('Use as Persona', '', 'use-as-persona')}
                        ${t.button('Use as Character', '', 'use-as-character')}
                        ${t.button('Add to Group', '', 'add-to-group')}
                    </div>
                </div>
            `;

            modal.querySelector('[data-action="close-char-detail"]').onclick = () => modal.remove();
            modal.querySelector('[data-action="use-as-persona"]').onclick = () => {
                this.selectAsPersona(char);
                modal.remove();
            };
            modal.querySelector('[data-action="use-as-character"]').onclick = () => {
                this.selectAsCharacter(char);
                modal.remove();
            };
            modal.querySelector('[data-action="add-to-group"]').onclick = () => {
                KLITE_RPMod.panels.ROLES.addParticipant(char);
                modal.remove();
            };

            document.body.appendChild(modal);
        },

        selectAsPersona(char) {
            const tools = KLITE_RPMod.panels.TOOLS;
            if (tools) {
                tools.selectedPersona = char;
                tools.personaEnabled = true;
                if (window.localsettings) {
                    window.localsettings.chatname = char.name;
                }
            }
            this.refresh();
        },

        selectAsCharacter(char) {
            const tools = KLITE_RPMod.panels.TOOLS;
            if (tools) {
                tools.selectedCharacter = char;
                tools.characterEnabled = true;
                if (window.localsettings) {
                    window.localsettings.chatopponent = char.name;
                }
            }
            this.refresh();
        },

        showUnifiedModal(mode) {
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.innerHTML = `
                <div class="klite-modal-content" style="max-width: 600px; max-height: 80vh;">
                    <div class="klite-modal-header">
                        <span class="klite-modal-title">Select Character</span>
                        <button class="klite-modal-close" data-action="close-unified-char-modal">×</button>
                    </div>
                    <div class="klite-modal-body" style="max-height: 60vh; overflow-y: auto;">
                        ${this.characters.map(char => `
                            <div class="klite-char-card" data-char-id="${char.id}" data-mode="${mode}">
                                <img class="klite-char-avatar" src="${KLITE_RPMod.getBestCharacterAvatar(char) || ''}" onerror="this.style.display='none'">
                                <div class="klite-char-info">
                                    <div class="klite-char-name">${char.name || 'Unknown'}</div>
                                    <div class="klite-char-desc">${(char.description || '').slice(0, 50)}...</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            modal.querySelectorAll('.klite-char-card').forEach(card => {
                card.addEventListener('click', () => {
                    const charId = card.dataset.charId;
                    const char = this.characters.find(c => c.id === charId);
                    if (char) {
                        if (mode === 'persona') {
                            this.selectAsPersona(char);
                        } else if (mode === 'character') {
                            this.selectAsCharacter(char);
                        } else if (mode === 'group') {
                            KLITE_RPMod.panels.ROLES.addParticipant(char);
                        }
                        modal.remove();
                    }
                });
            });

            document.body.appendChild(modal);
        },

        actions: {
            'import-character': () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,.png';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        if (file.name.endsWith('.json')) {
                            const text = await file.text();
                            const char = JSON.parse(text);
                            char.id = char.id || 'import_' + Date.now();
                            KLITE_RPMod.panels.CHARS.characters.push(char);
                            KLITE_RPMod.panels.CHARS.refresh();
                        }
                    } catch (e) {
                        KLITE_RPMod.error('Import failed:', e);
                    }
                };
                input.click();
            },
            'refresh-characters': () => {
                KLITE_RPMod.panels.CHARS.loadCharacters().then(() => {
                    KLITE_RPMod.panels.CHARS.refresh();
                });
            },
            'select-character': (e) => {
                const charId = e.target.dataset.charId;
                KLITE_RPMod.panels.CHARS.showCharacterDetails(charId);
            },
            'clear-persona': () => {
                const tools = KLITE_RPMod.panels.TOOLS;
                if (tools) {
                    tools.selectedPersona = null;
                    tools.personaEnabled = false;
                }
                KLITE_RPMod.panels.CHARS.refresh();
            },
            'clear-character': () => {
                const tools = KLITE_RPMod.panels.TOOLS;
                if (tools) {
                    tools.selectedCharacter = null;
                    tools.characterEnabled = false;
                }
                KLITE_RPMod.panels.CHARS.refresh();
            }
        }
    };

    // =============================================
    // BOOTSTRAP
    // =============================================
    (function bootstrap() {
        try {
            // Install save/load hooks
            if (!window._rpmod_orig_generate_savefile && typeof window.generate_savefile === 'function') {
                window._rpmod_orig_generate_savefile = window.generate_savefile;
                window.generate_savefile = function(save_images, export_settings, export_aesthetic_settings) {
                    const obj = window._rpmod_orig_generate_savefile.apply(this, arguments);
                    try {
                        const bundle = window.KLITE_RPMod.getSaveBundle?.();
                        if (bundle) obj.rpmod = bundle;
                    } catch(_) {}
                    return obj;
                };
            }

            if (!window._rpmod_orig_kai_json_load && typeof window.kai_json_load === 'function') {
                window._rpmod_orig_kai_json_load = window.kai_json_load;
                window.kai_json_load = function() {
                    try {
                        const storyobj = arguments[0];
                        if (storyobj?.rpmod) {
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
        } catch(e) {}

        // Wait for host to be ready
        function isReady() {
            return !!(document.getElementById('gametext') &&
                     (document.getElementById('input_text') || document.getElementById('corpo_cht_inp')));
        }

        let tries = 0;
        (function loop() {
            tries++;
            if (isReady() || tries > 30) {
                setTimeout(() => {
                    try { KLITE_RPMod.init(); } catch(e) { console.warn('[RPMod] init failed:', e); }
                }, 120);
                return;
            }
            setTimeout(loop, 250);
        })();
    })();

})();
