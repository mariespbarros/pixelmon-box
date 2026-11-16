/* Referências aos elementos da página. */
import { $ } from './utils.js';

/* Referências aos elementos da página */
/* =========================================================
   ELEMENTOS & ESTADO
   ========================================================= */
export const el = {
  box: $('spriteBox'), alive: $('spriteLive'), blinkImg: $('spriteBlink'), rays: $('rays'), rar: $('rar'),
  dexBtn: $('dexBtn'), dexPanel: $('dexPanel'), dexClose: $('dexClose'), dexGrid: $('dexGrid'), dexEmpty: $('dexEmpty'),
  dexBarFill: $('dexBarFill'), progO: $('progO'), progP: $('progP'), pgPrev: $('pgPrev'), pgNext: $('pgNext'), pgLabel: $('pgLabel'),
  dexDetail: $('dexDetail'), ddImg: $('ddImg'), ddNum: $('ddNum'), ddName: $('ddName'), ddTypes: $('ddTypes'), ddStats: $('ddStats'),
  ddShiny: $('ddShiny'), ddBack: $('ddBack'),
  hudInfo: $('hudInfo'), toasts: $('toasts'), ballBar: $('ballBar'), ballName: $('ballName'), progA: $('progA'),
  battleBtn: $('battleBtn'), musicBtn: $('musicBtn'), setBtn: $('setBtn'), cardSheet: $('cardSheet'), cardShare: $('cardShare'),
  ddNick: $('ddNick'), ddDesc: $('ddDesc'), ddBars: $('ddBars'), ddEvo: $('ddEvo'), ddNickForm: $('ddNickForm'), ddNickInput: $('ddNickInput'),
  ddCry: $('ddCry'), ddFav: $('ddFav'), ddNickBtn: $('ddNickBtn'), ddShare: $('ddShare'), ddBattle: $('ddBattle'),
  battle: $('battle'), bClose: $('bClose'), bPick: $('bPick'), bEmpty: $('bEmpty'), bList: $('bList'), bArena: $('bArena'),
  bFoeName: $('bFoeName'), bFoeTypes: $('bFoeTypes'), bFoeHp: $('bFoeHp'), bFoeHpTxt: $('bFoeHpTxt'), bFoeSlot: $('bFoeSlot'), bFoeImg: $('bFoeImg'),
  bMeName: $('bMeName'), bMeTypes: $('bMeTypes'), bMeHp: $('bMeHp'), bMeHpTxt: $('bMeHpTxt'), bMeSlot: $('bMeSlot'), bMeImg: $('bMeImg'),
  bLog: $('bLog'), bMoves: $('bMoves'), bEnd: $('bEnd'), bAgain: $('bAgain'), bQuit: $('bQuit'),
  shareModal: $('shareModal'), shareImg: $('shareImg'), shareCopy: $('shareCopy'), shareDl: $('shareDl'), shareStatus: $('shareStatus'), shareClose: $('shareClose'),
  settingsPanel: $('settingsPanel'), setClose: $('setClose'), setSfx: $('setSfx'), setMusic: $('setMusic'), setMusicVol: $('setMusicVol'),
  setWeather: $('setWeather'), setScenes: $('setScenes'), setDaynight: $('setDaynight'), setExportBtn: $('setExportBtn'), setExport: $('setExport'),
  setImport: $('setImport'), setImportBtn: $('setImportBtn'), setMsg: $('setMsg'), setReset: $('setReset'), setTut: $('setTut'),
  tutorial: $('tutorial'), tutTitle: $('tutTitle'), tutText: $('tutText'), tutDots: $('tutDots'), tutNext: $('tutNext'), tutSkip: $('tutSkip'),
  scene: $('scene'), mon: $('mon'), sprite: $('sprite'), halo: $('halo'),
  ball: $('ball'), body: $('ballBody'), canvas: $('ballCanvas'), shadow: $('shadow'), beam: $('beam'),
  info: $('info'), hint: $('hint'), card: $('card'), name: $('name'), dexNum: $('dexNum'),
  badge: $('badge'), orig: $('orig'), types: $('types'), again: $('again'),
  error: $('error'), errorMsg: $('errorMsg'), retry: $('retry'),
  flash: $('flash'), fx: $('fx'), stars: $('stars'),
  count: $('count'), shinyCount: $('shinyCount'), mute: $('mute'), live: $('live'),
};
