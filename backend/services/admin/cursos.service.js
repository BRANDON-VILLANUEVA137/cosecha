/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — CURSOS
 * ============================================================
 * CRUD de cursos. Cada curso pertenece a UN docente (docenteId)
 * y puede tener muchos estudiantes.
 *
 * Modelo (colección `cursos`):
 * { nombre, descripcion, docenteId, estado, createdAt }
 * ============================================================
 */

const { db } = require('../../config/firebase-admin');
const docentesService = require('./docentes.service');

const COLECCION = 'cursos';

/* Validación pura */
function validarCurso(datos = {}, esCreacion = false) {
  const errores = [];
  const { nombre, docenteId } = datos;

  if (esCreacion || nombre !== undefined) {
    if (!nombre || !String(nombre).trim()) errores.push('El nombre del curso es obligatorio');
  }
  if (esCreacion || docenteId !== undefined) {
    if (!docenteId) errores.push('El docente es obligatorio');
  }

  return { ok: errores.length === 0, errores };
}

/** Mapea un documento a representación pública, resolviendo el nombre del docente. */
async function aPublico(doc) {
  const d = doc.data();
  let docenteNombre = null;
  if (d.docenteId) {
    const docente = await docentesService.obtenerDocente(d.docenteId);
    docenteNombre = docente ? docente.nombre : null;
  }
  return {
    id: doc.id,
    nombre: d.nombre || '',
    descripcion: d.descripcion || '',
    docenteId: d.docenteId || null,
    docenteNombre,
    estado: d.estado || 'activo',
    createdAt: d.createdAt || null
  };
}

async function listarCursos() {
  const snap = await db.collection(COLECCION).get();
  return Promise.all(snap.docs.map(aPublico));
}

async function obtenerCurso(id) {
  const snap = await db.collection(COLECCION).doc(id).get();
  if (!snap.exists) return null;
  return aPublico(snap);
}

/** Crea un curso validando que el docente exista. */
async function crearCurso({ nombre, descripcion, docenteId }) {
  const docente = await docentesService.obtenerDocente(docenteId);
  if (!docente) {
    const error = new Error('El docente indicado no existe');
    error.code = 'DOCENTE_NO_ENCONTRADO';
    throw error;
  }

  const ref = await db.collection(COLECCION).add({
    nombre,
    descripcion: descripcion || '',
    docenteId,
    estado: 'activo',
    createdAt: new Date()
  });

  return { id: ref.id, nombre, descripcion: descripcion || '', docenteId, docenteNombre: docente.nombre, estado: 'activo' };
}

async function actualizarCurso(id, cambios = {}) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const { nombre, descripcion, docenteId, estado } = cambios;

  // Si se reasigna el docente, validar que exista
  if (docenteId) {
    const docente = await docentesService.obtenerDocente(docenteId);
    if (!docente) {
      const error = new Error('El docente indicado no existe');
      error.code = 'DOCENTE_NO_ENCONTRADO';
      throw error;
    }
  }

  const updates = {};
  if (nombre !== undefined) updates.nombre = nombre;
  if (descripcion !== undefined) updates.descripcion = descripcion;
  if (docenteId !== undefined) updates.docenteId = docenteId;
  if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) updates.estado = estado;
  if (Object.keys(updates).length > 0) await ref.update(updates);

  return { id, ...updates };
}

/**
 * Elimina un curso. Si tiene estudiantes vinculados lanza el error
 * con código "TIENE_ESTUDIANTES" (la capa HTTP responde 409).
 */
async function eliminarCurso(id) {
  const ref = db.collection(COLECCION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const estudiantesSnap = await db.collection('usuarios').where('cursoId', '==', id).limit(1).get();
  if (!estudiantesSnap.empty) {
    const error = new Error('El curso tiene estudiantes vinculados; reasígnelos o elimínelos primero');
    error.code = 'TIENE_ESTUDIANTES';
    throw error;
  }

  await ref.delete();
  return true;
}

module.exports = {
  COLECCION,
  validarCurso,
  listarCursos,
  obtenerCurso,
  crearCurso,
  actualizarCurso,
  eliminarCurso
};
