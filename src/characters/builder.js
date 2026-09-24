// =============================================================================
// KLITE RPmod — Character builder window (SRD 5.2.1, levels 1–20)
// -----------------------------------------------------------------------------
// Step by step: Class → Background → Species → Ability scores → Feats (from level 4) →
// Skills & choices → Spells (casters, species spells, Magic Initiate) → Equipment → Details & review. Every option shows its SRD text. "Create" makes a new
// character in Esolite's Library with the sheet on its card, or puts the sheet on an
// existing character; "Level up" (from the sheet window) rebuilds the stored choices one
// level higher, asking only what is new, and keeps inventory, coins and notes.
// Rules: builder-rules.js; data: src/data/srd52.js (SRD 5.2.1, CC-BY-4.0 — attribution
// shown in the window).
// Public API: window.KLITE_RPMod_Builder.
// =============================================================================
import { el, clear, iconText } from '../shell/dom.js';
import { SRD } from '../data/srd52.js';
import { ABILITIES, ABILITY_NAMES, SKILLS, abilityMod, fmt, derive } from './sheet.js';
import * as R from './builder-rules.js';
import * as SP from './spell-rules.js';
import { spellPicker as sharedPicker, spellDetails } from './spellPicker.js';
import { saveCharacter, characterNames } from '../library/esoliteLibrary.js';
import { writeSheet } from './sheet.js';

const STEPS = [['class', 'Class'], ['background', 'Background'], ['species', 'Species'], ['abilities', 'Abilities'], ['feats', 'Feats'], ['skills', 'Skills & choices'], ['spells', 'Spells'], ['equipment', 'Equipment'], ['review', 'Details & review']];
const SKILL_NAME = Object.fromEntries(SKILLS.map(s => [s.id, s.name]));
const SPECIES_OPTIONS = {
    dragonborn: { label: 'Draconic ancestry', options: ['Black (Acid)', 'Blue (Lightning)', 'Brass (Fire)', 'Bronze (Lightning)', 'Copper (Acid)', 'Gold (Fire)', 'Green (Poison)', 'Red (Fire)', 'Silver (Cold)', 'White (Cold)'] },
    elf: { label: 'Elven lineage', options: ['Drow', 'High Elf', 'Wood Elf'] },
    gnome: { label: 'Gnomish lineage', options: ['Forest Gnome', 'Rock Gnome'] },
    goliath: { label: 'Giant ancestry', options: ["Cloud's Jaunt (Cloud Giant)", "Fire's Burn (Fire Giant)", "Frost's Chill (Frost Giant)", "Hill's Tumble (Hill Giant)", "Stone's Endurance (Stone Giant)", "Storm's Thunder (Storm Giant)"] },
    human: { label: 'Size', options: ['Medium', 'Small'] },
    tiefling: { label: 'Fiendish legacy', options: ['Abyssal', 'Chthonic', 'Infernal'] },
};
const ORIGIN_FEATS = R.ORIGIN_FEATS;

