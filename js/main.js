/* Ponto de entrada: inicializa tudo. */
import './achievements.js';
import './battle.js';
import './bindings.js';
import './creatures.js';
import './effects.js';
import './pokedex.js';
import './save.js';
import './share.js';
import './sheet.js';
import './state.js';
import './types.js';
import { prefetch } from './api.js';
import { renderMute } from './audio.js';
import { BALLS } from './ball.js';
import { ballUnlocked, buildBallBar, selectBall } from './ballbar.js';
import { el } from './dom.js';
import { applyShift, layout } from './layout.js';
import { frame } from './loop.js';
import { setMusic } from './music.js';
import { updateCounter } from './sequence.js';
import { applyMotion, settings } from './settings.js';
import { showTutorial } from './ui.js';
import { store } from './utils.js';
import { updateHudInfo } from './world.js';

/* =========================================================
   INÍCIO
   ========================================================= */
applyMotion();
renderMute();
updateCounter();
buildBallBar();
{ const b = store.get('pkb.ball', 'padrao'); if (BALLS[b] && ballUnlocked(b)) selectBall(b, true); }
if (store.get('pkb.ballsSeen', null) === null) store.set('pkb.ballsSeen', Object.keys(BALLS).filter(ballUnlocked));
updateHudInfo(); setInterval(updateHudInfo, 30000);
// música: navegadores só tocam após um gesto; liga no primeiro toque se estava ativada
el.musicBtn.setAttribute('aria-pressed', String(settings.music)); el.musicBtn.classList.toggle('on', settings.music);
if (settings.music) addEventListener('pointerdown', () => setMusic(true), { once: true });
layout();
requestAnimationFrame(() => { el.scene.classList.add('ready'); });
requestAnimationFrame(frame);
// pré-carrega o primeiro Pokémon em segundo plano (abertura mais rápida)
setTimeout(prefetch, 400);
document.fonts?.ready.then(applyShift);
if (!store.get('pkb.tut', 0)) setTimeout(showTutorial, 700);
