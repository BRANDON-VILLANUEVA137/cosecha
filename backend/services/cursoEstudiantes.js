/**
 * SERVICIO — RELACIÓN ESTUDIANTE ↔ CURSO ↔ DOCENTE
 * ============================================================
 * Resuelve la relación docente → curso → estudiante usada por
 * otras rutas (p. ej. el filtrado de tareas por curso).
 *
 * Modelo:
 *   usuarios/{estudianteId}.cursoId  →  cursos/{cursoId}.docenteId
 * ============================================================
 */

const { db } = require('../config/firebase-admin');

/**
 * Devuelve el docenteId del curso al que pertenece el estudiante.
 * @param {string} estudianteId
 * @returns {Promise<string|null>} docenteId, o null si el estudiante
 *   no existe, no tiene curso, o el curso no tiene docente.
 */
async function obtenerDocenteDeEstudiante(estudianteId) {
  const usuarioSnap = await db.collection('usuarios').doc(estudianteId).get();
  if (!usuarioSnap.exists) return null;

  const cursoId = usuarioSnap.data().cursoId;
  if (!cursoId) return null;

  const cursoSnap = await db.collection('cursos').doc(cursoId).get();
  if (!cursoSnap.exists) return null;

  return cursoSnap.data().docenteId || null;
}

module.exports = { obtenerDocenteDeEstudiante };
