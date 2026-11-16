/* Exportar e importar a coleção. */
import { store } from './utils.js';

/* =========================================================
   EXPORTAR / IMPORTAR / RESETAR
   ========================================================= */
export const SAVE_KEYS = ['pkb.count', 'pkb.shiny', 'pkb.dex', 'pkb.stats', 'pkb.ach', 'pkb.lastDay', 'pkb.streak', 'pkb.ball', 'pkb.ballsSeen', 'pkb.settings', 'pkb.muted', 'pkb.tut'];
export function exportCode() {
  const data = {}; for (const k of SAVE_KEYS) data[k] = store.get(k, null);
  return 'PKB1:' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
export function importCode(code) {
  const raw = code.trim();
  if (!raw.startsWith('PKB1:')) throw new Error('formato');
  const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(5)))));
  if (!data['pkb.dex'] || !data['pkb.dex'].o) throw new Error('dados');
  for (const k of SAVE_KEYS) if (data[k] !== null && data[k] !== undefined) store.set(k, data[k]);
}
