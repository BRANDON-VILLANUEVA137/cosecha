import { state } from '../state.js';
import { escapeHtml, formatMathText } from '../utils/formatters.js';

// Si API y Personaje son globales, declararlas así ayuda a VS Code a no marcar error:
const API = window.API;
const Personaje = window.Personaje;

export const AnalyticsRenderers = {
  async renderAnalyticsEstudiante(appInstance) {
    // Cargar la lista de estudiantes para el selector
    let estudiantes = [];
    try {
      const analyticsGrupo = await API.getAnalyticsGrupo();
      // Normalizar: puede llegar como { estudiantes: [...] } o directamente un array
      estudiantes = Array.isArray(analyticsGrupo) ? analyticsGrupo : (analyticsGrupo.estudiantes || []);
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
    }

    // Cargar tareas disponibles para el filtro por tarea
    try {
      appInstance.tareasDisponibles = await API.getTareas();
      if (!Array.isArray(appInstance.tareasDisponibles)) appInstance.tareasDisponibles = [];
    } catch (e) {
      console.error('Error cargando tareas para filtro:', e);
      appInstance.tareasDisponibles = [];
    }

    // Si no hay estudiante seleccionado, mostrar selector con lista cargada
    if (!appInstance.selectedEstudianteId) {
      const estudiantesHtml = estudiantes.length > 0
        ? estudiantes.map(e => `
            <div class="ex-item" style="cursor:pointer;" onclick="App.selectedEstudianteId = '${e.estudianteId}'; App.render();">
              <div class="top">
                <div>
                  <strong>${e.nombre || e.email}</strong>
                  <div style="font-size:12px; color:var(--texto-suave);">
                    ${e.totalIntentos > 0 ? `${e.totalIntentos} intentos · ${e.tasaAcierto}% acierto` : 'Sin actividad aún'}
                  </div>
                </div>
                <button class="ghost">Ver detalle →</button>
              </div>
            </div>
          `).join('')
        : '<p class="empty">No hay estudiantes registrados</p>';

      return `
        <div class="card">
          <h2>Seleccionar Estudiante</h2>
          <p style="color:var(--texto-suave); margin-bottom:14px;">Elige un estudiante para ver su análisis detallado de desempeño.</p>
          <div id="listaEstudiantes">
            ${estudiantesHtml}
          </div>
        </div>
      `;
    }

    try {
      const analytics = await API.getAnalyticsEstudiante(appInstance.selectedEstudianteId, appInstance.analyticsFiltros);

      if (!analytics) {
        return '<p class="empty">Error al cargar analytics del estudiante</p>';
      }

      const metrics = analytics.metrics || {};
      const porMetodologia = analytics.porMetodologia || {};
      const porTema = analytics.porTema || {};
      const criticos = analytics.criticos || {};
      const historial = analytics.historial || [];
      const estudianteInfo = analytics.estudiante || {};
      const nombreEstudiante = estudianteInfo.nombre || estudiantes.find(e => e.estudianteId === appInstance.selectedEstudianteId)?.nombre || 'Estudiante';

      // Derivar temas disponibles del historial (único por materia)
      appInstance.temasDisponibles = [...new Set(historial.map(h => h.tema).filter(Boolean))];

      // Aplicar filtros locales (materia, tarea, tema) al historial
      let historialFiltrado = historial;
      if (appInstance.analyticsFilterMateria) {
        historialFiltrado = historialFiltrado.filter(h => h.materia === appInstance.analyticsFilterMateria);
      }
      if (appInstance.analyticsFilterTarea) {
        historialFiltrado = historialFiltrado.filter(h => h.tareaId === appInstance.analyticsFilterTarea);
      }
      if (appInstance.analyticsFilterTema) {
        historialFiltrado = historialFiltrado.filter(h => h.tema === appInstance.analyticsFilterTema);
      }

      // Selector desplegable de estudiante + barra de filtros
      const selectorEstudiante = `
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <label style="font-weight:600;">👤 Estudiante:</label>
          <select id="selectEstudiante" onchange="App.selectedEstudianteId = this.value; App.render();"
                  style="padding:8px; border:1px solid var(--borde); border-radius:6px; flex:1; min-width:200px; background:var(--fondo-2);">
            ${estudiantes.map(e => `
              <option value="${e.estudianteId}" ${e.estudianteId === appInstance.selectedEstudianteId ? 'selected' : ''}>
                ${e.nombre || e.email}
              </option>
            `).join('')}
          </select>
        </div>
      `;

      // Barra de filtros (Asignatura, Tarea, Tema)
      const filtrosBar = `
        <div style="background:var(--fondo-2); padding:12px; border-radius:8px; margin-bottom:14px;">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
            <strong style="font-size:13px;">🔍 Filtrar análisis:</strong>
            <select onchange="App.analyticsFilterMateria = this.value; App.render();"
                    style="flex:1; min-width:150px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">📙 Todas las asignaturas</option>
              <option value="matematicas" ${appInstance.analyticsFilterMateria === 'matematicas' ? 'selected' : ''}>📙 Matemáticas</option>
              <option value="ingles" ${appInstance.analyticsFilterMateria === 'ingles' ? 'selected' : ''}>🌴 Inglés</option>
            </select>
            <select onchange="App.analyticsFilterTarea = this.value; App.render();"
                    style="flex:1; min-width:180px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">📚 Todas las tareas</option>
              ${(appInstance.tareasDisponibles || []).map(t => `
                <option value="${t.id}" ${appInstance.analyticsFilterTarea === t.id ? 'selected' : ''}>${t.titulo}</option>
              `).join('')}
            </select>
            <select onchange="App.analyticsFilterTema = this.value; App.render();"
                    style="flex:1; min-width:160px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">🏷️ Todos los temas</option>
              ${appInstance.temasDisponibles.map(tema => `
                <option value="${tema}" ${appInstance.analyticsFilterTema === tema ? 'selected' : ''}>${tema}</option>
              `).join('')}
            </select>
          </div>
        </div>
      `;

      // Header del estudiante
      const estado = metrics.totalIntentos > 0 ? 'Activo' : 'Sin actividad';
      const headerEstudiante = `
        <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <h2 style="margin:0;">${nombreEstudiante}</h2>
              <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
                <span class="tag" style="background:${estado === 'Activo' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">${estado}</span>
                <span class="tag mat">Tasa Global de Éxito: ${metrics.tasaAcierto || 0}% (${metrics.intentosCorrectos || 0}/${metrics.totalIntentos || 0} aciertos)</span>
              </div>
            </div>
            <div class="stat-row" style="margin:0;">
              <div class="stat"><b>${metrics.totalIntentos || 0}</b><span>INTENTOS</span></div>
              <div class="stat"><b>${metrics.intentosCorrectos || 0}</b><span>CORRECTOS</span></div>
              <div class="stat"><b>${metrics.pistasTotales || 0}</b><span>PISTAS</span></div>
            </div>
          </div>
        </div>
      `;

      // --- DIAGNÓSTICO POR TEMA (agrupado con semáforo) ---
      // Agrupar el historial filtrado por tema
      const temasAgrupados = {};
      (historialFiltrado || []).forEach(h => {
        const clave = h.tema || 'General';
        if (!temasAgrupados[clave]) {
          temasAgrupados[clave] = { total: 0, correctos: 0, pistasUsadas: 0, metodologia: h.metodologia || 'Estándar / Directo', materia: h.materia };
        }
        temasAgrupados[clave].total++;
        if (h.correcto) temasAgrupados[clave].correctos++;
        temasAgrupados[clave].pistasUsadas += h.pistasUsadas || 0;
      });

      // Calcular porcentaje y determinar estado semáforo
      const temasHtml = Object.entries(temasAgrupados).length > 0 ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>📊 Diagnóstico por Tema</h3>
          <div style="display:grid; gap:10px; margin-top:10px;">
            ${Object.entries(temasAgrupados).map(([nombre, data]) => {
              const pct = data.total > 0 ? Math.round((data.correctos / data.total) * 100) : 0;
              // Semáforo: >=80 óptimo (🟩), 60-79 en proceso (🟨), <60 deficiente (🟥)
              const estado = pct >= 80 ? { color: '#4CAF50', emoji: '🟩', label: 'Dominado' }
                : pct >= 60 ? { color: '#FFC107', emoji: '🟨', label: 'En Proceso' }
                : { color: '#F44336', emoji: '🟥', label: '⚠️ Requiere Refuerzo' };
              const iconoMateria = data.materia === 'matematicas' ? '📙' : '🌴';
              const alerta = pct < 60 ? `<div style="font-size:12px; color:#F44336; margin-top:4px;">⚠️ Deficiencia detectada en: ${nombre}</div>` : '';
              return `
                <div style="background:var(--fondo-2); padding:14px; border-radius:8px; border-left:5px solid ${estado.color};">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <strong>${estado.emoji} ${iconoMateria} ${nombre}</strong>
                    <span style="background:${estado.color}; color:white; padding:4px 10px; border-radius:4px; font-size:13px; font-weight:bold;">
                      ${pct}% · ${estado.label}
                    </span>
                  </div>
                  <div style="background:var(--borde); height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:${estado.color}; height:100%; width:${pct}%; transition:width 0.3s;"></div>
                  </div>
                  <div style="font-size:12px; color:var(--texto-suave); margin-top:4px;">
                    ${data.total} ejercicios · ${data.correctos} correctos · ${data.pistasUsadas} pistas · ${data.metodologia}
                  </div>
                  ${alerta}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : '';

      // Tabla de Historial (filtrado, con columnas Asignatura y Tema/Tarea)
      const historialHtml = historialFiltrado.length > 0 ? `
        <div class="card">
          <h3>📋 Historial Completo del Estudiante (${historialFiltrado.length} registros)</h3>
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Asignatura</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Tema / Tarea</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Enunciado</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Metodología</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Respuesta</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Resultado</th>
                </tr>
              </thead>
              <tbody>
                ${historialFiltrado.map(h => {
                  const tarea = appInstance.tareasDisponibles.find(t => t.id === h.tareaId);
                  const tareaLabel = tarea ? tarea.titulo : (h.tareaId ? 'Tarea' : 'Práctica libre');
                  const materiaLabel = h.materia === 'matematicas' ? '📙 Mate' : '🌴 Inglés';
                  return `
                  <tr style="border-bottom:1px solid var(--borde);">
                    <td style="padding:10px;"><span class="tag" style="background:${h.materia === 'matematicas' ? 'var(--primario)' : 'var(--secundario)'}; color:white;">${materiaLabel}</span></td>
                    <td style="padding:10px; font-size:12px;">${h.tema || 'General'}<br><small style="color:var(--texto-suave);">${tareaLabel}</small></td>
                    <td style="padding:10px;">${appInstance.formatMathText(h.enunciado || 'N/A')}</td>
                    <td style="padding:10px;">${h.metodologia || 'Estándar / Directo'}</td>
                    <td style="padding:10px; text-align:center;">${appInstance.formatMathText(h.respuesta || 'N/A')}</td>
                    <td style="padding:10px; text-align:center;">
                      <span class="tag" style="background:${h.correcto ? 'var(--secundario)' : 'var(--error-suave)'}; color:white;">
                        ${h.correcto ? '✅ Correcto' : '❌ Incorrecto'}
                      </span>
                    </td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : '<p class="empty">No hay registros que coincidan con los filtros aplicados</p>';

      // Alertas de metodologías/temas críticos
      const alertas = [];
      if (criticos.metodologia && criticos.metodologia.porcentaje < 60) {
        alertas.push(`⚠️ Requiere refuerzo en: ${criticos.metodologia.nombre} (${criticos.metodologia.porcentaje}%)`);
      }
      if (criticos.tema && criticos.tema.porcentaje < 60) {
        alertas.push(`⚠️ Tema crítico: ${criticos.tema.nombre} (${criticos.tema.porcentaje}%)`);
      }
      // Mapear porTema también para las alertas (el endpoint incluye ambos)
      if (porTema && Object.keys(porTema).length > 0) {
        const temaCritico = Object.entries(porTema).sort((a, b) => (a[1]?.porcentaje || 0) - (b[1]?.porcentaje || 0))[0];
        if (temaCritico && (temaCritico[1]?.porcentaje || 0) < 60) {
          alertas.push(`⚠️ Tema a reforzar: ${temaCritico[0]} (${temaCritico[1]?.porcentaje || 0}%)`);
        }
      }

      const alertasHtml = alertas.length > 0 ? `
        <div style="background:var(--error-suave); color:white; padding:12px; border-radius:8px; margin-bottom:14px;">
          <strong>Alertas Pedagógicas:</strong>
          <ul style="margin:8px 0 0 0; padding-left:20px;">
            ${alertas.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      return `
        ${selectorEstudiante}
        ${filtrosBar}
        ${headerEstudiante}
        ${alertasHtml}
        ${temasHtml}
        ${historialHtml}
      `;
    } catch (e) {
      return `<p class="empty">⚠️ Error: ${e.message}</p>`;
    }
  },

 async renderAnalyticsGrupo(data) {
    if (!data) return '<p class="empty">Error al cargar datos</p>';
    const estudiantes = Array.isArray(data) ? data : (data.estudiantes || []);
    const totalEstudiantes = data.totalEstudiantes ?? estudiantes.length;
    const promedioGrupo = data.promedioGrupo || 0;
    
    // --- Vista mejorada del dashboard grupal ---
    const estudiantesHtml = estudiantes.map(e => `
      <div class="ex-item">
        <div class="top">
          <div>
            <strong>${escapeHtml(e.nombre || e.email)}</strong>
            <div style="font-size:12px; color:var(--texto-suave);">
              ${e.totalIntentos > 0 ? `${e.totalIntentos} intentos · ${e.tasaAcierto}% acierto` : 'Sin actividad aún'}
            </div>
          </div>
          <button class="ghost" onclick="window.App.selectedEstudianteId = '${e.estudianteId}'; window.App.analyticsView = 'estudiante'; window.App.render();">
            Ver detalle →
          </button>
        </div>
      </div>
    `).join('') || '<p class="empty">No hay estudiantes registrados</p>';

    return `
      <div class="card">
        <h2>📊 Dashboard del Grupo</h2>
        <div class="stat-row" style="margin-bottom:16px;">
          <div class="stat"><b>${totalEstudiantes}</b><span>ESTUDIANTES</span></div>
          <div class="stat"><b>${promedioGrupo}%</b><span>PROMEDIO GENERAL</span></div>
        </div>
        <h3>👥 Lista de estudiantes</h3>
        <div style="margin-top:10px;">${estudiantesHtml}</div>
      </div>
    `;
  },

  cambiarAnalyticsView(appInstance, view) {
    appInstance.analyticsView = view;
    appInstance.selectedEstudianteId = null;
    appInstance.analyticsFilterMateria = '';
    appInstance.analyticsFilterTarea = '';
    appInstance.analyticsFilterTema = '';
    appInstance.render();
  }
};
