    // =============================================
    // KLITE RP mod - KoboldAI Lite conversion
    // Creator Peter Hauer
    // under GPL-3.0 license
    // see https://github.com/PeterPeet/
    // =============================================
// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Core Framework
// Role-Player focused UI modification for KoboldAI Lite
// Fixed layout with proper margins and no resizing
// =============================================

// Guard from multiple executions
if (window.KLITE_RPMod_LOADED) {
    console.warn('KLITE RPMod already loaded, skipping duplicate load');
    return;
}
window.KLITE_RPMod_LOADED = true;

// Fix console access in KoboldAI Lite's Function context
const consoleFrame = document.createElement('iframe');
consoleFrame.style.display = 'none';
document.body.appendChild(consoleFrame);
window.console = consoleFrame.contentWindow.console;

console.log('✅ KLITE RP Mod: Console access restored');

const KLITE_RPMod = {
    version: '1.0.0',
    debug: true,
    
    // Configuration
    config: {
        panels: {
            left: ['PLAY', 'TOOLS', 'GROUP', 'SCENE', 'HELP'],
            right: ['CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
        },
        defaultTabs: {
            left: 'PLAY',
            right: 'CHARS'
        },
        panelWidth: 350,
        panelMargin: 15
    },

    // State management
    state: {
        activeTabs: {
            left: 'PLAY',
            right: 'CHARS'
        },
        panelsCollapsed: {
            left: false,
            right: false,
            top: false
        }
    },
    gameMode: 'roleplay',
    isSyncingContent: false,
    gameTextObserver: null,

    // Button state management
    buttonState: {
        isGenerating: false,
        abortAnimation: null
    },

    // State persistence using IndexedDB
    async saveUIState() {
        const stateToSave = {
            version: 1,
            timestamp: Date.now(),
            panels: {
                activeTabs: this.state.activeTabs,
                panelsCollapsed: this.state.panelsCollapsed
            },
            preferences: {
                fullscreenMode: document.querySelector('.klite-rpmod-main-content')?.classList.contains('fullscreen') || false
            }
        };
        
        try {
            // Use KoboldAI's indexeddb_save function if available
            if (typeof indexeddb_save === 'function') {
                await indexeddb_save('KLITE_RPMod_UIState', JSON.stringify(stateToSave));
                console.log('✅ UI state saved to IndexedDB');
            } else {
                // Fallback to direct IndexedDB access
                await this.directIndexedDBSave('KLITE_RPMod_UIState', stateToSave);
            }
        } catch (error) {
            console.error('Failed to save UI state:', error);
            // Fallback to localStorage
            localStorage.setItem('KLITE_RPMod_UIState_Backup', JSON.stringify(stateToSave));
        }
    },

    async loadUIState() {
        try {
            let savedState = null;
            
            // Try to load from IndexedDB first
            if (typeof indexeddb_load === 'function') {
                const stateString = await indexeddb_load('KLITE_RPMod_UIState', null);
                if (stateString) {
                    savedState = JSON.parse(stateString);
                }
            } else {
                // Fallback to direct IndexedDB access
                savedState = await this.directIndexedDBLoad('KLITE_RPMod_UIState');
            }
            
            // If not in IndexedDB, check localStorage backup
            if (!savedState) {
                const backupState = localStorage.getItem('KLITE_RPMod_UIState_Backup');
                if (backupState) {
                    savedState = JSON.parse(backupState);
                    // Migrate to IndexedDB
                    this.saveUIState();
                }
            }
            
            return savedState;
        } catch (error) {
            console.error('Failed to load UI state:', error);
            return null;
        }
    },

    // Direct IndexedDB access methods (fallback)
    async directIndexedDBSave(key, value) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('KoboldAI_Lite_DB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                const putRequest = store.put(value, key);
                
                putRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };
                
                putRequest.onerror = () => {
                    db.close();
                    reject(putRequest.error);
                };
            };
        });
    },

    async directIndexedDBLoad(key) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('KoboldAI_Lite_DB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.close();
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const getRequest = store.get(key);
                
                getRequest.onsuccess = () => {
                    db.close();
                    resolve(getRequest.result);
                };
                
                getRequest.onerror = () => {
                    db.close();
                    reject(getRequest.error);
                };
            };
        });
    },

    // Set up automatic state persistence
    setupStatePersistence() {
        // Save state whenever panels are toggled
        const originalTogglePanel = this.togglePanel.bind(this);
        this.togglePanel = (side) => {
            originalTogglePanel(side);
            // Debounce save to avoid too many writes
            if (this.saveStateTimer) {
                clearTimeout(this.saveStateTimer);
            }
            this.saveStateTimer = setTimeout(() => {
                this.saveUIState();
            }, 500);
        };
        
        // Save state when switching tabs
        const originalSwitchTab = this.switchTab.bind(this);
        this.switchTab = (panel, tab) => {
            originalSwitchTab(panel, tab);
            // Debounce save
            if (this.saveStateTimer) {
                clearTimeout(this.saveStateTimer);
            }
            this.saveStateTimer = setTimeout(() => {
                this.saveUIState();
            }, 500);
        };
        
        // Save state before page unload
        window.addEventListener('beforeunload', () => {
            this.saveUIState();
        });
    },

    // Initialize the mod
    async init() {
        console.log('🎭 KLITE RP Mod initializing...');
        
        // Check if we're in KoboldAI Lite environment
        if (!this.checkEnvironment()) {
            console.error('❌ KLITE RP Mod: KoboldAI Lite environment not detected!');
            return;
        }

        // Check if this is the first time running
        const isFirstRun = !localStorage.getItem('klite-rpmod-initialized');
        
        // Load saved UI state from IndexedDB
        const savedState = await this.loadUIState();
        
        if (isFirstRun) {
            console.log('🎉 First time running RPMod!');
            // Show all panels on first run
            this.state.panelsCollapsed.left = false;
            this.state.panelsCollapsed.right = false;
            this.state.panelsCollapsed.top = false;
        } else if (savedState && savedState.panels) {
            console.log('♻️ Restoring saved UI state');
            // Restore saved state
            this.state.activeTabs = savedState.panels.activeTabs || this.state.activeTabs;
            this.state.panelsCollapsed = savedState.panels.panelsCollapsed || this.state.panelsCollapsed;
        }
        
        // Initialize state manager for compatibility
        const restoredState = window.KLITE_RPMod_StateManager?.init();
        
        // Merge with any existing state manager data
        if (restoredState && !savedState) {
            this.state = {
                ...this.state,
                ...restoredState.panels
            };
        }
        
        // Initialize event integration
        window.KLITE_RPMod_EventIntegration?.init();
        
        // Inject styles
        this.injectStyles();
        
        // Build UI structure - THIS CREATES THE CONTAINERS
        this.buildUI();

        this.updateMainContentPosition();
    
        // Initialize hot-swap feature AFTER UI is built
        setTimeout(() => {
            window.KLITE_RPMod_HotSwap?.init();
        }, 100);
        
        // If we had a saved state, apply it to the UI
        if (savedState) {
            this.applyRestoredState();
        }
        
        // Connect buttons to KoboldAI functions
        this.connectButtons();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize all panels
        this.initializeAllPanels();
        
        // Set up automatic state persistence
        this.setupStatePersistence();

        // =============================================
        // KLITE RPMod - Author's Note Boundary Injection Patch
        // Ensures Author's Notes are injected at message boundaries in Chat/Adventure modes
        // =============================================

        // Save original submit_generation function
        const original_submit_generation = window.submit_generation;

        // Override submit_generation with boundary-aware injection
        window.submit_generation = function(text) {
            console.log('[RPMod] Submit generation intercepted');
            
            // Check if we should use boundary-aware injection
            const isChat = localsettings.opmode === 3;
            const isAdventure = localsettings.opmode === 2;
            const hasAuthorNote = localsettings.anotetext && localsettings.anotetext.trim() !== '';
            
            if ((isChat || isAdventure) && hasAuthorNote) {
                console.log('[RPMod] Using boundary-aware Author\'s Note injection');
                
                // Save current author note settings
                const savedAnote = localsettings.anotetext;
                const savedAnoteStrength = localsettings.anote_strength;
                const savedAnoteTemplate = localsettings.anotetemplate || '[Author\'s note: <|>]';
                
                // Temporarily disable Lite's author note injection
                localsettings.anotetext = '';
                
                try {
                    // Get the current context
                    const contextArray = gametext_arr.slice(); // Copy array
                    const memory = localsettings.memory || '';
                    
                    // Calculate target depth in messages based on token depth
                    const messageDepth = calculateMessageDepthFromTokens(savedAnoteStrength, contextArray);
                    
                    // Find the injection point
                    const injectionIndex = findMessageBoundaryIndex(contextArray, messageDepth);
                    
                    // Format the author's note
                    const formattedNote = savedAnoteTemplate.replace('<|>', savedAnote);
                    
                    // Create a modified gametext_arr with the note injected
                    const modifiedGametext = [...contextArray];
                    modifiedGametext.splice(injectionIndex, 0, formattedNote);
                    
                    // Temporarily replace gametext_arr
                    const originalGametext = gametext_arr;
                    gametext_arr = modifiedGametext;
                    
                    // Call original submit_generation
                    const result = original_submit_generation.call(this, text);
                    
                    // Restore original gametext_arr
                    gametext_arr = originalGametext;
                    
                    // Restore author note settings
                    localsettings.anotetext = savedAnote;
                    localsettings.anote_strength = savedAnoteStrength;
                    
                    return result;
                    
                } catch (error) {
                    console.error('[RPMod] Error in boundary injection:', error);
                    // Restore settings and fall back to default behavior
                    localsettings.anotetext = savedAnote;
                    localsettings.anote_strength = savedAnoteStrength;
                    return original_submit_generation.call(this, text);
                }
            } else {
                // Story mode or no author note - use default behavior
                return original_submit_generation.call(this, text);
            }
        };

        // Helper function to calculate message depth from token depth
        const calculateMessageDepthFromTokens = function(tokenDepth, messages) {
            if (!messages || messages.length === 0) return 0;
            
            // Count backwards from the end
            let tokenCount = 0;
            let messageIndex = messages.length;
            
            // Work backwards through messages
            for (let i = messages.length - 1; i >= 0; i--) {
                const messageTokens = countTokensApprox(messages[i]);
                tokenCount += messageTokens;
                
                if (tokenCount >= tokenDepth) {
                    // We've reached the target depth
                    messageIndex = i;
                    break;
                }
            }
            
            // Convert to depth from end
            const depthFromEnd = messages.length - messageIndex;
            return Math.max(1, Math.min(depthFromEnd, messages.length - 1));
        };

        // Helper function to find the best message boundary for injection
        const findMessageBoundaryIndex = function(messages, depthFromEnd) {
            if (!messages || messages.length === 0) return 0;
            
            // Calculate the target index
            let targetIndex = Math.max(0, messages.length - depthFromEnd);
            
            // In chat mode, we want to inject between complete exchanges
            if (localsettings.opmode === 3) {
                // Find patterns like "Name: " at the start of messages
                const chatPatterns = [
                    new RegExp(`^${escapeRegex(localsettings.chatname || 'You')}:\\s*`, 'i'),
                    new RegExp(`^${escapeRegex(getChatOpponent())}:\\s*`, 'i'),
                    /^[A-Za-z0-9_\-]+:\s*/  // Generic pattern for any name
                ];
                
                // Adjust to nearest message boundary
                while (targetIndex < messages.length - 1) {
                    const currentMsg = messages[targetIndex];
                    const nextMsg = messages[targetIndex + 1];
                    
                    // Check if we're at a good boundary (between different speakers)
                    const currentSpeaker = extractSpeaker(currentMsg, chatPatterns);
                    const nextSpeaker = extractSpeaker(nextMsg, chatPatterns);
                    
                    if (currentSpeaker && nextSpeaker && currentSpeaker !== nextSpeaker) {
                        // Good boundary - between different speakers
                        return targetIndex + 1;
                    }
                    
                    targetIndex++;
                }
            }
            
            // For adventure mode or if no good boundary found, use the target index
            return Math.min(targetIndex, messages.length);
        };

        // Helper to extract speaker from a message
        const extractSpeaker = function(message, patterns) {
            if (!message) return null;
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match) {
                    // Extract the name part before the colon
                    const colonIndex = message.indexOf(':');
                    if (colonIndex > 0) {
                        return message.substring(0, colonIndex).trim();
                    }
                }
            }
            return null;
        };

        // Helper to get chat opponent name
        const getChatOpponent = function() {
            if (localsettings.chatopponent) {
                // Handle group chat format
                if (localsettings.chatopponent.includes('||$||')) {
                    const opponents = localsettings.chatopponent.split('||$||');
                    return opponents[0]; // Return first opponent as fallback
                }
                return localsettings.chatopponent;
            }
            return 'AI';
        };

        // Helper to escape regex special characters
        const escapeRegex = function(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        // Helper to approximate token count
        const countTokensApprox = function(text) {
            if (!text) return 0;
            // Rough approximation: 1 token ≈ 4 characters
            return Math.ceil(text.length / 4);
        };

        console.log('[RPMod] Author\'s Note boundary-aware injection patch loaded');
        
        // Update connection status after a short delay
        setTimeout(() => {
            try {
                const statusEl = document.getElementById('connectstatus');
                const ourStatusEl = document.getElementById('klite-connection-text');
                
                if (statusEl && ourStatusEl) {
                    const statusText = statusEl.textContent.replace(/\n/g, ' ').trim();
                    ourStatusEl.textContent = statusText || 'KoboldCpp';
                    console.log('Connection status set to:', statusText);
                }
            } catch (e) {
                console.error('Error updating status:', e);
            }
        }, 1000);
        
        // Auto-collapse panels after 2.5 seconds on first run
        if (isFirstRun) {
            setTimeout(() => {
                console.log('Auto-collapsing panels...');
                ['left', 'right', 'top'].forEach(panel => {
                    if (!this.state.panelsCollapsed[panel]) {
                        this.togglePanel(panel);
                    }
                });
                localStorage.setItem('klite-rpmod-initialized', 'true');
                // Save the collapsed state
                this.saveUIState();
            }, 2500);
        }
    
        console.log('✅ KLITE RP Mod initialized successfully!');
    },

    // Apply restored state to the UI
    applyRestoredState() {
        Object.entries(this.state.panelsCollapsed).forEach(([panel, collapsed]) => {
            const panelEl = document.getElementById(`klite-rpmod-panel-${panel}`);
            if (panelEl) {
                if (collapsed) {
                    panelEl.classList.add('collapsed');
                } else {
                    panelEl.classList.remove('collapsed');
                }
                
                // Update collapse handle arrows
                const handle = panelEl.querySelector('.klite-rpmod-collapse-handle');
                if (handle) {
                    if (panel === 'left') {
                        handle.innerHTML = collapsed ? '▶' : '◀';
                    } else if (panel === 'right') {
                        handle.innerHTML = collapsed ? '◀' : '▶';
                    } else if (panel === 'top') {
                        handle.innerHTML = collapsed ? '▼' : '▲';
                    }
                }
            }
        });
        
        // Update main content position
        this.updateMainContentPosition();
    },

    // Update main content position based on panel states
    updateMainContentPosition() {
        const mainContent = document.querySelector('.klite-rpmod-main-content');
        if (!mainContent) return;
        
        const width = window.innerWidth;
        const isMobile = width <= 768;
        const isTablet = width > 768 && width <= 1400;
        const isDesktop = width > 1400;
        const isFullscreen = mainContent.classList.contains('fullscreen');
        
        // Remove any existing responsive classes
        mainContent.classList.remove('mobile-mode', 'tablet-mode', 'desktop-mode');
        
        if (isMobile) {
            // Mobile: Full width with overlay panels
            mainContent.classList.add('mobile-mode');
            mainContent.style.left = '15px';
            mainContent.style.right = '15px';
            mainContent.style.maxWidth = '100%';
        } else if (isTablet || (isDesktop && isFullscreen)) {
            // Tablet OR Desktop+Fullscreen: Full width with overlay panels
            mainContent.classList.add(isTablet ? 'tablet-mode' : 'desktop-mode');
            mainContent.style.left = '15px';
            mainContent.style.right = '15px';
            mainContent.style.maxWidth = '100%';
        } else {
            // Desktop without fullscreen: Always reserve panel space
            mainContent.classList.add('desktop-mode');
            mainContent.style.left = '365px';
            mainContent.style.right = '365px';
            mainContent.style.maxWidth = '';
        }
    },

    // Check if we're in the right environment
    checkEnvironment() {
        return typeof window.prepare_submit_generation === 'function' ||
               typeof window.btn_retry === 'function' ||
               document.getElementById('gametext') !== null;
    },

    // Load saved state from storage (legacy method for compatibility)
    loadState() {
        const savedState = localStorage.getItem('KLITE_RPMod_State');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.activeTabs) {
                    this.state.activeTabs = { ...this.state.activeTabs, ...parsed.activeTabs };
                }
            } catch (e) {
                console.warn('Failed to load saved state:', e);
            }
        }
    },

    // Save state to storage (legacy method for compatibility)
    saveState() {
        const stateToSave = {
            activeTabs: this.state.activeTabs
        };
        localStorage.setItem('KLITE_RPMod_State', JSON.stringify(stateToSave));
    },

    // Injection of the css-styles
    injectStyles() {
        const styleId = 'klite-rpmod-styles';
        if (document.getElementById(styleId)) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = window.KLITE_RPMod_CoreStylesCSS || '';
        document.head.appendChild(styleSheet);
    },

    restoreUIState(state) {
        if (!state) return;
        
        try {
            // Restore panel collapsed states
            if (state.panels && state.panels.panelsCollapsed) {
                Object.entries(state.panels.panelsCollapsed).forEach(([panel, collapsed]) => {
                    const panelEl = document.getElementById(`klite-rpmod-panel-${panel}`);
                    if (panelEl) {
                        if (collapsed) {
                            panelEl.classList.add('collapsed');
                        } else {
                            panelEl.classList.remove('collapsed');
                        }
                        this.state.panelsCollapsed[panel] = collapsed;
                    }
                });
            }
            
            // Restore active tabs
            if (state.panels && state.panels.activeTabs) {
                this.state.activeTabs = { ...this.state.activeTabs, ...state.panels.activeTabs };
            }
            
            // Update collapse handle arrows
            Object.keys(this.state.panelsCollapsed).forEach(side => {
                const panel = document.getElementById(`klite-rpmod-panel-${side}`);
                if (panel) {
                    const handle = panel.querySelector('.klite-rpmod-collapse-handle');
                    if (handle) {
                        if (side === 'left') {
                            handle.innerHTML = this.state.panelsCollapsed[side] ? '▶' : '◀';
                        } else if (side === 'right') {
                            handle.innerHTML = this.state.panelsCollapsed[side] ? '◀' : '▶';
                        } else if (side === 'top') {
                            handle.innerHTML = this.state.panelsCollapsed[side] ? '▼' : '▲';
                        }
                    }
                }
            });
            
            console.log('UI state restored:', state);
        } catch (e) {
            console.error('Failed to restore UI state:', e);
        }
    },

    // Build the main UI structure
    buildUI() {
        // Add class to body
        document.body.classList.add('klite-rpmod-active');

        // Create main container
        const container = document.createElement('div');
        container.className = 'klite-rpmod-container';
        container.id = 'klite-rpmod-container';

        // Create panels
        const leftPanel = this.createPanel('left');
        const rightPanel = this.createPanel('right');
        const topPanel = this.createTopPanel();

        // Create mobile panel viewer
        const mobilePanel = this.createMobilePanel();

        // Create main content area
        const mainContent = document.createElement('div');
        mainContent.className = 'klite-rpmod-main-content';
        if (!this.state.panelsCollapsed.top) mainContent.classList.add('top-expanded');

        // Chat area
        const chatArea = document.createElement('div');
        chatArea.className = 'klite-rpmod-chat-area';
        chatArea.id = 'klite-rpmod-chat-display';
        chatArea.innerHTML = '<p style="color: #666;">Story content will appear here...</p>';

        // Input area
        const inputArea = document.createElement('div');
        inputArea.className = 'klite-rpmod-input-area';
        inputArea.style.position = 'relative';

        // Bottom left buttons - NARRATOR replaces IMAGES
        const bottomLeftButtons = document.createElement('div');
        bottomLeftButtons.className = 'klite-rpmod-bottom-left-buttons';
        const buttonLabels = ['ME AS AI', 'AI AS ME', 'NARRATOR'];
        buttonLabels.forEach((label, i) => {
            const btn = document.createElement('button');
            btn.className = 'klite-rpmod-bottom-button';
            btn.textContent = label;
            btn.style.fontSize = '11px';
            bottomLeftButtons.appendChild(btn);
        });

        // Input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'klite-rpmod-input-wrapper';

        // Text input
        const textInput = document.createElement('textarea');
        textInput.className = 'klite-rpmod-text-input';
        textInput.id = 'klite-rpmod-input';
        textInput.placeholder = 'Enter your text here...';
        textInput.style.resize = 'none';

        // Add Enter key handling for submit
        textInput.addEventListener('keydown', (e) => {
            // Check if Enter is pressed without Shift
            if (e.key === 'Enter' && !e.shiftKey) {
                // Check if "Enter submits" is enabled (if the setting exists)
                const enterSubmitEnabled = document.getElementById('entersubmit')?.checked ?? true;
                
                if (enterSubmitEnabled) {
                    e.preventDefault();
                    
                    // Submit if not already generating
                    if (!this.buttonState.isGenerating) {
                        const submitBtn = document.querySelector('.klite-rpmod-submit-button');
                        if (submitBtn) {
                            submitBtn.click();
                        }
                    }
                }
            }
        });

        // Info line below input
        const inputInfo = document.createElement('div');
        inputInfo.className = 'klite-rpmod-input-info';
        
        // Check if we're in mobile mode
        const isMobile = window.innerWidth <= 767;
        
        if (isMobile) {
            // Simplified mobile version
            inputInfo.innerHTML = `
                <span>🗒️ <span id="klite-story-token">0</span> | <span id="klite-connection-text">Loading...</span> | 💤 <span id="klite-queue-position">#0</span> | ⏱️ <span id="klite-wait-time">0s</span></span>
            `;
        } else {
            // Full desktop version with all icons
            inputInfo.innerHTML = `
                <span>✍️ <span id="klite-prompt-token">0</span> | 🗒️ <span id="klite-story-token">0</span></span>
                <span>🔌 <span id="klite-connection-text">Loading...</span> | 💤 <span id="klite-queue-position">#0</span> | ⏱️ <span id="klite-wait-time">0s</span></span>
            `;
        }


        inputWrapper.appendChild(textInput);
        inputWrapper.appendChild(inputInfo);

        // Right side buttons
        const rightButtons = document.createElement('div');
        rightButtons.className = 'klite-rpmod-right-buttons';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'klite-rpmod-submit-button';
        submitBtn.textContent = 'Submit';

        const actionButtons = document.createElement('div');
        actionButtons.className = 'klite-rpmod-action-buttons';

        const backBtn = document.createElement('button');
        backBtn.className = 'klite-rpmod-action-button';
        backBtn.textContent = '↩︎';
        backBtn.style.fontSize = '18px';

        const forwardBtn = document.createElement('button');
        forwardBtn.className = 'klite-rpmod-action-button';
        forwardBtn.textContent = '↪︎';
        forwardBtn.style.fontSize = '18px';

        const circleBtn = document.createElement('button');
        circleBtn.className = 'klite-rpmod-action-button';
        circleBtn.textContent = '↻';
        circleBtn.style.fontSize = '18px';

        actionButtons.appendChild(backBtn);
        actionButtons.appendChild(forwardBtn);
        actionButtons.appendChild(circleBtn);

        rightButtons.appendChild(submitBtn);
        rightButtons.appendChild(actionButtons);

        // Editing button (upper right inside text input)
        const editingButton = document.createElement('button');
        editingButton.id = 'klite-editing-toggle';
        editingButton.className = 'klite-rpmod-editing-button';
        editingButton.innerHTML = '✏️';
        editingButton.title = 'Toggle Edit Mode';
        editingButton.style.cssText = `
            position: absolute;
            bottom: 118px;
            right: 15px;
            z-index: 2;
            width: 120px;
            height: 26px;
            background-color: rgb(45, 107, 160);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
        `;

        // Quick access buttons (left side)
        const quickButtonsLeft = document.createElement('div');
        quickButtonsLeft.style.cssText = `
            position: absolute;
            bottom: 118px;
            left: 15px;
            z-index: 2;
            display: flex;
            gap: 4px;
        `;

        // Context Analyzer button
        const contextButton = document.createElement('button');
        contextButton.id = 'klite-context-quick';
        contextButton.className = 'klite-rpmod-quick-button';
        contextButton.innerHTML = '📊';
        contextButton.title = 'Context Analyzer';
        contextButton.style.cssText = `
            width: 26px;
            height: 26px;
            background-color: rgb(45, 107, 160);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
        `;

        // Memory Writer button
        const memoryButton = document.createElement('button');
        memoryButton.id = 'klite-memory-quick';
        memoryButton.className = 'klite-rpmod-quick-button';
        memoryButton.innerHTML = '🧠';
        memoryButton.title = 'Smart Memory Writer';
        memoryButton.style.cssText = contextButton.style.cssText;

        // Scene Generation button
        const paletteButton = document.createElement('button');
        paletteButton.id = 'klite-palette-quick';
        paletteButton.className = 'klite-rpmod-quick-button';
        paletteButton.innerHTML = '🎨';
        paletteButton.title = 'Image Generator';
        paletteButton.style.cssText = contextButton.style.cssText;

        // Image Generation button
        const imagesButton = document.createElement('button');
        imagesButton.id = 'klite-images-toggle';
        imagesButton.className = 'klite-rpmod-quick-button';
        imagesButton.innerHTML = '🖼️';
        imagesButton.title = 'Generate Image';
        imagesButton.style.cssText = contextButton.style.cssText;

        // Add hover effects to all quick buttons
        [contextButton, memoryButton, paletteButton, imagesButton].forEach(btn => {
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#286090';
                btn.style.borderColor = '#204d74';
            };
            btn.onmouseout = () => {
                btn.style.backgroundColor = 'rgb(45, 107, 160)';
                btn.style.borderColor = '#2e6da4';
            };
        });

        // Button click handlers
        if (contextButton) {
            contextButton.onclick = () => {
                console.log('Context Analyzer clicked - opening detailed analysis with token view');
                
                if (window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels.TOOLS) {
                    // First switch to TOOLS panel
                    if (window.KLITE_RPMod && window.KLITE_RPMod.api) {
                        window.KLITE_RPMod.api.switchTab('left', 'TOOLS');
                    }
                    
                    // Then open the detailed analysis window with token view active
                    setTimeout(() => {
                        window.KLITE_RPMod_Panels.TOOLS.openDetailedAnalysis();
                        
                        // After the window opens, trigger token view
                        setTimeout(() => {
                            if (window.KLITE_RPMod_Panels.TOOLS.analysisWindow && !window.KLITE_RPMod_Panels.TOOLS.analysisWindow.closed) {
                                const doc = window.KLITE_RPMod_Panels.TOOLS.analysisWindow.document;
                                const tokenRadio = doc.querySelector('input[name="viewMode"][value="tokens"]');
                                if (tokenRadio) {
                                    tokenRadio.checked = true;
                                    tokenRadio.dispatchEvent(new Event('change'));
                                }
                            }
                        }, 200);
                    }, 100);
                }
            };
        };

        if (memoryButton) {
            memoryButton.onclick = () => {
                console.log('Smart Memory Writer clicked - opening modal');
                this.openSmartMemoryModal();
            };
        };

        if (paletteButton) {
            paletteButton.onclick = () => {
                console.log('Palette clicked - opening Lite\'s Image Generation Panel');
                // Try to open image generation
                if (typeof add_img_btn_menu === 'function') {
                    add_img_btn_menu();
                } else {
                    console.warn('Image generation functions not found in Lite');
                }
            };
        };

        if (imagesButton) {
            imagesButton.onclick = () => {
                console.log('Fullscreen Button clicked');
                const mainContent = document.querySelector('.klite-rpmod-main-content');
                const topPanel = document.querySelector('.klite-rpmod-panel-top');
                
                if (mainContent) {
                    if (mainContent.classList.contains('fullscreen')) {
                        // Exit fullscreen
                        mainContent.classList.remove('fullscreen');
                        
                        // Restore top panel
                        if (topPanel) {
                            topPanel.classList.remove('fullscreen');
                        }
                        
                        // Update positioning based on screen size
                        this.updateMainContentPosition();
                        
                        console.log('Exited fullscreen mode');
                    } else {
                        // Enter fullscreen
                        mainContent.classList.add('fullscreen');
                        
                        // Expand top panel in fullscreen
                        if (topPanel) {
                            topPanel.classList.add('fullscreen');
                        }
                        
                        // Update positioning for fullscreen
                        this.updateMainContentPosition();
                        
                        console.log('Entered fullscreen mode');
                    }
                }
            };
        };

        quickButtonsLeft.appendChild(contextButton);
        quickButtonsLeft.appendChild(memoryButton);
        quickButtonsLeft.appendChild(paletteButton);
        quickButtonsLeft.appendChild(imagesButton);

        // Quick access buttons (right side) - Mode switchers
        const quickButtonsRight = document.createElement('div');
        quickButtonsRight.style.cssText = `
            position: absolute;
            bottom: 118px;
            right: 146px;
            z-index: 2;
            display: flex;
            gap: 4px;
        `;

        // Story Mode button
        const storyModeButton = document.createElement('button');
        storyModeButton.id = 'klite-mode-story';
        storyModeButton.className = 'klite-rpmod-mode-button';
        storyModeButton.innerHTML = '📖';
        storyModeButton.title = 'Story Mode';
        storyModeButton.style.cssText = `
            width: 26px;
            height: 26px;
            background-color: rgb(45, 107, 160);
            border: 1px solid #2e6da4;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
        `;

        // Adventure Mode button
        const adventureModeButton = document.createElement('button');
        adventureModeButton.id = 'klite-mode-adventure';
        adventureModeButton.className = 'klite-rpmod-mode-button';
        adventureModeButton.innerHTML = '⚔️';
        adventureModeButton.title = 'Adventure Mode';
        adventureModeButton.style.cssText = storyModeButton.style.cssText;

        // Chat Mode button
        const chatModeButton = document.createElement('button');
        chatModeButton.id = 'klite-mode-chat';
        chatModeButton.className = 'klite-rpmod-mode-button';
        chatModeButton.innerHTML = '💬';
        chatModeButton.title = 'Role Play / Chat Mode';
        chatModeButton.style.cssText = storyModeButton.style.cssText;

        // Add hover effects to mode buttons
        [storyModeButton, adventureModeButton, chatModeButton].forEach(btn => {
            btn.onmouseover = () => {
                if (!btn.classList.contains('active')) {
                    btn.style.backgroundColor = '#286090';
                    btn.style.borderColor = '#204d74';
                }
            };
            btn.onmouseout = () => {
                if (!btn.classList.contains('active')) {
                    btn.style.backgroundColor = 'rgb(45, 107, 160)';
                    btn.style.borderColor = '#2e6da4';
                }
            };
        });

        // Mode button click handlers
        storyModeButton.onclick = () => {
            console.log('Switching to Story Mode');
            if (typeof localsettings !== 'undefined') {
                localsettings.opmode = 1;
                // Call KoboldAI's mode change function if available
                if (typeof toggle_opmode === 'function') {
                    toggle_opmode(1);
                }
                this.updateModeButtons();
                this.updateGameModeButtons();

                // Reload PLAY panel if it's active
                const activeTab = this.state.activeTabs.left;
                if (activeTab === 'PLAY') {
                    console.log('Reloading PLAY panel for Story Mode');
                    this.switchTab('left', 'PLAY');
                }
            }
        };

        adventureModeButton.onclick = () => {
            console.log('Switching to Adventure Mode');
            if (typeof localsettings !== 'undefined') {
                localsettings.opmode = 2;
                if (typeof toggle_opmode === 'function') {
                    toggle_opmode(2);
                }
                this.updateModeButtons();
                this.updateGameModeButtons();

                // Reload PLAY panel if it's active
                const activeTab = this.state.activeTabs.left;
                if (activeTab === 'PLAY') {
                    console.log('Reloading PLAY panel for Adventure Mode');
                    this.switchTab('left', 'PLAY');
                }
            }
        };

        chatModeButton.onclick = () => {
            console.log('Switching to Chat Mode');
            if (typeof localsettings !== 'undefined') {
                localsettings.opmode = 3;
                if (typeof toggle_opmode === 'function') {
                    toggle_opmode(3);
                }
                this.updateModeButtons();
                this.updateGameModeButtons();

                // Reload PLAY panel if it's active
                const activeTab = this.state.activeTabs.left;
                if (activeTab === 'PLAY') {
                    console.log('Reloading PLAY panel for Chat Mode');
                    this.switchTab('left', 'PLAY');
                }
            }
        };

        quickButtonsRight.appendChild(storyModeButton);
        quickButtonsRight.appendChild(adventureModeButton);
        quickButtonsRight.appendChild(chatModeButton);

        // Initialize edit state
        let isEditing = false;
        const allowEditingCheckbox = document.getElementById('allowediting');
        if (allowEditingCheckbox) {
            isEditing = allowEditingCheckbox.checked;
        }

        // Set initial button state
        if (isEditing) {
            editingButton.classList.add('active');
        }

        editingButton.onclick = () => {
            isEditing = !isEditing;
            
            // Toggle the actual checkbox
            const checkbox = document.getElementById('allowediting');
            if (checkbox) {
                checkbox.checked = isEditing;
            }
            
            // Call the KoboldAI function
            if (typeof toggle_editable === 'function') {
                toggle_editable();
            }
            
            // Update button appearance
            if (isEditing) {
                editingButton.classList.add('active');
            } else {
                editingButton.classList.remove('active');
            }
            
            // Apply edit mode to RPMod chat display
            this.toggleChatEditMode(isEditing);
        };

        inputArea.appendChild(bottomLeftButtons);
        inputArea.appendChild(inputWrapper);
        inputArea.appendChild(rightButtons);
        inputArea.appendChild(editingButton);
        inputArea.appendChild(quickButtonsLeft);
        inputArea.appendChild(quickButtonsRight);

        mainContent.appendChild(chatArea);
        mainContent.appendChild(inputArea);

        // Add all to container
        container.appendChild(topPanel);
        container.appendChild(leftPanel);
        container.appendChild(rightPanel);
        container.appendChild(mainContent);
        container.appendChild(mobilePanel);

        // Create mobile toggle button
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'klite-rpmod-mobile-toggle';
        mobileToggle.innerHTML = '☰';
        mobileToggle.onclick = () => this.toggleMobilePanel();
        container.appendChild(mobileToggle);

        // Insert into DOM
        document.body.appendChild(container);

        // Update token count on input
        textInput.addEventListener('input', () => {
            this.updatePromptTokenCount(textInput.value);
        });

        // Initialize story token count
        this.updateStoryTokenCount();
        
        // Initialize mode buttons
        this.initializeModeButtons();
        
        // Watch for mode changes to update buttons
        if (window.KLITE_RPMod_PanelSwitcher) {
            window.KLITE_RPMod_PanelSwitcher.watchModeChanges(() => {
                this.updateModeButtons();
            });
        }
    },

    initializeAllPanels() {
        console.log('Initializing all panels...');
        
        // Don't pre-initialize in temp containers - that causes the errors
        // Instead, just make sure all panels are loaded and ready
        
        // Check that all panel modules are loaded
        const requiredPanels = {
            left: ['PLAY', 'TOOLS', 'GROUP', 'SCENE', 'HELP'],
            right: ['CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
        };
        
        let allPanelsReady = true;
        Object.entries(requiredPanels).forEach(([side, panels]) => {
            panels.forEach(panel => {
                if (!window.KLITE_RPMod_Panels || !window.KLITE_RPMod_Panels[panel]) {
                    console.warn(`Panel ${panel} not loaded yet`);
                    allPanelsReady = false;
                }
            });
        });
        
        if (!allPanelsReady) {
            console.warn('Some panels are not ready, retrying in 500ms...');
            setTimeout(() => this.initializeAllPanels(), 500);
            return;
        }
        
        // Load the active tabs into the actual panels
        setTimeout(() => {
            // Load default tabs
            const leftTab = this.state.activeTabs.left || this.config.defaultTabs.left;
            const rightTab = this.state.activeTabs.right || this.config.defaultTabs.right;
            
            console.log(`Loading active tabs - Left: ${leftTab}, Right: ${rightTab}`);
            
            this.loadTabContent('left', leftTab);
            this.loadTabContent('right', rightTab);
        }, 100);
    },

    initializeModeButtons(){
        const checkAndSetMode = () => {
            // Try multiple ways to detect the mode
            let currentMode = 3; // Default to chat
            
            // Method 1: Check localsettings
            if (typeof localsettings !== 'undefined' && localsettings.opmode) {
                currentMode = localsettings.opmode;
            } 
            // Method 2: Check if panel switcher has detected it
            else if (window.KLITE_RPMod_PanelSwitcher && window.KLITE_RPMod_PanelSwitcher.getCurrentMode) {
                const detectedMode = window.KLITE_RPMod_PanelSwitcher.getCurrentMode();
                switch(detectedMode) {
                    case 'story': currentMode = 1; break;
                    case 'adventure': currentMode = 2; break;
                    case 'chat': currentMode = 3; break;
                    case 'instruct': currentMode = 3; break; // Also uses chat button
                }
            }
            
            // Now update the buttons
            const storyBtn = document.getElementById('klite-mode-story');
            const adventureBtn = document.getElementById('klite-mode-adventure');
            const chatBtn = document.getElementById('klite-mode-chat');
            
            // Reset all
            [storyBtn, adventureBtn, chatBtn].forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.backgroundColor = 'rgb(45, 107, 160)';
                    btn.style.borderColor = '#2e6da4';
                }
            });
            
            // Set active
            let activeBtn;
            switch (currentMode) {
                case 1: activeBtn = storyBtn; break;
                case 2: activeBtn = adventureBtn; break;
                case 3: 
                default: activeBtn = chatBtn; break;
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.backgroundColor = '#4CAAE5';
                activeBtn.style.borderColor = '#4CAAE5';
            }
            
            console.log('Mode buttons initialized, current mode:', currentMode);
        };
        
        // Try immediately
        checkAndSetMode();
        
        // Try again after a delay to catch late initialization
        setTimeout(checkAndSetMode, 1000);
        setTimeout(checkAndSetMode, 2000);
    },

    // Update mode button states
    updateModeButtons() {
        const storyBtn = document.getElementById('klite-mode-story');
        const adventureBtn = document.getElementById('klite-mode-adventure');
        const chatBtn = document.getElementById('klite-mode-chat');
        
        // Remove active class from all
        [storyBtn, adventureBtn, chatBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                btn.style.backgroundColor = 'rgb(45, 107, 160)';
                btn.style.borderColor = '#2e6da4';
            }
        });
        
        // Add active class to current mode
        if (typeof localsettings !== 'undefined' && localsettings.opmode) {
            let activeBtn;
            switch (localsettings.opmode) {
                case 1: activeBtn = storyBtn; break;
                case 2: activeBtn = adventureBtn; break;
                case 3: activeBtn = chatBtn; break;
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.backgroundColor = '#4CAAE5';
                activeBtn.style.borderColor = '#4CAAE5';
            }
        }
    },

    // Watch for generation state changes
    watchGenerationState() {
        // Monitor the abort button visibility to detect generation state
        const checkAbortButton = () => {
            const abortBtn = document.getElementById('abortgen');
            if (abortBtn) {
                const isGenerating = !abortBtn.classList.contains('hidden');
                
                // Update our state if it changed
                if (isGenerating !== this.buttonState.isGenerating) {
                    if (isGenerating) {
                        this.startGenerating();
                    } else {
                        this.stopGenerating();
                    }
                }
            }
            
            // Check for queue position (AI Horde)
            this.updateQueueInfo();
        };
        
        // Check periodically
        setInterval(checkAbortButton, 100);
        
        // Also observe DOM changes
        const observer = new MutationObserver(checkAbortButton);
        const abortBtn = document.getElementById('abortgen');
        if (abortBtn) {
            observer.observe(abortBtn, { 
                attributes: true, 
                attributeFilter: ['class', 'style'] 
            });
        }
    },

    updateConnectionStatus() {
        // Check connection status and update UI
        const connectorPanel = document.getElementById('klite-rpmod-panel-connector');
        if (!connectorPanel) return;
        
        // Example implementation - adjust based on your needs
        const statusElement = connectorPanel.querySelector('.connection-status');
        if (statusElement) {
            // Check if connected to KoboldAI
            const isConnected = typeof localsettings !== 'undefined';
            statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
            statusElement.style.color = isConnected ? '#4CAF50' : '#f44336';
        }
    },

    // Add method to update queue info
    updateQueueInfo() {
        const queueInfo = document.getElementById('klite-queue-info');
        const queuePosition = document.getElementById('klite-queue-position');
        
        if (!queueInfo || !queuePosition) return;
        
        // Try to find AI Horde queue position
        const hordeStatus = document.querySelector('.horde_queue_position');
        if (hordeStatus && hordeStatus.textContent) {
            const match = hordeStatus.textContent.match(/Position: (\d+)/);
            if (match) {
                queueInfo.style.display = 'inline';
                queuePosition.textContent = match[1];
                return;
            }
        }
        
        // Check if we're using AI Horde by looking at the connection status
        const connectionText = document.getElementById('klite-connection-text');
        if (connectionText && connectionText.textContent.toLowerCase().includes('horde')) {
            // Look for queue info in other possible locations
            const statusElements = document.querySelectorAll('.status, .queue-status, #queue_status');
            for (const el of statusElements) {
                const text = el.textContent;
                const match = text.match(/(?:position|queue).*?(\d+)/i);
                if (match) {
                    queueInfo.style.display = 'inline';
                    queuePosition.textContent = match[1];
                    return;
                }
            }
        }
        
        // Hide queue info if not found
        queueInfo.style.display = 'none';
    },

    // Create a side panel
    createPanel(side) {
        const panel = document.createElement('div');
        panel.className = `klite-rpmod-panel klite-rpmod-panel-${side}`;
        if (this.state.panelsCollapsed[side]) {
            panel.classList.add('collapsed');
        }
        panel.id = `klite-rpmod-panel-${side}`;

        // Create collapse handle
        const handle = document.createElement('div');
        handle.className = 'klite-rpmod-collapse-handle';
        if (side === 'top') {
            handle.innerHTML = this.state.panelsCollapsed[side] ? '▼' : '▲';
        } else {
            handle.innerHTML = side === 'left' ? '◀' : '▶';
        }
        handle.onclick = () => this.togglePanel(side);
        panel.appendChild(handle);

        // Create tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'klite-rpmod-tabs';

        // Add tabs
        this.config.panels[side].forEach(tabName => {
            const tab = document.createElement('button');
            tab.className = 'klite-rpmod-tab';
            tab.textContent = tabName;
            tab.dataset.tab = tabName;
            tab.dataset.panel = side;
            
            if (tabName === this.state.activeTabs[side]) {
                tab.classList.add('active');
            }

            tab.onclick = () => this.switchTab(side, tabName);
            tabBar.appendChild(tab);
        });

        panel.appendChild(tabBar);

        // Create content area
        const content = document.createElement('div');
        content.className = 'klite-rpmod-content';
        content.id = `klite-rpmod-content-${side}`;
        panel.appendChild(content);

        return panel;
    },

    // Create mobile panel viewer
    createMobilePanel() {
        const panel = document.createElement('div');
        panel.className = 'klite-rpmod-mobile-panel';
        panel.id = 'klite-rpmod-mobile-panel';

        // Create header
        const header = document.createElement('div');
        header.className = 'klite-rpmod-mobile-header';

        // Create dropdown
        const dropdown = document.createElement('select');
        dropdown.className = 'klite-rpmod-mobile-dropdown';
        dropdown.onchange = (e) => this.loadMobileContent(e.target.value);

        // Add all tabs to dropdown
        const allTabs = [
            ...this.config.panels.left.map(tab => ({ tab, panel: 'left', label: `Left: ${tab}` })),
            ...this.config.panels.right.map(tab => ({ tab, panel: 'right', label: `Right: ${tab}` }))
        ];

        allTabs.forEach(({ tab, panel, label }) => {
            const option = document.createElement('option');
            option.value = `${panel}-${tab}`;
            option.textContent = label;
            dropdown.appendChild(option);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'klite-rpmod-mobile-close';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => this.toggleMobilePanel();

        header.appendChild(dropdown);
        header.appendChild(closeBtn);

        // Content area
        const content = document.createElement('div');
        content.className = 'klite-rpmod-mobile-content';
        content.id = 'klite-rpmod-mobile-content';

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    },

    // Toggle mobile panel visibility
    toggleMobilePanel() {
        const panel = document.getElementById('klite-rpmod-mobile-panel');
        panel.classList.toggle('show');
        
        if (panel.classList.contains('show')) {
            const dropdown = panel.querySelector('.klite-rpmod-mobile-dropdown');
            this.loadMobileContent(dropdown.value);
        }
    },

    // Load content into mobile panel
    loadMobileContent(value) {
        const [panel, tab] = value.split('-');
        const contentEl = document.getElementById('klite-rpmod-mobile-content');
        
        contentEl.innerHTML = '<p style="text-align: center; color: #888;">Loading...</p>';
        
        setTimeout(() => {
            contentEl.innerHTML = `<h2 style="text-align: center; color: #888; margin-top: 50px;">${tab}</h2>`;
            
            if (window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels[tab]) {
                window.KLITE_RPMod_Panels[tab].load(contentEl, panel);
            }
        }, 100);
    },

    // Create top panel
    createTopPanel() {
        const panel = document.createElement('div');
        panel.className = 'klite-rpmod-panel klite-rpmod-panel-top';
        if (this.state.panelsCollapsed.top) {
            panel.classList.add('collapsed');
        }
        panel.id = 'klite-rpmod-panel-top';

        // Create collapse handle
        const handle = document.createElement('div');
        handle.className = 'klite-rpmod-collapse-handle';
        handle.innerHTML = this.state.panelsCollapsed.top ? '▼' : '▲';
        handle.onclick = () => this.togglePanel('top');
        panel.appendChild(handle);

        // Content area for original KoboldAI UI
        const content = document.createElement('div');
        content.className = 'klite-rpmod-top-content';
        
        // Embed the KoboldAI Lite top menu
        content.innerHTML = `
            <div id="topmenu" class="topmenu">
                <div style="width: 100%;">
                    <button title="Main Menu Options" class="navtoggler mainnav" type="button" onclick="KLITE_toggleTopNav()">
                        <span class="navbar-button-bar"></span>
                        <span class="navbar-button-bar"></span>
                        <span class="navbar-button-bar"></span>
                    </button>
                    <div class="navbar-collapse collapse" id="navbarNavDropdown">
                        <ul class="nav navbar-nav">
                            <li class="nav-item hidden" id="topbtn_admin">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_admin_container()">Admin</a>
                            </li>

                            <li class="nav-item hidden" id="topbtn_reconnect">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();attempt_connect()">Reconnect</a>
                            </li>

                            <li class="nav-item hidden" id="topbtn_customendpt">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_endpoint_container()">Select Endpoint</a>
                            </li>

                            <li class="nav-item" id="topbtn_ai">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_endpoint_container()">AI</a>
                            </li>

                            <li class="nav-item" id="topbtn_newgame">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_newgame()">New Session</a>
                            </li>

                            <li class="nav-item" id="topbtn_scenarios">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_scenarios()">Scenarios</a>
                            </li>
                            <li class="nav-item hidden" id="topbtn_quickplay">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_scenarios()">Quick Start</a>
                            </li>

                            <li class="nav-item" id="topbtn_save_load">
                                <a id="tempfile" href="#" style="display:none;"></a>
                                <input type="file" id="loadfileinput" accept="*" onchange="load_file(event)" style="display:none;">
                                <a class="nav-link mainnav" href="#" onclick="KLITE_closeTopNav();display_saveloadcontainer()">Save / Load</a>
                            </li>
                            <li class="nav-item" id="topbtn_settings">
                                <a class="nav-link mainnav" href="#" id="btn_settings" onclick="KLITE_closeTopNav();display_settings()">Settings</a>
                            </li>

                            <li class="nav-item hidden" id="topbtn_multiplayer_join">
                                <a class="nav-link mainnav" href="#" onclick="join_multiplayer()">Join Multiplayer</a>
                            </li>
                            <li class="nav-item hidden" id="topbtn_multiplayer_leave">
                                <a class="nav-link mainnav" href="#" onclick="leave_multiplayer()">Exit Multiplayer</a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div id="connectstatusdiv">
                    <div id="connectstatus" class="color_offwhite">AI Horde</div>
                    <div class="hidden" style="font-size: 10px;" id="connectstatusmultiplayer"></div>
                    <div class="hidden color_orange" style="font-size: 10px;" id="connectstatusproxied">(Proxied)</div>
                </div>
            </div>
        `;
        
        panel.appendChild(content);

        return panel;
    },

    initializeGameMode() {
        const modeSelector = document.getElementById('play-game-mode');
        
        if (!modeSelector) return;
        
        // Load saved mode
        this.gameMode = localStorage.getItem('klite-rpmod-game-mode') || 'roleplay';
        modeSelector.value = this.gameMode;
        
        // Handle mode changes
        modeSelector.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            localStorage.setItem('klite-rpmod-game-mode', this.gameMode);
            this.updateGameModeButtons();
        });
        
        // Initial button update
        this.updateGameModeButtons();
    },

        updateGameModeButtons() {
            // Update the main UI buttons based on game mode
            const bottomButtons = document.querySelectorAll('.klite-rpmod-bottom-button');
            if (bottomButtons.length < 3) return;
            
            // Get the current opmode directly
            const currentOpmode = (typeof localsettings !== 'undefined') ? localsettings.opmode : 3;
            
            switch (currentOpmode) {
                case 1: // Story mode
                    bottomButtons[0].textContent = 'FALLEN';
                    bottomButtons[1].textContent = 'REJECT';
                    bottomButtons[2].textContent = 'TWIST';
                    
                    bottomButtons[0].onclick = () => this.applyStoryModifier('fallen');
                    bottomButtons[1].onclick = () => this.applyStoryModifier('reject');
                    bottomButtons[2].onclick = () => this.applyStoryModifier('twist');
                    break;
                    
                case 2: // Adventure mode
                    bottomButtons[0].textContent = 'STORY';
                    bottomButtons[1].textContent = 'ACTION';
                    bottomButtons[2].textContent = 'ROLL';
                    
                    bottomButtons[0].onclick = () => this.setAdventureMode('story');
                    bottomButtons[1].onclick = () => this.setAdventureMode('action');
                    bottomButtons[2].onclick = () => this.setAdventureMode('roll');
                    break;
                    
                case 3: // Chat mode
                case 4: // Instruct mode
                default: // Roleplay mode
                    bottomButtons[0].textContent = 'ME AS AI';
                    bottomButtons[1].textContent = 'AI AS ME';
                    bottomButtons[2].textContent = 'NARRATOR';
                    
                    bottomButtons[0].onclick = () => {
                        if (typeof impersonate_message === 'function') {
                            impersonate_message(0);
                        }
                    };
                    
                    bottomButtons[1].onclick = () => {
                        if (typeof impersonate_user === 'function') {
                            impersonate_user();
                        }
                    };
                    
                    bottomButtons[2].onclick = () => {
                        // Call the PLAY_RP panel narrator method if available
                        if (window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels.PLAY_RP) {
                            window.KLITE_RPMod_Panels.PLAY_RP.triggerNarrator();
                        } else {
                            console.error('PLAY_RP panel not available for narrator function');
                        }
                    };
            }
        },

        applyStoryModifier(modifier) {
            const modifierPrompts = {
                fallen: "The narrative takes a darker turn. Characters reveal their worst traits, and the situation becomes more desperate or morally ambiguous.",
                reject: "The characters face rejection, failure, or obstacles. Their plans go awry, and they must deal with unexpected setbacks.",
                twist: "An unexpected plot twist occurs. Hidden information is revealed, or the situation suddenly changes in a surprising way."
            };
            
            const prompt = modifierPrompts[modifier];
            const inputField = document.getElementById('input_text') || document.getElementById('klite-rpmod-input');
            
            if (inputField && prompt) {
                const originalValue = inputField.value;
                inputField.value = `[System: ${prompt}]\n${originalValue}`;
                
                if (typeof submit_generation_button === 'function') {
                    submit_generation_button(false);
                } else if (typeof prepare_submit_generation === 'function') {
                    prepare_submit_generation();
                }
                
                setTimeout(() => {
                    inputField.value = originalValue;
                }, 100);
            }
        },

        setAdventureMode(mode) {
            const modePrompts = {
                story: "Continue the adventure with focus on narrative, character development, and storytelling.",
                action: "Focus on action sequences, combat, and dynamic events. Describe movements, attacks, and reactions in detail.",
                roll: "Include dice rolls and chance-based outcomes. Describe the results of actions with success/failure mechanics."
            };
            
            const prompt = modePrompts[mode];
            const inputField = document.getElementById('input_text') || document.getElementById('klite-rpmod-input');
            
            if (inputField && prompt) {
                const originalValue = inputField.value;
                inputField.value = `[System: ${prompt}]\n${originalValue}`;
                
                if (typeof submit_generation_button === 'function') {
                    submit_generation_button(false);
                } else if (typeof prepare_submit_generation === 'function') {
                    prepare_submit_generation();
                }
                
                setTimeout(() => {
                    inputField.value = originalValue;
                }, 100);
            }
        },

    openSmartMemoryModal() {
        console.log('🧠 Opening Smart Memory modal from core');
        
        // Create modal if it doesn't exist
        let modal = document.getElementById('klite-rpmod-memory-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'klite-rpmod-memory-modal';
            modal.className = 'klite-rpmod-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 0;
                z-index: 10001;
                width: 400px;
                max-height: 80vh;
                box-shadow: 0 0 20px rgba(0,0,0,0.8);
            `;
            
            modal.innerHTML = `
                <!-- Header -->
                <div style="
                    background: #1a1a1a;
                    padding: 15px 20px;
                    border-bottom: 1px solid #333;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; color: #4a9eff; font-size: 16px;">🧠 Smart Memory Writer</h3>
                    <button class="klite-rpmod-modal-close" style="
                        background: transparent;
                        border: none;
                        color: #999;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.backgroundColor='#333';this.style.color='#fff'" 
                    onmouseout="this.style.backgroundColor='transparent';this.style.color='#999'">×</button>
                </div>
                
                <!-- Body -->
                <div style="padding: 20px;">
                    <!-- Controls -->
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <select id="klite-rpmod-modal-memory-context" style="
                            flex: 1;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            color: #e0e0e0;
                            padding: 8px;
                            border-radius: 4px;
                            font-size: 12px;
                        ">
                            <option value="entire">Entire Story</option>
                            <option value="last50">Last 50 Messages</option>
                            <option value="recent" selected>Recent (10)</option>
                            <option value="last3">Last 3 Messages</option>
                            <option value="last1">Last Message</option>
                        </select>
                        <select id="klite-rpmod-modal-memory-type" style="
                            flex: 1;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            color: #e0e0e0;
                            padding: 8px;
                            border-radius: 4px;
                            font-size: 12px;
                        ">
                            <option value="summary" selected>Summary</option>
                            <option value="keywords">Keywords</option>
                            <option value="outline">Outline</option>
                        </select>
                    </div>
                    
                    <!-- Generate Button -->
                    <button class="klite-rpmod-button" id="klite-rpmod-modal-generate-memory" style="
                        width: 100%;
                        padding: 10px;
                        background: #337ab7;
                        border: 1px solid #2e6da4;
                        border-radius: 4px;
                        color: white;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-bottom: 15px;
                    " onmouseover="this.style.backgroundColor='#286090'" 
                    onmouseout="this.style.backgroundColor='#337ab7'">
                        Generate Memory
                    </button>
                    
                    <!-- Output -->
                    <div style="margin-bottom: 10px;">
                        <label style="
                            color: #999;
                            font-size: 11px;
                            display: block;
                            margin-bottom: 5px;
                        ">Generated Memory:</label>
                        <textarea id="klite-rpmod-modal-memory-output" style="
                            width: 100%;
                            height: 150px;
                            background: #1a1a1a;
                            border: 1px solid #444;
                            color: #e0e0e0;
                            padding: 10px;
                            font-family: monospace;
                            font-size: 12px;
                            resize: vertical;
                            border-radius: 4px;
                        " placeholder="Generated memory will appear here..."></textarea>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-modal-copy-memory" style="
                            flex: 1;
                            padding: 8px;
                            background: #555;
                            border: 1px solid #666;
                            border-radius: 4px;
                            color: white;
                            font-size: 12px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#666'" 
                        onmouseout="this.style.backgroundColor='#555'">
                            📋 Copy
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-modal-append-memory" style="
                            flex: 1;
                            padding: 8px;
                            background: #5cb85c;
                            border: 1px solid #4cae4c;
                            border-radius: 4px;
                            color: white;
                            font-size: 12px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#4cae4c'" 
                        onmouseout="this.style.backgroundColor='#5cb85c'">
                            ➕ Append to Memory
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close button handler
            modal.querySelector('.klite-rpmod-modal-close').onclick = () => {
                modal.style.display = 'none';
            };
            
            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
            
            // Generate button handler
            document.getElementById('klite-rpmod-modal-generate-memory').onclick = () => {
                this.generateMemoryFromModal();
            };
            
            // Copy button handler
            document.getElementById('klite-rpmod-modal-copy-memory').onclick = () => {
                const output = document.getElementById('klite-rpmod-modal-memory-output');
                if (output.value) {
                    navigator.clipboard.writeText(output.value);
                    const btn = document.getElementById('klite-rpmod-modal-copy-memory');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Copied!';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                }
            };
            
            // Append button handler
            document.getElementById('klite-rpmod-modal-append-memory').onclick = () => {
                const output = document.getElementById('klite-rpmod-modal-memory-output');
                const memoryTextarea = document.getElementById('memorytext') || 
                                    document.querySelector('#klite-rpmod-panel-right #memorytext');
                
                if (output.value && memoryTextarea) {
                    memoryTextarea.value += '\n\n' + output.value;
                    memoryTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    const btn = document.getElementById('klite-rpmod-modal-append-memory');
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Appended!';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                    
                    // Close modal after append
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 1000);
                }
            };
        }
        
        // Show modal
        modal.style.display = 'block';
    },

    generateMemoryFromModal() {
        const contextSize = document.getElementById('klite-rpmod-modal-memory-context').value;
        const outputType = document.getElementById('klite-rpmod-modal-memory-type').value;
        const outputField = document.getElementById('klite-rpmod-modal-memory-output');
        const generateBtn = document.getElementById('klite-rpmod-modal-generate-memory');
        
        // Check if we have story content
        if (!gametext_arr || gametext_arr.length === 0) {
            outputField.value = 'No story content available to analyze.';
            return;
        }
        
        // Visual feedback
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        outputField.value = 'Sending to AI for analysis...';
        outputField.style.borderColor = '#f0ad4e';
        
        // Get story content based on context size
        let contextContent = [];
        const messages = gametext_arr.filter(msg => msg && msg.trim());
        
        switch(contextSize) {
            case 'last1':
                contextContent = messages.slice(-1);
                break;
            case 'last3':
                contextContent = messages.slice(-3);
                break;
            case 'recent':
                contextContent = messages.slice(-10);
                break;
            case 'last50':
                contextContent = messages.slice(-50);
                break;
            case 'entire':
                contextContent = messages;
                break;
        }
        
        if (contextContent.length === 0) {
            outputField.value = 'No content in selected range.';
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Memory';
            return;
        }
        
        // Build the prompt based on output type
        const prompts = {
            'summary': `Please analyze the story above and create a concise memory summary. Include key characters, events, and important details. Write in past tense, third person. Maximum 150 words.`,
            'keywords': `Extract the most important keywords, names, places, and concepts from the story above. List them as comma-separated values.`,
            'outline': `Create a bullet-point outline of the main events and key information from the story above.`
        };
        
        const instruction = prompts[outputType] || prompts['summary'];
        
        // Save current state
        const originalLength = gametext_arr.length;
        const originalInput = document.getElementById('input_text')?.value || '';
        
        // Add instruction temporarily
        gametext_arr.push(`\n\n[System Instruction: ${instruction}]\n`);
        render_gametext();
        
        // Set up a one-time observer to catch the response
        const gametext = document.getElementById('gametext');
        if (gametext) {
            const observer = new MutationObserver((mutations) => {
                // Get the latest addition to the story
                const currentLength = gametext_arr.length;
                if (currentLength > originalLength + 1) {
                    // We have a response!
                    const response = gametext_arr[currentLength - 1];
                    
                    // Clean up - remove instruction and response from story
                    gametext_arr.length = originalLength;
                    render_gametext();
                    
                    // Display the generated memory
                    outputField.value = response.trim();
                    outputField.style.borderColor = '#5cb85c';
                    
                    // Restore input
                    const inputField = document.getElementById('input_text');
                    if (inputField) inputField.value = originalInput;
                    
                    // Reset button
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate Memory';
                    
                    // Disconnect observer
                    observer.disconnect();
                }
            });
            
            observer.observe(gametext, { childList: true, subtree: true });
            
            // Submit empty generation to trigger AI response
            const inputField = document.getElementById('input_text');
            if (inputField && typeof submit_generation_button === 'function') {
                inputField.value = '';
                submit_generation_button();
                
                // Timeout fallback (30 seconds)
                setTimeout(() => {
                    observer.disconnect();
                    if (outputField.value === 'Sending to AI for analysis...') {
                        outputField.value = 'Generation timed out. Please try again.';
                        outputField.style.borderColor = '#d9534f';
                        
                        // Clean up if needed
                        if (gametext_arr.length > originalLength) {
                            gametext_arr.length = originalLength;
                            render_gametext();
                        }
                        
                        // Restore state
                        if (inputField) inputField.value = originalInput;
                        generateBtn.disabled = false;
                        generateBtn.textContent = 'Generate Memory';
                    }
                }, 120000);
            } else {
                console.error('Cannot submit generation');
                outputField.value = 'Error: Cannot access AI generation.';
                outputField.style.borderColor = '#d9534f';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Memory';
                
                // Clean up
                gametext_arr.length = originalLength;
                render_gametext();
            }
        }
    },

    // Connect all buttons to KoboldAI functions
    connectButtons() {
        console.log('Connecting buttons to KoboldAI functions...');
        
        // Initialize game mode and buttons
        this.initializeGameMode();
        
        // Submit button with abort functionality
        const submitBtn = document.querySelector('.klite-rpmod-submit-button');
        if (submitBtn) {
            submitBtn.onclick = () => {
                if (this.buttonState.isGenerating) {
                    // Abort generation
                    console.log('Aborting generation');
                    if (typeof abort_generation === 'function') {
                        abort_generation();
                    }
                    this.stopGenerating();
                } else {
                    // Submit generation
                    console.log('Submitting generation');
                    
                    // Clear the input fields
                    const rpmodInput = document.getElementById('klite-rpmod-input');
                    const liteInput = document.getElementById('input_text');
                    
                    if (typeof submit_generation_button === 'function') {
                        submit_generation_button(false);
                        this.startGenerating();
                    } else if (typeof prepare_submit_generation === 'function') {
                        prepare_submit_generation();
                        this.startGenerating();
                    }
                    
                    // Clear inputs after submission
                    if (rpmodInput) {
                        rpmodInput.value = '';
                        this.updatePromptTokenCount('');
                    }
                    if (liteInput) {
                        liteInput.value = '';
                    }
                }
            };
        }
        
        // Action buttons
        const actionButtons = document.querySelectorAll('.klite-rpmod-action-button');
        if (actionButtons.length >= 3) {
            // Undo button (↩︎)
            actionButtons[0].onclick = () => {
                console.log('Undo clicked');
                if (typeof btn_back === 'function') {
                    btn_back();
                } else {
                    console.warn('btn_back function not found');
                }
            };
            
            // Add long press functionality for undo
            actionButtons[0].onpointerdown = () => {
                if (typeof btn_back_longpress_start === 'function') {
                    btn_back_longpress_start();
                }
            };
            actionButtons[0].onpointerup = actionButtons[0].onpointerleave = () => {
                if (typeof btn_back_longpress_end === 'function') {
                    btn_back_longpress_end();
                }
            };
            
            // Redo button (↪︎)
            actionButtons[1].onclick = () => {
                console.log('Redo clicked');
                if (typeof btn_redo === 'function') {
                    btn_redo();
                } else {
                    console.warn('btn_redo function not found');
                }
            };
            
            // Add long press functionality for redo
            actionButtons[1].onpointerdown = () => {
                if (typeof btn_redo_longpress_start === 'function') {
                    btn_redo_longpress_start();
                }
            };
            actionButtons[1].onpointerup = actionButtons[1].onpointerleave = () => {
                if (typeof btn_redo_longpress_end === 'function') {
                    btn_redo_longpress_end();
                }
            };
            
            // Regenerate button (↻)
            actionButtons[2].onclick = () => {
                console.log('Regenerate clicked');
                if (typeof btn_retry === 'function') {
                    btn_retry();
                } else {
                    console.warn('btn_retry function not found');
                }
            };
        }
        
        // Watch for generation state changes
        this.watchGenerationState();
    },

    // Start generating state
    startGenerating() {
        this.buttonState.isGenerating = true;
        const submitBtn = document.querySelector('.klite-rpmod-submit-button');
        if (submitBtn) {
            // Check if we should show Continue instead of Abort
            const gameText = document.getElementById('gametext');
            const lastMessage = gameText ? gameText.lastElementChild : null;
            const wasAborted = lastMessage && lastMessage.classList.contains('aborted');
            
            if (wasAborted) {
                submitBtn.textContent = 'Continue';
                submitBtn.classList.add('continue-mode');
            } else {
                submitBtn.classList.add('aborting');
                submitBtn.textContent = 'Abort';
            }
        }
    },

    // Update the stopGenerating method:
    stopGenerating() {
        this.buttonState.isGenerating = false;
        const submitBtn = document.querySelector('.klite-rpmod-submit-button');
        if (submitBtn) {
            submitBtn.classList.remove('aborting', 'continue-mode');
            
            // Check if last generation was aborted
            const gameText = document.getElementById('gametext');
            const lastMessage = gameText ? gameText.lastElementChild : null;
            const wasAborted = lastMessage && lastMessage.classList.contains('aborted');
            
            if (wasAborted) {
                submitBtn.textContent = 'Continue';
            } else {
                submitBtn.textContent = 'Submit';
            }
        }
    },

    // Watch for generation state changes
    watchGenerationState() {
        // Monitor the abort button visibility to detect generation state
        const checkAbortButton = () => {
            const abortBtn = document.getElementById('abortgen');
            if (abortBtn) {
                const isGenerating = !abortBtn.classList.contains('hidden');
                
                // Update our state if it changed
                if (isGenerating !== this.buttonState.isGenerating) {
                    if (isGenerating) {
                        this.startGenerating();
                    } else {
                        this.stopGenerating();
                    }
                }
            }
        };
        
        // Check periodically
        setInterval(checkAbortButton, 100);
        
        // Also observe DOM changes
        const observer = new MutationObserver(checkAbortButton);
        const abortBtn = document.getElementById('abortgen');
        if (abortBtn) {
            observer.observe(abortBtn, { 
                attributes: true, 
                attributeFilter: ['class', 'style'] 
            });
        }
    },

    // Switch active tab
    switchTab(panel, tabName) {
        this.state.activeTabs[panel] = tabName;
        this.saveState();

        // Update UI
        const panelEl = document.getElementById(`klite-rpmod-panel-${panel}`);
        panelEl.querySelectorAll('.klite-rpmod-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Load tab content
        this.loadTabContent(panel, tabName);
    },

    toggleChatEditMode(enable) {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        if (!chatDisplay) return;
        
        console.log('toggleChatEditMode called with:', enable);
        
        if (enable) {
            // Enable editing
            chatDisplay.contentEditable = 'true';
            chatDisplay.style.cursor = 'text';
            chatDisplay.style.outline = '1px dashed #666';
            
            // Add input event listener to sync changes
            if (!chatDisplay.hasAttribute('data-edit-listener')) {
                chatDisplay.setAttribute('data-edit-listener', 'true');
                
                // Debounced save function
                let saveTimeout;
                const saveChanges = () => {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.saveChatChanges();
                    }, 1000); // Save 1 second after user stops typing
                };
                
                chatDisplay.addEventListener('input', saveChanges);
                
                // Also save on blur
                chatDisplay.addEventListener('blur', () => {
                    clearTimeout(saveTimeout);
                    this.saveChatChanges();
                });
            }
        } else {
            // Disable editing
            chatDisplay.contentEditable = 'false';
            chatDisplay.style.cursor = 'default';
            chatDisplay.style.outline = 'none';
            
            // Save any pending changes
            this.saveChatChanges();
        }
    },

    saveChatChanges() {
        if (this.isSyncingContent) return; // Prevent feedback loops
        
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        const gametext = document.getElementById('gametext');
        
        if (!chatDisplay || !gametext) return;
        
        // Get the content from chat display
        let content = chatDisplay.innerHTML;
        
        // Clean any artifacts from editing
        content = this.cleanEditingArtifacts(content);
        
        // Flag to prevent observer from re-syncing
        this.isSyncingContent = true;
        
        // Update the original gametext
        gametext.innerHTML = content;
        
        // Also update the gametext_arr if it exists
        if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
            // Create a temporary element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Extract text content properly
            const messages = [];
            const walker = document.createTreeWalker(
                tempDiv,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentMessage = '';
            let node;
            
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text) {
                    // Check if this text node is inside a span (likely a message)
                    const parentSpan = node.parentElement?.closest('span');
                    if (parentSpan && currentMessage && parentSpan !== walker.currentNode.parentElement?.closest('span')) {
                        // We've moved to a new span, save the previous message
                        messages.push(currentMessage.trim());
                        currentMessage = text;
                    } else {
                        // Same span or no span, append to current message
                        currentMessage += (currentMessage ? ' ' : '') + text;
                    }
                }
            }
            
            // Don't forget the last message
            if (currentMessage.trim()) {
                messages.push(currentMessage.trim());
            }
            
            // Update gametext_arr
            gametext_arr = messages;
            
            // Mark as edited for autosave
            if (typeof warn_unsaved !== 'undefined') {
                warn_unsaved = true;
            }
            
            console.log('Chat edits saved to gametext_arr:', messages.length, 'messages');
        }
        
        // Reset sync flag after a delay
        setTimeout(() => {
            this.isSyncingContent = false;
        }, 100);
    },

    cleanEditingArtifacts(html) {
        if (!html) return html;
        
        // Remove any contenteditable attributes
        html = html.replace(/\scontenteditable="[^"]*"/g, '');
        
        // Remove any spellcheck attributes
        html = html.replace(/\sspellcheck="[^"]*"/g, '');
        
        // Remove any style attributes that might have been added during editing
        html = html.replace(/\sstyle="[^"]*cursor:\s*text[^"]*"/g, '');
        
        // Fix any broken HTML entities
        html = html.replace(/&amp;lt;/g, '&lt;');
        html = html.replace(/&amp;gt;/g, '&gt;');
        
        return html;
    },

    // Load content for a tab
    loadTabContent(panel, tabName) {
        const contentEl = document.getElementById(`klite-rpmod-content-${panel}`);
        if (!contentEl) {
            console.error(`Content element for panel ${panel} not found`);
            return;
        }
        
        // Clear previous content
        contentEl.innerHTML = '';
        
        // For PLAY panel, use mode-specific implementation
        if (panel === 'left' && tabName === 'PLAY' && window.KLITE_RPMod_PanelSwitcher) {
            const implementation = window.KLITE_RPMod_PanelSwitcher.getPanelImplementation('PLAY');
            if (implementation && implementation !== 'PLAY') {
                tabName = implementation;
            }
        }
        
        // Load the panel
        if (window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels[tabName]) {
            try {
                window.KLITE_RPMod_Panels[tabName].load(contentEl, panel);
            } catch (error) {
                console.error(`Error loading ${tabName} panel:`, error);
                contentEl.innerHTML = `
                    <div style="padding: 20px; color: #ff6666; text-align: center;">
                        <h3>Error loading ${tabName} panel</h3>
                        <p style="font-size: 12px; color: #888;">${error.message}</p>
                    </div>
                `;
            }
        } else {
            contentEl.innerHTML = `<h2 style="text-align: center; color: #888; margin-top: 50px;">${tabName}</h2>`;
        }
    },

    // Force refresh a panel
    forceRefreshPanel(panel, tabName) {
        const contentEl = document.getElementById(`klite-rpmod-content-${panel}`);
        if (!contentEl) return;
        
        // Clear current content
        contentEl.innerHTML = '';
        
        // Reload the panel
        setTimeout(() => {
            this.loadTabContent(panel, tabName);
        }, 50);
    },

    ensureCharacterManagerLoaded(callback) {
        if (window.KLITE_RPMod_Panels?.CHARS?.instance) {
            callback();
            return;
        }
        
        // If CHARS panel exists but no instance, try to initialize it
        if (window.KLITE_RPMod_Panels?.CHARS) {
            const tempContainer = document.getElementById('klite-rpmod-content-right');
            if (tempContainer) {
                // Temporarily switch to CHARS to initialize it
                const currentTab = this.state.activeTabs.right;
                this.loadTabContent('right', 'CHARS');
                
                // Wait a bit for initialization
                setTimeout(() => {
                    // Switch back to original tab
                    if (currentTab !== 'CHARS') {
                        this.loadTabContent('right', currentTab);
                    }
                    callback();
                }, 200);
            }
        } else {
            console.warn('CHARS panel not available yet');
            setTimeout(() => this.ensureCharacterManagerLoaded(callback), 500);
        }
    },

    // Toggle panel collapse
    togglePanel(side) {
        const panel = document.getElementById(`klite-rpmod-panel-${side}`);
        const width = window.innerWidth;
        const isMobile = width <= 767;
        const isTablet = width > 767 && width <= 1400;
        const mainContent = document.querySelector('.klite-rpmod-main-content');
        const isFullscreen = mainContent && mainContent.classList.contains('fullscreen');
        const isDesktop = width > 1400;
        
        panel.classList.toggle('collapsed');
        
        this.state.panelsCollapsed[side] = panel.classList.contains('collapsed');
        this.saveState();
        
        // Handle overlay mode for panels WITHOUT backdrop
        if (isMobile || isTablet || (isDesktop && isFullscreen)) {
            // In overlay mode, panels slide over content
            if (!panel.classList.contains('collapsed')) {
                panel.classList.add('overlay-mode');
            } else {
                panel.classList.remove('overlay-mode');
            }
        } else {
            // Desktop mode without fullscreen - no overlay
            panel.classList.remove('overlay-mode');
        }
        
        if (side === 'top') {
            const mainContent = document.querySelector('.klite-rpmod-main-content');
            mainContent.classList.toggle('top-expanded', !this.state.panelsCollapsed[side]);
            
            if (!this.state.panelsCollapsed[side]) {
                setTimeout(() => {
                    const topPanel = document.getElementById('klite-rpmod-panel-top');
                    const height = topPanel.offsetHeight;
                    document.documentElement.style.setProperty('--top-panel-height', `${height}px`);
                }, 300);
            }
        }
        
        // Update collapse handle arrow
        const handle = panel.querySelector('.klite-rpmod-collapse-handle');
        if (handle) {
            if (side === 'left') {
                handle.innerHTML = this.state.panelsCollapsed[side] ? '▶' : '◀';
            } else if (side === 'right') {
                handle.innerHTML = this.state.panelsCollapsed[side] ? '◀' : '▶';
            } else if (side === 'top') {
                handle.innerHTML = this.state.panelsCollapsed[side] ? '▼' : '▲';
            }
        }
        
        // No need to update main content position in overlay modes
        if (!isMobile && !isTablet && !(isDesktop && isFullscreen)) {
            this.updateMainContentPosition();
        }
    },

    // Update token counts
    updatePromptTokenCount(text) {
        const tokenCount = Math.ceil(text.length / 4);
        const promptTokenEl = document.getElementById('klite-prompt-token');
        if (promptTokenEl) {
            promptTokenEl.textContent = tokenCount;
        }
    },

    updateStoryTokenCount() {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        if (chatDisplay) {
            const text = chatDisplay.textContent || '';
            const tokenCount = Math.ceil(text.length / 4);
            const storyTokenEl = document.getElementById('klite-story-token');
            if (storyTokenEl) {
                storyTokenEl.textContent = tokenCount;
            }
        }
    },

    // Store the current AI avatar base64
    aiAvatarCurrent: null,
    aiAvatarDefault: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAAH/UlEQVRYCc1ZXWwcVxX+ZnZ2dr3e9b8du/Y6dmyHNGliSJzgUiRAogmoEi8Iyk8jxANCbfoQSgXiLUCRoKIQlSaVQOpLWwI8gQRCtXkI0DZNnCAS/9RtfuzYtWuvvbazu7P/M8N3xr9Ze9frNA290u7eOfecc78599xzzz2r4A7aNx4/XakqyU9asA9CsfcCSitgt1CVf0ldjLRR0kZgK/0qlD7L9p7//YtPzC+NF/2jFM1Jxq8/8ctPqyoesYGHYePAVmSh4BIn67Us/O3M6adfL1a2KIBfe/JXXSqsx6j0qwTWUKzyDfkUvE/6nyyor/zhhacubsizhlgQ4IkTJ9SrM4HHuZTfIWPnGrkP3OUqXObS/66jNvoi57HyKcwL8LHjv26wM9YPbNjH8wnfDboC5aTiVp995eT3xLLrmmsdhYRHjz23U7Gsn7L73Y3G7zKt27bsut2HjgwO9vWEc3WvAyiWWwJ3NJf5Q3zuVIGKzoe++NaVt15jBFhttwEUnwtH9Z9w+F5YbhXFYq8TFlxffuRTvWfPnqWLLjYCX22yIT5sn1udbX1P5hYMa0dWAEookd26dvD/0RcMgmV57hWAEufudihZnmQrv4JhKeY6Yo4PygmhKDhBSmArypZ5JVa1V8Zx9IF30d0QQjjpx3zSvTy89V8F2x/oOnx+oK9nzLGgHF8f5ITQNQuH2/rRdSSJri+kcbhjAB7S7rjxtHIwUYEmB7+N+MN3rEwEbQXxmSRu/f1NeWD/EOyVfXhnmuW8J7ZnNScr2eLB79ZdKA14OLMF07SQiSTwxvB+TGhtBGbhWtoPpYz+UqHD5ZJFUhGLJpFNb8GqxCTYuBBMmbbQKqp92NcZRGNTHVxuDSrXYi4UxqWe/6L37YRjuW33V+DzR/ajqq4KFl/AzJoYG5/C4JVxLIQTRc8m2LTFfK44GU+Jhk8c2I6DBztpnRoKLa6jsltFW+fH8G7/kKNo597dqKmsA7KrFmtqbkSJV8e5f1+FEUsVNyFzTW0p2dxUgLsc27aVY3tLE/xlVVw0mymeNBsWLVRbXof6z93nUMxsluBM8khTyGEjUFaJpuZ6VNdOIm6kivRRpZUA7RZHzyZfChGWlHrgK/VBp19FUyau0q90VcEOvwdetw0zlXG0kIRk1sYNWipFI3f4dZR73JQt5ccL0WUXtYvsFgJcSdMLQnRzQ+g2raLYmIxn8PxEDCnQUgSwxzDxaEMpQS7azMiY+OP7MQwkU1BcCtzzaRxv9MNFWbeZgejiSMH5lgb9AnDTpllZdI0NYodnBrHILvw17sNN7tbTbdV4J5HFSxNRdMxmsadSlxXFUDiFC3yJbwcrcD/99tjIHF6dvIUvpW+hc3QAgdEpXGjag6y6+fTCIemNtxBKlReJpmwMpT4dw5PTmI7MoDvgx769QfgTC+i5OoyxujI0DoWcpRsL1KFxOoIDwS60+Xx4cOwSRm/FMFJmYSfdpMmM4SJ1LjlpoaljBOjcvmRL5m0mR25QW0k8iamZMNp1P964OIpT9Ku5qIHIe+P0xWrUn/sXFMuG/tBnEJ2g1f6poKbcj74LA+juqMPkjAHTSCJBXaJz86aMEiCvhsBK9rCRkMlJ+8duMqbF4G0IojYYQEuNF38+/x/6nQvNDVXwvj0I6+aoIy792mAb+q5dRzKTRXN1Cdz0z6mpBYxe6Yc6EYbZuH+jqXJo9ogm91bGwq/kjOQ82jAMA9FpE74IPSJiwMMJWxi0XZqLgTiL8bkIerQSyimYYj97XxaNVT6GoCxUbpQQZWYpmwjNwh9PwCW7a7NGbJpzqd6EWXVpqNm5D3HLwHSMC2Qk+E6Mg4qK9Nw8UvNhvJdKYyhQ4QC02VcGh+CprITbH3D8UqKmyPoZwOtqA5inztUwvjFSwabJjR9q/BIx5r2I21QWbfs4YqkFTMVT0OlHvI0hm0kjaMzgwWANbgy/g+aOHc5MY9dvYEewAVcmZjBuKtA0t+QTmGKArm3chYi/FqKzYONF37K851UpR1C2txCzLEbK5UaCwdfgRplLZxBKphEiUN3jRW1bO0pLPKhpaXU+0heajIVoNeGdo1WNRBKm6kZa0zdZMyda9Qo25zWkHMHV+halClYNvHzrDEFFeIwpTBIsjwfnGO+G//IP5+h687XXF9+Tb3SOtIXyGiQJVo5F8OXSDNweLzOdQtaQMVYfBJN0nYxaMte9hw4H+dwtxHzNy7ASioSR4FGl+0odkKbuRay8GjGetUZZNT9Vi33STN2zcqwZs7Pwxgx0VDdAs2+7TK6fTsFLZ049/VsZWHEEqZUosD7Lt8tb4ihxedBRUY/LI9cxOxOCxiCsuGSytTYRh1h+ZppgmsjE4/BwqXc10xU0L303fxSk9GWbWASctGVNzsM3jz13jCpfcB7yfNk8T8PGAq5NjiLDEKO63c5uvl0ThTmTJK9WJgOdaVdHUysqS8q5+/MoXiJz8z356qnvn1rmWrGgEKSQw3tpO0Hmrcco3I41vkpUtDJ8UEYyk0JNshbh0GTXbg7upGBYq2+ddil9WBnzF2Q6upbxHvRfVt2uH+YWkdZ5q9RGpJDDxEmibl5/vMuAX2ZceObMb566mat3HUBhkCqTFHIY6mW84M7OVbjVZym/0XI/3gic6NoQoAyIJaWQMxf3zNB1GukL9UK/W406pYD5DH3uZ8///EfRfHrX+eBGjB/ZEnAu2I9sET0X6L38G+J/l15BUb3szcMAAAAASUVORK5CYII=', // The robot emoji

    // Method to update AI avatar with character image
    updateAIAvatar(imageUrl) {
        if (imageUrl) {
            this.aiAvatarCurrent = imageUrl;
        } else {
            // Reset to default robot avatar
            this.aiAvatarCurrent = this.aiAvatarDefault;
        }
        
        // Force refresh of all avatars in chat
        this.replaceAvatarsInChat();
    },


    replaceAvatarsInChat() {
        // The exact base64 strings to look for
        const USER_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAAXNSR0IB2cksfwAAAAlwSFlzAAACTwAAAk8B95E4kAAAAB5QTFRFFIqj/v//V6u9ksnUFIqjx+PpcbjHFIqjFIqjAAAAcfUgXwAAAAp0Uk5T/////9z//5IQAKod7AcAAACKSURBVHicY5hRwoAE3DsZWhhQgAdDAaoAO4MDqgALA/lAOQmVzyooaIAiYCgoKIYiICgoKIouIIhfBYYZGLYwKBuh8oHcVAUkfqKgaKCgMILPJggGCFMUIQIIewIhAnCXMAlCgQKqEQhDmGECAegCBmiGws1gYFICA2SnIgEHVC4LZlRiRDZ6cgAAfnASgWRzByEAAAAASUVORK5CYII=';
        
        const AI_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAADxQTFRFS2Si+X5+pmBfHyApLjZSS2SjP057Vzw5EA4Sf1ZT+9Sv1WpqnYx/7qaYw7vUAAAAS2Sj9PPzgnrLS2SjAzrF9gAAABR0Uk5T///////w////////////AKj//yMlHqVpAAAD3klEQVR4nKWXi7KjIAyGFSgxEjhV3/9d90+8onZPd810prWSDwi50fyoTNP7/X79g2D4NJlqo+rvV/Mf8npPM2B6/4+6ihKaB/pGaH4e6IPw00y3+48xhBC3J32Id+NeUzN9UPfer4RoD/eIqbnuwLS7zncLAfqdPvvDmvY9XAE6vuuImEAw8fNT1/kr4Qqw+YhdIocfJl0glxyTvyG8m7MNY1B9diAkmgGUODnH7Km7AF53AGEjUJtWYdUPzn0LyC6AQO0qCUCi1PKXAM5tCwXeAC0ROf36AqA2VACmbQ8yP9DVimeA6lPKkLaW3EPylXAARBXV701OhOVPI6hcAXH1mTyP7e8AMyEc4mQDzP7XrfOfl5D7ndAdfXID6NwMyXACEpEbgPTCLJn1hEGoAep/OKheQiCEEhj1HgBQX1ZxQMPLlyVsABwejkp8EGEQAkxRA4RgIRYhTxme1fkKoBZwAHjLA+b/cgLQ8gZ4gZ+tVtgAnboaa+Lg0IwRhBqAmX0cI0WFqHN3FUAXAOPpzIWhPzZYQgUAu4ljiaKTaKwtZtwAIdv8XkocR9+UYM5/BMTRxzJKsWEu+RPAAsBxKSWWgTHS18cofiwhlCJD4cApUb0CNWKA/5dhwAqKD2UIXAEoFgUMkIJTCCcjzkGE890BQhXA685WQNqD6ujKWDRhhI7EdKUCtKSGxd8ASEr+6sqNApKPeD/iFEpT6nAUcAMgMmBzqwVPgJCd80X3AIlDDcjSzH8PJbD7AGiT020WjfcCN0jI5WwJGk5axP4eikeyvQd4HE5i7I4xEpWANKg0m2p0OUIcQKJnd7uCaABMRebOSOoB1WUVYACzaGSs012NaI5gAC0GcPWD9iLI6/qVdGeXY7R6xu1M0FAhG7s865ctw97Zoz85kuXi5T2EbaZatLileQA+VifrYGrT7ruL+lbZ0orYcXQJpry/tl+26l1s8sOy+BxMqKjr23nf7mhFnktbOgJOGQmnVG0ZVve06VvDUFmEztGIhHAy2YHA+qsCuFNS1T0Edf41AOZ1b7uwH1tYYFA4p3U1owiOOu+AsyxrQ3AIXwrLXtryL4BPpW0rrvMaPgHSx+K6l3cj3Oin1lH6S3nfd+KDa51lAjJhE6ddz7XRu29xUH51O95SgNOahDTB3PPvLc7cZPWYEVlVlp5AkGtJK/63XZoq0jBsvUrPeNDvr/tE1SnD3qxIEVuNfAsY0J9w4Ux2ZKizHPLHFdw127r7HIS2ZpvFTHHbbN+3+2Qm29p9NvXv2v3twkHHCwd9vnA8vvI8vnQ9vvY9v3g+vvo+v3w/u/7/AZoAPJwrbZ1IAAAAAElFTkSuQmCC';
        
        // Your new avatars
        const NEW_USER_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAAFoElEQVRYCc1ZPWwcRRT+Znbv/2KfCY5tCRNb/HSIIgQaCpoI5PSpQFQpQEgBIoWGwgUNSEDSQOEyVPS2QGkjJAiRQNCAhBLjSIfy5zvf+W5vb3eG92Z379bru2T3cEzG2pvdN2/e+/bNvDdvnwUmaKe/2pzRffmKhj4ptHgB0MskZgkCVSNOo039TUDc0EL/JiCuiZz6cf3d49tmPMOPyMCLNy5tviq1PE2ATtG8E1nmEu91AnxFCbX+3bnjV9POTQVw5Yu/X4Il3oTWZ0jwQlrhY/jqEOJb+PqbjQ+f/nkMz4D8QICrq1r+NL31DnGfpeV7cTDrIG40fiUxay83F79eXRVqnMixAF//8s6CLboXNPD+uMkHQScAFz1d+uz7D2bro+SNBLjy+V/PQ9of01K8NWrSgdO0vgzlfbJx/pk/k7JlksCWO1RwDIANQQYxuhOA9gDkPcfLemiWi4MhkKybMcTJex7YIR71nosrT96z7tApB0MDgCaUsLf+/+1siMUgGQA0ce6gQ8kkL8sYOOaGzXhxcEJQ8JwgCEuSUKsKzD8BVPN9I7bbt/HPtsD9loY/NsJFEEb2dSX0GT5xbB4Oj6/MJ4QlNRamPcyVd6B223CavtFmSwvHK2VUc1O4tZ1H3x8ZzUYiC4kLASZcFebgd8UVGsh6tmKm5GKxeg/a7ZDjU0oQSte02zX9yHwRdecobreLDwIzbuy6yOtTkrOSScCx1FqOLNfrGDBaaSgCpahncPznu13UrCaBJ8TZ2wnGZpuUKftk2MJH3m9BIVhWIyIyIT+EmCzRQl7U0NOFzFoYmx3mc5knS+1Cew4Ue4lBE6GLW0uQNX1YyiGe7AAZGzmJSTYzA7SkouX0CUAC3whJ7Exk6gmaXmYvXppgJqpWG8G+CzVHBowLY/DkPEfsNlpuLT6S9n7JNml6fFVSTu20mihR3CP90XYzMxlnJM5gJobddgMoPZVScoyNPiFMHIyRUt92xCxKzjZKBctYUocWpF1Hyx48CNqf/b6HHcynlptktEkef+BkDlS6UMPuTgE5yzFhZY/ZzNLS6iqJdo9UTM0l9aZ7Jmx8Ft9Mx53kEnCsWXS6LhSdZ77vB5cX9Exzuj105JOEdHjkJ6U85PkmzRQ3HsI0dlgVZ9H0Z9Dt9QmcB88LLgbbc/toeFNQpcwnaEyfuCH5uzVGyXQrrDzUkWV0VZXADa3IQLt+Eaq6BGFnj38RCMZm80f10O+iofS9zFfA+9HrkKcOThUBVTgCkQ++49NL28vJ2CR/8ROZPqonaxyw8xbvOw8+7z9zebCJZltRwJlI9nXGJoNyhMlmUkuxLKBSljh2VGO+ehd2rw6/78YcxYPl3sUcZTrMU6lI8JxsTVxhbCYOcjmCNuPbJGDsjpaUkZRyDip2C3DuoX+viVZrB932Lu0QSq0k+xtJCENMp9lA55cfUKhWUJyapheahijNYNefRqdfoMzngZ5NCata5xcKwyuwcmnrIik6x8Rk4+Bb1HeB5h/o3r8NjzyUm8kBLWn6CJjpzSBh5dRLqSBOEs3K2SjPzELUnkNXzhHrGJBCXNo4t2gKBsOThGolBPc1uvaVOIS3Sxb7HU7jDqumsDYUbEAMUJnhvT+cyPJ5SI33587tOoqOC3GsBG2POJ+5JKIIS9gGmsJCzlo0EO/91i1K5+8MLGESUk5KM16RzF7rPvzGZvSY7NfiRaWhBYmNCznXalvP0jYy5o1mOj0KvGqKjEuW+E+OGUjkF8u7QDlSEPYk/eJJwrARowe2jxG4/GCh8ymty+HUZSLdVJ/xUf4oWUQaLHHEZxiokEPrdzmiPfI+LB4lwbHefRaMwDwu5bd9FowA8ducbCyepz33Hl1cbDzYxjJJNusYZblI2VgLRgzcP7Yl4DhIvn9si+hJoIf5b4h/AQQEqIODkoUZAAAAAElFTkSuQmCC';
        const NEW_AI_AVATAR = this.aiAvatarCurrent || this.aiAvatarDefault;
        
        // Get all images in the chat area
        const chatArea = document.getElementById('klite-rpmod-chat-display');
        if (!chatArea) return;
        
        const images = chatArea.querySelectorAll('img');
        images.forEach(img => {
            if (img.src === USER_AVATAR_ORIGINAL) {
                img.src = NEW_USER_AVATAR;
            } else if (img.src === AI_AVATAR_ORIGINAL) {
                img.src = NEW_AI_AVATAR;
                // Also apply styling for character avatars to fit nicely
                if (this.aiAvatarCurrent && this.aiAvatarCurrent !== this.aiAvatarDefault) {
                    img.style.objectFit = 'cover';
                    img.style.border = '2px solid #5a6b8c';
                }
            }
        });
    },

        // Set up event listeners
        setupEventListeners() {
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
            // Existing Alt+R shortcut
            if (e.altKey && e.key === 'r') {
                this.toggle();
            }
            
            // Ctrl+Shift+Enter for Generate/Submit
            if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔥 Hotkey: Ctrl+Shift+Enter - Submit/Generate');
                
                // Check if we're already generating
                if (this.buttonState.isGenerating) {
                    console.log('Already generating, ignoring hotkey');
                    return;
                }
                
                // Clear inputs before submission
                const rpmodInput = document.getElementById('klite-rpmod-input');
                const liteInput = document.getElementById('input_text');
                
                // Try to submit using multiple methods
                const submitBtn = document.querySelector('.klite-rpmod-submit-button');
                if (submitBtn && !submitBtn.disabled) {
                    // Use the RPMod submit button
                    submitBtn.click();
                } else {
                    // Fallback to direct function calls
                    if (typeof submit_generation_button === 'function') {
                        console.log('Using submit_generation_button');
                        submit_generation_button(false);
                        this.startGenerating();
                    } else if (typeof prepare_submit_generation === 'function') {
                        console.log('Using prepare_submit_generation');
                        prepare_submit_generation();
                        this.startGenerating();
                    }
                    
                    // Clear inputs after submission
                    if (rpmodInput) {
                        rpmodInput.value = '';
                        this.updatePromptTokenCount('');
                    }
                    if (liteInput) {
                        liteInput.value = '';
                    }
                }
                return false;
            }
            
            // Ctrl+Shift+R for Retry
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+R - Retry');
                if (typeof btn_retry === 'function') {
                    btn_retry();
                }
                return false;
            }
            
            // Ctrl+Shift+Z for Undo/Back
            if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+Z - Undo');
                if (typeof btn_back === 'function') {
                    btn_back();
                }
                return false;
            }
            
            // Ctrl+Shift+Y for Redo
            if (e.ctrlKey && e.shiftKey && e.key === 'Y') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+Y - Redo');
                if (typeof btn_redo === 'function') {
                    btn_redo();
                }
                return false;
            }
            
            // Ctrl+Shift+A for Abort Generation
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+A - Abort');
                if (this.buttonState.isGenerating && typeof abort_generation === 'function') {
                    abort_generation();
                    this.stopGenerating();
                }
                return false;
            }
            
            // Ctrl+Shift+E for Toggle Edit Mode
            if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+E - Toggle Edit Mode');
                const editBtn = document.getElementById('klite-editing-toggle');
                if (editBtn) {
                    editBtn.click();
                }
                return false;
            }
            
            // Ctrl+Shift+M for Memory Panel
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+M - Memory Panel');
                this.switchTab('right', 'MEMORY');
                return false;
            }
            
            // Ctrl+Shift+C for Characters Panel
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Hotkey: Ctrl+Shift+C - Characters Panel');
                this.switchTab('right', 'CHARS');
                return false;
            }
        }, true); // Use capture phase to ensure we get the event first
        
        // Log active hotkeys
        console.log('🔥 KLITE RPMod Hotkeys Active:');
        console.log('  Ctrl+Shift+Enter = Generate/Submit');
        console.log('  Ctrl+Shift+R = Retry');
        console.log('  Ctrl+Shift+Z = Undo/Back');
        console.log('  Ctrl+Shift+Y = Redo');
        console.log('  Ctrl+Shift+A = Abort Generation');
        console.log('  Ctrl+Shift+E = Toggle Edit Mode');
        console.log('  Ctrl+Shift+M = Memory Panel');
        console.log('  Ctrl+Shift+C = Characters Panel');
        console.log('  Ctrl+Shift+U = RPmod 🔛 Lite');
        // Sync with KoboldAI elements
        this.syncWithKobold();

        // Handle window resize for mobile mode
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    },

    // Handle window resize
    handleResize() {
        const width = window.innerWidth;
        const isMobile = width <= 767;
        const isTablet = width > 767 && width <= 1400;
        
        // Update main content positioning
        this.updateMainContentPosition();
        
        // Update info line based on screen size
        const inputInfo = document.querySelector('.klite-rpmod-input-info');
        if (inputInfo) {
            if (isMobile) {
                // Simplified mobile version
                const storyToken = document.getElementById('klite-story-token')?.textContent || '0';
                const connectionText = document.getElementById('klite-connection-text')?.textContent || 'Loading...';
                const queuePosition = document.getElementById('klite-queue-position')?.textContent || '#0';
                const waitTime = document.getElementById('klite-wait-time')?.textContent || '0s';
                
                inputInfo.innerHTML = `
                    <span>🗒️ <span id="klite-story-token">${storyToken}</span> | <span id="klite-connection-text">${connectionText}</span> | 💤 <span id="klite-queue-position">${queuePosition}</span> | ⏱️ <span id="klite-wait-time">${waitTime}</span></span>
                `;
            } else {
                // Full desktop version
                const promptToken = document.getElementById('klite-prompt-token')?.textContent || '0';
                const storyToken = document.getElementById('klite-story-token')?.textContent || '0';
                const connectionText = document.getElementById('klite-connection-text')?.textContent || 'Loading...';
                const queuePosition = document.getElementById('klite-queue-position')?.textContent || '#0';
                const waitTime = document.getElementById('klite-wait-time')?.textContent || '0s';
                
                inputInfo.innerHTML = `
                    <span>✍️ <span id="klite-prompt-token">${promptToken}</span> | 🗒️ <span id="klite-story-token">${storyToken}</span></span>
                    <span>🔌 <span id="klite-connection-text">${connectionText}</span> | 💤 <span id="klite-queue-position">${queuePosition}</span> | ⏱️ <span id="klite-wait-time">${waitTime}</span></span>
                `;
            }
        }
        
        // Mobile specific adjustments
        if (isMobile) {
            // Show mobile toggle button
            const mobileToggle = document.querySelector('.klite-rpmod-mobile-toggle');
            if (mobileToggle) {
                mobileToggle.style.display = 'block';
            }
            
            // Enable top panel toggle
            const topPanel = document.getElementById('klite-rpmod-panel-top');
            if (topPanel) {
                topPanel.classList.add('mobile-enabled');
            }
        } else {
            // Hide mobile toggle on larger screens
            const mobileToggle = document.querySelector('.klite-rpmod-mobile-toggle');
            if (mobileToggle) {
                mobileToggle.style.display = 'none';
            }
        }

        // Force recalculation of collapse handle positions
        const topPanel = document.getElementById('klite-rpmod-panel-top');
        if (topPanel) {
            const handle = topPanel.querySelector('.klite-rpmod-collapse-handle');
            if (handle) {
                // Force a reflow to ensure proper positioning
                handle.style.display = 'none';
                handle.offsetHeight; // Trigger reflow
                handle.style.display = '';
            }
        }

    },

    // Sync with KoboldAI elements
    syncWithKobold() {
        // Sync game text
        const gametext = document.getElementById('gametext');
        if (gametext) {
            const chatDisplay = document.getElementById('klite-rpmod-chat-display');
            if (chatDisplay) {
                // Store the current edit state of chat display
                const wasEditable = chatDisplay.contentEditable === 'true';
                
                // Only sync if content has actually changed
                if (!this.isSyncingContent) {
                    this.isSyncingContent = true;
                    
                    // Clean the HTML before setting it
                    let cleanedHTML = gametext.innerHTML || '<p style="color: #666;">No story content yet...</p>';
                    
                    // Fix broken span tags and clean up txtchunk issues
                    cleanedHTML = this.cleanGameTextHTML(cleanedHTML);
                    
                    chatDisplay.innerHTML = cleanedHTML;
                    
                    // Replace avatars after content update
                    this.replaceAvatarsInChat();
                    
                    // Restore edit state
                    if (wasEditable) {
                        chatDisplay.contentEditable = 'true';
                    }
                    
                    this.isSyncingContent = false;
                }
                
                // Set up observer only once
                if (!this.gameTextObserver) {
                    this.gameTextObserver = new MutationObserver((mutations) => {
                        // Check if this is a real content change, not just our own sync
                        const isRealChange = mutations.some(mutation => {
                            return mutation.type === 'childList' && 
                                mutation.addedNodes.length > 0 &&
                                !this.isSyncingContent;
                        });
                        
                        if (isRealChange && !this.isSyncingContent) {
                            this.isSyncingContent = true;
                            
                            // Clean the HTML before updating
                            const cleanedHTML = this.cleanGameTextHTML(gametext.innerHTML);
                            chatDisplay.innerHTML = cleanedHTML;
                            
                            this.updateStoryTokenCount();
                            this.replaceAvatarsInChat();
                            this.isSyncingContent = false;
                        }
                    });
                    
                    this.gameTextObserver.observe(gametext, { 
                        childList: true, 
                        subtree: true,
                        characterData: false,
                        attributes: false
                    });
                }
            }
        }

        // Sync edit mode state
        const allowEditingCheckbox = document.getElementById('allowediting');
        if (allowEditingCheckbox && allowEditingCheckbox.checked) {
            this.toggleChatEditMode(true);
            const editButton = document.getElementById('klite-editing-toggle');
            if (editButton) {
                editButton.classList.add('active');
            }
        }

        // Sync input field
        const inputText = document.getElementById('input_text');
        if (inputText) {
            const rpmodInput = document.getElementById('klite-rpmod-input');
            if (rpmodInput) {
                rpmodInput.value = inputText.value || '';
                
                // Set up listeners only once
                if (!rpmodInput.hasAttribute('data-sync-listener')) {
                    rpmodInput.setAttribute('data-sync-listener', 'true');
                    
                    rpmodInput.addEventListener('input', () => {
                        if (inputText) inputText.value = rpmodInput.value;
                    });
                    
                    inputText.addEventListener('input', () => {
                        if (rpmodInput) rpmodInput.value = inputText.value;
                    });
                }
            }
        }
    },

    // Add this new helper function to clean the HTML
    cleanGameTextHTML(html) {
        if (!html) return html;
        
        // Create a temporary container to manipulate the HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Fix any broken span tags with txtchunk class
        // First, replace any text that looks like HTML tags
        let cleanedHTML = temp.innerHTML;
        
        // Remove escaped HTML entities that are showing as text
        cleanedHTML = cleanedHTML.replace(/&lt;\/span&gt;&lt;span class="txtchunk"&gt;/g, '');
        cleanedHTML = cleanedHTML.replace(/&lt;span class="txtchunk"&gt;/g, '');
        cleanedHTML = cleanedHTML.replace(/&lt;\/span&gt;/g, '');
        
        // Also handle cases where they appear as actual text
        cleanedHTML = cleanedHTML.replace(/<\/span><span class="txtchunk">/g, ' ');
        
        // Set the cleaned HTML back
        temp.innerHTML = cleanedHTML;
        
        // Now handle any remaining span.txtchunk elements properly
        const txtchunks = temp.querySelectorAll('span.txtchunk');
        txtchunks.forEach(chunk => {
            // Replace the span with its text content
            const text = document.createTextNode(chunk.textContent);
            chunk.parentNode.replaceChild(text, chunk);
        });
        
        // Clean up any duplicate HR elements while preserving single ones
        const hrs = temp.querySelectorAll('hr');
        const hrSet = new Set();
        hrs.forEach((hr, index) => {
            // Keep only the first HR in each position
            const prevSibling = hr.previousElementSibling;
            const nextSibling = hr.nextElementSibling;
            const key = `${prevSibling?.textContent || ''}|${nextSibling?.textContent || ''}`;
            
            if (hrSet.has(key)) {
                hr.remove();
            } else {
                hrSet.add(key);
            }
        });
        
        return temp.innerHTML;
    },

    // Public API
    api: {
        toggle: () => {
            const container = document.getElementById('klite-rpmod-container');
            if (container) {
                container.style.display = container.style.display === 'none' ? 'block' : 'none';
            }
        },
        switchTab: (panel, tab) => KLITE_RPMod.switchTab(panel, tab),
        updateAIAvatar: (imageUrl) => KLITE_RPMod.updateAIAvatar(imageUrl),
        refreshPanel: (panel, tab) => KLITE_RPMod.forceRefreshPanel(panel, tab),
        saveState: () => KLITE_RPMod.saveUIState()
    }
};

window.KLITE_toggleTopNav = function() {
    // Try to call original function first
    if (window.toggleTopNav && typeof window.toggleTopNav === 'function' && window.toggleTopNav !== window.KLITE_toggleTopNav) {
        try {
            window.toggleTopNav();
        } catch (e) {
            console.log('Original toggleTopNav failed, using fallback');
        }
    }
    
    // Our fallback/additional handling
    const navDropdown = document.querySelector('#klite-rpmod-panel-top #navbarNavDropdown');
    if (navDropdown) {
        if (navDropdown.classList.contains('collapse')) {
            // Toggle the collapse class
            if (navDropdown.style.display === 'none' || navDropdown.style.display === '') {
                navDropdown.style.display = 'block';
                navDropdown.classList.add('in');
                navDropdown.classList.add('show');
            } else {
                navDropdown.style.display = 'none';
                navDropdown.classList.remove('in');
                navDropdown.classList.remove('show');
            }
        }
    }
};

window.KLITE_closeTopNav = function() {
    // Try original first
    if (window.closeTopNav && typeof window.closeTopNav === 'function' && window.closeTopNav !== window.KLITE_closeTopNav) {
        try {
            window.closeTopNav();
        } catch (e) {
            console.log('Original closeTopNav failed, using fallback');
        }
    }
    
    // Our fallback
    const navDropdown = document.querySelector('#klite-rpmod-panel-top #navbarNavDropdown');
    if (navDropdown) {
        navDropdown.style.display = 'none';
        navDropdown.classList.remove('in');
        navDropdown.classList.remove('show');
    }
};

// Initialize when ready
const initWhenReady = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
        return;
    }

    setTimeout(() => {
        KLITE_RPMod.init();
        window.KLITE_RPMod = KLITE_RPMod.api;
    }, 500);
};

initWhenReady();

// =============================================
// KLITE RP Mod - UI Components and Styles
// Provides reusable UI components and styling
// =============================================

    window.KLITE_RPMod_UI = {
        // Button styles from mockup
        buttonStyles: {
            primary: `
                padding: 10px 20px;
                background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
                border: 2px solid #5a9fee;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
            `,
            secondary: `
                padding: 10px 20px;
                background: #3a3a3a;
                border: 2px solid #4a4a4a;
                border-radius: 8px;
                color: #ccc;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            `,
            danger: `
                padding: 10px 20px;
                background: linear-gradient(135deg, #e24a4a 0%, #bd3535 100%);
                border: 2px solid #ee5a5a;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(226, 74, 74, 0.3);
            `,
            text: `
                padding: 10px 20px;
                background: transparent;
                border: none;
                color: #4a90e2;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: underline;
            `
        },

        // Create a styled button
        createButton(text, type = 'primary', onClick) {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = this.buttonStyles[type] || this.buttonStyles.primary;
            
            // Add hover effect
            button.onmouseover = () => {
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            };
            
            button.onmouseout = () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = type === 'primary' || type === 'danger' ? 
                    '0 2px 8px rgba(74, 144, 226, 0.3)' : 'none';
            };
            
            if (onClick) {
                button.onclick = onClick;
            }
            
            return button;
        },

        // Create an input field
        createInput(placeholder, type = 'text') {
            const input = document.createElement('input');
            input.type = type;
            input.placeholder = placeholder;
            input.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            input.onfocus = () => {
                input.style.borderColor = '#4a90e2';
                input.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
            };
            
            input.onblur = () => {
                input.style.borderColor = '#3a3a3a';
                input.style.boxShadow = 'none';
            };
            
            return input;
        },

        // Create a textarea
        createTextarea(placeholder, rows = 4) {
            const textarea = document.createElement('textarea');
            textarea.placeholder = placeholder;
            textarea.rows = rows;
            textarea.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                font-family: inherit;
                resize: vertical;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            textarea.onfocus = () => {
                textarea.style.borderColor = '#4a90e2';
                textarea.style.boxShadow = '0 0 0 3px rgba(74, 144, 226, 0.1)';
            };
            
            textarea.onblur = () => {
                textarea.style.borderColor = '#3a3a3a';
                textarea.style.boxShadow = 'none';
            };
            
            return textarea;
        },

        // Create a section container
        createSection(title, content) {
            const section = document.createElement('div');
            section.style.cssText = `
                margin-bottom: 20px;
                padding: 20px;
                background: #222;
                border: 2px solid #333;
                border-radius: 10px;
            `;
            
            if (title) {
                const header = document.createElement('h3');
                header.textContent = title;
                header.style.cssText = `
                    margin: 0 0 15px 0;
                    color: #ddd;
                    font-size: 16px;
                    font-weight: 600;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #333;
                `;
                section.appendChild(header);
            }
            
            if (content) {
                if (typeof content === 'string') {
                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = content;
                    section.appendChild(contentDiv);
                } else {
                    section.appendChild(content);
                }
            }
            
            return section;
        },

        // Create a select dropdown
        createSelect(options, selected) {
            const select = document.createElement('select');
            select.style.cssText = `
                width: 100%;
                padding: 10px 15px;
                background: #1a1a1a;
                border: 2px solid #3a3a3a;
                border-radius: 8px;
                color: #ddd;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-sizing: border-box;
            `;
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value || opt;
                option.textContent = opt.label || opt;
                if (selected === option.value) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            select.onfocus = () => {
                select.style.borderColor = '#4a90e2';
            };
            
            select.onblur = () => {
                select.style.borderColor = '#3a3a3a';
            };
            
            return select;
        },

        // Create a checkbox with label
        createCheckbox(label, checked = false) {
            const container = document.createElement('label');
            container.style.cssText = `
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
                margin-bottom: 10px;
            `;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.style.cssText = `
                width: 20px;
                height: 20px;
                margin-right: 10px;
                cursor: pointer;
            `;
            
            const labelText = document.createElement('span');
            labelText.textContent = label;
            labelText.style.cssText = `
                color: #ccc;
                font-size: 14px;
            `;
            
            container.appendChild(checkbox);
            container.appendChild(labelText);
            
            return { container, checkbox };
        },

        // Create a slider with label
        createSlider(label, min, max, value, step = 1) {
            const container = document.createElement('div');
            container.style.cssText = `margin-bottom: 15px;`;
            
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            `;
            
            const labelText = document.createElement('span');
            labelText.textContent = label;
            labelText.style.cssText = `color: #ccc; font-size: 14px;`;
            
            const valueText = document.createElement('span');
            valueText.textContent = value;
            valueText.style.cssText = `color: #4a90e2; font-size: 14px;`;
            
            labelDiv.appendChild(labelText);
            labelDiv.appendChild(valueText);
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.value = value;
            slider.step = step;
            slider.style.cssText = `
                width: 100%;
                height: 6px;
                background: #333;
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            `;
            
            // Update value display
            slider.oninput = () => {
                valueText.textContent = slider.value;
            };
            
            container.appendChild(labelDiv);
            container.appendChild(slider);
            
            return { container, slider };
        },

        // Create a divider
        createDivider() {
            const divider = document.createElement('hr');
            divider.style.cssText = `
                border: none;
                border-top: 2px solid #333;
                margin: 20px 0;
            `;
            return divider;
        },

        // Create an info box
        createInfoBox(text, type = 'info') {
            const colors = {
                info: { bg: '#1a3a52', border: '#2a5a82', text: '#6ab7ff' },
                success: { bg: '#1a4a2a', border: '#2a7a4a', text: '#6aff8a' },
                warning: { bg: '#4a3a1a', border: '#7a5a2a', text: '#ffb76a' },
                error: { bg: '#4a1a1a', border: '#7a2a2a', text: '#ff6a6a' }
            };
            
            const color = colors[type] || colors.info;
            
            const box = document.createElement('div');
            box.style.cssText = `
                padding: 15px;
                background: ${color.bg};
                border: 2px solid ${color.border};
                border-radius: 8px;
                color: ${color.text};
                font-size: 14px;
                margin-bottom: 15px;
            `;
            box.textContent = text;
            
            return box;
        },

        // Show a notification
        showNotification(message, type = 'info', duration = 3000) {
            const notification = this.createInfoBox(message, type);
            notification.style.cssText += `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            
            document.body.appendChild(notification);
            
            window.setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                window.setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    };


// =============================================
// KLITE RP Mod - Shared Helper Functions
// Reusable utilities for all panels
// =============================================

    window.KLITE_RPMod_Helpers = {
        // =============================================
        // SECURITY & SANITIZATION UTILITIES
        // =============================================
        Security: {
            // HTML sanitization
            sanitizeHTML(text) {
                if (typeof text !== 'string') return text;
                
                // Create a temporary div to safely escape HTML
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },

            sanitizeCharacterDataPreserveFormat(characterData) {
                const sanitized = {
                    ...characterData,
                    name: this.sanitizeCharacterName(characterData.name),
                    creator: this.sanitizeCreatorName(characterData.creator),
                    tags: this.sanitizeTags(characterData.tags)
                };

                // Sanitize text fields while preserving formatting
                const textFields = ['description', 'scenario', 'personality', 'first_mes', 'mes_example', 
                                'creator_notes', 'system_prompt', 'post_history_instructions'];
                textFields.forEach(field => {
                    if (sanitized[field]) {
                        sanitized[field] = this.sanitizeTextPreserveFormat(sanitized[field]);
                    }
                });

                // Handle nested character book data
                if (sanitized.character_book && sanitized.character_book.entries) {
                    sanitized.character_book.entries = sanitized.character_book.entries.map(entry => ({
                        ...entry,
                        content: this.sanitizeTextPreserveFormat(entry.content || ''),
                        comment: this.sanitizeTextPreserveFormat(entry.comment || ''),
                        key: this.sanitizeTextPreserveFormat(entry.key || ''),
                        keysecondary: this.sanitizeTextPreserveFormat(entry.keysecondary || ''),
                        keyanti: this.sanitizeTextPreserveFormat(entry.keyanti || '')
                    }));
                }

                // Handle alternate greetings
                if (Array.isArray(sanitized.alternate_greetings)) {
                    sanitized.alternate_greetings = sanitized.alternate_greetings
                        .map(greeting => this.sanitizeTextPreserveFormat(greeting));
                }

                return sanitized;
            },

            // Remove potentially dangerous content
            sanitizeTextPreserveFormat(text) {
                if (typeof text !== 'string') return text;
                
                return text
                    // Remove script tags and their content
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    // Remove javascript: URLs
                    .replace(/javascript:/gi, '')
                    // Remove on* event handlers
                    .replace(/\s*on\w+\s*=\s*[^>]*/gi, '')
                    // Remove data: URLs (except safe image types)
                    .replace(/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml))[^;]*/gi, '');
                    // DO NOT escape HTML entities - preserve formatting
            },

            // Validate and sanitize character name
            sanitizeCharacterName(name) {
                if (!name || typeof name !== 'string') {
                    return 'Unknown Character';
                }
                
                // Remove control characters and limit length
                const cleaned = name
                    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                    .trim()
                    .substring(0, 100); // Limit to 100 characters
                    
                return cleaned || 'Unknown Character';
            },

            // Validate and sanitize creator name
            sanitizeCreatorName(creator) {
                if (!creator || typeof creator !== 'string') {
                    return 'Unknown';
                }
                
                const cleaned = creator
                    .replace(/[\x00-\x1F\x7F]/g, '')
                    .trim()
                    .substring(0, 50); // Limit creator name length
                    
                return cleaned || 'Unknown';
            },

            // Sanitize tags array
            sanitizeTags(tags) {
                if (!Array.isArray(tags)) {
                    return [];
                }
                
                return tags
                    .filter(tag => typeof tag === 'string')
                    .map(tag => tag
                        .replace(/[\x00-\x1F\x7F]/g, '')
                        .trim()
                        .substring(0, 30) // Limit tag length
                    )
                    .filter(tag => tag.length > 0)
                    .slice(0, 20); // Limit number of tags
            }
        },

        // =============================================
        // TEXT ENCODING CLEANUP
        // =============================================
        TextEncoding: {
            cleanTextEncoding(characterData) {
                // PRESERVE binary data before JSON serialization
                const preservedBlob = characterData._imageBlob;
                const preservedImageData = characterData._imageData;
                
                console.log('Before cleaning - has blob:', !!preservedBlob);
                console.log('Before cleaning - blob type:', preservedBlob?.constructor.name);
                
                // Create deep copy for text cleaning (this removes blobs)
                const cleaned = JSON.parse(JSON.stringify(characterData));
                
                // Function to clean text in any string value
                const cleanText = (text) => {
                    if (typeof text !== 'string') return text;
                    
                    return text
                        // Fix common UTF-8 encoding artifacts
                        .replace(/â€™/g, "'")           // Smart apostrophe artifacts
                        .replace(/â€œ/g, '"')          // Smart quote artifacts  
                        .replace(/â€/g, '"')          // Smart quote artifacts
                        .replace(/â€"/g, '—')          // Em dash artifacts
                        .replace(/â€"/g, '–')          // En dash artifacts
                        .replace(/Â /g, ' ')           // Non-breaking space artifacts
                        .replace(/â€¦/g, '…')         // Ellipsis artifacts
                        .replace(/â€¢/g, '•')         // Bullet point artifacts

                        // Fix specific Unicode apostrophe and quote characters by char code
                        .replace(/\u2019/g, "'")     // Right single quotation mark (8217) → standard apostrophe
                        .replace(/\u2018/g, "'")     // Left single quotation mark (8216) → standard apostrophe  
                        .replace(/\u201C/g, '"')     // Left double quotation mark (8220) → standard quote
                        .replace(/\u201D/g, '"')     // Right double quotation mark (8221) → standard quote
                        
                        // Fix various quote and apostrophe characters (iPad/Mac/device specific)
                        .replace(/['']/g, "'")       // Smart apostrophes/single quotes → standard apostrophe
                        .replace(/[""]/g, '"')       // Smart double quotes → standard double quotes
                        .replace(/[´`]/g, "'")       // Acute accent & grave accent → standard apostrophe
                        .replace(/[‚„]/g, '"')       // Bottom quotes → standard double quotes
                        .replace(/[‹›]/g, "'")       // Single angle quotes → standard apostrophe
                        .replace(/[«»]/g, '"')       // Double angle quotes → standard double quotes
                        
                        // Fix accented characters
                        .replace(/Ã¡/g, 'á')         // á character
                        .replace(/Ã©/g, 'é')         // é character
                        .replace(/Ã­/g, 'í')         // í character
                        .replace(/Ã³/g, 'ó')         // ó character
                        .replace(/Ãº/g, 'ú')         // ú character
                        .replace(/Ã±/g, 'ñ')         // ñ character
                        .replace(/Ã¼/g, 'ü')         // ü character
                        .replace(/Ã¶/g, 'ö')         // ö character
                        .replace(/Ã¤/g, 'ä')         // ä character
                        .replace(/Ã /g, 'à')         // à character
                        .replace(/Ã¨/g, 'è')         // è character
                        .replace(/Ã¬/g, 'ì')         // ì character
                        .replace(/Ã²/g, 'ò')         // ò character
                        .replace(/Ã¹/g, 'ù')         // ù character
                        .replace(/Ã‡/g, 'Ç')         // Ç character
                        
                        // Additional common patterns
                        .replace(/â€™\s/g, "' ")       // Apostrophe with space
                        .replace(/â€™([a-zA-Z])/g, "'$1") // Apostrophe before letters
                        .replace(/â€œ\s/g, '" ')       // Quote with space
                        .replace(/â€œ([a-zA-Z])/g, '"$1') // Quote before letters
                        
                        // DO NOT collapse multiple spaces or trim - preserve formatting!
                        // .replace(/\s+/g, ' ')        // REMOVED - this was destroying formatting
                        // .trim();                     // REMOVED - preserve leading/trailing whitespace
                        ;
                };
                
                // Recursively clean all string properties
                const cleanObject = (obj) => {
                    if (typeof obj === 'string') {
                        return cleanText(obj);
                    } else if (Array.isArray(obj)) {
                        return obj.map(cleanObject);
                    } else if (obj && typeof obj === 'object') {
                        const result = {};
                        for (const [key, value] of Object.entries(obj)) {
                            result[key] = cleanObject(value);
                        }
                        return result;
                    }
                    return obj;
                };

                const encodingCleaned = cleanObject(cleaned);
                
                // Sanitize the import for security with formatting preservation
                const sanitized = KLITE_RPMod_Helpers.Security.sanitizeCharacterDataPreserveFormat(encodingCleaned);
                
                // RESTORE binary data after cleaning and sanitization
                if (preservedBlob) {
                    sanitized._imageBlob = preservedBlob;
                    console.log('Restored blob to cleaned data');
                }
                
                if (preservedImageData) {
                    sanitized._imageData = preservedImageData;
                    console.log('Restored image data to cleaned data');
                }
                
                console.log('After cleaning - has blob:', !!sanitized._imageBlob);
                
                return sanitized;
            }
        },

        // =============================================
        // SECTION HANDLERS
        // =============================================
        UI: {
            handleSectionHeader(e) {
                const sectionHeader = e.target.closest('.KLITECharacterManager-section-header');
                if (sectionHeader) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const section = sectionHeader.closest('.KLITECharacterManager-section');
                    section.classList.toggle('collapsed');
                    const arrow = sectionHeader.querySelector('span:last-child');
                    arrow.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
                    return true;
                }
                return false;
            },

            showSuccessMessage(message, elementId = 'char-success-message') {
                const successMsg = document.getElementById(elementId);
                if (successMsg) {
                    successMsg.textContent = message;
                    successMsg.classList.add('show');
                    window.setTimeout(() => {
                        successMsg.classList.remove('show');
                    }, 3000);
                }
            }
        },

        // =============================================
        // INDEXEDDB MANAGER
        // =============================================
        IndexedDB: {
            db: null,
            dbName: 'KLITECharacterManagerDB',
            dbVersion: 1,
            storeName: 'characters',

            async init() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => {
                        this.db = request.result;
                        resolve(this.db);
                    };
                    
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('creator', 'creator', { unique: false });
                            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                            store.createIndex('rating', 'rating', { unique: false });
                        }
                    };
                });
            },

            async saveCharacter(character) {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.put(character);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async getAllCharacters() {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAll();
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async deleteCharacter(id) {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(id);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async clearAllCharacters() {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.clear();
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            }
        }
    };
// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Unified Styles
// All styles combined into one organized file
// =============================================

window.KLITE_RPMod_CoreStylesCSS = `
/* =============================================
   1. CSS VARIABLES & ROOT DEFINITIONS
   ============================================= */
:root {
    color-scheme: dark;

    /* Colors */
    --klite-rpmod-bg: #1a1a1a;
    --klite-rpmod-text: #e0e0e0;
    --klite-rpmod-accent: #4a9eff;
    --klite-rpmod-accent-rgb: 74, 158, 255;
    --klite-rpmod-border: #444;
    --klite-rpmod-primary: #337ab7;
    --klite-rpmod-primary-hover: #286090;
    --klite-rpmod-primary-active: #204d74;
    --klite-rpmod-input-bg: #262626;
    --klite-rpmod-button-bg: #337ab7;
    --klite-rpmod-button-hover: #286090;
    --klite-rpmod-control-group-bg: #1a1a1a;
    
    /* Dimensions */
    --klite-panel-width: 350px;
    --klite-panel-padding: 5px;
    --klite-panel-content-max-width: calc(100% - 40px);
    --klite-scrollbar-width: 8px;
    --klite-scrollbar-margin: 4px;
    --klite-panel-section-gap: 0px;
    --klite-panel-max-height-desktop: 830px;
    --klite-panel-max-height-tablet: 1180px;
    --top-panel-height: 60px;
}

/* =============================================
   2. BASE CONTAINER & LAYOUT
   ============================================= */
   
/* Hide original UI elements */
.klite-rpmod-active #main_container,
.klite-rpmod-active #inputrow,
.klite-rpmod-active #buttonrow {
    display: none !important;
}

/* Main container */
.klite-rpmod-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--klite-rpmod-bg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 1;
    overflow: visible;
}

/* =============================================
   3. PANEL SYSTEM
   ============================================= */
   
/* Base panel styles */
.klite-rpmod-panel {
    position: fixed;
    background: #262626;
    transition: all 0.3s ease;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    overflow: visible;
    display: flex;
    flex-direction: column;
}

/* Left panel */
.klite-rpmod-panel-left {
    left: 0;
    top: 0;
    bottom: 5px;
    width: var(--klite-panel-width);
    transform: translateX(0);
    border-right: 1px solid var(--klite-rpmod-border);
    z-index: 2;
}

.klite-rpmod-panel-left.collapsed {
    transform: translateX(-350px);
}

/* Right panel */
.klite-rpmod-panel-right {
    right: 0;
    top: 0;
    bottom: 5px;
    width: var(--klite-panel-width);
    transform: translateX(0);
    border-left: 1px solid var(--klite-rpmod-border);
    z-index: 2;
}

.klite-rpmod-panel-right.collapsed {
    transform: translateX(350px);
}

/* Top panel - FIXED positioning logic */
.klite-rpmod-panel-top {
    position: fixed;
    top: 0;
    left: var(--klite-panel-width);
    right: var(--klite-panel-width);
    height: auto;
    transform: translateY(0);
    border-bottom: 1px solid var(--klite-rpmod-border);
    z-index: 2;
    transition: all 0.3s ease;
}

.klite-rpmod-panel-top.collapsed {
    transform: translateY(-100%);
}

/* Collapse handles */
.klite-rpmod-collapse-handle {
    position: absolute;
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 12px;
    transition: all 0.2s ease;
    z-index: 2;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.klite-rpmod-collapse-handle:hover {
    background: #333;
    color: #fff;
}

/* Panel handle positions */
.klite-rpmod-panel-left .klite-rpmod-collapse-handle {
    right: -15px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 50px;
    border-radius: 0 5px 5px 0;
    border-left: none;
}

.klite-rpmod-panel-right .klite-rpmod-collapse-handle {
    left: -15px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 50px;
    border-radius: 5px 0 0 5px;
    border-right: none;
}

/* Top panel handle - FIXED centering */
.klite-rpmod-panel-top .klite-rpmod-collapse-handle {
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 50px;
    height: 15px;
    border-radius: 0 0 5px 5px;
    border-top: none;
}

/* =============================================
   4. RESPONSIVE DESIGN
   ============================================= */

/* Tablet mode (768px - 1400px) */
@media (min-width: 768px) and (max-width: 1400px) {
    .klite-rpmod-panel-top {
        left: 0;
        right: 0;
    }
    
    /* Ensure handle stays centered */
    .klite-rpmod-panel-top .klite-rpmod-collapse-handle {
        left: 50%;
        transform: translateX(-50%);
    }
    
    .klite-rpmod-panel-left,
    .klite-rpmod-panel-right {
        z-index: 3;
    }
    
    .klite-rpmod-main-content {
        left: 15px !important;
        right: 15px !important;
    }
}

/* Mobile mode (below 768px) */
@media (max-width: 767px) {
    .klite-rpmod-panel-top {
        left: 0 !important;
        right: 0 !important;
    }
    
    /* Ensure handle stays centered */
    .klite-rpmod-panel-top .klite-rpmod-collapse-handle {
        left: 50% !important;
        transform: translateX(-50%) !important;
    }
    
    .klite-rpmod-main-content {
        left: 15px !important;
        right: 15px !important;
    }
    
    .klite-rpmod-panel-left,
    .klite-rpmod-panel-right {
        display: none !important;
    }
    
    .klite-rpmod-mobile-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

/* Fullscreen mode */
.klite-rpmod-main-content.fullscreen {
    left: 15px !important;
    right: 15px !important;
    max-width: 100% !important;
}

.klite-rpmod-panel-top.fullscreen {
    left: 0 !important;
    right: 0 !important;
}

/* Ensure handle stays centered in fullscreen */
.klite-rpmod-panel-top.fullscreen .klite-rpmod-collapse-handle {
    left: 50%;
    transform: translateX(-50%);
}

/* Panel scrolling */
.klite-rpmod-panel-content {
    overflow-y: auto !important;
    height: 100%;
}

.klite-rpmod-scrollable {
    overflow-y: auto !important;
}

/* =============================================
   5. TAB SYSTEM
   ============================================= */

.klite-rpmod-tabs {
    display: flex;
    background: rgb(51, 122, 183);
    padding: 10px;
    gap: 5px;
    border-bottom: 1px solid var(--klite-rpmod-border);
    box-sizing: border-box;
}

.klite-rpmod-tab {
    padding: 6px 8px;
    background-color: rgb(45, 107, 160);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 10px;
    font-weight: 400;
    transition: all 0.2s ease;
    width: 62px;
    text-align: center;
    flex: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
}

.klite-rpmod-tab:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-tab.active {
    background-color: #4CAAE5;
    border-color: #4CAAE5;
}

/* =============================================
   6. CONTENT AREAS
   ============================================= */

/* Panel content */
.klite-rpmod-content {
    flex: 1;
    padding: 0 !important;
    overflow: hidden !important;
    color: var(--klite-rpmod-text);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* Panel wrapper */
.klite-rpmod-panel-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Scrollable panel content */
.klite-rpmod-panel-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 15px;
    height: 100%;
}

.klite-rpmod-panel-scene,
.klite-rpmod-panel-group {
    width: calc(var(--klite-panel-width) - 15px) !important; /* Account for handle */
}

/* Sections */
.klite-rpmod-section {
    margin-bottom: 20px;
    background: #262626;
    border-radius: 4px;
    overflow: hidden;
    border: none;
}

.klite-rpmod-section:last-child {
    margin-bottom: 0;
}

.klite-rpmod-section-header {
    background: #2d2d2d;
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--klite-rpmod-text);
    font-size: 14px;
    user-select: none;
}

.klite-rpmod-section-header:hover {
    background: #333;
}

.klite-rpmod-section-content {
    padding: 15px;
    background: transparent;
    overflow: visible;
    transition: all 0.3s ease;
}

.klite-rpmod-section.collapsed .klite-rpmod-section-content {
    display: none;
}

/* =============================================
   7. MAIN CONTENT AREA
   ============================================= */

.klite-rpmod-main-content {
    position: fixed;
    top: 0;
    left: var(--klite-panel-width);
    right: var(--klite-panel-width);
    bottom: 0;
    display: flex;
    flex-direction: column;
}

.klite-rpmod-main-content.top-expanded {
    top: var(--top-panel-height, 60px);
}

/* Chat area */
.klite-rpmod-chat-area {
    flex: 1;
    background: var(--klite-rpmod-bg);
    color: var(--klite-rpmod-text);
    padding: 20px;
    margin-top: 25px;
    margin-bottom: 35px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Chat messages */
.klite-rpmod-chat-area > span:has(img) {
    display: block;
    background: #262626;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    border: 1px solid #333;
    position: relative;
}

.klite-rpmod-chat-area > span:hover {
    background: #2a2a2a;
    border-color: #3a3a3a;
}

/* Chat avatars */
.klite-rpmod-chat-area img {
    height: 30px !important;
    width: 30px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    margin-right: 10px !important;
    vertical-align: middle;
    display: inline-block;
}

/* =============================================
   8. INPUT AREA
   ============================================= */

.klite-rpmod-input-area {
    display: flex;
    padding: 0 15px 15px 15px;
    background: var(--klite-rpmod-bg);
    gap: 10px;
    align-items: stretch;
    position: relative;
}

.klite-rpmod-input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}

.klite-rpmod-text-input {
    width: 100%;
    min-height: 80px;
    max-height: 200px;
    padding: 10px;
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    border-radius: 4px;
    color: var(--klite-rpmod-text);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
}

.klite-rpmod-input-info {
    display: flex;
    justify-content: space-between;
    color: #888;
    font-size: 12px;
    margin-top: -3px;
}

/* =============================================
   9. BUTTONS
   ============================================= */

/* Base button style */
.klite-rpmod-button {
    padding: 8px 16px;
    background: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.klite-rpmod-button:hover {
    background: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-button:active {
    transform: translateY(1px);
}

/* Submit button */
.klite-rpmod-submit-button {
    flex: 2;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    border-radius: 4px 4px 0 0;
    color: white;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s ease;
    padding: 15px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    margin-bottom: 1px !important;
}

.klite-rpmod-submit-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-submit-button.aborting {
    background-color: #663333 !important;
    border: 1px solid #774444 !important;
}

/* Action buttons */
.klite-rpmod-action-buttons {
    display: flex;
    gap: 1px;
    flex: 1;
}

.klite-rpmod-action-button {
    flex: 1;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    color: white;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s ease;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border-radius: 0;
}

.klite-rpmod-action-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-action-button:first-child {
    border-radius: 0 0 0 4px;
}

.klite-rpmod-action-button:last-child {
    border-radius: 0 0 4px 0;
}

/* Bottom buttons */
.klite-rpmod-bottom-left-buttons {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 80px;
    flex-shrink: 0;
}

.klite-rpmod-bottom-button {
    flex: 1;
    background-color: var(--klite-rpmod-primary);
    border: 1px solid #2e6da4;
    color: white;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 26px;
    transition: all 0.2s ease;
    padding: 0 5px;
}

.klite-rpmod-bottom-button:hover {
    background-color: var(--klite-rpmod-primary-hover);
    border-color: var(--klite-rpmod-primary-active);
}

.klite-rpmod-bottom-button:first-child {
    border-radius: 4px 4px 0 0;
}

.klite-rpmod-bottom-button:last-child {
    border-radius: 0 0 4px 4px;
}

/* Right side buttons */
.klite-rpmod-right-buttons {
    display: flex;
    flex-direction: column;
    width: 120px;
    flex-shrink: 0;
    height: 100%;
}

/* =============================================
   10. FORM ELEMENTS
   ============================================= */

/* Control groups */
.klite-rpmod-control-group {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #333;
    position: relative;
}

.klite-rpmod-control-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.klite-rpmod-control-group h3 {
    color: var(--klite-rpmod-text);
    font-size: 16px;
    margin: 0 0 15px 0;
    font-weight: normal;
}

/* Control rows */
.klite-rpmod-control-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 10px;
}

.klite-rpmod-control-row:last-child {
    margin-bottom: 0;
}

.klite-rpmod-control-row label {
    color: #999;
    font-size: 12px;
    min-width: 100px;
    flex-shrink: 0;
}

/* Form inputs */
.klite-rpmod-control-row input[type="text"],
.klite-rpmod-control-row input[type="number"],
.klite-rpmod-control-row select,
.klite-rpmod-control-row textarea,
.klite-rpmod-panel-content input[type="text"],
.klite-rpmod-panel-content input[type="number"],
.klite-rpmod-panel-content select,
.klite-rpmod-panel-content textarea {
    flex: 1;
    padding: 8px;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 4px;
    color: var(--klite-rpmod-text);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
}

.klite-rpmod-control-row textarea,
.klite-rpmod-panel-content textarea {
    min-height: 60px;
    resize: vertical;
    line-height: 1.4;
}

/* Range sliders */
input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 16px;
    background: #333;
    border-radius: 3px;
    outline: none;
    margin: 8px 0;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: var(--klite-rpmod-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    margin-top: -5px;
}

input[type="range"]::-webkit-slider-thumb:hover {
    background: var(--klite-rpmod-primary-hover);
    transform: scale(1.1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--klite-rpmod-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* =============================================
   11. SCROLLBARS
   ============================================= */

 /* Scrollable content helper */
    .klite-rpmod-scrollable {
        overflow-y: auto !important;
        scrollbar-width: thin !important;
    }

/* =============================================
   12. MODALS
   ============================================= */

.klite-rpmod-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.klite-rpmod-modal.show {
    display: flex;
}

.klite-rpmod-modal-content {
    background: #262626;
    border: 1px solid var(--klite-rpmod-border);
    padding: 20px;
    max-width: 400px;
    width: 90%;
    border-radius: 5px;
    max-height: 90vh;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* =============================================
   13. MOBILE ELEMENTS
   ============================================= */

.klite-rpmod-mobile-panel {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #262626;
    z-index: 4;
    flex-direction: column;
}

.klite-rpmod-mobile-panel.show {
    display: flex;
}

.klite-rpmod-mobile-toggle {
    display: none;
    position: fixed;
    bottom: 120px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: rgb(51, 122, 183);
    border: 2px solid #2e6da4;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 2;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
}

.klite-rpmod-mobile-toggle:hover {
    background-color: var(--klite-rpmod-primary-hover);
    transform: scale(1.1);
}

/* =============================================
   14. CHARACTER MANAGER SPECIFIC
   ============================================= */

.KLITECharacterManager-panel {
    width: 100%;
    height: 100%;
    background-color: transparent;
    color: var(--klite-rpmod-text);
    font-family: inherit;
    display: flex;
    flex-direction: column;
}

.KLITECharacterManager-character-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    overflow-y: auto;
    flex: 1;
    padding: 4px;
    max-height: 420px;
}

.KLITECharacterManager-character-card {
    background: #0f0f0f;
    border: 1px solid #333;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    border-radius: 6px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
}

.KLITECharacterManager-character-card:hover {
    border-color: var(--klite-rpmod-accent);
    background: #1a1a1a;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
}

.KLITECharacterManager-character-card.selected {
    border-color: var(--klite-rpmod-accent);
    background: #2a2a2a;
}

/* =============================================
   15. UTILITY CLASSES
   ============================================= */

.hidden {
    display: none !important;
}

.show {
    display: block !important;
}

.active {
    background-color: #4CAAE5 !important;
    border-color: #4CAAE5 !important;
}

/* Special button variants */
.delete-btn {
    background-color: #663333 !important;
    border-color: #774444 !important;
}

.delete-btn:hover {
    background-color: #774444 !important;
    border-color: #885555 !important;
}

/* Overlay mode for panels */
.klite-rpmod-panel.overlay-mode {
    position: fixed !important;
    z-index: 3 !important;
    box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

/* Edit mode */
#klite-rpmod-chat-display[contenteditable="true"] {
    background: rgba(255, 255, 255, 0.02);
}

#klite-rpmod-chat-display[contenteditable="true"]:focus {
    outline: 2px solid var(--klite-rpmod-accent) !important;
}

/* Narrator message */
.narrator-message {
    border-left: 3px solid #9b59b6 !important;
    background-color: rgba(155, 89, 182, 0.05) !important;
}

/* =============================================
   16. Z-INDEX HIERARCHY
   ============================================= */

/* Ensure proper layering */
.klite-rpmod-container { z-index: 1; }
.klite-rpmod-panel { z-index: 2; }
.klite-rpmod-panel.overlay-mode { z-index: 3; }
.popupcontainer, .popup-container, .modal, .msgbox { z-index: 3 !important; }
.klite-rpmod-mobile-panel { z-index: 4; }
.klite-rpmod-modal { z-index: 10000; }

/* =============================================
   17. ANIMATIONS
   ============================================= */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* Fade animations */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

/* Notification animations */
.klite-rpmod-notification-enter {
    animation: slideIn 0.3s ease;
}

.klite-rpmod-notification-exit {
    animation: slideOut 0.3s ease;
}
`;


// =============================================
// KLITE Character Manager - Panel CSS
// Styles separated for better maintainability
// =============================================

window.KLITE_CharacterManager_CSS = `
    .KLITECharacterManager-panel {
        width: 100%;
        height: 100%;
        background-color: transparent;
        color: #e0e0e0;
        font-family: inherit;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-scroll-container {
        overflow-y: auto;
        width: 100%;
        flex-grow: 1;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section {
        margin-bottom: 10px;
        border-bottom: 1px solid #444;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-header span:last-child {
        margin-left: 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section-content {
        padding: 10px;
        transition: all 0.3s ease;
        overflow: hidden;
        will-change: height;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-section.collapsed .KLITECharacterManager-section-content {
        display: none;
        border-bottom: 1px solid #444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin-top: 2px;
        align-items: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-tag {
        background: #333;
        color: #ccc;
        padding: 2px 5px;
        font-size: 9px;
        border: 1px solid #444;
        border-radius: 3px;
        line-height: 1.2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn {
        background: #333;
        color: #ccc;
        border: 1px solid #444;
        width: 16px;
        height: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s;
        border-radius: 3px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-add-tag-btn:hover {
        background: #444;
        color: #fff;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button {
        padding: 6px 12px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        background-color: #337ab7;
        border: 1px solid #2e6da4;
        color: white;
        cursor: pointer;
        margin: 2px 0;
        transition: background-color 0.3s ease;
        white-space: nowrap;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button:disabled:hover {
        opacity: 0.5;
        background-color: #666;
        border-color: #555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.scenario-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.worldinfo-btn {
        background-color: #337ab7;
        border-color: #2e6da4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn {
        background-color: #663333;
        border-color: #774444;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-button.delete-btn:hover {
        background-color: #774444;
        border-color: #885555;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        border: 1px solid #333;
        color: #e0e0e0;
        margin-bottom: 5px;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-input:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone {
        border: 1px dashed #444;
        background: #0f0f0f;
        padding: 8px;
        text-align: center;
        margin-bottom: 8px;
        cursor: pointer;
        font-size: 11px;
        color: #888;
        transition: all 0.2s;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone:hover,
    .KLITECharacterManager-panel .KLITECharacterManager-upload-zone.dragover {
        border-color: #4a90e2;
        background: #1a1a1a;
        color: #4a90e2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        overflow-y: auto;
        flex: 1;
        padding: 4px;
        max-height: 420px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card {
        background: #0f0f0f;
        border: 1px solid #333;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        border-radius: 6px;
        min-height: 180px;
        display: flex;
        flex-direction: column;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card:hover {
        border-color: #4a90e2;
        background: #1a1a1a;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(74, 144, 226, 0.2);
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-card.selected {
        border-color: #4a90e2;
        background: #2a2a2a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-image {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        background: #333;
        display: block;
        flex-shrink: 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-info {
        padding: 6px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 40px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-name {
        font-weight: 600;
        font-size: 12px;
        color: #e0e0e0;
        line-height: 1.2;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        max-height: 30px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-creator {
        font-size: 10px;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        margin-bottom: 2px;
        line-height: 1.2;
        max-height: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-rating {
        margin-top: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown {
        width: 100%;
        padding: 2px 4px;
        font-size: 8px;
        background: #0f0f0f;
        color: #ccc;
        border: 1px solid #333;
        border-radius: 2px;
        cursor: pointer;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-dropdown:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 1;
        display: none;
        overflow-y: auto;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-view.show {
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-header {
        background: #262626;
        border-bottom: 1px solid #444;
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions {
        grid-template-columns: 1fr 1fr;
        display: grid;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        max-width: 600px;
        margin: 2px 10px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-actions .KLITECharacterManager-button {
        padding: 4px 8px;
        font-size: 12px;
        margin: 1px 0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-content {
        padding: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 4;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal:not(.hidden) {
        display: flex;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content {
        background: #262626;
        border: 1px solid #444;
        padding: 20px;
        max-width: 400px;
        width: 90%;
        border-radius: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content h3 {
        margin-bottom: 15px;
        color: #e0e0e0;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input {
        width: 100%;
        padding: 8px;
        border: 1px solid #444;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 15px;
        box-sizing: border-box;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-content input:focus {
        outline: none;
        border-color: #4a90e2;
        background: #1a1a1a;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-modal-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message {
        background: #1a4a2a;
        color: #6aff8a;
        padding: 8px 12px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5;
        border: 1px solid #2a7a4a;
        display: none;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-success-message.show {
        display: block;
    }

    /* Fullscreen section styles */
    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section {
        margin-bottom: 10px;
        border: 1px solid #444;
        border-radius: 5px;
        overflow: hidden;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header {
        padding: 8px 10px;
        background-color: #2d2d2d;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        color: #e0e0e0;
        font-weight: 600;
        font-size: 14px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-header:hover {
        background-color: #333;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content {
        padding: 10px;
        background-color: #262626;
        color: #ccc;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: none;
        overflow: visible;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-content {
        display: none;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-arrow {
        transition: transform 0.2s ease;
        color: #888;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section.collapsed .KLITECharacterManager-fullscreen-section-arrow {
        transform: rotate(-90deg);
    }

    /* Rating filter styles */
    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter {
        width: 100%;
        padding: 4px 6px;
        background: #0f0f0f;
        color: #e0e0e0;
        margin-bottom: 5px;
        border: 1px solid #333;
        border-radius: 3px;
        box-sizing: border-box;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-rating-filter:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }

    /* Character info header section */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header {
        background: #262626;
        border: 1px solid #444;
        border-radius: 5px;
        padding: 20px;
        margin-bottom: 10px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-image {
        width: 250px;
        height: 375px;
        object-fit: cover;
        border: 1px solid #333;
        background: #1a1a1a;
        border-radius: 8px;
        margin: 0 auto 15px auto;
        display: block;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-info {
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-name {
        font-size: 24px;
        font-weight: 600;
        color: #e0e0e0;
        margin-bottom: 5px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-character-header-meta {
        font-size: 13px;
        color: #888;
        margin-bottom: 10px;
    }

    /* Tags in header */
    .KLITECharacterManager-panel .KLITECharacterManager-character-header-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 10px;
        justify-content: center;
    }

    /* World info entry styling */
    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry {
        background: #2d2d2d;
        border: 1px solid #3a3a3a;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-keys {
        font-weight: 600;
        color: #4a90e2;
        font-size: 12px;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-options {
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: #777;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-wi-content {
        color: #ccc;
        font-size: 11px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating {
        margin-bottom: 15px;
        text-align: center;
    }

    .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-rating select {
        padding: 4px 8px;
        background: #0f0f0f;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 4px;
        font-size: 12px;
    }
`;
// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Panel Switcher System
// Handles dynamic panel switching based on mode
// =============================================

window.KLITE_RPMod_PanelSwitcher = {
    // Panel configurations per mode
    panelConfigs: {
        // Story Mode (opmode = 1)
        story: {
            PLAY: 'PLAY_STORY',
            TOOLS: 'TOOLS',
            GROUP: 'GROUP',
            SCENE: 'SCENE',
            LAB: 'HELP'
        },
        // Adventure Mode (opmode = 2)
        adventure: {
            PLAY: 'PLAY_ADV',
            TOOLS: 'TOOLS',
            GROUP: 'GROUP',
            SCENE: 'SCENE',
            LAB: 'HELP'
        },
        // Chat Mode (opmode = 3)
        chat: {
            PLAY: 'PLAY_RP',
            TOOLS: 'TOOLS',
            GROUP: 'GROUP',
            SCENE: 'SCENE',
            LAB: 'HELP'
        },
        // Instruct Mode (opmode = 4)
        instruct: {
            PLAY: 'PLAY_RP', // Use RP panel for instruct too
            TOOLS: 'TOOLS',
            GROUP: 'GROUP',
            SCENE: 'SCENE',
            LAB: 'HELP'
        }
    },

    // Get current mode
    getCurrentMode() {
        // Check if we have access to KoboldAI's localsettings
        if (typeof localsettings !== 'undefined' && localsettings.opmode) {
            switch (localsettings.opmode) {
                case 1: return 'story';
                case 2: return 'adventure';
                case 3: return 'chat';
                case 4: return 'instruct';
                default: return 'chat'; // Default to chat mode
            }
        }
        // Fallback - try to detect from UI
        return this.detectModeFromUI() || 'chat';
    },

    // Detect mode from UI elements (fallback)
    detectModeFromUI() {
        // Check for mode indicators in the UI
        const modeIndicators = {
            story: document.querySelector('.storymode-indicator'),
            adventure: document.querySelector('.adventuremode-indicator'),
            chat: document.querySelector('.chatmode-indicator'),
            instruct: document.querySelector('.instructmode-indicator')
        };

        for (const [mode, element] of Object.entries(modeIndicators)) {
            if (element && !element.classList.contains('hidden')) {
                return mode;
            }
        }

        return null;
    },

    // Get the correct panel implementation for current mode
    getPanelImplementation(panelName) {
        const currentMode = this.getCurrentMode();
        const config = this.panelConfigs[currentMode];
        
        if (!config) {
            console.warn(`No panel config for mode: ${currentMode}`);
            return panelName; // Return original panel name as fallback
        }

        const implementation = config[panelName];
        console.log(`Panel ${panelName} → ${implementation} (mode: ${currentMode})`);
        
        return implementation || panelName;
    },

    // Watch for mode changes
    watchModeChanges(callback) {
        // Watch for changes in localsettings.opmode
        if (typeof localsettings !== 'undefined') {
            let lastMode = localsettings.opmode;
            
            setInterval(() => {
                if (localsettings.opmode !== lastMode) {
                    lastMode = localsettings.opmode;
                    console.log('Mode changed to:', this.getCurrentMode());
                    if (callback) callback(this.getCurrentMode());
                }
            }, 500);
        }

        // Also watch for UI changes (button clicks)
        const modeButtons = document.querySelectorAll('[onclick*="display_settings"], [onclick*="toggle_opmode"]');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    const newMode = this.getCurrentMode();
                    console.log('Mode changed via button to:', newMode);
                    if (callback) callback(newMode);
                }, 100);
            });
        });
    }
};

// Update the panels object to include all implementations
window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

// Ensure all panels are loaded
const ensurePanelsLoaded = () => {
    const requiredPanels = [
        'PLAY', 'PLAY_RP', 'PLAY_ADV', 'PLAY_STORY',
        'TOOLS', 'GROUP', 'SCENE', 'HELP',
        'CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB'
    ];

    requiredPanels.forEach(panel => {
        if (!window.KLITE_RPMod_Panels[panel]) {
            console.warn(`Panel ${panel} not loaded!`);
        }
    });
};

// Store original first
const originalLoadTabContent = window.KLITE_RPMod ? window.KLITE_RPMod.loadTabContent : null;

// Then wrap it
if (window.KLITE_RPMod) {
    window.KLITE_RPMod.loadTabContent = function(panel, tabName) {
        const contentEl = document.getElementById(`klite-rpmod-content-${panel}`);
        
        // For left panel PLAY, use mode-specific implementation
        if (panel === 'left' && tabName === 'PLAY') {
            const implementation = window.KLITE_RPMod_PanelSwitcher.getPanelImplementation('PLAY');
            tabName = implementation;
        }
        
        // Call the base panel loading logic
        if (originalLoadTabContent) {
            originalLoadTabContent.call(this, panel, tabName);
        } else {
            // Fallback implementation
            contentEl.innerHTML = `<h2 style="text-align: center; color: #888; margin-top: 50px;">${tabName}</h2>`;
            if (window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels[tabName]) {
                window.KLITE_RPMod_Panels[tabName].load(contentEl, panel);
            }
        }
    };
};

// Initialize mode watcher
document.addEventListener('DOMContentLoaded', () => {
    window.KLITE_RPMod_PanelSwitcher.watchModeChanges((newMode) => {
        // Reload PLAY panel when mode changes
        if (window.KLITE_RPMod && window.KLITE_RPMod.api) {
            const activeTab = window.KLITE_RPMod.api.getActiveTab('left');
            if (activeTab === 'PLAY') {
                window.KLITE_RPMod.api.switchTab('left', 'PLAY');
            }
        }
    });

    // Ensure panels are loaded
    setTimeout(ensurePanelsLoaded, 1000);
});

console.log('✅ KLITE Panel Switcher initialized');


// =============================================
// KLITE RP Mod - Panel Content Implementation
// Dynamic panel system with mode-specific switching
// =============================================

window.KLITE_RPMod_Panels = {
    // Helper function to create empty panels with consistent styling
    createEmptyPanel(title, description) {
        return `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                <div class="klite-rpmod-control-group">
                    <h3>${title}</h3>
                    <div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 15px;">
                        <p style="color: #888; margin: 0;">${description}</p>
                    </div>
                </div>
            </div>
        `;
    },

    // Left panel tabs - PLAY is now mode-aware
    PLAY: {
        load(container, panel) {
            // Redirect to mode-specific implementation
            if (window.KLITE_RPMod_PanelSwitcher) {
                const implementation = window.KLITE_RPMod_PanelSwitcher.getPanelImplementation('PLAY');
                if (window.KLITE_RPMod_Panels[implementation]) {
                    window.KLITE_RPMod_Panels[implementation].load(container, panel);
                    return;
                }
            }
            // Fallback
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('PLAY', 'Mode detection pending necessary');
        }
    },

    TOOLS: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('TOOLS', 'TOOLS panel');
        }
    },

    GROUP: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('GROUP', 'Group chat panel');
        }
    },

    HELP: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('HELP', 'Help panel');
        }
    },

    
    // Right panel tabs
    CHARS: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('CHARS', 'Character manager panel');
        }
    },

    MEMORY: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('MEMORY', 'MEMORY panel');
        }
    },

    NOTES: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('NOTES', 'NOTES panel');
        }
    },

    WI: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('WORLD INFO', 'World Info panel');
        }
    },

    TEXTDB: {
        load(container, panel) {
            container.innerHTML = window.KLITE_RPMod_Panels.createEmptyPanel('TEXT DATABASE', 'Text database panel');
        }
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 1)
// Core functionality without the large openFullscreen method
// =============================================

    console.log('Loading KLITECharacterManager Panel Version - Part 1');

    // =============================================
    // GLOBAL CONFIGURATION
    // =============================================
    const CONFIG = {
        TOOL_ID: 'KLITECharacterManagerPanel',
        VERSION: 'v1.6-panel',
        DB_NAME: 'KLITECharacterManagerDB',
        DB_VERSION: 1,
        STORE_NAME: 'characters'
    };

    // =============================================
    // FORMAT DETECTION AND CONVERSION
    // =============================================
    const FormatDetector = {
        detectFormat(data) {
            // V2 format - most specific check first
            if (data.spec === 'chara_card_v2' && data.data) return 'v2';
            
            // V1 format - check for required fields according to spec_v1.md
            if (data.name !== undefined && 
                data.description !== undefined && 
                data.personality !== undefined &&
                data.scenario !== undefined &&
                data.first_mes !== undefined &&
                data.mes_example !== undefined) return 'v1';
            
            // Agnai format
            if (data.kind === 'character' || (data.name && data.persona)) return 'agnai';
            
            // Ooba format
            if (data.char_name && data.char_persona) return 'ooba';
            
            // NovelAI format
            if (data.scenarioVersion && data.prompt) return 'novelai';
            
            // AID (AI Dungeon) format
            if (Array.isArray(data) && data[0]?.keys) return 'aid';
            
            return 'unknown';
        },

        async convertToV2(data, format) {
            console.log(`Converting ${format} format to V2`);
            
            switch (format) {
                case 'v1': return this.convertV1ToV2(data);
                case 'agnai': return this.convertAgnaiToV2(data);
                case 'ooba': return this.convertOobaToV2(data);
                case 'novelai': return this.convertNovelAIToV2(data);
                case 'aid': return this.convertAIDToV2(data);
                case 'v2': return data;
                default: throw new Error(`Unknown format: ${format}`);
            }
        },

        convertV1ToV2(v1Data) {
            // According to spec_v1.md, all fields MUST default to empty string
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: v1Data.name || '',
                    description: v1Data.description || '',
                    personality: v1Data.personality || '',
                    scenario: v1Data.scenario || '',
                    first_mes: v1Data.first_mes || '',
                    mes_example: v1Data.mes_example || '',
                    
                    // V2 specific fields with defaults
                    creator_notes: v1Data.creator_notes || '',
                    system_prompt: v1Data.system_prompt || '',
                    post_history_instructions: v1Data.post_history_instructions || '',
                    alternate_greetings: v1Data.alternate_greetings || [],
                    character_book: v1Data.character_book || undefined,
                    tags: v1Data.tags || [],
                    creator: v1Data.creator || 'Unknown',
                    character_version: v1Data.character_version || '',
                    extensions: v1Data.extensions || {},
                    
                    // Preserve any extra data
                    _format: 'v1',
                    _originalData: v1Data
                }
            };
        },

        convertAgnaiToV2(agnaiData) {
            const v2Data = {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: agnaiData.name || 'Unknown Character',
                    description: agnaiData.persona || agnaiData.description || '',
                    personality: agnaiData.personality || '',
                    scenario: agnaiData.scenario || '',
                    first_mes: agnaiData.greeting || agnaiData.first_mes || '',
                    mes_example: agnaiData.sampleChat || agnaiData.example_dialogue || '',
                    creator_notes: '',
                    system_prompt: agnaiData.systemPrompt || '',
                    post_history_instructions: agnaiData.postHistoryInstructions || '',
                    alternate_greetings: agnaiData.alternateGreetings || [],
                    tags: agnaiData.tags || [],
                    creator: agnaiData.creator || 'Unknown',
                    character_version: agnaiData.version || '',
                    extensions: {},
                    _format: 'agnai',
                    _originalData: agnaiData
                }
            };

            if (agnaiData.memoryBook) {
                v2Data.data.character_book = this.convertAgnaiMemoryBook(agnaiData.memoryBook);
            }

            return v2Data;
        },

        convertAgnaiMemoryBook(memoryBook) {
            return {
                name: memoryBook.name || 'Character Book',
                description: memoryBook.description || '',
                scan_depth: memoryBook.scanDepth || 50,
                token_budget: memoryBook.tokenBudget || 500,
                recursive_scanning: memoryBook.recursiveScanning !== false,
                extensions: {},
                entries: (memoryBook.entries || []).map((entry, index) => ({
                    keys: entry.keywords || [],
                    content: entry.entry || '',
                    extensions: {},
                    enabled: entry.enabled !== false,
                    insertion_order: entry.priority || index,
                    case_sensitive: entry.caseSensitive || false,
                    name: entry.name || '',
                    priority: entry.weight || 10,
                    id: index,
                    comment: '',
                    selective: false,
                    secondary_keys: [],
                    constant: false,
                    position: 'before_char'
                }))
            };
        },

        convertOobaToV2(oobaData) {
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: oobaData.char_name || oobaData.name || 'Unknown Character',
                    description: oobaData.char_persona || oobaData.description || '',
                    personality: oobaData.char_personality || '',
                    scenario: oobaData.world_scenario || oobaData.scenario || '',
                    first_mes: oobaData.char_greeting || oobaData.greeting || '',
                    mes_example: oobaData.example_dialogue || '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    _format: 'ooba',
                    _originalData: oobaData
                }
            };
        },

        convertNovelAIToV2(naiData) {
            const v2Data = {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: 'NovelAI Import',
                    description: '',
                    personality: '',
                    scenario: naiData.prompt || '',
                    first_mes: '',
                    mes_example: '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    _format: 'novelai',
                    _originalData: naiData
                }
            };

            if (naiData.context && naiData.context.length > 0) {
                let memory = '';
                for (let ctx of naiData.context) {
                    memory += ctx.text + '\n';
                }
                v2Data.data.description = memory.trim();
            }

            if (naiData.lorebook) {
                v2Data.data.character_book = this.convertNovelAILorebook(naiData.lorebook);
            }

            return v2Data;
        },

        convertNovelAILorebook(lorebook) {
            return {
                name: lorebook.lorebookVersion ? 'NovelAI Lorebook' : 'Character Book',
                description: '',
                scan_depth: 50,
                token_budget: 500,
                recursive_scanning: false,
                extensions: {},
                entries: (lorebook.entries || []).map((entry, index) => ({
                    keys: entry.keys || [],
                    content: entry.text || '',
                    extensions: {},
                    enabled: entry.enabled !== false,
                    insertion_order: entry.insertorder || index,
                    case_sensitive: false,
                    name: entry.displayName || '',
                    priority: 10,
                    id: index,
                    comment: entry.comment || '',
                    selective: false,
                    secondary_keys: [],
                    constant: entry.alwaysActive || false,
                    position: 'before_char'
                }))
            };
        },

        convertAIDToV2(aidData) {
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: 'AID World Info Import',
                    description: 'Imported from AI Dungeon World Info',
                    personality: '',
                    scenario: '',
                    first_mes: '',
                    mes_example: '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    character_book: {
                        name: 'AID World Info',
                        description: '',
                        scan_depth: 50,
                        token_budget: 500,
                        recursive_scanning: false,
                        extensions: {},
                        entries: aidData.map((entry, index) => ({
                            keys: entry.keys ? entry.keys.split(',').map(k => k.trim()) : [],
                            content: entry.value || '',
                            extensions: {},
                            enabled: true,
                            insertion_order: index,
                            case_sensitive: false,
                            name: '',
                            priority: 10,
                            id: index,
                            comment: '',
                            selective: false,
                            secondary_keys: [],
                            constant: false,
                            position: 'before_char'
                        }))
                    },
                    _format: 'aid',
                    _originalData: aidData
                }
            };
        }
    };

    // =============================================
    // KOBOLDAI INTEGRATION
    // =============================================
    window.KoboldAIIntegration = {
        isAvailable() {
            return typeof window.load_selected_file === 'function';
        },

        async loadAsScenario(characterData) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                console.log('Loading character via simulated file drop:', characterData.name);
                
                // Update AI avatar with character image
                if (characterData._imageData || characterData._imageBlob) {
                    let imageUrl = characterData._imageData;
                    
                    // If we have a blob but no data URL, convert it
                    if (!imageUrl && characterData._imageBlob) {
                        // Convert blob to base64 data URL for persistence
                        imageUrl = await this.blobToBase64(characterData._imageBlob);
                        // Store the base64 version for future use
                        characterData._imageData = imageUrl;
                    }
                    
                    // Call the KLITE_RPMod method to update avatar
                    if (imageUrl && typeof KLITE_RPMod !== 'undefined' && KLITE_RPMod.updateAIAvatar) {
                        KLITE_RPMod.updateAIAvatar(imageUrl);
                    }
                }
                
                const file = await this.createFileFromCharacterData(characterData);
                
                if (!file) {
                    throw new Error('Could not create file from character data');
                }

                window.load_selected_file(file);
                console.log('Character file submitted to native loader - session will restart');
                return true;
                
            } catch (error) {
                console.error('Error loading character as scenario:', error);
                throw error;
            }
        },

        async blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },

        resetAIAvatar() {
            this.aiAvatarCurrent = this.aiAvatarDefault;
            this.replaceAvatarsInChat();
        },

        async createFileFromCharacterData(characterData) {
            if (!characterData._imageBlob) {
                throw new Error('No _imageBlob found - character storage is broken');
            }
            
            if (!(characterData._imageBlob instanceof Blob)) {
                throw new Error('_imageBlob is not a valid Blob object - storage corruption');
            }

            const fileName = `${characterData.name || 'character'}.png`;
            return new File([characterData._imageBlob], fileName, {
                type: 'image/png',
                lastModified: Date.now()
            });
        },

        async addToWorldInfo(characterData) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                if (typeof window.start_editing_wi === 'function') {
                    window.start_editing_wi();
                }

                const groupName = characterData.name || "Character";
                const entries = this.buildCharacterWIEntries(characterData, groupName);
                
                entries.forEach(entry => {
                    window.pending_wi_obj.push(entry);
                });
                
                if (characterData.character_book?.entries && typeof window.load_tavern_wi === 'function') {
                    const tavernWI = window.load_tavern_wi(
                        characterData.character_book, 
                        characterData.name, 
                        window.localsettings.chatname
                    );
                    tavernWI.forEach(entry => {
                        entry.wigroup = groupName;
                        window.pending_wi_obj.push(entry);
                    });
                }
                
                if (typeof window.commit_wi_changes === 'function') {
                    window.commit_wi_changes();
                }
                
                if (typeof window.update_wi === 'function') {
                    window.update_wi();
                }
                
                return true;
            } catch (error) {
                console.error('Error adding character to World Info:', error);
                throw error;
            }
        },

        buildCharacterWIEntries(characterData, groupName) {
            const entries = [];
            const baseName = characterData.name || "Character";
            
            if (characterData.description) {
                entries.push({
                    key: baseName,
                    keysecondary: "",
                    keyanti: "",
                    content: `Character: ${baseName}\n\nDescription: ${characterData.description}`,
                    comment: `${baseName} - Character Description`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.personality) {
                entries.push({
                    key: `${baseName}, personality`,
                    keysecondary: "",
                    keyanti: "",
                    content: `${baseName}'s Personality: ${characterData.personality}`,
                    comment: `${baseName} - Personality`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.scenario) {
                entries.push({
                    key: `${baseName}, scenario, setting`,
                    keysecondary: "",
                    keyanti: "",
                    content: `Scenario: ${characterData.scenario}`,
                    comment: `${baseName} - Scenario/Setting`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.first_mes) {
                entries.push({
                    key: `${baseName}, greeting, first meeting`,
                    keysecondary: "",
                    keyanti: "",
                    content: `${baseName}'s Greeting: ${characterData.first_mes}`,
                    comment: `${baseName} - First Message/Greeting`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            return entries;
        },

        async removeFromWorldInfo(characterName) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                if (typeof window.start_editing_wi === 'function') {
                    window.start_editing_wi();
                }

                const groupName = characterName;
                const originalCount = window.pending_wi_obj.length;
                
                window.pending_wi_obj = window.pending_wi_obj.filter(entry => {
                    return entry.wigroup !== groupName;
                });
                
                const removedCount = originalCount - window.pending_wi_obj.length;
                
                if (typeof window.commit_wi_changes === 'function') {
                    window.commit_wi_changes();
                }
                
                if (typeof window.update_wi === 'function') {
                    window.update_wi();
                }
            
                return removedCount;
            } catch (error) {
                console.error('Error removing character from World Info:', error);
                throw error;
            }
        }
    };

    // =============================================
    // PANEL CHARACTER MANAGER CLASS
    // =============================================
    class PanelCharacterManager {
        constructor() {
            this.characters = [];
            this.selectedCharacter = null;
            this.currentTagCharacter = null;
            this.selectedTag = '';
            this.selectedRating = '';
            this.searchTerm = '';
            this.container = null;
            this.fileInput = null;
            this.collapsedSections = new Set();
            this.collapsedFullscreenSections = new Set();
            
            // Get helpers reference
            this.helpers = window.KLITE_RPMod_Helpers;
            this.IndexedDBManager = this.helpers.IndexedDB;
        }

        async init(containerElement) {
            console.log('Initializing KLITECharacterManager Panel');
            this.container = containerElement;
            this.injectStyles();
            this.createPanelContent();
            await this.loadCharacters();
            this.initEventListeners();
            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
        }

        injectStyles() {
            const existingStyle = document.getElementById('character-manager-panel-styles');
            if (existingStyle) {
                existingStyle.remove();
            }

            const styleElement = document.createElement('style');
            styleElement.id = 'character-manager-panel-styles';
            styleElement.textContent = window.KLITE_CharacterManager_CSS;
            document.head.appendChild(styleElement);
        }

        createPanelContent() {
            this.container.innerHTML = `
                <div class="KLITECharacterManager-panel">
                    <div class="KLITECharacterManager-content-wrapper">
                        <div class="KLITECharacterManager-scroll-container">
                            <!-- Import Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="import">
                                    <span>Import Characters</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <div class="KLITECharacterManager-upload-zone" id="char-upload-zone">
                                        Drop PNG/WEBP/JSON files here or click to browse
                                    </div>
                                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                                        <button class="KLITECharacterManager-button" id="char-import-btn" style="flex: 1;">
                                            Import Files
                                        </button>
                                        <button class="KLITECharacterManager-button delete-btn" id="char-clear-btn" style="flex: 1;">
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Search & Filter Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="search">
                                    <span>Search & Filter</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <input type="text" id="char-search-input" placeholder="Search characters..." 
                                        class="KLITECharacterManager-input" value="${this.searchTerm}">
                                    <select id="char-tag-filter" class="KLITECharacterManager-input">
                                        <option value="">All Tags</option>
                                    </select>
                                    <select id="char-rating-filter" class="KLITECharacterManager-rating-filter">
                                        <option value="">All Ratings</option>
                                        <option value="5">★★★★★ (5 stars)</option>
                                        <option value="4">★★★★☆ (4 stars)</option>
                                        <option value="3">★★★☆☆ (3 stars)</option>
                                        <option value="2">★★☆☆☆ (2 stars)</option>
                                        <option value="1">★☆☆☆☆ (1 star)</option>
                                        <option value="0">☆ Unrated</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Character Gallery Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="gallery">
                                    <span>Character Gallery</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <div id="char-gallery-stats" style="color: #888; font-size: 11px; margin-bottom: 8px;">
                                        0 characters loaded
                                    </div>
                                    <div class="KLITECharacterManager-character-grid" id="char-character-grid">
                                        <!-- Characters will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fullscreen Character View -->
                    <div class="KLITECharacterManager-fullscreen-view" id="char-fullscreen-view">
                        <div class="KLITECharacterManager-fullscreen-header">
                            <button class="KLITECharacterManager-button" id="char-back-btn">
                                ← Back
                            </button>
                            <span id="char-fullscreen-title">Character Details</span>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-actions">
                            <button class="KLITECharacterManager-button scenario-btn" id="char-load-scenario-btn">
                                Load as Scenario
                            </button>
                            <button class="KLITECharacterManager-button delete-btn" id="char-remove-character-btn">
                                Delete Character
                            </button>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-actions">
                            <button class="KLITECharacterManager-button worldinfo-btn" id="char-add-worldinfo-btn">
                                Add to World Info
                            </button>
                            <button class="KLITECharacterManager-button delete-btn" id="char-remove-worldinfo-btn">
                                Remove from WI
                            </button>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-content" id="char-fullscreen-content">
                            <!-- Content will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Tag Modal -->
                    <div class="KLITECharacterManager-modal hidden" id="char-tag-modal">
                        <div class="KLITECharacterManager-modal-content">
                            <h3>Add Tag</h3>
                            <input type="text" id="char-tag-input" placeholder="Enter tag name...">
                            <div class="KLITECharacterManager-modal-buttons">
                                <button class="KLITECharacterManager-button" id="char-tag-cancel-btn">Cancel</button>
                                <button class="KLITECharacterManager-button" id="char-tag-add-btn">Add</button>
                            </div>
                        </div>
                    </div>

                    <!-- Success Message -->
                    <div class="KLITECharacterManager-success-message" id="char-success-message">
                        Character loaded successfully!
                    </div>
                </div>
            `;

            // Create hidden file input
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = '.png,.webp,.json';
            this.fileInput.multiple = true;
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);
        }

        // Continue in Part 2 with remaining methods...
    }// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 2)
// Remaining methods and Panel API
// =============================================


    console.log('Loading KLITECharacterManager Panel Version - Part 2');
    
    if (!PanelCharacterManager) {
        console.error('KLITE Character Manager Part 1 must be loaded first!');
        return;
    }

    // Add remaining methods to the prototype
    PanelCharacterManager.prototype.initEventListeners = function() {
        // Core event handlers
        this.container.addEventListener('click', (e) => {
            if (this.helpers.UI.handleSectionHeader(e)) return;
        });

        // File handling
        const uploadZone = document.getElementById('char-upload-zone');
        const importBtn = document.getElementById('char-import-btn');
        const clearBtn = document.getElementById('char-clear-btn');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        importBtn.addEventListener('click', () => this.fileInput.click());
        clearBtn.addEventListener('click', () => this.clearAll());

        // Search and filter
        const searchInput = document.getElementById('char-search-input');
        const tagFilter = document.getElementById('char-tag-filter');
        const ratingFilter = document.getElementById('char-rating-filter');

        searchInput.addEventListener('input', () => {
            this.searchTerm = searchInput.value;
            this.updateGallery();
        });

        tagFilter.addEventListener('change', () => {
            this.selectedTag = tagFilter.value;
            this.updateGallery();
        });

        ratingFilter.addEventListener('change', () => {
            this.selectedRating = ratingFilter.value;
            this.updateGallery();
        });

        // Fullscreen view
        const backBtn = document.getElementById('char-back-btn');
        const loadScenarioBtn = document.getElementById('char-load-scenario-btn');
        const addWorldInfoBtn = document.getElementById('char-add-worldinfo-btn');
        const removeWorldInfoBtn = document.getElementById('char-remove-worldinfo-btn');
        const removeCharacterBtn = document.getElementById('char-remove-character-btn');

        backBtn.addEventListener('click', () => this.closeFullscreen());
        loadScenarioBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.loadAsScenario(this.selectedCharacter);
            }
        });
        addWorldInfoBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.addToWorldInfo(this.selectedCharacter);
            }
        });
        removeWorldInfoBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.removeFromWorldInfo(this.selectedCharacter);
            }
        });
        removeCharacterBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.removeCharacter(this.selectedCharacter);
            }
        });

        // Tag modal
        const tagModal = document.getElementById('char-tag-modal');
        const tagInput = document.getElementById('char-tag-input');
        const tagCancelBtn = document.getElementById('char-tag-cancel-btn');
        const tagAddBtn = document.getElementById('char-tag-add-btn');

        tagCancelBtn.addEventListener('click', () => this.closeTagModal());
        tagAddBtn.addEventListener('click', () => this.addTag());
        
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTag();
            }
        });

        tagModal.addEventListener('click', (e) => {
            if (e.target.id === 'char-tag-modal') {
                this.closeTagModal();
            }
        });
    };

    PanelCharacterManager.prototype.cleanTextEncoding = function(characterData) {
        // PRESERVE binary data before JSON serialization
        const preservedBlob = characterData._imageBlob;
        const preservedImageData = characterData._imageData;
        
        console.log('Before cleaning - has blob:', !!preservedBlob);
        console.log('Before cleaning - blob type:', preservedBlob?.constructor.name);
        
        // Create deep copy for text cleaning (this removes blobs)
        const cleaned = JSON.parse(JSON.stringify(characterData));
        
        // Function to clean text in any string value
        const cleanText = (text) => {
            if (typeof text !== 'string') return text;
            
            return text
                // Fix common UTF-8 encoding artifacts
                .replace(/â€™/g, "'")           // Smart apostrophe artifacts
                .replace(/â€œ/g, '"')          // Smart quote artifacts  
                .replace(/â€/g, '"')          // Smart quote artifacts
                .replace(/â€"/g, '—')          // Em dash artifacts
                .replace(/â€"/g, '–')          // En dash artifacts
                .replace(/Â /g, ' ')           // Non-breaking space artifacts
                .replace(/â€¦/g, '…')         // Ellipsis artifacts
                .replace(/â€¢/g, '•')         // Bullet point artifacts

                // Fix specific Unicode apostrophe and quote characters by char code
                .replace(/\u2019/g, "'")     // Right single quotation mark (8217) → standard apostrophe
                .replace(/\u2018/g, "'")     // Left single quotation mark (8216) → standard apostrophe  
                .replace(/\u201C/g, '"')     // Left double quotation mark (8220) → standard quote
                .replace(/\u201D/g, '"')     // Right double quotation mark (8221) → standard quote
                
                // Fix various quote and apostrophe characters (iPad/Mac/device specific)
                .replace(/['']/g, "'")       // Smart apostrophes/single quotes → standard apostrophe
                .replace(/[""]/g, '"')       // Smart double quotes → standard double quotes
                .replace(/[´`]/g, "'")       // Acute accent & grave accent → standard apostrophe
                .replace(/[‚„]/g, '"')       // Bottom quotes → standard double quotes
                .replace(/[‹›]/g, "'")       // Single angle quotes → standard apostrophe
                .replace(/[«»]/g, '"')       // Double angle quotes → standard double quotes
                
                // Fix accented characters
                .replace(/Ã¡/g, 'á')         // á character
                .replace(/Ã©/g, 'é')         // é character
                .replace(/Ã­/g, 'í')         // í character
                .replace(/Ã³/g, 'ó')         // ó character
                .replace(/Ãº/g, 'ú')         // ú character
                .replace(/Ã±/g, 'ñ')         // ñ character
                .replace(/Ã¼/g, 'ü')         // ü character
                .replace(/Ã¶/g, 'ö')         // ö character
                .replace(/Ã¤/g, 'ä')         // ä character
                .replace(/Ã /g, 'à')         // à character
                .replace(/Ã¨/g, 'è')         // è character
                .replace(/Ã¬/g, 'ì')         // ì character
                .replace(/Ã²/g, 'ò')         // ò character
                .replace(/Ã¹/g, 'ù')         // ù character
                .replace(/Ã‡/g, 'Ç')         // Ç character
                
                // Additional common patterns
                .replace(/â€™\s/g, "' ")       // Apostrophe with space
                .replace(/â€™([a-zA-Z])/g, "'$1") // Apostrophe before letters
                .replace(/â€œ\s/g, '" ')       // Quote with space
                .replace(/â€œ([a-zA-Z])/g, '"$1') // Quote before letters
                
                // DO NOT collapse multiple spaces or trim - preserve formatting!
                // .replace(/\s+/g, ' ')        // REMOVED - this was destroying formatting
                // .trim();                     // REMOVED - preserve leading/trailing whitespace
                ;
        };
        
        // Recursively clean all string properties
        const cleanObject = (obj) => {
            if (typeof obj === 'string') {
                return cleanText(obj);
            } else if (Array.isArray(obj)) {
                return obj.map(cleanObject);
            } else if (obj && typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = cleanObject(value);
                }
                return result;
            }
            return obj;
        };

        const encodingCleaned = cleanObject(cleaned);
        
        // Sanitize the import for security with formatting preservation
        const sanitized = this.helpers.Security.sanitizeCharacterDataPreserveFormat(encodingCleaned);
        
        // RESTORE binary data after cleaning and sanitization
        if (preservedBlob) {
            sanitized._imageBlob = preservedBlob;
            console.log('Restored blob to cleaned data');
        }
        
        if (preservedImageData) {
            sanitized._imageData = preservedImageData;
            console.log('Restored image data to cleaned data');
        }
        
        console.log('After cleaning - has blob:', !!sanitized._imageBlob);
        
        return sanitized;
    };

    PanelCharacterManager.prototype.handleFiles = async function(files) {
        for (const file of files) {
            try {
                if (file.size > 50 * 1024 * 1024) {
                    throw new Error(`File too large: ${file.name}`);
                }
                
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    await this.loadJSONFile(file);
                } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
                    await this.loadPNGFile(file);
                } else if (file.type === 'image/webp' || file.name.endsWith('.webp')) {
                    await this.loadWEBPFile(file);
                } else {
                    throw new Error(`Unsupported file type: ${file.name}`);
                }
            } catch (error) {
                alert(`Error loading ${file.name}: ${error.message}`);
            }
        }
        this.updateGallery();
        this.updateTagFilter();
    };

    PanelCharacterManager.prototype.loadJSONFile = async function(file) {
        const text = await file.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file');
        }

        const format = FormatDetector.detectFormat(data);
        console.log(`Detected format: ${format} for file: ${file.name}`);

        if (format === 'unknown') {
            throw new Error('Unknown character card format');
        }

        const v2Data = await FormatDetector.convertToV2(data, format);
        const cleanedData = this.cleanTextEncoding(v2Data.data);
        cleanedData._importFormat = format;
        await this.addCharacter(cleanedData);
    };

    PanelCharacterManager.prototype.loadPNGFile = async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    console.log(`Processing PNG file: ${file.name}, size: ${uint8Array.length} bytes`);
                    
                    let textChunks = [];
                    try {
                        textChunks = this.extractPNGTextChunks(uint8Array);
                    } catch (parseError) {
                        console.error('PNG parsing failed:', parseError);
                        reject(new Error(`PNG parsing failed: ${parseError.message}`));
                        return;
                    }
                    
                    let characterData = null;
                    let format = 'unknown';
                    
                    // Try multiple keywords and formats
                    const keywords = ['chara', 'ccv2', 'ccv3', 'character', 'taverncard'];
                    
                    for (const chunk of textChunks) {
                        if (keywords.includes(chunk.keyword.toLowerCase())) {
                            try {
                                // Try base64 decode first
                                let jsonStr = chunk.text;
                                try {
                                    jsonStr = atob(chunk.text);
                                } catch (e) {
                                    // Not base64, use as-is
                                }
                                
                                const parsed = JSON.parse(jsonStr);
                                format = FormatDetector.detectFormat(parsed);
                                
                                if (format !== 'unknown') {
                                    const v2Data = await FormatDetector.convertToV2(parsed, format);
                                    characterData = v2Data.data || v2Data;
                                    characterData._importFormat = format;
                                    console.log(`Found ${format} character data:`, characterData.name);
                                    break;
                                }
                            } catch (e) {
                                console.warn(`Failed to parse chunk ${chunk.keyword}:`, e);
                                continue;
                            }
                        }
                    }
                    
                    if (characterData) {
                        const blob = new Blob([uint8Array], { type: 'image/png' });
                        
                        // Convert to base64 data URL for persistence
                        const base64Reader = new FileReader();
                        base64Reader.onloadend = async () => {
                            const base64DataUrl = base64Reader.result;
                            
                            characterData._imageData = base64DataUrl;
                            characterData._imageBlob = blob;

                            const cleanedData = this.cleanTextEncoding(characterData);

                            console.log('Created base64 data URL for image');
                            await this.addCharacter(cleanedData);
                            resolve();
                        };
                        base64Reader.onerror = () => reject(new Error('Failed to convert image to base64'));
                        base64Reader.readAsDataURL(blob);
                    } else {
                        reject(new Error('No valid character data found in PNG. Tried keywords: ' + keywords.join(', ')));
                    }
                } catch (error) {
                    console.error('Error in loadPNGFile:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    };

    PanelCharacterManager.prototype.loadWEBPFile = async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    const characterData = this.extractWEBPCharacterData(uint8Array);
                    
                    if (characterData) {
                        const blob = new Blob([uint8Array], { type: 'image/webp' });
                        
                        // Convert to base64 data URL for persistence
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const base64DataUrl = reader.result;
                            
                            characterData._imageData = base64DataUrl;
                            characterData._imageBlob = blob;
                            
                            const cleanedData = this.cleanTextEncoding(characterData);
                            await this.addCharacter(cleanedData);
                            resolve();
                        };
                        reader.onerror = () => reject(new Error('Failed to convert image to base64'));
                        reader.readAsDataURL(blob);
                    } else {
                        reject(new Error('No character data found in WEBP'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    };

    PanelCharacterManager.prototype.extractPNGTextChunks = function(uint8Array) {
        const chunks = [];
        let offset = 8;
        let iterations = 0;
        const maxIterations = 1000;
        
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (let i = 0; i < 8; i++) {
            if (uint8Array[i] !== signature[i]) {
                throw new Error('Invalid PNG signature');
            }
        }
        
        while (offset < uint8Array.length && iterations < maxIterations) {
            iterations++;
            
            if (offset + 8 > uint8Array.length) break;
            
            const length = (uint8Array[offset] << 24) | 
                          (uint8Array[offset + 1] << 16) | 
                          (uint8Array[offset + 2] << 8) | 
                          uint8Array[offset + 3];
            
            const type = String.fromCharCode(
                uint8Array[offset + 4],
                uint8Array[offset + 5],
                uint8Array[offset + 6],
                uint8Array[offset + 7]
            );
            
            if (length < 0 || length > 100 * 1024 * 1024) break;
            
            const totalChunkSize = 8 + length + 4;
            if (offset + totalChunkSize > uint8Array.length) break;
            
            if (type === 'tEXt' && length > 0) {
                try {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                    const nullIndex = chunkData.indexOf(0);
                    
                    if (nullIndex !== -1 && nullIndex < chunkData.length - 1) {
                        let keyword = '';
                        for (let i = 0; i < nullIndex; i++) {
                            keyword += String.fromCharCode(chunkData[i]);
                        }
                        
                        let text = '';
                        for (let i = nullIndex + 1; i < chunkData.length; i++) {
                            text += String.fromCharCode(chunkData[i]);
                        }
                        
                        chunks.push({ keyword, text });
                    }
                } catch (e) {
                    console.warn('Error parsing tEXt chunk:', e);
                }
            }
            
            if (type === 'IEND') break;
            
            offset = offset + 8 + length + 4;
        }
        
        return chunks;
    };

    PanelCharacterManager.prototype.extractWEBPCharacterData = function(uint8Array) {
        if (!(uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && 
              uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
              uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && 
              uint8Array[10] === 0x42 && uint8Array[11] === 0x50)) {
            return null;
        }
        
        let offset = 12;
        while (offset < uint8Array.length - 8) {
            if (offset + 8 > uint8Array.length) break;
            
            const chunkType = String.fromCharCode(
                uint8Array[offset], uint8Array[offset + 1],
                uint8Array[offset + 2], uint8Array[offset + 3]
            );
            
            const chunkSize = uint8Array[offset + 4] | 
                             (uint8Array[offset + 5] << 8) |
                             (uint8Array[offset + 6] << 16) |
                             (uint8Array[offset + 7] << 24);
            
            if (chunkType === 'EXIF' && chunkSize > 0) {
                const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
                const userComment = this.findEXIFUserComment(exifData);
                if (userComment) {
                    try {
                        const parsed = JSON.parse(userComment);
                        const format = FormatDetector.detectFormat(parsed);
                        if (format !== 'unknown') {
                            const v2Data = FormatDetector.convertToV2(parsed, format);
                            v2Data.data._importFormat = format;
                            return v2Data.data;
                        }
                        return parsed.data || parsed;
                    } catch (e) {
                        console.warn('Failed to parse WEBP character data:', e);
                    }
                }
            }
            
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        
        return null;
    };

    PanelCharacterManager.prototype.findEXIFUserComment = function(exifData) {
        for (let i = 0; i < exifData.length - 20; i++) {
            if ((exifData[i] === 0x92 && exifData[i + 1] === 0x86) ||
                (exifData[i] === 0x86 && exifData[i + 1] === 0x92)) {
                
                let start = i + 10;
                let end = start;
                
                while (end < exifData.length && end < start + 10000) {
                    if (exifData[end] === 0 && exifData[end + 1] === 0) break;
                    end++;
                }
                
                if (end > start) {
                    let comment = '';
                    for (let j = start; j < end; j++) {
                        if (exifData[j] !== 0) {
                            comment += String.fromCharCode(exifData[j]);
                        }
                    }
                    
                    const jsonStart = comment.indexOf('{');
                    if (jsonStart !== -1) {
                        const jsonEnd = comment.lastIndexOf('}');
                        if (jsonEnd > jsonStart) {
                            return comment.substring(jsonStart, jsonEnd + 1);
                        }
                    }
                }
            }
        }
        return null;
    };

    PanelCharacterManager.prototype.addCharacter = async function(characterData) {
        const character = {
            id: Date.now() + Math.random(),
            name: characterData.name,
            description: characterData.description || '',
            scenario: characterData.scenario || '',
            creator: characterData.creator || 'Unknown',
            imageBlob: characterData._imageBlob || null,
            tags: characterData.tags || [],
            rating: 0,
            rawData: characterData,
            importedAt: new Date().toISOString()
        };
        
        this.characters.push(character);
        await this.IndexedDBManager.saveCharacter(character);
    };

    PanelCharacterManager.prototype.removeCharacter = async function(character) {
        if (!character) {
            console.error('No character provided to removeCharacter');
            alert('Error: No character selected for removal');
            return;
        }

        const confirmMsg = `Are you sure you want to permanently delete "${character.name}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const removeBtn = document.getElementById('char-remove-character-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Removing...';
                removeBtn.disabled = true;
            }

            if (character.image && character.image.startsWith('blob:')) {
                URL.revokeObjectURL(character.image);
            }

            await this.IndexedDBManager.deleteCharacter(character.id);
            
            const index = this.characters.findIndex(c => c.id === character.id);
            if (index !== -1) {
                this.characters.splice(index, 1);
            }

            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
            this.closeFullscreen();
            this.helpers.UI.showSuccessMessage(`"${character.name}" has been removed`);
            
        } catch (error) {
            console.error('Error removing character:', error);
            alert(`Failed to remove character: ${error.message}`);
        } finally {
            const removeBtn = document.getElementById('char-remove-character-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Delete Character';
                removeBtn.disabled = false;
            }
        }
    };

    PanelCharacterManager.prototype.loadCharacters = async function() {
        try {
            this.characters = await this.IndexedDBManager.getAllCharacters();
            
            this.characters.forEach(char => {
                if (char.rating === undefined) {
                    char.rating = 0;
                }
                
                // Use base64 data if available, otherwise create blob URL
                if (char.rawData && char.rawData._imageData) {
                    char.image = char.rawData._imageData;
                } else if (char.imageBlob && !char.image) {
                    char.image = URL.createObjectURL(char.imageBlob);
                }
            });
            
            console.log(`Loaded ${this.characters.length} characters from IndexedDB`);
        } catch (error) {
            console.error('Error loading characters:', error);
            this.characters = [];
        }
    };

    PanelCharacterManager.prototype.updateGallery = function() {
        const grid = document.getElementById('char-character-grid');
        
        const filteredCharacters = this.characters.filter(char => {
            const matchesSearch = !this.searchTerm || 
                char.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                char.creator.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                char.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()));
            
            const matchesTag = !this.selectedTag || char.tags.includes(this.selectedTag);
            
            const matchesRating = !this.selectedRating || char.rating.toString() === this.selectedRating;
            
            return matchesSearch && matchesTag && matchesRating;
        });
        
        grid.innerHTML = '';
        
        filteredCharacters.forEach(character => {
            const card = this.createCharacterCard(character);
            grid.appendChild(card);
        });
        
        document.getElementById('char-gallery-stats').textContent = 
            `${filteredCharacters.length} of ${this.characters.length} characters`;
    };

    PanelCharacterManager.prototype.createCharacterCard = function(character) {
        const card = document.createElement('div');
        card.className = 'KLITECharacterManager-character-card';
        
        // Prefer base64 data URL over blob URL
        let imageUrl = character.image;
        if (!imageUrl && character.rawData && character.rawData._imageData) {
            imageUrl = character.rawData._imageData;
            character.image = imageUrl;
        } else if (!imageUrl && character.imageBlob) {
            imageUrl = URL.createObjectURL(character.imageBlob);
            character.image = imageUrl;
        }
        
        card.innerHTML = `
            <img src="${imageUrl || ''}" alt="${character.name}" 
                class="KLITECharacterManager-character-image" 
                onerror="this.style.display='none';">
            <div class="KLITECharacterManager-character-info">
                <div class="KLITECharacterManager-character-name">${character.name}</div>
                <div class="KLITECharacterManager-character-creator">${character.creator}</div>
                <div class="KLITECharacterManager-character-rating">
                    <select class="KLITECharacterManager-rating-dropdown" data-char-id="${character.id}">
                        <option value="0" ${character.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="5" ${character.rating === 5 ? 'selected' : ''}>★★★★★</option>
                        <option value="4" ${character.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="3" ${character.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="2" ${character.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="1" ${character.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                    </select>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('KLITECharacterManager-rating-dropdown')) {
                this.openFullscreen(character);
            }
        });

        card.querySelector('.KLITECharacterManager-rating-dropdown')
            .addEventListener('change', async (e) => {
                e.stopPropagation();
                character.rating = parseInt(e.target.value);
                await this.IndexedDBManager.saveCharacter(character);
            });
        
        return card;
    };

    // Stub for openFullscreen - will be replaced in Part 3
    PanelCharacterManager.prototype.openFullscreen = function(character) {
        this.selectedCharacter = character;
        const fullscreenView = document.getElementById('char-fullscreen-view');
        fullscreenView.classList.add('show');
        // Full implementation in Part 3
    };

    PanelCharacterManager.prototype.closeFullscreen = function() {
        document.getElementById('char-fullscreen-view').classList.remove('show');
        this.selectedCharacter = null;
    };

    PanelCharacterManager.prototype.updateTagFilter = function() {
        const tagFilter = document.getElementById('char-tag-filter');
        const allTags = new Set();
        
        this.characters.forEach(char => {
            char.tags.forEach(tag => allTags.add(tag));
        });
        
        const sortedTags = Array.from(allTags).sort();
        
        tagFilter.innerHTML = `
            <option value="">All Tags</option>
            ${sortedTags.map(tag => 
                `<option value="${tag}" ${this.selectedTag === tag ? 'selected' : ''}>${tag}</option>`
            ).join('')}
        `;
    };

    PanelCharacterManager.prototype.updateRatingFilter = function() {
        const ratingFilter = document.getElementById('char-rating-filter');
        if (ratingFilter) {
            ratingFilter.value = this.selectedRating;
        }
    };

    PanelCharacterManager.prototype.openTagModal = function(characterId) {
        this.currentTagCharacter = this.characters.find(c => c.id === characterId);
        const modal = document.getElementById('char-tag-modal');
        modal.classList.remove('hidden');
        document.getElementById('char-tag-input').focus();
    };

    PanelCharacterManager.prototype.closeTagModal = function() {
        const modal = document.getElementById('char-tag-modal');
        modal.classList.add('hidden');
        document.getElementById('char-tag-input').value = '';
        this.currentTagCharacter = null;
    };

    PanelCharacterManager.prototype.addTag = async function() {
        const tagInput = document.getElementById('char-tag-input');
        const tagName = tagInput.value.trim();
        
        if (tagName && this.currentTagCharacter) {
            if (!this.currentTagCharacter.tags.includes(tagName)) {
                this.currentTagCharacter.tags.push(tagName);
                await this.IndexedDBManager.saveCharacter(this.currentTagCharacter);
                this.updateGallery();
                this.updateTagFilter();
                
                if (this.selectedCharacter && this.selectedCharacter.id === this.currentTagCharacter.id) {
                    this.openFullscreen(this.currentTagCharacter);
                }
            }
            this.closeTagModal();
        }
    };

    PanelCharacterManager.prototype.clearAll = async function() {
        if (confirm('Are you sure you want to delete all characters?')) {
            this.characters.forEach(char => {
                if (char.image && char.image.startsWith('blob:')) {
                    URL.revokeObjectURL(char.image);
                }
            });

            this.characters = [];
            this.selectedCharacter = null;
            this.selectedTag = '';
            this.selectedRating = '';
            this.searchTerm = '';
            
            await this.IndexedDBManager.clearAllCharacters();
            
            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
            this.closeFullscreen();
            
            document.getElementById('char-search-input').value = '';
            document.getElementById('char-tag-filter').value = '';
            document.getElementById('char-rating-filter').value = '';
        }
    };

    PanelCharacterManager.prototype.loadAsScenario = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI not available');
            return;
        }

        if (!confirm(`Load "${character.name}" as scenario? This will restart the session.`)) {
            return;
        }

        try {
            await KoboldAIIntegration.loadAsScenario(character.rawData);
        } catch (error) {
            alert(`Failed to load character: ${error.message}`);
        }
    };

    PanelCharacterManager.prototype.addToWorldInfo = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI functions not available. Make sure you are running this in KoboldAI Lite.');
            return;
        }

        try {
            const addBtn = document.getElementById('char-add-worldinfo-btn');
            addBtn.textContent = 'Adding...';
            addBtn.disabled = true;

            await KoboldAIIntegration.addToWorldInfo(character.rawData);
            
            this.helpers.UI.showSuccessMessage(`"${character.name}" added to World Info!`);

        } catch (error) {
            console.error('Error adding character to World Info:', error);
            alert(`Failed to add character to World Info: ${error.message}`);
        } finally {
            const addBtn = document.getElementById('char-add-worldinfo-btn');
            if (addBtn) {
                addBtn.textContent = 'Add to World Info';
                addBtn.disabled = !KoboldAIIntegration.isAvailable();
            }
        }
    };

    PanelCharacterManager.prototype.removeFromWorldInfo = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI functions not available. Make sure you are running this in KoboldAI Lite.');
            return;
        }

        const confirmMsg = `Remove "${character.name}" from World Info?\n\n⚠️ Warning: Any changes you made to the World Info entries will NOT be merged back to the stored character card. Only the original character data will remain.`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const removeBtn = document.getElementById('char-remove-worldinfo-btn');
            removeBtn.textContent = 'Removing...';
            removeBtn.disabled = true;

            const removedCount = await KoboldAIIntegration.removeFromWorldInfo(character.name);
            
            if (removedCount > 0) {
                this.helpers.UI.showSuccessMessage(`"${character.name}" removed from World Info! (${removedCount} entries removed)`);
            } else {
                this.helpers.UI.showSuccessMessage(`No World Info entries found for "${character.name}"`);
            }

        } catch (error) {
            console.error('Error removing character from World Info:', error);
            alert(`Failed to remove character from World Info: ${error.message}`);
        } finally {
            const removeBtn = document.getElementById('char-remove-worldinfo-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Remove from WI';
                removeBtn.disabled = !KoboldAIIntegration.isAvailable();
            }
        }
    };

    PanelCharacterManager.prototype.cleanup = function() {
        this.characters.forEach(char => {
            if (char.image && char.image.startsWith('blob:')) {
                URL.revokeObjectURL(char.image);
            }
        });
        
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
        
        const styleElement = document.getElementById('character-manager-panel-styles');
        if (styleElement) {
            styleElement.remove();
        }
    };

    // =============================================
    // PANEL API
    // =============================================
    window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};
    
    window.KLITE_RPMod_Panels.CHARS = {
        instance: null,
        
        async load(container, panel) {
            console.log('Loading Character Manager into CHARS panel');
            
            // Check if helpers are loaded
            if (!window.KLITE_RPMod_Helpers) {
                console.error('KLITE_RPMod_Helpers not found! Make sure to load helpers first.');
                container.innerHTML = `
                    <div style="padding: 20px; color: #ff6666;">
                        Error: Helper modules not loaded. Please check loading order.
                    </div>
                `;
                return;
            }

            // Check if CSS is loaded
            if (!window.KLITE_CharacterManager_CSS) {
                console.error('KLITE_CharacterManager_CSS not found! Make sure to load CSS first.');
                container.innerHTML = `
                    <div style="padding: 20px; color: #ff6666;">
                        Error: CSS module not loaded. Please check loading order.
                    </div>
                `;
                return;
            }
            
            // Clean up any existing instance
            if (this.instance) {
                this.instance.cleanup();
            }
            
            // Create new instance
            this.instance = new PanelCharacterManager();
            await this.instance.init(container);
        },
        
        unload() {
            if (this.instance) {
                this.instance.cleanup();
                this.instance = null;
            }
        }
    };

    // Global function for toggling fullscreen sections
    window.toggleFullscreenSection = function(sectionId) {
        const instance = window.KLITE_RPMod_Panels.CHARS.instance;
        if (!instance) return;
        
        const section = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (section) {
            section.classList.toggle('collapsed');
            
            if (section.classList.contains('collapsed')) {
                instance.collapsedFullscreenSections.add(sectionId);
            } else {
                instance.collapsedFullscreenSections.delete(sectionId);
            }
        }
    };// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 3)
// Fullscreen view implementation
// =============================================


    console.log('Loading KLITECharacterManager Panel Version - Part 3');
    
    if (!PanelCharacterManager) {
        console.error('KLITE Character Manager Parts 1 & 2 must be loaded first!');
        return;
    }

    // Replace the stub openFullscreen method with full implementation
    PanelCharacterManager.prototype.openFullscreen = function(character) {
        this.selectedCharacter = character;
        const fullscreenView = document.getElementById('char-fullscreen-view');
        const fullscreenContent = document.getElementById('char-fullscreen-content');
        const fullscreenTitle = document.getElementById('char-fullscreen-title');
        
        fullscreenTitle.textContent = character.name;
        
        // Format indicator
        const formatIndicator = character.rawData._importFormat || character.rawData._format || 'v2';
        
        // Ensure we have a valid image URL
        let imageUrl = character.image;
        if (!imageUrl && character.rawData && character.rawData._imageData) {
            imageUrl = character.rawData._imageData;
            character.image = imageUrl;
        } else if (!imageUrl && character.imageBlob) {
            imageUrl = URL.createObjectURL(character.imageBlob);
            character.image = imageUrl;
        }
        
        const isKoboldAvailable = window.KoboldAIIntegration.isAvailable();
        const loadBtn = document.getElementById('char-load-scenario-btn');
        const wiBtn = document.getElementById('char-add-worldinfo-btn');
        const removeWiBtn = document.getElementById('char-remove-worldinfo-btn');
        const removeCharBtn = document.getElementById('char-remove-character-btn');
        
        if (loadBtn) {
            loadBtn.disabled = !isKoboldAvailable;
            loadBtn.title = isKoboldAvailable ? 'Load character as new scenario' : 'KoboldAI not available';
        }
        
        if (wiBtn) {
            wiBtn.disabled = !isKoboldAvailable;
            wiBtn.title = isKoboldAvailable ? 'Add character to World Info' : 'KoboldAI not available';
        }

        if (removeWiBtn) {
            removeWiBtn.disabled = !isKoboldAvailable;
            removeWiBtn.title = isKoboldAvailable ? 'Remove character from World Info' : 'KoboldAI not available';
        }

        if (removeCharBtn) {
            removeCharBtn.disabled = false;
            removeCharBtn.title = 'Delete this character permanently';
        }
        
        // Build unified fullscreen content with centered layout
        let fullscreenHTML = `
            <!-- Character Header - Centered -->
            <div class="KLITECharacterManager-character-header">
                <img src="${imageUrl || ''}" alt="${character.name}" 
                    class="KLITECharacterManager-character-header-image"
                    onerror="this.style.display='none';">
                <div class="KLITECharacterManager-character-header-info">
                    <div class="KLITECharacterManager-character-header-name">${character.name}</div>
                    <div class="KLITECharacterManager-character-header-meta">
                        Created by ${character.creator} • Format: ${formatIndicator.toUpperCase()}
                    </div>
                    <div class="KLITECharacterManager-fullscreen-rating">
                        <label>Rating: </label>
                        <select id="char-fullscreen-rating-dropdown" data-char-id="${character.id}">
                            <option value="0" ${character.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                            <option value="5" ${character.rating === 5 ? 'selected' : ''}>★★★★★ (5 stars)</option>
                            <option value="4" ${character.rating === 4 ? 'selected' : ''}>★★★★☆ (4 stars)</option>
                            <option value="3" ${character.rating === 3 ? 'selected' : ''}>★★★☆☆ (3 stars)</option>
                            <option value="2" ${character.rating === 2 ? 'selected' : ''}>★★☆☆☆ (2 stars)</option>
                            <option value="1" ${character.rating === 1 ? 'selected' : ''}>★☆☆☆☆ (1 star)</option>
                        </select>
                    </div>
                    <div class="KLITECharacterManager-character-header-tags">
                        ${character.tags.map(tag => 
                            `<span class="KLITECharacterManager-tag" style="padding: 4px 8px; font-size: 11px;">${tag}</span>`
                        ).join('')}
                        <button class="KLITECharacterManager-add-tag-btn" data-char-id="${character.id}" 
                                style="width: 20px; height: 20px; font-size: 12px;">+</button>
                    </div>
                </div>
            </div>
        `;

        // Helper function to create collapsible sections
        const createSection = (title, content, defaultOpen = true) => {
            if (!content || (typeof content === 'string' && content.trim() === '')) return '';
            
            const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}-${character.id}`;
            const isCollapsed = this.collapsedFullscreenSections && this.collapsedFullscreenSections.has(sectionId);
            
            return `
                <div class="KLITECharacterManager-fullscreen-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="${sectionId}">
                    <div class="KLITECharacterManager-fullscreen-section-header" onclick="window.toggleFullscreenSection('${sectionId}')">
                        <span>${title}</span>
                        <span class="KLITECharacterManager-fullscreen-section-arrow">▼</span>
                    </div>
                    <div class="KLITECharacterManager-fullscreen-section-content">${this.helpers.Security.sanitizeHTML(content)}</div>
                </div>
            `;
        };

        // Add sections in order
        if (character.rawData.creator_notes) {
            fullscreenHTML += createSection('Creator Notes', character.rawData.creator_notes);
        }

        if (character.description) {
            fullscreenHTML += createSection('Description', character.description);
        }
        
        if (character.rawData.personality) {
            fullscreenHTML += createSection('Personality', character.rawData.personality);
        }

        if (character.scenario) {
            fullscreenHTML += createSection('Scenario', character.scenario);
        }

        if (character.rawData.system_prompt) {
            fullscreenHTML += createSection('System Prompt', character.rawData.system_prompt);
        }

        if (character.rawData.post_history_instructions) {
            fullscreenHTML += createSection('Post History Instructions', character.rawData.post_history_instructions);
        }
        
        // First Message as its own section
        if (character.rawData.first_mes) {
            fullscreenHTML += createSection('First Message', character.rawData.first_mes);
        }

        // Each alternate greeting as a separate section
        if (character.rawData.alternate_greetings && character.rawData.alternate_greetings.length > 0) {
            character.rawData.alternate_greetings.forEach((greeting, index) => {
                fullscreenHTML += createSection(`Alternate Greeting ${index + 2}`, greeting);
            });
        }

        // Example messages
        if (character.rawData.mes_example) {
            fullscreenHTML += createSection('Example Messages', character.rawData.mes_example);
        }

        // Character Book / World Info
        if (character.rawData.character_book && character.rawData.character_book.entries && character.rawData.character_book.entries.length > 0) {
            const book = character.rawData.character_book;
            let wiContent = `
                <div style="color: #888; font-size: 11px; margin-bottom: 10px;">
                    WorldInfo: ${book.entries.length} entries
                    Scan Depth: ${book.scan_depth || 50}
                    Token Budget: ${book.token_budget || 500}
                </div>
            `;

            // Sort entries by insertion order
            const sortedEntries = [...book.entries].sort((a, b) => 
                (a.insertion_order || 0) - (b.insertion_order || 0)
            );

            for (const entry of sortedEntries) {
                if (!entry.enabled && entry.enabled !== undefined) continue;
                
                const keys = Array.isArray(entry.keys) ? entry.keys : 
                            (entry.key ? [entry.key] : []);
                const keyDisplay = keys.join(', ') || '[No keys]';
                
                wiContent += `
                <div class="KLITECharacterManager-wi-entry">
                    <div class="KLITECharacterManager-wi-entry-header">
                        <div class="KLITECharacterManager-wi-keys">${this.helpers.Security.sanitizeHTML(keyDisplay)}</div>
                        <div class="KLITECharacterManager-wi-options">
                `;

                // Add entry properties
                if (entry.constant) {
                    wiContent += `<span>📌 Constant</span>`;
                }
                if (entry.selective) {
                    wiContent += `<span>🎯 Selective</span>`;
                }
                if (entry.case_sensitive) {
                    wiContent += `<span>Aa Case</span>`;
                }
                if (entry.priority && entry.priority !== 10) {
                    wiContent += `<span>P:${entry.priority}</span>`;
                }

                wiContent += `
                        </div>
                    </div>
                    <div class="KLITECharacterManager-wi-content">${this.helpers.Security.sanitizeHTML(entry.content || '[No content]')}</div>
                `;

                // Add secondary keys if present
                if (entry.secondary_keys && entry.secondary_keys.length > 0) {
                    wiContent += `
                    <div style="margin-top: 5px; font-size: 10px; color: #666;">
                        Secondary: ${this.helpers.Security.sanitizeHTML(entry.secondary_keys.join(', '))}
                    </div>
                    `;
                }

                // Add comment if present
                if (entry.comment) {
                    wiContent += `
                    <div style="margin-top: 5px; font-size: 10px; color: #666; font-style: italic;">
                        ${this.helpers.Security.sanitizeHTML(entry.comment)}
                    </div>
                    `;
                }

                wiContent += `</div>`;
            }

            fullscreenHTML += createSection(`Character Book / World Info (${book.name || 'Character Book'})`, wiContent, false);
        }

        fullscreenContent.innerHTML = fullscreenHTML;

        // Set up event listeners
        const fullscreenRatingDropdown = fullscreenContent.querySelector('#char-fullscreen-rating-dropdown');
        if (fullscreenRatingDropdown) {
            fullscreenRatingDropdown.addEventListener('change', async (e) => {
                const newRating = parseInt(e.target.value);
                character.rating = newRating;
                await this.IndexedDBManager.saveCharacter(character);
                this.updateGallery();
                this.updateRatingFilter();
            });
        }

        const fullscreenAddTagBtn = fullscreenContent.querySelector('.KLITECharacterManager-add-tag-btn');
        if (fullscreenAddTagBtn) {
            fullscreenAddTagBtn.addEventListener('click', () => {
                this.openTagModal(character.id);
            });
        }
        
        fullscreenView.classList.add('show');
    };

    // Also add helper method for removing tag
    PanelCharacterManager.prototype.removeTag = async function(characterId, tagToRemove) {
        const character = this.characters.find(c => c.id === characterId);
        if (character) {
            character.tags = character.tags.filter(tag => tag !== tagToRemove);
            await this.IndexedDBManager.saveCharacter(character);
            this.updateGallery();
            this.updateTagFilter();
            
            // Refresh fullscreen if it's the same character
            if (this.selectedCharacter && this.selectedCharacter.id === characterId) {
                this.openFullscreen(character);
            }
        }
    };

    // Add CSS for fullscreen-specific styles that might be missing
    const addFullscreenStyles = () => {
        const existingStyle = document.getElementById('character-manager-fullscreen-styles');
        if (existingStyle) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'character-manager-fullscreen-styles';
        styleElement.textContent = `
            /* Ensure fullscreen section styles are properly applied */
            .KLITECharacterManager-panel .KLITECharacterManager-character-header-tags .KLITECharacterManager-tag {
                cursor: default;
                user-select: none;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content {
                max-height: 400px;
                overflow-y: auto;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-wi-entry {
                position: relative;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar {
                width: 8px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-track {
                background: #2a2a2a;
                border-radius: 4px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb:hover {
                background: #666;
            }
        `;
        document.head.appendChild(styleElement);
    };

    // Ensure styles are added when Part 3 loads
    addFullscreenStyles();

    console.log('✅ KLITE Character Manager Part 3 loaded - Fullscreen implementation complete');// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
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
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                    <!-- Rules for the AI / System Prompt -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>System Prompt / Rules for the AI</h3>
                        <textarea 
                            id="klite-rpmod-rules-field"

                            placeholder="Place your System Prompt, JB and rules for the AI here. They will be automatically added to the context."
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
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
                            <label style="color: #999; font-size: 12px;">Style:  </label>
                            <select id="klite-narrator-style" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px;">
                                <option value="omniscient" selected>Omniscient (knows all)</option>
                                <option value="limited">Limited (character perspective)</option>
                                <option value="objective">Objective (camera view)</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
                            <label style="color: #999; font-size: 12px;">Focus: </label>
                            <select id="klite-narrator-focus" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px;">
                                <option value="environment">Environment & Atmosphere</option>
                                <option value="emotions">Emotions & Thoughts</option>
                                <option value="action">Actions & Events</option>
                                <option value="mixed" selected>Mixed (Everything)</option>
                            </select>
                        </div>
                        
                        <button class="klite-rpmod-button" id="klite-rpmod-trigger-narrator-manual" style="width: 100%; margin-top: 4px;">
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
        let fullPrompt = `[SYSTEM INSTRUCTION: Out of Character instructions for the AI: ${narratorInstruction}]`;
        
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
        let instruction = "For exactly one answer you should now impersonate and answer as the story's NARRATOR. ";
        
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
                instruction += "Focus on describing the setting, atmosphere, weather, sounds, smells, and environmental details that set the scene. ";
                break;
            case 'emotions':
                instruction += "Focus on the emotional undertones, character reactions, internal conflicts, and the psychological atmosphere of the scene. ";
                break;
            case 'action':
                instruction += "Focus on what is happening, character movements, physical interactions, and the progression of events. ";
                break;
            case 'mixed':
                instruction += "Provide a balanced description covering the environment, character emotions, and ongoing actions to paint a complete picture. ";
                break;
        }

        // Base instruction to get the AI back into persona
        instruction += "After this SYSTEM INSTRUCTION is processed the role play resumes."
        
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
};// =============================================
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
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - PLAY Panel for Story Mode
// Full implementation with timeline and generation control
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.PLAY_STORY = {
    collapsedSections: new Set(),
    chapters: [],
    currentChapter: null,
    
    load(container) {
        container.innerHTML = `
        <!-- PLAY Panel (Story Mode) -->
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <div class="klite-rpmod-section-content">
                    <h3>Timeline / Index</h3>
                    <div id="klite-rpmod-timeline" class="timeline" style="width: 100%; min-height: 200px; margin-top: 8px; background: rgba(0,0,0,0.3); 
                               border: 1px solid #444; color: #e0e0e0; padding: 8px; border-radius: 4px; resize: vertical; max-height: 400px; overflow-y: auto;">
                        <!-- Timeline items will be populated here -->
                    </div>
                    <div style="display: grid; gap: 4px; grid-template-columns: 1fr 1fr;">
                        <button id="klite-rpmod-add-chapter" class="klite-rpmod-button">Add Chapter Marker</button>
                        <button id="klite-rpmod-delete-chapters" class="klite-rpmod-button delete-btn">Delete All Chapters</button>
                    </div>
                </div>
                
                <div class="klite-rpmod-section-content">
                    <h3>Generation Control</h3>
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
            </div>
        </div>
        `;

        this.initEventListeners(container);
        this.loadSavedStates();
        this.initializePresets();
        this.initializeSliders();
        this.initializeTimeline();
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
    },

    async loadSavedStates() {
        console.log('Loading Story panel states...');
        
        // Load chapters from KoboldAI database or localStorage
        await this.loadChaptersFromLiteDB();
        this.updateTimeline();
        
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
    
    async saveChaptersToLiteDB() {
        // Save chapters data to KoboldAI database using a prefixed key
        if (typeof localforage !== 'undefined') {
            try {
                await localforage.setItem('KLITERPmodchapters', this.chapters);
                console.log('Chapters saved to Lite DB');
            } catch (error) {
                console.error('Error saving chapters to Lite DB:', error);
                // Fallback to localStorage
                localStorage.setItem('klite-rpmod-chapters', JSON.stringify(this.chapters));
            }
        } else {
            // If localforage not available, use localStorage
            localStorage.setItem('klite-rpmod-chapters', JSON.stringify(this.chapters));
        }
    },
    
    async loadChaptersFromLiteDB() {
        // Try to load from KoboldAI database first
        if (typeof localforage !== 'undefined') {
            try {
                const chapters = await localforage.getItem('KLITERPmodchapters');
                if (chapters && Array.isArray(chapters)) {
                    this.chapters = chapters;
                    console.log('Chapters loaded from Lite DB:', chapters.length);
                    return true;
                }
            } catch (error) {
                console.error('Error loading chapters from Lite DB:', error);
            }
        }
        
        // Fallback to localStorage
        const savedChapters = localStorage.getItem('klite-rpmod-chapters');
        if (savedChapters) {
            try {
                this.chapters = JSON.parse(savedChapters);
                console.log('Chapters loaded from localStorage:', this.chapters.length);
                return true;
            } catch (e) {
                console.error('Error parsing saved chapters:', e);
            }
        }
        
        return false;
    },
    
    initializeTimeline() {
        const addChapterBtn = document.getElementById('klite-rpmod-add-chapter');
        const deleteChaptersBtn = document.getElementById('klite-rpmod-delete-chapters');
        
        addChapterBtn?.addEventListener('click', () => {
            this.addChapterMarker();
        });
        
        deleteChaptersBtn?.addEventListener('click', () => {
            this.deleteAllChapters();
        });
        
        // Update timeline display
        this.updateTimeline();
    },
    
    async addChapterMarker() {
        // Get current word count from chat display
        const wordCount = this.getCurrentWordCount();
        
        // Get chapter title from user
        const title = prompt('Enter chapter title:', `Chapter ${this.chapters.length + 1}`);
        if (!title) return;
        
        // Create new chapter with unique ID
        const newChapter = {
            id: Date.now(), // Simple unique ID
            chapterNumber: this.chapters.length + 1,
            title: title,
            wordCount: wordCount,
            position: this.getCurrentScrollPosition(),
            timestamp: Date.now(),
            storyId: 'rpmod-story'
        };
        
        // Add to chapters array
        this.chapters.push(newChapter);
        
        // Save to database
        await this.saveChaptersToLiteDB();
        
        // Update timeline display
        this.updateTimeline();
        console.log('Chapter added:', newChapter);
    },
    
    async deleteAllChapters() {
        // Ask for confirmation
        const confirmed = confirm('Are you sure you want to delete all chapters? This action cannot be undone.');
        
        if (!confirmed) {
            return;
        }
        
        // Clear the chapters array
        this.chapters = [];
        
        // Save empty state to database
        await this.saveChaptersToLiteDB();
        
        // Update timeline display to blank state
        this.updateTimeline();
        
        console.log('All chapters deleted');
    },
    
    getCurrentWordCount() {
        // Count words in the chat display
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay) {
            const text = chatDisplay.innerText || chatDisplay.textContent || '';
            const words = text.trim().split(/\s+/).filter(word => word.length > 0);
            return words.length;
        }
        
        return 0;
    },
    
    getCurrentScrollPosition() {
        // Get current scroll position of chat display
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay) {
            return chatDisplay.scrollTop;
        }
        
        return 0;
    },
    
    updateTimeline() {
        const timeline = document.getElementById('klite-rpmod-timeline');
        if (!timeline) return;
        
        if (this.chapters.length === 0) {
            timeline.innerHTML = `
                <div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">
                    No chapters added yet. Click "Add Chapter Marker" to create your first chapter.
                </div>
            `;
            return;
        }
        
        timeline.innerHTML = '';
        
        this.chapters.forEach((chapter, index) => {
            const isActive = index === this.chapters.length - 1;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'timeline-item';
            itemDiv.style.cssText = `
                padding: 8px;
                margin-bottom: 4px;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s;
                ${!isActive ? 'opacity: 0.7;' : ''}
            `;
            
            itemDiv.innerHTML = `
                <span style="color: #e0e0e0;"><strong>Chapter ${chapter.chapterNumber}:</strong> ${chapter.title}</span>
                <div style="font-size: 11px; color: #999;">${chapter.wordCount.toLocaleString()} words</div>
            `;
            
            // Add click handler to scroll to chapter position
            itemDiv.addEventListener('click', () => {
                this.scrollToChapter(chapter);
            });
            
            // Hover effect
            itemDiv.addEventListener('mouseenter', () => {
                itemDiv.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            itemDiv.addEventListener('mouseleave', () => {
                itemDiv.style.background = '';
            });
            
            timeline.appendChild(itemDiv);
        });
    },
    
    scrollToChapter(chapter) {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay && chapter.position !== undefined) {
            chatDisplay.scrollTop = chapter.position;
            
            // Flash the chat display to indicate navigation
            chatDisplay.style.transition = 'opacity 0.2s';
            chatDisplay.style.opacity = '0.7';
            setTimeout(() => {
                chatDisplay.style.opacity = '1';
            }, 200);
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
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - TOOLS Panel Implementation
// Advanced analysis and utility tools with full functionality
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.TOOLS = {
    // State
    analysisWindow: null,
    autoRegenerateInterval: null,
    autoRegenerateEnabled: false,
    lastRoll: null,
    contextCache: null,
    
    load(container, panel) {
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <!-- Statistics Dashboard -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Statistics Dashboard</h3>
                    <div class="klite-rpmod-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Messages</div>
                            <div id="klite-rpmod-message-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Token Count</div>
                            <div id="klite-rpmod-token-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Characters</div>
                            <div id="klite-rpmod-char-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Words</div>
                            <div id="klite-rpmod-word-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                    </div>
                    
                    <!-- Additional stats row -->
                    <div class="klite-rpmod-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">Avg Msg Length</div>
                            <div id="klite-rpmod-avg-length" style="color: #999; font-size: 16px; font-weight: bold;">0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">User/AI Ratio</div>
                            <div id="klite-rpmod-user-ai-ratio" style="color: #999; font-size: 16px; font-weight: bold;">0:0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">Unique Words</div>
                            <div id="klite-rpmod-unique-words" style="color: #999; font-size: 16px; font-weight: bold;">0</div>
                        </div>
                    </div>
                    
                    <button class="klite-rpmod-button" id="klite-rpmod-refresh-stats" style="width: 100%;">
                        Refresh Statistics
                    </button>
                </div>

                <!-- Context Analyzer -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Context Analyzer</h3>
                    
                    <!-- Token distribution bar -->
                    <div class="klite-rpmod-token-bar" style="
                        display: flex; 
                        height: 40px; 
                        border-radius: 4px; 
                        overflow: hidden; 
                        margin: 10px;
                        padding: 5px;
                        border: 1px solid #444;
                        background: #1a1a1a;
                    ">
                        <div id="klite-rpmod-memory-bar" style="background: #d9534f; transition: width 0.3s;" title="Memory"></div>
                        <div id="klite-rpmod-wi-bar" style="background: #5cb85c; transition: width 0.3s;" title="World Info"></div>
                        <div id="klite-rpmod-story-bar" style="background: #5bc0de; transition: width 0.3s;" title="Story"></div>
                        <div id="klite-rpmod-anote-bar" style="background: #f0ad4e; transition: width 0.3s;" title="Author's Note"></div>
                        <div id="klite-rpmod-free-bar" style="background: #333; flex: 1;" title="Free Space"></div>
                    </div>
                    
                    <!-- Token breakdown -->
                    <div style="font-size: 11px; color: #999;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #d9534f; margin-right: 5px;"></span>Memory: <span id="klite-rpmod-memory-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #5cb85c; margin-right: 5px;"></span>World Info: <span id="klite-rpmod-wi-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #5bc0de; margin-right: 5px;"></span>Story: <span id="klite-rpmod-story-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #f0ad4e; margin-right: 5px;"></span>Author's Note: <span id="klite-rpmod-anote-tokens">0</span></div>
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                            <strong>Total Context: <span id="klite-rpmod-total-context">0</span> / <span id="klite-rpmod-max-context">8192</span> tokens</strong>
                            <div style="color: #666; margin-top: 5px;">Free: <span id="klite-rpmod-free-tokens">8192</span> tokens (<span id="klite-rpmod-free-percent">100</span>%)</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-analyze-context" style="flex: 1;">
                            Analyze Context
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-detailed-analysis" style="flex: 1;">
                            Detailed View
                        </button>
                    </div>
                </div>

                <!-- Smart Memory Writer -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Smart Memory Writer</h3>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">(has 120 seconds timeout)</div>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select id="klite-rpmod-memory-context" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 6px;">
                            <option value="entire">Entire Story (∞)</option>
                            <option value="last50">Last 50 Messages</option>
                            <option value="recent" selected>Recent Messages (10)</option>
                            <option value="last3">Most Recent Messages (3)</option>
                            <option value="last1">Last Message (1)</option>
                        </select>
                        <select id="klite-rpmod-memory-type" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 6px;">
                            <option value="summary" selected>Summary</option>
                            <option value="keywords">Keywords</option>
                            <option value="outline">Outline</option>
                        </select>
                    </div>
                    
                    <button class="klite-rpmod-button" id="klite-rpmod-generate-memory" style="width: 100%; margin-bottom: 10px;">
                        🧠 Generate Memory
                    </button>
                    <textarea id="klite-rpmod-memory-output" placeholder="Generated memory will appear here..." style="
                        width: 100%;
                        height: 150px;
                        background: #262626;
                        border: 1px solid #444;
                        color: #e0e0e0;
                        padding: 10px;
                        font-size: 13px;
                        resize: vertical;
                        margin-bottom: 10px;
                    "></textarea>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-apply-memory">
                            ✓ Apply
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-append-memory">
                            + Append
                        </button>
                    </div>
                </div>
                <!-- Quick Dice -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Quick Dice</h3>
                    
                    <!-- Standard dice buttons -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <button class="klite-rpmod-dice-btn" data-dice="d2" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d2</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d4" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d4</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d6" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d6</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d8" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d8</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d10" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d10</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d12" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d12</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d20" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d20</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d100" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d100</button>
                    </div>
                    
                    <!-- Custom dice input -->
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="klite-rpmod-custom-dice" placeholder="e.g., 2d6+3" style="
                            flex: 1; 
                            background: #262626; 
                            border: 1px solid #444; 
                            color: #e0e0e0; 
                            padding: 6px; 
                            border-radius: 4px;
                        ">
                        <button class="klite-rpmod-button" id="klite-rpmod-roll-custom" style="width: auto; padding: 6px 16px;">
                            Roll
                        </button>
                    </div>
                    
                    <!-- Dice result display -->
                    <div id="klite-rpmod-dice-result" style="
                        margin-top: 10px; 
                        padding: 12px; 
                        background: rgba(0,0,0,0.3); 
                        border-radius: 4px; 
                        text-align: center; 
                        min-height: 50px; 
                        display: none;
                        border: 1px solid #444;
                    ">
                        <div id="klite-rpmod-dice-total" style="font-size: 28px; font-weight: bold; color: #4a9eff; margin-bottom: 5px;"></div>
                        <div id="klite-rpmod-dice-breakdown" style="font-size: 12px; color: #999;"></div>
                        <div id="klite-rpmod-dice-animation" style="margin-top: 10px;"></div>
                    </div>
                    
                    <!-- Dice settings -->
                    <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="klite-rpmod-dice-to-chat" checked>
                        <label for="klite-rpmod-dice-to-chat" style="color: #999; font-size: 12px;">Add rolls to chat</label>
                    </div>
                </div>

                <!-- Auto-Re-Generate -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Auto-Re-Generate</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="klite-rpmod-auto-regen-toggle" style="width: auto;">
                        <label for="klite-rpmod-auto-regen-toggle" style="color: #999; font-size: 13px;">Enable Auto-Regenerate</label>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="color: #999; font-size: 11px;">Delay (ms):</label>
                            <input type="number" id="klite-rpmod-auto-regen-delay" value="3000" min="1000" max="10000" step="500" style="
                                width: 100%; 
                                background: #262626; 
                                border: 1px solid #444; 
                                color: #e0e0e0; 
                                padding: 4px;
                            ">
                        </div>
                        <div>
                            <label style="color: #999; font-size: 11px;">Max Retries:</label>
                            <input type="number" id="klite-rpmod-auto-regen-max" value="3" min="1" max="10" style="
                                width: 100%; 
                                background: #262626; 
                                border: 1px solid #444; 
                                color: #e0e0e0; 
                                padding: 4px;
                            ">
                        </div>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <label style="color: #999; font-size: 11px;">Trigger conditions:</label>
                        <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
                            <label style="color: #999; font-size: 11px;">Keyword Triggers:</label>
                            <div style="margin-top: 5px;">
                                <textarea id="klite-rpmod-regen-keywords" placeholder="Enter keywords, one per line" style="
                                    width: 100%;
                                    height: 60px;
                                    background: #262626;
                                    border: 1px solid #444;
                                    color: #e0e0e0;
                                    padding: 6px;
                                    font-size: 11px;
                                    resize: vertical;
                                "></textarea>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                                <div>
                                    <label style="color: #999; font-size: 11px;">Required matches:</label>
                                    <input type="number" id="klite-rpmod-keyword-threshold" value="2" min="1" max="10" style="
                                        width: 100%;
                                        background: #262626;
                                        border: 1px solid #444;
                                        color: #e0e0e0;
                                        padding: 4px;
                                    ">
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px; margin-top: 16px;">
                                    <input type="checkbox" id="klite-rpmod-keyword-case">
                                    <label for="klite-rpmod-keyword-case" style="color: #888; font-size: 11px;">Case sensitive</label>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 5px;">
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-regen-short" checked>
                                <label for="klite-rpmod-regen-short" style="color: #888; font-size: 11px;">Short messages (<50 chars)</label>
                            </div>
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-regen-incomplete" checked>
                                <label for="klite-rpmod-regen-incomplete" style="color: #888; font-size: 11px;">Incomplete sentences</label>
                            </div>
                            <div>
                                <input type="checkbox" id="klite-rpmod-regen-error">
                                <label for="klite-rpmod-regen-error" style="color: #888; font-size: 11px;">Error responses</label>
                            </div>
                        </div>
                    </div>
                    
                    <div id="klite-rpmod-auto-regen-status" style="
                        margin-top: 10px; 
                        padding: 8px; 
                        background: rgba(0,0,0,0.3); 
                        border-radius: 4px; 
                        color: #666; 
                        font-size: 11px; 
                        text-align: center;
                    ">
                        Auto-regenerate is disabled
                    </div>
                </div>

                <!-- Export Tools -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Export Tools</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-export-markdown">
                            📝 Markdown
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-json">
                            📊 JSON
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-html">
                            🌐 HTML
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-epub">
                            📚 EPUB
                        </button>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <label style="color: #999; font-size: 11px;">Export options:</label>
                        <div style="margin-top: 5px;">
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-export-metadata" checked>
                                <label for="klite-rpmod-export-metadata" style="color: #888; font-size: 11px;">Include metadata</label>
                            </div>
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-export-worldinfo" checked>
                                <label for="klite-rpmod-export-worldinfo" style="color: #888; font-size: 11px;">Include World Info</label>
                            </div>
                            <div>
                                <input type="checkbox" id="klite-rpmod-export-format">
                                <label for="klite-rpmod-export-format" style="color: #888; font-size: 11px;">Format as dialogue</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 
        </div>        
        `;

        this.initializeTools();
        
        // Initial statistics update
        this.updateStatistics();

        setTimeout(() => {
            this.analyzeContext();
        }, 100);

        this.startContextAutoRefresh();
    },

    initializeTools() {
        // Statistics
        document.getElementById('klite-rpmod-refresh-stats')?.addEventListener('click', () => {
            this.updateStatistics();
        });

        // Context analyzer
        document.getElementById('klite-rpmod-analyze-context')?.addEventListener('click', () => {
            // Add visual feedback
            const button = document.getElementById('klite-rpmod-analyze-context');
            const originalText = button.textContent;
            button.textContent = 'Analyzing...';
            button.disabled = true;
            
            // Clear the cache to force a fresh analysis
            this.contextCache = null;
            
            // Run the analysis
            this.analyzeContext();
            
            // Restore button state after a short delay
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                
                button.style.backgroundColor = '#5cb85c';
                setTimeout(() => {
                    button.style.backgroundColor = '';
                }, 500)
            }, 300);
        });

        document.getElementById('klite-rpmod-detailed-analysis')?.addEventListener('click', () => {
            this.openDetailedAnalysis();
        });

        // Memory generator
        document.getElementById('klite-rpmod-generate-memory')?.addEventListener('click', () => {
            this.generateMemory();
        });

        document.getElementById('klite-rpmod-apply-memory')?.addEventListener('click', () => {
            this.applyMemory(false);
        });

        document.getElementById('klite-rpmod-append-memory')?.addEventListener('click', () => {
            this.applyMemory(true);
        });

        // Dice system
        this.initializeDiceSystem();

        window.addEventListener('kobold:memory_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });

        window.addEventListener('kobold:story_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });

        window.addEventListener('kobold:wi_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });
        // Auto-Re-Generate
        this.initializeAutoRegenerate();

        // Export tools
        this.initializeExportTools();
    },

    // ==================== STATISTICS ====================
    updateStatistics() {
        console.log('📊 Updating statistics...');
        
        if (typeof gametext_arr === 'undefined' || !Array.isArray(gametext_arr)) {
            return;
        }
        
        const messages = gametext_arr.filter(msg => msg && msg.trim());
        const fullText = messages.join(' ');
        
        // Basic counts
        const messageCount = messages.length;
        const charCount = fullText.length;
        const words = fullText.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Token count
        let tokenCount = 0;
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(fullText);
                tokenCount = Array.isArray(tokens) ? tokens.length : 0;
            } catch (e) {
                tokenCount = Math.ceil(fullText.length / 4);
            }
        } else {
            tokenCount = Math.ceil(fullText.length / 4);
        }
        
        // Advanced statistics
        const avgMessageLength = messageCount > 0 ? Math.round(charCount / messageCount) : 0;
        
        // User/AI ratio (assuming alternating messages)
        const userMessages = messages.filter((_, i) => i % 2 === 0).length;
        const aiMessages = messages.filter((_, i) => i % 2 === 1).length;
        const ratio = `${userMessages}:${aiMessages}`;
        
        // Unique words
        const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
        
        // Update UI
        document.getElementById('klite-rpmod-message-count').textContent = messageCount;
        document.getElementById('klite-rpmod-token-count').textContent = tokenCount.toLocaleString();
        document.getElementById('klite-rpmod-char-count').textContent = charCount.toLocaleString();
        document.getElementById('klite-rpmod-word-count').textContent = wordCount.toLocaleString();
        document.getElementById('klite-rpmod-avg-length').textContent = avgMessageLength;
        document.getElementById('klite-rpmod-user-ai-ratio').textContent = ratio;
        document.getElementById('klite-rpmod-unique-words').textContent = uniqueWords.toLocaleString();
    },

    // ==================== CONTEXT ANALYZER ====================
    analyzeContext() {
        console.log('🔍 Analyzing context...');
        
        // Get max context size
        const maxContext = (typeof localsettings !== 'undefined' && localsettings.max_context_length) 
            ? parseInt(localsettings.max_context_length) 
            : 8192;
        
        // Build context components
        const contextParts = this.buildContextParts();
        
        // Update token bar
        this.updateTokenBar(contextParts, maxContext);
        
        // Cache for detailed view
        this.contextCache = contextParts;
    },

    buildContextParts() {
        const parts = {
            memory: { text: '', tokens: 0 },
            worldInfo: { text: '', tokens: 0 },
            story: { text: '', tokens: 0 },
            authorNote: { text: '', tokens: 0 },
            total: 0
        };
        
        // Memory
        if (typeof localsettings !== 'undefined' && localsettings.memory) {
            parts.memory.text = localsettings.memory;
            parts.memory.tokens = this.countTokens(parts.memory.text);
        }
        
        // World Info
        if (typeof current_wi !== 'undefined' && Array.isArray(current_wi)) {
            const activeWI = current_wi.filter(wi => wi.content && wi.key);
            parts.worldInfo.text = activeWI.map(wi => wi.content).join('\n');
            parts.worldInfo.tokens = this.countTokens(parts.worldInfo.text);
        }
        
        // Story (recent messages)
        if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
            // Get as many recent messages as will fit
            const recentMessages = gametext_arr.slice(-50).filter(msg => msg);
            parts.story.text = recentMessages.join('\n');
            parts.story.tokens = this.countTokens(parts.story.text);
        }
        
        // Author's Note
        if (typeof localsettings !== 'undefined' && localsettings.anotetext) {
            parts.authorNote.text = localsettings.anotetext;
            parts.authorNote.tokens = this.countTokens(parts.authorNote.text);
        }
        
        // Total
        parts.total = parts.memory.tokens + parts.worldInfo.tokens + 
                     parts.story.tokens + parts.authorNote.tokens;
        
        return parts;
    },

    updateTokenBar(parts, maxContext) {
        const total = parts.total;
        const free = Math.max(0, maxContext - total);
        
        // Update token counts
        document.getElementById('klite-rpmod-memory-tokens').textContent = parts.memory.tokens;
        document.getElementById('klite-rpmod-wi-tokens').textContent = parts.worldInfo.tokens;
        document.getElementById('klite-rpmod-story-tokens').textContent = parts.story.tokens;
        document.getElementById('klite-rpmod-anote-tokens').textContent = parts.authorNote.tokens;
        document.getElementById('klite-rpmod-total-context').textContent = total;
        document.getElementById('klite-rpmod-max-context').textContent = maxContext;
        document.getElementById('klite-rpmod-free-tokens').textContent = free;
        document.getElementById('klite-rpmod-free-percent').textContent = Math.round((free / maxContext) * 100);
        
        // Update visual bar
        const memoryBar = document.getElementById('klite-rpmod-memory-bar');
        const wiBar = document.getElementById('klite-rpmod-wi-bar');
        const storyBar = document.getElementById('klite-rpmod-story-bar');
        const anoteBar = document.getElementById('klite-rpmod-anote-bar');
        
        if (total > 0) {
            memoryBar.style.width = `${(parts.memory.tokens / maxContext) * 100}%`;
            wiBar.style.width = `${(parts.worldInfo.tokens / maxContext) * 100}%`;
            storyBar.style.width = `${(parts.story.tokens / maxContext) * 100}%`;
            anoteBar.style.width = `${(parts.authorNote.tokens / maxContext) * 100}%`;
        } else {
            memoryBar.style.width = '0';
            wiBar.style.width = '0';
            storyBar.style.width = '0';
            anoteBar.style.width = '0';
        }
        
        // Color code based on usage
        const usagePercent = (total / maxContext) * 100;
        const bars = [memoryBar, wiBar, storyBar, anoteBar];
        
        if (usagePercent > 90) {
            bars.forEach(bar => bar.style.opacity = '0.8');
        } else {
            bars.forEach(bar => bar.style.opacity = '1');
        }
    },

    openDetailedAnalysis() {
        console.log('📈 Opening detailed analysis...');
        
        // Make sure we have context data
        if (!this.contextCache) {
            this.analyzeContext();
        }
        
        // Close existing window if open
        if (this.analysisWindow && !this.analysisWindow.closed) {
            this.analysisWindow.close();
        }
        
        // Open new window with the advanced context analyzer
        this.analysisWindow = window.open('', 'ContextAnalysis', 'width=1200,height=800,scrollbars=yes');
        
        const doc = this.analysisWindow.document;
        doc.open();
        doc.write(this.buildDetailedAnalysisHTML());
        doc.close();
    },

    startContextAutoRefresh() {
        // Stop any existing interval
        this.stopContextAutoRefresh();
        
        // Update every 5 seconds
        this.contextRefreshInterval = setInterval(() => {
            if (document.getElementById('klite-rpmod-panel-tools')) {
                this.analyzeContext();
            } else {
                this.stopContextAutoRefresh();
            }
        }, 5000);
    },

    stopContextAutoRefresh() {
        if (this.contextRefreshInterval) {
            clearInterval(this.contextRefreshInterval);
            this.contextRefreshInterval = null;
        }
    },

    buildDetailedAnalysisHTML() {
        const parts = this.contextCache || this.buildContextParts();
        const maxContext = (typeof localsettings !== 'undefined' && localsettings.max_context_length) 
            ? parseInt(localsettings.max_context_length) 
            : 8192;
        
        // Build the context_analyzerv4.html style interface
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Context Analysis - KLITE RPMod</title>
                <style>
                    ${this.getAnalyzerStyles()}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Context Analysis</h1>
                        <div class="summary">
                            <div class="summary-item">Memory: ${parts.memory.tokens} tokens</div>
                            <div class="summary-item">World Info: ${parts.worldInfo.tokens} tokens</div>
                            <div class="summary-item">Story: ${parts.story.tokens} tokens</div>
                            <div class="summary-item">Author's Note: ${parts.authorNote.tokens} tokens</div>
                            <div class="summary-item"><strong>Total: ${parts.total} / ${maxContext} tokens</strong></div>
                        </div>
                    </div>
                    
                    <div class="token-bar-container">
                        <div class="token-bar">
                            ${parts.memory.tokens > 0 ? `<div class="memory-tokens" style="width: ${(parts.memory.tokens / maxContext) * 100}%" title="Memory: ${parts.memory.tokens} tokens"></div>` : ''}
                            ${parts.worldInfo.tokens > 0 ? `<div class="wi-tokens" style="width: ${(parts.worldInfo.tokens / maxContext) * 100}%" title="World Info: ${parts.worldInfo.tokens} tokens"></div>` : ''}
                            ${parts.story.tokens > 0 ? `<div class="story-tokens" style="width: ${(parts.story.tokens / maxContext) * 100}%" title="Story: ${parts.story.tokens} tokens"></div>` : ''}
                            ${parts.authorNote.tokens > 0 ? `<div class="anote-tokens" style="width: ${(parts.authorNote.tokens / maxContext) * 100}%" title="Author's Note: ${parts.authorNote.tokens} tokens"></div>` : ''}
                            <div class="free-tokens" style="width: ${((maxContext - parts.total) / maxContext) * 100}%" title="Free: ${maxContext - parts.total} tokens"></div>
                        </div>
                    </div>
                    
                    <div class="view-controls">
                        <label><input type="radio" name="viewMode" value="formatted" checked onchange="toggleView()"> Formatted View</label>
                        <label><input type="radio" name="viewMode" value="tokens" onchange="toggleView()"> Token View</label>
                        <label><input type="checkbox" id="showIds" onchange="toggleIds()"> Show Token IDs</label>
                    </div>
                    
                    ${parts.memory.text ? this.buildSection('Memory', parts.memory.text, '#d9534f') : ''}
                    ${parts.worldInfo.text ? this.buildSection('World Info', parts.worldInfo.text, '#5cb85c') : ''}
                    ${parts.story.text ? this.buildSection('Story Context', parts.story.text, '#5bc0de') : ''}
                    ${parts.authorNote.text ? this.buildSection('Author\'s Note', parts.authorNote.text, '#f0ad4e') : ''}
                </div>
                
                <script>
                    ${this.getAnalyzerScript()}
                </script>
            </body>
            </html>
        `;
    },

    buildSection(title, content, color) {
        const tokens = this.tokenizeText(content);
        const tokenView = this.createTokenVisualization(tokens);
        
        return `
            <div class="section">
                <h2 style="color: ${color};">${title}</h2>
                <div class="formatted-view">
                    <pre>${this.escapeHtml(content)}</pre>
                </div>
                <div class="token-view" style="display: none;">
                    ${tokenView}
                </div>
            </div>
        `;
    },

    getAnalyzerStyles() {
        return `
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #1a1a1a;
                color: #e0e0e0;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .header {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            h1 {
                margin: 0 0 15px 0;
                color: #4a9eff;
            }
            .summary {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            .summary-item {
                color: #999;
            }
            .token-bar-container {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .token-bar {
                display: flex;
                height: 40px;
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid #666;
            }
            .memory-tokens { background: #d9534f; }
            .wi-tokens { background: #5cb85c; }
            .story-tokens { background: #5bc0de; }
            .anote-tokens { background: #f0ad4e; }
            .free-tokens { background: #333; }
            .view-controls {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .view-controls label {
                margin-right: 20px;
                cursor: pointer;
            }
            .section {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .section h2 {
                margin-top: 0;
            }
            pre {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 15px;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
            }
            .token-item {
                display: inline;
                padding: 2px 4px;
                margin: 1px;
                border-radius: 3px;
                font-size: 12px;
                font-family: monospace;
                cursor: help;
            }
            .token-ids {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
                font-family: monospace;
                font-size: 11px;
                color: #666;
                word-break: break-all;
            }
        `;
    },

    getAnalyzerScript() {
        return `
            function toggleView() {
                const mode = document.querySelector('input[name="viewMode"]:checked').value;
                const formattedViews = document.querySelectorAll('.formatted-view');
                const tokenViews = document.querySelectorAll('.token-view');
                
                if (mode === 'formatted') {
                    formattedViews.forEach(el => el.style.display = 'block');
                    tokenViews.forEach(el => el.style.display = 'none');
                } else {
                    formattedViews.forEach(el => el.style.display = 'none');
                    tokenViews.forEach(el => el.style.display = 'block');
                }
            }
            
            function toggleIds() {
                const showIds = document.getElementById('showIds').checked;
                const idElements = document.querySelectorAll('.token-ids');
                idElements.forEach(el => el.style.display = showIds ? 'block' : 'none');
            }
        `;
    },

    tokenizeText(text) {
        // Simple tokenizer that approximates GPT tokenization
        if (!text) return [];
        
        const tokens = [];
        let i = 0;
        
        while (i < text.length) {
            // Try to match common patterns
            if (text.substring(i).match(/^\s+/)) {
                // Whitespace
                const match = text.substring(i).match(/^\s+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^[A-Z][a-z]+/)) {
                // Capitalized word
                const match = text.substring(i).match(/^[A-Z][a-z]+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^[a-z]+/)) {
                // Lowercase word
                const match = text.substring(i).match(/^[a-z]+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^\d+/)) {
                // Numbers
                const match = text.substring(i).match(/^\d+/)[0];
                tokens.push(match);
                i += match.length;
            } else {
                // Single character
                tokens.push(text[i]);
                i++;
            }
        }
        
        return tokens;
    },

    createTokenVisualization(tokens) {
        // Blue theme colors based on your app's color scheme
        const colors = [
            '#4a9eff', '#357abd', '#2563a0', '#1a4d84', '#2e6da4',
            '#5bc0de', '#46a7c4', '#3690aa', '#286090', '#1f5276',
            '#3d7fa6', '#4d8fb6', '#5d9fc6', '#6dafd6', '#7dbfe6'
        ];
        
        let html = '<div class="token-visualization">';
        
        // Token IDs (hidden by default)
        const tokenIds = tokens.map((_, i) => 1000 + i); // Simple sequential IDs
        html += `<div class="token-ids" style="display: none;">[${tokenIds.join(', ')}]</div>`;
        
        tokens.forEach((token, index) => {
            const colorIndex = index % colors.length;
            const backgroundColor = colors[colorIndex];
            // Add white text color for better contrast
            html += `<span class="token-item" style="background-color: ${backgroundColor}; color: #ffffff;" title="Token ${index + 1}: '${this.escapeHtml(token)}'">${this.escapeHtml(token)}</span>`;
        });
        
        html += '</div>';
        return html;
    },

    countTokens(text) {
        if (!text) return 0;
        
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(text);
                return Array.isArray(tokens) ? tokens.length : 0;
            } catch (e) {
                return Math.ceil(text.length / 4);
            }
        }
        return Math.ceil(text.length / 4);
    },

    // ==================== SMART MEMORY WRITER ====================
    generateMemory() {
        console.log('🧠 Generating memory...');
        
        const contextSize = document.getElementById('klite-rpmod-memory-context')?.value || 'recent';
        const outputType = document.getElementById('klite-rpmod-memory-type')?.value || 'summary';
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        
        if (!outputArea) return;
        
        // Clear output and show generating message
        outputArea.value = 'Generating memory... Please wait.';
        outputArea.style.borderColor = '#f0ad4e';
        
        // Get the context based on selection
        let contextText = '';
        let messageCount = 0;
        
        if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
            const messages = gametext_arr.filter(msg => msg && msg.trim());
            
            const contextMap = {
                'entire': messages.length,
                'last50': 50,
                'recent': 10,
                'last3': 3,
                'last1': 1
            };
            
            const numMessages = contextMap[contextSize] || 10;
            const selectedMessages = contextSize === 'entire' ? messages : messages.slice(-numMessages);
            contextText = selectedMessages.join('\n\n');
            messageCount = selectedMessages.length;
        }
        
        if (!contextText) {
            outputArea.value = 'No story content to analyze.';
            outputArea.style.borderColor = '#d9534f';
            return;
        }
        
        // Build the prompt based on output type
        const prompts = {
            'summary': `Please analyze the story above and create a concise memory summary. Include key characters, events, and important details. Write in past tense, third person. Maximum 150 words.`,
            'keywords': `Extract the most important keywords, names, places, and concepts from the story above. List them as comma-separated values.`,
            'outline': `Create a bullet-point outline of the main events and key information from the story above.`
        };
        
        const instruction = prompts[outputType] || prompts['summary'];
        
        // Save current state
        const originalLength = gametext_arr.length;
        const originalInput = document.getElementById('input_text')?.value || '';
        
        // Add instruction temporarily
        gametext_arr.push(`\n\n[System Instruction: ${instruction}]\n`);
        render_gametext();
        
        // Set up a one-time observer to catch the response
        const gametext = document.getElementById('gametext');
        if (gametext) {
            const observer = new MutationObserver((mutations) => {
                // Get the latest addition to the story
                const currentLength = gametext_arr.length;
                if (currentLength > originalLength + 1) {
                    // We have a response!
                    const response = gametext_arr[currentLength - 1];
                    
                    // Clean up - remove instruction and response from story
                    gametext_arr.length = originalLength;
                    render_gametext();
                    
                    // Display the generated memory
                    outputArea.value = response.trim();
                    outputArea.style.borderColor = '#5cb85c';
                    
                    // Restore input
                    const inputField = document.getElementById('input_text');
                    if (inputField) inputField.value = originalInput;
                    
                    // Disconnect observer
                    observer.disconnect();
                }
            });
            
            observer.observe(gametext, { childList: true, subtree: true });
            
            // Submit empty generation to trigger AI response
            const inputField = document.getElementById('input_text');
            if (inputField && typeof submit_generation_button === 'function') {
                inputField.value = '';
                submit_generation_button();
                
                // Timeout fallback
                setTimeout(() => {
                    observer.disconnect();
                    if (outputArea.value === 'Generating memory... Please wait.') {
                        outputArea.value = 'Generation timed out. Please try again.';
                        outputArea.style.borderColor = '#d9534f';
                        gametext_arr.length = originalLength;
                        render_gametext();
                    }
                }, 1200000); // 120 second timeout
            }
        }
    },

    generateMemoryByStyle(content, style) {
        // Extract key information
        const analysis = this.analyzeContent(content);
        
        switch (style) {
            case 'summary':
                return this.generateSummaryMemory(analysis);
            case 'bullets':
                return this.generateBulletMemory(analysis);
            case 'narrative':
                return this.generateNarrativeMemory(analysis);
            case 'keywords':
                return this.generateKeywordMemory(analysis);
            default:
                return this.generateSummaryMemory(analysis);
        }
    },

    analyzeContent(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const words = content.split(/\s+/);
        
        // Extract character names (capitalized words that appear multiple times)
        const nameFrequency = {};
        words.forEach(word => {
            const cleaned = word.replace(/[^a-zA-Z]/g, '');
            if (cleaned && cleaned[0] === cleaned[0].toUpperCase() && cleaned.length > 2) {
                nameFrequency[cleaned] = (nameFrequency[cleaned] || 0) + 1;
            }
        });
        
        const characters = Object.entries(nameFrequency)
            .filter(([name, count]) => count > 2 && !this.isCommonWord(name))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
        
        // Extract locations (words after "in", "at", "to", etc.)
        const locations = this.extractLocations(sentences);
        
        // Extract key events (sentences with action verbs)
        const events = this.extractKeyEvents(sentences);
        
        // Extract relationships
        const relationships = this.extractRelationships(sentences, characters);
        
        return {
            characters,
            locations,
            events,
            relationships,
            sentences
        };
    },

    isCommonWord(word) {
        const common = ['The', 'This', 'That', 'What', 'When', 'Where', 'Who', 'Why', 'How'];
        return common.includes(word);
    },

    extractLocations(sentences) {
        const locations = new Set();
        const locationPreps = ['in', 'at', 'to', 'from', 'near', 'by', 'inside', 'outside'];
        
        sentences.forEach(sentence => {
            const words = sentence.split(/\s+/);
            words.forEach((word, i) => {
                if (locationPreps.includes(word.toLowerCase()) && i + 1 < words.length) {
                    const nextWord = words[i + 1].replace(/[^a-zA-Z]/g, '');
                    if (nextWord && nextWord[0] === nextWord[0].toUpperCase()) {
                        locations.add(nextWord);
                    }
                }
            });
        });
        
        return Array.from(locations).slice(0, 3);
    },

    extractKeyEvents(sentences) {
        const actionVerbs = ['fought', 'discovered', 'found', 'killed', 'saved', 'betrayed', 'revealed', 'attacked', 'defended', 'escaped', 'arrived', 'departed'];
        const events = [];
        
        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();
            if (actionVerbs.some(verb => lower.includes(verb))) {
                events.push(sentence.trim());
            }
        });
        
        return events.slice(0, 5);
    },

    extractRelationships(sentences, characters) {
        const relationships = [];
        const relWords = ['loves', 'hates', 'knows', 'works with', 'fights', 'helps', 'betrays', 'trusts'];
        
        sentences.forEach(sentence => {
            characters.forEach(char1 => {
                characters.forEach(char2 => {
                    if (char1 !== char2 && sentence.includes(char1) && sentence.includes(char2)) {
                        relWords.forEach(rel => {
                            if (sentence.toLowerCase().includes(rel)) {
                                relationships.push(`${char1} ${rel} ${char2}`);
                            }
                        });
                    }
                });
            });
        });
        
        return relationships.slice(0, 3);
    },

    generateSummaryMemory(analysis) {
        let memory = '';
        
        if (analysis.characters.length > 0) {
            memory += `Characters: ${analysis.characters.join(', ')}. `;
        }
        
        if (analysis.locations.length > 0) {
            memory += `Locations: ${analysis.locations.join(', ')}. `;
        }
        
        if (analysis.events.length > 0) {
            memory += `\n\nKey events: `;
            memory += analysis.events.slice(0, 3).join(' ');
        }
        
        if (analysis.relationships.length > 0) {
            memory += `\n\nRelationships: ${analysis.relationships.join('. ')}.`;
        }
        
        return memory || 'No significant information extracted.';
    },

    generateBulletMemory(analysis) {
        let memory = '';
        
        if (analysis.characters.length > 0) {
            memory += 'Characters:\n';
            analysis.characters.forEach(char => {
                memory += `• ${char}\n`;
            });
        }
        
        if (analysis.locations.length > 0) {
            memory += '\nLocations:\n';
            analysis.locations.forEach(loc => {
                memory += `• ${loc}\n`;
            });
        }
        
        if (analysis.events.length > 0) {
            memory += '\nKey Events:\n';
            analysis.events.slice(0, 3).forEach(event => {
                memory += `• ${event}\n`;
            });
        }
        
        return memory || 'No significant information extracted.';
    },

    generateNarrativeMemory(analysis) {
        let memory = 'The story involves ';
        
        if (analysis.characters.length > 0) {
            memory += analysis.characters.slice(0, 3).join(', ');
            if (analysis.locations.length > 0) {
                memory += ` in ${analysis.locations[0]}`;
            }
            memory += '. ';
        }
        
        if (analysis.events.length > 0) {
            memory += analysis.events[0] + ' ';
        }
        
        if (analysis.relationships.length > 0) {
            memory += `\n\n${analysis.relationships[0]}.`;
        }
        
        return memory;
    },

    generateKeywordMemory(analysis) {
        const keywords = [];
        
        // Add characters
        keywords.push(...analysis.characters.map(c => `[${c}]`));
        
        // Add locations
        keywords.push(...analysis.locations.map(l => `@${l}`));
        
        // Extract important words from events
        analysis.events.slice(0, 3).forEach(event => {
            const words = event.split(/\s+/);
            words.forEach(word => {
                const cleaned = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
                if (cleaned.length > 5 && !this.isCommonWord(cleaned)) {
                    keywords.push(`#${cleaned}`);
                }
            });
        });
        
        return keywords.slice(0, 15).join(' ');
    },

    applyMemory(append) {
        console.log(`💾 ${append ? 'Appending' : 'Applying'} memory...`);
        
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        const memory = outputArea?.value;
        
        if (!memory || !memory.trim()) {
            alert('No memory to apply. Please generate memory first.');
            return;
        }
        
        // Get current memory
        const liteMemory = document.getElementById('memorytext');
        let currentMemory = '';
        
        if (liteMemory) {
            currentMemory = liteMemory.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            currentMemory = localsettings.memory;
        }
        
        // Show confirmation dialog for non-append actions
        if (!append && currentMemory && currentMemory.trim()) {
            const confirmMessage = `⚠️ WARNING: This will <span style="color: #ff4444; font-weight: bold;">DELETE</span> your current memory contents and replace them with the generated memory.\n\nCurrent memory length: ${currentMemory.length} characters\nNew memory length: ${memory.length} characters\n\nAre you sure you want to continue?`;
            
            // Create custom confirmation dialog
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: #2a2a2a;
                    border: 2px solid #ff4444;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 500px;
                    box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
                ">
                    <h3 style="
                        color: #ff4444;
                        margin: 0 0 20px 0;
                        font-size: 20px;
                        text-align: center;
                    ">⚠️ Replace Memory Warning</h3>
                    
                    <p style="
                        color: #e0e0e0;
                        line-height: 1.6;
                        margin-bottom: 10px;
                    ">
                        This will <span style="color: #ff4444; font-weight: bold; font-size: 18px;">DELETE</span> your current memory contents and replace them with the generated memory.
                    </p>
                    
                    <div style="
                        background: #1a1a1a;
                        border: 1px solid #444;
                        border-radius: 4px;
                        padding: 15px;
                        margin: 20px 0;
                        font-family: monospace;
                        font-size: 12px;
                    ">
                        <div style="color: #999; margin-bottom: 5px;">Current memory: <span style="color: #ff6666;">${currentMemory.length} characters</span></div>
                        <div style="color: #999;">New memory: <span style="color: #66ff66;">${memory.length} characters</span></div>
                    </div>
                    
                    <p style="
                        color: #ffa500;
                        font-size: 14px;
                        text-align: center;
                        margin: 20px 0;
                    ">
                        Are you sure you want to continue?
                    </p>
                    
                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 25px;
                    ">
                        <button id="klite-cancel-replace" style="
                            flex: 1;
                            padding: 12px;
                            background: #555;
                            border: 1px solid #666;
                            border-radius: 4px;
                            color: white;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#666'" 
                        onmouseout="this.style.backgroundColor='#555'">
                            Cancel
                        </button>
                        <button id="klite-confirm-replace" style="
                            flex: 1;
                            padding: 12px;
                            background: #d9534f;
                            border: 1px solid #c9302c;
                            border-radius: 4px;
                            color: white;
                            font-size: 14px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#c9302c'" 
                        onmouseout="this.style.backgroundColor='#d9534f'">
                            Replace Memory
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle button clicks
            document.getElementById('klite-cancel-replace').onclick = () => {
                document.body.removeChild(modal);
            };
            
            document.getElementById('klite-confirm-replace').onclick = () => {
                document.body.removeChild(modal);
                this.performMemoryApplication(memory, append);
            };
            
            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };
        } else {
            // No confirmation needed for append or empty memory
            this.performMemoryApplication(memory, append);
        }
    },

    performMemoryApplication(memory, append) {
        // Get current memory
        const liteMemory = document.getElementById('memorytext');
        let currentMemory = '';
        
        if (liteMemory) {
            currentMemory = liteMemory.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            currentMemory = localsettings.memory;
        }
        
        // Apply or append
        const newMemory = append ? `${currentMemory}\n\n${memory}`.trim() : memory;
        
        // Update Lite's memory field
        if (liteMemory) {
            liteMemory.value = newMemory;
            const event = new Event('input', { bubbles: true });
            liteMemory.dispatchEvent(event);
        }
        
        // Update localsettings
        if (typeof localsettings !== 'undefined') {
            localsettings.memory = newMemory;
        }
        
        // Call confirm_memory if available
        if (typeof confirm_memory === 'function') {
            confirm_memory();
        }
        
        // Visual feedback
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        if (outputArea) {
            outputArea.style.borderColor = '#5cb85c';
            setTimeout(() => {
                outputArea.style.borderColor = '#444';
            }, 1000);
        }
        
        alert(`Memory ${append ? 'appended' : 'applied'} successfully!`);
    },

    // ==================== DICE SYSTEM ====================
    initializeDiceSystem() {
        // Quick dice buttons
        document.querySelectorAll('.klite-rpmod-dice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dice = e.target.dataset.dice;
                this.rollDice(dice);
            });
            
            // Add hover effect
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#444';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#333';
            });
        });
        
        // Custom dice roll
        document.getElementById('klite-rpmod-roll-custom')?.addEventListener('click', () => {
            const input = document.getElementById('klite-rpmod-custom-dice');
            if (input?.value) {
                this.rollDice(input.value);
            }
        });
        
        // Allow Enter key for custom dice
        document.getElementById('klite-rpmod-custom-dice')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.rollDice(e.target.value);
            }
        });
    },

    rollDice(diceString) {
        console.log(`🎲 Rolling ${diceString}`);
        
        const resultDiv = document.getElementById('klite-rpmod-dice-result');
        const totalDiv = document.getElementById('klite-rpmod-dice-total');
        const breakdownDiv = document.getElementById('klite-rpmod-dice-breakdown');
        const animationDiv = document.getElementById('klite-rpmod-dice-animation');
        
        if (!resultDiv) return;
        
        try {
            const result = this.parseDiceRoll(diceString);
            
            // Show result container
            resultDiv.style.display = 'block';
            
            // Animate the roll
            this.animateDiceRoll(result, totalDiv, breakdownDiv, animationDiv);
            
            // Store last roll
            this.lastRoll = result;
            
            const addToChat = document.getElementById('klite-rpmod-dice-to-chat')?.checked;
            if (addToChat && typeof localsettings !== 'undefined') {
                console.log('🎲 Adding dice roll to chat for mode:', localsettings.opmode);
                setTimeout(() => this.addDiceRollToChat(result), 1000);
            }
            
        } catch (error) {
            resultDiv.style.display = 'block';
            totalDiv.textContent = 'Error';
            breakdownDiv.textContent = error.message;
            totalDiv.style.color = '#d9534f';
        }
    },

    animateDiceRoll(result, totalDiv, breakdownDiv, animationDiv) {
        // Clear animation
        animationDiv.innerHTML = '';
        
        // Create dice visuals
        result.rolls.forEach((roll, index) => {
            const die = document.createElement('span');
            die.style.cssText = `
                display: inline-block;
                width: 30px;
                height: 30px;
                line-height: 30px;
                background: #333;
                border: 1px solid #666;
                border-radius: 4px;
                margin: 0 3px;
                text-align: center;
                font-weight: bold;
                color: #4a9eff;
                animation: rollDice 0.5s ease-out ${index * 0.1}s;
            `;
            die.textContent = '?';
            animationDiv.appendChild(die);
            
            // Reveal result after animation
            setTimeout(() => {
                die.textContent = roll;
                if (roll === parseInt(result.formula.match(/d(\d+)/)[1])) {
                    // Critical roll!
                    die.style.background = '#5cb85c';
                    die.style.color = '#fff';
                } else if (roll === 1) {
                    // Critical fail!
                    die.style.background = '#d9534f';
                    die.style.color = '#fff';
                }
            }, 500 + (index * 100));
        });
        
        // Show total after all dice are revealed
        setTimeout(() => {
            totalDiv.textContent = result.total;
            breakdownDiv.textContent = `${result.formula} = ${result.breakdown}`;
            totalDiv.style.color = '#4a9eff';
        }, 500 + (result.rolls.length * 100));
        
        // Add CSS animation
        if (!document.getElementById('dice-animation-style')) {
            const style = document.createElement('style');
            style.id = 'dice-animation-style';
            style.textContent = `
                @keyframes rollDice {
                    0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    },

    parseDiceRoll(diceString) {
        // Extended dice notation: XdY+Z, XdY-Z, XdY*Z, etc.
        const match = diceString.match(/^(\d*)d(\d+)(([+-])(\d+))?$/i);
        
        if (!match) {
            throw new Error('Use format like "2d6+3" or "d20"');
        }
        
        const count = parseInt(match[1] || '1');
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[4] + match[5]) : 0;
        
        if (count > 100) throw new Error('Too many dice (max 100)');
        if (sides > 1000) throw new Error('Too many sides (max 1000)');
        if (count < 1) throw new Error('Need at least 1 die');
        if (sides < 2) throw new Error('Need at least 2 sides');
        
        // Roll the dice
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;
        
        // Build breakdown string
        let breakdown = rolls.join(' + ');
        if (modifier !== 0) {
            breakdown += ` ${modifier >= 0 ? '+' : ''} ${modifier}`;
        }
        
        return {
            formula: diceString,
            rolls: rolls,
            modifier: modifier,
            sum: sum,
            total: total,
            breakdown: breakdown
        };
    },

    addDiceRollToChat(result) {
        console.log('🎲 Adding dice roll to chat...');
        
        // Format dice roll with HTML for better visibility
        const diceMessage = `<div style="
            background: #2d4a7b;
            border: 2px solid #4a9eff;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            color: #ffffff;
        ">
            🎲 <span style="color: #4a9eff;">Dice Roll: ${result.formula}</span><br>
            <span style="font-size: 24px; color: #ffd700;">Result: ${result.total}</span><br>
            <span style="font-size: 14px; color: #ccc;">(${result.breakdown})</span>
        </div>`;
        
        // For instruct mode (opmode 4), we need to add it differently
        const opmode = (typeof localsettings !== 'undefined' && localsettings.opmode) || 3;
        
        if (opmode === 4) {
            // For instruct mode, add as HTML directly
            const gametext = document.getElementById('gametext');
            if (gametext) {
                gametext.innerHTML += diceMessage;
                
                // Scroll to bottom
                gametext.scrollTop = gametext.scrollHeight;
                
                // Also update the array
                if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
                    gametext_arr.push(`\n🎲 Dice Roll: ${result.formula} - Result: ${result.total} (${result.breakdown})\n`);
                }
            }
        } else {
            // For other modes, add to gametext_arr
            if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
                gametext_arr.push(`\n\n🎲 **Dice Roll: ${result.formula}** - Result: **${result.total}** (${result.breakdown})\n\n`);
                
                if (typeof render_gametext === 'function') {
                    render_gametext();
                }
            }
        }
        
        // Force scroll on both displays
        setTimeout(() => {
            const gametext = document.getElementById('gametext');
            const chatDisplay = document.getElementById('klite-rpmod-chat-display');
            
            if (gametext) {
                gametext.scrollTop = gametext.scrollHeight;
            }
            
            if (chatDisplay) {
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
            }
        }, 100);
    },

    // ==================== AUTO-REGENERATE ====================
    initializeAutoRegenerate() {
        const toggle = document.getElementById('klite-rpmod-auto-regen-toggle');
        const delayInput = document.getElementById('klite-rpmod-auto-regen-delay');
        const maxInput = document.getElementById('klite-rpmod-auto-regen-max');
        const status = document.getElementById('klite-rpmod-auto-regen-status');
        
        // State tracking
        this.autoRegenerateState = {
            enabled: false,
            retryCount: 0,
            maxRetries: 3,
            lastMessageHash: '',
            keywords: [],
            keywordThreshold: 3,
            keywordCaseSensitive: false
        };
        
        toggle?.addEventListener('change', (e) => {
            this.autoRegenerateState.enabled = e.target.checked;
            
            if (this.autoRegenerateState.enabled) {
                this.startAutoRegenerate();
                status.textContent = '✓ Auto-regenerate is active';
                status.style.color = '#5cb85c';
            } else {
                this.stopAutoRegenerate();
                status.textContent = 'Auto-regenerate is disabled';
                status.style.color = '#666';
            }
        });
        
        delayInput?.addEventListener('change', () => {
            if (this.autoRegenerateState.enabled) {
                this.stopAutoRegenerate();
                this.startAutoRegenerate();
            }
        });
        
        maxInput?.addEventListener('change', (e) => {
            this.autoRegenerateState.maxRetries = parseInt(e.target.value);
        });

        // Keyword input handler
        const keywordTextarea = document.getElementById('klite-rpmod-regen-keywords');
        keywordTextarea?.addEventListener('input', (e) => {
            const keywords = e.target.value
                .split('\n')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            this.autoRegenerateState.keywords = keywords;
            
            console.log(`🔄 Updated keywords: ${keywords.length} keywords set`);
        });

        // Threshold handler
        const thresholdInput = document.getElementById('klite-rpmod-keyword-threshold');
        thresholdInput?.addEventListener('change', (e) => {
            this.autoRegenerateState.keywordThreshold = parseInt(e.target.value) || 1;
        });

        // Case sensitivity handler
        const caseCheckbox = document.getElementById('klite-rpmod-keyword-case');
        caseCheckbox?.addEventListener('change', (e) => {
            this.autoRegenerateState.keywordCaseSensitive = e.target.checked;
        });
    },

    startAutoRegenerate() {
        const delayInput = document.getElementById('klite-rpmod-auto-regen-delay');
        const delay = parseInt(delayInput?.value || '3000');
        
        console.log(`🔄 Starting auto-regenerate with ${delay}ms delay`);
        
        // Clear any existing interval
        this.stopAutoRegenerate();
        
        // Reset retry count
        this.autoRegenerateState.retryCount = 0;
        
        this.autoRegenerateInterval = setInterval(() => {
            this.checkAndRegenerate();
        }, delay);
    },

    stopAutoRegenerate() {
        if (this.autoRegenerateInterval) {
            clearInterval(this.autoRegenerateInterval);
            this.autoRegenerateInterval = null;
        }
    },

    checkAndRegenerate() {
        // Check if we should regenerate
        if (!this.shouldRegenerate()) {
            return;
        }
        
        // Check retry limit
        if (this.autoRegenerateState.retryCount >= this.autoRegenerateState.maxRetries) {
            console.log('🔄 Max retries reached, stopping auto-regenerate');
            this.stopAutoRegenerate();
            
            const status = document.getElementById('klite-rpmod-auto-regen-status');
            if (status) {
                status.textContent = '⚠️ Max retries reached';
                status.style.color = '#f0ad4e';
            }
            return;
        }
        
        console.log(`🔄 Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);
        
        // Increment retry count
        this.autoRegenerateState.retryCount++;
        
        // Update status
        const status = document.getElementById('klite-rpmod-auto-regen-status');
        if (status) {
            status.textContent = `🔄 Regenerating... (${this.autoRegenerateState.retryCount}/${this.autoRegenerateState.maxRetries})`;
            status.style.color = '#5bc0de';
        }
        
        // Call Lite's retry function
        if (typeof btn_retry === 'function') {
            btn_retry();
        }
    },

    shouldRegenerate() {
        // Check if not currently generating
        const isGenerating = document.getElementById('input_text')?.disabled === true;
        if (isGenerating) return false;
        
        // Get the last message
        const messages = document.querySelectorAll('.message');
        if (!messages.length) return false;
        
        const lastMessage = messages[messages.length - 1];
        const messageText = lastMessage?.textContent || '';
        
        // Check if it's a new message
        const messageHash = this.hashString(messageText);
        if (messageHash === this.autoRegenerateState.lastMessageHash) {
            return false;
        }
        this.autoRegenerateState.lastMessageHash = messageHash;
        
        // Check if it's an AI message
        const isAIMessage = lastMessage?.classList.contains('ai');
        if (!isAIMessage) return false;
        
        // Check trigger conditions
        const shortCheck = document.getElementById('klite-rpmod-regen-short')?.checked;
        const incompleteCheck = document.getElementById('klite-rpmod-regen-incomplete')?.checked;
        const errorCheck = document.getElementById('klite-rpmod-regen-error')?.checked;
        
        // Check short messages
        if (shortCheck && messageText.length < 50) {
            console.log('🔄 Triggering regenerate: Short message');
            return true;
        }
        
        // Check incomplete sentences
        if (incompleteCheck) {
            const lastChar = messageText.trim().slice(-1);
            if (!['.', '!', '?', '"', '\'', '"'].includes(lastChar)) {
                console.log('🔄 Triggering regenerate: Incomplete sentence');
                return true;
            }
        }
        
        // Check error responses
        if (errorCheck && (messageText.includes('Error:') || messageText.includes('error'))) {
            console.log('🔄 Triggering regenerate: Error detected');
            return true;
        }
        
        // NEW: Check keyword triggers
        if (this.autoRegenerateState.keywords.length > 0) {
            const keywordMatches = this.checkKeywordTriggers(messageText);
            if (keywordMatches >= this.autoRegenerateState.keywordThreshold) {
                console.log(`🔄 Triggering regenerate: ${keywordMatches} keywords matched (threshold: ${this.autoRegenerateState.keywordThreshold})`);
                return true;
            }
        }
        
        return false;
    },

    checkKeywordTriggers(text) {
        const keywords = this.autoRegenerateState.keywords;
        const caseSensitive = this.autoRegenerateState.keywordCaseSensitive;
        
        let matchCount = 0;
        const checkText = caseSensitive ? text : text.toLowerCase();
        
        for (const keyword of keywords) {
            const checkKeyword = caseSensitive ? keyword : keyword.toLowerCase();
            if (checkText.includes(checkKeyword)) {
                matchCount++;
            }
        }
        
        return matchCount;
    },

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    },

    // ==================== EXPORT TOOLS ====================
    initializeExportTools() {
        document.getElementById('klite-rpmod-export-markdown')?.addEventListener('click', () => {
            this.exportAs('markdown');
        });

        document.getElementById('klite-rpmod-export-json')?.addEventListener('click', () => {
            this.exportAs('json');
        });

        document.getElementById('klite-rpmod-export-html')?.addEventListener('click', () => {
            this.exportAs('html');
        });

        document.getElementById('klite-rpmod-export-epub')?.addEventListener('click', () => {
            this.exportAs('epub');
        });
    },

    exportAs(format) {
        console.log(`📄 Exporting as ${format}...`);
        
        if (typeof gametext_arr === 'undefined' || !Array.isArray(gametext_arr)) {
            alert('No story content to export.');
            return;
        }
        
        // Get export options
        const includeMetadata = document.getElementById('klite-rpmod-export-metadata')?.checked;
        const includeWorldInfo = document.getElementById('klite-rpmod-export-worldinfo')?.checked;
        const formatDialogue = document.getElementById('klite-rpmod-export-format')?.checked;
        
        const exportData = this.gatherExportData(includeMetadata, includeWorldInfo);
        
        switch (format) {
            case 'markdown':
                this.exportAsMarkdown(exportData, formatDialogue);
                break;
            case 'json':
                this.exportAsJSON(exportData);
                break;
            case 'html':
                this.exportAsHTML(exportData, formatDialogue);
                break;
            case 'epub':
                this.exportAsEPUB(exportData, formatDialogue);
                break;
        }
    },

    gatherExportData(includeMetadata, includeWorldInfo) {
        const data = {
            metadata: {},
            settings: {},
            worldinfo: [],
            messages: [],
            timestamp: new Date().toISOString()
        };
        
        // Messages
        data.messages = gametext_arr.filter(msg => msg && msg.trim());
        
        if (includeMetadata && typeof localsettings !== 'undefined') {
            data.metadata = {
                title: localsettings.chatname || 'Untitled Story',
                model: localsettings.modelname || 'Unknown',
                mode: this.getModeName(localsettings.opmode),
                created: data.timestamp,
                messageCount: data.messages.length,
                wordCount: data.messages.join(' ').split(/\s+/).length,
                characterCount: data.messages.join('').length
            };
            
            data.settings = {
                memory: localsettings.memory || '',
                authornote: localsettings.anotetext || '',
                temperature: localsettings.temperature || 1,
                rep_pen: localsettings.rep_pen || 1,
                max_length: localsettings.max_length || 80,
                max_context: localsettings.max_context_length || 8192
            };
        }
        
        if (includeWorldInfo && typeof current_wi !== 'undefined' && Array.isArray(current_wi)) {
            data.worldinfo = current_wi.filter(wi => wi.key || wi.content).map(wi => ({
                key: wi.key || '',
                content: wi.content || '',
                comment: wi.comment || '',
                probability: wi.probability || 100,
                selective: wi.selective || false,
                constant: wi.constant || false
            }));
        }
        
        return data;
    },

    getModeName(mode) {
        switch (mode) {
            case 1: return 'Story Mode';
            case 2: return 'Adventure Mode';
            case 3: return 'Chat Mode';
            case 4: return 'Instruct Mode';
            default: return 'Unknown Mode';
        }
    },

    exportAsMarkdown(data, formatDialogue) {
        let markdown = '';
        
        // Title and metadata
        if (data.metadata.title) {
            markdown += `# ${data.metadata.title}\n\n`;
        }
        
        if (data.metadata) {
            markdown += '## Metadata\n\n';
            markdown += `- **Created:** ${new Date(data.metadata.created).toLocaleString()}\n`;
            markdown += `- **Model:** ${data.metadata.model}\n`;
            markdown += `- **Mode:** ${data.metadata.mode}\n`;
            markdown += `- **Word Count:** ${data.metadata.wordCount.toLocaleString()}\n`;
            markdown += `- **Messages:** ${data.metadata.messageCount}\n\n`;
        }
        
        if (data.settings.memory) {
            markdown += '## Memory\n\n';
            markdown += `> ${data.settings.memory.replace(/\n/g, '\n> ')}\n\n`;
        }
        
        if (data.worldinfo.length > 0) {
            markdown += '## World Info\n\n';
            data.worldinfo.forEach(wi => {
                markdown += `### ${wi.key}\n\n`;
                markdown += `${wi.content}\n\n`;
            });
        }
        
        // Story content
        markdown += '## Story\n\n';
        
        if (formatDialogue) {
            data.messages.forEach((msg, index) => {
                const speaker = index % 2 === 0 ? '**You**' : '**AI**';
                markdown += `${speaker}: ${msg}\n\n`;
            });
        } else {
            data.messages.forEach(msg => {
                markdown += `${msg}\n\n`;
            });
        }
        
        // Download
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.md`;
        this.downloadFile(filename, markdown, 'text/markdown');
    },

    exportAsJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.json`;
        this.downloadFile(filename, json, 'application/json');
    },

    exportAsHTML(data, formatDialogue) {
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.metadata.title || 'Story Export'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        .metadata {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .memory {
            background: #e8f4f8;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin-bottom: 30px;
        }
        .worldinfo {
            background: #f0f8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
        }
        .user {
            background: #f0f0f0;
            border-left: 4px solid #666;
        }
        .ai {
            background: #e8f4ff;
            border-left: 4px solid #3498db;
        }
        .speaker {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <h1>${data.metadata.title || 'Story Export'}</h1>
`;
        
        if (data.metadata) {
            html += `<div class="metadata">
                <h2>Story Information</h2>
                <p><strong>Created:</strong> ${new Date(data.metadata.created).toLocaleString()}</p>
                <p><strong>Model:</strong> ${data.metadata.model}</p>
                <p><strong>Mode:</strong> ${data.metadata.mode}</p>
                <p><strong>Word Count:</strong> ${data.metadata.wordCount.toLocaleString()}</p>
                <p><strong>Messages:</strong> ${data.metadata.messageCount}</p>
            </div>`;
        }
        
        if (data.settings.memory) {
            html += `<div class="memory">
                <h2>Memory</h2>
                <p>${this.escapeHtml(data.settings.memory).replace(/\n/g, '<br>')}</p>
            </div>`;
        }
        
        if (data.worldinfo.length > 0) {
            html += '<h2>World Info</h2>';
            data.worldinfo.forEach(wi => {
                html += `<div class="worldinfo">
                    <h3>${this.escapeHtml(wi.key)}</h3>
                    <p>${this.escapeHtml(wi.content).replace(/\n/g, '<br>')}</p>
                </div>`;
            });
        }
        
        html += '<h2>Story</h2>';
        
        if (formatDialogue) {
            data.messages.forEach((msg, index) => {
                const isUser = index % 2 === 0;
                html += `<div class="message ${isUser ? 'user' : 'ai'}">
                    <div class="speaker">${isUser ? 'You' : 'AI'}</div>
                    <div>${this.escapeHtml(msg).replace(/\n/g, '<br>')}</div>
                </div>`;
            });
        } else {
            html += '<div class="story-content">';
            data.messages.forEach(msg => {
                html += `<p>${this.escapeHtml(msg).replace(/\n/g, '<br>')}</p>`;
            });
            html += '</div>';
        }
        
        html += '</body></html>';
        
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.html`;
        this.downloadFile(filename, html, 'text/html');
    },

    exportAsEPUB(data, formatDialogue) {
        // EPUB is more complex, so we'll create a simplified version
        alert('EPUB export is a preview feature. The file will be a simplified EPUB-like HTML that can be converted using tools like Calibre.');
        
        // Create EPUB-like structure
        const chapters = this.splitIntoChapters(data.messages, 50); // 50 messages per chapter
        
        let epub = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${data.metadata.title || 'Story'}</title>
    <meta charset="UTF-8"/>
    <style>
        body { font-family: serif; line-height: 1.6; }
        h1 { text-align: center; page-break-before: always; }
        h2 { text-align: center; }
        p { text-indent: 1.5em; margin: 0 0 0.5em 0; }
        .dialogue { text-indent: 0; margin: 1em 0; }
        .speaker { font-weight: bold; }
    </style>
</head>
<body>
    <h1>${data.metadata.title || 'Story'}</h1>
    <p style="text-align: center;">By ${data.metadata.model || 'AI'}</p>
    <p style="text-align: center;">${new Date(data.metadata.created).toLocaleDateString()}</p>
`;
        
        chapters.forEach((chapter, index) => {
            epub += `<h2>Chapter ${index + 1}</h2>`;
            
            if (formatDialogue) {
                chapter.forEach((msg, msgIndex) => {
                    const isUser = msgIndex % 2 === 0;
                    epub += `<p class="dialogue"><span class="speaker">${isUser ? 'You' : 'AI'}:</span> ${this.escapeHtml(msg)}</p>`;
                });
            } else {
                chapter.forEach(msg => {
                    epub += `<p>${this.escapeHtml(msg)}</p>`;
                });
            }
        });
        
        epub += '</body></html>';
        
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.xhtml`;
        this.downloadFile(filename, epub, 'application/xhtml+xml');
    },

    splitIntoChapters(messages, messagesPerChapter) {
        const chapters = [];
        for (let i = 0; i < messages.length; i += messagesPerChapter) {
            chapters.push(messages.slice(i, i + messagesPerChapter));
        }
        return chapters;
    },

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ==================== UTILITY FUNCTIONS ====================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    cleanup() {
        this.stopContextAutoRefresh();

        // Stop auto-regenerate if active
        this.stopAutoRegenerate();
        
        // Close analysis window if open
        if (this.analysisWindow && !this.analysisWindow.closed) {
            this.analysisWindow.close();
        }
    }
};

console.log('✅ KLITE TOOLS Panel loaded');// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - SCENE Panel Implementation
// Visual scene and atmosphere controls - Updated
// =============================================

window.KLITE_RPMod_Panels.SCENE = {
    // Scene data for auto-generation
    sceneData: {
        locations: {
            // Natural Environments
            'Forest': 'You are in a dense forest',
            'Plains': 'You stand in vast open plains',
            'Desert': 'You are in an arid desert',
            'Mountains': 'You are high in the mountains',
            'Beach': 'You are on a sandy beach',
            'Swamp': 'You are in a murky swamp',
            'Tundra': 'You are in a frozen tundra',
            'Jungle': 'You are deep in a tropical jungle',
            'Cave': 'You are inside a dark cave',
            'River': 'You are by a flowing river',
            'Lake': 'You stand beside a serene lake',
            'Ocean': 'You are near the vast ocean',
            'Valley': 'You are in a peaceful valley',
            'Cliff': 'You stand atop a steep cliff',
            
            // Urban/Rural
            'City': 'You are in a bustling city',
            'Town': 'You are in a modest town',
            'Village': 'You are in a small village',
            'Market': 'You are in a crowded marketplace',
            'Harbor': 'You are at a busy harbor',
            'Farm': 'You are on a rural farm',
            'Ranch': 'You are at a sprawling ranch',
            
            // Buildings/Structures
            'Castle': 'You are inside an ancient castle',
            'Tower': 'You are in a tall tower',
            'Temple': 'You are within a sacred temple',
            'Church': 'You are inside a quiet church',
            'Mansion': 'You are in an opulent mansion',
            'Cottage': 'You are in a cozy cottage',
            'Inn': 'You are inside a warm inn',
            'Tavern': 'You are in a lively tavern',
            'Library': 'You are in a vast library',
            'Museum': 'You are in a grand museum',
            'Prison': 'You are in a grim prison',
            'Hospital': 'You are in a sterile hospital',
            'School': 'You are in an academic institution',
            'Stadium': 'You are in a massive stadium',
            'Arena': 'You are in a combat arena',
            
            // Industrial/Modern
            'Factory': 'You are in an industrial factory',
            'Warehouse': 'You are inside a large warehouse',
            'Laboratory': 'You are in a high-tech laboratory',
            'Oil Rig': 'You are on an offshore oil rig',
            'Space Station': 'You are aboard a space station',
            'Spaceship': 'You are inside a spaceship',
            'Subway': 'You are in an underground subway',
            'Airport': 'You are at a busy airport',
            'Train Station': 'You are at a train station',
            
            // Specific/Named Places
            'Adventurers Guild': 'You are in the Adventurers Guild hall',
            'Thieves Guild': 'You are in the secretive Thieves Guild',
            'Mage Tower': 'You are in the mystical Mage Tower',
            'Royal Palace': 'You are in the grand Royal Palace',
            'Underground Bunker': 'You are in a fortified underground bunker',
            'Ancient Ruins': 'You are exploring ancient ruins',
            'Graveyard': 'You are in a somber graveyard',
            'Pharmacy': 'You are in a well-stocked pharmacy',
            'Police Station': 'You are at the police station',
            'Fire Station': 'You are at the fire station'
        },
        
        times: {
            'early dawn': 'It is early dawn',
            'dawn': 'It is dawn',
            'late dawn': 'It is late dawn',
            'early morning': 'It is early morning',
            'morning': 'It is morning',
            'late morning': 'It is late morning',
            'early noon': 'It is approaching noon',
            'noon': 'It is noon',
            'late noon': 'It is past noon',
            'early afternoon': 'It is early afternoon',
            'afternoon': 'It is afternoon',
            'late afternoon': 'It is late afternoon',
            'early evening': 'It is early evening',
            'evening': 'It is evening',
            'late evening': 'It is late evening',
            'early night': 'It is early night',
            'night': 'It is night',
            'late night': 'It is late night',
            'midnight': 'It is midnight',
            'witching hour': 'It is the witching hour'
        },
        
        weather: {
            'clear': 'The weather is clear',
            'cloudy': 'Clouds cover the sky',
            'overcast': 'The sky is completely overcast',
            'light rain': 'Light rain falls from the sky',
            'rain': 'Rain pours down steadily',
            'heavy rain': 'Heavy rain drenches everything',
            'drizzle': 'A fine drizzle mists the air',
            'storm': 'A fierce storm rages',
            'thunderstorm': 'Thunder and lightning fill the sky',
            'snow': 'Snow falls gently',
            'heavy snow': 'Heavy snow blankets everything',
            'blizzard': 'A blizzard obscures all vision',
            'hail': 'Hail pelts down dangerously',
            'fog': 'Dense fog limits visibility',
            'mist': 'A light mist hangs in the air',
            'windy': 'Strong winds blow through the area',
            'hurricane': 'A hurricane devastates the area',
            'tornado': 'A tornado threatens nearby',
            'extreme heat': 'The heat is oppressive and extreme',
            'extreme cold': 'The cold is bitter and extreme',
            'scorching sun': 'The sun scorches everything it touches',
            'shadowed': '' // No weather sentence when in shadow
        },
        
        moods: {
            'neutral': 'The atmosphere is neutral',
            'tense': 'Tension fills the air',
            'mysterious': 'Everything feels mysterious',
            'cheerful': 'The mood is bright and cheerful',
            'ominous': 'An ominous feeling pervades',
            'peaceful': 'A sense of peace surrounds you',
            'chaotic': 'Chaos reigns all around',
            'romantic': 'Romance is in the air',
            'melancholic': 'A deep melancholy settles over everything',
            'eerie': 'An eerie silence hangs heavy',
            'festive': 'A festive atmosphere prevails',
            'solemn': 'The mood is solemn and serious',
            'hostile': 'Hostility emanates from every corner',
            'magical': 'Magic crackles in the atmosphere'
        }
    },

    load(container, panel) {
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <!-- Scene Setup -->
                <div class="klite-rpmod-control-group">
                    <h3>Quick Scene Setup</h3>
                    ${this.getSceneHTML()}
                    <textarea id="klite-rpmod-scene-description" placeholder="Scene description..." 
                        style="width: 100%; min-height: 100px; margin-top: 8px; background: rgba(0,0,0,0.3); 
                               border: 1px solid #444; color: #e0e0e0; padding: 8px; border-radius: 4px; resize: vertical;">
                    </textarea>
                    <button class="klite-rpmod-button" id="klite-rpmod-apply-scene" style="width: 100%; margin-top: 8px;">
                        Append Scene to Memory
                    </button>
                    <label style="display: flex; align-items: center; color: #999; font-size: 10px; margin-top: 8px;">
                        <input type="checkbox" id="klite-rpmod-scene-append-to-context" style="margin-right: 5px;">
                        Append scene to context (doesn't appear in Chat)
                    </label>
                </div>

                <!-- Image Generation Controls -->
                <div class="klite-rpmod-control-group">
                    <h3>Image Generation 🎨</h3>

                    <!-- Status Display -->
                    <div style="margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 4px;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">Image Generation Status:</div>
                        <div style="color: #999;">
                            <label style="color: #999; font-size: 12px;">Mode: </label><span id="klite-rpmod-scene-imggen-mode-status" style="color: #999;">---</span>
                        </div>
                        <div style="color: #999;">
                            <label style="color: #999; font-size: 12px;">Model: </label><span id="klite-rpmod-scene-imggen-model-status" style="color: #999;">---</span>
                        </div>
                    </div>
                    
                    <!-- Direct Lite Settings Integration -->
                    <div style="margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 4px;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">SYNC WITH LITE SETTINGS:</div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                            <label style="color: #999; font-size: 12px;">Auto-generate: </label>
                            <select id="klite-rpmod-sync-autogen" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px; font-size: 12px;">
                                <option value="0">Disabled</option>
                                <option value="1">Immersive Mode</option>
                                <option value="2">All Messages</option>
                                <option value="3">User Messages Only</option>
                                <option value="4">Non-User Messages Only</option>
                            </select>
                        </div>
                        
                        <label style="display: flex; align-items: center; color: #999; font-size: 10px;">
                            <input type="checkbox" id="klite-rpmod-sync-detect" style="margin-right: 5px;">
                            Detect ImgGen Instructions
                        </label>
                    </div>
                    
                    <!-- Quick Image Generation Buttons -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">SCENE & CHARACTERS</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="scene" style="width: 100%; margin-bottom: 4px;">🏞️ Current Scene</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="ai-portrait" style="width: 100%; margin-bottom: 4px;">🤖 AI Character</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="user-portrait" style="width: 100%; margin-bottom: 4px;">👤 User Character</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="memory" style="width: 100%;">🧠 From Memory</button>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">CONTEXT-BASED</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="last-raw" style="width: 100%; margin-bottom: 4px;">📝 Last Message (Raw)</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="last-clean" style="width: 100%; margin-bottom: 4px;">✨ Last Message (Clean)</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="recent" style="width: 100%; margin-bottom: 4px;">📚 Recent Events</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="context" style="width: 100%;">🌍 Full Context</button>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">SPECIAL</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="cover" style="width: 100%; background: #8B4513; border-color: #654321;">📖 Book Cover</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.initializeScene();
    },

    getSceneHTML() {
        const locationOptions = Object.keys(this.sceneData.locations).map(loc => 
            `<option value="${loc}">${loc}</option>`
        ).join('');
        
        const timeOptions = Object.keys(this.sceneData.times).map(time => 
            `<option value="${time}"${time === 'evening' ? ' selected' : ''}>${time.charAt(0).toUpperCase() + time.slice(1)}</option>`
        ).join('');
        
        const weatherOptions = Object.keys(this.sceneData.weather).map(weather => 
            `<option value="${weather}"${weather === 'light rain' ? ' selected' : ''}>${weather.charAt(0).toUpperCase() + weather.slice(1)}</option>`
        ).join('');
        
        const moodOptions = Object.keys(this.sceneData.moods).map(mood => 
            `<option value="${mood}"${mood === 'mysterious' ? ' selected' : ''}>${mood.charAt(0).toUpperCase() + mood.slice(1)}</option>`
        ).join('');
        
        return `
            <div class="klite-rpmod-control-row">
                <label>Location:</label>
                <select id="klite-rpmod-location" style="flex: 1;">
                    ${locationOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Time:</label>
                <select id="klite-rpmod-time-of-day" style="flex: 1;">
                    ${timeOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Weather:</label>
                <select id="klite-rpmod-weather" style="flex: 1;">
                    ${weatherOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Mood:</label>
                <select id="klite-rpmod-mood" style="flex: 1;">
                    ${moodOptions}
                </select>
            </div>
        `;
    },

    initializeScene() {
        console.log('🎨 Initializing simplified SCENE panel');
        
        // 1. SYNC WITH LITE SETTINGS (read current values)
        this.syncWithLiteSettings();
        this.getImageGenerationSettings();
        
        // 2. SCENE SETUP HANDLERS
        this.setupSceneHandlers();
        
        // 3. IMAGE GENERATION HANDLERS (simplified)
        this.setupImageGenerationHandlers();
    },

    syncWithLiteSettings() {
        // Read current Lite settings and update controls
        if (typeof localsettings !== 'undefined') {
            // Sync auto-generate dropdown
            const autogenSelect = document.getElementById('klite-rpmod-sync-autogen');
            if (autogenSelect && localsettings.generate_images !== undefined) {
                autogenSelect.value = localsettings.generate_images.toString();
            }
            
            // Sync detect checkbox
            const detectCheckbox = document.getElementById('klite-rpmod-sync-detect');
            if (detectCheckbox && localsettings.img_gen_from_instruct !== undefined) {
                detectCheckbox.checked = localsettings.img_gen_from_instruct;
            }
        }
        
        // Set up sync handlers
        this.setupSyncHandlers();
    },

    getGenerationMode(modevalue) {
        switch(modevalue) {
            case "0": return 'Disabled';
            case "1": return 'AI Horde';
            case "2": return 'KCPP / Forge / A1111';
            case "3": return 'OpenAI DALL-E';
            case "4": return 'ComfyUI';
            case "5": return 'Pollinations.ai';
            default: return 'Trying to detect...';
        }
    },

    // Update status display when panel opens
    getImageGenerationSettings() {           
        const modeStatus = document.getElementById('klite-rpmod-scene-imggen-mode-status');
        const modelStatus = document.getElementById('klite-rpmod-scene-imggen-model-status');
        
        if (typeof localsettings !== 'undefined') {
            // Update Mode status - this is the service/backend
            if (modeStatus && localsettings.generate_images_mode !== undefined) {
                modeStatus.textContent = this.getGenerationMode(localsettings.generate_images_mode);
                modeStatus.style.color = localsettings.generate_images_mode === '0' ? '#999' : '#4a9eff';
            }
            
            // Update Model status - this is the specific model
            if (modelStatus && localsettings.generate_images_model !== undefined) {
                modelStatus.textContent = localsettings.generate_images_model;
                modelStatus.style.color = localsettings.generate_images_mode.includes('0') ? '#999' : '#4a9eff'; //color for model gets changed by mode not model here!
            }
        }
    },

    setupSyncHandlers() {
        // Auto-generate dropdown
        const autogenSelect = document.getElementById('klite-rpmod-sync-autogen');
        if (autogenSelect) {
            autogenSelect.addEventListener('change', (e) => {
                if (typeof localsettings !== 'undefined') {
                    localsettings.generate_images = parseInt(e.target.value);
                    console.log('Updated generate_images to:', localsettings.generate_images);
                    
                    // Call Lite's function if it exists
                    if (typeof set_generate_images === 'function') {
                        set_generate_images(parseInt(e.target.value));
                    }
                }
            });
        }

        // Detect checkbox
        const detectCheckbox = document.getElementById('klite-rpmod-sync-detect');
        if (detectCheckbox) {
            detectCheckbox.addEventListener('change', (e) => {
                if (typeof localsettings !== 'undefined') {
                    localsettings.img_gen_from_instruct = e.target.checked;
                    console.log('Updated img_gen_from_instruct to:', localsettings.img_gen_from_instruct);
                    
                    // Call Lite's function if it exists
                    if (typeof toggle_img_gen_from_instruct === 'function') {
                        toggle_img_gen_from_instruct();
                    }
                }
            });
        }
    },

    setupSceneHandlers() {
        // Scene dropdown change handlers
        ['klite-rpmod-location', 'klite-rpmod-time-of-day', 'klite-rpmod-weather', 'klite-rpmod-mood'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.generateSceneDescription());
            }
        });
        
        // Generate initial description
        this.generateSceneDescription();

        // Apply scene button
        document.getElementById('klite-rpmod-apply-scene')?.addEventListener('click', () => {
            this.applyScene();
        });
        
        // Context checkbox handler
        const contextCheckbox = document.getElementById('klite-rpmod-scene-append-to-context');
        if (contextCheckbox) {
            contextCheckbox.addEventListener('change', (e) => {
                const applyButton = document.getElementById('klite-rpmod-apply-scene');
                if (applyButton) {
                    applyButton.textContent = e.target.checked ? 
                        'Append Scene to Context' : 
                        'Append Scene to Memory';
                }
            });
        }
    },

    setupImageGenerationHandlers() {
        // All image generation buttons
        const imgButtons = document.querySelectorAll('.klite-imggen-btn');
        imgButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const promptType = btn.getAttribute('data-prompt');
                this.generateImage(promptType);
            });
        });
    },

    generateImage(promptType) {
        console.log('🎨 Generating image for:', promptType);
        
        // Check if function exists
        if (typeof do_manual_gen_image !== 'function') {
            console.error('do_manual_gen_image function not available');
            return;
        }
        
        // Build prompt based on type
        const prompt = this.buildPrompt(promptType);
        if (!prompt) {
            console.error('Failed to build prompt for type:', promptType);
            return;
        }
        
        // Call Lite's function directly
        try {
            do_manual_gen_image(prompt);
            console.log(`✅ Image generation started: "${prompt.substring(0, 50)}..."`);
        } catch (error) {
            console.error('Image generation failed:', error);
        }
    },

    buildPrompt(type) {
        switch(type) {
            case 'scene':
                return this.buildScenePrompt();
            case 'ai-portrait':
                return this.buildAIPortraitPrompt();
            case 'user-portrait':
                return this.buildUserPortraitPrompt();
            case 'memory':
                return this.buildMemoryPrompt();
            case 'last-raw':
                return this.buildLastMessagePrompt(true);
            case 'last-clean':
                return this.buildLastMessagePrompt(false);
            case 'recent':
                return this.buildRecentEventsPrompt();
            case 'context':
                return this.buildFullContextPrompt();
            case 'cover':
                return this.buildBookCoverPrompt();
            default:
                return null;
        }
    },

    buildScenePrompt() {
        const location = document.getElementById('klite-rpmod-location')?.value || 'a place';
        const time = document.getElementById('klite-rpmod-time-of-day')?.value || 'day';
        const weather = document.getElementById('klite-rpmod-weather')?.value || 'clear';
        const mood = document.getElementById('klite-rpmod-mood')?.value || 'neutral';
        
        return `${location} during ${time}, ${weather} weather, ${mood} atmosphere, detailed scene`;
    },

    buildAIPortraitPrompt() {
        const aiName = localsettings?.chatopponent?.split('||$||')[0] || 'AI character';
        return `Portrait of ${aiName}, detailed character art`;
    },

    buildUserPortraitPrompt() {
        const userName = localsettings?.chatname || 'User';
        return `Portrait of ${userName}, detailed character art`;
    },

    buildMemoryPrompt() {
        const memory = document.getElementById('memorytext')?.value || '';
        if (memory) {
            const cleanMemory = memory.replace(/\[.*?\]/g, '').trim();
            const firstLine = cleanMemory.split('\n')[0] || cleanMemory.slice(0, 100);
            return `${firstLine}, illustration`;
        }
        return 'Character memory visualization';
    },

    buildLastMessagePrompt(raw = false) {
        if (typeof concat_gametext === 'function') {
            const fullText = concat_gametext(true, "");
            if (fullText) {
                const textLength = fullText.length;
                let sentence = fullText.substring(textLength - 400, textLength);
                if (!raw && typeof start_trim_to_sentence === 'function') {
                    sentence = start_trim_to_sentence(sentence);
                }
                if (!raw && typeof end_trim_to_sentence === 'function') {
                    sentence = end_trim_to_sentence(sentence, true);
                }
                return sentence + ', illustration';
            }
        }
        return 'Latest story scene, illustration';
    },

    buildRecentEventsPrompt() {
        if (typeof concat_gametext === 'function') {
            const fullText = concat_gametext(true, "");
            if (fullText) {
                const recentText = fullText.slice(-1000);
                return `Recent events: ${recentText.slice(0, 200)}, montage illustration`;
            }
        }
        return 'Recent story events, illustration';
    },

    buildFullContextPrompt() {
        const memory = document.getElementById('memorytext')?.value || '';
        let prompt = '';
        
        if (memory) {
            prompt += memory.slice(0, 100);
        }
        
        if (typeof concat_gametext === 'function') {
            const story = concat_gametext(true, "");
            if (story) {
                prompt += (prompt ? ', ' : '') + story.slice(-200);
            }
        }
        
        return prompt ? `${prompt}, epic scene` : 'Story overview, epic illustration';
    },

    buildBookCoverPrompt() {
        const title = document.title || 'The Story';
        const memory = document.getElementById('memorytext')?.value?.slice(0, 50) || '';
        return `Book cover: "${title}", ${memory}, professional cover art`;
    },

    generateSceneDescription() {
        const location = document.getElementById('klite-rpmod-location').value;
        const time = document.getElementById('klite-rpmod-time-of-day').value;
        const weather = document.getElementById('klite-rpmod-weather').value;
        const mood = document.getElementById('klite-rpmod-mood').value;
        
        // Build the description
        let sentences = [];
        
        // Add location
        if (this.sceneData.locations[location]) {
            sentences.push(this.sceneData.locations[location] + '.');
        }
        
        // Add time
        if (this.sceneData.times[time]) {
            sentences.push(this.sceneData.times[time] + '.');
        }
        
        // Add weather (only if not shadowed)
        if (this.sceneData.weather[weather] && this.sceneData.weather[weather] !== '') {
            sentences.push(this.sceneData.weather[weather] + '.');
        }
        
        // Add mood
        if (this.sceneData.moods[mood]) {
            sentences.push(this.sceneData.moods[mood] + '.');
        }
        
        // Update the textarea
        const descriptionField = document.getElementById('klite-rpmod-scene-description');
        if (descriptionField) {
            descriptionField.value = sentences.join(' ');
        }
    },

    applyScene() {
        const location = document.getElementById('klite-rpmod-location').value;
        const time = document.getElementById('klite-rpmod-time-of-day').value;
        const weather = document.getElementById('klite-rpmod-weather').value;
        const mood = document.getElementById('klite-rpmod-mood').value;
        const description = document.getElementById('klite-rpmod-scene-description').value;
        const appendToContext = document.getElementById('klite-rpmod-scene-append-to-context')?.checked || false;

        const scenePrompt = `[Scene: ${location} - ${time}, ${weather} weather, ${mood} mood]\n${description}`;
        
        if (appendToContext) {
            // Append to context (temporary injection during generation)
            this.appendSceneToContext(scenePrompt);
        } else {
            // Append to memory (permanent)
            this.appendSceneToMemory(scenePrompt);
        }
    },

    appendSceneToMemory(scenePrompt) {
        console.log('📍 Attempting to append scene to memory:', scenePrompt);
        
        // Get the memory textarea - correct the element IDs
        const memoryTextarea = document.getElementById('memorytext') || 
                              document.getElementById('klite-rpmod-memory-textarea') ||
                              document.querySelector('#klite-rpmod-panel-right textarea#memorytext');
        
        if (memoryTextarea) {
            console.log('✅ Memory textarea found:', memoryTextarea.id);
            const currentMemory = memoryTextarea.value;
            
            // Check if there's already a scene description
            if (currentMemory.includes('[Scene:')) {
                // Replace existing scene
                console.log('🔄 Replacing existing scene in memory');
                memoryTextarea.value = currentMemory.replace(/\[Scene:[^\]]+\][^\n]*\n?/, scenePrompt + '\n');
            } else {
                // Append new scene to the end (like the smart memory append does)
                console.log('➕ Appending new scene to memory');
                memoryTextarea.value = currentMemory + (currentMemory ? '\n\n' : '') + scenePrompt;
            }
            
            // Trigger input event to sync with other systems
            memoryTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Update localsettings if available
            if (typeof localsettings !== 'undefined') {
                localsettings.memory = memoryTextarea.value;
                console.log('💾 Updated localsettings.memory');
            }
            
            // Trigger save/confirm
            if (typeof confirm_memory === 'function') {
                confirm_memory();
                console.log('✅ Called confirm_memory()');
            } else if (typeof btn_memory_confirm === 'function') {
                btn_memory_confirm();
                console.log('✅ Called btn_memory_confirm()');
            }
            
            // Switch to MEMORY panel to show the result
            if (window.KLITE_RPMod && window.KLITE_RPMod.api) {
                window.KLITE_RPMod.api.switchTab('right', 'MEMORY');
                console.log('📂 Switched to MEMORY panel');
            }
            
            console.log('✅ SCENE Panel: Scene appended to Memory! ✨');
        } else {
            console.error('❌ SCENE Panel: Memory field not found! Tried IDs:', [
                'memorytext',
                'klite-rpmod-memory-textarea',
                '#klite-rpmod-panel-right textarea#memorytext'
            ]);
        }
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - GROUP Panel Implementation v084
// Enhanced D&D-style group and initiative management
// =============================================

window.KLITE_RPMod_Panels.GROUP = {
    activeCharacters: [],
    currentTurn: 0,
    groupMode: false,
    autoAdvanceTurns: false,
    responseMode: 'individual',
    advanceMode: 'round-robin',
    combatRound: 1,
    initiativeMode: false,
    draggedIndex: null,
    searchQuery: '',
    tagFilter: '',
    starFilter: 0,
    selectedCharacters: new Set(),
    editingIndex: -1,
    lastSpeakerIndex: -1,
    
    // D&D Status conditions
    statusConditions: [
        'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
        'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
        'Prone', 'Restrained', 'Stunned', 'Unconscious'
    ],
    
    // Default avatars for different types
    defaultAvatars: {
        npc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM0QTkwRTIiLz4KPHBhdGggZD0iTTMwIDM1QzM1LjUyMjggMzUgNDAgMzAuNTIyOCA0MCAyNUM0MCAxOS40NzcyIDM1LjUyMjggMTUgMzAgMTVDMjQuNDc3MiAxNSAyMCAxOS40NzcyIDIwIDI1QzIwIDMwLjUyMjggMjQuNDc3MiAzNSAzMCAzNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNSA0NUMxNSA0MC4wMjk0IDIxLjcxNTcgMzYgMzAgMzZDMzguMjg0MyAzNiA0NSA0MC4wMjk0IDQ1IDQ1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=',
        monster: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNEOTUzNEYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyNSIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIyNSIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTIwIDM4QzIwIDM4IDE1IDMzIDE1IDI4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNNDAgMzhDNDAgMzggNDUgMzMgNDUgMjgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0yMCA0MEMyMCA0MCAyNSA0NSAzMCA0NUMzNSA0NSA0MCA0MCA0MCA0MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'
    },
    
    load(container, panel) {
        this.lastSpeakerIndex = this.lastSpeakerIndex !== undefined ? this.lastSpeakerIndex : -1;
        this.activeCharacters = this.activeCharacters || [];
        this.currentTurn = this.currentTurn || 0;
        this.groupModeEnabled = this.groupModeEnabled || false;
        this.initiativeMode = this.initiativeMode || false;
        this.advanceMode = this.advanceMode || 'round-robin';
        this.responseMode = this.responseMode || 'individual';
        this.autoAdvanceTurns = this.autoAdvanceTurns || false;
        // Add modal styles
        const styleEl = document.getElementById('klite-rpmod-group-styles') || document.createElement('style');
        styleEl.id = 'klite-rpmod-group-styles';
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <!-- Group Chat Toggle -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Group Chat & Initiative</h3>
                    <div class="klite-rpmod-control-row">
                        <label>
                            <input type="checkbox" id="klite-rpmod-group-chat-toggle"> Enable Group Mode
                        </label>
                    </div>
                </div>

                <!-- Participant Management -->
                <div class="klite-rpmod-control-group" id="klite-rpmod-participant-management" style="display: none;">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Party & Encounter Management</h3>
                    
                    <!-- Current Status -->
                    <div class="klite-rpmod-status-display" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="color: #999; font-size: 12px;">Current Speaker:</span>
                            <span id="klite-rpmod-current-speaker" style="color: #4CAF50; font-weight: bold;">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #999; font-size: 12px;">Next Speaker:</span>
                            <span id="klite-rpmod-next-speaker" style="color: #4a9eff;">—</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <span style="color: #999; font-size: 12px;">Round:</span>
                            <span id="klite-rpmod-combat-round" style="color: #e0e0e0;">1</span>
                        </div>
                    </div>
                    
                    <!-- Participant List -->
                    <div id="klite-rpmod-participant-list" class="klite-rpmod-group-character-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                        <!-- Participants will be dynamically added here -->
                    </div>
                    
                    <!-- Add Buttons -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-add-character">
                            Add Character
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-add-custom">
                            Add NPC/Monster
                        </button>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-advance-turn" style="background: #5cb85c;">
                            Advance Turn
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-roll-initiative" style="background: #f0ad4e;">
                            Roll Initiative
                        </button>
                    </div>
                </div>

                <!-- Turn Management -->
                <div class="klite-rpmod-control-group" id="klite-rpmod-turn-management" style="display: none;">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Turn & Response Settings</h3>
                    <div class="klite-rpmod-control-row">
                        <label>Response Mode</label>
                        <select id="klite-rpmod-response-mode">
                            <option value="individual">Individual Responses</option>
                            <option value="simultaneous">Simultaneous Actions</option>
                            <option value="random">Random Order</option>
                        </select>
                    </div>
                    <div class="klite-rpmod-control-row">
                        <label>Advance Mode</label>
                        <select id="klite-rpmod-advance-mode">
                            <option value="random">Random</option>
                            <option value="round-robin">Round Robin</option>
                            <option value="initiative">Initiative Order</option>
                            <option value="name-triggered">Name Triggered</option>
                        </select>
                    </div>
                    <div class="klite-rpmod-control-row">
                        <label>
                            <input type="checkbox" id="klite-rpmod-auto-advance"> Auto-advance turns after generation
                        </label>
                    </div>
                </div>

                <!-- Group Context -->
                <div class="klite-rpmod-control-group" id="klite-rpmod-group-context" style="display: none;">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Encounter Context</h3>
                    <textarea 
                        id="klite-rpmod-group-context-text"
                        placeholder="Describe the current scene, encounter, or situation..."
                        style="width: 100%; height: 80px; resize: vertical;"
                    ></textarea>
                    <div class="klite-rpmod-status-bar">
                        <span id="klite-rpmod-context-status">Ready</span>
                        <span id="klite-rpmod-context-tokens">0 tokens</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Character Selection Modal -->
        <div class="klite-rpmod-modal hidden" id="klite-rpmod-character-select-modal">
            <div class="klite-rpmod-modal-content" style="max-width: 700px; max-height: 80vh;">
                <h3>Select Characters</h3>
                
                <!-- Search and Filters -->
                <div style="margin-bottom: 15px;">
                    <input type="text" id="klite-rpmod-char-search" placeholder="Search characters by name, creator, or tags..." 
                        style="width: 100%; margin-bottom: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <select id="klite-rpmod-tag-filter">
                            <option value="">All Tags</option>
                        </select>
                        <select id="klite-rpmod-star-filter">
                            <option value="0">All Ratings</option>
                            <option value="5">★★★★★</option>
                            <option value="4">★★★★☆+</option>
                            <option value="3">★★★☆☆+</option>
                            <option value="2">★★☆☆☆+</option>
                            <option value="1">★☆☆☆☆+</option>
                        </select>
                    </div>
                </div>
                
                <!-- Character List -->
                <div id="klite-rpmod-character-select-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #333; border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.2);">
                    <!-- Character items will be populated here -->
                </div>
                
                <!-- Selected count -->
                <div style="margin-top: 10px; color: #999; font-size: 12px;">
                    <span id="klite-rpmod-selected-count">0</span> characters selected
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="klite-rpmod-button" id="klite-rpmod-confirm-characters" style="flex: 1;">
                        Add Selected Characters
                    </button>
                    <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-cancel-characters" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>

        <!-- Add Custom Character Modal -->
        <div class="klite-rpmod-modal hidden" id="klite-rpmod-custom-character-modal">
            <div class="klite-rpmod-modal-content" style="max-width: 400px;">
                <h3>Add NPC/Monster</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Name</label>
                    <input type="text" id="klite-rpmod-custom-name" placeholder="e.g., Borin, Goblin Chief" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Type</label>
                    <select id="klite-rpmod-custom-type" style="width: 100%;">
                        <option value="npc">NPC (Non-Player Character)</option>
                        <option value="monster">Monster/Enemy</option>
                        <option value="pc">PC (Player Character)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Role/Occupation</label>
                    <input type="text" id="klite-rpmod-custom-role" placeholder="e.g., Barkeeper, Ambushing the party" 
                        style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Hit Points</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <input type="number" id="klite-rpmod-custom-hp" placeholder="Current HP" min="0">
                        <input type="number" id="klite-rpmod-custom-max-hp" placeholder="Max HP" min="1">
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button class="klite-rpmod-button" id="klite-rpmod-add-custom-confirm" style="flex: 1;">
                        Add to Encounter
                    </button>
                    <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-add-custom-cancel" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>

        <!-- Edit Character Modal -->
        <div class="klite-rpmod-modal hidden" id="klite-rpmod-edit-character-modal">
            <div class="klite-rpmod-modal-content" style="max-width: 500px;">
                <h3>Edit Character</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Name</label>
                    <input type="text" id="klite-rpmod-edit-name" style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Type</label>
                    <select id="klite-rpmod-edit-type" style="width: 100%;">
                        <option value="pc">PC (Player Character)</option>
                        <option value="npc">NPC (Non-Player Character)</option>
                        <option value="monster">Monster/Enemy</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Hit Points</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <input type="number" id="klite-rpmod-edit-hp" placeholder="Current HP" min="0">
                        <input type="number" id="klite-rpmod-edit-max-hp" placeholder="Max HP" min="1">
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Initiative</label>
                    <input type="number" id="klite-rpmod-edit-initiative" min="1" max="40" style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" id="klite-rpmod-edit-active">
                        <span style="color: #999; font-size: 12px;">Active (participates in turns)</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Status Conditions</label>
                    <div id="klite-rpmod-edit-statuses" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; max-height: 150px; overflow-y: auto; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <!-- Status checkboxes will be populated here -->
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button class="klite-rpmod-button" id="klite-rpmod-edit-save" style="flex: 1;">
                        Save Changes
                    </button>
                    <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-edit-cancel" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
        `;

        styleEl.textContent = `
            .klite-rpmod-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .klite-rpmod-modal.hidden {
                display: none !important;
            }
            
            .klite-rpmod-modal-content {
                background: #1a1a1a;
                border: 1px solid #4a9eff;
                border-radius: 8px;
                padding: 25px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
                position: relative;
            }
            
            .klite-rpmod-modal-content::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #4a9eff, #337ab7, #4a9eff);
                border-radius: 8px;
                z-index: -1;
                opacity: 0.5;
            }
            
            .klite-rpmod-modal-content h3 {
                margin-top: 0;
                margin-bottom: 20px;
                color: #4a9eff;
                font-size: 20px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .klite-rpmod-modal-content input[type="text"],
            .klite-rpmod-modal-content input[type="number"],
            .klite-rpmod-modal-content select,
            .klite-rpmod-modal-content textarea {
                background: #0f0f0f;
                border: 1px solid #333;
                color: #e0e0e0;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .klite-rpmod-modal-content input[type="text"]:focus,
            .klite-rpmod-modal-content input[type="number"]:focus,
            .klite-rpmod-modal-content select:focus,
            .klite-rpmod-modal-content textarea:focus {
                outline: none;
                border-color: #4a9eff;
                background: #1a1a1a;
                box-shadow: 0 0 5px rgba(74, 158, 255, 0.3);
            }
            
            .klite-rpmod-character-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 10px;
            }
            
            /*.klite-rpmod-button {
                background: #337ab7;
                border: 1px solid #4a9eff;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }*/
            
            .klite-rpmod-button:hover {
                background: #4a9eff;
                box-shadow: 0 2px 10px rgba(74, 158, 255, 0.5);
                transform: translateY(-1px);
            }
            
            .klite-rpmod-button-secondary {
                background: transparent;
                border: 1px solid #666;
                color: #999;
            }
            
            .klite-rpmod-button-secondary:hover {
                border-color: #4a9eff;
                color: #4a9eff;
                background: rgba(74, 158, 255, 0.1);
            }
            
            #klite-rpmod-character-select-list {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 4px;
                padding: 10px;
            }
            
            #klite-rpmod-edit-statuses {
                border: 1px solid #333;
                background: #0f0f0f;
            }
            
            #klite-rpmod-edit-statuses label:hover {
                background: rgba(74, 158, 255, 0.1);
            }
        `;
        
        if (!document.getElementById('klite-rpmod-group-styles')) {
            document.head.appendChild(styleEl);
        }

        this.initializeEventListeners();
        this.loadGroupState();
        this.updateUI();
    },

    initializeEventListeners() {
        // Group mode toggle
        const groupToggle = document.getElementById('klite-rpmod-group-chat-toggle');
        groupToggle?.addEventListener('change', (e) => {
            this.groupMode = e.target.checked;
            this.toggleGroupMode();
        });

        // Add character button
        const addCharBtn = document.getElementById('klite-rpmod-add-character');
        addCharBtn?.addEventListener('click', () => {
            this.showCharacterSelection();
        });

        // Add custom button
        const addCustomBtn = document.getElementById('klite-rpmod-add-custom');
        addCustomBtn?.addEventListener('click', () => {
            this.showCustomCharacterModal();
        });

        // Turn advancement
        const advanceBtn = document.getElementById('klite-rpmod-advance-turn');
        advanceBtn?.addEventListener('click', () => {
            this.advanceToNextSpeaker();
        });

        // Roll/Remove initiative toggle
        const rollBtn = document.getElementById('klite-rpmod-roll-initiative');
        rollBtn?.addEventListener('click', () => {
            if (this.initiativeMode) {
                this.removeInitiative();
            } else {
                this.rollAllInitiatives();
            }
        });

        // Auto-advance toggle
        const autoAdvance = document.getElementById('klite-rpmod-auto-advance');
        autoAdvance?.addEventListener('change', (e) => {
            this.autoAdvanceTurns = e.target.checked;
            this.saveGroupState();
        });

        // Response mode
        const responseMode = document.getElementById('klite-rpmod-response-mode');
        responseMode?.addEventListener('change', (e) => {
            this.responseMode = e.target.value;
            this.saveGroupState();
        });

        // Advance mode
        const advanceMode = document.getElementById('klite-rpmod-advance-mode');
        advanceMode?.addEventListener('change', (e) => {
            this.advanceMode = e.target.value;
            if (this.advanceMode === 'initiative' && this.activeCharacters.length > 0 && !this.initiativeMode) {
                this.rollAllInitiatives();
            }
            this.saveGroupState();
        });

        // Group context
        const groupContext = document.getElementById('klite-rpmod-group-context-text');
        let contextTimeout;
        
        groupContext?.addEventListener('input', () => {
            clearTimeout(contextTimeout);
            document.getElementById('klite-rpmod-context-status').textContent = 'Typing...';
            
            contextTimeout = setTimeout(() => {
                this.saveGroupContext();
            }, 1000);
        });

        // Character selection modal
        const searchInput = document.getElementById('klite-rpmod-char-search');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.updateCharacterList();
        });

        const tagFilter = document.getElementById('klite-rpmod-tag-filter');
        tagFilter?.addEventListener('change', (e) => {
            this.tagFilter = e.target.value;
            this.updateCharacterList();
        });

        const starFilter = document.getElementById('klite-rpmod-star-filter');
        starFilter?.addEventListener('change', (e) => {
            this.starFilter = parseInt(e.target.value);
            this.updateCharacterList();
        });

        const confirmCharsBtn = document.getElementById('klite-rpmod-confirm-characters');
        confirmCharsBtn?.addEventListener('click', () => {
            this.confirmCharacterSelection();
        });

        const cancelCharsBtn = document.getElementById('klite-rpmod-cancel-characters');
        cancelCharsBtn?.addEventListener('click', () => {
            this.hideCharacterSelection();
        });

        // Custom character modal
        const hpInput = document.getElementById('klite-rpmod-custom-hp');
        hpInput?.addEventListener('input', (e) => {
            const maxHpInput = document.getElementById('klite-rpmod-custom-max-hp');
            if (!maxHpInput.value) {
                maxHpInput.value = e.target.value;
            }
        });

        const addCustomConfirm = document.getElementById('klite-rpmod-add-custom-confirm');
        addCustomConfirm?.addEventListener('click', () => {
            this.addCustomCharacter();
        });

        const addCustomCancel = document.getElementById('klite-rpmod-add-custom-cancel');
        addCustomCancel?.addEventListener('click', () => {
            this.hideCustomCharacterModal();
        });

        // Edit character modal
        const editHpInput = document.getElementById('klite-rpmod-edit-hp');
        editHpInput?.addEventListener('input', (e) => {
            const maxHpInput = document.getElementById('klite-rpmod-edit-max-hp');
            if (!maxHpInput.value || parseInt(e.target.value) > parseInt(maxHpInput.value)) {
                maxHpInput.value = e.target.value;
            }
        });

        const editSaveBtn = document.getElementById('klite-rpmod-edit-save');
        editSaveBtn?.addEventListener('click', () => {
            this.saveEditedCharacter();
        });

        const editCancelBtn = document.getElementById('klite-rpmod-edit-cancel');
        editCancelBtn?.addEventListener('click', () => {
            this.hideEditModal();
        });
    },

    rollDice(sides = 10, count = 2) {
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    },

    rollAllInitiatives() {
        this.activeCharacters.forEach(char => {
            char.initiative = this.rollDice(10, 2);
        });
        
        this.initiativeMode = true;
        this.sortByInitiative();
        this.updateInitiativeButton();
        this.updateParticipantList();
        this.saveCharactersToStorage();
    },

    removeInitiative() {
        this.initiativeMode = false;
        // Clear initiative values
        this.activeCharacters.forEach(char => {
            char.initiative = 0;
        });
        this.updateInitiativeButton();
        this.updateParticipantList();
        this.saveGroupState();
    },

    updateInitiativeButton() {
        const btn = document.getElementById('klite-rpmod-roll-initiative');
        if (btn) {
            btn.textContent = this.initiativeMode ? 'Remove Initiative' : 'Roll Initiative';
            btn.style.background = this.initiativeMode ? '#d9534f' : '#f0ad4e';
        }
    },

    sortByInitiative() {
        this.activeCharacters.sort((a, b) => b.initiative - a.initiative);
        this.currentTurn = 0;
        this.updateCurrentSpeaker();
        this.updateParticipantList();
    },

    toggleGroupMode() {
        const sections = [
            'klite-rpmod-participant-management',
            'klite-rpmod-turn-management',
            'klite-rpmod-group-context'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = this.groupMode ? 'block' : 'none';
            }
        });
        
        this.saveGroupState();
        this.syncWithKobold();
    },

    updateParticipantList() {
        const list = document.getElementById('klite-rpmod-participant-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.activeCharacters.forEach((participant, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                flex-direction: column;
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid ${index === this.currentTurn ? '#4CAF50' : '#333'};
                border-radius: 4px;
                position: relative;
                ${index === this.currentTurn ? 'box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);' : ''}
            `;
            item.draggable = true;
            item.dataset.index = index;
            
            // Row 1: Icon, Name, Edit Button, Delete Button
            const row1 = document.createElement('div');
            row1.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
            
            // Avatar/Icon
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: url('${participant.portrait || this.getDefaultAvatar(participant.type)}') center/cover;
                flex-shrink: 0;
                border: 2px solid ${this.getTypeColor(participant.type)};
            `;
            
            // Name
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'flex: 1; color: #e0e0e0; font-weight: bold; font-size: 14px;';
            nameDiv.textContent = participant.name;
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'klite-rpmod-button';
            editBtn.style.cssText = 'width: auto; padding: 4px 8px; margin: 0; font-size: 11px;';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => this.showEditModal(index));
            
            // Delete button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'klite-rpmod-button';
            removeBtn.style.cssText = 'width: auto; padding: 4px 8px; margin: 0; font-size: 11px; background: #d9534f;';
            removeBtn.textContent = 'Delete';
            removeBtn.title = 'Remove from encounter';
            removeBtn.addEventListener('click', () => this.removeParticipant(index));
            
            row1.appendChild(avatar);
            row1.appendChild(nameDiv);
            row1.appendChild(editBtn);
            row1.appendChild(removeBtn);
            
            // Row 2: Type, HP, Speaking/Next/Last badges
            const row2 = document.createElement('div');
            row2.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px;';
            
            // Type and Role
            const typeDiv = document.createElement('div');
            typeDiv.style.cssText = `color: ${this.getTypeColor(participant.type)}; text-transform: uppercase;`;
            typeDiv.textContent = participant.type + (participant.role ? ' • ' + participant.role : '');
            
            // HP Display
            const hpDiv = document.createElement('div');
            if (participant.hp !== undefined) {
                const hpPercent = (participant.hp / participant.maxHp) * 100;
                const hpColor = hpPercent > 50 ? '#5cb85c' : hpPercent > 25 ? '#f0ad4e' : '#d9534f';
                hpDiv.innerHTML = `
                    <span style="color: #999;">HP:</span>
                    <span style="color: ${hpColor}; font-weight: bold; margin-left: 5px;">${participant.hp}/${participant.maxHp}</span>
                `;
            }
            
            // Speaking/Next/Last badges
            const badgesDiv = document.createElement('div');
            badgesDiv.style.cssText = 'margin-left: auto; display: flex; gap: 5px;';
            
            if (index === this.currentTurn) {
                const speakingBadge = document.createElement('span');
                speakingBadge.style.cssText = 'padding: 2px 8px; background: #4CAF50; border-radius: 50px; font-size: 10px; color: white;';
                speakingBadge.textContent = 'speaking';
                badgesDiv.appendChild(speakingBadge);
            }
            
            if (index === this.getNextSpeakerIndex()) {
                const nextBadge = document.createElement('span');
                nextBadge.style.cssText = 'padding: 2px 8px; border: 1px solid #4a9eff; border-radius: 50px; font-size: 10px; color: #4a9eff;';
                nextBadge.textContent = 'next';
                badgesDiv.appendChild(nextBadge);
            }
            
            const lastSpeaker = this.getLastSpeakerIndex();
            if (lastSpeaker !== -1 && index === lastSpeaker && index !== this.currentTurn) {
                const lastBadge = document.createElement('span');
                lastBadge.style.cssText = 'padding: 2px 8px; border: 1px solid #666; border-radius: 50px; font-size: 10px; color: #666;';
                lastBadge.textContent = 'last';
                badgesDiv.appendChild(lastBadge);
            }
            
            row2.appendChild(typeDiv);
            if (participant.hp !== undefined) {
                row2.appendChild(hpDiv);
            }
            row2.appendChild(badgesDiv);
            
            // Row 3: Active checkbox, Initiative, Statuses, Now button
            const row3 = document.createElement('div');
            row3.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 12px;';
            
            // Active checkbox
            const activeLabel = document.createElement('label');
            activeLabel.style.cssText = 'display: flex; align-items: center; gap: 5px;';
            const activeCheck = document.createElement('input');
            activeCheck.type = 'checkbox';
            activeCheck.checked = participant.active;
            activeCheck.addEventListener('change', (e) => {
                participant.active = e.target.checked;
                this.saveCharactersToStorage();
            });
            activeLabel.appendChild(activeCheck);
            activeLabel.appendChild(document.createTextNode('Active'));
            
            // Initiative (if in initiative mode)
            if (this.initiativeMode && participant.initiative) {
                const initiativeDiv = document.createElement('div');
                initiativeDiv.style.cssText = 'display: flex; align-items: center; gap: 5px;';
                initiativeDiv.innerHTML = `
                    <span style="color: #999;">Initiative:</span>
                    <span style="color: #4a9eff; font-weight: bold;">${participant.initiative}</span>
                `;
                row3.appendChild(activeLabel);
                row3.appendChild(initiativeDiv);
            } else {
                row3.appendChild(activeLabel);
            }
            
            // Status conditions
            if (participant.statuses && participant.statuses.length > 0) {
                const statusesDiv = document.createElement('div');
                statusesDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; flex: 1;';
                
                participant.statuses.forEach(status => {
                    const statusBadge = document.createElement('span');
                    statusBadge.style.cssText = `
                        padding: 2px 6px;
                        background: rgba(255, 152, 0, 0.2);
                        border: 1px solid #ff9800;
                        border-radius: 3px;
                        font-size: 10px;
                        color: #ff9800;
                    `;
                    statusBadge.textContent = status;
                    statusesDiv.appendChild(statusBadge);
                });
                
                row3.appendChild(statusesDiv);
            }
            
            // Now button
            const nowBtn = document.createElement('button');
            nowBtn.className = 'klite-rpmod-button';
            nowBtn.style.cssText = 'width: auto; padding: 4px 12px; margin: 0; margin-left: auto; font-size: 11px; background: #5cb85c;';
            nowBtn.textContent = 'Now';
            nowBtn.title = 'Trigger response from this character';
            nowBtn.addEventListener('click', () => this.triggerCharacterResponse(participant, index));
            
            row3.appendChild(nowBtn);
            
            item.appendChild(row1);
            item.appendChild(row2);
            item.appendChild(row3);
            
            // Drag and drop handlers
            this.addDragHandlers(item, index);
            
            list.appendChild(item);
        });
    },

    showEditModal(index) {
        this.editingIndex = index;
        const participant = this.activeCharacters[index];
        const modal = document.getElementById('klite-rpmod-edit-character-modal');
        
        // Populate fields
        document.getElementById('klite-rpmod-edit-name').value = participant.name || '';
        document.getElementById('klite-rpmod-edit-type').value = participant.type || 'pc';
        document.getElementById('klite-rpmod-edit-hp').value = participant.hp || '';
        document.getElementById('klite-rpmod-edit-max-hp').value = participant.maxHp || '';
        document.getElementById('klite-rpmod-edit-initiative').value = participant.initiative || '';
        document.getElementById('klite-rpmod-edit-active').checked = participant.active !== false;
        
        // Disable name editing for PCs (they come from character manager)
        const nameInput = document.getElementById('klite-rpmod-edit-name');
        nameInput.disabled = participant.type === 'pc';
        
        // Populate status conditions
        const statusContainer = document.getElementById('klite-rpmod-edit-statuses');
        statusContainer.innerHTML = '';
        
        this.statusConditions.forEach(status => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ccc;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = status;
            checkbox.checked = participant.statuses && participant.statuses.includes(status);
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(status));
            statusContainer.appendChild(label);
        });
        
        modal.classList.remove('hidden');
    },

    hideEditModal() {
        const modal = document.getElementById('klite-rpmod-edit-character-modal');
        modal.classList.add('hidden');
        this.editingIndex = -1;
    },

    saveEditedCharacter() {
        if (this.editingIndex === -1) return;
        
        const participant = this.activeCharacters[this.editingIndex];
        
        // Update values
        if (participant.type !== 'pc') {
            participant.name = document.getElementById('klite-rpmod-edit-name').value.trim();
        }
        participant.type = document.getElementById('klite-rpmod-edit-type').value;
        participant.hp = parseInt(document.getElementById('klite-rpmod-edit-hp').value) || 0;
        participant.maxHp = parseInt(document.getElementById('klite-rpmod-edit-max-hp').value) || participant.hp;
        participant.initiative = parseInt(document.getElementById('klite-rpmod-edit-initiative').value) || 0;
        participant.active = document.getElementById('klite-rpmod-edit-active').checked;
        
        // Update statuses
        participant.statuses = [];
        const statusCheckboxes = document.querySelectorAll('#klite-rpmod-edit-statuses input[type="checkbox"]:checked');
        statusCheckboxes.forEach(cb => {
            participant.statuses.push(cb.value);
        });
        
        // Re-sort if initiative changed and we're in initiative mode
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
        
        this.updateParticipantList();
        this.saveCharactersToStorage();
        this.hideEditModal();
        this.showNotification('Character updated successfully', 'success');
    },

    addDragHandlers(item, index) {
        item.addEventListener('dragstart', (e) => {
            this.draggedIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '';
            this.draggedIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                item.style.borderTop = '2px solid #4a9eff';
                item.style.borderBottom = '';
            } else {
                item.style.borderTop = '';
                item.style.borderBottom = '2px solid #4a9eff';
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.style.borderTop = '';
            item.style.borderBottom = '';
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.borderTop = '';
            item.style.borderBottom = '';
            
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            
            if (fromIndex !== toIndex && !this.initiativeMode) {
                const [removed] = this.activeCharacters.splice(fromIndex, 1);
                this.activeCharacters.splice(toIndex, 0, removed);
                
                // Update current turn
                if (this.currentTurn === fromIndex) {
                    this.currentTurn = toIndex;
                } else if (fromIndex < this.currentTurn && toIndex >= this.currentTurn) {
                    this.currentTurn--;
                } else if (fromIndex > this.currentTurn && toIndex <= this.currentTurn) {
                    this.currentTurn++;
                }
                
                this.updateParticipantList();
                this.updateCurrentSpeaker();
                this.saveCharactersToStorage();
            }
        });
    },

    getTypeColor(type) {
        switch(type) {
            case 'pc': return '#4CAF50';
            case 'npc': return '#4A90E2';
            case 'monster': return '#D9534F';
            default: return '#999';
        }
    },

    getDefaultAvatar(type) {
        return this.defaultAvatars[type] || this.defaultAvatars.npc;
    },

    getNextSpeakerIndex() {
        if (this.activeCharacters.length === 0) return -1;
        
        let nextIndex = this.currentTurn;
        let attempts = 0;
        
        do {
            nextIndex = (nextIndex + 1) % this.activeCharacters.length;
            attempts++;
            if (attempts >= this.activeCharacters.length) return -1;
        } while (!this.activeCharacters[nextIndex].active);
        
        return nextIndex;
    },

    getLastSpeakerIndex() {
        return this.lastSpeakerIndex !== undefined ? this.lastSpeakerIndex : -1;
    },

    showCharacterSelection() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (!modal) return;
        
        // Check if Character Manager is loaded
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        const panelCharManager = window.PanelCharacterManager;
        
        if (!charManager?.instance?.characters && !panelCharManager?.instance?.characters) {
            this.showNotification('Character Manager is still loading. Please wait...', 'warning');
            
            // Set up a check interval
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                const cm = window.KLITE_RPMod_Panels?.CHARS;
                const pcm = window.PanelCharacterManager;
                
                if (cm?.instance?.characters || pcm?.instance?.characters || attempts > 10) {
                    clearInterval(checkInterval);
                    if (attempts <= 10) {
                        // Try again now that it's loaded
                        this.showCharacterSelection();
                    } else {
                        this.showNotification('Could not load Character Manager. Please ensure characters are loaded in the CHARS panel.', 'error');
                    }
                }
            }, 500);
            return;
        }
        
        // Populate tag filter
        this.populateTagFilter();
        
        // Clear selections
        this.selectedCharacters.clear();
        
        // Show modal and update list
        modal.classList.remove('hidden');
        this.updateCharacterList();
    },

    populateTagFilter() {
        const tagFilter = document.getElementById('klite-rpmod-tag-filter');
        if (!tagFilter) return;
        
        const characters = this.getAvailableCharacters();
        const tags = new Set();
        
        // Collect all unique tags
        characters.forEach(char => {
            if (char.tags && Array.isArray(char.tags)) {
                char.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tags.add(tag.trim());
                    }
                });
            }
        });
        
        // Clear and rebuild options
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
        // Sort tags alphabetically and add as options
        Array.from(tags).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    },

    populateCharacterModal(characters) {
        const list = document.getElementById('klite-rpmod-character-select-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (characters.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No characters available. Import characters in the CHARS panel first.</div>';
            return;
        }
        
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'klite-rpmod-character-select-item';
            item.innerHTML = `
                <img src="${char.imageBlob ? URL.createObjectURL(char.imageBlob) : this.getDefaultAvatar('pc')}" 
                    alt="${char.name}" 
                    style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <span>${char.name}</span>
            `;
            item.onclick = () => this.selectCharacterForGroup(char);
            list.appendChild(item);
        });
    },

    selectCharacterForGroup(character) {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Add the character to the group
        const participant = {
            id: Date.now() + Math.random(),
            name: character.name,
            type: 'pc',
            active: true,
            initiative: this.initiativeMode ? this.rollDice(20) : 0,
            hp: 20,
            maxHp: 20,
            portrait: character.imageBlob ? URL.createObjectURL(character.imageBlob) : null,
            statuses: [],
            characterData: character
        };
        
        this.addParticipant(participant);
    },

    hideCharacterSelectModal() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    updateCharacterList() {
        const list = document.getElementById('klite-rpmod-character-select-list');
        if (!list) return;
        
        const characters = this.getFilteredCharacters();
        list.innerHTML = '';
        
        if (characters.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No characters found matching your filters.</div>';
            return;
        }
        
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'klite-rpmod-character-item';
            item.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px;
                margin-bottom: 4px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            item.dataset.name = char.name;
            
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedCharacters.has(char.name);
            checkbox.style.cssText = 'margin-right: 10px; cursor: pointer;';
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: url('${char.portrait || this.getDefaultAvatar('pc')}') center/cover;
                margin-right: 10px;
                border: 2px solid #4CAF50;
                flex-shrink: 0;
            `;
            
            // Character info
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const nameRow = document.createElement('div');
            nameRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 2px;';
            
            const name = document.createElement('span');
            name.style.cssText = 'color: #e0e0e0; font-weight: bold; font-size: 13px;';
            name.textContent = char.name;
            
            const tokens = document.createElement('span');
            tokens.style.cssText = 'color: #666; font-size: 11px;';
            tokens.textContent = `${char.tokenCount || 0} tokens`;
            
            nameRow.appendChild(name);
            nameRow.appendChild(tokens);
            
            const detailsRow = document.createElement('div');
            detailsRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            const creator = document.createElement('span');
            creator.style.cssText = 'color: #999; font-size: 11px;';
            creator.textContent = char.creator || 'Unknown';
            
            const tags = document.createElement('span');
            tags.style.cssText = 'color: #666; font-size: 11px;';
            if (char.tags && char.tags.length > 0) {
                tags.textContent = char.tags.slice(0, 3).join(', ') + (char.tags.length > 3 ? '...' : '');
            }
            
            detailsRow.appendChild(creator);
            if (char.tags && char.tags.length > 0) {
                detailsRow.appendChild(document.createTextNode(' • '));
                detailsRow.appendChild(tags);
            }
            
            info.appendChild(nameRow);
            info.appendChild(detailsRow);
            
            // Rating
            const rating = document.createElement('div');
            rating.style.cssText = 'color: #f0ad4e; font-size: 14px; margin-left: 10px;';
            rating.textContent = '★'.repeat(char.rating || 0) + '☆'.repeat(5 - (char.rating || 0));
            
            item.appendChild(checkbox);
            item.appendChild(avatar);
            item.appendChild(info);
            item.appendChild(rating);
            
            // Selection handling
            const updateSelection = (selected) => {
                if (selected) {
                    this.selectedCharacters.add(char.name);
                    item.style.background = 'rgba(74, 158, 255, 0.2)';
                    item.style.borderColor = '#4a9eff';
                    item.classList.add('selected');
                } else {
                    this.selectedCharacters.delete(char.name);
                    item.style.background = 'rgba(0, 0, 0, 0.3)';
                    item.style.borderColor = '#333';
                    item.classList.remove('selected');
                }
                checkbox.checked = selected;
                this.updateSelectedCount();
            };
            
            // Set initial state
            if (this.selectedCharacters.has(char.name)) {
                updateSelection(true);
            }
            
            // Click handlers
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    updateSelection(!checkbox.checked);
                }
            });
            
            checkbox.addEventListener('change', (e) => {
                updateSelection(e.target.checked);
            });
            
            // Hover effect
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = 'rgba(255, 255, 255, 0.05)';
                    item.style.borderColor = '#555';
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = 'rgba(0, 0, 0, 0.3)';
                    item.style.borderColor = '#333';
                }
            });
            
            list.appendChild(item);
        });
        
        this.updateSelectedCount();
    },
    
    updateSelectedCount() {
        const countEl = document.getElementById('klite-rpmod-selected-count');
        if (countEl) {
            countEl.textContent = this.selectedCharacters.size;
        }
    },

    getFilteredCharacters() {
        let characters = this.getAvailableCharacters();
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            characters = characters.filter(char => 
                char.name.toLowerCase().includes(query) ||
                (char.creator && char.creator.toLowerCase().includes(query))
            );
        }
        
        // Filter by tag
        if (this.tagFilter) {
            characters = characters.filter(char => 
                char.tags && char.tags.includes(this.tagFilter)
            );
        }
        
        // Filter by rating
        if (this.starFilter > 0) {
            characters = characters.filter(char => 
                (char.rating || 0) >= this.starFilter
            );
        }
        
        // Exclude already added characters
        characters = characters.filter(char => 
            !this.activeCharacters.find(active => active.name === char.name)
        );
        
        return characters;
    },

    confirmCharacterSelection() {
        const characters = this.getAvailableCharacters();
        
        this.selectedCharacters.forEach(charName => {
            const character = characters.find(c => c.name === charName);
            if (character) {
                this.addParticipant({
                    name: character.name,
                    type: 'pc',
                    active: true,
                    initiative: this.initiativeMode ? this.rollDice(10, 2) : 0,
                    portrait: character.portrait,
                    hp: 20,
                    maxHp: 20,
                    data: character,
                    statuses: []
                });
            }
        });
        
        this.hideCharacterSelection();
        
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
    },

    hideCharacterSelection() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        modal?.classList.add('hidden');
        this.selectedCharacters.clear();
    },

    showCustomCharacterModal() {
        const modal = document.getElementById('klite-rpmod-custom-character-modal');
        if (!modal) return;
        
        // Clear fields
        document.getElementById('klite-rpmod-custom-name').value = '';
        document.getElementById('klite-rpmod-custom-type').value = 'npc';
        document.getElementById('klite-rpmod-custom-role').value = '';
        document.getElementById('klite-rpmod-custom-hp').value = '';
        document.getElementById('klite-rpmod-custom-max-hp').value = '';
        
        modal.classList.remove('hidden');
    },

    hideCustomCharacterModal() {
        const modal = document.getElementById('klite-rpmod-custom-character-modal');
        modal?.classList.add('hidden');
    },

    addCustomCharacter() {
        const name = document.getElementById('klite-rpmod-custom-name').value.trim();
        const type = document.getElementById('klite-rpmod-custom-type').value;
        const role = document.getElementById('klite-rpmod-custom-role').value.trim();
        const hp = parseInt(document.getElementById('klite-rpmod-custom-hp').value) || 10;
        const maxHp = parseInt(document.getElementById('klite-rpmod-custom-max-hp').value) || hp;
        
        if (!name) {
            this.showNotification('Please enter a name', 'error');
            return;
        }
        
        this.addParticipant({
            name: name,
            type: type,
            role: role,
            active: true,
            initiative: this.initiativeMode ? this.rollDice(10, 2) : 0,
            hp: hp,
            maxHp: maxHp,
            portrait: null,
            statuses: []
        });
        
        this.hideCustomCharacterModal();
        
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
    },

    addParticipant(participant) {
        if (this.activeCharacters.find(c => c.name === participant.name)) {
            this.showNotification(`${participant.name} is already in the encounter!`, 'warning');
            return;
        }
        
        this.activeCharacters.push(participant);
        this.updateParticipantList();
        this.saveCharactersToStorage();
        
        if (this.activeCharacters.length === 1) {
            this.currentTurn = 0;
            this.updateCurrentSpeaker();
        }
        
        // Generate context for NPCs and monsters
        if (participant.type !== 'pc') {
            this.updateEncounterContext();
        }
    },

    removeParticipant(index) {
        const participant = this.activeCharacters[index];
        if (confirm(`Remove ${participant.name} from the encounter?`)) {
            this.activeCharacters.splice(index, 1);
            
            if (this.currentTurn >= this.activeCharacters.length) {
                this.currentTurn = 0;
            } else if (index < this.currentTurn) {
                this.currentTurn--;
            }
            
            this.updateParticipantList();
            this.updateCurrentSpeaker();
            this.saveCharactersToStorage();
            this.updateEncounterContext();
        }
    },

    advanceToNextSpeaker() {
        if (this.activeCharacters.length === 0) return;
        
        // Store the current speaker as last speaker
        this.lastSpeakerIndex = this.currentTurn;
        
        // Advance based on mode
        switch(this.advanceMode) {
            case 'random':
                const activeIndices = this.activeCharacters
                    .map((char, idx) => char.active ? idx : -1)
                    .filter(idx => idx !== -1);
                if (activeIndices.length > 0) {
                    this.currentTurn = activeIndices[Math.floor(Math.random() * activeIndices.length)];
                }
                break;
                
            case 'round-robin':
            case 'initiative':
                let attempts = 0;
                do {
                    this.currentTurn = (this.currentTurn + 1) % this.activeCharacters.length;
                    attempts++;
                    if (attempts >= this.activeCharacters.length) {
                        if (this.currentTurn === 0) {
                            this.combatRound++;
                            document.getElementById('klite-rpmod-combat-round').textContent = this.combatRound;
                        }
                        break;
                    }
                } while (!this.activeCharacters[this.currentTurn].active);
                break;
        }
        
        this.updateCurrentSpeaker();
        this.updateParticipantList();
        this.saveGroupState();
        
        // Check if next speaker is NPC/Monster and trigger their response
        const nextSpeaker = this.activeCharacters[this.currentTurn];
        if (nextSpeaker && (nextSpeaker.type === 'npc' || nextSpeaker.type === 'monster')) {
            setTimeout(() => {
                this.handleNPCResponse(nextSpeaker, this.currentTurn);
            }, 500);
        }
    },

    handleNPCResponse(participant, index) {
        console.log('Handling NPC response for:', participant.name);
        
        // Build the prompt for the NPC
        let npcPrompt = '';
        
        // Add character context
        if (participant.type === 'npc') {
            npcPrompt = `\n[${participant.name}`;
            if (participant.role) {
                npcPrompt += ` (${participant.role})`;
            }
            npcPrompt += ' speaks next]\n';
            npcPrompt += `${participant.name}: `;
        } else if (participant.type === 'monster') {
            npcPrompt = `\n[${participant.name}`;
            if (participant.role) {
                npcPrompt += ` (${participant.role})`;
            }
            if (participant.hp !== undefined) {
                npcPrompt += ` HP: ${participant.hp}/${participant.maxHp}`;
            }
            if (participant.statuses && participant.statuses.length > 0) {
                npcPrompt += `, ${participant.statuses.join(', ')}`;
            }
            npcPrompt += ' acts]\n';
            npcPrompt += `${participant.name}: `;
        }
        
        // Get the input field
        const inputField = document.getElementById('input_text');
        const rpmodInput = document.getElementById('klite-rpmod-input');
        
        if (inputField || rpmodInput) {
            // Save current input
            const currentInput = (inputField ? inputField.value : '') || (rpmodInput ? rpmodInput.value : '');
            
            // Set NPC prompt in both fields
            if (inputField) inputField.value = npcPrompt;
            if (rpmodInput) rpmodInput.value = npcPrompt;
            
            // Trigger generation after a short delay
            setTimeout(() => {
                if (typeof button_send === 'function') {
                    button_send();
                } else if (window.KLITE_RPMod && typeof window.KLITE_RPMod.handleSend === 'function') {
                    window.KLITE_RPMod.handleSend();
                }
                
                // Clear the input fields after triggering
                setTimeout(() => {
                    if (inputField) inputField.value = '';
                    if (rpmodInput) rpmodInput.value = '';
                }, 100);
            }, 250);
        }
    },

    triggerCharacterResponse(participant, index) {
        // Temporarily set this character as current speaker
        const previousTurn = this.currentTurn;
        this.currentTurn = index;
        
        this.updateCurrentSpeaker();
        this.updateParticipantList();
        
        // Handle the response based on character type
        if (participant.type === 'npc' || participant.type === 'monster') {
            this.handleNPCResponse(participant, index);
        } else {
            // For PCs, just update the context
            this.updateChatContext(participant);
            console.log('Ready for player input as:', participant.name);
        }
    },

    updateCurrentSpeaker() {
        const currentEl = document.getElementById('klite-rpmod-current-speaker');
        const nextEl = document.getElementById('klite-rpmod-next-speaker');
        
        if (this.activeCharacters.length > 0 && this.currentTurn < this.activeCharacters.length) {
            const current = this.activeCharacters[this.currentTurn];
            currentEl.textContent = current.name;
            
            const nextIndex = this.getNextSpeakerIndex();
            if (nextIndex !== -1) {
                nextEl.textContent = this.activeCharacters[nextIndex].name;
            } else {
                nextEl.textContent = '—';
            }
            
            this.updateChatContext(current);
        } else {
            currentEl.textContent = '—';
            nextEl.textContent = '—';
        }
    },

    updateEncounterContext() {
        // Build context for NPCs and monsters
        const npcs = this.activeCharacters.filter(c => c.type === 'npc');
        const monsters = this.activeCharacters.filter(c => c.type === 'monster');
        
        let context = [];
        
        if (npcs.length > 0) {
            context.push('NPCs present: ' + npcs.map(n => `${n.name} (${n.role || 'NPC'})`).join(', '));
        }
        
        if (monsters.length > 0) {
            context.push('Enemies: ' + monsters.map(m => {
                let desc = `${m.name} (${m.role || 'Monster'}, HP: ${m.hp}/${m.maxHp}`;
                if (m.statuses && m.statuses.length > 0) {
                    desc += `, ${m.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        // Update the context field if it's empty
        const contextField = document.getElementById('klite-rpmod-group-context-text');
        if (contextField && !contextField.value && context.length > 0) {
            contextField.value = context.join('\n');
            this.saveGroupContext();
        }
    },

    updateSpeakerContext(previousIndex, currentIndex) {
        const previous = this.activeCharacters[previousIndex];
        const current = this.activeCharacters[currentIndex];
        
        // This would update the AI context to indicate speaker change
        console.log(`Speaker changed from ${previous.name} to ${current.name}`);
    },

    updateChatContext(participant) {
        // Integrate with KoboldAI to update context
        console.log('Setting context for:', participant.name);
        
        if (participant.data && participant.type === 'pc') {
            this.injectCharacterContext(participant.data);
        } else if (participant.type === 'npc' || participant.type === 'monster') {
            this.injectCustomContext(participant);
        }
    },

    injectCharacterContext(characterData) {
        // Load character data into KoboldAI
        console.log('Loading character data:', characterData);
    },

    injectCustomContext(participant) {
        // Create context for NPCs/monsters
        let context = `[${participant.name} is ${participant.role || 'a ' + participant.type}`;
        if (participant.hp !== undefined) {
            context += ` with ${participant.hp}/${participant.maxHp} HP`;
        }
        if (participant.statuses && participant.statuses.length > 0) {
            context += `, currently ${participant.statuses.join(', ')}`;
        }
        context += ']';
        console.log('Injecting context:', context);
    },

    triggerAIGeneration() {
        const current = this.activeCharacters[this.currentTurn];
        console.log('Triggering AI generation for:', current.name);
    },

    saveGroupContext() {
        const contextText = document.getElementById('klite-rpmod-group-context-text').value;
        const status = document.getElementById('klite-rpmod-context-status');
        const tokens = document.getElementById('klite-rpmod-context-tokens');
        
        localStorage.setItem('klite-rpmod-group-context', contextText);
        
        const tokenCount = Math.ceil(contextText.length / 4);
        tokens.textContent = `${tokenCount} tokens`;
        
        status.textContent = 'Saved';
        status.style.color = '#4CAF50';
        
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '';
        }, 2000);
    },

    getAvailableCharacters() {
        // Get characters from the character manager
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        
        if (charManager && charManager.instance && charManager.instance.characters) {
            // Access the characters array directly from the instance
            const characters = charManager.instance.characters;
            
            if (characters && Array.isArray(characters)) {
                // Process and return characters with proper structure
                return characters.map(char => ({
                    name: char.name || 'Unknown',
                    portrait: char.image || char.rawData?._imageData || '',
                    type: 'pc',
                    rating: char.rating || 0,
                    tags: char.tags || [],
                    creator: char.creator || 'Unknown',
                    description: char.description || '',
                    rawData: char.rawData || {},
                    tokenCount: Math.ceil((char.description || '').length / 4)
                }));
            }
        }
        
        // Also check for PanelCharacterManager instance (alternative way)
        if (window.PanelCharacterManager && window.PanelCharacterManager.instance) {
            const characters = window.PanelCharacterManager.instance.characters;
            if (characters && Array.isArray(characters)) {
                return characters.map(char => ({
                    name: char.name || 'Unknown',
                    portrait: char.image || char.rawData?._imageData || '',
                    type: 'pc',
                    rating: char.rating || 0,
                    tags: char.tags || [],
                    creator: char.creator || 'Unknown',
                    description: char.description || '',
                    rawData: char.rawData || {},
                    tokenCount: Math.ceil((char.description || '').length / 4)
                }));
            }
        }
        
        // Fallback empty array if no character manager found
        console.log('Character Manager not found or no characters loaded');
        return [];
    },

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    saveCharactersToStorage() {
        try {
            localStorage.setItem('klite-rpmod-group-characters', JSON.stringify(this.activeCharacters));
        } catch (e) {
            console.error('Failed to save group characters:', e);
        }
    },

    saveGroupState() {
        try {
            const state = {
                groupMode: this.groupMode,
                autoAdvanceTurns: this.autoAdvanceTurns,
                responseMode: this.responseMode,
                advanceMode: this.advanceMode,
                currentTurn: this.currentTurn,
                combatRound: this.combatRound,
                initiativeMode: this.initiativeMode
            };
            localStorage.setItem('klite-rpmod-group-state', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save group state:', e);
        }
    },

    loadGroupState() {
        try {
            const savedState = localStorage.getItem('klite-rpmod-group-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                Object.assign(this, state);
            }
            
            const savedChars = localStorage.getItem('klite-rpmod-group-characters');
            if (savedChars) {
                this.activeCharacters = JSON.parse(savedChars);
            }
            
            const savedContext = localStorage.getItem('klite-rpmod-group-context');
            if (savedContext) {
                const contextEl = document.getElementById('klite-rpmod-group-context-text');
                if (contextEl) {
                    contextEl.value = savedContext;
                }
            }
        } catch (e) {
            console.error('Failed to load group state:', e);
        }
    },

    updateUI() {
        const groupToggle = document.getElementById('klite-rpmod-group-chat-toggle');
        if (groupToggle) groupToggle.checked = this.groupMode;
        
        const autoAdvance = document.getElementById('klite-rpmod-auto-advance');
        if (autoAdvance) autoAdvance.checked = this.autoAdvanceTurns;
        
        const responseMode = document.getElementById('klite-rpmod-response-mode');
        if (responseMode) responseMode.value = this.responseMode;
        
        const advanceMode = document.getElementById('klite-rpmod-advance-mode');
        if (advanceMode) advanceMode.value = this.advanceMode;
        
        const roundEl = document.getElementById('klite-rpmod-combat-round');
        if (roundEl) roundEl.textContent = this.combatRound;
        
        this.updateInitiativeButton();
        this.toggleGroupMode();
        this.updateParticipantList();
        this.updateCurrentSpeaker();
    },

    syncWithKobold() {
        if (this.groupMode && this.activeCharacters.length > 0) {
            console.log('Syncing group mode with KoboldAI');
            
            // Build full context including all NPCs and monsters
            const context = this.buildGroupContext();
            console.log('Group context:', context);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    buildGroupContext() {
        const pcs = this.activeCharacters.filter(c => c.type === 'pc');
        const npcs = this.activeCharacters.filter(c => c.type === 'npc');
        const monsters = this.activeCharacters.filter(c => c.type === 'monster');
        
        let context = [];
        
        if (pcs.length > 0) {
            context.push('Party members: ' + pcs.map(p => p.name).join(', '));
        }
        
        if (npcs.length > 0) {
            context.push('NPCs: ' + npcs.map(n => {
                let desc = `${n.name} (${n.role || 'NPC'}`;
                if (n.statuses && n.statuses.length > 0) {
                    desc += `, ${n.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        if (monsters.length > 0) {
            context.push('Enemies: ' + monsters.map(m => {
                let desc = `${m.name} (${m.role || 'Monster'}, HP: ${m.hp}/${m.maxHp}`;
                if (m.statuses && m.statuses.length > 0) {
                    desc += `, ${m.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        const customContext = document.getElementById('klite-rpmod-group-context-text')?.value;
        if (customContext) {
            context.push(customContext);
        }
        
        return context.join('\n');
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - HELP Panel Implementation
// Help and resources panel with local search
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.HELP = {
    dndIndex: null,
    kbaseIndex: null,
    searchTimeout: null,
    
    load(container, panel) {
        // Create the HELP panel content with proper scrollable structure
        container.innerHTML = `
        <!-- HELP Panel -->
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <div class="klite-rpmod-section-header">
                    <span>RPMod Role-Playing Features</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="font-size: 12px; line-height: 1.6; color: #ccc;">
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Character Cards:</strong> Import character PNG cards with embedded metadata. Supports personality, scenario, and example dialogues for immersive roleplay.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Group Chat:</strong> Run multiple characters simultaneously. Perfect for party dynamics, NPC interactions, or complex scenarios.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Memory System:</strong> Persistent character memory and notes that auto-save. Build long-term campaigns with evolving narratives.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">World Info:</strong> Create detailed worlds with locations, lore, and rules. Characters can reference world entries for consistent storytelling.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Dice Rolling:</strong> Integrated dice notation support (e.g., 1d20+5) for tabletop RPG mechanics.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">AI Behaviors:</strong> Quick preset buttons to switch between narrative styles, from verbose storytelling to concise actions.</p>
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>

                <div class="klite-rpmod-section-header">
                    <span>Quick Reference Icons</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Game Modes -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Game Modes</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">✏️</span>
                                    <span>Edit Mode</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">💬</span>
                                    <span>RP Mode (Instruct)</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">⚔️</span>
                                    <span>Adventure Mode</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">📖</span>
                                    <span>Storywriter Mode</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tools & Features -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Tools & Features</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🖼️</span>
                                    <span>Toggle Fullscreen</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🎨</span>
                                    <span>Image Menu</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🧠</span>
                                    <span>Smart Memory Writer</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">📊</span>
                                    <span>Context Analysis</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Status Indicators -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Status Indicators</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">✍️</span>
                                    <span>Prompt tokens</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🗒️</span>
                                    <span>Chat/story tokens</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🔌</span>
                                    <span>API connection</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">💤</span>
                                    <span>Queue position</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">⏱️</span>
                                    <span>Estimated wait time</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>D&D 5e SRD Reference</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <input type="text" id="dnd-search-input" placeholder="Search spells, monsters, rules, items..." style="width: 100%; margin-bottom: 10px;">
                    <div id="dnd-search-results" style="display: none; max-height: 200px; overflow-y: auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px;">
                        <!-- D&D search results appear here -->
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 10px; font-style: italic;">
                        Searches offline D&D 5e System Reference Document
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Knowledge Base Search</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <input type="text" id="kbase-search-input" placeholder="Search KoboldCpp & Lite documentation..." style="width: 100%; margin-bottom: 10px;">
                    <div id="kbase-search-results" style="display: none; max-height: 200px; overflow-y: auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px;">
                        <!-- Knowledge base search results appear here -->
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 10px; font-style: italic;">
                        Comprehensive offline guide for KoboldCpp and Lite
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Quick References</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <a href="https://github.com/LostRuins/koboldcpp/wiki" target="_blank" style="color: #4a90e2; text-decoration: none; font-weight: bold;">→ KoboldCpp Wiki</a>
                        <a href="https://www.dndbeyond.com/sources/basic-rules" target="_blank" style="color: #4a90e2; text-decoration: none;">→ D&D Basic Rules</a>
                        <a href="https://github.com/LostRuins/koboldcpp/releases" target="_blank" style="color: #4a90e2; text-decoration: none;">→ Latest Releases</a>
                        <a href="https://discord.gg/koboldai" target="_blank" style="color: #4a90e2; text-decoration: none;">→ KoboldAI Discord</a>
                        <a href="https://www.reddit.com/r/KoboldAI/" target="_blank" style="color: #4a90e2; text-decoration: none;">→ KoboldAI Reddit</a>
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Keyboard Shortcuts</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Enter</kbd>
                            <span style="color: #999; margin-left: 8px;">Submit</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">R</kbd>
                            <span style="color: #999; margin-left: 8px;">Retry</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Z</kbd>
                            <span style="color: #999; margin-left: 8px;">Undo/Back</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Y</kbd>
                            <span style="color: #999; margin-left: 8px;">Redo</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">A</kbd>
                            <span style="color: #999; margin-left: 8px;">Abort</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">E</kbd>
                            <span style="color: #999; margin-left: 8px;">Toggle Edit</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">M</kbd>
                            <span style="color: #999; margin-left: 8px;">Memory Panel</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">C</kbd>
                            <span style="color: #999; margin-left: 8px;">Character Panel</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">U</kbd>
                            <span style="color: #999; margin-left: 8px;">Toggle UI Mode</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Tab</kbd>
                            <span style="color: #999; margin-left: 8px;">Switch Input Focus</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Initialize indices and search
        this.initializeIndices();
        this.initializeSearch();
        
        // Add hover effects
        this.addLinkHoverEffects();
    },
    
    initializeIndices() {
        // Initialize D&D 5e SRD Index
        this.dndIndex = {
            entries: [
                // Core Rules
                {
                    title: "Ability Scores",
                    category: "Core Rules",
                    content: "The six ability scores are Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Modifiers range from -5 (score 1) to +10 (score 30). Standard array: 15, 14, 13, 12, 10, 8.",
                    keywords: ["ability", "scores", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "modifiers"]
                },
                {
                    title: "Advantage and Disadvantage",
                    category: "Core Rules",
                    content: "Roll 2d20 and take the higher (advantage) or lower (disadvantage) result. Multiple instances don't stack. If you have both, they cancel out.",
                    keywords: ["advantage", "disadvantage", "roll", "2d20", "mechanics"]
                },
                {
                    title: "Proficiency Bonus",
                    category: "Core Rules",
                    content: "Starts at +2 at level 1. Increases: +3 (level 5), +4 (level 9), +5 (level 13), +6 (level 17). Applied to attack rolls, ability checks, and saving throws you're proficient in.",
                    keywords: ["proficiency", "bonus", "level", "progression"]
                },
                {
                    title: "Actions in Combat",
                    category: "Combat",
                    content: "Attack, Cast a Spell, Dash (double movement), Dodge (attacks have disadvantage), Help (give ally advantage), Hide, Ready (prepare action), Search, Use an Object.",
                    keywords: ["actions", "combat", "attack", "dash", "dodge", "help", "hide", "ready", "search"]
                },
                {
                    title: "Conditions",
                    category: "Core Rules",
                    content: "Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.",
                    keywords: ["conditions", "status", "effects", "blinded", "charmed", "frightened", "paralyzed", "stunned"]
                },
                
                // Common Spells
                {
                    title: "Fireball",
                    category: "Spell",
                    content: "3rd level evocation. Range: 150 feet. 20-foot radius sphere. 8d6 fire damage, Dexterity save for half. Damage increases by 1d6 per slot above 3rd.",
                    keywords: ["fireball", "spell", "evocation", "3rd", "level", "fire", "damage", "area", "aoe"]
                },
                {
                    title: "Cure Wounds",
                    category: "Spell",
                    content: "1st level evocation. Touch range. Restore 1d8 + spellcasting modifier hit points. No effect on undead or constructs. +1d8 per slot above 1st.",
                    keywords: ["cure", "wounds", "healing", "spell", "evocation", "1st", "level", "touch"]
                },
                {
                    title: "Mage Armor",
                    category: "Spell",
                    content: "1st level abjuration. Touch range. 8 hours duration. AC becomes 13 + Dex modifier if not wearing armor. Ends if target dons armor.",
                    keywords: ["mage", "armor", "spell", "abjuration", "1st", "level", "ac", "defense"]
                },
                {
                    title: "Shield",
                    category: "Spell",
                    content: "1st level abjuration. Reaction spell. +5 bonus to AC until start of next turn, including against triggering attack. No damage from magic missile.",
                    keywords: ["shield", "spell", "abjuration", "1st", "level", "reaction", "ac", "defense"]
                },
                {
                    title: "Counterspell",
                    category: "Spell",
                    content: "3rd level abjuration. Reaction when creature within 60 feet casts a spell. Automatically stops spells 3rd level or lower. Higher requires ability check DC 10 + spell level.",
                    keywords: ["counterspell", "spell", "abjuration", "3rd", "level", "reaction", "counter"]
                },
                
                // Common Monsters
                {
                    title: "Goblin",
                    category: "Monster",
                    content: "Small humanoid. AC 15, HP 7 (2d6). Speed 30 ft. Nimble Escape: Disengage or Hide as bonus action. Scimitar +4 (1d6+2). Shortbow +4 (1d6+2).",
                    keywords: ["goblin", "monster", "humanoid", "small", "cr", "nimble", "escape"]
                },
                {
                    title: "Orc",
                    category: "Monster",
                    content: "Medium humanoid. AC 13, HP 15 (2d8+6). Speed 30 ft. Aggressive: Bonus action move toward hostile. Greataxe +5 (1d12+3). Javelin +5 (1d6+3).",
                    keywords: ["orc", "monster", "humanoid", "medium", "aggressive", "cr"]
                },
                {
                    title: "Dragon (Young Red)",
                    category: "Monster",
                    content: "Large dragon. AC 18, HP 178 (17d10+85). Fire breath (DC 17, 16d6). Bite +10 (2d10+6 plus 1d6 fire). Frightful Presence DC 16.",
                    keywords: ["dragon", "red", "young", "monster", "large", "fire", "breath", "legendary"]
                },
                {
                    title: "Zombie",
                    category: "Monster",
                    content: "Medium undead. AC 8, HP 22 (3d8+9). Speed 20 ft. Undead Fortitude: Con save to drop to 1 HP instead of 0. Slam +3 (1d6+1).",
                    keywords: ["zombie", "undead", "monster", "medium", "fortitude", "cr"]
                },
                {
                    title: "Skeleton",
                    category: "Monster",
                    content: "Medium undead. AC 13, HP 13 (2d8+4). Vulnerable to bludgeoning. Immune to poison. Shortsword +4 (1d6+2). Shortbow +4 (1d6+2).",
                    keywords: ["skeleton", "undead", "monster", "medium", "vulnerable", "immune", "cr"]
                },
                
                // Magic Items
                {
                    title: "Healing Potion",
                    category: "Magic Item",
                    content: "Potion of Healing restores 2d4+2 hit points. Greater: 4d4+4. Superior: 8d4+8. Supreme: 10d4+20. Action to drink, bonus action to administer.",
                    keywords: ["healing", "potion", "magic", "item", "restore", "hp", "consumable"]
                },
                {
                    title: "Bag of Holding",
                    category: "Magic Item",
                    content: "Holds 500 pounds, up to 64 cubic feet. Weighs 15 pounds. Ruptures if pierced or overloaded. Extradimensional space. Breathing creature suffocates in 10 minutes.",
                    keywords: ["bag", "holding", "magic", "item", "storage", "extradimensional", "space"]
                },
                {
                    title: "+1 Weapon",
                    category: "Magic Item",
                    content: "Uncommon magic weapon. +1 bonus to attack and damage rolls. Overcomes resistance to nonmagical attacks. Can be any weapon type.",
                    keywords: ["+1", "weapon", "magic", "item", "bonus", "attack", "damage", "enchantment"]
                },
                
                // Character Creation
                {
                    title: "Races Overview",
                    category: "Character Creation",
                    content: "Human (+1 all), Elf (+2 Dex), Dwarf (+2 Con), Halfling (+2 Dex), Dragonborn (+2 Str, +1 Cha), Gnome (+2 Int), Half-Elf (+2 Cha, +1 two others), Half-Orc (+2 Str, +1 Con), Tiefling (+2 Cha, +1 Int).",
                    keywords: ["races", "human", "elf", "dwarf", "halfling", "dragonborn", "gnome", "tiefling", "creation"]
                },
                {
                    title: "Classes Overview",
                    category: "Character Creation",
                    content: "Barbarian (d12 HP), Bard (d8), Cleric (d8), Druid (d8), Fighter (d10), Monk (d8), Paladin (d10), Ranger (d10), Rogue (d8), Sorcerer (d6), Warlock (d8), Wizard (d6).",
                    keywords: ["classes", "barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"]
                },
                {
                    title: "Ability Score Generation",
                    category: "Character Creation",
                    content: "Standard Array: 15, 14, 13, 12, 10, 8. Point Buy: 27 points, all scores start at 8. Rolling: 4d6 drop lowest, six times. Assign as desired.",
                    keywords: ["ability", "score", "generation", "array", "point", "buy", "rolling", "creation"]
                }
            ]
        };
        
        // Initialize KoboldCpp/Lite Knowledge Base Index
        this.kbaseIndex = {
            entries: [
                // KoboldCpp Basics
                {
                    title: "Starting KoboldCpp",
                    category: "Getting Started",
                    content: "Run koboldcpp.exe or use command line. Basic usage: koboldcpp --model [modelfile.gguf] --contextsize 4096 --gpulayers 20. Use --help for all options.",
                    keywords: ["start", "koboldcpp", "run", "launch", "command", "line", "basic"]
                },
                {
                    title: "Model Loading",
                    category: "Models",
                    content: "Supports GGUF format (recommended), legacy GGML. Use --model flag. GPU acceleration with --gpulayers. Split large models with --tensor_split. Quantization affects quality/speed.",
                    keywords: ["model", "loading", "gguf", "ggml", "gpu", "layers", "quantization", "tensor", "split"]
                },
                {
                    title: "Context Size",
                    category: "Settings",
                    content: "Set with --contextsize or -c. Default 2048. Higher = more memory usage but longer conversations. Common values: 2048, 4096, 8192, 16384. Match model training.",
                    keywords: ["context", "size", "memory", "contextsize", "length", "conversation"]
                },
                {
                    title: "GPU Acceleration",
                    category: "Performance",
                    content: "--gpulayers N offloads N layers to GPU. Use --usecublas for NVIDIA, --useclblast for AMD/Intel. Check VRAM usage. Partial offloading supported.",
                    keywords: ["gpu", "acceleration", "gpulayers", "cublas", "clblast", "vram", "nvidia", "amd"]
                },
                
                // Sampling Parameters
                {
                    title: "Temperature",
                    category: "Sampling",
                    content: "Controls randomness. 0.1 = very deterministic, 2.0 = very random. Default 0.7. For RP: 0.8-1.2. For coherent: 0.3-0.7. Affects creativity vs consistency.",
                    keywords: ["temperature", "sampling", "randomness", "creativity", "deterministic", "parameter"]
                },
                {
                    title: "Top-P (Nucleus Sampling)",
                    category: "Sampling", 
                    content: "Cumulative probability cutoff. 0.9 = top 90% probable tokens. Lower = more focused. Works with temperature. Common: 0.9-0.95. Set to 1.0 to disable.",
                    keywords: ["top-p", "top_p", "nucleus", "sampling", "probability", "cutoff", "parameter"]
                },
                {
                    title: "Top-K",
                    category: "Sampling",
                    content: "Limits token choices to K most likely. 40 = consider top 40 tokens. Lower = more predictable. 0 = disabled. Often combined with Top-P.",
                    keywords: ["top-k", "top_k", "sampling", "tokens", "choices", "limit", "parameter"]
                },
                {
                    title: "Repetition Penalty",
                    category: "Sampling",
                    content: "Reduces repetition. 1.0 = no penalty. 1.1-1.3 common. Too high causes incoherence. Repetition penalty range sets how far back to check.",
                    keywords: ["repetition", "penalty", "repeat", "sampling", "range", "parameter"]
                },
                {
                    title: "Mirostat",
                    category: "Sampling",
                    content: "Alternative sampling for consistent quality. Mirostat 2 recommended. Set tau (target entropy). Replaces temperature/top-k/top-p when enabled.",
                    keywords: ["mirostat", "sampling", "tau", "entropy", "alternative", "parameter"]
                },
                
                // Lite Interface
                {
                    title: "Lite UI Overview",
                    category: "Interface",
                    content: "Minimal web interface. Access via browser at localhost:5001. Mobile friendly. Features: chat, settings, model info. Use lite.html for classic version.",
                    keywords: ["lite", "ui", "interface", "web", "browser", "localhost", "mobile"]
                },
                {
                    title: "Memory and Author's Note",
                    category: "Features",
                    content: "Memory: Persistent info at context start. Author's Note: Injected at specified depth. Use for character traits, world state, style guidance. Token budget aware.",
                    keywords: ["memory", "author", "note", "authors", "persistent", "injection", "depth"]
                },
                {
                    title: "World Info",
                    category: "Features",
                    content: "Triggered by keywords. Each entry has keys, content, and settings. Scan depth determines how far to search. Selective activation saves tokens. Import/export JSON.",
                    keywords: ["world", "info", "wi", "entries", "keywords", "triggers", "selective", "scan"]
                },
                {
                    title: "Instruct Mode",
                    category: "Features",
                    content: "For instruction-tuned models. Configure template, system prompt, sequences. Common formats: Alpaca, Vicuna, ChatML. Enable for better instruction following.",
                    keywords: ["instruct", "mode", "instruction", "template", "system", "prompt", "format"]
                },
                {
                    title: "Adventure Mode",
                    category: "Features",
                    content: "Second-person narration for text adventures. You do/say format. Automatic formatting. Good for dungeon crawls, interactive fiction. Toggle in settings.",
                    keywords: ["adventure", "mode", "second", "person", "narration", "text", "interactive"]
                },
                
                // Advanced Features
                {
                    title: "Smart Context",
                    category: "Advanced",
                    content: "Automatically manages context to fit limits. Trims oldest messages while preserving recent context, memory, world info. Configure retention settings.",
                    keywords: ["smart", "context", "management", "trim", "retention", "automatic"]
                },
                {
                    title: "Token Streaming",
                    category: "Advanced",
                    content: "See tokens as generated. Enable with --stream. Reduces perceived latency. May affect performance slightly. Works with all frontends.",
                    keywords: ["token", "streaming", "stream", "real-time", "generation", "latency"]
                },
                {
                    title: "API Endpoints",
                    category: "API",
                    content: "/api/v1/generate - Main generation. /api/v1/model - Model info. /api/extra/tokencount - Count tokens. Compatible with various frontends.",
                    keywords: ["api", "endpoints", "generate", "model", "tokencount", "rest", "http"]
                },
                {
                    title: "Multi-user Mode",
                    category: "Advanced",
                    content: "Enable with --multiuser. Separate sessions per user. Good for shared instances. Each user has own context. Password protection available.",
                    keywords: ["multiuser", "multi-user", "shared", "sessions", "password", "instance"]
                },
                
                // Troubleshooting
                {
                    title: "Out of Memory",
                    category: "Troubleshooting",
                    content: "Reduce context size, lower GPU layers, use smaller model, enable 8-bit cache. Check VRAM with nvidia-smi or GPU-Z. Consider quantized models.",
                    keywords: ["memory", "oom", "vram", "error", "troubleshoot", "gpu", "ram"]
                },
                {
                    title: "Slow Generation",
                    category: "Troubleshooting",
                    content: "Increase GPU layers, reduce context size, disable smart context, use faster sampler settings. Check CPU/GPU usage. Consider smaller model.",
                    keywords: ["slow", "performance", "speed", "generation", "optimize", "troubleshoot"]
                },
                {
                    title: "Connection Issues",
                    category: "Troubleshooting",
                    content: "Check firewall, use --host 0.0.0.0 for network access, verify port not in use. Default port 5001. Use --port to change. Check localhost vs IP.",
                    keywords: ["connection", "network", "firewall", "port", "host", "access", "troubleshoot"]
                },
                
                // RPMod Specific
                {
                    title: "RPMod Overview",
                    category: "RPMod",
                    content: "Enhanced Lite UI for roleplay. Features: character cards, group chat, dice rolling, persistent memory, world info integration. Optimized for narrative gameplay.",
                    keywords: ["rpmod", "roleplay", "mod", "enhanced", "features", "overview"]
                },
                {
                    title: "Character Cards",
                    category: "RPMod",
                    content: "Import PNG cards with embedded JSON. Supports name, description, personality, scenario, examples. Drag & drop or use import button. Compatible with various formats.",
                    keywords: ["character", "cards", "png", "import", "json", "embedded", "rpmod"]
                },
                {
                    title: "Group Chat",
                    category: "RPMod",
                    content: "Multiple characters in one conversation. Set active character, manage turn order. Each character maintains personality. Good for party dynamics.",
                    keywords: ["group", "chat", "multiple", "characters", "party", "rpmod"]
                },
                {
                    title: "Dice Integration",
                    category: "RPMod",
                    content: "Type dice notation in chat. Supports complex rolls: 1d20+5, 3d6, 2d10+1d4. Results shown inline. Can trigger on keywords for automatic rolls.",
                    keywords: ["dice", "rolling", "d20", "notation", "tabletop", "rpg", "rpmod"]
                }
            ]
        };
    },

    initializeSearch() {
        // D&D Search
        const dndInput = document.getElementById('dnd-search-input');
        const dndResults = document.getElementById('dnd-search-results');
        
        if (dndInput) {
            dndInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                if (e.target.value.length > 2) {
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(e.target.value, 'dnd', dndResults);
                    }, 300);
                } else {
                    dndResults.style.display = 'none';
                }
            });
            
            dndInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value, 'dnd', dndResults);
                }
            });
        }
        
        // Knowledge Base Search
        const kbaseInput = document.getElementById('kbase-search-input');
        const kbaseResults = document.getElementById('kbase-search-results');
        
        if (kbaseInput) {
            kbaseInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                if (e.target.value.length > 2) {
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(e.target.value, 'kbase', kbaseResults);
                    }, 300);
                } else {
                    kbaseResults.style.display = 'none';
                }
            });
            
            kbaseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value, 'kbase', kbaseResults);
                }
            });
        }
    },

    showEntryModal(title, content, category) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('klite-rpmod-help-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'klite-rpmod-help-modal';
            modal.className = 'klite-rpmod-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            `;
            
            modal.innerHTML = `
                <div class="klite-rpmod-modal-content" style="
                    background: #2a2a2a;
                    border: 1px solid #555;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    margin: 20px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <h3 id="klite-rpmod-help-modal-title" style="margin: 0; color: #fff; font-size: 18px;"></h3>
                            <div id="klite-rpmod-help-modal-category" style="color: #4a90e2; font-size: 12px; margin-top: 4px;"></div>
                        </div>
                        <button class="klite-rpmod-button" onclick="this.closest('.klite-rpmod-modal').style.opacity='0'; this.closest('.klite-rpmod-modal').style.visibility='hidden';" style="
                            background: #666;
                            border: none;
                            color: #fff;
                            width: 30px;
                            height: 30px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-left: 15px;
                        ">×</button>
                    </div>
                    <div id="klite-rpmod-help-modal-content" style="color: #e0e0e0; line-height: 1.6; font-size: 14px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.opacity = '0';
                    modal.style.visibility = 'hidden';
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.visibility === 'visible') {
                    modal.style.opacity = '0';
                    modal.style.visibility = 'hidden';
                }
            });
        }
        
        // Update content
        document.getElementById('klite-rpmod-help-modal-title').textContent = title;
        document.getElementById('klite-rpmod-help-modal-category').textContent = category;
        document.getElementById('klite-rpmod-help-modal-content').innerHTML = content;
        
        // Show modal
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    },

    performSearch(query, indexType, resultsContainer) {
        if (!query.trim()) return;
        
        const index = indexType === 'dnd' ? this.dndIndex : this.kbaseIndex;
        const results = this.searchIndex(query.toLowerCase(), index);
        this.displayResults(results, query, resultsContainer);
    },

    searchIndex(query, index) {
        const results = [];
        const queryWords = query.split(/\s+/);

        index.entries.forEach(entry => {
            let score = 0;
            
            // Title match (highest priority)
            if (entry.title.toLowerCase().includes(query)) {
                score += 10;
            }
            
            // Category match
            if (entry.category.toLowerCase().includes(query)) {
                score += 5;
            }
            
            // Content match
            if (entry.content.toLowerCase().includes(query)) {
                score += 3;
            }
            
            // Keyword matches
            queryWords.forEach(word => {
                if (entry.keywords.some(keyword => keyword.includes(word))) {
                    score += 2;
                }
            });

            if (score > 0) {
                results.push({ ...entry, score });
            }
        });

        // Sort by score and limit results
        return results.sort((a, b) => b.score - a.score).slice(0, 15);
    },

    displayResults(results, query, container) {
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; opacity: 0.7;">
                    No results found for "${this.escapeHtml(query)}"
                </div>
            `;
        } else {
            // Group results by category
            const grouped = {};
            results.forEach(result => {
                if (!grouped[result.category]) {
                    grouped[result.category] = [];
                }
                grouped[result.category].push(result);
            });
            
            let html = '';
            Object.entries(grouped).forEach(([category, items]) => {
                html += `<div style="margin-bottom: 15px;">
                    <div style="color: #4a90e2; font-size: 11px; text-transform: uppercase; margin-bottom: 5px;">${category}</div>`;
                
                items.forEach((result, idx) => {
                    html += `
                        <div class="search-result-item" data-title="${this.escapeHtml(result.title)}" data-content="${this.escapeHtml(result.content)}" data-category="${this.escapeHtml(result.category)}" style="margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; cursor: pointer; transition: background 0.2s;" 
                             onmouseover="this.style.background='#252525'" 
                             onmouseout="this.style.background='#1a1a1a'">
                            <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 13px;">
                                ${this.highlightQuery(this.escapeHtml(result.title), query)}
                            </h4>
                            <p style="margin: 0; color: #ccc; font-size: 12px; line-height: 1.4;">
                                ${this.highlightQuery(this.truncateContent(this.escapeHtml(result.content)), query)}
                            </p>
                        </div>
                    `;
                });
                
                html += '</div>';
            });
            
            container.innerHTML = html;
            
            // Add click handlers to search results
            const resultItems = container.querySelectorAll('.search-result-item');
            resultItems.forEach(item => {
                item.addEventListener('click', () => {
                    const title = item.getAttribute('data-title');
                    const content = item.getAttribute('data-content');
                    const category = item.getAttribute('data-category');
                    this.showEntryModal(title, content, category);
                });
            });
        }
        
        container.style.display = 'block';
    },

    highlightQuery(text, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, '<mark style="background: #4a90e2; color: #fff; padding: 0 2px; border-radius: 2px;">$1</mark>');
    },

    truncateContent(content, maxLength = 120) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    addLinkHoverEffects() {
        const links = document.querySelectorAll('.klite-rpmod-panel-content a');
        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.textDecoration = 'underline';
            });
            link.addEventListener('mouseleave', () => {
                link.style.textDecoration = 'none';
            });
        });
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
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
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
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
                            background: rgba(0,0,0,0.3);
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
                            background: rgba(0,0,0,0.3);
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

console.log('✅ KLITE MEMORY Panel loaded');// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
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
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
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
        let notes = '';
        
        // Personal notes are stored in localsettings.notebox
        if (typeof localsettings !== 'undefined' && localsettings.notebox !== undefined) {
            notes = localsettings.notebox;
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
            // Update localsettings
            if (typeof localsettings !== 'undefined') {
                localsettings.notebox = content;
                
                // Save to persistent storage
                if (typeof save_settings === 'function') {
                    save_settings();
                }
            }
            
            // If we need to update the hidden textarea for compatibility
            const notesTextarea = document.getElementById('inputboxcontainerinputarea');
            if (notesTextarea) {
                notesTextarea.value = content;
            }
            
        } finally {
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

console.log('✅ KLITE NOTES Panel loaded');// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - WI Panel Implementation
// Direct embedding approach with auto-save functionality
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.WI = {
    initialized: false,
    saveTimer: null,
    observer: null,
    autosaveTimer: null,
    originalFunctions: null,
    
    load(container, panel) {
        console.log('🌍 Loading WI panel...');
        
        // Show loading state
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                        <div>Initializing World Info...</div>
                    </div>
                </div>
            </div>
        </div>        
        `;
        
        // Initialize WI after a short delay
        setTimeout(() => {
            this.initializeWI(container);
        }, 100);
    },
    
    initializeWI(container) {
        // First ensure current_wi is loaded from localsettings if needed
        if (typeof current_wi === 'undefined' || !current_wi) {
            if (typeof localsettings !== 'undefined' && localsettings.worldinfo) {
                window.current_wi = localsettings.worldinfo;
                console.log('📚 Loaded WI from localsettings:', current_wi.length, 'entries');
            } else {
                window.current_wi = [];
                console.log('📚 Initialized empty WI array');
            }
        }
        
        // Check if WI container exists
        let wiContainer = document.getElementById('wi_tab_container');
        
        if (!wiContainer) {
            // Try to initialize WI
            if (typeof btn_wi === 'function') {
                try {
                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'wi_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                    
                    btn_wi();
                    
                    wiContainer = document.getElementById('wi_tab_container');
                } catch (e) {
                    console.error('Failed to initialize WI:', e);
                }
            }
            
            if (!wiContainer) {
                container.innerHTML = `
                <div class="klite-rpmod-panel-wrapper">
                    <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6666; padding: 20px;">
                            <div style="text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                                <div style="font-size: 18px; margin-bottom: 10px;">World Info Unavailable</div>
                                <div style="color: #999;">Please load a story first to use World Info.</div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
                return;
            }
        }
        
        // Ensure WI editing mode is properly initialized
        if (typeof start_editing_wi === 'function') {
            try {
                start_editing_wi();
                console.log('📝 Started WI editing mode');
            } catch (e) {
                console.warn('Could not start WI editing mode:', e);
            }
        }
        
        // Clear the container and prepare for WI
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
                <div class="klite-rpmod-panel klite-rpmod-panel-wi" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="padding: 10px 15px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin: 0; color: #e0e0e0; font-size: 16px;">🌍 World Info</h3>
                        <span id="klite-rpmod-wi-save-status" style="
                            color: #999;
                            font-size: 12px;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                        ">✓ Auto-saved</span>
                    </div>
                    <div id="klite-rpmod-wi-content" style="flex: 1; overflow-y: auto; padding: 10px;">
                        <!-- WI will be embedded here -->
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Move WI container into our panel
        const contentDiv = document.getElementById('klite-rpmod-wi-content');
        if (contentDiv && wiContainer) {
            // Store original styles
            this.originalDisplay = wiContainer.style.display;
            this.originalVisibility = wiContainer.style.visibility;
            this.originalWidth = wiContainer.style.width;
            
            // Show and style the WI container
            wiContainer.style.display = 'block';
            wiContainer.style.visibility = 'visible';
            wiContainer.style.width = '100%';
            wiContainer.classList.remove('hidden');
            
            // Remove any inline height restrictions
            wiContainer.style.height = 'auto';
            wiContainer.style.maxHeight = 'none';
            
            // Move it to our panel
            contentDiv.appendChild(wiContainer);
            
            // Update WI display
            if (typeof update_wi === 'function') {
                setTimeout(() => {
                    try {
                        update_wi();
                        console.log('🔄 WI display updated');
                        // Set up auto-save after WI is loaded
                        this.setupAutoSave();
                    } catch (e) {
                        console.warn('Error updating WI:', e);
                        this.setupAutoSave();
                    }
                }, 100);
            } else {
                // Fallback: still set up auto-save
                this.setupAutoSave();
            }
            
            this.initialized = true;
        }
    },
    
    setupAutoSave() {
        console.log('🔄 Setting up WI auto-save...');
        
        // Function to trigger save
        const triggerSave = () => {
            // Clear existing timer
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            // Show saving indicator
            const status = document.getElementById('klite-rpmod-wi-save-status');
            if (status) {
                status.textContent = '⏳ Saving...';
                status.style.opacity = '1';
            }
            
            // Set new timer for 1 second delay
            this.saveTimer = setTimeout(() => {
                this.saveWI();
            }, 1000);
        };
        
        // Set up mutation observer for dynamic content
        const wiContent = document.getElementById('klite-rpmod-wi-content');
        if (wiContent) {
            this.observer = new MutationObserver((mutations) => {
                // Check if we need to reattach listeners
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        this.attachListeners();
                    }
                });
            });
            
            this.observer.observe(wiContent, {
                childList: true,
                subtree: true
            });
        }
        
        // Initial attachment of listeners
        this.attachListeners();
        
        // Override WI manipulation functions to trigger save
        this.overrideWIFunctions(triggerSave);
    },
    
    attachListeners() {
        // Find all WI input elements
        const inputs = document.querySelectorAll('[id^="wikey"], [id^="wikeysec"], [id^="wikeyanti"], [id^="wival"]');
        const selects = document.querySelectorAll('[id^="wirng"]');
        
        // Function to trigger save
        const triggerSave = () => {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            const status = document.getElementById('klite-rpmod-wi-save-status');
            if (status) {
                status.textContent = '⏳ Saving...';
                status.style.opacity = '1';
            }
            
            this.saveTimer = setTimeout(() => {
                this.saveWI();
            }, 1000);
        };
        
        // Add listeners to inputs
        inputs.forEach(input => {
            // Remove existing listeners first
            input.removeEventListener('input', triggerSave);
            input.removeEventListener('change', triggerSave);
            // Add new listeners
            input.addEventListener('input', triggerSave);
            input.addEventListener('change', triggerSave);
        });
        
        // Add listeners to selects
        selects.forEach(select => {
            select.removeEventListener('change', triggerSave);
            select.addEventListener('change', triggerSave);
        });
    },
    
    overrideWIFunctions(triggerSave) {
        // Only override if not already done
        if (this.originalFunctions) return;
        
        // Store original functions
        this.originalFunctions = {
            toggle_wi_enabled: window.toggle_wi_enabled,
            toggle_wi_sk: window.toggle_wi_sk,
            toggle_wi_ck: window.toggle_wi_ck,
            del_wi: window.del_wi,
            add_wi: window.add_wi,
            up_wi: window.up_wi,
            down_wi: window.down_wi
        };
        
        // Override with auto-save versions
        window.toggle_wi_enabled = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.toggle_wi_enabled.call(this, index);
            triggerSave();
            return result;
        };
        
        window.toggle_wi_sk = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.toggle_wi_sk.call(this, index);
            triggerSave();
            return result;
        };
        
        window.toggle_wi_ck = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.toggle_wi_ck.call(this, index);
            triggerSave();
            return result;
        };
        
        window.del_wi = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.del_wi.call(this, index);
            triggerSave();
            return result;
        };
        
        window.add_wi = function() {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.add_wi.call(this);
            setTimeout(() => {
                window.KLITE_RPMod_Panels.WI.attachListeners();
                triggerSave();
            }, 100);
            return result;
        };
        
        window.up_wi = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.up_wi.call(this, index);
            triggerSave();
            return result;
        };
        
        window.down_wi = function(index) {
            const result = window.KLITE_RPMod_Panels.WI.originalFunctions.down_wi.call(this, index);
            triggerSave();
            return result;
        };
    },
    
    saveWI() {
        console.log('💾 Auto-saving WI...');
        
        try {
            // First save current edits to pending_wi_obj
            if (typeof save_wi === 'function') {
                save_wi();
            }
            
            // Then commit changes to current_wi
            if (typeof commit_wi_changes === 'function') {
                commit_wi_changes();
            }
            
            // IMPORTANT: Persist WI data properly
            if (typeof current_wi !== 'undefined') {
                // Store the WI data in localsettings if it exists
                if (typeof localsettings !== 'undefined') {
                    localsettings.worldinfo = current_wi;
                    
                    // Also check if there's a wi_preset_name that needs saving
                    const wiPresetName = document.getElementById('wi_preset_name');
                    if (wiPresetName && wiPresetName.value) {
                        localsettings.wi_preset_name = wiPresetName.value;
                    }
                    
                    // Check for other WI-related settings
                    const wiDepth = document.getElementById('widepth');
                    if (wiDepth) {
                        localsettings.widepth = parseInt(wiDepth.value) || 3;
                    }
                    
                    // Save settings to localStorage
                    if (typeof save_settings === 'function') {
                        save_settings();
                        console.log('✅ WI saved to localsettings and persisted');
                    } else {
                        // Fallback: manually save to localStorage
                        localStorage.setItem('settings', JSON.stringify(localsettings));
                        console.log('✅ WI saved to localStorage (fallback)');
                    }
                }
                
                // Also trigger autosave if available to ensure WI is included in story saves
                if (typeof autosave === 'function') {
                    // Debounce autosave to avoid too frequent saves
                    if (this.autosaveTimer) {
                        clearTimeout(this.autosaveTimer);
                    }
                    this.autosaveTimer = setTimeout(() => {
                        autosave();
                        console.log('✅ Triggered story autosave with WI data');
                    }, 5000); // Wait 5 seconds before autosaving story
                }
            }
            
            // Show save complete
            const status = document.getElementById('klite-rpmod-wi-save-status');
            if (status) {
                status.textContent = '✓ Auto-saved';
                status.style.opacity = '1';
                
                // Fade out after 2 seconds
                setTimeout(() => {
                    status.style.opacity = '0';
                }, 2000);
            }
            
            console.log('✅ WI auto-saved successfully');
        } catch (e) {
            console.error('❌ Error auto-saving WI:', e);
            
            const status = document.getElementById('klite-rpmod-wi-save-status');
            if (status) {
                status.textContent = '❌ Save failed';
                status.style.color = '#ff6666';
                status.style.opacity = '1';
            }
        }
    },
    
    // Cleanup method when switching away from panel
    cleanup() {
        console.log('🧹 Cleaning up WI panel...');
        
        // Save any pending changes
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveWI();
        }
        
        // Clear autosave timer
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
        }
        
        // Restore original functions
        if (this.originalFunctions) {
            Object.keys(this.originalFunctions).forEach(funcName => {
                window[funcName] = this.originalFunctions[funcName];
            });
            this.originalFunctions = null;
        }
        
        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Move WI container back to body if needed
        const wiContainer = document.getElementById('wi_tab_container');
        if (wiContainer && wiContainer.parentElement && wiContainer.parentElement.id === 'klite-rpmod-wi-content') {
            document.body.appendChild(wiContainer);
            
            // Restore original styles
            if (this.originalDisplay !== undefined) {
                wiContainer.style.display = this.originalDisplay;
            }
            if (this.originalVisibility !== undefined) {
                wiContainer.style.visibility = this.originalVisibility;
            }
            if (this.originalWidth !== undefined) {
                wiContainer.style.width = this.originalWidth;
            }
            
            // Re-add hidden class
            wiContainer.classList.add('hidden');
        }
        
        this.initialized = false;
        this.saveTimer = null;
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - TEXTDB Panel Implementation
// Direct embedding approach with auto-save functionality
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.TEXTDB = {
    initialized: false,
    saveTimer: null,
    observer: null,
    autosaveTimer: null,
    originalFunctions: null,
    
    load(container, panel) {
        console.log('📚 Loading TextDB panel...');
        
        // Show loading state
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                        <div>Initializing Text Database...</div>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Initialize TextDB after a short delay
        setTimeout(() => {
            this.initializeTextDB(container);
        }, 100);
    },
    
    initializeTextDB(container) {
        // Check if TextDB container exists
        let textdbContainer = document.getElementById('documentdb_tab_container');
        
        if (!textdbContainer) {
            // Try to initialize TextDB
            if (typeof btn_documentdb === 'function') {
                try {
                    // Create a temporary container
                    const tempContainer = document.createElement('div');
                    tempContainer.id = 'documentdb_tab_container';
                    tempContainer.style.display = 'none';
                    document.body.appendChild(tempContainer);
                    
                    btn_documentdb();
                    
                    textdbContainer = document.getElementById('documentdb_tab_container');
                } catch (e) {
                    console.error('Failed to initialize TextDB:', e);
                }
            }
            
            if (!textdbContainer) {
                container.innerHTML = `
                <div class="klite-rpmod-panel-wrapper">
                    <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6666; padding: 20px;">
                            <div style="text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                                <div style="font-size: 18px; margin-bottom: 10px;">Text Database Unavailable</div>
                                <div style="color: #999;">Please load a story first to use Text Database.</div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
                return;
            }
        }
        
        // Clear the container and prepare for TextDB
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content  klite-rpmod-scrollable">
                <div class="klite-rpmod-panel klite-rpmod-panel-textdb" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="padding: 10px 15px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin: 0; color: #e0e0e0; font-size: 16px;">📚 Text Database</h3>
                        <span id="klite-rpmod-textdb-save-status" style="
                            color: #999;
                            font-size: 12px;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                        ">✓ Auto-saved</span>
                    </div>
                    <div id="klite-rpmod-textdb-content" style="flex: 1; overflow-y: auto; padding: 10px;">
                        <!-- TextDB will be embedded here -->
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Move TextDB container into our panel
        const contentDiv = document.getElementById('klite-rpmod-textdb-content');
        if (contentDiv && textdbContainer) {
            // Store original styles
            this.originalDisplay = textdbContainer.style.display;
            this.originalVisibility = textdbContainer.style.visibility;
            this.originalWidth = textdbContainer.style.width;
            
            // Show and style the TextDB container
            textdbContainer.style.display = 'block';
            textdbContainer.style.visibility = 'visible';
            textdbContainer.style.width = '100%';
            textdbContainer.classList.remove('hidden');
            
            // Remove any inline height restrictions
            textdbContainer.style.height = 'auto';
            textdbContainer.style.maxHeight = 'none';
            
            // Move it to our panel
            contentDiv.appendChild(textdbContainer);
            
            // Update TextDB display
            if (typeof estimate_and_show_textDB_usage === 'function') {
                setTimeout(() => {
                    try {
                        estimate_and_show_textDB_usage();
                        console.log('🔄 TextDB display updated');
                        // Set up auto-save after TextDB is loaded
                        this.setupAutoSave();
                    } catch (e) {
                        console.warn('Error updating TextDB:', e);
                        this.setupAutoSave();
                    }
                }, 100);
            } else {
                // Fallback: still set up auto-save
                this.setupAutoSave();
            }
            
            this.initialized = true;
        }
    },
    
    setupAutoSave() {
        console.log('🔄 Setting up TextDB auto-save...');
        
        // Function to trigger save
        const triggerSave = () => {
            // Clear existing timer
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            // Show saving indicator
            const status = document.getElementById('klite-rpmod-textdb-save-status');
            if (status) {
                status.textContent = '⏳ Saving...';
                status.style.opacity = '1';
            }
            
            // Set new timer for 1 second delay
            this.saveTimer = setTimeout(() => {
                this.saveTextDB();
            }, 1000);
        };
        
        // Set up mutation observer for dynamic content
        const textdbContent = document.getElementById('klite-rpmod-textdb-content');
        if (textdbContent) {
            this.observer = new MutationObserver((mutations) => {
                // Check if we need to reattach listeners
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        this.attachListeners();
                    }
                });
            });
            
            this.observer.observe(textdbContent, {
                childList: true,
                subtree: true
            });
        }
        
        // Initial attachment of listeners
        this.attachListeners();
        
        // Override TextDB manipulation functions to trigger save
        this.overrideTextDBFunctions(triggerSave);
    },
    
    attachListeners() {
        // Find all TextDB input elements
        const inputs = document.querySelectorAll('#documentdb_tab_container input[type="text"], #documentdb_tab_container textarea');
        const buttons = document.querySelectorAll('#documentdb_tab_container button');
        
        // Function to trigger save
        const triggerSave = () => {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            
            const status = document.getElementById('klite-rpmod-textdb-save-status');
            if (status) {
                status.textContent = '⏳ Saving...';
                status.style.opacity = '1';
            }
            
            this.saveTimer = setTimeout(() => {
                this.saveTextDB();
            }, 1000);
        };
        
        // Add listeners to inputs
        inputs.forEach(input => {
            // Remove existing listeners first
            input.removeEventListener('input', triggerSave);
            input.removeEventListener('change', triggerSave);
            // Add new listeners
            input.addEventListener('input', triggerSave);
            input.addEventListener('change', triggerSave);
        });
        
        // Add listeners to certain buttons (add, delete, etc.)
        buttons.forEach(button => {
            const buttonText = button.textContent.toLowerCase();
            if (buttonText.includes('add') || buttonText.includes('delete') || 
                buttonText.includes('remove') || buttonText.includes('clear')) {
                button.removeEventListener('click', triggerSave);
                button.addEventListener('click', () => {
                    setTimeout(triggerSave, 100);
                });
            }
        });
    },
    
    overrideTextDBFunctions(triggerSave) {
        // Only override if not already done
        if (this.originalFunctions) return;
        
        // Store original functions if they exist
        this.originalFunctions = {};
        
        // Look for common TextDB functions to override
        const functionsToOverride = [
            'add_documentdb_entry',
            'delete_documentdb_entry',
            'clear_documentdb',
            'update_documentdb_entry',
            'save_documentdb_data'
        ];
        
        functionsToOverride.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                this.originalFunctions[funcName] = window[funcName];
                window[funcName] = function(...args) {
                    const result = window.KLITE_RPMod_Panels.TEXTDB.originalFunctions[funcName].apply(this, args);
                    triggerSave();
                    return result;
                };
            }
        });
    },
    
    saveTextDB() {
        console.log('💾 Auto-saving TextDB...');
        
        try {
            // Check if there's a save function for TextDB
            if (typeof save_documentdb_data === 'function') {
                save_documentdb_data();
                console.log('✅ Called save_documentdb_data()');
            }
            
            // Save to localsettings if needed
            if (typeof localsettings !== 'undefined') {
                // Check if TextDB data needs to be stored in localsettings
                const textdbData = document.getElementById('documentdb_data');
                if (textdbData && textdbData.value) {
                    localsettings.documentdb_data = textdbData.value;
                }
                
                // Save settings to localStorage
                if (typeof save_settings === 'function') {
                    save_settings();
                    console.log('✅ TextDB saved to localsettings and persisted');
                } else {
                    // Fallback: manually save to localStorage
                    localStorage.setItem('settings', JSON.stringify(localsettings));
                    console.log('✅ TextDB saved to localStorage (fallback)');
                }
            }
            
            // Also trigger autosave if available to ensure TextDB is included in story saves
            if (typeof autosave === 'function') {
                // Debounce autosave to avoid too frequent saves
                if (this.autosaveTimer) {
                    clearTimeout(this.autosaveTimer);
                }
                this.autosaveTimer = setTimeout(() => {
                    autosave();
                    console.log('✅ Triggered story autosave with TextDB data');
                }, 5000); // Wait 5 seconds before autosaving story
            }
            
            // Show save complete
            const status = document.getElementById('klite-rpmod-textdb-save-status');
            if (status) {
                status.textContent = '✓ Auto-saved';
                status.style.opacity = '1';
                
                // Fade out after 2 seconds
                setTimeout(() => {
                    status.style.opacity = '0';
                }, 2000);
            }
            
            console.log('✅ TextDB auto-saved successfully');
        } catch (e) {
            console.error('❌ Error auto-saving TextDB:', e);
            
            const status = document.getElementById('klite-rpmod-textdb-save-status');
            if (status) {
                status.textContent = '❌ Save failed';
                status.style.color = '#ff6666';
                status.style.opacity = '1';
            }
        }
    },
    
    // Cleanup method when switching away from panel
    cleanup() {
        console.log('🧹 Cleaning up TextDB panel...');
        
        // Save any pending changes
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTextDB();
        }
        
        // Clear autosave timer
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
        }
        
        // Restore original functions
        if (this.originalFunctions) {
            Object.keys(this.originalFunctions).forEach(funcName => {
                window[funcName] = this.originalFunctions[funcName];
            });
            this.originalFunctions = null;
        }
        
        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Move TextDB container back to body if needed
        const textdbContainer = document.getElementById('documentdb_tab_container');
        if (textdbContainer && textdbContainer.parentElement && textdbContainer.parentElement.id === 'klite-rpmod-textdb-content') {
            // Get the memory container as reference for proper placement
            const memoryContainer = document.getElementById('memory_tab_container');
            const targetParent = memoryContainer ? memoryContainer.parentElement : document.body;
            
            // Move back to original location
            targetParent.appendChild(textdbContainer);
            
            // Restore original styles
            if (this.originalDisplay !== undefined) {
                textdbContainer.style.display = this.originalDisplay;
            }
            if (this.originalVisibility !== undefined) {
                textdbContainer.style.visibility = this.originalVisibility;
            }
            if (this.originalWidth !== undefined) {
                textdbContainer.style.width = this.originalWidth;
            }
            
            // Re-add hidden class
            textdbContainer.classList.add('hidden');
        }
        
        this.initialized = false;
        this.saveTimer = null;
    }
};// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Event Integration System
// Direct integration with KoboldAI Lite events
// =============================================

window.KLITE_RPMod_EventIntegration = {
    initialized: false,
    originalFunctions: {},
    queuePosition: 0,
    waitTime: 0,
    isHordeConnected: false,
    queueMonitorInterval: null,
    
    init() {
        if (this.initialized) return;
        console.log('🔌 Initializing RPMod Event Integration');
        
        this.hookGenerationEvents();
        this.hookStreamingEvents();
        this.hookQueueEvents();
        this.hookUIEvents();
        this.addSyncMonitor();
        
        this.initialized = true;
    },
    
    hookGenerationEvents() {
        // Hook submit function
        if (typeof window.submit_generation_button === 'function') {
            this.originalFunctions.submit = window.submit_generation_button;
            window.submit_generation_button = (...args) => {
                console.log('🚀 Generation started');
                
                // Update RPMod UI immediately
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = true;
                    KLITE_RPMod.startGenerating();
                }
                
                // Call original
                return this.originalFunctions.submit.apply(window, args);
            };
        }
        
        // Hook abort function
        if (typeof window.abort_generation === 'function') {
            this.originalFunctions.abort = window.abort_generation;
            window.abort_generation = (...args) => {
                console.log('🛑 Generation aborted');
                
                // Reset queue display
                this.resetQueueDisplay();
                
                // Update RPMod UI
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = false;
                    KLITE_RPMod.stopGenerating();
                }
                
                // Call original
                return this.originalFunctions.abort.apply(window, args);
            };
        }
        
        // Hook generation completion
        if (typeof window.getresult === 'function') {
            this.originalFunctions.getresult = window.getresult;
            window.getresult = (data) => {
                console.log('✅ Generation completed');
                
                // Reset queue display
                this.resetQueueDisplay();
                
                // Update RPMod UI
                if (window.KLITE_RPMod) {
                    KLITE_RPMod.buttonState.isGenerating = false;
                    KLITE_RPMod.stopGenerating();
                    
                    // Update token counts
                    KLITE_RPMod.updateStoryTokenCount();
                }
                
                // Call original
                return this.originalFunctions.getresult.call(window, data);
            };
        }
    },
    
    hookStreamingEvents() {
        // Hook SSE streaming
        if (typeof window.sse_listen === 'function') {
            this.originalFunctions.sse_listen = window.sse_listen;
            window.sse_listen = (callback) => {
                const wrappedCallback = (data) => {
                    // Handle streaming in RPMod
                    this.handleStreamingData(data);
                    
                    // Call original callback
                    return callback(data);
                };
                
                return this.originalFunctions.sse_listen.call(window, wrappedCallback);
            };
        }
        
        // Listen for token events
        window.addEventListener('sse:token', (e) => {
            this.handleStreamingData(e.detail);
        });
    },
    
    handleStreamingData(data) {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        if (!chatDisplay) return;
        
        // Find or create streaming message
        let streamingMsg = chatDisplay.querySelector('.streaming-message');
        if (!streamingMsg) {
            streamingMsg = document.createElement('span');
            streamingMsg.className = 'streaming-message';
            streamingMsg.style.cssText = 'display: block; background: #262626; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #333;';
            chatDisplay.appendChild(streamingMsg);
        }
        
        if (data.token) {
            streamingMsg.textContent += data.token;
            
            // Auto-scroll to bottom
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
        
        if (data.final) {
            streamingMsg.classList.remove('streaming-message');
        }
    },
    
    hookQueueEvents() {
        console.log('🔌 Hooking HordeAI queue events (simplified)');
        
        // Store original console.log
        const originalConsoleLog = console.log;
        
        // Intercept console logs to capture queue data
        console.log = (...args) => {
            // Call original console.log first
            originalConsoleLog.apply(console, args);
            
            // Check connection status periodically
            this.checkHordeConnection();
            
            // Only process if we're connected to Horde
            if (!this.isHordeConnected) return;
            
            try {
                const logStr = args.join(' ');
                
                // Look for Horde queue data
                if (logStr.includes('Still awaiting') && logStr.includes('queue_position')) {
                    const jsonMatch = logStr.match(/\{.*\}/);
                    if (jsonMatch) {
                        const data = JSON.parse(jsonMatch[0]);
                        
                        // Update queue position and wait time
                        if (data.queue_position !== undefined) {
                            this.queuePosition = data.queue_position;
                            this.updateQueueDisplay();
                        }
                        if (data.wait_time !== undefined) {
                            this.waitTime = data.wait_time;
                            this.updateQueueDisplay();
                        }
                        
                        // Check if generation is complete
                        if (data.done === true || data.finished > 0) {
                            console.log('Horde reports generation done, resetting queue');
                            setTimeout(() => {
                                this.resetQueueDisplay();
                            }, 100);
                        }
                    }
                }
                
                // Check for various completion indicators
                if (logStr.includes('Generation completed') || 
                    logStr.includes('Generation aborted') ||
                    logStr.includes('async request: finished') ||
                    logStr.includes('SSE stream closed') ||
                    logStr.includes('getresult') ||
                    logStr.includes('✅ Generation completed') ||
                    logStr.includes('🛑 Generation aborted') ||
                    logStr.includes('Stopping generation')) {
                    console.log('Detected generation end, resetting queue display');
                    this.resetQueueDisplay();
                }
            } catch (e) {
                // Silently fail
            }
        };
        
        // Hook into startGenerating to begin monitoring
        if (window.KLITE_RPMod) {
            const originalStart = window.KLITE_RPMod.startGenerating;
            window.KLITE_RPMod.startGenerating = function() {
                console.log('Starting generation, beginning queue monitoring');
                
                // Call original
                if (originalStart) {
                    originalStart.call(window.KLITE_RPMod);
                }
                
                // Start monitoring during generation
                if (window.KLITE_RPMod_EventIntegration.queueMonitorInterval) {
                    clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                }
                
                window.KLITE_RPMod_EventIntegration.queueMonitorInterval = setInterval(() => {
                    window.KLITE_RPMod_EventIntegration.checkHordeConnection();
                    
                    // If not Horde, ensure queue is reset
                    if (!window.KLITE_RPMod_EventIntegration.isHordeConnected) {
                        window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                    }
                    
                    // Check if generation has stopped
                    if (!window.KLITE_RPMod.buttonState.isGenerating) {
                        // If we're not generating but still have queue values, reset them
                        if (window.KLITE_RPMod_EventIntegration.queuePosition !== 0 || 
                            window.KLITE_RPMod_EventIntegration.waitTime !== 0) {
                            console.log('Generation stopped but queue values remain, resetting...');
                            window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                        }
                        // Stop monitoring
                        clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                        window.KLITE_RPMod_EventIntegration.queueMonitorInterval = null;
                    }
                }, 500);
            };
        }
        
        // Hook into stopGenerating to ensure cleanup
        if (window.KLITE_RPMod) {
            const originalStop = window.KLITE_RPMod.stopGenerating;
            window.KLITE_RPMod.stopGenerating = function() {
                // Reset queue when generation stops
                window.KLITE_RPMod_EventIntegration.resetQueueDisplay();
                
                // Stop monitoring interval
                if (window.KLITE_RPMod_EventIntegration.queueMonitorInterval) {
                    clearInterval(window.KLITE_RPMod_EventIntegration.queueMonitorInterval);
                    window.KLITE_RPMod_EventIntegration.queueMonitorInterval = null;
                }
                
                // Call original
                if (originalStop) {
                    originalStop.call(window.KLITE_RPMod);
                }
            };
        }
        
        console.log('✅ HordeAI queue monitoring initialized');
    },
    
    checkHordeConnection() {
        const connectionText = document.getElementById('klite-connection-text');
        if (connectionText) {
            const text = connectionText.textContent.toLowerCase();
            this.isHordeConnected = text.includes('horde') || text.includes('ai horde');
        }
    },
    
    updateQueueDisplay() {
        const queueEl = document.getElementById('klite-queue-position');
        const timeEl = document.getElementById('klite-wait-time');
        
        if (queueEl) {
            queueEl.textContent = `#${this.queuePosition}`;
        }
        
        if (timeEl) {
            timeEl.textContent = `${this.waitTime}s`;
        }
    },
    
    resetQueueDisplay() {
        this.queuePosition = 0;
        this.waitTime = 0;
        this.updateQueueDisplay();
    },
    
    hookUIEvents() {
        // Monitor for Lite UI refreshes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if main container was recreated
                    const mainAdded = Array.from(mutation.addedNodes).some(
                        node => node.id === 'main_container' || node.id === 'gametext'
                    );
                    
                    if (mainAdded) {
                        console.log('🔄 Lite UI recreated, resyncing...');
                        this.resyncWithLite();
                    }
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    },

    addSyncMonitor() {
        // Monitor for changes in Lite UI and sync to RPMod if visible
        const monitorLiteChanges = () => {
            // Only sync if RPMod is visible
            if (document.getElementById('klite-rpmod-container')?.style.display === 'none') {
                return;
            }
            
            // Monitor memory field
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory && !liteMemory.hasAttribute('data-rpmod-monitored')) {
                liteMemory.setAttribute('data-rpmod-monitored', 'true');
                liteMemory.addEventListener('input', () => {
                    const rpmodMemory = document.querySelector('#klite-rpmod-panel-right #memorytext');
                    if (rpmodMemory) {
                        rpmodMemory.value = liteMemory.value;
                    }
                });
            }
            
            // Monitor author's note
            const liteAnote = document.getElementById('anotetext');
            if (liteAnote && !liteAnote.hasAttribute('data-rpmod-monitored')) {
                liteAnote.setAttribute('data-rpmod-monitored', 'true');
                liteAnote.addEventListener('input', () => {
                    const rpmodAnote = document.querySelector('#klite-rpmod-panel-right #anotetext');
                    if (rpmodAnote) {
                        rpmodAnote.value = liteAnote.value;
                    }
                });
            }
        };
        
        // Check periodically for new elements
        setInterval(monitorLiteChanges, 1000);
    },

    resyncWithLite() {
        // Re-sync game text
        if (window.KLITE_RPMod) {
            KLITE_RPMod.syncWithKobold();
        }
        
        // Re-establish event hooks
        setTimeout(() => {
            this.hookGenerationEvents();
        }, 100);
    }
};


// =============================================
// KLITE RP Mod - State Management System
// Handles persistence and hot-reload survival
// =============================================

window.KLITE_RPMod_StateManager = {
    stateKey: 'KLITE_RPMod_FullState',
    autoSaveInterval: null,
    
    init() {
        console.log('🔧 Initializing RPMod State Manager');
        
        // Set up auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveFullState();
        }, 30000);
        
        // Save state before page unload
        window.addEventListener('beforeunload', () => {
            this.saveFullState();
        });
        
        // Listen for Lite's refresh events
        window.addEventListener('kobold:ui_refresh', () => {
            console.log('🔄 Lite UI refresh detected, saving state...');
            this.saveFullState();
        });
        
        // Restore state if available
        const restored = this.restoreFullState();
        if (restored) {
            console.log('✅ State restored from previous session');
            return restored;
        }
        
        return null;
    },
    
    saveFullState() {
        if (!window.KLITE_RPMod) return;
        
        const state = {
            version: '1.0',
            timestamp: Date.now(),
            panels: {
                collapsed: KLITE_RPMod.state.panelsCollapsed,
                activeTabs: KLITE_RPMod.state.activeTabs,
                scrollPositions: this.getScrollPositions()
            },
            ui: {
                isVisible: document.getElementById('klite-rpmod-container')?.style.display !== 'none',
                inputValue: document.getElementById('klite-rpmod-input')?.value || '',
                editMode: document.getElementById('allowediting')?.checked || false,
                mode: typeof localsettings !== 'undefined' ? localsettings.opmode : 3
            },
            generation: {
                isGenerating: KLITE_RPMod.buttonState?.isGenerating || false,
                lastContext: document.getElementById('klite-rpmod-chat-display')?.innerHTML || ''
            },
            session: {
                selectedCharacter: window.KLITE_RPMod_Panels?.CHARS?.instance?.selectedCharacter?.id,
                searchTerm: document.getElementById('char-search-input')?.value || '',
                selectedTag: document.getElementById('char-tag-filter')?.value || '',
                selectedRating: document.getElementById('char-rating-filter')?.value || ''
            }
        };
        
        try {
            localStorage.setItem(this.stateKey, JSON.stringify(state));
            console.log('💾 State saved successfully');
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    },
    
    restoreFullState() {
        const saved = localStorage.getItem(this.stateKey);
        if (!saved) return null;
        
        try {
            const state = JSON.parse(saved);
            
            // Check if state is recent (within 5 minutes)
            if (Date.now() - state.timestamp > 300000) {
                console.log('⏰ Saved state too old, discarding');
                return null;
            }
            
            return state;
        } catch (e) {
            console.error('Failed to restore state:', e);
            return null;
        }
    },
    
    getScrollPositions() {
        const positions = {};
        const scrollableElements = [
            'klite-rpmod-chat-display',
            'klite-rpmod-content-left',
            'klite-rpmod-content-right'
        ];
        
        scrollableElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                positions[id] = {
                    top: element.scrollTop,
                    left: element.scrollLeft
                };
            }
        });
        
        return positions;
    },
    
    restoreScrollPositions(positions) {
        if (!positions) return;
        
        Object.entries(positions).forEach(([id, pos]) => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollTop = pos.top;
                element.scrollLeft = pos.left;
            }
        });
    },
    
    cleanup() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
};

// =============================================
// KLITE RP Mod - Hot Swap Feature with Full Sync
// Toggle between RPMod and Lite UI with Ctrl+Shift+U
// =============================================

window.KLITE_RPMod_HotSwap = {
    // Store original display values
    originalDisplayValues: {
        wi_tab_container: '',
        documentdb_tab_container: ''
    },
    
    // Track container states
    containerStates: {
        wiInitialized: false,
        textdbInitialized: false
    },
    
    init() {
        console.log('🔄 Initializing Hot Swap feature');
        
        // Ensure containers exist from the start
        this.ensureContainersExist();
        
        // Store original display values before any modifications
        const wiContainer = document.getElementById('wi_tab_container');
        const textdbContainer = document.getElementById('documentdb_tab_container');
        
        if (wiContainer) {
            this.originalDisplayValues.wi_tab_container = wiContainer.style.display || '';
        }
        if (textdbContainer) {
            this.originalDisplayValues.documentdb_tab_container = textdbContainer.style.display || '';
        }
        
        // Patch Lite functions to ensure containers persist
        this.patchLiteFunctions();
        
        // Add hotkey listener
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'U') {
                e.preventDefault();
                this.toggleUI();
            }
        });
        
        // Add toggle buttons to both UIs
        this.addToggleButtons();
        
        // Add the fade animation styles
        this.addAnimationStyles();
    },
    
    ensureContainersExist() {
        console.log('🔧 Ensuring WI/TextDB containers exist');
        
        // Helper to create container if needed
        const createContainer = (id, parentId = null) => {
            let container = document.getElementById(id);
            if (!container) {
                console.log(`Creating missing container: ${id}`);
                container = document.createElement('div');
                container.id = id;
                container.className = 'hidden';
                container.style.display = 'none';
                
                // Find parent - try to find memory container's parent
                let parent = null;
                if (parentId) {
                    parent = document.getElementById(parentId);
                } else {
                    // Try to find where Lite normally puts these
                    const memoryContainer = document.getElementById('memory_tab_container');
                    parent = memoryContainer ? memoryContainer.parentElement : document.body;
                }
                
                parent.appendChild(container);
            }
            return container;
        };
        
        // Ensure memory container exists first (it's the parent for others in Lite)
        const memoryContainer = createContainer('memory_tab_container');
        const parentElement = memoryContainer.parentElement || document.body;
        
        // Ensure WI container
        const wiContainer = createContainer('wi_tab_container');
        if (wiContainer.parentElement !== parentElement) {
            parentElement.appendChild(wiContainer);
        }
        
        // Ensure TextDB container
        const textdbContainer = createContainer('documentdb_tab_container');
        if (textdbContainer.parentElement !== parentElement) {
            parentElement.appendChild(textdbContainer);
        }
        
        // Make sure they're properly hidden by default
        [wiContainer, textdbContainer].forEach(container => {
            container.classList.add('hidden');
            container.style.display = 'none';
            container.style.visibility = '';
        });
    },
    
    patchLiteFunctions() {
        console.log('🔧 Patching Lite functions for container persistence');
        
        // Patch display_memory_tab to preserve our containers
        if (typeof display_memory_tab === 'function' && !display_memory_tab._rpmodPatched) {
            const original_display_memory_tab = display_memory_tab;
            
            window.display_memory_tab = function(type) {
                // Always ensure containers exist before Lite tries to use them
                window.KLITE_RPMod_HotSwap.ensureContainersExist();
                
                // Store current RPMod state
                const isRPModActive = document.body.classList.contains('klite-rpmod-active');
                const rpmodState = window.KLITE_RPMod?.state?.activeTabs;
                
                // Call original
                let result;
                try {
                    result = original_display_memory_tab.apply(this, arguments);
                } catch (e) {
                    console.warn('display_memory_tab error:', e);
                }
                
                // If RPMod is active and using these panels, keep them hidden
                if (isRPModActive && rpmodState) {
                    const wiContainer = document.getElementById('wi_tab_container');
                    const textdbContainer = document.getElementById('documentdb_tab_container');
                    
                    if ((rpmodState.right === 'WI' || rpmodState.left === 'WI') && wiContainer) {
                        wiContainer.style.display = 'none';
                        wiContainer.classList.add('hidden');
                    }
                    
                    if ((rpmodState.right === 'TEXTDB' || rpmodState.left === 'TEXTDB') && textdbContainer) {
                        textdbContainer.style.display = 'none';
                        textdbContainer.classList.add('hidden');
                    }
                }
                
                return result;
            };
            
            window.display_memory_tab._rpmodPatched = true;
        }
        
        // Patch initialize_wi to prevent errors
        if (typeof initialize_wi === 'function' && !initialize_wi._rpmodPatched) {
            const original_initialize_wi = initialize_wi;
            
            window.initialize_wi = function() {
                window.KLITE_RPMod_HotSwap.ensureContainersExist();
                
                try {
                    return original_initialize_wi.apply(this, arguments);
                } catch (e) {
                    console.warn('initialize_wi error:', e);
                }
            };
            
            window.initialize_wi._rpmodPatched = true;
        }
        
        // Patch update_wi to handle missing elements gracefully
        if (typeof update_wi === 'function' && !update_wi._rpmodPatched) {
            const original_update_wi = update_wi;
            
            window.update_wi = function() {
                if (update_wi._isExecuting) return;
                
                try {
                    update_wi._isExecuting = true;
                    window.KLITE_RPMod_HotSwap.ensureContainersExist();
                    return original_update_wi.apply(this, arguments);
                } catch (e) {
                    console.debug('update_wi error (expected when elements missing):', e.message);
                } finally {
                    update_wi._isExecuting = false;
                }
            };
            
            window.update_wi._rpmodPatched = true;
        }
        
        // Patch btn_settings to ensure containers are ready
        if (typeof btn_settings === 'function' && !btn_settings._rpmodPatched) {
            const original_btn_settings = btn_settings;
            
            window.btn_settings = function() {
                window.KLITE_RPMod_HotSwap.ensureContainersExist();
                
                const result = original_btn_settings.apply(this, arguments);
                
                // Make containers visible if settings is open
                setTimeout(() => {
                    const settingsOpen = document.getElementById('settingsmenu')?.style.display !== 'none';
                    if (settingsOpen) {
                        const wiContainer = document.getElementById('wi_tab_container');
                        const textdbContainer = document.getElementById('documentdb_tab_container');
                        
                        if (wiContainer) {
                            wiContainer.style.visibility = '';
                        }
                        if (textdbContainer) {
                            textdbContainer.style.visibility = '';
                        }
                    }
                }, 100);
                
                return result;
            };
            
            window.btn_settings._rpmodPatched = true;
        }
    },
    
    toggleUI() {
        // Always ensure containers exist before toggling
        this.ensureContainersExist();
        
        // Find the actual containers
        const rpmodContainer = document.getElementById('klite-rpmod-container');
        const liteContainer = document.getElementById('main_container');
        const gameContainer = document.getElementById('gamecontainer');
        const inputRow = document.getElementById('inputrow');
        const buttonRow = document.getElementById('buttonrow');
        
        if (!rpmodContainer) {
            console.error('RPMod container not found - make sure RPMod is initialized');
            return;
        }
        
        // Determine what to show/hide for Lite UI
        const liteElements = [];
        if (liteContainer) liteElements.push(liteContainer);
        if (gameContainer) liteElements.push(gameContainer);
        if (inputRow) liteElements.push(inputRow);
        if (buttonRow) liteElements.push(buttonRow);
        
        // Also check for the topmenu
        const topMenu = document.getElementById('topmenu');
        if (topMenu && !document.querySelector('#klite-rpmod-panel-top #topmenu')) {
            liteElements.push(topMenu);
        }
        
        if (liteElements.length === 0) {
            console.error('No Lite UI elements found');
            return;
        }
        
        const isRPModVisible = rpmodContainer.style.display !== 'none';
        
        if (isRPModVisible) {
            // Switching to Lite UI
            console.log('🔄 Switching to Lite UI');
            
            // Close any open modals from RPMod
            this.closeRPModModals();
            
            // Save RPMod state
            if (window.KLITE_RPMod_StateManager) {
                window.KLITE_RPMod_StateManager.saveFullState();
            }
            
            // Sync all values FROM RPMod TO Lite before switching
            this.syncToLite();
            
            // Hide RPMod
            rpmodContainer.style.display = 'none';
            document.body.classList.remove('klite-rpmod-active');
            
            // Show Lite elements
            liteElements.forEach(el => {
                el.style.display = '';
            });
            
            // Restore WI and TextDB containers for Lite's use
            this.restoreLiteContainers();
            
        } else {
            // Switching to RPMod UI
            console.log('🔄 Switching to RPMod UI');
            
            // Hide Lite elements
            liteElements.forEach(el => {
                el.style.display = 'none';
            });
            
            // Show RPMod
            rpmodContainer.style.display = 'block';
            document.body.classList.add('klite-rpmod-active');
            
            // Sync all values FROM Lite TO RPMod after switching
            this.syncFromLite();
            
            // Hide containers if RPMod is using them
            this.updateContainerVisibility();
        }
        
        // Show notification
        this.showToggleNotification(isRPModVisible ? 'Lite UI' : 'RPMod UI');
    },
    
    closeRPModModals() {
        if (window.KLITE_RPMod_Panels) {
            // Close WI modal if open
            if (window.KLITE_RPMod_Panels.WI?.modalOpen) {
                const wiCloseBtn = document.getElementById('klite-rpmod-wi-close');
                if (wiCloseBtn) wiCloseBtn.click();
            }
            
            // Close TextDB modal if open
            if (window.KLITE_RPMod_Panels.TEXTDB?.modalOpen) {
                const textdbCloseBtn = document.getElementById('klite-rpmod-textdb-close');
                if (textdbCloseBtn) textdbCloseBtn.click();
            }
        }
    },
    
    updateContainerVisibility() {
        // Check if WI or TextDB panels are active in RPMod
        if (window.KLITE_RPMod?.state?.activeTabs) {
            const activeTabs = window.KLITE_RPMod.state.activeTabs;
            
            // Hide WI container if RPMod is using it
            if (activeTabs.right === 'WI' || activeTabs.left === 'WI') {
                const wiContainer = document.getElementById('wi_tab_container');
                if (wiContainer) {
                    wiContainer.style.display = 'none';
                    wiContainer.classList.add('hidden');
                }
            }
            
            // Hide TextDB container if RPMod is using it
            if (activeTabs.right === 'TEXTDB' || activeTabs.left === 'TEXTDB') {
                const textdbContainer = document.getElementById('documentdb_tab_container');
                if (textdbContainer) {
                    textdbContainer.style.display = 'none';
                    textdbContainer.classList.add('hidden');
                }
            }
        }
    },
    
    restoreLiteContainers() {
        console.log('🔧 Restoring Lite containers');
        
        // Always ensure containers exist
        this.ensureContainersExist();
        
        // Find the proper parent (where memory container is)
        const memoryContainer = document.getElementById('memory_tab_container');
        const targetParent = memoryContainer ? memoryContainer.parentElement : document.body;
        
        // Restore WI container
        const wiContainer = document.getElementById('wi_tab_container');
        if (wiContainer) {
            // Move to correct parent if needed
            if (wiContainer.parentElement !== targetParent) {
                targetParent.appendChild(wiContainer);
            }
            
            // Reset all styles and classes
            wiContainer.style.display = '';
            wiContainer.style.visibility = '';
            wiContainer.style.width = '';
            wiContainer.style.height = '';
            wiContainer.style.position = '';
            wiContainer.style.top = '';
            wiContainer.style.left = '';
            wiContainer.style.zIndex = '';
            
            // Should be hidden by default
            wiContainer.classList.add('hidden');
            
            console.log('✅ Restored wi_tab_container');
        }
        
        // Restore TextDB container
        const textdbContainer = document.getElementById('documentdb_tab_container');
        if (textdbContainer) {
            // Move to correct parent if needed
            if (textdbContainer.parentElement !== targetParent) {
                targetParent.appendChild(textdbContainer);
            }
            
            // Reset all styles and classes
            textdbContainer.style.display = '';
            textdbContainer.style.visibility = '';
            textdbContainer.style.width = '';
            textdbContainer.style.height = '';
            textdbContainer.style.position = '';
            textdbContainer.style.top = '';
            textdbContainer.style.left = '';
            textdbContainer.style.zIndex = '';
            
            // Should be hidden by default
            textdbContainer.classList.add('hidden');
            
            console.log('✅ Restored documentdb_tab_container');
        }
        
        // Make sure memory container is also properly visible
        if (memoryContainer) {
            memoryContainer.style.display = '';
            memoryContainer.style.visibility = '';
            memoryContainer.classList.remove('hidden');
            
            console.log('✅ Restored memory_tab_container');
        }
        
        // Trigger Lite's display function to ensure proper state
        if (typeof display_memory_tab === 'function') {
            setTimeout(() => {
                try {
                    // Show memory tab first to ensure containers are in correct state
                    display_memory_tab(0);
                } catch (e) {
                    console.debug('display_memory_tab error (expected):', e);
                }
            }, 200);
        }
    },
    
    syncToLite() {
        console.log('📥 Syncing RPMod values to Lite UI');
        
        // 1. Sync Memory
        const rpmodMemory = document.querySelector('#klite-rpmod-memory-textarea');
        const liteMemory = document.getElementById('memorytext');
        if (rpmodMemory && liteMemory) {
            liteMemory.value = rpmodMemory.value;
            if (typeof localsettings !== 'undefined') {
                localsettings.memory = rpmodMemory.value;
            }
        }
        
        // 2. Sync Author's Note
        const rpmodAnote = document.querySelector('#klite-rpmod-anote-text');
        const liteAnote = document.getElementById('anotetext');
        if (rpmodAnote && liteAnote) {
            liteAnote.value = rpmodAnote.value;
            if (typeof localsettings !== 'undefined') {
                localsettings.anotetext = rpmodAnote.value;
            }
        }
        
        // 3. Sync Input Text
        const rpmodInput = document.getElementById('klite-rpmod-input');
        const liteInput = document.getElementById('input_text');
        if (rpmodInput && liteInput) {
            liteInput.value = rpmodInput.value;
        }
        
        // 4. Sync Personal Notes
        const rpmodPersonalNotes = document.getElementById('klite-rpmod-personal-notes');
        if (rpmodPersonalNotes && typeof localsettings !== 'undefined') {
            localsettings.notebox = rpmodPersonalNotes.value;
        }
        
        // 5. Update TextDB usage
        if (typeof estimate_and_show_textDB_usage === 'function') {
            try {
                estimate_and_show_textDB_usage();
            } catch (e) {
                console.warn('Error updating TextDB:', e);
            }
        }
        
        // 6. Save memory and settings
        if (typeof confirm_memory === 'function') {
            try {
                confirm_memory();
            } catch (e) {
                console.warn('Error confirming memory:', e);
            }
        }
        
        if (typeof save_settings === 'function') {
            try {
                save_settings();
            } catch (e) {
                console.warn('Error saving settings:', e);
            }
        }
    },
    
    syncFromLite() {
        console.log('📤 Syncing Lite values to RPMod UI');
        
        // 1. Sync game text
        const gametext = document.getElementById('gametext');
        const chatDisplay = document.getElementById('klite-rpmod-chat-display');
        if (gametext && chatDisplay) {
            chatDisplay.innerHTML = gametext.innerHTML || '<p style="color: #666;">No story content yet...</p>';
            
            // Trigger avatar replacement if the method exists
            if (window.KLITE_RPMod && typeof KLITE_RPMod.replaceAvatarsInChat === 'function') {
                KLITE_RPMod.replaceAvatarsInChat();
            }
        }
        
        // 2. Sync input field
        const inputText = document.getElementById('input_text');
        const rpmodInput = document.getElementById('klite-rpmod-input');
        if (inputText && rpmodInput) {
            rpmodInput.value = inputText.value || '';
        }
        
        // 3. Sync memory
        const liteMemory = document.getElementById('memorytext');
        const rpmodMemory = document.querySelector('#klite-rpmod-memory-textarea');
        if (liteMemory && rpmodMemory) {
            rpmodMemory.value = liteMemory.value || '';
        }
        
        // 4. Sync author's note
        const liteAnote = document.getElementById('anotetext');
        const rpmodAnote = document.querySelector('#klite-rpmod-anote-text');
        if (liteAnote && rpmodAnote) {
            rpmodAnote.value = liteAnote.value || '';
        }
        
        // 5. Sync personal notes
        const rpmodPersonalNotes = document.getElementById('klite-rpmod-personal-notes');
        if (rpmodPersonalNotes && typeof localsettings !== 'undefined') {
            rpmodPersonalNotes.value = localsettings.notebox || '';
        }
        
        // 6. Refresh active panels
        this.refreshActivePanels();
    },

    refreshActivePanels() {
        // Check if KLITE_RPMod exists before accessing its properties
        if (!window.KLITE_RPMod || !window.KLITE_RPMod.state || !window.KLITE_RPMod.state.activeTabs) {
            return;
        }
        
        const activeTabs = window.KLITE_RPMod.state.activeTabs;
        
        // Refresh right panel if it's a data panel
        const rightTab = activeTabs.right;
        if (rightTab && window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels[rightTab]) {
            const rightPanel = window.KLITE_RPMod_Panels[rightTab];
            
            // Force refresh for data panels
            if (['WI', 'TEXTDB', 'MEMORY', 'NOTES'].includes(rightTab)) {
                const container = document.getElementById('klite-rpmod-content-right');
                if (container) {
                    // Clean up first
                    if (typeof rightPanel.cleanup === 'function') {
                        rightPanel.cleanup();
                    }
                    // Reload
                    container.innerHTML = '';
                    rightPanel.load(container, 'right');
                }
            }
        }
        
        // Also check left panel
        const leftTab = activeTabs.left;
        if (leftTab && window.KLITE_RPMod_Panels && window.KLITE_RPMod_Panels[leftTab]) {
            const leftPanel = window.KLITE_RPMod_Panels[leftTab];
            if (['WI', 'TEXTDB', 'MEMORY', 'NOTES'].includes(leftTab)) {
                const container = document.getElementById('klite-rpmod-content-left');
                if (container) {
                    if (typeof leftPanel.cleanup === 'function') {
                        leftPanel.cleanup();
                    }
                    container.innerHTML = '';
                    leftPanel.load(container, 'left');
                }
            }
        }
    },
    
    addToggleButtons() {
        // Add button to Lite UI - wait a bit for it to be ready
        setTimeout(() => {
            const liteButtonRow = document.getElementById('buttonrow');
            if (liteButtonRow && !document.getElementById('lite-toggle-rpmod')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.id = 'lite-toggle-rpmod';
                toggleBtn.className = 'btn btn-primary';
                toggleBtn.innerHTML = '🎭 RPMod UI';
                toggleBtn.title = 'Switch to RPMod UI (Ctrl+Shift+U)';
                toggleBtn.style.cssText = 'margin-left: 10px;';
                toggleBtn.onclick = () => this.toggleUI();
                
                liteButtonRow.appendChild(toggleBtn);
            }
        }, 1000);
    },
    
    showToggleNotification(uiName) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #333;
            border: 2px solid #4a9eff;
            border-radius: 10px;
            padding: 20px 40px;
            color: #fff;
            font-size: 18px;
            font-weight: bold;
            z-index: 10000;
            animation: klite-fadeInOut 1s ease;
        `;
        notification.textContent = `Switched to ${uiName}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 1000);
    },
    
    addAnimationStyles() {
        // Check if our animation already exists
        if (document.getElementById('klite-hotswap-animations')) {
            return;
        }
        
        // Create a new style element with unique ID
        const animationStyle = document.createElement('style');
        animationStyle.id = 'klite-hotswap-animations';
        animationStyle.textContent = `
            @keyframes klite-fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(animationStyle);
    }
};