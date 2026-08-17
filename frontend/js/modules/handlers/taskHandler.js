/**
 * Manejo de tareas (docente)
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';

const API = window.API;

export const TaskHandler = {
  async goModule(mod) {
    state.currentModule = mod;
    state.currentTaskView = null;
    state.currentTaskExercises = [];
    if (window.App && typeof window.App.renderNav === 'function') {
      window.App.renderNav();
    }
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async startTask(taskId) {
    if (!taskId) {
      toast('⚠️ Error: Tarea sin ID válido');
      return;
    }
    
    try {
      const tareaCompleta = await API.getTarea(taskId);
      state.currentTaskView = tareaCompleta;
      state.currentTaskExercises = tareaCompleta.ejercicios || [];
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ Error al cargar la tarea: ' + e.message);
    }
  },

  closeTaskView() {
    state.currentTaskView = null;
    state.currentTaskExercises = [];
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  completeTask(id = state.currentTaskView?.id) {
    if (id) {
      state.completedTaskIds = [...new Set([...state.completedTaskIds, id])];
    }
    if (window.App && typeof window.App.saveProgressState === 'function') {
      window.App.saveProgressState();
    }
  },

  async finishTask() {
    this.completeTask();
    const tareaId = state.currentTaskView?.id;
    if (tareaId) {
      try {
        const res = await API.completarTarea(tareaId);
        if (!res.yaCompletada) {
          const xp = res.xpGanada || 100;
          if (res.subioNivel) toast(`🎓 Lección completada! +${xp} XP · ⬆️ Nivel ${res.nuevoNivel}`);
          else toast(`🎓 Lección completada! +${xp} XP`);
        }
      } catch (e) {
        toast('⚠️ No se pudo registrar la lección: ' + e.message);
      }
    } else {
      toast('✅ Tarea finalizada');
    }
    state.currentTaskView = null;
    state.currentTaskExercises = [];
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  // Formulario de tarea
  mostrarFormTarea(materia) {
    const form = document.getElementById('formTarea');
    if (form) form.style.display = 'block';
  },

  ocultarFormTarea() {
    const form = document.getElementById('formTarea');
    if (form) form.style.display = 'none';
  },

  async crearTarea(materia) {
    const titulo = document.getElementById('tareaTitulo').value.trim();
    const descripcion = document.getElementById('tareaDescripcion').value.trim();
    
    if (!titulo) {
      toast('⚠️ Ingresa un título para la tarea');
      return;
    }

    try {
      await API.crearTarea({ titulo, descripcion, materia });
      toast('✅ Tarea creada');
      this.ocultarFormTarea();
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async eliminarTarea(id) {
    const confirmar = window.confirm('¿Seguro que quieres eliminar esta tarea y todos sus ejercicios?');
    if (!confirmar) return;

    try {
      await API.eliminarTarea(id);
      toast('🗑️ Tarea eliminada');
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async verTareaDocente(id) {
    try {
      const tarea = await API.getTarea(id);
      state.currentTaskView = tarea;
      state.currentTaskExercises = tarea.ejercicios || [];
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async agregarEjercicioATarea(ejercicioId) {
    if (!state.currentTaskView) return;
    
    try {
      await API.agregarEjercicioATarea(state.currentTaskView.id, ejercicioId);
      toast('✅ Ejercicio agregado');
      const tareaActualizada = await API.getTarea(state.currentTaskView.id);
      state.currentTaskView = tareaActualizada;
      state.currentTaskExercises = tareaActualizada.ejercicios || [];
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async eliminarEjercicioDeTarea(ejercicioId) {
    if (!state.currentTaskView) return;
    
    const confirmar = window.confirm('¿Quitar este ejercicio de la tarea?');
    if (!confirmar) return;

    try {
      await API.eliminarEjercicioDeTarea(state.currentTaskView.id, ejercicioId);
      toast('🗑️ Ejercicio removido');
      await this.verTareaDocente(state.currentTaskView.id);
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async publicarTarea(id, estado) {
    try {
      await API.publicarTarea(id, estado);
      toast(estado === 'publicada' ? '✅ Tarea publicada' : '📝 Tarea despublicada');
      await this.verTareaDocente(id);
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  cambiarTabDocente(tab) {
    state.currentDocenteTab = tab;
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  cambiarAnalyticsView(view) {
    state.analyticsView = view;
    state.selectedEstudianteId = null;
    state.analyticsFilterMateria = '';
    state.analyticsFilterTarea = '';
    state.analyticsFilterTema = '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  }
};