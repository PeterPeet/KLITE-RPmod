#!/usr/bin/env node
// =============================================================================
// Build an Esolite index.html that AUTOLOADS the KLITE RPmod bundle — no
// usermod step needed. The mod self-defers (waits for the load event + polls
// for host globals), so a <script> after Esolite's own scripts runs at the
// right time.
//
// Output is written non-destructively as `index.rpmod.html` inside the Esolite
// folder, next to the untouched original `index.html`.
//
// Usage:
//   npm run build:index                                  # external include (copies bundle in)
//   node scripts/build-integrated-index.js --inline      # inline the bundle (single file)
//   ESOLITE_DIR=<folder> npm run build:index             # another Esolite build, e.g. a local
//                                                        # build of an Esobold branch
//
// Re-run after `npm run build`. Both outputs are generated and git-ignored.
// =============================================================================
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');   // repo root
// The supported Esolite version. When upgrading the host, add the new folder, diff the
// hooks listed in docs/ARCHITECTURE.md §2, then change this line.
const ESO_DIR = process.env.ESOLITE_DIR
    ? path.resolve(process.env.ESOLITE_DIR)
    : path.join(DIR, 'Esobold Esolite a fork of KoboldAI Lite RMv1.35.0');
const SRC_HTML = path.join(ESO_DIR, 'index.html');
const OUT_HTML = path.join(ESO_DIR, 'index.rpmod.html');
const BUNDLE = path.join(DIR, 'KLITE-RPmod.js');
const MARKER = '<!-- EsoLite modifications end -->';
const inline = process.argv.includes('--inline');

for (const [p, label] of [[SRC_HTML, 'Esolite index.html'], [BUNDLE, 'KLITE-RPmod.js bundle']]) {
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

console.log(`= wrote ${path.relative(DIR, OUT_HTML)}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${inline ? 'inlined' : 'external include'})`);
if (!inline) console.log(`= copied KLITE-RPmod.js into the Esolite folder`);
console.log(`  Open that file directly — the mod loads automatically. Original index.html is untouched.`);
