const express = require('express');
const router = express.Router();
const db = require('../db');

const ESTUDIANTE_ID = 'estudiante_demo';

// GET /api/logros
router.get('/', (req, res) => {
  const logro = db.collection('logros').doc(ESTUDIANTE_ID).get();
  res.json(logro);
});

// PUT /api/logros/equipo  (estudiante se pone/quita prenda)
router.put('/equipo', (req, res) => {
  const { categoria, prendaId } = req.body;
  if (!categoria) return res.status(400).json({ error: 'Falta categoría' });

  const logro = db.collection('logros').doc(ESTUDIANTE_ID).get();
  const desbloqueada = logro.desbloqueadas.includes(prendaId);

  if (prendaId && !desbloqueada) {
    return res.status(403).json({ error: 'Prenda no desbloqueada' });
  }

  // cabeza y accesorio pueden "quitarse" volviendo a tocar la prenda puesta
  if (logro.equipo[categoria] === prendaId && (categoria === 'cabeza' || categoria === 'accesorio')) {
    logro.equipo[categoria] = null;
  } else {
    logro.equipo[categoria] = prendaId;
  }

  db.collection('logros').doc(ESTUDIANTE_ID).set(logro);
  res.json(logro);
});

module.exports = router;