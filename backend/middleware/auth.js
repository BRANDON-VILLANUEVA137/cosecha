const { auth, db } = require('../config/firebase-admin');

// Caché en memoria del rol por usuario: evita leer Firestore en CADA petición.
// Un cambio de rol tarda como máximo ROL_TTL_MS en notarse.
const ROL_TTL_MS = 60 * 1000;
const rolesEnCache = new Map();

async function obtenerRol(uid) {
  const hit = rolesEnCache.get(uid);
  if (hit && hit.exp > Date.now()) return hit.rol;

  const userDoc = await db.collection('usuarios').doc(uid).get();
  if (!userDoc.exists) return null;
  const rol = userDoc.data()?.rol || null;
  rolesEnCache.set(uid, { rol, exp: Date.now() + ROL_TTL_MS });
  return rol;
}

async function authMiddleware(req, res, next) {
  if (req.user) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const rol = await obtenerRol(decoded.uid);

    if (!rol) {
      return res.status(401).json({ error: 'Usuario no registrado' });
    }
    if (!['estudiante', 'docente', 'admin'].includes(rol)) {
      return res.status(401).json({ error: 'Rol no válido' });
    }

    req.user = { uid: decoded.uid, rol };
    return next();
  } catch (error) {
    console.error('❌ [Auth] Error al verificar token:', error.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware de autorización por rol.
 * Acepta un rol o una lista de roles permitidos.
 * Ejemplos: requireRole('admin'), requireRole('docente', 'admin')
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole };
