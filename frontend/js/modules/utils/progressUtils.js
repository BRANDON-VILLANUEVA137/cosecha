// js/utils/progressUtils.js
export function XP_PARA_NIVEL(k) {
  return (k <= 1) ? 0 : Math.round(100 * k * (k - 1) / 2);
}

export function calcularProgreso(logro) {
  const xp = Math.max(0, Math.floor(Number(logro?.xp) || 0));
  let n = 1;
  while (XP_PARA_NIVEL(n + 1) <= xp) n++;
  const nivelFinal = n;
  const xpEnNivel = xp - XP_PARA_NIVEL(nivelFinal);
  const xpParaSiguiente = XP_PARA_NIVEL(nivelFinal + 1);
  const ventana = xpParaSiguiente - XP_PARA_NIVEL(nivelFinal);
  const progreso = ventana > 0 ? Math.round((xpEnNivel / ventana) * 100) : 0;
  return {
    nivel: nivelFinal,
    xpEnNivel,
    xpParaSiguiente,
    progreso: Math.min(100, Math.max(0, progreso)),
    xpTotal: xp
  };
}

export function reconciliarProgreso(local, servidor) {
  const l = local || {};
  const s = servidor || {};
  const lt = Array.isArray(l.completedTaskIds) ? l.completedTaskIds : [];
  const st = Array.isArray(s.completedTaskIds) ? s.completedTaskIds : [];
  const le = Array.isArray(l.completedExerciseIds) ? l.completedExerciseIds : [];
  const se = Array.isArray(s.completedExerciseIds) ? s.completedExerciseIds : [];
  const completedTaskIds = [...new Set([...lt, ...st])];
  const completedExerciseIds = [...new Set([...le, ...se])];
  const li = l.intentosPorEjercicio && typeof l.intentosPorEjercicio === 'object' ? l.intentosPorEjercicio : {};
  const si = s.intentosPorEjercicio && typeof s.intentosPorEjercicio === 'object' ? s.intentosPorEjercicio : {};
  const intentosPorEjercicio = {};
  [...new Set([...Object.keys(li), ...Object.keys(si)])].forEach(k => {
    intentosPorEjercicio[k] = Math.max(Number(li[k]) || 0, Number(si[k]) || 0);
  });
  return { completedTaskIds, completedExerciseIds, intentosPorEjercicio };
}

// ✅ AGREGAR ESTA FUNCIÓN
export function getProgressStorageKey(userId) {
  return `cosecha-progress-${userId || 'guest'}`;
}