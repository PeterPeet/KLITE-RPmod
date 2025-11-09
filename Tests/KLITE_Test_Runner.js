// Simple browser test runner for KLITE-RPmod
window.KLITETestRunner = (function(){
  const tests = new Map();
  const results = new Map();
  let config = { timeoutMs: 6000, logLevel: 'info', stopOnFirstFailure: false };

  function log(level, ...args){
    const order = { silent:0, error:1, info:2, verbose:3 };
    if ((order[config.logLevel] || 2) >= (order[level] || 2)) console.log('[Tests]', ...args);
  }

  async function runOne(key, def){
    const start = performance.now();
    let timer; let done=false;
    try{
      await Promise.race([
        def.test(),
        new Promise((_,rej)=>{ timer=setTimeout(()=>rej(new Error('Timeout')), config.timeoutMs); })
      ]);
      done=true; clearTimeout(timer);
      const dur = performance.now()-start;
      results.set(key, { status:'PASS', duration: dur, requirements: def.requirements||[] });
      log('info', `PASS ${key} (${dur.toFixed(1)}ms)`);
    }catch(e){
      if(!done) clearTimeout(timer);
      results.set(key, { status:'FAIL', error: e && e.message || String(e), requirements: def.requirements||[] });
      log('error', `FAIL ${key}:`, e && e.message || e);
      if (config.stopOnFirstFailure) throw e;
    }
  }

  async function ensureInitialized(){
    // Wait a bit for RPmod to bootstrap
    const start = Date.now();
    while (!(window.KLITE_RPMod && (window.KLITE_RPMod._initialized || document.getElementById('klite-container'))) && Date.now()-start < 8000){
      await new Promise(r=>setTimeout(r,100));
    }
  }

  return {
    tests, results,
    setConfig(newCfg){ config = { ...config, ...newCfg }; },
    registerTest(category, name, test, requirements){
      const key = `${category}.${name}`;
      tests.set(key, { category, name, test, requirements: requirements||[] });
    },
    getTestCount(){ return tests.size; },
    getResultsArray(){
      const arr=[];
      for (const [key, v] of results){ arr.push({ key, status:v.status, error:v.error||null, duration:v.duration||null, requirements:v.requirements||[] }); }
      return arr;
    },
    clearResults(){ results.clear(); },
    async runAllTests(){ return this.runTests(null); },
    async runTests(category=null, namePattern=null){
      await ensureInitialized();
      results.clear();
      const filter = (key, def) => (!category || def.category===category) && (!namePattern || key.includes(namePattern));
      for (const [key, def] of tests){ if (filter(key,def)) await runOne(key, def); }
      const summary = { total:0, passed:0, failed:0, passRate:'0%', duration:'n/a' };
      let dur=0; for(const [,r] of results){ summary.total++; if(r.status==='PASS'){ summary.passed++; dur+=r.duration||0; } else summary.failed++; }
      summary.passRate = summary.total ? Math.round((summary.passed/summary.total)*100)+'%' : '0%';
      summary.duration = Math.round(dur)+'ms';
      return { summary };
    }
  };
})();
