// =============================================================================
// KLITE RPmod — Roles panel (KLITE_RPMod.panels.ROLES): group chat — participants, speaker modes, talkativeness.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================
import { getContext } from '../context/context.js';

export function installRolesPanel(S) {
    const { t } = S;
    // ROLES PANEL (formerly GROUP)
    KLITE_RPMod.panels.ROLES = {
        enabled: false,
        activeChars: [],
        // Next speaker index
        currentSpeaker: 0,
        // Last speaker index (-1 = none yet)
        lastSpeaker: -1,
        speakerHistory: [],

        // Auto-response system
        speakerMode: 'manual', // 'manual', 'round-robin', 'random', 'keyword', 'talkative', 'party'
        autoResponses: {
            enabled: false,
            delay: 10,
            enableSelfAnswers: false,
            continueWithoutPlayer: false,
            autoAdvanceAfterTrigger: true,
            // Default: advance to next speaker after user submit in group chat (non-manual modes)
            autoAdvanceOnUserSubmit: true
        },
        autoResponseTimer: null,
        isUserTyping: false,
        roundRobinPosition: 0,
        lastTriggerTime: {},

        async init() {
            // Prevent re-entrant refresh loops
            const prev = KLITE_RPMod._inRolesInit;
            KLITE_RPMod._inRolesInit = true;
            try {
                // Load saved settings
                await this.loadSettings();
                // Ensure characters are available; avoid immediate ROLES refresh loops
                try { await KLITE_RPMod.ensureCharactersLoaded?.(); } catch(_) {}
                // Do not call this.refresh() here; panel is already being rendered by loadPanel
            } finally {
                KLITE_RPMod._inRolesInit = prev;
            }
            // Setup input monitoring when panel is first used
            this.setupInputMonitoring();
            // Setup event handlers after render
            setTimeout(() => this.setupEventHandlers(), 100);
            // Ensure Character & Persona controls (rendered here from TOOLS) are wired immediately
            setTimeout(() => { try { KLITE_RPMod.panels.TOOLS?.setupCharacterIntegration?.(); } catch (_) {} }, 120);
        },


        render() {
            return `
                ${t.section('Group Chat Control',
                `<label>
                        <input type=\"checkbox\" id=\"group-enabled\" ${this.enabled ? 'checked' : ''}>
                        Enable advanced Group Chat in Esobold
                    </label>`
            )}
                
                ${t.section('Character & Persona Integration',
                `<div class=\"klite-char-persona-controls\">\n\
                        ${KLITE_RPMod.panels.TOOLS.renderPersonaControls()}\n\
                        ${KLITE_RPMod.panels.TOOLS.renderCharacterControls()}\n\
                    </div>`
            )}
                
                ${this.enabled ? this.renderGroupControls() : ''}
            `;
        },

        setupEventHandlers() {
            document.getElementById('group-enabled')?.addEventListener('change', e => {
                this.enabled = e.target.checked;
                this.refresh();
                try { this.saveSettings?.(); } catch(_) {}

                if (this.enabled) {
                    // Entering group chat: preserve Instruct mode (4); otherwise leave current mode unchanged.
                    if (window.localsettings && window.localsettings.opmode === 4) {
                        // Stay in Instruct mode
                    }
                    try { if (KLITE_RPMod.panels.TOOLS) KLITE_RPMod.panels.TOOLS.characterEnabled = false; } catch(_){}
                } else {
                    // Leaving group chat: restore AI name to selected character or input field
                    try {
                        if (window.localsettings) {
                            const selected = KLITE_RPMod.panels.TOOLS?.selectedCharacter;
                            const aiNameInput = document.getElementById('rp-ai-name');
                            const fallback = (aiNameInput && aiNameInput.value) ? aiNameInput.value : (selected?.name || window.localsettings.chatopponent || 'AI');
                            window.localsettings.chatopponent = fallback;
                            window.save_settings?.();
                            window.handle_bot_name_onchange?.();
                        }
                    } catch(_){}
                }

                // Refresh TOOLS panel to update character controls (works in panels-only mode as well)
                try {
                    const active = KLITE_RPMod.state?.tabs?.right;
                    if (active === 'TOOLS' || active === 'ROLES' || active === 'SCENARIO') {
                        KLITE_RPMod.loadPanel('right', active);
                    }
                } catch(_){}

                // Update Lite's avatar variables to reflect group/single state
                try { KLITE_RPMod.applyAvatarOverrides(); } catch (_) {}
            });


        },

        changeSpeakerMode(newMode) {
            this.speakerMode = newMode;
            this.saveSettings(); // Save the new setting
            this.clearAutoResponseTimer();
            // In manual mode, force-disable auto advance after trigger
            if (this.speakerMode === 'manual') {
                this.autoResponses.autoAdvanceAfterTrigger = false;
                this.autoResponses.enabled = false; // Auto responses disabled in manual
                this.autoResponses.autoAdvanceOnUserSubmit = false;
            }
            KLITE_RPMod.loadPanel('right', 'ROLES');
        },

        getSpeakerModeDescription() {
            switch (this.speakerMode) {
                case 'manual':
                    return 'Manual order: Characters speak only when triggered manually.';
                case 'round-robin':
                    return 'Round Robin: Characters take turns speaking in a circular order.';
                case 'random':
                    return 'Random Selection: A random character is chosen for each turn, with optional exclusion of recent speakers.';
                case 'keyword':
                    return 'Keyword Triggered: Characters respond when mentioned by name or specific keywords in the conversation.';
                case 'talkative':
                    return 'Talkative Weighted: Characters speak based on their talkativeness rating with cooldown periods.';
                case 'party':
                    return 'Party Round Robin: Everyone speaks once per round before anyone gets to speak again.';
                default:
                    return 'Manual order: Characters speak only when triggered manually.';
            }
        },

        renderGroupControls() {
            return `
                ${t.section('Characters in Group',
                `<div id="group-chars">
                        ${this.renderActiveChars()}
                    </div>
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Add Character to Group', '', 'add-from-library')}
                        ${this.getCurrentSpeaker()?.isCustom ? t.button('Edit', 'primary', 'edit-current') : ''}
                    </div>`
            )}
                
                ${t.section('Character selection',
                `<div class="klite-muted" style="display: flex; gap: 12px; align-items: center;">
                        <span>Last: <strong style="color: #e0b400;">${(this.lastSpeaker >= 0 ? (this.activeChars[this.lastSpeaker]?.name) : '—') || '—'}</strong></span>
                        <span>Next: <strong style="color: #2aa84a;">${this.getCurrentSpeaker()?.name || '—'}</strong></span>
                    </div>
                    <div class="klite-mt">
                        <label>Next Speaker Selection:</label>
                        <select id="speaker-mode" class="klite-select" style="width: 100%;" onchange="KLITE_RPMod.panels.ROLES.changeSpeakerMode(this.value)">
                            <option value="manual" ${this.speakerMode === 'manual' ? 'selected' : ''}>Manual Order</option>
                            <option value="round-robin" ${this.speakerMode === 'round-robin' ? 'selected' : ''}>Round Robin</option>
                            <option value="random" ${this.speakerMode === 'random' ? 'selected' : ''}>Random Selection</option>
                            <option value="keyword" ${this.speakerMode === 'keyword' ? 'selected' : ''}>Keyword Triggered</option>
                            <option value="talkative" ${this.speakerMode === 'talkative' ? 'selected' : ''}>Talkative Weighted</option>
                            <option value="party" ${this.speakerMode === 'party' ? 'selected' : ''}>Party Round Robin</option>
                        </select>
                        
                    </div>
                    <div id="speaker-mode-description" style="margin-top: 6px; font-size: 11px; color: var(--muted); padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        ${this.getSpeakerModeDescription()}
                    </div>
                    
                    ${this.renderAutoResponseControls()}
                    
                    <div class="klite-mt" style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: ${this.speakerMode === 'manual' ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                            <input type="checkbox" id="auto-advance-after-trigger" ${this.autoResponses.autoAdvanceAfterTrigger ? 'checked' : ''}
                                   ${this.speakerMode === 'manual' ? 'disabled' : ''}
                                   onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('autoAdvanceAfterTrigger', this.checked)">
                            <span style="color: ${this.speakerMode === 'manual' ? 'var(--muted)' : 'var(--text)'};">Auto advance after trigger</span>
                        </label>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">When enabled, 'Trigger Speaker' advances to the next speaker automatically.</div>
                    </div>

                    <div class="klite-mt" style="margin-top: 6px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: ${this.speakerMode === 'manual' ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                            <input type="checkbox" id="auto-advance-on-submit" ${this.autoResponses.autoAdvanceOnUserSubmit ? 'checked' : ''}
                                   ${this.speakerMode === 'manual' ? 'disabled' : ''}
                                   onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('autoAdvanceOnUserSubmit', this.checked)">
                            <span style="color: ${this.speakerMode === 'manual' ? 'var(--muted)' : 'var(--text)'};">Advance after user submit</span>
                        </label>
                        <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">When enabled, submitting your message advances to the next speaker.</div>
                    </div>
                    
                    <div class="klite-buttons-fill klite-mt">
                        ${t.button('Manually Advance', '', 'next-speaker')}
                        ${t.button('Trigger Speaker', 'primary', 'trigger-response')}
                    </div>`
            )}
                
                <!-- Speaker History (hidden) -->
            `;
        },

        renderAutoResponseControls() {
            const isManual = this.speakerMode === 'manual';
            const isDisabled = isManual || !this.autoResponses.enabled;

            return `
                <div style="margin-top: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg3); ${isManual ? 'opacity: 0.5;' : ''}">
                    <div style="margin-bottom: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: ${isManual ? 'not-allowed' : 'pointer'};">
                            <input type="checkbox" id="auto-responses-enabled" ${this.autoResponses.enabled ? 'checked' : ''} 
                                   ${isManual ? 'disabled' : ''}
                                   onchange="KLITE_RPMod.panels.ROLES.toggleAutoResponses(this.checked)">
                            <span style="font-weight: bold; color: ${isManual ? 'var(--muted)' : 'var(--text)'};">Enable Auto Responses</span>
                        </label>
                        ${isManual ? '<div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Auto responses are disabled in Manual Order mode</div>' : ''}
                    </div>
                    
                    <div style="margin-left: 20px;">
                        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 12px; color: var(--muted);">Delay between triggers:</label>
                            <input type="number" id="auto-response-delay" min="1" max="300" value="${this.autoResponses.delay}" 
                                   ${isDisabled ? 'disabled' : ''}
                                   style="width: 60px; padding: 2px 4px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 2px; ${isDisabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                                   onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseDelay(this.value)">
                            <span style="font-size: 12px; color: var(--muted);">seconds</span>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="enable-self-answers" ${this.autoResponses.enableSelfAnswers ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('enableSelfAnswers', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Enable self-answers</span>
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 6px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                                <input type="checkbox" id="continue-without-player" ${this.autoResponses.continueWithoutPlayer ? 'checked' : ''}
                                       ${isDisabled ? 'disabled' : ''}
                                       onchange="KLITE_RPMod.panels.ROLES.updateAutoResponseSetting('continueWithoutPlayer', this.checked)">
                                <span style="color: ${isDisabled ? 'var(--muted)' : 'var(--text)'};">Continue without player input</span>
                            </label>
                        </div>
                        
                    
                    </div>
                </div>
            `;
        },

        renderActiveChars() {
            if (this.activeChars.length === 0) {
                return '<div class="klite-center klite-muted">No characters in group</div>';
            }

            return this.activeChars.map((char, i) => {
                const avatar = KLITE_RPMod.getBestCharacterAvatar(char);
                const isNext = (i === this.currentSpeaker);
                const isLast = (i === this.lastSpeaker);
                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px; background: var(--bg2); ${isNext ? 'border-color: var(--accent); background: rgba(42, 168, 74, 0.12);' : isLast ? 'border-color: #e0b400; background: rgba(224, 180, 0, 0.12);' : ''}">
                        ${avatar ? `
                            <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border);">
                                ${KLITE_RPMod.safeImageHTML(avatar, char.name || '', 'width: 100%; height: 100%; object-fit: cover;')}
                            </div>
                        ` : `
                            <div style="width: 40px; height: 40px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 18px;">${(char.name||'?').charAt(0)}</span>
                            </div>
                        `}
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: bold; color: var(--text);">
                                ${char.name}
                                ${isLast ? '<span style="margin-left:6px; padding:1px 4px; font-size:10px; border-radius:3px; background:#e0b400; color:#000;">Last</span>' : ''}
                                ${isNext ? '<span style="margin-left:6px; padding:1px 4px; font-size:10px; border-radius:3px; background:#2aa84a; color:#fff;">Next</span>' : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button class="klite-btn" data-action="set-speaker" data-index="${i}" style="padding: 4px 8px; font-size: 11px;">Set Next</button>
                            <button class="klite-btn danger" data-action="remove-from-group" data-index="${i}" style="padding: 4px 8px; font-size: 11px;">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');
        },


        // Auto-response system methods
        toggleAutoResponses(enabled) {
            this.autoResponses.enabled = enabled;
            this.clearAutoResponseTimer();
            this.refresh();
            // Refresh Scenario panel if active (source is first group character)
            try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}
            try { this.saveSettings?.(); } catch(_) {}

            if (enabled) {
                this.setupInputMonitoring();
                // Auto responses enabled
            } else {
                // Auto responses disabled
            }
        },

        updateAutoResponseDelay(delay) {
            this.autoResponses.delay = parseInt(delay) || 10;
            this.clearAutoResponseTimer();
            try { this.saveSettings?.(); } catch(_) {}
        },

        updateAutoResponseSetting(setting, value) {
            if (setting === 'autoAdvanceAfterTrigger' && this.speakerMode === 'manual') {
                // Disallow enabling auto-advance in manual mode
                this.autoResponses.autoAdvanceAfterTrigger = false;
            } else {
                this.autoResponses[setting] = value;
            }
            try { this.saveSettings?.(); } catch(_) {}
        },

        setupInputMonitoring() {
            const inputField = document.getElementById('input');
            if (inputField && !inputField.hasAttribute('data-group-monitored')) {
                inputField.setAttribute('data-group-monitored', 'true');

                // Monitor typing
                inputField.addEventListener('input', () => {
                    this.isUserTyping = true;
                    this.clearAutoResponseTimer();
                });

                inputField.addEventListener('blur', () => {
                    setTimeout(() => {
                        this.isUserTyping = false;
                    }, 500);
                });
            }

            // Speaker mode dropdown handled via onchange attribute
        },

        clearAutoResponseTimer() {
            if (this.autoResponseTimer) {
                clearTimeout(this.autoResponseTimer);
                this.autoResponseTimer = null;
            }
        },

        startAutoResponseTimer() {
            if (!this.autoResponses.enabled) return;

            this.clearAutoResponseTimer();
            this.autoResponseTimer = setTimeout(() => {
                this.handleAutoResponse();
            }, this.autoResponses.delay * 1000);
        },

        handleAutoResponse() {
            if (!this.autoResponses.enabled || this.isUserTyping) return;

            if (this.speakerMode === 'manual') return;

            // Determine next speaker based on mode
            const nextSpeaker = this.selectNextSpeaker(this.speakerMode, true);
            if (nextSpeaker !== null) {
                this.triggerCurrentSpeaker();

                // Continue without player input if enabled
                if (this.autoResponses.continueWithoutPlayer) {
                    this.startAutoResponseTimer();
                }
            }
        },

        selectNextSpeaker(mode, updateCurrent = false) {
            if (this.activeChars.length === 0) return null;

            const previousSpeaker = this.currentSpeaker;
            let nextSpeaker = null;

            switch (mode) {
                case 'manual':
                    nextSpeaker = (this.currentSpeaker + 1) % this.activeChars.length;
                    break;

                case 'round-robin':
                    this.roundRobinPosition = (this.roundRobinPosition + 1) % this.activeChars.length;
                    nextSpeaker = this.roundRobinPosition;
                    break;

                case 'random':
                    // Enhanced: Avoid same speaker twice in a row if possible
                    if (this.activeChars.length > 1) {
                        do {
                            nextSpeaker = Math.floor(Math.random() * this.activeChars.length);
                        } while (nextSpeaker === previousSpeaker);
                    } else {
                        nextSpeaker = 0;
                    }
                    break;

                case 'keyword':
                    nextSpeaker = this.selectByKeyword();
                    break;

                case 'talkative':
                    nextSpeaker = this.selectByTalkativeness();
                    break;

                case 'party':
                    nextSpeaker = this.selectPartyRoundRobin();
                    break;

                default:
                    return null;
            }

            // Update Next speaker and UI if requested (no history change; trigger handles history)
            if (updateCurrent && nextSpeaker !== null) {
                this.currentSpeaker = nextSpeaker;
                this.refresh();
                // Refresh Scenario panel if active
                try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}
                KLITE_RPMod.log('panels', `Speaker selection (${mode}): ${this.activeChars[this.currentSpeaker]?.name} (index ${this.currentSpeaker})`);
            }

            return nextSpeaker;
        },

        actions: {
            // Proxy persona/character actions to TOOLS so ROLES buttons work immediately
            'select-persona': () => KLITE_RPMod.panels.TOOLS.actions['select-persona'](),
            'select-character': () => KLITE_RPMod.panels.TOOLS.actions['select-character'](),
            'apply-persona': () => KLITE_RPMod.panels.TOOLS.applyPersona?.(),
            'apply-character': () => KLITE_RPMod.panels.TOOLS.applyCharacter?.(),
            'remove-persona': () => KLITE_RPMod.panels.TOOLS.removePersona?.(),
            'remove-character': () => KLITE_RPMod.panels.TOOLS.removeCharacter?.(),

            'add-from-library': () => {
                KLITE_RPMod.showUnifiedCharacterModal('multi-select');
            },

            'add-custom': () => {
                KLITE_RPMod.panels.ROLES.showCustomCharacterModal();
            },

            'edit-current': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const currentSpeaker = groupPanel.getCurrentSpeaker();
                if (currentSpeaker && currentSpeaker.isCustom) {
                    groupPanel.showCustomCharacterModal(currentSpeaker);
                }
            },

            'goto-history': (e) => {
                try {
                    const target = e.target.closest('[data-index]');
                    if (!target) return;
                    const idx = parseInt(target.dataset.index);
                    KLITE_RPMod.panels.ROLES.gotoHistory(idx);
                } catch (_) {}
            },


            'set-speaker': (e) => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                groupPanel.currentSpeaker = parseInt(e.target.dataset.index);
                groupPanel.refresh();
                groupPanel.saveSettings?.();
            },

            'next-speaker': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const next = groupPanel.selectNextSpeaker(groupPanel.speakerMode, false);
                if (next !== null && typeof next === 'number') {
                    groupPanel.currentSpeaker = next;
                    groupPanel.refresh();
                    KLITE_RPMod.log('panels', `Selected next speaker: ${groupPanel.getCurrentSpeaker()?.name}`);
                    groupPanel.saveSettings?.();
                }
            },

            'trigger-response': () => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                KLITE_RPMod.log('group', `Trigger Speaker clicked; next speaker: ${groupPanel.getCurrentSpeaker()?.name || 'none'}`);
                // Preserve Instruct mode; do not force Chat when triggering
                if (window.localsettings && window.localsettings.opmode === 4) {
                    // Stay in Instruct
                }
                groupPanel.updateKoboldSettings();
                try {
                    const cont = KLITE_RPMod.getChatScrollContainer?.();
                    groupPanel._preTriggerScroll = cont ? cont.scrollTop : 0;
                } catch (_) {}
                groupPanel.triggerCurrentSpeaker();

                // Auto advance if enabled and not manual mode
                if (groupPanel.speakerMode !== 'manual' && groupPanel.autoResponses.autoAdvanceAfterTrigger) {
                    setTimeout(() => {
                        groupPanel.advanceSpeaker();
                    }, 100);
                }

                // Start auto-response timer if enabled
                groupPanel.startAutoResponseTimer();
            },

            'remove-from-group': (e) => {
                const groupPanel = KLITE_RPMod.panels.ROLES;
                const index = parseInt(e.target.dataset.index);
                const char = groupPanel.activeChars[index];

                // Remove character avatar from group avatars map
                if (char) {
                    KLITE_RPMod.groupAvatars.delete(char.id);
                }

                groupPanel.activeChars.splice(index, 1);
                if (groupPanel.currentSpeaker >= groupPanel.activeChars.length) {
                    groupPanel.currentSpeaker = Math.max(0, groupPanel.activeChars.length - 1);
                }
                if (groupPanel.lastSpeaker === index) {
                    groupPanel.lastSpeaker = -1;
                } else if (groupPanel.lastSpeaker > index) {
                    groupPanel.lastSpeaker -= 1;
                }
                groupPanel.refresh();
                groupPanel.saveSettings?.();
            },


        },


        getCurrentSpeaker() {
            return this.activeChars[this.currentSpeaker];
        },

        triggerCurrentSpeaker() {
            KLITE_RPMod.log('group', 'Triggering current speaker via advanced handler');
            const speaker = this.getCurrentSpeaker();
            KLITE_RPMod.log('panels', `Triggering speaker: ${speaker?.name || 'none'} (index: ${this.currentSpeaker})`);

            if (!speaker) {
                // No speaker selected
                return;
            }

            // (Removed) pending speaker tracking; avatars now use Lite variables

            // Preserve Instruct mode (4); do not force Chat
            if (window.localsettings && window.localsettings.opmode === 4) {
                // Stay in Instruct mode
            }

            // Set the active speaker as the AI opponent for this turn
            try {
                if (window.localsettings && speaker?.name) {
                    window.localsettings.chatopponent = speaker.name;
                    window.save_settings?.();
                    window.handle_bot_name_onchange?.();
                }
                // Update AI avatar to speaker's best avatar if available
                try {
                    const best = KLITE_RPMod.getBestCharacterAvatar?.(speaker);
                    if (best) KLITE_RPMod.updateAIAvatar?.(best);
                } catch(_){}
            } catch(_) {}

            // Track last trigger time for talkative/weighted modes
            try {
                this.lastTriggerTime = this.lastTriggerTime || {};
                this.lastTriggerTime[this.currentSpeaker] = Date.now();
            } catch (_) {}

            // Seed first-turn context if absolutely empty to allow empty submit
            try {
                const noContext = Array.isArray(window.gametext_arr) && window.gametext_arr.length === 0 &&
                    (!window.current_memory || window.current_memory.trim() === '') &&
                    (!window.current_anote || window.current_anote.trim() === '');
                if (noContext) {
                    window.gametext_arr.push('');
                }
            } catch (_) {}

            // Do not override group participants list in host; keep chatopponent as full group.

            // Trigger generation in Lite. The whole dispatch is one context turn
            // (src/context): the speaker's card, the persona and the Worlds slice are
            // placed once, also when the call bypasses prepare_submit_generation.
            // If same speaker as last turn, prefer a fresh turn routine.
            getContext().run(() => {
                if (this.lastSpeaker === this.currentSpeaker && typeof window.submit_generation === 'function') {
                    window.submit_generation('');
                } else if (typeof window.chat_submit_generation === 'function') {
                    window.chat_submit_generation();
                } else if (typeof window.submit_generation === 'function') {
                    window.submit_generation('');
                } else if (typeof window.submit_generation_button === 'function') {
                    window.submit_generation_button();
                } else {
                    KLITE_RPMod.log('panels', 'Generation function unavailable');
                }
            });

            // Update Last marker and history entry
            try {
                const idx = this.currentSpeaker;
                this.lastSpeaker = idx;
                const chatDisplay = document.getElementById('chat-display');
                const scrollPos = typeof this._preTriggerScroll === 'number' ? this._preTriggerScroll : (chatDisplay ? chatDisplay.scrollTop : 0);
                this.addToSpeakerHistory(idx, { scrollPos });
                this.saveSettings?.();
            } catch (_) {}

            // Nothing to restore (we do not use groupchat_removals). chatopponent is kept as current speaker.
        },

        advanceSpeaker() {
            if (this.activeChars.length <= 1) return;

            const next = this.selectNextSpeaker(this.speakerMode, false);
            if (next !== null && typeof next === 'number') {
                this.currentSpeaker = next;
                this.refresh();
                KLITE_RPMod.log('panels', `Selected next speaker: ${this.getCurrentSpeaker()?.name}`);
            }
        },

        updateKoboldSettings() {
            // Intentionally do not write group opponents into chatopponent.
            // Group is managed as parallel 1:1 sessions; chatopponent is set per trigger.
            try { window.save_settings?.(); } catch(_) {}
        },




        showCustomCharacterModal(editChar = null) {
            const modal = document.createElement('div');
            modal.className = 'klite-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;';

            modal.innerHTML = `
                <div class="klite-modal-content" style="background: var(--bg2); border-radius: 8px; padding: 20px; max-width: 400px; border: 1px solid var(--border);">
                    <h3 style="margin-top: 0; color: var(--text);">${editChar ? 'Edit Custom Character' : 'Add Custom Character'}</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Name</label>
                        <input type="text" id="group-custom-char-name" placeholder="Character name" value="${editChar?.name || ''}"
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Talkativeness (1-100)</label>
                        <input type="number" id="group-custom-char-talkativeness" min="1" max="100" value="${editChar?.talkativeness || 50}" 
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Keywords (comma separated)</label>
                        <input type="text" id="group-custom-char-keywords" placeholder="keyword1, keyword2, keyword3" value="${editChar?.keywords ? editChar.keywords.join(', ') : ''}"
                            style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--muted); font-size: 12px;">Description</label>
                        <textarea id="group-custom-char-description" placeholder="Brief character description" 
                            style="width: 100%; height: 60px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 4px; resize: vertical;">${editChar?.description || ''}</textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="klite-btn klite-btn-primary" data-action="confirm-custom-character" ${editChar ? `data-edit-char-id="${editChar.id}"` : ''} style="flex: 1;">
                            ${editChar ? 'Update Character' : 'Add Character'}
                        </button>
                        <button class="klite-btn" data-action="close-group-char-modal" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.currentModal = modal;

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeCharacterModal();
                }
            });
        },


        confirmCharacterSelection() {
            const checkboxes = document.querySelectorAll('#group-character-selection-list input[type="checkbox"]:checked');

            // Track if group was empty before this confirmation
            this._wasEmptyBeforeAdd = (this.activeChars.length === 0);

            if (checkboxes.length === 0) {
                // No characters selected
                return;
            }

            let added = 0;
            const addedChars = [];
            checkboxes.forEach(checkbox => {
                const charId = checkbox.value; // Keep as string to handle both string and number IDs
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char && !this.activeChars.find(ac => ac.id == char.id)) {
                    // Mark CHARS characters as not custom
                    char.isCustom = false;
                    this.activeChars.push(char);

                    // Add character avatar to group avatars map
                    const av = char.avatar || char.image;
                    if (av) {
                        KLITE_RPMod.groupAvatars.set(char.id, av);
                    }

                    added++;
                    addedChars.push(char);
                }
            });

            // Persist and update UI/state
            try { this.saveSettings?.(); } catch(_) {}
            this.closeCharacterModal();
            this.refresh();
            // If Scenario panel is visible, refresh it to immediately reflect first group character
            try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}
            // Do not set multi-opponent; will set speaker name per trigger

            if (added > 0) {
                // If group was empty before and we have a first added character, prefill Scenario panel from it
                try {
                    if (typeof this._wasEmptyBeforeAdd === 'boolean' ? this._wasEmptyBeforeAdd : false) {
                        const first = addedChars[0];
                        if (first) KLITE_RPMod.populateScenarioFromCharacter(first);
                    }
                } catch(_) {}
            }
        },

        confirmCustomCharacter(editId = null) {
            const name = document.getElementById('group-custom-char-name')?.value;
            const talkativeness = parseInt(document.getElementById('group-custom-char-talkativeness')?.value) || 50;
            const keywords = document.getElementById('group-custom-char-keywords')?.value || '';
            const description = document.getElementById('group-custom-char-description')?.value || '';

            if (name) {
                if (editId) {
                    // Edit existing character
                    const charIndex = this.activeChars.findIndex(c => c.id === editId);
                    if (charIndex !== -1) {
                        this.activeChars[charIndex].name = name;
                        this.activeChars[charIndex].description = description;
                        this.activeChars[charIndex].talkativeness = talkativeness;
                        this.activeChars[charIndex].keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
                    }
                } else {
                    // Add new character
                    const char = {
                        id: 'custom-' + Date.now(),
                        name: name,
                        description: description,
                        talkativeness: talkativeness,
                        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
                        isCustom: true
                    };
                    this.activeChars.push(char);
                }
                this.closeCharacterModal();
                this.refresh();
                this.updateKoboldSettings();
                this.applyGroupToHost();
                // No memory appends; WI-based flow is used for character context
            }
        },

        closeCharacterModal() {
            if (this.currentModal) {
                try {
                    if (this.currentModal.parentNode) {
                        this.currentModal.parentNode.removeChild(this.currentModal);
                    }
                } catch (e) {
                    KLITE_RPMod.error('Error closing character modal:', e);
                }
                this.currentModal = null;
            }

            // Also clean up any stray modals
            const strayModals = document.querySelectorAll('.klite-modal');
            strayModals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });
        },


        selectByKeyword() {
            const lastMessage = window.gametext_arr?.[window.gametext_arr.length - 1] || '';
            const keywords = lastMessage.toLowerCase();

            // Check each character for keyword matches
            const matches = [];
            const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.activeChars.forEach((char, index) => {
                const charKeywords = char.keywords || [char.name.toLowerCase()];
                const score = charKeywords.reduce((total, keyword) => {
                    const safe = escapeRegExp(String(keyword).toLowerCase());
                    if (!safe) return total;
                    const regex = new RegExp('\\b' + safe + '\\b', 'gi');
                    return total + (keywords.match(regex) || []).length;
                }, 0);

                if (score > 0) {
                    matches.push({ index, score, name: char.name });
                }
            });

            if (matches.length > 0) {
                // Sort by score and return highest match
                matches.sort((a, b) => b.score - a.score);
                KLITE_RPMod.log('panels', `Keyword matches:`, matches);
                return matches[0].index;
            }

            // Fallback to round-robin if no keyword matches
            return (this.currentSpeaker + 1) % this.activeChars.length;
        },

        selectByTalkativeness() {
            const now = Date.now();
            const cooldownTime = 30000; // 30 seconds cooldown

            // Calculate weights based on talkativeness and cooldown
            const weights = this.activeChars.map((char, index) => {
                const baseTalkativeness = char.talkativeness || 50;
                const lastTrigger = this.lastTriggerTime[index] || 0;
                const timeSinceLastTrigger = now - lastTrigger;

                // Reduce weight if recently triggered
                let weight = baseTalkativeness;
                if (timeSinceLastTrigger < cooldownTime) {
                    const cooldownFactor = timeSinceLastTrigger / cooldownTime;
                    weight *= cooldownFactor;
                }

                return { index, weight, name: char.name };
            });

            // Weighted random selection
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
            if (totalWeight === 0) return 0;

            let random = Math.random() * totalWeight;
            for (const weight of weights) {
                random -= weight.weight;
                if (random <= 0) {
                    this.lastTriggerTime[weight.index] = now;
                    KLITE_RPMod.log('panels', `Talkativeness selection: ${weight.name} (weight: ${weight.weight.toFixed(1)})`);
                    return weight.index;
                }
            }

            return 0;
        },

        selectPartyRoundRobin() {
            // Everyone speaks once per round before anyone speaks again
            if (!this.partyRoundSpeakers) {
                this.partyRoundSpeakers = [...Array(this.activeChars.length).keys()];
                this.shuffleArray(this.partyRoundSpeakers);
            }

            if (this.partyRoundSpeakers.length === 0) {
                // Start new round
                this.partyRoundSpeakers = [...Array(this.activeChars.length).keys()];
                this.shuffleArray(this.partyRoundSpeakers);
            }

            return this.partyRoundSpeakers.pop();
        },

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        },

        addToSpeakerHistory(speakerIndex, meta = {}) {
            // Estimate a content index similar to Bookmarks/Index: use word count as proxy
            let approxWords = 0;
            try {
                approxWords = window.gametext_arr ? gametext_arr.join(' ').split(/\s+/).filter(w => w).length : 0;
            } catch (_) {}
            this.speakerHistory.push({
                index: speakerIndex,
                name: this.activeChars[speakerIndex]?.name,
                tokens: typeof meta.tokens === 'number' ? meta.tokens : approxWords,
                scrollPos: typeof meta.scrollPos === 'number' ? meta.scrollPos : 0,
            });

            // Keep only last 20 entries
            if (this.speakerHistory.length > 20) {
                this.speakerHistory = this.speakerHistory.slice(-20);
            }
        },

        gotoHistory(index) {
            const entry = this.speakerHistory[index];
            if (!entry) return;
            const cont = KLITE_RPMod.getChatScrollContainer?.();
            if (cont && typeof entry.scrollPos === 'number') {
                cont.scrollTop = entry.scrollPos;
            }
        },

        async loadSettings() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_group_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                // Backward compatibility: migrate numeric modes to string identifiers
                const mode = settings.speakerMode;
                if (typeof mode === 'number' || (typeof mode === 'string' && /^\d+$/.test(mode))) {
                    const map = {
                        1: 'manual',
                        2: 'round-robin',
                        3: 'random',
                        4: 'keyword',
                        5: 'talkative',
                        6: 'party'
                    };
                    this.speakerMode = map[parseInt(mode, 10)] || 'manual';
                } else {
                    this.speakerMode = mode || 'manual';
                }
                if (settings.autoResponses) {
                    Object.assign(this.autoResponses, settings.autoResponses);
                }
                if (typeof settings.currentSpeaker === 'number') {
                    this.currentSpeaker = settings.currentSpeaker;
                }
                if (typeof settings.lastSpeaker === 'number') {
                    this.lastSpeaker = settings.lastSpeaker;
                }
                if (typeof settings.enabled === 'boolean') {
                    this.enabled = settings.enabled;
                }
                if (Array.isArray(settings.participants)) {
                    this.activeChars = settings.participants.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        isCustom: !!c.isCustom,
                        talkativeness: typeof c.talkativeness === 'number' ? c.talkativeness : undefined,
                        keywords: Array.isArray(c.keywords) ? c.keywords : undefined
                    }));
                    // Do not update chatopponent here (managed per trigger)
                }
                // Restore history if present
                if (Array.isArray(settings.speakerHistory)) {
                    this.speakerHistory = settings.speakerHistory.slice(-20);
                }
                KLITE_RPMod.log('panels', `Loaded ROLES settings: speakerMode=${this.speakerMode}`);
            }
        },

        saveSettings() {
            const settings = {
                enabled: !!this.enabled,
                speakerMode: this.speakerMode,
                autoResponses: this.autoResponses,
                currentSpeaker: this.currentSpeaker,
                lastSpeaker: this.lastSpeaker,
                participants: Array.isArray(this.activeChars)
                    ? this.activeChars.map(c => ({
                        id: c.id,
                        name: c.name,
                        image: c.image,
                        isCustom: !!c.isCustom,
                        talkativeness: typeof c.talkativeness === 'number' ? c.talkativeness : undefined,
                        keywords: Array.isArray(c.keywords) ? c.keywords : undefined
                    }))
                    : [],
                speakerHistory: Array.isArray(this.speakerHistory) ? this.speakerHistory.slice(-20) : []
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_group_settings', JSON.stringify(settings));
            KLITE_RPMod.log('panels', `Saved ROLES settings: speakerMode=${this.speakerMode}`);
        },

        refresh() {
            // Re-render ROLES if it is currently visible on either logical side.
            // loadPanel('left', ...) maps to the active container in both full and panels-only modes.
            const leftActive = KLITE_RPMod.state?.tabs?.left === 'ROLES';
            const rightActive = KLITE_RPMod.state?.tabs?.right === 'ROLES';
            if (leftActive || rightActive) {
            KLITE_RPMod.loadPanel('right', 'ROLES');
            }
        }
    };

}
