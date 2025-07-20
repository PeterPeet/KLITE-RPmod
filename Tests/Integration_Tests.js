/**
 * KLITE-RPmod Integration Tests
 * Tests for KoboldAI Lite integration, LiteAPI, and DOMUtil validation
 * Requirements: REQ-I-001 to REQ-I-033, LiteAPI & DOMUtil validation
 */

// REQ-I-001: System must integrate with window.localsettings for generation parameters
KLITETestRunner.registerTest('integration', 'localsettings_integration', async () => {
    Assert.liteIntegrationWorking('settings', 'LiteAPI settings integration must work');
    
    // Test settings access
    const settings = LiteAPI.settings;
    Assert.isObject(settings, 'LiteAPI.settings must return object');
    
    // Test parameter access
    const requiredParams = ['temperature', 'top_p', 'top_k', 'min_p', 'rep_pen', 'max_length'];
    for (const param of requiredParams) {
        Assert.hasProperty(settings, param, `Settings must have ${param} parameter`);
        Assert.isType(settings[param], 'number', `${param} must be number`);
    }
    
    // Test parameter validation through LiteAPI
    if (typeof LiteAPI.updateSettings === 'function') {
        const testSettings = { temperature: 0.8, top_p: 0.9 };
        Assert.doesNotThrow(() => {
            LiteAPI.updateSettings(testSettings);
        }, 'LiteAPI.updateSettings must not throw with valid settings');
        
        // Verify integration with window.localsettings
        Assert.equal(window.localsettings.temperature, 0.8, 'Settings must sync to window.localsettings');
        Assert.equal(window.localsettings.top_p, 0.9, 'Settings must sync to window.localsettings');
    }
}, ['REQ-I-001']);

// REQ-I-002: System must sync with window.current_memory and window.memorytext
KLITETestRunner.registerTest('integration', 'memory_integration', async () => {
    Assert.liteIntegrationWorking('memory', 'LiteAPI memory integration must work');
    
    // Test memory getter
    const originalMemory = LiteAPI.memory;
    Assert.isType(originalMemory, 'string', 'LiteAPI.memory must return string');
    
    // Test memory setter
    const testMemory = 'This is a test memory content for integration testing.';
    LiteAPI.memory = testMemory;
    
    Assert.equal(LiteAPI.memory, testMemory, 'LiteAPI.memory setter must work');
    Assert.equal(window.current_memory, testMemory, 'Memory must sync to window.current_memory');
    
    // Test memorytext element sync if it exists
    const memoryElement = document.getElementById('memorytext');
    if (memoryElement) {
        Assert.equal(memoryElement.value, testMemory, 'Memory must sync to memorytext element');
    }
    
    // Test invalid memory (non-string)
    LiteAPI.memory = 123; // Should be ignored or converted
    Assert.isType(LiteAPI.memory, 'string', 'LiteAPI.memory must always return string');
    
    // Restore original memory
    LiteAPI.memory = originalMemory;
}, ['REQ-I-002']);

// REQ-I-003: System must integrate with window.current_wi and window.pending_wi_obj
KLITETestRunner.registerTest('integration', 'worldinfo_integration', async () => {
    Assert.liteIntegrationWorking('worldInfo', 'LiteAPI worldInfo integration must work');
    
    // Test worldInfo getter
    const originalWI = LiteAPI.worldInfo;
    Assert.isArray(originalWI, 'LiteAPI.worldInfo must return array');
    
    // Test worldInfo setter
    const testWI = [
        { keys: ['test'], content: 'Test world info entry', enabled: true, order: 1 },
        { keys: ['example'], content: 'Example world info entry', enabled: true, order: 2 }
    ];
    
    LiteAPI.worldInfo = testWI;
    
    Assert.isArray(LiteAPI.worldInfo, 'LiteAPI.worldInfo setter must maintain array type');
    Assert.equal(LiteAPI.worldInfo.length, 2, 'LiteAPI.worldInfo must have correct length');
    Assert.equal(window.current_wi.length, 2, 'World info must sync to window.current_wi');
    
    // Test world info entry structure
    const firstEntry = LiteAPI.worldInfo[0];
    Assert.hasProperty(firstEntry, 'keys', 'World info entry must have keys');
    Assert.hasProperty(firstEntry, 'content', 'World info entry must have content');
    Assert.isArray(firstEntry.keys, 'World info keys must be array');
    
    // Test invalid worldInfo (non-array)
    LiteAPI.worldInfo = 'invalid';
    Assert.isArray(LiteAPI.worldInfo, 'LiteAPI.worldInfo must always return array');
    
    // Restore original world info
    LiteAPI.worldInfo = originalWI;
}, ['REQ-I-003']);

