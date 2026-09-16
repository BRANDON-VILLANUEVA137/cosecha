/**
 * ============================================================
 * SEED — USUARIO ADMINISTRADOR
 * ============================================================
 * Crea (o actualiza) el usuario admin inicial para poder usar
 * el módulo de administración:
 *
 *   node seed-admin.js
 *
 * Credenciales por defecto (sobrescribibles con variables de
 * entorno ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NOMBRE):
 *   admin@cosecha.com / admin123
 * ============================================================
 */

const { auth, db } = require('./config/firebase-admin');

const email = process.env.ADMIN_EMAIL || 'admin@cosecha.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const nombre = process.env.ADMIN_NOMBRE || 'Administrador Cosecha';

(async () => {
  try {
    console.log(`🔍 Buscando usuario admin existente (${email})...`);
    let uid = null;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      console.log('ℹ️  El usuario ya existe en Auth; se actualizará su rol a admin.');
    } catch {
      console.log('➕ Creando usuario en Firebase Auth...');
      const userRecord = await auth.createUser({ email, password, emailVerified: true, displayName: nombre });
      uid = userRecord.uid;
    }

    console.log('📄 Creando/actualizando documento en Firestore...');
    await db.collection('usuarios').doc(uid).set(
      {
        email,
        rol: 'admin',
        nombre,
        estado: 'activo',
        createdAt: new Date()
      },
      { merge: true }
    );

    console.log('\n🎉 Usuario administrador listo!');
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password} ${password === 'admin123' ? '(cámbiala en producción)' : ''}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed-admin:', error.message);
    process.exit(1);
  }
})();
