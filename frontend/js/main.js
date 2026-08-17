/**
 * Punto de entrada principal
 * Ensambla todos los módulos en un solo objeto App
 */

// --- State ---
import { state } from './modules/state.js';

// --- Renderers ---
// IMPORTAR TODO DESDE viewRenderers.js
import { ViewRenderers } from './modules/render/viewRenderers.js';

// Importar renderers individuales que NO están en ViewRenderers
import { renderInicio } from './modules/render/renderInicio.js';
import { renderArmario } from './modules/render/renderArmario.js';
import { renderAlbum } from './modules/render/renderAlbum.js';
import { renderDocenteMateria } from './modules/render/renderDocente.js';
import { renderDetalleTarea } from './modules/render/renderDetalleTarea.js';
import { renderAnalyticsGrupo } from './modules/render/renderAnalyticsGrupo.js';
import { ExerciseRenderers } from './modules/render/exerciseRenderers.js';
import { renderControlGrafica } from './modules/render/renderFraction.js';
import { AnalyticsRenderers } from './modules/render/analyticsRenderers.js';


// --- Handlers ---
import { AuthHandler } from './modules/handlers/authHandler.js';
import { TaskHandler } from './modules/handlers/taskHandler.js';
import { StudentHandler } from './modules/handlers/studentHandler.js';
import { ShopHandler } from './modules/handlers/shopHandler.js';
import { ExerciseHandler } from './modules/handlers/exerciseHandler.js';

// --- Utils ---
import { toast } from './modules/utils/domUtils.js';
import { formatMathText, escapeHtml, cap, esTipoSeleccion, esTipoSeleccionMultiple } from './modules/utils/formatters.js';
import { calcularProgreso, reconciliarProgreso, getProgressStorageKey } from './modules/utils/progressUtils.js';
import { polarCoords, arcSVG, graficaMeta } from './modules/utils/mathUtils.js';

