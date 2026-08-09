const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/tareas - Obtener todas las tareas (docente ve todas, estudiante ve las publicadas)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('tareas').orderBy('fechaCreacion', 'desc').get();
    const tareas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Si es estudiante, filtrar solo tareas publicadas
    const tareasFiltradas = req.user?.rol === 'docente' 
      ? tareas 
      : tareas.filter(t => t.estado === 'publicada');
    
    return res.json(tareasFiltradas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudieron obtener las tareas' });
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
    
    // Si es estudiante, ocultar respuestas correctas
    const ejerciciosPublicos = req.user?.rol === 'docente'
      ? ejerciciosFiltrados
      : ejerciciosFiltrados.map(ej => {
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
    if (tareaDoc.data().docenteId !== req.user.uid) {
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
    if (tareaDoc.data().docenteId !== req.user.uid) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta tarea' });
    }
    
    await db.collection('tareas').doc(req.params.id).update({
      estado,
      fechaActualizacion: new Date()
    });
    
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
    if (tareaDoc.data().docenteId !== req.user.uid) {
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
    
    if (tareaDoc.data().docenteId !== req.user.uid) {
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
    
    if (tareaDoc.data().docenteId !== req.user.uid) {
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