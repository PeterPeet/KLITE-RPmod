#!/usr/bin/env node
'use strict';
// =============================================================================
// SillyTavern round trip of an RPmod character card (R2 acceptance: "export and re-import
// as a card without data loss").
//
//   node scripts/roundtrip-card.js make [dir]     writes the test cards (default: roundtrip/)
//   node scripts/roundtrip-card.js check <file>…  compares cards that come back (PNG or JSON)
//
// `make` builds a level-3 character with RPmod's own builder (src/characters/builder-rules.js)
// and exports it the way RPmod does (src/library/esoliteLibrary.js: complete V2 card embedded
// into the portrait with Esolite's tavernTool from the Esobold clone). It also writes the JSON
// that Esolite's Download gives for a character WITHOUT a portrait (the bare inner object).
// `check` reads a returned file, finds the card (tEXt `chara`, also `ccv3`), and compares every
// card field, the lorebook, a foreign extension and the RPmod sheet with the original.
// =============================================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const { createHost } = require(path.join(ROOT, 'tests', 'helpers', 'host'));

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const B = requireSrc('src/characters/builder-rules.js');
const S = requireSrc('src/characters/sheet.js');
const L = requireSrc('src/library/esoliteLibrary.js');

const NAME = 'Kara Ironvale';
const MARKER = { note: 'keep me: an extension SillyTavern does not know', n: 42 };

// ---- the test character --------------------------------------------------------------
function buildInner() {
    const choices = {
        name: NAME, class: 'fighter', level: 3, background: 'soldier', species: 'human',
        method: 'standard', scores: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
        bgBonus: { plus2: 'str', plus1: 'con' }, classSkills: ['perception', 'survival'], speciesSkills: ['insight'],
        originFeat: 'Alert', fightingStyle: 'Defense', classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Neutral Good',
    };
    const errs = B.validate(choices); if (errs.length) throw new Error('builder: ' + errs.join('; '));
    const sheet = B.buildSheet(choices);
    // values a round trip must not lose: current HP below max, XP, coins, extra items, notes with Unicode
    sheet.hp.current = sheet.hp.max - 5; sheet.hp.temp = 2; sheet.xp = 1234;
    sheet.coins = { cp: 7, sp: 12, gp: 85, pp: 1 };
    sheet.inventory.push({ name: 'Rusty Key', qty: 1, notes: 'from the Sunken Tomb' }, { name: 'Healing Potion', qty: 2, notes: '' });
    sheet.notes = 'Grüße aus Brückenstadt — „Kara“ trägt ein Schwert 🗡️ and <b>no HTML</b> & "quotes".';
    let inner = {
        name: NAME,
        description: '{{char}} is a scarred veteran of the border wars, tall and broad-shouldered, with a braid of iron-grey hair.',
        personality: 'Stoic, dry humour, fiercely loyal; distrusts mages.',
        scenario: '{{user}} meets {{char}} at the Crooked Kettle, where she is looking for work as a caravan guard.',
        first_mes: '*Kara looks up from her ale.* "You look like trouble. Paying trouble, I hope?"',
        mes_example: '<START>\n{{user}}: Who are you?\n{{char}}: "Kara. Ironvale, if you need the rest. I swing the sword, you pay the coin."',
        creator_notes: 'RPmod round-trip test card (R2). Please import into SillyTavern and export again.',
        system_prompt: 'Write {{char}}\'s replies in third person, past tense.',
        post_history_instructions: 'Keep replies under 150 words.',
        alternate_greetings: ['"Another job? Name the road."', '*She tests the edge of her blade.* "Well?"'],
        tags: ['fantasy', 'fighter', 'rpmod-test'],
        creator: 'RPmod',
        character_version: '1.0',
        character_book: {
            name: 'Kara lore', description: 'Two entries to check the lorebook survives.', scan_depth: 4, token_budget: 512, recursive_scanning: false, extensions: {},
            entries: [
                { keys: ['Ironvale'], content: 'Ironvale is a mining town in the northern hills; Kara grew up there.', extensions: {}, enabled: true, insertion_order: 100, case_sensitive: false, name: 'Ironvale', priority: 10, id: 1, comment: 'town', selective: false, secondary_keys: [], constant: false, position: 'before_char' },
                { keys: ['border wars', 'the wars'], content: 'The border wars ended five years ago with an uneasy truce.', extensions: {}, enabled: true, insertion_order: 100, case_sensitive: false, name: 'Border wars', priority: 10, id: 2, comment: 'history', selective: false, secondary_keys: [], constant: false, position: 'before_char' },
            ],
        },
        extensions: { rpmod_roundtrip_marker: MARKER, klite_rpmod: { rating: 4 } },
    };
    inner = S.writeSheet(inner, sheet);   // extensions.klite_rpmod.sheet, rating kept
    return inner;
}

// ---- a small portrait PNG (drawn here, no external image) --------------------------------
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
function portraitPng(W = 400, H = 600) {
    const raw = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0;
        for (let x = 0; x < W; x++) {
            const o = y * (W * 3 + 1) + 1 + x * 3;
            let r = 30 + (y / H) * 60, g = 40 + (y / H) * 30, b = 70 + (x / W) * 60;         // dusk gradient
            const dx = x - W / 2, dy = y - H * 0.38;
            if (dx * dx + dy * dy < 70 * 70) { r = 200; g = 170; b = 140; }                   // head
            if (y > H * 0.5 && Math.abs(dx) < 60 + (y - H * 0.5) * 0.6) { r = 110; g = 115; b = 125; }   // armour
            if (Math.abs(dx - 95) < 5 && y > H * 0.3 && y < H * 0.85) { r = 220; g = 220; b = 230; }   // sword
            raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
        }
    }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- make -----------------------------------------------------------------------------------
