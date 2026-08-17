export async function renderAnalyticsGrupo(data) {
    if (!data) return '<p class="empty">Error al cargar datos</p>';

    // Normalizar: el backend puede devolver { estudiantes: [...] } o directamente un array
    const estudiantes = Array.isArray(data) ? data : (data.estudiantes || []);
    const estudiantesActivos = estudiantes.filter(e => e.totalIntentos > 0);
    const promedioCalculado = estudiantesActivos.length > 0
      ? Math.round(estudiantesActivos.reduce((sum, e) => sum + (e.tasaAcierto || 0), 0) / estudiantesActivos.length)
      : 0;
    const totalEstudiantes = data.totalEstudiantes ?? estudiantes.length;
    const estudiantesActivosCount = data.estudiantesActivos ?? estudiantesActivos.length;
    const promedioGrupo = data.promedioGrupo ?? promedioCalculado;
    
    // Calcular distribución de rendimiento
    const excelente = estudiantes.filter(e => (e.tasaAcierto || 0) >= 80).length;
    const bueno = estudiantes.filter(e => (e.tasaAcierto || 0) >= 60 && (e.tasaAcierto || 0) < 80).length;
    const regular = estudiantes.filter(e => (e.tasaAcierto || 0) >= 40 && (e.tasaAcierto || 0) < 60).length;
    const bajo = estudiantes.filter(e => (e.tasaAcierto || 0) < 40).length;

    return `
      <!-- KPIs del Grupo -->
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📊</div>
          <div><h2>Dashboard Analítico - Vista General</h2><p>Métricas agregadas del grupo completo</p></div>
        </div>
        
        <div class="stat-row">
          <div class="stat"><b>${totalEstudiantes}</b><span>TOTAL ESTUDIANTES</span></div>
          <div class="stat"><b>${estudiantesActivosCount}</b><span>ESTUDIANTES ACTIVOS</span></div>
          <div class="stat"><b>${promedioGrupo}%</b><span>PROMEDIO GRUPO</span></div>
        </div>

        <!-- Distribución de Rendimiento -->
        <div style="margin-top:20px;">
          <h3>Distribución de Rendimiento</h3>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-top:10px;">
            <div style="background:#4CAF50; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${excelente}</div>
              <div style="font-size:12px;">Excelente (≥80%)</div>
            </div>
            <div style="background:#8BC34A; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${bueno}</div>
              <div style="font-size:12px;">Bueno (60-79%)</div>
            </div>
            <div style="background:#FFC107; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${regular}</div>
              <div style="font-size:12px;">Regular (40-59%)</div>
            </div>
            <div style="background:#F44336; color:white; padding:15px; border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:bold;">${bajo}</div>
              <div style="font-size:12px;">Bajo (<40%)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Estudiantes -->
      <div class="card">
        <h2>Rendimiento por Estudiante</h2>
        ${estudiantes.length === 0 ? '<p class="empty">No hay estudiantes registrados</p>' : `
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Estudiante</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Intentos</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Correctos</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Tasa Acierto</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                ${estudiantes.map(e => {
                  const tasaAcierto = e.tasaAcierto || 0;
                  const totalIntentos = e.totalIntentos || 0;
                  const intentosCorrectos = e.intentosCorrectos || 0;
                  const rendimiento = tasaAcierto >= 80 ? 'Excelente' : tasaAcierto >= 60 ? 'Bueno' : tasaAcierto >= 40 ? 'Regular' : 'Bajo';
                  const colorRendimiento = tasaAcierto >= 80 ? '#4CAF50' : tasaAcierto >= 60 ? '#8BC34A' : tasaAcierto >= 40 ? '#FFC107' : '#F44336';
                  return `
                    <tr style="border-bottom:1px solid var(--borde);">
                      <td style="padding:10px;">
                        <div style="font-weight:600;">${e.nombre || e.email || 'Sin nombre'}</div>
                        ${e.ultimoAcceso ? `<div style="font-size:11px; color:var(--texto-suave);">Último acceso: ${new Date(e.ultimoAcceso).toLocaleDateString()}</div>` : ''}
                      </td>
                      <td style="padding:10px; text-align:center;">${totalIntentos}</td>
                      <td style="padding:10px; text-align:center;">${intentosCorrectos}</td>
                      <td style="padding:10px; text-align:center; font-weight:bold;">${tasaAcierto}%</td>
                      <td style="padding:10px; text-align:center;">
                        <span style="background:${colorRendimiento}; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">${rendimiento}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
}