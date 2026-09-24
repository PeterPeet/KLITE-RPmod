// =============================================================================
// KLITE RPmod — map tags (R7 step 3): what the AI writes while exploring (pure, no DOM)
// -----------------------------------------------------------------------------
// The AI names places and uses short tags; RPmod applies the rules (KLITE-RPmod_Worlds.js).
//   <go>Ossuary</go> / <go>north</go>   (<move> is the same)
//   <open>north</open>  <close>the east door</close>  <unlock>door</unlock>
//   <search></search> or <search/>      (the current room)
//   <room>Ossuary, east: bones stacked to the ceiling</room>
//   <door>east = locked, iron, DC 15, key: Iron Key</door>
//   <light>dark</light>
// Forgiving: any case, spaces, articles, self-closing or empty tags. Tags are returned in the
// order they appear in the reply, so "<unlock>…<open>…<go>…" happens in that order.
// Design: docs/design/R7-world-map.md ("AI interface").
// =============================================================================
import { DOOR_STATES, LIGHT, parseDir, nameKey } from './map-rules.js';

export const MAP_TAGS = ['go', 'move', 'open', 'close', 'unlock', 'search', 'room', 'door', 'light'];
const ALT = MAP_TAGS.join('|');
// pair first (content up to the matching close tag), then self-closing, then a lone open tag
const TAG_RE = new RegExp(`<(${ALT})\\s*>([^<>]*?)<\\/\\1\\s*>|<(${ALT})\\s*\\/>|<(${ALT})\\s*>`, 'gi');

// All map tags of one message in reply order: [{ tag, arg, index }] (tag lower-case, arg trimmed).
export function scanMapTags(text) {
    const s = String(text || ''); const out = []; let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(s)) !== null) {
        const tag = (m[1] || m[3] || m[4]).toLowerCase();
        out.push({ tag: tag === 'move' ? 'go' : tag, arg: String(m[2] || '').replace(/\s+/g, ' ').trim(), index: m.index, raw: tag });
    }
    return out;
}

// Name matching that forgives articles, punctuation and a trailing plural "s" ("the Crypts" = "Crypt").
export function looseKey(text) { return nameKey(text).replace(/(\w{3})s$/, '$1'); }

// "Ossuary, east: bones stacked" · "Ossuary (east): …" · "east: Ossuary" · "Ossuary: …" · "Ossuary to the east"
// → { name, dir|null, description }
export function parseRoomSpec(arg) {
    let s = String(arg || '').trim(); let description = '';
    const colon = s.indexOf(':');
    if (colon >= 0) { description = s.slice(colon + 1).trim(); s = s.slice(0, colon).trim(); }
    let name = s, dir = null;
    const paren = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s);
    if (paren && parseDir(paren[2])) { name = paren[1]; dir = parseDir(paren[2]); }
    else if (s.includes(',')) {
        const i = s.lastIndexOf(','); const a = s.slice(0, i).trim(), b = s.slice(i + 1).trim();
        if (parseDir(b)) { name = a; dir = parseDir(b); } else if (parseDir(a)) { name = b; dir = parseDir(a); }
    } else {
        const to = /^(.*?)\s+(?:to the|to|on the|toward|towards)\s+(\w+)$/i.exec(s);
        if (to && parseDir(to[2])) { name = to[1]; dir = parseDir(to[2]); }
    }
    // "east: Ossuary" (direction first, the name after the colon)
    if (!dir && parseDir(name) && description) { dir = parseDir(name); const c = description.split(/[,:.–—-]\s*/); name = c[0]; description = description.slice(c[0].length).replace(/^[,:.–—-]\s*/, ''); }
    name = String(name || '').replace(/^\s*(the|a|an)\s+/i, '').replace(/[.!?]+$/, '').trim();
    return { name, dir, description: description.trim() };
}

// "east = locked, iron, DC 15, key: Iron Key" → { target, state?, material?, lockDC?, keyItem? }
// "unlocked" means closed (not locked). Unknown words become the material ("iron door" → iron).
export function parseDoorSpec(arg) {
    const s = String(arg || ''); const eq = s.indexOf('=');
    const target = (eq >= 0 ? s.slice(0, eq) : s).trim();
    const out = { target };
    if (eq < 0) return out;
    for (let part of s.slice(eq + 1).split(/[,;]/)) {
        part = part.trim(); if (!part) continue;
        const low = part.toLowerCase();
        let m;
        if ((m = /^key\s*[:=]?\s*(.+)$/i.exec(part))) { out.keyItem = m[1].trim(); continue; }
        if ((m = /^(?:lock\s*)?dc\s*(\d+)$/i.exec(low))) { out.lockDC = Number(m[1]); continue; }
        const word = low.replace(/\b(the|a|an|door|is|now)\b/g, ' ').trim();
        if (word === 'unlocked' || word === 'shut') { out.state = 'closed'; continue; }
        if (DOOR_STATES.includes(word)) { out.state = word; continue; }
        if (word && !out.material) out.material = word;
    }
    return out;
}

// Door states from easy to hard. The AI may only make a door harder (RPmod opens doors).
export const DOOR_RANK = { open: 0, closed: 1, locked: 2, barred: 3 };
export function harderOrSame(from, to) { return (DOOR_RANK[to] ?? 0) >= (DOOR_RANK[from] ?? 0); }

// "dark" / "darkness" / "dimly lit" / "bright light" → 'dark' | 'dim' | 'bright' | null
export function parseLight(arg) {
    const t = String(arg || '').toLowerCase();
    if (/\bdark|pitch|black/.test(t)) return 'dark';
    if (/\bdim|gloom|shadow|twilight/.test(t)) return 'dim';
    if (/\bbright|lit\b|light|daylight/.test(t)) return 'bright';
    return LIGHT.includes(t.trim()) ? t.trim() : null;
}
