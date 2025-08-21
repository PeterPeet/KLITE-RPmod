/**
 * KLITE-RPmod Mobile Navigation Tests
 */

function ensureMobileDom() {
  const ids = ['panel-left','panel-right','content-left','content-right','maincontent','klite-container'];
  ids.forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  });
}

KLITETestRunner.registerTest('functional', 'mobile_navigation_boundaries', async () => {
  ensureMobileDom();
  const s = KLITE_RPMod.state;
  s.mobile.enabled = true;
  s.mobile.currentIndex = 0;
  const len = s.mobile.sequence.length;

  // Left boundary: should not go negative
  KLITE_RPMod.navigateMobilePanel?.(-1);
  Assert.equal(s.mobile.currentIndex, 0, 'Left boundary must clamp at 0');

  // Move to last
  s.mobile.currentIndex = len - 1;
  KLITE_RPMod.navigateMobilePanel?.(1);
  Assert.equal(s.mobile.currentIndex, len - 1, 'Right boundary must clamp at last index');
}, ['REQ-UI-013']);

KLITETestRunner.registerTest('performance', 'mobile_full_sequence_nav', async () => {
  ensureMobileDom();
  const s = KLITE_RPMod.state;
  s.mobile.enabled = true;
  s.mobile.currentIndex = 0;
  const len = s.mobile.sequence.length;

  const limit = 1000; // jsdom headroom
  const perf = Assert.performanceWithin(() => {
    for (let i = 1; i < len; i++) {
      KLITE_RPMod.navigateMobilePanel?.(1);
    }
  }, limit, `Mobile sequence navigation must complete within ${limit}ms`);
}, ['REQ-UI-013','REQ-NF-002']);

