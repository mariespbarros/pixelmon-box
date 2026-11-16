/* Loop principal de animação (requestAnimationFrame). */
import { ballArt, renderBall, renderShadow } from './ball.js';
import { el } from './dom.js';
import { drawParts, drawStars, sparkleAround } from './effects.js';
import { reduced } from './settings.js';
import { state } from './state.js';

/* =========================================================
   LOOP PRINCIPAL (60 fps)
   ========================================================= */
export let lastKey = '', lastShadow = -1, lastTransform = '', lastGlowCss = -1, lastT = performance.now(), lastSparkle = 0;

export function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const calm = state.mode !== 'busy';

  // "respiração": sobe e desce 0–2 px lógicos
  const lift = (!reduced && calm && state.lid === 0) ? Math.round(Math.sin(now / 650) + 1) : 0;

  // balanço no hover
  let rot = state.shakeRot;
  const canHover = (state.mode === 'idle' || state.mode === 'error');
  if (canHover && state.hover && !reduced) rot += Math.round(Math.sin(now / 170) * 3);

  // brilho do botão
  let target = canHover && state.hover ? 1 : 0;
  if (state.waiting) target = Math.sin(now / 210) > 0 ? 1 : 0.2;
  state.glow += (target - state.glow) * Math.min(1, dt * 12);
  const lv = Math.round(state.glow * 3);

  const tf = `translate3d(${state.shakeX * state.S}px, ${-lift * state.S}px, 0) rotate(${rot}deg)`;
  if (tf !== lastTransform) { el.body.style.transform = tf; lastTransform = tf; }

  const key = `${state.ballId}|${state.lid}|${state.blink ? 'b' : lv}`;
  if (key !== lastKey) { renderBall(state.lid, state.blink ? ballArt.pal.blink : ballArt.pal[lv]); lastKey = key; }
  if (lv !== lastGlowCss) {
    el.canvas.style.filter = lv ? `drop-shadow(0 0 ${state.S * 2}px rgba(255,236,190,${0.08 * lv}))` : '';
    lastGlowCss = lv;
  }
  if (lift !== lastShadow) { renderShadow(lift); lastShadow = lift; }

  // brilhos contínuos de shiny
  if (state.mode === 'revealed' && state.current?.shiny && now - lastSparkle > 280) {
    lastSparkle = now; sparkleAround(el.box.getBoundingClientRect());
  }
  if (state.mode === 'revealed' && state.current?.rarity === 'lendaria' && !state.current?.shiny && now - lastSparkle > 520) {
    lastSparkle = now; sparkleAround(el.box.getBoundingClientRect());
  }
  // piscada da criatura viva
  if (state.mode === 'revealed' && state.current?.blink && !reduced) {
    if (!state.blinking && now > state.nextBlink) { state.blinking = true; state.blinkEnd = now + 120; el.blinkImg.classList.add('on'); }
    else if (state.blinking && now > state.blinkEnd) {
      state.blinking = false; el.blinkImg.classList.remove('on');
      state.nextBlink = now + (Math.random() < 0.25 ? 160 : 1800 + Math.random() * 2600);   // às vezes pisca duas vezes
    }
  }

  drawStars(now);
  drawParts(dt);
  requestAnimationFrame(frame);
}
