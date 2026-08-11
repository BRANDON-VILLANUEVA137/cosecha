const { db } = require('./config/firebase-admin');

(async () => {
  const snap = await db.collection('cartas').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 1) Eliminar duplicado: c001 (Naranjita Exploradora) con URL rota
  const dup = docs.find(d => d.id === 'c001');
  if (dup) {
    await db.collection('cartas').doc('c001').delete();
    console.log('Eliminada duplicada (URL rota):', dup.id, dup.nombre);
  }

  // 2) Corregir URL rota de c002 (Cítrico Guerrero)
  const fix = docs.find(d => d.id === 'c002');
  if (fix) {
    const url = 'https://api.dicebear.com/7.x/adventurer/svg?seed=C%C3%ADtrico%20Guerrero';
    await db.collection('cartas').doc('c002').update({ imagen_url: url });
    console.log('URL corregida:', fix.id, fix.nombre, '->', url);
  }

  const after = await db.collection('cartas').get();
  console.log('Total cartas después de limpieza:', after.size);
  after.docs.forEach(d => console.log(' ', d.id, '|', d.data().nombre, '|', d.data().imagen_url));
})().catch(console.error);
