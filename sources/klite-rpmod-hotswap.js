// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

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
    
    init() {
        console.log('🔄 Initializing Hot Swap feature');
        
        // Store original display values before any modifications
        const wiContainer = document.getElementById('wi_tab_container');
        const textdbContainer = document.getElementById('documentdb_tab_container');
        
        if (wiContainer) {
            this.originalDisplayValues.wi_tab_container = wiContainer.style.display || '';
        }
        if (textdbContainer) {
            this.originalDisplayValues.documentdb_tab_container = textdbContainer.style.display || '';
        }
        
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
    
    toggleUI() {
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
            if (window.KLITE_RPMod_Panels) {
                // Close WI modal if open
                if (window.KLITE_RPMod_Panels.WI && window.KLITE_RPMod_Panels.WI.modalOpen) {
                    const wiCloseBtn = document.getElementById('klite-rpmod-wi-close');
                    if (wiCloseBtn) wiCloseBtn.click();
                }
                
                // Close TextDB modal if open
                if (window.KLITE_RPMod_Panels.TEXTDB && window.KLITE_RPMod_Panels.TEXTDB.modalOpen) {
                    const textdbCloseBtn = document.getElementById('klite-rpmod-textdb-close');
                    if (textdbCloseBtn) textdbCloseBtn.click();
                }
            }
            
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
            
            // Restore WI and TextDB containers
            this.restoreLiteContainers();
            
            // Ensure Lite's panels work properly
            this.ensureLitePanelsWork();
            
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
            
            // Sync all elements from Lite to RPMod
            this.syncFromLite();
            
            // Hide original containers again if panels are using them
            this.hideLiteContainersIfNeeded();
        }
        
        // Show notification
        this.showToggleNotification(isRPModVisible ? 'Lite UI' : 'RPMod UI');
    },
    
    hideLiteContainersIfNeeded() {
        // Check if WI panel is active in RPMod
        if (window.KLITE_RPMod && window.KLITE_RPMod.state && window.KLITE_RPMod.state.activeTabs) {
            const activeTabs = window.KLITE_RPMod.state.activeTabs;
            
            // Only hide if these panels are actually active in RPMod
            if (activeTabs.right === 'WI' || activeTabs.left === 'WI') {
                const wiContainer = document.getElementById('wi_tab_container');
                if (wiContainer) {
                    wiContainer.style.display = 'none';
                }
            }
            
            if (activeTabs.right === 'TEXTDB' || activeTabs.left === 'TEXTDB') {
                const textdbContainer = document.getElementById('documentdb_tab_container');
                if (textdbContainer) {
                    textdbContainer.style.display = 'none';
                }
            }
        }
    },
    
    restoreLiteContainers() {
        console.log('🔧 Restoring Lite containers');
        
        // Find where the containers should be (same parent as memory container)
        const memoryContainer = document.getElementById('memory_tab_container');
        const targetParent = memoryContainer ? memoryContainer.parentElement : document.body;
        
        // Restore WI container
        const wiContainer = document.getElementById('wi_tab_container');
        if (wiContainer) {
            // Move to correct parent if needed
            if (wiContainer.parentElement !== targetParent) {
                targetParent.appendChild(wiContainer);
            }
            
            // Reset styles
            wiContainer.style.display = '';
            wiContainer.style.visibility = '';
            wiContainer.style.width = '';
            wiContainer.style.height = '';
            
            // Should be hidden by default
            wiContainer.classList.add('hidden');
            
            console.log('Restored wi_tab_container');
        }
        
        // Restore TextDB container
        const textdbContainer = document.getElementById('documentdb_tab_container');
        if (textdbContainer) {
            // Move to correct parent if needed
            if (textdbContainer.parentElement !== targetParent) {
                targetParent.appendChild(textdbContainer);
            }
            
            // Reset styles
            textdbContainer.style.display = '';
            textdbContainer.style.visibility = '';
            textdbContainer.style.width = '';
            textdbContainer.style.height = '';
            
            // Should be hidden by default
            textdbContainer.classList.add('hidden');
            
            console.log('Restored documentdb_tab_container');
        }
        
        // Ensure memory container is visible
        if (memoryContainer) {
            memoryContainer.style.display = '';
            memoryContainer.style.visibility = '';
            memoryContainer.classList.remove('hidden');
            
            console.log('Restored memory_tab_container');
        }
        
        // Force Lite to recognize the containers
        if (typeof display_memory_tab === 'function') {
            // If we have the original function, use it
            if (display_memory_tab._original) {
                window.display_memory_tab = display_memory_tab._original;
            }
            
            // Trigger a refresh by switching to memory tab
            setTimeout(() => {
                try {
                    display_memory_tab(0);
                } catch (e) {
                    console.debug('display_memory_tab error:', e);
                }
            }, 200);
        }
    },
    
    ensureLitePanelsWork() {
        // Remove our override of display_memory_tab if it exists
        if (typeof display_memory_tab === 'function' && display_memory_tab._rpmodFixed) {
            // Restore original if we have it
            if (display_memory_tab._original) {
                window.display_memory_tab = display_memory_tab._original;
            }
        }
        
        // Fix update_wi to handle missing elements more gracefully
        if (typeof update_wi === 'function' && !update_wi._rpmodFixed) {
            const original_update_wi = update_wi;
            
            window.update_wi = function() {
                // Prevent recursion
                if (update_wi._isExecuting) {
                    return;
                }
                
                try {
                    update_wi._isExecuting = true;
                    
                    // Call original
                    return original_update_wi.apply(this, arguments);
                    
                } catch (e) {
                    // Silently ignore errors - they're expected when elements are missing
                    console.debug('update_wi error (expected):', e.message);
                } finally {
                    update_wi._isExecuting = false;
                }
            };
            
            window.update_wi._rpmodFixed = true;
        }
        
        // Ensure containers are properly initialized for Lite
        const initializeContainers = () => {
            // Check WI container
            const wiContainer = document.getElementById('wi_tab_container');
            if (!wiContainer) {
                // Try to create it
                if (typeof btn_wi === 'function') {
                    try {
                        btn_wi();
                    } catch (e) {
                        console.debug('btn_wi initialization error:', e);
                    }
                }
            }
            
            // Check TextDB container  
            const textdbContainer = document.getElementById('documentdb_tab_container');
            if (!textdbContainer) {
                // Try to create it
                if (typeof btn_documentdb === 'function') {
                    try {
                        btn_documentdb();
                    } catch (e) {
                        console.debug('btn_documentdb initialization error:', e);
                    }
                }
            }
        };
        
        // Initialize containers
        initializeContainers();
        
        // Also fix btn_settings to ensure containers are ready
        if (typeof btn_settings === 'function' && !btn_settings._rpmodFixed) {
            const original_btn_settings = btn_settings;
            
            window.btn_settings = function() {
                // Initialize containers before showing settings
                initializeContainers();
                
                // Call original
                const result = original_btn_settings.apply(this, arguments);
                
                // Ensure proper state after settings opens
                setTimeout(() => {
                    const wiContainer = document.getElementById('wi_tab_container');
                    const textdbContainer = document.getElementById('documentdb_tab_container');
                    
                    if (wiContainer) {
                        wiContainer.style.visibility = '';
                        wiContainer.classList.remove('klite-hidden');
                    }
                    if (textdbContainer) {
                        textdbContainer.style.visibility = '';
                        textdbContainer.classList.remove('klite-hidden');
                    }
                }, 100);
                
                return result;
            };
            
            window.btn_settings._rpmodFixed = true;
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
                localsettings.anote = rpmodAnote.value;
            }
        }
        
        // 3. Sync Input Text
        const rpmodInput = document.getElementById('klite-rpmod-input');
        const liteInput = document.getElementById('input_text');
        if (rpmodInput && liteInput) {
            liteInput.value = rpmodInput.value;
        }
        
        // 4. Don't touch WI - it stays in Lite
        
        if (typeof estimate_and_show_textDB_usage === 'function') {
            try {
                estimate_and_show_textDB_usage();
            } catch (e) {
                console.warn('Error updating TextDB:', e);
            }
        }
        
        // 5. Save memory
        if (typeof confirm_memory === 'function') {
            try {
                confirm_memory();
            } catch (e) {
                console.warn('Error confirming memory:', e);
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
        
        // 5. Refresh active panels
        this.refreshActivePanels();
    },

    refreshActivePanels() {
        // Check if KLITE_RPMod exists before accessing its properties
        if (!window.KLITE_RPMod || !window.KLITE_RPMod.state || !window.KLITE_RPMod.state.activeTabs) {
            // Don't warn, just skip - this is normal during initialization
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