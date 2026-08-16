const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { validarRespuesta, esTipoSeleccion } = require('../services/validacion');
const { instanciarEjercicio } = require('../services/generador');
const { evaluarRecompensas } = require('../services/recompensas');
const gamificacion = require('../services/gamificacion');
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
    const instanciados = ejercicios.map(ej =>
      instanciarEjercicio(ej, req.user.uid, null)
    );
    const publicos = instanciados.map(ejercicio => {
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

    const ejercicio = instanciarEjercicio({ id: snapshot.id, ...snapshot.data() }, req.user.uid, null);
    if (req.user?.rol === 'docente') {
      return res.json(ejercicio);
    }

    const { respuestaCorrecta, ...pub } = ejercicio;
    return res.json(pub);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo cargar el ejercicio' });
  }
});

// POST /api/ejercicios  (docente crea ejercicio)
router.post('/', requireRole('docente'), async (req, res) => {
  try {
    const { materia, tema, tipo, enunciado, respuestaCorrecta, opciones, plantilla, grafica, pistaError, metodologia } = req.body;
    if (!materia || !enunciado) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (materia, enunciado)' });
    }

    const tipoFinal = tipo || 'texto';
    const esSeleccion = esTipoSeleccion(tipoFinal);

    // Las plantillas dinámicas calculan la respuesta al instanciar: no la exigen aquí
    if (!esSeleccion && !plantilla && respuestaCorrecta === undefined) {
      return res.status(400).json({ error: 'Falta la respuesta correcta' });
    }

    if (esSeleccion && !Array.isArray(opciones)) {
      return res.status(400).json({ error: 'Los ejercicios de selección requieren opciones' });
    }

    if (esSeleccion) {
      const validas = opciones.filter(o => o && o.clave && o.texto);
      const claves = new Set(validas.map(o => String(o.clave)));
      if (claves.size < 2) {
        return res.status(400).json({ error: 'Agrega al menos 2 opciones con texto (clave única)' });
      }
      const tipoMultiple = ['multiple', 'seleccion_multiple', 'checkboxes'].includes(tipoFinal);
      const correctasArr = Array.isArray(respuestaCorrecta) ? respuestaCorrecta : [respuestaCorrecta];
      const correctasLimpias = correctasArr
        .filter(c => c !== undefined && c !== '')
        .map(c => String(c))
        .filter(c => claves.has(c));
      if (correctasLimpias.length === 0) {
        return res.status(400).json({ error: 'Indica cuál(es) opción(es) es/son la(s) correcta(s)' });
      }
      if (!tipoMultiple && correctasLimpias.length > 1) {
        return res.status(400).json({ error: 'Selección única: solo una opción puede ser la correcta' });
      }
    }

    const ref = db.collection('ejercicios').doc();
    const payload = {
      materia,
      tema: tema || 'General',
      tipo: tipoFinal,
      enunciado,
      respuestaCorrecta,
      pistaError: pistaError || 'Vuelve a revisar el procedimiento paso a paso.',
      metodologia: metodologia || 'Estándar / Directo'
    };
    if (esSeleccion) payload.opciones = opciones.map(o => ({ clave: o.clave, texto: o.texto }));
    if (plantilla) payload.plantilla = plantilla;
    if (grafica) payload.grafica = grafica;

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
    const { respuestaCorrecta, pistaError, opciones, tipo, enunciado, plantilla } = req.body;
    const patch = {};
    if (respuestaCorrecta !== undefined) patch.respuestaCorrecta = respuestaCorrecta;
    if (pistaError !== undefined) patch.pistaError = pistaError;
    if (opciones !== undefined) patch.opciones = opciones;
    if (tipo !== undefined) patch.tipo = tipo;
    if (enunciado !== undefined) patch.enunciado = enunciado;
    if (plantilla !== undefined) patch.plantilla = plantilla;

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

    const ejercicio = instanciarEjercicio(
      { id: ejercicioSnap.id, ...ejercicioSnap.data() },
      req.user.uid,
      tareaId || null
    );
    const resultado = validarRespuesta(ejercicio, respuesta);

    const logroRef = db.collection('logros').doc(req.user.uid);
    const logroSnap = await logroRef.get();
    const defaultLogro = gamificacion.defaultsLogro(req.user.uid);
    const logro = logroSnap.exists
      ? { ...defaultLogro, ...logroSnap.data(),
          equipo: { ...defaultLogro.equipo, ...(logroSnap.data().equipo || {}) } }
      : defaultLogro;

    // Clave compuesta: tareaId_ejercicioId — desvincula progreso entre tareas que comparten ejercicios
    const claveCompletado = `${tareaId || 'libre'}_${ejercicio.id}`;
    const yaCompletado = (logro.ejerciciosCompletados || []).includes(claveCompletado);

    if (yaCompletado) {
      return res.json({
        ...resultado,
        yaCompletado: true,
        mensaje: 'Este ejercicio ya estaba resuelto.',
        xpGanada: 0,
        naranjasGanadas: 0,
        nuevasPrendas: []
      });
    }

    // 1) Registrar intento en el historial (independiente del XP)
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

    // 2) Marcar ejercicio completado (solo si es correcto)
    if (resultado.correcto) {
      logro.ejerciciosCompletados = [...(logro.ejerciciosCompletados || []), claveCompletado];
    }

    await logroRef.set(logro);

    // 3) Otorgar XP / Naranjas / Racha / Nivel (evento de ejercicio)
    const recompensa = await evaluarRecompensas(req.user.uid, ejercicio.materia, resultado);

    // 4) Si completó una tarea → +100 XP (lección / tutoría completada)
    let leccionRes = null;
    if (resultado.correcto && tareaId) {
      const tareaDoc = await db.collection('tareas').doc(tareaId).get();
      if (tareaDoc.exists) {
        const ejSnap = await db.collection('tareas').doc(tareaId)
          .collection('ejercicios').get();
        const ejIds = ejSnap.docs.map((d) => d.data().ejercicioId);
        const todoOK = ejIds.length > 0 && ejIds.every((eid) =>
          (logro.ejerciciosCompletados || []).includes(`${tareaId}_${eid}`)
        );
        if (todoOK) {
          leccionRes = await gamificacion.completarTarea(req.user.uid, tareaId);
        }
      }
    }

    const payload = {
      ...resultado,
      xpGanada: recompensa.xpGanada,
      rachaBonus: recompensa.rachaBonus,
      naranjasGanadas: recompensa.naranjasGanadas,
      nuevoNivel: recompensa.nuevoNivel,
      nivelAnterior: recompensa.nivelAnterior,
      subioNivel: recompensa.subioNivel,
      rango: recompensa.rango,
      racha: recompensa.racha,
      nuevasPrendas: recompensa.nuevasPrendas
    };

    if (leccionRes && leccionRes.xpGanada) {
      payload.leccionCumplida = true;
      payload.xpGanada += leccionRes.xpGanada;
      payload.naranjasGanadas += leccionRes.naranjasGanadas;
      payload.nuevasPrendas = [...(payload.nuevasPrendas || []), ...(leccionRes.nuevasPrendas || [])];
    }

    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo validar la respuesta' });
  }
});

module.exports = router;