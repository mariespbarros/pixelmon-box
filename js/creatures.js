/* Gerador procedural de criaturas originais, nomes, raridades e sorteio. */
import { BALLS } from './ball.js';
import { dex } from './pokedex.js';
import { settings } from './settings.js';
import { TYPES } from './types.js';
import { clamp, hexToRgb, hsl, mulberry32, rgbToHsl } from './utils.js';
import { timeOfDay, weatherNow } from './world.js';

/* =========================================================
   GERADOR DE CRIATURAS ORIGINAIS (modo offline)
   Cada número (#001–#999) é uma semente que define:
   · arquétipo de corpo (10 formatos: bolota, bípede, quadrúpede,
     ave, peixe, serpente, fantasma, inseto, golem, geleia, planta)
   · enfeites ligados ao tipo (chama, barbatana, folha, raio,
     cristais, joia, chifres, asas, antenas, máscara, faixa…)
   · olhos, boca, padrão do corpo, tamanho, paleta e nome.
   Tudo desenhado numa grade 32×32 com contorno, luz e sombra.
   ========================================================= */
export const TYPE_KEYS = Object.keys(TYPES).filter(k => k !== 'stellar' && k !== 'unknown');

/* Cores dos enfeites: [luz, base, sombra] */
export const ACCENTS = {
  flame:  ['#fff3a0', '#ff9a2e', '#e2451f'], flameCore: ['#ffffff', '#ffe066', '#ffb52e'],
  fin:    ['#e0f8ff', '#7fd0ff', '#3f8ed8'], leaf: ['#b8f59a', '#5cc95a', '#2f8a3e'],
  volt:   ['#fffbd0', '#ffd93b', '#d79a12'], ice: ['#ffffff', '#bdf1ff', '#79c3e0'],
  gem:    ['#ffe0f0', '#ff5fa8', '#b8306f'], bone: ['#fffaf0', '#efe3c2', '#b9a77c'],
  mask:   ['#3a3150', '#2a2238', '#1a1526'], band: ['#ff8a8a', '#e2384a', '#9e1f33'],
  steel:  ['#ffffff', '#c5c9d6', '#7d8297'], toxic: ['#e7b5ff', '#b05ad6', '#73309a'],
  beak:   ['#ffe9a8', '#ffb43b', '#c9771c'], feather: ['#ffffff', '#ecebf5', '#b9b6cc'],
  petal:  ['#ffe6f2', '#ff9fcf', '#d8609c'], rock: ['#d9cfb4', '#a9997a', '#6f6450'],
  wisp:   ['#f1e6ff', '#b99cff', '#7b5bd6'], fairyW: ['#ffffff', '#ffd6ee', '#e6a3c8'],
};

export const ARCH_POOL = ['blob', 'blob', 'biped', 'biped', 'quad', 'quad', 'bird', 'fish', 'serpent', 'ghost', 'bug', 'golem', 'slime', 'plant',
                   'turtle', 'crab', 'mushroom', 'octo', 'bat', 'crystal', 'cloud', 'egg'];
export const ARCH_BIAS = {
  flying: ['bird', 'bird', 'bat', 'cloud'], water: ['fish', 'serpent', 'crab', 'octo', 'turtle'], ghost: ['ghost', 'ghost', 'bat'],
  bug: ['bug', 'bug', 'crab'], rock: ['golem', 'crystal', 'turtle'], steel: ['golem', 'crystal'], grass: ['plant', 'mushroom', 'turtle'],
  poison: ['slime', 'serpent', 'mushroom', 'octo'], dragon: ['serpent', 'quad', 'biped'], fighting: ['biped', 'biped', 'golem'],
  fire: ['quad', 'biped', 'egg'], electric: ['quad', 'blob', 'cloud'], ground: ['quad', 'golem', 'turtle'], ice: ['crystal', 'slime', 'cloud'],
  fairy: ['blob', 'cloud', 'egg'], psychic: ['crystal', 'octo', 'ghost'], dark: ['bat', 'quad', 'biped'], normal: ['blob', 'quad', 'egg'],
};
export const archPoolFor = (t1, t2) => [...ARCH_POOL, ...(ARCH_BIAS[t1] || []), ...(ARCH_BIAS[t1] || []), ...(ARCH_BIAS[t2] || [])];
/** Mesmo sorteio que drawCreature faz primeiro: descobre o formato sem desenhar. */
export function archFor(seed, types) { const pool = archPoolFor(types[0], types[1]); return pool[Math.floor(mulberry32(seed * 9973 + 17)() * pool.length)]; }

