// =============================================================================
// KLITE RPmod — Scenario panel (KLITE_RPMod.panels.SCENARIO): set up a scene / Start Role Play.
// R8: no longer a tab of the right panel — "Start Role Play" is the "RPmod role play" section of
// Esolite's Quick Start (src/onboarding/roleplayQuickStart.js), which calls startRoleplay().
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installScenarioPanel(S) {
    const { t } = S;
    // SCENARIO PANEL (CREATE/SCENARIO) - stub inputs and action
    KLITE_RPMod.panels.SCENARIO = {
        getSourceCharacter() {
            try {
                if (KLITE_RPMod.panels.ROLES?.enabled && Array.isArray(KLITE_RPMod.panels.ROLES.activeChars) && KLITE_RPMod.panels.ROLES.activeChars.length > 0) {
                    return KLITE_RPMod.panels.ROLES.activeChars[0];
                }
                if (KLITE_RPMod.panels.TOOLS?.selectedCharacter) return KLITE_RPMod.panels.TOOLS.selectedCharacter;
                const name = (window.localsettings?.chatopponent || '').trim();
                if (name && Array.isArray(KLITE_RPMod.characters)) {
                    return KLITE_RPMod.characters.find(c => c?.name === name) || null;
                }
            } catch(_) {}
            return null;
        },

        _getScenarioFieldsFromChar(char) {
            if (!char) return { scenario: '', example: '', first: '' };
            const raw = char.rawData?.data || char.rawData || {};
            return {
                scenario: (char.scenario || raw.scenario || '').trim(),
                example: (char.mes_example || raw.mes_example || '').trim(),
                first: (char.first_mes || raw.first_mes || '').trim()
            };
        },

        render() {
            const src = this.getSourceCharacter();
            // Prefer stored scenario values if available; otherwise derive from character
            const st = KLITE_RPMod.state?.scenario || { scenario: '', example: '', first: '' };
            const hasStored = !!(st.scenario || st.example || st.first);
            const vals = hasStored ? { scenario: st.scenario || '', example: st.example || '', first: st.first || '' }
                                   : this._getScenarioFieldsFromChar(src);
            return `
                <div class="rpm-note rpm-mb">
                    <strong>Note:</strong> on clicking Start Role Play all necessary data gets stored into WI. If you want to change the configuration afterwards do it manually in WI.
                </div>
                ${t.section('🗺️ Scenario',
                `${t.textarea('scenario-text', 'Describe the world, setting, and background.', KLITE_RPMod.escapeHtml(vals.scenario))}`
            )}
                
                ${t.section('💬 Example Dialogue',
                `${t.textarea('scenario-example', 'Provide example dialogue lines.', KLITE_RPMod.escapeHtml(vals.example))}`
            )}
                
                ${t.section('📩 First Message',
                `${t.textarea('scenario-first-message', 'Write the first message to start the chat.', KLITE_RPMod.escapeHtml(vals.first))}`
            )}
            <div class="rpm-fill rpm-mt">
                ${t.button('Start Role Play', '', 'scenario-start-roleplay')}
            </div>
            `;
        },
        actions: {
            'scenario-start-roleplay': () => KLITE_RPMod.panels.SCENARIO.startRoleplay(),
        },

        // Start Role Play: the selected characters (Roles, else the AI character, else Esolite's
        // chat opponents), the persona, the scenario, example dialogue and first message go into
        // World Info / the chat. vals = { scenario, example, first } (default: this panel's fields);
        // opts.quiet: no alert (R8: Esolite's Quick Start runs it — src/onboarding/roleplayQuickStart.js).
        // → { ok, participants, reason? }
        async startRoleplay(vals, opts = {}) {
                const field = (id) => (document.getElementById(id)?.value || '').trim();
                vals = vals || { scenario: field('scenario-text'), example: field('scenario-example'), first: field('scenario-first-message') };
                try {
                    // Gather selected character names from ROLES panel or fallbacks
                    const getSelectedNames = () => {
                        const names = [];
                        try {
                            if (KLITE_RPMod.panels.ROLES?.enabled && Array.isArray(KLITE_RPMod.panels.ROLES.activeChars) && KLITE_RPMod.panels.ROLES.activeChars.length > 0) {
                                KLITE_RPMod.panels.ROLES.activeChars.forEach(c => { if (c?.name) names.push(c.name); });
                            } else if (KLITE_RPMod.panels.TOOLS?.selectedCharacter?.name) {
                                names.push(KLITE_RPMod.panels.TOOLS.selectedCharacter.name);
                            } else if (window.localsettings?.chatopponent) {
                                names.push(...window.localsettings.chatopponent.split('||$||').filter(Boolean).map(s => s.trim()));
                            }
                        } catch(_) {}
                        return [...new Set(names.filter(Boolean))];
                    }

                    const scenarioText = String(vals.scenario || '').trim();
                    const firstMessageText = String(vals.first || '').trim();
                    const selectedNames = getSelectedNames();

                    if (selectedNames.length === 0) {
                        KLITE_RPMod.log('status', 'Start RP aborted: no characters selected');
                        return { ok: false, participants: [], reason: 'no characters selected' };
                    }

                    // Prefer Chat Mode so group chat works without instruct tags
                    try {
                        if (window.localsettings) {
                            window.localsettings.opmode = 3; // chat mode
                            window.localsettings.multiline_replies = true;
                            window.save_settings?.();
                        }
                    } catch(_) {}

                    // Import each character into WI using host API (adds to chatopponent if needed)
                    for (const name of selectedNames) {
                        try { await window.loadByCharacterNameIntoWI?.(name); } catch(e) { KLITE_RPMod.log('integration', `loadByCharacterNameIntoWI failed for ${name}: ${e?.message||e}`); }
                    }

                    // Ensure per-character WI entries: Description, Personality, Example Dialogue
                    try {
                        if (!Array.isArray(window.current_wi)) window.current_wi = [];
                        for (const name of selectedNames) {
                            try {
                                const data = await window.getCharacterData?.(name);
                                const raw = data?.data || {};
                                const description = String(raw.description || '').trim();
                                const personality = String(raw.personality || '').trim();
                                let examples = String(raw.mes_example || '').trim();
                                try { if (examples && typeof window.formatExampleMessages === 'function') examples = window.formatExampleMessages(examples); } catch(_) {}

                                // Remove combined memory entries added by importer to avoid duplication
                                window.current_wi = window.current_wi.filter(wi => !(wi?.wigroup === name && wi?.comment && wi.comment.endsWith('_imported_memory')));

                                const base = { key: name, keyanti: '', folder: name, selective: false, constant: false, probability: 100, wigroup: name, widisabled: false, comment: `${name}_imported_memory` };
                                if (description) {
                                    window.current_wi.push({ ...base, keysecondary: `${name} description, appearance`, content: description });
                                }
                                if (personality) {
                                    window.current_wi.push({ ...base, keysecondary: `${name} personality, traits`, content: personality });
                                }
                                if (examples) {
                                    // Do not add examples as active; keep disabled by default
                                    window.current_wi.push({ ...base, keysecondary: `${name} examples, dialogue`, content: examples, widisabled: true });
                                }
                                // Reorder this character's WI entries to: Description, Personality, Example Dialogue, then everything else in original order
                                try {
                                    const isOurDesc = (wi) => wi?.wigroup === name && wi?.comment?.endsWith('_imported_memory') && /description, appearance$/.test(wi?.keysecondary||'');
                                    const isOurPers = (wi) => wi?.wigroup === name && wi?.comment?.endsWith('_imported_memory') && /personality, traits$/.test(wi?.keysecondary||'');
                                    const isOurEx   = (wi) => wi?.wigroup === name && wi?.comment?.endsWith('_imported_memory') && /examples, dialogue$/.test(wi?.keysecondary||'');
                                    const groupEntries = window.current_wi.filter(wi => wi?.wigroup === name);
                                    const others = groupEntries.filter(wi => !isOurDesc(wi) && !isOurPers(wi) && !isOurEx(wi));
                                    const desc = groupEntries.find(isOurDesc);
                                    const pers = groupEntries.find(isOurPers);
                                    const ex   = groupEntries.find(isOurEx);
                                    const reordered = [];
                                    if (desc) reordered.push(desc);
                                    if (pers) reordered.push(pers);
                                    if (ex)   reordered.push(ex);
                                    reordered.push(...others);
                                    // Replace this group's slice in current_wi
                                    window.current_wi = window.current_wi.filter(wi => wi?.wigroup !== name).concat(reordered);
                                } catch(_) {}
                            } catch(e) { KLITE_RPMod.log('integration', `Failed to enrich WI for ${name}: ${e?.message||e}`); }
                        }
                    } catch(_) {}

                    // Import User Character (persona) into WI if enabled
                    try {
                        const tools = KLITE_RPMod.panels.TOOLS;
                        const chatname = (window.localsettings?.chatname || 'User').trim();
                        if (tools?.personaEnabled && tools?.selectedPersona?.name && chatname) {
                            const personaCardName = tools.selectedPersona.name;
                            let description = '', personality = '', examples = '';
                            try {
                                const data = await window.getCharacterData?.(personaCardName);
                                const raw = data?.data || {};
                                description = String(raw.description || '').trim();
                                personality = String(raw.personality || '').trim();
                                // Restore formatted example messages with explicit prefix
                                examples = String(raw.mes_example || '').trim();
                                if (examples) {
                                    try {
                                        if (typeof window.formatExampleMessages === 'function') {
                                            examples = window.formatExampleMessages(examples);
                                        } else {
                                            examples = `Example messages:\n\n${examples}`;
                                        }
                                    } catch(_) {
                                        examples = `Example messages:\n\n${examples}`;
                                    }
                                }
                            } catch(_) {}

                            // Remove any existing combined memory entries for the user persona
                            window.current_wi = window.current_wi.filter(wi => !(wi?.wigroup === chatname && wi?.comment && wi.comment.endsWith('_imported_memory')));

                            const userBase = {
                                key: chatname,
                                keysecondary: '',
                                keyanti: '',
                                folder: chatname,
                                selective: false,
                                constant: false,
                                probability: 100,
                                wigroup: chatname,
                                widisabled: false,
                                comment: `${chatname}_imported_memory`
                            };
                            if (description) {
                                window.current_wi.push({ ...userBase, keysecondary: `${chatname} description, appearance`, content: description });
                            }
                            if (personality) {
                                window.current_wi.push({ ...userBase, keysecondary: `${chatname} personality, traits`, content: personality });
                            }
                            if (examples) {
                                // Keep user example dialogue deactivated by default; include formatted prefix
                                window.current_wi.push({ ...userBase, keysecondary: `${chatname} examples, dialogue`, content: examples, widisabled: true });
                            }
                        }
                    } catch(_) {}

                    // Write Scenario (from Scenario Panel) as an ACTIVE WI entry
                    try {
                        if (scenarioText) {
                            if (!Array.isArray(window.current_wi)) window.current_wi = [];
                            const scenarioWI = {
                                key: 'Scenario',
                                keysecondary: 'Group scenario, setting',
                                keyanti: '',
                                content: scenarioText,
                                comment: 'GroupScenario_active',
                                folder: 'GroupScenario',
                                selective: false,
                                constant: true, // always include as active scenario
                                probability: 100,
                                wigroup: 'GroupScenario',
                                widisabled: false
                            };
                            // Replace existing GroupScenario_imported if present
                            window.current_wi = window.current_wi.filter(wi => wi?.comment !== scenarioWI.comment);
                            window.current_wi.push(scenarioWI);
                            KLITE_RPMod.log('storage', 'Scenario imported into WI (active)', { len: scenarioText.length });
                        }
                    } catch(e) { KLITE_RPMod.log('storage', 'Failed to add scenario WI:', e?.message||e); }

                    // Optionally add each character's own Scenario as DISABLED entries for later swapping
                    try {
                        for (const name of selectedNames) {
                            try {
                                const data = await window.getCharacterData?.(name);
                                const raw = data?.data || {};
                                const charScenario = (raw.scenario || '').trim();
                                if (charScenario) {
                                    const charScenarioWI = {
                                        key: name,
                                        keysecondary: `${name} scenario, background`,
                                        keyanti: '',
                                        content: charScenario,
                                        comment: `${name}_imported_scenario`,
                                        folder: name,
                                        selective: false,
                                        constant: false,
                                        probability: 100,
                                        wigroup: 'GroupScenario',
                                        widisabled: true
                                    };
                                    window.current_wi = window.current_wi.filter(wi => wi?.comment !== charScenarioWI.comment);
                                    window.current_wi.push(charScenarioWI);
                                }
                            } catch(_) {}
                        }
                    } catch(_) {}

                    // Add Group Example Dialogue under GroupScenario as DISABLED entry (below Scenario)
                    try {
                        const exampleGroupText = String(vals.example || '').trim();
                        if (exampleGroupText) {
                            const groupExamplesWI = {
                                key: 'Group Example Dialogue',
                                keysecondary: 'Example dialogue for group',
                                keyanti: '',
                                content: exampleGroupText,
                                comment: 'GroupScenario_examples',
                                folder: 'GroupScenario',
                                selective: false,
                                constant: false,
                                probability: 100,
                                wigroup: 'GroupScenario',
                                widisabled: true
                            };
                            window.current_wi = window.current_wi.filter(wi => wi?.comment !== groupExamplesWI.comment);
                            window.current_wi.push(groupExamplesWI);
                        }
                    } catch(_) {}

                    // Add User Character Scenario under GroupScenario as DISABLED entry
                    try {
                        const tools = KLITE_RPMod.panels.TOOLS;
                        const chatname = (window.localsettings?.chatname || 'User').trim();
                        if (tools?.selectedPersona && chatname) {
                            const sel = tools.selectedPersona;
                            const personaCardName = sel.name;
                            let userScenario = '';
                            // Prefer scenario from the selected persona object itself
                            try {
                                userScenario = String(sel.scenario || sel.rawData?.data?.scenario || sel.data?.scenario || '').trim();
                            } catch(_) {}
                            // Fallback to character store lookup by persona name
                            if (!userScenario && personaCardName) {
                                try {
                                    const data = await window.getCharacterData?.(personaCardName);
                                    const raw = data?.data || {};
                                    userScenario = String(raw.scenario || '').trim();
                                } catch(_) {}
                            }
                            if (userScenario) {
                                const userScenarioWI = {
                                    key: chatname,
                                    keysecondary: `${chatname} scenario, background`,
                                    keyanti: '',
                                    content: userScenario,
                                    comment: `${chatname}_imported_scenario`,
                                    folder: chatname,
                                    selective: false,
                                    constant: false,
                                    probability: 100,
                                    wigroup: 'GroupScenario',
                                    widisabled: true
                                };
                                window.current_wi = window.current_wi.filter(wi => wi?.comment !== userScenarioWI.comment);
                                window.current_wi.push(userScenarioWI);
                            }
                        }
                    } catch(_) {}

                    // Insert First Message into chat
                    try {
                        if (firstMessageText) {
                            if (!Array.isArray(window.gametext_arr)) window.gametext_arr = [];
                            const firstSpeaker = selectedNames[0] || (window.localsettings?.chatopponent || 'AI');
                            const inInstruct = (window.localsettings?.opmode === 4 && !!window.localsettings?.inject_chatnames_instruct);
                            const prefix = inInstruct ? (window.get_instructendplaceholder?.() || '') : '\n';
                            const line = `${prefix}${firstSpeaker}: ${firstMessageText}`;
                            const beforeCount = window.gametext_arr.length;
                            window.gametext_arr.push(line);
                            KLITE_RPMod.log('chat', 'First message inserted', { speaker: firstSpeaker, len: line.length, chat_count_before: beforeCount, chat_count_after: window.gametext_arr.length });
                            try { window.render_gametext?.(true); } catch(_) {}
                        }
                    } catch(e) { KLITE_RPMod.log('chat', 'Failed to insert first message:', e?.message||e); }

                    // Ensure chatopponent string includes all participants (redundant if host already added them)
                    try {
                        if (window.localsettings) {
                            const existing = (window.localsettings.chatopponent || '').split('||$||').filter(Boolean).map(s => s.trim());
                            const merged = [...new Set([...existing, ...selectedNames])];
                            window.localsettings.chatopponent = merged.join('||$||');
                            window.save_settings?.();
                            window.handle_bot_name_onchange?.();
                        }
                    } catch(_) {}

                    // Autosave if available
                    try { window.autosave?.(); } catch(_) {}

                    KLITE_RPMod.log('status', 'Role play initialized', { participants: selectedNames });
                    if (!opts.quiet) try { alert('Role Play data configured in WorldInfo. Have fun!'); } catch(_) {}
                    return { ok: true, participants: selectedNames };
                } catch(e) {
                    KLITE_RPMod.log('errors', 'scenario-start-roleplay handler error:', e?.message||e);
                    return { ok: false, participants: [], reason: String(e?.message || e) };
                }
        }
    };

}
