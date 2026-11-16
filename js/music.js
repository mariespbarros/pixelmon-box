/* Música de fundo 8-bit gerada na hora. */
import { audio, ensureAudio, noise, note } from './audio.js';
import { el } from './dom.js';
import { saveSettings, settings } from './settings.js';
import { mulberry32 } from './utils.js';
import { timeOfDay } from './world.js';

/* =========================================================
   MÚSICA DE FUNDO 8-BIT (melodia original, gerada)
   ========================================================= */
export const music = { timer: null, step: 0, next: 0, mel: null };
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function buildMelody(night) {
  const R = mulberry32(night ? 77 : 42);
  const prog = night ? [57, 53, 48, 55] : [48, 57, 53, 55];       // dia: C–Am–F–G · noite: Am–F–C–G
  const quality = r => (r === 57 ? [0, 3, 7] : [0, 4, 7]);
  const pent = [72, 74, 76, 79, 81, 84];
  const mel = [];
  for (let bar = 0; bar < 8; bar++) {
    const root = prog[bar % 4], chord = quality(root).map(i => (root + i) % 12);
    for (let st = 0; st < 16; st++) {
      if (st % 2 === 1 || R() > (st % 4 === 0 ? 0.75 : 0.35)) { mel.push(null); continue; }
      const cands = pent.filter(n => chord.includes(n % 12));
      const n = (R() < 0.7 && cands.length ? cands : pent)[Math.floor(R() * (R() < 0.7 && cands.length ? cands.length : pent.length))];
      mel.push({ n, len: [2, 2, 3, 4][Math.floor(R() * 4)] });
    }
  }
  return { prog, quality, mel };
}
export function musicTick() {
  const a = audio.ctx; if (!a) return;
  const spb = 60 / 88 / 4;                                       // semicolcheia a 88 bpm
  while (music.next < a.currentTime + 0.25) {
    const s = music.step % 128, bar = Math.floor(s / 16), st = s % 16, t = music.next - a.currentTime;
    const root = music.mel.prog[bar % 4], q = music.mel.quality(root);
    const bus = { bus: audio.music };
    if (st === 0 || st === 8) note(mtof(root - 12), t, spb * 6, { type: 'triangle', vol: 0.16, ...bus });
    if (st === 6 || st === 14) note(mtof(root - 5), t, spb * 2, { type: 'triangle', vol: 0.1, ...bus });
    if (st % 2 === 0) note(mtof(root + 12 + q[(st / 2) % 3]), t, spb * 1.2, { type: 'square', vol: 0.018, ...bus });
    const m = music.mel.mel[s];
    if (m) note(mtof(m.n), t, spb * m.len * 0.95, { type: 'square', vol: 0.03, ...bus });
    if (st === 4 || st === 12) noise(t, 0.03, 0.025, 5000, audio.music);
    music.step++; music.next += spb;
  }
}
export function setMusic(on) {
  settings.music = on; saveSettings();
  el.musicBtn.setAttribute('aria-pressed', String(on));
  el.musicBtn.classList.toggle('on', on);
  el.musicBtn.setAttribute('aria-label', on ? 'Desligar música' : 'Ligar música');
  if (el.setMusic) el.setMusic.checked = on;
  if (on) {
    ensureAudio(); if (!audio.ctx) return;
    music.mel = buildMelody(settings.daynight && timeOfDay() === 'noite');
    music.step = 0; music.next = audio.ctx.currentTime + 0.1;
    clearInterval(music.timer); music.timer = setInterval(musicTick, 60);
  } else { clearInterval(music.timer); music.timer = null; }
}
