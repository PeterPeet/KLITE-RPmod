// =============================================================================
// KLITE RPmod — Per-turn character context: provider 'characters' of src/context/context.js (persona + AI character).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================
import { getContext } from '../context/context.js';

export function installCharacterContext(S) {

    // =============================================
    // PER-TURN CHARACTER CONTEXT (provider 'characters' of src/context/context.js)
    // =============================================
    // What the AI gets about the people in the scene each turn:
    //   • the user's persona — Tools tab, persona enabled + selected
    //   • the AI character — group chat (Roles enabled): the current speaker;
    //     otherwise Tools tab, character enabled + selected
    // Marked as described so Worlds lists the same person without repeating the card.
    // (pending_context_preinjection is not a context channel: Esolite prints it at the
    // start of the AI's reply and overwrites it in chat mode.)
    function cardField(c, f) {
        if (!c) return '';
        const v = c[f] ?? c.data?.[f] ?? c.rawData?.data?.[f];
        return v == null ? '' : String(v).trim();
    }
    function characterContextText(c) {
        const lines = [];
        const desc = cardField(c, 'description') || cardField(c, 'content');
        const pers = cardField(c, 'personality');
        const scen = cardField(c, 'scenario');
        if (desc) lines.push('Description: ' + desc);
        if (pers) lines.push('Personality: ' + pers);
        if (scen) lines.push('Scenario: ' + scen);
        return lines.join('\n');
    }
    // Known issue 4: Start RP (Scenario tab) and Esolite's own character import put a card's text
    // into World Info as "<name>_imported_memory" entries, and Esolite uses those of the persona
    // (wigroup = chatname) and the current speaker each turn. Then the card text is not sent
    // again here, only what WI does not carry: the d20 sheet.
    function hasImportedMemory(...names) {
        const wi = Array.isArray(window.current_wi) ? window.current_wi : [];
        const want = new Set(names.map(n => String(n || '').trim()).filter(Boolean));
        return wi.some(e => e && !e.widisabled && e.content && want.has(e.wigroup)
            && typeof e.comment === 'string' && e.comment === `${e.wigroup}_imported_memory`);
    }
    function collectCharacterContext(ctx) {
        const P = (window.KLITE_RPMod && window.KLITE_RPMod.panels) || {};
        const tools = P.TOOLS, roles = P.ROLES;
        const out = [];
        const add = (c, label, priority, wiNames) => {
            const name = cardField(c, 'name');
            if (!name || ctx.isDescribed(name)) return;
            // the d20 sheet stored on the card (src/characters), when it has one
            let sheet = '';
            try { sheet = window.KLITE_RPMod_Characters?.summaryFor(name) || ''; } catch (_) {}
            const card = hasImportedMemory(name, ...wiNames) ? '' : characterContextText(c);
            const text = [card, sheet && 'Character sheet: ' + sheet].filter(Boolean).join('\n');
            if (text) out.push({ title: `${label}: ${name}`, priority, text });
            ctx.describe(name);
        };
        const chatname = window.localsettings?.chatname;
        if (tools?.personaEnabled && tools.selectedPersona) add(tools.selectedPersona, 'User Character', 88, [chatname]);
        let aiChar = null;
        if (roles?.enabled) { try { aiChar = roles.getCurrentSpeaker(); } catch (_) {} }
        else if (tools?.characterEnabled && tools.selectedCharacter) aiChar = tools.selectedCharacter;
        if (aiChar) add(aiChar, 'Character', 87, []);
        return out;
    }
    try { getContext().register({ id: 'characters', order: 10, collect: collectCharacterContext }); }
    catch (e) { console.warn('[RPMod] context provider registration failed:', e); }
}
