const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { instanciarEjercicio, generarTareaProcedural, tituloAuto } = require('../services/generador');
const { generarConGemini, iaDisponible } = require('../services/aiGenerador');
const { getLogro } = require('../services/gamificacion');
const { obtenerDocenteDeEstudiante } = require('../services/cursoEstudiantes');
const { notificarNuevaTarea } = require('../services/notificaciones');

/* Permisos: el docente gestiona sus tareas propias y las autogeneradas (origen auto/ia),
   que no tienen docenteId porque las crea el sistema a petición del estudiante. */
function puedeGestionar(tarea, uidDocente) {
  if (!tarea) return false;
  if (tarea.origen === 'auto' || tarea.origen === 'ia') return true;
  if (!tarea.docenteId) return true;
  return tarea.docenteId === uidDocente;
}

// GET /api/tareas - Obtener tareas
// Docente: ve todas sus tareas (+ autogeneradas de sus estudiantes).
// Estudiante: ve las tareas publicadas del docente de SU CURSO y sus autogeneradas.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('tareas').orderBy('fechaCreacion', 'desc').get();
    const tareas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (req.user?.rol === 'docente') {
      return res.json(tareas);
    }

    if (req.user?.rol === 'admin') {
      return res.json(tareas);
    }

    // Estudiante: la relación docente → curso → estudiante determina qué tareas ve
    let docenteDeMiCurso = null;
    try {
      docenteDeMiCurso = await obtenerDocenteDeEstudiante(req.user.uid);
    } catch (e) {
      console.error('Error resolviendo el curso del estudiante:', e);
    }

    const idsVisibles = new Set();

    // 1) Tareas publicadas del docente de su curso (nunca de otros docentes)
    if (docenteDeMiCurso) {
      tareas.forEach(t => {
        if (t.estado === 'publicada' && t.docenteId === docenteDeMiCurso) {
          idsVisibles.add(t.id);
        }
      });
    }

    // 2) Tareas autogeneradas propias (origen auto/ia)
    tareas.forEach(t => {
      if (t.estudianteId === req.user.uid && (t.origen === 'auto' || t.origen === 'ia')) {
        idsVisibles.add(t.id);
      }
    });

    // Mantener el orden cronológico original
    const tareasFiltradas = tareas.filter(t => idsVisibles.has(t.id));
    return res.json(tareasFiltradas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener las tareas' });
  }
});

