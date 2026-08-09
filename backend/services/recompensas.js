/**
 * MOTOR DE RECOMPENSAS — Cosecha 2.0 (XP + Naranjas + Rachas + Niveles)
 * =====================================================================
 * Ya no se desbloquean prendas por "conteo rígido de aciertos".
 * La recompensa ahora es dinámica y se delega al motor de gamificación
 * (`gamificacion.js`), que otorga XP, Naranjas, gestión de rachas y
 * controla la subida de nivel y la apertura progresiva de la tienda.
 *
 * Mantiene `evaluarRecompensas` como punto de entrada con firma
 * compatible con lo que consumía `ejercicios.js`.
 */
const gamificacion = require('./gamificacion');

/**
 * Evalúa una respuesta de ejercicio y otorga la recompensa correspondiente:
 *   - correcto     → +10 XP (+1 naranja)  y bonificación de racha si aplica
 *   - incorrecto   → +2 XP (premio a la constancia)
 *
 * @param {string} uid
 * @param {string} materia      'matematicas' | 'ingles'
 * @param {object} resultado    { correcto: boolean, mensaje: string }
 * @returns {Promise<object>}   resultado ampliado con xpGanada,
 *   naranjasGanadas, rachaBonus, nivelAnterior, nuevoNivel, subioNivel,
 *   rango, racha y nuevasPrendas (ítems recién visibles por subir de nivel).
 */
async function evaluarRecompensas(uid, materia, resultado) {
  const tipo = resultado && resultado.correcto ? 'correcto' : 'perseverancia';
  const res = await gamificacion.otorgarXP(uid, { tipo, materia });

  return {
    ...resultado,
    xpGanada: res.xpGanada,
    rachaBonus: res.rachaBonus,
    naranjasGanadas: res.naranjasGanadas,
    nivelAnterior: res.nivelAnterior,
    nuevoNivel: res.nuevoNivel,
    subioNivel: res.subioNivel,
    rango: res.rango,
    racha: res.racha,
    xpTotal: res.xpTotal,
    naranjasTotales: res.naranjasTotales,
    nuevasPrendas: res.nuevasPrendas
  };
}

module.exports = { evaluarRecompensas };