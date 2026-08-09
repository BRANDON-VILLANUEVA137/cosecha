/**
 * CAPA DE API — se comunica con el backend REST.
 * Todas las llamadas son asíncronas y devuelven Promesas.
 */
const API = {
  base: '/api',

  async request(path, options = {}) {
    const res = await fetch(this.base + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la petición');
    }
    return res.json();
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
  validarRespuesta(id, respuesta) {
    return this.request('/ejercicios/' + id + '/validar', {
      method: 'POST',
      body: JSON.stringify({ respuesta })
    });
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

  // ---- Prendas ----
  getPrendas(categoria) {
    const q = categoria ? `?categoria=${categoria}` : '';
    return this.request('/prendas' + q);
  }
};