/* Pokébola em pixel art: mapa 32×32, paletas, bolas especiais e sombra. */
import { el } from './dom.js';
import { hexToRgb, mixRgb, pack } from './utils.js';

/* =========================================================
   POKÉBOLA EM PIXEL ART (grade 32×32, paleta indexada)
   ========================================================= */
export const I = { T:0, OUT:1, BAND:2, RH:3, R:4, RS:5, RD:6, W:7, WS:8, WD:9, BE:10, BC:11, BR:12, LIGHT:13, INNER:14 };
// Paleta-base: 1 contorno, 1 faixa, 4 vermelhos, 3 brancos, 3 do botão, luz interna, interior da tampa
export const BASE = ['#000000','#1b1626','#0c0a12','#ff8f7e','#e8313f','#a91d39','#5f0f2a',
              '#ffffff','#d4d1e2','#8a86a3','#aaa7bf','#f6f4fb','#e6e3ef','#fff1b0','#2a2438',
              '#ffffff','#ffffff'];   // 15–16: detalhes das bolas especiais
export const DECO = 15, DECO2 = 16;
export const GLOW = { [I.BE]:'#ffcf4a', [I.BC]:'#ffffff', [I.BR]:'#fff7d8' };


/** Gera paletas pré-calculadas: 4 níveis de brilho + "piscada" branca. */
export function buildPalettes(over = {}) {
  const base = BASE.map((h, i) => hexToRgb(over[i] || h));
  const out = {};
  for (let lv = 0; lv <= 3; lv++) {
    out[lv] = base.map((c, i) => i === 0 ? 0 : pack(GLOW[i] ? mixRgb(c, hexToRgb(GLOW[i]), lv / 3) : c));
  }
  out.blink = base.map((c, i) => i === 0 ? 0 : pack([I.BE, I.BC, I.BR].includes(i) ? [255,255,255] : c));
  return out;
}
export const PALETTES = buildPalettes();

/** Mapa base 32×32: cada pixel recebe um índice de paleta. Luz vem do alto à esquerda. */
export const MAP = (() => {
  const m = new Uint8Array(32 * 32);
  const L = [-0.45, -0.6, 0.66];
  // escolhe tom com "dithering" xadrez perto dos limiares (visual pixel art clássico)
  const pick = (val, th, tones, x, y) => {
    for (let i = 0; i < th.length; i++) {
      if (Math.abs(val - th[i]) < 0.035) return ((x + y) & 1) ? tones[i] : tones[i + 1];
      if (val > th[i]) return tones[i];
    }
    return tones[tones.length - 1];
  };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy);
    let c = I.T;
    if (d <= 15.5) {
      if (d > 14.4) c = I.OUT;
      else if (d <= 5.6) {                       // botão central
        c = d > 4.6 ? I.BAND : d > 2.6 ? I.BR : d > 1.7 ? I.BE : I.BC;
      } else if (Math.abs(dy) < 1.6) c = I.BAND; // faixa preta
      else {
        const nx = dx / 15, ny = dy / 15, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lum = nx * L[0] + ny * L[1] + nz * L[2];
        c = dy < 0
          ? pick(lum, [0.93, 0.55, 0.2], [I.RH, I.R, I.RS, I.RD], x, y)
          : pick(lum, [0.5, 0.12], [I.W, I.WS, I.WD], x, y);
        // reflexo especular no topo
        if (dy < 0 && (Math.hypot(x + 0.5 - 10, y + 0.5 - 7.5) < 1.6 || (x === 13 && y === 5))) c = I.W;
      }
    }
    m[y * 32 + x] = c;
  }
  return m;
})();

/* ---------- Bolas especiais (designs originais) ----------
   Cada uma troca os tons da metade de cima, ganha um detalhe próprio
   e altera as chances do sorteio. */
