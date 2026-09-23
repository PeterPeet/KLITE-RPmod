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

// Two function declarations with the same name in one scope are legal JavaScript: the
// later one silently replaces the earlier everywhere (this broke the Worlds editor once).
// Check module-level helpers (4-space indent inside the init function).
for (const f of sources) {
    test(`no duplicate top-level function names: src/${f}`, (t) => {
        const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
        const seen = new Map(), dups = [];
        src.split('\n').forEach((line, i) => {
            const m = /^ {4}(?:async )?function (\w+)\s*\(/.exec(line);
            if (!m) return;
            if (seen.has(m[1])) dups.push(`${m[1]} (lines ${seen.get(m[1])} and ${i + 1})`);
            else seen.set(m[1], i + 1);
        });
        if (f === 'KLITE-RPmod_ALPHA.js' || f === 'KLITE-RPmod_GuidedRP.js') {
            if (dups.length) t.diagnostic('legacy duplicates: ' + dups.join(', '));
            return;   // legacy modules: reported, not enforced (see ROADMAP known issues)
        }
        if (dups.length) throw new Error('duplicate function declarations: ' + dups.join(', '));
    });
}
