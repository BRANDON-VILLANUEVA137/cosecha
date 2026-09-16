/**
 * ============================================================
 * RENDER — PANEL DE ADMINISTRACIÓN (rol admin)
 * ============================================================
 * Vista del módulo admin: pestañas de Docentes, Cursos y
 * Estudiantes. Los datos vienen de la API /admin/* y los
 * eventos del handler AdminHandler (window.App.*).
 * ============================================================
 */

import { state } from '../state.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export async function renderAdmin(app) {
  // Cargar datos frescos en cada render del panel
  try {
    await app.cargarAdminDatos();
  } catch (error) {
    return `<div class="card"><p class="empty">⚠️ No se pudo cargar la administración: ${esc(error.message)}</p></div>`;
  }

  const tabs = [
    { id: 'docentes', ico: '🧑‍🏫', label: 'Docentes' },
    { id: 'cursos', ico: '📚', label: 'Cursos' },
    { id: 'estudiantes', ico: '👥', label: 'Estudiantes' },
    { id: 'administradores', ico: '🛡️', label: 'Administradores' }
  ];

  const tabsHtml = `
    <div class="card" style="margin-bottom:14px;">
      <div class="module-header">
        <div class="module-icon">🛡️</div>
        <div>
          <h2>Panel de Administración</h2>
          <p>Único punto de gestión completa de usuarios: docentes, cursos, estudiantes y administradores.</p>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${tabs.map(t => {
          const conteo = t.id === 'docentes' ? state.adminDocentes.length
            : t.id === 'cursos' ? state.adminCursos.length
            : t.id === 'estudiantes' ? state.adminEstudiantes.length
            : state.adminAdministradores.length;
          return `<button class="${state.adminTab === t.id ? 'primary' : 'ghost'}" onclick="window.App.goAdminTab('${t.id}')">
            ${t.ico} ${t.label} (${conteo})
          </button>`;
        }).join('')}
      </div>
    </div>
  `;

  if (state.adminTab === 'cursos') return tabsHtml + await renderSeccionCursos(app);
  if (state.adminTab === 'estudiantes') return tabsHtml + await renderSeccionEstudiantes(app);
  if (state.adminTab === 'administradores') return tabsHtml + renderSeccionAdministradores();
  return tabsHtml + renderSeccionDocentes();
}

/* ------------------------------------------------------------------ *
 * DOCENTES
 * ------------------------------------------------------------------ */
