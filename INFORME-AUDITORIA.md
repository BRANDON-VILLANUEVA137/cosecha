# Informe de auditoría — Proyecto COSECHA v3.0

**Fecha:** 22 de octubre de 2026
**Alcance:** 90 archivos versionados (66 de código). Backend Express 4 + firebase-admin 14 sobre Firestore. Frontend vanilla JS sin build step.
**HEAD:** `ad2e8e1 "Proyecto COSECHA VERSION 3.0"` — árbol limpio, no se modificó código.
**Método:** lectura directa de backend y frontend + verificación empírica con Node (ejecución de `generador.js` y `validacion.js` sin tocar Firestore) + verificación byte a byte de codificación UTF-8.

---

## 1. Resumen ejecutivo

> **Conteos unificados con las secciones §2–§7.** La versión anterior no cuadraba (el P1 solo contaba backend y el P2 decía "~120").

| Severidad | Cantidad | Sección | Impacto |
|---|---|---|---|
| 🔴 P0 — Seguridad / pérdida de datos | **8** | §2 | Un docente ve datos de cualquier estudiante; XSS almacenado; sesión rota |
| 🟠 P1 — Lógica incorrecta | **21** (12 backend + 9 frontend) | §3 y §4 | Ejercicios con respuesta mal, permisos abiertos, XP regalada |
| 🟡 P2 — UX, accesibilidad y configuración | **132** | §7 | Pantallas en blanco, formularios inaccesibles, config hardcodeada |
| 💀 P3 — Código muerto | **4.467 líneas** | §5 | Confusión, superficie de ataque, mantenimiento |

> El hallazgo **2.8** (config de Firebase hardcodeada) estaba mal clasificado como P0: **se reclasifica a P2**. Por eso el P0 baja de 9 a 8. Ver la nota en §2.8.

**Lo más grave en una línea:** cualquier docente autenticado puede leer el historial completo de cualquier estudiante (`analytics.js:7-18`), y los nombres/títulos que escribe un docente se inyectan sin escapar en el HTML de otros usuarios (`renderDocente.js`, `viewRenderers.js`).

---

## 2. 🔴 Errores críticos (P0) — 8 hallazgos

> §2 contiene **8 hallazgos P0** (2.1–2.7 y 2.9). El 2.8 se conserva por trazabilidad pero **reclasificado a P2**.

### 2.1 IDOR: un docente lee analytics de cualquier estudiante
`backend/routes/analytics.js:7-18`

```js
router.get('/estudiante/:estudianteId', authMiddleware, requireRole('docente'), async (req, res) => {
  const { estudianteId } = req.params;
  const usuarioDoc = await db.collection('usuarios').doc(estudianteId).get();
```

`requireRole('docente')` solo comprueba el rol, **nunca** que ese docente tenga relación con ese estudiante. Cualquier docente puede iterar IDs y descargar nombre, email e historial completo de todos los alumnos de la plataforma. Falta un `obtenerDocenteDeEstudiante(estudianteId) === req.user.uid` (la función ya existe en `services/cursoEstudiantes.js`).

### 2.2 El historial de analytics devuelve `respuestaCorrecta`
`backend/routes/analytics.js:36-39` y `:144`

Se hace `...item` sobre el historial crudo. Cada intento incluye la respuesta correcta del ejercicio. Contraste: `routes/logros.js:9-12` tiene `sanitizarLogro()` que sí limpia. Analytics nunca lo usa.

### 2.3 XSS almacenado en el panel docente
`frontend/js/modules/render/renderDocente.js`

| Línea | Campo inyectado sin escapar |
|---|---|
| 47 | `${e.tema}` |
| 48-49 | `formatMathText(e.enunciado)` + `${e.metodologia}` |
| 54 | `value="${e.respuestaCorrecta}"` → **inyección de atributo** (`" onfocus=...`) |
| 56 | `value="${e.pistaError}"` → idem |
| 77 | `<h3>${t.titulo}</h3>` |
| 81 | `<p>${t.descripcion}</p>` |

Un docente (o cualquiera que logre crear una tarea/ejercicio) ejecuta JS en el navegador de otro docente.

### 2.4 XSS almacenado en listados de estudiantes
`frontend/js/modules/render/viewRenderers.js:64, 65, 121, 123, 125`

