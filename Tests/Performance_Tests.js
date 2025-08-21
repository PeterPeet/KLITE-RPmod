/**
 * KLITE-RPmod Performance Tests
 * Focused, deterministic checks that run in Node (jsdom) and browser
 */

function envAdaptiveLimit(browserTargetMs, nodeMultiplier = 10) {
  // jsdom is slower; allow more headroom when not in a real browser
  const isBrowser = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && !/jsdom/i.test(window.navigator.userAgent);
  return isBrowser ? browserTargetMs : browserTargetMs * nodeMultiplier;
}

KLITETestRunner.registerTest('performance', 'avatar_replacement_200_msgs', async () => {
  // Build synthetic chat with 200 messages alternating user/AI avatar
  const chat = document.getElementById('chat-display') || (() => { const d=document.createElement('div'); d.id='chat-display'; document.body.appendChild(d); return d; })();
  chat.innerHTML = '';

  // Use legacy data-URIs which replaceAvatarsInChat recognizes; it will also pull CSS defaults if present
  const USER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAAXNSR0IB2cksfwAAAAlwSFlzAAACTwAAAk8B95E4kAAAAB5QTFRFFIqj/v//V6u9ksnUFIqjx+PpcbjHFIqjFIqjAAAAcfUgXwAAAAp0Uk5T/////9z//5IQAKod7AcAAACKSURBVHicY5hRwoAE3DsZWhhQgAdDAaoAO4MDqgALA/lAOQmVzyooaIAiYCgoKIYiICgoKIouIIhfBYYZGLYwKBuh8oHcVAUkfqKgaKCgMILPJggGCFMUIQIIewIhAnCXMAlCgQKqEQhDmGECAegCBmiGws1gYFICA2SnIgEHVC4LZlRiRDZ6cgAAfnASgWRzByEAAAAASUVORK5CYII=';
  const AI   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAADxQTFRFS2Si+X5+pmBfHyApLjZSS2SjP057Vzw5EA4Sf1ZT+9Sv1WpqnYx/7qaYw7vUAAAAS2Sj9PPzgnrLS2SjAzrF9gAAABR0Uk5T///////w////////////AKj//yMlHqVpAAAD3klEQVR4nKWXi7KjIAyGFSgxEjhV3/9d90+8onZPd810prWSDwi50fyoTNP7/X79g2D4NJlqo+rvV/Mf8npPM2B6/4+6ihKaB/pGaH4e6IPw00y3+48xhBC3J32Id+NeUzN9UPfer4RoD/eIqbnuwLS7zncLAfqdPvvDmvY9XAE6vuuImEAw8fNT1/kr4Qqw+YhdIocfJl0glxyTvyG8m7MNY1B9diAkmgGUODnH7Km7AF53AGEjUJtWYdUPzn0LyC6AQO0qCUCi1PKXAM5tCwXeAC0ROf36AqA2VACmbQ8yP9DVimeA6lPKkLaW3EPylXAARBXV701OhOVPI6hcAXH1mTyP7e8AMyEc4mQDzP7XrfOfl5D7ndAdfXID6NwMyXACEpEbgPTCLJn1hEGoAep/OKheQiCEEhj1HgBQX1ZxQMPLlyVsABwejkp8EGEQAkxRA4RgIRYhTxme1fkKoBZwAHjLA+b/cgLQ8gZ4gZ+tVtgAnboaa+Lg0IwRhBqAmX0cI0WFqHN3FUAXAOPpzIWhPzZYQgUAu4ljiaKTaKwtZtwAIdv8XkocR9+UYM5/BMTRxzJKsWEu+RPAAsBxKSWWgTHS18cofiwhlCJD4cApUb0CNWKA/5dhwAqKD2UIXAEoFgUMkIJTCCcjzkGE890BQhXA685WQNqD6ujKWDRhhI7EdKUCtKSGxd8ASEr+6sqNApKPeD/iFEpT6nAUcAMgMmBzqwVPgJCd80X3AIlDDcjSzH8PJbD7AGiT020WjfcCN0jI5WwJGk5axP4eikeyvQd4HE5i7I4xEpWANKg0m2p0OUIcQKJnd7uCaABMRebOSOoB1WUVYACzaGSs012NaI5gAC0GcPWD9iLI6/qVdGeXY7R6xu1M0FAhG7s865ctw97Zoz85kuXi5T2EbaZatLileQA+VifrYGrT7ruL+lbZ0orYcXQJpry/tl+26l1s8sOy+BxMqKjr23nf7mhFnktbOgJOGQmnVG0ZVve06VvDUFmEztGIhHAy2YHA+qsCuFNS1T0Edf41AOZ1b7uwH1tYYFA4p3U1owiOOu+AsyxrQ3AIXwrLXtryL4BPpW0rrvMaPgHSx+K6l3cj3Oin1lH6S3nfd+KDa51lAjJhE6ddz7XRu29xUH51O95SgNOahDTB3PPvLc7cZPWYEVlVlp5AkGtJK/63XZoq0jBsvUrPeNDvr/tE1SnD3qxIEVuNfAsY0J9w4Ux2ZKizHPLHFdw127r7HIS2ZpvFTHHbbN+3+2Qm29p9NvXv2v3twkHHCwd9vnA8vvI8vnQ9vvY9v3g+vvo+v3w/u/7/AZoAPJwrbZ1IAAAAAElFTkSuQmCC';
  const parts = [];
  for (let i = 0; i < 200; i++) {
    const src = i % 2 === 0 ? USER : AI;
    parts.push(`<p><img src="${src}"> Message ${i}</p>`);
  }
  chat.innerHTML = parts.join('');

  const limit = envAdaptiveLimit(50 /* ms in browser */);
  const perf = Assert.performanceWithin(() => {
    KLITE_RPMod.replaceAvatarsInChat();
  }, limit, `Avatar replacement must complete within ${limit}ms`);
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

