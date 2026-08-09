const { db } = require('./config/firebase-admin');

async function test() {
  try {
    const snapshot = await db.collection('usuarios').get();

    console.log('🔥 Conexión con Firestore exitosa');
    console.log(`👥 Usuarios encontrados: ${snapshot.size}`);

    snapshot.forEach((doc) => {
      console.log(`- UID: ${doc.id}`);
      console.log('  Datos:', doc.data());
    });
  } catch (error) {
    console.error('❌ Error conectando con Firestore:');
    console.error(error);
  }
}

test();