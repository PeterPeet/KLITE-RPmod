/**
 * KLITE-RPmod Group Chat Mode Tests
 * Deep unit tests for speaker selection modes and trigger behavior
 * Requirements: REQ-F-070..REQ-F-079
 */

KLITETestRunner.registerTest('functional', 'group_modes_manual_round_robin', async () => {
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'a', name: 'Alice', talkativeness: 50 },
        { id: 'b', name: 'Bob', talkativeness: 50 },
        { id: 'c', name: 'Carol', talkativeness: 50 }
    ];

    // Manual: increments currentSpeaker modulo length
    gp.currentSpeaker = 0;
    let next = gp.selectNextSpeaker('manual', true);
    Assert.equal(gp.currentSpeaker, 1, 'Manual should advance to index 1');
    next = gp.selectNextSpeaker('manual', true);
    Assert.equal(gp.currentSpeaker, 2, 'Manual should advance to index 2');
    next = gp.selectNextSpeaker('manual', true);
    Assert.equal(gp.currentSpeaker, 0, 'Manual should wrap to index 0');

    // Round-robin: uses roundRobinPosition
    gp.roundRobinPosition = 0;
    next = gp.selectNextSpeaker('round-robin', true);
    Assert.equal(gp.currentSpeaker, 1, 'Round-robin should move to index 1');
    next = gp.selectNextSpeaker('round-robin', true);
    Assert.equal(gp.currentSpeaker, 2, 'Round-robin should move to index 2');
    next = gp.selectNextSpeaker('round-robin', true);
    Assert.equal(gp.currentSpeaker, 0, 'Round-robin should wrap');
}, ['REQ-F-071', 'REQ-F-072']);

KLITETestRunner.registerTest('functional', 'group_modes_keyword_party', async () => {
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'a', name: 'Alice', keywords: ['healer'] },
        { id: 'b', name: 'Bob', keywords: ['warrior'] },
        { id: 'c', name: 'Carol', keywords: ['mage'] }
    ];

    // Prepare last message with keyword match for Bob
    window.gametext_arr = ['The brave warrior Bob steps forward.'];
    const idx = gp.selectNextSpeaker('keyword', false);
    Assert.equal(idx, 1, 'Keyword mode should select Bob (index 1)');

    // Party mode deterministic sequence (disable shuffle)
    const originalShuffle = gp.shuffleArray;
    gp.shuffleArray = (arr) => arr; // no-op to keep order [0,1,2]
    try {
        // First time: partyRoundSpeakers becomes [0,1,2] and pop() returns 2
        let p = gp.selectNextSpeaker('party', false);
        Assert.equal(p, 2, 'Party pop 1 returns last index 2');
        p = gp.selectNextSpeaker('party', false);
        Assert.equal(p, 1, 'Party pop 2 returns next index 1');
        p = gp.selectNextSpeaker('party', false);
        Assert.equal(p, 0, 'Party pop 3 returns next index 0');
    } finally {
        gp.shuffleArray = originalShuffle;
    }
}, ['REQ-F-074', 'REQ-F-076']);

KLITETestRunner.registerTest('functional', 'group_modes_random_talkative_validity', async () => {
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'a', name: 'Alice', talkativeness: 10 },
        { id: 'b', name: 'Bob', talkativeness: 90 }
    ];
    gp.currentSpeaker = 0;

    // Random: ensure returns a valid index and not null
    const origRandom = Math.random;
    let toggle = false;
    Math.random = () => (toggle = !toggle) ? 0.2 : 0.8; // avoid pathological loops
    try {
        const r = gp.selectNextSpeaker('random', false);
        Assert.isTrue(r === 0 || r === 1, 'Random should select a valid index');
    } finally {
        Math.random = origRandom;
    }

    // Talkative: valid index and lastTriggerTime updated after trigger
    window.localsettings = window.localsettings || {};
    let called = 0;
    const origSubmit = window.submit_generation;
    const origChatSubmit = window.chat_submit_generation;
    window.submit_generation = () => { called++; };
    window.chat_submit_generation = () => { called++; };
    try {
        gp.currentSpeaker = 1; // Bob
        gp.triggerCurrentSpeaker();
        Assert.equal(called, 1, 'Trigger should invoke generation');
        Assert.isType(gp.lastTriggerTime[1], 'number', 'Talkative should update lastTriggerTime for current speaker');
        const t = gp.selectNextSpeaker('talkative', false);
        Assert.isTrue(t === 0 || t === 1, 'Talkative should select a valid index');
    } finally {
        window.submit_generation = origSubmit;
        window.chat_submit_generation = origChatSubmit;
    }
}, ['REQ-F-073', 'REQ-F-075', 'REQ-F-077']);

KLITETestRunner.registerTest('integration', 'group_trigger_and_settings_integration', async () => {
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' }
    ];

    window.localsettings = { opmode: 3, chatopponent: '' };
    window.groupchat_removals = [];

    // updateKoboldSettings should set chatopponent to joined names
    gp.updateKoboldSettings();
    Assert.equal(window.localsettings.chatopponent, 'Alice||$||Bob', 'Participants list should be set');
    Assert.isArray(window.groupchat_removals, 'groupchat_removals must be array');

    // Trigger current speaker should set chatopponent and call generation
    let genCalled = 0;
    const origChatSubmit = window.chat_submit_generation;
    const origSubmit = window.submit_generation;
    window.chat_submit_generation = () => { genCalled++; };
    window.submit_generation = () => { genCalled++; };
    try {
        gp.currentSpeaker = 0;
        gp.triggerCurrentSpeaker();
        Assert.equal(window.localsettings.chatopponent, 'Alice', 'Trigger should set chatopponent to current speaker');
        Assert.equal(genCalled, 1, 'Trigger should invoke chat generation');
    } finally {
        window.chat_submit_generation = origChatSubmit;
        window.submit_generation = origSubmit;
    }
}, ['REQ-F-077', 'REQ-F-078']);
