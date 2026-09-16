/**
 * Rutas HTTP del buzón de notificaciones (solo estudiante).
 * Solo traduce HTTP ↔ servicio; la lógica vive en el servicio.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const notificacionesService = require('../services/notificaciones');

router.use(authMiddleware, requireRole('estudiante'));

/* GET /api/notificaciones — lista + contador de no leídas.
   Aprovecha la consulta para sincronizar el catálogo de misiones
   (así las misiones nuevas aparecen al abrir el buzón). */
router.get('/', async (req, res) => {
  try {
    let creadasMisiones = 0;
    try {
      creadasMisiones = await notificacionesService.sincronizarMisiones(req.user.uid);
    } catch (e) {
      console.error('Error sincronizando misiones nuevas:', e);
    }

    const data = await notificacionesService.listarNotificaciones(req.user.uid);
    return res.json({ ...data, nuevasMisionesDetectadas: creadasMisiones });
  } catch (error) {
    console.error('Error listando notificaciones:', error);
    return res.status(500).json({ error: 'No se pudieron obtener las notificaciones' });
  }
});

/* PATCH /api/notificaciones/:id/leer */
router.patch('/:id/leer', async (req, res) => {
  try {
    const resultado = await notificacionesService.marcarLeida(req.user.uid, req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Notificación no encontrada' });
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('Error marcando notificación:', error);
    return res.status(500).json({ error: 'No se pudo marcar la notificación' });
  }
});

/* PATCH /api/notificaciones/leer-todas */
router.patch('/leer-todas', async (req, res) => {
  try {
    const resultado = await notificacionesService.marcarTodasLeidas(req.user.uid);
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('Error marcando todas las notificaciones:', error);
    return res.status(500).json({ error: 'No se pudieron marcar las notificaciones' });
  }
});

module.exports = router;
