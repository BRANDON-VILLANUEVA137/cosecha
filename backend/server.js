const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir el frontend estático (build de producción)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
app.use('/api/ejercicios', require('./routes/ejercicios'));
app.use('/api/logros', require('./routes/logros'));
app.use('/api/prendas', require('./routes/prendas'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Cosecha corriendo en http://localhost:${PORT}`);
});