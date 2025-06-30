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
