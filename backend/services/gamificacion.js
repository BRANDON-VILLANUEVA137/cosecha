/**
 * MOTOR DE GAMIFICACIÓN — Cosecha 2.0
 * ====================================
 * Sistema dinámico basado en:
 *   • XP (Experiencia)        → progresión de nivel
 *   • Naranjas (moneda cítrica) → Economía Virtual de la tienda
 *   • Niveles                 → desbloquea contenido y marcos
 *   • Rachas diarias          → bonificación de pertenencia
 *   • Rangos / Tier de marco  → Madera → Bronce → Plata → Oro → Cristal → Cítrico Legendario
 *
 * NOTA ARQUITECTÓNICA:
 *   El avatar principal se genera con la API de DiceBear (estilo Adventurer).
 *   El sprite Adventurer NO expone parámetros para "pantalón" ni "zapatos"
 *   (sólo `clothing`, `hat`, `accessories`, `facialHair`, `facialExpression`).
 *   Por ello, las prendas de tipo `piernas`/`calzado` existen como colección
 *   pero el avatar DiceBear refleja `torso`(clothing) + `cabeza`(hat) +
 *   `accesorio`(accessories/facialHair). Se preservan los slots heredados.
 */

const { db } = require('../config/firebase-admin');

/* ------------------------------------------------------------------ *
 * CONSTANTES DE CONFIGURACIÓN DE LA ECONOMÍA
 * ------------------------------------------------------------------ */

/** XP otorgada por cada tipo de evento. */
const XP_GANAR = {
  correcto: 10,      // ✅ Pregunta / ejercicio respondido correctamente
  perseverancia: 2,   // 💪 Intento fallido que lee la explicación
  leccion: 100,      // 🎓 Lección / tutoría completada
  rachaDiaria: 50     // 🔥 Bonificación por racha diaria (se suma al evento activo del día)
};

/** Ratio configurable: XP → Naranjas. 10 XP = 1 Naranja. */
const RATIO_XP_NARANJAS = 10;

/**
 * Curva progresiva de nivel (XP cumulative requerida para ALCANZAR el nivel N).
 *   Nivel 1 → 0 XP, Nivel 2 → 100 XP, Nivel 3 → 300 XP, Nivel 4 → 600 XP ...
 * Fórmula: XP_PARA_NIVEL(n) = 100 * n * (n - 1) / 2
 * La diferencia entre niveles crece linealmente (+100 cada vez), manteniendo
 * una progresión acelerada que preserva la motivación a largo plazo.
 */
function XP_PARA_NIVEL(n) {
  if (n <= 1) return 0;
  return Math.round(100 * n * (n - 1) / 2);
}

/**
 * Rangos / Tier de marco del avatar. Cada rango se desbloquea al alcanzar
 * el nivel mínimo indicado. El marco cambia AUTOMÁTICAMENTE con el nivel.
 * (Madera → Bronce → Plata → Oro → Cristal → Cítrico Legendario)
 */
const RANGOS_MARCO = [
  { nombre: 'madera',  nivel: 1,  icono: '🪵', color: '#8B5A2B' },
  { nombre: 'bronce',  nivel: 3,  icono: '🟤', color: '#CD7F32' },
  { nombre: 'plata',   nivel: 5,  icono: '🏅', color: '#C0C0C0' },
  { nombre: 'oro',     nivel: 8,  icono: '🟡', color: '#FFD700' },
  { nombre: 'cristal', nivel: 12, icono: '🔮', color: '#87CEEB' },
  { nombre: 'citrico-legendario', nivel: 18, icono: '🍊✨', color: '#FF8C33' }
];


/** Item base que todo estudiante recibe al crear su cuenta. */
const ITEMS_BASE = ['camiseta-basica'];

/* ------------------------------------------------------------------ *
 * HELPERS PUROS (sin efectos secundarios)
 * ------------------------------------------------------------------ */

/** Calcula el nivel a partir del XP total (curva progresiva). */
function calcularNivel(xp) {
  xp = Math.max(0, Math.floor(Number(xp) || 0));
  let n = 1;
  while (XP_PARA_NIVEL(n + 1) <= xp) n++;
  return n;
}

/**
 * Detalle de progresión de nivel para la barra de XP.
 * @returns {{nivel, xpEnNivel, xpParaSiguiente, progreso, xpTotal}}
 */
