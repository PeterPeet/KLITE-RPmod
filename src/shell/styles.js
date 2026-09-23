// Shell design system — Esolite-native.
//
// RPmod has no palette of its own: every colour, font and size comes from Esolite's
// theme variables (--theme_color_*, --theme_font_*), so the panels change with the theme
// the user picks or edits in Esolite's "Theme colours" editor. Controls use Esolite's
// own classes where they exist (Bootstrap `.btn.btn-primary`, `.form-control`); the
// rpm-* classes only add compact sizing and layout.
//
// RPmod-specific semantic colours are declared as Esolite theme variables
// (--theme_color_rpmod_*). Esolite's theme editor lists every --theme_* variable on the
// page, so users can edit these alongside the host colours and they are saved with a
// custom theme. Hosts without theme variables (vanilla KoboldAI Lite) get the fallbacks.
//
// Stacking: the shell is one fixed layer at z-index 2 — below Esolite's popups
// (.popupcontainer, z-index 3), so host dialogs are never covered.

// Defaults for RPmod's own theme variables (a saved/edited theme overrides them via
// inline styles on <html>, which win over this stylesheet).
export const RPMOD_THEME_DEFAULTS = {
    '--theme_color_rpmod_quest': '#f0c419',      // quest markers ! ? and tracked quest
    '--theme_color_rpmod_danger': '#d9534f',     // combat, damage, destructive actions
    '--theme_color_rpmod_success': '#5cb85c',    // enabled / healed / completed
    '--theme_color_rpmod_info': '#5bc0de',       // player lens, hints, tracked state
};

