const express = require('express');
const router = express.Router();
const gamificacion = require('../services/gamificacion');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

/** Quita la respuestaCorrecta del historial por seguridad (nunca al cliente). */
function sanitizarLogro(logro) {
  const historial = (logro.historial || []).map(({ respuestaCorrecta, ...item }) => item);
  return { ...logro, historial };
}

// GET /api/logros — perfil / gamificación completa del estudiante
router.get('/', async (req, res) => {
  try {
    const logro = await gamificacion.getLogro(req.user.uid);
    return res.json(sanitizarLogro(logro));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener los logros' });
  }
});

// PUT /api/logros/equipo — equipar / desequipar un ítem (cabeza/accesorio toggle)
router.put('/equipo', async (req, res) => {
  try {
    const { categoria, prendaId } = req.body;
    const result = await gamificacion.equiparItem(req.user.uid, categoria, prendaId);
    if (!result.ok) return res.status(403).json({ error: result.mensaje });
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar el equipo' });
  }
});

// POST /api/logros/comprar — comprar un ítem de la tienda (verifica nivel + naranjas)
router.post('/comprar', async (req, res) => {
  try {
    const { itemId } = req.body;
    const result = await gamificacion.comprarItem(req.user.uid, itemId);
    if (!result.ok) {
      const status = result.nivelRequerido ? 403 : 400;
      const extra = result.nivelRequerido ? { nivelRequerido: result.nivelRequerido } : {};
      return res.status(status).json({ error: result.mensaje, ...extra });
    }
    return res.json({
      ok: true,
      mensaje: result.mensaje,
      naranjas: result.logro.naranjas,
      inventario: result.logro.inventario,
      prenda: result.prenda
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo comprar el ítem' });
  }
});

// POST /api/logros/completar-tarea — lección / tutoría completada (+100 XP)
router.post('/completar-tarea', async (req, res) => {
  try {
    const { tareaId } = req.body;
    const result = await gamificacion.completarTarea(req.user.uid, tareaId);
    if (!result.ok) return res.status(400).json({ error: result.mensaje });
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo registrar la lección completada' });
  }
});

module.exports = router;