// =============================================================================
// WELCOME POPUP INTEGRATION PATCH
// =============================================================================
// This file contains the code to add to beginner-esolite.js

// ADD TO STATE (around line 182, after "initialized: false,"):
/*
        modActive: false,
        beginnerModeActive: false,
        welcomeShown: false,
*/

// ADD BEFORE init() FUNCTION (around line 3211):

    function showWelcomePopup() {
        log('Showing Welcome Popup');

        if (typeof window.show_welcome_panel === 'function') {
            window.show_welcome_panel();
            setupWelcomePopupMonitoring();
        } else {
            log('Esolite welcome panel not found, showing overlay');
            showOverlay();
        }

        state.welcomeShown = true;
        saveState();
    }

    function setupWelcomePopupMonitoring() {
        const checkInterval = setInterval(() => {
            const welcomeContainer = document.getElementById('welcomecontainer');
            if (welcomeContainer && welcomeContainer.classList.contains('hidden')) {
                clearInterval(checkInterval);
                handleWelcomePopupClosed();
            }
        }, 500);

        setTimeout(() => clearInterval(checkInterval), 60000);
    }

    function handleWelcomePopupClosed() {
        log('Welcome Popup closed');

        const selectedInput = document.querySelector('input[name="welcometheme"]:checked');
        if (selectedInput && selectedInput.value === '4') {
            log('Role Play mode selected - starting beginner mode');
            state.beginnerModeActive = true;
            state.modActive = true;
            saveState();
            showOverlay();
        } else {
            log('Other mode selected - showing switch button');
            showBeginnerModeSwitchButton();
        }
    }

    function showBeginnerModeSwitchButton() {
        if (document.getElementById('beginnerModeSwitchBtn')) return;

        const button = document.createElement('button');
        button.id = 'beginnerModeSwitchBtn';
        button.style.cssText = `
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
        `;
        button.textContent = '🎓 Switch to Beginner Mode';
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
        };
        button.onmouseout = () => {
            button.style.transform = '';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        };
        button.onclick = () => {
            state.beginnerModeActive = true;
            state.modActive = true;
            saveState();
            const btn = document.getElementById('beginnerModeSwitchBtn');
            if (btn) btn.remove();
            showOverlay();
        };

        document.body.appendChild(button);
    }

    function newSession() {
        log('Starting new session');

        if (typeof window.restart_new_game === 'function') {
            window.restart_new_game(true, false);
        }

        state.beginnerModeActive = false;
        state.welcomeShown = false;
        state.setupComplete = false;
        saveState();

        setTimeout(() => showWelcomePopup(), 500);
    }

// REPLACE INIT() FUNCTION LOGIC (around line 3237-3251):
/*
        // Determine what to show based on state
        if (!state.modActive || !state.welcomeShown) {
            log('First run - showing Welcome Popup');
            setTimeout(() => showWelcomePopup(), 1000);
        } else if (state.setupComplete && state.beginnerModeActive) {
            log('Resuming beginner mode with chat');
            showSimplifiedChat();
            if (!state.easyMode) {
                switchToAdvancedMode();
            }
        } else if (state.beginnerModeActive) {
            log('Resuming beginner mode overlay');
            showOverlay();
        } else {
            log('Showing switch button');
            showBeginnerModeSwitchButton();
        }

        state.initialized = true;
        state.modActive = true;
*/

// REPLACE window.BeginnerEsolite (around line 3263):
/*
    window.BeginnerEsoliteV2 = {
        version: VERSION,
        state: state,
        newSession: newSession,
        showWelcome: showWelcomePopup,
        startBeginnerMode: () => {
            state.beginnerModeActive = true;
            state.modActive = true;
            saveState();
            showOverlay();
        },
        hideBeginnerMode: () => {
            state.beginnerModeActive = false;
            saveState();
            hideOverlay();
            showBeginnerModeSwitchButton();
        },
        clearState: clearState,
        showSetup: () => {
            hideSimplifiedChat();
            state.setupComplete = false;
            saveState();
            showOverlay();
        }
    };
*/

// CHANGE VERSION (line 22):
/*
    const VERSION = '2.0.0-complete';
*/
