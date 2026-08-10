const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware } = require('../middleware/auth');
const { abrirCofre } = require('../services/gamificacion');

router.use(authMiddleware);

// GET /api/cartas
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('cartas').get();
    const cartas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(cartas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener cartas' });
  }
});

// POST /api/cartas/abrir-cofre
router.post('/abrir-cofre', async (req, res) => {
  try {
    const resultado = await abrirCofre(req.user.uid);
    if (!resultado.ok) return res.status(400).json({ error: resultado.mensaje });
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: 'Error al abrir cofre' });
  }
});

module.exports = router;