/**
 * SINCRONIZACIÓN DE PROGRESO — Cosecha
 * ====================================
 * Persiste el estado de progreso del estudiante (tareas completadas,
 * ejercicios completados e intentos por ejercicio) en la base central
 * asociado a su cuenta (uid), para continuar en cualquier dispositivo.
 *
 * El campo `progresoFrontend` vive dentro del mismo documento `logros`
 * del usuario, junto con su gamificación (XP, rachas, inventario…).
 */

const { db } = require('../config/firebase-admin');

const COLECCION = 'logros';
const CAMPO = 'progreso';

const VACIO = {
  completedTaskIds: [],
  completedExerciseIds: [],
  intentosPorEjercicio: {}
};

function limpiarArray(raw) {
  return Array.isArray(raw) ? [...new Set(raw.map(String).filter(Boolean))] : [];
}

function limpiarObjeto(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

/**
 * Reconciliación no destructiva: unión de conjuntos para las "completadas"
 * y máximo por clave para los intentos. Nunca borra nada que el otro lado
 * ya tenga.
 */
function reconciliar(local, servidor) {
  const l = local || {};
  const s = servidor || {};

  const ltasks = limpiarArray(l.completedTaskIds);
  const stasks = limpiarArray(s.completedTaskIds);
  const completedTaskIds = [...new Set([...ltasks, ...stasks])];

  const lex = limpiarArray(l.completedExerciseIds);
  const sex = limpiarArray(s.completedExerciseIds);
  const completedExerciseIds = [...new Set([...lex, ...sex])];

  const li = limpiarObjeto(l.intentosPorEjercicio);
  const si = limpiarObjeto(s.intentosPorEjercicio);
  const intentosPorEjercicio = {};
  const claves = new Set([...Object.keys(li), ...Object.keys(si)]);
  claves.forEach((k) => {
    intentosPorEjercicio[k] = Math.max(Number(li[k]) || 0, Number(si[k]) || 0);
  });

  return { completedTaskIds, completedExerciseIds, intentosPorEjercicio };
}

/** Lee el progreso central del usuario (o el valor vacío si aún no existe). */
async function obtenerProgreso(uid) {
  const snap = await db.collection(COLECCION).doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const p = data && data[CAMPO];
  return {
    completedTaskIds: limpiarArray(p && p.completedTaskIds),
    completedExerciseIds: limpiarArray(p && p.completedExerciseIds),
    intentosPorEjercicio: limpiarObjeto(p && p.intentosPorEjercicio)
  };
}

/** Guarda el progreso central del usuario (merge sobre el documento existente). */
async function guardarProgreso(uid, payload) {
  const ref = db.collection(COLECCION).doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const limpio = {
    completedTaskIds: limpiarArray(payload && payload.completedTaskIds),
    completedExerciseIds: limpiarArray(payload && payload.completedExerciseIds),
    intentosPorEjercicio: limpiarObjeto(payload && payload.intentosPorEjercicio)
  };

  await ref.set({
    ...data,
    [CAMPO]: { ...limpio, actualizadoEn: new Date().toISOString() }
  });

  return limpio;
}

module.exports = { reconciliar, obtenerProgreso, guardarProgreso, CAMPO, VACIO };