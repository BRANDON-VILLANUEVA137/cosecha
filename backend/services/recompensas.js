/**
 * MOTOR DE RECOMPENSAS — desbloquea prendas por aciertos por materia.
 */
const db = require('../db');

function evaluarRecompensas(materia) {
  const logro = db.collection('logros').doc('estudiante_demo').get();
  const contador = materia === 'matematicas' ? logro.aciertosMatematicas : logro.aciertosIngles;
  const catalogo = db.collection('prendas').where('origen', materia);
  const nuevas = [];

  catalogo.forEach(p => {
    if (!logro.desbloqueadas.includes(p.id) && p.condicion && contador >= p.condicion.valor) {
      logro.desbloqueadas.push(p.id);
      nuevas.push(p);
    }
  });

  db.collection('logros').doc('estudiante_demo').set(logro);
  return nuevas;
}

module.exports = { evaluarRecompensas };