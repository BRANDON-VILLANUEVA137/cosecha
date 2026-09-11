const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const misiones = require('../services/misiones');

router.use(authMiddleware);

// GET /api/misiones — catálogo + progreso en vivo del estudiante
router.get('/', requireRole('estudiante'), async (req, res) => {
  try {
    const estado = await misiones.obtenerEstadoMisiones(req.user.uid);
    return res.json(estado);
  } catch (error) {
    console.error('❌ [Misiones] Error listando:', error);
    return res.status(500).json({ error: 'No se pudieron obtener las misiones' });
  }
});

// POST /api/misiones/:id/reclamar — cobrar recompensa de una misión completada
router.post('/:id/reclamar', requireRole('estudiante'), async (req, res) => {
  try {
    const result = await misiones.reclamarMision(req.user.uid, req.params.id);
    if (!result.ok) {
      const status = result.yaReclamada ? 409 : 400;
      return res.status(status).json({ error: result.mensaje, ...(result.yaReclamada ? { yaReclamada: true } : {}) });
    }
    return res.json(result);
  } catch (error) {
    console.error('❌ [Misiones] Error reclamando:', error);
    return res.status(500).json({ error: 'No se pudo reclamar la misión' });
  }
});

module.exports = router;