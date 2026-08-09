/**
 * Script para verificar usuarios en Firebase Auth
 * Uso: node backend/verify-users.js
 */

const { auth, db } = require('./config/firebase-admin');

async function verificarUsuarios() {
  console.log('🔍 Verificando usuarios en Firebase Auth...\n');

  const emails = ['docente@cosecha.com', 'estudiante@cosecha.com'];

  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email verificado: ${user.emailVerified}`);
      console.log(`   Creado: ${user.metadata.creationTime}`);
      
      // Verificar documento en Firestore
      const doc = await db.collection('usuarios').doc(user.uid).get();
      if (doc.exists) {
        console.log(`   ✅ Documento en Firestore:`, doc.data());
      } else {
        console.log(`   ⚠️  Documento NO existe en Firestore`);
      }
    } catch (error) {
      console.log(`❌ Usuario NO encontrado: ${email}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }

  // Listar todos los usuarios
  console.log('📋 Todos los usuarios en Firebase Auth:');
  try {
    const snapshot = await auth.listUsers();
    if (snapshot.users.length === 0) {
      console.log('   No hay usuarios registrados');
    } else {
      snapshot.users.forEach(user => {
        console.log(`   - ${user.email} (${user.uid})`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error al listar usuarios: ${error.message}`);
  }
}

verificarUsuarios().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});