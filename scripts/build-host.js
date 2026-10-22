#!/usr/bin/env node
// Build the Esolite site RPmod runs in from the local Esobold clone (see esolite-paths.js):
// docs/ + embd_res/* -> static/, klite.embd -> index.html, like Esobold's updateHTML
// workflow. Run again after switching or updating the clone's branch.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ESOBOLD_DIR, ESOLITE_DIR } = require('./esolite-paths');

const need = [path.join(ESOBOLD_DIR, 'docs'), path.join(ESOBOLD_DIR, 'embd_res', 'klite.embd')];
for (const p of need) {
    if (!fs.existsSync(p)) { console.error(`! Esobold clone not found (missing ${p}). Clone esolithe/esobold there or set ESOBOLD_DIR.`); process.exit(1); }
}

// iCloud duplicates ("name 2.js") are not part of Esobold
const notDuplicate = (src) => !/ \d+(\.[^/]*)?$/.test(path.basename(src));

fs.rmSync(ESOLITE_DIR, { recursive: true, force: true });
fs.mkdirSync(ESOLITE_DIR, { recursive: true });
fs.cpSync(path.join(ESOBOLD_DIR, 'docs'), ESOLITE_DIR, { recursive: true, filter: notDuplicate });
fs.cpSync(path.join(ESOBOLD_DIR, 'embd_res'), path.join(ESOLITE_DIR, 'static'), { recursive: true, filter: notDuplicate });
fs.copyFileSync(path.join(ESOBOLD_DIR, 'embd_res', 'klite.embd'), path.join(ESOLITE_DIR, 'index.html'));

let version = 'unknown';
try {
    const git = (...args) => execFileSync('git', ['-C', ESOBOLD_DIR, ...args], { encoding: 'utf8' }).trim();
    version = `${git('rev-parse', '--abbrev-ref', 'HEAD')} @ ${git('log', '-1', '--format=%h %s')}${git('status', '--porcelain', '--untracked-files=no') ? ' (+ local changes)' : ''}`;
} catch (_) {}
fs.writeFileSync(path.join(ESOLITE_DIR, 'esobold-version.txt'), version + '\n');
console.log(`= built Esolite from ${ESOBOLD_DIR}\n  ${version}\n  -> ${ESOLITE_DIR}`);
console.log('  Next: npm run build:index, then npm run serve (http://localhost:8747/index.rpmod.html)');
