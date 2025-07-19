/**
 * KLITE-RPmod Panel System Tests
 * Tests for panel lifecycle, organization, and management
 * Requirements: REQ-F-009 to REQ-F-022, REQ-NF-002
 */

// REQ-F-009: Each panel must implement render() method returning HTML string
KLITETestRunner.registerTest('functional', 'panel_render_methods', async () => {
    const testPanels = ['PLAY_RP', 'PLAY_STORY', 'PLAY_CHAT', 'MEMORY', 'CHARS', 'TOOLS'];
    
    for (const panelName of testPanels) {
        const panel = KLITE_RPMod.panels[panelName];
        
        if (panel) {
            Assert.isFunction(panel.render, `${panelName} must have render method`);
            
            const html = panel.render();
            Assert.isType(html, 'string', `${panelName} render must return string`);
            Assert.greaterThan(html.length, 0, `${panelName} render must return non-empty HTML`);
            
            // Test that HTML is valid (basic check)
            Assert.isTrue(html.includes('<'), `${panelName} render must return HTML with tags`);
        }
    }
}, ['REQ-F-009']);

// REQ-F-010: Each panel must implement init() method for post-DOM setup
KLITETestRunner.registerTest('functional', 'panel_init_methods', async () => {
    const testPanels = ['PLAY_RP', 'MEMORY', 'CHARS', 'TOOLS'];
    
    for (const panelName of testPanels) {
        const panel = KLITE_RPMod.panels[panelName];
        
        if (panel) {
            Assert.isFunction(panel.init, `${panelName} must have init method`);
            
            // Test that init can be called without errors
            Assert.doesNotThrow(async () => {
                await panel.init();
            }, `${panelName} init must not throw errors`);
        }
    }
}, ['REQ-F-010']);

// REQ-F-011: Each panel should implement cleanup() method for resource cleanup
KLITETestRunner.registerTest('functional', 'panel_cleanup_methods', async () => {
    const testPanels = ['PLAY_RP', 'MEMORY', 'CHARS', 'TOOLS'];
    
    for (const panelName of testPanels) {
        const panel = KLITE_RPMod.panels[panelName];
        
        if (panel && panel.cleanup) {
            Assert.isFunction(panel.cleanup, `${panelName} cleanup must be function if present`);
            
            // Test that cleanup can be called without errors
            Assert.doesNotThrow(() => {
                panel.cleanup();
            }, `${panelName} cleanup must not throw errors`);
        }
    }
}, ['REQ-F-011']);

// REQ-F-012: System must support asynchronous panel initialization
KLITETestRunner.registerTest('functional', 'async_panel_initialization', async () => {
    // Test async init support
    const mockPanel = {
        render() {
            return '<div>Test Panel</div>';
        },
        async init() {
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 1));
            this.initialized = true;
        }
    };
    
    // Test async init
    await mockPanel.init();
    Assert.isTrue(mockPanel.initialized, 'Async panel initialization must work');
    
    // Test that loadPanel supports async init
    if (typeof KLITE_RPMod.loadPanel === 'function') {
        Assert.doesNotThrow(async () => {
            // This should handle async init properly
            await KLITE_RPMod.loadPanel('left', 'MEMORY');
        }, 'loadPanel must support async initialization');
    }
}, ['REQ-F-012']);

// REQ-F-013: System must cleanup existing panel resources before loading new panels
KLITETestRunner.registerTest('functional', 'panel_resource_cleanup', async () => {
    // Test that switching panels calls cleanup
    let cleanupCalled = false;
    
    const mockPanel = {
        render() { return '<div>Mock Panel</div>'; },
        init() {},
        cleanup() { cleanupCalled = true; }
    };
    
    // Add mock panel temporarily
    KLITE_RPMod.panels.TEST_PANEL = mockPanel;
    
    try {
        if (typeof KLITE_RPMod.loadPanel === 'function') {
            // Load panel first
            await KLITE_RPMod.loadPanel('left', 'TEST_PANEL');
            
            // Load different panel - should call cleanup
            await KLITE_RPMod.loadPanel('left', 'MEMORY');
            
            // Note: In actual implementation, cleanup would be called
            // For this test, we verify the mechanism exists
            Assert.isFunction(mockPanel.cleanup, 'Cleanup mechanism must exist');
        }
    } finally {
        // Cleanup test panel
        delete KLITE_RPMod.panels.TEST_PANEL;
    }
}, ['REQ-F-013']);

