// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 2)
// Remaining methods and Panel API
// =============================================


    console.log('Loading KLITECharacterManager Panel Version - Part 2');
    
    if (!PanelCharacterManager) {
        console.error('KLITE Character Manager Part 1 must be loaded first!');
        return;
    }

    // Add remaining methods to the prototype
    PanelCharacterManager.prototype.initEventListeners = function() {
        // Core event handlers
        this.container.addEventListener('click', (e) => {
            if (this.helpers.UI.handleSectionHeader(e)) return;
        });

        // File handling
        const uploadZone = document.getElementById('char-upload-zone');
        const importBtn = document.getElementById('char-import-btn');
        const clearBtn = document.getElementById('char-clear-btn');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        importBtn.addEventListener('click', () => this.fileInput.click());
        clearBtn.addEventListener('click', () => this.clearAll());

        // Search and filter
        const searchInput = document.getElementById('char-search-input');
        const tagFilter = document.getElementById('char-tag-filter');
        const ratingFilter = document.getElementById('char-rating-filter');

        searchInput.addEventListener('input', () => {
            this.searchTerm = searchInput.value;
            this.updateGallery();
        });

        tagFilter.addEventListener('change', () => {
            this.selectedTag = tagFilter.value;
            this.updateGallery();
        });

        ratingFilter.addEventListener('change', () => {
            this.selectedRating = ratingFilter.value;
            this.updateGallery();
        });

        // Fullscreen view
        const backBtn = document.getElementById('char-back-btn');
        const loadScenarioBtn = document.getElementById('char-load-scenario-btn');
        const addWorldInfoBtn = document.getElementById('char-add-worldinfo-btn');
        const removeWorldInfoBtn = document.getElementById('char-remove-worldinfo-btn');
        const removeCharacterBtn = document.getElementById('char-remove-character-btn');

        backBtn.addEventListener('click', () => this.closeFullscreen());
        loadScenarioBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.loadAsScenario(this.selectedCharacter);
            }
        });
        addWorldInfoBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.addToWorldInfo(this.selectedCharacter);
            }
        });
        removeWorldInfoBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.removeFromWorldInfo(this.selectedCharacter);
            }
        });
        removeCharacterBtn.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.removeCharacter(this.selectedCharacter);
            }
        });

        // Tag modal
        const tagModal = document.getElementById('char-tag-modal');
        const tagInput = document.getElementById('char-tag-input');
        const tagCancelBtn = document.getElementById('char-tag-cancel-btn');
        const tagAddBtn = document.getElementById('char-tag-add-btn');

        tagCancelBtn.addEventListener('click', () => this.closeTagModal());
        tagAddBtn.addEventListener('click', () => this.addTag());
        
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTag();
            }
        });

        tagModal.addEventListener('click', (e) => {
            if (e.target.id === 'char-tag-modal') {
                this.closeTagModal();
            }
        });
    };

    PanelCharacterManager.prototype.cleanTextEncoding = function(characterData) {
        // PRESERVE binary data before JSON serialization
        const preservedBlob = characterData._imageBlob;
        const preservedImageData = characterData._imageData;
        
        console.log('Before cleaning - has blob:', !!preservedBlob);
        console.log('Before cleaning - blob type:', preservedBlob?.constructor.name);
        
        // Create deep copy for text cleaning (this removes blobs)
        const cleaned = JSON.parse(JSON.stringify(characterData));
        
        // Function to clean text in any string value
        const cleanText = (text) => {
            if (typeof text !== 'string') return text;
            
            return text
                // Fix common UTF-8 encoding artifacts
                .replace(/â€™/g, "'")           // Smart apostrophe artifacts
                .replace(/â€œ/g, '"')          // Smart quote artifacts  
                .replace(/â€/g, '"')          // Smart quote artifacts
                .replace(/â€"/g, '—')          // Em dash artifacts
                .replace(/â€"/g, '–')          // En dash artifacts
                .replace(/Â /g, ' ')           // Non-breaking space artifacts
                .replace(/â€¦/g, '…')         // Ellipsis artifacts
                .replace(/â€¢/g, '•')         // Bullet point artifacts

                // Fix specific Unicode apostrophe and quote characters by char code
                .replace(/\u2019/g, "'")     // Right single quotation mark (8217) → standard apostrophe
                .replace(/\u2018/g, "'")     // Left single quotation mark (8216) → standard apostrophe  
                .replace(/\u201C/g, '"')     // Left double quotation mark (8220) → standard quote
                .replace(/\u201D/g, '"')     // Right double quotation mark (8221) → standard quote
                
                // Fix various quote and apostrophe characters (iPad/Mac/device specific)
                .replace(/['']/g, "'")       // Smart apostrophes/single quotes → standard apostrophe
                .replace(/[""]/g, '"')       // Smart double quotes → standard double quotes
                .replace(/[´`]/g, "'")       // Acute accent & grave accent → standard apostrophe
                .replace(/[‚„]/g, '"')       // Bottom quotes → standard double quotes
                .replace(/[‹›]/g, "'")       // Single angle quotes → standard apostrophe
                .replace(/[«»]/g, '"')       // Double angle quotes → standard double quotes
                
                // Fix accented characters
                .replace(/Ã¡/g, 'á')         // á character
                .replace(/Ã©/g, 'é')         // é character
                .replace(/Ã­/g, 'í')         // í character
                .replace(/Ã³/g, 'ó')         // ó character
                .replace(/Ãº/g, 'ú')         // ú character
                .replace(/Ã±/g, 'ñ')         // ñ character
                .replace(/Ã¼/g, 'ü')         // ü character
                .replace(/Ã¶/g, 'ö')         // ö character
                .replace(/Ã¤/g, 'ä')         // ä character
                .replace(/Ã /g, 'à')         // à character
                .replace(/Ã¨/g, 'è')         // è character
                .replace(/Ã¬/g, 'ì')         // ì character
                .replace(/Ã²/g, 'ò')         // ò character
                .replace(/Ã¹/g, 'ù')         // ù character
                .replace(/Ã‡/g, 'Ç')         // Ç character
                
                // Additional common patterns
                .replace(/â€™\s/g, "' ")       // Apostrophe with space
                .replace(/â€™([a-zA-Z])/g, "'$1") // Apostrophe before letters
                .replace(/â€œ\s/g, '" ')       // Quote with space
                .replace(/â€œ([a-zA-Z])/g, '"$1') // Quote before letters
                
                // DO NOT collapse multiple spaces or trim - preserve formatting!
                // .replace(/\s+/g, ' ')        // REMOVED - this was destroying formatting
                // .trim();                     // REMOVED - preserve leading/trailing whitespace
                ;
        };
        
        // Recursively clean all string properties
        const cleanObject = (obj) => {
            if (typeof obj === 'string') {
                return cleanText(obj);
            } else if (Array.isArray(obj)) {
                return obj.map(cleanObject);
            } else if (obj && typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = cleanObject(value);
                }
                return result;
            }
            return obj;
        };

        const encodingCleaned = cleanObject(cleaned);
        
        // Sanitize the import for security with formatting preservation
        const sanitized = this.helpers.Security.sanitizeCharacterDataPreserveFormat(encodingCleaned);
        
        // RESTORE binary data after cleaning and sanitization
        if (preservedBlob) {
            sanitized._imageBlob = preservedBlob;
            console.log('Restored blob to cleaned data');
        }
        
        if (preservedImageData) {
            sanitized._imageData = preservedImageData;
            console.log('Restored image data to cleaned data');
        }
        
        console.log('After cleaning - has blob:', !!sanitized._imageBlob);
        
        return sanitized;
    };

    PanelCharacterManager.prototype.handleFiles = async function(files) {
        for (const file of files) {
            try {
                if (file.size > 50 * 1024 * 1024) {
                    throw new Error(`File too large: ${file.name}`);
                }
                
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    await this.loadJSONFile(file);
                } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
                    await this.loadPNGFile(file);
                } else if (file.type === 'image/webp' || file.name.endsWith('.webp')) {
                    await this.loadWEBPFile(file);
                } else {
                    throw new Error(`Unsupported file type: ${file.name}`);
                }
            } catch (error) {
                alert(`Error loading ${file.name}: ${error.message}`);
            }
        }
        this.updateGallery();
        this.updateTagFilter();
    };

    PanelCharacterManager.prototype.loadJSONFile = async function(file) {
        const text = await file.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file');
        }

        const format = FormatDetector.detectFormat(data);
        console.log(`Detected format: ${format} for file: ${file.name}`);

        if (format === 'unknown') {
            throw new Error('Unknown character card format');
        }

        const v2Data = await FormatDetector.convertToV2(data, format);
        const cleanedData = this.cleanTextEncoding(v2Data.data);
        cleanedData._importFormat = format;
        await this.addCharacter(cleanedData);
    };

    PanelCharacterManager.prototype.loadPNGFile = async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    console.log(`Processing PNG file: ${file.name}, size: ${uint8Array.length} bytes`);
                    
                    let textChunks = [];
                    try {
                        textChunks = this.extractPNGTextChunks(uint8Array);
                    } catch (parseError) {
                        console.error('PNG parsing failed:', parseError);
                        reject(new Error(`PNG parsing failed: ${parseError.message}`));
                        return;
                    }
                    
                    let characterData = null;
                    let format = 'unknown';
                    
                    // Try multiple keywords and formats
                    const keywords = ['chara', 'ccv2', 'ccv3', 'character', 'taverncard'];
                    
                    for (const chunk of textChunks) {
                        if (keywords.includes(chunk.keyword.toLowerCase())) {
                            try {
                                // Try base64 decode first
                                let jsonStr = chunk.text;
                                try {
                                    jsonStr = atob(chunk.text);
                                } catch (e) {
                                    // Not base64, use as-is
                                }
                                
                                const parsed = JSON.parse(jsonStr);
                                format = FormatDetector.detectFormat(parsed);
                                
                                if (format !== 'unknown') {
                                    const v2Data = await FormatDetector.convertToV2(parsed, format);
                                    characterData = v2Data.data || v2Data;
                                    characterData._importFormat = format;
                                    console.log(`Found ${format} character data:`, characterData.name);
                                    break;
                                }
                            } catch (e) {
                                console.warn(`Failed to parse chunk ${chunk.keyword}:`, e);
                                continue;
                            }
                        }
                    }
                    
                    if (characterData) {
                        const blob = new Blob([uint8Array], { type: 'image/png' });
                        
                        // Convert to base64 data URL for persistence
                        const base64Reader = new FileReader();
                        base64Reader.onloadend = async () => {
                            const base64DataUrl = base64Reader.result;
                            
                            characterData._imageData = base64DataUrl;
                            characterData._imageBlob = blob;

                            const cleanedData = this.cleanTextEncoding(characterData);

                            console.log('Created base64 data URL for image');
                            await this.addCharacter(cleanedData);
                            resolve();
                        };
                        base64Reader.onerror = () => reject(new Error('Failed to convert image to base64'));
                        base64Reader.readAsDataURL(blob);
                    } else {
                        reject(new Error('No valid character data found in PNG. Tried keywords: ' + keywords.join(', ')));
                    }
                } catch (error) {
                    console.error('Error in loadPNGFile:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    };

    PanelCharacterManager.prototype.loadWEBPFile = async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    const characterData = this.extractWEBPCharacterData(uint8Array);
                    
                    if (characterData) {
                        const blob = new Blob([uint8Array], { type: 'image/webp' });
                        
                        // Convert to base64 data URL for persistence
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const base64DataUrl = reader.result;
                            
                            characterData._imageData = base64DataUrl;
                            characterData._imageBlob = blob;
                            
                            const cleanedData = this.cleanTextEncoding(characterData);
                            await this.addCharacter(cleanedData);
                            resolve();
                        };
                        reader.onerror = () => reject(new Error('Failed to convert image to base64'));
                        reader.readAsDataURL(blob);
                    } else {
                        reject(new Error('No character data found in WEBP'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    };

    PanelCharacterManager.prototype.extractPNGTextChunks = function(uint8Array) {
        const chunks = [];
        let offset = 8;
        let iterations = 0;
        const maxIterations = 1000;
        
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (let i = 0; i < 8; i++) {
            if (uint8Array[i] !== signature[i]) {
                throw new Error('Invalid PNG signature');
            }
        }
        
        while (offset < uint8Array.length && iterations < maxIterations) {
            iterations++;
            
            if (offset + 8 > uint8Array.length) break;
            
            const length = (uint8Array[offset] << 24) | 
                          (uint8Array[offset + 1] << 16) | 
                          (uint8Array[offset + 2] << 8) | 
                          uint8Array[offset + 3];
            
            const type = String.fromCharCode(
                uint8Array[offset + 4],
                uint8Array[offset + 5],
                uint8Array[offset + 6],
                uint8Array[offset + 7]
            );
            
            if (length < 0 || length > 100 * 1024 * 1024) break;
            
            const totalChunkSize = 8 + length + 4;
            if (offset + totalChunkSize > uint8Array.length) break;
            
            if (type === 'tEXt' && length > 0) {
                try {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                    const nullIndex = chunkData.indexOf(0);
                    
                    if (nullIndex !== -1 && nullIndex < chunkData.length - 1) {
                        let keyword = '';
                        for (let i = 0; i < nullIndex; i++) {
                            keyword += String.fromCharCode(chunkData[i]);
                        }
                        
                        let text = '';
                        for (let i = nullIndex + 1; i < chunkData.length; i++) {
                            text += String.fromCharCode(chunkData[i]);
                        }
                        
                        chunks.push({ keyword, text });
                    }
                } catch (e) {
                    console.warn('Error parsing tEXt chunk:', e);
                }
            }
            
            if (type === 'IEND') break;
            
            offset = offset + 8 + length + 4;
        }
        
        return chunks;
    };

    PanelCharacterManager.prototype.extractWEBPCharacterData = function(uint8Array) {
        if (!(uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && 
              uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
              uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && 
              uint8Array[10] === 0x42 && uint8Array[11] === 0x50)) {
            return null;
        }
        
        let offset = 12;
        while (offset < uint8Array.length - 8) {
            if (offset + 8 > uint8Array.length) break;
            
            const chunkType = String.fromCharCode(
                uint8Array[offset], uint8Array[offset + 1],
                uint8Array[offset + 2], uint8Array[offset + 3]
            );
            
            const chunkSize = uint8Array[offset + 4] | 
                             (uint8Array[offset + 5] << 8) |
                             (uint8Array[offset + 6] << 16) |
                             (uint8Array[offset + 7] << 24);
            
            if (chunkType === 'EXIF' && chunkSize > 0) {
                const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
                const userComment = this.findEXIFUserComment(exifData);
                if (userComment) {
                    try {
                        const parsed = JSON.parse(userComment);
                        const format = FormatDetector.detectFormat(parsed);
                        if (format !== 'unknown') {
                            const v2Data = FormatDetector.convertToV2(parsed, format);
                            v2Data.data._importFormat = format;
                            return v2Data.data;
                        }
                        return parsed.data || parsed;
                    } catch (e) {
                        console.warn('Failed to parse WEBP character data:', e);
                    }
                }
            }
            
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        
        return null;
    };

    PanelCharacterManager.prototype.findEXIFUserComment = function(exifData) {
        for (let i = 0; i < exifData.length - 20; i++) {
            if ((exifData[i] === 0x92 && exifData[i + 1] === 0x86) ||
                (exifData[i] === 0x86 && exifData[i + 1] === 0x92)) {
                
                let start = i + 10;
                let end = start;
                
                while (end < exifData.length && end < start + 10000) {
                    if (exifData[end] === 0 && exifData[end + 1] === 0) break;
                    end++;
                }
                
                if (end > start) {
                    let comment = '';
                    for (let j = start; j < end; j++) {
                        if (exifData[j] !== 0) {
                            comment += String.fromCharCode(exifData[j]);
                        }
                    }
                    
                    const jsonStart = comment.indexOf('{');
                    if (jsonStart !== -1) {
                        const jsonEnd = comment.lastIndexOf('}');
                        if (jsonEnd > jsonStart) {
                            return comment.substring(jsonStart, jsonEnd + 1);
                        }
                    }
                }
            }
        }
        return null;
    };

    PanelCharacterManager.prototype.addCharacter = async function(characterData) {
        const character = {
            id: Date.now() + Math.random(),
            name: characterData.name,
            description: characterData.description || '',
            scenario: characterData.scenario || '',
            creator: characterData.creator || 'Unknown',
            imageBlob: characterData._imageBlob || null,
            tags: characterData.tags || [],
            rating: 0,
            rawData: characterData,
            importedAt: new Date().toISOString()
        };
        
        this.characters.push(character);
        await this.IndexedDBManager.saveCharacter(character);
    };

    PanelCharacterManager.prototype.removeCharacter = async function(character) {
        if (!character) {
            console.error('No character provided to removeCharacter');
            alert('Error: No character selected for removal');
            return;
        }

        const confirmMsg = `Are you sure you want to permanently delete "${character.name}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const removeBtn = document.getElementById('char-remove-character-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Removing...';
                removeBtn.disabled = true;
            }

            if (character.image && character.image.startsWith('blob:')) {
                URL.revokeObjectURL(character.image);
            }

            await this.IndexedDBManager.deleteCharacter(character.id);
            
            const index = this.characters.findIndex(c => c.id === character.id);
            if (index !== -1) {
                this.characters.splice(index, 1);
            }

            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
            this.closeFullscreen();
            this.helpers.UI.showSuccessMessage(`"${character.name}" has been removed`);
            
        } catch (error) {
            console.error('Error removing character:', error);
            alert(`Failed to remove character: ${error.message}`);
        } finally {
            const removeBtn = document.getElementById('char-remove-character-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Delete Character';
                removeBtn.disabled = false;
            }
        }
    };

    PanelCharacterManager.prototype.loadCharacters = async function() {
        try {
            this.characters = await this.IndexedDBManager.getAllCharacters();
            
            this.characters.forEach(char => {
                if (char.rating === undefined) {
                    char.rating = 0;
                }
                
                // Use base64 data if available, otherwise create blob URL
                if (char.rawData && char.rawData._imageData) {
                    char.image = char.rawData._imageData;
                } else if (char.imageBlob && !char.image) {
                    char.image = URL.createObjectURL(char.imageBlob);
                }
            });
            
            console.log(`Loaded ${this.characters.length} characters from IndexedDB`);
        } catch (error) {
            console.error('Error loading characters:', error);
            this.characters = [];
        }
    };

    PanelCharacterManager.prototype.updateGallery = function() {
        const grid = document.getElementById('char-character-grid');
        
        const filteredCharacters = this.characters.filter(char => {
            const matchesSearch = !this.searchTerm || 
                char.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                char.creator.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                char.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()));
            
            const matchesTag = !this.selectedTag || char.tags.includes(this.selectedTag);
            
            const matchesRating = !this.selectedRating || char.rating.toString() === this.selectedRating;
            
            return matchesSearch && matchesTag && matchesRating;
        });
        
        grid.innerHTML = '';
        
        filteredCharacters.forEach(character => {
            const card = this.createCharacterCard(character);
            grid.appendChild(card);
        });
        
        document.getElementById('char-gallery-stats').textContent = 
            `${filteredCharacters.length} of ${this.characters.length} characters`;
    };

    PanelCharacterManager.prototype.createCharacterCard = function(character) {
        const card = document.createElement('div');
        card.className = 'KLITECharacterManager-character-card';
        
        // Prefer base64 data URL over blob URL
        let imageUrl = character.image;
        if (!imageUrl && character.rawData && character.rawData._imageData) {
            imageUrl = character.rawData._imageData;
            character.image = imageUrl;
        } else if (!imageUrl && character.imageBlob) {
            imageUrl = URL.createObjectURL(character.imageBlob);
            character.image = imageUrl;
        }
        
        card.innerHTML = `
            <img src="${imageUrl || ''}" alt="${character.name}" 
                class="KLITECharacterManager-character-image" 
                onerror="this.style.display='none';">
            <div class="KLITECharacterManager-character-info">
                <div class="KLITECharacterManager-character-name">${character.name}</div>
                <div class="KLITECharacterManager-character-creator">${character.creator}</div>
                <div class="KLITECharacterManager-character-rating">
                    <select class="KLITECharacterManager-rating-dropdown" data-char-id="${character.id}">
                        <option value="0" ${character.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="5" ${character.rating === 5 ? 'selected' : ''}>★★★★★</option>
                        <option value="4" ${character.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="3" ${character.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="2" ${character.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="1" ${character.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                    </select>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('KLITECharacterManager-rating-dropdown')) {
                this.openFullscreen(character);
            }
        });

        card.querySelector('.KLITECharacterManager-rating-dropdown')
            .addEventListener('change', async (e) => {
                e.stopPropagation();
                character.rating = parseInt(e.target.value);
                await this.IndexedDBManager.saveCharacter(character);
            });
        
        return card;
    };

    // Stub for openFullscreen - will be replaced in Part 3
    PanelCharacterManager.prototype.openFullscreen = function(character) {
        this.selectedCharacter = character;
        const fullscreenView = document.getElementById('char-fullscreen-view');
        fullscreenView.classList.add('show');
        // Full implementation in Part 3
    };

    PanelCharacterManager.prototype.closeFullscreen = function() {
        document.getElementById('char-fullscreen-view').classList.remove('show');
        this.selectedCharacter = null;
    };

    PanelCharacterManager.prototype.updateTagFilter = function() {
        const tagFilter = document.getElementById('char-tag-filter');
        const allTags = new Set();
        
        this.characters.forEach(char => {
            char.tags.forEach(tag => allTags.add(tag));
        });
        
        const sortedTags = Array.from(allTags).sort();
        
        tagFilter.innerHTML = `
            <option value="">All Tags</option>
            ${sortedTags.map(tag => 
                `<option value="${tag}" ${this.selectedTag === tag ? 'selected' : ''}>${tag}</option>`
            ).join('')}
        `;
    };

    PanelCharacterManager.prototype.updateRatingFilter = function() {
        const ratingFilter = document.getElementById('char-rating-filter');
        if (ratingFilter) {
            ratingFilter.value = this.selectedRating;
        }
    };

    PanelCharacterManager.prototype.openTagModal = function(characterId) {
        this.currentTagCharacter = this.characters.find(c => c.id === characterId);
        const modal = document.getElementById('char-tag-modal');
        modal.classList.remove('hidden');
        document.getElementById('char-tag-input').focus();
    };

    PanelCharacterManager.prototype.closeTagModal = function() {
        const modal = document.getElementById('char-tag-modal');
        modal.classList.add('hidden');
        document.getElementById('char-tag-input').value = '';
        this.currentTagCharacter = null;
    };

    PanelCharacterManager.prototype.addTag = async function() {
        const tagInput = document.getElementById('char-tag-input');
        const tagName = tagInput.value.trim();
        
        if (tagName && this.currentTagCharacter) {
            if (!this.currentTagCharacter.tags.includes(tagName)) {
                this.currentTagCharacter.tags.push(tagName);
                await this.IndexedDBManager.saveCharacter(this.currentTagCharacter);
                this.updateGallery();
                this.updateTagFilter();
                
                if (this.selectedCharacter && this.selectedCharacter.id === this.currentTagCharacter.id) {
                    this.openFullscreen(this.currentTagCharacter);
                }
            }
            this.closeTagModal();
        }
    };

    PanelCharacterManager.prototype.clearAll = async function() {
        if (confirm('Are you sure you want to delete all characters?')) {
            this.characters.forEach(char => {
                if (char.image && char.image.startsWith('blob:')) {
                    URL.revokeObjectURL(char.image);
                }
            });

            this.characters = [];
            this.selectedCharacter = null;
            this.selectedTag = '';
            this.selectedRating = '';
            this.searchTerm = '';
            
            await this.IndexedDBManager.clearAllCharacters();
            
            this.updateGallery();
            this.updateTagFilter();
            this.updateRatingFilter();
            this.closeFullscreen();
            
            document.getElementById('char-search-input').value = '';
            document.getElementById('char-tag-filter').value = '';
            document.getElementById('char-rating-filter').value = '';
        }
    };

    PanelCharacterManager.prototype.loadAsScenario = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI not available');
            return;
        }

        if (!confirm(`Load "${character.name}" as scenario? This will restart the session.`)) {
            return;
        }

        try {
            await KoboldAIIntegration.loadAsScenario(character.rawData);
        } catch (error) {
            alert(`Failed to load character: ${error.message}`);
        }
    };

    PanelCharacterManager.prototype.addToWorldInfo = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI functions not available. Make sure you are running this in KoboldAI Lite.');
            return;
        }

        try {
            const addBtn = document.getElementById('char-add-worldinfo-btn');
            addBtn.textContent = 'Adding...';
            addBtn.disabled = true;

            await KoboldAIIntegration.addToWorldInfo(character.rawData);
            
            this.helpers.UI.showSuccessMessage(`"${character.name}" added to World Info!`);

        } catch (error) {
            console.error('Error adding character to World Info:', error);
            alert(`Failed to add character to World Info: ${error.message}`);
        } finally {
            const addBtn = document.getElementById('char-add-worldinfo-btn');
            if (addBtn) {
                addBtn.textContent = 'Add to World Info';
                addBtn.disabled = !KoboldAIIntegration.isAvailable();
            }
        }
    };

    PanelCharacterManager.prototype.removeFromWorldInfo = async function(character) {
        if (!KoboldAIIntegration.isAvailable()) {
            alert('KoboldAI functions not available. Make sure you are running this in KoboldAI Lite.');
            return;
        }

        const confirmMsg = `Remove "${character.name}" from World Info?\n\n⚠️ Warning: Any changes you made to the World Info entries will NOT be merged back to the stored character card. Only the original character data will remain.`;
        
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const removeBtn = document.getElementById('char-remove-worldinfo-btn');
            removeBtn.textContent = 'Removing...';
            removeBtn.disabled = true;

            const removedCount = await KoboldAIIntegration.removeFromWorldInfo(character.name);
            
            if (removedCount > 0) {
                this.helpers.UI.showSuccessMessage(`"${character.name}" removed from World Info! (${removedCount} entries removed)`);
            } else {
                this.helpers.UI.showSuccessMessage(`No World Info entries found for "${character.name}"`);
            }

        } catch (error) {
            console.error('Error removing character from World Info:', error);
            alert(`Failed to remove character from World Info: ${error.message}`);
        } finally {
            const removeBtn = document.getElementById('char-remove-worldinfo-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Remove from WI';
                removeBtn.disabled = !KoboldAIIntegration.isAvailable();
            }
        }
    };

    PanelCharacterManager.prototype.cleanup = function() {
        this.characters.forEach(char => {
            if (char.image && char.image.startsWith('blob:')) {
                URL.revokeObjectURL(char.image);
            }
        });
        
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
        
        const styleElement = document.getElementById('character-manager-panel-styles');
        if (styleElement) {
            styleElement.remove();
        }
    };

    // =============================================
    // PANEL API
    // =============================================
    window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};
    
    window.KLITE_RPMod_Panels.CHARS = {
        instance: null,
        
        async load(container, panel) {
            console.log('Loading Character Manager into CHARS panel');
            
            // Check if helpers are loaded
            if (!window.KLITE_RPMod_Helpers) {
                console.error('KLITE_RPMod_Helpers not found! Make sure to load helpers first.');
                container.innerHTML = `
                    <div style="padding: 20px; color: #ff6666;">
                        Error: Helper modules not loaded. Please check loading order.
                    </div>
                `;
                return;
            }

            // Check if CSS is loaded
            if (!window.KLITE_CharacterManager_CSS) {
                console.error('KLITE_CharacterManager_CSS not found! Make sure to load CSS first.');
                container.innerHTML = `
                    <div style="padding: 20px; color: #ff6666;">
                        Error: CSS module not loaded. Please check loading order.
                    </div>
                `;
                return;
            }
            
            // Clean up any existing instance
            if (this.instance) {
                this.instance.cleanup();
            }
            
            // Create new instance
            this.instance = new PanelCharacterManager();
            await this.instance.init(container);
        },
        
        unload() {
            if (this.instance) {
                this.instance.cleanup();
                this.instance = null;
            }
        }
    };

    // Global function for toggling fullscreen sections
    window.toggleFullscreenSection = function(sectionId) {
        const instance = window.KLITE_RPMod_Panels.CHARS.instance;
        if (!instance) return;
        
        const section = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (section) {
            section.classList.toggle('collapsed');
            
            if (section.classList.contains('collapsed')) {
                instance.collapsedFullscreenSections.add(sectionId);
            } else {
                instance.collapsedFullscreenSections.delete(sectionId);
            }
        }
    };