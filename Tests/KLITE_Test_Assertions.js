/**
 * KLITE-RPmod Test Assertions
 * Custom assertion framework for KLITE-specific testing needs
 */

const Assert = {
    // Basic assertions
    equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message || 'Assertion failed'}: expected '${expected}', got '${actual}'`);
        }
    },
    
    notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(`${message || 'Assertion failed'}: expected not '${expected}', but got '${actual}'`);
        }
    },
    
    strictEqual(actual, expected, message) {
        if (actual !== expected || typeof actual !== typeof expected) {
            throw new Error(`${message || 'Strict assertion failed'}: expected '${expected}' (${typeof expected}), got '${actual}' (${typeof actual})`);
        }
    },
    
    isTrue(value, message) {
        if (value !== true) {
            throw new Error(`${message || 'Assertion failed'}: expected true, got '${value}'`);
        }
    },
    
    isFalse(value, message) {
        if (value !== false) {
            throw new Error(`${message || 'Assertion failed'}: expected false, got '${value}'`);
        }
    },
    
    isNull(value, message) {
        if (value !== null) {
            throw new Error(`${message || 'Assertion failed'}: expected null, got '${value}'`);
        }
    },
    
    isNotNull(value, message) {
        if (value === null) {
            throw new Error(`${message || 'Assertion failed'}: expected not null`);
        }
    },
    
    isUndefined(value, message) {
        if (value !== undefined) {
            throw new Error(`${message || 'Assertion failed'}: expected undefined, got '${value}'`);
        }
    },
    
    isNotUndefined(value, message) {
        if (value === undefined) {
            throw new Error(`${message || 'Assertion failed'}: expected not undefined`);
        }
    },
    
    throwsError(fn, message) {
        let thrown = false;
        try {
            fn();
        } catch (error) {
            thrown = true;
        }
        
        if (!thrown) {
            throw new Error(`${message || 'Assertion failed'}: expected function to throw error`);
        }
    },
    
    doesNotThrow(fn, message) {
        try {
            fn();
        } catch (error) {
            throw new Error(`${message || 'Assertion failed'}: expected function not to throw, but got: ${error.message}`);
        }
    },
    
    // Type assertions
    isType(value, expectedType, message) {
        const actualType = typeof value;
        if (actualType !== expectedType) {
            throw new Error(`${message || 'Type assertion failed'}: expected '${expectedType}', got '${actualType}'`);
        }
    },
    
    isArray(value, message) {
        if (!Array.isArray(value)) {
            throw new Error(`${message || 'Array assertion failed'}: expected array, got '${typeof value}'`);
        }
    },
    
    isObject(value, message) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`${message || 'Object assertion failed'}: expected object, got '${typeof value}'`);
        }
    },
    
    isFunction(value, message) {
        if (typeof value !== 'function') {
            throw new Error(`${message || 'Function assertion failed'}: expected function, got '${typeof value}'`);
        }
    },
    
    // Range assertions
    inRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(`${message || 'Range assertion failed'}: ${value} not in range [${min}, ${max}]`);
        }
    },
    
    greaterThan(value, threshold, message) {
        if (value <= threshold) {
            throw new Error(`${message || 'Greater than assertion failed'}: ${value} <= ${threshold}`);
        }
    },
    
    lessThan(value, threshold, message) {
        if (value >= threshold) {
            throw new Error(`${message || 'Less than assertion failed'}: ${value} >= ${threshold}`);
        }
    },
    
    greaterThanOrEqual(value, threshold, message) {
        if (value < threshold) {
            throw new Error(`${message || 'Greater than or equal assertion failed'}: ${value} < ${threshold}`);
        }
    },
    
    lessThanOrEqual(value, threshold, message) {
        if (value > threshold) {
            throw new Error(`${message || 'Less than or equal assertion failed'}: ${value} > ${threshold}`);
        }
    },
    
    // Collection assertions
    arrayLength(array, expectedLength, message) {
        this.isArray(array, message);
        if (array.length !== expectedLength) {
            throw new Error(`${message || 'Array length assertion failed'}: expected length ${expectedLength}, got ${array.length}`);
        }
    },
    
    arrayContains(array, value, message) {
        this.isArray(array, message);
        if (!array.includes(value)) {
            throw new Error(`${message || 'Array contains assertion failed'}: array does not contain '${value}'`);
        }
    },
    
    arrayNotContains(array, value, message) {
        this.isArray(array, message);
        if (array.includes(value)) {
            throw new Error(`${message || 'Array not contains assertion failed'}: array contains '${value}'`);
        }
    },
    
    hasProperty(object, property, message) {
        this.isObject(object, message);
        if (!object.hasOwnProperty(property)) {
            throw new Error(`${message || 'Property assertion failed'}: object does not have property '${property}'`);
        }
    },
    
    // DOM assertions
    elementExists(selector, message, context = document) {
        const element = context.querySelector(selector);
        if (!element) {
            throw new Error(`${message || 'Element assertion failed'}: element '${selector}' not found`);
        }
        return element;
    },
    
    elementNotExists(selector, message, context = document) {
        const element = context.querySelector(selector);
        if (element) {
            throw new Error(`${message || 'Element not exists assertion failed'}: element '${selector}' found`);
        }
    },
    
    elementVisible(selector, message, context = document) {
        const element = this.elementExists(selector, message, context);
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            throw new Error(`${message || 'Element visibility assertion failed'}: element '${selector}' is not visible`);
        }
        return element;
    },
    
    elementHasClass(selector, className, message, context = document) {
        const element = this.elementExists(selector, message, context);
        if (!element.classList.contains(className)) {
            throw new Error(`${message || 'Element class assertion failed'}: element '${selector}' does not have class '${className}'`);
        }
        return element;
    },
    
    elementText(selector, expectedText, message, context = document) {
        const element = this.elementExists(selector, message, context);
        const actualText = element.textContent.trim();
        if (actualText !== expectedText) {
            throw new Error(`${message || 'Element text assertion failed'}: expected '${expectedText}', got '${actualText}'`);
        }
        return element;
    },
    
    // KLITE-specific assertions
    panelExists(panelName, message) {
        if (!KLITE_RPMod || !KLITE_RPMod.panels) {
            throw new Error(`${message || 'Panel assertion failed'}: KLITE_RPMod.panels not available`);
        }
        
        const panel = KLITE_RPMod.panels[panelName];
        if (!panel) {
            throw new Error(`${message || 'Panel assertion failed'}: panel '${panelName}' not found`);
        }
        return panel;
    },
    
    panelRendered(panelName, message) {
        const panel = this.panelExists(panelName, message);
        
        if (typeof panel.render !== 'function') {
            throw new Error(`${message || 'Panel render assertion failed'}: panel '${panelName}' has no render method`);
        }
        
        const html = panel.render();
        if (!html || typeof html !== 'string' || html.trim().length === 0) {
            throw new Error(`${message || 'Panel render assertion failed'}: panel '${panelName}' render returned invalid HTML`);
        }
        return html;
    },
    
    panelInitialized(panelName, message) {
        const panel = this.panelExists(panelName, message);
        
        if (typeof panel.init !== 'function') {
            throw new Error(`${message || 'Panel init assertion failed'}: panel '${panelName}' has no init method`);
        }
        return panel;
    },
    
    // Character card assertions
    validCharacterCard(character, version, message) {
        const validators = {
            v1: this.validateCardV1.bind(this),
            v2: this.validateCardV2.bind(this),
            v3: this.validateCardV3.bind(this)
        };
        
        const validator = validators[version.toLowerCase()];
        if (!validator) {
            throw new Error(`${message || 'Character card assertion failed'}: unknown card version '${version}'`);
        }
        
        return validator(character, message);
    },
    
    validateCardV1(character, message) {
        const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'];
        
        for (const field of requiredFields) {
            if (!character.hasOwnProperty(field)) {
                throw new Error(`${message || 'V1 card validation failed'}: missing required field '${field}'`);
            }
            if (typeof character[field] !== 'string') {
                throw new Error(`${message || 'V1 card validation failed'}: field '${field}' must be string`);
            }
        }
        
        // Validate field lengths
        if (character.name.length === 0 || character.name.length > 100) {
            throw new Error(`${message || 'V1 card validation failed'}: name length must be 1-100 characters`);
        }
        
        return character;
    },
    
    validateCardV2(character, message) {
        if (character.spec !== 'chara_card_v2') {
            throw new Error(`${message || 'V2 card validation failed'}: invalid spec '${character.spec}'`);
        }
        
        if (!character.data || typeof character.data !== 'object') {
            throw new Error(`${message || 'V2 card validation failed'}: missing or invalid data object`);
        }
        
        // Validate V1 fields in data
        this.validateCardV1(character.data, message);
        
        // Validate V2 specific fields
        if (character.data.alternate_greetings && !Array.isArray(character.data.alternate_greetings)) {
            throw new Error(`${message || 'V2 card validation failed'}: alternate_greetings must be array`);
        }
        
        if (character.data.tags && !Array.isArray(character.data.tags)) {
            throw new Error(`${message || 'V2 card validation failed'}: tags must be array`);
        }
        
        return character;
    },
    
    validateCardV3(character, message) {
        if (character.spec !== 'chara_card_v3') {
            throw new Error(`${message || 'V3 card validation failed'}: invalid spec '${character.spec}'`);
        }
        
        // Validate as V2 first
        const v2Character = { ...character, spec: 'chara_card_v2' };
        this.validateCardV2(v2Character, message);
        
        // Validate V3 specific fields
        if (character.data.assets) {
            if (!Array.isArray(character.data.assets)) {
                throw new Error(`${message || 'V3 card validation failed'}: assets must be array`);
            }
            
            for (const asset of character.data.assets) {
                if (!asset.type || !asset.uri || !asset.name) {
                    throw new Error(`${message || 'V3 card validation failed'}: asset missing required fields (type, uri, name)`);
                }
            }
        }
        
        if (character.data.group_only_greetings && !Array.isArray(character.data.group_only_greetings)) {
            throw new Error(`${message || 'V3 card validation failed'}: group_only_greetings must be array`);
        }
        
        return character;
    },
    
    // Performance assertions
    performanceWithin(operation, maxMs, message) {
        const start = performance.now();
        const result = operation();
        const duration = performance.now() - start;
        
        if (duration > maxMs) {
            throw new Error(`${message || 'Performance assertion failed'}: operation took ${duration.toFixed(2)}ms, expected ≤ ${maxMs}ms`);
        }
        
        return { result, duration };
    },
    
    // Integration assertions
    liteIntegrationWorking(apiMethod, message) {
        if (typeof LiteAPI === 'undefined') {
            throw new Error(`${message || 'Lite integration assertion failed'}: LiteAPI not available`);
        }
        
        if (!LiteAPI.isAvailable()) {
            throw new Error(`${message || 'Lite integration assertion failed'}: LiteAPI reports not available`);
        }
        
        if (apiMethod && typeof LiteAPI[apiMethod] === 'undefined') {
            throw new Error(`${message || 'Lite integration assertion failed'}: LiteAPI.${apiMethod} not available`);
        }
    },
    
    storageWorking(message) {
        if (typeof window.indexeddb_save !== 'function') {
            throw new Error(`${message || 'Storage assertion failed'}: indexeddb_save not available`);
        }
        
        if (typeof window.indexeddb_load !== 'function') {
            throw new Error(`${message || 'Storage assertion failed'}: indexeddb_load not available`);
        }
    },
    
    // Generation parameter assertions
    validGenerationParameter(paramName, value, message) {
        const validators = {
            temperature: (v) => v >= 0.1 && v <= 2.0,
            top_p: (v) => v >= 0.1 && v <= 1.0,
            top_k: (v) => v >= 0 && v <= 100,
            min_p: (v) => v >= 0 && v <= 1.0,
            rep_pen: (v) => v >= 1.0 && v <= 2.0,
            rep_pen_range: (v) => v >= 0 && v <= 4096,
            rep_pen_slope: (v) => v >= 0 && v <= 10,
            max_length: (v) => v >= 16 && v <= 120000
        };
        
        const validator = validators[paramName];
        if (!validator) {
            throw new Error(`${message || 'Generation parameter assertion failed'}: unknown parameter '${paramName}'`);
        }
        
        if (!validator(value)) {
            throw new Error(`${message || 'Generation parameter assertion failed'}: invalid value ${value} for parameter '${paramName}'`);
        }
    },
    
    // UI state assertions
    validUIState(state, message) {
        if (!state || typeof state !== 'object') {
            throw new Error(`${message || 'UI state assertion failed'}: state must be object`);
        }
        
        // Check required state properties
        const requiredProps = ['tabs', 'collapsed', 'generating'];
        for (const prop of requiredProps) {
            if (!state.hasOwnProperty(prop)) {
                throw new Error(`${message || 'UI state assertion failed'}: missing required property '${prop}'`);
            }
        }
        
        // Validate tabs
        if (!state.tabs.left || !state.tabs.right) {
            throw new Error(`${message || 'UI state assertion failed'}: tabs must have left and right properties`);
        }
        
        // Validate collapsed states
        if (typeof state.collapsed !== 'object') {
            throw new Error(`${message || 'UI state assertion failed'}: collapsed must be object`);
        }
        
        return state;
    },
    
    // Mobile state assertions
    validMobileState(mobileState, message) {
        if (!mobileState || typeof mobileState !== 'object') {
            throw new Error(`${message || 'Mobile state assertion failed'}: mobile state must be object`);
        }
        
        const requiredProps = ['enabled', 'currentIndex', 'sequence'];
        for (const prop of requiredProps) {
            if (!mobileState.hasOwnProperty(prop)) {
                throw new Error(`${message || 'Mobile state assertion failed'}: missing required property '${prop}'`);
            }
        }
        
        if (!Array.isArray(mobileState.sequence)) {
            throw new Error(`${message || 'Mobile state assertion failed'}: sequence must be array`);
        }
        
        if (typeof mobileState.currentIndex !== 'number' || mobileState.currentIndex < 0) {
            throw new Error(`${message || 'Mobile state assertion failed'}: currentIndex must be non-negative number`);
        }
        
        return mobileState;
    }
};

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Assert;
} else if (typeof window !== 'undefined') {
    window.Assert = Assert;
}