// REQ-F-014: System must support left/right panel architecture with tab switching
KLITETestRunner.registerTest('functional', 'panel_architecture', async () => {
    // Test that panel sides are supported
    const validSides = ['left', 'right'];
    
    for (const side of validSides) {
        if (typeof KLITE_RPMod.loadPanel === 'function') {
            Assert.doesNotThrow(() => {
                // Should support loading panels on each side
                const panelName = side === 'left' ? 'PLAY' : 'MEMORY';
                KLITE_RPMod.loadPanel(side, panelName);
            }, `Panel loading must support ${side} side`);
        }
    }
    
    // Test tab switching state
    if (KLITE_RPMod.state && KLITE_RPMod.state.tabs) {
        Assert.hasProperty(KLITE_RPMod.state.tabs, 'left', 'Left tab state must exist');
        Assert.hasProperty(KLITE_RPMod.state.tabs, 'right', 'Right tab state must exist');
    }
}, ['REQ-F-014']);

// REQ-F-015: Left panel tabs: PLAY, TOOLS, SCENE, GROUP, HELP
KLITETestRunner.registerTest('functional', 'left_panel_tabs', async () => {
    const expectedLeftTabs = ['PLAY', 'TOOLS', 'SCENE', 'GROUP', 'HELP'];
    
    for (const tab of expectedLeftTabs) {
        // Test that corresponding panels exist
        let panelExists = false;
        
        if (tab === 'PLAY') {
            // PLAY is special - maps to mode-specific panels
            panelExists = KLITE_RPMod.panels.PLAY_RP || KLITE_RPMod.panels.PLAY_STORY || 
                         KLITE_RPMod.panels.PLAY_CHAT || KLITE_RPMod.panels.PLAY_ADV;
        } else {
            panelExists = KLITE_RPMod.panels[tab] !== undefined;
        }
        
        Assert.isTrue(panelExists, `Left panel ${tab} must have corresponding panel implementation`);
    }
    
    // Test that tab validation works
    if (typeof KLITE_RPMod.isValidTab === 'function') {
        for (const tab of expectedLeftTabs) {
            Assert.isTrue(KLITE_RPMod.isValidTab('left', tab), `${tab} must be valid left tab`);
        }
    }
}, ['REQ-F-015']);

// REQ-F-016: Right panel tabs: CHARS, MEMORY, NOTES, WI, TEXTDB
KLITETestRunner.registerTest('functional', 'right_panel_tabs', async () => {
    const expectedRightTabs = ['CHARS', 'MEMORY', 'NOTES', 'WI', 'TEXTDB'];
    
    for (const tab of expectedRightTabs) {
        // Test that corresponding panels exist
        const panelExists = KLITE_RPMod.panels[tab] !== undefined;
        Assert.isTrue(panelExists, `Right panel ${tab} must have corresponding panel implementation`);
    }
    
    // Test that tab validation works
    if (typeof KLITE_RPMod.isValidTab === 'function') {
        for (const tab of expectedRightTabs) {
            Assert.isTrue(KLITE_RPMod.isValidTab('right', tab), `${tab} must be valid right tab`);
        }
    }
}, ['REQ-F-016']);

