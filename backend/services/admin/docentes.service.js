/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — DOCENTES
 * ============================================================
 * Capa de servicio del CRUD de docentes.
 * Es independiente de Express: solo depende de Firestore/Auth
 * y exporta funciones puras reutilizables por cualquier capa
 * superior (rutas, scripts, otros servicios).
 *
 * Modelo de datos (colección `usuarios`, rol 'docente'):
 * { email, nombre, especialidad, estado, createdAt }
 * ============================================================
 */

const { auth, db } = require('../../config/firebase-admin');

const COLECCION = 'usuarios';
const ROL = 'docente';

/* ------------------------------------------------------------------ *
 * Validaciones (funciones puras — no tocan la base de datos)
 * ------------------------------------------------------------------ */

function validarDocente(datos = {}, esCreacion = false) {
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

/** Mapea un documento de Firestore a la representación pública del docente. */
function aPublico(doc) {
  const d = doc.data ? doc.data() : doc;
  return {
    id: doc.id,
    nombre: d.nombre || '',
    email: d.email || '',
    especialidad: d.especialidad || '',
    estado: d.estado || 'activo',
    createdAt: d.createdAt || null
  };
}

/** Lista todos los docentes activos/inactivos. */
async function listarDocentes() {
  const snap = await db.collection(COLECCION).where('rol', '==', ROL).get();
  return snap.docs.map(aPublico);
}

/** Obtiene un docente por id. Devuelve null si no existe o no es docente. */
async function obtenerDocente(id) {
  const snap = await db.collection(COLECCION).doc(id).get();
  if (!snap.exists || snap.data().rol !== ROL) return null;
  return aPublico(snap);
}

/* ------------------------------------------------------------------ *
 * Creación (Create)
 * ------------------------------------------------------------------ */

/**
 * Crea un docente (Firebase Auth + Firestore).
 * Si Firestore falla, revierte el usuario de Auth para no dejar inconsistencias.
 */
async function crearDocente({ nombre, email, password, especialidad }) {
  const userRecord = await auth.createUser({ email, password, emailVerified: true, displayName: nombre });

  try {
    await db.collection(COLECCION).doc(userRecord.uid).set({
      email,
      rol: ROL, // forzado en el servidor — nunca se toma del cliente
      nombre,
      especialidad: especialidad || '',
      estado: 'activo',
      createdAt: new Date()
    });
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw error;
  }

  return { id: userRecord.uid, nombre, email, especialidad: especialidad || '', estado: 'activo' };
}

/* ------------------------------------------------------------------ *
 * Actualización (Update)
 * ------------------------------------------------------------------ */

/** Actualiza datos del docente (y su contraseña en Auth si viene). */
async function actualizarDocente(id, cambios = {}) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  const { nombre, email, password, especialidad, estado } = cambios;
  const authUpdates = {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;
  if (Object.keys(authUpdates).length > 0) await auth.updateUser(id, authUpdates);

  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (email !== undefined) updates.email = email;
  if (especialidad !== undefined) updates.especialidad = especialidad;
  if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) updates.estado = estado;
  if (Object.keys(updates).length > 0) await ref.update(updates);

  return { id, ...updates };
}

/* ------------------------------------------------------------------ *
 * Eliminación (Delete)
 * ------------------------------------------------------------------ */

/**
 * Elimina un docente. Si tiene cursos vinculados lanza el error
 * DOCUMENTADO "TIENE_CURSOS" para que la capa HTTP responda 409.
 */
async function eliminarDocente(id) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  const cursosSnap = await db.collection('cursos').where('docenteId', '==', id).limit(1).get();
  if (!cursosSnap.empty) {
    const error = new Error('El docente tiene cursos vinculados; reasígnelos o elimínelos primero');
    error.code = 'TIENE_CURSOS';
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
  validarDocente,
  listarDocentes,
  obtenerDocente,
  crearDocente,
  actualizarDocente,
  eliminarDocente
};
