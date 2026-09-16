/**
 * ============================================================
 * SERVICIO — BUZÓN DE NOTIFICACIONES (estudiante)
 * ============================================================
 * Genera y gestiona notificaciones del estudiante:
 *   - Nueva tarea publicada por el docente de su curso.
 *   - Nueva misión disponible en el catálogo.
 *
 * Modelo (subcolección por usuario):
 *   notificaciones/{uid}/items/{id} = {
 *     tipo: 'tarea' | 'mision',
 *     titulo, mensaje,
 *     refId,        → id de la tarea / misión
 *     refModulo,    → módulo de la app donde navegar ('matematicas'|'ingles'|'misiones')
 *     leida: false,
 *     createdAt
 *   }
 * ============================================================
 */

const { db } = require('../config/firebase-admin');
const { CATALOGO_MISIONES } = require('./misiones');

const RAIZ = 'notificaciones';
const ITEMS = 'items';
const LIMITE_LISTA = 50;

/* ------------------------------------------------------------------ *
 * Creación
 * ------------------------------------------------------------------ */
/** Crea una notificación para un estudiante. */
async function crearNotificacion(uid, { tipo, titulo, mensaje, refId, refModulo }) {
  const ref = db.collection(RAIZ).doc(uid).collection(ITEMS).doc();
  await ref.set({
    tipo,
    titulo: String(titulo || ''),
    mensaje: String(mensaje || ''),
    refId: refId || null,
    refModulo: refModulo || null,
    leida: false,
    createdAt: new Date()
  });
  return { id: ref.id };
}

/**
 * Fan-out de "nueva tarea": notifica a todos los estudiantes ACTIVOS de
 * los cursos del docente. Se llama al publicar una tarea.
 * @returns {Promise<number>} cantidad de estudiantes notificados
 */
async function notificarNuevaTarea(docenteId, tarea) {
  const cursosSnap = await db.collection('cursos').where('docenteId', '==', docenteId).get();
  if (cursosSnap.empty) return 0;

  // Reunir estudiantes de todos los cursos del docente (sin duplicados)
  const uids = new Set();
  for (const cursoDoc of cursosSnap.docs) {
    const estSnap = await db.collection('usuarios')
      .where('cursoId', '==', cursoDoc.id)
      .where('rol', '==', 'estudiante')
      .get();
    estSnap.docs.forEach(d => {
      const estado = d.data().estado || 'activo';
      if (estado !== 'inactivo') uids.add(d.id);
    });
  }
  if (uids.size === 0) return 0;

  const batch = db.batch();
  uids.forEach((uid) => {
    const ref = db.collection(RAIZ).doc(uid).collection(ITEMS).doc();
    batch.set(ref, {
      tipo: 'tarea',
      titulo: `📚 Nueva tarea: ${tarea.titulo || 'sin título'}`,
      mensaje: `Tu docente publicó una nueva tarea de ${tarea.materia || 'clase'}. ¡A por ella!`,
      refId: tarea.id,
      refModulo: tarea.materia || null,
      leida: false,
      createdAt: new Date()
    });
  });
  await batch.commit();
  return uids.size;
}

/**
 * Sincroniza el catálogo de misiones con el snapshot del estudiante.
 * - Primera vez: solo guarda el snapshot actual (sin notificar).
 * - Misiones nuevas en el catálogo: crea una notificación por cada una.
 * @returns {Promise<number>} notificaciones creadas (0 si era la primera vez)
 */
async function sincronizarMisiones(uid) {
  const logroRef = db.collection('logros').doc(uid);
  const snap = await logroRef.get();
  const notificadas = snap.exists
    ? (Array.isArray(snap.data().misionesNotificadas) ? snap.data().misionesNotificadas : null)
    : null;

  const idsCatalogo = CATALOGO_MISIONES.map(m => m.id);

  // Primera vez → solo inicializar snapshot (evita spamear el catálogo completo)
  if (notificadas === null) {
    await logroRef.set({ misionesNotificadas: idsCatalogo }, { merge: true });
    return 0;
  }

  const vistas = new Set(notificadas);
  const nuevas = CATALOGO_MISIONES.filter(m => !vistas.has(m.id));
  if (nuevas.length === 0) return 0;

  const batch = db.batch();
  nuevas.forEach((mision) => {
    const ref = db.collection(RAIZ).doc(uid).collection(ITEMS).doc();
    batch.set(ref, {
      tipo: 'mision',
      titulo: `🎯 Nueva misión: ${mision.titulo}`,
      mensaje: `${mision.descripcion} Recompensa: ${mision.recompensa.xp} XP y ${mision.recompensa.naranjas} 🍊.`,
      refId: mision.id,
      refModulo: 'misiones',
      leida: false,
      createdAt: new Date()
    });
  });
  batch.set(logroRef, { misionesNotificadas: idsCatalogo }, { merge: true });
  await batch.commit();
  return nuevas.length;
}

/* ------------------------------------------------------------------ *
 * Lectura
 * ------------------------------------------------------------------ */
/** Lista las notificaciones (más recientes primero) + contador de no leídas. */
async function listarNotificaciones(uid) {
  const snap = await db.collection(RAIZ).doc(uid).collection(ITEMS)
    .orderBy('createdAt', 'desc')
    .limit(LIMITE_LISTA)
    .get();

  const notificaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const noLeidas = notificaciones.filter(n => !n.leida).length;
  return { notificaciones, noLeidas };
}

/* ------------------------------------------------------------------ *
 * Marcado de lectura
 * ------------------------------------------------------------------ */
async function marcarLeida(uid, notificacionId) {
  const ref = db.collection(RAIZ).doc(uid).collection(ITEMS).doc(notificacionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.update({ leida: true });
  return { id: notificacionId, leida: true };
}

async function marcarTodasLeidas(uid) {
  const snap = await db.collection(RAIZ).doc(uid).collection(ITEMS)
    .where('leida', '==', false)
    .get();

  if (snap.empty) return { actualizadas: 0 };

  const batch = db.batch();
  snap.docs.forEach(d => batch.update(d.ref, { leida: true }));
  await batch.commit();
  return { actualizadas: snap.docs.length };
}

module.exports = {
  RAIZ,
  ITEMS,
  LIMITE_LISTA,
  crearNotificacion,
  notificarNuevaTarea,
  sincronizarMisiones,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas
};

