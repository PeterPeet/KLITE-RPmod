// =============================================================================
// KLITE RPmod — bundle entry point (esbuild bundles this into KLITE-RPmod.js).
//
// Each module exports one init function. They run in this order, each in its own
// try/catch, so a runtime failure in one module cannot prevent the others from
// loading. Everything else waits on window globals / the load event, so the
// order only matters loosely (engine before its UI).
// =============================================================================
import initAlpha from './KLITE-RPmod_ALPHA.js';
import initGuidedRP from './KLITE-RPmod_GuidedRP.js';
import initWorlds from './KLITE-RPmod_Worlds.js';
import initWorldsUI from './KLITE-RPmod_WorldsUI.js';

const MODULES = [
    ['KLITE-RPmod_ALPHA.js', initAlpha],
    ['KLITE-RPmod_GuidedRP.js', initGuidedRP],
    ['KLITE-RPmod_Worlds.js', initWorlds],
    ['KLITE-RPmod_WorldsUI.js', initWorldsUI],
];

for (const [file, init] of MODULES) {
    try { init(); } catch (e) {
        try { console.error('[KLITE-RPmod bundle] module failed:', file, e); } catch (_) {}
    }
}
