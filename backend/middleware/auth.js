const { auth, db } = require('../config/firebase-admin');

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
    const userDoc = await db.collection('usuarios').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Usuario no registrado' });
    }

    const rol = userDoc.data()?.rol;
    if (!['estudiante', 'docente'].includes(rol)) {
      return res.status(401).json({ error: 'Rol no válido' });
    }

    req.user = { uid: decoded.uid, rol };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(rol) {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== rol) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole };
