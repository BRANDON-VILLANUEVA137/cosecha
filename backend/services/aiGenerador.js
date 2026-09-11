/**
 * GENERADOR CON IA (Gemini) — Cosecha 2.5
 * ========================================
 * Conecta con la API de Google Gemini (generativelanguage.googleapis.com)
 * para generar ejercicios "desde cero" cuando el estudiante pide temas
 * libres que el algoritmo procedimental no cubre.
 *
 * USO:
 *   - Requiere la variable de entorno GEMINI_API_KEY (la que compartiste).
 *   - Si no hay API key o la petición falla, `generarConGemini` devuelve
 *     `null` y el sistema usa el fallback procedimental (nunca rompe).
 *   - Cada respuesta de la IA se valida ANTES de persistir (validacion.js)
 *     y se descartan ítems inválidos.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

function getApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_ALT || '';
  return key.trim();
}

/** Devuelve true si hay configuración de IA disponible. */
function iaDisponible() {
  return !!getApiKey();
}

const DEFAULT_SYSTEM_PROMPT = `Eres un generador de ejercicios educativos para la plataforma Cosecha (primaria).
Genera SIEMPRE un JSON con la forma EXACTA:
{"exercises":[{"enunciado":"...","respuestaCorrecta":"...","tipo":"texto","opciones":null,"pistaError":"..."}]}

REGLAS:
- Los ejercicios deben ser apropiados para estudiantes de primaria.
- respuestaCorrecta debe ser EXACTA (texto sin mayúsculas ni espacios extra).
- Si tipo es "opcion_multiple", opciones debe ser un arreglo [{clave:"a",texto:"...",...}] y respuestaCorrecta la CLAVE correcta.
- Incluye "pistaError" breve y en español.
- NO agregues texto fuera del JSON. Devuelve solo el JSON.`;

/** Sanitiza la solicitud del estudiante para evitar inyección de prompt. */
function sanitizarSolicitud(solicitud) {
  return String(solicitud || '')
    .trim()
    .slice(0, 300)
    .replace(/[<>{}]/g, '');
}

/**
 * Llama a Gemini y pide N ejercicios.
 * @param {object} params {materia, tema, cantidad, solicitud}
 * @returns {Promise<Array<object>|null>} ejercicios validados o null si falla
 */
async function generarConGemini(params) {
  const key = getApiKey();
  if (!key) return null;

  const { materia = 'matematicas', tema = '', cantidad = 10, solicitud = '' } = params || {};
  const cant = Math.min(Math.max(Number(cantidad) || 10, 1), 15);
  const materiaEsp = materia === 'ingles'
    ? 'inglés (vocabulario, gramática, verb to be, a/an, plurales)'
    : 'matemáticas (fracciones, operaciones, números negativos, problemas)';
  const pedido = sanitizarSolicitud(solicitud || tema);

  const userPrompt = `Genera ${cant} ejercicios de ${materiaEsp}.
Solicitud del estudiante: "${pedido || 'ejercicios variados de la materia'}".
Nivel: primaria (9-12 años).
Entrega solo JSON.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(
      `${GEMINI_API_URL}${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: DEFAULT_SYSTEM_PROMPT + '\n\n' + userPrompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('⚠️ [IA] Gemini respondió', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return null;

    // Gemini con responseMimeType json devuelve el texto del JSON (o ya parseado)
    let parsed = null;
    try {
      parsed = typeof text === 'string' ? JSON.parse(text) : text;
    } catch (_) {
      const m = String(text).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
    }
    const lista = (parsed && Array.isArray(parsed.exercises)) ? parsed.exercises : [];

    // --- Capa de validación inmediata ---
    const validos = validarListaIA(lista, materia, tema, materiaEsp);
    return validos.length ? validos : null;
  } catch (error) {
    console.error('⚠️ [IA] Error llamando a Gemini:', error.message);
    return null;
  }
}

/** Valida y normaliza la lista de ejercicios devuelta por la IA. */
function validarListaIA(lista, materia, tema, materiaEsp) {
  const { validarRespuesta } = require('./validacion');
  const validos = [];
  for (const e of lista) {
    if (!e || typeof e !== 'object') continue;
    if (!e.enunciado || e.respuestaCorrecta === undefined || e.respuestaCorrecta === '') continue;
    if (e.tipo === 'opcion_multiple' && (!Array.isArray(e.opciones) || e.opciones.length < 2)) continue;
    // Verificación de coherencia numérica para fracciones/decimales
    if (['fraccion', 'fraccion_simplificada', 'decimal', 'entero'].includes(e.tipo)) {
      const test = { ...e, tipo: e.tipo, respuestaCorrecta: e.respuestaCorrecta };
      const r = validarRespuesta(test, e.respuestaCorrecta);
      if (!r.correcto && e.tipo !== 'fraccion_simplificada') continue;
    }
    validos.push({
      materia,
      tema: String(e.tema || tema || 'IA · ' + materiaEsp).slice(0, 120),
      tipo: e.tipo || 'texto',
      enunciado: String(e.enunciado).slice(0, 500),
      respuestaCorrecta: e.respuestaCorrecta,
      ...(Array.isArray(e.opciones) ? { opciones: e.opciones } : {}),
      pistaError: (e.pistaError || 'Vuelve a revisar el procedimiento paso a paso.').slice(0, 300),
      metodologia: 'IA / Gemini',
      origen: 'ia',
      modelo: GEMINI_MODEL
    });
  }
  return validos;
}

module.exports = { generarConGemini, iaDisponible, sanitizarSolicitud };