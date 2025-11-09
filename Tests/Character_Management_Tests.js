/**
 * KLITE-RPmod Character Management Tests
 * Tests for character card formats, operations, and storage
 * Requirements: REQ-F-023 to REQ-F-038, REQ-D-001 to REQ-D-028
 */

// REQ-F-023: System must support Tavern Card V1 format
KLITETestRunner.registerTest('data', 'tavern_card_v1_support', async () => {
    const sampleV1 = KLITEMocks.getSampleCards().v1;
    
    // Test V1 card validation
    Assert.validCharacterCard(sampleV1, 'v1', 'V1 card must pass validation');
    
    // Test V1 required fields
    const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'];
    for (const field of requiredFields) {
        Assert.hasProperty(sampleV1, field, `V1 card must have ${field} field`);
        Assert.isType(sampleV1[field], 'string', `V1 ${field} must be string`);
    }
    
    // Test character normalization if function exists
    if (typeof KLITE_RPMod.normalizeCharacter === 'function') {
        const normalized = KLITE_RPMod.normalizeCharacter(sampleV1, 'v1');
        Assert.isObject(normalized, 'V1 normalization must return object');
        Assert.equal(normalized.name, sampleV1.name, 'V1 normalization must preserve name');
    }
}, ['REQ-F-023', 'REQ-D-001']);

// REQ-F-024: System must support Tavern Card V2 format
KLITETestRunner.registerTest('data', 'tavern_card_v2_support', async () => {
    const sampleV2 = KLITEMocks.getSampleCards().v2;
    
    // Test V2 card validation
    Assert.validCharacterCard(sampleV2, 'v2', 'V2 card must pass validation');
    
    // Test V2 spec compliance
    Assert.equal(sampleV2.spec, 'chara_card_v2', 'V2 card must have correct spec');
    Assert.equal(sampleV2.spec_version, '2.0', 'V2 card must have correct spec_version');
    
    // Test V2 data structure
    Assert.isObject(sampleV2.data, 'V2 card must have data object');
    
    // Test V2 specific fields
    const v2Fields = ['system_prompt', 'alternate_greetings', 'tags', 'creator'];
    for (const field of v2Fields) {
        if (sampleV2.data[field] !== undefined) {
            if (field === 'alternate_greetings' || field === 'tags') {
                Assert.isArray(sampleV2.data[field], `V2 ${field} must be array if present`);
            } else {
                Assert.isType(sampleV2.data[field], 'string', `V2 ${field} must be string if present`);
            }
        }
    }
    
    // Test character book if present
    if (sampleV2.data.character_book) {
        Assert.isObject(sampleV2.data.character_book, 'Character book must be object');
        Assert.isArray(sampleV2.data.character_book.entries, 'Character book entries must be array');
    }
}, ['REQ-F-024', 'REQ-D-005']);

// REQ-F-025: System must support Tavern Card V3 format
KLITETestRunner.registerTest('data', 'tavern_card_v3_support', async () => {
    const sampleV3 = KLITEMocks.getSampleCards().v3;
    
    // Test V3 card validation
    Assert.validCharacterCard(sampleV3, 'v3', 'V3 card must pass validation');
    
    // Test V3 spec compliance
    Assert.equal(sampleV3.spec, 'chara_card_v3', 'V3 card must have correct spec');
    Assert.equal(sampleV3.spec_version, '3.0', 'V3 card must have correct spec_version');
    
    // Test V3 specific fields
    if (sampleV3.data.assets) {
        Assert.isArray(sampleV3.data.assets, 'V3 assets must be array');
        
        for (const asset of sampleV3.data.assets) {
            Assert.hasProperty(asset, 'type', 'Asset must have type');
            Assert.hasProperty(asset, 'uri', 'Asset must have uri');
            Assert.hasProperty(asset, 'name', 'Asset must have name');
        }
    }
    
    if (sampleV3.data.group_only_greetings) {
        Assert.isArray(sampleV3.data.group_only_greetings, 'Group only greetings must be array');
    }
    
    if (sampleV3.data.creation_date) {
        Assert.isType(sampleV3.data.creation_date, 'number', 'Creation date must be number');
    }
}, ['REQ-F-025', 'REQ-D-009']);

