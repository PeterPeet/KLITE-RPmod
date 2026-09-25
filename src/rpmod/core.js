// =============================================================================
// KLITE RPmod — window.KLITE_RPMod: state, init, hooks, saving (the `rpmod` story block), hotkeys, avatars,
// character selection, image generation panel, …
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installCore(S) {
    const { STYLES_PANELS_ONLY, t, LiteAPI } = S;
    // =============================================
    // 6. MAIN MODULE WITH INTEGRATED PANELS  
    // =============================================

    window.KLITE_RPMod = {
        // Populate Create Scenario panel fields (if present) from a character
        async populateScenarioFromCharacter(charObj) {
            try {
                if (!charObj) return;
                const safeGet = (...paths) => {
                    for (const p of paths) {
                        try {
                            const v = p();
                            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
                        } catch(_) {}
                    }
                    return '';
                };

                const name = safeGet(
                    () => charObj.name,
                    () => charObj.rawData?.data?.name,
                    () => charObj.data?.name
                ).trim();

                let scenario = safeGet(
                    () => charObj.scenario,
                    () => charObj.rawData?.data?.scenario,
                    () => charObj.data?.scenario
                ).trim();
                let example = safeGet(
                    () => charObj.mes_example,
                    () => charObj.rawData?.data?.mes_example,
                    () => charObj.data?.mes_example
                ).trim();
                let first = safeGet(
                    () => charObj.first_mes,
                    () => charObj.rawData?.data?.first_mes,
                    () => charObj.data?.first_mes
                ).trim();

                // If fields are missing, try to fetch full data through host if available
                if ((!scenario || !example || !first) && typeof window.getCharacterData === 'function') {
                    const targetName = name || charObj?.name || '';
                    try {
                        const data = await window.getCharacterData(targetName);
                        const d = data?.data || {};
                        if (!scenario) scenario = String(d.scenario || '').trim();
                        if (!example) example = String(d.mes_example || '').trim();
                        if (!first) first = String(d.first_mes || '').trim();
                    } catch(_) {}
                }

                // Update the Scenario panel textareas if available (always clear first)
                const scenEl = document.getElementById('scenario-text');
                const exEl = document.getElementById('scenario-example');
                const firstEl = document.getElementById('scenario-first-message');

                if (scenEl || exEl || firstEl) {
                    if (scenEl) scenEl.value = '';
                    if (exEl) exEl.value = '';
                    if (firstEl) firstEl.value = '';
                    if (scenEl && scenario) scenEl.value = scenario;
                    if (exEl && example) exEl.value = example;
                    if (firstEl && first) firstEl.value = first;
                }

                // Update persistent scenario state (reset then set)
                try {
                    KLITE_RPMod.state = KLITE_RPMod.state || {};
                    KLITE_RPMod.state.scenario = KLITE_RPMod.state.scenario || { scenario: '', example: '', first: '', sourceId: null, sourceName: '' };
                    const st = KLITE_RPMod.state.scenario;
                    st.scenario = '';
                    st.example = '';
                    st.first = '';
                    st.sourceId = null;
                    st.sourceName = '';
                    if (scenario) st.scenario = scenario;
                    if (example) st.example = example;
                    if (first) st.first = first;
                    st.sourceId = (charObj.id != null ? charObj.id : st.sourceId);
                    st.sourceName = name || st.sourceName;
                } catch(_) {}
                // If panel is active, re-render to reflect new state
                try {
                    const active = KLITE_RPMod.state?.tabs?.right;
                    if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO');
                } catch(_) {}
            } catch(_) { /* ignore */ }
        },
        // Map host image provider mode (number or string) to human-readable label
        getGenerationMode(mode) {
            try {
                // Prefer host select's current option text if available
                const sel = document.getElementById('generate_images_mode');
                if (sel && sel.options && sel.options.length) {
                    const val = (mode ?? window.localsettings?.generate_images_mode ?? sel.value);
                    const match = Array.from(sel.options).find(o => String(o.value) === String(val));
                    if (match) return (match.text || '').trim();
                }
            } catch(_) {}
            // Try to infer from host connectivity flags when settings UI hasn't been opened yet
            try {
                if (typeof window.a1111_is_connected === 'boolean' && window.a1111_is_connected) {
                    return 'KCPP / Forge / A1111';
                }
                if (typeof window.comfyui_is_connected === 'boolean' && window.comfyui_is_connected) {
                    return 'ComfyUI';
                }
            } catch(_) {}
            // Fallback mapping based on known Esolite values
            const map = {
                0: '[Disabled]',
                1: 'AI Horde',
                2: 'KCPP / Forge / A1111',
                3: 'OpenAI DALL-E',
                4: 'ComfyUI',
                5: 'Pollinations.ai'
            };
            const key = (typeof mode === 'string') ? parseInt(mode, 10) : (mode ?? window.localsettings?.generate_images_mode ?? 0);
            return map[key] || '[Disabled]';
        },
        state: {
            tabs: { left: 'TOOLS', right: 'CHARS' },
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
            inputScale2x: false,
            // Persistent storage for Scenario panel values
            scenario: {
                scenario: '',
                example: '',
                first: '',
                sourceId: null,
                sourceName: ''
            }
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
            status: false,
            storage: false,
            network: false,
            esolite: false,
            ui: false,
            narrator: false
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

        // Install debug instrumentation for Esolite bridges and globals
        installDebugHooks() {
            try {
                // Wrap fetch to trace generation/image calls (light redaction)
                if (window.fetch && !window.fetch.__rpmod_debug_wrapped) {
                    const origFetch = window.fetch.bind(window);
                    window.fetch = function(input, init){
                        try {
                            const url = (typeof input === 'string') ? input : (input?.url || '');
                            const method = (init?.method || 'GET').toUpperCase();
                            const body = init?.body;
                            const isGen = /kobold|oai|openrouter|mistral|cohere|api\.x\.ai|text\.pollinations|novelai|generate|completion|completions|chat/i.test(url);
                            const isImg = /image|img|sdapi|comfy|horde|pollinations|dalle/i.test(url);
                            const topic = isImg ? 'network' : (isGen ? 'network' : 'network');
                            const preview = (typeof body === 'string') ? (body.length>1000? (body.slice(0,1000)+"…") : body) : (body? '[object]':'');
                            KLITE_RPMod.log(topic, `fetch ${method} ${url}`, preview ? { bodyPreview: preview } : '');
                        } catch(_) {}
                        return origFetch(input, init);
                    };
                    window.fetch.__rpmod_debug_wrapped = true;
                }
            } catch(_) {}

            // Wrap IndexedDB helpers
            try {
                if (window.indexeddb_save && !window.indexeddb_save.__rpmod_debug_wrapped) {
                    const orig = window.indexeddb_save;
                    window.indexeddb_save = async function(key, value){
                        try { KLITE_RPMod.log('storage', `indexeddb_save '${key}' (${typeof value==='string'?value.length:0}B)`); } catch(_){}
                        return orig.apply(this, arguments);
                    };
                    window.indexeddb_save.__rpmod_debug_wrapped = true;
                }
            } catch(_) {}
            try {
                if (window.indexeddb_load && !window.indexeddb_load.__rpmod_debug_wrapped) {
                    const orig = window.indexeddb_load;
                    window.indexeddb_load = async function(key, def){
                        try { KLITE_RPMod.log('storage', `indexeddb_load '${key}'`); } catch(_){}
                        const res = await orig.apply(this, arguments);
                        try { KLITE_RPMod.log('storage', `indexeddb_load '${key}' -> ${res? (String(res).length+'B'):'null'}`); } catch(_){}
                        return res;
                    };
                    window.indexeddb_load.__rpmod_debug_wrapped = true;
                }
            } catch(_) {}

            // Proxy localsettings to observe assignments
            try {
                if (window.localsettings && !window._rpmod_debug_localsettings_proxy) {
                    const target = window.localsettings;
                    window.localsettings = new Proxy(target, {
                        set(obj, prop, value) {
                            try { KLITE_RPMod.log('esolite', `localsettings.${String(prop)} =`, value); } catch(_){}
                            obj[prop] = value; return true;
                        },
                        get(obj, prop) { return obj[prop]; }
                    });
                    window._rpmod_debug_localsettings_proxy = true;
                }
            } catch(_) {}

            // Watch important globals: current_memory, current_temp_memory, current_anote, pending injections
            function watchStringProp(obj, key, topic){
                try {
                    let _val = obj[key];
                    Object.defineProperty(obj, key, {
                        configurable: true,
                        get(){ return _val; },
                        set(v){
                            try {
                                const len = (typeof v==='string')? v.length : 0;
                                const prevLen = (typeof _val==='string')? _val.length : 0;
                                const preview = (typeof v==='string') ? (v.length>600? (v.slice(0,600)+'…') : v) : '';
                                KLITE_RPMod.log(topic, `${key} set (${prevLen} -> ${len} chars)`, preview);
                            } catch(_){}
                            _val = v;
                        }
                    });
                } catch(_) {}
            }
            watchStringProp(window, 'current_memory', 'storage');
            watchStringProp(window, 'current_temp_memory', 'storage');
            watchStringProp(window, 'current_anote', 'storage');
            watchStringProp(window, 'pending_context_preinjection', 'storage');
            watchStringProp(window, 'pending_context_postinjection', 'storage');

            // Wrap gametext_arr mutators
            try {
                if (Array.isArray(window.gametext_arr) && !window.gametext_arr._rpmod_debug_wrapped) {
                    const arr = window.gametext_arr;
                    ['push','unshift','splice','pop','shift'].forEach(fn => {
                        const orig = arr[fn].bind(arr);
                        arr[fn] = function(){
                            try { KLITE_RPMod.log('chat', `gametext_arr.${fn}(${arguments.length})`); } catch(_){}
                            return orig.apply(this, arguments);
                        };
                    });
                    arr._rpmod_debug_wrapped = true;
                }
            } catch(_) {}

            // Wrap Esolite submit path to trace data flow
            try {
                const wrapChatSubmit = () => {
                    const orig = window.chat_submit_generation;
                    if (typeof orig === 'function' && !orig.__rpmod_debug_wrapped) {
                        window.chat_submit_generation = function(){
                            try {
                                const corpo = document.getElementById('corpo_cht_inp');
                                const classic = document.getElementById('cht_inp');
                                KLITE_RPMod.log('chat', 'chat_submit_generation() transferring to input_text', { corpo: corpo?.value?.length||0, classic: classic?.value?.length||0 });
                            } catch(_){}
                            return orig.apply(this, arguments);
                        };
                        orig.__rpmod_debug_wrapped = true;
                        window.chat_submit_generation.__rpmod_debug_wrapped = true;
                    }
                };
                wrapChatSubmit(); setTimeout(wrapChatSubmit, 400);
            } catch(_) {}
            try {
                const wrapPrepare = () => {
                    const orig = window.prepare_submit_generation;
                    if (typeof orig === 'function' && !orig.__rpmod_debug_wrapped) {
                        window.prepare_submit_generation = function(){
                            try { KLITE_RPMod.log('chat', 'prepare_submit_generation()', { input_text_len: (document.getElementById('input_text')?.value||'').length }); } catch(_){}
                            return orig.apply(this, arguments);
                        };
                        orig.__rpmod_debug_wrapped = true;
                        window.prepare_submit_generation.__rpmod_debug_wrapped = true;
                    }
                };
                wrapPrepare(); setTimeout(wrapPrepare, 400);
            } catch(_) {}
            try {
                const wrapSubmit = () => {
                    const orig = window.submit_generation;
                    if (typeof orig === 'function' && !orig.__rpmod_debug_wrapped) {
                        window.submit_generation = function(senttext){
                            try { KLITE_RPMod.log('chat', 'submit_generation()', { senttext_len: (senttext||'').length, senttext_preview: (senttext||'').slice(0,600) }); } catch(_){}
                            return orig.apply(this, arguments);
                        };
                        orig.__rpmod_debug_wrapped = true;
                        window.submit_generation.__rpmod_debug_wrapped = true;
                    }
                };
                wrapSubmit(); setTimeout(wrapSubmit, 400);
            } catch(_) {}
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

                // Always install debug hooks early (also in panels-only mode)
                try { this.installDebugHooks(); this.log('hooks', 'Debug hooks installed'); } catch(_) {}

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
                    // Ensure valid default tab for right panel (fallback to CHARS if unknown)
                    try {
                        const allowedRight = new Set(['CHARS','ROLES','TOOLS','SCENARIO','CONTEXT','IMAGE']);
                        if (!allowedRight.has(this.state?.tabs?.right)) {
                            this.log('init', `Invalid or missing right tab '${this.state?.tabs?.right}', defaulting to CHARS`);
                            this.state.tabs.right = 'CHARS';
                        }
                    } catch(_) {}
                    // Ensure the minimal right-panel container exists before loading content
                    try { this.buildPanelsOnlyUI(); } catch(_) {}
                    this.loadPanel('right', this.state.tabs.right);
                    this.syncTabButtonStates();

                    // Install settings enhancer to add RPmod checkbox under Advanced
                    try { this.installSettingsEnhancer(); } catch(_){}
                    // Apply initial non-overlay state (if set)
                    try { this.updatePanelsOnlyOverlayPadding(); } catch(_){}
                    // Apply initial Corpo leftpanel visibility (if set)
                    try { this.updateCorpoLeftpanelVisibility(); } catch(_){}

                    // Initialize mobile detection and attach resize listener in panels-only mode
                    try { this.initializeMobileMode(); } catch(_){}
                    try { window.addEventListener('resize', () => { try { this.handleResize(); } catch(_){} }); } catch(_){}

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
                            try { KLITE_RPMod.log('esolite', `localsettings.${String(prop)} =`, value); } catch(_){}
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
                <div class="klite-panel klite-panel-right rpm-themed ${this.state.collapsed?.right ? 'collapsed' : ''}" id="panel-right">
                    <div class="klite-handle" data-panel="right">${this.state.collapsed?.right ? '◀' : '▶'}</div>
                    <div class="klite-tabs" data-panel="right">
                        ${[
                            { key: 'CHARS', label: 'MANAGE<br>CHARS' },
                            { key: 'ROLES', label: 'SELECT<br>ROLES' },
                            { key: 'SCENARIO', label: 'CREATE<br>SCENARIO' },
                            { key: 'TOOLS', label: 'USE<br>TOOLS' }
                        ].map(t =>
                            `<div class=\"klite-tab ${t.key === this.state.tabs?.right ? 'active' : ''}\" data-tab=\"${t.key}\">${t.label}</div>`
                        ).join('')}
                    </div>
                    <div class="klite-content" id="content-right"></div>
                </div>
            `;

            // Delegate events to the interactive panel element (wrapper uses pointer-events:none)
            const panelEl = wrapper.querySelector('#panel-right');
            if (panelEl) {
                const dispatchClick = (e) => {
                    try {
                        if (e.__kliteHandled) return;
                        const inPanel = e.target && e.target.closest && e.target.closest('#panel-right');
                        if (!inPanel) return;
                        e.__kliteHandled = true;
                        this.handleClick(e);
                    } catch(_) {}
                };
                const dispatchInput = (e) => {
                    try {
                        if (e.__kliteHandledInput) return;
                        const inPanel = e.target && e.target.closest && e.target.closest('#panel-right');
                        if (!inPanel) return;
                        e.__kliteHandledInput = true;
                        this.handleInput(e);
                    } catch(_) {}
                };
                const dispatchChange = (e) => {
                    try {
                        if (e.__kliteHandledChange) return;
                        const inPanel = e.target && e.target.closest && e.target.closest('#panel-right');
                        if (!inPanel) return;
                        e.__kliteHandledChange = true;
                        this.handleChange(e);
                    } catch(_) {}
                };
                // Bubble-level on panel element
                panelEl.addEventListener('click', dispatchClick);
                panelEl.addEventListener('input', dispatchInput);
                panelEl.addEventListener('change', dispatchChange);
                panelEl.addEventListener('dragover', e => this.handleDragOver(e));
                panelEl.addEventListener('dragleave', e => this.handleDragLeave(e));
                panelEl.addEventListener('drop', e => this.handleDrop(e));

                // Capture-level on document to survive upstream stopPropagation
                document.addEventListener('click', dispatchClick, true);
                document.addEventListener('input', dispatchInput, true);
                document.addEventListener('change', dispatchChange, true);
            }

            // In panels-only mode, also delegate modal clicks at document level
            document.addEventListener('click', e => {
                if (e.target.closest('.klite-modal')) {
                    this.handleModalClick(e);
                }
            }, true);

            // Note: Do not add a global click router for '#klite-panels-only' to avoid double-handling.

            // Ensure initial overlay padding state is applied
            try { this.updatePanelsOnlyOverlayPadding?.(); } catch(_) {}

            this.log('init', 'Panels-only UI built');
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

            // Section headers (handle before generic actions)
            if (e.target.closest('.klite-section-header')) {
                this.handleSectionToggle(e);
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

            // (Section headers handled earlier)
        },

        handleInput(e) {
            try {
                if (e.target && e.target.id === 'input') {
                    this.updateTokens();
                }
                // Route data-action inputs as actions for consistency
                const actionEl = e.target && e.target.closest && e.target.closest('[data-action]');
                if (actionEl && actionEl.dataset && actionEl.dataset.action) {
                    this.handleAction(actionEl.dataset.action, e, actionEl);
                }
            } catch(_) {}
        },

        handleChange(e) {
            try {
                // Provide minimal routing for elements explicitly marked as actions
                const actionEl = e.target && e.target.closest && e.target.closest('[data-action]');
                if (actionEl && actionEl.dataset && actionEl.dataset.action) {
                    this.handleAction(actionEl.dataset.action, e, actionEl);
                }
            } catch(_) {}
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

        // (duplicate handleInput/handleChange removed to prevent shadowing)

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
                    const containerEl = target.closest('[data-char-id]');
                    const selectionType = target.dataset.selectionType || target.closest('[data-selection-type]')?.dataset.selectionType;
                    if (containerEl && selectionType) this.toggleUnifiedCharacterSelection(containerEl, selectionType);
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
                // The RP core's options live in the "RPmod" tab of Esolite's Settings (src/settings)
                try { window.KLITE_RPMod_Settings?.registerBlock({ id: 'rp-panels', section: 'Debug & compatibility', order: 50, mount() {} }); } catch(_){}
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
                // The RPmod tab's block (src/settings) first; Esolite's Misc tab as fallback
                let pane = document.getElementById('rpmod-settings-rp-panels') || document.querySelector('#settingsmenuadvanced') || document.querySelector('#advanced') || document.querySelector('#settings-advanced');
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

                if (!pane) return;

                // If overlay block already exists, ensure debug settings are present and wired
                if (pane.querySelector('#rpmod-settings-wrapper')) {
                    let wrap = pane.querySelector('#rpmod-settings-wrapper');
                    if (!pane.querySelector('#rpmod-debug-settings')) {
                        const dbg = document.createElement('div');
                        dbg.id = 'rpmod-debug-settings';
                        dbg.className = 'rpm-themed klite-box rpm-muted rpm-mt';
                        dbg.innerHTML = `
                            <label class=\"rpm-check rpm-mb\">\n                                <input type=\"checkbox\" id=\"rpmod-debug-enabled\" ${this.debug ? 'checked' : ''}>\n                                <strong>Enable RPmod Debug Logging</strong>\n                            </label>\n                            <div class=\"rpm-wrap rpm-small klite-topics\">\n                                ${['chat','narrator','storage','network','esolite','panels','group','avatars','state','generation','hooks','ui'].map(topic => `\n                                    <label class=\\\"rpm-check\\\">\n                                        <input type=\\\"checkbox\\\" class=\\\"rpmod-debug-topic\\\" data-topic=\\\"${topic}\\\" ${this.debugLevels?.[topic] ? 'checked' : ''}>\n                                        <span>${topic}</span>\n                                    </label>\n                                `).join('')}\n                            </div>\n                            <div class=\"rpm-row rpm-mt\">\n                                <button id=\"rpmod-debug-all\" class=\"btn btn-primary btn-small\">All</button>\n                                <button id=\"rpmod-debug-none\" class=\"btn btn-primary btn-small\">None</button>\n                                <button id=\"rpmod-debug-recommended\" class=\"btn btn-primary btn-small\">Recommended</button>\n                            </div>\n                            <div id=\"rpmod-debug-active\" class=\"rpm-muted rpm-mt\"></div>`;
                        (wrap || pane).appendChild(dbg);

                        // Add restore-console checkbox row dynamically
                        try {
                            const btnRow = dbg.querySelector('#rpmod-debug-all')?.parentElement || null;
                            const row = document.createElement('div');
                            row.className = 'rpm-check rpm-mt';
                            const cb = document.createElement('input');
                            cb.type = 'checkbox';
                            cb.id = 'rpmod-debug-restore-console';
                            cb.checked = (localStorage.getItem('rpmod_enable_console_restore') === '1') || !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.enableConsoleRestore);
                            const sp = document.createElement('span');
                            sp.textContent = 'Restore console (iframe workaround)';
                            row.appendChild(cb); row.appendChild(sp);
                            if (btnRow && dbg.contains(btnRow)) dbg.insertBefore(row, btnRow); else dbg.appendChild(row);
                        } catch(_){}

                        // Wire debug controls (idempotent)
                        const topicsFromLevels = () => {
                            try {
                                const lv = this.debugLevels || {};
                                return Object.keys(lv).filter(k => lv[k]).join(',');
                            } catch(_) { return ''; }
                        };
                        const updateActiveLabel = () => {
                            try {
                                const lbl = (wrap || pane).querySelector('#rpmod-debug-active');
                                if (lbl) lbl.textContent = `Active topics: ${topicsFromLevels() || '(none)'}`;
                            } catch(_){}
                        };
                        const syncTopicsUIFromLevels = () => {
                            try {
                                (wrap || pane).querySelectorAll('.rpmod-debug-topic').forEach(cb => {
                                    const topic = cb.getAttribute('data-topic');
                                    cb.checked = !!(this.debugLevels && this.debugLevels[topic]);
                                });
                                const m = (wrap || pane).querySelector('#rpmod-debug-enabled');
                                if (m) m.checked = !!this.debug;
                                updateActiveLabel();
                            } catch(_){}
                        };
                        const persistLevelsToLocalStorage = () => {
                            try {
                                const enabledTopics = Object.keys(this.debugLevels||{}).filter(k => this.debugLevels[k]);
                                if (window.KLITE_RPDebug) {
                                    window.KLITE_RPDebug.setTopics(enabledTopics.join(','));
                                    window.KLITE_RPDebug.setTopicsOff('');
                                } else {
                                    localStorage.setItem('KLITE.debug.topics', enabledTopics.join(','));
                                    localStorage.removeItem('KLITE.debug.off');
                                }
                            } catch(_){}
                        };
                        const dbgMaster = (wrap || pane).querySelector('#rpmod-debug-enabled');
                        dbgMaster?.addEventListener('change', () => {
                            try {
                                this.debug = !!dbgMaster.checked;
                                if (window.KLITE_RPDebug) window.KLITE_RPDebug.setEnabled(this.debug);
                            } catch(_){}
                        });
                        const restoreCb = (wrap || pane).querySelector('#rpmod-debug-restore-console');
                        restoreCb?.addEventListener('change', () => {
                            try {
                                localStorage.setItem('rpmod_enable_console_restore', restoreCb.checked ? '1' : '0');
                                if (restoreCb.checked && window.KLITE_RPDebug && typeof KLITE_RPDebug.restoreConsole === 'function') {
                                    KLITE_RPDebug.restoreConsole();
                                }
                            } catch(_){}
                        });
                        (wrap || pane).querySelectorAll('.rpmod-debug-topic').forEach(cb => {
                            cb.addEventListener('change', () => {
                                try {
                                    const topic = cb.getAttribute('data-topic');
                                    if (!this.debugLevels) this.debugLevels = {};
                                    this.debugLevels[topic] = !!cb.checked;
                                    persistLevelsToLocalStorage();
                                    if (window.KLITE_RPDebug) window.KLITE_RPDebug.applyTopicsFromLocalStorage();
                                    updateActiveLabel();
                                } catch(_){}
                            });
                        });
                        (wrap || pane).querySelector('#rpmod-debug-all')?.addEventListener('click', () => {
                            try {
                                Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = true);
                                persistLevelsToLocalStorage();
                                if (window.KLITE_RPDebug) window.KLITE_RPDebug.all();
                                syncTopicsUIFromLevels();
                            } catch(_){}
                        });
                        (wrap || pane).querySelector('#rpmod-debug-none')?.addEventListener('click', () => {
                            try {
                                Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = false);
                                persistLevelsToLocalStorage();
                                if (window.KLITE_RPDebug) window.KLITE_RPDebug.none();
                                syncTopicsUIFromLevels();
                            } catch(_){}
                        });
                        (wrap || pane).querySelector('#rpmod-debug-recommended')?.addEventListener('click', () => {
                            try {
                                const rec = new Set(['chat','narrator','storage','network','esolite']);
                                Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = rec.has(k));
                                persistLevelsToLocalStorage();
                                if (window.KLITE_RPDebug) window.KLITE_RPDebug.on('chat,narrator,storage,network,esolite');
                                syncTopicsUIFromLevels();
                            } catch(_){}
                        });
                        updateActiveLabel();
                    }
                    // If overlay exists we’re done (avoid reattaching handlers)
                    return;
                }

                // Otherwise inject full block (overlay/hide + debug)
                const wrap = document.createElement('div');
                wrap.id = 'rpmod-settings-wrapper';
                wrap.className = 'rpm-themed klite-settings';
                // (The old "sidepanel overlays chat area" option is gone: the app shell owns layout.)
                wrap.innerHTML = `
                    <label class="rpm-check rpm-text-muted">
                        <input type="checkbox" id="rpmod-hide-corpo-leftpanel" ${this.getHideCorpoLeftpanelEnabled() ? 'checked' : ''}>
                        Hide Corpo-LeftPanel in Corpo-Theme
                    </label>
                    <div id="rpmod-debug-settings" class="klite-box rpm-muted rpm-mt">
                        <label class="rpm-check rpm-mb">
                            <input type="checkbox" id="rpmod-debug-enabled" ${this.debug ? 'checked' : ''}>
                            <strong>Enable RPmod Debug Logging</strong>
                        </label>
                        <div class="rpm-wrap rpm-small klite-topics">
                            ${['chat','narrator','storage','network','esolite','panels','group','avatars','state','generation','hooks','ui'].map(topic => `
                                <label class=\"rpm-check\">
                                    <input type=\"checkbox\" class=\"rpmod-debug-topic\" data-topic=\"${topic}\" ${this.debugLevels?.[topic] ? 'checked' : ''}>
                                    <span>${topic}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="rpm-row rpm-mt">
                            <button id="rpmod-debug-all" class="btn btn-primary btn-small">All</button>
                            <button id="rpmod-debug-none" class="btn btn-primary btn-small">None</button>
                            <button id="rpmod-debug-recommended" class="btn btn-primary btn-small">Recommended</button>
                        </div>
                        <div id="rpmod-debug-active" class="rpm-muted rpm-mt"></div>
                    </div>
                `;
                pane.appendChild(wrap);

                const cbCorpo = wrap.querySelector('#rpmod-hide-corpo-leftpanel');
                cbCorpo.addEventListener('change', () => {
                    this.setHideCorpoLeftpanelEnabled(cbCorpo.checked);
                    try { this.updateCorpoLeftpanelVisibility(); } catch(_){}
                    try {
                        // Persist if possible
                        if (typeof window.indexeddb_save === 'function') {
                            window.indexeddb_save('localsettings', window.localsettings);
                        }
                    } catch(_){}
                });

                // Add restore-console checkbox row dynamically (full injection path)
                try {
                    const dbgBox = wrap.querySelector('#rpmod-debug-settings');
                    const btnRow = wrap.querySelector('#rpmod-debug-all')?.parentElement || null;
                    if (dbgBox) {
                        const row = document.createElement('div');
                        row.className = 'rpm-check rpm-mt';
                        const cb2 = document.createElement('input');
                        cb2.type = 'checkbox';
                        cb2.id = 'rpmod-debug-restore-console';
                        cb2.checked = (localStorage.getItem('rpmod_enable_console_restore') === '1') || !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.enableConsoleRestore);
                        const sp2 = document.createElement('span');
                        sp2.textContent = 'Restore console (iframe workaround)';
                        row.appendChild(cb2); row.appendChild(sp2);
                        if (btnRow && dbgBox.contains(btnRow)) dbgBox.insertBefore(row, btnRow); else dbgBox.appendChild(row);
                    }
                } catch(_){}

                // Debug controls wiring
                const topicsFromLevels = () => {
                    try {
                        const lv = this.debugLevels || {};
                        return Object.keys(lv).filter(k => lv[k]).join(',');
                    } catch(_) { return ''; }
                };
                const updateActiveLabel = () => {
                    try {
                        const lbl = wrap.querySelector('#rpmod-debug-active');
                        if (lbl) lbl.textContent = `Active topics: ${topicsFromLevels() || '(none)'}`;
                    } catch(_){}
                };
                const syncTopicsUIFromLevels = () => {
                    try {
                        wrap.querySelectorAll('.rpmod-debug-topic').forEach(cb => {
                            const topic = cb.getAttribute('data-topic');
                            cb.checked = !!(this.debugLevels && this.debugLevels[topic]);
                        });
                        const m = wrap.querySelector('#rpmod-debug-enabled');
                        if (m) m.checked = !!this.debug;
                        updateActiveLabel();
                    } catch(_){}
                };
                const persistLevelsToLocalStorage = () => {
                    try {
                        const enabledTopics = Object.keys(this.debugLevels||{}).filter(k => this.debugLevels[k]);
                        if (window.KLITE_RPDebug) {
                            window.KLITE_RPDebug.setTopics(enabledTopics.join(','));
                            window.KLITE_RPDebug.setTopicsOff('');
                        } else {
                            localStorage.setItem('KLITE.debug.topics', enabledTopics.join(','));
                            localStorage.removeItem('KLITE.debug.off');
                        }
                    } catch(_){}
                };

                // Master toggle
                const dbgMaster = wrap.querySelector('#rpmod-debug-enabled');
                dbgMaster?.addEventListener('change', () => {
                    try {
                        this.debug = !!dbgMaster.checked;
                        if (window.KLITE_RPDebug) window.KLITE_RPDebug.setEnabled(this.debug);
                    } catch(_){}
                });
                const restoreCb = wrap.querySelector('#rpmod-debug-restore-console');
                restoreCb?.addEventListener('change', () => {
                    try {
                        localStorage.setItem('rpmod_enable_console_restore', restoreCb.checked ? '1' : '0');
                        if (restoreCb.checked && window.KLITE_RPDebug && typeof KLITE_RPDebug.restoreConsole === 'function') {
                            KLITE_RPDebug.restoreConsole();
                        }
                    } catch(_){}
                });

                // Topic toggles
                wrap.querySelectorAll('.rpmod-debug-topic').forEach(cb => {
                    cb.addEventListener('change', () => {
                        try {
                            const topic = cb.getAttribute('data-topic');
                            if (!this.debugLevels) this.debugLevels = {};
                            this.debugLevels[topic] = !!cb.checked;
                            persistLevelsToLocalStorage();
                            if (window.KLITE_RPDebug) window.KLITE_RPDebug.applyTopicsFromLocalStorage();
                            updateActiveLabel();
                        } catch(_){}
                    });
                });

                // Buttons
                wrap.querySelector('#rpmod-debug-all')?.addEventListener('click', () => {
                    try {
                        Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = true);
                        persistLevelsToLocalStorage();
                        if (window.KLITE_RPDebug) window.KLITE_RPDebug.all();
                        syncTopicsUIFromLevels();
                    } catch(_){}
                });
                wrap.querySelector('#rpmod-debug-none')?.addEventListener('click', () => {
                    try {
                        Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = false);
                        persistLevelsToLocalStorage();
                        if (window.KLITE_RPDebug) window.KLITE_RPDebug.none();
                        syncTopicsUIFromLevels();
                    } catch(_){}
                });
                wrap.querySelector('#rpmod-debug-recommended')?.addEventListener('click', () => {
                    try {
                        const rec = new Set(['chat','narrator','storage','network','esolite']);
                        Object.keys(this.debugLevels||{}).forEach(k => this.debugLevels[k] = rec.has(k));
                        persistLevelsToLocalStorage();
                        if (window.KLITE_RPDebug) window.KLITE_RPDebug.on('chat,narrator,storage,network,esolite');
                        syncTopicsUIFromLevels();
                    } catch(_){}
                });

                // Initial label
                updateActiveLabel();

                this.log('init', 'Injected RPmod checkboxes into Settings/Advanced');
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
        // Hide/show Corpo theme left panel (id="corpo_leftpanel")
        getHideCorpoLeftpanelEnabled() {
            try {
                return !!window.localsettings?.rpmod_hide_corpo_leftpanel;
            } catch(_) { return false; }
        },
        setHideCorpoLeftpanelEnabled(val) {
            try {
                if (window.localsettings) window.localsettings.rpmod_hide_corpo_leftpanel = !!val;
            } catch(_){}
        },
        updateCorpoLeftpanelVisibility() {
            try {
                const hide = this.getHideCorpoLeftpanelEnabled();
                const panel = document.getElementById('corpo_leftpanel');
                if (panel) panel.style.display = hide ? 'none' : '';
                // Also hide the open toggle button if present to avoid dangling control
                const openBtn = document.querySelector('.corpo_leftpanel_open');
                if (openBtn) openBtn.style.display = hide ? 'none' : '';
            } catch(_){}
        },
        updatePanelsOnlyOverlayPadding() {
            try {
                // The app shell (src/shell) owns the layout; never add inline margins then.
                if (window.KLITE_RPMod_Shell) {
                    const mc = document.getElementById('maincontainer');
                    if (mc && mc.style.marginRight === '350px') mc.style.marginRight = '';
                    document.body.classList.remove('klite-panels-nonoverlay-right');
                    return;
                }
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

            // Single-right-panel behavior: only alias left→right if no left container exists
            try {
                if (side === 'left') {
                    const leftContainer = document.getElementById('content-left');
                    if (!leftContainer) side = 'right';
                }
            } catch(_) { /* fallback to default behavior below */ }

            const container = document.getElementById(`content-${side}`);
            if (!container) {
                this.error(`loadPanel: container not found for side='${side}' (expected #content-${side})`);
                return;
            }

            // Reset panel-specific CSS classes
            container.className = 'klite-content';

            // In panels-only mode, only allow known right-panel tabs
            if (window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.panelsOnly && side === 'right') {
                // Keep CONTEXT/IMAGE loadable (hidden in UI) for compatibility; add SCENARIO
                const allowed = new Set(['CHARS','ROLES','TOOLS','SCENARIO','CONTEXT','IMAGE','MEMORY','NOTES','WI','TEXTDB']);
                if (!allowed.has(name)) {
                    this.log('panels', `Skipped loading unused panel '${name}' in panels-only mode`);
                    return;
                }
            }

            // Lazy-register IMAGE panel if requested and not yet present
            if (name === 'IMAGE' && !KLITE_RPMod.panels.IMAGE) {
                try {
                    KLITE_RPMod.panels.IMAGE = {
                        _syncTimer: null,
                        render() {
                            return `
                                ${t.section('🎨 Image Generation', `
                                    <div class="klite-image-status rpm-card rpm-mb">
                                        <div class="rpm-small rpm-mb"><strong>Image Generation Status</strong></div>
                                        <div class="rpm-small">
                                            <div><span class="rpm-text-muted">Provider:</span> <strong id="scene-mode-status">${KLITE_RPMod.escapeHtml(KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode))}</strong></div>
                                            <div><span class="rpm-text-muted">Model:</span> <strong id="scene-model-status">${KLITE_RPMod.escapeHtml((KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode) === 'AI Horde') ? (window.localsettings?.generate_images_model || 'Default') : '-')}</strong></div>
                                        </div>
                                    </div>
                                    <div class="klite-image-controls rpm-mb">
                                        <label class="rpm-label" for="scene-autogen">Auto-generate:</label>
                                        ${t.select('scene-autogen', [
                                            { value: '0', text: 'Off', selected: String(window.localsettings?.img_autogen_type ?? 0) === '0' },
                                            { value: '1', text: 'Basic', selected: String(window.localsettings?.img_autogen_type ?? 0) === '1' },
                                            { value: '2', text: 'Smart', selected: String(window.localsettings?.img_autogen_type ?? 0) === '2' }
                                        ])}
                                        <div class="rpm-mt">${t.checkbox('scene-detect', 'Detect ImgGen Instructions', !!(window.localsettings?.img_gen_from_instruct))}</div>
                                    </div>
                                    <div class="klite-image-generation-section">
                                        <div class="rpm-small rpm-mb"><strong>Scene & Characters</strong></div>
                                        <div class="rpm-grid2 rpm-mb">
                                            ${t.button('🏞️ Current Scene', 'rpm-sm', 'gen-scene')}
                                            ${t.button('🤖 AI Character', 'rpm-sm', 'gen-ai-portrait')}
                                            ${t.button('👤 Persona', 'rpm-sm', 'gen-user-portrait')}
                                            ${t.button('👥 Group Shot', 'rpm-sm', 'gen-group')}
                                        </div>
                                        <div class="rpm-small rpm-mb"><strong>Events & Actions</strong></div>
                                        <div class="rpm-grid2 rpm-mb">
                                            ${t.button('⚔️ Combat', 'rpm-sm', 'gen-combat')}
                                            ${t.button('💬 Dialogue', 'rpm-sm', 'gen-dialogue')}
                                            ${t.button('🎭 Plot', 'rpm-sm', 'gen-dramatic')}
                                            ${t.button('🌅 Atmosphere', 'rpm-sm', 'gen-atmosphere')}
                                        </div>
                                        <div class="rpm-small rpm-mb"><strong>Context-Based</strong></div>
                                        <div class="rpm-grid2">
                                            ${t.button('📝 Memory', 'rpm-sm', 'gen-memory')}
                                            ${t.button('📄 Last Message', 'rpm-sm', 'gen-last-message')}
                                            ${t.button('🔄 Recent Events', 'rpm-sm', 'gen-recent')}
                                            ${t.button('🎯 Custom', 'rpm-sm', 'gen-custom')}
                                        </div>
                                    </div>
                                `)}
                            `;
                        },
                        cleanup() {
                            if (this._syncTimer) {
                                clearInterval(this._syncTimer);
                                this._syncTimer = null;
                            }
                        },
                        init() {
                            // Wire up RPmod controls to host Esolite settings/controls
                            const sel = document.getElementById('scene-autogen');
                            const cb = document.getElementById('scene-detect');

                            const applyAutogenToHost = (val) => {
                                try { if (window.localsettings) window.localsettings.img_autogen_type = parseInt(val, 10) || 0; } catch(_) {}
                                try {
                                    const hostSel = document.getElementById('img_autogen_type');
                                    if (hostSel) hostSel.value = String(val);
                                } catch(_) {}
                            };
                            const applyDetectToHost = (checked) => {
                                try { if (window.localsettings) window.localsettings.img_gen_from_instruct = !!checked; } catch(_) {}
                                try {
                                    const hostCb = document.getElementById('img_gen_from_instruct');
                                    if (hostCb) hostCb.checked = !!checked;
                                } catch(_) {}
                            };

                            if (sel) {
                                // Initialize from host/localsettings and listen for changes
                                const hostSel = document.getElementById('img_autogen_type');
                                const initVal = hostSel?.value ?? String(window.localsettings?.img_autogen_type ?? '0');
                                sel.value = String(initVal);
                                sel.addEventListener('change', () => applyAutogenToHost(sel.value));
                            }
                            if (cb) {
                                const hostCb = document.getElementById('img_gen_from_instruct');
                                const initChecked = (hostCb?.checked ?? !!window.localsettings?.img_gen_from_instruct);
                                cb.checked = !!initChecked;
                                cb.addEventListener('change', () => applyDetectToHost(cb.checked));
                            }

                            // Periodically sync status and reflect external changes
                            const updateStatus = () => {
                                try {
                                    const modeTxt = KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode);
                                    let modelTxt = '-';
                                    if (modeTxt === 'AI Horde') {
                                        modelTxt = window.localsettings?.generate_images_model || 'Default';
                                        try {
                                            const modelSel = document.getElementById('generate_images_model');
                                            if (modelSel && modelSel.options && modelSel.options.length) {
                                                const opt = modelSel.options[modelSel.selectedIndex];
                                                modelTxt = (opt?.text || opt?.value || modelTxt || '').toString();
                                            }
                                        } catch(_) {}
                                    } else if (modeTxt === 'KCPP / Forge / A1111') {
                                        try {
                                            const localSel = document.getElementById('generate_images_local_model');
                                            if (localSel && localSel.options && localSel.options.length) {
                                                const opt = localSel.options[localSel.selectedIndex];
                                                modelTxt = (opt?.text || opt?.value || '-').toString();
                                            }
                                        } catch(_) {}
                                    } else if (modeTxt === 'ComfyUI') {
                                        try {
                                            const comfySel = document.getElementById('generate_images_comfy_model');
                                            if (comfySel && comfySel.options && comfySel.options.length) {
                                                const opt = comfySel.options[comfySel.selectedIndex];
                                                modelTxt = (opt?.text || opt?.value || '-').toString();
                                            }
                                        } catch(_) {}
                                    }
                                    const modeEl = document.getElementById('scene-mode-status');
                                    const modelEl = document.getElementById('scene-model-status');
                                    if (modeEl && modeEl.textContent !== modeTxt) modeEl.textContent = modeTxt;
                                    if (modelEl && modelEl.textContent !== modelTxt) modelEl.textContent = modelTxt;
                                } catch(_) {}
                                try {
                                    const hostSel = document.getElementById('img_autogen_type');
                                    const hostCb = document.getElementById('img_gen_from_instruct');
                                    if (sel && hostSel && sel.value !== String(hostSel.value)) sel.value = String(hostSel.value);
                                    if (cb && hostCb && cb.checked !== !!hostCb.checked) cb.checked = !!hostCb.checked;
                                } catch(_) {}
                            };
                            this._syncTimer = setInterval(updateStatus, 1000);
                            updateStatus();
                        },
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
                        // Ensure Smart Memory Writer state is reset if it was active
                        try {
                            const smw = this.panels?.CONTEXT;
                            if (smw && smw.memoryGenerationState?.active) {
                                this.log('generation', 'Smart Memory Writer: generation ended externally, cleaning up state');
                                smw.cleanupMemoryGeneration(false);
                            }
                        } catch (_) {}
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
                    display.innerHTML = html || '<p class="rpm-center rpm-muted">No content yet...</p>';
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
                connEl.classList.toggle('rpm-text-success', isConnected);
                connEl.classList.toggle('rpm-text-danger', !isConnected);

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
        // Safe in text and in quoted attribute values
        escapeHtml(text) {
            return (text == null ? '' : String(text))
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        // Render an image safely. Only auto-loads data: or blob: URLs.
        // For external http/https, shows a button to opt-in to load.
        safeImageHTML(url, alt = '', style = '') {
            try {
                const src = String(url || '');
                const eAlt = this.escapeHtml(alt || '');
                const eStyle = this.escapeHtml(style || '');
                if (!src) return '';
                if (/^data:image\//i.test(src) || /^blob:/i.test(src)) {
                    return `<img src="${src}" alt="${eAlt}" style="${eStyle}" loading="lazy" referrerpolicy="no-referrer">`;
                }
                const eUrl = this.escapeHtml(src);
                return `
                    <div class="klite-safe-image">
                        <div class="klite-image-blocked" style="${eStyle}">
                            <span>External image hidden</span>
                        </div>
                        <button class="btn btn-primary rpm-btn" data-action="rpmod-load-image" data-url="${eUrl}" data-alt="${eAlt}" data-style="${eStyle}">Load image</button>
                    </div>
                `;
            } catch(_) { return ''; }
        },

        // =============================================
        // UNIFIED CHARACTER SELECTION MODAL
        // =============================================

        showUnifiedCharacterModal(mode = 'multi-select', onSelectCallback = null) {
            // Create unified modal for character selection
            const modal = document.createElement('div');
            modal.className = 'klite-modal rpm-themed';

            const isMultiSelect = mode === 'multi-select';
            const title = isMultiSelect ? 'Select Characters for Group' : 'Select Character';
            const description = isMultiSelect ?
                'Choose characters from the library to add to your group chat.' :
                'Choose a character to apply to your conversation.';
            const buttonText = isMultiSelect ? 'Add Selected Characters' : 'Select Character';
            const selectionType = isMultiSelect ? 'checkbox' : 'radio';

            modal.innerHTML = `
                <div class="klite-modal-content">
                    <div class="klite-modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="klite-modal-body rpm-stack">
                        <p class="rpm-muted">${description}</p>
                        <input type="text" id="unified-char-search" class="form-control rpm-input" placeholder="Search characters...">
                        <div class="klite-filter-grid">
                            <select id="unified-char-tag-filter" class="form-control rpm-input">
                                <option value="">All Tags</option>
                            </select>
                            <select id="unified-char-rating-filter" class="form-control rpm-input">
                                <option value="">All Ratings</option>
                                <option value="5">★★★★★</option>
                                <option value="4">★★★★☆</option>
                                <option value="3">★★★☆☆</option>
                                <option value="2">★★☆☆☆</option>
                                <option value="1">★☆☆☆☆</option>
                            </select>
                            <select id="unified-char-talkativeness-filter" class="form-control rpm-input">
                                <option value="">All Talkativeness</option>
                                <option value="high">Very Talkative (80+)</option>
                                <option value="medium">Moderate (40-79)</option>
                                <option value="low">Quiet (10-39)</option>
                            </select>
                            <select id="unified-char-sort" class="form-control rpm-input">
                                <option value="name">Name</option>
                                <option value="rating">Rating</option>
                                <option value="talk">Talkativeness</option>
                                <option value="created">Import Date</option>
                            </select>
                        </div>
                        <label class="rpm-check">
                            <input type="checkbox" id="unified-include-wi">
                            <span>Include characters from World Info</span>
                        </label>
                        <div id="unified-character-selection-list" class="klite-pick-list">
                            <div class="rpm-empty">Loading characters...</div>
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="btn btn-primary rpm-btn" data-action="confirm-unified-char-selection" data-mode="${mode}">
                            ${buttonText}
                        </button>
                        <button class="btn btn-primary rpm-btn" data-action="close-unified-char-modal">
                            Cancel
                        </button>
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
                    <div class="rpm-empty">
                        No characters available. Import some characters first.
                    </div>
                `;
                return;
            }

            list.innerHTML = characters.map(char => {
                const avatar = char.thumbnail || char.image || '';
                const descriptionRaw = char.description || char.content || 'No description available';
                const description = KLITE_RPMod.escapeHtml(descriptionRaw.length > 100 ? descriptionRaw.substring(0, 100) + '...' : descriptionRaw);
                const tags = char.tags || [];
                const talkativeness = char.talkativeness || 50;
                const rating = char.rating || 0;
                const isWIChar = char.type === 'worldinfo';
                const charId = char.id || char.name;
                const safeTagsPreview = tags.length > 0 ? tags.slice(0, 3).map(KLITE_RPMod.escapeHtml).join(', ') + (tags.length > 3 ? '...' : '') : '';

                return `
                    <div class="klite-item-row klite-pick-row"
                         data-action="toggle-unified-char-selection" data-char-id="${KLITE_RPMod.escapeHtml(charId)}" data-selection-type="${selectionType}">
                        <input type="${selectionType}" name="unified-char-selection" value="${KLITE_RPMod.escapeHtml(charId)}" onclick="event.stopPropagation();">
                        <div class="rpm-avatar">
                            ${avatar ? KLITE_RPMod.safeImageHTML(avatar, char.name || '', 'width:100%;height:100%;object-fit:cover;display:block;')
                                     : `<span>${KLITE_RPMod.escapeHtml((char.name || '?').charAt(0))}</span>`}
                        </div>
                        <div class="rpm-grow">
                            <div>
                                <strong>${KLITE_RPMod.escapeHtml(char.name || '')}</strong>
                                ${isWIChar ? '<span class="rpm-tag">WI</span>' : ''}
                            </div>
                            <div class="rpm-muted klite-pick-desc">${description}</div>
                            <div class="rpm-muted rpm-wrap">
                                ${!isWIChar ? `<span>Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>` : ''}
                                <span>Talkativeness: ${KLITE_RPMod.escapeHtml(talkativeness)}</span>
                                ${tags.length > 0 ? `<span>Tags: ${safeTagsPreview}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        toggleUnifiedCharacterSelection(containerEl, selectionType) {
            try {
                const container = containerEl.closest('[data-char-id]');
                if (!container) return;
                const input = container.querySelector('input[type="radio"], input[type="checkbox"]');
                if (!input) return;
                if (selectionType === 'radio') {
                    input.checked = true;
                } else {
                    input.checked = !input.checked;
                }
            } catch(_) {}
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

                // Add to ROLES panel without removing existing (and preserve customs)
                if (KLITE_RPMod.panels.ROLES) {
                    const roles = KLITE_RPMod.panels.ROLES;
                    const wasEmpty = roles.activeChars.length === 0;
                    const existing = roles.activeChars.slice();
                    const existingKeys = new Set(existing.map(c => (c.id != null ? `id:${c.id}` : `name:${c.name}`)));
                    const addedChars = [];

                    let added = 0;
                    checkboxes.forEach(cb => {
                        const charId = cb.value;
                        const char = this.findCharacterForUnifiedModal(charId);
                        if (!char) return;
                        const key = (char.id != null ? `id:${char.id}` : `name:${char.name}`);
                        if (!existingKeys.has(key)) {
                            const entry = { ...char, isCustom: false };
                            existing.push(entry);
                            existingKeys.add(key);
                            added++;
                            addedChars.push(entry);
                        }
                    });

                    roles.activeChars = existing;
                    try { roles.saveSettings?.(); } catch(_) {}
                    roles.refresh();
                    // If Scenario panel is visible, refresh to reflect first group character
                    try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}

                    // Update group avatars to include newly added entries
                    try { KLITE_RPMod.updateGroupAvatars?.(); } catch(_) {}

                    // Prefill Scenario from first added character if group was previously empty
                    if (added > 0 && wasEmpty) {
                        try { if (addedChars[0]) KLITE_RPMod.populateScenarioFromCharacter(addedChars[0]); } catch(_) {}
                    }
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
                // Prefill Scenario panel from this character as part of selection
                try { KLITE_RPMod.populateScenarioFromCharacter(char); } catch(_) {}
                // Apply character extras (avatar/name, context)
                KLITE_RPMod.panels.TOOLS.applyCharacterData(char);

                // Refresh current right panel (TOOLS/ROLES/SCENARIO) without switching
                const active = KLITE_RPMod.state?.tabs?.right;
                if (active === 'TOOLS' || active === 'ROLES' || active === 'SCENARIO') KLITE_RPMod.loadPanel('right', active);
                // Character application confirmed by UI state change
            }
        },

        // =============================================
    // CHARACTER HELPER METHODS
    // =============================================

        // Best-effort hook to update the user's avatar in Esolite (aesthetic UI)
        updateUserAvatar(urlOrNull) {
            try {
                // Ensure settings object exists
                window.aestheticInstructUISettings = window.aestheticInstructUISettings || {};
                // Assign portrait for "you"
                if (urlOrNull) {
                    window.aestheticInstructUISettings.you_portrait = urlOrNull;
                } else {
                    window.aestheticInstructUISettings.you_portrait = null; // reset to default
                }
                // Some hosts update styles dynamically; attempt a lightweight refresh where possible
                try { if (typeof window.updateUIFromData === 'function') window.updateUIFromData(); } catch(_) {}
            } catch (_) { /* swallow */ }
        },

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
                const size = (typeof data === 'string') ? data.length : 0;
                await LiteAPI.storage.save(key, data);
                this.log('storage', `Storage saved: ${key} (${size}B)`);
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
                const size = (typeof result === 'string') ? result.length : 0;
                this.log('storage', `Storage loaded: ${key} (${size}B)`);
                return result;
            } catch (error) {
                // Key doesn't exist yet - this is expected for first-time users
                this.log('storage', `Storage key does not exist yet: ${key}`);
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


    };
}
