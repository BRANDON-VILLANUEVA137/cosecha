/**
 * ============================================================
 * MÓDULO DE ADMINISTRACIÓN — PUNTO DE ENTRADA
 * ============================================================
 * Agrega los tres CRUD independientes (docentes, cursos,
 * estudiantes) bajo /api/admin. Cada módulo vive en su propio
 * archivo y puede reutilizarse por separado.
 *
 *   /api/admin/docentes      → ./docentes.js
 *   /api/admin/cursos        → ./cursos.js
 *   /api/admin/estudiantes   → ./estudiantes.js
 * ============================================================
 */

const express = require('express');
const router = express.Router();

router.use('/docentes', require('./docentes'));
router.use('/cursos', require('./cursos'));
router.use('/estudiantes', require('./estudiantes'));

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
