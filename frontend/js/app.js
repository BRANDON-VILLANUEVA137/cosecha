/**
 * APLICACIÓN PRINCIPAL — estado, navegación y renderizado.
 * Se comunica con el backend a través de la capa API.
 */
const App = {
  currentRole: null,
  currentModule: 'inicio',
  currentArmarioTab: 'cabeza',
  currentTheme: 'citrico',
  intentosPorEjercicio: {},
  cachePrendas: [],
  authUser: null,
  authReady: false,

  formatMathText(texto) {
    if (typeof texto !== 'string' || !texto) return '';
    return texto.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
      return `<span class="fraccion" aria-label="${num}/${den}"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });
  },

  /* ---------- Inicialización ---------- */
  init() {
    const switchRoleBtn = document.getElementById('switchRoleBtn');
    if (switchRoleBtn) {
      switchRoleBtn.onclick = () => this.switchRole();
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.onchange = (e) => this.setTheme(e.target.value);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => this.handleLogout();
    }

    const config = window.COSECHA_FIREBASE_CONFIG || window.firebaseConfig || null;
    const hasValidConfig = config && config.apiKey && config.projectId && config.appId
      && !String(config.apiKey).includes('...')
      && !String(config.projectId).includes('...')
      && !String(config.appId).includes('...')
      && !String(config.apiKey).includes('TU_')
      && !String(config.projectId).includes('TU_')
      && !String(config.appId).includes('TU_');

    if (!hasValidConfig) {
      this.showLoginScreen('Configura tus claves reales de Firebase en window.COSECHA_FIREBASE_CONFIG para usar Auth.');
      return;
    }

    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }

      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => this.onAuthStateChanged(user));
      } else {
        this.showLoginScreen('Firebase Auth no está disponible');
      }
    } catch (error) {
      this.showLoginScreen(error.message || 'No se pudo inicializar Firebase');
    }
  },

  async onAuthStateChanged(user) {
    this.authUser = user;
    this.authReady = true;

    if (!user) {
      API.clearAuthToken();
      this.currentRole = null;
      this.showLoginScreen();
      return;
    }

    try {
      const token = await user.getIdToken();
      API.setAuthToken(token);
      const session = await API.getSession();
      this.currentRole = session.rol || 'estudiante';
      this.updateUserPill();
      this.hideLoginScreen();
      this.render();
    } catch (error) {
      console.error(error);
      API.clearAuthToken();
      this.showLoginScreen(error.message || 'No se pudo iniciar sesión');
    }
  },

  async handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const errorBox = document.getElementById('loginError');

    if (!emailInput || !passwordInput || !errorBox) {
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorBox.textContent = 'Ingresa correo y contraseña.';
      return;
    }

    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.apps.length) {
      errorBox.textContent = 'Firebase no está inicializado con tus claves reales.';
      return;
    }

    try {
      errorBox.textContent = '';
      const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
      await credential.user.getIdToken();
    } catch (error) {
      errorBox.textContent = error.message || 'No se pudo iniciar sesión';
    }
  },

  async handleLogout() {
    try {
      await firebase.auth().signOut();
      API.clearAuthToken();
      this.currentRole = null;
      this.showLoginScreen();
    } catch (error) {
      this.toast('⚠️ ' + error.message);
    }
  },

  updateUserPill() {
    const userPill = document.getElementById('userPill');
    if (!userPill) return;

    if (!this.authUser) {
      userPill.innerHTML = '<span class="user-pill__label">Sin sesión</span>';
      return;
    }

    const email = this.authUser.email || 'Usuario';
    const rol = this.currentRole || 'sin rol';
    userPill.innerHTML = `<span class="user-pill__label">${email}</span><span class="tag ${rol === 'docente' ? 'mat' : 'ing'}">${rol}</span>`;
  },

  showLoginScreen(message = '') {
    const errorBox = document.getElementById('loginError');
    if (errorBox) {
      errorBox.textContent = message;
    }

    this.updateUserPill();

    const roleSelect = document.getElementById('roleSelectScreen');
    const topControls = document.getElementById('topControls');
    const navBar = document.getElementById('navBar');
    const appScreen = document.getElementById('appScreen');
    const loginScreen = document.getElementById('loginScreen');

    if (roleSelect) roleSelect.style.display = 'none';
    if (topControls) topControls.style.display = 'none';
    if (navBar) navBar.style.display = 'none';
    if (appScreen) appScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
  },

  hideLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const topControls = document.getElementById('topControls');
    const navBar = document.getElementById('navBar');
    const appScreen = document.getElementById('appScreen');

    if (loginScreen) loginScreen.style.display = 'none';
    if (topControls) topControls.style.display = 'flex';
    if (navBar) navBar.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'block';
    this.updateUserPill();
    this.renderNav();
  },

  async cargarPrendas() {
    if (!this.authReady || !this.authUser) {
      return;
    }

    try {
      this.cachePrendas = await API.getPrendas();
    } catch (e) {
      console.error('Error cargando prendas:', e);
    }
  },

  /* ---------- Tema ---------- */
  setTheme(theme) {
    this.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    document.getElementById('brandFruit').textContent = theme === 'citrico' ? '🍊' : '🍍';
    document.getElementById('themeSelect').value = theme;
    if (this.currentRole) this.render();
  },

  /* ---------- Roles ---------- */
  enterRole(role) {
    if (!this.authUser) {
      this.showLoginScreen('Inicia sesión para entrar a la plataforma.');
      return;
    }

    const allowedRole = this.currentRole || role;
    this.currentRole = allowedRole;
    this.currentModule = allowedRole === 'docente' ? 'matematicas' : 'inicio';

    const roleSelect = document.getElementById('roleSelectScreen');
    const topControls = document.getElementById('topControls');
    const navBar = document.getElementById('navBar');
    const appScreen = document.getElementById('appScreen');
    const roleTag = document.getElementById('roleTag');

    if (roleSelect) roleSelect.style.display = 'none';
    if (topControls) topControls.style.display = 'flex';
    if (navBar) navBar.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'block';
    if (roleTag) {
      roleTag.className = 'tag ' + (allowedRole === 'docente' ? 'mat' : 'ing');
      roleTag.textContent = allowedRole === 'docente' ? '🧑‍🏫 Docente' : '🧒 Estudiante';
    }

    this.updateUserPill();
    this.renderNav();
    this.render();
  },

  switchRole() {
    if (!this.authUser) {
      this.showLoginScreen('Inicia sesión para usar la plataforma.');
      return;
    }

    if (this.currentRole === 'docente') {
      this.toast('Tu cuenta está configurada como docente.');
      return;
    }

    this.toast('Tu cuenta está configurada como estudiante.');
  },

  /* ---------- Utilidades ---------- */
  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  },

  goModule(mod) {
    this.currentModule = mod;
    this.renderNav();
    this.render();
  },

  /* ---------- Navegación ---------- */
  renderNav() {
    const tabsEstudiante = [
      { id: 'inicio', ico: '🏠', label: 'Inicio' },
      { id: 'matematicas', ico: '🍊', label: 'Matemáticas' },
      { id: 'ingles', ico: '🌴', label: 'Inglés' },
      { id: 'armario', ico: '👕', label: 'Armario' },
    ];
    const tabsDocente = [
      { id: 'matematicas', ico: '🍊', label: 'Matemáticas' },
      { id: 'ingles', ico: '🌴', label: 'Inglés' },
      { id: 'progreso', ico: '📊', label: 'Progreso' },
    ];
    const tabs = this.currentRole === 'docente' ? tabsDocente : tabsEstudiante;
    document.getElementById('navBar').innerHTML = tabs.map(t => `
      <button data-mod="${t.id}" class="${this.currentModule === t.id ? 'active' : ''}" onclick="App.goModule('${t.id}')">
        <span class="ico">${t.ico}</span> ${t.label}
      </button>`).join('');
  },

  /* ---------- Render principal ---------- */
  async render() {
    if (!this.authReady || !this.authUser) {
      return;
    }

    const screen = document.getElementById('appScreen');
    screen.innerHTML = '<p class="empty">Cargando…</p>';

    try {
      let html = '';
      if (this.currentRole === 'docente') {
        if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') {
          html = await this.renderDocenteMateria(this.currentModule);
        } else {
          html = await this.renderDocenteProgreso();
        }
      } else {
        if (this.currentModule === 'inicio') html = await this.renderInicio();
        else if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') html = await this.renderModuloEstudiante(this.currentModule);
        else if (this.currentModule === 'armario') html = await this.renderArmario();
      }
      screen.innerHTML = html;
      this.wireEvents();
    } catch (e) {
      screen.innerHTML = `<p class="empty">⚠️ Error: ${e.message}</p>`;
    }
  },

  /* ---------- INICIO (estudiante) ---------- */
  async renderInicio() {
    const logro = await API.getLogros();
    return `
      <div class="card hero">
        <div class="personaje-mini">${Personaje.renderSVG(logro.equipo, this.cachePrendas, 140)}</div>
        <div class="hero-text">
          <h2>¡Hola! 👋</h2>
          <p>Resuelve ejercicios para desbloquear prendas nuevas para tu personaje.</p>
          <div class="stat-row">
            <div class="stat"><b>${logro.aciertosMatematicas}</b><span>ACIERTOS MATE</span></div>
            <div class="stat"><b>${logro.aciertosIngles}</b><span>ACIERTOS INGLÉS</span></div>
            <div class="stat"><b>${logro.desbloqueadas.length}</b><span>PRENDAS</span></div>
          </div>
        </div>
      </div>
      <div class="subject-cta">
        <div class="cta-card mat" onclick="App.goModule('matematicas')">
          <div class="n">🍊</div>
          <h3>Matemáticas</h3>
          <p>Fracciones: sumas y multiplicación</p>
        </div>
        <div class="cta-card ing" onclick="App.goModule('ingles')">
          <div class="n">🌴</div>
          <h3>Inglés</h3>
          <p>Verbo to be y pronombres</p>
        </div>
      </div>
    `;
  },

  /* ---------- MÓDULO POR MATERIA (estudiante) ---------- */
  async renderModuloEstudiante(materia) {
    const [ejercicios, logro] = await Promise.all([
      API.getEjercicios(materia),
      API.getLogros()
    ]);
    const esMat = materia === 'matematicas';
    const aciertos = esMat ? logro.aciertosMatematicas : logro.aciertosIngles;

    const tareas = ejercicios.map(e => {
      const intentos = this.intentosPorEjercicio[e.id] || 0;
      return `
      <div class="task-card">
        <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
        <div class="enun">${this.formatMathText(e.enunciado)}</div>
        <div class="answer-row">
          <input type="text" placeholder="Tu respuesta" id="resp_${e.id}">
          <button class="primary" data-check="${e.id}" data-materia="${materia}">Comprobar</button>
        </div>
        <div class="attempts">Intentos: ${intentos}</div>
        <div id="fb_${e.id}"></div>
      </div>`;
    }).join('') || '<p class="empty">No hay ejercicios en este módulo todavía.</p>';

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '🍊' : '🌴'}</div>
          <div>
            <h2>${esMat ? 'Matemáticas' : 'Inglés'}</h2>
            <p>${esMat ? 'Fracciones: suma y multiplicación' : 'Verbo to be y pronombres'}</p>
          </div>
        </div>
        <div class="stat-row"><div class="stat"><b>${aciertos}</b><span>ACIERTOS EN ESTA MATERIA</span></div></div>
      </div>
      ${tareas}
    `;
  },

  /* ---------- ARMARIO (estudiante) ---------- */
  async renderArmario() {
    const [logro, prendas] = await Promise.all([
      API.getLogros(),
      API.getPrendas(this.currentArmarioTab)
    ]);
    const categorias = ['cabeza', 'torso', 'piernas', 'calzado', 'accesorio'];

    const grid = prendas.map(p => {
      const desbloqueada = logro.desbloqueadas.includes(p.id);
      const equipada = logro.equipo[p.categoria] === p.id;
      const condTexto = p.condicion ? `${p.condicion.valor} aciertos en ${p.origen === 'matematicas' ? 'Matemáticas' : 'Inglés'}` : 'De fábrica';
      return `
        <div class="prenda ${desbloqueada ? '' : 'locked'} ${equipada ? 'equipped' : ''}" ${desbloqueada ? `data-equip="${p.id}" data-cat="${p.categoria}"` : ''}>
          ${equipada ? '<span class="check">✔️</span>' : (desbloqueada ? '' : '<span class="lockicon">🔒</span>')}
          <div class="swatch" style="background:${p.color}22; border:2px solid ${p.color};">${Personaje.ICONS_CATEGORIA[p.categoria][p.shape] || '❔'}</div>
          <small>${p.nombre}</small>
          <div class="cond">${desbloqueada ? (equipada ? 'Puesto' : 'Toca para usar') : condTexto}</div>
        </div>`;
    }).join('');

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">👗</div>
          <div><h2>Mi Armario</h2><p>Viste a tu personaje con lo que has desbloqueado</p></div>
        </div>
        <div class="armario-layout">
          <div class="personaje-stage">${Personaje.renderSVG(logro.equipo, this.cachePrendas, 190)}
            <div class="hand" style="font-size:20px; margin-top:4px;">¡Tu personaje!</div>
          </div>
          <div>
            <div class="cat-tabs">
              ${categorias.map(c => `<button class="${this.currentArmarioTab === c ? 'active' : ''}" data-cattab="${c}">${Personaje.ICONS_CATEGORIA[c][Object.keys(Personaje.ICONS_CATEGORIA[c])[0]]} ${Personaje.NOMBRE_CATEGORIA[c]}</button>`).join('')}
            </div>
            <div class="prenda-grid">${grid}</div>
          </div>
        </div>
      </div>
    `;
  },

  /* ---------- DOCENTE: módulo por materia ---------- */
  async renderDocenteMateria(materia) {
    const esMat = materia === 'matematicas';
    const ejercicios = await API.getEjercicios(materia);

    const lista = ejercicios.map(e => `
      <div class="ex-item">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
            <div class="ex-enun">${this.formatMathText(e.enunciado)}</div>
          </div>
          <button class="ghost" data-delete-ex="${e.id}" style="color:var(--error-suave); border-color:rgba(255,107,107,.35);">🗑️ Eliminar</button>
        </div>
        <label>Respuesta correcta (oculta para la estudiante)</label>
        <input type="text" value="${e.respuestaCorrecta}" data-ex="${e.id}" class="ans-edit">
        <label>Pista si falla</label>
        <input type="text" value="${e.pistaError}" data-ex="${e.id}" class="hint-edit">
        <div class="hint-preview"><strong>Pista:</strong> ${this.formatMathText(e.pistaError || 'Sin pista')}</div>
      </div>`).join('') || '<p class="empty">Sin ejercicios todavía.</p>';

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '🍊' : '🌴'}</div>
          <div><h2>${esMat ? 'Matemáticas' : 'Inglés'}</h2><p>Banco de ejercicios de este módulo</p></div>
        </div>
        ${lista}
      </div>

      <div class="card">
        <h2>➕ Nuevo ejercicio de ${esMat ? 'Matemáticas' : 'Inglés'}</h2>
        <div class="grid2">
          <div>
            <label>Tema</label>
            <input type="text" id="newTema" placeholder="Ej: Fracciones · Carita Sonriente">
            <label>Tipo</label>
            <select id="newTipo"><option value="fraccion">Fracción (a/b)</option><option value="texto">Texto corto</option></select>
          </div>
          <div>
            <label>Enunciado</label>
            <textarea id="newEnun" placeholder="Ej: 4/9 + 1/3 = ?"></textarea>
            <label>Respuesta correcta (no la verá la estudiante)</label>
            <input type="text" id="newResp" placeholder="Ej: 7/9">
            <label>Pista en caso de error</label>
            <input type="text" id="newPista" placeholder="Ej: Revisa si aplicaste bien la carita sonriente.">
          </div>
        </div>
        <div style="margin-top:14px;"><button class="primary" id="addExBtn" data-materia="${materia}">Guardar ejercicio</button></div>
      </div>
    `;
  },

  /* ---------- DOCENTE: progreso ---------- */
  async renderDocenteProgreso() {
    const logro = await API.getLogros();
    const historial = logro.historial.slice(-12).reverse();
    return `
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📊</div>
          <div><h2>Progreso general</h2><p>Aciertos, intentos y prendas desbloqueadas</p></div>
        </div>
        <div class="stat-row">
          <div class="stat"><b>${logro.aciertosMatematicas}</b><span>ACIERTOS MATE</span></div>
          <div class="stat"><b>${logro.aciertosIngles}</b><span>ACIERTOS INGLÉS</span></div>
          <div class="stat"><b>${logro.intentos}</b><span>INTENTOS TOTALES</span></div>
          <div class="stat"><b>${logro.desbloqueadas.length}</b><span>PRENDAS</span></div>
        </div>
        <div class="personaje-stage" style="margin-top:14px; max-width:220px;">${Personaje.renderSVG(logro.equipo, this.cachePrendas, 150)}</div>
      </div>
      <div class="card">
        <h2>Historial de intentos</h2>
        ${historial.length === 0 ? '<p class="empty">Aún no hay intentos registrados.</p>' : historial.map(h => `
          <div class="ex-item" style="border-style:solid;">
            <div class="top">
              <div>
                <span class="tag ${h.materia === 'matematicas' ? 'mat' : 'ing'}">${h.materia === 'matematicas' ? 'Matemáticas' : 'Inglés'}</span>
                <div style="font-weight:700; margin-top:4px;">${this.formatMathText(h.enunciado)}</div>
                <div style="font-size:13px; color:var(--texto-suave);">Respondió: <b>${this.formatMathText(h.respuesta)}</b> → Correcta: <b>${this.formatMathText(h.respuestaCorrecta)}</b></div>
              </div>
              <span class="tag" style="background:${h.correcto ? 'var(--secundario)' : 'var(--error-suave)'}">${h.correcto ? 'Correcto' : 'Incorrecto'}</span>
            </div>
          </div>`).join('')}
      </div>
    `;
  },

  /* ---------- EVENTOS ---------- */
  wireEvents() {
    if (this.currentRole === 'docente') {
      const addBtn = document.getElementById('addExBtn');
      if (addBtn) addBtn.onclick = async () => {
        const materia = addBtn.dataset.materia;
        const tema = document.getElementById('newTema').value || 'General';
        const tipo = document.getElementById('newTipo').value;
        const enunciado = document.getElementById('newEnun').value.trim();
        const respuestaCorrecta = document.getElementById('newResp').value.trim();
        const pistaError = document.getElementById('newPista').value.trim() || 'Vuelve a revisar el procedimiento paso a paso.';
        if (!enunciado || !respuestaCorrecta) { this.toast('⚠️ Completa enunciado y respuesta'); return; }
        try {
          await API.crearEjercicio({ materia, tema, tipo, enunciado, respuestaCorrecta, pistaError });
          this.toast('✅ Ejercicio guardado');
          this.render();
        } catch (e) { this.toast('⚠️ ' + e.message); }
      };

      document.querySelectorAll('.ans-edit').forEach(inp => inp.onchange = async (e) => {
        await API.editarEjercicio(e.target.dataset.ex, { respuestaCorrecta: e.target.value });
      });
      document.querySelectorAll('.hint-edit').forEach(inp => inp.onchange = async (e) => {
        await API.editarEjercicio(e.target.dataset.ex, { pistaError: e.target.value });
      });

      document.querySelectorAll('[data-delete-ex]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.deleteEx;
          const confirmar = window.confirm('¿Seguro que quieres eliminar este ejercicio?');
          if (!confirmar) return;

          try {
            await API.eliminarEjercicio(id);
            this.toast('🗑️ Ejercicio eliminado');
            this.render();
          } catch (e) {
            this.toast('⚠️ ' + e.message);
          }
        };
      });
    } else {
      document.querySelectorAll('[data-check]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.check;
          const materia = btn.dataset.materia;
          const input = document.getElementById('resp_' + id);
          const respuesta = input.value.trim();
          if (!respuesta) return;

          this.intentosPorEjercicio[id] = (this.intentosPorEjercicio[id] || 0) + 1;
          const fb = document.getElementById('fb_' + id);

          try {
            const resultado = await API.validarRespuesta(id, respuesta);
            fb.innerHTML = `<div class="feedback ${resultado.correcto ? 'ok' : 'bad'}">${resultado.correcto ? '🎉 ' : '🔍 '}${this.formatMathText(resultado.mensaje)}</div>`;

            if (resultado.correcto) {
              resultado.nuevasPrendas.forEach(p => {
                this.toast(`🎁 ¡Nueva prenda! ${Personaje.ICONS_CATEGORIA[p.categoria][p.shape]} ${p.nombre}`);
              });
              await this.cargarPrendas();
              setTimeout(() => this.render(), 700);
            }
          } catch (e) {
            fb.innerHTML = `<div class="feedback bad">⚠️ ${e.message}</div>`;
          }
        };
      });

      document.querySelectorAll('[data-cattab]').forEach(btn => {
        btn.onclick = () => { this.currentArmarioTab = btn.dataset.cattab; this.render(); };
      });

      document.querySelectorAll('[data-equip]').forEach(el => {
        el.onclick = async () => {
          const cat = el.dataset.cat;
          const id = el.dataset.equip;
          try {
            await API.equiparPrenda(cat, id);
            this.render();
          } catch (e) { this.toast('⚠️ ' + e.message); }
        };
      });
    }
  }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());