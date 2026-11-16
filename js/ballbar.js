/* Seletor de bolas especiais. */
import { ensureAudio, sfx } from './audio.js';
import { BALLS, BALL_ART, ballArt } from './ball.js';
import { el } from './dom.js';
import { dex } from './pokedex.js';
import { state } from './state.js';
import { toast } from './ui.js';
import { store } from './utils.js';

/* =========================================================
   SELETOR DE BOLAS
   ========================================================= */
export const uniqueCount = () => Object.keys(dex.o).length + Object.keys(dex.p).length;
export function ballUnlocked(id) {
  const n = BALLS[id].need;
  if (!n) return true;
  return n.kind === 'opens' ? state.count >= n.n : uniqueCount() >= n.n;
}
export function ballIcon(id, size = 32) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), im = x.createImageData(32, 32), b = new Uint32Array(im.data.buffer);
  const { map, pal } = BALL_ART[id];
  for (let i = 0; i < 1024; i++) b[i] = pal[0][map[i]];
  x.putImageData(im, 0, 0);
  c.style.width = c.style.height = size + 'px';
  return c;
}
export function buildBallBar() {
  el.ballBar.innerHTML = '';
  for (const id of Object.keys(BALLS)) {
    const b = BALLS[id], btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bb'; btn.dataset.ball = id;
    btn.appendChild(ballIcon(id, 32));
    btn.addEventListener('click', () => selectBall(id));
    el.ballBar.appendChild(btn);
  }
  ballBarState();
}
export function ballBarState() {
  const canSwitch = state.mode === 'idle' || state.mode === 'error';
  el.ballBar.parentElement.classList.toggle('away', !canSwitch);
  for (const btn of el.ballBar.querySelectorAll('.bb')) {
    const id = btn.dataset.ball, b = BALLS[id], ok = ballUnlocked(id);
    btn.classList.toggle('locked', !ok);
    btn.setAttribute('aria-pressed', String(state.ballId === id));
    btn.disabled = !canSwitch;
    const label = ok ? `${b.name}: ${b.desc}` : `${b.name} (bloqueada: ${b.need.text})`;
    btn.setAttribute('aria-label', label); btn.title = label;
  }
  el.ballName.textContent = BALLS[state.ballId].name;
}
export function selectBall(id, silent = false) {
  if (!ballUnlocked(id)) { if (!silent) { toast(`${BALLS[id].name}: ${BALLS[id].need.text} para desbloquear`); sfx.error(); } return; }
  if (!silent && !(state.mode === 'idle' || state.mode === 'error')) return;
  state.ballId = id; store.set('pkb.ball', id);
  ballArt.map = BALL_ART[id].map; ballArt.pal = BALL_ART[id].pal;
  ballBarState();
  if (!silent) { ensureAudio(); sfx.blink(); toast(`${BALLS[id].name} · ${BALLS[id].desc}`); }
}
export function checkBallUnlocks() {
  const seen = store.get('pkb.ballsSeen', ['padrao']);
  for (const id of Object.keys(BALLS)) if (!seen.includes(id) && ballUnlocked(id)) {
    seen.push(id); toast(`Nova bola desbloqueada: ${BALLS[id].name}!`, 'gold');
  }
  store.set('pkb.ballsSeen', seen);
  ballBarState();
}
