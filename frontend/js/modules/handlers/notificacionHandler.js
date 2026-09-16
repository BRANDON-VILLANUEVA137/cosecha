/**
 * ============================================================
 * HANDLER — BUZÓN DE NOTIFICACIONES (estudiante)
 * ============================================================
 * Campana 🔔 + panel desplegable. Refresca el badge con un
 * polling ligero (60 s) mientras la sesión del estudiante
 * esté activa. La vista vive en renderBuzon.js.
 * ============================================================
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';

const INTERVALO_POLLING = 60000;

export const NotificacionHandler = {
  /* ---------------- Render del buzón ---------------- */
  /** Pinta campana + panel en #buzonLayer. No hace nada sin sesión. */
  async renderBuzon() {
    const layer = document.getElementById('buzonLayer');
    if (!layer) return;

    if (!state.authUser || state.currentRole !== 'estudiante') {
      layer.innerHTML = '';
      return;
    }

    // Primera carga del listado (con currentRole ya resuelto).
    // Si el panel está abierto la carga ya la gestiona toggleBuzon/cargarNotificaciones.
    if (state.notificaciones.length === 0 && !state.buzonAbierto) {
      await this.cargarNotificaciones(true);
    }

    const { renderBuzonHtml } = await import('../render/renderBuzon.js');
    layer.innerHTML = renderBuzonHtml();
    this._clicFueraParaCerrar();
  },

  /** Cierra el panel al hacer click fuera de él (listener único). */
  _clicFueraParaCerrar() {
    if (this._buzonListenerListo) return;
    this._buzonListenerListo = true;
    document.addEventListener('click', (e) => {
      if (!state.buzonAbierto) return;
      const layer = document.getElementById('buzonLayer');
      if (layer && !layer.contains(e.target)) {
        state.buzonAbierto = false;
        window.App.renderBuzon();
      }
    });
  },

  /* ---------------- Datos ---------------- */
  /** Carga notificaciones y actualiza badge + panel si está abierto. */
  async cargarNotificaciones(silencioso = false) {
    if (!state.authUser || state.currentRole !== 'estudiante') return;
    try {
      const data = await window.API.getNotificaciones();
      state.notificaciones = Array.isArray(data.notificaciones) ? data.notificaciones : [];
      state.notificacionesNoLeidas = data.noLeidas || 0;

      this._actualizarBadge();
      if (state.buzonAbierto) {
        await window.App.renderBuzon();
      }
    } catch (e) {
      if (!silencioso) toast('⚠️ ' + e.message);
    }
  },

  /** Actualiza solo el número del badge sin re-render completo. */
  _actualizarBadge() {
    const badge = document.getElementById('buzonBadge');
    if (!badge) return;
    if (state.notificacionesNoLeidas > 0) {
      badge.style.display = 'flex';
      badge.textContent = state.notificacionesNoLeidas > 9 ? '9+' : String(state.notificacionesNoLeidas);
    } else {
      badge.style.display = 'none';
    }
  },

  /* ---------------- Interacción ---------------- */
  async toggleBuzon() {
    state.buzonAbierto = !state.buzonAbierto;
    if (state.buzonAbierto) {
      await this.cargarNotificaciones(true);
    } else {
      await window.App.renderBuzon();
    }
  },

  /** Marca leída y navega al módulo relacionado. */
  async abrirNotificacion(id) {
    const notif = state.notificaciones.find(n => n.id === id);
    try {
      await window.API.marcarNotificacionLeida(id);
    } catch (e) { /* no bloquear la navegación */ }

    if (notif) notif.leida = true;
    state.notificacionesNoLeidas = Math.max(0, state.notificacionesNoLeidas - 1);
    this._actualizarBadge();

    state.buzonAbierto = false;
    await window.App.renderBuzon();

    if (notif && notif.refModulo) {
      window.App.goModule(notif.refModulo);
    }
  },

  async marcarTodasLeidas() {
    try {
      await window.API.marcarTodasNotificacionesLeidas();
      state.notificaciones.forEach(n => { n.leida = true; });
      state.notificacionesNoLeidas = 0;
      this._actualizarBadge();
      await window.App.renderBuzon();
      toast('✅ Todas las notificaciones marcadas como leídas');
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  /* ---------------- Polling ---------------- */
  iniciarPollingNotificaciones() {
    this.detenerPollingNotificaciones();
    state.buzonTimer = setInterval(() => this.cargarNotificaciones(true), INTERVALO_POLLING);
  },

  detenerPollingNotificaciones() {
    if (state.buzonTimer) {
      clearInterval(state.buzonTimer);
      state.buzonTimer = null;
    }
  }
};
