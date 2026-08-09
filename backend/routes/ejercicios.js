const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { validarRespuesta } = require('../services/validacion');
const { evaluarRecompensas } = require('../services/recompensas');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/ejercicios?materia=matematicas
router.get('/', async (req, res) => {
  try {
    const { materia } = req.query;
    let query = db.collection('ejercicios');

    if (materia) {
      query = query.where('materia', '==', materia);
    }

    const snapshot = await query.get();
    const ejercicios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const publicos = ejercicios.map(ejercicio => {
      if (req.user?.rol === 'docente') {
        return ejercicio;
      }

      const { respuestaCorrecta, ...pub } = ejercicio;
      return pub;
    });

    return res.json(publicos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener los ejercicios' });
  }
});

// GET /api/ejercicios/:id
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await db.collection('ejercicios').doc(req.params.id).get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    const ejercicio = snapshot.data();
    if (req.user?.rol === 'docente') {
      return res.json({ id: snapshot.id, ...ejercicio });
    }

    const { respuestaCorrecta, ...pub } = ejercicio;
    return res.json({ id: snapshot.id, ...pub });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo cargar el ejercicio' });
  }
});

// POST /api/ejercicios  (docente crea ejercicio)
router.post('/', requireRole('docente'), async (req, res) => {
  try {
    const { materia, tema, tipo, enunciado, respuestaCorrecta, pistaError, metodologia } = req.body;
    if (!materia || !enunciado || !respuestaCorrecta) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const ref = db.collection('ejercicios').doc();
    const payload = {
      materia,
      tema: tema || 'General',
      tipo: tipo || 'texto',
      enunciado,
      respuestaCorrecta,
      pistaError: pistaError || 'Vuelve a revisar el procedimiento paso a paso.',
      metodologia: metodologia || 'Estándar / Directo'
    };

    await ref.set(payload);
    return res.status(201).json({ id: ref.id, ...payload });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo crear el ejercicio' });
  }
});

// PUT /api/ejercicios/:id  (docente edita)
router.put('/:id', requireRole('docente'), async (req, res) => {
  try {
    const { respuestaCorrecta, pistaError } = req.body;
    const patch = {};
    if (respuestaCorrecta !== undefined) patch.respuestaCorrecta = respuestaCorrecta;
    if (pistaError !== undefined) patch.pistaError = pistaError;

    const ref = db.collection('ejercicios').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    await ref.update(patch);
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar el ejercicio' });
  }
});

// DELETE /api/ejercicios/:id  (docente elimina)
router.delete('/:id', requireRole('docente'), async (req, res) => {
  try {
    const ref = db.collection('ejercicios').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }

    await ref.delete();
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo eliminar el ejercicio' });
  }
});

// POST /api/ejercicios/:id/validar  (estudiante responde)
router.post('/:id/validar', requireRole('estudiante'), async (req, res) => {
  try {
    const { respuesta, tareaId } = req.body;
    if (!respuesta) return res.status(400).json({ error: 'Respuesta vacía' });

    const ejercicioRef = db.collection('ejercicios').doc(req.params.id);
    const ejercicioSnap = await ejercicioRef.get();
    if (!ejercicioSnap.exists) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    const ejercicio = { id: ejercicioSnap.id, ...ejercicioSnap.data() };
    const resultado = validarRespuesta(ejercicio, respuesta);

    const logroRef = db.collection('logros').doc(req.user.uid);
    const logroSnap = await logroRef.get();
    const defaultLogro = {
      aciertosMatematicas: 0,
      aciertosIngles: 0,
      intentos: 0,
      desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
      equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
      historial: [],
      ejerciciosCompletados: []
    };

    const logro = logroSnap.exists ? { ...defaultLogro, ...logroSnap.data() } : defaultLogro;
    // Clave compuesta: tareaId_ejercicioId para desvincular progreso entre tareas que comparten ejercicios
    const claveCompletado = `${tareaId || 'libre'}_${ejercicio.id}`;
    const yaCompletado = (logro.ejerciciosCompletados || []).includes(claveCompletado);

    if (yaCompletado) {
      return res.json({ correcto: true, yaCompletado: true, mensaje: 'Este ejercicio ya estaba resuelto.', nuevasPrendas: [] });
    }

    logro.intentos += 1;

    if (resultado.correcto) {
      logro.ejerciciosCompletados.push(claveCompletado);
      if (ejercicio.materia === 'matematicas') logro.aciertosMatematicas += 1;
      else logro.aciertosIngles += 1;
    }

    logro.historial.push({
      ejercicioId: ejercicio.id,
      materia: ejercicio.materia,
      tareaId: tareaId || null,
      enunciado: ejercicio.enunciado,
      metodologia: ejercicio.metodologia || 'Estándar / Directo',
      tema: ejercicio.tema || 'General',
      correcto: resultado.correcto,
      respuesta,
      respuestaCorrecta: ejercicio.respuestaCorrecta,
      fecha: new Date().toISOString()
    });

    await logroRef.set(logro);

    let nuevasPrendas = [];
    if (resultado.correcto) {
      nuevasPrendas = await evaluarRecompensas(req.user.uid, ejercicio.materia);
    }

    return res.json({ ...resultado, nuevasPrendas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo validar la respuesta' });
  }
});

module.exports = router;