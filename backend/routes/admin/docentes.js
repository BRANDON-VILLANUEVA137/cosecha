/**
 * Rutas HTTP del CRUD de docentes (módulo admin).
 * Solo traduce HTTP ↔ servicio; la lógica vive en el servicio.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const docentesService = require('../../services/admin/docentes.service');

router.use(authMiddleware, requireRole('admin'));

/* GET /api/admin/docentes */
router.get('/', async (req, res) => {
  try {
    return res.json(await docentesService.listarDocentes());
  } catch (error) {
    console.error('Error listando docentes:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los docentes' });
  }
});

/* GET /api/admin/docentes/:id */
router.get('/:id', async (req, res) => {
  try {
    const docente = await docentesService.obtenerDocente(req.params.id);
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
    return res.json(docente);
  } catch (error) {
    console.error('Error obteniendo docente:', error);
    return res.status(500).json({ error: 'No se pudo obtener el docente' });
  }
});

/* POST /api/admin/docentes */
router.post('/', async (req, res) => {
  const validacion = docentesService.validarDocente(req.body || {}, true);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const docente = await docentesService.crearDocente(req.body);
    return res.status(201).json(docente);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error creando docente:', error);
    return res.status(500).json({ error: 'No se pudo crear el docente' });
  }
});

/* PUT /api/admin/docentes/:id */
router.put('/:id', async (req, res) => {
  const validacion = docentesService.validarDocente(req.body || {}, false);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const docente = await docentesService.actualizarDocente(req.params.id, req.body || {});
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
    return res.json({ ok: true, ...docente });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error actualizando docente:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el docente' });
  }
});

/* DELETE /api/admin/docentes/:id */
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await docentesService.eliminarDocente(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Docente no encontrado' });
    return res.json({ ok: true, eliminado: true });
  } catch (error) {
    if (error.code === 'TIENE_CURSOS') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error eliminando docente:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el docente' });
  }
});

module.exports = router;