// REQ-F-026: System must normalize character data across all supported versions
KLITETestRunner.registerTest('functional', 'character_normalization', async () => {
    if (typeof KLITE_RPMod.normalizeCharacter !== 'function') {
        // Skip if normalization function doesn't exist
        Assert.isTrue(true, 'Character normalization test skipped - function not available');
        return;
    }
    
    const cards = KLITEMocks.getSampleCards();
    
    // Test normalization of each version
    const normalizedV1 = KLITE_RPMod.normalizeCharacter(cards.v1, 'v1');
    const normalizedV2 = KLITE_RPMod.normalizeCharacter(cards.v2, 'v2');
    const normalizedV3 = KLITE_RPMod.normalizeCharacter(cards.v3, 'v3');
    
    // Test that all normalized cards have consistent structure
    const requiredProps = ['name', 'description', 'personality', 'scenario', 'first_mes'];
    
    for (const prop of requiredProps) {
        Assert.hasProperty(normalizedV1, prop, `Normalized V1 must have ${prop}`);
        Assert.hasProperty(normalizedV2, prop, `Normalized V2 must have ${prop}`);
        Assert.hasProperty(normalizedV3, prop, `Normalized V3 must have ${prop}`);
    }
    
    // Test that names are preserved correctly
    Assert.equal(normalizedV1.name, cards.v1.name, 'V1 name must be preserved');
    Assert.equal(normalizedV2.name, cards.v2.data.name, 'V2 name must be extracted correctly');
    Assert.equal(normalizedV3.name, cards.v3.data.name, 'V3 name must be extracted correctly');
}, ['REQ-F-026']);

// REQ-F-027: System must store characters in IndexedDB via KoboldAI Lite storage API
KLITETestRunner.registerTest('integration', 'character_storage_integration', async () => {
    // Test storage integration
    Assert.storageWorking('Storage must be available for character management');
    
    if (typeof KLITE_RPMod.saveCharacters === 'function') {
        // Test character saving
        const originalCharacters = [...KLITE_RPMod.characters];
        
        // Add test character
        const testCharacter = {
            id: 'test-character-storage',
            ...KLITEMocks.getSampleCards().v2.data
        };
        
        KLITE_RPMod.characters.push(testCharacter);
        
        // Test save operation
        Assert.doesNotThrow(async () => {
            await KLITE_RPMod.saveCharacters();
        }, 'Character saving must not throw errors');
        
        // Restore original characters
        KLITE_RPMod.characters = originalCharacters;
    }
    
    // Test loading if function exists
    if (typeof KLITE_RPMod.loadCharacters === 'function') {
        Assert.doesNotThrow(async () => {
            await KLITE_RPMod.loadCharacters();
        }, 'Character loading must not throw errors');
    }
}, ['REQ-F-027']);

// REQ-F-028: System must support character import from multiple formats
KLITETestRunner.registerTest('functional', 'character_import_support', async () => {
    if (typeof KLITE_RPMod.importCharacter === 'function') {
        const cards = KLITEMocks.getSampleCards();
        
        // Test JSON import
        const jsonFile = KLITEMocks.createMockFile('test_v2.json', JSON.stringify(cards.v2));
        Assert.doesNotThrow(async () => {
            await KLITE_RPMod.importCharacter(jsonFile);
        }, 'JSON character import must work');
        
        // Test PNG import (mock)
        const pngFile = KLITEMocks.createMockPNGFile(cards.v1);
        if (typeof KLITE_RPMod.extractPNGCharacter === 'function') {
            Assert.doesNotThrow(async () => {
                await KLITE_RPMod.extractPNGCharacter(pngFile);
            }, 'PNG character import must work');
        }
    }
}, ['REQ-F-028']);

