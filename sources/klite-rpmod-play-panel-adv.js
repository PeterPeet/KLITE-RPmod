// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - PLAY Panel for Adventure Mode
// Full implementation with generation control and quick actions
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.PLAY_ADV = {
    collapsedSections: new Set(),
    quickActions: [
        '>Look Around',
        '>Search',
        '>Check Inventory',
        '>Short Rest (half an hour)',
        '>Long Rest (a full 7-12 hours)'
    ],
    
    load(container) {
        container.innerHTML = `
        <!-- PLAY Panel (Adventure Mode) -->
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <div class="klite-rpmod-section-content">
                    <h3>Quick Actions</h3>
                    <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Quick Action Slots:</label>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 2px;">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <div style="display: flex; gap: 2px;">
                                <input 
                                    type="text" 
                                    id="klite-rpmod-quick-${i}"
                                    placeholder="Quick Action ${i}"
                                    style="flex: 1; padding: 3px 4px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 11px;"
                                >
                                <button class="klite-rpmod-button klite-rpmod-quick-send" data-slot="${i}" style="width: 26px; padding: 3px; font-size: 11px;">${i}</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="klite-rpmod-section-content">                    
                    <h3>Generation Control</h3>
                    <!-- Generation Control -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        
                        <div class="klite-rpmod-preset-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px;">
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="precise">Precise</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn active" data-preset="balanced">KoboldAI</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="creative">Creative</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="chaotic">Chaotic</button>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Creativity
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">temp: <span id="klite-rpmod-temp-val">0.75</span> | top_p: <span id="klite-rpmod-topp-val">0.925</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-creativity-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Deterministic</span>
                                <span style="font-size: 10px; color: #888;">Chaotic</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Focus
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">top_k: <span id="klite-rpmod-topk-val">55</span> | min_p: <span id="klite-rpmod-minp-val">0.05</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-focus-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Narrow</span>
                                <span style="font-size: 10px; color: #888;">Broad</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Repetition
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">pen: <span id="klite-rpmod-rep-val">1.2</span> | rng: <span id="klite-rpmod-rng-val">1152</span> | slp: <span id="klite-rpmod-slp-val">0.5</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-repetition-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Allow</span>
                                <span style="font-size: 10px; color: #888;">Punish</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="klite-rpmod-section-content">
                    <h3>RPG System (Demo/WIP)</h3>
                    <select id="rpg-system" style="width: 100%; margin-bottom: 8px;">
                        <option value="custom">Custom System</option>
                        <option value="dnd5e">D&D 5e - Fantasy adventure</option>
                        <option value="shadowrun">Shadownrun - Cyberpunk and Fantasy dystopia mix</option>
                        <option value="pathfinder">Pathfinder 2e - Fantasy with deep mechanics</option>
                        <option value="fate">Fate Core - Narrative-focused, any genre</option>
                        <option value="call-of-cthulhu">Call of Cthulhu - Horror investigation</option>
                        <option value="savage-worlds">Savage Worlds - Fast, furious, fun</option>
                        <option value="stars-without-number">Stars Without Number - Sci-fi sandbox</option>
                        <option value="blades-in-the-dark">Blades in the Dark - Heist & skulduggery</option>
                        <option value="powered-by-apocalypse">Powered by Apocalypse - Story-first</option>
                    </select>
                    
                    <button class="klite-rpmod-button" style="width: 100%; margin-bottom: 4px;">Apply RPG System</button>
                    
                    <div id="custom-rules-buttons" style="display: flex; gap: 4px;">
                        <button class="klite-rpmod-button">Load Custom</button>
                        <button class="klite-rpmod-button">Edit Rules</button>
                        <button class="klite-rpmod-button">Save Rules</button>
                    </div>
                    
                    <div style="font-size: 11px; color: #999; margin-top: 8px;">
                        System changes require clicking Apply
                    </div>
                </div>
                
                    
                <div class="klite-rpmod-section-content">
                    <h3>Inventory (Demo/WIP)</h3>
                    <table style="width: 100%; font-size: 11px; color: #ccc;">
                        <thead>
                            <tr style="border-bottom: 1px solid #444;">
                                <th style="text-align: left; padding: 4px;">Item</th>
                                <th style="text-align: center; padding: 4px;">Qty</th>
                                <th style="text-align: center; padding: 4px;">Wt</th>
                                <th style="text-align: left; padding: 4px;">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 4px;">Longsword</td>
                                <td style="text-align: center; padding: 4px;">1</td>
                                <td style="text-align: center; padding: 4px;">3lb</td>
                                <td style="padding: 4px; color: #999;">1d8 slashing</td>
                            </tr>
                            <tr style="background: #0f0f0f;">
                                <td style="padding: 4px;">Shield</td>
                                <td style="text-align: center; padding: 4px;">1</td>
                                <td style="text-align: center; padding: 4px;">6lb</td>
                                <td style="padding: 4px; color: #999;">+2 AC</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px;">Healing Potion</td>
                                <td style="text-align: center; padding: 4px;">3</td>
                                <td style="text-align: center; padding: 4px;">1.5lb</td>
                                <td style="padding: 4px; color: #999;">2d4+2 HP</td>
                            </tr>
                            <tr style="background: #0f0f0f;">
                                <td style="padding: 4px;">Rope (50ft)</td>
                                <td style="text-align: center; padding: 4px;">1</td>
                                <td style="text-align: center; padding: 4px;">10lb</td>
                                <td style="padding: 4px; color: #999;">Hemp</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px;">Rations</td>
                                <td style="text-align: center; padding: 4px;">5</td>
                                <td style="text-align: center; padding: 4px;">10lb</td>
                                <td style="padding: 4px; color: #999;">5 days</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">
                        <span style="color: #999; font-size: 11px;">Total Weight: 30.5 / 150 lbs</span>
                        <span style="color: #999; font-size: 11px;">Gold: 47 gp</span>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.initEventListeners(container);
        this.loadSavedStates();
        this.initializePresets();
        this.initializeSliders();
        this.initializeQuickActions();
    },

    initEventListeners(container) {
        // Section collapse handlers
        container.addEventListener('click', (e) => {
            const header = e.target.closest('.klite-rpmod-section-header');
            if (header) {
                const section = header.closest('.klite-rpmod-section');
                section.classList.toggle('collapsed');
                
                // Update arrow
                const arrow = header.querySelector('span:last-child');
                arrow.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
    
        // Dice enable toggle
        const diceEnabled = document.getElementById('klite-dice-enabled');
        const diceConfig = document.getElementById('klite-dice-config');
        if (diceEnabled && diceConfig) {
            diceEnabled.onchange = () => {
                diceConfig.style.display = diceEnabled.checked ? 'block' : 'none';
            };
        }
    },

    async saveQuickActionsToLiteDB() {
        // Collect all quick actions
        const actions = [];
        for (let i = 0; i < 5; i++) {
            const input = document.getElementById(`klite-rpmod-quick-${i + 1}`);
            actions[i] = input ? input.value : '';
        }
        
        // Save to KoboldAI database using a prefixed key
        if (typeof localforage !== 'undefined') {
            try {
                await localforage.setItem('KLITERPmodquickactions', actions);
                console.log('Quick actions saved to Lite DB');
            } catch (error) {
                console.error('Error saving quick actions to Lite DB:', error);
                // Fallback to localStorage
                localStorage.setItem('klite-rpmod-quick-actions', JSON.stringify(actions));
            }
        } else {
            // If localforage not available, use localStorage
            localStorage.setItem('klite-rpmod-quick-actions', JSON.stringify(actions));
        }
    },
    
    async loadQuickActionsFromLiteDB() {
        // Try to load from KoboldAI database first
        if (typeof localforage !== 'undefined') {
            try {
                const actions = await localforage.getItem('KLITERPmodquickactions');
                if (actions && Array.isArray(actions)) {
                    actions.forEach((action, i) => {
                        const input = document.getElementById(`klite-rpmod-quick-${i + 1}`);
                        if (input && action) input.value = action;
                    });
                    console.log('Quick actions loaded from Lite DB');
                    return true;
                }
            } catch (error) {
                console.error('Error loading quick actions from Lite DB:', error);
            }
        }
        
        // Fallback to localStorage
        const savedActions = localStorage.getItem('klite-rpmod-quick-actions');
        if (savedActions) {
            try {
                const actions = JSON.parse(savedActions);
                actions.forEach((action, i) => {
                    const input = document.getElementById(`klite-rpmod-quick-${i + 1}`);
                    if (input && action) input.value = action;
                });
                console.log('Quick actions loaded from localStorage');
                return true;
            } catch (e) {
                console.error('Error parsing saved quick actions:', e);
            }
        }
        
        return false;
    },

    async loadSavedStates() {
        console.log('Loading Adventure panel states...');
        
        // First set default quick actions
        this.quickActions.forEach((action, i) => {
            const input = document.getElementById(`klite-rpmod-quick-${i + 1}`);
            if (input) input.value = action;
        });
        
        // Load saved quick actions from Lite DB
        await this.loadQuickActionsFromLiteDB();
        
        // Sync generation control values from Lite settings if available
        this.syncFromLiteSettings();
    },
    
    syncFromLiteSettings() {
        if (typeof localsettings === 'undefined') return;
        
        // Sync creativity (temperature)
        if (localsettings.temperature !== undefined) {
            const creativitySlider = document.getElementById('klite-rpmod-creativity-slider');
            const tempValue = ((localsettings.temperature - 0.5) / 1.5) * 100;
            creativitySlider.value = Math.max(0, Math.min(100, tempValue));
            this.updateCreativityDisplay(creativitySlider.value);
        }
        
        // Sync focus (top_k)
        if (localsettings.top_k !== undefined) {
            const focusSlider = document.getElementById('klite-rpmod-focus-slider');
            const topkValue = ((localsettings.top_k - 10) / 90) * 100;
            focusSlider.value = Math.max(0, Math.min(100, topkValue));
            this.updateFocusDisplay(focusSlider.value);
        }
        
        // Sync repetition (rep_pen)
        if (localsettings.rep_pen !== undefined) {
            const repetitionSlider = document.getElementById('klite-rpmod-repetition-slider');
            const repValue = ((localsettings.rep_pen - 1.0) / 0.5) * 100;
            repetitionSlider.value = Math.max(0, Math.min(100, repValue));
            this.updateRepetitionDisplay(repetitionSlider.value);
        }
    },
    
    async saveQuickAction(slot, action) {
        // Save all actions to database
        await this.saveQuickActionsToLiteDB();
    },
    
    initializeQuickActions() {
        // Quick action input handlers
        const quickInputs = document.querySelectorAll('[id^="klite-rpmod-quick-"]');
        quickInputs.forEach((input, index) => {
            input.addEventListener('change', (e) => {
                this.saveQuickAction(index, e.target.value);
            });
        });
        
        // Quick action button handlers
        const quickButtons = document.querySelectorAll('.klite-rpmod-quick-send');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = parseInt(btn.dataset.slot) - 1;
                const input = document.getElementById(`klite-rpmod-quick-${slot + 1}`);
                const action = input ? input.value : '';
                
                if (action) {
                    this.sendQuickAction(action);
                }
            });
        });
    },
    
    sendQuickAction(action) {
        // Get input field
        const rpmodInput = document.getElementById('klite-rpmod-input');
        const liteInput = document.getElementById('input_text');
        const input = rpmodInput || liteInput;
        
        if (input) {
            // Set the action in the input field
            input.value = action;
            
            // Sync both inputs if both exist
            if (rpmodInput) rpmodInput.value = action;
            if (liteInput) liteInput.value = action;
            
            // Trigger generation
            if (typeof submit_generation_button === 'function') {
                submit_generation_button(false);
            } else if (typeof prepare_submit_generation === 'function') {
                prepare_submit_generation();
            }
            
            // Clear the input field after a short delay
            setTimeout(() => {
                if (input) input.value = '';
                if (rpmodInput) rpmodInput.value = '';
                if (liteInput) liteInput.value = '';
            }, 250);
        }
    },
    
    initializePresets() {
        const presetButtons = document.querySelectorAll('.klite-rpmod-preset-btn');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
    },
    
    applyPreset(preset) {
        const presets = {
            precise: {
                creativity: 20,  // LOW
                focus: 20,      // Narrow
                repetition: 80  // Prevent
            },
            balanced: {
                creativity: 16,  // Med
                focus: 100,      // Med
                repetition: 19  // Med
            },
            creative: {
                creativity: 80,  // High
                focus: 60,      // Med-Broad
                repetition: 40  // Med-Prevent
            },
            chaotic: {
                creativity: 95,  // Very High
                focus: 90,      // Broad
                repetition: 10  // Allow
            }
        };
        
        const settings = presets[preset];
        if (settings) {
            document.getElementById('klite-rpmod-creativity-slider').value = settings.creativity;
            document.getElementById('klite-rpmod-focus-slider').value = settings.focus;
            document.getElementById('klite-rpmod-repetition-slider').value = settings.repetition;
            
            this.updateCreativityDisplay(settings.creativity);
            this.updateFocusDisplay(settings.focus);
            this.updateRepetitionDisplay(settings.repetition);
            
            this.applyCreativitySettings(settings.creativity);
            this.applyFocusSettings(settings.focus);
            this.applyRepetitionSettings(settings.repetition);
        }
    },
    
    initializeSliders() {
        // Creativity slider
        document.getElementById('klite-rpmod-creativity-slider')?.addEventListener('input', (e) => {
            this.updateCreativityDisplay(e.target.value);
            this.applyCreativitySettings(e.target.value);
        });
        
        // Focus slider
        document.getElementById('klite-rpmod-focus-slider')?.addEventListener('input', (e) => {
            this.updateFocusDisplay(e.target.value);
            this.applyFocusSettings(e.target.value);
        });
        
        // Repetition slider
        document.getElementById('klite-rpmod-repetition-slider')?.addEventListener('input', (e) => {
            this.updateRepetitionDisplay(e.target.value);
            this.applyRepetitionSettings(e.target.value);
        });
    },
    
    updateCreativityDisplay(value) {
        const temp = 0.5 + (value / 100) * 1.5;
        const topP = 0.85 + (value / 100) * 0.14;
        
        document.getElementById('klite-rpmod-temp-val').textContent = temp.toFixed(2);
        document.getElementById('klite-rpmod-topp-val').textContent = topP.toFixed(3);
    },
    
    updateFocusDisplay(value) {
        const topK = Math.round(10 + (value / 100) * 90);
        const minP = 0.01 + (value / 100) * 0.09;
        
        document.getElementById('klite-rpmod-topk-val').textContent = topK;
        document.getElementById('klite-rpmod-minp-val').textContent = minP.toFixed(2);
    },
    
    updateRepetitionDisplay(value) {
        const repPen = 1.0 + (value / 100) * 0.5;
        const repRange = Math.round(256 + (value / 100) * 1792);
        const repSlope = 0.1 + (value / 100) * 0.9;
        
        document.getElementById('klite-rpmod-rep-val').textContent = repPen.toFixed(1);
        document.getElementById('klite-rpmod-rng-val').textContent = repRange;
        document.getElementById('klite-rpmod-slp-val').textContent = repSlope.toFixed(1);
    },
    
    applyCreativitySettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.temperature = 0.5 + (value / 100) * 1.5;
            localsettings.top_p = 0.85 + (value / 100) * 0.14;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    },
    
    applyFocusSettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.top_k = Math.round(10 + (value / 100) * 90);
            localsettings.min_p = 0.01 + (value / 100) * 0.09;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    },
    
    applyRepetitionSettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.rep_pen = 1.0 + (value / 100) * 0.5;
            localsettings.rep_pen_range = Math.round(256 + (value / 100) * 1792);
            localsettings.rep_pen_slope = 0.1 + (value / 100) * 0.9;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    }
};