export const SHELL_CSS = `
:root {
${Object.entries(RPMOD_THEME_DEFAULTS).map(([k, v]) => `    ${k}: ${v};`).join('\n')}
}
#rpm-shell, .rpm-themed {
    /* aliases of Esolite theme variables (fallbacks: vanilla Lite without themes) */
    --rpm-bg: var(--theme_color_bg_popups, #263040);
    --rpm-bg-alt: var(--theme_color_bg_muted, #484d56);
    --rpm-bg-outer: var(--theme_color_bg_outer, #182330);
    --rpm-bg-chat: var(--theme_color_bg_chat, #0b141a);
    --rpm-fg: var(--theme_color_fg, #d1d1d1);
    --rpm-fg-muted: var(--theme_color_fg_muted, #9b9b9b);
    --rpm-fg-hi: var(--theme_color_fg_highlight, #94d7ff);
    --rpm-border: var(--theme_color_border, #415577);
    --rpm-border-hi: var(--theme_color_border_highlight, #596985);
    --rpm-accent-bg: var(--theme_color_accent_bg, #32496d);
    --rpm-accent-bg-hi: var(--theme_color_accent_bg_highlight, #596985);
    --rpm-accent-fg: var(--theme_color_accent_fg, #d1d1d1);
    --rpm-accent-fg-hi: var(--theme_color_accent_fg_highlight, #d1d1d1);
    --rpm-topmenu: var(--theme_color_topmenu, #32496d);
    --rpm-topbtn: var(--theme_color_topbtn, #415577);
    --rpm-input-bg: var(--theme_color_input_bg, #475162);
    --rpm-input-fg: var(--theme_color_input_fg, #e0e0e0);
    --rpm-quest: var(--theme_color_rpmod_quest);
    --rpm-danger: var(--theme_color_rpmod_danger);
    --rpm-success: var(--theme_color_rpmod_success);
    --rpm-info: var(--theme_color_rpmod_info);
    --rpm-font: var(--theme_font_family, Helvetica, sans-serif);
    --rpm-fs-sm: var(--theme_font_size_small, 9pt);
    --rpm-fs: var(--theme_font_size_medium, 10pt);
    --rpm-fs-lg: var(--theme_font_size_large, 11pt);
    --rpm-s1: 4px; --rpm-s2: 8px; --rpm-s3: 12px;
    --rpm-radius: 5px;               /* Esolite buttons / nav links */
    --rpm-radius-lg: 8px;            /* Esolite floating popups */
    --rpm-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
    font-family: var(--rpm-font); font-size: var(--rpm-fs); color: var(--rpm-fg);
}
#rpm-shell { position: fixed; inset: 0; z-index: 2; pointer-events: none; line-height: 1.35; }
#rpm-shell *, #rpm-shell *::before, #rpm-shell *::after { box-sizing: border-box; }
#rpm-shell button, #rpm-shell input, #rpm-shell select, #rpm-shell textarea { font-family: inherit; }
#rpm-shell pre { background: var(--rpm-bg-chat); color: var(--rpm-fg); border: 1px solid var(--rpm-border); }   /* Esolite sets pre{background:#f5f5f5} */

/* ---- docks: Esolite side popup look ---- */
.rpm-dock {
    position: absolute; top: 0; bottom: 0; pointer-events: auto; max-width: calc(100vw - 24px);
    display: flex; flex-direction: column; background: var(--rpm-bg); color: var(--rpm-fg);
    transition: transform .18s ease;
}
.rpm-dock-left { left: 0; width: var(--rpm-left-w, 260px); border-right: 1px solid var(--rpm-border); }
.rpm-dock-right { right: 0; width: var(--rpm-right-w, 350px); border-left: 1px solid var(--rpm-border); }
.rpm-dock-left.rpm-closed { transform: translateX(-100%); }
.rpm-dock-right.rpm-closed { transform: translateX(100%); }
.rpm-dock.rpm-closed { visibility: hidden; }
#rpm-shell.rpm-overlay .rpm-dock { box-shadow: var(--rpm-shadow); }

/* dock header = Esolite top menu strip */
.rpm-dock-head {
    display: flex; align-items: center; gap: var(--rpm-s1); flex: 0 0 auto; min-height: 44px;
    padding: 6px var(--rpm-s2); background: var(--rpm-topmenu); border-bottom: 1px solid var(--rpm-border);
    color: var(--rpm-accent-fg); font-weight: bold; font-size: var(--rpm-fs);
}
.rpm-dock-head .rpm-title { flex: 1; padding-left: var(--rpm-s1); }
.rpm-iconbtn {
    display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
    width: 28px; height: 28px; padding: 0; border-radius: var(--rpm-radius);
    border: 1px solid transparent; background: transparent; color: var(--rpm-accent-fg); cursor: pointer;
}
.rpm-iconbtn:hover { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); color: var(--rpm-accent-fg-hi); }
#rpm-shell :focus-visible { outline: 2px solid var(--rpm-fg-hi); outline-offset: 1px; }

/* right dock tabs = Esolite top-bar nav links */
.rpm-tabs { display: flex; gap: 3px; flex: 1; overflow-x: auto; scrollbar-width: none; }
.rpm-tabs::-webkit-scrollbar { display: none; }
.rpm-tab {
    flex: 1 0 auto; padding: 6px 8px; border-radius: var(--rpm-radius); cursor: pointer;
    border: 1px solid var(--rpm-border); background: var(--rpm-topbtn); color: var(--rpm-accent-fg);
    font-weight: bold; font-size: var(--rpm-fs-sm); white-space: nowrap;
}
.rpm-tab:hover { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); color: var(--rpm-accent-fg-hi); }
.rpm-tab[aria-selected="true"] { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); color: var(--rpm-accent-fg-hi); box-shadow: inset 0 -2px 0 var(--rpm-fg-hi); }
.rpm-dock-body { flex: 1 1 auto; min-height: 0; overflow: auto; }
.rpm-view { display: none; min-height: 100%; }
.rpm-view.rpm-active { display: block; }
.rpm-view-pad { padding: var(--rpm-s3); }
.rpm-stash { display: none !important; }

/* left dock: stacked sections with Esolite popup title bars */
.rpm-section { border-bottom: 1px solid var(--rpm-border); }
.rpm-section-head {
    display: flex; align-items: center; gap: 6px; width: 100%;
    padding: 6px var(--rpm-s2); background: var(--rpm-accent-bg); color: var(--rpm-accent-fg);
    border: 0; cursor: pointer; text-align: left; font-weight: bold; font-size: var(--rpm-fs);
}
.rpm-section-head:hover { background: var(--rpm-accent-bg-hi); color: var(--rpm-accent-fg-hi); }
.rpm-section-head svg { transition: transform .15s; flex: 0 0 auto; }
.rpm-section.rpm-collapsed .rpm-section-head svg { transform: rotate(-90deg); }
.rpm-section.rpm-collapsed .rpm-section-body { display: none; }
.rpm-section-body { padding: var(--rpm-s2) var(--rpm-s3) var(--rpm-s3); }

/* edge handles to reopen a closed dock */
.rpm-handle {
    position: absolute; top: 50%; transform: translateY(-50%); pointer-events: auto;
    width: 16px; height: 56px; display: flex; align-items: center; justify-content: center; padding: 0;
    background: var(--rpm-topbtn); color: var(--rpm-accent-fg); border: 1px solid var(--rpm-border); cursor: pointer;
}
.rpm-handle:hover { background: var(--rpm-accent-bg-hi); }
.rpm-handle-left { left: 0; border-left: 0; border-radius: 0 var(--rpm-radius) var(--rpm-radius) 0; }
.rpm-handle-right { right: 0; border-right: 0; border-radius: var(--rpm-radius) 0 0 var(--rpm-radius); }
.rpm-handle[hidden] { display: none; }

/* ---- floating windows = Esolite floating popups (.context-usage-popup) ---- */
.rpm-windows { position: absolute; inset: 0; pointer-events: none; }
.rpm-window {
    position: absolute; pointer-events: auto; display: flex; flex-direction: column;
    background: var(--rpm-bg); color: var(--rpm-fg); border: 1px solid var(--rpm-border);
    border-radius: var(--rpm-radius-lg); box-shadow: var(--rpm-shadow); overflow: hidden;
}
.rpm-window.rpm-focused { border-color: var(--rpm-border-hi); }
.rpm-window-head {
    display: flex; align-items: center; gap: var(--rpm-s2); flex: 0 0 auto; cursor: move; user-select: none;
    padding: 6px 6px 6px 10px; background: var(--rpm-accent-bg); color: var(--rpm-accent-fg);
    font-size: var(--rpm-fs); font-weight: bold; touch-action: none;
}
.rpm-window-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rpm-window-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--rpm-s3); }
.rpm-window-grip {
    position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; touch-action: none;
    background: linear-gradient(135deg, transparent 50%, var(--rpm-border) 50%, var(--rpm-border) 60%, transparent 60%, transparent 70%, var(--rpm-border) 70%, var(--rpm-border) 80%, transparent 80%);
}
#rpm-shell.rpm-compact .rpm-window { left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0; }
#rpm-shell.rpm-compact .rpm-window-head { cursor: default; }
#rpm-shell.rpm-compact .rpm-window-grip { display: none; }

/* ---- controls: Esolite classes + compact sizing ---- */
/* buttons: class="btn btn-primary rpm-btn" (colours from Esolite's .btn-primary) */
.rpm-themed .btn.rpm-btn, #rpm-shell .btn.rpm-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    padding: 4px 8px; font-size: var(--rpm-fs-sm); line-height: 1.3; border-radius: var(--rpm-radius);
    white-space: normal;
}
.btn.rpm-btn.rpm-block { width: 100%; }
.btn.rpm-btn.rpm-lg { padding: 7px 10px; font-size: var(--rpm-fs); font-weight: bold; }
.btn.rpm-btn.rpm-danger { border-color: var(--rpm-danger); box-shadow: inset 3px 0 0 var(--rpm-danger); }
.btn.rpm-btn.rpm-success { border-color: var(--rpm-success); box-shadow: inset 3px 0 0 var(--rpm-success); }
.btn.rpm-btn.rpm-on { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-success); }
/* inputs: class="form-control rpm-input" (colours from Esolite's .form-control) */
.rpm-themed .form-control.rpm-input, #rpm-shell .form-control.rpm-input {
    height: auto; min-height: 28px; padding: 3px 6px; font-size: var(--rpm-fs-sm); border-radius: 4px; box-shadow: none;
}
#rpm-shell textarea.form-control.rpm-input { min-height: 60px; resize: vertical; }
#rpm-shell input[type=checkbox] { accent-color: var(--rpm-accent-bg-hi); }

/* content building blocks */
.rpm-row { display: flex; gap: 6px; align-items: center; }
.rpm-row > .rpm-grow { flex: 1 1 0; min-width: 0; }
.rpm-label { display: block; color: var(--rpm-fg-muted); font-size: var(--rpm-fs-sm); margin: 10px 0 4px; }
.rpm-muted { color: var(--rpm-fg-muted); font-size: var(--rpm-fs-sm); }
.rpm-heading { font-weight: bold; font-size: var(--rpm-fs-lg); }
.rpm-card { background: var(--rpm-bg-alt); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); padding: 6px 8px; margin-top: 4px; }
.rpm-card.rpm-card-hi { border-color: var(--rpm-border-hi); box-shadow: inset 3px 0 0 var(--rpm-quest); }
.rpm-chip {
    display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: var(--rpm-fs-sm);
    border: 1px solid var(--rpm-border); background: var(--rpm-accent-bg); color: var(--rpm-accent-fg); cursor: default;
}
button.rpm-chip, .rpm-chip[role=button] { cursor: pointer; }
.rpm-chip.rpm-chip-info { border-color: var(--rpm-info); color: var(--rpm-info); background: transparent; }
.rpm-chip.rpm-chip-quest { border-color: var(--rpm-quest); color: var(--rpm-quest); background: transparent; }
.rpm-chip.rpm-chip-danger { border-color: var(--rpm-danger); color: var(--rpm-danger); background: transparent; }
.rpm-divider { border: 0; border-top: 1px solid var(--rpm-border); margin: 10px 0; }
.rpm-quest-mark { color: var(--rpm-quest); font-weight: bold; }
.rpm-bar { height: 6px; background: var(--rpm-bg-outer); border-radius: 3px; overflow: hidden; margin-top: 3px; }
.rpm-bar > span { display: block; height: 100%; }
.rpm-log { background: var(--rpm-bg-chat); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); padding: 6px; font-size: var(--rpm-fs-sm); max-height: 140px; overflow: auto; line-height: 1.5; }

/* ---- RPmod Guide window ---- */
.rpm-guide { display: grid; grid-template-columns: 180px 1fr; gap: 14px; min-height: 100%; }
.rpm-guide-toc { display: flex; flex-direction: column; gap: 3px; border-right: 1px solid var(--rpm-border); padding-right: 10px; }
.rpm-guide-toc-item {
    text-align: left; padding: 5px 8px; border-radius: var(--rpm-radius); border: 1px solid transparent;
    background: transparent; color: var(--rpm-fg); cursor: pointer; font-size: var(--rpm-fs-sm);
}
.rpm-guide-toc-item:hover { background: var(--rpm-bg-alt); }
.rpm-guide-toc-item[aria-current="page"] { background: var(--rpm-accent-bg-hi); color: var(--rpm-accent-fg-hi); border-color: var(--rpm-border-hi); font-weight: bold; }
.rpm-guide-body { min-width: 0; line-height: 1.5; }
.rpm-guide-title { margin: 2px 0 10px; font-size: var(--rpm-fs-lg); font-weight: bold; color: var(--rpm-fg-hi); }
.rpm-guide-nav { margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--rpm-border); }
.rpm-guide-table { border-collapse: collapse; width: 100%; margin: 0 0 10px; font-size: var(--rpm-fs-sm); }
.rpm-guide-table th, .rpm-guide-table td { border: 1px solid var(--rpm-border); padding: 4px 6px; text-align: left; vertical-align: top; }
.rpm-guide-table th { background: var(--rpm-accent-bg); color: var(--rpm-accent-fg); }
.rpm-guide-table code { background: transparent; color: var(--rpm-fg-hi); padding: 0; white-space: nowrap; }
/* narrow window (or phone): chapter list becomes a scrolling strip on top */
.rpm-window-body { container-type: inline-size; }
@container (max-width: 520px) {
    .rpm-guide { grid-template-columns: 1fr; }
    .rpm-guide-toc { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--rpm-border); padding: 0 0 6px; }
    .rpm-guide-toc-item { white-space: nowrap; }
}

/* ---- "Show me" spotlight (outside the shell layer, above everything) ---- */
.rpm-spot-ring {
    position: fixed; z-index: 100003; pointer-events: none; border-radius: 8px;
    border: 3px solid var(--rpm-fg-hi); box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
    animation: rpm-spot-pulse 1.2s ease-in-out infinite alternate;
}
@keyframes rpm-spot-pulse { from { outline: 0 solid transparent; } to { outline: 6px solid color-mix(in srgb, var(--rpm-fg-hi) 35%, transparent); } }
@media (prefers-reduced-motion: reduce) { .rpm-spot-ring { animation: none; } }
.rpm-spot-note {
    position: fixed; z-index: 100004; max-width: 280px; padding: 8px 12px;
    background: var(--rpm-bg); color: var(--rpm-fg); border: 1px solid var(--rpm-border-hi);
    border-radius: var(--rpm-radius-lg); box-shadow: var(--rpm-shadow); font-family: var(--rpm-font); font-size: var(--rpm-fs);
}

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
    visibility: visible !important; background: transparent !important;
}
#rpm-shell #panel-right .klite-handle,
#rpm-shell #panel-right > .klite-tabs { display: none !important; }   /* shell tabs replace ALPHA's tab bar */
#rpm-shell #panel-right .klite-content { flex: 1 1 auto; max-height: none !important; padding: var(--rpm-s3); }
`;
