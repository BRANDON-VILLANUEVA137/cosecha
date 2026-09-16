/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — ESTUDIANTES
 * ============================================================
 * CRUD de estudiantes. Cada estudiante pertenece a UN curso
 * (cursoId) y se apoya en el módulo de cursos para validar
 * sus relaciones.
 *
 * Modelo (colección `usuarios`, rol 'estudiante'):
 * { email, nombre, grado, cursoId, estado, createdAt }
 * ============================================================
 */

const { auth, db } = require('../../config/firebase-admin');
const gamificacion = require('../gamificacion');
const { getPersonaje } = require('../personajes');
const cursosService = require('./cursos.service');

const COLECCION = 'usuarios';
const ROL = 'estudiante';

/* ------------------------------------------------------------------ *
 * Validación (función pura)
 * ------------------------------------------------------------------ */
function validarEstudiante(datos = {}, esCreacion = false) {
  const errores = [];
  const { nombre, email, password, cursoId } = datos;

  if (esCreacion) {
    if (!nombre || !String(nombre).trim()) errores.push('El nombre es obligatorio');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('El correo no es válido');
    if (!password || String(password).length < 6) errores.push('La contraseña debe tener al menos 6 caracteres');
    if (!cursoId) errores.push('El curso es obligatorio');
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
    grado: d.grado || '',
    cursoId: d.cursoId || null,
    estado: d.estado || 'activo',
    createdAt: d.createdAt || null
  };
}

/** Lista estudiantes; opcionalmente filtra por curso. */
async function listarEstudiantes(cursoId = null) {
  let query = db.collection(COLECCION).where('rol', '==', ROL);
  if (cursoId) query = query.where('cursoId', '==', cursoId);
  const snap = await query.get();
  return snap.docs.map(aPublico);
}

async function obtenerEstudiante(id) {
  const snap = await db.collection(COLECCION).doc(id).get();
  if (!snap.exists || snap.data().rol !== ROL) return null;
  return aPublico(snap);
}

/* ------------------------------------------------------------------ *
 * Creación (Create)
 * ------------------------------------------------------------------ */
/**
 * Crea un estudiante validando que el curso exista.
 * Si Firestore falla, revierte el usuario de Auth.
 */
async function crearEstudiante({ nombre, email, password, grado, cursoId, avatarId }) {
  // Validar relación: el curso debe existir
  const curso = await cursosService.obtenerCurso(cursoId);
  if (!curso) {
    const error = new Error('El curso indicado no existe');
    error.code = 'CURSO_NO_ENCONTRADO';
    throw error;
  }

  const personaje = getPersonaje(avatarId);
  if (avatarId && !personaje) {
    const error = new Error('El personaje elegido no existe');
    error.code = 'PERSONAJE_INVALIDO';
    throw error;
  }

  // Crear usuario en Firebase Auth (valida correo único automáticamente)
  const userRecord = await auth.createUser({ email, password, emailVerified: true });

  try {
    await db.collection(COLECCION).doc(userRecord.uid).set({
      email,
      rol: ROL, // forzado en el servidor — nunca del cliente
      nombre,
      grado: grado || '',
      cursoId,
      estado: 'activo',
      createdAt: new Date()
    });

    // Logro/gamificación inicial (mismo contrato que /routes/estudiantes)
    const nuevoLogro = gamificacion.defaultsLogro(userRecord.uid, nombre);
    nuevoLogro.email = email;
    if (personaje) nuevoLogro.personaje = personaje;
    await db.collection('logros').doc(userRecord.uid).set(nuevoLogro);
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    throw error;
  }

  return { id: userRecord.uid, nombre, email, grado: grado || '', cursoId, estado: 'activo' };
}

/* ------------------------------------------------------------------ *
 * Actualización (Update)
 * ------------------------------------------------------------------ */
async function actualizarEstudiante(id, cambios = {}) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  const { nombre, email, password, grado, cursoId, estado, avatarId } = cambios;

  // Validar relación si se reasigna el curso
  if (cursoId) {
    const curso = await cursosService.obtenerCurso(cursoId);
    if (!curso) {
      const error = new Error('El curso indicado no existe');
      error.code = 'CURSO_NO_ENCONTRADO';
      throw error;
    }
  }

  const personaje = avatarId ? getPersonaje(avatarId) : undefined;
  if (avatarId && !personaje) {
    const error = new Error('El personaje elegido no existe');
    error.code = 'PERSONAJE_INVALIDO';
    throw error;
  }

  // Auth (correo/contraseña)
  const authUpdates = {};
  if (email) authUpdates.email = email;
  if (password) authUpdates.password = password;
  if (Object.keys(authUpdates).length > 0) await auth.updateUser(id, authUpdates);

  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (email !== undefined) updates.email = email;
  if (grado !== undefined) updates.grado = grado;
  if (cursoId !== undefined) updates.cursoId = cursoId;
  if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) updates.estado = estado;
  if (Object.keys(updates).length > 0) await ref.update(updates);

  // Sincronizar logro (nombre/email/personaje)
  const logroRef = db.collection('logros').doc(id);
  const logroSnap = await logroRef.get();
  if (logroSnap.exists) {
    const logroUpdates = {};
    if (nombre !== undefined) logroUpdates.nombre = nombre;
    if (email !== undefined) logroUpdates.email = email;
    if (personaje) logroUpdates.personaje = personaje;
    if (Object.keys(logroUpdates).length > 0) await logroRef.update(logroUpdates);
  }

  return { id, ...updates };
}

/* ------------------------------------------------------------------ *
 * Eliminación (Delete)
 * ------------------------------------------------------------------ */
/**
 * hardDelete=true → borra Auth + Firestore + logros.
 * Si no, desactiva (preserva historial).
 */
async function eliminarEstudiante(id, hardDelete = false) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().rol !== ROL) return null;

  if (hardDelete) {
    await db.collection('logros').doc(id).delete().catch(() => {});
    await ref.delete();
    await auth.deleteUser(id).catch((e) => {
      if (e.code !== 'auth/user-not-found') throw e;
    });
    return { eliminado: true };
  }

  await ref.update({ estado: 'inactivo' });
  return { estado: 'inactivo' };
}

module.exports = {
  COLECCION,
  ROL,
  validarEstudiante,
  listarEstudiantes,
  obtenerEstudiante,
  crearEstudiante,
  actualizarEstudiante,
  eliminarEstudiante
};

