const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware } = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const data = userDoc.exists ? userDoc.data() : {};
    return res.json({ uid: req.user.uid, rol: data.rol || 'estudiante' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener la sesión' });
  }
});

module.exports = router;
