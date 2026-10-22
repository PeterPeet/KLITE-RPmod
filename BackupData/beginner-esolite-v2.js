/**
 * Beginner Esolite v2.0 - Welcome Popup Integration
 *
 * This mod transforms Esolite with an integrated Welcome Popup approach:
 * - Shows Esolite's Welcome Popup on first start or when mod activates
 * - Role Play mode selection triggers beginner mode overlay
 * - Other modes show "Switch to Beginner Mode" button
 * - Reset works like "New Session" without removing the mod
 *
 * @version 2.0.0
 * @author KLITE RPmod Team
 */

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION & CONSTANTS
    // =========================================================================

    const VERSION = '2.0.0';
    const STORAGE_KEY = 'beginnerEsolite';
    const DEBUG = true;

    // Storage for mod state
    const state = {
        initialized: false,
        modActive: false,         // Whether the mod is activated
        beginnerModeActive: false, // Whether beginner overlay is shown
        welcomeShown: false,       // Whether we've shown the welcome popup
        easyMode: true
    };

    // =========================================================================
    // LOGGING
    // =========================================================================

    function log(...args) {
        if (DEBUG) {
            console.log('[Beginner Esolite v2]', ...args);
        }
    }

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            log('State saved:', state);
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                Object.assign(state, JSON.parse(saved));
                log('State loaded:', state);
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    function clearState() {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, {
            initialized: false,
            modActive: false,
            beginnerModeActive: false,
            welcomeShown: false,
            easyMode: true
        });
        log('State cleared');
    }

    // =========================================================================
    // WELCOME POPUP STYLES
    // =========================================================================

    const WELCOME_POPUP_STYLES = `
        /* Welcome Popup Styles */
        .welcome-theme-selector {
            display: grid;
            grid-template-columns: repeat(4, minmax(120px, 1fr));
            gap: 16px;
            justify-items: center;
        }
        .welcome-item-classic { grid-column: 1; grid-row: 1; }
        .welcome-item-aesthetic { grid-column: 2; grid-row: 1; }
        .welcome-item-corpo { grid-column: 3; grid-row: 1; }
        .welcome-item-roleplay { grid-column: 4; grid-row: 1; }
        .welcome-item-panel { grid-column: 1; grid-row: 2; }
        .welcome-item-messenger { grid-column: 2; grid-row: 2; }
        .welcome-item-next { grid-column: 3; grid-row: 2; }
        .welcome-item-empty { grid-column: auto; grid-row: 2; visibility: hidden; pointer-events: none; border-color: transparent; background: transparent; }
        .welcome-alt-badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; background: #2a2a2a; color: #cccccc; border: 1px solid #444444; margin-left: auto; }
        .welcome-theme-option {
            border: 2px solid #666666;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
        }
        .welcome-theme-option:hover {
            border-color: #eeeeee;
        }
        .welcome-theme-image {
            display: block;
            width: min(23vw, 150px);
            height: min(23vw, 150px);
            margin-bottom: 8px;
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
        }
        .welcomeimg4 {
            content: var(--img_theme_4);
            background-image: var(--img_theme_4);
        }

        /* Beginner Mode Switch Button */
        #beginnerModeSwitchBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 100000;
            transition: all 0.3s ease;
        }
        #beginnerModeSwitchBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
    `;

    // =========================================================================
    // WELCOME POPUP MANAGEMENT
    // =========================================================================

    function showWelcomePopup() {
        log('Showing Welcome Popup');

        // Check if Esolite's welcome popup function exists
        if (typeof window.show_welcome_panel === 'function') {
            // Use Esolite's native welcome popup
            window.show_welcome_panel();

            // Monitor for close event
            setupWelcomePopupMonitoring();
        } else {
            log('Esolite welcome panel function not found, falling back to manual injection');
            injectCustomWelcomePopup();
        }

        state.welcomeShown = true;
        saveState();
    }

    function setupWelcomePopupMonitoring() {
        // Monitor for when the welcome popup is closed
        const checkInterval = setInterval(() => {
            const welcomeContainer = document.getElementById('welcomecontainer');

            if (welcomeContainer && welcomeContainer.classList.contains('hidden')) {
                clearInterval(checkInterval);
                handleWelcomePopupClosed();
            }
        }, 500);

        // Clear interval after 60 seconds to avoid memory leaks
        setTimeout(() => clearInterval(checkInterval), 60000);
    }

    function handleWelcomePopupClosed() {
        log('Welcome Popup closed');

        // Check which mode was selected
        const selectedInput = document.querySelector('input[name="welcometheme"]:checked');

        if (selectedInput) {
            const selectedValue = selectedInput.value;
            log('Selected theme:', selectedValue);

            if (selectedValue === '4') {
                // Role Play mode selected - start beginner mode
                log('Role Play mode selected - starting beginner mode');
                startBeginnerMode();
            } else {
                // Other mode selected - show switch button
                log('Other mode selected - showing switch button');
                showBeginnerModeSwitchButton();
            }
        } else {
            // No selection or cancelled - show switch button anyway
            showBeginnerModeSwitchButton();
        }
    }

    function injectCustomWelcomePopup() {
        // Fallback: Inject our own version of the welcome popup
        const welcomeHTML = `
            <div class="popupcontainer flex" id="beginnerWelcomeContainer" style="z-index: 100000;">
                <div class="popupbg flex" onclick="closeBeginnerWelcome(false)"></div>
                <div class="nspopup flexsize higher">
                    <div class="popuptitlebar">
                        <div class="popuptitletext">Welcome to Esolite - Beginner Mode</div>
                    </div>
                    <div class="menutext">
                        <div style="padding-bottom: 6px;">
                            Welcome! Pick a mode to get started. Role Play mode will activate the beginner-friendly interface.
                        </div>
                        <div class="welcome-theme-selector">
                            <div class="welcome-theme-option welcome-item-classic">
                                <label><div class="welcome-theme-image welcomeimg1"></div>
                                <input type="radio" name="beginnertheme" value="0" checked> Classic </label>
                            </div>
                            <div class="welcome-theme-option welcome-item-aesthetic">
                                <label><div class="welcome-theme-image welcomeimg2"></div>
                                <input type="radio" name="beginnertheme" value="2"> Aesthetic </label>
                            </div>
                            <div class="welcome-theme-option welcome-item-corpo">
                                <label><div class="welcome-theme-image welcomeimg3"></div>
                                <input type="radio" name="beginnertheme" value="3"> Corpo </label>
                            </div>
                            <div class="welcome-theme-option welcome-item-roleplay">
                                <label>
                                    <div class="welcome-theme-image welcomeimg4"></div>
                                    <input type="radio" name="beginnertheme" value="4"> RolePlay
                                    <span class="welcome-alt-badge" style="margin-left:6px;">Beginner</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 16px;">
                        <button onclick="closeBeginnerWelcome(true)" class="btn btn-primary"
                                style="padding: 8px 24px; font-size: 14px;">Continue</button>
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = welcomeHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        // Add close handler to window
        window.closeBeginnerWelcome = (confirmed) => {
            const container = document.getElementById('beginnerWelcomeContainer');
            if (container) {
                if (confirmed) {
                    const selectedInput = document.querySelector('input[name="beginnertheme"]:checked');
                    if (selectedInput && selectedInput.value === '4') {
                        startBeginnerMode();
                    } else {
                        showBeginnerModeSwitchButton();
                    }
                }
                container.remove();
            }
        };
    }

    // =========================================================================
    // BEGINNER MODE MANAGEMENT
    // =========================================================================

    function startBeginnerMode() {
        log('Starting beginner mode overlay');

        state.beginnerModeActive = true;
        state.modActive = true;
        saveState();

        // TODO: Inject and show the beginner mode overlay from original beginner-esolite.js
        // For now, just log that we would show it
        alert('Beginner Mode would start here!\n\nIn the full implementation, this will show the simplified onboarding overlay.');

        // Hide the switch button if it's shown
        const switchBtn = document.getElementById('beginnerModeSwitchBtn');
        if (switchBtn) {
            switchBtn.remove();
        }
    }

    function showBeginnerModeSwitchButton() {
        log('Showing beginner mode switch button');

        // Don't show if button already exists
        if (document.getElementById('beginnerModeSwitchBtn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'beginnerModeSwitchBtn';
        button.textContent = '🎓 Switch to Beginner Mode';
        button.onclick = () => {
            startBeginnerMode();
        };

        document.body.appendChild(button);
    }

    function hideBeginnerMode() {
        log('Hiding beginner mode');

        state.beginnerModeActive = false;
        saveState();

        // TODO: Hide the beginner overlay

        // Show the switch button again
        showBeginnerModeSwitchButton();
    }

    // =========================================================================
    // NEW SESSION (RESET) FUNCTIONALITY
    // =========================================================================

    function newSession() {
        log('Starting new session (like Esolite New Session)');

        // Use Esolite's restart_new_game function if available
        if (typeof window.restart_new_game === 'function') {
            // restart_new_game(save, keep_memory)
            // save=true keeps AI settings, keep_memory=false clears context
            window.restart_new_game(true, false);
        } else {
            alert('New Session function not available. Please use Esolite\\'s native New Session button.');
        }

        // Don't clear mod state, just reset beginner mode flags
        state.beginnerModeActive = false;
        state.welcomeShown = false;
        saveState();

        // Show welcome popup again
        setTimeout(() => {
            showWelcomePopup();
        }, 500);
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async function init() {
        log('Beginner Esolite v2 initializing...');

        // Inject styles
        if (!document.getElementById('beginner-v2-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'beginner-v2-styles';
            styleEl.textContent = WELCOME_POPUP_STYLES;
            document.head.appendChild(styleEl);
        }

        // Load previous state
        loadState();

        // Wait for Esolite to be ready
        await waitForEsolite();

        // Determine what to show based on state
        if (!state.modActive || !state.welcomeShown) {
            // First time or mod not yet activated - show welcome popup
            log('First run or mod inactive - showing Welcome Popup');
            setTimeout(() => {
                showWelcomePopup();
            }, 1000); // Small delay to let Esolite fully load
        } else if (state.beginnerModeActive) {
            // Beginner mode was active - resume it
            log('Resuming beginner mode');
            startBeginnerMode();
        } else {
            // Mod active but not in beginner mode - show switch button
            log('Mod active, showing switch button');
            showBeginnerModeSwitchButton();
        }

        state.initialized = true;
        state.modActive = true;
        saveState();

        log('Initialization complete');
    }

    async function waitForEsolite() {
        // Wait for Esolite's core functions to be available
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (typeof window.render_gametext === 'function') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 30000);
        });
    }

    // =========================================================================
    // GLOBAL API
    // =========================================================================

    window.BeginnerEsoliteV2 = {
        version: VERSION,
        state: state,
        newSession: newSession,
        showWelcome: showWelcomePopup,
        startBeginnerMode: startBeginnerMode,
        hideBeginnerMode: hideBeginnerMode,
        clearState: clearState
    };

    // =========================================================================
    // START
    // =========================================================================

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
