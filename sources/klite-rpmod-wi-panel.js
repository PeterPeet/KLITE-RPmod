// =============================================
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
};