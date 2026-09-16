/**
 * Rutas HTTP del CRUD de estudiantes (módulo admin).
 * Cada estudiante está vinculado a un curso (cursoId).
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const estudiantesService = require('../../services/admin/estudiantes.service');

router.use(authMiddleware, requireRole('admin'));

/* GET /api/admin/estudiantes?cursoId=... */
router.get('/', async (req, res) => {
  try {
    const { cursoId } = req.query;
    return res.json(await estudiantesService.listarEstudiantes(cursoId || null));
  } catch (error) {
    console.error('Error listando estudiantes:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los estudiantes' });
  }
});

/* GET /api/admin/estudiantes/:id */
router.get('/:id', async (req, res) => {
  try {
    const estudiante = await estudiantesService.obtenerEstudiante(req.params.id);
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
    return res.json(estudiante);
  } catch (error) {
    console.error('Error obteniendo estudiante:', error);
    return res.status(500).json({ error: 'No se pudo obtener el estudiante' });
  }
});

/* POST /api/admin/estudiantes */
router.post('/', async (req, res) => {
  const validacion = estudiantesService.validarEstudiante(req.body || {}, true);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const estudiante = await estudiantesService.crearEstudiante(req.body);
    return res.status(201).json(estudiante);
  } catch (error) {
    if (error.code === 'CURSO_NO_ENCONTRADO') return res.status(400).json({ error: error.message });
    if (error.code === 'PERSONAJE_INVALIDO') return res.status(400).json({ error: error.message });
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error creando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo crear el estudiante' });
  }
});

/* PUT /api/admin/estudiantes/:id */
router.put('/:id', async (req, res) => {
  const validacion = estudiantesService.validarEstudiante(req.body || {}, false);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const estudiante = await estudiantesService.actualizarEstudiante(req.params.id, req.body || {});
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
    return res.json({ ok: true, ...estudiante });
  } catch (error) {
    if (error.code === 'CURSO_NO_ENCONTRADO') return res.status(400).json({ error: error.message });
    if (error.code === 'PERSONAJE_INVALIDO') return res.status(400).json({ error: error.message });
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error actualizando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el estudiante' });
  }
});

/* DELETE /api/admin/estudiantes/:id?hardDelete=true */
router.delete('/:id', async (req, res) => {
  try {
    const hardDelete = req.query.hardDelete === 'true';
    const resultado = await estudiantesService.eliminarEstudiante(req.params.id, hardDelete);
    if (!resultado) return res.status(404).json({ error: 'Estudiante no encontrado' });
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el estudiante' });
  }
});

module.exports = router;
