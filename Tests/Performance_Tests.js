/**
 * KLITE-RPmod Performance Tests
 * Focused, deterministic checks that run in Node (jsdom) and browser
 */

function envAdaptiveLimit(browserTargetMs, nodeMultiplier = 10) {
  // jsdom is slower; allow more headroom when not in a real browser
  const isBrowser = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && !/jsdom/i.test(window.navigator.userAgent);
  return isBrowser ? browserTargetMs : browserTargetMs * nodeMultiplier;
}

KLITETestRunner.registerTest('performance', 'avatar_styling_200_imgs', async () => {
  // Build synthetic chat with 200 images alternating user/ai globals
  window.human_square = 'data:image/png;base64:user_perf';
  window.niko_square = 'data:image/png;base64:ai_perf';
  const chat = document.getElementById('chat-display') || (() => { const d=document.createElement('div'); d.id='chat-display'; document.body.appendChild(d); return d; })();
  chat.innerHTML = '';
  const parts = [];
  for (let i = 0; i < 200; i++) {
    const src = i % 2 === 0 ? window.human_square : window.niko_square;
    parts.push(`<p><img src="${src}"> Message ${i}</p>`);
  }
  chat.innerHTML = parts.join('');

  const limit = envAdaptiveLimit(50 /* ms in browser */);
  const perf = Assert.performanceWithin(() => {
    KLITE_RPMod.styleLiteAvatarImages();
  }, limit, `Avatar styling must complete within ${limit}ms`);
}, ['REQ-F-055', 'REQ-F-080']);

KLITETestRunner.registerTest('performance', 'character_library_render_500', async () => {
  // Render 500 characters and apply a simple filter
  const container = document.getElementById('char-list') || (() => { const d=document.createElement('div'); d.id='char-list'; document.body.appendChild(d); return d; })();
  const chars = Array.from({ length: 500 }).map((_, i) => ({ id: `c${i}`, name: `Char ${i}`, tags: i % 10 === 0 ? ['helper'] : [] }));
  const limit = envAdaptiveLimit(100 /* ms in browser */);

  const perf = Assert.performanceWithin(() => {
    container.innerHTML = chars.map(c => `<div class='char' data-id='${c.id}'>${c.name}</div>`).join('');
    // simple filter
    const filtered = chars.filter(c => c.name.includes('1'));
    void filtered.length;
  }, limit, `Render+filter must complete within ${limit}ms`);
}, ['REQ-F-034', 'REQ-NF-007']);
