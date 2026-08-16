/**
 * GENERADOR DINÁMICO DE EJERCICIOS — Cosecha
 * ==========================================
 * Produce variantes DETERMINISTAS por semilla para diversificar los valores
 * de los ejercicios y evitar que todos los estudiantes vean el mismo
 * enunciado una y otra vez.
 *
 * La semilla se deriva de: uid + tareaId + ejercicioId
 *   → el MISMO estudiante ve la MISMA variante mientras resuelve (puede
 *     continuar el progreso sin que el enunciado cambie), pero estudiantes
 *     distintos (o tareas distintas) reciben valores diferentes.
 *
 * Las plantillas NO guardan la respuesta en la base: ésta se calcula al
 * instanciar, por lo que nunca viaja al cliente en el enunciado.
 */

const PLANTILLAS = {
  division_decimal: 'division_decimal',
  simplificacion: 'simplificacion',
  suma_mismo_denominador: 'suma_mismo_denominador',
  suma_carita: 'suma_carita'
};

/** PRNG determinista mulberry32 (rápido y estable entre nodos). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a a 32 bits (semilla enteramente numérica para mulberry32). */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Entero aleatorio en [min, max] (inclusivo). */
function intAleatorio(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Máximo común divisor. */
function mcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** Número aleatorio en [min,max] coprimo con `ref`. */
function coprimoAEscoger(rng, min, max, ref) {
  for (let i = 0; i < 60; i += 1) {
    const n = intAleatorio(rng, min, max);
    if (mcd(n, ref) === 1) return n;
  }
  return min;
}

/* ------------------------------------------------------------------ *
 * PLANTILLAS — generan el enunciado y calculan la respuesta correcta
 * ------------------------------------------------------------------ */

/** Fracción → decimal (denominadores con decimal exacto: 2, 4, 5, 8, 10). */
function generarDivisionDecimal(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  const denominadores = [2, 4, 5, 8, 10];
  const den = denominadores[intAleatorio(rng, 0, denominadores.length - 1)];
  const num = coprimoAEscoger(rng, 3, 12, den); // no múltiplo de den → no entero
  const valor = Number((num / den).toFixed(2));

  return {
    ...base,
    tipo: 'decimal',
    enunciado: `Convierte la fracción ${num}/${den} a número decimal.`,
    respuestaCorrecta: valor,
    pistaError: `Divide el numerador entre el denominador: ${num} ÷ ${den} = ${valor}.`
  };
}

/** Simplificación a forma irreducible. */
function generarSimplificacion(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  let num = 0; let den = 0;
  for (let i = 0; i < 80; i += 1) {
    num = intAleatorio(rng, 2, 14);
    den = intAleatorio(rng, 3, 14);
    if (num !== den && mcd(num, den) === 1) break;
  }
  const k = intAleatorio(rng, 2, 5);
  const numExt = num * k;
  const denExt = den * k;

  return {
    ...base,
    tipo: 'fraccion_simplificada',
    enunciado: `Simplifica la fracción ${numExt}/${denExt} hasta su forma irreducible.`,
    respuestaCorrecta: `${num}/${den}`,
    pistaError: `Divide el numerador y el denominador entre su mcd (${k}): ${numExt}/${denExt} = ${num}/${den}.`
  };
}

/** Suma de fracciones con el mismo denominador. */
function generarSumaMismoDenominador(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  const d = intAleatorio(rng, 3, 12);
  const a = intAleatorio(rng, 1, 9);
  const b = intAleatorio(rng, 1, 9);
  const suma = a + b;

  return {
    ...base,
    tipo: 'fraccion',
    enunciado: `${a}/${d} + ${b}/${d} = ?`,
    respuestaCorrecta: `${suma}/${d}`,
    pistaError: 'Si el denominador es el mismo, se deja igual y solo se suman los numeradores.'
  };
}

/** Suma de fracciones con diferente denominador (método carita sonriente). */
function generarSumaCarita(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  let d1 = 0; let d2 = 0;
  for (let i = 0; i < 80; i += 1) {
    d1 = intAleatorio(rng, 2, 9);
    d2 = intAleatorio(rng, 2, 9);
    if (mcd(d1, d2) !== 1) break; // buscamos denominadores con mcd > 1
  }
  const a = intAleatorio(rng, 1, 8);
  const b = intAleatorio(rng, 1, 8);

  return {
    ...base,
    tipo: 'fraccion',
    enunciado: `${a}/${d1} + ${b}/${d2} = ?`,
    respuestaCorrecta: `${a * d2 + b * d1}/${d1 * d2}`,
    pistaError: 'Aplica la regla de la carita sonriente: multiplica en cruz los numeradores y suma, y multiplica los denominadores entre sí.'
  };
}

/**
 * Genera la variante concreta de un ejercicio marcado como plantilla.
 * Si el ejercicio no es dinámico, lo devuelve sin cambios.
 */
function generarVariant(ejercicio, seedStr) {
  if (!ejercicio || !ejercicio.plantilla || !seedStr) return ejercicio;
  switch (ejercicio.plantilla) {
    case PLANTILLAS.division_decimal:
      return generarDivisionDecimal(seedStr, ejercicio);
    case PLANTILLAS.simplificacion:
      return generarSimplificacion(seedStr, ejercicio);
    case PLANTILLAS.suma_mismo_denominador:
      return generarSumaMismoDenominador(seedStr, ejercicio);
    case PLANTILLAS.suma_carita:
      return generarSumaCarita(seedStr, ejercicio);
    default:
      return ejercicio;
  }
}

/**
 * Instancia (si corresponde) un ejercicio para un usuario y una tarea.
 * @param {object} ejercicio  documento del ejercicio (debe traer su `id`)
 * @param {string} uid        uid del usuario autenticado
 * @param {string|null} tareaId id de la tarea en curso
 */
function instanciarEjercicio(ejercicio, uid, tareaId) {
  if (!ejercicio || !ejercicio.plantilla) return ejercicio;
  const semilla = `${uid}:${tareaId || 'libre'}:${ejercicio.id}`;
  return generarVariant(ejercicio, semilla);
}

module.exports = {
  PLANTILLAS,
  mulberry32,
  hashString,
  mcd,
  generarVariant,
  instanciarEjercicio
};