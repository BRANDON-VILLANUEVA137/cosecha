import { state } from './modules/state.js';
import { ExerciseRenderers } from './modules/render/exerciseRenderers.js';
import { TeacherFormRenderer } from './modules/render/teacherForm.js';
import { ExerciseHandler } from './modules/handlers/exerciseHandler.js';
import { ProgressHandler } from './modules/handlers/progressHandler.js';

// Punto de entrada principal simplificado
const App = {
  ...state,
  renderers: ExerciseRenderers,
  teacherForm: TeacherFormRenderer,
  exerciseHandler: ExerciseHandler,
  progressHandler: ProgressHandler,

  init() {
    console.log('App inicializada con módulos ES');
    // Aquí se llamarían a los métodos iniciales, ej:
    // this.progressHandler.hydrateProgress(this.authUser.uid);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
