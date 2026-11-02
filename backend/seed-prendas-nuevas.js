/**
 * Semilla: añade prendas nuevas al catálogo (colección `prendas`).
 *
 *   node seed-prendas-nuevas.js            → solo muestra qué crearía (no escribe)
 *   node seed-prendas-nuevas.js --apply    → crea las que faltan
 *
 * Es idempotente y NO modifica prendas existentes: si un id ya existe, lo salta.
 * Las formas (`shape`) las dibuja frontend/js/personaje.js.
 */

const p = (id, categoria, shape, nombre, color, precio, nivelRequerido, extra = {}) =>
  ({ id, categoria, shape, nombre, color, tipo: 'svg', precio, nivelRequerido, ...extra });

const PRENDAS_NUEVAS = [
  // ---------- Torso ----------
  p('camisa-cuadros',   'torso', 'camisa',     'Camisa de cuadros',   '#C4452D', 30, 3),
  p('camiseta-rayas',   'torso', 'rayas',      'Camiseta de rayas',   '#3E7CB1', 20, 2),
  p('overol-jean',      'torso', 'overol',     'Overol de jean',      '#4A6FA5', 40, 4),
  p('chaqueta-cuero',   'torso', 'chaqueta',   'Chaqueta de cuero',   '#3A2A1E', 60, 6),
  p('capa-heroe',       'torso', 'capa',       'Capa de héroe',       '#C4452D', 80, 8),
  p('bata-laboratorio', 'torso', 'bata',       'Bata de laboratorio', '#FFFFFF', 55, 5),
  p('vestido-volantes', 'torso', 'vestido',    'Vestido de volantes', '#F28BB0', 45, 4),
  p('uniforme-colegio', 'torso', 'uniforme',   'Uniforme del colegio','#2B4A7A', 35, 3),
  p('traje-astronauta', 'torso', 'astronauta', 'Traje de astronauta', '#E8742A', 120, 12),

  // ---------- Cabeza ----------
  p('gorra-beisbol',    'cabeza', 'gorra',    'Gorra de béisbol',     '#3E7CB1', 20, 2),
  p('orejas-gato',      'cabeza', 'orejas',   'Orejas de gato',       '#3A2A1E', 30, 3),
  p('sombrero-mago',    'cabeza', 'mago',     'Sombrero de mago',     '#5B3A8C', 60, 6),
  p('bandana-pirata',   'cabeza', 'bandana',  'Bandana pirata',       '#C4452D', 25, 3),
  p('corona-rey',       'cabeza', 'corona',   'Corona de rey',        '#FFC93C', 100, 10),
  p('casco-minero',     'cabeza', 'casco',    'Casco de explorador',  '#E8B53A', 40, 4),
  p('corona-flores',    'cabeza', 'flores',   'Corona de flores',     '#E8742A', 35, 3),
  p('gorro-chef',       'cabeza', 'chef',     'Gorro de chef',        '#FFFFFF', 30, 3),
  p('birrete-graduado', 'cabeza', 'birrete',  'Birrete de graduación','#2A1D12', 90, 9),

  // ---------- Accesorios ----------
  p('audifonos-musica', 'accesorio', 'audifonos', 'Audífonos',          '#C4452D', 35, 3),
  p('corbatin-elegante','accesorio', 'corbatin',  'Corbatín',           '#C4452D', 20, 2),
  p('bufanda-lana',     'accesorio', 'bufanda',   'Bufanda de lana',    '#3E8E74', 25, 3),
  p('parche-pirata',    'accesorio', 'parche',    'Parche pirata',      '#1C130D', 22, 3),
  p('pecas-graciosas',  'accesorio', 'pecas',     'Pecas',              '#B5651D', 12, 1),
  p('antifaz-heroe',    'accesorio', 'antifaz',   'Antifaz de héroe',   '#C4452D', 45, 5),
  p('aretes-dorados',   'accesorio', 'aretes',    'Aretes dorados',     '#FFC93C', 28, 3),
  p('collar-gema',      'accesorio', 'collar',    'Collar con gema',    '#FFC93C', 50, 6),

  // ---------- Perfil (apariencia base) ----------
  p('perfil-7',  'perfil', null, 'Zoe',   '#8D5524', 10, 1, { variante: 'p7' }),
  p('perfil-8',  'perfil', null, 'Kai',   '#C68642', 10, 1, { variante: 'p8' }),
  p('perfil-9',  'perfil', null, 'Luna',  '#FFD9A8', 10, 1, { variante: 'p9' }),
  p('perfil-10', 'perfil', null, 'Max',   '#A66A3F', 10, 1, { variante: 'p10' }),
  p('perfil-11', 'perfil', null, 'Nia',   '#E8B88D', 10, 1, { variante: 'p11' }),
  p('perfil-12', 'perfil', null, 'Rex',   '#F8C89D', 15, 2, { variante: 'p12' }),

  // ---------- Expresiones (categoría avatar) ----------
  ...[
    ['avatar-guino',     'wink',  'Guiño',        25, 2],
    ['avatar-risa',      'laugh', 'Carcajada',    30, 3],
    ['avatar-canchero',  'cool',  'Cara de genio',35, 4],
    ['avatar-dormido',   'sleepy','Con sueño',    20, 2],
    ['avatar-enojado',   'angry', 'Enojado',      25, 3],
    ['avatar-enamorado', 'love',  'Enamorado',    45, 6]
  ].map(([id, expr, nombre, precio, nivel]) =>
    p(id, 'avatar', null, nombre, '#FFD9A8', precio, nivel, { tipo: 'svg', dicebearOptions: { facialExpression: expr } })),

  // ---------- Fondos de tarjeta ----------
  p('fondo-cielo',    'fondo', null, 'Cielo despejado', '#87CEEB', 18, 2, { gradiente: 'linear-gradient(180deg, #87CEEB, #E6F6FF)' }),
  p('fondo-espacio',  'fondo', null, 'Espacio profundo','#0B1F33', 50, 6, { gradiente: 'radial-gradient(circle at 30% 30%, #5B3A8C, #0B1F33 70%)' }),
  p('fondo-bosque',   'fondo', null, 'Bosque',          '#3E8E74', 22, 3, { gradiente: 'linear-gradient(160deg, #A8D5A2, #3E8E74)' }),
  p('fondo-playa',    'fondo', null, 'Playa',           '#F7DE96', 28, 4, { gradiente: 'linear-gradient(180deg, #87CEEB 0 55%, #F7DE96 55%)' }),
  p('fondo-rosa',     'fondo', null, 'Algodón de azúcar','#F28BB0', 20, 2, { gradiente: 'linear-gradient(135deg, #F8C8DC, #C9B6F2)' }),
  p('fondo-puntos',   'fondo', null, 'Puntos de cómic', '#FFC93C', 35, 5, { gradiente: 'radial-gradient(circle, #E8742A 2px, #FFC93C 2.5px) 0 0 / 14px 14px' }),
  p('fondo-rayos',    'fondo', null, '¡Pum!',           '#E8742A', 60, 8, { gradiente: 'repeating-conic-gradient(#FFC93C 0 10deg, #E8742A 10deg 20deg)' })
];

