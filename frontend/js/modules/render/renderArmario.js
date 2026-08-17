/**
 * Renderizado del Armario y Perfil del estudiante
 */

import { state } from '../state.js';
import { formatMathText, cap } from '../utils/formatters.js';
import { calcularProgreso } from '../utils/progressUtils.js';

const API = window.API;
const Personaje = window.Personaje;

export async function renderArmario() {
  const logro = await API.getLogros();
  const prendas = state.cachePrendas || [];
  const nivel = logro.nivel || 1;
  const rango = Personaje.rangoDeNivel(nivel);
  const prog = calcularProgreso(logro);
  const urlAvatar = Personaje.generarUrlDiceBear(logro.equipo, prendas, { 
    seed: (logro.personaje && logro.personaje.seed) || state.authUser?.uid || 'cosecha', 
    racha: logro.racha 
  });
  const marcoId = logro.equipo && logro.equipo.marco;
  const marcoPrenda = marcoId ? prendas.find(p => p.id === marcoId) : null;
  const marcoRango = (marcoPrenda && marcoPrenda.rango) || rango.nombre;
  const fondoId = logro.equipo && logro.equipo.fondo;
  const fondoPrenda = fondoId ? prendas.find(p => p.id === fondoId) : null;

  const tab = Personaje.TABS_ARMARIO.find(t => t.id === state.currentArmarioTab) || Personaje.TABS_ARMARIO[0];
  const cats = Personaje.CATEGORIAS_POR_TAB[tab.id] || [tab.id];
  const gridPrendas = prendas.filter(p => cats.includes(p.categoria));

  const grid = gridPrendas.map(p => {
    const esDuena = (logro.inventario || []).includes(p.id);
    const esEquipada = logro.equipo[p.categoria] === p.id;
    const bloqueada = (p.nivelRequerido || 1) > nivel;
    const precio = p.precio || 0;
    const sinNaranjas = (logro.naranjas || 0) < precio;

    let badge = '', boton = '';
    if (esEquipada) {
      badge = '<span class="prenda__badge equipped">✔️</span>';
      boton = `<button class="prenda__btn equipped" data-equip="${p.id}" data-cat="${p.categoria}">✔️ Puesto</button>`;
    } else if (esDuena) {
      badge = '<span class="prenda__badge own">🤝</span>';
      boton = `<button class="prenda__btn" data-equip="${p.id}" data-cat="${p.categoria}">Equipar</button>`;
    } else if (bloqueada) {
      badge = '<span class="prenda__badge locked">🔒</span>';
      boton = `<button class="prenda__btn locked" disabled>Nivel ${p.nivelRequerido}</button>`;
    } else {
      badge = '<span class="prenda__badge buy">🍊</span>';
      boton = `<button class="prenda__btn buy" data-compra="${p.id}" ${sinNaranjas ? 'disabled' : ''}>${precio} 🍊</button>`;
    }

    return `
      <div class="prenda ${esEquipada ? 'equipped' : ''} ${bloqueada ? 'locked' : ''}">
        ${badge}
        <div class="prenda__preview">${Personaje.preview(prendas, p)}</div>
        <small>${p.nombre}</small>
        <div class="prenda__cond">${esEquipada ? 'Equipado' : esDuena ? 'Comprado' : bloqueada ? 'Bloqueado por nivel' : (sinNaranjas ? 'Faltan 🍊' : 'Disponible')}</div>
        ${boton}
      </div>`;
  }).join('');

  const fondoStyle = fondoPrenda && fondoPrenda.gradiente ? `background:${fondoPrenda.gradiente};` : '';

  return `
    <div class="card">
      <div class="module-header">
        <div class="badge" style="background:var(--acento);">👗</div>
        <div><h2>Mi Armario y Perfil</h2><p>Personaliza tu personaje y compra con tus naranjas 🍊</p></div>
      </div>
      <div class="armario-layout">
        <div>
          <div class="perfil-card" style="${fondoStyle}">
            <div class="perfil-card__avatar">
              <div class="avatar-frame avatar-frame--${marcoRango}">
                <img src="${urlAvatar}" alt="Tu personaje" class="avatar-dicebear" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=cosecha&clothing=shirt'">
                <div class="avatar-frame__badge">${rango.icono} ${cap(rango.nombre)}</div>
              </div>
            </div>
            <div class="perfil-card__id">
              <h3>${logro.nombre || 'Aventurero'}</h3>
              <span class="perfil-card__role">${state.authUser?.email || 'estudiante'}</span>
            </div>
            <div class="xp-block perfil-card__xp">
              <div class="xp-bar"><div class="xp-bar__fill" style="width:${prog.progreso}%"></div></div>
              <div class="xp-bar__labels"><span>Nivel ${prog.nivel}</span><span>${prog.xpEnNivel} / ${prog.xpParaSiguiente} XP</span></div>
            </div>
            <div class="perfil-card__stats">
              <span class="pill">🍊 ${logro.naranjas || 0}</span>
              <span class="pill">🔥 ${logro.racha?.dias || 0} días</span>
              <span class="pill">⭐ ${prog.xpTotal} XP</span>
            </div>
          </div>
        </div>
        <div>
          <div class="cat-tabs">
            ${Personaje.TABS_ARMARIO.map(t => `<button class="${state.currentArmarioTab === t.id ? 'active' : ''}" data-cattab="${t.id}">${t.ico} ${t.label}</button>`).join('')}
          </div>
          <div class="prenda-grid">${grid || '<p class="empty">Este armario aún no tiene ítems.</p>'}</div>
        </div>
      </div>
    </div>
  `;
}