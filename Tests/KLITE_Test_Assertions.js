// Minimal assertion helpers for KLITE-RPmod tests (browser only)
window.Assert = {
  equal(actual, expected, message) {
    if (actual !== expected) throw new Error((message || 'Expected equality') + `: got ${actual}, expected ${expected}`);
  },
  notEqual(actual, expected, message) {
    if (actual === expected) throw new Error(message || 'Expected values to differ');
  },
  isTrue(value, message) { if (!value) throw new Error(message || 'Expected truthy value'); },
  isFalse(value, message) { if (value) throw new Error(message || 'Expected falsy value'); },
  isType(value, type, message) { if (typeof value !== type) throw new Error((message || 'Wrong type') + `: ${typeof value} !== ${type}`); },
  isArray(value, message) { if (!Array.isArray(value)) throw new Error(message || 'Expected array'); },
  isObject(value, message) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message || 'Expected object'); },
  hasProperty(obj, prop, message) { if (!obj || !(prop in obj)) throw new Error((message || 'Missing property') + `: ${prop}`); },
  elementExists(selector, message) { const el = document.querySelector(selector); if (!el) throw new Error((message || 'Element not found') + `: ${selector}`); return el; },
  throwsError(fn, message) { let threw=false; try{ fn(); }catch(_){ threw=true; } if(!threw) throw new Error(message || 'Expected function to throw'); },
  asyncDoesNotThrow: async (fn, message) => { try { await fn(); } catch (e) { throw new Error((message || 'Unexpected throw') + ': ' + (e && e.message || e)); } },
  doesNotThrow(fn, message) {
    try {
      const r = fn();
      if (r && typeof r.then === 'function') {
        return r.then(() => true).catch(e => { throw new Error((message || 'Unexpected throw') + ': ' + (e && e.message || e)); });
      }
      return true;
    } catch (e) {
      throw new Error((message || 'Unexpected throw') + ': ' + (e && e.message || e));
    }
  },
  greaterThan(a, b, message) { if (!(a > b)) throw new Error(message || `Expected ${a} > ${b}`); },
  greaterThanOrEqual(a, b, message) { if (!(a >= b)) throw new Error(message || `Expected ${a} >= ${b}`); },
  lessThanOrEqual(a, b, message) { if (!(a <= b)) throw new Error(message || `Expected ${a} <= ${b}`); },
  isUndefined(value, message) { if (typeof value !== 'undefined') throw new Error(message || 'Expected undefined'); },
  // Storage availability check
  storageWorking(message){
    if (!window.KLITE_RPMod || typeof window.KLITE_RPMod.saveToLiteStorage !== 'function' || typeof window.KLITE_RPMod.loadFromLiteStorage !== 'function') {
      throw new Error(message || 'Storage not available');
    }
  },
  // Character card validators (minimal schema checks for tests)
  validCharacterCard(card, version, message){
    try {
      const v = (version||'').toLowerCase();
      if (v === 'v1') {
        const req = ['name','description','personality','scenario','first_mes','mes_example'];
        req.forEach(f=>{ if (typeof card[f] !== 'string') throw new Error('missing '+f); });
        return true;
      }
      if (v === 'v2') {
        if (!card || card.spec !== 'chara_card_v2' || card.spec_version !== '2.0') throw new Error('bad v2 header');
        if (!card.data || typeof card.data.name !== 'string') throw new Error('bad v2 data');
        return true;
      }
      if (v === 'v3') {
        if (!card || card.spec !== 'chara_card_v3' || card.spec_version !== '3.0') throw new Error('bad v3 header');
        if (!card.data || typeof card.data.name !== 'string') throw new Error('bad v3 data');
        return true;
      }
      throw new Error('unknown version');
    } catch(e){ throw new Error((message||'Invalid character card')+': '+e.message); }
  }
};
