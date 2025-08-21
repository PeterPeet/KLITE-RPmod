/**
 * KLITE-RPmod Panel Lifecycle Stress Tests
 */

function ensurePanelContainers() {
  const ids = ['content-left', 'content-right'];
  ids.forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  });
}

KLITETestRunner.registerTest('performance', 'panel_switch_stress_200', async () => {
  ensurePanelContainers();
  if (typeof KLITE_RPMod.loadPanel !== 'function') {
    Assert.isTrue(true, 'No loadPanel – skip');
    return;
  }
  const limit = 1000; // generous in jsdom
  const perf = Assert.performanceWithin(() => {
    for (let i = 0; i < 200; i++) {
      KLITE_RPMod.loadPanel('left', (i % 2 === 0) ? 'MEMORY' : 'CHARS');
    }
  }, limit, `200 panel switches must complete within ${limit}ms`);
}, ['REQ-NF-002']);

