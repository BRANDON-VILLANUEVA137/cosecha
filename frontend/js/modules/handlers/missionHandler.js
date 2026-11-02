/**
 * Manejo de misiones (reclamar recompensas) y tareas auto-generadas.
 */

import { toast } from '../utils/domUtils.js';

const API = window.API;

export const MissionHandler = {
  // Estado para evitar doble clic en generar tarea
  _generando: new Set(),

  // Reclamar la recompensa de una misión completada
  async reclamarMision(id) {
    try {
      const res = await API.reclamarMision(id);
      if (res.ok) {
        const subida = res.subioNivel ? ` · ⬆️ Nivel ${res.nivel}` : '';
        toast(`🎉 ${res.mensaje} · +${res.xp} XP · +${res.naranjas} 🍊${subida}`);
      } else {
        toast(`⚠️ ${res.mensaje || res.error}`);
      }
      // Refrescar el panel flotante si está abierto (el mockup del estudiante
      // mantiene el panel abierto tras reclamar, mostrando "Reclamada")
      if (typeof this.refrescarMisionesPanel === 'function') {
        this.refrescarMisionesPanel();
      }
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  // Generar una tarea personalizada (algoritmo o IA según disponibilidad)
  async generarTareaAuto(materia) {
    const input = document.getElementById(`autoSolicitud_${materia}`);
    const select = document.getElementById(`autoCantidad_${materia}`);
    const solicitud = input ? input.value.trim() : '';
    const cantidad = Number(select ? select.value : 10) || 10;

    const btn = document.getElementById(`btnGenerarARem_${materia}`);

    // Evitar doble clic / bucle: si ya hay una petición en curso para esta materia, ignorar.
    if (this._generando.has(materia)) {
      toast('⏳ Ya estás generando una tarea. Espera a que termine.');
      return;
    }
    this._generando.add(materia);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando...'; }

    try {
      const res = await API.generarTarea({ materia, cantidad, solicitud });
      toast(res.mensaje || '✅ Tarea generada');
      if (window.App && typeof window.App.startTask === 'function') {
        await window.App.startTask(res.id);
      } else if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      const esLimitePendientes = e.status === 429 && e.tipo === 'limite_pendientes';
      const esRateLimit = e.status === 429 && e.retryAfter;

      if (esLimitePendientes) {
        toast(`🚫 ${e.message} Ve a "Tus tareas" para completarlas y libera espacio.`);
      } else if (esRateLimit) {
        const segundos = e.retryAfter || 30;
        toast(`⏱️ Demasiadas peticiones. Espera ${segundos} segundos e inténtalo de nuevo.`);
      } else {
        toast('⚠️ ' + e.message);
      }
    } finally {
      this._generando.delete(materia);
      if (btn) { btn.disabled = false; btn.textContent = '🎲 Generar mi tarea'; }
    }
  },

  /* --------------------------------------------------------------
   * FAB 🎯 + PANEL FLOTANTE DE MISIONES (mockup: Nuevos diseños)
   * ------------------------------------------------------------ */
  // Inyecta el FAB + overlay + panel en #fabLayer (vive FUERA de
  // #appScreen para sobrevivir a los re-render de módulos).
  async renderMissionesFab() {
    const layer = document.getElementById('fabLayer');
    if (!layer) return;
    layer.innerHTML = `
      <button class="fab" id="fabBtn" onclick="window.App.toggleMisionesPanel(true)">
        <span class="fab-icon">🎯<span class="count" id="fabMisionesCount" style="display:none;"></span></span>
        Misiones
      </button>
      <div class="overlay" id="misionesOverlay" onclick="window.App.toggleMisionesPanel(false)"></div>
      <div class="missions-panel" id="misionesPanel">
        <div class="mp-header">
          <div class="icon">🎯</div>
          <div>
            <h3>Misiones</h3>
            <p>Completa objetivos y gana XP + Naranjas 🍊. El progreso cuenta todo lo que ya has resuelto.</p>
          </div>
          <button class="mp-close" onclick="window.App.toggleMisionesPanel(false)">✕</button>
        </div>
        <div class="mp-body" id="mpBody"><p class="empty">Cargando misiones…</p></div>
      </div>
    `;
    // Contador del badge: misiones completadas pendientes de reclamar
    try {
      const misiones = await API.getMisiones();
      const pendientes = (Array.isArray(misiones) ? misiones : []).filter(m => m.completada && !m.reclamada).length;
      const count = document.getElementById('fabMisionesCount');
      if (count) {
        count.textContent = String(pendientes);
        count.style.display = pendientes > 0 ? 'flex' : 'none';
      }
    } catch (_) { /* badge silencioso */ }
  },

  // Abre/cierra el panel; al abrir carga (o recarga) las mission-cards
  async toggleMisionesPanel(force) {
    const panel = document.getElementById('misionesPanel');
    const overlay = document.getElementById('misionesOverlay');
    if (!panel || !overlay) return;
    const abrir = force !== undefined ? force : !panel.classList.contains('open');
    overlay.classList.toggle('open', abrir);
    panel.classList.toggle('open', abrir);
    if (abrir) await this.cargarMisionesPanel();
  },

  // Carga las misiones dentro del panel con las clases del mockup
  async cargarMisionesPanel() {
    const body = document.getElementById('mpBody');
    if (!body) return;
    body.innerHTML = '<p class="empty">Cargando misiones…</p>';
    let misiones = [];
    try {
      misiones = await API.getMisiones();
    } catch (e) {
      body.innerHTML = `<p class="empty">⚠️ Error al cargar misiones: ${e.message}</p>`;
      return;
    }
    if (!Array.isArray(misiones) || !misiones.length) {
      body.innerHTML = '<p class="empty">Aún no hay misiones disponibles.</p>';
      return;
    }

    body.innerHTML = misiones.map(m => {
      const pct = Math.min(100, Math.max(0, Math.round((m.progreso / m.objetivo) * 100)));
      const fillCls = m.reclamada ? 'done' : m.completada ? '' : pct > 0 ? '' : 'locked';
      const estadoCls = m.reclamada ? 'done' : m.completada ? 'done' : pct > 0 ? 'progress' : 'locked';
      const estadoTxt = m.reclamada ? 'Reclamada' : m.completada ? 'Completada' : pct > 0 ? 'En progreso' : 'Bloqueada';
      let accion;
      if (m.reclamada) {
        accion = '<button class="lock" disabled style="opacity:.7;">✅ Reclamada</button>';
      } else if (m.completada) {
        accion = `<button class="claim" onclick="window.App.reclamarMision('${m.id}')">🎁 Reclamar</button>`;
      } else {
        accion = `<button class="lock" disabled>🔒 ${m.progreso}/${m.objetivo}</button>`;
      }
      return `
        <div class="mission-card ${m.completada && !m.reclamada ? '' : 'locked'}">
          <div class="mc-top">
            <span class="tag mission">${m.icono || '🍊'} Misión</span>
            <span class="status ${estadoCls}">${estadoTxt}</span>
          </div>
          <h4>${m.titulo}</h4>
          <p class="desc">${m.descripcion}</p>
          <div class="m-track"><div class="m-fill ${fillCls}" data-progress="${pct}"></div></div>
          <div class="m-meta"><span>${m.progreso}/${m.objetivo}</span><span>${pct}%</span></div>
          <div class="m-reward">
            <span class="prize">Recompensa: +${m.recompensa.xp} XP · +${m.recompensa.naranjas} 🍊</span>
            ${accion}
          </div>
        </div>
      `;
    }).join('');

    // Animación de barras (igual que el mockup: 0% → target con delay)
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('#mpBody .m-fill').forEach(el => {
          el.style.width = el.dataset.progress + '%';
        });
      }, 200);
    });

    // Actualizar badge
    const pendientes = misiones.filter(m => m.completada && !m.reclamada).length;
    const count = document.getElementById('fabMisionesCount');
    if (count) {
      count.textContent = String(pendientes);
      count.style.display = pendientes > 0 ? 'flex' : 'none';
    }
  },

  // Recarga solo el cuerpo del panel (tras reclamar) sin cerrarlo
  async refrescarMisionesPanel() {
    const panel = document.getElementById('misionesPanel');
    if (panel && panel.classList.contains('open')) {
      await this.cargarMisionesPanel();
    }
  }
};