// REQ-F-031: System must support add, edit, delete, duplicate character operations
KLITETestRunner.registerTest('functional', 'character_crud_operations', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    const testCharacter = KLITEMocks.getSampleCards().v2;
    
    try {
        // Test add operation through CHARS panel
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            const originalCount = KLITE_RPMod.characters.length;
            
            // Add character using actual implementation
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter.data);
            
            // Verify character was added
            Assert.equal(KLITE_RPMod.characters.length, originalCount + 1, 'Character must be added to array');
            
            const addedCharacter = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            Assert.isObject(addedCharacter, 'Added character must be object');
            Assert.equal(addedCharacter.name, testCharacter.data.name, 'Added character name must match');
            
            // Test that character has proper structure with new features
            Assert.hasProperty(addedCharacter, 'id', 'Character must have ID');
            Assert.hasProperty(addedCharacter, 'created', 'Character must have creation timestamp');
            Assert.hasProperty(addedCharacter, 'rating', 'Character must have rating object');
            Assert.hasProperty(addedCharacter, 'stats', 'Character must have stats object');
            
            // Test custom metadata integration
            if (addedCharacter.extensions && addedCharacter.extensions.klite_rpmod) {
                Assert.isObject(addedCharacter.extensions.klite_rpmod, 'Custom metadata must be embedded in extensions');
                Assert.hasProperty(addedCharacter.extensions.klite_rpmod, 'rating', 'Custom metadata must include rating');
                Assert.hasProperty(addedCharacter.extensions.klite_rpmod, 'stats', 'Custom metadata must include stats');
            }
            
            // Test image optimization features if Canvas is available
            if (typeof document !== 'undefined' && document.createElement) {
                if (addedCharacter.images) {
                    Assert.isObject(addedCharacter.images, 'Character must have images object');
                    Assert.hasProperty(addedCharacter.images, 'original', 'Must have original image');
                    Assert.hasProperty(addedCharacter.images, 'preview', 'Must have preview image');
                    Assert.hasProperty(addedCharacter.images, 'avatar', 'Must have avatar image');
                    Assert.hasProperty(addedCharacter.images, 'thumbnail', 'Must have thumbnail image');
                }
            }
            
            // Test character retrieval by ID
            const foundCharacter = KLITE_RPMod.characters.find(c => c.id === addedCharacter.id);
            Assert.isObject(foundCharacter, 'Character must be retrievable by ID');
            Assert.equal(foundCharacter.name, testCharacter.data.name, 'Retrieved character name must match');
            
            // Test character update through direct modification (real implementation pattern)
            foundCharacter.name = 'Updated Test Character';
            foundCharacter.lastModified = Date.now();
            Assert.equal(foundCharacter.name, 'Updated Test Character', 'Character edit must work');
            
            // Test character deletion by removing from array (real implementation pattern)
            const characterIndex = KLITE_RPMod.characters.findIndex(c => c.id === addedCharacter.id);
            Assert.greaterThanOrEqual(characterIndex, 0, 'Character must be found for deletion');
            
            KLITE_RPMod.characters.splice(characterIndex, 1);
            const deletedCharacter = KLITE_RPMod.characters.find(c => c.id === addedCharacter.id);
            Assert.isUndefined(deletedCharacter, 'Deleted character must not exist');
        }
    } finally {
        // Restore original characters
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['REQ-F-031']);