// POST /api/tareas/generar - Generar tarea automática y personalizada (solo estudiante)
// Usa el generador procedimental (algoritmo) o la IA de Gemini si hay API key configurada.
router.post('/generar', authMiddleware, requireRole('estudiante'), async (req, res) => {
  try {
    const { materia, cantidad, solicitud } = req.body || {};
    const uid = req.user.uid;

    if (!['matematicas', 'ingles'].includes(materia)) {
      return res.status(400).json({ error: 'Materia no válida. Usa "matematicas" o "ingles".' });
    }
    const cant = Math.min(Math.max(Number(cantidad) || 10, 5), 15);
    const solicitudLimpia = String(solicitud || '').trim().slice(0, 300);

    let logro = null;
    try {
      logro = await getLogro(uid);
    } catch (e) {
      console.error('❌ [Tareas/generar] getLogro falló:', e && e.message);
      return res.status(500).json({ error: 'No se pudo leer tu progreso (logros). Revisa la conexión con Firestore.' });
    }

    // --- Anti-acumulación: no generar más si hay >= 5 autogeneradas pendientes ---
    // Filtramos 'estado' en Firestore (igualdad) para reducir datos en memoria. No requiere índice compuesto.
    const autoSnap = await db.collection('tareas').where('estudianteId', '==', uid).where('estado', '==', 'publicada').get();
    const autoTareas = autoSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.origen === 'auto' || t.origen === 'ia');
    const completadasSet = new Set(Array.isArray(logro.tareasCompletadas) ? logro.tareasCompletadas : []);

    // Función robusta para parsear fechas: string ISO, Date, Timestamp Firestore (.toDate), o null.
    // Si falta la fecha, se cuenta como pendiente para no desactivar el límite por error.
    const parseFecha = (fecha) => {
      if (fecha == null) return new Date();
      if (fecha instanceof Date) return fecha;
      if (typeof fecha === 'string') {
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      if (typeof fecha?.toDate === 'function') return fecha.toDate(); // Firestore Timestamp
      return new Date(); // fallback
    };

    // Límite temporal: solo tareas de los últimos LIMITE_DIAS días cuentan como pendientes.
    const LIMITE_DIAS = 30;
    const fechaLimite = new Date(Date.now() - LIMITE_DIAS * 24 * 60 * 60 * 1000);

    // Log de tareas descartadas por antigüedad (útil para validar en producción)
    const tareasDescartadas = autoTareas.filter(t => {
      const fechaTarea = parseFecha(t.fechaCreacion);
      const esAntigua = fechaTarea < fechaLimite;
      const esPendiente = !completadasSet.has(t.id) && t.estado === 'publicada';
      if (esAntigua && esPendiente) {
        console.log(`[Tareas/generar] Descartada tarea antigua ${t.id} (creada ${t.fechaCreacion})`);
      }
      return esAntigua && esPendiente;
    });

    const pendientes = autoTareas.filter(t => {
      const fechaTarea = parseFecha(t.fechaCreacion);
      const esAntigua = fechaTarea < fechaLimite;
      const esPendiente = !completadasSet.has(t.id) && t.estado === 'publicada';
      return esPendiente && !esAntigua;
    });

    if (pendientes.length >= 5) {
      return res.status(429).json({
        error: `Tienes ${pendientes.length} tareas pendientes. Completa algunas para generar más.`,
        tipo: 'limite_pendientes'
      });
    }

    // --- Generación: IA si disponible, si no algoritmo procedimental ---
    // (la IA ya devuelve ejercicios validados; el algoritmo nunca necesita validación extra)
    let ejercicios = null;
    let origenGenerado = 'auto';
    if (iaDisponible()) {
      try {
        console.log(`[GEN] ${uid} materia=${materia} req="${solicitudLimpia}" → IA`);
        ejercicios = await generarConGemini({ materia, cantidad: cant, solicitud: solicitudLimpia, tema: solicitudLimpia });
        if (ejercicios && ejercicios.length) { console.log(`[GEN] ${uid} origen=gemini tema=${solicitudLimpia || 'none'} cantidad=${ejercicios.length}`); origenGenerado = 'ia'; }
      } catch (eIA) { console.error('⚠️ [Tareas/generar] IA falló, usando algoritmo:', eIA && eIA.message); ejercicios = null; }
    }
    if (!ejercicios || !ejercicios.length) {
      const seedStr = `${uid}:${Date.now()}`;
      try {
        ejercicios = generarTareaProcedural(materia, solicitudLimpia, cant, seedStr);
      } catch (eGen) {
        console.error('❌ [Tareas/generar] generarTareaProcedural falló:', eGen && eGen.stack ? eGen.stack : eGen);
        return res.status(500).json({ error: 'No se pudieron generar ejercicios (algoritmo): ' + (eGen && eGen.message ? eGen.message : 'error interno') });
      }
    }

    if (!ejercicios || !ejercicios.length) {
      if (solicitudLimpia && solicitudLimpia.length > 0) {
        return res.status(400).json({ error: `No hay ejercicios disponibles para el tema "${solicitudLimpia}". Intente con "fracciones", "suma", "resta" o "multiplicación".` });
      }
      return res.status(500).json({ error: 'No se pudieron generar ejercicios. Intenta de nuevo.' });
    }

    // Normalizar IDs (la IA a veces no trae id propio)
    const sello = Date.now().toString(36);
    ejercicios = ejercicios.map((ej, idx) => ({
      ...ej,
      id: ej.id || `gen-${materia === 'ingles' ? 'i' : 'm'}-${sello}-${idx}-${Math.random().toString(36).slice(2, 7)}`
    }));

    // Persistir ejercicios en la colección ejercicios (GET /:id los resuelve por ahí)
    try {
      const batch = db.batch();
      for (const ej of ejercicios) {
        const { id, ...datos } = ej;
        const ahora = new Date().toISOString();
        batch.set(db.collection('ejercicios').doc(id), {
          ...datos,
          origen: datos.origen || 'ia',
          generadoPara: uid,
          fechaCreacion: datos.fechaCreacion || ahora
        });
      }
      await batch.commit();
    } catch (eBatch) {
      console.error('❌ [Tareas/generar] batch ejercicios falló:', eBatch && eBatch.stack ? eBatch.stack : eBatch);
      return res.status(500).json({ error: 'No se pudieron guardar los ejercicios: ' + (eBatch && eBatch.message ? eBatch.message : 'Firestore') });
    }

    // Crear la tarea (fechas como ISO para evitar problemas de Timestamp en Firestore)
    const tareaRef = db.collection('tareas').doc();
    const ahora = new Date().toISOString();
    const titulo = tituloAuto(materia, solicitudLimpia);
    try {
      await tareaRef.set({
        titulo,
        descripcion: solicitudLimpia ? `Solicitud: ${solicitudLimpia}` : 'Tarea generada automáticamente por el estudiante.',
        materia,
        estado: 'publicada',
        origen: origenGenerado,
        estudianteId: uid,
        docenteId: null,
        metodologia: materia === 'ingles' ? 'Opción Múltiple / Gramática' : 'Estándar / Directo',
        fechaCreacion: ahora,
        fechaActualizacion: ahora
      });
    } catch (eTarea) {
      console.error('❌ [Tareas/generar] set tarea falló:', eTarea && eTarea.stack ? eTarea.stack : eTarea);
      return res.status(500).json({ error: 'No se pudo crear la tarea: ' + (eTarea && eTarea.message ? eTarea.message : 'Firestore') });
    }

    const ejerciciosRef = db.collection('tareas').doc(tareaRef.id).collection('ejercicios');
    try {
      for (let i = 0; i < ejercicios.length; i += 1) {
        await ejerciciosRef.doc().set({
          ejercicioId: ejercicios[i].id,
          orden: i + 1,
          fechaAgregado: ahora
        });
      }
    } catch (eSub) {
      console.error('❌ [Tareas/generar] subcolección ejercicios falló:', eSub && eSub.stack ? eSub.stack : eSub);
      return res.status(500).json({ error: 'Tarea creada pero no se pudieron vincular ejercicios: ' + (eSub && eSub.message ? eSub.message : 'Firestore') });
    }

    return res.status(201).json({
      id: tareaRef.id,
      titulo,
      materia,
      origen: origenGenerado,
      cantidadEjercicios: ejercicios.length,
      mensaje: origenGenerado === 'ia' ? '✅ Tarea generada con IA' : '✅ Tarea generada automáticamente'
    });
  } catch (error) {
    console.error('❌ [Tareas/generar] Error:', error && error.stack ? error.stack : error);
    return res.status(500).json({ error: 'No se pudo generar la tarea: ' + (error && error.message ? error.message : 'error interno') });
  }
});

