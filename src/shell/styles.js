// Shell design tokens + layout CSS.
//
// Tokens bind to Esolite's theme variables (1.35 names first, older names as fallback,
// then a neutral dark default for hosts without themes), so the shell follows whatever
// theme the user picked in Esolite. Every RPmod UI should use these --rpm-* tokens.
//
// Stacking: the whole shell lives in one fixed layer at z-index 2 — below Esolite's own
// popups (.popupcontainer, z-index 3), so host dialogs are never covered.

export const SHELL_CSS = `
#rpm-shell {
    --rpm-bg: var(--theme_color_bg_popups, var(--theme_color_bg, #242424));
    --rpm-bg-alt: var(--theme_color_bg_muted, var(--theme_color_bg_dark, #2e2e2e));
    --rpm-bg-outer: var(--theme_color_bg_outer, #1b1b1b);
    --rpm-fg: var(--theme_color_fg, var(--theme_color_text, #e0e0e0));
    --rpm-fg-muted: var(--theme_color_fg_muted, var(--theme_color_placeholder_text, #9a9a9a));
    --rpm-fg-hi: var(--theme_color_fg_highlight, #8ab4d8);
    --rpm-border: var(--theme_color_border, #3a3a3a);
    --rpm-border-hi: var(--theme_color_border_highlight, #5a8ac6);
    --rpm-accent-bg: var(--theme_color_accent_bg, var(--theme_color_button_bg, #2e2e2e));
    --rpm-accent-bg-hi: var(--theme_color_accent_bg_highlight, var(--theme_color_highlight, #3d5a78));
    --rpm-accent-fg: var(--theme_color_accent_fg, var(--theme_color_button_text, #e0e0e0));
    --rpm-input-bg: var(--theme_color_input_bg, #1e1e1e);
    --rpm-input-fg: var(--theme_color_input_fg, var(--theme_color_input_text, #e0e0e0));
    --rpm-topbar: var(--theme_color_topmenu, #1b1b1b);
    --rpm-danger: #c9534f;
    --rpm-success: #4f9d62;
    --rpm-warning: #d19a3a;
    --rpm-quest: #e8c33a;
    --rpm-s1: 4px; --rpm-s2: 8px; --rpm-s3: 12px; --rpm-s4: 16px;
    --rpm-radius: 6px;
    --rpm-fs-xs: 10px; --rpm-fs-sm: 11px; --rpm-fs: 13px; --rpm-fs-lg: 15px;
    --rpm-shadow: 0 6px 24px rgba(0,0,0,.45);

    position: fixed; inset: 0; z-index: 2; pointer-events: none;
    font-family: inherit; font-size: var(--rpm-fs); color: var(--rpm-fg);
}
#rpm-shell *, #rpm-shell *::before, #rpm-shell *::after { box-sizing: border-box; }
#rpm-shell button { font: inherit; }

/* ---- docks ---- */
.rpm-dock {
    position: absolute; top: 0; bottom: 0; pointer-events: auto;
    display: flex; flex-direction: column; background: var(--rpm-bg); color: var(--rpm-fg);
    transition: transform .18s ease;
}
.rpm-dock-left { left: 0; width: var(--rpm-left-w, 260px); border-right: 1px solid var(--rpm-border); }
.rpm-dock-right { right: 0; width: var(--rpm-right-w, 350px); border-left: 1px solid var(--rpm-border); }
.rpm-dock { max-width: calc(100vw - 24px); }   /* small phones: drawer never wider than the screen */
.rpm-dock-left.rpm-closed { transform: translateX(-100%); }
.rpm-dock-right.rpm-closed { transform: translateX(100%); }
.rpm-dock.rpm-closed { visibility: hidden; }
#rpm-shell.rpm-overlay .rpm-dock { box-shadow: var(--rpm-shadow); }

.rpm-dock-head {
    display: flex; align-items: center; gap: var(--rpm-s2); flex: 0 0 auto;
    padding: var(--rpm-s2) var(--rpm-s2) var(--rpm-s2) var(--rpm-s3);
    background: var(--rpm-topbar); border-bottom: 1px solid var(--rpm-border);
    font-size: var(--rpm-fs-sm); font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    color: var(--rpm-fg-muted);
}
.rpm-dock-head .rpm-title { flex: 1; }
.rpm-iconbtn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; padding: 0; border-radius: var(--rpm-radius);
    border: 1px solid transparent; background: transparent; color: var(--rpm-fg-muted); cursor: pointer;
}
.rpm-iconbtn:hover { color: var(--rpm-fg); border-color: var(--rpm-border); }
.rpm-iconbtn:focus-visible, .rpm-tab:focus-visible, .rpm-section-head:focus-visible { outline: 2px solid var(--rpm-border-hi); outline-offset: 1px; }

/* right dock: tab bar + one body per view (kept mounted) */
.rpm-tabs { display: flex; gap: var(--rpm-s1); flex: 1; overflow-x: auto; }
.rpm-tab {
    flex: 0 0 auto; padding: 5px 10px; border-radius: var(--rpm-radius); cursor: pointer;
    border: 1px solid var(--rpm-border); background: var(--rpm-accent-bg); color: var(--rpm-accent-fg);
    font-size: var(--rpm-fs-sm); font-weight: 600; text-transform: none; letter-spacing: 0;
}
.rpm-tab:hover { border-color: var(--rpm-border-hi); }
.rpm-tab[aria-selected="true"] { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); }
.rpm-dock-body { flex: 1 1 auto; min-height: 0; overflow: auto; }
.rpm-view { display: none; min-height: 100%; }
.rpm-view.rpm-active { display: block; }
.rpm-view-pad { padding: var(--rpm-s3); }

/* left dock: stacked collapsible sections */
.rpm-section { border-bottom: 1px solid var(--rpm-border); }
.rpm-section-head {
    display: flex; align-items: center; gap: var(--rpm-s2); width: 100%;
    padding: var(--rpm-s2) var(--rpm-s3); background: var(--rpm-bg-alt); color: var(--rpm-fg);
    border: 0; cursor: pointer; text-align: left; font-size: var(--rpm-fs-sm); font-weight: 600;
}
.rpm-section-head svg { transition: transform .15s; }
.rpm-section.rpm-collapsed .rpm-section-head svg { transform: rotate(-90deg); }
.rpm-section.rpm-collapsed .rpm-section-body { display: none; }
.rpm-section-body { padding: var(--rpm-s3); }

/* edge handles to reopen a closed dock */
.rpm-handle {
    position: absolute; top: 50%; transform: translateY(-50%); pointer-events: auto;
    width: 16px; height: 56px; display: flex; align-items: center; justify-content: center;
    background: var(--rpm-bg); color: var(--rpm-fg-muted); border: 1px solid var(--rpm-border); cursor: pointer; padding: 0;
}
.rpm-handle:hover { color: var(--rpm-fg); }
.rpm-handle-left { left: 0; border-left: 0; border-radius: 0 var(--rpm-radius) var(--rpm-radius) 0; }
.rpm-handle-right { right: 0; border-right: 0; border-radius: var(--rpm-radius) 0 0 var(--rpm-radius); }
.rpm-handle[hidden] { display: none; }

/* ---- floating windows ---- */
.rpm-windows { position: absolute; inset: 0; pointer-events: none; }
.rpm-window {
    position: absolute; pointer-events: auto; display: flex; flex-direction: column;
    background: var(--rpm-bg); color: var(--rpm-fg); border: 1px solid var(--rpm-border);
    border-radius: var(--rpm-radius); box-shadow: var(--rpm-shadow); overflow: hidden;
}
.rpm-window.rpm-focused { border-color: var(--rpm-border-hi); }
.rpm-window-head {
    display: flex; align-items: center; gap: var(--rpm-s2); flex: 0 0 auto; cursor: move; user-select: none;
    padding: var(--rpm-s1) var(--rpm-s1) var(--rpm-s1) var(--rpm-s3);
    background: var(--rpm-topbar); border-bottom: 1px solid var(--rpm-border); touch-action: none;
}
.rpm-window-title { flex: 1; font-size: var(--rpm-fs-sm); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rpm-window-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--rpm-s3); }
.rpm-window-grip {
    position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; touch-action: none;
    background: linear-gradient(135deg, transparent 50%, var(--rpm-border) 50%, var(--rpm-border) 60%, transparent 60%, transparent 70%, var(--rpm-border) 70%, var(--rpm-border) 80%, transparent 80%);
}
/* phones: windows fill the screen, no drag/resize */
#rpm-shell.rpm-compact .rpm-window { left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0; }
#rpm-shell.rpm-compact .rpm-window-head { cursor: default; }
#rpm-shell.rpm-compact .rpm-window-grip { display: none; }

/* ---- shared small controls for views ---- */
.rpm-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--rpm-s1);
    padding: 5px 10px; border-radius: var(--rpm-radius); cursor: pointer;
    border: 1px solid var(--rpm-border); background: var(--rpm-accent-bg); color: var(--rpm-accent-fg); font-size: var(--rpm-fs-sm);
}
.rpm-btn:hover { background: var(--rpm-accent-bg-hi); }
.rpm-muted { color: var(--rpm-fg-muted); font-size: var(--rpm-fs-sm); }

/* ---- Esolite layout: docked mode pushes the host column in ---- */
body.rpm-docked #maincontainer {
    margin-left: var(--rpm-push-left, 0px) !important;
    margin-right: var(--rpm-push-right, 0px) !important;
    transition: margin .18s ease;
}

/* ---- ALPHA's right panel, adopted into the right dock ---- */
#rpm-shell #panel-right.klite-panel {
    position: static !important; transform: none !important; width: auto !important; height: 100% !important;
    top: auto !important; right: auto !important; bottom: auto !important; left: auto !important;
    box-shadow: none !important; border-left: 0 !important; display: flex !important; flex-direction: column;
    visibility: visible !important;
}
#rpm-shell #panel-right .klite-handle { display: none !important; }
#rpm-shell #panel-right .klite-content { flex: 1 1 auto; max-height: none !important; }
`;
