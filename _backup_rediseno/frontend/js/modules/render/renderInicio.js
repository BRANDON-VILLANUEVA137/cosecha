import { state } from '../state.js';
import { formatMathText, cap } from '../utils/formatters.js';
import { calcularProgreso } from '../utils/progressUtils.js';

const API = window.API;
const Personaje = window.Personaje;

export async function renderInicio() {
  const logro = await API.getLogros();
  const rango = Personaje.rangoDeNivel(logro.nivel || 1);
  const prog = calcularProgreso(logro);
  const urlAvatar = Personaje.generarUrlDiceBear(logro.equipo, state.cachePrendas, { 
    seed: (logro.personaje && logro.personaje.seed) || state.authUser?.uid || 'cosecha', 
    racha: logro.racha 
  });

  return `
    <div class="card hero">
      <div class="hero-gamifica">
        <div class="profile-avatar">
          <div class="avatar-frame avatar-frame--${rango.nombre}">
            <img src="${urlAvatar}" alt="Tu personaje" class="avatar-dicebear" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=cosecha&clothing=shirt'">
            <div class="avatar-frame__badge">${rango.icono} ${cap(rango.nombre)}</div>
          </div>
        </div>
        <div class="hero-text">
          <h2>¡Hola, ${logro.nombre || 'Aventurero'}! 👋</h2>
          <p>Gana <strong>XP</strong> y <strong>🍊 naranjas</strong> resolviendo ejercicios para personalizar tu personaje.</p>
          <div class="xp-block">
            <div class="xp-bar"><div class="xp-bar__fill" style="width:${prog.progreso}%"></div></div>
            <div class="xp-bar__labels"><span>Nivel ${prog.nivel}</span><span>${prog.xpEnNivel} / ${prog.xpParaSiguiente} XP · ${prog.progreso}%</span></div>
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
      <div class="cta-card mat" onclick="window.App.goModule('matematicas')">
        <div class="n">🍊</div>
        <h3>Matemáticas</h3>
        <p>Fracciones: sumas y multiplicación</p>
      </div>
      <div class="cta-card ing" onclick="window.App.goModule('ingles')">
        <div class="n">🌴</div>
        <h3>Inglés</h3>
        <p>Verbo to be y pronombres</p>
      </div>
    </div>
  `;
}