// =============================================================================
// KLITE RPmod — Character gallery (full-screen window "Characters")
// -----------------------------------------------------------------------------
// A view on Esolite's Library (the master store) made for looking at your characters:
// big portrait cards with name, creator, tagline, tags and stats laid over the image,
// four sizes (large / medium / small / list, like ALPHA's views), search, sort, tag
// chips, and a detail page with the full card and actions (persona, chat, sheet, edit,
// download, favorite, delete).
//
// Data: the Library list gives names, ids, thumbnails and favorites at once; each card's
// full record (image + TavernCard text) loads lazily when the card scrolls into view
// (IntersectionObserver, 2 at a time) and a small text summary is cached per browser
// (localStorage 'KLITE.gallery.index') so the next opening shows it immediately.
// Card text is untrusted: everything is set with textContent; images only from data:,
// blob: or http(s) URLs.
// Public API: window.KLITE_RPMod_Gallery.
// =============================================================================
import { el, clear, icon, iconText } from '../shell/dom.js';
import { readSheet } from './sheet.js';
import { loadCharacter, deleteCharacter, v2Card } from '../library/esoliteLibrary.js';
import { hostGet } from '../onboarding/hostGlobals.js';

const PREFS_KEY = 'KLITE.gallery';
const INDEX_KEY = 'KLITE.gallery.index';
const SIZES = { large: 'Large', medium: 'Medium', small: 'Small', list: 'List' };
const SORTS = { favorites: 'Favorites', name: 'Name', rating: 'Rating', sheet: 'Has sheet', tokens: 'Size' };
const TEXT_FIELDS = ['description', 'personality', 'scenario', 'first_mes', 'mes_example', 'system_prompt'];

const safeImg = (u) => (typeof u === 'string' && /^(data:image\/|blob:|https?:\/\/)/i.test(u) ? u : null);
function loadJSON(key, dflt) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : dflt; } catch (_) { return dflt; } }
function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} }

// HTML in creator notes → plain text (DOMParser does not run scripts or load images).
export function plainText(s) {
    const str = String(s == null ? '' : s);
    if (!/[<&]/.test(str)) return str;
    try {
        const body = new DOMParser().parseFromString(str, 'text/html').body;
        body.querySelectorAll('script, style, template, noscript').forEach(n => n.remove());   // code is not text
        body.querySelectorAll('br, p, div, li').forEach(n => n.append(' '));
        return body.textContent || '';
    } catch (_) { return str.replace(/<[^>]*>/g, ''); }
}
const fillNames = (s, name) => String(s || '').replace(/\{\{char\}\}/gi, name || 'the character').replace(/\{\{user\}\}/gi, 'you');

// Summary shown on a card, from the card's `data` object.
export function summarize(name, data) {
    const d = data || {};
    const notes = plainText(d.creator_notes).replace(/\s+/g, ' ').trim();
    const desc = fillNames(plainText(d.description), name).replace(/\s+/g, ' ').trim();
    let tagline = notes || (desc.match(/^.{20,180}?[.!?](\s|$)/) || [desc])[0];
    if (tagline.length > 180) tagline = tagline.slice(0, 177).trimEnd() + '…';
    const chars = TEXT_FIELDS.reduce((n, f) => n + String(d[f] || '').length, 0);
    const sheet = readSheet(d);
    return {
        creator: String(d.creator || '').trim(),
        tagline: fillNames(tagline, name),
        tags: (Array.isArray(d.tags) ? d.tags : []).map(t => String(t).trim()).filter(Boolean).slice(0, 12),
        tokens: Math.round(chars / 4),
        sheet: sheet ? { cls: sheet.className, level: sheet.level } : null,
    };
}
export const fmtTokens = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n)) + ' tk';