`${e.nombre}`, `${e.email}`, y los `value="..."` del formulario de edición. Mismo patrón, distinto archivo.

### 2.5 `escapeHtml` importado y no usado
`frontend/js/modules/render/analyticsRenderers.js:2`

```js
import { escapeHtml } from '../utils/formatters.js';
```

Nunca se invoca en el archivo. La intención de escapar existía y se perdió.

### 2.6 `formatMathText()` no escapa, solo embellece
`frontend/js/modules/utils/formatters.js:2-7`

```js
export function formatMathText(texto) {
  if (typeof texto !== 'string' || !texto) return '';
  return texto.replace(/(\d+)\s*\/\s*(\d+)/g, ...);  // devuelve HTML crudo
}
```

Todo lo que pasa por esta función se considera "seguro" y se pinta tal cual. Es la raíz de 2.3/2.4. Debe ser `formatMathText(escapeHtml(texto))`.

### 2.7 `api.js` pierde la cabecera `Authorization`
`frontend/js/api.js:41-50`

```js
const res = await fetch(this.base + path, {
  headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options.headers || {}) },
  ...options          // ← pisa el objeto headers completo
});
```

El spread de `options` va **después** de `headers`. Cualquier llamada que pase `options.headers` borra el `Bearer` → 401 en endpoints protegidos, y el reintento de `:55` no ayuda porque el token no viaja.

### 2.8 Config de Firebase hardcodeada — 🟡 reclasificado a P2
`frontend/index.html:78-85`

> **Corrección de severidad.** En la primera versión figuraba como P0. **No es una vulnerabilidad**: la `apiKey` web de Firebase está diseñada para ser pública y viaja en el bundle de cualquier app web; no es un secreto. El problema real es de **configuración y arquitectura**: impide tener entornos separados (dev/staging/prod) y deja la seguridad en manos de las reglas de Firestore y de las restricciones por dominio de la consola (que no están versionadas — ver Parte II, §S1.1). Se mueve a **P2**.
>
> `apiKey`, `authDomain`, `projectId`, etc. están en texto plano en `index.html:78-85`. Debe restringirse la key por dominio en la consola de Firebase y externalizar el config por entorno.

### 2.9 `equiparItem` sin whitelist de categoría
`backend/services/gamificacion.js:394-415`

Acepta cualquier `categoria` del body y la persiste. Permite inventar slots de equipamiento arbitrarios y romper el render del armario.

---

## 3. 🟠 Errores de lógica — Backend (P1) — 12 hallazgos

### 3.1 Permisos de tareas: cualquier docente edita lo ajeno
`backend/routes/tareas.js:13-18`

```js
function puedeGestionar(tarea, uidDocente) {
  if (!tarea) return false;
  if (tarea.origen === 'auto' || tarea.origen === 'ia') return true;  // ← cualquiera
  if (!tarea.docenteId) return true;                                   // ← cualquiera
  return tarea.docenteId === uidDocente;
}
```

- Línea 15: toda tarea autogenerada es editable por **cualquier** docente, incluidas las de estudiantes de otro curso.
- Línea 16: una tarea sin `docenteId` (datos viejos, seed) es editable por cualquiera.

### 3.2 `GET /api/tareas` sin filtro para docente
`backend/routes/tareas.js:25-30`

Trae la colección entera con `orderBy` y, si el rol es docente, la devuelve completa. El comentario de `:21` dice "ve todas sus tareas", pero el código entrega las de todo el mundo.

### 3.3 `GET /api/tareas/:id` sin autorización
`backend/routes/tareas.js:208-259`

Cualquier usuario autenticado con el ID lee la tarea y sus ejercicios. `:251-257` sí oculta `respuestaCorrecta` a no-docentes, pero un **docente ajeno** la recibe completa.

### 3.4 Bug confirmado: la resta suma
`backend/services/generador.js:222`

```js
enunciado: `${a} ${op} ${b} = ?`, respuestaCorrecta: String(a + b),
```

`op` puede ser `'-'` en esa rama, pero la respuesta siempre es `a + b`. Verificado ejecutando: `8 - 7 = ?` con respuesta `15`. **Todas las restas generadas están mal.**

### 3.5 `mcd` declarada dos veces
`backend/services/generador.js:29-38` y `:85-94`

