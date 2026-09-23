// =============================================================================
// KLITE RPmod — Character sheet model (d20, SRD 5.2 rules; CC-BY-4.0)
// -----------------------------------------------------------------------------
// One character = a TavernCard (Esolite's Library) + this sheet, stored inside the card at
// `data.extensions.klite_rpmod.sheet` so it travels with the card (V2 extensions are kept
// by SillyTavern, Chub and Esolite). Other keys under `klite_rpmod` (older RPmod versions
// stored ratings there) are preserved untouched.
//
// Pure functions only (no DOM, no storage) — see store.js for loading/saving.
// Rules used (SRD 5.2): ability modifier = floor((score − 10) / 2); proficiency bonus by
// level (+2 at 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20); saving throw / skill
// = ability modifier (+ proficiency bonus if proficient, ×2 with expertise); initiative =
// DEX modifier; passive Perception = 10 + Perception bonus.
// =============================================================================

export const EXT_KEY = 'klite_rpmod';
export const SHEET_VERSION = 1;

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

// The 18 skills of the SRD 5.2 with their abilities.
export const SKILLS = [
    ['acrobatics', 'Acrobatics', 'dex'], ['animal_handling', 'Animal Handling', 'wis'], ['arcana', 'Arcana', 'int'],
    ['athletics', 'Athletics', 'str'], ['deception', 'Deception', 'cha'], ['history', 'History', 'int'],
    ['insight', 'Insight', 'wis'], ['intimidation', 'Intimidation', 'cha'], ['investigation', 'Investigation', 'int'],
    ['medicine', 'Medicine', 'wis'], ['nature', 'Nature', 'int'], ['perception', 'Perception', 'wis'],
    ['performance', 'Performance', 'cha'], ['persuasion', 'Persuasion', 'cha'], ['religion', 'Religion', 'int'],
    ['sleight_of_hand', 'Sleight of Hand', 'dex'], ['stealth', 'Stealth', 'dex'], ['survival', 'Survival', 'wis'],
].map(([id, name, ability]) => ({ id, name, ability }));
const SKILL_IDS = new Set(SKILLS.map(s => s.id));

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const int = (v, d = 0) => Math.trunc(num(v, d));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const str = (v) => (v == null ? '' : String(v)).trim();

export function abilityMod(score) { return Math.floor((num(score, 10) - 10) / 2); }
export function proficiencyBonus(level) { return 2 + Math.floor((clamp(int(level, 1), 1, 20) - 1) / 4); }
export function fmt(n) { return (n >= 0 ? '+' : '') + n; }

export function defaultSheet() {
    return {
        version: SHEET_VERSION,
        level: 1, className: '', species: '', background: '', alignment: '',
        xp: 0,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        saves: [],                 // proficient saving throws (ability ids)
        skills: {},                // skill id -> 1 (proficient) | 2 (expertise)
        ac: 10, speed: 30,
        hp: { max: 10, current: 10, temp: 0 },
        attacks: [],               // [{ name, ability: 'str'|'dex'|…, proficient, bonus (extra to hit), damage: '1d8+3', notes }]
        spellcasting: null,        // { ability, cantrips, prepared, slots: [per spell level], pact } (from the builder)
        proficiencies: '',         // weapons / armor / tools / languages (text)
        acNote: '',                // how AC is made up, e.g. "Chain Mail + Shield"
        build: null,               // builder choices (builder-rules.js) — used for level up
        inventory: [],             // [{ name, qty, notes }]
        coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
        features: '', notes: '',
    };
}