module.exports = { PRENDAS_NUEVAS };

if (require.main === module) {
  (async () => {
    const aplicar = process.argv.includes('--apply');
    const { db } = require('./config/firebase-admin');
    const existentes = new Set((await db.collection('prendas').get()).docs.map(d => d.id));
    const nuevas = PRENDAS_NUEVAS.filter(x => !existentes.has(x.id));

    console.log(`Catálogo actual: ${existentes.size} prendas`);
    console.log(`Prendas nuevas a crear: ${nuevas.length} de ${PRENDAS_NUEVAS.length} (el resto ya existe)`);
    if (!aplicar) {
      nuevas.forEach(x => console.log(`  [DRY-RUN] ${x.categoria.padEnd(9)} ${x.id}`));
      console.log('\nNo se escribió nada. Usa --apply para crearlas.');
      return;
    }

    const batch = db.batch();
    nuevas.forEach(({ id, ...datos }) => {
      // No se guardan los null (Firestore los acepta, pero así el catálogo queda limpio)
      Object.keys(datos).forEach(k => datos[k] == null && delete datos[k]);
      batch.set(db.collection('prendas').doc(id), datos);
    });
    await batch.commit();
    console.log(`✅ Creadas ${nuevas.length} prendas.`);
  })().catch(e => { console.error(e); process.exit(1); });
}
