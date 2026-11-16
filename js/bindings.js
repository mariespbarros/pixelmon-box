/* Ligações dos botões e atalhos de teclado. */
import { checkAchievements } from './achievements.js';
import { audio, cry, ensureAudio, sfx } from './audio.js';
import { battle, openBattle } from './battle.js';
import { creatureBase, evoName } from './creatures.js';
import { el } from './dom.js';
import { layout } from './layout.js';
import { setMusic } from './music.js';
import { closeDex, creatureThumb, dex, dexUI, openDex, showDetail } from './pokedex.js';
import { SAVE_KEYS, exportCode, importCode } from './save.js';
import { closeBall, openBall } from './sequence.js';
import { applyMotion, saveSettings, settings } from './settings.js';
import { openShare, shareInfoFor } from './share.js';
import { apiSheet, creatureSheet, fmtNum, statBars } from './sheet.js';
import { saveStats, state } from './state.js';
import { anyOverlayOpen, closeModal, openModal, showTutorial, toast } from './ui.js';
import { escapeHtml, store } from './utils.js';
import { setAmbient, updateHudInfo } from './world.js';

/* =========================================================
   LIGAÇÕES DA INTERFACE (HUD, cartão, ficha, batalha, ajustes)
   ========================================================= */
// cartão da revelação
el.cardSheet.addEventListener('click', () => {
  const m = state.current; if (!m) return;
  openDexAt(m.original ? 'o' : 'p', m.id);
});
el.cardShare.addEventListener('click', () => {
  const m = state.current; if (!m) return;
  openShare(shareInfoFor(m.original ? 'o' : 'p', m.id, m));
});
export function openDexAt(tab, id) {
  dexUI.tab = tab; dexUI.filter = 'all'; dexUI.page = Math.floor((id - 1) / dexUI.PER);
  openDex(); showDetail(id);
}

// HUD
el.battleBtn.addEventListener('click', () => openBattle());
el.musicBtn.addEventListener('click', () => setMusic(!settings.music));
el.setBtn.addEventListener('click', openSettings);
el.bClose.addEventListener('click', () => { if (!battle.busy) closeModal(el.battle); });
el.bAgain.addEventListener('click', () => { el.bArena.hidden = true; el.bPick.hidden = false; el.bList.querySelector('button')?.focus(); });
el.bQuit.addEventListener('click', () => closeModal(el.battle));

