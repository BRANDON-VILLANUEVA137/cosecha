const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase-admin');
const { getPersonaje } = require('../services/personajes');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol docente
router.use(authMiddleware, requireRole('docente'));

// GET /api/estudiantes - Listar estudiantes
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('usuarios')
      .where('rol', '==', 'estudiante')
      .get();

    // Cargar los personajes (avatares) de los logros para previsualizarlos
    const logrosSnap = await db.collection('logros').get();
    const logrosMap = new Map(logrosSnap.docs.map(d => [d.id, d.data().personaje || null]));

    const estudiantes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || '',
        email: data.email || '',
        estado: data.estado || 'activo',
        grado: data.grado || '',
        personaje: logrosMap.get(doc.id) || null,
        createdAt: data.createdAt || null
      };
    });

    return res.json(estudiantes);
  } catch (error) {
    console.error('Error listando estudiantes:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los estudiantes' });
  }
});

/* ============================================================
 * REGLA DE NEGOCIO — CRUD de usuarios
 * El docente solo puede CONSULTAR y EDITAR estudiantes.
 * Crear, eliminar y desactivar cuentas es exclusivo del
 * administrador (módulo /api/admin/*).
 * ============================================================ */

// POST /api/estudiantes - Crear estudiante (RESERVADO AL ADMIN)
router.post('/', (req, res) => {
  return res.status(403).json({ error: 'Solo el administrador puede crear estudiantes. Usa el panel de administración.' });
});

// PUT /api/estudiantes/:id - Editar estudiante
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Nota: `estado` se excluye a propósito — el docente NO puede
    // activar/desactivar cuentas (regla del CRUD: solo editar datos).
    const { nombre, email, password, grado, avatarId } = req.body;

    // Verificar que el estudiante existe y tiene rol estudiante
    const usuarioRef = db.collection('usuarios').doc(id);
    const usuarioSnap = await usuarioRef.get();
    if (!usuarioSnap.exists) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    if (usuarioSnap.data().rol !== 'estudiante') {
      return res.status(403).json({ error: 'Solo puedes editar cuentas de estudiantes' });
    }

    // Validar personaje si viene
    const personaje = getPersonaje(avatarId);
    if (avatarId && !personaje) {
      return res.status(400).json({ error: 'El personaje elegido no existe' });
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

    // Actualizar Firestore (sin `estado` — el docente no puede activar/desactivar)
    const firestoreUpdates = {};
    if (nombre !== undefined) firestoreUpdates.nombre = nombre;
    if (email !== undefined) firestoreUpdates.email = email;
    if (grado !== undefined) firestoreUpdates.grado = grado;

    await usuarioRef.update(firestoreUpdates);

    // Actualizar nombre/email/personaje en el logro del estudiante
    const logroRef = db.collection('logros').doc(id);
    const logroSnap = await logroRef.get();
    if (logroSnap.exists) {
      const logroUpdates = {};
      if (nombre !== undefined) logroUpdates.nombre = nombre;
      if (email !== undefined) logroUpdates.email = email;
      if (personaje) logroUpdates.personaje = personaje;
      await logroRef.update(logroUpdates);
    }

    return res.json({ ok: true, id, personaje: personaje || null });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error editando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el estudiante' });
  }
});

// DELETE /api/estudiantes/:id - Eliminar o dar de baja (RESERVADO AL ADMIN)
router.delete('/:id', (req, res) => {
  return res.status(403).json({ error: 'Solo el administrador puede eliminar o desactivar estudiantes. Usa el panel de administración.' });
});

module.exports = router;