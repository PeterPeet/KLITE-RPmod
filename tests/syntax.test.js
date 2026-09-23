'use strict';
// Every source must parse as an ES module; the generated bundle must parse as a classic
// script (that is how Esolite runs a usermod).
const test = require('node:test');
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const esbuild = require('esbuild');
const { ROOT } = require('./helpers/host');

const sources = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter(f => f.endsWith('.js'));

for (const f of sources) {
    test(`syntax (ES module): src/${f}`, () => {
        esbuild.transformSync(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'),
            { format: 'esm', loader: 'js', logLevel: 'silent' });
    });
}

test('syntax (classic script): KLITE-RPmod.js', () => {
    execFileSync(process.execPath, ['--check', path.join(ROOT, 'KLITE-RPmod.js')], { stdio: 'pipe' });
});
