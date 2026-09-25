#!/usr/bin/env node
// =============================================================================
// Deploy Esolite + RPmod to the GitHub Pages site rp-lite.koboldai.net.
//
// The site is the root of branch `redirect` of PeterPeet/rp-lite.koboldai.net (local clone:
// PAGES_DIR, default ../rp-lite.koboldai.net). This script:
//   1. builds Esolite from a RELEASED Esobold ref (default origin/remoteManagement) in a
//      temporary worktree of the Esobold clone — the clone's own checkout is not touched;
//   2. runs `npm test` against that Esobold (skip with --skip-tests; the bundle is still built);
//   3. builds the autoloading index (build-integrated-index.js) into a temporary site;
//   4. copies it into the pages clone: index.html = Esolite + RPmod, esolite.html = plain
//      Esolite, static/, KLITE-RPmod.js, esobold-version.txt, .nojekyll (CNAME, .github stay);
//   5. commits there; with --push also pushes (GitHub https remotes are pushed via SSH).
//
// Usage:
//   npm run deploy:pages                  # build, test, commit (no push)
//   npm run deploy:pages -- --push        # ... and push: the site updates a minute later
//   ESOBOLD_REF=origin/<branch> PAGES_DIR=<folder> npm run deploy:pages
// =============================================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, ESOBOLD_DIR } = require('./esolite-paths');

const PAGES_DIR = path.resolve(process.env.PAGES_DIR || path.join(ROOT, '..', 'rp-lite.koboldai.net'));
const PAGES_BRANCH = 'redirect';
const ESOBOLD_REF = process.env.ESOBOLD_REF || 'origin/remoteManagement';
const push = process.argv.includes('--push');
const skipTests = process.argv.includes('--skip-tests');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const fail = (msg) => { console.error(`! ${msg}`); process.exit(1); };

// --- the pages clone must be on the site branch and clean ---------------------
if (!fs.existsSync(path.join(PAGES_DIR, '.git'))) fail(`pages clone not found: ${PAGES_DIR} (set PAGES_DIR)`);
if (git(PAGES_DIR, 'rev-parse', '--abbrev-ref', 'HEAD') !== PAGES_BRANCH) fail(`${PAGES_DIR} is not on branch ${PAGES_BRANCH}`);
if (git(PAGES_DIR, 'status', '--porcelain', '--untracked-files=no')) fail(`${PAGES_DIR} has uncommitted changes`);
if (!fs.existsSync(path.join(ESOBOLD_DIR, '.git'))) fail(`Esobold clone not found: ${ESOBOLD_DIR} (set ESOBOLD_DIR)`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rpmod-deploy-'));
const wt = path.join(tmp, 'esobold');
const site = path.join(tmp, 'site');
try {
    // --- 1. released Esobold in a temporary worktree ---------------------------
    console.log(`= fetching Esobold, building ${ESOBOLD_REF}`);
    git(ESOBOLD_DIR, 'fetch', '-q', 'origin');
    git(ESOBOLD_DIR, 'worktree', 'add', '-q', '--detach', wt, ESOBOLD_REF);
    const env = { ...process.env, ESOBOLD_DIR: wt, ESOLITE_DIR: site };

    // --- 2. tests against that Esobold (npm test also builds the bundle) --------
    if (skipTests) run('npm', ['run', '-s', 'build'], { cwd: ROOT, env });
    else run('npm', ['test'], { cwd: ROOT, env });

    // --- 3. the site ------------------------------------------------------------
    run('node', [path.join(__dirname, 'build-host.js')], { cwd: ROOT, env });
    run('node', [path.join(__dirname, 'build-integrated-index.js')], { cwd: ROOT, env });
    const esoboldVersion = `${ESOBOLD_REF} @ ${git(wt, 'log', '-1', '--format=%h %s')}`;

    // --- 4. into the pages clone ------------------------------------------------
    const noJunk = (src) => path.basename(src) !== '.DS_Store' && !/ \d+(\.[^/]*)?$/.test(path.basename(src));
    fs.rmSync(path.join(PAGES_DIR, 'static'), { recursive: true, force: true });
    fs.cpSync(path.join(site, 'static'), path.join(PAGES_DIR, 'static'), { recursive: true, filter: noJunk });
    fs.copyFileSync(path.join(site, 'index.rpmod.html'), path.join(PAGES_DIR, 'index.html'));
    fs.copyFileSync(path.join(site, 'index.html'), path.join(PAGES_DIR, 'esolite.html'));
    fs.copyFileSync(path.join(site, 'KLITE-RPmod.js'), path.join(PAGES_DIR, 'KLITE-RPmod.js'));
    fs.writeFileSync(path.join(PAGES_DIR, 'esobold-version.txt'), esoboldVersion + '\n');
    fs.writeFileSync(path.join(PAGES_DIR, '.nojekyll'), '');

    // --- 5. commit (and push) -----------------------------------------------------
    const rpmodVersion = require(path.join(ROOT, 'package.json')).version;
    const rpmodCommit = git(ROOT, 'log', '-1', '--format=%h');
    git(PAGES_DIR, 'add', '-A', 'index.html', 'esolite.html', 'KLITE-RPmod.js', 'esobold-version.txt', '.nojekyll', 'static');
    if (!git(PAGES_DIR, 'status', '--porcelain', '--untracked-files=no')) {
        console.log('= the site is already up to date, nothing to commit');
    } else {
        git(PAGES_DIR, 'commit', '-q', '-m',
            `Deploy: KLITE RPmod v${rpmodVersion} (${rpmodCommit}) on Esolite ${esoboldVersion}\n\n` +
            'Built by scripts/deploy-pages.js in KLITE-RPmod_development.');
        console.log(`= committed in ${PAGES_DIR}: ${git(PAGES_DIR, 'log', '-1', '--format=%h %s')}`);
    }
    if (push) {
        // origin's push URL (SSH when set); a plain https GitHub URL is pushed via SSH instead,
        // because https has no stored credentials here
        const url = git(PAGES_DIR, 'remote', 'get-url', '--push', 'origin').replace(/^https:\/\/github\.com\//, 'git@github.com:');
        run('git', ['-C', PAGES_DIR, 'push', url, PAGES_BRANCH]);
        run('git', ['-C', PAGES_DIR, 'fetch', '-q', 'origin']);
        console.log('= pushed — https://rp-lite.koboldai.net updates in about a minute');
    } else {
        console.log(`  Not pushed. Check it (python3 -m http.server --directory "${PAGES_DIR}"), then: npm run deploy:pages -- --push`);
    }
} finally {
    try { git(ESOBOLD_DIR, 'worktree', 'remove', '--force', wt); } catch (_) {}
    fs.rmSync(tmp, { recursive: true, force: true });
}