function calcularProgresoNivel(xp) {
  xp = Math.max(0, Math.floor(Number(xp) || 0));
  const nivel = calcularNivel(xp);
  const xpEnNivel = xp - XP_PARA_NIVEL(nivel);
  const xpParaSiguiente = XP_PARA_NIVEL(nivel + 1);
  const ventana = xpParaSiguiente - XP_PARA_NIVEL(nivel); // XP que abarcha este nivel
  const progreso = ventana > 0 ? Math.round((xpEnNivel / ventana) * 100) : 0;
  return {
    nivel,
    xpEnNivel,
    xpParaSiguiente,
    progreso: Math.min(100, Math.max(0, progreso)),
    xpTotal: xp
  };
}

/** Devuelve el rango/tier más alto desbloqueado por un nivel. */
function rangoPorNivel(nivel) {
  let rango = RANGOS_MARCO[0];
  for (const r of RANGOS_MARCO) {
    if (nivel >= r.nivel) rango = r;
  }
  return rango;
}

/** Naranjas que equivalen a una cantidad de XP (floor). */
const naranjasDe = (xp) => Math.floor(Math.max(0, xp) / RATIO_XP_NARANJAS);

/**
 * Genera la URL dinámica de la API de DiceBear (estilo Adventurer) a partir
 * del equipo equipado y el catálogo de prendas. Cada prenda aporta su
 * `dicebearOptions` (clothing / hat / accessories / facialHair ...).
 *
 * @param {object} equipo  - { cabeza, torso, accesorio, ... }
 * @param {Array}  prendas - catálogo completo (para resolver dicebearOptions)
 * @param {object} extra   - { seed, racha }  (racha → expresión facial)
 * @returns {string} URL de la imagen SVG
 */
function generarUrlDiceBear(equipo, prendas, extra = {}) {
  const seed = (extra.seed || 'cosecha').toString().replace(/[^a-zA-Z0-9_-]+/g, '');
  const params = new URLSearchParams({ seed });

  // Emoción del personaje en función de la racha semanal
  const dias = (extra.racha && extra.racha.dias) || 0;
  if (dias >= 7) params.set('facialExpression', 'smile');
  else if (dias >= 3) params.set('facialExpression', 'serious');

  const orden = ['torso', 'cabeza', 'accesorio'];
  orden.forEach((cat) => {
    const id = equipo && equipo[cat];
    if (!id) return;
    const prenda = (prendas || []).find((p) => p.id === id);
    if (prenda && prenda.dicebearOptions) {
      Object.entries(prenda.dicebearOptions).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, v);
      });
    }
  });

    return `https://api.dicebear.com/7.x/adventurer/svg?${params.toString()}`;
}

/* ------------------------------------------------------------------ *
 * ESTADO POR DEFECTO DEL JUGADOR (documento `logros`)
 * ------------------------------------------------------------------ */
function defaultsLogro(uid, nombre = '') {
  return {
    uid,
    nombre,
    email: '',
    nivel: 1,
    xp: 0,
    naranjas: 0,
    // Legacy (compat analytics / vistas anteriores)
    aciertosMatematicas: 0,
    aciertosIngles: 0,
    intentos: 0,
    // Nueva economía
    racha: { dias: 0, ultimaFecha: null },
    inventario: [...ITEMS_BASE],
    equipo: {
      perfil: null,              // OpenPeeps (foto de perfil)
      marco: null,               // Marco de perfil (shop) — null = rango automático
      cabeza: null,              // → DiceBear `hat`
      torso: 'camiseta-basica',  // → DiceBear `clothing`
      accesorio: null,           // → DiceBear `accessories` / `facialHair`
      fondo: null                // Fondo de tarjeta
    },
    historial: []
  };
}

/**
 * Obtiene el documento de logro/gamificación del usuario, creándolo con
 * valores por defecto si no existe. Migra esquemas heredados.
 */
async function getLogro(uid) {
  const snap = await db.collection('logros').doc(uid).get();
  const base = defaultsLogro(uid);

  if (!snap.exists) {
    await db.collection('logros').doc(uid).set(base);
    return base;
  }

  const data = snap.data();
  // Migración legacy: desbloqueadas → inventario
  let inventario = Array.isArray(data.inventario)
    ? data.inventario
    : (Array.isArray(data.desbloqueadas) ? data.desbloqueadas : base.inventario);

  const equipo = { ...base.equipo, ...(data.equipo || {}) };

  return {
    ...base,
    ...data,
    nombre: data.nombre || '',
    email: data.email || '',
    nivel: Number(data.nivel) || 1,
    xp: Number(data.xp) || 0,
    naranjas: Number(data.naranjas) || 0,
    aciertosMatematicas: Number(data.aciertosMatematicas) || 0,
    aciertosIngles: Number(data.aciertosIngles) || 0,
    intentos: Number(data.intentos) || 0,
    racha: data.racha || base.racha,
    inventario,
    equipo,
    historial: Array.isArray(data.historial) ? data.historial : []
  };
}

