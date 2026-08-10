/**
 * APLICACIÓN PRINCIPAL — estado, navegación y renderizado.
 * Se comunica con el backend a través de la capa API.
 */
const App = {
  currentRole: null,
  currentModule: 'inicio',
  currentArmarioTab: 'avatar',
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
  currentDocenteTab: 'tareas', // 'tareas' | 'banco' | 'crear'
  analyticsView: 'grupo', // 'grupo' | 'estudiante'
  selectedEstudianteId: null,
  analyticsFiltros: {
    materia: '',
    fechaInicio: '',
    fechaFin: ''
  },
  analyticsFilterMateria: '',
  analyticsFilterTarea: '',
  analyticsFilterTema: '',
  tareasDisponibles: [],
  temasDisponibles: [],
  estudiantesGestion: [],
  estudianteEditando: null,
  estudianteFormVisible: false,

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

  /* ---------- Pistas predeterminadas por tema (Templates) ---------- */
  plantillasPista: [
    // Matemáticas
    { matcher: /carita/i, pista: 'No olvides aplicar el método de la carita sonriente para hallar el denominador común.' },
    { matcher: /diferente denom/i, pista: 'Encuentra el mínimo común múltiplo (mcm) de los denominadores antes de sumar.' },
    { matcher: /mismo denom/i, pista: 'Si el denominador es igual, se deja igual y solo se suman los numeradores.' },
    { matcher: /multiplic/i, pista: 'En la multiplicación no se busca denominador común: numerador por numerador, denominador por denominador.' },
    { matcher: /grafic/i, pista: 'Divide la figura en el número de partes indicado por el denominador y colorea el numerador.' },
    // Inglés
    { matcher: /to ?be/i, pista: 'Recuerda la conjugación según el sujeto: I (am), He/She/It (is), You/We/They (are).' },
    { matcher: /verbo to be/i, pista: 'Recuerda la conjugación según el sujeto: I (am), He/She/It (is), You/We/They (are).' },
    { matcher: /pronombr/i, pista: 'Identifica si el sujeto es singular o plural para elegir el pronombre correcto (he/she/it/they/we).' },
    { matcher: /traducci/i, pista: 'Traduce la oración completa al español primero para entender el contexto y elegir la palabra correcta.' }
  ],

  autocompletarPista() {
    const temaInput = document.getElementById('newTema');
    const pistaInput = document.getElementById('newPista');
    if (!temaInput || !pistaInput) return;

    const tema = temaInput.value.trim();
    if (!tema) return;

    // Solo autocompletar si el usuario no ha escrito una pista personalizada
    const esPlantilla = this.plantillasPista.some(p => pistaInput.value.trim().toLowerCase() === p.pista.toLowerCase());
    if (pistaInput.value.trim() && !esPlantilla) return;

    const match = this.plantillasPista.find(p => p.matcher.test(tema));
    if (match) {
      pistaInput.value = match.pista;
    }
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

    const initialized = Auth.init((user) => this.onAuthStateChanged(user));
    if (!initialized) {
      this.showLoginScreen('Configura tus claves reales de Firebase en window.COSECHA_FIREBASE_CONFIG para usar Auth.');
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
      await this.cargarPrendas();
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

    if (!emailInput || !passwordInput || !errorBox) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorBox.textContent = 'Ingresa correo y contraseña.';
      return;
    }

    try {
      errorBox.textContent = '';
      await Auth.login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      let message = 'No se pudo iniciar sesión.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Correo o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Intenta más tarde.';
      }
      errorBox.textContent = message;
      alert(message);
    }
  },

  async handleLogout() {
    try {
      await Auth.logout();
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

  async startTask(taskId) {
    if (!taskId) {
      this.toast('⚠️ Error: Tarea sin ID válido');
      return;
    }
    
    try {
      // Cargar la tarea completa desde el backend
      const tareaCompleta = await API.getTarea(taskId);
      this.currentTaskView = tareaCompleta;
      this.currentTaskExercises = tareaCompleta.ejercicios || [];
      this.render();
    } catch (e) {
      this.toast('⚠️ Error al cargar la tarea: ' + e.message);
    }
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

    async finishTask() {
    this.completeTask();
    const tareaId = this.currentTaskView?.id;
    if (tareaId) {
      try {
        const res = await API.completarTarea(tareaId);
        if (!res.yaCompletada) {
          const xp = res.xpGanada || 100;
          if (res.subioNivel) this.toast(`🎓 Lección completada! +${xp} XP · ⬆️ Nivel ${res.nuevoNivel}`);
          else this.toast(`🎓 Lección completada! +${xp} XP`);
        }
      } catch (e) {
        this.toast('⚠️ No se pudo registrar la lección: ' + e.message);
      }
    } else {
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
    const estaPublicada = tarea.estado === 'publicada';
    
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
        <div class="task-meta">
          ${ejerciciosEnTarea.length} ejercicios · 
          <span class="tag" style="background:${estaPublicada ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
            ${estaPublicada ? 'Publicada' : 'Borrador'}
          </span>
        </div>
        <div style="margin-top:10px;">
          <button class="primary" onclick="App.publicarTarea('${tarea.id}', '${estaPublicada ? 'borrador' : 'publicada'}')">
            ${estaPublicada ? '📝 Despublicar' : '🚀 Publicar Tarea'}
          </button>
        </div>
      </div>

      <!-- Ejercicios en la tarea -->
      <div class="card">
        <h3>📋 Ejercicios de la tarea (${ejerciciosEnTarea.length})</h3>
        <div style="margin-top:10px;">${ejerciciosHtml}</div>
      </div>

      <!-- Ejercicios disponibles para agregar -->
      <div class="card">
        <h3>➕ Agregar ejercicios desde el banco</h3>
        
        <!-- Barra de búsqueda y filtros -->
        <div style="background:var(--fondo-2); padding:12px; border-radius:8px; margin-bottom:12px;">
          <input type="text" id="searchEjercicios" placeholder="🔍 Buscar por enunciado o tema..." 
                 style="width:100%; padding:8px; border:1px solid var(--borde); border-radius:4px; margin-bottom:8px;"
                 oninput="App.filtrarEjerciciosDisponibles()">
          
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="filtroTema" onchange="App.filtrarEjerciciosDisponibles()" 
                    style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
              <option value="">Todos los temas</option>
            </select>
            
            <select id="filtroMetodologia" onchange="App.filtrarEjerciciosDisponibles()" 
                    style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
              <option value="">Todas las metodologías</option>
              <option value="estándar">Estándar / Directo</option>
              <option value="paso">Paso a Paso</option>
              <option value="graficación">Graficación</option>
              <option value="desafío">Desafío</option>
            </select>
          </div>
        </div>

        <p style="color:var(--texto-suave); font-size:13px; margin-bottom:8px;">
          Mostrando <b id="countDisponibles">${ejerciciosDisponibles.length}</b> ejercicios disponibles
        </p>
        
        <div id="listaEjerciciosDisponibles" style="margin-top:10px;">
          ${disponiblesHtml}
        </div>
      </div>
    `;
  },

  async agregarEjercicioATarea(ejercicioId) {
    if (!this.currentTaskView) return;
    
    try {
      await API.agregarEjercicioATarea(this.currentTaskView.id, ejercicioId);
      this.toast('✅ Ejercicio agregado');
      // Recargar la tarea para obtener los ejercicios actualizados
      const tareaActualizada = await API.getTarea(this.currentTaskView.id);
      this.currentTaskView = tareaActualizada;
      this.currentTaskExercises = tareaActualizada.ejercicios || [];
      this.render();
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

  async publicarTarea(id, estado) {
    try {
      await API.publicarTarea(id, estado);
      this.toast(estado === 'publicada' ? '✅ Tarea publicada' : '📝 Tarea despublicada');
      // Recargar la tarea
      await this.verTareaDocente(id);
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  filtrarEjerciciosDisponibles() {
    const searchTerm = document.getElementById('searchEjercicios')?.value.toLowerCase() || '';
    const filtroTema = document.getElementById('filtroTema')?.value || '';
    const filtroMetodologia = document.getElementById('filtroMetodologia')?.value || '';
    
    const ejerciciosEnTarea = this.currentTaskExercises || [];
    let ejerciciosFiltrados = this.allEjercicios.filter(ej => 
      !ejerciciosEnTarea.some(e => e.id === ej.id)
    );
    
    // Filtrar por búsqueda de texto
    if (searchTerm) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => 
        ej.enunciado.toLowerCase().includes(searchTerm) ||
        ej.tema.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtrar por tema
    if (filtroTema) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => ej.tema === filtroTema);
    }
    
    // Filtrar por metodología
    if (filtroMetodologia) {
      ejerciciosFiltrados = ejerciciosFiltrados.filter(ej => 
        ej.metodologia && ej.metodologia.toLowerCase().includes(filtroMetodologia)
      );
    }
    
    // Actualizar el contador
    const countElement = document.getElementById('countDisponibles');
    if (countElement) {
      countElement.textContent = ejerciciosFiltrados.length;
    }
    
    // Re-renderizar la lista
    const listaElement = document.getElementById('listaEjerciciosDisponibles');
    if (listaElement) {
      const esMat = this.currentTaskView?.materia === 'matematicas';
      
      if (ejerciciosFiltrados.length === 0) {
        listaElement.innerHTML = '<p class="empty">No se encontraron ejercicios con los filtros aplicados.</p>';
        return;
      }
      
      listaElement.innerHTML = ejerciciosFiltrados.map(ej => `
        <div class="ex-item" style="border-style:dashed;">
          <div class="top">
            <div>
              <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
              <div class="ex-enun">${this.formatMathText(ej.enunciado)}</div>
            </div>
            <button class="primary" onclick="App.agregarEjercicioATarea('${ej.id}')">➕ Agregar</button>
          </div>
        </div>
      `).join('');
    }
  },

  cambiarTabDocente(tab) {
    this.currentDocenteTab = tab;
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
      { id: 'estudiantes', ico: '👥', label: 'Estudiantes' },
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
        } else if (this.currentModule === 'estudiantes') {
          html = await this.renderGestionEstudiantes();
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

  cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  },

  /** Progresión de nivel para la barra de XP (espejo de la curva backend). */
  calcularProgreso(logro) {
    const xp = Math.max(0, Math.floor(Number(logro?.xp) || 0));
    const xpParaNivel = (k) => (k <= 1 ? 0 : Math.round(100 * k * (k - 1) / 2));
    let n = 1;
    while (xpParaNivel(n + 1) <= xp) n++;
    const nivelFinal = n;
    const xpEnNivel = xp - xpParaNivel(nivelFinal);
    const xpParaSiguiente = xpParaNivel(nivelFinal + 1);
    const ventana = xpParaSiguiente - xpParaNivel(nivelFinal);
    const progreso = ventana > 0 ? Math.round((xpEnNivel / ventana) * 100) : 0;
    return {
      nivel: nivelFinal,
      xpEnNivel,
      xpParaSiguiente,
      progreso: Math.min(100, Math.max(0, progreso)),
      xpTotal: xp
    };
  },

  /* ---------- INICIO (estudiante) ---------- */
  async renderInicio() {
    const logro = await API.getLogros();
    const rango = Personaje.rangoDeNivel(logro.nivel || 1);
    const prog = this.calcularProgreso(logro);
    const urlAvatar = Personaje.generarUrlDiceBear(logro.equipo, this.cachePrendas, { seed: this.authUser?.uid || 'cosecha', racha: logro.racha });

    return `
      <div class="card hero">
        <div class="hero-gamifica">
          <div class="profile-avatar">
            <div class="avatar-frame avatar-frame--${rango.nombre}">
              <img src="${urlAvatar}" alt="Tu personaje" class="avatar-dicebear" onerror="this.onerror=null;this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=cosecha&clothing=shirt'">
              <div class="avatar-frame__badge">${rango.icono} ${this.cap(rango.nombre)}</div>
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
    const [tareas, logro] = await Promise.all([
      API.getTareas(),
      API.getLogros()
    ]);
    const esMat = materia === 'matematicas';
    const aciertos = esMat ? logro.aciertosMatematicas : logro.aciertosIngles;

    // Filtrar tareas por materia y que estén publicadas
    const tareasFiltradas = Array.isArray(tareas) ? tareas.filter(t => t.materia === materia && t.estado === 'publicada') : [];
    
    // Obtener ejercicios de la materia para mostrarlos en las tareas
    const ejercicios = await API.getEjercicios(materia);
    const ejerciciosMap = new Map((Array.isArray(ejercicios) ? ejercicios : []).map(e => [e.id, e]));
    
    // Para cada tarea, cargar sus ejercicios completos
    const tareasAsignadas = await Promise.all(
      tareasFiltradas.map(async (tarea) => {
        const tareaConEjercicios = await API.getTarea(tarea.id);
        return {
          ...tareaConEjercicios,
          ejercicios: tareaConEjercicios.ejercicios || []
        };
      })
    );

    if (this.currentTaskView) {
      const ejerciciosTask = this.currentTaskExercises || [];
      const tareaActualId = this.currentTaskView.id || 'libre';
      const tareas = ejerciciosTask.map(e => {
        // Clave compuesta: tareaId_ejercicioId — desvincula el progreso entre tareas que comparten ejercicios
        const claveProgreso = `${tareaActualId}_${e.id}`;
        const intentos = this.intentosPorEjercicio[claveProgreso] || 0;
        const yaRespondido = this.completedExerciseIds?.includes(claveProgreso);
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
        <button class="${completed ? 'ghost' : 'primary'}" onclick="App.startTask('${task.id}')">${buttonLabel}</button>
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
        <div class="stat-row">
          <div class="stat"><b>Nv ${logro.nivel || 1}</b><span>NIVEL</span></div>
          <div class="stat"><b>${logro.xp || 0}</b><span>XP</span></div>
          <div class="stat"><b>${logro.naranjas || 0}</b><span>NARANJAS 🍊</span></div>
          <div class="stat"><b>${logro.racha?.dias || 0}</b><span>RACHA 🔥</span></div>
        </div>
      </div>
      ${taskCards}
      ${graficacion}
    `;
  },

  /* ---------- ARMARIO Y PERFIL (estudiante) ---------- */
  /* Helper: calcula progreso porcentual para la barra */
  calcularProgreso(logro) {
    const nivelActual = logro.nivel || 1;
    const xpBase = Personaje.XP_PARA_NIVEL(nivelActual);
    const xpSiguiente = Personaje.XP_PARA_NIVEL(nivelActual + 1);
    const progresoEnNivel = (logro.xp || 0) - xpBase;
    const totalNecesario = xpSiguiente - xpBase;
    
    return {
      nivel: nivelActual,
      xpEnNivel: progresoEnNivel,
      xpParaSiguiente: totalNecesario,
      progreso: totalNecesario > 0 ? (progresoEnNivel / totalNecesario) * 100 : 100,
      xpTotal: logro.xp || 0
    };
  },


  async renderArmario() {
    const logro = await API.getLogros();
    const prendas = this.cachePrendas || [];
    const nivel = logro.nivel || 1;
    const rango = Personaje.rangoDeNivel(nivel);
    const prog = this.calcularProgreso(logro);
    const urlAvatar = Personaje.generarUrlDiceBear(logro.equipo, prendas, { seed: this.authUser?.uid || 'cosecha', racha: logro.racha });
    const perfilId = (logro.equipo && logro.equipo.perfil) || 'perfil-1';
    const marcoId = logro.equipo && logro.equipo.marco;
    const marcoPrenda = marcoId ? prendas.find(p => p.id === marcoId) : null;
    const marcoRango = (marcoPrenda && marcoPrenda.rango) || rango.nombre;
    const fondoId = logro.equipo && logro.equipo.fondo;
    const fondoPrenda = fondoId ? prendas.find(p => p.id === fondoId) : null;

    const tab = Personaje.TABS_ARMARIO.find(t => t.id === this.currentArmarioTab) || Personaje.TABS_ARMARIO[0];
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
        badge = '<span class="prenda__badge own">🤍</span>';
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
                  <div class="avatar-frame__badge">${rango.icono} ${this.cap(rango.nombre)}</div>
                </div>
              </div>
              <div class="perfil-card__id">
                <h3>${logro.nombre || 'Aventurero'}</h3>
                <span class="perfil-card__role">${this.authUser?.email || 'estudiante'}</span>
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
              ${Personaje.TABS_ARMARIO.map(t => `<button class="${this.currentArmarioTab === t.id ? 'active' : ''}" data-cattab="${t.id}">${t.ico} ${t.label}</button>`).join('')}
            </div>
            <div class="prenda-grid">${grid || '<p class="empty">Este armario aún no tiene ítems.</p>'}</div>
          </div>
        </div>
      </div>
    `;
  },
  async renderAlbum() {
    const [logro, cartas] = await Promise.all([API.getLogros(), API.getCartas()]);
    const desbloqueadasIds = logro.cartas_desbloqueadas.map(c => c.carta_id);

    const grid = cartas.map(c => {
      const esDesbloqueada = desbloqueadasIds.includes(c.id);
      
      return `
        <div class="carta-item ${esDesbloqueada ? 'desbloqueada' : 'bloqueada'}">
          <div class="carta-preview">
            ${esDesbloqueada ? 
              `<img src="${c.imagen_url}" alt="${c.nombre}" style="width:100%; border-radius:8px;">` : 
              `<div class="silueta" style="width:100%; height:150px; background:#eee; display:flex; align-items:center; justify-content:center; border-radius:8px;">❓</div>`}
          </div>
          <div class="carta-info">
            <strong>${esDesbloqueada ? c.nombre : '???'}</strong>
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
        <div class="album-container" style="padding: 1rem;">
          <div class="album-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">${grid}</div>
          <button class="btn-cofre" onclick="App.abrirCofreModal()" style="margin-top: 2rem; padding: 0.5rem 1rem; cursor: pointer;">Abrir Cofre (50 🍊)</button>
        </div>
      </div>
    `;
  },

  async abrirCofreModal() {
    const result = await API.abrirCofre();

    if (!result.ok) return alert(result.error);

    const modal = document.createElement('div');
    modal.className = 'modal-revelacion active';
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000;";
    modal.innerHTML = `
      <div class="modal-content" style="background:#fff; padding:2rem; border-radius:12px; text-align:center;">
        <div class="revelacion-animacion">
          <h3>¡Nueva Carta!</h3>
          <img src="${result.carta.imagen_url}" class="carta-revelada pop" style="width:150px; margin:1rem 0;">
          <p><strong>${result.carta.nombre}</strong> (${result.carta.rareza.toUpperCase()})</p>
          <button onclick="
            this.closest('.modal-revelacion').remove(); 
            App.render();
          " style="margin-top:1rem; padding:0.5rem 1rem; cursor:pointer;">¡Genial!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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

    // Cargar los ejercicios de cada tarea para mostrar el conteo correcto
    const tareasConEjercicios = await Promise.all(
      tareasFiltradas.map(async (tarea) => {
        try {
          const tareaCompleta = await API.getTarea(tarea.id);
          return {
            ...tarea,
            ejercicios: tareaCompleta.ejercicios || [],
            estado: tareaCompleta.estado || 'borrador'
          };
        } catch (e) {
          console.error('Error cargando tarea:', tarea.id, e);
          return { ...tarea, ejercicios: [], estado: tarea.estado || 'borrador' };
        }
      })
    );

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

    // Determinar qué pestaña mostrar
    const tabActiva = this.currentDocenteTab || 'tareas';
    
    let contenidoTab = '';
    if (tabActiva === 'tareas') {
      // Sección de Tareas
      const tareasHtml = tareasConEjercicios.map(t => `
        <div class="task-card task-module-card">
          <div class="task-module-head">
            <div>
              <span class="tag ${esMat ? 'mat' : 'ing'}">Tarea</span>
              <h3>${t.titulo}</h3>
            </div>
            <span class="task-status" style="background:${t.estado === 'publicada' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">${t.estado === 'publicada' ? 'Publicada' : 'Borrador'}</span>
          </div>
          <p>${t.descripcion || 'Sin descripción'}</p>
          <div class="task-meta">${t.ejercicios?.length || 0} ejercicios</div>
          <div class="task-actions">
            <button class="ghost" onclick="App.verTareaDocente('${t.id}')">📋 Ver/Editar</button>
            <button class="ghost" onclick="App.eliminarTarea('${t.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('') || '<p class="empty">No hay tareas creadas.</p>';

      contenidoTab = `
        <div style="margin-bottom:14px;">
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
        </div>
        <div>${tareasHtml}</div>
      `;
    } else if (tabActiva === 'banco') {
      // Sección de Banco de Ejercicios
      contenidoTab = `
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
        <div style="margin-top:14px;">${lista}</div>
      `;
    } else if (tabActiva === 'crear') {
      // Formulario de crear ejercicio — CONTEXTUAL según la materia activa
      const tiposMat = `
        <option value="fraccion">Fracción (a/b)</option>
        <option value="entero">Número Entero</option>
        <option value="opcion_multiple">Opción Múltiple</option>
      `;
      const tiposIng = `
        <option value="completar">Completar Espacio (Fill in the blank)</option>
        <option value="opcion_multiple">Opción Múltiple</option>
        <option value="traduccion">Traducción</option>
      `;
      const tipos = esMat ? tiposMat : tiposIng;
      const placeholderEnun = esMat ? 'Ej: 4/9 + 1/3 = ?' : 'Ej: She ___ (be) a doctor.';
      const placeholderResp = esMat ? 'Ej: 7/9' : 'Ej: is';
      const placeholderTema = esMat ? 'Ej: Fracciones · Carita Sonriente' : 'Ej: Verbo To Be · Pronombres';

      contenidoTab = `
        <h2>➕ Nuevo ejercicio de ${esMat ? 'Matemáticas' : 'Inglés'}</h2>
        <div class="grid2">
          <div>
            <label>Tema / Categoría</label>
            <input type="text" id="newTema" placeholder="${placeholderTema}" oninput="App.autocompletarPista()">
            <label>Tipo</label>
            <select id="newTipo">${tipos}</select>
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
            <textarea id="newEnun" placeholder="${placeholderEnun}"></textarea>
            <label>Respuesta correcta (no la verá la estudiante)</label>
            <input type="text" id="newResp" placeholder="${placeholderResp}">
            <label>Pista en caso de error</label>
            <input type="text" id="newPista" placeholder="Se autocompleta según el tema...">
          </div>
        </div>
        <div style="margin-top:14px;"><button class="primary" id="addExBtn" data-materia="${materia}">Guardar ejercicio</button></div>
      `;
    }

    return `
      <!-- PESTAÑAS DE NAVEGACIÓN -->
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="${tabActiva === 'tareas' ? 'primary' : 'ghost'}" onclick="App.cambiarTabDocente('tareas')">
            📋 Mis Tareas
          </button>
          <button class="${tabActiva === 'banco' ? 'primary' : 'ghost'}" onclick="App.cambiarTabDocente('banco')">
            📦 Banco de Ejercicios
          </button>
          <button class="${tabActiva === 'crear' ? 'primary' : 'ghost'}" onclick="App.cambiarTabDocente('crear')">
            ➕ Crear Ejercicio
          </button>
        </div>
      </div>

      <!-- CONTENIDO DE LA PESTAña ACTIVA -->
      <div class="card">
        ${contenidoTab}
      </div>
    `;
  },

  /* ---------- DOCENTE: progreso ---------- */
  async renderDocenteProgreso() {
    // Selector de vista
    const viewTabs = `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button class="${this.analyticsView === 'grupo' ? 'primary' : 'ghost'}" onclick="App.cambiarAnalyticsView('grupo')">
            📊 Vista General del Grupo
          </button>
          <button class="${this.analyticsView === 'estudiante' ? 'primary' : 'ghost'}" onclick="App.cambiarAnalyticsView('estudiante')">
            👤 Por Estudiante
          </button>
        </div>
      </div>
    `;

    if (this.analyticsView === 'grupo') {
      try {
        const analyticsGrupo = await API.getAnalyticsGrupo();
        return viewTabs + await this.renderAnalyticsGrupo(analyticsGrupo);
      } catch (e) {
        console.error('Error cargando analytics del grupo:', e);
        return viewTabs + `<div class="card"><p class="empty">⚠️ Error al cargar analytics del grupo: ${e.message}</p></div>`;
      }
    } else {
      return viewTabs + await this.renderAnalyticsEstudiante();
    }
  },

  async renderAnalyticsGrupo(data) {
    if (!data) return '<p class="empty">Error al cargar datos</p>';

    // Normalizar: el backend puede devolver { estudiantes: [...] } o directamente un array
    const estudiantes = Array.isArray(data) ? data : (data.estudiantes || []);
    const estudiantesActivos = estudiantes.filter(e => e.totalIntentos > 0);
    const promedioCalculado = estudiantesActivos.length > 0
      ? Math.round(estudiantesActivos.reduce((sum, e) => sum + (e.tasaAcierto || 0), 0) / estudiantesActivos.length)
      : 0;
    const totalEstudiantes = data.totalEstudiantes ?? estudiantes.length;
    const estudiantesActivosCount = data.estudiantesActivos ?? estudiantesActivos.length;
    const promedioGrupo = data.promedioGrupo ?? promedioCalculado;
    
    // Calcular distribución de rendimiento
    const excelente = estudiantes.filter(e => (e.tasaAcierto || 0) >= 80).length;
    const bueno = estudiantes.filter(e => (e.tasaAcierto || 0) >= 60 && (e.tasaAcierto || 0) < 80).length;
    const regular = estudiantes.filter(e => (e.tasaAcierto || 0) >= 40 && (e.tasaAcierto || 0) < 60).length;
    const bajo = estudiantes.filter(e => (e.tasaAcierto || 0) < 40).length;

    return `
      <!-- KPIs del Grupo -->
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📊</div>
          <div><h2>Dashboard Analítico - Vista General</h2><p>Métricas agregadas del grupo completo</p></div>
        </div>
        
        <div class="stat-row">
          <div class="stat"><b>${totalEstudiantes}</b><span>TOTAL ESTUDIANTES</span></div>
          <div class="stat"><b>${estudiantesActivosCount}</b><span>ESTUDIANTES ACTIVOS</span></div>
          <div class="stat"><b>${promedioGrupo}%</b><span>PROMEDIO GRUPO</span></div>
        </div>

        <!-- Distribución de Rendimiento -->
        <div style="margin-top:20px;">
          <h3>Distribución de Rendimiento</h3>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-top:10px;">
            <div style="background:#4CAF50; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${excelente}</div>
              <div style="font-size:12px;">Excelente (≥80%)</div>
            </div>
            <div style="background:#8BC34A; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${bueno}</div>
              <div style="font-size:12px;">Bueno (60-79%)</div>
            </div>
            <div style="background:#FFC107; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${regular}</div>
              <div style="font-size:12px;">Regular (40-59%)</div>
            </div>
            <div style="background:#F44336; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${bajo}</div>
              <div style="font-size:12px;">Bajo (<40%)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Estudiantes -->
      <div class="card">
        <h2>Rendimiento por Estudiante</h2>
        ${estudiantes.length === 0 ? '<p class="empty">No hay estudiantes registrados</p>' : `
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Estudiante</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Intentos</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Correctos</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Tasa Acierto</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                ${estudiantes.map(e => {
                  const tasaAcierto = e.tasaAcierto || 0;
                  const totalIntentos = e.totalIntentos || 0;
                  const intentosCorrectos = e.intentosCorrectos || 0;
                  const rendimiento = tasaAcierto >= 80 ? 'Excelente' : tasaAcierto >= 60 ? 'Bueno' : tasaAcierto >= 40 ? 'Regular' : 'Bajo';
                  const colorRendimiento = tasaAcierto >= 80 ? '#4CAF50' : tasaAcierto >= 60 ? '#8BC34A' : tasaAcierto >= 40 ? '#FFC107' : '#F44336';
                  return `
                    <tr style="border-bottom:1px solid var(--borde);">
                      <td style="padding:10px;">
                        <div style="font-weight:600;">${e.nombre || e.email || 'Sin nombre'}</div>
                        ${e.ultimoAcceso ? `<div style="font-size:11px; color:var(--texto-suave);">Último acceso: ${new Date(e.ultimoAcceso).toLocaleDateString()}</div>` : ''}
                      </td>
                      <td style="padding:10px; text-align:center;">${totalIntentos}</td>
                      <td style="padding:10px; text-align:center;">${intentosCorrectos}</td>
                      <td style="padding:10px; text-align:center; font-weight:bold;">${tasaAcierto}%</td>
                      <td style="padding:10px; text-align:center;">
                        <span style="background:${colorRendimiento}; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">${rendimiento}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  async renderAnalyticsEstudiante() {
    // Cargar la lista de estudiantes para el selector
    let estudiantes = [];
    try {
      const analyticsGrupo = await API.getAnalyticsGrupo();
      // Normalizar: puede llegar como { estudiantes: [...] } o directamente un array
      estudiantes = Array.isArray(analyticsGrupo) ? analyticsGrupo : (analyticsGrupo.estudiantes || []);
    } catch (e) {
      console.error('Error cargando estudiantes:', e);
    }

    // Cargar tareas disponibles para el filtro por tarea
    try {
      this.tareasDisponibles = await API.getTareas();
      if (!Array.isArray(this.tareasDisponibles)) this.tareasDisponibles = [];
    } catch (e) {
      console.error('Error cargando tareas para filtro:', e);
      this.tareasDisponibles = [];
    }

    // Si no hay estudiante seleccionado, mostrar selector con lista cargada
    if (!this.selectedEstudianteId) {
      const estudiantesHtml = estudiantes.length > 0
        ? estudiantes.map(e => `
            <div class="ex-item" style="cursor:pointer;" onclick="App.selectedEstudianteId = '${e.estudianteId}'; App.render();">
              <div class="top">
                <div>
                  <strong>${e.nombre || e.email}</strong>
                  <div style="font-size:12px; color:var(--texto-suave);">
                    ${e.totalIntentos > 0 ? `${e.totalIntentos} intentos · ${e.tasaAcierto}% acierto` : 'Sin actividad aún'}
                  </div>
                </div>
                <button class="ghost">Ver detalle →</button>
              </div>
            </div>
          `).join('')
        : '<p class="empty">No hay estudiantes registrados</p>';

      return `
        <div class="card">
          <h2>Seleccionar Estudiante</h2>
          <p style="color:var(--texto-suave); margin-bottom:14px;">Elige un estudiante para ver su análisis detallado de desempeño.</p>
          <div id="listaEstudiantes">
            ${estudiantesHtml}
          </div>
        </div>
      `;
    }

    try {
      const analytics = await API.getAnalyticsEstudiante(this.selectedEstudianteId, this.analyticsFiltros);
      
      if (!analytics) {
        return '<p class="empty">Error al cargar analytics del estudiante</p>';
      }

      const metrics = analytics.metrics || {};
      const porMetodologia = analytics.porMetodologia || {};
      const porTema = analytics.porTema || {};
      const criticos = analytics.criticos || {};
      const historial = analytics.historial || [];
      const estudianteInfo = analytics.estudiante || {};
      const nombreEstudiante = estudianteInfo.nombre || estudiantes.find(e => e.estudianteId === this.selectedEstudianteId)?.nombre || 'Estudiante';

      // Derivar temas disponibles del historial (único por materia)
      this.temasDisponibles = [...new Set(historial.map(h => h.tema).filter(Boolean))];

      // Aplicar filtros locales (materia, tarea, tema) al historial
      let historialFiltrado = historial;
      if (this.analyticsFilterMateria) {
        historialFiltrado = historialFiltrado.filter(h => h.materia === this.analyticsFilterMateria);
      }
      if (this.analyticsFilterTarea) {
        historialFiltrado = historialFiltrado.filter(h => h.tareaId === this.analyticsFilterTarea);
      }
      if (this.analyticsFilterTema) {
        historialFiltrado = historialFiltrado.filter(h => h.tema === this.analyticsFilterTema);
      }

      // Selector desplegable de estudiante + barra de filtros
      const selectorEstudiante = `
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <label style="font-weight:600;">👤 Estudiante:</label>
          <select id="selectEstudiante" onchange="App.selectedEstudianteId = this.value; App.render();"
                  style="padding:8px; border:1px solid var(--borde); border-radius:6px; flex:1; min-width:200px; background:var(--fondo-2);">
            ${estudiantes.map(e => `
              <option value="${e.estudianteId}" ${e.estudianteId === this.selectedEstudianteId ? 'selected' : ''}>
                ${e.nombre || e.email}
              </option>
            `).join('')}
          </select>
        </div>
      `;

      // Barra de filtros (Asignatura, Tarea, Tema)
      const filtrosBar = `
        <div style="background:var(--fondo-2); padding:12px; border-radius:8px; margin-bottom:14px;">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
            <strong style="font-size:13px;">🔍 Filtrar análisis:</strong>
            <select onchange="App.analyticsFilterMateria = this.value; App.render();"
                    style="flex:1; min-width:150px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">📙 Todas las asignaturas</option>
              <option value="matematicas" ${this.analyticsFilterMateria === 'matematicas' ? 'selected' : ''}>📙 Matemáticas</option>
              <option value="ingles" ${this.analyticsFilterMateria === 'ingles' ? 'selected' : ''}>🌴 Inglés</option>
            </select>
            <select onchange="App.analyticsFilterTarea = this.value; App.render();"
                    style="flex:1; min-width:180px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">📚 Todas las tareas</option>
              ${(this.tareasDisponibles || []).map(t => `
                <option value="${t.id}" ${this.analyticsFilterTarea === t.id ? 'selected' : ''}>${t.titulo}</option>
              `).join('')}
            </select>
            <select onchange="App.analyticsFilterTema = this.value; App.render();"
                    style="flex:1; min-width:160px; padding:6px; border:1px solid var(--borde); border-radius:4px;">
              <option value="">🏷️ Todos los temas</option>
              ${this.temasDisponibles.map(tema => `
                <option value="${tema}" ${this.analyticsFilterTema === tema ? 'selected' : ''}>${tema}</option>
              `).join('')}
            </select>
          </div>
        </div>
      `;

      // Header del estudiante
      const estado = metrics.totalIntentos > 0 ? 'Activo' : 'Sin actividad';
      const headerEstudiante = `
        <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <h2 style="margin:0;">${nombreEstudiante}</h2>
              <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
                <span class="tag" style="background:${estado === 'Activo' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">${estado}</span>
                <span class="tag mat">Tasa Global de Éxito: ${metrics.tasaAcierto || 0}% (${metrics.intentosCorrectos || 0}/${metrics.totalIntentos || 0} aciertos)</span>
              </div>
            </div>
            <div class="stat-row" style="margin:0;">
              <div class="stat"><b>${metrics.totalIntentos || 0}</b><span>INTENTOS</span></div>
              <div class="stat"><b>${metrics.intentosCorrectos || 0}</b><span>CORRECTOS</span></div>
              <div class="stat"><b>${metrics.pistasTotales || 0}</b><span>PISTAS</span></div>
            </div>
          </div>
        </div>
      `;

      // --- DIAGNÓSTICO POR TEMA (agrupado con semáforo) ---
      // Agrupar el historial filtrado por tema
      const temasAgrupados = {};
      (historialFiltrado || []).forEach(h => {
        const clave = h.tema || 'General';
        if (!temasAgrupados[clave]) {
          temasAgrupados[clave] = { total: 0, correctos: 0, pistasUsadas: 0, metodologia: h.metodologia || 'Estándar / Directo', materia: h.materia };
        }
        temasAgrupados[clave].total++;
        if (h.correcto) temasAgrupados[clave].correctos++;
        temasAgrupados[clave].pistasUsadas += h.pistasUsadas || 0;
      });

      // Calcular porcentaje y determinar estado semáforo
      const temasHtml = Object.entries(temasAgrupados).length > 0 ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>📊 Diagnóstico por Tema</h3>
          <div style="display:grid; gap:10px; margin-top:10px;">
            ${Object.entries(temasAgrupados).map(([nombre, data]) => {
              const pct = data.total > 0 ? Math.round((data.correctos / data.total) * 100) : 0;
              // Semáforo: >=80 óptimo (🟩), 60-79 en proceso (🟨), <60 deficiente (🟥)
              const estado = pct >= 80 ? { color: '#4CAF50', emoji: '🟩', label: 'Dominado' }
                : pct >= 60 ? { color: '#FFC107', emoji: '🟨', label: 'En Proceso' }
                : { color: '#F44336', emoji: '🟥', label: '⚠️ Requiere Refuerzo' };
              const iconoMateria = data.materia === 'matematicas' ? '📙' : '🌴';
              const alerta = pct < 60 ? `<div style="font-size:12px; color:#F44336; margin-top:4px;">⚠️ Deficiencia detectada en: ${nombre}</div>` : '';
              return `
                <div style="background:var(--fondo-2); padding:14px; border-radius:8px; border-left:5px solid ${estado.color};">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <strong>${estado.emoji} ${iconoMateria} ${nombre}</strong>
                    <span style="background:${estado.color}; color:white; padding:4px 10px; border-radius:4px; font-size:13px; font-weight:bold;">
                      ${pct}% · ${estado.label}
                    </span>
                  </div>
                  <div style="background:var(--borde); height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:${estado.color}; height:100%; width:${pct}%; transition:width 0.3s;"></div>
                  </div>
                  <div style="font-size:12px; color:var(--texto-suave); margin-top:4px;">
                    ${data.total} ejercicios · ${data.correctos} correctos · ${data.pistasUsadas} pistas · ${data.metodologia}
                  </div>
                  ${alerta}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : '';

      // Tabla de Historial (filtrado, con columnas Asignatura y Tema/Tarea)
      const historialHtml = historialFiltrado.length > 0 ? `
        <div class="card">
          <h3>📋 Historial Completo del Estudiante (${historialFiltrado.length} registros)</h3>
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Asignatura</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Tema / Tarea</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Enunciado</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Metodología</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Respuesta</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Resultado</th>
                </tr>
              </thead>
              <tbody>
                ${historialFiltrado.map(h => {
                  const tarea = this.tareasDisponibles.find(t => t.id === h.tareaId);
                  const tareaLabel = tarea ? tarea.titulo : (h.tareaId ? 'Tarea' : 'Práctica libre');
                  const materiaLabel = h.materia === 'matematicas' ? '📙 Mate' : '🌴 Inglés';
                  return `
                  <tr style="border-bottom:1px solid var(--borde);">
                    <td style="padding:10px;"><span class="tag" style="background:${h.materia === 'matematicas' ? 'var(--primario)' : 'var(--secundario)'}; color:white;">${materiaLabel}</span></td>
                    <td style="padding:10px; font-size:12px;">${h.tema || 'General'}<br><small style="color:var(--texto-suave);">${tareaLabel}</small></td>
                    <td style="padding:10px;">${this.formatMathText(h.enunciado || 'N/A')}</td>
                    <td style="padding:10px;">${h.metodologia || 'Estándar / Directo'}</td>
                    <td style="padding:10px; text-align:center;">${this.formatMathText(h.respuesta || 'N/A')}</td>
                    <td style="padding:10px; text-align:center;">
                      <span class="tag" style="background:${h.correcto ? 'var(--secundario)' : 'var(--error-suave)'}; color:white;">
                        ${h.correcto ? '✅ Correcto' : '❌ Incorrecto'}
                      </span>
                    </td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : '<p class="empty">No hay registros que coincidan con los filtros aplicados</p>';

      // Alertas de metodologías/temas críticos
      const alertas = [];
      if (criticos.metodologia && criticos.metodologia.porcentaje < 60) {
        alertas.push(`⚠️ Requiere refuerzo en: ${criticos.metodologia.nombre} (${criticos.metodologia.porcentaje}%)`);
      }
      if (criticos.tema && criticos.tema.porcentaje < 60) {
        alertas.push(`⚠️ Tema crítico: ${criticos.tema.nombre} (${criticos.tema.porcentaje}%)`);
      }
      // Mapear porTema también para las alertas (el endpoint incluye ambos)
      if (porTema && Object.keys(porTema).length > 0) {
        const temaCritico = Object.entries(porTema).sort((a, b) => (a[1]?.porcentaje || 0) - (b[1]?.porcentaje || 0))[0];
        if (temaCritico && (temaCritico[1]?.porcentaje || 0) < 60) {
          alertas.push(`⚠️ Tema a reforzar: ${temaCritico[0]} (${temaCritico[1]?.porcentaje || 0}%)`);
        }
      }

      const alertasHtml = alertas.length > 0 ? `
        <div style="background:var(--error-suave); color:white; padding:12px; border-radius:8px; margin-bottom:14px;">
          <strong>Alertas Pedagógicas:</strong>
          <ul style="margin:8px 0 0 0; padding-left:20px;">
            ${alertas.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      return `
        ${selectorEstudiante}
        ${filtrosBar}
        ${headerEstudiante}
        ${alertasHtml}
        ${temasHtml}
        ${historialHtml}
      `;
    } catch (e) {
      return `<p class="empty">⚠️ Error: ${e.message}</p>`;
    }
  },

  cambiarAnalyticsView(view) {
    this.analyticsView = view;
    this.selectedEstudianteId = null;
    // Reiniciar filtros locales
    this.analyticsFilterMateria = '';
    this.analyticsFilterTarea = '';
    this.analyticsFilterTema = '';
    this.render();
  },

  /* ---------- DOCENTE: gestión de estudiantes ---------- */
  async renderGestionEstudiantes() {
    try {
      // Cargar estudiantes y tareas para contar asignaciones
      this.estudiantesGestion = await API.getEstudiantes();
      if (!Array.isArray(this.estudiantesGestion)) this.estudiantesGestion = [];
      const tareas = await API.getTareas();

      const filas = this.estudiantesGestion.length > 0
        ? this.estudiantesGestion.map(e => {
            const estadoActivo = e.estado !== 'inactivo';
            const tareasAsignadas = (Array.isArray(tareas) ? tareas : []).filter(t => t.estudianteId === e.id).length;
            return `
              <tr style="border-bottom:1px solid var(--borde);">
                <td style="padding:10px; font-weight:600;">${e.nombre || 'Sin nombre'}</td>
                <td style="padding:10px;">${e.email || ''}</td>
                <td style="padding:10px; text-align:center;">
                  <span class="tag" style="background:${estadoActivo ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
                    ${estadoActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style="padding:10px; text-align:center;">${tareasAsignadas}</td>
                <td style="padding:10px; text-align:center; white-space:nowrap;">
                  <button class="ghost" onclick="App.editarEstudianteForm('${e.id}')">✏️ Editar</button>
                  <button class="ghost" onclick="App.eliminarEstudianteGestion('${e.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="5" style="padding:20px; text-align:center;">No hay estudiantes registrados</td></tr>';

      // Estado del formulario
      const editando = this.estudianteEditando;
      const formVisible = this.estudianteFormVisible || !!editando;
      const formHtml = formVisible ? `
        <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
          <h3>${editando ? '✏️ Editar Estudiante' : '➕ Registrar Nuevo Estudiante'}</h3>
          <div class="grid2">
            <div>
              <label>Nombre completo</label>
              <input type="text" id="estNombre" value="${editando ? (editando.nombre || '') : ''}" placeholder="Ej: Michelle Torres">
              <label>Correo electrónico</label>
              <input type="email" id="estEmail" value="${editando ? (editando.email || '') : ''}" placeholder="Ej: michelle@cosecha.edu">
              <label>Grado / Grupo (opcional)</label>
              <input type="text" id="estGrado" value="${editando ? (editando.grado || '') : ''}" placeholder="Ej: 5° Primaria">
            </div>
            <div>
              <label>Contraseña ${editando ? '(dejar vacío para no cambiar)' : 'inicial'}</label>
              <input type="password" id="estPassword" placeholder="${editando ? '••••••••' : 'Mínimo 6 caracteres'}">
            </div>
          </div>
          <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="primary" onclick="App.guardarEstudiante()">${editando ? '💾 Guardar Cambios' : '✅ Registrar Estudiante'}</button>
            <button class="ghost" onclick="App.cancelarEdicionEstudiante()">Cancelar</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="card" style="margin-bottom:14px;">
          <div class="module-header">
            <div class="badge" style="background:var(--acento);">👥</div>
            <div>
              <h2>Gestión de Estudiantes</h2>
              <p>Registra, edita y administra las cuentas de tus estudiantes.</p>
            </div>
          </div>
          <button class="primary" onclick="App.mostrarFormEstudiante()">➕ Registrar Estudiante</button>
        </div>
        ${formHtml}
        <div class="card">
          <h3>👩‍🎓 Lista de Estudiantes (${this.estudiantesGestion.length})</h3>
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Nombre</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Correo</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Estado</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Tareas</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Acciones</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      console.error('Error cargando gestión de estudiantes:', e);
      return `<p class="empty">⚠️ Error al cargar estudiantes: ${e.message}</p>`;
    }
  },

  mostrarFormEstudiante() {
    this.estudianteEditando = null;
    this.estudianteFormVisible = true;
    this.render();
  },

  cancelarEdicionEstudiante() {
    this.estudianteEditando = null;
    this.estudianteFormVisible = false;
    this.render();
  },

  async editarEstudianteForm(id) {
    const estudiante = this.estudiantesGestion.find(e => e.id === id);
    if (!estudiante) return;
    this.estudianteEditando = estudiante;
    this.estudianteFormVisible = true;
    this.render();
  },

  async guardarEstudiante() {
    const nombre = document.getElementById('estNombre').value.trim();
    const email = document.getElementById('estEmail').value.trim();
    const password = document.getElementById('estPassword').value;
    const grado = document.getElementById('estGrado')?.value.trim() || '';

    if (!nombre || !email) {
      this.toast('⚠️ Nombre y correo son obligatorios');
      return;
    }
    if (!this.estudianteEditando && password.length < 6) {
      this.toast('⚠️ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      if (this.estudianteEditando) {
        // Editar
        const data = { nombre, email, grado };
        if (password) data.password = password;
        await API.editarEstudiante(this.estudianteEditando.id, data);
        this.toast('✅ Estudiante actualizado');
      } else {
        // Crear
        await API.crearEstudiante({ nombre, email, password, grado });
        this.toast('✅ Estudiante registrado');
      }
      this.estudianteEditando = null;
      this.estudianteFormVisible = false;
      this.render();
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
  },

  async eliminarEstudianteGestion(id) {
    const estudiante = this.estudiantesGestion.find(e => e.id === id);
    const nombre = estudiante ? (estudiante.nombre || estudiante.email) : 'este estudiante';
    const confirmar = window.confirm(`¿Seguro que quieres dar de baja a ${nombre}? Se desactivará la cuenta pero se preservará su historial.`);
    if (!confirmar) return;

    try {
      await API.eliminarEstudiante(id);
      this.toast('🗑️ Estudiante dado de baja');
      this.render();
    } catch (e) {
      this.toast('⚠️ ' + e.message);
    }
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

          // Deshabilitar botón mientras valida (evita doble envío)
          btn.disabled = true;
          btn.textContent = 'Validando…';

          // Clave compuesta: tareaId_ejercicioId para desvincular progreso entre tareas
          const claveProgreso = `${this.currentTaskView?.id || 'libre'}_${id}`;
          this.intentosPorEjercicio[claveProgreso] = (this.intentosPorEjercicio[claveProgreso] || 0) + 1;
          this.saveProgressState();
          const fb = document.getElementById('fb_' + id);
          const card = btn.closest('.task-card');

          try {
            const resultado = await API.validarRespuesta(id, respuesta, this.currentTaskView?.id || null);

            // Actualizar SOLO esta tarjeta (manipulación local del DOM, sin re-render global)
            if (card) {
              // Actualizar contador de intentos en el footer de la tarjeta
              const attemptsEl = card.querySelector('.attempts');
              if (attemptsEl) attemptsEl.textContent = `Intentos: ${this.intentosPorEjercicio[claveProgreso]}`;
            }

            // Mostrar feedback en la tarjeta
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
                this.toast(`🎉 ${resultado.correcto ? '¡Correcto!' : '¡Completado!'} ${ganados.join(' · ')}`);
                if (resultado.subioNivel) {
                  this.toast(`⬆️ ¡Subiste al nivel ${resultado.nuevoNivel}! ${resultado.rango?.icono || ''} ${this.cap(resultado.rango?.nombre || '')}`);
                }
                (resultado.nuevasPrendas || []).forEach(p => {
                  this.toast(`🛍️ ${p.nombre} disponible en la tienda`);
                });
              }
              await this.cargarPrendas();

              // Ocultar input y botón "Comprobar" solo si fue correcto
              if (card) {
                const answerRow = card.querySelector('.answer-row');
                if (answerRow) answerRow.style.display = 'none';
                // Asegurar badge verde de éxito
                fb.innerHTML = `<div class="feedback ok">✅ Resuelto correctamente</div>`;
              }
            } else {
              // Premio a la perseverancia: el estudiante leyó la explicación
              if (resultado.xpGanada) this.toast(`💪 +${resultado.xpGanada} XP por tu esfuerzo`);
              // Si fue incorrecto, re-habilitar botón para reintentar
              btn.disabled = false;
              btn.textContent = 'Comprobar';
            }
          } catch (e) {
            fb.innerHTML = `<div class="feedback bad">⚠️ ${e.message}</div>`;
            // Re-habilitar botón si falló la petición
            btn.disabled = false;
            btn.textContent = 'Comprobar';
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

      document.querySelectorAll('[data-compra]').forEach(el => {
        el.onclick = async () => {
          const id = el.dataset.compra;
          try {
            const res = await API.comprarItem(id);
            this.toast('🛒 ' + res.mensaje);
            await this.cargarPrendas();
            this.render();
          } catch (e) { this.toast('⚠️ ' + e.message); }
        };
      });
    }
  }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());