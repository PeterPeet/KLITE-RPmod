# KLITE-RPmod Functional Test Suite

## Overview

This test suite validates core user workflows and real-world scenarios for KLITE-RPmod. The tests are designed to ensure stability and functionality of the primary roleplay features.

## Files

- **`KLITE_Test_Mocks.js`** - Mock objects and data for isolated testing
- **`KLITE_Test_Runner.js`** - Test execution framework with reporting
- **`KLITE_Functional_Tests.js`** - Functional tests for user workflows
- **`README_Tests.md`** - This documentation

## Test Categories

### 🔄 Workflow Tests
Validate complete user workflows from start to finish:

1. **Casual Roleplay Session** (Most Common)
   - Character import and selection
   - Scenario initialization
   - Basic roleplay interaction
   - Session persistence

2. **Character Library Management**
   - Multi-format character import (V1/V2/V3)
   - Character search and filtering
   - Character editing and duplication
   - Character export functionality

3. **Memory System Validation**
   - Memory initialization and accumulation
   - Memory persistence across sessions
   - Context optimization for local LLMs

4. **World Info Management**
   - World info entry creation
   - Keyword-based activation
   - Category organization
   - Persistence testing

5. **Group Chat Management**
   - Multi-character setup
   - Character rotation logic
   - Group conversation flow
   - Session persistence

6. **Mobile Navigation Stability**
   - Navigation boundary testing
   - Handle click blocking
   - Mobile mode state management

### 🔗 Integration Tests
Validate multiple systems working together:

1. **Complete Roleplay Workflow**
   - End-to-end roleplay session
   - Character + Memory + World Info integration
   - Context building and optimization

## Running Tests

### Node (Headless)

Run all tests:
```
node tests/run_tests.js
```

Run by category:
```
node tests/run_tests.js functional
node tests/run_tests.js integration
node tests/run_tests.js performance
node tests/run_tests.js data
```

Verbose mode:
```
node tests/run_tests.js --verbose
```

### Configuration Options

```javascript
KLITETestRunner.setConfig({
    timeoutMs: 5000,           // Test timeout
    logLevel: 'info',          // 'silent', 'error', 'info', 'verbose'
    stopOnFirstFailure: false  // Continue after failures
});
```

## Test Requirements Coverage

The tests validate requirements from the following user stories:

- **US-RP-001**: Quick Character Start
- **US-RP-002**: Character Library Management
- **US-RP-003**: Persistent Memory System
- **US-RP-004**: Group Chat Orchestration
- **US-TOOL-001**: Context Optimization
- **US-CREATE-001**: World Building
- **US-UX-001**: Mobile Experience

## Expected Results

A healthy KLITE-RPmod implementation should achieve:

- **Pass Rate**: ≥95% (target: 100%)
- **Performance**: All tests complete in <30 seconds
- **Stability**: No crashes or unhandled errors
- **Consistency**: Results reproducible across runs

## Troubleshooting

### Common Issues

1. **"KLITE-RPmod not available"**
   - Ensure KLITE-RPmod_ALPHA.js is loaded before test files
   - Check browser console for loading errors

2. **"Mock storage save failed"**
   - Browser storage may be disabled
   - Try running in incognito mode

3. **Tests timeout**
   - Increase timeout in configuration
   - Check for infinite loops in implementation

4. **Mobile navigation tests fail**
   - Verify mobile mode implementation
   - Check handle click blocking logic

### Debugging

Enable verbose logging to see detailed test execution:

```javascript
KLITETestRunner.setConfig({ logLevel: 'verbose' });
```

View detailed error information in test results:

```javascript
// After running tests
console.log(KLITETestRunner.results);
```

## Contributing

When adding new features to KLITE-RPmod:

1. Add corresponding functional tests
2. Update user story references
3. Ensure ≥95% pass rate maintained
4. Test on mobile viewport (349px+)

### Test Structure

```javascript
KLITETestRunner.registerTest('category', 'test_name', async function() {
    // Test implementation
    // Should throw Error on failure
    // Should return true on success
}, ['requirement1', 'requirement2']);
```

## Integration with Development

These tests should be run:

- **Before commits** - Ensure no regressions
- **After feature additions** - Validate new functionality
- **Before releases** - Comprehensive stability check
- **During debugging** - Isolate problematic areas

## Future Enhancements

Planned test additions:

- Visual regression tests for UI components
- Performance benchmarks for large character libraries
- Cross-browser compatibility validation
- Accessibility compliance testing
- Load testing for group chat scenarios