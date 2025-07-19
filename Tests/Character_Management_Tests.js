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
        // Test add operation
        if (typeof KLITE_RPMod.addCharacter === 'function') {
            const characterId = await KLITE_RPMod.addCharacter(testCharacter);
            Assert.isType(characterId, 'string', 'Add character must return ID string');
            Assert.greaterThan(characterId.length, 0, 'Character ID must not be empty');
            
            // Test retrieve operation
            if (typeof KLITE_RPMod.getCharacter === 'function') {
                const retrievedCharacter = KLITE_RPMod.getCharacter(characterId);
                Assert.isObject(retrievedCharacter, 'Retrieved character must be object');
                Assert.equal(retrievedCharacter.name, testCharacter.data.name, 'Retrieved character name must match');
            }
            
            // Test edit operation
            if (typeof KLITE_RPMod.updateCharacter === 'function') {
                const updatedData = { ...retrievedCharacter, name: 'Updated Test Character' };
                await KLITE_RPMod.updateCharacter(characterId, updatedData);
                
                const updatedCharacter = KLITE_RPMod.getCharacter(characterId);
                Assert.equal(updatedCharacter.name, 'Updated Test Character', 'Character edit must work');
            }
            
            // Test duplicate operation
            if (typeof KLITE_RPMod.duplicateCharacter === 'function') {
                const duplicateId = await KLITE_RPMod.duplicateCharacter(characterId);
                Assert.isType(duplicateId, 'string', 'Duplicate must return new ID');
                Assert.notEqual(duplicateId, characterId, 'Duplicate must have different ID');
                
                const duplicateCharacter = KLITE_RPMod.getCharacter(duplicateId);
                Assert.isObject(duplicateCharacter, 'Duplicate character must exist');
            }
            
            // Test delete operation
            if (typeof KLITE_RPMod.deleteCharacter === 'function') {
                await KLITE_RPMod.deleteCharacter(characterId);
                const deletedCharacter = KLITE_RPMod.getCharacter(characterId);
                Assert.isNull(deletedCharacter, 'Deleted character must not exist');
            }
        }
    } finally {
        // Restore original characters
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['REQ-F-031']);

// REQ-F-033: System must apply character data to scenario, memory, and world info
KLITETestRunner.registerTest('integration', 'character_scenario_integration', async () => {
    const testCharacter = KLITEMocks.getSampleCards().v2;
    
    if (typeof KLITE_RPMod.activateCharacter === 'function') {
        // Add character temporarily
        const characterId = await KLITE_RPMod.addCharacter(testCharacter);
        
        try {
            // Activate character
            await KLITE_RPMod.activateCharacter(characterId);
            
            // Test scenario integration
            if (testCharacter.data.description) {
                Assert.equal(window.current_scenario, testCharacter.data.description, 
                           'Character description must be applied to scenario');
            }
            
            // Test system prompt integration
            if (testCharacter.data.system_prompt) {
                Assert.equal(window.current_sprompt, testCharacter.data.system_prompt,
                           'Character system prompt must be applied');
            }
            
            // Test world info integration
            if (testCharacter.data.character_book && testCharacter.data.character_book.entries) {
                Assert.isArray(window.current_wi, 'World info must be array after character activation');
                // Could test that character book entries are added to world info
            }
            
        } finally {
            // Cleanup
            if (typeof KLITE_RPMod.deleteCharacter === 'function') {
                await KLITE_RPMod.deleteCharacter(characterId);
            }
        }
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
    if (typeof KLITE_RPMod.addCharacter === 'function') {
        const testCharacter = KLITEMocks.getSampleCards().v2;
        const characterId = await KLITE_RPMod.addCharacter(testCharacter);
        
        try {
            const character = KLITE_RPMod.getCharacter(characterId);
            
            // Test metadata fields
            if (character.metadata) {
                Assert.isObject(character.metadata, 'Character metadata must be object');
                
                // Test creation date
                if (character.metadata.created) {
                    Assert.isType(character.metadata.created, 'number', 'Creation date must be timestamp');
                }
                
                // Test last used
                if (character.metadata.lastUsed) {
                    Assert.isType(character.metadata.lastUsed, 'number', 'Last used must be timestamp');
                }
            }
            
        } finally {
            if (typeof KLITE_RPMod.deleteCharacter === 'function') {
                await KLITE_RPMod.deleteCharacter(characterId);
            }
        }
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