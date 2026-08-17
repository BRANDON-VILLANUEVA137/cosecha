// js/utils/formatters.js
export function formatMathText(texto) {
  if (typeof texto !== 'string' || !texto) return '';
  return texto.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
    return `<span class="fraccion" aria-label="${num}/${den}"><span class="num">${num}</span><span class="den">${den}</span></span>`;
  });
}

export function escapeHtml(str) {
  const s = String(str == null ? '' : str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function esTipoSeleccion(tipo) {
  return ['opcion_multiple', 'single', 'seleccion_unica', 'multiple', 'seleccion_multiple', 'checkboxes']
    .includes(String(tipo || ''));
}

export function esTipoSeleccionMultiple(tipo) {
  return ['multiple', 'seleccion_multiple', 'checkboxes'].includes(String(tipo || ''));
}

// ✅ AGREGAR ESTA FUNCIÓN
export function getDynamicModeHint(mode) {
  const hints = {
    paso: 'Muestra la estrategia de la carita sonriente paso a paso para que el estudiante entienda el procedimiento.',
    grafico: 'Combina la visualización con rectángulos y círculos para reforzar el concepto de fracciones.',
    desafio: 'Convierte la clase en un reto rápido con tiempo límite y preguntas breves.',
    gramatica: 'Enfoca la actividad en completar verbos y pronombres con apoyo visual.'
  };

    return hints[mode] || hints.paso;
}