/* ------------------------------------------------------------------ *
 * FECHAS DE RACHA (UTC, consistentes en backend)
 * ------------------------------------------------------------------ */
function fechaHoyISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function fechaAyerISO() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * OTORGAR XP (y Naranjas / Racha / Subida de Nivel)
 * ------------------------------------------------------------------ */
/**
 * Aplica un evento de experiencia al jugador.
 *  @param {string} uid
 *  @param {object} evento
 *    { tipo: 'correcto'|'perseverancia'|'leccion', materia?: string }
 *  - 'correcto'      → +10 XP (y +1 naranja), incrementa acierto por materia
 *  - 'perseverancia' → +2 XP (premio a la constancia)
 *  - 'leccion'       → +100 XP (+10 naranjas) al completar una tutoría
 *
 * @returns {Promise<object>} resultado con xpGanada, naranjasGanadas,
 *   nivelAnterior, nuevoNivel, subioNivel, rango, racha, nuevasPrendas
 */
async function otorgarXP(uid, evento) {
  const logro = await getLogro(uid);
  const tipo = evento.tipo || 'perseverancia';

  // --- Racha diaria (solo eventos "activos" cuentan) ---
  const esActivo = ['correcto', 'perseverancia', 'leccion'].includes(tipo);
  let rachaBonus = 0;

  if (esActivo) {
    const hoy = fechaHoyISO();
    const ayer = fechaAyerISO();
    const racha = logro.racha || { dias: 0, ultimaFecha: null };
    const ultima = racha.ultimaFecha;

    if (ultima === hoy) {
      // Ya se cobró la racha hoy → no vuelve a otorgarse
    } else if (ultima === ayer) {
      racha.dias = (racha.dias || 0) + 1;
      rachaBonus = XP_GANAR.rachaDiaria;
    } else {
      // Racha rota (o primera vez) → reinicia a 1
      racha.dias = 1;
      rachaBonus = XP_GANAR.rachaDiaria;
    }
    racha.ultimaFecha = hoy;
    logro.racha = racha;
  }

  // --- XP base del evento ---
  const xpBase = XP_GANAR[tipo] || 0;
  const xpTotal = xpBase + rachaBonus;
  const naranjasGanadas = naranjasDe(xpTotal);

  logro.xp += xpTotal;
  logro.naranjas += naranjasGanadas;

  // Legacy + tracking
  if (tipo === 'correcto') {
    if (evento.materia === 'matematicas') logro.aciertosMatematicas += 1;
    else if (evento.materia === 'ingles') logro.aciertosIngles += 1;
    logro.intentos += 1;
  } else if (tipo === 'perseverancia') {
    logro.intentos += 1;
  }

  // --- Recálculo de nivel ---
  const nivelAnterior = logro.nivel || 1;
  const calc = calcularProgresoNivel(logro.xp);
  logro.nivel = calc.nivel;
  const subioNivel = logro.nivel > nivelAnterior;

  // --- Prendas que recién se hacen VISIBLES (por subida de nivel) ---
  // (no se añaden al inventario; el jugador las compra con naranjas)
  let nuevasPrendas = [];
  if (subioNivel) {
    const prendasSnap = await db.collection('prendas').get();
    const todas = prendasSnap.docs
      .map((d) => { const v = d.data(); return { id: d.id, ...v }; })
      .filter((p) => p.nivelRequerido && p.nivelRequerido > 0);
    nuevasPrendas = todas.filter(
      (p) => p.nivelRequerido <= logro.nivel && p.nivelRequerido > nivelAnterior
    );
  }

  await db.collection('logros').doc(uid).set(logro);

  return {
    tipo,
    xpBase,
    rachaBonus,
    xpGanada: xpTotal,
    naranjasGanadas,
    nivelAnterior,
    nuevoNivel: logro.nivel,
    subioNivel,
    rango: rangoPorNivel(logro.nivel),
    racha: logro.racha,
    xpTotal: logro.xp,
    naranjasTotales: logro.naranjas,
        nuevasPrendas
  };
}

/* ------------------------------------------------------------------ *
 * TIENDA: COMPRAR
 * ------------------------------------------------------------------ */
/**
 * Compra un ítem de la tienda. Verifica nivel mínimo + naranjas.
 * Los ítems gratuitos (precio 0) se "compran" libremente.
 *
 * @returns {Promise<{ok:boolean, mensaje:string, logro?:object, prenda?:object, nivelRequerido?:number}>}
 */