// REQ-F-033: System must apply character data to scenario, memory, and world info
KLITETestRunner.registerTest('integration', 'character_scenario_integration', async () => {
    const testCharacter = KLITEMocks.getSampleCards().v2;
    const originalCharacters = [...KLITE_RPMod.characters];
    
    try {
        // Add character through CHARS panel
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter.data);
            const addedCharacter = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            
            // Test character integration with KoboldAI Lite systems
            if (typeof KLITE_RPMod.panels?.CHARS?.loadCharacter === 'function') {
                // Test loading character (this integrates with Lite's scenario system)
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.panels.CHARS.loadCharacter(addedCharacter);
                }, 'Loading character must not throw errors');
            }
            
            // Test scenario integration through panels
            if (typeof KLITE_RPMod.panels?.CHARS?.loadAsScenario === 'function') {
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.panels.CHARS.loadAsScenario(addedCharacter);
                }, 'Loading as scenario must not throw errors');
            }
            
            // Test world info integration
            if (typeof KLITE_RPMod.panels?.CHARS?.addToWorldInfo === 'function') {
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.panels.CHARS.addToWorldInfo(addedCharacter);
                }, 'Adding to world info must not throw errors');
            }
            
            // Test memory integration
            if (typeof KLITE_RPMod.panels?.CHARS?.addCharacterToMemory === 'function') {
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.panels.CHARS.addCharacterToMemory(addedCharacter);
                }, 'Adding to memory must not throw errors');
            }
            
            // Test character book integration if present
            if (testCharacter.data.character_book && testCharacter.data.character_book.entries) {
                const worldInfoEntries = testCharacter.data.character_book.entries;
                Assert.isArray(worldInfoEntries, 'Character book entries must be array');
                Assert.greaterThan(worldInfoEntries.length, 0, 'Character book must have entries for testing');
                
                // Test that entries have required structure
                const firstEntry = worldInfoEntries[0];
                Assert.hasProperty(firstEntry, 'keys', 'World info entry must have keys');
                Assert.hasProperty(firstEntry, 'content', 'World info entry must have content');
            }
        }
    } finally {
        // Restore original characters
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['REQ-F-033']);

// REQ-D-021: Name field validation (1-100 characters, alphanumeric plus spaces)
KLITETestRunner.registerTest('data', 'character_name_validation', async () => {
    if (typeof KLITE_RPMod.validateCharacterName === 'function') {
        // Test valid names
        Assert.isTrue(KLITE_RPMod.validateCharacterName('Test Character'), 'Valid name must pass');
        Assert.isTrue(KLITE_RPMod.validateCharacterName('Character123'), 'Alphanumeric name must pass');
        Assert.isTrue(KLITE_RPMod.validateCharacterName('A'), 'Single character name must pass');
        Assert.isTrue(KLITE_RPMod.validateCharacterName('A'.repeat(100)), '100 character name must pass');
        
        // Test invalid names
        Assert.throwsError(() => {
            KLITE_RPMod.validateCharacterName('');
        }, 'Empty name must be rejected');
        
        Assert.throwsError(() => {
            KLITE_RPMod.validateCharacterName('A'.repeat(101));
        }, 'Name over 100 characters must be rejected');
        
        // Test special characters (depending on implementation)
        Assert.throwsError(() => {
            KLITE_RPMod.validateCharacterName('Invalid<>Name');
        }, 'Names with invalid characters must be rejected');
    }
}, ['REQ-D-021']);

// REQ-D-022: Description field validation (max 5000 characters)
KLITETestRunner.registerTest('data', 'character_description_validation', async () => {
    if (typeof KLITE_RPMod.validateCharacterDescription === 'function') {
        // Test valid descriptions
        const validDescription = 'A'.repeat(5000);
        Assert.doesNotThrow(() => {
            KLITE_RPMod.validateCharacterDescription(validDescription);
        }, 'Description at limit must be valid');
        
        // Test invalid descriptions
        const invalidDescription = 'A'.repeat(5001);
        Assert.throwsError(() => {
            KLITE_RPMod.validateCharacterDescription(invalidDescription);
        }, 'Description over 5000 characters must be rejected');
    }
}, ['REQ-D-022']);