La segunda declaración (function hoisting) gana. Peor: `:86-87` hace `Math.trunc(a)` sin `Number()` ni `|| 0` → `mcd(undefined, 5)` devuelve `5` y `mcd(NaN, 5)` devuelve `5` en vez de `NaN`/error. Las fracciones pueden simplificarse mal en silencio.

### 3.6 Rama `op === '/'` muerta
`backend/services/generador.js:212-219`

`op` se construye en `:197` como `+`, `-` o `×` — nunca `/`. El bloque de división es inalcanzable. La división del temario no se genera nunca por esta vía.

### 3.7 `dificultad` hardcodeada
`backend/services/generador.js:645`

```js
const dificultad = 1;
```

Ignora el parámetro de entrada. Todo se genera en nivel 1, sin progresión.

### 3.8 Fracciones con respuesta en array
`backend/services/validacion.js:104-122`

Si `respuestaCorrecta` es `['3/4', '5/6']`, el motor hace `String(array)` → `"3/4,5/6"` → parseo roto → **siempre falla**. Y cuando es string simple acepta equivalentes por valor (`2/4` vale por `1/2`), que puede ser deseado o no, pero es inconsistente con el resto de tipos.

### 3.9 `abrirCofre` con catálogo vacío
`backend/services/gamificacion.js:554`

```js
const carta = cartaAleatoria(cartas);   // sin comprobar cartas.length
```

Si no hay cartas activas, `cartaAleatoria([])` → `totalPeso = 0` → `Math.random()*0 = 0` → cae al `return cartas[Math.floor(...)]` → `undefined`. Luego `:556` explota con `carta.id`. El cobro de naranjas queda a medias.

### 3.10 `module.exports` antes de la declaración
`backend/services/gamificacion.js:493` vs `:545`

El export está en 493 y `abrirCofre` se declara en 545. Funciona por hoisting de `function`, pero `cartaAleatoria` (`:522`) y `PESOS_RAREZA` (`:516`) quedan fuera del export y en scope de módulo. Cualquier refactor a `const abrirCofre = async ...` rompe todo sin aviso.

### 3.11 Mezcla `Date` vs string ISO en `fechaCreacion`
`backend/routes/tareas.js:282` usa `new Date()`; `backend/seed.js:73-79` normaliza a `Date`. Pero datos antiguos en Firestore tienen strings. Firestore **no ordena** un campo con tipos mezclados de forma consistente → `orderBy('fechaCreacion','desc')` en `:25` puede lanzar o devolver orden arbitrario.

### 3.12 Match por `email`/`nombre` con `undefined`
`backend/routes/analytics.js:29`

```js
return data.email === usuario.email || data.nombre === usuario.nombre;
```

Si ambos son `undefined` en dos documentos distintos, `undefined === undefined` es `true` → asigna el logro de **otro** estudiante. Bug de confidencialidad silencioso.

---

## 4. 🟠 Errores de lógica — Frontend (P1) — 9 hallazgos

### 4.1 Pantalla en blanco
`frontend/js/main.js:121-127`

```js
} else {
  if (this.currentModule === 'inicio') html = await this.renderInicio();
  else if (this.currentModule === 'matematicas' || this.currentModule === 'ingles') { ... }
  else if (this.currentModule === 'misiones') html = await this.renderMissiones();
  else if (this.currentModule === 'album') html = await this.renderAlbum();
}   // ← sin else: html queda undefined
screen.innerHTML = html;   // "undefined"
```

Si `currentModule` es otro valor (p. ej. `'estudiantes'` residual, o un typo), `html` queda `undefined` y se pinta el texto `undefined`.

### 4.2 Feedback sobrescrito
`frontend/js/main.js:251` y `:280`

Dos rutas de código escriben el mismo contenedor de feedback; la segunda pisa a la primera. El usuario ve solo el último mensaje, a veces el equivocado.

### 4.3 +100 XP sin verificar ejercicios
`frontend/js/modules/handlers/taskHandler.js:58-63`

```js
async finishTask() {
  this.completeTask();                       // marca la tarea completada en cliente
  const tareaId = state.currentTaskView?.id;
  if (tareaId) {
    const res = await API.completarTarea(tareaId);  // el backend da +100 XP
```

