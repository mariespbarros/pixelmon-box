/* Sequências de abrir, revelar, fugir, evoluir e fechar. */
import { checkAchievements } from './achievements.js';
import { loadRandom, prefetch } from './api.js';
import { cry, ensureAudio, noise, sfx } from './audio.js';
import { BALLS, HEAD } from './ball.js';
import { ballBarState } from './ballbar.js';
import { creatureBase, drawCreature, evoName } from './creatures.js';
import { el } from './dom.js';
import { burst } from './effects.js';
import { applyShift } from './layout.js';
import { dex, dexHas, dexKey, dexRegister } from './pokedex.js';
import { reduced } from './settings.js';
import { saveStats, state } from './state.js';
import { TYPES, textOn } from './types.js';
import { anyOverlayOpen, toast } from './ui.js';
import { clamp, ease, escapeHtml, nice, sleep, store, tween } from './utils.js';
import { dailyStatus, markDaily, setAmbient } from './world.js';

/* =========================================================
   SEQUÊNCIAS: ABRIR / FECHAR
   ========================================================= */
export const SIL0 = 'brightness(0) invert(1) drop-shadow(0 0 0px rgba(255,255,255,0))';
export const SIL  = 'brightness(0) invert(1) drop-shadow(0 0 14px rgba(255,255,255,.85))';
export const FINAL = 'brightness(1) invert(0) drop-shadow(0 0 0px rgba(255,255,255,0))';
export const FINAL_SHINY = 'brightness(1) invert(0) drop-shadow(0 0 10px rgba(255,211,77,.6))';

