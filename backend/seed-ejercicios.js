/**
 * Inyección (seed) de ejercicios de Matemáticas.
 *
 * Lee backend/data/db.json, agrega los ejercicios nuevos en la colección
 * "ejercicios" (IDs m11..m32) y vuelve a escribir el archivo.
 * Es IDEMPOTENTE: si un ID ya existe, lo deja tal cual (no duplica).
 *
 * Para subirlos a Firestore real, ejecuta después:
 *   node seed.js
 * (requiere credenciales de Firebase configuradas).
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

const NUEVOS_EJERCICIOS = [
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '35/50 + 25/50 = ?', tipo: 'fraccion', respuestaCorrecta: '60/50', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '4/9 + 2/3 = ?', tipo: 'fraccion', respuestaCorrecta: '30/27', pistaError: 'Multiplica los denominadores para el denominador común (9x3=27), y cruza las multiplicaciones en el numerador (4x3 + 9x2).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '85/100 + 40/100 = ?', tipo: 'fraccion', respuestaCorrecta: '125/100', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '11/14 + 3/7 = ?', tipo: 'fraccion', respuestaCorrecta: '119/98', pistaError: 'Multiplica los denominadores para el denominador común (14x7=98), y cruza las multiplicaciones en el numerador (11x7 + 14x3).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '300/500 + 150/500 = ?', tipo: 'fraccion', respuestaCorrecta: '450/500', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '6/15 + 4/5 = ?', tipo: 'fraccion', respuestaCorrecta: '90/75', pistaError: 'Multiplica los denominadores para el denominador común (15x5=75), y cruza las multiplicaciones en el numerador (6x5 + 15x4).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '18/25 + 32/25 = ?', tipo: 'fraccion', respuestaCorrecta: '50/25', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '5/18 + 1/6 = ?', tipo: 'fraccion', respuestaCorrecta: '48/108', pistaError: 'Multiplica los denominadores para el denominador común (18x6=108), y cruza las multiplicaciones en el numerador (5x6 + 18x1).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '90/120 + 30/120 = ?', tipo: 'fraccion', respuestaCorrecta: '120/120', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '7/8 + 5/12 = ?', tipo: 'fraccion', respuestaCorrecta: '124/96', pistaError: 'Multiplica los denominadores para el denominador común (8x12=96), y cruza las multiplicaciones en el numerador (7x12 + 8x5).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '250/400 + 100/400 = ?', tipo: 'fraccion', respuestaCorrecta: '350/400', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '3/10 + 1/15 = ?', tipo: 'fraccion', respuestaCorrecta: '55/150', pistaError: 'Multiplica los denominadores para el denominador común (10x15=150), y cruza las multiplicaciones en el numerador (3x15 + 10x1).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '19/30 + 16/30 = ?', tipo: 'fraccion', respuestaCorrecta: '35/30', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '8/21 + 2/7 = ?', tipo: 'fraccion', respuestaCorrecta: '98/147', pistaError: 'Multiplica los denominadores para el denominador común (21x7=147), y cruza las multiplicaciones en el numerador (8x7 + 21x2).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Mismo denominador', enunciado: '500/1000 + 350/1000 = ?', tipo: 'fraccion', respuestaCorrecta: '850/1000', pistaError: 'Si el denominador es el mismo, mantenlo igual y suma únicamente los numeradores.', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Carita sonriente (diferente denominador)', enunciado: '9/16 + 3/8 = ?', tipo: 'fraccion', respuestaCorrecta: '120/128', pistaError: 'Multiplica los denominadores para el denominador común (16x8=128), y cruza las multiplicaciones en el numerador (9x8 + 16x3).', metodologia: 'Método Carita Sonriente' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '3/5 x 2/7 = ?', tipo: 'fraccion', respuestaCorrecta: '6/35', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (3x2) y denominador por denominador (5x7).', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '4/9 x 5/6 = ?', tipo: 'fraccion', respuestaCorrecta: '20/54', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (4x5) y denominador por denominador (9x6).', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '7/10 x 3/8 = ?', tipo: 'fraccion', respuestaCorrecta: '21/80', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (7x3) y denominador por denominador (10x8).', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '12/15 x 5/4 = ?', tipo: 'fraccion', respuestaCorrecta: '60/60', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (12x5) y denominador por denominador (15x4).', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '8/11 x 2/3 = ?', tipo: 'fraccion', respuestaCorrecta: '16/33', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (8x2) y denominador por denominador (11x3).', metodologia: 'Estándar / Directo' },
  { materia: 'matematicas', tema: 'Fracciones · Multiplicación', enunciado: '6/20 x 10/3 = ?', tipo: 'fraccion', respuestaCorrecta: '60/60', pistaError: 'La multiplicación es directa: multiplica numerador por numerador (6x10) y denominador por denominador (20x3).', metodologia: 'Estándar / Directo' }
];

// IDs fijos se asignan como m11..m32 (ver forEach en inyectar).

function inyectar() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ No se encontró backend/data/db.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.ejercicios) data.ejercicios = {};
  let agregados = 0;

  NUEVOS_EJERCICIOS.forEach((ej, idx) => {
    const id = `m${11 + idx}`; // IDs fijos: m11..m32 (idempotente)
    if (data.ejercicios[id]) {
      console.log(`ℹ️  ${id} ya existe, se omite.`);
      return;
    }
    data.ejercicios[id] = ej;
    agregados += 1;
    console.log(`✅ añadido ${id} → ${ej.enunciado} = ${ej.respuestaCorrecta}`);
  });

  if (agregados) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n🎉 Inyección completada: ${agregados} ejercicio(s) agregado(s) a db.json.`);
    console.log('➡️  Para subirlos a Firestore real, ejecuta:  node seed.js');
  } else {
    console.log('\nℹ️  No se agregó nada (todos los ejercicios ya estaban).');
  }
}

inyectar();
