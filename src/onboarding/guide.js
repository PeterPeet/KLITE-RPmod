// RPmod Guide: a readable, chaptered window (shell view 'guide') with "Show me" actions
// that open and highlight the UI being explained. Content: chapters.js.
import { el, clear } from '../shell/dom.js';
import { hostGet } from './hostGlobals.js';
import { CHAPTERS } from './chapters.js';

const STORE_KEY = 'KLITE.guide.chapter';

function savedChapter() { try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; } }
function saveChapter(id) { try { localStorage.setItem(STORE_KEY, id); } catch (_) {} }

// ---- spotlight: ring around a UI element + a short note ------------------------
let spot = null;
export function clearHighlight() {
    if (!spot) return;
    clearTimeout(spot.timer);
    document.removeEventListener('keydown', spot.onKey, true);
    document.removeEventListener('pointerdown', spot.onDown, true);
    spot.nodes.forEach(n => n.remove());
    spot = null;
}

export function highlight(target, note) {
    clearHighlight();
    let node = null;
    try { node = typeof target === 'function' ? target() : (typeof target === 'string' ? document.querySelector(target) : target); } catch (_) {}
    const visible = node && node.getClientRects && node.getClientRects().length > 0;
    const nodes = [];
    const bubble = el('div', { class: 'rpm-themed rpm-spot-note', role: 'status' }, [
        el('span', { text: visible ? note : 'That part of the screen is hidden right now. Open the RPmod panels with the RPmod button in the top bar and try again.' }),
    ]);
    if (visible) {
        try { node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
        const r = node.getBoundingClientRect();
        const pad = 6;
        const ring = el('div', { class: 'rpm-themed rpm-spot-ring', 'aria-hidden': 'true',
            style: `left:${Math.round(r.left - pad)}px;top:${Math.round(r.top - pad)}px;width:${Math.round(r.width + pad * 2)}px;height:${Math.round(r.height + pad * 2)}px` });
        nodes.push(ring);
        const below = r.bottom + 90 < (window.innerHeight || 768);
        bubble.style.left = Math.round(Math.max(8, Math.min(r.left, (window.innerWidth || 1024) - 300))) + 'px';
        bubble.style.top = Math.round(below ? r.bottom + pad + 8 : Math.max(8, r.top - pad - 56)) + 'px';
    } else {
        bubble.style.left = '50%'; bubble.style.top = '40%'; bubble.style.transform = 'translateX(-50%)';
    }
    nodes.push(bubble);
    nodes.forEach(n => document.body.appendChild(n));
    const onKey = (e) => { if (e.key === 'Escape') clearHighlight(); };
    const onDown = () => clearHighlight();
    spot = { nodes, onKey, onDown, timer: setTimeout(clearHighlight, 6000) };
    document.addEventListener('keydown', onKey, true);
    // any click ends the highlight (after the click that started it has finished)
    setTimeout(() => { if (spot && spot.onDown === onDown) document.addEventListener('pointerdown', onDown, true); }, 0);
    return !!visible;
}

// ---- guide view ----------------------------------------------------------------
export function createGuideView(shell) {
    let current = CHAPTERS.some(c => c.id === savedChapter()) ? savedChapter() : CHAPTERS[0].id;

    const ctx = {
        open: (id) => { try { shell.open(id); } catch (_) {} },
        highlight: (target, note) => setTimeout(() => highlight(target, note), 60),   // after panels/windows opened
        hostCall: (name) => { const fn = hostGet(name); if (typeof fn === 'function') fn(); },
        navLink: (text) => () => [...document.querySelectorAll('#navbarNavDropdown a.nav-link')].find(a => a.textContent.trim() === text && a.offsetParent !== null),
    };

    function renderBlock(b) {
        if (b.p) return el('p', { style: 'margin:0 0 10px', text: b.p });
        if (b.tip) return el('div', { class: 'rpm-card rpm-card-hi', style: 'margin:0 0 10px', text: b.tip });
        if (b.list) return el('ul', { style: 'margin:0 0 10px;padding-left:20px' }, b.list.map(t => el('li', { style: 'margin-bottom:4px', text: t })));
        if (b.table) {
            const [headRow, ...rows] = b.table;
            return el('table', { class: 'rpm-guide-table' }, [
                el('thead', null, [el('tr', null, headRow.map(h => el('th', { text: h })))]),
                el('tbody', null, rows.map(r => el('tr', null, [el('td', null, [el('code', { text: r[0] })]), el('td', { text: r[1] })])))
            ]);
        }
        return null;
    }

    function render(box) {
        clear(box);
        const idx = Math.max(0, CHAPTERS.findIndex(c => c.id === current));
        const ch = CHAPTERS[idx];
        const go = (id) => { current = id; saveChapter(id); render(box); };

        const toc = el('nav', { class: 'rpm-guide-toc', 'aria-label': 'Guide chapters' },
            CHAPTERS.map((c, i) => el('button', {
                type: 'button', class: 'rpm-guide-toc-item', 'aria-current': c.id === ch.id ? 'page' : null,
                text: `${i + 1}. ${c.title}`, onclick: () => go(c.id)
            })));

        const article = el('article', { class: 'rpm-guide-body', 'data-chapter': ch.id }, [
            el('div', { class: 'rpm-muted', text: `Chapter ${idx + 1} of ${CHAPTERS.length}` }),
            el('h2', { class: 'rpm-guide-title', text: ch.title }),
            ...ch.blocks.map(renderBlock).filter(Boolean),
        ]);
        if (ch.show && ch.show.length) {
            article.appendChild(el('div', { class: 'rpm-label', text: 'Show me' }));
            article.appendChild(el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, ch.show.map(s =>
                el('button', { type: 'button', class: 'btn btn-primary rpm-btn', 'data-show': s.label, text: '👁 ' + s.label, onclick: () => { try { s.run(ctx); } catch (e) { console.error('[RPmod guide]', e); } } }))));
        }
        article.appendChild(el('div', { class: 'rpm-row rpm-guide-nav' }, [
            el('button', { type: 'button', class: 'btn btn-primary rpm-btn', text: '← Back', disabled: idx === 0 ? 'disabled' : null, onclick: () => go(CHAPTERS[idx - 1].id) }),
            el('span', { class: 'rpm-grow' }),
            idx < CHAPTERS.length - 1
                ? el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-lg', text: 'Next: ' + CHAPTERS[idx + 1].title + ' →', onclick: () => go(CHAPTERS[idx + 1].id) })
                : el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-lg', text: 'Done', onclick: () => shell.close('guide') }),
        ]));

        box.appendChild(el('div', { class: 'rpm-guide' }, [toc, article]));
    }

    return {
        id: 'guide', title: 'RPmod Guide', place: 'window',
        window: { width: 680, height: 560, minWidth: 320, minHeight: 280 },
        mount: render, update: render,
        goTo: (id) => { if (CHAPTERS.some(c => c.id === id)) { current = id; saveChapter(id); } },
    };
}
