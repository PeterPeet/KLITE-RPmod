// =============================================================================
// KLITE RPmod — LiteAPI, RPmodHostAdapter and DOMUtil: helpers around the host (also on window).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installLiteApi(S) {
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


    };

    // Minimal CSS for panels-only mode (no full-screen overlay, no maincontent, no top panel)
    // Panels-only look = Esolite's own design language (same rules as the app shell,
    // src/shell/styles.js): every colour/font from Esolite's --theme_* variables, buttons
    // like .btn-primary, inputs like .form-control, modals like Esolite popups.
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
        setMode(opmode, subMode) {
            if (!window.localsettings) return false;
            window.localsettings.opmode = opmode;
            if (typeof subMode === 'number') window.localsettings.adventure_switch_mode = subMode;
            return true;
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




    };

    // =============================================
    // 5. GLOBAL API EXPOSURE
    // =============================================

    // Expose LiteAPI and DOMUtil globally for testing and external access
    window.LiteAPI = LiteAPI;
    window.DOMUtil = DOMUtil;

    S.LiteAPI = LiteAPI;
    S.DOMUtil = DOMUtil;
}
