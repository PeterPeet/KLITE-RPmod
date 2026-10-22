// =============================================================================
// KLITE RPmod — a side copy of RPmod's story blocks, for page reloads (R8)
// -----------------------------------------------------------------------------
// RPmod stores its per-story state inside Esolite's save (`generate_savefile` wrappers: the Worlds
// block `rpmod_worlds`, the RP core's `rpmod`). On a page reload Esolite restores its autosaved story
// during its own start-up — before RPmod has wrapped anything — and autosaves it again, which drops
// RPmod's blocks. So every time a save is generated, the block is also copied to IndexedDB under its
// own key together with a fingerprint of the chat; at start-up the copy is restored when the chat
// Esolite restored has the same fingerprint (the same story). Additive: nothing else changes.
// =============================================================================

const PREFIX = 'rpmod_storycopy_';
const timers = {};

// A short hash of the chat (gametext_arr) — the same story gives the same fingerprint.
export function chatFingerprint() {
    let text = '';
    try { text = JSON.stringify(Array.isArray(window.gametext_arr) ? window.gametext_arr : []); } catch (_) {}
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${text.length}:${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

// Remember `data` (null = the story has no such block) for this chat; debounced per key.
export function saveStoryCopy(key, data) {
    if (typeof window.indexeddb_save !== 'function') return;
    clearTimeout(timers[key]);
    let json;
    try { json = JSON.stringify({ fp: chatFingerprint(), data: data == null ? null : data }); } catch (_) { return; }
    timers[key] = setTimeout(() => { try { window.indexeddb_save(PREFIX + key, json); } catch (_) {} }, 400);
}

// The copy when it belongs to the chat that is open now, else undefined.
export async function loadStoryCopy(key) {
    if (typeof window.indexeddb_load !== 'function') return undefined;
    try {
        const raw = await window.indexeddb_load(PREFIX + key, '');
        if (!raw || raw === 'offload_to_indexeddb') return undefined;
        const c = JSON.parse(raw);
        return c && c.fp === chatFingerprint() ? c.data : undefined;
    } catch (_) { return undefined; }
}
