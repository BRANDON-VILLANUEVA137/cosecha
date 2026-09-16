/**
 * Rutas HTTP del CRUD de administradores (módulo admin).
 * Guardas extra: un admin no puede eliminar/desactivarse a sí mismo.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const administradoresService = require('../../services/admin/administradores.service');

router.use(authMiddleware, requireRole('admin'));

/* GET /api/admin/administradores */
router.get('/', async (req, res) => {
  try {
    return res.json(await administradoresService.listarAdministradores());
  } catch (error) {
    console.error('Error listando administradores:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los administradores' });
  }
});

/* GET /api/admin/administradores/:id */
router.get('/:id', async (req, res) => {
  try {
    const admin = await administradoresService.obtenerAdministrador(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });
    return res.json(admin);
  } catch (error) {
    console.error('Error obteniendo administrador:', error);
    return res.status(500).json({ error: 'No se pudo obtener el administrador' });
  }
});

/* POST /api/admin/administradores */
router.post('/', async (req, res) => {
  const validacion = administradoresService.validarAdministrador(req.body || {}, true);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const admin = await administradoresService.crearAdministrador(req.body);
    return res.status(201).json(admin);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error creando administrador:', error);
    return res.status(500).json({ error: 'No se pudo crear el administrador' });
  }
});

/* PUT /api/admin/administradores/:id */
router.put('/:id', async (req, res) => {
  const validacion = administradoresService.validarAdministrador(req.body || {}, false);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const admin = await administradoresService.actualizarAdministrador(req.params.id, req.body || {}, req.user.uid);
    if (!admin) return res.status(404).json({ error: 'Administrador no encontrado' });
    return res.json({ ok: true, ...admin });
  } catch (error) {
    if (error.code === 'NO_PUEDE_DESACTIVARSE') {
      return res.status(403).json({ error: error.message });
    }
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error actualizando administrador:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el administrador' });
  }
});

/* DELETE /api/admin/administradores/:id */
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await administradoresService.eliminarAdministrador(req.params.id, req.user.uid);
    if (!resultado) return res.status(404).json({ error: 'Administrador no encontrado' });
    return res.json({ ok: true, eliminado: true });
  } catch (error) {
    if (error.code === 'NO_PUEDE_ELIMINARSE') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error eliminando administrador:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el administrador' });
  }
});

module.exports = router;