export function drawCreature(seed, shiny, typeKeys, rarity = 'comum', stage = 1) {
  const R = mulberry32(seed * 9973 + 17);
  const rnd = (a, b) => a + R() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const chance = p => R() < p;
  const W = 32, H = 32;
  const g = new Uint8Array(W * H);      // corpo
  const acc = new Uint8Array(W * H);    // enfeites (índice de cor)
  const t1 = typeKeys[0], t2 = typeKeys[1];
  const has = t => t1 === t || t2 === t;

  // ---------- primitivas de desenho ----------
  const inb = (x, y) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1;
  const set = (x, y, v = 1) => { x = Math.round(x); y = Math.round(y); if (inb(x, y)) g[y * W + x] = v; };
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : g[y * W + x];
  const ell = (cx, cy, rx, ry, v = 1) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, v);
  };
  const rect = (x0, y0, x1, y1, v = 1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v); };
  const line = (x0, y0, x1, y1, w = 1, fn = set) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      for (let k = 0; k < w; k++) fn(x + k, y);
    }
  };
  // enfeites
  const accIds = [];
  const accId = name => { let i = accIds.indexOf(name); if (i < 0) { accIds.push(name); i = accIds.length - 1; } return i + 1; };
  const aset = (name, behind = false) => {
    const id = accId(name);
    return (x, y) => { x = Math.round(x); y = Math.round(y); if (!inb(x, y)) return; if (behind && g[y * W + x]) return; acc[y * W + x] = id; };
  };
  const aell = (name, cx, cy, rx, ry, behind) => {
    const p = aset(name, behind);
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) p(x, y);
  };
  const tri = (name, x0, y0, x1, y1, x2, y2, behind) => {   // triângulo preenchido
    const p = aset(name, behind);
    const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    const s = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = s(px, py, x0, y0, x1, y1), d2 = s(px, py, x1, y1, x2, y2), d3 = s(px, py, x2, y2, x0, y0);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) p(x, y);
    }
  };
  const flame = (x, y, big = 1) => {
    aell('flame', x, y - 2 * big, 2.2 * big, 3.4 * big);
    aell('flameCore', x, y - 1.2 * big, 1.1 * big, 1.8 * big);
  };

  // ---------- 1) arquétipo (com viés pelo tipo) ----------
  const archPool = archPoolFor(t1, t2);
  const arch = archPool[Math.floor(R() * archPool.length)];
  const sz = (rarity === 'lendaria' ? rnd(1.08, 1.18) : rarity === 'epica' ? rnd(0.95, 1.12) : rnd(0.82, 1.12)) * (stage === 2 ? 1.1 : 1);

  // f = "âncoras" do rosto e dos enfeites. side = vista lateral (olhando para a esquerda; espelha no fim)
  let f = { side: false, eyeY: 14, eyeDx: 2, mouthY: 17, top: 8, tail: null, feet: [], back: 14, cx: 16, floats: false, wingY: 16, wingX: 10 };

  switch (arch) {
    case 'blob': {
      const cy = rnd(19, 22), rx = rnd(6, 10.5) * sz, ry = rnd(6, 8.5) * sz;
      ell(16, cy, rx, ry);
      for (let y = 0; y < H; y++) for (let x = 1; x < 16; x++) {               // borda orgânica
        const e = ((x + 0.5 - 16) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (e > 0.85 && e < 1.25 && chance(0.35)) { set(x, y, e < 1 ? 0 : 1); }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < 16; x++) g[y * W + 31 - x] = g[y * W + x];
      const footX = Math.round(16 - rx * 0.5), b = Math.round(cy + ry);
      rect(footX - 1, b - 1, footX + 1, Math.min(29, b + 1)); rect(31 - footX - 1, b - 1, 31 - footX + 1, Math.min(29, b + 1));
      f = { ...f, eyeY: Math.round(cy - ry * 0.3), eyeDx: ri(2, 3), mouthY: Math.round(cy - ry * 0.3) + 3, top: Math.round(cy - ry),
            tail: { x: 16 + rx - 1, y: cy + 1, dir: 1 }, feet: [footX, 31 - footX], footY: Math.min(29, b + 1), back: cy - ry * 0.5,
            belly: [16, cy + 1.5, rx * 0.55, ry * 0.6], wingX: 16 - rx + 2, wingY: cy - 2 };
      break;
    }
    case 'biped': {
      const hr = rnd(4.5, 6.5) * sz, by = rnd(20, 22), brx = rnd(4.5, 7) * sz, bry = rnd(4.5, 6);
      const hy = by - bry - hr * 0.55;
      ell(16, by, brx, bry); ell(16, hy, hr * rnd(1, 1.15), hr);
      const ax = 16 - brx, ay = by - 2;                                           // braços
      line(ax + 1, ay, ax - 2, ay + rnd(1, 4), 2); line(31 - ax - 2, ay, 31 - ax + 1, ay + rnd(1, 4), 2);
      const lx = Math.round(16 - brx * 0.5), lb = Math.min(29, Math.round(by + bry + 3));   // pernas
      rect(lx - 1, Math.round(by + bry - 2), lx + 1, lb); rect(31 - lx - 1, Math.round(by + bry - 2), 31 - lx + 1, lb);
      f = { ...f, eyeY: Math.round(hy), eyeDx: ri(1, 3), mouthY: Math.round(hy) + 3, top: Math.round(hy - hr),
            tail: { x: 16 + brx - 1, y: by + 2, dir: 1 }, feet: [lx, 31 - lx], footY: lb, back: by - 2,
            belly: [16, by + 0.5, brx * 0.55, bry * 0.65], wingX: 16 - brx + 1, wingY: by - 3, headR: hr, headY: hy };
      break;
    }
    case 'quad': {
      const bx = 18, by = rnd(19, 21), brx = rnd(7.5, 10) * sz, bry = rnd(4.5, 6);
      const hx = rnd(7, 9), hy = by - rnd(5, 7), hr = rnd(4, 5.2);
      ell(bx, by, brx, bry); ell(hx, hy, hr, hr * 0.95); ell((hx + bx) / 2 - 1, (hy + by) / 2 + 1, 3.5, 3.5);
      ell(hx - hr * 0.8, hy + 1.5, 2.2, 1.8);                                    // focinho
      const lb = Math.min(29, Math.round(by + bry + 3)), legT = Math.round(by + 1);
      for (const lx of [bx - brx + 3, bx - brx + 6, bx + brx - 6, bx + brx - 3]) rect(Math.round(lx) - 1, legT, Math.round(lx), lb);
      f = { ...f, side: true, eyeX: Math.round(hx - 1), eyeY: Math.round(hy - 1), mouthX: Math.round(hx - hr), mouthY: Math.round(hy + 2),
            top: Math.round(hy - hr), topX: Math.round(hx + 1), tail: { x: bx + brx - 1, y: by - 2, dir: 1 },
            feet: [], footY: lb, back: by - bry + 1, belly: [bx, by + 2, brx * 0.6, bry * 0.4], wingX: bx, wingY: by - bry, headR: hr, headX: hx, headY: hy };
      break;
    }
    case 'bird': {
      const cy = rnd(17, 20), r = rnd(6, 8) * sz;
      ell(16, cy, r, r * rnd(0.95, 1.1));
      const up = chance(0.5);
      tri('feather', 16 - r + 2, cy - 2, 16 - r - 5, up ? cy - 8 : cy + 1, 16 - r + 1, cy + 5);
      tri('feather', 16 + r - 2, cy - 2, 16 + r + 5, up ? cy - 8 : cy + 1, 16 + r - 1, cy + 5);
      tri('feather', 13, cy + r - 1, 16, cy + r + 4, 19, cy + r - 1);           // cauda
      const ey = Math.round(cy - r * 0.35);
      tri('beak', 14.2, ey + 2, 17.8, ey + 2, 16, ey + 5);
      const fy = Math.min(29, Math.round(cy + r + 2));
      const fb = aset('beak'); for (const fx of [13, 18]) { fb(fx, fy - 1); fb(fx, fy); fb(fx + 1, fy); fb(fx - 1, fy); }
      if (chance(0.7)) { line(16, cy - r, 16, cy - r - 3, 1); line(15, cy - r, 14, cy - r - 2, 1); }   // crista
      f = { ...f, eyeY: ey, eyeDx: ri(2, 3), mouthY: -1, top: Math.round(cy - r - 2), tail: null, feet: [], back: cy - r * 0.5,
            belly: [16, cy + 2, r * 0.55, r * 0.55], wingX: -1, footY: fy };
      break;
    }
    case 'fish': {
      const cy = rnd(15, 18), rx = rnd(7.5, 9.5) * sz, ry = rnd(5, 7) * sz, cx = 14;
      ell(cx, cy, rx, ry);
      tri('fin', cx + rx - 2, cy, cx + rx + 6, cy - ry, cx + rx + 6, cy + ry);   // cauda
      tri('fin', cx - 2, cy - ry + 1, cx + 3, cy - ry - 4, cx + 5, cy - ry + 1); // dorsal
      tri('fin', cx, cy + 2, cx + 4, cy + 6, cx + 1, cy + 6);                     // peitoral
      f = { ...f, side: true, floats: true, eyeX: Math.round(cx - rx * 0.55), eyeY: Math.round(cy - 2), mouthX: Math.round(cx - rx + 1), mouthY: Math.round(cy + 1.5),
            top: Math.round(cy - ry), topX: cx - 3, tail: null, feet: [], back: cy - ry + 1, belly: [cx, cy + ry * 0.55, rx * 0.8, ry * 0.4], wingX: -1 };
      break;
    }
    case 'serpent': {
      const amp = rnd(3, 6), ph = rnd(0, 1);
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, x = 8 + t * 18, y = 21 - Math.sin((t + ph) * Math.PI * 1.6) * amp + t * 3;
        ell(x, y, 3.6 - t * 1.8, 3.6 - t * 1.8);
      }
      const hy = 21 - Math.sin(ph * Math.PI * 1.6) * amp - 5;
      ell(8, hy, 4.6, 4); ell(4.5, hy + 1.2, 2, 1.6); line(8, hy, 9, hy + 5, 3);
      f = { ...f, side: true, eyeX: 7, eyeY: Math.round(hy - 1), mouthX: 3, mouthY: Math.round(hy + 2), top: Math.round(hy - 4), topX: 9,
            tail: { x: 26, y: 24 - Math.sin((1 + ph) * Math.PI * 1.6) * amp, dir: 1 }, feet: [], back: hy, belly: null, wingX: -1, headY: hy };
      break;
    }
    case 'ghost': {
      const cy = rnd(13, 15), r = rnd(7, 9) * sz;
      ell(16, cy, r, r); rect(Math.round(16 - r), Math.round(cy), Math.round(15 + r), Math.round(cy + r + 2));
      const bot = Math.round(cy + r + 2);
      for (let x = 0; x < W; x++) if (((x >> 1) & 1)) { set(x, bot, 0); set(x, bot - 1, chance(0.5) ? 0 : get(x, bot - 1)); }
      line(16 - r, cy + 3, 16 - r - 3, cy + 1, 2); line(15 + r, cy + 3, 15 + r + 3, cy + 1, 2);
      f = { ...f, floats: true, eyeY: Math.round(cy - 1), eyeDx: ri(2, 3), mouthY: Math.round(cy + 3), top: Math.round(cy - r),
            tail: null, feet: [], back: cy - r * 0.5, belly: null, wingX: 16 - r + 1, wingY: cy };
      break;
    }
    case 'bug': {
      const ay = rnd(22, 24), ar = rnd(5, 6.5) * sz;
      ell(16, ay, ar, ar * 0.85); ell(16, ay - ar - 1.5, 3.8, 3); ell(16, ay - ar - 6, 4.2, 3.6);
      const ty = ay - ar - 1.5;
      for (const [dx, dy] of [[-1, -1], [0, 1], [1, 3]]) { line(12, ty + dy, 8 + dx, ty + dy + 3, 1); line(19, ty + dy, 23 - dx, ty + dy + 3, 1); }
      f = { ...f, eyeY: Math.round(ay - ar - 6.5), eyeDx: ri(1, 2), mouthY: Math.round(ay - ar - 3.5), top: Math.round(ay - ar - 9.5),
            tail: null, feet: [], back: ay - 2, stripes: true, belly: null, wingX: 12, wingY: ty, bugHead: true };
      break;
    }
    case 'golem': {
      const tw = ri(6, 8), ty0 = ri(12, 14), ty1 = ri(22, 24);
      rect(16 - tw, ty0, 15 + tw, ty1);
      const hw = ri(3, 5); rect(16 - hw, ty0 - ri(5, 7), 15 + hw, ty0);
      rect(16 - tw - 4, ty0 + 1, 16 - tw - 1, ty1 - 2); rect(15 + tw + 1, ty0 + 1, 15 + tw + 4, ty1 - 2);
      rect(16 - tw + 1, ty1, 16 - tw + 4, Math.min(29, ty1 + 4)); rect(15 + tw - 4, ty1, 15 + tw - 1, Math.min(29, ty1 + 4));
      for (const [x, y] of [[16 - tw, ty0], [15 + tw, ty0], [16 - tw - 4, ty0 + 1], [15 + tw + 4, ty0 + 1]]) set(x, y, 0);
      const hy = ty0 - 3;
      f = { ...f, eyeY: hy, eyeDx: Math.min(hw - 2, ri(1, 2)), mouthY: hy + 2, top: ty0 - 6, tail: null, feet: [16 - tw + 2, 15 + tw - 2],
            footY: Math.min(29, ty1 + 4), back: ty0 + 3, cracks: true, belly: chance(0.5) ? [16, (ty0 + ty1) / 2 + 1, tw * 0.55, (ty1 - ty0) * 0.35] : null,
            wingX: 16 - tw, wingY: ty0 + 1 };
      break;
    }
    case 'slime': {
      const r = rnd(8, 11) * sz, base = 27;
      ell(16, base - r * 0.55, r, r * 0.8); rect(Math.round(16 - r + 1), Math.round(base - r * 0.55), Math.round(15 + r - 1), base);
      for (let x = Math.round(16 - r + 2); x < 15 + r - 1; x++) if (chance(0.18)) { set(x, base + 1); if (chance(0.5)) set(x, base + 2); }
      const ey = Math.round(base - r * 0.55);
      f = { ...f, eyeY: ey - 1, eyeDx: ri(2, 4), mouthY: ey + 2, top: Math.round(base - r * 1.35), tail: null, feet: [], back: ey - 2,
            belly: null, wingX: 16 - r + 2, wingY: ey - 3, shine: true };
      break;
    }
    case 'turtle': {                                    // casco arredondado, de perfil
      const cx = 18, cy = rnd(18, 20), rx = rnd(8, 9.5) * sz, ry = rnd(6, 7.5);
      const shellP = aset('alt'), lineP = aset('altDark');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (y > cy + 1) continue;
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) ((x + 2 * y) % 7 === 0 || y === Math.round(cy + 1) ? lineP : shellP)(x, y);
      }
      ell(cx, cy + 2.5, rx, 2.6);
      const hx = cx - rx - 1.5, hy = cy - 1;
      ell(hx, hy, 3.6, 3.2); line(hx + 2, hy + 1, cx - rx + 3, cy + 1, 3);
      const lb = Math.min(29, Math.round(cy + 7));
      for (const lx of [cx - rx + 3, cx + rx - 4]) rect(Math.round(lx) - 1, Math.round(cy + 3), Math.round(lx) + 1, lb);
      f = { ...f, side: true, eyeX: Math.round(hx - 1), eyeY: Math.round(hy - 1), mouthX: Math.round(hx - 3), mouthY: Math.round(hy + 1.5),
            top: Math.round(cy - ry), topX: cx, tail: { x: cx + rx - 1, y: cy + 2, dir: 1 }, feet: [], footY: lb, back: cy - ry + 2,
            belly: null, wingX: cx, wingY: cy - ry, headX: hx, noPattern: true };
      break;
    }
    case 'crab': {                                      // corpo largo, pinças e olhos em hastes
      const cy = rnd(19, 21), rx = rnd(8, 10) * sz, ry = rnd(4.5, 5.5);
      ell(16, cy, rx, ry);
      for (const sgn of [-1, 1]) {
        const ax = 16 + sgn * (rx - 1), cxw = 16 + sgn * (rx + 2.5), cyw = cy - 6;
        line(ax, cy - 1, cxw - sgn, cyw + 2, 2);
        ell(cxw, cyw, 3, 3); set(cxw - sgn * 0.5, cyw - 3, 0); set(cxw, cyw - 2, 0); set(cxw - sgn, cyw - 2, 0);
        for (let k = 0; k < 3; k++) line(16 + sgn * (rx - 2 - k * 2.2), cy + ry - 1, 16 + sgn * (rx + 1 - k * 2.2), cy + ry + 3, 1);
        line(16 + sgn * 3.5, cy - ry + 1, 16 + sgn * 3.5, cy - ry - 3, 1);
        ell(15.5 + sgn * 4, cy - ry - 4, 2, 2);
      }
      f = { ...f, eyeY: Math.round(cy - ry - 4.5), eyeDx: 3, mouthY: Math.round(cy), top: Math.round(cy - ry - 6), tail: null, feet: [],
            footY: Math.round(cy + ry + 3), back: cy - 2, belly: [16, cy + 1.5, rx * 0.55, ry * 0.5], wingX: -1 };
      break;
    }
    case 'mushroom': {                                  // chapéu com pintas + tronquinho
      const capR = rnd(9, 11.5) * sz, capY = rnd(12, 14);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (y <= capY + 2 && ((x + 0.5 - 16) / capR) ** 2 + ((y + 0.5 - capY - 2) / (capR * 0.75)) ** 2 <= 1) set(x, y);
      const stem = aset('bone');
      const sw = rnd(4.5, 6), st = capY + 3, sb = Math.min(28, capY + 13);
      for (let y = st; y <= sb; y++) for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - 16) <= sw + (y > sb - 2 ? 1 : 0)) stem(x, y);
      for (let k = 0; k < ri(3, 6); k++) aell(chance(0.5) ? 'feather' : 'bone', 16 + rnd(-capR + 3, capR - 3), capY + rnd(-4, 1), rnd(1, 2), rnd(1, 1.6));
      const fp = aset('bone'); for (const fx of [16 - sw, 15 + sw]) { fp(fx, sb + 1); fp(fx + 1, sb + 1); }
      f = { ...f, eyeY: st + 3, eyeDx: ri(1, 2), mouthY: st + 6, top: Math.round(capY + 2 - capR * 0.75), tail: null, feet: [],
            footY: sb + 1, back: capY, belly: null, wingX: 16 - capR + 2, wingY: capY + 2, noPattern: true, faceOnAcc: true };
      break;
    }
    case 'octo': {                                      // cabeça grande + tentáculos
      const r = rnd(7, 9) * sz, cy = rnd(11, 13);
      ell(16, cy, r * rnd(0.95, 1.1), r);
      const n = ri(3, 4);
      for (let k = 0; k < n; k++) {
        const x0 = 16 - r * 0.75 + k * (r * 1.5 / (n - 1)), ph = rnd(0, 6);
        for (let i = 0; i <= 12; i++) { const y = cy + r * 0.6 + i, x = x0 + Math.sin(i / 3 + ph) * 1.5 + (x0 - 16) * i / 18; set(x, y); set(x + 1, y); }
      }
      f = { ...f, floats: true, eyeY: Math.round(cy + 1), eyeDx: ri(2, 3), mouthY: Math.round(cy + 5), top: Math.round(cy - r), tail: null, feet: [],
            back: cy - r * 0.4, belly: null, wingX: 16 - r + 1, wingY: cy, spotsLikely: true };
      break;
    }
    case 'bat': {                                       // corpinho + asas de membrana
      const cy = rnd(15, 17), r = rnd(4.5, 5.5) * sz;
      ell(16, cy, r, r);
      for (const sgn of [-1, 1]) {
        tri('altDark', 16 + sgn * (r - 1), cy - 2, 16 + sgn * 14, cy - 6, 16 + sgn * (r - 1), cy + 4, true);
        tri('alt', 16 + sgn * r, cy - 1, 16 + sgn * 13, cy - 4, 16 + sgn * 12, cy + 5, true);
        for (let k = 0; k < 3; k++) { const x = Math.round(16 + sgn * (r + 2 + k * 3)); if (inb(x, cy + 4 - k)) acc[Math.round(cy + 4 - k) * W + x] = 0; }
        for (let k = 0; k < 5; k++) set(16 + sgn * (2 + Math.min(k, 2) * 0.5), cy - r - k + 1 + (k > 3 ? 0 : 0));
      }
      const fy = Math.round(cy + r + 1); set(14, fy); set(17, fy);
      f = { ...f, floats: true, eyeY: Math.round(cy - 1), eyeDx: 1, mouthY: Math.round(cy + 2), top: Math.round(cy - r - 3), tail: null, feet: [],
            back: cy - r * 0.4, belly: [16, cy + 2, r * 0.6, r * 0.5], wingX: -1, fang: true };
      break;
    }
    case 'crystal': {                                   // corpo de cristal lapidado
      const cy = rnd(15, 17), w = rnd(6, 8) * sz, h = rnd(9, 11) * sz;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (Math.abs(x + 0.5 - 16) / w + Math.abs(y + 0.5 - cy) / h <= 1 && Math.abs(y + 0.5 - cy) < h * 0.85) set(x, y);
      const shard = chance(0.5) ? 'ice' : 'gem';
      for (const sgn of [-1, 1]) {
        const sx2 = 16 + sgn * (w + 3), sy2 = cy + rnd(-3, 3);
        for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) / 2 + Math.abs(y) / 3.2 <= 1) aset(shard)(sx2 + x, sy2 + y);
      }
      f = { ...f, floats: true, eyeY: Math.round(cy - 1), eyeDx: ri(1, 2), mouthY: Math.round(cy + 3), top: Math.round(cy - h * 0.85), tail: null, feet: [],
            back: cy - 3, belly: null, wingX: 16 - w + 2, wingY: cy, facets: true, noPattern: true };
      break;
    }
    case 'cloud': {                                     // nuvem fofinha
      const cy = rnd(16, 18), k = sz;
      ell(10, cy + 1, 5 * k, 4.2); ell(16, cy - 2, 6.5 * k, 5.5); ell(22, cy + 1, 5 * k, 4.2); ell(16, cy + 3, 10 * k, 3.6);
      if (chance(0.5)) ell(12, cy - 3, 3.5, 3);
      f = { ...f, floats: true, eyeY: Math.round(cy), eyeDx: ri(2, 3), mouthY: Math.round(cy + 3), top: Math.round(cy - 7.5), tail: null, feet: [],
            back: cy - 3, belly: null, wingX: 16 - 9, wingY: cy, noPattern: true };
      break;
    }
    case 'egg': {                                       // saindo da casca
      const cy = rnd(17, 19), rx = rnd(6, 7.5) * sz, ry = rnd(8, 9.5) * sz;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = (y + 0.5 < cy) ? 0.82 : 1;
        if (((x + 0.5 - 16) / (rx * k)) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y);
      }
      const shell = aset('feather'), crack = Math.round(cy + 1);
      for (let y = crack; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] && y >= crack + (((x >> 1) & 1) ? 0 : 2)) shell(x, y);
      const fy = Math.min(29, Math.round(cy + ry)); rect(12, fy - 1, 13, fy + 1); rect(18, fy - 1, 19, fy + 1);
      f = { ...f, eyeY: Math.round(cy - 3), eyeDx: ri(1, 2), mouthY: Math.round(cy - 0.5), top: Math.round(cy - ry), tail: null, feet: [12.5, 18.5],
            footY: fy + 1, back: cy - 4, belly: null, wingX: 16 - rx + 1, wingY: cy - 2 };
      break;
    }
    case 'plant': {
      const cy = rnd(20, 22), r = rnd(6, 8) * sz;
      ell(16, cy, r, r * 0.9);
      const lx = Math.round(16 - r * 0.45), b = Math.min(29, Math.round(cy + r * 0.9 + 1));
      rect(lx - 1, b - 1, lx, b); rect(31 - lx, b - 1, 31 - lx + 1, b);
      const top = Math.round(cy - r * 0.9);
      line(16, top, 16, top - 3, 1, aset('leaf'));
      if (chance(0.5)) { aell('leaf', 12, top - 3, 4, 2); aell('leaf', 20, top - 3, 4, 2); }
      else for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; aell('petal', 16 + Math.cos(a) * 3.5, top - 4 + Math.sin(a) * 3, 2.2, 2.2); }
      if (!acc[(top - 4) * W + 16] || accIds[acc[(top - 4) * W + 16] - 1] === 'petal') aell('volt', 16, top - 4, 1.6, 1.6);
      f = { ...f, eyeY: Math.round(cy - r * 0.2), eyeDx: ri(2, 3), mouthY: Math.round(cy - r * 0.2) + 3, top: top - 7, tail: null, feet: [lx, 31 - lx],
            footY: b, back: cy - r * 0.4, belly: [16, cy + 2, r * 0.5, r * 0.5], wingX: 16 - r + 1, wingY: cy - 2, plantTop: true };
      break;
    }
  }

  // ---------- 2) enfeites por tipo ----------
  const cx = f.side ? (f.topX ?? 16) : 16;
  const deco = (t) => {
    switch (t) {
      case 'fire':
        if (!f.plantTop) flame(cx, f.top + 1, 0.9);                       // chama na cabeça
        break;
      case 'water':
        if (f.side) tri('fin', cx - 2, f.top + 1, cx + 3, f.top - 3, cx + 4, f.top + 2);
        else { tri('fin', 16 - f.eyeDx - 5, f.eyeY - 1, 16 - f.eyeDx - 9, f.eyeY - 5, 16 - f.eyeDx - 7, f.eyeY + 2, true);
               tri('fin', 15 + f.eyeDx + 5, f.eyeY - 1, 15 + f.eyeDx + 9, f.eyeY - 5, 15 + f.eyeDx + 7, f.eyeY + 2, true); }
        break;
      case 'grass':
        if (!f.plantTop) { line(cx, f.top + 1, cx, f.top - 2, 1, aset('leaf')); aell('leaf', cx - 2.5, f.top - 2.5, 2.6, 1.4); aell('leaf', cx + 2.5, f.top - 2.5, 2.6, 1.4); }
        break;
      case 'electric': {                                                 // crista em zigue-zague
        const p = aset('volt'), x0 = cx - 1, y0 = f.top + 2;
        const pts = [[0, 0], [2, -2], [0, -4], [2, -6]];
        for (let i = 0; i < pts.length - 1; i++) line(x0 + pts[i][0], y0 + pts[i][1], x0 + pts[i + 1][0], y0 + pts[i + 1][1], 2, p);
        break;
      }
      case 'ice':
        for (const dx of f.side ? [-3, 1, 5] : [-5, 0, 5]) tri('ice', cx + dx - 1.5, f.top + 2, cx + dx + 1.5, f.top + 2, cx + dx, f.top - 3 - (dx === 0 || dx === 1 ? 2 : 0));
        break;
      case 'psychic': case 'fairy': {
        if (f.side) aell('gem', f.eyeX + 2, f.eyeY - 3, 1.2, 1.2);
        else { const gy = f.eyeY - 3; const p = aset('gem'); p(15, gy); p(16, gy); p(15, gy - 1); p(16, gy - 1); }
        if (t === 'fairy' && f.wingX > 0) { aell('fairyW', f.wingX - 2, f.wingY - 1, 3, 4, true); aell('fairyW', 31 - f.wingX + 2, f.wingY - 1, 3, 4, true); }
        break;
      }
      case 'dragon':
        if (f.side) { tri('bone', cx - 1, f.top + 1, cx + 4, f.top - 4, cx + 1, f.top + 2); }
        else { tri('bone', 16 - 4, f.top + 2, 16 - 7, f.top - 4, 16 - 2, f.top + 1); tri('bone', 15 + 4, f.top + 2, 15 + 7, f.top - 4, 15 + 2, f.top + 1); }
        if (f.wingX > 0 && !f.side) { tri('mask', f.wingX, f.wingY, f.wingX - 7, f.wingY - 7, f.wingX - 2, f.wingY + 5, true); tri('mask', 31 - f.wingX, f.wingY, 31 - f.wingX + 7, f.wingY - 7, 31 - f.wingX + 2, f.wingY + 5, true); }
        break;
      case 'flying':
        if (arch !== 'bird') {
          if (f.side) tri('feather', f.wingX - 2, f.wingY + 1, f.wingX + 4, f.wingY - 7, f.wingX + 5, f.wingY + 1);
          else if (f.wingX > 0) { tri('feather', f.wingX, f.wingY, f.wingX - 7, f.wingY - 5, f.wingX - 1, f.wingY + 5, true); tri('feather', 31 - f.wingX, f.wingY, 31 - f.wingX + 7, f.wingY - 5, 31 - f.wingX + 1, f.wingY + 5, true); }
        }
        break;
      case 'bug':
        {
          const p = aset('mask');
          const bx = f.side ? cx : 16;
          line(bx - 1, f.top + 1, bx - 4, f.top - 4, 1, p); line(bx + (f.side ? 1 : 0), f.top + 1, bx + (f.side ? 3 : 3), f.top - 4, 1, p);
          aell('volt', bx - 4, f.top - 4.5, 1, 1); aell('volt', bx + 3.5, f.top - 4.5, 1, 1);
        }
        break;
      case 'steel': {
        const p = aset('steel');
        for (const [x, y] of f.side ? [[cx + 6, f.back + 3], [cx + 10, f.back + 3]] : [[11, f.back + 2], [20, f.back + 2]]) { p(x, y); p(x + 1, y); p(x, y + 1); p(x + 1, y + 1); }
        break;
      }
      case 'rock':
        if (!f.side) { aell('rock', 10, f.back - 2, 2.5, 2); aell('rock', 22, f.back - 1, 2, 1.8); }
        else aell('rock', cx + 8, f.back - 1, 2.6, 2.2);
        break;
      case 'ghost':
        if (arch !== 'ghost' && f.tail) { const p = aset('wisp'); line(f.tail.x, f.tail.y, f.tail.x + 3, f.tail.y + 2, 2, p); aell('wisp', f.tail.x + 5, f.tail.y + 1, 2, 2); }
        break;
      case 'ground':
        if (f.feet.length) { const p = aset('bone'); for (const fx of f.feet) { p(fx - 1, f.footY + 1); p(fx + 1, f.footY + 1); } }
        break;
      case 'normal':
        if (!f.side && chance(0.6)) { line(16, f.top + 1, 15, f.top - 2, 1); line(17, f.top + 1, 18, f.top - 1, 1); }
        break;
    }
  };
  deco(t1); if (t2) deco(t2);
  // orelhas genéricas (bolota, bípede, quadrúpede) quando não houver nada no topo
  if (['blob', 'biped', 'quad', 'slime'].includes(arch) && chance(0.65) && !has('dragon') && !has('ice')) {
    const len = ri(3, 6), pointy = chance(0.6), ex = f.side ? cx : 16 - Math.max(3, f.eyeDx + 2);
    for (let k = 0; k < len; k++) {
      const w = pointy ? Math.max(1, Math.round(2 - k / 2)) : 2, y = f.top + 2 - k;
      for (let i = 0; i < w; i++) { set(ex - i, y); if (!f.side) set(31 - ex + i, y); else set(ex + 3 - i, y); }
    }
  }
  // cauda genérica
  if (f.tail && !has('ghost') && chance(0.6)) {
    const t = f.tail, curl = chance(0.5);
    line(t.x, t.y, t.x + 3, t.y - 2, 2); if (curl) { line(t.x + 3, t.y - 2, t.x + 4, t.y - 5, 2); set(t.x + 3, t.y - 6); }
  }
  // pompom na ponta da cauda
  if (f.tail && chance(0.2)) aell('feather', f.tail.x + 4, f.tail.y - 3, 1.8, 1.8);
  // espinhos nas costas (vista lateral)
  if (f.side && arch !== 'fish' && chance(0.35)) {
    const sp = chance(0.5) ? 'bone' : 'altDark';
    for (let k = 0; k < 4; k++) { const x = (f.topX ?? 16) + 1 + k * 3, y = Math.round(f.back) - 1; tri(sp, x - 1, y + 2, x + 1.5, y + 2, x + 0.5, y - 2); }
  }
  // gola fofa / cachecol (frente)
  if (!f.side && ['blob', 'biped', 'egg'].includes(arch) && chance(0.2)) {
    const id = accId(chance(0.5) ? 'feather' : 'alt'), y0 = f.mouthY + 2;
    for (let y = y0; y <= y0 + 1; y++) for (let x = 0; x < W; x++) if (inb(x, y) && g[y * W + x]) acc[y * W + x] = id;
    const p = aset(accIds[id - 1]); for (let x = 0; x < W; x++) if (inb(x, y0 + 1) && g[(y0 + 1) * W + x] && !g[(y0 + 1) * W + x - 1]) p(x - 1, y0 + 1);
  }
  // topete
  if (!f.side && !f.plantTop && arch !== 'mushroom' && chance(0.22)) { const p = aset(chance(0.5) ? 'alt' : 'feather'); for (let k = 0; k < 3; k++) { p(15 - k + 1, f.top - k); p(16 + k, f.top - k + 1); } }
  if (has('dark')) {                                                     // máscara sobre os olhos
    const id = accId('mask');
    for (let x = 0; x < W; x++) for (const y of [f.eyeY - 1, f.eyeY, f.eyeY + 1]) if (inb(x, y) && g[y * W + x] && (!f.side || Math.abs(x - f.eyeX) < 4)) acc[y * W + x] = id;
  }
  if (has('fighting')) {                                                 // faixa na cabeça
    const id = accId('band'), y = f.eyeY - 2;
    for (let x = 0; x < W; x++) if (inb(x, y) && g[y * W + x]) acc[y * W + x] = id;
    const p = aset('band'); const ex = f.side ? (f.headX ?? cx) + 5 : 22; p(ex, y); p(ex + 1, y + 1); p(ex + 2, y + 1);
  }

  // ---------- extras por raridade ----------
  if (rarity === 'epica' || rarity === 'lendaria') {                    // joia na testa
    if (f.side) aell('gem', f.eyeX + 2, f.eyeY - 3, 1.1, 1.1);
    else { const p = aset('gem'), gy = f.eyeY - 3; p(15, gy); p(16, gy); p(15, gy - 1); p(16, gy - 1); }
  }
  if (rarity === 'lendaria') {
    // auréola dourada flutuando acima da cabeça (só onde não há corpo)
    const hx = f.side ? (f.topX ?? 16) : 16, hy = Math.max(3, f.top - 4), p = aset('volt', true);
    for (let y = hy - 2; y <= hy + 2; y++) for (let x = hx - 7; x <= hx + 7; x++) {
      const e = ((x + 0.5 - hx) / 5.5) ** 2 + ((y + 0.5 - hy) / 1.8) ** 2;
      if (e <= 1 && e > 0.38) p(x, y);
    }
    // pequenas asas de luz (frente)
    if (!f.side && arch !== 'bird' && arch !== 'bat' && f.wingX > 0) {
      tri('fairyW', f.wingX, f.wingY + 1, f.wingX - 6, f.wingY - 6, f.wingX - 1, f.wingY + 5, true);
      tri('fairyW', 31 - f.wingX, f.wingY + 1, 31 - f.wingX + 6, f.wingY - 6, 31 - f.wingX + 1, f.wingY + 5, true);
    }
  }

  // ---------- forma evoluída: chifres/espinhos, padrão marcante, olhar decidido ----------
  const E = mulberry32(seed * 13 + 5);
  const evoPattern = ['stripes', 'twotone', 'spots'][Math.floor(E() * 3)];
  const evoFierce = E() < 0.6;
  if (stage === 2) {
    if (f.side) {
      for (let k = 0; k < 4; k++) { const x = (f.topX ?? 16) + 2 + k * 3, y = Math.round(f.back) - 1; tri('bone', x - 1, y + 2, x + 1.5, y + 2, x + 0.5, y - 2); }
    } else if (!has('dragon')) {
      tri('bone', 16 - 4, f.top + 2, 16 - 6, f.top - 3, 16 - 2, f.top + 1); tri('bone', 15 + 4, f.top + 2, 15 + 6, f.top - 3, 15 + 2, f.top + 1);
    }
    if (!f.side && f.wingX > 0 && E() < 0.5) {                              // ombreiras
      aell('altDark', f.wingX + 1, f.wingY, 2.2, 1.6); aell('altDark', 31 - f.wingX - 1, f.wingY, 2.2, 1.6);
    }
  }

  // espelha (vista lateral pode olhar para a direita)
  const flip = f.side && chance(0.5);

  // ---------- 3) paleta ----------
  let [h, s, l] = rgbToHsl(hexToRgb(TYPES[t1][1]));
  let [h2, s2, l2] = t2 ? rgbToHsl(hexToRgb(TYPES[t2][1])) : [h + rnd(-40, 40), s * 0.6, 0.8];
  h += rnd(-14, 14);
  if (shiny) { const d = rnd(120, 220); h += d; h2 += d; s = Math.min(1, s + 0.2); }
  s = Math.max(s, 0.3); l = clamp(l + rnd(-0.06, 0.06), 0.42, 0.62);
  const C = {
    out: hsl(h, s * 0.6, 0.09), hi: hsl(h - 8, s, l + 0.16), base: hsl(h, s, l), sh: hsl(h + 10, s, l - 0.15), dk: hsl(h + 18, s, l - 0.26),
    b1: hsl(h2, Math.max(s2, 0.25), 0.8), b2: hsl(h2, Math.max(s2, 0.25), 0.66),
    p1: hsl(h2, Math.max(s2, 0.35), clamp(l2, 0.35, 0.55)), p2: hsl(h2, Math.max(s2, 0.35), clamp(l2, 0.35, 0.55) - 0.12),
    eye: '#14111c', white: '#ffffff', mouth: '#5a1630',
  };
  const accCol = accIds.map(n => {
    if (n === 'alt') return [C.b1, C.p1, C.p2];
    if (n === 'altDark') return [C.p1, C.p2, C.dk];
    const a = ACCENTS[n];
    if (!shiny || n === 'mask' || n === 'flameCore') return a;
    return a.map(c => { const [ah, as, al] = rgbToHsl(hexToRgb(c)); return hsl(ah + 40, as, al); });
  });

  // ---------- 4) padrão do corpo ----------
  const pattern = (stage === 2 && !f.noPattern && !f.facets) ? evoPattern : f.stripes ? 'stripes' : f.cracks ? 'cracks' : f.facets ? 'facets' : f.noPattern ? 'none' : f.spotsLikely && chance(0.6) ? 'spots'
    : ['belly', 'belly', 'belly', 'stripes', 'spots', 'twotone', 'none'][Math.floor(R() * 7)];
  const bl = f.belly;
  const solid = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : (g[y * W + x] || acc[y * W + x]);
  const sx = x => flip ? 31 - x : x;

  // ---------- 5) pintura ----------
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  let c = cv.getContext('2d');
  const yOff = f.floats ? -4 : 0;
  const OX = 0, OY = -4 + yOff, Z = 3;
  const dot = (x, y, col) => { c.fillStyle = col; c.fillRect(OX + sx(x) * Z, OY + y * Z, Z, Z); };
  const midY = (f.back + (f.footY || 26)) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!solid(x, y)) {
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) dot(x, y, C.out);
      continue;
    }
    const a = acc[y * W + x];
    const topOpen = !solid(x, y - 1) || !solid(x - 1, y - 1), botOpen = !solid(x, y + 1) || !solid(x + 1, y);
    if (a) { const [ah, ab, as] = accCol[a - 1]; dot(x, y, topOpen ? ah : botOpen ? as : ab); continue; }
    const inBelly = pattern === 'belly' && bl && ((x + 0.5 - bl[0]) / bl[2]) ** 2 + ((y + 0.5 - bl[1]) / bl[3]) ** 2 < 1;
    let col;
    if (inBelly) col = botOpen ? C.b2 : (y > bl[1] + bl[3] * 0.4 && (x + y) & 1) ? C.b2 : C.b1;
    else if (topOpen) col = C.hi;
    else if (botOpen) col = C.dk;
    else if (y > midY + 2 && (x + y) & 1) col = C.sh;
    else col = C.base;
    if (!inBelly && !topOpen) {
      if (pattern === 'stripes' && y > f.back && (y % 4 === 0)) col = botOpen ? C.p2 : C.p1;
      else if (pattern === 'spots' && ((x * 7 + y * 13 + seed) % 17 === 0 || (x * 7 + y * 13 + seed) % 17 === 1 && (x & 1))) col = C.p1;
      else if (pattern === 'twotone' && y > midY) col = botOpen ? C.p2 : ((x + y) & 1 && y < midY + 2 ? C.base : C.p1);
      else if (pattern === 'cracks' && ((x * 5 + y * 3 + seed) % 19 === 0)) col = C.dk;
      else if (pattern === 'facets') col = (x < 16) === (y < midY - 2) ? C.hi : (x + y) % 5 === 0 ? C.sh : C.base;
    }
    dot(x, y, col);
  }

  // ---------- 6) rosto ----------
  let eyeStyle = ['dot', 'dot', 'big', 'big', 'sleepy', 'angry', 'shine', f.side ? 'dot' : 'cyclops'][Math.floor(R() * 8)];
  if (stage === 2 && evoFierce && eyeStyle !== 'cyclops') eyeStyle = 'angry';
  // boca, narina e brilho (iguais nos dois quadros)
  if (f.side) {
    if (chance(0.7)) { dot(f.mouthX, f.mouthY, C.eye); dot(f.mouthX + 1, f.mouthY, C.eye); if (chance(0.4)) dot(f.mouthX + 1, f.mouthY + 1, C.white); }
    if (chance(0.5)) dot(f.mouthX - 1, f.mouthY - 2, C.out);           // narina
  } else if (f.mouthY > 0) {
    const my = f.mouthY + (eyeStyle === 'cyclops' ? 1 : 0);
    switch (Math.floor(R() * 5)) {
      case 0: dot(15, my, C.eye); dot(16, my, C.eye); break;                                         // linha
      case 1: dot(14, my, C.eye); dot(15, my + 1, C.eye); dot(16, my + 1, C.eye); dot(17, my, C.eye); break; // sorriso
      case 2: dot(15, my, C.eye); dot(16, my, C.eye); dot(16, my + 1, C.white); break;               // presinha
      case 3: dot(15, my, C.eye); dot(16, my, C.eye); dot(15, my + 1, C.mouth); dot(16, my + 1, C.mouth); break; // aberta
      default: break;                                                                                // sem boca
    }
  }
  if (f.shine) { dot(10, f.eyeY - 3, C.white); dot(11, f.eyeY - 4, C.white); }   // brilho da geleia

  // segundo quadro (olhos fechados) para a piscada
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 96;
  const c2 = cv2.getContext('2d'); c2.drawImage(cv, 0, 0);

  const drawEye = (x, y, inner) => {        // inner = lado que aponta para o centro do rosto
    switch (eyeStyle) {
      case 'big':    dot(x, y - 1, C.white); dot(x + 1, y - 1, C.eye); dot(x, y, C.eye); dot(x + 1, y, C.eye); dot(x, y + 1, C.eye); dot(x + 1, y + 1, C.eye); dot(x, y, C.white); break;
      case 'sleepy': dot(x, y + 1, C.eye); dot(x + 1, y + 1, C.eye); break;
      case 'angry':  dot(x, y, C.eye); dot(x + 1, y, C.eye); dot(x, y + 1, C.eye); dot(x + 1, y + 1, C.eye); dot(inner, y - 1, C.out); break;
      case 'shine':  dot(x, y, C.white); dot(x + 1, y, C.white); dot(x, y + 1, C.white); dot(x + 1, y + 1, C.eye); break;
      default:       dot(x, y, C.white); dot(x + 1, y, C.eye); dot(x, y + 1, C.eye); dot(x + 1, y + 1, C.eye);
    }
  };
  const closedEye = (x, y) => { dot(x, y + 1, C.eye); dot(x + 1, y + 1, C.eye); if (eyeStyle === 'angry') dot(x, y - 1, C.out); };
  const eyes = (closed) => {
    if (f.side) { closed ? closedEye(f.eyeX, f.eyeY) : drawEye(f.eyeX, f.eyeY, f.eyeX + 1); return; }
    if (eyeStyle === 'cyclops') {
      const y = f.eyeY - 1;
      if (closed) { for (let i = 0; i < 4; i++) dot(14 + i, y + 2, C.eye); return; }
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) dot(14 + i, y + j, C.white);
      dot(15, y + 1, C.eye); dot(16, y + 1, C.eye); dot(15, y + 2, C.eye); dot(16, y + 2, C.eye); dot(14, y - 1, C.out); dot(17, y - 1, C.out);
      return;
    }
    let dx = f.eyeDx;
    while (dx > 0 && !solid(15 - dx - 1, f.eyeY)) dx--;
    if (closed) { closedEye(15 - dx - 1, f.eyeY); closedEye(16 + dx, f.eyeY); }
    else { drawEye(15 - dx - 1, f.eyeY, 15 - dx); drawEye(16 + dx, f.eyeY, 16 + dx); }
  };
  eyes(false);
  const src = cv.toDataURL();
  c = c2; eyes(true);                       // `dot` desenha no contexto atual
  return { src, blink: eyeStyle === 'sleepy' ? null : cv2.toDataURL(), floats: !!f.floats, arch };
}

