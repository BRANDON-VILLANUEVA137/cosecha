const express = require('express');
const router = express.Router();
const db = require('../db');
const { validarRespuesta } = require('../services/validacion');
const { evaluarRecompensas } = require('../services/recompensas');

// GET /api/ejercicios?materia=matematicas
router.get('/', (req, res) => {
  const { materia } = req.query;
  let ejercicios = db.collection('ejercicios').all();
  if (materia) ejercicios = ejercicios.filter(e => e.materia === materia);
  // No exponer la respuesta correcta al estudiante
  const publicos = ejercicios.map(({ respuestaCorrecta, ...pub }) => pub);
  res.json(publicos);
});

// GET /api/ejercicios/:id
router.get('/:id', (req, res) => {
  const ejercicio = db.collection('ejercicios').doc(req.params.id).get();
  if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  const { respuestaCorrecta, ...pub } = ejercicio;
  res.json(pub);
});

// POST /api/ejercicios  (docente crea ejercicio)
router.post('/', (req, res) => {
  const { materia, tema, tipo, enunciado, respuestaCorrecta, pistaError } = req.body;
  if (!materia || !enunciado || !respuestaCorrecta) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const nuevo = db.collection('ejercicios').doc().set({
    materia, tema: tema || 'General', tipo: tipo || 'texto',
    enunciado, respuestaCorrecta, pistaError: pistaError || 'Vuelve a revisar el procedimiento paso a paso.'
  });
  res.status(201).json(nuevo);
});

// PUT /api/ejercicios/:id  (docente edita)
router.put('/:id', (req, res) => {
  const { respuestaCorrecta, pistaError } = req.body;
  const patch = {};
  if (respuestaCorrecta !== undefined) patch.respuestaCorrecta = respuestaCorrecta;
  if (pistaError !== undefined) patch.pistaError = pistaError;
  db.collection('ejercicios').doc(req.params.id).update(patch);
  res.json({ ok: true });
});

// POST /api/ejercicios/:id/validar  (estudiante responde)
router.post('/:id/validar', (req, res) => {
  const { respuesta } = req.body;
  if (!respuesta) return res.status(400).json({ error: 'Respuesta vacía' });

  const ejercicio = db.collection('ejercicios').doc(req.params.id).get();
  if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const resultado = validarRespuesta(ejercicio, respuesta);

  // Registrar intento en logros
  const logro = db.collection('logros').doc('estudiante_demo').get();
  logro.intentos += 1;
  if (resultado.correcto) {
    if (ejercicio.materia === 'matematicas') logro.aciertosMatematicas += 1;
    else logro.aciertosIngles += 1;
  }
  logro.historial.push({
    materia: ejercicio.materia,
    enunciado: ejercicio.enunciado,
    respuesta,
    respuestaCorrecta: ejercicio.respuestaCorrecta,
    correcto: resultado.correcto
  });
  db.collection('logros').doc('estudiante_demo').set(logro);

  // Evaluar recompensas si acertó
  let nuevasPrendas = [];
  if (resultado.correcto) {
    nuevasPrendas = evaluarRecompensas(ejercicio.materia);
  }

  res.json({ ...resultado, nuevasPrendas });
});

module.exports = router;