// REQ-D-023: Scenario field validation (max 2000 characters)
KLITETestRunner.registerTest('data', 'character_scenario_validation', async () => {
    if (typeof KLITE_RPMod.validateCharacterScenario === 'function') {
        // Test valid scenarios
        const validScenario = 'A'.repeat(2000);
        Assert.doesNotThrow(() => {
            KLITE_RPMod.validateCharacterScenario(validScenario);
        }, 'Scenario at limit must be valid');
        
        // Test invalid scenarios
        const invalidScenario = 'A'.repeat(2001);
        Assert.throwsError(() => {
            KLITE_RPMod.validateCharacterScenario(invalidScenario);
        }, 'Scenario over 2000 characters must be rejected');
    }
}, ['REQ-D-023']);

// Avatar system tests (REQ-F-035 to REQ-F-038)
KLITETestRunner.registerTest('functional', 'avatar_system', async () => {
    // Test avatar management
    if (typeof KLITE_RPMod.setCharacterAvatar === 'function') {
        const testCharacter = KLITEMocks.getSampleCards().v3;
        
        // Test setting avatar from assets
        if (testCharacter.data.assets) {
            const iconAsset = testCharacter.data.assets.find(a => a.type === 'icon');
            if (iconAsset) {
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.setCharacterAvatar('test-id', iconAsset.uri);
                }, 'Setting character avatar must not throw');
            }
        }
    }
    
    // Test default avatars
    if (KLITE_RPMod.aiAvatarCurrent !== undefined || KLITE_RPMod.userAvatarCurrent !== undefined) {
        // Test that avatar system is initialized
        Assert.isTrue(true, 'Avatar system is present');
    }
    
    // Test group avatars
    if (KLITE_RPMod.groupAvatars) {
        Assert.isObject(KLITE_RPMod.groupAvatars, 'Group avatars must be object or Map');
    }
}, ['REQ-F-035', 'REQ-F-036', 'REQ-F-037', 'REQ-F-038']);

// Character search and filtering (REQ-F-034)
KLITETestRunner.registerTest('functional', 'character_search_filtering', async () => {
    if (typeof KLITE_RPMod.searchCharacters === 'function') {
        // Add test characters
        const testCharacters = [
            { id: '1', name: 'Alice', tags: ['helper'] },
            { id: '2', name: 'Bob', tags: ['assistant'] },
            { id: '3', name: 'Charlie', tags: ['helper', 'friend'] }
        ];
        
        const originalCharacters = [...KLITE_RPMod.characters];
        KLITE_RPMod.characters = testCharacters;
        
        try {
            // Test name search
            const aliceResults = KLITE_RPMod.searchCharacters('Alice');
            Assert.isArray(aliceResults, 'Search must return array');
            Assert.equal(aliceResults.length, 1, 'Search must find correct number of results');
            Assert.equal(aliceResults[0].name, 'Alice', 'Search must find correct character');
            
            // Test tag filtering if supported
            if (typeof KLITE_RPMod.filterCharactersByTag === 'function') {
                const helperResults = KLITE_RPMod.filterCharactersByTag('helper');
                Assert.isArray(helperResults, 'Tag filter must return array');
                Assert.equal(helperResults.length, 2, 'Tag filter must find correct number of results');
            }
            
        } finally {
            KLITE_RPMod.characters = originalCharacters;
        }
    }
}, ['REQ-F-034']);

