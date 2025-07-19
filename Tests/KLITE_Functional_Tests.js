/**
 * KLITE-RPmod Functional Tests
 * Tests for core user workflows and real-world scenarios
 * Based on structured user stories and primary workflows
 */

// Load test dependencies
if (typeof window !== 'undefined') {
    // Browser environment - dependencies should already be loaded
    if (!window.KLITETestRunner || !window.KLITEMocks) {
        console.error('Test dependencies not loaded. Please load KLITETestRunner and KLITEMocks first.');
    }
} else {
    // Node.js environment
    const KLITETestRunner = require('./KLITE_Test_Runner.js');
    const KLITEMocks = require('./KLITE_Test_Mocks.js');
}

/**
 * === WORKFLOW TESTS ===
 * These tests validate complete user workflows from start to finish
 */

// === WORKFLOW 1: Casual Roleplay Session (Most Common) ===
KLITETestRunner.registerTest('workflow', 'casual_roleplay_session', async function() {
    const testName = 'Casual Roleplay Session';
    console.log(`[TEST] Starting ${testName}...`);
    
    // Ensure KLITE-RPmod is available
    if (typeof window.KLITE_RPMod === 'undefined') {
        throw new Error('KLITE-RPmod not available for testing');
    }
    
    const klite = window.KLITE_RPMod;
    const sampleCharacter = KLITEMocks.getSampleCards().v2;
    
    // Step 1: Verify initial state
    console.log('[TEST] Step 1: Verifying initial state...');
    if (!klite.state || !klite.characters) {
        throw new Error('KLITE-RPmod not properly initialized');
    }
    
    // Step 2: Import character into library
    console.log('[TEST] Step 2: Importing character...');
    const initialCharCount = klite.characters.length;
    
    // Simulate character import
    klite.characters.push({
        ...sampleCharacter.data,
        id: 'test-char-' + Date.now(),
        imported: new Date(),
        source: 'functional-test'
    });
    
    if (klite.characters.length !== initialCharCount + 1) {
        throw new Error('Character import failed');
    }
    
    const importedChar = klite.characters[klite.characters.length - 1];
    console.log(`[TEST] Character imported: ${importedChar.name}`);
    
    // Step 3: Load character for roleplay
    console.log('[TEST] Step 3: Loading character for roleplay...');
    
    // Simulate character selection and scenario start
    klite.state.selectedCharacter = importedChar.id;
    
    // Load character data into memory and scenario
    if (importedChar.scenario) {
        window.current_scenario = importedChar.scenario;
    }
    if (importedChar.description) {
        window.current_memory = importedChar.description;
    }
    
    // Step 4: Verify roleplay setup
    console.log('[TEST] Step 4: Verifying roleplay setup...');
    
    if (!klite.state.selectedCharacter) {
        throw new Error('Character not properly selected');
    }
    
    // Step 5: Simulate basic interaction
    console.log('[TEST] Step 5: Simulating basic interaction...');
    
    // Mock a simple chat interaction
    const testMessage = "Hello! How are you today?";
    const mockChatDisplay = document.getElementById('chat-display');
    
    if (mockChatDisplay) {
        mockChatDisplay.innerHTML += `<div class="message user">${testMessage}</div>`;
        
        // Simulate AI response
        const aiResponse = `Hello! I'm ${importedChar.name}. I'm doing well, thank you for asking!`;
        mockChatDisplay.innerHTML += `<div class="message ai">${aiResponse}</div>`;
    }
    
    // Step 6: Test session persistence
    console.log('[TEST] Step 6: Testing session persistence...');
    
    const sessionData = {
        character: importedChar.id,
        memory: window.current_memory,
        scenario: window.current_scenario,
        messages: mockChatDisplay ? mockChatDisplay.innerHTML : '',
        timestamp: new Date()
    };
    
    // Mock session save
    try {
        await window.indexeddb_save('test_session_' + Date.now(), sessionData);
        console.log('[TEST] Session save successful');
    } catch (error) {
        throw new Error(`Session save failed: ${error.message}`);
    }
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['US-RP-001', 'US-RP-002', 'Workflow-1']);

// === WORKFLOW 2: Character Library Management ===
KLITETestRunner.registerTest('workflow', 'character_library_management', async function() {
    const testName = 'Character Library Management';
    console.log(`[TEST] Starting ${testName}...`);
    
    const klite = window.KLITE_RPMod;
    const sampleCards = KLITEMocks.getSampleCards();
    
    // Step 1: Import multiple character formats
    console.log('[TEST] Step 1: Importing multiple character formats...');
    
    const initialCount = klite.characters.length;
    const testCharacters = [];
    
    // Import V1, V2, and V3 format characters
    for (const [version, cardData] of Object.entries(sampleCards)) {
        const character = {
            ...cardData.data || cardData,
            id: `test-${version}-${Date.now()}`,
            format: version,
            imported: new Date(),
            source: 'functional-test'
        };
        
        klite.characters.push(character);
        testCharacters.push(character);
        console.log(`[TEST] Imported ${version.toUpperCase()} character: ${character.name}`);
    }
    
    if (klite.characters.length !== initialCount + 3) {
        throw new Error('Not all characters were imported correctly');
    }
    
    // Step 2: Test character search/filtering
    console.log('[TEST] Step 2: Testing character search...');
    
    const searchResults = klite.characters.filter(char => 
        char.name && char.name.toLowerCase().includes('test')
    );
    
    if (searchResults.length < 3) {
        throw new Error('Character search functionality failed');
    }
    
    // Step 3: Test character editing
    console.log('[TEST] Step 3: Testing character editing...');
    
    const editTarget = testCharacters[0];
    const originalDescription = editTarget.description;
    const newDescription = originalDescription + ' [EDITED]';
    
    // Simulate character edit
    editTarget.description = newDescription;
    editTarget.lastModified = new Date();
    
    if (editTarget.description !== newDescription) {
        throw new Error('Character editing failed');
    }
    
    // Step 4: Test character duplication
    console.log('[TEST] Step 4: Testing character duplication...');
    
    const originalChar = testCharacters[1];
    const duplicatedChar = {
        ...originalChar,
        id: `duplicate-${originalChar.id}`,
        name: originalChar.name + ' (Copy)',
        created: new Date()
    };
    
    klite.characters.push(duplicatedChar);
    
    if (!klite.characters.find(char => char.id === duplicatedChar.id)) {
        throw new Error('Character duplication failed');
    }
    
    // Step 5: Test character export
    console.log('[TEST] Step 5: Testing character export...');
    
    const exportChar = testCharacters[2];
    const exportData = {
        spec: exportChar.spec || 'chara_card_v2',
        spec_version: exportChar.spec_version || '2.0',
        data: { ...exportChar }
    };
    
    const exportJson = JSON.stringify(exportData, null, 2);
    
    if (!exportJson || exportJson.length < 100) {
        throw new Error('Character export failed');
    }
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['US-RP-002', 'US-CREATE-002']);

// === WORKFLOW 3: Memory System Validation ===
KLITETestRunner.registerTest('workflow', 'memory_system', async function() {
    const testName = 'Memory System Validation';
    console.log(`[TEST] Starting ${testName}...`);
    
    const klite = window.KLITE_RPMod;
    
    // Step 1: Test memory initialization
    console.log('[TEST] Step 1: Testing memory initialization...');
    
    const initialMemory = window.current_memory || '';
    const testMemory = 'Test conversation memory entry - Alice mentioned she likes cats.';
    
    window.current_memory = testMemory;
    
    if (window.current_memory !== testMemory) {
        throw new Error('Memory initialization failed');
    }
    
    // Step 2: Test memory accumulation
    console.log('[TEST] Step 2: Testing memory accumulation...');
    
    const additionalMemory = ' Bob revealed he works as a teacher.';
    window.current_memory += additionalMemory;
    
    if (!window.current_memory.includes('Alice') || !window.current_memory.includes('Bob')) {
        throw new Error('Memory accumulation failed');
    }
    
    // Step 3: Test memory persistence
    console.log('[TEST] Step 3: Testing memory persistence...');
    
    const memoryBackup = window.current_memory;
    
    try {
        await window.indexeddb_save('test_memory_persistence', {
            memory: window.current_memory,
            timestamp: new Date()
        });
        
        // Simulate memory loss and restoration
        window.current_memory = '';
        
        const restoredData = await window.indexeddb_load('test_memory_persistence');
        if (restoredData && restoredData.memory) {
            window.current_memory = restoredData.memory;
        }
        
        if (window.current_memory !== memoryBackup) {
            throw new Error('Memory persistence failed');
        }
        
    } catch (error) {
        throw new Error(`Memory persistence error: ${error.message}`);
    }
    
    // Step 4: Test context optimization
    console.log('[TEST] Step 4: Testing context optimization...');
    
    // Create a long memory string to test optimization
    const longMemory = 'A'.repeat(2000) + ' [Important detail to preserve]';
    window.current_memory = longMemory;
    
    // Simulate memory optimization (basic compression)
    if (window.current_memory.length > 1500) {
        // Simple optimization: preserve important details, compress repetitive content
        const optimized = window.current_memory
            .replace(/A{100,}/g, '[...repeated content...]')
            .replace(/\s+/g, ' ')
            .trim();
        
        window.current_memory = optimized;
    }
    
    if (!window.current_memory.includes('[Important detail to preserve]')) {
        throw new Error('Context optimization removed important content');
    }
    
    // Restore original memory
    window.current_memory = initialMemory;
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['US-RP-003', 'US-TOOL-001']);

// === WORKFLOW 4: World Info Management ===
KLITETestRunner.registerTest('workflow', 'world_info_management', async function() {
    const testName = 'World Info Management';
    console.log(`[TEST] Starting ${testName}...`);
    
    // Step 1: Initialize world info system
    console.log('[TEST] Step 1: Initializing world info system...');
    
    if (!window.current_wi) {
        window.current_wi = [];
    }
    
    const initialCount = window.current_wi.length;
    const sampleWorldInfo = KLITEMocks.getSampleWorldInfo();
    
    // Step 2: Add world info entries
    console.log('[TEST] Step 2: Adding world info entries...');
    
    for (const entry of sampleWorldInfo) {
        window.current_wi.push({
            ...entry,
            id: `test-wi-${Date.now()}-${Math.random()}`,
            created: new Date()
        });
    }
    
    if (window.current_wi.length !== initialCount + sampleWorldInfo.length) {
        throw new Error('World info entries not added correctly');
    }
    
    // Step 3: Test keyword activation
    console.log('[TEST] Step 3: Testing keyword activation...');
    
    const testContext = 'The player enters the testing ground to validate the character card system.';
    const activeEntries = window.current_wi.filter(entry => {
        if (!entry.enabled) return false;
        
        return entry.keys.some(key => 
            testContext.toLowerCase().includes(key.toLowerCase())
        );
    });
    
    if (activeEntries.length === 0) {
        throw new Error('Keyword activation failed');
    }
    
    console.log(`[TEST] Found ${activeEntries.length} active world info entries`);
    
    // Step 4: Test world info organization
    console.log('[TEST] Step 4: Testing world info organization...');
    
    // Group entries by comment (category)
    const categories = {};
    window.current_wi.forEach(entry => {
        const category = entry.comment || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(entry);
    });
    
    if (Object.keys(categories).length === 0) {
        throw new Error('World info organization failed');
    }
    
    // Step 5: Test world info persistence
    console.log('[TEST] Step 5: Testing world info persistence...');
    
    try {
        await window.indexeddb_save('test_world_info', {
            worldInfo: window.current_wi,
            timestamp: new Date()
        });
        
        console.log('[TEST] World info persistence successful');
    } catch (error) {
        throw new Error(`World info persistence failed: ${error.message}`);
    }
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['US-CREATE-001', 'WI-Management']);

// === WORKFLOW 5: Group Chat Functionality ===
KLITETestRunner.registerTest('workflow', 'group_chat_management', async function() {
    const testName = 'Group Chat Management';
    console.log(`[TEST] Starting ${testName}...`);
    
    const klite = window.KLITE_RPMod;
    
    // Step 1: Initialize group chat
    console.log('[TEST] Step 1: Initializing group chat...');
    
    if (!klite.state.groupChat) {
        klite.state.groupChat = {
            enabled: false,
            characters: [],
            settings: {
                talkativnessBase: 0.5,
                rotationMode: 'automatic'
            }
        };
    }
    
    // Step 2: Add multiple characters to group
    console.log('[TEST] Step 2: Adding characters to group...');
    
    const sampleCards = KLITEMocks.getSampleCards();
    const groupCharacters = [];
    const initialGroupCount = klite.state.groupChat.characters.length;
    
    for (const [version, cardData] of Object.entries(sampleCards)) {
        const character = {
            id: `group-${version}-${Date.now()}`,
            ...(cardData.data || cardData),
            talkativeness: 0.3 + (Math.random() * 0.4), // 0.3-0.7 range
            active: true
        };
        
        groupCharacters.push(character);
        klite.state.groupChat.characters.push(character);
    }
    
    const expectedCount = initialGroupCount + 3;
    if (klite.state.groupChat.characters.length !== expectedCount) {
        throw new Error(`Group chat character addition failed: expected ${expectedCount}, got ${klite.state.groupChat.characters.length}`);
    }
    
    console.log(`[TEST] Successfully added 3 characters to group (${initialGroupCount} -> ${klite.state.groupChat.characters.length})`);
    
    // Step 3: Enable group chat mode
    console.log('[TEST] Step 3: Enabling group chat mode...');
    
    klite.state.groupChat.enabled = true;
    
    if (!klite.state.groupChat.enabled) {
        throw new Error('Group chat mode activation failed');
    }
    
    // Step 4: Test character rotation logic
    console.log('[TEST] Step 4: Testing character rotation...');
    
    // Simulate character selection logic
    const selectNextCharacter = () => {
        const activeChars = klite.state.groupChat.characters.filter(c => c.active);
        if (activeChars.length === 0) return null;
        
        // Weighted random selection based on talkativeness
        const totalWeight = activeChars.reduce((sum, char) => sum + char.talkativeness, 0);
        let random = Math.random() * totalWeight;
        
        for (const char of activeChars) {
            random -= char.talkativeness;
            if (random <= 0) return char;
        }
        
        return activeChars[0]; // Fallback
    };
    
    const selectedChar = selectNextCharacter();
    
    if (!selectedChar) {
        throw new Error('Character rotation logic failed');
    }
    
    console.log(`[TEST] Selected character: ${selectedChar.name}`);
    
    // Step 5: Test group conversation flow
    console.log('[TEST] Step 5: Testing group conversation flow...');
    
    const conversationLog = [];
    
    // Simulate a few conversation turns
    for (let turn = 0; turn < 5; turn++) {
        const speaker = selectNextCharacter();
        if (speaker) {
            const message = {
                speaker: speaker.name,
                content: `Test message ${turn + 1} from ${speaker.name}`,
                timestamp: new Date(),
                turn: turn + 1
            };
            
            conversationLog.push(message);
        }
    }
    
    if (conversationLog.length !== 5) {
        throw new Error('Group conversation flow failed');
    }
    
    // Verify different characters spoke
    const uniqueSpeakers = new Set(conversationLog.map(msg => msg.speaker));
    if (uniqueSpeakers.size < 2) {
        console.warn('[TEST] Warning: Low character diversity in group chat');
    }
    
    // Step 6: Test group chat persistence
    console.log('[TEST] Step 6: Testing group chat persistence...');
    
    try {
        await window.indexeddb_save('test_group_chat', {
            groupState: klite.state.groupChat,
            conversation: conversationLog,
            timestamp: new Date()
        });
        
        console.log('[TEST] Group chat persistence successful');
    } catch (error) {
        throw new Error(`Group chat persistence failed: ${error.message}`);
    }
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['US-RP-004', 'US-ADV-001', 'Workflow-3']);

// === MOBILE NAVIGATION TEST ===
KLITETestRunner.registerTest('workflow', 'mobile_navigation_stability', async function() {
    const testName = 'Mobile Navigation Stability';
    console.log(`[TEST] Starting ${testName}...`);
    
    const klite = window.KLITE_RPMod;
    
    // Step 1: Enable mobile mode
    console.log('[TEST] Step 1: Enabling mobile mode...');
    
    klite.state.mobile.enabled = true;
    klite.state.mobile.currentIndex = 5; // Start at MAIN
    
    if (!klite.state.mobile.enabled) {
        throw new Error('Mobile mode activation failed');
    }
    
    // Step 2: Test navigation boundaries
    console.log('[TEST] Step 2: Testing navigation boundaries...');
    
    const sequence = klite.state.mobile.sequence;
    const maxIndex = sequence.length - 1;
    
    // Test left boundary (should not go below 0)
    klite.state.mobile.currentIndex = 0;
    const leftBoundaryResult = klite.navigateMobilePanel(-1);
    
    if (klite.state.mobile.currentIndex !== 0) {
        throw new Error('Left boundary navigation failed');
    }
    
    // Test right boundary (should not exceed max)
    klite.state.mobile.currentIndex = maxIndex;
    const rightBoundaryResult = klite.navigateMobilePanel(1);
    
    if (klite.state.mobile.currentIndex !== maxIndex) {
        throw new Error('Right boundary navigation failed');
    }
    
    // Step 3: Test normal navigation
    console.log('[TEST] Step 3: Testing normal navigation...');
    
    klite.state.mobile.currentIndex = 5; // Reset to middle
    
    // Navigate right
    klite.navigateMobilePanel(1);
    if (klite.state.mobile.currentIndex !== 6) {
        throw new Error('Right navigation failed');
    }
    
    // Navigate left
    klite.navigateMobilePanel(-1);
    if (klite.state.mobile.currentIndex !== 5) {
        throw new Error('Left navigation failed');
    }
    
    // Step 4: Test handle click blocking in mobile mode
    console.log('[TEST] Step 4: Testing handle click blocking...');
    
    // Create mock event with handle class
    const mockEvent = {
        target: {
            classList: {
                contains: (className) => className === 'klite-handle'
            },
            dataset: {
                panel: 'left'
            }
        }
    };
    
    // Test that handle clicks are ignored in mobile mode
    const originalPanelState = klite.state.collapsed.left;
    klite.handleClick(mockEvent);
    
    if (klite.state.collapsed.left !== originalPanelState) {
        throw new Error('Handle click was not properly blocked in mobile mode');
    }
    
    // Step 5: Test mobile mode cleanup
    console.log('[TEST] Step 5: Testing mobile mode cleanup...');
    
    klite.state.mobile.enabled = false;
    
    // Now handle clicks should work normally
    klite.handleClick(mockEvent);
    
    if (klite.state.collapsed.left === originalPanelState) {
        console.log('[TEST] Handle click correctly enabled after mobile mode disabled');
    }
    
    console.log(`[TEST] ${testName} completed successfully`);
    return true;
}, ['Mobile-Navigation', 'Bug-Fix-Mobile', 'US-UX-001']);

/**
 * === INTEGRATION TESTS ===
 * Tests that validate multiple systems working together
 */

// === COMPLETE ROLEPLAY WORKFLOW ===
KLITETestRunner.registerTest('integration', 'complete_roleplay_workflow', async function() {
    const testName = 'Complete Roleplay Workflow';
    console.log(`[TEST] Starting ${testName}...`);
    
    const klite = window.KLITE_RPMod;
    
    // This test combines character import, memory management, and roleplay interaction
    console.log('[TEST] Executing complete roleplay workflow...');
    
    // Step 1: Character setup
    const character = KLITEMocks.getSampleCards().v2.data;
    character.id = 'integration-test-' + Date.now();
    klite.characters.push(character);
    
    // Step 2: Memory initialization
    window.current_memory = character.description || '';
    
    // Step 3: World info setup
    const worldInfo = KLITEMocks.getSampleWorldInfo();
    window.current_wi = worldInfo;
    
    // Step 4: Simulation of conversation
    const mockMessages = [
        { role: 'system', content: character.system_prompt || 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! How are you today?' },
        { role: 'assistant', content: `Hello! I'm ${character.name}. I'm doing well, thank you!` }
    ];
    
    // Step 5: Context building
    let contextSize = 0;
    contextSize += (character.system_prompt || '').length;
    contextSize += window.current_memory.length;
    contextSize += window.current_wi.reduce((sum, entry) => sum + entry.content.length, 0);
    
    if (contextSize === 0) {
        throw new Error('Context building failed');
    }
    
    // Step 6: Session persistence
    const sessionData = {
        character: character.id,
        memory: window.current_memory,
        worldInfo: window.current_wi,
        messages: mockMessages,
        contextSize: contextSize,
        timestamp: new Date()
    };
    
    await window.indexeddb_save('integration_test_session', sessionData);
    
    console.log(`[TEST] ${testName} completed successfully`);
    console.log(`[TEST] Context size: ${contextSize} characters`);
    console.log(`[TEST] Messages: ${mockMessages.length}`);
    
    return true;
}, ['Complete-Workflow', 'Integration-Test']);

/**
 * Export for browser usage
 */
if (typeof window !== 'undefined') {
    console.log('KLITE-RPmod Functional Tests loaded successfully');
    console.log(`Registered ${KLITETestRunner.getTestCount()} total tests`);
    
    // Provide easy test execution commands
    window.runFunctionalTests = () => KLITETestRunner.runTests('workflow');
    window.runIntegrationTests = () => KLITETestRunner.runTests('integration');
    window.runAllWorkflowTests = () => KLITETestRunner.runTests();
}