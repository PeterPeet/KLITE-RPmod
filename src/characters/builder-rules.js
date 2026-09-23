// =============================================================================
// KLITE RPmod — Character builder rules (SRD 5.2.1, levels 1–3)
// -----------------------------------------------------------------------------
// Pure functions: choices (class, background, species, ability scores, skills, equipment,
// …) → a character sheet (sheet.js). The choices are stored on the sheet (`sheet.build`)
// so a character can later be rebuilt at the next level ("level up").
// Rules follow "Character Creation" in the SRD 5.2.1 (see src/data/srd52.js; CC-BY-4.0).
// =============================================================================
import { SRD } from '../data/srd52.js';
import { ABILITIES, SKILLS, abilityMod, proficiencyBonus, normalizeSheet } from './sheet.js';

export const MAX_LEVEL = 3;
const SKILL_IDS = SKILLS.map(s => s.id);

// ---- ability scores -----------------------------------------------------------------------
export function pointBuyCost(scores) {
    const c = SRD.pointBuy.costs; let total = 0;
    for (const a of ABILITIES) { const v = Number(scores && scores[a]); if (!(v in c)) return Infinity; total += c[v]; }
    return total;
}
export function isStandardArray(scores) {
    const got = ABILITIES.map(a => Number(scores && scores[a])).sort((x, y) => y - x);
    return JSON.stringify(got) === JSON.stringify(SRD.standardArray);
}
// Background increase: { plus2, plus1 } (two different listed abilities) or { all: true } (+1 to each of the three).
export function backgroundBonus(bg, bonus) {
    const out = Object.fromEntries(ABILITIES.map(a => [a, 0]));
    if (!bg) return out;
    if (bonus && bonus.all) { for (const a of bg.abilities) out[a] += 1; return out; }
    if (bonus && bg.abilities.includes(bonus.plus2)) out[bonus.plus2] += 2;
    if (bonus && bg.abilities.includes(bonus.plus1) && bonus.plus1 !== bonus.plus2) out[bonus.plus1] += 1;
    return out;
}
export function finalAbilities(choices) {
    const bg = SRD.backgrounds[choices.background];
    const inc = backgroundBonus(bg, choices.bgBonus);
    return Object.fromEntries(ABILITIES.map(a => [a, Math.min(20, (Number(choices.scores && choices.scores[a]) || 10) + inc[a])]));
}

// ---- what a choice set still needs ------------------------------------------------------
// Number of skills the player picks: class choice + species (Human Skillful, Elf Keen
// Senses) + Barbarian Primal Knowledge at level 3 + Skilled feat (Human Versatile).
export function skillPicks(choices) {
    const cls = SRD.classes[choices.class];
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    const n = { class: cls ? cls.skills.choose : 0, species: 0, extra: 0 };
    if (choices.species === 'human') n.species = 1;
    if (choices.class === 'barbarian' && level >= 3) n.extra += 1;
    if (choices.species === 'human' && choices.originFeat === 'Skilled') n.extra += 3;
    return n;
}
export function classSkillOptions(choices) {
    const cls = SRD.classes[choices.class];
    if (!cls) return [];
    return cls.skills.options === 'any' ? SKILL_IDS.slice() : cls.skills.options.slice();
}
export function speciesSkillOptions(choices) {
    if (choices.species === 'elf') return ['insight', 'perception', 'survival'];   // Keen Senses
    if (choices.species === 'human') return SKILL_IDS.slice();                         // Skillful
    return [];
}
// Expertise picks by class/level (Bard 2 at level 2, Rogue 2 at level 1).
export function expertisePicks(choices) {
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    if (choices.class === 'rogue') return 2;
    if (choices.class === 'bard' && level >= 2) return 2;
    return 0;
}
export function fightingStyleAt(choices) {
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    return (choices.class === 'fighter' && level >= 1) || ((choices.class === 'paladin' || choices.class === 'ranger') && level >= 2);
}
export const FIGHTING_STYLES = ['Archery', 'Defense', 'Great Weapon Fighting', 'Two-Weapon Fighting'];

