# Informe de auditoría — Parte II: lo que **falta**

**Proyecto:** COSECHA v3.0 · **Fecha:** 22 de octubre de 2026
**Base:** `INFORME-AUDITORIA.md` (Parte I: lo que está *mal*).
**Alcance de esta parte:** solo **ausencias** — seguridad no implementada, pruebas, documentación/configuración y funcionalidades a medias o inalcanzables.
**HEAD:** `ad2e8e1` · árbol de código sin modificar.

---

## Resumen
| Área | Estado actual | Riesgo |
|---|---|---|
| Reglas de Firestore versionadas | ❌ No existen en el repo | 🔴 Alto |
| CORS restringido | ❌ `cors()` abierto a `*` | 🔴 Alto |
| Helmet / cabeceras de seguridad | ❌ Ausente | 🟠 Medio |
| Rate limiting | ❌ Ausente | 🔴 Alto (coste Gemini) |
| Validación de entrada | ⚠️ Solo el módulo admin; 29 `req.body` y ~7 chequeos | 🔴 Alto |
| Autorización por recurso | ❌ Sin comprobación de propiedad (2 IDOR) | 🔴 Alto |
| Pruebas automatizadas | ❌ 0 tests, 0 runner, 0 CI | 🔴 Alto |
| README | ❌ No existe | 🟠 Medio |
| `.env.example` | ❌ No existe | 🟠 Medio |
| Entornos separados | ❌ Config hardcodeada, sin proxy de dev | 🟠 Medio |
| Funcionalidades inalcanzables | ⚠️ Armario, 4 archivos muertos, 2 métodos API | 🟡 Bajo |

**Lo más grave de esta parte:** el proyecto no tiene **ninguna** barrera de seguridad de plataforma (ni reglas de Firestore, ni CORS cerrado, ni helmet, ni rate limiting) y no tiene **ni un solo test**. La única defensa es el `authMiddleware`, que ya se demostró insuficiente en dos IDOR.

---

# S1. Seguridad no cubierta

## S1.1 🔴 Las reglas de Firestore no están versionadas (y podrían no existir)

**Evidencia:** búsqueda recursiva (excluyendo `node_modules`) de `firestore.rules`, `firebase.json`, `.firebaserc` y `firestore.indexes.json` → **0 resultados**. No hay carpeta `.github/` ni pipeline que las despliegue.

**Por qué importa aunque el backend use el Admin SDK:**
- El Admin SDK **ignora** las reglas de Firestore. Es decir, las reglas no protegen al backend.
- Pero el frontend expone públicamente `projectId` y `apiKey` (`frontend/index.html:78-85`). Cualquiera puede hablar con la **API REST de Firestore** directamente usando esas credenciales.
- Si las reglas del proyecto están en modo test (`allow read, write: if true`) — el default de un proyecto recién creado — **toda la base de datos queda abierta a Internet**: usuarios, contraseñas no (están en Auth), pero sí nombres, emails, historial, logros, tareas, ejercicios con `respuestaCorrecta`.
- Aunque estén bien puestas, al no estar versionadas **no son auditables, no son reproducibles y no se pueden revisar en un PR**.

**Qué falta:**
1. `firestore.rules` con **deny-by-default**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
   (Todo el acceso es server-side, así que `false` es correcto.)
2. `firebase.json` + `firestore.indexes.json` (hoy los índices viven solo en la consola).
3. `.firebaserc` con el proyecto `tutorias-f46e5`.
4. Deploy de reglas en CI: `firebase deploy --only firestore:rules`.

## S1.2 🔴 CORS completamente abierto

`backend/server.js:24`

```js
app.use(cors());
```

Sin opciones, `cors` responde `Access-Control-Allow-Origin: *` a cualquier origen. Consecuencias:
- Cualquier web puede invocar la API desde el navegador de una víctima.
- Si un token se filtra (p. ej. por el XSS de la Parte I §2.3), se puede usar desde cualquier dominio.
- No hay lista blanca por entorno.

