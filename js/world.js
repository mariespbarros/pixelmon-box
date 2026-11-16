/* Dia/noite, clima, bônus diário e cenários por tipo. */
import { el } from './dom.js';
import { reduced, settings } from './settings.js';
import { clamp, mulberry32, store } from './utils.js';

/* =========================================================
   TEMPO, CLIMA E BÔNUS DIÁRIO
   ========================================================= */
export function timeOfDay(d = new Date()) {
  const h = d.getHours();
  return h >= 19 || h < 5 ? 'noite' : h < 7 ? 'amanhecer' : h < 17 ? 'dia' : 'entardecer';
}
/** Clima muda a cada 12 minutos (igual para todos no mesmo horário). */
export function weatherNow() {
  if (!settings.weather) return 'limpo';
  const r = mulberry32(Math.floor(Date.now() / 720000) * 7 + 1)();
  return r < 0.58 ? 'limpo' : r < 0.78 ? 'chuva' : r < 0.9 ? 'neve' : 'vento';
}
export const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export function dailyStatus() {
  const now = new Date(), today = dayKey(now), yest = dayKey(new Date(now.getTime() - 864e5));
  const last = store.get('pkb.lastDay', null), streak = store.get('pkb.streak', 0);
  const bonus = last !== today;
  const newStreak = bonus ? (last === yest ? streak + 1 : 1) : streak;
  return { bonus, newStreak, min: newStreak >= 7 ? 'epica' : 'rara', streak: (last === today || last === yest) ? streak : 0 };
}
export function markDaily(n) {
  store.set('pkb.lastDay', dayKey(new Date())); store.set('pkb.streak', n);
  updateHudInfo();
}
export const TOD_ICON = { dia: '☀ dia', noite: '☾ noite', amanhecer: '◐ amanhecer', entardecer: '◑ entardecer' };
export const WX_ICON = { limpo: '', chuva: '☂ chuva', neve: '❄ neve', vento: '≋ vento' };
export function updateHudInfo() {
  const bits = [];
  if (settings.daynight) bits.push(TOD_ICON[timeOfDay()]);
  const wx = weatherNow(); if (WX_ICON[wx]) bits.push(WX_ICON[wx]);
  const d = dailyStatus();
  if (d.streak > 0) bits.push(`sequência ${d.streak}d`);
  if (d.bonus) bits.push('<span class="bonus">bônus do dia disponível</span>');
  el.hudInfo.innerHTML = bits.join(' · ');
}


/* =========================================================
   CENÁRIOS POR TIPO + CLIMA + DIA/NOITE (desenhados no fundo)
   ========================================================= */
