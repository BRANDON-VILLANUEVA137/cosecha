import { state } from '../state.js';

// --- IMPORTAR API y Personaje ---
const API = window.API;
const Personaje = window.Personaje;

export const ViewRenderers = {
  renderNav(currentRole, currentModule) {
    // Si no se pasan argumentos, usamos el estado en vivo:
    // los llamadores (`hideLoginScreen`, `enterRole`, `goModule`) invocan
    // `window.App.renderNav()` sin parámetros, así que sin esto las pestañas
    // siempre se renderizaban como las de estudiante.
    currentRole = currentRole ?? state.currentRole;
    currentModule = currentModule ?? state.currentModule;
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
        <button data-mod="${t.id}" class="${currentModule === t.id ? 'active' : ''}" onclick="window.App.goModule('${t.id}')">
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
      let catalogo = (typeof Personaje !== 'undefined' && Personaje.PERSONAJES) || [];
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
                  <button class="ghost" onclick="window.App.editarEstudianteForm('${e.id}')">✏️ Editar</button>
                  <button class="ghost" onclick="window.App.eliminarEstudianteGestion('${e.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
                </td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="5" style="padding:20px; text-align:center;">No hay estudiantes registrados</td></tr>';

      // Estado del formulario
      const editando = appInstance.estudianteEditando;
      const formVisible = appInstance.estudianteFormVisible || !!editando;

      // Personaje seleccionado
      const avatarSel = appInstance.avatarSeleccionado || (editando && editando.personaje ? editando.personaje.id : '');
      const catalogoAvatars = appInstance.personajesCatalogo || Personaje.PERSONAJES;
      const avatarSelObj = catalogoAvatars.find(p => p.id === avatarSel) || null;
      const avatarPickerHtml = `
        <div style="margin-top:12px;">
          <label style="font-weight:600; display:block; margin-bottom:6px;">👤 Personaje / Avatar del estudiante</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:stretch;">
            <div onclick="window.App.seleccionarAvatar('')" style="cursor:pointer; padding:6px; border:2px solid ${avatarSel === '' ? 'var(--acento)' : 'var(--borde)'}; border-radius:10px; text-align:center; width:76px; background:#fff;">
              <div style="font-size:30px; line-height:56px;">🎲</div>
              <div style="font-size:10px; margin-top:2px;">Aleatorio</div>
            </div>
            ${catalogoAvatars.map(p => {
              const esSel = avatarSel === p.id;
              return `<div onclick="window.App.seleccionarAvatar('${p.id}')" style="cursor:pointer; padding:6px; border:2px solid ${esSel ? 'var(--acento)' : 'var(--borde)'}; border-radius:10px; text-align:center; width:76px; background:#fff;" title="${p.nombre} (${p.genero})">
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
            <button class="primary" onclick="window.App.guardarEstudiante()">${editando ? '💾 Guardar Cambios' : '✅ Registrar Estudiante'}</button>
            <button class="ghost" onclick="window.App.cancelarEdicionEstudiante()">Cancelar</button>
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
          <button class="primary" onclick="window.App.mostrarFormEstudiante()">➕ Registrar Estudiante</button>
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

  async renderModuloEstudiante(materia) {
    const [tareas, logro] = await Promise.all([
      API.getTareas(),
      API.getLogros()
    ]);
    const esMat = materia === 'matematicas';
    const aciertos = esMat ? logro.aciertosMatematicas : logro.aciertosIngles;

    // Filtrar tareas por materia y que estén publicadas
    const tareasFiltradas = Array.isArray(tareas) ? tareas.filter(t => t.materia === materia && t.estado === 'publicada') : [];
    
    // Obtener ejercicios de la materia para mostrarlos en las tareas
    const ejercicios = await API.getEjercicios(materia);
    const ejerciciosMap = new Map((Array.isArray(ejercicios) ? ejercicios : []).map(e => [e.id, e]));
    
    // Para cada tarea, cargar sus ejercicios completos
    const tareasAsignadas = await Promise.all(
      tareasFiltradas.map(async (tarea) => {
        const tareaConEjercicios = await API.getTarea(tarea.id);
        return {
          ...tareaConEjercicios,
          ejercicios: tareaConEjercicios.ejercicios || []
        };
      })
    );

    if (this.currentTaskView) {
      const ejerciciosTask = this.currentTaskExercises || [];
      const tareaActualId = this.currentTaskView.id || 'libre';
      const tareas = ejerciciosTask.map(e => {
        // Clave compuesta: tareaId_ejercicioId — desvincula el progreso entre tareas que comparten ejercicios
        const claveProgreso = `${tareaActualId}_${e.id}`;
        const intentos = this.intentosPorEjercicio[claveProgreso] || 0;
        const yaRespondido = this.completedExerciseIds?.includes(claveProgreso);
        return `
        <div class="task-card">
          <span class="tag ${esMat ? 'mat' : 'ing'}">${e.tema}</span>
          <div class="enun">${this.formatMathText(e.enunciado)}</div>
          ${yaRespondido ? `
            <div class="feedback ok">✅ Resuelto correctamente</div>
            <div class="attempts">Intentos: ${intentos}</div>
          ` : `
            ${this.renderControlesRespuesta(e, materia, this)}
            <div class="attempts">Intentos: ${intentos}</div>
          `}
          <div id="fb_${e.id}"></div>
        </div>`;
      }).join('') || '<p class="empty">No hay ejercicios en esta tarea todavía.</p>';

      return `
        <div class="card">
          <div class="module-header">
            <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '📘' : '🌈'}</div>
            <div>
              <h2>${this.currentTaskView.titulo}</h2>
              <p>${this.currentTaskView.descripcion}</p>
            </div>
          </div>
          <div class="task-nav-row">
            <button class="ghost" onclick="App.closeTaskView()">← Volver a tareas</button>
            <button class="primary" onclick="App.finishTask()">Finalizar tarea</button>
          </div>
          <div class="hint-preview">Metodología: ${this.currentTaskView.metodologia || 'Estándar / Directo'}</div>
          ${tareas}
        </div>`;
    }

    const taskCards = tareasAsignadas.map(task => {
      const completed = this.completedTaskIds.includes(task.id);
      const status = completed ? 'Completada' : task.estado;
      const buttonLabel = completed ? 'Revisar tarea' : 'Comenzar tarea';
      return `
      <div class="task-card task-module-card">
        <div class="task-module-head">
          <div>
            <span class="tag ${esMat ? 'mat' : 'ing'}">Tutor</span>
            <h3>${task.titulo}</h3>
          </div>
          <span class="task-status">${status}</span>
        </div>
        <p>${task.descripcion}</p>
        <div class="task-meta">${task.ejercicios.length} ejercicios · ${task.metodologia}${task.ejercicios[0]?.tema ? ` · ${task.ejercicios[0].tema}` : ''}</div>
        <button class="${completed ? 'ghost' : 'primary'}" onclick="App.startTask('${task.id}')">${buttonLabel}</button>
      </div>`;
    }).join('');

    const graficacion = esMat ? `
      <div class="card">
        <div class="module-header">
          <div class="badge mat">📐</div>
          <div>
            <h2>Graficar fracciones</h2>
            <p>Explora fracciones propias e impropias con rectángulos y círculos.</p>
          </div>
        </div>
        <div class="graph-controls">
          <select id="fractionGraphType">
            <option value="rectangulo">Rectángulos</option>
            <option value="circulo">Círculos</option>
          </select>
          <div class="graph-pills">
            <button class="ghost" data-frac-demo="2/5">2/5</button>
            <button class="ghost" data-frac-demo="21/8">21/8</button>
            <button class="ghost" data-frac-demo="16/9">16/9</button>
            <button class="ghost" data-frac-demo="10/7">10/7</button>
          </div>
        </div>
        <div id="fractionGraphicArea"></div>
      </div>` : '';

    return `
      <div class="card">
        <div class="module-header">
          <div class="badge ${esMat ? 'mat' : 'ing'}">${esMat ? '🍊' : '🌴'}</div>
          <div>
            <h2>${esMat ? 'Matemáticas' : 'Inglés'}</h2>
            <p>${esMat ? 'Fracciones: suma y multiplicación' : 'Verbo to be y pronombres'}</p>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat"><b>Nv ${logro.nivel || 1}</b><span>NIVEL</span></div>
          <div class="stat"><b>${logro.xp || 0}</b><span>XP</span></div>
          <div class="stat"><b>${logro.naranjas || 0}</b><span>NARANJAS 🍊</span></div>
          <div class="stat"><b>${logro.racha?.dias || 0}</b><span>RACHA 🔥</span></div>
        </div>
      </div>
      ${taskCards}
      ${graficacion}
    `;
  },

};


