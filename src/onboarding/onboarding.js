// =============================================================================
// KLITE RPmod — onboarding
// -----------------------------------------------------------------------------
// Getting started builds on Esolite instead of competing with it:
//   • Esolite's "Quick Start" (Jaxxks) stays THE way to begin a session; RPmod adds an
//     "RPmod world" section to it (quickStart.js).
//   • The RPmod Guide (chapters.js) explains RPmod's features in short chapters with
//     "Show me" highlights; its first chapters point newcomers to Esolite's AI, Library
//     and Quick Start. When Esolite has its own Guide (top bar, esolithe/esobold#67) the
//     chapters become its "RPmod" tab (a GuideExtension); otherwise RPmod shows them in
//     its own guide window (guide.js).
//   • A dismissible "New here?" card in the Adventure panel, and a ? button in its header.
// Replaces the retired GuidedRP wizard (source archived in BackupData/legacy/); saves
// that carry GuidedRP's `guided_rp` block keep it when saved again.
// Public API: window.KLITE_RPMod_Onboarding
// =============================================================================
import { el, iconText } from '../shell/dom.js';
import { createGuideView, highlight, clearHighlight } from './guide.js';
import { CHAPTERS } from './chapters.js';
import { registerQuickStartExtension, installQuickStartHooks, quickStartMode, quickStartTile } from './quickStart.js';
import { hostGet, esoExtensionClass } from './hostGlobals.js';

const GUIDE_TAB = 'rpmod-guide';   // ids are unique across all extension types; 'rpmod' is the settings tab

const WELCOME_KEY = 'KLITE.onboarding.welcome';

export default function initOnboarding() {
    'use strict';
    if (window.KLITE_RPMod_Onboarding) return;

    let guide = null;
    const esoGuide = registerEsoGuide();   // Esolite's Guide, or null (then our own window)
    const api = {
        openGuide(chapterId) {
            if (esoGuide) { window.eso.guide.open(GUIDE_TAB, chapterId || null); return true; }
            const sh = window.KLITE_RPMod_Shell; if (!sh || !guide) return false;
            if (chapterId) guide.goTo(chapterId);
            if (sh.isOpen('guide')) sh.refresh(['guide']);
            return sh.open('guide');
        },
        openQuickStart() { const fn = hostGet('showQuickStartPopup'); if (typeof fn === 'function') { fn(); return true; } return false; },
        highlight, clearHighlight,
        quickStartMode,
        guideMode: () => esoGuide ? 'eso' : 'own',
        legacySaveHookInstalled: () => legacyInstalled,
    };
    window.KLITE_RPMod_Onboarding = api;

    installLegacySavePassthrough();
    registerQuickStartExtension(rpmodWorldExtension());

    // Quick Start lives in Esolite's characterManager.js; wait until it exists.
    let qsTries = 0;
    const qsTimer = setInterval(() => { if (installQuickStartHooks() || ++qsTries > 240) clearInterval(qsTimer); }, 250);

    // Shell views once the shell is up.
    let shTries = 0;
    const shTimer = setInterval(() => {
        const sh = window.KLITE_RPMod_Shell;
        if (!sh) { if (++shTries > 300) clearInterval(shTimer); return; }
        clearInterval(shTimer);
        if (!esoGuide) { guide = createGuideView(sh); sh.registerView(guide); }
        sh.addDockAction('left', { id: 'guide', title: 'RPmod Guide', label: '?', icon: 'circle-help', onClick: () => api.openGuide() });
        if (!welcomeDismissed()) sh.registerView(welcomeView(sh, api));
    }, 100);
}

// ---- Esolite's Guide: RPmod chapters as its "RPmod" tab ------------------------------
// The chapter format is the same; only the "Show me" context differs. Ours offers
// open(viewId) / highlight / hostCall / navLink; Esolite's offers highlight / run /
// openSettings / navLink, so each action gets an adapted context.
function registerEsoGuide() {
    const GuideExtension = esoExtensionClass('GuideExtension', 'GUIDE');
    if (!GuideExtension || !window.eso.guide || typeof window.eso.guide.open !== 'function') return false;
    const adapt = (hostCtx) => ({
        open: (id) => { try { window.KLITE_RPMod_Shell?.open(id); } catch (_) {} },
        // after RPmod panels/windows opened (same delay as our own guide)
        highlight: (target, note) => setTimeout(() => hostCtx.highlight(target, note), 60),
        hostCall: (name) => hostCtx.run(() => { const fn = hostGet(name); if (typeof fn === 'function') fn(); }),
        navLink: hostCtx.navLink,
    });
    const chapters = () => CHAPTERS.map(ch => ({
        id: ch.id, title: ch.title, blocks: ch.blocks,
        show: (ch.show || []).map(s => ({ label: s.label, run: (hostCtx) => s.run(adapt(hostCtx)) })),
    }));
    return window.eso.extensions.register(new GuideExtension(GUIDE_TAB, 'RPmod', chapters)) !== false;
}

// ---- "New here?" card (left dock, top) ------------------------------------------
function welcomeDismissed() { try { return localStorage.getItem(WELCOME_KEY) === 'dismissed'; } catch (_) { return false; } }