// LiteAPI availability and error handling
KLITETestRunner.registerTest('integration', 'liteapi_availability', async () => {
    // Test LiteAPI.isAvailable()
    Assert.isFunction(LiteAPI.isAvailable, 'LiteAPI.isAvailable must be function');
    
    const isAvailable = LiteAPI.isAvailable();
    Assert.isType(isAvailable, 'boolean', 'LiteAPI.isAvailable must return boolean');
    
    if (isAvailable) {
        // Test that all required components are available
        Assert.isObject(LiteAPI.settings, 'Settings must be available when LiteAPI is available');
        Assert.isObject(LiteAPI.storage, 'Storage must be available when LiteAPI is available');
        Assert.isFunction(LiteAPI.generate, 'Generate function must be available when LiteAPI is available');
    }
    
    // Test storage component
    const storage = LiteAPI.storage;
    Assert.isObject(storage, 'LiteAPI.storage must be object');
    Assert.hasProperty(storage, 'save', 'Storage must have save method');
    Assert.hasProperty(storage, 'load', 'Storage must have load method');
    
    if (storage.save) {
        Assert.isFunction(storage.save, 'Storage.save must be function');
    }
    if (storage.load) {
        Assert.isFunction(storage.load, 'Storage.load must be function');
    }
}, ['REQ-I-004']);

// LiteAPI generation integration
KLITETestRunner.registerTest('integration', 'liteapi_generation', async () => {
    // Test generation function
    Assert.isFunction(LiteAPI.generate, 'LiteAPI.generate must be function');
    
    // Test generate with parameters
    Assert.doesNotThrow(() => {
        LiteAPI.generate('Test prompt');
    }, 'LiteAPI.generate must not throw with valid prompt');
    
    // Test generate with invalid parameters
    Assert.doesNotThrow(() => {
        LiteAPI.generate(null); // Should handle gracefully
    }, 'LiteAPI.generate must handle invalid input gracefully');
    
    Assert.doesNotThrow(() => {
        LiteAPI.generate(); // Should handle missing parameters
    }, 'LiteAPI.generate must handle missing parameters gracefully');
}, ['REQ-I-004']);

// DOMUtil safe element access
KLITETestRunner.registerTest('integration', 'domutil_safe_access', async () => {
    // Test DOMUtil.safeGet
    Assert.isFunction(DOMUtil.safeGet, 'DOMUtil.safeGet must be function');
    
    // Create test element
    const testElement = document.createElement('div');
    testElement.id = 'test-domutil-element';
    document.body.appendChild(testElement);
    
    try {
        // Test safe get with existing element
        const element = DOMUtil.safeGet('test-domutil-element');
        Assert.equal(element, testElement, 'DOMUtil.safeGet must return correct element');
        
        // Test safe get with non-existent element
        const nonExistentElement = DOMUtil.safeGet('non-existent-element');
        Assert.isNull(nonExistentElement, 'DOMUtil.safeGet must return null for non-existent elements');
        
        // Test safe query
        Assert.isFunction(DOMUtil.safeQuery, 'DOMUtil.safeQuery must be function');
        const queriedElement = DOMUtil.safeQuery('#test-domutil-element');
        Assert.equal(queriedElement, testElement, 'DOMUtil.safeQuery must return correct element');
        
        // Test safe query all
        Assert.isFunction(DOMUtil.safeQueryAll, 'DOMUtil.safeQueryAll must be function');
        const allElements = DOMUtil.safeQueryAll('div');
        Assert.isArray(allElements, 'DOMUtil.safeQueryAll must return array');
        Assert.arrayContains(allElements, testElement, 'DOMUtil.safeQueryAll must include test element');
        
    } finally {
        // Cleanup test element
        document.body.removeChild(testElement);
    }
}, ['REQ-I-026', 'REQ-I-027']);

