const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/prendas?categoria=torso
router.get('/', (req, res) => {
  const { categoria } = req.query;
  let prendas = db.collection('prendas').all();
  if (categoria) prendas = prendas.filter(p => p.categoria === categoria);
  res.json(prendas);
});

// GET /api/prendas/:id
router.get('/:id', (req, res) => {
  const prenda = db.collection('prendas').doc(req.params.id).get();
  if (!prenda) return res.status(404).json({ error: 'Prenda no encontrada' });
  res.json(prenda);
});

module.exports = router;