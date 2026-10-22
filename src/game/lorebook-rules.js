// =============================================================================
// KLITE RPmod — lorebook round trip (pure; R6 step 4, design: docs/design/R6-chat-power.md)
// -----------------------------------------------------------------------------
// A world ↔ classic lorebooks:
//   toTavern(world)  SillyTavern World Info file: `entries` keyed by uid, with both key/keys and
//                    keysecondary/secondary_keys, so SillyTavern and Esolite's own importer
//                    (load_tavern_wi, which needs `uid`) read it.
//   toV3(world)      Lorebook V3: { spec: 'lorebook_v3', data: { entries: [] } }.
// Every entry carries extensions.rpmod = { kind, id, field } and starts with a header line
// ("[Location: Brookvale]"); the book carries the whole world in extensions.rpmod.world, so
// re-importing it restores the world and applies text edits made to its entries elsewhere.
//   readBook(data)   any supported shape → { name, world|null, entries[] } (also Esolite's WI
//                    array, V2/V3 cards' character_book, a bare { entries }).
//   typedEntry(e)    { kind, name, text } from the entry's RPmod data or its header, else lore.
// =============================================================================

export const KINDS = { location: 'locations', npc: 'npcs', faction: 'factions', object: 'objects', event: 'events', quest: 'quests', lore: 'globalLore' };
export const HEADERS = { location: 'Location', npc: 'Character', faction: 'Faction', object: 'Object', event: 'Event', quest: 'Quest' };
const HEADER_KIND = Object.fromEntries(Object.entries(HEADERS).map(([k, v]) => [v.toLowerCase(), k]));
export const TEXT_FIELD = { location: 'description', npc: 'description', faction: 'description', object: 'desc', event: 'description', quest: 'description', lore: 'content' };

const str = (v) => (v == null ? '' : String(v)).trim();
const arr = (v) => (Array.isArray(v) ? v : []);
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(str).filter(Boolean);

function nameOf(kind, e) { return kind === 'quest' ? str(e.title || e.name) : kind === 'lore' ? str(e.label) : str(e.name); }
// The field that holds an entity's text (an NPC may keep it in personality, like the example world).
export function textFieldOf(kind, e) {
    if (kind === 'npc' && !str(e.description) && str(e.personality)) return 'personality';
    if (kind === 'faction' && !str(e.description) && str(e.goals)) return 'goals';
    return TEXT_FIELD[kind];
}
// World → [{ kind, id, field, name, keys, secondary, text, constant }]
export function entitiesOf(world) {
    const out = [];
    for (const kind of Object.keys(KINDS)) {
        for (const e of arr(world && world[KINDS[kind]])) {
            if (!e || typeof e !== 'object') continue;
            const field = textFieldOf(kind, e); const text = str(e[field]); const name = nameOf(kind, e);
            if (kind === 'lore') {
                if (!text) continue;
                out.push({ kind, id: e.id, field, name: name || list(e.keys)[0] || 'Lore', keys: list(e.keys).length ? list(e.keys) : (name ? [name] : []),
                    secondary: list(e.secondary), text, constant: !!(e.always || e.constant), disabled: !!e.disabled });
            } else {
                if (!name) continue;
                out.push({ kind, id: e.id, field, name, keys: [name], secondary: [], text, constant: false, disabled: false });
            }
        }
    }
    return out;
}
export function entryContent(x) { return x.kind === 'lore' ? x.text : `[${HEADERS[x.kind]}: ${x.name}]${x.text ? '\n' + x.text : ''}`; }
// "[Location: Brookvale]\ntext" → { kind, name, text }; null without a header.
export function parseHeader(content) {
    const m = /^\s*\[([A-Za-z]+):\s*([^\]\n]+?)\s*\]\s*(?:\r?\n|$)([\s\S]*)$/.exec(String(content || ''));
    const kind = m && HEADER_KIND[m[1].toLowerCase()];
    return kind ? { kind, name: m[2], text: m[3].trim() } : null;
}

