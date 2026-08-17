import { state } from '../state.js';

export const ViewRenderers = {
  renderNav(currentRole, currentModule) {
    const tabsEstudiante = [
      { id: 'inicio', ico: '🏠', label: 'Inicio' },
      { id: 'matematicas', ico: '🍊', label: 'Matemáticas' },
      { id: 'ingles', ico: '🌴', label: 'Inglés' },
      { id: 'album', ico: '🃏', label: 'Álbum' },
    ];
    const tabsDocente = [
      { id: 'matematicas', ico: '🍊', label: 'Matemáticas' },
      { id: 'ingles', ico: '🌴', label: 'Inglés' },
      { id: 'progreso', ico: '📊', label: 'Progreso' },
      { id: 'estudiantes', ico: '👥', label: 'Estudiantes' },
    ];
    const tabs = currentRole === 'docente' ? tabsDocente : tabsEstudiante;
    
    const navBar = document.getElementById('navBar');
    if (navBar) {
      navBar.innerHTML = tabs.map(t => `
        <button data-mod="${t.id}" class="${currentModule === t.id ? 'active' : ''}" onclick="App.goModule('${t.id}')">
          <span class="ico">${t.ico}</span> ${t.label}
        </button>`).join('');
    }
  },

  async renderGestionEstudiantes(appInstance) {
        try {
      // Cargar estudiantes y tareas para contar asignaciones
      appInstance.estudiantesGestion = await API.getEstudiantes();
      if (!Array.isArray(appInstance.estudiantesGestion)) appInstance.estudiantesGestion = [];
      const tareas = await API.getTareas();

      // Catálogo de personajes para el selector de avatar
      let catalogo = Personaje.PERSONAJES;
      try {
        const c = await API.getPersonajes();
        if (Array.isArray(c) && c.length) catalogo = c;
      } catch (e) { /* usa el catálogo local si la API no responde */ }
      appInstance.personajesCatalogo = catalogo;

      const filas = appInstance.estudiantesGestion.length > 0
        ? appInstance.estudiantesGestion.map(e => {
            const estadoActivo = e.estado !== 'inactivo';
            const tareasAsignadas = (Array.isArray(tareas) ? tareas : []).filter(t => t.estudianteId === e.id).length;
            return `
              <tr style="border-bottom:1px solid var(--borde);">
                <td style="padding:10px; font-weight:600;">${e.nombre || 'Sin nombre'}</td>
                <td style="padding:10px;">${e.email || ''}</td>
                <td style="padding:10px; text-align:center;">
                  <span class="tag" style="background:${estadoActivo ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
                    ${estadoActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style="padding:10px; text-align:center;">${tareasAsignadas}</td>
                <td style="padding:10px; text-align:center; white-space:nowrap;">
                  <button class="ghost" onclick="App.editarEstudianteForm('${e.id}')">✏️ Editar</button>
                  <button class="ghost" onclick="App.eliminarEstudianteGestion('${e.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="5" style="padding:20px; text-align:center;">No hay estudiantes registrados</td></tr>';

      // Estado del formulario
      const editando = appInstance.estudianteEditando;
      const formVisible = appInstance.estudianteFormVisible || !!editando;

      // Personaje seleccionado: prioriza la selección actual, si no la del alumno
      const avatarSel = appInstance.avatarSeleccionado || (editando && editando.personaje ? editando.personaje.id : '');
      const catalogoAvatars = appInstance.personajesCatalogo || Personaje.PERSONAJES;
      const avatarSelObj = catalogoAvatars.find(p => p.id === avatarSel) || null;
      const avatarPickerHtml = `
        <div style="margin-top:12px;">
          <label style="font-weight:600; display:block; margin-bottom:6px;">👤 Personaje / Avatar del estudiante</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:stretch;">
            <div onclick="App.seleccionarAvatar('')" style="cursor:pointer; padding:6px; border:2px solid ${avatarSel === '' ? 'var(--acento)' : 'var(--borde)'}; border-radius:10px; text-align:center; width:76px; background:#fff;">
              <div style="font-size:30px; line-height:56px;">🎲</div>
              <div style="font-size:10px; margin-top:2px;">Aleatorio</div>
            </div>
            ${catalogoAvatars.map(p => {
              const esSel = avatarSel === p.id;
              return `<div onclick="App.seleccionarAvatar('${p.id}')" style="cursor:pointer; padding:6px; border:2px solid ${esSel ? 'var(--acento)' : 'var(--borde)'}; border-radius:10px; text-align:center; width:76px; background:#fff;" title="${p.nombre} (${p.genero})">
                <img src="${Personaje.urlDePersonaje(p)}" width="56" height="56" style="border-radius:8px; display:block;">
                <div style="font-size:10px; margin-top:2px;">${p.nombre}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:10px;">
            <div style="font-weight:600; display:block; margin-bottom:4px;">Vista previa del avatar:</div>
            ${avatarSelObj
              ? `<img src="${Personaje.urlDePersonaje(avatarSelObj)}" width="92" height="92" style="border-radius:12px; border:2px solid var(--borde);" class="avatar-dicebear">`
              : '<span style="color:var(--texto-suave); font-size:12px;">Sin elegir → se generará automáticamente con el UID (apariencia al azar).</span>'}
          </div>
        </div>`;

      const formHtml = formVisible ? `
        <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
          <h3>${editando ? '✏️ Editar Estudiante' : '➕ Registrar Nuevo Estudiante'}</h3>
          <div class="grid2">
            <div>
              <label>Nombre completo</label>
              <input type="text" id="estNombre" value="${editando ? (editando.nombre || '') : ''}" placeholder="Ej: Michelle Torres">
              <label>Correo electrónico</label>
              <input type="email" id="estEmail" value="${editando ? (editando.email || '') : ''}" placeholder="Ej: michelle@cosecha.edu">
              <label>Grado / Grupo (opcional)</label>
              <input type="text" id="estGrado" value="${editando ? (editando.grado || '') : ''}" placeholder="Ej: 5° Primaria">
            </div>
            <div>
              <label>Contraseña ${editando ? '(dejar vacío para no cambiar)' : 'inicial'}</label>
              <input type="password" id="estPassword" placeholder="${editando ? '••••••••' : 'Mínimo 6 caracteres'}">
            </div>
          </div>
          ${avatarPickerHtml}
          <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="primary" onclick="App.guardarEstudiante()">${editando ? '💾 Guardar Cambios' : '✅ Registrar Estudiante'}</button>
            <button class="ghost" onclick="App.cancelarEdicionEstudiante()">Cancelar</button>
          </div>
        </div>
      ` : '';

      return `
        <div class="card" style="margin-bottom:14px;">
          <div class="module-header">
            <div class="badge" style="background:var(--acento);">👥</div>
            <div>
              <h2>Gestión de Estudiantes</h2>
              <p>Registra, edita y administra las cuentas de tus estudiantes.</p>
            </div>
          </div>
          <button class="primary" onclick="App.mostrarFormEstudiante()">➕ Registrar Estudiante</button>
        </div>
        ${formHtml}
        <div class="card">
          <h3>👩‍🎓 Lista de Estudiantes (${appInstance.estudiantesGestion.length})</h3>
          <div style="overflow-x:auto; margin-top:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:var(--fondo-2);">
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Nombre</th>
                  <th style="padding:10px; text-align:left; border-bottom:2px solid var(--borde);">Correo</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Estado</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Tareas</th>
                  <th style="padding:10px; text-align:center; border-bottom:2px solid var(--borde);">Acciones</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      console.error('Error cargando gestión de estudiantes:', e);
      return `<p class="empty">⚠️ Error al cargar estudiantes: ${e.message}</p>`;
    }
  },

  async renderDetalleTarea(appInstance) {

     
    if (!appInstance.currentTaskView) return '';
    
    const tarea = appInstance.currentTaskView;
    const ejerciciosEnTarea = appInstance.currentTaskExercises || [];
    const esMat = tarea.materia === 'matematicas';
    const estaPublicada = tarea.estado === 'publicada';
    
    // Obtener ejercicios disponibles que no están en la tarea
    const ejerciciosDisponibles = appInstance.allEjercicios.filter(ej => 
      !ejerciciosEnTarea.some(e => e.id === ej.id)
    );

    const ejerciciosHtml = ejerciciosEnTarea.map(ej => `
      <div class="ex-item">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
            <div class="ex-enun">${appInstance.formatMathText(ej.enunciado)}</div>
          </div>
          <button class="ghost" onclick="App.eliminarEjercicioDeTarea('${ej.id}')" style="color:var(--error-suave);">❌ Quitar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">No hay ejercicios en esta tarea.</p>';

    const disponiblesHtml = ejerciciosDisponibles.map(ej => `
      <div class="ex-item" style="border-style:dashed;">
        <div class="top">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">${ej.tema}</span>
            <div class="ex-enun">${appInstance.formatMathText(ej.enunciado)}</div>
          </div>
          <button class="primary" onclick="App.agregarEjercicioATarea('${ej.id}')">➕ Agregar</button>
        </div>
      </div>
    `).join('') || '<p class="empty">Todos los ejercicios están en la tarea.</p>';

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge" style="background:var(--acento);">📚</div>
          <div>
            <h2>${tarea.titulo}</h2>
            <p>${tarea.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
        <div class="task-nav-row">
          <button class="ghost" onclick="App.closeTaskView()">← Volver a tareas</button>
          <button class="ghost" onclick="App.eliminarTarea('${tarea.id}')" style="color:var(--error-suave);">🗑️ Eliminar Tarea</button>
        </div>
        <div class="task-meta">
          ${ejerciciosEnTarea.length} ejercicios · 
          <span class="tag" style="background:${estaPublicada ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
            ${estaPublicada ? 'Publicada' : 'Borrador'}
          </span>
        </div>
        <div style="margin-top:10px;">
          <button class="primary" onclick="App.publicarTarea('${tarea.id}', '${estaPublicada ? 'borrador' : 'publicada'}')">
            ${estaPublicada ? '📝 Despublicar' : '🚀 Publicar Tarea'}
          </button>
        </div>
      </div>

      <!-- Ejercicios en la tarea -->
      <div class="card">
        <h3>📋 Ejercicios de la tarea (${ejerciciosEnTarea.length})</h3>
        <div style="margin-top:10px;">${ejerciciosHtml}</div>
      </div>

      <!-- Ejercicios disponibles para agregar -->
      <div class="card">
        <h3>➕ Agregar ejercicios desde el banco</h3>
        
        <!-- Barra de búsqueda y filtros -->
        <div style="background:var(--fondo-2); padding:12px; border-radius:8px; margin-bottom:12px;">
          <input type="text" id="searchEjercicios" placeholder="🔍 Buscar por enunciado o tema..." 
                 style="width:100%; padding:8px; border:1px solid var(--borde); border-radius:4px; margin-bottom:8px;"
                 oninput="App.filtrarEjerciciosDisponibles()">
          
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="filtroTema" onchange="App.filtrarEjerciciosDisponibles()" 
                    style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
              <option value="">Todos los temas</option>
            </select>
            
            <select id="filtroMetodologia" onchange="App.filtrarEjerciciosDisponibles()" 
                    style="padding:6px; border:1px solid var(--borde); border-radius:4px; flex:1; min-width:150px;">
              <option value="">Todas las metodologías</option>
              <option value="estándar">Estándar / Directo</option>
              <option value="paso">Paso a Paso</option>
              <option value="graficación">Graficación</option>
              <option value="desafío">Desafío</option>
            </select>
          </div>
        </div>

        <p style="color:var(--texto-suave); font-size:13px; margin-bottom:8px;">
          Mostrando <b id="countDisponibles">${ejerciciosDisponibles.length}</b> ejercicios disponibles
        </p>
        
        <div id="listaEjerciciosDisponibles" style="margin-top:10px;">
          ${disponiblesHtml}
        </div>
      </div>
    `;
  }

  
};