export default function initGallery() {
    'use strict';
    if (window.KLITE_RPMod_Gallery) return;

    const prefs = Object.assign({ size: 'large', sort: 'favorites', q: '', tag: '' }, loadJSON(PREFS_KEY, {}));
    const index = loadJSON(INDEX_KEY, {});          // name -> summary
    const images = new Map();                        // name -> full image URL (this session)
    const V = { box: null, grid: null, detail: null, observer: null, queue: [], busy: 0 };
    const Shell = () => window.KLITE_RPMod_Shell;
    const Tools = () => window.KLITE_RPMod?.panels?.TOOLS;
    const savePrefs = () => saveJSON(PREFS_KEY, prefs);

    // ---- data ------------------------------------------------------------------------------
    function metas() {
        const list = hostGet('allCharacterNames');
        return (Array.isArray(list) ? list : []).filter(m => m && m.name && (m.type || 'Character') === 'Character');
    }
    function rating(name) {
        try { const c = (window.KLITE_RPMod?.characters || []).find(x => x && x.name === name); return c && Number(c.rating) || 0; } catch (_) { return 0; }
    }
    const personaName = () => Tools()?.selectedPersona?.name || '';
    const aiName = () => (Tools()?.characterEnabled && Tools()?.selectedCharacter?.name) || '';

    async function loadRecord(name) {
        const rec = await loadCharacter(name);
        if (!rec) return null;
        index[name] = summarize(name, rec.data);
        saveJSON(INDEX_KEY, index);
        const img = safeImg(rec.image);
        if (img) images.set(name, img);
        return rec;
    }
    // lazy loading of visible cards, 2 at a time
    function enqueue(name) { if (!V.queue.includes(name)) V.queue.push(name); pump(); }
    // tags become known as cards load: refresh the tag chips (debounced)
    let tagTimer = null;
    function refreshTagsSoon() {
        clearTimeout(tagTimer);
        tagTimer = setTimeout(() => {
            if (!V.box) return;
            const root = V.box.querySelector('.rpm-gal'); if (!root) return;
            const old = root.querySelector('.rpm-gal-tags');
            const fresh = tagBar();
            if (old && fresh) old.replaceWith(fresh);
            else if (old) old.remove();
            else if (fresh) root.insertBefore(fresh, V.grid);
        }, 300);
    }
    function pump() {
        while (V.busy < 2 && V.queue.length) {
            const name = V.queue.shift();
            V.busy++;
            loadRecord(name).then(() => { updateCard(name); refreshTagsSoon(); }).catch(() => {}).finally(() => { V.busy--; pump(); });
        }
    }

    function visibleMetas() {
        const q = prefs.q.trim().toLowerCase();
        let list = metas().filter(m => {
            const s = index[m.name] || {};
            if (prefs.tag && !(s.tags || []).includes(prefs.tag)) return false;
            if (!q) return true;
            return [m.name, s.creator, s.tagline, ...(s.tags || [])].some(v => String(v || '').toLowerCase().includes(q));
        });
        const by = {
            favorites: (a, b) => (!!b.favorite - !!a.favorite) || a.name.localeCompare(b.name),
            name: (a, b) => a.name.localeCompare(b.name),
            rating: (a, b) => (rating(b.name) - rating(a.name)) || a.name.localeCompare(b.name),
            sheet: (a, b) => (!!(index[b.name] || {}).sheet - !!(index[a.name] || {}).sheet) || a.name.localeCompare(b.name),
            tokens: (a, b) => (((index[b.name] || {}).tokens || 0) - ((index[a.name] || {}).tokens || 0)) || a.name.localeCompare(b.name),
        }[prefs.sort] || ((a, b) => a.name.localeCompare(b.name));
        return list.sort(by);
    }
    function tagCounts() {
        const counts = new Map();
        for (const m of metas()) for (const t of ((index[m.name] || {}).tags || [])) counts.set(t, (counts.get(t) || 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14);
    }

    // ---- render: toolbar + grid --------------------------------------------------------
    function chip(text, on, onclick, extra) {
        return el('button', Object.assign({ type: 'button', class: 'rpm-gal-chip' + (on ? ' rpm-on' : ''), 'aria-pressed': String(!!on), onclick }, extra || {}), [text]);
    }
    function render() {
        const box = V.box; if (!box) return;
        if (V.observer) { V.observer.disconnect(); V.observer = null; }
        clear(box);
        const root = el('div', { class: 'rpm-gal rpm-gal-' + prefs.size });
        box.appendChild(root);

        const search = el('input', { type: 'search', class: 'form-control rpm-input rpm-gal-search fullScreenTextEditExclude', placeholder: 'Search name, creator, tags…', 'aria-label': 'Search characters' });
        search.value = prefs.q;
        search.addEventListener('input', () => { prefs.q = search.value; savePrefs(); renderGrid(); });
        const sizeSel = el('div', { class: 'rpm-gal-sizes', role: 'radiogroup', 'aria-label': 'Card size' },
            Object.entries(SIZES).map(([k, t]) => chip(t, prefs.size === k, () => { prefs.size = k; savePrefs(); render(); }, { role: 'radio', 'aria-checked': String(prefs.size === k) })));
        root.appendChild(el('div', { class: 'rpm-gal-bar' }, [
            window.KLITE_RPMod_Builder ? el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon rpm-success', 'data-gal-action': 'new', onclick: () => window.KLITE_RPMod_Builder.open() }, [iconText('plus', 'New character')]) : null,
            canImport() ? el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon', 'data-gal-action': 'import', title: 'Import character cards (PNG, WebP, JSON) into the Library', onclick: () => importCards() }, [iconText('upload', 'Import')]) : null,
            el('div', { class: 'rpm-gal-sorts' }, Object.entries(SORTS).map(([k, t]) => chip(t, prefs.sort === k, () => { prefs.sort = k; savePrefs(); render(); }))),
            search, sizeSel,
        ]));
        const tags = tagBar();
        if (tags) root.appendChild(tags);
        V.grid = el('div', { class: 'rpm-gal-grid', role: 'list' });
        root.appendChild(V.grid);
        if (typeof IntersectionObserver === 'function') {
            V.observer = new IntersectionObserver((entries) => {
                for (const e of entries) if (e.isIntersecting) { V.observer.unobserve(e.target); const n = e.target.getAttribute('data-name'); if (n && (!index[n] || !images.has(n))) enqueue(n); }
            }, { root: box, rootMargin: '400px' });
        }
        renderGrid();
        if (V.detail) renderDetail(V.detail);
    }
    function tagBar() {
        const tags = tagCounts();
        if (!tags.length) return null;
        return el('div', { class: 'rpm-gal-tags' }, [
            chip('All', !prefs.tag, () => { prefs.tag = ''; savePrefs(); render(); }),
            ...tags.map(([t, n]) => chip(t + ' ' + n, prefs.tag === t, () => { prefs.tag = prefs.tag === t ? '' : t; savePrefs(); render(); })),
        ]);
    }
    function renderGrid() {
        if (!V.grid) return;
        clear(V.grid);
        const list = visibleMetas();
        if (!list.length) {
            V.grid.appendChild(el('div', { class: 'rpm-muted rpm-gal-empty', text: metas().length ? 'No character matches.' : 'Your Library has no characters yet. Import cards with Esolite\'s Library or the Chars tab.' }));
            return;
        }
        for (const m of list) {
            const card = buildCard(m);
            V.grid.appendChild(card);
            if (V.observer) V.observer.observe(card);
            else if (!index[m.name]) enqueue(m.name);   // no IntersectionObserver: load in order
        }
    }

    function buildCard(m) {
        const s = index[m.name] || null;
        const name = m.name;
        const src = images.get(name) || safeImg(m.thumbnail);
        const badges = [];
        if (name === personaName()) badges.push(el('span', { class: 'rpm-gal-badge rpm-gal-badge-you', text: 'You' }));
        if (name === aiName()) badges.push(el('span', { class: 'rpm-gal-badge', text: 'AI' }));
        if (s && s.sheet) badges.push(el('span', { class: 'rpm-gal-badge rpm-gal-badge-sheet', text: [s.sheet.cls, s.sheet.level && 'Lv ' + s.sheet.level].filter(Boolean).join(' ') || 'Sheet' }));
        const r = rating(name);
        const stats = el('div', { class: 'rpm-gal-stats' }, [
            s ? el('span', { text: fmtTokens(s.tokens) }) : el('span', { class: 'rpm-muted', text: '…' }),
            el('span', { class: 'rpm-grow' }),
            r ? el('span', { class: 'rpm-gal-stars', title: r + ' of 5', text: '★'.repeat(r) }) : null,
            m.favorite ? el('span', { class: 'rpm-gal-fav', title: 'Favorite', text: '♥' }) : null,
        ]);
        const card = el('div', { class: 'rpm-gal-card', role: 'listitem', tabindex: '0', 'data-name': name, 'aria-label': name,
            onclick: () => openDetail(name), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(name); } } }, [
            src ? el('img', { class: 'rpm-gal-img', alt: '', loading: 'lazy', decoding: 'async', src }) : el('div', { class: 'rpm-gal-img rpm-gal-noimg', text: name.charAt(0).toUpperCase() }),
            badges.length ? el('div', { class: 'rpm-gal-badges' }, badges) : null,
            el('div', { class: 'rpm-gal-info' }, [
                el('div', { class: 'rpm-gal-name', text: name }),
                s && s.creator ? el('div', { class: 'rpm-gal-creator', text: 'by ' + s.creator }) : null,
                s && s.tagline ? el('div', { class: 'rpm-gal-tagline', text: s.tagline }) : null,
                s && s.tags.length ? el('div', { class: 'rpm-gal-cardtags' }, s.tags.slice(0, 3).map(t => el('span', { class: 'rpm-gal-tag', text: t }))) : null,
                stats,
            ]),
        ]);
        return card;
    }
    function updateCard(name) {
        if (!V.grid) return;
        const old = [...V.grid.children].find(c => c.getAttribute && c.getAttribute('data-name') === name);
        const m = metas().find(x => x.name === name);
        if (old && m) { const n = buildCard(m); old.replaceWith(n); }
        if (V.detail === name) renderDetail(name);
    }

    // ---- detail page -------------------------------------------------------------------
    async function openDetail(name) {
        V.detail = name;
        renderDetail(name);
        if (!images.has(name) || !index[name] || !V.records.has(name)) {
            try { const rec = await loadRecord(name); if (rec) V.records.set(name, rec); } catch (_) {}
            if (V.detail === name) renderDetail(name);
        }
    }
    V.records = new Map();
    function closeDetail() { V.detail = null; const d = V.box && V.box.querySelector('.rpm-gal-detail'); if (d) d.remove(); }

    function actionBtn(label, iconName, onclick, opts) {
        return el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon' + (opts && opts.variant ? ' rpm-' + opts.variant : ''), 'data-gal-action': opts && opts.id, onclick }, [iconText(iconName, label)]);
    }
    function charObject(name, rec) {
        const d = (rec && rec.data) || {};
        return Object.assign({}, d, { name: d.name || name, image: rec && rec.image || null, avatar: rec && rec.image || null, rawData: { data: d } });
    }
    function renderDetail(name) {
        if (!V.box) return;
        let wrap = V.box.querySelector('.rpm-gal-detail');
        if (!wrap) { wrap = el('div', { class: 'rpm-gal-detail', role: 'dialog', 'aria-label': name }); V.box.appendChild(wrap); }
        clear(wrap);
        const rec = V.records.get(name) || null;
        const d = (rec && rec.data) || {};
        const s = index[name] || summarize(name, d);
        const meta = metas().find(m => m.name === name) || { name };
        const src = images.get(name) || safeImg(meta.thumbnail);
        const T = Tools();

        const actions = el('div', { class: 'rpm-row rpm-gal-actions' }, [
            T && T.usePersona ? actionBtn(name === personaName() ? 'Your persona' : 'Play as (persona)', 'play', () => { if (!rec) return; T.usePersona(charObject(name, rec)); render(); }, { id: 'persona' }) : null,
            T && T.useCharacter ? actionBtn(name === aiName() ? 'AI plays this' : 'AI plays (chat with)', 'arrow-right', () => { if (!rec) return; T.useCharacter(charObject(name, rec)); render(); }, { id: 'ai' }) : null,
            window.KLITE_RPMod_Characters ? actionBtn('Character sheet', 'id-card', () => window.KLITE_RPMod_Characters.open(name), { id: 'sheet' }) : null,
            window.KLITE_RPMod?.panels?.CHARS?.setEditMode ? actionBtn('Edit', 'workflow', () => {
                if (!rec) return; const sh = Shell(); sh && sh.open('chars');
                window.KLITE_RPMod.panels.CHARS.setEditMode('edit', Object.assign({ id: Date.now() }, charObject(name, rec)));
            }, { id: 'edit' }) : null,
            actionBtn('Download', 'download', () => download(name), { id: 'download' }),
            actionBtn(meta.favorite ? 'Unfavorite' : 'Favorite', 'sparkles', () => favorite(name), { id: 'favorite' }),
            actionBtn('Delete', 'trash-2', async () => { if (!confirm(`Delete "${name}" from your Library? This cannot be undone.`)) return; await deleteCharacter(name); index[name] = undefined; closeDetail(); render(); }, { id: 'delete', variant: 'danger' }),
        ]);

        const section = (title, text) => {
            const t = fillNames(plainText(text), name).trim();
            if (!t) return null;
            return el('details', { class: 'rpm-gal-sec', open: title === 'Description' ? '' : null }, [el('summary', { text: title }), el('div', { class: 'rpm-gal-text', text: t })]);
        };
        const r = rating(name);
        const stars = el('div', { class: 'rpm-gal-rate', role: 'radiogroup', 'aria-label': 'Rating' }, [1, 2, 3, 4, 5].map(n =>
            el('button', { type: 'button', role: 'radio', 'aria-checked': String(r === n), class: 'rpm-iconbtn rpm-gal-star' + (n <= r ? ' rpm-on' : ''), title: n + ' of 5', text: n <= r ? '★' : '☆', onclick: () => setRating(name, r === n ? 0 : n) })));

        let sheetText = '';
        try { sheetText = window.KLITE_RPMod_Characters?.summaryFor(name) || ''; } catch (_) {}
        wrap.append(
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-btn-icon rpm-gal-back', onclick: closeDetail }, [iconText('arrow-left', 'All characters')]),
            el('div', { class: 'rpm-gal-detail-body' }, [
                el('div', { class: 'rpm-gal-portrait' }, [src ? el('img', { alt: name, src }) : el('div', { class: 'rpm-gal-noimg', text: name.charAt(0).toUpperCase() })]),
                el('div', { class: 'rpm-gal-about' }, [
                    el('h2', { class: 'rpm-gal-title', text: name }),
                    s.creator ? el('div', { class: 'rpm-muted', text: 'by ' + s.creator }) : null,
                    stars,
                    s.tags.length ? el('div', { class: 'rpm-gal-cardtags' }, s.tags.map(t => el('span', { class: 'rpm-gal-tag', text: t }))) : null,
                    s.tagline ? el('p', { class: 'rpm-gal-lead', text: s.tagline }) : null,
                    el('div', { class: 'rpm-muted', text: fmtTokens(s.tokens) + (s.sheet ? ` · sheet: ${[s.sheet.cls, 'level ' + s.sheet.level].filter(Boolean).join(' ')}` : '') }),
                    actions,
                    rec ? null : el('div', { class: 'rpm-muted', text: 'Loading the card…' }),
                    section('Description', d.description), section('Personality', d.personality), section('Scenario', d.scenario),
                    section('First message', d.first_mes), section('Example dialogue', d.mes_example), section('Creator notes', d.creator_notes),
                    sheetText ? el('details', { class: 'rpm-gal-sec', open: '' }, [el('summary', { text: 'Character sheet' }), el('div', { class: 'rpm-gal-text', text: sheetText })]) : null,
                ]),
            ]),
        );
    }

    function setRating(name, n) {
        try {
            const c = (window.KLITE_RPMod?.characters || []).find(x => x && x.name === name);
            const CH = window.KLITE_RPMod?.panels?.CHARS;
            if (c && CH && CH.updateCharacterRating) CH.updateCharacterRating(c.id, n);
        } catch (_) {}
        updateCard(name);
    }
    async function favorite(name) {
        const toggle = hostGet('toggleCharacterFavorite');
        if (typeof toggle === 'function') { try { await toggle(name); } catch (_) {} }
        else {
            const list = hostGet('allCharacterNames');
            const m = Array.isArray(list) && list.find(x => x && x.name === name);
            if (m) { m.favorite = !m.favorite; try { await window.updateCharacterListFromAll?.(); } catch (_) {} }
        }
        render();
    }
    // With a portrait: Esolite's download (the stored PNG carries the complete V2 card).
    // Without one Esolite downloads the bare inner object, which SillyTavern reads as V1 and
    // drops system prompt, lorebook, alternate greetings and every extension (the RPmod sheet
    // too — SillyTavern round trip, 2026-09-24); RPmod downloads a complete V2 JSON instead.
    async function download(name) {
        const get = hostGet('getDownloadDataFromManager'), dl = hostGet('downloadB64URL');
        if (typeof dl !== 'function') { alert('Download is available in Esolite\'s Library.'); return; }
        try {
            const rec = await loadCharacter(name);
            if (rec && rec.data && !rec.image) {
                const bytes = new TextEncoder().encode(JSON.stringify(v2Card(Object.assign({}, rec.data, { name: rec.data.name || name }))));
                let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
                dl(`${name}.json`, 'data:application/json;base64,' + btoa(bin));
                return;
            }
            if (typeof get !== 'function') { alert('Download is available in Esolite\'s Library.'); return; }
            const data = await get(name); if (data) dl(data.fileName, data.b64Url);
        } catch (e) { console.error('[RPmod gallery] download failed', e); }
    }

    // ---- import ------------------------------------------------------------------------
    // Esolite's own file prompt and import functions (via ALPHA's import handler, the same
    // path as the Chars tab). Esolite saves asynchronously, so watch the list for the result.
    const importHandler = () => window.KLITE_RPMod?.panels?.CHARS?.processEsoliteImportResult;
    const canImport = () => typeof window.promptUserForLocalFile === 'function' && typeof importHandler() === 'function';
    const listSignature = () => metas().map(m => `${m.id}:${m.name}`).join('|');
    function watchList(before, ms = 10000) {
        const start = Date.now();
        const tick = () => {
            if (listSignature() !== before) { if (V.box) render(); return; }
            if (Date.now() - start < ms) setTimeout(tick, 400);
        };
        setTimeout(tick, 200);
    }
    function importCards() {
        if (!canImport()) return false;
        window.promptUserForLocalFile(async (result) => {
            const before = listSignature();
            try { await importHandler().call(window.KLITE_RPMod.panels.CHARS, result); } catch (_) {}
            watchList(before);
        }, ['.png', '.webp', '.json'], true);
        return true;
    }

    // ---- window ------------------------------------------------------------------------
    function register() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({
            id: 'gallery', title: 'Characters', place: 'window', window: { large: true, flush: true, minWidth: 320, minHeight: 320, restore: false },
            mount: (c) => { V.box = el('div', { class: 'rpm-gal-scroll' }); c.appendChild(V.box); render(); },
            unmount: () => { if (V.observer) V.observer.disconnect(); V.observer = null; V.box = null; V.grid = null; V.detail = null; V.queue = []; },
        });
        sh.addDockAction('right', { id: 'gallery', title: 'Character gallery (full screen)', icon: 'layout-grid', onClick: () => api.open() });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && V.detail && V.box && !document.querySelector('.popupcontainer:not(.hidden)')) closeDetail(); });
        // RPmod wrote or deleted a card (ALPHA editor, sheet, import): drop its cached summary
        window.addEventListener('klite:library-change', (e) => {
            const d = (e && e.detail) || {};
            const edit = d.name && !d.deleted && (!d.oldName || d.oldName === d.name) && V.grid && [...V.grid.children].some(c => c.getAttribute && c.getAttribute('data-name') === d.name);
            if (edit) { loadRecord(d.name).then(() => updateCard(d.name)).catch(() => {}); return; }   // same card, new content
            for (const n of [d.name, d.oldName]) if (n) { delete index[n]; images.delete(n); }
            saveJSON(INDEX_KEY, index);
            if (V.box) render();   // added, renamed or deleted
        });
        window.addEventListener('klite:sheet-change', (e) => { const n = e.detail && e.detail.name; if (n && V.box) loadRecord(n).then(() => updateCard(n)).catch(() => {}); });
        return true;
    }

    const api = {
        open(name) {
            const sh = Shell(); if (!sh) return false;
            const wasOpen = sh.isOpen('gallery');
            const saved = sh.layout().windows.gallery;   // before opening (open() stores geometry)
            const userSized = !!(saved && saved.max === false && saved.userSized);
            sh.open('gallery');
            if (!wasOpen && !userSized) sh.maximize('gallery', true);   // full screen unless the user chose a smaller window
            if (name) openDetail(name);
            return true;
        },
        refresh: () => render(),
        importCards,
        summarize, _index: index,
    };
    window.KLITE_RPMod_Gallery = api;

    let tries = 0;
    const attempt = () => { if (!register() && ++tries < 120) setTimeout(attempt, 250); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt);
}
