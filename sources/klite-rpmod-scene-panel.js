// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - SCENE Panel Implementation
// Visual scene and atmosphere controls - Updated
// =============================================

window.KLITE_RPMod_Panels.SCENE = {
    // Scene data for auto-generation
    sceneData: {
        locations: {
            // Natural Environments
            'Forest': 'You are in a dense forest',
            'Plains': 'You stand in vast open plains',
            'Desert': 'You are in an arid desert',
            'Mountains': 'You are high in the mountains',
            'Beach': 'You are on a sandy beach',
            'Swamp': 'You are in a murky swamp',
            'Tundra': 'You are in a frozen tundra',
            'Jungle': 'You are deep in a tropical jungle',
            'Cave': 'You are inside a dark cave',
            'River': 'You are by a flowing river',
            'Lake': 'You stand beside a serene lake',
            'Ocean': 'You are near the vast ocean',
            'Valley': 'You are in a peaceful valley',
            'Cliff': 'You stand atop a steep cliff',
            
            // Urban/Rural
            'City': 'You are in a bustling city',
            'Town': 'You are in a modest town',
            'Village': 'You are in a small village',
            'Market': 'You are in a crowded marketplace',
            'Harbor': 'You are at a busy harbor',
            'Farm': 'You are on a rural farm',
            'Ranch': 'You are at a sprawling ranch',
            
            // Buildings/Structures
            'Castle': 'You are inside an ancient castle',
            'Tower': 'You are in a tall tower',
            'Temple': 'You are within a sacred temple',
            'Church': 'You are inside a quiet church',
            'Mansion': 'You are in an opulent mansion',
            'Cottage': 'You are in a cozy cottage',
            'Inn': 'You are inside a warm inn',
            'Tavern': 'You are in a lively tavern',
            'Library': 'You are in a vast library',
            'Museum': 'You are in a grand museum',
            'Prison': 'You are in a grim prison',
            'Hospital': 'You are in a sterile hospital',
            'School': 'You are in an academic institution',
            'Stadium': 'You are in a massive stadium',
            'Arena': 'You are in a combat arena',
            
            // Industrial/Modern
            'Factory': 'You are in an industrial factory',
            'Warehouse': 'You are inside a large warehouse',
            'Laboratory': 'You are in a high-tech laboratory',
            'Oil Rig': 'You are on an offshore oil rig',
            'Space Station': 'You are aboard a space station',
            'Spaceship': 'You are inside a spaceship',
            'Subway': 'You are in an underground subway',
            'Airport': 'You are at a busy airport',
            'Train Station': 'You are at a train station',
            
            // Specific/Named Places
            'Adventurers Guild': 'You are in the Adventurers Guild hall',
            'Thieves Guild': 'You are in the secretive Thieves Guild',
            'Mage Tower': 'You are in the mystical Mage Tower',
            'Royal Palace': 'You are in the grand Royal Palace',
            'Underground Bunker': 'You are in a fortified underground bunker',
            'Ancient Ruins': 'You are exploring ancient ruins',
            'Graveyard': 'You are in a somber graveyard',
            'Pharmacy': 'You are in a well-stocked pharmacy',
            'Police Station': 'You are at the police station',
            'Fire Station': 'You are at the fire station'
        },
        
        times: {
            'early dawn': 'It is early dawn',
            'dawn': 'It is dawn',
            'late dawn': 'It is late dawn',
            'early morning': 'It is early morning',
            'morning': 'It is morning',
            'late morning': 'It is late morning',
            'early noon': 'It is approaching noon',
            'noon': 'It is noon',
            'late noon': 'It is past noon',
            'early afternoon': 'It is early afternoon',
            'afternoon': 'It is afternoon',
            'late afternoon': 'It is late afternoon',
            'early evening': 'It is early evening',
            'evening': 'It is evening',
            'late evening': 'It is late evening',
            'early night': 'It is early night',
            'night': 'It is night',
            'late night': 'It is late night',
            'midnight': 'It is midnight',
            'witching hour': 'It is the witching hour'
        },
        
        weather: {
            'clear': 'The weather is clear',
            'cloudy': 'Clouds cover the sky',
            'overcast': 'The sky is completely overcast',
            'light rain': 'Light rain falls from the sky',
            'rain': 'Rain pours down steadily',
            'heavy rain': 'Heavy rain drenches everything',
            'drizzle': 'A fine drizzle mists the air',
            'storm': 'A fierce storm rages',
            'thunderstorm': 'Thunder and lightning fill the sky',
            'snow': 'Snow falls gently',
            'heavy snow': 'Heavy snow blankets everything',
            'blizzard': 'A blizzard obscures all vision',
            'hail': 'Hail pelts down dangerously',
            'fog': 'Dense fog limits visibility',
            'mist': 'A light mist hangs in the air',
            'windy': 'Strong winds blow through the area',
            'hurricane': 'A hurricane devastates the area',
            'tornado': 'A tornado threatens nearby',
            'extreme heat': 'The heat is oppressive and extreme',
            'extreme cold': 'The cold is bitter and extreme',
            'scorching sun': 'The sun scorches everything it touches',
            'shadowed': '' // No weather sentence when in shadow
        },
        
        moods: {
            'neutral': 'The atmosphere is neutral',
            'tense': 'Tension fills the air',
            'mysterious': 'Everything feels mysterious',
            'cheerful': 'The mood is bright and cheerful',
            'ominous': 'An ominous feeling pervades',
            'peaceful': 'A sense of peace surrounds you',
            'chaotic': 'Chaos reigns all around',
            'romantic': 'Romance is in the air',
            'melancholic': 'A deep melancholy settles over everything',
            'eerie': 'An eerie silence hangs heavy',
            'festive': 'A festive atmosphere prevails',
            'solemn': 'The mood is solemn and serious',
            'hostile': 'Hostility emanates from every corner',
            'magical': 'Magic crackles in the atmosphere'
        }
    },

    load(container, panel) {
        container.innerHTML = `
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <!-- Scene Setup -->
                <div class="klite-rpmod-control-group">
                    <h3>Quick Scene Setup</h3>
                    ${this.getSceneHTML()}
                    <textarea id="klite-rpmod-scene-description" placeholder="Scene description..." 
                        style="width: 100%; min-height: 100px; margin-top: 8px; background: rgba(0,0,0,0.3); 
                               border: 1px solid #444; color: #e0e0e0; padding: 8px; border-radius: 4px; resize: vertical;">
                    </textarea>
                    <button class="klite-rpmod-button" id="klite-rpmod-apply-scene" style="width: 100%; margin-top: 8px;">
                        Append Scene to Memory
                    </button>
                    <label style="display: flex; align-items: center; color: #999; font-size: 10px; margin-top: 8px;">
                        <input type="checkbox" id="klite-rpmod-scene-append-to-context" style="margin-right: 5px;">
                        Append scene to context (doesn't appear in Chat)
                    </label>
                </div>

                <!-- Image Generation Controls -->
                <div class="klite-rpmod-control-group">
                    <h3>Image Generation 🎨</h3>

                    <!-- Status Display -->
                    <div style="margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 4px;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">Image Generation Status:</div>
                        <div style="color: #999;">
                            <label style="color: #999; font-size: 12px;">Mode: </label><span id="klite-rpmod-scene-imggen-mode-status" style="color: #999;">---</span>
                        </div>
                        <div style="color: #999;">
                            <label style="color: #999; font-size: 12px;">Model: </label><span id="klite-rpmod-scene-imggen-model-status" style="color: #999;">---</span>
                        </div>
                    </div>
                    
                    <!-- Direct Lite Settings Integration -->
                    <div style="margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 4px;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">SYNC WITH LITE SETTINGS:</div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                            <label style="color: #999; font-size: 12px;">Auto-generate: </label>
                            <select id="klite-rpmod-sync-autogen" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px; font-size: 12px;">
                                <option value="0">Disabled</option>
                                <option value="1">Immersive Mode</option>
                                <option value="2">All Messages</option>
                                <option value="3">User Messages Only</option>
                                <option value="4">Non-User Messages Only</option>
                            </select>
                        </div>
                        
                        <label style="display: flex; align-items: center; color: #999; font-size: 10px;">
                            <input type="checkbox" id="klite-rpmod-sync-detect" style="margin-right: 5px;">
                            Detect ImgGen Instructions
                        </label>
                    </div>
                    
                    <!-- Quick Image Generation Buttons -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">SCENE & CHARACTERS</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="scene" style="width: 100%; margin-bottom: 4px;">🏞️ Current Scene</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="ai-portrait" style="width: 100%; margin-bottom: 4px;">🤖 AI Character</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="user-portrait" style="width: 100%; margin-bottom: 4px;">👤 User Character</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="memory" style="width: 100%;">🧠 From Memory</button>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">CONTEXT-BASED</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="last-raw" style="width: 100%; margin-bottom: 4px;">📝 Last Message (Raw)</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="last-clean" style="width: 100%; margin-bottom: 4px;">✨ Last Message (Clean)</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="recent" style="width: 100%; margin-bottom: 4px;">📚 Recent Events</button>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="context" style="width: 100%;">🌍 Full Context</button>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">SPECIAL</div>
                        <button class="klite-rpmod-button klite-imggen-btn" data-prompt="cover" style="width: 100%; background: #8B4513; border-color: #654321;">📖 Book Cover</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        this.initializeScene();
    },

    getSceneHTML() {
        const locationOptions = Object.keys(this.sceneData.locations).map(loc => 
            `<option value="${loc}">${loc}</option>`
        ).join('');
        
        const timeOptions = Object.keys(this.sceneData.times).map(time => 
            `<option value="${time}"${time === 'evening' ? ' selected' : ''}>${time.charAt(0).toUpperCase() + time.slice(1)}</option>`
        ).join('');
        
        const weatherOptions = Object.keys(this.sceneData.weather).map(weather => 
            `<option value="${weather}"${weather === 'light rain' ? ' selected' : ''}>${weather.charAt(0).toUpperCase() + weather.slice(1)}</option>`
        ).join('');
        
        const moodOptions = Object.keys(this.sceneData.moods).map(mood => 
            `<option value="${mood}"${mood === 'mysterious' ? ' selected' : ''}>${mood.charAt(0).toUpperCase() + mood.slice(1)}</option>`
        ).join('');
        
        return `
            <div class="klite-rpmod-control-row">
                <label>Location:</label>
                <select id="klite-rpmod-location" style="flex: 1;">
                    ${locationOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Time:</label>
                <select id="klite-rpmod-time-of-day" style="flex: 1;">
                    ${timeOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Weather:</label>
                <select id="klite-rpmod-weather" style="flex: 1;">
                    ${weatherOptions}
                </select>
            </div>
            <div class="klite-rpmod-control-row">
                <label>Mood:</label>
                <select id="klite-rpmod-mood" style="flex: 1;">
                    ${moodOptions}
                </select>
            </div>
        `;
    },

    initializeScene() {
        console.log('🎨 Initializing simplified SCENE panel');
        
        // 1. SYNC WITH LITE SETTINGS (read current values)
        this.syncWithLiteSettings();
        this.getImageGenerationSettings();
        
        // 2. SCENE SETUP HANDLERS
        this.setupSceneHandlers();
        
        // 3. IMAGE GENERATION HANDLERS (simplified)
        this.setupImageGenerationHandlers();
    },

    syncWithLiteSettings() {
        // Read current Lite settings and update controls
        if (typeof localsettings !== 'undefined') {
            // Sync auto-generate dropdown
            const autogenSelect = document.getElementById('klite-rpmod-sync-autogen');
            if (autogenSelect && localsettings.generate_images !== undefined) {
                autogenSelect.value = localsettings.generate_images.toString();
            }
            
            // Sync detect checkbox
            const detectCheckbox = document.getElementById('klite-rpmod-sync-detect');
            if (detectCheckbox && localsettings.img_gen_from_instruct !== undefined) {
                detectCheckbox.checked = localsettings.img_gen_from_instruct;
            }
        }
        
        // Set up sync handlers
        this.setupSyncHandlers();
    },

    getGenerationMode(modevalue) {
        switch(modevalue) {
            case "0": return 'Disabled';
            case "1": return 'AI Horde';
            case "2": return 'KCPP / Forge / A1111';
            case "3": return 'OpenAI DALL-E';
            case "4": return 'ComfyUI';
            case "5": return 'Pollinations.ai';
            default: return 'Trying to detect...';
        }
    },

    // Update status display when panel opens
    getImageGenerationSettings() {           
        const modeStatus = document.getElementById('klite-rpmod-scene-imggen-mode-status');
        const modelStatus = document.getElementById('klite-rpmod-scene-imggen-model-status');
        
        if (typeof localsettings !== 'undefined') {
            // Update Mode status - this is the service/backend
            if (modeStatus && localsettings.generate_images_mode !== undefined) {
                modeStatus.textContent = this.getGenerationMode(localsettings.generate_images_mode);
                modeStatus.style.color = localsettings.generate_images_mode === '0' ? '#999' : '#4a9eff';
            }
            
            // Update Model status - this is the specific model
            if (modelStatus && localsettings.generate_images_model !== undefined) {
                modelStatus.textContent = localsettings.generate_images_model;
                modelStatus.style.color = localsettings.generate_images_mode.includes('0') ? '#999' : '#4a9eff'; //color for model gets changed by mode not model here!
            }
        }
    },

    setupSyncHandlers() {
        // Auto-generate dropdown
        const autogenSelect = document.getElementById('klite-rpmod-sync-autogen');
        if (autogenSelect) {
            autogenSelect.addEventListener('change', (e) => {
                if (typeof localsettings !== 'undefined') {
                    localsettings.generate_images = parseInt(e.target.value);
                    console.log('Updated generate_images to:', localsettings.generate_images);
                    
                    // Call Lite's function if it exists
                    if (typeof set_generate_images === 'function') {
                        set_generate_images(parseInt(e.target.value));
                    }
                }
            });
        }

        // Detect checkbox
        const detectCheckbox = document.getElementById('klite-rpmod-sync-detect');
        if (detectCheckbox) {
            detectCheckbox.addEventListener('change', (e) => {
                if (typeof localsettings !== 'undefined') {
                    localsettings.img_gen_from_instruct = e.target.checked;
                    console.log('Updated img_gen_from_instruct to:', localsettings.img_gen_from_instruct);
                    
                    // Call Lite's function if it exists
                    if (typeof toggle_img_gen_from_instruct === 'function') {
                        toggle_img_gen_from_instruct();
                    }
                }
            });
        }
    },

    setupSceneHandlers() {
        // Scene dropdown change handlers
        ['klite-rpmod-location', 'klite-rpmod-time-of-day', 'klite-rpmod-weather', 'klite-rpmod-mood'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.generateSceneDescription());
            }
        });
        
        // Generate initial description
        this.generateSceneDescription();

        // Apply scene button
        document.getElementById('klite-rpmod-apply-scene')?.addEventListener('click', () => {
            this.applyScene();
        });
        
        // Context checkbox handler
        const contextCheckbox = document.getElementById('klite-rpmod-scene-append-to-context');
        if (contextCheckbox) {
            contextCheckbox.addEventListener('change', (e) => {
                const applyButton = document.getElementById('klite-rpmod-apply-scene');
                if (applyButton) {
                    applyButton.textContent = e.target.checked ? 
                        'Append Scene to Context' : 
                        'Append Scene to Memory';
                }
            });
        }
    },

    setupImageGenerationHandlers() {
        // All image generation buttons
        const imgButtons = document.querySelectorAll('.klite-imggen-btn');
        imgButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const promptType = btn.getAttribute('data-prompt');
                this.generateImage(promptType);
            });
        });
    },

    generateImage(promptType) {
        console.log('🎨 Generating image for:', promptType);
        
        // Check if function exists
        if (typeof do_manual_gen_image !== 'function') {
            console.error('do_manual_gen_image function not available');
            return;
        }
        
        // Build prompt based on type
        const prompt = this.buildPrompt(promptType);
        if (!prompt) {
            console.error('Failed to build prompt for type:', promptType);
            return;
        }
        
        // Call Lite's function directly
        try {
            do_manual_gen_image(prompt);
            console.log(`✅ Image generation started: "${prompt.substring(0, 50)}..."`);
        } catch (error) {
            console.error('Image generation failed:', error);
        }
    },

    buildPrompt(type) {
        switch(type) {
            case 'scene':
                return this.buildScenePrompt();
            case 'ai-portrait':
                return this.buildAIPortraitPrompt();
            case 'user-portrait':
                return this.buildUserPortraitPrompt();
            case 'memory':
                return this.buildMemoryPrompt();
            case 'last-raw':
                return this.buildLastMessagePrompt(true);
            case 'last-clean':
                return this.buildLastMessagePrompt(false);
            case 'recent':
                return this.buildRecentEventsPrompt();
            case 'context':
                return this.buildFullContextPrompt();
            case 'cover':
                return this.buildBookCoverPrompt();
            default:
                return null;
        }
    },

    buildScenePrompt() {
        const location = document.getElementById('klite-rpmod-location')?.value || 'a place';
        const time = document.getElementById('klite-rpmod-time-of-day')?.value || 'day';
        const weather = document.getElementById('klite-rpmod-weather')?.value || 'clear';
        const mood = document.getElementById('klite-rpmod-mood')?.value || 'neutral';
        
        return `${location} during ${time}, ${weather} weather, ${mood} atmosphere, detailed scene`;
    },

    buildAIPortraitPrompt() {
        const aiName = localsettings?.chatopponent?.split('||$||')[0] || 'AI character';
        return `Portrait of ${aiName}, detailed character art`;
    },

    buildUserPortraitPrompt() {
        const userName = localsettings?.chatname || 'User';
        return `Portrait of ${userName}, detailed character art`;
    },

    buildMemoryPrompt() {
        const memory = document.getElementById('memorytext')?.value || '';
        if (memory) {
            const cleanMemory = memory.replace(/\[.*?\]/g, '').trim();
            const firstLine = cleanMemory.split('\n')[0] || cleanMemory.slice(0, 100);
            return `${firstLine}, illustration`;
        }
        return 'Character memory visualization';
    },

    buildLastMessagePrompt(raw = false) {
        if (typeof concat_gametext === 'function') {
            const fullText = concat_gametext(true, "");
            if (fullText) {
                const textLength = fullText.length;
                let sentence = fullText.substring(textLength - 400, textLength);
                if (!raw && typeof start_trim_to_sentence === 'function') {
                    sentence = start_trim_to_sentence(sentence);
                }
                if (!raw && typeof end_trim_to_sentence === 'function') {
                    sentence = end_trim_to_sentence(sentence, true);
                }
                return sentence + ', illustration';
            }
        }
        return 'Latest story scene, illustration';
    },

    buildRecentEventsPrompt() {
        if (typeof concat_gametext === 'function') {
            const fullText = concat_gametext(true, "");
            if (fullText) {
                const recentText = fullText.slice(-1000);
                return `Recent events: ${recentText.slice(0, 200)}, montage illustration`;
            }
        }
        return 'Recent story events, illustration';
    },

    buildFullContextPrompt() {
        const memory = document.getElementById('memorytext')?.value || '';
        let prompt = '';
        
        if (memory) {
            prompt += memory.slice(0, 100);
        }
        
        if (typeof concat_gametext === 'function') {
            const story = concat_gametext(true, "");
            if (story) {
                prompt += (prompt ? ', ' : '') + story.slice(-200);
            }
        }
        
        return prompt ? `${prompt}, epic scene` : 'Story overview, epic illustration';
    },

    buildBookCoverPrompt() {
        const title = document.title || 'The Story';
        const memory = document.getElementById('memorytext')?.value?.slice(0, 50) || '';
        return `Book cover: "${title}", ${memory}, professional cover art`;
    },

    generateSceneDescription() {
        const location = document.getElementById('klite-rpmod-location').value;
        const time = document.getElementById('klite-rpmod-time-of-day').value;
        const weather = document.getElementById('klite-rpmod-weather').value;
        const mood = document.getElementById('klite-rpmod-mood').value;
        
        // Build the description
        let sentences = [];
        
        // Add location
        if (this.sceneData.locations[location]) {
            sentences.push(this.sceneData.locations[location] + '.');
        }
        
        // Add time
        if (this.sceneData.times[time]) {
            sentences.push(this.sceneData.times[time] + '.');
        }
        
        // Add weather (only if not shadowed)
        if (this.sceneData.weather[weather] && this.sceneData.weather[weather] !== '') {
            sentences.push(this.sceneData.weather[weather] + '.');
        }
        
        // Add mood
        if (this.sceneData.moods[mood]) {
            sentences.push(this.sceneData.moods[mood] + '.');
        }
        
        // Update the textarea
        const descriptionField = document.getElementById('klite-rpmod-scene-description');
        if (descriptionField) {
            descriptionField.value = sentences.join(' ');
        }
    },

    applyScene() {
        const location = document.getElementById('klite-rpmod-location').value;
        const time = document.getElementById('klite-rpmod-time-of-day').value;
        const weather = document.getElementById('klite-rpmod-weather').value;
        const mood = document.getElementById('klite-rpmod-mood').value;
        const description = document.getElementById('klite-rpmod-scene-description').value;
        const appendToContext = document.getElementById('klite-rpmod-scene-append-to-context')?.checked || false;

        const scenePrompt = `[Scene: ${location} - ${time}, ${weather} weather, ${mood} mood]\n${description}`;
        
        if (appendToContext) {
            // Append to context (temporary injection during generation)
            this.appendSceneToContext(scenePrompt);
        } else {
            // Append to memory (permanent)
            this.appendSceneToMemory(scenePrompt);
        }
    },

    appendSceneToMemory(scenePrompt) {
        console.log('📍 Attempting to append scene to memory:', scenePrompt);
        
        // Get the memory textarea - correct the element IDs
        const memoryTextarea = document.getElementById('memorytext') || 
                              document.getElementById('klite-rpmod-memory-textarea') ||
                              document.querySelector('#klite-rpmod-panel-right textarea#memorytext');
        
        if (memoryTextarea) {
            console.log('✅ Memory textarea found:', memoryTextarea.id);
            const currentMemory = memoryTextarea.value;
            
            // Check if there's already a scene description
            if (currentMemory.includes('[Scene:')) {
                // Replace existing scene
                console.log('🔄 Replacing existing scene in memory');
                memoryTextarea.value = currentMemory.replace(/\[Scene:[^\]]+\][^\n]*\n?/, scenePrompt + '\n');
            } else {
                // Append new scene to the end (like the smart memory append does)
                console.log('➕ Appending new scene to memory');
                memoryTextarea.value = currentMemory + (currentMemory ? '\n\n' : '') + scenePrompt;
            }
            
            // Trigger input event to sync with other systems
            memoryTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Update localsettings if available
            if (typeof localsettings !== 'undefined') {
                localsettings.memory = memoryTextarea.value;
                console.log('💾 Updated localsettings.memory');
            }
            
            // Trigger save/confirm
            if (typeof confirm_memory === 'function') {
                confirm_memory();
                console.log('✅ Called confirm_memory()');
            } else if (typeof btn_memory_confirm === 'function') {
                btn_memory_confirm();
                console.log('✅ Called btn_memory_confirm()');
            }
            
            // Switch to MEMORY panel to show the result
            if (window.KLITE_RPMod && window.KLITE_RPMod.api) {
                window.KLITE_RPMod.api.switchTab('right', 'MEMORY');
                console.log('📂 Switched to MEMORY panel');
            }
            
            console.log('✅ SCENE Panel: Scene appended to Memory! ✨');
        } else {
            console.error('❌ SCENE Panel: Memory field not found! Tried IDs:', [
                'memorytext',
                'klite-rpmod-memory-textarea',
                '#klite-rpmod-panel-right textarea#memorytext'
            ]);
        }
    }
};