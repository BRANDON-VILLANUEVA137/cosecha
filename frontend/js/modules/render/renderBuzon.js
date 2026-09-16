/**
 * ============================================================
 * RENDER — BUZÓN DE NOTIFICACIONES (estudiante)
 * ============================================================
 * Devuelve el HTML de la campana 🔔 (con badge de no leídas) y
 * del panel desplegable. Se pinta en #buzonLayer (index.html).
 * El comportamiento vive en notificacionHandler.js.
 * ============================================================
 */

import { state } from '../state.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/** Normaliza la fecha de Firestore (Timestamp serializado o ISO string). */
function fechaDe(notif) {
  const f = notif.createdAt;
  try {
    if (!f) return '';
    if (typeof f === 'string') return new Date(f);
    if (typeof f === 'object' && typeof f.seconds === 'number') return new Date(f.seconds * 1000);
    if (f.toDate) return f.toDate();
  } catch (e) { /* fecha inválida */ }
  return null;
}

function fechaRelativa(notif) {
  const d = fechaDe(notif);
  if (!d) return '';
  const dif = Date.now() - d.getTime();
  const min = Math.floor(dif / 60000);
  if (min < 1) return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} d`;
  return d.toLocaleDateString();
}

/** Construye el HTML completo del buzón (campana + panel si está abierto). */
export function renderBuzonHtml() {
  const abiertas = state.notificacionesNoLeidas;

  const campana = `
    <button id="buzonBtn" onclick="window.App.toggleBuzon()" title="Buzón de notificaciones"
      style="position:relative; display:flex; align-items:center; justify-content:center;
             width:38px; height:38px; border-radius:50%; border:1px solid var(--borde);
             background:var(--fondo-2); cursor:pointer; font-size:17px;">
      🔔
      <span id="buzonBadge" style="display:${abiertas > 0 ? 'flex' : 'none'};
            position:absolute; top:-4px; right:-4px; min-width:18px; height:18px;
            align-items:center; justify-content:center; padding:0 4px;
            border-radius:999px; background:var(--acento); color:#fff;
            font-size:10.5px; font-weight:800;">${abiertas > 9 ? '9+' : abiertas}</span>
    </button>
  `;

  if (!state.buzonAbierto) {
    return campana;
  }

  const items = state.notificaciones.length > 0
    ? state.notificaciones.map(n => {
        const ico = n.tipo === 'mision' ? '🎯' : '📚';
        return `
          <div onclick="window.App.abrirNotificacion('${n.id}')"
               style="display:flex; gap:10px; padding:10px 12px; border-bottom:1px solid var(--borde);
                      cursor:pointer; background:${n.leida ? 'transparent' : 'var(--teal-tint, #E8F4F1)'};">
            <div style="font-size:18px; line-height:1.2; flex:0 0 auto;">${ico}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:${n.leida ? 600 : 800}; font-size:13px; color:var(--ink);">${esc(n.titulo)}</div>
              <div style="font-size:12px; color:var(--texto-suave); margin-top:2px;">${esc(n.mensaje)}</div>
              <div style="font-size:10.5px; color:var(--texto-suave); margin-top:4px; opacity:.8;">${fechaRelativa(n)}</div>
            </div>
            ${n.leida ? '' : '<span style="flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:var(--acento); margin-top:6px;"></span>'}
          </div>`;
      }).join('')
    : '<div style="padding:22px 14px; text-align:center; color:var(--texto-suave); font-size:13px;">🔔 No tienes notificaciones todavía.<br>Cuando tu docente publique tareas o haya misiones nuevas, te avisaremos aquí.</div>';

  const panel = `
    <div id="buzonPanel" style="position:absolute; top:calc(100% + 10px); right:0; width:min(360px, 92vw);
         max-height:min(480px, 70vh); overflow-y:auto; background:var(--surface, #fff);
         border:1px solid var(--borde); border-radius:14px;
         box-shadow:0 18px 48px rgba(0,0,0,.18); z-index:80;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;
           padding:12px 14px; border-bottom:1px solid var(--borde); position:sticky; top:0;
           background:var(--surface, #fff); z-index:1;">
        <strong style="font-size:14px;">📬 Buzón</strong>
        <button class="ghost" onclick="window.App.marcarTodasLeidas()" style="font-size:12px; padding:5px 10px;">Marcar todas leídas</button>
      </div>
      ${items}
    </div>
  `;

  return campana + panel;
}