/* ---------- Ficha completa na Pokédex ---------- */
export function renderSheet(tab, id) {
  const e = dex[tab][id];
  const sh = tab === 'o' ? creatureSheet(id, !!e.ev) : apiSheet(e);
  el.ddDesc.textContent = sh.desc || '';
  el.ddDesc.hidden = !sh.desc;
  statBars(el.ddBars, sh.stats);
  const extra = [];
  if (sh.h) extra.push(`<dt>altura</dt><dd>${fmtNum(sh.h)} m</dd>`);
  if (sh.w) extra.push(`<dt>peso</dt><dd>${fmtNum(sh.w)} kg</dd>`);
  if (sh.ability) extra.push(`<dt>habilidade</dt><dd>${escapeHtml(sh.ability)}</dd>`);
  el.ddStats.insertAdjacentHTML('afterbegin', extra.join(''));
  // cadeia evolutiva (criaturas originais)
  el.ddEvo.innerHTML = '';
  if (tab === 'o') {
    const b = creatureBase(id);
    const a = new Image(); a.src = creatureThumb(id, false, 1); a.alt = b.name;
    const arrow = Object.assign(document.createElement('span'), { className: 'arr', textContent: '→' });
    const wrap = document.createElement('div'); wrap.className = 'evo-chain';
    const n1 = Object.assign(document.createElement('figure'), {}); n1.append(a, Object.assign(document.createElement('figcaption'), { textContent: b.name }));
    const n2 = document.createElement('figure');
    if (e.ev) { const i2 = new Image(); i2.src = creatureThumb(id, false, 2); i2.alt = evoName(b); n2.append(i2, Object.assign(document.createElement('figcaption'), { textContent: evoName(b) })); }
    else n2.append(Object.assign(document.createElement('span'), { className: 'q', textContent: '?' }),
      Object.assign(document.createElement('figcaption'), { textContent: `evolui ao encontrar 3× (${Math.min(e.c, 3)}/3)` }));
    wrap.append(n1, arrow, n2);
    el.ddEvo.append(Object.assign(document.createElement('p'), { className: 'dd-label', textContent: 'evolução' }), wrap);
  }
  // apelido / favorito
  el.ddNick.textContent = e.nick ? `apelido: “${e.nick}”` : '';
  el.ddFav.setAttribute('aria-pressed', String(!!e.fav));
  el.ddFav.textContent = e.fav ? '♥ favorito' : '♡ favoritar';
  el.ddNickForm.hidden = true;
  el.ddBattle.hidden = tab !== 'o';
}
el.ddCry.addEventListener('click', () => {
  ensureAudio();
  const tab = dexUI.tab, id = dexUI.detailId, e = dex[tab][id];
  const b = tab === 'o' ? creatureBase(id) : { id, rarity: e.r };
  cry({ ...b, id, original: tab === 'o', evolved: !!e.ev, rarity: b.rarity });
});
el.ddFav.addEventListener('click', () => {
  const e = dex[dexUI.tab][dexUI.detailId]; e.fav = !e.fav; store.set('pkb.dex', dex);
  el.ddFav.setAttribute('aria-pressed', String(e.fav)); el.ddFav.textContent = e.fav ? '♥ favorito' : '♡ favoritar';
  sfx.blink();
});
el.ddNickBtn.addEventListener('click', () => {
  const e = dex[dexUI.tab][dexUI.detailId];
  el.ddNickForm.hidden = !el.ddNickForm.hidden;
  if (!el.ddNickForm.hidden) { el.ddNickInput.value = e.nick || ''; el.ddNickInput.focus(); el.ddNickInput.select(); }
});
el.ddNickForm.addEventListener('submit', ev => {
  ev.preventDefault();
  const e = dex[dexUI.tab][dexUI.detailId], v = el.ddNickInput.value.trim().slice(0, 12);
  if (v && !e.nick) state.stats.nicks++;
  if (v) e.nick = v; else delete e.nick;
  store.set('pkb.dex', dex); saveStats();
  el.ddNick.textContent = e.nick ? `apelido: “${e.nick}”` : '';
  el.ddNickForm.hidden = true; el.ddNickBtn.focus();
  toast(v ? `Apelido salvo: ${v}` : 'Apelido removido');
  checkAchievements();
});
el.ddShare.addEventListener('click', () => openShare(shareInfoFor(dexUI.tab, dexUI.detailId, null)));
el.ddBattle.addEventListener('click', () => { const id = dexUI.detailId; closeDex(); openBattle(id); });

