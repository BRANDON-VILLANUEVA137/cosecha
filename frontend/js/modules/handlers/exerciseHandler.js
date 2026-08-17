/**
 * Manejo de ejercicios (creación, edición, validación)
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';
import { formatMathText, escapeHtml, esTipoSeleccion, esTipoSeleccionMultiple } from '../utils/formatters.js';

const API = window.API;

export const ExerciseHandler = {
  // Editor de opciones
  defaultLetraOpcion() {
    const existentes = (state.opcionesRows || []).map(r => String(r.clave || '').trim().toLowerCase());
    return 'abcdefghij'.split('').find(L => !existentes.includes(L)) || 'x';
  },

  toggleOpcionesEditor() {
    const select = document.getElementById('newTipo');
    const area = document.getElementById('opcionesArea');
    const graficaArea = document.getElementById('graficaArea');
    const respContainer = document.getElementById('newRespContainer');
    if (!select || !area) return;
    const tipo = select.value;
    const esGrafica = ['fraccion_grafica', 'grafico_interactivo'].includes(tipo);

    if (respContainer) respContainer.style.display = esTipoSeleccion(tipo) ? 'none' : 'block';
    if (graficaArea) graficaArea.style.display = esGrafica ? 'block' : 'none';

    if (esTipoSeleccion(tipo)) {
      if (!Array.isArray(state.opcionesRows) || state.opcionesRows.length < 2) {
        state.opcionesRows = [
          { clave: 'a', texto: '', correcta: false },
          { clave: 'b', texto: '', correcta: false }
        ];
      }
      area.style.display = 'block';
      area.innerHTML = this.renderOpcionesEditorHTML(tipo);
    } else {
      area.style.display = 'none';
      area.innerHTML = '';
    }
  },

  renderOpcionesEditorHTML(tipo) {
    const esMultiple = esTipoSeleccionMultiple(tipo);
    const tipoCorrecta = esMultiple ? 'checkbox' : 'radio';
    const nombreCorrecta = esMultiple ? 'opcCorrecta' : 'opcCorrectaUnica';
    const rows = (state.opcionesRows || []).map((r, i) => {
      const onchange = esMultiple
        ? `state.opcionesRows[${i}].correcta=this.checked`
        : `state.opcionesRows.forEach(r=>r.correcta=false); state.opcionesRows[${i}].correcta=this.checked`;
      return `
      <div class="opcion-fila">
        <input type="text" class="opc-clave" maxlength="3" value="${escapeHtml(r.clave)}" placeholder="A" oninput="state.opcionesRows[${i}].clave=this.value.trim()">
        <input type="text" class="opc-texto" value="${escapeHtml(r.texto)}" placeholder="Texto de la opción" oninput="state.opcionesRows[${i}].texto=this.value">
        <label class="opc-correcta-label">Correcta
          <input type="${tipoCorrecta}" name="${nombreCorrecta}" class="opc-correcta" ${r.correcta ? 'checked' : ''} onchange="${onchange}">
        </label>
        <button type="button" class="ghost" onclick="window.App.agregarOpcionFila(${i})" title="Añadir opción">＋</button>
        <button type="button" class="ghost" onclick="window.App.quitarOpcionFila(${i})" title="Quitar opción">🗑</button>
      </div>
    `;
    }).join('');
    return `
      <label>Opciones de respuesta</label>
      ${rows}
      <p class="empty" style="font-size:12px; margin:4px 0 0;">Marca la(s) opción(es) correcta(s). La respuesta correcta nunca la verá el estudiante.</p>
    `;
  },

  agregarOpcionFila(index) {
    (state.opcionesRows || []).splice(index + 1, 0, { clave: this.defaultLetraOpcion(), texto: '', correcta: false });
    const area = document.getElementById('opcionesArea');
    const tipo = document.getElementById('newTipo')?.value || '';
    if (area) area.innerHTML = this.renderOpcionesEditorHTML(tipo);
  },

  quitarOpcionFila(index) {
    if ((state.opcionesRows || []).length <= 2) { toast('Debe haber al menos 2 opciones'); return; }
    (state.opcionesRows || []).splice(index, 1);
    const area = document.getElementById('opcionesArea');
    const tipo = document.getElementById('newTipo')?.value || '';
    if (area) area.innerHTML = this.renderOpcionesEditorHTML(tipo);
  },

  leerOpcionesEditor() {
    const rows = (state.opcionesRows || []).map(r => ({
      clave: String(r.clave || '').trim(),
      texto: String(r.texto || '').trim(),
      correcta: !!r.correcta
    }));
    const opciones = rows.filter(r => r.clave && r.texto).map(r => ({ clave: r.clave, texto: r.texto }));
    const correctas = rows.filter(r => r.correcta && r.clave).map(r => r.clave);
    return { opciones, correctas };
  },

  updateMetodologiaHint() {
    const sel = document.getElementById('newMetodologia');
    const hint = document.getElementById('newMetodologiaHint');
    if (!sel || !hint) return;
    hint.textContent = state.metodologiaHints[sel.value] || 'Selecciona una metodología para ver la descripción.';
  },

  autocompletarPista() {
    const temaInput = document.getElementById('newTema');
    const pistaInput = document.getElementById('newPista');
    if (!temaInput || !pistaInput) return;

    const tema = temaInput.value.trim();
    if (!tema) return;

    const plantillasPista = [
      // Matemáticas
      { matcher: /carita/i, pista: 'No olvides aplicar el método de la carita sonriente para hallar el denominador común.' },
      { matcher: /diferente denom/i, pista: 'Encuentra el mínimo común múltiplo (mcm) de los denominadores antes de sumar.' },
      { matcher: /mismo denom/i, pista: 'Si el denominador es igual, se deja igual y solo se suman los numeradores.' },
      { matcher: /multiplic/i, pista: 'En la multiplicación no se busca denominador común: numerador por numerador, denominador por denominador.' },
      { matcher: /grafic/i, pista: 'Divide la figura en el número de partes indicado por el denominador y colorea el numerador.' },
      // Inglés
      { matcher: /to ?be/i, pista: 'Recuerda la conjugación según el sujeto: I (am), He/She/It (is), You/We/They (are).' },
      { matcher: /verbo to be/i, pista: 'Recuerda la conjugación según el sujeto: I (am), He/She/It (is), You/We/They (are).' },
      { matcher: /pronombr/i, pista: 'Identifica si el sujeto es singular o plural para elegir el pronombre correcto (he/she/it/they/we).' },
      { matcher: /traducci/i, pista: 'Traduce la oración completa al español primero para entender el contexto y elegir la palabra correcta.' }
    ];

    const esPlantilla = plantillasPista.some(p => pistaInput.value.trim().toLowerCase() === p.pista.toLowerCase());
    if (pistaInput.value.trim() && !esPlantilla) return;

    const match = plantillasPista.find(p => p.matcher.test(tema));
    if (match) {
      pistaInput.value = match.pista;
    }
  },

  filtrarEjerciciosDisponibles() {
    const searchTerm = document.getElementById('searchEjercicios')?.value.toLowerCase() || '';
    const filtroTema = document.getElementById('filtroTema')?.value || '';
    const filtroMetodologia = document.getElementById('filtroMetodologia')?.value || '';
    
    const ejerciciosEnTarea = state.currentTaskExercises || [];
    let ejerciciosFiltrados = state.allEjercicios.filter(ej => 
      !ejerciciosEnTarea.some(e => e.id === ej.id)
    );
    
    if (searchTerm) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => 
        ej.enunciado.toLowerCase().includes(searchTerm) ||
        ej.tema.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filtroTema) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.tema === filtroTema);
    }
    
    if (filtroMetodologia) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => 
        ej.metodologia && ej.metodologia.toLowerCase().includes(filtroMetodologia)
      );
    }
    
    const countElement = document.getElementById('countDisponibles');
    if (countElement) {
      countElement.textContent = ejerciciosFiltrados.length;
    }
    
    const listaElement = document.getElementById('listaEjerciciosDisponibles');
    if (listaElement) {
      const esMat = state.currentTaskView?.materia === 'matematicas';
      
      if (ejerciciosFiltrados.length === 0) {
        listaElement.innerHTML = '<p class="empty">No se encontraron ejercicios con los filtros aplicados.</p>';
        return;
      }
      
      listaElement.innerHTML = ejerciciosFiltrados.map(ej => `
        <div class="ex-item" style="border-style:dashed;">
          <div class="top">
            <div>
              <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
              <div class="ex-enun">${formatMathText(ej.enunciado)}</div>
            </div>
            <button class="primary" onclick="window.App.agregarEjercicioATarea('${ej.id}')">➕ Agregar</button>
          </div>
        </div>
      `).join('');
    }
  },

  async guardarEjercicio() {
    const addBtn = document.getElementById('addExBtn');
    if (!addBtn) return;
    
    const materia = addBtn.dataset.materia;
    const tema = document.getElementById('newTema').value || 'General';
    const tipo = document.getElementById('newTipo').value;
    const metodologia = document.getElementById('newMetodologia').value;
    const enunciado = document.getElementById('newEnun').value.trim();
    let respuestaCorrecta = document.getElementById('newResp').value.trim();
    const pistaError = document.getElementById('newPista').value.trim() || 'Vuelve a revisar el procedimiento paso a paso.';
    
    if (!enunciado) { toast('⚠️ Completa el enunciado'); return; }

    const data = { materia, tema, tipo, enunciado, respuestaCorrecta, pistaError, metodologia };
    
    if (['fraccion_grafica', 'grafico_interactivo'].includes(tipo)) {
      const fracMatch = String(data.respuestaCorrecta).match(/(\d+)\s*\/\s*(\d+)/);
      if (!fracMatch) { toast('⚠️ Escribe la fracción en forma numerador/denominador (ej: 3/5)'); return; }
      data.grafica = {
        numerador: Number(fracMatch[1]),
        denominador: Number(fracMatch[2]),
        forma: document.getElementById('newGraficaForma')?.value || 'rectangulo'
      };
    }
    
    if (esTipoSeleccion(tipo)) {
      const { opciones, correctas } = this.leerOpcionesEditor();
      if (opciones.length < 2) { toast('⚠️ Agrega al menos 2 opciones con texto'); return; }
      if (correctas.length === 0) { toast('⚠️ Marca cuál(es) opción(es) es/son la(s) correcta(s)'); return; }
      if (!esTipoSeleccionMultiple(tipo) && correctas.length > 1) { toast('⚠️ Selección única: marca solo una respuesta correcta'); return; }
      data.opciones = opciones;
      data.respuestaCorrecta = esTipoSeleccionMultiple(tipo) ? correctas : correctas[0];
    }
    
    if (!data.respuestaCorrecta) { toast('⚠️ Completa la respuesta correcta'); return; }

    try {
      await API.crearEjercicio(data);
      toast('✅ Ejercicio guardado');
      state.opcionesRows = [
        { clave: 'a', texto: '', correcta: false },
        { clave: 'b', texto: '', correcta: false }
      ];
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) { toast('⚠️ ' + e.message); }
  },

  async editarEjercicio(id, field, value) {
    try {
      await API.editarEjercicio(id, { [field]: value });
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async eliminarEjercicio(id) {
    const confirmar = window.confirm('¿Seguro que quieres eliminar este ejercicio?');
    if (!confirmar) return;

    try {
      await API.eliminarEjercicio(id);
      toast('🗑️ Ejercicio eliminado');
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  }
};