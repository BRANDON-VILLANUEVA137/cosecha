const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/logros
router.get('/', async (req, res) => {
  try {
    const logroRef = db.collection('logros').doc(req.user.uid);
    const logroSnap = await logroRef.get();

    if (!logroSnap.exists) {
      return res.json({
        aciertosMatematicas: 0,
        aciertosIngles: 0,
        intentos: 0,
        desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
        equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
        historial: []
      });
    }

    const logro = logroSnap.data();
    const historial = (logro.historial || []).map(({ respuestaCorrecta, ...item }) => item);
    return res.json({ ...logro, historial });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener los logros' });
  }
});

// PUT /api/logros/equipo  (estudiante se pone/quita prenda)
router.put('/equipo', async (req, res) => {
  try {
    const { categoria, prendaId } = req.body;
    if (!categoria) return res.status(400).json({ error: 'Falta categoría' });

    const logroRef = db.collection('logros').doc(req.user.uid);
    const logroSnap = await logroRef.get();
    const defaultLogro = {
      aciertosMatematicas: 0,
      aciertosIngles: 0,
      intentos: 0,
      desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
      equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
      historial: []
    };

    const logro = logroSnap.exists ? { ...defaultLogro, ...logroSnap.data() } : defaultLogro;
    const desbloqueada = (logro.desbloqueadas || []).includes(prendaId);

    if (prendaId && !desbloqueada) {
      return res.status(403).json({ error: 'Prenda no desbloqueada' });
    }

    const equipo = { ...(logro.equipo || {}) };
    if (equipo[categoria] === prendaId && (categoria === 'cabeza' || categoria === 'accesorio')) {
      equipo[categoria] = null;
    } else {
      equipo[categoria] = prendaId;
    }

    logro.equipo = equipo;
    await logroRef.set(logro);

    const historial = (logro.historial || []).map(({ respuestaCorrecta, ...item }) => item);
    return res.json({ ...logro, historial });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar el equipo' });
  }
});

module.exports = router;