export const AMBIENT = {
  fire:     { b: 'rise',  c: ['#ff9a2e', '#ffd34d', '#e2451f'], rate: 9, v: [12, 26], life: [2.5, 4.5] },
  water:    { b: 'rise',  c: ['#7fd0ff', '#d8f6ff'], rate: 5, v: [6, 12], life: [4, 6], wob: 4 },
  grass:    { b: 'fall',  c: ['#5cc95a', '#b8f59a', '#2f8a3e'], rate: 4, v: [6, 10], life: [6, 9], wob: 6 },
  ice:      { b: 'fall',  c: ['#ffffff', '#bdf1ff'], rate: 7, v: [5, 9], life: [6, 10], wob: 3 },
  electric: { b: 'spark', c: ['#ffd93b', '#fffbd0'], rate: 6, life: [0.08, 0.2] },
  ghost:    { b: 'rise',  c: ['#b99cff', '#7b5bd6'], rate: 3, v: [3, 6], life: [5, 8], wob: 5, a: 0.5 },
  poison:   { b: 'rise',  c: ['#b05ad6', '#e7b5ff'], rate: 4, v: [5, 9], life: [3, 5], wob: 2 },
  psychic:  { b: 'spark', c: ['#ff5fa8', '#ffe0f0'], rate: 4, life: [0.4, 0.9] },
  fairy:    { b: 'rise',  c: ['#ffd6ee', '#ffffff', '#ff9fcf'], rate: 4, v: [3, 7], life: [4, 7], wob: 4 },
  fighting: { b: 'spark', c: ['#ff8a8a', '#ffd34d'], rate: 3, life: [0.1, 0.25] },
  ground:   { b: 'drift', c: ['#c9a86a', '#8f7a52'], rate: 4, v: [8, 16], life: [4, 7] },
  rock:     { b: 'fall',  c: ['#a9997a', '#6f6450'], rate: 3, v: [10, 18], life: [3, 5] },
  flying:   { b: 'drift', c: ['#ffffff', '#ecebf5'], rate: 4, v: [30, 50], life: [2, 3], streak: true, a: 0.4 },
  bug:      { b: 'fly',   c: ['#d8ff6b', '#fff3a0'], rate: 1.5, life: [5, 9] },
  dragon:   { b: 'rise',  c: ['#8f6bff', '#c27dff', '#ff9a2e'], rate: 6, v: [10, 20], life: [3, 5] },
  dark:     { b: 'rise',  c: ['#5b3f8f', '#3a2f5e'], rate: 4, v: [3, 6], life: [6, 9], wob: 3 },
  steel:    { b: 'spark', c: ['#ffffff', '#c5c9d6'], rate: 3, life: [0.15, 0.35] },
  normal:   { b: 'rise',  c: ['#ffffff'], rate: 2, v: [2, 4], life: [6, 9], wob: 3, a: 0.35 },
};
export const world = { type: null, alpha: 0, target: 0, amb: [], wx: [], last: 0, acc: 0 };
export function setAmbient(t) {
  if (t && settings.scenes) { world.type = t; world.target = 1; } else world.target = 0;
}
export const rr = (a, b) => a + Math.random() * (b - a);
export function stepWorld(dt, w, h) {
  // partículas do tipo
  world.alpha += (world.target - world.alpha) * Math.min(1, dt * 1.5);
  const cfg = world.type && AMBIENT[world.type];
  if (cfg && world.target > 0 && !reduced) {
    world.acc += dt * cfg.rate * Math.max(1, w * h / 60000);
    while (world.acc > 1) {
      world.acc--;
      const p = { x: rr(0, w), y: 0, t: 0, life: rr(...cfg.life), c: cfg.c[(Math.random() * cfg.c.length) | 0], cfg, ph: rr(0, 6) };
      if (cfg.b === 'rise') { p.y = rr(h * 0.55, h + 2); p.vy = -rr(...cfg.v); p.vx = 0; }
      else if (cfg.b === 'fall') { p.y = rr(-4, h * 0.3); p.vy = rr(...cfg.v); p.vx = rr(-2, 4); }
      else if (cfg.b === 'drift') { p.x = rr(-10, 0); p.y = rr(0, h); p.vx = rr(...cfg.v); p.vy = rr(-1, 1); }
      else if (cfg.b === 'fly') { p.y = rr(h * 0.2, h * 0.9); p.vx = rr(-6, 6); p.vy = rr(-4, 4); }
      else { p.y = rr(0, h); p.vx = p.vy = 0; }
      world.amb.push(p);
    }
  }
  for (let i = world.amb.length - 1; i >= 0; i--) {
    const p = world.amb[i]; p.t += dt;
    if (p.t > p.life || p.y < -6 || p.y > h + 6 || p.x > w + 12) { world.amb.splice(i, 1); continue; }
    if (p.cfg.b === 'fly') { p.vx += rr(-20, 20) * dt; p.vy += rr(-20, 20) * dt; p.vx = clamp(p.vx, -8, 8); p.vy = clamp(p.vy, -8, 8); }
    p.x += (p.vx + (p.cfg.wob ? Math.sin(p.t * 2 + p.ph) * p.cfg.wob : 0)) * dt; p.y += p.vy * dt;
  }
  if (!world.type || world.alpha < 0.01 && world.target === 0) { if (world.alpha < 0.01) world.amb.length = 0; }

  // clima
  const wx = reduced ? 'limpo' : weatherNow();
  const want = wx === 'chuva' ? Math.round(w * h / 260) : wx === 'neve' ? Math.round(w * h / 520) : wx === 'vento' ? Math.round(w * h / 1800) : 0;
  while (world.wx.length < want) world.wx.push({ x: rr(0, w), y: rr(-h, h), s: rr(0.6, 1), ph: rr(0, 6) });
  if (world.wx.length > want) world.wx.length = want;
  for (const d of world.wx) {
    if (wx === 'chuva') { d.x -= 18 * dt * d.s; d.y += 110 * dt * d.s; }
    else if (wx === 'neve') { d.y += 9 * dt * d.s; d.x += Math.sin(performance.now() / 900 + d.ph) * 4 * dt; }
    else if (wx === 'vento') { d.x += 90 * dt * d.s; d.y += Math.sin(performance.now() / 500 + d.ph) * 3 * dt; }
    if (d.y > h + 4) { d.y = -4; d.x = rr(0, w + 30); }
    if (d.x < -6) d.x = w + 4; if (d.x > w + 8) { d.x = -8; d.y = rr(0, h); }
  }
  world.wxKind = wx;
}
export function drawWorld(ctx, w, h) {
  const tod = settings.daynight ? timeOfDay() : 'noite';
  // crepúsculo/amanhecer: faixas de cor bem sutis no horizonte
  if (tod === 'entardecer' || tod === 'amanhecer') {
    const cols = tod === 'entardecer' ? ['#ff8a5c', '#c4508a', '#5b3f8f'] : ['#ffd38a', '#ff9fb0', '#6f7fd6'];
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.07 - i * 0.02; ctx.fillStyle = cols[i];
      const y0 = Math.round(h - (i + 1) * h * 0.07);
      for (let y = y0; y < h - i * h * 0.07; y++) for (let x = (y & 1); x < w; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  // lua (noite)
  if (tod === 'noite') {
    const mx = w - Math.max(18, w * 0.08), my = Math.max(14, h * 0.12), r = 6;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      if ((x + 3) ** 2 + (y - 1) ** 2 < (r - 0.5) ** 2) continue;          // recorte da lua crescente
      ctx.fillStyle = (x + y) < -3 ? '#fffbe6' : '#d8d2bd';
      ctx.fillRect(mx + x, my + y, 1, 1);
    }
  }
  // clima
  ctx.fillStyle = world.wxKind === 'chuva' ? 'rgba(150,180,255,.35)' : 'rgba(255,255,255,.55)';
  for (const d of world.wx) {
    const x = Math.round(d.x), y = Math.round(d.y);
    if (world.wxKind === 'chuva') { ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 2, 1, 1); }
    else if (world.wxKind === 'neve') ctx.fillRect(x, y, 1, 1);
    else { ctx.globalAlpha = 0.25; ctx.fillRect(x, y, 5, 1); ctx.globalAlpha = 1; }
  }
  // partículas do cenário
  for (const p of world.amb) {
    const k = 1 - p.t / p.life;
    let a = (p.cfg.a ?? 0.8) * world.alpha * Math.min(1, k * 3) * Math.min(1, p.t * 3);
    if (p.cfg.b === 'fly') a *= 0.5 + 0.5 * Math.sin(p.t * 4 + p.ph);
    if (a <= 0.02) continue;
    ctx.globalAlpha = Math.ceil(a * 4) / 4; ctx.fillStyle = p.c;
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.cfg.b === 'spark') { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    else if (p.cfg.streak) ctx.fillRect(x, y, 4, 1);
    else ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
