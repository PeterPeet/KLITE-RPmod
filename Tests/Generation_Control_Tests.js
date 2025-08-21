/**
 * KLITE-RPmod Generation Control Tests
 */

KLITETestRunner.registerTest('functional', 'generation_presets_apply', async () => {
  const lc = window.localsettings;
  const gc = KLITE_RPMod.generationControl;

  const original = { ...lc };
  try {
    gc.applyPreset('precise');
    Assert.equal(lc.temperature, gc.presets.precise.temperature, 'Preset precise: temperature');
    Assert.equal(lc.top_p, gc.presets.precise.top_p, 'Preset precise: top_p');
    Assert.equal(lc.top_k, gc.presets.precise.top_k, 'Preset precise: top_k');
    Assert.equal(lc.min_p, gc.presets.precise.min_p, 'Preset precise: min_p');
    Assert.equal(lc.rep_pen, gc.presets.precise.rep_pen, 'Preset precise: rep_pen');
    Assert.equal(lc.rep_pen_range, gc.presets.precise.rep_pen_range, 'Preset precise: rep_pen_range');
    Assert.equal(lc.rep_pen_slope, gc.presets.precise.rep_pen_slope, 'Preset precise: rep_pen_slope');
  } finally {
    Object.assign(lc, original);
  }
}, ['REQ-F-043', 'REQ-F-044']);

KLITETestRunner.registerTest('functional', 'generation_slider_conversions', async () => {
  const gc = KLITE_RPMod.generationControl;
  // Creativity: slider=100 -> temp≈2.0, top_p≈0.99
  const temp = gc.sliderToParam.creativity.temperature(100);
  const topp = gc.sliderToParam.creativity.top_p(100);
  Assert.greaterThan(temp, 1.9, 'Creativity temp high end');
  Assert.greaterThan(topp, 0.98, 'Creativity top_p high end');

  // Focus: slider=0 -> top_k≈10, min_p≈0.01
  const topk0 = gc.sliderToParam.focus.top_k(0);
  const minp0 = gc.sliderToParam.focus.min_p(0);
  Assert.equal(topk0, 10, 'Focus top_k low end');
  Assert.lessThan(minp0, 0.02, 'Focus min_p low end');

  // Repetition: slider=50 -> rep_pen≈1.25
  const rep50 = gc.sliderToParam.repetition.rep_pen(50);
  Assert.greaterThan(rep50, 1.2, 'Repetition mid rep_pen');
}, ['REQ-F-045']);

KLITETestRunner.registerTest('integration', 'generation_saveToLite', async () => {
  const gc = KLITE_RPMod.generationControl;
  const lc = window.localsettings;
  const original = { ...lc };
  const origUpdate = LiteAPI.updateSettings;
  try {
    // Mock updateSettings to merge
    LiteAPI.updateSettings = (s) => { Object.assign(window.localsettings, s); return true; };
    gc.saveToLite({ temperature: 0.88, top_p: 0.91 });
    Assert.equal(window.localsettings.temperature, 0.88, 'saveToLite: temperature');
    Assert.equal(window.localsettings.top_p, 0.91, 'saveToLite: top_p');
  } finally {
    Object.assign(window.localsettings, original);
    LiteAPI.updateSettings = origUpdate;
  }
}, ['REQ-F-041']);

KLITETestRunner.registerTest('functional', 'generation_syncAllSliders_updates_dom', async () => {
  const panels = ['story','adv','rp','chat'];
  const host = document.createElement('div');
  document.body.appendChild(host);
  try {
    // Create slider elements and value displays
    panels.forEach(p => {
      const cs = document.createElement('input'); cs.id = `${p}-creativity-slider`; cs.type = 'range'; host.appendChild(cs);
      const cv1 = document.createElement('span'); cv1.id = `${p}-temp-val`; host.appendChild(cv1);
      const cv2 = document.createElement('span'); cv2.id = `${p}-topp-val`; host.appendChild(cv2);

      const fs = document.createElement('input'); fs.id = `${p}-focus-slider`; fs.type = 'range'; host.appendChild(fs);
      const fv1 = document.createElement('span'); fv1.id = `${p}-topk-val`; host.appendChild(fv1);
      const fv2 = document.createElement('span'); fv2.id = `${p}-minp-val`; host.appendChild(fv2);

      const rs = document.createElement('input'); rs.id = `${p}-repetition-slider`; rs.type = 'range'; host.appendChild(rs);
      const rv1 = document.createElement('span'); rv1.id = (p==='rp'? `${p}-rep-val` : `${p}-repen-val`); host.appendChild(rv1);
      const rv2 = document.createElement('span'); rv2.id = `${p}-rng-val`; host.appendChild(rv2);
      const rv3 = document.createElement('span'); rv3.id = `${p}-slp-val`; host.appendChild(rv3);
    });

    // Seed localsettings and sync
    window.localsettings.temperature = 1.0;
    window.localsettings.top_p = 0.9;
    window.localsettings.top_k = 55;
    window.localsettings.min_p = 0.05;
    window.localsettings.rep_pen = 1.2;

    KLITE_RPMod.syncAllSliders();

    // Spot check values reflected in DOM
    const storyCreat = document.getElementById('story-creativity-slider');
    Assert.isNotNull(storyCreat, 'Creativity slider present');
    Assert.greaterThanOrEqual(parseInt(storyCreat.value||'0'), 33, 'Creativity slider set');
  } finally {
    host.remove();
  }
}, ['REQ-F-040']);

KLITETestRunner.registerTest('integration', 'loadState_handles_corrupted_json', async () => {
  const origLoad = KLITE_RPMod.loadFromLiteStorage;
  const origState = JSON.parse(JSON.stringify(KLITE_RPMod.state));
  try {
    // Return corrupted JSON for state
    KLITE_RPMod.loadFromLiteStorage = async (key) => key==='rpmod_state' ? '{invalid json' : null;
    await KLITE_RPMod.loadState();
    Assert.isTrue(true, 'loadState must not throw on corrupted JSON');
  } finally {
    KLITE_RPMod.loadFromLiteStorage = origLoad;
    KLITE_RPMod.state = origState;
  }
}, ['REQ-NF-034']);
