/**
 * MOTOR DE VALIDACIÓN — nunca revela la respuesta correcta al cliente.
 * 🔒 EN PRODUCCIÓN: esta función vive en una Cloud Function con acceso
 * admin al documento `solucionario`; el cliente solo recibe el resultado.
 */

function normalizarFraccion(str) {
  str = str.trim().replace(/\s+/g, '');
  if (!str.includes('/')) return null;
  const [n, d] = str.split('/').map(Number);
  if (isNaN(n) || isNaN(d) || d === 0) return null;
  return n / d;
}

function validarRespuesta(ejercicio, respuestaEstudiante) {
  const dada = respuestaEstudiante.trim().toLowerCase();
  const correcta = ejercicio.respuestaCorrecta.trim().toLowerCase();

  if (ejercicio.tipo === 'fraccion') {
    const valorDado = normalizarFraccion(dada);
    if (valorDado === null) {
      return { correcto: false, mensaje: 'Escribe la fracción en formato numerador/denominador, ej: 7/10.' };
    }
    const ok = Math.abs(valorDado - normalizarFraccion(correcta)) < 1e-9;
    return { correcto: ok, mensaje: ok ? '¡Fracción correcta!' : ejercicio.pistaError };
  }

  const ok = dada === correcta;
  return { correcto: ok, mensaje: ok ? '¡Muy bien!' : ejercicio.pistaError };
}

module.exports = { validarRespuesta, normalizarFraccion };