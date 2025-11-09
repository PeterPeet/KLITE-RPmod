// Browser mocks for Lite/Esolite environment and helpers used by RPmod tests
(function(){
  const M = {};

  M.mockBrowserDialogs = function(){
    window.alert = (msg)=>{ console.log('[alert]', msg); };
    window.confirm = (msg)=>{ console.log('[confirm]', msg); return true; };
    window.prompt = (msg,def)=>{ console.log('[prompt]', msg); return def||''; };
  };

  M.installLiteMinimal = function(){
    // Minimal DOM elements needed by RPmod init paths
    const ids = ['gametext','input_text'];
    ids.forEach(id=>{ if(!document.getElementById(id)){ const d=document.createElement('div'); d.id=id; document.body.appendChild(d);} });
    // Top content container for RPmod topbar mirroring
    if (!document.getElementById('top-content')){
      const tc = document.createElement('div'); tc.id='top-content'; document.body.appendChild(tc);
    }
    // Connection status element to mirror into rpmod-connectstatus
    if (!document.getElementById('connectstatus')){
      const cs=document.createElement('div'); cs.id='connectstatus'; cs.textContent='Connected (mock)'; document.body.appendChild(cs);
    }
    // Basic Lite/Esolite nav structure so RPmod can mirror links
    if (!document.getElementById('navbarNavDropdown')){
      const nav = document.createElement('ul'); nav.id='navbarNavDropdown';
      function addNav(id, text){ const li=document.createElement('li'); li.id=id; const a=document.createElement('a'); a.className='nav-link mainnav'; a.href='#'; a.textContent=text; li.appendChild(a); nav.appendChild(li); }
      addNav('topbtn_ai','AI');
      addNav('topbtn_newgame','New Session');
      addNav('topbtn_scenarios','Scenarios');
      addNav('topbtn_save_load','Save / Load');
      addNav('topbtn_settings','Settings');
      document.body.appendChild(nav);
    }
    // Esolite indicators (optional)
    if (!document.getElementById('topbtn_data_manager')){ const dm=document.createElement('div'); dm.id='topbtn_data_manager'; const a=document.createElement('a'); a.className='nav-link mainnav'; a.href='#'; a.textContent='Data'; dm.appendChild(a); document.body.appendChild(dm); }
    if (!document.getElementById('openTreeDiagram')){ const b=document.createElement('button'); b.id='openTreeDiagram'; b.textContent='Tree'; document.body.appendChild(b); }
    // Provide a textarea-like input
    const inp = document.getElementById('input_text'); if (inp) { inp.textContent=''; }

    // Provide basic Lite API and helpers
    window.localsettings = window.localsettings || {
      temperature: 0.7, top_p: 0.9, top_k: 40, min_p: 0.05,
      rep_pen: 1.1, rep_pen_range: 1024, rep_pen_slope: 0.7,
      max_length: 256, chatname: 'You', chatopponent: 'AI', opmode: 4
    };
    window.current_memory = window.current_memory || '';
    window.current_wi = window.current_wi || [];
    window.concat_gametext = window.concat_gametext || function(){ return (window.gametext_arr||[]).join('\n'); };
    window.count_tokens = window.count_tokens || function(str){ return Math.ceil((str||'').length/4); };
    window.save_settings = window.save_settings || function(){};
    window.submit_generation_button = window.submit_generation_button || function(){ return true; };
    window.generate_savefile = window.generate_savefile || function(){ return { stub:true }; };
    window.kai_json_load = window.kai_json_load || function(obj){ return obj; };
    window.autosave = window.autosave || function(){};
    window.STORAGE_PREFIX = window.STORAGE_PREFIX || 'klite_test';

    // Simple in-memory mock for Lite helpers
    const mem = new Map();
    window.indexeddb_save = async function(key, data){ mem.set(key, data); return true; };
    window.indexeddb_load = async function(key){ return mem.has(key) ? mem.get(key) : null; };

    // Kick RPmod init if present and not yet initialized
    setTimeout(()=>{ try { if (window.KLITE_RPMod && !window.KLITE_RPMod._initialized) window.KLITE_RPMod.init(); } catch(_){} }, 200);
  };

  M.createMockFile = function(name, text){
    return new File([text], name, { type: 'application/json' });
  };

  M.createMockPNGFile = function(obj){
    // Not needed for current tests; return a small dummy file object
    return new File([new Uint8Array([137,80,78,71])], 'mock.png', { type: 'image/png' });
  };

  M.getSampleCards = function(){
    return {
      v1: { name:'Test V1', description:'desc', personality:'kind', scenario:'sc', first_mes:'hi', mes_example:'ex' },
      v2: { spec:'chara_card_v2', spec_version:'2.0', data: { name:'Test V2', description:'d', personality:'p', scenario:'s', first_mes:'f', mes_example:'m', tags:['t'] } },
      v3: { spec:'chara_card_v3', spec_version:'3.0', data: { name:'Test V3', description:'d3', personality:'p3', scenario:'s3', first_mes:'f3', mes_example:'m3', assets: [] } }
    };
  };

  window.KLITEMocks = M;

  // Install mocks either immediately or on DOM ready
  function installAll(){
    try { M.mockBrowserDialogs(); } catch(_){}
    try { M.installLiteMinimal(); } catch(_){}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installAll);
  } else {
    installAll();
  }
})();
