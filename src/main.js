// =============================================================================
// KLITE RPmod — bundle entry point (esbuild bundles this into KLITE-RPmod.js).
//
// Each module exports one init function. They run in this order, each in its own
// try/catch, so a runtime failure in one module cannot prevent the others from
// loading. Everything else waits on window globals / the load event, so the
// order only matters loosely (shell first so others can register views; engine
// before its UI).
// =============================================================================
import initShell from './shell/shell.js';
import initAlpha from './KLITE-RPmod_ALPHA.js';
import initWorlds from './KLITE-RPmod_Worlds.js';
import initWorldsUI from './KLITE-RPmod_WorldsUI.js';
import initOnboarding from './onboarding/onboarding.js';

const MODULES = [
    ['shell/shell.js', initShell],
    ['KLITE-RPmod_ALPHA.js', initAlpha],
    ['KLITE-RPmod_Worlds.js', initWorlds],
    ['KLITE-RPmod_WorldsUI.js', initWorldsUI],
    ['onboarding/onboarding.js', initOnboarding],
];

for (const [file, init] of MODULES) {
    try { init(); } catch (e) {
        try { console.error('[KLITE-RPmod bundle] module failed:', file, e); } catch (_) {}
    }
}
