// =============================================================================
// KLITE RPmod — slash commands (R6; design: docs/design/R6-chat-power.md)
// -----------------------------------------------------------------------------
// "/go Forest Road", "/buy Torch x2", "/accept Bandit Bounty" … typed in Esolite's chat box.
// Esolite's own slash commands are the user's custom tools (localsettings.custom_tools), run
// at the top of prepare_submit_generation. RPmod does not write into that list: it wraps
// prepare_submit_generation and handles only its own command names; everything else — and a
// user tool with the same name — goes on to Esolite unchanged.
//
// Commands go through the Worlds engine (its API or the equivalent chat tag via applyTags), so
// the rules decide exactly as for the AI's tags; results land in the game log, which the AI
// reads on its next turn. A command generates nothing itself. Text parts after the commands
// (" | " or new lines) are sent as the chat message.
// Public API: window.KLITE_RPMod_Chat — commands(), isCommand(text), run(text, { send }), help(),
// quickReplies (src/chat/quickReplies.js).
// =============================================================================
import { splitInput, startsWithCommand, messageOf, cleanArg, splitMode, parseCheck, parseAttack, parseAssign, nameKey, stripControlTags } from './chat-rules.js';
import { SKILLS, ABILITIES, ABILITY_NAMES, derive, fmt } from '../characters/sheet.js';
import { autoTurnsOn } from '../game/combatView.js';
import { el } from '../shell/dom.js';
import { installQuickReplies } from './quickReplies.js';