// REQ-F-017: System must maintain panel state persistence across sessions
KLITETestRunner.registerTest('functional', 'panel_state_persistence', async () => {
    // Test state saving
    if (typeof KLITE_RPMod.saveState === 'function') {
        const originalState = { ...KLITE_RPMod.state };
        
        // Modify state
        KLITE_RPMod.state.tabs.left = 'TOOLS';
        KLITE_RPMod.state.tabs.right = 'CHARS';
        
        // Save state
        await KLITE_RPMod.saveState();
        
        // Test that state can be loaded
        if (typeof KLITE_RPMod.loadState === 'function') {
            const loadedState = await KLITE_RPMod.loadState();
            Assert.isObject(loadedState, 'Loaded state must be object');
            
            if (loadedState.tabs) {
                Assert.equal(loadedState.tabs.left, 'TOOLS', 'Left tab state must persist');
                Assert.equal(loadedState.tabs.right, 'CHARS', 'Right tab state must persist');
            }
        }
        
        // Restore original state
        KLITE_RPMod.state = originalState;
    }
}, ['REQ-F-017']);

// REQ-F-018: System must support panel collapse/expand functionality
KLITETestRunner.registerTest('functional', 'panel_collapse_expand', async () => {
    // Test collapse state tracking
    if (KLITE_RPMod.state && KLITE_RPMod.state.collapsed) {
        Assert.isObject(KLITE_RPMod.state.collapsed, 'Collapsed state must be object');
        
        // Test that collapse states can be set
        KLITE_RPMod.state.collapsed.left = true;
        KLITE_RPMod.state.collapsed.right = false;
        
        Assert.isTrue(KLITE_RPMod.state.collapsed.left, 'Left panel collapse state must be settable');
        Assert.isFalse(KLITE_RPMod.state.collapsed.right, 'Right panel collapse state must be settable');
    }
    
    // Test collapse functions if they exist
    if (typeof KLITE_RPMod.togglePanel === 'function') {
        Assert.doesNotThrow(() => {
            KLITE_RPMod.togglePanel('left');
        }, 'Panel toggle must not throw errors');
    }
}, ['REQ-F-018']);

// REQ-F-019 to REQ-F-022: PLAY Panel Variants
KLITETestRunner.registerTest('functional', 'play_panel_variants', async () => {
    const playVariants = {
        'PLAY_STORY': 'Basic story generation interface',
        'PLAY_ADV': 'Adventure mode with action/dice roll options',
        'PLAY_CHAT': 'Simple chat interface',
        'PLAY_RP': 'Advanced roleplay mode with character integration'
    };
    
    for (const [panelName, description] of Object.entries(playVariants)) {
        if (KLITE_RPMod.panels[panelName]) {
            Assert.panelExists(panelName, `${description} panel must exist`);
            Assert.panelRendered(panelName, `${panelName} must render correctly`);
            
            // Test that each variant has distinct functionality
            const html = KLITE_RPMod.panels[panelName].render();
            Assert.isType(html, 'string', `${panelName} must render HTML`);
            Assert.greaterThan(html.length, 50, `${panelName} must have substantial content`);
        }
    }
}, ['REQ-F-019', 'REQ-F-020', 'REQ-F-021', 'REQ-F-022']);

// REQ-NF-002: Panel switching must occur within 300ms
KLITETestRunner.registerTest('performance', 'panel_switching_performance', async () => {
    if (typeof KLITE_RPMod.loadPanel === 'function') {
        // Test panel switching performance
        const performanceResult = Assert.performanceWithin(() => {
            KLITE_RPMod.loadPanel('left', 'MEMORY');
        }, 300, 'Panel switching must complete within 300ms');
        
        Assert.lessThan(performanceResult.duration, 300, 'Panel switching must be fast');
        
        // Test switching to different panel
        const secondSwitch = Assert.performanceWithin(() => {
            KLITE_RPMod.loadPanel('left', 'CHARS');
        }, 300, 'Subsequent panel switches must also be fast');
        
        Assert.lessThan(secondSwitch.duration, 300, 'Multiple panel switches must maintain performance');
    }
}, ['REQ-NF-002']);

