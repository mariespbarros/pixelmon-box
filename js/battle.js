/* Batalha por turnos com vantagem de tipos. */
import { checkAchievements } from './achievements.js';
import { cry, ensureAudio, sfx } from './audio.js';
import { RARITY_ORDER, creatureBase, drawCreature, evoName, pickCreatureId } from './creatures.js';
import { el } from './dom.js';
import { burst } from './effects.js';
import { creatureThumb, dex, dexRegister } from './pokedex.js';
import { typeChips, updateCounter } from './sequence.js';
import { reduced } from './settings.js';
import { creatureSheet } from './sheet.js';
import { saveStats, state } from './state.js';
import { TYPES } from './types.js';
import { openModal } from './ui.js';
import { clamp, sleep } from './utils.js';
import { rr } from './world.js';

/* =========================================================
   BATALHA RÁPIDA
   ========================================================= */
export const CHART = {   // super efetivo (×2), pouco efetivo (×½), sem efeito (×0)
  normal:   ['', 'rock steel', 'ghost'],
  fire:     ['grass ice bug steel', 'fire water rock dragon', ''],
  water:    ['fire ground rock', 'water grass dragon', ''],
  electric: ['water flying', 'electric grass dragon', 'ground'],
  grass:    ['water ground rock', 'fire grass poison flying bug dragon steel', ''],
  ice:      ['grass ground flying dragon', 'fire water ice steel', ''],
  fighting: ['normal ice rock dark steel', 'poison flying psychic bug fairy', 'ghost'],
  poison:   ['grass fairy', 'poison ground rock ghost', 'steel'],
  ground:   ['fire electric poison rock steel', 'grass bug', 'flying'],
  flying:   ['grass fighting bug', 'electric rock steel', ''],
  psychic:  ['fighting poison', 'psychic steel', 'dark'],
  bug:      ['grass psychic dark', 'fire fighting poison flying ghost steel fairy', ''],
  rock:     ['fire ice flying bug', 'fighting ground steel', ''],
  ghost:    ['psychic ghost', 'dark', 'normal'],
  dragon:   ['dragon', 'steel', 'fairy'],
  dark:     ['psychic ghost', 'fighting dark fairy', ''],
  steel:    ['ice rock fairy', 'fire water electric steel', ''],
  fairy:    ['fighting dragon dark', 'fire poison steel', ''],
};
export function effectiveness(moveType, defTypes) {
  const [se, nve, imm] = CHART[moveType].map(x => x.split(' '));
  return defTypes.reduce((m, t) => m * (imm.includes(t) ? 0 : se.includes(t) ? 2 : nve.includes(t) ? 0.5 : 1), 1);
}
export const MOVE_NAME = {
  normal: 'Trombada', fire: 'Labareda', water: 'Jorro', electric: 'Choque', grass: 'Espinhos', ice: 'Granizo',
  fighting: 'Golpe Duplo', poison: 'Ácido', ground: 'Tremor', flying: 'Rajada', psychic: 'Onda Mental', bug: 'Ferroada',
  rock: 'Avalanche', ghost: 'Assombração', dragon: 'Sopro Antigo', dark: 'Mordida Sombria', steel: 'Lâmina', fairy: 'Brilho Encantado',
};
export const battle = { busy: false, me: null, foe: null, over: false };
export function fighter(id, ownedEntry) {
  const b = creatureBase(id), evolved = !!ownedEntry?.ev;
  const sh = creatureSheet(id, evolved);
  const art = drawCreature(id, false, b.types, b.rarity, evolved ? 2 : 1);
  const max = Math.round(40 + sh.stats.hp * 1.2);
  return { id, b, name: ownedEntry?.nick || (evolved ? evoName(b) : b.name), types: b.types, rarity: b.rarity,
    st: { ...sh.stats }, hp: max, max, src: art.src, guard: false };
}
export function movesFor(f) {
  const [t1, t2] = f.types;
  return [
    { name: 'Trombada', type: 'normal', pow: 40, acc: 1 },
    { name: MOVE_NAME[t1], type: t1, pow: 60, acc: 0.95 },
    t2 ? { name: MOVE_NAME[t2], type: t2, pow: 75, acc: 0.85 } : { name: 'Golpe Forte', type: t1, pow: 90, acc: 0.7 },
    { name: 'Defender', guard: true },
  ];
}
export function openBattle(preselectId) {
  if (state.mode === 'busy') return;
  battle.over = false; battle.busy = false;
  el.bPick.hidden = false; el.bArena.hidden = true;
  const owned = Object.entries(dex.o).map(([id, e]) => ({ id: +id, e, b: creatureBase(+id) }));
  owned.sort((a, b) => (b.e.fav ? 1 : 0) - (a.e.fav ? 1 : 0) || RARITY_ORDER.indexOf(b.b.rarity) - RARITY_ORDER.indexOf(a.b.rarity) || a.id - b.id);
  el.bList.innerHTML = '';
  el.bEmpty.hidden = owned.length > 0;
  for (const { id, e, b } of owned.slice(0, 120)) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cell found';
    btn.setAttribute('aria-label', `Batalhar com ${e.nick || b.name}`);
    const img = new Image(); img.alt = ''; img.src = creatureThumb(id, false, e.ev ? 2 : 1);
    btn.append(Object.assign(document.createElement('span'), { className: 'n', textContent: (e.fav ? '♥ ' : '') + (e.nick || (e.ev ? evoName(b) : b.name)) }), img);
    if (b.rarity !== 'comum') btn.append(Object.assign(document.createElement('span'), { className: 'r ' + b.rarity }));
    btn.addEventListener('click', () => startBattle(id));
    el.bList.appendChild(btn);
  }
  openModal(el.battle, el.bList.querySelector('button') || el.bClose);
  if (preselectId && dex.o[preselectId]) startBattle(preselectId);
}
export function startBattle(myId) {
  const me = fighter(myId, dex.o[myId]);
  let foeId; do { foeId = pickCreatureId(myId, { ball: 'padrao' }); } while (foeId === myId);
  const foe = fighter(foeId, null);
  // equilibra a força do oponente (±10%) para batalhas justas
  const tot = f => f.st.hp + f.st.atk + f.st.def + f.st.spd;
  const k = clamp(tot(me) / tot(foe) * rr(0.9, 1.1), 0.7, 1.45);
  for (const s of ['hp', 'atk', 'def', 'spd']) foe.st[s] = Math.round(foe.st[s] * k);
  foe.max = foe.hp = Math.round(40 + foe.st.hp * 1.2);
  Object.assign(battle, { me, foe, over: false, busy: false });
  el.bPick.hidden = true; el.bArena.hidden = false; el.bEnd.hidden = true;
  el.bMeImg.src = me.src; el.bFoeImg.src = foe.src;
  el.bMeName.textContent = me.name; el.bFoeName.textContent = foe.name;
  typeChips(el.bMeTypes, me.types); typeChips(el.bFoeTypes, foe.types);
  updateHp(true);
  el.bMoves.innerHTML = '';
  movesFor(me).forEach((mv, i) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'move';
    if (mv.guard) btn.innerHTML = `<b>Defender</b><small>reduz o dano · recupera um pouco</small>`;
    else {
      const [label, c] = TYPES[mv.type];
      btn.style.setProperty('--c', c);
      btn.innerHTML = `<b>${mv.name}</b><small>${label} · poder ${mv.pow} · ${Math.round(mv.acc * 100)}%</small>`;
    }
    btn.addEventListener('click', () => playTurn(i));
    el.bMoves.appendChild(btn);
  });
  for (const img of [el.bMeImg, el.bFoeImg]) img.getAnimations().forEach(a => a.cancel());
  el.bMeImg.animate([{ transform: 'scaleX(-1) translateX(60%)', opacity: 0 }, { transform: 'scaleX(-1)', opacity: 1 }], { duration: 450, easing: 'ease-out' });
  el.bFoeImg.animate([{ transform: 'translateX(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 450, easing: 'ease-out' });
  bLog(`Um ${foe.name} selvagem apareceu! Vai, ${me.name}!`);
  ensureAudio(); setTimeout(() => cry(foe.b && { ...foe.b, original: true }), 300);
  el.bMoves.querySelector('button').focus();
}
export function updateHp(instant) {
  for (const [f, bar, txt] of [[battle.me, el.bMeHp, el.bMeHpTxt], [battle.foe, el.bFoeHp, el.bFoeHpTxt]]) {
    const pct = Math.max(0, f.hp / f.max);
    bar.style.transition = instant ? 'none' : '';
    bar.style.width = (Math.ceil(pct * 24) / 24 * 100) + '%';
    bar.className = pct > 0.5 ? '' : pct > 0.2 ? 'mid' : 'low';
    txt.textContent = `${Math.max(0, f.hp)}/${f.max}`;
  }
}
export const bLog = t => { el.bLog.textContent = t; };
export async function act(att, def, mv, isMe) {
  const attImg = isMe ? el.bMeImg : el.bFoeImg, defImg = isMe ? el.bFoeImg : el.bMeImg;
  const flipA = isMe ? 'scaleX(-1) ' : '', flipD = isMe ? '' : 'scaleX(-1) ';
  if (mv.guard) {
    att.guard = true;
    const heal = Math.round(att.max * 0.06); att.hp = Math.min(att.max, att.hp + heal);
    bLog(`${att.name} se defendeu e recuperou ${heal} PV.`); sfx.guard();
    attImg.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8) drop-shadow(0 0 8px #7fd0ff)' }, { filter: 'brightness(1)' }], { duration: 500 });
    updateHp(); await sleep(800); return;
  }
  bLog(`${att.name} usou ${mv.name}!`);
  if (!reduced) attImg.animate([{ transform: flipA + 'translateX(0)' }, { transform: flipA + `translateX(${isMe ? -18 : -18}%)` }, { transform: flipA + 'translateX(0)' }],
    { duration: 300, easing: 'ease-in-out' });
  await sleep(280);
  if (Math.random() > mv.acc) { sfx.miss(); bLog(`${att.name} usou ${mv.name}… mas errou!`); await sleep(850); return; }
  const eff = effectiveness(mv.type, def.types);
  const stab = att.types.includes(mv.type) ? 1.25 : 1;
  const crit = Math.random() < 0.06 ? 1.5 : 1;
  let dmg = Math.round(((att.st.atk / Math.max(8, def.st.def)) * mv.pow * 0.42 + 2) * eff * stab * crit * rr(0.85, 1));
  if (def.guard) { dmg = Math.round(dmg * 0.4); def.guard = false; }
  if (eff === 0) dmg = 0;
  def.hp = Math.max(0, def.hp - dmg);
  if (dmg > 0) {
    eff >= 2 ? sfx.superHit() : sfx.hit();
    const r = defImg.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.55, false, mv.type === 'normal' ? '' : 'type:' + mv.type);
    if (!reduced) defImg.animate([{ opacity: 1, transform: flipD + 'translateX(0)' }, { opacity: 0.2, transform: flipD + 'translateX(4%)' },
      { opacity: 1, transform: flipD + 'translateX(-4%)' }, { opacity: 0.2 }, { opacity: 1, transform: flipD + 'translateX(0)' }], { duration: 420 });
    const pop = document.createElement('span'); pop.className = 'dmg' + (eff >= 2 ? ' se' : ''); pop.textContent = '-' + dmg;
    (isMe ? el.bFoeSlot : el.bMeSlot).appendChild(pop); setTimeout(() => pop.remove(), 900);
  }
  updateHp();
  await sleep(500);
  const msg = eff === 0 ? 'Não teve efeito…' : eff >= 2 ? 'É super efetivo!' : eff < 1 ? 'Não é muito efetivo…' : '';
  if (crit > 1 && dmg > 0) bLog('Acerto crítico! ' + msg); else if (msg) bLog(msg);
  if (msg || crit > 1) await sleep(750);
}
export function foeChoice() {
  const f = battle.foe, mv = movesFor(f);
  if (f.hp / f.max < 0.35 && Math.random() < 0.2) return mv[3];
  const opts = mv.slice(0, 3).map(m => ({ m, s: effectiveness(m.type, battle.me.types) * m.pow * m.acc * rr(0.7, 1.3) }));
  return opts.sort((a, b) => b.s - a.s)[0].m;
}
export async function playTurn(i) {
  if (battle.busy || battle.over) return;
  battle.busy = true;
  el.bMoves.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const me = battle.me, foe = battle.foe, myMv = movesFor(me)[i], foeMv = foeChoice();
  me.guard = false; foe.guard = false;
  const meFirst = myMv.guard || (!foeMv.guard && (me.st.spd > foe.st.spd || (me.st.spd === foe.st.spd && Math.random() < 0.5)));
  const order = meFirst ? [[me, foe, myMv, true], [foe, me, foeMv, false]] : [[foe, me, foeMv, false], [me, foe, myMv, true]];
  for (const [a, d, mv, isMe] of order) {
    if (a.hp <= 0) continue;
    await act(a, d, mv, isMe);
    if (d.hp <= 0) { await endBattle(d === foe); battle.busy = false; return; }
  }
  bLog(`O que ${me.name} vai fazer?`);
  battle.busy = false;
  el.bMoves.querySelectorAll('button').forEach(b => { b.disabled = false; });
  el.bMoves.querySelector('button').focus();
}
export async function endBattle(won) {
  battle.over = true;
  const loser = won ? el.bFoeImg : el.bMeImg;
  sfx.faint();
  loser.animate([{ opacity: 1, transform: (won ? '' : 'scaleX(-1) ') + 'translateY(0)' }, { opacity: 0, transform: (won ? '' : 'scaleX(-1) ') + 'translateY(30%)' }],
    { duration: 600, fill: 'forwards', easing: 'ease-in' });
  await sleep(500);
  state.stats.battles++;
  if (won) {
    state.stats.wins++;
    const isNew = !dex.o[battle.foe.id];
    dexRegister({ id: battle.foe.id, original: true, shiny: false });
    bLog(`${battle.foe.name} desmaiou! Vitória! ${isNew ? 'Ele foi registrado na sua Pokédex.' : ''}`);
    sfx.win();
    const r = el.bFoeSlot.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, true, '');
  } else {
    bLog(`${battle.me.name} desmaiou… O ${battle.foe.name} selvagem fugiu.`);
    sfx.lose();
  }
  saveStats(); updateCounter();
  el.bEnd.hidden = false; el.bAgain.focus();
  checkAchievements();
}
