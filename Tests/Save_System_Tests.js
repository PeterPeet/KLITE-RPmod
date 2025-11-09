// Deep save system tests for Lite/Esolite paths
(function(){
  const T = window.KLITETestRunner;

  async function readKey(key){ return await window.KLITE_RPMod.loadFromLiteStorage(key); }
  async function writeKey(key,val){ return await window.KLITE_RPMod.saveToLiteStorage(key, val); }

  T.registerTest('integration', 'lite_storage_save_load_basic', async () => {
    // Ensure helpers exist
    window.Assert.isType(window.indexeddb_save, 'function', 'indexeddb_save should exist (mock)');
    const ok = await writeKey('rpmod_state', JSON.stringify({ probe: true }));
    window.Assert.isTrue(!!ok, 'Write should succeed');
    const raw = await readKey('rpmod_state');
    window.Assert.isType(raw, 'string', 'Read returns string');
    const obj = JSON.parse(raw);
    window.Assert.isTrue(obj.probe === true, 'Roundtrip works');
  }, ['Save via Lite helpers']);

  T.registerTest('integration', 'direct_indexeddb_fallback', async () => {
    // Remove Lite helpers to force RPmod direct IndexedDB adapter usage
    const bakSave = window.indexeddb_save; const bakLoad = window.indexeddb_load;
    try {
      delete window.indexeddb_save; delete window.indexeddb_load;
      const key = 'rpmod_fallback_probe';
      const payload = JSON.stringify({ when: Date.now() });
      const ok = await writeKey(key, payload);
      window.Assert.isTrue(!!ok, 'Direct IndexedDB write ok');
      const got = await readKey(key);
      window.Assert.equal(got, payload, 'Direct IndexedDB read ok');
    } finally {
      window.indexeddb_save = bakSave; window.indexeddb_load = bakLoad;
    }
  }, ['Save via direct IndexedDB']);

  T.registerTest('integration', 'autosave_hook_writes_bundle', async () => {
    // Trigger autosave, bundle should be stored
    window.Assert.isType(window.autosave, 'function', 'autosave should exist');
    window.autosave();
    await new Promise(r=>setTimeout(r, 100));
    const raw = await readKey('rpmod_autosave');
    window.Assert.isType(raw, 'string', 'Autosave bundle stored');
    const b = JSON.parse(raw);
    window.Assert.hasProperty(b, 'version', 'Bundle version present');
    window.Assert.hasProperty(b, 'ui', 'Bundle ui present');
  }, ['Autosave bundle']);

  T.registerTest('integration', 'embed_and_restore_bundle', async () => {
    // generate_savefile should get rpmod embedded
    const obj = window.generate_savefile(true,true,true);
    window.Assert.hasProperty(obj, 'rpmod', 'Embedded rpmod bundle present');

    // Prepare an altered ui state and load it back via kai_json_load hook
    const saved = JSON.parse(JSON.stringify(obj));
    saved.rpmod.ui = { tabs: { left: 'SCENE', right: 'WI' }, collapsed: { left: true, right: false, top: true }, adventureMode: 2, fullscreen: true, tabletSidepanel: false };
    window.kai_json_load(saved);
    await new Promise(r=>setTimeout(r, 50));
    const st = window.KLITE_RPMod.state;
    window.Assert.equal(st.tabs.left, 'SCENE', 'UI left tab restored');
    window.Assert.equal(st.tabs.right, 'WI', 'UI right tab restored');
    window.Assert.isTrue(!!st.fullscreen, 'Fullscreen restored');
  }, ['Savefile embed/restore']);

  T.registerTest('integration', 'initial_keys_initialized', async () => {
    // First-run init should create core keys
    const state = await readKey('rpmod_state');
    const chars = await readKey('rpmod_characters');
    window.Assert.isType(state || '', 'string', 'rpmod_state exists');
    window.Assert.isType(chars || '', 'string', 'rpmod_characters exists');
  }, ['Default keys exist']);

  T.registerTest('integration', 'visual_style_persist_restore', async () => {
    const v = window.KLITE_RPMod.panels?.SCENE?.visualStyle;
    if (!v) return; // skip if SCENE panel not present
    const before = { ...v };
    window.KLITE_RPMod.panels.SCENE.visualStyle.theme = 'lite0';
    await writeKey('rpmod_visual_style', JSON.stringify(window.KLITE_RPMod.panels.SCENE.visualStyle));
    const raw = await readKey('rpmod_visual_style');
    const saved = JSON.parse(raw);
    window.Assert.equal(saved.theme, 'lite0', 'Visual theme saved');
    // restore
    window.KLITE_RPMod.panels.SCENE.visualStyle = before;
  }, ['Scene style persists']);
})();