`completeTask()` (`:40-56`) no valida nada; solo añade a `completedTaskIds`. El botón "Finalizar tarea" (`viewRenderers.js:235`) está disponible sin haber resuelto los ejercicios. El backend (`routes/ejercicios.js:241-245`) **sí** exige todos correctos para la lección, pero `completarTarea` es otra ruta → XP regalada.

### 4.4 El tema no persiste
`frontend/js/modules/handlers/authHandler.js:186-194`

`state.currentTheme` se aplica en memoria pero no se guarda en `localStorage`. Al recargar se pierde.

### 4.5 Filtro `#filtroTema` nunca poblado
`frontend/js/modules/render/renderDetalleTarea.js:84-87`

El `<select>` se renderiza vacío; no hay código que llene las opciones desde `state`.

### 4.6 `state.allEjercicios` depende de una pantalla
`frontend/js/modules/render/renderDocente.js:18`

Solo se puebla al entrar al panel docente. Si el estudiante recarga directo en la tarea, `allEjercicios` está vacío y los ejercicios no se renderizan.

### 4.7 Cambio de forma de figura no persiste
`frontend/js/main.js:311-319`

Se actualiza el DOM pero no el objeto de estado → al re-render vuelve la forma anterior.

### 4.8 Colisión `App.init` vs `AuthHandler.init`
`frontend/js/main.js:74` y `:175`

Dos `init()` compiten por el arranque. El orden depende de la carga de scripts (`index.html:1` carga `auth.js` antes del `<!DOCTYPE>`), lo que hace el bug dependiente del navegador.

### 4.9 El panel de Misiones se cierra al reclamar
`frontend/js/modules/handlers/missionHandler.js:25-27`

Reclamar una recompensa desmonta el panel entero; el usuario pierde el scroll y el contexto.

---

## 5. 💀 Código muerto / sobrante (P3) — 4.467 líneas

| Archivo | Tamaño | Por qué sobra |
|---|---|---|
| `backend/db.js` | 88 líneas | `MockFirestore` **nunca se importa** en ningún archivo (verificado con grep). El backend real usa `config/firebase-admin.js`. |
| `backend/data/db.json` | 3.646 líneas / 118 KB | Datos del mock, **sí versionado** en git. Peso muerto en el repo. |
| `frontend/js/modules/render/__temp_fix.js` | 87 líneas | Generador Node con ruta absoluta hardcodeada; si se ejecuta, reescribe código con rutas de otra máquina. |
| `frontend/js/modules/render/__build_analytics.js` | 81 líneas | Línea 94 usa `footer` no definido → `ReferenceError` al ejecutarlo. |
| `frontend/js/modules/render/teacherForm.js` | 19 líneas | Sin referencias (solo se referencia a sí mismo). |
| `frontend/js/modules/handlers/progressHandler.js` | 11 líneas | **Cebo peligroso**: exporta `hydrateProgress`/`saveProgressState` como stubs vacíos. Si alguien las importa, sobrescriben las funcionales de `main.js:382-396`. |
| `frontend/js/modules/render/renderArmario.js` | 96 líneas | `main.js:15` lo importa y `:52` lo asigna, pero **nunca se invoca**. Inalcanzable. |
| `frontend/css/diseno-docente.css` | 161 líneas | No enlazado en `index.html`. |
| `frontend/css/diseno-estudiante.css` | 278 líneas | No enlazado en `index.html`. |
| `#roleSelectScreen` / `enterRole` / `#roleTag` | — | HTML y handlers sin uso (el rol viene de Firebase). |
| `api.js:177-179` `editarTarea` | — | Nunca llamada. |
| `api.js:208-210` `getAdminResumen` | — | Nunca llamada. |

**Total verificado: 4.467 líneas.**

Fuera de ese total, pero también mal ubicadas: **1.103 líneas** de seeds (`seed*.js`) y **85 líneas** de scripts de un solo uso (`fix-cartas.js`, `test-firebase.js`, `verify-users.js`) mezcladas en la raíz de `backend/`. Deberían vivir en `backend/scripts/` (o eliminarse).

**CSS huérfano verificado:**

