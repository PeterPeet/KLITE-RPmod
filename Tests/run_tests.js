#!/usr/bin/env node
/**
 * KLITE-RPmod Test Runner (Node.js)
 * Command-line test execution for CI/CD environments
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Setup JSDOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Set global objects for browser compatibility
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.performance = dom.window.performance || {
    now: () => Date.now()
};

// Mock console for test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: (...args) => originalConsole.log(...args),
    warn: (...args) => originalConsole.warn(...args),
    error: (...args) => originalConsole.error(...args)
};

async function loadScript(filePath) {
    const fullPath = path.resolve(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    try {
        // Create a script element and evaluate it
        const script = document.createElement('script');
        script.textContent = content;
        document.head.appendChild(script);
        
        // For ES modules or specific patterns, use eval as fallback
        if (content.includes('module.exports') || content.includes('export')) {
            eval(content);
        }
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        throw error;
    }
}

async function runTests() {
    console.log('🚀 KLITE-RPmod Test Runner (Node.js)');
    console.log('=====================================\n');
    
    try {
        // Load KLITE-RPmod first
        console.log('📦 Loading KLITE-RPmod ALPHA...');
        await loadScript('../KLITE-RPmod_ALPHA.js');
        
        // Load test framework
        console.log('🔧 Loading test framework...');
        await loadScript('KLITE_Test_Mocks.js');
        await loadScript('KLITE_Test_Assertions.js');
        await loadScript('KLITE_Test_Runner.js');
        
        // Load test suites
        console.log('📋 Loading test suites...');
        await loadScript('Core_System_Tests.js');
        await loadScript('Panel_System_Tests.js');
        await loadScript('Character_Management_Tests.js');
        await loadScript('Integration_Tests.js');
        
        console.log('✅ All components loaded successfully\n');
        
        // Configure for headless execution
        if (global.KLITETestRunner) {
            KLITETestRunner.setConfig({
                logLevel: 'error', // Reduce noise in CI
                timeoutMs: 10000,  // Longer timeout for CI
                stopOnFirstFailure: false
            });
            
            console.log('🎯 Running all tests...\n');
            
            // Run tests
            const report = await KLITETestRunner.runAllTests();
            
            // Display results
            console.log('📊 Test Results Summary:');
            console.log('========================');
            console.log(`Total Tests: ${report.summary.total}`);
            console.log(`Passed: ${report.summary.passed} ✅`);
            console.log(`Failed: ${report.summary.failed} ❌`);
            console.log(`Pass Rate: ${report.summary.passRate}`);
            console.log(`Duration: ${report.summary.duration}\n`);
            
            // Category breakdown
            if (Object.keys(report.categories).length > 0) {
                console.log('📂 Category Breakdown:');
                for (const [category, data] of Object.entries(report.categories)) {
                    const status = data.failed > 0 ? '❌' : '✅';
                    console.log(`  ${status} ${category}: ${data.passed}/${data.total} (${data.passRate})`);
                }
                console.log();
            }
            
            // Requirements coverage
            if (report.requirements.totalRequirements > 0) {
                console.log('📋 Requirements Coverage:');
                console.log(`  Tested: ${report.requirements.testedRequirements}/${report.requirements.totalRequirements} (${report.requirements.coverageRate})\n`);
            }
            
            // Performance metrics
            if (report.performance) {
                console.log('⚡ Performance Metrics:');
                console.log(`  Average: ${report.performance.avg}`);
                console.log(`  Maximum: ${report.performance.max}`);
                console.log(`  Total: ${report.performance.total}\n`);
            }
            
            // Show failures if any
            if (report.failures && report.failures.length > 0) {
                console.log('❌ Test Failures:');
                console.log('================');
                report.failures.forEach((failure, index) => {
                    console.log(`${index + 1}. ${failure.test}`);
                    console.log(`   Category: ${failure.category}`);
                    console.log(`   Error: ${failure.error}`);
                    if (failure.requirements.length > 0) {
                        console.log(`   Requirements: ${failure.requirements.join(', ')}`);
                    }
                    console.log();
                });
            }
            
            // Exit with appropriate code
            const exitCode = report.summary.failed > 0 ? 1 : 0;
            console.log(exitCode === 0 ? '🎉 All tests passed!' : '💥 Some tests failed.');
            process.exit(exitCode);
            
        } else {
            console.error('❌ KLITETestRunner not available');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Command line argument parsing
const args = process.argv.slice(2);
const category = args.find(arg => !arg.startsWith('-'));
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

if (help) {
    console.log(`
KLITE-RPmod Test Runner

Usage: node run_tests.js [category] [options]

Categories:
  functional    Run functional tests only
  integration   Run integration tests only
  performance   Run performance tests only
  data          Run data validation tests only

Options:
  --verbose, -v    Enable verbose output
  --help, -h       Show this help message

Examples:
  node run_tests.js                    # Run all tests
  node run_tests.js functional         # Run functional tests only
  node run_tests.js integration -v     # Run integration tests with verbose output
`);
    process.exit(0);
}

if (verbose && global.KLITETestRunner) {
    KLITETestRunner.setConfig({ logLevel: 'verbose' });
}

// Run tests
runTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});