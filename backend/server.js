const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');

// Cargar variables de entorno desde backend/.env si existe (sin dependencias).
// En producción (Render, Netlify) se usan variables de entorno configuradas por la plataforma.
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf-8');
  dotenvContent.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir el frontend estático (build de producción)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ejercicios', authMiddleware, require('./routes/ejercicios'));
app.use('/api/tareas', authMiddleware, require('./routes/tareas'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics')); // Router separado para analytics
app.use('/api/logros', authMiddleware, require('./routes/logros'));
app.use('/api/misiones', authMiddleware, require('./routes/misiones'));
app.use('/api/notificaciones', authMiddleware, require('./routes/notificaciones'));
app.use('/api/prendas', authMiddleware, require('./routes/prendas'));
app.use('/api/cartas', authMiddleware, require('./routes/cartas'));
app.use('/api/personajes', require('./routes/personajes'));
app.use('/api/progreso', require('./routes/progreso'));

app.use('/api/estudiantes', require('./routes/estudiantes'));

// Módulo de administración (CRUD docentes → cursos → estudiantes)
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend Cosecha corriendo en http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Cierra el proceso anterior o usa otro puerto.`);
  } else {
    console.error('❌ Error al iniciar el servidor:', err);
  }
  process.exit(1);
});