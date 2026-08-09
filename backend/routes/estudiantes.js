const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase-admin');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol docente
router.use(authMiddleware, requireRole('docente'));

// GET /api/estudiantes - Listar estudiantes
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios')
      .where('rol', '==', 'estudiante')
      .get();

    const estudiantes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || '',
        email: data.email || '',
        estado: data.estado || 'activo',
        grado: data.grado || '',
        createdAt: data.createdAt || null
      };
    });

    return res.json(estudiantes);
  } catch (error) {
    console.error('Error listando estudiantes:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los estudiantes' });
  }
});

// POST /api/estudiantes - Crear estudiante
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, grado } = req.body;

    // Validaciones
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Seguridad: forzar rol a "estudiante" — nunca usar el rol recibido del cliente
    const rol = 'estudiante';

    // Crear usuario en Firebase Auth primero (valida correo único automáticamente)
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true
    });

    try {
      // Crear documento en Firestore
      await db.collection('usuarios').doc(userRecord.uid).set({
        email,
        rol, // Forzado a estudiante — evita inyección de rol
        nombre,
        grado: grado || '',
        estado: 'activo',
        createdAt: new Date()
      });

      // Crear logro predeterminado para el nuevo estudiante
      await db.collection('logros').doc(userRecord.uid).set({
        email,
        nombre,
        aciertosMatematicas: 0,
        aciertosIngles: 0,
        intentos: 0,
        desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
        equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
        historial: [],
        ejerciciosCompletados: []
      });

      return res.status(201).json({
        id: userRecord.uid,
        nombre,
        email,
        estado: 'activo',
        grado: grado || ''
      });
    } catch (firestoreError) {
      // Si falla Firestore, eliminar el usuario de Auth para no dejar inconsistencias
      console.error('Error creando documento Firestore, revirtiendo usuario Auth:', firestoreError.message);
      await auth.deleteUser(userRecord.uid).catch(() => {});
      throw firestoreError;
    }
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error creando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo crear el estudiante' });
  }
});

// PUT /api/estudiantes/:id - Editar estudiante
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, estado, grado } = req.body;

    // Verificar que el estudiante existe y tiene rol estudiante
    const usuarioRef = db.collection('usuarios').doc(id);
    const usuarioSnap = await usuarioRef.get();
    if (!usuarioSnap.exists) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    if (usuarioSnap.data().rol !== 'estudiante') {
      return res.status(403).json({ error: 'Solo puedes editar cuentas de estudiantes' });
    }

    // Actualizar Auth si se provee contraseña o correo
    const authUpdates = {};
    if (email) authUpdates.email = email;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }
      authUpdates.password = password;
    }
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(id, authUpdates);
    }

    // Actualizar Firestore
    const firestoreUpdates = {};
    if (nombre !== undefined) firestoreUpdates.nombre = nombre;
    if (email !== undefined) firestoreUpdates.email = email;
    if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) firestoreUpdates.estado = estado;
    if (grado !== undefined) firestoreUpdates.grado = grado;

    await usuarioRef.update(firestoreUpdates);

    // Actualizar nombre/email en el logro del estudiante
    const logroRef = db.collection('logros').doc(id);
    const logroSnap = await logroRef.get();
    if (logroSnap.exists) {
      const logroUpdates = {};
      if (nombre !== undefined) logroUpdates.nombre = nombre;
      if (email !== undefined) logroUpdates.email = email;
      await logroRef.update(logroUpdates);
    }

    return res.json({ ok: true, id });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error editando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el estudiante' });
  }
});

// DELETE /api/estudiantes/:id - Eliminar o dar de baja
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    const usuarioRef = db.collection('usuarios').doc(id);
    const usuarioSnap = await usuarioRef.get();
    if (!usuarioSnap.exists) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    if (usuarioSnap.data().rol !== 'estudiante') {
      return res.status(403).json({ error: 'Solo puedes eliminar cuentas de estudiantes' });
    }

    if (hardDelete === 'true') {
      // Eliminación física: borrar Auth, Firestore y logros
      await db.collection('logros').doc(id).delete().catch(() => {});
      await usuarioRef.delete();
      await auth.deleteUser(id).catch((e) => {
        if (e.code !== 'auth/user-not-found') throw e;
      });
      return res.json({ ok: true, eliminado: true });
    }

    // Desactivación: marcar como inactivo (preserva historial)
    await usuarioRef.update({ estado: 'inactivo' });
    return res.json({ ok: true, estado: 'inactivo' });
  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el estudiante' });
  }
});

module.exports = router;