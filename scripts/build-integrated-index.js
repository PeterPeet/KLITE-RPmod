#!/usr/bin/env node
// =============================================================================
// Build an Esolite index.html that AUTOLOADS the KLITE RPmod bundle — no
// usermod step needed. The mod self-defers (waits for the load event + polls
// for host globals), so a <script> after Esolite's own scripts runs at the
// right time.
//
// Output is written non-destructively as `index.rpmod.html` inside the built Esolite
// site (`npm run build:host`, see esolite-paths.js), next to the untouched `index.html`.
//
// Usage:
//   npm run build:index                                  # external include (copies bundle in)
//   node scripts/build-integrated-index.js --inline      # inline the bundle (single file)
//   ESOLITE_DIR=<folder> npm run build:index             # another Esolite folder
//
// Re-run after `npm run build` and after `npm run build:host`.
// =============================================================================
const fs = require('fs');
const path = require('path');

const { ROOT: DIR, ESOLITE_DIR: ESO_DIR } = require('./esolite-paths');
const SRC_HTML = path.join(ESO_DIR, 'index.html');
const OUT_HTML = path.join(ESO_DIR, 'index.rpmod.html');
const BUNDLE = path.join(DIR, 'KLITE-RPmod.js');
const MARKER = '<!-- EsoLite modifications end -->';
const inline = process.argv.includes('--inline');

for (const [p, label] of [[SRC_HTML, 'Esolite index.html (run: npm run build:host)'], [BUNDLE, 'KLITE-RPmod.js bundle (run: npm run build)']]) {
    if (!fs.existsSync(p)) { console.error(`! missing ${label}: ${p}`); process.exit(1); }
}

let html = fs.readFileSync(SRC_HTML, 'utf8');
// The marker can appear more than once; inject before the LAST one (end of the
// document, after all of Esolite's own scripts have loaded).
const at = html.lastIndexOf(MARKER);
if (at < 0) { console.error(`! injection marker not found ("${MARKER}") — Esolite layout changed; update this script.`); process.exit(1); }

// IMPORTANT: run the bundle only AFTER Esolite's own startup init has finished.
// Esolite executes a usermod late in its boot (inside a post-load
// `Promise.all([indexeddb_load…]).then()`), by which point DOMContentLoaded has
// fired and the top bar is fully built. The mod's sub-modules bootstrap on early
// signals (GuidedRP on DOMContentLoaded; ALPHA hooks the top bar), so a plain
// parse-time <script> would init into a half-built UI (misplaced icons).
// Deferring to window 'load' reproduces the usermod's "runs late" timing.
let injection;
if (inline) {
    // Inline the bundle. Escape </script> so it can't close the tag early.
    const code = fs.readFileSync(BUNDLE, 'utf8').replace(/<\/script>/gi, '<\\/script>');
    injection =
        `<!-- KLITE RPmod (auto-loaded after Esolite init, inlined) -->\n` +
        `<script>(function(){function boot(){try{\n${code}\n}catch(e){try{console.error('[KLITE RPmod bundle]',e);}catch(_){}}}` +
        `if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',boot);})();</script>\n`;
} else {
    // External include: copy the bundle next to index.html and load it after 'load'.
    // A ?v=<build time> query busts the browser cache on every rebuild.
    fs.copyFileSync(BUNDLE, path.join(ESO_DIR, 'KLITE-RPmod.js'));
    const ver = Date.now();
    injection =
        `<!-- KLITE RPmod (auto-loaded after Esolite init) -->\n` +
        `<script>(function(){function boot(){var s=document.createElement('script');s.src='KLITE-RPmod.js?v=${ver}';document.head.appendChild(s);}` +
        `if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',boot);})();</script>\n`;
}

html = html.slice(0, at) + injection + html.slice(at);
fs.writeFileSync(OUT_HTML, html, 'utf8');

console.log(`= wrote ${OUT_HTML}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${inline ? 'inlined' : 'external include'})`);
if (!inline) console.log(`= copied KLITE-RPmod.js into the Esolite folder`);
console.log(`  Serve it (npm run serve) and open http://localhost:8747/index.rpmod.html — the mod loads automatically.`);