// GET /api/tareas/:id - Obtener una tarea con sus ejercicios
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tareaDoc = await db.collection('tareas').doc(req.params.id).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    const tarea = { id: tareaDoc.id, ...tareaDoc.data() };
    
    // Obtener ejercicios de la tarea
    const ejerciciosSnapshot = await db.collection('tareas')
      .doc(req.params.id)
      .collection('ejercicios')
      .orderBy('orden')
      .get();
    
    const ejerciciosTarea = ejerciciosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Obtener los datos completos de cada ejercicio desde la colección principal
    const ejercicios = await Promise.all(
      ejerciciosTarea.map(async (ejTarea) => {
        const ejercicioDoc = await db.collection('ejercicios').doc(ejTarea.ejercicioId).get();
        if (!ejercicioDoc.exists) {
          return null;
        }
        const ejercicioData = ejercicioDoc.data();
        return {
          id: ejTarea.ejercicioId,
          ...ejercicioData,
          orden: ejTarea.orden
        };
      })
    );
    
    // Filtrar ejercicios nulos y ordenar
    const ejerciciosFiltrados = ejercicios.filter(ej => ej !== null).sort((a, b) => (a.orden || 0) - (b.orden || 0));

    // Instanciar plantillas dinámicas (valores deterministas por usuario + tarea)
    const ejerciciosInstanciados = ejerciciosFiltrados.map(ej =>
      instanciarEjercicio(ej, req.user.uid, req.params.id)
    );

    // Si es estudiante, ocultar respuestas correctas
    const ejerciciosPublicos = req.user?.rol === 'docente'
      ? ejerciciosInstanciados
      : ejerciciosInstanciados.map(ej => {
          const { respuestaCorrecta, ...pub } = ej;
          return pub;
        });
    
    return res.json({ ...tarea, ejercicios: ejerciciosPublicos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener la tarea' });
  }
});

