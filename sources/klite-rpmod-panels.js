// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

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