**Falta:** `cors({ origin: (process.env.CORS_ORIGINS || '').split(','), methods: [...], allowedHeaders: ['Content-Type','Authorization'] })`, con `CORS_ORIGINS=https://cosecha.netlify.app,http://localhost:3001` en `.env.example`.

## S1.3 🟠 Sin helmet ni cabeceras de seguridad en el backend

**Evidencia:** `backend/package.json:10-14` solo declara `cors`, `express` y `firebase-admin`. `server.js` nunca llama a `helmet()` ni a `app.disable('x-powered-by')`.

El backend en Render no envía:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`
- `Referrer-Policy`
- `Strict-Transport-Security`
- `Content-Security-Policy`
- ni oculta `X-Powered-By: Express`

`netlify.toml:64-69` sí define 3 cabeceras, pero **solo para el sitio estático**, no para la API (y además ese archivo es config muerta, Parte I §6.5).

**Falta:** `helmet()` + `app.disable('x-powered-by')` + una política de cabeceras idéntica en Render.

## S1.4 🔴 Sin rate limiting en ningún endpoint

No hay `express-rate-limit` ni middleware equivalente. Todos los endpoints son ilimitados. Los de mayor riesgo:

| Endpoint | Por qué |
|---|---|
| `POST /api/tareas/generar` (`tareas.js:120-205`) | Llama a **Gemini** (`aiGenerador.js`). Cada request cuesta dinero. Sin throttle, un script agota la cuota o genera factura. |
| `GET /api/estudiantes` (`estudiantes.js:11`) | Devuelve **todos** los estudiantes con email. Scraping de PII en segundos. |
| `POST /api/cartas/abrir-cofre` (`cartas.js:21`) | Economía del juego; sin límite se puede martillear. |
| `POST /api/logros/comprar` (`logros.js:39`) | Idem. |
| `GET /api/analytics/estudiante/:id` (`analytics.js:7`) | Enumeración de IDs (IDOR de la Parte I §2.1). |
| Todo `/api/*` | Sin límite global, un bucle simple tumba el proceso. |

**Falta:** `express-rate-limit` con límite global (p. ej. 100 req/min/IP) y límites específicos y más estrictos en `generar`, `comprar` y `abrir-cofre`.

## S1.5 🔴 Validación de entrada: auditoría ruta por ruta

**Cifras:** **1.648 líneas** de rutas, **29 usos de `req.body`**, **~7 comprobaciones de tipo** en total. No hay `zod`, `joi` ni `express-validator` en dependencias.

| Archivo | Usos de `req.body` | Comprobaciones de tipo | Diagnóstico |
|---|---|---|---|
| `admin/*.js` (4 routers) | vía servicios | `validar*` en `services/admin/*` | ✅ **Único módulo validado** (regex de email, longitud de password, `cursoId` obligatorio). |
| `ejercicios.js` | 3 | 7 | ✅ El mejor de los no-admin. |
| `progreso.js` | 1 | 3 | ✅ Valida `Array.isArray` y tipos. **Usar como plantilla.** |
| `tareas.js` | 5 | 1 | ❌ Solo `if (!titulo || !materia)` (`:271`). Sin tipo, longitud ni enum de `materia`/`origen`. |
| `logros.js` | 3 | 0 | ❌ `categoria`, `prendaId`, `itemId`, `tareaId` van crudos a Firestore/`gamificacion`. |
| `estudiantes.js` | 1 | 1 | ❌ Solo valida longitud de password. |
| `analytics.js` | 0 | 0 | ❌ `fechaInicio`/`fechaFin`/`materia` sin validar → `new Date(garbage)` (`:52-53`). |
| `prendas.js` | 0 (usa query) | 0 | ❌ `categoria` entra directo a `.where()` (`:14-15`). |
| `cartas.js`, `misiones.js`, `notificaciones.js`, `prendas.js`, `personajes.js`, `auth.js` | 0 | 0 | — |

**Casos concretos:**
- `logros.js:28-29` → `gamificacion.equiparItem(uid, categoria, prendaId)` sin whitelist de `categoria`. Permite inventar slots (ya reportado como Parte I §2.9).
- `tareas.js:297` → `activa` se desestructura y **nunca se persiste** (ver §S4.9).
- `prendas.js:11-17` → un `categoria` no-string puede provocar un 500 de Firestore.
- `analytics.js:43-55` → fechas inválidas silenciosamente filtran todo o nada.

**Falta:** un middleware `validate(schema)` y un `lib/schemas.js` (o adoptar `zod`). Mínimo: validar tipo, longitud, enum y forma de array/objeto en **todos** los `req.body` y `req.params`.

## S1.6 🔴 NUEVO — Cualquier docente cambia la contraseña de cualquier estudiante (account takeover)

`backend/routes/estudiantes.js:8` aplica `router.use(authMiddleware, requireRole('docente'))`, y `PUT /:id` (`:54-117`) **no comprueba que el estudiante pertenezca al docente**. En `:86-88`:

```js
if (Object.keys(authUpdates).length > 0) {
  await auth.updateUser(id, authUpdates);   // email/password arbitrarios
}
```

Combinado con `GET /api/estudiantes` (`:11-39`), que devuelve **todos** los estudiantes con su `id`, el ataque es trivial:

1. `GET /api/estudiantes` → lista completa.
2. Elegir un `id`.
3. `PUT /api/estudiantes/{id}` con `{ "password": "nueva123" }`.
4. Login como ese estudiante.

Es **toma de control total** de cualquier cuenta de estudiante y **no estaba en la Parte I**. Severidad **P0**.

**Falta:** comprobar `obtenerDocenteDeEstudiante(id) === req.user.uid` antes de tocar Auth, y no permitir cambiar `email`/`password` desde este endpoint (dejarlo solo al admin).

## S1.7 🟠 Logging excesivo con datos operativos

`backend/middleware/auth.js:11-13, 20, 22, 25, 28, 33, 41` registra **cada** request: ruta, presencia de token, UID verificado y rol. **163 llamadas a `console.*`** en todo el backend.

No imprime el token, pero:
- En Render los logs son accesibles y persistentes.
- Permite inferir estructura de rutas y roles.
- No hay logger estructurado, ni request-id, ni niveles, ni redacción.

**Falta:** un logger con niveles (`pino`/`winston`), `LOG_LEVEL` por entorno y quitar los `console.log` de depuración.

## S1.8 🟠 La API key de Gemini viaja en la query string

`backend/services/aiGenerador.js:74`

```js
`${GEMINI_API_URL}${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`
```

Las claves en URL acaban en logs de proxies, trazas y paneles de error. **Falta:** enviarla en la cabecera `x-goog-api-key`.

## S1.9 🟠 Sin Content-Security-Policy en el frontend

`frontend/index.html` no tiene `<meta http-equiv="Content-Security-Policy">` y `netlify.toml` no define CSP.

Dado el XSS almacenado de la Parte I §2.3/§2.4, una CSP es **el control mitigante**. Nota: el `<script>` inline de `index.html:77-86` (config de Firebase) obliga a `'unsafe-inline'` salvo que se externalice — hay que mover ese bloque a un `config.js` primero.

**Falta:** CSP (`default-src 'self'`, `script-src 'self' https://www.gstatic.com`, `connect-src` con Render + Google, `img-src 'self' data: https:`).

## S1.10 🟡 `express.json()` sin límite explícito y sin 404 JSON

- `server.js:25`: `express.json()` sin `limit` (usa el default de 100 KB). Debe hacerse explícito (`{ limit: '200kb' }`).
- `server.js` no tiene handler 404 para `/api/*`: una ruta inexistente cae en `express.static` y devuelve HTML, no JSON. Los clientes que esperan JSON rompen.

**Falta:** `app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))` antes del error handler.

## S1.11 🟡 Sin `trust proxy` ni redirección a HTTPS

`server.js` nunca llama a `app.set('trust proxy', 1)`. En Render, detrás del proxy:
- `req.ip` será la IP del proxy → **cualquier rate limiting futuro será inútil** (todos comparten IP) y las auditorías serán falsas.
- Sin `secure`/HSTS no se fuerza HTTPS.

**Falta:** `app.set('trust proxy', 1)` + HSTS (vía helmet).

## S1.12 ⚠️ Inconsistencia en el montaje de la autenticación

La auth se aplica en **dos sitios distintos**, lo que facilita olvidos:

| Router | `server.js` | Guard interno | Estado |
|---|---|---|---|
| `auth` | sin auth global | `/me` con `authMiddleware` | ✅ |
| `ejercicios`, `tareas`, `analytics`, `logros`, `misiones`, `notificaciones`, `prendas`, `cartas` | `authMiddleware` global | además `router.use` | ✅ (redundante) |
| `personajes` | **sin auth** | ninguno | ⚠️ público a propósito, pero no documentado |
| `progreso` | sin auth global | `router.use(authMiddleware)` | ✅ |
| `estudiantes` | sin auth global | `router.use(authMiddleware, requireRole('docente'))` | ✅ pero IDOR (S1.6) |
| `admin` | sin auth global | `router.use(authMiddleware, requireRole('admin'))` (`admin/index.js:23`) | ✅ |
| `health` | público | — | ✅ |

**Falta:** una convención única (todo dentro de cada router, o todo en `server.js`) y un **test de matriz de autorización** que verifique 401 sin token y 403 con rol incorrecto en cada endpoint.

---

# S2. Pruebas

## S2.1 Estado: cero

| Elemento | Estado |
|---|---|
| Framework de test | ❌ Ninguno (`node:test`, Jest, Vitest, Mocha: ausentes) |
| Script `npm test` | ❌ No existe (`package.json:6-9` solo tiene `start` y `dev`) |
| Archivos `*.test.js` / `*.spec.js` | ❌ 0 |
| Cobertura | ❌ No medida |
| Linter / formatter | ❌ Sin ESLint ni Prettier ni configuración |
| CI | ❌ Sin `.github/workflows` |
| Tests de frontend | ❌ 0 |

**Lo que sí existe y *no* son tests:**
- `backend/test-firebase.js` (16 líneas): script manual que conecta a Firestore e imprime todos los usuarios. No hay aserciones.
- `backend/verify-users.js` (48 líneas): comprueba manualmente dos emails hardcodeados (`docente@cosecha.com`, `estudiante@cosecha.com`).
- `backend/seed*.js` (1.103 líneas): cargan datos, no verifican nada.

## S2.2 Qué testear primero (por retorno)

| Prioridad | Módulo | Qué probar | Bug que habría cazado |
|---|---|---|---|
| 1 | `services/validacion.js` | Tabla de casos: entero, texto, fracción, arrays, equivalentes, negativos. | Fracción con array (Parte I §3.8) |
| 2 | `services/generador.js` | **Test de propiedad:** para todo ejercicio generado, `validarRespuesta(ej, ej.respuestaCorrecta) === true`. | **La resta que suma** (§3.4) |
| 3 | `services/gamificacion.js` | Niveles/XP, `abrirCofre` con catálogo vacío, doble gasto, `equiparItem` con categoría inválida. | `carta` undefined (§3.9), whitelist (§2.9) |
| 4 | Rutas × roles | Matriz anon/estudiante/docente/admin → 401/403/200. | IDOR analytics y estudiantes (§2.1, §S1.6) |
| 5 | `routes/estudiantes.js` | Docente A no puede editar al estudiante de B. | **Account takeover (S1.6)** |
| 6 | `services/sincronizacion.js` | `reconciliar`: unión de completados, máximo de intentos, idempotencia. | Pérdida de progreso multi-dispositivo |
| 7 | `services/cursoEstudiantes.js` | Resolución docente↔curso↔estudiante. | Visibilidad de tareas |
| 8 | Frontend `utils/formatters.js` | `escapeHtml` y `formatMathText` con `<script>`, `"`, `'`. | XSS (§2.3/2.4) |
| 9 | Frontend `utils/progressUtils.js` | Cálculo de progreso y reconciliación. | Progreso inconsistente |

## S2.3 Stack sugerido (sin añadir dependencias pesadas)

- `node:test` + `node:assert` — ya viene en Node 18+.
- `supertest` para las rutas HTTP.
- Para Firestore: **emulador** (`firebase-tools`) o inyección de un fake `db`; el código ya importa `db` desde un único módulo (`config/firebase-admin.js`), así que es fácil de doblar.
- `package.json`: `"test": "node --test"`, `"test:watch": "node --test --watch"`.
- GitHub Action: `npm ci && npm test` en cada push/PR.

**Sin tests, cada refactor del generador o de la gamificación es una ruleta rusa.** El bug de la resta lleva vivo desde el commit inicial sin que nadie lo notara.

---

# S3. Documentación y configuración

## S3.1 ❌ No hay README

No existe `README.md` en ningún nivel. Lo único parecido a documentación es:

- `añadir.txt` (7,3 KB, **versionado**): un volcado de contenido/ideas generado por IA sobre fracciones e inglés. **No describe el proyecto, ni cómo instalarlo, ni cómo desplegarlo.**

**Falta un README con, como mínimo:**
1. Qué es Cosecha y para quién.
2. Stack y arquitectura (diagrama de 3 cajas: Netlify → Render → Firestore).
3. Requisitos (Node ≥ 18, cuenta Firebase, clave Gemini).
4. Setup local paso a paso (`.env`, service account, `npm install`, `npm run dev`).
5. Estructura de carpetas.
6. Variables de entorno (tabla de §S3.3).
7. Cómo correr los seeds y en qué orden.
8. Cómo desplegar (Render + Netlify + reglas de Firestore).
9. Roles y permisos.
10. Cómo correr los tests.

## S3.2 ❌ No hay `.env.example`

Solo existe `backend/.env` (ignorado). Cualquiera que clone el repo no sabe qué variables necesita.

## S3.3 Inventario de variables de entorno (16)

| Variable | Dónde se lee | ¿Obligatoria? | Notas |
|---|---|---|---|
| `PORT` | `server.js:21` | No (3001) | Render la inyecta. |
| `FIREBASE_PROJECT_ID` | `config/firebase-admin.js:35` | Sí (prod) | |
| `FIREBASE_CLIENT_EMAIL` | `:36` | Sí (prod) | |
| `FIREBASE_PRIVATE_KEY` | `:37` | Sí (prod) | Con `\n` escapados; hay normalizador. |
| `FIREBASE_PRIVATE_KEY_ID` | `:43` | No | |
| `FIREBASE_CLIENT_ID` | `:46` | No | |
| `FIREBASE_AUTH_URI` | `:47` | No | Tiene default. |
| `FIREBASE_TOKEN_URI` | `:48` | No | Tiene default. |
| `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` | `:49` | No | Tiene default. |
| `FIREBASE_CLIENT_X509_CERT_URL` | `:50` | No | Tiene default. |
| `GEMINI_API_KEY` | `services/aiGenerador.js:20` | Sí (para IA) | |
| `GEMINI_API_KEY_ALT` | `:20` | No | Fallback. |
| `GEMINI_MODEL` | `:16` | No | Default `gemini-3.6-flash`. |
| `ADMIN_EMAIL` | `seed-admin.js:18` | Solo seed | Default `admin@cosecha.com`. |
| `ADMIN_PASSWORD` | `seed-admin.js:19` | Solo seed | **Default `admin123`** ⚠️ |
| `ADMIN_NOMBRE` | `seed-admin.js:20` | Solo seed | |

> ⚠️ **`seed-admin.js:19` crea un admin con contraseña `admin123` si no se define `ADMIN_PASSWORD`.** Si ese script se ejecuta contra producción, deja una puerta abierta trivial. Debe fallar en vez de usar el default.

## S3.4 ❌ Configuración de Firebase no versionada

Faltan `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` (ver §S1.1). Sin ellos el entorno no es reproducible: los índices compuestos viven solo en la consola.

## S3.5 ❌ Sin `engines.node`

`backend/package.json` no declara `"engines": { "node": ">=18" }`. `node --watch` (`package.json:8`) requiere Node ≥ 18.4. En Render, un cambio de versión por defecto puede romper el arranque sin aviso.

## S3.6 ❌ Sin CI/CD para el backend

No hay `.github/workflows`. Render se configura en su panel, no en el repo → **la infraestructura no es reproducible ni auditable**. Tampoco hay `Dockerfile` ni `render.yaml`.

## S3.7 ❌ Sin licencia

No hay `LICENSE`. Si el repo va a ser público, falta definir los términos.

## S3.8 ⚠️ Scripts sueltos en la raíz de `backend/`

10 archivos `.js` que no son servidor ni librería:

| Archivo | Líneas | Qué es |
|---|---|---|
| `seed-tareas-temas-nuevos.js` | 644 | Seed de datos |
| `seed-cartas.js` | 108 | Seed |
| `seed.js` | 107 | Seed |
| `seed-ejercicios.js` | 66 | Seed |
| `seed-ejercicios-ingles.js` | 63 | Seed |
| `seed-auth.js` | 63 | Seed |
| `seed-admin.js` | 52 | Seed |
| `verify-users.js` | 48 | Utilidad manual |
| `fix-cartas.js` | 21 | **Mutación de datos de un solo uso** |
| `test-firebase.js` | 16 | Smoke manual |

Deberían vivir en `backend/scripts/` con un README propio y `npm run seed:*`. `fix-cartas.js` (script de reparación puntual) debería eliminarse del repo.

## S3.9 ⚠️ Entornos: el "proxy local" no existe

`frontend/js/api.js:6-11` dice:

```js
// En producción apunta directamente al backend de Render
// En desarrollo usa el proxy local (/api)
base: (() => {
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProd ? 'https://cosecha.onrender.com/api' : '/api';
})()
```

**No hay proxy.** El frontend no tiene `package.json`, ni Vite/Webpack, ni `.live-server.json`, ni `serve.json`. `/api` solo funciona si Express sirve el frontend en `localhost:3001` (`server.js:28`). Si se abre `frontend/index.html` con Live Server (`:5500`), **todas las llamadas fallan con 404**.

**Falta:** documentar que el modo dev es "Express sirve el frontend", o añadir un proxy real. Y externalizar `https://cosecha.onrender.com/api` a configuración.

## S3.10 ⚠️ Entornos no separados

| Entorno | Frontend | API | Firestore | Config |
|---|---|---|---|---|
| Local | `:3001` (Express) | `/api` | **Producción** | `.env` + `serviceAccountKey.json` |
| Producción | Netlify | Render | **Producción** | Variables de Render |

No hay proyecto Firebase de staging ni de desarrollo. **Cualquier prueba local escribe en la base de datos real.** Eso, combinado con los seeds (`seed-admin.js` con `admin123`), es un riesgo directo de contaminar producción.

**Falta:** un proyecto Firebase `cosecha-dev` separado, o como mínimo el emulador de Firestore para desarrollo.

---

# S4. Funcionalidades a medias o inalcanzables

## S4.1 🔴 El Armario es inalcanzable (funcionalidad a medias)

**Evidencia:**
- `frontend/js/main.js:15` importa `renderArmario`.
- `frontend/js/main.js:52` lo asigna a `this.renderArmario`.
- **Nunca se invoca** en `render()` (`main.js:104-127`).
- La barra de navegación (`viewRenderers.js:15-20`) solo tiene `inicio`, `matematicas`, `ingles`, `album`.
- `renderArmario.js` solo se referencia a sí mismo.

**Consecuencia:** el usuario puede **comprar prendas** (`ShopHandler` → `POST /api/logros/comprar`) pero **no existe pantalla para verlas ni equiparlas en conjunto**. Solo se ven en el SVG del personaje que dibuja `personaje.js`. Hay 96 líneas de renderer + 161 de CSS esperando.

**Decisión pendiente:** cablearlo en `render()` (pestaña propia o dentro de `album`) o eliminarlo.

## S4.2 🟠 Misiones: alcanzable solo por el FAB, no por la navegación

`main.js:125` maneja `currentModule === 'misiones'`, pero **ningún tab lleva a `misiones`** (`viewRenderers.js:15-20`). Solo se llega por el botón flotante (`main.js:134` → `renderMissionesFab`). Además hay **tres** implementaciones: `renderMissiones.js`, `renderMissionesFab` (en `main.js`) y `missionHandler.js`.

**Falta:** decidir si Misiones es una sección de primera clase (tab) o solo FAB, y unificar en una sola fuente.

## S4.3 🟠 `#filtroTema` renderizado pero nunca poblado

`frontend/js/modules/render/renderDetalleTarea.js:84-87` pinta un `<select id="filtroTema">` vacío. No hay código que cargue las opciones. Ya reportado en Parte I §4.5; aquí se clasifica como **funcionalidad a medias**: el control existe, la lógica no.

## S4.4 🟠 Cambio de forma de figura no persiste

`frontend/js/main.js:311-319` actualiza el DOM pero no el estado. La interacción existe visualmente y se pierde al re-render. Parte I §4.7.

## S4.5 💀 `teacherForm.js` — módulo huérfano

`frontend/js/modules/render/teacherForm.js` (19 líneas). Única referencia: él mismo. Nunca se importa.

## S4.6 💀 `progressHandler.js` — stub peligroso

`frontend/js/modules/handlers/progressHandler.js` (11 líneas) exporta `hydrateProgress`/`saveProgressState` **vacías**. Las funcionales están en `main.js:382-396`. Si alguien importa el módulo por el nombre, **borra el progreso** del usuario.

## S4.7 💀 Generadores de código abandonados

- `frontend/js/modules/render/__temp_fix.js` (87 líneas): contiene una ruta absoluta `C:\...` y reescribe archivos. Si se ejecuta, corrompe el repo.
- `frontend/js/modules/render/__build_analytics.js` (81 líneas): usa `footer` no definido (línea 94) → `ReferenceError` al ejecutarlo.

## S4.8 💀 Métodos de API muertos

- `frontend/js/api.js:177-179` — `editarTarea()`: nunca se llama (la edición va por otro método).
- `frontend/js/api.js:208-210` — `getAdminResumen()`: nunca se llama.

## S4.9 🟠 El campo `activa` se acepta y se descarta

`backend/routes/tareas.js:269` (POST) y `:297` (PUT) desestructuran `activa`, pero:

- POST (`:276-284`) persiste `estado` y **no** `activa`.
- PUT (`:310-316`) persiste `estado` tomado del documento (`tareaDoc.data().estado || 'borrador'`) y **descarta el `estado` del body**.
- La respuesta del POST (`:286`) **sí devuelve `activa`**.

O sea: el cliente cree que guardó `activa` y el backend lo ignora en silencio. Contrato de API a medias.

## S4.10 💀 `#roleSelectScreen` / `enterRole` / `#roleTag`

Restos de un flujo de selección de rol que ya no se usa (el rol sale de Firestore en `authHandler.js:77`). Sigue en el HTML y en los handlers.

## S4.11 🟡 Carpeta vacía versionable

`nuevos diseños mas dinamicos/` existe en disco, está **vacía** y **no está en git** (untracked, 0 archivos). Es basura local.

## S4.12 🟡 `netlify.toml` es configuración muerta

Ya reportado en Parte I §6.5. En esta parte se confirma como "funcionalidad a medias": define 8 redirects que **nunca se usan** porque `api.js:8-11` llama directo a Render. Faltan 6 rutas (`misiones`, `notificaciones`, `cartas`, `admin`, `progreso`, `personajes`).

## S4.13 ✅ Falso positivo que conviene aclarar

`frontend/js/personaje.js` **no** es código muerto: se carga en `index.html:88` y se usa como global `window.Personaje` en `viewRenderers.js:5,51,86,99,107`. Se menciona para evitar que alguien lo borre.

---

# S5. Plan para lo que falta (P0 → P3)

## P0 — Antes de tocar producción

1. **`firestore.rules` deny-by-default** + `firebase.json` + `.firebaserc` + `firestore.indexes.json`, versionados y desplegados por CI.
2. **Corregir el account takeover** de `routes/estudiantes.js:54-117` (validar propiedad del estudiante; quitar `email`/`password` del endpoint de docente).
3. **Cerrar CORS** con lista blanca por entorno (`server.js:24`).
4. **Rate limiting** global + estricto en `POST /api/tareas/generar`, `/api/logros/comprar` y `/api/cartas/abrir-cofre`.
5. **Validación de entrada** con middleware `validate(schema)` en todos los `req.body` (empezar por `logros`, `tareas`, `analytics`, `prendas`).
6. **Rotar claves** (ver Parte I, Paso 0) y eliminar el default `admin123` de `seed-admin.js:19`.

## P1 — Primer sprint

7. **`helmet()` + `app.disable('x-powered-by')` + `trust proxy`** en `server.js`.
8. **Primeros tests**: `validacion.js`, `generador.js` (propiedad), matriz de autorización de rutas.
9. **`README.md`** completo.
10. **`.env.example`** con las 16 variables y comentarios.
11. **CI mínimo**: `npm ci && npm test`.
12. **Logger estructurado** y bajar el ruido de `middleware/auth.js`.

## P2 — Segundo sprint

13. **CSP** en el frontend (externalizando antes la config de Firebase de `index.html:77-86`).
14. **API key de Gemini por cabecera** (`aiGenerador.js:74`).
15. **Proyecto Firebase de staging** o emulador para desarrollo local.
16. **Handler 404 JSON** para `/api/*`.
17. **Arreglar o borrar el Armario** (`main.js:15,52`); decidir el destino de Misiones.
18. **Persistir `activa`** o eliminarlo del contrato (`tareas.js:269,297`).

## P3 — Limpieza

19. Borrar `db.js` + `data/db.json`, `teacherForm.js`, `progressHandler.js`, `__temp_fix.js`, `__build_analytics.js`, `editarTarea`, `getAdminResumen`, `#roleSelectScreen`.
20. Mover seeds y scripts a `backend/scripts/`; borrar `fix-cartas.js`.
21. Borrar la carpeta vacía `nuevos diseños mas dinamicos/`.
22. Arreglar o borrar `netlify.toml`.
23. Añadir `engines.node`, `LICENSE` y ampliar `.gitignore` (`*.log`, `.DS_Store`).
24. Convertir `añadir.txt` en `docs/contenido.md` o sacarlo del repo.

---

**Nota final:** no se modificó ningún archivo de código. Este informe se centra exclusivamente en **ausencias**; los errores existentes están en `INFORME-AUDITORIA.md`.
