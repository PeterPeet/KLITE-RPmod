/**
 * KLITE-RPmod Test Mocks
 * Mock KoboldAI Lite environment for isolated testing
 */

const KLITEMocks = {
    // Mock KoboldAI Lite settings object
    createMockSettings() {
        return {
            // Generation parameters
            temperature: 0.7,
            top_p: 0.9,
            top_k: 0,
            min_p: 0.0,
            rep_pen: 1.1,
            rep_pen_range: 1024,
            rep_pen_slope: 0.7,
            max_length: 512,
            
            // UI settings
            mode: 'story',
            theme: 'dark',
            
            // Flags
            use_story: true,
            use_memory: true,
            use_world_info: true,
            
            // Advanced settings
            single_line: false,
            output_streaming: true,
            
            // Sampling settings
            typical: 1.0,
            tfs: 1.0,
            top_a: 0.0
        };
    },
    
    // Mock IndexedDB storage system
    createMockStorage() {
        const storage = new Map();
        const metadata = new Map(); // Track save times, versions, etc.
        
        return {
            async save(key, data) {
                try {
                    // Simulate serialization
                    const serialized = JSON.stringify(data);
                    const parsed = JSON.parse(serialized);
                    
                    storage.set(key, parsed);
                    metadata.set(key, {
                        savedAt: new Date(),
                        size: serialized.length,
                        version: metadata.get(key)?.version + 1 || 1
                    });
                    
                    // Simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 1));
                    return true;
                } catch (error) {
                    throw new Error(`Mock storage save failed for key '${key}': ${error.message}`);
                }
            },
            
            async load(key) {
                try {
                    // Simulate async operation
                    await new Promise(resolve => setTimeout(resolve, 1));
                    
                    const data = storage.get(key);
                    if (data === undefined) {
                        return null;
                    }
                    
                    // Return deep copy to simulate real storage behavior
                    return JSON.parse(JSON.stringify(data));
                } catch (error) {
                    throw new Error(`Mock storage load failed for key '${key}': ${error.message}`);
                }
            },
            
            // Additional mock methods for testing
            clear() {
                storage.clear();
                metadata.clear();
            },
            
            keys() {
                return Array.from(storage.keys());
            },
            
            getMetadata(key) {
                return metadata.get(key);
            },
            
            size() {
                return storage.size;
            }
        };
    },
    
    // Mock DOM elements that KoboldAI Lite provides
    createMockLiteDOM() {
        const mockElements = new Map();
        
        // Create mock elements for both Lite and KLITE-RPmod
        const elements = {
            // KoboldAI Lite elements
            'memorytext': { 
                tagName: 'TEXTAREA',
                value: '',
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function(event) { return true; }
            },
            'scenariotext': { 
                tagName: 'TEXTAREA',
                value: '',
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function(event) { return true; }
            },
            'sprompttext': { 
                tagName: 'TEXTAREA',
                value: '',
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function(event) { return true; }
            },
            'input_text': { 
                tagName: 'TEXTAREA',
                value: '',
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function(event) { return true; }
            },
            'output_text': { 
                tagName: 'DIV',
                innerHTML: '',
                textContent: '',
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function(event) { return true; }
            },
            'chat-display': {
                tagName: 'DIV',
                innerHTML: '',
                textContent: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            // KLITE-RPmod panel containers
            'content-left': {
                tagName: 'DIV',
                className: 'klite-content',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'content-right': {
                tagName: 'DIV',
                className: 'klite-content',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'panel-left': {
                tagName: 'DIV',
                className: 'klite-panel klite-panel-left',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'panel-right': {
                tagName: 'DIV',
                className: 'klite-panel klite-panel-right',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'panel-top': {
                tagName: 'DIV',
                className: 'klite-panel klite-panel-top',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'klite-container': {
                tagName: 'DIV',
                className: 'klite-container',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            },
            'maincontent': {
                tagName: 'DIV',
                className: 'klite-maincontent',
                innerHTML: '',
                addEventListener: function() {},
                removeEventListener: function() {}
            }
        };
        
        // Store elements for reference
        for (const [id, element] of Object.entries(elements)) {
            element.id = id;
            
            // Enhanced classList mock with proper toggle implementation
            element.classList = {
                _classes: new Set(),
                contains: function(className) { return this._classes.has(className); },
                add: function(className) { this._classes.add(className); },
                remove: function(className) { this._classes.delete(className); },
                toggle: function(className) { 
                    if (this._classes.has(className)) {
                        this._classes.delete(className);
                        return false;
                    } else {
                        this._classes.add(className);
                        return true;
                    }
                }
            };
            
            element.style = {};
            
            // Add querySelector methods for DOM navigation
            element.querySelector = function(selector) {
                // Simple mock implementation
                if (selector === '.klite-handle') {
                    return { 
                        click: () => {},
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        classList: {
                            _classes: new Set(),
                            contains: function(className) { return this._classes.has(className); },
                            add: function(className) { this._classes.add(className); },
                            remove: function(className) { this._classes.delete(className); },
                            toggle: function(className) { 
                                if (this._classes.has(className)) {
                                    this._classes.delete(className);
                                    return false;
                                } else {
                                    this._classes.add(className);
                                    return true;
                                }
                            }
                        }
                    };
                }
                return null;
            };
            
            element.querySelectorAll = function(selector) {
                // Return array-like object (NodeList simulation)
                const results = [];
                results.length = 0;
                return results;
            };
            
            mockElements.set(id, element);
        }
        
        // Mock getElementById with memory sync support
        const originalGetElementById = document.getElementById;
        document.getElementById = function(id) {
            const element = mockElements.get(id);
            if (element && id === 'memorytext') {
                // Sync with window.current_memory if it exists
                if (typeof window.current_memory === 'string') {
                    element.value = window.current_memory;
                }
            }
            return element || originalGetElementById.call(document, id);
        };
        
        // Provide cleanup method
        this.cleanupMockDOM = function() {
            document.getElementById = originalGetElementById;
        };
        
        return mockElements;
    },
    
    // Sample character cards for testing all formats
    getSampleCards() {
        return {
            v1: {
                name: "Test Character V1",
                description: "A friendly AI assistant designed for testing character card V1 format compatibility. This character helps validate basic card functionality.",
                personality: "Helpful, patient, and thorough in testing scenarios. Always willing to assist with validation tasks.",
                scenario: "You are in a testing environment where this character helps validate V1 character card format support.",
                first_mes: "Hello! I'm a V1 test character. I'm here to help validate the character card system. How can I assist with testing today?",
                mes_example: "<START>\n{{user}}: Can you help me test something?\n{{char}}: Of course! I'd be happy to help you test whatever you need. What would you like to test?\n{{user}}: Let's test conversation flow.\n{{char}}: Excellent choice! Testing conversation flow is important for ensuring character consistency.\n<START>\n{{user}}: What's your purpose?\n{{char}}: I'm a test character designed to validate V1 character card format compatibility."
            },
            
            v2: {
                spec: "chara_card_v2",
                spec_version: "2.0",
                data: {
                    name: "Test Character V2",
                    description: "An advanced AI assistant designed for testing character card V2 format compatibility. This character demonstrates enhanced features like system prompts and alternate greetings.",
                    personality: "Methodical, detail-oriented, and enthusiastic about testing new features. Appreciates the enhanced capabilities of V2 format.",
                    scenario: "You are in a comprehensive testing environment where this character helps validate V2 character card format support including advanced features.",
                    first_mes: "Greetings! I'm a V2 test character with enhanced capabilities. I can demonstrate system prompts, alternate greetings, and character book integration. Ready to test?",
                    mes_example: "<START>\n{{user}}: Show me V2 features.\n{{char}}: Certainly! V2 format includes system prompts for consistent behavior, alternate greetings for variety, character books for enhanced knowledge, and metadata like tags and creator info.\n{{user}}: That sounds comprehensive.\n{{char}}: It absolutely is! These features make characters much more robust and flexible.",
                    
                    // V2 specific fields
                    creator_notes: "This is a test character created for validating V2 character card format support in KLITE-RPmod.",
                    system_prompt: "You are a helpful test character designed to validate V2 character card format. Always be thorough in your responses and mention V2 features when appropriate.",
                    post_history_instructions: "Remember to maintain consistency with your testing role and be helpful in all interactions.",
                    alternate_greetings: [
                        "Hi there! I'm your V2 test character. What shall we test today?",
                        "Welcome to V2 testing! I'm here to help validate enhanced character features.",
                        "Hello! Ready to explore the capabilities of character card V2 format?"
                    ],
                    character_book: {
                        name: "V2 Test Character Knowledge",
                        description: "Knowledge base for V2 test character",
                        scan_depth: 4,
                        token_budget: 512,
                        recursive_scanning: false,
                        extensions: {},
                        entries: [
                            {
                                keys: ["V2 format", "character card v2", "tavern card v2"],
                                content: "Character Card V2 format includes enhanced metadata, system prompts, alternate greetings, and character books for richer character definition.",
                                extensions: {},
                                enabled: true,
                                insertion_order: 1,
                                case_sensitive: false,
                                name: "V2 Format Info",
                                priority: 1,
                                id: 1
                            },
                            {
                                keys: ["testing", "validation", "test character"],
                                content: "This character is specifically designed for testing and validation purposes in the KLITE-RPmod system.",
                                extensions: {},
                                enabled: true,
                                insertion_order: 2,
                                case_sensitive: false,
                                name: "Testing Purpose",
                                priority: 2,
                                id: 2
                            }
                        ]
                    },
                    tags: ["test", "character", "v2", "validation", "assistant"],
                    creator: "KLITE-RPmod Test Suite",
                    character_version: "1.0.0",
                    extensions: {
                        klite_test: {
                            test_category: "character_management",
                            created_for: "format_validation"
                        }
                    }
                }
            },
            
            v3: {
                spec: "chara_card_v3",
                spec_version: "3.0",
                data: {
                    name: "Test Character V3",
                    description: "A cutting-edge AI assistant designed for testing character card V3 format compatibility. This character showcases the latest features including assets, decorators, and enhanced metadata.",
                    personality: "Innovative, forward-thinking, and excited about the latest character card technologies. Loves demonstrating advanced V3 features.",
                    scenario: "You are in a state-of-the-art testing environment where this character helps validate V3 character card format support including all advanced features like assets and decorators.",
                    first_mes: "Hello! I'm a V3 test character featuring the latest and greatest in character card technology. I have assets, enhanced metadata, and support for group-only greetings. Let's explore V3 together!",
                    mes_example: "<START>\n{{user}}: What makes V3 special?\n{{char}}: V3 introduces assets for multiple character images, decorators for enhanced formatting, multilingual support, and group-specific greetings. It's the most advanced format yet!\n{{user}}: That's impressive!\n{{char}}: Indeed! V3 represents the cutting edge of character card technology.",
                    
                    // V2 fields (inherited)
                    creator_notes: "This is a test character created for validating V3 character card format support in KLITE-RPmod. Showcases all V3 features.",
                    system_prompt: "You are an innovative test character designed to validate V3 character card format. Always be enthusiastic about V3 features and demonstrate their capabilities.",
                    post_history_instructions: "Maintain your role as a V3 showcase character and highlight advanced features when relevant.",
                    alternate_greetings: [
                        "Welcome to the future of character cards! I'm your V3 test character.",
                        "Greetings! Ready to experience the most advanced character card format?",
                        "Hi! I'm showcasing V3 features - assets, decorators, and more!"
                    ],
                    character_book: {
                        name: "V3 Test Character Knowledge",
                        description: "Advanced knowledge base for V3 test character",
                        scan_depth: 6,
                        token_budget: 768,
                        recursive_scanning: true,
                        extensions: {
                            decorators_enabled: true
                        },
                        entries: [
                            {
                                keys: ["V3 format", "character card v3", "tavern card v3"],
                                content: "@@role assistant\n@@position after_desc\nCharacter Card V3 format introduces assets for multiple images, decorators for advanced formatting, and enhanced multilingual support.",
                                extensions: { has_decorators: true },
                                enabled: true,
                                insertion_order: 1,
                                case_sensitive: false,
                                name: "V3 Format Info",
                                priority: 1,
                                id: 1
                            },
                            {
                                keys: ["assets", "character assets", "multiple images"],
                                content: "@@depth 3\nV3 assets allow characters to have multiple images including icons, backgrounds, and emotion-specific artwork.",
                                extensions: { decorator_type: "depth" },
                                enabled: true,
                                insertion_order: 2,
                                case_sensitive: false,
                                name: "Assets Info",
                                priority: 2,
                                id: 2
                            }
                        ]
                    },
                    tags: ["test", "character", "v3", "validation", "assistant", "advanced"],
                    creator: "KLITE-RPmod Test Suite",
                    character_version: "1.0.0",
                    extensions: {
                        klite_test: {
                            test_category: "character_management",
                            created_for: "v3_format_validation",
                            features_tested: ["assets", "decorators", "group_greetings"]
                        }
                    },
                    
                    // V3 specific fields
                    nickname: "TestV3",
                    creator_notes_multilingual: {
                        "en": "This is a test character for V3 format validation",
                        "es": "Este es un personaje de prueba para validación de formato V3",
                        "fr": "C'est un personnage de test pour la validation du format V3"
                    },
                    source: ["klite-rpmod-test-suite"],
                    group_only_greetings: [
                        "Hello everyone! I'm the V3 test character, ready to showcase group features!",
                        "Greetings, group! Let's explore V3 capabilities together!",
                        "Welcome all! As a V3 character, I can adapt to group dynamics."
                    ],
                    creation_date: Date.now() - 86400000, // 1 day ago
                    modification_date: Date.now(),
                    
                    // Assets array
                    assets: [
                        {
                            type: "icon",
                            name: "main",
                            uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                            ext: "png"
                        },
                        {
                            type: "background",
                            name: "default",
                            uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                            ext: "png"
                        },
                        {
                            type: "emotion",
                            name: "happy",
                            uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                            ext: "png"
                        }
                    ]
                }
            }
        };
    },
    
    // Mock world info entries for testing
    getSampleWorldInfo() {
        return [
            {
                keys: ["test location", "testing ground"],
                content: "A virtual testing environment designed for validating KLITE-RPmod functionality.",
                enabled: true,
                order: 1,
                comment: "Test location entry"
            },
            {
                keys: ["validation", "testing"],
                content: "The process of ensuring software functionality meets requirements through systematic checking.",
                enabled: true,
                order: 2,
                comment: "Testing concept entry"
            },
            {
                keys: ["character card", "tavern card"],
                content: "A structured format for defining AI character personalities, backgrounds, and behavior patterns.",
                enabled: true,
                order: 3,
                comment: "Character card definition"
            }
        ];
    },
    
    // Mock user preferences for testing
    getSampleUserState() {
        return {
            tabs: {
                left: 'PLAY',
                right: 'MEMORY'
            },
            collapsed: {
                left: false,
                right: false,
                top: false
            },
            generating: false,
            adventureMode: 0,
            fullscreen: false,
            tabletSidepanel: false,
            mobile: {
                enabled: false,
                currentIndex: 5,
                sequence: ['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP', 'MAIN', 'CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB']
            }
        };
    },
    
    // Mock generation presets for testing
    getSamplePresets() {
        return {
            precise: {
                temperature: 0.2,
                top_p: 0.9,
                top_k: 20,
                min_p: 0.1,
                rep_pen: 1.1,
                rep_pen_range: 1024,
                rep_pen_slope: 0.7
            },
            koboldai: {
                temperature: 0.7,
                top_p: 0.9,
                top_k: 0,
                min_p: 0.0,
                rep_pen: 1.1,
                rep_pen_range: 1024,
                rep_pen_slope: 0.7
            },
            creative: {
                temperature: 1.2,
                top_p: 0.85,
                top_k: 50,
                min_p: 0.05,
                rep_pen: 1.05,
                rep_pen_range: 512,
                rep_pen_slope: 0.5
            },
            chaotic: {
                temperature: 1.8,
                top_p: 0.8,
                top_k: 80,
                min_p: 0.02,
                rep_pen: 1.02,
                rep_pen_range: 256,
                rep_pen_slope: 0.3
            }
        };
    },
    
    // Create mock file for testing file operations
    createMockFile(name, content, type = 'application/json') {
        const blob = new Blob([content], { type });
        const file = new File([blob], name, { type });
        
        // Add mock methods for testing
        file.text = async () => content;
        file.arrayBuffer = async () => {
            const encoder = new TextEncoder();
            return encoder.encode(content).buffer;
        };
        
        return file;
    },
    
    // Create mock PNG file with embedded character data
    createMockPNGFile(characterData) {
        // This is a minimal mock - real implementation would create proper PNG binary data
        const jsonData = JSON.stringify(characterData);
        const base64Data = btoa(jsonData);
        
        return this.createMockFile('test_character.png', base64Data, 'image/png');
    },
    
    // Create mock performance observer for testing
    createMockPerformanceObserver() {
        const entries = [];
        
        return {
            observe: () => {},
            disconnect: () => {},
            takeRecords: () => entries,
            addEntry: (entry) => entries.push(entry)
        };
    },
    
    // Mock browser dialogs to prevent user interaction during tests
    mockBrowserDialogs() {
        // Store original functions for cleanup
        this._originalAlert = window.alert;
        this._originalConfirm = window.confirm;
        this._originalPrompt = window.prompt;
        
        // Mock alert() - just log and continue
        window.alert = function(message) {
            console.log(`[MOCK ALERT]: ${message}`);
        };
        
        // Mock confirm() - always return true for tests
        window.confirm = function(message) {
            console.log(`[MOCK CONFIRM]: ${message} -> true`);
            return true;
        };
        
        // Mock prompt() - return default values for tests
        window.prompt = function(message, defaultValue = '') {
            const mockValue = defaultValue || 'Test Input';
            console.log(`[MOCK PROMPT]: ${message} -> ${mockValue}`);
            return mockValue;
        };
    },
    
    // Restore original browser dialog functions
    restoreBrowserDialogs() {
        if (this._originalAlert) {
            window.alert = this._originalAlert;
        }
        if (this._originalConfirm) {
            window.confirm = this._originalConfirm;
        }
        if (this._originalPrompt) {
            window.prompt = this._originalPrompt;
        }
    },
    
    // Reset all mocks to initial state
    resetMocks() {
        // Clear mock storage
        if (this.mockStorage) {
            this.mockStorage.clear();
        }
        
        // Reset mock DOM
        if (this.cleanupMockDOM) {
            this.cleanupMockDOM();
        }
        
        // Reset window objects
        if (window.localsettings) {
            Object.assign(window.localsettings, this.createMockSettings());
        }
        
        // Reset Lite variables
        window.current_memory = '';
        window.current_wi = [];
        window.pending_wi_obj = {};
        window.current_scenario = '';
        window.current_sprompt = '';
        
        // Mock browser dialogs
        this.mockBrowserDialogs();
    },
    
    // Utility methods for test data generation
    generateRandomCharacterName() {
        const prefixes = ['Test', 'Mock', 'Demo', 'Sample', 'Validation'];
        const suffixes = ['Character', 'Assistant', 'Helper', 'Guide', 'Tester'];
        const numbers = Math.floor(Math.random() * 1000);
        
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} ${numbers}`;
    },
    
    generateRandomText(length = 100) {
        const words = ['test', 'mock', 'validation', 'character', 'system', 'data', 'format', 'compatibility', 'functionality', 'implementation'];
        const result = [];
        
        while (result.join(' ').length < length) {
            result.push(words[Math.floor(Math.random() * words.length)]);
        }
        
        return result.join(' ').substring(0, length);
    }
};

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KLITEMocks;
} else if (typeof window !== 'undefined') {
    window.KLITEMocks = KLITEMocks;
}