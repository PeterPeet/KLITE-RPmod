// =============================================
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