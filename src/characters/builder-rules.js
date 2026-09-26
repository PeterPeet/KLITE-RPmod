// =============================================================================
// KLITE RPmod — Character builder rules (SRD 5.2.1, levels 1–20)
// -----------------------------------------------------------------------------
// Pure functions: choices (class, background, species, ability scores, skills, equipment,
// …) → a character sheet (sheet.js). The choices are stored on the sheet (`sheet.build`)
// so a character can later be rebuilt at the next level ("level up").
// Rules follow "Character Creation" in the SRD 5.2.1 (see src/data/srd52.js; CC-BY-4.0).
// =============================================================================
import { SRD } from '../data/srd52.js';
import { ABILITIES, SKILLS, abilityMod, proficiencyBonus, normalizeSheet } from './sheet.js';
import { grantedSpells, spellErrors, defaultMentalAbility, spellLimits } from './spell-rules.js';

export const MAX_LEVEL = 20;
const SKILL_IDS = SKILLS.map(s => s.id);
const levelOf = (choices) => Math.min(MAX_LEVEL, Math.max(1, Number(choices && choices.level) || 1));

// ---- feats at "Ability Score Improvement" / "Epic Boon" levels ----------------------------
// choices.asi = { [level]: { feat, abilities: ['str', …], skills: [...] } }
//   Ability Score Improvement: two +1 picks (the same ability twice = +2), max 20
//   a feat with an ability increase (Grappler, epic boons): one pick of +by (feat.increase)
//   Skilled: three skills
export const ORIGIN_FEATS = ['Alert', 'Magic Initiate', 'Savage Attacker', 'Skilled'];
// Level 1 choices of the Cleric (Divine Order) and the Druid (Primal Order): choices.divineOrder /
// choices.primalOrder. Protector/Warden: Martial weapons + Heavy/Medium armor training;
// Thaumaturge/Magician: one extra cantrip + WIS modifier (min +1) on Arcana and Religion/Nature.
export const ORDERS = {
    cleric: { key: 'divineOrder', feature: 'Divine Order', options: { protector: 'Protector', thaumaturge: 'Thaumaturge' } },
    druid: { key: 'primalOrder', feature: 'Primal Order', options: { magician: 'Magician', warden: 'Warden' } },
};
export function orderOf(choices) {
    const o = ORDERS[choices && choices.class]; if (!o) return null;
    const v = choices[o.key]; return o.options[v] ? { class: choices.class, key: o.key, value: v, name: o.options[v], feature: o.feature } : null;
}
const MARTIAL_ORDER = ['protector', 'warden'];
// Does the character have this feat (origin feat of the background or the human, or a feat level)?
export function hasFeat(choices, name) {
    const bg = SRD.backgrounds[choices.background];
    if (bg && bg.feat.replace(/ \(.+\)$/, '') === name) return true;
    if (choices.species === 'human' && choices.originFeat === name) return true;
    return chosenFeats(choices).some(x => x.pick.feat === name);
}
export const EPIC_BOONS = Object.keys(SRD.feats).filter(n => /^Epic Boon/.test(SRD.feats[n].category));
export function featLevels(choices) {
    const cls = SRD.classes[choices.class]; if (!cls || !cls.levels) return [];
    const out = [];
    for (let l = 1; l <= levelOf(choices); l++) {
        const f = cls.levels[l] || [];
        if (f.includes('Epic Boon')) out.push({ level: l, kind: 'boon' });
        else if (f.includes('Ability Score Improvement')) out.push({ level: l, kind: 'asi' });
    }
    return out;
}
const hasFightingStyle = (choices) => ['fighter', 'paladin', 'ranger'].includes(choices.class);
// Feats open at a feat level (prerequisites checked in validate()).
export function featOptions(choices, level) {
    const kind = (featLevels(choices).find(x => x.level === Number(level)) || {}).kind;
    if (!kind) return [];
    const list = ['Ability Score Improvement', 'Grappler', ...ORIGIN_FEATS, ...(hasFightingStyle(choices) ? FIGHTING_STYLES : [])];
    return kind === 'boon' ? [...EPIC_BOONS, ...list] : list;
}
// What a chosen feat asks for: { picks, by, max, choose } for ability increases; skills: n.
export function featNeeds(featName) {
    if (featName === 'Ability Score Improvement') return { picks: 2, by: 1, max: 20, choose: ABILITIES.slice(), skills: 0 };
    const f = SRD.feats[featName];
    const inc = f && f.increase;
    return { picks: inc ? 1 : 0, by: inc ? inc.by : 0, max: inc ? inc.max : 20, choose: inc ? (inc.choose === 'any' ? ABILITIES.slice() : inc.choose) : [], skills: featName === 'Skilled' ? 3 : 0 };
}
function chosenFeats(choices) {
    return featLevels(choices).map(({ level, kind }) => ({ level, kind, pick: (choices.asi && choices.asi[level]) || {} }));
}
// What the spell rules (spell-rules.js) need from the choices. choices.spells = { cantrips,
// prepared, spellbook } (spell keys), choices.magicInitiate = { [source]: { list, ability,
// cantrips, spell } }, choices.speciesSpellAbility, choices.landType (Circle of the Land).
export function spellContext(choices) {
    const bg = SRD.backgrounds[choices.background];
    return { cls: choices.class, level: levelOf(choices), species: choices.species, speciesOption: choices.speciesOption,
        backgroundFeat: bg ? bg.feat : '', originFeat: choices.originFeat,
        asiFeats: chosenFeats(choices).filter(x => x.pick.feat).map(x => ({ level: x.level, feat: x.pick.feat })),
        divineOrder: choices.divineOrder, primalOrder: choices.primalOrder,
        abilities: finalAbilities(choices), spells: choices.spells || {}, magicInitiate: choices.magicInitiate || {},
        speciesSpellAbility: choices.speciesSpellAbility, landType: choices.landType };
}

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
// Scores after the background, the feats in level order (each capped at its maximum) and
// the level-20 capstones (Barbarian Primal Champion, Monk Body and Mind: +4, max 25).
// `upTo` stops before that level's feat (for prerequisites). `over` collects lost points.
export function finalAbilities(choices, upTo, over) {
    const bg = SRD.backgrounds[choices.background];
    const inc = backgroundBonus(bg, choices.bgBonus);
    const out = Object.fromEntries(ABILITIES.map(a => [a, Math.min(20, (Number(choices.scores && choices.scores[a]) || 10) + inc[a])]));
    for (const { level, pick } of chosenFeats(choices)) {
        if (upTo != null && level >= upTo) break;
        const need = featNeeds(pick.feat);
        for (const a of (pick.abilities || []).slice(0, need.picks)) {
            if (!ABILITIES.includes(a) || !need.choose.includes(a)) continue;
            const next = out[a] + need.by;
            if (next > need.max && over) over.push({ level, ability: a });
            out[a] = Math.min(need.max, Math.max(out[a], next));
        }
    }
    if (upTo == null && levelOf(choices) >= 20) {
        const cap = choices.class === 'barbarian' ? ['str', 'con'] : choices.class === 'monk' ? ['dex', 'wis'] : [];
        for (const a of cap) out[a] = Math.max(out[a], Math.min(25, out[a] + 4));
    }
    return out;
}