function bookExt(world, embed) { return { rpmod: embed === false ? { version: 1 } : { version: 1, world } }; }
export function toTavern(world, { embed = true } = {}) {
    const entries = {};
    entitiesOf(world).forEach((x, i) => {
        entries[String(i)] = {
            uid: i, key: x.keys, keysecondary: x.secondary, keys: x.keys, secondary_keys: x.secondary,
            comment: x.name, name: x.name, content: entryContent(x), constant: x.constant, selective: x.secondary.length > 0,
            disable: x.disabled, enabled: !x.disabled, order: 100, insertion_order: 100, position: 0,
            extensions: { rpmod: { kind: x.kind, id: x.id, field: x.field } },
        };
    });
    return { name: str(world && world.name) || 'World', description: str(world && world.description), extensions: bookExt(world, embed), entries };
}
export function toV3(world, { embed = true } = {}) {
    const entries = entitiesOf(world).map((x, i) => ({
        keys: x.keys, content: entryContent(x), extensions: { rpmod: { kind: x.kind, id: x.id, field: x.field } }, enabled: !x.disabled,
        insertion_order: 100, use_regex: false, constant: x.constant, selective: x.secondary.length > 0, secondary_keys: x.secondary,
        name: x.name, comment: x.name, id: i, position: 'before_char',
    }));
    return { spec: 'lorebook_v3', data: { name: str(world && world.name) || 'World', description: str(world && world.description), extensions: bookExt(world, embed), entries } };
}

// ---- reading ----------------------------------------------------------------------------------
function normEntry(e) {
    if (!e || typeof e !== 'object') return null;
    const content = str(e.content ?? e.entry);
    if (!content) return null;
    const r = e.extensions && e.extensions.rpmod;
    return {
        keys: list(e.keys ?? e.key ?? e.keywords), secondary: list(e.secondary_keys ?? e.keysecondary),
        content, comment: str(e.comment || e.name), constant: !!e.constant,
        enabled: !(e.disable === true || e.widisabled === true || e.enabled === false),
        wigroup: str(e.wigroup),
        rpmod: r && typeof r === 'object' && KINDS[r.kind] ? { kind: r.kind, id: str(r.id), field: str(r.field) } : null,
    };
}
export function readBook(data) {
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (_) { return { name: '', world: null, entries: [] }; } }
    if (!data || typeof data !== 'object') return { name: '', world: null, entries: [] };
    if (Array.isArray(data)) return { name: '', world: null, entries: data.map(normEntry).filter(Boolean) };
    // cards: { data: { character_book } } (V2/V3), { character_book }; V3 book: { spec, data: { entries } }
    const inner = data.data && typeof data.data === 'object' ? data.data : null;
    const book = inner && inner.character_book ? inner.character_book : data.character_book ? data.character_book
        : inner && inner.entries ? inner : data;
    const raw = book && book.entries;
    const entries = (Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : []).map(normEntry).filter(Boolean);
    const ext = book && book.extensions && book.extensions.rpmod;
    const world = ext && ext.world && typeof ext.world === 'object' && !Array.isArray(ext.world) ? ext.world : null;
    return { name: str(book && book.name) || str(inner && inner.name) || str(data.name), world, entries };
}

// The entry as a world node: its RPmod data or header decides the kind; the header line is not text.
export function typedEntry(e) {
    const h = parseHeader(e.content);
    const kind = e.rpmod ? e.rpmod.kind : h ? h.kind : 'lore';
    if (kind === 'lore') return { kind, name: e.comment || e.keys[0] || 'Lore', text: e.content };
    return { kind, name: h ? h.name : (e.comment || e.keys[0] || ''), text: h ? h.text : e.content };
}

// A book with an embedded world: apply text edits made to its entries (matched by the RPmod id)
// to a copy of that world. Entries without RPmod data, or whose entity is gone, are returned as
// `extra` (they become new nodes). Never removes anything from the world.
export function applyEntryEdits(world, entries) {
    const extra = []; let edited = 0;
    for (const e of entries) {
        const r = e.rpmod; const ent = r && arr(world[KINDS[r.kind]]).find(x => x && x.id === r.id);
        if (!ent) { extra.push(e); continue; }
        const t = typedEntry(e); const field = r.field || textFieldOf(r.kind, ent);
        if (str(ent[field]) !== t.text) { ent[field] = t.text; edited++; }
        if (r.kind === 'lore') {
            if (e.keys.length && e.keys.join(',') !== list(ent.keys).join(',')) { ent.keys = e.keys.slice(); edited++; }
            if (!!e.constant !== !!(ent.always || ent.constant)) { ent.always = !!e.constant; edited++; }
            if (!e.enabled !== !!ent.disabled) { if (e.enabled) delete ent.disabled; else ent.disabled = true; edited++; }
        }
    }
    return { edited, extra };
}
