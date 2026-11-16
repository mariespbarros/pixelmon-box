/* Conquistas. */
import { sfx } from './audio.js';
import { ballUnlocked, checkBallUnlocks, uniqueCount } from './ballbar.js';
import { TYPE_KEYS, creatureBase } from './creatures.js';
import { el } from './dom.js';
import { dex } from './pokedex.js';
import { saveStats, state } from './state.js';
import { toast } from './ui.js';
import { store } from './utils.js';
import { dailyStatus } from './world.js';

/* =========================================================
   CONQUISTAS
   ========================================================= */
export const ACH = [
  { id: 'first',  ic: '★', name: 'Primeiro registro',       desc: 'Registre sua primeira criatura',              goal: 1,   v: c => c.unique },
  { id: 'c10',    ic: '◆', name: 'Colecionador',            desc: 'Registre 10 criaturas diferentes',            goal: 10,  v: c => c.unique },
  { id: 'c50',    ic: '◆', name: 'Pesquisador',             desc: 'Registre 50 criaturas diferentes',            goal: 50,  v: c => c.unique },
  { id: 'c150',   ic: '◆', name: 'Especialista',            desc: 'Registre 150 criaturas diferentes',           goal: 150, v: c => c.unique },
  { id: 'c500',   ic: '♛', name: 'Mestre da Pokédex',       desc: 'Registre 500 criaturas diferentes',           goal: 500, v: c => c.unique },
  { id: 'rare',   ic: '★', name: 'Olho treinado',           desc: 'Encontre uma criatura rara',                  goal: 1,   v: c => c.rara },
  { id: 'epic',   ic: '✷', name: 'Épico!',                  desc: 'Encontre uma criatura épica',                 goal: 1,   v: c => c.epica },
  { id: 'leg1',   ic: '♛', name: 'Lenda viva',              desc: 'Encontre uma lendária',                       goal: 1,   v: c => c.lendaria },
  { id: 'leg5',   ic: '♛', name: 'Caçador de lendas',       desc: 'Encontre 5 lendárias diferentes',             goal: 5,   v: c => c.lendaria },
  { id: 'shiny1', ic: '✦', name: 'Brilho raro',             desc: 'Encontre uma criatura shiny',                 goal: 1,   v: c => c.shiny },
  { id: 'shiny10',ic: '✦', name: 'Colecionador de brilhos', desc: 'Encontre 10 shiny',                           goal: 10,  v: c => c.shiny },
  { id: 'types',  ic: '◎', name: 'Arco-íris de tipos',      desc: 'Encontre todos os 18 tipos',                  goal: 18,  v: c => c.types },
  { id: 'evo1',   ic: '↑', name: 'Metamorfose',             desc: 'Veja uma evolução',                           goal: 1,   v: c => c.evolutions },
  { id: 'evo10',  ic: '↑', name: 'Laboratório evolutivo',   desc: 'Veja 10 evoluções',                           goal: 10,  v: c => c.evolutions },
  { id: 'streak3',ic: '☀', name: 'Hábito',                  desc: 'Abra a Pokébola 3 dias seguidos',             goal: 3,   v: c => c.streak },
  { id: 'streak7',ic: '☀', name: 'Fiel',                    desc: 'Abra a Pokébola 7 dias seguidos',             goal: 7,   v: c => c.streak },
  { id: 'escape', ic: '≋', name: 'Essa fugiu!',             desc: 'Deixe uma criatura escapar',                  goal: 1,   v: c => c.escapes },
  { id: 'aurora', ic: '◉', name: 'Luz da aurora',           desc: 'Desbloqueie a Bola Aurora',                   goal: 1,   v: () => +ballUnlocked('aurora') },
  { id: 'lunar',  ic: '☾', name: 'Sob a lua',               desc: 'Desbloqueie a Bola Lunar',                    goal: 1,   v: () => +ballUnlocked('lunar') },
  { id: 'golden', ic: '◉', name: 'Toque de ouro',           desc: 'Desbloqueie a Bola Dourada',                  goal: 1,   v: () => +ballUnlocked('dourada') },
  { id: 'win1',   ic: '⚔', name: 'Primeira vitória',        desc: 'Vença uma batalha',                           goal: 1,   v: c => c.wins },
  { id: 'win10',  ic: '⚔', name: 'Campeão',                 desc: 'Vença 10 batalhas',                           goal: 10,  v: c => c.wins },
  { id: 'nick',   ic: '♥', name: 'Batizado',                desc: 'Dê um apelido a uma criatura',                goal: 1,   v: c => c.nicks },
  { id: 'share',  ic: '▣', name: 'Exibido',                 desc: 'Gere um cartão para compartilhar',            goal: 1,   v: c => c.shares },
  { id: 'night',  ic: '☾', name: 'Coruja',                  desc: 'Encontre uma criatura de madrugada (0h–5h)', goal: 1,   v: c => c.owl },
];
export const achDone = store.get('pkb.ach', {});
export function achContext() {
  const c = { unique: uniqueCount(), rara: 0, epica: 0, lendaria: 0, shiny: state.shinies, evolutions: state.stats.evolutions,
    streak: dailyStatus().streak, escapes: state.stats.escapes, wins: state.stats.wins, nicks: state.stats.nicks,
    shares: state.stats.shares, owl: state.stats.owl || 0 };
  const types = new Set();
  for (const id of Object.keys(dex.o)) { const b = creatureBase(+id); c[b.rarity] = (c[b.rarity] || 0) + 1; b.types.forEach(t => types.add(t)); }
  for (const e of Object.values(dex.p)) { if (e.r) c[e.r] = (c[e.r] || 0) + 1; (e.t || []).forEach(t => types.add(t)); }
  c.types = [...types].filter(t => TYPE_KEYS.includes(t)).length;
  return c;
}
export function checkAchievements() {
  if (new Date().getHours() < 5 && state.current) { state.stats.owl = 1; saveStats(); }
  const c = achContext();
  let delay = 0;
  for (const a of ACH) {
    if (achDone[a.id] || a.v(c) < a.goal) continue;
    achDone[a.id] = Date.now();
    setTimeout(() => { toast(`Conquista: ${a.ic} ${a.name}`, 'ach'); sfx.achieve(); }, delay += 450);
  }
  store.set('pkb.ach', achDone);
  checkBallUnlocks();
}
export function renderAchievements() {
  const c = achContext();
  const frag = document.createDocumentFragment();
  const done = ACH.filter(a => achDone[a.id]).length;
  el.dexBarFill.style.width = (done / ACH.length * 100) + '%';
  for (const a of ACH) {
    const ok = !!achDone[a.id], v = Math.min(a.v(c), a.goal);
    const d = document.createElement('div');
    d.className = 'ach' + (ok ? ' ok' : '');
    d.innerHTML = `<span class="ach-ic" aria-hidden="true">${a.ic}</span>
      <div><b>${a.name}</b><p>${a.desc}</p>
      ${ok ? `<small>conquistada em ${new Date(achDone[a.id]).toLocaleDateString('pt-BR')}</small>`
           : `<i class="ach-bar"><u style="width:${v / a.goal * 100}%"></u></i><small>${v}/${a.goal}</small>`}</div>`;
    frag.appendChild(d);
  }
  return { frag, done };
}
