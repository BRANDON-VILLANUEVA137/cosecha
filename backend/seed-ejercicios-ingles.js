/**
 * Inyección (seed) de ejercicios de Inglés.
 *
 * Lee backend/data/db.json, agrega 18 ejercicios nuevos en la colección
 * "ejercicios" (IDs fijos i5..i22) y vuelve a escribir el archivo.
 * Es IDEMPOTENTE: si un ID ya existe, lo deja tal cual (no duplica).
 *
 * Con los 4 existentes (i1..i4) se alcanzan 22 ejercicios de inglés en total.
 *
 * Para subirlos a Firestore real, ejecuta después:
 *   node seed.js
 * (requiere credenciales de Firebase configuradas).
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

const NUEVOS_EJERCICIOS = [
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'I ___ a student. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'am', pistaError: 'La primera persona del singular (yo) siempre usa "am".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'London ___ a big city. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: 'Londres es una ciudad (it, singular) → usa "is".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'The dogs ___ playing. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'are', pistaError: '"The dogs" son varios (plural) → usa "are".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'You ___ my best friend. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'are', pistaError: '"You" siempre usa la forma "are".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'She ___ from Colombia. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: '"She" es ella (singular) → usa "is".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'We ___ ready for class. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'are', pistaError: '"We" es nosotros (plural) → usa "are".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'He ___ a teacher. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: '"He" es él (singular) → usa "is".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'They ___ my friends. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'are', pistaError: '"They" es ellos (plural) → usa "are".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'It ___ a sunny day. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: '"It" es eso (singular) → usa "is".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Verbo to be', enunciado: 'Maria ___ at home. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: '"Maria" es ella (singular) → usa "is".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"The books are on the table" → ¿qué pronombre los reemplaza?', tipo: 'texto', respuestaCorrecta: 'they', pistaError: 'Los libros son varios (cosas en plural) → el pronombre para varios es "they".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"My mother and I" → ¿qué pronombre los reemplaza?', tipo: 'texto', respuestaCorrecta: 'we', pistaError: 'Cuando "yo" está incluido junto con otra persona, el pronombre es "we" (nosotros).', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"The boy" → ¿qué pronombre lo reemplaza?', tipo: 'texto', respuestaCorrecta: 'he', pistaError: 'Es un niño (él, singular) → el pronombre para él es "he".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"The girl" → ¿qué pronombre la reemplaza?', tipo: 'texto', respuestaCorrecta: 'she', pistaError: 'Es una niña (ella, singular) → el pronombre para ella es "she".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"My house" → ¿qué pronombre la reemplaza?', tipo: 'texto', respuestaCorrecta: 'it', pistaError: 'Las cosas singulares (como una casa) → el pronombre es "it".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"Pedro" → ¿qué pronombre lo reemplaza?', tipo: 'texto', respuestaCorrecta: 'he', pistaError: 'Es una persona de género masculino (él) → el pronombre es "he".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"Sofía" → ¿qué pronombre la reemplaza?', tipo: 'texto', respuestaCorrecta: 'she', pistaError: 'Es una persona de género femenino (ella) → el pronombre es "she".', metodologia: 'Estándar / Directo' },
  { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"The students" → ¿qué pronombre los reemplaza?', tipo: 'texto', respuestaCorrecta: 'they', pistaError: 'Son varios estudiantes (plural) → el pronombre para varios es "they".', metodologia: 'Estándar / Directo' }
];

function inyectar() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ No se encontró backend/data/db.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.ejercicios) data.ejercicios = {};
  let agregados = 0;

  NUEVOS_EJERCICIOS.forEach((ej, idx) => {
    const id = `i${5 + idx}`; // IDs fijos: i5..i22 (idempotente)
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
