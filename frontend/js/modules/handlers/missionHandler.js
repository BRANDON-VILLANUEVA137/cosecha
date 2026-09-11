/**
 * Manejo de misiones (reclamar recompensas) y tareas auto-generadas.
 */

import { toast } from '../utils/domUtils.js';

const API = window.API;

export const MissionHandler = {
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
      toast('⚠️ ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '🎲 Generar mi tarea'; }
    }
  }
};