// =============================================================================
// KLITE RPmod — Start-up: waits for the host, runs KLITE_RPMod.init, storage fallbacks, re-applies hooks.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installBoot(S) {
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

        // Optional: advance speaker after user submit (when enabled in ROLES settings, non-manual)
        try {
            const wrapAdvance = () => {
                try {
                    const orig = window.submit_generation_button;
                    if (typeof orig === 'function' && !orig.__rpmod_advancespeaker_wrapped) {
                        window.submit_generation_button = function(...args) {
                            const result = orig.apply(this, args);
                            try {
                                setTimeout(() => {
                                    try {
                                        const roles = KLITE_RPMod?.panels?.ROLES;
                                        if (roles?.enabled && roles.speakerMode !== 'manual' && roles.autoResponses?.autoAdvanceOnUserSubmit) {
                                            roles.advanceSpeaker();
                                        }
                                    } catch(_) {}
                                }, 0);
                            } catch(_) {}
                            return result;
                        };
                        window.submit_generation_button.__rpmod_advancespeaker_wrapped = true;
                    }
                } catch(_) {}
            };
            // Wrap immediately if available, otherwise try again shortly
            wrapAdvance();
            setTimeout(wrapAdvance, 200);
        } catch(e) { /* ignore */ }

        // Also wrap chat_submit_generation to conditionally advance after user submit (non-manual modes)
        try {
            const wrapChatAdvance = () => {
                try {
                    const origChat = window.chat_submit_generation;
                    if (typeof origChat === 'function' && !origChat.__rpmod_advancespeaker_chat_wrapped) {
                        window.chat_submit_generation = function(...args) {
                            const result = origChat.apply(this, args);
                            try {
                                setTimeout(() => {
                                    try {
                                        const roles = KLITE_RPMod?.panels?.ROLES;
                                        if (roles?.enabled && roles.speakerMode !== 'manual' && roles.autoResponses?.autoAdvanceOnUserSubmit) {
                                            roles.advanceSpeaker();
                                        }
                                    } catch(_) {}
                                }, 0);
                            } catch(_) {}
                            return result;
                        };
                        window.chat_submit_generation.__rpmod_advancespeaker_chat_wrapped = true;
                    }
                } catch(_) {}
            };
            wrapChatAdvance();
            setTimeout(wrapChatAdvance, 200);
        } catch(_) {}

        // Ensure RPmod resets along with host "Reset ALL settings"
        try {
            // Helper: clear RPmod persistent keys
            KLITE_RPMod._clearAllPersistent = async function() {
                const keys = [
                    'rpmod_group_settings',
                    'rpmod_tools_settings',
                    'rpmod_playrp_settings',
                    'rpmod_rp_rules',
                    'rpmod_unified_embed',
                    'rpmod_unified_char_filters',
                    'rpmod_state',
                    'characters_v3',
                    'esolite_chars_panel_prefs',
                    'rpmod_auto_sender_settings',
                    'rpmod_adv_actions',
                    'rpmod_story_chapters'
                ];
                try {
                    await Promise.all(keys.map(k => KLITE_RPMod.saveToLiteStorage(k, null).catch(() => {})));
                } catch(_) {}
            };

            const wrapResetAll = () => {
                try {
                    const origReset = window.reset_all_settings;
                    if (typeof origReset === 'function' && !origReset.__rpmod_reset_wrapped) {
                        window.reset_all_settings = function(...args) {
                            try { KLITE_RPMod._clearAllPersistent?.(); } catch(_) {}
                            return origReset.apply(this, args);
                        };
                        window.reset_all_settings.__rpmod_reset_wrapped = true;
                    }
                } catch(_) {}
            };
            // Attempt immediate and delayed wrapping to handle load order
            wrapResetAll();
            setTimeout(wrapResetAll, 200);
            setTimeout(wrapResetAll, 1000);
        } catch(_) {}

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

}