// DOMUtil safe property setting
KLITETestRunner.registerTest('integration', 'domutil_safe_setting', async () => {
    // Test DOMUtil.safeSet
    Assert.isFunction(DOMUtil.safeSet, 'DOMUtil.safeSet must be function');
    
    // Create test element
    const testElement = document.createElement('div');
    testElement.id = 'test-domutil-set';
    document.body.appendChild(testElement);
    
    try {
        // Test safe property setting
        Assert.doesNotThrow(() => {
            DOMUtil.safeSet('test-domutil-set', 'textContent', 'Test Content');
        }, 'DOMUtil.safeSet must not throw with valid parameters');
        
        Assert.equal(testElement.textContent, 'Test Content', 'DOMUtil.safeSet must set property correctly');
        
        // Test safe setting on non-existent element
        Assert.doesNotThrow(() => {
            DOMUtil.safeSet('non-existent-element', 'textContent', 'Test');
        }, 'DOMUtil.safeSet must handle non-existent elements gracefully');
        
        // Test safe method calls
        Assert.isFunction(DOMUtil.safeCall, 'DOMUtil.safeCall must be function');
        Assert.doesNotThrow(() => {
            DOMUtil.safeCall('test-domutil-set', 'setAttribute', 'data-test', 'value');
        }, 'DOMUtil.safeCall must not throw with valid parameters');
        
        Assert.equal(testElement.getAttribute('data-test'), 'value', 'DOMUtil.safeCall must call method correctly');
        
    } finally {
        // Cleanup test element
        document.body.removeChild(testElement);
    }
}, ['REQ-I-026']);

// Storage integration through LiteAPI
KLITETestRunner.registerTest('integration', 'storage_integration_liteapi', async () => {
    const storage = LiteAPI.storage;
    
    if (storage.save && storage.load) {
        // Test storage round-trip
        const testKey = 'klite_test_storage';
        const testData = {
            characters: ['test1', 'test2'],
            settings: { temperature: 0.7 },
            timestamp: Date.now()
        };
        
        // Test save
        await storage.save(testKey, testData);
        
        // Test load
        const loadedData = await storage.load(testKey);
        Assert.isObject(loadedData, 'Loaded data must be object');
        Assert.equal(loadedData.settings.temperature, 0.7, 'Loaded data must match saved data');
        Assert.arrayLength(loadedData.characters, 2, 'Loaded array data must match');
        
        // Test loading non-existent key
        const nonExistentData = await storage.load('non_existent_key');
        Assert.isNull(nonExistentData, 'Loading non-existent key must return null');
        
        // Cleanup
        await storage.save(testKey, null);
    }
}, ['REQ-I-018', 'REQ-I-019']);

