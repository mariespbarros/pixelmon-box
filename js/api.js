/* PokéAPI: busca de Pokémon reais (com recurso para o gerador quando offline). */
import { BALLS } from './ball.js';
import { makeCreatureEntry } from './creatures.js';
import { openOpts } from './sequence.js';
import { state } from './state.js';
import { nice } from './utils.js';

/* =========================================================
   POKÉAPI
   ========================================================= */
export const API = 'https://pokeapi.co/api/v2';
export let totalSpecies = null;

export async function getJSON(url, ms = 6500) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
export async function getCount() {
  if (totalSpecies) return totalSpecies;
  // se falhar, a busca do Pokémon também falha e cai no gerador de criaturas
  totalSpecies = (await getJSON(`${API}/pokemon-species?limit=1`)).count || 1025;
  return totalSpecies;
}
export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(src); img.onerror = rej; img.src = src;
  });
}
/** Ordem de preferência: sprites Gen V (pixel clássico) → sprite padrão → arte oficial. */
export function spriteCandidates(p, shiny) {
  const s = p.sprites || {}, bw = s.versions?.['generation-v']?.['black-white'] || {};
  const art = s.other?.['official-artwork'] || {};
  const list = shiny
    ? [bw.front_shiny, s.front_shiny, bw.front_default, s.front_default, art.front_shiny, art.front_default]
    : [bw.front_default, s.front_default, art.front_default];
  return [...new Set(list.filter(Boolean))];
}

/**
 * Sorteia o que sai da Pokébola: tenta a PokéAPI; se ela estiver inacessível
 * (offline, rede bloqueada, pré-visualização em sandbox), gera uma criatura original.
 */
export let apiFails = 0;
export async function loadRandom(avoidId, opts = {}) {
  // bônus diário garante raridade: usa sempre o gerador (a API não permite escolher)
  // depois de 2 falhas seguidas, só re-testa a API de vez em quando (evita esperas)
  if (!opts.minRarity && (apiFails < 2 || Math.random() < 0.15)) {
    try { const m = await loadFromApi(avoidId, opts); apiFails = 0; return m; }
    catch { apiFails++; }
  }
  return makeCreatureEntry(avoidId, opts);
}

/** Busca um Pokémon aleatório (≠ avoidId), com sprite já pré-carregado. */
export async function loadFromApi(avoidId, opts = {}) {
  const count = await getCount();
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    let id;
    do { id = 1 + Math.floor(Math.random() * count); } while (id === avoidId && count > 1);
    try {
      const [p, sp] = await Promise.all([
        getJSON(`${API}/pokemon/${id}`),
        getJSON(`${API}/pokemon-species/${id}`).catch(() => null),
      ]);
      const shiny = Math.random() < (BALLS[opts.ball || 'padrao'].shiny);
      let src = null;
      for (const c of spriteCandidates(p, shiny)) { try { src = await loadImage(c); break; } catch {} }
      if (!src) throw new Error('sprite');
      return {
        id, shiny, src,
        pixel: !src.includes('official-artwork'),
        name: sp?.names?.find(n => n.language.name === 'en')?.name || nice(p.name),
        types: p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name),
        rarity: (sp?.is_legendary || sp?.is_mythical) ? 'lendaria'
          : (sp?.capture_rate ?? 255) <= 45 ? 'epica' : (sp?.capture_rate ?? 255) <= 120 ? 'rara' : 'comum',
        floats: p.types.some(t => ['ghost', 'flying'].includes(t.type.name)),
        // ficha: dados de jogo vindos da API
        h: p.height / 10, w: p.weight / 10, ab: p.abilities?.[0] ? nice(p.abilities[0].ability.name) : null,
        st: Object.fromEntries((p.stats || []).map(x => [x.stat.name, x.base_stat])),
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('falha');
}
export function prefetch() {
  // só vale a pena pré-carregar quando a API está respondendo (o gerador é instantâneo)
  if (apiFails >= 2) { state.next = null; return; }
  const opts = openOpts();
  state.nextKey = opts.key;
  state.next = loadRandom(state.current?.id, opts).catch(() => null);
}
