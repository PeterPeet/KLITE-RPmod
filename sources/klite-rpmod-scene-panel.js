// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
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
        // Get current settings from KoboldAI
        const generateImagesMode = (typeof localsettings !== 'undefined' && localsettings.generate_mode) 
            ? localsettings.generate_mode : '0';
        const imgGenFromInstruct = (typeof localsettings !== 'undefined' && localsettings.img_gen_from_instruct) 
            ? localsettings.img_gen_from_instruct : false;
        
        container.innerHTML = `
            <div class="klite-rpmod-panel klite-rpmod-panel-scene" id="klite-rpmod-panel-scene">
                <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                    <!-- Scene Setup -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Quick Scene Setup</h3>
                        
                        ${this.getSceneHTML()}
                        
                        <textarea id="klite-rpmod-scene-description" placeholder="Scene description..." style="width: 100%; min-height: 100px; margin-top: 2px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: #e0e0e0; padding: 8px; border-radius: 4px; resize: vertical;"></textarea>
                        
                        <button class="klite-rpmod-button" id="klite-rpmod-apply-scene" style="width: 100%; margin-top: 8px;">
                            Append Scene to Memory
                        </button>

                        <label style="display: flex; align-items: center; color: #999; font-size: 12px; margin-top: 8px;">
                            <input type="checkbox" id="klite-rpmod-scene-append-to-context" style="margin-right: 5px;">
                            Append scene to context (doesn't appear in Chat)
                        </label>

                    </div>

                    <!-- Image Generation -->
                    <div class="klite-rpmod-control-group">
                        <div class="klite-rpmod-control-group-background"></div>
                        <h3>Image Generation 🎨</h3>
                        
                        <!-- Auto-generate Images Settings -->
                        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #333;">
                            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                                <label style="color: #999; font-size: 12px; width: 140px;">Auto-generate Images:</label>
                                <select id="klite-rpmod-scene-autogen-images" style="flex: 1; background: #262626; border: 1px solid #444; color: #e0e0e0; padding: 4px;">
                                    <option value="0" ${generateImagesMode === 0 ? 'selected' : ''}>Disabled</option>
                                    <option value="1" ${generateImagesMode === 1 ? 'selected' : ''}>Immersive Mode</option>
                                    <option value="2" ${generateImagesMode === 2 ? 'selected' : ''}>All Messages</option>
                                    <option value="3" ${generateImagesMode === 3 ? 'selected' : ''}>User Messages Only</option>
                                    <option value="4" ${generateImagesMode === 4 ? 'selected' : ''}>Non-User Messages Only</option>
                                </select>
                            </div>

                            <!-- Status Display -->
                            <div id="klite-rpmod-image-status" style="margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid #444; border-radius: 3px; font-size: 11px;">
                                <div style="color: #666; margin-bottom: 4px;">Image Generation Status:</div>
                                <div style="color: #999;">
                                    Mode: <span id="klite-rpmod-scene-imggen-mode-status" style="color: #999;">---</span>
                                </div>
                                <div style="color: #999;">
                                    Model: <span id="klite-rpmod-scene-imggen-model-status" style="color: #999;">---</span>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                                <label style="display: flex; align-items: center; color: #999; font-size: 12px;">
                                    <input type="checkbox" id="klite-rpmod-scene-detect-imggen" ${imgGenFromInstruct ? 'checked' : ''} style="margin-right: 5px;">
                                    Detect ImgGen Instructions
                                </label>
                            </div>
                        </div>
                        
                        <!-- Scene & Character Illustrations -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">Scene & Characters</div>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-scene" style="width: 100%; margin-bottom: 4px;">Illustrate Scene</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-ai-portrait" style="width: 100%; margin-bottom: 4px;">Illustrate Character Portrait (AI)</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-user-portrait" style="width: 100%; margin-bottom: 4px;">Illustrate Character Portrait (User)</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-memory" style="width: 100%;">Illustrate Character's Memory</button>
                        </div>
                        
                        <!-- Context-based Illustrations -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">Context-Based</div>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-last" style="width: 100%; margin-bottom: 4px;">Illustrate RAW Last Message</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-rawlast" style="width: 100%; margin-bottom: 4px;">Illustrate PREPPED Last Message</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-recent" style="width: 100%; margin-bottom: 4px;">Illustrate Recent Events (Last 10)</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-plot" style="width: 100%; margin-bottom: 4px;">Illustrate Last Plot Point</button>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-context" style="width: 100%;">Illustrate Whole Context</button>
                        </div>
                        
                        <!-- Special Illustration -->
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 6px; text-transform: uppercase;">Special</div>
                            <button class="klite-rpmod-button" id="klite-rpmod-illustrate-cover" style="width: 100%; background: #8B4513; border-color: #654321;">Illustrate Book Cover</button>
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
            <div class="klite-rpmod-control-row" style="padding: 2px !important;">
                <label>Location:</label>
                <select id="klite-rpmod-location" style="flex: 1;">
                    ${locationOptions}
                </select>
            </div>
            
            <div class="klite-rpmod-control-row" style="padding: 2px !important;">
                <label>Time:</label>
                <select id="klite-rpmod-time-of-day" style="flex: 1;">
                    ${timeOptions}
                </select>
            </div>
            
            <div class="klite-rpmod-control-row" style="padding: 2px !important;">
                <label>Weather:</label>
                <select id="klite-rpmod-weather" style="flex: 1;">
                    ${weatherOptions}
                </select>
            </div>
            
            <div class="klite-rpmod-control-row" style="padding: 2px !important;">
                <label>Mood:</label>
                <select id="klite-rpmod-mood" style="flex: 1;">
                    ${moodOptions}
                </select>
            </div>
        `;
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

    getImageModeText(mode) {
        switch(mode) {
            case 0: return 'Disabled';
            case 1: return 'Immersive Mode';
            case 2: return 'All Messages';
            case 3: return 'User Messages Only';
            case 4: return 'Non-User Messages Only';
            default: return 'Unknown';
        }
    },

    initializeScene() {
        console.log('🎨 Initializing KLITE image generation system');
    
        // Ensure image generation settings are available
        if (typeof localsettings !== 'undefined') {
            // Set default values if not present
            if (localsettings.generate_images === undefined) {
                localsettings.generate_images = 0; // Default to disabled
            }
            if (localsettings.img_gen_from_instruct === undefined) {
                localsettings.img_gen_from_instruct = true; // Enable instruction detection by default
            }
            if (localsettings.generate_images_mode === undefined) {
                localsettings.generate_images_mode = "0"; // Default to disabled
            }
        }
        
        // Try to find and hook into KoboldAI's image generation system
        this.detectImageGenerationCapabilities();
        
        // Set up periodic monitoring for changes
        this.startImageGenerationMonitoring();

        // Add change event listeners to scene dropdowns
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

        // Auto-generate images dropdown handler
        const autogenDropdown = document.getElementById('klite-rpmod-scene-autogen-images');
        if (autogenDropdown) {
            autogenDropdown.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (typeof localsettings !== 'undefined') {
                    localsettings.generate_images = value;
                    
                    // Update status display
                    const statusEl = document.getElementById('klite-rpmod-scene-imggen-mode-status');
                    if (statusEl) {
                        statusEl.textContent = this.getImageModeText(value);
                    }
                    
                    // Call KoboldAI's function if it exists
                    if (typeof set_generate_images === 'function') {
                        set_generate_images(value);
                    }
                }
            });
        }

        // Detect ImgGen Instructions checkbox handler
        const detectCheckbox = document.getElementById('klite-rpmod-scene-detect-imggen');
        if (detectCheckbox) {
            detectCheckbox.addEventListener('change', (e) => {
                if (typeof localsettings !== 'undefined') {
                    localsettings.img_gen_from_instruct = e.target.checked;
                    
                    // Call KoboldAI's function if it exists
                    if (typeof toggle_img_gen_from_instruct === 'function') {
                        toggle_img_gen_from_instruct();
                    }
                }
            });
        }

        // Image generation buttons
        this.initializeImageGeneration();
    },

    initializeImageGeneration() {
        const buttons = {
            'klite-rpmod-illustrate-scene': 'Generate a scene image based on current location and atmosphere settings',
            'klite-rpmod-illustrate-ai-portrait': 'Generate portrait of the current AI character',
            'klite-rpmod-illustrate-user-portrait': 'Generate portrait of the user character',
            'klite-rpmod-illustrate-memory': 'Generate image based on character memory',
            'klite-rpmod-illustrate-rawlast': 'Generate image using the raw output of the last message',
            'klite-rpmod-illustrate-last': 'Generate image based on the summary of the last message',
            'klite-rpmod-illustrate-recent': 'Generate image based on recent events (last 10 messages)',
            'klite-rpmod-illustrate-plot': 'Generate image based on the last major plot point',
            'klite-rpmod-illustrate-context': 'Generate image based on entire context',
            'klite-rpmod-illustrate-cover': 'Generate a book cover style image for the story'
        };

        Object.entries(buttons).forEach(([id, prompt]) => {
            const button = document.getElementById(id);
            if (button) {
                // Store original title
                button.setAttribute('data-original-title', prompt);
                
                // Add click handler
                button.addEventListener('click', () => {
                    if (!button.disabled) {
                        this.generateImage(prompt);
                    }
                });
            }
        });
        
        // Set initial button states
        this.updateImageButtonStates();
        
        // Watch for changes to image generation settings
        this.watchImageGenerationSettings();
    },

    // Detect available image generation methods
    detectImageGenerationCapabilities() {
        const capabilities = {
            manual_gen_image: typeof manual_gen_image === 'function',
            generate_image: typeof generate_image === 'function',
            generate_current_image: typeof generate_current_image === 'function',
            set_generate_images: typeof set_generate_images === 'function',
            toggle_img_gen_from_instruct: typeof toggle_img_gen_from_instruct === 'function',
            submit_generation: typeof submit_generation === 'function',
            dispatch_submit_generation: typeof dispatch_submit_generation === 'function',
            prepare_submit_generation: typeof prepare_submit_generation === 'function',
            handle_incoming_text: typeof handle_incoming_text === 'function'
        };
        
        console.log('📊 Image generation capabilities:', capabilities);
        
        // Store for later use
        this.imgGenCapabilities = capabilities;
        
        // Determine best method
        if (capabilities.manual_gen_image) {
            this.preferredMethod = 'manual';
            console.log('✅ Using manual_gen_image method');
        } else if (capabilities.submit_generation && localsettings?.img_gen_from_instruct) {
            this.preferredMethod = 'instruction';
            console.log('✅ Using instruction detection method');
        } else {
            this.preferredMethod = 'fallback';
            console.log('⚠️ Using fallback methods');
        }
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

    watchImageGenerationSettings() {
        // Check every second for changes (since KoboldAI doesn't have setting change events)
        this.intervalId = setInterval(() => {
            this.updateImageButtonStates();
            
            // Also update the status display
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
        }, 5000);
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
    },

    // Monitor for image generation completion
    startImageGenerationMonitoring() {
        // Watch for new images being added to the chat
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IMG' || (node.querySelector && node.querySelector('img'))) {
                        console.log('🖼️ New image detected in chat');
                        this.onImageGenerated(node);
                    }
                });
            });
        });
        
        // Observe the gametext area
        const gametext = document.getElementById('gametext');
        if (gametext) {
            observer.observe(gametext, {
                childList: true,
                subtree: true
            });
        }
        
        // Also monitor for aesthetic mode
        const aestheticContainer = document.querySelector('.aesthetic-wrapper, .chat-container');
        if (aestheticContainer) {
            observer.observe(aestheticContainer, {
                childList: true,
                subtree: true
            });
        }
        
        this.imageObserver = observer;
    },

    appendSceneToContext(scenePrompt) {
        // Store the scene for context injection
        this.contextScene = scenePrompt;
        
        // Hook into the generation process
        this.setupContextInjection();
        
        console.log('ℹ️ SCENE Panel: Scene will be appended to context during generation!');
    },

    setupContextInjection() {
        // Store original functions if not already stored
        if (!this._originalPrepareSubmit && typeof prepare_submit_generation === 'function') {
            this._originalPrepareSubmit = prepare_submit_generation;
        }
        
        if (!this._originalSubmitButton && typeof submit_generation_button === 'function') {
            this._originalSubmitButton = submit_generation_button;
        }
        
        // Override prepare_submit_generation
        window.prepare_submit_generation = () => {
            if (this.contextScene) {
                // Temporarily inject scene into the context
                const gametext = document.getElementById('gametext');
                if (gametext) {
                    // Store original first message
                    const firstChild = gametext.firstElementChild;
                    
                    // Create scene element
                    const sceneElement = document.createElement('div');
                    sceneElement.className = 'scene-context-injection';
                    sceneElement.style.display = 'none'; // Hidden from view
                    sceneElement.textContent = this.contextScene;
                    
                    // Insert at the beginning
                    gametext.insertBefore(sceneElement, firstChild);
                    
                    // Call original function
                    if (this._originalPrepareSubmit) {
                        this._originalPrepareSubmit();
                    }
                    
                    // Remove scene element after a short delay
                    setTimeout(() => {
                        sceneElement.remove();
                    }, 100);
                }
            } else if (this._originalPrepareSubmit) {
                this._originalPrepareSubmit();
            }
        };
        
        // Override submit_generation_button
        window.submit_generation_button = (event) => {
            if (this.contextScene) {
                // Similar injection logic
                const gametext = document.getElementById('gametext');
                if (gametext) {
                    const firstChild = gametext.firstElementChild;
                    const sceneElement = document.createElement('div');
                    sceneElement.className = 'scene-context-injection';
                    sceneElement.style.display = 'none';
                    sceneElement.textContent = this.contextScene;
                    gametext.insertBefore(sceneElement, firstChild);
                    
                    if (this._originalSubmitButton) {
                        this._originalSubmitButton(event);
                    }
                    
                    setTimeout(() => {
                        sceneElement.remove();
                    }, 100);
                }
            } else if (this._originalSubmitButton) {
                this._originalSubmitButton(event);
            }
        };
    },

    generateImage(promptDescription) {
        console.log('Generating image with prompt:', promptDescription);
        
        // First check if image generation is enabled
        if (typeof localsettings !== 'undefined' && localsettings.generate_images === 0) {
            this.showNotification('Image generation is disabled. Enable it in KoboldAI settings.', 'warning');
            // Update button states in case they're out of sync
            this.updateImageButtonStates();
            return;
        }
        
        // Build the actual prompt based on the button's description
        let imagePrompt = this.buildImagePrompt(promptDescription);
        
        // Try to generate the image directly
        if (typeof manual_gen_image === 'function') {
            try {
                // Direct generation - no menu, just generate!
                manual_gen_image(imagePrompt);
                this.showNotification('Image generation started...', 'success');
            } catch (error) {
                console.error('Image generation error:', error);
                this.showNotification('Failed to generate image: ' + error.message, 'error');
            }
        } else {
            // No direct generation available, show error
            this.showNotification('Image generation function not available. Please check your KoboldAI configuration.', 'error');
            console.warn('manual_gen_image function is not available');
            
            // As a last resort, we could try to simulate the generation
            // by setting the prompt and triggering any available generation
            if (typeof generate_current_image === 'function') {
                try {
                    // Some versions might have this
                    generate_current_image(imagePrompt);
                } catch (e) {
                    console.error('Alternative generation failed:', e);
                }
            }
        }
    },

    buildImagePrompt(description) {
        let prompt = '';
        
        switch(description) {
            case 'Generate a scene image based on current location and atmosphere settings':
                // Build from scene settings
                const location = document.getElementById('klite-rpmod-location')?.value || 'a mysterious place';
                const time = document.getElementById('klite-rpmod-time-of-day')?.value || 'day';
                const weather = document.getElementById('klite-rpmod-weather')?.value || 'clear';
                const mood = document.getElementById('klite-rpmod-atmosphere')?.value || 'neutral';
                
                prompt = `${location}`;
                if (time && time !== 'any') prompt += ` during ${time}`;
                if (weather && weather !== 'clear') prompt += `, ${weather} weather`;
                if (mood && mood !== 'neutral') prompt += `, ${mood} atmosphere`;
                prompt += ', detailed scene illustration';
                break;
                
            case 'Generate portrait of the current AI character':
                // Get AI character name
                const aiName = document.querySelector('.aesthetic_instruct_AIname')?.textContent || 
                            document.querySelector('[title*="character"]')?.textContent ||
                            localsettings?.chatname || 
                            'AI character';
                prompt = `Portrait of ${aiName}, detailed character art, fantasy style`;
                break;
                
            case 'Generate portrait of the user character':
                // Get user name
                const userName = document.getElementById('klite-rpmod-user-name')?.value || 
                            localsettings?.username || 
                            'User';
                prompt = `Portrait of ${userName}, detailed character art, protagonist`;
                break;
                
            case 'Generate image based on character memory':
                // Use memory content
                const memory = document.getElementById('memorytext')?.value || '';
                if (memory) {
                    // Extract key visual elements from memory
                    const cleanMemory = memory.replace(/\[.*?\]/g, '').trim();
                    const firstLine = cleanMemory.split('\n')[0] || cleanMemory.slice(0, 100);
                    prompt = `Scene depicting: ${firstLine}, atmospheric illustration`;
                } else {
                    prompt = 'Character memory visualization, abstract concept art';
                }
                break;
                
            case 'Generate image using the raw output of the last message':
                // Get raw last message
                const messages = document.querySelectorAll('#gametext > div');
                if (messages.length > 0) {
                    const lastMessage = messages[messages.length - 1].textContent;
                    prompt = lastMessage.slice(0, 200) + ', illustration';
                } else {
                    prompt = 'Scene from the story, detailed illustration';
                }
                break;
                
            case 'Generate image based on the summary of the last message':
                // Summarized version of last message
                const lastMsg = document.querySelector('#gametext > div:last-child')?.textContent || '';
                if (lastMsg) {
                    // Extract key nouns and actions (simplified)
                    const words = lastMsg.split(' ').filter(w => w.length > 4);
                    const keyWords = words.slice(0, 10).join(' ');
                    prompt = `Scene showing ${keyWords}, artistic interpretation`;
                } else {
                    prompt = 'Latest story development, conceptual art';
                }
                break;
                
            case 'Generate image based on recent events (last 10 messages)':
                // Gather recent context
                const recentMessages = Array.from(document.querySelectorAll('#gametext > div')).slice(-10);
                if (recentMessages.length > 0) {
                    const recentText = recentMessages.map(m => m.textContent).join(' ');
                    const summary = recentText.slice(0, 150);
                    prompt = `Collage depicting recent events: ${summary}, multiple scenes`;
                } else {
                    prompt = 'Recent story events visualization, dynamic composition';
                }
                break;
                
            case 'Generate image based on the last major plot point':
                // Try to identify plot points (look for action words)
                const allMessages = Array.from(document.querySelectorAll('#gametext > div'));
                const plotKeywords = ['discovered', 'revealed', 'attacked', 'escaped', 'found', 'lost', 'won', 'defeated'];
                let plotPoint = '';
                
                for (let i = allMessages.length - 1; i >= 0; i--) {
                    const text = allMessages[i].textContent.toLowerCase();
                    if (plotKeywords.some(keyword => text.includes(keyword))) {
                        plotPoint = allMessages[i].textContent.slice(0, 150);
                        break;
                    }
                }
                
                prompt = plotPoint ? `Dramatic scene: ${plotPoint}` : 'Major plot development, cinematic illustration';
                break;
                
            case 'Generate image based on entire context':
                // Use a combination of memory and recent events
                const contextMemory = document.getElementById('memorytext')?.value || '';
                const contextRecent = Array.from(document.querySelectorAll('#gametext > div')).slice(-5)
                                        .map(m => m.textContent).join(' ').slice(0, 100);
                prompt = `Story overview combining: ${contextMemory.slice(0, 50)} and ${contextRecent}, epic composition`;
                break;
                
            case 'Generate a book cover style image for the story':
                // Create book cover prompt
                const storyTitle = document.querySelector('title')?.textContent || 'The Story';
                const coverMemory = document.getElementById('memorytext')?.value?.slice(0, 50) || '';
                const genre = this.detectGenre();
                prompt = `Book cover art for "${storyTitle}", ${genre} genre, featuring ${coverMemory}, professional cover design`;
                break;
                
            default:
                // Fallback to the description itself
                prompt = description;
        }
        
        return prompt;
    },

    // Helper to detect story genre from content
    detectGenre() {
        const content = document.getElementById('gametext')?.textContent?.toLowerCase() || '';
        const memory = document.getElementById('memorytext')?.value?.toLowerCase() || '';
        const combined = content + ' ' + memory;
        
        if (combined.includes('magic') || combined.includes('wizard') || combined.includes('spell')) return 'fantasy';
        if (combined.includes('space') || combined.includes('alien') || combined.includes('technology')) return 'sci-fi';
        if (combined.includes('love') || combined.includes('heart') || combined.includes('kiss')) return 'romance';
        if (combined.includes('murder') || combined.includes('detective') || combined.includes('mystery')) return 'mystery';
        if (combined.includes('horror') || combined.includes('terror') || combined.includes('fear')) return 'horror';
        
        return 'adventure';
    },

    promptImageGen() {
        // This is the method called by the scene generation quick button
        console.log('Scene generation prompted');
        this.generateImage('Generate a scene image based on current location and atmosphere settings');
    },

    mockImageGeneration(message) {
        console.log('Image generation request:', message);
        this.showNotification('Image generation request:\n' + message);
    },

    updateImageButtonStates() {
        // Check multiple sources for disabled state
        let isDisabled = false;
        
        // First check the Lite UI dropdowns directly
        const imageGenModeDropdown = document.querySelector('select[id*="imggen_mode"], select[id*="generate_images"]:not(#klite-rpmod-scene-autogen-images)');
        const imageGenModelDropdown = document.querySelector('select[id*="imggen_model"], select[id*="generate_images_model"]');
        
        if (imageGenModeDropdown && imageGenModeDropdown.value === '0') {
            isDisabled = true;
        }
        
        if (imageGenModelDropdown) {
            const modelValue = imageGenModelDropdown.options[imageGenModelDropdown.selectedIndex]?.text || imageGenModelDropdown.value;
            if (modelValue.includes('[Disabled]')) {
                isDisabled = true;
            }
        }
        
        // Fallback to localsettings if dropdowns not found
        if (!imageGenModeDropdown && !imageGenModelDropdown) {
            isDisabled = typeof localsettings === 'undefined' || 
                         localsettings.generate_images === 0 || 
                         (localsettings.generate_images_model && localsettings.generate_images_model.includes('[Disabled]'));
        }
        
        // Get all image generation buttons
        const imageButtons = [
            'klite-rpmod-illustrate-scene',
            'klite-rpmod-illustrate-ai-portrait',
            'klite-rpmod-illustrate-user-portrait',
            'klite-rpmod-illustrate-memory',
            'klite-rpmod-illustrate-rawlast',
            'klite-rpmod-illustrate-last',
            'klite-rpmod-illustrate-recent',
            'klite-rpmod-illustrate-plot',
            'klite-rpmod-illustrate-context',
            'klite-rpmod-illustrate-cover'
        ];
        
        imageButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = isDisabled;
                
                // Apply visual styling for disabled state
                if (isDisabled) {
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    button.title = 'Image generation is disabled in settings';
                    // Add disabled class for additional styling
                    button.classList.add('disabled');
                } else {
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    button.title = button.getAttribute('data-original-title') || '';
                    // Remove disabled class
                    button.classList.remove('disabled');
                }
            }
        });
    },

    showNotification(message, type = 'info') {
        // Map notification types to console methods
        const consoleMethod = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const emoji = consoleMethod[type] || consoleMethod['info'];
        console.log(`${emoji} SCENE Panel: ${message}`);
    },

    cleanup() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};