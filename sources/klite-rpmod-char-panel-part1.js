// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 1)
// Core functionality without the large openFullscreen method
// =============================================

    console.log('Loading KLITECharacterManager Panel Version - Part 1');

    // =============================================
    // GLOBAL CONFIGURATION
    // =============================================
    const CONFIG = {
        TOOL_ID: 'KLITECharacterManagerPanel',
        VERSION: 'v1.6-panel',
        DB_NAME: 'KLITECharacterManagerDB',
        DB_VERSION: 1,
        STORE_NAME: 'characters'
    };

    // =============================================
    // FORMAT DETECTION AND CONVERSION
    // =============================================
    const FormatDetector = {
        detectFormat(data) {
            // V2 format - most specific check first
            if (data.spec === 'chara_card_v2' && data.data) return 'v2';
            
            // V1 format - check for required fields according to spec_v1.md
            if (data.name !== undefined && 
                data.description !== undefined && 
                data.personality !== undefined &&
                data.scenario !== undefined &&
                data.first_mes !== undefined &&
                data.mes_example !== undefined) return 'v1';
            
            // Agnai format
            if (data.kind === 'character' || (data.name && data.persona)) return 'agnai';
            
            // Ooba format
            if (data.char_name && data.char_persona) return 'ooba';
            
            // NovelAI format
            if (data.scenarioVersion && data.prompt) return 'novelai';
            
            // AID (AI Dungeon) format
            if (Array.isArray(data) && data[0]?.keys) return 'aid';
            
            return 'unknown';
        },

        async convertToV2(data, format) {
            console.log(`Converting ${format} format to V2`);
            
            switch (format) {
                case 'v1': return this.convertV1ToV2(data);
                case 'agnai': return this.convertAgnaiToV2(data);
                case 'ooba': return this.convertOobaToV2(data);
                case 'novelai': return this.convertNovelAIToV2(data);
                case 'aid': return this.convertAIDToV2(data);
                case 'v2': return data;
                default: throw new Error(`Unknown format: ${format}`);
            }
        },

        convertV1ToV2(v1Data) {
            // According to spec_v1.md, all fields MUST default to empty string
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: v1Data.name || '',
                    description: v1Data.description || '',
                    personality: v1Data.personality || '',
                    scenario: v1Data.scenario || '',
                    first_mes: v1Data.first_mes || '',
                    mes_example: v1Data.mes_example || '',
                    
                    // V2 specific fields with defaults
                    creator_notes: v1Data.creator_notes || '',
                    system_prompt: v1Data.system_prompt || '',
                    post_history_instructions: v1Data.post_history_instructions || '',
                    alternate_greetings: v1Data.alternate_greetings || [],
                    character_book: v1Data.character_book || undefined,
                    tags: v1Data.tags || [],
                    creator: v1Data.creator || 'Unknown',
                    character_version: v1Data.character_version || '',
                    extensions: v1Data.extensions || {},
                    
                    // Preserve any extra data
                    _format: 'v1',
                    _originalData: v1Data
                }
            };
        },

        convertAgnaiToV2(agnaiData) {
            const v2Data = {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: agnaiData.name || 'Unknown Character',
                    description: agnaiData.persona || agnaiData.description || '',
                    personality: agnaiData.personality || '',
                    scenario: agnaiData.scenario || '',
                    first_mes: agnaiData.greeting || agnaiData.first_mes || '',
                    mes_example: agnaiData.sampleChat || agnaiData.example_dialogue || '',
                    creator_notes: '',
                    system_prompt: agnaiData.systemPrompt || '',
                    post_history_instructions: agnaiData.postHistoryInstructions || '',
                    alternate_greetings: agnaiData.alternateGreetings || [],
                    tags: agnaiData.tags || [],
                    creator: agnaiData.creator || 'Unknown',
                    character_version: agnaiData.version || '',
                    extensions: {},
                    _format: 'agnai',
                    _originalData: agnaiData
                }
            };

            if (agnaiData.memoryBook) {
                v2Data.data.character_book = this.convertAgnaiMemoryBook(agnaiData.memoryBook);
            }

            return v2Data;
        },

        convertAgnaiMemoryBook(memoryBook) {
            return {
                name: memoryBook.name || 'Character Book',
                description: memoryBook.description || '',
                scan_depth: memoryBook.scanDepth || 50,
                token_budget: memoryBook.tokenBudget || 500,
                recursive_scanning: memoryBook.recursiveScanning !== false,
                extensions: {},
                entries: (memoryBook.entries || []).map((entry, index) => ({
                    keys: entry.keywords || [],
                    content: entry.entry || '',
                    extensions: {},
                    enabled: entry.enabled !== false,
                    insertion_order: entry.priority || index,
                    case_sensitive: entry.caseSensitive || false,
                    name: entry.name || '',
                    priority: entry.weight || 10,
                    id: index,
                    comment: '',
                    selective: false,
                    secondary_keys: [],
                    constant: false,
                    position: 'before_char'
                }))
            };
        },

        convertOobaToV2(oobaData) {
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: oobaData.char_name || oobaData.name || 'Unknown Character',
                    description: oobaData.char_persona || oobaData.description || '',
                    personality: oobaData.char_personality || '',
                    scenario: oobaData.world_scenario || oobaData.scenario || '',
                    first_mes: oobaData.char_greeting || oobaData.greeting || '',
                    mes_example: oobaData.example_dialogue || '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    _format: 'ooba',
                    _originalData: oobaData
                }
            };
        },

        convertNovelAIToV2(naiData) {
            const v2Data = {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: 'NovelAI Import',
                    description: '',
                    personality: '',
                    scenario: naiData.prompt || '',
                    first_mes: '',
                    mes_example: '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    _format: 'novelai',
                    _originalData: naiData
                }
            };

            if (naiData.context && naiData.context.length > 0) {
                let memory = '';
                for (let ctx of naiData.context) {
                    memory += ctx.text + '\n';
                }
                v2Data.data.description = memory.trim();
            }

            if (naiData.lorebook) {
                v2Data.data.character_book = this.convertNovelAILorebook(naiData.lorebook);
            }

            return v2Data;
        },

        convertNovelAILorebook(lorebook) {
            return {
                name: lorebook.lorebookVersion ? 'NovelAI Lorebook' : 'Character Book',
                description: '',
                scan_depth: 50,
                token_budget: 500,
                recursive_scanning: false,
                extensions: {},
                entries: (lorebook.entries || []).map((entry, index) => ({
                    keys: entry.keys || [],
                    content: entry.text || '',
                    extensions: {},
                    enabled: entry.enabled !== false,
                    insertion_order: entry.insertorder || index,
                    case_sensitive: false,
                    name: entry.displayName || '',
                    priority: 10,
                    id: index,
                    comment: entry.comment || '',
                    selective: false,
                    secondary_keys: [],
                    constant: entry.alwaysActive || false,
                    position: 'before_char'
                }))
            };
        },

        convertAIDToV2(aidData) {
            return {
                spec: 'chara_card_v2',
                spec_version: '2.0',
                data: {
                    name: 'AID World Info Import',
                    description: 'Imported from AI Dungeon World Info',
                    personality: '',
                    scenario: '',
                    first_mes: '',
                    mes_example: '',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    alternate_greetings: [],
                    tags: [],
                    creator: 'Unknown',
                    character_version: '',
                    extensions: {},
                    character_book: {
                        name: 'AID World Info',
                        description: '',
                        scan_depth: 50,
                        token_budget: 500,
                        recursive_scanning: false,
                        extensions: {},
                        entries: aidData.map((entry, index) => ({
                            keys: entry.keys ? entry.keys.split(',').map(k => k.trim()) : [],
                            content: entry.value || '',
                            extensions: {},
                            enabled: true,
                            insertion_order: index,
                            case_sensitive: false,
                            name: '',
                            priority: 10,
                            id: index,
                            comment: '',
                            selective: false,
                            secondary_keys: [],
                            constant: false,
                            position: 'before_char'
                        }))
                    },
                    _format: 'aid',
                    _originalData: aidData
                }
            };
        }
    };

    // =============================================
    // KOBOLDAI INTEGRATION
    // =============================================
    window.KoboldAIIntegration = {
        isAvailable() {
            return typeof window.load_selected_file === 'function';
        },

        async loadAsScenario(characterData) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                console.log('Loading character via simulated file drop:', characterData.name);
                
                // Update AI avatar with character image
                if (characterData._imageData || characterData._imageBlob) {
                    let imageUrl = characterData._imageData;
                    
                    // If we have a blob but no data URL, convert it
                    if (!imageUrl && characterData._imageBlob) {
                        // Convert blob to base64 data URL for persistence
                        imageUrl = await this.blobToBase64(characterData._imageBlob);
                        // Store the base64 version for future use
                        characterData._imageData = imageUrl;
                    }
                    
                    // Call the KLITE_RPMod method to update avatar
                    if (imageUrl && typeof KLITE_RPMod !== 'undefined' && KLITE_RPMod.updateAIAvatar) {
                        KLITE_RPMod.updateAIAvatar(imageUrl);
                    }
                }
                
                const file = await this.createFileFromCharacterData(characterData);
                
                if (!file) {
                    throw new Error('Could not create file from character data');
                }

                window.load_selected_file(file);
                console.log('Character file submitted to native loader - session will restart');
                return true;
                
            } catch (error) {
                console.error('Error loading character as scenario:', error);
                throw error;
            }
        },

        async blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },

        resetAIAvatar() {
            this.aiAvatarCurrent = this.aiAvatarDefault;
            this.replaceAvatarsInChat();
        },

        async createFileFromCharacterData(characterData) {
            if (!characterData._imageBlob) {
                throw new Error('No _imageBlob found - character storage is broken');
            }
            
            if (!(characterData._imageBlob instanceof Blob)) {
                throw new Error('_imageBlob is not a valid Blob object - storage corruption');
            }

            const fileName = `${characterData.name || 'character'}.png`;
            return new File([characterData._imageBlob], fileName, {
                type: 'image/png',
                lastModified: Date.now()
            });
        },

        async addToWorldInfo(characterData) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                if (typeof window.start_editing_wi === 'function') {
                    window.start_editing_wi();
                }

                const groupName = characterData.name || "Character";
                const entries = this.buildCharacterWIEntries(characterData, groupName);
                
                entries.forEach(entry => {
                    window.pending_wi_obj.push(entry);
                });
                
                if (characterData.character_book?.entries && typeof window.load_tavern_wi === 'function') {
                    const tavernWI = window.load_tavern_wi(
                        characterData.character_book, 
                        characterData.name, 
                        window.localsettings.chatname
                    );
                    tavernWI.forEach(entry => {
                        entry.wigroup = groupName;
                        window.pending_wi_obj.push(entry);
                    });
                }
                
                if (typeof window.commit_wi_changes === 'function') {
                    window.commit_wi_changes();
                }
                
                if (typeof window.update_wi === 'function') {
                    window.update_wi();
                }
                
                return true;
            } catch (error) {
                console.error('Error adding character to World Info:', error);
                throw error;
            }
        },

        buildCharacterWIEntries(characterData, groupName) {
            const entries = [];
            const baseName = characterData.name || "Character";
            
            if (characterData.description) {
                entries.push({
                    key: baseName,
                    keysecondary: "",
                    keyanti: "",
                    content: `Character: ${baseName}\n\nDescription: ${characterData.description}`,
                    comment: `${baseName} - Character Description`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.personality) {
                entries.push({
                    key: `${baseName}, personality`,
                    keysecondary: "",
                    keyanti: "",
                    content: `${baseName}'s Personality: ${characterData.personality}`,
                    comment: `${baseName} - Personality`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.scenario) {
                entries.push({
                    key: `${baseName}, scenario, setting`,
                    keysecondary: "",
                    keyanti: "",
                    content: `Scenario: ${characterData.scenario}`,
                    comment: `${baseName} - Scenario/Setting`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            if (characterData.first_mes) {
                entries.push({
                    key: `${baseName}, greeting, first meeting`,
                    keysecondary: "",
                    keyanti: "",
                    content: `${baseName}'s Greeting: ${characterData.first_mes}`,
                    comment: `${baseName} - First Message/Greeting`,
                    folder: null,
                    selective: false,
                    constant: false,
                    probability: 100,
                    wigroup: groupName,
                    widisabled: false
                });
            }
            
            return entries;
        },

        async removeFromWorldInfo(characterName) {
            if (!this.isAvailable()) {
                throw new Error('KoboldAI functions not available');
            }

            try {
                if (typeof window.start_editing_wi === 'function') {
                    window.start_editing_wi();
                }

                const groupName = characterName;
                const originalCount = window.pending_wi_obj.length;
                
                window.pending_wi_obj = window.pending_wi_obj.filter(entry => {
                    return entry.wigroup !== groupName;
                });
                
                const removedCount = originalCount - window.pending_wi_obj.length;
                
                if (typeof window.commit_wi_changes === 'function') {
                    window.commit_wi_changes();
                }
                
                if (typeof window.update_wi === 'function') {
                    window.update_wi();
                }
            
                return removedCount;
            } catch (error) {
                console.error('Error removing character from World Info:', error);
                throw error;
            }
        }
    };

    // =============================================
    // PANEL CHARACTER MANAGER CLASS
    // =============================================
    class PanelCharacterManager {
        constructor() {
            this.characters = [];
            this.selectedCharacter = null;
            this.currentTagCharacter = null;
            this.selectedTag = '';
            this.selectedRating = '';
            this.searchTerm = '';
            this.container = null;
            this.fileInput = null;
            this.collapsedSections = new Set();
            this.collapsedFullscreenSections = new Set();
            
            // Get helpers reference
            this.helpers = window.KLITE_RPMod_Helpers;
            this.IndexedDBManager = this.helpers.IndexedDB;
        }

        async init(containerElement) {
            console.log('Initializing KLITECharacterManager Panel');
            this.container = containerElement;
            this.injectStyles();
            this.createPanelContent();
            await this.loadCharacters();
            this.initEventListeners();
            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
        }

        injectStyles() {
            const existingStyle = document.getElementById('character-manager-panel-styles');
            if (existingStyle) {
                existingStyle.remove();
            }

            const styleElement = document.createElement('style');
            styleElement.id = 'character-manager-panel-styles';
            styleElement.textContent = window.KLITE_CharacterManager_CSS;
            document.head.appendChild(styleElement);
        }

        createPanelContent() {
            this.container.innerHTML = `
                <div class="KLITECharacterManager-panel">
                    <div class="KLITECharacterManager-content-wrapper">
                        <div class="KLITECharacterManager-scroll-container">
                            <!-- Import Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="import">
                                    <span>Import Characters</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <div class="KLITECharacterManager-upload-zone" id="char-upload-zone">
                                        Drop PNG/WEBP/JSON files here or click to browse
                                    </div>
                                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                                        <button class="KLITECharacterManager-button" id="char-import-btn" style="flex: 1;">
                                            Import Files
                                        </button>
                                        <button class="KLITECharacterManager-button delete-btn" id="char-clear-btn" style="flex: 1;">
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Search & Filter Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="search">
                                    <span>Search & Filter</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <input type="text" id="char-search-input" placeholder="Search characters..." 
                                        class="KLITECharacterManager-input" value="${this.searchTerm}">
                                    <select id="char-tag-filter" class="KLITECharacterManager-input">
                                        <option value="">All Tags</option>
                                    </select>
                                    <select id="char-rating-filter" class="KLITECharacterManager-rating-filter">
                                        <option value="">All Ratings</option>
                                        <option value="5">★★★★★ (5 stars)</option>
                                        <option value="4">★★★★☆ (4 stars)</option>
                                        <option value="3">★★★☆☆ (3 stars)</option>
                                        <option value="2">★★☆☆☆ (2 stars)</option>
                                        <option value="1">★☆☆☆☆ (1 star)</option>
                                        <option value="0">☆ Unrated</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Character Gallery Section -->
                            <div class="KLITECharacterManager-section">
                                <div class="KLITECharacterManager-section-header" data-section="gallery">
                                    <span>Character Gallery</span>
                                    <span>▼</span>
                                </div>
                                <div class="KLITECharacterManager-section-content">
                                    <div id="char-gallery-stats" style="color: #888; font-size: 11px; margin-bottom: 8px;">
                                        0 characters loaded
                                    </div>
                                    <div class="KLITECharacterManager-character-grid" id="char-character-grid">
                                        <!-- Characters will be populated here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fullscreen Character View -->
                    <div class="KLITECharacterManager-fullscreen-view" id="char-fullscreen-view">
                        <div class="KLITECharacterManager-fullscreen-header">
                            <button class="KLITECharacterManager-button" id="char-back-btn">
                                ← Back
                            </button>
                            <span id="char-fullscreen-title">Character Details</span>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-actions">
                            <button class="KLITECharacterManager-button scenario-btn" id="char-load-scenario-btn">
                                Load as Scenario
                            </button>
                            <button class="KLITECharacterManager-button delete-btn" id="char-remove-character-btn">
                                Delete Character
                            </button>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-actions">
                            <button class="KLITECharacterManager-button worldinfo-btn" id="char-add-worldinfo-btn">
                                Add to World Info
                            </button>
                            <button class="KLITECharacterManager-button delete-btn" id="char-remove-worldinfo-btn">
                                Remove from WI
                            </button>
                        </div>
                        <div class="KLITECharacterManager-fullscreen-content" id="char-fullscreen-content">
                            <!-- Content will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Tag Modal -->
                    <div class="KLITECharacterManager-modal hidden" id="char-tag-modal">
                        <div class="KLITECharacterManager-modal-content">
                            <h3>Add Tag</h3>
                            <input type="text" id="char-tag-input" placeholder="Enter tag name...">
                            <div class="KLITECharacterManager-modal-buttons">
                                <button class="KLITECharacterManager-button" id="char-tag-cancel-btn">Cancel</button>
                                <button class="KLITECharacterManager-button" id="char-tag-add-btn">Add</button>
                            </div>
                        </div>
                    </div>

                    <!-- Success Message -->
                    <div class="KLITECharacterManager-success-message" id="char-success-message">
                        Character loaded successfully!
                    </div>
                </div>
            `;

            // Create hidden file input
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = '.png,.webp,.json';
            this.fileInput.multiple = true;
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);
        }

        // Continue in Part 2 with remaining methods...
    }