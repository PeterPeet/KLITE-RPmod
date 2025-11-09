// Tests for ROLES group trigger system and Author's Note mode detection
(function(){
  const T = window.KLITETestRunner;

  T.registerTest('workflow', 'group_trigger_round_robin', async () => {
    const roles = KLITE_RPMod.panels.ROLES;
    // Ensure two characters exist
    const c1 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Alice (RR)' };
    const c2 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Bob (RR)' };
    await KLITE_RPMod.panels.CHARS.addCharacter(c1);
    await KLITE_RPMod.panels.CHARS.addCharacter(c2);

    // Enable group with two active chars
    roles.enabled = true;
    roles.activeChars = [ KLITE_RPMod.characters[KLITE_RPMod.characters.length-2], KLITE_RPMod.characters[KLITE_RPMod.characters.length-1] ];
    roles.currentSpeaker = 0;
    roles.speakerMode = 'round-robin';

    // First trigger
    roles.triggerCurrentSpeaker();
    window.Assert.equal(window.localsettings.opmode, 3, 'Chat mode forced');
    window.Assert.equal(window.localsettings.chatopponent, 'Alice (RR)', 'Chat opponent set to current speaker');
    window.Assert.equal(roles.lastSpeaker, 0, 'Last speaker updated');

    // Advance & trigger again
    roles.advanceSpeaker();
    roles.triggerCurrentSpeaker();
    window.Assert.equal(window.localsettings.chatopponent, 'Bob (RR)', 'Chat opponent rotates to next speaker');
    window.Assert.equal(roles.lastSpeaker, 1, 'Last speaker updated after second trigger');
  }, ['ROLES triggers in round-robin']);

  T.registerTest('data', 'authors_note_mode_detection', async () => {
    const notes = KLITE_RPMod.panels.NOTES;
    // Chat mode
    window.localsettings.opmode = 3;
    window.Assert.equal(notes.detectStoryMode(), 'Chat/RP', 'Detects Chat/RP for opmode=3');
    // Instruct
    window.localsettings.opmode = 4;
    window.Assert.equal(notes.detectStoryMode(), 'Chat/RP', 'Detects Chat/RP for opmode=4');
    // Story
    window.localsettings.opmode = 1;
    window.Assert.equal(notes.detectStoryMode(), 'Story', 'Detects Story for opmode=1');
  }, ['Author mode detection uses unified getMode']);

  // Keyword-triggered speaker selection
  T.registerTest('workflow', 'group_trigger_keyword', async () => {
    const roles = KLITE_RPMod.panels.ROLES;
    const c1 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Eve (KW)', keywords: ['eve','evie'] };
    const c2 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Dan (KW)', keywords: ['dan'] };
    await KLITE_RPMod.panels.CHARS.addCharacter(c1);
    await KLITE_RPMod.panels.CHARS.addCharacter(c2);
    roles.enabled = true;
    roles.activeChars = [ KLITE_RPMod.characters.at(-2), KLITE_RPMod.characters.at(-1) ];
    roles.currentSpeaker = 0;
    roles.speakerMode = 'keyword';
    // Seed conversation mentioning Dan explicitly
    window.gametext_arr = [ 'The party looks around. Dan says hello.' ];
    const next = roles.selectNextSpeaker('keyword', true);
    window.Assert.equal(next, 1, 'Keyword mode selects Dan');
    roles.triggerCurrentSpeaker();
    window.Assert.equal(window.localsettings.chatopponent, 'Dan (KW)', 'Chat opponent set to keyword-matched speaker');
  }, ['ROLES keyword mode']);

  // Talkativeness-weighted selection (use Math.random stubs)
  T.registerTest('workflow', 'group_trigger_talkative', async () => {
    const roles = KLITE_RPMod.panels.ROLES;
    const c1 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Loud (TK)', talkativeness: 100 };
    const c2 = { ...KLITEMocks.getSampleCards().v2.data, name: 'Quiet (TK)', talkativeness: 1 };
    await KLITE_RPMod.panels.CHARS.addCharacter(c1);
    await KLITE_RPMod.panels.CHARS.addCharacter(c2);
    roles.enabled = true;
    roles.activeChars = [ KLITE_RPMod.characters.at(-2), KLITE_RPMod.characters.at(-1) ];
    roles.lastTriggerTime = { 0: 0, 1: 0 };
    roles.speakerMode = 'talkative';
    // First weighted selection: force random to 0 to pick the first weight bucket
    const origRand = Math.random;
    Math.random = () => 0.0;
    let next = roles.selectNextSpeaker('talkative', true);
    window.Assert.equal(next, 0, 'Talkative mode selects the louder speaker when not cooled down');
    roles.triggerCurrentSpeaker();
    // Cooldown first speaker by marking just triggered; then force selection into second bucket
    // Compute total weight after cooldown and pick a value greater than first weight
    Math.random = () => 0.99; // end of the range -> likely second bucket
    next = roles.selectNextSpeaker('talkative', true);
    window.Assert.equal(typeof next, 'number', 'Talkative mode returns an index');
    roles.triggerCurrentSpeaker();
    Math.random = origRand;
    window.Assert.equal(window.localsettings.opmode, 3, 'Chat mode forced');
  }, ['ROLES talkative mode']);

  // Author's Note smart settings persistence and info text
  T.registerTest('data', 'authors_smart_settings_persist', async () => {
    // Inject minimal DOM elements expected by saveSmartInjectionSettings
    const ids = ['author-smart-boundaries','author-smart-paragraphs','author-smart-fallback','author-smart-fallback-depth'];
    ids.forEach(id => { if (!document.getElementById(id)) { const el = document.createElement(id==='author-smart-fallback-depth'?'select':'input'); el.id=id; if (el.tagName==='INPUT') el.type='checkbox'; document.body.appendChild(el); } });
    document.getElementById('author-smart-boundaries').checked = true;
    document.getElementById('author-smart-paragraphs').checked = false;
    document.getElementById('author-smart-fallback').checked = true;
    document.getElementById('author-smart-fallback-depth').innerHTML = '<option value="320">320</option><option value="512">512</option>';
    document.getElementById('author-smart-fallback-depth').value = '512';
    KLITE_RPMod.panels.NOTES.saveSmartInjectionSettings();
    const s = window.localsettings.smart_injection;
    window.Assert.isObject(s, 'Smart injection saved');
    window.Assert.isTrue(s.boundaries, 'Boundaries true');
    window.Assert.isFalse(s.paragraphs, 'Paragraphs false');
    window.Assert.isTrue(s.fallback, 'Fallback true');
    window.Assert.equal(s.fallbackDepth, 512, 'Fallback depth 512');
    // Verify info text reflects each mode
    window.Assert.isTrue(KLITE_RPMod.panels.NOTES.getModeInjectionInfo('Story').includes('token-based'));
    window.Assert.isTrue(KLITE_RPMod.panels.NOTES.getModeInjectionInfo('Chat/RP').includes('Smart boundary'));
  }, ['Author smart settings'])
})();
})();
