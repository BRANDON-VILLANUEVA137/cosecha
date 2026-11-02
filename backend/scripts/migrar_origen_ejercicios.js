const { db } = require('../config/firebase-admin');

async function migrarOrigen() {
  const snap = await db.collection('ejercicios').get();
  let afectados = 0;
  let sinOr = 0;
  const idsSinOr = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const id = doc.id;
    if (!d.origen) {
      sinOr++;
      idsSinOr.push(id);
    }
    if (id && (id.startsWith('gen-m-') || id.startsWith('gen-i-'))) {
      afectados++;
    }
  }
  console.log(`[DRY-RUN] Ejercicios sin 'origen': ${sinOr}`);
  console.log(`[DRY-RUN] Ejercicios con id gen-*: ${afectados}`);
  console.log(`[DRY-RUN] IDs sin origen (primeros 10): ${idsSinOr.slice(0, 10).join(', ')}`);
}

migrarOrigen().catch(e => console.error(e));
