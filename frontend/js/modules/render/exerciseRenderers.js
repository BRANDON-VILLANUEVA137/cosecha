import { state } from '../state.js';

export const ExerciseRenderers = {
  formatMathText(texto) {
    if (typeof texto !== 'string' || !texto) return '';
    return texto.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
      return `<span class="fraccion" aria-label="${num}/${den}"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });
  },

  escapeHtml(str) {
    const s = String(str == null ? '' : str);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  esTipoSeleccion(tipo) {
    return ['opcion_multiple', 'single', 'seleccion_unica', 'multiple', 'seleccion_multiple', 'checkboxes']
      .includes(String(tipo || ''));
  },

  esTipoSeleccionMultiple(tipo) {
    return ['multiple', 'seleccion_multiple', 'checkboxes'].includes(String(tipo || ''));
  },

  renderControlesRespuesta(ej, materia, parentApp) {
    if (ej.tipo === 'fraccion_grafica' || ej.tipo === 'grafico_interactivo') {
      return parentApp.renderControlGrafica(ej, materia);
    }
    if (Array.isArray(ej.opciones) && ej.opciones.length) {
      const esMultiple = this.esTipoSeleccionMultiple(ej.tipo);
      const tipoInput = esMultiple ? 'checkbox' : 'radio';
      const nombre = 'resp_' + ej.id;
      const opciones = ej.opciones.map(op => `
        <label class="opcion-item">
          <input type="${tipoInput}" name="${nombre}" value="${this.escapeHtml(op.clave)}">
          <span>${this.formatMathText(this.escapeHtml(op.texto))}</span>
        </label>
      `).join('');
      return `
        <div class="opciones" data-ej="${ej.id}">${opciones}</div>
        <div class="answer-row">
          <button class="primary" data-check="${ej.id}" data-materia="${materia}">Comprobar</button>
        </div>
      `;
    }
    return `
      <div class="answer-row">
        <input type="text" data-ej="${ej.id}" placeholder="Tu respuesta...">
        <button class="primary" data-check="${ej.id}" data-materia="${materia}">Comprobar</button>
      </div>
    `;
  }
};
