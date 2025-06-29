// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Copyrights Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE Character Manager - Panel Implementation (Part 3)
// Fullscreen view implementation
// =============================================


    console.log('Loading KLITECharacterManager Panel Version - Part 3');
    
    if (!PanelCharacterManager) {
        console.error('KLITE Character Manager Parts 1 & 2 must be loaded first!');
        return;
    }

    // Replace the stub openFullscreen method with full implementation
    PanelCharacterManager.prototype.openFullscreen = function(character) {
        this.selectedCharacter = character;
        const fullscreenView = document.getElementById('char-fullscreen-view');
        const fullscreenContent = document.getElementById('char-fullscreen-content');
        const fullscreenTitle = document.getElementById('char-fullscreen-title');
        
        fullscreenTitle.textContent = character.name;
        
        // Format indicator
        const formatIndicator = character.rawData._importFormat || character.rawData._format || 'v2';
        
        // Ensure we have a valid image URL
        let imageUrl = character.image;
        if (!imageUrl && character.rawData && character.rawData._imageData) {
            imageUrl = character.rawData._imageData;
            character.image = imageUrl;
        } else if (!imageUrl && character.imageBlob) {
            imageUrl = URL.createObjectURL(character.imageBlob);
            character.image = imageUrl;
        }
        
        const isKoboldAvailable = window.KoboldAIIntegration.isAvailable();
        const loadBtn = document.getElementById('char-load-scenario-btn');
        const wiBtn = document.getElementById('char-add-worldinfo-btn');
        const removeWiBtn = document.getElementById('char-remove-worldinfo-btn');
        const removeCharBtn = document.getElementById('char-remove-character-btn');
        
        if (loadBtn) {
            loadBtn.disabled = !isKoboldAvailable;
            loadBtn.title = isKoboldAvailable ? 'Load character as new scenario' : 'KoboldAI not available';
        }
        
        if (wiBtn) {
            wiBtn.disabled = !isKoboldAvailable;
            wiBtn.title = isKoboldAvailable ? 'Add character to World Info' : 'KoboldAI not available';
        }

        if (removeWiBtn) {
            removeWiBtn.disabled = !isKoboldAvailable;
            removeWiBtn.title = isKoboldAvailable ? 'Remove character from World Info' : 'KoboldAI not available';
        }

        if (removeCharBtn) {
            removeCharBtn.disabled = false;
            removeCharBtn.title = 'Delete this character permanently';
        }
        
        // Build unified fullscreen content with centered layout
        let fullscreenHTML = `
            <!-- Character Header - Centered -->
            <div class="KLITECharacterManager-character-header">
                <img src="${imageUrl || ''}" alt="${character.name}" 
                    class="KLITECharacterManager-character-header-image"
                    onerror="this.style.display='none';">
                <div class="KLITECharacterManager-character-header-info">
                    <div class="KLITECharacterManager-character-header-name">${character.name}</div>
                    <div class="KLITECharacterManager-character-header-meta">
                        Created by ${character.creator} • Format: ${formatIndicator.toUpperCase()}
                    </div>
                    <div class="KLITECharacterManager-fullscreen-rating">
                        <label>Rating: </label>
                        <select id="char-fullscreen-rating-dropdown" data-char-id="${character.id}">
                            <option value="0" ${character.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                            <option value="5" ${character.rating === 5 ? 'selected' : ''}>★★★★★ (5 stars)</option>
                            <option value="4" ${character.rating === 4 ? 'selected' : ''}>★★★★☆ (4 stars)</option>
                            <option value="3" ${character.rating === 3 ? 'selected' : ''}>★★★☆☆ (3 stars)</option>
                            <option value="2" ${character.rating === 2 ? 'selected' : ''}>★★☆☆☆ (2 stars)</option>
                            <option value="1" ${character.rating === 1 ? 'selected' : ''}>★☆☆☆☆ (1 star)</option>
                        </select>
                    </div>
                    <div class="KLITECharacterManager-character-header-tags">
                        ${character.tags.map(tag => 
                            `<span class="KLITECharacterManager-tag" style="padding: 4px 8px; font-size: 11px;">${tag}</span>`
                        ).join('')}
                        <button class="KLITECharacterManager-add-tag-btn" data-char-id="${character.id}" 
                                style="width: 20px; height: 20px; font-size: 12px;">+</button>
                    </div>
                </div>
            </div>
        `;

        // Helper function to create collapsible sections
        const createSection = (title, content, defaultOpen = true) => {
            if (!content || (typeof content === 'string' && content.trim() === '')) return '';
            
            const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}-${character.id}`;
            const isCollapsed = this.collapsedFullscreenSections && this.collapsedFullscreenSections.has(sectionId);
            
            return `
                <div class="KLITECharacterManager-fullscreen-section ${isCollapsed ? 'collapsed' : ''}" data-section-id="${sectionId}">
                    <div class="KLITECharacterManager-fullscreen-section-header" onclick="window.toggleFullscreenSection('${sectionId}')">
                        <span>${title}</span>
                        <span class="KLITECharacterManager-fullscreen-section-arrow">▼</span>
                    </div>
                    <div class="KLITECharacterManager-fullscreen-section-content">${this.helpers.Security.sanitizeHTML(content)}</div>
                </div>
            `;
        };

        // Add sections in order
        if (character.rawData.creator_notes) {
            fullscreenHTML += createSection('Creator Notes', character.rawData.creator_notes);
        }

        if (character.description) {
            fullscreenHTML += createSection('Description', character.description);
        }
        
        if (character.rawData.personality) {
            fullscreenHTML += createSection('Personality', character.rawData.personality);
        }

        if (character.scenario) {
            fullscreenHTML += createSection('Scenario', character.scenario);
        }

        if (character.rawData.system_prompt) {
            fullscreenHTML += createSection('System Prompt', character.rawData.system_prompt);
        }

        if (character.rawData.post_history_instructions) {
            fullscreenHTML += createSection('Post History Instructions', character.rawData.post_history_instructions);
        }
        
        // First Message as its own section
        if (character.rawData.first_mes) {
            fullscreenHTML += createSection('First Message', character.rawData.first_mes);
        }

        // Each alternate greeting as a separate section
        if (character.rawData.alternate_greetings && character.rawData.alternate_greetings.length > 0) {
            character.rawData.alternate_greetings.forEach((greeting, index) => {
                fullscreenHTML += createSection(`Alternate Greeting ${index + 2}`, greeting);
            });
        }

        // Example messages
        if (character.rawData.mes_example) {
            fullscreenHTML += createSection('Example Messages', character.rawData.mes_example);
        }

        // Character Book / World Info
        if (character.rawData.character_book && character.rawData.character_book.entries && character.rawData.character_book.entries.length > 0) {
            const book = character.rawData.character_book;
            let wiContent = `
                <div style="color: #888; font-size: 11px; margin-bottom: 10px;">
                    WorldInfo: ${book.entries.length} entries
                    Scan Depth: ${book.scan_depth || 50}
                    Token Budget: ${book.token_budget || 500}
                </div>
            `;

            // Sort entries by insertion order
            const sortedEntries = [...book.entries].sort((a, b) => 
                (a.insertion_order || 0) - (b.insertion_order || 0)
            );

            for (const entry of sortedEntries) {
                if (!entry.enabled && entry.enabled !== undefined) continue;
                
                const keys = Array.isArray(entry.keys) ? entry.keys : 
                            (entry.key ? [entry.key] : []);
                const keyDisplay = keys.join(', ') || '[No keys]';
                
                wiContent += `
                <div class="KLITECharacterManager-wi-entry">
                    <div class="KLITECharacterManager-wi-entry-header">
                        <div class="KLITECharacterManager-wi-keys">${this.helpers.Security.sanitizeHTML(keyDisplay)}</div>
                        <div class="KLITECharacterManager-wi-options">
                `;

                // Add entry properties
                if (entry.constant) {
                    wiContent += `<span>📌 Constant</span>`;
                }
                if (entry.selective) {
                    wiContent += `<span>🎯 Selective</span>`;
                }
                if (entry.case_sensitive) {
                    wiContent += `<span>Aa Case</span>`;
                }
                if (entry.priority && entry.priority !== 10) {
                    wiContent += `<span>P:${entry.priority}</span>`;
                }

                wiContent += `
                        </div>
                    </div>
                    <div class="KLITECharacterManager-wi-content">${this.helpers.Security.sanitizeHTML(entry.content || '[No content]')}</div>
                `;

                // Add secondary keys if present
                if (entry.secondary_keys && entry.secondary_keys.length > 0) {
                    wiContent += `
                    <div style="margin-top: 5px; font-size: 10px; color: #666;">
                        Secondary: ${this.helpers.Security.sanitizeHTML(entry.secondary_keys.join(', '))}
                    </div>
                    `;
                }

                // Add comment if present
                if (entry.comment) {
                    wiContent += `
                    <div style="margin-top: 5px; font-size: 10px; color: #666; font-style: italic;">
                        ${this.helpers.Security.sanitizeHTML(entry.comment)}
                    </div>
                    `;
                }

                wiContent += `</div>`;
            }

            fullscreenHTML += createSection(`Character Book / World Info (${book.name || 'Character Book'})`, wiContent, false);
        }

        fullscreenContent.innerHTML = fullscreenHTML;

        // Set up event listeners
        const fullscreenRatingDropdown = fullscreenContent.querySelector('#char-fullscreen-rating-dropdown');
        if (fullscreenRatingDropdown) {
            fullscreenRatingDropdown.addEventListener('change', async (e) => {
                const newRating = parseInt(e.target.value);
                character.rating = newRating;
                await this.IndexedDBManager.saveCharacter(character);
                this.updateGallery();
                this.updateRatingFilter();
            });
        }

        const fullscreenAddTagBtn = fullscreenContent.querySelector('.KLITECharacterManager-add-tag-btn');
        if (fullscreenAddTagBtn) {
            fullscreenAddTagBtn.addEventListener('click', () => {
                this.openTagModal(character.id);
            });
        }
        
        fullscreenView.classList.add('show');
    };

    // Also add helper method for removing tag
    PanelCharacterManager.prototype.removeTag = async function(characterId, tagToRemove) {
        const character = this.characters.find(c => c.id === characterId);
        if (character) {
            character.tags = character.tags.filter(tag => tag !== tagToRemove);
            await this.IndexedDBManager.saveCharacter(character);
            this.updateGallery();
            this.updateTagFilter();
            
            // Refresh fullscreen if it's the same character
            if (this.selectedCharacter && this.selectedCharacter.id === characterId) {
                this.openFullscreen(character);
            }
        }
    };

    // Add CSS for fullscreen-specific styles that might be missing
    const addFullscreenStyles = () => {
        const existingStyle = document.getElementById('character-manager-fullscreen-styles');
        if (existingStyle) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'character-manager-fullscreen-styles';
        styleElement.textContent = `
            /* Ensure fullscreen section styles are properly applied */
            .KLITECharacterManager-panel .KLITECharacterManager-character-header-tags .KLITECharacterManager-tag {
                cursor: default;
                user-select: none;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content {
                max-height: 400px;
                overflow-y: auto;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-wi-entry {
                position: relative;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar {
                width: 8px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-track {
                background: #2a2a2a;
                border-radius: 4px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }

            .KLITECharacterManager-panel .KLITECharacterManager-fullscreen-section-content::-webkit-scrollbar-thumb:hover {
                background: #666;
            }
        `;
        document.head.appendChild(styleElement);
    };

    // Ensure styles are added when Part 3 loads
    addFullscreenStyles();

    console.log('✅ KLITE Character Manager Part 3 loaded - Fullscreen implementation complete');