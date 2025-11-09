// Avatar adapter tests: policy, mapping, and DOM injection (lightweight)
(function(){
  const T = window.KLITETestRunner;

  T.registerTest('data', 'avatar_policy_persistence', async () => {
    // Enable Lite experimental, then ensure it persists through bundle save/restore
    KLITE_RPMod.enableLiteAvatarsExperimental(true);
    const bundle = KLITE_RPMod.getSaveBundle();
    window.Assert.isObject(bundle.ui, 'Bundle has ui');
    window.Assert.isObject(bundle.ui.avatarPolicy, 'Bundle persists avatarPolicy');
    window.Assert.isTrue(bundle.ui.avatarPolicy.liteExperimental, 'liteExperimental persisted');
    // Reset and restore
    KLITE_RPMod.state.avatarPolicy = { esoliteAdapter:false, liteExperimental:false };
    KLITE_RPMod.restoreFromSaveBundle(bundle);
    window.Assert.isTrue(!!KLITE_RPMod.state.avatarPolicy.liteExperimental, 'liteExperimental restored');
  }, ['Avatar policy persisted']);

  T.registerTest('workflow', 'avatar_name_mapping', async () => {
    // Set persona and character with small avatar strings
    const persona = { id:'p1', name:'PersonaUser', images:{ avatar:'data:image/png;base64,pers' } };
    const character = { id:'c1', name:'TestAI', images:{ avatar:'data:image/png;base64,chai' } };
    KLITE_RPMod.panels.TOOLS.selectedPersona = persona;
    KLITE_RPMod.panels.TOOLS.personaEnabled = true;
    KLITE_RPMod.panels.TOOLS.selectedCharacter = character;
    KLITE_RPMod.panels.TOOLS.characterEnabled = true;
    // Group mapping
    KLITE_RPMod.panels.ROLES.enabled = true;
    KLITE_RPMod.panels.ROLES.activeChars = [{ id:'g1', name:'Alice', images:{ avatar:'data:image/png;base64,al' } }];
    const userAv = KLITE_RPMod.getBestAvatarForName('PersonaUser', true);
    const groupAv = KLITE_RPMod.getBestAvatarForName('Alice', false);
    const singleAv = KLITE_RPMod.getBestAvatarForName('TestAI', false);
    window.Assert.isTrue(typeof userAv === 'string', 'Persona avatar resolves');
    window.Assert.isTrue(typeof groupAv === 'string', 'Group avatar resolves');
    window.Assert.isTrue(typeof singleAv === 'string', 'Single-mode avatar resolves');
  }, ['Avatar mapping by name']);

  T.registerTest('integration', 'avatar_dom_injection_new_nodes', async () => {
    // Enable experimental Lite avatars
    KLITE_RPMod.enableLiteAvatarsExperimental(true);
    // Prepare selected character avatar
    KLITE_RPMod.panels.TOOLS.selectedCharacter = { id:'cX', name:'DomAI', images:{ avatar:'data:image/png;base64,dA' } };
    // Create a mock chat row containing an img and a name span
    const row = document.createElement('div');
    const img = document.createElement('img');
    const name = document.createElement('span'); name.className='name'; name.textContent='DomAI';
    row.appendChild(img); row.appendChild(name);
    // Append into the primary chat container so the scoped observer sees it
    const chatContainer = document.getElementById('gametext') || document.body;
    chatContainer.appendChild(row);
    // MutationObserver should process the added node; give it a tick
    await new Promise(r=>setTimeout(r, 50));
    window.Assert.isTrue(!!img.src && img.src.includes('data:image/png'), 'Avatar src applied to new node');
  }, ['Avatar DOM injection on new rows']);
})();
