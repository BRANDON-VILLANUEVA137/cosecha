/**
 * Manejo de estudiantes (docente)
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';

const API = window.API;
const Personaje = window.Personaje;

export const StudentHandler = {
  async cargarEstudiantes() {
    try {
      state.estudiantesGestion = await API.getEstudiantes();
      if (!Array.isArray(state.estudiantesGestion)) state.estudiantesGestion = [];
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
      state.estudiantesGestion = [];
    }
  },

  seleccionarAvatar(id) {
    state.avatarSeleccionado = id || '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  cancelarEdicionEstudiante() {
    state.estudianteEditando = null;
    state.avatarSeleccionado = '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async editarEstudianteForm(id) {
    const estudiante = state.estudiantesGestion.find(e => e.id === id);
    if (!estudiante) return;
    state.estudianteEditando = estudiante;
    state.avatarSeleccionado = (estudiante.personaje && estudiante.personaje.id) || '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async guardarEstudiante() {
    // Regla del CRUD: el docente SOLO puede editar estudiantes existentes.
    if (!state.estudianteEditando) {
      toast('⚠️ Solo puedes editar estudiantes existentes');
      return;
    }

    const nombre = document.getElementById('estNombre').value.trim();
    const email = document.getElementById('estEmail').value.trim();
    const password = document.getElementById('estPassword').value;
    const grado = document.getElementById('estGrado')?.value.trim() || '';
    const avatarId = state.avatarSeleccionado || '';

    if (!nombre || !email) {
      toast('⚠️ Nombre y correo son obligatorios');
      return;
    }
    if (password && password.length < 6) {
      toast('⚠️ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      // Regla del CRUD: el docente SOLO edita datos de estudiantes
      // (crear/eliminar/desactivar es exclusivo del administrador).
      const data = { nombre, email, grado, avatarId };
      if (password) data.password = password;
      await API.editarEstudiante(state.estudianteEditando.id, data);
      toast('✅ Estudiante actualizado');
      state.estudianteEditando = null;
      state.avatarSeleccionado = '';
      await this.cargarEstudiantes();
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  }
};