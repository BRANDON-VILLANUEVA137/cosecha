/**
 * MOTOR DE VALIDACIÓN — nunca revela la respuesta correcta al cliente.
 * 🔒 EN PRODUCCIÓN: esta función vive en una Cloud Function con acceso
 * admin al documento `solucionario`; el cliente solo recibe el resultado.
 *
 * TIPOS SOPORTADOS:
 *  - 'texto' | 'entero' | 'completar' | 'traduccion' → comparación libre (ignora mayúsculas)
 *  - 'fraccion'                   → comparación por VALOR numérico (acepta equivalentes)
 *  - 'fraccion_simplificada'      → valor correcto Y forma irreducible (mcd(n,d) === 1)
 *  - 'decimal'                    → número decimal (acepta coma/punto), tolerancia 1e-9
 *  - 'opcion_multiple'|'single'   → selección única (radio buttons)
 *  - 'multiple'|'seleccion_multiple'|'checkboxes' → selección múltiple (checkboxes)
 */

const TIPOS_SELECCION = [
  'opcion_multiple', 'single', 'seleccion_unica',
  'multiple', 'seleccion_multiple', 'checkboxes'
];

/** Indica si un tipo de ejercicio se responde seleccionando opciones. */
function esTipoSeleccion(tipo) {
  return TIPOS_SELECCION.includes(String(tipo || '').toLowerCase());
}

