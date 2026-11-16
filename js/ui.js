/* Avisos (toasts), janelas e tutorial. */
import { battle } from './battle.js';
import { el } from './dom.js';
import { store } from './utils.js';

/* =========================================================
   AVISOS (toasts) E JANELAS
   ========================================================= */
export function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  el.toasts.appendChild(t);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3600);
}
export const MODALS = () => [el.dexPanel, el.battle, el.settingsPanel, el.shareModal, el.tutorial];
export const anyOverlayOpen = () => MODALS().some(m => !m.hidden);
export const modalFocus = new Map();
export function openModal(m, focusEl) {
  modalFocus.set(m, document.activeElement);
  m.hidden = false;
  (focusEl || m.querySelector('button, input, select, [tabindex]'))?.focus({ preventScroll: true });
}
export function closeModal(m) {
  if (m.hidden) return;
  m.hidden = true;
  const f = modalFocus.get(m);
  (f && document.contains(f) && !f.closest('[hidden]') ? f : el.ball).focus({ preventScroll: true });
}
// Esc fecha e Tab circula dentro de qualquer janela (a Pokédex tem tratamento próprio)
for (const m of [el.battle, el.settingsPanel, el.shareModal, el.tutorial]) {
  m.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (m === el.battle && battle.busy) return; closeModal(m); return; }
    if (e.key !== 'Tab') return;
    const f = [...m.querySelectorAll('button:not([disabled]), input, select')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  m.addEventListener('click', e => { if (e.target === m && !(m === el.battle && battle.busy)) closeModal(m); });
}


/* =========================================================
   TUTORIAL (primeira visita)
   ========================================================= */
export const TUT = [
  ['Bem-vindo à Pixelmon Box!', 'Clique na Pokébola (ou aperte Enter) para abri-la e descobrir quem está lá dentro. Cada abertura é uma surpresa.'],
  ['Raridades e shiny', '★ comum · ★★ rara · ★★★ épica · ★★★★ lendária. Shiny aparece 1 vez em 50. Cuidado: às vezes a criatura foge!'],
  ['Sua coleção', 'Na Pokédex (tecla P) ficam seus registros, fichas, apelidos e conquistas. Encontre a mesma criatura 3 vezes para ela evoluir.'],
  ['Mundo vivo', 'Bolas especiais se desbloqueiam com o progresso. O horário e o clima mudam quem aparece, e a primeira abertura do dia tem bônus.'],
];
export let tutStep = 0;
export function showTutorial() { tutStep = 0; renderTut(); openModal(el.tutorial, el.tutNext); }
export function renderTut() {
  const [t, d] = TUT[tutStep];
  el.tutTitle.textContent = t; el.tutText.textContent = d;
  el.tutDots.textContent = TUT.map((_, i) => i === tutStep ? '■' : '□').join(' ');
  el.tutNext.textContent = tutStep === TUT.length - 1 ? 'começar' : 'próximo';
}
el.tutNext.addEventListener('click', () => {
  if (tutStep < TUT.length - 1) { tutStep++; renderTut(); el.tutNext.focus(); }
  else { store.set('pkb.tut', 1); closeModal(el.tutorial); }
});
el.tutSkip.addEventListener('click', () => { store.set('pkb.tut', 1); closeModal(el.tutorial); });