function renderSeccionDocentes() {
  const editando = state.adminEditandoDocente
    ? state.adminDocentes.find(d => d.id === state.adminEditandoDocente)
    : null;

  const formHtml = state.adminFormDocente ? `
    <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
      <h3>${editando ? '✏️ Editar Docente' : '➕ Nuevo Docente'}</h3>
      <div class="grid2">
        <div>
          <label>Nombre completo</label>
          <input type="text" id="admDocNombre" value="${esc(editando?.nombre || '')}" placeholder="Ej: María López">
          <label>Correo electrónico</label>
          <input type="email" id="admDocEmail" value="${esc(editando?.email || '')}" placeholder="Ej: maria@cosecha.edu">
          <label>Especialidad (opcional)</label>
          <input type="text" id="admDocEspecialidad" value="${esc(editando?.especialidad || '')}" placeholder="Ej: Matemáticas">
        </div>
        <div>
          <label>Contraseña ${editando ? '(dejar vacío para no cambiar)' : ''}</label>
          <input type="password" id="admDocPassword" placeholder="${editando ? '••••••••' : 'Mínimo 6 caracteres'}">
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="primary" onclick="window.App.guardarAdminDocente()">${editando ? '💾 Guardar Cambios' : '✅ Crear Docente'}</button>
        <button class="ghost" onclick="window.App.cancelarAdminDocente()">Cancelar</button>
      </div>
    </div>
  ` : '';

  const filas = state.adminDocentes.length > 0
    ? state.adminDocentes.map(d => `
        <tr style="border-bottom:1px solid var(--borde);">
          <td style="padding:10px; font-weight:600;">${esc(d.nombre) || 'Sin nombre'}</td>
          <td style="padding:10px;">${esc(d.email)}</td>
          <td style="padding:10px;">${esc(d.especialidad) || '—'}</td>
          <td style="padding:10px; text-align:center;">
            <span class="tag" style="background:${d.estado !== 'inactivo' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
              ${d.estado !== 'inactivo' ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="padding:10px; text-align:center; white-space:nowrap;">
            <button class="ghost" onclick="window.App.editarAdminDocenteForm('${d.id}')">✏️ Editar</button>
            <button class="ghost" onclick="window.App.eliminarAdminDocenteFila('${d.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="padding:14px;" class="empty">No hay docentes registrados</td></tr>';

  return `
    ${formHtml}
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <h3 style="margin:0;">🧑‍🏫 Docentes</h3>
        <button class="primary" onclick="window.App.nuevoAdminDocente()">➕ Nuevo Docente</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid var(--borde);">
              <th style="padding:8px; text-align:left;">Nombre</th>
              <th style="padding:8px; text-align:left;">Correo</th>
              <th style="padding:8px; text-align:left;">Especialidad</th>
              <th style="padding:8px;">Estado</th>
              <th style="padding:8px;">Acciones</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * CURSOS (cada curso vinculado a un docente)
 * ------------------------------------------------------------------ */
async function renderSeccionCursos(app) {
  const editando = state.adminEditandoCurso
    ? state.adminCursos.find(c => c.id === state.adminEditandoCurso)
    : null;

  const opcionesDocentes = state.adminDocentes.map(d => `
    <option value="${d.id}" ${editando?.docenteId === d.id ? 'selected' : ''}>
      ${esc(d.nombre)}${d.especialidad ? ' — ' + esc(d.especialidad) : ''}
    </option>`).join('');

  const formHtml = state.adminFormCurso ? `
    <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
      <h3>${editando ? '✏️ Editar Curso' : '➕ Nuevo Curso'}</h3>
      ${state.adminDocentes.length === 0 && !editando ? '<p class="empty">⚠️ Primero registra un docente para poder crear cursos.</p>' : ''}
      <div class="grid2">
        <div>
          <label>Nombre del curso</label>
          <input type="text" id="admCursoNombre" value="${esc(editando?.nombre || '')}" placeholder="Ej: 6° A — Matemáticas">
          <label>Descripción (opcional)</label>
          <input type="text" id="admCursoDesc" value="${esc(editando?.descripcion || '')}" placeholder="Ej: Grupo matutino">
        </div>
        <div>
          <label>Docente responsable</label>
          <select id="admCursoDocente">
            <option value="" ${!editando?.docenteId ? 'selected' : ''} disabled>Selecciona un docente…</option>
            ${opcionesDocentes}
          </select>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="primary" onclick="window.App.guardarAdminCurso()">${editando ? '💾 Guardar Cambios' : '✅ Crear Curso'}</button>
        <button class="ghost" onclick="window.App.cancelarAdminCurso()">Cancelar</button>
      </div>
    </div>
  ` : '';

  const filas = state.adminCursos.length > 0
    ? state.adminCursos.map(c => {
        const numEstudiantes = state.adminEstudiantes.filter(e => e.cursoId === c.id).length;
        return `
        <tr style="border-bottom:1px solid var(--borde);">
          <td style="padding:10px; font-weight:600;">${esc(c.nombre)}</td>
          <td style="padding:10px;">${esc(c.descripcion) || '—'}</td>
          <td style="padding:10px;">${c.docenteId ? esc(c.docenteNombre || 'Docente eliminado') : '—'}</td>
          <td style="padding:10px; text-align:center;">${numEstudiantes}</td>
          <td style="padding:10px; text-align:center; white-space:nowrap;">
            <button class="ghost" onclick="window.App.editarAdminCursoForm('${c.id}')">✏️ Editar</button>
            <button class="ghost" onclick="window.App.eliminarAdminCursoFila('${c.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="padding:14px;" class="empty">No hay cursos registrados</td></tr>';

  return `
    ${formHtml}
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <h3 style="margin:0;">📚 Cursos</h3>
        <button class="primary" onclick="window.App.nuevoAdminCurso()" ${state.adminDocentes.length === 0 ? 'disabled title="Registra un docente primero"' : ''}>➕ Nuevo Curso</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid var(--borde);">
              <th style="padding:8px; text-align:left;">Curso</th>
              <th style="padding:8px; text-align:left;">Descripción</th>
              <th style="padding:8px; text-align:left;">Docente</th>
              <th style="padding:8px;">Estudiantes</th>
              <th style="padding:8px;">Acciones</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * ESTUDIANTES (cada estudiante vinculado a un curso)
 * ------------------------------------------------------------------ */
function renderSeccionEstudiantes() {
  const editando = state.adminEditandoEstudiante
    ? state.adminEstudiantes.find(e => e.id === state.adminEditandoEstudiante)
    : null;

  const opcionesCursos = state.adminCursos.map(c => `
    <option value="${c.id}" ${editando?.cursoId === c.id ? 'selected' : ''}>
      ${esc(c.nombre)}${c.docenteNombre ? ' — ' + esc(c.docenteNombre) : ''}
    </option>`).join('');

  const formHtml = state.adminFormEstudiante ? `
    <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
      <h3>${editando ? '✏️ Editar Estudiante' : '➕ Nuevo Estudiante'}</h3>
      ${state.adminCursos.length === 0 && !editando ? '<p class="empty">⚠️ Primero crea un curso (con su docente) para poder inscribir estudiantes.</p>' : ''}
      <div class="grid2">
        <div>
          <label>Nombre completo</label>
          <input type="text" id="admEstNombre" value="${esc(editando?.nombre || '')}" placeholder="Ej: Michelle Torres">
          <label>Correo electrónico</label>
          <input type="email" id="admEstEmail" value="${esc(editando?.email || '')}" placeholder="Ej: michelle@cosecha.edu">
          <label>Grado / Grupo (opcional)</label>
          <input type="text" id="admEstGrado" value="${esc(editando?.grado || '')}" placeholder="Ej: 5° Primaria">
        </div>
        <div>
          <label>Contraseña ${editando ? '(dejar vacío para no cambiar)' : ''}</label>
          <input type="password" id="admEstPassword" placeholder="${editando ? '••••••••' : 'Mínimo 6 caracteres'}">
          <label>Curso</label>
          <select id="admEstCurso">
            <option value="" ${!editando?.cursoId ? 'selected' : ''} disabled>Selecciona un curso…</option>
            ${opcionesCursos}
          </select>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="primary" onclick="window.App.guardarAdminEstudiante()">${editando ? '💾 Guardar Cambios' : '✅ Crear Estudiante'}</button>
        <button class="ghost" onclick="window.App.cancelarAdminEstudiante()">Cancelar</button>
      </div>
    </div>
  ` : '';

  const filas = state.adminEstudiantes.length > 0
    ? state.adminEstudiantes.map(e => {
        const curso = state.adminCursos.find(c => c.id === e.cursoId);
        return `
        <tr style="border-bottom:1px solid var(--borde);">
          <td style="padding:10px; font-weight:600;">${esc(e.nombre) || 'Sin nombre'}</td>
          <td style="padding:10px;">${esc(e.email)}</td>
          <td style="padding:10px;">${esc(e.grado) || '—'}</td>
          <td style="padding:10px;">${curso ? esc(curso.nombre) : (e.cursoId ? '<span style="color:var(--texto-suave);">Curso eliminado</span>' : 'Sin curso')}</td>
          <td style="padding:10px; text-align:center;">
            <span class="tag" style="background:${e.estado !== 'inactivo' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
              ${e.estado !== 'inactivo' ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="padding:10px; text-align:center; white-space:nowrap;">
            <button class="ghost" onclick="window.App.editarAdminEstudianteForm('${e.id}')">✏️ Editar</button>
            <button class="ghost" onclick="window.App.eliminarAdminEstudianteFila('${e.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="padding:14px;" class="empty">No hay estudiantes registrados</td></tr>';

  return `
    ${formHtml}
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <h3 style="margin:0;">👥 Estudiantes</h3>
        <button class="primary" onclick="window.App.nuevoAdminEstudiante()" ${state.adminCursos.length === 0 ? 'disabled title="Crea un curso primero"' : ''}>➕ Nuevo Estudiante</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid var(--borde);">
              <th style="padding:8px; text-align:left;">Nombre</th>
              <th style="padding:8px; text-align:left;">Correo</th>
              <th style="padding:8px; text-align:left;">Grado</th>
              <th style="padding:8px; text-align:left;">Curso</th>
              <th style="padding:8px;">Estado</th>
              <th style="padding:8px;">Acciones</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ *
 * ADMINISTRADORES (solo el admin gestiona esta pestaña)
 * ------------------------------------------------------------------ */
function renderSeccionAdministradores() {
  const editando = state.adminEditandoAdministrador
    ? state.adminAdministradores.find(a => a.id === state.adminEditandoAdministrador)
    : null;

  const formHtml = state.adminFormAdministrador ? `
    <div class="card" style="background:var(--fondo-2); margin-bottom:14px;">
      <h3>${editando ? '✏️ Editar Administrador' : '➕ Nuevo Administrador'}</h3>
      <div class="grid2">
        <div>
          <label>Nombre completo</label>
          <input type="text" id="admAdmNombre" value="${esc(editando?.nombre || '')}" placeholder="Ej: Brandon Villanueva">
          <label>Correo electrónico</label>
          <input type="email" id="admAdmEmail" value="${esc(editando?.email || '')}" placeholder="Ej: brandon@cosecha.com">
        </div>
        <div>
          <label>Contraseña ${editando ? '(dejar vacío para no cambiar)' : ''}</label>
          <input type="password" id="admAdmPassword" placeholder="${editando ? '••••••••' : 'Mínimo 6 caracteres'}">
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="primary" onclick="window.App.guardarAdminAdministrador()">${editando ? '💾 Guardar Cambios' : '✅ Crear Administrador'}</button>
        <button class="ghost" onclick="window.App.cancelarAdminAdministrador()">Cancelar</button>
      </div>
    </div>
  ` : '';

  const filas = state.adminAdministradores.length > 0
    ? state.adminAdministradores.map(a => `
        <tr style="border-bottom:1px solid var(--borde);">
          <td style="padding:10px; font-weight:600;">${esc(a.nombre) || 'Sin nombre'}${a.id === state.authUser?.uid ? ' <span class="tag mat" style="font-size:10px;">TÚ</span>' : ''}</td>
          <td style="padding:10px;">${esc(a.email)}</td>
          <td style="padding:10px; text-align:center;">
            <span class="tag" style="background:${a.estado !== 'inactivo' ? 'var(--secundario)' : 'var(--texto-suave)'}; color:white;">
              ${a.estado !== 'inactivo' ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td style="padding:10px; text-align:center; white-space:nowrap;">
            <button class="ghost" onclick="window.App.editarAdminAdministradorForm('${a.id}')">✏️ Editar</button>
            ${a.id === state.authUser?.uid ? '' : `<button class="ghost" onclick="window.App.eliminarAdminAdministradorFila('${a.id}')" style="color:var(--error-suave);">🗑️ Eliminar</button>`}
          </td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="padding:14px;" class="empty">No hay administradores registrados</td></tr>';

  return `
    ${formHtml}
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
        <h3 style="margin:0;">🛡️ Administradores</h3>
        <button class="primary" onclick="window.App.nuevoAdminAdministrador()">➕ Nuevo Administrador</button>
      </div>
      <p style="font-size:12px; color:var(--texto-suave); margin:0 0 10px;">⚠️ No puedes eliminar ni desactivar tu propia cuenta.</p>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid var(--borde);">
              <th style="padding:8px; text-align:left;">Nombre</th>
              <th style="padding:8px; text-align:left;">Correo</th>
              <th style="padding:8px;">Estado</th>
              <th style="padding:8px;">Acciones</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}
