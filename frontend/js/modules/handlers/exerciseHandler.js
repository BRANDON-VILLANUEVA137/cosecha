import { state } from '../state.js';

export const ExerciseHandler = {
  validarRespuesta(ej, respuestaUsuario) {
    if (ej.tipo === 'opcion_multiple') {
      const correcta = ej.opciones.find(o => o.correcta);
      return respuestaUsuario === correcta?.clave;
    }
    // Lógica adicional de validación...
    return false;
  },

  manejarComprobacion(e, parentApp) {
    const btn = e.target;
    const ejId = btn.dataset.check;
    const materia = btn.dataset.materia;
    // Lógica de validación previa antes de llamar a API
    console.log(`Comprobando ejercicio ${ejId} de ${materia}`);
  }
};
