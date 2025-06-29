// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - Shared Helper Functions
// Reusable utilities for all panels
// =============================================



    window.KLITE_RPMod_Helpers = {
        // =============================================
        // SECURITY & SANITIZATION UTILITIES
        // =============================================
        Security: {
            // HTML sanitization
            sanitizeHTML(text) {
                if (typeof text !== 'string') return text;
                
                // Create a temporary div to safely escape HTML
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            },

            sanitizeCharacterDataPreserveFormat(characterData) {
                const sanitized = {
                    ...characterData,
                    name: this.sanitizeCharacterName(characterData.name),
                    creator: this.sanitizeCreatorName(characterData.creator),
                    tags: this.sanitizeTags(characterData.tags)
                };

                // Sanitize text fields while preserving formatting
                const textFields = ['description', 'scenario', 'personality', 'first_mes', 'mes_example', 
                                'creator_notes', 'system_prompt', 'post_history_instructions'];
                textFields.forEach(field => {
                    if (sanitized[field]) {
                        sanitized[field] = this.sanitizeTextPreserveFormat(sanitized[field]);
                    }
                });

                // Handle nested character book data
                if (sanitized.character_book && sanitized.character_book.entries) {
                    sanitized.character_book.entries = sanitized.character_book.entries.map(entry => ({
                        ...entry,
                        content: this.sanitizeTextPreserveFormat(entry.content || ''),
                        comment: this.sanitizeTextPreserveFormat(entry.comment || ''),
                        key: this.sanitizeTextPreserveFormat(entry.key || ''),
                        keysecondary: this.sanitizeTextPreserveFormat(entry.keysecondary || ''),
                        keyanti: this.sanitizeTextPreserveFormat(entry.keyanti || '')
                    }));
                }

                // Handle alternate greetings
                if (Array.isArray(sanitized.alternate_greetings)) {
                    sanitized.alternate_greetings = sanitized.alternate_greetings
                        .map(greeting => this.sanitizeTextPreserveFormat(greeting));
                }

                return sanitized;
            },

            // Remove potentially dangerous content
            sanitizeTextPreserveFormat(text) {
                if (typeof text !== 'string') return text;
                
                return text
                    // Remove script tags and their content
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    // Remove javascript: URLs
                    .replace(/javascript:/gi, '')
                    // Remove on* event handlers
                    .replace(/\s*on\w+\s*=\s*[^>]*/gi, '')
                    // Remove data: URLs (except safe image types)
                    .replace(/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml))[^;]*/gi, '');
                    // DO NOT escape HTML entities - preserve formatting
            },

            // Validate and sanitize character name
            sanitizeCharacterName(name) {
                if (!name || typeof name !== 'string') {
                    return 'Unknown Character';
                }
                
                // Remove control characters and limit length
                const cleaned = name
                    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                    .trim()
                    .substring(0, 100); // Limit to 100 characters
                    
                return cleaned || 'Unknown Character';
            },

            // Validate and sanitize creator name
            sanitizeCreatorName(creator) {
                if (!creator || typeof creator !== 'string') {
                    return 'Unknown';
                }
                
                const cleaned = creator
                    .replace(/[\x00-\x1F\x7F]/g, '')
                    .trim()
                    .substring(0, 50); // Limit creator name length
                    
                return cleaned || 'Unknown';
            },

            // Sanitize tags array
            sanitizeTags(tags) {
                if (!Array.isArray(tags)) {
                    return [];
                }
                
                return tags
                    .filter(tag => typeof tag === 'string')
                    .map(tag => tag
                        .replace(/[\x00-\x1F\x7F]/g, '')
                        .trim()
                        .substring(0, 30) // Limit tag length
                    )
                    .filter(tag => tag.length > 0)
                    .slice(0, 20); // Limit number of tags
            }
        },

        // =============================================
        // TEXT ENCODING CLEANUP
        // =============================================
        TextEncoding: {
            cleanTextEncoding(characterData) {
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
                const sanitized = KLITE_RPMod_Helpers.Security.sanitizeCharacterDataPreserveFormat(encodingCleaned);
                
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
            }
        },

        // =============================================
        // SECTION HANDLERS
        // =============================================
        UI: {
            handleSectionHeader(e) {
                const sectionHeader = e.target.closest('.KLITECharacterManager-section-header');
                if (sectionHeader) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const section = sectionHeader.closest('.KLITECharacterManager-section');
                    section.classList.toggle('collapsed');
                    const arrow = sectionHeader.querySelector('span:last-child');
                    arrow.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
                    return true;
                }
                return false;
            },

            showSuccessMessage(message, elementId = 'char-success-message') {
                const successMsg = document.getElementById(elementId);
                if (successMsg) {
                    successMsg.textContent = message;
                    successMsg.classList.add('show');
                    window.setTimeout(() => {
                        successMsg.classList.remove('show');
                    }, 3000);
                }
            }
        },

        // =============================================
        // INDEXEDDB MANAGER
        // =============================================
        IndexedDB: {
            db: null,
            dbName: 'KLITECharacterManagerDB',
            dbVersion: 1,
            storeName: 'characters',

            async init() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => {
                        this.db = request.result;
                        resolve(this.db);
                    };
                    
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('creator', 'creator', { unique: false });
                            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                            store.createIndex('rating', 'rating', { unique: false });
                        }
                    };
                });
            },

            async saveCharacter(character) {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.put(character);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async getAllCharacters() {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAll();
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async deleteCharacter(id) {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(id);
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            },

            async clearAllCharacters() {
                if (!this.db) await this.init();
                
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.clear();
                    
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                });
            }
        }
    };
