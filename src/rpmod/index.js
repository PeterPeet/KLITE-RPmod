// =============================================================================
// KLITE RPmod — RP core and panels: start-up order
// -----------------------------------------------------------------------------
// The RP core (window.KLITE_RPMod) and the right-side panels Chars, Roles, Scenario, Tools
// (plus Context and the image panel). Formerly one file, "KLITE-RPmod_ALPHA.js" (a version
// label); split 2026-09-25 by moving code, not rewriting it. Each part runs in the old order;
// `S` carries the few helpers the parts share (t, LiteAPI, DOMUtil, STYLES_PANELS_ONLY).
// Ships inside the one usermod bundle like everything in src/ (scripts/build-bundle.js).
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================
import { installDebug } from './debug.js';
import { installCharacterContext } from './characterContext.js';
import { installHostCompat } from './host.js';
import { installTemplates } from './templates.js';
import { installLiteApi } from './liteApi.js';
import { installStyles } from './styles.js';
import { installCore } from './core.js';
import { installRpMode } from './rpMode.js';
import { installToolsPanel } from '../panels/tools.js';
import { installContextPanel } from '../panels/context.js';
import { installScenarioPanel } from '../panels/scenario.js';
import { installRolesPanel } from '../panels/roles.js';
import { installCharsPanel } from '../panels/chars.js';
import { installCardEditor } from '../characters/cardEditor.js';
import { installBoot } from './boot.js';

export default function initRpmod() {
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

    const S = {};
    installDebug(S);
    installCharacterContext(S);
    installHostCompat(S);
    installTemplates(S);
    installLiteApi(S);
    installStyles(S);
    installCore(S);
    installRpMode(S);
    installToolsPanel(S);
    installContextPanel(S);
    installScenarioPanel(S);
    installRolesPanel(S);
    installCharsPanel(S);
    installCardEditor(S);
    installBoot(S);
}
