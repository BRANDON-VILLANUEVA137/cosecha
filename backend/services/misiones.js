/**
 * MOTOR DE MISIONES — Cosecha 2.5
 * ================================
 * Sistema de misiones con recompensas en XP y Naranjas 🍊.
 *
 * El catálogo es declarativo (aquí mismo) y el PROGRESO se calcula EN VIVO
 * desde el documento `logros/{uid}` del estudiante (historial, tareas
 * completadas y racha) — no se guardan contadores extra, así las misiones
 * cuentan lo que el estudiante ya ha hecho (retroactivo) y no hay riesgo
 * de doble cobro: se persiste solo el flag `misionesReclamadas[]`.
 */

const { db } = require('../config/firebase-admin');
const { getLogro } = require('./gamificacion');

/**
 * Catálogo de misiones. Cada una define:
 *  - tipoMetrica: 'aciertos_materia' | 'aciertos_total' | 'tareas' | 'racha' | 'mixta'
 *  - objetivo: cantidad a alcanzar
 *  - recompensa: { xp, naranjas }
 *  - temaOpcional: si viene, filtra por tema dentro del historial
 */
const CATALOGO_MISIONES = [
  {
    id: 'aprendiz-fracciones',
    titulo: 'Aprendiz de Fracciones',
    descripcion: 'Resuelve correctamente 5 ejercicios de fracciones o decimales.',
    icono: '🍊',
    tipoMetrica: 'aciertos_materia',
    materia: 'matematicas',
    temaOpcional: /fraccion|frac|decimal|simplific/i,
    objetivo: 5,
    recompensa: { xp: 70, naranjas: 4 }
  },
  {
    id: 'huerta-matematica',
    titulo: 'Huerta Matemática',
    descripcion: 'Consigue 10 aciertos en Matemáticas (cualquier tema).',
    icono: '🧮',
    tipoMetrica: 'aciertos_materia',
    materia: 'matematicas',
    objetivo: 10,
    recompensa: { xp: 60, naranjas: 3 }
  },
  {
    id: 'english-grove',
    titulo: 'English Grove',
    descripcion: 'Consigue 10 aciertos en Inglés (cualquier tema).',
    icono: '🌴',
    tipoMetrica: 'aciertos_materia',
    materia: 'ingles',
    objetivo: 10,
    recompensa: { xp: 60, naranjas: 3 }
  },
  {
    id: 'contando-negativos',
    titulo: 'Contando Negativos',
    descripcion: 'Resuelve correctamente 5 ejercicios de números negativos.',
    icono: '🌡️',
    tipoMetrica: 'aciertos_materia',
    materia: 'matematicas',
    temaOpcional: /negativ/i,
    objetivo: 5,
    recompensa: { xp: 70, naranjas: 4 }
  },
  {
    id: 'cosecha-bilingue',
    titulo: 'Cosecha Bilingüe',
    descripcion: 'Logra 5 aciertos en Matemáticas Y 5 en Inglés.',
    icono: '🌎',
    tipoMetrica: 'mixta',
    metas: { matematicas: 5, ingles: 5 },
    objetivo: 10,
    recompensa: { xp: 150, naranjas: 8 }
  },
  {
    id: 'tutora-cumplida',
    titulo: 'Tutora Cumplida',
    descripcion: 'Completa 3 tareas (incluidas las auto-generadas).',
    icono: '🎓',
    tipoMetrica: 'tareas',
    objetivo: 3,
    recompensa: { xp: 120, naranjas: 8 }
  },
  {
    id: 'cosechador-constante',
    titulo: 'Cosechador Constante',
    descripcion: 'Acumula 15 aciertos en total (cualquier materia).',
    icono: '🏆',
    tipoMetrica: 'aciertos_total',
    objetivo: 15,
    recompensa: { xp: 100, naranjas: 5 }
  },
  {
    id: 'racha-cosechera',
    titulo: 'Racha Cosechera',
    descripcion: 'Mantén una racha activa de 5 días.',
    icono: '🔥',
    tipoMetrica: 'racha',
    objetivo: 5,
    recompensa: { xp: 200, naranjas: 12 }
  }
];

/* ------------------------------------------------------------------ *
 * CÁLCULO DE PROGRESO EN VIVO (desde el documento logros)
 * ------------------------------------------------------------------ */

/** Conjunto de claves únicas ya completadas (tareaId_ejercicioId). */
function clavesCompletadas(logro) {
  const set = new Set();
  (logro.ejerciciosCompletados || []).forEach((k) => set.add(String(k)));
  return set;
}

