const path = require('path');
const fs = require('fs');
const { db } = require('./config/firebase-admin');

function normalizeCollectionData(source, collectionName) {
  if (!source) return [];

  if (Array.isArray(source)) {
    return source.map(item => ({
      id: item.id || null,
      data: item
    }));
  }

  if (source && typeof source === 'object') {
    return Object.entries(source).map(([id, value]) => ({
      id,
      data: value && typeof value === 'object' ? value : { value }
    }));
  }

  return [];
}

async function seedCollection(collectionName, source) {
  const items = normalizeCollectionData(source, collectionName);
  if (!items.length) {
    console.log(`ℹ️ No se encontraron datos para ${collectionName}.`);
    return;
  }

  console.log(`📦 Cargando ${items.length} documentos en ${collectionName}...`);

  for (const item of items) {
    const docId = item.id || item.data?.id;
    const docRef = docId
      ? db.collection(collectionName).doc(docId)
      : db.collection(collectionName).doc();

    const payload = item.data && typeof item.data === 'object'
      ? { ...item.data }
      : item.data;

    if (payload && typeof payload === 'object' && 'id' in payload) {
      delete payload.id;
    }

    await docRef.set(payload, { merge: true });
  }

  console.log(`✅ ${collectionName} cargados correctamente.`);
}

/**
 * Siembra la colección "tareas" y su subcolección "ejercicios".
 * Se eliminan primero los vínculos previos de cada tarea para que el
 * proceso sea idempotente (no duplica ejercicios al re-ejecutar).
 */
async function seedTareas(tareasRaw) {
  const tareas = Object.entries(tareasRaw || {});
  if (!tareas.length) {
    console.log('ℹ️ No se encontraron datos para tareas.');
    return;
  }

  console.log(`📦 Cargando ${tareas.length} documentos en tareas...`);

  for (const [id, tarea] of tareas) {
    const { ejercicios = [], id: _idOmitido, ...tareaDoc } = tarea || {};

    // Normalizar fechas a Date (Firestore) para mantener el mismo tipo de dato
    // que registra el endpoint POST /api/tareas (new Date()).
    ['fechaCreacion', 'fechaActualizacion'].forEach((campo) => {
      if (typeof tareaDoc[campo] === 'string' && !isNaN(Date.parse(tareaDoc[campo]))) {
        tareaDoc[campo] = new Date(tareaDoc[campo]);
      } else if (!(tareaDoc[campo] instanceof Date)) {
        tareaDoc[campo] = new Date();
      }
    });

    const ejerciciosRef = db.collection('tareas').doc(id).collection('ejercicios');
    const previos = await ejerciciosRef.get();
    const batch = db.batch();
    previos.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection('tareas').doc(id).set(tareaDoc, { merge: true });

    for (const ej of ejercicios) {
      const fechaAgregado = ej.fechaAgregado && !isNaN(Date.parse(ej.fechaAgregado))
        ? new Date(ej.fechaAgregado)
        : new Date();
      await ejerciciosRef.doc().set({
        ejercicioId: ej.ejercicioId,
        orden: ej.orden || 1,
        fechaAgregado
      });
    }

    console.log(`✅ tarea ${id} → ${ejercicios.length} ejercicio(s)`);
  }

  console.log('✅ tareas cargadas correctamente.');
}

async function seedDatabase() {
  console.log('🌱 Iniciando migración de db.json a Firestore...');

  const dbJsonPath = path.join(__dirname, 'data', 'db.json');

  if (!fs.existsSync(dbJsonPath)) {
    console.error('❌ No se encontró el archivo db.json en backend/data/');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dbJsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  try {
    await seedCollection('usuarios', data.usuarios);
    await seedCollection('ejercicios', data.ejercicios);
    await seedCollection('prendas', data.prendas);
    await seedCollection('logros', data.logros);
    await seedTareas(data.tareas);

    console.log('🎉 ¡Sembrado completado con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al migrar datos a Firestore:', error);
    process.exit(1);
  }
}

seedDatabase();
