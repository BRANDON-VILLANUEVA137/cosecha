/**
 * Auth — Manejo de sesión y autenticación con Firebase.
 */
const Auth = {
  // Inicializa la configuración y el listener de autenticación
  init(onAuthStateChangedCallback) {
    const config = window.COSECHA_FIREBASE_CONFIG || window.firebaseConfig || null;
    const hasValidConfig = config && config.apiKey && config.projectId && config.appId
      && !String(config.apiKey).includes('...')
      && !String(config.projectId).includes('...')
      && !String(config.appId).includes('...')
      && !String(config.apiKey).includes('TU_')
      && !String(config.projectId).includes('TU_')
      && !String(config.appId).includes('TU_');

    if (!hasValidConfig) {
      console.error('Configura tus claves reales de Firebase en window.COSECHA_FIREBASE_CONFIG.');
      return false;
    }

    try {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }

      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(onAuthStateChangedCallback);
      }
      return true;
    } catch (error) {
      console.error('No se pudo inicializar Firebase', error);
      return false;
    }
  },

  async login(email, password) {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('Firebase no está disponible.');
    }
    const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
    return credential.user.getIdToken();
  },

  async logout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      await firebase.auth().signOut();
    }
  }
};

// ✅ Exponer Auth en window para que los módulos puedan acceder a él
window.Auth = Auth;