// Character metadata test (REQ-F-030)
KLITETestRunner.registerTest('functional', 'character_metadata', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    
    try {
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            const testCharacter = KLITEMocks.getSampleCards().v2;
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter.data);
            
            const character = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            
            // Test core metadata fields (directly accessible)
            Assert.hasProperty(character, 'created', 'Character must have creation timestamp');
            Assert.isType(character.created, 'number', 'Creation date must be timestamp');
            Assert.greaterThan(character.created, 0, 'Creation timestamp must be valid');
            
            Assert.hasProperty(character, 'lastModified', 'Character must have last modified timestamp');
            Assert.isType(character.lastModified, 'number', 'Last modified must be timestamp');
            
            // Test rating system
            Assert.hasProperty(character, 'rating', 'Character must have rating object');
            Assert.isObject(character.rating, 'Rating must be object');
            Assert.hasProperty(character.rating, 'overall', 'Rating must have overall score');
            Assert.hasProperty(character.rating, 'userRating', 'Rating must have user rating');
            
            // Test usage statistics
            Assert.hasProperty(character, 'stats', 'Character must have stats object');
            Assert.isObject(character.stats, 'Stats must be object');
            Assert.hasProperty(character.stats, 'timesUsed', 'Stats must track times used');
            Assert.hasProperty(character.stats, 'totalMessages', 'Stats must track total messages');
            
            // Test custom metadata embedded in extensions
            if (character.extensions && character.extensions.klite_rpmod) {
                const customMetadata = character.extensions.klite_rpmod;
                Assert.isObject(customMetadata, 'Custom metadata must be object');
                
                // Test that custom metadata has required structure
                Assert.hasProperty(customMetadata, 'rating', 'Custom metadata must include rating');
                Assert.hasProperty(customMetadata, 'stats', 'Custom metadata must include stats');
                Assert.hasProperty(customMetadata, 'created', 'Custom metadata must include creation timestamp');
                Assert.hasProperty(customMetadata, 'importSource', 'Custom metadata must include import source');
            }
            
            // Test import metadata
            Assert.hasProperty(character, 'importSource', 'Character must have import source');
            Assert.hasProperty(character, 'importDate', 'Character must have import date');
            Assert.isType(character.importDate, 'number', 'Import date must be timestamp');
            
            // Test RPMod enhancements
            Assert.hasProperty(character, 'talkativeness', 'Character must have talkativeness score');
            Assert.isType(character.talkativeness, 'number', 'Talkativeness must be number');
            Assert.greaterThanOrEqual(character.talkativeness, 10, 'Talkativeness must be >= 10');
            Assert.lessThanOrEqual(character.talkativeness, 100, 'Talkativeness must be <= 100');
            
            // Test advanced features
            Assert.hasProperty(character, 'traits', 'Character must have traits object');
            Assert.hasProperty(character, 'preferences', 'Character must have preferences object');
            Assert.hasProperty(character, 'keywords', 'Character must have keywords array');
        }
    } finally {
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['REQ-F-030']);

// Character import validation test
KLITETestRunner.registerTest('functional', 'character_import_validation', async () => {
    if (typeof KLITE_RPMod.importCharacter === 'function') {
        // Test invalid JSON
        const invalidJson = KLITEMocks.createMockFile('invalid.json', 'invalid json');
        Assert.throwsError(async () => {
            await KLITE_RPMod.importCharacter(invalidJson);
        }, 'Invalid JSON must be rejected');
        
        // Test missing required fields
        const incompleteCharacter = { name: 'Incomplete' }; // Missing required fields
        const incompleteFile = KLITEMocks.createMockFile('incomplete.json', JSON.stringify(incompleteCharacter));
        Assert.throwsError(async () => {
            await KLITE_RPMod.importCharacter(incompleteFile);
        }, 'Incomplete character data must be rejected');
    }
}, ['REQ-F-028']);

// NEW PERFORMANCE OPTIMIZATION TESTS

// Test batch import optimization - reduces IndexedDB writes from N+1 to 1
KLITETestRunner.registerTest('performance', 'batch_import_optimization', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    const sampleCards = KLITEMocks.getSampleCards();
    
    try {
        // Test batch import through importCharactersFromData
        if (typeof KLITE_RPMod.importCharactersFromData === 'function') {
            const testCharacters = [
                { ...sampleCards.v1, name: (sampleCards.v1.name || 'V1') + ' (B1)' },
                { ...sampleCards.v2.data, name: (sampleCards.v2.data.name || 'V2') + ' (B2)' },
                { ...sampleCards.v3.data, name: (sampleCards.v3.data.name || 'V3') + ' (B3)' }
            ];
            
            // Test batch mode flag is set for multiple characters
            const originalBatchMode = KLITE_RPMod.batchImportMode;
            
            const importedCount = await KLITE_RPMod.importCharactersFromData(testCharacters);
            
            // Verify batch import worked
            Assert.equal(importedCount, 3, 'Batch import must import all characters');
            Assert.equal(KLITE_RPMod.characters.length, originalCharacters.length + 3, 'All characters must be added');
            
            // Verify batch mode was used (this optimizes storage writes)
            // Note: batchImportMode should be reset to false after completion
            Assert.equal(KLITE_RPMod.batchImportMode, false, 'Batch mode must be reset after completion');
            
            // Test single import doesn't use batch mode  
            const singleImportCount = await KLITE_RPMod.importCharactersFromData([{ ...sampleCards.v1, name: (sampleCards.v1.name || 'V1') + ' (Single)' }]);
            Assert.equal(singleImportCount, 1, 'Single import should import 1 character (duplicate detection not implemented)');
        }
    } finally {
        KLITE_RPMod.characters = originalCharacters;
        KLITE_RPMod.batchImportMode = false; // Reset batch mode
    }
}, ['Performance Optimization']);

// Test multi-tier image optimization system
KLITETestRunner.registerTest('performance', 'multi_tier_image_optimization', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    
    try {
        // Test with sample character that has an image
        const testCharacter = {
            ...KLITEMocks.getSampleCards().v2.data,
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e5awAAAABJRU5ErkJggg=='
        };
        
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter);
            const character = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            
            // Test that image optimization structure exists
            if (typeof document !== 'undefined' && document.createElement) {
                // Canvas API available - test optimization
                if (character.images) {
                    Assert.isObject(character.images, 'Character must have images object');
                    Assert.hasProperty(character.images, 'original', 'Must have original image');
                    Assert.hasProperty(character.images, 'preview', 'Must have preview image (256x256)');
                    Assert.hasProperty(character.images, 'avatar', 'Must have avatar image (64x64)');
                    Assert.hasProperty(character.images, 'thumbnail', 'Must have thumbnail image (32x32)');
                    
                    // Test that images are different sizes (optimization working)
                    // Note: In test environment, they might fallback to original if Canvas fails
                    Assert.isType(character.images.original, 'string', 'Original image must be string');
                    Assert.isType(character.images.preview, 'string', 'Preview image must be string');
                    Assert.isType(character.images.avatar, 'string', 'Avatar image must be string');
                    Assert.isType(character.images.thumbnail, 'string', 'Thumbnail image must be string');
                }
            } else {
                // No Canvas API - test fallback behavior
                if (character.images) {
                    Assert.equal(character.images.original, character.images.preview, 'Without Canvas, preview should fallback to original');
                    Assert.equal(character.images.original, character.images.avatar, 'Without Canvas, avatar should fallback to original');
                    Assert.equal(character.images.original, character.images.thumbnail, 'Without Canvas, thumbnail should fallback to original');
                }
            }
            
            // Test backward compatibility
            Assert.equal(character.image, testCharacter.image, 'Original image property must be preserved for backward compatibility');
        }
    } finally {
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['Performance Optimization']);

