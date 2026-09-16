/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — ADMINISTRADORES
 * ============================================================
 * CRUD de cuentas administrador (solo accesible a rol 'admin').
 * Espeja el módulo de docentes con guardas de seguridad extra:
 *   - Un administrador NO puede eliminarse a sí mismo.
 *   - Un administrador NO puede desactivarse a sí mismo.
 *
 * Modelo (colección `usuarios`, rol 'admin'):
 * { email, nombre, estado, createdAt }
 * ============================================================
 */

const { auth, db } = require('../../config/firebase-admin');

const COLECCION = 'usuarios';
const ROL = 'admin';

/* ------------------------------------------------------------------ *
 * Validaciones (función pura)
 * ------------------------------------------------------------------ */
function validarAdministrador(datos = {}, esCreacion = false) {
  const errores = [];
  const { nombre, email, password } = datos;

  if (esCreacion) {
    if (!nombre || !String(nombre).trim()) errores.push('El nombre es obligatorio');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('El correo no es válido');
    if (!password || String(password).length < 6) errores.push('La contraseña debe tener al menos 6 caracteres');
  } else {
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('El correo no es válido');
    if (password !== undefined && String(password).length < 6) errores.push('La contraseña debe tener al menos 6 caracteres');
  }

  return { ok: errores.length === 0, errores };
}

/* ------------------------------------------------------------------ *
 * Lectura (Read)
 * ------------------------------------------------------------------ */
function aPublico(doc) {
  const d = doc.data ? doc.data() : doc;
  return {
    id: doc.id,
    nombre: d.nombre || '',
    email: d.email || '',
    estado: d.estado || 'activo',
    createdAt: d.createdAt || null
  };
}

async function listarAdministradores() {
  const snap = await db.collection(COLECCION).where('rol', '==', ROL).get();
  return snap.docs.map(aPublico);
}

async function obtenerAdministrador(id) {
  const snap = await db.collection(COLECCION).doc(id).get();
  if (!snap.exists || snap.data().rol !== ROL) return null;
  return aPublico(snap);
}

/* ------------------------------------------------------------------ *
 * Creación (Create)
 * ------------------------------------------------------------------ */
async function crearAdministrador({ nombre, email, password }) {
  const userRecord = await auth.createUser({ email, password, emailVerified: true, displayName: nombre });

  try {
    await db.collection(COLECCION).doc(userRecord.uid).set({
      email,
      rol: ROL, // forzado en el servidor
      nombre,
      estado: 'activo',
      createdAt: new Date()
    });
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw error;
  }

  return { id: userRecord.uid, nombre, email, estado: 'activo' };
}

/* ------------------------------------------------------------------ *
 * Actualización (Update)
 * ------------------------------------------------------------------ */
/**
 * Actualiza un administrador. Guarda: un admin no puede
 * desactivarse a sí mismo (error NO_PUEDE_DESACTIVARSE).
 */
async function actualizarAdministrador(id, cambios = {}, uidSolicitante = null) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  const { nombre, email, password, estado } = cambios;

  if (estado === 'inactivo' && uidSolicitante === id) {
    const error = new Error('No puedes desactivar tu propia cuenta de administrador');
    error.code = 'NO_PUEDE_DESACTIVARSE';
    throw error;
  }

  const authUpdates = {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;
  if (Object.keys(authUpdates).length > 0) await auth.updateUser(id, authUpdates);

  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (email !== undefined) updates.email = email;
  if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) updates.estado = estado;
  if (Object.keys(updates).length > 0) await ref.update(updates);

  return { id, ...updates };
}

/* ------------------------------------------------------------------ *
 * Eliminación (Delete)
 * ------------------------------------------------------------------ */
/**
 * Elimina un administrador. Guarda: nadie puede eliminar su propia
 * cuenta (error NO_PUEDE_ELIMINARSE).
 */
async function eliminarAdministrador(id, uidSolicitante = null) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  if (uidSolicitante === id) {
    const error = new Error('No puedes eliminar tu propia cuenta de administrador');
    error.code = 'NO_PUEDE_ELIMINARSE';
    throw error;
  }

  await ref.delete();
  await auth.deleteUser(id).catch((e) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
  return true;
}


module.exports = {
  COLECCION,
  ROL,
  validarAdministrador,
  listarAdministradores,
  obtenerAdministrador,
  crearAdministrador,
  actualizarAdministrador,
  eliminarAdministrador
};
