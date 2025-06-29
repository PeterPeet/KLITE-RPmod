// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - PLAY Panel for Story Mode
// Full implementation with timeline and generation control
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.PLAY_STORY = {
    collapsedSections: new Set(),
    chapters: [],
    currentChapter: null,
    
    load(container) {
        container.innerHTML = `
        <!-- PLAY Panel (Story Mode) -->
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content">
                <div class="klite-rpmod-section-content">
                    <h3>Timeline / Index</h3>
                    <div id="klite-rpmod-timeline" class="timeline" style="min-height: 200px; padding-bottom: 15px; max-height: 300px; overflow-y: auto;">
                        <!-- Timeline items will be populated here -->
                    </div>
                    <button id="klite-rpmod-add-chapter" class="klite-rpmod-button">Add Chapter Marker</button>
                </div>
                
                <div class="klite-rpmod-section-content">
                    <h3>Generation Control</h3>
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        
                        <div class="klite-rpmod-preset-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px;">
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="precise">Precise</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn active" data-preset="balanced">KoboldAI</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="creative">Creative</button>
                            <button class="klite-rpmod-button klite-rpmod-preset-btn" data-preset="chaotic">Chaotic</button>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Creativity
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">temp: <span id="klite-rpmod-temp-val">0.75</span> | top_p: <span id="klite-rpmod-topp-val">0.925</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-creativity-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Deterministic</span>
                                <span style="font-size: 10px; color: #888;">Chaotic</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Focus
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">top_k: <span id="klite-rpmod-topk-val">55</span> | min_p: <span id="klite-rpmod-minp-val">0.05</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-focus-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Narrow</span>
                                <span style="font-size: 10px; color: #888;">Broad</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-size: 12px; color: #ccc; display: flex; align-items: center; gap: 4px;">
                                    Repetition
                                </span>
                                <span style="font-size: 8px; color: #999; font-family: monospace;">pen: <span id="klite-rpmod-rep-val">1.2</span> | rng: <span id="klite-rpmod-rng-val">1152</span> | slp: <span id="klite-rpmod-slp-val">0.5</span></span>
                            </div>
                            <input type="range" min="0" max="100" value="50" class="klite-rpmod-slider" id="klite-rpmod-repetition-slider" style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 10px; color: #888;">Allow</span>
                                <span style="font-size: 10px; color: #888;">Punish</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.initEventListeners(container);
        this.loadSavedStates();
        this.initializePresets();
        this.initializeSliders();
        this.initializeTimeline();
    },

    initEventListeners(container) {
        // Section collapse handlers
        container.addEventListener('click', (e) => {
            const header = e.target.closest('.klite-rpmod-section-header');
            if (header) {
                const section = header.closest('.klite-rpmod-section');
                section.classList.toggle('collapsed');
                
                // Update arrow
                const arrow = header.querySelector('span:last-child');
                arrow.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
    },

    async loadSavedStates() {
        console.log('Loading Story panel states...');
        
        // Load chapters from KoboldAI database or localStorage
        await this.loadChaptersFromLiteDB();
        this.updateTimeline();
        
        // Sync generation control values from Lite settings if available
        this.syncFromLiteSettings();
    },
    
    syncFromLiteSettings() {
        if (typeof localsettings === 'undefined') return;
        
        // Sync creativity (temperature)
        if (localsettings.temperature !== undefined) {
            const creativitySlider = document.getElementById('klite-rpmod-creativity-slider');
            const tempValue = ((localsettings.temperature - 0.5) / 1.5) * 100;
            creativitySlider.value = Math.max(0, Math.min(100, tempValue));
            this.updateCreativityDisplay(creativitySlider.value);
        }
        
        // Sync focus (top_k)
        if (localsettings.top_k !== undefined) {
            const focusSlider = document.getElementById('klite-rpmod-focus-slider');
            const topkValue = ((localsettings.top_k - 10) / 90) * 100;
            focusSlider.value = Math.max(0, Math.min(100, topkValue));
            this.updateFocusDisplay(focusSlider.value);
        }
        
        // Sync repetition (rep_pen)
        if (localsettings.rep_pen !== undefined) {
            const repetitionSlider = document.getElementById('klite-rpmod-repetition-slider');
            const repValue = ((localsettings.rep_pen - 1.0) / 0.5) * 100;
            repetitionSlider.value = Math.max(0, Math.min(100, repValue));
            this.updateRepetitionDisplay(repetitionSlider.value);
        }
    },
    
    async saveChaptersToLiteDB() {
        // Save chapters data to KoboldAI database using a prefixed key
        if (typeof localforage !== 'undefined') {
            try {
                await localforage.setItem('KLITERPmodchapters', this.chapters);
                console.log('Chapters saved to Lite DB');
            } catch (error) {
                console.error('Error saving chapters to Lite DB:', error);
                // Fallback to localStorage
                localStorage.setItem('klite-rpmod-chapters', JSON.stringify(this.chapters));
            }
        } else {
            // If localforage not available, use localStorage
            localStorage.setItem('klite-rpmod-chapters', JSON.stringify(this.chapters));
        }
    },
    
    async loadChaptersFromLiteDB() {
        // Try to load from KoboldAI database first
        if (typeof localforage !== 'undefined') {
            try {
                const chapters = await localforage.getItem('KLITERPmodchapters');
                if (chapters && Array.isArray(chapters)) {
                    this.chapters = chapters;
                    console.log('Chapters loaded from Lite DB:', chapters.length);
                    return true;
                }
            } catch (error) {
                console.error('Error loading chapters from Lite DB:', error);
            }
        }
        
        // Fallback to localStorage
        const savedChapters = localStorage.getItem('klite-rpmod-chapters');
        if (savedChapters) {
            try {
                this.chapters = JSON.parse(savedChapters);
                console.log('Chapters loaded from localStorage:', this.chapters.length);
                return true;
            } catch (e) {
                console.error('Error parsing saved chapters:', e);
            }
        }
        
        return false;
    },
    
    initializeTimeline() {
        const addChapterBtn = document.getElementById('klite-rpmod-add-chapter');
        
        addChapterBtn?.addEventListener('click', () => {
            this.addChapterMarker();
        });
        
        // Update timeline display
        this.updateTimeline();
    },
    
    async addChapterMarker() {
        // Get current word count from chat display
        const wordCount = this.getCurrentWordCount();
        
        // Get chapter title from user
        const title = prompt('Enter chapter title:', `Chapter ${this.chapters.length + 1}`);
        if (!title) return;
        
        // Create new chapter with unique ID
        const newChapter = {
            id: Date.now(), // Simple unique ID
            chapterNumber: this.chapters.length + 1,
            title: title,
            wordCount: wordCount,
            position: this.getCurrentScrollPosition(),
            timestamp: Date.now(),
            storyId: 'rpmod-story'
        };
        
        // Add to chapters array
        this.chapters.push(newChapter);
        
        // Save to database
        await this.saveChaptersToLiteDB();
        
        // Update timeline display
        this.updateTimeline();
        console.log('Chapter added:', newChapter);
    },
    
    getCurrentWordCount() {
        // Count words in the chat display
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay) {
            const text = chatDisplay.innerText || chatDisplay.textContent || '';
            const words = text.trim().split(/\s+/).filter(word => word.length > 0);
            return words.length;
        }
        
        return 0;
    },
    
    getCurrentScrollPosition() {
        // Get current scroll position of chat display
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay) {
            return chatDisplay.scrollTop;
        }
        
        return 0;
    },
    
    updateTimeline() {
        const timeline = document.getElementById('klite-rpmod-timeline');
        if (!timeline) return;
        
        if (this.chapters.length === 0) {
            timeline.innerHTML = `
                <div style="text-align: center; color: #999; font-size: 12px; padding: 20px;">
                    No chapters added yet. Click "Add Chapter Marker" to create your first chapter.
                </div>
            `;
            return;
        }
        
        timeline.innerHTML = '';
        
        this.chapters.forEach((chapter, index) => {
            const isActive = index === this.chapters.length - 1;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'timeline-item';
            itemDiv.style.cssText = `
                padding: 8px;
                margin-bottom: 4px;
                cursor: pointer;
                border-radius: 4px;
                transition: background 0.2s;
                ${!isActive ? 'opacity: 0.7;' : ''}
            `;
            
            itemDiv.innerHTML = `
                <span style="color: #e0e0e0;"><strong>Chapter ${chapter.chapterNumber}:</strong> ${chapter.title}</span>
                <div style="font-size: 11px; color: #999;">${chapter.wordCount.toLocaleString()} words</div>
            `;
            
            // Add click handler to scroll to chapter position
            itemDiv.addEventListener('click', () => {
                this.scrollToChapter(chapter);
            });
            
            // Hover effect
            itemDiv.addEventListener('mouseenter', () => {
                itemDiv.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            itemDiv.addEventListener('mouseleave', () => {
                itemDiv.style.background = '';
            });
            
            timeline.appendChild(itemDiv);
        });
    },
    
    scrollToChapter(chapter) {
        const chatDisplay = document.getElementById('klite-rpmod-chat-display') || 
                          document.getElementById('gametext');
        
        if (chatDisplay && chapter.position !== undefined) {
            chatDisplay.scrollTop = chapter.position;
            
            // Flash the chat display to indicate navigation
            chatDisplay.style.transition = 'opacity 0.2s';
            chatDisplay.style.opacity = '0.7';
            setTimeout(() => {
                chatDisplay.style.opacity = '1';
            }, 200);
        }
    },
    
    initializePresets() {
        const presetButtons = document.querySelectorAll('.klite-rpmod-preset-btn');
        
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
    },
    
    applyPreset(preset) {
        const presets = {
            precise: {
                creativity: 20,  // LOW
                focus: 20,      // Narrow
                repetition: 80  // Prevent
            },
            balanced: {
                creativity: 16,  // Med
                focus: 100,      // Med
                repetition: 19  // Med
            },
            creative: {
                creativity: 80,  // High
                focus: 60,      // Med-Broad
                repetition: 40  // Med-Prevent
            },
            chaotic: {
                creativity: 95,  // Very High
                focus: 90,      // Broad
                repetition: 10  // Allow
            }
        };
        
        const settings = presets[preset];
        if (settings) {
            document.getElementById('klite-rpmod-creativity-slider').value = settings.creativity;
            document.getElementById('klite-rpmod-focus-slider').value = settings.focus;
            document.getElementById('klite-rpmod-repetition-slider').value = settings.repetition;
            
            this.updateCreativityDisplay(settings.creativity);
            this.updateFocusDisplay(settings.focus);
            this.updateRepetitionDisplay(settings.repetition);
            
            this.applyCreativitySettings(settings.creativity);
            this.applyFocusSettings(settings.focus);
            this.applyRepetitionSettings(settings.repetition);
        }
    },
    
    initializeSliders() {
        // Creativity slider
        document.getElementById('klite-rpmod-creativity-slider')?.addEventListener('input', (e) => {
            this.updateCreativityDisplay(e.target.value);
            this.applyCreativitySettings(e.target.value);
        });
        
        // Focus slider
        document.getElementById('klite-rpmod-focus-slider')?.addEventListener('input', (e) => {
            this.updateFocusDisplay(e.target.value);
            this.applyFocusSettings(e.target.value);
        });
        
        // Repetition slider
        document.getElementById('klite-rpmod-repetition-slider')?.addEventListener('input', (e) => {
            this.updateRepetitionDisplay(e.target.value);
            this.applyRepetitionSettings(e.target.value);
        });
    },
    
    updateCreativityDisplay(value) {
        const temp = 0.5 + (value / 100) * 1.5;
        const topP = 0.85 + (value / 100) * 0.14;
        
        document.getElementById('klite-rpmod-temp-val').textContent = temp.toFixed(2);
        document.getElementById('klite-rpmod-topp-val').textContent = topP.toFixed(3);
    },
    
    updateFocusDisplay(value) {
        const topK = Math.round(10 + (value / 100) * 90);
        const minP = 0.01 + (value / 100) * 0.09;
        
        document.getElementById('klite-rpmod-topk-val').textContent = topK;
        document.getElementById('klite-rpmod-minp-val').textContent = minP.toFixed(2);
    },
    
    updateRepetitionDisplay(value) {
        const repPen = 1.0 + (value / 100) * 0.5;
        const repRange = Math.round(256 + (value / 100) * 1792);
        const repSlope = 0.1 + (value / 100) * 0.9;
        
        document.getElementById('klite-rpmod-rep-val').textContent = repPen.toFixed(1);
        document.getElementById('klite-rpmod-rng-val').textContent = repRange;
        document.getElementById('klite-rpmod-slp-val').textContent = repSlope.toFixed(1);
    },
    
    applyCreativitySettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.temperature = 0.5 + (value / 100) * 1.5;
            localsettings.top_p = 0.85 + (value / 100) * 0.14;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    },
    
    applyFocusSettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.top_k = Math.round(10 + (value / 100) * 90);
            localsettings.min_p = 0.01 + (value / 100) * 0.09;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    },
    
    applyRepetitionSettings(value) {
        if (typeof localsettings !== 'undefined') {
            localsettings.rep_pen = 1.0 + (value / 100) * 0.5;
            localsettings.rep_pen_range = Math.round(256 + (value / 100) * 1792);
            localsettings.rep_pen_slope = 0.1 + (value / 100) * 0.9;
            
            if (typeof save_settings === 'function') {
                save_settings();
            }
        }
    }
};