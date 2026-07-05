/**
 * Guided RPmod - Interactive AI Roleplay Guide for Esolite
 *
 * This mod provides a guided journey to AI roleplay chat adventures with:
 * - Step-by-step interactive setup
 * - AI provider configuration (Horde/KoboldCpp/Cloud APIs)
 * - Persona creation and character import
 * - Writing style customization
 * - Greeting selection
 * - Simplified roleplay UI
 *
 * @version 3.0.0
 * @author KLITE RPmod Team
 */

(function() {
    'use strict';

    // =========================================================================
    // CONFIGURATION & CONSTANTS
    // =========================================================================

    const VERSION = '3.0.0';
    const STORAGE_KEY = 'guidedRPmod';
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
            models: ['Auto-detect']
        },
        openai: {
            name: 'OpenAI',
            description: 'ChatGPT models (GPT-4o, GPT-4o-mini)',
            endpoint: 'https://api.openai.com/v1',
            esoliteDropdown: '2',
            needsKey: true,
            keyPlaceholder: 'sk-...',
            models: ['Auto-detect']
        },
        claude: {
            name: 'Claude (Anthropic)',
            description: 'Claude 3.5 Sonnet, Haiku',
            endpoint: 'https://api.anthropic.com/v1',
            esoliteDropdown: '4',
            needsKey: true,
            keyPlaceholder: 'sk-ant-...',
            models: ['Auto-detect']
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
        'llama2': 'llama2',
        'mistral': 'mistral',
        'mixtral': 'mistral',
        'ministral': 'mistral',
        'magistral': 'mistral',
        'qwen': 'chatml',
        'yi-': 'chatml',
        'claude': 'claude',
        'gpt-5': 'chatgpt',        
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
        rpModeActive: false,
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
            firstMessage: '',
            greetingIndex: 0
        }
    };

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    function log(...args) {
        if (DEBUG) console.log('[Guided RPmod]', ...args);
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
            alternate_greetings: (card.alternate_greetings ? card.alternate_greetings.map(g => resolve(g)) : [])
        };
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            log('State saved');
        } catch (e) {
            console.error('Failed to save Guided RPmod state:', e);
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
            console.error('Failed to load Guided RPmod state:', e);
        }
        return false;
    }

    function clearState() {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, {
            initialized: false,
            modActive: false,
            rpModeActive: false,
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
                firstMessage: '',
                greetingIndex: 0
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
            const settings = WRITING_PRESETS[preset] && WRITING_PRESETS[preset].settings;
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

            // Disable the import prompt dialogs for Guided RP mode
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
                // Apply user's Horde API key or use anonymous key
                const apiKeyInput = document.getElementById('apikey');
                if (apiKeyInput) {
                    if (config.apiKey && config.apiKey.length > 0) {
                        apiKeyInput.value = config.apiKey;
                        // Also set in localsettings
                        if (window.localsettings) {
                            window.localsettings.my_api_key = config.apiKey;
                        }
                    } else if (!apiKeyInput.value) {
                        apiKeyInput.value = '0000000000';
                    }
                }
                log('Configured Horde API', config.apiKey ? 'with user key' : 'anonymous');

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
                const endpointInput = document.getElementById('customkoboldendpoint');
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

        // Compatibility aliases to match AGENTS.md documentation
        applyAIConfig(config) { return this.applyAPIConfig(config); },
        applyCharacter(card) { return this.loadCharacterDirect(card, state.config.firstMessage); },
        applyFirstMessage(message) {
            state.config.firstMessage = message || '';
            saveState();
            // If there is already a character loaded into chat, update greeting render
            if (typeof window.render_gametext === 'function') {
                try { window.render_gametext(); } catch (_) {}
            }
        },
        startGeneration() {
            try {
                if (typeof window.generate === 'function') return window.generate();
                if (typeof window.retry_generation === 'function') return window.retry_generation();
                // Fallback: trigger a render to refresh UI
                if (typeof window.render_gametext === 'function') return window.render_gametext();
            } catch (e) {
                console.warn('Start generation failed or unavailable:', e);
            }
        },

        // Apply persona
        applyPersona(persona) {
            if (!window.localsettings) return;
            window.localsettings.chatname = persona.name || 'User';

            // Update the chatname input if it exists in settings
            const chatnameInput = document.getElementById('chatname');
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
            const saveBtn = document.getElementById('btn-save');
            const originalText = saveBtn ? saveBtn.textContent : '';

            try {
                // Show saving state
                if (saveBtn) {
                    saveBtn.textContent = '⏳';
                    saveBtn.disabled = true;
                }

                if (typeof window.generate_savefile === 'function') {
                    const saveData = window.generate_savefile(true, true, true);
                    // Attach Guided RP snapshot (no secrets)
                    try { saveData.guided_rp = buildGuidedSnapshot(); } catch (e) { console.warn('Failed to attach Guided RP snapshot:', e); }

                    // Generate filename from character name if available
                    const charName = (state.config.character && state.config.character.name) || 'adventure';
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

                    // Show success state
                    if (saveBtn) {
                        saveBtn.textContent = '✓';
                        setTimeout(() => {
                            saveBtn.textContent = originalText;
                            saveBtn.disabled = false;
                            state.justSaved = false;
                        }, 1500);
                    }

                    log('Save downloaded:', saveName);
                    return true;
                } else {
                    throw new Error('Save function not available');
                }
            } catch (e) {
                console.error('Save failed:', e);
                // Show error state
                if (saveBtn) {
                    saveBtn.textContent = '✕';
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                        saveBtn.disabled = false;
                    }, 1500);
                }
                alert('Failed to save: ' + e.message);
            }
            return false;
        },

        // Apply corpo chat mode only; keep user's theme intact
        applyCorpoTheme() {
            if (!window.localsettings) return;

            window.localsettings.opmode = 3; // Chat mode
            window.localsettings.gui_type_chat = 3; // Corpo chat style (3 = corpo, 2 = aesthetic)
            // Do not override Esolite's theme variables here; respect current theme
        },

        // Reset all data (for restart)
        resetAllData() {
            // Clear Guided RP state first
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
                // Remove Esolite and Guided RP keys
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
                            // Base64 string contains UTF-8 JSON; decode robustly
                            const bin = atob(value);
                            const arr = new Uint8Array(bin.length);
                            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                            const jsonStr = new TextDecoder('utf-8').decode(arr);
                            const card = JSON.parse(jsonStr);
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
            overlay.id = 'grp-overlay';
            overlay.innerHTML = `
                <div class="grp-container">
                    <!-- Vertical Steps Menu -->
                    <nav class="grp-steps-nav">
                        <div class="step-nav-item" data-section="1">
                            <span class="step-nav-num">1</span>
                            <span class="step-nav-text">Start Mode</span>
                        </div>
                        <div class="step-nav-item" data-section="2">
                            <span class="step-nav-num">2</span>
                            <span class="step-nav-text">Connect AI</span>
                        </div>
                        <div class="step-nav-item" data-section="3">
                            <span class="step-nav-num">3</span>
                            <span class="step-nav-text">Writing Style</span>
                        </div>
                        <div class="step-nav-item" data-section="4">
                            <span class="step-nav-num">4</span>
                            <span class="step-nav-text">Your Persona</span>
                        </div>
                        <div class="step-nav-item" data-section="5">
                            <span class="step-nav-num">5</span>
                            <span class="step-nav-text">Character</span>
                        </div>
                        <div class="step-nav-item" data-section="6">
                            <span class="step-nav-num">6</span>
                            <span class="step-nav-text">Greeting</span>
                        </div>
                        <div class="step-nav-item" data-section="7">
                            <span class="step-nav-num">7</span>
                            <span class="step-nav-text">Review & Start</span>
                        </div>
                    </nav>

                    <!-- Scrollable Sections -->
                    <div class="grp-sections">
                        ${this.createSection0()}
                        ${this.createSection1()}
                        ${this.createSection2()}
                        ${this.createSection3()}
                        ${this.createSection4()}
                        ${this.createSection5()}
                        ${this.createSection6()}
                        ${this.createSection7()}
                    </div>
                </div>
            `;
            return overlay;
        },

        // Section 0: Introduction (corporate layout with clickable thumbnail)
        createSection0() {
            return `
                <section class="grp-section section-intro" data-section="0" data-theme="dark">
                    <div class="section-content">
                        <div class="intro-layout-corpo">
                            <div class="intro-main">
                                <h1 class="intro-title-corpo">Welcome to</h1>
                                <p class="intro-subtitle-corpo">This is the quick guided journey to AI role play</p>

                                <div class="intro-thumbnail-wrapper">
                                    <div class="intro-thumbnail-clickable" data-next="1" role="button" tabindex="0" aria-label="Begin setup" style="background-image: var(--img_theme_4);"></div>
                                </div>

                                <p class="intro-cta">CLICK THE THUMBNAIL AND WE WILL SET YOU UP IN 7 SIMPLE STEPS</p>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 1: Start Fresh or Continue
        createSection1() {
            return `
                <section class="grp-section section-start-mode" data-section="1" data-theme="blue">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 1</span>
                            <h2>How would you like to begin?</h2>
                            <p>Start fresh or continue an existing saved adventure</p>
                        </div>

                        <div class="start-options">
                            <div class="start-card" id="start-fresh-card" data-mode="fresh">
                                <div class="start-icon">🚀</div>
                                <h3>Start Fresh</h3>
                            </div>
                            <div class="start-card" id="continue-card" data-mode="continue">
                                <div class="start-icon">📂</div>
                                <h3>Continue Adventure</h3>
                                <input type="file" id="save-file-input" accept=".json,.kaistory" style="display:none;">
                            </div>
                        </div>

                        <div class="load-status" id="load-status" style="display:none;">
                            <div class="status-message"></div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="0">← Back</button>
                            <button class="btn-primary btn-next" data-next="2" id="start-mode-next">
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 2: Connect AI (with Horde key support)
        createSection2() {
            const providerOptions = Object.entries(CLOUD_PROVIDERS)
                .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
                .join('');

            return `
                <section class="grp-section section-ai" data-section="2" data-theme="purple">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 2</span>
                            <h2>Connect Your AI</h2>
                            <p>Choose where your AI brain lives</p>
                        </div>

                        <div class="ai-options">
                            <div class="ai-card" data-ai="horde">
                                <div class="ai-icon">🌐</div>
                                <h3>AI Horde</h3>
                                <p class="ai-tag free">Free</p>
                                <p class="ai-desc">Community-powered AI.<br/>No setup needed!</p>
                                <p class="ai-note">May have wait times during busy hours. Registering gives benefits (aihorde.net)</p>
                            </div>

                            <div class="ai-card" data-ai="koboldcpp">
                                <div class="ai-icon">💻</div>
                                <h3>KoboldCpp</h3>
                                <p class="ai-tag local">Local</p>
                                <p class="ai-desc">Run AI on your computer. Fast & private!</p>
                                <p class="ai-note">Requires KoboldCpp running locally with an AI Model (koboldai.com)</p>
                            </div>

                            <div class="ai-card" data-ai="cloud">
                                <div class="ai-icon">☁️</div>
                                <h3>Cloud API</h3>
                                <p class="ai-tag paid">Paid</p>
                                <p class="ai-desc">Professional cloud services</p>
                                <p class="ai-note">Requires API key from provider</p>
                            </div>
                        </div>

                        <!-- Horde Config (with optional API key) -->
                        <div class="ai-config config-horde" style="display:none;">
                            <div class="config-info success">
                                <span class="info-icon">✓</span>
                                <p>AI Horde is ready! Optionally add your API key for priority access spending Kudos.</p>
                            </div>
                            <div class="config-field">
                                <label>AI Horde API Key (Optional)</label>
                                <div class="input-with-toggle">
                                    <input type="password" id="horde-apikey" placeholder="Leave empty for anonymous access">
                                    <button class="toggle-visibility" aria-label="Show/hide key">👁</button>
                                </div>
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
                                <span class="field-hint">Leave as auto-detect if unsure, but this will probably choose an expensive high performant model</span>
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

        // Section 3: Writing Style
        createSection3() {
            return `
                <section class="grp-section section-writing" data-section="3" data-theme="pink">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 3</span>
                            <h2>How Should the AI Write?</h2>
                            <p>Choose a writing style for your role play</p>
                        </div>

                        <div class="writing-style-options">
                            <div class="style-card" data-style="chat">
                                <div class="style-icon">💬</div>
                                <h4>Chat Style</h4>
                                <div class="style-details">Short, snappy messages perfect for quick back-and-forth conversations like mobile texting</div>
                            </div>
                            <div class="style-card selected" data-style="normal">
                                <div class="style-icon">📝</div>
                                <h4>Role Play</h4>
                                <div class="style-details">A balanced general writing style for most role plays</div>
                            </div>
                            <div class="style-card" data-style="creative">
                                <div class="style-icon">✨</div>
                                <h4>Creative Writing</h4>
                                <div class="style-details">Rich, expressive prose with detailed descriptions and longer responses. Ideal for immersive storytelling.</div>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="2">← Back</button>
                            <button class="btn-primary btn-next" data-next="4">
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 4: Persona (Who Are You?)
        createSection4() {
            return `
                <section class="grp-section section-persona" data-section="4" data-theme="green">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 4</span>
                            <h2>Who Are You?</h2>
                            <p>Create or import your character for the roleplay</p>
                        </div>

                        <div class="persona-toggle-container">
                            <div class="persona-toggle" role="tablist">
                                <button class="persona-toggle-btn active" data-method="manual" role="tab" aria-selected="true">
                                    <span class="toggle-icon">✏️</span>
                                    <span class="toggle-label">Create</span>
                                </button>
                                <button class="persona-toggle-btn" data-method="import" role="tab" aria-selected="false">
                                    <span class="toggle-icon">📥</span>
                                    <span class="toggle-label">Import</span>
                                </button>
                                <div class="toggle-slider"></div>
                            </div>
                        </div>

                        <div class="persona-panels">
                            <div class="persona-panel active" id="persona-panel-manual" data-panel="manual">
                                <div class="config-field">
                                    <label>Your Name</label>
                                    <input type="text" id="persona-name" placeholder="Enter your character's name">
                                </div>
                                <div class="config-field">
                                    <label>Description <span class="optional-tag">Optional</span></label>
                                    <textarea id="persona-description"
                                              placeholder="Describe yourself... (appearance, personality, background)"
                                              rows="4"></textarea>
                                    <span class="field-hint">This helps the AI understand who you are in the story</span>
                                </div>
                            </div>

                            <div class="persona-panel" id="persona-panel-import" data-panel="import">
                                <div class="import-zone" id="persona-dropzone">
                                    <div class="dropzone-content">
                                        <span class="dropzone-icon">📁</span>
                                        <p>Drop character card here or click to browse</p>
                                        <p class="dropzone-hint">Supports TavernCard V2 (PNG/JSON)</p>
                                        <p class="dropzone-hint">will only import NAME and DESCRIPTION as your persona</p>
                                    </div>
                                    <input type="file" id="persona-file-input" accept=".png,.json,.webp" style="display:none;">
                                </div>
                                <div class="imported-persona" id="imported-persona" style="display:none;">
                                    <img class="persona-avatar" id="persona-avatar-preview" src="" alt="">
                                    <div class="persona-info">
                                        <h4 id="imported-persona-name"></h4>
                                        <div id="imported-persona-desc" class="persona-desc"></div>
                                    </div>
                                    <button class="btn-icon remove-import" id="remove-persona">✕</button>
                                </div>
                            </div>
                        </div>

                        <input type="hidden" name="persona-method" value="manual">

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="3">← Back</button>
                            <button class="btn-primary btn-next" data-next="5" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 5: Choose Character
        createSection5() {
            return `
                <section class="grp-section section-character" data-section="5" data-theme="teal">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 5</span>
                            <h2>Choose Your Character</h2>
                            <p>Import a character to roleplay with</p>
                        </div>

                        <div class="character-import">
                            <div class="import-zone large" id="character-dropzone">
                                <div class="dropzone-content">
                                    <span class="dropzone-icon">🎭</span>
                                    <p>Drop character card here or click to browse</p>
                                    <p class="dropzone-hint">Supports TavernCard V2 (PNG/JSON)</p>
                                </div>
                                <input type="file" id="character-file-input" accept=".png,.json,.webp" style="display:none;">
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
                                        <div id="char-description" class="scroll-text"></div>
                                    </div>
                                    <div class="preview-section collapsible collapsed" id="char-personality-section">
                                        <h4 class="collapsible-header">
                                            Personality <span class="collapse-icon">▼</span>
                                        </h4>
                                        <div id="char-personality" class="collapsible-content scroll-text"></div>
                                    </div>
                                    <div class="preview-section collapsible collapsed" id="char-scenario-section">
                                        <h4 class="collapsible-header">
                                            Scenario <span class="collapse-icon">▼</span>
                                        </h4>
                                        <div id="char-scenario" class="collapsible-content scroll-text"></div>
                                    </div>
                                </div>
                                <div class="preview-tags" id="char-tags"></div>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="4">← Back</button>
                            <button class="btn-primary btn-next" data-next="6" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 6: Choose Greeting
        createSection6() {
            return `
                <section class="grp-section section-greeting" data-section="6" data-theme="orange">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 6</span>
                            <h2>Choose the Greeting</h2>
                            <p>Select how the character will start the conversation</p>
                        </div>

                        <div class="greeting-options" id="greeting-options">
                            <div class="greeting-note">
                                <p>Import a character first to see available greetings</p>
                            </div>
                        </div>

                        <div class="greeting-carousel" id="greeting-carousel" style="display:none;">
                            <div class="carousel-header">
                                <button class="carousel-arrow" id="greeting-prev" aria-label="Previous greeting">◀</button>
                                <div class="carousel-counter" id="greeting-counter">1 / 1</div>
                                <button class="carousel-arrow" id="greeting-next" aria-label="Next greeting">▶</button>
                            </div>
                            <div class="carousel-window">
                                <div class="carousel-text" id="greeting-carousel-text"></div>
                            </div>

                            <div class="custom-greeting-option">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="use-custom-greeting">
                                    Write a custom greeting instead
                                </label>
                            </div>

                            <div class="custom-greeting-input" id="custom-greeting-section" style="display:none;">
                                <textarea id="custom-greeting-text"
                                          placeholder="Write how you want the character to greet you..."
                                          rows="8"></textarea>
                            </div>
                        </div>

                        <div class="section-nav">
                            <button class="btn-secondary btn-back" data-back="5">← Back</button>
                            <button class="btn-primary btn-next" data-next="7" disabled>
                                Continue <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Section 7: Overview and Start
        createSection7() {
            return `
                <section class="grp-section section-overview" data-section="7" data-theme="green">
                    <div class="section-content">
                        <div class="section-header">
                            <span class="section-number">Step 7</span>
                            <h2>Ready to Begin!</h2>
                            <p>Review your setup and start your adventure</p>
                        </div>

                        <div class="overview-summary">
                            <div class="summary-item">
                                <span class="summary-icon">🤖</span>
                                <div class="summary-info">
                                    <span class="summary-label">AI Provider</span>
                                    <span class="summary-value" id="summary-ai">Not configured</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-icon">✍️</span>
                                <div class="summary-info">
                                    <span class="summary-label">Writing Style</span>
                                    <span class="summary-value" id="summary-style">Normal</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-icon">👤</span>
                                <div class="summary-info">
                                    <span class="summary-label">Your Persona</span>
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
                            <div class="summary-item">
                                <span class="summary-icon">💬</span>
                                <div class="summary-info">
                                    <span class="summary-label">First Message</span>
                                    <span class="summary-value" id="summary-greeting">Default</span>
                                </div>
                            </div>
                        </div>

                        <div class="greeting-preview">
                            <h4>Preview First Message:</h4>
                            <div class="preview-bubble">
                                <p id="final-greeting-preview">Import a character to see the greeting...</p>
                            </div>
                        </div>

                        <div class="section-nav start-nav">
                            <button class="btn-secondary btn-back" data-back="6">← Back</button>
                            <button class="btn-primary btn-start" id="start-chat">
                                🚀 Start Roleplay
                            </button>
                        </div>
                    </div>
                </section>
            `;
        },

        // Create simplified chat header
        createSimplifiedHeader() {
            const header = document.createElement('div');
            header.id = 'grp-chat-header';
            header.innerHTML = `
                <div class="chat-header-left">
                    <img class="chat-char-avatar" id="chat-avatar" src="" alt="">
                    <span class="chat-char-name" id="chat-char-name">Character</span>
                </div>
                <div class="chat-header-right">
                    <button class="header-btn" id="btn-advanced" title="Advanced Mode">🎭</button>
                    <button class="header-btn" id="btn-save" title="Save & Download">💾</button>
                    <button class="header-btn" id="btn-restart" title="Start New Guided RPmod">✨</button>
                </div>
            `;
            return header;
        },

        // Create exit warning dialog
        createExitDialog() {
            const dialog = document.createElement('div');
            dialog.id = 'exit-dialog';
            dialog.className = 'grp-dialog';
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
            dialog.className = 'grp-dialog';
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
        /* ========== Corpo Theme Design System ========== */
        :root {
            /* Base backgrounds - solid corpo colors */
            --grp-bg-dark: var(--theme_color_bg_dark);
            --grp-bg: var(--theme_color_main);
            --grp-bg-outer: var(--theme_color_bg_outer);

            /* Accents - corpo cyan/teal highlights */
            --grp-accent: var(--theme_color_highlight);
            --grp-accent-light: var(--theme_color_border_highlight);
            --grp-accent-hover: rgba(126, 157, 167, 0.2);
            --grp-success: #22c55e;
            --grp-warning: #f59e0b;
            --grp-danger: #ef4444;

            /* Text hierarchy */
            --grp-text: var(--theme_color_text);
            --grp-text-muted: var(--theme_color_placeholder_text);
            --grp-text-dim: var(--theme_color_border);

            /* Solid surfaces - no transparency */
            --grp-surface: var(--theme_color_input_bg);
            --grp-surface-raised: var(--theme_color_bg);
            --grp-surface-border: var(--theme_color_border);
            --grp-surface-hover: var(--theme_color_bg_dark);

            /* Cards - opaque, structured */
            --grp-card-bg: var(--theme_color_input_bg);
            --grp-card-border: var(--theme_color_border);
            --grp-card-hover: var(--theme_color_bg_dark);

            /* Controls */
            --grp-button-bg: var(--theme_color_button_bg);
            --grp-button-text: var(--theme_color_text);

            /* Typography - professional sans-serif */
            --grp-font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --grp-font-size: 15px;

            /* Section backgrounds - flat colors */
            --grp-step-0: var(--theme_color_main);
            --grp-step-1: var(--theme_color_main);
            --grp-step-2: var(--theme_color_main);
            --grp-step-3: var(--theme_color_main);
            --grp-step-4: var(--theme_color_main);
            --grp-step-5: var(--theme_color_main);
            --grp-step-6: var(--theme_color_main);
            --grp-step-7: var(--theme_color_main);

            /* Sharp, professional edges */
            --grp-radius: 4px;
            --grp-radius-lg: 6px;
            --grp-radius-sm: 2px;

            /* Snappy transitions */
            --grp-transition: 0.15s ease;
            --grp-transition-fast: 0.1s ease;
            --grp-transition-bounce: 0.2s ease;
            
        --img_theme_4:url('data:image/png;base64,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');
        }

        /* ========== Reset for overlay ========== */
        #grp-overlay * {
            box-sizing: border-box;
            margin: 0;
        }

        /* ========== Main Overlay - Full immersive experience ========== */
        #grp-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99999;
            background: var(--grp-bg);
            font-family: var(--grp-font-family);
            color: var(--grp-text);
            overflow: hidden;
            font-size: var(--grp-font-size);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .grp-container {
            width: 100%;
            height: 100%;
            position: relative;
        }

        /* ========== Smooth Scroll Sections ========== */
        .grp-sections {
            scroll-snap-type: y mandatory;
            -webkit-overflow-scrolling: touch;
        }

        .grp-section {
            scroll-snap-align: start;
            scroll-snap-stop: always;
        }

        /* ========== Vertical Steps Navigation ========== */
        .grp-steps-nav {
            display: none;
        }

        .step-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all var(--grp-transition);
        }

        .step-nav-item:hover .step-nav-num {
            transform: scale(1.1);
            border-color: var(--grp-accent-light);
        }

        .step-nav-item.active .step-nav-num {
            border-color: var(--grp-accent-light);
            border-width: 3px;
        }

        .step-nav-item.completed .step-nav-num {
            background: var(--grp-success);
            border-color: var(--grp-success);
            color: white;
        }

        .step-nav-num {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: var(--grp-accent);
            color: white;
            border: 2px solid var(--grp-accent);
            border-radius: 50%;
            font-weight: 700;
            font-size: 16px;
            flex-shrink: 0;
            transition: all var(--grp-transition);
        }

        .step-nav-text {
            font-size: 0.75rem;
            color: var(--grp-text);
            font-weight: 500;
            text-align: center;
            line-height: 1.2;
            max-width: 80px;
        }

        /* Old nav-dot styles - keeping for compatibility */
        .nav-dots {
            display: none;
        }

        .nav-dot {
            display: none;
            background: var(--grp-text-dim);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }

        .nav-dot::before {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: transparent;
            transition: all 0.3s ease;
        }

        .nav-dot:hover {
            background: var(--grp-text-muted);
            transform: scale(1.2);
        }

        .nav-dot.active {
            background: var(--grp-accent-light);
            transform: scale(1.4);
            box-shadow: 0 0 20px var(--grp-accent-glow);
        }

        .nav-dot.completed {
            background: var(--grp-success);
        }

        /* ========== Sections Container - Smooth Scrolling ========== */
        .grp-sections {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            scroll-snap-type: y mandatory;
            scroll-behavior: smooth;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .grp-sections::-webkit-scrollbar {
            display: none;
        }

        .grp-section {
            min-height: 100vh;
            width: 100%;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 80px 48px;
            position: relative;
            overflow: hidden;
        }

        /* Subtle animated gradient background for sections */
        .grp-section::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse 80% 50% at 50% -20%, var(--grp-accent-glow), transparent);
            opacity: 0.15;
            pointer-events: none;
        }

        .grp-section[data-theme="dark"] { background: var(--grp-bg-dark); }
        .grp-section[data-theme="blue"],
        .grp-section[data-theme="purple"],
        .grp-section[data-theme="pink"],
        .grp-section[data-theme="green"],
        .grp-section[data-theme="teal"],
        .grp-section[data-theme="orange"] { background: var(--grp-bg); }

        .section-content {
            max-width: 720px;
            width: 100%;
            margin: 0 auto;
            padding: 0;
            position: relative;
            z-index: 1;
        }

        /* Staggered fade-in animation */
        .section-content > * {
            animation: fadeSlideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .section-content > *:nth-child(1) { animation-delay: 0.1s; }
        .section-content > *:nth-child(2) { animation-delay: 0.2s; }
        .section-content > *:nth-child(3) { animation-delay: 0.3s; }
        .section-content > *:nth-child(4) { animation-delay: 0.4s; }

        @keyframes fadeSlideUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ========== Section Headers - Apple-like Typography ========== */
        .section-header {
            text-align: center;
            margin-bottom: 48px;
        }

        .section-number {
            display: inline-block;
            font-size: 1.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--grp-accent-light);
            margin-bottom: 16px;
            padding: 6px 16px;
            background: var(--grp-glass);
            border-radius: 20px;
            border: 1px solid var(--grp-glass-border);
        }

        .section-header h2 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            font-weight: 700;
            line-height: 1.5;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, var(--grp-text) 0%, var(--grp-text) 50%, var(--grp-accent-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-header p {
            color: var(--grp-text-muted);
            font-size: 1.5rem;
            margin: 0 auto;
            line-height: 2.0;
        }

        /* ========== Hero Section (Welcome) ========== */
        .hero-content { text-align: center; margin-bottom: 28px; }

        .hero-title {
            font-size: 4rem;
            font-weight: 800;
            margin-bottom: 20px;
            line-height: 1.1;
        }

        .gradient-text {
            background: linear-gradient(135deg, var(--grp-text) 0%, var(--grp-accent) 50%, var(--grp-accent-light) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-subtitle {
            font-size: 1.8rem;
            color: var(--grp-text-muted);
            margin-bottom: 20px;
        }

        .hero-description {
            font-size: 1.3rem;
            color: var(--grp-text-dim);
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

        /* ========== Solid Corporate Cards ========== */
        .option-card,
        .ai-card,
        .style-card,
        .start-card,
        .greeting-card {
            background: var(--grp-card-bg);
            border: 2px solid var(--grp-card-border);
            border-radius: var(--grp-radius);
            transition: all var(--grp-transition);
            position: relative;
            overflow: hidden;
        }

        .option-card {
            padding: 48px 36px;
            text-align: center;
            cursor: pointer;
        }

        .option-card:hover,
        .ai-card:hover,
        .style-card:hover,
        .start-card:hover,
        .greeting-card:hover {
            background: var(--grp-card-hover);
            border-color: var(--grp-accent);
        }

        .ai-card.selected,
        .style-card.selected,
        .start-card.selected,
        .greeting-card.selected {
            background: var(--grp-accent-hover);
            border-color: var(--grp-accent-light);
            border-width: 3px;
        }

        .ai-card.selected::after,
        .style-card.selected::after,
        .start-card.selected::after {
            content: '✓';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 24px;
            height: 24px;
            background: var(--grp-accent-light);
            color: var(--grp-bg);
            border-radius: var(--grp-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
        }

        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }

        .option-icon {
            font-size: 4rem;
            margin-bottom: 24px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }

        .option-card h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 12px;
            letter-spacing: -0.01em;
        }

        .option-card p {
            color: var(--grp-text-muted);
            font-size: 1rem;
            line-height: 1.5;
        }

        /* ========== Steps Preview ========== */
        .steps-preview {
            margin-bottom: 50px;
        }

        .steps-preview h3 {
            text-align: center;
            color: var(--grp-text-muted);
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
            background: var(--grp-card-bg);
            border: 3px solid var(--grp-accent);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.4rem;
            color: var(--grp-accent-light);
        }

        .step-label {
            font-size: 1.1rem;
            color: var(--grp-text-muted);
        }

        /* ========== Corporate Buttons ========== */
        #grp-overlay .btn-primary, #grp-overlay .btn-secondary, #grp-overlay .btn-danger,
        .grp-dialog .btn-primary, .grp-dialog .btn-secondary, .grp-dialog .btn-danger {
            padding: 12px 24px;
            border-radius: var(--grp-radius);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--grp-transition);
            border: 2px solid transparent;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 140px;
            position: relative;
        }

        #grp-overlay .btn-primary, .grp-dialog .btn-primary {
            background: var(--grp-accent);
            color: var(--grp-bg);
            border-color: var(--grp-accent);
        }

        #grp-overlay .btn-primary:hover:not(:disabled), .grp-dialog .btn-primary:hover:not(:disabled) {
            background: var(--grp-accent-light);
            border-color: var(--grp-accent-light);
        }

        #grp-overlay .btn-primary:active:not(:disabled) {
            opacity: 0.9;
        }

        #grp-overlay .btn-primary:disabled, .grp-dialog .btn-primary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }

        #grp-overlay .btn-secondary, .grp-dialog .btn-secondary {
            background: var(--grp-surface);
            color: var(--grp-text);
            border-color: var(--grp-surface-border);
        }

        #grp-overlay .btn-secondary:hover, .grp-dialog .btn-secondary:hover {
            background: var(--grp-surface-hover);
            border-color: var(--grp-accent);
        }

        #grp-overlay .btn-danger, .grp-dialog .btn-danger {
            background: var(--grp-danger);
            color: white;
            border-color: var(--grp-danger);
        }

        #grp-overlay .btn-danger:hover, .grp-dialog .btn-danger:hover {
            opacity: 0.9;
        }

        #grp-overlay .btn-icon, .grp-dialog .btn-icon {
            width: 32px;
            height: 32px;
            border-radius: var(--grp-radius-sm);
            border: 1px solid var(--grp-surface-border);
            background: var(--grp-surface);
            color: var(--grp-text);
            cursor: pointer;
            transition: all var(--grp-transition);
            font-size: 1rem;
        }

        #grp-overlay .btn-icon:hover, .grp-dialog .btn-icon:hover {
            background: var(--grp-danger);
            color: white;
            border-color: var(--grp-danger);
        }

        .arrow {
            transition: transform var(--grp-transition-fast);
            font-size: 1.2rem;
        }

        #grp-overlay .btn-primary:hover .arrow, .grp-dialog .btn-primary:hover .arrow {
            transform: translateX(6px);
        }

        /* Start button special styling */
        .btn-start {
            padding: 18px 48px !important;
            font-size: 1.1rem !important;
            background: linear-gradient(135deg, var(--grp-success) 0%, #059669 100%) !important;
            box-shadow:
                0 4px 12px rgba(34, 197, 94, 0.3),
                inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }

        .btn-start:hover {
            box-shadow:
                0 8px 24px rgba(34, 197, 94, 0.4),
                0 0 60px rgba(34, 197, 94, 0.2),
                inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }

        /* ========== AI Selection Cards ========== */
        .ai-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .ai-card {
            padding: 32px 24px;
            text-align: center;
            cursor: pointer;
        }

        .ai-card:hover {
            border-color: var(--grp-accent);
        }

        .ai-card.selected {
            background: rgba(255,255,255,0.05);
            box-shadow: inset 0 0 0 2px var(--grp-accent-light);
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

        .ai-tag.free { background: var(--grp-success); color: white; }
        .ai-tag.local { background: var(--grp-accent); color: white; }
        .ai-tag.paid { background: var(--grp-warning); color: black; }

        .ai-desc {
            color: var(--grp-text-muted);
            font-size: 1.1rem;
            margin-bottom: 10px;
        }

        .ai-note {
            color: var(--grp-text-dim);
            font-size: 1rem;
            font-style: italic;
        }

        /* ========== Config Panels ========== */
        .ai-config {
            background: transparent;
            border-radius: var(--grp-radius);
            padding: 32px 0;
            margin-bottom: 16px;
            animation: fadeInUp 0.3s ease;
        }

        .config-info {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: var(--grp-radius-sm);
            font-size: 1.2rem;
        }

        .config-info.success {
            background: rgba(34, 197, 94, 0.15);
            border: 2px solid var(--grp-success);
        }

        .info-icon {
            font-size: 2rem;
        }

        /* ========== Modern Form Fields ========== */
        .config-field {
            margin-bottom: 24px;
        }

        .config-field label {
            display: block;
            font-weight: 500;
            margin-bottom: 10px;
            color: var(--grp-text);
            font-size: 0.95rem;
            letter-spacing: -0.01em;
        }

        .config-field input,
        .config-field select,
        .config-field textarea {
            width: 100%;
            padding: 10px 14px;
            border-radius: var(--grp-radius);
            border: 1px solid var(--grp-surface-border);
            background: var(--grp-surface);
            color: var(--grp-text);
            font-size: 0.95rem;
            font-family: inherit;
            transition: all var(--grp-transition);
        }

        .config-field input::placeholder,
        .config-field textarea::placeholder {
            color: var(--grp-text-dim);
        }

        .config-field input:hover,
        .config-field select:hover,
        .config-field textarea:hover {
            border-color: var(--grp-accent);
        }

        .config-field input:focus,
        .config-field select:focus,
        .config-field textarea:focus {
            outline: none;
            border-color: var(--grp-accent-light);
            border-width: 2px;
            padding: 9px 13px;
        }

        .config-field textarea {
            resize: vertical;
            min-height: 120px;
            line-height: 1.6;
        }

        .config-field select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            padding-right: 44px;
        }

        .field-hint {
            display: block;
            margin-top: 8px;
            font-size: 0.875rem;
            color: var(--grp-text-dim);
            line-height: 1.5;
        }

        .input-with-toggle {
            position: relative;
            display: flex;
        }

        .input-with-toggle input {
            padding-right: 52px;
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
            color: var(--grp-text-muted);
        }

        .style-options {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }

        .style-card {
            padding: 20px;
            text-align: center;
            cursor: pointer;
        }

        .style-card:hover {
            border-color: var(--grp-accent);
        }

        .style-card.selected {
            background: rgba(255,255,255,0.05);
            box-shadow: inset 0 0 0 2px var(--grp-accent-light);
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
            color: var(--grp-text-muted);
        }

        /* ========== Connection Status ========== */
        .connection-status {
            margin-top: 12px;
            padding: 12px;
            border-radius: var(--grp-radius-sm);
            font-size: 0.9rem;
        }

        .connection-status.success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--grp-success);
        }

        .connection-status.error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--grp-danger);
        }

        .connection-status.testing {
            background: var(--grp-card-hover);
            color: var(--grp-accent);
        }

        /* ========== Load Status (Save file loading) ========== */
        .load-status {
            margin-top: 20px;
            padding: 16px 20px;
            border-radius: var(--grp-radius-sm);
            text-align: center;
            font-size: 1rem;
            animation: fadeIn 0.3s ease;
        }

        .load-status.loading {
            background: rgba(99, 102, 241, 0.15);
            color: var(--grp-accent-light);
        }

        .load-status.loading .status-message::before {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--grp-accent-light);
            border-top-color: transparent;
            border-radius: 50%;
            margin-right: 10px;
            animation: spin 1s linear infinite;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .load-status.success {
            background: rgba(34, 197, 94, 0.15);
            color: var(--grp-success);
        }

        .load-status.error {
            background: rgba(239, 68, 68, 0.15);
            color: var(--grp-danger);
        }

        /* ========== Section Navigation (uniform positions) ========== */
        #grp-overlay .section-nav {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 40px;
            max-width: 520px;
            margin-left: auto;
            margin-right: auto;
        }

        #grp-overlay .section-nav .btn-back { grid-column: 1; width: 100%; min-width: 0; }
        #grp-overlay .section-nav .btn-next { grid-column: 2; width: 100%; min-width: 0; }
        #grp-overlay .section-nav.start-nav { grid-template-columns: 1fr 1fr; justify-items: stretch; }

        /* ========== Persona Section - Modern Segmented Control ========== */
        .persona-toggle-container {
            display: flex;
            justify-content: center;
            margin-bottom: 36px;
        }

        .persona-toggle {
            display: flex;
            position: relative;
            background: var(--grp-surface);
            border-radius: var(--grp-radius);
            padding: 3px;
            gap: 0;
            border: 1px solid var(--grp-surface-border);
        }

        .persona-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 32px;
            background: transparent;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            color: var(--grp-text-muted);
            transition: all var(--grp-transition);
            position: relative;
            z-index: 1;
            min-width: 130px;
        }

        .persona-toggle-btn:hover:not(.active) {
            color: var(--grp-text);
        }

        .persona-toggle-btn.active {
            color: white;
        }

        .toggle-icon {
            font-size: 18px;
        }

        .toggle-slider {
            position: absolute;
            top: 4px;
            left: 4px;
            width: calc(50% - 4px);
            height: calc(100% - 8px);
            background: var(--grp-button-bg);
            border-radius: 10px;
            transition: transform 0.25s ease;
            z-index: 0;
        }

        .persona-toggle-btn[data-method="import"].active ~ .toggle-slider {
            transform: translateX(100%);
        }

        .persona-panels {
            position: relative;
            min-height: 200px;
        }

        .persona-panel {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .persona-panel.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .optional-tag {
            font-size: 12px;
            font-weight: 400;
            color: var(--grp-text-dim);
            margin-left: 6px;
        }

        /* ========== Corporate Import/Dropzone ========== */
        .import-zone {
            border: 2px dashed var(--grp-surface-border);
            border-radius: var(--grp-radius);
            padding: 40px 28px;
            text-align: center;
            cursor: pointer;
            transition: all var(--grp-transition);
            background: var(--grp-surface);
            position: relative;
        }

        .import-zone:hover,
        .import-zone.drag-over {
            border-color: var(--grp-accent);
            background: var(--grp-accent-hover);
        }

        .import-zone.large {
            padding: 64px 40px;
        }

        .dropzone-icon {
            font-size: 3rem;
            display: block;
            margin-bottom: 16px;
        }

        .dropzone-content {
            position: relative;
            z-index: 1;
        }

        .dropzone-content p {
            margin-bottom: 8px;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .dropzone-hint {
            color: var(--grp-text-dim);
            font-size: 0.875rem;
        }

        /* ========== Imported Preview - Corporate Card ========== */
        .imported-persona {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            background: var(--grp-card-bg);
            border-radius: var(--grp-radius);
            border: 1px solid var(--grp-card-border);
        }

        .persona-avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--grp-glass-border);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }

        .persona-info {
            flex: 1;
        }

        .persona-info h4 {
            margin-bottom: 6px;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .persona-desc {
            color: var(--grp-text-muted);
            font-size: 0.95rem;
            line-height: 1.6;
            white-space: pre-wrap;
            max-height: 220px;
            overflow-y: auto;
            padding-right: 8px; /* visual room for scrollbar */
        }

        /* ========== Character Preview Card ========== */
        .character-preview {
            margin-top: 32px;
            animation: fadeInUp 0.4s ease;
        }

        .preview-card {
            background: var(--grp-card-bg);
            border: 1px solid var(--grp-card-border);
            border-radius: var(--grp-radius);
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
            border-radius: var(--grp-radius-sm);
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
            color: var(--grp-text-dim);
            font-size: 0.9rem;
        }

        .preview-body {
            padding: 20px;
        }

        .preview-section {
            margin-bottom: 16px;
        }

        .preview-section h4 {
            color: var(--grp-accent-light);
            font-size: 0.9rem;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .preview-section p {
            color: var(--grp-text-muted);
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .preview-section .scroll-text {
            color: var(--grp-text);
            line-height: 1.6;
            white-space: pre-wrap;
            max-height: 260px;
            overflow-y: auto;
            padding-right: 8px;
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
            background: linear-gradient(transparent, var(--grp-card-bg));
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
            border-top: 1px solid var(--grp-card-border);
        }

        .preview-tags .tag {
            background: var(--grp-accent);
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
            color: var(--grp-text-dim);
            text-transform: uppercase;
        }

        .summary-value {
            font-weight: 600;
        }

        /* ========== First Message Config ========== */
        .first-message-config {
            background: var(--grp-card-bg);
            border-radius: var(--grp-radius);
            padding: 24px;
            margin-bottom: 32px;
        }

        .first-message-config h3 {
            margin-bottom: 8px;
        }

        .config-hint {
            color: var(--grp-text-muted);
            margin-bottom: 20px;
        }

        .greeting-selector {
            margin-bottom: 16px;
        }

        .greeting-selector label {
            display: block;
            margin-bottom: 8px;
            color: var(--grp-text-muted);
        }

        .greeting-selector select {
            width: 100%;
            padding: 10px;
            border-radius: var(--grp-radius-sm);
            border: 1px solid var(--grp-card-border);
            background: rgba(0, 0, 0, 0.3);
            color: var(--grp-text);
        }

        .first-message-preview {
            margin-bottom: 16px;
        }

        .message-bubble {
            background: rgba(99, 102, 241, 0.2);
            border-radius: var(--grp-radius);
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
            color: var(--grp-text-muted);
        }

        .custom-message-toggle input {
            accent-color: var(--grp-accent);
        }

        .custom-message-input textarea {
            width: 100%;
            padding: 16px;
            border-radius: var(--grp-radius-sm);
            border: 1px solid var(--grp-card-border);
            background: rgba(0, 0, 0, 0.3);
            color: var(--grp-text);
            font-size: 1rem;
            resize: vertical;
        }

        /* ========== Simplified Chat Header ========== */
        #grp-chat-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: var(--theme_color_topmenu);
            border-bottom: 0px solid var(--theme_color_border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            z-index: 9999;
            font-family: var(--grp-font-family);
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
            border: 2px solid var(--grp-card-border);
        }

        .chat-char-name {
            font-weight: 600;
            font-size: 1.3rem;
            color: var(--theme_color_topmenu_text);
        }

        .chat-header-right {
            display: flex;
            gap: 10px;
        }

        .header-btn {
            height: 36px;
            padding: 0 8px;
            border-radius: 8px;
            border: 0px solid var(--theme_color_border);
            cursor: pointer;
            font-size: 32px;
            line-height: 50px;
            color: var(--theme_color_topmenu_text);
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .header-btn:hover {
            background: var(--theme_color_topbtn_highlight);
            border-color: var(--theme_color_border_highlight);
        }

        /* ========== Dialog ========== */
        .grp-dialog {
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
            background: var(--grp-bg-dark);
            border: 1px solid var(--grp-card-border);
            border-radius: var(--grp-radius);
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
            color: var(--grp-text-muted);
            margin-bottom: 12px;
        }

        .dialog-warning {
            color: var(--grp-danger) !important;
            font-weight: 600;
        }

        .dialog-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 24px;
        }

        /* ========== Easy Mode UI Hiding ========== */
        body.grp-easy-mode #top_bar,
        body.grp-easy-mode #leftpanel,
        body.grp-easy-mode .btn-add,
        body.grp-easy-mode #topbar_bg,
        body.grp-easy-mode #btn_settings,
        body.grp-easy-mode #btn_story,
        body.grp-easy-mode #btn_save,
        body.grp-easy-mode #corpo_chat_img_btn,
        body.grp-easy-mode .corpoavatar {
            display: none !important;
        }

        body.grp-easy-mode #gamescreen {
            padding-top: 70px !important;
        }

        /* Hide corpo left panel completely in easy mode */
        body.grp-easy-mode #corpo_leftpanel,
        body.grp-easy-mode .corpo_leftpanel {
            display: none !important;
            width: 0 !important;
        }

        /* ========== Mobile Responsive - Tablet ========== */
        @media (max-width: 768px) {
            .grp-nav {
                right: 12px;
            }

            .nav-dot {
                width: 10px;
                height: 10px;
            }

            .grp-section {
                padding: 40px 20px;
            }

            .section-content {
                padding: 24px 16px;
                max-width: 100%;
            }

            .hero-title { font-size: 2.5rem; }
            .section-header h2 { font-size: 2rem; }

            .hero-subtitle {
                font-size: 1.2rem;
            }

            .welcome-options {
                grid-template-columns: 1fr;
            }

            .ai-options {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .ai-card {
                padding: 24px 20px;
            }

            .style-options { grid-template-columns: 1fr; }
            .writing-style-options { flex-direction: column; gap: 12px; }

            .steps-grid {
                flex-wrap: wrap;
                gap: 16px;
            }

            /* Intro section - Tablet */
            .intro-layout-corpo {
                padding: 40px 20px;
            }

            .intro-thumbnail-clickable {
                width: 256px;
                height: 256px;
            }

            .intro-title-corpo {
                font-size: 4.0rem;
            }

            .intro-subtitle-corpo {
                font-size: 2rem;
            }

            /* Steps nav - hide on tablet/mobile */
            .grp-steps-nav {
                display: none;
            }

            .step-num {
                width: 36px;
                height: 36px;
                font-size: 14px;
            }

            .step-text {
                font-size: 10px;
            }

            .intro-nav .btn-large {
                padding: 14px 36px;
                font-size: 1.1rem;
            }

            .start-options {
                flex-direction: column;
                align-items: stretch;
                gap: 16px;
            }

            .start-card {
                padding: 24px 20px;
            }

            .start-icon {
                font-size: 48px;
            }

            .start-summary {
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }

            /* Navigation buttons */
            #grp-overlay .section-nav {
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            #grp-overlay .btn-primary,
            #grp-overlay .btn-secondary {
                padding: 12px 20px;
                font-size: 1rem;
                min-width: 0;
            }

            .preview-header {
                flex-direction: column;
                text-align: center;
            }

            .imported-persona {
                flex-direction: column;
                text-align: center;
            }

            /* Persona toggle on tablet */
            .persona-toggle-btn {
                padding: 10px 20px;
                min-width: 100px;
            }

            /* Overview summary - tablet */
            .overview-summary {
                grid-template-columns: repeat(3, 1fr);
            }

            .overview-summary .summary-item {
                padding: 16px 12px;
            }

            .overview-summary .summary-icon {
                font-size: 24px;
            }

            .overview-summary .summary-value {
                font-size: 13px;
            }
        }

        /* ========== Mobile Responsive - Small Phones (350px+) ========== */
        @media (max-width: 480px) {
            .grp-nav {
                right: 8px;
                gap: 12px;
            }

            .nav-dots {
                gap: 14px;
            }

            .nav-dot {
                width: 8px;
                height: 8px;
                border-width: 2px;
            }

            .grp-section {
                padding: 30px 12px;
                min-height: 100dvh;
            }

            .section-content {
                padding: 20px 12px;
            }

            .section-header {
                margin-bottom: 20px;
            }

            .section-header h2 {
                font-size: 1.6rem;
                line-height: 1.2;
            }

            .section-header p {
                font-size: 0.9rem;
            }

            /* Intro Section - Small phones */
            .intro-layout-corpo {
                gap: 20px;
            }

            .intro-hero {
                gap: 14px;
            }

            .intro-thumbnail {
                width: 100px;
                height: 100px;
            }

            .intro-title {
                font-size: 26px;
            }

            .intro-subtitle {
                font-size: 14px;
            }

            .intro-steps-wrapper {
                padding: 0;
            }

            .intro-steps-label {
                font-size: 12px;
                margin-bottom: 16px;
            }

            .intro-steps {
                grid-template-columns: repeat(4, 1fr);
                gap: 10px 4px;
            }

            .step-num {
                width: 30px;
                height: 30px;
                font-size: 12px;
                border-width: 2px;
            }

            .step-text {
                font-size: 9px;
                max-width: 60px;
            }

            .intro-nav .btn-large {
                padding: 12px 28px;
                font-size: 1rem;
            }

            /* Cards */
            .ai-card, .start-card, .style-card {
                padding: 20px 16px;
            }

            .ai-icon, .start-icon {
                font-size: 40px;
                margin-bottom: 12px;
            }

            .ai-card h3, .start-card h3 {
                font-size: 18px;
                padding-bottom: 8px;
            }

            .ai-desc, .start-card p {
                font-size: 13px;
            }

            .ai-note {
                font-size: 12px;
            }

            .ai-tag {
                padding: 4px 12px;
                font-size: 0.8rem;
            }

            /* Writing style cards */
            .writing-style-options .style-card {
                padding: 20px 16px;
            }

            .style-icon {
                font-size: 36px;
            }

            .writing-style-options h4 {
                font-size: 16px;
            }

            .style-desc {
                font-size: 16px;
            }

            .style-details {
                font-size: 11px;
            }

            /* Persona toggle */
            .persona-toggle {
                width: 100%;
                max-width: 280px;
            }

            .persona-toggle-btn {
                flex: 1;
                padding: 10px 12px;
                min-width: 0;
                font-size: 13px;
            }

            .toggle-icon {
                font-size: 16px;
            }

            /* Form fields */
            .config-field input,
            .config-field select,
            .config-field textarea {
                padding: 14px 16px;
                font-size: 1rem;
            }

            .config-field label {
                font-size: 1rem;
            }

            .field-hint {
                font-size: 0.85rem;
            }

            /* Import zones */
            .import-zone {
                padding: 30px 20px;
            }

            .import-zone.large {
                padding: 40px 20px;
            }

            .dropzone-icon {
                font-size: 2.5rem;
            }

            /* Navigation buttons */
            #grp-overlay .section-nav {
                gap: 10px;
                margin-top: 28px;
            }

            #grp-overlay .btn-primary,
            #grp-overlay .btn-secondary {
                padding: 12px 16px;
                font-size: 0.9rem;
            }

            .arrow {
                font-size: 1.1rem;
            }

            /* Character preview */
            .preview-avatar {
                width: 64px;
                height: 64px;
            }

            .preview-title h3 {
                font-size: 1.2rem;
            }

            .preview-body {
                padding: 16px;
            }

            /* Overview summary - small phones */
            .overview-summary {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }

            .overview-summary .summary-item {
                padding: 14px 10px;
            }

            .overview-summary .summary-icon {
                font-size: 22px;
            }

            .overview-summary .summary-label {
                font-size: 10px;
            }

            .overview-summary .summary-value {
                font-size: 12px;
            }

            /* Greeting preview */
            .greeting-preview h4 {
                font-size: 12px;
            }

            .preview-bubble {
                padding: 14px 16px;
                font-size: 13px;
            }
        }

        /* ========== Mobile Responsive - Very Small Phones (350px) ========== */
        @media (max-width: 360px) {
            .grp-section {
                padding: 24px 8px;
            }

            .section-content {
                padding: 16px 10px;
            }

            .section-header h2 {
                font-size: 1.4rem;
            }

            .intro-thumbnail {
                width: 80px;
                height: 80px;
            }

            .intro-title {
                font-size: 22px;
            }

            .intro-subtitle {
                font-size: 13px;
            }

            .intro-steps-label {
                font-size: 11px;
                margin-bottom: 12px;
            }

            .intro-steps {
                grid-template-columns: repeat(4, 1fr);
                gap: 8px 3px;
            }

            .step-num {
                width: 26px;
                height: 26px;
                font-size: 11px;
            }

            .step-text {
                font-size: 8px;
                max-width: 50px;
            }

            .intro-nav .btn-large {
                padding: 10px 24px;
                font-size: 0.9rem;
            }

            .ai-card, .start-card, .style-card {
                padding: 16px 12px;
            }

            .ai-icon, .start-icon {
                font-size: 32px;
            }

            .ai-card h3, .start-card h3 {
                font-size: 16px;
            }

            .persona-toggle-btn {
                padding: 8px 10px;
                font-size: 12px;
            }

            #grp-overlay .btn-primary,
            #grp-overlay .btn-secondary {
                padding: 10px 12px;
                font-size: 0.85rem;
            }
        }

        /* ========== Return to Easy Mode Button ========== */
        .grp-return-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99998;
            background: var(--grp-accent);
            color: var(--grp-button-text);
            border: none;
            border-radius: 30px;
            padding: 16px 28px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
            transition: all 0.3s ease;
            font-family: var(--grp-font-family);
        }

        .grp-return-btn:hover {
            background: var(--grp-accent-light);
            transform: translateY(-3px);
            box-shadow: 0 6px 30px rgba(0, 0, 0, 0.5);
        }

        /* ========== NEW SECTION STYLES (8 sections) ========== */

        /* ========== Section 0: Intro - Corporate Layout ========== */
        .intro-layout-corpo {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 40px;
            height: 100%;
        }

        .intro-main {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .intro-title-corpo {
            font-size: clamp(3.0rem, 6vw, 5.0rem);
            font-weight: bold;
            margin: 0 0 16px 0;
            line-height: 1.1;
            color: var(--grp-text);
        }

        .intro-title-corpo::after {
            content: ' Esolite';
            background: var(--grp-accent);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .intro-subtitle-corpo {
            font-size: 1.75rem;
            font-weight: 400;
            color: var(--grp-text-muted);
            margin-bottom: 24px !important;
            line-height: 2.0;
        }

        .intro-thumbnail-wrapper {
            margin: 0;
        }

        .intro-thumbnail-clickable {
            width: 256px;
            height: 256px;
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
            border-radius: var(--grp-radius);
            border: 3px solid var(--grp-accent);
            cursor: pointer;
            transition: all var(--grp-transition);
            animation: bounceUpDown 3s ease-in-out infinite;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            will-change: transform;
            -webkit-transform: translateZ(0);
            backface-visibility: hidden;
        }

        @keyframes bounceUpDown {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-30px); }
        }

        .intro-thumbnail-clickable:hover {
            border-color: var(--grp-accent-light);
            border-width: 4px;
            animation-play-state: paused;
        }

        .intro-cta {
            font-size: 1.0rem;
            font-weight: 600;
            color: var(--grp-accent-light);
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }


        /* Section 1: Start Mode (Fresh/Continue) */
        .start-options {
            display: flex;
            gap: 24px;
            width: 100%;
            max-width: 768px;
            margin: 40px auto;
            justify-content: center;
        }

        .start-card {
            flex: 1;
            padding: 32px;
            background: var(--grp-card-bg);
            border: none;
            border-radius: var(--grp-radius);
            cursor: pointer;
            transition: var(--grp-transition);
            text-align: center;
        }

        .start-card:hover {
            background: var(--grp-card-hover);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .start-icon {
            font-size: 64px;
            margin-bottom: 16px;
        }

        .start-card h3 {
            margin: 0 0 12px 0;
            color: var(--grp-text);
            font-size: 24px;
        }

        .start-card p {
            margin: 0;
            color: var(--grp-text-muted);
            font-size: 15px;
            line-height: 1.5;
        }

        /* Section 3: Writing Style */
        .writing-style-options {
            display: flex;
            gap: 20px;
            margin: 32px 0;
        }

        .writing-style-options .style-card {
            flex: 1;
            padding: 24px;
            cursor: pointer;
            text-align: center;
        }

        .writing-style-options .style-card:hover {
            border-color: var(--grp-accent);
            background: var(--grp-card-hover);
        }

        .writing-style-options .style-card.selected {
            border-color: var(--grp-accent-light);
            background: var(--grp-card-hover);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.25);
        }

        .style-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .writing-style-options h4 {
            margin: 0 0 8px 0;
            color: var(--grp-text);
            font-size: 20px;
        }

        .style-desc {
            margin: 0 0 16px 0;
            color: var(--grp-text-muted);
            font-size: 14px;
        }

        .style-details {
            font-size: 13px;
            color: var(--grp-text-dim);
            line-height: 1.6;
            margin-top: 4px;
        }

        .detail-label {
            font-weight: 600;
            color: var(--grp-text-muted);
        }

        .style-preview {
            margin-top: 32px;
            padding: 20px 0;
            background: transparent;
            border-radius: 0;
        }

        .style-preview h4 {
            margin: 0 0 12px 0;
            color: var(--grp-text);
            font-size: 16px;
        }

        .preview-text {
            color: var(--grp-text-muted);
            font-size: 15px;
            line-height: 1.6;
            font-style: italic;
        }

        /* Section 6: Greeting Selection */
        .greeting-options, .greeting-list {
            margin: 24px 0;
        }

        .greeting-note {
            text-align: center;
            padding: 40px;
            color: var(--grp-text-muted);
        }

        .greetings-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
        }

        .greeting-card {
            padding: 20px;
            border-radius: var(--grp-radius-sm);
            cursor: pointer;
        }

        .greeting-card:hover {
            border-color: var(--grp-accent);
            background: var(--grp-card-hover);
        }

        .greeting-card.selected {
            background: rgba(255,255,255,0.05);
            box-shadow: inset 0 0 0 2px var(--grp-accent-light);
        }

        .greeting-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--grp-accent-light);
            margin-bottom: 8px;
        }

        .greeting-text {
            font-size: 14px;
            color: var(--grp-text-muted);
            line-height: 1.5;
        }

        /* Greeting Carousel */
        .greeting-carousel {
            margin: 24px 0;
        }
        .carousel-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 12px;
        }
        .carousel-arrow {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid var(--grp-card-border);
            background: var(--grp-card-bg);
            color: var(--grp-text);
            cursor: pointer;
            font-size: 18px;
        }
        .carousel-arrow:hover {
            border-color: var(--grp-accent);
            background: var(--grp-card-hover);
        }
        .carousel-counter {
            font-size: 14px;
            color: var(--grp-text-muted);
            min-width: 70px;
            text-align: center;
        }
        .carousel-window {
            max-height: 260px;
            overflow-y: auto;
            padding: 16px;
            border-radius: var(--grp-radius-sm);
            border: 1px solid var(--grp-card-border);
            background: var(--grp-card-bg);
        }
        .carousel-text {
            white-space: pre-wrap;
            color: var(--grp-text);
            line-height: 1.6;
            font-size: 15px;
        }

        .custom-greeting-option {
            margin: 24px 0;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--grp-text);
        }

        .custom-greeting-input {
            margin-top: 16px;
        }

        .custom-greeting-input textarea {
            width: 100%;
            min-height: 150px;
            padding: 16px;
            background: var(--grp-card-bg);
            border: 2px solid var(--grp-card-border);
            border-radius: var(--grp-radius-sm);
            color: var(--grp-text);
            font-family: inherit;
            font-size: 15px;
            line-height: 1.6;
            resize: vertical;
        }

        /* Section 7: Overview - Modern Summary Cards */
        .overview-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
            margin: 40px 0;
        }

        .overview-summary .summary-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
            padding: 24px 16px;
            background: var(--grp-glass);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: var(--grp-radius);
            border: 1px solid var(--grp-glass-border);
            transition: all var(--grp-transition);
        }

        .overview-summary .summary-item:hover {
            background: var(--grp-glass-hover);
            border-color: var(--grp-accent-light);
            transform: translateY(-4px);
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
        }

        .overview-summary .summary-icon {
            font-size: 32px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }

        .overview-summary .summary-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .overview-summary .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--grp-text-dim);
            font-weight: 500;
        }

        .overview-summary .summary-value {
            font-size: 14px;
            font-weight: 600;
            color: var(--grp-text);
        }

        .greeting-preview {
            margin: 40px 0;
        }

        .greeting-preview h4 {
            margin: 0 0 16px 0;
            color: var(--grp-text-dim);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 500;
        }

        .preview-bubble {
            padding: 24px;
            background: var(--grp-glass);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: var(--grp-radius);
            border: 1px solid var(--grp-glass-border);
            color: var(--grp-text-muted);
            font-size: 15px;
            line-height: 1.7;
            font-style: italic;
            max-height: 200px;
            overflow-y: auto;
            position: relative;
        }

        .preview-bubble::before {
            content: '"';
            position: absolute;
            top: 12px;
            left: 16px;
            font-size: 48px;
            color: var(--grp-accent-glow);
            font-family: Georgia, serif;
            line-height: 1;
            opacity: 0.5;
        }

        /* Progressive per-section backgrounds (dark → light) */
        .grp-section[data-section="0"] { background: var(--grp-step-0), var(--grp-bg-dark); }
        .grp-section[data-section="1"] { background: var(--grp-step-1), var(--grp-bg-dark); }
        .grp-section[data-section="2"] { background: var(--grp-step-2), var(--grp-bg-dark); }
        .grp-section[data-section="3"] { background: var(--grp-step-3), var(--grp-bg-dark); }
        .grp-section[data-section="4"] { background: var(--grp-step-4), var(--grp-bg); }
        .grp-section[data-section="5"] { background: var(--grp-step-5), var(--grp-bg); }
        .grp-section[data-section="6"] { background: var(--grp-step-6), var(--grp-bg); }
        .grp-section[data-section="7"] { background: var(--grp-step-7), var(--grp-bg); }

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

        .grp-return-btn {
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
            this.bindIntroSection();          // Section 0
            this.bindStartModeSection();      // Section 1
            this.bindAISection();              // Section 2
            this.bindWritingStyleSection();    // Section 3
            this.bindPersonaSection();         // Section 4
            this.bindCharacterSection();       // Section 5
            this.bindGreetingSection();        // Section 6
            this.bindOverviewSection();        // Section 7
            this.bindScrollObserver();
        },

        // Navigation dots
        bindNavigation() {
            // Legacy dot navigation (if present)
            document.querySelectorAll('.nav-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    const section = parseInt(dot.dataset.section);
                    this.scrollToSection(section);
                });
            });

            // Side step navigation items
            document.querySelectorAll('.grp-steps-nav .step-nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const section = parseInt(item.dataset.section);
                    if (!Number.isNaN(section)) this.scrollToSection(section);
                });
                item.setAttribute('role', 'button');
                item.setAttribute('tabindex', '0');
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const section = parseInt(item.dataset.section);
                        if (!Number.isNaN(section)) this.scrollToSection(section);
                    }
                });
            });

            // Next/Back triggers (support any element with data-next / data-back)
            document.querySelectorAll('[data-next]').forEach(el => {
                el.addEventListener('click', () => {
                    const next = parseInt(el.dataset.next);
                    if (!Number.isNaN(next)) this.scrollToSection(next);
                });
                // Keyboard activation for accessibility
                el.addEventListener('keydown', (e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute('role') === 'button') {
                        e.preventDefault();
                        const next = parseInt(el.dataset.next);
                        if (!Number.isNaN(next)) this.scrollToSection(next);
                    }
                });
            });

            document.querySelectorAll('[data-back]').forEach(el => {
                el.addEventListener('click', () => {
                    const back = parseInt(el.dataset.back);
                    if (!Number.isNaN(back)) this.scrollToSection(back);
                });
                // Keyboard activation for accessibility
                el.addEventListener('keydown', (e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && el.getAttribute('role') === 'button') {
                        e.preventDefault();
                        const back = parseInt(el.dataset.back);
                        if (!Number.isNaN(back)) this.scrollToSection(back);
                    }
                });
            });
        },

        // Scroll to a specific section
        scrollToSection(index) {
            const sections = document.querySelectorAll('.grp-section');
            if (sections[index]) {
                sections[index].scrollIntoView({ behavior: 'smooth' });
                state.currentSection = index;
                this.updateNavDots();
                saveState();
            }
        },

        // Update navigation dots state
        updateNavDots() {
            // Legacy dot nav
            document.querySelectorAll('.nav-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === state.currentSection);
                // Mark completed sections
                if (i < state.currentSection) {
                    dot.classList.add('completed');
                }
            });

            // Side step nav
            document.querySelectorAll('.grp-steps-nav .step-nav-item').forEach((item) => {
                const sec = parseInt(item.dataset.section);
                if (Number.isNaN(sec)) return;
                item.classList.toggle('active', sec === state.currentSection);
                if (sec < state.currentSection) item.classList.add('completed');
            });
        },

        // Scroll observer for section changes
        bindScrollObserver() {
            const sections = document.querySelectorAll('.grp-section');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const index = parseInt(entry.target.dataset.section);
                        state.currentSection = index;
                        this.updateNavDots();

                        // Update overview when section 7 is viewed
                        if (index === 7) {
                            this.updateOverviewSummary();
                        }

                        // Validate greeting section when viewed (in case character was just imported)
                        if (index === 6) {
                            this.validateGreetingSection();
                        }
                    }
                });
            }, { threshold: 0.5 });

            sections.forEach(section => observer.observe(section));
        },

        // Section 0: Introduction events
        bindIntroSection() {
            // Introduction section just has a "Let's Begin" button that goes to section 1
            // Navigation is handled by bindNavigation()
        },

        // Section 1: Start Mode events
        bindStartModeSection() {
            // Start fresh button
            { const el = document.getElementById('start-fresh-card'); if (el) el.addEventListener('click', () => {
                log('Starting fresh adventure');
                // Just proceed to next section
                this.scrollToSection(2);
            }); }

            // Continue (import save) button
            const continueCard = document.getElementById('continue-card');
            const saveInput = document.getElementById('save-file-input');

            if (continueCard) continueCard.addEventListener('click', () => { if (saveInput) saveInput.click(); });

            // Named function for save file handling (needed for re-binding after clone)
            const handleSaveFileChange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Show loading state
                const statusEl = document.getElementById('load-status');
                if (statusEl) {
                    statusEl.style.display = 'block';
                    statusEl.querySelector('.status-message').textContent = 'Loading save file...';
                    statusEl.className = 'load-status loading';
                }

                try {
                    const text = await FileParser.readAsText(file);
                    const saveData = JSON.parse(text);

                    // Load the save via Esolite bridge
                    if (typeof window.kai_json_load === 'function') {
                        window.kai_json_load(saveData, false);

                        // Update Guided RP state
                        state.setupComplete = true;
                        state.rpModeActive = true;
                        // Restore Guided snapshot if present
                        if (saveData.guided_rp && saveData.guided_rp.config) {
                            try {
                                const g = saveData.guided_rp;
                                state.currentSection = g.progress?.currentSection ?? state.currentSection;
                                state.easyMode = (g.progress?.easyMode !== undefined) ? g.progress.easyMode : state.easyMode;
                                Object.assign(state.config, {
                                    aiType: g.config.aiType ?? state.config.aiType,
                                    cloudProvider: g.config.cloudProvider ?? state.config.cloudProvider,
                                    endpoint: g.config.endpoint ?? state.config.endpoint,
                                    model: g.config.model ?? state.config.model,
                                    writingStyle: g.config.writingStyle ?? state.config.writingStyle,
                                    firstMessage: g.config.firstMessage ?? state.config.firstMessage,
                                });
                                if (g.config.persona) {
                                    state.config.persona.name = g.config.persona.name ?? state.config.persona.name;
                                    state.config.persona.description = g.config.persona.description ?? state.config.persona.description;
                                }
                                if (g.config.character) {
                                    state.config.character = {
                                        ...state.config.character,
                                        ...g.config.character
                                    };
                                }
                            } catch (err) {
                                console.warn('Failed to restore Guided RP snapshot:', err);
                            }
                        } else {
                            // Legacy: try to extract minimal info from KAI save
                            if (saveData.char_name) {
                                state.config.character = state.config.character || {};
                                state.config.character.name = saveData.char_name;
                            }
                            if (saveData.char_persona) {
                                state.config.character = state.config.character || {};
                                state.config.character.description = saveData.char_persona;
                            }
                        }

                        saveState();

                        // Show success message briefly
                        if (statusEl) {
                            statusEl.querySelector('.status-message').textContent = '✓ Save loaded successfully!';
                            statusEl.className = 'load-status success';
                        }

                        // Transition to chat mode after brief delay
                        setTimeout(() => {
                            hideOverlay();
                            showSimplifiedChat();
                        }, 800);
                    } else {
                        throw new Error('Esolite save loader not available. Please refresh the page.');
                    }
                } catch (err) {
                    console.error('Save load failed:', err);
                    if (statusEl) {
                        statusEl.querySelector('.status-message').textContent = '✕ ' + err.message;
                        statusEl.className = 'load-status error';
                    } else {
                        alert('Failed to load save file: ' + err.message);
                    }
                }

                // Reset file input value so the same file can be selected again
                e.target.value = '';
            };

            if (saveInput) saveInput.addEventListener('change', handleSaveFileChange);
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
                    const configPanel = document.querySelector(`.config-${aiType}`);
                    if (configPanel) configPanel.style.display = 'block';

                    this.validateAISection();
                    saveState();
                });
            });

            // KoboldCpp test connection
            { const btn = document.getElementById('test-kobold'); if (btn) btn.addEventListener('click', async () => {
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
            }); }

            // Cloud provider selection
            { const el = document.getElementById('cloud-provider'); if (el) el.addEventListener('change', (e) => {
                const provider = CLOUD_PROVIDERS[e.target.value];
                state.config.cloudProvider = e.target.value;

                // Show/hide custom endpoint field
                document.getElementById('custom-endpoint-field').style.display =
                    provider.needsEndpoint ? 'block' : 'none';

                // Update placeholder
                document.getElementById('cloud-apikey').placeholder = provider.keyPlaceholder;

                // Update model options
                const modelSelect = document.getElementById('cloud-model');
                modelSelect.innerHTML = '';
                provider.models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    modelSelect.appendChild(opt);
                });

                this.validateAISection();
                saveState();
            }); }

            // API key input
            { const el = document.getElementById('cloud-apikey'); if (el) el.addEventListener('input', (e) => {
                state.config.apiKey = e.target.value;
                this.validateAISection();
                saveState();
            }); }

            // Custom endpoint input
            { const el = document.getElementById('cloud-endpoint'); if (el) el.addEventListener('input', (e) => {
                state.config.endpoint = e.target.value;
                this.validateAISection();
                saveState();
            }); }

            // Model selection
            { const el = document.getElementById('cloud-model'); if (el) el.addEventListener('change', (e) => {
                state.config.model = e.target.value;
                saveState();
            }); }

            // Horde API key input
            { const el = document.getElementById('horde-apikey'); if (el) el.addEventListener('input', (e) => {
                state.config.apiKey = e.target.value;
                saveState();
            }); }

            // Toggle API key visibility (for all toggle buttons)
            document.querySelectorAll('.toggle-visibility').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const inputWrapper = e.target.closest('.input-with-toggle');
                    if (inputWrapper) {
                        const input = inputWrapper.querySelector('input');
                        if (input) {
                            const isPassword = input.type === 'password';
                            input.type = isPassword ? 'text' : 'password';
                            e.target.textContent = isPassword ? '🙈' : '👁';
                        }
                    }
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
                if (provider && provider.needsEndpoint) {
                    valid = valid && state.config.endpoint && state.config.endpoint.length > 0;
                }
            }

            const nextBtn = document.querySelector('.section-ai .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Section 3: Writing Style events
        bindWritingStyleSection() {
            const previewTexts = {
                chat: 'Short, snappy messages perfect for quick back-and-forth conversations. Great for casual chat roleplay.',
                normal: 'A balanced writing style that provides good detail without being overwhelming. Recommended for most roleplays.',
                creative: 'Rich, expressive prose with detailed descriptions and longer responses. Ideal for immersive storytelling.'
            };

            document.querySelectorAll('.style-card').forEach(card => {
                card.addEventListener('click', () => {
                    // Deselect all
                    document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
                    // Select clicked
                    card.classList.add('selected');
                    // Update state
                    state.config.writingStyle = card.dataset.style;
                    saveState();

                    // Update preview text
                    const previewEl = document.getElementById('style-preview-text');
                    if (previewEl && previewTexts[card.dataset.style]) {
                        previewEl.textContent = previewTexts[card.dataset.style];
                    }

                    log('Writing style selected:', state.config.writingStyle);
                });
            });
        },

        // Section 4: Persona section events
        bindPersonaSection() {
            // Modern toggle button switching
            document.querySelectorAll('.persona-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const method = btn.dataset.method;

                    // Update toggle button states
                    document.querySelectorAll('.persona-toggle-btn').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');

                    // Update hidden input for form compatibility
                    const hiddenInput = document.querySelector('input[name="persona-method"]');
                    if (hiddenInput) hiddenInput.value = method;

                    // Switch panels
                    document.querySelectorAll('.persona-panel').forEach(panel => {
                        panel.classList.remove('active');
                    });
                    const targetPanel = document.querySelector(`.persona-panel[data-panel="${method}"]`);
                    if (targetPanel) targetPanel.classList.add('active');

                    this.validatePersonaSection();
                });
            });

            // Manual input
            { const el = document.getElementById('persona-name'); if (el) el.addEventListener('input', (e) => {
                state.config.persona.name = e.target.value;
                this.validatePersonaSection();
                saveState();
            }); }

            { const el = document.getElementById('persona-description'); if (el) el.addEventListener('input', (e) => {
                state.config.persona.description = e.target.value;
                saveState();
            }); }

            // Persona file import
            const dropzone = document.getElementById('persona-dropzone');
            const fileInput = document.getElementById('persona-file-input');

            if (dropzone) dropzone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
            if (dropzone) dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            if (dropzone) dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('drag-over');
            });
            if (dropzone) dropzone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) await this.handlePersonaImport(file);
            });

            if (fileInput) fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await this.handlePersonaImport(file);
            });

            // Remove imported persona
            { const el = document.getElementById('remove-persona'); if (el) el.addEventListener('click', () => {
                state.config.persona = { name: '', description: '', avatar: null };
                document.getElementById('imported-persona').style.display = 'none';
                document.getElementById('persona-dropzone').style.display = 'block';
                this.validatePersonaSection();
                saveState();
            }); }
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
                document.getElementById('imported-persona-desc').textContent = state.config.persona.description || '';

                this.validatePersonaSection();
                saveState();
            } catch (err) {
                alert('Failed to import persona: ' + err.message);
            }
        },

        // Validate persona section
        validatePersonaSection() {
            const methodEl = document.querySelector('input[name="persona-method"]');
            const method = methodEl ? methodEl.value : 'manual';
            let valid = false;

            // Both methods require a name to be valid
            valid = state.config.persona.name && state.config.persona.name.length > 0;

            const nextBtn = document.querySelector('.section-persona .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Character section events
        bindCharacterSection() {
            const dropzone = document.getElementById('character-dropzone');
            const fileInput = document.getElementById('character-file-input');

            if (dropzone) dropzone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
            if (dropzone) dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            if (dropzone) dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('drag-over');
            });
            if (dropzone) dropzone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) await this.handleCharacterImport(file);
            });

            if (fileInput) fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) await this.handleCharacterImport(file);
            });

            // Remove character
            { const el = document.getElementById('remove-character'); if (el) el.addEventListener('click', () => {
                state.config.character = null;
                state.config.firstMessage = '';
                document.getElementById('character-preview').style.display = 'none';
                document.getElementById('character-dropzone').style.display = 'block';
                this.validateCharacterSection();
                saveState();
            }); }

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

                // Handle tags (escape safely)
                const tagsContainer = document.getElementById('char-tags');
                tagsContainer.innerHTML = '';
                (resolved.tags || []).forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'tag';
                    span.textContent = t;
                    tagsContainer.appendChild(span);
                });

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

        // Section 6: Greeting selection events
        bindGreetingSection() {
            // Custom greeting toggle
            { const el = document.getElementById('use-custom-greeting'); if (el) el.addEventListener('change', (e) => {
                document.getElementById('custom-greeting-section').style.display =
                    e.target.checked ? 'block' : 'none';
                this.validateGreetingSection();
                // If switching back from custom to preset, ensure carousel selection writes firstMessage
                if (!e.target.checked) {
                    this.syncGreetingFromCarousel();
                }
            }); }

            // Custom greeting input
            { const el = document.getElementById('custom-greeting-text'); if (el) el.addEventListener('input', (e) => {
                state.config.firstMessage = e.target.value;
                saveState();
                this.validateGreetingSection();
            }); }

            // Carousel navigation
            { const el = document.getElementById('greeting-prev'); if (el) el.addEventListener('click', () => {
                this.moveGreetingCarousel(-1);
            }); }
            { const el = document.getElementById('greeting-next'); if (el) el.addEventListener('click', () => {
                this.moveGreetingCarousel(1);
            }); }
        },

        validateGreetingSection() {
            const cgEl = document.getElementById('use-custom-greeting');
            const ctEl = document.getElementById('custom-greeting-text');
            const hasCustom = cgEl ? cgEl.checked : false;
            const customText = ctEl ? (ctEl.value || '') : '';
            const hasGreeting = state.config.firstMessage && state.config.firstMessage.length > 0;

            const valid = hasGreeting || (hasCustom && customText.length > 10);
            const nextBtn = document.querySelector('.section-greeting .btn-next');
            if (nextBtn) nextBtn.disabled = !valid;
        },

        // Section 7: Overview and Start events
        bindOverviewSection() {
            // Start chat button
        { const el = document.getElementById('start-chat'); if (el) el.addEventListener('click', () => {
                this.startChat();
            }); }

            // Update summary when section is viewed
            this.updateOverviewSummary();
        },

        // Update overview summary
        updateOverviewSummary() {
            // Update all summary fields
            document.getElementById('summary-ai').textContent =
                state.config.aiType ?
                    (state.config.aiType === 'cloud' ?
                        ((CLOUD_PROVIDERS[state.config.cloudProvider] && CLOUD_PROVIDERS[state.config.cloudProvider].name) || 'Cloud API') :
                        (state.config.aiType.charAt(0).toUpperCase() + state.config.aiType.slice(1))) :
                    'Not configured';

            document.getElementById('summary-style').textContent =
                state.config.writingStyle ?
                    ((WRITING_PRESETS[state.config.writingStyle] && WRITING_PRESETS[state.config.writingStyle].name) || 'Normal') :
                    'Normal';

            document.getElementById('summary-persona').textContent =
                (state.config.persona && state.config.persona.name) || 'Not set';

            document.getElementById('summary-character').textContent =
                (state.config.character && state.config.character.name) || 'Not imported';

            document.getElementById('summary-greeting').textContent =
                state.config.firstMessage ? 'Custom' : 'Default';

            document.getElementById('final-greeting-preview').textContent =
                state.config.firstMessage || 'Import a character to see the greeting...';
        },

        // Update greeting UI to carousel and set firstMessage
        updateFirstMessage() {
            const greetingOptions = document.getElementById('greeting-options');
            const carousel = document.getElementById('greeting-carousel');
            if (!greetingOptions || !carousel) return;

            if (state.config.character) {
                greetingOptions.style.display = 'none';
                carousel.style.display = 'block';

                // Initialize carousel to current or default index
                const greetings = this.getAvailableGreetings();
                let index = (typeof state.config.greetingIndex === 'number') ? state.config.greetingIndex : 0;
                if (state.config.firstMessage) {
                    const idx = greetings.findIndex(g => g === state.config.firstMessage);
                    if (idx >= 0) index = idx;
                }
                this.setGreetingCarouselIndex(index);
            } else {
                greetingOptions.style.display = 'block';
                carousel.style.display = 'none';
            }

            this.updateOverviewSummary();
        },

        // Helpers for greeting carousel
        getAvailableGreetings() {
            const arr = [];
            if (state.config.character) {
                if (state.config.character.first_mes) arr.push(state.config.character.first_mes);
                if (Array.isArray(state.config.character.alternate_greetings)) {
                    state.config.character.alternate_greetings.forEach(g => { if (g) arr.push(g); });
                }
            }
            return arr.length ? arr : ['No greeting available'];
        },
        setGreetingCarouselIndex(i) {
            const greetings = this.getAvailableGreetings();
            const total = greetings.length;
            const index = ((i % total) + total) % total; // wrap
            state.config.greetingIndex = index;

            const textEl = document.getElementById('greeting-carousel-text');
            const counterEl = document.getElementById('greeting-counter');
            if (textEl) {
                textEl.textContent = greetings[index] || '';
            }
            if (counterEl) {
                counterEl.textContent = `${index + 1} / ${total}`;
            }

            this.syncGreetingFromCarousel();
        },
        moveGreetingCarousel(delta) {
            const current = state.config.greetingIndex || 0;
            this.setGreetingCarouselIndex(current + delta);
        },
        syncGreetingFromCarousel() {
            const useCustom = document.getElementById('use-custom-greeting');
            if (useCustom && useCustom.checked) return; // don't override custom text
            const greetings = this.getAvailableGreetings();
            const index = state.config.greetingIndex || 0;
            state.config.firstMessage = greetings[index] || '';
            saveState();
            this.validateGreetingSection();
        },

        // Helper to truncate text (unicode-safe)
        truncateText(text, maxLength) {
            if (!text) return '';
            const arr = Array.from(text);
            if (arr.length <= maxLength) return text;
            return arr.slice(0, maxLength).join('') + '...';
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

    function buildGuidedSnapshot() {
        return {
            version: VERSION,
            progress: {
                setupComplete: !!state.setupComplete,
                currentSection: state.currentSection || 0,
                easyMode: !!state.easyMode
            },
            config: {
                aiType: state.config.aiType,
                cloudProvider: state.config.cloudProvider,
                // DO NOT save API keys by default
                apiKey: '',
                endpoint: state.config.endpoint,
                model: state.config.model,
                writingStyle: state.config.writingStyle,
                persona: {
                    name: state.config.persona?.name || '',
                    description: state.config.persona?.description || ''
                },
                character: state.config.character ? {
                    name: state.config.character.name || '',
                    description: state.config.character.description || '',
                    personality: state.config.character.personality || '',
                    scenario: state.config.character.scenario || '',
                    first_mes: state.config.character.first_mes || '',
                    alternate_greetings: state.config.character.alternate_greetings || []
                } : null,
                firstMessage: state.config.firstMessage || '',
                greetingIndex: (typeof state.config.greetingIndex === 'number') ? state.config.greetingIndex : 0
            }
        };
    }

    function restoreGuidedSnapshot(obj) {
        if (!obj || !obj.guided_rp || !obj.guided_rp.config) return false;
        const g = obj.guided_rp;
        try {
            state.setupComplete = g.progress?.setupComplete ?? state.setupComplete;
            state.currentSection = g.progress?.currentSection ?? state.currentSection;
            state.easyMode = (g.progress?.easyMode !== undefined) ? g.progress.easyMode : state.easyMode;
            Object.assign(state.config, {
                aiType: g.config.aiType ?? state.config.aiType,
                cloudProvider: g.config.cloudProvider ?? state.config.cloudProvider,
                endpoint: g.config.endpoint ?? state.config.endpoint,
                model: g.config.model ?? state.config.model,
                writingStyle: g.config.writingStyle ?? state.config.writingStyle,
                firstMessage: g.config.firstMessage ?? state.config.firstMessage,
                greetingIndex: (typeof g.config.greetingIndex === 'number') ? g.config.greetingIndex : (state.config.greetingIndex || 0),
            });
            if (g.config.persona) {
                state.config.persona.name = g.config.persona.name ?? state.config.persona.name;
                state.config.persona.description = g.config.persona.description ?? state.config.persona.description;
            }
            if (g.config.character) {
                state.config.character = { ...state.config.character, ...g.config.character };
            }
            saveState();
            return true;
        } catch (_) { return false; }
    }

    function showSimplifiedChat() {
        // Ensure Corpo chat style is active in Esolite when entering Easy mode
        EsoliteBridge.applyCorpoTheme();

        // Add easy mode class to body
        document.body.classList.add('grp-easy-mode');

        // Force hide corpo left panel via Esolite's own mechanism
        if (window.eso) {
            window.eso.forceCompleteHideOfCorpoLeftPanel = true;
        }
        // Also try to re-render to apply the change
        if (typeof window.render_gametext === 'function') {
            setTimeout(() => window.render_gametext(), 100);
        }

        // Add custom header if not exists
        if (!document.getElementById('grp-chat-header')) {
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

        // Bind header buttons (no separate return button needed)
        { const b = document.getElementById('btn-advanced'); if (b) b.addEventListener('click', toggleAdvancedMode); }
        { const b = document.getElementById('btn-save'); if (b) b.addEventListener('click', async () => {
            await EsoliteBridge.saveAndDownload();
        }); }
        { const b = document.getElementById('btn-restart'); if (b) b.addEventListener('click', startNewGRPSession); }

        log('Simplified chat mode activated');
    }

    function hideSimplifiedChat() {
        document.body.classList.remove('grp-easy-mode');
        { const el = document.getElementById('grp-chat-header'); if (el) el.remove(); }
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

        // Ensure simplified header exists (it is removed when switching to Advanced)
        let header = document.getElementById('grp-chat-header');
        if (!header) {
            header = UI.createSimplifiedHeader();
            document.body.appendChild(header);

            // Bind header buttons
            { const b = document.getElementById('btn-advanced'); if (b) b.addEventListener('click', toggleAdvancedMode); }
            { const b = document.getElementById('btn-save'); if (b) b.addEventListener('click', async () => {
                await EsoliteBridge.saveAndDownload();
            }); }
            { const b = document.getElementById('btn-restart'); if (b) b.addEventListener('click', startNewGRPSession); }
        }

        const advBtn = document.getElementById('btn-advanced');

        // Ensure Corpo chat style is active
        EsoliteBridge.applyCorpoTheme();

        document.body.classList.add('grp-easy-mode');

        // Update header UI (buttons + avatar/name) to show current mode
        if (advBtn) {
            advBtn.textContent = '🎭';
            advBtn.title = 'Advanced Mode';
        }

        // Re-apply avatar and character name after header recreation
        if (state.config.character) {
            const avatar = document.getElementById('chat-avatar');
            const name = document.getElementById('chat-char-name');
            if (avatar) avatar.src = state.config.character.image || '';
            if (name) name.textContent = state.config.character.name || 'Character';
        }

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

        const advBtn = document.getElementById('btn-advanced');

        document.body.classList.remove('grp-easy-mode');

        // Update button to show we're in advanced mode
        if (advBtn) {
            advBtn.textContent = '📖';
            advBtn.title = 'Return to Easy Mode';
        }

        // Remove our simplified header so Esolite top menu is visible
        { const el = document.getElementById('grp-chat-header'); if (el) el.remove(); }

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

        { const el = document.getElementById('restart-cancel'); if (el) el.addEventListener('click', () => {
            dialog.remove();
        }); }

        { const el = document.getElementById('restart-confirm'); if (el) el.addEventListener('click', () => {
            clearState();
            EsoliteBridge.resetAllData();
        }); }

        { const el = dialog.querySelector('.dialog-backdrop'); if (el) el.addEventListener('click', () => {
            dialog.remove();
        }); }
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
        if (!document.getElementById('grp-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'grp-styles';
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
        { const el = document.getElementById('grp-overlay'); if (el) el.remove(); }
        log('Overlay hidden');
    }

    // =========================================================================
    // HEADER BUTTONS
    // =========================================================================

    function hideGRPHeaderButtons() {
        { const el = document.getElementById('grpSwitchBtn'); if (el && el.parentElement) el.parentElement.remove(); }
        { const el = document.getElementById('grpNewBtn'); if (el && el.parentElement) el.parentElement.remove(); }
    }

    function showGRPHeaderButtons() {
        // Remove existing buttons if any
        hideGRPHeaderButtons();

        const navList = document.querySelector("#navbarNavDropdown > ul");
        if (!navList) {
            log('Navigation bar not found');
            return;
        }

        // Button 1: 🎭 Switch to Guided RPmod UI
        const switchBtn = document.createElement("span");
        switchBtn.id = "grpSwitchBtn";
        switchBtn.title = "Switch to Guided RPmod UI";
        switchBtn.onclick = () => {
            log('Switching to Guided RP UI');
            toggleGRPMode();
        };
        switchBtn.style = `
            display: block;
            cursor: pointer;
            font-size: 32px;
            line-height: 50px;
            text-align: center;
            width: 50px;
            height: 50px;
        `;
        switchBtn.textContent = '🎭';

        const switchContainer = document.createElement("li");
        switchContainer.classList.add("nav-item");
        switchContainer.appendChild(switchBtn);

        // Button 2: ✨ Start new Guided RPmod
        const newBtn = document.createElement("span");
        newBtn.id = "grpNewBtn";
        newBtn.title = "Start new Guided RPmod";
        newBtn.onclick = () => {
            log('Starting new Guided RP session');
            startNewGRPSession();
        };
        newBtn.style = `
            display: block;
            cursor: pointer;
            font-size: 32px;
            line-height: 50px;
            text-align: center;
            width: 50px;
            height: 50px;
        `;
        newBtn.textContent = '✨';

        const newContainer = document.createElement("li");
        newContainer.classList.add("nav-item");
        newContainer.appendChild(newBtn);

        // Append both buttons to navigation
        navList.appendChild(switchContainer);
        navList.appendChild(newContainer);

        log('Header buttons added');
    }

    function toggleGRPMode() {
        // This button acts as a simple Easy/Advanced view toggle.
        // Enter Easy Mode (corpo simple chat) on first use; no overlay here.
        if (!state.rpModeActive) {
            state.rpModeActive = true;
            state.modActive = true;
            state.easyMode = true;
            saveState();
            showSimplifiedChat();
            return;
        }

        // Already in RP mode: toggle between Easy and Advanced views
        if (state.easyMode) {
            switchToAdvancedMode();
        } else {
            switchToEasyMode();
            // Ensure simplified header is visible again
            if (!document.getElementById('grp-chat-header')) {
                const header = UI.createSimplifiedHeader();
                document.body.appendChild(header);
                { const b = document.getElementById('btn-advanced'); if (b) b.addEventListener('click', toggleAdvancedMode); }
                { const b = document.getElementById('btn-save'); if (b) b.addEventListener('click', async () => {
                    await EsoliteBridge.saveAndDownload();
                }); }
                { const b = document.getElementById('btn-restart'); if (b) b.addEventListener('click', startNewGRPSession); }
                // After header creation, re-apply avatar and name
                if (state.config.character) {
                    const avatar = document.getElementById('chat-avatar');
                    const name = document.getElementById('chat-char-name');
                    if (avatar) avatar.src = state.config.character.image || '';
                    if (name) name.textContent = state.config.character.name || 'Character';
                }
            }
        }
    }

    function startNewGRPSession() {
        // Check if there's unsaved progress
        const hasProgress = state.setupComplete || state.currentSection > 0;

        if (hasProgress) {
            // Warn user about losing progress
            if (!confirm('Starting a new chat will lose current progress. Continue?')) {
                return;
            }
        }

        log('Starting fresh Guided RP session');

        // Call Esolite's restart_new_game to clear context/memory but keep AI settings
        if (typeof window.restart_new_game === 'function') {
            window.restart_new_game(true, false);
        }

        // Reset Guided RP state to beginning
        state.rpModeActive = true;
        state.modActive = true;
        state.welcomeShown = false;
        state.currentSection = 0;
        state.setupComplete = false;
        saveState();

        // Ensure simplified header is hidden while running guided overlay
        hideSimplifiedChat();

        // Show overlay from Introduction section (section 0) only via this button
        setTimeout(() => showOverlay(), 300);
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async function init() {
        log('Guided RPmod v' + VERSION + ' initializing...');

        // Inject styles immediately to prevent flash of unstyled content
        if (!document.getElementById('grp-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'grp-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        // Wait for Esolite to be ready
        try {
            await EsoliteBridge.waitForReady();
        } catch (e) {
            console.error('Guided RPmod: Failed to initialize Esolite bridge', e);
            return;
        }

        // Load previous state
        loadState();

        // Wrap Esolite save to embed Guided snapshot in all saves
        try {
            if (!window._grp_orig_generate_savefile && typeof window.generate_savefile === 'function') {
                window._grp_orig_generate_savefile = window.generate_savefile;
                window.generate_savefile = function() {
                    const obj = window._grp_orig_generate_savefile.apply(this, arguments);
                    try { obj.guided_rp = buildGuidedSnapshot(); } catch (_) {}
                    return obj;
                }
            }
        } catch (e) { console.warn('Failed to hook generate_savefile', e); }

        // Wrap Esolite load to restore Guided snapshot on normal loads
        try {
            if (!window._grp_orig_kai_json_load && typeof window.kai_json_load === 'function') {
                window._grp_orig_kai_json_load = window.kai_json_load;
                window.kai_json_load = function(storyobj) {
                    const res = window._grp_orig_kai_json_load.apply(this, arguments);
                    try { restoreGuidedSnapshot(storyobj); } catch (_) {}
                    return res;
                }
            }
        } catch (e) { console.warn('Failed to hook kai_json_load', e); }

        // Always show header buttons first
        showGRPHeaderButtons();

        // Do not auto-open overlay. Only show overlay via ✨ button.
        // If we were in easy mode previously and setup was complete, resume easy chat.
        if (state.setupComplete && state.rpModeActive && state.easyMode) {
            log('Resuming Guided RP easy chat');
            showSimplifiedChat();
        } else {
            log('Guided RPmod ready - use 🎭 for Easy view or ✨ to start guided setup');
        }

        state.initialized = true;
        state.modActive = true;

        // Setup exit handling
        setupExitHandling();

        state.initialized = true;
        log('Initialization complete');
    }

    // =========================================================================
    // GLOBAL API
    // =========================================================================

    window.GuidedRPmod = {
        version: VERSION,
        state: state,

        // Main actions
        toggleUI: toggleGRPMode,
        startNew: startNewGRPSession,

        // Direct mode control
        startGRPMode: () => {
            state.rpModeActive = true;
            state.modActive = true;
            saveState();
            showOverlay();
        },
        hideGRPMode: () => {
            state.rpModeActive = false;
            saveState();
            hideOverlay();
            showGRPHeaderButtons();
        },

        // Utility functions
        clearState: clearState,
        showSetup: () => {
            hideSimplifiedChat();
            state.setupComplete = false;
            state.rpModeActive = true;
            saveState();
            showOverlay();
        },
        showButtons: showGRPHeaderButtons,
        hideButtons: hideGRPHeaderButtons
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