// All proficient skills from the choices (background + class + species + extras).
export function proficientSkills(choices) {
    const bg = SRD.backgrounds[choices.background];
    const set = new Set(bg ? bg.skills : []);
    for (const s of [].concat(choices.classSkills || [], choices.speciesSkills || [], choices.extraSkills || [])) if (SKILL_IDS.includes(s)) set.add(s);
    return [...set];
}

// Problems that block "Create" (empty list = complete).
export function validate(choices) {
    const errs = [];
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background], sp = SRD.species[choices.species];
    if (!cls) errs.push('Choose a class.');
    if (!bg) errs.push('Choose a background.');
    if (!sp) errs.push('Choose a species.');
    if (choices.method === 'standard' && !isStandardArray(choices.scores)) errs.push('Assign each number of the standard array (15, 14, 13, 12, 10, 8) once.');
    if (choices.method === 'pointbuy') { const cost = pointBuyCost(choices.scores); if (cost > SRD.pointBuy.budget) errs.push(`Point buy: ${cost === Infinity ? 'scores must be 8–15' : cost + ' of 27 points spent'}.`); }
    if (bg && !(choices.bgBonus && (choices.bgBonus.all || (choices.bgBonus.plus2 && choices.bgBonus.plus1 && choices.bgBonus.plus2 !== choices.bgBonus.plus1)))) errs.push('Choose how the background increases your ability scores.');
    const picks = skillPicks(choices);
    const cs = (choices.classSkills || []).filter(s => classSkillOptions(choices).includes(s));
    if (cls && cs.length !== picks.class) errs.push(`Choose ${picks.class} class skill${picks.class === 1 ? '' : 's'}.`);
    if (picks.species && (choices.speciesSkills || []).length !== picks.species) errs.push('Choose the skill from your species.');
    if (choices.species === 'elf' && (choices.speciesSkills || []).length !== 1) errs.push('Choose the Keen Senses skill (Insight, Perception or Survival).');
    if (picks.extra && (choices.extraSkills || []).length !== picks.extra) errs.push(`Choose ${picks.extra} more skill${picks.extra === 1 ? '' : 's'}.`);
    const exp = expertisePicks(choices);
    if (exp && (choices.expertise || []).filter(s => proficientSkills(choices).includes(s)).length !== exp) errs.push(`Choose ${exp} skills for Expertise (from your proficiencies).`);
    if (fightingStyleAt(choices) && !FIGHTING_STYLES.includes(choices.fightingStyle)) errs.push('Choose a Fighting Style.');
    if (!String(choices.name || '').trim()) errs.push('Give your character a name.');
    return errs;
}

// ---- equipment → inventory, armor, weapons -----------------------------------------------
// "4 Handaxes" → { name: 'Handaxe', qty: 4 }; "20 Arrows" → Arrow ×20.
export function parseItem(text) {
    const m = /^(\d+)\s+(.+)$/.exec(String(text).trim());
    let qty = 1, name = String(text).trim();
    if (m) { qty = Number(m[1]); name = m[2]; }
    if (qty > 1) {
        // singular: try "-s", "-es", "-ies" and prefer a known item (weapon, ammunition, pouch)
        const candidates = [name.replace(/s$/, ''), name.replace(/es$/, ''), name.replace(/ies$/, 'y')];
        const known = candidates.find(c => SRD.weapons[c] || /^(Arrow|Bolt|Needle|Bullet|Pouch|Sheet)$/.test(c));
        if (known) name = known;
    }
    return { name, qty };
}
export function startingItems(choices) {
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background];
    const pick = (list, id) => (list || []).find(o => o.id === id) || (list || [])[0];
    const ce = cls ? pick(cls.equipment, choices.classEquipment) : null;
    const be = bg ? pick(bg.equipment, choices.backgroundEquipment) : null;
    const items = [...(ce ? ce.items : []), ...(be ? be.items : [])].map(parseItem);
    const merged = [];
    for (const it of items) { const hit = merged.find(x => x.name === it.name); if (hit) hit.qty += it.qty; else merged.push({ ...it, notes: '' }); }
    return { items: merged, gp: (ce ? ce.gp : 0) + (be ? be.gp : 0) };
}

