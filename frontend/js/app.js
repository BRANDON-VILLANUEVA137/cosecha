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
  currentFractionPreview: { numerador: 2, denominador: 5, tipo: 'rectangulo' },
  currentDynamicMode: 'paso',
  currentTaskView: null,
  currentTaskExercises: [],
  completedTaskIds: [],
  completedExerciseIds: [],
  allEjercicios: [], // Banco de ejercicios disponibles

  formatMathText(texto) {
    if (typeof texto !== 'string' || !texto) return '';
    return texto.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
      return `<span class="fraccion" aria-label="${num}/${den}"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });
  },

  renderFractionGraphic(numerador, denominador, tipoFigura = 'rectangulo') {
    const safeNum = Math.max(1, Math.floor(Number(numerador) || 0));
    const safeDen = Math.max(1, Math.floor(Number(denominador) || 0));
    const totalFigures = Math.ceil(safeNum / safeDen);
    const fullFigures = Math.floor(safeNum / safeDen);
    const remainder = safeNum % safeDen;

    const figuras = [];
    for (let i = 0; i < totalFigures; i += 1) {
      const filled = i < fullFigures ? safeDen : (i === fullFigures ? remainder : 0);
      const isCircle = tipoFigura === 'circulo';
      const pieces = [];

      if (isCircle) {
        const pct = safeDen > 0 ? (filled / safeDen) * 100 : 0;
        pieces.push(`<div class="shape-circle-fill" style="background:conic-gradient(var(--primario) ${pct}%, rgba(255,140,51,.18) ${pct}% 100%);"></div>`);
      } else {
        for (let index = 0; index < safeDen; index += 1) {
          pieces.push(`<div class="shape-slice ${index < filled ? 'filled' : ''}"></div>`);
        }
      }

      figuras.push(`
        <div class="fraction-figure-card">
          <div class="shape-container ${isCircle ? 'circle' : 'rectangle'}">${pieces.join('')}</div>
          <div class="figure-label">${isCircle ? 'Círculo' : 'Rectángulo'} ${i + 1}</div>
        </div>`);
    }

    return `<div class="fraction-canvas">${figuras.join('')}</div>`;
  },

  renderFractionPreview() {
    const area = document.getElementById('fractionGraphicArea');
    if (!area) return;

    const preview = this.currentFractionPreview || { numerador: 2, denominador: 5, tipo: 'rectangulo' };
    const title = `${preview.numerador}/${preview.denominador}`;
    area.innerHTML = `
      <div class="fraction-preview-card">
        <div class="fraction-preview-title">
          <strong>${title}</strong>
          <span>${preview.tipo === 'circulo' ? 'Vista circular' : 'Vista rectangular'}</span>
        </div>
        ${this.renderFractionGraphic(preview.numerador, preview.denominador, preview.tipo)}
      </div>`;
  },

  getDynamicModeHint(mode) {
    const hints = {
      paso: 'Muestra la estrategia de la carita sonriente paso a paso para que el estudiante entienda el procedimiento.',
      grafico: 'Combina la visualización con rectángulos y círculos para reforzar el concepto de fracciones.',
      desafio: 'Convierte la clase en un reto rápido con tiempo límite y preguntas breves.',
      gramatica: 'Enfoca la actividad en completar verbos y pronombres con apoyo visual.'
    };
    return hints[mode] || hints.paso;
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
    this.loadProgressState();

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

  getProgressStorageKey() {
    return `cosecha-progress-${this.authUser?.uid || 'guest'}`;
  },

  loadProgressState() {
    try {
      const raw = window.localStorage.getItem(this.getProgressStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.completedTaskIds = Array.isArray(parsed.completedTaskIds) ? parsed.completedTaskIds : [];
      this.completedExerciseIds = Array.isArray(parsed.completedExerciseIds) ? parsed.completedExerciseIds : [];
      this.intentosPorEjercicio = parsed.intentosPorEjercicio && typeof parsed.intentosPorEjercicio === 'object'
        ? parsed.intentosPorEjercicio
        : {};
    } catch (e) {
      console.warn('No se pudo cargar el progreso guardado', e);
    }
  },

  saveProgressState() {
    try {
      const payload = {
        completedTaskIds: this.completedTaskIds,
        completedExerciseIds: this.completedExerciseIds,
        intentosPorEjercicio: this.intentosPorEjercicio
      };
      window.localStorage.setItem(this.getProgressStorageKey(), JSON.stringify(payload));
    } catch (e) {
      console.warn('No se pudo guardar el progreso local', e);
    }
  },

  goModule(mod) {
    this.currentModule = mod;
    this.currentTaskView = null;
    this.currentTaskExercises = [];
    this.renderNav();
    this.render();
  },

  startTask(task) {
    this.currentTaskView = task;
    this.currentTaskExercises = task.ejercicios || [];
    this.render();
  },

  closeTaskView() {
    this.currentTaskView = null;
    this.currentTaskExercises = [];
    this.render();
  },

  completeTask(id = this.currentTaskView?.id) {
    if (id) {
      this.completedTaskIds = [...new Set([...this.completedTaskIds, id])];
    }
    this.saveProgressState();
  },

  finishTask() {
    this.completeTask();
    if (this.currentTaskView?.id) {
      this.toast('✅ Tarea finalizada');
    }
    this.currentTaskView = null;
    this.currentTaskExercises = [];
    this.render();
  },

  // ---- Métodos de gestión de tareas (docente) ----
  mostrarFormTarea(materia) {
    const form = document.getElementById('formTarea');
    if (form) form.style.display = 'block';
  },

  ocultarFormTarea() {
    const form = document.getElementById('formTarea');
    if (form) form.style.display = 'none';
  },

  async crearTarea(materia) {
    const titulo = document.getElementById('tareaTitulo').value.trim();
    const descripcion = document.getElementById('tareaDescripcion').value.trim();
    
    if (!titulo) {
      this.toast('⚠️ Ingresa un título para la tarea');
      return;
    }

    try {
      await API.crearTarea({ titulo, descripcion, materia });
      this.toast('✅ Tarea creada');
      this.ocultarFormTarea();
      this.render();
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  async eliminarTarea(id) {
    const confirmar = window.confirm('¿Seguro que quieres eliminar esta tarea y todos sus ejercicios?');
    if (!confirmar) return;

    try {
      await API.eliminarTarea(id);
      this.toast('🗑️ Tarea eliminada');
      this.render();
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  async verTareaDocente(id) {
    try {
      const tarea = await API.getTarea(id);
      this.currentTaskView = tarea;
      this.currentTaskExercises = tarea.ejercicios || [];
      this.render();
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  async renderDetalleTarea() {
    if (!this.currentTaskView) return '';
    
    const tarea = this.currentTaskView;
    const ejerciciosEnTarea = this.currentTaskExercises || [];
    const esMat = tarea.materia === 'matematicas';
    
    // Obtener ejercicios disponibles que no están en la tarea
    const ejerciciosDisponibles = this.allEjercicios.filter(ej => 
      !ejerciciosEnTarea.some(e => e.id === ej.id)
    );

    const ejerciciosHtml = ejerciciosEnTarea.map(ej => `
      <div class="ex-item">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
            <div class="ex-enun">${this.formatMathText(ej.enunciado)}</div>
          </div>
          <button class="ghost" onclick="App.eliminarEjercicioDeTarea('${ej.id}')" style="color:var(--error-suave);">❌ Quitar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">No hay ejercicios en esta tarea.</p>';

    const disponiblesHtml = ejerciciosDisponibles.map(ej => `
      <div class="ex-item" style="border-style:dashed;">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
            <div class="ex-enun">${this.formatMathText(ej.enunciado)}</div>
          </div>
          <button class="primary" onclick="App.agregarEjercicioATarea('${ej.id}')">➕ Agregar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">Todos los ejercicios están en la tarea.</p>';

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📚</div>
          <div>
            <h2>${tarea.titulo}</h2>
            <p>${tarea.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
        <div class="task-nav-row">
          <button class="ghost" onclick="App.closeTaskView()">← Volver a tareas</button>
          <button class="ghost" onclick="App.eliminarTarea('${tarea.id}')" style="color:var(--error-suave);">🗑️ Eliminar Tarea</button>
        </div>
        <div class="task-meta">${ejerciciosEnTarea.length} ejercicios en esta tarea</div>
      </div>

      <!-- Ejercicios en la tarea -->
      <div class="card">
        <h3>📋 Ejercicios de la tarea (${ejerciciosEnTarea.length})</h3>
        <div style="margin-top:10px;">${ejerciciosHtml}</div>
      </div>

      <!-- Ejercicios disponibles para agregar -->
      <div class="card">
        <h3>➕ Agregar ejercicios desde el banco</h3>
        <p style="color:var(--texto-suave); font-size:13px;">Ejercicios disponibles que puedes agregar a esta tarea:</p>
        <div style="margin-top:10px;">${disponiblesHtml}</div>
      </div>
    `;
  },

  async agregarEjercicioATarea(ejercicioId) {
    if (!this.currentTaskView) return;
    
    try {
      await API.agregarEjercicioATarea(this.currentTaskView.id, ejercicioId);
      this.toast('✅ Ejercicio agregado');
      // Recargar la tarea
      await this.verTareaDocente(this.currentTaskView.id);
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  async eliminarEjercicioDeTarea(ejercicioId) {
    if (!this.currentTaskView) return;
    
    const confirmar = window.confirm('¿Quitar este ejercicio de la tarea?');
    if (!confirmar) return;

    try {
      await API.eliminarEjercicioDeTarea(this.currentTaskView.id, ejercicioId);
      this.toast('🗑️ Ejercicio removido');
      // Recargar la tarea
      await this.verTareaDocente(this.currentTaskView.id);
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
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
        // Si el docente está viendo una tarea en detalle, mostrar esa vista
        if (this.currentTaskView && this.currentModule === 'matematicas' || this.currentTaskView && this.currentModule === 'ingles') {
          html = await this.renderDetalleTarea();
        } else if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') {
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

    const tareasBase = Array.isArray(ejercicios) ? ejercicios : [];
    const tareasAsignadas = tareasBase.length > 0 ? Object.values(
      tareasBase.reduce((acc, e) => {
        const metodologia = (e.metodologia || 'Estándar / Directo').trim();
        const key = metodologia.toLowerCase();
        if (!acc[key]) {
          const estilo = metodologia.toLowerCase().includes('grafic')
            ? { titulo: esMat ? 'Tarea de graficación' : 'Tarea visual', descripcion: esMat ? 'Explora el concepto con figuras y ejemplos visuales.' : 'Observa ejemplos visuales y completa el reto.' }
            : metodologia.toLowerCase().includes('desafío') || metodologia.toLowerCase().includes('contrarreloj')
              ? { titulo: esMat ? 'Desafío rápido' : 'Reto rápido', descripcion: esMat ? 'Resuelve con ritmo y precisión.' : 'Responde con rapidez y precisión.' }
              : metodologia.toLowerCase().includes('paso')
                ? { titulo: esMat ? 'Ruta paso a paso' : 'Paso a paso', descripcion: esMat ? 'Sigue cada paso con apoyo guiado.' : 'Completa cada paso con apoyo del tutor.' }
                : { titulo: esMat ? 'Práctica guiada' : 'Práctica guiada', descripcion: esMat ? 'Refuerza el contenido con ejercicios claros.' : 'Consolida el tema con indicaciones sencillas.' };

          acc[key] = {
            id: `tarea-${key}`,
            titulo: estilo.titulo,
            descripcion: estilo.descripcion,
            estado: 'Pendiente',
            ejercicios: [],
            metodologia
          };
        }

        acc[key].ejercicios.push(e);
        return acc;
      }, {})
    ) : [{
      id: 'tarea-base',
      titulo: esMat ? 'Tarea de inicio' : 'Tarea inicial',
      descripcion: esMat ? 'Comienza con una práctica breve y clara.' : 'Inicia con una práctica breve y clara.',
      estado: 'Pendiente',
      ejercicios: [],
      metodologia: 'Estándar / Directo'
    }];

    if (this.currentTaskView) {
      const ejerciciosTask = this.currentTaskExercises || [];
      const tareas = ejerciciosTask.map(e => {
        const intentos = this.intentosPorEjercicio[e.id] || 0;
        const yaRespondido = this.completedExerciseIds?.includes(e.id);
        return `
        <div class="task-card">
          <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
          <div class="enun">${this.formatMathText(e.enunciado)}</div>
          ${yaRespondido ? `
            <div class="feedback ok">✅ Resuelto correctamente</div>
            <div class="attempts">Intentos: ${intentos}</div>
          ` : `
            <div class="answer-row">
              <input type="text" placeholder="Tu respuesta" id="resp_${e.id}">
              <button class="primary" data-check="${e.id}" data-materia="${materia}">Comprobar</button>
            </div>
            <div class="attempts">Intentos: ${intentos}</div>
          `}
          <div id="fb_${e.id}"></div>
        </div>`;
      }).join('') || '<p class="empty">No hay ejercicios en esta tarea todavía.</p>';

      return `
        <div class="card">
          <div class="module-header">
            <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '📘' : '🌈'}</div>
            <div>
              <h2>${this.currentTaskView.titulo}</h2>
              <p>${this.currentTaskView.descripcion}</p>
            </div>
          </div>
          <div class="task-nav-row">
            <button class="ghost" onclick="App.closeTaskView()">← Volver a tareas</button>
            <button class="primary" onclick="App.finishTask()">Finalizar tarea</button>
          </div>
          <div class="hint-preview">Metodología: ${this.currentTaskView.metodologia || 'Estándar / Directo'}</div>
          ${tareas}
        </div>`;
    }

    const taskCards = tareasAsignadas.map(task => {
      const completed = this.completedTaskIds.includes(task.id);
      const status = completed ? 'Completada' : task.estado;
      const buttonLabel = completed ? 'Revisar tarea' : 'Comenzar tarea';
      return `
      <div class="task-card task-module-card">
        <div class="task-module-head">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">Tutor</span>
            <h3>${task.titulo}</h3>
          </div>
          <span class="task-status">${status}</span>
        </div>
        <p>${task.descripcion}</p>
        <div class="task-meta">${task.ejercicios.length} ejercicios · ${task.metodologia}${task.ejercicios[0]?.tema ? ` · ${task.ejercicios[0].tema}` : ''}</div>
        <button class="${completed ? 'ghost' : 'primary'}" onclick="App.startTask(${JSON.stringify(task).replace(/"/g, '"')})">${buttonLabel}</button>
      </div>`;
    }).join('');

    const graficacion = esMat ? `
      <div class="card">
        <div class="module-header">
          <div class="badge mat">📐</div>
          <div>
            <h2>Graficar fracciones</h2>
            <p>Explora fracciones propias e impropias con rectángulos y círculos.</p>
          </div>
        </div>
        <div class="graph-controls">
          <select id="fractionGraphType">
            <option value="rectangulo">Rectángulos</option>
            <option value="circulo">Círculos</option>
          </select>
          <div class="graph-pills">
            <button class="ghost" data-frac-demo="2/5">2/5</button>
            <button class="ghost" data-frac-demo="21/8">21/8</button>
            <button class="ghost" data-frac-demo="16/9">16/9</button>
            <button class="ghost" data-frac-demo="10/7">10/7</button>
          </div>
        </div>
        <div id="fractionGraphicArea"></div>
      </div>` : '';

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
      ${taskCards}
      ${graficacion}
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
    const [ejercicios, tareas] = await Promise.all([
      API.getEjercicios(materia),
      API.getTareas()
    ]);

    this.allEjercicios = ejercicios; // Guardar para usar en la vista de detalle

    const tareasFiltradas = tareas.filter(t => t.materia === materia);

    // Sección de Tareas
    const tareasHtml = tareasFiltradas.map(t => `
      <div class="task-card task-module-card">
        <div class="task-module-head">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">Tarea</span>
            <h3>${t.titulo}</h3>
          </div>
          <span class="task-status" style="background:${t.activa ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">${t.activa ? 'Activa' : 'Inactiva'}</span>
        </div>
        <p>${t.descripcion || 'Sin descripción'}</p>
        <div class="task-meta">${t.ejercicios?.length || 0} ejercicios</div>
        <div class="task-actions">
          <button class="ghost" onclick="App.verTareaDocente('${t.id}')">📋 Ver/Editar</button>
          <button class="ghost" onclick="App.eliminarTarea('${t.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">No hay tareas creadas.</p>';

    // Lista de ejercicios
    const lista = ejercicios.map(e => `
      <div class="ex-item">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
            <div class="ex-enun">${this.formatMathText(e.enunciado)}</div>
            <div class="hint-preview">Metodología: ${e.metodologia || 'Estándar / Directo'}</div>
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
      <!-- SECCIÓN DE TAREAS -->
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📚</div>
          <div><h2>Mis Tareas</h2><p>Crea y gestiona tareas para tus estudiantes</p></div>
        </div>
        <button class="primary" onclick="App.mostrarFormTarea('${materia}')">➕ Nueva Tarea</button>
        <div id="formTarea" style="display:none; margin-top:14px;">
          <div class="card" style="background:var(--fondo-2);">
            <h3>Nueva Tarea</h3>
            <label>Título</label>
            <input type="text" id="tareaTitulo" placeholder="Ej: Práctica de fracciones">
            <label>Descripción</label>
            <input type="text" id="tareaDescripcion" placeholder="Ej: Ejercicios de suma de fracciones">
            <label>Materia</label>
            <input type="text" value="${esMat ? 'Matemáticas' : 'Inglés'}" disabled>
            <div style="margin-top:10px;">
              <button class="primary" onclick="App.crearTarea('${materia}')">Guardar Tarea</button>
              <button class="ghost" onclick="App.ocultarFormTarea()">Cancelar</button>
            </div>
          </div>
        </div>
        <div style="margin-top:14px;">${tareasHtml}</div>
      </div>

      <!-- SECCIÓN DE EJERCICIOS -->
      <div class="card">
        <div class="module-header">
          <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '🍊' : '🌴'}</div>
          <div><h2>${esMat ? 'Matemáticas' : 'Inglés'}</h2><p>Banco de ejercicios de este módulo</p></div>
        </div>
        <label>Modo de clase</label>
        <select id="dynamicModeSelect">
          <option value="paso">Paso a paso (Carita Sonriente)</option>
          <option value="grafico">Graficación Geométrica</option>
          <option value="desafio">Desafío Contrarreloj</option>
          <option value="gramatica">Opción Múltiple / Gramática</option>
        </select>
        <div class="hint-preview" id="dynamicModeHint">${this.getDynamicModeHint(this.currentDynamicMode)}</div>
        ${lista}
      </div>

      <!-- FORMULARIO NUEVO EJERCICIO -->
      <div class="card">
        <h2>➕ Nuevo ejercicio de ${esMat ? 'Matemáticas' : 'Inglés'}</h2>
        <div class="grid2">
          <div>
            <label>Tema</label>
            <input type="text" id="newTema" placeholder="Ej: Fracciones · Carita Sonriente">
            <label>Tipo</label>
            <select id="newTipo"><option value="fraccion">Fracción (a/b)</option><option value="texto">Texto corto</option></select>
            <label>Metodología</label>
            <select id="newMetodologia">
              <option value="Estándar / Directo">Estándar / Directo</option>
              <option value="Paso a Paso (Carita Sonriente)">Paso a Paso (Carita Sonriente)</option>
              <option value="Graficación Interactiva">Graficación Interactiva</option>
              <option value="Desafío Contrarreloj">Desafío Contrarreloj</option>
            </select>
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
        const metodologia = document.getElementById('newMetodologia').value;
        const enunciado = document.getElementById('newEnun').value.trim();
        const respuestaCorrecta = document.getElementById('newResp').value.trim();
        const pistaError = document.getElementById('newPista').value.trim() || 'Vuelve a revisar el procedimiento paso a paso.';
        if (!enunciado || !respuestaCorrecta) { this.toast('⚠️ Completa enunciado y respuesta'); return; }
        try {
          await API.crearEjercicio({ materia, tema, tipo, enunciado, respuestaCorrecta, pistaError, metodologia });
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
          this.saveProgressState();
          const fb = document.getElementById('fb_' + id);

          try {
            const resultado = await API.validarRespuesta(id, respuesta);
            fb.innerHTML = `<div class="feedback ${resultado.correcto ? 'ok' : 'bad'}">${resultado.correcto ? '🎉 ' : '🔍 '}${this.formatMathText(resultado.mensaje)}</div>`;

            if (resultado.correcto || resultado.yaCompletado) {
              this.completedExerciseIds = [...new Set([...this.completedExerciseIds, id])];
              this.completeTask(this.currentTaskView?.id);
              if (!resultado.yaCompletado) {
                this.toast('✅ Tarea completada');
              }
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

      document.querySelectorAll('[data-frac-demo]').forEach(btn => {
        btn.onclick = () => {
          const [numerador, denominador] = btn.dataset.fracDemo.split('/');
          this.currentFractionPreview = { numerador: Number(numerador), denominador: Number(denominador), tipo: this.currentFractionPreview?.tipo || 'rectangulo' };
          this.renderFractionPreview();
        };
      });

      const fractionGraphType = document.getElementById('fractionGraphType');
      if (fractionGraphType) {
        fractionGraphType.value = this.currentFractionPreview?.tipo || 'rectangulo';
        fractionGraphType.onchange = (e) => {
          this.currentFractionPreview = { ...this.currentFractionPreview, tipo: e.target.value };
          this.renderFractionPreview();
        };
      }

      const dynamicModeSelect = document.getElementById('dynamicModeSelect');
      if (dynamicModeSelect) {
        dynamicModeSelect.value = this.currentDynamicMode;
        dynamicModeSelect.onchange = (e) => {
          this.currentDynamicMode = e.target.value;
          const hint = document.getElementById('dynamicModeHint');
          if (hint) hint.textContent = this.getDynamicModeHint(this.currentDynamicMode);
        };
      }

      this.renderFractionPreview();

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