// Make any stored or imported value a valid sheet (unknown fields are kept).
export function normalizeSheet(raw) {
    const d = defaultSheet();
    const s = Object.assign({}, raw && typeof raw === 'object' ? raw : {});
    s.version = SHEET_VERSION;
    s.level = clamp(int(s.level, 1), 1, 20);
    for (const k of ['className', 'species', 'background', 'alignment', 'features', 'notes', 'proficiencies', 'acNote']) s[k] = str(s[k]);
    s.xp = Math.max(0, int(s.xp, 0));
    const ab = Object.assign({}, d.abilities, s.abilities && typeof s.abilities === 'object' ? s.abilities : {});
    for (const a of ABILITIES) ab[a] = clamp(int(ab[a], 10), 1, 30);
    s.abilities = ab;
    s.saves = [...new Set((Array.isArray(s.saves) ? s.saves : []).filter(a => ABILITIES.includes(a)))];
    const sk = {};
    if (s.skills && typeof s.skills === 'object') for (const [k, v] of Object.entries(s.skills)) if (SKILL_IDS.has(k) && (v === 1 || v === 2 || v === true)) sk[k] = v === true ? 1 : v;
    s.skills = sk;
    s.ac = clamp(int(s.ac, 10), 0, 40);
    s.speed = Math.max(0, int(s.speed, 30));
    const hp = Object.assign({}, d.hp, s.hp && typeof s.hp === 'object' ? s.hp : {});
    hp.max = Math.max(1, int(hp.max, 10)); hp.current = clamp(int(hp.current, hp.max), -hp.max, hp.max); hp.temp = Math.max(0, int(hp.temp, 0));
    s.hp = hp;
    s.attacks = (Array.isArray(s.attacks) ? s.attacks : []).filter(a => a && str(a.name)).map(a => ({
        name: str(a.name), ability: ABILITIES.includes(a.ability) ? a.ability : 'str', proficient: a.proficient !== false,
        bonus: int(a.bonus, 0), damage: str(a.damage), notes: str(a.notes),
    }));
    s.inventory = (Array.isArray(s.inventory) ? s.inventory : []).filter(i => i && str(i.name)).map(i => ({ name: str(i.name), qty: Math.max(1, int(i.qty, 1)), notes: str(i.notes) }));
    const coins = Object.assign({}, d.coins, s.coins && typeof s.coins === 'object' ? s.coins : {});
    for (const c of Object.keys(d.coins)) coins[c] = Math.max(0, int(coins[c], 0));
    s.coins = coins;
    if (s.spellcasting && typeof s.spellcasting === 'object' && ABILITIES.includes(s.spellcasting.ability)) {
        const sc = s.spellcasting;
        s.spellcasting = { ability: sc.ability, pact: !!sc.pact, cantrips: Math.max(0, int(sc.cantrips, 0)), prepared: Math.max(0, int(sc.prepared, 0)),
            slots: (Array.isArray(sc.slots) ? sc.slots : []).map(n => Math.max(0, int(n, 0))).slice(0, 9), slotLevel: int(sc.slotLevel, 0) || undefined,
            used: (Array.isArray(sc.used) ? sc.used : []).map(n => Math.max(0, int(n, 0))).slice(0, 9), spells: str(sc.spells) };
    } else s.spellcasting = null;
    if (!s.build || typeof s.build !== 'object') s.build = null;
    return s;
}

// Everything the sheet shows and rolls with.
export function derive(sheet) {
    const s = normalizeSheet(sheet);
    const pb = proficiencyBonus(s.level);
    const mods = Object.fromEntries(ABILITIES.map(a => [a, abilityMod(s.abilities[a])]));
    const saves = Object.fromEntries(ABILITIES.map(a => [a, mods[a] + (s.saves.includes(a) ? pb : 0)]));
    const skills = Object.fromEntries(SKILLS.map(k => [k.id, mods[k.ability] + (s.skills[k.id] || 0) * pb]));
    const attacks = s.attacks.map(a => ({ ...a, toHit: mods[a.ability] + (a.proficient ? pb : 0) + (a.bonus || 0) }));
    const spell = s.spellcasting ? { ...s.spellcasting, saveDC: 8 + mods[s.spellcasting.ability] + pb, attack: mods[s.spellcasting.ability] + pb } : null;
    return { sheet: s, pb, mods, saves, skills, attacks, spell, initiative: mods.dex, passivePerception: 10 + skills.perception };
}

