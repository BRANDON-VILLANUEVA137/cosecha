/**
 * Renderizado de la vista de Misiones (estudiante)
 */

const API = window.API;

export async function renderMissiones() {
  try {
    const misiones = await API.getMisiones();
    if (!Array.isArray(misiones) || !misiones.length) {
      return '<div class="card"><p class="empty">Aún no hay misiones disponibles.</p></div>';
    }

    const cards = misiones.map(m => {
      const pct = Math.min(100, Math.round((m.progreso / m.objetivo) * 100));
      let estadoBoton = '';
      if (m.reclamada) {
        estadoBoton = '<button class="ghost" disabled style="opacity:.65;">✅ Reclamada</button>';
      } else if (m.completada) {
        estadoBoton = `<button class="primary" onclick="window.App.reclamarMision('${m.id}')">🎁 Reclamar (+${m.recompensa.xp} XP · +${m.recompensa.naranjas} 🍊)</button>`;
      } else {
        estadoBoton = `<button class="ghost" disabled>🔒 ${m.progreso}/${m.objetivo}</button>`;
      }
      return `
        <div class="task-card task-module-card">
          <div class="task-module-head">
            <div>
              <span class="tag mat">${m.icono} Misión</span>
              <h3>${m.titulo}</h3>
            </div>
            <span class="task-status">${m.reclamada ? 'Reclamada' : m.completada ? 'Completada' : 'En progreso'}</span>
          </div>
          <p>${m.descripcion}</p>
          <div class="xp-bar">
            <div class="xp-bar__fill" style="width:${pct}%"></div>
          </div>
          <div class="xp-bar__labels"><span>${m.progreso}/${m.objetivo}</span><span>${pct}%</span></div>
          <div class="task-meta">Recompensa: +${m.recompensa.xp} XP · +${m.recompensa.naranjas} 🍊</div>
          <div style="margin-top:8px;">${estadoBoton}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge mat">🎯</div>
          <div>
            <h2>Misiones</h2>
            <p>Completa objetivos y gana XP + Naranjas 🍊. El progreso cuenta todo lo que ya has resuelto.</p>
          </div>
        </div>
      </div>
      ${cards}
    `;
  } catch (e) {
    console.error('Error renderizando misiones:', e);
    return `<div class="card"><p class="empty">⚠️ Error al cargar misiones: ${e.message}</p></div>`;
  }
}