// POST /api/tareas - Crear una nueva tarea (solo docente)
router.post('/', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { titulo, descripcion, materia, activa } = req.body;
    
    if (!titulo || !materia) {
      return res.status(400).json({ error: 'Título y materia son requeridos' });
    }
    
    const tareaRef = db.collection('tareas').doc();
    await tareaRef.set({
      titulo,
      descripcion: descripcion || '',
      materia,
      estado: 'borrador', // Las tareas se crean como borrador
      docenteId: req.user.uid,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    });
    
    const tarea = { id: tareaRef.id, titulo, descripcion, materia, activa };
    return res.status(201).json(tarea);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo crear la tarea' });
  }
});

// PUT /api/tareas/:id - Actualizar una tarea (solo docente)
router.put('/:id', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { titulo, descripcion, materia, activa } = req.body;
    
    const tareaDoc = await db.collection('tareas').doc(req.params.id).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    // Verificar que la tarea pertenece al docente
    if (!puedeGestionar(tareaDoc.data(), req.user.uid)) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta tarea' });
    }
    
    await db.collection('tareas').doc(req.params.id).update({
      titulo: titulo || tareaDoc.data().titulo,
      descripcion: descripcion !== undefined ? descripcion : tareaDoc.data().descripcion,
      materia: materia || tareaDoc.data().materia,
      estado: tareaDoc.data().estado || 'borrador',
      fechaActualizacion: new Date()
    });
    
    return res.json({ id: req.params.id, message: 'Tarea actualizada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar la tarea' });
  }
});

