// =============================================================================
// KLITE RPmod — Adventures (R8): bundled adventure packages, the loader and the pregen picker.
// -----------------------------------------------------------------------------
// window.KLITE_RPMod_Adventures = { list, get, register, validate, pregens, installPregens,
//                                   start, open }
// "Play an adventure": choose a pregenerated character → RPmod adds the pregens that are not in
// Esolite's Library yet (found again by extensions.klite_rpmod.pregen, never overwritten), starts a new
// session with the adventure's opening, begins its world at its start (Player view) and makes the
// chosen pregen your persona. Format and checks: adventure-rules.js; design:
// docs/design/R8-starter-adventure.md. Everything shown is built with textContent.
// =============================================================================
import { el, clear, iconText } from '../shell/dom.js';
import * as AR from './adventure-rules.js';
import * as EL from '../library/esoliteLibrary.js';
import { drownedLantern } from './content/drowned-lantern.js';

// Bundled adventures (R8): original content, SRD 5.2.1 only.
const BUNDLED = [drownedLantern()];

const PREGEN_KEY = 'KLITE.adventures.pregens';   // { 'adventure/pregen': Library id } — found faster next time

export default function initAdventures() {
    if (window.KLITE_RPMod_Adventures) return;
    const registry = new Map();
    const Worlds = () => window.KLITE_RPMod_Worlds;
    const Shell = () => window.KLITE_RPMod_Shell;
    const deepClone = (o) => JSON.parse(JSON.stringify(o));
    const V = { box: null, adventure: null, pregen: null, busy: false, msg: '' };

    function register(pkg) {
        const res = AR.validateAdventure(pkg);
        if (!res.ok) { try { console.error('[RPmod adventures] not registered:', pkg && pkg.id, res.errors); } catch (_) {} return res; }
        registry.set(pkg.id, pkg);
        if (V.box) render();
        try { window.dispatchEvent(new CustomEvent('klite:adventures-change')); } catch (_) {}
        return res;
    }
    for (const p of BUNDLED) register(p);

    const get = (id) => (id && typeof id === 'object' ? id : registry.get(id)) || null;
    function list() {
        return [...registry.values()].map(p => ({ id: p.id, title: p.title, summary: p.summary || '', levels: (p.levels || []).slice(),
            pregens: AR.pregens(p).map(g => ({ id: g.id, name: g.name, line: g.line, pronouns: g.pronouns })) }));
    }

    // ---- pregens in Esolite's Library --------------------------------------------------------
    function remembered() { try { return JSON.parse(localStorage.getItem(PREGEN_KEY) || '{}') || {}; } catch (_) { return {}; } }
    function remember(key, id) { try { const m = remembered(); m[key] = id; localStorage.setItem(PREGEN_KEY, JSON.stringify(m)); } catch (_) {} }
    const isPregen = (rec, advId, pregenId) => { const r = rec && rec.data && rec.data.extensions && rec.data.extensions.klite_rpmod; return !!(r && r.adventure === advId && r.pregen === pregenId); };

    // The Library entry of a pregen, or null: the remembered id first, then entries named like it.
    async function findPregen(advId, g) {
        const metas = EL.characterList();
        const key = `${advId}/${g.id}`;
        const rid = remembered()[key];
        const byId = rid && metas.find(m => `${m.id}` === `${rid}`);
        if (byId) { const rec = await EL.loadCharacter(byId.name); if (isPregen(rec, advId, g.id)) return { id: byId.id, name: byId.name }; }
        const base = String(g.name).toLowerCase();
        for (const m of metas) {
            const n = String(m.name || '').toLowerCase();
            if (n !== base && !n.startsWith(base + '_') && !n.startsWith(base + ' ')) continue;
            const rec = await EL.loadCharacter(m.name);
            if (isPregen(rec, advId, g.id)) { remember(key, m.id); return { id: m.id, name: m.name }; }
        }
        return null;
    }
    // Add the adventure's pregens that are missing. Existing cards are never touched: a pregen you
    // played keeps its sheet (level, HP, items). → { [pregen id]: { id, name, added } }
    async function installPregens(idOrPkg) {
        const pkg = get(idOrPkg); if (!pkg) throw new Error('unknown adventure');
        const out = {};
        for (const g of AR.pregens(pkg)) {
            const found = await findPregen(pkg.id, g);
            if (found) { out[g.id] = Object.assign(found, { added: false }); continue; }
            const saved = await EL.saveCharacter({ inner: deepClone(g.card.data) });
            remember(`${pkg.id}/${g.id}`, saved.id);
            out[g.id] = { id: saved.id, name: saved.name, added: true };
        }
        return out;
    }

    // ---- the world ---------------------------------------------------------------------------
    // The Library copy of the adventure's world: the one already installed for this adventure and
    // version, else a new entry (never overwriting a world with the same id). Pregen links become
    // Library links.
    async function installWorld(pkg, cards) {
        const A = Worlds(); if (!A) throw new Error('Worlds engine not loaded');
        const lib = A.library || {};
        const version = Number(pkg.version) || 1;
        let id = Object.keys(lib).find(k => lib[k] && lib[k].adventure && lib[k].adventure.id === pkg.id && Number(lib[k].adventure.version) === version) || null;
        let w;
        if (id) w = lib[id];
        else {
            w = deepClone(pkg.world);
            w.adventure = { id: pkg.id, version };
            if (lib[w.id]) { let n = 2; while (lib[`${w.id}_${n}`]) n++; w.id = `${w.id}_${n}`; w.name = `${w.name} (${n})`; }
        }
        for (const p of (w.npcs || [])) {
            const pid = p.characterRef && p.characterRef.pregen; const c = pid && cards[pid];
            if (c) p.characterRef = { source: 'library', id: c.id, name: c.name, pregen: pid };
        }
        if (id) await A.saveActiveWorld?.(); else id = await A.importWorld(w, { activate: false });
        return id;
    }

    // ---- start ---------------------------------------------------------------------------------
    // opts: { pregen, hero, confirm = true }. `hero`: play with a character of your own from the
    // Library (its name) instead of a pregen. Starts a new session: the current story is replaced.
    async function start(idOrPkg, opts = {}) {
        const pkg = get(idOrPkg); if (!pkg) throw new Error('unknown adventure');
        const A = Worlds(); if (!A) throw new Error('Worlds engine not loaded');
        const check = AR.validateAdventure(pkg);
        if (!check.ok) throw new Error('adventure is broken: ' + check.errors[0]);
        const offered = AR.pregens(pkg);
        const hero = opts.hero ? String(opts.hero) : '';
        const g = hero ? null : (offered.find(x => x.id === opts.pregen) || offered[0]);
        if (!g && !hero) throw new Error('adventure has no pregenerated characters');
        const who = hero || g.name;
        const story = Array.isArray(window.gametext_arr) ? window.gametext_arr.length : 0;
        if (opts.confirm !== false && story > 0 && !window.confirm(`Start "${pkg.title}" as ${who}? This begins a new session: the current story is replaced (save it first to keep it).`)) return { cancelled: true };

        const cards = await installPregens(pkg);
        const worldId = await installWorld(pkg, cards);

        // a new session with the adventure's opening, then the world begins at its start: the
        // opening is already in the chat, so it is never read as tags
        try { if (typeof window.restart_new_game === 'function') window.restart_new_game(false); else window.gametext_arr = []; } catch (_) { window.gametext_arr = []; }
        const opening = String((pkg.start && pkg.start.opening) || '').trim();
        if (opening) { window.gametext_arr = [opening]; }
        try { window.render_gametext?.(true); } catch (_) {}

        A.useWorld(worldId, { fresh: true });
        if (g) A.setFlag(`pregen_${g.id}`, true);     // the world can hide or change the chosen pregen's person
        A.commitToBase();                              // … and that is part of the start state
        A.enable();

        // the chosen pregen (or your own hero) is your persona (as the gallery's "Play as")
        const me = g ? cards[g.id] : { name: hero };
        try {
            const T = window.KLITE_RPMod && window.KLITE_RPMod.panels && window.KLITE_RPMod.panels.TOOLS;
            const rec = await EL.loadCharacter(me.name);
            const d = (rec && rec.data) || (g ? deepClone(g.card.data) : { name: hero });
            if (T && T.usePersona) T.usePersona(Object.assign({}, d, { name: d.name || me.name, image: rec && rec.image || null, avatar: rec && rec.image || null, rawData: { data: d } }));
        } catch (e) { try { console.error('[RPmod adventures] persona', e); } catch (_) {} }

        const view = (pkg.start && pkg.start.view) || (A.worldStart(worldId) || {}).view;
        try { if (view) window.KLITE_RPMod_WorldsUI?.setUiMode(view); } catch (_) {}
        try { Shell()?.close('adventure'); Shell()?.open('world'); } catch (_) {}
        return { worldId, persona: me.name, pregens: cards };
    }

    // The adventure the active world belongs to, and the pregen the persona is (null: own hero).
    async function current() {
        const A = Worlds(); const w = A && A.activeWorld && A.activeWorld();
        const pkg = w && w.adventure ? registry.get(w.adventure.id) : null; if (!pkg) return null;
        const T = window.KLITE_RPMod && window.KLITE_RPMod.panels && window.KLITE_RPMod.panels.TOOLS;
        const persona = T && T.personaEnabled && T.selectedPersona ? T.selectedPersona.name : '';
        let pregen = null;
        if (persona) { const rec = await EL.loadCharacter(persona); const r = rec && rec.data && rec.data.extensions && rec.data.extensions.klite_rpmod; if (r && r.adventure === pkg.id && r.pregen) pregen = r.pregen; }
        return { id: pkg.id, title: pkg.title, persona, pregen };
    }
    // Start the current adventure again (after a game over): everyone back at full HP, a new
    // session, the world at its start, the same character (or `hero`). opts.resetPregens: the
    // adventure's pregens in the Library get their starting sheets back (level 1) — asked for.
    async function restart(opts = {}) {
        const cur = await current(); if (!cur) throw new Error('the active world is not an adventure');
        const A = Worlds(); try { A.reviveParty(); } catch (_) {}
        if (opts.resetPregens) {
            const pkg = registry.get(cur.id); const C = window.KLITE_RPMod_Characters;
            for (const g of AR.pregens(pkg)) {
                const found = await findPregen(pkg.id, g);
                if (found && C && C.saveSheet) await C.saveSheet(found.name, deepClone(g.card.data.extensions.klite_rpmod.sheet));
            }
        }
        return start(cur.id, opts.hero ? { hero: opts.hero, confirm: false } : cur.pregen ? { pregen: cur.pregen, confirm: false } : { hero: cur.persona, confirm: false });
    }

    // ---- the picker window ------------------------------------------------------------------
    const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    function render() {
        const box = V.box; if (!box) return;
        clear(box);
        const all = list();
        if (!all.length) { box.appendChild(el('p', { class: 'rpm-muted', text: 'No adventures are installed yet.' })); return; }
        const adv = all.find(a => a.id === V.adventure) || all[0];
        V.adventure = adv.id;
        if (all.length > 1) {
            const sel = el('select', { class: 'form-control rpm-input', 'aria-label': 'Adventure', 'data-adv': 'select' });
            for (const a of all) { const o = el('option', { value: a.id, text: a.title }); if (a.id === adv.id) o.selected = true; sel.appendChild(o); }
            sel.addEventListener('change', () => { V.adventure = sel.value; V.pregen = null; render(); });
            box.appendChild(sel);
        }
        box.appendChild(el('h3', { class: 'rpm-adv-title', text: adv.title }));
        if (adv.levels.length === 2) box.appendChild(el('div', { class: 'rpm-muted', text: `For characters of level ${adv.levels[0]} to ${adv.levels[1]}` }));
        if (adv.summary) box.appendChild(el('p', { class: 'rpm-adv-summary', text: adv.summary }));
        box.appendChild(el('div', { class: 'rpm-label', text: 'Choose your character' }));
        const grid = el('div', { class: 'rpm-adv-pregens', role: 'radiogroup', 'aria-label': 'Pregenerated characters' });
        if (!adv.pregens.some(p => p.id === V.pregen)) V.pregen = adv.pregens[0] && adv.pregens[0].id;
        for (const p of adv.pregens) {
            const on = p.id === V.pregen;
            const card = el('button', { type: 'button', class: 'rpm-adv-pregen' + (on ? ' rpm-active' : ''), role: 'radio', 'aria-checked': String(on), 'data-pregen': p.id,
                onclick: () => { V.pregen = p.id; render(); } }, [
                el('span', { class: 'rpm-adv-avatar', 'aria-hidden': 'true', text: initials(p.name) }),
                el('span', { class: 'rpm-adv-who' }, [
                    el('strong', { text: p.name }),
                    p.pronouns ? el('span', { class: 'rpm-muted', text: ' (' + p.pronouns + ')' }) : null,
                    p.line ? el('span', { class: 'rpm-adv-line', text: p.line }) : null,
                ]),
            ]);
            grid.appendChild(card);
        }
        box.appendChild(grid);
        box.appendChild(el('p', { class: 'rpm-muted', text: 'The others can join you as companions. Starting begins a new session: save your current story first if you want to keep it. Missing characters are added to your Library; characters already there are not changed.' }));
        if (V.msg) box.appendChild(el('p', { class: 'rpm-adv-msg', role: 'status', text: V.msg }));
        box.appendChild(el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon rpm-block', 'data-adv': 'start', disabled: V.busy || !V.pregen ? '' : null,
            onclick: async () => {
                if (V.busy) return; V.busy = true; V.msg = ''; render();
                try { await start(adv.id, { pregen: V.pregen }); }
                catch (e) { V.msg = 'Could not start: ' + (e && e.message || e); }
                V.busy = false; render();
            } }, [iconText('play', V.busy ? 'Starting…' : 'Start the adventure')]));
    }
    function open(adventureId) {
        const sh = Shell(); if (!sh) return false;
        if (adventureId) { V.adventure = adventureId; V.pregen = null; }
        V.msg = '';
        sh.open('adventure'); render();
        return true;
    }

    const api = { list, get: (id) => { const p = get(id); return p ? deepClone(p) : null; }, register, validate: AR.validateAdventure,
        pregens: (id) => AR.pregens(get(id)).map(g => ({ id: g.id, name: g.name, line: g.line, pronouns: g.pronouns })),
        installPregens, start, restart, current, open, forbiddenNamesIn: AR.forbiddenNamesIn };
    window.KLITE_RPMod_Adventures = api;

    function registerView() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({
            id: 'adventure', title: 'Play an adventure', place: 'window', window: { width: 520, height: 560, minWidth: 300, minHeight: 320, restore: false },
            mount: (c) => { V.box = el('div', { class: 'rpm-adv' }); c.appendChild(V.box); render(); },
            unmount: () => { V.box = null; },
        });
        return true;
    }
    let tries = 0;
    const attempt = () => { if (!registerView() && ++tries < 120) setTimeout(attempt, 250); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt, { once: true });
}
