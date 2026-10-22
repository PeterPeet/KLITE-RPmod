#!/usr/bin/env node
// Serve the built Esolite site (see esolite-paths.js) on http://localhost:<port> (default 8747).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ESOLITE_DIR } = require('./esolite-paths');

const port = process.argv[2] || '8747';
if (!fs.existsSync(path.join(ESOLITE_DIR, 'index.html'))) {
    console.error(`! no Esolite build in ${ESOLITE_DIR} — run: npm run build:host && npm run build:index`);
    process.exit(1);
}
const child = spawn('python3', ['-m', 'http.server', '--directory', ESOLITE_DIR, port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
