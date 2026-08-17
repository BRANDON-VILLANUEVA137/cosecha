import { state } from '../state.js';

export const TeacherFormRenderer = {
  renderFormularioCreacion(ejercicioEditando = null) {
    const isEditing = !!ejercicioEditando;
    return `
      <div class="docente-form">
        <h3>${isEditing ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio'}</h3>
        <input type="text" id="enunciadoInput" placeholder="Enunciado" value="${ejercicioEditando?.enunciado || ''}">
        <select id="tipoInput">
          <option value="opcion_multiple" ${ejercicioEditando?.tipo === 'opcion_multiple' ? 'selected' : ''}>Opción Múltiple</option>
          <option value="texto_libre" ${ejercicioEditando?.tipo === 'texto_libre' ? 'selected' : ''}>Texto Libre</option>
          <option value="fraccion_grafica" ${ejercicioEditando?.tipo === 'fraccion_grafica' ? 'selected' : ''}>Fracción Gráfica</option>
        </select>
        <!-- Aquí iría la lógica de edición de opciones y otros campos -->
        <button class="primary" onclick="App.guardarEjercicio()">Guardar</button>
      </div>
    `;
  }
};
