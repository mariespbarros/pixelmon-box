/* Efeitos sonoros 8-bit (Web Audio API) e gritos das criaturas. */
import { el } from './dom.js';
import { settings } from './settings.js';
import { state } from './state.js';
import { mulberry32, store } from './utils.js';

/* =========================================================
   SOM 8-BIT (Web Audio API)
   ========================================================= */
export const audio = { ctx: null, master: null };
export function ensureAudio() {
  try {
    if (!audio.ctx) {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = state.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.sfx = audio.ctx.createGain(); audio.sfx.gain.value = settings.sfxVol; audio.sfx.connect(audio.master);
      audio.music = audio.ctx.createGain(); audio.music.gain.value = settings.musicVol * 0.9; audio.music.connect(audio.master);
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
  } catch { /* sem áudio: segue em silêncio */ }
}
export function note(freq, at = 0, dur = 0.1, { type = 'square', vol = 0.1, slide, bus } = {}) {
  const a = audio.ctx; if (!a || state.muted) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || audio.sfx); o.start(t); o.stop(t + dur + 0.02);
}
export function noise(at = 0, dur = 0.08, vol = 0.08, hp = 1200, bus) {
  const a = audio.ctx; if (!a || state.muted) return;
  const t = a.currentTime + at, len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
  s.connect(f).connect(g).connect(bus || audio.sfx); s.start(t);
}
export const sfx = {
  shake()  { note(150, 0, 0.07, { vol: 0.09, slide: 90 }); noise(0, 0.035, 0.04, 2500); },
  blink()  { note(1760, 0, 0.04, { vol: 0.04 }); },
  open()   { noise(0, 0.14, 0.10, 900); [523, 784, 1047, 1568].forEach((f, i) => note(f, i * 0.045, 0.09, { vol: 0.07 })); },
  reveal() { [659, 784, 988, 1319].forEach((f, i) => { note(f, 0.05 + i * 0.09, 0.16, { type: 'triangle', vol: 0.16 }); note(f / 2, 0.05 + i * 0.09, 0.12, { vol: 0.03 }); }); },
  shiny()  { [2093, 2637, 3136, 4186, 3136, 4186, 5274].forEach((f, i) => note(f, 0.42 + i * 0.055, 0.1, { vol: 0.035 })); },
  close()  { [988, 784, 523].forEach((f, i) => note(f, i * 0.06, 0.1, { vol: 0.06, slide: f * 0.8 })); },
  error()  { note(330, 0, 0.16, { vol: 0.07 }); note(247, 0.14, 0.24, { vol: 0.07 }); },
  escape() { noise(0, 0.25, 0.08, 600); [784, 659, 523, 392].forEach((f, i) => note(f, 0.05 + i * 0.06, 0.08, { vol: 0.05, slide: f * 0.7 })); },
  evolve() { for (let i = 0; i < 14; i++) note(330 * Math.pow(2, i / 12), i * 0.13, 0.12, { type: i % 2 ? 'square' : 'triangle', vol: i % 2 ? 0.03 : 0.1 }); },
  achieve(){ [1047, 1319, 1568, 2093].forEach((f, i) => note(f, i * 0.07, 0.12, { type: 'triangle', vol: 0.12 })); },
  hit()    { noise(0, 0.08, 0.12, 400); note(140, 0, 0.1, { vol: 0.08, slide: 60 }); },
  superHit(){ noise(0, 0.12, 0.14, 300); note(220, 0, 0.14, { vol: 0.08, slide: 70 }); note(880, 0.02, 0.08, { vol: 0.04, slide: 440 }); },
  miss()   { noise(0, 0.15, 0.05, 2500); },
  guard()  { note(523, 0, 0.12, { type: 'triangle', vol: 0.1, slide: 784 }); },
  faint()  { note(392, 0, 0.5, { vol: 0.06, slide: 98 }); },
  win()    { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => note(f, i * 0.11, i === 5 ? 0.4 : 0.12, { type: 'triangle', vol: 0.13 })); },
  lose()   { [392, 349, 330, 262].forEach((f, i) => note(f, i * 0.16, 0.18, { type: 'triangle', vol: 0.1 })); },
  charge() { note(196, 0, 0.9, { vol: 0.05, slide: 880 }); note(98, 0, 0.9, { type: 'triangle', vol: 0.08, slide: 440 }); },
  epic()   { [1319, 1568, 2093].forEach((f, i) => note(f, 0.35 + i * 0.07, 0.14, { type: 'triangle', vol: 0.09 })); },
  legend() {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) =>
      note(f, 0.1 + i * 0.1, i === 7 ? 0.5 : 0.14, { type: i % 2 ? 'square' : 'triangle', vol: i % 2 ? 0.04 : 0.13 }));
    [262, 330, 392].forEach(f => note(f, 0.9, 0.6, { type: 'triangle', vol: 0.06 }));
  },
};

/* Botão de mudo (ícone pixel em SVG) */
export function renderMute() {
  const px = (x, y, w = 1, h = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const speaker = px(1, 3, 2, 4) + px(3, 2, 1, 6) + px(4, 1, 1, 8);
  const extra = state.muted
    ? px(7, 3) + px(9, 3) + px(8, 4) + px(7, 5) + px(9, 5)
    : px(6, 4, 1, 2) + px(8, 2, 1, 6) + px(10, 1, 1, 8);
  el.mute.innerHTML = `<svg viewBox="0 0 12 10" fill="currentColor" aria-hidden="true">${speaker}${extra}</svg>`;
  el.mute.setAttribute('aria-pressed', String(state.muted));
  el.mute.setAttribute('aria-label', state.muted ? 'Ativar sons' : 'Silenciar sons');
  el.mute.title = state.muted ? 'som: desligado' : 'som: ligado';
}
el.mute.addEventListener('click', () => {
  state.muted = !state.muted; store.set('pkb.muted', state.muted);
  ensureAudio();
  if (audio.master) audio.master.gain.value = state.muted ? 0 : 0.5;
  renderMute();
  if (!state.muted) sfx.blink();
});


/* =========================================================
   GRITOS 8-BIT (únicos para cada número)
   ========================================================= */
export function cry(m) {
  if (!audio.ctx || state.muted) return;
  const R = mulberry32((m.original ? m.id : m.id + 5000) * 733 + (m.evolved ? 7 : 0));
  const deep = (m.evolved ? 0.75 : 1) * (m.rarity === 'lendaria' ? 0.7 : 1);
  const base = (190 + R() * 520) * deep;
  const type = ['square', 'sawtooth', 'triangle'][Math.floor(R() * 3)];
  const n = 3 + Math.floor(R() * 3);
  let t = 0;
  for (let i = 0; i < n; i++) {
    const d = 0.05 + R() * 0.11 * (m.rarity === 'lendaria' ? 1.6 : 1);
    const f0 = base * (0.75 + R() * 0.9), f1 = f0 * (0.55 + R() * 0.9);
    note(f0, t, d, { type, vol: type === 'triangle' ? 0.14 : 0.06, slide: f1 });
    if (R() < 0.3) noise(t, d * 0.6, 0.03, 1800);
    t += d * (0.75 + R() * 0.4);
  }
}
