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

// GET /api/analytics/estudiante/:estudianteId - Obtener analytics de un estudiante
router.get('/estudiante/:estudianteId', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { estudianteId } = req.params;
    const { materia, fechaInicio, fechaFin } = req.query;
    
    // Obtener historial de intentos del estudiante
    let query = db.collection('historial')
      .where('estudianteId', '==', estudianteId)
      .orderBy('fecha', 'desc');
    
    if (materia) {
      query = query.where('materia', '==', materia);
    }
    
    const historialSnapshot = await query.get();
    const historial = historialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar por fecha si se proporciona
    let historialFiltrado = historial;
    if (fechaInicio || fechaFin) {
      historialFiltrado = historial.filter(h => {
        const fecha = h.fecha?.toDate?.() || new Date(h.fecha);
        const inicio = fechaInicio ? new Date(fechaInicio) : new Date('2020-01-01');
        const fin = fechaFin ? new Date(fechaFin) : new Date();
        return fecha >= inicio && fecha <= fin;
      });
    }
    
    // Calcular métricas
    const totalIntentos = historialFiltrado.length;
    const intentosCorrectos = historialFiltrado.filter(h => h.correcto).length;
    const tasaAcierto = totalIntentos > 0 ? Math.round((intentosCorrectos / totalIntentos) * 100) : 0;
    
    // Agrupar por metodología
    const porMetodologia = {};
    historialFiltrado.forEach(h => {
      const metodologia = h.metodologia || 'Estándar / Directo';
      if (!porMetodologia[metodologia]) {
        porMetodologia[metodologia] = {
          total: 0,
          correctos: 0,
          pistasUsadas: 0
        };
      }
      porMetodologia[metodologia].total++;
      if (h.correcto) porMetodologia[metodologia].correctos++;
      porMetodologia[metodologia].pistasUsadas += h.pistasUsadas || 0;
    });
    
    // Calcular porcentajes por metodología
    Object.keys(porMetodologia).forEach(key => {
      const met = porMetodologia[key];
      met.porcentaje = met.total > 0 ? Math.round((met.correctos / met.total) * 100) : 0;
    });
    
    // Agrupar por tema
    const porTema = {};
    historialFiltrado.forEach(h => {
      const tema = h.tema || 'General';
      if (!porTema[tema]) {
        porTema[tema] = {
          total: 0,
          correctos: 0
        };
      }
      porTema[tema].total++;
      if (h.correcto) porTema[tema].correctos++;
    });
    
    // Calcular porcentajes por tema
    Object.keys(porTema).forEach(key => {
      const tema = porTema[key];
      tema.porcentaje = tema.total > 0 ? Math.round((tema.correctos / tema.total) * 100) : 0;
    });
    
    // Identificar metodología/tema crítico
    const metodologiaCritica = Object.entries(porMetodologia)
      .sort((a, b) => a[1].porcentaje - b[1].porcentaje)[0];
    
    const temaCritico = Object.entries(porTema)
      .sort((a, b) => a[1].porcentaje - b[1].porcentaje)[0];
    
    return res.json({
      estudianteId,
      metrics: {
        totalIntentos,
        intentosCorrectos,
        tasaAcierto,
        pistasTotales: historialFiltrado.reduce((sum, h) => sum + (h.pistasUsadas || 0), 0)
      },
      porMetodologia,
      porTema,
      criticos: {
        metodologia: metodologiaCritica ? {
          nombre: metodologiaCritica[0],
          porcentaje: metodologiaCritica[1].porcentaje
        } : null,
        tema: temaCritico ? {
          nombre: temaCritico[0],
          porcentaje: temaCritico[1].porcentaje
        } : null
      },
      historial: historialFiltrado.slice(0, 50) // Limitar a últimos 50 registros
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener el analytics del estudiante' });
  }
});

// GET /api/analytics/grupo - Obtener analytics general del grupo
router.get('/grupo', authMiddleware, requireRole('docente'), async (req, res) => {
  try {
    const { materia } = req.query;
    
    // Obtener todos los estudiantes (usuarios con rol estudiante)
    const usuariosSnapshot = await db.collection('usuarios')
      .where('rol', '==', 'estudiante')
      .get();
    
    const estudiantes = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Obtener historial de todos los estudiantes
    const historialPromises = estudiantes.map(estudiante => 
      db.collection('historial')
        .where('estudianteId', '==', estudiante.id)
        .get()
    );
    
    const historialSnapshots = await Promise.all(historialPromises);
    
    // Procesar datos por estudiante
    const analyticsPorEstudiante = estudiantes.map((estudiante, index) => {
      const historial = historialSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar por materia si se proporciona
      const historialFiltrado = materia 
        ? historial.filter(h => h.materia === materia)
        : historial;
      
      const totalIntentos = historialFiltrado.length;
      const intentosCorrectos = historialFiltrado.filter(h => h.correcto).length;
      const tasaAcierto = totalIntentos > 0 ? Math.round((intentosCorrectos / totalIntentos) * 100) : 0;
      
      return {
        estudianteId: estudiante.id,
        nombre: estudiante.nombre || estudiante.email,
        totalIntentos,
        intentosCorrectos,
        tasaAcierto,
        ultimoAcceso: historialFiltrado[0]?.fecha || null
      };
    });
    
    // Filtrar estudiantes con actividad
    const estudiantesActivos = analyticsPorEstudiante.filter(e => e.totalIntentos > 0);
    
    // Calcular métricas generales del grupo
    const promedioGrupo = estudiantesActivos.length > 0
      ? Math.round(estudiantesActivos.reduce((sum, e) => sum + e.tasaAcierto, 0) / estudiantesActivos.length)
      : 0;
    
    return res.json({
      totalEstudiantes: estudiantes.length,
      estudiantesActivos: estudiantesActivos.length,
      promedioGrupo,
      estudiantes: analyticsPorEstudiante
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener el analytics del grupo' });
  }
});

module.exports = router;
