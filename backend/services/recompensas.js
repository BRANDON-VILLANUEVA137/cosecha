/**
 * MOTOR DE RECOMPENSAS — desbloquea prendas por aciertos por materia.
 */
const { db } = require('../config/firebase-admin');

async function evaluarRecompensas(uid, materia) {
  const logroRef = db.collection('logros').doc(uid);
  const logroSnap = await logroRef.get();

  const defaultLogro = {
    aciertosMatematicas: 0,
    aciertosIngles: 0,
    intentos: 0,
    desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
    equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
    historial: []
  };

  const logro = logroSnap.exists ? { ...defaultLogro, ...logroSnap.data() } : defaultLogro;
  const contador = materia === 'matematicas' ? logro.aciertosMatematicas : logro.aciertosIngles;
  const catalogoSnap = await db.collection('prendas').where('origen', '==', materia).get();
  const nuevas = [];

  for (const doc of catalogoSnap.docs) {
    const prenda = { id: doc.id, ...doc.data() };
    if (!logro.desbloqueadas.includes(prenda.id) && prenda.condicion && contador >= prenda.condicion.valor) {
      logro.desbloqueadas.push(prenda.id);
      nuevas.push(prenda);
    }
  }

  await logroRef.set(logro);
  return nuevas;
}

module.exports = { evaluarRecompensas };