- `--fondo-2`: usada **15 veces** en JS, **0 definiciones** en los CSS enlazados.
- `--fondo2` (sin guion): 1 uso en `renderAlbum.js:42` — tercer nombre para lo mismo.
- `--surface`, `--teal-tint`, `--ink`: solo existen en `diseno-docente.css`, que no se carga.
- `--fc`: 3 usos, **0 definiciones** en ningún CSS.

---

## 6. ♻️ Inconsistencias entre capas

1. **Doble implementación de formateo.** `frontend/js/modules/render/exerciseRenderers.js:4-28` duplica 4 funciones de `frontend/js/modules/utils/formatters.js:2-30`. Si solo se arregla la de `formatters.js`, el XSS sigue vivo por la copia. Bomba de relojería.
2. **`App` es un dios-objeto.** `main.js:43-97`: 44 claves de estado + 16 renderers + ~70 handlers en un literal. `window.App.x()` y `App.x()` se mezclan; `main.js:408` itera `Object.keys(state)` en tiempo de ejecución para sincronizar, lo que rompe con cualquier clave nueva.
3. **`personajesCatalogo`** se define en `main.js` pero se usa desde `state.js` — no vive donde debería.
4. **Dos implementaciones de misiones:** `renderMissiones.js` y `missionHandler.js` (más `renderMissionesFab`). Tres fuentes de verdad para la misma UI.
5. **`netlify.toml` es config muerta.** `api.js:8-11` apunta a `https://cosecha.onrender.com/api` cuando el host no es localhost, así que los redirects de Netlify nunca se usan en producción. Y de todos modos están incompletos: faltan `/api/misiones`, `/api/notificaciones`, `/api/cartas`, `/api/admin`, `/api/progreso`, `/api/personajes`.
6. **Nombres de variables CSS inconsistentes:** `--fondo`, `--fondo-2`, `--fondo2`.
7. **`index.html:1`** — `<script src="js/auth.js">` antes del `<!DOCTYPE>`: modo quirks en algunos navegadores.

---

## 7. ♿ Accesibilidad y UX — 132 incidencias

| Incidencia | Cantidad | Detalle |
|---|---|---|
| `<button>` sin `type` | **77** | Dentro de `<form>` → submit accidental y recarga. |
| `<label>` sin `for` | **37** | El label no está asociado al input; lectores de pantalla no lo anuncian. |
| `<img>` sin `alt` | **3** | — |
| `<div onclick>` sin `role`/`tabindex` | **11** | Inaccesible por teclado. |
| `#themeSelect` sin `aria-label` | 1 | — |
| `#loginEmail` sin `type="email"` | 1 | Sin teclado de email en móvil. |
| Passwords sin `autocomplete` | 2+ | Mala experiencia con gestores de contraseñas. |
| `alert()` duplicando `errorBox` | `authHandler.js:147-148` | Doble notificación del mismo error. |

**Total: 77 + 37 + 3 + 11 + 1 + 1 + 2 = 132 incidencias.**

---

## 8. Contexto importante (no es un bug, pero debes saberlo)

- **Secretos en claro en disco (NO versionados).** `backend/config/serviceAccountKey.json` contiene la private key de `firebase-adminsdk-fbsvc@tutorias-f46e5.iam.gserviceaccount.com`, y `backend/.env` contiene `GEMINI_API_KEY` (54 chars). Ambos están correctamente en `.gitignore`, pero **la key estuvo en disco y pudo haber sido compartida**. Recomendación: rotar la private key en la consola de Firebase y rotar la API de Gemini.
- **`backend/data/db.json` SÍ está versionado** aunque es data del mock muerto.
- **No hay mojibake.** Verifiqué byte a byte los 90 archivos `.js/.html/.css/.json/.toml` con `UTF8Encoding(throwOnInvalid: true)`: todos son UTF-8 válido. Los `?` que aparecen en la consola de PowerShell son artefacto de la consola, no del archivo.
- **`db.js` no se usa**: el backend real va por Firestore (`config/firebase-admin.js`).

---

## 9. Plan de fixes priorizado

### P0 — Esta semana

