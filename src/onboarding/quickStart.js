// =============================================================================
// Extensions for Esolite's "Quick Start" (static/js/characterManager.js, by Jaxxks).
//
// Quick Start is Esolite's own way to begin a session: pick a base save, a main
// character, extra characters, a player character and world info from the Library,
// then Confirm. RPmod builds on it instead of shipping a competing setup wizard: it adds
// sections to the same popup and runs its own "apply" after Esolite's.
//
// Extension shape: { id, label, helpText, render(container, rerender), hasSelection(),
//                    apply(): Promise, clear() }
//
// Integration, in order of preference:
//   1. 'eso': Esolite's mod hook (static/js/modHooks.js, esolithe/esobold#65): each
//      extension is registered as a QuickStartExtension in window.eso.extensions; Esolite
//      renders, counts, clears and applies it (awaiting apply, reporting its errors).
//   2. 'adapter' (older hosts, e.g. Esolite 1.35.0): wrap the top-level bindings
//      showQuickStartPopup / applyQuickStartSelection / clearAllQuickStartSelections (see
//      hostGlobals.js). Esolite's own behaviour is untouched; RPmod sections are appended
//      to the popup after Esolite renders it.
// =============================================================================
import { hostGet, hostSet, esoExtensionClass } from './hostGlobals.js';

const extensions = [];
let mode = null;   // 'eso' | 'adapter' | null (Quick Start not available yet)

export function quickStartMode() { return mode; }

function registerWithEso(ext) {
    const QuickStartExtension = esoExtensionClass('QuickStartExtension', 'QUICK_START');
    window.eso.extensions.register(new QuickStartExtension(ext.id, ext.label, ext.helpText,
        (container, rerender) => ext.render(container, rerender),
        () => ext.hasSelection(),
        () => ext.apply(),
        () => ext.clear()));
}

export function registerQuickStartExtension(ext) {
    if (!ext || !ext.id || extensions.some(e => e.id === ext.id)) return;
    extensions.push(ext);
    if (mode === 'eso') registerWithEso(ext);
}

// Try to hook into Quick Start; returns true once installed (safe to call repeatedly).
export function installQuickStartHooks() {
    if (mode) return true;
    if (esoExtensionClass('QuickStartExtension', 'QUICK_START')) {
        extensions.forEach(registerWithEso);
        mode = 'eso';
        return true;
    }
    const show = hostGet('showQuickStartPopup');
    const apply = hostGet('applyQuickStartSelection');
    if (typeof show !== 'function' || typeof apply !== 'function') return false;
    if (show.__rpmodWrapped) { mode = 'adapter'; return true; }

    const wrappedShow = function () {
        const ret = show.apply(this, arguments);
        try { renderSections(); } catch (e) { console.error('[RPmod] Quick Start extension render failed', e); }
        return ret;
    };
    wrappedShow.__rpmodWrapped = true;

    // Esolite's apply returns early when none of ITS roles is selected; ours still run.
    const wrappedApply = async function () {
        await apply.apply(this, arguments);
        await applyExtensions();
    };

    const clearAll = hostGet('clearAllQuickStartSelections');
    if (!hostSet('showQuickStartPopup', wrappedShow) || !hostSet('applyQuickStartSelection', wrappedApply)) return false;
    if (typeof clearAll === 'function') {
        hostSet('clearAllQuickStartSelections', function () { clearAll.apply(this, arguments); extensions.forEach(e => { try { e.clear(); } catch (_) {} }); });
    }
    mode = 'adapter';
    return true;
}

async function applyExtensions() {
    const errors = [];
    for (const ext of extensions) {
        if (!safe(() => ext.hasSelection())) continue;
        try { await ext.apply(); }
        catch (e) { console.error('[RPmod] Quick Start extension failed:', ext.id, e); errors.push(`${ext.label}: ${e && e.message ? e.message : e}`); }
    }
    if (errors.length) {
        const handleError = hostGet('handleError');
        if (typeof handleError === 'function') handleError(errors.join('\n')); else console.error(errors.join('\n'));
    }
}

function safe(fn) { try { return fn(); } catch (_) { return false; } }

// Append one section per extension to the open Quick Start popup, using the same
// markup and classes as Esolite's own sections (createQuickStartSection).
function renderSections() {
    const popup = hostGet('popupUtils');
    const host = popup && popup.contentElem;
    if (!host) return;
    const contents = host.firstElementChild || host;
    const rerender = () => { const s = hostGet('showQuickStartPopup'); if (typeof s === 'function') s(); };
    for (const ext of extensions) {
        const section = document.createElement('div');
        section.dataset.rpmodQuickstart = ext.id;
        section.style.cssText = 'width:100%;display:flex;flex-direction:column;padding:10px;gap:8px;';
        const head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.textContent = ext.label;
        head.appendChild(title);
        if (ext.helpText) {
            const help = document.createElement('span');
            help.className = 'helpicon'; help.textContent = '?';
            const tip = document.createElement('span');
            tip.className = 'helptext'; tip.textContent = ext.helpText;
            help.appendChild(tip);
            head.appendChild(help);
        }
        section.appendChild(head);
        const body = document.createElement('div');
        body.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:8px;';
        section.appendChild(body);
        try { ext.render(body, rerender); }
        catch (e) { console.error('[RPmod] Quick Start section failed:', ext.id, e); continue; }
        contents.appendChild(section);
    }
}

// A preview tile exactly like Esolite's Quick Start tiles.
export function quickStartTile(name, onClick, empty) {
    const tile = document.createElement('span');
    tile.className = 'containAndScaleImage tile quick_start_preview_tile' + (empty ? ' quick_start_preview_tile_empty' : '');
    tile.style.backgroundImage = empty ? "url('/static/img/folder.svg')" : 'var(--img_esobold)';
    tile.title = name;
    const label = document.createElement('b');
    label.textContent = name;
    tile.appendChild(label);
    if (onClick) tile.addEventListener('click', onClick);
    return tile;
}
