// =============================================================================
// KLITE RPmod — Tools panel (KLITE_RPMod.panels.TOOLS): persona and AI character, rules, quick actions, chapters,
// narrator, auto sender; announces persona changes (`klite:persona-change`).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installToolsPanel(S) {
    const { t, LiteAPI } = S;
    // =============================================
    // 4. PANEL DEFINITIONS
    // =============================================  

    // TOOLS Panel (formerly PLAY_RP)
    KLITE_RPMod.panels.TOOLS = {
        // The AI's character (1:1 chat) / the user's persona — used by the selection dialogs
        // and by the RPmod character gallery (src/characters/gallery.js).
        useCharacter(char) {
            KLITE_RPMod.panels.TOOLS.selectedCharacter = char;
            KLITE_RPMod.panels.TOOLS.characterEnabled = true;
            // No longer append character data to memory; WI-based flow is used
            // Also prefill Create Scenario panel from this character (1:1 chat case)
            try { KLITE_RPMod.populateScenarioFromCharacter(char); } catch(_) {}
            // Apply character extras (avatar/name, context)
            KLITE_RPMod.panels.TOOLS.applyCharacterData(char);

            // Refresh currently active right panel (TOOLS/ROLES/SCENARIO) without switching
            const active = KLITE_RPMod.state?.tabs?.right;
            if (active === 'TOOLS' || active === 'ROLES' || active === 'SCENARIO') KLITE_RPMod.loadPanel('right', active);
            // Character application confirmed by UI state change
        },
        usePersona(char) {
            const tools = this;
            tools.selectedPersona = char;
            tools.personaEnabled = true;

            // No longer append persona data to memory; WI-based flow is used

            // Update user avatar with persona image if available (best-effort)
            try {
                if (typeof KLITE_RPMod.updateUserAvatar === 'function') {
                    KLITE_RPMod.updateUserAvatar(char?.avatar || char?.image || null);
                }
            } catch(_) {}

            // Update chatname to selected persona name
            try {
                if (window.localsettings && char?.name) {
                    window.localsettings.chatname = char.name;
                    window.save_settings?.();
                }
                const userNameInput = document.getElementById('rp-user-name');
                if (userNameInput && char?.name) userNameInput.value = char.name;
            } catch(_) {}

            // Update character context and persist selection
            tools.updateCharacterContext();
            try { tools.saveSettings?.(); } catch(_) {}

            // Refresh visible panel so tiles update immediately
            try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
            const active2 = KLITE_RPMod.state?.tabs?.right;
            if (active2 === 'TOOLS' || active2 === 'ROLES') KLITE_RPMod.loadPanel('right', active2);
        },

        rules: '',
        personaEnabled: false,
        characterEnabled: false,
        selectedPersona: null,
        selectedCharacter: null,
        storedModeBeforeEdit: null,
        // Moved from PLAY_ADV: quick actions config for top of panel
        quickActions: ['> Look Around', '> Search', '> Check Inventory', '> Rest', '> Continue'],
        // Moved from PLAY_STORY: bookmarks/chapters list
        chapters: [],
        autoSender: {
            enabled: false,
            interval: 30,
            message: 'Continue.',
            startMessage: '',
            quickMessages: ['', '', '', '', ''],
            currentCount: 0,
            timer: null,
            isPaused: false,
            isStarted: false
        },
        // Quick save slots removed in TOOLS

        // Ensure IMAGE panel exists for merged UI usage
        ensureImagePanel() {
            try {
                if (!KLITE_RPMod.panels.IMAGE) {
                    // Inline registration copied from loadPanel lazy init
                    KLITE_RPMod.panels.IMAGE = {
                        _syncTimer: null,
                        render() {
                            return `
                                ${t.section('🎨 Image Generation', `
                                    <div class="klite-image-status rpm-card rpm-mb">
                                        <div class="rpm-small rpm-mb"><strong>Image Generation Status</strong></div>
                                        <div class="rpm-small">
                                            <div><span class="rpm-text-muted">Provider:</span> <strong id="scene-mode-status">${KLITE_RPMod.escapeHtml(KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode))}</strong></div>
                                            <div><span class="rpm-text-muted">Model:</span> <strong id="scene-model-status">${KLITE_RPMod.escapeHtml((KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode) === 'AI Horde') ? (window.localsettings?.generate_images_model || 'Default') : '-')}</strong></div>
                                        </div>
                                    </div>
                                    <div class="klite-image-controls rpm-mb">
                                        <label class="rpm-label" for="scene-autogen">Auto-generate:</label>
                                        ${t.select('scene-autogen', [
                                            { value: '0', text: 'Off', selected: String(window.localsettings?.img_autogen_type ?? 0) === '0' },
                                            { value: '1', text: 'Basic', selected: String(window.localsettings?.img_autogen_type ?? 0) === '1' },
                                            { value: '2', text: 'Smart', selected: String(window.localsettings?.img_autogen_type ?? 0) === '2' }
                                        ])}
                                        <div class="rpm-mt">${t.checkbox('scene-detect', 'Detect ImgGen Instructions', !!(window.localsettings?.img_gen_from_instruct))}</div>
                                    </div>
                                    <div class="klite-image-generation-section">
                                        <div class="rpm-small rpm-mb"><strong>Scene & Characters</strong></div>
                                        <div class="rpm-grid2 rpm-mb">
                                            ${t.button('🏞️ Current Scene', 'rpm-sm', 'gen-scene')}
                                            ${t.button('🤖 AI Character', 'rpm-sm', 'gen-ai-portrait')}
                                            ${t.button('👤 Persona', 'rpm-sm', 'gen-user-portrait')}
                                            ${t.button('👥 Group Shot', 'rpm-sm', 'gen-group')}
                                        </div>
                                        <div class="rpm-small rpm-mb"><strong>Events & Actions</strong></div>
                                        <div class="rpm-grid2 rpm-mb">
                                            ${t.button('⚔️ Combat', 'rpm-sm', 'gen-combat')}
                                            ${t.button('💬 Dialogue', 'rpm-sm', 'gen-dialogue')}
                                            ${t.button('🎭 Plot', 'rpm-sm', 'gen-dramatic')}
                                            ${t.button('🌅 Atmosphere', 'rpm-sm', 'gen-atmosphere')}
                                        </div>
                                        <div class="rpm-small rpm-mb"><strong>Context-Based</strong></div>
                                        <div class="rpm-grid2">
                                            ${t.button('📝 Memory', 'rpm-sm', 'gen-memory')}
                                            ${t.button('📄 Last Message', 'rpm-sm', 'gen-last-message')}
                                            ${t.button('🔄 Recent Events', 'rpm-sm', 'gen-recent')}
                                            ${t.button('🎯 Custom', 'rpm-sm', 'gen-custom')}
                                        </div>
                                    </div>
                                `)}
                            `;
                        },
                        cleanup() {
                            if (this._syncTimer) {
                                clearInterval(this._syncTimer);
                                this._syncTimer = null;
                            }
                        },
                        init() {
                            // Wire up RPmod controls to host Esolite settings/controls
                            const sel = document.getElementById('scene-autogen');
                            const cb = document.getElementById('scene-detect');

                            const applyAutogenToHost = (val) => {
                                try { if (window.localsettings) window.localsettings.img_autogen_type = parseInt(val, 10) || 0; } catch(_) {}
                                try {
                                    const hostSel = document.getElementById('img_autogen_type');
                                    if (hostSel) hostSel.value = String(val);
                                } catch(_) {}
                            };
                            const applyDetectToHost = (checked) => {
                                try { if (window.localsettings) window.localsettings.img_gen_from_instruct = !!checked; } catch(_) {}
                                try {
                                    const hostCb = document.getElementById('img_gen_from_instruct');
                                    if (hostCb) hostCb.checked = !!checked;
                                } catch(_) {}
                            };

                            if (sel) {
                                const hostSel = document.getElementById('img_autogen_type');
                                const initVal = hostSel?.value ?? String(window.localsettings?.img_autogen_type ?? '0');
                                sel.value = String(initVal);
                                sel.addEventListener('change', () => applyAutogenToHost(sel.value));
                            }
                            if (cb) {
                                const hostCb = document.getElementById('img_gen_from_instruct');
                                const initChecked = (hostCb?.checked ?? !!window.localsettings?.img_gen_from_instruct);
                                cb.checked = !!initChecked;
                                cb.addEventListener('change', () => applyDetectToHost(cb.checked));
                            }

                            // Periodically sync status and reflect external changes
                            const updateStatus = () => {
                                try {
                                    const modeTxt = KLITE_RPMod.getGenerationMode(window.localsettings?.generate_images_mode);
                                    let modelTxt = '-';
                                    try {
                                        if (modeTxt === 'AI Horde') modelTxt = window.localsettings?.generate_images_model || 'Default';
                                    } catch(_) {}
                                    const mEl = document.getElementById('scene-mode-status');
                                    const mdlEl = document.getElementById('scene-model-status');
                                    if (mEl) mEl.textContent = modeTxt;
                                    if (mdlEl) mdlEl.textContent = modelTxt;
                                    // Keep controls synced with host if user changed them there
                                    try {
                                        const sel = document.getElementById('scene-autogen');
                                        const cb = document.getElementById('scene-detect');
                                        const hostSel = document.getElementById('img_autogen_type');
                                        const hostCb = document.getElementById('img_gen_from_instruct');
                                        if (sel && hostSel && sel.value !== String(hostSel.value)) sel.value = String(hostSel.value);
                                        if (cb && hostCb && cb.checked !== !!hostCb.checked) cb.checked = !!hostCb.checked;
                                    } catch(_) {}
                                } catch(_) {}
                            };
                            this._syncTimer = setInterval(updateStatus, 1000);
                            updateStatus();
                        },
                        isImageGenerationAvailable() {
                            if (!window.do_manual_gen_image || typeof window.do_manual_gen_image !== 'function') {
                                return { available: false, reason: 'Image generation function not available' };
                            }
                            if (window.localsettings?.image_generation_enabled === false) return { available: false, reason: 'Image generation disabled' };
                            return { available: true, provider: 'Host' };
                        },
                        generateImage(prompt) {
                            const status = this.isImageGenerationAvailable();
                            if (!status.available) return false;
                            try { window.do_manual_gen_image(prompt); KLITE_RPMod.log('image', `Image generation: ${prompt}`); return true; }
                            catch (e) { KLITE_RPMod.error('Image generation failed:', e); return false; }
                        },
                        actions: {
                            'gen-custom': () => {
                                const input = window.prompt('Enter an image prompt:');
                                const prompt = (input || '').trim();
                                if (!prompt) return;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-scene': () => {
                                try {
                                    const arr = Array.isArray(window.gametext_arr) ? window.gametext_arr : [];
                                    const recent = arr.slice(-3).join(' ').trim();
                                    const base = recent || (window.current_memory || '').trim();
                                    const excerpt = base ? base.substring(0, 250) : 'current story context';
                                    const prompt = `Illustrate the current scene: ${excerpt} — cinematic, detailed, cohesive style`;
                                    KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                                } catch (_) {
                                    KLITE_RPMod.panels.IMAGE.generateImage('Illustrate the current scene, cinematic, detailed, cohesive style');
                                }
                            },
                            'gen-ai-portrait': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const prompt = `Portrait of ${aiName}, detailed character art, high quality`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-user-portrait': () => {
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `Portrait of ${userName}, detailed character art, high quality`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-group': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `Group shot of ${userName} and ${aiName}, dynamic composition, detailed character art`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-combat': () => {
                                const location = document.getElementById('scene-location')?.value || 'battlefield';
                                const prompt = `Intense combat scene in ${location}, action scene, dynamic angles, dramatic lighting`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-dialogue': () => {
                                const aiName = (window.localsettings?.chatopponent || 'character').split('||$||')[0];
                                const userName = window.localsettings?.chatname || 'User';
                                const prompt = `${userName} and ${aiName} having an intimate conversation, emotional expressions`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-dramatic': () => {
                                const location = document.getElementById('scene-location')?.value || 'scene';
                                const mood = document.getElementById('scene-mood')?.value || 'dramatic';
                                const prompt = `Dramatic ${mood} moment in ${location}, cinematic composition, emotional intensity`;
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                            },
                            'gen-atmosphere': () => {
                                KLITE_RPMod.panels.IMAGE.generateImage('Atmospheric environmental scene, mood lighting, evocative ambience');
                            },
                            'gen-memory': () => {
                                const memoryText = window.current_memory || '';
                                const prompt = memoryText ? `Scene based on: ${memoryText.substring(0, 200)}...` : 'Scene based on current memory context';
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt + ', detailed illustration, narrative art');
                            },
                            'gen-last-message': () => {
                                const lastMessage = window.gametext_arr?.[window.gametext_arr.length - 1] || '';
                                const prompt = lastMessage ? `Scene depicting: ${lastMessage.substring(0, 200)}...` : 'Scene based on last message';
                                KLITE_RPMod.panels.IMAGE.generateImage(prompt + ', detailed illustration, story art');
                            },
                            'gen-recent': () => {
                                try {
                                    const arr = Array.isArray(window.gametext_arr) ? window.gametext_arr : [];
                                    const recent = arr.slice(-6).join(' ').trim();
                                    const excerpt = recent ? recent.substring(0, 400) : 'recent dialogue and narration';
                                    const prompt = `Key recent events: ${excerpt} — story illustration, cohesive multi-panel feel`;
                                    KLITE_RPMod.panels.IMAGE.generateImage(prompt);
                                } catch (_) {
                                    KLITE_RPMod.panels.IMAGE.generateImage('Illustrate recent events — story illustration, cohesive style');
                                }
                            }
                        }
                    };
                }
            } catch(_) {}
        },

        render() {
            return `
                <!-- Context Analyzer (moved from CONTEXT) -->
                ${t.section('🔍 Context Analyzer',
                `<div class="klite-token-bar">
                            <div id="tools-memory-bar" class="klite-token-segment klite-memory-segment" title="Memory"></div>
                            <div id="tools-wi-bar" class="klite-token-segment klite-wi-segment" title="Minimum WI (Always Active)"></div>
                            <div id="tools-story-bar" class="klite-token-segment klite-story-segment" title="Story"></div>
                            <div id="tools-anote-bar" class="klite-token-segment klite-anote-segment" title="Author's Note"></div>
                            <div id="tools-free-bar" class="klite-token-segment klite-free-segment" title="Free Space"></div>
                    </div>
                    <div class="klite-token-legend">
                        <div class="rpm-grid2">
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-memory-segment"></div>
                                <span class="klite-token-legend-label">Memory:</span>
                                <span id="tools-memory-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-wi-segment"></div>
                                <span class="klite-token-legend-label">min. WI:</span>
                                <span id="tools-wi-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-story-segment"></div>
                                <span class="klite-token-legend-label">Context History:</span>
                                <span id="tools-story-tokens" class="klite-token-legend-value">0</span>
                            </div>
                            <div class="klite-token-legend-item">
                                <div class="klite-token-legend-color klite-anote-segment"></div>
                                <span class="klite-token-legend-label">Author's Note:</span>
                                <span id="tools-anote-tokens" class="klite-token-legend-value">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="klite-context-summary klite-inset rpm-small">
                        <div>
                            <strong>Total Context:</strong> 
                            <span id="tools-total-context">0</span> / <span id="tools-max-context">8192</span> tokens
                        </div>
                        <div>
                            <span class="rpm-text-muted">Free:</span> 
                            <strong id="tools-free-tokens">8192</strong> tokens 
                            (<strong id="tools-free-percent">100</strong>%)
                        </div>
                        <div class="rpm-mt">
                            <button class="btn btn-primary rpm-btn rpm-block" data-action="calculate-context">Calculate Context</button>
                        </div>
                    </div>`
            )}
                <!-- Bookmarks / Index (hidden) -->
                

                <!-- Quick Actions: now the left dock's Quick replies (R6; migrated from rpmod_adv_actions) -->
                ${t.section('Quick Actions',
                `<div class="rpm-muted rpm-mb">Quick Actions are now <strong>Quick replies</strong> in the left panel: one click runs slash commands and sends a message. Your actions were copied there.</div>
                    <button class="btn btn-primary rpm-btn rpm-block" data-action="open-quick-replies">Open Quick replies</button>`
            )}


                

                <!-- Narrator Controls -->
                ${t.section('Narrator Controls',
                `<div class="klite-narrator-controls">
                        <div class="rpm-row">
                            ${t.select('narrator-style', [
                    { value: 'omniscient', text: 'Omniscient', selected: true },
                    { value: 'limited', text: 'Limited' },
                    { value: 'objective', text: 'Objective' },
                    { value: 'character', text: 'Character POV' }
                ])}
                        </div>
                        <div class="rpm-row rpm-mt">
                            ${t.select('narrator-focus', [
                    { value: 'environment', text: 'Environment' },
                    { value: 'emotions', text: 'Emotions' },
                    { value: 'action', text: 'Actions' },
                    { value: 'dialogue', text: 'Dialogue' },
                    { value: 'mixed', text: 'Mixed', selected: true }
                ])}
                        </div>
                        <div class="klite-narrator-explanation klite-inset rpm-muted rpm-mb">
                            <div id="narrator-explanation-text">
                                <strong>Omniscient:</strong> The narrator knows all characters' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.
                            </div>
                        </div>
                        <div class="rpm-muted">
                            The quality of the generated output depends highly on the model and it's capability to understand OOC instructions.
                        </div>
                        <div class="rpm-mt">
                            <button class="btn btn-primary rpm-btn rpm-lg rpm-block" data-action="narrator">
                                🎬 Trigger Narrator
                            </button>  
                        </div>
                    </div>`
            )}
                
                <!-- Quick Dice (moved from CONTEXT) -->
                ${t.section('🎲 Quick Dice',
                `<div class=\"rpm-grid4 rpm-mb\">\n\
                        ${['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d =>
                    `
                            <button class=\"btn btn-primary rpm-btn rpm-sm\" data-action=\"roll-${d}\">${d}</button>
                        `
                ).join('')}\n\
                    </div>
                    <div class=\"rpm-row\">\n\
                        ${t.input('tools-custom-dice', 'e.g., 2d6+3')}\n\
                        ${t.button('🎲 Roll', '', 'roll-custom')}\n\
                    </div>
                    <div id=\"tools-dice-result\" class=\"klite-dice-result rpm-mt\"></div>`
            )}

                
                <!-- Auto Sender -->
                ${t.section('Auto Sender',
                `<div class="klite-auto-sender">
                        ${this.renderAutoSender()}
                    </div>`
            )}
                
                ${KLITE_RPMod.panels.CONTEXT.render()}
                ${(() => { try { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); return KLITE_RPMod.panels.IMAGE.render(); } catch(_) { return ''; } })()}
                
            `;
        },

        // Trigger narrator by sending the selected narrator instruction like a Quick Action
        triggerNarrator() {
            const style = document.getElementById('narrator-style')?.value || 'omniscient';
            const focus = document.getElementById('narrator-focus')?.value || 'mixed';

            KLITE_RPMod.log('narrator', `Triggering narrator: ${style}/${focus}`);

            const narratorPrompts = {
                omniscient: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on environment and setting descriptions, providing rich sensory details about the surroundings, atmosphere, and physical spaces. Answer now for one reply as the omniscient narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on revealing inner thoughts, feelings, and emotional states of characters, providing deep psychological insights. Answer now for one reply as the omniscient narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on describing actions, events, and physical movements in detail. Answer now for one reply as the omniscient narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator focuses on dialogue and conversation, providing context and subtext to spoken words. Answer now for one reply as the omniscient narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the omniscient narrator. The omniscient narrator knows all characters\' thoughts and can see everything happening in the scene. This narrator provides a balanced narrative covering environment, emotions, actions, and dialogue as appropriate. Answer now for one reply as the omniscient narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                limited: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on environment from one perspective, describing only what that character would notice about their surroundings. Answer now for one reply as the limited narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on one perspective and hints at emotions rather than revealing them directly. Answer now for one reply as the limited narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on actions and events from one character\'s perspective only. Answer now for one reply as the limited narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator focuses on dialogue from one character\'s perspective, including what they hear and their reactions. Answer now for one reply as the limited narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the limited narrator. The limited narrator can only describe what a specific character can see and experience. This narrator provides a balanced but limited perspective covering what one character would experience. Answer now for one reply as the limited narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                objective: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on environmental details in a detached, observational manner. Answer now for one reply as the objective narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator can only describe observable emotional expressions and reactions, not internal feelings. Answer now for one reply as the objective narrator focused on observable emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on documenting actions and movements in a factual manner. Answer now for one reply as the objective narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator focuses on reporting dialogue and verbal exchanges without interpretation. Answer now for one reply as the objective narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate the objective narrator. The objective narrator observes without bias and reports only what can be seen and heard, like a camera. This narrator provides balanced objective observation of the scene. Answer now for one reply as the objective narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                },
                character: {
                    environment: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on environment as seen through the character\'s eyes and experiences. Answer now for one reply as the character POV narrator focused on environment, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    emotions: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on the character\'s internal emotional state and reactions. Answer now for one reply as the character POV narrator focused on emotions, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    action: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on actions and events as experienced by the character. Answer now for one reply as the character POV narrator focused on action, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    dialogue: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator focuses on dialogue and conversations from the character\'s perspective. Answer now for one reply as the character POV narrator focused on dialogue, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]',
                    mixed: '[System Instruction: Switch out of character(OOC) now and as the AI impersonate a character POV narrator. This narrator tells the story from a specific character\'s point of view, using their voice and perspective. This narrator provides a balanced character-centered narrative. Answer now for one reply as the character POV narrator with mixed focus, afterwards switch back into character and continue the scene as if this system instruction didn\'t happen.]'
                }
            };

            const instruction = narratorPrompts[style]?.[focus] || narratorPrompts.omniscient.mixed;
            if (instruction && instruction.trim()) {
                const preview = instruction.length>800 ? (instruction.slice(0,800)+'…') : instruction;
                KLITE_RPMod.log('narrator', 'Narration prompt prepared', { length: instruction.length, preview });
                KLITE_RPMod.log('narrator', 'Narration request sent');
                this.sendTextToEsolite(instruction);
            }
        },

        async init() {
            await this.setupAutoSave();
            await this.loadSettings();
            this.setupCharacterIntegration();
            await this.setupAutoSender();
            // Initialize moved features (no quick save slots in TOOLS)
            await this.loadQuickActions();
            this.initQuickActions();
            await this.loadChapters();
            this.updateTimeline();
            // Initialize merged sections so their controls bind
            try { KLITE_RPMod.panels.CONTEXT?.init?.(); } catch(_) {}
            try { this.ensureImagePanel(); KLITE_RPMod.panels.IMAGE?.init?.(); } catch(_) {}
        },



        actions: {
            'skip-time': () => KLITE_RPMod.panels.TOOLS.skipTime(),
            'edit-last': () => KLITE_RPMod.panels.TOOLS.editLast(),
            'delete-last': () => KLITE_RPMod.panels.TOOLS.deleteLast(),
            'regenerate': () => KLITE_RPMod.panels.TOOLS.regenerate(),
            'undo': () => KLITE_RPMod.panels.TOOLS.undo(),
            'redo': () => KLITE_RPMod.panels.TOOLS.redo(),
            'preset-precise': () => KLITE_RPMod.generationControl.applyPreset('precise'),
            'preset-koboldai': () => KLITE_RPMod.generationControl.applyPreset('koboldai'),
            'preset-creative': () => KLITE_RPMod.generationControl.applyPreset('creative'),
            'preset-chaotic': () => KLITE_RPMod.generationControl.applyPreset('chaotic'),
            'auto-start': () => KLITE_RPMod.panels.TOOLS.handleAutoStart(),
            'auto-pause': () => KLITE_RPMod.panels.TOOLS.handleAutoPause(),
            'auto-continue': () => KLITE_RPMod.panels.TOOLS.handleAutoContinue(),
            'auto-stop': () => KLITE_RPMod.panels.TOOLS.handleAutoStop(),
            'auto-reset': () => KLITE_RPMod.panels.TOOLS.handleAutoReset(),
            'quick-send-1': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(1),
            'quick-send-2': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(2),
            'quick-send-3': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(3),
            'quick-send-4': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(4),
            'quick-send-5': () => KLITE_RPMod.panels.TOOLS.handleQuickSend(5),

            // Trigger narrator
            'narrator': () => KLITE_RPMod.panels.TOOLS.triggerNarrator(),

            'open-quick-replies': () => { try { window.KLITE_RPMod_Shell?.open('quick-replies'); } catch (_) {} },
            // Quick Actions (from ADV)
            'quick-0': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(0),
            'quick-1': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(1),
            'quick-2': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(2),
            'quick-3': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(3),
            'quick-4': () => KLITE_RPMod.panels.TOOLS.sendQuickAction(4),

            // Bookmarks/Chapters (from STORY)
            'add-chapter': () => KLITE_RPMod.panels.TOOLS.addChapter(),
            'delete-chapters': () => KLITE_RPMod.panels.TOOLS.deleteAllChapters(),
            'goto-chapter': (e) => {
                const chapterIndex = parseInt(e.target.closest('[data-chapter]').dataset.chapter);
                KLITE_RPMod.panels.TOOLS.goToChapter(chapterIndex);
            },

            // Save/Load slot actions removed from PLAY_RP

            // Character Integration actions
            'apply-persona': () => KLITE_RPMod.panels.TOOLS.applyPersona(),
            'apply-character': () => KLITE_RPMod.panels.TOOLS.applyCharacter(),
            'select-character': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => KLITE_RPMod.panels.TOOLS.useCharacter(char));
            },
            'select-persona': () => {
                KLITE_RPMod.showUnifiedCharacterModal('single-select', (char) => KLITE_RPMod.panels.TOOLS.usePersona(char));
            },
            'remove-persona': () => KLITE_RPMod.panels.TOOLS.removePersona(),
            'remove-character': () => KLITE_RPMod.panels.TOOLS.removeCharacter(),
            // Quick Dice actions relocated here (panel now TOOLS)
            'roll-d2': () => KLITE_RPMod.panels.CONTEXT.rollDice('d2'),
            'roll-d4': () => KLITE_RPMod.panels.CONTEXT.rollDice('d4'),
            'roll-d6': () => KLITE_RPMod.panels.CONTEXT.rollDice('d6'),
            'roll-d8': () => KLITE_RPMod.panels.CONTEXT.rollDice('d8'),
            'roll-d10': () => KLITE_RPMod.panels.CONTEXT.rollDice('d10'),
            'roll-d12': () => KLITE_RPMod.panels.CONTEXT.rollDice('d12'),
            'roll-d20': () => KLITE_RPMod.panels.CONTEXT.rollDice('d20'),
            'roll-d100': () => KLITE_RPMod.panels.CONTEXT.rollDice('d100'),
            'roll-custom': () => {
                const input = document.getElementById('tools-custom-dice');
                if (input?.value) { KLITE_RPMod.panels.CONTEXT.rollDice(input.value); }
            },

            // Forward CONTEXT actions in merged panel
            'generate-memory': () => KLITE_RPMod.panels.CONTEXT.generateMemory(),
            'apply-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(false),
            'append-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(true),
            'export-markdown': () => KLITE_RPMod.panels.CONTEXT.exportAs('markdown'),
            'export-json': () => KLITE_RPMod.panels.CONTEXT.exportAs('json'),
            'export-html': () => KLITE_RPMod.panels.CONTEXT.exportAs('html'),
            'calculate-context': () => KLITE_RPMod.panels.CONTEXT.analyzeContext(),

            // Forward IMAGE actions in merged panel (ensure panel exists first)
            'gen-custom': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-custom']?.(); },
            'gen-scene': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-scene']?.(); },
            'gen-ai-portrait': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-ai-portrait']?.(); },
            'gen-user-portrait': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-user-portrait']?.(); },
            'gen-group': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-group']?.(); },
            'gen-combat': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-combat']?.(); },
            'gen-dialogue': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-dialogue']?.(); },
            'gen-dramatic': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-dramatic']?.(); },
            'gen-atmosphere': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-atmosphere']?.(); },
            'gen-memory': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-memory']?.(); },
            'gen-last-message': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-last-message']?.(); },
            'gen-recent': () => { KLITE_RPMod.panels.TOOLS.ensureImagePanel(); KLITE_RPMod.panels.IMAGE.actions['gen-recent']?.(); }
        },



        renderPersonaControls() {
            const userName = window.localsettings?.chatname || 'User';
            return `
                <div class="klite-persona-section klite-box rpm-mb">
                    <div class="rpm-stack">
                        <label class="rpm-label" for="rp-user-name">Username (for the human player):</label>
                        ${t.input('rp-user-name', '', 'text', KLITE_RPMod.escapeHtml(userName))}
                        ${t.checkbox('persona-enabled', 'Enable User Character', this.personaEnabled)}
                        <div class="persona-controls ${this.personaEnabled ? '' : 'klite-disabled'}">
                            ${this.selectedPersona ? this.renderActivePersona() : this.renderSelectPersonaButton()}
                        </div>
                    </div>
                </div>
            `;
        },

        renderSelectPersonaButton() {
            return `
                <div class="rpm-empty">
                    <button class="btn btn-primary rpm-btn rpm-lg" data-action="select-persona">
                        📋 Select Character
                    </button>
                    <div class="rpm-muted rpm-mt">
                        Choose a character for the user to roleplay
                    </div>
                </div>
            `;
        },

        renderActivePersona() {
            const char = this.selectedPersona;
            const avatar = KLITE_RPMod.getBestCharacterAvatar(char);
            const isWIChar = char.type === 'worldinfo';

            return `
                <div class="klite-item-row klite-is-next">
                    <div class="rpm-avatar">
                        ${avatar ? KLITE_RPMod.safeImageHTML(avatar, char.name || '', 'width:100%;height:100%;object-fit:cover;display:block;')
                                 : `<span>${KLITE_RPMod.escapeHtml((char.name || '?').charAt(0))}</span>`}
                    </div>
                    <div class="rpm-grow">
                        <strong>${KLITE_RPMod.escapeHtml(char.name)}</strong>
                        ${isWIChar ? '<span class="rpm-tag">WI</span>' : ''}
                    </div>
                    <button class="btn btn-primary rpm-btn" data-action="remove-persona">
                        ✕ Remove
                    </button>
                </div>
                <div class="rpm-fill">
                    <button class="btn btn-primary rpm-btn" data-action="select-persona">
                        📋 Change Character
                    </button>
                </div>
            `;
        },

        renderCharacterControls() {
            const aiName = window.localsettings?.chatopponent || 'AI';
            const isGroupChatActive = KLITE_RPMod.panels.ROLES?.enabled || false;
            const isEsolite = !!(document.getElementById('topbtn_data_manager') || document.getElementById('openTreeDiagram') || document.getElementById('topbtn_remote_mods'));
            const policy = KLITE_RPMod.state?.avatarPolicy || { esoliteAdapter:false, liteExperimental:false };
            const adapterStatus = isEsolite ? 'Esolite (active)' : (policy.liteExperimental ? 'Lite Experimental (active)' : 'Off');

            return `
                <div class="klite-character-section klite-box">
                    ${isGroupChatActive ? `<div class="rpm-note rpm-mb">
                        <strong>Note:</strong> Character integration is disabled when Group Chat is active.
                    </div>` : ''}
                    <div class="rpm-stack">
                        <label class="rpm-label" for="rp-ai-name">Charactername (for the AI):</label>
                        <input type="text" id="rp-ai-name" class="form-control rpm-input" value="${KLITE_RPMod.escapeHtml(aiName)}" ${isGroupChatActive ? 'readonly disabled' : ''}>
                        <div class="${isGroupChatActive ? 'klite-disabled' : ''}">
                            ${t.checkbox('character-enabled', 'Enable AI Character', isGroupChatActive ? false : this.characterEnabled)}
                        </div>
                        <div class="character-controls ${this.characterEnabled && !isGroupChatActive ? '' : 'klite-disabled'}">
                            ${this.selectedCharacter ? this.renderActiveCharacter() : this.renderSelectCharacterButton()}
                        </div>
                    </div>
                </div>
            `;
        },

        renderSelectCharacterButton() {
            return `
                <div class="rpm-empty">
                    <button class="btn btn-primary rpm-btn rpm-lg" data-action="select-character">
                        📋 Select Character
                    </button>
                    <div class="rpm-muted rpm-mt">
                        Choose from your character library or World Info
                    </div>
                </div>
            `;
        },

        renderActiveCharacter() {
            const char = this.selectedCharacter;
            const avatar = KLITE_RPMod.getBestCharacterAvatar(char);
            const isWIChar = char.type === 'worldinfo';

            return `
                <div class="klite-item-row klite-is-ai">
                    <div class="rpm-avatar">
                        ${avatar ? KLITE_RPMod.safeImageHTML(avatar, char.name || '', 'width:100%;height:100%;object-fit:cover;display:block;')
                                 : `<span>${KLITE_RPMod.escapeHtml((char.name || '?').charAt(0))}</span>`}
                    </div>
                    <div class="rpm-grow">
                        <strong>${KLITE_RPMod.escapeHtml(char.name)}</strong>
                        ${isWIChar ? '<span class="rpm-tag">WI</span>' : ''}
                    </div>
                    <button class="btn btn-primary rpm-btn" data-action="remove-character">
                        ✕ Remove
                    </button>
                </div>
                <div class="rpm-fill">
                    <button class="btn btn-primary rpm-btn" data-action="select-character">
                        📋 Change Character
                    </button>
                </div>
            `;
        },

        renderAutoSender() {
            return `
                <div class="klite-auto-sender-wrapper">
                    <div class="klite-auto-sender-controls rpm-row rpm-mb">
                        <div class="klite-auto-sender-buttons rpm-wrap rpm-grow">
                            ${t.button('Start', 'rpm-sm', 'auto-start', 'auto-start-btn')}
                            ${t.button('Pause', 'rpm-sm', 'auto-pause', 'auto-pause-btn', 'display: none;')}
                            ${t.button('Continue', 'rpm-sm', 'auto-continue', 'auto-continue-btn', 'display: none;')}
                        </div>
                        <div id="auto-countdown" class="klite-auto-countdown">--</div>
                    </div>
                    <div class="klite-auto-sender-buttons rpm-grid2">
                        ${t.button('Stop', 'rpm-sm', 'auto-stop')}
                        ${t.button('Reset', 'rpm-sm', 'auto-reset')}
                    </div>
                    <div class="klite-auto-sender-interval">
                        <label class="rpm-label" for="auto-interval-slider">Interval: <span id="auto-interval-display">30</span> seconds</label>
                        <input type="range" min="10" max="300" value="30" step="5" class="klite-slider" id="auto-interval-slider">
                    </div>
                    <div class="klite-auto-sender-start-message">
                        <label class="rpm-label" for="auto-start-message">Start Message:</label>
                        <textarea id="auto-start-message" class="form-control rpm-input" placeholder="Start Message (optional)"></textarea>
                    </div>
                    <div class="klite-auto-sender-auto-message">
                        <label class="rpm-label" for="auto-message">Automatic Message:</label>
                        <textarea id="auto-message" class="form-control rpm-input" placeholder="Automatic Message">Continue.</textarea>
                    </div>
                    <div class="klite-auto-sender-quick-messages">
                        <label class="rpm-label">Quick Slot Messages:</label>
                        <div class="klite-quick-messages-grid klite-slots">
                            ${[1, 2, 3, 4, 5].map(i => `
                                <div class="klite-quick-message-row rpm-row">
                                    <input type="text" id="auto-quick-${i}" class="form-control rpm-input rpm-grow" placeholder="Quick Message ${i}">
                                    ${t.button(i.toString(), 'rpm-sm klite-slot-btn', `quick-send-${i}`)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        },

        async loadRules() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_rp_rules');
            if (saved) {
                this.rules = saved;
                KLITE_RPMod.log('panels', 'RP rules loaded from storage');
            }
        },

        async loadSettings() {
            try {
                const raw = await KLITE_RPMod.loadFromLiteStorage('rpmod_playrp_settings');
                if (raw && raw !== 'offload_to_indexeddb') {
                    const s = JSON.parse(raw);
                    this.rules = typeof s.rules === 'string' ? s.rules : this.rules;
                    this.selectedCharacter = s.selectedCharacter || this.selectedCharacter;
                    this.characterEnabled = !!s.characterEnabled;
                    this.selectedPersona = s.selectedPersona || this.selectedPersona;
                    this.personaEnabled = !!s.personaEnabled;
                    if (s.autoSender) this.autoSender = { ...this.autoSender, ...s.autoSender };
                    KLITE_RPMod.log('panels', 'TOOLS (RP) settings loaded');
                }
            } catch (e) { KLITE_RPMod.error('Failed to load TOOLS (RP) settings', e); }
        },

        saveSettings() {
            try {
                const s = {
                    rules: this.rules || '',
                    selectedCharacter: this.selectedCharacter || null,
                    characterEnabled: !!this.characterEnabled,
                    selectedPersona: this.selectedPersona || null,
                    personaEnabled: !!this.personaEnabled,
                    autoSender: this.autoSender ? { enabled: !!this.autoSender.enabled, interval: this.autoSender.interval, message: this.autoSender.message } : null
                };
                KLITE_RPMod.saveToLiteStorage('rpmod_playrp_settings', JSON.stringify(s));
                KLITE_RPMod.log('panels', 'TOOLS (RP) settings saved');
            } catch (e) { KLITE_RPMod.error('Failed to save TOOLS (RP) settings', e); }
        },

        saveRules() {
            KLITE_RPMod.saveToLiteStorage('rpmod_rp_rules', this.rules);
            KLITE_RPMod.log('panels', 'RP rules saved to storage');
        },

        async setupAutoSave() {
            let saveTimer = null;
            const textarea = document.getElementById('rp-rules');
            // autosave checkbox was part of removed quick save section; guard for null
            const autosave = document.getElementById('rp-autosave');

            if (textarea) {
                // Load existing rules into textarea
                await this.loadRules();
                textarea.value = this.rules;

                textarea.addEventListener('input', () => {
                    if (autosave?.checked) {
                        clearTimeout(saveTimer);
                        saveTimer = setTimeout(() => {
                            this.rules = textarea.value;
                            this.saveRules();
                            KLITE_RPMod.log('panels', 'RP rules auto-saved');
                        }, 1000);
                    }
                });
            }

            // Name inputs
            document.getElementById('rp-user-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatname = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `User name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            document.getElementById('rp-ai-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatopponent = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `AI name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            // Periodic autosave guard when enabled and not generating
            try {
                if (this._autosaveGuard) clearInterval(this._autosaveGuard);
                const isGenerating = () => {
                    try { return (window.pending_response_id && window.pending_response_id !== '') || (typeof window.synchro_pending_stream !== 'undefined' && window.synchro_pending_stream !== ''); } catch (_) { return false; }
                };
                this._autosaveGuard = setInterval(() => {
                    const enabled = document.getElementById('rp-autosave')?.checked;
                    if (!enabled) return;
                    if (isGenerating()) return;
                    try { window.autosave?.(); } catch (_) {}
                }, 60000);
            } catch (_) {}
        },

        applyPreset(preset) {
            KLITE_RPMod.log('panels', `Applying RP preset: ${preset}`);

            const presets = {
                precise: { creativity: 20, focus: 20, repetition: 80 },
                koboldai: { creativity: 16, focus: 100, repetition: 19 },
                creative: { creativity: 80, focus: 60, repetition: 40 },
                chaotic: { creativity: 95, focus: 90, repetition: 10 }
            };

            const settings = presets[preset];
            if (settings) {
                // Update sliders with correct IDs and trigger their change events
                Object.entries(settings).forEach(([key, value]) => {
                    const sliderId = `rp-${key}-slider`;  // Use correct slider IDs
                    const slider = document.getElementById(sliderId);
                    if (slider) {
                        slider.value = value;
                        // Use shared methods
                        KLITE_RPMod.updateSettingsFromSlider(key, value);
                        KLITE_RPMod.updateSliderDisplays(key, value, 'rp');
                    }
                });

                // Update active button
                document.querySelectorAll('[data-action^="preset-"]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.action === `preset-${preset}`);
                });

                // Save settings
                window.save_settings?.();
                // Preset application confirmed by UI changes
            }
        },

        setupCharacterIntegration() {
            // Persona toggle
            document.getElementById('persona-enabled')?.addEventListener('change', e => {
                this.personaEnabled = e.target.checked;
                const controls = document.querySelector('.persona-controls');
                if (controls) {
                    controls.classList.toggle('klite-disabled', !e.target.checked);
                }
                this.updateCharacterContext();
            });

            // Character toggle
            document.getElementById('character-enabled')?.addEventListener('change', e => {
                this.characterEnabled = e.target.checked;
                const controls = document.querySelector('.character-controls');
                if (controls) {
                    controls.classList.toggle('klite-disabled', !e.target.checked);
                }
                this.updateCharacterContext();
            });

            // Name inputs (bind here so they work when controls are rendered in ROLES)
            document.getElementById('rp-user-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatname = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `User name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            document.getElementById('rp-ai-name')?.addEventListener('change', e => {
                if (window.localsettings) {
                    localsettings.chatopponent = e.target.value;
                    window.save_settings?.();
                    KLITE_RPMod.log('panels', `AI name changed to: ${e.target.value}`);
                }
                try { KLITE_RPMod.panels.TOOLS.saveSettings?.(); } catch (_) {}
            });

            // Lite avatars experimental toggle
            document.getElementById('lite-avatars-experimental')?.addEventListener('change', e => {
                try { KLITE_RPMod.enableLiteAvatarsExperimental(!!e.target.checked); } catch(_){}
                // Re-render to reflect status
                const left = KLITE_RPMod.state?.tabs?.left;
                if (left === 'TOOLS' || left === 'ROLES') KLITE_RPMod.loadPanel('left', left);
            });

            // Character integration now uses unified modal system

            // WI integration now handled by unified modal system


            // Narrator style explanations
            const narratorStyleSelect = document.getElementById('narrator-style');
            const narratorExplanation = document.getElementById('narrator-explanation-text');

            if (narratorStyleSelect && narratorExplanation) {
                narratorStyleSelect.addEventListener('change', e => {
                    this.updateNarratorExplanation(e.target.value);
                });

                // Initialize with current value
                this.updateNarratorExplanation(narratorStyleSelect.value);
            }
        },

        async setupAutoSender() {
            // Load settings from storage first
            await this.loadAutoSenderSettings();

            // Initialize Auto Sender controls
            this.countdownEl = document.getElementById('auto-countdown');

            // Apply loaded settings to UI
            this.initAutoSenderUI();

            // Setup interval slider
            const intervalSlider = document.getElementById('auto-interval-slider');
            const intervalDisplay = document.getElementById('auto-interval-display');

            if (intervalSlider) {
                intervalSlider.addEventListener('input', e => {
                    const value = parseInt(e.target.value);
                    this.autoSender.interval = value;
                    if (intervalDisplay) intervalDisplay.textContent = value;
                    this.saveAutoSenderSettings();
                });
            }

            // Setup message inputs
            const startMessageEl = document.getElementById('auto-start-message');
            const autoMessageEl = document.getElementById('auto-message');

            if (startMessageEl) {
                startMessageEl.addEventListener('input', e => {
                    this.autoSender.startMessage = e.target.value;
                    this.saveAutoSenderSettings();
                });
            }

            if (autoMessageEl) {
                autoMessageEl.addEventListener('input', e => {
                    this.autoSender.message = e.target.value || 'Continue.';
                    this.saveAutoSenderSettings();
                });
            }

            // Setup quick message inputs
            for (let i = 1; i <= 5; i++) {
                const quickInput = document.getElementById(`auto-quick-${i}`);
                if (quickInput) {
                    quickInput.addEventListener('input', e => {
                        this.autoSender.quickMessages[i - 1] = e.target.value;
                        this.saveAutoSenderSettings();
                    });
                }
            }
        },

        handleAutoStart() {
            // Start always resets and starts fresh
            this.autoSender.currentCount = 0;
            this.autoSender.isStarted = true;
            this.autoSender.isPaused = false;

            // Send start message instantly if available
            const startMessage = document.getElementById('auto-start-message')?.value;
            if (startMessage && startMessage.trim()) {
                this.sendMessage(startMessage);
            }

            this.updateAutoButtons('running');
            this.startAutomaticTimer();
            KLITE_RPMod.log('panels', 'Auto sender started - reset and countdown begun');
        },

        handleAutoPause() {
            this.autoSender.isPaused = true;
            // Keep timer running but in paused state - count preserved
            this.updateAutoButtons('paused');
            KLITE_RPMod.log('panels', `Auto sender paused - keeping count at ${this.autoSender.currentCount}`);
        },

        handleAutoContinue() {
            if (!this.autoSender.isStarted) {
                // Starting without start message - just begin countdown
                this.autoSender.isStarted = true;
                this.autoSender.currentCount = 0;
                this.startAutomaticTimer();
            }
            this.autoSender.isPaused = false;
            this.updateAutoButtons('running');
            KLITE_RPMod.log('panels', 'Auto sender continued - resuming from current count');
        },

        handleAutoStop() {
            // Stop interval and abort any pending generation
            clearInterval(this.autoSender.timer);
            this.autoSender.timer = null;
            this.autoSender.isPaused = true;
            this.autoSender.currentCount = 0; // Reset interval count

            // Abort any pending generation
            if (window.abort_generation) {
                window.abort_generation();
            }

            this.updateAutoButtons('stopped');
            if (this.countdownEl) {
                this.countdownEl.textContent = '--';
                this.countdownEl.style.setProperty('--klite-progress', '0%');
            }
            KLITE_RPMod.log('panels', 'Auto sender stopped - aborted generation and reset interval');
        },

        handleAutoReset() {
            // Complete reset of Auto Sender
            this.autoSender.isStarted = false;
            this.autoSender.isPaused = false;
            this.autoSender.currentCount = 0;
            clearInterval(this.autoSender.timer);
            this.autoSender.timer = null;

            // Reset UI
            this.updateAutoButtons('reset');
            if (this.countdownEl) {
                this.countdownEl.textContent = '--';
                this.countdownEl.style.setProperty('--klite-progress', '0%');
            }
            KLITE_RPMod.log('panels', 'Auto sender completely reset');
        },

        handleQuickSend(slot) {
            const qm = this.autoSender.quickMessages[slot - 1];
            if (qm && qm.trim()) {
                this.sendQuickMessage(qm);
                KLITE_RPMod.log('panels', `Quick message ${slot} sent: ${qm}`);
                return;
            }
            // Fallback to Quick Actions if slot empty
            const idx = slot - 1;
            const action = this.quickActions[idx];
            if (action && action.trim()) {
                this.sendTextToEsolite(action);
                KLITE_RPMod.log('panels', `Fallback quick action ${slot} sent: ${action}`);
            }
        },

        startAutomaticTimer() {
            clearInterval(this.autoSender.timer);

            if (this.countdownEl && this.autoSender.isStarted && !this.autoSender.isPaused) {
                const remaining = this.autoSender.interval - this.autoSender.currentCount;
                this.countdownEl.textContent = remaining;
            }

            this.autoSender.timer = setInterval(() => {
                if (!this.autoSender.isPaused && this.autoSender.isStarted) {
                    this.autoSender.currentCount++;

                    if (this.autoSender.currentCount >= this.autoSender.interval) {
                        this.autoSender.currentCount = 0;
                        this.sendMessage(this.autoSender.message);
                    }

                    if (this.countdownEl) {
                        const remaining = this.autoSender.interval - this.autoSender.currentCount;
                        const progress = (this.autoSender.currentCount / this.autoSender.interval) * 100;

                        this.countdownEl.textContent = remaining;
                        this.countdownEl.style.setProperty('--klite-progress', `${progress}%`);   // data-driven
                    }
                }
            }, 1000);
        },

        updateAutoButtons(state) {
            const startBtn = document.getElementById('auto-start-btn');
            const pauseBtn = document.getElementById('auto-pause-btn');
            const continueBtn = document.getElementById('auto-continue-btn');

            switch (state) {
                case 'running':
                    if (startBtn) startBtn.hidden = true;
                    if (pauseBtn) pauseBtn.hidden = false;
                    if (continueBtn) continueBtn.hidden = true;
                    break;
                case 'paused':
                    if (startBtn) startBtn.hidden = true;
                    if (pauseBtn) pauseBtn.hidden = true;
                    if (continueBtn) continueBtn.hidden = false;
                    break;
                case 'stopped':
                    if (startBtn) {
                        startBtn.textContent = 'Continue';
                        startBtn.hidden = false;
                    }
                    if (pauseBtn) pauseBtn.hidden = true;
                    if (continueBtn) continueBtn.hidden = true;
                    break;
                case 'reset':
                    if (startBtn) {
                        startBtn.textContent = 'Start';
                        startBtn.hidden = false;
                    }
                    if (pauseBtn) pauseBtn.hidden = true;
                    if (continueBtn) continueBtn.hidden = false;
                    break;
            }
        },

        // Unified sender for Auto Sender and helpers
        sendMessage(message) {
            if (!message || !message.trim()) {
                KLITE_RPMod.log('panels', 'Auto sender: Empty message, skipping');
                return;
            }

            if (KLITE_RPMod.state.generating) {
                KLITE_RPMod.log('panels', 'Auto sender: Generation in progress, skipping');
                return;
            }

            // Add context from rules if available
            let contextMessage = message.trim();
            if (this.rules) {
                contextMessage = this.rules + '\n\n' + contextMessage;
            }
            // Route to correct Esobold input and submit
            this.sendTextToEsolite(contextMessage);
        },

        // Low-level sender that targets Esobold/Lite inputs directly
        sendTextToEsolite(text) {
            try {
                const mode = window.localsettings?.opmode || 3;
                const preview = (text||'').length>800? (text.slice(0,800)+'…') : (text||'');
                KLITE_RPMod.log('chat', 'sendTextToEsolite()', { mode, length: (text||'').length, preview });
                if (mode === 3) {
                    // Chat mode: prefer chat inputs
                    const chatInputs = [
                        document.getElementById('cht_inp'),
                        document.getElementById('corpo_cht_inp')
                    ].filter(Boolean);
                    if (chatInputs.length) {
                        chatInputs[0].value = text;
                        if (typeof window.chat_submit_generation === 'function') {
                            KLITE_RPMod.log('chat', 'Calling chat_submit_generation()');
                            return window.chat_submit_generation();
                        }
                        if (typeof window.submit_generation_button === 'function') {
                            KLITE_RPMod.log('chat', 'Calling submit_generation_button(true)');
                            return window.submit_generation_button(true);
                        }
                    }
                }
                // Fallback to classic input
                const liteInput = document.getElementById('input_text');
                if (liteInput) {
                    liteInput.value = text;
                    if (typeof window.prepare_submit_generation === 'function') {
                        KLITE_RPMod.log('chat', 'Calling prepare_submit_generation()');
                        return window.prepare_submit_generation();
                    }
                    KLITE_RPMod.log('chat', 'Calling LiteAPI.generate()');
                    return LiteAPI.generate();
                }
                KLITE_RPMod.log('panels', 'sendTextToEsolite: No suitable input found');
            } catch (e) {
                KLITE_RPMod.error('sendTextToEsolite failed', e);
            }
        },

        sendQuickMessage(message) {
            if (window.abort_generation) {
                window.abort_generation();
            }

            this.autoSender.currentCount = 0;
            this.sendMessage(message);
        },

        async loadAutoSenderSettings() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_auto_sender_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.autoSender = { ...this.autoSender, ...settings };
                KLITE_RPMod.log('state', 'Loaded auto-sender settings from storage');
            }
        },

        initAutoSenderUI() {
            // Apply settings to UI elements
            const intervalSlider = document.getElementById('auto-interval-slider');
            const intervalDisplay = document.getElementById('auto-interval-display');
            const startMessageEl = document.getElementById('auto-start-message');
            const autoMessageEl = document.getElementById('auto-message');

            if (intervalSlider) intervalSlider.value = this.autoSender.interval;
            if (intervalDisplay) intervalDisplay.textContent = this.autoSender.interval;
            if (startMessageEl) startMessageEl.value = this.autoSender.startMessage || '';
            if (autoMessageEl) autoMessageEl.value = this.autoSender.message || 'Continue.';

            // Load quick messages
            for (let i = 1; i <= 5; i++) {
                const quickInput = document.getElementById(`auto-quick-${i}`);
                if (quickInput) {
                    quickInput.value = this.autoSender.quickMessages[i - 1] || '';
                }
            }
        },

        saveAutoSenderSettings() {
            const settings = {
                interval: this.autoSender.interval,
                message: this.autoSender.message,
                startMessage: this.autoSender.startMessage,
                quickMessages: this.autoSender.quickMessages
            };
            KLITE_RPMod.saveToLiteStorage('rpmod_auto_sender_settings', JSON.stringify(settings));
            KLITE_RPMod.log('state', 'Saved auto-sender settings to storage');
        },

        // Quick Actions (moved from PLAY_ADV)
        async loadQuickActions() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_adv_actions');
            if (saved) {
                this.quickActions = JSON.parse(saved);
                KLITE_RPMod.log('state', `Loaded ${this.quickActions.length} quick actions from storage`);
            }
        },

        initQuickActions() {
            this.quickActions.forEach((action, i) => {
                const input = document.getElementById(`adv-quick-${i}`);
                if (input) {
                    input.value = action;
                    input.addEventListener('input', () => {
                        this.quickActions[i] = input.value;
                        this.saveQuickActions();
                    });
                }
            });
        },

        saveQuickActions() {
            KLITE_RPMod.saveToLiteStorage('rpmod_adv_actions', JSON.stringify(this.quickActions));
            KLITE_RPMod.log('state', `Saved ${this.quickActions.length} quick actions to storage`);
        },

        sendQuickAction(index) {
            const action = this.quickActions[index];
            if (action && action.trim()) {
                KLITE_RPMod.log('panels', `Quick action sent: ${action}`);
                this.sendTextToEsolite(action);
            }
        },

        // Bookmarks/Chapters (moved from PLAY_STORY)
        renderChapters() {
            return this.chapters.map((ch, i) => {
                const safeTitle = KLITE_RPMod.escapeHtml(ch.title || '');
                return `
                <div class="klite-timeline-item" data-chapter="${i}" data-action="goto-chapter">
                    <strong>Chapter ${ch.number}:</strong> ${safeTitle}
                    <div class="rpm-muted">${ch.wordCount} words</div>
                </div>`;
            }).join('');
        },

        async loadChapters() {
            const saved = await KLITE_RPMod.loadFromLiteStorage('rpmod_story_chapters');
            if (saved) {
                this.chapters = JSON.parse(saved);
                KLITE_RPMod.log('state', `Loaded ${this.chapters.length} chapters from storage`);
            }
        },

        saveChapters() {
            KLITE_RPMod.saveToLiteStorage('rpmod_story_chapters', JSON.stringify(this.chapters));
            KLITE_RPMod.log('state', `Saved ${this.chapters.length} chapters to storage`);
        },

        addChapter() {
            const title = prompt('Enter bookmark title:', `Bookmark ${this.chapters.length + 1}`);
            if (!title) return;

            const wordCount = window.gametext_arr ?
                gametext_arr.join(' ').split(/\s+/).filter(w => w).length : 0;

            // Determine current scroll position using host container
            const container = KLITE_RPMod.getChatScrollContainer?.() || this.getChatScrollContainer?.();
            const position = container ? container.scrollTop : (document.documentElement.scrollTop || window.scrollY || 0);

            this.chapters.push({
                number: this.chapters.length + 1,
                title: title,
                wordCount: wordCount,
                position: position
            });

            this.saveChapters();
            this.updateTimeline();
            KLITE_RPMod.log('panels', `Bookmark added: ${title}`);
        },

        deleteAllChapters() {
            if (confirm('Delete all bookmarks?')) {
                this.chapters = [];
                this.saveChapters();
                this.updateTimeline();
                KLITE_RPMod.log('panels', 'All bookmarks deleted');
            }
        },

        updateTimeline() {
            const timeline = document.getElementById('story-timeline');
            if (timeline) {
                timeline.innerHTML = this.chapters.length ? this.renderChapters() : '<div class="rpm-center rpm-muted">No bookmarks yet</div>';
            }
        },

        goToChapter(index) {
            const chapter = this.chapters[index];
            if (!chapter || typeof chapter.position !== 'number') return;

            const container = KLITE_RPMod.getChatScrollContainer?.() || this.getChatScrollContainer?.();
            if (container) {
                container.scrollTop = chapter.position;
            } else {
                // Fallback to window scrolling
                try { window.scrollTo({ top: chapter.position, behavior: 'smooth' }); } catch(_) { window.scrollTo(0, chapter.position); }
            }
            KLITE_RPMod.log('panels', `Scrolled to bookmark ${chapter.number} at position ${chapter.position}`);
        },

        

        // Find the primary scroll container for chat/story content
        getChatScrollContainer() {
            // Esobold primary container
            const gamescreen = document.getElementById('gamescreen');
            if (gamescreen) return gamescreen;
            // Prefer RPmod mirror if present (overlay mode)
            const mirror = document.getElementById('chat-display');
            if (mirror) return mirror;
            // Else find nearest scrollable ancestor of #gametext
            const content = document.getElementById('gametext');
            let el = content ? content.parentElement : null;
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                const oy = style.overflowY;
                if (oy === 'auto' || oy === 'scroll') return el;
                el = el.parentElement;
            }
            return null;
        },


        refresh() {
            const active = KLITE_RPMod.state?.tabs?.right;
            if (active === 'TOOLS' || active === 'ROLES') KLITE_RPMod.loadPanel('right', active);
        },

        updateNarratorExplanation(style) {
            const explanations = {
                omniscient: '<strong>Omniscient:</strong> The narrator knows all characters\' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.',
                limited: '<strong>Limited:</strong> The narrator can only describe what a specific character can see and experience. Focuses on one perspective and hints at emotions rather than revealing them directly.',
                objective: '<strong>Objective:</strong> The narrator acts like a camera, describing only what can be observed externally. No access to thoughts or emotions, focuses purely on actions and dialogue.',
                character: '<strong>Character POV:</strong> The narrator speaks as if they are one of the characters in the scene. Uses first person perspective and personal knowledge.'
            };

            const explanationEl = document.getElementById('narrator-explanation-text');
            if (explanationEl && explanations[style]) {
                explanationEl.innerHTML = explanations[style];
            }
        },

        updateCharacterContext() {
            // Integration with CHARS panel and context system
            KLITE_RPMod.log('panels', 'Character context updated');
        },

        extractWICharacters(wiEntries) {
            const wiCharacters = {};

            // Look for entries with comment pattern "${charName}_imported_memory" and "${charName}_imported_image"
            wiEntries.forEach(entry => {
                if (entry.comment && entry.comment.endsWith('_imported_memory')) {
                    const charName = entry.comment.replace('_imported_memory', '');

                    if (!wiCharacters[charName]) {
                        wiCharacters[charName] = {
                            name: charName,
                            content: [],
                            type: 'worldinfo',
                            image: null // For storing character image
                        };
                    }

                    // Concatenate content from multiple entries for the same character
                    if (entry.content) {
                        wiCharacters[charName].content.push(entry.content);
                    }
                } else if (entry.comment && entry.comment.endsWith('_imported_image')) {
                    // NEW: Extract character image from WI
                    const charName = entry.comment.replace('_imported_image', '');

                    if (!wiCharacters[charName]) {
                        wiCharacters[charName] = {
                            name: charName,
                            content: [],
                            type: 'worldinfo',
                            image: null
                        };
                    }

                    // Store the image data
                    if (entry.content) {
                        wiCharacters[charName].image = entry.content;
                    }
                }
            });

            // Convert to array and join content
            return Object.values(wiCharacters).map(char => ({
                ...char,
                content: char.content.join('\n\n'),
                description: char.content.join('\n\n'), // For compatibility
                // Include image if available
                ...(char.image && { image: char.image })
            }));
        },


        skipTime() {
            const msg = '[Time passes. Continue the story from a later moment]';
            this.sendTextToEsolite(msg);
        },

        applyPersona() {
            const personaSelect = document.getElementById('persona-list');
            const selectedValue = personaSelect?.value;

            if (!selectedValue) {
                alert('Please select a persona first');
                return;
            }

            const parts = selectedValue.split('_');
            let personaData = null;

            if (parts[0] === 'char') {
                const allCharacters = KLITE_RPMod.characters || [];
                personaData = allCharacters.find(char => char.id == parts[1]);
            } else if (parts[0] === 'wi' && parts[1] === 'char') {
                // Handle WI character: wi_char_CharacterName
                const charName = parts.slice(2).join('_'); // In case character name has underscores
                const wiEntries = window.worldinfo || [];
                const wiCharacters = this.extractWICharacters(wiEntries);
                personaData = wiCharacters.find(char => char.name === charName);
            }

            if (personaData) {
                this.selectedPersona = personaData;
                this.personaEnabled = true;
                this.saveSettings?.();

                // Update the Applied Persona display immediately
                const appliedPersonaName = document.getElementById('applied-persona-name');
                if (appliedPersonaName) {
                    appliedPersonaName.textContent = personaData.name;
                }

                // Update remove button state
                const removeBtn = document.getElementById('remove-persona-btn');
                if (removeBtn) {
                    removeBtn.classList.remove('klite-disabled');
                }

                // Applied persona: ${personaData.name}

                // Update user avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(personaData);
                KLITE_RPMod.updateUserAvatar(best || null);

                // Update character context in memory
                this.updateCharacterContext();
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
            } else {
                alert('Failed to apply persona');
            }
        },

        applyCharacter() {
            const characterSelect = document.getElementById('character-list');
            const selectedValue = characterSelect?.value;

            KLITE_RPMod.log('panels', `Applying character: selectedValue=${selectedValue}`);

            if (!selectedValue) {
                alert('Please select a character first');
                return;
            }

            const parts = selectedValue.split('_');
            let characterData = null;

            KLITE_RPMod.log('panels', `Character selection: parts=${parts}`);

            if (parts[0] === 'char') {
                const allCharacters = KLITE_RPMod.characters || [];
                KLITE_RPMod.log('panels', `Available characters: ${allCharacters.length}`);
                characterData = allCharacters.find(char => char.id == parts[1]);
                KLITE_RPMod.log('panels', `Found character data:`, characterData);
            } else if (parts[0] === 'wi' && parts[1] === 'char') {
                // Handle WI character: wi_char_CharacterName
                const charName = parts.slice(2).join('_'); // In case character name has underscores
                const wiEntries = window.current_wi || [];
                const wiCharacters = this.extractWICharacters(wiEntries);
                characterData = wiCharacters.find(char => char.name === charName);
                KLITE_RPMod.log('panels', `Found WI character data:`, characterData);
            }

            if (characterData) {
                this.selectedCharacter = characterData;
                this.characterEnabled = true;
                this.saveSettings?.();

                // Update the Applied Character display immediately
                const appliedCharacterName = document.getElementById('applied-character-name');
                if (appliedCharacterName) {
                    appliedCharacterName.textContent = characterData.name;
                }

                // Update remove button state
                const removeBtn = document.getElementById('remove-character-btn');
                if (removeBtn) {
                    removeBtn.classList.remove('klite-disabled');
                }

                // Applied character: ${characterData.name}

                // Update AI avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(characterData);
                KLITE_RPMod.updateAIAvatar(best || null);

                // Update AI name to character name when character is applied
                const aiNameInput = document.getElementById('rp-ai-name');
                if (aiNameInput && characterData.name) {
                    aiNameInput.value = characterData.name;
                    if (window.localsettings) {
                        window.localsettings.chatopponent = characterData.name;
                        window.save_settings?.();
                        KLITE_RPMod.log('panels', `AI name automatically updated to character name: ${characterData.name}`);
                    }
                }

                // Update character context in memory
                this.updateCharacterContext();
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
                // Prefill Scenario panel fields from this character
                try { KLITE_RPMod.populateScenarioFromCharacter(characterData); } catch(_) {}
                // Refresh SCENARIO panel if active to reflect selected character
                try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}
            } else {
                alert('Failed to apply character');
            }
        },

        applyCharacterData(characterData) {
            if (characterData) {
                this.selectedCharacter = characterData;
                this.characterEnabled = true;
                this.saveSettings?.();

                // Update AI avatar using Character Manager (optimized cache)
                const best = KLITE_RPMod.getBestCharacterAvatar(characterData);
                KLITE_RPMod.updateAIAvatar(best || null);

                // Update AI name to character name when character is applied
                const aiNameInput = document.getElementById('rp-ai-name');
                if (aiNameInput && characterData.name) {
                    aiNameInput.value = characterData.name;
                    // Trigger the change event to save the setting
                    if (window.localsettings) {
                        window.localsettings.chatopponent = characterData.name;
                        window.save_settings?.();
                        KLITE_RPMod.log('panels', `AI name automatically updated to character name: ${characterData.name}`);
                    }
                }

                // Update character context
                this.updateCharacterContext();

                KLITE_RPMod.log('panels', `Applied character data for: ${characterData.name}`);
                // Ensure ROLES panel reflects changes immediately if visible
                try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
                // Prefill Scenario panel fields from this character
                try { KLITE_RPMod.populateScenarioFromCharacter(characterData); } catch(_) {}
                // Refresh SCENARIO panel if active to reflect selected character
                try { const active = KLITE_RPMod.state?.tabs?.right; if (active === 'SCENARIO') KLITE_RPMod.loadPanel('right', 'SCENARIO'); } catch(_) {}
            }
        },

        removePersona() {
            this.selectedPersona = null;
            this.personaEnabled = false;
            this.saveSettings?.();

            // Update the Applied Persona display immediately
            const appliedPersonaName = document.getElementById('applied-persona-name');
            if (appliedPersonaName) {
                appliedPersonaName.textContent = 'None';
            }

            // Update remove button state
            const removeBtn = document.getElementById('remove-persona-btn');
            if (removeBtn) {
                removeBtn.classList.add('klite-disabled');
            }

            // Persona removed

            // Reset user avatar to default when persona is removed
            KLITE_RPMod.updateUserAvatar(null);

            // Reset chatname to default "User"
            try {
                if (window.localsettings) {
                    window.localsettings.chatname = 'User';
                    window.save_settings?.();
                }
                const userNameInput = document.getElementById('rp-user-name');
                if (userNameInput) userNameInput.value = 'User';
            } catch(_) {}

            // Refresh currently active panel without switching
            const active = KLITE_RPMod.state?.tabs?.right;
            if (active === 'TOOLS' || active === 'ROLES') KLITE_RPMod.loadPanel('right', active);

            // Update character context in memory
            this.updateCharacterContext();
            // Ensure ROLES panel reflects changes immediately if visible
            try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
        },

        removeCharacter() {
            this.selectedCharacter = null;
            this.characterEnabled = false;
            this.saveSettings?.();

            // Update the Applied Character display immediately
            const appliedCharacterName = document.getElementById('applied-character-name');
            if (appliedCharacterName) {
                appliedCharacterName.textContent = 'None';
            }

            // Update remove button state
            const removeBtn = document.getElementById('remove-character-btn');
            if (removeBtn) {
                removeBtn.classList.add('klite-disabled');
            }

            // Character removed

            // Reset AI avatar to default when character is removed
            KLITE_RPMod.updateAIAvatar(null);

            // Reset chatopponent to default "KoboldAI"
            try {
                if (window.localsettings) {
                    window.localsettings.chatopponent = 'KoboldAI';
                    window.save_settings?.();
                }
                const aiNameInput = document.getElementById('rp-ai-name');
                if (aiNameInput) aiNameInput.value = 'KoboldAI';
            } catch(_) {}

            // Refresh currently active panel without switching
            const active2 = KLITE_RPMod.state?.tabs?.right;
            if (active2 === 'TOOLS' || active2 === 'ROLES') KLITE_RPMod.loadPanel('right', active2);

            // Update character context in memory
            this.updateCharacterContext();
            // Ensure ROLES panel reflects changes immediately if visible
            try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
        },


        editLast() {
            if (window.gametext_arr && gametext_arr.length > 0) {
                const lastEntry = gametext_arr[gametext_arr.length - 1];
                // Enter edit mode for last entry
                KLITE_RPMod.log('panels', 'Editing last entry');
            }
        },

        deleteLast() {
            if (window.gametext_arr && gametext_arr.length > 0 &&
                confirm('Delete the last message? This cannot be undone.')) {
                gametext_arr.pop();
                if (window.render_gametext) {
                    render_gametext();
                }
                KLITE_RPMod.log('panels', 'Deleted last entry');
            }
        },

        regenerate() {
            if (window.retry_generation_button) {
                retry_generation_button();
            }
        },

        undo() {
            if (window.undo_generation_button) {
                undo_generation_button();
            }
        },

        redo() {
            if (window.redo_generation_button) {
                redo_generation_button();
            }
        },



    };
    // The Chars tab lists Library characters: re-render it when RPmod wrote or deleted one.
    window.addEventListener('klite:library-change', () => {
        try {
            const C = KLITE_RPMod.panels.CHARS;
            if (KLITE_RPMod.state?.tabs?.right === 'CHARS' && (!C.editMode || C.editMode === 'none') && document.getElementById('content-right')) KLITE_RPMod.loadPanel('right', 'CHARS');
        } catch (_) {}
    });
    // Announce persona changes (many code paths assign selectedPersona / personaEnabled):
    // `klite:persona-change` on window, detail { name } ('' when none). Used by the shell's
    // Party section.
    (function watchPersona(T) {
        const store = { selectedPersona: T.selectedPersona, personaEnabled: T.personaEnabled };
        const current = () => (store.personaEnabled && store.selectedPersona && store.selectedPersona.name) || '';
        for (const key of Object.keys(store)) {
            Object.defineProperty(T, key, {
                enumerable: true, configurable: true,
                get: () => store[key],
                set: (v) => {
                    const before = current(); store[key] = v; const after = current();
                    if (before !== after) { try { window.dispatchEvent(new CustomEvent('klite:persona-change', { detail: { name: after } })); } catch (_) {} }
                },
            });
        }
    })(KLITE_RPMod.panels.TOOLS);

}