/* Nomes: prefixo do tipo + sílabas + final */
export const TYPE_SYL = {
  fire: ['pyr','fla','cin','bra','igni'], water: ['aqu','mar','nami','ond','hidro'], grass: ['fol','vin','bro','sem','flo'],
  electric: ['volt','zap','ion','fai','ra'], ice: ['cri','gla','nev','fro'], fighting: ['bru','kik','ten'], poison: ['tox','vel','mia'],
  ground: ['ter','du','pó','lam'], flying: ['ae','pi','vo','plu'], psychic: ['psi','mne','lu','ora'], bug: ['zum','ant','bi','cri'],
  rock: ['pe','gra','roc','li'], ghost: ['eco','sus','bru','fan'], dragon: ['dra','wy','ser','ky'], dark: ['nox','som','um'],
  steel: ['fer','aço','met','bol'], fairy: ['fê','lí','cel','mel'], normal: ['ta','bo','mi','fu'],
};
export const SYL = ['ka','zu','mo','ri','pi','lo','va','ne','to','shi','ra','bu','mi','gu','tri','zor','bel','nix','po',
             'qui','sa','lu','ten','ori','pa','ki','vel','mun','tak','fen','yo','ba','cro','dé','ju','xi'];
export const END = ['', '', 'n', 'x', 'lo', 'mon', 'ra', 'ito', 'el', 'on', 'ix', 'u', 'ino', 'ar', 'eon', 'by'];
export function creatureName(R, t1) {
  let n = R() < 0.6 ? TYPE_SYL[t1][Math.floor(R() * TYPE_SYL[t1].length)] : SYL[Math.floor(R() * SYL.length)];
  const k = 1 + (R() < 0.35 ? 1 : 0);
  for (let i = 0; i < k; i++) n += SYL[Math.floor(R() * SYL.length)];
  n += END[Math.floor(R() * END.length)];
  n = n.replace(/(.)\1\1/g, '$1$1').slice(0, 11);
  return n[0].toUpperCase() + n.slice(1);
}

