/* Layout responsivo: escala em pixels inteiros e centralização. */
import { el } from './dom.js';
import { makeStars, markFxDirty } from './effects.js';
import { settings } from './settings.js';
import { state } from './state.js';
import { clamp } from './utils.js';

/* =========================================================
   LAYOUT RESPONSIVO
   ========================================================= */
export function layout() {
  const vw = innerWidth, vh = innerHeight;
  // celular deitado / telas baixas: criatura e bola à esquerda, informações à direita
  const side = vh <= 520 && vw > vh * 1.3;
  document.body.classList.toggle('side', side);
  const sizeK = { P: 0.78, M: 1, G: 1.22 }[settings.ballSize] || 1;
  let S = clamp(Math.floor(Math.min(vw * 0.36, vh * 0.22) * sizeK / 32), 3, 9);
  let SP = clamp(Math.floor(Math.min(vw * 0.8, vh * 0.33) / 96), 2, 4);
  const infoH = vh < 700 ? 168 : 180;
  // encolhe (em passos inteiros, para manter o pixel nítido) até tudo caber na altura
  const need = () => side ? Math.max(85 * SP + 37 * S, infoH) : 85 * SP + 37 * S + infoH + 18;
  const avail = side ? vh - 64 : vh - 96;
  while (need() > avail) { if (SP > 2) SP--; else if (S > 3) S--; else if (SP > 1) SP--; else break; }
  state.S = S; state.SP = SP;
  const root = document.documentElement.style;
  root.setProperty('--s', state.S + 'px');
  root.setProperty('--sp', state.SP + 'px');
  root.setProperty('--info-h', infoH + 'px');
  el.fx.width = vw; el.fx.height = vh; markFxDirty();
  makeStars();
  applyShift();
}
/** Quando fechada, desloca a cena para que a Pokébola fique no centro exato da tela.
    Usa posições de layout (offset*), que não mudam com a transição em andamento. */
export function idleShift() {
  const bx = el.scene.offsetLeft + el.ball.offsetLeft + 16 * state.S;
  const by = el.scene.offsetTop + el.ball.offsetTop + 16 * state.S;   // centro visual da bola
  return { x: innerWidth / 2 - bx, y: innerHeight / 2 - by };
}
export function applyShift() {
  const open = state.mode === 'revealed' || (state.mode === 'busy' && state.lid > 0);
  const sh = open ? { x: 0, y: 0 } : idleShift();
  document.documentElement.style.setProperty('--shift', sh.y + 'px');
  document.documentElement.style.setProperty('--shift-x', sh.x + 'px');
  if (document.body.classList.contains('side')) {
    el.info.style.setProperty('--hint-x', (el.ball.offsetLeft + 16 * state.S - el.info.offsetLeft) + 'px');
    el.info.style.setProperty('--hint-y', (el.ball.offsetTop + 37 * state.S + 10 - el.info.offsetTop) + 'px');
  }
}
export let rz; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
