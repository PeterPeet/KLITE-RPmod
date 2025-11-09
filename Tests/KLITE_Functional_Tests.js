// Functional tests targeting UI structure and detection
(function(){
  const T = window.KLITETestRunner;

  T.registerTest('workflow', 'left_right_tabs', async () => {
    // Ensure RPmod container exists (init finished)
    window.Assert.elementExists('#klite-container', 'RPmod container should exist');
    // Build UI lists from DOM
    const leftTabs = Array.from(document.querySelectorAll('#panel-left .klite-tab')).map(e=>e.textContent.trim());
    const rightTabs = Array.from(document.querySelectorAll('#panel-right .klite-tab')).map(e=>e.textContent.trim());

    // Left: TOOLS, CONTEXT, SCENE, ROLES, HELP
    ['TOOLS','CONTEXT','SCENE','ROLES','HELP'].forEach(name=>{
      if (!leftTabs.includes(name)) throw new Error(`Missing left tab ${name}`);
    });
    // Right: CHARS, MEMORY, NOTES, WI, TEXTDB
    ['CHARS','MEMORY','NOTES','WI','TEXTDB'].forEach(name=>{
      if (!rightTabs.includes(name)) throw new Error(`Missing right tab ${name}`);
    });
  }, ['Tabs reflect TOOLS/CONTEXT/SCENE/ROLES/HELP']);

  T.registerTest('workflow', 'esolite_detection_topmenu', async () => {
    // Ensure top-content exists for RPmod to inject its topbar
    if (!document.getElementById('top-content')) {
      const tc = document.createElement('div'); tc.id='top-content'; document.body.appendChild(tc);
    }
    // Simulate Esolite nav nodes
    if (!document.getElementById('topbtn_data_manager')){
      const dm = document.createElement('div'); dm.id = 'topbtn_data_manager'; const a=document.createElement('a'); a.className='nav-link mainnav'; a.href='#'; a.textContent='Data'; dm.appendChild(a); document.body.appendChild(dm);
    }
    if (!document.getElementById('openTreeDiagram')){
      const tree = document.createElement('button'); tree.id = 'openTreeDiagram'; tree.textContent='Tree'; document.body.appendChild(tree);
    }
    // Allow RPmod observer to build the bar
    await new Promise(r=>setTimeout(r, 1200));
    window.Assert.elementExists('#rpmod-topbar', 'RPmod topbar should be injected');
    // New RPmod builds its own topbar; presence is sufficient
    const nav = document.querySelector('#rpmod-topbar .rpmod-esolite-nav');
    window.Assert.isTrue(!!nav, 'Nav container present');
  }, ['Esolite detection']);
})();