export const CREATURE_TOTAL = 1500;
/** Dados fixos de cada número (#1–#1500): nome, tipos e raridade. */
export const creatureCache = new Map();
export function creatureBase(id) {
  if (creatureCache.has(id)) return creatureCache.get(id);
  const R = mulberry32(id * 31 + 7);
  const t1 = TYPE_KEYS[Math.floor(R() * TYPE_KEYS.length)];
  let t2 = R() < 0.45 ? TYPE_KEYS[Math.floor(R() * TYPE_KEYS.length)] : null;
  if (t2 === t1) t2 = null;
  const name = creatureName(R, t1);
  // raridade: ~60% comum, 25% rara, 11% épica, 4% lendária
  const rv = mulberry32(id * 7919 + 3)();
  const rarity = rv < 0.04 ? 'lendaria' : rv < 0.15 ? 'epica' : rv < 0.40 ? 'rara' : 'comum';
  const types = t2 ? [t1, t2] : [t1];
  const b = { id, name, types, rarity, arch: archFor(id, types) };
  creatureCache.set(id, b);
  return b;
}
/** Nome da forma evoluída: raiz do nome + sufixo imponente. */
export function evoName(b) {
  const R = mulberry32(b.id * 101 + 9);
  const suf = ['ion', 'ark', 'oth', 'eon', 'rex', 'aris', 'ondo', 'ax', 'ovar', 'azor'][Math.floor(R() * 10)];
  const root = b.name.replace(/[aeiouyéêíó]+$/i, '').slice(0, 7) || b.name.slice(0, 4);
  return root + suf;
}