> ⚠️ **Paso 0 — Rotación de claves (hacer antes de cualquier despliegue).**
> 1. Regenerar la private key de `firebase-adminsdk-fbsvc@tutorias-f46e5` en Google Cloud Console → IAM → Service Accounts → Keys (crear nueva y **borrar la actual**).
> 2. Rotar `GEMINI_API_KEY` en Google AI Studio (y `GEMINI_API_KEY_ALT` si está en uso, `aiGenerador.js:20`).
> 3. Confirmar que nunca se filtraron: `git log --all -p -- backend/config/serviceAccountKey.json backend/.env` (hoy devuelve vacío: **nunca se commitearon**, verificado).
> 4. Actualizar los secretos en el panel de Render y en el `.env` local.

1. **IDOR analytics** (`analytics.js:7-18`): validar relación docente↔estudiante con `obtenerDocenteDeEstudiante`.
2. **Sanear historial** (`analytics.js:36-39, 144`): reutilizar `sanitizarLogro` de `logros.js:9-12`.
3. **Arreglar `api.js:41-50`**: poner `...options` antes de `headers`, o `headers: {...merged, ...(options.headers||{})}`.
4. **Escapar todo** en `renderDocente.js:47,48,49,54,56,77,81` y `viewRenderers.js:64,65,121,123,125` con `escapeHtml`.
5. **`formatMathText`** (`formatters.js:2-7`): escapar antes de embellecer, y deduplicar `exerciseRenderers.js:4-28` para que use esta.
6. **`puedeGestionar`** (`tareas.js:13-18`): quitar los dos `return true`.
7. **`GET /api/tareas`** (`tareas.js:23-34`): filtrar por `docenteId` / curso.

### P1 — Próximas dos semanas

8. **Resta** (`generador.js:222`): `op === '-' ? a - b : a + b`.
9. Borrar `mcd` duplicada (`generador.js:85-94`).
10. Arreglar/eliminar rama `/` muerta (`generador.js:212-219`).
11. Pasar `dificultad` real (`generador.js:645`).
12. `abrirCofre`: comprobar `cartas.length` y **no cobrar** si falla (`gamificacion.js:552-560`).
13. Mover `module.exports` al final (`gamificacion.js:493`).
14. Normalizar `fechaCreacion` a `Date` en todos los orígenes (`tareas.js:282`, seed, migración).
15. `finishTask`: verificar ejercicios antes de `completarTarea` (`taskHandler.js:58`).
16. `render()`: `else` con fallback (`main.js:121-127`).
17. Unificar `App.init`/`AuthHandler.init` y mover el `<script>` de `index.html:1` dentro de `<body>`.
18. `completarTarea` en backend: exigir `ejercicios` resueltos.

### P2 — Accesibilidad y UX

19. Añadir `type="button"` a los 77 botones.
20. Asociar los 37 `<label>` con `for`/`id`.
21. `alt` en las 3 imágenes; `role`/`tabindex`/`keydown` en los 11 `<div onclick>`.
22. Persistir `currentTheme` en `localStorage` (`authHandler.js:186-194`).
23. Poblar `#filtroTema` (`renderDetalleTarea.js:84-87`).
24. Reemplazar `alert()` por `errorBox` (`authHandler.js:147-148`).

### P3 — Limpieza

25. Borrar `backend/db.js` + `backend/data/db.json`.
26. Borrar `__temp_fix.js`, `__build_analytics.js`, `teacherForm.js`, `progressHandler.js`.
27. Decidir: ¿se usa el armario? Si no, borrar `renderArmario` y su CSS (~900 líneas). Si sí, cablearlo en `render()`.
28. Borrar `#roleSelectScreen`/`enterRole`/`#roleTag`, `editarTarea`, `getAdminResumen`.
29. Enlazar o borrar `diseno-docente.css` / `diseno-estudiante.css`; unificar `--fondo`/`--fondo-2`/`--fondo2`; definir `--fc`.
30. Arreglar o borrar `netlify.toml` (hoy es config muerta; si se queda, añadir los 6 redirects que faltan).

---

## 10. Segunda pasada

Este documento cubre **lo que está mal**. Lo que **falta** (reglas de Firestore, CORS, helmet, rate limiting, validación de entrada, pruebas, README, `.env.example`, entornos y funcionalidades inalcanzables) está en:

**→ `INFORME-AUDITORIA-2-FALTANTES.md`**

---

**Nota final:** no se modificó ningún archivo de código. Los únicos artefactos añadidos son los dos informes.
