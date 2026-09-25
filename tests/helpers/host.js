'use strict';
// Fake Esolite host for tests: a jsdom window carrying the minimal host globals the mod
// hooks into, plus helpers to load mod sources into it (same way Esolite runs a usermod:
// as classic script code in the page's global scope). Single src/ modules are bundled
// on the fly with esbuild into a classic script that calls their init function.
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { ESOBOLD_DIR } = require('../../scripts/esolite-paths');
const FILES = {
    shell: 'src/shell/shell.js',
    worlds: 'src/KLITE-RPmod_Worlds.js',
    worldsUI: 'src/KLITE-RPmod_WorldsUI.js',
    onboarding: 'src/onboarding/onboarding.js',
    library: 'src/library/esoliteLibrary.js',
    settings: 'src/settings/settings.js',
    gamelog: 'src/game/log.js',
    characters: 'src/characters/characters.js',
    chat: 'src/chat/slash.js',
    bundle: 'KLITE-RPmod.js',
};

function createHost({ settings = {} } = {}) {
    const dom = new JSDOM(
        '<!DOCTYPE html><html><head></head><body><div id="maincontainer"><nav id="navbarNavDropdown"><ul></ul></nav><div id="gametext"></div></div></body></html>',
        { pretendToBeVisual: true, url: 'http://localhost/', runScripts: 'outside-only' });
    const w = dom.window;
    // desktop-sized viewport (jsdom defaults to 1024x768); tests can call host.resize()
    Object.defineProperty(w, 'innerWidth', { value: 1400, writable: true, configurable: true });
    Object.defineProperty(w, 'innerHeight', { value: 900, writable: true, configurable: true });
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

    // jsdom's own VM context: page intrinsics (Function, eval) belong to the window realm,
    // so `new Function` code sees top-level let bindings of other scripts, as in a browser.
    const ctx = dom.getInternalVMContext();
    host.load = (...keys) => {
        for (const k of keys) {
            const rel = FILES[k] || k;
            vm.runInContext(scriptFor(rel), ctx, { filename: rel });
        }
        return host;
    };
    host.eval = (code) => vm.runInContext(code, ctx);

    // Stand-in for Esolite's Quick Start (static/js/characterManager.js): like the real
    // one, its functions are top-level `let` bindings (not window properties) and the popup
    // content lives in popupUtils.contentElem. Records calls in window.__qs.
    host.installFakeQuickStart = () => host.eval(`
        var __qs = { applied: 0, cleared: 0 };
        let popupUtils = {
            contentElem: null,
            reset() { const o = document.getElementById('popupContainer'); if (o) o.remove(); this.contentElem = null; return this; },
        };
        let clearAllQuickStartSelections = () => { __qs.cleared++; };
        let applyQuickStartSelection = async () => { __qs.applied++; };
        let showQuickStartPopup = () => {
            popupUtils.reset();
            const pop = document.createElement('div'); pop.id = 'popupContainer';
            const content = document.createElement('div'); content.className = 'popupContent';
            const contents = document.createElement('div'); contents.textContent = 'Quick Start';
            content.appendChild(contents); pop.appendChild(content);
            const footer = document.createElement('div'); footer.className = 'popupfooter';
            const confirm = document.createElement('button'); confirm.textContent = 'Confirm';
            confirm.onclick = async () => { popupUtils.reset(); await applyQuickStartSelection(); };
            const clear = document.createElement('button'); clear.textContent = 'Clear all';
            clear.onclick = () => { clearAllQuickStartSelections(); showQuickStartPopup(); };
            footer.append(confirm, clear); pop.appendChild(footer);
            document.body.appendChild(pop);
            popupUtils.contentElem = content;
        };
        window.showQuickStartPopup = showQuickStartPopup;
    `);

    // Stand-in for Esolite 1.35's Library storage (index.html): id-based records under
    // `character_<id>`, the `let allCharacterNames` list, updateCharacterListFromAll() that
    // drops entries without an id, and indexeddb_save/load that leave a localStorage marker
    // per key like the real ones. Records live in window.__idb (a Map).
    host.installFakeLibrary = () => host.eval(`
        const STORAGE_PREFIX = 'kaihordewebui_';
        var __idb = new Map();
        let allCharacterNames = [];
        function indexeddb_save(k, v) { v = v ? String(v) : ''; __idb.set(k, v); localStorage.setItem(STORAGE_PREFIX + k, 'offload_to_indexeddb'); return Promise.resolve(); }
        function indexeddb_load(k, d) { return Promise.resolve(__idb.has(k) ? __idb.get(k) : d); }
        function normalizeCharacterStorageName(v, f = 'Untitled') { let n = String(v || '').replaceAll(/[^\\w()_\\-'",!\\[\\].]/g, ' ').replaceAll(/\\s+/g, ' ').trim(); return n || f; }
        function getCharacterStorageKey(id) { return 'character_' + id; }
        function findCharacterMetaById(id) { return allCharacterNames.find(m => String(m && m.id || '') === String(id || '')); }
        function findCharacterMetaByName(n) { const t = normalizeCharacterStorageName(n); return allCharacterNames.find(m => normalizeCharacterStorageName(m && m.name) === t); }
        function getNextAutoincrementName(p) { const b = normalizeCharacterStorageName(p); const used = new Set(allCharacterNames.map(m => normalizeCharacterStorageName(m && m.id))); if (!used.has(b)) return b; let i = 1; while (used.has(b + '_' + i)) i++; return b + '_' + i; }
        function resolveCharacterNameAndId(raw, f = 'Untitled') { let n = normalizeCharacterStorageName(raw, f); let ex = findCharacterMetaByName(n); if (ex) { n = getNextAutoincrementName(n); ex = undefined; } return { name: n, id: n, existingMeta: ex }; }
        function upsertCharacterMetadata(meta) { if (!meta || !meta.id || !meta.name) return; const i = allCharacterNames.findIndex(e => String(e && e.id || '') === String(meta.id)); const fav = i >= 0 ? !!allCharacterNames[i].favorite : !!meta.favorite; const next = Object.assign({}, meta, { favorite: fav }); if (i >= 0) allCharacterNames[i] = next; else allCharacterNames.push(next); }
        function updateCharacterListFromAll() { const m = new Map(); for (const e of allCharacterNames) { if (!e || !e.id || !e.name) continue; m.set(e.id, Object.assign({}, m.get(e.id) || {}, e)); } allCharacterNames = [...m.values()].sort((a, b) => a.name > b.name ? 1 : -1); return indexeddb_save('characterList', JSON.stringify(allCharacterNames)); }
        function getCharacterData(n) { const meta = findCharacterMetaById(n) || findCharacterMetaByName(n); const k = getCharacterStorageKey(meta ? meta.id : normalizeCharacterStorageName(n)); return indexeddb_load(k, '{}').then(r => JSON.parse(r || '{}')); }
        async function __addEsoCharacter(name, inner, extra) { const id = normalizeCharacterStorageName(name); await indexeddb_save('character_' + id, JSON.stringify(Object.assign({ id, name: id, data: Object.assign({ name: id }, inner) }, extra || {}))); upsertCharacterMetadata({ id, name: id, type: 'Character' }); await updateCharacterListFromAll(); return id; }
        window.__lib = () => allCharacterNames;
    `);

    // Stand-in for Esolite's Settings dialog: #settingscontainer with .settingsnav tabs and
    // .settingsbody panes, display_settings / display_settings_tab / confirm_settings (OK,
    // which saves localsettings) like index.html + Esobold's newMenuOptions.js. Records
    // saves in window.__settingsSaved.
    host.installFakeSettingsDialog = () => host.eval(`
        var __settingsSaved = 0;
        (function () {
            const c = document.createElement('div'); c.id = 'settingscontainer'; c.className = 'popupcontainer hidden';
            c.innerHTML = '<ul class="settingsnav"></ul><div class="settingsbody"></div>';
            document.body.appendChild(c);
            for (const [id, label] of [['general', 'General'], ['advanced', 'Misc'], ['esobold', 'Esobold']]) {
                const li = document.createElement('li'); li.id = 'settingsmenu' + id + '_tab';
                const a = document.createElement('a'); a.textContent = label; li.appendChild(a);
                c.querySelector('.settingsnav').appendChild(li);
                const pane = document.createElement('div'); pane.id = 'settingsmenu' + id; pane.className = 'settingsmenu hidden';
                c.querySelector('.settingsbody').appendChild(pane);
            }
        })();
        function display_settings() { document.getElementById('settingscontainer').classList.remove('hidden'); }
        function display_settings_tab(i) {
            const nav = document.querySelector('#settingscontainer .settingsnav');
            document.querySelectorAll('#settingscontainer .settingsmenu').forEach(e => e.classList.add('hidden'));
            const li = nav.querySelector(':nth-child(' + (i + 1) + ')');
            document.getElementById(li.id.replace(/_tab$/, '')).classList.remove('hidden');
            window.__settingsTab = i;
        }
        function save_settings() { __settingsSaved++; }
        function confirm_settings() { save_settings(); document.getElementById('settingscontainer').classList.add('hidden'); }
    `);

    // Stand-in for Esolite's mod hooks (Esobold static/js/modHooks.js, esoGuide.js and the
    // settings-tab code in newMenuOptions.js): window.eso.extensions with the extension
    // classes, one EsoExtensionType per supported feature, and window.eso.guide (records
    // open calls in window.__eso.guideOpened). With settings: true, call
    // installFakeSettingsDialog first; display_settings then builds each SettingsExtension's
    // tab (#settingsmenuext_<id>), calls render once and load every time, confirm_settings
    // calls save.
    host.installFakeEsoHooks = ({ quickStart = false, settings = false, guide = false } = {}) => host.eval(`
        var __eso = { guideOpened: [] };
        window.eso = window.eso || {};
        class EsoExtensionType { constructor(type) { this.type = type; } }
        ${quickStart ? "EsoExtensionType.QUICK_START = new EsoExtensionType('QUICK_START');" : ''}
        ${settings ? "EsoExtensionType.SETTINGS = new EsoExtensionType('SETTINGS');" : ''}
        ${guide ? "EsoExtensionType.GUIDE = new EsoExtensionType('GUIDE');" : ''}
        class EsoExtensions {
            constructor() { this._list = []; }
            register(ext) { if (!ext || !ext.id || this._list.some(e => e.id === ext.id)) return false; this._list.push(ext); return true; }
            unregister(id) { this._list = this._list.filter(e => e.id !== id); }
            getByType(type) { return this._list.filter(e => e.type === type); }
        }
        class EsoExtension {
            constructor(id, type) { this.id = id; this.type = type; this.label = null; }
            getId() { return this.id; }
            getLabel() { return this.label || this.id; }
        }
        class QuickStartExtension extends EsoExtension {
            constructor(id, label, helpText, render, hasSelection, apply, clear) {
                super(id, EsoExtensionType.QUICK_START);
                Object.assign(this, { label, helpText, _render: render, _hasSelection: hasSelection, _apply: apply, _clear: clear });
            }
            render(c, rerender) { return this._render(c, rerender); }
            hasSelection() { return !!this._hasSelection(); }
            apply() { return this._apply(); }
            clear() { return this._clear(); }
        }
        class SettingsExtension extends EsoExtension {
            constructor(id, label, render, load, save) {
                super(id, EsoExtensionType.SETTINGS);
                Object.assign(this, { label, _render: render, _load: load, _save: save });
            }
            render(c, ui) { return this._render(c, ui); }
            load() { return this._load(); }
            save() { return this._save(); }
        }
        class GuideExtension extends EsoExtension {
            constructor(id, label, chapters) { super(id, EsoExtensionType.GUIDE); this.label = label; this._chapters = chapters; }
            getChapters() { return typeof this._chapters === 'function' ? this._chapters() : this._chapters; }
        }
        window.eso.extensions = new EsoExtensions();
        ${guide ? "window.eso.guide = { open(tab, chapter) { __eso.guideOpened.push([tab, chapter]); } };" : ''}
        ${settings ? `
        (function () {
            const built = new Set();
            const origDisplay = display_settings, origConfirm = confirm_settings;
            const exts = () => window.eso.extensions.getByType(EsoExtensionType.SETTINGS);
            display_settings = function () {
                exts().filter(ext => !built.has(ext.id)).forEach(ext => {
                    const li = document.createElement('li'); li.id = 'settingsmenuext_' + ext.id + '_tab';
                    const a = document.createElement('a'); a.textContent = ext.getLabel(); li.appendChild(a);
                    document.querySelector('#settingscontainer .settingsnav').appendChild(li);
                    const pane = document.createElement('div'); pane.id = 'settingsmenuext_' + ext.id; pane.className = 'settingsmenu hidden';
                    const box = document.createElement('div'); box.className = 'settingitem wide'; pane.appendChild(box);
                    document.querySelector('#settingscontainer .settingsbody').appendChild(pane);
                    ext.render(box, {});
                    built.add(ext.id);
                });
                origDisplay();
                exts().forEach(ext => ext.load());
            };
            confirm_settings = function () { exts().forEach(ext => ext.save()); origConfirm(); };
        })();` : ''}
    `);

    // Esolite's real tavernTool.js (PNG tEXt card embedding) from the Esobold clone
    // (scripts/esolite-paths.js; not copied into this repo).
    host.installTavernTool = () => {
        const file = path.join(ESOBOLD_DIR, 'embd_res', 'js', 'tavernTool.js');
        if (!fs.existsSync(file)) throw new Error(`Esobold clone not found (${file}); clone esolithe/esobold next to this repo or set ESOBOLD_DIR`);
        const src = fs.readFileSync(file, 'utf8');
        vm.runInContext(src, ctx, { filename: 'tavernTool.js' });
    };

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

    host.resize = async (width, height = w.innerHeight) => {
        w.innerWidth = width; w.innerHeight = height;
        w.dispatchEvent(new w.Event('resize'));
        await sleep(120);   // shell debounces resize
    };
    host.shell = () => w.KLITE_RPMod_Shell;
    host.api = () => w.KLITE_RPMod_Worlds;
    host.ui = () => w.KLITE_RPMod_WorldsUI;
    host.worldsEntries = () => w.current_wi.filter(e => e && e.comment === '__rpmod__:worlds');
    host.close = () => { try { w.close(); } catch (_) {} };
    return host;
}

