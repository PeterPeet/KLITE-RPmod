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
};