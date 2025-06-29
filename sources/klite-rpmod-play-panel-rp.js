// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - PLAY Panel for RP/Chat/Instruct Modes
// Full implementation with all requested features
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.PLAY_RP = {
    personaEnabled: false,
    characterEnabled: false,
    selectedPersona: null,
    selectedCharacter: null,
    rules: '',
    lengthSliderValue: 512,
    automaticSender: {
        interval: 30,
        autoMessage: 'Continue.',
        quickMessages: ['', '', '', '', ''],
        currentCount: 0,
        timer: null,
        isPaused: false,
        isStarted: false
    },
    
    load(container, panel) {
        const isInstructMode = typeof localsettings !== 'undefined' && localsettings.opmode === 4;
        
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content">
                    <!-- Rules for the AI / System Prompt -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>${isInstructMode ? 'System Prompt' : 'Rules for the AI'}</h3>
                        <textarea 
                            id="klite-rpmod-rules-field"
                            placeholder="${isInstructMode ? 'Enter system instructions...' : 'Rules are only available in Instruct Mode.'}"
                            style="width: 100%; min-height: 200px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 8px; border-radius: 4px; resize: vertical;"
                        ></textarea>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input 
                                    type="checkbox" 
                                    id="klite-rpmod-autosave-enabled" 
                                    checked
                                    style="margin: 0;"
                                >
                                <label for="klite-rpmod-autosave-enabled" style="font-size: 11px; color: #999; margin: 0;">
                                    Auto-save enabled
                                </label>
                            </div>
                            <span id="klite-rpmod-rules-save-status" style="font-size: 11px; color: #999;"></span>
                        </div>
                    </div>
                    
                    <!-- Generation Control -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Generation Control</h3>
                        
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
                    
                    <!-- AI Output Length -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>AI Output Length</h3>
                        <div style="margin-bottom: 2px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <span style="font-size: 12px; color: #ccc;">Length</span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">context: <span id="klite-rpmod-selected-length">512</span></span>
                            </div>
                            <input type="range" min="512" max="8192" value="512" step="512" class="klite-rpmod-slider" id="klite-rpmod-length-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                                <span style="font-size: 10px; color: #888;">512</span>
                                <span style="font-size: 10px; color: #888;" id="klite-rpmod-max-context">8192</span>
                            </div>
                        </div>
                    </div>

                    <!-- Narrator Settings Section -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 2px;">
                            <label style="color: #999; font-size: 12px; width: 80px;">Style:</label>
                            <select id="klite-narrator-style" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px;">
                                <option value="omniscient" selected>Omniscient (knows all)</option>
                                <option value="limited">Limited (character perspective)</option>
                                <option value="objective">Objective (camera view)</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 2px;">
                            <label style="color: #999; font-size: 12px; width: 80px;">Focus:</label>
                            <select id="klite-narrator-focus" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px;">
                                <option value="environment">Environment & Atmosphere</option>
                                <option value="emotions">Emotions & Thoughts</option>
                                <option value="action">Actions & Events</option>
                                <option value="mixed" selected>Mixed (Everything)</option>
                            </select>
                        </div>
                        
                        <button class="klite-rpmod-button" id="klite-rpmod-trigger-narrator-manual" style="width: 100%;">
                            Trigger Narrator Now
                        </button>
                    </div>               
                    
                    <!-- Chat Settings -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Chat Settings</h3>
                        <div style="padding: 8px 0;">
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 12px; color: #ccc; display: block; margin-bottom: 4px;">Your Name</label>
                                <input 
                                    type="text" 
                                    id="klite-rpmod-user-name" 
                                    placeholder="User"
                                    style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                >
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 12px; color: #ccc; display: block; margin-bottom: 4px;">AI Name / Character</label>
                                <input 
                                    type="text" 
                                    id="klite-rpmod-ai-name" 
                                    placeholder="AI"
                                    style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                >
                            </div>

                            <!-- Experimental WI Mode -->
                            <div style="margin-bottom: 12px; padding: 8px; border-radius: 4px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input 
                                        type="checkbox" 
                                        id="klite-rpmod-experimental-wi" 
                                        style="margin: 0;"
                                    >
                                    <label for="klite-rpmod-experimental-wi" style="font-size: 12px; margin: 0; cursor: pointer;">
                                        Enable Experimental WI Character Mode
                                    </label>
                                </div>
                                <div style="font-size: 10px; color: #999; margin-top: 4px; margin-left: 20px;">
                                    Allows loading characters from World Info entries
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <input 
                                        type="checkbox" 
                                        id="klite-rpmod-persona-toggle" 
                                        style="margin: 0;"
                                    >
                                    <label for="klite-rpmod-persona-toggle" style="font-size: 12px; color: #ccc; margin: 0;">Player Persona</label>
                                </div>
                                
                                <!-- Search field -->
                                <div style="margin-bottom: 8px;">
                                    <input 
                                        type="text" 
                                        id="klite-rpmod-persona-search"
                                        placeholder="Search personas..."
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                </div>
                                
                                <!-- Tags dropdown -->
                                <div style="margin-bottom: 8px;">
                                    <select 
                                        id="klite-rpmod-persona-tags"
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                        <option value="">All Tags</option>
                                    </select>
                                </div>
                                
                                <!-- Ratings filter -->
                                <div style="margin-bottom: 8px;">
                                    <select 
                                        id="klite-rpmod-persona-rating"
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                        <option value="">All Ratings</option>
                                        <option value="5">★★★★★</option>
                                        <option value="4">★★★★☆</option>
                                        <option value="3">★★★☆☆</option>
                                        <option value="2">★★☆☆☆</option>
                                        <option value="1">★☆☆☆☆</option>
                                    </select>
                                </div>
                                
                                <!-- Persona list -->
                                <div id="klite-rpmod-persona-list" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 4px;">
                                    <!-- Items will be populated here -->
                                </div>
                                
                                <button id="klite-rpmod-persona-button" class="klite-rpmod-button" style="width: 100%; padding: 6px 12px; font-size: 12px; margin-top: 8px;" disabled>Switch</button>
                            </div>
                            
                            <div style="margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <input 
                                        type="checkbox" 
                                        id="klite-rpmod-character-toggle" 
                                        style="margin: 0;"
                                    >
                                    <label for="klite-rpmod-character-toggle" style="font-size: 12px; color: #ccc; margin: 0;">Enable Character in Context</label>
                                </div>
                                
                                <!-- Search field -->
                                <div style="margin-bottom: 8px;">
                                    <input 
                                        type="text" 
                                        id="klite-rpmod-character-search"
                                        placeholder="Search characters..."
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                </div>
                                
                                <!-- Tags dropdown -->
                                <div style="margin-bottom: 8px;">
                                    <select 
                                        id="klite-rpmod-character-tags"
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                        <option value="">All Tags</option>
                                    </select>
                                </div>
                                
                                <!-- Ratings filter -->
                                <div style="margin-bottom: 8px;">
                                    <select 
                                        id="klite-rpmod-character-rating"
                                        style="width: 100%; padding: 6px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;"
                                    >
                                        <option value="">All Ratings</option>
                                        <option value="5">★★★★★</option>
                                        <option value="4">★★★★☆</option>
                                        <option value="3">★★★☆☆</option>
                                        <option value="2">★★☆☆☆</option>
                                        <option value="1">★☆☆☆☆</option>
                                    </select>
                                </div>
                                
                                <!-- Character list -->
                                <div id="klite-rpmod-character-list" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 4px;">
                                    <!-- Items will be populated here -->
                                </div>
                                
                                <button id="klite-rpmod-character-button" class="klite-rpmod-button" style="width: 100%; padding: 6px 12px; font-size: 12px; margin-top: 8px;" disabled>Switch</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Automatic Message Sender -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Automatic Message Sender</h3>
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <button id="klite-rpmod-auto-start" class="klite-rpmod-button" style="width: 100%; padding: 6px; font-size: 12px;">Start</button>
                                <button id="klite-rpmod-auto-pause" class="klite-rpmod-button" style="width: 100%; padding: 6px; font-size: 12px; display: none; background: #4CAF50;">Pause</button>
                                <button id="klite-rpmod-auto-continue" class="klite-rpmod-button" style="width: 100%; padding: 6px; font-size: 12px; display: none;">Continue</button>
                            </div>
                            <div id="klite-rpmod-auto-countdown" style="width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#333 0% 100%); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: white; border: 2px solid #555;">
                                --
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 2px;">
                            <button id="klite-rpmod-auto-stop" class="klite-rpmod-button" style="padding: 6px; font-size: 12px;">Stop</button>
                            <button id="klite-rpmod-auto-reset" class="klite-rpmod-button" style="padding: 6px; font-size: 12px;">Reset</button>
                        </div>   
                        <div style="margin-bottom: 2px;">
                            <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Interval: <span id="klite-rpmod-interval-display">30</span> seconds</label>
                            <input type="range" min="10" max="300" value="30" step="5" class="klite-rpmod-slider" id="klite-rpmod-interval-slider" style="width: 100%;">
                        </div>
                        <div style="margin-bottom: 2px;">
                            <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Start Message:</label>
                            <textarea 
                                id="klite-rpmod-start-message"
                                placeholder="Initial message to send"
                                style="width: 100%; min-height: 40px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 4px; border-radius: 4px; font-size: 11px; resize: vertical;"
                            ></textarea>
                        </div>
                        <div style="margin-bottom: 2px;">
                            <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Automatic Message:</label>
                            <textarea 
                                id="klite-rpmod-auto-message"
                                placeholder="Continue."
                                style="width: 100%; min-height: 40px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 4px; border-radius: 4px; font-size: 11px; resize: vertical;"
                            >Continue.</textarea>
                        </div>                 
                        <div style="margin-bottom: 0;">
                            <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">Quick Slot Messages:</label>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 2px;">
                                ${[1, 2, 3, 4, 5].map(i => `
                                    <div style="display: flex; gap: 2px;">
                                        <input 
                                            type="text" 
                                            id="klite-rpmod-quick-${i}"
                                            placeholder="Quick message ${i}"
                                            style="flex: 1; padding: 3px 4px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 11px;"
                                        >
                                        <button class="klite-rpmod-button klite-rpmod-quick-send" data-slot="${i}" style="width: 26px; padding: 3px; font-size: 11px;">${i}</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize after DOM is ready
        setTimeout(() => {
            this.initializeAll();
        }, 100);
    },
    
    initializeAll() {
        this.loadSavedStates();
        this.initializeRulesField();
        this.initializePresets();
        this.initializeSliders();
        this.initializeLengthSlider();
        this.initializeChatSettings();
        this.initializePersonaAndCharacter();
        this.initializeAutomaticSender();
        this.initializeNarratorButton();
        this.updateButtonStates();
    },
    
    loadSavedStates() {
        // Load rules
        const savedRules = localStorage.getItem('klite-rpmod-rules');
        if (savedRules) {
            this.rules = savedRules;
            const rulesField = document.getElementById('klite-rpmod-rules-field');
            if (rulesField) rulesField.value = savedRules;
        }
        
        // Load auto-save setting
        const autoSaveEnabled = localStorage.getItem('klite-rpmod-autosave-enabled');
        if (autoSaveEnabled !== null) {
            const checkbox = document.getElementById('klite-rpmod-autosave-enabled');
            if (checkbox) checkbox.checked = autoSaveEnabled === 'true';
        }
        
        // Load experimental WI setting
        const experimentalEnabled = localStorage.getItem('klite-rpmod-experimental-wi');
        if (experimentalEnabled !== null) {
            const checkbox = document.getElementById('klite-rpmod-experimental-wi');
            if (checkbox) checkbox.checked = experimentalEnabled === 'true';
        }

        // Load chat settings
        const userName = localStorage.getItem('klite-rpmod-user-name');
        const aiName = localStorage.getItem('klite-rpmod-ai-name');
        if (userName) document.getElementById('klite-rpmod-user-name').value = userName;
        if (aiName) document.getElementById('klite-rpmod-ai-name').value = aiName;
        
        // Load automatic sender settings
        const autoInterval = localStorage.getItem('klite-rpmod-auto-interval');
        const startMessage = localStorage.getItem('klite-rpmod-start-message');
        const autoMessage = localStorage.getItem('klite-rpmod-auto-message');
        const quickMessages = JSON.parse(localStorage.getItem('klite-rpmod-quick-messages') || '["", "", "", "", ""]');
        if (autoInterval) {
            document.getElementById('klite-rpmod-interval-slider').value = autoInterval;
            document.getElementById('klite-rpmod-interval-display').textContent = autoInterval;
            this.automaticSender.interval = parseInt(autoInterval);
        }
        const countdownEl = document.getElementById('klite-rpmod-auto-countdown');
        if (countdownEl) {
            this.countdownEl = countdownEl;
            this.countdownEl.textContent = this.automaticSender.interval;
        }
        if (startMessage) {
            document.getElementById('klite-rpmod-start-message').value = startMessage;
        }
        if (autoMessage) {
            document.getElementById('klite-rpmod-auto-message').value = autoMessage;
            this.automaticSender.autoMessage = autoMessage;
        }
        quickMessages.forEach((msg, i) => {
            const input = document.getElementById(`klite-rpmod-quick-${i + 1}`);
            if (input) {
                input.value = msg;
                this.automaticSender.quickMessages[i] = msg;
            }
        });
        
        // Sync values from Lite settings if available
        this.syncFromLiteSettings();
    },
    
    syncFromLiteSettings() {
        if (typeof localsettings === 'undefined') return;
        
        // Sync user name
        if (localsettings.chatname) {
            document.getElementById('klite-rpmod-user-name').value = localsettings.chatname;
        }
        
        // Sync AI name/character
        if (localsettings.chatopponent) {
            // Handle group chat format
            const opponents = localsettings.chatopponent.split('||$||');
            if (opponents.length === 1) {
                document.getElementById('klite-rpmod-ai-name').value = opponents[0];
            }
        }
        
        // Update max length display and slider
        const maxLength = localsettings.max_length || 512;
        const maxContext = localsettings.max_context_length || 8192;
        
        const selectedDisplay = document.getElementById('klite-rpmod-selected-length');
        const slider = document.getElementById('klite-rpmod-length-slider');
        const maxDisplay = document.getElementById('klite-rpmod-max-context');
        
        if (selectedDisplay) {
            selectedDisplay.textContent = maxLength;
        }
        
        if (slider && maxDisplay) {
            slider.max = maxContext;
            slider.value = maxLength;
            maxDisplay.textContent = maxContext;
            this.lengthSliderValue = maxLength;
        }
    },
    
    updateMaxContext(contextSize) {
        // This function is no longer needed since we're using the values directly from Lite
    },
    
    initializeRulesField() {
        const rulesField = document.getElementById('klite-rpmod-rules-field');
        const saveStatus = document.getElementById('klite-rpmod-rules-save-status');
        const autoSaveCheckbox = document.getElementById('klite-rpmod-autosave-enabled');
        let saveTimer = null;
        
        const saveRules = () => {
            this.rules = rulesField.value;
            localStorage.setItem('klite-rpmod-rules', this.rules);
            
            if (saveStatus) {
                saveStatus.textContent = 'Saved!';
                saveStatus.style.color = '#4a9eff';
                setTimeout(() => {
                    saveStatus.textContent = '';
                }, 2000);
            }
        };
        
        rulesField.addEventListener('input', () => {
            if (autoSaveCheckbox.checked) {
                if (saveStatus) {
                    saveStatus.textContent = 'Typing...';
                    saveStatus.style.color = '#999';
                }
                
                clearTimeout(saveTimer);
                saveTimer = setTimeout(saveRules, 1000);
            }
        });
        
        rulesField.addEventListener('blur', () => {
            if (autoSaveCheckbox.checked) {
                clearTimeout(saveTimer);
                saveRules();
            }
        });
        
        autoSaveCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('klite-rpmod-autosave-enabled', e.target.checked);
            if (e.target.checked && rulesField.value !== this.rules) {
                saveRules();
            }
        });
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
                creativity: 95,  // High
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
        // Sync current values from Lite if available
        if (typeof localsettings !== 'undefined') {
            const creativitySlider = document.getElementById('klite-rpmod-creativity-slider');
            const focusSlider = document.getElementById('klite-rpmod-focus-slider');
            const repetitionSlider = document.getElementById('klite-rpmod-repetition-slider');
            
            if (creativitySlider && localsettings.temperature !== undefined) {
                const tempValue = ((localsettings.temperature - 0.5) / 1.5) * 100;
                creativitySlider.value = Math.max(0, Math.min(100, tempValue));
                this.updateCreativityDisplay(creativitySlider.value);
            }
            
            if (focusSlider && localsettings.top_k !== undefined) {
                const topkValue = ((localsettings.top_k - 10) / 90) * 100;
                focusSlider.value = Math.max(0, Math.min(100, topkValue));
                this.updateFocusDisplay(focusSlider.value);
            }
            
            if (repetitionSlider && localsettings.rep_pen !== undefined) {
                const repValue = ((localsettings.rep_pen - 1.0) / 0.5) * 100;
                repetitionSlider.value = Math.max(0, Math.min(100, repValue));
                this.updateRepetitionDisplay(repetitionSlider.value);
            }
        }
        
        // Add event listeners
        document.getElementById('klite-rpmod-creativity-slider')?.addEventListener('input', (e) => {
            this.updateCreativityDisplay(e.target.value);
            this.applyCreativitySettings(e.target.value);
        });
        
        document.getElementById('klite-rpmod-focus-slider')?.addEventListener('input', (e) => {
            this.updateFocusDisplay(e.target.value);
            this.applyFocusSettings(e.target.value);
        });
        
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
    },

    triggerNarrator() {
        console.log('Triggering narrator from PLAY_RP panel');
        
        const style = document.getElementById('klite-narrator-style')?.value || 'omniscient';
        const focus = document.getElementById('klite-narrator-focus')?.value || 'mixed';
        
        // Get current user input (if any)
        const rpmodInput = document.getElementById('klite-rpmod-input');
        const liteInput = document.getElementById('input_text');
        const input = rpmodInput || liteInput;
        const userText = input ? input.value.trim() : '';
        
        // Build a comprehensive narrator prompt that AIs will understand
        let narratorInstruction = this.buildNarratorInstruction(style, focus);
        
        // Create the full prompt with clear system message formatting
        let fullPrompt = `[NARRATOR: ${narratorInstruction}]`;
        
        // If user had text, append it after the narrator instruction
        if (userText) {
            fullPrompt += '\n\n' + userText;
        }
        
        if (input) {
            // Set the full prompt in the input field
            input.value = fullPrompt;
            
            // Sync both inputs if both exist
            if (rpmodInput) rpmodInput.value = fullPrompt;
            if (liteInput) liteInput.value = fullPrompt;
            
            // Trigger generation
            if (typeof submit_generation_button === 'function') {
                submit_generation_button(false);
                // Clear input after submission
                setTimeout(() => {
                    if (input) input.value = '';
                    if (rpmodInput) rpmodInput.value = '';
                    if (liteInput) liteInput.value = '';
                }, 250);
            } else if (typeof prepare_submit_generation === 'function') {
                prepare_submit_generation();
                // Clear input after submission
                setTimeout(() => {
                    if (input) input.value = '';
                    if (rpmodInput) rpmodInput.value = '';
                    if (liteInput) liteInput.value = '';
                }, 250);
            } else {
                console.error('No submission function available');
            }
        }
    },

    // Helper method in PLAY_RP panel to build better narrator instructions
    buildNarratorInstruction(style, focus) {
        // Base instruction that clearly identifies this as narrator input
        let instruction = "You are now speaking as the story's narrator. ";
        
        // Add style-specific instructions
        switch (style) {
            case 'omniscient':
                instruction += "As an omniscient narrator, describe what all characters are thinking and feeling, reveal hidden information, and provide insights into the broader context. ";
                break;
            case 'limited':
                instruction += "As a limited narrator, describe only what can be observed from the current character's perspective, their thoughts and feelings, but not those of others. ";
                break;
            case 'objective':
                instruction += "As an objective narrator, describe only what can be seen and heard, like a camera recording the scene, without revealing any character's internal thoughts. ";
                break;
        }
        
        // Add focus-specific instructions
        switch (focus) {
            case 'environment':
                instruction += "Focus on describing the setting, atmosphere, weather, sounds, smells, and environmental details that set the scene.";
                break;
            case 'emotions':
                instruction += "Focus on the emotional undertones, character reactions, internal conflicts, and the psychological atmosphere of the scene.";
                break;
            case 'action':
                instruction += "Focus on what is happening, character movements, physical interactions, and the progression of events.";
                break;
            case 'mixed':
                instruction += "Provide a balanced description covering the environment, character emotions, and ongoing actions to paint a complete picture.";
                break;
        }
        
        return instruction;
    },

    initializeNarratorButton() {
        // Wait for button to exist
        setTimeout(() => {
            const button = document.getElementById('klite-rpmod-trigger-narrator-manual');
            if (button) {
                button.addEventListener('click', () => {
                    this.triggerNarrator();
                });
                console.log('Narrator button initialized');
            }
        }, 100);
    },
    
    initializeLengthSlider() {
        const slider = document.getElementById('klite-rpmod-length-slider');
        const selectedDisplay = document.getElementById('klite-rpmod-selected-length');
        
        slider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.lengthSliderValue = value;
            selectedDisplay.textContent = value;
            
            // Update Lite settings if available
            if (typeof localsettings !== 'undefined') {
                localsettings.max_length = value;
                if (typeof save_settings === 'function') {
                    save_settings();
                }
            }
        });
        
        // Load initial values from Lite
        if (typeof localsettings !== 'undefined') {
            if (localsettings.max_length) {
                slider.value = localsettings.max_length;
                selectedDisplay.textContent = localsettings.max_length;
                this.lengthSliderValue = localsettings.max_length;
            }
            if (localsettings.max_context_length) {
                slider.max = localsettings.max_context_length;
                document.getElementById('klite-rpmod-max-context').textContent = localsettings.max_context_length;
            }
        }
    },
    
    initializeChatSettings() {
        const userName = document.getElementById('klite-rpmod-user-name');
        const aiName = document.getElementById('klite-rpmod-ai-name');
        const experimentalWI = document.getElementById('klite-rpmod-experimental-wi');
        
        userName?.addEventListener('change', (e) => {
            localStorage.setItem('klite-rpmod-user-name', e.target.value);
            
            if (typeof localsettings !== 'undefined') {
                localsettings.chatname = e.target.value;
                if (typeof save_settings === 'function') {
                    save_settings();
                }
            }
        });
        
        aiName?.addEventListener('change', (e) => {
            localStorage.setItem('klite-rpmod-ai-name', e.target.value);
            
            if (typeof localsettings !== 'undefined' && localsettings.opmode === 3) {
                localsettings.chatopponent = e.target.value;
                if (typeof save_settings === 'function') {
                    save_settings();
                }
            }
        });
        
        // Experimental WI handler
        experimentalWI?.addEventListener('change', (e) => {
            localStorage.setItem('klite-rpmod-experimental-wi', e.target.checked);
            // Reload character data to include/exclude WI characters
            this.loadCharacterData();
            // Clear current selections if they were WI characters
            if (!e.target.checked) {
                if (this.selectedCharacter?.includes('(WI)')) {
                    this.selectedCharacter = null;
                }
                if (this.selectedPersona?.includes('(WI)')) {
                    this.selectedPersona = null;
                }
            }
            // Reset the search to refresh the display
            const personaSearch = document.getElementById('klite-rpmod-persona-search');
            const characterSearch = document.getElementById('klite-rpmod-character-search');
            if (personaSearch.value || characterSearch.value) {
                this.filterAndDisplayCharacters('persona');
                this.filterAndDisplayCharacters('character');
            }
        });
    },
    
    initializePersonaAndCharacter() {
        const personaToggle = document.getElementById('klite-rpmod-persona-toggle');
        const personaButton = document.getElementById('klite-rpmod-persona-button');
        
        const characterToggle = document.getElementById('klite-rpmod-character-toggle');
        const characterButton = document.getElementById('klite-rpmod-character-button');
        
        // Store character data
        this.allCharacters = [];
        
        // Check if Character Manager instance exists
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        
        if (charManager && charManager.instance && charManager.instance.characters) {
            // Character Manager is already loaded, use its data
            console.log('Character Manager already loaded, using existing data');
            this.loadCharacterData();
            this.showDefaultMessages();
        } else {
            // Character Manager not loaded yet, wait for it
            console.log('Character Manager not loaded, showing default messages');
            this.showDefaultMessages();
            
            // Periodically check if Character Manager loads
            const checkInterval = setInterval(() => {
                const cm = window.KLITE_RPMod_Panels?.CHARS;
                if (cm && cm.instance && cm.instance.characters) {
                    console.log('Character Manager now available, loading data');
                    clearInterval(checkInterval);
                    this.loadCharacterData();
                    // Only update if there's an active search
                    const personaSearch = document.getElementById('klite-rpmod-persona-search');
                    const characterSearch = document.getElementById('klite-rpmod-character-search');
                    if (personaSearch?.value || characterSearch?.value) {
                        this.filterAndDisplayCharacters('persona');
                        this.filterAndDisplayCharacters('character');
                    }
                }
            }, 1000);
        }
        
        // Initialize search and filter functionality
        this.initializeCharacterFilters();
        
        // Show default messages
        this.showDefaultMessages();
        
        // Persona handlers
        personaToggle?.addEventListener('change', (e) => {
            this.personaEnabled = e.target.checked;
            personaButton.disabled = !e.target.checked;
            this.updateButtonStates();
        });
        
        personaButton?.addEventListener('click', () => {
            const selectedItem = document.querySelector('#klite-rpmod-persona-list .klite-rpmod-character-item.selected');
            if (selectedItem) {
                this.selectedPersona = selectedItem.dataset.name;
                // Apply persona logic here
                console.log('Selected persona:', this.selectedPersona);
            }
        });
        
        // Character handlers
        characterToggle?.addEventListener('change', (e) => {
            this.characterEnabled = e.target.checked;
            characterButton.disabled = !e.target.checked;
            this.updateButtonStates();
        });
        
        characterButton?.addEventListener('click', () => {
            const selectedItem = document.querySelector('#klite-rpmod-character-list .klite-rpmod-character-item.selected');
            if (selectedItem) {
                this.selectedCharacter = selectedItem.dataset.name;
                // Update AI name field
                const charName = this.selectedCharacter.replace(' (WI)', '');
                document.getElementById('klite-rpmod-ai-name').value = charName;
                document.getElementById('klite-rpmod-ai-name').dispatchEvent(new Event('change'));
            }
        });
    },

    showDefaultMessages() {
        const personaList = document.getElementById('klite-rpmod-persona-list');
        const characterList = document.getElementById('klite-rpmod-character-list');
        
        personaList.innerHTML = '<div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">Search for personas to populate this list...</div>';
        characterList.innerHTML = '<div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">Search for characters to populate this list...</div>';
    },

    loadCharacterData() {
        this.allCharacters = [];
        const allTags = new Set();
        
        console.log('Loading character data...');
        
        // Get the Character Manager instance
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        
        if (!charManager || !charManager.instance) {
            console.log('Character Manager instance not found');
            return;
        }
        
        // Access the characters array directly from the instance
        const characters = charManager.instance.characters;
        
        console.log('Found characters:', characters);
        
        if (characters && Array.isArray(characters)) {
            console.log('Processing', characters.length, 'characters');
            
            // Process characters
            characters.forEach(char => {
                console.log('Processing character:', char);
                
                // Calculate token count
                const desc = char.description || '';
                const personality = char.rawData?.personality || '';
                const tokenCount = this.estimateTokens(desc + ' ' + personality);
                
                // Collect tags
                if (char.tags && Array.isArray(char.tags)) {
                    char.tags.forEach(tag => allTags.add(tag));
                }
                
                // Store character data
                this.allCharacters.push({
                    name: char.name,
                    avatar: char.image || char.rawData?._imageData || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy/yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTUiIGZpbGw9IiM0NDQiLz48L3N2Zz4=',
                    tags: char.tags || [],
                    rating: char.rating || 0,
                    tokenCount: tokenCount,
                    description: char.description || '',
                    personality: char.rawData?.personality || '',
                    rawData: char.rawData
                });
            });
        }
        
        // Check if experimental WI mode is enabled
        const experimentalEnabled = localStorage.getItem('klite-rpmod-experimental-wi') === 'true';
        
        if (experimentalEnabled && typeof current_wi !== 'undefined' && Array.isArray(current_wi)) {
            console.log('Processing WI entries...');
            
            // Add WI characters
            current_wi.forEach(entry => {
                if (entry.comment && entry.comment.includes('_imported_memory')) {
                    const charName = entry.comment.replace('_imported_memory', '');
                    const tokenCount = this.estimateTokens(entry.content || '');
                    
                    this.allCharacters.push({
                        name: charName + ' (WI)',
                        avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTUiIGZpbGw9IiM2NjYiLz48L3N2Zz4=',
                        tags: [],
                        rating: 0,
                        tokenCount: tokenCount,
                        description: entry.content || '',
                        personality: '',
                        isWI: true
                    });
                }
            });
        }
        
        console.log('Total characters loaded:', this.allCharacters.length);
        
        // Populate tag dropdowns
        const personaTags = document.getElementById('klite-rpmod-persona-tags');
        const characterTags = document.getElementById('klite-rpmod-character-tags');
        
        if (personaTags) {
            personaTags.innerHTML = '<option value="">All Tags</option>';
            allTags.forEach(tag => {
                personaTags.innerHTML += `<option value="${tag}">${tag}</option>`;
            });
        }
        
        if (characterTags) {
            characterTags.innerHTML = '<option value="">All Tags</option>';
            allTags.forEach(tag => {
                characterTags.innerHTML += `<option value="${tag}">${tag}</option>`;
            });
        }
    },

    initializeCharacterFilters() {
        // Persona filters
        const personaSearch = document.getElementById('klite-rpmod-persona-search');
        const personaTags = document.getElementById('klite-rpmod-persona-tags');
        const personaRating = document.getElementById('klite-rpmod-persona-rating');
        
        personaSearch?.addEventListener('input', (e) => {
            if (e.target.value.trim() || personaTags.value || personaRating.value) {
                this.filterAndDisplayCharacters('persona');
            } else {
                this.showDefaultMessages();
            }
        });
        
        personaTags?.addEventListener('change', () => {
            if (personaSearch.value.trim() || personaTags.value || personaRating.value) {
                this.filterAndDisplayCharacters('persona');
            } else {
                this.showDefaultMessages();
            }
        });
        
        personaRating?.addEventListener('change', () => {
            if (personaSearch.value.trim() || personaTags.value || personaRating.value) {
                this.filterAndDisplayCharacters('persona');
            } else {
                this.showDefaultMessages();
            }
        });
        
        // Character filters
        const characterSearch = document.getElementById('klite-rpmod-character-search');
        const characterTags = document.getElementById('klite-rpmod-character-tags');
        const characterRating = document.getElementById('klite-rpmod-character-rating');
        
        characterSearch?.addEventListener('input', (e) => {
            if (e.target.value.trim() || characterTags.value || characterRating.value) {
                this.filterAndDisplayCharacters('character');
            } else {
                this.showDefaultMessages();
            }
        });
        
        characterTags?.addEventListener('change', () => {
            if (characterSearch.value.trim() || characterTags.value || characterRating.value) {
                this.filterAndDisplayCharacters('character');
            } else {
                this.showDefaultMessages();
            }
        });
        
        characterRating?.addEventListener('change', () => {
            if (characterSearch.value.trim() || characterTags.value || characterRating.value) {
                this.filterAndDisplayCharacters('character');
            } else {
                this.showDefaultMessages();
            }
        });
    },

    filterAndDisplayCharacters(type) {
        const searchInput = document.getElementById(`klite-rpmod-${type}-search`);
        const tagsSelect = document.getElementById(`klite-rpmod-${type}-tags`);
        const ratingSelect = document.getElementById(`klite-rpmod-${type}-rating`);
        const list = document.getElementById(`klite-rpmod-${type}-list`);
        
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const selectedTag = tagsSelect?.value || '';
        const selectedRating = ratingSelect?.value || '';
        
        // Filter characters
        const filteredCharacters = this.allCharacters.filter(char => {
            let matches = true;
            
            // Search filter
            if (searchTerm && !char.name.toLowerCase().includes(searchTerm)) {
                matches = false;
            }
            
            // Tag filter
            if (selectedTag && !char.tags.includes(selectedTag)) {
                matches = false;
            }
            
            // Rating filter
            if (selectedRating && char.rating != selectedRating) {
                matches = false;
            }
            
            return matches;
        });
        
        // Display filtered results
        if (filteredCharacters.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">No matching characters found.</div>';
        } else {
            list.innerHTML = '';
            
            filteredCharacters.forEach(char => {
                const itemHTML = `
                    <div class="klite-rpmod-character-item" 
                        data-name="${char.name}"
                        data-tags="${char.tags.join(',')}"
                        data-rating="${char.rating}"
                        style="display: flex; align-items: center; padding: 6px; margin-bottom: 4px; cursor: pointer; border-radius: 4px; transition: background 0.2s;">
                        <img src="${char.avatar}" 
                            style="width: 32px; height: 32px; border-radius: 4px; margin-right: 8px; object-fit: cover;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 12px; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${char.name}
                            </div>
                            <div style="font-size: 10px; color: #999;">
                                ${char.tokenCount} tokens
                            </div>
                        </div>
                    </div>
                `;
                
                list.innerHTML += itemHTML;
            });
            
            // Add click handlers to new items
            this.addCharacterItemHandlers(type);
        }
    },

    addCharacterItemHandlers(type = null) {
        const addHandlersToList = (listId) => {
            const items = document.querySelectorAll(`#${listId} .klite-rpmod-character-item`);
            items.forEach(item => {
                item.addEventListener('click', () => {
                    items.forEach(i => {
                        i.classList.remove('selected');
                        i.style.background = '';
                    });
                    item.classList.add('selected');
                    item.style.background = 'rgba(74, 158, 255, 0.2)';
                });
                
                // Hover effect
                item.addEventListener('mouseenter', () => {
                    if (!item.classList.contains('selected')) {
                        item.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                });
                
                item.addEventListener('mouseleave', () => {
                    if (!item.classList.contains('selected')) {
                        item.style.background = '';
                    }
                });
            });
        };
        
        if (type === 'persona' || !type) {
            addHandlersToList('klite-rpmod-persona-list');
        }
        
        if (type === 'character' || !type) {
            addHandlersToList('klite-rpmod-character-list');
        }
    },
    
    estimateTokens(text) {
        // Simple token estimation: ~1 token per 4 characters
        return Math.ceil(text.length / 4);
    },
    
    initializeAutomaticSender() {
        const intervalSlider = document.getElementById('klite-rpmod-interval-slider');
        const intervalDisplay = document.getElementById('klite-rpmod-interval-display');
        const countdownEl = document.getElementById('klite-rpmod-auto-countdown');
        const startMessage = document.getElementById('klite-rpmod-start-message');
        const autoMessage = document.getElementById('klite-rpmod-auto-message');
        
        // Store countdown element reference
        this.countdownEl = countdownEl;
        
        // Initialize countdown display with interval value
        if (this.countdownEl) {
            this.countdownEl.textContent = this.automaticSender.interval;
        }
        
        const startBtn = document.getElementById('klite-rpmod-auto-start');
        const pauseBtn = document.getElementById('klite-rpmod-auto-pause');
        const continueBtn = document.getElementById('klite-rpmod-auto-continue');
        const stopBtn = document.getElementById('klite-rpmod-auto-stop');
        const resetBtn = document.getElementById('klite-rpmod-auto-reset');
        
        // Quick message handlers
        const quickInputs = document.querySelectorAll('[id^="klite-rpmod-quick-"]');
        quickInputs.forEach((input, index) => {
            input.addEventListener('change', (e) => {
                this.automaticSender.quickMessages[index] = e.target.value;
                localStorage.setItem('klite-rpmod-quick-messages', JSON.stringify(this.automaticSender.quickMessages));
            });
        });
        
        const quickButtons = document.querySelectorAll('.klite-rpmod-quick-send');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = parseInt(btn.dataset.slot) - 1;
                const message = this.automaticSender.quickMessages[slot];
                if (message) {
                    this.sendQuickMessage(message);
                }
            });
        });
        
        // Auto sender controls
        intervalSlider?.addEventListener('input', (e) => {
            this.automaticSender.interval = parseInt(e.target.value);
            intervalDisplay.textContent = e.target.value;
            localStorage.setItem('klite-rpmod-auto-interval', e.target.value);
            
            // Update countdown display when interval changes
            if (!this.automaticSender.isStarted && this.countdownEl) {
                this.countdownEl.textContent = this.automaticSender.interval;
            }
        });
        
        startMessage?.addEventListener('change', (e) => {
            localStorage.setItem('klite-rpmod-start-message', e.target.value);
        });
        
        autoMessage?.addEventListener('change', (e) => {
            this.automaticSender.autoMessage = e.target.value;
            localStorage.setItem('klite-rpmod-auto-message', e.target.value);
        });
        
        // Control buttons
        startBtn?.addEventListener('click', () => {
            // Check if we're resuming from a stop
            const isResuming = this.automaticSender.currentCount > 0;
            
            if (!isResuming) {
                // Send start message only on initial start
                const startMsg = document.getElementById('klite-rpmod-start-message').value;
                if (startMsg) {
                    this.sendMessage(startMsg);
                }
            }
            
            // Start timer
            this.automaticSender.isStarted = true;
            this.automaticSender.isPaused = false;
            this.startAutomaticTimer();
            
            // Update UI
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
        });
        
        pauseBtn?.addEventListener('click', () => {
            this.automaticSender.isPaused = true;
            clearInterval(this.automaticSender.timer);
            
            // Let current generation finish
            pauseBtn.style.display = 'none';
            continueBtn.style.display = 'block';
        });
        
        continueBtn?.addEventListener('click', () => {
            this.automaticSender.isPaused = false;
            this.startAutomaticTimer();
            
            continueBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
        });
        
        stopBtn?.addEventListener('click', () => {
            clearInterval(this.automaticSender.timer);
            this.automaticSender.isStarted = false;
            this.automaticSender.isPaused = false;
            
            // Update UI to show Continue instead of Start
            const startBtn = document.getElementById('klite-rpmod-auto-start');
            const pauseBtn = document.getElementById('klite-rpmod-auto-pause');
            const continueBtn = document.getElementById('klite-rpmod-auto-continue');
            
            //Continue after Stop
            startBtn.textContent = 'Continue';
            startBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
            continueBtn.style.display = 'none';
            
            // Abort current generation if any
            if (typeof abort_generation === 'function') {
                abort_generation();
            }
        });
        
        resetBtn?.addEventListener('click', () => {
            // Full reset
            this.stopAutomaticSender();
            this.automaticSender.currentCount = 0;
            
            // Reset button text
            const startBtn = document.getElementById('klite-rpmod-auto-start');
            startBtn.textContent = 'Start';
            
            // Reset countdown display
            if (this.countdownEl) {
                this.countdownEl.textContent = this.automaticSender.interval;
                this.countdownEl.style.background = 'conic-gradient(#333 0% 100%)';
            }
            
            // Abort current generation if any
            if (typeof abort_generation === 'function') {
                abort_generation();
            }
            
            // Reset UI
            startBtn.style.display = 'block';
            document.getElementById('klite-rpmod-auto-pause').style.display = 'none';
            document.getElementById('klite-rpmod-auto-continue').style.display = 'none';
        });
    },
    
    startAutomaticTimer() {
        clearInterval(this.automaticSender.timer);
        
        // Update display immediately when starting
        if (this.countdownEl && this.automaticSender.isStarted && !this.automaticSender.isPaused) {
            const remaining = this.automaticSender.interval - this.automaticSender.currentCount;
            this.countdownEl.textContent = remaining;
        }
        
        this.automaticSender.timer = setInterval(() => {
            if (!this.automaticSender.isPaused && this.automaticSender.isStarted) {
                this.automaticSender.currentCount++;
                
                if (this.automaticSender.currentCount >= this.automaticSender.interval) {
                    this.automaticSender.currentCount = 0;
                    const message = document.getElementById('klite-rpmod-auto-message').value;
                    if (message) {
                        this.sendMessage(message);
                    }
                }
                
                // Update countdown display
                if (this.countdownEl) {
                    const remaining = this.automaticSender.interval - this.automaticSender.currentCount;
                    const progress = (this.automaticSender.currentCount / this.automaticSender.interval) * 100;
                    
                    // Update text
                    this.countdownEl.textContent = remaining;
                    
                    // Update visual progress
                    this.countdownEl.style.background = `conic-gradient(#4a9eff 0% ${progress}%, #333 ${progress}% 100%)`;
                }
            }
        }, 1000);
    },
    
    stopAutomaticSender() {
        clearInterval(this.automaticSender.timer);
        this.automaticSender.isStarted = false;
        this.automaticSender.isPaused = false;
        this.automaticSender.currentCount = 0;
        
        const startBtn = document.getElementById('klite-rpmod-auto-start');
        const pauseBtn = document.getElementById('klite-rpmod-auto-pause');
        const continueBtn = document.getElementById('klite-rpmod-auto-continue');
        
        // Reset button text to Start
        startBtn.textContent = 'Start';
        
        startBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
        continueBtn.style.display = 'none';

        // Reset countdown display to full interval
        if (this.countdownEl) {
            this.countdownEl.textContent = this.automaticSender.interval;
            this.countdownEl.style.background = 'conic-gradient(#333 0% 100%)';
        }
    },
    
    sendQuickMessage(message) {
        // Abort any ongoing generation
        if (typeof abort_generation === 'function') {
            abort_generation();
        }
        
        // Reset automatic sender timer
        this.automaticSender.currentCount = 0;
        
        // Send the message
        this.sendMessage(message);
    },
    
    sendMessage(message) {
        // Inject message and submit
        const inputField = document.getElementById('input_text');
        if (inputField && typeof submit_generation_button === 'function') {
            inputField.value = message;
            
            // Inject persona/character if enabled
            this.injectContextIfNeeded(() => {
                submit_generation_button();
            });
        }
    },
    
    injectContextIfNeeded(callback) {
        const memoryField = document.getElementById('memorytext');
        if (!memoryField) {
            callback();
            return;
        }
        
        const originalMemory = memoryField.value;
        let injectedContent = originalMemory;
        
        // Inject rules
        if (this.rules) {
            injectedContent += '\n\n[Rules for AI Behavior]\n' + this.rules;
        }
        
        // Inject persona
        if (this.personaEnabled && this.selectedPersona) {
            injectedContent += '\n\n[Player Persona]\n' + this.getPersonaContent(this.selectedPersona);
        }
        
        // Inject character
        if (this.characterEnabled && this.selectedCharacter) {
            injectedContent += '\n\n[Character]\n' + this.getCharacterContent(this.selectedCharacter);
        }
        
        if (injectedContent !== originalMemory) {
            memoryField.value = injectedContent;
            
            // Execute callback
            callback();
            
            // Restore original memory after a delay
            setTimeout(() => {
                memoryField.value = originalMemory;
            }, 100);
        } else {
            callback();
        }
    },
    
    getPersonaContent(personaName) {
        // Get persona content from stored character data
        const persona = this.allCharacters.find(c => c.name === personaName);
        if (persona) {
            return persona.description || '';
        }
        return '';
    },
        
    getCharacterContent(characterName) {
        // Get character content from stored character data
        const character = this.allCharacters.find(c => c.name === characterName);
        if (character) {
            // Combine description and personality if both exist
            let content = character.description || '';
            if (character.personality) {
                content += '\n\n[Personality]\n' + character.personality;
            }
            return content;
        }
        return '';
    },
    updateButtonStates() {
        // Update all button states based on enabled/disabled status
        const buttons = document.querySelectorAll('.klite-rpmod-button');
        buttons.forEach(btn => {
            // Check if button should be disabled based on parent state
            const isDisabled = btn.disabled || btn.closest('[disabled]');
            if (isDisabled) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }
};