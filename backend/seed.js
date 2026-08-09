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

    console.log('🎉 ¡Sembrado completado con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al migrar datos a Firestore:', error);
    process.exit(1);
  }
}

seedDatabase();
