/* Partículas e céu estrelado. */
import { el } from './dom.js';
import { reduced, settings } from './settings.js';
import { state } from './state.js';
import { TYPES } from './types.js';
import { drawWorld, stepWorld, timeOfDay, world } from './world.js';

/* =========================================================
   PARTÍCULAS & ESTRELAS
   ========================================================= */
export const fxc = el.fx.getContext('2d');
export const parts = [];
export let fxDirty = false;
export function markFxDirty() { fxDirty = true; }
export const COLORS = ['#ffffff', '#fff1b0', '#ffd34d', '#a8ecff', '#ff8f7e'];
export const GOLD = ['#ffffff', '#fff3c4', '#ffd34d', '#ffb92e', '#ffe98a'];

export const PURPLE = ['#ffffff', '#f0dcff', '#c27dff', '#9a5bff', '#ffd6f5'];
export const RAINBOW = ['#ffffff', '#ff6b6b', '#ffd34d', '#7dffb0', '#6fb7ff', '#c27dff'];
export const SMOKE = ['#e6e3ef', '#b9b6cc', '#8a86a3', '#5c5873'];
export function burst(x, y, shiny, kind = '') {
  if (reduced) return;
  if (kind === 'smoke') {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
      parts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 40,
        life: 0, max: 0.6 + Math.random() * 0.6, star: false, big: true, color: SMOKE[(Math.random() * 4) | 0], g: -50, size: 2 + (Math.random() * 2 | 0) });
    }
    return;
  }
  const typeCol = kind.startsWith('type:') && TYPES[kind.slice(5)] ? TYPES[kind.slice(5)][1] : null;
  const pal = typeCol ? ['#ffffff', typeCol, typeCol] : kind === 'lendaria' ? RAINBOW : shiny ? GOLD : kind === 'epica' ? PURPLE : COLORS;
  const n = typeCol ? 22 : kind === 'lendaria' ? 110 : shiny ? 64 : kind === 'epica' ? 56 : 40;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;
    const sp = 140 + Math.random() * 320;
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: 0.6 + Math.random() * 0.8,
      star: Math.random() < 0.45, big: Math.random() < 0.25,
      color: pal[(Math.random() * pal.length) | 0], g: 300,
    });
  }
}
export function sparkleAround(rect) {   // brilhos dourados contínuos (shiny)
  if (reduced) return;
  parts.push({
    x: rect.left + rect.width * (0.2 + Math.random() * 0.6),
    y: rect.top + rect.height * (0.2 + Math.random() * 0.6),
    vx: (Math.random() - 0.5) * 12, vy: -18 - Math.random() * 20,
    life: 0, max: 0.9 + Math.random() * 0.5, star: true, big: Math.random() < 0.4,
    color: GOLD[(Math.random() * GOLD.length) | 0], g: 0,
  });
}
export function drawParts(dt) {
  if (!parts.length && !fxDirty) return;
  fxc.clearRect(0, 0, el.fx.width, el.fx.height);
  fxDirty = parts.length > 0;
  const u = Math.max(2, Math.round(state.S / 2)), drag = Math.pow(0.12, dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const k = 1 - p.life / p.max;
    fxc.globalAlpha = Math.ceil(k * 4) / 4;                 // opacidade em degraus (retrô)
    fxc.fillStyle = p.color;
    const x = Math.round(p.x / u) * u, y = Math.round(p.y / u) * u;
    if (p.size) fxc.fillRect(x, y, u * p.size, u * p.size);
    else if (p.star) {
      const arm = p.big && k > 0.4 ? 2 : 1;
      fxc.fillRect(x, y - arm * u, u, (arm * 2 + 1) * u);
      fxc.fillRect(x - arm * u, y, (arm * 2 + 1) * u, u);
    } else fxc.fillRect(x, y, u, u);
  }
  fxc.globalAlpha = 1;
}

/* Fundo estrelado bem sutil (canvas em baixa resolução, ampliado) */
export const stc = el.stars.getContext('2d');
export let stars = [], lastStars = 0;
export const SU = 3;
export function makeStars() {
  const w = Math.ceil(innerWidth / SU), h = Math.ceil(innerHeight / SU);
  el.stars.width = w; el.stars.height = h;
  const n = Math.max(24, Math.round(w * h / 1500));
  stars = Array.from({ length: n }, () => ({
    x: (Math.random() * w) | 0, y: (Math.random() * h) | 0,
    b: 0.12 + Math.random() * 0.38, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.4,
    cross: Math.random() < 0.06, blue: Math.random() < 0.25,
  }));
  drawStars(performance.now(), true);
}
export function drawStars(now, force) {
  const busy = world.amb.length || world.wx.length || world.target > 0;
  if (!force && (now - lastStars < (busy ? 33 : 66))) return;   // 15–30 fps bastam para o fundo
  if (!force && reduced && !busy && now - lastStars < 1000) return;
  const dt = Math.min(0.1, (now - lastStars) / 1000);
  lastStars = now;
  const t = now / 1000;
  const W = el.stars.width, H = el.stars.height;
  stepWorld(dt, W, H);
  const tod = settings.daynight ? timeOfDay() : 'noite';
  const sk = { dia: 0.45, amanhecer: 0.7, entardecer: 0.75, noite: 1.15 }[tod];
  stc.fillStyle = '#000'; stc.fillRect(0, 0, W, H);
  for (const s of stars) {
    const a = Math.min(0.9, sk * (reduced ? s.b : s.b * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)))));
    stc.fillStyle = s.blue ? `rgba(170,190,255,${a})` : `rgba(255,255,255,${a})`;
    stc.fillRect(s.x, s.y, 1, 1);
    if (s.cross) {
      stc.fillStyle = `rgba(255,255,255,${a * 0.4})`;
      stc.fillRect(s.x - 1, s.y, 1, 1); stc.fillRect(s.x + 1, s.y, 1, 1);
      stc.fillRect(s.x, s.y - 1, 1, 1); stc.fillRect(s.x, s.y + 1, 1, 1);
    }
  }
  drawWorld(stc, W, H);
}
