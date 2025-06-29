// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - NOTES Panel Implementation
// Dual notes system with full Lite integration
// Personal notes sync with Lite's inputbox system
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.NOTES = {
    // Configuration
    DEBOUNCE_DELAY: 1000,
    
    // State
    initialized: false,
    personalDebounceTimer: null,
    authorDebounceTimer: null,
    isUpdatingPersonal: false,
    isUpdatingAuthor: false,
    
    // References
    personalTextarea: null,
    authorTextarea: null,
    litePersonalTextarea: null,
    liteAnoteTextarea: null,
    tokenCounter: null,
    
    load(container, panel) {
        console.log('📝 Loading NOTES panel');
        
        // Clean up any existing instance
        this.cleanup();
        
        // Build the UI
        container.innerHTML = this.buildHTML();
        
        // Initialize after DOM is ready
        setTimeout(() => {
            this.initialize();
        }, 100);
    },
    
    buildHTML() {
        return `
            <div class="klite-rpmod-notes-panel" style="
                width: 100%; 
                height: 100%; 
                display: flex; 
                flex-direction: column; 
                padding: 0;
            ">
                <!-- Personal Notes Section (Top Half) -->
                <div class="klite-rpmod-notes-section" style="
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    padding: 15px; 
                    border-bottom: 1px solid #333;
                ">
                    <div class="klite-rpmod-notes-header" style="margin-bottom: 10px;">
                        <h3 style="
                            margin: 0 0 5px 0; 
                            color: #e0e0e0; 
                            font-size: 14px; 
                            font-weight: 500;
                        ">
                            📝 Personal Notes
                        </h3>
                        <span style="color: #666; font-size: 11px;">
                            Private notes - saved with your story
                        </span>
                    </div>
                    
                    <textarea 
                        id="klite-rpmod-personal-notes"
                        placeholder="Keep track of plot points, character details, ideas..."
                        style="
                            flex: 1;
                            width: 100%;
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #444;
                            border-radius: 4px;
                            color: #e0e0e0;
                            padding: 10px;
                            font-size: 13px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            resize: none;
                            margin-top: 8px;
                            box-sizing: border-box;
                            transition: border-color 0.2s ease;
                        "
                        spellcheck="true"
                    ></textarea>
                    
                    <div class="klite-rpmod-notes-status" style="
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 5px;
                    ">
                        <span id="klite-rpmod-personal-status" style="
                            color: #666; 
                            font-size: 11px;
                            transition: color 0.3s ease;
                        "></span>
                        <span style="color: #666; font-size: 11px;">Syncs with Lite</span>
                    </div>
                </div>

                <!-- Author's Note Section (Bottom Half) -->
                <div class="klite-rpmod-notes-section" style="
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    padding: 15px;
                ">
                    <div class="klite-rpmod-notes-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    ">
                        <div>
                            <h3 style="
                                margin: 0 0 5px 0; 
                                color: #e0e0e0; 
                                font-size: 14px; 
                                font-weight: 500;
                            ">
                                ✍️ Author's Note
                            </h3>
                            <span style="color: #666; font-size: 11px;">
                                Injected into context for AI guidance
                            </span>
                        </div>
                        <span id="klite-rpmod-anote-tokens" style="
                            color: #666;
                            font-size: 11px;
                            background: #1a1a1a;
                            padding: 2px 8px;
                            border-radius: 3px;
                            border: 1px solid #333;
                        ">
                            0 tokens
                        </span>
                    </div>
                    
                    <textarea 
                        id="klite-rpmod-author-notes"
                        placeholder="Style: epic fantasy. Focus on character emotions. Use vivid descriptions."
                        style="
                            flex: 1;
                            width: 100%;
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid #444;
                            border-radius: 4px;
                            color: #e0e0e0;
                            padding: 10px;
                            font-size: 13px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            resize: none;
                            margin-top: 8px;
                            box-sizing: border-box;
                            transition: border-color 0.2s ease;
                        "
                        spellcheck="true"
                    ></textarea>
                    
                    <div class="klite-rpmod-notes-status" style="
                        display: flex; 
                        justify-content: space-between; 
                        margin-top: 5px;
                    ">
                        <span id="klite-rpmod-author-status" style="
                            color: #666; 
                            font-size: 11px;
                            transition: color 0.3s ease;
                        "></span>
                        <span style="color: #666; font-size: 11px;">Syncs with AI context</span>
                    </div>

                    <!-- Author's Note Configuration -->
                    <div class="klite-rpmod-anote-config" style="
                        margin-top: 12px; 
                        padding: 12px; 
                        background: rgba(255, 255, 255, 0.03); 
                        border: 1px solid #333; 
                        border-radius: 6px;
                    ">
                        <div style="
                            display: flex; 
                            align-items: center; 
                            justify-content: space-between; 
                            margin-bottom: 10px;
                        ">
                            <h4 style="
                                margin: 0; 
                                color: #999; 
                                font-size: 12px; 
                                font-weight: 500;
                            ">
                                Injection Settings
                            </h4>
                            <div style="font-size: 8px; color: #999; font-family: monospace;">Chat/RP/Adv automatically @depth</div>
                        </div>
                        
                        <!-- Injection Depth Controls -->
                        <div style="
                            display: flex; 
                            align-items: center; 
                            gap: 10px;
                        ">
                            <label style="
                                color: #999; 
                                font-size: 12px;
                                min-width: 40px;
                            ">
                                Depth:
                            </label>
                            <select id="klite-rpmod-anote-depth" style="
                                flex: 1;
                                background: #1a1a1a;
                                border: 1px solid #444;
                                border-radius: 3px;
                                color: #e0e0e0;
                                padding: 4px 8px;
                                font-size: 12px;
                                cursor: pointer;
                            ">
                                <option value="1">1 - Very end</option>
                                <option value="160">2 - 160 tokens from end</option>
                                <option value="320" selected>3 - 320 tokens from end (Default)</option>
                                <option value="480">5 - 480 tokens from end</option>
                                <option value="640">8 - 640 tokens from end</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    initialize() {
        console.log('🚀 Initializing NOTES panel');
        
        // Get references
        this.personalTextarea = document.getElementById('klite-rpmod-personal-notes');
        this.authorTextarea = document.getElementById('klite-rpmod-author-notes');
        this.litePersonalTextarea = document.getElementById('inputboxcontainerinputarea');
        this.liteAnoteTextarea = document.getElementById('anotetext');
        this.tokenCounter = document.getElementById('klite-rpmod-anote-tokens');
        
        if (!this.personalTextarea || !this.authorTextarea) {
            console.error('❌ NOTES: Required elements not found');
            return;
        }
        
        // Initialize Lite's fields if needed
        this.ensureLiteFieldsInitialized();
        
        // Load saved values
        this.loadPersonalNotes();
        this.loadAuthorNotes();
        this.loadAuthorNoteSettings();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Set up sync monitoring
        this.setupSyncMonitoring();
        
        // Update token count
        this.updateTokenCount();
        
        this.initialized = true;
        console.log('✅ NOTES panel initialized');
    },
    
    ensureLiteFieldsInitialized() {
        // Ensure personal notes field exists
        if (!this.litePersonalTextarea) {
            console.log('🔧 Creating Lite personal notes field');
            
            // Check if container exists
            let container = document.getElementById('inputboxcontainer');
            if (!container) {
                // Create minimal container structure
                container = document.createElement('div');
                container.id = 'inputboxcontainer';
                container.style.display = 'none';
                
                const textarea = document.createElement('textarea');
                textarea.id = 'inputboxcontainerinputarea';
                textarea.className = 'form-control';
                container.appendChild(textarea);
                
                document.body.appendChild(container);
                
                this.litePersonalTextarea = textarea;
            }
        }
        
        // Ensure author note field exists
        if (!this.liteAnoteTextarea) {
            console.log('🔧 Initializing Lite author note');
            
            // Try to trigger memory panel creation (which includes author note)
            if (typeof btn_memory === 'function') {
                // Create temporary container if needed
                if (!document.getElementById('memory_tab_container')) {
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'memory_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                }
                
                // Initialize memory panel
                btn_memory();
                
                // Re-get reference
                this.liteAnoteTextarea = document.getElementById('anotetext');
            }
        }
    },
    
    loadPersonalNotes() {
        // Load from Lite's notebox in localsettings
        let notes = '';
        
        if (typeof localsettings !== 'undefined' && localsettings.notebox) {
            notes = localsettings.notebox;
        } else if (this.litePersonalTextarea) {
            notes = this.litePersonalTextarea.value;
        } else if (typeof window.inputbox_text !== 'undefined') {
            notes = window.inputbox_text;
        }
        
        this.personalTextarea.value = notes;
    },
    
    loadAuthorNotes() {
        // Get value from Lite or localsettings
        let anoteValue = '';
        
        if (this.liteAnoteTextarea) {
            anoteValue = this.liteAnoteTextarea.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.anotetext) {
            anoteValue = localsettings.anotetext;
        } else if (typeof current_anote !== 'undefined') {
            anoteValue = current_anote;
        }
        
        this.authorTextarea.value = anoteValue;
    },
    
    loadAuthorNoteSettings() {
        const depthSelect = document.getElementById('klite-rpmod-anote-depth');
        const depthDesc = document.getElementById('klite-rpmod-anote-depth-desc');
        
        if (depthSelect && typeof localsettings !== 'undefined') {
            const currentStrength = localsettings.anote_strength || 320;
            depthSelect.value = currentStrength;
            
            // Update description
            this.updateDepthDescription(currentStrength, depthDesc);
        }
    },
    
    setupEventHandlers() {
        // Personal notes handlers
        this.personalTextarea.addEventListener('input', () => {
            this.handlePersonalNotesInput();
        });
        
        this.personalTextarea.addEventListener('focus', () => {
            this.personalTextarea.style.borderColor = '#4a90e2';
        });
        
        this.personalTextarea.addEventListener('blur', () => {
            this.personalTextarea.style.borderColor = '#444';
        });
        
        // Author notes handlers
        this.authorTextarea.addEventListener('input', () => {
            this.handleAuthorNotesInput();
        });
        
        this.authorTextarea.addEventListener('focus', () => {
            this.authorTextarea.style.borderColor = '#4a90e2';
        });
        
        this.authorTextarea.addEventListener('blur', () => {
            this.authorTextarea.style.borderColor = '#444';
        });
        
        // Depth selector handler
        const depthSelect = document.getElementById('klite-rpmod-anote-depth');
        const depthDesc = document.getElementById('klite-rpmod-anote-depth-desc');
        
        if (depthSelect) {
            depthSelect.addEventListener('change', (e) => {
                this.handleDepthChange(e.target.value, depthDesc);
            });
        }
    },
    
    setupSyncMonitoring() {
        // Monitor localsettings.notebox for changes
        if (typeof localsettings !== 'undefined') {
            let lastNotebox = localsettings.notebox || '';
            setInterval(() => {
                if (!this.isUpdatingPersonal && localsettings.notebox !== lastNotebox) {
                    this.personalTextarea.value = localsettings.notebox || '';
                    lastNotebox = localsettings.notebox || '';
                }
            }, 500);
        }
        
        // Monitor Lite's personal notes field for external changes (if it exists)
        if (this.litePersonalTextarea) {
            // Use MutationObserver for value changes
            const personalObserver = new MutationObserver(() => {
                if (!this.isUpdatingPersonal) {
                    this.syncPersonalNotesFromLite();
                }
            });
            
            personalObserver.observe(this.litePersonalTextarea, {
                attributes: true,
                attributeFilter: ['value']
            });
            
            // Also monitor input events
            this.litePersonalTextarea.addEventListener('input', () => {
                if (!this.isUpdatingPersonal) {
                    this.syncPersonalNotesFromLite();
                }
            });
        }
        
        // Monitor Lite's author note field for external changes
        if (this.liteAnoteTextarea) {
            // Use MutationObserver for value changes
            const authorObserver = new MutationObserver(() => {
                if (!this.isUpdatingAuthor) {
                    this.syncAuthorNoteFromLite();
                }
            });
            
            authorObserver.observe(this.liteAnoteTextarea, {
                attributes: true,
                attributeFilter: ['value']
            });
            
            // Also monitor input events
            this.liteAnoteTextarea.addEventListener('input', () => {
                if (!this.isUpdatingAuthor) {
                    this.syncAuthorNoteFromLite();
                }
            });
        }
    },
    
    handlePersonalNotesInput() {
        const personalStatus = document.getElementById('klite-rpmod-personal-status');
        
        // Show typing status
        personalStatus.textContent = 'Typing...';
        personalStatus.style.color = '#999';
        
        // Clear existing timer
        if (this.personalDebounceTimer) {
            clearTimeout(this.personalDebounceTimer);
        }
        
        // Debounce save
        this.personalDebounceTimer = setTimeout(() => {
            this.savePersonalNotes();
            
            // Show saved status
            personalStatus.textContent = '✓ Synced';
            personalStatus.style.color = '#5cb85c';
            
            // Clear status after delay
            setTimeout(() => {
                personalStatus.textContent = '';
            }, 2000);
        }, this.DEBOUNCE_DELAY);
    },
    
    handleAuthorNotesInput() {
        const authorStatus = document.getElementById('klite-rpmod-author-status');
        
        // Show typing status
        authorStatus.textContent = 'Typing...';
        authorStatus.style.color = '#999';
        
        // Update token count immediately
        this.updateTokenCount();
        
        // Clear existing timer
        if (this.authorDebounceTimer) {
            clearTimeout(this.authorDebounceTimer);
        }
        
        // Debounce save
        this.authorDebounceTimer = setTimeout(() => {
            this.saveAuthorNotes();
            
            // Show saved status
            authorStatus.textContent = '✓ Synced';
            authorStatus.style.color = '#5cb85c';
            
            // Clear status after delay
            setTimeout(() => {
                authorStatus.textContent = '';
            }, 2000);
        }, this.DEBOUNCE_DELAY);
    },
    
    handleDepthChange(value, descElement) {
        // Update Lite's setting
        if (typeof localsettings !== 'undefined') {
            localsettings.anote_strength = parseInt(value);
            
            // Save settings
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
        
        // Update Lite's UI
        const liteStrength = document.getElementById('anote_strength');
        if (liteStrength) {
            liteStrength.value = value;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            liteStrength.dispatchEvent(event);
        }
        
        // Update description
        this.updateDepthDescription(value, descElement);
    },
    
    updateDepthDescription(value, descElement) {
        if (!descElement) return;
        
        const descriptions = {
            '1': 'Very end',
            '160': '160 tokens',
            '320': '320 tokens',
            '480': '480 tokens',
            '640': '640 tokens'
        };
        
        descElement.textContent = descriptions[value] || '320 tokens';
    },
    
    savePersonalNotes() {
        const content = this.personalTextarea.value;
        this.isUpdatingPersonal = true;
        
        try {
            // Update Lite's localsettings.notebox
            if (typeof localsettings !== 'undefined') {
                localsettings.notebox = content;
                
                // Save settings to persist
                if (typeof save_settings === 'function') {
                    save_settings();
                }
            }
            
            // Also update the textarea if it exists
            if (this.litePersonalTextarea) {
                this.litePersonalTextarea.value = content;
                
                // Trigger input event for Lite's handlers
                const event = new Event('input', { bubbles: true });
                this.litePersonalTextarea.dispatchEvent(event);
            }
            
            // Update global variable
            if (typeof window.inputbox_text !== 'undefined') {
                window.inputbox_text = content;
            }
            
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdatingPersonal = false;
            }, 50);
        }
    },
    
    saveAuthorNotes() {
        const content = this.authorTextarea.value;
        this.isUpdatingAuthor = true;
        
        try {
            // Update Lite's textarea
            if (this.liteAnoteTextarea) {
                this.liteAnoteTextarea.value = content;
                
                // Trigger input event for Lite's handlers
                const event = new Event('input', { bubbles: true });
                this.liteAnoteTextarea.dispatchEvent(event);
            }
            
            // Update global variables
            if (typeof localsettings !== 'undefined') {
                localsettings.anotetext = content;
            }
            if (typeof current_anote !== 'undefined') {
                current_anote = content;
            }
            
            // Call Lite's confirm function
            if (typeof confirm_memory === 'function') {
                confirm_memory();
            }
            
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdatingAuthor = false;
            }, 50);
        }
    },
    
    syncPersonalNotesFromLite() {
        // Check multiple sources for personal notes
        let notes = '';
        
        if (typeof localsettings !== 'undefined' && localsettings.notebox) {
            notes = localsettings.notebox;
        } else if (this.litePersonalTextarea && this.litePersonalTextarea.value) {
            notes = this.litePersonalTextarea.value;
        } else if (typeof window.inputbox_text !== 'undefined') {
            notes = window.inputbox_text;
        }
        
        if (this.personalTextarea.value !== notes) {
            this.personalTextarea.value = notes;
        }
    },
    
    syncAuthorNoteFromLite() {
        if (this.liteAnoteTextarea && this.authorTextarea.value !== this.liteAnoteTextarea.value) {
            this.authorTextarea.value = this.liteAnoteTextarea.value;
            this.updateTokenCount();
        }
    },
    
    updateTokenCount() {
        if (!this.tokenCounter || !this.authorTextarea) return;
        
        const text = this.authorTextarea.value;
        
        // Use Lite's token counting if available
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(text);
                const count = Array.isArray(tokens) ? tokens.length : 0;
                this.tokenCounter.textContent = `${count} tokens`;
                
                // Color code based on token count
                if (count > 500) {
                    this.tokenCounter.style.color = '#d9534f'; // Red
                } else if (count > 250) {
                    this.tokenCounter.style.color = '#f0ad4e'; // Orange
                } else {
                    this.tokenCounter.style.color = '#666'; // Default
                }
            } catch (e) {
                // Fallback to character estimate
                this.estimateTokenCount(text);
            }
        } else {
            // Fallback to character estimate
            this.estimateTokenCount(text);
        }
    },
    
    estimateTokenCount(text) {
        // Rough estimate: 1 token ≈ 4 characters
        const estimate = Math.ceil(text.length / 4);
        this.tokenCounter.textContent = `${estimate} tokens`;
    },
    
    cleanup() {
        // Clear timers
        if (this.personalDebounceTimer) {
            clearTimeout(this.personalDebounceTimer);
            this.personalDebounceTimer = null;
        }
        
        if (this.authorDebounceTimer) {
            clearTimeout(this.authorDebounceTimer);
            this.authorDebounceTimer = null;
        }
        
        // Clear references
        this.personalTextarea = null;
        this.authorTextarea = null;
        this.litePersonalTextarea = null;
        this.liteAnoteTextarea = null;
        this.tokenCounter = null;
        this.initialized = false;
    },
    
    // Public API for external refresh
    refresh() {
        console.log('🔄 Refreshing NOTES panel');
        if (this.initialized) {
            this.loadPersonalNotes();
            this.loadAuthorNotes();
            this.loadAuthorNoteSettings();
            this.updateTokenCount();
        }
    }
};

console.log('✅ KLITE NOTES Panel loaded');