/**
 * Rutas HTTP del CRUD de cursos (módulo admin).
 * Cada curso está vinculado a un docente (docenteId).
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');
const cursosService = require('../../services/admin/cursos.service');

router.use(authMiddleware, requireRole('admin'));

/* GET /api/admin/cursos */
router.get('/', async (req, res) => {
  try {
    return res.json(await cursosService.listarCursos());
  } catch (error) {
    console.error('Error listando cursos:', error);
    return res.status(500).json({ error: 'No se pudieron obtener los cursos' });
  }
});

/* GET /api/admin/cursos/:id */
router.get('/:id', async (req, res) => {
  try {
    const curso = await cursosService.obtenerCurso(req.params.id);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    return res.json(curso);
  } catch (error) {
    console.error('Error obteniendo curso:', error);
    return res.status(500).json({ error: 'No se pudo obtener el curso' });
  }
});

/* POST /api/admin/cursos */
router.post('/', async (req, res) => {
  const validacion = cursosService.validarCurso(req.body || {}, true);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const curso = await cursosService.crearCurso(req.body);
    return res.status(201).json(curso);
  } catch (error) {
    if (error.code === 'DOCENTE_NO_ENCONTRADO') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creando curso:', error);
    return res.status(500).json({ error: 'No se pudo crear el curso' });
  }
});

/* PUT /api/admin/cursos/:id */
router.put('/:id', async (req, res) => {
  const validacion = cursosService.validarCurso(req.body || {}, false);
  if (!validacion.ok) return res.status(400).json({ error: validacion.errores.join('. ') });

  try {
    const curso = await cursosService.actualizarCurso(req.params.id, req.body || {});
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    return res.json({ ok: true, ...curso });
  } catch (error) {
    if (error.code === 'DOCENTE_NO_ENCONTRADO') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error actualizando curso:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el curso' });
  }
});

/* DELETE /api/admin/cursos/:id */
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await cursosService.eliminarCurso(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Curso no encontrado' });
    return res.json({ ok: true, eliminado: true });
  } catch (error) {
    if (error.code === 'TIENE_ESTUDIANTES') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error eliminando curso:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el curso' });
  }
});

module.exports = router;
