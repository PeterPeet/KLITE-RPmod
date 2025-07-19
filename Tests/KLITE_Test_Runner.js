/**
 * KLITE-RPmod Test Runner
 * Browser-based test execution engine for ALPHA implementation
 */

const KLITETestRunner = {
    tests: new Map(),
    results: new Map(),
    mocks: new Map(),
    config: {
        timeoutMs: 5000,
        logLevel: 'info', // 'silent', 'error', 'info', 'verbose'
        stopOnFirstFailure: false
    },
    
    // Test registration
    registerTest(category, name, test, requirements = []) {
        const key = `${category}.${name}`;
        this.tests.set(key, {
            category,
            name,
            test,
            requirements,
            registered: new Date()
        });
        this.log('verbose', `Registered test: ${key}`);
    },
    
    // Mock environment setup
    setupMocks() {
        this.log('info', 'Setting up mock environment...');
        
        // Mock KoboldAI Lite core objects
        if (!window.localsettings) {
            window.localsettings = KLITEMocks.createMockSettings();
            this.log('verbose', 'Created mock localsettings');
        }
        
        // Mock storage functions
        if (!window.indexeddb_save) {
            const mockStorage = KLITEMocks.createMockStorage();
            window.indexeddb_save = mockStorage.save;
            window.indexeddb_load = mockStorage.load;
            this.log('verbose', 'Created mock storage functions');
        }
        
        // Mock core Lite variables
        if (!window.current_memory) window.current_memory = '';
        if (!window.current_wi) window.current_wi = [];
        if (!window.pending_wi_obj) window.pending_wi_obj = {};
        if (!window.current_scenario) window.current_scenario = '';
        if (!window.current_sprompt) window.current_sprompt = '';
        
        // Mock Lite functions
        if (!window.save_settings) {
            window.save_settings = () => {
                this.log('verbose', 'Mock save_settings called');
                return true;
            };
        }
        
        if (!window.save_wi) {
            window.save_wi = () => {
                this.log('verbose', 'Mock save_wi called');
                return true;
            };
        }
        
        // Mock DOM elements that Lite provides
        KLITEMocks.createMockLiteDOM();
        this.log('info', 'Mock environment setup complete');
    },
    
    // Execute test suite
    async runTests(category = null, testPattern = null) {
        this.log('info', `Starting test execution (category: ${category || 'all'}, pattern: ${testPattern || 'all'})`);
        
        this.setupMocks();
        const results = new Map();
        const startTime = performance.now();
        let testsRun = 0;
        let testsPassed = 0;
        
        for (const [key, testDef] of this.tests) {
            // Filter by category if specified
            if (category && testDef.category !== category) continue;
            
            // Filter by pattern if specified
            if (testPattern && !key.includes(testPattern)) continue;
            
            testsRun++;
            this.log('info', `Running test: ${key}`);
            
            const testStart = performance.now();
            try {
                // Execute test with timeout
                await this.executeWithTimeout(testDef.test, this.config.timeoutMs);
                
                const duration = performance.now() - testStart;
                testsPassed++;
                
                results.set(key, {
                    status: 'PASS',
                    duration,
                    requirements: testDef.requirements,
                    category: testDef.category
                });
                
                this.log('info', `✓ ${key} (${duration.toFixed(2)}ms)`);
                
            } catch (error) {
                const duration = performance.now() - testStart;
                
                results.set(key, {
                    status: 'FAIL',
                    error: error.message,
                    stack: error.stack,
                    duration,
                    requirements: testDef.requirements,
                    category: testDef.category
                });
                
                this.log('error', `✗ ${key}: ${error.message}`);
                
                if (this.config.stopOnFirstFailure) {
                    this.log('error', 'Stopping execution due to failure (stopOnFirstFailure=true)');
                    break;
                }
            }
        }
        
        const totalDuration = performance.now() - startTime;
        this.results = results;
        
        const report = this.generateReport(results, testsRun, testsPassed, totalDuration);
        this.log('info', `Test execution complete: ${testsPassed}/${testsRun} passed (${totalDuration.toFixed(2)}ms)`);
        
        return report;
    },
    
    // Execute test with timeout
    executeWithTimeout(testFunction, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            
            Promise.resolve(testFunction()).then(resolve, reject).finally(() => {
                clearTimeout(timer);
            });
        });
    },
    
    // Generate comprehensive test report
    generateReport(results, testsRun, testsPassed, totalDuration) {
        const report = {
            summary: {
                total: testsRun,
                passed: testsPassed,
                failed: testsRun - testsPassed,
                passRate: testsRun > 0 ? (testsPassed / testsRun * 100).toFixed(1) + '%' : '0%',
                duration: totalDuration.toFixed(2) + 'ms'
            },
            categories: this.getCategoryBreakdown(results),
            requirements: this.getRequirementsCoverage(results),
            performance: this.getPerformanceMetrics(results),
            failures: this.getFailureDetails(results)
        };
        
        this.displayReport(report);
        return report;
    },
    
    // Category breakdown analysis
    getCategoryBreakdown(results) {
        const breakdown = {};
        
        for (const [key, result] of results) {
            const category = result.category;
            if (!breakdown[category]) {
                breakdown[category] = { total: 0, passed: 0, failed: 0 };
            }
            
            breakdown[category].total++;
            if (result.status === 'PASS') {
                breakdown[category].passed++;
            } else {
                breakdown[category].failed++;
            }
        }
        
        // Add pass rates
        for (const category in breakdown) {
            const data = breakdown[category];
            data.passRate = data.total > 0 ? (data.passed / data.total * 100).toFixed(1) + '%' : '0%';
        }
        
        return breakdown;
    },
    
    // Requirements coverage analysis
    getRequirementsCoverage(results) {
        const coverage = new Set();
        const testedRequirements = new Set();
        
        for (const [key, result] of results) {
            if (result.requirements && Array.isArray(result.requirements)) {
                result.requirements.forEach(req => {
                    coverage.add(req);
                    if (result.status === 'PASS') {
                        testedRequirements.add(req);
                    }
                });
            }
        }
        
        return {
            totalRequirements: coverage.size,
            testedRequirements: testedRequirements.size,
            coverageRate: coverage.size > 0 ? (testedRequirements.size / coverage.size * 100).toFixed(1) + '%' : '0%',
            requirements: Array.from(coverage).sort()
        };
    },
    
    // Performance metrics analysis
    getPerformanceMetrics(results) {
        const durations = Array.from(results.values()).map(r => r.duration || 0);
        
        if (durations.length === 0) {
            return { avg: 0, min: 0, max: 0, total: 0 };
        }
        
        return {
            avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + 'ms',
            min: Math.min(...durations).toFixed(2) + 'ms',
            max: Math.max(...durations).toFixed(2) + 'ms',
            total: durations.reduce((a, b) => a + b, 0).toFixed(2) + 'ms'
        };
    },
    
    // Failure details extraction
    getFailureDetails(results) {
        const failures = [];
        
        for (const [key, result] of results) {
            if (result.status === 'FAIL') {
                failures.push({
                    test: key,
                    category: result.category,
                    error: result.error,
                    requirements: result.requirements || []
                });
            }
        }
        
        return failures;
    },
    
    // Display formatted report
    displayReport(report) {
        console.log('\n=== KLITE-RPmod Test Report ===');
        console.log(`Summary: ${report.summary.passed}/${report.summary.total} passed (${report.summary.passRate})`);
        console.log(`Duration: ${report.summary.duration}`);
        
        if (Object.keys(report.categories).length > 0) {
            console.log('\nCategories:');
            for (const [category, data] of Object.entries(report.categories)) {
                console.log(`  ${category}: ${data.passed}/${data.total} (${data.passRate})`);
            }
        }
        
        if (report.requirements.totalRequirements > 0) {
            console.log(`\nRequirements Coverage: ${report.requirements.testedRequirements}/${report.requirements.totalRequirements} (${report.requirements.coverageRate})`);
        }
        
        console.log(`\nPerformance: avg ${report.performance.avg}, max ${report.performance.max}`);
        
        if (report.failures.length > 0) {
            console.log('\nFailures:');
            report.failures.forEach(failure => {
                console.log(`  ✗ ${failure.test}: ${failure.error}`);
            });
        }
        
        console.log('===============================\n');
    },
    
    // Logging system
    log(level, message) {
        const levels = { silent: 0, error: 1, info: 2, verbose: 3 };
        const currentLevel = levels[this.config.logLevel] || 2;
        const messageLevel = levels[level] || 2;
        
        if (messageLevel <= currentLevel) {
            const timestamp = new Date().toISOString().substr(11, 8);
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    },
    
    // Utility methods
    setConfig(options) {
        Object.assign(this.config, options);
    },
    
    getTestCount() {
        return this.tests.size;
    },
    
    getTestsByCategory(category) {
        return Array.from(this.tests.entries()).filter(([key, test]) => test.category === category);
    },
    
    clearResults() {
        this.results.clear();
    },
    
    // Quick test execution shortcuts
    runCoreTests() {
        return this.runTests('functional');
    },
    
    runIntegrationTests() {
        return this.runTests('integration');
    },
    
    runPerformanceTests() {
        return this.runTests('performance');
    },
    
    runAllTests() {
        return this.runTests();
    }
};

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KLITETestRunner;
} else if (typeof window !== 'undefined') {
    window.KLITETestRunner = KLITETestRunner;
}