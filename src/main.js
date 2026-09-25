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
import initRpmod from './rpmod/index.js';
import initWorlds from './KLITE-RPmod_Worlds.js';
import initWorldsUI from './KLITE-RPmod_WorldsUI.js';
import initOnboarding from './onboarding/onboarding.js';
import initLibrary from './library/esoliteLibrary.js';
import initSettings from './settings/settings.js';
import initGameLog from './game/log.js';
import initCharacters from './characters/characters.js';
import initGallery from './characters/gallery.js';
import initBuilder from './characters/builder.js';

const MODULES = [
    ['shell/shell.js', initShell],
    ['settings/settings.js', initSettings],
    ['library/esoliteLibrary.js', initLibrary],
    ['game/log.js', initGameLog],
    ['characters/characters.js', initCharacters],
    ['characters/gallery.js', initGallery],
    ['characters/builder.js', initBuilder],
    ['rpmod/index.js', initRpmod],
    ['KLITE-RPmod_Worlds.js', initWorlds],
    ['KLITE-RPmod_WorldsUI.js', initWorldsUI],
    ['onboarding/onboarding.js', initOnboarding],
];

for (const [file, init] of MODULES) {
    try { init(); } catch (e) {
        try { console.error('[KLITE-RPmod bundle] module failed:', file, e); } catch (_) {}
    }
}