// Classic-script source for a file: the bundle as-is; a src/ module wrapped so it runs its
// default-exported init function (cached per test process).
const scriptCache = new Map();
function scriptFor(rel) {
    if (!rel.startsWith('src/')) return fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!scriptCache.has(rel)) {
        const out = esbuild.buildSync({
            stdin: { contents: `import init from './${rel}'; init();`, resolveDir: ROOT },
            bundle: true, format: 'iife', write: false, logLevel: 'error',
        });
        scriptCache.set(rel, out.outputFiles[0].text);
    }
    return scriptCache.get(rel);
}

// --- DOM helpers for UI tests ---
function click(el, w) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function buttons(root) { return [...root.querySelectorAll('button')]; }
function findButton(root, re) { return buttons(root).find(b => re.test(b.textContent)); }
function texts(root) { return [...root.querySelectorAll('*')].map(e => e.textContent); }
function selectNode(host, id) {
    const w = host.window;
    const g = [...w.document.querySelectorAll('#wm-editor g[data-id]')].find(n => n.getAttribute('data-id') === id);
    if (!g) throw new Error('node not in editor: ' + id);
    g.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
    w.dispatchEvent(new w.MouseEvent('mouseup', {}));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { createHost, click, buttons, findButton, texts, selectNode, sleep, ROOT, FILES };