function weaponProficient(cls, weapon, name) {
    if (!cls || !weapon) return false;
    if (weapon.category.startsWith('simple')) return true;
    if (/Martial/.test(cls.weapons) && !/that have/.test(cls.weapons)) return true;
    if (cls.name === 'Monk') return /Light/.test(weapon.properties) && weapon.category === 'martial melee';
    if (cls.name === 'Rogue') return /(Finesse|Light)/.test(weapon.properties);
    return false;
}
export function armorClass(abilities, items, cls, sheetExtras) {
    const dex = abilityMod(abilities.dex);
    const names = items.map(i => i.name);
    const armorName = names.find(n => SRD.armor[n]);
    const shield = names.includes('Shield') ? 2 : 0;
    const options = [];
    if (armorName) {
        const a = SRD.armor[armorName];
        const dexPart = a.dexCap === 0 ? 0 : a.dexCap == null ? dex : Math.min(dex, a.dexCap);
        options.push({ ac: a.base + dexPart + shield + (sheetExtras.defense ? 1 : 0), how: armorName + (shield ? ' + Shield' : '') + (sheetExtras.defense ? ' + Defense' : '') });
    } else {
        options.push({ ac: 10 + dex + shield, how: 'No armor' + (shield ? ' + Shield' : '') });
        if (cls && cls.name === 'Barbarian') options.push({ ac: 10 + dex + abilityMod(abilities.con) + shield, how: 'Unarmored Defense' + (shield ? ' + Shield' : '') });
        if (cls && cls.name === 'Monk' && !shield) options.push({ ac: 10 + dex + abilityMod(abilities.wis), how: 'Unarmored Defense' });
        if (sheetExtras.draconic) options.push({ ac: 10 + dex + abilityMod(abilities.cha) + shield, how: 'Draconic Resilience' + (shield ? ' + Shield' : '') });
    }
    return options.sort((x, y) => y.ac - x.ac)[0];
}
export function attacksFor(abilities, items, cls, style) {
    const out = [];
    for (const it of items) {
        const w = SRD.weapons[it.name]; if (!w) continue;
        const ranged = w.category.endsWith('ranged');
        const finesse = /Finesse/.test(w.properties);
        let ability = ranged ? 'dex' : 'str';
        if (finesse && abilityMod(abilities.dex) > abilityMod(abilities.str)) ability = 'dex';
        if (cls && cls.name === 'Monk' && !ranged && abilityMod(abilities.dex) > abilityMod(abilities.str) && (w.category === 'simple melee' || /Light/.test(w.properties))) ability = 'dex';
        const mod = abilityMod(abilities[ability]);
        const bonusHit = ranged && style === 'Archery' ? 2 : 0;
        out.push({
            name: it.name, ability, proficient: weaponProficient(cls, w, it.name),
            damage: w.damage + (mod ? (mod > 0 ? '+' : '') + mod : ''),
            notes: [w.type, w.properties, w.mastery && 'Mastery: ' + w.mastery, bonusHit && '+2 to hit (Archery)'].filter(Boolean).join(' · '),
            hitBonus: bonusHit,
        });
    }
    return out;
}

// ---- features text ------------------------------------------------------------------------
function firstSentence(paras) { const t = (paras && paras[0]) || ''; const m = /^(.{20,220}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 220); }
export function featureList(choices) {
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background], sp = SRD.species[choices.species];
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    const out = [];
    if (cls) {
        for (const f of cls.features) if (f.level <= level && !/ Subclass$/.test(f.name)) out.push({ name: f.name, source: `${cls.name} ${f.level}`, text: f.text });
        if (level >= 3) for (const f of cls.subclassFeatures) out.push({ name: f.name, source: `${cls.subclass} 3`, text: f.text });
    }
    if (sp) for (const t of sp.traits) out.push({ name: t.name, source: sp.name, text: t.text });
    const featName = bg && bg.feat.replace(/ \(.+\)$/, '');
    if (bg && SRD.feats[featName]) out.push({ name: bg.feat, source: bg.name + ' (Origin feat)', text: SRD.feats[featName].text });
    if (choices.species === 'human' && choices.originFeat && SRD.feats[choices.originFeat]) out.push({ name: choices.originFeat, source: 'Human (Versatile)', text: SRD.feats[choices.originFeat].text });
    if (fightingStyleAt(choices) && SRD.feats[choices.fightingStyle]) out.push({ name: choices.fightingStyle, source: 'Fighting Style', text: SRD.feats[choices.fightingStyle].text });
    return out;
}

