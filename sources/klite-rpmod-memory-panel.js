// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - MEMORY Panel Implementation
// Complete synchronization with KoboldAI Lite's memory system
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.MEMORY = {
    // Configuration
    DEBOUNCE_DELAY: 300,
    SYNC_INTERVAL: 500,
    
    // State
    initialized: false,
    debounceTimer: null,
    syncInterval: null,
    lastKnownValue: '',
    isUpdating: false,
    
    // References
    rpmodTextarea: null,
    liteTextarea: null,
    tokenCounter: null,
    
    load(container, panel) {
        console.log('📝 Loading MEMORY panel');
        
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
            <div class="klite-rpmod-memory-panel" style="
                width: 100%; 
                height: 100%; 
                display: flex; 
                flex-direction: column; 
                padding: 10px; 
                box-sizing: border-box;
                gap: 10px;
            ">
                <!-- Header with info and token count -->
                <div class="klite-rpmod-memory-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                ">
                    <label style="
                        color: #999; 
                        font-size: 12px; 
                        display: block;
                    ">
                        Memory - Always included at the start of your story context
                    </label>
                    <span id="klite-rpmod-memory-tokens" style="
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
                
                <!-- Memory textarea -->
                <textarea
                    id="klite-rpmod-memory-textarea"
                    class="form-control menuinput_multiline"
                    style="
                        flex: 1;
                        width: 100%;
                        background: #1a1a1a;
                        border: 1px solid #444;
                        border-radius: 4px;
                        color: #e0e0e0;
                        padding: 8px;
                        font-size: 12px;
                        font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
                        line-height: 1.4;
                        resize: none;
                        box-sizing: border-box;
                        transition: border-color 0.2s ease;
                    "
                    placeholder="Enter memory text here. This will be included at the beginning of the context sent to the AI."
                    spellcheck="false"
                ></textarea>
                
                <!-- Status indicator -->
                <div id="klite-rpmod-memory-status" style="
                    display: none;
                    color: #5cb85c;
                    font-size: 11px;
                    text-align: right;
                    margin-top: -5px;
                ">
                    ✓ Saved
                </div>
            </div>
        `;
    },
    
    initialize() {
        console.log('🚀 Initializing MEMORY panel');
        
        // Get references
        this.rpmodTextarea = document.getElementById('klite-rpmod-memory-textarea');
        this.liteTextarea = document.getElementById('memorytext');
        this.tokenCounter = document.getElementById('klite-rpmod-memory-tokens');
        
        if (!this.rpmodTextarea) {
            console.error('❌ MEMORY: RPMod textarea not found');
            return;
        }
        
        // Initialize Lite's memory panel if needed
        this.ensureLiteMemoryInitialized();
        
        // Set initial value from Lite or localsettings
        this.syncFromLite();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Set up sync monitoring
        this.setupSyncMonitoring();
        
        // Update token count
        this.updateTokenCount();
        
        this.initialized = true;
        console.log('✅ MEMORY panel initialized');
    },
    
    ensureLiteMemoryInitialized() {
        // Make sure Lite's memory field exists
        if (!this.liteTextarea) {
            console.log('🔧 Initializing Lite memory panel');
            
            // Try to trigger memory panel creation
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
                this.liteTextarea = document.getElementById('memorytext');
            }
        }
    },
    
    setupEventHandlers() {
        // Handle input in RPMod textarea
        this.rpmodTextarea.addEventListener('input', (e) => {
            this.handleRPModInput(e.target.value);
        });
        
        // Handle focus/blur for visual feedback
        this.rpmodTextarea.addEventListener('focus', () => {
            this.rpmodTextarea.style.borderColor = '#4a90e2';
            this.rpmodTextarea.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
        });
        
        this.rpmodTextarea.addEventListener('blur', () => {
            this.rpmodTextarea.style.borderColor = '#444';
            this.rpmodTextarea.style.boxShadow = 'none';
        });
        
        // Handle paste events
        this.rpmodTextarea.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.handleRPModInput(this.rpmodTextarea.value);
            }, 10);
        });
    },
    
    setupSyncMonitoring() {
        // Monitor Lite's memory field for external changes
        if (this.liteTextarea) {
            // Use MutationObserver for value changes
            const observer = new MutationObserver(() => {
                if (!this.isUpdating) {
                    this.syncFromLite();
                }
            });
            
            observer.observe(this.liteTextarea, {
                attributes: true,
                attributeFilter: ['value']
            });
            
            // Also monitor input events
            this.liteTextarea.addEventListener('input', () => {
                if (!this.isUpdating) {
                    this.syncFromLite();
                }
            });
        }
        
        // Periodic sync as fallback
        this.syncInterval = setInterval(() => {
            if (!this.isUpdating) {
                this.checkAndSyncFromLite();
            }
        }, this.SYNC_INTERVAL);
    },
    
    handleRPModInput(value) {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Update token count immediately
        this.updateTokenCount();
        
        // Debounce the sync to Lite
        this.debounceTimer = setTimeout(() => {
            this.syncToLite(value);
            this.showSaveStatus();
        }, this.DEBOUNCE_DELAY);
    },
    
    syncFromLite() {
        // Get value from Lite or localsettings
        let memoryValue = '';
        
        if (this.liteTextarea) {
            memoryValue = this.liteTextarea.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            memoryValue = localsettings.memory;
        } else if (typeof current_memory !== 'undefined') {
            memoryValue = current_memory;
        }
        
        // Update RPMod textarea if different
        if (this.rpmodTextarea.value !== memoryValue) {
            this.rpmodTextarea.value = memoryValue;
            this.lastKnownValue = memoryValue;
            this.updateTokenCount();
        }
    },
    
    checkAndSyncFromLite() {
        // Check if Lite's value has changed
        let currentLiteValue = '';
        
        if (this.liteTextarea) {
            currentLiteValue = this.liteTextarea.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            currentLiteValue = localsettings.memory;
        }
        
        if (currentLiteValue !== this.lastKnownValue) {
            this.syncFromLite();
        }
    },
    
    syncToLite(value) {
        this.isUpdating = true;
        
        try {
            // Update Lite's textarea
            if (this.liteTextarea) {
                this.liteTextarea.value = value;
                
                // Trigger input event for Lite's handlers
                const event = new Event('input', { bubbles: true });
                this.liteTextarea.dispatchEvent(event);
            }
            
            // Update global variables
            if (typeof localsettings !== 'undefined') {
                localsettings.memory = value;
            }
            if (typeof current_memory !== 'undefined') {
                current_memory = value;
            }
            
            // Call Lite's confirm function
            if (typeof confirm_memory === 'function') {
                confirm_memory();
            }
            
            this.lastKnownValue = value;
            
        } finally {
            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdating = false;
            }, 50);
        }
    },
    
    updateTokenCount() {
        if (!this.tokenCounter || !this.rpmodTextarea) return;
        
        const text = this.rpmodTextarea.value;
        
        // Use Lite's token counting if available
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(text);
                const count = Array.isArray(tokens) ? tokens.length : 0;
                this.tokenCounter.textContent = `${count} tokens`;
                
                // Color code based on token count
                if (count > 2000) {
                    this.tokenCounter.style.color = '#d9534f'; // Red
                } else if (count > 1000) {
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
    
    showSaveStatus() {
        const status = document.getElementById('klite-rpmod-memory-status');
        if (!status) return;
        
        // Show status
        status.style.display = 'block';
        status.style.opacity = '1';
        
        // Fade out after delay
        setTimeout(() => {
            status.style.transition = 'opacity 0.5s ease';
            status.style.opacity = '0';
            
            setTimeout(() => {
                status.style.display = 'none';
                status.style.transition = '';
            }, 500);
        }, 1000);
    },
    
    cleanup() {
        // Clear timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        // Clear references
        this.rpmodTextarea = null;
        this.liteTextarea = null;
        this.tokenCounter = null;
        this.initialized = false;
    },
    
    // Public API for external refresh
    refresh() {
        console.log('🔄 Refreshing MEMORY panel');
        if (this.initialized) {
            this.syncFromLite();
            this.updateTokenCount();
        }
    }
};

console.log('✅ KLITE MEMORY Panel loaded');