export function ballOpening() {
  const r = el.body.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * ((HEAD + 16) / 44) };
}
export function flash(shiny, kind = '') {
  const { x, y } = ballOpening();
  el.flash.style.setProperty('--fx', x + 'px'); el.flash.style.setProperty('--fy', y + 'px');
  el.flash.classList.toggle('gold', shiny || kind === 'lendaria');
  el.flash.classList.toggle('epic', !shiny && kind === 'epica');
  el.beam.classList.toggle('wide', kind === 'lendaria');
  const peak = reduced ? 0.35 : 0.9;
  el.flash.animate([{ opacity: 0 }, { opacity: peak, offset: 0.15 }, { opacity: 0 }], { duration: reduced ? 500 : 460, easing: 'ease-out' });
  el.beam.classList.toggle('gold', shiny || kind === 'lendaria');
  if (!reduced) el.beam.animate([
    { opacity: 0, transform: 'translateX(-50%) scaleY(0)' },
    { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: 0.3 },
    { opacity: 0, transform: 'translateX(-50%) scaleY(1.05)' },
  ], { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
export function setHint(text, wait = false) {
  el.hint.textContent = text;
  el.hint.classList.toggle('wait', wait);
  el.hint.classList.toggle('hide', !text);
}
export function fillCard(m) {
  el.name.textContent = m.name;
  el.dexNum.textContent = '#' + String(m.id).padStart(3, '0');
  el.badge.hidden = !m.shiny;
  const r = RARITY[m.rarity] || RARITY.comum;
  el.rar.className = 'rar ' + (m.rarity || 'comum'); el.rar.textContent = r.label;
  const nick = dex[dexKey(m)][m.id]?.nick;
  if (nick) el.name.innerHTML = `${escapeHtml(nick)} <small class="realname">(${escapeHtml(m.name)})</small>`;
  el.orig.innerHTML = [m.original ? 'criatura original' : '', m.isNew ? '<span class="new">novo!</span>' : '',
    m.justEvolved ? '<span class="new">evoluiu!</span>' : ''].filter(Boolean).join(' · ');
  m.justEvolved = false;
  el.card.classList.toggle('shiny', m.shiny);
  el.types.innerHTML = '';
  for (const t of m.types) {
    const [label, c] = TYPES[t] || [nice(t), '#888'];
    const li = document.createElement('li');
    li.className = 'type'; li.textContent = label;
    li.style.setProperty('--c', c); li.style.setProperty('--t', textOn(c));
    el.types.appendChild(li);
  }
}
export const RARITY = {
  comum: { label: '★ comum' }, rara: { label: '★★ rara' }, epica: { label: '★★★ épica' }, lendaria: { label: '★★★★ lendária' },
};
export function typeChips(ul, types) {
  ul.innerHTML = '';
  for (const t of types) {
    const [label, c] = TYPES[t] || [nice(t), '#888'];
    const li = document.createElement('li');
    li.className = 'type'; li.textContent = label;
    li.style.setProperty('--c', c); li.style.setProperty('--t', textOn(c));
    ul.appendChild(li);
  }
}
/** Animação "viva": flutua (fantasmas, voadores, lendárias) ou respira; pisca de vez em quando. */
export function startAlive(m) {
  el.alive.getAnimations().forEach(a => a.cancel());
  state.nextBlink = performance.now() + 1200; state.blinking = false; el.blinkImg.classList.remove('on');
  if (reduced) return;
  if (m.floats || m.rarity === 'lendaria') {
    el.alive.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3.5%)' }],
      { duration: 1400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  } else {
    el.alive.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(.985, 1.03)' }],
      { duration: 1150, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  }
}
export function updateCounter() {
  el.count.textContent = state.count;
  el.shinyCount.textContent = state.shinies ? `✦ shiny: ${state.shinies}` : '';
}
export function friendlyError() {
  return navigator.onLine === false
    ? 'Parece que você está offline. Conecte-se e tente de novo.'
    : 'A PokéAPI não respondeu desta vez. Os Pokémon devem estar se escondendo! Tente de novo.';
}

/** Opções do próximo sorteio (bola atual + bônus diário). */
export function openOpts() {
  const d = dailyStatus();
  const o = { ball: state.ballId, minRarity: d.bonus ? d.min : null };
  o.key = `${o.ball}|${o.minRarity || ''}`;
  return o;
}
export const ESCAPE_BASE = { comum: 0.07, rara: 0.10, epica: 0.15, lendaria: 0.22 };

export async function openBall() {
  if (state.mode !== 'idle' && state.mode !== 'error') return;
  if (anyOverlayOpen()) return;
  state.mode = 'busy';
  ensureAudio();
  el.ball.setAttribute('aria-disabled', 'true');
  el.error.hidden = true;
  setHint('');
  ballBarState();

  const daily = dailyStatus();
  const opts = openOpts();
  if (daily.bonus) toast(`Bônus do dia! ${daily.min === 'epica' ? '★★★ épica' : '★★ rara'} ou melhor garantida`, 'gold');

  // dados em paralelo com a tremida (usa o pré-carregado se ainda valer)
  const pre = state.next && state.nextKey === opts.key ? state.next : null; state.next = null;
  const dataP = (pre ? pre.then(d => d || loadRandom(state.current?.id, opts)) : loadRandom(state.current?.id, opts));
  let data = null, err = null;
  const settled = dataP.then(d => { data = d; }, e => { err = e; });

  // 1) treme 3 vezes
  if (reduced) {
    state.waiting = true; await sleep(500); state.waiting = false;
  } else {
    for (let i = 0; i < 3; i++) {
      sfx.shake();
      await tween(260, (_, t) => {
        const s = Math.sin(t * Math.PI * 2) * (1 - t * 0.5);
        state.shakeRot = Math.round(s * 14 / 2) * 2;
        state.shakeX = Math.round(s * 1.5);
      }, x => x);
      state.shakeRot = 0; state.shakeX = 0;
      await sleep(70);
    }
  }

  // carregando: pisca devagar até a API responder
  if (!data && !err) {
    state.waiting = true; el.body.classList.add('loading'); setHint('procurando', true);
    await settled;
    state.waiting = false; el.body.classList.remove('loading'); setHint('');
  }
  if (err || !data) return showError();
  const m = data;

  // às vezes a criatura escapa! (nunca no bônus diário nem nas 3 primeiras aberturas)
  const escapeP = (ESCAPE_BASE[m.rarity] || 0.08) * BALLS[state.ballId].escape;
  if (!daily.bonus && state.count >= 3 && Math.random() < escapeP) return escapeSequence(m);

  // 2) botão pisca branco
  state.blink = 1; sfx.blink(); await sleep(90);
  state.blink = 0; await sleep(60);
  state.blink = 1; sfx.blink(); await sleep(100);
  state.blink = 0;

  // prepara o sprite
  m.isNew = !dexHas(m);
  el.sprite.src = m.src;
  el.sprite.classList.toggle('smooth', !m.pixel);
  el.blinkImg.hidden = !m.blink; if (m.blink) el.blinkImg.src = m.blink;
  el.blinkImg.classList.remove('on');
  el.halo.classList.toggle('gold', m.shiny || m.rarity === 'lendaria');
  el.rays.className = 'rays ' + (m.rarity || '');
  fillCard(m);
  const rare = m.rarity === 'lendaria' || m.rarity === 'epica';

  // abertura própria das lendárias: a tela escurece e a bola carrega energia
  if (m.rarity === 'lendaria' && !reduced) {
    document.body.classList.add('legend');
    sfx.charge();
    await tween(900, (_, t) => {
      state.glow = 1;
      const s = Math.sin(t * Math.PI * 10) * t;
      state.shakeX = Math.round(s * 1.5); state.shakeRot = Math.round(s * 4);
      state.blink = Math.sin(t * Math.PI * 12) > 0.6 ? 1 : 0;
    }, x => x);
    state.shakeX = 0; state.shakeRot = 0; state.blink = 0;
  }

  // 3) tampa abre + flash + partículas
  sfx.open();
  flash(m.shiny, m.rarity);
  const o = ballOpening();
  burst(o.x, o.y, m.shiny, m.rarity);
  if (m.rarity === 'lendaria') setTimeout(() => { const q = ballOpening(); burst(q.x, q.y - 60, false, 'lendaria'); }, 260);
  tween(reduced ? 120 : 230, t => { state.lid = clamp(Math.round(t * 8), 0, 9); }, reduced ? ease.outCubic : ease.outBack)
    .then(() => { state.lid = 8; });
  state.mode = 'busy'; state.lid = 1; applyShift();
  setAmbient(m.types[0]);

  // 4) criatura surge: escala + silhueta branca que ganha cor
  m.rarity === 'lendaria' ? sfx.legend() : sfx.reveal();
  if (m.shiny) sfx.shiny(); else if (m.rarity === 'epica') sfx.epic();
  setTimeout(() => cry(m), m.rarity === 'lendaria' ? 1300 : 750);
  const final = m.shiny ? FINAL_SHINY : FINAL;
  el.box.getAnimations().forEach(a => a.cancel());
  el.alive.getAnimations().forEach(a => a.cancel());
  const anim = reduced
    ? el.box.animate([{ opacity: 0, filter: SIL0 }, { opacity: 1, filter: final }], { duration: 500, fill: 'forwards', easing: 'ease-out' })
    : el.box.animate([
        { opacity: 0, transform: 'translateY(30%) scale(.05)', filter: SIL0 },
        { opacity: 1, offset: 0.16 },
        { transform: 'translateY(-4%) scale(1.08)', filter: SIL, offset: 0.48 },
        { transform: 'translateY(0) scale(.97)', filter: SIL, offset: 0.62 },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: final },
      ], { duration: 860, delay: 60, fill: 'forwards', easing: 'cubic-bezier(.25,.8,.25,1)' });
  el.halo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 200, fill: 'forwards', easing: 'ease-out' });
  if (rare) el.rays.animate([{ opacity: 0 }, { opacity: m.rarity === 'lendaria' ? 1 : 0.7 }], { duration: 1200, delay: 250, fill: 'forwards', easing: 'ease-out' });

  // 5) informações
  await sleep(reduced ? 300 : 640);
  showCard();
  await anim.finished.catch(() => {});
  document.body.classList.remove('legend');
  startAlive(m);

  state.current = m;
  dexRegister(m);
  state.count++; if (m.shiny) state.shinies++;
  store.set('pkb.count', state.count); store.set('pkb.shiny', state.shinies);
  if (daily.bonus) markDaily(daily.newStreak);
  updateCounter();
  announce(m);
  el.ball.setAttribute('aria-label', `Pokébola aberta: ${m.name}`);

  // evolução: a 3ª vez que encontra a mesma criatura
  if (m.original && !m.evolved && dex.o[m.id].c >= 3) await evolveSequence(m);

  state.mode = 'revealed';
  checkAchievements();
  el.again.focus({ preventScroll: true });
  prefetch();
}

export function showCard() {
  el.card.hidden = false; el.card.classList.remove('out', 'show');
  void el.card.offsetWidth; el.card.classList.add('show');
}
export function announce(m) {
  const typesTxt = m.types.map(t => (TYPES[t] || [nice(t)])[0]).join(' e ');
  el.live.textContent = `Você encontrou ${m.name}${m.original ? ', uma criatura original' : ''}${m.shiny ? ', versão shiny' : ''}! Raridade ${RARITY[m.rarity || 'comum'].label.replace(/★/g, '').trim()}. Número ${m.id}. Tipo ${typesTxt}.${m.isNew ? ' Novo registro na Pokédex!' : ''}`;
}

/** A criatura aparece como silhueta, escapa num salto e deixa fumaça. */
export async function escapeSequence(m) {
  state.blink = 1; sfx.blink(); await sleep(90); state.blink = 0;
  el.sprite.src = m.src; el.blinkImg.hidden = true;
  el.sprite.classList.toggle('smooth', !m.pixel);
  sfx.open();
  const o = ballOpening();
  burst(o.x, o.y, false, 'smoke');
  tween(160, t => { state.lid = Math.round(t * 5); });
  el.box.getAnimations().forEach(a => a.cancel());
  const dir = Math.random() < 0.5 ? -1 : 1;
  const a = reduced
    ? el.box.animate([{ opacity: 0, filter: SIL0 }, { opacity: 0.8, filter: SIL, offset: 0.4 }, { opacity: 0, filter: SIL0 }], { duration: 700 })
    : el.box.animate([
        { opacity: 0, transform: 'translateY(30%) scale(.05)', filter: SIL0 },
        { opacity: 1, transform: 'translateY(-8%) scale(.7)', filter: SIL, offset: 0.35 },
        { opacity: 1, transform: 'translateY(-12%) scale(.72)', filter: SIL, offset: 0.55 },
        { opacity: 0, transform: `translate(${dir * 170}%, -70%) scale(.35)`, filter: SIL0 },
      ], { duration: 950, easing: 'cubic-bezier(.3,.7,.4,1)' });
  setTimeout(() => sfx.escape(), 420);
  setTimeout(() => { const q = ballOpening(); burst(q.x, q.y - 30, false, 'smoke'); }, 520);
  await a.finished.catch(() => {});
  await tween(160, t => { state.lid = Math.round((1 - t) * 5); }, ease.inCubic);
  state.lid = 0;
  state.stats.escapes++; saveStats();
  state.mode = 'idle';
  el.ball.removeAttribute('aria-disabled');
  ballBarState();
  setHint('escapou! clique para tentar de novo');
  el.live.textContent = 'A criatura escapou! Tente de novo.';
  checkAchievements();
  prefetch();
}

/** Evolução: silhueta piscando entre as duas formas, flash e a nova forma. */
export async function evolveSequence(m) {
  const b = creatureBase(m.id);
  const evo = drawCreature(m.id, m.shiny, b.types, b.rarity, 2);
  const oldName = m.name, newName = evoName(b);
  await sleep(900);
  el.card.classList.add('out');
  await sleep(180);
  el.card.hidden = true;
  setHint(`O quê? ${oldName} está evoluindo!`);
  el.alive.getAnimations().forEach(x => x.cancel());
  el.blinkImg.classList.remove('on'); el.blinkImg.hidden = true;
  sfx.evolve();
  const cur = getComputedStyle(el.box).filter;
  el.box.getAnimations().forEach(x => x.cancel());
  await el.box.animate([{ filter: cur, opacity: 1 }, { filter: SIL, opacity: 1 }], { duration: 350, fill: 'forwards' }).finished;
  if (!reduced) {
    let t = 340, on = false;
    while (t > 40) { on = !on; el.sprite.src = on ? evo.src : m.src; await sleep(t); t *= 0.82; }
  }
  el.sprite.src = evo.src;
  flash(true, 'lendaria');
  const o = el.box.getBoundingClientRect();
  burst(o.left + o.width / 2, o.top + o.height * 0.55, true, 'lendaria');
  sfx.legend();
  el.box.getAnimations().forEach(x => x.cancel());
  await el.box.animate([{ filter: SIL, transform: 'scale(1.06)', opacity: 1 }, { filter: m.shiny ? FINAL_SHINY : FINAL, transform: 'scale(1)', opacity: 1 }],
    { duration: 700, fill: 'forwards', easing: 'ease-out' }).finished;
  Object.assign(m, { name: newName, src: evo.src, blink: evo.blink, evolved: true, justEvolved: true });
  el.blinkImg.hidden = !m.blink; if (m.blink) el.blinkImg.src = m.blink;
  const e = dex.o[m.id]; e.ev = true; e.evAt = Date.now(); store.set('pkb.dex', dex);
  state.stats.evolutions++; saveStats();
  setHint('');
  fillCard(m); showCard();
  startAlive(m);
  toast(`${oldName} evoluiu para ${newName}!`, 'gold');
  el.live.textContent = `${oldName} evoluiu para ${newName}!`;
  setTimeout(() => cry(m), 300);
}

export async function closeBall() {
  if (state.mode !== 'revealed') return;
  state.mode = 'busy';
  ensureAudio();
  sfx.close();
  el.card.classList.add('out');
  el.alive.getAnimations().forEach(a => a.cancel());
  el.blinkImg.classList.remove('on');
  setAmbient(null);
  el.rays.animate([{ opacity: getComputedStyle(el.rays).opacity }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  const shrink = el.box.animate([
    { opacity: 1, transform: 'translateY(0) scale(1)', filter: getComputedStyle(el.box).filter },
    { opacity: 1, transform: 'translateY(0) scale(1.04)', filter: SIL, offset: 0.35 },
    { opacity: 0, transform: 'translateY(30%) scale(.05)', filter: SIL0 },
  ], { duration: reduced ? 250 : 420, fill: 'forwards', easing: 'cubic-bezier(.5,0,.75,0)' });
  el.halo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  await shrink.finished.catch(() => {});
  el.card.hidden = true; el.card.classList.remove('show', 'out');

  await tween(reduced ? 100 : 200, t => { state.lid = Math.round((1 - t) * 8); }, ease.inCubic);
  state.lid = 0;
  noise(0, 0.03, 0.06, 3000);
  state.mode = 'idle';
  applyShift();
  el.ball.setAttribute('aria-label', 'Abrir Pokébola');
  el.ball.removeAttribute('aria-disabled');
  ballBarState();
  await sleep(reduced ? 150 : 420);
  openBall();   // "abrir outra": já abre a próxima
}

export function showError() {
  sfx.error();
  ballBarState();
  document.body.classList.remove('legend');
  state.mode = 'error';
  state.lid = 0; state.blink = 0;
  applyShift();
  el.ball.removeAttribute('aria-disabled');
  el.errorMsg.textContent = friendlyError();
  el.error.hidden = false;
  el.live.textContent = el.errorMsg.textContent;
  el.retry.focus({ preventScroll: true });
}
