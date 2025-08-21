/**
 * KLITE-RPmod Storage and Migration Tests
 */

KLITETestRunner.registerTest('integration', 'storage_state_roundtrip', async () => {
  // Ensure starter state
  await KLITE_RPMod.loadState?.();

  const original = JSON.parse(JSON.stringify(KLITE_RPMod.state));
  try {
    // Change state and save
    KLITE_RPMod.state.tabs.left = 'TOOLS';
    KLITE_RPMod.state.tabs.right = 'CHARS';
    await KLITE_RPMod.saveState();

    // Mutate state to different values, then reload
    KLITE_RPMod.state.tabs.left = 'PLAY';
    KLITE_RPMod.state.tabs.right = 'MEMORY';
    await KLITE_RPMod.loadState();

    // Should be restored to saved values
    Assert.equal(KLITE_RPMod.state.tabs.left, 'TOOLS', 'Left tab must persist through save/load');
    Assert.equal(KLITE_RPMod.state.tabs.right, 'CHARS', 'Right tab must persist through save/load');
  } finally {
    KLITE_RPMod.state = original;
    await KLITE_RPMod.saveState?.();
  }
}, ['REQ-NF-033']);

KLITETestRunner.registerTest('integration', 'generic_storage_key_roundtrip', async () => {
  const key = 'rpmod_test_generic_key';
  const payload = { x: 1, y: 'two', z: [3] };
  await KLITE_RPMod.saveToLiteStorage(key, JSON.stringify(payload));
  const loaded = await KLITE_RPMod.loadFromLiteStorage(key);
  Assert.isNotNull(loaded, 'Generic storage key must load');
  const obj = JSON.parse(loaded);
  Assert.equal(obj.x, 1, 'Stored object must match (x)');
  Assert.equal(obj.y, 'two', 'Stored object must match (y)');
  Assert.arrayLength(obj.z, 1, 'Stored object must match (z)');
}, ['REQ-I-018']);

KLITETestRunner.registerTest('integration', 'group_settings_persistence', async () => {
  const gp = KLITE_RPMod.panels.GROUP;
  await gp.loadSettings?.();
  const original = { speakerMode: gp.speakerMode, autoResponses: { ...gp.autoResponses } };

  try {
    gp.changeSpeakerMode('talkative');
    gp.toggleAutoResponses(true);
    gp.updateAutoResponseDelay(7);
    gp.updateAutoResponseSetting('continueWithoutPlayer', true);
    // Explicit save via internal method
    KLITE_RPMod.saveToLiteStorage('rpmod_group_settings', JSON.stringify({
      speakerMode: gp.speakerMode,
      autoResponses: gp.autoResponses
    }));

    // Reload and verify
    await gp.loadSettings?.();
    Assert.equal(gp.speakerMode, 'talkative', 'Speaker mode must persist');
    Assert.equal(gp.autoResponses.enabled, true, 'Auto responses enabled must persist');
    Assert.equal(gp.autoResponses.delay, 7, 'Auto response delay must persist');
    Assert.equal(gp.autoResponses.continueWithoutPlayer, true, 'Auto response setting must persist');
  } finally {
    // Restore
    gp.speakerMode = original.speakerMode;
    gp.autoResponses = { ...original.autoResponses };
    KLITE_RPMod.saveToLiteStorage('rpmod_group_settings', JSON.stringify(original));
  }
}, ['REQ-F-079']);