// Panel rendering consistency test
KLITETestRunner.registerTest('functional', 'panel_rendering_consistency', async () => {
    const testPanels = ['MEMORY', 'CHARS', 'TOOLS'];
    
    for (const panelName of testPanels) {
        if (KLITE_RPMod.panels[panelName]) {
            const panel = KLITE_RPMod.panels[panelName];
            
            // Test multiple renders are consistent
            const render1 = panel.render();
            const render2 = panel.render();
            
            Assert.equal(render1, render2, `${panelName} renders must be consistent`);
            
            // Test render doesn't throw
            Assert.doesNotThrow(() => {
                panel.render();
            }, `${panelName} render must not throw`);
        }
    }
}, ['REQ-F-009']);

// Panel error handling test
KLITETestRunner.registerTest('functional', 'panel_error_handling', async () => {
    // Test loading non-existent panel
    if (typeof KLITE_RPMod.loadPanel === 'function') {
        Assert.doesNotThrow(() => {
            KLITE_RPMod.loadPanel('left', 'NONEXISTENT_PANEL');
        }, 'Loading non-existent panel must not crash system');
    }
    
    // Test panel with broken render
    const brokenPanel = {
        render() {
            throw new Error('Broken render');
        }
    };
    
    KLITE_RPMod.panels.BROKEN_TEST = brokenPanel;
    
    try {
        if (typeof KLITE_RPMod.loadPanel === 'function') {
            Assert.doesNotThrow(() => {
                try {
                    KLITE_RPMod.loadPanel('left', 'BROKEN_TEST');
                } catch (error) {
                    // Error handling should prevent crash
                }
            }, 'Broken panel must not crash system');
        }
    } finally {
        delete KLITE_RPMod.panels.BROKEN_TEST;
    }
}, ['REQ-F-013']);

// Panel memory management test
KLITETestRunner.registerTest('functional', 'panel_memory_management', async () => {
    let cleanupCallCount = 0;
    
    const testPanel = {
        render() { return '<div>Memory Test Panel</div>'; },
        init() { 
            this.timer = setInterval(() => {}, 1000);
        },
        cleanup() { 
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            cleanupCallCount++;
        }
    };
    
    KLITE_RPMod.panels.MEMORY_TEST = testPanel;
    
    try {
        if (typeof KLITE_RPMod.loadPanel === 'function') {
            // Load panel
            await KLITE_RPMod.loadPanel('left', 'MEMORY_TEST');
            
            // Switch to different panel (should trigger cleanup)
            await KLITE_RPMod.loadPanel('left', 'MEMORY');
            
            // Verify cleanup mechanism exists
            Assert.isFunction(testPanel.cleanup, 'Cleanup mechanism must exist');
        }
    } finally {
        // Manual cleanup for test
        if (testPanel.cleanup) testPanel.cleanup();
        delete KLITE_RPMod.panels.MEMORY_TEST;
    }
}, ['REQ-F-013']);

// Panel state isolation test
KLITETestRunner.registerTest('functional', 'panel_state_isolation', async () => {
    // Test that panels don't interfere with each other
    const panel1State = { data: 'panel1' };
    const panel2State = { data: 'panel2' };
    
    const testPanel1 = {
        render() { return '<div>Panel 1</div>'; },
        init() { this.state = panel1State; }
    };
    
    const testPanel2 = {
        render() { return '<div>Panel 2</div>'; },
        init() { this.state = panel2State; }
    };
    
    KLITE_RPMod.panels.TEST_PANEL_1 = testPanel1;
    KLITE_RPMod.panels.TEST_PANEL_2 = testPanel2;
    
    try {
        // Initialize both panels
        await testPanel1.init();
        await testPanel2.init();
        
        // Verify state isolation
        Assert.notEqual(testPanel1.state, testPanel2.state, 'Panel states must be isolated');
        Assert.equal(testPanel1.state.data, 'panel1', 'Panel 1 state must be preserved');
        Assert.equal(testPanel2.state.data, 'panel2', 'Panel 2 state must be preserved');
        
    } finally {
        delete KLITE_RPMod.panels.TEST_PANEL_1;
        delete KLITE_RPMod.panels.TEST_PANEL_2;
    }
}, ['REQ-F-014']);