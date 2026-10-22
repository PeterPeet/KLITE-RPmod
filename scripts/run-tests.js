#!/usr/bin/env node
// =============================================================================
// Test runner wrapper (npm test): runs the suite with Node's test runner and guards
// against tests silently going missing — e.g. a test file whose process ends early
// reports "fail 0" with fewer tests. The count is compared with tests/.test-count:
// fewer than the baseline fails the run; more raises the baseline automatically.
// Lower it on purpose with:  node scripts/run-tests.js --accept-count
// =============================================================================
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(ROOT, 'tests', '.test-count');
const files = fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.test.js')).map(f => path.join('tests', f));

// No --test-force-exit: on Node 22 it ends a test file part-way (exit 0) once that file
// keeps the event loop busy for about a second, silently dropping tests (seen 2026-09-23 with
// tests/syntax.test.js). A hard timeout guards against a hanging test instead.
const TIMEOUT_MS = 180000;
const run = spawnSync(process.execPath, ['--test', ...files], { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS });
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
if (run.error && run.error.code === 'ETIMEDOUT') {
    console.error(`\n✖ the test run did not finish within ${TIMEOUT_MS / 1000} s (a test keeps the process alive?)`);
    process.exit(1);
}

const num = (label) => { const m = new RegExp(`^# ${label} (\\d+)`, 'm').exec(run.stdout || ''); return m ? Number(m[1]) : NaN; };
const total = num('tests'), failed = num('fail'), cancelled = num('cancelled');
if (run.status !== 0 || failed > 0 || cancelled > 0) process.exit(run.status || 1);

let baseline = 0;
try { baseline = Number(fs.readFileSync(BASELINE, 'utf8').trim()) || 0; } catch (_) {}
if (!Number.isFinite(total)) { console.error('\n✖ could not read the test count from the runner output'); process.exit(1); }
if (total < baseline && !process.argv.includes('--accept-count')) {
    console.error(`\n✖ only ${total} tests ran, expected at least ${baseline} (tests/.test-count).`);
    console.error('  A test file probably ended early. If tests were removed on purpose: node scripts/run-tests.js --accept-count');
    process.exit(1);
}
if (total !== baseline) fs.writeFileSync(BASELINE, total + '\n');
console.log(`\n✔ ${total} tests (baseline ${Math.max(baseline, total)})`);