// REQ-I-010: Parameter changes must sync immediately across all panels
KLITETestRunner.registerTest('integration', 'parameter_sync_across_panels', async () => {
    if (typeof KLITE_RPMod.generationControl === 'object' && 
        typeof KLITE_RPMod.generationControl.setParameter === 'function') {
        
        // Test parameter synchronization
        const originalTemp = LiteAPI.settings.temperature;
        
        // Set parameter through generation control
        KLITE_RPMod.generationControl.setParameter('temperature', 0.5);
        
        // Verify sync to LiteAPI
        Assert.equal(LiteAPI.settings.temperature, 0.5, 'Parameter must sync to LiteAPI');
        
        // Verify sync to window.localsettings
        Assert.equal(window.localsettings.temperature, 0.5, 'Parameter must sync to localsettings');
        
        // Test sync timing (should be immediate)
        const performanceResult = Assert.performanceWithin(() => {
            KLITE_RPMod.generationControl.setParameter('temperature', 0.8);
        }, 100, 'Parameter sync must be immediate (within 100ms)');
        
        Assert.equal(LiteAPI.settings.temperature, 0.8, 'Immediate sync must work');
        
        // Restore original temperature
        KLITE_RPMod.generationControl.setParameter('temperature', originalTemp);
    }
}, ['REQ-I-010']);

// REQ-I-011: Character selection must update all relevant UI components
KLITETestRunner.registerTest('integration', 'character_selection_sync', async () => {
    const originalCharacters = [...KLITE_RPMod.characters];
    
    try {
        const testCharacter = KLITEMocks.getSampleCards().v2;
        
        // Add character through CHARS panel
        if (typeof KLITE_RPMod.panels?.CHARS?.addCharacter === 'function') {
            await KLITE_RPMod.panels.CHARS.addCharacter(testCharacter.data);
            const addedCharacter = KLITE_RPMod.characters[KLITE_RPMod.characters.length - 1];
            
            // Test character loading (integration with KoboldAI Lite)
            if (typeof KLITE_RPMod.panels.CHARS.loadCharacter === 'function') {
                const performanceResult = Assert.performanceWithin(() => {
                    KLITE_RPMod.panels.CHARS.loadCharacter(addedCharacter);
                }, 200, 'Character loading must complete within 200ms');
                
                // Test character integration functions
                const integrationTests = [
                    { fn: 'loadAsScenario', desc: 'Load as scenario integration' },
                    { fn: 'addToWorldInfo', desc: 'World info integration' },
                    { fn: 'addCharacterToMemory', desc: 'Memory integration' }
                ];
                
                for (const test of integrationTests) {
                    if (typeof KLITE_RPMod.panels.CHARS[test.fn] === 'function') {
                        Assert.doesNotThrow(() => {
                            KLITE_RPMod.panels.CHARS[test.fn](addedCharacter);
                        }, `${test.desc} must not throw errors`);
                    }
                }
            }
        }
    } finally {
        // Restore original characters
        KLITE_RPMod.characters = originalCharacters;
    }
}, ['REQ-I-011']);

// REQ-I-012: Memory/WI changes must reflect in generation immediately
KLITETestRunner.registerTest('integration', 'memory_wi_immediate_reflection', async () => {
    const originalMemory = LiteAPI.memory;
    const originalWI = LiteAPI.worldInfo;
    
    try {
        // Test memory change reflection timing
        const performanceResult = Assert.performanceWithin(() => {
            LiteAPI.memory = 'Updated memory content for immediate reflection test';
        }, 50, 'Memory changes must reflect immediately (within 50ms)');
        
        Assert.equal(window.current_memory, 'Updated memory content for immediate reflection test',
                   'Memory changes must reflect in generation context immediately');
        
        // Test world info change reflection timing
        const testWI = [{ keys: ['immediate'], content: 'Immediate reflection test', enabled: true }];
        const wiPerformance = Assert.performanceWithin(() => {
            LiteAPI.worldInfo = testWI;
        }, 50, 'World info changes must reflect immediately (within 50ms)');
        
        Assert.equal(window.current_wi.length, 1, 'World info changes must reflect immediately');
        Assert.equal(window.current_wi[0].content, 'Immediate reflection test',
                   'World info content must reflect immediately');
        
    } finally {
        // Restore original values
        LiteAPI.memory = originalMemory;
        LiteAPI.worldInfo = originalWI;
    }
}, ['REQ-I-012']);

