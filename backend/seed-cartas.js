const { db } = require('./config/firebase-admin');

/**
 * Semilla: expande el catálogo de cartas hasta 50 cartas con
 * distribución equilibrada de rarezas (idempotente: solo inserta las que faltan).
 *   Común: 22 | Rara: 15 | Épica: 9 | Legendaria: 4  ->  50
 *
 * NORMA DE RAREZA:
 *   comun      -> estrellas 1-2,  stats ~10-40
 *   rara       -> estrellas 3-4,  stats ~40-70
 *   epica      -> estrellas 4-5,  stats ~70-90
 *   legendaria -> estrellas 5,    stats ~90-110
 */

// RANGOS por rareza [min, max) para estrellas y stats (pseudo-aleatorio estable)
const RANGOS = {
  comun:      { estrellas: [1, 3],   stats: [10, 45] },
  rara:       { estrellas: [3, 5],   stats: [40, 75] },
  epica:      { estrellas: [4, 6],   stats: [70, 95] },
  legendaria: { estrellas: [5, 6],   stats: [90, 115] }
};

// Catálogo completo de 50 cartas (nombre -> rareza por posición)
const COMUN = [
  'Naranjita Agrícola', 'Mandarina Sonriente', 'Pomelo Recolector', 'Limoncitín Veloz',
  'Cítrico Guerrero', 'Naranjita Risueña', 'Mandarina Traviesa', 'Limón Chispa',
  'Pomelito Fiestero', 'Cítrico Campesino', 'Naranja Semillita', 'Mandarina Cometa',
  'Limoncillo Saltarín', 'Naranja Rayo', 'Cítrico Labrador', 'Mandarina Burbuja',
  'Pomelo Risueño', 'Limón Rayito', 'Naranjita Danzarina', 'Cítrico Granjero',
  'Mandarina Chiquita', 'Limón Aterrizador'
];
const RARA = [
  'Kumquat Aventurero', 'Cítrico Guardián', 'Naranjita Exploradora', 'Toronjita Viajera',
  'Cítrico Centinela', 'Naranja Descubridora', 'Mandarina Estelar', 'Limón Vigía',
  'Pomelo Explorador', 'Cítrico Escudero', 'Kumquat Peregrino', 'Naranjita Guardiana',
  'Mandarina Navegante', 'Limón Cazador', 'Pomelito Vigilante'
];
const EPICA = [
  'Cítrico Luminoso', 'Toronja Arcana', 'Mandarina Titánica', 'Cítrico Radiante',
  'Limón Centella', 'Naranja Suprema', 'Pomelo Celestial', 'Cítrico Espejo',
  'Mandarina Prisma'
];
const LEGENDARIA = [
  'Rey Mandarina Dorada', 'Cítrico Cósmico', 'Cítrico Primordial', 'Emperatriz Naranja'
];

// Hash determinista para stats estables por nombre
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function randBetween(seedVal, min, max) {
  // min incluido, max excluido, determinista
  const r = (seedVal % 1000) / 1000;
  return Math.floor(min + r * (max - min));
}

function statsDe(nombre, rareza) {
  const r = RANGOS[rareza] || RANGOS.comun;
  let h = hash(nombre);
  const s = () => randBetween((h = (h * 1664525 + 1013904223) >>> 0), r.stats[0], r.stats[1]);
  return { poder: s(), inteligencia: s(), fuerza: s() };
}

function estrellasDe(nombre, rareza) {
  const r = RANGOS[rareza] || RANGOS.comun;
  const h = hash(nombre + '·stars');
  return randBetween(h, r.estrellas[0], r.estrellas[1]);
}

(async () => {
  const snap = await db.collection('cartas').get();
  const existentes = new Set(snap.docs.map(d => d.data().nombre));
  console.log('Cartas actuales:', snap.size);

  const conteo = { comun: 0, rara: 0, epica: 0, legendaria: 0 };
  snap.docs.forEach(d => { conteo[d.data().rareza] = (conteo[d.data().rareza] || 0) + 1; });
  console.log('Distribución actual:', JSON.stringify(conteo));

  // Debe verificarse: el catálogo suma 50
  const totalEsperado = COMUN.length + RARA.length + EPICA.length + LEGENDARIA.length;
  if (totalEsperado !== 50) {
    console.error(`ATENCIÓN: el catálogo suma ${totalEsperado}, se esperaba 50.`);
  }

  let added = 0;
  const batch = db.batch();
  const agregadas = [
    ...COMUN.map(n => ({ nombre: n, rareza: 'comun' })),
    ...RARA.map(n => ({ nombre: n, rareza: 'rara' })),
    ...EPICA.map(n => ({ nombre: n, rareza: 'epica' })),
    ...LEGENDARIA.map(n => ({ nombre: n, rareza: 'legendaria' }))
  ];

  for (const c of agregadas) {
    if (existentes.has(c.nombre)) continue;
    const ref = db.collection('cartas').doc();
    batch.set(ref, {
      nombre: c.nombre,
      rareza: c.rareza,
      estrellas: estrellasDe(c.nombre, c.rareza),
      stats: statsDe(c.nombre, c.rareza),
      imagen_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(c.nombre)}`,
      activa: true
    });
    added++;
  }

  if (added > 0) {
    await batch.commit();
  }
  console.log('Cartas nuevas insertadas:', added);

  const despues = await db.collection('cartas').get();
  const final = { comun: 0, rara: 0, epica: 0, legendaria: 0 };
  despues.docs.forEach(d => { final[d.data().rareza] = (final[d.data().rareza] || 0) + 1; });
  console.log('Total cartas:', despues.size, '| Distribución final:', JSON.stringify(final));
})().catch(console.error);