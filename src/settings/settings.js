// =============================================================================
// KLITE RPmod — Settings: an "RPmod" tab in Esolite's own Settings dialog
// -----------------------------------------------------------------------------
// Built exactly like Esobold's own "Agent" / "Esobold" tabs (static/js/newMenuOptions.js,
// createNewSettingsSection): an <li id="settingsmenu<id>_tab"> in .settingsnav and a
// <div id="settingsmenu<id>" class="settingsmenu hidden"> with a .settingitem.wide box;
// rows use Esolite's .settinglabel / .settingsmall / .helpicon markup. Esolite's
// display_settings_tab(index) shows it (it resolves the pane from the li id).
//
// Values live in `localsettings` (keys `rpmod_<id>`) like Esolite's own options: the
// dialog is filled on display_settings, written on OK (confirm_settings, which also saves
// them), and Cancel discards the edits. Esolite keeps unknown localsettings keys.
//
// Modules register options: registerSetting({ id, section, label, help, default }) (bool),
// or a free-form block: registerBlock({ id, section, mount(container) }).
// Public API: window.KLITE_RPMod_Settings.
// =============================================================================
import { el, clear } from '../shell/dom.js';

const TAB_ID = 'rpmod';
const PANE_ID = 'settingsmenu' + TAB_ID;