export default function initChat() {
    'use strict';
    if (window.KLITE_RPMod_Chat) return;

    const W = () => window.KLITE_RPMod_Worlds;
    const Log = () => window.KLITE_RPMod_Log;
    const Shell = () => window.KLITE_RPMod_Shell;
    const persona = () => { try { return window.KLITE_RPMod_Characters?.personaName() || ''; } catch (_) { return ''; } };
    const worldOn = () => { try { const A = W(); return !!(A && A.activeWorld() && A.isEnabled()); } catch (_) { return false; } };

    // ---- results ---------------------------------------------------------------------------
    const ok = (text) => ({ ok: true, text });
    const fail = (error) => ({ ok: false, error });
    const info = (title, text) => ({ ok: true, info: { title, text } });
    const opened = (view, text) => { try { Shell()?.open(view); } catch (_) {} return { ok: true, text }; };
    // a chat tag through the engine: the same rules as the AI's tag
    function tag(name, arg, usage) {
        const a = cleanArg(arg); if (!a) return fail('Usage: ' + usage);
        return W().applyTags(`<${name}>${a}</${name}>`) ? { ok: true } : { ok: false };
    }
    function findQuest(arg) {
        const k = nameKey(arg); if (!k) return null;
        const qs = W().listQuests() || [];
        return qs.find(q => q.id === arg.trim()) || qs.find(q => nameKey(q.title) === k) || qs.find(q => k.length > 3 && nameKey(q.title).includes(k)) || null;
    }
    const STATE_WORDS = { available: 'not accepted yet', active: 'in progress', complete: 'ready to turn in', turnedin: 'already turned in', failed: 'failed', locked: 'locked' };

    // ---- checks: the persona's sheet ---------------------------------------------------------
    function checkTarget(what) {
        const k = nameKey(what);
        const skill = SKILLS.find(s => nameKey(s.id) === k || nameKey(s.name) === k);
        if (skill) return { kind: 'skill', id: skill.id, name: skill.name, ability: skill.ability };
        const ab = ABILITIES.find(a => a === k || nameKey(ABILITY_NAMES[a]) === k);
        if (ab) return { kind: 'ability', id: ab, name: ABILITY_NAMES[ab], ability: ab };
        const save = /^(.*?)(?:save|savingthrow)$/.exec(k);
        const sab = save && ABILITIES.find(a => a === save[1] || nameKey(ABILITY_NAMES[a]) === save[1]);
        if (sab) return { kind: 'save', id: sab, name: ABILITY_NAMES[sab] + ' save', ability: sab };
        return null;
    }
    function rollCheck(arg) {
        const c = parseCheck(arg);
        const t = checkTarget(c.what);
        if (!t) return fail(`Unknown check "${c.what}". Use an ability (dex, Wisdom), a skill (Perception, Sleight of Hand) or a save (dex save).`);
        const name = persona();
        const sheet = name && window.KLITE_RPMod_Characters?.cachedSheet(name);
        let bonus;
        if (sheet) { const d = derive(sheet); bonus = t.kind === 'skill' ? d.skills[t.id] : t.kind === 'save' ? d.saves[t.id] : d.mods[t.id]; }
        else if (worldOn() && t.kind === 'ability') {   // the world's player stats (no persona sheet)
            const st = W().combatantStats('__player__'); bonus = W().abilityMod(st && st.abilities ? st.abilities[t.id] : 10);
        } else return fail('Choose a persona with a character sheet (Tools panel) to roll checks.');
        const L = Log(); const r = L.roll('1d20' + (bonus ? fmt(bonus) : ''), { mode: c.mode });
        const verdict = c.dc != null ? ` (DC ${c.dc}): ${r.total >= c.dc ? 'success' : 'failure'}` : '';
        L.add({ who: name || 'You', what: `${t.name} check${verdict}`, roll: r, kind: 'roll' });
        return { ok: true };
    }

    // ---- combat --------------------------------------------------------------------------------
    function inFight() { const cb = W().getCombat(); return !!(cb && cb.active && !cb.outcome); }
    function attackCmd(arg) {
        if (!inFight()) return fail('No fight is on. Start one with /encounter (a saved encounter or monsters, e.g. /encounter 2 Wolf).');
        const a = parseAttack(cleanArg(arg)); if (!a.target) return fail('Usage: /attack <target> [with <weapon>]');
        const id = W().resolveCombatant(a.target); if (!id || id === '__player__') return fail(`No one called "${a.target}" is in this fight.`);
        const atks = (W().combatantStats('__player__') || {}).attacks || [];
        let idx = 0;
        if (a.weapon) { idx = atks.findIndex(x => nameKey(x.name).includes(nameKey(a.weapon))); if (idx < 0) return fail(`You have no attack "${a.weapon}" (${atks.map(x => x.name).join(', ') || 'none'}).`); }
        const r = W().attack('__player__', id, idx);
        if (!r) return fail('The attack is not possible now.');
        if (r.refused) return { ok: false };   // the reason is in the log
        return { ok: true };
    }

    // ---- /look, /inv, /rep ----------------------------------------------------------------------
    const LOOK = /^(Current Location|Nearby NPCs|Nearby Objects|Quest givers here|Trade|Exploring|Waiting here)/;
    function look() {
        const slice = W().previewSlice() || {};
        const secs = (slice.sections || []).filter(s => LOOK.test(s.title));
        if (!secs.length) return fail('You are nowhere yet: /go to a place first.');
        return info('Look around', secs.map(s => `[${s.title}]\n${s.text}`).join('\n\n'));
    }
    function inventory() {
        const iv = W().inventory();
        const items = (iv.items || []).map(i => `- ${i.name}${Number(i.qty) > 1 ? ' ×' + i.qty : ''}`);
        return info(iv.owner ? `${iv.owner}'s inventory` : 'Inventory', `${items.length ? items.join('\n') : 'Nothing.'}\n\nPurse: ${iv.purseText}`);
    }
    function reputation(arg) {
        const a = parseAssign(arg);
        if (a.value != null) return tag('rep', `${a.key}=${a.value}`, '/rep <faction>=+10');
        const list = W().reputation().filter(r => !r.gone);
        if (!list.length) return info('Reputation', 'This world has no factions.');
        return info('Reputation', list.map(r => `- ${r.name}: ${r.tier} (${r.value})`).join('\n'));
    }

    // ---- the commands -----------------------------------------------------------------------------
    // { name, aliases?, usage, help, group, world: needs an enabled world, run(arg) → result }
    // result: { ok, text?, error?, info?: { title, text } } — ok:false without error = the refusal is in the log
    const COMMANDS = [
        { name: 'go', aliases: ['move'], group: 'World', world: true, usage: '/go <place or direction>', help: 'Go somewhere: a place, a room, "north". Doors and ways out are checked.',
            run: (a) => { a = cleanArg(a); if (!a) return fail('Usage: /go <place or direction>'); const r = W().go(a, { source: 'ui' }); if (!r.ok) return { ok: false, error: r.reason }; return r.same ? ok('You are already there.') : { ok: true }; } },
        { name: 'look', group: 'World', world: true, usage: '/look', help: 'Where you are: the place, ways out, people and things here.', run: () => look() },
        { name: 'search', group: 'World', world: true, usage: '/search', help: 'Search this place (RPmod rolls Perception or Investigation).', run: () => { const r = W().search({ source: 'ui' }); return r.ok ? { ok: true } : { ok: false, error: r.reason }; } },
        ...['open', 'close', 'unlock'].map(act => ({ name: act, group: 'World', world: true, usage: `/${act} <door or direction>`, help: `${act[0].toUpperCase() + act.slice(1)} a door (the rules decide; locks need a key or a check).`,
            run: (a) => { a = cleanArg(a); if (!a) return fail(`Usage: /${act} <door or direction>`); const r = W().door(act, a, { source: 'ui' }); return r && r.ok ? { ok: true } : { ok: false, error: r && r.reason }; } })),
        { name: 'talk', group: 'World', world: true, usage: '/talk <person>', help: 'Speak with someone here (counts for "talk to" objectives).',
            run: (a) => { const r = tag('talk', a, '/talk <person>'); if (r.ok) r.log = `Talks with ${cleanArg(a)}.`; else if (!r.error) r.error = `No one called "${cleanArg(a)}" is known in this world.`; return r; } },
        { name: 'join', group: 'World', world: true, usage: '/join <person>', help: 'Ask someone here to travel with you (only people who can join).',
            run: (a) => { if (!cleanArg(a)) return fail('Usage: /join <person>'); const r = W().joinParty(cleanArg(a), { source: 'ui' }); return r.ok ? { ok: true } : { ok: false, error: r.reason }; } },
        { name: 'leave', group: 'World', world: true, usage: '/leave <person>', help: 'Part ways with a companion; they stay here.',
            run: (a) => { if (!cleanArg(a)) return fail('Usage: /leave <person>'); const r = W().leaveParty(cleanArg(a), { source: 'ui' }); return r.ok ? { ok: true } : { ok: false, error: r.reason }; } },
        { name: 'map', group: 'World', usage: '/map', help: 'Open the Map window.', run: () => opened('map') },

        { name: 'give', group: 'Items & trade', world: true, usage: '/give <item> [xN]', help: 'You get an item (default one).',
            run: (a) => { const r = tag('give', a, '/give <item> [xN]'); if (r.ok) r.log = `Gets ${cleanArg(a)}.`; return r; } },
        { name: 'take', group: 'Items & trade', world: true, usage: '/take <item> [xN | x all]', help: 'An item leaves your inventory (default one; "x all" the stack).',
            run: (a) => { const r = tag('take', a, '/take <item> [xN | x all]'); if (r.ok) r.log = `Loses ${cleanArg(a)}.`; return r; } },
        { name: 'inv', aliases: ['inventory'], group: 'Items & trade', world: true, usage: '/inv', help: 'Show your inventory and purse.', run: () => inventory() },
        { name: 'buy', group: 'Items & trade', world: true, usage: '/buy [vendor:] <item> [xN]', help: 'Buy from a vendor here (price, stock and purse are checked).', run: (a) => tag('buy', a, '/buy [vendor:] <item> [xN]') },
        { name: 'sell', group: 'Items & trade', world: true, usage: '/sell [vendor:] <item> [xN]', help: 'Sell to a vendor here.', run: (a) => tag('sell', a, '/sell [vendor:] <item> [xN]') },
        { name: 'shop', group: 'Items & trade', world: true, usage: '/shop', help: 'Open the Shop window of the vendors here.', run: () => (W().vendorsHere().length ? opened('shop') : fail('No one here trades.')) },

        { name: 'accept', group: 'Quests', world: true, usage: '/accept <quest>', help: 'Accept a quest (level and prerequisites are checked).',
            run: (a) => {
                const q = findQuest(cleanArg(a)); if (!q) return fail(a ? `No quest "${cleanArg(a)}" is known.` : 'Usage: /accept <quest>');
                if (q.state !== 'available') return fail(`"${q.title}" is ${STATE_WORDS[q.state] || q.state}.`);
                return W().acceptQuest(q.id) ? { ok: true } : { ok: false };
            } },
        { name: 'turnin', group: 'Quests', world: true, usage: '/turnin <quest>', help: 'Hand in a finished quest; RPmod pays the rewards.',
            run: (a) => {
                const q = findQuest(cleanArg(a)); if (!q) return fail(a ? `No quest "${cleanArg(a)}" is known.` : 'Usage: /turnin <quest>');
                const r = tag('turnin', q.title, '/turnin <quest>');
                if (!r.ok && W().questNeedsChoice(q.id)) { try { Shell()?.open('questlog'); } catch (_) {} }
                return r;
            } },
        { name: 'abandon', group: 'Quests', world: true, usage: '/abandon <quest>', help: 'Abandon an accepted quest (progress is reset).',
            run: (a) => { const q = findQuest(cleanArg(a)); if (!q) return fail(a ? `No quest "${cleanArg(a)}" is known.` : 'Usage: /abandon <quest>'); return W().abandonQuest(q.id) ? { ok: true } : fail(`"${q.title}" is ${STATE_WORDS[q.state] || q.state}.`); } },
        { name: 'track', group: 'Quests', world: true, usage: '/track <quest>', help: 'Show this quest in the Quests section.',
            run: (a) => { const q = findQuest(cleanArg(a)); if (!q) return fail(a ? `No quest "${cleanArg(a)}" is known.` : 'Usage: /track <quest>'); W().setActiveQuest(q.id); return ok('Tracking: ' + q.title); } },
        { name: 'quests', group: 'Quests', usage: '/quests', help: 'Open the Quest log.', run: () => opened('questlog') },
        { name: 'quest', group: 'Quests', usage: '/quest [<id>=<state>]', help: 'Without "=": the Quest log. With it: set a quest\'s state (creator).',
            run: (a) => { const p = parseAssign(cleanArg(a)); if (p.value == null) return opened('questlog'); if (!worldOn()) return fail(NO_WORLD); const r = tag('quest', `${p.key}=${p.value}`, '/quest <id>=<state>'); if (r.ok) r.log = `Quest ${p.key} is now ${p.value}.`; return r; } },
        { name: 'try', group: 'Quests', world: true, usage: '/try <contest or task> [adv|dis]', help: 'Try a contest or another check of an accepted quest here (RPmod rolls your bonus against its DC; once a day).',
            run: (a) => { const { rest, mode } = splitMode(cleanArg(a)); const r = W().tryObjective(rest, { source: 'ui', mode }); return r.ok ? { ok: true } : { ok: false, error: r.reason }; } },
        { name: 'rep', aliases: ['reputation'], group: 'Quests', world: true, usage: '/rep [<faction>=±n]', help: 'Your standing with the factions; with "=" change one.', run: (a) => reputation(cleanArg(a)) },

        { name: 'roll', aliases: ['r'], group: 'Dice & combat', usage: '/roll <dice> [adv|dis]', help: 'Roll dice (1d20+3, 2d6, d100) into the game log.',
            run: (a) => { const { rest, mode } = splitMode(cleanArg(a)); Log().rollAndLog({ who: persona() || 'You', what: 'Roll ' + (rest || '1d20'), expr: rest || '1d20', mode, kind: 'roll' }); return { ok: true }; } },
        { name: 'check', group: 'Dice & combat', usage: '/check <ability|skill|save> [DC] [adv|dis]', help: 'Your persona rolls a check with its sheet bonus (e.g. /check perception 12).', run: (a) => rollCheck(cleanArg(a)) },
        { name: 'attack', group: 'Dice & combat', world: true, usage: '/attack <target> [with <weapon>]', help: 'Attack in a fight (reach, range and cover are checked).', run: (a) => attackCmd(a) },
        { name: 'encounter', group: 'Dice & combat', world: true, usage: '/encounter <saved encounter | 2 Wolf, Goblin Warrior>', help: 'Start a fight.',
            run: (a) => { if (inFight()) return fail('A fight is already on.'); const r = tag('encounter', a, '/encounter <saved encounter | monsters>'); if (!r.ok && !r.error) r.error = `No saved encounter or SRD monster matches "${cleanArg(a)}".`; if (r.ok) { try { Shell()?.open('combat'); } catch (_) {} if (autoTurnsOn()) W().runAutoTurns(); } return r; } },
        { name: 'endturn', group: 'Dice & combat', world: true, usage: '/endturn', help: 'End your turn in a fight (enemy turns run if that setting is on).',
            run: () => { if (!inFight()) return fail('No fight is on.'); W().nextTurn(); if (autoTurnsOn()) W().runAutoTurns(); return { ok: true, log: 'Ends the turn.' }; } },
        { name: 'rest', group: 'Dice & combat', world: true, usage: '/rest', help: 'Long rest: HP and spell slots back.', run: () => { if (inFight()) return fail('Not during a fight.'); W().longRest(); return { ok: true, log: 'Takes a long rest.' }; } },
        { name: 'combat', group: 'Dice & combat', usage: '/combat', help: 'Open the Combat window.', run: () => opened('combat') },

        { name: 'time', group: 'Time & story', world: true, usage: '/time <dawn|morning|noon|afternoon|evening|night>', help: 'Set the time of day.',
            run: (a) => { const r = tag('time', a, '/time <slot>'); if (r.ok) r.log = `It is now ${cleanArg(a)}.`; else if (!r.error) r.error = `Unknown time "${cleanArg(a)}".`; return r; } },
        { name: 'advance', aliases: ['wait'], group: 'Time & story', world: true, usage: '/advance [slots]', help: 'Let time pass (one part of the day per slot).',
            run: (a) => { const n = Math.max(1, Math.min(12, Number(cleanArg(a)) || 1)); W().advanceClock(n); return { ok: true, log: `Time passes (${n} part${n > 1 ? 's' : ''} of the day).` }; } },
        { name: 'weather', group: 'Time & story', world: true, usage: '/weather <text>', help: 'Set the weather.',
            run: (a) => { const r = tag('weather', a, '/weather <text>'); if (r.ok) r.log = `Weather: ${cleanArg(a)}.`; return r; } },
        { name: 'flag', group: 'Time & story', world: true, usage: '/flag <key>[=value]', help: 'Set a story flag (creator; event triggers read them).',
            run: (a) => { const p = parseAssign(cleanArg(a)); if (!p.key) return fail('Usage: /flag <key>[=value]'); return tag('flag', p.value == null ? p.key : `${p.key}=${p.value}`, '/flag <key>[=value]'); } },
        { name: 'unflag', group: 'Time & story', world: true, usage: '/unflag <key>', help: 'Remove a story flag.', run: (a) => tag('unflag', a, '/unflag <key>') },
        { name: 'action', group: 'Time & story', world: true, usage: '/action <text>', help: 'Fire the world\'s "action" triggers with this text.', run: (a) => tag('action', a, '/action <text>') },

        { name: 'sheet', group: 'Windows & tools', usage: '/sheet [character]', help: 'Open a character sheet (default: your persona).',
            run: (a) => { const C = window.KLITE_RPMod_Characters; const n = cleanArg(a) || persona(); if (!C) return fail('Character sheets are not loaded.'); C.open(n || undefined); return { ok: true }; } },
        { name: 'lookup', aliases: ['srd'], group: 'Windows & tools', usage: '/lookup <monster, spell, item, rule>', help: 'Look something up in the SRD 5.2.1 Compendium.',
            run: (a) => { const C = window.KLITE_RPMod_Compendium; if (!C) return fail('The Compendium is not loaded.'); C.open(cleanArg(a)); return { ok: true }; } },
        { name: 'summary', group: 'Windows & tools', usage: '/summary', help: 'Esolite\'s AutoGenerate Memory: summarises the story into Memory (confirm with OK).', run: () => summary() },
        { name: 'help', aliases: ['commands'], group: 'Windows & tools', usage: '/help [command]', help: 'This list, or one command.', run: (a) => help(cleanArg(a)) },
    ];
    const NO_WORLD = 'No world is active. Choose one in World Management (right panel) — or a premade world — and enable it.';
    const byName = new Map();
    for (const c of COMMANDS) { byName.set(c.name, c); for (const al of c.aliases || []) byName.set(al, c); }
    const known = (name) => byName.has(String(name || '').toLowerCase());

    function summary() {
        if (typeof window.autogenerate_summary_memory !== 'function') return fail('This Esolite has no AutoGenerate Memory.');
        const story = Array.isArray(window.gametext_arr) ? window.gametext_arr : [];
        if (!story.some(t => String(t || '').trim())) return fail('The story is empty — nothing to summarise yet.');
        try { window.btn_memory?.(); } catch (_) {}
        window.autogenerate_summary_memory();
        return ok('Esolite is writing a summary into Memory — check it there and press OK.');
    }
    function help(name) {
        if (name) {
            const c = byName.get(name.replace(/^\//, '').toLowerCase()); if (!c) return fail(`Unknown command /${name}.`);
            return info('/' + c.name, `${c.usage}\n\n${c.help}${c.aliases ? `\n\nAlso: ${c.aliases.map(x => '/' + x).join(', ')}` : ''}${c.world ? '\n\nNeeds an enabled world.' : ''}`);
        }
        const groups = [];
        for (const c of COMMANDS) { let g = groups.find(x => x.name === c.group); if (!g) groups.push(g = { name: c.group, lines: [] }); g.lines.push(`${c.usage} — ${c.help}`); }
        return info('RPmod chat commands', groups.map(g => `${g.name}\n${g.lines.join('\n')}`).join('\n\n') +
            '\n\nSeveral commands and a message in one go: /go Forest Road | I set off before dawn.\nA command changes the game at once; press Send (or write something) and the AI narrates it.');
    }

    // ---- running ------------------------------------------------------------------------------
    function exec(cmd) {
        const c = byName.get(cmd.name);
        if (!c) return fail(`Unknown command /${cmd.name}. Type /help for the list.`);
        if (c.world && !worldOn()) return fail(NO_WORLD);
        const L = Log(); const before = L ? L.entries().length : 0;
        let r; try { r = c.run(cmd.arg || '') || { ok: true }; } catch (e) { r = fail(`/${c.name}: ${e && e.message || e}`); }
        const after = L ? L.entries() : [];
        let logged = after.slice(before);
        if (r.ok && !logged.length && r.log && L) { L.add({ who: persona() || 'You', what: r.log, kind: 'action' }); logged = L.entries().slice(before); }
        const lines = L ? logged.map(e => L.describe(e)) : [];
        if (!r.ok && !r.error) r.error = lines.join('\n') || `/${c.name}: nothing happened.`;
        return Object.assign(r, { command: c.name, logged: lines });
    }
    // Run chat input: every command in order (stop at the first failure), then the message.
    // → { ok, handled, results, message, error? }
    function runText(text) {
        const parts = splitInput(text);
        const results = [];
        for (const p of parts) {
            if (p.kind !== 'command') continue;
            const r = exec(p); results.push(r);
            if (!r.ok) return { ok: false, handled: true, results, message: '', error: r.error };
        }
        return { ok: true, handled: true, results, message: messageOf(parts) };
    }
    function report(res) {
        if (!res.ok) { showBox(res.error, 'RPmod command'); return; }
        const infos = res.results.filter(r => r.info);
        if (infos.length) showBox(infos.map(r => r.info.text).join('\n\n'), infos.map(r => r.info.title).join(' · '));
        const lines = res.results.flatMap(r => r.logged.length ? r.logged : r.text ? [r.text] : []);
        if (lines.length) toast(lines.join('\n'));
    }
    function showBox(text, title) {
        if (typeof window.msgbox === 'function') { try { window.msgbox(text, title); return; } catch (_) {} }
        try { window.alert(title + '\n\n' + text); } catch (_) {}
    }
    function toast(text) {
        try {
            const t = el('div', { class: 'rpm-themed rpm-toast', role: 'status', 'data-rpm': 'slash-toast', style: 'white-space:pre-line;max-width:min(560px,90vw)', text });
            document.body.appendChild(t); setTimeout(() => t.remove(), 1800 + 60 * Math.min(60, text.length / 4));
        } catch (_) {}
    }

    // Send a chat message through Esolite (the RP core's path knows the chat-mode inputs).
    function sendMessage(text) {
        const T = window.KLITE_RPMod?.panels?.TOOLS;
        if (T && typeof T.sendTextToEsolite === 'function') return T.sendTextToEsolite(text);
        const input = document.getElementById('input_text'); if (!input) return;
        input.value = text; window.prepare_submit_generation?.();
    }
    function putInInput(text) {
        const ids = ['input_text', 'cht_inp', 'corpo_cht_inp'];
        for (const id of ids) { const e = document.getElementById(id); if (e) e.value = text; }
    }

    // Quick replies and other UI: run commands, then send the message (send) or leave it in the box.
    function run(text, opts = {}) {
        const res = runText(text);
        report(res);
        if (res.ok && res.message) { if (opts.send) sendMessage(res.message); else putInInput(res.message); }
        else if (res.ok && opts.send && opts.continueIfEmpty) sendMessage('');   // an empty send: the AI continues
        return res;
    }

    // ---- the chat box: wrap prepare_submit_generation --------------------------------------------
    // A user custom tool with the same name wins (Esolite runs it).
    function userToolTakes(name) {
        try {
            if (typeof window.customtools_sanitize_list !== 'function') return false;
            const tools = window.customtools_sanitize_list(window.localsettings && window.localsettings.custom_tools);
            return Array.isArray(tools) && tools.some(t => t && t.userCallable && String(t.name).toLowerCase() === name);
        } catch (_) { return false; }
    }
    function isCommand(text) {
        return startsWithCommand(text, (name) => known(name) && !userToolTakes(name));
    }
    let hooked = false;
    function install() {
        if (hooked) return true;
        if (typeof window.prepare_submit_generation !== 'function') return false;
        const orig = window.prepare_submit_generation;
        const wrapped = function () {
            const input = document.getElementById('input_text');
            const text = input ? String(input.value || '') : '';
            if (!isCommand(text)) return orig.apply(this, arguments);
            // the aesthetic / corpo chat box was copied into #input_text and is cleared after us
            const source = ['cht_inp', 'corpo_cht_inp'].map(id => document.getElementById(id)).find(e => e && e.value === text);
            const res = runText(text);
            report(res);
            if (!res.ok) {   // keep what was typed, like Esolite after a slash-command error
                if (source) setTimeout(() => { if (!source.value) source.value = text; }, 0);
                return;
            }
            input.value = '';
            if (res.message) { input.value = res.message; return window.prepare_submit_generation.apply(this, arguments); }
        };
        wrapped.__rpmod_slash = true;
        window.prepare_submit_generation = wrapped;
        hooked = true;
        return true;
    }

    // ---- hiding control tags in the displayed chat (R6 step 3; known issue 2) ----------------------
    // Esolite passes every message it displays (not in Allow Editing) through
    // apply_display_only_regex; RPmod removes its tags from that output only. The story text keeps
    // them and the engine parses them as before.
    const HIDE_TAGS = 'hide_control_tags';
    const hideTags = () => { try { return window.KLITE_RPMod_Settings?.get(HIDE_TAGS) === true; } catch (_) { return false; } };
    let displayHooked = false;
    function installDisplay() {
        if (displayHooked) return true;
        const orig = window.apply_display_only_regex;
        if (typeof orig !== 'function') return false;
        const wrapped = function () {
            const out = orig.apply(this, arguments);
            try { return hideTags() && typeof out === 'string' ? stripControlTags(out) : out; } catch (_) { return out; }
        };
        wrapped.__rpmod_tags = true;
        window.apply_display_only_regex = wrapped;
        displayHooked = true;
        return true;
    }
    function registerDisplaySetting() {
        const S = window.KLITE_RPMod_Settings; if (!S) return false;
        S.registerSetting({ id: HIDE_TAGS, section: 'Display', order: 10, default: false, label: 'Hide control tags in the chat',
            help: 'Removes <move>, <give>, <buy> and the other RPmod tags from the chat as it is shown. The story keeps them (Allow Editing shows them) and RPmod still reads them; the game log shows what they did.' });
        S.onChange(HIDE_TAGS, () => { try { window.render_gametext?.(false, false); } catch (_) {} });
        return true;
    }

    const api = {
        commands: () => COMMANDS.map(c => ({ name: c.name, aliases: (c.aliases || []).slice(), usage: c.usage, help: c.help, group: c.group, world: !!c.world })),
        isCommand, run, runText, install, help: () => help('').info,
        installed: () => hooked,
        displayHooked: () => displayHooked,
        stripControlTags,
    };
    window.KLITE_RPMod_Chat = api;
    const quick = installQuickReplies(api);   // R6 step 2: the left-dock section
    api.quickReplies = quick;

    let tries = 0, registered = false, setting = false;
    const attempt = () => {
        const hooked = install(); const shown = installDisplay();
        if (!registered && window.KLITE_RPMod_Shell) registered = quick.register();
        if (!setting) setting = registerDisplaySetting();
        if ((!hooked || !shown || !registered || !setting) && ++tries < 120) setTimeout(attempt, 500);
    };
    if (document.readyState === 'complete') attempt();
    else window.addEventListener('load', attempt, { once: true });
}
