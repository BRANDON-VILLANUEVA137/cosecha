/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — PUNTO DE ENTRADA
 * ============================================================
 * Agrega los CRUD independientes (docentes, cursos,
 * estudiantes y administradores) bajo /api/admin. Cada módulo
 * vive en su propio archivo y puede reutilizarse por separado.
 * Todo el árbol exige rol 'admin' (guarda global de abajo).
 *
 *   /api/admin/docentes         → ./docentes.js
 *   /api/admin/cursos           → ./cursos.js
 *   /api/admin/estudiantes      → ./estudiantes.js
 *   /api/admin/administradores  → ./administradores.js
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../../middleware/auth');

/* Guarda global del módulo: TODO /api/admin/* exige rol 'admin'.
 * (Los sub-routers la repiten por seguridad, ya que son reutilizables.) */
router.use(authMiddleware, requireRole('admin'));

router.use('/docentes', require('./docentes'));
router.use('/cursos', require('./cursos'));
router.use('/estudiantes', require('./estudiantes'));
router.use('/administradores', require('./administradores'));

/* GET /api/admin — resumen del módulo (recuento por entidad) */
router.get('/', async (req, res) => {
  try {
    const [docentes, cursos, estudiantes] = await Promise.all([
      require('../../services/admin/docentes.service').listarDocentes(),
      require('../../services/admin/cursos.service').listarCursos(),
      require('../../services/admin/estudiantes.service').listarEstudiantes()
    ]);
    return res.json({ docentes: docentes.length, cursos: cursos.length, estudiantes: estudiantes.length });
  } catch (error) {
    console.error('Error obteniendo resumen admin:', error);
    return res.status(500).json({ error: 'No se pudo obtener el resumen' });
  }
});

module.exports = router;
