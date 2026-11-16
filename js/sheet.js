/* Ficha das criaturas: altura, peso, habilidade, descrição e atributos. */
import { creatureBase } from './creatures.js';
import { clamp, mulberry32 } from './utils.js';

/* =========================================================
   FICHA (altura, peso, habilidade, descrição, atributos)
   ========================================================= */
export const ARCH_SIZE = { blob: [0.3, 0.8], biped: [0.6, 1.6], quad: [0.5, 1.4], bird: [0.3, 1.0], fish: [0.4, 1.2], serpent: [1.2, 4.0],
  ghost: [0.6, 1.5], bug: [0.2, 0.7], golem: [1.3, 2.6], slime: [0.3, 0.9], plant: [0.3, 0.9], turtle: [0.4, 1.2], crab: [0.3, 1.0],
  mushroom: [0.2, 0.7], octo: [0.5, 1.6], bat: [0.3, 0.9], crystal: [0.5, 1.5], cloud: [0.5, 1.4], egg: [0.2, 0.5] };
export const ARCH_STAT = { golem: { def: 25, spd: -20 }, bird: { spd: 20 }, bat: { spd: 18, def: -5 }, serpent: { atk: 10 }, slime: { hp: 20 },
  cloud: { hp: 15, spd: 5 }, crystal: { def: 18 }, ghost: { spd: 10, def: -5 }, turtle: { def: 25, spd: -15 }, crab: { def: 15, atk: 5 },
  bug: { spd: 10 }, octo: { atk: 5, hp: 10 }, egg: { hp: 12, atk: -8 }, quad: { spd: 10, atk: 5 }, biped: { atk: 8 }, fish: { spd: 8 },
  mushroom: { hp: 8 }, plant: { hp: 6, def: 5 }, blob: { hp: 10 } };
export const ABILITIES = {
  fire: ['Brasa Interna', 'Pele Quente', 'Fagulha'], water: ['Correnteza', 'Escamas Úmidas', 'Maré Calma'],
  grass: ['Fotossíntese', 'Raiz Firme', 'Perfume Verde'], electric: ['Estática', 'Carga Rápida', 'Faísca Viva'],
  ice: ['Pele Gélida', 'Neblina Fria', 'Cristalizar'], fighting: ['Punho Firme', 'Disciplina', 'Garra'],
  poison: ['Toxina Leve', 'Névoa Ácida', 'Pele Amarga'], ground: ['Escavador', 'Pés de Barro', 'Tremor'],
  flying: ['Planador', 'Vento a Favor', 'Pena Leve'], psychic: ['Pressentimento', 'Mente Calma', 'Telepatia'],
  bug: ['Casca Dura', 'Enxame', 'Antena Atenta'], rock: ['Pele de Pedra', 'Peso Bruto', 'Firmeza'],
  ghost: ['Transparência', 'Sussurro', 'Assombro'], dragon: ['Escama Antiga', 'Fúria Contida', 'Rugido'],
  dark: ['Sombra Furtiva', 'Olhar Frio', 'Emboscada'], steel: ['Blindagem', 'Engrenagem', 'Brilho Metálico'],
  fairy: ['Encanto', 'Pó de Luz', 'Graça'], normal: ['Fôlego', 'Sorte', 'Adaptável'],
};
export const HABITAT = {
  fire: 'vive perto de vulcões adormecidos', water: 'nada em lagos de águas claras', grass: 'se esconde entre folhagens altas',
  electric: 'aparece em noites de tempestade', ice: 'mora em cavernas congeladas', fighting: 'treina em montanhas ao amanhecer',
  poison: 'habita pântanos enevoados', ground: 'cava túneis em terrenos secos', flying: 'plana sobre falésias ventosas',
  psychic: 'medita em ruínas antigas', bug: 'mora em troncos ocos', rock: 'dorme entre pedregulhos',
  ghost: 'vaga por casas abandonadas', dragon: 'guarda picos inalcançáveis', dark: 'só sai depois do pôr do sol',
  steel: 'é atraído por objetos metálicos', fairy: 'dança em clareiras floridas', normal: 'costuma ser visto perto de vilarejos',
};
export const BEHAVIOR = {
  blob: 'Rola em vez de andar quando está feliz.', biped: 'Caminha sempre de cabeça erguida.', quad: 'Corre em círculos quando encontra um amigo.',
  bird: 'Canta uma nota diferente a cada amanhecer.', fish: 'Salta da água para observar as estrelas.', serpent: 'Se enrola para dormir em lugares quentes.',
  ghost: 'Flutua em silêncio e some quando é observado.', bug: 'Se comunica balançando as antenas.', golem: 'Pode passar anos parado sem se mexer.',
  slime: 'Muda de formato conforme o humor.', plant: 'Fecha as folhas quando sente medo.', turtle: 'Guarda pequenos tesouros dentro do casco.',
  crab: 'Anda de lado para despistar quem o segue.', mushroom: 'Solta esporos brilhantes quando espirra.', octo: 'Desenha padrões na areia com os tentáculos.',
  bat: 'Dorme de cabeça para baixo durante o dia.', crystal: 'Reflete a luz em cores que mudam com o clima.', cloud: 'Faz uma garoa leve quando fica triste.',
  egg: 'Ainda não saiu totalmente da casca.',
};
export const RAR_BONUS = { comum: 0, rara: 8, epica: 16, lendaria: 28 };
export function creatureSheet(id, evolved) {
  const b = creatureBase(id), R = mulberry32(id * 577 + 11);
  const [h0, h1] = ARCH_SIZE[b.arch] || [0.4, 1.2];
  let h = h0 + R() * (h1 - h0);
  h *= { comum: 1, rara: 1.1, epica: 1.25, lendaria: 1.7 }[b.rarity] * (evolved ? 1.6 : 1);
  const has = t => b.types.includes(t);
  const dens = has('ghost') ? 0.05 : (has('steel') || has('rock')) ? 3.2 : has('ground') ? 2 : (has('flying') || b.arch === 'cloud') ? 0.3 : 1;
  const w = Math.max(0.1, h * h * 22 * dens * (0.7 + R() * 0.6));
  const t1 = b.types[0], ab = ABILITIES[t1][Math.floor(R() * 3)];
  const desc = HABITAT[b.types[b.types.length > 1 && R() < 0.4 ? 1 : 0]];
  const st = {};
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    st[k] = clamp(Math.round(35 + R() * 40 + ((ARCH_STAT[b.arch] || {})[k] || 0) + RAR_BONUS[b.rarity] + (evolved ? 15 : 0)), 10, 130);
  }
  return { h, w, ability: ab, desc: desc[0].toUpperCase() + desc.slice(1) + '. ' + BEHAVIOR[b.arch], stats: st };
}
export function apiSheet(e) {
  const s = e.st || {};
  return { h: e.h, w: e.w, ability: e.ab, desc: null,
    stats: s.hp ? { hp: s.hp, atk: s.attack, def: s.defense, spd: s.speed } : null };
}
export const fmtNum = (n, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
export const STAT_LABEL = { hp: 'PV', atk: 'ATQ', def: 'DEF', spd: 'VEL' };
export function statBars(container, st) {
  container.innerHTML = '';
  if (!st) return;
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    const row = document.createElement('div'); row.className = 'sbar';
    const pct = clamp(st[k] / 150, 0.03, 1);
    row.innerHTML = `<span>${STAT_LABEL[k]}</span><b>${st[k]}</b><i><u style="width:${(Math.round(pct * 20) / 20 * 100)}%"></u></i>`;
    container.appendChild(row);
  }
}