// ---- what a choice set still needs ------------------------------------------------------
// Number of skills the player picks: class choice + species (Human Skillful, Elf Keen
// Senses) + Barbarian Primal Knowledge at level 3 + Skilled feat (Human Versatile).
export function skillPicks(choices) {
    const cls = SRD.classes[choices.class];
    const level = levelOf(choices);
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
// Expertise picks by class/level: Rogue 2 at 1 and 2 more at 6, Bard 2 at 2 and 2 more at 9,
// Ranger 2 at 9.
export function expertisePicks(choices) {
    const level = levelOf(choices);
    if (choices.class === 'rogue') return level >= 6 ? 4 : 2;
    if (choices.class === 'bard') return level >= 9 ? 4 : level >= 2 ? 2 : 0;
    if (choices.class === 'ranger' && level >= 9) return 2;
    return 0;
}
export function fightingStyleAt(choices) {
    const level = levelOf(choices);
    return (choices.class === 'fighter' && level >= 1) || ((choices.class === 'paladin' || choices.class === 'ranger') && level >= 2);
}
// Champion (the Fighter's SRD subclass) level 7: Additional Fighting Style.
export function secondFightingStyleAt(choices) { return choices.class === 'fighter' && levelOf(choices) >= 7; }
// Every Fighting Style feat the character has (class feature, Champion, feats at ASI levels).
export function fightingStyles(choices) {
    const out = [];
    if (fightingStyleAt(choices) && choices.fightingStyle) out.push(choices.fightingStyle);
    if (secondFightingStyleAt(choices) && choices.fightingStyle2) out.push(choices.fightingStyle2);
    for (const { pick } of chosenFeats(choices)) if (FIGHTING_STYLES.includes(pick.feat)) out.push(pick.feat);
    return out;
}
export const FIGHTING_STYLES = ['Archery', 'Defense', 'Great Weapon Fighting', 'Two-Weapon Fighting'];

// All proficient skills from the choices (background + class + species + extras).
export function proficientSkills(choices) {
    const bg = SRD.backgrounds[choices.background];
    const set = new Set(bg ? bg.skills : []);
    const featSkills = chosenFeats(choices).filter(x => x.pick.feat === 'Skilled').flatMap(x => x.pick.skills || []);
    for (const s of [].concat(choices.classSkills || [], choices.speciesSkills || [], choices.extraSkills || [], featSkills)) if (SKILL_IDS.includes(s)) set.add(s);
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
    if (ORDERS[choices.class] && !orderOf(choices)) errs.push(`Choose your ${ORDERS[choices.class].feature} (${Object.values(ORDERS[choices.class].options).join(' or ')}).`);
    if (secondFightingStyleAt(choices) && (!FIGHTING_STYLES.includes(choices.fightingStyle2) || choices.fightingStyle2 === choices.fightingStyle)) errs.push('Choose a second, different Fighting Style (Additional Fighting Style).');
    const styles = fightingStyles(choices);
    if (new Set(styles).size !== styles.length) errs.push('A Fighting Style feat can be taken only once.');
    for (const { level, kind, pick } of chosenFeats(choices)) {
        const what = `Level ${level} (${kind === 'boon' ? 'Epic Boon' : 'Ability Score Improvement'})`;
        if (!featOptions(choices, level).includes(pick.feat)) { errs.push(`${what}: choose a feat.`); continue; }
        const need = featNeeds(pick.feat);
        const ab = (pick.abilities || []).filter(a => need.choose.includes(a));
        if (ab.length !== need.picks) errs.push(`${what}: choose ${need.picks === 2 ? 'two ability increases (the same ability twice for +2)' : 'the ability to increase'}.`);
        if (need.skills && (pick.skills || []).filter(s => SKILL_IDS.includes(s)).length !== need.skills) errs.push(`${what}: choose ${need.skills} skills for Skilled.`);
        const before = finalAbilities(choices, level);
        if (pick.feat === 'Grappler' && before.str < 13 && before.dex < 13) errs.push(`${what}: Grappler needs Strength or Dexterity 13+.`);
        if (pick.feat === 'Boon of Spell Recall' && !(SRD.classes[choices.class] || {}).spellcasting) errs.push(`${what}: Boon of Spell Recall needs the Spellcasting feature.`);
        const originTaken = [bg && bg.feat.replace(/ \(.+\)$/, ''), choices.species === 'human' ? choices.originFeat : null];
        const repeatable = ['Magic Initiate', 'Skilled', 'Ability Score Improvement'].includes(pick.feat);
        if (!repeatable && (originTaken.includes(pick.feat) || chosenFeats(choices).some(x => x.level < level && x.pick.feat === pick.feat))) errs.push(`${what}: you already have ${pick.feat}.`);
    }
    if (cls) errs.push(...spellErrors(spellContext(choices)));
    const over = []; finalAbilities(choices, undefined, over);
    for (const o of over) errs.push(`Level ${o.level}: ${o.ability.toUpperCase()} is already at its maximum — pick another ability.`);
    if (!String(choices.name || '').trim()) errs.push('Give your character a name.');
    return errs;
}

// ---- equipment → inventory, armor, weapons -----------------------------------------------
// "4 Handaxes" → { name: 'Handaxe', qty: 4 }; "20 Arrows" → Arrow ×20.
export function parseItem(text) {
    const m = /^(\d+)\s+(.+)$/.exec(String(text).trim());
    let qty = 1, name = String(text).trim();
    if (m) { qty = Number(m[1]); name = m[2]; }
    // the SRD's "Gaming Set (same as above)" = the kind chosen for the tool proficiency
    name = name.replace(/\s*\(same as above\)$/i, '');
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

function weaponProficient(cls, weapon, name, martial) {
    if (!cls || !weapon) return false;
    if (weapon.category.startsWith('simple')) return true;
    if (martial) return true;                                                  // Protector / Warden
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
export function attacksFor(abilities, items, cls, style, opts) {
    const out = [];
    for (const it of items) {
        const w = SRD.weapons[it.name]; if (!w) continue;
        const ranged = w.category.endsWith('ranged');
        const finesse = /Finesse/.test(w.properties);
        let ability = ranged ? 'dex' : 'str';
        if (finesse && abilityMod(abilities.dex) > abilityMod(abilities.str)) ability = 'dex';
        if (cls && cls.name === 'Monk' && !ranged && abilityMod(abilities.dex) > abilityMod(abilities.str) && (w.category === 'simple melee' || /Light/.test(w.properties))) ability = 'dex';
        const mod = abilityMod(abilities[ability]);
        const bonusHit = ranged && [].concat(style || []).includes('Archery') ? 2 : 0;
        out.push({
            name: it.name, ability, proficient: weaponProficient(cls, w, it.name, opts && opts.martial),
            damage: w.damage + (mod ? (mod > 0 ? '+' : '') + mod : ''),
            notes: [w.type, w.properties, w.mastery && 'Mastery: ' + w.mastery, bonusHit && '+2 to hit (Archery)'].filter(Boolean).join(' · '),
            hitBonus: bonusHit,
        });
    }
    return out;
}

// ---- features text ------------------------------------------------------------------------
function firstSentence(paras) { const t = (paras && paras[0]) || ''; const m = /^(.{20,220}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 220); }
// Class table columns at a level as text ("Rages 3 · Rage Damage +2 · Weapon Mastery 2").
const COLUMN_LABELS = { rages: 'Rages', rageDamage: 'Rage Damage', weaponMastery: 'Weapon Mastery', bardicDie: 'Bardic Inspiration die', channelDivinity: 'Channel Divinity', wildShape: 'Wild Shape', secondWind: 'Second Wind', martialArts: 'Martial Arts die', focusPoints: 'Focus Points', unarmoredMovement: 'Unarmored Movement', favoredEnemy: 'Favored Enemy', sneakAttack: 'Sneak Attack', sorceryPoints: 'Sorcery Points', invocations: 'Eldritch Invocations' };
export function classResources(choices) {
    const cls = SRD.classes[choices.class]; const row = cls && cls.columns && cls.columns[levelOf(choices)];
    if (!row) return '';
    return Object.entries(row).map(([k, v]) => `${COLUMN_LABELS[k] || k} ${k === 'rageDamage' ? '+' + v : k === 'unarmoredMovement' ? '+' + v + ' ft.' : v}`).join(' · ');
}
export function featureList(choices) {
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background], sp = SRD.species[choices.species];
    const level = levelOf(choices);
    const out = [];
    if (cls) {
        // "Ability Score Improvement" / "Epic Boon" are listed as the feats chosen there
        const order = orderOf(choices);
        for (const f of cls.features) if (f.level <= level && !/ Subclass$/.test(f.name) && f.name !== 'Ability Score Improvement' && f.name !== 'Epic Boon')
            out.push({ name: order && f.name === order.feature ? `${f.name}: ${order.name}` : f.name, source: `${cls.name} ${f.level}`, text: f.text });
        for (const f of cls.subclassFeatures) if (f.level <= level) out.push({ name: f.name, source: `${cls.subclass} ${f.level}`, text: f.text });
        for (const { level: l, pick } of chosenFeats(choices)) {
            if (!SRD.feats[pick.feat]) continue;
            const detail = [(pick.abilities || []).length ? pick.abilities.map(a => a.toUpperCase()).join(', ') : '', (pick.skills || []).join(', ')].filter(Boolean).join('; ');
            out.push({ name: pick.feat + (detail ? ` (${detail})` : ''), source: `${cls.name} ${l} feat`, text: SRD.feats[pick.feat].text });
        }
    }
    if (sp) for (const t of sp.traits) out.push({ name: t.name, source: sp.name, text: t.text });
    const featName = bg && bg.feat.replace(/ \(.+\)$/, '');
    if (bg && SRD.feats[featName]) out.push({ name: bg.feat, source: bg.name + ' (Origin feat)', text: SRD.feats[featName].text });
    if (choices.species === 'human' && choices.originFeat && SRD.feats[choices.originFeat]) out.push({ name: choices.originFeat, source: 'Human (Versatile)', text: SRD.feats[choices.originFeat].text });
    if (fightingStyleAt(choices) && SRD.feats[choices.fightingStyle]) out.push({ name: choices.fightingStyle, source: 'Fighting Style', text: SRD.feats[choices.fightingStyle].text });
    if (secondFightingStyleAt(choices) && SRD.feats[choices.fightingStyle2]) out.push({ name: choices.fightingStyle2, source: 'Additional Fighting Style', text: SRD.feats[choices.fightingStyle2].text });
    return out;
}

// ---- the sheet ------------------------------------------------------------------------------
export function hitPoints(choices, abilities) {
    const cls = SRD.classes[choices.class]; if (!cls) return 1;
    const level = levelOf(choices);
    const con = abilityMod(abilities.con);
    let hp = cls.hitDie + con;
    for (let l = 2; l <= level; l++) hp += Math.max(1, cls.hitDie / 2 + 1 + con);   // fixed value per level
    if (choices.species === 'dwarf') hp += level;                                  // Dwarven Toughness
    if (choices.class === 'sorcerer' && level >= 3) hp += level;                   // Draconic Resilience: 3 at level 3, +1 per level
    return Math.max(1, hp);
}

export function buildSheet(choices, previous) {
    const cls = SRD.classes[choices.class], bg = SRD.backgrounds[choices.background], sp = SRD.species[choices.species];
    const level = levelOf(choices);
    const abilities = finalAbilities(choices);
    const { items, gp } = startingItems(choices);
    const styles = fightingStyles(choices);
    // armor/weapons: what the character owns now (level up) or the starting equipment
    const prevInv = previous && Array.isArray(previous.inventory) ? previous.inventory : null;
    const gear = prevInv || items;
    const ac = armorClass(abilities, gear, cls, { defense: styles.includes('Defense'), draconic: choices.class === 'sorcerer' && level >= 3 });
    const skills = {};
    for (const s of proficientSkills(choices)) skills[s] = 1;
    for (const s of choices.expertise || []) if (skills[s]) skills[s] = 2;
    let speed = sp ? sp.speed : 30;
    if (choices.species === 'elf' && /Wood Elf/.test(choices.speciesOption || '')) speed = 35;
    const armorWorn = gear.some(i => SRD.armor[i.name]);
    const move = cls && cls.columns && cls.columns[level] && cls.columns[level].unarmoredMovement;
    if (choices.class === 'monk' && move && !armorWorn && !gear.some(i => i.name === 'Shield')) speed += move;
    if (choices.class === 'barbarian' && level >= 5 && !gear.some(i => SRD.armor[i.name] && SRD.armor[i.name].category === 'heavy')) speed += 10;   // Fast Movement
    const hp = hitPoints(choices, abilities);
    const feats = featureList(choices);
    const spell = cls && cls.spellcasting;
    const saves = new Set(cls ? cls.saves : []);
    if (choices.class === 'rogue' && level >= 15) { saves.add('wis'); saves.add('cha'); }   // Slippery Mind
    if (choices.class === 'monk' && level >= 14) for (const a of ABILITIES) saves.add(a);     // Disciplined Survivor
    const resources = classResources(choices);
    const sheet = {
        level, className: cls ? cls.name + (level >= 3 ? ` (${cls.subclass})` : '') : '', species: sp ? sp.name + (choices.speciesOption ? ` (${choices.speciesOption})` : '') : '',
        background: bg ? bg.name : '', alignment: choices.alignment || '',
        xp: Math.max(previous ? Number(previous.xp) || 0 : 0, SRD.xp[level - 1]),
        abilities, saves: ABILITIES.filter(a => saves.has(a)), skills, ac: ac.ac, speed,
        hp: { max: hp, current: previous && previous.hp ? Math.min(hp, (Number(previous.hp.current) || 0) + (hp - (Number(previous.hp.max) || hp))) : hp, temp: 0 },
        attacks: attacksFor(abilities, gear, cls, styles, { martial: MARTIAL_ORDER.includes((orderOf(choices) || {}).value) }).map(({ hitBonus, ...a }) => Object.assign(a, { bonus: hitBonus })),
        // level up keeps what the character owns now; a new character gets the starting equipment,
        // with the armor and shield its AC counts worn (inHand, R8); weapons start in the backpack
        inventory: prevInv || items.map(i => (SRD.armor[i.name] || i.name === 'Shield') && ac.how.includes(i.name) ? Object.assign({}, i, { inHand: true }) : i), coins: previous && previous.coins ? previous.coins : { cp: 0, sp: 0, gp, pp: 0 },
        features: (resources ? `${cls.name} ${level}: ${resources}\n` : '') + feats.map(f => `• ${f.name} (${f.source}): ${firstSentence(f.text)}`).join('\n'),
        notes: previous && previous.notes ? previous.notes : '',
        acNote: ac.how,
        proficiencies: [cls && `Weapons: ${cls.weapons}${MARTIAL_ORDER.includes((orderOf(choices) || {}).value) ? ` and Martial weapons (${orderOf(choices).name})` : ''}`,
            cls && `Armor: ${cls.armor}${(orderOf(choices) || {}).value === 'protector' ? ' and Heavy armor (Protector)' : (orderOf(choices) || {}).value === 'warden' ? ' and Medium armor (Warden)' : ''}`, [cls && cls.tools, bg && bg.tool].filter(Boolean).length ? `Tools: ${[cls && cls.tools, bg && bg.tool].filter(Boolean).join('; ')}` : '',
            `Languages: Common${(choices.languages || []).length ? ', ' + choices.languages.join(', ') : ''}${choices.class === 'rogue' ? ", Thieves' Cant" : ''}${choices.class === 'druid' ? ', Druidic' : ''}`].filter(Boolean).join('\n'),
        spellcasting: spellcastingFor(choices, spell, level, previous),
        build: Object.assign({}, choices, { level, source: SRD.source }),
        extras: extrasFor(choices, level),
    };
    return normalizeSheet(sheet);
}

// Rules the sheet applies itself (sheet.js derive): Alert, Jack of All Trades (Bard 2),
// Thaumaturge (Arcana, Religion) / Magician (Arcana, Nature) with the Wisdom modifier.
function extrasFor(choices, level) {
    const order = (orderOf(choices) || {}).value;
    const skillBonus = order === 'thaumaturge' ? { arcana: 'wis', religion: 'wis' } : order === 'magician' ? { arcana: 'wis', nature: 'wis' } : {};
    const ex = { alert: hasFeat(choices, 'Alert'), jackOfAllTrades: choices.class === 'bard' && level >= 2, skillBonus };
    return ex.alert || ex.jackOfAllTrades || Object.keys(skillBonus).length ? ex : null;
}

// Spellcasting on the sheet: the class table's counts and slots, the chosen spells (choices.spells)
// and the spells that come without choosing. Level up keeps the spell notes and the slots already
// used. A character without the Spellcasting feature gets a block when a species trait or Magic
// Initiate gives spells (ability = the one chosen for them).
function spellcastingFor(choices, spell, level, previous) {
    const ctx = spellContext(choices);
    const granted = grantedSpells(ctx);
    const ch = choices.spells || {};
    const prev = previous && previous.spellcasting;
    const chosen = { cantripsKnown: (ch.cantrips || []).slice(), preparedSpells: (ch.prepared || []).slice(), spellbook: (ch.spellbook || []).slice(), granted };
    if (spell) return Object.assign({ ability: spell.ability, pact: !!spell.pact }, spell.levels[level], { cantrips: spellLimits(ctx).cantrips }, chosen,   // + Thaumaturge/Magician cantrip
        prev ? { spells: prev.spells || '', used: (prev.used || []).map((u, i) => Math.min(u, (spell.levels[level].slots || [])[i] || 0)) } : {});
    if (!granted.length) return null;
    return Object.assign({ ability: granted[0].ability || defaultMentalAbility(ctx), pact: false, cantrips: 0, prepared: 0, slots: [] }, chosen, prev ? { spells: prev.spells || '' } : {});
}

// Level up = the same choices one level higher (plus the new level's choices).
export function nextLevelChoices(sheet) {
    const b = sheet && sheet.build;
    if (!b || !SRD.classes[b.class]) return null;
    const level = Number(sheet.level) || 1;
    if (level >= MAX_LEVEL) return null;
    return Object.assign({}, b, { level: level + 1 });
}
