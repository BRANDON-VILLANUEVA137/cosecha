export const state = {
  currentRole: null,
  currentModule: 'inicio',
  currentArmarioTab: 'avatar',
  currentTheme: 'citrico',
  intentosPorEjercicio: {},
  cachePrendas: [],
  authUser: null,
  authReady: false,
  currentFractionPreview: { numerador: 2, denominador: 5, tipo: 'rectangulo' },
  currentDynamicMode: 'paso',
  currentTaskView: null,
  currentTaskExercises: [],
  completedTaskIds: [],
  completedExerciseIds: [],
  allEjercicios: [],
  currentDocenteTab: 'tareas',
  analyticsView: 'grupo',
  selectedEstudianteId: null,
  analyticsFiltros: { materia: '', fechaInicio: '', fechaFin: '' },
  analyticsFilterMateria: '',
  analyticsFilterTarea: '',
  analyticsFilterTema: '',
  tareasDisponibles: [],
  temasDisponibles: [],
  estudiantesGestion: [],
  estudianteEditando: null,
  estudianteFormVisible: false,
  avatarSeleccionado: '',
  opcionesRows: [{ clave: 'a', texto: '', correcta: false }, { clave: 'b', texto: '', correcta: false }],
  graficaSel: {},
  metodologiaHints: {
    'Estándar / Directo': 'Ejercicio tradicional: el estudiante escribe y la respuesta se corrige al instante.',
    'Paso a Paso (Carita Sonriente)': 'Muestra el método de la carita sonriente paso a paso para sumar fracciones.',
    'Graficación Interactiva': 'El estudiante representa la fracción coloreando figuras geométricas (tortas o rectángulos).',
    'Desafío Contrarreloj': 'Ronda breve con tiempo límite: preguntas rápidas y reto contra el reloj.',
    'Gramática' : 'Enfoque en completar verbos y pronombres con apoyo visual.',
    'Opción Múltiple / Gramática': 'Preguntas de selección (única o múltiple) con foco en gramática y vocabulario.'
  }
};

// ✅ Exponer `state` en window.
// Los handlers inline del formulario de opciones del docente usan
// `oninput="state.opcionesRows[i]..."` / `onchange="state.opcionesRows..."`.
// `state` es un módulo ES (no una variable global), así que sin esto el
// navegador lanza ReferenceError al escribir las opciones y nunca se guardan.
window.state = state;