function welcomeView(sh, api) {
    return {
        id: 'welcome', title: 'New here?', place: 'left', order: -10,
        mount(box) {
            box.appendChild(el('p', { style: 'margin:0 0 8px', text: 'RPmod turns Esolite into a tabletop roleplaying game with worlds, quests and dice. Start a session with Esolite\'s Quick Start, or read the short guide first.' }));
            box.appendChild(el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, [
                el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-grow rpm-btn-icon', onclick: () => api.openGuide('welcome') }, [iconText('book-open', 'Open the Guide')]),
                el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-grow rpm-btn-icon', onclick: () => api.openQuickStart() }, [iconText('play', 'Quick Start')]),
            ]));
            box.appendChild(el('button', {
                type: 'button', class: 'btn btn-primary rpm-btn rpm-block', style: 'margin-top:6px', text: 'Got it — hide this',
                onclick: () => { try { localStorage.setItem(WELCOME_KEY, 'dismissed'); } catch (_) {} sh.unregisterView('welcome'); }
            }));
        },
    };
}

// ---- Quick Start: "RPmod world" section -----------------------------------------
const EXAMPLE_ID = 'world_example';

function rpmodWorldExtension() {
    let selection = null;   // { id, name, example? }
    let choosing = false;
    const W = () => window.KLITE_RPMod_Worlds;

    return {
        id: 'rpmod-world', label: 'RPmod world (optional)',
        helpText: 'Play in an RPmod world: places, people, quests and combat that the AI game master follows. Confirm enables it for this story. New? Choose the example "Eldoria".',
        hasSelection: () => !!selection,
        clear: () => { selection = null; choosing = false; },
        render(body, rerender) {
            const grid = el('div', { class: 'quick_start_preview_grid' });
            grid.appendChild(selection
                ? quickStartTile(selection.name, () => { selection = null; rerender(); })
                : quickStartTile('(none selected)', null, true));
            if (selection) grid.firstChild.title = `${selection.name} (click to deselect)`;
            body.appendChild(grid);

            if (choosing) {
                const list = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' });
                const worlds = (W() && W().listWorlds()) || [];
                const options = worlds.map(w => ({ id: w.id, name: w.name || w.id }));
                if (!options.some(o => o.id === EXAMPLE_ID)) options.unshift({ id: EXAMPLE_ID, name: 'Eldoria (example world)', example: true });
                for (const o of options) {
                    list.appendChild(el('button', { type: 'button', class: 'btn btn-primary', text: o.name, onclick: () => { selection = o; choosing = false; rerender(); } }));
                }
                body.appendChild(list);
            }
            body.appendChild(el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, [
                el('button', { type: 'button', class: 'btn btn-primary', text: choosing ? 'Cancel' : 'Choose world', onclick: () => { choosing = !choosing; rerender(); } }),
                el('button', { type: 'button', class: 'btn btn-primary', text: 'Clear', onclick: () => { selection = null; choosing = false; rerender(); } }),
                el('button', { type: 'button', class: 'btn btn-primary', text: 'What is RPmod?', onclick: () => { const p = hostGet('popupUtils'); if (p && p.reset) p.reset(); window.KLITE_RPMod_Onboarding.openGuide('welcome'); } }),
            ]));
        },
        async apply() {
            const A = W();
            if (!A) throw new Error('Worlds engine not loaded');
            const sel = selection;
            if (sel.id === EXAMPLE_ID && !A.hasExample()) await A.loadExample();
            else A.useWorld(sel.id);
            A.enable();
            // a newcomer should start somewhere: no current place yet -> the first location
            if (!(A.runtime && A.runtime.playerLocationId)) {
                const first = A.getGraph().nodes.find(n => n.type === 'location');
                if (first) A.moveTo(first.id);
            }
            selection = null;
            try { window.KLITE_RPMod_Shell && window.KLITE_RPMod_Shell.open('world'); } catch (_) {}
        },
    };
}

// ---- GuidedRP retirement: keep its save block ----------------------------------
// Saves written by the old GuidedRP wizard contain `guided_rp`. Without GuidedRP nothing
// would write it back, so we remember the block when a save is loaded and re-attach it
// when the story is saved again (never lose data the user already has).
let legacyInstalled = false;
function installLegacySavePassthrough() {
    let legacy = null;
    let tries = 0;
    const timer = setInterval(() => {
        const save = window.generate_savefile, load = window.kai_json_load;
        if (typeof save !== 'function' || typeof load !== 'function') { if (++tries > 300) clearInterval(timer); return; }
        clearInterval(timer);
        if (!save.__rpmodLegacy) {
            const wrappedSave = function () {
                const obj = save.apply(this, arguments);
                try { if (legacy && obj && typeof obj === 'object' && !obj.guided_rp) obj.guided_rp = legacy; } catch (_) {}
                return obj;
            };
            wrappedSave.__rpmodLegacy = true;
            window.generate_savefile = wrappedSave;
        }
        if (!load.__rpmodLegacy) {
            const wrappedLoad = function (storyobj) {
                try { legacy = (storyobj && storyobj.guided_rp) ? storyobj.guided_rp : null; } catch (_) {}
                return load.apply(this, arguments);
            };
            wrappedLoad.__rpmodLegacy = true;
            window.kai_json_load = wrappedLoad;
        }
        legacyInstalled = true;
    }, 100);
}
