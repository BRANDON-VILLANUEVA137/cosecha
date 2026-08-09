const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase-admin');
const { authMiddleware, requireRole } = require('../middleware/auth');

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