export default function initBuilder() {
    'use strict';
    if (window.KLITE_RPMod_Builder) return;

    const fresh = () => ({ level: 1, method: 'standard', scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, classSkills: [], speciesSkills: [], extraSkills: [], expertise: [], languages: [], classEquipment: 'A', backgroundEquipment: 'A', alignment: '' });
    const V = { box: null, step: 0, c: fresh(), target: '', levelUp: null, previous: null, busy: false };
    const Shell = () => window.KLITE_RPMod_Shell;

    // ---- small UI helpers ----------------------------------------------------------------
    const para = (t) => el('p', { class: 'rpm-bld-p', text: t });
    function texts(paragraphs, max) { return el('div', { class: 'rpm-bld-text' }, (paragraphs || []).slice(0, max || 99).map(para)); }
    function details(title, body, open) { return el('details', { class: 'rpm-gal-sec', open: open ? '' : null }, [el('summary', { text: title }), body]); }
    function btn(text, onclick, opts) { opts = opts || {}; return el('button', { type: 'button', class: 'btn btn-primary rpm-btn' + (opts.icon ? ' rpm-btn-icon' : '') + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled ? '' : null, 'data-bld': opts.id, onclick }, opts.icon ? [iconText(opts.icon, text)] : [text]); }
    function pickCard(id, title, sub, selected, onclick) {
        return el('button', { type: 'button', class: 'rpm-bld-card' + (selected ? ' rpm-on' : ''), 'aria-pressed': String(!!selected), 'data-pick': id, onclick }, [
            el('div', { class: 'rpm-bld-card-title', text: title }), sub ? el('div', { class: 'rpm-muted', text: sub }) : null,
        ]);
    }
    function checkList(options, chosen, limit, onChange, label) {
        const set = new Set(chosen || []);
        return el('div', { class: 'rpm-bld-checks', role: 'group', 'aria-label': label }, options.map(o => {
            const id = typeof o === 'string' ? o : o.id, name = typeof o === 'string' ? (SKILL_NAME[o] || o) : o.name;
            const cb = el('input', { type: 'checkbox', 'data-check': id });
            cb.checked = set.has(id);
            cb.disabled = !cb.checked && set.size >= limit;
            cb.addEventListener('change', () => { if (cb.checked) set.add(id); else set.delete(id); onChange([...set]); });
            return el('label', { class: 'rpm-bld-check' }, [cb, ' ' + name]);
        }));
    }
    function select(options, value, onChange, label) {
        const s = el('select', { class: 'form-control rpm-input', 'aria-label': label });
        s.appendChild(el('option', { value: '', text: '— choose —' }));
        for (const o of options) { const v = typeof o === 'string' ? o : o.value; const t = typeof o === 'string' ? o : o.text; const op = el('option', { value: v, text: t }); if (v === value) op.selected = true; s.appendChild(op); }
        s.addEventListener('change', () => onChange(s.value));
        return s;
    }
    const set = (k, v) => { V.c[k] = v; render(); };

    // ---- steps --------------------------------------------------------------------------------
    function stepClass(root) {
        if (!V.levelUp) {
            const lvl = select(Array.from({ length: R.MAX_LEVEL }, (_, i) => ({ value: String(i + 1), text: `Level ${i + 1}` })), String(V.c.level), v => set('level', Number(v) || 1), 'Level');
            lvl.setAttribute('data-bld', 'level'); lvl.style.width = 'auto';
            root.appendChild(el('div', { class: 'rpm-row' }, [el('span', { class: 'rpm-label', text: 'Start at' }), lvl]));
        }
        root.appendChild(el('div', { class: 'rpm-bld-grid' }, Object.entries(SRD.classes).map(([id, c]) =>
            pickCard(id, c.name, `d${c.hitDie} · ${c.primary.map(a => ABILITY_NAMES[a]).join(' & ')}`, V.c.class === id, () => { V.c.classSkills = []; V.c.expertise = []; V.c.fightingStyle = undefined; V.c.classEquipment = 'A'; set('class', id); }))));
        const c = SRD.classes[V.c.class]; if (!c) return;
        const lines = [
            `Hit Point Die: d${c.hitDie} · Saving throws: ${c.saves.map(a => ABILITY_NAMES[a]).join(', ')}`,
            `Skills: choose ${c.skills.choose} ${c.skills.options === 'any' ? 'of any skills' : 'from ' + c.skills.options.map(s => SKILL_NAME[s]).join(', ')}`,
            `Weapons: ${c.weapons} · Armor: ${c.armor}${c.tools ? ' · Tools: ' + c.tools : ''}`,
            `Subclass at level 3: ${c.subclass}`,
        ];
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: c.name }), ...lines.map(para),
            R.classResources(V.c) ? para(`At level ${V.c.level}: ${R.classResources(V.c)}`) : null,
            ...c.features.filter(f => f.level <= V.c.level && !/ Subclass$/.test(f.name)).map(f => details(`Level ${f.level}: ${f.name}`, texts(f.text), V.levelUp && f.level === V.c.level)),
            ...c.subclassFeatures.filter(f => f.level <= V.c.level).map(f => details(`${c.subclass} ${f.level}: ${f.name}`, texts(f.text), V.levelUp && f.level === V.c.level)),
        ]));
    }
    function stepBackground(root) {
        root.appendChild(el('div', { class: 'rpm-bld-grid' }, Object.entries(SRD.backgrounds).map(([id, b]) =>
            pickCard(id, b.name, `${b.abilities.map(a => a.toUpperCase()).join(', ')} · ${b.feat}`, V.c.background === id, () => { V.c.bgBonus = null; V.c.backgroundEquipment = 'A'; set('background', id); }))));
        const b = SRD.backgrounds[V.c.background]; if (!b) return;
        const feat = SRD.feats[b.feat.replace(/ \(.+\)$/, '')];
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: b.name }),
            para(`Ability scores: ${b.abilities.map(a => ABILITY_NAMES[a]).join(', ')} (increase one by 2 and another by 1, or all three by 1)`),
            para(`Skills: ${b.skills.map(s => SKILL_NAME[s]).join(', ')} · Tool: ${b.tool}`),
            feat ? details('Origin feat: ' + b.feat, texts(feat.text), true) : null]));
    }
    function stepSpecies(root) {
        root.appendChild(el('div', { class: 'rpm-bld-grid' }, Object.entries(SRD.species).map(([id, s]) =>
            pickCard(id, s.name, `${s.size.split(' (')[0]} · ${s.speed} ft`, V.c.species === id, () => { V.c.speciesOption = ''; V.c.speciesSkills = []; V.c.originFeat = undefined; V.c.extraSkills = []; set('species', id); }))));
        const s = SRD.species[V.c.species]; if (!s) return;
        const opt = SPECIES_OPTIONS[V.c.species];
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: s.name }), para(`Size: ${s.size} · Speed: ${s.speed} feet`),
            opt ? el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: opt.label }), select(opt.options, V.c.speciesOption, v => set('speciesOption', v), opt.label)]) : null,
            V.c.species === 'human' ? el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Versatile: Origin feat (Skilled is recommended)' }), select(ORIGIN_FEATS, V.c.originFeat, v => { V.c.extraSkills = []; set('originFeat', v); }, 'Origin feat')]) : null,
            ...s.traits.map(t => details(t.name, texts(t.text)))]));
    }
    function stepAbilities(root) {
        const cls = SRD.classes[V.c.class], bg = SRD.backgrounds[V.c.background];
        root.appendChild(el('div', { class: 'rpm-row', style: 'flex-wrap:wrap' }, [
            ...[['standard', 'Standard array'], ['pointbuy', 'Point buy (27)'], ['roll', 'Roll 4d6']].map(([m, t]) => btn(t, () => {
                V.c.method = m;
                if (m === 'pointbuy') V.c.scores = Object.fromEntries(ABILITIES.map(a => [a, 8]));
                if (m === 'standard') V.c.scores = cls ? Object.assign({}, cls.standardArray) : { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
                if (m === 'roll') V.c.scores = Object.fromEntries(ABILITIES.map(a => [a, roll4d6()]));
                render();
            }, { cls: V.c.method === m ? 'rpm-on' : '', id: 'method-' + m })),
            cls && V.c.method === 'standard' ? btn(`Suggested for ${cls.name}`, () => { V.c.scores = Object.assign({}, cls.standardArray); render(); }, { id: 'suggest' }) : null,
        ]));
        if (V.c.method === 'pointbuy') { const cost = R.pointBuyCost(V.c.scores); root.appendChild(el('div', { class: 'rpm-muted', text: `Points spent: ${cost === Infinity ? '—' : cost} of 27 (scores 8–15)` })); }
        const inc = R.backgroundBonus(bg, V.c.bgBonus), fin = R.finalAbilities(V.c);
        root.appendChild(el('div', { class: 'rpm-sheet-abilities' }, ABILITIES.map(a => {
            let input;
            if (V.c.method === 'standard') input = select(SRD.standardArray.map(String), String(V.c.scores[a] || ''), v => { V.c.scores[a] = Number(v); render(); }, ABILITY_NAMES[a] + ' score');
            else { input = el('input', { type: 'number', class: 'form-control rpm-input', min: V.c.method === 'pointbuy' ? 8 : 3, max: V.c.method === 'pointbuy' ? 15 : 18, 'aria-label': ABILITY_NAMES[a] + ' score' }); input.value = V.c.scores[a]; input.addEventListener('change', () => { V.c.scores[a] = Number(input.value); render(); }); }
            return el('div', { class: 'rpm-sheet-ability' + (cls && cls.primary.includes(a) ? ' rpm-bld-primary' : '') }, [
                el('div', { class: 'rpm-label', text: ABILITY_NAMES[a] }), input,
                el('div', { class: 'rpm-muted', text: inc[a] ? `+${inc[a]} → ${fin[a]} (${fmt(abilityMod(fin[a]))})` : `${fin[a]} (${fmt(abilityMod(fin[a]))})` })]);
        })));
        if (!bg) { root.appendChild(para('Choose a background to apply its ability score increase.')); return; }
        const b = V.c.bgBonus || {};
        const opts = bg.abilities.map(a => ({ value: a, text: ABILITY_NAMES[a] }));
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `${bg.name}: ability score increase` }),
            el('label', { class: 'rpm-bld-check' }, [(() => { const r = el('input', { type: 'checkbox', 'data-check': 'bg-all' }); r.checked = !!b.all; r.addEventListener('change', () => { V.c.bgBonus = r.checked ? { all: true } : {}; render(); }); return r; })(), ` +1 to ${bg.abilities.map(a => ABILITY_NAMES[a]).join(', ')}`]),
            b.all ? null : el('div', { class: 'rpm-sheet-grid4' }, [
                el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: '+2' }), select(opts, b.plus2, v => { V.c.bgBonus = Object.assign({}, b, { plus2: v }); render(); }, '+2 ability')]),
                el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: '+1' }), select(opts, b.plus1, v => { V.c.bgBonus = Object.assign({}, b, { plus1: v }); render(); }, '+1 ability')]),
            ])]));
    }
    function roll4d6() { const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a); return d[0] + d[1] + d[2]; }
    function stepSkills(root) {
        const picks = R.skillPicks(V.c), bg = SRD.backgrounds[V.c.background];
        if (bg) root.appendChild(para(`From your background: ${bg.skills.map(s => SKILL_NAME[s]).join(', ')}`));
        const clsOpts = R.classSkillOptions(V.c).filter(s => !(bg && bg.skills.includes(s)));
        if (picks.class) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `Class skills — choose ${picks.class}` }), checkList(clsOpts, V.c.classSkills, picks.class, v => set('classSkills', v), 'Class skills')]));
        const taken = new Set(R.proficientSkills(Object.assign({}, V.c, { speciesSkills: [] })));
        const spOpts = R.speciesSkillOptions(V.c).filter(s => !taken.has(s) || (V.c.speciesSkills || []).includes(s));
        if (spOpts.length) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: V.c.species === 'elf' ? 'Keen Senses — choose 1' : 'Skillful — choose 1' }), checkList(spOpts, V.c.speciesSkills, 1, v => set('speciesSkills', v), 'Species skill')]));
        if (picks.extra) {
            const taken2 = new Set(R.proficientSkills(Object.assign({}, V.c, { extraSkills: [] })));
            const src = [V.c.class === 'barbarian' && V.c.level >= 3 ? 'Primal Knowledge (Barbarian skill list)' : null, V.c.originFeat === 'Skilled' ? 'Skilled feat (3)' : null].filter(Boolean).join(' + ');
            const opts = (V.c.class === 'barbarian' && V.c.originFeat !== 'Skilled' ? R.classSkillOptions(V.c) : SKILLS.map(s => s.id)).filter(s => !taken2.has(s) || (V.c.extraSkills || []).includes(s));
            root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `More skills — choose ${picks.extra}` }), el('div', { class: 'rpm-muted', text: src }), checkList(opts, V.c.extraSkills, picks.extra, v => set('extraSkills', v), 'More skills')]));
        }
        const exp = R.expertisePicks(V.c);
        if (exp) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `Expertise — choose ${exp} of your skills` }), checkList(R.proficientSkills(V.c), V.c.expertise, exp, v => set('expertise', v), 'Expertise')]));
        if (R.fightingStyleAt(V.c)) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: 'Fighting Style' }),
            el('div', { class: 'rpm-bld-grid' }, R.FIGHTING_STYLES.map(f => pickCard(f, f, (SRD.feats[f] ? SRD.feats[f].text[0] : '').slice(0, 90), V.c.fightingStyle === f, () => set('fightingStyle', f))))]));
        if (R.secondFightingStyleAt(V.c)) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: 'Additional Fighting Style (Champion 7)' }),
            el('div', { class: 'rpm-bld-grid' }, R.FIGHTING_STYLES.filter(f => f !== V.c.fightingStyle).map(f => pickCard('2-' + f, f, (SRD.feats[f] ? SRD.feats[f].text[0] : '').slice(0, 90), V.c.fightingStyle2 === f, () => set('fightingStyle2', f))))]));
        const order = R.ORDERS[V.c.class];
        if (order) {
            const feat = SRD.classes[V.c.class].features.find(f => f.name === order.feature);
            const paras = feat ? feat.text : [];
            root.appendChild(el('div', { class: 'rpm-bld-detail', 'data-order': order.key }, [el('h3', { text: order.feature }),
                el('div', { class: 'rpm-bld-grid' }, Object.entries(order.options).map(([id, name]) =>
                    pickCard(id, name, (paras.find(p => p.startsWith(name + '.')) || '').slice(name.length + 2), V.c[order.key] === id, () => set(order.key, id))))]));
        }
        if (V.levelUp) return;   // languages were chosen at level 1
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: 'Languages — Common plus two' }), checkList(SRD.languages.standard, V.c.languages, 2, v => set('languages', v), 'Languages')]));
    }
    // Feats at Ability Score Improvement / Epic Boon levels. Level up shows only the new one.
    function stepFeats(root) {
        const fromLevel = V.levelUp && V.previous ? (Number(V.previous.level) || 0) + 1 : 1;
        const list = R.featLevels(V.c).filter(x => x.level >= fromLevel);
        if (!list.length) { root.appendChild(para('No feat to choose at this level.')); return; }
        root.appendChild(para('At these levels your class gives you a feat. "Ability Score Improvement" raises one score by 2 or two scores by 1 (maximum 20).'));
        const scores = R.finalAbilities(V.c);
        root.appendChild(el('div', { class: 'rpm-muted', text: 'Scores now: ' + ABILITIES.map(a => `${a.toUpperCase()} ${scores[a]}`).join(' · ') }));
        for (const { level, kind } of list) {
            V.c.asi = V.c.asi || {};
            const pick = V.c.asi[level] || {};
            const upd = (patch) => { V.c.asi = Object.assign({}, V.c.asi, { [level]: Object.assign({}, pick, patch) }); render(); };
            const featSel = select(R.featOptions(V.c, level).map(f => ({ value: f, text: `${f} — ${(SRD.feats[f] || {}).category || ''}`.replace(/ — $/, '') })), pick.feat, v => upd({ feat: v, abilities: [], skills: [] }), `Level ${level} feat`);
            featSel.setAttribute('data-bld', 'feat-' + level);
            const box = el('div', { class: 'rpm-bld-detail', 'data-feat-level': String(level) }, [
                el('h3', { text: `Level ${level}: ${kind === 'boon' ? 'Epic Boon' : 'Ability Score Improvement'}` }), featSel]);
            const need = pick.feat ? R.featNeeds(pick.feat) : null;
            if (need && need.picks) {
                const opts = need.choose.map(a => ({ value: a, text: ABILITY_NAMES[a] }));
                box.appendChild(el('div', { class: 'rpm-sheet-grid4' }, Array.from({ length: need.picks }, (_, i) =>
                    el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: `+${need.by}${need.picks > 1 ? ` (${i + 1})` : ''}` }),
                        select(opts, (pick.abilities || [])[i], v => { const ab = (pick.abilities || []).slice(); ab[i] = v; upd({ abilities: ab }); }, `Level ${level} increase ${i + 1}`)]))));
            }
            if (need && need.skills) {
                const taken = new Set(R.proficientSkills(Object.assign({}, V.c, { asi: Object.assign({}, V.c.asi, { [level]: Object.assign({}, pick, { skills: [] }) }) })));
                box.appendChild(checkList(SKILLS.map(k => k.id).filter(k => !taken.has(k) || (pick.skills || []).includes(k)), pick.skills, need.skills, v => upd({ skills: v }), `Level ${level} Skilled`));
            }
            if (pick.feat && SRD.feats[pick.feat]) box.appendChild(details(pick.feat, texts(SRD.feats[pick.feat].text), false));
            root.appendChild(box);
        }
    }
    // Spells: class cantrips, the wizard's spellbook, prepared spells (limits from the class
    // table), Magic Initiate, species spell ability, Circle of the Land; spells that come without
    // choosing are listed. Choosing is optional here (the sheet can do it later); too many is not.
    function stepSpells(root) {
        const ctx = R.spellContext(V.c), lim = SP.spellLimits(ctx), granted = SP.grantedSpells(ctx);
        const ch = Object.assign({ cantrips: [], prepared: [], spellbook: [] }, V.c.spells || {});
        const setSpells = (k, v) => { V.c.spells = Object.assign({}, ch, { [k]: v }); if (k === 'spellbook') V.c.spells.prepared = ch.prepared.filter(x => v.includes(x)); render(); };
        const grantedKeys = new Set(granted.map(g => g.key));
        if (lim.caster) {
            const s = R.buildSheet(V.c, V.previous); const d = derive(s);
            root.appendChild(para(`${ABILITY_NAMES[lim.ability]} is your spellcasting ability: save DC ${d.spell.saveDC}, spell attack ${fmt(d.spell.attack)}. ` +
                (lim.maxLevel ? `You can cast spells up to level ${lim.maxLevel}.` : 'You get spell slots at a later level.') + ' You can also choose or change spells later on the character sheet.'));
        }
        if (granted.length) root.appendChild(el('div', { class: 'rpm-bld-detail', 'data-spells': 'granted' }, [el('h3', { text: 'Always prepared (they do not count against your choices)' }),
            ...granted.map(g => spellRow(g.key, `${g.source}${g.ability ? ` · ${ABILITY_NAMES[g.ability]}` : ''}${g.free === 'long' ? ' · once per Long Rest without a slot' : g.free === 'pb' ? ' · Proficiency Bonus times per Long Rest without a slot' : ''}`))]));
        // species spells: which ability casts them
        if (['elf', 'gnome', 'tiefling'].includes(V.c.species)) root.appendChild(el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Spellcasting ability for your species spells' }),
            select(SP.MENTAL.map(a => ({ value: a, text: ABILITY_NAMES[a] })), V.c.speciesSpellAbility || SP.defaultMentalAbility(ctx), v => set('speciesSpellAbility', v), 'Species spell ability')]));
        if (V.c.class === 'druid' && V.c.level >= 3) root.appendChild(el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Circle of the Land: land type (you can change it after a Long Rest)' }),
            select(SP.LAND_TYPES.map(t => ({ value: t, text: t.charAt(0).toUpperCase() + t.slice(1) })), V.c.landType, v => set('landType', v), 'Land type')]));
        // Magic Initiate
        for (const src of SP.magicInitiateSources(ctx)) {
            const mi = Object.assign({ cantrips: [] }, (V.c.magicInitiate || {})[src.id] || {});
            const list = src.list || mi.list;
            const upd = (patch) => { V.c.magicInitiate = Object.assign({}, V.c.magicInitiate, { [src.id]: Object.assign({}, mi, patch) }); render(); };
            const box = el('div', { class: 'rpm-bld-detail', 'data-mi': src.id }, [el('h3', { text: `Magic Initiate — ${src.label}${src.list ? ` (${src.list})` : ''}` })]);
            if (!src.list) box.appendChild(select(SP.MAGIC_INITIATE_LISTS.map(l => ({ value: l, text: l.charAt(0).toUpperCase() + l.slice(1) })), mi.list, v => upd({ list: v, cantrips: [], spell: undefined }), 'Magic Initiate list'));
            box.appendChild(select(SP.MENTAL.map(a => ({ value: a, text: ABILITY_NAMES[a] })), mi.ability || SP.defaultMentalAbility(ctx), v => upd({ ability: v }), 'Magic Initiate ability'));
            if (list) {
                box.appendChild(spellPicker(SP.classSpells(list, { maxLevel: 0 }), mi.cantrips, 2, v => upd({ cantrips: v }), `Magic Initiate ${src.id} cantrips`, 'Two cantrips'));
                box.appendChild(spellPicker(SP.classSpells(list, { minLevel: 1, maxLevel: 1 }), mi.spell ? [mi.spell] : [], 1, v => upd({ spell: v[0] }), `Magic Initiate ${src.id} spell`, 'One level 1 spell'));
            }
            root.appendChild(box);
        }
        if (!lim.caster) { if (!granted.length && !SP.magicInitiateSources(ctx).length) root.appendChild(para('Your class does not cast spells.')); return; }
        if (lim.cantrips) root.appendChild(el('div', { class: 'rpm-bld-detail', 'data-spells': 'cantrips' }, [
            spellPicker(SP.classSpells(V.c.class, { maxLevel: 0 }).filter(s => !grantedKeys.has(s.key)), ch.cantrips, lim.cantrips, v => setSpells('cantrips', v), 'Cantrips', `Cantrips — choose ${lim.cantrips}`)]));
        if (!lim.maxLevel) return;
        const leveled = SP.classSpells(V.c.class, { minLevel: 1, maxLevel: lim.maxLevel }).filter(s => !grantedKeys.has(s.key));
        if (lim.spellbook) root.appendChild(el('div', { class: 'rpm-bld-detail', 'data-spells': 'spellbook' }, [
            spellPicker(leveled, ch.spellbook, lim.spellbook, v => setSpells('spellbook', v), 'Spellbook', `Spellbook — choose ${lim.spellbook} (you prepare from these)`)]));
        const prepFrom = lim.spellbook ? leveled.filter(s => ch.spellbook.includes(s.key)) : leveled;
        root.appendChild(el('div', { class: 'rpm-bld-detail', 'data-spells': 'prepared' }, [
            lim.spellbook && !prepFrom.length ? para('Choose spellbook spells first.') : spellPicker(prepFrom, ch.prepared, lim.prepared, v => setSpells('prepared', v), 'Prepared spells', `Prepared spells — choose ${lim.prepared}`)]));
    }
    // One spell with its text on demand.
    function spellRow(key, note) {
        const s = SP.spell(key); if (!s) return null;
        return details(`${s.name} — ${SP.levelSchool(s)}${note ? ' · ' + note : ''}`, spellDetails(s));
    }
    function spellPicker(list, chosen, limit, onChange, label, title) {
        V.spellSearch = V.spellSearch || {};
        return sharedPicker(list, chosen, limit, onChange, { label, title, search: V.spellSearch });
    }
    function stepEquipment(root) {
        const cls = SRD.classes[V.c.class], bg = SRD.backgrounds[V.c.background];
        const opt = (list, key, title) => el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: title }), el('div', { class: 'rpm-bld-grid' }, list.map(o =>
            pickCard(o.id, `Option ${o.id}`, o.items.length ? `${o.items.join(', ')}, ${o.gp} GP` : `${o.gp} GP (buy your own)`, V.c[key] === o.id, () => set(key, o.id))))]);
        if (V.levelUp) { root.appendChild(para('Leveling up keeps your current inventory and coins.')); return; }
        if (cls) root.appendChild(opt(cls.equipment, 'classEquipment', `${cls.name} equipment`));
        if (bg) root.appendChild(opt(bg.equipment, 'backgroundEquipment', `${bg.name} equipment`));
    }
    function stepReview(root) {
        const names = characterNames();
        const name = el('input', { type: 'text', class: 'form-control rpm-input fullScreenTextEditExclude', 'aria-label': 'Character name', placeholder: 'Name' });
        name.value = V.c.name || '';
        name.addEventListener('change', () => { V.c.name = name.value.trim(); render(); });
        if (!V.levelUp) root.appendChild(el('div', { class: 'rpm-sheet-grid4' }, [
            el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Name' }), name]),
            el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Alignment' }), select(SRD.alignments, V.c.alignment, v => set('alignment', v), 'Alignment')]),
            el('label', { class: 'rpm-sheet-field' }, [el('span', { class: 'rpm-label', text: 'Put the sheet on' }), select([{ value: '', text: 'a new character' }, ...names.map(n => ({ value: n, text: n }))], V.target, v => { V.target = v; if (v && !V.c.name) V.c.name = v; render(); }, 'Target character')]),
        ]));
        const errs = R.validate(V.c);
        const s = R.buildSheet(V.c, V.previous); const d = derive(s);
        root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `${V.c.name || '(unnamed)'} — ${s.species} ${s.className} ${s.level}` }),
            para(`HP ${s.hp.max} · AC ${s.ac} (${s.acNote}) · Speed ${s.speed} ft · Initiative ${fmt(d.initiative)} · Proficiency ${fmt(d.pb)} · Passive Perception ${d.passivePerception}`),
            para(ABILITIES.map(a => `${a.toUpperCase()} ${s.abilities[a]} (${fmt(d.mods[a])})`).join(' · ')),
            para('Saving throws: ' + s.saves.map(a => `${ABILITY_NAMES[a]} ${fmt(d.saves[a])}`).join(', ')),
            para('Skills: ' + SKILLS.filter(k => s.skills[k.id]).map(k => `${k.name} ${fmt(d.skills[k.id])}${s.skills[k.id] === 2 ? ' (expertise)' : ''}`).join(', ')),
            d.attacks.length ? para('Attacks: ' + d.attacks.map(a => `${a.name} ${fmt(a.toHit)} (${a.damage})`).join(', ')) : null,
            d.spell ? para(`Spellcasting: ${ABILITY_NAMES[d.spell.ability]}, save DC ${d.spell.saveDC}, attack ${fmt(d.spell.attack)}` + (d.spell.slots.length ? `, slots ${d.spell.slots.map((n, i) => n ? `level ${i + 1}: ${n}` : '').filter(Boolean).join(', ')}` : '') + '.') : null,
            d.spell && (d.spell.cantripsKnown.length || d.spell.preparedSpells.length || d.spell.granted.length) ? para('Spells: ' + [...d.spell.cantripsKnown, ...d.spell.preparedSpells, ...d.spell.granted.map(g => g.key)].map(SP.spellName).join(', ')) : null,
            (() => { const todo = SP.spellTodo(R.spellContext(V.c)); return todo.length ? el('p', { class: 'rpm-muted', 'data-spell-todo': '1', text: 'Still open (you can do this later on the sheet): ' + todo.join('; ') + '.' }) : null; })(),
            details('Features', el('div', { class: 'rpm-gal-text', text: s.features }))]));
        if (errs.length) root.appendChild(el('ul', { class: 'rpm-bld-errors', role: 'alert' }, errs.map(e => el('li', { text: e }))));
    }

    // ---- create / level up --------------------------------------------------------------
    async function create() {
        const errs = R.validate(V.c); if (errs.length) { render(); return; }
        V.busy = true; render();
        try {
            let name;
            if (V.levelUp) {
                const C = window.KLITE_RPMod_Characters;
                await C.saveSheet(V.levelUp, R.buildSheet(V.c, V.previous)); name = V.levelUp;
            } else if (V.target) {
                const C = window.KLITE_RPMod_Characters;
                const existing = await C.loadSheet(V.target).catch(() => null);
                if (existing && !confirm(`${V.target} already has a character sheet. Replace it?`)) { V.busy = false; render(); return; }
                await C.saveSheet(V.target, R.buildSheet(Object.assign({}, V.c, { name: V.target }))); name = V.target;
            } else {
                const s = R.buildSheet(V.c);
                const inner = writeSheet({
                    name: V.c.name, description: `${V.c.name} is a ${s.species.toLowerCase()} ${SRD.classes[V.c.class].name.toLowerCase()} (${s.background.toLowerCase()} background).`,
                    personality: '', scenario: '', first_mes: '', mes_example: '', creator: 'RPmod character builder',
                    creator_notes: `Level ${s.level} ${s.species} ${s.className}, built with the SRD 5.2.1 rules.`,
                    tags: ['RPmod', SRD.classes[V.c.class].name, SRD.species[V.c.species].name], extensions: {},
                }, s);
                const res = await saveCharacter({ inner }); name = res.name;
            }
            V.busy = false;
            try { window.KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch (_) {}
            Shell()?.close('builder', { force: true });
            window.KLITE_RPMod_Characters?.open(name);
        } catch (e) { V.busy = false; alert('Could not save the character: ' + (e.message || e)); render(); }
    }

    // ---- render -----------------------------------------------------------------------------
    function render() {
        const box = V.box; if (!box) return;
        const scrollTop = box.scrollTop; clear(box);
        const root = el('div', { class: 'rpm-bld' });
        box.appendChild(root);
        const fromLevel = V.levelUp && V.previous ? (Number(V.previous.level) || 0) + 1 : 1;
        const hasFeats = R.featLevels(V.c).some(x => x.level >= fromLevel);
        const ctx = R.spellContext(V.c);
        const hasSpells = SP.spellLimits(ctx).caster || SP.grantedSpells(ctx).length > 0 || SP.magicInitiateSources(ctx).length > 0 || ['elf', 'gnome', 'tiefling'].includes(V.c.species);
        const steps = (V.levelUp ? STEPS.filter(([id]) => ['class', 'feats', 'skills', 'spells', 'review'].includes(id)) : STEPS).filter(([id]) => (id !== 'feats' || hasFeats) && (id !== 'spells' || hasSpells));
        if (V.step >= steps.length) V.step = steps.length - 1;
        root.appendChild(el('ol', { class: 'rpm-bld-steps' }, steps.map(([id, t], i) => el('li', {}, [el('button', { type: 'button', class: 'rpm-gal-chip' + (i === V.step ? ' rpm-on' : ''), 'aria-current': i === V.step ? 'step' : null, 'data-step': id, text: `${i + 1}. ${t}`, onclick: () => { V.step = i; render(); } })]))));
        if (V.levelUp) root.appendChild(el('div', { class: 'rpm-bld-detail' }, [el('h3', { text: `Level up: ${V.levelUp} → level ${V.c.level}` }), para('Your new features are open below. Make any new choices (feat, skills, spells), then confirm on the last step.')]));
        const body = el('div', { class: 'rpm-bld-body' });
        root.appendChild(body);
        const id = steps[V.step][0];
        ({ class: stepClass, background: stepBackground, species: stepSpecies, abilities: stepAbilities, feats: stepFeats, skills: stepSkills, spells: stepSpells, equipment: stepEquipment, review: stepReview })[id](body);
        const last = V.step === steps.length - 1;
        root.appendChild(el('div', { class: 'rpm-row rpm-bld-nav' }, [
            btn('Back', () => { V.step = Math.max(0, V.step - 1); render(); }, { icon: 'arrow-left', disabled: V.step === 0, id: 'back' }),
            el('span', { class: 'rpm-grow' }),
            last ? btn(V.busy ? 'Saving…' : (V.levelUp ? 'Level up' : 'Create character'), () => create(), { cls: 'rpm-success rpm-lg', disabled: V.busy || R.validate(V.c).length > 0, id: 'create' })
                 : btn('Next', () => { V.step++; render(); }, { cls: 'rpm-lg', id: 'next' }),
        ]));
        root.appendChild(el('p', { class: 'rpm-muted rpm-bld-attr', text: SRD.attribution }));
        box.scrollTop = V.shownStep === id ? scrollTop : 0;   // keep scroll within a step, top on a new step
        V.shownStep = id;
    }

    function register() {
        const sh = Shell(); if (!sh) return false;
        sh.registerView({
            id: 'builder', title: 'Character builder (SRD 5.2.1)', place: 'window', window: { width: 820, height: 720, minWidth: 320, minHeight: 360, flush: true, restore: false },
            mount: (c) => { V.box = el('div', { class: 'rpm-gal-scroll' }); c.appendChild(V.box); render(); },
            unmount: () => { V.box = null; },
        });
        return true;
    }

    const api = {
        open(opts) {
            opts = opts || {};
            V.step = 0; V.target = opts.target || ''; V.levelUp = null; V.previous = null; V.c = fresh();
            if (opts.name) V.c.name = opts.name;
            Shell()?.open('builder');
            return true;
        },
        // Level up a character whose sheet came from the builder.
        async levelUp(name) {
            const C = window.KLITE_RPMod_Characters;
            const sheet = C ? await C.loadSheet(name) : null;
            const next = R.nextLevelChoices(sheet);
            if (!next) { alert(sheet && sheet.build ? 'This character is already level 20.' : 'This sheet was not made with the builder; edit it by hand.'); return false; }
            V.c = next; V.levelUp = name; V.previous = sheet; V.target = name; V.step = 0;
            Shell()?.open('builder'); render();
            return true;
        },
        _state: V,
    };
    window.KLITE_RPMod_Builder = api;
    let tries = 0;
    const attempt = () => { if (!register() && ++tries < 120) setTimeout(attempt, 250); };
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt);
}