export const BALLS = {
  padrao:  { name: 'Pokébola',     desc: 'A clássica. Chances normais.',
             top: null, shiny: 1 / 50, mult: {}, escape: 1, need: null },
  aurora:  { name: 'Bola Aurora',  desc: 'Faixas de luz verde-água. Mais criaturas raras e menos fugas.',
             top: ['#a6f7e6', '#2fc6b0', '#1b8a85', '#0e4f55'], deco: ['#e6fff9', '#7ff0dc'],
             shiny: 1 / 45, mult: { rara: 1.7 }, escape: 0.8, need: { kind: 'opens', n: 10, text: 'abra 10 vezes' } },
  lunar:   { name: 'Bola Lunar',   desc: 'Céu estrelado no topo. Mais épicas e lendárias, ainda melhor à noite.',
             top: ['#aaa3ff', '#5b4fd6', '#3a2f9e', '#211a5e'], deco: ['#fff6c4', '#ffd34d'],
             shiny: 1 / 40, mult: { epica: 1.8, lendaria: 1.5 }, night: 1.6, escape: 0.7, need: { kind: 'unique', n: 30, text: 'registre 30 criaturas' } },
  dourada: { name: 'Bola Dourada', desc: 'Ouro maciço. Shiny 1 em 15, lendárias ×3 e nunca falha.',
             top: ['#fff6c2', '#ffcf3f', '#d99a1a', '#8a5a0c'], deco: ['#fffbe6', '#ffe58a'],
             shiny: 1 / 15, mult: { epica: 1.5, lendaria: 3 }, escape: 0, need: { kind: 'unique', n: 60, text: 'registre 60 criaturas' } },
};
export function buildBallMap(id) {
  const m = MAP.slice();
  const isTop = (x, y) => [I.RH, I.R, I.RS, I.RD].includes(MAP[y * 32 + x]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    if (!isTop(x, y)) continue;
    if (id === 'aurora' && (y === 6 || y === 10)) m[y * 32 + x] = ((x + y) % 5 === 0) ? DECO2 : DECO;
    if (id === 'dourada' && ((x - y + 64) % 9 === 0 || (x - y + 64) % 9 === 1) && y > 3) m[y * 32 + x] = DECO;
  }
  if (id === 'lunar') for (const [x, y, c] of [[9,4,DECO],[20,5,DECO2],[14,9,DECO],[24,10,DECO],[6,10,DECO2],[18,2,DECO],[11,12,DECO2],[22,12,DECO],[27,8,DECO]])
    if (isTop(x, y)) m[y * 32 + x] = c;
  return m;
}
export const BALL_ART = {};
for (const [id, b] of Object.entries(BALLS)) {
  const over = {};
  if (b.top) [I.RH, I.R, I.RS, I.RD].forEach((k, i) => { over[k] = b.top[i]; });
  if (b.deco) { over[DECO] = b.deco[0]; over[DECO2] = b.deco[1]; }
  BALL_ART[id] = { map: buildBallMap(id), pal: buildPalettes(over) };
}
export const ballArt = { map: MAP, pal: PALETTES };   // bola em uso (trocada pelo seletor)

export const bctx = el.canvas.getContext('2d');
export const bImg = bctx.createImageData(32, 44);
export const bBuf = new Uint32Array(bImg.data.buffer);
export const idx = new Uint8Array(32 * 44);
export const HEAD = 12; // linhas livres acima da bola (para a tampa abrir)

/** Desenha a bola (tampa + corpo) no canvas 32×44, de acordo com a abertura da tampa. */
export function renderBall(lid, palette) {
  idx.fill(0);
  const put = (x, y, c) => { if (c && x >= 0 && x < 32 && y >= 0 && y < 44) idx[y * 32 + x] = c; };
  // corpo (linhas 16–31 do mapa)
  for (let y = 16; y < 32; y++) for (let x = 0; x < 32; x++) put(x, y + HEAD, ballArt.map[y * 32 + x]);

  if (lid <= 0) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) put(x, y + HEAD, ballArt.map[y * 32 + x]);
  } else {
    const o = Math.min(lid, 9);
    // luz dentro da bola (elipse na abertura)
    const cy = HEAD + 16, ry = Math.min(4, Math.ceil(o / 2)) + 0.5;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = 0; x < 32; x++) {
      const e = ((x + 0.5 - 16) / 13.5) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (e <= 1) put(x, y, e > 0.72 ? I.OUT : e < 0.3 ? I.W : I.LIGHT);
    }
    // tampa: sobe `o` px e achata (gira para trás na dobradiça)
    const h = Math.max(7, 16 - o), bottom = HEAD + 16 - o, top = bottom - h;
    for (let r = 0; r < h; r++) {
      const src = Math.floor(r * 16 / h);
      for (let x = 0; x < 32; x++) put(x, top + r, ballArt.map[src * 32 + x]);
    }
    // parte de baixo (interior) da tampa
    const ury = Math.ceil(o / 3) + 0.5;
    for (let y = bottom; y <= bottom + ury; y++) for (let x = 0; x < 32; x++) {
      const e = ((x + 0.5 - 16) / 13.5) ** 2 + ((y + 0.5 - bottom) / ury) ** 2;
      if (e <= 1) put(x, y, e > 0.7 ? I.OUT : I.INNER);
    }
  }
  for (let i = 0; i < idx.length; i++) bBuf[i] = palette[idx[i]];
  bctx.putImageData(bImg, 0, 0);
}

/* Sombra pixelada (encolhe quando a bola sobe) */
export const sctxShadow = el.shadow.getContext('2d');
export function renderShadow(lift) {
  const c = sctxShadow;
  c.clearRect(0, 0, 32, 6);
  const rx = 11.5 - lift * 1.2, ry = 2.2;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 32; x++) {
    const e = ((x + 0.5 - 16) / rx) ** 2 + ((y + 0.5 - 3) / ry) ** 2;
    if (e > 1) continue;
    if (e > 0.6 && ((x + y) & 1)) continue;       // borda com dithering
    c.fillStyle = e < 0.35 ? '#1d1a28' : '#121019';
    c.fillRect(x, y, 1, 1);
  }
}

/* Favicon gerado a partir do próprio mapa */
(function favicon() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), im = x.createImageData(32, 32), b = new Uint32Array(im.data.buffer);
  for (let i = 0; i < 1024; i++) b[i] = PALETTES[0][MAP[i]];
  x.putImageData(im, 0, 0);
  const l = document.createElement('link'); l.rel = 'icon'; l.href = c.toDataURL(); document.head.appendChild(l);
})();
