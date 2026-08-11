/**
 * CAPA DE API — se comunica con el backend REST.
 * Todas las llamadas son asíncronas y devuelven Promesas.
 */
const API = {
  // En producción apunta directamente al backend de Render
  // En desarrollo usa el proxy local (/api)
  base: (() => {
    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProd ? 'https://cosecha.onrender.com/api' : '/api';
  })(),
  authToken: null,

  setAuthToken(token) {
    this.authToken = token;
  },

  clearAuthToken() {
    this.authToken = null;
  },

  async getAuthHeaders() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      return {};
    }

    if (this.authToken) {
      return { Authorization: `Bearer ${this.authToken}` };
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      return {};
    }

    const token = await user.getIdToken();
    this.authToken = token;
    return { Authorization: `Bearer ${token}` };
  },

  async request(path, options = {}) {
    const authHeaders = await this.getAuthHeaders();
    const res = await fetch(this.base + path, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la petición');
    }
    return res.json();
  },

  async getSession() {
    return this.request('/auth/me');
  },

  // ---- Ejercicios ----
  getEjercicios(materia) {
    const q = materia ? `?materia=${materia}` : '';
    return this.request('/ejercicios' + q);
  },
  crearEjercicio(data) {
    return this.request('/ejercicios', { method: 'POST', body: JSON.stringify(data) });
  },
  editarEjercicio(id, data) {
    return this.request('/ejercicios/' + id, { method: 'PUT', body: JSON.stringify(data) });
  },
  eliminarEjercicio(id) {
    return this.request('/ejercicios/' + id, { method: 'DELETE' });
  },
  validarRespuesta(id, respuesta, tareaId = null) {
    return this.request('/ejercicios/' + id + '/validar', {
      method: 'POST',
      body: JSON.stringify({ respuesta, tareaId })
    });
  },

  // ---- Estudiantes (Docente) ----
  getEstudiantes() {
    return this.request('/estudiantes');
  },
  crearEstudiante(data) {
    return this.request('/estudiantes', { method: 'POST', body: JSON.stringify(data) });
  },
  editarEstudiante(id, data) {
    return this.request('/estudiantes/' + id, { method: 'PUT', body: JSON.stringify(data) });
  },
  eliminarEstudiante(id, hardDelete = false) {
    const q = hardDelete ? '?hardDelete=true' : '';
    return this.request('/estudiantes/' + id + q, { method: 'DELETE' });
  },

  // ---- Logros ----
  getLogros() {
    return this.request('/logros');
  },
  equiparPrenda(categoria, prendaId) {
    return this.request('/logros/equipo', {
      method: 'PUT',
      body: JSON.stringify({ categoria, prendaId })
    });
  },
  comprarItem(itemId) {
    return this.request('/logros/comprar', {
      method: 'POST',
      body: JSON.stringify({ itemId })
    });
  },
  completarTarea(tareaId) {
    return this.request('/logros/completar-tarea', {
      method: 'POST',
      body: JSON.stringify({ tareaId })
    });
  },

  // ---- Prendas ----
  getPrendas(categoria) {
    const q = categoria ? `?categoria=${categoria}` : '';
    return this.request('/prendas' + q);
  },

  // ---- Cartas (Álbum) ----
  getCartas() {
    return this.request('/cartas');
  },
  abrirCofre() {
    return this.request('/cartas/abrir-cofre', { method: 'POST' });
  },

  // ---- Tareas ----
  getTareas() {
    return this.request('/tareas');
  },
  getTarea(id) {
    return this.request('/tareas/' + id);
  },
  crearTarea(data) {
    return this.request('/tareas', { method: 'POST', body: JSON.stringify(data) });
  },
  editarTarea(id, data) {
    return this.request('/tareas/' + id, { method: 'PUT', body: JSON.stringify(data) });
  },
  eliminarTarea(id) {
    return this.request('/tareas/' + id, { method: 'DELETE' });
  },
  agregarEjercicioATarea(tareaId, ejercicioId) {
    return this.request('/tareas/' + tareaId + '/ejercicios', {
      method: 'POST',
      body: JSON.stringify({ ejercicioId })
    });
  },
  eliminarEjercicioDeTarea(tareaId, ejercicioId) {
    return this.request('/tareas/' + tareaId + '/ejercicios/' + ejercicioId, {
      method: 'DELETE'
    });
  },
  publicarTarea(id, estado) {
    return this.request('/tareas/' + id + '/publicar', {
      method: 'PATCH',
      body: JSON.stringify({ estado })
    });
  },
  
  // Analytics
  getAnalyticsEstudiante(estudianteId, filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.materia) params.append('materia', filtros.materia);
    if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
    const query = params.toString() ? '?' + params.toString() : '';
    return this.request('/analytics/estudiante/' + estudianteId + query);
  },
  getAnalyticsGrupo(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.materia) params.append('materia', filtros.materia);
    const query = params.toString() ? '?' + params.toString() : '';
    return this.request('/analytics/grupo' + query);
  }
};