/** Máximo común divisor por el algoritmo de Euclides. */
function mcd(a, b) {
  a = Math.abs(Math.trunc(Number(a) || 0));
  b = Math.abs(Math.trunc(Number(b) || 0));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** Parsea 'n/d' → { numerador, denominador, valor } o null si es inválida. */
function parseFraccion(raw) {
  const s = String(raw == null ? '' : raw).trim().replace(/\s+/g, '');
  const slash = s.indexOf('/');
  if (slash === -1) return null;
  const n = Number(s.slice(0, slash));
  const d = Number(s.slice(slash + 1));
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return { numerador: n, denominador: d, valor: n / d };
}

/** Retro-compatibilidad: valor numérico de una fracción 'n/d' o null. */
function normalizarFraccion(str) {
  const f = parseFraccion(str);
  return f ? f.valor : null;
}

/** Devuelve un número decimal (acepta coma o punto), o NaN si no es numérico. */
function normalizarDecimal(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  const s = String(raw == null ? '' : raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Normaliza la respuesta de selección a un arreglo de claves
 * (minúsculas, ordenado). Acepta arreglo, JSON en string, lista
 * separada por comas o una sola clave.
 */
function clavesSeleccion(raw) {
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    const t = raw.trim();
    if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
      try {
        const parsed = JSON.parse(t);
        arr = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        arr = [];
      }
    } else {
      arr = t.split(',').map(x => x.trim());
    }
  } else if (typeof raw === 'number') {
    arr = [String(raw)];
  }
  return arr.map(x => String(x).trim().toLowerCase()).filter(Boolean).sort();
}

/** Compara dos conjuntos de claves sin importar el orden. */
function conjuntosIguales(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every(x => set.has(x));
}

/**
 * Valida la respuesta de un estudiante contra la solución del ejercicio.
 * @param {object} ejercicio            documento del ejercicio (incluye respuestaCorrecta)
 * @param {string|string[]} respuestaEstudiante  Respuesta (múltiple manda arreglo)
 * @returns {{correcto: boolean, mensaje: string}}
 */
function validarRespuesta(ejercicio, respuestaEstudiante) {
  const tipo = String(ejercicio.tipo || 'texto').toLowerCase();
  const pista = ejercicio.pistaError || 'Vuelve a revisar el procedimiento paso a paso.';

  const correctaRaw = ejercicio.respuestaCorrecta;
  const correctaEsArray = Array.isArray(correctaRaw);
  const correctaTexto = (correctaEsArray ? String(correctaRaw[0] || '') : String(correctaRaw || ''))
    .trim().toLowerCase();

  // ---------------- Fracciones ----------------
  if (tipo === 'fraccion') {
    const dada = parseFraccion(respuestaEstudiante);
    if (!dada) {
      return { correcto: false, mensaje: 'Escribe la fracción en formato numerador/denominador, ej: 7/10.' };
    }
    const correcta = parseFraccion(ejercicio.respuestaCorrecta);
    const estaBien = !!correcta && Math.abs(dada.valor - correcta.valor) < 1e-9;
    return { correcto: estaBien, mensaje: estaBien ? '¡Fracción correcta!' : pista };
  }

  // ---------------- Simplificación (forma irreducible) ----------------
  if (tipo === 'fraccion_simplificada' || tipo === 'simplificacion') {
    const dada = parseFraccion(respuestaEstudiante);
    if (!dada) {
      return { correcto: false, mensaje: 'Escribe la fracción en formato numerador/denominador, ej: 4/3.' };
    }
    const correcta = parseFraccion(ejercicio.respuestaCorrecta);
    const valorOK = !!correcta && Math.abs(dada.valor - correcta.valor) < 1e-9;
    const irreducible = mcd(dada.numerador, dada.denominador) === 1;

    if (valorOK && !irreducible) {
      return {
        correcto: false,
        mensaje: 'La fracción es equivalente pero aún no está simplificada. Divide el numerador y el denominador entre su máximo común divisor (mcd).'
      };
    }
    const estaBien = valorOK && irreducible;
    return { correcto: estaBien, mensaje: estaBien ? '¡Simplificación correcta! Forma irreducible 🎉' : pista };
  }

  // ---------------- Decimal ----------------
  if (tipo === 'decimal') {
    const dada = normalizarDecimal(respuestaEstudiante);
    if (Number.isNaN(dada)) {
      return { correcto: false, mensaje: 'Escribe el resultado como número decimal, por ejemplo: 1.5' };
    }
    const correcta = normalizarDecimal(ejercicio.respuestaCorrecta);
    const estaBien = !Number.isNaN(correcta) && Math.abs(dada - correcta) < 1e-9;
    return { correcto: estaBien, mensaje: estaBien ? '¡Número decimal correcto!' : pista };
  }

  // ---------------- Selección única (radio) ----------------
  if (tipo === 'opcion_multiple' || tipo === 'single' || tipo === 'seleccion_unica') {
    const dada = String(respuestaEstudiante || '').trim().toLowerCase();
    const estaBien = dada !== '' && dada === correctaTexto;
    return { correcto: estaBien, mensaje: estaBien ? '¡Opción correcta!' : pista };
  }

  // ---------------- Selección múltiple (checkbox) ----------------
  if (tipo === 'multiple' || tipo === 'seleccion_multiple' || tipo === 'checkboxes') {
    const dadas = clavesSeleccion(respuestaEstudiante);
    if (dadas.length === 0) {
      return { correcto: false, mensaje: 'Selecciona al menos una opción.' };
    }
    const correctas = clavesSeleccion(ejercicio.respuestaCorrecta);
    const estaBien = conjuntosIguales(dadas, correctas);
    return { correcto: estaBien, mensaje: estaBien ? '¡Todas las respuestas correctas! 🎉' : pista };
  }

  // ---------------- Fracción gráfica (tortas / rectángulos) ----------------
  if (tipo === 'fraccion_grafica' || tipo === 'grafico_interactivo') {
    const dada = parseFraccion(respuestaEstudiante);
    const correcta = parseFraccion(ejercicio.respuestaCorrecta);
    if (!dada) {
      return { correcto: false, mensaje: 'Selecciona las partes y envía tu representación.' };
    }
    const estaBien = !!correcta &&
      dada.numerador === correcta.numerador &&
      dada.denominador === correcta.denominador;
    return {
      correcto: estaBien,
      mensaje: estaBien
        ? '¡Representación correcta! 🎨'
        : `Has coloreado ${dada.numerador} de ${dada.denominador} partes. Representa exactamente la fracción del enunciado.`
    };
  }

  // ---------------- Texto / entero / completar / traducción / gráfico ----------------
  const dada = String(respuestaEstudiante || '').trim().toLowerCase();
  const estaBien = correctaEsArray
    ? correctaSeleccionTexto(respuestaEstudiante, correctaRaw)
    : dada === correctaTexto;
  return { correcto: estaBien, mensaje: estaBien ? '¡Muy bien!' : pista };
}

/** Apoyo para cuando la respuesta correcta viene como arreglo (opción múltiple). */
function correctaSeleccionTexto(respuestaEstudiante, correctaRaw) {
  const set = new Set(clavesSeleccion(correctaRaw));
  const dadas = clavesSeleccion(respuestaEstudiante);
  return dadas.some(x => set.has(x));
}

module.exports = {
  validarRespuesta,
  normalizarFraccion,
  normalizarDecimal,
  mcd,
  esTipoSeleccion
};