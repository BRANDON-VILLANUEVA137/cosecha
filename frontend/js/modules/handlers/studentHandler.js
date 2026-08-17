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

  mostrarFormEstudiante() {
    state.estudianteEditando = null;
    state.estudianteFormVisible = true;
    state.avatarSeleccionado = '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  cancelarEdicionEstudiante() {
    state.estudianteEditando = null;
    state.estudianteFormVisible = false;
    state.avatarSeleccionado = '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async editarEstudianteForm(id) {
    const estudiante = state.estudiantesGestion.find(e => e.id === id);
    if (!estudiante) return;
    state.estudianteEditando = estudiante;
    state.estudianteFormVisible = true;
    state.avatarSeleccionado = (estudiante.personaje && estudiante.personaje.id) || '';
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async guardarEstudiante() {
    const nombre = document.getElementById('estNombre').value.trim();
    const email = document.getElementById('estEmail').value.trim();
    const password = document.getElementById('estPassword').value;
    const grado = document.getElementById('estGrado')?.value.trim() || '';
    const avatarId = state.avatarSeleccionado || '';

    if (!nombre || !email) {
      toast('⚠️ Nombre y correo son obligatorios');
      return;
    }
    if (!state.estudianteEditando && password.length < 6) {
      toast('⚠️ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      if (state.estudianteEditando) {
        const data = { nombre, email, grado, avatarId };
        if (password) data.password = password;
        await API.editarEstudiante(state.estudianteEditando.id, data);
        toast('✅ Estudiante actualizado');
      } else {
        await API.crearEstudiante({ nombre, email, password, grado, avatarId });
        toast('✅ Estudiante registrado');
      }
      state.estudianteEditando = null;
      state.estudianteFormVisible = false;
      state.avatarSeleccionado = '';
      await this.cargarEstudiantes();
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async eliminarEstudianteGestion(id) {
    const estudiante = state.estudiantesGestion.find(e => e.id === id);
    const nombre = estudiante ? (estudiante.nombre || estudiante.email) : 'este estudiante';
    const confirmar = window.confirm(`¿Seguro que quieres dar de baja a ${nombre}? Se desactivará la cuenta pero se preservará su historial.`);
    if (!confirmar) return;

    try {
      await API.eliminarEstudiante(id);
      toast('🗑️ Estudiante dado de baja');
      await this.cargarEstudiantes();
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  }
};