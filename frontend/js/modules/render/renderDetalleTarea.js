/**
 * Renderizado del detalle de una tarea (vista docente)
 */

import { state } from '../state.js';
import { formatMathText, escapeHtml } from '../utils/formatters.js';

const API = window.API;

export async function renderDetalleTarea() {
  if (!state.currentTaskView) return '';
  
  const tarea = state.currentTaskView;
  const ejerciciosEnTarea = state.currentTaskExercises || [];
  const esMat = tarea.materia === 'matematicas';
  const estaPublicada = tarea.estado === 'publicada';
  
  const ejerciciosDisponibles = state.allEjercicios.filter(ej => 
    !ejerciciosEnTarea.some(e => e.id === ej.id)
  );

  const ejerciciosHtml = ejerciciosEnTarea.map(ej => `
    <div class="ex-item">
      <div class="top">
        <div>
          <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
          <div class="ex-enun">${formatMathText(ej.enunciado)}</div>
        </div>
        <button class="ghost" onclick="window.App.eliminarEjercicioDeTarea('${ej.id}')" style="color:var(--error-suave);">❌ Quitar</button>
      </div>
    </div>
  `).join('') || '<p class="empty">No hay ejercicios en esta tarea.</p>';

  const disponiblesHtml = ejerciciosDisponibles.map(ej => `
    <div class="ex-item" style="border-style:dashed;">
      <div class="top">
        <div>
          <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
          <div class="ex-enun">${formatMathText(ej.enunciado)}</div>
        </div>
        <button class="primary" onclick="window.App.agregarEjercicioATarea('${ej.id}')">➕ Agregar</button>
      </div>
    </div>
  `).join('') || '<p class="empty">Todos los ejercicios están en la tarea.</p>';

  return `
    <div class="card">
      <div class="module-header">
        <div class="badge" style="background:var(--acento);">📚</div>
        <div>
          <h2>${tarea.titulo}</h2>
          <p>${tarea.descripcion || 'Sin descripción'}</p>
        </div>
      </div>
      <div class="task-nav-row">
        <button class="ghost" onclick="window.App.closeTaskView()">← Volver a tareas</button>
        <button class="ghost" onclick="window.App.eliminarTarea('${tarea.id}')" style="color:var(--error-suave);">🗑️ Eliminar Tarea</button>
      </div>
      <div class="task-meta">
        ${ejerciciosEnTarea.length} ejercicios · 
        <span class="tag" style="background:${estaPublicada ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
          ${estaPublicada ? 'Publicada' : 'Borrador'}
        </span>
      </div>
      <div style="margin-top:10px;">
        <button class="primary" onclick="window.App.publicarTarea('${tarea.id}', '${estaPublicada ? 'borrador' : 'publicada'}')">
          ${estaPublicada ? '📝 Despublicar' : '🚀 Publicar Tarea'}
        </button>
      </div>
    </div>

    <div class="card">
      <h3>📋 Ejercicios de la tarea (${ejerciciosEnTarea.length})</h3>
      <div style="margin-top:10px;">${ejerciciosHtml}</div>
    </div>

    <div class="card">
      <h3>➕ Agregar ejercicios desde el banco</h3>
      <div style="background:var(--fondo-2); padding:12px; border-radius:8px; margin-bottom:12px;">
        <input type="text" id="searchEjercicios" placeholder="🔍 Buscar por enunciado o tema..." 
               style="width:100%; padding:8px; border:1px solid var(--borde); border-radius:4px; margin-bottom:8px;"
               oninput="window.App.filtrarEjerciciosDisponibles()">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <select id="filtroTema" onchange="window.App.filtrarEjerciciosDisponibles()" 
                  style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
            <option value="">Todos los temas</option>
          </select>
          <select id="filtroMetodologia" onchange="window.App.filtrarEjerciciosDisponibles()" 
                  style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
            <option value="">Todas las metodologías</option>
            <option value="estándar">Estándar / Directo</option>
            <option value="paso">Paso a Paso</option>
            <option value="graficación">Graficación</option>
            <option value="desafío">Desafío</option>
          </select>
        </div>
      </div>
      <p style="color:var(--texto-suave); font-size:13px; margin-bottom:8px;">
        Mostrando <b id="countDisponibles">${ejerciciosDisponibles.length}</b> ejercicios disponibles
      </p>
      <div id="listaEjerciciosDisponibles" style="margin-top:10px;">
        ${disponiblesHtml}
      </div>
    </div>
  `;
}