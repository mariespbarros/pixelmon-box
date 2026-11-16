/* Configurações do jogador e preferência de movimento. */
import { reducedMQ, store } from './utils.js';

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
export let reduced = reducedMQ.matches;   // animações reduzidas (sistema ou ajuste)
export const settings = Object.assign({
  sfxVol: 0.8, music: false, musicVol: 0.5, motion: 'auto', ballSize: 'M',
  weather: true, scenes: true, daynight: true,
}, store.get('pkb.settings', {}));
export const saveSettings = () => store.set('pkb.settings', settings);
export function applyMotion() { reduced = settings.motion === 'reduce' || (settings.motion === 'auto' && reducedMQ.matches); }
reducedMQ.addEventListener?.('change', applyMotion);
