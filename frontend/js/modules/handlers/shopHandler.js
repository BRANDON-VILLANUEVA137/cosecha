/**
 * Manejo de tienda, armario y cofres
 */

import { state } from '../state.js';
import { toast } from '../utils/domUtils.js';
import { formatMathText } from '../utils/formatters.js';

const API = window.API;
const Personaje = window.Personaje;

export const ShopHandler = {
  async abrirCofreModal() {
    let result;
    try {
      result = await API.abrirCofre();
    } catch (error) {
      toast(error.message || 'No tienes suficientes naranjas para abrir este cofre 🍊');
      return;
    }

    if (!result.ok) {
      toast(result.error || 'No tienes suficientes naranjas para abrir este cofre 🍊');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-revelacion active';
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000;";

    const esNueva = !!result.nueva;
    const rareza = result.carta.rareza || 'comun';
    const claseRareza = 'rareza-' + rareza;

    const confeti = esNueva
      ? `<div class="confeti-wrap">${Array.from({ length: 40 }, (_, i) => {
          const colores = ['#ff0040', '#ff8c00', '#ffd700', '#33ff57', '#33ccff', '#7a4fff', '#ff33cc'];
          const color = colores[i % colores.length];
          const left = Math.random() * 100;
          const delay = Math.random() * 2.2;
          const duracion = 2 + Math.random() * 1.5;
          return `<span class="confeti" style="left:${left}%; background:${color}; animation-duration:${duracion}s; animation-delay:${delay}s;"></span>`;
        }).join('')}</div>`
      : '';

    const titulo = esNueva
      ? '<h3 class="titulo-nueva">🎉 ¡NUEVA TARJETA DESBLOQUEADA!</h3>'
      : '<h3 class="titulo-duplicado">Repetida (duplicado a tu colección)</h3>';

    modal.innerHTML = `
      <div class="modal-content" style="background:#fff; padding:2rem; border-radius:12px; text-align:center; position:relative;">
        <div class="revelacion-animacion">
          ${confeti}
          ${titulo}
          <img src="${result.carta.imagen_url}" class="carta-revelada ${claseRareza}" style="width:150px; margin:1rem 0;" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend','<div style=&quot;width:150px;height:180px;background:var(--acento);display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:3rem;&quot;>🃏</div>');">
          <p class="${claseRareza}" style="font-size:18px; margin:0;"><strong>${result.carta.nombre}</strong> <span style="font-size:12px;">(${rareza.toUpperCase()})</span></p>
          <p style="font-size:12px; color:#6b7280; margin:.4rem 0 0;">⭐ ${result.carta.estrellas} · ⚔️ ${result.carta.stats.poder} · 🧠 ${result.carta.stats.inteligencia} · 💪 ${result.carta.stats.fuerza}</p>
          <button onclick="
            this.closest('.modal-revelacion').remove();
            window.App.refreshAlbum();
          " style="margin-top:1rem; padding:0.5rem 1.2rem; cursor:pointer; border-radius:999px; border:2px solid var(--primario-oscuro); background:var(--acento); font-weight:800;">¡Genial!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async refreshAlbum() {
    if (state.currentModule === 'album' && state.currentRole !== 'docente') {
      const screen = document.getElementById('appScreen');
      const { renderAlbum } = await import('../render/renderAlbum.js');
      screen.innerHTML = await renderAlbum();
      if (window.App && typeof window.App.wireEvents === 'function') {
        window.App.wireEvents();
      }
    } else {
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    }
  },

  cambiarArmarioTab(tab) {
    state.currentArmarioTab = tab;
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async equiparPrenda(cat, id) {
    try {
      await API.equiparPrenda(cat, id);
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  },

  async comprarItem(id) {
    try {
      const res = await API.comprarItem(id);
      toast('🛒 ' + res.mensaje);
      // Recargar prendas
      if (window.App && typeof window.App.cargarPrendas === 'function') {
        await window.App.cargarPrendas();
      }
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (e) {
      toast('⚠️ ' + e.message);
    }
  }
};