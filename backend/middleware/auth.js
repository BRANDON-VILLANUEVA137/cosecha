const { auth, db } = require('../config/firebase-admin');

async function authMiddleware(req, res, next) {
  if (req.user) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  console.log('🔐 [Auth] Intentando acceder a ruta protegida:', req.path);
  console.log('🔑 [Auth] Header recibido:', header ? 'Presente' : 'Ausente');
  console.log('📝 [Auth] Token presente:', token ? 'Sí' : 'No');

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  try {
    console.log('🔍 [Auth] Verificando token...');
    const decoded = await auth.verifyIdToken(token);
    console.log('✅ [Auth] Token verificado para uid:', decoded.uid);
    
    const userDoc = await db.collection('usuarios').doc(decoded.uid).get();
    console.log('📄 [Auth] Documento existe:', userDoc.exists);

    if (!userDoc.exists) {
      console.log('❌ [Auth] Usuario no encontrado en Firestore');
      return res.status(401).json({ error: 'Usuario no registrado' });
    }

    const rol = userDoc.data()?.rol;
    console.log('👤 [Auth] Rol del usuario:', rol);
    
    if (!['estudiante', 'docente'].includes(rol)) {
      console.log('❌ [Auth] Rol no válido');
      return res.status(401).json({ error: 'Rol no válido' });
    }

    req.user = { uid: decoded.uid, rol };
    console.log('✅ [Auth] Acceso autorizado');
    return next();
  } catch (error) {
    console.error('❌ [Auth] Error al verificar token:', error.message);
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
