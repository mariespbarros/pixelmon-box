/* Estado global do jogo (modo atual, contadores, estatísticas). */
import { store } from './utils.js';

/* Estado global do jogo */
export const state = {
  mode: 'idle',          // idle | busy | revealed | error
  S: 6, SP: 3,           // escala da bola / do sprite (px por pixel lógico)
  hover: false,
  waiting: false,        // aguardando a API (pisca devagar)
  glow: 0,               // 0..1 brilho do botão central
  blink: 0,              // 1 = botão branco total
  lid: 0,                // 0..9 abertura da tampa (em pixels lógicos)
  shakeRot: 0, shakeX: 0,
  current: null,         // Pokémon revelado
  next: null,            // Promise do próximo (pré-carregado)
  count: store.get('pkb.count', 0),
  shinies: store.get('pkb.shiny', 0),
  muted: store.get('pkb.muted', false),
  ballId: 'padrao',
  stats: Object.assign({ escapes: 0, evolutions: 0, wins: 0, battles: 0, nicks: 0, shares: 0 }, store.get('pkb.stats', {})),
};
export const saveStats = () => store.set('pkb.stats', state.stats);
