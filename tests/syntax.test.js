'use strict';
const test = require('node:test');
const { execFileSync } = require('child_process');
const path = require('path');
const { ROOT } = require('./helpers/host');

const files = [
    'src/KLITE-RPmod_ALPHA.js',
    'src/KLITE-RPmod_GuidedRP.js',
    'src/KLITE-RPmod_Worlds.js',
    'src/KLITE-RPmod_WorldsUI.js',
    'KLITE-RPmod.js',
];

for (const f of files) {
    test(`syntax: ${f}`, () => {
        execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
    });
}