/* ---------- Ajustes ---------- */
export function openSettings() {
  el.setSfx.value = Math.round(settings.sfxVol * 100);
  el.setMusic.checked = settings.music;
  el.setMusicVol.value = Math.round(settings.musicVol * 100);
  el.setWeather.checked = settings.weather; el.setScenes.checked = settings.scenes; el.setDaynight.checked = settings.daynight;
  for (const b of el.settingsPanel.querySelectorAll('[data-motion]')) b.setAttribute('aria-pressed', String(b.dataset.motion === settings.motion));
  for (const b of el.settingsPanel.querySelectorAll('[data-size]')) b.setAttribute('aria-pressed', String(b.dataset.size === settings.ballSize));
  el.setExport.value = ''; el.setImport.value = ''; el.setMsg.textContent = '';
  el.setReset.textContent = 'apagar coleção'; el.setReset.dataset.armed = '';
  openModal(el.settingsPanel, el.setClose);
}
export function applyVolumes() {
  if (audio.sfx) audio.sfx.gain.value = settings.sfxVol;
  if (audio.music) audio.music.gain.value = settings.musicVol * 0.9;
}
el.setClose.addEventListener('click', () => closeModal(el.settingsPanel));
el.setSfx.addEventListener('input', () => { settings.sfxVol = el.setSfx.value / 100; saveSettings(); applyVolumes(); });
el.setSfx.addEventListener('change', () => { ensureAudio(); sfx.blink(); });
el.setMusic.addEventListener('change', () => setMusic(el.setMusic.checked));
el.setMusicVol.addEventListener('input', () => { settings.musicVol = el.setMusicVol.value / 100; saveSettings(); applyVolumes(); });
el.setWeather.addEventListener('change', () => { settings.weather = el.setWeather.checked; saveSettings(); updateHudInfo(); });
el.setScenes.addEventListener('change', () => { settings.scenes = el.setScenes.checked; saveSettings(); if (!settings.scenes) setAmbient(null); else if (state.mode === 'revealed') setAmbient(state.current.types[0]); });
el.setDaynight.addEventListener('change', () => { settings.daynight = el.setDaynight.checked; saveSettings(); updateHudInfo(); });
for (const b of el.settingsPanel.querySelectorAll('[data-motion]')) b.addEventListener('click', () => {
  settings.motion = b.dataset.motion; saveSettings(); applyMotion();
  for (const x of el.settingsPanel.querySelectorAll('[data-motion]')) x.setAttribute('aria-pressed', String(x === b));
});
for (const b of el.settingsPanel.querySelectorAll('[data-size]')) b.addEventListener('click', () => {
  settings.ballSize = b.dataset.size; saveSettings(); layout();
  for (const x of el.settingsPanel.querySelectorAll('[data-size]')) x.setAttribute('aria-pressed', String(x === b));
});
el.setExportBtn.addEventListener('click', async () => {
  el.setExport.value = exportCode(); el.setExport.select();
  try { await navigator.clipboard.writeText(el.setExport.value); el.setMsg.textContent = 'Código copiado! Guarde-o para restaurar sua coleção em outro lugar.'; }
  catch { el.setMsg.textContent = 'Copie o código acima e guarde-o em um lugar seguro.'; }
});
el.setImportBtn.addEventListener('click', () => {
  try { importCode(el.setImport.value); el.setMsg.textContent = 'Coleção importada! Recarregando…'; setTimeout(() => location.reload(), 700); }
  catch { el.setMsg.textContent = 'Código inválido. Confira se copiou tudo, começando por “PKB1:”.'; sfx.error(); }
});
el.setReset.addEventListener('click', () => {
  if (!el.setReset.dataset.armed) {
    el.setReset.dataset.armed = '1'; el.setReset.textContent = 'tem certeza? clique de novo';
    setTimeout(() => { el.setReset.dataset.armed = ''; el.setReset.textContent = 'apagar coleção'; }, 4000);
    return;
  }
  for (const k of SAVE_KEYS) { try { localStorage.removeItem(k); } catch {} }
  location.reload();
});
el.setTut.addEventListener('click', () => { closeModal(el.settingsPanel); showTutorial(); });


/* =========================================================
   EVENTOS
   ========================================================= */
el.ball.addEventListener('click', () => { if (state.mode === 'revealed') closeBall(); else openBall(); });
el.again.addEventListener('click', closeBall);
el.retry.addEventListener('click', () => { el.error.hidden = true; openBall(); });
el.ball.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') state.hover = true; });
el.ball.addEventListener('pointerleave', () => { state.hover = false; });
el.ball.addEventListener('focus', () => { if (el.ball.matches(':focus-visible')) state.hover = true; });
el.ball.addEventListener('blur', () => { state.hover = false; });
// Enter/Espaço em qualquer lugar da página executa a ação principal
document.addEventListener('keydown', e => {
  if (anyOverlayOpen()) return;                         // janelas abertas tratam o próprio teclado
  if (e.target.matches?.('input, textarea')) return;
  const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
  if ((e.key === 'p' || e.key === 'P') && plain) { e.preventDefault(); openDex(); return; }
  if ((e.key === 'b' || e.key === 'B') && plain) { e.preventDefault(); openBattle(); return; }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (e.target !== document.body) return;  // botões já tratam o próprio teclado
  e.preventDefault();
  if (state.mode === 'revealed') closeBall(); else openBall();
});
