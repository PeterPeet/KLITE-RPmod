// =============================================================================
// KLITE RPmod — Shop rules (R4 extra): pure functions, no DOM, no state
// -----------------------------------------------------------------------------
// Prices (in copper internally), SRD 5.2.1 list prices, reputation price factors, paying with
// and receiving coins. The Worlds engine keeps the shops' stock and calls these.
// A vendor sells at its listed price (else the SRD price) times the factor of the player's
// standing with the vendor's faction, and buys at half the base price. The factors are our own.
// =============================================================================
import { SRD } from '../data/srd52.js';
import { COMPENDIUM } from '../data/srd52-compendium.js';
import { sameName, tierIndex } from './quest-rules.js';

const norm = (v) => String(v == null ? '' : v).trim();
export const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

// "15 GP", "1,500 gp", "5 sp", "2 gp 5 sp", "2.5" / 2.5 (gold) → copper; '' / "Varies" → null.
export function parsePrice(v) {
    if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
    const s = norm(v).toLowerCase().replace(/,/g, ''); if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 100);
    let cp = 0, hit = false;
    for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp|gold|silver|copper)\b/g)) {
        const unit = { gold: 'gp', silver: 'sp', copper: 'cp' }[m[2]] || m[2];
        cp += Number(m[1]) * COIN_CP[unit]; hit = true;
    }
    return hit ? Math.round(cp) : null;
}
// 250 → "2 gp 5 sp"; 0 → "0 gp".
export function formatPrice(cp) {
    let n = Math.max(0, Math.round(Number(cp) || 0)); if (!n) return '0 gp';
    const out = [];
    for (const [c, v] of [['gp', 100], ['sp', 10], ['cp', 1]]) { const k = Math.floor(n / v); if (k) { out.push(`${k.toLocaleString('en-US')} ${c}`); n -= k * v; } }
    return out.join(' ');
}
export function wealthCp(coins) {
    let n = 0; for (const [c, v] of Object.entries(COIN_CP)) n += (Math.max(0, Number(coins && coins[c]) || 0)) * v;
    return Math.round(n);
}
// Pay `cp` from a purse: small coins first, a larger coin is broken when needed and the change
// comes back as gold/silver/copper. Returns the new purse, or null when it is not enough.
export function payCoins(coins, cp) {
    const c = Object.assign({}, coins || {}); cp = Math.max(0, Math.round(Number(cp) || 0));
    if (wealthCp(c) < cp) return null;
    let rest = cp;
    const order = Object.entries(COIN_CP).sort((a, b) => a[1] - b[1]);
    for (const [k, v] of order) { const have = Math.max(0, Math.floor(Number(c[k]) || 0)); const use = Math.min(have, Math.floor(rest / v)); if (use) { c[k] = have - use; rest -= use * v; } }
    if (rest > 0) {
        const [k, v] = order.find(([k2, v2]) => v2 > rest && (Number(c[k2]) || 0) > 0) || order.slice().reverse().find(([k2]) => (Number(c[k2]) || 0) > 0);
        c[k] = (Number(c[k]) || 0) - 1;
        return addCoins(c, v - rest);
    }
    return c;
}
// Receive `cp` as gold, silver and copper.
export function addCoins(coins, cp) {
    const c = Object.assign({}, coins || {}); let n = Math.max(0, Math.round(Number(cp) || 0));
    for (const [k, v] of [['gp', 100], ['sp', 10], ['cp', 1]]) { const q = Math.floor(n / v); if (q) { c[k] = (Number(c[k]) || 0) + q; n -= q * v; } }
    return c;
}

// ---- SRD list prices ----------------------------------------------------------------------
let srdIndex = null;
function srdPrices() {
    if (srdIndex) return srdIndex;
    srdIndex = [];
    for (const [name, w] of Object.entries(SRD.weapons || {})) srdIndex.push([name, parsePrice(w.cost)]);
    for (const [name, a] of Object.entries(SRD.armor || {})) srdIndex.push([name, parsePrice(a.cost)]);
    if (SRD.shieldCost) srdIndex.push(['Shield', parsePrice(SRD.shieldCost)]);
    for (const g of Object.values((COMPENDIUM && COMPENDIUM.gear) || {})) {
        // "Clothes, Traveler's" is also found as "Traveler's Clothes"
        const p = parsePrice(g.cost); if (p == null) continue;
        srdIndex.push([g.name, p]);
        const m = /^(.+?),\s*(.+)$/.exec(g.name); if (m) srdIndex.push([`${m[2]} ${m[1]}`, p]);
    }
    srdIndex = srdIndex.filter(([, p]) => p != null);
    return srdIndex;
}
export function srdPrice(name) {
    const n = norm(name); if (!n) return null;
    const hit = srdPrices().find(([k]) => k.toLowerCase() === n.toLowerCase()) || srdPrices().find(([k]) => sameName(k, n));
    return hit ? hit[1] : null;
}
export const srdItemNames = () => srdPrices().map(([k]) => k);

// ---- reputation --------------------------------------------------------------------------
export const PRICE_FACTOR = { Unfriendly: 1.25, Neutral: 1, Friendly: 0.95, Honored: 0.9, Revered: 0.85, Exalted: 0.8 };
// Hostile and Hated: the vendor will not trade.
export const canTrade = (tier) => tierIndex(tier || 'Neutral') > tierIndex('Hostile');
export const priceFactor = (tier) => PRICE_FACTOR[tier || 'Neutral'] || 1;
export const buyPrice = (baseCp, tier) => Math.max(1, Math.round((Number(baseCp) || 0) * priceFactor(tier)));
export const sellPrice = (baseCp) => Math.floor((Number(baseCp) || 0) / 2);

// ---- a vendor's wares ----------------------------------------------------------------------
// person.shop = { items: [{ item, price: '15 gp' | '' (SRD price), stock: n | null (unlimited) }],
//                 buys: true | false (buys the player's items), note }
export function shopItems(shop) {
    return (shop && Array.isArray(shop.items) ? shop.items : []).filter(i => i && norm(i.item)).map(i => {
        const listed = parsePrice(i.price); const base = listed != null ? listed : srdPrice(i.item);
        const stock = i.stock === '' || i.stock == null ? null : Math.max(0, Math.floor(Number(i.stock) || 0));
        return { item: norm(i.item), base, stock };
    });
}
// What the vendor pays for an item: half of its own price for it, else of the SRD price.
export function sellBase(shop, item) {
    const own = shopItems(shop).find(i => sameName(i.item, item));
    return own && own.base != null ? own.base : srdPrice(item);
}
// "Torch x2" → { item: 'Torch', qty: 2 }
export function parseQty(text) {
    const m = /^(.*?)(?:\s*[x×]\s*(\d+))?$/i.exec(norm(text)) || [];
    return { item: norm(m[1] || text), qty: Math.max(1, Number(m[2]) || 1) };
}
