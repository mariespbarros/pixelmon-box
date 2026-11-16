/* Cartão em imagem para compartilhar. */
import { checkAchievements } from './achievements.js';
import { creatureBase, evoName } from './creatures.js';
import { el } from './dom.js';
import { creatureThumb, dex } from './pokedex.js';
import { RARITY } from './sequence.js';
import { STAT_LABEL, apiSheet, creatureSheet } from './sheet.js';
import { saveStats, state } from './state.js';
import { TYPES, textOn } from './types.js';
import { closeModal, openModal } from './ui.js';
import { clamp, mulberry32, nice } from './utils.js';

/* =========================================================
   CARTÃO PARA COMPARTILHAR (imagem em pixel art)
   ========================================================= */
export function loadImg(src, cors) {
  return new Promise((res, rej) => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export const RAR_COLOR = { comum: '#8f8aa3', rara: '#6fb7ff', epica: '#c27dff', lendaria: '#ffd34d' };
export async function makeShareCard(info) {
  await document.fonts?.ready;
  const W = 270, H = 390, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const rc = info.shiny ? '#ffd34d' : RAR_COLOR[info.rarity] || '#8f8aa3';
  x.fillStyle = '#07060b'; x.fillRect(0, 0, W, H);
  // moldura pixel com cantos recortados
  x.fillStyle = rc; x.fillRect(4, 2, W - 8, 2); x.fillRect(4, H - 4, W - 8, 2); x.fillRect(2, 4, 2, H - 8); x.fillRect(W - 4, 4, 2, H - 8);
  x.fillStyle = '#121019'; x.fillRect(14, 30, W - 28, 150);
  // estrelinhas de fundo
  const R = mulberry32(info.id * 3 + 1);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.1 + R() * 0.3})`; x.fillRect(14 + (R() * (W - 28)) | 0, 30 + (R() * 150) | 0, 1, 1); }
  x.font = '8px "Press Start 2P", monospace'; x.textBaseline = 'top';
  x.fillStyle = '#77728a'; x.fillText('#' + String(info.id).padStart(3, '0'), 14, 14);
  x.fillStyle = rc; const rl = RARITY[info.rarity].label; x.fillText(rl, W - 14 - x.measureText(rl).width, 14);
  try {
    const img = await loadImg(info.src, !info.src.startsWith('data:'));
    x.imageSmoothingEnabled = false; x.drawImage(img, (W - 144) / 2, 34, 144, 144);
  } catch { x.fillStyle = '#3d3a4a'; x.font = '24px "Press Start 2P", monospace'; x.fillText('?', W / 2 - 12, 92); x.font = '8px "Press Start 2P", monospace'; }
  // nome
  x.fillStyle = info.shiny ? '#fff3c4' : '#f4f1ea'; x.font = '12px "Press Start 2P", monospace';
  const nm = info.name.length > 16 ? info.name.slice(0, 15) + '…' : info.name;
  x.fillText(nm, (W - x.measureText(nm).width) / 2, 192);
  x.font = '8px "Press Start 2P", monospace';
  let sub = info.original ? 'criatura original' : 'pokémon';
  if (info.shiny) sub = '✦ shiny · ' + sub;
  x.fillStyle = info.shiny ? '#ffd34d' : '#77728a'; x.fillText(sub, (W - x.measureText(sub).width) / 2, 210);
  // tipos
  const chips = info.types.map(t => TYPES[t] || [nice(t), '#888']);
  x.font = '7px "Press Start 2P", monospace';
  const ws = chips.map(([l]) => x.measureText(l.toUpperCase()).width + 12);
  let cx = (W - ws.reduce((a, b) => a + b, 0) - (chips.length - 1) * 8) / 2;
  chips.forEach(([l, col], i) => {
    x.fillStyle = col; x.fillRect(cx + 1, 226, ws[i] - 2, 14); x.fillRect(cx, 227, ws[i], 12);
    x.fillStyle = textOn(col); x.fillText(l.toUpperCase(), cx + 6, 230); cx += ws[i] + 8;
  });
  // atributos
  if (info.stats) {
    let y = 254;
    for (const k of ['hp', 'atk', 'def', 'spd']) {
      x.fillStyle = '#77728a'; x.fillText(STAT_LABEL[k], 22, y + 1);
      x.fillStyle = '#1d1a28'; x.fillRect(64, y, 150, 8);
      x.fillStyle = rc; x.fillRect(64, y, Math.round(clamp(info.stats[k] / 150, 0.03, 1) * 30) * 5, 8);
      x.fillStyle = '#f4f1ea'; x.fillText(String(info.stats[k]), 222, y + 1);
      y += 16;
    }
  }
  if (info.desc) {
    x.fillStyle = '#9a96ad'; x.font = '6px "Press Start 2P", monospace';
    const words = info.desc.split(' '); let line = '', y = 324;
    for (const w of words) {
      if (x.measureText(line + w).width > W - 36) { x.fillText(line.trim(), 18, y); y += 10; line = ''; if (y > 350) break; }
      line += w + ' ';
    }
    if (y <= 350) x.fillText(line.trim(), 18, y);
  }
  x.fillStyle = '#3d3a4a'; x.font = '6px "Press Start 2P", monospace';
  const ft = 'PIXELMON BOX · ' + new Date().toLocaleDateString('pt-BR');
  x.fillText(ft, (W - x.measureText(ft).width) / 2, H - 16);
  // amplia 2× sem suavizar
  const big = document.createElement('canvas'); big.width = W * 2; big.height = H * 2;
  const bx = big.getContext('2d'); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, W * 2, H * 2);
  return big;
}
export let shareCanvas = null;
export async function openShare(info) {
  el.shareStatus.textContent = 'gerando cartão…';
  el.shareImg.removeAttribute('src');
  openModal(el.shareModal, el.shareClose);
  try {
    shareCanvas = await makeShareCard(info);
    el.shareImg.src = shareCanvas.toDataURL('image/png');
    el.shareImg.alt = `Cartão de ${info.name}`;
    el.shareStatus.textContent = 'Dica: se o download não começar, toque e segure a imagem (ou clique com o botão direito) para salvar.';
    state.stats.shares++; saveStats(); checkAchievements();
  } catch { el.shareStatus.textContent = 'Não consegui gerar o cartão desta vez.'; }
}
el.shareCopy.addEventListener('click', async () => {
  if (!shareCanvas) return;
  try {
    const blob = await new Promise(r => shareCanvas.toBlob(r, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    el.shareStatus.textContent = 'Imagem copiada! Cole onde quiser.';
  } catch { el.shareStatus.textContent = 'Seu navegador não deixou copiar a imagem. Toque e segure (ou clique com o botão direito) para salvar.'; }
});
// download: na página publicada usa o recurso de downloads do Claude; no arquivo local, um link comum
export let dlCap = null;
if (window.claude?.use) window.claude.use('downloads').then(d => { dlCap = d; }).catch(() => {});
el.shareDl.addEventListener('click', async () => {
  if (!shareCanvas) return;
  const blob = await new Promise(r => shareCanvas.toBlob(r, 'image/png'));
  if (dlCap) {
    try { await dlCap.save({ filename: 'cartao-pixelmon-box.png', data: blob }); el.shareStatus.textContent = 'Cartão salvo!'; }
    catch (e) { el.shareStatus.textContent = e?.code === 'declined' ? 'Download cancelado.' : 'Não deu para baixar aqui. Toque e segure a imagem para salvar.'; }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'cartao-pixelmon-box.png';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
});
el.shareClose.addEventListener('click', () => closeModal(el.shareModal));
export function shareInfoFor(tab, id, m) {
  if (tab === 'o') {
    const b = creatureBase(id), e = dex.o[id], ev = m ? m.evolved : !!e?.ev, shiny = m ? m.shiny : false;
    const sh = creatureSheet(id, ev);
    return { id, original: true, name: e?.nick || (ev ? evoName(b) : b.name), types: b.types, rarity: b.rarity, shiny,
      src: m ? m.src : creatureThumb(id, shiny, ev ? 2 : 1), stats: sh.stats, desc: sh.desc };
  }
  const e = dex.p[id] || {};
  return { id, original: false, name: e.nick || m?.name || e.n, types: m?.types || e.t || [], rarity: m?.rarity || e.r || 'comum',
    shiny: m ? m.shiny : false, src: m ? m.src : (e.src || e.ss), stats: apiSheet(e).stats };
}