/** Progreso de una misión individual. Devuelve { progreso, objetivo }. */
function progresoDeMision(logro, mision) {
  switch (mision.tipoMetrica) {
    case 'aciertos_materia': {
      const set = clavesCompletadas(logro);
      let cuenta = 0;
      (logro.historial || []).forEach((h) => {
        if (!h || h.correcto !== true) return;
        if (h.materia !== mision.materia) return;
        if (mision.temaOpcional && !mision.temaOpcional.test(String(h.tema || ''))) return;
        const clave = `${h.tareaId || 'libre'}_${h.ejercicioId}`;
        // Solo cuenta si está en ejerciciosCompletados (evita doble conteo)
        if (set.has(clave)) cuenta += 1;
      });
      return { progreso: cuenta, objetivo: mision.objetivo };
    }
    case 'aciertos_total': {
      const set = clavesCompletadas(logro);
      let cuenta = 0;
      (logro.historial || []).forEach((h) => {
        if (!h || h.correcto !== true) return;
        const clave = `${h.tareaId || 'libre'}_${h.ejercicioId}`;
        if (set.has(clave)) cuenta += 1;
      });
      return { progreso: cuenta, objetivo: mision.objetivo };
    }
    case 'tareas': {
      const completadas = Array.isArray(logro.tareasCompletadas) ? logro.tareasCompletadas : [];
      return { progreso: completadas.length, objetivo: mision.objetivo };
    }
    case 'racha': {
      const dias = (logro.racha && logro.racha.dias) || 0;
      return { progreso: dias, objetivo: mision.objetivo };
    }
    case 'mixta': {
      const set = clavesCompletadas(logro);
      const porMateria = { matematicas: 0, ingles: 0 };
      (logro.historial || []).forEach((h) => {
        if (!h || h.correcto !== true) return;
        if (!(h.materia in porMateria)) return;
        const clave = `${h.tareaId || 'libre'}_${h.ejercicioId}`;
        if (set.has(clave)) porMateria[h.materia] += 1;
      });
      const metas = mision.metas || { matematicas: 5, ingles: 5 };
      let progreso = 0;
      for (const m of Object.keys(metas)) {
        progreso += Math.min(porMateria[m] || 0, metas[m]);
      }
      return { progreso, objetivo: mision.objetivo };
    }
    default:
      return { progreso: 0, objetivo: mision.objetivo };
  }
}

/** Estado completo de todas las misiones para un estudiante. */
async function obtenerEstadoMisiones(uid) {
  const logro = await getLogro(uid);
  const reclamadas = new Set(Array.isArray(logro.misionesReclamadas) ? logro.misionesReclamadas : []);

  return CATALOGO_MISIONES.map((mision) => {
    const { progreso, objetivo } = progresoDeMision(logro, mision);
    const completada = progreso >= objetivo;
    const reclamada = reclamadas.has(mision.id);
    return {
      ...mision,
      progreso,
      completada,
      reclamada,
      recompensa: { ...mision.recompensa }
    };
  });
}

/**
 * Marca una misión como reclamada (si cumple el objetivo y no fue reclamada).
 * @returns {Promise<object>} { ok, mensaje, xp, naranjas, yaReclamada }
 */
async function reclamarMision(uid, misionId) {
  const mision = CATALOGO_MISIONES.find((m) => m.id === misionId);
  if (!mision) return { ok: false, mensaje: 'Misión no encontrada' };

  const logro = await getLogro(uid);
  const reclamadas = new Set(Array.isArray(logro.misionesReclamadas) ? logro.misionesReclamadas : []);

  if (reclamadas.has(misionId)) {
    return { ok: false, mensaje: 'Esta misión ya fue reclamada.', yaReclamada: true };
  }

  const { progreso, objetivo } = progresoDeMision(logro, mision);
  if (progreso < objetivo) {
    return { ok: false, mensaje: `Aún no completas esta misión (${progreso}/${objetivo}).` };
  }

  reclamadas.add(misionId);
  logro.misionesReclamadas = Array.from(reclamadas);
  await db.collection('logros').doc(uid).set(logro);

  // Otorgar recompensa (XP + Naranjas) usando el motor de gamificación
  const { otorgarRecompensaMision } = require('./gamificacion');
  const res = await otorgarRecompensaMision(uid, mision.recompensa.xp, mision.recompensa.naranjas);

  return {
    ok: true,
    mensaje: `¡Misión "${mision.titulo}" completada!`,
    mision,
    xp: res.xpGanada,
    naranjas: res.naranjasGanadas,
    nivel: res.nuevoNivel,
    subioNivel: res.subioNivel
  };
}

module.exports = {
  CATALOGO_MISIONES,
  clavesCompletadas,
  progresoDeMision,
  obtenerEstadoMisiones,
  reclamarMision
};