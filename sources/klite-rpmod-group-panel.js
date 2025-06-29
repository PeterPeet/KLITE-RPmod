// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - GROUP Panel Implementation v084
// Enhanced D&D-style group and initiative management
// =============================================

window.KLITE_RPMod_Panels.GROUP = {
    activeCharacters: [],
    currentTurn: 0,
    groupMode: false,
    autoAdvanceTurns: false,
    responseMode: 'individual',
    advanceMode: 'round-robin',
    combatRound: 1,
    initiativeMode: false,
    draggedIndex: null,
    searchQuery: '',
    tagFilter: '',
    starFilter: 0,
    selectedCharacters: new Set(),
    editingIndex: -1,
    lastSpeakerIndex: -1,
    
    // D&D Status conditions
    statusConditions: [
        'Blinded', 'Charmed', 'Deafened', 'Exhausted', 'Frightened', 'Grappled',
        'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
        'Prone', 'Restrained', 'Stunned', 'Unconscious'
    ],
    
    // Default avatars for different types
    defaultAvatars: {
        npc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM0QTkwRTIiLz4KPHBhdGggZD0iTTMwIDM1QzM1LjUyMjggMzUgNDAgMzAuNTIyOCA0MCAyNUM0MCAxOS40NzcyIDM1LjUyMjggMTUgMzAgMTVDMjQuNDc3MiAxNSAyMCAxOS40NzcyIDIwIDI1QzIwIDMwLjUyMjggMjQuNDc3MiAzNSAzMCAzNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNSA0NUMxNSA0MC4wMjk0IDIxLjcxNTcgMzYgMzAgMzZDMzguMjg0MyAzNiA0NSA0MC4wMjk0IDQ1IDQ1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=',
        monster: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNEOTUzNEYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyNSIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIyNSIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTIwIDM4QzIwIDM4IDE1IDMzIDE1IDI4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNNDAgMzhDNDAgMzggNDUgMzMgNDUgMjgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0yMCA0MEMyMCA0MCAyNSA0NSAzMCA0NUMzNSA0NSA0MCA0MCA0MCA0MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'
    },
    
    load(container, panel) {
        this.lastSpeakerIndex = this.lastSpeakerIndex !== undefined ? this.lastSpeakerIndex : -1;
        this.activeCharacters = this.activeCharacters || [];
        this.currentTurn = this.currentTurn || 0;
        this.groupModeEnabled = this.groupModeEnabled || false;
        this.initiativeMode = this.initiativeMode || false;
        this.advanceMode = this.advanceMode || 'round-robin';
        this.responseMode = this.responseMode || 'individual';
        this.autoAdvanceTurns = this.autoAdvanceTurns || false;
        // Add modal styles
        const styleEl = document.getElementById('klite-rpmod-group-styles') || document.createElement('style');
        styleEl.id = 'klite-rpmod-group-styles';
        container.innerHTML = `
            <div class="klite-rpmod-panel klite-rpmod-panel-group" id="klite-rpmod-panel-group">
                <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                    <!-- Group Chat Toggle -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Group Chat & Initiative</h3>
                        <div class="klite-rpmod-control-row">
                            <label>
                                <input type="checkbox" id="klite-rpmod-group-chat-toggle"> Enable Group Mode
                            </label>
                        </div>
                    </div>

                    <!-- Participant Management -->
                    <div class="klite-rpmod-control-group" id="klite-rpmod-participant-management" style="display: none;">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Party & Encounter Management</h3>
                        
                        <!-- Current Status -->
                        <div class="klite-rpmod-status-display" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="color: #999; font-size: 12px;">Current Speaker:</span>
                                <span id="klite-rpmod-current-speaker" style="color: #4CAF50; font-weight: bold;">—</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #999; font-size: 12px;">Next Speaker:</span>
                                <span id="klite-rpmod-next-speaker" style="color: #4a9eff;">—</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                                <span style="color: #999; font-size: 12px;">Round:</span>
                                <span id="klite-rpmod-combat-round" style="color: #e0e0e0;">1</span>
                            </div>
                        </div>
                        
                        <!-- Participant List -->
                        <div id="klite-rpmod-participant-list" class="klite-rpmod-group-character-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                            <!-- Participants will be dynamically added here -->
                        </div>
                        
                        <!-- Add Buttons -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                            <button class="klite-rpmod-button" id="klite-rpmod-add-character">
                                Add Character
                            </button>
                            <button class="klite-rpmod-button" id="klite-rpmod-add-custom">
                                Add NPC/Monster
                            </button>
                        </div>
                        
                        <!-- Control Buttons -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                            <button class="klite-rpmod-button" id="klite-rpmod-advance-turn" style="background: #5cb85c;">
                                Advance Turn
                            </button>
                            <button class="klite-rpmod-button" id="klite-rpmod-roll-initiative" style="background: #f0ad4e;">
                                Roll Initiative
                            </button>
                        </div>
                    </div>

                    <!-- Turn Management -->
                    <div class="klite-rpmod-control-group" id="klite-rpmod-turn-management" style="display: none;">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Turn & Response Settings</h3>
                        <div class="klite-rpmod-control-row">
                            <label>Response Mode</label>
                            <select id="klite-rpmod-response-mode">
                                <option value="individual">Individual Responses</option>
                                <option value="simultaneous">Simultaneous Actions</option>
                                <option value="random">Random Order</option>
                            </select>
                        </div>
                        <div class="klite-rpmod-control-row">
                            <label>Advance Mode</label>
                            <select id="klite-rpmod-advance-mode">
                                <option value="random">Random</option>
                                <option value="round-robin">Round Robin</option>
                                <option value="initiative">Initiative Order</option>
                                <option value="name-triggered">Name Triggered (else Random)</option>
                            </select>
                        </div>
                        <div class="klite-rpmod-control-row">
                            <label>
                                <input type="checkbox" id="klite-rpmod-auto-advance"> Auto-advance turns after generation
                            </label>
                        </div>
                    </div>

                    <!-- Group Context -->
                    <div class="klite-rpmod-control-group" id="klite-rpmod-group-context" style="display: none;">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Encounter Context</h3>
                        <textarea 
                            id="klite-rpmod-group-context-text"
                            placeholder="Describe the current scene, encounter, or situation..."
                            style="width: 100%; height: 80px; resize: vertical;"
                        ></textarea>
                        <div class="klite-rpmod-status-bar">
                            <span id="klite-rpmod-context-status">Ready</span>
                            <span id="klite-rpmod-context-tokens">0 tokens</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Character Selection Modal -->
            <div class="klite-rpmod-modal hidden" id="klite-rpmod-character-select-modal">
                <div class="klite-rpmod-modal-content" style="max-width: 700px; max-height: 80vh;">
                    <h3>Select Characters</h3>
                    
                    <!-- Search and Filters -->
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="klite-rpmod-char-search" placeholder="Search characters by name, creator, or tags..." 
                               style="width: 100%; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <select id="klite-rpmod-tag-filter">
                                <option value="">All Tags</option>
                            </select>
                            <select id="klite-rpmod-star-filter">
                                <option value="0">All Ratings</option>
                                <option value="5">★★★★★</option>
                                <option value="4">★★★★☆+</option>
                                <option value="3">★★★☆☆+</option>
                                <option value="2">★★☆☆☆+</option>
                                <option value="1">★☆☆☆☆+</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Character List -->
                    <div id="klite-rpmod-character-select-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #333; border-radius: 4px; padding: 5px; background: rgba(0,0,0,0.2);">
                        <!-- Character items will be populated here -->
                    </div>
                    
                    <!-- Selected count -->
                    <div style="margin-top: 10px; color: #999; font-size: 12px;">
                        <span id="klite-rpmod-selected-count">0</span> characters selected
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-confirm-characters" style="flex: 1;">
                            Add Selected Characters
                        </button>
                        <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-cancel-characters" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Add Custom Character Modal -->
            <div class="klite-rpmod-modal hidden" id="klite-rpmod-custom-character-modal">
                <div class="klite-rpmod-modal-content" style="max-width: 400px;">
                    <h3>Add NPC/Monster</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Name</label>
                        <input type="text" id="klite-rpmod-custom-name" placeholder="e.g., Borin, Goblin Chief" 
                               style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Type</label>
                        <select id="klite-rpmod-custom-type" style="width: 100%;">
                            <option value="npc">NPC (Non-Player Character)</option>
                            <option value="monster">Monster/Enemy</option>
                            <option value="pc">PC (Player Character)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Role/Occupation</label>
                        <input type="text" id="klite-rpmod-custom-role" placeholder="e.g., Barkeeper, Ambushing the party" 
                               style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Hit Points</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <input type="number" id="klite-rpmod-custom-hp" placeholder="Current HP" min="0">
                            <input type="number" id="klite-rpmod-custom-max-hp" placeholder="Max HP" min="1">
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-add-custom-confirm" style="flex: 1;">
                            Add to Encounter
                        </button>
                        <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-add-custom-cancel" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Edit Character Modal -->
            <div class="klite-rpmod-modal hidden" id="klite-rpmod-edit-character-modal">
                <div class="klite-rpmod-modal-content" style="max-width: 500px;">
                    <h3>Edit Character</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Name</label>
                        <input type="text" id="klite-rpmod-edit-name" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Type</label>
                        <select id="klite-rpmod-edit-type" style="width: 100%;">
                            <option value="pc">PC (Player Character)</option>
                            <option value="npc">NPC (Non-Player Character)</option>
                            <option value="monster">Monster/Enemy</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Hit Points</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <input type="number" id="klite-rpmod-edit-hp" placeholder="Current HP" min="0">
                            <input type="number" id="klite-rpmod-edit-max-hp" placeholder="Max HP" min="1">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Initiative</label>
                        <input type="number" id="klite-rpmod-edit-initiative" min="1" max="40" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="klite-rpmod-edit-active">
                            <span style="color: #999; font-size: 12px;">Active (participates in turns)</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #999; font-size: 12px;">Status Conditions</label>
                        <div id="klite-rpmod-edit-statuses" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; max-height: 150px; overflow-y: auto; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                            <!-- Status checkboxes will be populated here -->
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-edit-save" style="flex: 1;">
                            Save Changes
                        </button>
                        <button class="klite-rpmod-button klite-rpmod-button-secondary" id="klite-rpmod-edit-cancel" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        styleEl.textContent = `
            .klite-rpmod-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .klite-rpmod-modal.hidden {
                display: none !important;
            }
            
            .klite-rpmod-modal-content {
                background: #1a1a1a;
                border: 1px solid #4a9eff;
                border-radius: 8px;
                padding: 25px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
                position: relative;
            }
            
            .klite-rpmod-modal-content::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, #4a9eff, #337ab7, #4a9eff);
                border-radius: 8px;
                z-index: -1;
                opacity: 0.5;
            }
            
            .klite-rpmod-modal-content h3 {
                margin-top: 0;
                margin-bottom: 20px;
                color: #4a9eff;
                font-size: 20px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .klite-rpmod-modal-content input[type="text"],
            .klite-rpmod-modal-content input[type="number"],
            .klite-rpmod-modal-content select,
            .klite-rpmod-modal-content textarea {
                background: #0f0f0f;
                border: 1px solid #333;
                color: #e0e0e0;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .klite-rpmod-modal-content input[type="text"]:focus,
            .klite-rpmod-modal-content input[type="number"]:focus,
            .klite-rpmod-modal-content select:focus,
            .klite-rpmod-modal-content textarea:focus {
                outline: none;
                border-color: #4a9eff;
                background: #1a1a1a;
                box-shadow: 0 0 5px rgba(74, 158, 255, 0.3);
            }
            
            .klite-rpmod-character-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 10px;
            }
            
            /*.klite-rpmod-button {
                background: #337ab7;
                border: 1px solid #4a9eff;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }*/
            
            .klite-rpmod-button:hover {
                background: #4a9eff;
                box-shadow: 0 2px 10px rgba(74, 158, 255, 0.5);
                transform: translateY(-1px);
            }
            
            .klite-rpmod-button-secondary {
                background: transparent;
                border: 1px solid #666;
                color: #999;
            }
            
            .klite-rpmod-button-secondary:hover {
                border-color: #4a9eff;
                color: #4a9eff;
                background: rgba(74, 158, 255, 0.1);
            }
            
            #klite-rpmod-character-select-list {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 4px;
                padding: 10px;
            }
            
            #klite-rpmod-edit-statuses {
                border: 1px solid #333;
                background: #0f0f0f;
            }
            
            #klite-rpmod-edit-statuses label:hover {
                background: rgba(74, 158, 255, 0.1);
            }
        `;
        
        if (!document.getElementById('klite-rpmod-group-styles')) {
            document.head.appendChild(styleEl);
        }

        this.initializeEventListeners();
        this.loadGroupState();
        this.updateUI();
    },

    initializeEventListeners() {
        // Group mode toggle
        const groupToggle = document.getElementById('klite-rpmod-group-chat-toggle');
        groupToggle?.addEventListener('change', (e) => {
            this.groupMode = e.target.checked;
            this.toggleGroupMode();
        });

        // Add character button
        const addCharBtn = document.getElementById('klite-rpmod-add-character');
        addCharBtn?.addEventListener('click', () => {
            this.showCharacterSelection();
        });

        // Add custom button
        const addCustomBtn = document.getElementById('klite-rpmod-add-custom');
        addCustomBtn?.addEventListener('click', () => {
            this.showCustomCharacterModal();
        });

        // Turn advancement
        const advanceBtn = document.getElementById('klite-rpmod-advance-turn');
        advanceBtn?.addEventListener('click', () => {
            this.advanceTurn();
        });

        // Roll/Remove initiative toggle
        const rollBtn = document.getElementById('klite-rpmod-roll-initiative');
        rollBtn?.addEventListener('click', () => {
            if (this.initiativeMode) {
                this.removeInitiative();
            } else {
                this.rollAllInitiatives();
            }
        });

        // Auto-advance toggle
        const autoAdvance = document.getElementById('klite-rpmod-auto-advance');
        autoAdvance?.addEventListener('change', (e) => {
            this.autoAdvanceTurns = e.target.checked;
            this.saveGroupState();
        });

        // Response mode
        const responseMode = document.getElementById('klite-rpmod-response-mode');
        responseMode?.addEventListener('change', (e) => {
            this.responseMode = e.target.value;
            this.saveGroupState();
        });

        // Advance mode
        const advanceMode = document.getElementById('klite-rpmod-advance-mode');
        advanceMode?.addEventListener('change', (e) => {
            this.advanceMode = e.target.value;
            if (this.advanceMode === 'initiative' && this.activeCharacters.length > 0 && !this.initiativeMode) {
                this.rollAllInitiatives();
            }
            this.saveGroupState();
        });

        // Group context
        const groupContext = document.getElementById('klite-rpmod-group-context-text');
        let contextTimeout;
        
        groupContext?.addEventListener('input', () => {
            clearTimeout(contextTimeout);
            document.getElementById('klite-rpmod-context-status').textContent = 'Typing...';
            
            contextTimeout = setTimeout(() => {
                this.saveGroupContext();
            }, 1000);
        });

        // Character selection modal
        const searchInput = document.getElementById('klite-rpmod-char-search');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.updateCharacterList();
        });

        const tagFilter = document.getElementById('klite-rpmod-tag-filter');
        tagFilter?.addEventListener('change', (e) => {
            this.tagFilter = e.target.value;
            this.updateCharacterList();
        });

        const starFilter = document.getElementById('klite-rpmod-star-filter');
        starFilter?.addEventListener('change', (e) => {
            this.starFilter = parseInt(e.target.value);
            this.updateCharacterList();
        });

        const confirmCharsBtn = document.getElementById('klite-rpmod-confirm-characters');
        confirmCharsBtn?.addEventListener('click', () => {
            this.confirmCharacterSelection();
        });

        const cancelCharsBtn = document.getElementById('klite-rpmod-cancel-characters');
        cancelCharsBtn?.addEventListener('click', () => {
            this.hideCharacterSelection();
        });

        // Custom character modal
        const hpInput = document.getElementById('klite-rpmod-custom-hp');
        hpInput?.addEventListener('input', (e) => {
            const maxHpInput = document.getElementById('klite-rpmod-custom-max-hp');
            if (!maxHpInput.value) {
                maxHpInput.value = e.target.value;
            }
        });

        const addCustomConfirm = document.getElementById('klite-rpmod-add-custom-confirm');
        addCustomConfirm?.addEventListener('click', () => {
            this.addCustomCharacter();
        });

        const addCustomCancel = document.getElementById('klite-rpmod-add-custom-cancel');
        addCustomCancel?.addEventListener('click', () => {
            this.hideCustomCharacterModal();
        });

        // Edit character modal
        const editHpInput = document.getElementById('klite-rpmod-edit-hp');
        editHpInput?.addEventListener('input', (e) => {
            const maxHpInput = document.getElementById('klite-rpmod-edit-max-hp');
            if (!maxHpInput.value || parseInt(e.target.value) > parseInt(maxHpInput.value)) {
                maxHpInput.value = e.target.value;
            }
        });

        const editSaveBtn = document.getElementById('klite-rpmod-edit-save');
        editSaveBtn?.addEventListener('click', () => {
            this.saveEditedCharacter();
        });

        const editCancelBtn = document.getElementById('klite-rpmod-edit-cancel');
        editCancelBtn?.addEventListener('click', () => {
            this.hideEditModal();
        });
    },

    rollDice(sides = 10, count = 2) {
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        return total;
    },

    rollAllInitiatives() {
        this.activeCharacters.forEach(char => {
            char.initiative = this.rollDice(10, 2);
        });
        
        this.initiativeMode = true;
        this.sortByInitiative();
        this.updateInitiativeButton();
        this.updateParticipantList();
        this.saveCharactersToStorage();
    },

    removeInitiative() {
        this.initiativeMode = false;
        // Clear initiative values
        this.activeCharacters.forEach(char => {
            char.initiative = 0;
        });
        this.updateInitiativeButton();
        this.updateParticipantList();
        this.saveGroupState();
    },

    updateInitiativeButton() {
        const btn = document.getElementById('klite-rpmod-roll-initiative');
        if (btn) {
            btn.textContent = this.initiativeMode ? 'Remove Initiative' : 'Roll Initiative';
            btn.style.background = this.initiativeMode ? '#d9534f' : '#f0ad4e';
        }
    },

    sortByInitiative() {
        this.activeCharacters.sort((a, b) => b.initiative - a.initiative);
        this.currentTurn = 0;
        this.updateCurrentSpeaker();
        this.updateParticipantList();
    },

    toggleGroupMode() {
        const sections = [
            'klite-rpmod-participant-management',
            'klite-rpmod-turn-management',
            'klite-rpmod-group-context'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = this.groupMode ? 'block' : 'none';
            }
        });
        
        this.saveGroupState();
        this.syncWithKobold();
    },

    updateParticipantList() {
        const list = document.getElementById('klite-rpmod-participant-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.activeCharacters.forEach((participant, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                flex-direction: column;
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid ${index === this.currentTurn ? '#4CAF50' : '#333'};
                border-radius: 4px;
                position: relative;
                ${index === this.currentTurn ? 'box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);' : ''}
            `;
            item.draggable = true;
            item.dataset.index = index;
            
            // Row 1: Icon, Name, Edit Button, Delete Button
            const row1 = document.createElement('div');
            row1.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
            
            // Avatar/Icon
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: url('${participant.portrait || this.getDefaultAvatar(participant.type)}') center/cover;
                flex-shrink: 0;
                border: 2px solid ${this.getTypeColor(participant.type)};
            `;
            
            // Name
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'flex: 1; color: #e0e0e0; font-weight: bold; font-size: 14px;';
            nameDiv.textContent = participant.name;
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'klite-rpmod-button';
            editBtn.style.cssText = 'width: auto; padding: 4px 8px; margin: 0; font-size: 11px;';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => this.showEditModal(index));
            
            // Delete button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'klite-rpmod-button';
            removeBtn.style.cssText = 'width: auto; padding: 4px 8px; margin: 0; font-size: 11px; background: #d9534f;';
            removeBtn.textContent = 'Delete';
            removeBtn.title = 'Remove from encounter';
            removeBtn.addEventListener('click', () => this.removeParticipant(index));
            
            row1.appendChild(avatar);
            row1.appendChild(nameDiv);
            row1.appendChild(editBtn);
            row1.appendChild(removeBtn);
            
            // Row 2: Type, HP, Speaking/Next/Last badges
            const row2 = document.createElement('div');
            row2.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12px;';
            
            // Type and Role
            const typeDiv = document.createElement('div');
            typeDiv.style.cssText = `color: ${this.getTypeColor(participant.type)}; text-transform: uppercase;`;
            typeDiv.textContent = participant.type + (participant.role ? ' • ' + participant.role : '');
            
            // HP Display
            const hpDiv = document.createElement('div');
            if (participant.hp !== undefined) {
                const hpPercent = (participant.hp / participant.maxHp) * 100;
                const hpColor = hpPercent > 50 ? '#5cb85c' : hpPercent > 25 ? '#f0ad4e' : '#d9534f';
                hpDiv.innerHTML = `
                    <span style="color: #999;">HP:</span>
                    <span style="color: ${hpColor}; font-weight: bold; margin-left: 5px;">${participant.hp}/${participant.maxHp}</span>
                `;
            }
            
            // Speaking/Next/Last badges
            const badgesDiv = document.createElement('div');
            badgesDiv.style.cssText = 'margin-left: auto; display: flex; gap: 5px;';
            
            if (index === this.currentTurn) {
                const speakingBadge = document.createElement('span');
                speakingBadge.style.cssText = 'padding: 2px 8px; background: #4CAF50; border-radius: 50px; font-size: 10px; color: white;';
                speakingBadge.textContent = 'speaking';
                badgesDiv.appendChild(speakingBadge);
            }
            
            if (index === this.getNextSpeakerIndex()) {
                const nextBadge = document.createElement('span');
                nextBadge.style.cssText = 'padding: 2px 8px; border: 1px solid #4a9eff; border-radius: 50px; font-size: 10px; color: #4a9eff;';
                nextBadge.textContent = 'next';
                badgesDiv.appendChild(nextBadge);
            }
            
            const lastSpeaker = this.getLastSpeakerIndex();
            if (lastSpeaker !== -1 && index === lastSpeaker && index !== this.currentTurn) {
                const lastBadge = document.createElement('span');
                lastBadge.style.cssText = 'padding: 2px 8px; border: 1px solid #666; border-radius: 50px; font-size: 10px; color: #666;';
                lastBadge.textContent = 'last';
                badgesDiv.appendChild(lastBadge);
            }
            
            row2.appendChild(typeDiv);
            if (participant.hp !== undefined) {
                row2.appendChild(hpDiv);
            }
            row2.appendChild(badgesDiv);
            
            // Row 3: Active checkbox, Initiative, Statuses, Now button
            const row3 = document.createElement('div');
            row3.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 12px;';
            
            // Active checkbox
            const activeLabel = document.createElement('label');
            activeLabel.style.cssText = 'display: flex; align-items: center; gap: 5px;';
            const activeCheck = document.createElement('input');
            activeCheck.type = 'checkbox';
            activeCheck.checked = participant.active;
            activeCheck.addEventListener('change', (e) => {
                participant.active = e.target.checked;
                this.saveCharactersToStorage();
            });
            activeLabel.appendChild(activeCheck);
            activeLabel.appendChild(document.createTextNode('Active'));
            
            // Initiative (if in initiative mode)
            if (this.initiativeMode && participant.initiative) {
                const initiativeDiv = document.createElement('div');
                initiativeDiv.style.cssText = 'display: flex; align-items: center; gap: 5px;';
                initiativeDiv.innerHTML = `
                    <span style="color: #999;">Initiative:</span>
                    <span style="color: #4a9eff; font-weight: bold;">${participant.initiative}</span>
                `;
                row3.appendChild(activeLabel);
                row3.appendChild(initiativeDiv);
            } else {
                row3.appendChild(activeLabel);
            }
            
            // Status conditions
            if (participant.statuses && participant.statuses.length > 0) {
                const statusesDiv = document.createElement('div');
                statusesDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; flex: 1;';
                
                participant.statuses.forEach(status => {
                    const statusBadge = document.createElement('span');
                    statusBadge.style.cssText = `
                        padding: 2px 6px;
                        background: rgba(255, 152, 0, 0.2);
                        border: 1px solid #ff9800;
                        border-radius: 3px;
                        font-size: 10px;
                        color: #ff9800;
                    `;
                    statusBadge.textContent = status;
                    statusesDiv.appendChild(statusBadge);
                });
                
                row3.appendChild(statusesDiv);
            }
            
            // Now button
            const nowBtn = document.createElement('button');
            nowBtn.className = 'klite-rpmod-button';
            nowBtn.style.cssText = 'width: auto; padding: 4px 12px; margin: 0; margin-left: auto; font-size: 11px; background: #5cb85c;';
            nowBtn.textContent = 'Now';
            nowBtn.title = 'Trigger response from this character';
            nowBtn.addEventListener('click', () => this.triggerCharacterResponse(participant, index));
            
            row3.appendChild(nowBtn);
            
            item.appendChild(row1);
            item.appendChild(row2);
            item.appendChild(row3);
            
            // Drag and drop handlers
            this.addDragHandlers(item, index);
            
            list.appendChild(item);
        });
    },

    showEditModal(index) {
        this.editingIndex = index;
        const participant = this.activeCharacters[index];
        const modal = document.getElementById('klite-rpmod-edit-character-modal');
        
        // Populate fields
        document.getElementById('klite-rpmod-edit-name').value = participant.name || '';
        document.getElementById('klite-rpmod-edit-type').value = participant.type || 'pc';
        document.getElementById('klite-rpmod-edit-hp').value = participant.hp || '';
        document.getElementById('klite-rpmod-edit-max-hp').value = participant.maxHp || '';
        document.getElementById('klite-rpmod-edit-initiative').value = participant.initiative || '';
        document.getElementById('klite-rpmod-edit-active').checked = participant.active !== false;
        
        // Disable name editing for PCs (they come from character manager)
        const nameInput = document.getElementById('klite-rpmod-edit-name');
        nameInput.disabled = participant.type === 'pc';
        
        // Populate status conditions
        const statusContainer = document.getElementById('klite-rpmod-edit-statuses');
        statusContainer.innerHTML = '';
        
        this.statusConditions.forEach(status => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ccc;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = status;
            checkbox.checked = participant.statuses && participant.statuses.includes(status);
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(status));
            statusContainer.appendChild(label);
        });
        
        modal.classList.remove('hidden');
    },

    hideEditModal() {
        const modal = document.getElementById('klite-rpmod-edit-character-modal');
        modal.classList.add('hidden');
        this.editingIndex = -1;
    },

    saveEditedCharacter() {
        if (this.editingIndex === -1) return;
        
        const participant = this.activeCharacters[this.editingIndex];
        
        // Update values
        if (participant.type !== 'pc') {
            participant.name = document.getElementById('klite-rpmod-edit-name').value.trim();
        }
        participant.type = document.getElementById('klite-rpmod-edit-type').value;
        participant.hp = parseInt(document.getElementById('klite-rpmod-edit-hp').value) || 0;
        participant.maxHp = parseInt(document.getElementById('klite-rpmod-edit-max-hp').value) || participant.hp;
        participant.initiative = parseInt(document.getElementById('klite-rpmod-edit-initiative').value) || 0;
        participant.active = document.getElementById('klite-rpmod-edit-active').checked;
        
        // Update statuses
        participant.statuses = [];
        const statusCheckboxes = document.querySelectorAll('#klite-rpmod-edit-statuses input[type="checkbox"]:checked');
        statusCheckboxes.forEach(cb => {
            participant.statuses.push(cb.value);
        });
        
        // Re-sort if initiative changed and we're in initiative mode
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
        
        this.updateParticipantList();
        this.saveCharactersToStorage();
        this.hideEditModal();
        this.showNotification('Character updated successfully', 'success');
    },

    addDragHandlers(item, index) {
        item.addEventListener('dragstart', (e) => {
            this.draggedIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            item.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '';
            this.draggedIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                item.style.borderTop = '2px solid #4a9eff';
                item.style.borderBottom = '';
            } else {
                item.style.borderTop = '';
                item.style.borderBottom = '2px solid #4a9eff';
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.style.borderTop = '';
            item.style.borderBottom = '';
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.style.borderTop = '';
            item.style.borderBottom = '';
            
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            
            if (fromIndex !== toIndex && !this.initiativeMode) {
                const [removed] = this.activeCharacters.splice(fromIndex, 1);
                this.activeCharacters.splice(toIndex, 0, removed);
                
                // Update current turn
                if (this.currentTurn === fromIndex) {
                    this.currentTurn = toIndex;
                } else if (fromIndex < this.currentTurn && toIndex >= this.currentTurn) {
                    this.currentTurn--;
                } else if (fromIndex > this.currentTurn && toIndex <= this.currentTurn) {
                    this.currentTurn++;
                }
                
                this.updateParticipantList();
                this.updateCurrentSpeaker();
                this.saveCharactersToStorage();
            }
        });
    },

    getTypeColor(type) {
        switch(type) {
            case 'pc': return '#4CAF50';
            case 'npc': return '#4A90E2';
            case 'monster': return '#D9534F';
            default: return '#999';
        }
    },

    getDefaultAvatar(type) {
        return this.defaultAvatars[type] || this.defaultAvatars.npc;
    },

    getNextSpeakerIndex() {
        if (this.activeCharacters.length === 0) return -1;
        
        let nextIndex = this.currentTurn;
        let attempts = 0;
        
        do {
            nextIndex = (nextIndex + 1) % this.activeCharacters.length;
            attempts++;
            if (attempts >= this.activeCharacters.length) return -1;
        } while (!this.activeCharacters[nextIndex].active);
        
        return nextIndex;
    },

    getLastSpeakerIndex() {
        return this.lastSpeakerIndex !== undefined ? this.lastSpeakerIndex : -1;
    },

    showCharacterSelection() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (!modal) return;
        
        // Check if Character Manager is loaded
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        const panelCharManager = window.PanelCharacterManager;
        
        if (!charManager?.instance?.characters && !panelCharManager?.instance?.characters) {
            this.showNotification('Character Manager is still loading. Please wait...', 'warning');
            
            // Set up a check interval
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                const cm = window.KLITE_RPMod_Panels?.CHARS;
                const pcm = window.PanelCharacterManager;
                
                if (cm?.instance?.characters || pcm?.instance?.characters || attempts > 10) {
                    clearInterval(checkInterval);
                    if (attempts <= 10) {
                        // Try again now that it's loaded
                        this.showCharacterSelection();
                    } else {
                        this.showNotification('Could not load Character Manager. Please ensure characters are loaded in the CHARS panel.', 'error');
                    }
                }
            }, 500);
            return;
        }
        
        // Populate tag filter
        this.populateTagFilter();
        
        // Clear selections
        this.selectedCharacters.clear();
        
        // Show modal and update list
        modal.classList.remove('hidden');
        this.updateCharacterList();
    },

    populateTagFilter() {
        const tagFilter = document.getElementById('klite-rpmod-tag-filter');
        if (!tagFilter) return;
        
        const characters = this.getAvailableCharacters();
        const tags = new Set();
        
        // Collect all unique tags
        characters.forEach(char => {
            if (char.tags && Array.isArray(char.tags)) {
                char.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        tags.add(tag.trim());
                    }
                });
            }
        });
        
        // Clear and rebuild options
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
        // Sort tags alphabetically and add as options
        Array.from(tags).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    },

    populateCharacterModal(characters) {
        const list = document.getElementById('klite-rpmod-character-select-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (characters.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No characters available. Import characters in the CHARS panel first.</div>';
            return;
        }
        
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'klite-rpmod-character-select-item';
            item.innerHTML = `
                <img src="${char.imageBlob ? URL.createObjectURL(char.imageBlob) : this.getDefaultAvatar('pc')}" 
                    alt="${char.name}" 
                    style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <span>${char.name}</span>
            `;
            item.onclick = () => this.selectCharacterForGroup(char);
            list.appendChild(item);
        });
    },

    selectCharacterForGroup(character) {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Add the character to the group
        const participant = {
            id: Date.now() + Math.random(),
            name: character.name,
            type: 'pc',
            active: true,
            initiative: this.initiativeMode ? this.rollDice(20) : 0,
            hp: 20,
            maxHp: 20,
            portrait: character.imageBlob ? URL.createObjectURL(character.imageBlob) : null,
            statuses: [],
            characterData: character
        };
        
        this.addParticipant(participant);
    },

    hideCharacterSelectModal() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    updateCharacterList() {
        const list = document.getElementById('klite-rpmod-character-select-list');
        if (!list) return;
        
        const characters = this.getFilteredCharacters();
        list.innerHTML = '';
        
        if (characters.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No characters found matching your filters.</div>';
            return;
        }
        
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'klite-rpmod-character-item';
            item.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px;
                margin-bottom: 4px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            item.dataset.name = char.name;
            
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedCharacters.has(char.name);
            checkbox.style.cssText = 'margin-right: 10px; cursor: pointer;';
            
            // Avatar
            const avatar = document.createElement('div');
            avatar.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: url('${char.portrait || this.getDefaultAvatar('pc')}') center/cover;
                margin-right: 10px;
                border: 2px solid #4CAF50;
                flex-shrink: 0;
            `;
            
            // Character info
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';
            
            const nameRow = document.createElement('div');
            nameRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 2px;';
            
            const name = document.createElement('span');
            name.style.cssText = 'color: #e0e0e0; font-weight: bold; font-size: 13px;';
            name.textContent = char.name;
            
            const tokens = document.createElement('span');
            tokens.style.cssText = 'color: #666; font-size: 11px;';
            tokens.textContent = `${char.tokenCount || 0} tokens`;
            
            nameRow.appendChild(name);
            nameRow.appendChild(tokens);
            
            const detailsRow = document.createElement('div');
            detailsRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            const creator = document.createElement('span');
            creator.style.cssText = 'color: #999; font-size: 11px;';
            creator.textContent = char.creator || 'Unknown';
            
            const tags = document.createElement('span');
            tags.style.cssText = 'color: #666; font-size: 11px;';
            if (char.tags && char.tags.length > 0) {
                tags.textContent = char.tags.slice(0, 3).join(', ') + (char.tags.length > 3 ? '...' : '');
            }
            
            detailsRow.appendChild(creator);
            if (char.tags && char.tags.length > 0) {
                detailsRow.appendChild(document.createTextNode(' • '));
                detailsRow.appendChild(tags);
            }
            
            info.appendChild(nameRow);
            info.appendChild(detailsRow);
            
            // Rating
            const rating = document.createElement('div');
            rating.style.cssText = 'color: #f0ad4e; font-size: 14px; margin-left: 10px;';
            rating.textContent = '★'.repeat(char.rating || 0) + '☆'.repeat(5 - (char.rating || 0));
            
            item.appendChild(checkbox);
            item.appendChild(avatar);
            item.appendChild(info);
            item.appendChild(rating);
            
            // Selection handling
            const updateSelection = (selected) => {
                if (selected) {
                    this.selectedCharacters.add(char.name);
                    item.style.background = 'rgba(74, 158, 255, 0.2)';
                    item.style.borderColor = '#4a9eff';
                    item.classList.add('selected');
                } else {
                    this.selectedCharacters.delete(char.name);
                    item.style.background = 'rgba(0, 0, 0, 0.3)';
                    item.style.borderColor = '#333';
                    item.classList.remove('selected');
                }
                checkbox.checked = selected;
                this.updateSelectedCount();
            };
            
            // Set initial state
            if (this.selectedCharacters.has(char.name)) {
                updateSelection(true);
            }
            
            // Click handlers
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    updateSelection(!checkbox.checked);
                }
            });
            
            checkbox.addEventListener('change', (e) => {
                updateSelection(e.target.checked);
            });
            
            // Hover effect
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = 'rgba(255, 255, 255, 0.05)';
                    item.style.borderColor = '#555';
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = 'rgba(0, 0, 0, 0.3)';
                    item.style.borderColor = '#333';
                }
            });
            
            list.appendChild(item);
        });
        
        this.updateSelectedCount();
    },
    
    updateSelectedCount() {
        const countEl = document.getElementById('klite-rpmod-selected-count');
        if (countEl) {
            countEl.textContent = this.selectedCharacters.size;
        }
    },

    getFilteredCharacters() {
        let characters = this.getAvailableCharacters();
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            characters = characters.filter(char => 
                char.name.toLowerCase().includes(query) ||
                (char.creator && char.creator.toLowerCase().includes(query))
            );
        }
        
        // Filter by tag
        if (this.tagFilter) {
            characters = characters.filter(char => 
                char.tags && char.tags.includes(this.tagFilter)
            );
        }
        
        // Filter by rating
        if (this.starFilter > 0) {
            characters = characters.filter(char => 
                (char.rating || 0) >= this.starFilter
            );
        }
        
        // Exclude already added characters
        characters = characters.filter(char => 
            !this.activeCharacters.find(active => active.name === char.name)
        );
        
        return characters;
    },

    confirmCharacterSelection() {
        const characters = this.getAvailableCharacters();
        
        this.selectedCharacters.forEach(charName => {
            const character = characters.find(c => c.name === charName);
            if (character) {
                this.addParticipant({
                    name: character.name,
                    type: 'pc',
                    active: true,
                    initiative: this.initiativeMode ? this.rollDice(10, 2) : 0,
                    portrait: character.portrait,
                    hp: 20,
                    maxHp: 20,
                    data: character,
                    statuses: []
                });
            }
        });
        
        this.hideCharacterSelection();
        
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
    },

    hideCharacterSelection() {
        const modal = document.getElementById('klite-rpmod-character-select-modal');
        modal?.classList.add('hidden');
        this.selectedCharacters.clear();
    },

    showCustomCharacterModal() {
        const modal = document.getElementById('klite-rpmod-custom-character-modal');
        if (!modal) return;
        
        // Clear fields
        document.getElementById('klite-rpmod-custom-name').value = '';
        document.getElementById('klite-rpmod-custom-type').value = 'npc';
        document.getElementById('klite-rpmod-custom-role').value = '';
        document.getElementById('klite-rpmod-custom-hp').value = '';
        document.getElementById('klite-rpmod-custom-max-hp').value = '';
        
        modal.classList.remove('hidden');
    },

    hideCustomCharacterModal() {
        const modal = document.getElementById('klite-rpmod-custom-character-modal');
        modal?.classList.add('hidden');
    },

    addCustomCharacter() {
        const name = document.getElementById('klite-rpmod-custom-name').value.trim();
        const type = document.getElementById('klite-rpmod-custom-type').value;
        const role = document.getElementById('klite-rpmod-custom-role').value.trim();
        const hp = parseInt(document.getElementById('klite-rpmod-custom-hp').value) || 10;
        const maxHp = parseInt(document.getElementById('klite-rpmod-custom-max-hp').value) || hp;
        
        if (!name) {
            this.showNotification('Please enter a name', 'error');
            return;
        }
        
        this.addParticipant({
            name: name,
            type: type,
            role: role,
            active: true,
            initiative: this.initiativeMode ? this.rollDice(10, 2) : 0,
            hp: hp,
            maxHp: maxHp,
            portrait: null,
            statuses: []
        });
        
        this.hideCustomCharacterModal();
        
        if (this.initiativeMode) {
            this.sortByInitiative();
        }
    },

    addParticipant(participant) {
        if (this.activeCharacters.find(c => c.name === participant.name)) {
            this.showNotification(`${participant.name} is already in the encounter!`, 'warning');
            return;
        }
        
        this.activeCharacters.push(participant);
        this.updateParticipantList();
        this.saveCharactersToStorage();
        
        if (this.activeCharacters.length === 1) {
            this.currentTurn = 0;
            this.updateCurrentSpeaker();
        }
        
        // Generate context for NPCs and monsters
        if (participant.type !== 'pc') {
            this.updateEncounterContext();
        }
    },

    removeParticipant(index) {
        const participant = this.activeCharacters[index];
        if (confirm(`Remove ${participant.name} from the encounter?`)) {
            this.activeCharacters.splice(index, 1);
            
            if (this.currentTurn >= this.activeCharacters.length) {
                this.currentTurn = 0;
            } else if (index < this.currentTurn) {
                this.currentTurn--;
            }
            
            this.updateParticipantList();
            this.updateCurrentSpeaker();
            this.saveCharactersToStorage();
            this.updateEncounterContext();
        }
    },

    advanceTurn() {
        if (this.activeCharacters.length === 0) return;
        
        // Store the current speaker as last speaker
        this.lastSpeakerIndex = this.currentTurn;
        
        switch(this.advanceMode) {
            case 'random':
                // Random selection from active participants
                const activeIndices = this.activeCharacters
                    .map((char, idx) => char.active ? idx : -1)
                    .filter(idx => idx !== -1);
                if (activeIndices.length > 0) {
                    this.currentTurn = activeIndices[Math.floor(Math.random() * activeIndices.length)];
                }
                break;
                
            case 'round-robin':
                // Sequential order, skipping inactive
                let attempts = 0;
                do {
                    this.currentTurn = (this.currentTurn + 1) % this.activeCharacters.length;
                    attempts++;
                    if (attempts >= this.activeCharacters.length) {
                        if (this.currentTurn === 0) {
                            this.combatRound++;
                            document.getElementById('klite-rpmod-combat-round').textContent = this.combatRound;
                        }
                        break;
                    }
                } while (!this.activeCharacters[this.currentTurn].active);
                break;
                
            case 'initiative':
                // Use initiative order if available
                if (this.initiativeMode) {
                    let attempts = 0;
                    do {
                        this.currentTurn = (this.currentTurn + 1) % this.activeCharacters.length;
                        attempts++;
                        if (attempts >= this.activeCharacters.length) {
                            if (this.currentTurn === 0) {
                                this.combatRound++;
                                document.getElementById('klite-rpmod-combat-round').textContent = this.combatRound;
                            }
                            break;
                        }
                    } while (!this.activeCharacters[this.currentTurn].active);
                } else {
                    // Fall back to round-robin if no initiative
                    this.advanceMode = 'round-robin';
                    this.advanceTurn();
                    return;
                }
                break;
                
            case 'name-triggered':
                // This would need to parse the last message for character names
                // For now, fall back to random
                const activeChars = this.activeCharacters
                    .map((char, idx) => char.active ? idx : -1)
                    .filter(idx => idx !== -1);
                if (activeChars.length > 0) {
                    this.currentTurn = activeChars[Math.floor(Math.random() * activeChars.length)];
                }
                break;
        }
        
        this.updateCurrentSpeaker();
        this.updateParticipantList();
        this.saveGroupState();
        
        // Update context with speaker change
        this.updateSpeakerContext(this.lastSpeakerIndex, this.currentTurn);
        
        if (this.autoAdvanceTurns) {
            this.triggerAIGeneration();
        }
    },

    triggerCharacterResponse(participant, index) {
        // Temporarily set this character as current speaker
        const previousTurn = this.currentTurn;
        this.currentTurn = index;
        
        this.updateCurrentSpeaker();
        this.updateParticipantList();
        
        // Trigger AI generation for this specific character
        console.log('Manually triggering response for:', participant.name);
        this.updateChatContext(participant);
        this.triggerAIGeneration();
        
        // Note: In a real implementation, you might want to restore the previous turn
        // after the generation is complete, or handle this differently
    },

    updateCurrentSpeaker() {
        const currentEl = document.getElementById('klite-rpmod-current-speaker');
        const nextEl = document.getElementById('klite-rpmod-next-speaker');
        
        if (this.activeCharacters.length > 0 && this.currentTurn < this.activeCharacters.length) {
            const current = this.activeCharacters[this.currentTurn];
            currentEl.textContent = current.name;
            
            const nextIndex = this.getNextSpeakerIndex();
            if (nextIndex !== -1) {
                nextEl.textContent = this.activeCharacters[nextIndex].name;
            } else {
                nextEl.textContent = '—';
            }
            
            this.updateChatContext(current);
        } else {
            currentEl.textContent = '—';
            nextEl.textContent = '—';
        }
    },

    updateEncounterContext() {
        // Build context for NPCs and monsters
        const npcs = this.activeCharacters.filter(c => c.type === 'npc');
        const monsters = this.activeCharacters.filter(c => c.type === 'monster');
        
        let context = [];
        
        if (npcs.length > 0) {
            context.push('NPCs present: ' + npcs.map(n => `${n.name} (${n.role || 'NPC'})`).join(', '));
        }
        
        if (monsters.length > 0) {
            context.push('Enemies: ' + monsters.map(m => {
                let desc = `${m.name} (${m.role || 'Monster'}, HP: ${m.hp}/${m.maxHp}`;
                if (m.statuses && m.statuses.length > 0) {
                    desc += `, ${m.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        // Update the context field if it's empty
        const contextField = document.getElementById('klite-rpmod-group-context-text');
        if (contextField && !contextField.value && context.length > 0) {
            contextField.value = context.join('\n');
            this.saveGroupContext();
        }
    },

    updateSpeakerContext(previousIndex, currentIndex) {
        const previous = this.activeCharacters[previousIndex];
        const current = this.activeCharacters[currentIndex];
        
        // This would update the AI context to indicate speaker change
        console.log(`Speaker changed from ${previous.name} to ${current.name}`);
    },

    updateChatContext(participant) {
        // Integrate with KoboldAI to update context
        console.log('Setting context for:', participant.name);
        
        if (participant.data && participant.type === 'pc') {
            this.injectCharacterContext(participant.data);
        } else if (participant.type === 'npc' || participant.type === 'monster') {
            this.injectCustomContext(participant);
        }
    },

    injectCharacterContext(characterData) {
        // Load character data into KoboldAI
        console.log('Loading character data:', characterData);
    },

    injectCustomContext(participant) {
        // Create context for NPCs/monsters
        let context = `[${participant.name} is ${participant.role || 'a ' + participant.type}`;
        if (participant.hp !== undefined) {
            context += ` with ${participant.hp}/${participant.maxHp} HP`;
        }
        if (participant.statuses && participant.statuses.length > 0) {
            context += `, currently ${participant.statuses.join(', ')}`;
        }
        context += ']';
        console.log('Injecting context:', context);
    },

    triggerAIGeneration() {
        const current = this.activeCharacters[this.currentTurn];
        console.log('Triggering AI generation for:', current.name);
    },

    saveGroupContext() {
        const contextText = document.getElementById('klite-rpmod-group-context-text').value;
        const status = document.getElementById('klite-rpmod-context-status');
        const tokens = document.getElementById('klite-rpmod-context-tokens');
        
        localStorage.setItem('klite-rpmod-group-context', contextText);
        
        const tokenCount = Math.ceil(contextText.length / 4);
        tokens.textContent = `${tokenCount} tokens`;
        
        status.textContent = 'Saved';
        status.style.color = '#4CAF50';
        
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '';
        }, 2000);
    },

    getAvailableCharacters() {
        // Get characters from the character manager
        const charManager = window.KLITE_RPMod_Panels?.CHARS;
        
        if (charManager && charManager.instance && charManager.instance.characters) {
            // Access the characters array directly from the instance
            const characters = charManager.instance.characters;
            
            if (characters && Array.isArray(characters)) {
                // Process and return characters with proper structure
                return characters.map(char => ({
                    name: char.name || 'Unknown',
                    portrait: char.image || char.rawData?._imageData || '',
                    type: 'pc',
                    rating: char.rating || 0,
                    tags: char.tags || [],
                    creator: char.creator || 'Unknown',
                    description: char.description || '',
                    rawData: char.rawData || {},
                    tokenCount: Math.ceil((char.description || '').length / 4)
                }));
            }
        }
        
        // Also check for PanelCharacterManager instance (alternative way)
        if (window.PanelCharacterManager && window.PanelCharacterManager.instance) {
            const characters = window.PanelCharacterManager.instance.characters;
            if (characters && Array.isArray(characters)) {
                return characters.map(char => ({
                    name: char.name || 'Unknown',
                    portrait: char.image || char.rawData?._imageData || '',
                    type: 'pc',
                    rating: char.rating || 0,
                    tags: char.tags || [],
                    creator: char.creator || 'Unknown',
                    description: char.description || '',
                    rawData: char.rawData || {},
                    tokenCount: Math.ceil((char.description || '').length / 4)
                }));
            }
        }
        
        // Fallback empty array if no character manager found
        console.log('Character Manager not found or no characters loaded');
        return [];
    },

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    saveCharactersToStorage() {
        try {
            localStorage.setItem('klite-rpmod-group-characters', JSON.stringify(this.activeCharacters));
        } catch (e) {
            console.error('Failed to save group characters:', e);
        }
    },

    saveGroupState() {
        try {
            const state = {
                groupMode: this.groupMode,
                autoAdvanceTurns: this.autoAdvanceTurns,
                responseMode: this.responseMode,
                advanceMode: this.advanceMode,
                currentTurn: this.currentTurn,
                combatRound: this.combatRound,
                initiativeMode: this.initiativeMode
            };
            localStorage.setItem('klite-rpmod-group-state', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save group state:', e);
        }
    },

    loadGroupState() {
        try {
            const savedState = localStorage.getItem('klite-rpmod-group-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                Object.assign(this, state);
            }
            
            const savedChars = localStorage.getItem('klite-rpmod-group-characters');
            if (savedChars) {
                this.activeCharacters = JSON.parse(savedChars);
            }
            
            const savedContext = localStorage.getItem('klite-rpmod-group-context');
            if (savedContext) {
                const contextEl = document.getElementById('klite-rpmod-group-context-text');
                if (contextEl) {
                    contextEl.value = savedContext;
                }
            }
        } catch (e) {
            console.error('Failed to load group state:', e);
        }
    },

    updateUI() {
        const groupToggle = document.getElementById('klite-rpmod-group-chat-toggle');
        if (groupToggle) groupToggle.checked = this.groupMode;
        
        const autoAdvance = document.getElementById('klite-rpmod-auto-advance');
        if (autoAdvance) autoAdvance.checked = this.autoAdvanceTurns;
        
        const responseMode = document.getElementById('klite-rpmod-response-mode');
        if (responseMode) responseMode.value = this.responseMode;
        
        const advanceMode = document.getElementById('klite-rpmod-advance-mode');
        if (advanceMode) advanceMode.value = this.advanceMode;
        
        const roundEl = document.getElementById('klite-rpmod-combat-round');
        if (roundEl) roundEl.textContent = this.combatRound;
        
        this.updateInitiativeButton();
        this.toggleGroupMode();
        this.updateParticipantList();
        this.updateCurrentSpeaker();
    },

    syncWithKobold() {
        if (this.groupMode && this.activeCharacters.length > 0) {
            console.log('Syncing group mode with KoboldAI');
            
            // Build full context including all NPCs and monsters
            const context = this.buildGroupContext();
            console.log('Group context:', context);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    buildGroupContext() {
        const pcs = this.activeCharacters.filter(c => c.type === 'pc');
        const npcs = this.activeCharacters.filter(c => c.type === 'npc');
        const monsters = this.activeCharacters.filter(c => c.type === 'monster');
        
        let context = [];
        
        if (pcs.length > 0) {
            context.push('Party members: ' + pcs.map(p => p.name).join(', '));
        }
        
        if (npcs.length > 0) {
            context.push('NPCs: ' + npcs.map(n => {
                let desc = `${n.name} (${n.role || 'NPC'}`;
                if (n.statuses && n.statuses.length > 0) {
                    desc += `, ${n.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        if (monsters.length > 0) {
            context.push('Enemies: ' + monsters.map(m => {
                let desc = `${m.name} (${m.role || 'Monster'}, HP: ${m.hp}/${m.maxHp}`;
                if (m.statuses && m.statuses.length > 0) {
                    desc += `, ${m.statuses.join(', ')}`;
                }
                desc += ')';
                return desc;
            }).join(', '));
        }
        
        const customContext = document.getElementById('klite-rpmod-group-context-text')?.value;
        if (customContext) {
            context.push(customContext);
        }
        
        return context.join('\n');
    }
};