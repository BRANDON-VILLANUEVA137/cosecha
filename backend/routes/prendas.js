const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/prendas?categoria=torso
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = db.collection('prendas');

    if (categoria) {
      query = query.where('categoria', '==', categoria);
    }

    const snapshot = await query.get();
    const prendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(prendas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener las prendas' });
  }
});

// GET /api/prendas/:id
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await db.collection('prendas').doc(req.params.id).get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Prenda no encontrada' });

    return res.json({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo cargar la prenda' });
  }
});

module.exports = router;