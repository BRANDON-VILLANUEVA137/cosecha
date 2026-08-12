/**
 * CATÁLOGO DE PERSONAJES (avatares).
 *
 * El avatar se genera con la API de DiceBear (estilo `adventurer`). En ese
 * estilo solo el `seed` determina la apariencia (el parámetro `gender` es
 * ignorado), así que cada personaje es un seed curado con una vista previa.
 *
 * El docente elige visualmente el personaje de cada estudiante y ese seed
 * queda guardado en el documento `logros.personaje` del estudiante.
 */

const PERSONAJES = [
  // ---- Masculino ----
  { id: 'personaje-mateo',       nombre: 'Mateo',       genero: 'masculino', seed: 'mateo' },
  { id: 'personaje-sam',         nombre: 'Sam',         genero: 'masculino', seed: 'sam' },
  { id: 'personaje-leo',         nombre: 'Leo',         genero: 'masculino', seed: 'leo' },
  { id: 'personaje-diego',       nombre: 'Diego',       genero: 'masculino', seed: 'diego' },
  // ---- Femenino ----
  { id: 'personaje-valentina',   nombre: 'Valentina',   genero: 'femenino',  seed: 'valentina' },
  { id: 'personaje-sofia',       nombre: 'Sofía',       genero: 'femenino',  seed: 'sofia' },
  { id: 'personaje-mia',         nombre: 'Mía',         genero: 'femenino',  seed: 'mia' },
  { id: 'personaje-camila',      nombre: 'Camila',      genero: 'femenino',  seed: 'camila' }
];

/** Devuelve un personaje por su id, o null si no existe. */
function getPersonaje(id) {
  if (!id) return null;
  return PERSONAJES.find((p) => p.id === id) || null;
}

/**
 * URL de vista previa de un personaje (cara base de DiceBear sin equipo).
 * @param {object} personaje - { seed }
 */
function urlPersonaje(personaje) {
  if (!personaje || !personaje.seed) return null;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(personaje.seed)}`;
}

module.exports = { PERSONAJES, getPersonaje, urlPersonaje };
