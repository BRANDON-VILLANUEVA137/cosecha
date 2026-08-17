/**
 * Renderizado de la vista Docente (materias, tareas, banco, crear)
 */

import { state } from '../state.js';
import { formatMathText, escapeHtml, esTipoSeleccion, esTipoSeleccionMultiple, getDynamicModeHint } from '../utils/formatters.js';

const API = window.API;

export async function renderDocenteMateria(materia) {
  const esMat = materia === 'matematicas';
  const [ejercicios, tareas] = await Promise.all([
    API.getEjercicios(materia),
    API.getTareas()
  ]);

  state.allEjercicios = ejercicios;

  const tareasFiltradas = tareas.filter(t => t.materia === materia);

  const tareasConEjercicios = await Promise.all(
    tareasFiltradas.map(async (tarea) => {
      try {
        const tareaCompleta = await API.getTarea(tarea.id);
        return {
          ...tarea,
          ejercicios: tareaCompleta.ejercicios || [],
          estado: tareaCompleta.estado || 'borrador'
        };
      } catch (e) {
        console.error('Error cargando tarea:', tarea.id, e);
        return { ...tarea, ejercicios: [], estado: tarea.estado || 'borrador' };
      }
    })
  );

  const lista = ejercicios.map(e => `
    <div class="ex-item">
      <div class="top">
        <div>
          <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
          <div class="ex-enun">${formatMathText(e.enunciado)}</div>
          <div class="hint-preview">Metodología: ${e.metodologia || 'Estándar / Directo'}</div>
        </div>
        <button class="ghost" data-delete-ex="${e.id}" style="color:var(--error-suave); border-color:rgba(255,107,107,.35);">🗑️ Eliminar</button>
      </div>
      <label>Respuesta correcta (oculta para la estudiante)</label>
      <input type="text" value="${e.respuestaCorrecta}" data-ex="${e.id}" class="ans-edit">
      <label>Pista si falla</label>
      <input type="text" value="${e.pistaError}" data-ex="${e.id}" class="hint-edit">
      <div class="hint-preview"><strong>Pista:</strong> ${formatMathText(e.pistaError || 'Sin pista')}</div>
    </div>`).join('') || '<p class="empty">Sin ejercicios todavía.</p>';

  const tabActiva = state.currentDocenteTab || 'tareas';
  
  let contenidoTab = '';
  if (tabActiva === 'tareas') {
    const tareasHtml = tareasConEjercicios.map(t => `
      <div class="task-card task-module-card">
        <div class="task-module-head">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">Tarea</span>
            <h3>${t.titulo}</h3>
          </div>
          <span class="task-status" style="background:${t.estado === 'publicada' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">${t.estado === 'publicada' ? 'Publicada' : 'Borrador'}</span>
        </div>
        <p>${t.descripcion || 'Sin descripción'}</p>
        <div class="task-meta">${t.ejercicios?.length || 0} ejercicios</div>
        <div class="task-actions">
          <button class="ghost" onclick="window.App.verTareaDocente('${t.id}')">📋 Ver/Editar</button>
          <button class="ghost" onclick="window.App.eliminarTarea('${t.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">No hay tareas creadas.</p>';

    contenidoTab = `
      <div style="margin-bottom:14px;">
        <button class="primary" onclick="window.App.mostrarFormTarea('${materia}')">➕ Nueva Tarea</button>
        <div id="formTarea" style="display:none; margin-top:14px;">
          <div class="card" style="background:var(--fondo-2);">
            <h3>Nueva Tarea</h3>
            <label>Título</label>
            <input type="text" id="tareaTitulo" placeholder="Ej: Práctica de fracciones">
            <label>Descripción</label>
            <input type="text" id="tareaDescripcion" placeholder="Ej: Ejercicios de suma de fracciones">
            <label>Materia</label>
            <input type="text" value="${esMat ? 'Matemáticas' : 'Inglés'}" disabled>
            <div style="margin-top:10px;">
              <button class="primary" onclick="window.App.crearTarea('${materia}')">Guardar Tarea</button>
              <button class="ghost" onclick="window.App.ocultarFormTarea()">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      <div>${tareasHtml}</div>
    `;
  } else if (tabActiva === 'banco') {
    contenidoTab = `
      <div class="module-header">
        <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '🍊' : '🌴'}</div>
        <div><h2>${esMat ? 'Matemáticas' : 'Inglés'}</h2><p>Banco de ejercicios de este módulo</p></div>
      </div>
      <label>Modo de clase</label>
      <select id="dynamicModeSelect">
        <option value="paso">Paso a paso (Carita Sonriente)</option>
        <option value="grafico">Graficación Geométrica</option>
        <option value="desafio">Desafío Contrarreloj</option>
        <option value="gramatica">Opción Múltiple / Gramática</option>
      </select>
      <div class="hint-preview" id="dynamicModeHint">${getDynamicModeHint(state.currentDynamicMode)}</div>
      <div style="margin-top:14px;">${lista}</div>
    `;
  } else if (tabActiva === 'crear') {
    const tiposMat = `
      <option value="fraccion">Fracción (a/b)</option>
      <option value="fraccion_simplificada">Fracción simplificada (irreducible)</option>
      <option value="decimal">Número decimal</option>
      <option value="fraccion_grafica">Gráfica de fracción (tortas/rectángulos)</option>
      <option value="entero">Número Entero</option>
      <option value="opcion_multiple">Selección única (radio)</option>
      <option value="multiple">Selección múltiple (varias)</option>
    `;
    const tiposIng = `
      <option value="completar">Completar Espacio (Fill in the blank)</option>
      <option value="opcion_multiple">Selección única (radio)</option>
      <option value="multiple">Selección múltiple (varias)</option>
      <option value="traduccion">Traducción</option>
    `;
    const tipos = esMat ? tiposMat : tiposIng;
    const placeholderEnun = esMat ? 'Ej: 4/9 + 1/3 = ?' : 'Ej: She ___ (be) a doctor.';
    const placeholderResp = esMat ? 'Ej: 7/9' : 'Ej: is';
    const placeholderTema = esMat ? 'Ej: Fracciones · Carita Sonriente' : 'Ej: Verbo To Be · Pronombres';

    contenidoTab = `
      <h2>➕ Nuevo ejercicio de ${esMat ? 'Matemáticas' : 'Inglés'}</h2>
      <div class="grid2">
        <div>
          <label>Tema / Categoría</label>
          <input type="text" id="newTema" placeholder="${placeholderTema}" oninput="window.App.autocompletarPista()">
          <label>Tipo</label>
          <select id="newTipo" onchange="window.App.toggleOpcionesEditor()">${tipos}</select>
          <label>Metodología</label>
          <select id="newMetodologia" onchange="window.App.updateMetodologiaHint()">
            <option value="Estándar / Directo">Estándar / Directo</option>
            <option value="Paso a Paso (Carita Sonriente)">Paso a Paso (Carita Sonriente)</option>
            <option value="Graficación Interactiva">Graficación Interactiva</option>
            <option value="Desafío Contrarreloj">Desafío Contrarreloj</option>
            <option value="Opción Múltiple / Gramática">Opción Múltiple / Gramática</option>
          </select>
          <div class="hint-preview" id="newMetodologiaHint">${state.metodologiaHints['Estándar / Directo']}</div>
        </div>
        <div>
          <label>Enunciado</label>
          <textarea id="newEnun" placeholder="${placeholderEnun}"></textarea>
          <div id="newRespContainer">
            <label>Respuesta correcta (no la verá la estudiante)</label>
            <input type="text" id="newResp" placeholder="${placeholderResp}">
          </div>
          <label>Pista en caso de error</label>
          <input type="text" id="newPista" placeholder="Se autocompleta según el tema...">
        </div>
      </div>
      <div id="opcionesArea" style="margin-top:14px; display:none;"></div>
      <div id="graficaArea" style="margin-top:14px; display:none;">
        <label>Forma de la figura</label>
        <select id="newGraficaForma">
          <option value="rectangulo">Rectángulo (barra)</option>
          <option value="circulo">Círculo (torta)</option>
        </select>
        <p class="empty" style="font-size:12px; margin:6px 0 0;">El estudiante coloreará las partes de la figura y el sistema validará la representación exacta. Para que el ejercicio funcione usa una fracción <b>propia</b> en "Respuesta correcta": 1&nbsp;≤&nbsp;numerador&nbsp;≤&nbsp;denominador y denominador&nbsp;≤&nbsp;24 (ej:&nbsp;7/9).</p>
      </div>
      <div style="margin-top:14px;"><button class="primary" id="addExBtn" data-materia="${materia}">Guardar ejercicio</button></div>
    `;
  }

  return `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="${tabActiva === 'tareas' ? 'primary' : 'ghost'}" onclick="window.App.cambiarTabDocente('tareas')">
          📋 Mis Tareas
        </button>
        <button class="${tabActiva === 'banco' ? 'primary' : 'ghost'}" onclick="window.App.cambiarTabDocente('banco')">
          📦 Banco de Ejercicios
        </button>
        <button class="${tabActiva === 'crear' ? 'primary' : 'ghost'}" onclick="window.App.cambiarTabDocente('crear')">
          ➕ Crear Ejercicio
        </button>
      </div>
    </div>
    <div class="card">
      ${contenidoTab}
    </div>
  `;
}