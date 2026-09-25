// =============================================================================
// KLITE RPmod — The panel CSS injected at init (bound to Esolite theme variables).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installStyles(S) {
    const STYLES_PANELS_ONLY = `
        :root {
            --bg: var(--theme_color_bg_outer, #182330);
            --bg2: var(--theme_color_bg_popups, var(--theme_color_bg, #263040));
            --bg3: var(--theme_color_bg_muted, var(--theme_color_bg_dark, #484d56));
            --text: var(--theme_color_fg, var(--theme_color_text, #d1d1d1));
            --glowtext: var(--theme_color_fg_highlight, var(--theme_color_glow_text, #94d7ff));
            --muted: var(--theme_color_fg_muted, var(--theme_color_placeholder_text, #9b9b9b));
            --border: var(--theme_color_border, #415577);
            --border-highlight: var(--theme_color_border_highlight, #596985);
            --accent: var(--theme_color_accent_bg_highlight, var(--theme_color_highlight, #596985));
            --primary: var(--theme_color_accent_bg, var(--theme_color_button_bg, #32496d));
            --primary-text: var(--theme_color_accent_fg, var(--theme_color_button_text, #d1d1d1));
            --danger: var(--theme_color_rpmod_danger, #d9534f);
            --success: var(--theme_color_rpmod_success, #5cb85c);
            --warning: var(--theme_color_rpmod_quest, #f0ad4e);
        }
        /* Wrapper that doesn't block host interactions */
        #klite-panels-only { position: fixed; inset: 0; pointer-events: none; z-index: 2147483638; }
        /* Ensure descendants accept events even if wrapper is non-interactive */
        #klite-panels-only * { pointer-events: auto; }
        /* Panels remain interactive and above host */
        .klite-panel { pointer-events: auto; position: fixed; background: var(--bg2); box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 2147483640; }
        /* v2: left panel removed */
        .klite-panel-right { right: 0; top: 0; bottom: 0; width: 350px; border-left: 1px solid var(--border); transition: transform 0.2s ease; }
        .klite-panel-right.collapsed { transform: translateX(350px); }
        .klite-handle { position: absolute; background: var(--bg2); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; z-index: 9; pointer-events: auto; }
        .klite-handle:hover { background: var(--bg3); color: var(--text); }
        .klite-panel-right .klite-handle { left: -15px; top: 50%; transform: translateY(-50%); width: 15px; height: 50px; border-radius: 5px 0 0 5px; }
        /* the panel's own tab bar (hidden inside the RPmod shell, which has its own tabs) */
        .klite-tabs { display: flex; gap: 3px; padding: 6px 8px; background: var(--theme_color_topmenu); border-bottom: 1px solid var(--border); }
        .klite-tab { flex: 1; padding: 6px 4px; border: 1px solid var(--border); border-radius: 5px; color: var(--primary-text); cursor: pointer; font-size: var(--theme_font_size_small, 9pt); font-weight: bold; text-align: center; background: var(--theme_color_topbtn, var(--primary)); line-height: 1.1; }
        .klite-tab:hover, .klite-tab.active { background: var(--theme_color_accent_bg_highlight); border-color: var(--border-highlight); color: var(--theme_color_accent_fg_highlight, var(--primary-text)); }

        .klite-content { overflow-y: auto; overflow-x: hidden; padding: 12px; max-height: calc(100vh - 60px); color: var(--text); font-family: var(--theme_font_family, inherit); font-size: var(--theme_font_size_medium, 10pt); }
        /* sections = Esolite popup title bar + body */
        .klite-section { margin-bottom: 12px; background: transparent; border: 1px solid var(--border); border-radius: 5px; overflow: hidden; }
        .klite-section-header { padding: 6px 10px; background: var(--primary); color: var(--primary-text); font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        .klite-section-header:hover { background: var(--theme_color_accent_bg_highlight); color: var(--theme_color_accent_fg_highlight, var(--primary-text)); }
        .klite-section.collapsed .klite-section-content { display: none; }
        .klite-section-content { padding: 10px; }
        /* Utilities */
        .klite-row { display: flex; gap: 4px; align-items: center; }
        .klite-buttons-left { display: flex; gap: 4px; justify-content: flex-start; flex-wrap: wrap; }
        .klite-buttons-center { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
        .klite-buttons-right { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
        .klite-buttons-spread { display: flex; gap: 4px; justify-content: space-between; flex-wrap: wrap; }
        /* Inputs = Esolite .form-control */
        .klite-input, .klite-textarea, .klite-select { width: 100%; padding: 4px 6px; background: var(--theme_color_input_bg); border: 1px solid var(--border); border-radius: 4px; color: var(--theme_color_input_fg, var(--theme_color_input_text)); font: inherit; font-size: var(--theme_font_size_small, 9pt); box-sizing: border-box; }
        .klite-textarea { resize: vertical; min-height: 80px; }
        .klite-input:focus, .klite-textarea:focus, .klite-select:focus { outline: none; border-color: var(--border-highlight); box-shadow: none; }
        .klite-input::placeholder, .klite-textarea::placeholder { color: var(--muted); }
        /* Buttons = Esolite .btn-primary */
        .klite-btn { padding: 4px 8px; background: var(--primary); border: 1px solid var(--border); border-radius: 5px; color: var(--primary-text); cursor: pointer; font: inherit; font-size: var(--theme_font_size_small, 9pt); line-height: 1.3; transition: background .15s, border-color .15s; }
        .klite-btn:hover { background: var(--theme_color_accent_bg_highlight); border-color: var(--border-highlight); color: var(--theme_color_accent_fg_highlight, var(--primary-text)); }
        .klite-btn.btn.btn-primary { background-color: var(--primary) !important; color: var(--primary-text) !important; border-color: var(--border) !important; }
        .klite-btn.danger { box-shadow: inset 3px 0 0 var(--danger); border-color: var(--danger); }
        .klite-btn.success { box-shadow: inset 3px 0 0 var(--success); border-color: var(--success); }
        .klite-btn.warning { box-shadow: inset 3px 0 0 var(--warning); border-color: var(--warning); }
        .klite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .klite-btn-sm { padding: 3px 6px; min-width: 26px; text-align: center; }
        .klite-btn-xs { padding: 2px 6px; min-height: 22px; }
        /* Modals = Esolite popups (dim layer, title bar, body, footer strip) */
        .klite-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); font-family: var(--theme_font_family, inherit); font-size: var(--theme_font_size_medium, 10pt); color: var(--text); }
        .klite-modal-content { display: flex; flex-direction: column; max-height: 88vh; max-width: min(800px, 94vw); min-width: min(360px, 94vw) !important; overflow: hidden; padding: 0 !important; background: var(--bg2) !important; border: 1px solid var(--border) !important; border-radius: 8px !important; box-shadow: 0 12px 36px rgba(0,0,0,0.4); color: var(--text); }
        .klite-modal-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; margin: 0; background: var(--primary); color: var(--primary-text); border: 0; }
        .klite-modal-header h2, .klite-modal-header h3 { margin: 0; font-size: var(--theme_font_size_large, 11pt); font-weight: bold; color: inherit; }
        .klite-modal-close { background: none; border: 1px solid transparent; color: inherit; font-size: 18px; cursor: pointer; padding: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 5px; }
        .klite-modal-close:hover { background: var(--theme_color_accent_bg_highlight); border-color: var(--border-highlight); }
        .klite-modal-body { flex: 1 1 auto; overflow-y: auto; padding: 12px; }
        .klite-modal-footer { display: flex; gap: 6px; justify-content: flex-end; padding: 8px 10px; margin: 0; border-top: 1px solid var(--border); background: var(--bg2); }
        .klite-modal-footer .klite-btn { flex: 1; }
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
    S.STYLES_PANELS_ONLY = STYLES_PANELS_ONLY;
}
