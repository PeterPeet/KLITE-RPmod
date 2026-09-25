// =============================================================================
// KLITE RPmod — The panel CSS injected at init (bound to Esolite theme variables).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installStyles(S) {
    // Only what the shell (src/shell/styles.js) does not cover: the panels' collapsible sections,
    // their modals and a few panel widgets. Colours, fonts and spacing come from the shell's
    // --rpm-* tokens (aliases of Esolite's theme variables), defined on #rpm-shell and on
    // .rpm-themed — #panel-right and the panels' modals carry that class.
    const STYLES_PANELS_ONLY = `
        /* the shell adopts #panel-right out of this wrapper at start-up (src/shell/shell.js) */
        #klite-panels-only { display: none; }
        .klite-content { overflow-y: auto; overflow-x: hidden; color: var(--rpm-fg); font-family: var(--rpm-font); font-size: var(--rpm-fs); }
        /* sections = Esolite popup title bar + body */
        .klite-section { margin-bottom: var(--rpm-s3); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); overflow: hidden; }
        .klite-section-header {
            display: flex; justify-content: space-between; align-items: center; gap: var(--rpm-s2); padding: 6px var(--rpm-s2);
            background: var(--rpm-accent-bg); color: var(--rpm-accent-fg); font-weight: bold; cursor: pointer; user-select: none;
        }
        .klite-section-header:hover { background: var(--rpm-accent-bg-hi); color: var(--rpm-accent-fg-hi); }
        .klite-section.collapsed .klite-section-content { display: none; }
        .klite-section-content { padding: var(--rpm-s2) var(--rpm-s3) var(--rpm-s3); }
        .klite-content .rpm-input + .rpm-input, .klite-content .rpm-input + .rpm-label { margin-top: var(--rpm-s2); }
        /* modals = Esolite popups (dim layer, title bar, body, footer strip) */
        .klite-modal {
            position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6);
            font-family: var(--rpm-font); font-size: var(--rpm-fs); color: var(--rpm-fg);
        }
        .klite-modal-content {
            display: flex; flex-direction: column; max-height: 88vh; width: min(640px, 94vw); max-width: 94vw; overflow: hidden;
            background: var(--rpm-bg); border: 1px solid var(--rpm-border-hi); border-radius: var(--rpm-radius-lg); box-shadow: var(--rpm-shadow); color: var(--rpm-fg);
        }
        .klite-modal-content.klite-modal-sm { width: min(400px, 94vw); }
        .klite-modal-header { display: flex; justify-content: space-between; align-items: center; gap: var(--rpm-s2); padding: var(--rpm-s2) var(--rpm-s3); background: var(--rpm-accent-bg); color: var(--rpm-accent-fg); }
        .klite-modal-header h2, .klite-modal-header h3 { margin: 0; font-size: var(--rpm-fs-lg); font-weight: bold; color: inherit; }
        .klite-modal-close {
            display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border-radius: var(--rpm-radius);
            background: none; border: 1px solid transparent; color: inherit; font-size: 18px; cursor: pointer;
        }
        .klite-modal-close:hover { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); }
        .klite-modal-body { flex: 1 1 auto; overflow-y: auto; padding: var(--rpm-s3); }
        .klite-modal-body > p { margin: 0; }
        .klite-modal-footer { display: flex; gap: var(--rpm-s2); justify-content: flex-end; padding: var(--rpm-s2) var(--rpm-s3); border-top: 1px solid var(--rpm-border); }
        .klite-modal-footer .rpm-btn { flex: 1; }
        /* character rows (group list, selection modal) */
        .klite-item-row { display: flex; align-items: center; gap: var(--rpm-s2); padding: var(--rpm-s2); margin-bottom: var(--rpm-s2); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); background: var(--rpm-bg); }
        .klite-item-row:last-child { margin-bottom: 0; }
        .klite-item-row.klite-is-next { border-color: var(--rpm-success); background: color-mix(in srgb, var(--rpm-success) 12%, var(--rpm-bg)); }
        .klite-item-row.klite-is-last { border-color: var(--rpm-quest); background: color-mix(in srgb, var(--rpm-quest) 12%, var(--rpm-bg)); }
        .rpm-tag.klite-tag-next { background: var(--rpm-success); color: #fff; margin-left: var(--rpm-s1); }
        .rpm-tag.klite-tag-last { background: var(--rpm-quest); color: #000; margin-left: var(--rpm-s1); }
        .klite-pick-row { cursor: pointer; }
        .klite-pick-list { max-height: 400px; overflow-y: auto; border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); padding: var(--rpm-s2); background: var(--rpm-bg-outer); }
        .klite-indent { margin-left: 20px; }
        .klite-pick-desc { max-height: 32px; overflow: hidden; margin: 2px 0; }
        .klite-pick-row input { margin: 0; }
        .klite-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--rpm-s1); }
        /* safeImageHTML: an external image waits for a click (size comes from the caller) */
        .klite-safe-image { display: flex; flex-direction: column; align-items: center; gap: var(--rpm-s1); }
        .klite-image-blocked { display: flex; align-items: center; justify-content: center; padding: var(--rpm-s2) var(--rpm-s3); background: var(--rpm-bg-alt); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); color: var(--rpm-fg-muted); }
        .klite-item-row.klite-is-ai { border-color: var(--rpm-info); background: color-mix(in srgb, var(--rpm-info) 12%, var(--rpm-bg)); }
        /* inset = the panel background, darkened (follows the theme) */
        .klite-inset, .klite-box { background: color-mix(in srgb, var(--rpm-bg) 80%, #000); border-radius: var(--rpm-radius); padding: var(--rpm-s2); }
        .klite-box { padding: var(--rpm-s3); }
        .klite-item-row > .rpm-grow { flex: 1 1 0; min-width: 0; overflow-wrap: anywhere; }
        .klite-item-row .rpm-btn { white-space: nowrap; }
        .klite-disabled { opacity: .5; pointer-events: none; }
        .klite-slots { display: flex; flex-direction: column; gap: var(--rpm-s1); }
        #rpm-shell .klite-auto-sender textarea.form-control.rpm-input { min-height: 40px; }
        #rpm-shell .btn.rpm-btn.klite-slot-btn { flex: none; width: 32px; min-width: 32px; padding-left: 0; padding-right: 0; }
        .klite-slider { width: 100%; }
        /* auto sender countdown ring; --klite-progress is set from the timer */
        .klite-auto-countdown {
            flex: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: var(--rpm-fs-sm); color: var(--rpm-fg); border: 2px solid var(--rpm-border);
            background: conic-gradient(var(--rpm-info) 0 var(--klite-progress, 0%), var(--rpm-bg-alt) var(--klite-progress, 0%) 100%);
        }
        /* Chars: import drop zone, character detail view */
        #rpm-shell .btn.rpm-btn.klite-drop-btn { padding: 18px var(--rpm-s3); font-size: var(--rpm-fs); }
        #rpm-shell .btn.rpm-btn.rpm-chars-link { justify-content: flex-start; text-align: left; margin-bottom: var(--rpm-s1); }
        .klite-detail-head { display: flex; justify-content: space-between; align-items: center; gap: var(--rpm-s2); margin-bottom: var(--rpm-s3); padding-bottom: var(--rpm-s2); border-bottom: 1px solid var(--rpm-border); }
        .klite-detail-head h2 { margin: 0; }
        .klite-profile { text-align: center; }
        .klite-profile-noimg { width: 100px; height: 100px; margin: 0 auto var(--rpm-s2); display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--rpm-fg-muted); }
        .klite-pre { white-space: pre-wrap; line-height: 1.5; }
        .klite-entry { margin-bottom: var(--rpm-s3); padding: var(--rpm-s3); background: var(--rpm-bg-alt); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); }
        .klite-entry:last-child { margin-bottom: 0; }
        .klite-entry.klite-entry-active { border-color: var(--rpm-info); background: color-mix(in srgb, var(--rpm-info) 15%, var(--rpm-bg-alt)); }
        .klite-entry-head { display: flex; justify-content: space-between; align-items: center; gap: var(--rpm-s2); margin-bottom: var(--rpm-s2); }
        .rpm-chip.klite-tag-pill { cursor: pointer; }
        .rpm-chip.klite-tag-pill.selected { background: var(--rpm-accent-bg-hi); border-color: var(--rpm-border-hi); color: var(--rpm-accent-fg-hi); }
        /* RPmod block in Esolite's settings */
        .klite-settings { margin: var(--rpm-s2) 0; color: var(--rpm-fg); }
        .klite-topics { gap: var(--rpm-s1) var(--rpm-s2); line-height: 1.6; }
        .klite-timeline-item { padding: var(--rpm-s2); cursor: pointer; border-radius: var(--rpm-radius); }
        .klite-timeline-item:hover { background: var(--rpm-bg-alt); }
        #rpm-shell .form-control.rpm-input.klite-num { width: 64px; flex: none; }
        .klite-pick-desc { max-height: 32px; overflow: hidden; margin: 2px 0; }
        /* dice result */
        .klite-dice-total { font-size: 24px; font-weight: bold; color: var(--rpm-fg-hi); }
        .klite-dice-result { background: var(--rpm-bg-alt); border-radius: var(--rpm-radius); padding: var(--rpm-s3); text-align: center; min-height: 80px; }
        /* context analyzer: token bar + legend (segment widths are set from the data) */
        .klite-token-bar { display: flex; height: 20px; margin-bottom: var(--rpm-s2); background: var(--rpm-bg-alt); border: 1px solid var(--rpm-border); border-radius: var(--rpm-radius); overflow: hidden; }
        .klite-token-segment { height: 100%; transition: width 0.3s ease; }
        .klite-memory-segment { background: var(--rpm-info); }
        .klite-wi-segment { background: var(--rpm-success); }
        .klite-story-segment { background: var(--rpm-quest); }
        .klite-anote-segment { background: var(--rpm-danger); }
        .klite-free-segment { background: var(--rpm-bg-alt); }
        .klite-token-legend { margin-bottom: var(--rpm-s2); font-size: var(--rpm-fs-sm); }
        .klite-token-legend-item { display: flex; align-items: center; gap: var(--rpm-s1); }
        .klite-token-legend-color { width: 12px; height: 12px; border-radius: 2px; }
        .klite-token-legend-label { color: var(--rpm-fg-muted); }
        .klite-token-legend-value { color: var(--rpm-fg); font-weight: bold; }
    `;

    

    // =============================================
    // 3a. RPmod Host Adapter (Esolite-first)
    // =============================================

    // Thin wrapper over host (Esolite/Lite) state and storage.
    // RPmod should read/write host-native structures only.
    S.STYLES_PANELS_ONLY = STYLES_PANELS_ONLY;
}
