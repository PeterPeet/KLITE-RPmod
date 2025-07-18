// =============================================
// KLITE-Tools Modular
// Activates only when user chooses aesthetic mode
// =============================================

(function() {
    'use strict';
    
    // Prevent duplicate loads
    if (window.KLITE_Modular_LOADED) {
        console.warn('[KLITE] Already loaded');
        return;
    }
    window.KLITE_Modular_LOADED = true;

    // =============================================
    // CONSOLE RESTORATION FOR KOBOLDAI LITE
    // =============================================
    const consoleFrame = document.createElement('iframe');
    consoleFrame.style.display = 'none';
    document.body.appendChild(consoleFrame);
    window.console = consoleFrame.contentWindow.console;
    
    console.log('[KLITE] Console access restored via iframe');

    // =============================================
    // GLOBAL THEME SYSTEM - CSS VARIABLES
    // =============================================
    
    // Inject global CSS variables for theme customization
    const globalThemeCSS = `
        <style id="klite-global-theme">
            :root {
                /* Primary Theme Colors */
                --klite-primary-color: #007bff;
                --klite-primary-hover: #0056b3;
                --klite-primary-active: #004085;
                --klite-primary-light: rgba(0, 123, 255, 0.1);
                
                /* Secondary Theme Colors */
                --klite-secondary-color: #6c757d;
                --klite-secondary-hover: #5a6268;
                --klite-secondary-active: #4e555b;
                --klite-secondary-light: rgba(108, 117, 125, 0.1);
                
                /* Highlighted/Accent Colors */
                --klite-highlighted-color: #17a2b8;
                --klite-highlighted-hover: #138496;
                --klite-highlighted-active: #0f6674;
                --klite-highlighted-light: rgba(23, 162, 184, 0.1);
                
                /* Status Colors */
                --klite-success-color: #28a745;
                --klite-success-hover: #218838;
                --klite-success-active: #1c7430;
                --klite-success-light: rgba(40, 167, 69, 0.1);
                
                --klite-warning-color: #ffc107;
                --klite-warning-hover: #e0a800;
                --klite-warning-active: #d39e00;
                --klite-warning-light: rgba(255, 193, 7, 0.1);
                
                --klite-danger-color: #dc3545;
                --klite-danger-hover: #c82333;
                --klite-danger-active: #bd2130;
                --klite-danger-light: rgba(220, 53, 69, 0.1);
                
                --klite-info-color: #17a2b8;
                --klite-info-hover: #138496;
                --klite-info-active: #0f6674;
                --klite-info-light: rgba(23, 162, 184, 0.1);
                
                /* Background Colors */
                --klite-bg-primary: rgba(42, 42, 42, 0.9);
                --klite-bg-secondary: rgba(60, 60, 60, 0.9);
                --klite-bg-tertiary: rgba(80, 80, 80, 0.9);
                --klite-bg-light: rgba(248, 249, 250, 0.9);
                --klite-bg-dark: rgba(33, 37, 41, 0.9);
                --klite-bg-transparent: rgba(0, 0, 0, 0.1);
                
                /* Border Colors */
                --klite-border-primary: #444;
                --klite-border-secondary: #ccc;
                --klite-border-light: #dee2e6;
                --klite-border-dark: #333;
                --klite-border-focus: var(--klite-primary-color);
                --klite-border-hover: var(--klite-primary-hover);
                
                /* Text Colors */
                --klite-text-primary: #e0e0e0;
                --klite-text-secondary: #adb5bd;
                --klite-text-tertiary: #6c757d;
                --klite-text-light: #ffffff;
                --klite-text-dark: #212529;
                --klite-text-muted: #868e96;
                --klite-text-inverse: #000000;
                
                /* Interactive States */
                --klite-hover-bg: var(--klite-bg-secondary);
                --klite-hover-border: var(--klite-border-hover);
                --klite-active-bg: var(--klite-primary-light);
                --klite-active-border: var(--klite-primary-color);
                --klite-focus-bg: var(--klite-primary-light);
                --klite-focus-border: var(--klite-border-focus);
                --klite-focus-shadow: 0 0 0 2px var(--klite-primary-light);
                
                /* Component Specific */
                --klite-input-bg: var(--klite-bg-primary);
                --klite-input-border: var(--klite-border-primary);
                --klite-input-text: var(--klite-text-primary);
                --klite-input-placeholder: var(--klite-text-tertiary);
                
                --klite-button-bg: var(--klite-bg-primary);
                --klite-button-border: var(--klite-border-primary);
                --klite-button-text: var(--klite-text-primary);
                --klite-button-hover-bg: var(--klite-hover-bg);
                --klite-button-hover-border: var(--klite-hover-border);
                
                --klite-panel-bg: var(--klite-bg-primary);
                --klite-panel-border: var(--klite-border-primary);
                --klite-panel-header-bg: var(--klite-bg-secondary);
                --klite-panel-header-text: var(--klite-text-primary);
                
                /* Progress/Loading */
                --klite-progress-bg: #e9ecef;
                --klite-progress-fill: var(--klite-primary-color);
                --klite-loading-bg: var(--klite-bg-secondary);
                --klite-loading-text: var(--klite-text-secondary);
                
                /* Shadows */
                --klite-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.075);
                --klite-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
                --klite-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
                
                /* Spacing */
                --klite-spacing-xs: 4px;
                --klite-spacing-sm: 8px;
                --klite-spacing-md: 12px;
                --klite-spacing-lg: 16px;
                --klite-spacing-xl: 24px;
                
                /* Border Radius */
                --klite-radius-sm: 2px;
                --klite-radius-md: 4px;
                --klite-radius-lg: 6px;
                --klite-radius-xl: 8px;
                --klite-radius-pill: 50px;
                
                /* Transitions */
                --klite-transition-fast: 0.15s ease-in-out;
                --klite-transition-normal: 0.2s ease-in-out;
                --klite-transition-slow: 0.3s ease-in-out;
                
                /* Typography */
                --klite-font-family: inherit;
                --klite-font-family-mono: monospace;
                --klite-font-size-xs: 10px;
                --klite-font-size-sm: 12px;
                --klite-font-size-md: 14px;
                --klite-font-size-lg: 16px;
                --klite-font-size-xl: 18px;
                --klite-font-weight-normal: 400;
                --klite-font-weight-medium: 500;
                --klite-font-weight-bold: 600;
                --klite-line-height-sm: 1.2;
                --klite-line-height-md: 1.4;
                --klite-line-height-lg: 1.6;
            }
            
            /* Dark theme overrides (can be toggled) */
            [data-klite-theme="dark"] {
                --klite-bg-light: var(--klite-bg-dark);
                --klite-text-dark: var(--klite-text-light);
                --klite-border-secondary: var(--klite-border-dark);
                --klite-progress-bg: rgba(108, 117, 125, 0.3);
            }
            
            /* Light theme overrides (can be toggled) */
            [data-klite-theme="light"] {
                --klite-bg-primary: rgba(248, 249, 250, 0.9);
                --klite-bg-secondary: rgba(233, 236, 239, 0.9);
                --klite-text-primary: #212529;
                --klite-text-secondary: #6c757d;
                --klite-border-primary: #dee2e6;
                --klite-input-bg: #ffffff;
                --klite-input-text: #212529;
            }
            
            /* Common utility classes */
            .klite-btn {
                padding: var(--klite-spacing-sm) var(--klite-spacing-md);
                border: 1px solid var(--klite-button-border);
                border-radius: var(--klite-radius-md);
                background: var(--klite-button-bg);
                color: var(--klite-button-text);
                font-size: var(--klite-font-size-sm);
                font-weight: var(--klite-font-weight-medium);
                cursor: pointer;
                transition: all var(--klite-transition-normal);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 32px;
            }
            
            .klite-btn:hover {
                background: var(--klite-button-hover-bg);
                border-color: var(--klite-button-hover-border);
            }
            
            .klite-btn:focus {
                outline: none;
                box-shadow: var(--klite-focus-shadow);
            }
            
            .klite-btn-primary {
                background: var(--klite-primary-color);
                border-color: var(--klite-primary-color);
                color: var(--klite-text-light);
            }
            
            .klite-btn-primary:hover {
                background: var(--klite-primary-hover);
                border-color: var(--klite-primary-hover);
            }
            
            .klite-btn-secondary {
                background: var(--klite-secondary-color);
                border-color: var(--klite-secondary-color);
                color: var(--klite-text-light);
            }
            
            .klite-btn-success {
                background: var(--klite-success-color);
                border-color: var(--klite-success-color);
                color: var(--klite-text-light);
            }
            
            .klite-btn-warning {
                background: var(--klite-warning-color);
                border-color: var(--klite-warning-color);
                color: var(--klite-text-dark);
            }
            
            .klite-btn-danger {
                background: var(--klite-danger-color);
                border-color: var(--klite-danger-color);
                color: var(--klite-text-light);
            }
            
            .klite-input {
                padding: var(--klite-spacing-sm);
                border: 1px solid var(--klite-input-border);
                border-radius: var(--klite-radius-md);
                background: var(--klite-input-bg);
                color: var(--klite-input-text);
                font-family: var(--klite-font-family);
                font-size: var(--klite-font-size-sm);
                transition: all var(--klite-transition-normal);
            }
            
            .klite-input:focus {
                border-color: var(--klite-focus-border);
                outline: none;
                box-shadow: var(--klite-focus-shadow);
            }
            
            .klite-input::placeholder {
                color: var(--klite-input-placeholder);
            }
            
            .klite-textarea {
                padding: var(--klite-spacing-sm);
                border: 1px solid var(--klite-input-border);
                border-radius: var(--klite-radius-md);
                background: var(--klite-input-bg);
                color: var(--klite-input-text);
                font-family: var(--klite-font-family-mono);
                font-size: var(--klite-font-size-sm);
                resize: vertical;
                transition: all var(--klite-transition-normal);
            }
            
            .klite-textarea:focus {
                border-color: var(--klite-focus-border);
                outline: none;
                box-shadow: var(--klite-focus-shadow);
            }
            
            .klite-label {
                display: block;
                margin-bottom: var(--klite-spacing-xs);
                font-weight: var(--klite-font-weight-medium);
                font-size: var(--klite-font-size-sm);
                color: var(--klite-text-primary);
            }
            
            .klite-status {
                font-size: var(--klite-font-size-sm);
                color: var(--klite-text-secondary);
            }
            
            .klite-muted {
                color: var(--klite-text-muted);
            }
            
            .klite-panel {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-panel-border);
                border-radius: var(--klite-radius-md);
                box-shadow: var(--klite-shadow-sm);
            }
            
            .klite-panel-header {
                background: var(--klite-panel-header-bg);
                color: var(--klite-panel-header-text);
                padding: var(--klite-spacing-md);
                border-bottom: 1px solid var(--klite-panel-border);
                border-radius: var(--klite-radius-md) var(--klite-radius-md) 0 0;
            }
            
            .klite-panel-content {
                padding: var(--klite-spacing-md);
            }
            
            /* Dice Panel Styles */
            .klite-dice-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-dice-btn {
                padding: 12px 8px;
                background: var(--klite-button-bg);
                border: 1px solid var(--klite-button-border);
                border-radius: var(--klite-radius-md);
                color: var(--klite-button-text);
                font-size: var(--klite-font-size-sm);
                font-weight: var(--klite-font-weight-medium);
                cursor: pointer;
                transition: all var(--klite-transition-normal);
                text-align: center;
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .klite-dice-btn:hover {
                background: var(--klite-button-hover-bg);
                border-color: var(--klite-button-hover-border);
                transform: translateY(-1px);
            }
            
            .klite-dice-btn:active {
                transform: translateY(0);
            }
            
            .klite-dice-result {
                background: var(--klite-surface-bg);
                border: 1px solid var(--klite-border-primary);
                border-radius: var(--klite-radius-md);
                padding: var(--klite-spacing-md);
                text-align: center;
                min-height: 80px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin-top: 12px;
            }
            
            .klite-row {
                display: flex;
                align-items: center;
                gap: var(--klite-spacing-sm);
            }
            
            .klite-mt {
                margin-top: var(--klite-spacing-md);
            }
            
            /* Export Panel Styles */
            .klite-export-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 12px;
            }
            
            .klite-export-buttons .klite-btn {
                justify-content: flex-start;
                padding: 12px 16px;
                font-size: var(--klite-font-size-md);
            }
            
            .klite-export-info {
                padding: 8px 12px;
                background: var(--klite-surface-bg);
                border-radius: var(--klite-radius-sm);
                border: 1px solid var(--klite-border-secondary);
                margin-top: 8px;
            }
            
            /* Context Analyzer Panel Styles */
            .klite-token-bar-container {
                margin-bottom: 12px;
            }
            
            .klite-token-bar {
                display: flex;
                height: 20px;
                background: var(--klite-surface-bg);
                border: 1px solid var(--klite-border-primary);
                border-radius: var(--klite-radius-sm);
                overflow: hidden;
            }
            
            .klite-token-segment {
                height: 100%;
                transition: width 0.3s ease;
                min-width: 0;
            }
            
            .klite-memory-segment { background: var(--klite-primary-color); }
            .klite-wi-segment { background: var(--klite-success-color); }
            .klite-story-segment { background: var(--klite-warning-color); }
            .klite-anote-segment { background: var(--klite-danger-color); }
            .klite-free-segment { background: var(--klite-surface-bg); }
            
            .klite-token-legend {
                margin-bottom: 12px;
                font-size: 11px;
            }
            
            .klite-token-legend-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 4px;
            }
            
            .klite-token-legend-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .klite-token-legend-color {
                width: 12px;
                height: 12px;
                border-radius: 2px;
                flex-shrink: 0;
            }
            
            .klite-token-legend-label {
                color: var(--klite-text-muted);
                font-size: 10px;
            }
            
            .klite-token-legend-value {
                color: var(--klite-text-primary);
                font-weight: bold;
                font-size: 10px;
            }
            
            .klite-context-summary {
                margin-bottom: 10px;
                padding: 8px;
                background: var(--klite-surface-bg);
                border-radius: var(--klite-radius-sm);
                border: 1px solid var(--klite-border-secondary);
                font-size: 12px;
            }
            
            /* Timeline/Index Panel Styles */
            .klite-timeline-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-timeline-controls .klite-btn {
                flex: 1;
                padding: 8px;
                font-size: 12px;
            }
            
            .klite-chapter-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .klite-chapter-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px;
                background: var(--klite-surface-bg);
                border: 1px solid var(--klite-border-secondary);
                border-radius: var(--klite-radius-sm);
                cursor: pointer;
                transition: all var(--klite-transition-normal);
            }
            
            .klite-chapter-item:hover {
                background: var(--klite-button-hover-bg);
                border-color: var(--klite-primary-color);
            }
            
            .klite-chapter-info strong {
                color: var(--klite-text-primary);
                font-size: 12px;
            }
            
            .klite-chapter-info small {
                color: var(--klite-text-muted);
                font-size: 10px;
                display: block;
            }
            
            .klite-btn-small {
                padding: 4px 8px;
                font-size: 12px;
                min-height: 24px;
                border: 1px solid var(--klite-border-primary);
                background: var(--klite-button-bg);
                color: var(--klite-button-text);
                border-radius: var(--klite-radius-sm);
                cursor: pointer;
            }
            
            .klite-btn-small.klite-btn-danger {
                background: var(--klite-danger-color);
                border-color: var(--klite-danger-color);
                color: white;
            }
            
            /* Quick Actions Panel Styles */
            .klite-quick-actions-grid {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-action-slot {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .klite-action-btn {
                min-width: 40px;
                padding: 8px;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .klite-action-input {
                flex: 1;
                padding: 8px;
                font-size: 12px;
            }
            
            .klite-actions-info {
                padding: 8px;
                background: var(--klite-surface-bg);
                border-radius: var(--klite-radius-sm);
                border: 1px solid var(--klite-border-secondary);
            }
            
            /* WorldInfo Management Panel Styles */
            .klite-wi-header {
                margin-bottom: 12px;
            }
            
            .klite-wi-tabs {
                display: flex;
                gap: 4px;
                margin-bottom: 8px;
                flex-wrap: wrap;
            }
            
            .klite-wi-tab {
                padding: 4px 8px;
                font-size: 10px;
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .klite-wi-tab:hover {
                background: var(--klite-hover-bg);
            }
            
            .klite-wi-tab.active {
                background: var(--klite-accent);
                color: white;
            }
            
            .klite-wi-tab-add {
                padding: 4px 8px;
                font-size: 10px;
                background: var(--klite-accent);
                color: white;
                border: 1px solid var(--klite-accent);
                border-radius: 4px;
                cursor: pointer;
            }
            
            .klite-wi-group-controls {
                display: flex;
                gap: 4px;
            }
            
            .klite-wi-controls {
                margin-bottom: 12px;
            }
            
            .klite-wi-search {
                display: flex;
                gap: 4px;
                margin-bottom: 8px;
            }
            
            .klite-wi-search input {
                flex: 1;
                font-size: 11px;
                padding: 4px;
            }
            
            .klite-wi-actions {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }
            
            .klite-wi-advanced {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 12px;
            }
            
            .klite-wi-advanced h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-wi-setting {
                margin-bottom: 8px;
            }
            
            .klite-wi-setting label {
                display: block;
                font-size: 11px;
                margin-bottom: 4px;
                color: var(--klite-text);
            }
            
            .klite-wi-setting select,
            .klite-wi-setting input[type="text"] {
                width: 100%;
                font-size: 11px;
                padding: 4px;
            }
            
            .klite-wi-stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                font-size: 11px;
                color: var(--klite-text-secondary);
            }
            
            .klite-wi-entries {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .klite-wi-entry {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 8px;
                transition: all 0.2s ease;
            }
            
            .klite-wi-entry.disabled {
                opacity: 0.6;
                border-color: var(--klite-border);
            }
            
            .klite-wi-entry.enabled {
                border-color: var(--klite-accent);
            }
            
            .klite-wi-entry-header {
                display: flex;
                gap: 8px;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .klite-wi-toggle {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 4px 6px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s ease;
            }
            
            .klite-wi-toggle.active {
                background: var(--klite-accent);
                color: white;
            }
            
            .klite-wi-entry-info {
                flex: 1;
            }
            
            .klite-wi-keys {
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-wi-metadata {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .klite-wi-prob,
            .klite-wi-selective,
            .klite-wi-constant {
                font-size: 9px;
                padding: 2px 4px;
                border-radius: 3px;
                background: var(--klite-accent);
                color: white;
            }
            
            .klite-wi-selective {
                background: #ff9800;
            }
            
            .klite-wi-constant {
                background: #4caf50;
            }
            
            .klite-wi-entry-actions {
                display: flex;
                gap: 2px;
            }
            
            .klite-wi-entry-content {
                font-size: 11px;
                color: var(--klite-text-secondary);
                line-height: 1.4;
                margin-bottom: 4px;
            }
            
            .klite-wi-entry-comment {
                font-size: 10px;
                color: var(--klite-text-secondary);
                font-style: italic;
            }
            
            .klite-wi-entry-modal {
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .klite-wi-field {
                margin-bottom: 12px;
            }
            
            .klite-wi-field label {
                display: block;
                font-size: 11px;
                margin-bottom: 4px;
                color: var(--klite-text);
            }
            
            .klite-wi-field input,
            .klite-wi-field textarea,
            .klite-wi-field select {
                width: 100%;
                font-size: 11px;
                padding: 6px;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                background: var(--klite-input-bg);
                color: var(--klite-text);
            }
            
            .klite-wi-field textarea {
                resize: vertical;
                min-height: 80px;
            }
            
            .klite-wi-field input[type="checkbox"] {
                width: auto;
                margin-right: 6px;
            }
            
            .klite-wi-import-modal {
                width: 90%;
                max-width: 700px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .klite-wi-import-section {
                margin-bottom: 20px;
                padding: 12px;
                background: var(--klite-panel-bg);
                border-radius: 6px;
            }
            
            .klite-wi-import-section h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-wi-import-section textarea {
                width: 100%;
                height: 120px;
                margin-bottom: 8px;
                resize: vertical;
            }
            
            .klite-wi-import-section button {
                margin-right: 8px;
                margin-bottom: 4px;
            }

            /* Text Database Panel Styles */
            .klite-textdb-header {
                margin-bottom: 12px;
            }
            
            .klite-textdb-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-textdb-toggle {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--klite-text);
            }
            
            .klite-textdb-toggle input {
                margin: 0;
            }
            
            .klite-textdb-controls button {
                font-size: 10px;
                padding: 4px 8px;
            }
            
            .klite-textdb-stats {
                display: flex;
                justify-content: space-between;
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 8px;
                font-size: 10px;
            }
            
            .klite-textdb-stat {
                text-align: center;
            }
            
            .klite-textdb-stat .label {
                display: block;
                color: var(--klite-text-secondary);
                margin-bottom: 2px;
            }
            
            .klite-textdb-stat .value {
                display: block;
                color: var(--klite-text);
                font-weight: bold;
            }
            
            .klite-textdb-advanced {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 12px;
            }
            
            .klite-textdb-advanced h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-textdb-setting {
                margin-bottom: 12px;
            }
            
            .klite-textdb-setting label {
                display: block;
                font-size: 11px;
                margin-bottom: 4px;
                color: var(--klite-text);
            }
            
            .klite-textdb-setting .value {
                font-weight: bold;
                color: var(--klite-accent);
            }
            
            .klite-textdb-setting input[type="checkbox"] {
                margin-right: 6px;
            }
            
            .klite-textdb-setting small {
                display: block;
                margin-top: 4px;
                font-size: 9px;
                color: var(--klite-text-secondary);
                line-height: 1.3;
            }
            
            .klite-slider {
                width: 100%;
                margin: 4px 0;
            }
            
            .klite-textdb-editor {
                position: relative;
                margin-bottom: 12px;
            }
            
            .klite-textdb-textarea {
                width: 100%;
                height: 300px;
                font-family: monospace;
                font-size: 11px;
                line-height: 1.4;
                padding: 8px;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                background: var(--klite-input-bg);
                color: var(--klite-text);
                resize: vertical;
                overflow-y: auto;
            }
            
            .klite-textdb-textarea:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .klite-textdb-dropzone {
                border: 2px dashed var(--klite-border);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                color: var(--klite-text-secondary);
                transition: all 0.2s ease;
                cursor: pointer;
                margin-bottom: 12px;
            }
            
            .klite-textdb-dropzone.dragover {
                border-color: var(--klite-accent);
                background: var(--klite-hover-bg);
            }
            
            .klite-textdb-dropzone-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .klite-textdb-dropzone-text {
                font-size: 11px;
                line-height: 1.4;
            }
            
            .klite-textdb-dropzone-text small {
                color: var(--klite-text-secondary);
                font-size: 9px;
            }
            
            .klite-textdb-import-modal {
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .klite-textdb-import-mode {
                margin-bottom: 20px;
            }
            
            .klite-textdb-import-mode h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-textdb-import-mode label {
                display: block;
                margin-bottom: 6px;
                font-size: 11px;
                color: var(--klite-text);
            }
            
            .klite-textdb-import-mode input[type="radio"] {
                margin-right: 6px;
            }
            
            .klite-textdb-import-files {
                margin-bottom: 20px;
            }
            
            .klite-textdb-import-files h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-file-input {
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                background: var(--klite-input-bg);
                color: var(--klite-text);
            }
            
            .klite-textdb-supported-formats {
                font-size: 9px;
                color: var(--klite-text-secondary);
            }
            
            .klite-textdb-import-preview {
                margin-bottom: 20px;
            }
            
            .klite-textdb-import-preview h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
            }
            
            .klite-textdb-file-list {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 8px;
                background: var(--klite-panel-bg);
                font-size: 10px;
            }
            
            .klite-textdb-file-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px;
                margin-bottom: 4px;
                background: var(--klite-input-bg);
                border-radius: 3px;
            }
            
            .klite-textdb-file-name {
                font-weight: bold;
                color: var(--klite-text);
                flex: 1;
            }
            
            .klite-textdb-file-size {
                color: var(--klite-text-secondary);
                font-size: 9px;
                margin: 0 8px;
            }
            
            .klite-textdb-file-type {
                color: var(--klite-text-secondary);
                font-size: 9px;
            }

            /* Group Chat Panel Styles */
            .klite-group-header {
                margin-bottom: 12px;
            }
            
            .klite-group-toggle {
                margin-bottom: 8px;
            }
            
            .klite-group-toggle label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--klite-text);
            }
            
            .klite-group-toggle input {
                margin: 0;
            }
            
            .klite-group-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .klite-group-actions {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }
            
            .klite-group-actions button {
                font-size: 10px;
                padding: 4px 8px;
            }
            
            .klite-group-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: var(--klite-text-secondary);
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 6px 8px;
            }
            
            .klite-group-empty {
                text-align: center;
                padding: 20px;
                color: var(--klite-text-secondary);
                font-size: 11px;
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                margin-bottom: 12px;
            }
            
            .klite-group-chars {
                margin-bottom: 12px;
            }
            
            .klite-group-char {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                margin-bottom: 6px;
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .klite-group-char:hover {
                background: var(--klite-hover-bg);
            }
            
            .klite-group-char.active {
                border-color: var(--klite-accent);
                background: var(--klite-accent-bg);
            }
            
            .klite-group-char-info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .klite-group-char-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--klite-accent);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                overflow: hidden;
            }
            
            .klite-group-char-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }
            
            .klite-group-char-details {
                flex: 1;
            }
            
            .klite-group-char-name {
                font-weight: bold;
                color: var(--klite-text);
                font-size: 11px;
                margin-bottom: 2px;
            }
            
            .klite-group-char-desc {
                color: var(--klite-text-secondary);
                font-size: 10px;
                line-height: 1.3;
            }
            
            .klite-group-char-custom {
                display: inline-block;
                background: var(--klite-accent);
                color: white;
                font-size: 8px;
                padding: 2px 4px;
                border-radius: 3px;
                margin-top: 2px;
            }
            
            .klite-group-char-actions {
                display: flex;
                gap: 2px;
            }
            
            .klite-group-speaker {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 12px;
            }
            
            .klite-group-speaker-mode {
                margin-bottom: 8px;
            }
            
            .klite-group-speaker-mode label {
                display: block;
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-group-speaker-mode select {
                width: 100%;
                font-size: 10px;
                padding: 4px;
            }
            
            .klite-group-speaker-actions {
                display: flex;
                gap: 4px;
            }
            
            .klite-group-speaker-actions button {
                flex: 1;
                font-size: 10px;
                padding: 6px 8px;
            }
            
            .klite-group-auto {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 12px;
            }
            
            .klite-group-auto-toggle {
                margin-bottom: 8px;
            }
            
            .klite-group-auto-toggle label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--klite-text);
            }
            
            .klite-group-auto-toggle input {
                margin: 0;
            }
            
            .klite-group-auto-settings {
                border-top: 1px solid var(--klite-border);
                padding-top: 8px;
                margin-top: 8px;
            }
            
            .klite-group-auto-delay label {
                display: block;
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-group-auto-delay .value {
                font-weight: bold;
                color: var(--klite-accent);
            }
            
            .klite-group-char-modal {
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .klite-group-char-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 12px;
                max-height: 400px;
                overflow-y: auto;
                padding: 4px;
            }
            
            .klite-group-char-option {
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 12px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .klite-group-char-option:hover {
                background: var(--klite-hover-bg);
                border-color: var(--klite-accent);
            }
            
            .klite-group-char-option.selected {
                background: var(--klite-accent-bg);
                border-color: var(--klite-accent);
            }
            
            .klite-group-char-option .klite-group-char-avatar {
                width: 48px;
                height: 48px;
                margin: 0 auto 8px;
                font-size: 24px;
            }
            
            .klite-group-char-option .klite-group-char-name {
                font-weight: bold;
                color: var(--klite-text);
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .klite-group-char-option .klite-group-char-desc {
                color: var(--klite-text-secondary);
                font-size: 10px;
                line-height: 1.3;
            }
            
            .klite-group-custom-modal {
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .klite-group-custom-field {
                margin-bottom: 12px;
            }
            
            .klite-group-custom-field label {
                display: block;
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-group-custom-field .value {
                font-weight: bold;
                color: var(--klite-accent);
            }
            
            .klite-group-custom-field input,
            .klite-group-custom-field textarea {
                width: 100%;
                font-size: 11px;
                padding: 6px;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                background: var(--klite-input-bg);
                color: var(--klite-text);
            }
            
            .klite-group-custom-field textarea {
                resize: vertical;
                min-height: 60px;
            }
            
            .klite-group-custom-field small {
                display: block;
                margin-top: 4px;
                font-size: 9px;
                color: var(--klite-text-secondary);
                line-height: 1.3;
            }

            /* Help & Reference Panel Styles */
            .klite-help-search {
                margin-bottom: 12px;
            }
            
            .klite-help-filters {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-select {
                flex: 1;
                padding: 6px;
                border: 1px solid var(--klite-border-primary);
                border-radius: var(--klite-radius-sm);
                background: var(--klite-input-bg);
                color: var(--klite-input-text);
                font-size: 12px;
            }
            
            .klite-help-results {
                max-height: 300px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .klite-help-entry {
                padding: 8px;
                background: var(--klite-surface-bg);
                border: 1px solid var(--klite-border-secondary);
                border-radius: var(--klite-radius-sm);
                cursor: pointer;
                transition: all var(--klite-transition-normal);
            }
            
            .klite-help-entry:hover {
                background: var(--klite-button-hover-bg);
                border-color: var(--klite-primary-color);
            }
            
            .klite-help-title {
                font-weight: bold;
                color: var(--klite-text-primary);
                font-size: 12px;
                margin-bottom: 2px;
            }
            
            .klite-help-category {
                color: var(--klite-primary-color);
                font-size: 10px;
                margin-bottom: 4px;
            }
            
            .klite-help-preview {
                color: var(--klite-text-muted);
                font-size: 11px;
                line-height: 1.3;
            }
            
            /* Help Modal Styles */
            .klite-help-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .klite-help-modal-content {
                background: var(--klite-panel-bg);
                border: 1px solid var(--klite-border-primary);
                border-radius: var(--klite-radius-md);
                max-width: 600px;
                width: 90%;
                max-height: 80%;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .klite-help-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                border-bottom: 1px solid var(--klite-border-primary);
                background: var(--klite-panel-header-bg);
            }
            
            .klite-help-modal-header h3 {
                margin: 0;
                color: var(--klite-text-primary);
                font-size: 16px;
            }
            
            .klite-help-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: var(--klite-text-muted);
                padding: 4px;
            }
            
            .klite-help-modal-close:hover {
                color: var(--klite-text-primary);
            }
            
            .klite-help-modal-body {
                padding: 16px;
            }
            
            .klite-help-modal-category {
                color: var(--klite-primary-color);
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 12px;
            }
            
            .klite-help-modal-text {
                color: var(--klite-text-primary);
                line-height: 1.6;
                margin-bottom: 16px;
            }
            
            .klite-help-modal-keywords {
                color: var(--klite-text-muted);
                font-size: 12px;
                border-top: 1px solid var(--klite-border-secondary);
                padding-top: 8px;
            }
            
            /* Mockup Panel Styles */
            .klite-mockup-notice {
                background: var(--klite-bg-secondary);
                border: 1px solid var(--klite-warning-color);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
                position: relative;
                overflow: hidden;
            }
            
            .klite-mockup-badge {
                position: absolute;
                top: 0;
                right: 0;
                background: var(--klite-warning-color);
                color: var(--klite-text-dark);
                padding: 4px 8px;
                font-size: 10px;
                font-weight: bold;
                border-bottom-left-radius: 4px;
            }
            
            .klite-mockup-notice p {
                margin: 0;
                font-size: 11px;
                color: var(--klite-text);
                font-style: italic;
            }
            
            .klite-mockup-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
            }
            
            .klite-mockup-controls label {
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-mockup-controls input,
            .klite-mockup-controls select,
            .klite-mockup-controls textarea {
                width: 100%;
                font-size: 11px;
                padding: 6px;
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                background: var(--klite-input-bg);
                color: var(--klite-text);
                opacity: 0.7;
                pointer-events: none;
            }
            
            .klite-mockup-controls button {
                font-size: 10px;
                padding: 6px 12px;
                opacity: 0.7;
                pointer-events: none;
            }
            
            .klite-mockup-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .klite-mockup-item {
                background: var(--klite-bg-tertiary);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 8px;
                font-size: 11px;
                color: var(--klite-text);
                opacity: 0.7;
            }
            
            .klite-mockup-preview {
                background: var(--klite-bg-primary);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 12px;
                margin-top: 8px;
            }
            
            .klite-preview-panel {
                background: var(--klite-bg-secondary);
                border: 1px solid var(--klite-border);
                border-radius: 4px;
                padding: 8px;
                font-size: 11px;
                color: var(--klite-text);
                text-align: center;
                opacity: 0.7;
            }
            
            .klite-radio-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--klite-text);
                margin-bottom: 4px;
            }
            
            .klite-radio-label input[type="radio"] {
                width: auto;
                margin: 0;
            }
            
            .klite-color-input {
                width: 40px !important;
                height: 24px;
                padding: 0;
                border-radius: 4px;
                cursor: pointer;
                opacity: 0.7;
                pointer-events: none;
            }
            
            .klite-slider {
                width: 100%;
                height: 20px;
                opacity: 0.7;
                pointer-events: none;
            }
            
            .klite-character-placement {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-bottom: 8px;
            }
            
            /* Section styles for mockup panels */
            .klite-persona-sections,
            .klite-narrator-sections,
            .klite-style-sections,
            .klite-image-sections,
            .klite-scene-sections {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .klite-persona-section,
            .klite-narrator-section,
            .klite-style-section,
            .klite-image-section,
            .klite-scene-section {
                background: var(--klite-bg-secondary);
                border: 1px solid var(--klite-border);
                border-radius: 6px;
                padding: 12px;
            }
            
            .klite-persona-section h4,
            .klite-narrator-section h4,
            .klite-style-section h4,
            .klite-image-section h4,
            .klite-scene-section h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--klite-text);
                font-weight: bold;
            }
            
            .klite-prompt-templates {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid var(--klite-border);
            }
        </style>
    `;
    
    // Inject the global theme CSS
    document.head.insertAdjacentHTML('beforeend', globalThemeCSS);
    
    // Theme management functions
    const ThemeManager = {
        setTheme(theme) {
            document.documentElement.setAttribute('data-klite-theme', theme);
            localStorage.setItem('klite-theme', theme);
        },
        
        getTheme() {
            return localStorage.getItem('klite-theme') || 'dark';
        },
        
        updateCustomColors(colorMap) {
            const root = document.documentElement;
            Object.entries(colorMap).forEach(([variable, color]) => {
                root.style.setProperty(variable, color);
            });
        },
        
        resetToDefaults() {
            const root = document.documentElement;
            // Remove all custom color overrides
            const customProps = Array.from(root.style).filter(prop => prop.startsWith('--klite-'));
            customProps.forEach(prop => root.style.removeProperty(prop));
        }
    };
    
    // Initialize theme
    ThemeManager.setTheme(ThemeManager.getTheme());
    
    // Expose theme manager globally
    window.KLiteThemeManager = ThemeManager;
    
    console.log('[KLITE] Global theme system initialized');

    // =============================================
    // CORE FRAMEWORK WITH SMART MODE DETECTION
    // =============================================
    
    window.KLiteModular = {
        // Panel registry
        panels: new Map(),
        activePanels: new Map(),
        
        // State management
        isActive: false,
        currentMode: null,
        savedPanelStates: new Map(),
        
        // Configuration
        config: {
            leftPanels: ['systemprompt', 'generationcontrol', 'characters', 'worldinfo', 'textdb', 'groupchat', 'timelineindex', 'quickactions', 'autoregen', 'autosender', 'smartmemory', 'autosave', 'quickdice', 'characterpersona', 'narratorcontrols', 'imagegeneration', 'scenesetup'],
            rightPanels: ['memory', 'notes', 'authornote', 'helpreference', 'exportcontext', 'contextanalyzer', 'advancedvisualstyle'],
            panelWidth: 320,
            autoHide: true,
            showIndicator: true
        },
        
        // Theme management
        theme: window.KLiteThemeManager,
        
        // Event system
        events: new EventTarget(),
        
        // Mode monitoring
        modeMonitor: null,
        lastKnownModes: {},
        
        // Debug configuration
        debug: true,
        debugLevels: {
            init: true,
            panels: true,
            mode: false, // Too noisy - enable manually if needed
            state: true,
            config: true,
            events: false,
            ui: true,
            errors: true
        },
        
        // Storage
        storage: {
            async save(key, data) {
                try {
                    if (typeof window.indexeddb_save !== 'function') {
                        console.warn('[KLITE-Tools] Storage not ready yet, falling back to localStorage:', key);
                        localStorage.setItem(`klite_modular_${key}`, JSON.stringify(data));
                        return false;
                    }
                    
                    await window.indexeddb_save(`klite_modular_${key}`, JSON.stringify(data));
                    console.log('[KLITE-Tools] Successfully saved to Lite storage:', key);
                    return true;
                } catch (error) {
                    console.error('[KLITE-Tools] Failed to save to storage:', key, error);
                    // Fallback to localStorage
                    try {
                        localStorage.setItem(`klite_modular_${key}`, JSON.stringify(data));
                        console.log('[KLITE-Tools] Fallback save to localStorage successful:', key);
                    } catch (e) {
                        console.error('[KLITE-Tools] Both storage methods failed:', e);
                    }
                    return false;
                }
            },
            
            async load(key) {
                try {
                    if (typeof window.indexeddb_load !== 'function') {
                        console.warn('[KLITE-Tools] Storage not ready yet, falling back to localStorage:', key);
                        const data = localStorage.getItem(`klite_modular_${key}`);
                        return data ? JSON.parse(data) : null;
                    }
                    
                    const result = await window.indexeddb_load(`klite_modular_${key}`, null);
                    if (result) {
                        return JSON.parse(result);
                    }
                    
                    // Try localStorage fallback for migration
                    const localData = localStorage.getItem(`klite_modular_${key}`);
                    if (localData) {
                        console.log('[KLITE-Tools] Migrating data from localStorage to indexedDB:', key);
                        const parsed = JSON.parse(localData);
                        await this.save(key, parsed); // Save to indexedDB
                        localStorage.removeItem(`klite_modular_${key}`); // Clean up localStorage
                        return parsed;
                    }
                    
                    return null;
                } catch (error) {
                    console.error('[KLITE-Tools] Failed to load from storage:', key, error);
                    return null;
                }
            },
            
            async remove(key) {
                try {
                    if (typeof window.indexeddb_save === 'function') {
                        await window.indexeddb_save(`klite_modular_${key}`, null);
                    }
                    localStorage.removeItem(`klite_modular_${key}`);
                } catch (e) {
                    console.warn('[KLITE-Tools] Storage remove failed:', e);
                }
            }
        },
        
        // =============================================
        // MODE DETECTION SYSTEM
        // =============================================
        
        getCurrentUIMode() {
            if (!window.localsettings) return null;
            
            const opmode = window.localsettings.opmode || 1;
            let gui_type;
            
            switch(opmode) {
                case 1: gui_type = window.localsettings.gui_type_story; break;
                case 2: gui_type = window.localsettings.gui_type_adventure; break;
                case 3: gui_type = window.localsettings.gui_type_chat; break;
                case 4: gui_type = window.localsettings.gui_type_instruct; break;
                default: gui_type = 0;
            }
            
            // Use Lite's logic: aesthetic UI is active when gui_type is 1 OR 2
            const isAesthetic = this.isAestheticUIActive();
            
            // Debug logging for mode detection
            this.log('mode', `Mode detection: opmode=${opmode}, gui_type=${gui_type}, isAesthetic=${isAesthetic}`);
            
            return {
                opmode,
                gui_type,
                isAesthetic,
                modeName: this.getModeDisplayName(opmode, gui_type, isAesthetic)
            };
        },
        
        getModeDisplayName(opmode, gui_type, isAesthetic = null) {
            const opmodes = { 1: 'Story', 2: 'Adventure', 3: 'Chat', 4: 'Instruct' };
            
            // If isAesthetic is provided, use effective UI mode
            if (isAesthetic !== null) {
                if (isAesthetic) {
                    // Aesthetic mode is active - determine if it's messenger or full aesthetic
                    const effectiveUI = (gui_type === 1) ? 'Messenger' : 'Aesthetic';
                    return `${opmodes[opmode]} (${effectiveUI})`;
                } else {
                    // Not aesthetic mode - use actual gui_type
                    const gui_types = { 0: 'Classic', 3: 'Corpo' };
                    return `${opmodes[opmode]} (${gui_types[gui_type] || 'Unknown'})`;
                }
            }
            
            // Fallback for when isAesthetic not provided
            const gui_types = { 0: 'Classic', 1: 'Messenger', 2: 'Aesthetic', 3: 'Corpo' };
            return `${opmodes[opmode]} (${gui_types[gui_type] || 'Unknown'})`;
        },
        
        // Use Lite's exact logic for detecting aesthetic UI
        isAestheticUIActive() {
            if (!window.localsettings) return false;
            
            const result = ((window.localsettings.gui_type_story==1 || window.localsettings.gui_type_story==2) && window.localsettings.opmode==1)
                ||((window.localsettings.gui_type_adventure==1 || window.localsettings.gui_type_adventure==2) && window.localsettings.opmode==2)
                ||((window.localsettings.gui_type_chat==1 || window.localsettings.gui_type_chat==2) && window.localsettings.opmode==3)
                ||((window.localsettings.gui_type_instruct==1 || window.localsettings.gui_type_instruct==2) && window.localsettings.opmode==4);
            
            // Debug the individual gui_type values
            this.log('mode', `Aesthetic UI check: story=${window.localsettings.gui_type_story}, adventure=${window.localsettings.gui_type_adventure}, chat=${window.localsettings.gui_type_chat}, instruct=${window.localsettings.gui_type_instruct}, opmode=${window.localsettings.opmode}, result=${result}`);
            
            return result;
        },
        
        isAestheticModeActive() {
            return this.isAestheticUIActive();
        },
        
        startModeMonitoring() {
            this.log('mode', 'Starting mode monitoring...');
            
            // Store initial state
            this.lastKnownModes = this.getCurrentUIMode();
            this.log('mode', 'Initial mode:', this.lastKnownModes);
            
            // Monitor for changes every 500ms
            this.modeMonitor = setInterval(() => {
                const currentMode = this.getCurrentUIMode();
                if (!currentMode) return;
                
                // Debug logging every 10 seconds if no change
                if (!this.lastDebugLog || Date.now() - this.lastDebugLog > 10000) {
                    this.log('mode', 'Current status:', {
                        opmode: currentMode.opmode,
                        gui_type: currentMode.gui_type,
                        isAesthetic: currentMode.isAesthetic,
                        modeName: currentMode.modeName,
                        isActive: this.isActive
                    });
                    this.lastDebugLog = Date.now();
                }
                
                // Check if mode changed
                if (JSON.stringify(currentMode) !== JSON.stringify(this.lastKnownModes)) {
                    this.handleModeChange(this.lastKnownModes, currentMode);
                    this.lastKnownModes = currentMode;
                }
            }, 500);
        },
        
        stopModeMonitoring() {
            if (this.modeMonitor) {
                clearInterval(this.modeMonitor);
                this.modeMonitor = null;
            }
        },
        
        async handleModeChange(oldMode, newMode) {
            this.log('mode', 'Mode change detected:', {
                from: oldMode?.modeName || 'Unknown',
                to: newMode.modeName,
                wasAesthetic: oldMode?.isAesthetic || false,
                nowAesthetic: newMode.isAesthetic
            });
            
            // Was aesthetic, now not aesthetic - hide gracefully
            if (oldMode?.isAesthetic && !newMode.isAesthetic) {
                this.hidePanels();
            }
            
            // Was not aesthetic, now aesthetic - show gracefully
            if (!oldMode?.isAesthetic && newMode.isAesthetic) {
                await this.showPanels();
            }
            
            // Update indicator
            this.updateIndicator(newMode);
            
            // Emit event
            this.emit('mode-changed', { oldMode, newMode });
        },
        
        // =============================================
        // GRACEFUL SHOW/HIDE SYSTEM
        // =============================================
        
        async showPanels() {
            this.log('state', 'Showing panels for aesthetic mode...');
            
            if (this.isActive) return;
            
            try {
                // Create UI if it doesn't exist
                if (!document.getElementById('klite-modular-container')) {
                    this.createUI();
                }
                
                // Set active state BEFORE restoring panel states so renderPanels() works
                this.isActive = true;
                
                // Restore panel states
                await this.restorePanelStates();
                
                // Show panels with animation
                this.showPanelsWithAnimation();
                
                this.emit('panels-shown');
                
                // Show welcome message
                this.showWelcomeMessage();
                
                this.log('state', 'Panels shown successfully');
            } catch (error) {
                this.log('error', 'Error during graceful show:', error);
                this.isActive = false; // Reset state on error
                throw error;
            }
        },
        
        hidePanels() {
            this.log('state', 'Hiding panels (exiting aesthetic mode)...');
            
            if (!this.isActive) return;
            
            // Save current panel states
            this.savePanelStates();
            
            // Hide panels with animation
            this.hidePanelsWithAnimation();
            
            this.isActive = false;
            this.emit('panels-hidden');
            
            // Show goodbye message
            this.showGoodbyeMessage();
        },
        
        savePanelStates() {
            // Save which panels are active and their data
            const states = {};
            
            this.activePanels.forEach((panel, name) => {
                states[name] = {
                    active: true,
                    data: panel.saveState ? panel.saveState() : null
                };
            });
            
            this.storage.save('panel_states', states);
            this.log('state', 'Panel states saved');
        },
        
        async restorePanelStates() {
            const states = this.storage.load('panel_states') || {};
            
            await Promise.all(Object.keys(states).map(async panelName => {
                if (states[panelName].active) {
                    // Only try to load panels that exist
                    if (this.panels.has(panelName)) {
                        const panel = await this.loadPanel(panelName);
                        if (panel && panel.restoreState && states[panelName].data) {
                            panel.restoreState(states[panelName].data);
                        }
                    } else {
                        this.log('state', `Skipping restore for missing panel: ${panelName}`);
                    }
                }
            }));
            
            await this.renderPanels();
            this.log('state', 'Panel states restored');
        },
        
        showPanelsWithAnimation() {
            const container = document.getElementById('klite-modular-container');
            if (!container) return;
            
            // Start hidden
            container.style.opacity = '0';
            container.style.display = 'block';
            
            // Animate in
            setTimeout(() => {
                container.style.transition = 'opacity 0.3s ease-in-out';
                container.style.opacity = '1';
            }, 50);
        },
        
        hidePanelsWithAnimation() {
            const container = document.getElementById('klite-modular-container');
            if (!container) return;
            
            // Animate out
            container.style.transition = 'opacity 0.3s ease-in-out';
            container.style.opacity = '0';
            
            // Hide after animation
            setTimeout(() => {
                container.style.display = 'none';
            }, 300);
        },
        
        showWelcomeMessage() {
            const mode = this.getCurrentUIMode();
            this.showNotification(`🎉 KLITE Enhanced - ${mode.modeName}`, 'success');
        },
        
        showGoodbyeMessage() {
            const mode = this.getCurrentUIMode();
            this.showNotification(`💤 KLITE Sleeping - ${mode.modeName}`, 'info');
        },
        
        // =============================================
        // INDICATOR SYSTEM
        // =============================================
        
        updateIndicator(mode) {
            const indicator = document.getElementById('klite-mode-indicator');
            if (!indicator) return;
            
            const status = mode.isAesthetic ? 'ACTIVE' : 'STANDBY';
            const color = mode.isAesthetic ? '#4CAF50' : '#FFC107';
            
            // Get the actual current mode name using effective UI mode
            const currentModeName = this.getModeDisplayName(mode.opmode, mode.gui_type, mode.isAesthetic);
            
            indicator.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; animation: pulse 2s infinite;"></div>
                    <span style="font-size: 11px;">KLITE Tools</span>
                </div>
                <div style="font-size: 10px; opacity: 0.7;">${status} • ${currentModeName}</div>
            `;
        },
        
        createIndicator() {
            const indicator = document.createElement('div');
            indicator.id = 'klite-mode-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(26, 26, 26, 0.95);
                color: #e0e0e0;
                padding: 8px 12px;
                border-radius: 8px;
                font-family: system-ui, sans-serif;
                font-size: 11px;
                z-index: 1000;
                border: 1px solid #444;
                backdrop-filter: blur(10px);
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
            
            // Click to show config
            indicator.onclick = () => {
                if (this.isActive) {
                    this.showConfig();
                } else {
                    this.showStatusDialog();
                }
            };
            
            indicator.onmouseenter = () => {
                indicator.style.transform = 'scale(1.05)';
            };
            
            indicator.onmouseleave = () => {
                indicator.style.transform = 'scale(1)';
            };
            
            document.body.appendChild(indicator);
            return indicator;
        },
        
        showStatusDialog() {
            const mode = this.getCurrentUIMode();
            const message = mode.isAesthetic 
                ? 'KLITE Tools are active! Your panels are ready to use.'
                : `KLITE Tools is in standby mode.\
\
To activate, switch to Aesthetic mode in KoboldAI Lite's settings.\
\
Current mode: ${mode.modeName}`;
            
            alert(message);
        },
        
        // =============================================
        // NOTIFICATION SYSTEM
        // =============================================
        
        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const colors = {
                success: '#4CAF50',
                info: '#2196F3',
                warning: '#FF9800',
                error: '#F44336'
            };
            
            notification.style.cssText = `
                position: fixed;
                top: 50px;
                right: 20px;
                background: ${colors[type]};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-family: system-ui, sans-serif;
                font-size: 14px;
                z-index: 1001;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
            // Add animations
            if (!document.getElementById('notification-animations')) {
                const style = document.createElement('style');
                style.id = 'notification-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        },
        
        // =============================================
        // CORE METHODS (Updated)
        // =============================================
        
        registerPanel(name, panelClass) {
            this.log('panels', `Registering panel: ${name}`);
            this.panels.set(name, panelClass);
            this.emit('panel-registered', { name, panelClass });
        },
        
        async loadPanel(name) {
            if (!this.panels.has(name)) {
                this.log('panels', `Panel not found: ${name} (skipping)`);
                return null;
            }
            
            if (this.activePanels.has(name)) {
                return this.activePanels.get(name);
            }
            
            const PanelClass = this.panels.get(name);
            const panel = new PanelClass(name);
            this.activePanels.set(name, panel);
            
            // Initialize panel
            if (panel.init) {
                await panel.init();
            }
            
            this.log('panels', `Panel loaded: ${name}`);
            this.emit('panel-loaded', { name, panel });
            return panel;
        },
        
        // Debug system
        log(category, message, ...args) {
            if (this.debug && this.debugLevels[category]) {
                const prefix = `[KLITE][${category.toUpperCase()}]`;
                console.log(`${prefix} ${message}`, ...args);
            }
        },
        
        error(message, ...args) {
            if (this.debug) {
                console.error(`[KLITE][ERROR] ${message}`, ...args);
            }
        },
        
        // Debug control functions
        enableDebug(category = null) {
            if (category) {
                this.debugLevels[category] = true;
                this.log('config', `Debug enabled for category: ${category}`);
            } else {
                this.debug = true;
                this.log('config', 'Global debug enabled');
            }
        },
        
        disableDebug(category = null) {
            if (category) {
                this.debugLevels[category] = false;
                console.log(`[KLITE][CONFIG] Debug disabled for category: ${category}`);
            } else {
                this.debug = false;
                console.log(`[KLITE][CONFIG] Global debug disabled`);
            }
        },
        
        showDebugStatus() {
            console.log(`[KLITE][CONFIG] Debug Status:`, {
                globalDebug: this.debug,
                debugLevels: this.debugLevels,
                activeCategories: Object.keys(this.debugLevels).filter(cat => this.debugLevels[cat])
            });
        },
        
        // Event system
        emit(event, data) {
            this.events.dispatchEvent(new CustomEvent(event, { detail: data }));
        },
        
        on(event, handler) {
            this.events.addEventListener(event, handler);
        },
        
        // Configuration management
        async saveConfig() {
            await this.storage.save('config', this.config);
            this.log('config', 'Configuration saved');
        },
        
        async loadConfig() {
            const saved = await this.storage.load('config');
            if (saved) {
                // Clean up any invalid panels before applying config
                const validPanels = Array.from(this.panels.keys());
                const cleanedConfig = {
                    ...this.config,
                    ...saved,
                    leftPanels: (saved.leftPanels || []).filter(panel => validPanels.includes(panel)),
                    rightPanels: (saved.rightPanels || []).filter(panel => validPanels.includes(panel))
                };
                this.config = cleanedConfig;
                this.log('config', 'Configuration loaded and cleaned:', cleanedConfig);
            } else {
                this.log('config', 'No saved configuration found, using defaults');
                // Clean up default config as well
                const validPanels = Array.from(this.panels.keys());
                this.config.leftPanels = this.config.leftPanels.filter(panel => validPanels.includes(panel));
                this.config.rightPanels = this.config.rightPanels.filter(panel => validPanels.includes(panel));
                this.log('config', 'Default configuration cleaned:', this.config);
            }
        },
        
        // Panel positioning
        async setPanelPosition(panelName, position) {
            // Get current visual order from DOM
            const overlay = document.querySelector('.klite-config-overlay');
            const visualOrder = overlay ? 
                Array.from(overlay.querySelectorAll('.klite-panel-box')).map(box => box.dataset.panel) :
                [];
            
            // Remove from current position
            this.config.leftPanels = this.config.leftPanels.filter(p => p !== panelName);
            this.config.rightPanels = this.config.rightPanels.filter(p => p !== panelName);
            
            // Add to new position, respecting visual order
            if (position === 'left') {
                this.insertPanelInOrder(panelName, 'left', visualOrder);
            } else if (position === 'right') {
                this.insertPanelInOrder(panelName, 'right', visualOrder);
            }
            
            await this.saveConfig();
            await this.renderPanels();
            
            // Update configuration modal if it's open
            this.updateConfigModal();
            
            console.log(`[KLITE-Tools] Panel ${panelName} moved to ${position} - Left: [${this.config.leftPanels.join(', ')}], Right: [${this.config.rightPanels.join(', ')}]`);
        },
        
        // Insert panel in correct position based on visual order
        insertPanelInOrder(panelName, targetSide, visualOrder) {
            const targetArray = targetSide === 'left' ? this.config.leftPanels : this.config.rightPanels;
            
            // Find where this panel should go based on visual order
            const panelVisualIndex = visualOrder.indexOf(panelName);
            
            if (panelVisualIndex === -1) {
                // Panel not found in visual order, add to end
                targetArray.push(panelName);
                return;
            }
            
            // Find the correct insertion position
            let insertIndex = 0;
            
            // Look at panels that appear before this one in visual order
            for (let i = 0; i < panelVisualIndex; i++) {
                const earlierPanel = visualOrder[i];
                const positionInTarget = targetArray.indexOf(earlierPanel);
                
                if (positionInTarget !== -1) {
                    // This earlier panel is already in our target side
                    insertIndex = Math.max(insertIndex, positionInTarget + 1);
                }
            }
            
            // Insert at the calculated position
            targetArray.splice(insertIndex, 0, panelName);
            
            console.log(`[KLITE-Tools] Inserted ${panelName} at position ${insertIndex} in ${targetSide} panel (visual index: ${panelVisualIndex})`);
        },
        
        // Hide panel (remove from both left and right)
        async hidePanel(panelName) {
            // Remove from both sides
            this.config.leftPanels = this.config.leftPanels.filter(p => p !== panelName);
            this.config.rightPanels = this.config.rightPanels.filter(p => p !== panelName);
            
            await this.saveConfig();
            await this.renderPanels();
            
            // Update configuration modal if it's open
            this.updateConfigModal();
            
            console.log(`[KLITE-Tools] Panel ${panelName} hidden - Left: [${this.config.leftPanels.join(', ')}], Right: [${this.config.rightPanels.join(', ')}]`);
        },
        
        // Generate configuration table HTML
        generateConfigTable() {
            const maxRows = Math.max(this.config.leftPanels.length, this.config.rightPanels.length, 1);
            
            let tableRows = '';
            for (let i = 0; i < maxRows; i++) {
                const leftPanel = this.config.leftPanels[i] || '';
                const rightPanel = this.config.rightPanels[i] || '';
                
                tableRows += `
                    <tr>
                        <td>${leftPanel || '<span class="klite-panel-empty">—</span>'}</td>
                        <td>${rightPanel || '<span class="klite-panel-empty">—</span>'}</td>
                    </tr>
                `;
            }
            
            return `
                <table class="klite-config-table">
                    <thead>
                        <tr>
                            <th>KLITE Left Panel</th>
                            <th>KLITE Right Panel</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
        },

        // Update configuration modal if open
        updateConfigModal() {
            const overlay = document.querySelector('.klite-config-overlay');
            if (!overlay) return;
            
            // Find the current configuration section and update it with new table
            const configSection = overlay.querySelector('#klite-current-config-section');
            if (configSection) {
                configSection.innerHTML = `
                    <h4>Current Configuration:</h4>
                    ${this.generateConfigTable()}
                `;
                console.log('[KLITE-Tools] Configuration table updated');
            }
        },
        
        // UI Management (mostly same as before, but conditional)
        createUI() {
            if (document.getElementById('klite-modular-container')) return;
            
            const container = document.createElement('div');
            container.id = 'klite-modular-container';
            container.style.display = 'none'; // Start hidden
            container.innerHTML = `
                <style>
                    #klite-modular-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        pointer-events: none;
                        z-index: 100;
                    }
                    
                    .klite-modular-panel {
                        position: fixed;
                        background: rgba(26, 26, 26, 0.95);
                        border: 1px solid #444;
                        border-radius: 8px;
                        color: #e0e0e0;
                        font-family: system-ui, sans-serif;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        backdrop-filter: blur(10px);
                        pointer-events: auto;
                        overflow: hidden;
                        transition: all 0.3s ease;
                    }
                    
                    .klite-modular-panel.left {
                        left: 20px;
                        top: 20px;
                        bottom: 20px;
                        width: ${this.config.panelWidth}px;
                    }
                    
                    .klite-modular-panel.right {
                        right: 20px;
                        top: 20px;
                        bottom: 20px;
                        width: ${this.config.panelWidth}px;
                    }
                    
                    .klite-panel-header {
                        background: rgba(42, 42, 42, 0.9);
                        padding: 12px;
                        border-bottom: 1px solid #444;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        backdrop-filter: blur(5px);
                    }
                    
                    .klite-panel-title {
                        font-weight: 600;
                        font-size: 14px;
                        color: #4a9eff;
                    }
                    
                    .klite-panel-controls {
                        display: flex;
                        gap: 8px;
                    }
                    
                    .klite-panel-btn {
                        background: #404040;
                        border: 1px solid #555;
                        color: #e0e0e0;
                        padding: 4px 8px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: all 0.2s;
                    }
                    
                    .klite-panel-btn:hover {
                        background: #505050;
                    }
                    
                    .klite-panel-content {
                        padding: 16px;
                        height: calc(100% - 60px);
                        overflow-y: auto;
                    }
                    
                    .klite-input {
                        background: rgba(42, 42, 42, 0.9);
                        border: 1px solid #444;
                        color: #e0e0e0;
                        border-radius: 4px;
                        outline: none;
                    }
                    
                    .klite-input:focus {
                        border-color: #4a9eff;
                        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
                    }
                    
                    /* Modal styles */
                    .klite-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        backdrop-filter: blur(4px);
                    }
                    
                    .klite-modal {
                        background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
                        border: 2px solid #4a9eff;
                        border-radius: 12px;
                        color: #e0e0e0;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                        max-width: 90vw;
                        width: 100%;
                        margin: 20px;
                    }
                    
                    .klite-modal-header {
                        padding: 16px 20px;
                        background: linear-gradient(90deg, #4a9eff 0%, #3d85d9 100%);
                        color: white;
                        border-radius: 10px 10px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .klite-modal-header h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    
                    .klite-modal-close {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 18px;
                        font-weight: bold;
                        transition: all 0.2s ease;
                    }
                    
                    .klite-modal-close:hover {
                        background: rgba(255,255,255,0.3);
                        transform: scale(1.1);
                    }
                    
                    .klite-modal-content {
                        padding: 20px;
                    }
                    
                    /* Tags */
                    .klite-tag {
                        display: inline-block;
                        background: #4a9eff;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 9px;
                        margin: 1px 2px 1px 0;
                        font-weight: 500;
                    }
                    
                    /* Mini buttons */
                    .klite-mini-btn {
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: #e0e0e0;
                        padding: 2px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                        transition: all 0.2s ease;
                    }
                    
                    .klite-mini-btn:hover {
                        background: rgba(74, 158, 255, 0.3);
                        border-color: #4a9eff;
                    }
                    
                    /* Select styling */
                    .klite-select {
                        background: rgba(42, 42, 42, 0.9);
                        border: 1px solid #444;
                        color: #e0e0e0;
                        border-radius: 4px;
                        outline: none;
                    }
                    
                    .klite-select:focus {
                        border-color: #4a9eff;
                        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
                    }
                    
                    /* Danger button style */
                    .klite-panel-btn.danger {
                        background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
                        border-color: #d32f2f;
                    }
                    
                    .klite-panel-btn.danger:hover {
                        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
                        border-color: #f44336;
                    }
                    
                    .klite-select:focus {
                        border-color: #4a9eff;
                        box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
                    }
                    
                    .klite-config-panel {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(26, 26, 26, 0.98);
                        border: 1px solid #444;
                        border-radius: 8px;
                        padding: 20px;
                        min-width: 400px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                        backdrop-filter: blur(20px);
                        z-index: 1000;
                        color: #e0e0e0;
                    }
                    
                    .klite-config-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.7);
                        z-index: 999;
                        backdrop-filter: blur(2px);
                    }
                    
                    .klite-panel-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid #333;
                        color: #e0e0e0;
                    }
                    
                    .klite-panel-item:last-child {
                        border-bottom: none;
                    }
                    
                    .klite-config-panel h3, .klite-config-panel h4 {
                        color: #e0e0e0;
                    }
                </style>
                
                <div id="klite-left-panel" class="klite-modular-panel left" style="display: none;">
                    <div class="klite-panel-header">
                        <div class="klite-panel-title">Left Panel</div>
                        <div class="klite-panel-controls">
                            <button class="klite-panel-btn" onclick="KLiteModular.togglePanel('left')" title="Hide Panel">Hide</button>
                        </div>
                    </div>
                    <div class="klite-panel-content" id="klite-left-content"></div>
                </div>
                
                <div id="klite-right-panel" class="klite-modular-panel right" style="display: none;">
                    <div class="klite-panel-header">
                        <div class="klite-panel-title">Right Panel</div>
                        <div class="klite-panel-controls">
                            <button class="klite-panel-btn" onclick="KLiteModular.togglePanel('right')" title="Hide Panel">Hide</button>
                        </div>
                    </div>
                    <div class="klite-panel-content" id="klite-right-content"></div>
                </div>
            `;
            
            document.body.appendChild(container);
        },
        
        async renderPanels() {
            if (!this.isActive) return;
            
            // Render left panels
            const leftContent = document.getElementById('klite-left-content');
            const rightContent = document.getElementById('klite-right-content');
            
            if (leftContent) {
                leftContent.innerHTML = await this.renderPanelGroup(this.config.leftPanels);
                document.getElementById('klite-left-panel').style.display = 
                    this.config.leftPanels.length > 0 ? 'block' : 'none';
            }
            
            if (rightContent) {
                rightContent.innerHTML = await this.renderPanelGroup(this.config.rightPanels);
                document.getElementById('klite-right-panel').style.display = 
                    this.config.rightPanels.length > 0 ? 'block' : 'none';
            }
        },
        
        async renderPanelGroup(panelNames) {
            const panels = await Promise.all(panelNames.map(async name => {
                const panel = await this.loadPanel(name);
                return { name, panel };
            }));
            
            const html = panels.map(({ name, panel }) => {
                if (!panel) return '';
                
                return `
                    <div class="klite-panel-section">
                        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #4a9eff;">${panel.displayName}</h3>
                        ${panel.render()}
                    </div>
                `;
            }).join('<hr style="margin: 20px 0; border: 1px solid #333;">');
            
            // Set up event handlers after DOM is updated
            setTimeout(() => {
                panelNames.forEach(async name => {
                    const panel = await this.loadPanel(name);
                    if (panel && panel.postRender) {
                        panel.postRender();
                    }
                });
            }, 50);
            
            return html;
        },
        
        togglePanel(position) {
            const panel = document.getElementById(`klite-${position}-panel`);
            if (panel) {
                const wasVisible = panel.style.display !== 'none';
                panel.style.display = wasVisible ? 'none' : 'block';
                
                this.log('ui', `${position} panel ${wasVisible ? 'hidden' : 'shown'}`);
            }
        },
        
        resetPanelVisibility() {
            const leftPanel = document.getElementById('klite-left-panel');
            const rightPanel = document.getElementById('klite-right-panel');
            
            if (leftPanel && this.config.leftPanels.length > 0) {
                leftPanel.style.display = 'block';
                this.log('ui', 'Left panel reset to visible');
            }
            
            if (rightPanel && this.config.rightPanels.length > 0) {
                rightPanel.style.display = 'block';
                this.log('ui', 'Right panel reset to visible');
            }
        },
        
        showConfig() {
            // Reset panels to visible when opening config
            this.resetPanelVisibility();
            
            const availablePanels = Array.from(this.panels.keys());
            const mode = this.getCurrentUIMode();
            
            const overlay = document.createElement('div');
            overlay.className = 'klite-config-overlay';
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
            
            const configPanel = document.createElement('div');
            configPanel.className = 'klite-config-panel';
            configPanel.innerHTML = `
                <style>
                .klite-config-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .klite-config-panel {
                    background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
                    border: 2px solid #4a9eff;
                    border-radius: 12px;
                    padding: 24px;
                    width: 500px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #e0e0e0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                
                .klite-config-panel h3 {
                    margin: 0 0 20px 0;
                    color: #4a9eff;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .klite-config-panel h4 {
                    margin: 0 0 12px 0;
                    color: #e0e0e0;
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .klite-config-status {
                    margin-bottom: 20px;
                    padding: 12px;
                    background: rgba(74, 158, 255, 0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(74, 158, 255, 0.3);
                }
                
                .klite-panel-box {
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s ease;
                    cursor: move;
                }
                
                .klite-panel-box:hover {
                    background: #3a3a3a;
                    border-color: #4a9eff;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(74, 158, 255, 0.2);
                }
                
                .klite-panel-box.dragging {
                    opacity: 0.5;
                    transform: rotate(2deg);
                }
                
                .klite-drag-handle {
                    color: #888;
                    font-size: 16px;
                    cursor: grab;
                    user-select: none;
                    touch-action: none;
                }
                
                .klite-drag-handle:active {
                    cursor: grabbing;
                }
                
                .klite-panel-name {
                    flex: 1;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .klite-panel-controls {
                    display: flex;
                    gap: 6px;
                }
                
                .klite-panel-btn {
                    background: #4a9eff;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .klite-panel-btn:hover {
                    background: #3d85d9;
                    transform: scale(1.05);
                }
                
                .klite-panel-btn.secondary {
                    background: #666;
                }
                
                .klite-panel-btn.secondary:hover {
                    background: #777;
                }
                
                .klite-config-section {
                    margin-bottom: 24px;
                }
                
                .klite-current-config {
                    background: #252525;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 8px;
                }
                
                .klite-config-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    background: #252525;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-top: 8px;
                }
                
                .klite-config-table th {
                    background: #4a9eff;
                    color: white;
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 500;
                    font-size: 14px;
                    border: none;
                }
                
                .klite-config-table th:first-child {
                    border-radius: 8px 0 0 0;
                }
                
                .klite-config-table th:last-child {
                    border-radius: 0 8px 0 0;
                }
                
                .klite-config-table td {
                    padding: 8px 16px;
                    border-bottom: 1px solid #333;
                    vertical-align: top;
                    color: #e0e0e0;
                    font-size: 13px;
                    font-family: monospace;
                }
                
                .klite-config-table tr:last-child td {
                    border-bottom: none;
                }
                
                .klite-config-table tr:last-child td:first-child {
                    border-radius: 0 0 0 8px;
                }
                
                .klite-config-table tr:last-child td:last-child {
                    border-radius: 0 0 8px 0;
                }
                
                .klite-panel-empty {
                    color: #888;
                    font-style: italic;
                }
                
                .klite-config-actions {
                    text-align: right;
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #444;
                }
                
                .klite-drop-zone {
                    min-height: 60px;
                    border: 2px dashed #666;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 8px 0;
                    color: #888;
                    font-style: italic;
                    transition: all 0.2s ease;
                }
                
                .klite-drop-zone.drag-over {
                    border-color: #4a9eff;
                    background: rgba(74, 158, 255, 0.1);
                    color: #4a9eff;
                }
                </style>
                
                <h3>KLITE Tools Configuration</h3>
                
                <div class="klite-config-status">
                    <strong>Status:</strong> ${this.isActive ? '🟢 Active' : '🟡 Standby'} • ${mode.modeName}<br>
                    <small style="opacity: 0.8; margin-top: 4px; display: block;">💡 Opening this config automatically shows all panels</small>
                </div>
                
                <div class="klite-config-section">
                    <h4>Available Panels:</h4>
                    ${availablePanels.map(name => `
                        <div class="klite-panel-box" draggable="true" data-panel="${name}">
                            <span class="klite-drag-handle">≡</span>
                            <span class="klite-panel-name">${name}</span>
                            <div class="klite-panel-controls">
                                <button class="klite-panel-btn" onclick="KLiteModular.setPanelPosition('${name}', 'left')">← Left</button>
                                <button class="klite-panel-btn secondary" onclick="KLiteModular.hidePanel('${name}')">Hide</button>
                                <button class="klite-panel-btn" onclick="KLiteModular.setPanelPosition('${name}', 'right')">Right →</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="klite-config-section" id="klite-current-config-section">
                    <h4>Current Configuration:</h4>
                    ${this.generateConfigTable()}
                </div>
                
                <div class="klite-config-actions">
                    <button class="klite-panel-btn secondary" onclick="this.closest('.klite-config-overlay').remove()">Close</button>
                </div>
            `;
            
            overlay.appendChild(configPanel);
            document.body.appendChild(overlay);
            
            // Initialize drag and drop functionality
            this.initializePanelDragDrop(configPanel);
        },
        
        // Initialize drag and drop for panel configuration
        initializePanelDragDrop(configPanel) {
            let draggedElement = null;
            let draggedPanel = null;
            
            // Add drag event listeners to all panel boxes
            const panelBoxes = configPanel.querySelectorAll('.klite-panel-box');
            
            panelBoxes.forEach(box => {
                // Drag start
                box.addEventListener('dragstart', (e) => {
                    draggedElement = box;
                    draggedPanel = box.dataset.panel;
                    box.classList.add('dragging');
                    
                    // Set drag data
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', draggedPanel);
                });
                
                // Drag end
                box.addEventListener('dragend', () => {
                    box.classList.remove('dragging');
                    
                    // Remove drag-over states from all elements
                    configPanel.querySelectorAll('.drag-over').forEach(el => {
                        el.classList.remove('drag-over');
                    });
                    
                    draggedElement = null;
                    draggedPanel = null;
                });
                
                // Drag over (for reordering within the same container)
                box.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    
                    if (draggedElement && draggedElement !== box) {
                        const rect = box.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        
                        if (e.clientY < midpoint) {
                            // Insert before this element
                            box.parentNode.insertBefore(draggedElement, box);
                        } else {
                            // Insert after this element
                            box.parentNode.insertBefore(draggedElement, box.nextSibling);
                        }
                    }
                });
                
                // Visual feedback on drag enter
                box.addEventListener('dragenter', (e) => {
                    e.preventDefault();
                    if (draggedElement && draggedElement !== box) {
                        box.classList.add('drag-over');
                    }
                });
                
                // Remove visual feedback on drag leave
                box.addEventListener('dragleave', (e) => {
                    // Only remove if we're actually leaving the element (not entering a child)
                    if (!box.contains(e.relatedTarget)) {
                        box.classList.remove('drag-over');
                    }
                });
            });
            
            // Handle drop to reorder panels
            const availablePanelsSection = configPanel.querySelector('.klite-config-section');
            if (availablePanelsSection) {
                availablePanelsSection.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    
                    if (draggedPanel) {
                        // Get new order of panels based on DOM order
                        const newOrder = Array.from(availablePanelsSection.querySelectorAll('.klite-panel-box'))
                            .map(box => box.dataset.panel);
                        
                        console.log(`[KLITE-Tools] Panel order changed:`, newOrder);
                        
                        // Update the actual config arrays to maintain the new order
                        await this.updatePanelOrder(newOrder);
                        
                        // Update the table and panels
                        this.updateConfigModal();
                        this.renderPanels();
                    }
                });
            }
        },
        
        // Update panel order based on drag-and-drop reordering
        async updatePanelOrder(newOrder) {
            // Create new arrays maintaining current left/right assignments but with new order
            const newLeftPanels = [];
            const newRightPanels = [];
            
            // Go through the new order and place panels in their current left/right positions
            newOrder.forEach(panelName => {
                if (this.config.leftPanels.includes(panelName)) {
                    newLeftPanels.push(panelName);
                } else if (this.config.rightPanels.includes(panelName)) {
                    newRightPanels.push(panelName);
                }
                // If panel isn't in left or right, it stays available (no action needed)
            });
            
            // Update the config with the new ordered arrays
            this.config.leftPanels = newLeftPanels;
            this.config.rightPanels = newRightPanels;
            
            // Save the configuration
            this.saveConfig();
            
            console.log(`[KLITE-Tools] Updated panel order - Left: [${newLeftPanels.join(', ')}], Right: [${newRightPanels.join(', ')}]`);
        },
        
        // Initialize framework
        async init() {
            this.log('init', 'Initializing KLITE-Tools framework...');
            
            // Load configuration
            await this.loadConfig();
            
            // Create indicator
            this.createIndicator();
            
            // Start monitoring for mode changes
            this.startModeMonitoring();
            
            // Initial check - if already in aesthetic mode, show panels
            if (this.isAestheticModeActive()) {
                setTimeout(async () => await this.showPanels(), 1000);
            }
            
            // Update initial indicator
            const mode = this.getCurrentUIMode();
            if (mode) {
                this.updateIndicator(mode);
            }
            
            this.log('init', 'KLITE-Tools framework initialized');
        }
    };
    
    // =============================================
    // BASE PANEL CLASS (Enhanced)
    // =============================================
    
    class KLitePanel {
        constructor(name) {
            this.name = name;
            this.displayName = name.toUpperCase();
            this.storage_prefix = `klite_panel_${name}_`;
        }
        
        // Required methods
        render() {
            return '<p>Panel not implemented</p>';
        }
        
        init() {
            // Optional initialization
        }
        
        cleanup() {
            // Optional cleanup
        }
        
        // State management
        saveState() {
            // Override in panels to save state
            return null;
        }
        
        restoreState(_state) {
            // Override in panels to restore state
        }
        
        // Shared utilities
        emit(event, data) {
            KLiteModular.emit(event, { ...data, panel: this.name });
        }
        
        on(event, handler) {
            KLiteModular.on(event, handler);
        }
        
        saveData(key, data) {
            KLiteModular.storage.save(this.storage_prefix + key, data);
        }
        
        loadData(key) {
            return KLiteModular.storage.load(this.storage_prefix + key);
        }
    }
    
    // =============================================
    // PANEL IMPLEMENTATIONS - PHASE 1
    // =============================================
    
    // SystemPrompt Panel
    class SystemPromptPanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'System Prompt';
            this.currentPrompt = '';
            this.presets = this.getDefaultPresets();
            this.alwaysAppendToAuthorNote = false;
            this.lastAppliedTarget = null; // Track where we last applied
        }
        
        getDefaultPresets() {
            return {
                'Default': 'You are a helpful AI assistant.',
                'Creative Writing': 'You are an experienced creative writer helping to craft engaging stories. Focus on vivid descriptions, compelling characters, and interesting plot developments.',
                'D&D Game Master': 'You are an experienced Dungeon Master running a D&D campaign. Describe scenes vividly, manage NPCs realistically, and create engaging encounters while following the rules.',
                'Roleplay Assistant': 'You are helping facilitate a roleplay scenario. Stay in character, respond appropriately to the situation, and help maintain immersion.',
                'Story Continuator': 'Continue the story naturally, maintaining consistency with established characters, setting, and tone. Add interesting developments while respecting the existing narrative.',
                'Custom': ''
            };
        }
        
        getCurrentMode() {
            return window.localsettings ? window.localsettings.opmode : 1;
        }
        
        isInstructMode() {
            const mode = this.getCurrentMode();
            // Handle both string and number values
            return mode === 4 || mode === "4";
        }
        
        getTargetInfo() {
            const isInstruct = this.isInstructMode();
            
            // Debug logging
            console.log('[SystemPrompt] Mode detection:', {
                opmode: window.localsettings?.opmode,
                isInstruct,
                alwaysAppendToAuthorNote: this.alwaysAppendToAuthorNote
            });
            
            // In instruct mode: use instruct_sysprompt unless user forces author's note
            // In other modes: always use author's note
            if (isInstruct && !this.alwaysAppendToAuthorNote) {
                return {
                    target: 'instruct_sysprompt',
                    name: 'Instruct System Prompt',
                    description: 'System prompt will use Instruct mode\'s built-in system prompt'
                };
            } else {
                return {
                    target: 'author_note',
                    name: 'Author\'s Note',
                    description: isInstruct ? 'System prompt will be added to Author\'s Note (user preference)' : 'System prompt will be added to Author\'s Note (required for this mode)'
                };
            }
        }
        
        render() {
            const targetInfo = this.getTargetInfo();
            const modeNames = { 1: 'Story', 2: 'Adventure', 3: 'Chat', 4: 'Instruct' };
            const currentMode = modeNames[this.getCurrentMode()] || 'Unknown';
            const isInInstruct = this.isInstructMode();
            
            // Debug logging for checkbox visibility
            console.log('[SystemPrompt] Render debug:', {
                currentMode,
                opmode: this.getCurrentMode(),
                isInInstruct,
                shouldShowCheckbox: isInInstruct
            });
            
            return `
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">System Prompt Preset:</label>
                    <select id="prompt-preset" style="width: 100%; padding: 6px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;" 
                            onchange="KLiteModular.activePanels.get('systemprompt').loadPreset(this.value)">
                        ${Object.keys(this.presets).map(name => 
                            `<option value="${name}" ${this.getSelectedPreset() === name ? 'selected' : ''}>${name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">System Prompt:</label>
                    <textarea id="system-prompt-text" placeholder="Enter your system prompt..." 
                              style="width: 100%; height: 120px; padding: 8px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; resize: vertical; font-size: 13px; line-height: 1.4;" 
                              onchange="KLiteModular.activePanels.get('systemprompt').updateCurrentPrompt(this.value)">${this.currentPrompt}</textarea>
                </div>
                
                ${isInInstruct ? `
                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
                        <input type="checkbox" id="always-append-checkbox" ${this.alwaysAppendToAuthorNote ? 'checked' : ''} 
                               style="margin: 0;" onchange="KLiteModular.activePanels.get('systemprompt').toggleAlwaysAppend(this.checked)">
                        <span>Always append to Author's Note (even in Instruct mode)</span>
                    </label>
                </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                    <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('systemprompt').saveAsPreset()" 
                            style="padding: 6px; font-size: 11px;">Save as Preset</button>
                    <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('systemprompt').clearPrompt()" 
                            style="padding: 6px; font-size: 11px; background: #666;">Clear</button>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('systemprompt').syncToLite()" 
                            style="width: 100%; padding: 8px; background: #4a9eff; font-size: 12px;">Apply to KoboldAI Lite</button>
                </div>
                
                <div style="background: rgba(42, 42, 42, 0.8); padding: 8px; border-radius: 4px; font-size: 11px; border-left: 3px solid #4a9eff;">
                    <strong>Mode:</strong> ${currentMode}<br>
                    <strong>Target:</strong> ${targetInfo.name}<br>
                    <strong>Length:</strong> ${this.currentPrompt.length} chars<br>
                    <span style="opacity: 0.7;">${targetInfo.description}</span>
                </div>
            `;
        }
        
        getSelectedPreset() {
            for (const [name, prompt] of Object.entries(this.presets)) {
                if (prompt === this.currentPrompt) {
                    return name;
                }
            }
            return 'Custom';
        }
        
        loadPreset(presetName) {
            const preset = this.presets[presetName];
            if (preset !== undefined) {
                this.currentPrompt = preset;
                this.saveData('currentPrompt', this.currentPrompt);
                this.updateUI();
                this.emit('preset-loaded', { presetName, prompt: preset });
            }
        }
        
        updateCurrentPrompt(value) {
            this.currentPrompt = value;
            this.saveData('currentPrompt', this.currentPrompt);
            this.updateUI();
            this.emit('prompt-changed', { prompt: value });
        }
        
        toggleAlwaysAppend(checked) {
            // Clear previous application before changing mode
            this.clearPreviousApplication();
            
            this.alwaysAppendToAuthorNote = checked;
            this.saveData('alwaysAppendToAuthorNote', checked);
            this.updateUI();
            
            // Auto-apply after mode change if we have a prompt
            if (this.currentPrompt.trim()) {
                this.syncToLite();
            }
            
            this.emit('append-mode-changed', { alwaysAppend: checked });
        }
        
        saveAsPreset() {
            const name = prompt('Enter preset name:');
            if (name && name.trim()) {
                const trimmedName = name.trim();
                this.presets[trimmedName] = this.currentPrompt;
                this.saveData('presets', this.presets);
                this.updateUI();
                this.emit('preset-saved', { name: trimmedName, prompt: this.currentPrompt });
                KLiteModular.showNotification(`Preset "${trimmedName}" saved`, 'success');
            }
        }
        
        clearPrompt() {
            if (confirm('Clear the current system prompt?')) {
                this.currentPrompt = '';
                this.saveData('currentPrompt', this.currentPrompt);
                this.updateUI();
                this.emit('prompt-cleared');
            }
        }
        
        syncToLite() {
            if (!window.localsettings) {
                KLiteModular.showNotification('KoboldAI Lite not available', 'error');
                return;
            }
            
            // Clear previous application first to avoid duplicates
            this.clearPreviousApplication();
            
            const targetInfo = this.getTargetInfo();
            
            if (targetInfo.target === 'instruct_sysprompt') {
                // Use instruct mode system prompt
                window.localsettings.instruct_sysprompt = this.currentPrompt;
                
                // Update UI field
                const instructField = document.getElementById('instruct_sysprompt');
                if (instructField) {
                    instructField.value = this.currentPrompt;
                }
                
                // Track where we applied it
                this.lastAppliedTarget = 'instruct_sysprompt';
                this.saveData('lastAppliedTarget', this.lastAppliedTarget);
                
                KLiteModular.showNotification('System prompt applied to Instruct mode', 'success');
                console.log('[SystemPrompt] Applied to instruct_sysprompt:', this.currentPrompt.substring(0, 50) + '...');
                
            } else {
                // Append to author's note
                this.updateAuthorNote();
                
                // Track where we applied it
                this.lastAppliedTarget = 'author_note';
                this.saveData('lastAppliedTarget', this.lastAppliedTarget);
                
                KLiteModular.showNotification('System prompt added to Author\'s Note', 'success');
                console.log('[SystemPrompt] Added to author\'s note:', this.currentPrompt.substring(0, 50) + '...');
            }
            
            this.emit('synced-to-lite', { target: targetInfo.target, prompt: this.currentPrompt });
        }
        
        clearPreviousApplication() {
            if (!this.lastAppliedTarget) return;
            
            console.log('[SystemPrompt] Clearing previous application from:', this.lastAppliedTarget);
            
            if (this.lastAppliedTarget === 'instruct_sysprompt') {
                // Clear from instruct system prompt
                if (window.localsettings) {
                    window.localsettings.instruct_sysprompt = '';
                }
                
                // Clear UI field
                const instructField = document.getElementById('instruct_sysprompt');
                if (instructField) {
                    instructField.value = '';
                }
                
                console.log('[SystemPrompt] Cleared instruct_sysprompt');
                
            } else if (this.lastAppliedTarget === 'author_note') {
                // Clear from author's note
                this.removeSystemPromptFromAuthorNote();
                console.log('[SystemPrompt] Cleared from author\'s note');
            }
            
            // Reset tracking
            this.lastAppliedTarget = null;
            this.saveData('lastAppliedTarget', null);
        }
        
        removeSystemPromptFromAuthorNote() {
            // Get current author's note
            let currentAuthorNote = '';
            
            // Try to get from global variable first
            if (window.current_anote !== undefined) {
                currentAuthorNote = window.current_anote;
            }
            
            // Also try to get from UI field
            const anoteField = document.getElementById('anotetext');
            if (anoteField) {
                currentAuthorNote = anoteField.value;
            }
            
            // Remove existing system prompt if it exists
            const systemPromptPattern = /\*\[System prompt:.*?\]$/;
            const cleanedAuthorNote = currentAuthorNote.replace(systemPromptPattern, '');
            
            // Update global variable
            if (window.current_anote !== undefined) {
                window.current_anote = cleanedAuthorNote;
            }
            
            // Update UI field
            if (anoteField) {
                anoteField.value = cleanedAuthorNote;
            }
        }
        
        updateAuthorNote() {
            // Get current author's note
            let currentAuthorNote = '';
            
            // Try to get from global variable first
            if (window.current_anote !== undefined) {
                currentAuthorNote = window.current_anote;
            }
            
            // Also try to get from UI field
            const anoteField = document.getElementById('anotetext');
            if (anoteField) {
                currentAuthorNote = anoteField.value;
            }
            
            // Remove existing system prompt if it exists
            const systemPromptPattern = /\*\[System prompt:.*?\]$/;
            currentAuthorNote = currentAuthorNote.replace(systemPromptPattern, '');
            
            // Add new system prompt if we have one
            if (this.currentPrompt.trim()) {
                // Add newlines if author's note isn't empty
                const separator = currentAuthorNote.trim() ? '' : '';
                currentAuthorNote += separator + `[System prompt: ${this.currentPrompt}]`;
            }
            
            // Update global variable
            if (window.current_anote !== undefined) {
                window.current_anote = currentAuthorNote;
            }
            
            // Update UI field
            if (anoteField) {
                anoteField.value = currentAuthorNote;
            }
        }
        
        loadCurrentSystemPrompt() {
            // Try to load existing system prompt from KoboldAI Lite
            const targetInfo = this.getTargetInfo();
            
            if (targetInfo.target === 'instruct_sysprompt' && window.localsettings) {
                const existing = window.localsettings.instruct_sysprompt || '';
                if (existing && !this.currentPrompt) {
                    this.currentPrompt = existing;
                    this.saveData('currentPrompt', this.currentPrompt);
                }
            } else {
                // Try to extract from author's note
                let authorNote = '';
                if (window.current_anote !== undefined) {
                    authorNote = window.current_anote;
                } else {
                    const anoteField = document.getElementById('anotetext');
                    if (anoteField) {
                        authorNote = anoteField.value;
                    }
                }
                
                // Look for existing system prompt in author's note
                const match = authorNote.match(/\[System prompt: (.*?)\]$/);
                if (match && !this.currentPrompt) {
                    this.currentPrompt = match[1];
                    this.saveData('currentPrompt', this.currentPrompt);
                }
            }
        }
        
        updateUI() {
            // Update textarea
            const textarea = document.getElementById('system-prompt-text');
            if (textarea && textarea.value !== this.currentPrompt) {
                textarea.value = this.currentPrompt;
            }
            
            // Update preset dropdown
            const dropdown = document.getElementById('prompt-preset');
            if (dropdown) {
                dropdown.value = this.getSelectedPreset();
            }
            
            // Update checkbox
            const checkbox = document.getElementById('always-append-checkbox');
            if (checkbox) {
                checkbox.checked = this.alwaysAppendToAuthorNote;
            }
            
            // Re-render the panel to update status
            KLiteModular.renderPanels();
        }
        
        saveState() {
            return { 
                currentPrompt: this.currentPrompt,
                presets: this.presets,
                alwaysAppendToAuthorNote: this.alwaysAppendToAuthorNote,
                lastAppliedTarget: this.lastAppliedTarget
            };
        }
        
        restoreState(state) {
            this.currentPrompt = state.currentPrompt || '';
            this.presets = state.presets || this.getDefaultPresets();
            this.alwaysAppendToAuthorNote = state.alwaysAppendToAuthorNote || false;
            this.lastAppliedTarget = state.lastAppliedTarget || null;
        }
        
        async init() {
            // Load saved data
            this.currentPrompt = await this.loadData('currentPrompt') || '';
            this.presets = await this.loadData('presets') || this.getDefaultPresets();
            this.alwaysAppendToAuthorNote = await this.loadData('alwaysAppendToAuthorNote') || false;
            this.lastAppliedTarget = await this.loadData('lastAppliedTarget') || null;
            
            // Load existing system prompt from KoboldAI Lite
            this.loadCurrentSystemPrompt();
        }
    }
    
    // Character Panel - COMPLETE IMPLEMENTATION from ALPHA release (adapted for new framework)
    class CharacterPanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'Characters';
            
            // Initialize character management system
            this.characters = [];
            this.currentFilter = '';
            this.currentSort = 'name-asc';
            this.currentView = 'list';
            this.tagFilter = '';
            this.starFilter = '';
            
            // Create file input for imports
            this.createFileInput();
            
            // Initialize CRC32 table for PNG export
            this._crc32Table = null;
        }
        
        createFileInput() {
            if (!this.fileInput) {
                this.fileInput = document.createElement('input');
                this.fileInput.type = 'file';
                this.fileInput.accept = '.png,.webp,.json';
                this.fileInput.multiple = true;
                this.fileInput.style.display = 'none';
                this.fileInput.id = 'char-file-input';
                document.body.appendChild(this.fileInput);
                
                this.fileInput.onchange = e => {
                    KLiteModular.log('characters', `File input triggered with ${e.target.files.length} files`);
                    this.handleFiles(e.target.files);
                };
                
                KLiteModular.log('characters', 'File input created and added to DOM');
            }
        }
        
        render() {
            const charCount = this.characters.length;
            const filteredChars = this.getFilteredCharacters();
            
            return `
                <div class="char-panel-container">
                    <!-- Compact Import Section -->
                    <div style="margin-bottom: 12px;">
                        <div class="klite-upload-zone" id="char-upload-zone" style="height: 50px; padding: 8px; font-size: 11px; text-align: center; cursor: pointer; background: rgba(42, 42, 42, 0.9); border: 2px dashed #444; border-radius: 4px; color: #ccc;">
                            Drop character files or click to import
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px;">
                            <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').exportCharacters()" style="padding: 4px; font-size: 10px; background: #666;">Export All</button>
                            <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').clearAll()" style="padding: 4px; font-size: 10px; background: #d32f2f;">Clear All</button>
                        </div>
                    </div>
                    
                    <!-- Compact Controls -->
                    <div style="margin-bottom: 12px;">
                        <input type="text" id="char-search" placeholder="Search characters..." 
                               value="${this.currentFilter}" class="klite-input" style="width: 100%; padding: 4px; margin-bottom: 6px; font-size: 11px;">
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px;">
                            <select id="char-tag-filter" class="klite-select" style="font-size: 10px; padding: 2px;">
                                <option value="">All Tags</option>
                                ${this.getUniqueTags().map(tag => 
                                    `<option value="${tag}" ${this.tagFilter === tag ? 'selected' : ''}>${tag}</option>`
                                ).join('')}
                            </select>
                            <select id="char-star-filter" class="klite-select" style="font-size: 10px; padding: 2px;">
                                <option value="">Any Rating</option>
                                <option value="unrated" ${this.starFilter === 'unrated' ? 'selected' : ''}>Unrated</option>
                                <option value="1" ${this.starFilter === '1' ? 'selected' : ''}>1 Star</option>
                                <option value="2" ${this.starFilter === '2' ? 'selected' : ''}>2 Stars</option>
                                <option value="3" ${this.starFilter === '3' ? 'selected' : ''}>3 Stars</option>
                                <option value="4" ${this.starFilter === '4' ? 'selected' : ''}>4 Stars</option>
                                <option value="5" ${this.starFilter === '5' ? 'selected' : ''}>5 Stars</option>
                            </select>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <select id="char-sort" class="klite-select" style="font-size: 10px; padding: 2px;">
                                <option value="name-asc" ${this.currentSort === 'name-asc' ? 'selected' : ''}>Name (A-Z)</option>
                                <option value="name-desc" ${this.currentSort === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
                                <option value="created" ${this.currentSort === 'created' ? 'selected' : ''}>Import Date</option>
                                <option value="talkativeness" ${this.currentSort === 'talkativeness' ? 'selected' : ''}>Talkativeness</option>
                                <option value="rating" ${this.currentSort === 'rating' ? 'selected' : ''}>Rating</option>
                            </select>
                            <select id="char-view" class="klite-select" style="font-size: 10px; padding: 2px;">
                                <option value="overview" ${this.currentView === 'overview' ? 'selected' : ''}>Overview</option>
                                <option value="grid" ${this.currentView === 'grid' ? 'selected' : ''}>Grid</option>
                                <option value="list" ${this.currentView === 'list' ? 'selected' : ''}>List</option>
                            </select>
                        </div>
                        
                        <div style="font-size: 10px; color: #888; margin-top: 4px; text-align: center;">
                            ${filteredChars.length} of ${charCount} characters
                        </div>
                    </div>
                    
                    <!-- Scrollable Gallery -->
                    <div class="char-gallery" id="char-gallery" style="height: 450px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #4a9eff #333;">
                        ${this.renderCharacters()}
                    </div>
                </div>
                
                <!-- Modal placeholder -->
                <div id="char-modal-container"></div>
            `;
        }
        
        getFilteredCharacters() {
            let filtered = [...this.characters];
            
            // Apply search filter
            if (this.currentFilter) {
                const filter = this.currentFilter.toLowerCase();
                filtered = filtered.filter(char => 
                    (char.name || '').toLowerCase().includes(filter) ||
                    (char.description || '').toLowerCase().includes(filter) ||
                    (char.personality || '').toLowerCase().includes(filter) ||
                    (char.creator || '').toLowerCase().includes(filter) ||
                    (char.keywords || []).some(k => k.includes(filter))
                );
            }
            
            // Apply tag filter
            if (this.tagFilter) {
                filtered = filtered.filter(char => 
                    char.tags && char.tags.includes(this.tagFilter)
                );
            }
            
            // Apply star filter
            if (this.starFilter) {
                if (this.starFilter === 'unrated') {
                    filtered = filtered.filter(char => !char.rating || char.rating === 0);
                } else {
                    const rating = parseInt(this.starFilter);
                    filtered = filtered.filter(char => char.rating === rating);
                }
            }
            
            // Apply sorting
            filtered.sort((a, b) => {
                switch (this.currentSort) {
                    case 'name-asc':
                        return (a.name || '').localeCompare(b.name || '');
                    case 'name-desc':
                        return (b.name || '').localeCompare(a.name || '');
                    case 'created':
                        return (b.created || 0) - (a.created || 0);
                    case 'talkativeness':
                        return (b.talkativeness || 0) - (a.talkativeness || 0);
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    default:
                        return 0;
                }
            });
            
            return filtered;
        }
        
        getUniqueTags() {
            const allTags = new Set();
            this.characters.forEach(char => {
                if (char.tags && Array.isArray(char.tags)) {
                    char.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            allTags.add(tag.trim());
                        }
                    });
                }
            });
            return Array.from(allTags).sort();
        }
        
        renderCharacters() {
            const characters = this.getFilteredCharacters();
            
            if (characters.length === 0) {
                return '<div style="text-align: center; color: #888; padding: 40px; font-size: 12px;">No characters found</div>';
            }
            
            switch (this.currentView) {
                case 'overview':
                    return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">${characters.map(char => this.renderCharacterOverviewItem(char)).join('')}</div>`;
                case 'list':
                    return characters.map(char => this.renderCharacterListItem(char)).join('');
                default: // grid
                    return `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">${characters.map(char => this.renderCharacterCard(char)).join('')}</div>`;
            }
        }
        
        renderCharacterOverviewItem(char) {
            const backgroundImage = char.image ? 
                `background-image: url('${char.image}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : 
                `background: linear-gradient(135deg, #333 0%, #222 100%);`;
            
            return `
                <div style="position: relative; height: 80px; border: 1px solid #444; border-radius: 4px; cursor: pointer; overflow: hidden; ${backgroundImage}" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})">
                    <!-- Dark overlay for text readability -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);"></div>
                    
                    <!-- Text content overlay -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 6px; color: white; text-align: center;">
                        <div style="font-size: 10px; font-weight: bold; line-height: 1.2; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); word-wrap: break-word;">
                            ${(char.name || 'Unknown').length > 8 ? (char.name || 'Unknown').substring(0, 8) + '...' : (char.name || 'Unknown')}
                        </div>
                    </div>
                    
                    ${!char.image ? `
                        <!-- Fallback icon for characters without images -->
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: #666; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                            ${(char.name || 'U').charAt(0)}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        renderCharacterCard(char) {
            const rating = char.rating || 0;
            
            return `
                <div style="border: 1px solid #444; border-radius: 6px; background: rgba(42, 42, 42, 0.9); padding: 8px; cursor: pointer;" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})">
                    <div style="width: 100%; height: 120px; border-radius: 4px; overflow: hidden; margin-bottom: 6px; border: 1px solid #444;">
                        ${char.image ? `<img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="width: 100%; height: 100%; background: #333; display: flex; align-items: center; justify-content: center; font-size: 32px;">👤</div>'}
                    </div>
                    <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px; color: #e0e0e0;">${char.name || 'Unknown'}</div>
                    <div style="font-size: 10px; color: #888; margin-bottom: 4px;">by ${char.creator || 'Unknown'}</div>
                    <select class="klite-select" style="font-size: 10px; padding: 2px; width: 100%;" onchange="KLiteModular.activePanels.get('characters').updateCharacterRating(${char.id}, this.value)" onclick="event.stopPropagation();">
                        <option value="0" ${rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="1" ${rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                        <option value="2" ${rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="3" ${rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="4" ${rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="5" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                    </select>
                </div>
            `;
        }
        
        renderCharacterListItem(char) {
            const rating = char.rating || 0;
            
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px; border: 1px solid #444; border-radius: 4px; margin-bottom: 6px; background: rgba(42, 42, 42, 0.9); cursor: pointer;" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})">
                    ${char.image ? `
                        <div style="width: 32px; height: 32px; border-radius: 16px; overflow: hidden; flex-shrink: 0; border: 1px solid #444;">
                            <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 32px; height: 32px; border-radius: 16px; background: #333; border: 1px solid #444; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 14px;">${(char.name || 'U').charAt(0)}</span>
                        </div>
                    `}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: bold; color: #e0e0e0; margin-bottom: 1px; font-size: 11px;">${char.name || 'Unknown'}</div>
                        <div style="font-size: 9px; color: #888;">by ${char.creator || 'Unknown'}</div>
                    </div>
                    <select class="klite-select" style="font-size: 9px; padding: 1px 2px;" onchange="KLiteModular.activePanels.get('characters').updateCharacterRating(${char.id}, this.value)" onclick="event.stopPropagation();">
                        <option value="0" ${rating === 0 ? 'selected' : ''}>☆</option>
                        <option value="1" ${rating === 1 ? 'selected' : ''}>★</option>
                        <option value="2" ${rating === 2 ? 'selected' : ''}>★★</option>
                        <option value="3" ${rating === 3 ? 'selected' : ''}>★★★</option>
                        <option value="4" ${rating === 4 ? 'selected' : ''}>★★★★</option>
                        <option value="5" ${rating === 5 ? 'selected' : ''}>★★★★★</option>
                    </select>
                </div>
            `;
        }
        
        showCharacterModal(charId) {
            const char = this.characters.find(c => c.id == charId);
            if (!char) return;
            
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.id = `char-modal-${charId}`;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            `;
            
            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
                border: 2px solid #4a9eff;
                border-radius: 12px;
                padding: 20px;
                width: 90vw;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                color: #e0e0e0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            `;
            
            // Character data
            const characterData = char.rawData?.data || char.rawData || char;
            
            modal.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #444;">
                    <h2 style="margin: 0; font-size: 20px; color: #4a9eff;">${char.name}</h2>
                    <button class="klite-panel-btn" onclick="this.closest('.char-modal-overlay').remove()" style="padding: 6px 12px; background: #666;">× Close</button>
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    ${char.image ? `<img src="${char.image}" alt="${char.name}" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 8px;">` : '<div style="width: 100px; height: 100px; background: #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; margin: 0 auto 8px; color: #888;">👤</div>'}
                    <div style="font-weight: 600; font-size: 18px; color: #e0e0e0;">${char.name}</div>
                    <div style="color: #888; font-size: 14px;">by ${char.creator || 'Unknown'}</div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Rating</h3>
                    <select class="klite-select" onchange="KLiteModular.activePanels.get('characters').updateCharacterRating(${char.id}, this.value)" style="width: 100%;">
                        <option value="0" ${char.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="1" ${char.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                        <option value="2" ${char.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="3" ${char.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="4" ${char.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="5" ${char.rating === 5 ? 'selected' : ''}>★★★★★</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Actions</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').loadCharacter(${char.id})" style="padding: 8px; background: #4a9eff;">Load Character</button>
                        <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').exportCharacterJSON(${char.id})" style="padding: 8px; background: #666;">Export JSON</button>
                        <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').exportCharacterPNG(${char.id})" style="padding: 8px; background: #666;">Export PNG</button>
                        <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').deleteCharacter(${char.id}); this.closest('.char-modal-overlay').remove();" style="padding: 8px; background: #d32f2f;">Delete</button>
                    </div>
                </div>
                
                ${characterData.description ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Description</h3>
                    <div style="background: rgba(42, 42, 42, 0.8); padding: 12px; border-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${characterData.description}</div>
                </div>
                ` : ''}
                
                ${characterData.personality ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Personality</h3>
                    <div style="background: rgba(42, 42, 42, 0.8); padding: 12px; border-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${characterData.personality}</div>
                </div>
                ` : ''}
                
                ${characterData.scenario ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Scenario</h3>
                    <div style="background: rgba(42, 42, 42, 0.8); padding: 12px; border-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${characterData.scenario}</div>
                </div>
                ` : ''}
                
                ${characterData.first_mes ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">First Message</h3>
                    <div style="background: rgba(42, 42, 42, 0.8); padding: 12px; border-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${characterData.first_mes}</div>
                </div>
                ` : ''}
                
                ${characterData.mes_example ? `
                <div style="margin-bottom: 16px;">
                    <h3 style="color: #4a9eff; margin-bottom: 8px;">Example Messages</h3>
                    <div style="background: rgba(42, 42, 42, 0.8); padding: 12px; border-radius: 4px; white-space: pre-wrap; line-height: 1.4;">${characterData.mes_example}</div>
                </div>
                ` : ''}
            `;
            
            overlay.className = 'char-modal-overlay';
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
        }
        
        // COMPLETE CHARACTER MANAGEMENT METHODS FROM ALPHA
        updateCharacterRating(charId, rating) {
            const char = this.characters.find(c => c.id == charId);
            if (char) {
                char.rating = parseInt(rating);
                this.saveData('characters', this.characters);
                this.refreshGallery();
                KLiteModular.showNotification(`Updated ${char.name} rating`, 'success');
            }
        }
        
        loadCharacter(charId) {
            const char = this.characters.find(c => c.id == charId);
            if (char) {
                this.loadAsScenario(char);
            }
        }
        
        // Complete Scenario Loading Implementation from ALPHA
        async loadAsScenario(character) {
            try {
                KLiteModular.log('generation', `Starting loadAsScenario for character: ${character.name}`);
                
                if (!confirm(`Load "${character.name}" as scenario? This will restart the session and overwrite your current data.`)) {
                    KLiteModular.log('generation', 'User cancelled scenario loading');
                    return;
                }
                
                KLiteModular.log('generation', 'User confirmed scenario loading, proceeding...');
                
                // Clear current game state
                if (typeof window.restart_new_game === 'function') {
                    window.restart_new_game(false);
                    KLiteModular.log('generation', 'Game state restarted');
                } else {
                    KLiteModular.log('generation', 'Warning: restart_new_game function not available');
                }
                
                const characterData = character.rawData?.data || character.rawData || {};
                KLiteModular.log('generation', 'Character data extracted', characterData);
                
                // 1. Load the selected active first message into the chat
                KLiteModular.log('generation', 'Selecting greeting...');
                const selectedGreeting = await this.selectGreeting(character);
                KLiteModular.log('generation', 'Selected greeting:', selectedGreeting);
                
                if (window.gametext_arr) {
                    window.gametext_arr = [selectedGreeting];
                    KLiteModular.log('generation', 'Greeting added to gametext_arr');
                }
                
                // 2. Add description, personality and scenario into MEMORY
                KLiteModular.log('generation', 'Building memory...');
                const memory = this.buildV3Memory(character);
                if (typeof window.current_memory !== 'undefined') {
                    window.current_memory = memory;
                    KLiteModular.log('generation', 'Memory set:', memory);
                }
                
                // 3. Add Author's Note and Character's Note into AUTHOR'S NOTE
                const authorNoteParts = [];
                if (characterData.creator_notes && characterData.creator_notes.trim()) {
                    authorNoteParts.push(characterData.creator_notes.trim());
                    KLiteModular.log('generation', 'Added creator_notes to author note');
                }
                if (characterData.system_prompt && characterData.system_prompt.trim()) {
                    authorNoteParts.push(characterData.system_prompt.trim());
                    KLiteModular.log('generation', 'Added system_prompt to author note');
                }
                
                if (authorNoteParts.length > 0) {
                    window.current_anote = authorNoteParts.join('\
\
');
                    KLiteModular.log('generation', 'Author note set:', window.current_anote);
                }
                
                // 4. Check for World Info and ask user about import
                KLiteModular.log('generation', 'Checking for World Info...');
                const worldInfoEntries = this.extractWorldInfoEntries(characterData);
                if (worldInfoEntries.length > 0) {
                    KLiteModular.log('generation', `Found ${worldInfoEntries.length} World Info entries`);
                    const importWI = confirm(`This character has ${worldInfoEntries.length} World Info entries. Import them to your World Info?`);
                    if (importWI) {
                        KLiteModular.log('generation', 'User chose to import World Info');
                        await this.importCharacterWorldInfo(worldInfoEntries);
                    }
                }
                
                // 5. Set Chat mode with character name
                if (window.localsettings) {
                    window.localsettings.opmode = 3; // Chat mode
                    window.localsettings.chatopponent = character.name;
                    KLiteModular.log('generation', 'Set Chat mode and character name');
                }
                
                // Refresh UI
                if (typeof window.render_gametext === 'function') {
                    window.render_gametext();
                    KLiteModular.log('generation', 'UI refreshed');
                }
                
                KLiteModular.log('generation', `✅ "${character.name}" loaded as scenario successfully!`);
                KLiteModular.showNotification(`"${character.name}" loaded as scenario successfully!`, 'success');
                
                // Close modal if open
                const modal = document.getElementById(`char-modal-${character.id}`);
                if (modal) modal.remove();
                
            } catch (error) {
                KLiteModular.log('generation', 'Error loading character as scenario:', error);
                KLiteModular.showNotification(`Failed to load character as scenario: ${error.message}`, 'error');
            }
        }
        
        // Handle alternate greetings (V3 feature)
        async selectGreeting(character) {
            KLiteModular.log('generation', 'selectGreeting: Starting greeting selection');
            const characterData = character.rawData?.data || character.rawData || {};
            
            KLiteModular.log('generation', `selectGreeting: Character activeGreeting: ${character.activeGreeting}`);
            KLiteModular.log('generation', 'selectGreeting: Available greetings:', {
                first_mes: !!characterData.first_mes,
                alternate_greetings: characterData.alternate_greetings?.length || 0
            });
            
            // Use the active greeting that's already selected for this character
            // activeGreeting: null/-1 = default first_mes, 0+ = alternate greeting index
            const activeGreetingIndex = character.activeGreeting;
            
            if (activeGreetingIndex === null || activeGreetingIndex === -1) {
                // Use default first message
                if (characterData.first_mes) {
                    KLiteModular.log('generation', 'selectGreeting: Using default first_mes (active greeting)');
                    return characterData.first_mes;
                } else {
                    KLiteModular.log('generation', 'selectGreeting: No first_mes found, using fallback');
                    return `Hello! I'm ${character.name}.`;
                }
            } else {
                // Use specific alternate greeting
                if (characterData.alternate_greetings && 
                    Array.isArray(characterData.alternate_greetings) && 
                    activeGreetingIndex < characterData.alternate_greetings.length) {
                    
                    const selectedGreeting = characterData.alternate_greetings[activeGreetingIndex];
                    KLiteModular.log('generation', `selectGreeting: Using alternate greeting ${activeGreetingIndex} (active greeting)`);
                    return selectedGreeting;
                } else {
                    KLiteModular.log('generation', `selectGreeting: Active greeting index ${activeGreetingIndex} not found, falling back to first_mes`);
                    return characterData.first_mes || `Hello! I'm ${character.name}.`;
                }
            }
        }
        
        // Intelligent memory building for V3 cards
        buildV3Memory(character) {
            const parts = [];
            const characterData = character.rawData?.data || character.rawData || {};
            
            // Character header
            parts.push(`[Character: ${character.name}]`);
            
            // Creator notes (V3 feature)
            if (characterData.creator_notes) {
                parts.push(`[Creator Notes: ${characterData.creator_notes}]`);
            }
            
            // Character version (V3 feature)
            if (characterData.character_version) {
                parts.push(`[Version: ${characterData.character_version}]`);
            }
            
            // Core character data
            if (characterData.description) {
                parts.push(`\
### Description\
${characterData.description}`);
            }
            
            if (characterData.personality) {
                parts.push(`\
### Personality\
${characterData.personality}`);
            }
            
            if (characterData.scenario) {
                parts.push(`\
### Scenario\
${characterData.scenario}`);
            }
            
            // Post-history instructions (V3 feature)
            if (characterData.post_history_instructions) {
                parts.push(`\
### Instructions\
${characterData.post_history_instructions}`);
            }
            
            // System prompt override (V3 feature)
            if (characterData.system_prompt) {
                parts.push(`\
### System Context\
${characterData.system_prompt}`);
            }
            
            // Tags (V3 feature)
            if (characterData.tags && characterData.tags.length > 0) {
                parts.push(`\
[Tags: ${characterData.tags.join(', ')}]`);
            }
            
            return parts.join('\
');
        }
        
        // Extract World Info entries from character data
        extractWorldInfoEntries(characterData) {
            const entries = [];
            
            // V3 character book format
            if (characterData.character_book?.entries) {
                const bookEntries = Array.isArray(characterData.character_book.entries) ? 
                    characterData.character_book.entries : 
                    Object.values(characterData.character_book.entries);
                entries.push(...bookEntries);
            }
            
            // V2 world_info format (legacy)
            if (characterData.world_info && Array.isArray(characterData.world_info)) {
                entries.push(...characterData.world_info);
            }
            
            return entries.filter(entry => entry && (entry.content || entry.entry));
        }
        
        // Import character World Info entries to main WI system
        async importCharacterWorldInfo(worldInfoEntries) {
            let importedCount = 0;
            
            // Check if entries have explicit group names
            const firstEntry = worldInfoEntries[0];
            const hasExplicitGroup = firstEntry && (firstEntry.group || firstEntry.wigroup);
            
            let userGroupName = '';
            if (!hasExplicitGroup) {
                // Ask user for group name
                userGroupName = prompt('Enter a group name for the imported World Info entries (leave empty for General):') || '';
                KLiteModular.log('generation', `User chose group name: "${userGroupName}"`);
            }
            
            for (const entry of worldInfoEntries) {
                // Convert to KoboldAI Lite's World Info format
                const keys = entry.keys || entry.key || [];
                const keyList = Array.isArray(keys) ? keys : 
                               typeof keys === 'string' ? keys.split(',').map(k => k.trim()) : [];
                
                const secondary = entry.keysecondary || entry.secondary || [];
                const secondaryList = Array.isArray(secondary) ? secondary : 
                                     typeof secondary === 'string' ? secondary.split(',').map(k => k.trim()) : [];
                
                // Use explicit group from character data, or user-provided group name
                const groupName = entry.group || entry.wigroup || userGroupName;
                
                const normalizedEntry = {
                    key: keyList.join(', '),
                    keysecondary: secondaryList.join(', '),
                    keyanti: entry.keyanti || '',
                    content: entry.content || entry.entry || '',
                    wiposition: entry.position || entry.wiposition || 'after',
                    widisabled: entry.enabled === false || entry.disabled === true,
                    wicasesensitive: entry.case_sensitive || entry.wicasesensitive || false,
                    wiselective: entry.selective || entry.wiselective || false,
                    wipriority: entry.priority || entry.wipriority || 400,
                    wiorder: entry.order || entry.wiorder || 100,
                    wicomment: entry.comment || `Imported from character`,
                    wigroup: groupName,
                    constant: entry.constant || false
                };
                
                // Only import if has meaningful content
                if (normalizedEntry.content.trim() && normalizedEntry.key.trim()) {
                    // Add to KoboldAI Lite's native World Info system
                    if (!window.current_wi) {
                        window.current_wi = [];
                    }
                    window.current_wi.push(normalizedEntry);
                    importedCount++;
                    
                    KLiteModular.log('generation', `Added WI entry: ${normalizedEntry.key}`);
                }
            }
            
            if (importedCount > 0) {
                // Save to KoboldAI Lite's native storage system
                if (typeof window.save_wi === 'function') {
                    window.save_wi();
                    KLiteModular.log('generation', 'Saved WI using KoboldAI Lite native function');
                } else {
                    KLiteModular.log('generation', 'Warning: save_wi function not available');
                }
                
                KLiteModular.log('generation', `✅ Imported ${importedCount} World Info entries to KoboldAI Lite WI system`);
            }
            
            return importedCount;
        }
        
        exportCharacterJSON(charId) {
            const char = this.characters.find(c => c.id == charId);
            if (!char) return;
            
            if (!char.rawData) {
                KLiteModular.showNotification('Cannot export: No original character data available', 'error');
                return;
            }
            
            try {
                // Determine export format based on original card
                const cardFormat = char.rawData?.spec === 'chara_card_v3' ? 'V3' : 
                                  char.rawData?.spec === 'chara_card_v2' ? 'V2' : 'V1';
                
                let exportData;
                if (cardFormat === 'V3' || cardFormat === 'V2') {
                    exportData = {
                        spec: char.rawData.spec,
                        data: char.rawData.data
                    };
                } else {
                    exportData = char.rawData;
                }
                
                // Create and download JSON file
                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `${char.name.replace(/[^\\w\\s]/gi, '')}_${cardFormat}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                KLiteModular.showNotification(`Exported ${char.name} as ${cardFormat} JSON`, 'success');
            } catch (error) {
                KLiteModular.log('generation', 'Failed to export character JSON:', error);
                KLiteModular.showNotification('Failed to export character JSON', 'error');
            }
        }
        
        exportCharacterPNG(charId) {
            const char = this.characters.find(c => c.id == charId);
            if (!char) return;
            
            if (!char.rawData) {
                KLiteModular.showNotification('Cannot export: No original character data available', 'error');
                return;
            }
            
            try {
                // Prepare V2 character card data
                const exportData = {
                    spec: 'chara_card_v2',
                    spec_version: '2.0',
                    data: char.rawData.data || char.rawData
                };
                
                // Create canvas for PNG generation
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 512;
                canvas.height = 512;
                
                // Create a simple character card background
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, 512, 512);
                
                // If character has an image, try to use it as background
                if (char.image && char.image.startsWith('data:image/')) {
                    const img = new Image();
                    img.onload = () => {
                        // Draw character image
                        ctx.drawImage(img, 0, 0, 512, 512);
                        
                        // Add character name overlay
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(0, 450, 512, 62);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(char.name, 256, 485);
                        
                        this.finalizePNGExport(canvas, exportData, char.name);
                    };
                    img.onerror = () => {
                        // Fallback if image fails to load
                        this.createFallbackPNG(ctx, char, exportData);
                    };
                    img.src = char.image;
                } else {
                    // No image - create text-based card
                    this.createFallbackPNG(ctx, char, exportData);
                }
            } catch (error) {
                KLiteModular.log('generation', 'Failed to export character PNG:', error);
                KLiteModular.showNotification('Failed to export character PNG', 'error');
            }
        }
        
        deleteCharacter(charId) {
            if (confirm('Delete this character? This cannot be undone.')) {
                const index = this.characters.findIndex(c => c.id == charId);
                if (index !== -1) {
                    const char = this.characters[index];
                    this.characters.splice(index, 1);
                    this.saveData('characters', this.characters);
                    this.refreshGallery();
                    KLiteModular.showNotification(`Deleted ${char.name}`, 'success');
                }
            }
        }
        
        exportCharacters() {
            if (this.characters.length === 0) {
                KLiteModular.showNotification('No characters to export', 'warning');
                return;
            }
            
            const blob = new Blob([JSON.stringify(this.characters, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'characters.json';
            a.click();
            URL.revokeObjectURL(url);
            KLiteModular.showNotification(`Exported ${this.characters.length} characters`, 'success');
        }
        
        clearAll() {
            if (confirm('Delete all characters? This cannot be undone.')) {
                this.characters = [];
                this.saveData('characters', this.characters);
                this.refreshGallery();
                KLiteModular.showNotification('All characters deleted', 'success');
            }
        }
        
        // COMPLETE FILE HANDLING WITH PNG/WEBP SUPPORT FROM ALPHA
        async handleFiles(files) {
            KLiteModular.log('generation', `Processing ${files.length} character files`);
            
            for (const file of files) {
                try {
                    KLiteModular.log('generation', `Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
                    
                    if (file.name.endsWith('.json')) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        KLiteModular.log('generation', `Parsed JSON character data:`, data);
                        this.addCharacter(this.normalizeCharacterData(data));
                    } else if (file.name.endsWith('.png')) {
                        await this.loadPNGFile(file);
                    } else if (file.name.endsWith('.webp')) {
                        await this.loadWEBPFile(file);
                    }
                } catch (err) {
                    KLiteModular.log('generation', `Failed to load file: ${file.name}`, err);
                    KLiteModular.showNotification(`Failed to load ${file.name}: ${err.message}`, 'error');
                }
            }
            this.refreshGallery();
        }
        
        // COMPLETE CHARACTER NORMALIZATION WITH BEHAVIORAL ANALYSIS FROM ALPHA
        addCharacter(normalizedData) {
            const now = Date.now();
            const char = {
                id: now + Math.random(),
                name: normalizedData.name || 'Unknown',
                description: normalizedData.description || '',
                personality: normalizedData.personality || '',
                scenario: normalizedData.scenario || '',
                first_mes: normalizedData.first_mes || '',
                mes_example: normalizedData.mes_example || '',
                creator: normalizedData.creator || 'Unknown',
                image: normalizedData.image || normalizedData.avatar || null,
                tags: normalizedData.tags || [],
                rating: normalizedData.rating || 0,
                created: now,
                rawData: normalizedData._originalData || normalizedData,
                
                // Enhanced behavioral analysis from ALPHA
                keywords: normalizedData.keywords || [],
                talkativeness: normalizedData.talkativeness || 50,
                traits: normalizedData.traits || [],
                responseStyle: normalizedData.responseStyle || {},
                preferences: normalizedData.preferences || {},
                
                // Character card extensions
                extensions: normalizedData.extensions || {},
                alternateGreetings: normalizedData.alternate_greetings || [],
                worldInfo: normalizedData.character_book || null,
                
                // Import metadata
                importSource: 'manual',
                importDate: now,
                originalFilename: normalizedData.originalFilename || null
            };
            
            this.characters.push(char);
            this.saveData('characters', this.characters);
            KLiteModular.showNotification(`Added character: ${char.name}`, 'success');
        }
        
        // PNG FILE PROCESSING WITH tEXt CHUNK EXTRACTION FROM ALPHA
        async loadPNGFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Extract tEXt chunks from PNG
                        const textChunks = this.extractPNGTextChunks(uint8Array);
                        let characterData = null;
                        
                        for (const chunk of textChunks) {
                            if (['chara', 'ccv2', 'ccv3', 'character'].includes(chunk.keyword.toLowerCase())) {
                                try {
                                    let jsonStr = chunk.text;
                                    // Try to decode from base64 first
                                    try {
                                        jsonStr = atob(chunk.text);
                                    } catch (e) {
                                        // Not base64, use as-is
                                    }
                                    
                                    const parsed = JSON.parse(jsonStr);
                                    characterData = this.normalizeCharacterData(parsed);
                                    KLiteModular.log('generation', `Found character data in PNG chunk '${chunk.keyword}'`);
                                    break;
                                } catch (e) {
                                    KLiteModular.log('generation', `Failed to parse chunk '${chunk.keyword}': ${e.message}`);
                                }
                            }
                        }
                        
                        if (characterData) {
                            // Read image as base64
                            const blob = new Blob([uint8Array], { type: 'image/png' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            reject(new Error('No character data found in PNG'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }
        
        // WEBP FILE PROCESSING WITH EXIF DATA EXTRACTION FROM ALPHA
        async loadWEBPFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // For WEBP, check for EXIF data in the RIFF chunks
                        const characterData = this.extractWEBPCharacterData(uint8Array);
                        
                        if (characterData) {
                            const blob = new Blob([uint8Array], { type: 'image/webp' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            // Try loading as simple image
                            const imageReader = new FileReader();
                            imageReader.onload = () => {
                                this.addCharacter(this.normalizeCharacterData({
                                    name: file.name.replace(/\\.webp$/, ''),
                                    description: 'Imported character',
                                    creator: 'Unknown',
                                    image: imageReader.result,
                                    originalFilename: file.name
                                }));
                                resolve();
                            };
                            imageReader.readAsDataURL(file);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }
        
        // PNG tEXt CHUNK EXTRACTION FROM ALPHA
        extractPNGTextChunks(uint8Array) {
            const chunks = [];
            let offset = 8; // Skip PNG signature
            
            while (offset < uint8Array.length - 8) {
                // Read chunk length
                const length = (uint8Array[offset] << 24) | 
                              (uint8Array[offset + 1] << 16) | 
                              (uint8Array[offset + 2] << 8) | 
                              uint8Array[offset + 3];
                
                // Read chunk type
                const type = String.fromCharCode(
                    uint8Array[offset + 4],
                    uint8Array[offset + 5],
                    uint8Array[offset + 6],
                    uint8Array[offset + 7]
                );
                
                if (type === 'tEXt' && length > 0) {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                    const nullIndex = chunkData.indexOf(0);
                    
                    if (nullIndex !== -1) {
                        const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex));
                        const text = String.fromCharCode(...chunkData.slice(nullIndex + 1));
                        chunks.push({ keyword, text });
                        KLiteModular.log('generation', `Found PNG tEXt chunk: ${keyword} (${text.length} chars)`);
                    }
                }
                
                // End of PNG
                if (type === 'IEND') break;
                
                // Move to next chunk (length + type + data + CRC)
                offset += 8 + length + 4;
            }
            
            return chunks;
        }
        
        // WEBP CHARACTER DATA EXTRACTION FROM ALPHA
        extractWEBPCharacterData(uint8Array) {
            // Basic WEBP RIFF header check
            const riff = String.fromCharCode(...uint8Array.slice(0, 4));
            const webp = String.fromCharCode(...uint8Array.slice(8, 12));
            
            if (riff !== 'RIFF' || webp !== 'WEBP') {
                return null;
            }
            
            // Look for EXIF chunk
            let offset = 12;
            while (offset < uint8Array.length - 8) {
                const chunkType = String.fromCharCode(...uint8Array.slice(offset, offset + 4));
                const chunkSize = (uint8Array[offset + 4]) | 
                                 (uint8Array[offset + 5] << 8) | 
                                 (uint8Array[offset + 6] << 16) | 
                                 (uint8Array[offset + 7] << 24);
                
                if (chunkType === 'EXIF') {
                    // Try to extract character data from EXIF
                    const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
                    try {
                        const exifString = String.fromCharCode(...exifData);
                        const jsonMatch = exifString.match(/{[^}]+}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            return this.normalizeCharacterData(parsed);
                        }
                    } catch (e) {
                        // Failed to parse EXIF
                    }
                }
                
                offset += 8 + chunkSize;
                if (chunkSize % 2 === 1) offset++; // Padding
            }
            
            return null;
        }
        
        // COMPLETE CHARACTER NORMALIZATION WITH BEHAVIORAL ANALYSIS FROM ALPHA
        normalizeCharacterData(data) {
            KLiteModular.log('generation', `Normalizing character data, spec: ${data.spec || 'v1'}`);
            
            let characterData;
            if (data.spec === 'chara_card_v2' || data.spec === 'chara_card_v3') {
                KLiteModular.log('generation', 'Character card v2/v3 detected, extracting nested data');
                characterData = data.data;
            } else {
                KLiteModular.log('generation', 'Character card v1 or direct format detected');
                characterData = data;
            }
            
            // Enhanced behavioral extraction from ALPHA
            const normalized = {
                ...characterData,
                // Preserve original data for V3 export
                _originalData: data,
                _spec: data.spec || 'v1',
                
                // Enhanced behavioral analysis
                talkativeness: this.extractTalkativeness(characterData),
                keywords: this.extractCharacterKeywords(characterData),
                responseStyle: this.analyzeResponseStyle(characterData),
                traits: this.extractTraits(characterData),
                preferences: {
                    genres: this.extractGenres(characterData),
                    themes: this.extractThemes(characterData),
                    contentRating: this.extractContentRating(characterData)
                }
            };
            
            KLiteModular.log('generation', `Enhanced character analysis - Talkativeness: ${normalized.talkativeness}, Keywords: ${normalized.keywords.length}, Style: ${JSON.stringify(normalized.responseStyle)}`);
            
            return normalized;
        }
        
        // BEHAVIORAL ANALYSIS METHODS FROM ALPHA
        extractTalkativeness(cardData) {
            let score = 50; // Default baseline
            
            // 1. Count constant lorebook entries (V2/V3 feature)
            if (cardData.character_book?.entries) {
                const entries = Array.isArray(cardData.character_book.entries) ? 
                    cardData.character_book.entries : Object.values(cardData.character_book.entries);
                
                const constantEntries = entries.filter(entry => entry.constant).length;
                score += constantEntries * 15; // More constant entries = more talkative
            }
            
            // 2. Analyze personality text (works for V1/V2/V3)
            const personalityText = (cardData.personality || '').toLowerCase();
            const descriptionText = (cardData.description || '').toLowerCase();
            const combinedText = personalityText + ' ' + descriptionText;
            
            // Talkative indicators
            const talkativeWords = [
                'talkative', 'chatty', 'outgoing', 'social', 'extroverted',
                'friendly', 'enthusiastic', 'expressive', 'vocal', 'outspoken',
                'gregarious', 'sociable', 'animated', 'lively'
            ];
            
            // Quiet indicators  
            const quietWords = [
                'quiet', 'shy', 'introverted', 'reserved', 'silent',
                'mysterious', 'stoic', 'withdrawn', 'antisocial', 'timid',
                'reclusive', 'taciturn', 'laconic'
            ];
            
            talkativeWords.forEach(word => {
                if (combinedText.includes(word)) score += 20;
            });
            
            quietWords.forEach(word => {
                if (combinedText.includes(word)) score -= 20;
            });
            
            // 3. Example dialogue length (V1/V2/V3 feature)
            const exampleLength = (cardData.mes_example || '').length;
            if (exampleLength > 800) score += 15;      // Long examples = talkative
            else if (exampleLength < 200) score -= 10; // Short examples = reserved
            
            // 4. First message length
            const firstMessageLength = (cardData.first_mes || '').length;
            if (firstMessageLength > 400) score += 10;
            else if (firstMessageLength < 100) score -= 5;
            
            return Math.max(10, Math.min(100, score));
        }
        
        extractCharacterKeywords(cardData) {
            const keywords = new Set();
            
            // Add name variations
            const name = cardData.name || '';
            keywords.add(name.toLowerCase());
            
            // Add nickname if present
            if (cardData.nickname) {
                keywords.add(cardData.nickname.toLowerCase());
            }
            
            // Extract from character book (V2/V3)
            if (cardData.character_book?.entries) {
                const entries = Array.isArray(cardData.character_book.entries) ? 
                    cardData.character_book.entries : Object.values(cardData.character_book.entries);
                
                entries.forEach(entry => {
                    // Handle both array and string key formats
                    const keys = Array.isArray(entry.key) ? entry.key : 
                                typeof entry.key === 'string' ? entry.key.split(',') : 
                                entry.keys || [];
                    
                    keys.forEach(key => {
                        if (key && typeof key === 'string') {
                            keywords.add(key.trim().toLowerCase());
                        }
                    });
                });
            }
            
            // Extract from personality (key traits)
            const personality = cardData.personality || '';
            const traits = personality.match(/\\b\\w{4,}\\b/g) || [];
            traits.slice(0, 5).forEach(trait => {
                keywords.add(trait.toLowerCase());
            });
            
            return Array.from(keywords);
        }
        
        analyzeResponseStyle(cardData) {
            const personality = (cardData.personality || '').toLowerCase();
            const description = (cardData.description || '').toLowerCase();
            const examples = (cardData.mes_example || '').toLowerCase();
            const combined = personality + ' ' + description + ' ' + examples;
            
            const style = {
                formality: 'casual',
                verbosity: 'medium',
                emotional: 'balanced',
                initiative: 'reactive'
            };
            
            // Analyze formality
            if (combined.includes('proper') || combined.includes('formal') || 
                combined.includes('polite') || combined.includes('courteous')) {
                style.formality = 'formal';
            }
            
            // Analyze verbosity
            const avgExampleLength = (cardData.mes_example || '').length;
            if (avgExampleLength > 600) style.verbosity = 'verbose';
            else if (avgExampleLength < 200) style.verbosity = 'brief';
            
            // Analyze emotional expression
            const emotionalWords = ['emotional', 'expressive', 'passionate', 'dramatic'];
            const reservedWords = ['stoic', 'calm', 'controlled', 'composed'];
            
            if (emotionalWords.some(word => combined.includes(word))) {
                style.emotional = 'expressive';
            } else if (reservedWords.some(word => combined.includes(word))) {
                style.emotional = 'reserved';
            }
            
            // Analyze initiative
            const proactiveWords = ['leader', 'assertive', 'dominant', 'commanding'];
            const passiveWords = ['follower', 'submissive', 'passive', 'obedient'];
            
            if (proactiveWords.some(word => combined.includes(word))) {
                style.initiative = 'proactive';
            } else if (passiveWords.some(word => combined.includes(word))) {
                style.initiative = 'passive';
            }
            
            return style;
        }
        
        extractTraits(data) {
            const text = ((data.personality || '') + ' ' + (data.description || '')).toLowerCase();
            const traits = [];
            
            // Personality traits mapping
            const traitKeywords = {
                'confident': ['confident', 'bold', 'assertive', 'self-assured'],
                'shy': ['shy', 'timid', 'bashful', 'reserved', 'introverted'],
                'friendly': ['friendly', 'warm', 'kind', 'welcoming', 'approachable'],
                'serious': ['serious', 'stern', 'formal', 'businesslike'],
                'playful': ['playful', 'mischievous', 'teasing', 'fun-loving'],
                'intelligent': ['intelligent', 'smart', 'clever', 'brilliant', 'wise'],
                'caring': ['caring', 'compassionate', 'nurturing', 'empathetic'],
                'mysterious': ['mysterious', 'enigmatic', 'secretive', 'cryptic'],
                'energetic': ['energetic', 'enthusiastic', 'vibrant', 'lively'],
                'calm': ['calm', 'peaceful', 'serene', 'tranquil', 'composed']
            };
            
            Object.entries(traitKeywords).forEach(([trait, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    traits.push(trait);
                }
            });
            
            return traits;
        }
        
        extractGenres(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            const genres = [];
            
            const genreKeywords = {
                'fantasy': ['magic', 'fantasy', 'wizard', 'dragon', 'medieval', 'kingdom', 'spell', 'enchant'],
                'sci-fi': ['space', 'robot', 'alien', 'future', 'technology', 'cyberpunk', 'android', 'laser'],
                'romance': ['love', 'romance', 'romantic', 'heart', 'kiss', 'date', 'relationship'],
                'adventure': ['adventure', 'quest', 'journey', 'explore', 'treasure', 'danger'],
                'horror': ['horror', 'scary', 'dark', 'fear', 'nightmare', 'ghost', 'demon'],
                'comedy': ['funny', 'humor', 'joke', 'laugh', 'comedy', 'amusing', 'silly'],
                'slice-of-life': ['daily', 'normal', 'everyday', 'routine', 'ordinary', 'casual'],
                'drama': ['drama', 'emotional', 'tragic', 'conflict', 'tension']
            };
            
            Object.entries(genreKeywords).forEach(([genre, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    genres.push(genre);
                }
            });
            
            return genres.length > 0 ? genres : ['general'];
        }
        
        extractThemes(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            const themes = [];
            
            const themeKeywords = {
                'friendship': ['friend', 'friendship', 'companion', 'buddy', 'pal'],
                'family': ['family', 'parent', 'sibling', 'mother', 'father', 'sister', 'brother'],
                'school': ['school', 'student', 'teacher', 'class', 'university', 'college'],
                'work': ['work', 'job', 'office', 'business', 'career', 'professional'],
                'supernatural': ['supernatural', 'paranormal', 'spirit', 'ghost', 'magic', 'mystical'],
                'historical': ['historical', 'history', 'past', 'ancient', 'period', 'era'],
                'modern': ['modern', 'contemporary', 'current', 'present', 'today'],
                'military': ['military', 'soldier', 'army', 'war', 'battle', 'combat']
            };
            
            Object.entries(themeKeywords).forEach(([theme, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    themes.push(theme);
                }
            });
            
            return themes;
        }
        
        extractContentRating(data) {
            const text = ((data.description || '') + ' ' + (data.scenario || '') + ' ' + (data.personality || '')).toLowerCase();
            
            // Check for mature content indicators
            const matureKeywords = ['nsfw', 'adult', 'mature', 'explicit', 'sexual', 'erotic'];
            const violenceKeywords = ['violence', 'blood', 'kill', 'murder', 'death', 'gore'];
            
            if (matureKeywords.some(keyword => text.includes(keyword))) {
                return 'mature';
            }
            
            if (violenceKeywords.some(keyword => text.includes(keyword))) {
                return 'teen';
            }
            
            return 'general';
        }
        
        refreshGallery() {
            const gallery = document.getElementById('char-gallery');
            if (gallery) {
                gallery.innerHTML = this.renderCharacters();
            }
        }
        
        init() {
            this.createFileInput();
            
            // Setup event handlers after render
            setTimeout(() => {
                // Search functionality
                const searchInput = document.getElementById('char-search');
                if (searchInput) {
                    searchInput.addEventListener('input', e => {
                        this.currentFilter = e.target.value;
                        this.saveData('currentFilter', this.currentFilter);
                        this.refreshGallery();
                    });
                }
                
                // Filter handlers
                const tagFilter = document.getElementById('char-tag-filter');
                if (tagFilter) {
                    tagFilter.addEventListener('change', e => {
                        this.tagFilter = e.target.value;
                        this.saveData('tagFilter', this.tagFilter);
                        this.refreshGallery();
                    });
                }
                
                const starFilter = document.getElementById('char-star-filter');
                if (starFilter) {
                    starFilter.addEventListener('change', e => {
                        this.starFilter = e.target.value;
                        this.saveData('starFilter', this.starFilter);
                        this.refreshGallery();
                    });
                }
                
                // Sort and view handlers
                const sortSelect = document.getElementById('char-sort');
                if (sortSelect) {
                    sortSelect.addEventListener('change', e => {
                        this.currentSort = e.target.value;
                        this.saveData('currentSort', this.currentSort);
                        this.refreshGallery();
                    });
                }
                
                const viewSelect = document.getElementById('char-view');
                if (viewSelect) {
                    viewSelect.addEventListener('change', e => {
                        this.currentView = e.target.value;
                        this.saveData('currentView', this.currentView);
                        this.refreshGallery();
                    });
                }
                
                // Setup drag and drop
                const uploadZone = document.getElementById('char-upload-zone');
                if (uploadZone) {
                    uploadZone.addEventListener('dragover', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        uploadZone.style.background = 'rgba(74, 158, 255, 0.2)';
                        uploadZone.style.borderColor = '#4a9eff';
                    });
                    
                    uploadZone.addEventListener('dragleave', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        uploadZone.style.background = 'rgba(42, 42, 42, 0.9)';
                        uploadZone.style.borderColor = '#444';
                    });
                    
                    uploadZone.addEventListener('drop', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        uploadZone.style.background = 'rgba(42, 42, 42, 0.9)';
                        uploadZone.style.borderColor = '#444';
                        this.handleFiles(e.dataTransfer.files);
                    });
                    
                    uploadZone.addEventListener('click', () => {
                        this.fileInput.click();
                    });
                }
            }, 100);
        }
        
        saveState() {
            return {
                characters: this.characters,
                currentFilter: this.currentFilter,
                currentSort: this.currentSort,
                currentView: this.currentView,
                tagFilter: this.tagFilter,
                starFilter: this.starFilter
            };
        }
        
        restoreState(state) {
            this.characters = state.characters || [];
            this.currentFilter = state.currentFilter || '';
            this.currentSort = state.currentSort || 'name-asc';
            this.currentView = state.currentView || 'list';
            this.tagFilter = state.tagFilter || '';
            this.starFilter = state.starFilter || '';
        }
        
        async init() {
            // Load saved data
            this.characters = await this.loadData('characters') || [];
            this.currentFilter = await this.loadData('currentFilter') || '';
            this.currentSort = await this.loadData('currentSort') || 'name-asc';
            this.currentView = await this.loadData('currentView') || 'list';
            this.tagFilter = await this.loadData('tagFilter') || '';
            this.starFilter = await this.loadData('starFilter') || '';
            
            // Create file input immediately
            this.createFileInput();
            KLiteModular.log('characters', 'Character panel initialized with', this.characters.length, 'characters');
        }
        
        postRender() {
            // Set up event handlers after DOM elements are rendered
            this.setupEventHandlers();
            KLiteModular.log('characters', 'Character panel event handlers set up');
        }
        
        setupEventHandlers() {
            KLiteModular.log('characters', 'Setting up event handlers...');
            
            // Drag and drop handlers
            const uploadZone = document.getElementById('char-upload-zone');
            if (uploadZone) {
                KLiteModular.log('characters', 'Found upload zone, setting up drag & drop');
                uploadZone.addEventListener('click', () => {
                    KLiteModular.log('characters', 'Upload zone clicked, triggering file input');
                    if (this.fileInput) {
                        KLiteModular.log('characters', 'File input exists, triggering click');
                        this.fileInput.click();
                    } else {
                        KLiteModular.log('characters', 'ERROR: File input not found!');
                        this.createFileInput();
                        if (this.fileInput) this.fileInput.click();
                    }
                });
                uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
                uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
                uploadZone.addEventListener('drop', this.handleDrop.bind(this));
            } else {
                KLiteModular.log('characters', 'Upload zone NOT found - DOM may not be ready');
            }
            
            // Search and filter handlers
            const searchInput = document.getElementById('char-search');
            if (searchInput) {
                KLiteModular.log('characters', 'Found search input, setting up filter');
                searchInput.addEventListener('input', (e) => {
                    this.currentFilter = e.target.value;
                    this.saveData('currentFilter', this.currentFilter);
                    KLiteModular.renderPanels();
                });
            } else {
                KLiteModular.log('characters', 'Search input NOT found');
            }
            
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                tagFilter.addEventListener('change', (e) => {
                    this.tagFilter = e.target.value;
                    this.saveData('tagFilter', this.tagFilter);
                    KLiteModular.renderPanels();
                });
            }
            
            const starFilter = document.getElementById('char-star-filter');
            if (starFilter) {
                starFilter.addEventListener('change', (e) => {
                    this.starFilter = e.target.value;
                    this.saveData('starFilter', this.starFilter);
                    KLiteModular.renderPanels();
                });
            }
            
            const sortSelect = document.getElementById('char-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    this.saveData('currentSort', this.currentSort);
                    KLiteModular.renderPanels();
                });
            }
            
            const viewSelect = document.getElementById('char-view');
            if (viewSelect) {
                viewSelect.addEventListener('change', (e) => {
                    this.currentView = e.target.value;
                    this.saveData('currentView', this.currentView);
                    KLiteModular.renderPanels();
                });
            }
        }
        
        handleDragOver(e) {
            e.preventDefault();
            e.stopPropagation();
            e.target.style.borderColor = '#4a9eff';
            e.target.style.background = 'rgba(74, 158, 255, 0.1)';
        }
        
        handleDragLeave(e) {
            e.preventDefault();
            e.stopPropagation();
            e.target.style.borderColor = '#444';
            e.target.style.background = 'rgba(42, 42, 42, 0.9)';
        }
        
        handleDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            e.target.style.borderColor = '#444';
            e.target.style.background = 'rgba(42, 42, 42, 0.9)';
            
            const files = e.dataTransfer.files;
            KLiteModular.log('characters', `Files dropped: ${files.length} files`);
            
            if (files.length > 0) {
                this.handleFiles(files);
            } else {
                KLiteModular.log('characters', 'No files in drop event');
            }
        }
        
        async handleFiles(files) {
            KLiteModular.log('characters', `Processing ${files.length} files`);
            
            for (const file of files) {
                try {
                    if (file.name.endsWith('.json')) {
                        await this.loadJSONFile(file);
                    } else if (file.name.endsWith('.png')) {
                        await this.loadPNGFile(file);
                    } else if (file.name.endsWith('.webp')) {
                        await this.loadWEBPFile(file);
                    } else {
                        KLiteModular.log('characters', `Unsupported file type: ${file.name}`);
                    }
                } catch (err) {
                    KLiteModular.error(`Failed to load file: ${file.name}`, err);
                    alert(`Failed to load ${file.name}: ${err.message}`);
                }
            }
            
            // Refresh display
            KLiteModular.renderPanels();
        }
        
        async loadJSONFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.addCharacter(this.normalizeCharacterData(data));
                        KLiteModular.log('characters', `Loaded JSON character: ${data.name || 'Unknown'}`);
                        resolve();
                    } catch (err) {
                        reject(new Error(`Invalid JSON: ${err.message}`));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        }
        
        showCharacterModal(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            const modalContainer = document.getElementById('char-modal-container');
            if (!modalContainer) return;
            
            modalContainer.innerHTML = this.renderCharacterModal(character);
            
            // Set up modal event handlers
            this.setupModalHandlers(character);
        }
        
        renderCharacterModal(char) {
            const rawData = char.rawData?.data || char.rawData || {};
            
            return `
                <div class="klite-modal-overlay" onclick="this.remove()">
                    <div class="klite-modal klite-char-modal" onclick="event.stopPropagation()" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                        <div class="klite-modal-header">
                            <h3>${char.name || 'Unknown Character'}</h3>
                            <button class="klite-modal-close" onclick="this.closest('.klite-modal-overlay').remove()">×</button>
                        </div>
                        
                        <div class="klite-modal-content">
                            <!-- Character Image and Basic Info -->
                            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                                <div style="flex-shrink: 0;">
                                    ${char.image ? `
                                        <img src="${char.image}" alt="${char.name}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid var(--border);">
                                    ` : `
                                        <div style="width: 120px; height: 120px; background: var(--bg3); border: 2px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--muted);">
                                            👤
                                        </div>
                                    `}
                                </div>
                                
                                <div style="flex: 1;">
                                    <h4 style="margin: 0 0 8px 0; color: var(--text);">${char.name || 'Unknown'}</h4>
                                    <p style="margin: 0 0 8px 0; font-size: 11px; color: var(--muted);">
                                        Created by: ${char.creator || 'Unknown'}<br>
                                        Imported: ${new Date(char.created || Date.now()).toLocaleDateString()}<br>
                                        Talkativeness: ${char.talkativeness || 50}%
                                    </p>
                                    
                                    <!-- Star Rating -->
                                    <div style="margin-bottom: 8px;">
                                        <label style="font-size: 11px; color: var(--text);">Rating:</label>
                                        <select class="klite-select" onchange="KLiteModular.activePanels.get('characters').updateCharacterRating(${char.id}, this.value)" style="margin-left: 8px; font-size: 10px;">
                                            <option value="0" ${(char.rating || 0) === 0 ? 'selected' : ''}>☆ Unrated</option>
                                            <option value="1" ${char.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                                            <option value="2" ${char.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                                            <option value="3" ${char.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                                            <option value="4" ${char.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                                            <option value="5" ${char.rating === 5 ? 'selected' : ''}>★★★★★</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Tags -->
                                    ${char.tags && char.tags.length > 0 ? `
                                        <div>
                                            ${char.tags.map(tag => `<span class="klite-tag">${tag}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px;">
                                <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').loadAsScenario(${char.id})">
                                    🎭 Load Scenario
                                </button>
                                <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').addToWorldInfo(${char.id})">
                                    🌍 Add to WI
                                </button>
                                <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').addToMemory(${char.id})">
                                    🧠 Add to Memory
                                </button>
                                <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').exportCharacterJSON(${char.id})">
                                    📄 Export JSON
                                </button>
                                <button class="klite-panel-btn" onclick="KLiteModular.activePanels.get('characters').exportCharacterPNG(${char.id})">
                                    🖼️ Export PNG
                                </button>
                                <button class="klite-panel-btn danger" onclick="KLiteModular.activePanels.get('characters').deleteCharacter(${char.id})">
                                    🗑️ Delete
                                </button>
                            </div>
                            
                            <!-- Character Details -->
                            ${char.description ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 5px 0; color: var(--text); font-size: 12px;">Description</h5>
                                    <div style="background: var(--bg2); padding: 8px; border-radius: 4px; font-size: 11px; line-height: 1.4; color: var(--text);">
                                        ${char.description}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${char.personality ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 5px 0; color: var(--text); font-size: 12px;">Personality</h5>
                                    <div style="background: var(--bg2); padding: 8px; border-radius: 4px; font-size: 11px; line-height: 1.4; color: var(--text);">
                                        ${char.personality}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${char.firstMessage ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 5px 0; color: var(--text); font-size: 12px;">First Message</h5>
                                    <div style="background: var(--bg2); padding: 8px; border-radius: 4px; font-size: 11px; line-height: 1.4; color: var(--text);">
                                        ${char.firstMessage}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${char.scenario ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 5px 0; color: var(--text); font-size: 12px;">Scenario</h5>
                                    <div style="background: var(--bg2); padding: 8px; border-radius: 4px; font-size: 11px; line-height: 1.4; color: var(--text);">
                                        ${char.scenario}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Advanced Details -->
                            <details style="margin-top: 15px;">
                                <summary style="cursor: pointer; color: var(--text); font-size: 12px; font-weight: bold;">Technical Details</summary>
                                <div style="margin-top: 8px; padding: 8px; background: var(--bg2); border-radius: 4px; font-size: 10px; color: var(--muted);">
                                    <div><strong>Character ID:</strong> ${char.id}</div>
                                    <div><strong>Format Version:</strong> ${rawData.spec || 'v1'}</div>
                                    <div><strong>Total Tokens:</strong> ~${Math.ceil((char.description?.length || 0) / 4) + Math.ceil((char.personality?.length || 0) / 4)}</div>
                                    <div><strong>Keywords:</strong> ${(char.keywords || []).join(', ') || 'None'}</div>
                                    ${char.alternateGreetings && char.alternateGreetings.length > 0 ? `<div><strong>Alt Greetings:</strong> ${char.alternateGreetings.length}</div>` : ''}
                                    ${char.worldInfo ? `<div><strong>World Info Entries:</strong> ${Object.keys(char.worldInfo.entries || {}).length}</div>` : ''}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            `;
        }
        
        setupModalHandlers(character) {
            // Modal is already set up with inline onclick handlers for simplicity
            KLiteModular.log('characters', `Opened modal for character: ${character.name}`);
        }
        
        updateCharacterRating(charId, rating) {
            const charIndex = this.characters.findIndex(c => c.id === charId);
            if (charIndex !== -1) {
                this.characters[charIndex].rating = parseInt(rating);
                this.saveData('characters', this.characters);
                KLiteModular.renderPanels();
                KLiteModular.log('characters', `Updated rating for ${this.characters[charIndex].name}: ${rating} stars`);
            }
        }
        
        addCharacter(characterData) {
            // Ensure unique ID
            characterData.id = characterData.id || Date.now() + Math.random();
            
            // Add to collection
            this.characters.unshift(characterData);
            this.saveData('characters', this.characters);
            
            KLiteModular.log('characters', `Added character: ${characterData.name}`);
        }
        
        deleteCharacter(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            if (confirm(`Delete character "${character.name}"? This cannot be undone.`)) {
                this.characters = this.characters.filter(c => c.id !== charId);
                this.saveData('characters', this.characters);
                KLiteModular.renderPanels();
                
                // Close modal if open
                const modal = document.querySelector('.klite-modal-overlay');
                if (modal) modal.remove();
                
                KLiteModular.log('characters', `Deleted character: ${character.name}`);
            }
        }
        
        exportCharacters() {
            if (this.characters.length === 0) {
                alert('No characters to export');
                return;
            }
            
            const exportData = {
                version: '2.0',
                exported: new Date().toISOString(),
                characters: this.characters
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `klite-characters-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            KLiteModular.log('characters', `Exported ${this.characters.length} characters`);
        }
        
        clearAll() {
            if (this.characters.length === 0) return;
            
            if (confirm(`Delete all ${this.characters.length} characters? This cannot be undone.`)) {
                this.characters = [];
                this.saveData('characters', this.characters);
                KLiteModular.renderPanels();
                KLiteModular.log('characters', 'Cleared all characters');
            }
        }
        
        exportCharacterJSON(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
    
            const exportData = character.rawData || character;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${character.name.replace(/[^\w\s]/gi, '')}_character.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            KLiteModular.log('characters', `Exported JSON for: ${character.name}`);
        }
        
        loadAsScenario(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            if (!confirm(`Load "${character.name}" as scenario? This will restart the session and overwrite your current data.`)) {
                return;
            }
            
            try {
                // Clear current game state
                if (typeof window.restart_new_game === 'function') {
                    window.restart_new_game();
                } else if (window.gametext_arr) {
                    window.gametext_arr = [];
                }
                
                // Build scenario content
                let scenarioContent = '';
                
                if (character.scenario) {
                    scenarioContent += character.scenario + '';
                }
                
                if (character.description) {
                    scenarioContent += `${character.name}: ${character.description}`;
                }
                
                if (character.personality) {
                    scenarioContent += `Personality: ${character.personality}`;
                }
                
                // Add to memory
                if (scenarioContent && window.current_memory !== undefined) {
                    window.current_memory = scenarioContent.trim();
                    
                    const memoryField = document.getElementById('memorytext');
                    if (memoryField) {
                        memoryField.value = window.current_memory;
                        memoryField.dispatchEvent(new Event('input'));
                    }
                }
                
                // Add first message to chat if available
                if (character.firstMessage && window.gametext_arr) {
                    window.gametext_arr.push(character.firstMessage);
                    if (window.render_gametext) {
                        window.render_gametext();
                    }
                }
                
                // Add character to World Info if it has entries
                if (character.worldInfo && character.worldInfo.entries) {
                    this.addToWorldInfo(charId);
                }
                
                // Close modal
                const modal = document.querySelector('.klite-modal-overlay');
                if (modal) modal.remove();
                
                KLiteModular.log('characters', `Loaded scenario for: ${character.name}`);
                alert(`Scenario loaded for ${character.name}`);
                
            } catch (error) {
                KLiteModular.error('Failed to load scenario:', error);
                alert('Failed to load scenario');
            }
        }
        
        addToWorldInfo(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            if (!window.current_wi) {
                window.current_wi = [];
            }
            
            try {
                const wiGroup = `Character: ${character.name}`;
                let entriesAdded = 0;
                
                // Main character entry
                window.current_wi.push({
                    key: character.name.toLowerCase(),
                    content: `${character.name}: ${character.description || 'No description available.'}`,
                    comment: `${wiGroup} - Main`,
                    folder: wiGroup,
                    selective: true,
                    constant: false,
                    order: 100
                });
                entriesAdded++;
                
                // Personality entry
                if (character.personality) {
                    window.current_wi.push({
                        key: `${character.name.toLowerCase()} personality, ${character.name.toLowerCase()}`,
                        content: `${character.name}'s personality: ${character.personality}`,
                        comment: `${wiGroup} - Personality`,
                        folder: wiGroup,
                        selective: true,
                        constant: false,
                        order: 90
                    });
                    entriesAdded++;
                }
                
                // Import character book entries if available
                if (character.worldInfo && character.worldInfo.entries) {
                    const entries = Array.isArray(character.worldInfo.entries) ? 
                        character.worldInfo.entries : Object.values(character.worldInfo.entries);
                    
                    entries.forEach((entry, index) => {
                        // Convert keys to comma-separated string format
                        let keyString = '';
                        if (Array.isArray(entry.keys)) {
                            keyString = entry.keys.join(', ');
                        } else if (entry.key) {
                            keyString = entry.key;
                        } else {
                            keyString = `${character.name.toLowerCase()}_${index}`;
                        }
                        
                        window.current_wi.push({
                            key: keyString,
                            content: entry.content || entry.value || '',
                            comment: `${wiGroup} - Imported ${index + 1}`,
                            folder: wiGroup,
                            selective: entry.selective !== false,
                            constant: entry.constant === true,
                            order: entry.insertion_order || (80 - index)
                        });
                        entriesAdded++;
                    });
                }
                
                // Update Lite's WI if available
                if (window.wi_update_file) {
                    window.wi_update_file();
                }
                
                KLiteModular.log('characters', `Added ${entriesAdded} WI entries for: ${character.name}`);
                alert(`Added ${entriesAdded} World Info entries for ${character.name}`);
                
            } catch (error) {
                KLiteModular.error('Failed to add to World Info:', error);
                alert('Failed to add to World Info');
            }
        }
        
        addToMemory(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            try {
                let memoryContent = '';
                
                memoryContent += `=== ${character.name} ===
`;
                
                if (character.description) {
                    memoryContent += `Description: ${character.description}
`;
                }
                
                if (character.personality) {
                    memoryContent += `Personality: ${character.personality}
`;
                }
                
                if (character.scenario) {
                    memoryContent += `Scenario: ${character.scenario}
`;
                }
                
                // Add to current memory
                const currentMemory = window.current_memory || '';
                window.current_memory = currentMemory ? currentMemory + '' + memoryContent : memoryContent;
                
                // Update Lite's memory field
                const memoryField = document.getElementById('memorytext');
                if (memoryField) {
                    memoryField.value = window.current_memory;
                    memoryField.dispatchEvent(new Event('input'));
                }
                
                KLiteModular.log('characters', `Added to memory: ${character.name}`);
                alert(`Added ${character.name} to memory`);
                
            } catch (error) {
                KLiteModular.error('Failed to add to memory:', error);
                alert('Failed to add to memory');
            }
        }
        
        exportCharacterPNG(charId) {
            const character = this.characters.find(c => c.id === charId);
            if (!character) return;
            
            try {
                // Create character card data for PNG export
                const exportData = {
                    spec: 'chara_card_v2',
                    spec_version: '2.0',
                    data: character.rawData || {
                        name: character.name,
                        description: character.description || '',
                        personality: character.personality || '',
                        scenario: character.scenario || '',
                        first_mes: character.firstMessage || '',
                        mes_example: character.exampleDialogue || '',
                        creator_notes: character.creatorNotes || '',
                        system_prompt: '',
                        post_history_instructions: '',
                        alternate_greetings: character.alternateGreetings || [],
                        character_book: character.worldInfo || null,
                        tags: character.tags || [],
                        creator: character.creator || '',
                        character_version: '1.0.0',
                        extensions: character.extensions || {}
                    }
                };
                
                // Create canvas for image
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                
                if (character.image) {
                    // Load existing image
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, 512, 512);
                        this.finalizePNGExport(canvas, exportData, character.name);
                    };
                    img.onerror = () => {
                        // Fallback if image fails to load
                        this.createFallbackPNG(ctx, character, exportData);
                    };
                    img.src = character.image;
                } else {
                    // No image - create text-based card
                    this.createFallbackPNG(ctx, character, exportData);
                }
                
                KLiteModular.log('characters', `Exporting PNG for: ${character.name}`);
                
            } catch (error) {
                KLiteModular.error('Failed to export PNG:', error);
                alert('Failed to export PNG');
            }
        }
        
        renderCharacterCard(char) {
            const rating = char.rating || 0;
            const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            
            return `
                <div style="background: rgba(42, 42, 42, 0.9); border: 1px solid #444; border-radius: 6px; padding: 8px; cursor: pointer; transition: all 0.2s;" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})">
                    <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                        ${char.image ? `
                            <img src="${char.image}" alt="${char.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #555;">
                        ` : `
                            <div style="width: 40px; height: 40px; background: #333; border: 1px solid #555; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #666;">
                                ${(char.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        `}
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 11px; color: #fff; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${char.name || 'Unknown'}
                            </div>
                            <div style="font-size: 9px; color: #999; margin-bottom: 2px;">
                                ${char.creator || 'Unknown Creator'}
                            </div>
                            <div style="font-size: 8px; color: #4a9eff;">
                                ${ratingStars}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 9px; color: #ccc; line-height: 1.3; height: 26px; overflow: hidden;">
                        ${(char.description || 'No description available').substring(0, 80)}${char.description && char.description.length > 80 ? '...' : ''}
                    </div>
                    ${char.tags && char.tags.length > 0 ? `
                        <div style="margin-top: 4px;">
                            ${char.tags.slice(0, 2).map(tag => `<span style="background: #4a9eff; color: white; padding: 1px 4px; border-radius: 2px; font-size: 7px; margin-right: 2px;">${tag}</span>`).join('')}
                            ${char.tags.length > 2 ? `<span style="color: #999; font-size: 7px;">+${char.tags.length - 2}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        renderCharacterListItem(char) {
            const rating = char.rating || 0;
            const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; border-radius: 4px; margin-bottom: 4px; cursor: pointer;" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})">
                    ${char.image ? `
                        <img src="${char.image}" alt="${char.name}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #555; flex-shrink: 0;">
                    ` : `
                        <div style="width: 32px; height: 32px; background: #333; border: 1px solid #555; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666; flex-shrink: 0;">
                            ${(char.name || 'U').charAt(0).toUpperCase()}
                        </div>
                    `}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 11px; color: #fff; margin-bottom: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${char.name || 'Unknown'}
                        </div>
                        <div style="font-size: 9px; color: #999;">
                            ${char.creator || 'Unknown'} • ${char.talkativeness || 50}% talkativeness
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 8px; color: #4a9eff; flex-shrink: 0;">
                        ${ratingStars}
                    </div>
                </div>
            `;
        }
        
        renderCharacterOverviewItem(char) {
            const rating = char.rating || 0;
            const ratingStars = rating > 0 ? '★'.repeat(rating) : '☆';
            
            return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 6px; border: 1px solid #444; border-radius: 4px; background: rgba(42, 42, 42, 0.9); cursor: pointer; text-align: center; transition: all 0.2s;" 
                     data-char-id="${char.id}" onclick="KLiteModular.activePanels.get('characters').showCharacterModal(${char.id})"
                     onmouseover="this.style.background='rgba(74, 158, 255, 0.1)'; this.style.borderColor='#4a9eff';" 
                     onmouseout="this.style.background='rgba(42, 42, 42, 0.9)'; this.style.borderColor='#444';">
                    ${char.image ? `
                        <div style="width: 40px; height: 40px; border-radius: 20px; overflow: hidden; margin-bottom: 4px; border: 1px solid #444;">
                            <img src="${char.image}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 20px; background: #333; border: 1px solid #444; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; font-size: 16px; color: #666;">
                            ${(char.name || 'U').charAt(0).toUpperCase()}
                        </div>
                    `}
                    <div style="font-weight: 600; font-size: 9px; color: #fff; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">
                        ${char.name || 'Unknown'}
                    </div>
                    <div style="font-size: 7px; color: #4a9eff;">
                        ${ratingStars}
                    </div>
                </div>
            `;
        }
        
        // Complete PNG export helper methods from ALPHA
        createFallbackPNG(ctx, character, exportData) {
            // Create a text-based character card
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(50, 50, 412, 412);
            
            // Character name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(character.name, 256, 150);
            
            // Description
            if (character.description) {
                ctx.font = '16px Arial';
                ctx.textAlign = 'left';
                this.wrapText(ctx, character.description.substring(0, 200) + '...', 70, 200, 392, 20);
            }
            
            this.finalizePNGExport(ctx.canvas, exportData, character.name);
        }
        
        wrapText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, y);
        }
        
        finalizePNGExport(canvas, exportData, characterName) {
            try {
                // Convert character data to base64 for embedding
                const jsonString = JSON.stringify(exportData);
                const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                
                // Get PNG data from canvas
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        alert('Failed to create PNG blob');
                        return;
                    }
                    
                    try {
                        // Convert blob to uint8 array for metadata embedding
                        const arrayBuffer = await blob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Embed character data in PNG tEXt chunk
                        const pngWithMetadata = this.embedPNGMetadata(uint8Array, 'chara', base64Data);
                        
                        // Create final blob and download
                        const finalBlob = new Blob([pngWithMetadata], { type: 'image/png' });
                        const url = URL.createObjectURL(finalBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${characterName.replace(/[^\w\s]/gi, '')}_V2.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        alert(`Exported ${characterName} as V2 PNG with embedded character data`);
                    } catch (error) {
                        KLiteModular.error('Failed to embed PNG metadata:', error);
                        alert('Failed to embed character data in PNG');
                    }
                }, 'image/png');
            } catch (error) {
                KLiteModular.error('Failed to finalize PNG export:', error);
                alert('Failed to finalize PNG export');
            }
        }
        
        embedPNGMetadata(pngData, keyword, text) {
            // Create tEXt chunk with character data
            const keywordBytes = new TextEncoder().encode(keyword);
            const textBytes = new TextEncoder().encode(text);
            const nullSeparator = new Uint8Array([0]);
            
            // Calculate chunk data (keyword + null + text)
            const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
            chunkData.set(keywordBytes, 0);
            chunkData.set(nullSeparator, keywordBytes.length);
            chunkData.set(textBytes, keywordBytes.length + 1);
            
            // Calculate CRC32 for chunk type + data
            const chunkType = new TextEncoder().encode('tEXt');
            const crcData = new Uint8Array(chunkType.length + chunkData.length);
            crcData.set(chunkType, 0);
            crcData.set(chunkData, chunkType.length);
            const crc32 = this.calculateCRC32(crcData);
            
            // Create complete tEXt chunk
            const chunkLength = chunkData.length;
            const chunk = new Uint8Array(4 + 4 + chunkData.length + 4);
            
            // Length (4 bytes, big-endian)
            chunk[0] = (chunkLength >> 24) & 0xFF;
            chunk[1] = (chunkLength >> 16) & 0xFF;
            chunk[2] = (chunkLength >> 8) & 0xFF;
            chunk[3] = chunkLength & 0xFF;
            
            // Type (4 bytes)
            chunk.set(chunkType, 4);
            
            // Data
            chunk.set(chunkData, 8);
            
            // CRC (4 bytes, big-endian)
            chunk[8 + chunkData.length] = (crc32 >> 24) & 0xFF;
            chunk[8 + chunkData.length + 1] = (crc32 >> 16) & 0xFF;
            chunk[8 + chunkData.length + 2] = (crc32 >> 8) & 0xFF;
            chunk[8 + chunkData.length + 3] = crc32 & 0xFF;
            
            // Find IEND chunk position in original PNG
            let iendPos = -1;
            for (let i = pngData.length - 12; i >= 8; i--) {
                if (pngData[i + 4] === 73 && pngData[i + 5] === 69 && // 'IE'
                    pngData[i + 6] === 78 && pngData[i + 7] === 68) { // 'ND'
                    iendPos = i;
                    break;
                }
            }
            
            if (iendPos === -1) {
                throw new Error('Could not find IEND chunk in PNG');
            }
            
            // Create new PNG with embedded chunk
            const newPng = new Uint8Array(pngData.length + chunk.length);
            newPng.set(pngData.subarray(0, iendPos), 0);
            newPng.set(chunk, iendPos);
            newPng.set(pngData.subarray(iendPos), iendPos + chunk.length);
            
            return newPng;
        }
        
        calculateCRC32(data) {
            // Standard CRC32 implementation for PNG
            const crcTable = this.getCRC32Table();
            let crc = 0xFFFFFFFF;
            
            for (let i = 0; i < data.length; i++) {
                crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
            }
            
            return (crc ^ 0xFFFFFFFF) >>> 0;
        }
        
        getCRC32Table() {
            if (!this._crc32Table) {
                this._crc32Table = new Array(256);
                for (let n = 0; n < 256; n++) {
                    let c = n;
                    for (let k = 0; k < 8; k++) {
                        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                    }
                    this._crc32Table[n] = c;
                }
            }
            return this._crc32Table;
        }
    }
    
    // GenerationControl Panel - EXACT COPY from ALPHA release (adapted for new framework)
    class GenerationControlPanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'Generation Control';
            this.panelPrefix = 'genctrl'; // Unique prefix for this panel instance
            
            // Initialize the generation control system exactly as in ALPHA
            this.initGenerationControl();
        }
        
        initGenerationControl() {
            // Exact copy of generationControl object from ALPHA
            this.generationControl = {
                currentPreset: null,
                panels: ['story', 'adv', 'rp', 'chat', 'genctrl'], // Add our panel to the list
                currentSettings: {},
                
                // Preset definitions using parameters from KoboldAI Lite - EXACT COPY
                presets: {
                    precise: {
                        name: 'Precise',
                        temperature: 0.2,
                        top_p: 0.9,
                        top_k: 20,
                        min_p: 0.05,
                        rep_pen: 1.05,
                        rep_pen_range: 1024,
                        rep_pen_slope: 0.5
                    },
                    koboldai: {
                        name: 'KoboldAI',
                        temperature: 0.7,
                        top_p: 0.9,
                        top_k: 0,
                        min_p: 0.0,
                        rep_pen: 1.1,
                        rep_pen_range: 1024,
                        rep_pen_slope: 0.7
                    },
                    creative: {
                        name: 'Creative',
                        temperature: 1.2,
                        top_p: 0.85,
                        top_k: 40,
                        min_p: 0.05,
                        rep_pen: 1.1,
                        rep_pen_range: 1024,
                        rep_pen_slope: 0.7
                    },
                    chaotic: {
                        name: 'Chaotic',
                        temperature: 1.8,
                        top_p: 0.8,
                        top_k: 60,
                        min_p: 0.05,
                        rep_pen: 1.2,
                        rep_pen_range: 1024,
                        rep_pen_slope: 0.8
                    }
                },
                
                // Convert between slider values (0-100) and actual parameters - EXACT COPY
                sliderToParam: {
                    creativity: {
                        temperature: (value) => 0.5 + (value / 100) * 1.5, // Range 0.5-2.0
                        top_p: (value) => 0.85 + (value / 100) * 0.14 // Range 0.85-0.99
                    },
                    focus: {
                        top_k: (value) => Math.round(10 + (value / 100) * 90), // Range 10-100
                        min_p: (value) => 0.01 + (value / 100) * 0.09 // Range 0.01-0.10
                    },
                    repetition: {
                        rep_pen: (value) => 1.0 + (value / 100) * 0.5, // Range 1.0-1.5
                        rep_pen_range: (value) => Math.round(256 + (value / 100) * 1792), // Range 256-2048
                        rep_pen_slope: (value) => 0.1 + (value / 100) * 0.9 // Range 0.1-1.0
                    }
                },
                
                paramToSlider: {
                    creativity: (temp) => Math.round(((temp - 0.5) / 1.5) * 100),
                    focus: (top_k) => Math.round(((top_k - 10) / 90) * 100),
                    repetition: (rep_pen) => Math.round(((rep_pen - 1.0) / 0.5) * 100)
                },
                
                // Apply a preset to KoboldAI Lite - EXACT COPY
                applyPreset: (presetName) => {
                    const preset = this.generationControl.presets[presetName];
                    if (!preset) return;
                    
                    if (window.localsettings) {
                        // Apply all preset values to localsettings
                        Object.assign(window.localsettings, {
                            temperature: preset.temperature,
                            top_p: preset.top_p,
                            top_k: preset.top_k,
                            min_p: preset.min_p,
                            rep_pen: preset.rep_pen,
                            rep_pen_range: preset.rep_pen_range,
                            rep_pen_slope: preset.rep_pen_slope
                        });
                        
                        window.save_settings?.();
                    }
                    
                    this.generationControl.currentPreset = presetName;
                    this.generationControl.syncAllPanels();
                    
                    KLiteModular.log('generation', `Applied preset: ${preset.name}`);
                },
                
                // Update settings from a single slider - EXACT COPY
                updateFromSlider: (sliderType, value) => {
                    if (!window.localsettings) return;
                    
                    switch(sliderType) {
                        case 'creativity':
                            window.localsettings.temperature = this.generationControl.sliderToParam.creativity.temperature(value);
                            window.localsettings.top_p = this.generationControl.sliderToParam.creativity.top_p(value);
                            break;
                        case 'focus':
                            window.localsettings.top_k = this.generationControl.sliderToParam.focus.top_k(value);
                            window.localsettings.min_p = this.generationControl.sliderToParam.focus.min_p(value);
                            break;
                        case 'repetition':
                            window.localsettings.rep_pen = this.generationControl.sliderToParam.repetition.rep_pen(value);
                            window.localsettings.rep_pen_range = this.generationControl.sliderToParam.repetition.rep_pen_range(value);
                            window.localsettings.rep_pen_slope = this.generationControl.sliderToParam.repetition.rep_pen_slope(value);
                            break;
                        case 'max_length':
                            window.localsettings.max_length = value;
                            break;
                    }
                    
                    window.save_settings?.();
                    
                    // Update displays immediately
                    this.generationControl.updateDisplaysOnly();
                    
                    KLiteModular.log('generation', `Updated ${sliderType} to ${value}`);
                },
                
                // Update only the displays without touching sliders - EXACT COPY
                updateDisplaysOnly: () => {
                    const settings = {
                        temperature: window.localsettings.temperature || 0.7,
                        top_p: window.localsettings.top_p || 0.9,
                        top_k: window.localsettings.top_k || 40,
                        min_p: window.localsettings.min_p || 0.05,
                        rep_pen: window.localsettings.rep_pen || 1.1,
                        rep_pen_range: window.localsettings.rep_pen_range || 1024,
                        rep_pen_slope: window.localsettings.rep_pen_slope || 0.7,
                        max_length: window.localsettings.max_length || 512
                    };
                    
                    // Update parameter displays only
                    document.querySelectorAll('[id$="-temp-val"]').forEach(el => {
                        if (el) el.textContent = settings.temperature.toFixed(2);
                    });
                    document.querySelectorAll('[id$="-topp-val"]').forEach(el => {
                        if (el) el.textContent = settings.top_p.toFixed(2);
                    });
                    document.querySelectorAll('[id$="-topk-val"]').forEach(el => {
                        if (el) el.textContent = settings.top_k.toString();
                    });
                    document.querySelectorAll('[id$="-minp-val"]').forEach(el => {
                        if (el) el.textContent = settings.min_p.toFixed(3);
                    });
                    document.querySelectorAll('[id$="-repen-val"]').forEach(el => {
                        if (el) el.textContent = settings.rep_pen.toFixed(2);
                    });
                    document.querySelectorAll('[id$="-max-length-value"]').forEach(el => {
                        if (el) el.textContent = settings.max_length + ' tokens';
                    });
                    
                    // Update all panel repetition range and slope displays
                    document.querySelectorAll('[id$="-rng-val"]').forEach(el => {
                        if (el) el.textContent = settings.rep_pen_range;
                    });
                    document.querySelectorAll('[id$="-slp-val"]').forEach(el => {
                        if (el) el.textContent = settings.rep_pen_slope.toFixed(1);
                    });
                },
                
                // Sync all generation control panels - EXACT COPY
                syncAllPanels: () => {
                    const currentTemp = window.localsettings?.temperature || 0.7;
                    const currentTopP = window.localsettings?.top_p || 0.9;
                    const currentTopK = window.localsettings?.top_k || 40;
                    const currentMinP = window.localsettings?.min_p || 0.05;
                    const currentRepPen = window.localsettings?.rep_pen || 1.1;
                    const currentRepPenRange = window.localsettings?.rep_pen_range || 1024;
                    const currentRepPenSlope = window.localsettings?.rep_pen_slope || 0;
                    const currentMaxLength = window.localsettings?.max_length || 512;
                    
                    // Convert to slider values using correct inverse calculations
                    const creativityValue = this.generationControl.paramToSlider.creativity(currentTemp);
                    const focusValue = this.generationControl.paramToSlider.focus(currentTopK);
                    const repetitionValue = this.generationControl.paramToSlider.repetition(currentRepPen);
                    
                    // Update sliders for all panels
                    this.generationControl.panels.forEach(panelPrefix => {
                        const creativitySlider = document.getElementById(`${panelPrefix}-creativity-slider`);
                        const focusSlider = document.getElementById(`${panelPrefix}-focus-slider`);
                        const repetitionSlider = document.getElementById(`${panelPrefix}-repetition-slider`);
                        const lengthSlider = document.getElementById(`${panelPrefix}-max-length`);
                        
                        if (creativitySlider) creativitySlider.value = creativityValue;
                        if (focusSlider) focusSlider.value = focusValue;
                        if (repetitionSlider) repetitionSlider.value = repetitionValue;
                        if (lengthSlider) lengthSlider.value = currentMaxLength;
                    });
                    
                    // Update displays
                    this.generationControl.updateDisplaysOnly();
                }
            };
            
            // Setup event handlers using delegation - EXACT COPY adapted for this panel
            document.addEventListener('input', (e) => {
                if (e.target.matches('[id$="-creativity-slider"]')) {
                    this.generationControl.updateFromSlider('creativity', parseInt(e.target.value));
                } else if (e.target.matches('[id$="-focus-slider"]')) {
                    this.generationControl.updateFromSlider('focus', parseInt(e.target.value));
                } else if (e.target.matches('[id$="-repetition-slider"]')) {
                    this.generationControl.updateFromSlider('repetition', parseInt(e.target.value));
                } else if (e.target.matches('[id$="-max-length"]')) {
                    const value = parseInt(e.target.value);
                    this.generationControl.updateFromSlider('max_length', value);
                    // Update the display for this specific slider
                    const panelPrefix = e.target.id.split('-')[0];
                    const valueElement = document.getElementById(`${panelPrefix}-max-length-value`);
                    if (valueElement) {
                        valueElement.textContent = `${value} tokens`;
                    }
                }
            });
        }
        
        render() {
            // EXACT COPY of renderGenerationControl function from ALPHA
            const currentTemp = window.localsettings?.temperature || 0.7;
            const currentTopP = window.localsettings?.top_p || 0.9;
            const currentTopK = window.localsettings?.top_k || 40;
            const currentMinP = window.localsettings?.min_p || 0.05;
            const currentRepPen = window.localsettings?.rep_pen || 1.1;
            const currentRepPenRange = window.localsettings?.rep_pen_range || 1024;
            const currentRepPenSlope = window.localsettings?.rep_pen_slope || 0;
            const currentMaxLength = window.localsettings?.max_length || 512;
            const maxContextLength = window.localsettings?.max_context_length_slide || 8192;
            
            // Convert to slider values using correct inverse calculations
            const creativityValue = this.generationControl.paramToSlider.creativity(currentTemp);
            const focusValue = this.generationControl.paramToSlider.focus(currentTopK);
            const repetitionValue = this.generationControl.paramToSlider.repetition(currentRepPen);
            
            return `
                <style>
                    .klite-slider {
                        -webkit-appearance: none;
                        width: 100%;
                        height: 6px;
                        background: #333;
                        border-radius: 3px;
                        outline: none;
                        border: 1px solid #444;
                    }
                    
                    .klite-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 16px;
                        height: 16px;
                        background: #4a9eff;
                        border-radius: 50%;
                        cursor: pointer;
                        border: 2px solid #fff;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    
                    .klite-slider::-webkit-slider-thumb:hover {
                        background: #3d85d9;
                        transform: scale(1.1);
                    }
                    
                    .klite-slider::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        background: #4a9eff;
                        border-radius: 50%;
                        cursor: pointer;
                        border: 2px solid #fff;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    
                    .klite-slider::-moz-range-track {
                        height: 6px;
                        background: #333;
                        border-radius: 3px;
                        border: 1px solid #444;
                    }
                </style>
                
                <div class="klite-generation-control">
                    <!-- Quick Presets -->
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 15px;">
                        <button class="klite-panel-btn" data-action="preset-precise" style="padding: 6px; font-size: 11px; background: #4a9eff;">Precise</button>
                        <button class="klite-panel-btn" data-action="preset-koboldai" style="padding: 6px; font-size: 11px; background: #4a9eff;">KoboldAI</button>
                        <button class="klite-panel-btn" data-action="preset-creative" style="padding: 6px; font-size: 11px; background: #4a9eff;">Creative</button>
                        <button class="klite-panel-btn" data-action="preset-chaotic" style="padding: 6px; font-size: 11px; background: #4a9eff;">Chaotic</button>
                    </div>
                    
                    <!-- Slider Controls with detailed parameter info -->
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Creativity</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">temp: <span id="${this.panelPrefix}-temp-val">${currentTemp.toFixed(2)}</span> | top_p: <span id="${this.panelPrefix}-topp-val">${currentTopP.toFixed(2)}</span></span>
                        </div>
                        <input type="range" id="${this.panelPrefix}-creativity-slider" class="klite-slider" 
                               min="0" max="100" value="${creativityValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Conservative</span>
                            <span style="font-size: 10px; color: #888;">Creative</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Focus</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">top_k: <span id="${this.panelPrefix}-topk-val">${currentTopK}</span> | min_p: <span id="${this.panelPrefix}-minp-val">${currentMinP.toFixed(3)}</span></span>
                        </div>
                        <input type="range" id="${this.panelPrefix}-focus-slider" class="klite-slider" 
                               min="0" max="100" value="${focusValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Broad</span>
                            <span style="font-size: 10px; color: #888;">Focused</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 12px; color: #ccc;">Repetition</span>
                            <span style="font-size: 8px; color: #999; font-family: monospace;">pen: <span id="${this.panelPrefix}-repen-val">${currentRepPen.toFixed(2)}</span> | rng: <span id="${this.panelPrefix}-rng-val">${currentRepPenRange}</span> | slp: <span id="${this.panelPrefix}-slp-val">${currentRepPenSlope.toFixed(1)}</span></span>
                        </div>
                        <input type="range" id="${this.panelPrefix}-repetition-slider" class="klite-slider" 
                               min="0" max="100" value="${repetitionValue}" style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">Repetitive</span>
                            <span style="font-size: 10px; color: #888;">Varied</span>
                        </div>
                    </div>
                    
                    <div class="klite-max-length-control" style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <label style="font-size: 12px; color: var(--text);">Response Max Length</label>
                            <span id="${this.panelPrefix}-max-length-value" style="font-size: 11px; color: var(--muted); font-family: monospace;">${currentMaxLength} tokens</span>
                        </div>
                        <input type="range" 
                               id="${this.panelPrefix}-max-length" 
                               class="klite-slider" 
                               min="256" 
                               max="${maxContextLength}" 
                               step="256" 
                               value="${currentMaxLength}" 
                               style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #888;">256</span>
                            <span style="font-size: 10px; color: #888;">${maxContextLength}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        init() {
            // Setup button event handlers for presets
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (e.target.matches('[data-action^="preset-"]')) {
                        const presetName = e.target.getAttribute('data-action').replace('preset-', '');
                        this.generationControl.applyPreset(presetName);
                        KLiteModular.renderPanels(); // Re-render to update displays
                    }
                });
            }, 100);
        }
        
        saveState() {
            return { 
                currentPreset: this.generationControl.currentPreset
            };
        }
        
        restoreState(state) {
            if (state.currentPreset) {
                this.generationControl.currentPreset = state.currentPreset;
            }
        }
    }
    
    // =============================================
    // REGISTRATION & INITIALIZATION
    // =============================================
    
    // Memory Panel - New implementation for Phase 1
    class MemoryPanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'Memory';
            this.showTemplates = false;
        }
        
        render() {
            const memory = window.current_memory || '';
            const wordCount = memory.split(/\s+/).filter(w => w.length > 0).length;
            const tokenCount = Math.ceil(memory.length / 4);
            
            return `
                <div class="klite-memory-panel">
                    <!-- Main Memory Editor -->
                    <div style="margin-bottom: 10px;">
                        <label style="font-weight: bold; color: var(--text);">Persistent Memory:</label>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">This content is always included at the start of the AI's context</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <textarea id="memory-text" class="klite-textarea" 
                                  style="width: 100%; font-family: monospace; font-size: 12px; height: 350px; resize: vertical; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; padding: 8px;"
                                  placeholder="Enter persistent memory...">${this.escapeHtml(memory)}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; margin-top: 10px; color: var(--muted);">
                        <div>
                            <span id="memory-status">Ready</span> • 
                            <span id="memory-tokens">${tokenCount} tokens</span>
                        </div>
                        <div style="text-align: right;">Auto-saved</div>
                    </div>
                </div>
            `;
        }
        
        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        updateMemory(value) {
            window.current_memory = value;
            
            // Sync with Lite UI
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory) {
                liteMemory.value = value;
                liteMemory.dispatchEvent(new Event('input'));
            }
            
            // Auto-save
            if (typeof window.autosave === 'function') {
                window.autosave();
            }
            
            KLiteModular.log('memory', 'Memory updated');
        }
        
        async init() {
            KLiteModular.log('memory', 'Memory panel initialized');
        }
        
        postRender() {
            const textarea = document.getElementById('memory-text');
            if (textarea) {
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    window.current_memory = value;
                    
                    // Sync with Lite UI
                    const liteMemory = document.getElementById('memorytext');
                    if (liteMemory) liteMemory.value = value;
                    
                    // Update statistics
                    const tokenCount = Math.ceil(value.length / 4);
                    const tokensEl = document.getElementById('memory-tokens');
                    const statusEl = document.getElementById('memory-status');
                    if (tokensEl) tokensEl.textContent = tokenCount + ' tokens';
                    if (statusEl) statusEl.textContent = '✓ Saved';
                    
                    // Save resize height
                    this.saveTextareaHeight('memory-text', textarea.style.height);
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        if (typeof window.autosave === 'function') window.autosave();
                        if (statusEl) statusEl.textContent = 'Ready';
                    }, 1000);
                });
                
                // Restore saved height
                this.restoreTextareaHeight('memory-text', textarea);
            }
        }
        
        async saveTextareaHeight(textareaId, height) {
            if (height && window.indexeddb_save) {
                await window.indexeddb_save(`klite_textarea_height_${textareaId}`, height);
            }
        }
        
        async restoreTextareaHeight(textareaId, textarea) {
            if (window.indexeddb_load) {
                const savedHeight = await window.indexeddb_load(`klite_textarea_height_${textareaId}`, '350px');
                textarea.style.height = savedHeight;
            } else {
                textarea.style.height = '350px';
            }
        }
        
        saveState() {
            return {};
        }
        
        restoreState(_state) {
            // No state to restore for simple memory panel
        }
    }
    
    // Notes Panel - Personal notes not sent to AI
    class NotesPanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'Notes';
        }
        
        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        render() {
            const notes = window.personal_notes || '';
            const tokenCount = Math.ceil(notes.length / 4);
            
            return `
                <div class="klite-notes-panel">
                    <!-- Main Notes Editor -->
                    <div style="margin-bottom: 10px;">
                        <label style="font-weight: bold; color: var(--text);">Personal Notes:</label>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Private notes saved with your story (not sent to AI)</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <textarea id="notes-text" class="klite-textarea" 
                                  style="width: 100%; font-family: monospace; font-size: 12px; height: 350px; resize: vertical; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; padding: 8px;"
                                  placeholder="Personal notes, never sent to the AI...">${this.escapeHtml(notes)}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; margin-top: 10px; color: var(--muted);">
                        <div>
                            <span id="notes-status">Ready</span> • 
                            <span id="notes-tokens">${tokenCount} tokens</span>
                        </div>
                        <div style="text-align: right;">Auto-saved</div>
                    </div>
                </div>
            `;
        }
        
        updateNotes(value) {
            window.personal_notes = value;
            
            // Auto-save using KoboldAI Lite's save system
            if (typeof window.autosave === 'function') {
                window.autosave();
            }
            
            KLiteModular.log('notes', 'Personal notes updated');
        }
        
        async init() {
            KLiteModular.log('notes', 'Notes panel initialized');
        }
        
        postRender() {
            const textarea = document.getElementById('notes-text');
            if (textarea) {
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    this.updateNotes(value);
                    
                    // Update statistics
                    const tokenCount = Math.ceil(value.length / 4);
                    const tokensEl = document.getElementById('notes-tokens');
                    const statusEl = document.getElementById('notes-status');
                    if (tokensEl) tokensEl.textContent = tokenCount + ' tokens';
                    if (statusEl) statusEl.textContent = '✓ Saved';
                    
                    // Save resize height
                    this.saveTextareaHeight('notes-text', textarea.style.height);
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        if (statusEl) statusEl.textContent = 'Ready';
                    }, 1000);
                });
                
                // Restore saved height
                this.restoreTextareaHeight('notes-text', textarea);
            }
        }
        
        async saveTextareaHeight(textareaId, height) {
            if (height && window.indexeddb_save) {
                await window.indexeddb_save(`klite_textarea_height_${textareaId}`, height);
            }
        }
        
        async restoreTextareaHeight(textareaId, textarea) {
            if (window.indexeddb_load) {
                const savedHeight = await window.indexeddb_load(`klite_textarea_height_${textareaId}`, '350px');
                textarea.style.height = savedHeight;
            } else {
                textarea.style.height = '350px';
            }
        }
        
        saveState() {
            return {};
        }
        
        restoreState(_state) {
            // No state to restore for simple notes panel
        }
    }
    
    // Author's Note Panel - Guidance text injected into AI context
    class AuthorNotePanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = "Author's Note";
        }
        
        escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        render() {
            const authorNote = window.current_anote || '';
            const tokenCount = Math.ceil(authorNote.length / 4);
            
            return `
                <div class="klite-authornote-panel">
                    <!-- Main Author's Note Editor -->
                    <div style="margin-bottom: 10px;">
                        <label style="font-weight: bold; color: var(--text);">Author's Note:</label>
                        <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Guidance text injected into AI context during generation</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <textarea id="authornote-text" class="klite-textarea" 
                                  style="width: 100%; font-family: monospace; font-size: 12px; height: 350px; resize: vertical; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; padding: 8px;"
                                  placeholder="Author's Notes for the AI...">${this.escapeHtml(authorNote)}</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; margin-top: 10px; color: var(--muted);">
                        <div>
                            <span id="authornote-status">Ready</span> • 
                            <span id="authornote-tokens">${tokenCount} tokens</span>
                        </div>
                        <div style="text-align: right;">Auto-saved</div>
                    </div>
                </div>
            `;
        }
        
        updateAuthorNote(value) {
            window.current_anote = value;
            
            // Sync with Lite UI
            const liteAuthorNote = document.getElementById('anotetext');
            if (liteAuthorNote) {
                liteAuthorNote.value = value;
                liteAuthorNote.dispatchEvent(new Event('input'));
            }
            
            // Auto-save
            if (typeof window.autosave === 'function') {
                window.autosave();
            }
            
            KLiteModular.log('authornote', 'Author note updated');
        }
        
        async init() {
            KLiteModular.log('authornote', 'Author note panel initialized');
        }
        
        postRender() {
            const textarea = document.getElementById('authornote-text');
            if (textarea) {
                let saveTimeout;
                textarea.addEventListener('input', () => {
                    const value = textarea.value;
                    this.updateAuthorNote(value);
                    
                    // Update statistics
                    const tokenCount = Math.ceil(value.length / 4);
                    const tokensEl = document.getElementById('authornote-tokens');
                    const statusEl = document.getElementById('authornote-status');
                    if (tokensEl) tokensEl.textContent = tokenCount + ' tokens';
                    if (statusEl) statusEl.textContent = '✓ Saved';
                    
                    // Save resize height
                    this.saveTextareaHeight('authornote-text', textarea.style.height);
                    
                    // Debounced save
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        if (typeof window.autosave === 'function') window.autosave();
                        if (statusEl) statusEl.textContent = 'Ready';
                    }, 1000);
                });
                
                // Restore saved height
                this.restoreTextareaHeight('authornote-text', textarea);
            }
        }
        
        async saveTextareaHeight(textareaId, height) {
            if (height && window.indexeddb_save) {
                await window.indexeddb_save(`klite_textarea_height_${textareaId}`, height);
            }
        }
        
        async restoreTextareaHeight(textareaId, textarea) {
            if (window.indexeddb_load) {
                const savedHeight = await window.indexeddb_load(`klite_textarea_height_${textareaId}`, '350px');
                textarea.style.height = savedHeight;
            } else {
                textarea.style.height = '350px';
            }
        }
        
        saveState() {
            return {};
        }
        
        restoreState(_state) {
            // No state to restore for simple author note panel
        }
    }
    
    // Auto-Regenerate Panel - Conditional regeneration with quality filters
    class AutoRegeneratePanel extends KLitePanel {
        constructor(name) {
            super(name);
            this.displayName = 'Auto-Regenerate';
            
            // Auto-regenerate state
            this.autoRegenerateState = {
                enabled: false,
                retryCount: 0,
                maxRetries: 3,
                delay: 3000,
                lastMessageHash: '',
                keywords: [],
                keywordThreshold: 2,
                keywordCaseSensitive: false
            };
            
            // Monitoring
            this.autoRegenerateInterval = null;
            this.messageObserver = null;
        }
        
        render() {
            return `
                <div class="klite-autoregen-panel">
                    <!-- Master Controls -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-bottom: 8px;">
                            <input type="checkbox" id="autoregen-enabled" ${this.autoRegenerateState.enabled ? 'checked' : ''} style="margin: 0;">
                            <span style="font-weight: bold; color: var(--text);">Enable Auto-Regenerate</span>
                        </label>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">Delay (ms):</label>
                                <input type="number" id="autoregen-delay" value="${this.autoRegenerateState.delay}" min="1000" max="10000" step="500" 
                                       style="width: 100%; padding: 6px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">Max Retries:</label>
                                <input type="number" id="autoregen-max-retries" value="${this.autoRegenerateState.maxRetries}" min="1" max="10" 
                                       style="width: 100%; padding: 6px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Trigger Conditions -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #ccc;">Trigger Conditions:</label>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                                <input type="checkbox" id="autoregen-short" checked style="margin: 0;">
                                <span style="color: #888;">Short messages (<50 chars)</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                                <input type="checkbox" id="autoregen-incomplete" checked style="margin: 0;">
                                <span style="color: #888;">Incomplete sentences</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
                                <input type="checkbox" id="autoregen-error" style="margin: 0;">
                                <span style="color: #888;">Error responses</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Advanced Keywords -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">Keyword Triggers:</label>
                        <textarea id="autoregen-keywords" placeholder="Enter keywords, one per line" 
                                  style="width: 100%; height: 80px; padding: 8px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; resize: vertical; font-size: 12px; line-height: 1.4;">${this.autoRegenerateState.keywords.join('')}</textarea>
                        
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 8px; align-items: center;">
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #ccc;">Keyword Threshold:</label>
                                <input type="number" id="autoregen-threshold" value="${this.autoRegenerateState.keywordThreshold}" min="1" max="10" 
                                       style="width: 100%; padding: 6px; background: rgba(42, 42, 42, 0.9); border: 1px solid #444; color: #e0e0e0; border-radius: 4px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; margin-top: 20px;">
                                    <input type="checkbox" id="autoregen-case-sensitive" ${this.autoRegenerateState.keywordCaseSensitive ? 'checked' : ''} style="margin: 0;">
                                    <span style="color: #888;">Case sensitive</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Status Display -->
                    <div style="margin-top: 12px; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; font-size: 11px; color: #666; text-align: center;" id="autoregen-status">
                        Auto-regenerate is disabled
                    </div>
                </div>
            `;
        }
        
        async init() {
            // Load saved settings
            const savedState = await this.loadData('autoRegenerateState');
            if (savedState) {
                this.autoRegenerateState = { ...this.autoRegenerateState, ...savedState };
            }
            
            KLiteModular.log('autoregen', 'Auto-Regenerate panel initialized');
        }
        
        postRender() {
            this.setupEventHandlers();
            this.updateStatus();
        }
        
        setupEventHandlers() {
            // Master toggle
            const enabledToggle = document.getElementById('autoregen-enabled');
            if (enabledToggle) {
                enabledToggle.addEventListener('change', (e) => {
                    this.autoRegenerateState.enabled = e.target.checked;
                    this.saveSettings();
                    
                    if (this.autoRegenerateState.enabled) {
                        this.startAutoRegenerate();
                    } else {
                        this.stopAutoRegenerate();
                    }
                    
                    this.updateStatus();
                });
            }
            
            // Delay input
            const delayInput = document.getElementById('autoregen-delay');
            if (delayInput) {
                delayInput.addEventListener('change', (e) => {
                    this.autoRegenerateState.delay = parseInt(e.target.value) || 3000;
                    this.saveSettings();
                    
                    if (this.autoRegenerateState.enabled) {
                        this.stopAutoRegenerate();
                        this.startAutoRegenerate();
                    }
                });
            }
            
            // Max retries input
            const maxRetriesInput = document.getElementById('autoregen-max-retries');
            if (maxRetriesInput) {
                maxRetriesInput.addEventListener('change', (e) => {
                    this.autoRegenerateState.maxRetries = parseInt(e.target.value) || 3;
                    this.saveSettings();
                });
            }
            
            // Keywords textarea
            const keywordsTextarea = document.getElementById('autoregen-keywords');
            if (keywordsTextarea) {
                keywordsTextarea.addEventListener('input', (e) => {
                    const keywords = e.target.value
                        .split('')
                        .map(k => k.trim())
                        .filter(k => k.length > 0);
                    this.autoRegenerateState.keywords = keywords;
                    this.saveSettings();
                    
                    KLiteModular.log('autoregen', `Updated keywords: ${keywords.length} keywords set`);
                });
            }
            
            // Keyword threshold
            const thresholdInput = document.getElementById('autoregen-threshold');
            if (thresholdInput) {
                thresholdInput.addEventListener('change', (e) => {
                    this.autoRegenerateState.keywordThreshold = parseInt(e.target.value) || 1;
                    this.saveSettings();
                });
            }
            
            // Case sensitivity
            const caseSensitiveCheckbox = document.getElementById('autoregen-case-sensitive');
            if (caseSensitiveCheckbox) {
                caseSensitiveCheckbox.addEventListener('change', (e) => {
                    this.autoRegenerateState.keywordCaseSensitive = e.target.checked;
                    this.saveSettings();
                });
            }
            
            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                this.stopAutoRegenerate();
            });
        }
        
        startAutoRegenerate() {
            KLiteModular.log('autoregen', `Starting auto-regenerate with ${this.autoRegenerateState.delay}ms delay`);
            
            // Clear any existing interval
            this.stopAutoRegenerate();
            
            // Reset retry count
            this.autoRegenerateState.retryCount = 0;
            
            // Start monitoring
            this.autoRegenerateInterval = setInterval(() => {
                this.checkAndRegenerate();
            }, this.autoRegenerateState.delay);
            
            this.updateStatus();
        }
        
        stopAutoRegenerate() {
            if (this.autoRegenerateInterval) {
                clearInterval(this.autoRegenerateInterval);
                this.autoRegenerateInterval = null;
            }
            
            this.updateStatus();
        }
        
        checkAndRegenerate() {
            // Check if we should regenerate
            if (!this.shouldRegenerate()) {
                return;
            }
            
            // Check retry limit
            if (this.autoRegenerateState.retryCount >= this.autoRegenerateState.maxRetries) {
                KLiteModular.log('autoregen', 'Max retries reached, stopping auto-regenerate');
                this.stopAutoRegenerate();
                this.autoRegenerateState.enabled = false;
                
                // Update UI
                const enabledToggle = document.getElementById('autoregen-enabled');
                if (enabledToggle) enabledToggle.checked = false;
                
                this.updateStatus('⚠️ Max retries reached', '#f0ad4e');
                this.saveSettings();
                return;
            }
            
            KLiteModular.log('autoregen', `Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);
            
            // Increment retry count
            this.autoRegenerateState.retryCount++;
            
            this.updateStatus(`🔄 Regenerating... (${this.autoRegenerateState.retryCount}/${this.autoRegenerateState.maxRetries})`, '#5bc0de');
            
            // Call KoboldAI Lite's retry function
            if (typeof window.btn_retry === 'function') {
                window.btn_retry();
            } else {
                KLiteModular.log('autoregen', 'Warning: btn_retry function not found');
            }
        }
        
        shouldRegenerate() {
            if (!this.autoRegenerateState.enabled) return false;
            
            // Get the last message
            const messages = document.querySelectorAll('.message');
            if (!messages.length) return false;
            
            const lastMessage = messages[messages.length - 1];
            const messageText = lastMessage?.textContent || '';
            
            // Check if it's a new message
            const messageHash = this.hashString(messageText);
            if (messageHash === this.autoRegenerateState.lastMessageHash) {
                return false;
            }
            this.autoRegenerateState.lastMessageHash = messageHash;
            
            // Check if it's an AI message
            const isAIMessage = lastMessage?.classList.contains('ai');
            if (!isAIMessage) return false;
            
            // Check trigger conditions
            const shortCheck = document.getElementById('autoregen-short')?.checked;
            const incompleteCheck = document.getElementById('autoregen-incomplete')?.checked;
            const errorCheck = document.getElementById('autoregen-error')?.checked;
            
            // Check short messages
            if (shortCheck && messageText.length < 50) {
                KLiteModular.log('autoregen', 'Triggering regenerate: Short message');
                return true;
            }
            
            // Check incomplete sentences
            if (incompleteCheck) {
                const endsWithPunctuation = /[.!?]\s*$/.test(messageText.trim());
                if (!endsWithPunctuation) {
                    KLiteModular.log('autoregen', 'Triggering regenerate: Incomplete sentence');
                    return true;
                }
            }
            
            // Check error responses
            if (errorCheck && (messageText.includes('Error:') || messageText.toLowerCase().includes('error'))) {
                KLiteModular.log('autoregen', 'Triggering regenerate: Error detected');
                return true;
            }
            
            // Check keyword triggers
            if (this.autoRegenerateState.keywords.length > 0) {
                const keywordMatches = this.checkKeywordTriggers(messageText);
                if (keywordMatches >= this.autoRegenerateState.keywordThreshold) {
                    KLiteModular.log('autoregen', `Triggering regenerate: ${keywordMatches} keywords matched (threshold: ${this.autoRegenerateState.keywordThreshold})`);
                    return true;
                }
            }
            
            return false;
        }
        
        checkKeywordTriggers(text) {
            const keywords = this.autoRegenerateState.keywords;
            const caseSensitive = this.autoRegenerateState.keywordCaseSensitive;
            
            let matchCount = 0;
            const checkText = caseSensitive ? text : text.toLowerCase();
            
            for (const keyword of keywords) {
                const checkKeyword = caseSensitive ? keyword : keyword.toLowerCase();
                if (checkText.includes(checkKeyword)) {
                    matchCount++;
                }
            }
            
            return matchCount;
        }
        
        hashString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash;
        }
        
        updateStatus(message = null, color = null) {
            const statusEl = document.getElementById('autoregen-status');
            if (!statusEl) return;
            
            if (message && color) {
                statusEl.textContent = message;
                statusEl.style.color = color;
                return;
            }
            
            if (this.autoRegenerateState.enabled) {
                statusEl.textContent = '✓ Auto-regenerate is active';
                statusEl.style.color = '#5cb85c';
            } else {
                statusEl.textContent = 'Auto-regenerate is disabled';
                statusEl.style.color = '#666';
            }
        }
        
        async saveSettings() {
            await this.saveData('autoRegenerateState', this.autoRegenerateState);
        }
        
        saveState() {
            return { autoRegenerateState: this.autoRegenerateState };
        }
        
        restoreState(state) {
            if (state.autoRegenerateState) {
                this.autoRegenerateState = { ...this.autoRegenerateState, ...state.autoRegenerateState };
            }
        }
        
        cleanup() {
            this.stopAutoRegenerate();
        }
    }

    // =============================================
    // AUTO SENDER PANEL
    // =============================================
    
    class AutoSenderPanel extends KLitePanel {
        constructor() {
            super('autosender');
            this.displayName = 'AUTO SENDER';
            
            // Auto-sender state
            this.autoSenderState = {
                isStarted: false,
                isPaused: false,
                currentCount: 0,
                interval: 30,
                startMessage: '',
                message: 'Continue.',
                quickMessages: ['', '', '', '', ''],
                timer: null
            };
            
            // UI elements
            this.countdownEl = null;
        }
        
        async init() {
            await this.loadSettings();
            KLiteModular.log('autosender', 'Auto-sender panel initialized');
        }
        
        render() {
            return `
                <div class="klite-panel-content">
                    <!-- Control Section -->
                    <div class="autosender-controls">
                        <div class="autosender-control-row">
                            <button id="autosender-start" class="autosender-btn autosender-btn-start">▶️ Start</button>
                            <button id="autosender-pause" class="autosender-btn autosender-btn-pause" style="display: none;">⏸️ Pause</button>
                            <button id="autosender-continue" class="autosender-btn autosender-btn-continue" style="display: none;">▶️ Continue</button>
                            <div class="autosender-countdown" id="autosender-countdown">--</div>
                        </div>
                        <div class="autosender-action-row">
                            <button id="autosender-stop" class="autosender-btn autosender-btn-stop">⏹️ Stop</button>
                            <button id="autosender-reset" class="autosender-btn autosender-btn-reset">🔄 Reset</button>
                        </div>
                    </div>
                    
                    <!-- Interval Control -->
                    <div class="autosender-interval-control">
                        <label for="autosender-interval">Interval: <span id="autosender-interval-display">30</span> seconds</label>
                        <input type="range" id="autosender-interval" min="10" max="300" value="30" class="autosender-slider">
                    </div>
                    
                    <!-- Message Configuration -->
                    <div class="autosender-messages">
                        <div class="autosender-message-group">
                            <label for="autosender-start-message">Start Message (optional):</label>
                            <textarea id="autosender-start-message" placeholder="Message to send when starting..." class="autosender-textarea"></textarea>
                        </div>
                        <div class="autosender-message-group">
                            <label for="autosender-auto-message">Auto Message:</label>
                            <textarea id="autosender-auto-message" placeholder="Continue." class="autosender-textarea"></textarea>
                        </div>
                    </div>
                    
                    <!-- Quick Messages -->
                    <div class="autosender-quick-messages">
                        <div class="autosender-quick-label">Quick Messages:</div>
                        <div class="autosender-quick-grid">
                            ${[0, 1, 2, 3, 4].map(i => `
                                <div class="autosender-quick-row">
                                    <input type="text" id="autosender-quick-${i}" placeholder="Quick message ${i + 1}" class="autosender-quick-input">
                                    <button id="autosender-quick-send-${i}" class="autosender-quick-btn">${i + 1}</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Status -->
                    <div class="autosender-status" id="autosender-status">Auto-sender is disabled</div>
                </div>
                
                <style>
                    /* Auto-Sender Panel Styles using Global CSS Variables */
                    .autosender-controls {
                        margin-bottom: var(--klite-spacing-lg);
                    }
                    
                    .autosender-control-row, .autosender-action-row {
                        display: flex;
                        align-items: center;
                        gap: var(--klite-spacing-sm);
                        margin-bottom: var(--klite-spacing-sm);
                    }
                    
                    .autosender-btn {
                        padding: var(--klite-spacing-sm) var(--klite-spacing-md);
                        border: 1px solid var(--klite-button-border);
                        border-radius: var(--klite-radius-md);
                        background: var(--klite-button-bg);
                        color: var(--klite-button-text);
                        cursor: pointer;
                        font-size: var(--klite-font-size-sm);
                        font-weight: var(--klite-font-weight-medium);
                        transition: all var(--klite-transition-normal);
                    }
                    
                    .autosender-btn:hover {
                        background: var(--klite-button-hover-bg);
                        border-color: var(--klite-button-hover-border);
                    }
                    
                    .autosender-btn-start { 
                        background: var(--klite-success-color); 
                        border-color: var(--klite-success-color);
                        color: var(--klite-text-light); 
                    }
                    .autosender-btn-start:hover { 
                        background: var(--klite-success-hover);
                        border-color: var(--klite-success-hover);
                    }
                    
                    .autosender-btn-pause { 
                        background: var(--klite-warning-color); 
                        border-color: var(--klite-warning-color);
                        color: var(--klite-text-dark); 
                    }
                    .autosender-btn-pause:hover { 
                        background: var(--klite-warning-hover);
                        border-color: var(--klite-warning-hover);
                    }
                    
                    .autosender-btn-continue { 
                        background: var(--klite-success-color); 
                        border-color: var(--klite-success-color);
                        color: var(--klite-text-light); 
                    }
                    .autosender-btn-continue:hover { 
                        background: var(--klite-success-hover);
                        border-color: var(--klite-success-hover);
                    }
                    
                    .autosender-btn-stop { 
                        background: var(--klite-danger-color); 
                        border-color: var(--klite-danger-color);
                        color: var(--klite-text-light); 
                    }
                    .autosender-btn-stop:hover { 
                        background: var(--klite-danger-hover);
                        border-color: var(--klite-danger-hover);
                    }
                    
                    .autosender-btn-reset { 
                        background: var(--klite-secondary-color); 
                        border-color: var(--klite-secondary-color);
                        color: var(--klite-text-light); 
                    }
                    .autosender-btn-reset:hover { 
                        background: var(--klite-secondary-hover);
                        border-color: var(--klite-secondary-hover);
                    }
                    
                    .autosender-countdown {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 55px;
                        height: 55px;
                        border-radius: var(--klite-radius-pill);
                        background: conic-gradient(var(--klite-progress-fill) 0deg, var(--klite-progress-bg) 0deg);
                        color: var(--klite-text-dark);
                        font-weight: var(--klite-font-weight-bold);
                        font-size: var(--klite-font-size-md);
                        margin-left: auto;
                        border: 1px solid var(--klite-border-secondary);
                    }
                    
                    .autosender-interval-control {
                        margin-bottom: var(--klite-spacing-lg);
                    }
                    
                    .autosender-interval-control label {
                        display: block;
                        margin-bottom: var(--klite-spacing-xs);
                        font-weight: var(--klite-font-weight-medium);
                        font-size: var(--klite-font-size-sm);
                        color: var(--klite-text-primary);
                    }
                    
                    .autosender-slider {
                        width: 100%;
                        margin-bottom: var(--klite-spacing-sm);
                    }
                    
                    .autosender-messages {
                        margin-bottom: var(--klite-spacing-lg);
                    }
                    
                    .autosender-message-group {
                        margin-bottom: var(--klite-spacing-sm);
                    }
                    
                    .autosender-message-group label {
                        display: block;
                        margin-bottom: var(--klite-spacing-xs);
                        font-weight: var(--klite-font-weight-medium);
                        font-size: var(--klite-font-size-sm);
                        color: var(--klite-text-primary);
                    }
                    
                    .autosender-textarea {
                        width: 100%;
                        min-height: 60px;
                        padding: var(--klite-spacing-sm);
                        border: 1px solid var(--klite-input-border);
                        border-radius: var(--klite-radius-md);
                        background: var(--klite-input-bg);
                        color: var(--klite-input-text);
                        resize: vertical;
                        font-family: var(--klite-font-family-mono);
                        font-size: var(--klite-font-size-sm);
                        transition: all var(--klite-transition-normal);
                    }
                    
                    .autosender-textarea:focus {
                        border-color: var(--klite-focus-border);
                        outline: none;
                        box-shadow: var(--klite-focus-shadow);
                    }
                    
                    .autosender-textarea::placeholder {
                        color: var(--klite-input-placeholder);
                    }
                    
                    .autosender-quick-messages {
                        margin-bottom: var(--klite-spacing-lg);
                    }
                    
                    .autosender-quick-label {
                        margin-bottom: var(--klite-spacing-sm);
                        font-weight: var(--klite-font-weight-medium);
                        font-size: var(--klite-font-size-sm);
                        color: var(--klite-text-primary);
                    }
                    
                    .autosender-quick-grid {
                        display: flex;
                        flex-direction: column;
                        gap: var(--klite-spacing-sm);
                    }
                    
                    .autosender-quick-row {
                        display: flex;
                        gap: var(--klite-spacing-sm);
                        align-items: center;
                    }
                    
                    .autosender-quick-input {
                        flex: 1;
                        padding: var(--klite-spacing-sm);
                        border: 1px solid var(--klite-input-border);
                        border-radius: var(--klite-radius-md);
                        background: var(--klite-input-bg);
                        color: var(--klite-input-text);
                        font-size: var(--klite-font-size-sm);
                        font-family: var(--klite-font-family-mono);
                        transition: all var(--klite-transition-normal);
                    }
                    
                    .autosender-quick-input:focus {
                        border-color: var(--klite-focus-border);
                        outline: none;
                        box-shadow: var(--klite-focus-shadow);
                    }
                    
                    .autosender-quick-input::placeholder {
                        color: var(--klite-input-placeholder);
                    }
                    
                    .autosender-quick-btn {
                        padding: var(--klite-spacing-sm);
                        border: 1px solid var(--klite-button-border);
                        border-radius: var(--klite-radius-md);
                        background: var(--klite-button-bg);
                        color: var(--klite-button-text);
                        cursor: pointer;
                        font-size: var(--klite-font-size-sm);
                        min-width: 32px;
                        font-weight: var(--klite-font-weight-bold);
                        transition: all var(--klite-transition-normal);
                    }
                    
                    .autosender-quick-btn:hover {
                        background: var(--klite-button-hover-bg);
                        border-color: var(--klite-button-hover-border);
                    }
                    
                    .autosender-quick-btn:active {
                        background: var(--klite-active-bg);
                    }
                    
                    .autosender-status {
                        margin-top: var(--klite-spacing-sm);
                        font-size: var(--klite-font-size-sm);
                        color: var(--klite-text-secondary);
                        text-align: center;
                        min-height: 20px;
                    }
                </style>
            `;
        }
        
        postRender() {
            // Store countdown element reference
            this.countdownEl = document.getElementById('autosender-countdown');
            
            // Control buttons
            document.getElementById('autosender-start')?.addEventListener('click', () => this.handleAutoStart());
            document.getElementById('autosender-pause')?.addEventListener('click', () => this.handleAutoPause());
            document.getElementById('autosender-continue')?.addEventListener('click', () => this.handleAutoContinue());
            document.getElementById('autosender-stop')?.addEventListener('click', () => this.handleAutoStop());
            document.getElementById('autosender-reset')?.addEventListener('click', () => this.handleAutoReset());
            
            // Interval control
            const intervalSlider = document.getElementById('autosender-interval');
            intervalSlider?.addEventListener('input', (e) => {
                this.autoSenderState.interval = parseInt(e.target.value);
                document.getElementById('autosender-interval-display').textContent = this.autoSenderState.interval;
                this.saveSettings();
            });
            
            // Message inputs
            document.getElementById('autosender-start-message')?.addEventListener('input', (e) => {
                this.autoSenderState.startMessage = e.target.value;
                this.saveSettings();
            });
            
            document.getElementById('autosender-auto-message')?.addEventListener('input', (e) => {
                this.autoSenderState.message = e.target.value;
                this.saveSettings();
            });
            
            // Quick message inputs and buttons
            for (let i = 0; i < 5; i++) {
                document.getElementById(`autosender-quick-${i}`)?.addEventListener('input', (e) => {
                    this.autoSenderState.quickMessages[i] = e.target.value;
                    this.saveSettings();
                });
                
                document.getElementById(`autosender-quick-send-${i}`)?.addEventListener('click', () => {
                    this.handleQuickSend(i);
                });
            }
            
            // Apply current settings to UI
            this.initAutoSenderUI();
            
            KLiteModular.log('autosender', 'Auto-sender panel event handlers set up');
        }
        
        handleAutoStart() {
            if (this.autoSenderState.isStarted) return;
            
            this.autoSenderState.isStarted = true;
            this.autoSenderState.isPaused = false;
            this.autoSenderState.currentCount = 0;
            
            // Send start message if provided
            if (this.autoSenderState.startMessage.trim()) {
                this.sendMessage(this.autoSenderState.startMessage);
            }
            
            // Start the timer
            this.startAutomaticTimer();
            
            // Update UI
            this.updateAutoButtons('started');
            this.updateStatus('🚀 Auto-sender started', '#28a745');
            
            KLiteModular.log('autosender', 'Auto-sender started');
        }
        
        handleAutoPause() {
            if (!this.autoSenderState.isStarted || this.autoSenderState.isPaused) return;
            
            this.autoSenderState.isPaused = true;
            
            // Clear timer
            if (this.autoSenderState.timer) {
                clearInterval(this.autoSenderState.timer);
                this.autoSenderState.timer = null;
            }
            
            // Update UI
            this.updateAutoButtons('paused');
            this.updateStatus('⏸️ Auto-sender paused', '#ffc107');
            
            KLiteModular.log('autosender', 'Auto-sender paused');
        }
        
        handleAutoContinue() {
            if (!this.autoSenderState.isStarted || !this.autoSenderState.isPaused) return;
            
            this.autoSenderState.isPaused = false;
            
            // Resume timer
            this.startAutomaticTimer();
            
            // Update UI
            this.updateAutoButtons('started');
            this.updateStatus('▶️ Auto-sender resumed', '#28a745');
            
            KLiteModular.log('autosender', 'Auto-sender resumed');
        }
        
        handleAutoStop() {
            if (!this.autoSenderState.isStarted) return;
            
            this.stopAutoSender();
            
            // Abort any ongoing generation
            if (typeof window.abort_generation === 'function') {
                window.abort_generation();
                KLiteModular.log('autosender', 'Called abort_generation');
            } else {
                KLiteModular.log('autosender', 'Warning: abort_generation function not found');
            }
            
            // Update UI
            this.updateAutoButtons('stopped');
            this.updateStatus('⏹️ Auto-sender stopped', '#dc3545');
            
            KLiteModular.log('autosender', 'Auto-sender stopped');
        }
        
        handleAutoReset() {
            this.stopAutoSender();
            
            // Update UI
            this.updateAutoButtons('reset');
            this.updateStatus('Auto-sender is disabled', '#666');
            
            KLiteModular.log('autosender', 'Auto-sender reset');
        }
        
        handleQuickSend(slot) {
            const message = this.autoSenderState.quickMessages[slot];
            if (!message || !message.trim()) return;
            
            this.sendMessage(message);
            KLiteModular.log('autosender', `Quick message ${slot + 1} sent: ${message}`);
        }
        
        startAutomaticTimer() {
            // Clear existing timer
            if (this.autoSenderState.timer) {
                clearInterval(this.autoSenderState.timer);
            }
            
            // Set current count to interval
            this.autoSenderState.currentCount = this.autoSenderState.interval;
            
            // Start countdown
            this.autoSenderState.timer = setInterval(() => {
                this.autoSenderState.currentCount--;
                this.updateCountdown();
                
                if (this.autoSenderState.currentCount <= 0) {
                    // Send the automatic message
                    this.sendMessage(this.autoSenderState.message);
                    
                    // Reset count
                    this.autoSenderState.currentCount = this.autoSenderState.interval;
                    
                    KLiteModular.log('autosender', 'Automatic message sent');
                }
            }, 1000);
        }
        
        stopAutoSender() {
            this.autoSenderState.isStarted = false;
            this.autoSenderState.isPaused = false;
            this.autoSenderState.currentCount = 0;
            
            if (this.autoSenderState.timer) {
                clearInterval(this.autoSenderState.timer);
                this.autoSenderState.timer = null;
            }
            
            this.updateCountdown();
        }
        
        updateCountdown() {
            if (!this.countdownEl) return;
            
            if (this.autoSenderState.currentCount > 0) {
                this.countdownEl.textContent = this.autoSenderState.currentCount;
                
                // Update progress circle using global CSS variables
                const progress = (this.autoSenderState.interval - this.autoSenderState.currentCount) / this.autoSenderState.interval;
                const degrees = progress * 360;
                this.countdownEl.style.background = `conic-gradient(var(--klite-progress-fill) ${degrees}deg, var(--klite-progress-bg) ${degrees}deg)`;
            } else {
                this.countdownEl.textContent = '--';
                this.countdownEl.style.background = 'conic-gradient(var(--klite-progress-fill) 0deg, var(--klite-progress-bg) 0deg)';
            }
        }
        
        updateAutoButtons(state) {
            const startBtn = document.getElementById('autosender-start');
            const pauseBtn = document.getElementById('autosender-pause');
            const continueBtn = document.getElementById('autosender-continue');
            const stopBtn = document.getElementById('autosender-stop');
            const resetBtn = document.getElementById('autosender-reset');
            
            // Hide all buttons first
            [startBtn, pauseBtn, continueBtn].forEach(btn => {
                if (btn) btn.style.display = 'none';
            });
            
            switch (state) {
                case 'started':
                    if (pauseBtn) pauseBtn.style.display = 'inline-block';
                    if (stopBtn) stopBtn.style.display = 'inline-block';
                    if (resetBtn) resetBtn.style.display = 'inline-block';
                    break;
                case 'paused':
                    if (continueBtn) continueBtn.style.display = 'inline-block';
                    if (stopBtn) stopBtn.style.display = 'inline-block';
                    if (resetBtn) resetBtn.style.display = 'inline-block';
                    break;
                case 'stopped':
                case 'reset':
                    if (startBtn) startBtn.style.display = 'inline-block';
                    if (resetBtn) resetBtn.style.display = 'inline-block';
                    break;
            }
        }
        
        sendMessage(message) {
            if (!message || !message.trim()) return;
            
            try {
                // Get the input element (KoboldAI Lite uses 'input_text')
                const inputEl = document.getElementById('input_text');
                if (!inputEl) {
                    KLiteModular.log('autosender', 'Warning: input_text element not found');
                    return;
                }
                
                // Set the message
                inputEl.value = message;
                
                // Send via KoboldAI Lite's native function
                if (typeof window.submit_generation_button === 'function') {
                    window.submit_generation_button();
                    KLiteModular.log('autosender', `Message sent via submit_generation_button: ${message}`);
                } else if (typeof window.prepare_submit_generation === 'function') {
                    window.prepare_submit_generation();
                    KLiteModular.log('autosender', `Message sent via prepare_submit_generation: ${message}`);
                } else {
                    KLiteModular.log('autosender', 'Warning: No submit function found');
                }
                
            } catch (error) {
                KLiteModular.log('autosender', `Error sending message: ${error.message}`);
            }
        }
        
        updateStatus(message = null, color = null) {
            const statusEl = document.getElementById('autosender-status');
            if (!statusEl) return;
            
            if (message && color) {
                statusEl.textContent = message;
                statusEl.style.color = color;
            } else {
                statusEl.textContent = 'Auto-sender is disabled';
                statusEl.style.color = '#666';
            }
        }
        
        initAutoSenderUI() {
            // Apply interval setting
            const intervalSlider = document.getElementById('autosender-interval');
            const intervalDisplay = document.getElementById('autosender-interval-display');
            if (intervalSlider && intervalDisplay) {
                intervalSlider.value = this.autoSenderState.interval;
                intervalDisplay.textContent = this.autoSenderState.interval;
            }
            
            // Apply message settings
            const startMessageEl = document.getElementById('autosender-start-message');
            const autoMessageEl = document.getElementById('autosender-auto-message');
            if (startMessageEl) startMessageEl.value = this.autoSenderState.startMessage;
            if (autoMessageEl) autoMessageEl.value = this.autoSenderState.message;
            
            // Apply quick message settings
            for (let i = 0; i < 5; i++) {
                const quickEl = document.getElementById(`autosender-quick-${i}`);
                if (quickEl) quickEl.value = this.autoSenderState.quickMessages[i];
            }
            
            // Set initial button state
            this.updateAutoButtons('reset');
            this.updateCountdown();
        }
        
        async saveSettings() {
            await this.saveData('autoSenderState', this.autoSenderState);
        }
        
        async loadSettings() {
            const saved = await this.loadData('autoSenderState');
            if (saved) {
                this.autoSenderState = { ...this.autoSenderState, ...saved };
                // Don't restore timer state - always start fresh
                this.autoSenderState.timer = null;
                this.autoSenderState.isStarted = false;
                this.autoSenderState.isPaused = false;
                this.autoSenderState.currentCount = 0;
            }
        }
        
        saveState() {
            // Save UI state but not timer state
            const state = { ...this.autoSenderState };
            state.timer = null;
            state.isStarted = false;
            state.isPaused = false;
            state.currentCount = 0;
            return { autoSenderState: state };
        }
        
        restoreState(state) {
            if (state.autoSenderState) {
                this.autoSenderState = { ...this.autoSenderState, ...state.autoSenderState };
                // Don't restore timer state - always start fresh
                this.autoSenderState.timer = null;
                this.autoSenderState.isStarted = false;
                this.autoSenderState.isPaused = false;
                this.autoSenderState.currentCount = 0;
            }
        }
        
        cleanup() {
            this.stopAutoSender();
        }
    }

    // Smart Memory Writer Panel - AI-powered memory generation with context analysis
    class SmartMemoryWriterPanel extends KLitePanel {
        constructor() {
            super('smartmemory');
            this.displayName = 'Smart Memory Writer';
            
            // Generation state management
            this.memoryGenerationState = {
                isGenerating: false,
                timeoutId: null,
                countdownId: null,
                originalHandler: null,
                originalInputValue: '',
                startTime: null,
                maxDuration: 120000 // 120 seconds
            };
            
            // Settings
            this.settings = {
                contextSize: 'recent10',
                memoryType: 'summary'
            };
        }
        
        render() {
            return `
                <div class="klite-smartmemory-panel">
                    <!-- Context Selection -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--klite-text-color);">Context Size:</label>
                        <select id="smartmemory-context-size" style="width: 100%; padding: 6px; background: var(--klite-input-bg); border: 1px solid var(--klite-border-color); color: var(--klite-text-color); border-radius: 4px; font-size: 12px;">
                            <option value="recent10" ${this.settings.contextSize === 'recent10' ? 'selected' : ''}>Recent Messages (10)</option>
                            <option value="recent3" ${this.settings.contextSize === 'recent3' ? 'selected' : ''}>Most Recent (3)</option>
                            <option value="last50" ${this.settings.contextSize === 'last50' ? 'selected' : ''}>Last 50 Messages</option>
                            <option value="entire" ${this.settings.contextSize === 'entire' ? 'selected' : ''}>Entire Story</option>
                        </select>
                    </div>
                    
                    <!-- Memory Type Selection -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--klite-text-color);">Memory Type:</label>
                        <select id="smartmemory-type" style="width: 100%; padding: 6px; background: var(--klite-input-bg); border: 1px solid var(--klite-border-color); color: var(--klite-text-color); border-radius: 4px; font-size: 12px;">
                            <option value="summary" ${this.settings.memoryType === 'summary' ? 'selected' : ''}>Summary</option>
                            <option value="keywords" ${this.settings.memoryType === 'keywords' ? 'selected' : ''}>Keywords</option>
                            <option value="outline" ${this.settings.memoryType === 'outline' ? 'selected' : ''}>Outline</option>
                        </select>
                    </div>
                    
                    <!-- Generation Control -->
                    <div style="margin-bottom: 12px;">
                        <button id="smartmemory-generate" class="klite-panel-btn" style="width: 100%; padding: 8px; background: var(--klite-primary-color); color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            🧠 Generate Memory
                        </button>
                    </div>
                    
                    <!-- Output Area -->
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--klite-text-color);">Generated Memory:</label>
                        <textarea id="smartmemory-output" class="klite-textarea" 
                                  style="width: 100%; height: 200px; padding: 8px; background: var(--klite-input-bg); border: 1px solid var(--klite-border-color); color: var(--klite-text-color); border-radius: 4px; font-size: 12px; font-family: monospace; resize: vertical;"
                                  placeholder="Generated memory will appear here..."></textarea>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="smartmemory-apply" class="klite-panel-btn" style="padding: 8px; background: var(--klite-success-color); color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            ✓ Apply
                        </button>
                        <button id="smartmemory-append" class="klite-panel-btn" style="padding: 8px; background: var(--klite-secondary-color); color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                            ➕ Append
                        </button>
                    </div>
                </div>
            `;
        }
        
        async generateMemory() {
            KLiteModular.log('smartmemory', 'Generate memory requested');
            
            // Check if already generating
            if (this.memoryGenerationState.isGenerating) {
                KLiteModular.log('smartmemory', 'Already generating, ignoring request');
                return;
            }
            
            // Get settings
            const contextSize = document.getElementById('smartmemory-context-size')?.value || 'recent10';
            const memoryType = document.getElementById('smartmemory-type')?.value || 'summary';
            
            // Save settings
            this.settings.contextSize = contextSize;
            this.settings.memoryType = memoryType;
            await this.saveSettings();
            
            // Extract context
            const contextText = this.extractContext(contextSize);
            if (!contextText || contextText.trim().length === 0) {
                this.updateOutput('No story content available for analysis.');
                return;
            }
            
            // Build prompt
            const prompt = this.buildPrompt(memoryType, contextText);
            
            // Start generation
            this.startSmartMemoryGeneration(prompt);
        }
        
        extractContext(contextSize) {
            // Use KoboldAI Lite's own chat parsing logic
            if (!window.gametext_arr || window.gametext_arr.length === 0) {
                return '';
            }
            
            try {
                // Get the full conversation text using Lite's method
                const fullText = window.concat_gametext ? window.concat_gametext() : window.gametext_arr.join('');
                
                // Use Lite's chat parsing function to get structured messages
                const messages = window.repack_chat_history ? window.repack_chat_history(fullText) : this.parseMessagesManual(fullText);
                
                if (!messages || messages.length === 0) {
                    return '';
                }
                
                // Select messages based on context size
                let selectedMessages = [];
                switch(contextSize) {
                    case 'entire':
                        selectedMessages = messages;
                        break;
                    case 'last50':
                        selectedMessages = messages.slice(-50);
                        break;
                    case 'recent10':
                        selectedMessages = messages.slice(-10);
                        break;
                    case 'recent3':
                        selectedMessages = messages.slice(-3);
                        break;
                    default:
                        selectedMessages = messages.slice(-10);
                }
                
                // Convert to readable text
                return selectedMessages.map(msg => {
                    const isUser = msg.myturn || false;
                    const speaker = isUser ? 'You' : (msg.name || 'AI');
                    const content = msg.msg || '';
                    return `${speaker}: ${content}`;
                }).join('');
                
            } catch (error) {
                KLiteModular.log('smartmemory', `Error extracting context: ${error.message}`);
                return '';
            }
        }
        
        // Manual parsing fallback if Lite functions aren't available
        parseMessagesManual(fullText) {
            const messages = [];
            const lines = fullText.split('');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Skip empty lines
                if (!line) continue;
                
                // Check for chat format: "Username: message"
                const chatMatch = line.match(/^([^:]+):\s*(.+)$/);
                if (chatMatch) {
                    const [, name, content] = chatMatch;
                    const userName = window.localsettings?.chatname || 'You';
                    const isUser = name.trim() === userName;
                    
                    messages.push({
                        name: name.trim(),
                        msg: content.trim(),
                        myturn: isUser,
                        unlabelled: false
                    });
                } else if (line.length > 0) {
                    // For non-chat modes, treat as unlabelled content
                    messages.push({
                        name: '',
                        msg: line,
                        myturn: false,
                        unlabelled: true
                    });
                }
            }
            
            return messages;
        }
        
        buildPrompt(memoryType, contextText) {
            const prompts = {
                summary: `[SYSTEM: Summarize the following story content into a concise memory. Include key characters, events, and important details. Format as a brief paragraph.]

Story content:
${contextText}

Memory summary:`,
                
                keywords: `[SYSTEM: Extract the most important keywords, names, places, and concepts from the following story. List them in categories.]

Story content:
${contextText}

Keywords:`,
                
                outline: `[SYSTEM: Create a bullet-point outline of the main events and key information from the following story.]

Story content:
${contextText}

Outline:`
            };
            
            return prompts[memoryType] || prompts.summary;
        }
        
        startSmartMemoryGeneration(prompt) {
            KLiteModular.log('smartmemory', 'Starting memory generation');
            
            // Set generating state
            this.memoryGenerationState.isGenerating = true;
            this.memoryGenerationState.startTime = Date.now();
            this.updateGenerateButton(true);
            
            // Store original input value
            const inputEl = document.getElementById('input_text');
            if (inputEl) {
                this.memoryGenerationState.originalInputValue = inputEl.value;
            }
            
            // Setup timeout
            this.memoryGenerationState.timeoutId = setTimeout(() => {
                this.abortMemoryGeneration('timeout');
            }, this.memoryGenerationState.maxDuration);
            
            // Start countdown
            this.startCountdown();
            
            // Hook response handler
            this.setupResponseInterception();
            
            // Send the prompt
            this.sendPromptToAI(prompt);
        }
        
        setupResponseInterception() {
            // Store original handler
            this.memoryGenerationState.originalHandler = window.handle_incoming_text;
            
            // Setup interception
            window.handle_incoming_text = (text) => {
                if (this.memoryGenerationState.isGenerating) {
                    KLiteModular.log('smartmemory', 'Intercepted AI response for memory generation');
                    this.captureMemoryGeneration(text);
                } else {
                    // Not our generation, pass through
                    if (this.memoryGenerationState.originalHandler) {
                        this.memoryGenerationState.originalHandler(text);
                    }
                }
            };
        }
        
        captureMemoryGeneration(responseText) {
            KLiteModular.log('smartmemory', 'Processing memory generation response');
            
            // Clean up the response
            let cleanedResponse = responseText.trim();
            
            // Remove common AI prefixes/suffixes
            cleanedResponse = cleanedResponse.replace(/^(Memory summary:|Keywords:|Outline:)\s*/i, '');
            cleanedResponse = cleanedResponse.replace(/\[SYSTEM:.*?\]/g, '');
            cleanedResponse = cleanedResponse.trim();
            
            // Display result
            this.updateOutput(cleanedResponse);
            
            // Complete generation
            this.cleanupMemoryGeneration(true);
            
            KLiteModular.log('smartmemory', 'Memory generation completed successfully');
        }
        
        sendPromptToAI(prompt) {
            try {
                const inputEl = document.getElementById('input_text');
                if (!inputEl) {
                    throw new Error('Input element not found');
                }
                
                // Set the prompt
                inputEl.value = prompt;
                
                // Send via KoboldAI Lite
                if (typeof window.submit_generation_button === 'function') {
                    window.submit_generation_button();
                    KLiteModular.log('smartmemory', 'Memory generation prompt sent to AI');
                } else {
                    throw new Error('submit_generation_button not available');
                }
                
            } catch (error) {
                KLiteModular.log('smartmemory', `Error sending prompt: ${error.message}`);
                this.abortMemoryGeneration('error');
            }
        }
        
        startCountdown() {
            let timeLeft = this.memoryGenerationState.maxDuration;
            
            this.memoryGenerationState.countdownId = setInterval(() => {
                timeLeft -= 1000;
                const secondsLeft = Math.floor(timeLeft / 1000);
                
                if (secondsLeft <= 0) {
                    this.updateOutput('Generation timeout...');
                    this.abortMemoryGeneration('timeout');
                } else {
                    this.updateOutput(`Generating memory... ${secondsLeft}s remaining`);
                }
            }, 1000);
        }
        
        abortMemoryGeneration(reason) {
            let message = 'Generation cancelled.';
            switch(reason) {
                case 'timeout':
                    message = 'Generation timed out after 120 seconds. Please try again.';
                    break;
                case 'error':
                    message = 'Generation failed due to an error. Please try again.';
                    break;
                case 'user':
                    message = 'Generation cancelled by user.';
                    break;
            }
            
            this.updateOutput(message);
            this.cleanupMemoryGeneration(false);
            
            KLiteModular.log('smartmemory', `Memory generation aborted: ${reason}`);
        }
        
        cleanupMemoryGeneration(success = false) {
            // Clear timers
            if (this.memoryGenerationState.timeoutId) {
                clearTimeout(this.memoryGenerationState.timeoutId);
                this.memoryGenerationState.timeoutId = null;
            }
            
            if (this.memoryGenerationState.countdownId) {
                clearInterval(this.memoryGenerationState.countdownId);
                this.memoryGenerationState.countdownId = null;
            }
            
            // Restore original handler
            if (this.memoryGenerationState.originalHandler) {
                window.handle_incoming_text = this.memoryGenerationState.originalHandler;
                this.memoryGenerationState.originalHandler = null;
            }
            
            // Restore input field
            const inputEl = document.getElementById('input_text');
            if (inputEl && this.memoryGenerationState.originalInputValue !== undefined) {
                inputEl.value = this.memoryGenerationState.originalInputValue;
            }
            
            // Remove generation message from chat if it appeared
            if (success && window.gametext_arr) {
                // Remove the last message if it's our generation
                const lastMessage = window.gametext_arr[window.gametext_arr.length - 1];
                if (lastMessage && !lastMessage.is_user_message) {
                    window.gametext_arr.pop();
                }
            }
            
            // Reset state
            this.memoryGenerationState.isGenerating = false;
            this.memoryGenerationState.originalInputValue = '';
            this.updateGenerateButton(false);
            
            KLiteModular.log('smartmemory', 'Memory generation cleanup completed');
        }
        
        applyMemory(append = false) {
            const outputArea = document.getElementById('smartmemory-output');
            if (!outputArea) return;
            
            const generatedMemory = outputArea.value.trim();
            if (!generatedMemory) {
                alert('No memory to apply');
                return;
            }
            
            try {
                if (append) {
                    // Append to existing memory
                    const currentMemory = window.current_memory || '';
                    window.current_memory = currentMemory ? 
                        currentMemory + '' + generatedMemory : 
                        generatedMemory;
                    
                    this.syncMemoryWithLite();
                    this.saveAndNotify('Memory appended successfully');
                    
                } else {
                    // Replace mode - confirm if existing memory exists
                    if (window.current_memory && window.current_memory.trim()) {
                        if (!confirm('This will replace your existing memory. Continue?')) {
                            return;
                        }
                    }
                    
                    window.current_memory = generatedMemory;
                    this.syncMemoryWithLite();
                    this.saveAndNotify('Memory replaced successfully');
                }
                
            } catch (error) {
                KLiteModular.log('smartmemory', `Error applying memory: ${error.message}`);
                alert('Failed to apply memory');
            }
        }
        
        syncMemoryWithLite() {
            // Update Lite's memory field
            const memoryField = document.getElementById('memorytext');
            if (memoryField) {
                memoryField.value = window.current_memory;
                memoryField.dispatchEvent(new Event('input'));
            }
            
            // Update Memory panel if active
            const memoryPanel = document.getElementById('memory-text');
            if (memoryPanel) {
                memoryPanel.value = window.current_memory;
                
                // Update token count
                const tokenCount = Math.ceil(window.current_memory.length / 4);
                const tokensEl = document.getElementById('memory-tokens');
                if (tokensEl) tokensEl.textContent = tokenCount + ' tokens';
            }
        }
        
        saveAndNotify(message) {
            // Auto-save
            if (typeof window.autosave === 'function') {
                window.autosave();
            }
            
            // Show notification
            alert(message);
            
            KLiteModular.log('smartmemory', message);
        }
        
        updateOutput(text) {
            const outputArea = document.getElementById('smartmemory-output');
            if (outputArea) {
                outputArea.value = text;
            }
        }
        
        updateGenerateButton(generating) {
            const button = document.getElementById('smartmemory-generate');
            if (button) {
                if (generating) {
                    button.textContent = '⏳ Generating...';
                    button.disabled = true;
                    button.style.background = '#666';
                } else {
                    button.textContent = '🧠 Generate Memory';
                    button.disabled = false;
                    button.style.background = 'var(--klite-primary-color)';
                }
            }
        }
        
        async saveSettings() {
            await this.saveData('settings', this.settings);
        }
        
        async loadSettings() {
            const saved = await this.loadData('settings');
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        }
        
        async init() {
            await this.loadSettings();
            KLiteModular.log('smartmemory', 'Smart Memory Writer panel initialized');
        }
        
        postRender() {
            // Generate button
            const generateBtn = document.getElementById('smartmemory-generate');
            if (generateBtn) {
                generateBtn.addEventListener('click', () => this.generateMemory());
            }
            
            // Apply button
            const applyBtn = document.getElementById('smartmemory-apply');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => this.applyMemory(false));
            }
            
            // Append button
            const appendBtn = document.getElementById('smartmemory-append');
            if (appendBtn) {
                appendBtn.addEventListener('click', () => this.applyMemory(true));
            }
            
            // Settings change handlers
            const contextSelect = document.getElementById('smartmemory-context-size');
            if (contextSelect) {
                contextSelect.addEventListener('change', async (e) => {
                    this.settings.contextSize = e.target.value;
                    await this.saveSettings();
                });
            }
            
            const typeSelect = document.getElementById('smartmemory-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', async (e) => {
                    this.settings.memoryType = e.target.value;
                    await this.saveSettings();
                });
            }
            
            KLiteModular.log('smartmemory', 'Smart Memory Writer event handlers set up');
        }
        
        saveState() {
            return {
                settings: this.settings
            };
        }
        
        restoreState(state) {
            if (state.settings) {
                this.settings = { ...this.settings, ...state.settings };
            }
        }
        
        cleanup() {
            // Clean up any ongoing generation
            if (this.memoryGenerationState.isGenerating) {
                this.abortMemoryGeneration('cleanup');
            }
        }
    }

    // Auto-Save Panel Class
    class AutoSavePanel extends KLitePanel {
        constructor() {
            super('autosave');
            this.displayName = 'Auto-Save';
            this.slotLabels = [];
            this.saveInProgress = false;
            this.statusMessage = '';
            this.settings = {
                lastUsedSlot: 0
            };
        }

        async init() {
            await this.loadSettings();
            await this.refreshSlotLabels();
            KLiteModular.log('autosave', 'Auto-Save panel initialized');
        }

        async saveSettings() {
            await this.saveData('settings', this.settings);
        }

        async loadSettings() {
            const saved = await this.loadData('settings');
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        }

        render() {
            return `
                <div class="klite-autosave-panel">
                    <!-- Auto-Save Toggle -->
                    <div class="control-group">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="autosave-toggle" style="margin: 0;">
                            <span>Auto-Save Session</span>
                        </label>
                    </div>
                    
                    <!-- Status Display -->
                    <div class="control-group">
                        <div id="autosave-status" class="status-message"></div>
                    </div>
                    
                    <!-- Quick Save Button -->
                    <div class="control-group">
                        <button id="autosave-quick" class="autosave-quick-button">
                            <span class="autosave-quick-icon">💾</span>
                            <span class="autosave-quick-text">Quick Save</span>
                        </button>
                    </div>
                    
                    <!-- Slot Management -->
                    <div class="control-group">
                        <label style="margin-bottom: 8px; display: block; font-weight: bold;">Save Slots:</label>
                        <div id="autosave-slots" class="slot-grid">
                            <!-- Slots will be populated dynamically -->
                        </div>
                    </div>
                </div>
                
                <style>
                    .klite-autosave-panel {
                        padding: 10px;
                        color: var(--color-text);
                    }
                    
                    .klite-autosave-panel .control-group {
                        margin-bottom: 12px;
                    }
                    
                    .klite-autosave-panel label {
                        color: var(--color-text);
                        font-size: 12px;
                    }
                    
                    .autosave-quick-button {
                        width: 100%;
                        background: #4a9eff;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    }
                    
                    .autosave-quick-button:hover {
                        background: #3d85d9;
                    }
                    
                    .autosave-quick-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    
                    .autosave-quick-icon {
                        font-size: 14px;
                    }
                    
                    .autosave-quick-text {
                        font-size: 14px;
                        font-weight: 500;
                    }
                    
                    .slot-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        max-height: 400px;
                        overflow-y: auto;
                    }
                    
                    .save-slot {
                        border: 2px solid #666;
                        border-radius: 6px;
                        padding: 8px;
                        background: var(--color-bg-light);
                        font-size: 11px;
                    }
                    
                    .save-slot.empty {
                        border-color: #444;
                        opacity: 0.7;
                    }
                    
                    .save-slot.occupied {
                        border-color: #4a9eff;
                        background: var(--color-bg-accent);
                    }
                    
                    .slot-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 4px;
                    }
                    
                    .slot-number {
                        font-weight: bold;
                        color: var(--color-accent);
                    }
                    
                    .slot-label {
                        font-size: 10px;
                        color: var(--color-text-secondary);
                        margin-bottom: 4px;
                        min-height: 12px;
                        word-wrap: break-word;
                    }
                    
                    .slot-label-multiline {
                        font-size: 9px;
                        color: var(--color-text-secondary);
                        margin-bottom: 4px;
                        min-height: 36px;
                        line-height: 1.2;
                    }
                    
                    .slot-empty {
                        color: var(--color-text-secondary);
                        font-style: italic;
                        text-align: center;
                        padding: 8px 0;
                    }
                    
                    .slot-type {
                        font-weight: bold;
                        color: var(--color-text);
                        margin-bottom: 2px;
                    }
                    
                    .slot-date {
                        color: var(--color-text-secondary);
                        margin-bottom: 1px;
                    }
                    
                    .slot-time {
                        color: var(--color-accent);
                        font-weight: bold;
                    }
                    
                    .slot-actions {
                        display: flex;
                        gap: 2px;
                        justify-content: space-between;
                    }
                    
                    .slot-button {
                        padding: 2px 4px;
                        border: 1px solid var(--color-border);
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 10px;
                        background: var(--color-bg);
                        color: var(--color-text);
                        flex: 1;
                    }
                    
                    .slot-button:hover:not(:disabled) {
                        background: var(--color-accent);
                        color: var(--color-bg);
                    }
                    
                    .slot-button:disabled {
                        opacity: 0.3;
                        cursor: not-allowed;
                    }
                    
                    .slot-button.save-btn {
                        border-color: var(--color-success);
                    }
                    
                    .slot-button.load-btn {
                        border-color: var(--color-info);
                    }
                    
                    .slot-button.delete-btn {
                        border-color: var(--color-error);
                    }
                    
                    .status-message {
                        font-size: 11px;
                        padding: 4px 8px;
                        border-radius: 4px;
                        margin-bottom: 8px;
                        min-height: 20px;
                        transition: all 0.3s;
                    }
                    
                    .status-message.error {
                        background: var(--color-error-bg);
                        color: var(--color-error);
                        border: 1px solid var(--color-error);
                    }
                    
                    .status-message.success {
                        background: var(--color-success-bg);
                        color: var(--color-success);
                        border: 1px solid var(--color-success);
                    }
                    
                    .status-message.info {
                        background: var(--color-info-bg);
                        color: var(--color-info);
                        border: 1px solid var(--color-info);
                    }
                    
                    .status-message:empty {
                        display: none;
                    }
                </style>
            `;
        }

        async postRender() {
            // Setup auto-save toggle
            this.updateAutoSaveToggle();
            
            // Setup quick save button
            const quickSaveBtn = document.getElementById('autosave-quick');
            if (quickSaveBtn) {
                quickSaveBtn.addEventListener('click', () => this.quickSave());
            }
            
            // Render slots
            await this.renderSlots();
            
            KLiteModular.log('autosave', 'Auto-Save panel event handlers set up');
        }

        async refreshSlotLabels() {
            try {
                const slotPromises = [];
                for (let i = 0; i < 10; i++) {
                    slotPromises.push(window.indexeddb_load(`slot_${i}_meta`, ''));
                }
                this.slotLabels = await Promise.all(slotPromises);
                KLiteModular.log('autosave', 'Slot labels refreshed:', this.slotLabels.map((label, i) => `Slot ${i + 1}: "${label}"`));
            } catch (error) {
                KLiteModular.log('autosave', 'Error refreshing slot labels:', error);
                this.showStatus('Failed to load slot information', true);
            }
        }

        async renderSlots() {
            const slotsContainer = document.getElementById('autosave-slots');
            if (!slotsContainer) return;
            
            await this.refreshSlotLabels();
            
            let slotsHTML = '';
            for (let i = 0; i < 10; i++) {
                slotsHTML += this.generateSlotHTML(i, this.slotLabels[i]);
            }
            slotsContainer.innerHTML = slotsHTML;
        }

        generateSlotHTML(slotIndex, label) {
            const slotNum = slotIndex + 1;
            const isEmpty = !label || label.trim() === '';
            
            // Parse the label to extract different parts for 3-row display
            let displayParts = { type: '', slot: '', date: '', time: '' };
            if (!isEmpty) {
                // Expected format: "Quicksave Slot1 2025-01-18-143025"
                const parts = label.split(' ');
                if (parts.length >= 3) {
                    displayParts.type = parts[0] || '';
                    displayParts.slot = parts[1] || '';
                    const datetime = parts[2] || '';
                    
                    // Split datetime into date and time
                    if (datetime.includes('-')) {
                        const dtParts = datetime.split('-');
                        if (dtParts.length >= 4) {
                            displayParts.date = `${dtParts[0]}-${dtParts[1]}-${dtParts[2]}`;
                            displayParts.time = `${dtParts[3].substring(0,2)}:${dtParts[3].substring(2,4)}:${dtParts[3].substring(4,6)}`;
                        }
                    }
                } else {
                    // Fallback for non-quicksave labels
                    displayParts.type = label.length > 25 ? label.substring(0, 25) + '...' : label;
                }
            }
            
            return `
                <div class="save-slot ${isEmpty ? 'empty' : 'occupied'}">
                    <div class="slot-header">
                        <span class="slot-number">Slot ${slotNum}</span>
                    </div>
                    <div class="slot-label-multiline">
                        ${isEmpty ? '<div class="slot-empty">[ Empty ]</div>' : `
                            <div class="slot-type">${displayParts.type} ${displayParts.slot}</div>
                            <div class="slot-date">${displayParts.date}</div>
                            <div class="slot-time">${displayParts.time}</div>
                        `}
                    </div>
                    <div class="slot-actions">
                        <button onclick="KLiteModular.activePanels.get('autosave').quickSave(${slotIndex})" 
                                class="slot-button save-btn" title="Save to this slot">💾</button>
                        <button onclick="KLiteModular.activePanels.get('autosave').loadSlot(${slotIndex})" 
                                class="slot-button load-btn" ${isEmpty ? 'disabled' : ''} title="Load from this slot">📂</button>
                        <button onclick="KLiteModular.activePanels.get('autosave').deleteSlot(${slotIndex})" 
                                class="slot-button delete-btn" ${isEmpty ? 'disabled' : ''} title="Delete this slot">🗑️</button>
                    </div>
                </div>
            `;
        }

        updateAutoSaveToggle() {
            const checkbox = document.getElementById('autosave-toggle');
            if (!checkbox) return;
            
            const currentState = window.localsettings?.persist_session || false;
            checkbox.checked = currentState;
            
            checkbox.addEventListener('change', async () => {
                try {
                    if (!window.localsettings) {
                        window.localsettings = {};
                    }
                    window.localsettings.persist_session = checkbox.checked;
                    
                    // Use Lite's autosave function to save the setting
                    if (window.autosave) {
                        await window.autosave();
                    }
                    
                    this.showStatus(
                        `Auto-save ${checkbox.checked ? 'enabled' : 'disabled'}`, 
                        false
                    );
                } catch (error) {
                    this.showStatus(`Failed to update auto-save setting: ${error.message}`, true);
                    // Revert checkbox state
                    checkbox.checked = !checkbox.checked;
                }
            });
        }

        async quickSave(slotIndex = null) {
            if (this.saveInProgress) {
                this.showStatus('Save already in progress', true);
                return;
            }
            
            try {
                this.saveInProgress = true;
                
                // If no slot specified, find best slot automatically
                if (slotIndex === null) {
                    slotIndex = this.findBestSlot();
                }
                
                this.showStatus('Saving...', false);
                
                // Check if slot is occupied
                const currentLabel = this.slotLabels[slotIndex];
                const newLabel = this.generateQuickSaveName(slotIndex);
                const isEmpty = !currentLabel || currentLabel.trim() === '';
                
                // For occupied slots, show confirmation dialog
                if (!isEmpty) {
                    let confirmMessage;
                    
                    // Check if this is the oldest slot (chosen automatically)
                    if (slotIndex === this.findOldestSlot() && this.findBestSlot() === this.findOldestSlot()) {
                        confirmMessage = `All slots are full. Slot ${slotIndex + 1} contains the oldest save.

Do you want to replace "${currentLabel}" with "${newLabel}"?

This will override the existing save!`;
                    } else {
                        confirmMessage = `Slot ${slotIndex + 1} is used. Do you want to replace "${currentLabel}" with "${newLabel}"?

This will override the existing save!`;
                    }
                    
                    const confirmed = confirm(confirmMessage);
                    if (!confirmed) {
                        this.showStatus('Save cancelled', false);
                        return;
                    }
                }
                
                // Use Lite's save function with silent mode (showcontainer = false)
                if (window.save_to_slot) {
                    await window.save_to_slot(slotIndex, true, false);
                } else {
                    throw new Error('KoboldAI Lite save function not available');
                }
                
                // Save the custom label after the save is complete
                await this.safeIndexedDBSave(`slot_${slotIndex}_meta`, newLabel);
                
                // Update local cache
                this.slotLabels[slotIndex] = newLabel;
                this.settings.lastUsedSlot = slotIndex;
                await this.saveSettings();
                
                this.showStatus(`Quicksave saved successfully as "${newLabel}" in Slot ${slotIndex + 1}`, false);
                
                // Wait a bit for IndexedDB operations to complete, then refresh
                setTimeout(async () => {
                    await this.renderSlots();
                }, 100);
                
            } catch (error) {
                this.showStatus(`Save failed: ${error.message}`, true);
                KLiteModular.log('autosave', 'Save error:', error);
            } finally {
                this.saveInProgress = false;
            }
        }

        async loadSlot(slotIndex) {
            try {
                this.showStatus(`Loading Slot ${slotIndex + 1}...`, false);
                
                // Use Lite's load function directly
                if (window.load_from_slot) {
                    await window.load_from_slot(slotIndex, true, false);
                } else {
                    throw new Error('KoboldAI Lite load function not available');
                }
                
                const slotLabel = this.slotLabels[slotIndex] || `Slot ${slotIndex + 1}`;
                this.showStatus(`Loaded "${slotLabel}" successfully`, false);
                
                // Refresh display after load to ensure UI is up to date
                setTimeout(async () => {
                    await this.renderSlots();
                }, 100);
                
            } catch (error) {
                this.showStatus(`Load failed: ${error.message}`, true);
                KLiteModular.log('autosave', 'Load error:', error);
            }
        }

        async deleteSlot(slotIndex) {
            try {
                const slotLabel = this.slotLabels[slotIndex] || `Slot ${slotIndex + 1}`;
                
                const confirmed = confirm(
                    `Are you sure you want to delete "${slotLabel}"?

This action cannot be undone!`
                );
                
                if (!confirmed) {
                    this.showStatus('Delete cancelled', false);
                    return;
                }
                
                this.showStatus(`Deleting Slot ${slotIndex + 1}...`, false);
                
                // Delete slot data and metadata directly from IndexedDB to avoid dialogue
                await this.safeIndexedDBDelete(`slot_${slotIndex}_data`);
                await this.safeIndexedDBDelete(`slot_${slotIndex}_meta`);
                
                KLiteModular.log('autosave', `Deleted slot ${slotIndex + 1} data and metadata directly`);
                
                // Update local cache
                this.slotLabels[slotIndex] = '';
                
                this.showStatus(`Deleted "${slotLabel}" successfully`, false);
                
                // Wait a bit for IndexedDB operations to complete, then refresh
                setTimeout(async () => {
                    await this.renderSlots();
                }, 100);
                
            } catch (error) {
                this.showStatus(`Delete failed: ${error.message}`, true);
                KLiteModular.log('autosave', 'Delete error:', error);
            }
        }

        findBestSlot() {
            // First try to find an empty slot
            for (let i = 0; i < 10; i++) {
                if (!this.slotLabels[i] || this.slotLabels[i].trim() === '') {
                    return i;
                }
            }
            
            // If no empty slots, find the oldest save based on timestamp
            return this.findOldestSlot();
        }

        findOldestSlot() {
            let oldestSlot = 0;
            let oldestTimestamp = null;
            
            for (let i = 0; i < 10; i++) {
                const label = this.slotLabels[i];
                if (!label) continue;
                
                const timestamp = this.extractTimestamp(label);
                if (timestamp && (oldestTimestamp === null || timestamp < oldestTimestamp)) {
                    oldestTimestamp = timestamp;
                    oldestSlot = i;
                }
            }
            
            return oldestSlot;
        }

        extractTimestamp(label) {
            // Extract timestamp from label format: "Quicksave Slot1 2025-01-18-143025"
            if (!label || typeof label !== 'string') return null;
            
            const parts = label.split(' ');
            if (parts.length >= 3) {
                const datetime = parts[2];
                if (datetime && datetime.includes('-')) {
                    const dtParts = datetime.split('-');
                    if (dtParts.length >= 4) {
                        try {
                            const year = parseInt(dtParts[0]);
                            const month = parseInt(dtParts[1]) - 1; // Month is 0-indexed
                            const day = parseInt(dtParts[2]);
                            const timeStr = dtParts[3];
                            
                            const hours = parseInt(timeStr.substring(0, 2));
                            const minutes = parseInt(timeStr.substring(2, 4));
                            const seconds = parseInt(timeStr.substring(4, 6));
                            
                            return new Date(year, month, day, hours, minutes, seconds).getTime();
                        } catch (e) {
                            KLiteModular.log('autosave', 'Error parsing timestamp from label:', label, e);
                        }
                    }
                }
            }
            
            // Fallback: try to use creation time or return current time for comparison
            return Date.now();
        }

        generateQuickSaveName(slotIndex) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            return `Quicksave Slot${slotIndex + 1} ${year}-${month}-${day}-${hours}${minutes}${seconds}`;
        }

        async safeIndexedDBSave(key, data) {
            try {
                if (!window.indexeddb_save) {
                    throw new Error('IndexedDB save function not available');
                }
                await window.indexeddb_save(key, data);
            } catch (error) {
                this.showStatus(`IndexedDB operation failed: ${error.message}. Please check your browser settings.`, true);
                throw error;
            }
        }

        async safeIndexedDBDelete(key) {
            try {
                if (!window.indexeddb_save) {
                    throw new Error('IndexedDB delete function not available');
                }
                // In IndexedDB, we delete by setting to empty string
                await window.indexeddb_save(key, '');
                KLiteModular.log('autosave', 'Deleted IndexedDB key:', key);
            } catch (error) {
                KLiteModular.log('autosave', 'IndexedDB delete failed:', key, error);
                this.showStatus(`IndexedDB delete failed: ${error.message}. Please check your browser settings.`, true);
                throw error;
            }
        }

        showStatus(message, isError = false) {
            const statusElement = document.getElementById('autosave-status');
            if (!statusElement) return;
            
            statusElement.textContent = message;
            statusElement.className = `status-message ${isError ? 'error' : 'success'}`;
            
            // Auto-clear success messages after 5 seconds
            if (!isError && message) {
                setTimeout(() => {
                    if (statusElement.textContent === message) {
                        statusElement.textContent = '';
                        statusElement.className = 'status-message';
                    }
                }, 5000);
            }
        }

        saveState() {
            return {
                settings: this.settings,
                slotLabels: this.slotLabels
            };
        }

        restoreState(state) {
            if (state.settings) {
                this.settings = { ...this.settings, ...state.settings };
            }
            if (state.slotLabels) {
                this.slotLabels = state.slotLabels;
            }
        }

        cleanup() {
            // Clean up any ongoing save operations
            this.saveInProgress = false;
        }

        // Force a complete refresh of slot data (can be called manually for debugging)
        async forceRefresh() {
            KLiteModular.log('autosave', 'Force refreshing Auto-Save panel data...');
            await this.refreshSlotLabels();
            await this.renderSlots();
            this.showStatus('Auto-Save panel refreshed', false);
        }
    }

    // =============================================
    // QUICK DICE ROLL PANEL
    // =============================================
    class QuickDicePanel extends KLitePanel {
        constructor() {
            super('quickdice');
            this.displayName = 'Quick Dice Roll';
            this.lastRoll = null;
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Quick Dice Panel');
            // No async initialization needed for dice panel
        }

        render() {
            return `
                <div class="klite-dice-grid">
                    ${['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d => 
                        `<button class="klite-dice-btn" data-action="roll-${d}">${d}</button>`
                    ).join('')}
                </div>
                <div class="klite-row" style="margin-top: 10px;">
                    <input type="text" id="tools-custom-dice" class="klite-input" placeholder="e.g., 2d6+3" style="flex: 1; margin-right: 10px;" />
                    <button class="klite-btn klite-btn-primary" data-action="roll-custom">🎲 Roll</button>
                </div>
                <div id="tools-dice-result" class="klite-dice-result klite-mt"></div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Quick Dice Panel event handlers');
            
            // Set up dice button clicks
            const diceButtons = document.querySelectorAll('.klite-dice-btn');
            diceButtons.forEach(button => {
                const action = button.dataset.action;
                if (action) {
                    button.addEventListener('click', () => {
                        const diceType = action.replace('roll-', '');
                        this.rollDice(diceType);
                    });
                }
            });

            // Set up custom dice input
            const customButton = document.querySelector('[data-action="roll-custom"]');
            if (customButton) {
                customButton.addEventListener('click', () => {
                    const input = document.getElementById('tools-custom-dice');
                    if (input?.value) {
                        this.rollDice(input.value);
                    }
                });
            }

            // Allow Enter key in custom dice input
            const customInput = document.getElementById('tools-custom-dice');
            if (customInput) {
                customInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && customInput.value) {
                        this.rollDice(customInput.value);
                    }
                });
            }
        }

        rollDice(diceString) {
            const resultDiv = document.getElementById('tools-dice-result');
            if (!resultDiv) return;
            
            KLiteModular.log('panels', `Rolling dice: ${diceString}`);
            
            try {
                const result = this.parseDiceRoll(diceString);
                
                resultDiv.innerHTML = `
                    <div style="font-size: 24px; font-weight: bold; color: var(--klite-primary-color);">${result.total}</div>
                    <div style="margin-top: 5px; color: var(--klite-muted-text);">${result.formula} = ${result.breakdown}</div>
                `;
                
                this.lastRoll = result;
                
                // Add to chat with proper formatting
                if (window.gametext_arr) {
                    const rollText = `
🎲 Dice Roll: ${result.formula}
Result: ${result.total} (${result.breakdown})
`;
                    window.gametext_arr.push(rollText);
                    
                    // Trigger render if function exists
                    if (window.render_gametext) {
                        window.render_gametext();
                    }
                }
                
            } catch (error) {
                resultDiv.innerHTML = `<div style="color: var(--klite-error-color);">Error: ${error.message}</div>`;
                KLiteModular.error('Dice roll error:', error);
            }
        }

        parseDiceRoll(diceString) {
            const match = diceString.match(/^(\d*)d(\d+)(([+-])(\d+))?$/i);
            
            if (!match) {
                throw new Error('Invalid dice format. Use format like: d20, 2d6, 3d8+5');
            }
            
            const count = parseInt(match[1] || '1');
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[4] + match[5]) : 0;
            
            if (count > 100) throw new Error('Too many dice (max 100)');
            if (sides > 1000) throw new Error('Too many sides (max 1000)');
            if (count < 1) throw new Error('Must roll at least 1 die');
            if (sides < 2) throw new Error('Dice must have at least 2 sides');
            
            const rolls = [];
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            const sum = rolls.reduce((a, b) => a + b, 0);
            const total = sum + modifier;
            
            let breakdown = rolls.join(' + ');
            if (modifier !== 0) {
                breakdown += ` ${modifier >= 0 ? '+' : ''} ${modifier}`;
            }
            
            return { formula: diceString, rolls, modifier, sum, total, breakdown };
        }

        saveState() {
            return {
                lastRoll: this.lastRoll
            };
        }

        restoreState(state) {
            if (state.lastRoll) {
                this.lastRoll = state.lastRoll;
                // Optionally display the last roll result
                const resultDiv = document.getElementById('tools-dice-result');
                if (resultDiv && this.lastRoll) {
                    resultDiv.innerHTML = `
                        <div style="font-size: 24px; font-weight: bold; color: var(--klite-primary-color);">${this.lastRoll.total}</div>
                        <div style="margin-top: 5px; color: var(--klite-muted-text);">${this.lastRoll.formula} = ${this.lastRoll.breakdown}</div>
                        <div style="margin-top: 5px; font-size: 12px; color: var(--klite-muted-text);">Last roll</div>
                    `;
                }
            }
        }

        cleanup() {
            // Clean up any resources if needed
            this.lastRoll = null;
        }
    }

    // =============================================
    // EXPORT CONTEXT HISTORY PANEL
    // =============================================
    class ExportContextPanel extends KLitePanel {
        constructor() {
            super('exportcontext');
            this.displayName = 'Export Context';
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Export Context Panel');
            // No async initialization needed for export panel
        }

        render() {
            return `
                <div class="klite-export-buttons">
                    <button class="klite-btn klite-btn-primary" data-action="export-markdown">📝 Markdown</button>
                    <button class="klite-btn klite-btn-primary" data-action="export-json">📊 JSON</button>
                    <button class="klite-btn klite-btn-primary" data-action="export-html">🌐 HTML</button>
                </div>
                <div class="klite-export-info">
                    <small style="color: var(--klite-text-muted);">
                        Export your current story context, memory, and settings in various formats.
                    </small>
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Export Context Panel event handlers');
            
            // Set up export button clicks
            const exportButtons = document.querySelectorAll('[data-action^="export-"]');
            exportButtons.forEach(button => {
                const action = button.dataset.action;
                if (action) {
                    button.addEventListener('click', () => {
                        const format = action.replace('export-', '');
                        this.exportAs(format);
                    });
                }
            });
        }

        exportAs(format) {
            KLiteModular.log('panels', `Exporting as ${format}`);
            
            try {
                const data = this.gatherExportData();
                
                let content, filename, mimeType;
                
                switch (format) {
                    case 'markdown':
                        content = this.exportAsMarkdown(data);
                        filename = `klite-export-${this.getTimestamp()}.md`;
                        mimeType = 'text/markdown';
                        break;
                    case 'json':
                        content = JSON.stringify(data, null, 2);
                        filename = `klite-export-${this.getTimestamp()}.json`;
                        mimeType = 'application/json';
                        break;
                    case 'html':
                        content = this.exportAsHTML(data);
                        filename = `klite-export-${this.getTimestamp()}.html`;
                        mimeType = 'text/html';
                        break;
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }
                
                this.downloadFile(content, filename, mimeType);
                
            } catch (error) {
                KLiteModular.error('Export failed:', error);
                alert(`Export failed: ${error.message}`);
            }
        }

        gatherExportData() {
            const timestamp = new Date().toISOString();
            const mode = this.getMode();
            
            // Gather story messages
            const messages = window.gametext_arr ? 
                window.gametext_arr.filter(msg => msg && msg.trim() !== '') : [];
            
            // Calculate statistics
            const messageCount = messages.length;
            const wordCount = messages.join(' ').split(/\s+/).filter(word => word.length > 0).length;
            const tokenCount = messages.join(' ').length / 4; // Rough estimate
            
            return {
                title: 'KLITE Story Export',
                timestamp,
                version: 'v1',
                mode,
                statistics: {
                    messageCount,
                    wordCount,
                    tokenCount: Math.round(tokenCount)
                },
                content: {
                    messages,
                    memory: window.current_memory || '',
                    authorNote: window.current_anote || '',
                    worldInfo: window.current_wi || []
                },
                settings: {
                    temperature: window.localsettings?.temperature || 0.7,
                    repPen: window.localsettings?.rep_pen || 1.0,
                    topP: window.localsettings?.top_p || 0.9,
                    maxTokens: window.localsettings?.max_tokens || 100
                }
            };
        }

        exportAsMarkdown(data) {
            let markdown = `# ${data.title}

`;
            
            // Metadata
            markdown += `**Exported:** ${new Date(data.timestamp).toLocaleString()}
`;
            markdown += `**Mode:** ${data.mode}
`;
            markdown += `**Version:** ${data.version}

`;
            
            // Statistics
            markdown += `## Statistics

`;
            markdown += `- **Messages:** ${data.statistics.messageCount}
`;
            markdown += `- **Words:** ${data.statistics.wordCount}
`;
            markdown += `- **Tokens (est.):** ${data.statistics.tokenCount}

`;
            
            // Settings
            markdown += `## Settings

`;
            markdown += `- **Temperature:** ${data.settings.temperature}
`;
            markdown += `- **Rep Penalty:** ${data.settings.repPen}
`;
            markdown += `- **Top P:** ${data.settings.topP}
`;
            markdown += `- **Max Tokens:** ${data.settings.maxTokens}

`;
            
            // Memory
            if (data.content.memory) {
                markdown += `## Memory

`;
                markdown += `${data.content.memory}

`;
            }
            
            // Author's Note
            if (data.content.authorNote) {
                markdown += `## Author's Note

`;
                markdown += `${data.content.authorNote}

`;
            }
            
            // World Info
            if (data.content.worldInfo && data.content.worldInfo.length > 0) {
                markdown += `## World Info

`;
                data.content.worldInfo.forEach((wi, index) => {
                    markdown += `### Entry ${index + 1}
`;
                    markdown += `**Keys:** ${wi.keys || 'N/A'}
`;
                    markdown += `**Content:** ${wi.content || 'N/A'}

`;
                });
            }
            
            // Story Content
            if (data.content.messages && data.content.messages.length > 0) {
                markdown += `## Story Content

`;
                data.content.messages.forEach((msg, index) => {
                    markdown += `### Message ${index + 1}

`;
                    markdown += `${msg}

`;
                });
            }
            
            return markdown;
        }

        exportAsHTML(data) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(data.title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metadata strong { color: #007bff; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 14px; color: #666; }
        .content-section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        .message { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; border-left: 4px solid #007bff; }
        .message-header { font-weight: bold; color: #007bff; margin-bottom: 5px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
        @media (max-width: 600px) { .container { padding: 15px; } .stats { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>${this.escapeHtml(data.title)}</h1>
        
        <div class="metadata">
            <strong>Exported:</strong> ${new Date(data.timestamp).toLocaleString()}<br>
            <strong>Mode:</strong> ${this.escapeHtml(data.mode)}<br>
            <strong>Version:</strong> ${this.escapeHtml(data.version)}
        </div>
        
        <h2>Statistics</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${data.statistics.messageCount}</div>
                <div class="stat-label">Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.statistics.wordCount}</div>
                <div class="stat-label">Words</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.statistics.tokenCount}</div>
                <div class="stat-label">Tokens (est.)</div>
            </div>
        </div>
        
        <h2>Settings</h2>
        <div class="content-section">
            <strong>Temperature:</strong> ${data.settings.temperature}<br>
            <strong>Rep Penalty:</strong> ${data.settings.repPen}<br>
            <strong>Top P:</strong> ${data.settings.topP}<br>
            <strong>Max Tokens:</strong> ${data.settings.maxTokens}
        </div>
        
        ${data.content.memory ? `
        <h2>Memory</h2>
        <div class="content-section">
            <pre>${this.escapeHtml(data.content.memory)}</pre>
        </div>
        ` : ''}
        
        ${data.content.authorNote ? `
        <h2>Author's Note</h2>
        <div class="content-section">
            <pre>${this.escapeHtml(data.content.authorNote)}</pre>
        </div>
        ` : ''}
        
        ${data.content.worldInfo && data.content.worldInfo.length > 0 ? `
        <h2>World Info</h2>
        <div class="content-section">
            ${data.content.worldInfo.map((wi, index) => `
                <div class="message">
                    <div class="message-header">Entry ${index + 1}</div>
                    <strong>Keys:</strong> ${this.escapeHtml(wi.keys || 'N/A')}<br>
                    <strong>Content:</strong> ${this.escapeHtml(wi.content || 'N/A')}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${data.content.messages && data.content.messages.length > 0 ? `
        <h2>Story Content</h2>
        <div class="content-section">
            ${data.content.messages.map((msg, index) => `
                <div class="message">
                    <div class="message-header">Message ${index + 1}</div>
                    ${this.escapeHtml(msg)}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        getMode() {
            if (window.localsettings) {
                switch (window.localsettings.opmode) {
                    case 1: return 'Story Mode';
                    case 2: return 'Adventure Mode';
                    case 3: return 'Chat Mode';
                    case 4: return 'Instruct Mode';
                    default: return 'Unknown Mode';
                }
            }
            return 'Unknown Mode';
        }

        getTimestamp() {
            return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        }

        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            KLiteModular.log('panels', `Downloaded ${filename} (${mimeType})`);
        }

        saveState() {
            return {
                // No state to save for export panel
            };
        }

        restoreState(state) {
            // No state to restore for export panel
        }

        cleanup() {
            // Clean up any resources if needed
        }
    }

    // =============================================
    // CONTEXT ANALYZER PANEL
    // =============================================
    class ContextAnalyzerPanel extends KLitePanel {
        constructor() {
            super('contextanalyzer');
            this.displayName = 'Context Analyzer';
            this.contextCache = null;
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Context Analyzer Panel');
            // Run initial analysis
            setTimeout(() => this.analyzeContext(), 100);
        }

        render() {
            return `
                <div class="klite-token-bar-container">
                    <div class="klite-token-bar">
                        <div id="tools-memory-bar" class="klite-token-segment klite-memory-segment" title="Memory"></div>
                        <div id="tools-wi-bar" class="klite-token-segment klite-wi-segment" title="Minimum WI (Always Active)"></div>
                        <div id="tools-story-bar" class="klite-token-segment klite-story-segment" title="Story"></div>
                        <div id="tools-anote-bar" class="klite-token-segment klite-anote-segment" title="Author's Note"></div>
                        <div id="tools-free-bar" class="klite-token-segment klite-free-segment" title="Free Space"></div>
                    </div>
                </div>
                <div class="klite-token-legend">
                    <div class="klite-token-legend-grid">
                        <div class="klite-token-legend-item">
                            <div class="klite-token-legend-color klite-memory-segment"></div>
                            <span class="klite-token-legend-label">Memory:</span>
                            <span id="tools-memory-tokens" class="klite-token-legend-value">0</span>
                        </div>
                        <div class="klite-token-legend-item">
                            <div class="klite-token-legend-color klite-wi-segment"></div>
                            <span class="klite-token-legend-label">min. WI:</span>
                            <span id="tools-wi-tokens" class="klite-token-legend-value">0</span>
                        </div>
                        <div class="klite-token-legend-item">
                            <div class="klite-token-legend-color klite-story-segment"></div>
                            <span class="klite-token-legend-label">Context History:</span>
                            <span id="tools-story-tokens" class="klite-token-legend-value">0</span>
                        </div>
                        <div class="klite-token-legend-item">
                            <div class="klite-token-legend-color klite-anote-segment"></div>
                            <span class="klite-token-legend-label">Author's Note:</span>
                            <span id="tools-anote-tokens" class="klite-token-legend-value">0</span>
                        </div>
                    </div>
                </div>
                <div class="klite-context-summary">
                    <div style="margin-bottom: 4px;">
                        <strong>Total Context:</strong> 
                        <span id="tools-total-context">0</span> / <span id="tools-max-context">8192</span> tokens
                    </div>
                    <div>
                        <span style="color: var(--klite-text-muted);">Free:</span> 
                        <span id="tools-free-tokens" style="color: var(--klite-text-primary); font-weight: bold;">8192</span> tokens 
                        (<span id="tools-free-percent" style="color: var(--klite-text-primary); font-weight: bold;">100</span>%)
                    </div>
                    <div style="margin-top: 8px;">
                        <button class="klite-btn klite-btn-primary" data-action="calculate-context" style="width: 100%; padding: 6px;">Calculate Context</button>
                    </div>
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Context Analyzer Panel event handlers');
            
            // Set up calculate button
            const calculateButton = document.querySelector('[data-action="calculate-context"]');
            if (calculateButton) {
                calculateButton.addEventListener('click', () => {
                    this.analyzeContext();
                });
            }
        }

        analyzeContext() {
            KLiteModular.log('panels', 'Analyzing context');
            
            const maxContext = window.localsettings?.max_context_length || 8192;
            const contextParts = this.buildContextParts();
            
            // Update token bar segments
            const total = contextParts.total;
            const freeTokens = Math.max(0, maxContext - total);
            
            const memoryBar = document.getElementById('tools-memory-bar');
            const wiBar = document.getElementById('tools-wi-bar');
            const storyBar = document.getElementById('tools-story-bar');
            const anoteBar = document.getElementById('tools-anote-bar');
            const freeBar = document.getElementById('tools-free-bar');
            
            if (memoryBar) memoryBar.style.width = `${(contextParts.memory.tokens / maxContext) * 100}%`;
            if (wiBar) wiBar.style.width = `${(contextParts.worldInfo.tokens / maxContext) * 100}%`;
            if (storyBar) storyBar.style.width = `${(contextParts.story.tokens / maxContext) * 100}%`;
            if (anoteBar) anoteBar.style.width = `${(contextParts.authorNote.tokens / maxContext) * 100}%`;
            if (freeBar) freeBar.style.width = `${(freeTokens / maxContext) * 100}%`;
            
            // Update legend values
            const memoryTokens = document.getElementById('tools-memory-tokens');
            const wiTokens = document.getElementById('tools-wi-tokens');
            const storyTokens = document.getElementById('tools-story-tokens');
            const anoteTokens = document.getElementById('tools-anote-tokens');
            
            if (memoryTokens) memoryTokens.textContent = contextParts.memory.tokens;
            if (wiTokens) wiTokens.textContent = contextParts.worldInfo.tokens;
            if (storyTokens) storyTokens.textContent = contextParts.story.tokens;
            if (anoteTokens) anoteTokens.textContent = contextParts.authorNote.tokens;
            
            // Update totals and free space
            const totalContext = document.getElementById('tools-total-context');
            const maxContextEl = document.getElementById('tools-max-context');
            const freeTokensEl = document.getElementById('tools-free-tokens');
            const freePercentEl = document.getElementById('tools-free-percent');
            
            if (totalContext) totalContext.textContent = total;
            if (maxContextEl) maxContextEl.textContent = maxContext;
            if (freeTokensEl) freeTokensEl.textContent = freeTokens;
            if (freePercentEl) freePercentEl.textContent = Math.round((freeTokens / maxContext) * 100);
            
            this.contextCache = contextParts;
        }

        buildContextParts() {
            const parts = {
                memory: { text: window.current_memory || '', tokens: 0 },
                worldInfo: { text: '', tokens: 0 },
                story: { text: '', tokens: 0 },
                authorNote: { text: window.current_anote || '', tokens: 0 },
                total: 0
            };
            
            // Calculate tokens using Lite's function if available, but exclude images
            const countTokens = window.count_tokens || (text => Math.ceil(text.length / 4));
            
            // Helper function to filter out image data from text before counting tokens
            const filterImages = (text) => {
                if (!text) return '';
                // Remove base64 image data (data:image/...)
                return text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+/g, '[IMAGE]');
            };
            
            parts.memory.tokens = countTokens(filterImages(parts.memory.text));
            parts.authorNote.tokens = countTokens(filterImages(parts.authorNote.text));
            
            // Minimum WI - only count constant (always-active) WI entries and filter out images
            if (window.current_wi) {
                const constantWI = window.current_wi.filter(wi => wi.content && !wi.widisabled && wi.constant);
                parts.worldInfo.text = constantWI.map(wi => wi.content).join('');
                parts.worldInfo.tokens = countTokens(filterImages(parts.worldInfo.text));
            }
            
            // Story - filter out images from story content
            if (window.gametext_arr) {
                const recentMessages = window.gametext_arr.slice(-50).filter(msg => msg);
                parts.story.text = recentMessages.join('');
                parts.story.tokens = countTokens(filterImages(parts.story.text));
            }
            
            parts.total = parts.memory.tokens + parts.worldInfo.tokens + 
                         parts.story.tokens + parts.authorNote.tokens;
            
            return parts;
        }

        saveState() {
            return {
                contextCache: this.contextCache
            };
        }

        restoreState(state) {
            if (state.contextCache) {
                this.contextCache = state.contextCache;
            }
        }

        cleanup() {
            // Clean up any resources if needed
            this.contextCache = null;
        }
    }  

    // =============================================
    // TIMELINE/INDEX PANEL
    // =============================================
    class TimelineIndexPanel extends KLitePanel {
        constructor() {
            super('timelineindex');
            this.displayName = 'Timeline/Index';
            this.chapters = [];
            this.uniqueId = 'timeline_v' + Date.now(); // Debug identifier
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Timeline/Index Panel');
            this.chapters = await this.loadData('chapters') || [];
        }

        render() {
            const chapterList = this.chapters.length > 0 ? 
                this.chapters.map((chapter, index) => `
                    <div class="klite-chapter-item" data-chapter-id="${index}">
                        <div class="klite-chapter-info">
                            <strong>${chapter.name}</strong>
                            <small>${chapter.wordCount} words</small>
                        </div>
                        <button class="klite-btn-small klite-btn-danger" data-action="delete-chapter" data-chapter-id="${index}">×</button>
                    </div>
                `).join('') : 
                '<div class="klite-empty-state">No chapters added yet</div>';

            return `
                <div class="klite-timeline-controls">
                    <button class="klite-btn klite-btn-primary" data-action="add-chapter">Add Chapter</button>
                    ${this.chapters.length > 0 ? `<button class="klite-btn klite-btn-secondary" data-action="delete-all">Delete All</button>` : ''}
                </div>
                <div class="klite-chapter-list">
                    ${chapterList}
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Timeline/Index Panel event handlers');
            
            // Add chapter button
            const addButton = document.querySelector('[data-action="add-chapter"]');
            if (addButton) {
                addButton.addEventListener('click', () => this.addChapter());
            }

            // Delete all button
            const deleteAllButton = document.querySelector('[data-action="delete-all"]');
            if (deleteAllButton) {
                deleteAllButton.addEventListener('click', () => this.deleteAllChapters());
            }

            // Chapter click handlers
            document.querySelectorAll('.klite-chapter-item').forEach(item => {
                const chapterId = parseInt(item.dataset.chapterId);
                item.addEventListener('click', (e) => {
                    if (!e.target.matches('[data-action="delete-chapter"]')) {
                        this.jumpToChapter(chapterId);
                    }
                });
            });

            // Delete chapter buttons
            document.querySelectorAll('[data-action="delete-chapter"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chapterId = parseInt(button.dataset.chapterId);
                    this.deleteChapter(chapterId);
                });
            });
        }

        async addChapter() {
            const name = prompt('Enter chapter name:');
            if (!name) return;

            const gametext = document.getElementById('gametext');
            const scrollPosition = gametext ? gametext.scrollTop : 0;
            const wordCount = window.gametext_arr ? 
                window.gametext_arr.join(' ').split(/\s+/).filter(word => word.length > 0).length : 0;

            const chapter = {
                name,
                scrollPosition,
                wordCount,
                timestamp: Date.now()
            };

            this.chapters.push(chapter);
            await this.saveData('chapters', this.chapters);
            this.refresh();
        }

        async deleteChapter(chapterId) {
            if (confirm('Delete this chapter?')) {
                this.chapters.splice(chapterId, 1);
                await this.saveData('chapters', this.chapters);
                this.refresh();
            }
        }

        async deleteAllChapters() {
            if (confirm('Delete all chapters?')) {
                this.chapters = [];
                await this.saveData('chapters', this.chapters);
                this.refresh();
            }
        }

        jumpToChapter(chapterId) {
            const chapter = this.chapters[chapterId];
            if (!chapter) return;

            const gametext = document.getElementById('gametext');
            if (gametext) {
                gametext.scrollTop = chapter.scrollPosition;
                KLiteModular.log('panels', `Jumped to chapter: ${chapter.name}`);
            }
        }

        refresh() {
            const panel = document.querySelector('[data-panel="timelineindex"]');
            if (panel) {
                panel.innerHTML = this.render();
                this.postRender();
            }
        }

        saveState() {
            return {
                chapters: this.chapters
            };
        }

        restoreState(state) {
            if (state.chapters) {
                this.chapters = state.chapters;
            }
        }

        cleanup() {
            this.chapters = [];
        }
    }

    // =============================================
    // QUICK ACTIONS PANEL
    // =============================================
    class QuickActionsPanel extends KLitePanel {
        constructor() {
            super('quickactions');
            this.displayName = 'Quick Actions';
            this.actions = [
                '> Look around',
                '> Search',
                '> Check inventory', 
                '> Rest',
                '> Continue'
            ];
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Quick Actions Panel');
            const savedActions = await this.loadData('actions');
            if (savedActions) {
                this.actions = savedActions;
            }
        }

        render() {
            return `
                <div class="klite-quick-actions-grid">
                    ${this.actions.map((action, index) => `
                        <div class="klite-action-slot">
                            <button class="klite-btn klite-btn-primary klite-action-btn" data-action="submit-action" data-slot="${index}">
                                ${index + 1}
                            </button>
                            <input type="text" class="klite-input klite-action-input" 
                                   value="${action}" 
                                   data-slot="${index}"
                                   placeholder="Enter action...">
                        </div>
                    `).join('')}
                </div>
                <div class="klite-actions-info">
                    <small style="color: var(--klite-text-muted);">
                        Use ">" prefix for model instructions. Click number to submit action.
                    </small>
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Quick Actions Panel event handlers');
            
            // Action button clicks
            document.querySelectorAll('[data-action="submit-action"]').forEach(button => {
                button.addEventListener('click', () => {
                    const slot = parseInt(button.dataset.slot);
                    this.submitAction(slot);
                });
            });

            // Action input changes
            document.querySelectorAll('.klite-action-input').forEach(input => {
                input.addEventListener('blur', () => {
                    const slot = parseInt(input.dataset.slot);
                    this.updateAction(slot, input.value);
                });
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const slot = parseInt(input.dataset.slot);
                        this.updateAction(slot, input.value);
                        this.submitAction(slot);
                    }
                });
            });
        }

        async updateAction(slot, action) {
            this.actions[slot] = action;
            await this.saveData('actions', this.actions);
            KLiteModular.log('panels', `Updated action ${slot + 1}: ${action}`);
        }

        submitAction(slot) {
            const action = this.actions[slot];
            if (!action) return;

            // Use KoboldAI Lite's input system
            const input = document.getElementById('input_text');
            if (input) {
                input.value = action;
                
                // Trigger submission
                if (window.submit) {
                    window.submit();
                } else if (window.submitGeneration) {
                    window.submitGeneration();
                }
                
                KLiteModular.log('panels', `Submitted action ${slot + 1}: ${action}`);
            }
        }

        saveState() {
            return {
                actions: this.actions
            };
        }

        restoreState(state) {
            if (state.actions) {
                this.actions = state.actions;
            }
        }

        cleanup() {
            this.actions = [
                '> Look around',
                '> Search', 
                '> Check inventory',
                '> Rest',
                '> Continue'
            ];
        }
    }

    // =============================================
    // WORLDINFO MANAGEMENT PANEL
    // =============================================
    class WorldInfoManagementPanel extends KLitePanel {
        constructor() {
            super('worldinfo');
            this.displayName = 'WorldInfo Management_WIP';
            this.groups = ['General'];
            this.currentGroup = 'General';
            this.searchTerm = '';
            this.showAdvanced = false;
            this.searchTimeout = null;
            this.pendingEntries = [];
        }

        async init() {
            KLiteModular.log('panels', 'Initializing WorldInfo Management Panel');
            
            // Load saved settings
            this.groups = await this.loadData('groups') || ['General'];
            this.currentGroup = await this.loadData('currentGroup') || 'General';
            this.showAdvanced = await this.loadData('showAdvanced') || false;
            
            // Ensure current group exists
            if (!this.groups.includes(this.currentGroup)) {
                this.currentGroup = this.groups[0] || 'General';
            }
            
            // Initialize with current KoboldAI Lite WI data
            this.loadFromKoboldAI();
        }

        render() {
            const wiEntries = this.getFilteredEntries();
            const stats = this.getStats();
            
            return `
                <div class="klite-wi-header">
                    <div class="klite-wi-tabs">
                        ${this.groups.map(group => `
                            <button class="klite-wi-tab ${group === this.currentGroup ? 'active' : ''}" 
                                    data-group="${group}">
                                ${group} (${this.getGroupEntryCount(group)})
                            </button>
                        `).join('')}
                        <button class="klite-wi-tab-add" data-action="add-group">+</button>
                    </div>
                    <div class="klite-wi-group-controls">
                        <button class="klite-btn klite-btn-small" data-action="rename-group">Rename</button>
                        <button class="klite-btn klite-btn-small danger" data-action="delete-group">Delete Group</button>
                    </div>
                </div>
                
                <div class="klite-wi-controls">
                    <div class="klite-wi-search">
                        <input type="text" class="klite-input" placeholder="Search entries..." 
                               value="${this.searchTerm}" data-action="search">
                        <button class="klite-btn klite-btn-small" data-action="clear-search">Clear</button>
                    </div>
                    <div class="klite-wi-actions">
                        <button class="klite-btn klite-btn-primary" data-action="add-entry">Add Entry</button>
                        <button class="klite-btn klite-btn-secondary" data-action="import-export">Import/Export</button>
                        <button class="klite-btn klite-btn-secondary" data-action="toggle-advanced">
                            ${this.showAdvanced ? 'Hide' : 'Show'} Advanced
                        </button>
                    </div>
                </div>
                
                ${this.showAdvanced ? this.renderAdvancedSettings() : ''}
                
                <div class="klite-wi-stats">
                    <span>Active: ${stats.active}/${stats.total}</span>
                    <span>Group: ${this.currentGroup}</span>
                    <button class="klite-btn klite-btn-small" data-action="toggle-all">Toggle All</button>
                </div>
                
                <div class="klite-wi-entries">
                    ${wiEntries.length > 0 ? wiEntries.map((entry, index) => this.renderEntry(entry, index)).join('') : 
                      '<div class="klite-empty-state">No entries found</div>'}
                </div>
            `;
        }

        renderAdvancedSettings() {
            const settings = this.getKoboldAISettings();
            return `
                <div class="klite-wi-advanced">
                    <h4>Advanced Settings</h4>
                    <div class="klite-wi-setting">
                        <label>Insert Location:</label>
                        <select class="klite-select" data-setting="insert-location">
                            <option value="0" ${settings.insertLocation === 0 ? 'selected' : ''}>After Memory</option>
                            <option value="1" ${settings.insertLocation === 1 ? 'selected' : ''}>Before Author's Note</option>
                        </select>
                    </div>
                    <div class="klite-wi-setting">
                        <label>Search Depth:</label>
                        <select class="klite-select" data-setting="search-depth">
                            <option value="0" ${settings.searchDepth === 0 ? 'selected' : ''}>Full Context</option>
                            <option value="8192" ${settings.searchDepth === 8192 ? 'selected' : ''}>Last 8192 tokens</option>
                            <option value="4096" ${settings.searchDepth === 4096 ? 'selected' : ''}>Last 4096 tokens</option>
                            <option value="2048" ${settings.searchDepth === 2048 ? 'selected' : ''}>Last 2048 tokens</option>
                            <option value="1024" ${settings.searchDepth === 1024 ? 'selected' : ''}>Last 1024 tokens</option>
                            <option value="512" ${settings.searchDepth === 512 ? 'selected' : ''}>Last 512 tokens</option>
                            <option value="256" ${settings.searchDepth === 256 ? 'selected' : ''}>Last 256 tokens</option>
                        </select>
                    </div>
                    <div class="klite-wi-setting">
                        <label>
                            <input type="checkbox" data-setting="case-sensitive" 
                                   ${settings.caseSensitive ? 'checked' : ''}>
                            Case Sensitive Keys
                        </label>
                    </div>
                </div>
            `;
        }

        renderEntry(entry, index) {
            const isEnabled = entry.enabled !== false;
            const probability = entry.probability || 100;
            
            return `
                <div class="klite-wi-entry ${isEnabled ? 'enabled' : 'disabled'}" data-entry-id="${entry.id || index}">
                    <div class="klite-wi-entry-header">
                        <button class="klite-wi-toggle ${isEnabled ? 'active' : ''}" 
                                data-action="toggle-entry" data-entry-id="${entry.id || index}">
                            ⚡
                        </button>
                        <div class="klite-wi-entry-info">
                            <div class="klite-wi-keys">
                                <strong>Keys:</strong> ${entry.keys ? entry.keys.join(', ') : 'No keys'}
                            </div>
                            <div class="klite-wi-metadata">
                                <span class="klite-wi-prob">Prob: ${probability}%</span>
                                ${entry.selective ? '<span class="klite-wi-selective">Selective</span>' : ''}
                                ${entry.constant ? '<span class="klite-wi-constant">Constant</span>' : ''}
                            </div>
                        </div>
                        <div class="klite-wi-entry-actions">
                            <button class="klite-btn-small" data-action="move-up" data-entry-id="${entry.id || index}">▲</button>
                            <button class="klite-btn-small" data-action="move-down" data-entry-id="${entry.id || index}">▼</button>
                            <button class="klite-btn-small" data-action="edit-entry" data-entry-id="${entry.id || index}">Edit</button>
                            <button class="klite-btn-small danger" data-action="delete-entry" data-entry-id="${entry.id || index}">×</button>
                        </div>
                    </div>
                    <div class="klite-wi-entry-content">
                        ${entry.content ? entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : '') : 'No content'}
                    </div>
                    ${entry.comment ? `<div class="klite-wi-entry-comment">Comment: ${entry.comment}</div>` : ''}
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up WorldInfo Management Panel event handlers');
            
            // Group tabs
            document.querySelectorAll('.klite-wi-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.currentGroup = e.target.dataset.group;
                    this.saveData('currentGroup', this.currentGroup);
                    this.refresh();
                });
            });

            // Search
            const searchInput = document.querySelector('[data-action="search"]');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.searchTerm = e.target.value.toLowerCase();
                        this.refresh();
                    }, 300);
                });
            }

            // Action buttons
            document.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    const entryId = e.target.dataset.entryId;
                    
                    switch (action) {
                        case 'add-group':
                            this.addGroup();
                            break;
                        case 'rename-group':
                            this.renameGroup();
                            break;
                        case 'delete-group':
                            this.deleteGroup();
                            break;
                        case 'add-entry':
                            this.addEntry();
                            break;
                        case 'import-export':
                            this.showImportExport();
                            break;
                        case 'toggle-advanced':
                            this.toggleAdvanced();
                            break;
                        case 'toggle-all':
                            this.toggleAllEntries();
                            break;
                        case 'toggle-entry':
                            this.toggleEntry(entryId);
                            break;
                        case 'edit-entry':
                            this.editEntry(entryId);
                            break;
                        case 'delete-entry':
                            this.deleteEntry(entryId);
                            break;
                        case 'move-up':
                            this.moveEntry(entryId, -1);
                            break;
                        case 'move-down':
                            this.moveEntry(entryId, 1);
                            break;
                        case 'clear-search':
                            this.clearSearch();
                            break;
                    }
                });
            });

            // Advanced settings
            document.querySelectorAll('[data-setting]').forEach(setting => {
                setting.addEventListener('change', (e) => {
                    this.updateKoboldAISetting(e.target.dataset.setting, e.target.value, e.target.checked);
                });
            });
        }

        // Group management methods
        addGroup() {
            const name = prompt('Enter group name:');
            if (name && !this.groups.includes(name)) {
                this.groups.push(name);
                this.currentGroup = name;
                this.saveData('groups', this.groups);
                this.saveData('currentGroup', this.currentGroup);
                this.refresh();
            }
        }

        renameGroup() {
            if (this.currentGroup === 'General') {
                alert('Cannot rename the General group');
                return;
            }
            
            const newName = prompt('Enter new group name:', this.currentGroup);
            if (newName && newName !== this.currentGroup && !this.groups.includes(newName)) {
                const oldName = this.currentGroup;
                const index = this.groups.indexOf(oldName);
                this.groups[index] = newName;
                this.currentGroup = newName;
                
                // Update entries group assignment
                this.updateEntriesGroup(oldName, newName);
                
                this.saveData('groups', this.groups);
                this.saveData('currentGroup', this.currentGroup);
                this.refresh();
            }
        }

        deleteGroup() {
            if (this.currentGroup === 'General') {
                alert('Cannot delete the General group');
                return;
            }
            
            if (confirm(`Delete group "${this.currentGroup}" and all its entries?`)) {
                this.groups = this.groups.filter(g => g !== this.currentGroup);
                this.deleteGroupEntries(this.currentGroup);
                this.currentGroup = this.groups[0] || 'General';
                this.saveData('groups', this.groups);
                this.saveData('currentGroup', this.currentGroup);
                this.refresh();
            }
        }

        // Entry management methods
        addEntry() {
            this.showEntryModal();
        }

        editEntry(entryId) {
            const entry = this.getEntryById(entryId);
            if (entry) {
                this.showEntryModal(entry);
            }
        }

        deleteEntry(entryId) {
            if (confirm('Delete this entry?')) {
                this.removeEntryFromKoboldAI(entryId);
                this.refresh();
            }
        }

        toggleEntry(entryId) {
            const entry = this.getEntryById(entryId);
            if (entry) {
                entry.enabled = !entry.enabled;
                this.saveToKoboldAI();
                this.refresh();
            }
        }

        toggleAllEntries() {
            const entries = this.getGroupEntries(this.currentGroup);
            const allEnabled = entries.every(e => e.enabled !== false);
            
            entries.forEach(entry => {
                entry.enabled = !allEnabled;
            });
            
            this.saveToKoboldAI();
            this.refresh();
        }

        moveEntry(entryId, direction) {
            const entries = this.getGroupEntries(this.currentGroup);
            const index = entries.findIndex(e => (e.id || entries.indexOf(e)) == entryId);
            
            if (index !== -1) {
                const newIndex = index + direction;
                if (newIndex >= 0 && newIndex < entries.length) {
                    [entries[index], entries[newIndex]] = [entries[newIndex], entries[index]];
                    this.saveToKoboldAI();
                    this.refresh();
                }
            }
        }

        // Entry modal
        showEntryModal(entry = null) {
            const isEdit = entry !== null;
            const entryData = entry || {
                keys: [],
                secondary_keys: [],
                anti_keys: [],
                content: '',
                comment: '',
                probability: 100,
                selective: false,
                constant: false,
                enabled: true
            };

            const modal = document.createElement('div');
            modal.className = 'klite-modal-overlay';
            modal.innerHTML = `
                <div class="klite-modal klite-wi-entry-modal">
                    <div class="klite-modal-header">
                        <h3>${isEdit ? 'Edit' : 'Add'} WorldInfo Entry</h3>
                        <button class="klite-modal-close">×</button>
                    </div>
                    <div class="klite-modal-content">
                        <div class="klite-wi-field">
                            <label>Primary Keys (comma-separated):</label>
                            <input type="text" class="klite-input" data-field="keys" 
                                   value="${entryData.keys ? entryData.keys.join(', ') : ''}">
                        </div>
                        <div class="klite-wi-field">
                            <label>Secondary Keys (comma-separated):</label>
                            <input type="text" class="klite-input" data-field="secondary_keys" 
                                   value="${entryData.secondary_keys ? entryData.secondary_keys.join(', ') : ''}">
                        </div>
                        <div class="klite-wi-field">
                            <label>Anti Keys (comma-separated):</label>
                            <input type="text" class="klite-input" data-field="anti_keys" 
                                   value="${entryData.anti_keys ? entryData.anti_keys.join(', ') : ''}">
                        </div>
                        <div class="klite-wi-field">
                            <label>Content:</label>
                            <textarea class="klite-textarea" data-field="content" rows="6">${entryData.content || ''}</textarea>
                        </div>
                        <div class="klite-wi-field">
                            <label>Comment:</label>
                            <input type="text" class="klite-input" data-field="comment" 
                                   value="${entryData.comment || ''}">
                        </div>
                        <div class="klite-wi-field">
                            <label>Probability:</label>
                            <select class="klite-select" data-field="probability">
                                <option value="100" ${entryData.probability === 100 ? 'selected' : ''}>100%</option>
                                <option value="90" ${entryData.probability === 90 ? 'selected' : ''}>90%</option>
                                <option value="75" ${entryData.probability === 75 ? 'selected' : ''}>75%</option>
                                <option value="50" ${entryData.probability === 50 ? 'selected' : ''}>50%</option>
                                <option value="25" ${entryData.probability === 25 ? 'selected' : ''}>25%</option>
                                <option value="10" ${entryData.probability === 10 ? 'selected' : ''}>10%</option>
                                <option value="5" ${entryData.probability === 5 ? 'selected' : ''}>5%</option>
                                <option value="1" ${entryData.probability === 1 ? 'selected' : ''}>1%</option>
                            </select>
                        </div>
                        <div class="klite-wi-field">
                            <label>
                                <input type="checkbox" data-field="selective" 
                                       ${entryData.selective ? 'checked' : ''}>
                                Selective (requires both primary and secondary keys)
                            </label>
                        </div>
                        <div class="klite-wi-field">
                            <label>
                                <input type="checkbox" data-field="constant" 
                                       ${entryData.constant ? 'checked' : ''}>
                                Constant (always included)
                            </label>
                        </div>
                        <div class="klite-wi-field">
                            <label>
                                <input type="checkbox" data-field="enabled" 
                                       ${entryData.enabled !== false ? 'checked' : ''}>
                                Enabled
                            </label>
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn klite-btn-primary" data-action="save-entry">
                            ${isEdit ? 'Update' : 'Add'} Entry
                        </button>
                        <button class="klite-btn klite-btn-secondary klite-modal-close">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Modal event handlers
            modal.querySelector('.klite-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.querySelector('[data-action="save-entry"]').addEventListener('click', () => {
                const newEntry = this.collectEntryData(modal);
                if (newEntry.keys.length === 0 && !newEntry.constant) {
                    alert('Entry must have at least one key or be set as constant');
                    return;
                }

                if (isEdit) {
                    this.updateEntryInKoboldAI(entry.id || entry, newEntry);
                } else {
                    this.addEntryToKoboldAI(newEntry);
                }

                modal.remove();
                this.refresh();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        collectEntryData(modal) {
            const data = {};
            
            // Text fields
            modal.querySelectorAll('[data-field]').forEach(field => {
                const fieldName = field.dataset.field;
                
                if (field.type === 'checkbox') {
                    data[fieldName] = field.checked;
                } else if (fieldName.endsWith('_keys') || fieldName === 'keys') {
                    data[fieldName] = field.value.split(',').map(k => k.trim()).filter(k => k);
                } else if (fieldName === 'probability') {
                    data[fieldName] = parseInt(field.value);
                } else {
                    data[fieldName] = field.value;
                }
            });

            // Assign to current group
            data.group = this.currentGroup;
            
            return data;
        }

        // Import/Export functionality
        showImportExport() {
            const modal = document.createElement('div');
            modal.className = 'klite-modal-overlay';
            modal.innerHTML = `
                <div class="klite-modal klite-wi-import-modal">
                    <div class="klite-modal-header">
                        <h3>Import/Export WorldInfo</h3>
                        <button class="klite-modal-close">×</button>
                    </div>
                    <div class="klite-modal-content">
                        <div class="klite-wi-import-section">
                            <h4>Export Current Group</h4>
                            <button class="klite-btn klite-btn-primary" data-action="export-json">Export as JSON</button>
                            <button class="klite-btn klite-btn-secondary" data-action="copy-json">Copy to Clipboard</button>
                        </div>
                        <div class="klite-wi-import-section">
                            <h4>Import to Current Group</h4>
                            <textarea class="klite-textarea" placeholder="Paste JSON data here..." rows="10" data-field="import-json"></textarea>
                            <button class="klite-btn klite-btn-primary" data-action="import-json">Import JSON</button>
                            <button class="klite-btn klite-btn-secondary" data-action="replace-json">Replace Group</button>
                        </div>
                        <div class="klite-wi-import-section">
                            <h4>Character Integration</h4>
                            <button class="klite-btn klite-btn-secondary" data-action="import-from-character">Import from Character</button>
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn klite-btn-secondary klite-modal-close">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Modal event handlers
            modal.querySelector('.klite-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    
                    switch (action) {
                        case 'export-json':
                            this.exportGroupAsJSON();
                            break;
                        case 'copy-json':
                            this.copyGroupToClipboard();
                            break;
                        case 'import-json':
                            this.importFromJSON(modal.querySelector('[data-field="import-json"]').value, false);
                            break;
                        case 'replace-json':
                            this.importFromJSON(modal.querySelector('[data-field="import-json"]').value, true);
                            break;
                        case 'import-from-character':
                            this.importFromCharacter();
                            break;
                    }
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        // Search and filtering
        getFilteredEntries() {
            let entries = this.getGroupEntries(this.currentGroup);
            
            if (this.searchTerm) {
                entries = entries.filter(entry => {
                    const searchText = this.searchTerm.toLowerCase();
                    return (
                        (entry.keys && entry.keys.some(key => key.toLowerCase().includes(searchText))) ||
                        (entry.secondary_keys && entry.secondary_keys.some(key => key.toLowerCase().includes(searchText))) ||
                        (entry.content && entry.content.toLowerCase().includes(searchText)) ||
                        (entry.comment && entry.comment.toLowerCase().includes(searchText))
                    );
                });
            }
            
            return entries;
        }

        clearSearch() {
            this.searchTerm = '';
            document.querySelector('[data-action="search"]').value = '';
            this.refresh();
        }

        // Statistics
        getStats() {
            const entries = this.getGroupEntries(this.currentGroup);
            return {
                total: entries.length,
                active: entries.filter(e => e.enabled !== false).length
            };
        }

        getGroupEntryCount(group) {
            return this.getGroupEntries(group).length;
        }

        // Advanced settings
        toggleAdvanced() {
            this.showAdvanced = !this.showAdvanced;
            this.saveData('showAdvanced', this.showAdvanced);
            this.refresh();
        }

        getKoboldAISettings() {
            // Get current WI settings from KoboldAI Lite
            return {
                insertLocation: window.wi_insert_location || 0,
                searchDepth: window.wi_search_depth || 0,
                caseSensitive: window.wi_case_sensitive || false
            };
        }

        updateKoboldAISetting(setting, value, checked) {
            switch (setting) {
                case 'insert-location':
                    window.wi_insert_location = parseInt(value);
                    break;
                case 'search-depth':
                    window.wi_search_depth = parseInt(value);
                    break;
                case 'case-sensitive':
                    window.wi_case_sensitive = checked;
                    break;
            }
            
            // Trigger KoboldAI Lite to refresh WI
            if (window.worldinfoFromData) {
                window.worldinfoFromData();
            }
        }

        // KoboldAI Lite integration methods
        loadFromKoboldAI() {
            // Load current WI data from KoboldAI Lite
            if (window.worldinfo) {
                this.pendingEntries = [...window.worldinfo];
            }
        }

        saveToKoboldAI() {
            // Save current entries back to KoboldAI Lite
            if (window.worldinfo) {
                window.worldinfo = [...this.pendingEntries];
                
                // Trigger KoboldAI Lite to refresh WI
                if (window.worldinfoFromData) {
                    window.worldinfoFromData();
                }
            }
        }

        getGroupEntries(group) {
            return this.pendingEntries.filter(entry => (entry.group || 'General') === group);
        }

        getEntryById(id) {
            return this.pendingEntries.find(entry => (entry.id || this.pendingEntries.indexOf(entry)) == id);
        }

        addEntryToKoboldAI(entry) {
            entry.id = Date.now().toString();
            this.pendingEntries.push(entry);
            this.saveToKoboldAI();
        }

        updateEntryInKoboldAI(entryId, newData) {
            const index = this.pendingEntries.findIndex(e => (e.id || this.pendingEntries.indexOf(e)) == entryId);
            if (index !== -1) {
                this.pendingEntries[index] = { ...this.pendingEntries[index], ...newData };
                this.saveToKoboldAI();
            }
        }

        removeEntryFromKoboldAI(entryId) {
            this.pendingEntries = this.pendingEntries.filter(e => (e.id || this.pendingEntries.indexOf(e)) != entryId);
            this.saveToKoboldAI();
        }

        updateEntriesGroup(oldGroup, newGroup) {
            this.pendingEntries.forEach(entry => {
                if ((entry.group || 'General') === oldGroup) {
                    entry.group = newGroup;
                }
            });
            this.saveToKoboldAI();
        }

        deleteGroupEntries(group) {
            this.pendingEntries = this.pendingEntries.filter(entry => (entry.group || 'General') !== group);
            this.saveToKoboldAI();
        }

        // Import/Export methods
        exportGroupAsJSON() {
            const entries = this.getGroupEntries(this.currentGroup);
            const exportData = entries.map(entry => ({
                keys: entry.keys || [],
                secondary_keys: entry.secondary_keys || [],
                anti_keys: entry.anti_keys || [],
                content: entry.content || '',
                comment: entry.comment || '',
                probability: entry.probability || 100,
                selective: entry.selective || false,
                constant: entry.constant || false,
                enabled: entry.enabled !== false
            }));

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `worldinfo-${this.currentGroup.toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        copyGroupToClipboard() {
            const entries = this.getGroupEntries(this.currentGroup);
            const exportData = entries.map(entry => ({
                keys: entry.keys || [],
                secondary_keys: entry.secondary_keys || [],
                anti_keys: entry.anti_keys || [],
                content: entry.content || '',
                comment: entry.comment || '',
                probability: entry.probability || 100,
                selective: entry.selective || false,
                constant: entry.constant || false,
                enabled: entry.enabled !== false
            }));

            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            alert('WorldInfo entries copied to clipboard!');
        }

        importFromJSON(jsonText, replace = false) {
            try {
                const importData = JSON.parse(jsonText);
                
                if (!Array.isArray(importData)) {
                    throw new Error('Invalid JSON format');
                }

                if (replace) {
                    this.deleteGroupEntries(this.currentGroup);
                }

                importData.forEach(entry => {
                    entry.group = this.currentGroup;
                    this.addEntryToKoboldAI(entry);
                });

                alert(`Imported ${importData.length} entries to ${this.currentGroup}`);
                this.refresh();
            } catch (error) {
                alert('Error importing JSON: ' + error.message);
            }
        }

        importFromCharacter() {
            // Implementation for character WI import
            alert('Character import feature coming soon!');
        }

        refresh() {
            const panel = document.querySelector('[data-panel="worldinfo"]');
            if (panel) {
                panel.innerHTML = this.render();
                this.postRender();
            }
        }

        saveState() {
            return {
                groups: this.groups,
                currentGroup: this.currentGroup,
                searchTerm: this.searchTerm,
                showAdvanced: this.showAdvanced
            };
        }

        restoreState(state) {
            if (state.groups) this.groups = state.groups;
            if (state.currentGroup) this.currentGroup = state.currentGroup;
            if (state.searchTerm) this.searchTerm = state.searchTerm;
            if (state.showAdvanced !== undefined) this.showAdvanced = state.showAdvanced;
        }

        cleanup() {
            clearTimeout(this.searchTimeout);
            this.groups = ['General'];
            this.currentGroup = 'General';
            this.searchTerm = '';
            this.showAdvanced = false;
            this.pendingEntries = [];
        }
    }

    // =============================================
    // TEXT DATABASE PANEL
    // =============================================
    class TextDatabasePanel extends KLitePanel {
        constructor() {
            super('textdb');
            this.displayName = 'Text Database_WIP';
            this.showAdvanced = false;
            this.saveTimeout = null;
            this.stats = {
                wordCount: 0,
                charCount: 0,
                memoryUsage: 0
            };
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Text Database Panel');
            
            // Load saved settings
            this.showAdvanced = await this.loadData('showAdvanced') || false;
            
            // Initialize KoboldAI Lite integration
            this.initKoboldAIIntegration();
            
            // Update statistics
            this.updateStats();
        }

        render() {
            const isEnabled = this.isEnabled();
            const content = this.getContent();
            
            return `
                <div class="klite-textdb-header">
                    <div class="klite-textdb-controls">
                        <label class="klite-textdb-toggle">
                            <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                                   data-action="toggle-enabled">
                            Enable Text Database
                        </label>
                        <button class="klite-btn klite-btn-small" data-action="import-files">
                            Import Files
                        </button>
                        <button class="klite-btn klite-btn-small" data-action="export-database">
                            Export Database
                        </button>
                        <button class="klite-btn klite-btn-small" data-action="toggle-advanced">
                            ${this.showAdvanced ? 'Hide' : 'Show'} Advanced
                        </button>
                    </div>
                    
                    <div class="klite-textdb-stats">
                        <div class="klite-textdb-stat">
                            <span class="label">Words:</span>
                            <span class="value">${this.stats.wordCount}</span>
                        </div>
                        <div class="klite-textdb-stat">
                            <span class="label">Characters:</span>
                            <span class="value">${this.stats.charCount}</span>
                        </div>
                        <div class="klite-textdb-stat">
                            <span class="label">Memory:</span>
                            <span class="value">${this.stats.memoryUsage} KB</span>
                        </div>
                    </div>
                </div>
                
                ${this.showAdvanced ? this.renderAdvancedSettings() : ''}
                
                <div class="klite-textdb-editor">
                    <textarea class="klite-textdb-textarea" 
                              placeholder="Enter your text database content here... Import files or paste text directly."
                              data-action="content-change"
                              ${!isEnabled ? 'disabled' : ''}>${content}</textarea>
                </div>
                
                <div class="klite-textdb-dropzone" data-action="file-drop">
                    <div class="klite-textdb-dropzone-content">
                        <div class="klite-textdb-dropzone-icon">📁</div>
                        <div class="klite-textdb-dropzone-text">
                            Drop files here to import<br>
                            <small>Supports .txt, .md, .json files</small>
                        </div>
                    </div>
                </div>
            `;
        }

        renderAdvancedSettings() {
            const settings = this.getSettings();
            
            return `
                <div class="klite-textdb-advanced">
                    <h4>Advanced Settings</h4>
                    
                    <div class="klite-textdb-setting">
                        <label>
                            <input type="checkbox" data-setting="searchhistory" 
                                   ${settings.searchhistory ? 'checked' : ''}>
                            Include Story History in Searches
                        </label>
                        <small>Enables searching through the conversation history</small>
                    </div>
                    
                    <div class="klite-textdb-setting">
                        <label>Search Results Count: <span class="value">${settings.numresults}</span></label>
                        <input type="range" min="1" max="5" value="${settings.numresults}" 
                               data-setting="numresults" class="klite-slider">
                        <small>Number of search results to return (1-5)</small>
                    </div>
                    
                    <div class="klite-textdb-setting">
                        <label>Search Range: <span class="value">${settings.searchrange}</span> chars</label>
                        <input type="range" min="0" max="1024" value="${settings.searchrange}" 
                               data-setting="searchrange" class="klite-slider">
                        <small>Recent text range to include in searches (0-1024 characters)</small>
                    </div>
                    
                    <div class="klite-textdb-setting">
                        <label>Chunk Size: <span class="value">${settings.chunksize}</span> chars</label>
                        <input type="range" min="32" max="2048" value="${settings.chunksize}" 
                               data-setting="chunksize" class="klite-slider">
                        <small>Text chunk size for processing (32-2048 characters)<br>
                        Smaller chunks use less memory but may reduce context quality</small>
                    </div>
                    
                    <div class="klite-textdb-setting">
                        <button class="klite-btn klite-btn-small klite-btn-secondary" 
                                data-action="clear-database">
                            Clear Database
                        </button>
                        <small>Remove all text database content</small>
                    </div>
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Text Database Panel event handlers');
            
            // Main controls
            document.querySelectorAll('[data-action]').forEach(element => {
                element.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    
                    switch (action) {
                        case 'toggle-enabled':
                            this.toggleEnabled();
                            break;
                        case 'import-files':
                            this.showImportModal();
                            break;
                        case 'export-database':
                            this.exportDatabase();
                            break;
                        case 'toggle-advanced':
                            this.toggleAdvanced();
                            break;
                        case 'clear-database':
                            this.clearDatabase();
                            break;
                    }
                });
            });

            // Content change handler
            const textarea = document.querySelector('[data-action="content-change"]');
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this.handleContentChange(e.target.value);
                });
            }

            // Settings sliders
            document.querySelectorAll('[data-setting]').forEach(element => {
                element.addEventListener('input', (e) => {
                    this.updateSetting(e.target.dataset.setting, e.target.value, e.target.checked);
                });
            });

            // Drag and drop
            this.setupDragAndDrop();
        }

        setupDragAndDrop() {
            const dropzone = document.querySelector('[data-action="file-drop"]');
            if (!dropzone) return;

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleFileImport(files);
            });
        }

        // Core functionality
        toggleEnabled() {
            const newState = !this.isEnabled();
            this.setEnabled(newState);
            this.refresh();
        }

        toggleAdvanced() {
            this.showAdvanced = !this.showAdvanced;
            this.saveData('showAdvanced', this.showAdvanced);
            this.refresh();
        }

        handleContentChange(content) {
            // Debounced save
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.setContent(content);
                this.updateStats();
                this.refresh();
            }, 1000);
        }

        updateSetting(settingName, value, checked) {
            const settings = this.getSettings();
            
            if (settingName === 'searchhistory') {
                settings.searchhistory = checked;
                window.documentdb_searchhistory = checked;
            } else {
                const numValue = parseInt(value);
                settings[settingName] = numValue;
                
                // Update KoboldAI variables
                switch (settingName) {
                    case 'numresults':
                        window.documentdb_numresults = numValue;
                        break;
                    case 'searchrange':
                        window.documentdb_searchrange = numValue;
                        break;
                    case 'chunksize':
                        window.documentdb_chunksize = numValue;
                        break;
                }
            }
            
            this.saveKoboldAISettings();
            
            // Update display
            const valueSpan = document.querySelector(`[data-setting="${settingName}"] + .klite-slider ~ small .value`) ||
                            document.querySelector(`[data-setting="${settingName}"] ~ label .value`);
            if (valueSpan) {
                valueSpan.textContent = value;
            }
        }

        // Import/Export functionality
        showImportModal() {
            const modal = document.createElement('div');
            modal.className = 'klite-modal-overlay';
            modal.innerHTML = `
                <div class="klite-modal klite-textdb-import-modal">
                    <div class="klite-modal-header">
                        <h3>Import Files</h3>
                        <button class="klite-modal-close">×</button>
                    </div>
                    <div class="klite-modal-content">
                        <div class="klite-textdb-import-mode">
                            <h4>Import Mode</h4>
                            <label>
                                <input type="radio" name="import-mode" value="append" checked>
                                Append to existing content
                            </label>
                            <label>
                                <input type="radio" name="import-mode" value="replace">
                                Replace all existing content
                            </label>
                        </div>
                        
                        <div class="klite-textdb-import-files">
                            <h4>Select Files</h4>
                            <input type="file" multiple accept=".txt,.md,.json" 
                                   class="klite-file-input" data-action="file-select">
                            <div class="klite-textdb-supported-formats">
                                <small>Supported formats: .txt, .md, .json</small>
                            </div>
                        </div>
                        
                        <div class="klite-textdb-import-preview">
                            <h4>Import Preview</h4>
                            <div class="klite-textdb-file-list" data-preview="file-list">
                                No files selected
                            </div>
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn klite-btn-primary" data-action="import-confirm">
                            Import Files
                        </button>
                        <button class="klite-btn klite-btn-secondary klite-modal-close">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Modal event handlers
            modal.querySelector('.klite-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.querySelector('[data-action="file-select"]').addEventListener('change', (e) => {
                this.updateImportPreview(e.target.files, modal);
            });

            modal.querySelector('[data-action="import-confirm"]').addEventListener('click', () => {
                const files = modal.querySelector('[data-action="file-select"]').files;
                const mode = modal.querySelector('input[name="import-mode"]:checked').value;
                
                if (files.length > 0) {
                    this.handleFileImport(Array.from(files), mode);
                    modal.remove();
                }
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        updateImportPreview(files, modal) {
            const fileList = modal.querySelector('[data-preview="file-list"]');
            
            if (files.length === 0) {
                fileList.innerHTML = 'No files selected';
                return;
            }

            fileList.innerHTML = Array.from(files).map(file => `
                <div class="klite-textdb-file-item">
                    <div class="klite-textdb-file-name">${file.name}</div>
                    <div class="klite-textdb-file-size">${this.formatFileSize(file.size)}</div>
                    <div class="klite-textdb-file-type">${file.type || 'text/plain'}</div>
                </div>
            `).join('');
        }

        async handleFileImport(files, mode = 'append') {
            try {
                const validFiles = files.filter(file => {
                    const extension = file.name.split('.').pop().toLowerCase();
                    return ['txt', 'md', 'json'].includes(extension);
                });

                if (validFiles.length === 0) {
                    alert('No valid files selected. Please choose .txt, .md, or .json files.');
                    return;
                }

                let importedContent = '';
                
                for (const file of validFiles) {
                    const content = await this.readFileContent(file);
                    importedContent += `

=== ${file.name} ===

${content}`;
                }

                const currentContent = this.getContent();
                const newContent = mode === 'replace' ? importedContent.trim() : 
                                 (currentContent + importedContent).trim();

                this.setContent(newContent);
                this.updateStats();
                this.refresh();

                alert(`Successfully imported ${validFiles.length} file(s)!`);
            } catch (error) {
                alert('Error importing files: ' + error.message);
            }
        }

        async readFileContent(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    let content = e.target.result;
                    
                    // Try to parse and pretty-print JSON files
                    if (file.name.endsWith('.json')) {
                        try {
                            const jsonData = JSON.parse(content);
                            content = JSON.stringify(jsonData, null, 2);
                        } catch (err) {
                            // If JSON parsing fails, use raw content
                        }
                    }
                    
                    resolve(content);
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        }

        exportDatabase() {
            const content = this.getContent();
            const settings = this.getSettings();
            
            const exportData = {
                content: content,
                settings: settings,
                stats: this.stats,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `textdb-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        clearDatabase() {
            if (confirm('Are you sure you want to clear all text database content? This cannot be undone.')) {
                this.setContent('');
                this.updateStats();
                this.refresh();
            }
        }

        // Statistics and utilities
        updateStats() {
            const content = this.getContent();
            
            this.stats.charCount = content.length;
            this.stats.wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            this.stats.memoryUsage = Math.round((content.length * 2) / 1024); // Rough estimate in KB
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // KoboldAI Lite integration
        initKoboldAIIntegration() {
            // Initialize KoboldAI variables if they don't exist
            if (typeof window.documentdb_enabled === 'undefined') {
                window.documentdb_enabled = false;
            }
            if (typeof window.documentdb_data === 'undefined') {
                window.documentdb_data = '';
            }
            if (typeof window.documentdb_searchhistory === 'undefined') {
                window.documentdb_searchhistory = false;
            }
            if (typeof window.documentdb_numresults === 'undefined') {
                window.documentdb_numresults = 3;
            }
            if (typeof window.documentdb_searchrange === 'undefined') {
                window.documentdb_searchrange = 300;
            }
            if (typeof window.documentdb_chunksize === 'undefined') {
                window.documentdb_chunksize = 800;
            }
        }

        isEnabled() {
            return window.documentdb_enabled || false;
        }

        setEnabled(enabled) {
            window.documentdb_enabled = enabled;
            this.saveKoboldAISettings();
        }

        getContent() {
            return window.documentdb_data || '';
        }

        setContent(content) {
            window.documentdb_data = content;
            this.saveKoboldAISettings();
        }

        getSettings() {
            return {
                searchhistory: window.documentdb_searchhistory || false,
                numresults: window.documentdb_numresults || 3,
                searchrange: window.documentdb_searchrange || 300,
                chunksize: window.documentdb_chunksize || 800
            };
        }

        saveKoboldAISettings() {
            // Trigger KoboldAI Lite's save functions
            if (typeof window.save_settings === 'function') {
                window.save_settings();
            }
            if (typeof window.autosave === 'function') {
                window.autosave();
            }
        }

        refresh() {
            const panel = document.querySelector('[data-panel="textdb"]');
            if (panel) {
                panel.innerHTML = this.render();
                this.postRender();
            }
        }

        saveState() {
            return {
                showAdvanced: this.showAdvanced,
                stats: this.stats
            };
        }

        restoreState(state) {
            if (state.showAdvanced !== undefined) this.showAdvanced = state.showAdvanced;
            if (state.stats) this.stats = state.stats;
        }

        cleanup() {
            clearTimeout(this.saveTimeout);
            this.showAdvanced = false;
            this.stats = { wordCount: 0, charCount: 0, memoryUsage: 0 };
        }
    }

    // =============================================
    // GROUP CHAT PANEL
    // =============================================
    class GroupChatPanel extends KLitePanel {
        constructor() {
            super('groupchat');
            this.displayName = 'Group Chat_WIP';
            this.groupEnabled = false;
            this.groupChars = [];
            this.currentSpeaker = 0;
            this.speakerMode = 'manual'; // manual, roundrobin, random, keyword, weighted, party
            this.autoResponseEnabled = false;
            this.autoResponseDelay = 60; // seconds
            this.autoResponseTimer = null;
            this.userActivityTimer = null;
            this.speakerHistory = [];
            this.roundRobinPosition = 0;
            this.partyRoundChars = [];
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Group Chat Panel');
            
            // Load saved settings
            this.groupEnabled = await this.loadData('groupEnabled') || false;
            this.groupChars = await this.loadData('groupChars') || [];
            this.currentSpeaker = await this.loadData('currentSpeaker') || 0;
            this.speakerMode = await this.loadData('speakerMode') || 'manual';
            this.autoResponseEnabled = await this.loadData('autoResponseEnabled') || false;
            this.autoResponseDelay = await this.loadData('autoResponseDelay') || 60;
            this.speakerHistory = await this.loadData('speakerHistory') || [];
            this.roundRobinPosition = await this.loadData('roundRobinPosition') || 0;
            this.partyRoundChars = await this.loadData('partyRoundChars') || [];
            
            // Initialize KoboldAI integration
            this.initKoboldAIIntegration();
            
            // Start auto-response if enabled
            if (this.groupEnabled && this.autoResponseEnabled) {
                this.startAutoResponse();
            }
        }

        render() {
            return `
                <div class="klite-group-header">
                    <div class="klite-group-toggle">
                        <label>
                            <input type="checkbox" ${this.groupEnabled ? 'checked' : ''} 
                                   data-action="toggle-group">
                            Enable Group Chat
                        </label>
                    </div>
                    
                    ${this.groupEnabled ? this.renderGroupControls() : ''}
                </div>
                
                ${this.groupEnabled ? this.renderCharacterList() : ''}
                ${this.groupEnabled ? this.renderSpeakerControls() : ''}
                ${this.groupEnabled ? this.renderAutoResponseControls() : ''}
            `;
        }

        renderGroupControls() {
            return `
                <div class="klite-group-controls">
                    <div class="klite-group-actions">
                        <button class="klite-btn klite-btn-small" data-action="add-from-library">
                            Add from Library
                        </button>
                        <button class="klite-btn klite-btn-small" data-action="add-custom">
                            Add Custom
                        </button>
                        <button class="klite-btn klite-btn-small" data-action="edit-current">
                            Edit Current
                        </button>
                    </div>
                    
                    <div class="klite-group-info">
                        <span class="klite-group-count">${this.groupChars.length} characters</span>
                        <span class="klite-group-current">
                            Current: ${this.getCurrentSpeakerName()}
                        </span>
                    </div>
                </div>
            `;
        }

        renderCharacterList() {
            if (this.groupChars.length === 0) {
                return `
                    <div class="klite-group-empty">
                        <p>No characters in group. Add characters to start group chat.</p>
                    </div>
                `;
            }

            return `
                <div class="klite-group-chars">
                    ${this.groupChars.map((char, index) => `
                        <div class="klite-group-char ${index === this.currentSpeaker ? 'active' : ''}" 
                             data-char-id="${index}">
                            <div class="klite-group-char-info">
                                <div class="klite-group-char-avatar">
                                    ${char.avatar ? `<img src="${char.avatar}" alt="${char.name}">` : '👤'}
                                </div>
                                <div class="klite-group-char-details">
                                    <div class="klite-group-char-name">${char.name}</div>
                                    <div class="klite-group-char-desc">${char.description || 'No description'}</div>
                                    ${char.isCustom ? '<div class="klite-group-char-custom">Custom</div>' : ''}
                                </div>
                            </div>
                            <div class="klite-group-char-actions">
                                <button class="klite-btn-small" data-action="move-up" data-char-id="${index}">▲</button>
                                <button class="klite-btn-small" data-action="move-down" data-char-id="${index}">▼</button>
                                <button class="klite-btn-small danger" data-action="remove-char" data-char-id="${index}">×</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        renderSpeakerControls() {
            return `
                <div class="klite-group-speaker">
                    <div class="klite-group-speaker-mode">
                        <label>Speaker Mode:</label>
                        <select class="klite-select" data-action="speaker-mode">
                            <option value="manual" ${this.speakerMode === 'manual' ? 'selected' : ''}>Manual Order</option>
                            <option value="roundrobin" ${this.speakerMode === 'roundrobin' ? 'selected' : ''}>Round Robin</option>
                            <option value="random" ${this.speakerMode === 'random' ? 'selected' : ''}>Random Selection</option>
                            <option value="keyword" ${this.speakerMode === 'keyword' ? 'selected' : ''}>Keyword Triggered</option>
                            <option value="weighted" ${this.speakerMode === 'weighted' ? 'selected' : ''}>Talkative Weighted</option>
                            <option value="party" ${this.speakerMode === 'party' ? 'selected' : ''}>Party Round Robin</option>
                        </select>
                    </div>
                    
                    <div class="klite-group-speaker-actions">
                        <button class="klite-btn klite-btn-small" data-action="next-speaker">
                            Next Speaker
                        </button>
                        <button class="klite-btn klite-btn-small klite-btn-primary" data-action="trigger-current">
                            Trigger Current
                        </button>
                    </div>
                </div>
            `;
        }

        renderAutoResponseControls() {
            return `
                <div class="klite-group-auto">
                    <div class="klite-group-auto-toggle">
                        <label>
                            <input type="checkbox" ${this.autoResponseEnabled ? 'checked' : ''} 
                                   data-action="toggle-auto-response">
                            Auto-Response
                        </label>
                    </div>
                    
                    ${this.autoResponseEnabled ? `
                        <div class="klite-group-auto-settings">
                            <div class="klite-group-auto-delay">
                                <label>Delay: <span class="value">${this.autoResponseDelay}s</span></label>
                                <input type="range" min="10" max="300" value="${this.autoResponseDelay}" 
                                       data-action="auto-delay" class="klite-slider">
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Group Chat Panel event handlers');
            
            // Main controls
            document.querySelectorAll('[data-action]').forEach(element => {
                element.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    const charId = e.target.dataset.charId;
                    
                    switch (action) {
                        case 'toggle-group':
                            this.toggleGroup();
                            break;
                        case 'add-from-library':
                            this.showCharacterLibrary();
                            break;
                        case 'add-custom':
                            this.showCustomCharacterModal();
                            break;
                        case 'edit-current':
                            this.editCurrentCharacter();
                            break;
                        case 'remove-char':
                            this.removeCharacter(parseInt(charId));
                            break;
                        case 'move-up':
                            this.moveCharacter(parseInt(charId), -1);
                            break;
                        case 'move-down':
                            this.moveCharacter(parseInt(charId), 1);
                            break;
                        case 'next-speaker':
                            this.nextSpeaker();
                            break;
                        case 'trigger-current':
                            this.triggerCurrentSpeaker();
                            break;
                        case 'toggle-auto-response':
                            this.toggleAutoResponse();
                            break;
                    }
                });
                
                element.addEventListener('change', (e) => {
                    const action = e.target.dataset.action;
                    
                    switch (action) {
                        case 'speaker-mode':
                            this.setSpeakerMode(e.target.value);
                            break;
                        case 'auto-delay':
                            this.setAutoResponseDelay(parseInt(e.target.value));
                            break;
                    }
                });
            });

            // Character selection
            document.querySelectorAll('.klite-group-char').forEach(element => {
                element.addEventListener('click', (e) => {
                    if (!e.target.matches('[data-action]')) {
                        const charId = parseInt(element.dataset.charId);
                        this.setCurrentSpeaker(charId);
                    }
                });
            });

            // Monitor user activity for auto-response
            this.setupUserActivityMonitoring();
        }

        // Core functionality
        toggleGroup() {
            this.groupEnabled = !this.groupEnabled;
            this.saveData('groupEnabled', this.groupEnabled);
            
            if (this.groupEnabled) {
                this.initKoboldAIIntegration();
                if (this.autoResponseEnabled) {
                    this.startAutoResponse();
                }
            } else {
                this.stopAutoResponse();
                this.restoreKoboldAISettings();
            }
            
            this.refresh();
        }

        toggleAutoResponse() {
            this.autoResponseEnabled = !this.autoResponseEnabled;
            this.saveData('autoResponseEnabled', this.autoResponseEnabled);
            
            if (this.autoResponseEnabled && this.groupEnabled) {
                this.startAutoResponse();
            } else {
                this.stopAutoResponse();
            }
            
            this.refresh();
        }

        setSpeakerMode(mode) {
            this.speakerMode = mode;
            this.saveData('speakerMode', mode);
            
            // Reset mode-specific state
            if (mode === 'roundrobin') {
                this.roundRobinPosition = this.currentSpeaker;
                this.saveData('roundRobinPosition', this.roundRobinPosition);
            } else if (mode === 'party') {
                this.partyRoundChars = [];
                this.saveData('partyRoundChars', this.partyRoundChars);
            }
        }

        setAutoResponseDelay(delay) {
            this.autoResponseDelay = delay;
            this.saveData('autoResponseDelay', delay);
            
            // Update display
            const valueSpan = document.querySelector('[data-action="auto-delay"] ~ label .value');
            if (valueSpan) {
                valueSpan.textContent = `${delay}s`;
            }
            
            // Restart timer with new delay
            if (this.autoResponseEnabled) {
                this.startAutoResponse();
            }
        }

        // Character management
        addCharacter(character) {
            this.groupChars.push({
                ...character,
                id: Date.now().toString(),
                talkativeness: character.talkativeness || 50,
                isCustom: character.isCustom || false
            });
            
            this.saveData('groupChars', this.groupChars);
            this.refresh();
        }

        removeCharacter(index) {
            if (confirm('Remove this character from the group?')) {
                this.groupChars.splice(index, 1);
                
                // Adjust current speaker if needed
                if (this.currentSpeaker >= this.groupChars.length) {
                    this.currentSpeaker = Math.max(0, this.groupChars.length - 1);
                    this.saveData('currentSpeaker', this.currentSpeaker);
                }
                
                this.saveData('groupChars', this.groupChars);
                this.refresh();
            }
        }

        moveCharacter(index, direction) {
            const newIndex = index + direction;
            
            if (newIndex >= 0 && newIndex < this.groupChars.length) {
                [this.groupChars[index], this.groupChars[newIndex]] = 
                [this.groupChars[newIndex], this.groupChars[index]];
                
                // Adjust current speaker if needed
                if (this.currentSpeaker === index) {
                    this.currentSpeaker = newIndex;
                } else if (this.currentSpeaker === newIndex) {
                    this.currentSpeaker = index;
                }
                
                this.saveData('groupChars', this.groupChars);
                this.saveData('currentSpeaker', this.currentSpeaker);
                this.refresh();
            }
        }

        setCurrentSpeaker(index) {
            if (index >= 0 && index < this.groupChars.length) {
                this.currentSpeaker = index;
                this.saveData('currentSpeaker', this.currentSpeaker);
                this.updateKoboldAICharacter();
                this.refresh();
            }
        }

        getCurrentSpeakerName() {
            if (this.groupChars.length === 0) return 'None';
            if (this.currentSpeaker >= this.groupChars.length) return 'Invalid';
            return this.groupChars[this.currentSpeaker].name;
        }

        // Speaker management algorithms
        nextSpeaker() {
            if (this.groupChars.length === 0) return;
            
            let nextIndex = this.currentSpeaker;
            
            switch (this.speakerMode) {
                case 'manual':
                    nextIndex = (this.currentSpeaker + 1) % this.groupChars.length;
                    break;
                    
                case 'roundrobin':
                    this.roundRobinPosition = (this.roundRobinPosition + 1) % this.groupChars.length;
                    nextIndex = this.roundRobinPosition;
                    this.saveData('roundRobinPosition', this.roundRobinPosition);
                    break;
                    
                case 'random':
                    nextIndex = this.getRandomSpeaker();
                    break;
                    
                case 'keyword':
                    nextIndex = this.getKeywordSpeaker();
                    break;
                    
                case 'weighted':
                    nextIndex = this.getWeightedSpeaker();
                    break;
                    
                case 'party':
                    nextIndex = this.getPartyRoundSpeaker();
                    break;
            }
            
            this.setCurrentSpeaker(nextIndex);
            this.addToSpeakerHistory(nextIndex);
        }

        getRandomSpeaker() {
            // Avoid recent speakers
            const availableChars = this.groupChars
                .map((char, index) => index)
                .filter(index => !this.speakerHistory.slice(-2).includes(index));
            
            if (availableChars.length === 0) {
                return Math.floor(Math.random() * this.groupChars.length);
            }
            
            return availableChars[Math.floor(Math.random() * availableChars.length)];
        }

        getKeywordSpeaker() {
            // Check recent context for character names
            const recentText = this.getRecentContext();
            
            for (let i = 0; i < this.groupChars.length; i++) {
                const char = this.groupChars[i];
                if (recentText.toLowerCase().includes(char.name.toLowerCase())) {
                    return i;
                }
            }
            
            // Fallback to round robin
            return (this.currentSpeaker + 1) % this.groupChars.length;
        }

        getWeightedSpeaker() {
            const totalWeight = this.groupChars.reduce((sum, char) => sum + (char.talkativeness || 50), 0);
            const random = Math.random() * totalWeight;
            
            let currentWeight = 0;
            for (let i = 0; i < this.groupChars.length; i++) {
                currentWeight += this.groupChars[i].talkativeness || 50;
                if (random <= currentWeight) {
                    return i;
                }
            }
            
            return this.currentSpeaker;
        }

        getPartyRoundSpeaker() {
            // Everyone speaks once before anyone speaks twice
            const availableChars = this.groupChars
                .map((char, index) => index)
                .filter(index => !this.partyRoundChars.includes(index));
            
            if (availableChars.length === 0) {
                // Start new round
                this.partyRoundChars = [];
                this.saveData('partyRoundChars', this.partyRoundChars);
                return 0;
            }
            
            const nextIndex = availableChars[Math.floor(Math.random() * availableChars.length)];
            this.partyRoundChars.push(nextIndex);
            this.saveData('partyRoundChars', this.partyRoundChars);
            
            return nextIndex;
        }

        addToSpeakerHistory(speakerIndex) {
            this.speakerHistory.push(speakerIndex);
            
            // Keep only last 10 speakers
            if (this.speakerHistory.length > 10) {
                this.speakerHistory = this.speakerHistory.slice(-10);
            }
            
            this.saveData('speakerHistory', this.speakerHistory);
        }

        triggerCurrentSpeaker() {
            if (this.groupChars.length === 0) return;
            
            // Submit current message or trigger AI response
            const inputElement = document.getElementById('input_text');
            if (inputElement && window.submit) {
                window.submit();
            }
        }

        // Auto-response system
        startAutoResponse() {
            this.stopAutoResponse();
            
            if (this.groupChars.length === 0) return;
            
            this.autoResponseTimer = setTimeout(() => {
                if (this.groupEnabled && this.autoResponseEnabled) {
                    this.nextSpeaker();
                    this.triggerCurrentSpeaker();
                    this.startAutoResponse(); // Restart timer
                }
            }, this.autoResponseDelay * 1000);
        }

        stopAutoResponse() {
            if (this.autoResponseTimer) {
                clearTimeout(this.autoResponseTimer);
                this.autoResponseTimer = null;
            }
        }

        setupUserActivityMonitoring() {
            const inputElement = document.getElementById('input_text');
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    this.onUserActivity();
                });
                
                inputElement.addEventListener('keydown', () => {
                    this.onUserActivity();
                });
            }
        }

        onUserActivity() {
            // Pause auto-response when user is typing
            if (this.autoResponseTimer) {
                clearTimeout(this.autoResponseTimer);
                this.autoResponseTimer = null;
            }
            
            // Restart auto-response after user stops typing
            clearTimeout(this.userActivityTimer);
            this.userActivityTimer = setTimeout(() => {
                if (this.groupEnabled && this.autoResponseEnabled) {
                    this.startAutoResponse();
                }
            }, 3000); // 3 second delay after user stops typing
        }

        // Character modal system
        showCharacterLibrary() {
            // Get characters from the character panel if available
            const characterPanel = KLiteModular.activePanels.get('characters');
            if (!characterPanel) {
                alert('Character panel not available. Please add characters to the Characters panel first.');
                return;
            }

            const availableChars = characterPanel.characters || [];
            
            if (availableChars.length === 0) {
                alert('No characters available. Please add characters to the Characters panel first.');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'klite-modal-overlay';
            modal.innerHTML = `
                <div class="klite-modal klite-group-char-modal">
                    <div class="klite-modal-header">
                        <h3>Add Character from Library</h3>
                        <button class="klite-modal-close">×</button>
                    </div>
                    <div class="klite-modal-content">
                        <div class="klite-group-char-grid">
                            ${availableChars.map(char => `
                                <div class="klite-group-char-option" data-char-id="${char.id}">
                                    <div class="klite-group-char-avatar">
                                        ${char.image ? `<img src="${char.image}" alt="${char.name}">` : '👤'}
                                    </div>
                                    <div class="klite-group-char-name">${char.name}</div>
                                    <div class="klite-group-char-desc">${char.description || 'No description'}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn klite-btn-primary" data-action="confirm-selection">
                            Add Selected
                        </button>
                        <button class="klite-btn klite-btn-secondary klite-modal-close">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle character selection
            let selectedChar = null;
            modal.querySelectorAll('.klite-group-char-option').forEach(option => {
                option.addEventListener('click', () => {
                    modal.querySelectorAll('.klite-group-char-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedChar = availableChars.find(c => c.id == option.dataset.charId);
                });
            });

            // Modal event handlers
            modal.querySelector('.klite-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.querySelector('[data-action="confirm-selection"]').addEventListener('click', () => {
                if (selectedChar) {
                    this.addCharacter({
                        name: selectedChar.name,
                        description: selectedChar.description,
                        avatar: selectedChar.image,
                        talkativeness: 50,
                        isCustom: false
                    });
                    modal.remove();
                }
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        showCustomCharacterModal(editChar = null) {
            const isEdit = editChar !== null;
            const charData = editChar || {
                name: '',
                description: '',
                avatar: '',
                talkativeness: 50
            };

            const modal = document.createElement('div');
            modal.className = 'klite-modal-overlay';
            modal.innerHTML = `
                <div class="klite-modal klite-group-custom-modal">
                    <div class="klite-modal-header">
                        <h3>${isEdit ? 'Edit' : 'Create'} Custom Character</h3>
                        <button class="klite-modal-close">×</button>
                    </div>
                    <div class="klite-modal-content">
                        <div class="klite-group-custom-field">
                            <label>Character Name:</label>
                            <input type="text" class="klite-input" data-field="name" 
                                   value="${charData.name}" placeholder="Enter character name">
                        </div>
                        
                        <div class="klite-group-custom-field">
                            <label>Description:</label>
                            <textarea class="klite-textarea" data-field="description" 
                                      rows="3" placeholder="Enter character description">${charData.description}</textarea>
                        </div>
                        
                        <div class="klite-group-custom-field">
                            <label>Avatar URL:</label>
                            <input type="text" class="klite-input" data-field="avatar" 
                                   value="${charData.avatar}" placeholder="Enter avatar URL (optional)">
                        </div>
                        
                        <div class="klite-group-custom-field">
                            <label>Talkativeness: <span class="value">${charData.talkativeness}</span></label>
                            <input type="range" min="1" max="100" value="${charData.talkativeness}" 
                                   data-field="talkativeness" class="klite-slider">
                            <small>How likely this character is to speak in weighted mode</small>
                        </div>
                    </div>
                    <div class="klite-modal-footer">
                        <button class="klite-btn klite-btn-primary" data-action="save-custom">
                            ${isEdit ? 'Update' : 'Create'} Character
                        </button>
                        <button class="klite-btn klite-btn-secondary klite-modal-close">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Update talkativeness display
            const talkSlider = modal.querySelector('[data-field="talkativeness"]');
            const talkValue = modal.querySelector('.value');
            talkSlider.addEventListener('input', (e) => {
                talkValue.textContent = e.target.value;
            });

            // Modal event handlers
            modal.querySelector('.klite-modal-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.querySelector('[data-action="save-custom"]').addEventListener('click', () => {
                const name = modal.querySelector('[data-field="name"]').value.trim();
                const description = modal.querySelector('[data-field="description"]').value.trim();
                const avatar = modal.querySelector('[data-field="avatar"]').value.trim();
                const talkativeness = parseInt(modal.querySelector('[data-field="talkativeness"]').value);

                if (!name) {
                    alert('Character name is required');
                    return;
                }

                if (isEdit) {
                    // Update existing character
                    const charIndex = this.groupChars.indexOf(editChar);
                    if (charIndex !== -1) {
                        this.groupChars[charIndex] = {
                            ...this.groupChars[charIndex],
                            name,
                            description,
                            avatar,
                            talkativeness
                        };
                        this.saveData('groupChars', this.groupChars);
                        this.refresh();
                    }
                } else {
                    // Create new character
                    this.addCharacter({
                        name,
                        description,
                        avatar,
                        talkativeness,
                        isCustom: true
                    });
                }

                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        editCurrentCharacter() {
            if (this.groupChars.length === 0) return;
            
            const currentChar = this.groupChars[this.currentSpeaker];
            if (currentChar && currentChar.isCustom) {
                this.showCustomCharacterModal(currentChar);
            } else {
                alert('Only custom characters can be edited');
            }
        }

        // KoboldAI integration
        initKoboldAIIntegration() {
            if (this.groupEnabled && this.groupChars.length > 0) {
                // Force chat mode
                if (window.localsettings) {
                    window.localsettings.opmode = 3; // Chat mode
                }
                
                this.updateKoboldAICharacter();
            }
        }

        updateKoboldAICharacter() {
            if (this.groupChars.length === 0) return;
            
            const currentChar = this.groupChars[this.currentSpeaker];
            if (!currentChar) return;
            
            // Update character name in KoboldAI
            if (window.localsettings) {
                window.localsettings.character = currentChar.name;
            }
            
            // Update UI if available
            const charInput = document.getElementById('character_name');
            if (charInput) {
                charInput.value = currentChar.name;
            }
        }

        restoreKoboldAISettings() {
            // Restore original settings when group chat is disabled
            if (window.localsettings) {
                // Don't force chat mode anymore
                // User can change mode manually
            }
        }

        getRecentContext() {
            // Get recent conversation context for keyword detection
            if (window.gametext_arr && window.gametext_arr.length > 0) {
                return window.gametext_arr.slice(-3).join(' ');
            }
            return '';
        }

        refresh() {
            const panel = document.querySelector('[data-panel="groupchat"]');
            if (panel) {
                panel.innerHTML = this.render();
                this.postRender();
            }
        }

        saveState() {
            return {
                groupEnabled: this.groupEnabled,
                groupChars: this.groupChars,
                currentSpeaker: this.currentSpeaker,
                speakerMode: this.speakerMode,
                autoResponseEnabled: this.autoResponseEnabled,
                autoResponseDelay: this.autoResponseDelay,
                speakerHistory: this.speakerHistory,
                roundRobinPosition: this.roundRobinPosition,
                partyRoundChars: this.partyRoundChars
            };
        }

        restoreState(state) {
            if (state.groupEnabled !== undefined) this.groupEnabled = state.groupEnabled;
            if (state.groupChars) this.groupChars = state.groupChars;
            if (state.currentSpeaker !== undefined) this.currentSpeaker = state.currentSpeaker;
            if (state.speakerMode) this.speakerMode = state.speakerMode;
            if (state.autoResponseEnabled !== undefined) this.autoResponseEnabled = state.autoResponseEnabled;
            if (state.autoResponseDelay !== undefined) this.autoResponseDelay = state.autoResponseDelay;
            if (state.speakerHistory) this.speakerHistory = state.speakerHistory;
            if (state.roundRobinPosition !== undefined) this.roundRobinPosition = state.roundRobinPosition;
            if (state.partyRoundChars) this.partyRoundChars = state.partyRoundChars;
        }

        cleanup() {
            this.stopAutoResponse();
            clearTimeout(this.userActivityTimer);
            this.groupEnabled = false;
            this.groupChars = [];
            this.currentSpeaker = 0;
            this.speakerHistory = [];
            this.roundRobinPosition = 0;
            this.partyRoundChars = [];
        }
    }

    // =============================================
    // HELP & REFERENCE PANEL
    // =============================================
    class HelpReferencePanel extends KLitePanel {
        constructor() {
            super('helpreference');
            this.displayName = 'Help & Reference_WIP';
            this.searchTerm = '';
            this.selectedCategory = 'all';
            this.sortBy = 'relevance';
            this.helpDatabase = this.initializeHelpDatabase();
        }

        async init() {
            KLiteModular.log('panels', 'Initializing Help & Reference Panel');
            // No async initialization needed
        }

        initializeHelpDatabase() {
            return {
                rpmod: [
                    {
                        title: "Getting Started with RPMod",
                        category: "RPMod",
                        content: "RPMod enhances KoboldAI Lite with additional features for roleplaying and storytelling. Access panels through aesthetic mode.",
                        keywords: ["setup", "installation", "getting started", "rpmod"]
                    },
                    {
                        title: "Character Management",
                        category: "RPMod",
                        content: "Import characters from PNG files, manage character cards, and organize your character library with ratings and categories.",
                        keywords: ["characters", "import", "export", "character cards"]
                    },
                    {
                        title: "Memory & Context",
                        category: "RPMod",
                        content: "Manage AI memory, author's notes, and context optimization. Use the Context Analyzer to monitor token usage.",
                        keywords: ["memory", "context", "tokens", "author note"]
                    }
                ],
                koboldcpp: [
                    {
                        title: "Temperature Setting",
                        category: "KoboldCpp",
                        content: "Controls randomness in AI responses. Higher values (0.8-1.0) = more creative, lower values (0.1-0.5) = more focused.",
                        keywords: ["temperature", "randomness", "creativity", "settings"]
                    },
                    {
                        title: "Top-p Sampling",
                        category: "KoboldCpp",
                        content: "Nucleus sampling technique. Values around 0.9 work well for most use cases. Lower values make output more predictable.",
                        keywords: ["top-p", "nucleus", "sampling", "predictability"]
                    },
                    {
                        title: "Repetition Penalty",
                        category: "KoboldCpp",
                        content: "Reduces repetitive text. Values between 1.0-1.15 are recommended. Higher values may break coherence.",
                        keywords: ["repetition", "penalty", "coherence", "text quality"]
                    }
                ],
                dnd: [
                    {
                        title: "Ability Scores",
                        category: "D&D",
                        content: "Six core abilities: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. Range from 3-18 for most characters.",
                        keywords: ["abilities", "stats", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
                    },
                    {
                        title: "Dice Rolling",
                        category: "D&D",
                        content: "d20 system uses twenty-sided dice for most checks. Add ability modifier + proficiency bonus when applicable.",
                        keywords: ["dice", "d20", "rolling", "checks", "modifiers"]
                    },
                    {
                        title: "Armor Class",
                        category: "D&D",
                        content: "AC determines how hard you are to hit. Base AC = 10 + Dex modifier + armor bonus + shield bonus + other modifiers.",
                        keywords: ["armor", "ac", "defense", "protection", "combat"]
                    }
                ]
            };
        }

        render() {
            const filteredResults = this.searchEntries();
            
            return `
                <div class="klite-help-search">
                    <input type="text" class="klite-input" id="help-search-input" 
                           placeholder="Search help & reference..." 
                           value="${this.searchTerm}">
                </div>
                <div class="klite-help-filters">
                    <select class="klite-select" id="help-category-filter">
                        <option value="all">All Categories</option>
                        <option value="rpmod" ${this.selectedCategory === 'rpmod' ? 'selected' : ''}>RPMod</option>
                        <option value="koboldcpp" ${this.selectedCategory === 'koboldcpp' ? 'selected' : ''}>KoboldCpp</option>
                        <option value="dnd" ${this.selectedCategory === 'dnd' ? 'selected' : ''}>D&D</option>
                    </select>
                    <select class="klite-select" id="help-sort-filter">
                        <option value="relevance" ${this.sortBy === 'relevance' ? 'selected' : ''}>Relevance</option>
                        <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Title</option>
                        <option value="category" ${this.sortBy === 'category' ? 'selected' : ''}>Category</option>
                    </select>
                </div>
                <div class="klite-help-results">
                    ${filteredResults.length > 0 ? 
                        filteredResults.map(entry => `
                            <div class="klite-help-entry" data-entry-id="${entry.id}">
                                <div class="klite-help-title">${this.highlightSearch(entry.title)}</div>
                                <div class="klite-help-category">${entry.category}</div>
                                <div class="klite-help-preview">${this.highlightSearch(entry.content.substring(0, 100))}...</div>
                            </div>
                        `).join('') : 
                        '<div class="klite-empty-state">No results found</div>'
                    }
                </div>
            `;
        }

        postRender() {
            KLiteModular.log('panels', 'Setting up Help & Reference Panel event handlers');
            
            // Search input
            const searchInput = document.getElementById('help-search-input');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchTerm = e.target.value;
                        this.refresh();
                    }, 300);
                });
            }

            // Category filter
            const categoryFilter = document.getElementById('help-category-filter');
            if (categoryFilter) {
                categoryFilter.addEventListener('change', (e) => {
                    this.selectedCategory = e.target.value;
                    this.refresh();
                });
            }

            // Sort filter
            const sortFilter = document.getElementById('help-sort-filter');
            if (sortFilter) {
                sortFilter.addEventListener('change', (e) => {
                    this.sortBy = e.target.value;
                    this.refresh();
                });
            }

            // Entry clicks
            document.querySelectorAll('.klite-help-entry').forEach(entry => {
                entry.addEventListener('click', () => {
                    const entryId = entry.dataset.entryId;
                    this.showEntryModal(entryId);
                });
            });
        }

        searchEntries() {
            let allEntries = [];
            
            // Collect all entries with IDs
            Object.keys(this.helpDatabase).forEach(category => {
                this.helpDatabase[category].forEach((entry, index) => {
                    allEntries.push({
                        ...entry,
                        id: `${category}-${index}`,
                        relevance: this.calculateRelevance(entry)
                    });
                });
            });

            // Filter by category
            if (this.selectedCategory !== 'all') {
                allEntries = allEntries.filter(entry => entry.category.toLowerCase() === this.selectedCategory);
            }

            // Filter by search term
            if (this.searchTerm) {
                allEntries = allEntries.filter(entry => 
                    entry.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                    entry.content.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                    entry.keywords.some(keyword => keyword.toLowerCase().includes(this.searchTerm.toLowerCase()))
                );
            }

            // Sort results
            allEntries.sort((a, b) => {
                switch (this.sortBy) {
                    case 'title':
                        return a.title.localeCompare(b.title);
                    case 'category':
                        return a.category.localeCompare(b.category);
                    case 'relevance':
                    default:
                        return b.relevance - a.relevance;
                }
            });

            return allEntries;
        }

        calculateRelevance(entry) {
            if (!this.searchTerm) return 0;
            
            const searchLower = this.searchTerm.toLowerCase();
            let score = 0;
            
            // Title match (highest weight)
            if (entry.title.toLowerCase().includes(searchLower)) score += 10;
            
            // Keyword match (medium weight)
            entry.keywords.forEach(keyword => {
                if (keyword.toLowerCase().includes(searchLower)) score += 5;
            });
            
            // Content match (lower weight)
            if (entry.content.toLowerCase().includes(searchLower)) score += 1;
            
            return score;
        }

        highlightSearch(text) {
            if (!this.searchTerm) return text;
            
            const regex = new RegExp(`(${this.searchTerm})`, 'gi');
            return text.replace(regex, '<mark style="background: var(--klite-primary-color); color: white;">$1</mark>');
        }

        showEntryModal(entryId) {
            const [category, index] = entryId.split('-');
            const entry = this.helpDatabase[category][parseInt(index)];
            
            if (!entry) return;

            const modal = document.createElement('div');
            modal.className = 'klite-help-modal';
            modal.innerHTML = `
                <div class="klite-help-modal-content">
                    <div class="klite-help-modal-header">
                        <h3>${entry.title}</h3>
                        <button class="klite-help-modal-close">&times;</button>
                    </div>
                    <div class="klite-help-modal-body">
                        <div class="klite-help-modal-category">${entry.category}</div>
                        <div class="klite-help-modal-text">${entry.content}</div>
                        <div class="klite-help-modal-keywords">
                            <strong>Keywords:</strong> ${entry.keywords.join(', ')}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            
            // Close modal handlers
            const closeBtn = modal.querySelector('.klite-help-modal-close');
            closeBtn.addEventListener('click', () => modal.remove());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }

        refresh() {
            const panel = document.querySelector('[data-panel="helpreference"]');
            if (panel) {
                panel.innerHTML = this.render();
                this.postRender();
            }
        }

        saveState() {
            return {
                searchTerm: this.searchTerm,
                selectedCategory: this.selectedCategory,
                sortBy: this.sortBy
            };
        }

        restoreState(state) {
            if (state.searchTerm) this.searchTerm = state.searchTerm;
            if (state.selectedCategory) this.selectedCategory = state.selectedCategory;
            if (state.sortBy) this.sortBy = state.sortBy;
        }

        cleanup() {
            // Remove any open modals
            document.querySelectorAll('.klite-help-modal').forEach(modal => modal.remove());
        }
    }

    // =============================================
    // PHASE 6 & 7 MOCKUP PANELS (WIP)
    // =============================================

    // Character & Persona Integration Panel
    class CharacterPersonaIntegrationPanel extends KLitePanel {
        constructor() {
            super('characterpersona');
            this.displayName = 'Character & Persona Integration_WIP';
            this.currentCharacter = null;
            this.personaSettings = {};
            this.behaviorPatterns = [];
        }

        async init() {
            // Load character persona data
            this.personaSettings = await this.loadData('persona_settings') || {};
            this.behaviorPatterns = await this.loadData('behavior_patterns') || [];
            KLiteModular.log('characterpersona', 'Character & Persona Integration panel initialized');
        }

        render() {
            return `
                <div class="klite-character-persona-panel">
                    <h3>Character & Persona Integration</h3>
                    <div class="klite-mockup-notice">
                        <div class="klite-mockup-badge">WIP</div>
                        <p>Ported from ALPHA - UI complete, functionality pending</p>
                    </div>
                    
                    <div class="klite-char-persona-controls">
                        <div class="klite-persona-section" style="margin-bottom: 15px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--klite-text);">Username (for the human player):</label>
                                <input type="text" id="rp-user-name" class="klite-input" style="width: 100%; margin-bottom: 8px;">
                                
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <input type="checkbox" id="persona-enabled" class="klite-checkbox">
                                    <label for="persona-enabled">Enable User Character</label>
                                </div>
                                
                                <div class="persona-controls" style="opacity: 0.5; pointer-events: none;">
                                    <div style="text-align: center; padding: 20px;">
                                        <button class="klite-btn klite-btn-primary" data-action="select-persona" style="font-size: 14px; padding: 12px 24px;">
                                            📋 Select Character
                                        </button>
                                        <div style="margin-top: 8px; font-size: 11px; color: var(--klite-text-muted);">
                                            Choose a character for the user to roleplay
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="klite-character-section" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: var(--klite-text);">Charactername (for the AI):</label>
                                <input type="text" id="rp-ai-name" class="klite-input" style="width: 100%; margin-bottom: 8px;">
                                
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <input type="checkbox" id="character-enabled" class="klite-checkbox">
                                    <label for="character-enabled">Enable AI Character</label>
                                </div>
                                
                                <div class="character-controls" style="opacity: 0.5; pointer-events: none;">
                                    <div style="text-align: center; padding: 20px;">
                                        <button class="klite-btn klite-btn-primary" data-action="select-character" style="font-size: 14px; padding: 12px 24px;">
                                            📋 Select Character
                                        </button>
                                        <div style="margin-top: 8px; font-size: 11px; color: var(--klite-text-muted);">
                                            Choose a character for the AI to roleplay
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        postRender() {
            // Setup mockup event handlers
            KLiteModular.log('characterpersona', 'Mockup event handlers setup');
        }

        saveState() {
            return {
                currentCharacter: this.currentCharacter,
                personaSettings: this.personaSettings
            };
        }

        restoreState(state) {
            if (state.currentCharacter) this.currentCharacter = state.currentCharacter;
            if (state.personaSettings) this.personaSettings = state.personaSettings;
        }

        cleanup() {
            KLiteModular.log('characterpersona', 'Mockup cleanup');
        }
    }

    // Narrator Controls Panel
    class NarratorControlsPanel extends KLitePanel {
        constructor() {
            super('narratorcontrols');
            this.displayName = 'Narrator Controls_WIP';
            this.perspective = '3rd';
            this.narrativeVoice = 'neutral';
            this.pacing = 'medium';
        }

        async init() {
            // Load narrator settings
            const saved = await this.loadData('narrator_settings') || {};
            this.perspective = saved.perspective || '3rd';
            this.narrativeVoice = saved.narrativeVoice || 'neutral';
            this.pacing = saved.pacing || 'medium';
            KLiteModular.log('narratorcontrols', 'Narrator Controls panel initialized');
        }

        render() {
            return `
                <div class="klite-narrator-controls-panel">
                    <h3>Narrator Controls</h3>
                    <div class="klite-mockup-notice">
                        <div class="klite-mockup-badge">WIP</div>
                        <p>Ported from ALPHA - UI complete, functionality pending</p>
                    </div>
                    
                    <div class="klite-narrator-controls">
                        <div class="klite-row">
                            <select id="narrator-style" class="klite-select">
                                <option value="omniscient" ${this.perspective === 'omniscient' ? 'selected' : ''}>Omniscient</option>
                                <option value="limited" ${this.perspective === 'limited' ? 'selected' : ''}>Limited</option>
                                <option value="objective" ${this.perspective === 'objective' ? 'selected' : ''}>Objective</option>
                                <option value="character" ${this.perspective === 'character' ? 'selected' : ''}>Character POV</option>
                            </select>
                        </div>
                        <div class="klite-row" style="margin-top: 6px;">
                            <select id="narrator-focus" class="klite-select">
                                <option value="environment" ${this.narrativeVoice === 'environment' ? 'selected' : ''}>Environment</option>
                                <option value="emotions" ${this.narrativeVoice === 'emotions' ? 'selected' : ''}>Emotions</option>
                                <option value="action" ${this.narrativeVoice === 'action' ? 'selected' : ''}>Actions</option>
                                <option value="dialogue" ${this.narrativeVoice === 'dialogue' ? 'selected' : ''}>Dialogue</option>
                                <option value="mixed" ${this.narrativeVoice === 'mixed' ? 'selected' : ''}>Mixed</option>
                            </select>
                        </div>
                        <div class="klite-narrator-explanation" style="margin: 8px 0; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px; color: var(--klite-text-muted);">
                            <div id="narrator-explanation-text">
                                <strong>Omniscient:</strong> The narrator knows all characters' thoughts and can see everything happening in the scene. Will generate comprehensive descriptions of environment, emotions, and actions.
                            </div>
                        </div>
                        <div class="klite-row" style="margin-top: 10px;">
                            <button class="klite-btn klite-btn-primary" data-action="narrator">
                                🎬 Trigger Narrator
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        postRender() {
            // Setup mockup event handlers
            KLiteModular.log('narratorcontrols', 'Mockup event handlers setup');
        }

        saveState() {
            return {
                perspective: this.perspective,
                narrativeVoice: this.narrativeVoice,
                pacing: this.pacing
            };
        }

        restoreState(state) {
            if (state.perspective) this.perspective = state.perspective;
            if (state.narrativeVoice) this.narrativeVoice = state.narrativeVoice;
            if (state.pacing) this.pacing = state.pacing;
        }

        cleanup() {
            KLiteModular.log('narratorcontrols', 'Mockup cleanup');
        }
    }

    // Advanced Visual Style Panel
    class AdvancedVisualStylePanel extends KLitePanel {
        constructor() {
            super('advancedvisualstyle');
            this.displayName = 'Advanced Visual Style_WIP';
            this.currentTheme = 'dark';
            this.customColors = {};
            this.fontSize = 16;
            this.panelOpacity = 0.9;
        }

        async init() {
            // Load visual style settings
            const saved = await this.loadData('visual_style_settings') || {};
            this.currentTheme = saved.currentTheme || 'dark';
            this.customColors = saved.customColors || {};
            this.fontSize = saved.fontSize || 16;
            this.panelOpacity = saved.panelOpacity || 0.9;
            KLiteModular.log('advancedvisualstyle', 'Advanced Visual Style panel initialized');
        }

        render() {
            return `
                <div class="klite-advanced-visual-style-panel">
                    <h3>🌈 Visual Style</h3>
                    <div class="klite-mockup-notice">
                        <div class="klite-mockup-badge">WIP</div>
                        <p>Ported from ALPHA - UI complete, functionality pending</p>
                    </div>
                    
                    <div class="klite-visual-style-controls">
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <input type="checkbox" id="auto-ambient-color" class="klite-checkbox">
                            <label for="auto-ambient-color">Auto-generate ambient color</label>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--klite-text);">Theme:</label>
                            <select id="visual-theme" class="klite-select">
                                <option value="default" ${this.currentTheme === 'default' ? 'selected' : ''}>Default (No Colors)</option>
                                <option value="custom" ${this.currentTheme === 'custom' ? 'selected' : ''}>Custom</option>
                                <option value="blue" ${this.currentTheme === 'blue' ? 'selected' : ''}>Blue/Dark</option>
                                <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Sandstorm</option>
                                <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Full Dark Mode</option>
                                <option value="corpo" ${this.currentTheme === 'corpo' ? 'selected' : ''}>Corpo Mode</option>
                                <option value="coder" ${this.currentTheme === 'coder' ? 'selected' : ''}>Coder (Matrix Green)</option>
                                <option value="rainbow" ${this.currentTheme === 'rainbow' ? 'selected' : ''}>Candy UI</option>
                                <option value="pink" ${this.currentTheme === 'pink' ? 'selected' : ''}>Pink Edition</option>
                                <option value="transparent" ${this.currentTheme === 'transparent' ? 'selected' : ''}>Transparent Edition</option>
                            </select>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--klite-text);">Ambient color:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <div id="ambient-color-preview" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--klite-border); background-color: #4a9eff;"></div>
                                <input type="color" id="ambient-color-picker" value="#4a9eff" style="width: 40px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
                            </div>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--klite-text);">Highlight color:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <div id="highlight-color-preview" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--klite-border); background-color: #5cbc5c;"></div>
                                <input type="color" id="highlight-color-picker" value="#5cbc5c" style="width: 40px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
                            </div>
                        </div>
                        <div class="klite-row" style="margin-bottom: 8px;">
                            <label style="margin-right: 8px; font-size: 12px; color: var(--klite-text);">Lightness:</label>
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <span style="font-size: 11px; color: var(--klite-text-muted);">Dark</span>
                                <input type="range" id="ambient-lightness" min="0" max="100" value="50" class="klite-slider" style="flex: 1;">
                                <span style="font-size: 11px; color: var(--klite-text-muted);">Light</span>
                                <span id="ambient-lightness-display" style="font-size: 11px; color: var(--klite-text-muted); min-width: 30px;">50</span>
                            </div>
                        </div>
                        <div id="ambient-status" style="font-size: 11px; color: var(--klite-text-muted); margin-top: 4px;">
                            No environment detected
                        </div>
                    </div>
                </div>
            `;
        }

        postRender() {
            // Setup mockup event handlers
            KLiteModular.log('advancedvisualstyle', 'Mockup event handlers setup');
        }

        saveState() {
            return {
                currentTheme: this.currentTheme,
                customColors: this.customColors,
                fontSize: this.fontSize,
                panelOpacity: this.panelOpacity
            };
        }

        restoreState(state) {
            if (state.currentTheme) this.currentTheme = state.currentTheme;
            if (state.customColors) this.customColors = state.customColors;
            if (state.fontSize) this.fontSize = state.fontSize;
            if (state.panelOpacity) this.panelOpacity = state.panelOpacity;
        }

        cleanup() {
            KLiteModular.log('advancedvisualstyle', 'Mockup cleanup');
        }
    }

    // Image Generation Panel
    class ImageGenerationPanel extends KLitePanel {
        constructor() {
            super('imagegeneration');
            this.displayName = 'Image Generation_WIP';
            this.selectedProvider = 'dall-e';
            this.promptTemplates = [];
            this.generationHistory = [];
        }

        async init() {
            // Load image generation settings
            const saved = await this.loadData('image_generation_settings') || {};
            this.selectedProvider = saved.selectedProvider || 'dall-e';
            this.promptTemplates = saved.promptTemplates || [];
            this.generationHistory = saved.generationHistory || [];
            KLiteModular.log('imagegeneration', 'Image Generation panel initialized');
        }

        render() {
            return `
                <div class="klite-image-generation-panel">
                    <h3>🎨 Image Generation</h3>
                    <div class="klite-mockup-notice">
                        <div class="klite-mockup-badge">WIP</div>
                        <p>Ported from ALPHA - UI complete, functionality pending</p>
                    </div>
                    
                    <div class="klite-image-status" style="margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">Image Generation Status</div>
                        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                            <div>
                                <span style="color: var(--klite-text-muted);">Provider:</span>
                                <span id="scene-mode-status" style="color: var(--klite-text); font-weight: bold;">${this.selectedProvider}</span>
                            </div>
                            <div>
                                <span style="color: var(--klite-text-muted);">Model:</span>
                                <span id="scene-model-status" style="color: var(--klite-text); font-weight: bold;">Default</span>
                            </div>
                        </div>
                    </div>

                    <div class="klite-image-controls" style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 12px;">Auto-generate:</label>
                        <select id="scene-autogen" class="klite-select">
                            <option value="0" selected>Disabled</option>
                            <option value="1">Immersive Mode</option>
                            <option value="2">All Messages</option>
                            <option value="3">User Messages Only</option>
                            <option value="4">Non-User Messages Only</option>
                        </select>
                        <div style="margin-top: 8px;">
                            <input type="checkbox" id="scene-detect" class="klite-checkbox">
                            <label for="scene-detect">Detect ImgGen Instructions</label>
                        </div>
                    </div>

                    <div class="klite-image-generation-section">
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Scene & Characters</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 10px;">
                            <button class="klite-btn klite-btn-sm" data-action="gen-scene">🌞️ Current Scene</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-ai-portrait">🤖 AI Character</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-user-portrait">👤 Persona</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-group">👥 Group Shot</button>
                        </div>
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Events & Actions</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; margin-bottom: 10px;">
                            <button class="klite-btn klite-btn-sm" data-action="gen-combat">⚔️ Combat</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-dialogue">💬 Dialogue</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-dramatic">🎭 Plot</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-atmosphere">🌅 Atmosphere</button>
                        </div>
                        <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold;">Context-Based</div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px;">
                            <button class="klite-btn klite-btn-sm" data-action="gen-memory">📝 Memory</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-last-message">📄 Last Message</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-recent">🔄 Recent Events</button>
                            <button class="klite-btn klite-btn-sm" data-action="gen-custom">🎯 Custom</button>
                        </div>
                    </div>
                </div>
            `;
        }

        postRender() {
            // Setup mockup event handlers
            KLiteModular.log('imagegeneration', 'Mockup event handlers setup');
        }

        saveState() {
            return {
                selectedProvider: this.selectedProvider,
                promptTemplates: this.promptTemplates,
                generationHistory: this.generationHistory
            };
        }

        restoreState(state) {
            if (state.selectedProvider) this.selectedProvider = state.selectedProvider;
            if (state.promptTemplates) this.promptTemplates = state.promptTemplates;
            if (state.generationHistory) this.generationHistory = state.generationHistory;
        }

        cleanup() {
            KLiteModular.log('imagegeneration', 'Mockup cleanup');
        }
    }

    // Scene Setup Panel
    class SceneSetupPanel extends KLitePanel {
        constructor() {
            super('scenesetup');
            this.displayName = 'Scene Setup_WIP';
            this.genericPresets = [];
            this.detailedPresets = [];
            this.currentScene = null;
        }

        async init() {
            // Load scene setup data
            const saved = await this.loadData('scene_setup_data') || {};
            this.genericPresets = saved.genericPresets || [];
            this.detailedPresets = saved.detailedPresets || [];
            this.currentScene = saved.currentScene || null;
            KLiteModular.log('scenesetup', 'Scene Setup panel initialized');
        }

        render() {
            return `
                <div class="klite-scene-setup-panel">
                    <h3>Scene Setup</h3>
                    <div class="klite-mockup-notice">
                        <div class="klite-mockup-badge">WIP</div>
                        <p>Ported from ALPHA - UI complete, functionality pending</p>
                    </div>
                    
                    <div style="margin-bottom: 12px; font-size: 11px; color: var(--klite-text-muted);">
                        Presets below build a scene description here for your convenience.
                    </div>
                    <textarea id="scene-desc" class="klite-textarea" placeholder="Scene description will auto-generate here..." style="min-height: 200px !important;"></textarea>
                    <div class="klite-buttons-fill klite-mt" style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="klite-btn klite-btn-primary" data-action="append-scene" style="flex: 1;">Append to Memory</button>
                        <button class="klite-btn klite-btn-primary" data-action="apply-scene" style="flex: 1;">Append to Context</button>
                    </div>
                    
                    <div class="klite-scene-controls" style="margin-top: 16px;">
                        <div class="klite-scene-control-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label class="klite-scene-label" style="min-width: 70px; font-size: 12px; color: var(--klite-text-muted);">Location:</label>
                            <select id="scene-location" class="klite-select">
                                <option value="Forest">Forest</option>
                                <option value="Plains">Plains</option>
                                <option value="Desert">Desert</option>
                                <option value="Mountain">Mountain</option>
                                <option value="Coast">Coast</option>
                                <option value="Swamp">Swamp</option>
                                <option value="Cave">Cave</option>
                                <option value="Ruins">Ruins</option>
                                <option value="Castle">Castle</option>
                                <option value="Village">Village</option>
                                <option value="City">City</option>
                                <option value="Tavern">Tavern</option>
                                <option value="Temple">Temple</option>
                                <option value="Dungeon">Dungeon</option>
                                <option value="Ship">Ship</option>
                                <option value="Road">Road</option>
                                <option value="Bridge">Bridge</option>
                                <option value="Tower">Tower</option>
                                <option value="Garden">Garden</option>
                                <option value="Library">Library</option>
                            </select>
                        </div>
                        <div class="klite-scene-control-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label class="klite-scene-label" style="min-width: 70px; font-size: 12px; color: var(--klite-text-muted);">Time:</label>
                            <select id="scene-time" class="klite-select">
                                <option value="early dawn">early dawn</option>
                                <option value="dawn">dawn</option>
                                <option value="morning">morning</option>
                                <option value="late morning">late morning</option>
                                <option value="noon">noon</option>
                                <option value="early afternoon">early afternoon</option>
                                <option value="afternoon">afternoon</option>
                                <option value="late afternoon">late afternoon</option>
                                <option value="evening">evening</option>
                                <option value="dusk">dusk</option>
                                <option value="night">night</option>
                                <option value="late night">late night</option>
                                <option value="midnight">midnight</option>
                            </select>
                        </div>
                        <div class="klite-scene-control-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label class="klite-scene-label" style="min-width: 70px; font-size: 12px; color: var(--klite-text-muted);">Weather:</label>
                            <select id="scene-weather" class="klite-select">
                                <option value="clear">clear</option>
                                <option value="cloudy">cloudy</option>
                                <option value="rain">rain</option>
                                <option value="storm">storm</option>
                                <option value="snow">snow</option>
                                <option value="fog">fog</option>
                                <option value="mist">mist</option>
                                <option value="wind">wind</option>
                                <option value="hot">hot</option>
                                <option value="cold">cold</option>
                                <option value="humid">humid</option>
                                <option value="dry">dry</option>
                            </select>
                        </div>
                        <div class="klite-scene-control-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label class="klite-scene-label" style="min-width: 70px; font-size: 12px; color: var(--klite-text-muted);">Mood:</label>
                            <select id="scene-mood" class="klite-select">
                                <option value="neutral">neutral</option>
                                <option value="tense">tense</option>
                                <option value="mysterious">mysterious</option>
                                <option value="peaceful">peaceful</option>
                                <option value="dangerous">dangerous</option>
                                <option value="festive">festive</option>
                                <option value="melancholic">melancholic</option>
                                <option value="exciting">exciting</option>
                                <option value="romantic">romantic</option>
                                <option value="eerie">eerie</option>
                                <option value="hopeful">hopeful</option>
                                <option value="desperate">desperate</option>
                                <option value="triumphant">triumphant</option>
                                <option value="solemn">solemn</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="klite-scene-presets" style="margin-top: 16px;">
                        <div style="margin-bottom: 12px; font-size: 11px; color: var(--klite-text-muted);">
                            Quick-apply preset scenes for common scenarios
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--klite-text-muted); grid-column: 1 / -1; margin-bottom: 4px;">FANTASY & ADVENTURE</div>
                            <button class="klite-btn klite-btn-xs" data-action="preset-medieval-castle">🏰 Medieval Castle</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-forest-clearing">🌲 Forest Clearing</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-tavern-evening">🏪 Tavern Evening</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-mountain-peak">🗿 Mountain Peak</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-ancient-temple">🏛️ Ancient Temple</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-stormy-coast">🌊 Stormy Coast</button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--klite-text-muted); grid-column: 1 / -1; margin-bottom: 4px;">MODERN & URBAN</div>
                            <button class="klite-btn klite-btn-xs" data-action="preset-city-night">🌃 City Night</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-cozy-cafe">☕ Cozy Cafe</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-hospital-room">🏥 Hospital Room</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-suburban-home">🏠 Suburban Home</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-subway-station">🚇 Subway Station</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-office-building">🏢 Office Building</button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--klite-text-muted); grid-column: 1 / -1; margin-bottom: 4px;">SCI-FI & FUTURE</div>
                            <button class="klite-btn klite-btn-xs" data-action="preset-space-station">🚀 Space Station</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-research-lab">🔬 Research Lab</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-alien-world">🌌 Alien World</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-cyberpunk-city">🤖 Cyberpunk City</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-spaceship-bridge">🛸 Spaceship Bridge</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-energy-facility">⚡ Energy Facility</button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px;">
                            <div style="font-size: 10px; font-weight: bold; color: var(--klite-text-muted); grid-column: 1 / -1; margin-bottom: 4px;">HORROR & MYSTERY</div>
                            <button class="klite-btn klite-btn-xs" data-action="preset-abandoned-house">🏚️ Abandoned House</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-graveyard">⚰️ Graveyard</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-foggy-moor">🌫️ Foggy Moor</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-dark-cave">🕳️ Dark Cave</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-midnight-forest">🌙 Midnight Forest</button>
                            <button class="klite-btn klite-btn-xs" data-action="preset-crime-scene">🔍 Crime Scene</button>
                        </div>
                    </div>
                </div>
            `;
        }

        postRender() {
            // Setup mockup event handlers
            KLiteModular.log('scenesetup', 'Mockup event handlers setup');
        }

        saveState() {
            return {
                genericPresets: this.genericPresets,
                detailedPresets: this.detailedPresets,
                currentScene: this.currentScene
            };
        }

        restoreState(state) {
            if (state.genericPresets) this.genericPresets = state.genericPresets;
            if (state.detailedPresets) this.detailedPresets = state.detailedPresets;
            if (state.currentScene) this.currentScene = state.currentScene;
        }

        cleanup() {
            KLiteModular.log('scenesetup', 'Mockup cleanup');
        }
    }

    // Register panels
    KLiteModular.registerPanel('systemprompt', SystemPromptPanel);
    KLiteModular.registerPanel('generationcontrol', GenerationControlPanel);
    KLiteModular.registerPanel('characters', CharacterPanel);
    KLiteModular.registerPanel('memory', MemoryPanel);
    KLiteModular.registerPanel('notes', NotesPanel);
    KLiteModular.registerPanel('authornote', AuthorNotePanel);
    KLiteModular.registerPanel('autoregen', AutoRegeneratePanel);
    KLiteModular.registerPanel('autosender', AutoSenderPanel);
    KLiteModular.registerPanel('smartmemory', SmartMemoryWriterPanel);
    KLiteModular.registerPanel('autosave', AutoSavePanel);
    KLiteModular.registerPanel('quickdice', QuickDicePanel);
    KLiteModular.registerPanel('exportcontext', ExportContextPanel);
    KLiteModular.registerPanel('contextanalyzer', ContextAnalyzerPanel);
    KLiteModular.registerPanel('timelineindex', TimelineIndexPanel);
    KLiteModular.registerPanel('quickactions', QuickActionsPanel);
    KLiteModular.registerPanel('helpreference', HelpReferencePanel);
    KLiteModular.registerPanel('worldinfo', WorldInfoManagementPanel);
    KLiteModular.registerPanel('textdb', TextDatabasePanel);
    KLiteModular.registerPanel('groupchat', GroupChatPanel);
    KLiteModular.registerPanel('characterpersona', CharacterPersonaIntegrationPanel);
    KLiteModular.registerPanel('narratorcontrols', NarratorControlsPanel);
    KLiteModular.registerPanel('advancedvisualstyle', AdvancedVisualStylePanel);
    KLiteModular.registerPanel('imagegeneration', ImageGenerationPanel);
    KLiteModular.registerPanel('scenesetup', SceneSetupPanel);
    
    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(async () => await KLiteModular.init(), 1000);
        });
    } else {
        setTimeout(async () => await KLiteModular.init(), 1000);
    }
    
    // Expose for debugging
    window.KLiteModular = KLiteModular;
    
    // Final loading messages after framework is available
    setTimeout(() => {
        KLiteModular.log('init', '🎉 KLITE-Tools Modular loaded successfully!');
        KLiteModular.log('init', '💤 The mod will activate when you switch to Aesthetic mode in KoboldAI Lite');
        KLiteModular.log('init', '✅ Phase 1 COMPLETE: Core Essentials implemented');
        KLiteModular.log('init', '🚀 Phase 2 STARTED: Auto-Regenerate & Auto-Sender panels implemented');
        KLiteModular.log('init', '🎨 Global theme system with CSS variables initialized');
        KLiteModular.log('init', '📦 Available panels:', Array.from(KLiteModular.panels.keys()));
        KLiteModular.log('init', '🔧 Debug system active - you should see debug messages now!');
        KLiteModular.log('init', '🔍 For detailed mode detection: KLiteModular.enableDebug("mode")');
        KLiteModular.log('init', '🎨 Theme manager: KLiteModular.theme or window.KLiteThemeManager');
        
        // Enable character debug by default to help with testing
        KLiteModular.enableDebug('characters');
        KLiteModular.log('characters', '🎭 Character panel debug enabled for testing');
    }, 100);
    
    // Add additional CSS for ALPHA UI elements
    const alphaCSS = `
        <style id=\"klite-alpha-ui-styles\">
            .klite-btn-xs {
                font-size: 10px;
                padding: 2px 6px;
                min-height: 22px;
            }
            
            .klite-btn-sm {
                font-size: 12px;
                padding: 3px 6px;
                min-width: 26px;
                text-align: center;
            }
            
            .klite-scene-control-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .klite-scene-label {
                min-width: 70px;
                font-size: 12px;
                color: var(--klite-text-muted);
            }
            
            .klite-buttons-fill {
                display: flex;
                gap: 8px;
            }
            
            .klite-mt {
                margin-top: 8px;
            }
            
            .klite-checkbox {
                margin-right: 6px;
            }
            
            .klite-slider {
                width: 100%;
                margin: 4px 0;
            }
            
            .klite-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', alphaCSS);
    
})();