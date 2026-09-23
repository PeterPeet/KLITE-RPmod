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

const run = spawnSync(process.execPath, ['--test', '--test-force-exit', ...files], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');

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
