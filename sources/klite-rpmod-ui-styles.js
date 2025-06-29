// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - UI Component Styles
// Styles for buttons, inputs, and other UI elements
// =============================================

window.KLITE_RPMod_UIStyles = `
    /* Text input wrapper */
    .klite-rpmod-input-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
    }

    /* Text input */
    .klite-rpmod-text-input {
        width: 100%;
        min-height: 80px;
        max-height: 200px;
        padding: 10px;
        background: #262626;
        border: 1px solid #444;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
    }

    /* Token and API wrapper */
    .klite-rpmod-input-info {
        display: flex;
        justify-content: space-between;
        color: #888;
        font-size: 12px;
        margin-top: -3px;
    }

    /* Right side buttons */
    .klite-rpmod-right-buttons {
        display: flex;
        flex-direction: column;
        width: 120px;
        flex-shrink: 0;
        height: 100%;
    }

    .klite-rpmod-submit-button {
        flex: 2;
        background-color: #337ab7;
        border: 1px solid #2e6da4;
        border-radius: 4px 4px 0 0;
        color: white;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s ease;
        padding: 15px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        margin-bottom: 1px !important;
    }

    .klite-rpmod-submit-button:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    /* Abort button state */
    .klite-rpmod-submit-button.aborting {
        background-color: #337ab7 !important;
        border: 1px solid #2e6da4 !important;
        animation: pulse 0.6s infinite alternate;
    }

    @keyframes pulse {
        from {
            opacity: 0.8;
            transform: scale(0.94);
        }
        to {
            opacity: 1;
            transform: scale(1.00);
        }
    }

    .klite-rpmod-submit-button.aborting:hover {
        background-color: #5bb5ee !important;
        border-color: #5bb5ee !important;
    }

    /* Action buttons */
    .klite-rpmod-action-buttons {
        display: flex;
        gap: 1px;
        flex: 1;
    }

    .klite-rpmod-action-button {
        flex: 1;
        background-color: #337ab7;
        border: 1px solid #2e6da4;
        color: white;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s ease;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        border-radius: 0;
    }

    .klite-rpmod-action-button:hover {
        background-color: #286090;
        border-color: #204d74;
    }

    /* First action button (undo) - bottom left corner */
    .klite-rpmod-action-button:first-child {
        border-radius: 0 0 0 4px;
    }

    /* Middle action button (redo) - no rounded corners */
    .klite-rpmod-action-button:nth-child(2) {
        border-radius: 0;
    }

    /* Last action button (retry) - bottom right corner */
    .klite-rpmod-action-button:last-child {
        border-radius: 0 0 4px 0;
    }

    /* Editing button */
    .klite-rpmod-editing-button {
        background-color: rgb(45, 107, 160) !important;
    }

    .klite-rpmod-editing-button:hover {
        background-color: #286090 !important;
        border-color: #204d74 !important;
    }

    .klite-rpmod-editing-button.active {
        background-color: #4CAAE5 !important;
        border-color: #4CAAE5 !important;
    }

    .klite-rpmod-editing-button.active:hover {
        background-color: #5bb5ee !important;
        border-color: #5bb5ee !important;
    }

    /* Range sliders */
    input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 16px;
        background: #333;
        border-radius: 3px;
        outline: none;
        margin: 8px 0;
    }

    /* Style the thumb - properly centered */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #337ab7;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        margin-top: -5px;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
        background: #286090;
        transform: scale(1.1);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
    }

    input[type="range"]::-webkit-slider-thumb:active {
        background: #204d74;
        transform: scale(0.95);
    }

    input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #337ab7;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    input[type="range"]::-moz-range-thumb:hover {
        background: #286090;
        transform: scale(1.1);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
    }

    input[type="range"]::-moz-range-thumb:active {
        background: #204d74;
        transform: scale(0.95);
    }

    /* Optional: Add a subtle track highlight on hover */
    input[type="range"]:hover {
        background: #3a3a3a;
    }

    /* Style the track */
    input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        background: #333;
        border-radius: 3px;
    }

    input[type="range"]::-moz-range-track {
        width: 100%;
        height: 6px;
        background: #333;
        border-radius: 3px;
    }

    /* Remove default focus styles */
    input[type="range"]:focus {
        outline: none;
    }

    input[type="range"]:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 2px rgba(51, 122, 183, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    input[type="range"]:focus::-moz-range-thumb {
        box-shadow: 0 0 0 2px rgba(51, 122, 183, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Slider labels */
    .klite-rpmod-slider-labels {
        display: flex;
        justify-content: space-between;
        color: #e0e0e0;
        font-size: 10px;
        margin-top: 3px;
    }

    /* Modal styles */
    .klite-rpmod-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
    }

    .klite-rpmod-modal.show {
        display: flex;
    }

    /* Fullscreen modal for Stable UI */
    .klite-rpmod-fullscreen-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10001;
        flex-direction: column;
    }

    .klite-rpmod-fullscreen-modal.show {
        display: flex;
    }

    .klite-rpmod-modal-header {
        background: #262626;
        border-bottom: 1px solid #444;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .klite-rpmod-modal-header h2 {
        margin: 0;
        color: #e0e0e0;
        font-size: 18px;
    }

    .klite-rpmod-modal-close {
        background: transparent;
        border: none;
        color: #999;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
    }

    .klite-rpmod-modal-close:hover {
        color: #fff;
    }

    .klite-rpmod-modal-body {
        flex: 1;
        overflow: hidden;
        position: relative;
    }

    /* Mobile panel */
    .klite-rpmod-mobile-panel {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #262626;
        z-index: 4;
        flex-direction: column;
    }

    .klite-rpmod-mobile-panel.show {
        display: flex;
    }

    /* Mobile toggle button */
    .klite-rpmod-mobile-toggle {
        display: none;
        position: fixed;
        bottom: 120px;
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: rgb(51, 122, 183);
        border: 2px solid #2e6da4;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 2;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
    }

    .klite-rpmod-mobile-toggle:hover {
        background-color: #286090;
        transform: scale(1.1);
    }

    @media (max-width: 767px) {
        .klite-rpmod-mobile-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    /* Ensure KoboldAI popups appear above RP Mod UI */
    .popupcontainer, .popup-container, .modal, .msgbox {
        z-index: 3 !important;
    }
    
    .popupbackground, .popup-background, .modal-backdrop {
        z-index: 3 !important;
    }

    .dice-btn {
        padding: 0;
        width: 100%;
        height: 28px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
        margin: 0;
        transition: all 0.2s ease;
    }

    .dice-btn:hover {
        background: #444;
        border-color: #666;
    }

    .dice-btn.delete-btn {
        background: #663333;
        border-color: #774444;
        color: #ff9999;
    }

    .preset-button.active {
        background: #337ab7 !important;
        border-color: #2e6da4 !important;
    }
`;