// Error handling integration test
KLITETestRunner.registerTest('integration', 'error_handling_integration', async () => {
    // Test LiteAPI error handling with invalid settings
    Assert.doesNotThrow(() => {
        LiteAPI.updateSettings({ invalid_parameter: 'invalid_value' });
    }, 'LiteAPI must handle invalid settings gracefully');
    
    // Test DOMUtil error handling with invalid selectors
    Assert.doesNotThrow(() => {
        DOMUtil.safeGet('');
    }, 'DOMUtil must handle empty selectors gracefully');
    
    Assert.doesNotThrow(() => {
        DOMUtil.safeQuery('invalid>>selector');
    }, 'DOMUtil must handle invalid selectors gracefully');
    
    // Test storage error handling
    const storage = LiteAPI.storage;
    if (storage.save) {
        Assert.doesNotThrow(async () => {
            await storage.save('', null); // Invalid key
        }, 'Storage must handle invalid keys gracefully');
    }
}, ['REQ-I-014', 'REQ-I-015', 'REQ-I-016']);

// Performance integration test
KLITETestRunner.registerTest('performance', 'integration_performance', async () => {
    // Test LiteAPI operation performance
    const settingsPerformance = Assert.performanceWithin(() => {
        const settings = LiteAPI.settings;
        LiteAPI.updateSettings({ temperature: 0.7 });
    }, 10, 'LiteAPI settings operations must be fast (within 10ms)');
    
    // Test DOMUtil operation performance
    const domPerformance = Assert.performanceWithin(() => {
        DOMUtil.safeGet('non-existent-element');
        DOMUtil.safeQuery('div');
        DOMUtil.safeQueryAll('*');
    }, 20, 'DOMUtil operations must be fast (within 20ms)');
    
    // Test memory/WI access performance
    const memoryPerformance = Assert.performanceWithin(() => {
        const memory = LiteAPI.memory;
        const wi = LiteAPI.worldInfo;
    }, 5, 'Memory/WI access must be very fast (within 5ms)');
}, ['REQ-NF-006']);

// Integration cleanup and recovery test
KLITETestRunner.registerTest('integration', 'cleanup_and_recovery', async () => {
    // Test that integration systems can recover from errors
    const originalSettings = { ...LiteAPI.settings };
    
    try {
        // Simulate corrupted state
        window.localsettings = null;
        
        // Test that LiteAPI handles this gracefully
        const settings = LiteAPI.settings;
        Assert.isTrue(settings === null || typeof settings === 'object',
                     'LiteAPI must handle corrupted localsettings gracefully');
        
        // Test recovery
        window.localsettings = KLITEMocks.createMockSettings();
        const recoveredSettings = LiteAPI.settings;
        Assert.isObject(recoveredSettings, 'LiteAPI must recover when localsettings is restored');
        
    } finally {
        // Ensure cleanup
        window.localsettings = originalSettings;
    }
}, ['REQ-I-017']);

// Cross-component integration test
KLITETestRunner.registerTest('integration', 'cross_component_integration', async () => {
    // Test integration between multiple components
    if (typeof KLITE_RPMod.loadPanel === 'function') {
        const originalState = { ...KLITE_RPMod.state };
        
        try {
            // Test panel loading affects generation control
            await KLITE_RPMod.loadPanel('left', 'PLAY');
            
            // Test that generation control is accessible after panel load
            const settings = LiteAPI.settings;
            Assert.isObject(settings, 'Generation control must remain accessible after panel operations');
            
            // Test character system integration with panels
            if (KLITE_RPMod.characters) {
                Assert.isArray(KLITE_RPMod.characters, 'Character system must remain accessible');
            }
            
        } finally {
            KLITE_RPMod.state = originalState;
        }
    }
}, ['REQ-I-013']);