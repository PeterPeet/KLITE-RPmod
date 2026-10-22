/**
 * Beginner Esolite - A simplified onboarding experience for new users
 *
 * This mod transforms Esolite into a beginner-friendly interface with:
 * - Apple-style scrolling landing page for setup
 * - Simplified AI configuration (Horde/KoboldCpp/Cloud APIs)
 * - Easy persona and character import
 * - Stripped-down chat UI
 * - Easy/Advanced mode toggle
 *
 * @version 1.0.0
 * @author KLITE RPmod Team
 */

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION & CONSTANTS
    // =========================================================================

    const VERSION = '2.0.0-complete';
    const STORAGE_KEY = 'beginnerEsolite';
    const DEBUG = true;

    // Writing style presets (hidden from user, just shows friendly names)
    const WRITING_PRESETS = {
        chat: {
            name: '💬 Chat Style',
            description: 'Short, quick responses like texting',
            settings: {
                max_length: 120,
                temperature: 0.55,
                top_p: 0.9,
                top_k: 40,
                min_p: 0.05,
                rep_pen: 1.15,
                rep_pen_range: 512
            }
        },
        normal: {
            name: '📝 Normal Writing',
            description: 'Balanced co-writing style',
            settings: {
                max_length: 350,
                temperature: 0.75,
                top_p: 0.92,
                top_k: 100,
                min_p: 0.05,
                rep_pen: 1.1,
                rep_pen_range: 1024
            }
        },
        creative: {
            name: '✨ Creative Writing',
            description: 'Expressive, longer prose',
            settings: {
                max_length: 600,
                temperature: 0.95,
                top_p: 0.95,
                top_k: 0,
                min_p: 0.03,
                rep_pen: 1.05,
                rep_pen_range: 2048
            }
        }
    };

    // Cloud API providers with their configurations
    // Esolite dropdown values: 0=Horde, 1=KoboldAI, 2=OpenAI, 3=OpenRouter, 4=Claude, 5=Gemini, 6=Cohere, 7=Mistral, 8=Featherless, 9=Grok, 10=Pollinations, 11=Nvidia
    const CLOUD_PROVIDERS = {
        openrouter: {
            name: 'OpenRouter',
            description: 'Access many models with one API key',
            endpoint: 'https://openrouter.ai/api/v1',
            esoliteDropdown: '3',
            needsKey: true,
            keyPlaceholder: 'sk-or-...',
            models: ['Auto-detect', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-70b-instruct']
        },
        openai: {
            name: 'OpenAI',
            description: 'ChatGPT models (GPT-4o, GPT-4o-mini)',
            endpoint: 'https://api.openai.com/v1',
            esoliteDropdown: '2',
            needsKey: true,
            keyPlaceholder: 'sk-...',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
        },
        claude: {
            name: 'Claude (Anthropic)',
            description: 'Claude 3.5 Sonnet, Haiku',
            endpoint: 'https://api.anthropic.com/v1',
            esoliteDropdown: '4',
            needsKey: true,
            keyPlaceholder: 'sk-ant-...',
            models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']
        },
        arli: {
            name: 'Arli AI',
            description: 'Affordable AI API service',
            endpoint: 'https://api.arliai.com/v1',
            esoliteDropdown: '2', // OpenAI compatible
            needsKey: true,
            keyPlaceholder: 'Your Arli AI key',
            models: ['Auto-detect']
        },
        nanogpt: {
            name: 'NanoGPT',
            description: 'Pay-per-token API service',
            endpoint: 'https://nano-gpt.com/api/v1',
            esoliteDropdown: '2', // OpenAI compatible
            needsKey: true,
            keyPlaceholder: 'Your NanoGPT key',
            models: ['Auto-detect']
        },
        chutes: {
            name: 'Chutes',
            description: 'Fast inference API',
            endpoint: 'https://api.chutes.ai/v1',
            esoliteDropdown: '2', // OpenAI compatible
            needsKey: true,
            keyPlaceholder: 'Your Chutes key',
            models: ['Auto-detect']
        },
        novita: {
            name: 'novitaAI',
            description: 'GPU cloud for AI inference',
            endpoint: 'https://api.novita.ai/v3/openai',
            esoliteDropdown: '2', // OpenAI compatible
            needsKey: true,
            keyPlaceholder: 'Your novitaAI key',
            models: ['Auto-detect']
        },
        electronhub: {
            name: 'Electron Hub',
            description: 'Community AI hub',
            endpoint: 'https://api.electronhub.top/v1',
            esoliteDropdown: '2', // OpenAI compatible
            needsKey: true,
            keyPlaceholder: 'Your Electron Hub key',
            models: ['Auto-detect']
        },
        custom: {
            name: 'OpenAI Compatible',
            description: 'Any OpenAI-compatible API',
            endpoint: '',
            esoliteDropdown: '2',
            needsKey: true,
            needsEndpoint: true,
            keyPlaceholder: 'Your API key',
            models: ['Auto-detect']
        }
    };

    // Instruct template auto-detection patterns
    const INSTRUCT_PATTERNS = {
        'llama-3': 'llama3',
        'llama3': 'llama3',
        'mistral': 'mistral',
        'mixtral': 'mistral',
        'qwen': 'chatml',
        'yi-': 'chatml',
        'claude': 'claude',
        'gpt-4': 'chatgpt',
        'gpt-3.5': 'chatgpt',
        'gpt-4o': 'chatgpt',
        'gemma': 'gemma',
        'command-r': 'command-r',
        'deepseek': 'deepseek',
        'phi-': 'chatml',
        'solar': 'solar',
        'openchat': 'openchat',
        'vicuna': 'vicuna',
        'alpaca': 'alpaca'
    };

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    const state = {
        initialized: false,
        modActive: false,
        beginnerModeActive: false,
        welcomeShown: false,
        currentSection: 0,
        setupComplete: false,
        easyMode: true,
        config: {
            aiType: null,        // 'horde', 'koboldcpp', 'cloud'
            cloudProvider: null,
            apiKey: '',
            endpoint: '',
            model: '',
            writingStyle: 'normal',
            persona: {
                name: '',
                description: '',
                avatar: null
            },
            character: null,     // Full TavernCard data
            firstMessage: ''
        }
    };

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    function log(...args) {
        if (DEBUG) console.log('[BeginnerEsolite]', ...args);
    }

    function autoDetectInstruct(modelName) {
        if (!modelName) return 'alpaca';
        const lower = modelName.toLowerCase();
        for (const [pattern, template] of Object.entries(INSTRUCT_PATTERNS)) {
            if (lower.includes(pattern)) return template;
        }
        return 'alpaca';
    }

    function resolveCardMacros(card, userName, charName) {
        const replacements = {
            '{{user}}': userName,
            '{{User}}': userName,
            '{{USER}}': userName,
            '{{char}}': charName,
            '{{Char}}': charName,
            '{{CHAR}}': charName,
            '<USER>': userName,
            '<BOT>': charName,
        };

        const resolve = (text) => {
            if (!text) return text;
            let result = text;
            for (const [macro, value] of Object.entries(replacements)) {
                result = result.split(macro).join(value);
            }
            return result;
        };

        // Handle single text field (for inline resolution)
        if (card.text !== undefined) {
            return { text: resolve(card.text) };
        }

        // Handle full card object
        return {
            ...card,
            description: resolve(card.description),
            personality: resolve(card.personality),
            scenario: resolve(card.scenario),
            first_mes: resolve(card.first_mes),
            mes_example: resolve(card.mes_example),
            alternate_greetings: card.alternate_greetings?.map(g => resolve(g)) || []
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            log('State saved');
        } catch (e) {
            console.error('Failed to save beginner state:', e);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(state, parsed);
                log('State loaded:', state);
                return true;
            }
        } catch (e) {
            console.error('Failed to load beginner state:', e);
        }
        return false;
    }

    function clearState() {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, {
            initialized: false,
            modActive: false,
            beginnerModeActive: false,
            welcomeShown: false,
            currentSection: 0,
            setupComplete: false,
            easyMode: true,
            config: {
                aiType: null,
                cloudProvider: null,
                apiKey: '',
                endpoint: '',
                model: '',
                writingStyle: 'normal',
                persona: { name: '', description: '', avatar: null },
                character: null,
                firstMessage: ''
            }
        });
    }

    // =========================================================================
    // ESOLITE BRIDGE - Interface with host application
    // =========================================================================

    const EsoliteBridge = {
        // Check if Esolite is ready
        isReady() {
            return typeof window.localsettings !== 'undefined' &&
                   typeof window.generate_savefile === 'function' &&
                   typeof window.restart_new_game === 'function';
        },

        // Wait for Esolite to be ready
        async waitForReady(timeout = 15000) {
            const start = Date.now();
            while (!this.isReady()) {
                if (Date.now() - start > timeout) {
                    throw new Error('Esolite failed to initialize');
                }
                await new Promise(r => setTimeout(r, 100));
            }
            log('Esolite is ready');
        },

        // Apply sampler settings
        applySamplerSettings(preset) {
            const settings = WRITING_PRESETS[preset]?.settings;
            if (!settings || !window.localsettings) return;

            // Apply to localsettings
            Object.assign(window.localsettings, settings);

            // Also update DOM elements if they exist (Esolite reads from these)
            const mappings = {
                'max_length': 'max_length',
                'temperature': 'temp',
                'top_p': 'top_p',
                'top_k': 'top_k',
                'min_p': 'min_p',
                'rep_pen': 'rep_pen',
                'rep_pen_range': 'rep_pen_range'
            };

            for (const [key, elemId] of Object.entries(mappings)) {
                const elem = document.getElementById(elemId);
                if (elem && settings[key] !== undefined) {
                    elem.value = settings[key];
                }
            }

            log('Applied sampler preset:', preset, settings);
        },

        // Apply API configuration
        applyAPIConfig(config) {
            if (!window.localsettings) return;

            // Disable the import prompt dialogs for beginner mode
            window.localsettings.import_tavern_prompt = false;

            if (config.aiType === 'horde') {
                // Set dropdown to Horde (0)
                const dropdown = document.getElementById('customapidropdown');
                if (dropdown) {
                    dropdown.value = '0';
                    // Trigger the change event to let Esolite configure itself
                    if (typeof window.customapi_dropdown === 'function') {
                        window.customapi_dropdown(true);
                    }
                }
                // Use anonymous key if none set
                const apiKeyInput = document.getElementById('apikey');
                if (apiKeyInput && !apiKeyInput.value) {
                    apiKeyInput.value = '0000000000';
                }
                log('Configured Horde API');

            } else if (config.aiType === 'koboldcpp') {
                // Set dropdown to KoboldAI (1)
                const dropdown = document.getElementById('customapidropdown');
                if (dropdown) {
                    dropdown.value = '1';
                    if (typeof window.customapi_dropdown === 'function') {
                        window.customapi_dropdown(true);
                    }
                }
                // Set the endpoint
                window.custom_kobold_endpoint = config.endpoint || 'http://localhost:5001';
                const endpointInput = document.getElementById('customkoboldurl');
                if (endpointInput) {
                    endpointInput.value = window.custom_kobold_endpoint;
                }
                log('Configured KoboldCpp:', window.custom_kobold_endpoint);

            } else if (config.aiType === 'cloud') {
                const provider = CLOUD_PROVIDERS[config.cloudProvider];
                if (provider) {
                    // Set dropdown to the provider's Esolite dropdown value
                    const dropdown = document.getElementById('customapidropdown');
                    if (dropdown) {
                        dropdown.value = provider.esoliteDropdown;
                        if (typeof window.customapi_dropdown === 'function') {
                            window.customapi_dropdown(true);
                        }
                    }

                    // Set the endpoint
                    const endpoint = config.endpoint || provider.endpoint;
                    window.custom_oai_endpoint = endpoint;
                    const endpointInput = document.getElementById('custom_oai_endpoint');
                    if (endpointInput) {
                        endpointInput.value = endpoint;
                    }

                    // Set the API key
                    const apiKeyInput = document.getElementById('custom_oai_key');
                    if (apiKeyInput) {
                        apiKeyInput.value = config.apiKey;
                    }

                    // Set model if specified
                    if (config.model && config.model !== 'Auto-detect') {
                        const modelInput = document.getElementById('custom_oai_model');
                        if (modelInput) {
                            modelInput.value = config.model;
                        }
                        window.localsettings.custom_oai_model = config.model;

                        // Auto-detect instruct template from model name
                        const instruct = autoDetectInstruct(config.model);
                        window.localsettings.gui_type_instruct = INSTRUCT_MAP[instruct] || 2;
                    }

                    log('Configured Cloud API:', provider.name, endpoint);
                }
            }
        },

        // Apply persona
        applyPersona(persona) {
            if (!window.localsettings) return;
            window.localsettings.chatname = persona.name || 'User';

            // Update the chatname input if it exists
            const chatnameInput = document.getElementById('chatnamefield');
            if (chatnameInput) {
                chatnameInput.value = persona.name || 'User';
            }

            log('Applied persona:', persona.name);
        },

        // Load character card directly (bypassing dialogs)
        loadCharacterDirect(card, firstMessage) {
            // Resolve macros with persona name
            const userName = state.config.persona.name || 'User';
            const charName = card.name || 'Character';

            // Start a new game first
            if (typeof window.restart_new_game === 'function') {
                window.restart_new_game(false);
            }

            // Set up chat mode with CORPO theme (value 3) to prevent aesthetic mode switch
            window.localsettings.opmode = 3; // Chat mode
            window.localsettings.gui_type_chat = 3; // Corpo theme (prevents aesthetic switch)
            window.localsettings.chatname = userName;
            window.localsettings.chatopponent = charName;
            window.localsettings.multiline_replies = true;

            // Build memory from character data
            let memory = '';
            if (card.description) {
                memory += 'Persona: ' + resolveCardMacros({ text: card.description }, userName, charName).text + '\n';
            }
            if (card.personality) {
                memory += 'Personality: ' + resolveCardMacros({ text: card.personality }, userName, charName).text + '\n';
            }
            if (card.scenario) {
                memory += '[Scenario: ' + resolveCardMacros({ text: card.scenario }, userName, charName).text + ']\n';
            }

            // Add persona description if available
            if (state.config.persona.description) {
                memory += '\n[User Persona: ' + state.config.persona.description + ']\n';
            }

            // Set memory
            if (typeof window.current_memory !== 'undefined') {
                window.current_memory = memory + '***';
            }

            // Set example messages as temporary memory
            if (card.mes_example && typeof window.current_temp_memory !== 'undefined') {
                let examples = card.mes_example;
                if (typeof window.formatExampleMessages === 'function') {
                    examples = window.formatExampleMessages(examples);
                }
                window.current_temp_memory = resolveCardMacros({ text: examples }, userName, charName).text + '\n***';
            }

            // Handle character book / world info
            if (card.character_book && card.character_book.entries && typeof window.load_tavern_wi === 'function') {
                window.current_wi = window.load_tavern_wi(card.character_book);
            }

            // Set the first message
            const greeting = firstMessage || card.first_mes || '';
            const resolvedGreeting = resolveCardMacros({ text: greeting }, userName, charName).text;

            if (resolvedGreeting && typeof window.gametext_arr !== 'undefined') {
                window.gametext_arr = [];
                window.gametext_arr.push('\n' + charName + ': ' + resolvedGreeting);
            }

            // Render the game text
            if (typeof window.render_gametext === 'function') {
                window.render_gametext(true);
            }

            // Update side panel
            if (typeof window.update_for_sidepanel === 'function') {
                window.update_for_sidepanel();
            }

            log('Loaded character directly:', charName);
            return true;
        },

        // Generate and download save
        async saveAndDownload() {
            try {
                if (typeof window.generate_savefile === 'function') {
                    const saveData = window.generate_savefile(true, true, true);

                    // Generate filename from character name if available
                    const charName = state.config.character?.name || 'adventure';
                    const timestamp = new Date().toISOString().slice(0, 10);
                    const saveName = `${charName}_${timestamp}.json`;

                    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = saveName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    state.justSaved = true;
                    setTimeout(() => { state.justSaved = false; }, 2000);

                    log('Save downloaded:', saveName);
                    return true;
                }
            } catch (e) {
                console.error('Save failed:', e);
            }
            return false;
        },

        // Apply corpo theme and UI settings
        applyCorpoTheme() {
            if (!window.localsettings) return;

            window.localsettings.opmode = 3; // Chat mode
            window.localsettings.gui_type_chat = 3; // Corpo chat style (3 = corpo, 2 = aesthetic)

            // Apply Aqua Blue theme if available
            if (typeof window.setThemeVars === 'function') {
                const aquaBlueTheme = {
                    "--theme_color_topmenu": "rgba(0, 43, 54, 1)",
                    "--theme_color_placeholder_text": "rgba(197, 213, 213, 1)",
                    "--theme_color_glow_text": "rgba(160, 190, 190, 1)",
                    "--theme_color_tabs_text": "rgba(160, 190, 190, 1)",
                    "--theme_color_tabs_highlight": "rgba(75, 123, 138, 1)",
                    "--theme_color_tabs": "rgba(0, 43, 54, 1)",
                    "--theme_color_topbtn_highlight": "rgba(36, 71, 82, 1)",
                    "--theme_color_topbtn": "rgba(36, 71, 82, 1)",
                    "--theme_color_disabled_fg": "#616773",
                    "--theme_color_disabled_bg": "#484d56",
                    "--theme_color_input_bg": "rgba(6, 50, 61, 1)",
                    "--theme_color_border_highlight": "#82a1bc",
                    "--theme_color_border": "rgba(124, 142, 142, 1)",
                    "--theme_color_highlight": "rgba(126, 158, 168, 1)",
                    "--theme_color_input_text": "rgba(160, 190, 190, 1)",
                    "--theme_color_text": "rgba(160, 190, 190, 1)",
                    "--theme_color_footer": "rgba(0, 43, 54, 1)",
                    "--theme_color_main": "rgba(0, 43, 54, 1)",
                    "--theme_color_bg_outer": "rgba(100, 116, 118, 1)",
                    "--theme_color_bg": "rgba(36, 71, 82, 1)",
                    "--theme_color_bg_dark": "rgba(36, 71, 82, 0.68)",
                    "--theme_color_topmenu_text": "rgba(160, 190, 190, 1)",
                    "--theme_color_button_bg": "rgba(0, 43, 54, 1)",
                    "--theme_color_button_text": "rgba(160, 190, 190, 1)"
                };
                window.setThemeVars(aquaBlueTheme);
            }
        },

        // Reset all data (for restart)
        resetAllData() {
            // Clear beginner state first
            clearState();

            // Clear Esolite's IndexedDB
            const dbName = 'klite';
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => log('IndexedDB cleared');
            request.onerror = () => log('Failed to clear IndexedDB');

            // Clear localStorage (but preserve some system keys)
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Remove Esolite and beginner keys
                if (key && (key.startsWith('kaihordewebui_') || key.startsWith('e_kaihordewebui_') || key === STORAGE_KEY)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Reload page
            setTimeout(() => window.location.reload(), 100);
        },

        // Check for existing session
        hasExistingSession() {
            // Check if there's game text or a character loaded
            return (typeof window.gametext_arr !== 'undefined' &&
                    Array.isArray(window.gametext_arr) &&
                    window.gametext_arr.length > 0);
        }
    };

    // Map instruct template names to Esolite's gui_type_instruct values
    const INSTRUCT_MAP = {
        'alpaca': 2,
        'vicuna': 3,
        'llama3': 13,
        'mistral': 8,
        'chatml': 6,
        'chatgpt': 1,
        'claude': 15,
        'gemma': 14,
        'deepseek': 6, // Uses ChatML
        'command-r': 16,
        'solar': 8,
        'openchat': 6
    };

    // =========================================================================
    // FILE PARSING - Handle PNG/JSON character cards
    // =========================================================================

    const FileParser = {
        // Read file as data URL
        readAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // Read file as text
        readAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        // Read file as array buffer
        readAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        },

        // Extract character data from PNG (TavernCard V2)
        async extractFromPNG(file) {
            try {
                const buffer = await this.readAsArrayBuffer(file);
                const bytes = new Uint8Array(buffer);

                // PNG signature check
                const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
                for (let i = 0; i < 8; i++) {
                    if (bytes[i] !== pngSignature[i]) {
                        throw new Error('Not a valid PNG file');
                    }
                }

                // Find tEXt chunk with 'chara' keyword
                let offset = 8;
                while (offset < bytes.length) {
                    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                                   (bytes[offset + 2] << 8) | bytes[offset + 3];
                    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5],
                                                      bytes[offset + 6], bytes[offset + 7]);

                    if (type === 'tEXt') {
                        const data = bytes.slice(offset + 8, offset + 8 + length);
                        const text = new TextDecoder('latin1').decode(data);
                        const nullIndex = text.indexOf('\0');
                        const keyword = text.substring(0, nullIndex);
                        const value = text.substring(nullIndex + 1);

                        if (keyword === 'chara') {
                            const decoded = atob(value);
                            const card = JSON.parse(decoded);
                            // Get image as data URL
                            const imageDataUrl = await this.readAsDataURL(file);
                            return { ...this.normalizeCard(card), image: imageDataUrl };
                        }
                    }

                    offset += 12 + length;
                }

                throw new Error('No character data found in PNG');
            } catch (e) {
                console.error('PNG extraction failed:', e);
                throw e;
            }
        },

        // Parse JSON character card
        async parseJSON(file) {
            try {
                const text = await this.readAsText(file);
                const data = JSON.parse(text);
                return this.normalizeCard(data);
            } catch (e) {
                console.error('JSON parsing failed:', e);
                throw e;
            }
        },

        // Normalize card to consistent format (TavernCard V2)
        normalizeCard(data) {
            // Handle V2 spec wrapper
            if (data.spec === 'chara_card_v2' && data.data) {
                data = { ...data.data, spec: 'chara_card_v2' };
            }

            return {
                name: data.name || data.char_name || 'Unknown',
                description: data.description || data.char_persona || '',
                personality: data.personality || '',
                first_mes: data.first_mes || data.char_greeting || '',
                mes_example: data.mes_example || data.example_dialogue || '',
                scenario: data.scenario || data.world_scenario || '',
                creator: data.creator || '',
                creator_notes: data.creator_notes || '',
                system_prompt: data.system_prompt || '',
                post_history_instructions: data.post_history_instructions || '',
                alternate_greetings: data.alternate_greetings || [],
                character_book: data.character_book || null,
                tags: data.tags || [],
                image: data.image || null
            };
        },

        // Auto-detect and parse file
        async parseFile(file) {
            const ext = file.name.toLowerCase().split('.').pop();

            if (ext === 'png' || ext === 'webp') {
                return await this.extractFromPNG(file);
            } else if (ext === 'json') {
                return await this.parseJSON(file);
            }

            throw new Error(`Unsupported file type: ${ext}`);
        }
    };

    // =========================================================================
    // UI COMPONENTS
    // =========================================================================

    const UI = {
        // Create the main landing page overlay
        createLandingPage() {
            const overlay = document.createElement('div');
            overlay.id = 'beginner-overlay';
            overlay.innerHTML = `
                <div class="beginner-container">
                    <!-- Progress Navigation -->
                    <nav class="beginner-nav">
                        <div class="nav-dots">
                            <button class="nav-dot active" data-section="0" aria-label="Welcome"></button>
                            <button class="nav-dot" data-section="1" aria-label="AI Setup"></button>
                            <button class="nav-dot" data-section="2" aria-label="Persona"></button>
                            <button class="nav-dot" data-section="3" aria-label="Character"></button>
                            <button class="nav-dot" data-section="4" aria-label="Start"></button>
                        </div>
                    </nav>

                    <!-- Scrollable Sections -->
                    <div class="beginner-sections">
                        ${this.createSection0()}
                        ${this.createSection1()}
                        ${this.createSection2()}
                        ${this.createSection3()}
                        ${this.createSection4()}
                    </div>
                </div>
            `;
            return overlay;
        },

        // Section 0: Welcome
        createSection0() {
            return `
                <section class="beginner-section section-welcome" data-section="0" data-theme="dark">
                    <div class="section-content">
                        <div class="hero-content">
                            <h1 class="hero-title">Welcome to <span class="gradient-text">Esolite</span></h1>
                            <p class="hero-subtitle">Your gateway to AI roleplay adventures</p>
                            <p class="hero-description">
                                Let's get you set up in just a few simple steps.
                                No technical knowledge required.
                            </p>
                        </div>

                        <div class="welcome-options">
                            <div class="option-card" id="start-fresh">
                                <div class="option-icon">🚀</div>
                                <h3>Start Fresh</h3>
                                <p>Set up a new adventure from scratch</p>
                            </div>
                            <div class="option-card" id="import-save">
                                <div class="option-icon">📂</div>
                                <h3>Continue Adventure</h3>
                                <p>Import an existing save file</p>
                                <input type="file" id="save-file-input" accept=".json,.kaistory" hidden>
                            </div>
                        </div>

                        <div class="steps-preview">
                            <h3>How it works:</h3>
                            <div class="steps-grid">
                                <div class="step-item">
                                    <span class="step-number">1</span>
                                    <span class="step-label">Connect AI</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">2</span>
                                    <span class="step-label">Create Persona</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">3</span>
                                    <span class="step-label">Choose Character</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">4</span>
                                    <span class="step-label">Start Chat</span>
                                </div>
                            </div>
                        </div>

                        <button class="btn-primary btn-next" data-next="1">
                            Let's Begin <span class="arrow">→</span>
                        </button>
                    </div>
                </section>
            `;
        },

        // Section 1: AI Configuration
        createSection1() {
            const providerOptions = Object.entries(CLOUD_PROVIDERS)
                .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
                .join('');

            return `
                <section class="beginner-section section-ai" data-section="1" data-theme="blue">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 1</span>
                            <h2>Connect Your AI</h2>
                            <p>Choose where your AI brain lives</p>
                        </div>

                        <div class="ai-options">
                            <div class="ai-card" data-ai="horde">
                                <div class="ai-icon">🌐</div>
                                <h3>AI Horde</h3>
                                <p class="ai-tag free">Free</p>
                                <p class="ai-desc">Community-powered AI. No setup needed, just works!</p>
                                <p class="ai-note">May have wait times during busy hours</p>
                            </div>

                            <div class="ai-card" data-ai="koboldcpp">
                                <div class="ai-icon">💻</div>
                                <h3>KoboldCpp</h3>
                                <p class="ai-tag local">Local</p>
                                <p class="ai-desc">Run AI on your own computer. Fast & private!</p>
                                <p class="ai-note">Requires KoboldCpp running locally</p>
                            </div>

                            <div class="ai-card" data-ai="cloud">
                                <div class="ai-icon">☁️</div>
                                <h3>Cloud API</h3>
                                <p class="ai-tag paid">Paid</p>
                                <p class="ai-desc">Professional cloud services. Fast & reliable!</p>
                                <p class="ai-note">Requires API key from provider</p>
                            </div>
                        </div>

                        <!-- Horde Config (shown when horde selected) -->
                        <div class="ai-config config-horde" style="display:none;">
                            <div class="config-info success">
                                <span class="info-icon">✓</span>
                                <p>AI Horde is ready to use! No configuration needed.</p>
                            </div>
                        </div>

                        <!-- KoboldCpp Config -->
                        <div class="ai-config config-koboldcpp" style="display:none;">
                            <div class="config-field">
                                <label>KoboldCpp Address</label>
                                <input type="text" id="kobold-endpoint"
                                       value="http://localhost:5001"
                                       placeholder="http://localhost:5001">
                                <span class="field-hint">Usually http://localhost:5001 if running on this computer</span>
                            </div>
                            <button class="btn-secondary" id="test-kobold">Test Connection</button>
                            <div class="connection-status" id="kobold-status"></div>
                        </div>

                        <!-- Cloud API Config -->
                        <div class="ai-config config-cloud" style="display:none;">
                            <div class="config-field">
                                <label>Choose Provider</label>
                                <select id="cloud-provider">
                                    ${providerOptions}
                                </select>
                            </div>

                            <div class="config-field" id="custom-endpoint-field" style="display:none;">
                                <label>API Endpoint URL</label>
                                <input type="text" id="cloud-endpoint" placeholder="https://api.example.com/v1">
                            </div>

                            <div class="config-field">
                                <label>API Key</label>
                                <div class="input-with-toggle">
                                    <input type="password" id="cloud-apikey" placeholder="Enter your API key">
                                    <button class="toggle-visibility" aria-label="Show/hide key">👁</button>
                                </div>
                                <span class="field-hint" id="key-hint">Get your key from the provider's website</span>
                            </div>

                            <div class="config-field">
                                <label>Model (Optional)</label>
                                <select id="cloud-model">
                                    <option value="">Auto-detect</option>
                                </select>
                                <span class="field-hint">Leave as auto-detect if unsure</span>
                            </div>
                        </div>

                        <!-- Writing Style -->
                        <div class="writing-style" style="display:none;" id="writing-style-section">
                            <h3>How should the AI write?</h3>
                            <div class="style-options">
                                <div class="style-card" data-style="chat">
                                    <div class="style-icon">💬</div>
                                    <h4>Chat Style</h4>
                                    <p>Short, quick responses like texting</p>
                                </div>
                                <div class="style-card selected" data-style="normal">
                                    <div class="style-icon">📝</div>
                                    <h4>Normal</h4>
                                    <p>Balanced co-writing style</p>
                                </div>
                                <div class="style-card" data-style="creative">
                                    <div class="style-icon">✨</div>
                                    <h4>Creative</h4>
                                    <p>Expressive, longer prose</p>
                                </div>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="0">← Back</button>
                            <button class="btn-primary btn-next" data-next="2" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 2: Persona Setup
        createSection2() {
            return `
                <section class="beginner-section section-persona" data-section="2" data-theme="purple">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 2</span>
                            <h2>Who Are You?</h2>
                            <p>Create your character for the roleplay</p>
                        </div>

                        <div class="persona-options">
                            <div class="persona-method" id="persona-manual">
                                <div class="method-header">
                                    <input type="radio" name="persona-method" value="manual" checked>
                                    <label>Create Manually</label>
                                </div>
                                <div class="method-content">
                                    <div class="config-field">
                                        <label>Your Name</label>
                                        <input type="text" id="persona-name" placeholder="Enter your character's name">
                                    </div>
                                    <div class="config-field">
                                        <label>Description (Optional)</label>
                                        <textarea id="persona-description"
                                                  placeholder="Describe yourself... (appearance, personality, background)"
                                                  rows="4"></textarea>
                                        <span class="field-hint">This helps the AI understand who you are in the story</span>
                                    </div>
                                </div>
                            </div>

                            <div class="persona-method" id="persona-import">
                                <div class="method-header">
                                    <input type="radio" name="persona-method" value="import">
                                    <label>Import Persona Card</label>
                                </div>
                                <div class="method-content" style="display:none;">
                                    <div class="import-zone" id="persona-dropzone">
                                        <div class="dropzone-content">
                                            <span class="dropzone-icon">📁</span>
                                            <p>Drop persona file here</p>
                                            <p class="dropzone-hint">or click to browse (PNG/JSON)</p>
                                        </div>
                                        <input type="file" id="persona-file-input" accept=".png,.json,.webp" hidden>
                                    </div>
                                    <div class="imported-persona" id="imported-persona" style="display:none;">
                                        <img class="persona-avatar" id="persona-avatar-preview" src="" alt="">
                                        <div class="persona-info">
                                            <h4 id="imported-persona-name"></h4>
                                            <p id="imported-persona-desc"></p>
                                        </div>
                                        <button class="btn-icon remove-import" id="remove-persona">✕</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="1">← Back</button>
                            <button class="btn-primary btn-next" data-next="3" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 3: Character Import
        createSection3() {
            return `
                <section class="beginner-section section-character" data-section="3" data-theme="pink">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 3</span>
                            <h2>Choose Your Character</h2>
                            <p>Import a character to roleplay with</p>
                        </div>

                        <div class="character-import">
                            <div class="import-zone large" id="character-dropzone">
                                <div class="dropzone-content">
                                    <span class="dropzone-icon">🎭</span>
                                    <p>Drop character card here</p>
                                    <p class="dropzone-hint">Supports TavernCard V2 (PNG/JSON)</p>
                                    <button class="btn-secondary">Browse Files</button>
                                </div>
                                <input type="file" id="character-file-input" accept=".png,.json,.webp" hidden>
                            </div>
                        </div>

                        <!-- Character Preview (shown after import) -->
                        <div class="character-preview" id="character-preview" style="display:none;">
                            <div class="preview-card">
                                <div class="preview-header">
                                    <img class="preview-avatar" id="char-avatar" src="" alt="">
                                    <div class="preview-title">
                                        <h3 id="char-name"></h3>
                                        <p class="char-creator" id="char-creator"></p>
                                    </div>
                                    <button class="btn-icon remove-import" id="remove-character">✕</button>
                                </div>
                                <div class="preview-body">
                                    <div class="preview-section">
                                        <h4>Description</h4>
                                        <p id="char-description" class="truncate-text"></p>
                                    </div>
                                    <div class="preview-section collapsible collapsed" id="char-personality-section">
                                        <h4 class="collapsible-header">
                                            Personality <span class="collapse-icon">▼</span>
                                        </h4>
                                        <p id="char-personality" class="collapsible-content truncate-text"></p>
                                    </div>
                                    <div class="preview-section collapsible collapsed" id="char-scenario-section">
                                        <h4 class="collapsible-header">
                                            Scenario <span class="collapse-icon">▼</span>
                                        </h4>
                                        <p id="char-scenario" class="collapsible-content truncate-text"></p>
                                    </div>
                                </div>
                                <div class="preview-tags" id="char-tags"></div>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="2">← Back</button>
                            <button class="btn-primary btn-next" data-next="4" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 4: Chat Start
        createSection4() {
            return `
                <section class="beginner-section section-start" data-section="4" data-theme="green">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 4</span>
                            <h2>Ready to Begin!</h2>
                            <p>Review and start your adventure</p>
                        </div>

                        <div class="start-summary">
                            <div class="summary-item">
                                <span class="summary-icon">🤖</span>
                                <div class="summary-info">
                                    <span class="summary-label">AI</span>
                                    <span class="summary-value" id="summary-ai">Not configured</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-icon">👤</span>
                                <div class="summary-info">
                                    <span class="summary-label">You</span>
                                    <span class="summary-value" id="summary-persona">Not set</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-icon">🎭</span>
                                <div class="summary-info">
                                    <span class="summary-label">Character</span>
                                    <span class="summary-value" id="summary-character">Not imported</span>
                                </div>
                            </div>
                        </div>

                        <div class="first-message-config">
                            <h3>First Message</h3>
                            <p class="config-hint">This is how the character will greet you</p>

                            <div class="greeting-selector" id="greeting-selector" style="display:none;">
                                <label>Choose a greeting:</label>
                                <select id="greeting-select">
                                    <option value="0">Default greeting</option>
                                </select>
                            </div>

                            <div class="first-message-preview">
                                <div class="message-bubble ai">
                                    <p id="first-message-text">Import a character to see their greeting...</p>
                                </div>
                            </div>

                            <div class="custom-message-toggle">
                                <label>
                                    <input type="checkbox" id="custom-message-toggle">
                                    Write a custom first message instead
                                </label>
                            </div>

                            <div class="custom-message-input" id="custom-message-section" style="display:none;">
                                <textarea id="custom-first-message"
                                          placeholder="Write how you want the character to start..."
                                          rows="4"></textarea>
                            </div>
                        </div>

                        <div class="section-nav start-nav">
                            <button class="btn-secondary btn-back" data-back="3">← Back</button>
                            <button class="btn-primary btn-start" id="start-chat">
                                🚀 Start Adventure
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Create simplified chat header
        createSimplifiedHeader() {
            const header = document.createElement('div');
            header.id = 'beginner-chat-header';
            header.innerHTML = `
                <div class="chat-header-left">
                    <img class="chat-char-avatar" id="chat-avatar" src="" alt="">
                    <span class="chat-char-name" id="chat-char-name">Character</span>
                </div>
                <div class="chat-header-right">
                    <button class="header-btn" id="btn-advanced" title="Advanced Mode">⚙️</button>
                    <button class="header-btn" id="btn-save" title="Save & Download">💾</button>
                    <button class="header-btn" id="btn-restart" title="Restart">🔄</button>
                </div>
            `;
            return header;
        },

        // Create exit warning dialog
        createExitDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'exit-dialog';
            dialog.className = 'beginner-dialog';
            dialog.innerHTML = `
                <div class="dialog-backdrop"></div>
                <div class="dialog-content">
                    <h3>⚠️ Leaving So Soon?</h3>
                    <p>Your progress will be lost if you leave without saving.</p>
                    <div class="dialog-actions">
                        <button class="btn-primary" id="exit-save">💾 Save & Exit</button>
                        <button class="btn-secondary" id="exit-continue">Continue Chat</button>
                        <button class="btn-danger" id="exit-discard">Leave Without Saving</button>
                    </div>
                </div>
            `;
            return dialog;
        },

        // Create restart confirmation dialog
        createRestartDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'restart-dialog';
            dialog.className = 'beginner-dialog';
            dialog.innerHTML = `
                <div class="dialog-backdrop"></div>
                <div class="dialog-content">
                    <h3>🔄 Start Over?</h3>
                    <p>This will reset everything and take you back to the beginning.</p>
                    <p class="dialog-warning">All unsaved progress will be lost!</p>
                    <div class="dialog-actions">
                        <button class="btn-secondary" id="restart-cancel">Cancel</button>
                        <button class="btn-danger" id="restart-confirm">Reset Everything</button>
                    </div>
                </div>
            `;
            return dialog;
        }
    };

    // =========================================================================
    // STYLES
    // =========================================================================

    const STYLES = `
        /* ========== CSS Variables & Theme (Aqua Blue inspired) ========== */
        :root {
            /* Aqua Blue Theme Colors */
            --beginner-bg-dark: rgba(0, 43, 54, 1);
            --beginner-bg-blue: rgba(36, 71, 82, 1);
            --beginner-bg-purple: rgba(20, 55, 70, 1);
            --beginner-bg-pink: rgba(15, 50, 65, 1);
            --beginner-bg-green: rgba(10, 60, 70, 1);

            --beginner-accent: rgba(75, 123, 138, 1);
            --beginner-accent-light: rgba(126, 158, 168, 1);
            --beginner-success: #22c55e;
            --beginner-warning: #f59e0b;
            --beginner-danger: #ef4444;

            --beginner-text: rgba(160, 190, 190, 1);
            --beginner-text-muted: rgba(140, 170, 170, 1);
            --beginner-text-dim: rgba(120, 150, 150, 1);

            --beginner-card-bg: rgba(6, 50, 61, 0.8);
            --beginner-card-border: rgba(124, 142, 142, 0.5);
            --beginner-card-hover: rgba(36, 71, 82, 0.9);

            --beginner-radius: 16px;
            --beginner-radius-sm: 8px;
            --beginner-transition: 0.3s ease;
        }

        /* ========== Reset for overlay ========== */
        #beginner-overlay * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        /* ========== Main Overlay ========== */
        #beginner-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99999;
            background: var(--beginner-bg-dark);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--beginner-text);
            overflow: hidden;
            font-size: 18px;
            line-height: 1.5;
        }

        .beginner-container {
            width: 100%;
            height: 100%;
            position: relative;
        }

        /* ========== Navigation Dots ========== */
        .beginner-nav {
            position: fixed;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 100;
        }

        .nav-dots {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .nav-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid var(--beginner-text-muted);
            background: transparent;
            cursor: pointer;
            transition: var(--beginner-transition);
        }

        .nav-dot:hover {
            border-color: var(--beginner-text);
            transform: scale(1.1);
        }

        .nav-dot.active {
            background: var(--beginner-accent-light);
            border-color: var(--beginner-accent-light);
            transform: scale(1.3);
        }

        .nav-dot.completed {
            background: var(--beginner-success);
            border-color: var(--beginner-success);
        }

        /* ========== Sections Container ========== */
        .beginner-sections {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            scroll-snap-type: y mandatory;
            scroll-behavior: smooth;
        }

        .beginner-section {
            min-height: 100vh;
            width: 100%;
            scroll-snap-align: start;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 40px;
            transition: background-color 0.5s ease;
        }

        .beginner-section[data-theme="dark"] { background: var(--beginner-bg-dark); }
        .beginner-section[data-theme="blue"] { background: var(--beginner-bg-blue); }
        .beginner-section[data-theme="purple"] { background: var(--beginner-bg-purple); }
        .beginner-section[data-theme="pink"] { background: var(--beginner-bg-pink); }
        .beginner-section[data-theme="green"] { background: var(--beginner-bg-green); }

        .section-content {
            max-width: 900px;
            width: 100%;
            animation: fadeInUp 0.6s ease;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* ========== Section Headers ========== */
        .section-header {
            text-align: center;
            margin-bottom: 50px;
        }

        .section-number {
            display: inline-block;
            background: var(--beginner-accent);
            color: white;
            padding: 10px 24px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .section-header h2 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 12px;
            background: linear-gradient(135deg, var(--beginner-text) 0%, var(--beginner-accent-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-header p {
            color: var(--beginner-text-muted);
            font-size: 1.3rem;
        }

        /* ========== Hero Section (Welcome) ========== */
        .hero-content {
            text-align: center;
            margin-bottom: 60px;
        }

        .hero-title {
            font-size: 4rem;
            font-weight: 800;
            margin-bottom: 20px;
            line-height: 1.1;
        }

        .gradient-text {
            background: linear-gradient(135deg, rgba(160, 190, 190, 1) 0%, rgba(75, 123, 138, 1) 50%, rgba(126, 158, 168, 1) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-subtitle {
            font-size: 1.8rem;
            color: var(--beginner-text-muted);
            margin-bottom: 20px;
        }

        .hero-description {
            font-size: 1.3rem;
            color: var(--beginner-text-dim);
            max-width: 600px;
            margin: 0 auto;
        }

        /* ========== Welcome Options ========== */
        .welcome-options {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 60px;
        }

        .option-card {
            background: var(--beginner-card-bg);
            border: 2px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            padding: 40px 32px;
            text-align: center;
            cursor: pointer;
            transition: var(--beginner-transition);
        }

        .option-card:hover {
            background: var(--beginner-card-hover);
            border-color: var(--beginner-accent);
            transform: translateY(-4px);
        }

        .option-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        .option-card h3 {
            font-size: 1.5rem;
            margin-bottom: 12px;
        }

        .option-card p {
            color: var(--beginner-text-muted);
            font-size: 1.1rem;
        }

        /* ========== Steps Preview ========== */
        .steps-preview {
            margin-bottom: 50px;
        }

        .steps-preview h3 {
            text-align: center;
            color: var(--beginner-text-muted);
            font-size: 1.2rem;
            margin-bottom: 24px;
        }

        .steps-grid {
            display: flex;
            justify-content: center;
            gap: 40px;
        }

        .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .step-number {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--beginner-card-bg);
            border: 3px solid var(--beginner-accent);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.4rem;
            color: var(--beginner-accent-light);
        }

        .step-label {
            font-size: 1.1rem;
            color: var(--beginner-text-muted);
        }

        /* ========== Buttons ========== */
        .btn-primary, .btn-secondary, .btn-danger {
            padding: 14px 48px;
            border-radius: var(--beginner-radius-sm);
            font-size: 1.2rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--beginner-transition);
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-width: 200px;
        }

        .btn-primary {
            background: var(--beginner-accent);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: var(--beginner-accent-light);
            transform: translateY(-2px);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: var(--beginner-card-bg);
            color: var(--beginner-text);
            border: 2px solid var(--beginner-card-border);
        }

        .btn-secondary:hover {
            background: var(--beginner-card-hover);
            border-color: var(--beginner-accent);
        }

        .btn-danger {
            background: var(--beginner-danger);
            color: white;
        }

        .btn-danger:hover {
            background: #dc2626;
        }

        .btn-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: var(--beginner-card-bg);
            color: var(--beginner-text);
            cursor: pointer;
            transition: var(--beginner-transition);
            font-size: 1.2rem;
        }

        .btn-icon:hover {
            background: var(--beginner-danger);
        }

        .arrow {
            transition: transform 0.2s ease;
            font-size: 1.3rem;
        }

        .btn-primary:hover .arrow {
            transform: translateX(4px);
        }

        /* ========== AI Selection Cards ========== */
        .ai-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .ai-card {
            background: var(--beginner-card-bg);
            border: 2px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            padding: 32px 24px;
            text-align: center;
            cursor: pointer;
            transition: var(--beginner-transition);
        }

        .ai-card:hover {
            border-color: var(--beginner-accent);
        }

        .ai-card.selected {
            border-color: var(--beginner-accent-light);
            background: rgba(75, 123, 138, 0.2);
        }

        .ai-icon {
            font-size: 3.5rem;
            margin-bottom: 16px;
        }

        .ai-card h3 {
            font-size: 1.4rem;
            margin-bottom: 12px;
        }

        .ai-tag {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 15px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .ai-tag.free { background: var(--beginner-success); color: white; }
        .ai-tag.local { background: var(--beginner-accent); color: white; }
        .ai-tag.paid { background: var(--beginner-warning); color: black; }

        .ai-desc {
            color: var(--beginner-text-muted);
            font-size: 1.1rem;
            margin-bottom: 10px;
        }

        .ai-note {
            color: var(--beginner-text-dim);
            font-size: 1rem;
            font-style: italic;
        }

        /* ========== Config Panels ========== */
        .ai-config {
            background: var(--beginner-card-bg);
            border-radius: var(--beginner-radius);
            padding: 32px;
            margin-bottom: 32px;
            animation: fadeInUp 0.3s ease;
        }

        .config-info {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: var(--beginner-radius-sm);
            font-size: 1.2rem;
        }

        .config-info.success {
            background: rgba(34, 197, 94, 0.15);
            border: 2px solid var(--beginner-success);
        }

        .info-icon {
            font-size: 2rem;
        }

        .config-field {
            margin-bottom: 24px;
        }

        .config-field label {
            display: block;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--beginner-text);
            font-size: 1.1rem;
        }

        .config-field input,
        .config-field select,
        .config-field textarea {
            width: 100%;
            padding: 16px 20px;
            border-radius: var(--beginner-radius-sm);
            border: 2px solid var(--beginner-card-border);
            background: rgba(0, 0, 0, 0.3);
            color: var(--beginner-text);
            font-size: 1.1rem;
            transition: var(--beginner-transition);
        }

        .config-field input:focus,
        .config-field select:focus,
        .config-field textarea:focus {
            outline: none;
            border-color: var(--beginner-accent);
        }

        .config-field textarea {
            resize: vertical;
            min-height: 120px;
        }

        .field-hint {
            display: block;
            margin-top: 8px;
            font-size: 1rem;
            color: var(--beginner-text-dim);
        }

        .input-with-toggle {
            position: relative;
            display: flex;
        }

        .input-with-toggle input {
            padding-right: 48px;
        }

        .toggle-visibility {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.2rem;
            opacity: 0.7;
        }

        .toggle-visibility:hover {
            opacity: 1;
        }

        /* ========== Writing Style Cards ========== */
        .writing-style {
            margin-bottom: 32px;
        }

        .writing-style h3 {
            text-align: center;
            margin-bottom: 20px;
            color: var(--beginner-text-muted);
        }

        .style-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }

        .style-card {
            background: var(--beginner-card-bg);
            border: 2px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: var(--beginner-transition);
        }

        .style-card:hover {
            border-color: var(--beginner-accent);
        }

        .style-card.selected {
            border-color: var(--beginner-accent);
            background: rgba(99, 102, 241, 0.1);
        }

        .style-icon {
            font-size: 2rem;
            margin-bottom: 8px;
        }

        .style-card h4 {
            font-size: 1rem;
            margin-bottom: 4px;
        }

        .style-card p {
            font-size: 0.8rem;
            color: var(--beginner-text-muted);
        }

        /* ========== Connection Status ========== */
        .connection-status {
            margin-top: 12px;
            padding: 12px;
            border-radius: var(--beginner-radius-sm);
            font-size: 0.9rem;
        }

        .connection-status.success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--beginner-success);
        }

        .connection-status.error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--beginner-danger);
        }

        .connection-status.testing {
            background: rgba(99, 102, 241, 0.1);
            color: var(--beginner-accent);
        }

        /* ========== Section Navigation ========== */
        .section-nav {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
        }

        .section-nav.start-nav {
            justify-content: center;
            gap: 20px;
        }

        /* ========== Persona Section ========== */
        .persona-options {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .persona-method {
            background: var(--beginner-card-bg);
            border: 1px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            overflow: hidden;
        }

        .method-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.2);
            cursor: pointer;
        }

        .method-header input[type="radio"] {
            width: 18px;
            height: 18px;
            accent-color: var(--beginner-accent);
        }

        .method-header label {
            font-weight: 600;
            cursor: pointer;
        }

        .method-content {
            padding: 20px;
        }

        /* ========== Import/Dropzone ========== */
        .import-zone {
            border: 2px dashed var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: var(--beginner-transition);
        }

        .import-zone:hover,
        .import-zone.drag-over {
            border-color: var(--beginner-accent);
            background: rgba(99, 102, 241, 0.05);
        }

        .import-zone.large {
            padding: 60px 40px;
        }

        .dropzone-icon {
            font-size: 3rem;
            display: block;
            margin-bottom: 16px;
        }

        .dropzone-content p {
            margin-bottom: 8px;
        }

        .dropzone-hint {
            color: var(--beginner-text-dim);
            font-size: 0.9rem;
        }

        /* ========== Imported Preview ========== */
        .imported-persona {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: var(--beginner-radius-sm);
        }

        .persona-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            object-fit: cover;
        }

        .persona-info {
            flex: 1;
        }

        .persona-info h4 {
            margin-bottom: 4px;
        }

        .persona-info p {
            color: var(--beginner-text-muted);
            font-size: 1rem;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* ========== Character Preview Card ========== */
        .character-preview {
            margin-top: 32px;
            animation: fadeInUp 0.4s ease;
        }

        .preview-card {
            background: var(--beginner-card-bg);
            border: 1px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            overflow: hidden;
        }

        .preview-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
        }

        .preview-avatar {
            width: 80px;
            height: 80px;
            border-radius: var(--beginner-radius-sm);
            object-fit: cover;
        }

        .preview-title {
            flex: 1;
        }

        .preview-title h3 {
            font-size: 1.5rem;
            margin-bottom: 4px;
        }

        .char-creator {
            color: var(--beginner-text-dim);
            font-size: 0.9rem;
        }

        .preview-body {
            padding: 20px;
        }

        .preview-section {
            margin-bottom: 16px;
        }

        .preview-section h4 {
            color: var(--beginner-accent-light);
            font-size: 0.9rem;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .preview-section p {
            color: var(--beginner-text-muted);
            line-height: 1.6;
            white-space: pre-wrap;
        }

        /* Truncate long descriptions with fade-out */
        .preview-section p.truncate-text {
            max-height: 15em; /* approximately 10 lines */
            overflow: hidden;
            position: relative;
        }

        .preview-section p.truncate-text::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4em;
            background: linear-gradient(transparent, var(--beginner-card-bg));
            pointer-events: none;
        }

        .collapsible .collapsible-header {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .collapsible .collapse-icon {
            font-size: 0.7rem;
            transition: transform 0.2s ease;
        }

        .collapsible.collapsed .collapse-icon {
            transform: rotate(-90deg);
        }

        .collapsible.collapsed .collapsible-content {
            display: none;
        }

        .preview-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 16px 20px;
            border-top: 1px solid var(--beginner-card-border);
        }

        .preview-tags .tag {
            background: var(--beginner-accent);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
        }

        /* ========== Start Summary ========== */
        .start-summary {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-bottom: 40px;
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .summary-icon {
            font-size: 2rem;
        }

        .summary-info {
            display: flex;
            flex-direction: column;
        }

        .summary-label {
            font-size: 0.8rem;
            color: var(--beginner-text-dim);
            text-transform: uppercase;
        }

        .summary-value {
            font-weight: 600;
        }

        /* ========== First Message Config ========== */
        .first-message-config {
            background: var(--beginner-card-bg);
            border-radius: var(--beginner-radius);
            padding: 24px;
            margin-bottom: 32px;
        }

        .first-message-config h3 {
            margin-bottom: 8px;
        }

        .config-hint {
            color: var(--beginner-text-muted);
            margin-bottom: 20px;
        }

        .greeting-selector {
            margin-bottom: 16px;
        }

        .greeting-selector label {
            display: block;
            margin-bottom: 8px;
            color: var(--beginner-text-muted);
        }

        .greeting-selector select {
            width: 100%;
            padding: 10px;
            border-radius: var(--beginner-radius-sm);
            border: 1px solid var(--beginner-card-border);
            background: rgba(0, 0, 0, 0.3);
            color: var(--beginner-text);
        }

        .first-message-preview {
            margin-bottom: 16px;
        }

        .message-bubble {
            background: rgba(99, 102, 241, 0.2);
            border-radius: var(--beginner-radius);
            padding: 16px 20px;
            max-height: 200px;
            overflow-y: auto;
        }

        .message-bubble p {
            white-space: pre-wrap;
            line-height: 1.6;
        }

        .custom-message-toggle {
            margin-bottom: 16px;
        }

        .custom-message-toggle label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--beginner-text-muted);
        }

        .custom-message-toggle input {
            accent-color: var(--beginner-accent);
        }

        .custom-message-input textarea {
            width: 100%;
            padding: 16px;
            border-radius: var(--beginner-radius-sm);
            border: 1px solid var(--beginner-card-border);
            background: rgba(0, 0, 0, 0.3);
            color: var(--beginner-text);
            font-size: 1rem;
            resize: vertical;
        }

        /* ========== Simplified Chat Header ========== */
        #beginner-chat-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: rgba(0, 43, 54, 1);
            border-bottom: 2px solid rgba(124, 142, 142, 0.5);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .chat-header-left {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .chat-char-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(124, 142, 142, 0.5);
        }

        .chat-char-name {
            font-weight: 600;
            font-size: 1.3rem;
            color: #ffffff;
        }

        .chat-header-right {
            display: flex;
            gap: 10px;
        }

        .header-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: rgba(36, 71, 82, 1);
            cursor: pointer;
            font-size: 1.3rem;
            transition: all 0.3s ease;
            color: white;
        }

        .header-btn:hover {
            background: rgba(75, 123, 138, 1);
            transform: scale(1.05);
        }

        /* ========== Dialog ========== */
        .beginner-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .dialog-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
        }

        .dialog-content {
            position: relative;
            background: var(--beginner-bg-dark);
            border: 1px solid var(--beginner-card-border);
            border-radius: var(--beginner-radius);
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        }

        .dialog-content h3 {
            font-size: 1.5rem;
            margin-bottom: 16px;
        }

        .dialog-content p {
            color: var(--beginner-text-muted);
            margin-bottom: 12px;
        }

        .dialog-warning {
            color: var(--beginner-danger) !important;
            font-weight: 600;
        }

        .dialog-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 24px;
        }

        /* ========== Easy Mode UI Hiding ========== */
        body.beginner-easy-mode #top_bar,
        body.beginner-easy-mode #leftpanel,
        body.beginner-easy-mode .btn-add,
        body.beginner-easy-mode #topbar_bg,
        body.beginner-easy-mode #btn_settings,
        body.beginner-easy-mode #btn_story,
        body.beginner-easy-mode #btn_save,
        body.beginner-easy-mode #corpo_chat_img_btn,
        body.beginner-easy-mode .corpoavatar {
            display: none !important;
        }

        body.beginner-easy-mode #gamescreen {
            padding-top: 70px !important;
        }

        /* Hide corpo left panel completely in easy mode */
        body.beginner-easy-mode #corpo_leftpanel,
        body.beginner-easy-mode .corpo_leftpanel {
            display: none !important;
            width: 0 !important;
        }

        /* ========== Mobile Responsive ========== */
        @media (max-width: 768px) {
            .beginner-nav {
                right: 12px;
            }

            .nav-dot {
                width: 10px;
                height: 10px;
            }

            .section-content {
                padding: 0 16px;
            }

            .hero-title {
                font-size: 2.5rem;
            }

            .hero-subtitle {
                font-size: 1.2rem;
            }

            .welcome-options {
                grid-template-columns: 1fr;
            }

            .ai-options {
                grid-template-columns: 1fr;
            }

            .style-options {
                grid-template-columns: 1fr;
            }

            .steps-grid {
                flex-wrap: wrap;
                gap: 16px;
            }

            .start-summary {
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }

            .section-nav {
                flex-direction: column;
                gap: 12px;
            }

            .section-nav button {
                width: 100%;
            }

            .preview-header {
                flex-direction: column;
                text-align: center;
            }

            .imported-persona {
                flex-direction: column;
                text-align: center;
            }
        }

        /* ========== Return to Easy Mode Button ========== */
        .beginner-return-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99998;
            background: rgba(75, 123, 138, 1);
            color: white;
            border: none;
            border-radius: 30px;
            padding: 16px 28px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(75, 123, 138, 0.5);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .beginner-return-btn:hover {
            background: rgba(126, 158, 168, 1);
            transform: translateY(-3px);
            box-shadow: 0 6px 30px rgba(75, 123, 138, 0.6);
        }

        /* ========== Animations ========== */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .loading {
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .beginner-return-btn {
            animation: slideIn 0.3s ease;
        }
    `;

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const EventHandlers = {
        // Initialize all event listeners
        init() {
            this.bindNavigation();
            this.bindWelcomeSection();
            this.bindAISection();
            this.bindPersonaSection();
            this.bindCharacterSection();
            this.bindStartSection();
            this.bindScrollObserver();
        },

        // Navigation dots
        bindNavigation() {
            document.querySelectorAll('.nav-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const section = parseInt(dot.dataset.section);
                    this.scrollToSection(section);
                });
            });

            // Next/Back buttons
            document.querySelectorAll('.btn-next').forEach(btn => {
                btn.addEventListener('click', () => {
                    const next = parseInt(btn.dataset.next);
                    this.scrollToSection(next);
                });
            });

            document.querySelectorAll('.btn-back').forEach(btn => {
                btn.addEventListener('click', () => {
                    const back = parseInt(btn.dataset.back);
                    this.scrollToSection(back);
                });
            });
        },

        // Scroll to a specific section
        scrollToSection(index) {
            const sections = document.querySelectorAll('.beginner-section');
            if (sections[index]) {
                sections[index].scrollIntoView({ behavior: 'smooth' });
                state.currentSection = index;
                this.updateNavDots();
                saveState();
            }
        },

        // Update navigation dots state
        updateNavDots() {
            document.querySelectorAll('.nav-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === state.currentSection);
                // Mark completed sections
                if (i < state.currentSection) {
                    dot.classList.add('completed');
                }
            });
        },

        // Scroll observer for section changes
        bindScrollObserver() {
            const sections = document.querySelectorAll('.beginner-section');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const index = parseInt(entry.target.dataset.section);
                        state.currentSection = index;
                        this.updateNavDots();
                    }
                });
            }, { threshold: 0.5 });

            sections.forEach(section => observer.observe(section));
        },

        // Welcome section events
        bindWelcomeSection() {
            // Start fresh button
            document.getElementById('start-fresh')?.addEventListener('click', () => {
                this.scrollToSection(1);
            });

            // Import save button
            const importCard = document.getElementById('import-save');
            const saveInput = document.getElementById('save-file-input');

            importCard?.addEventListener('click', () => saveInput?.click());
            saveInput?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await FileParser.readAsText(file);
                        const saveData = JSON.parse(text);
                        // Load the save via Esolite bridge
                        if (typeof window.kai_json_load === 'function') {
                            window.kai_json_load(saveData, false);
                            state.setupComplete = true;
                            saveState();
                            hideOverlay();
                        }
                    } catch (err) {
                        alert('Failed to load save file: ' + err.message);
                    }
                }
            });
        },

        // AI configuration section events
        bindAISection() {
            // AI type selection
            document.querySelectorAll('.ai-card').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.ai-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');

                    const aiType = card.dataset.ai;
                    state.config.aiType = aiType;

                    // Show relevant config panel
                    document.querySelectorAll('.ai-config').forEach(c => c.style.display = 'none');
                    document.querySelector(`.config-${aiType}`).style.display = 'block';

                    // Show writing style section
                    document.getElementById('writing-style-section').style.display = 'block';

                    this.validateAISection();
                    saveState();
                });
            });

            // KoboldCpp test connection
            document.getElementById('test-kobold')?.addEventListener('click', async () => {
                const endpoint = document.getElementById('kobold-endpoint').value;
                const statusEl = document.getElementById('kobold-status');

                statusEl.textContent = 'Testing connection...';
                statusEl.className = 'connection-status testing';

                try {
                    const response = await fetch(`${endpoint}/api/v1/model`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000)
                    });
                    if (response.ok) {
                        const data = await response.json();
                        statusEl.textContent = `✓ Connected! Model: ${data.result || 'Unknown'}`;
                        statusEl.className = 'connection-status success';
                        state.config.endpoint = endpoint;
                        state.config.model = data.result || '';
                        this.validateAISection();
                    } else {
                        throw new Error('Connection failed');
                    }
                } catch (err) {
                    statusEl.textContent = `✕ Connection failed: ${err.message}`;
                    statusEl.className = 'connection-status error';
                }
                saveState();
            });

            // Cloud provider selection
            document.getElementById('cloud-provider')?.addEventListener('change', (e) => {
                const provider = CLOUD_PROVIDERS[e.target.value];
                state.config.cloudProvider = e.target.value;

                // Show/hide custom endpoint field
                document.getElementById('custom-endpoint-field').style.display =
                    provider.needsEndpoint ? 'block' : 'none';

                // Update placeholder
                document.getElementById('cloud-apikey').placeholder = provider.keyPlaceholder;

                // Update model options
                const modelSelect = document.getElementById('cloud-model');
                modelSelect.innerHTML = provider.models.map(m =>
                    `<option value="${m}">${m}</option>`
                ).join('');

                this.validateAISection();
                saveState();
            });

            // API key input
            document.getElementById('cloud-apikey')?.addEventListener('input', (e) => {
                state.config.apiKey = e.target.value;
                this.validateAISection();
                saveState();
            });

            // Custom endpoint input
            document.getElementById('cloud-endpoint')?.addEventListener('input', (e) => {
                state.config.endpoint = e.target.value;
                this.validateAISection();
                saveState();
            });

            // Model selection
            document.getElementById('cloud-model')?.addEventListener('change', (e) => {
                state.config.model = e.target.value;
                saveState();
            });

            // Toggle API key visibility
            document.querySelector('.toggle-visibility')?.addEventListener('click', (e) => {
                const input = document.getElementById('cloud-apikey');
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                e.target.textContent = isPassword ? '🙈' : '👁';
            });

            // Writing style selection
            document.querySelectorAll('.style-card').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    state.config.writingStyle = card.dataset.style;
                    saveState();
                });
            });
        },

        // Validate AI section and enable/disable next button
        validateAISection() {
            let valid = false;

            if (state.config.aiType === 'horde') {
                valid = true;
            } else if (state.config.aiType === 'koboldcpp') {
                valid = state.config.endpoint && state.config.endpoint.length > 0;
            } else if (state.config.aiType === 'cloud') {
                const provider = CLOUD_PROVIDERS[state.config.cloudProvider];
                valid = state.config.apiKey && state.config.apiKey.length > 0;
                if (provider?.needsEndpoint) {
                    valid = valid && state.config.endpoint && state.config.endpoint.length > 0;
                }
            }

            const nextBtn = document.querySelector('.section-ai .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Persona section events
        bindPersonaSection() {
            // Radio button switching
            document.querySelectorAll('input[name="persona-method"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const isManual = radio.value === 'manual';
                    document.querySelector('#persona-manual .method-content').style.display =
                        isManual ? 'block' : 'none';
                    document.querySelector('#persona-import .method-content').style.display =
                        isManual ? 'none' : 'block';
                    this.validatePersonaSection();
                });
            });

            // Manual input
            document.getElementById('persona-name')?.addEventListener('input', (e) => {
                state.config.persona.name = e.target.value;
                this.validatePersonaSection();
                saveState();
            });

            document.getElementById('persona-description')?.addEventListener('input', (e) => {
                state.config.persona.description = e.target.value;
                saveState();
            });

            // Persona file import
            const dropzone = document.getElementById('persona-dropzone');
            const fileInput = document.getElementById('persona-file-input');

            dropzone?.addEventListener('click', () => fileInput?.click());
            dropzone?.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            dropzone?.addEventListener('dragleave', () => {
                dropzone.classList.remove('drag-over');
            });
            dropzone?.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) await this.handlePersonaImport(file);
            });

            fileInput?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await this.handlePersonaImport(file);
            });

            // Remove imported persona
            document.getElementById('remove-persona')?.addEventListener('click', () => {
                state.config.persona = { name: '', description: '', avatar: null };
                document.getElementById('imported-persona').style.display = 'none';
                document.getElementById('persona-dropzone').style.display = 'block';
                this.validatePersonaSection();
                saveState();
            });
        },

        // Handle persona file import
        async handlePersonaImport(file) {
            try {
                const card = await FileParser.parseFile(file);
                state.config.persona = {
                    name: card.name,
                    description: card.description || card.personality || '',
                    avatar: card.image || null
                };

                // Update UI
                document.getElementById('persona-dropzone').style.display = 'none';
                document.getElementById('imported-persona').style.display = 'flex';
                document.getElementById('persona-avatar-preview').src = card.image || '';
                document.getElementById('imported-persona-name').textContent = card.name;
                document.getElementById('imported-persona-desc').textContent =
                    state.config.persona.description.substring(0, 150) + '...';

                this.validatePersonaSection();
                saveState();
            } catch (err) {
                alert('Failed to import persona: ' + err.message);
            }
        },

        // Validate persona section
        validatePersonaSection() {
            const method = document.querySelector('input[name="persona-method"]:checked')?.value;
            let valid = false;

            if (method === 'manual') {
                valid = state.config.persona.name && state.config.persona.name.length > 0;
            } else {
                valid = state.config.persona.name && state.config.persona.name.length > 0;
            }

            const nextBtn = document.querySelector('.section-persona .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Character section events
        bindCharacterSection() {
            const dropzone = document.getElementById('character-dropzone');
            const fileInput = document.getElementById('character-file-input');

            dropzone?.addEventListener('click', () => fileInput?.click());
            dropzone?.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            dropzone?.addEventListener('dragleave', () => {
                dropzone.classList.remove('drag-over');
            });
            dropzone?.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) await this.handleCharacterImport(file);
            });

            fileInput?.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await this.handleCharacterImport(file);
            });

            // Remove character
            document.getElementById('remove-character')?.addEventListener('click', () => {
                state.config.character = null;
                state.config.firstMessage = '';
                document.getElementById('character-preview').style.display = 'none';
                document.getElementById('character-dropzone').style.display = 'block';
                this.validateCharacterSection();
                saveState();
            });

            // Collapsible sections
            document.querySelectorAll('.collapsible-header').forEach(header => {
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('collapsed');
                });
            });
        },

        // Handle character file import
        async handleCharacterImport(file) {
            try {
                const card = await FileParser.parseFile(file);

                // Resolve macros with persona name
                const resolved = resolveCardMacros(card, state.config.persona.name || 'User', card.name);
                state.config.character = resolved;
                state.config.firstMessage = resolved.first_mes || '';

                // Update preview UI
                document.getElementById('character-dropzone').style.display = 'none';
                document.getElementById('character-preview').style.display = 'block';

                document.getElementById('char-avatar').src = resolved.image || '';
                document.getElementById('char-name').textContent = resolved.name;
                document.getElementById('char-creator').textContent =
                    resolved.creator ? `by ${resolved.creator}` : '';
                document.getElementById('char-description').textContent =
                    resolved.description || 'No description';
                document.getElementById('char-personality').textContent =
                    resolved.personality || 'Not specified';
                document.getElementById('char-scenario').textContent =
                    resolved.scenario || 'Not specified';

                // Handle tags
                const tagsContainer = document.getElementById('char-tags');
                tagsContainer.innerHTML = (resolved.tags || [])
                    .map(t => `<span class="tag">${t}</span>`).join('');

                // Hide empty sections
                document.getElementById('char-personality-section').style.display =
                    resolved.personality ? 'block' : 'none';
                document.getElementById('char-scenario-section').style.display =
                    resolved.scenario ? 'block' : 'none';

                // Update first message in start section
                this.updateFirstMessage();
                this.validateCharacterSection();
                saveState();
            } catch (err) {
                alert('Failed to import character: ' + err.message);
            }
        },

        // Validate character section
        validateCharacterSection() {
            const valid = state.config.character !== null;
            const nextBtn = document.querySelector('.section-character .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Start section events
        bindStartSection() {
            // Greeting selector
            document.getElementById('greeting-select')?.addEventListener('change', (e) => {
                const index = parseInt(e.target.value);
                if (index === 0) {
                    state.config.firstMessage = state.config.character?.first_mes || '';
                } else {
                    state.config.firstMessage =
                        state.config.character?.alternate_greetings?.[index - 1] || '';
                }
                this.updateFirstMessage();
                saveState();
            });

            // Custom message toggle
            document.getElementById('custom-message-toggle')?.addEventListener('change', (e) => {
                document.getElementById('custom-message-section').style.display =
                    e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
                    state.config.firstMessage = state.config.character?.first_mes || '';
                    this.updateFirstMessage();
                }
            });

            // Custom message input
            document.getElementById('custom-first-message')?.addEventListener('input', (e) => {
                state.config.firstMessage = e.target.value;
                this.updateFirstMessage();
                saveState();
            });

            // Start chat button
            document.getElementById('start-chat')?.addEventListener('click', () => {
                this.startChat();
            });
        },

        // Update first message preview
        updateFirstMessage() {
            document.getElementById('first-message-text').textContent =
                state.config.firstMessage || 'Import a character to see their greeting...';

            // Update summary
            document.getElementById('summary-ai').textContent =
                state.config.aiType ?
                    (state.config.aiType === 'cloud' ?
                        CLOUD_PROVIDERS[state.config.cloudProvider]?.name || 'Cloud API' :
                        state.config.aiType.charAt(0).toUpperCase() + state.config.aiType.slice(1)) :
                    'Not configured';

            document.getElementById('summary-persona').textContent =
                state.config.persona.name || 'Not set';

            document.getElementById('summary-character').textContent =
                state.config.character?.name || 'Not imported';

            // Update greeting selector if character has alternate greetings
            if (state.config.character?.alternate_greetings?.length > 0) {
                const selector = document.getElementById('greeting-selector');
                const select = document.getElementById('greeting-select');
                selector.style.display = 'block';
                select.innerHTML = '<option value="0">Default greeting</option>' +
                    state.config.character.alternate_greetings.map((_, i) =>
                        `<option value="${i + 1}">Greeting ${i + 2}</option>`
                    ).join('');
            }
        },

        // Start the chat
        async startChat() {
            log('Starting chat with config:', state.config);

            try {
                // Apply all settings to Esolite
                EsoliteBridge.applyAPIConfig(state.config);
                EsoliteBridge.applySamplerSettings(state.config.writingStyle);
                EsoliteBridge.applyPersona(state.config.persona);
                EsoliteBridge.applyCorpoTheme();

                // Load character directly (bypasses Esolite's dialogs)
                if (state.config.character) {
                    EsoliteBridge.loadCharacterDirect(state.config.character, state.config.firstMessage);
                }

                // Mark setup as complete
                state.setupComplete = true;
                saveState();

                // Small delay to let Esolite render
                await new Promise(r => setTimeout(r, 200));

                // Hide overlay and show simplified chat
                hideOverlay();
                showSimplifiedChat();

            } catch (e) {
                console.error('Failed to start chat:', e);
                alert('Failed to start chat. Please check your settings and try again.');
            }
        }
    };

    // =========================================================================
    // SIMPLIFIED CHAT MODE
    // =========================================================================

    function showSimplifiedChat() {
        // Add easy mode class to body
        document.body.classList.add('beginner-easy-mode');

        // Force hide corpo left panel via Esolite's own mechanism
        if (window.eso) {
            window.eso.forceCompleteHideOfCorpoLeftPanel = true;
        }
        // Also try to re-render to apply the change
        if (typeof window.render_gametext === 'function') {
            setTimeout(() => window.render_gametext(), 100);
        }

        // Add custom header if not exists
        if (!document.getElementById('beginner-chat-header')) {
            const header = UI.createSimplifiedHeader();
            document.body.appendChild(header);
        }

        // Update header with character info
        if (state.config.character) {
            const avatar = document.getElementById('chat-avatar');
            const name = document.getElementById('chat-char-name');
            if (avatar) avatar.src = state.config.character.image || '';
            if (name) name.textContent = state.config.character.name;
        }

        // Add floating "return to easy mode" button (hidden by default)
        if (!document.getElementById('beginner-return-btn')) {
            const returnBtn = document.createElement('button');
            returnBtn.id = 'beginner-return-btn';
            returnBtn.className = 'beginner-return-btn';
            returnBtn.innerHTML = '← Easy Mode';
            returnBtn.title = 'Return to Easy Mode';
            returnBtn.style.display = 'none';
            returnBtn.addEventListener('click', () => {
                // Directly switch to easy mode (don't toggle)
                switchToEasyMode();
            });
            document.body.appendChild(returnBtn);
        }

        // Bind header buttons
        document.getElementById('btn-advanced')?.addEventListener('click', toggleAdvancedMode);
        document.getElementById('btn-save')?.addEventListener('click', async () => {
            await EsoliteBridge.saveAndDownload();
        });
        document.getElementById('btn-restart')?.addEventListener('click', showRestartDialog);

        log('Simplified chat mode activated');
    }

    function hideSimplifiedChat() {
        document.body.classList.remove('beginner-easy-mode');
        document.getElementById('beginner-chat-header')?.remove();
        document.getElementById('beginner-return-btn')?.remove();
    }

    function toggleAdvancedMode() {
        if (state.easyMode) {
            switchToAdvancedMode();
        } else {
            switchToEasyMode();
        }
    }

    function switchToEasyMode() {
        state.easyMode = true;
        saveState();

        const header = document.getElementById('beginner-chat-header');
        const returnBtn = document.getElementById('beginner-return-btn');

        document.body.classList.add('beginner-easy-mode');
        if (header) header.style.display = 'flex';
        if (returnBtn) returnBtn.style.display = 'none';

        // Hide corpo left panel
        if (window.eso) {
            window.eso.forceCompleteHideOfCorpoLeftPanel = true;
        }
        if (typeof window.render_gametext === 'function') {
            window.render_gametext();
        }

        log('Switched to Easy Mode');
    }

    function switchToAdvancedMode() {
        state.easyMode = false;
        saveState();

        const header = document.getElementById('beginner-chat-header');
        const returnBtn = document.getElementById('beginner-return-btn');

        document.body.classList.remove('beginner-easy-mode');
        if (header) header.style.display = 'none';
        if (returnBtn) returnBtn.style.display = 'block';

        // Show corpo left panel again in advanced mode
        if (window.eso) {
            window.eso.forceCompleteHideOfCorpoLeftPanel = false;
        }
        if (typeof window.render_gametext === 'function') {
            window.render_gametext();
        }

        log('Switched to Advanced Mode');
    }

    function showRestartDialog() {
        const dialog = UI.createRestartDialog();
        document.body.appendChild(dialog);

        document.getElementById('restart-cancel')?.addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('restart-confirm')?.addEventListener('click', () => {
            clearState();
            EsoliteBridge.resetAllData();
        });

        dialog.querySelector('.dialog-backdrop')?.addEventListener('click', () => {
            dialog.remove();
        });
    }

    // =========================================================================
    // EXIT HANDLING
    // =========================================================================

    function setupExitHandling() {
        // Warn before leaving
        window.addEventListener('beforeunload', (e) => {
            if (state.setupComplete && !state.justSaved) {
                e.preventDefault();
                e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
            }
        });
    }

    // =========================================================================
    // OVERLAY CONTROL
    // =========================================================================

    function showOverlay() {
        // Inject styles
        if (!document.getElementById('beginner-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'beginner-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        // Create and show overlay
        const overlay = UI.createLandingPage();
        document.body.appendChild(overlay);

        // Initialize event handlers
        EventHandlers.init();

        // Restore previous section if any
        if (state.currentSection > 0) {
            setTimeout(() => {
                EventHandlers.scrollToSection(state.currentSection);
            }, 100);
        }

        log('Overlay shown');
    }

    function hideOverlay() {
        document.getElementById('beginner-overlay')?.remove();
        log('Overlay hidden');
    }

    // =========================================================================
    // WELCOME POPUP INTEGRATION (V2)
    // =========================================================================

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

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async function init() {
        log('Beginner Esolite v' + VERSION + ' initializing...');

        // Inject styles immediately to prevent flash of unstyled content
        if (!document.getElementById('beginner-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'beginner-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        // Wait for Esolite to be ready
        try {
            await EsoliteBridge.waitForReady();
        } catch (e) {
            console.error('Beginner Esolite: Failed to initialize Esolite bridge', e);
            return;
        }

        // Load previous state
        loadState();

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

        // Setup exit handling
        setupExitHandling();

        state.initialized = true;
        log('Initialization complete');
    }

    // Expose some functions globally for debugging
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
            state.beginnerModeActive = true;
            saveState();
            showOverlay();
        }
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
