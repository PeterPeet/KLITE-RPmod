// =============================================================================
// KLITE RPmod — chat rules (pure): slash-command input parsing (R6)
// -----------------------------------------------------------------------------
// The chat box and quick replies share one syntax (design: docs/design/R6-chat-power.md):
//   • a part that starts with a known /command runs it; the rest of the part is its argument
//     (names with spaces need no quotes: "/go Forest Road");
//   • parts are separated by " | " or by new lines; every other part is chat text, sent as the
//     message after the commands ran.
// No DOM, no globals — tested directly.
// =============================================================================

// "/Go  Forest Road" → { name: 'go', arg: 'Forest Road' }; null when the part is no command.
export function parseCommand(part) {
    const m = /^\s*\/([A-Za-z][\w-]*)(?:\s+([\s\S]*))?$/.exec(String(part || ''));
    return m ? { name: m[1].toLowerCase(), arg: (m[2] || '').trim() } : null;
}

// Split chat input into ordered parts: [{ kind: 'command', name, arg } | { kind: 'text', text }].
export function splitInput(text) {
    const parts = [];
    for (const line of String(text || '').split(/\r?\n/)) {
        for (const piece of line.split(/\s+\|\s+/)) {
            const cmd = parseCommand(piece);
            if (cmd) parts.push({ kind: 'command', ...cmd });
            else if (piece.trim()) parts.push({ kind: 'text', text: piece.trim() });
        }
    }
    return parts;
}

// Does this input start with one of our commands (so RPmod handles it, not Esolite)?
// `known(name)` → true for RPmod command names and aliases.
export function startsWithCommand(text, known) {
    const first = String(text || '').split(/\r?\n/)[0].split(/\s+\|\s+/)[0];
    const cmd = parseCommand(first);
    return !!(cmd && known(cmd.name));
}

// The chat message left after the commands: the text parts joined by new lines.
export function messageOf(parts) { return parts.filter(p => p.kind === 'text').map(p => p.text).join('\n'); }

// Arguments become tag contents: '<' and '>' would end the tag early.
export function cleanArg(s) { return String(s || '').replace(/[<>]/g, '').trim(); }

// A trailing "adv"/"dis" (also "advantage"/"disadvantage"): { rest, mode: 'adv'|'dis'|null }.
export function splitMode(arg) {
    const m = /^(.*?)\s*\b(adv|advantage|dis|disadvantage)\s*$/i.exec(String(arg || '').trim());
    if (!m) return { rest: String(arg || '').trim(), mode: null };
    return { rest: m[1].trim(), mode: /^adv/i.test(m[2]) ? 'adv' : 'dis' };
}

// "/check sleight of hand 15 adv" → { what: 'sleight of hand', dc: 15, mode: 'adv' }.
// Also "dex dc 12" and "Perception vs 14".
export function parseCheck(arg) {
    const { rest, mode } = splitMode(arg);
    const m = /^(.*?)\s*(?:\b(?:dc|vs\.?)\s*)?(\d+)$/i.exec(rest);
    if (m && m[1].trim()) return { what: m[1].trim(), dc: Number(m[2]), mode };
    return { what: rest.replace(/\s*\b(?:dc|vs\.?)\s*$/i, '').trim(), dc: null, mode };
}

// "Goblin with Shortbow" → { target: 'Goblin', weapon: 'Shortbow' }.
export function parseAttack(arg) {
    const m = /^(.*?)\s+(?:with|using)\s+(.+)$/i.exec(String(arg || '').trim());
    return m ? { target: m[1].trim(), weapon: m[2].trim() } : { target: String(arg || '').trim(), weapon: '' };
}

// "key=value" (spaces around '=' allowed) → { key, value } ; value null without '='.
export function parseAssign(arg) {
    const s = String(arg || '').trim(); const i = s.indexOf('=');
    return i < 0 ? { key: s, value: null } : { key: s.slice(0, i).trim(), value: s.slice(i + 1).trim() };
}

// Case- and space-insensitive name match used for skills, weapons, quest titles.
export function nameKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