export default function initSettings() {
    'use strict';
    if (window.KLITE_RPMod_Settings) return;

    const settings = new Map();   // id -> { id, section, label, help, default, order }
    const blocks = new Map();     // id -> { id, section, mount, order }
    const listeners = new Map();  // id -> [fn]
    const SECTION_ORDER = ['Worlds', 'Characters', 'Display', 'Debug & compatibility'];

    const key = (id) => 'rpmod_' + id;
    function get(id) {
        const s = settings.get(id);
        try {
            const v = window.localsettings && window.localsettings[key(id)];
            if (v !== undefined) return v;
        } catch (_) {}
        return s ? s.default : undefined;
    }
    // Programmatic change (tests, other UI); the dialog uses OK/Cancel instead.
    function set(id, value) {
        try { if (window.localsettings) window.localsettings[key(id)] = value; } catch (_) {}
        try { window.save_settings?.(); } catch (_) {}
        notify(id, value);
    }
    function notify(id, value) { for (const fn of listeners.get(id) || []) { try { fn(value); } catch (e) { console.error('[RPmod settings]', id, e); } } }
    function onChange(id, fn) { if (!listeners.has(id)) listeners.set(id, []); listeners.get(id).push(fn); }

    function registerSetting(def) {
        if (!def || !def.id || !def.label) throw new Error('KLITE_RPMod_Settings.registerSetting: need { id, label }');
        settings.set(def.id, Object.assign({ section: 'General', help: '', default: false, order: 100 }, def));
        rebuildIfOpen();
        return api;
    }
    function registerBlock(def) {
        if (!def || !def.id || typeof def.mount !== 'function') throw new Error('KLITE_RPMod_Settings.registerBlock: need { id, mount }');
        blocks.set(def.id, Object.assign({ section: 'General', order: 100 }, def));
        rebuildIfOpen();
        return api;
    }

    // ---- the tab --------------------------------------------------------------------
    function nav() { return document.querySelector('#settingscontainer .settingsnav'); }
    function body() { return document.querySelector('#settingscontainer .settingsbody'); }

    function ensureTab() {
        const n = nav(), b = body();
        if (!n || !b) return null;
        let pane = document.getElementById(PANE_ID);
        if (pane) return pane;
        pane = el('div', { id: PANE_ID, class: 'settingsmenu hidden' }, [el('div', { class: 'settingitem wide' })]);
        b.appendChild(pane);
        const link = el('a', { text: 'RPmod', title: 'RPmod' });
        // index computed on click: tabs added after ours must not break it
        link.addEventListener('click', () => {
            const idx = [...nav().querySelectorAll(':scope > li')].indexOf(li);
            if (idx >= 0 && typeof window.display_settings_tab === 'function') window.display_settings_tab(idx);
        });
        const li = el('li', { id: PANE_ID + '_tab' }, [link]);
        n.appendChild(li);
        render();
        return pane;
    }

    function sectionsInOrder() {
        const names = new Set([...settings.values(), ...blocks.values()].map(x => x.section));
        return [...names].sort((a, b) => {
            const ia = SECTION_ORDER.indexOf(a), ib = SECTION_ORDER.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        });
    }

    function boolRow(s) {
        const label = el('div', { class: 'justifyleft settingsmall' }, [s.label + ' ']);
        if (s.help) label.appendChild(el('span', { class: 'helpicon', text: '?' }, [el('span', { class: 'helptext', text: s.help })]));
        const input = el('input', { type: 'checkbox', id: 'rpmodset_' + s.id, title: s.label, 'data-rpmod-setting': s.id, style: 'margin:0px 0px 0px auto;' });
        return el('div', { class: 'settinglabel' }, [label, input]);
    }

    function render() {
        const pane = document.getElementById(PANE_ID); if (!pane) return;
        const box = pane.querySelector('.settingitem'); clear(box);
        let first = true;
        for (const section of sectionsInOrder()) {
            const h = el('h3', { text: section }); if (first) h.style.marginTop = '4px'; first = false;
            box.appendChild(h);
            const items = [...[...settings.values()].filter(s => s.section === section).map(s => ({ kind: 'bool', x: s })),
                ...[...blocks.values()].filter(b => b.section === section).map(b => ({ kind: 'block', x: b }))]
                .sort((a, b) => (a.x.order - b.x.order) || String(a.x.id).localeCompare(String(b.x.id)));
            for (const it of items) {
                if (it.kind === 'bool') box.appendChild(boolRow(it.x));
                else {
                    const c = el('div', { id: 'rpmod-settings-' + it.x.id, 'data-rpmod-block': it.x.id });
                    box.appendChild(c);
                    try { it.x.mount(c); } catch (e) { console.error('[RPmod settings] block failed:', it.x.id, e); }
                }
            }
        }
        fill();
    }
    function rebuildIfOpen() { if (document.getElementById(PANE_ID)) render(); }

    // dialog <- localsettings
    function fill() {
        for (const s of settings.values()) {
            const input = document.getElementById('rpmodset_' + s.id);
            if (input) input.checked = !!get(s.id);
        }
    }
    // localsettings <- dialog (on OK)
    function apply() {
        for (const s of settings.values()) {
            const input = document.getElementById('rpmodset_' + s.id);
            if (!input) continue;
            const before = !!get(s.id), now = !!input.checked;
            try { if (window.localsettings) window.localsettings[key(s.id)] = now; } catch (_) {}
            if (before !== now) notify(s.id, now);
        }
    }

    // ---- hooks into Esolite's dialog ---------------------------------------------------
    let hooked = false;
    function install() {
        if (hooked) return true;
        if (typeof window.display_settings !== 'function' || typeof window.confirm_settings !== 'function') return false;
        const origDisplay = window.display_settings;
        window.display_settings = function () {
            const r = origDisplay.apply(this, arguments);
            try { ensureTab(); fill(); } catch (e) { console.error('[RPmod settings]', e); }
            return r;
        };
        const origConfirm = window.confirm_settings;
        window.confirm_settings = function () {
            try { apply(); } catch (e) { console.error('[RPmod settings]', e); }
            return origConfirm.apply(this, arguments);   // Esolite saves localsettings
        };
        hooked = true;
        return true;
    }

    const api = { registerSetting, registerBlock, get, set, onChange, install, paneId: PANE_ID, open: () => { window.display_settings?.(); const li = document.getElementById(PANE_ID + '_tab'); li?.querySelector('a')?.click(); } };
    window.KLITE_RPMod_Settings = api;

    let tries = 0;
    const attempt = () => { if (!install() && ++tries < 120) setTimeout(attempt, 500); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt);
}
