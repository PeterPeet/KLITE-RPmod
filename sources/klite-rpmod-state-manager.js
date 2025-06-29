// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

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