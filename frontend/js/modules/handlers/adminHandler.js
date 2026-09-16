/**
 * ============================================================
 * HANDLER — MÓDULO DE ADMINISTRACIÓN (rol admin)
 * ============================================================
 * Acciones del CRUD de docentes, cursos y estudiantes.
 * La vista vive en renderAdmin.js; este módulo solo maneja
 * eventos y llamadas a la API (patrón StudentHandler).
 * ============================================================
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';

export const AdminHandler = {
  /* ---------------- Navegación interna ---------------- */
  goAdminTab(tab) {
    state.adminTab = tab;
    // Cerrar formularios abiertos al cambiar de pestaña
    state.adminFormDocente = false;
    state.adminEditandoDocente = null;
    state.adminFormCurso = false;
    state.adminEditandoCurso = null;
    state.adminFormEstudiante = false;
    state.adminEditandoEstudiante = null;
    window.App.render();
  },

  /** Carga las tres colecciones para la vista y el resumen. */
  async cargarAdminDatos() {
    const [docentes, cursos, estudiantes] = await Promise.all([
      window.API.getAdminDocentes(),
      window.API.getAdminCursos(),
      window.API.getAdminEstudiantes()
    ]);
    state.adminDocentes = Array.isArray(docentes) ? docentes : [];
    state.adminCursos = Array.isArray(cursos) ? cursos : [];
    state.adminEstudiantes = Array.isArray(estudiantes) ? estudiantes : [];
  },

  /* ---------------- DOCENTES ---------------- */
  nuevoAdminDocente() {
    state.adminFormDocente = true;
    state.adminEditandoDocente = null;
    window.App.render();
  },

  editarAdminDocenteForm(id) {
    state.adminFormDocente = true;
    state.adminEditandoDocente = id;
    window.App.render();
  },

  cancelarAdminDocente() {
    state.adminFormDocente = false;
    state.adminEditandoDocente = null;
    window.App.render();
  },

  async guardarAdminDocente() {
    const nombre = document.getElementById('admDocNombre')?.value.trim();
    const email = document.getElementById('admDocEmail')?.value.trim();
    const password = document.getElementById('admDocPassword')?.value;
    const especialidad = document.getElementById('admDocEspecialidad')?.value.trim();

    try {
      if (state.adminEditandoDocente) {
        const cambios = { nombre, especialidad };
        if (email) cambios.email = email;
        if (password) cambios.password = password;
        await window.API.editarAdminDocente(state.adminEditandoDocente, cambios);
        toast('✅ Docente actualizado');
      } else {
        await window.API.crearAdminDocente({ nombre, email, password, especialidad });
        toast('✅ Docente creado');
      }
      this.cancelarAdminDocente();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  async eliminarAdminDocenteFila(id) {
    const docente = state.adminDocentes.find(d => d.id === id);
    if (!confirm(`¿Eliminar al docente "${docente?.nombre || id}"? No se puede si tiene cursos vinculados.`)) return;
    try {
      await window.API.eliminarAdminDocente(id);
      toast('🗑️ Docente eliminado');
      window.App.render();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  /* ---------------- CURSOS ---------------- */
  nuevoAdminCurso() {
    state.adminFormCurso = true;
    state.adminEditandoCurso = null;
    window.App.render();
  },

  editarAdminCursoForm(id) {
    state.adminFormCurso = true;
    state.adminEditandoCurso = id;
    window.App.render();
  },

  cancelarAdminCurso() {
    state.adminFormCurso = false;
    state.adminEditandoCurso = null;
    window.App.render();
  },

  async guardarAdminCurso() {
    const nombre = document.getElementById('admCursoNombre')?.value.trim();
    const descripcion = document.getElementById('admCursoDesc')?.value.trim();
    const docenteId = document.getElementById('admCursoDocente')?.value;

    try {
      if (state.adminEditandoCurso) {
        await window.API.editarAdminCurso(state.adminEditandoCurso, { nombre, descripcion, docenteId });
        toast('✅ Curso actualizado');
      } else {
        await window.API.crearAdminCurso({ nombre, descripcion, docenteId });
        toast('✅ Curso creado');
      }
      this.cancelarAdminCurso();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  async eliminarAdminCursoFila(id) {
    const curso = state.adminCursos.find(c => c.id === id);
    if (!confirm(`¿Eliminar el curso "${curso?.nombre || id}"? No se puede si tiene estudiantes vinculados.`)) return;
    try {
      await window.API.eliminarAdminCurso(id);
      toast('🗑️ Curso eliminado');
      window.App.render();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  /* ---------------- ESTUDIANTES ---------------- */
  nuevoAdminEstudiante() {
    state.adminFormEstudiante = true;
    state.adminEditandoEstudiante = null;
    window.App.render();
  },

  editarAdminEstudianteForm(id) {
    state.adminFormEstudiante = true;
    state.adminEditandoEstudiante = id;
    window.App.render();
  },

  cancelarAdminEstudiante() {
    state.adminFormEstudiante = false;
    state.adminEditandoEstudiante = null;
    window.App.render();
  },

  async guardarAdminEstudiante() {
    const nombre = document.getElementById('admEstNombre')?.value.trim();
    const email = document.getElementById('admEstEmail')?.value.trim();
    const password = document.getElementById('admEstPassword')?.value;
    const grado = document.getElementById('admEstGrado')?.value.trim();
    const cursoId = document.getElementById('admEstCurso')?.value;

    try {
      if (state.adminEditandoEstudiante) {
        const cambios = { nombre, grado, cursoId };
        if (email) cambios.email = email;
        if (password) cambios.password = password;
        await window.API.editarAdminEstudiante(state.adminEditandoEstudiante, cambios);
        toast('✅ Estudiante actualizado');
      } else {
        await window.API.crearAdminEstudiante({ nombre, email, password, grado, cursoId });
        toast('✅ Estudiante creado');
      }
      this.cancelarAdminEstudiante();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  async eliminarAdminEstudianteFila(id) {
    const estudiante = state.adminEstudiantes.find(e => e.id === id);
    if (!confirm(`¿Eliminar al estudiante "${estudiante?.nombre || id}"? Se eliminará por completo (cuenta e historial).`)) return;
    try {
      await window.API.eliminarAdminEstudiante(id, true);
      toast('🗑️ Estudiante eliminado');
      window.App.render();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  }
};