// --- Construir el objeto App ---
const App = {
  // Estado (referencia)
  ...state,

  // Renderers - ViewRenderers ya contiene renderNav, renderModuloEstudiante y renderGestionEstudiantes
  ...ViewRenderers,  // ✅ Esto trae renderNav, renderModuloEstudiante, renderGestionEstudiantes
  
  // Renderers individuales (los que no están en ViewRenderers)
  renderInicio,
  renderArmario,
  renderAlbum,
  renderDocenteMateria,
  renderDetalleTarea,


  ...AnalyticsRenderers,

  // Vista del grupo: módulo dedicado (reemplaza la versión antigua embebida)
  renderAnalyticsGrupo,

  // Render de controles de respuesta (estudiante) + gráficas de fracciones
  ...ExerciseRenderers,
  renderControlGrafica,

  // Handlers
  ...AuthHandler,
  ...TaskHandler,
  ...StudentHandler,
  ...ShopHandler,
  ...ExerciseHandler,

  // Utils expuestos para uso en HTML
  formatMathText,
  escapeHtml,
  cap,
  esTipoSeleccion,
  esTipoSeleccionMultiple,
  calcularProgreso,
  reconciliarProgreso,
  getProgressStorageKey,
  polarCoords,
  arcSVG,
  graficaMeta,
  toast,

  // --- Método principal de render ---
  async render() {
    if (!this.authReady || !this.authUser) {
      return;
    }

    const screen = document.getElementById('appScreen');
    screen.innerHTML = '<p class="empty">Cargando…</p>';

    try {
      let html = '';
      if (this.currentRole === 'docente') {
        if (this.currentTaskView && (this.currentModule === 'matematicas' || this.currentModule === 'ingles')) {
          html = await this.renderDetalleTarea();
        } else if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') {
          html = await this.renderDocenteMateria(this.currentModule);
        } else if (this.currentModule === 'estudiantes') {
          html = await this.renderGestionEstudiantes(this);
        } else {
          html = await this.renderDocenteProgreso();
        }
      } else {
        if (this.currentModule === 'inicio') html = await this.renderInicio();
        else if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') {
          html = await this.renderModuloEstudiante(this.currentModule);
        } else if (this.currentModule === 'album') html = await this.renderAlbum();
      }
      screen.innerHTML = html;
      this.wireEvents();
    } catch (e) {
      screen.innerHTML = `<p class="empty">⚠️ Error: ${e.message}</p>`;
      console.error('Render error:', e);
    }
  },

  // --- Docente: Progreso ---
  async renderDocenteProgreso() {
    const viewTabs = `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button class="${this.analyticsView === 'grupo' ? 'primary' : 'ghost'}" onclick="window.App.cambiarAnalyticsView('grupo')">
            📊 Vista General del Grupo
          </button>
          <button class="${this.analyticsView === 'estudiante' ? 'primary' : 'ghost'}" onclick="window.App.cambiarAnalyticsView('estudiante')">
            👤 Por Estudiante
          </button>
        </div>
      </div>
    `;

    if (this.analyticsView === 'grupo') {
      try {
        const analyticsGrupo = await window.API.getAnalyticsGrupo();
        return viewTabs + await this.renderAnalyticsGrupo(analyticsGrupo);
      } catch (e) {
        console.error('Error cargando analytics del grupo:', e);
        return viewTabs + `<div class="card"><p class="empty">⚠️ Error al cargar analytics del grupo: ${e.message}</p></div>`;
      }
    } else {
      return viewTabs + await this.renderAnalyticsEstudiante(this);
    }
  },

  // --- Inicialización ---
  init() {
    // Inicializar autenticación
    const initialized = AuthHandler.init((user) => this.onAuthStateChanged(user));
    if (!initialized) {
      this.showLoginScreen('Configura tus claves reales de Firebase en window.COSECHA_FIREBASE_CONFIG para usar Auth.');
    }
  },

  // --- Eventos del DOM ---
  wireEvents() {
    if (this.currentRole === 'docente') {
      // Botón de guardar ejercicio
      const addBtn = document.getElementById('addExBtn');
      if (addBtn) {
        addBtn.onclick = () => this.guardarEjercicio();
      }

      // Edición de ejercicios
      document.querySelectorAll('.ans-edit').forEach(inp => {
        inp.onchange = async (e) => {
          await this.editarEjercicio(e.target.dataset.ex, 'respuestaCorrecta', e.target.value);
        };
      });
      document.querySelectorAll('.hint-edit').forEach(inp => {
        inp.onchange = async (e) => {
          await this.editarEjercicio(e.target.dataset.ex, 'pistaError', e.target.value);
        };
      });

      // Eliminar ejercicio
      document.querySelectorAll('[data-delete-ex]').forEach(btn => {
        btn.onclick = () => this.eliminarEjercicio(btn.dataset.deleteEx);
      });
    } else {
      // Validar respuesta de ejercicios (estudiante)
      document.querySelectorAll('[data-check]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.check;
          const materia = btn.dataset.materia;
          const cardSel = btn.closest('.task-card');
          const input = document.getElementById('resp_' + id);
          let respuesta = input ? input.value.trim() : '';
          
          if (!respuesta) {
            const gSel = cardSel?.querySelector('.grafica-sele[data-frac-key]');
            if (gSel) {
              const claveGraph = gSel.dataset.fracKey;
              const totalPartes = Number(gSel.dataset.den) || 1;
              const partesSel = (this.graficaSel[claveGraph] || []).filter(i => i < totalPartes);
              if (partesSel.length === 0) { toast('Colorea al menos una parte de la figura'); return; }
              respuesta = `${partesSel.length}/${totalPartes}`;
            } else {
              const marcadas = [].slice.call(cardSel?.querySelectorAll('input[name="resp_' + id + '"]:checked') || []);
              if (marcadas.length === 0) { toast('Recuerda seleccionar tu respuesta'); return; }
              respuesta = marcadas.length === 1 ? marcadas[0].value : marcadas.map(c => c.value);
            }
          }

          btn.disabled = true;
          btn.textContent = 'Validando…';

          const claveProgreso = `${this.currentTaskView?.id || 'libre'}_${id}`;
          this.intentosPorEjercicio[claveProgreso] = (this.intentosPorEjercicio[claveProgreso] || 0) + 1;
          this.saveProgressState();
          
          const fb = document.getElementById('fb_' + id);
          const card = btn.closest('.task-card');

          try {
            const resultado = await window.API.validarRespuesta(id, respuesta, this.currentTaskView?.id || null);

            if (card) {
              const attemptsEl = card.querySelector('.attempts');
              if (attemptsEl) attemptsEl.textContent = `Intentos: ${this.intentosPorEjercicio[claveProgreso]}`;
            }

            fb.innerHTML = `<div class="feedback ${resultado.correcto ? 'ok' : 'bad'}">${resultado.correcto ? '🎉 ' : '🔍 '}${this.formatMathText(resultado.mensaje)}</div>`;

            if (resultado.correcto || resultado.yaCompletado) {
              this.completedExerciseIds = [...new Set([...this.completedExerciseIds, claveProgreso])];
              this.completeTask(this.currentTaskView?.id);

              if (!resultado.yaCompletado) {
                const ganados = [];
                if (resultado.xpGanada) ganados.push(`+${resultado.xpGanada} XP`);
                if (resultado.naranjasGanadas) ganados.push(`+${resultado.naranjasGanadas} 🍊`);
                if (resultado.rachaBonus) ganados.push(`🔥 +${resultado.rachaBonus} XP racha`);
                if (resultado.leccionCumplida) ganados.push('🎓 Lección completada');
                toast(`🎉 ${resultado.correcto ? '¡Correcto!' : '¡Completado!'} ${ganados.join(' · ')}`);
                if (resultado.subioNivel) {
                  toast(`⬆️ ¡Subiste al nivel ${resultado.nuevoNivel}! ${resultado.rango?.icono || ''} ${this.cap(resultado.rango?.nombre || '')}`);
                }
                (resultado.nuevasPrendas || []).forEach(p => {
                  toast(`🛍️ ${p.nombre} disponible en la tienda`);
                });
              }
              await this.cargarPrendas();

              if (card) {
                const answerRow = card.querySelector('.answer-row');
                if (answerRow) answerRow.style.display = 'none';
                const opciones = card.querySelector('.opciones');
                if (opciones) opciones.style.display = 'none';
                const graficaSel = card.querySelector('.grafica-sele');
                if (graficaSel) graficaSel.style.display = 'none';
                fb.innerHTML = `<div class="feedback ok">✅ Resuelto correctamente</div>`;
              }
            } else {
              if (resultado.xpGanada) toast(`💪 +${resultado.xpGanada} XP por tu esfuerzo`);
              btn.disabled = false;
              btn.textContent = 'Comprobar';
            }
          } catch (e) {
            fb.innerHTML = `<div class="feedback bad">⚠️ ${e.message}</div>`;
            btn.disabled = false;
            btn.textContent = 'Comprobar';
          }
        };
      });

      // Widget de graficación
      document.querySelectorAll('[data-widget-part][data-frac-key]').forEach(part => {
        part.addEventListener('click', () => {
          const clave = part.dataset.fracKey;
          const idx = Number(part.dataset.idx);
          const arr = (this.graficaSel[clave] = this.graficaSel[clave] || []);
          const pos = arr.indexOf(idx);
          if (pos >= 0) arr.splice(pos, 1); else arr.push(idx);
          part.classList.toggle('sel', pos < 0);
          const total = Number(part.closest('.grafica-sele')?.dataset.den) || 1;
          const lbl = document.getElementById('fracCount_' + clave);
          if (lbl) lbl.textContent = `Coloreadas: ${arr.length}/${total}`;
        });
      });

      // Conmutar figura
      document.querySelectorAll('[data-frac-shape][data-frac-key]').forEach(shapeBtn => {
        shapeBtn.onclick = () => {
          const clave = shapeBtn.dataset.fracKey;
          const ej = (this.currentTaskExercises || []).find(t => String(t.id) === clave);
          if (!ej) return;
          ej.grafica = { ...(ej.grafica || {}), forma: shapeBtn.dataset.fracShape };
          this.render();
        };
      });

    // Demos de fracciones
    document.querySelectorAll('[data-frac-demo]').forEach(btn => {
      btn.onclick = async () => {  // ✅ Agregar 'async'
        const [numerador, denominador] = btn.dataset.fracDemo.split('/');
        this.currentFractionPreview = { 
          numerador: Number(numerador), 
          denominador: Number(denominador), 
          tipo: this.currentFractionPreview?.tipo || 'rectangulo' 
        };
        const { renderFractionPreview } = await import('./modules/render/renderFraction.js');
        renderFractionPreview();
      };
    });

    // Selector de tipo de gráfica
    const fractionGraphType = document.getElementById('fractionGraphType');
    if (fractionGraphType) {
      fractionGraphType.value = this.currentFractionPreview?.tipo || 'rectangulo';
      fractionGraphType.onchange = async (e) => {  // ✅ Agregar 'async'
        this.currentFractionPreview = { ...this.currentFractionPreview, tipo: e.target.value };
        const { renderFractionPreview } = await import('./modules/render/renderFraction.js');
        renderFractionPreview();
      };
    }

      // Selector de modo dinámico
      const dynamicModeSelect = document.getElementById('dynamicModeSelect');
      if (dynamicModeSelect) {
        dynamicModeSelect.value = this.currentDynamicMode;
        dynamicModeSelect.onchange = (e) => {
          this.currentDynamicMode = e.target.value;
          const hint = document.getElementById('dynamicModeHint');
          if (hint) hint.textContent = this.getDynamicModeHint(this.currentDynamicMode);
        };
      }

      // Pestañas del armario
      document.querySelectorAll('[data-cattab]').forEach(btn => {
        btn.onclick = () => { this.currentArmarioTab = btn.dataset.cattab; this.render(); };
      });

      // Equipar prenda
      document.querySelectorAll('[data-equip]').forEach(el => {
        el.onclick = async () => {
          const cat = el.dataset.cat;
          const id = el.dataset.equip;
          await this.equiparPrenda(cat, id);
        };
      });

      // Comprar prenda
      document.querySelectorAll('[data-compra]').forEach(el => {
        el.onclick = async () => {
          const id = el.dataset.compra;
          await this.comprarItem(id);
        };
      });
    }
  },

  // --- Persistencia de progreso ---
  saveProgressState(syncConServidor = true) {
    const payload = {
      completedTaskIds: this.completedTaskIds,
      completedExerciseIds: this.completedExerciseIds,
      intentosPorEjercicio: this.intentosPorEjercicio
    };
    try {
      window.localStorage.setItem(this.getProgressStorageKey(this.authUser?.uid), JSON.stringify(payload));
    } catch (e) {
      console.warn('No se pudo guardar el progreso local', e);
    }
    if (syncConServidor && this.authUser && window.API.authToken) {
      window.API.setProgreso(payload).catch(err => console.warn('No se pudo sincronizar el progreso', err));
    }
  }
};

// --- Sincronización App ↔ state ---
// `App` se construye mezclando `...state`, lo que crea una COPIA de los valores
// al cargar la página. Los handlers (auth, tareas, estudiantes, etc.) mutan el
// objeto `state` real, así que `App` leía valores obsoletos: por ejemplo
// `currentRole` quedaba en `null` y un docente terminaba viendo la vista de
// estudiante (mientras la píldora del usuario sí mostraba "docente").
// Aquí redefinimos cada clave de `state` dentro de `App` como getter/setter que
// delega SIEMPRE al objeto compartido: `this.currentRole`, `this.currentModule`,
// `this.currentTaskView`, etc. quedan sincronizados en vivo con `state`.
for (const key of Object.keys(state)) {
  Object.defineProperty(App, key, {
    get() { return state[key]; },
    set(val) { state[key] = val; },
    enumerable: true,
    configurable: true
  });
}

// Exponer App globalmente para llamadas desde HTML
window.App = App;

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());