// ---- the sheet ------------------------------------------------------------------------------
export function hitPoints(choices, abilities) {
    const cls = SRD.classes[choices.class]; if (!cls) return 1;
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    const con = abilityMod(abilities.con);
    let hp = cls.hitDie + con;
    for (let l = 2; l <= level; l++) hp += Math.max(1, cls.hitDie / 2 + 1 + con);   // fixed value per level
    if (choices.species === 'dwarf') hp += level;                                  // Dwarven Toughness
    return Math.max(1, hp);
}

export function buildSheet(choices, previous) {
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background], sp = SRD.species[choices.species];
    const level = Math.min(MAX_LEVEL, Math.max(1, Number(choices.level) || 1));
    const abilities = finalAbilities(choices);
    const { items, gp } = startingItems(choices);
    const style = fightingStyleAt(choices) ? choices.fightingStyle : '';
    const ac = armorClass(abilities, items, cls, { defense: style === 'Defense', draconic: choices.class === 'sorcerer' && level >= 3 });
    const skills = {};
    for (const s of proficientSkills(choices)) skills[s] = 1;
    for (const s of choices.expertise || []) if (skills[s]) skills[s] = 2;
    let speed = sp ? sp.speed : 30;
    if (choices.species === 'elf' && /Wood Elf/.test(choices.speciesOption || '')) speed = 35;
    const armorWorn = items.some(i => SRD.armor[i.name]);
    if (choices.class === 'monk' && level >= 2 && !armorWorn && !items.some(i => i.name === 'Shield')) speed += 10;
    const hp = hitPoints(choices, abilities);
    const feats = featureList(choices);
    const spell = cls && cls.spellcasting;
    const prevInv = previous && Array.isArray(previous.inventory) ? previous.inventory : null;
    const sheet = {
        level, className: cls ? cls.name + (level >= 3 ? ` (${cls.subclass})` : '') : '', species: sp ? sp.name + (choices.speciesOption ? ` (${choices.speciesOption})` : '') : '',
        background: bg ? bg.name : '', alignment: choices.alignment || '',
        xp: Math.max(previous ? Number(previous.xp) || 0 : 0, SRD.xp[level - 1]),
        abilities, saves: cls ? cls.saves.slice() : [], skills, ac: ac.ac, speed,
        hp: { max: hp, current: previous && previous.hp ? Math.min(hp, (Number(previous.hp.current) || 0) + (hp - (Number(previous.hp.max) || hp))) : hp, temp: 0 },
        attacks: attacksFor(abilities, items, cls, style).map(({ hitBonus, ...a }) => Object.assign(a, { bonus: hitBonus })),
        // level up keeps what the character owns now; a new character gets the starting equipment
        inventory: prevInv || items, coins: previous && previous.coins ? previous.coins : { cp: 0, sp: 0, gp, pp: 0 },
        features: feats.map(f => `• ${f.name} (${f.source}): ${firstSentence(f.text)}`).join('\n'),
        notes: previous && previous.notes ? previous.notes : '',
        acNote: ac.how,
        proficiencies: [cls && `Weapons: ${cls.weapons}`, cls && `Armor: ${cls.armor}`, [cls && cls.tools, bg && bg.tool].filter(Boolean).length ? `Tools: ${[cls && cls.tools, bg && bg.tool].filter(Boolean).join('; ')}` : '',
            `Languages: Common${(choices.languages || []).length ? ', ' + choices.languages.join(', ') : ''}${choices.class === 'rogue' ? ", Thieves' Cant" : ''}${choices.class === 'druid' ? ', Druidic' : ''}`].filter(Boolean).join('\n'),
        spellcasting: spell ? Object.assign({ ability: spell.ability, pact: !!spell.pact }, spell.levels[level]) : null,
        build: Object.assign({}, choices, { level, source: SRD.source }),
    };
    return normalizeSheet(sheet);
}

// Level up = the same choices one level higher (plus the new level's choices).
export function nextLevelChoices(sheet) {
    const b = sheet && sheet.build;
    if (!b || !SRD.classes[b.class]) return null;
    const level = Number(sheet.level) || 1;
    if (level >= MAX_LEVEL) return null;
    return Object.assign({}, b, { level: level + 1 });
}