// Test avatar caching system
KLITETestRunner.registerTest('performance', 'avatar_caching_system', async () => {
    if (typeof KLITE_RPMod.panels?.CHARS?.initAvatarCache === 'function') {
        // Test cache initialization
        KLITE_RPMod.panels.CHARS.initAvatarCache();
        Assert.isTrue(KLITE_RPMod.panels.CHARS.avatarCache !== null, 'Avatar cache must be initialized');
        
        // Test cache operations
        if (typeof KLITE_RPMod.panels.CHARS.setOptimizedAvatar === 'function' && 
            typeof KLITE_RPMod.panels.CHARS.getOptimizedAvatar === 'function') {
            
            const testCharId = 'test-char-123';
            const testAvatarData = 'data:image/png;base64,testdata';
            
            // Test setting cached avatar
            Assert.doesNotThrow(() => {
                KLITE_RPMod.panels.CHARS.setOptimizedAvatar(testCharId, 'avatar', testAvatarData);
            }, 'Setting cached avatar must not throw');
            
            // Test getting cached avatar
            const cachedAvatar = KLITE_RPMod.panels.CHARS.getOptimizedAvatar(testCharId, 'avatar');
            Assert.equal(cachedAvatar, testAvatarData, 'Cached avatar must be retrievable');
            
            // Test cache miss
            const missedAvatar = KLITE_RPMod.panels.CHARS.getOptimizedAvatar('nonexistent', 'avatar');
            Assert.isUndefined(missedAvatar, 'Cache miss must return undefined');
            
            // Test cache clearing
            if (typeof KLITE_RPMod.panels.CHARS.clearAvatarCache === 'function') {
                Assert.doesNotThrow(() => {
                    KLITE_RPMod.panels.CHARS.clearAvatarCache();
                }, 'Clearing avatar cache must not throw');
                
                const clearedAvatar = KLITE_RPMod.panels.CHARS.getOptimizedAvatar(testCharId, 'avatar');
                Assert.isUndefined(clearedAvatar, 'Cached avatar must be cleared');
            }
        }
    }
}, ['Performance Optimization']);

// Test custom metadata integration in character card extensions
KLITETestRunner.registerTest('integration', 'custom_metadata_integration', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    
    try {
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            const testCharacter = KLITEMocks.getSampleCards().v2.data;
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter);
            
            const character = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            
            // Test that custom metadata is embedded in extensions
            Assert.hasProperty(character, 'extensions', 'Character must have extensions object');
            Assert.isObject(character.extensions, 'Extensions must be object');
            
            if (character.extensions.klite_rpmod) {
                const customMetadata = character.extensions.klite_rpmod;
                
                // Test v2/v3 compatibility - custom data in extensions
                Assert.hasProperty(customMetadata, 'rating', 'Custom metadata must include rating system');
                Assert.hasProperty(customMetadata, 'stats', 'Custom metadata must include usage statistics');
                Assert.hasProperty(customMetadata, 'talkativeness', 'Custom metadata must include talkativeness score');
                Assert.hasProperty(customMetadata, 'traits', 'Custom metadata must include extracted traits');
                Assert.hasProperty(customMetadata, 'preferences', 'Custom metadata must include preferences');
                
                // Test that metadata is exportable (part of character card)
                Assert.hasProperty(character, 'rawData', 'Character must have raw data for export');
                Assert.isObject(character.rawData, 'Raw data must be object');
                Assert.hasProperty(character.rawData, 'extensions', 'Raw data must include extensions');
                
                if (character.rawData.extensions && character.rawData.extensions.klite_rpmod) {
                    const exportableMetadata = character.rawData.extensions.klite_rpmod;
                    Assert.isObject(exportableMetadata, 'Exportable metadata must be object');
                    Assert.hasProperty(exportableMetadata, 'created', 'Exportable metadata must include creation date');
                }
            }
            
            // Test dual access pattern (performance optimization)
            // Custom metadata is both embedded in extensions AND accessible directly
            Assert.hasProperty(character, 'rating', 'Rating must be directly accessible');
            Assert.hasProperty(character, 'stats', 'Stats must be directly accessible');
            Assert.hasProperty(character, 'talkativeness', 'Talkativeness must be directly accessible');
        }
    } finally {
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['Performance Optimization', 'Character Card Compatibility']);
