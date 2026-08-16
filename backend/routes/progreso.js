const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  obtenerProgreso,
  guardarProgreso,
  reconciliar
} = require('../services/sincronizacion');

router.use(authMiddleware);

// GET /api/progreso — estado central de progreso del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const progreso = await obtenerProgreso(req.user.uid);
    return res.json(progreso);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener el progreso' });
  }
});

// PUT /api/progreso — guarda/actualiza el progreso (merge no destructivo)
router.put('/', async (req, res) => {
  try {
    const { completedTaskIds, completedExerciseIds, intentosPorEjercicio } = req.body || {};

    if (completedTaskIds !== undefined && !Array.isArray(completedTaskIds)) {
      return res.status(400).json({ error: 'completedTaskIds debe ser un arreglo' });
    }
    if (completedExerciseIds !== undefined && !Array.isArray(completedExerciseIds)) {
      return res.status(400).json({ error: 'completedExerciseIds debe ser un arreglo' });
    }
    if (intentosPorEjercicio !== undefined && (typeof intentosPorEjercicio !== 'object' || Array.isArray(intentosPorEjercicio))) {
      return res.status(400).json({ error: 'intentosPorEjercicio debe ser un objeto' });
    }

    // La reconciliación server-side garantiza que ningún dispositivo
    // sobrescriba a otro: unión de completados y máximo de intentos.
    const actual = await obtenerProgreso(req.user.uid);
    const fusionado = reconciliar(
      { completedTaskIds, completedExerciseIds, intentosPorEjercicio },
      actual
    );

    const progreso = await guardarProgreso(req.user.uid, fusionado);
    return res.json(progreso);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
});

module.exports = router;