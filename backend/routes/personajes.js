const express = require('express');
const router = express.Router();
const { PERSONAJES, urlPersonaje } = require('../services/personajes');

// GET /api/personajes - Catálogo público de personajes (para que el docente
// elija el avatar del estudiante). Incluye el seed y la URL de vista previa.
router.get('/', (req, res) => {
  const catalogo = PERSONAJES.map((p) => ({ ...p, url: urlPersonaje(p) }));
  return res.json(catalogo);
});

module.exports = router;
