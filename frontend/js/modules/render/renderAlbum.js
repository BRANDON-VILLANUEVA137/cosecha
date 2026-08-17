/**
 * Renderizado del Álbum de Cartas
 */

import { state } from '../state.js';

const API = window.API;

export async function renderAlbum() {
  const [logro, cartas] = await Promise.all([API.getLogros(), API.getCartas()]);
  const desbloqueadasIds = (logro.cartas_desbloqueadas || []).map(c => c.carta_id);

  const grid = cartas.map(c => {
    const esDesbloqueada = desbloqueadasIds.includes(c.id);
    
    return `
      <div class="carta-item ${esDesbloqueada ? 'desbloqueada' : 'bloqueada'}">
        <div class="carta-preview">
          ${esDesbloqueada ? 
            `<img src="${c.imagen_url}" alt="${c.nombre}" style="width:100%; border-radius:8px; display:block;" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend','<div style=&quot;width:100%;height:150px;background:var(--acento);display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:2rem;&quot;>🃏</div>');">` : 
            `<div class="silueta" style="width:100%; height:150px; background:#eee; display:flex; align-items:center; justify-content:center; border-radius:8px;">❓</div>`}
        </div>
        <div class="carta-info">
          <strong class="${esDesbloqueada ? 'rareza-' + (c.rareza || 'comun') : ''}">${esDesbloqueada ? c.nombre : '???'}</strong>
          ${esDesbloqueada ? `
            <div class="stats" style="font-size:0.8rem;">
              <span>⚔️ ${c.stats.poder}</span> 
              <span>🧠 ${c.stats.inteligencia}</span>
              <span>💪 ${c.stats.fuerza}</span>
            </div>` : '<small>Bloqueado</small>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="module-header">
        <div class="badge" style="background:var(--acento);">🃏</div>
        <div><h2>Mi Álbum de Colección</h2><p>¡Colecciona cartas, sube de nivel y desbloquea cofres con tus naranjas! 🍊</p></div>
      </div>
      <div class="album-wallet" style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; margin: 1rem 0 0; padding: 0.75rem 1rem; background:var(--fondo2, #fff6ec); border-radius:10px;">
        <span class="pill" style="background:var(--acento); color:#fff; padding:0.35rem 0.8rem; border-radius:999px;"><strong>🍊 ${logro.naranjas || 0}</strong> naranjas</span>
        <span class="pill" style="background:#eee; padding:0.35rem 0.8rem; border-radius:999px;">Nivel ${logro.nivel || 1}</span>
        <span class="pill" style="background:#eee; padding:0.35rem 0.8rem; border-radius:999px;">🔥 ${logro.racha?.dias || 0} días</span>
        <span class="pill" style="background:#eee; padding:0.35rem 0.8rem; border-radius:999px;">⭐ ${logro.xp || 0} XP</span>
      </div>
      <div class="album-container" style="padding: 1rem;">
        <div class="album-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">${grid}</div>
        <button class="btn-cofre" onclick="window.App.abrirCofreModal()" style="margin-top: 2rem; padding: 0.5rem 1rem; cursor: pointer; ${logro.naranjas < 50 ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${logro.naranjas < 50 ? 'disabled' : ''}>Abrir Cofre (50 🍊)</button>
      </div>
    </div>
  `;
}