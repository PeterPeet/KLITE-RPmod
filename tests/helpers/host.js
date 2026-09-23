'use strict';
// Fake Esolite host for tests: a jsdom window carrying the minimal host globals the mod
// hooks into, plus helpers to load mod sources into it (same way Esolite runs a usermod:
// as classic script code in the page's global scope).
const { JSDOM } = require('jsdom');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FILES = {
    worlds: 'src/KLITE-RPmod_Worlds.js',
    worldsUI: 'src/KLITE-RPmod_WorldsUI.js',
    bundle: 'KLITE-RPmod.js',
};

function createHost({ settings = {} } = {}) {
    const dom = new JSDOM(
        '<!DOCTYPE html><html><head></head><body><nav id="navbarNavDropdown"><ul></ul></nav></body></html>',
        { pretendToBeVisual: true, url: 'http://localhost/' });
    const w = dom.window;
    w.alert = () => {}; w.confirm = () => true; w.prompt = () => 'Test';
    // jsdom has no layout; the editor needs a canvas size
    w.Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 560, right: 800, bottom: 560 });

    // --- host globals (see docs/ARCHITECTURE.md "Host integration") ---
    w.current_wi = [];
    w.gametext_arr = [];
    w.update_wi = () => {};
    w.localsettings = { websearch_enabled: false, opmode: 1, ...settings };
    w.generate_savefile = () => ({ worldinfo: w.current_wi.slice(), actions: [] });
    w.kai_json_load = () => true;

    const host = { window: w, dom, prompt: '' };
    // Stands in for Esolite's `const submit_generation`: reads current_wi synchronously and
    // records what would reach the model (constant entries only).
    w.submit_generation = () => {
        let s = '';
        for (const e of w.current_wi) if (!e.widisabled && e.constant && e.content) s += e.content + '\n';
        host.prompt = s;
        return Promise.resolve();
    };
    w.prepare_submit_generation = () => w.submit_generation('');

    const ctx = vm.createContext(w);
    host.load = (...keys) => {
        for (const k of keys) {
            const rel = FILES[k] || k;
            vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
        }
        return host;
    };
    host.eval = (code) => vm.runInContext(code, ctx);

    // Deterministic Math.random inside the page context (for dice tests).
    host.seedRandom = (values) => {
        if (!w.__rng) {
            w.__rng = { values: [], i: 0 };
            host.eval('Math.random = function(){ var r = __rng; return r.values.length ? r.values[(r.i++) % r.values.length] : 0.5; };');
        }
        w.__rng.values = values; w.__rng.i = 0;
    };

    // Fire the page load event and wait until the engine (and optionally the UI) is ready.
    host.ready = async ({ ui = false } = {}) => {
        w.dispatchEvent(new w.Event('load'));
        for (let i = 0; i < 200; i++) {
            const W = w.KLITE_RPMod_Worlds;
            const engineReady = W && W._state && W._state.ready;
            const uiReady = !ui || (w.KLITE_RPMod_WorldsUI && w.document.getElementById('wm-panel'));
            if (engineReady && uiReady) return host;
            await sleep(25);
        }
        throw new Error('mod did not become ready');
    };

    host.api = () => w.KLITE_RPMod_Worlds;
    host.ui = () => w.KLITE_RPMod_WorldsUI;
    host.worldsEntries = () => w.current_wi.filter(e => e && e.wigroup === '__worlds__');
    host.close = () => { try { w.close(); } catch (_) {} };
    return host;
}

// --- DOM helpers for UI tests ---
function click(el, w) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function buttons(root) { return [...root.querySelectorAll('button')]; }
function findButton(root, re) { return buttons(root).find(b => re.test(b.textContent)); }
function texts(root) { return [...root.querySelectorAll('*')].map(e => e.textContent); }
function selectNode(host, id) {
    const w = host.window;
    const g = [...w.document.querySelectorAll('#wm-overlay g[data-id]')].find(n => n.getAttribute('data-id') === id);
    if (!g) throw new Error('node not in editor: ' + id);
    g.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
    w.dispatchEvent(new w.MouseEvent('mouseup', {}));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { createHost, click, buttons, findButton, texts, selectNode, sleep, ROOT, FILES };
