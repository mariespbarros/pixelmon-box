/* Pokédex: coleção salva, grade, filtros e ficha. */
import { ACH, achDone, renderAchievements } from './achievements.js';
import { totalSpecies } from './api.js';
import { renderSheet } from './bindings.js';
import { CREATURE_TOTAL, creatureBase, drawCreature, evoName } from './creatures.js';
import { el } from './dom.js';
import { RARITY, typeChips } from './sequence.js';
import { state } from './state.js';
import { closeModal } from './ui.js';
import { clamp, store } from './utils.js';

/* =========================================================
   POKÉDEX (coleção salva no navegador)
   o = criaturas originais (#1–#1500) · p = Pokémon reais vindos da PokéAPI
   ========================================================= */
export const dex = (() => { const d = store.get('pkb.dex', null); return d && d.o && d.p ? d : { o: {}, p: {} }; })();
export const dexKey = m => m.original ? 'o' : 'p';
export const dexHas = m => !!dex[dexKey(m)][m.id];
export function dexRegister(m) {
  const k = dexKey(m), e = dex[k][m.id] || (dex[k][m.id] = { c: 0, s: 0, f: Date.now() });
  e.c++; if (m.shiny) e.s++;
  if (k === 'p') {                     // guarda o necessário para mostrar depois
    e.n = m.name; e.t = m.types; e.r = m.rarity;
    if (m.h) { e.h = m.h; e.w = m.w; e.ab = m.ab; e.st = m.st; }
    if (m.shiny) e.ss = m.src; else e.src = m.src;
  }
  store.set('pkb.dex', dex);
}

export const dexUI = { tab: 'o', filter: 'all', page: 0, PER: 150, lastFocus: null, detailId: null, showShiny: false };
export const thumbCache = new Map();
export function creatureThumb(id, shiny = false, stage) {
  stage = stage || (dex.o[id]?.ev ? 2 : 1);
  const k = id + (shiny ? 's' : '') + stage;
  if (!thumbCache.has(k)) { const b = creatureBase(id); thumbCache.set(k, drawCreature(id, shiny, b.types, b.rarity, stage).src); }
  return thumbCache.get(k);
}
export const pad = n => '#' + String(n).padStart(3, '0');

export function renderDex() {
  const tab = dexUI.tab;
  const nO = Object.keys(dex.o).length, nP = Object.keys(dex.p).length;
  el.progO.textContent = `${nO}/${CREATURE_TOTAL}`;
  el.progP.textContent = `${nP}/${totalSpecies || 1025}`;
  el.progA.textContent = `${ACH.filter(a => achDone[a.id]).length}/${ACH.length}`;
  for (const b of el.dexPanel.querySelectorAll('.tab')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const b of el.dexPanel.querySelectorAll('[data-filter]')) b.setAttribute('aria-pressed', String(b.dataset.filter === dexUI.filter));
  el.dexPanel.querySelector('.dex-tools').hidden = tab === 'a';
  el.dexGrid.classList.toggle('ach-list', tab === 'a');
  if (tab === 'a') {
    const { frag } = renderAchievements();
    el.dexEmpty.hidden = true;
    el.dexGrid.replaceChildren(frag); el.dexGrid.scrollTop = 0;
    return;
  }
  const entries = dex[tab];
  const total = tab === 'o' ? CREATURE_TOTAL : (totalSpecies || 1025);
  const found = Object.keys(entries).length;
  el.dexBarFill.style.width = (found / total * 100).toFixed(2) + '%';

  const ids = dexUI.filter === 'found' ? Object.keys(entries).map(Number).sort((a, b) => a - b)
    : dexUI.filter === 'fav' ? Object.keys(entries).filter(k => entries[k].fav).map(Number).sort((a, b) => a - b)
    : Array.from({ length: total }, (_, i) => i + 1);
  const pages = Math.max(1, Math.ceil(ids.length / dexUI.PER));
  dexUI.page = clamp(dexUI.page, 0, pages - 1);
  const slice = ids.slice(dexUI.page * dexUI.PER, (dexUI.page + 1) * dexUI.PER);
  el.pgLabel.textContent = slice.length ? `${pad(slice[0])}–${pad(slice[slice.length - 1])}` : '—';
  el.pgPrev.disabled = dexUI.page === 0; el.pgNext.disabled = dexUI.page >= pages - 1;

  el.dexEmpty.hidden = slice.length > 0;
  if (!slice.length) el.dexEmpty.textContent = dexUI.filter === 'fav' ? 'Nenhum favorito ainda. Abra a ficha de uma criatura e toque em ♡ favoritar.' : tab === 'o'
    ? 'Nenhuma criatura registrada ainda. Abra a Pokébola para começar a coleção!'
    : 'Nenhum Pokémon registrado. Eles aparecem quando a página consegue acessar a PokéAPI (arquivo aberto direto no navegador).';

  const frag = document.createDocumentFragment();
  for (const id of slice) {
    const e = entries[id];
    if (!e) {
      const d = document.createElement('div');
      d.className = 'cell miss'; d.setAttribute('aria-label', `${pad(id)}: não encontrado`);
      d.innerHTML = `<span class="n">${pad(id)}</span><span class="q">?</span>`;
      frag.appendChild(d); continue;
    }
    const rarity = tab === 'o' ? creatureBase(id).rarity : (e.r || 'comum');
    const name = e.nick || (tab === 'o' ? (e.ev ? evoName(creatureBase(id)) : creatureBase(id).name) : e.n);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cell found'; b.dataset.id = id;
    b.setAttribute('aria-label', `${pad(id)} ${name}${e.s ? ', shiny encontrado' : ''}`);
    const img = document.createElement('img');
    img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.src = tab === 'o' ? creatureThumb(id) : (e.src || e.ss || '');
    img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'q', textContent: '?' })); };
    b.append(Object.assign(document.createElement('span'), { className: 'n', textContent: pad(id) }), img);
    if (e.s || e.fav || e.ev) b.append(Object.assign(document.createElement('span'), { className: 'sh', textContent: (e.fav ? '♥' : '') + (e.ev ? '↑' : '') + (e.s ? '✦' : '') }));
    if (rarity !== 'comum') b.append(Object.assign(document.createElement('span'), { className: 'r ' + rarity }));
    frag.appendChild(b);
  }
  el.dexGrid.replaceChildren(frag);
  el.dexGrid.scrollTop = 0;
}