async function make(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const h = createHost(); h.installTavernTool();
    globalThis.window = h.window;
    try {
        const inner = buildInner();
        const png = 'data:image/png;base64,' + portraitPng().toString('base64');
        const out = L.embedCardInImage(png, inner);
        if (out === png) throw new Error('embedding failed (tavernTool missing?)');
        fs.writeFileSync(path.join(dir, `${NAME}.png`), Buffer.from(out.slice('data:image/png;base64,'.length), 'base64'));
        fs.writeFileSync(path.join(dir, `${NAME} (no portrait).json`), JSON.stringify(inner));   // what Esolite downloads without a portrait
        fs.writeFileSync(path.join(dir, 'original.json'), JSON.stringify(L.v2Card(inner), null, 2));
        console.log(`wrote to ${dir}:\n  ${NAME}.png\n  ${NAME} (no portrait).json\n  original.json (the V2 card inside the PNG, for reference)`);
    } finally { h.close(); delete globalThis.window; }
}

// ---- check ----------------------------------------------------------------------------------
function readCard(file, tool) {
    const bytes = new Uint8Array(fs.readFileSync(file));
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        const res = tool.extractCardFromPngBytes(bytes, ['chara']);
        const v3 = tool.extractCardFromPngBytes(bytes, ['ccv3']);
        return { kind: 'png', card: res.card, v3: v3.card, keys: Object.keys(res.chunks.map || {}) };
    }
    return { kind: 'json', card: JSON.parse(Buffer.from(bytes).toString('utf8')), v3: null, keys: [] };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function compare(label, orig, got, report) {
    const d = got && got.data && typeof got.data === 'object' ? got.data : got;   // V2/V3 wrapper or bare inner
    const o = orig.data;
    const ok = (what, cond, detail) => report.push(`${cond ? '  ✔' : '  ✖'} ${label}: ${what}${!cond && detail ? ` — ${detail}` : ''}`);
    ok('spec', !!(got && got.spec), `no spec (bare object)`);
    if (got && got.spec) report.push(`    spec = ${got.spec} ${got.spec_version || ''}`);
    for (const k of ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes', 'system_prompt', 'post_history_instructions', 'creator', 'character_version'])
        ok(k, d && d[k] === o[k], d ? JSON.stringify(d[k]).slice(0, 80) : 'missing');
    ok('alternate_greetings', d && same(d.alternate_greetings, o.alternate_greetings));
    ok('tags', d && same(d.tags, o.tags), d && JSON.stringify(d.tags));
    const eb = d && d.character_book, ob = o.character_book;
    ok('lorebook entries', !!eb && Array.isArray(eb.entries) && eb.entries.length === ob.entries.length && ob.entries.every((e, i) => eb.entries[i] && same(eb.entries[i].keys, e.keys) && eb.entries[i].content === e.content), eb ? `${(eb.entries || []).length} entries` : 'no character_book');
    const ext = (d && d.extensions) || {};
    ok('foreign extension kept', same(ext.rpmod_roundtrip_marker, MARKER), JSON.stringify(ext.rpmod_roundtrip_marker));
    const mine = ext.klite_rpmod || {};
    ok('RPmod rating', mine.rating === 4, JSON.stringify(mine.rating));
    const sOrig = S.readSheet(o), sGot = d ? S.readSheet(d) : null;
    ok('RPmod sheet present', !!sGot);
    if (sGot) {
        ok('RPmod sheet identical', same(sGot, sOrig), 'differs');
        const a = S.derive(sOrig), b = S.derive(sGot);
        ok('derived AC/HP/attacks/skills', a.sheet.ac === b.sheet.ac && same(a.sheet.hp, b.sheet.hp) && same(a.attacks, b.attacks) && same(a.skills, b.skills));
        ok('Unicode notes', sGot.notes === sOrig.notes, JSON.stringify(sGot.notes));
    }
    const extra = d ? Object.keys(ext).filter(k => !['rpmod_roundtrip_marker', 'klite_rpmod'].includes(k)) : [];
    if (extra.length) report.push(`    extensions added by the other app: ${extra.join(', ')}`);
    const newFields = d ? Object.keys(d).filter(k => !(k in o)) : [];
    if (newFields.length) report.push(`    fields added: ${newFields.join(', ')}`);
}
function check(files) {
    const dir = path.join(ROOT, 'roundtrip');
    const origFile = path.join(dir, 'original.json');
    if (!fs.existsSync(origFile)) throw new Error('run "make" first (roundtrip/original.json missing)');
    const orig = JSON.parse(fs.readFileSync(origFile, 'utf8'));
    const h = createHost(); h.installTavernTool();
    const tool = h.window.tavernTool;
    let fails = 0;
    try {
        for (const f of files) {
            const r = readCard(f, tool); const report = [];
            console.log(`\n${path.basename(f)} (${r.kind}${r.keys.length ? ', tEXt: ' + r.keys.join(', ') : ''})`);
            if (!r.card) { console.log('  ✖ no card found'); fails++; continue; }
            compare('chara', orig, r.card, report);
            if (r.v3) compare('ccv3', orig, r.v3, report);
            console.log(report.join('\n'));
            fails += report.filter(l => l.includes('✖')).length;
        }
    } finally { h.close(); }
    console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
    process.exitCode = fails ? 1 : 0;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'make') make(path.resolve(args[0] || path.join(ROOT, 'roundtrip'))).catch(e => { console.error(e); process.exitCode = 1; });
else if (cmd === 'check' && args.length) check(args.map(a => path.resolve(a)));
else console.log('usage: node scripts/roundtrip-card.js make [dir] | check <file>…');
