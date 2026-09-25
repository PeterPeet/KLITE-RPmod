// =============================================================================
// KLITE RPmod — Esolite compatibility at start-up: avatar globals and the theme-variable alias shim.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installHostCompat(S) {
    // Some forks (e.g., esolite) may expose read-only globals; set avatars defensively
    try { if (typeof window.niko_square === 'undefined') window.niko_square = ''; } catch(_) {}
    try { if (typeof window.human_square === 'undefined') window.human_square = ''; } catch(_) {}

    // =============================================
    // ESOLITE THEME-VARIABLE COMPAT SHIM
    // =============================================
    // Newer Esolite renamed its --theme_color_* CSS variables. The mod's CSS still
    // references the old names. When new Esolite is detected, alias the removed names
    // to their new equivalents on :root so existing var() lookups resolve correctly.
    // Aliases are written as var(...) so theme switches still flow through dynamically.
    (function aliasRemovedThemeVars(){
        try {
            const root = document.documentElement;
            if (!root) return;
            const cs = getComputedStyle(root);
            const has = (name) => !!cs.getPropertyValue(name).trim();
            // Detect new Esolite: presence of a new-only variable AND absence of an old-only one.
            const isNew = has('--theme_color_bg_popups') && !has('--theme_color_bg');
            if (!isNew) return;
            const aliases = {
                '--theme_color_bg':              'var(--theme_color_bg_popups)',
                '--theme_color_bg_dark':         'var(--theme_color_bg_chat)',
                '--theme_color_main':            'var(--theme_color_accent_bg)',
                '--theme_color_footer':          'var(--theme_color_accent_bg)',
                '--theme_color_text':            'var(--theme_color_fg)',
                '--theme_color_input_text':      'var(--theme_color_input_fg)',
                '--theme_color_highlight':       'var(--theme_color_accent_bg_highlight)',
                '--theme_color_button_bg':       'var(--theme_color_accent_bg)',
                '--theme_color_button_text':     'var(--theme_color_accent_fg)',
                '--theme_color_topbtn_highlight':'var(--theme_color_accent_bg_highlight)',
                '--theme_color_topmenu_text':    'var(--theme_color_fg)',
                '--theme_color_tabs':            'var(--theme_color_accent_bg)',
                '--theme_color_tabs_highlight':  'var(--theme_color_accent_bg_highlight)',
                '--theme_color_tabs_text':       'var(--theme_color_fg)',
                '--theme_color_glow_text':       'var(--theme_color_fg_highlight)',
                '--theme_color_placeholder_text':'var(--theme_color_fg_muted)',
                '--theme_color_disabled_bg':     'var(--theme_color_bg_muted)',
                '--theme_color_disabled_fg':     'var(--theme_color_fg_muted)'
            };
            for (const name in aliases) root.style.setProperty(name, aliases[name]);
        } catch(_) {}
    })();
}
