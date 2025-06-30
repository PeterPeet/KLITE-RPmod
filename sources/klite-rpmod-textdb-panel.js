// =============================================
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
};