// ---- card <-> sheet ------------------------------------------------------------------
// `inner` = TavernCard V2 `data` object (what Esolite stores as record.data).
export function readSheet(inner) {
    const ext = inner && inner.extensions && inner.extensions[EXT_KEY];
    return ext && ext.sheet ? normalizeSheet(ext.sheet) : null;
}
// Returns a new inner object with the sheet set (or removed with sheet = null); every
// other extension and every other klite_rpmod key is kept.
export function writeSheet(inner, sheet) {
    const out = Object.assign({}, inner || {});
    const ext = Object.assign({}, out.extensions && typeof out.extensions === 'object' ? out.extensions : {});
    const mine = Object.assign({}, ext[EXT_KEY] && typeof ext[EXT_KEY] === 'object' ? ext[EXT_KEY] : {});
    if (sheet) mine.sheet = normalizeSheet(sheet); else delete mine.sheet;
    if (Object.keys(mine).length) ext[EXT_KEY] = mine; else delete ext[EXT_KEY];
    out.extensions = ext;
    return out;
}

// ---- Worlds stat block <-> sheet (persons linked to a card) ----------------------------
// Worlds persons carry { abilities, ac, hpMax, speed, proficiency, initiativeMod, attacks }.
export function toCombatStats(sheet) {
    const d = derive(sheet);
    return {
        abilities: { ...d.sheet.abilities }, ac: d.sheet.ac, hpMax: d.sheet.hp.max, speed: d.sheet.speed,
        proficiency: d.pb, initiativeMod: d.initiative, saves: { ...d.saves },
        attacks: d.attacks.map(a => ({ name: a.name, toHit: a.toHit, damage: a.damage || '1d4' })),
    };
}
export function fromCombatStats(stats, extra) {
    const st = stats || {};
    return normalizeSheet(Object.assign({
        abilities: st.abilities, ac: st.ac, speed: st.speed,
        hp: { max: st.hpMax, current: st.hpMax },
        attacks: (Array.isArray(st.attacks) ? st.attacks : []).map(a => ({ name: a.name, ability: 'str', proficient: true, damage: a.damage })),
    }, extra || {}));
}

// Short text for the AI (persona / active character): who they are in game terms.
export function sheetSummary(sheet) {
    const d = derive(sheet); const s = d.sheet;
    const who = [s.species, s.className && `${s.className} ${s.level}`, !s.className && `level ${s.level}`].filter(Boolean).join(' ');
    const lines = [
        `${who || 'Level ' + s.level} — HP ${s.hp.current}/${s.hp.max}${s.hp.temp ? ` (+${s.hp.temp} temp)` : ''}, AC ${s.ac}, Speed ${s.speed} ft.`,
        ABILITIES.map(a => `${a.toUpperCase()} ${s.abilities[a]} (${fmt(d.mods[a])})`).join(', '),
    ];
    const prof = SKILLS.filter(k => s.skills[k.id]).map(k => `${k.name} ${fmt(d.skills[k.id])}`);
    if (prof.length) lines.push('Skills: ' + prof.join(', '));
    if (d.spell) lines.push(`Spellcasting (${d.spell.ability.toUpperCase()}): save DC ${d.spell.saveDC}, spell attack ${fmt(d.spell.attack)}` + (d.spell.slots.length ? `, slots ${d.spell.slots.map((n, i) => n ? `L${i + 1}×${n}` : '').filter(Boolean).join(' ')}` : '') + (d.spell.spells ? `; spells: ${d.spell.spells}` : ''));
    if (s.inventory.length) lines.push('Inventory: ' + s.inventory.map(i => i.name + (i.qty > 1 ? ` x${i.qty}` : '')).join(', '));
    const coins = Object.entries(s.coins).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
    if (coins.length) lines.push('Coins: ' + coins.join(', '));
    return lines.join('\n');
}
