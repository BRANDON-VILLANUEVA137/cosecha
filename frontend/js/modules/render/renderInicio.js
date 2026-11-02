import { state } from '../state.js';
import { formatMathText, cap } from '../utils/formatters.js';
import { calcularProgreso } from '../utils/progressUtils.js';
import { esc } from '../utils/domUtils.js';

const API = window.API;
const Personaje = window.Personaje;

// Acceso a una materia: tarjeta clicable que también funciona con teclado.
function accesoMateria(clase, modulo, icono, titulo, descripcion) {
  return `
    <div class="cta-card ${clase}" role="link" tabindex="0"
         aria-label="Entrar a ${titulo}"
         onclick="window.App.goModule('${modulo}')"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.App.goModule('${modulo}');}">
      <div class="n" aria-hidden="true">${icono}</div>
      <h3>${titulo}</h3>
      <p>${descripcion}</p>
      <span class="cta-card__go">Practicar</span>
    </div>`;
}

export async function renderInicio() {
  const logro = await API.getLogros();
  const rango = Personaje.rangoDeNivel(logro.nivel || 1);
  const prog = calcularProgreso(logro);
  const prendas = state.cachePrendas || [];
  const equipo = logro.equipo || {};
  const svgAvatar = Personaje.renderSVG(equipo, prendas);
  const marcoPrenda = equipo.marco ? prendas.find(p => p.id === equipo.marco) : null;
  const marcoRango = (marcoPrenda && marcoPrenda.rango) || rango.nombre;
  const fondoPrenda = equipo.fondo ? prendas.find(p => p.id === equipo.fondo) : null;
  const fondoStyle = fondoPrenda && fondoPrenda.gradiente ? ` style="background:${esc(fondoPrenda.gradiente)};"` : '';
  const faltanXp = Math.max(0, (prog.xpParaSiguiente || 0) - (prog.xpTotal || 0));

  return `
    <div class="card hero">
      <div class="hero-gamifica">
        <div class="profile-avatar">
          <div class="avatar-frame avatar-frame--${marcoRango}"${fondoStyle}>
            <div class="avatar-dicebear">${svgAvatar}</div>
            <div class="avatar-frame__badge">${rango.icono} ${cap(rango.nombre)}</div>
          </div>
        </div>
        <div class="hero-text">
          <h2>¡Hola, ${esc(logro.nombre || 'Aventurero')}! 👋</h2>
          <p>Gana <strong>XP</strong> y <strong>🍊 naranjas</strong> resolviendo ejercicios para personalizar tu personaje.</p>
          <div class="xp-block">
            <div class="xp-bar" role="progressbar" aria-label="Progreso de nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${prog.progreso}">
              <div class="xp-bar__fill" style="width:${prog.progreso}%"></div>
            </div>
            <div class="xp-bar__labels">
              <span>Nivel ${prog.nivel}</span>
              <span>Te faltan ${faltanXp} XP para el nivel ${Number(prog.nivel) + 1}</span>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat"><b>${prog.xpTotal}</b><span>XP TOTAL</span></div>
            <div class="stat"><b>${logro.naranjas || 0}</b><span>NARANJAS 🍊</span></div>
            <div class="stat"><b>${logro.racha?.dias || 0}</b><span>RACHA 🔥</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="subject-cta">
      ${accesoMateria('mat', 'matematicas', '🍊', 'Matemáticas', 'Fracciones: sumas y multiplicación')}
      ${accesoMateria('ing', 'ingles', '🌴', 'Inglés', 'Verbo to be y pronombres')}
    </div>
  `;
}
