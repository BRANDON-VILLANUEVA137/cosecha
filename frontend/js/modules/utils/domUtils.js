// js/utils/domUtils.js

// Escapa texto para insertarlo en innerHTML sin riesgo.
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Aviso temporal. El tipo se deduce del emoji inicial si no se indica:
// ✅ 🎉 → ok · ⚠️ 🚫 → error · ⏱️ ⏳ → aviso.
export function toast(msg, tipo) {
  const texto = String(msg ?? '');
  if (!tipo) {
    if (/^(✅|🎉)/u.test(texto)) tipo = 'ok';
    else if (/^(⚠️|🚫)/u.test(texto)) tipo = 'error';
    else if (/^(⏱️|⏳)/u.test(texto)) tipo = 'aviso';
  }
  const t = document.createElement('div');
  t.className = 'toast' + (tipo ? ` toast--${tipo}` : '');
  t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  t.textContent = texto;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}
