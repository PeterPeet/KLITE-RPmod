// =============================================================================
// KLITE RPmod — Debug core (topics, KLITE_RPDebug controls) and the opt-in console restoration.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installDebug(S) {
    // =============================================
    // CONSOLE RESTORATION FOR KOBOLDAI LITE (GATED)
    // =============================================
    // Gate behind a config flag to avoid intrusive behavior / CSP issues.
    // Enable by setting window.KLITE_RPMod_Config = { enableConsoleRestore: true } before script load,
    // or by setting localStorage key 'rpmod_enable_console_restore' to '1'.
    (function(){
      try {
        const cfgEnabled = !!(window.KLITE_RPMod_Config && window.KLITE_RPMod_Config.enableConsoleRestore);
        const lsEnabled = (typeof localStorage !== 'undefined' && localStorage.getItem('rpmod_enable_console_restore') === '1');
        if (!(cfgEnabled || lsEnabled)) return;
        const consoleFrame = document.createElement('iframe');
        consoleFrame.style.display = 'none';
        document.body.appendChild(consoleFrame);
        if (consoleFrame.contentWindow && consoleFrame.contentWindow.console) {
          window.console = consoleFrame.contentWindow.console;
          try { window.console.log('[KLITE RPMod] Console access restored via iframe'); } catch(_){}
        }
      } catch (e) {
        // Keep existing console; do not fail initialization
      }
    })();

    // =============================================
    // DEBUG CORE (topics, controls, hooks)
    // =============================================
    (function setupRpmodDebugCore(){
      try {
        const TOPICS_DEFAULTS = {
          essential: true,
          init: false,
          panels: false,
          group: true,
          avatars: true,
          chars: false,
          generation: false,
          state: false,
          integration: false,
          hotkeys: false,
          debug: false,
          errors: true,
          chat: false,
          mobile: false,
          status: false,
          // Added topics
          storage: false,
          network: false,
          esolite: false,
          hooks: false,
          ui: false,
          narrator: false
        };

        // Merge defaults into existing config if any
        try {
          if (!window.KLITE_RPMod) window.KLITE_RPMod = {};
          if (!window.KLITE_RPMod.debugLevels) window.KLITE_RPMod.debugLevels = {};
          for (const k of Object.keys(TOPICS_DEFAULTS)) {
            if (typeof window.KLITE_RPMod.debugLevels[k] === 'undefined') {
              window.KLITE_RPMod.debugLevels[k] = TOPICS_DEFAULTS[k];
            }
          }
          if (typeof window.KLITE_RPMod.debug !== 'boolean') window.KLITE_RPMod.debug = true;
        } catch(_) {}

        // Topic loader from localStorage
        function applyTopicsFromLocalStorage() {
          try {
            const raw = localStorage.getItem('KLITE.debug.topics') || '';
            const off = localStorage.getItem('KLITE.debug.off') || '';
            const dbg = localStorage.getItem('KLITE.debug.enabled');
            if (dbg != null) {
              window.KLITE_RPMod = window.KLITE_RPMod || {};
              window.KLITE_RPMod.debug = (dbg === '1' || /^true$/i.test(dbg));
            }
            const onAll = /(\*|^all$)/i.test(raw.trim());
            const offAll = /(\*|^all$)/i.test(off.trim());
            const onSet = new Set(raw.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean));
            const offSet = new Set(off.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean));
            const levels = window.KLITE_RPMod.debugLevels || {};
            const keys = Object.keys(levels);
            keys.forEach(k => {
              if (offAll) { levels[k] = false; return; }
              if (onAll) { levels[k] = true; return; }
              if (onSet.size>0) levels[k] = onSet.has(k);
              if (offSet.has(k)) levels[k] = false;
            });
            try { console.log('[KLITE RPMod][DEBUG] topics applied:', Object.entries(levels).filter(([k,v])=>v).map(([k])=>k).join(', ')); } catch(_){}
          } catch(_) {}
        }

        // Expose console helpers
        function setTopics(topicsStr){ try { localStorage.setItem('KLITE.debug.topics', topicsStr||''); applyTopicsFromLocalStorage(); } catch(_){} }
        function setTopicsOff(topicsStr){ try { localStorage.setItem('KLITE.debug.off', topicsStr||''); applyTopicsFromLocalStorage(); } catch(_){} }
        function setEnabled(enabled){ try { localStorage.setItem('KLITE.debug.enabled', enabled? '1' : '0'); applyTopicsFromLocalStorage(); } catch(_){} }
        function on(){ setTopics(Array.from(arguments).join(',')); setTopicsOff(''); }
        function off(){ setTopics(''); setTopicsOff(Array.from(arguments).join(',')); }
        function all(){ setTopics('all'); setTopicsOff(''); }
        function none(){ setTopics(''); setTopicsOff('all'); }
        function list(){ try { const lv=window.KLITE_RPMod.debugLevels||{}; console.log('[KLITE RPMod][DEBUG] topics:', lv); } catch(_){} }

        // On-demand console restoration via iframe (same as boot-time gate)
        function restoreConsole(){
          try {
            const consoleFrame = document.createElement('iframe');
            consoleFrame.style.display = 'none';
            document.body.appendChild(consoleFrame);
            if (consoleFrame.contentWindow && consoleFrame.contentWindow.console) {
              window.console = consoleFrame.contentWindow.console;
              try { window.console.log('[KLITE RPMod] Console access restored via iframe'); } catch(_){}
            }
          } catch(_){}
        }

        try {
          window.KLITE_RPDebug = window.KLITE_RPDebug || {};
          Object.assign(window.KLITE_RPDebug, { setTopics, setTopicsOff, setEnabled, on, off, all, none, list, applyTopicsFromLocalStorage, restoreConsole });
        } catch(_){}

        // Apply at startup
        applyTopicsFromLocalStorage();
      } catch(_) {}
    })();
}
