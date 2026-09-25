// =============================================================================
// KLITE RPmod — Shop window (R4 extra): trade with the vendors where the player stands
// -----------------------------------------------------------------------------
// One card per vendor here: wares with prices after reputation and today's stock (Buy, with a
// count), the player's items the vendor buys at half price (Sell), the purse. The engine
// (Worlds API buy/sell) checks everything and writes the game log; the AI narrates it.
// Used by src/KLITE-RPmod_WorldsUI.js for the window view "shop".
// =============================================================================
import { el, iconText } from '../shell/dom.js';

const U = { qty: {} };   // chosen counts per vendor/item (survive re-renders)

export function renderShop(box, refresh) {
    const A = window.KLITE_RPMod_Worlds;
    const ids = A.vendorsHere();
    if (!ids.length) {
        box.appendChild(el('div', { class: 'rpm-muted', 'data-shop': 'none', text: 'No one here sells anything. Vendors are persons with a shop (World editor → person → Shop); go where one is.' }));
        return;
    }
    for (const id of ids) {
        const v = A.shopView(id); if (!v) continue;
        const card = el('div', { class: 'rpm-card', 'data-vendor': id });
        card.appendChild(el('div', { class: 'rpm-row' }, [
            el('strong', { class: 'rpm-grow', text: v.name }),
            v.faction ? el('span', { class: 'rpm-chip' + (v.trade ? (v.factor < 1 ? ' rpm-chip-info' : '') : ' rpm-chip-danger'), 'data-shop': 'tier', text: `${v.faction}: ${v.tier}` }) : null,
        ]));
        if (v.note) card.appendChild(el('div', { class: 'rpm-muted', text: v.note }));
        if (!v.trade) { card.appendChild(el('div', { class: 'rpm-muted', 'data-shop': 'refuses', text: `${v.name} refuses to trade with you.` })); box.appendChild(card); continue; }
        if (v.factor !== 1) card.appendChild(el('div', { class: 'rpm-muted', 'data-shop': 'factor', text: v.factor < 1 ? `Your standing: prices ${Math.round((1 - v.factor) * 100)}% lower.` : `Your standing: prices ${Math.round((v.factor - 1) * 100)}% higher.` }));
        card.appendChild(el('div', { class: 'rpm-label', text: 'For sale' }));
        if (!v.items.length) card.appendChild(el('div', { class: 'rpm-muted', text: 'Nothing right now.' }));
        for (const it of v.items) card.appendChild(tradeRow(A, v, it, 'buy', refresh));
        if (v.buys) {
            card.appendChild(el('div', { class: 'rpm-label', text: 'Sell (half price)' }));
            if (!v.sell.length) card.appendChild(el('div', { class: 'rpm-muted', text: 'Nothing you carry interests this vendor.' }));
            for (const it of v.sell) card.appendChild(tradeRow(A, v, it, 'sell', refresh));
        }
        box.appendChild(card);
    }
    const iv = A.inventory();
    box.appendChild(el('div', { class: 'rpm-muted', 'data-shop': 'purse', style: 'margin-top:6px;display:flex;align-items:center;gap:4px' }, [iconText('coins', `Your purse: ${iv.purseText}${iv.source === 'sheet' ? ` (${iv.owner})` : ''}`, 13)]));
}

function tradeRow(A, v, it, kind, refresh) {
    const key = `${v.id}|${kind}|${it.item}`;
    const max = kind === 'buy' ? (it.left == null ? 99 : it.left) : it.qty;
    const qty = el('input', { type: 'number', min: '1', max: String(Math.max(1, max)), value: String(Math.min(U.qty[key] || 1, Math.max(1, max))), class: 'form-control rpm-input', style: 'width:4em', 'aria-label': `How many ${it.item}` });
    qty.addEventListener('change', () => { U.qty[key] = Math.max(1, Number(qty.value) || 1); });
    const afford = kind === 'sell' || (it.price != null && it.price <= v.purse);
    const disabled = kind === 'buy' ? (it.price == null || it.left === 0 || !afford) : it.qty < 1;
    const b = el('button', { type: 'button', class: 'btn btn-primary rpm-btn rpm-sm', 'data-trade': kind, 'data-item': it.item, text: kind === 'buy' ? 'Buy' : 'Sell',
        disabled: disabled ? '' : null, title: kind === 'buy' && !afford && it.price != null ? 'Not enough money' : null,
        onclick: () => { const n = Math.max(1, Number(qty.value) || 1); if (kind === 'buy') A.buy(v.id, it.item, n); else A.sell(v.id, it.item, n); refresh(); } });
    const info = kind === 'buy'
        ? `${it.priceText}${it.left != null ? ` · ${it.left} left` : ''}`
        : `${it.priceText} each · you have ${it.qty}`;
    return el('div', { class: 'rpm-row', 'data-ware': it.item, style: 'margin-top:3px;flex-wrap:wrap' }, [
        el('span', { class: 'rpm-grow', text: it.item }), el('span', { class: 'rpm-muted', text: info }), qty, b,
    ]);
}