/* ---------- Sorteio ponderado: raridade × bola × bônus × horário × clima ---------- */
export const RARITY_ORDER = ['comum', 'rara', 'epica', 'lendaria'];
export const RARITY_W = { comum: 60, rara: 25, epica: 11, lendaria: 4 };
export let byRarity = null;
export function rarityLists() {
  if (byRarity) return byRarity;
  byRarity = { comum: [], rara: [], epica: [], lendaria: [] };
  for (let id = 1; id <= CREATURE_TOTAL; id++) byRarity[creatureBase(id).rarity].push(id);
  return byRarity;
}
/** Peso de cada criatura conforme o momento (noite favorece fantasmas, chuva favorece Água…). */
export function envWeight(b) {
  let w = 1;
  const has = t => b.types.includes(t);
  const tod = timeOfDay(), wx = weatherNow();
  if (settings.daynight) {
    if (tod === 'noite' && (has('ghost') || has('dark') || b.arch === 'bat' || b.arch === 'ghost')) w *= 3;
    if (tod === 'dia' && (has('fire') || has('grass') || has('flying'))) w *= 1.4;
  }
  if (settings.weather) {
    if (wx === 'chuva' && (has('water') || has('electric'))) w *= 2.5;
    if (wx === 'neve' && has('ice')) w *= 3;
    if (wx === 'vento' && (has('flying') || b.arch === 'cloud')) w *= 2.5;
  }
  return w;
}
export function pickCreatureId(avoidId, opts = {}) {
  const ball = BALLS[opts.ball || 'padrao'];
  const lists = rarityLists();
  const minI = opts.minRarity ? RARITY_ORDER.indexOf(opts.minRarity) : 0;
  const night = settings.daynight && timeOfDay() === 'noite';
  const rw = RARITY_ORDER.map((r, i) => i < minI ? 0
    : RARITY_W[r] * (ball.mult[r] || 1) * (night && ball.night && (r === 'epica' || r === 'lendaria') ? ball.night : 1));
  let t = Math.random() * rw.reduce((a, b) => a + b, 0), ri = 0;
  while (t > rw[ri] && ri < 3) { t -= rw[ri]; ri++; }
  const ids = lists[RARITY_ORDER[ri]].filter(i => i !== avoidId);
  const ws = ids.map(i => envWeight(creatureBase(i)));
  let u = Math.random() * ws.reduce((a, b) => a + b, 0), k = 0;
  while (u > ws[k] && k < ids.length - 1) { u -= ws[k]; k++; }
  return ids[k];
}
/** Cria uma entrada no mesmo formato da PokéAPI, mas com uma criatura original. */
export function makeCreatureEntry(avoidId, opts = {}) {
  const id = pickCreatureId(avoidId, opts);
  return creatureEntry(id, Math.random() < (BALLS[opts.ball || 'padrao'].shiny));
}
export function creatureEntry(id, shiny) {
  const b = creatureBase(id);
  const evolved = !!dex.o[id]?.ev;
  const art = drawCreature(id, shiny, b.types, b.rarity, evolved ? 2 : 1);
  return { ...b, baseName: b.name, name: evolved ? evoName(b) : b.name, evolved, shiny,
           src: art.src, blink: art.blink, floats: art.floats, pixel: true, original: true };
}
