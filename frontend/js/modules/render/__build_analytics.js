const fs = require('fs');
const path = require('path');
const filepath = path.join(__dirname, 'analyticsRenderers.js');

const header = `import { state } from '../state.js';
const API = window.API;
const Personaje = window.Personaje;

export const AnalyticsRenderers = {`;

const part1 = `  async renderAnalyticsEstudiante(appInstance) {
    let estudiantes = [];
    try {
      const analyticsGrupo = await API.getAnalyticsGrupo();
      estudiantes = Array.isArray(analyticsGrupo) ? analyticsGrupo : (analyticsGrupo.estudiantes || []);
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
    }

    try {
      appInstance.tareasDisponibles = await API.getTareas();
      if (!Array.isArray(appInstance.tareasDisponibles)) appInstance.tareasDisponibles = [];
    } catch (e) {
      console.error('Error cargando tareas para filtro:', e);
      appInstance.tareasDisponibles = [];
    }

    if (!appInstance.selectedEstudianteId) {
      const estudiantesHtml = estudiantes.length > 0
        ? estudiantes.map(e => '<div class="ex-item" style="cursor:pointer;" onclick="App.selectedEstudianteId = \\'' + e.estudianteId + '\\'; App.render();"><div class="top"><div><strong>' + (e.nombre || e.email) + '</strong><div style="font-size:12px; color:var(--texto-suave);">' + (e.totalIntentos > 0 ? e.totalIntentos + ' intentos' : 'Sin actividad aún') + '</div></div><button class="ghost">Ver detalle</button></div></div>').join('')
        : '<p class="empty">No hay estudiantes registrados</p>';

      return '<div class="card"><h2>Seleccionar Estudiante</h2><p style="color:var(--texto-suave); margin-bottom:14px;">Elige un estudiante para ver su análisis.</p><div id="listaEstudiantes">' + estudiantesHtml + '</div></div>';
    }
`;

const part2 = `    try {
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
      const nombreEstudiante = estudianteInfo.nombre || (estudiantes.find(e => e.estudianteId === appInstance.selectedEstudianteId) || {}).nombre || 'Estudiante';

      appInstance.temasDisponibles = [...new Set(historial.map(h => h.tema).filter(Boolean))];

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

      const filtrosBar = '<div class="card" style="margin-bottom:14px;">Filtros</div>';
      const headerEstudiante = '<div class="card">Header</div>';
      const alertasHtml = '';
      const temasHtml = '';
      const historialHtml = '<div class="card">Tabla historial</div>';

      return filtrosBar + headerEstudiante + alertasHtml + temasHtml + historialHtml;
    } catch (e) {
      return '<p class="empty">Error: ' + e.message + '</p>';
    }
  },

  async renderAnalyticsGrupo(data) {
    if (!data) return '<p class="empty">Error al cargar datos</p>';
    const estudiantes = Array.isArray(data) ? data : (data.estudiantes || []);
    const promedioGrupo = data.promedioGrupo || 0;
    return '<div class="card"><h2>Dashboard Analítico</h2><p>Estudiantes: ' + estudiantes.length + ' - Promedio: ' + promedioGrupo + '%</p></div>';
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
`;

const content = header + '\n' + part1 + '\n' + part2 + footer;
fs.writeFileSync(filepath, content, 'utf8');
console.log('File written successfully');
