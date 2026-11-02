/**
 * Renderizado de la vista de Misiones (estudiante)
 */
import { esc } from '../utils/domUtils.js';

const API = window.API;

// Orden: primero las que ya se pueden reclamar, luego las que van en curso,
// al final las ya reclamadas.
function pesoMision(m) {
  if (m.completada && !m.reclamada) return 0;
  if (!m.reclamada) return 1;
  return 2;
}

function tarjetaMision(m) {
  const objetivo = Number(m.objetivo) || 1;
  const progreso = Number(m.progreso) || 0;
  const pct = Math.min(100, Math.max(0, Math.round((progreso / objetivo) * 100)));
  const lista = m.completada && !m.reclamada;
  const hecha = !!m.reclamada;
  const estadoTxt = hecha ? 'Reclamada' : lista ? 'Lista para reclamar' : pct > 0 ? 'En progreso' : 'Por empezar';
  const claseEstado = hecha ? 'm-badge--hecha' : lista ? 'm-badge--lista' : '';
  const recompensa = `+${m.recompensa.xp} XP · +${m.recompensa.naranjas} 🍊`;

  let accion;
  if (hecha) {
    accion = '<button class="ghost m-action" disabled>✅ Reclamada</button>';
  } else if (lista) {
    accion = `<button class="primary m-action pulse" onclick="window.App.reclamarMision('${esc(m.id)}')">🎁 Reclamar recompensa</button>`;
  } else {
    accion = `<button class="ghost m-action" disabled>Te faltan ${Math.max(0, objetivo - progreso)}</button>`;
  }

  return `
    <article class="m-card ${lista ? 'm-card--lista' : ''} ${hecha ? 'm-card--hecha' : ''}">
      <div class="m-card__top">
        <span class="m-card__icon" aria-hidden="true">${esc(m.icono || '🍊')}</span>
        <span class="m-badge ${claseEstado}">${estadoTxt}</span>
      </div>
      <h3>${esc(m.titulo)}</h3>
      <p>${esc(m.descripcion)}</p>
      <div class="xp-bar" role="progressbar" aria-label="Progreso de la misión" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
        <div class="xp-bar__fill" style="width:${pct}%"></div>
      </div>
      <div class="m-card__meta">
        <span>${progreso}/${objetivo}</span>
        <span class="m-reward">${recompensa}</span>
      </div>
      ${accion}
    </article>`;
}

export async function renderMissiones() {
  try {
    const misiones = await API.getMisiones();
    if (!Array.isArray(misiones) || !misiones.length) {
      return '<div class="card"><p class="empty">Aún no hay misiones. Resuelve ejercicios y aparecerán aquí.</p></div>';
    }

    const cards = [...misiones].sort((a, b) => pesoMision(a) - pesoMision(b)).map(tarjetaMision).join('');
    const porReclamar = misiones.filter(m => m.completada && !m.reclamada).length;
    const resumen = porReclamar > 0
      ? `Tienes ${porReclamar} ${porReclamar === 1 ? 'recompensa lista' : 'recompensas listas'} para reclamar.`
      : 'Completa objetivos y gana XP + Naranjas 🍊. El progreso cuenta todo lo que ya has resuelto.';

    return `
      <div class="card hero">
        <div class="module-header">
          <div class="badge mat">🎯</div>
          <div>
            <h2>Misiones</h2>
            <p>${resumen}</p>
          </div>
        </div>
      </div>
      <div class="m-grid">${cards}</div>
    `;
  } catch (e) {
    console.error('Error renderizando misiones:', e);
    return `<div class="card"><p class="empty">⚠️ No se pudieron cargar las misiones. ${esc(e.message)}</p></div>`;
  }
}
