/**
 * Manejo de autenticación (login, logout, estado de sesión)
 */

import { state } from '../state.js';
import { getProgressStorageKey } from '../utils/progressUtils.js';
import { toast } from '../utils/domUtils.js';

export const AuthHandler = {
  init(onAuthStateChangedCallback) {
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

    // ✅ Verificar que Auth existe
    if (typeof window.Auth === 'undefined' || !window.Auth.init) {
      console.error('Auth no está disponible. Asegúrate de que auth.js esté cargado.');
      this.showLoginScreen('Error de autenticación. Recarga la página.');
      return false;
    }

    // ✅ Verificar que API existe
    if (typeof window.API === 'undefined') {
      console.error('API no está disponible. Asegúrate de que api.js esté cargado.');
      this.showLoginScreen('Error de conexión. Recarga la página.');
      return false;
    }

    const initialized = window.Auth.init(onAuthStateChangedCallback);
    if (!initialized) {
      this.showLoginScreen('Configura tus claves reales de Firebase en window.COSECHA_FIREBASE_CONFIG para usar Auth.');
    }
    return initialized;
  },

  async onAuthStateChanged(user) {
    state.authUser = user;
    state.authReady = true;
    this.loadProgressState();

    if (!user) {
      // ✅ Verificar que API existe antes de usarlo
      if (window.API && window.API.clearAuthToken) {
        window.API.clearAuthToken();
      }
      state.currentRole = null;
      this.showLoginScreen();
      return;
    }

    try {
      const token = await user.getIdToken();
      
      // ✅ Verificar que API existe
      if (!window.API || !window.API.setAuthToken) {
        throw new Error('API no está disponible');
      }
      
      window.API.setAuthToken(token);
      const session = await window.API.getSession();
      state.currentRole = session.rol || 'estudiante';
      // Módulo inicial según el rol: el docente entra directo a su panel de materia
      state.currentModule = state.currentRole === 'docente' ? 'matematicas' : 'inicio';
      this.updateUserPill();
      this.hideLoginScreen();
      await this.cargarPrendas();
      await this.hydrateProgress();
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      if (window.API && window.API.clearAuthToken) {
        window.API.clearAuthToken();
      }
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
      
      if (typeof window.Auth === 'undefined' || !window.Auth.login) {
        throw new Error('Auth no está disponible');
      }
      
      await window.Auth.login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      let message = 'No se pudo iniciar sesión.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Correo o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Intenta más tarde.';
      } else if (error.message) {
        message = error.message;
      }
      errorBox.textContent = message;
      alert(message);
    }
  },

  async handleLogout() {
    try {
      if (typeof window.Auth !== 'undefined' && window.Auth.logout) {
        await window.Auth.logout();
      }
      if (window.API && window.API.clearAuthToken) {
        window.API.clearAuthToken();
      }
      state.currentRole = null;
      this.showLoginScreen();
    } catch (error) {
      toast('⚠️ ' + error.message);
    }
  },

  switchRole() {
    if (!state.authUser) {
      this.showLoginScreen('Inicia sesión para usar la plataforma.');
      return;
    }

    if (state.currentRole === 'docente') {
      toast('Tu cuenta está configurada como docente.');
      return;
    }

    toast('Tu cuenta está configurada como estudiante.');
  },

  setTheme(theme) {
    state.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    document.getElementById('brandFruit').textContent = theme === 'citrico' ? '🍊' : '🍍';
    document.getElementById('themeSelect').value = theme;
    if (state.currentRole && window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  updateUserPill() {
    const userPill = document.getElementById('userPill');
    if (!userPill) return;

    if (!state.authUser) {
      userPill.innerHTML = '<span class="user-pill__label">Sin sesión</span>';
      return;
    }

    const email = state.authUser.email || 'Usuario';
    const rol = state.currentRole || 'sin rol';
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
    if (window.App && typeof window.App.renderNav === 'function') {
      window.App.renderNav();
    }
  },

  enterRole(role) {
    if (!state.authUser) {
      this.showLoginScreen('Inicia sesión para entrar a la plataforma.');
      return;
    }

    const allowedRole = state.currentRole || role;
    state.currentRole = allowedRole;
    state.currentModule = allowedRole === 'docente' ? 'matematicas' : 'inicio';

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
    if (window.App && typeof window.App.renderNav === 'function') {
      window.App.renderNav();
    }
    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  },

  async cargarPrendas() {
    if (!state.authReady || !state.authUser) {
      return;
    }

    try {
      if (window.API && window.API.getPrendas) {
        state.cachePrendas = await window.API.getPrendas();
      }
    } catch (e) {
      console.error('Error cargando prendas:', e);
    }
  },

  loadProgressState() {
    try {
      const raw = window.localStorage.getItem(getProgressStorageKey(state.authUser?.uid));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.completedTaskIds = Array.isArray(parsed.completedTaskIds) ? parsed.completedTaskIds : [];
      state.completedExerciseIds = Array.isArray(parsed.completedExerciseIds) ? parsed.completedExerciseIds : [];
      state.intentosPorEjercicio = parsed.intentosPorEjercicio && typeof parsed.intentosPorEjercicio === 'object'
        ? parsed.intentosPorEjercicio
        : {};
    } catch (e) {
      console.warn('No se pudo cargar el progreso guardado', e);
    }
  },

  async hydrateProgress() {
    if (!state.authUser) return;
    const local = {
      completedTaskIds: state.completedTaskIds || [],
      completedExerciseIds: state.completedExerciseIds || [],
      intentosPorEjercicio: state.intentosPorEjercicio || {}
    };
    try {
      if (!window.API || !window.API.getProgreso) {
        console.warn('API no disponible para sincronizar progreso');
        return;
      }
      const servidor = await window.API.getProgreso();
      const { reconciliarProgreso } = await import('../utils/progressUtils.js');
      const fusion = reconciliarProgreso(local, servidor);
      state.completedTaskIds = fusion.completedTaskIds;
      state.completedExerciseIds = fusion.completedExerciseIds;
      state.intentosPorEjercicio = fusion.intentosPorEjercicio;
      if (window.App && typeof window.App.saveProgressState === 'function') {
        window.App.saveProgressState();
      }
    } catch (e) {
      console.warn('No se pudo sincronizar el progreso con el servidor', e);
    }
  }
};