// PATCH /api/tareas/:id/publicar - Publicar/despublicar una tarea (solo docente)
router.patch('/:id/publicar', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { estado } = req.body; // 'borrador' o 'publicada'
    
    if (!estado || !['borrador', 'publicada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser "borrador" o "publicada"' });
    }
    
    const tareaDoc = await db.collection('tareas').doc(req.params.id).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    // Verificar que la tarea pertenece al docente
    if (!puedeGestionar(tareaDoc.data(), req.user.uid)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }
    
    const estadoAnterior = tareaDoc.data().estado;
    
    await db.collection('tareas').doc(req.params.id).update({
      estado,
      fechaActualizacion: new Date()
    });
    
    // Buzón: al PUBLICAR por primera vez, notificar a los estudiantes de los cursos del docente.
    // Best-effort: un fallo de notificación no debe romper la publicación.
    if (estado === 'publicada' && estadoAnterior !== 'publicada') {
      try {
        const notificados = await notificarNuevaTarea(req.user.uid, { id: req.params.id, ...tareaDoc.data(), estado });
        console.log(`🔔 [Tareas] Notificación de nueva tarea enviada a ${notificados} estudiante(s).`);
      } catch (e) {
        console.error('Error notificando nueva tarea:', e);
      }
    }
    
    return res.json({ id: req.params.id, estado, message: `Tarea ${estado === 'publicada' ? 'publicada' : 'despublicada'}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo actualizar el estado de la tarea' });
  }
});

// DELETE /api/tareas/:id - Eliminar una tarea (solo docente)
router.delete('/:id', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const tareaDoc = await db.collection('tareas').doc(req.params.id).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    // Verificar que la tarea pertenece al docente
    if (!puedeGestionar(tareaDoc.data(), req.user.uid)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta tarea' });
    }
    
    // Eliminar todos los ejercicios de la tarea
    const ejerciciosSnapshot = await db.collection('tareas')
      .doc(req.params.id)
      .collection('ejercicios')
      .get();
    
    const batch = db.batch();
    ejerciciosSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Eliminar la tarea
    await db.collection('tareas').doc(req.params.id).delete();
    
    return res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo eliminar la tarea' });
  }
});

// POST /api/tareas/:id/ejercicios - Agregar ejercicio a una tarea (solo docente)
router.post('/:id/ejercicios', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { ejercicioId } = req.body;
    
    if (!ejercicioId) {
      return res.status(400).json({ error: 'ejercicioId es requerido' });
    }
    
    // Verificar que la tarea existe y pertenece al docente
    const tareaDoc = await db.collection('tareas').doc(req.params.id).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    if (!puedeGestionar(tareaDoc.data(), req.user.uid)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }
    
    // Verificar que el ejercicio existe
    const ejercicioDoc = await db.collection('ejercicios').doc(ejercicioId).get();
    
    if (!ejercicioDoc.exists) {
      return res.status(404).json({ error: 'Ejercicio no encontrado' });
    }
    
    // Obtener el último orden
    const ejerciciosSnapshot = await db.collection('tareas')
      .doc(req.params.id)
      .collection('ejercicios')
      .orderBy('orden', 'desc')
      .limit(1)
      .get();
    
    const ultimoOrden = ejerciciosSnapshot.empty ? 0 : (ejerciciosSnapshot.docs[0].data().orden || 0);
    
    // Agregar ejercicio a la tarea
    const ejercicioTareaRef = db.collection('tareas')
      .doc(req.params.id)
      .collection('ejercicios')
      .doc();
    
    await ejercicioTareaRef.set({
      ejercicioId,
      orden: ultimoOrden + 1,
      fechaAgregado: new Date()
    });
    
    return res.status(201).json({ id: ejercicioTareaRef.id, message: 'Ejercicio agregado a la tarea' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo agregar el ejercicio a la tarea' });
  }
});

// DELETE /api/tareas/:tareaId/ejercicios/:ejercicioId - Eliminar ejercicio de una tarea
router.delete('/:tareaId/ejercicios/:ejercicioId', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { tareaId, ejercicioId } = req.params;
    
    // Verificar que la tarea existe y pertenece al docente
    const tareaDoc = await db.collection('tareas').doc(tareaId).get();
    
    if (!tareaDoc.exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    if (!puedeGestionar(tareaDoc.data(), req.user.uid)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }
    
    // Buscar y eliminar el ejercicio de la tarea
    const ejerciciosSnapshot = await db.collection('tareas')
      .doc(tareaId)
      .collection('ejercicios')
      .where('ejercicioId', '==', ejercicioId)
      .get();
    
    if (ejerciciosSnapshot.empty) {
      return res.status(404).json({ error: 'Ejercicio no encontrado en la tarea' });
    }
    
    const batch = db.batch();
    ejerciciosSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    return res.json({ message: 'Ejercicio eliminado de la tarea' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo eliminar el ejercicio de la tarea' });
  }
});

module.exports = router;
