/**
 * Script para crear usuarios de prueba en Firebase Auth
 * y sus documentos correspondientes en Firestore.
 * 
 * Uso: node backend/seed-auth.js
 */

const { auth, db } = require('./config/firebase-admin');

const usuarios = [
  {
    email: 'docente@cosecha.com',
    password: 'docente123',
    uid: 'docente-001',
    rol: 'docente',
    nombre: 'Docente Prueba'
  },
  {
    email: 'estudiante@cosecha.com',
    password: 'estudiante123',
    uid: 'estudiante-001',
    rol: 'estudiante',
    nombre: 'Michelle'
  }
];

async function crearUsuario(usuario) {
  try {
    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: usuario.email,
      password: usuario.password,
      emailVerified: true,
      uid: usuario.uid
    });

    console.log(`✅ Usuario creado en Firebase Auth: ${userRecord.email} (${userRecord.uid})`);

    // Crear documento en Firestore
    await db.collection('usuarios').doc(usuario.uid).set({
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      createdAt: new Date()
    });

    console.log(`✅ Documento creado en Firestore: usuarios/${usuario.uid}`);
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      console.log(`⚠️  Usuario ${usuario.email} ya existe en Firebase Auth`);
    } else if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️  Email ${usuario.email} ya está registrado`);
    } else {
      console.error(`❌ Error al crear usuario ${usuario.email}:`, error.message);
    }
  }
}

async function main() {
  console.log('🌱 Creando usuarios de prueba en Firebase...\n');

  for (const usuario of usuarios) {
    await crearUsuario(usuario);
  }

  console.log('\n🎉 Proceso completado!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('   Docente: docente@cosecha.com / docente123');
  console.log('   Estudiante: estudiante@cosecha.com / estudiante123');
  process.exit(0);
}

main();