async function comprarItem(uid, itemId) {
  if (!itemId) return { ok: false, mensaje: 'Ítem no especificado.' };

  const snap = await db.collection('prendas').doc(itemId).get();
  if (!snap.exists) return { ok: false, mensaje: 'Ítem no encontrado.' };
  const prenda = { id: snap.id, ...snap.data() };

  const logro = await getLogro(uid);

  if (prenda.nivelRequerido && logro.nivel < prenda.nivelRequerido) {
    return {
      ok: false,
      mensaje: `Necesitas nivel ${prenda.nivelRequerido} para comprar ${prenda.nombre}.`,
      nivelRequerido: prenda.nivelRequerido
    };
  }

  const precio = Number(prenda.precio) || 0;
  if (logro.inventario.includes(itemId)) {
    return { ok: false, mensaje: `Ya posees ${prenda.nombre}.`, duplicado: true };
  }
  if (logro.naranjas < precio) {
    return {
      ok: false,
      mensaje: `No tienes suficientes naranjas ( necesitas ${precio} ).`,
      fondas: logro.naranjas
    };
  }

  logro.naranjas -= precio;
  logro.inventario.push(itemId);
  await db.collection('logros').doc(uid).set(logro);

  return { ok: true, mensaje: `¡${prenda.nombre} comprada!`, logro, prenda };
}

/* ------------------------------------------------------------------ *
 * EQUIPAR / DESEQUIPAR
 * ------------------------------------------------------------------ */
/**
 * Equipa (o desequipa) un ítem del inventario del jugador.
 * - cabeza / accesorio: toggle (desequipa si ya está puesto)
 * - perfil / marco / torso / fondo: asignación directa
 *
 * @param {string} uid
 * @param {string} categoria
 * @param {string|null} itemId
 */
async function equiparItem(uid, categoria, itemId) {
  if (!categoria) return { ok: false, mensaje: 'Falta categoría.' };

  const logro = await getLogro(uid);
  if (itemId) {
    const prendaDoc = await db.collection('prendas').doc(itemId).get();
    if (!prendaDoc.exists) return { ok: false, mensaje: 'Ítem no encontrado.' };
  }

  // Validar que el ítem está en el inventario
  if (itemId && !logro.inventario.includes(itemId)) {
    return { ok: false, mensaje: 'No poseas este ítem.' };
  }

  const equipo = { ...(logro.equipo || {}) };

  if (categoria === 'cabeza' || categoria === 'accesorio') {
    // Toggle: si ya está equipado, se quita (null)
    equipo[categoria] = equipo[categoria] === itemId ? null : itemId;
  } else {
    equipo[categoria] = itemId || null;
  }

  // Normalizar slots nuevos en documentos legados
  if (equipo.perfil === undefined) equipo.perfil = null;
  if (equipo.marco === undefined) equipo.marco = null;
  if (equipo.fondo === undefined) equipo.fondo = null;

  logro.equipo = equipo;
  await db.collection('logros').doc(uid).set(logro);

  return { ok: true, equipo };
}

/* ------------------------------------------------------------------ *
 * TAREA COMPLETADA (Lección / Tutoría)
 * ------------------------------------------------------------------ */
/**
 * Marca una tarea como completada y otorga +100 XP (lección completada).
 * Idempotent: no vuelve a otorgar si ya estaba completada.
 */
async function completarTarea(uid, tareaId) {
  if (!tareaId) return { ok: false, mensaje: 'Tarea sin ID.' };
  const logro = await getLogro(uid);
  const completadas = logro.tareasCompletadas || [];
  if (completadas.includes(tareaId)) {
    return { ok: true, mensaje: 'Tarea ya completada.', yaCompletada: true };
  }
  completadas.push(tareaId);
  logro.tareasCompletadas = completadas;
  await db.collection('logros').doc(uid).set(logro);

  const res = await otorgarXP(uid, { tipo: 'leccion' });
  return { ok: true, mensaje: '¡Lección completada!', yaCompletada: false, ...res };
}

module.exports = {
  XP_GANAR,
  RATIO_XP_NARANJAS,
  XP_PARA_NIVEL,
  RANGOS_MARCO,
  ITEMS_BASE,
  calcularNivel,
  calcularProgresoNivel,
  rangoPorNivel,
  naranjasDe,
  generarUrlDiceBear,
  defaultsLogro,
  getLogro,
  fechaHoyISO,
  otorgarXP,
  comprarItem,
  equiparItem,
  completarTarea
};
