/* Funções de apoio: matemática, cores, sorteio com semente, armazenamento. */

/* =========================================================
   UTILIDADES
   ========================================================= */
export const $ = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inCubic: t => t * t * t,
};
/** Interpola de 0→1 em `ms`, chamando fn(t) a cada frame. */
export function tween(ms, fn, e = ease.outCubic) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / ms, 0, 1);
      fn(e(t), t);
      t < 1 ? requestAnimationFrame(step) : resolve();
    };
    requestAnimationFrame(step);
  });
}
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage: tudo bem */ } },
};
export const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');


export const nice = (s) => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

export const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${clamp(s, 0, 1) * 100}% ${clamp(l, 0, 1) * 100}%)`;

export const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

export const pack = ([r, g, b], a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; // ImageData little-endian

export const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export const escapeHtml = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