export function showDetail(id) {
  const tab = dexUI.tab, e = dex[tab][id]; if (!e) return;
  dexUI.detailId = id; dexUI.showShiny = false;
  const info = tab === 'o' ? creatureBase(id) : { name: e.n, types: e.t || [], rarity: e.r || 'comum' };
  el.ddNum.textContent = pad(id) + (tab === 'o' ? ' · criatura original' : '');
  el.ddName.textContent = tab === 'o' && e.ev ? evoName(info) : info.name;
  typeChips(el.ddTypes, info.types);
  const when = new Date(e.f).toLocaleDateString('pt-BR');
  el.ddStats.innerHTML =
    `<dt>raridade</dt><dd class="rar ${info.rarity}" style="margin:0">${RARITY[info.rarity].label}</dd>` +
    `<dt>encontrado</dt><dd>${e.c}×</dd>` +
    `<dt>shiny</dt><dd>${e.s ? `<span style="color:var(--gold)">✦ ${e.s}×</span>` : '—'}</dd>` +
    `<dt>1ª vez</dt><dd>${when}</dd>`;
  const canShiny = e.s > 0 && (tab === 'o' || e.ss);
  el.ddShiny.hidden = !canShiny; el.ddShiny.textContent = 'ver shiny';
  renderSheet(tab, id);
  setDetailImg();
  el.dexDetail.hidden = false; el.dexDetail.scrollTop = 0;
  el.ddBack.focus();
}
export function setDetailImg() {
  const tab = dexUI.tab, id = dexUI.detailId, e = dex[tab][id];
  el.ddImg.src = tab === 'o' ? creatureThumb(id, dexUI.showShiny, e.ev ? 2 : 1) : (dexUI.showShiny ? e.ss : (e.src || e.ss));
  el.ddImg.style.filter = dexUI.showShiny ? 'drop-shadow(0 0 10px rgba(255,211,77,.55))' : '';
}
export function hideDetail() {
  el.dexDetail.hidden = true;
  el.dexGrid.querySelector(`[data-id="${dexUI.detailId}"]`)?.focus();
}
export function openDex() {
  if (!el.dexPanel.hidden || state.mode === 'busy') return;
  for (const m of [el.battle, el.settingsPanel, el.shareModal]) if (!m.hidden) closeModal(m);
  dexUI.lastFocus = document.activeElement;
  el.dexDetail.hidden = true;
  el.dexPanel.hidden = false;
  renderDex();
  el.dexPanel.querySelector('.tab[aria-selected="true"]').focus();
}
export function closeDex() {
  if (el.dexPanel.hidden) return;
  el.dexPanel.hidden = true;
  (dexUI.lastFocus && document.contains(dexUI.lastFocus) ? dexUI.lastFocus : el.dexBtn).focus({ preventScroll: true });
}

el.dexBtn.addEventListener('click', openDex);
el.dexClose.addEventListener('click', closeDex);
el.dexPanel.addEventListener('click', e => { if (e.target === el.dexPanel) closeDex(); });
for (const b of el.dexPanel.querySelectorAll('.tab')) b.addEventListener('click', () => { dexUI.tab = b.dataset.tab; dexUI.page = 0; renderDex(); });
for (const b of el.dexPanel.querySelectorAll('[data-filter]')) b.addEventListener('click', () => { dexUI.filter = b.dataset.filter; dexUI.page = 0; renderDex(); });
el.pgPrev.addEventListener('click', () => { dexUI.page--; renderDex(); });
el.pgNext.addEventListener('click', () => { dexUI.page++; renderDex(); });
el.dexGrid.addEventListener('click', e => { const c = e.target.closest('.cell.found'); if (c) showDetail(Number(c.dataset.id)); });
el.ddBack.addEventListener('click', hideDetail);
el.ddShiny.addEventListener('click', () => {
  dexUI.showShiny = !dexUI.showShiny;
  el.ddShiny.textContent = dexUI.showShiny ? 'ver normal' : 'ver shiny';
  setDetailImg();
});
// teclado dentro da Pokédex: Esc fecha, Tab circula, setas trocam de aba
el.dexPanel.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); el.dexDetail.hidden ? closeDex() : hideDetail(); return; }
  if (e.key === 'Tab') {
    const root = el.dexDetail.hidden ? el.dexPanel : el.dexDetail;
    const f = [...root.querySelectorAll('button:not([disabled]):not([hidden]), input')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.classList.contains('tab')) {
    const order = ['o', 'p', 'a'], i = order.indexOf(dexUI.tab);
    dexUI.tab = order[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; dexUI.page = 0; renderDex();
    el.dexPanel.querySelector('.tab[aria-selected="true"]').focus();
  }
});
