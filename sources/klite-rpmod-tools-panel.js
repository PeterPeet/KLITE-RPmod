// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - TOOLS Panel Implementation
// Advanced analysis and utility tools with full functionality
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.TOOLS = {
    // State
    analysisWindow: null,
    autoRegenerateInterval: null,
    autoRegenerateEnabled: false,
    lastRoll: null,
    contextCache: null,
    
    load(container, panel) {
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <!-- Statistics Dashboard -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Statistics Dashboard</h3>
                    <div class="klite-rpmod-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Messages</div>
                            <div id="klite-rpmod-message-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Token Count</div>
                            <div id="klite-rpmod-token-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Characters</div>
                            <div id="klite-rpmod-char-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                        <div class="klite-rpmod-stat-card" style="background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 4px; padding: 10px; text-align: center;">
                            <div style="color: #666; font-size: 10px; margin-bottom: 2px;">Words</div>
                            <div id="klite-rpmod-word-count" style="color: #4a9eff; font-size: 24px; font-weight: bold;">0</div>
                        </div>
                    </div>
                    
                    <!-- Additional stats row -->
                    <div class="klite-rpmod-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">Avg Msg Length</div>
                            <div id="klite-rpmod-avg-length" style="color: #999; font-size: 16px; font-weight: bold;">0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">User/AI Ratio</div>
                            <div id="klite-rpmod-user-ai-ratio" style="color: #999; font-size: 16px; font-weight: bold;">0:0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="color: #666; font-size: 10px;">Unique Words</div>
                            <div id="klite-rpmod-unique-words" style="color: #999; font-size: 16px; font-weight: bold;">0</div>
                        </div>
                    </div>
                    
                    <button class="klite-rpmod-button" id="klite-rpmod-refresh-stats" style="width: 100%;">
                        Refresh Statistics
                    </button>
                </div>

                <!-- Context Analyzer -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Context Analyzer</h3>
                    
                    <!-- Token distribution bar -->
                    <div class="klite-rpmod-token-bar" style="
                        display: flex; 
                        height: 40px; 
                        border-radius: 4px; 
                        overflow: hidden; 
                        margin: 10px;
                        padding: 5px;
                        border: 1px solid #444;
                        background: #1a1a1a;
                    ">
                        <div id="klite-rpmod-memory-bar" style="background: #d9534f; transition: width 0.3s;" title="Memory"></div>
                        <div id="klite-rpmod-wi-bar" style="background: #5cb85c; transition: width 0.3s;" title="World Info"></div>
                        <div id="klite-rpmod-story-bar" style="background: #5bc0de; transition: width 0.3s;" title="Story"></div>
                        <div id="klite-rpmod-anote-bar" style="background: #f0ad4e; transition: width 0.3s;" title="Author's Note"></div>
                        <div id="klite-rpmod-free-bar" style="background: #333; flex: 1;" title="Free Space"></div>
                    </div>
                    
                    <!-- Token breakdown -->
                    <div style="font-size: 11px; color: #999;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #d9534f; margin-right: 5px;"></span>Memory: <span id="klite-rpmod-memory-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #5cb85c; margin-right: 5px;"></span>World Info: <span id="klite-rpmod-wi-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #5bc0de; margin-right: 5px;"></span>Story: <span id="klite-rpmod-story-tokens">0</span></div>
                            <div><span style="display: inline-block; width: 10px; height: 10px; background: #f0ad4e; margin-right: 5px;"></span>Author's Note: <span id="klite-rpmod-anote-tokens">0</span></div>
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                            <strong>Total Context: <span id="klite-rpmod-total-context">0</span> / <span id="klite-rpmod-max-context">8192</span> tokens</strong>
                            <div style="color: #666; margin-top: 5px;">Free: <span id="klite-rpmod-free-tokens">8192</span> tokens (<span id="klite-rpmod-free-percent">100</span>%)</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-analyze-context" style="flex: 1;">
                            Analyze Context
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-detailed-analysis" style="flex: 1;">
                            Detailed View
                        </button>
                    </div>
                </div>

                <!-- Smart Memory Writer -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Smart Memory Writer</h3>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">(has 120 seconds timeout)</div>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select id="klite-rpmod-memory-context" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 6px;">
                            <option value="entire">Entire Story (∞)</option>
                            <option value="last50">Last 50 Messages</option>
                            <option value="recent" selected>Recent Messages (10)</option>
                            <option value="last3">Most Recent Messages (3)</option>
                            <option value="last1">Last Message (1)</option>
                        </select>
                        <select id="klite-rpmod-memory-type" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 6px;">
                            <option value="summary" selected>Summary</option>
                            <option value="keywords">Keywords</option>
                            <option value="outline">Outline</option>
                        </select>
                    </div>
                    
                    <button class="klite-rpmod-button" id="klite-rpmod-generate-memory" style="width: 100%; margin-bottom: 10px;">
                        🧠 Generate Memory
                    </button>
                    <textarea id="klite-rpmod-memory-output" placeholder="Generated memory will appear here..." style="
                        width: 100%;
                        height: 150px;
                        background: #262626;
                        border: 1px solid #444;
                        color: #e0e0e0;
                        padding: 10px;
                        font-size: 13px;
                        resize: vertical;
                        margin-bottom: 10px;
                    "></textarea>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-apply-memory">
                            ✓ Apply
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-append-memory">
                            + Append
                        </button>
                    </div>
                </div>
                <!-- Quick Dice -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Quick Dice</h3>
                    
                    <!-- Standard dice buttons -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <button class="klite-rpmod-dice-btn" data-dice="d2" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d2</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d4" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d4</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d6" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d6</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d8" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d8</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d10" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d10</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d12" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d12</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d20" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d20</button>
                        <button class="klite-rpmod-dice-btn" data-dice="d100" style="width: 32px; height: 32px; padding: 0; background: #333; border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 11px; cursor: pointer;">d100</button>
                    </div>
                    
                    <!-- Custom dice input -->
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="klite-rpmod-custom-dice" placeholder="e.g., 2d6+3" style="
                            flex: 1; 
                            background: #262626; 
                            border: 1px solid #444; 
                            color: #e0e0e0; 
                            padding: 6px; 
                            border-radius: 4px;
                        ">
                        <button class="klite-rpmod-button" id="klite-rpmod-roll-custom" style="width: auto; padding: 6px 16px;">
                            Roll
                        </button>
                    </div>
                    
                    <!-- Dice result display -->
                    <div id="klite-rpmod-dice-result" style="
                        margin-top: 10px; 
                        padding: 12px; 
                        background: rgba(0,0,0,0.3); 
                        border-radius: 4px; 
                        text-align: center; 
                        min-height: 50px; 
                        display: none;
                        border: 1px solid #444;
                    ">
                        <div id="klite-rpmod-dice-total" style="font-size: 28px; font-weight: bold; color: #4a9eff; margin-bottom: 5px;"></div>
                        <div id="klite-rpmod-dice-breakdown" style="font-size: 12px; color: #999;"></div>
                        <div id="klite-rpmod-dice-animation" style="margin-top: 10px;"></div>
                    </div>
                    
                    <!-- Dice settings -->
                    <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="klite-rpmod-dice-to-chat" checked>
                        <label for="klite-rpmod-dice-to-chat" style="color: #999; font-size: 12px;">Add rolls to chat</label>
                    </div>
                </div>

                <!-- Auto-Re-Generate -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Auto-Re-Generate</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="checkbox" id="klite-rpmod-auto-regen-toggle" style="width: auto;">
                        <label for="klite-rpmod-auto-regen-toggle" style="color: #999; font-size: 13px;">Enable Auto-Regenerate</label>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="color: #999; font-size: 11px;">Delay (ms):</label>
                            <input type="number" id="klite-rpmod-auto-regen-delay" value="3000" min="1000" max="10000" step="500" style="
                                width: 100%; 
                                background: #262626; 
                                border: 1px solid #444; 
                                color: #e0e0e0; 
                                padding: 4px;
                            ">
                        </div>
                        <div>
                            <label style="color: #999; font-size: 11px;">Max Retries:</label>
                            <input type="number" id="klite-rpmod-auto-regen-max" value="3" min="1" max="10" style="
                                width: 100%; 
                                background: #262626; 
                                border: 1px solid #444; 
                                color: #e0e0e0; 
                                padding: 4px;
                            ">
                        </div>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <label style="color: #999; font-size: 11px;">Trigger conditions:</label>
                        <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
                            <label style="color: #999; font-size: 11px;">Keyword Triggers:</label>
                            <div style="margin-top: 5px;">
                                <textarea id="klite-rpmod-regen-keywords" placeholder="Enter keywords, one per line" style="
                                    width: 100%;
                                    height: 60px;
                                    background: #262626;
                                    border: 1px solid #444;
                                    color: #e0e0e0;
                                    padding: 6px;
                                    font-size: 11px;
                                    resize: vertical;
                                "></textarea>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                                <div>
                                    <label style="color: #999; font-size: 11px;">Required matches:</label>
                                    <input type="number" id="klite-rpmod-keyword-threshold" value="2" min="1" max="10" style="
                                        width: 100%;
                                        background: #262626;
                                        border: 1px solid #444;
                                        color: #e0e0e0;
                                        padding: 4px;
                                    ">
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px; margin-top: 16px;">
                                    <input type="checkbox" id="klite-rpmod-keyword-case">
                                    <label for="klite-rpmod-keyword-case" style="color: #888; font-size: 11px;">Case sensitive</label>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 5px;">
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-regen-short" checked>
                                <label for="klite-rpmod-regen-short" style="color: #888; font-size: 11px;">Short messages (<50 chars)</label>
                            </div>
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-regen-incomplete" checked>
                                <label for="klite-rpmod-regen-incomplete" style="color: #888; font-size: 11px;">Incomplete sentences</label>
                            </div>
                            <div>
                                <input type="checkbox" id="klite-rpmod-regen-error">
                                <label for="klite-rpmod-regen-error" style="color: #888; font-size: 11px;">Error responses</label>
                            </div>
                        </div>
                    </div>
                    
                    <div id="klite-rpmod-auto-regen-status" style="
                        margin-top: 10px; 
                        padding: 8px; 
                        background: rgba(0,0,0,0.3); 
                        border-radius: 4px; 
                        color: #666; 
                        font-size: 11px; 
                        text-align: center;
                    ">
                        Auto-regenerate is disabled
                    </div>
                </div>

                <!-- Export Tools -->
                <div class="klite-rpmod-control-group">
                    <div class="klite-rpmod-control-group-background"></div>
                    <h3>Export Tools</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="klite-rpmod-button" id="klite-rpmod-export-markdown">
                            📝 Markdown
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-json">
                            📊 JSON
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-html">
                            🌐 HTML
                        </button>
                        <button class="klite-rpmod-button" id="klite-rpmod-export-epub">
                            📚 EPUB
                        </button>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <label style="color: #999; font-size: 11px;">Export options:</label>
                        <div style="margin-top: 5px;">
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-export-metadata" checked>
                                <label for="klite-rpmod-export-metadata" style="color: #888; font-size: 11px;">Include metadata</label>
                            </div>
                            <div style="margin-bottom: 3px;">
                                <input type="checkbox" id="klite-rpmod-export-worldinfo" checked>
                                <label for="klite-rpmod-export-worldinfo" style="color: #888; font-size: 11px;">Include World Info</label>
                            </div>
                            <div>
                                <input type="checkbox" id="klite-rpmod-export-format">
                                <label for="klite-rpmod-export-format" style="color: #888; font-size: 11px;">Format as dialogue</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 
        </div>        
        `;

        this.initializeTools();
        
        // Initial statistics update
        this.updateStatistics();

        setTimeout(() => {
            this.analyzeContext();
        }, 100);

        this.startContextAutoRefresh();
    },

    initializeTools() {
        // Statistics
        document.getElementById('klite-rpmod-refresh-stats')?.addEventListener('click', () => {
            this.updateStatistics();
        });

        // Context analyzer
        document.getElementById('klite-rpmod-analyze-context')?.addEventListener('click', () => {
            // Add visual feedback
            const button = document.getElementById('klite-rpmod-analyze-context');
            const originalText = button.textContent;
            button.textContent = 'Analyzing...';
            button.disabled = true;
            
            // Clear the cache to force a fresh analysis
            this.contextCache = null;
            
            // Run the analysis
            this.analyzeContext();
            
            // Restore button state after a short delay
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                
                button.style.backgroundColor = '#5cb85c';
                setTimeout(() => {
                    button.style.backgroundColor = '';
                }, 500)
            }, 300);
        });

        document.getElementById('klite-rpmod-detailed-analysis')?.addEventListener('click', () => {
            this.openDetailedAnalysis();
        });

        // Memory generator
        document.getElementById('klite-rpmod-generate-memory')?.addEventListener('click', () => {
            this.generateMemory();
        });

        document.getElementById('klite-rpmod-apply-memory')?.addEventListener('click', () => {
            this.applyMemory(false);
        });

        document.getElementById('klite-rpmod-append-memory')?.addEventListener('click', () => {
            this.applyMemory(true);
        });

        // Dice system
        this.initializeDiceSystem();

        window.addEventListener('kobold:memory_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });

        window.addEventListener('kobold:story_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });

        window.addEventListener('kobold:wi_changed', () => {
            if (this.contextCache) {
                this.analyzeContext();
            }
        });
        // Auto-Re-Generate
        this.initializeAutoRegenerate();

        // Export tools
        this.initializeExportTools();
    },

    // ==================== STATISTICS ====================
    updateStatistics() {
        console.log('📊 Updating statistics...');
        
        if (typeof gametext_arr === 'undefined' || !Array.isArray(gametext_arr)) {
            return;
        }
        
        const messages = gametext_arr.filter(msg => msg && msg.trim());
        const fullText = messages.join(' ');
        
        // Basic counts
        const messageCount = messages.length;
        const charCount = fullText.length;
        const words = fullText.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Token count
        let tokenCount = 0;
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(fullText);
                tokenCount = Array.isArray(tokens) ? tokens.length : 0;
            } catch (e) {
                tokenCount = Math.ceil(fullText.length / 4);
            }
        } else {
            tokenCount = Math.ceil(fullText.length / 4);
        }
        
        // Advanced statistics
        const avgMessageLength = messageCount > 0 ? Math.round(charCount / messageCount) : 0;
        
        // User/AI ratio (assuming alternating messages)
        const userMessages = messages.filter((_, i) => i % 2 === 0).length;
        const aiMessages = messages.filter((_, i) => i % 2 === 1).length;
        const ratio = `${userMessages}:${aiMessages}`;
        
        // Unique words
        const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
        
        // Update UI
        document.getElementById('klite-rpmod-message-count').textContent = messageCount;
        document.getElementById('klite-rpmod-token-count').textContent = tokenCount.toLocaleString();
        document.getElementById('klite-rpmod-char-count').textContent = charCount.toLocaleString();
        document.getElementById('klite-rpmod-word-count').textContent = wordCount.toLocaleString();
        document.getElementById('klite-rpmod-avg-length').textContent = avgMessageLength;
        document.getElementById('klite-rpmod-user-ai-ratio').textContent = ratio;
        document.getElementById('klite-rpmod-unique-words').textContent = uniqueWords.toLocaleString();
    },

    // ==================== CONTEXT ANALYZER ====================
    analyzeContext() {
        console.log('🔍 Analyzing context...');
        
        // Get max context size
        const maxContext = (typeof localsettings !== 'undefined' && localsettings.max_context_length) 
            ? parseInt(localsettings.max_context_length) 
            : 8192;
        
        // Build context components
        const contextParts = this.buildContextParts();
        
        // Update token bar
        this.updateTokenBar(contextParts, maxContext);
        
        // Cache for detailed view
        this.contextCache = contextParts;
    },

    buildContextParts() {
        const parts = {
            memory: { text: '', tokens: 0 },
            worldInfo: { text: '', tokens: 0 },
            story: { text: '', tokens: 0 },
            authorNote: { text: '', tokens: 0 },
            total: 0
        };
        
        // Memory
        if (typeof localsettings !== 'undefined' && localsettings.memory) {
            parts.memory.text = localsettings.memory;
            parts.memory.tokens = this.countTokens(parts.memory.text);
        }
        
        // World Info
        if (typeof current_wi !== 'undefined' && Array.isArray(current_wi)) {
            const activeWI = current_wi.filter(wi => wi.content && wi.key);
            parts.worldInfo.text = activeWI.map(wi => wi.content).join('\n');
            parts.worldInfo.tokens = this.countTokens(parts.worldInfo.text);
        }
        
        // Story (recent messages)
        if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
            // Get as many recent messages as will fit
            const recentMessages = gametext_arr.slice(-50).filter(msg => msg);
            parts.story.text = recentMessages.join('\n');
            parts.story.tokens = this.countTokens(parts.story.text);
        }
        
        // Author's Note
        if (typeof localsettings !== 'undefined' && localsettings.anotetext) {
            parts.authorNote.text = localsettings.anotetext;
            parts.authorNote.tokens = this.countTokens(parts.authorNote.text);
        }
        
        // Total
        parts.total = parts.memory.tokens + parts.worldInfo.tokens + 
                     parts.story.tokens + parts.authorNote.tokens;
        
        return parts;
    },

    updateTokenBar(parts, maxContext) {
        const total = parts.total;
        const free = Math.max(0, maxContext - total);
        
        // Update token counts
        document.getElementById('klite-rpmod-memory-tokens').textContent = parts.memory.tokens;
        document.getElementById('klite-rpmod-wi-tokens').textContent = parts.worldInfo.tokens;
        document.getElementById('klite-rpmod-story-tokens').textContent = parts.story.tokens;
        document.getElementById('klite-rpmod-anote-tokens').textContent = parts.authorNote.tokens;
        document.getElementById('klite-rpmod-total-context').textContent = total;
        document.getElementById('klite-rpmod-max-context').textContent = maxContext;
        document.getElementById('klite-rpmod-free-tokens').textContent = free;
        document.getElementById('klite-rpmod-free-percent').textContent = Math.round((free / maxContext) * 100);
        
        // Update visual bar
        const memoryBar = document.getElementById('klite-rpmod-memory-bar');
        const wiBar = document.getElementById('klite-rpmod-wi-bar');
        const storyBar = document.getElementById('klite-rpmod-story-bar');
        const anoteBar = document.getElementById('klite-rpmod-anote-bar');
        
        if (total > 0) {
            memoryBar.style.width = `${(parts.memory.tokens / maxContext) * 100}%`;
            wiBar.style.width = `${(parts.worldInfo.tokens / maxContext) * 100}%`;
            storyBar.style.width = `${(parts.story.tokens / maxContext) * 100}%`;
            anoteBar.style.width = `${(parts.authorNote.tokens / maxContext) * 100}%`;
        } else {
            memoryBar.style.width = '0';
            wiBar.style.width = '0';
            storyBar.style.width = '0';
            anoteBar.style.width = '0';
        }
        
        // Color code based on usage
        const usagePercent = (total / maxContext) * 100;
        const bars = [memoryBar, wiBar, storyBar, anoteBar];
        
        if (usagePercent > 90) {
            bars.forEach(bar => bar.style.opacity = '0.8');
        } else {
            bars.forEach(bar => bar.style.opacity = '1');
        }
    },

    openDetailedAnalysis() {
        console.log('📈 Opening detailed analysis...');
        
        // Make sure we have context data
        if (!this.contextCache) {
            this.analyzeContext();
        }
        
        // Close existing window if open
        if (this.analysisWindow && !this.analysisWindow.closed) {
            this.analysisWindow.close();
        }
        
        // Open new window with the advanced context analyzer
        this.analysisWindow = window.open('', 'ContextAnalysis', 'width=1200,height=800,scrollbars=yes');
        
        const doc = this.analysisWindow.document;
        doc.open();
        doc.write(this.buildDetailedAnalysisHTML());
        doc.close();
    },

    startContextAutoRefresh() {
        // Stop any existing interval
        this.stopContextAutoRefresh();
        
        // Update every 5 seconds
        this.contextRefreshInterval = setInterval(() => {
            if (document.getElementById('klite-rpmod-panel-tools')) {
                this.analyzeContext();
            } else {
                this.stopContextAutoRefresh();
            }
        }, 5000);
    },

    stopContextAutoRefresh() {
        if (this.contextRefreshInterval) {
            clearInterval(this.contextRefreshInterval);
            this.contextRefreshInterval = null;
        }
    },

    buildDetailedAnalysisHTML() {
        const parts = this.contextCache || this.buildContextParts();
        const maxContext = (typeof localsettings !== 'undefined' && localsettings.max_context_length) 
            ? parseInt(localsettings.max_context_length) 
            : 8192;
        
        // Build the context_analyzerv4.html style interface
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Context Analysis - KLITE RPMod</title>
                <style>
                    ${this.getAnalyzerStyles()}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Context Analysis</h1>
                        <div class="summary">
                            <div class="summary-item">Memory: ${parts.memory.tokens} tokens</div>
                            <div class="summary-item">World Info: ${parts.worldInfo.tokens} tokens</div>
                            <div class="summary-item">Story: ${parts.story.tokens} tokens</div>
                            <div class="summary-item">Author's Note: ${parts.authorNote.tokens} tokens</div>
                            <div class="summary-item"><strong>Total: ${parts.total} / ${maxContext} tokens</strong></div>
                        </div>
                    </div>
                    
                    <div class="token-bar-container">
                        <div class="token-bar">
                            ${parts.memory.tokens > 0 ? `<div class="memory-tokens" style="width: ${(parts.memory.tokens / maxContext) * 100}%" title="Memory: ${parts.memory.tokens} tokens"></div>` : ''}
                            ${parts.worldInfo.tokens > 0 ? `<div class="wi-tokens" style="width: ${(parts.worldInfo.tokens / maxContext) * 100}%" title="World Info: ${parts.worldInfo.tokens} tokens"></div>` : ''}
                            ${parts.story.tokens > 0 ? `<div class="story-tokens" style="width: ${(parts.story.tokens / maxContext) * 100}%" title="Story: ${parts.story.tokens} tokens"></div>` : ''}
                            ${parts.authorNote.tokens > 0 ? `<div class="anote-tokens" style="width: ${(parts.authorNote.tokens / maxContext) * 100}%" title="Author's Note: ${parts.authorNote.tokens} tokens"></div>` : ''}
                            <div class="free-tokens" style="width: ${((maxContext - parts.total) / maxContext) * 100}%" title="Free: ${maxContext - parts.total} tokens"></div>
                        </div>
                    </div>
                    
                    <div class="view-controls">
                        <label><input type="radio" name="viewMode" value="formatted" checked onchange="toggleView()"> Formatted View</label>
                        <label><input type="radio" name="viewMode" value="tokens" onchange="toggleView()"> Token View</label>
                        <label><input type="checkbox" id="showIds" onchange="toggleIds()"> Show Token IDs</label>
                    </div>
                    
                    ${parts.memory.text ? this.buildSection('Memory', parts.memory.text, '#d9534f') : ''}
                    ${parts.worldInfo.text ? this.buildSection('World Info', parts.worldInfo.text, '#5cb85c') : ''}
                    ${parts.story.text ? this.buildSection('Story Context', parts.story.text, '#5bc0de') : ''}
                    ${parts.authorNote.text ? this.buildSection('Author\'s Note', parts.authorNote.text, '#f0ad4e') : ''}
                </div>
                
                <script>
                    ${this.getAnalyzerScript()}
                </script>
            </body>
            </html>
        `;
    },

    buildSection(title, content, color) {
        const tokens = this.tokenizeText(content);
        const tokenView = this.createTokenVisualization(tokens);
        
        return `
            <div class="section">
                <h2 style="color: ${color};">${title}</h2>
                <div class="formatted-view">
                    <pre>${this.escapeHtml(content)}</pre>
                </div>
                <div class="token-view" style="display: none;">
                    ${tokenView}
                </div>
            </div>
        `;
    },

    getAnalyzerStyles() {
        return `
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #1a1a1a;
                color: #e0e0e0;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .header {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            h1 {
                margin: 0 0 15px 0;
                color: #4a9eff;
            }
            .summary {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            .summary-item {
                color: #999;
            }
            .token-bar-container {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .token-bar {
                display: flex;
                height: 40px;
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid #666;
            }
            .memory-tokens { background: #d9534f; }
            .wi-tokens { background: #5cb85c; }
            .story-tokens { background: #5bc0de; }
            .anote-tokens { background: #f0ad4e; }
            .free-tokens { background: #333; }
            .view-controls {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .view-controls label {
                margin-right: 20px;
                cursor: pointer;
            }
            .section {
                background: #262626;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .section h2 {
                margin-top: 0;
            }
            pre {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 15px;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
            }
            .token-item {
                display: inline;
                padding: 2px 4px;
                margin: 1px;
                border-radius: 3px;
                font-size: 12px;
                font-family: monospace;
                cursor: help;
            }
            .token-ids {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
                font-family: monospace;
                font-size: 11px;
                color: #666;
                word-break: break-all;
            }
        `;
    },

    getAnalyzerScript() {
        return `
            function toggleView() {
                const mode = document.querySelector('input[name="viewMode"]:checked').value;
                const formattedViews = document.querySelectorAll('.formatted-view');
                const tokenViews = document.querySelectorAll('.token-view');
                
                if (mode === 'formatted') {
                    formattedViews.forEach(el => el.style.display = 'block');
                    tokenViews.forEach(el => el.style.display = 'none');
                } else {
                    formattedViews.forEach(el => el.style.display = 'none');
                    tokenViews.forEach(el => el.style.display = 'block');
                }
            }
            
            function toggleIds() {
                const showIds = document.getElementById('showIds').checked;
                const idElements = document.querySelectorAll('.token-ids');
                idElements.forEach(el => el.style.display = showIds ? 'block' : 'none');
            }
        `;
    },

    tokenizeText(text) {
        // Simple tokenizer that approximates GPT tokenization
        if (!text) return [];
        
        const tokens = [];
        let i = 0;
        
        while (i < text.length) {
            // Try to match common patterns
            if (text.substring(i).match(/^\s+/)) {
                // Whitespace
                const match = text.substring(i).match(/^\s+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^[A-Z][a-z]+/)) {
                // Capitalized word
                const match = text.substring(i).match(/^[A-Z][a-z]+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^[a-z]+/)) {
                // Lowercase word
                const match = text.substring(i).match(/^[a-z]+/)[0];
                tokens.push(match);
                i += match.length;
            } else if (text.substring(i).match(/^\d+/)) {
                // Numbers
                const match = text.substring(i).match(/^\d+/)[0];
                tokens.push(match);
                i += match.length;
            } else {
                // Single character
                tokens.push(text[i]);
                i++;
            }
        }
        
        return tokens;
    },

    createTokenVisualization(tokens) {
        // Blue theme colors based on your app's color scheme
        const colors = [
            '#4a9eff', '#357abd', '#2563a0', '#1a4d84', '#2e6da4',
            '#5bc0de', '#46a7c4', '#3690aa', '#286090', '#1f5276',
            '#3d7fa6', '#4d8fb6', '#5d9fc6', '#6dafd6', '#7dbfe6'
        ];
        
        let html = '<div class="token-visualization">';
        
        // Token IDs (hidden by default)
        const tokenIds = tokens.map((_, i) => 1000 + i); // Simple sequential IDs
        html += `<div class="token-ids" style="display: none;">[${tokenIds.join(', ')}]</div>`;
        
        tokens.forEach((token, index) => {
            const colorIndex = index % colors.length;
            const backgroundColor = colors[colorIndex];
            // Add white text color for better contrast
            html += `<span class="token-item" style="background-color: ${backgroundColor}; color: #ffffff;" title="Token ${index + 1}: '${this.escapeHtml(token)}'">${this.escapeHtml(token)}</span>`;
        });
        
        html += '</div>';
        return html;
    },

    countTokens(text) {
        if (!text) return 0;
        
        if (typeof tokenize === 'function') {
            try {
                const tokens = tokenize(text);
                return Array.isArray(tokens) ? tokens.length : 0;
            } catch (e) {
                return Math.ceil(text.length / 4);
            }
        }
        return Math.ceil(text.length / 4);
    },

    // ==================== SMART MEMORY WRITER ====================
    generateMemory() {
        console.log('🧠 Generating memory...');
        
        const contextSize = document.getElementById('klite-rpmod-memory-context')?.value || 'recent';
        const outputType = document.getElementById('klite-rpmod-memory-type')?.value || 'summary';
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        
        if (!outputArea) return;
        
        // Clear output and show generating message
        outputArea.value = 'Generating memory... Please wait.';
        outputArea.style.borderColor = '#f0ad4e';
        
        // Get the context based on selection
        let contextText = '';
        let messageCount = 0;
        
        if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
            const messages = gametext_arr.filter(msg => msg && msg.trim());
            
            const contextMap = {
                'entire': messages.length,
                'last50': 50,
                'recent': 10,
                'last3': 3,
                'last1': 1
            };
            
            const numMessages = contextMap[contextSize] || 10;
            const selectedMessages = contextSize === 'entire' ? messages : messages.slice(-numMessages);
            contextText = selectedMessages.join('\n\n');
            messageCount = selectedMessages.length;
        }
        
        if (!contextText) {
            outputArea.value = 'No story content to analyze.';
            outputArea.style.borderColor = '#d9534f';
            return;
        }
        
        // Build the prompt based on output type
        const prompts = {
            'summary': `Please analyze the story above and create a concise memory summary. Include key characters, events, and important details. Write in past tense, third person. Maximum 150 words.`,
            'keywords': `Extract the most important keywords, names, places, and concepts from the story above. List them as comma-separated values.`,
            'outline': `Create a bullet-point outline of the main events and key information from the story above.`
        };
        
        const instruction = prompts[outputType] || prompts['summary'];
        
        // Save current state
        const originalLength = gametext_arr.length;
        const originalInput = document.getElementById('input_text')?.value || '';
        
        // Add instruction temporarily
        gametext_arr.push(`\n\n[System Instruction: ${instruction}]\n`);
        render_gametext();
        
        // Set up a one-time observer to catch the response
        const gametext = document.getElementById('gametext');
        if (gametext) {
            const observer = new MutationObserver((mutations) => {
                // Get the latest addition to the story
                const currentLength = gametext_arr.length;
                if (currentLength > originalLength + 1) {
                    // We have a response!
                    const response = gametext_arr[currentLength - 1];
                    
                    // Clean up - remove instruction and response from story
                    gametext_arr.length = originalLength;
                    render_gametext();
                    
                    // Display the generated memory
                    outputArea.value = response.trim();
                    outputArea.style.borderColor = '#5cb85c';
                    
                    // Restore input
                    const inputField = document.getElementById('input_text');
                    if (inputField) inputField.value = originalInput;
                    
                    // Disconnect observer
                    observer.disconnect();
                }
            });
            
            observer.observe(gametext, { childList: true, subtree: true });
            
            // Submit empty generation to trigger AI response
            const inputField = document.getElementById('input_text');
            if (inputField && typeof submit_generation_button === 'function') {
                inputField.value = '';
                submit_generation_button();
                
                // Timeout fallback
                setTimeout(() => {
                    observer.disconnect();
                    if (outputArea.value === 'Generating memory... Please wait.') {
                        outputArea.value = 'Generation timed out. Please try again.';
                        outputArea.style.borderColor = '#d9534f';
                        gametext_arr.length = originalLength;
                        render_gametext();
                    }
                }, 1200000); // 120 second timeout
            }
        }
    },

    generateMemoryByStyle(content, style) {
        // Extract key information
        const analysis = this.analyzeContent(content);
        
        switch (style) {
            case 'summary':
                return this.generateSummaryMemory(analysis);
            case 'bullets':
                return this.generateBulletMemory(analysis);
            case 'narrative':
                return this.generateNarrativeMemory(analysis);
            case 'keywords':
                return this.generateKeywordMemory(analysis);
            default:
                return this.generateSummaryMemory(analysis);
        }
    },

    analyzeContent(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const words = content.split(/\s+/);
        
        // Extract character names (capitalized words that appear multiple times)
        const nameFrequency = {};
        words.forEach(word => {
            const cleaned = word.replace(/[^a-zA-Z]/g, '');
            if (cleaned && cleaned[0] === cleaned[0].toUpperCase() && cleaned.length > 2) {
                nameFrequency[cleaned] = (nameFrequency[cleaned] || 0) + 1;
            }
        });
        
        const characters = Object.entries(nameFrequency)
            .filter(([name, count]) => count > 2 && !this.isCommonWord(name))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
        
        // Extract locations (words after "in", "at", "to", etc.)
        const locations = this.extractLocations(sentences);
        
        // Extract key events (sentences with action verbs)
        const events = this.extractKeyEvents(sentences);
        
        // Extract relationships
        const relationships = this.extractRelationships(sentences, characters);
        
        return {
            characters,
            locations,
            events,
            relationships,
            sentences
        };
    },

    isCommonWord(word) {
        const common = ['The', 'This', 'That', 'What', 'When', 'Where', 'Who', 'Why', 'How'];
        return common.includes(word);
    },

    extractLocations(sentences) {
        const locations = new Set();
        const locationPreps = ['in', 'at', 'to', 'from', 'near', 'by', 'inside', 'outside'];
        
        sentences.forEach(sentence => {
            const words = sentence.split(/\s+/);
            words.forEach((word, i) => {
                if (locationPreps.includes(word.toLowerCase()) && i + 1 < words.length) {
                    const nextWord = words[i + 1].replace(/[^a-zA-Z]/g, '');
                    if (nextWord && nextWord[0] === nextWord[0].toUpperCase()) {
                        locations.add(nextWord);
                    }
                }
            });
        });
        
        return Array.from(locations).slice(0, 3);
    },

    extractKeyEvents(sentences) {
        const actionVerbs = ['fought', 'discovered', 'found', 'killed', 'saved', 'betrayed', 'revealed', 'attacked', 'defended', 'escaped', 'arrived', 'departed'];
        const events = [];
        
        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();
            if (actionVerbs.some(verb => lower.includes(verb))) {
                events.push(sentence.trim());
            }
        });
        
        return events.slice(0, 5);
    },

    extractRelationships(sentences, characters) {
        const relationships = [];
        const relWords = ['loves', 'hates', 'knows', 'works with', 'fights', 'helps', 'betrays', 'trusts'];
        
        sentences.forEach(sentence => {
            characters.forEach(char1 => {
                characters.forEach(char2 => {
                    if (char1 !== char2 && sentence.includes(char1) && sentence.includes(char2)) {
                        relWords.forEach(rel => {
                            if (sentence.toLowerCase().includes(rel)) {
                                relationships.push(`${char1} ${rel} ${char2}`);
                            }
                        });
                    }
                });
            });
        });
        
        return relationships.slice(0, 3);
    },

    generateSummaryMemory(analysis) {
        let memory = '';
        
        if (analysis.characters.length > 0) {
            memory += `Characters: ${analysis.characters.join(', ')}. `;
        }
        
        if (analysis.locations.length > 0) {
            memory += `Locations: ${analysis.locations.join(', ')}. `;
        }
        
        if (analysis.events.length > 0) {
            memory += `\n\nKey events: `;
            memory += analysis.events.slice(0, 3).join(' ');
        }
        
        if (analysis.relationships.length > 0) {
            memory += `\n\nRelationships: ${analysis.relationships.join('. ')}.`;
        }
        
        return memory || 'No significant information extracted.';
    },

    generateBulletMemory(analysis) {
        let memory = '';
        
        if (analysis.characters.length > 0) {
            memory += 'Characters:\n';
            analysis.characters.forEach(char => {
                memory += `• ${char}\n`;
            });
        }
        
        if (analysis.locations.length > 0) {
            memory += '\nLocations:\n';
            analysis.locations.forEach(loc => {
                memory += `• ${loc}\n`;
            });
        }
        
        if (analysis.events.length > 0) {
            memory += '\nKey Events:\n';
            analysis.events.slice(0, 3).forEach(event => {
                memory += `• ${event}\n`;
            });
        }
        
        return memory || 'No significant information extracted.';
    },

    generateNarrativeMemory(analysis) {
        let memory = 'The story involves ';
        
        if (analysis.characters.length > 0) {
            memory += analysis.characters.slice(0, 3).join(', ');
            if (analysis.locations.length > 0) {
                memory += ` in ${analysis.locations[0]}`;
            }
            memory += '. ';
        }
        
        if (analysis.events.length > 0) {
            memory += analysis.events[0] + ' ';
        }
        
        if (analysis.relationships.length > 0) {
            memory += `\n\n${analysis.relationships[0]}.`;
        }
        
        return memory;
    },

    generateKeywordMemory(analysis) {
        const keywords = [];
        
        // Add characters
        keywords.push(...analysis.characters.map(c => `[${c}]`));
        
        // Add locations
        keywords.push(...analysis.locations.map(l => `@${l}`));
        
        // Extract important words from events
        analysis.events.slice(0, 3).forEach(event => {
            const words = event.split(/\s+/);
            words.forEach(word => {
                const cleaned = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
                if (cleaned.length > 5 && !this.isCommonWord(cleaned)) {
                    keywords.push(`#${cleaned}`);
                }
            });
        });
        
        return keywords.slice(0, 15).join(' ');
    },

    applyMemory(append) {
        console.log(`💾 ${append ? 'Appending' : 'Applying'} memory...`);
        
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        const memory = outputArea?.value;
        
        if (!memory || !memory.trim()) {
            alert('No memory to apply. Please generate memory first.');
            return;
        }
        
        // Get current memory
        const liteMemory = document.getElementById('memorytext');
        let currentMemory = '';
        
        if (liteMemory) {
            currentMemory = liteMemory.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            currentMemory = localsettings.memory;
        }
        
        // Show confirmation dialog for non-append actions
        if (!append && currentMemory && currentMemory.trim()) {
            const confirmMessage = `⚠️ WARNING: This will <span style="color: #ff4444; font-weight: bold;">DELETE</span> your current memory contents and replace them with the generated memory.\n\nCurrent memory length: ${currentMemory.length} characters\nNew memory length: ${memory.length} characters\n\nAre you sure you want to continue?`;
            
            // Create custom confirmation dialog
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: #2a2a2a;
                    border: 2px solid #ff4444;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 500px;
                    box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
                ">
                    <h3 style="
                        color: #ff4444;
                        margin: 0 0 20px 0;
                        font-size: 20px;
                        text-align: center;
                    ">⚠️ Replace Memory Warning</h3>
                    
                    <p style="
                        color: #e0e0e0;
                        line-height: 1.6;
                        margin-bottom: 10px;
                    ">
                        This will <span style="color: #ff4444; font-weight: bold; font-size: 18px;">DELETE</span> your current memory contents and replace them with the generated memory.
                    </p>
                    
                    <div style="
                        background: #1a1a1a;
                        border: 1px solid #444;
                        border-radius: 4px;
                        padding: 15px;
                        margin: 20px 0;
                        font-family: monospace;
                        font-size: 12px;
                    ">
                        <div style="color: #999; margin-bottom: 5px;">Current memory: <span style="color: #ff6666;">${currentMemory.length} characters</span></div>
                        <div style="color: #999;">New memory: <span style="color: #66ff66;">${memory.length} characters</span></div>
                    </div>
                    
                    <p style="
                        color: #ffa500;
                        font-size: 14px;
                        text-align: center;
                        margin: 20px 0;
                    ">
                        Are you sure you want to continue?
                    </p>
                    
                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 25px;
                    ">
                        <button id="klite-cancel-replace" style="
                            flex: 1;
                            padding: 12px;
                            background: #555;
                            border: 1px solid #666;
                            border-radius: 4px;
                            color: white;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#666'" 
                        onmouseout="this.style.backgroundColor='#555'">
                            Cancel
                        </button>
                        <button id="klite-confirm-replace" style="
                            flex: 1;
                            padding: 12px;
                            background: #d9534f;
                            border: 1px solid #c9302c;
                            border-radius: 4px;
                            color: white;
                            font-size: 14px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.backgroundColor='#c9302c'" 
                        onmouseout="this.style.backgroundColor='#d9534f'">
                            Replace Memory
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle button clicks
            document.getElementById('klite-cancel-replace').onclick = () => {
                document.body.removeChild(modal);
            };
            
            document.getElementById('klite-confirm-replace').onclick = () => {
                document.body.removeChild(modal);
                this.performMemoryApplication(memory, append);
            };
            
            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };
        } else {
            // No confirmation needed for append or empty memory
            this.performMemoryApplication(memory, append);
        }
    },

    performMemoryApplication(memory, append) {
        // Get current memory
        const liteMemory = document.getElementById('memorytext');
        let currentMemory = '';
        
        if (liteMemory) {
            currentMemory = liteMemory.value;
        } else if (typeof localsettings !== 'undefined' && localsettings.memory) {
            currentMemory = localsettings.memory;
        }
        
        // Apply or append
        const newMemory = append ? `${currentMemory}\n\n${memory}`.trim() : memory;
        
        // Update Lite's memory field
        if (liteMemory) {
            liteMemory.value = newMemory;
            const event = new Event('input', { bubbles: true });
            liteMemory.dispatchEvent(event);
        }
        
        // Update localsettings
        if (typeof localsettings !== 'undefined') {
            localsettings.memory = newMemory;
        }
        
        // Call confirm_memory if available
        if (typeof confirm_memory === 'function') {
            confirm_memory();
        }
        
        // Visual feedback
        const outputArea = document.getElementById('klite-rpmod-memory-output');
        if (outputArea) {
            outputArea.style.borderColor = '#5cb85c';
            setTimeout(() => {
                outputArea.style.borderColor = '#444';
            }, 1000);
        }
        
        alert(`Memory ${append ? 'appended' : 'applied'} successfully!`);
    },

    // ==================== DICE SYSTEM ====================
    initializeDiceSystem() {
        // Quick dice buttons
        document.querySelectorAll('.klite-rpmod-dice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dice = e.target.dataset.dice;
                this.rollDice(dice);
            });
            
            // Add hover effect
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#444';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#333';
            });
        });
        
        // Custom dice roll
        document.getElementById('klite-rpmod-roll-custom')?.addEventListener('click', () => {
            const input = document.getElementById('klite-rpmod-custom-dice');
            if (input?.value) {
                this.rollDice(input.value);
            }
        });
        
        // Allow Enter key for custom dice
        document.getElementById('klite-rpmod-custom-dice')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.rollDice(e.target.value);
            }
        });
    },

    rollDice(diceString) {
        console.log(`🎲 Rolling ${diceString}`);
        
        const resultDiv = document.getElementById('klite-rpmod-dice-result');
        const totalDiv = document.getElementById('klite-rpmod-dice-total');
        const breakdownDiv = document.getElementById('klite-rpmod-dice-breakdown');
        const animationDiv = document.getElementById('klite-rpmod-dice-animation');
        
        if (!resultDiv) return;
        
        try {
            const result = this.parseDiceRoll(diceString);
            
            // Show result container
            resultDiv.style.display = 'block';
            
            // Animate the roll
            this.animateDiceRoll(result, totalDiv, breakdownDiv, animationDiv);
            
            // Store last roll
            this.lastRoll = result;
            
            const addToChat = document.getElementById('klite-rpmod-dice-to-chat')?.checked;
            if (addToChat && typeof localsettings !== 'undefined') {
                console.log('🎲 Adding dice roll to chat for mode:', localsettings.opmode);
                setTimeout(() => this.addDiceRollToChat(result), 1000);
            }
            
        } catch (error) {
            resultDiv.style.display = 'block';
            totalDiv.textContent = 'Error';
            breakdownDiv.textContent = error.message;
            totalDiv.style.color = '#d9534f';
        }
    },

    animateDiceRoll(result, totalDiv, breakdownDiv, animationDiv) {
        // Clear animation
        animationDiv.innerHTML = '';
        
        // Create dice visuals
        result.rolls.forEach((roll, index) => {
            const die = document.createElement('span');
            die.style.cssText = `
                display: inline-block;
                width: 30px;
                height: 30px;
                line-height: 30px;
                background: #333;
                border: 1px solid #666;
                border-radius: 4px;
                margin: 0 3px;
                text-align: center;
                font-weight: bold;
                color: #4a9eff;
                animation: rollDice 0.5s ease-out ${index * 0.1}s;
            `;
            die.textContent = '?';
            animationDiv.appendChild(die);
            
            // Reveal result after animation
            setTimeout(() => {
                die.textContent = roll;
                if (roll === parseInt(result.formula.match(/d(\d+)/)[1])) {
                    // Critical roll!
                    die.style.background = '#5cb85c';
                    die.style.color = '#fff';
                } else if (roll === 1) {
                    // Critical fail!
                    die.style.background = '#d9534f';
                    die.style.color = '#fff';
                }
            }, 500 + (index * 100));
        });
        
        // Show total after all dice are revealed
        setTimeout(() => {
            totalDiv.textContent = result.total;
            breakdownDiv.textContent = `${result.formula} = ${result.breakdown}`;
            totalDiv.style.color = '#4a9eff';
        }, 500 + (result.rolls.length * 100));
        
        // Add CSS animation
        if (!document.getElementById('dice-animation-style')) {
            const style = document.createElement('style');
            style.id = 'dice-animation-style';
            style.textContent = `
                @keyframes rollDice {
                    0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    },

    parseDiceRoll(diceString) {
        // Extended dice notation: XdY+Z, XdY-Z, XdY*Z, etc.
        const match = diceString.match(/^(\d*)d(\d+)(([+-])(\d+))?$/i);
        
        if (!match) {
            throw new Error('Use format like "2d6+3" or "d20"');
        }
        
        const count = parseInt(match[1] || '1');
        const sides = parseInt(match[2]);
        const modifier = match[3] ? parseInt(match[4] + match[5]) : 0;
        
        if (count > 100) throw new Error('Too many dice (max 100)');
        if (sides > 1000) throw new Error('Too many sides (max 1000)');
        if (count < 1) throw new Error('Need at least 1 die');
        if (sides < 2) throw new Error('Need at least 2 sides');
        
        // Roll the dice
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;
        
        // Build breakdown string
        let breakdown = rolls.join(' + ');
        if (modifier !== 0) {
            breakdown += ` ${modifier >= 0 ? '+' : ''} ${modifier}`;
        }
        
        return {
            formula: diceString,
            rolls: rolls,
            modifier: modifier,
            sum: sum,
            total: total,
            breakdown: breakdown
        };
    },

    addDiceRollToChat(result) {
        console.log('🎲 Adding dice roll to chat...');
        
        // Format dice roll with HTML for better visibility
        const diceMessage = `<div style="
            background: #2d4a7b;
            border: 2px solid #4a9eff;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            color: #ffffff;
        ">
            🎲 <span style="color: #4a9eff;">Dice Roll: ${result.formula}</span><br>
            <span style="font-size: 24px; color: #ffd700;">Result: ${result.total}</span><br>
            <span style="font-size: 14px; color: #ccc;">(${result.breakdown})</span>
        </div>`;
        
        // For instruct mode (opmode 4), we need to add it differently
        const opmode = (typeof localsettings !== 'undefined' && localsettings.opmode) || 3;
        
        if (opmode === 4) {
            // For instruct mode, add as HTML directly
            const gametext = document.getElementById('gametext');
            if (gametext) {
                gametext.innerHTML += diceMessage;
                
                // Scroll to bottom
                gametext.scrollTop = gametext.scrollHeight;
                
                // Also update the array
                if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
                    gametext_arr.push(`\n🎲 Dice Roll: ${result.formula} - Result: ${result.total} (${result.breakdown})\n`);
                }
            }
        } else {
            // For other modes, add to gametext_arr
            if (typeof gametext_arr !== 'undefined' && Array.isArray(gametext_arr)) {
                gametext_arr.push(`\n\n🎲 **Dice Roll: ${result.formula}** - Result: **${result.total}** (${result.breakdown})\n\n`);
                
                if (typeof render_gametext === 'function') {
                    render_gametext();
                }
            }
        }
        
        // Force scroll on both displays
        setTimeout(() => {
            const gametext = document.getElementById('gametext');
            const chatDisplay = document.getElementById('klite-rpmod-chat-display');
            
            if (gametext) {
                gametext.scrollTop = gametext.scrollHeight;
            }
            
            if (chatDisplay) {
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
            }
        }, 100);
    },

    // ==================== AUTO-REGENERATE ====================
    initializeAutoRegenerate() {
        const toggle = document.getElementById('klite-rpmod-auto-regen-toggle');
        const delayInput = document.getElementById('klite-rpmod-auto-regen-delay');
        const maxInput = document.getElementById('klite-rpmod-auto-regen-max');
        const status = document.getElementById('klite-rpmod-auto-regen-status');
        
        // State tracking
        this.autoRegenerateState = {
            enabled: false,
            retryCount: 0,
            maxRetries: 3,
            lastMessageHash: '',
            keywords: [],
            keywordThreshold: 3,
            keywordCaseSensitive: false
        };
        
        toggle?.addEventListener('change', (e) => {
            this.autoRegenerateState.enabled = e.target.checked;
            
            if (this.autoRegenerateState.enabled) {
                this.startAutoRegenerate();
                status.textContent = '✓ Auto-regenerate is active';
                status.style.color = '#5cb85c';
            } else {
                this.stopAutoRegenerate();
                status.textContent = 'Auto-regenerate is disabled';
                status.style.color = '#666';
            }
        });
        
        delayInput?.addEventListener('change', () => {
            if (this.autoRegenerateState.enabled) {
                this.stopAutoRegenerate();
                this.startAutoRegenerate();
            }
        });
        
        maxInput?.addEventListener('change', (e) => {
            this.autoRegenerateState.maxRetries = parseInt(e.target.value);
        });

        // Keyword input handler
        const keywordTextarea = document.getElementById('klite-rpmod-regen-keywords');
        keywordTextarea?.addEventListener('input', (e) => {
            const keywords = e.target.value
                .split('\n')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            this.autoRegenerateState.keywords = keywords;
            
            console.log(`🔄 Updated keywords: ${keywords.length} keywords set`);
        });

        // Threshold handler
        const thresholdInput = document.getElementById('klite-rpmod-keyword-threshold');
        thresholdInput?.addEventListener('change', (e) => {
            this.autoRegenerateState.keywordThreshold = parseInt(e.target.value) || 1;
        });

        // Case sensitivity handler
        const caseCheckbox = document.getElementById('klite-rpmod-keyword-case');
        caseCheckbox?.addEventListener('change', (e) => {
            this.autoRegenerateState.keywordCaseSensitive = e.target.checked;
        });
    },

    startAutoRegenerate() {
        const delayInput = document.getElementById('klite-rpmod-auto-regen-delay');
        const delay = parseInt(delayInput?.value || '3000');
        
        console.log(`🔄 Starting auto-regenerate with ${delay}ms delay`);
        
        // Clear any existing interval
        this.stopAutoRegenerate();
        
        // Reset retry count
        this.autoRegenerateState.retryCount = 0;
        
        this.autoRegenerateInterval = setInterval(() => {
            this.checkAndRegenerate();
        }, delay);
    },

    stopAutoRegenerate() {
        if (this.autoRegenerateInterval) {
            clearInterval(this.autoRegenerateInterval);
            this.autoRegenerateInterval = null;
        }
    },

    checkAndRegenerate() {
        // Check if we should regenerate
        if (!this.shouldRegenerate()) {
            return;
        }
        
        // Check retry limit
        if (this.autoRegenerateState.retryCount >= this.autoRegenerateState.maxRetries) {
            console.log('🔄 Max retries reached, stopping auto-regenerate');
            this.stopAutoRegenerate();
            
            const status = document.getElementById('klite-rpmod-auto-regen-status');
            if (status) {
                status.textContent = '⚠️ Max retries reached';
                status.style.color = '#f0ad4e';
            }
            return;
        }
        
        console.log(`🔄 Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);
        
        // Increment retry count
        this.autoRegenerateState.retryCount++;
        
        // Update status
        const status = document.getElementById('klite-rpmod-auto-regen-status');
        if (status) {
            status.textContent = `🔄 Regenerating... (${this.autoRegenerateState.retryCount}/${this.autoRegenerateState.maxRetries})`;
            status.style.color = '#5bc0de';
        }
        
        // Call Lite's retry function
        if (typeof btn_retry === 'function') {
            btn_retry();
        }
    },

    shouldRegenerate() {
        // Check if not currently generating
        const isGenerating = document.getElementById('input_text')?.disabled === true;
        if (isGenerating) return false;
        
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
        const shortCheck = document.getElementById('klite-rpmod-regen-short')?.checked;
        const incompleteCheck = document.getElementById('klite-rpmod-regen-incomplete')?.checked;
        const errorCheck = document.getElementById('klite-rpmod-regen-error')?.checked;
        
        // Check short messages
        if (shortCheck && messageText.length < 50) {
            console.log('🔄 Triggering regenerate: Short message');
            return true;
        }
        
        // Check incomplete sentences
        if (incompleteCheck) {
            const lastChar = messageText.trim().slice(-1);
            if (!['.', '!', '?', '"', '\'', '"'].includes(lastChar)) {
                console.log('🔄 Triggering regenerate: Incomplete sentence');
                return true;
            }
        }
        
        // Check error responses
        if (errorCheck && (messageText.includes('Error:') || messageText.includes('error'))) {
            console.log('🔄 Triggering regenerate: Error detected');
            return true;
        }
        
        // NEW: Check keyword triggers
        if (this.autoRegenerateState.keywords.length > 0) {
            const keywordMatches = this.checkKeywordTriggers(messageText);
            if (keywordMatches >= this.autoRegenerateState.keywordThreshold) {
                console.log(`🔄 Triggering regenerate: ${keywordMatches} keywords matched (threshold: ${this.autoRegenerateState.keywordThreshold})`);
                return true;
            }
        }
        
        return false;
    },

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
    },

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    },

    // ==================== EXPORT TOOLS ====================
    initializeExportTools() {
        document.getElementById('klite-rpmod-export-markdown')?.addEventListener('click', () => {
            this.exportAs('markdown');
        });

        document.getElementById('klite-rpmod-export-json')?.addEventListener('click', () => {
            this.exportAs('json');
        });

        document.getElementById('klite-rpmod-export-html')?.addEventListener('click', () => {
            this.exportAs('html');
        });

        document.getElementById('klite-rpmod-export-epub')?.addEventListener('click', () => {
            this.exportAs('epub');
        });
    },

    exportAs(format) {
        console.log(`📄 Exporting as ${format}...`);
        
        if (typeof gametext_arr === 'undefined' || !Array.isArray(gametext_arr)) {
            alert('No story content to export.');
            return;
        }
        
        // Get export options
        const includeMetadata = document.getElementById('klite-rpmod-export-metadata')?.checked;
        const includeWorldInfo = document.getElementById('klite-rpmod-export-worldinfo')?.checked;
        const formatDialogue = document.getElementById('klite-rpmod-export-format')?.checked;
        
        const exportData = this.gatherExportData(includeMetadata, includeWorldInfo);
        
        switch (format) {
            case 'markdown':
                this.exportAsMarkdown(exportData, formatDialogue);
                break;
            case 'json':
                this.exportAsJSON(exportData);
                break;
            case 'html':
                this.exportAsHTML(exportData, formatDialogue);
                break;
            case 'epub':
                this.exportAsEPUB(exportData, formatDialogue);
                break;
        }
    },

    gatherExportData(includeMetadata, includeWorldInfo) {
        const data = {
            metadata: {},
            settings: {},
            worldinfo: [],
            messages: [],
            timestamp: new Date().toISOString()
        };
        
        // Messages
        data.messages = gametext_arr.filter(msg => msg && msg.trim());
        
        if (includeMetadata && typeof localsettings !== 'undefined') {
            data.metadata = {
                title: localsettings.chatname || 'Untitled Story',
                model: localsettings.modelname || 'Unknown',
                mode: this.getModeName(localsettings.opmode),
                created: data.timestamp,
                messageCount: data.messages.length,
                wordCount: data.messages.join(' ').split(/\s+/).length,
                characterCount: data.messages.join('').length
            };
            
            data.settings = {
                memory: localsettings.memory || '',
                authornote: localsettings.anotetext || '',
                temperature: localsettings.temperature || 1,
                rep_pen: localsettings.rep_pen || 1,
                max_length: localsettings.max_length || 80,
                max_context: localsettings.max_context_length || 8192
            };
        }
        
        if (includeWorldInfo && typeof current_wi !== 'undefined' && Array.isArray(current_wi)) {
            data.worldinfo = current_wi.filter(wi => wi.key || wi.content).map(wi => ({
                key: wi.key || '',
                content: wi.content || '',
                comment: wi.comment || '',
                probability: wi.probability || 100,
                selective: wi.selective || false,
                constant: wi.constant || false
            }));
        }
        
        return data;
    },

    getModeName(mode) {
        switch (mode) {
            case 1: return 'Story Mode';
            case 2: return 'Adventure Mode';
            case 3: return 'Chat Mode';
            case 4: return 'Instruct Mode';
            default: return 'Unknown Mode';
        }
    },

    exportAsMarkdown(data, formatDialogue) {
        let markdown = '';
        
        // Title and metadata
        if (data.metadata.title) {
            markdown += `# ${data.metadata.title}\n\n`;
        }
        
        if (data.metadata) {
            markdown += '## Metadata\n\n';
            markdown += `- **Created:** ${new Date(data.metadata.created).toLocaleString()}\n`;
            markdown += `- **Model:** ${data.metadata.model}\n`;
            markdown += `- **Mode:** ${data.metadata.mode}\n`;
            markdown += `- **Word Count:** ${data.metadata.wordCount.toLocaleString()}\n`;
            markdown += `- **Messages:** ${data.metadata.messageCount}\n\n`;
        }
        
        if (data.settings.memory) {
            markdown += '## Memory\n\n';
            markdown += `> ${data.settings.memory.replace(/\n/g, '\n> ')}\n\n`;
        }
        
        if (data.worldinfo.length > 0) {
            markdown += '## World Info\n\n';
            data.worldinfo.forEach(wi => {
                markdown += `### ${wi.key}\n\n`;
                markdown += `${wi.content}\n\n`;
            });
        }
        
        // Story content
        markdown += '## Story\n\n';
        
        if (formatDialogue) {
            data.messages.forEach((msg, index) => {
                const speaker = index % 2 === 0 ? '**You**' : '**AI**';
                markdown += `${speaker}: ${msg}\n\n`;
            });
        } else {
            data.messages.forEach(msg => {
                markdown += `${msg}\n\n`;
            });
        }
        
        // Download
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.md`;
        this.downloadFile(filename, markdown, 'text/markdown');
    },

    exportAsJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.json`;
        this.downloadFile(filename, json, 'application/json');
    },

    exportAsHTML(data, formatDialogue) {
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.metadata.title || 'Story Export'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        .metadata {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .memory {
            background: #e8f4f8;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin-bottom: 30px;
        }
        .worldinfo {
            background: #f0f8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
        }
        .user {
            background: #f0f0f0;
            border-left: 4px solid #666;
        }
        .ai {
            background: #e8f4ff;
            border-left: 4px solid #3498db;
        }
        .speaker {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <h1>${data.metadata.title || 'Story Export'}</h1>
`;
        
        if (data.metadata) {
            html += `<div class="metadata">
                <h2>Story Information</h2>
                <p><strong>Created:</strong> ${new Date(data.metadata.created).toLocaleString()}</p>
                <p><strong>Model:</strong> ${data.metadata.model}</p>
                <p><strong>Mode:</strong> ${data.metadata.mode}</p>
                <p><strong>Word Count:</strong> ${data.metadata.wordCount.toLocaleString()}</p>
                <p><strong>Messages:</strong> ${data.metadata.messageCount}</p>
            </div>`;
        }
        
        if (data.settings.memory) {
            html += `<div class="memory">
                <h2>Memory</h2>
                <p>${this.escapeHtml(data.settings.memory).replace(/\n/g, '<br>')}</p>
            </div>`;
        }
        
        if (data.worldinfo.length > 0) {
            html += '<h2>World Info</h2>';
            data.worldinfo.forEach(wi => {
                html += `<div class="worldinfo">
                    <h3>${this.escapeHtml(wi.key)}</h3>
                    <p>${this.escapeHtml(wi.content).replace(/\n/g, '<br>')}</p>
                </div>`;
            });
        }
        
        html += '<h2>Story</h2>';
        
        if (formatDialogue) {
            data.messages.forEach((msg, index) => {
                const isUser = index % 2 === 0;
                html += `<div class="message ${isUser ? 'user' : 'ai'}">
                    <div class="speaker">${isUser ? 'You' : 'AI'}</div>
                    <div>${this.escapeHtml(msg).replace(/\n/g, '<br>')}</div>
                </div>`;
            });
        } else {
            html += '<div class="story-content">';
            data.messages.forEach(msg => {
                html += `<p>${this.escapeHtml(msg).replace(/\n/g, '<br>')}</p>`;
            });
            html += '</div>';
        }
        
        html += '</body></html>';
        
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.html`;
        this.downloadFile(filename, html, 'text/html');
    },

    exportAsEPUB(data, formatDialogue) {
        // EPUB is more complex, so we'll create a simplified version
        alert('EPUB export is a preview feature. The file will be a simplified EPUB-like HTML that can be converted using tools like Calibre.');
        
        // Create EPUB-like structure
        const chapters = this.splitIntoChapters(data.messages, 50); // 50 messages per chapter
        
        let epub = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${data.metadata.title || 'Story'}</title>
    <meta charset="UTF-8"/>
    <style>
        body { font-family: serif; line-height: 1.6; }
        h1 { text-align: center; page-break-before: always; }
        h2 { text-align: center; }
        p { text-indent: 1.5em; margin: 0 0 0.5em 0; }
        .dialogue { text-indent: 0; margin: 1em 0; }
        .speaker { font-weight: bold; }
    </style>
</head>
<body>
    <h1>${data.metadata.title || 'Story'}</h1>
    <p style="text-align: center;">By ${data.metadata.model || 'AI'}</p>
    <p style="text-align: center;">${new Date(data.metadata.created).toLocaleDateString()}</p>
`;
        
        chapters.forEach((chapter, index) => {
            epub += `<h2>Chapter ${index + 1}</h2>`;
            
            if (formatDialogue) {
                chapter.forEach((msg, msgIndex) => {
                    const isUser = msgIndex % 2 === 0;
                    epub += `<p class="dialogue"><span class="speaker">${isUser ? 'You' : 'AI'}:</span> ${this.escapeHtml(msg)}</p>`;
                });
            } else {
                chapter.forEach(msg => {
                    epub += `<p>${this.escapeHtml(msg)}</p>`;
                });
            }
        });
        
        epub += '</body></html>';
        
        const filename = `${data.metadata.title || 'story'}-${new Date().toISOString().split('T')[0]}.xhtml`;
        this.downloadFile(filename, epub, 'application/xhtml+xml');
    },

    splitIntoChapters(messages, messagesPerChapter) {
        const chapters = [];
        for (let i = 0; i < messages.length; i += messagesPerChapter) {
            chapters.push(messages.slice(i, i + messagesPerChapter));
        }
        return chapters;
    },

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ==================== UTILITY FUNCTIONS ====================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    cleanup() {
        this.stopContextAutoRefresh();

        // Stop auto-regenerate if active
        this.stopAutoRegenerate();
        
        // Close analysis window if open
        if (this.analysisWindow && !this.analysisWindow.closed) {
            this.analysisWindow.close();
        }
    }
};

console.log('✅ KLITE TOOLS Panel loaded');