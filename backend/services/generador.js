/**
 * GENERADOR DINÁMICO DE EJERCICIOS — Cosecha
 * ==========================================
 * Produce variantes DETERMINISTAS por semilla para diversificar los valores
 * de los ejercicios y evitar que todos los estudiantes vean el mismo
 * enunciado una y otra vez.
 *
 * La semilla se deriva de: uid + tareaId + ejercicioId
 *   → el MISMO estudiante ve la MISMA variante mientras resuelve (puede
 *     continuar el progreso sin que el enunciado cambie), pero estudiantes
 *     distintos (o tareas distintas) reciben valores diferentes.
 *
 * Las plantillas NO guardan la respuesta en la base: ésta se calcula al
 * instanciar, por lo que nunca viaja al cliente en el enunciado.
 */

const PLANTILLAS = {
  division_decimal: 'division_decimal',
  simplificacion: 'simplificacion',
  suma_mismo_denominador: 'suma_mismo_denominador',
  suma_carita: 'suma_carita'
};

/**
 * UTILIDADES — helpers de números y formato usados por las plantillas.
 */

/** Máximo común divisor (Euclides), para fracciones y simplificación. */
function mcd(a, b) {
  a = Math.abs(Math.trunc(Number(a) || 0));
  b = Math.abs(Math.trunc(Number(b) || 0));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** Mínimo común múltiplo. */
function mcm(a, b) {
  if (!a || !b) return 1;
  return Math.abs(a * b) / mcd(a, b);
}

/** Reduce una fracción 'n/d' a su forma irreducible. */
function reducirFraccion(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  const signo = (d < 0) !== (n < 0) ? -1 : 1;
  n = Math.abs(Math.trunc(n));
  d = Math.abs(Math.trunc(d));
  const g = mcd(n, d) || 1;
  return { n: signo * (n / g), d: d / g };
}
const fracStr = ({ n, d }) => `${n}/${d}`;

/** PRNG determinista mulberry32 (rápido y estable entre nodos). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a a 32 bits (semilla enteramente numérica para mulberry32). */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Entero aleatorio en [min, max] (inclusivo). */
function intAleatorio(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Máximo común divisor. */
function mcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** Número aleatorio en [min,max] coprimo con `ref`. */
function coprimoAEscoger(rng, min, max, ref) {
  for (let i = 0; i < 60; i += 1) {
    const n = intAleatorio(rng, min, max);
    if (mcd(n, ref) === 1) return n;
  }
  return min;
}

/* ------------------------------------------------------------------ *
 * PLANTILLAS — generan el enunciado y calculan la respuesta correcta
 * ------------------------------------------------------------------ */

/** Fracción → decimal (denominadores con decimal exacto: 2, 4, 5, 8, 10). */
function generarDivisionDecimal(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  const denominadores = [2, 4, 5, 8, 10];
  const den = denominadores[intAleatorio(rng, 0, denominadores.length - 1)];
  const num = coprimoAEscoger(rng, 3, 12, den); // no múltiplo de den → no entero
  const valor = Number((num / den).toFixed(2));

  return {
    ...base,
    tipo: 'decimal',
    enunciado: `Convierte la fracción ${num}/${den} a número decimal.`,
    respuestaCorrecta: valor,
    pistaError: `Divide el numerador entre el denominador: ${num} ÷ ${den} = ${valor}.`
  };
}

/** Simplificación a forma irreducible. */
function generarSimplificacion(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  let num = 0; let den = 0;
  for (let i = 0; i < 80; i += 1) {
    num = intAleatorio(rng, 2, 14);
    den = intAleatorio(rng, 3, 14);
    if (num !== den && mcd(num, den) === 1) break;
  }
  const k = intAleatorio(rng, 2, 5);
  const numExt = num * k;
  const denExt = den * k;

  return {
    ...base,
    tipo: 'fraccion_simplificada',
    enunciado: `Simplifica la fracción ${numExt}/${denExt} hasta su forma irreducible.`,
    respuestaCorrecta: `${num}/${den}`,
    pistaError: `Divide el numerador y el denominador entre su mcd (${k}): ${numExt}/${denExt} = ${num}/${den}.`
  };
}

/** Suma de fracciones con el mismo denominador. */
function generarSumaMismoDenominador(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  const d = intAleatorio(rng, 3, 12);
  const a = intAleatorio(rng, 1, 9);
  const b = intAleatorio(rng, 1, 9);
  const suma = a + b;

  return {
    ...base,
    tipo: 'fraccion',
    enunciado: `${a}/${d} + ${b}/${d} = ?`,
    respuestaCorrecta: `${suma}/${d}`,
    pistaError: 'Si el denominador es el mismo, se deja igual y solo se suman los numeradores.'
  };
}

/** Suma de fracciones con diferente denominador (método carita sonriente). */
function generarSumaCarita(seedStr, base) {
  const rng = mulberry32(hashString(seedStr));
  let d1 = 0; let d2 = 0;
  for (let i = 0; i < 80; i += 1) {
    d1 = intAleatorio(rng, 2, 9);
    d2 = intAleatorio(rng, 2, 9);
    if (mcd(d1, d2) !== 1) break; // buscamos denominadores con mcd > 1
  }
  const a = intAleatorio(rng, 1, 8);
  const b = intAleatorio(rng, 1, 8);

  return {
    ...base,
    tipo: 'fraccion',
    enunciado: `${a}/${d1} + ${b}/${d2} = ?`,
    respuestaCorrecta: `${a * d2 + b * d1}/${d1 * d2}`,
    pistaError: 'Aplica la regla de la carita sonriente: multiplica en cruz los numeradores y suma, y multiplica los denominadores entre sí.'
  };
}

/* ------------------------------------------------------------------ *
 * PLANTILLAS PROCEDIMENTALES — "generación desde cero" para las tareas
 * automáticas del estudiante. Cada plantilla recibe (rng, dificultad,
 * categoria) y devuelve { tipo, tema, enunciado, respuestaCorrecta,
 * pistaError } — la respuesta NUNCA viaja al cliente.
 * ------------------------------------------------------------------ */

/** type: 'entero' — suma, resta, multiplicación o división exacta. */
function generarOperacionEntera(rng, dificultad, categoria) {
  const a = intAleatorio(rng, 2, dificultad <= 1 ? 20 : 50);
  const b = intAleatorio(rng, 2, dificultad <= 1 ? 10 : 25);
  const op = (categoria % 2) === 0 ? '+' : (categoria % 4) === 1 ? '-' : '×';

  if (op === '-' && b > a) {
    // resultado siempre no-negativo → intercambiar
    return generarOperacionEntera(rng, dificultad, categoria + 1);
  }

  if (op === '×') {
    const c = intAleatorio(rng, (dificultad <= 1 ? 2 : 3), (dificultad <= 1 ? 9 : 12));
    return {
      tipo: 'entero', tema: 'Operaciones básicas',
      enunciado: `${a} ${op} ${c} = ?`, respuestaCorrecta: String(a * c),
      pistaError: `Resuelve la ${op === '+' ? 'suma' : op === '-' ? 'resta' : 'multiplicación'} en orden.`
    };
  }
  if (op === '/') {
    const c = intAleatorio(rng, 2, 9);
    return {
      tipo: 'entero', tema: 'División',
      enunciado: `${a * c} ÷ ${c} = ?`, respuestaCorrecta: String(a),
      pistaError: 'Divide el número mayor entre el divisor.'
    };
  }
  return {
    tipo: 'entero', tema: 'Operaciones básicas',
    enunciado: `${a} ${op} ${b} = ?`, respuestaCorrecta: String(a + b),
    pistaError: `Resuelve la ${op === '+' ? 'suma' : 'resta'} en orden.`
  };
}

/** type: 'entero' — tabla de multiplicar del 2 al 9. */
function generarTabla(rng) {
  const a = intAleatorio(rng, 2, 9);
  const b = intAleatorio(rng, 2, 9);
  return {
    tipo: 'entero', tema: 'Tablas de multiplicar',
    enunciado: `${a} × ${b} = ?`, respuestaCorrecta: String(a * b),
    pistaError: `El producto de ${a} por ${b} es ${a * b}.`
  };
}

/** type: 'entero' — comparar dos números con <, > o =. */
function generarComparar(rng, dificultad) {
  const a = intAleatorio(rng, 1, dificultad <= 1 ? 9 : 99);
  const b = intAleatorio(rng, 1, dificultad <= 1 ? 9 : 99);
  const simbolo = a > b ? '>' : a < b ? '<' : '=';
  return {
    tipo: 'entero', tema: 'Comparación de números',
    enunciado: `${a} ___ ${b} (escribe <, > o =)`, respuestaCorrecta: simbolo,
    pistaError: a === b ? 'Cuando son iguales se usa =.'
      : (a > b ? 'El mayor es el que está a la izquierda → >.' : 'El menor está a la izquierda → <.')
  };
}

/** type: 'fraccion' — suma de fracciones con el mismo denominador (resultado propio). */
function generarFraccionPropia(rng, dificultad) {
  const d = intAleatorio(rng, 3, 12);
  const a = intAleatorio(rng, 1, d - 1);
  const b = intAleatorio(rng, 1, d - a); // suma propia ≤ 1
  const { n, d: dd } = reducirFraccion(a + b, d);
  return {
    tipo: 'fraccion', tema: 'Fracciones · misma base',
    enunciado: `${a}/${d} + ${b}/${d} = ?`,
    respuestaCorrecta: fracStr({ n, d: dd }),
    pistaError: 'Si el denominador es el mismo, se deja igual y solo se suman los numeradores.'
  };
}

/** type: 'fraccion' — multiplicación de fracciones. */
function generarFraccionMultiplicacion(rng, dificultad) {
  const d1 = intAleatorio(rng, 2, 9);
  const n1 = intAleatorio(rng, 1, d1);
  const d2 = intAleatorio(rng, 2, 9);
  const n2 = intAleatorio(rng, 1, d2);
  const r = reducirFraccion(n1 * n2, d1 * d2);
  return {
    tipo: 'fraccion', tema: 'Multiplicación de fracciones',
    enunciado: `${n1}/${d1} × ${n2}/${d2} = ?`,
    respuestaCorrecta: fracStr(r),
    pistaError: 'Multiplica numerador por numerador y denominador por denominador, luego simplifica si se puede.'
  };
}

/** type: 'fraccion_simplificada' — simplificar una fracción a forma irreducible. */
function generarSimplificarFraccion(rng, dificultad) {
  const g = intAleatorio(rng, 2, 6);
  const nBase = intAleatorio(rng, 2, 14);
  const dBase = intAleatorio(rng, 3, 14);
  if (mcd(nBase, dBase) !== 1) return generarSimplificarFraccion(rng, dificultad);
  const n = nBase * g;
  const d = dBase * g;
  return {
    tipo: 'fraccion_simplificada', tema: 'Simplificación de fracciones',
    enunciado: `Simplifica la fracción ${n}/${d} a su forma irreducible`,
    respuestaCorrecta: `${nBase}/${dBase}`,
    pistaError: `Divide numerador y denominador entre su mcd (${g}): ${n}/${d} = ${nBase}/${dBase}.`
  };
}

/** type: 'decimal' — fracción → decimal exacto. */
function generarFraccionDecimal(rng, dificultad) {
  const denoms = [2, 4, 5, 8, 10];
  const d = denoms[intAleatorio(rng, 0, denoms.length - 1)];
  const n = intAleatorio(rng, 1, 12);
  const v = Number((n / d).toFixed(2));
  return {
    tipo: 'decimal', tema: 'Fracción → decimal',
    enunciado: `Convierte ${n}/${d} a número decimal`, respuestaCorrecta: String(v),
    pistaError: `Divide ${n} ÷ ${d} = ${v}.`
  };
}

/** type: 'entero' — decidir si una fracción es propia o impropia. */
function generarPropiaImpropia(rng, dificultad) {
  const d = intAleatorio(rng, 2, 9);
  const n = intAleatorio(rng, 1, 12);
  const esPropia = n < d;
  return {
    tipo: 'entero', tema: 'Fracciones propias e impropias',
    enunciado: `¿La fracción ${n}/${d} es propia o impropia? Escribe "propia" o "impropia".`,
    respuestaCorrecta: esPropia ? 'propia' : 'impropia',
    pistaError: esPropia
      ? 'Propia: el numerador es menor que el denominador (menos de una unidad).'
      : 'Impropia: el numerador es mayor o igual que el denominador (más de una unidad).'
  };
}

/** type: 'entero' — problema verbal con contexto Cosecha (🍊). */
function generarProblemaCosecha(rng, dificultad, categoria) {
  const variedad = categoria % 4;
  const a = intAleatorio(rng, 3, 35);
  const b = intAleatorio(rng, 2, a - 1);
  const c = intAleatorio(rng, 2, 9);
  if (variedad === 0) {
    return {
      tipo: 'entero', tema: 'Problemas Cosecha',
      enunciado: `🌾 En la huerta cosechaste ${a} naranjas por la mañana y ${b} por la tarde. ¿Cuántas naranjas tienes en total?`,
      respuestaCorrecta: String(a + b),
      pistaError: `Suma el total de la mañana y la tarde: ${a} + ${b} = ${a + b}.`
    };
  }
  if (variedad === 1) {
    return {
      tipo: 'entero', tema: 'Problemas Cosecha',
      enunciado: `🍊 Tenías ${a + b} naranjas en la canasta y vendiste ${b}. ¿Cuántas naranjas quedan?`,
      respuestaCorrecta: String(a),
      pistaError: `Resta las vendidas: ${a + b} - ${b} = ${a}.`
    };
  }
  if (variedad === 2) {
    return {
      tipo: 'entero', tema: 'Problemas Cosecha',
      enunciado: `📦 Empacas ${a * b} naranjas en cajas de ${b} naranjas cada una. ¿Cuántas cajas necesitas?`,
      respuestaCorrecta: String(a),
      pistaError: `Divide el total entre las naranjas por caja: ${a * b} ÷ ${b} = ${a}.`
    };
  }
  return {
    tipo: 'entero', tema: 'Problemas Cosecha',
    enunciado: `👨‍🌾 Si en cada árbol del huerto hay ${a} naranjas y tienes ${b} árboles, ¿cuántas naranjas hay en total?`,
    respuestaCorrecta: String(a * b),
    pistaError: `Multiplica el número de naranjas por árbol por la cantidad de árboles: ${a} × ${b} = ${a * b}.`
  };
}

/** type: 'entero' — operación con números negativos (suma/resta sencilla). */
function generarNegativos(rng, dificultad) {
  const a = intAleatorio(rng, -12, 12);
  let b = 0;
  while (b === 0) b = intAleatorio(rng, -12, 12);
  const op = (a % 2 === 0) ? '+' : '-';
  if (op === '-') {
    return {
      tipo: 'entero', tema: 'Números negativos',
      enunciado: `${a} - ${b} = ?`, respuestaCorrecta: String(a - b),
      pistaError: 'Resta teniendo en cuenta los signos: restar un negativo es lo mismo que sumar.'
    };
  }
  return {
    tipo: 'entero', tema: 'Números negativos',
    enunciado: `${a} + ${b} = ?`, respuestaCorrecta: String(a + b),
    pistaError: 'Si son de distinto signo, se restan y se pone el signo del mayor.'
  };
}

/** Conjunto de plantillas de MATEMÁTICAS disponibles para tareas automáticas. */
const TEMPLATES_MAT = [
  { id: 'ope', fn: generarOperacionEntera },
  { id: 'tabla', fn: generarTabla },
  { id: 'comp', fn: generarComparar },
  { id: 'neg', fn: generarNegativos },
  { id: 'frac_suma', fn: generarFraccionPropia },
  { id: 'frac_multi', fn: generarFraccionMultiplicacion },
  { id: 'frac_simpl', fn: generarSimplificarFraccion },
  { id: 'frac_dec', fn: generarFraccionDecimal },
  { id: 'prop_impro', fn: generarPropiaImpropia },
  { id: 'cosecha', fn: generarProblemaCosecha }
];

/* ------------------------------------------------------------------ *
 * PLANTILLAS DE INGLÉS — constructores de oración (sentence builders).
 * Devuelven enunciados de opción múltiple (opciones) o de completar
 * (texto), con la respuesta correcta y su pista.
 * ------------------------------------------------------------------ */

/** type: 'opcion_multiple' — elegir am/is/are en una oración. */
function generarToBe(rng, dificultad) {
  const singulares = [
    ['My brother', 'he', 'is'],
    ['Sofía', 'she', 'is'],
    ['The cat', 'it', 'is'],
    ['That book', 'it', 'is']
  ];
  const plurales = [
    ['Sofía and Pedro', 'they', 'are'],
    ['The students', 'they', 'are'],
    ['The birds', 'they', 'are'],
    ['My friends and I', 'we', 'are']
  ];
  const lista = [...singulares, ...plurales];
  const sel = lista[intAleatorio(rng, 0, lista.length - 1)];
  const opciones = ['am', 'is', 'are'].map((o, i) => ({ clave: String.fromCharCode(97 + i), texto: o }));
  return {
    tipo: 'opcion_multiple', tema: 'Verbo to be',
    enunciado: `${sel[0]} ___ happy. (elige la forma correcta)`,
    respuestaCorrecta: opciones.find(o => o.texto === sel[2]).clave,
    opciones,
    pistaError: `\"${sel[0]}\" es ${sel[1]} → usa ${sel[2]}.`
  };
}

/** type: 'opcion_multiple' — elegir a o an. */
function generarAYAn(rng, dificultad) {
  const palabras = [
    ['apple', 'an'], ['orange', 'an'], ['umbrella', 'an'], ['hour', 'an'],
    ['book', 'a'], ['car', 'a'], ['dog', 'a'], ['university', 'a']
  ];
  const sel = palabras[intAleatorio(rng, 0, palabras.length - 1)];
  const opciones = ['a', 'an'].map((o, i) => ({ clave: String.fromCharCode(97 + i), texto: o }));
  return {
    tipo: 'opcion_multiple', tema: 'Artículos a / an',
    enunciado: `This is ___ ${sel[0]}.`,
    respuestaCorrecta: opciones.find(o => o.texto === sel[1]).clave,
    opciones,
    pistaError: sel[1] === 'an'
      ? `\"${sel[0]}\" empieza con sonido de vocal → se usa \"an\".`
      : `\"${sel[0]}\" empieza con sonido de consonante → se usa \"a\".`
  };
}

/** type: 'texto' — formar el plural de un sustantivo regular. */
function generarPlural(rng, dificultad) {
  const reglas = [
    ['book', 'books'], ['cat', 'cats'], ['apple', 'apples'], ['dog', 'dogs'],
    ['box', 'boxes'], ['bus', 'buses'], ['watch', 'watches'],
    ['baby', 'babies'], ['city', 'cities']
  ];
  const sel = reglas[intAleatorio(rng, 0, reglas.length - 1)];
  return {
    tipo: 'texto', tema: 'Sustantivos plurales',
    enunciado: `Escribe el plural de: ${sel[0]}`,
    respuestaCorrecta: sel[1],
    pistaError: sel[1].endsWith('ies')
      ? 'Consonante + "y" → se cambia la "y" por "ies".'
      : (/[sxz]$|ch$|sh$/.test(sel[0]) ? 'Termina en s, x, z, ch o sh → se agrega "es".' : 'Sustantivos regulares → solo se agrega "s".')
  };
}

/** type: 'texto' — completar con adjetivo posesivo. */
function generarPosesivos(rng, dificultad) {
  const casos = [
    ['I', 'my'], ['you', 'your'], ['he', 'his'], ['she', 'her'],
    ['it', 'its'], ['we', 'our'], ['they', 'their']
  ];
  const sel = casos[intAleatorio(rng, 0, casos.length - 1)];
  const sustantivo = ['book', 'house', 'car', 'school'][intAleatorio(rng, 0, 3)];
  return {
    tipo: 'texto', tema: 'Adjetivos posesivos',
    enunciado: `Completa: "This is ___ ${sustantivo}." (${sel[0]})`,
    respuestaCorrecta: sel[1],
    pistaError: `El posesivo de \"${sel[0]}\" es \"${sel[1]}\".`
  };
}

/** type: 'texto' — elegir there is / there are. */
function generarThereIsAre(rng, dificultad) {
  const singular = ['a book on the table', 'an apple in the bag', 'a cat in the garden'];
  const plural = ['three books on the table', 'two apples in the bag', 'some birds in the tree'];
  const esSingular = rng() < 0.5;
  const frase = esSingular
    ? singular[intAleatorio(rng, 0, singular.length - 1)]
    : plural[intAleatorio(rng, 0, plural.length - 1)];
  return {
    tipo: 'texto', tema: 'There is / There are',
    enunciado: `Completa: "There ___ ${frase}." (is / are)`,
    respuestaCorrecta: esSingular ? 'is' : 'are',
    pistaError: esSingular
      ? `\"${frase}\" es singular → se usa \"is\".`
      : `\"${frase}\" es plural → se usa \"are\".`
  };
}

/** type: 'opcion_multiple' — presente simple: elegir la forma del verbo. */
function generarPresenteSimple(rng, dificultad) {
  const casos = [
    ['She ___ to school every day.', 'goes', 'She es tercera persona (he/she/it) → el verbo lleva -s/-es.'],
    ['He ___ television in the evening.', 'watches', 'He es tercera persona → el verbo lleva -es (verbos en -ch).'],
    ['My parents ___ in the garden.', 'work', 'My parents es plural → el verbo NO lleva -s.'],
    ['The dog ___ loudly at night.', 'barks', 'The dog es tercera persona singular → el verbo lleva -s.']
  ];
  const sel = casos[intAleatorio(rng, 0, casos.length - 1)];
  const distract = [sel[1]];
  while (distract.length < 3) {
    const cand = ['go', 'goes', 'work', 'works', 'watch', 'watches', 'bark', 'barks'][intAleatorio(rng, 0, 7)];
    if (!distract.includes(cand)) distract.push(cand);
  }
  const opciones = distract.map((o, i) => ({ clave: String.fromCharCode(97 + i), texto: o }));
  return {
    tipo: 'opcion_multiple', tema: 'Presente simple',
    enunciado: sel[0],
    respuestaCorrecta: opciones.find(o => o.texto === sel[1]).clave,
    opciones,
    pistaError: sel[2]
  };
}

/** type: 'opcion_multiple' — vocabulario de salón de clases. */
function generarVocabulario(rng, dificultad) {
  const pares = [
    ['pencil', 'lápiz'], ['desk', 'escritorio'], ['book', 'libro'],
    ['teacher', 'profesor(a)'], ['chair', 'silla'], ['board', 'tablero'],
    ['ruler', 'regla'], ['backpack', 'mochila']
  ];
  const sel = pares[intAleatorio(rng, 0, pares.length - 1)];
  const distractores = pares
    .filter(p => p[1] !== sel[1])
    .sort(() => rng() - 0.5)
    .slice(0, 3)
    .map(p => p[1]);
  const opciones = [...distractores, sel[1]].sort(() => rng() - 0.5)
    .map((o, i) => ({ clave: String.fromCharCode(97 + i), texto: o }));
  return {
    tipo: 'opcion_multiple', tema: 'Vocabulario',
    enunciado: `¿Qué significa \"${sel[0]}\" en español?`,
    respuestaCorrecta: opciones.find(o => o.texto === sel[1]).clave,
    opciones,
    pistaError: `\"${sel[0]}\" significa \"${sel[1]}\".`
  };
}

/** Conjunto de plantillas de INGLÉS disponibles para tareas automáticas. */
const TEMPLATES_ING = [
  { id: 'tobe', fn: generarToBe },
  { id: 'ayan', fn: generarAYAn },
  { id: 'plural', fn: generarPlural },
  { id: 'poses', fn: generarPosesivos },
  { id: 'there', fn: generarThereIsAre },
  { id: 'presente', fn: generarPresenteSimple },
  { id: 'vocab', fn: generarVocabulario }
];

/**
 * Genera la variante concreta de un ejercicio marcado como plantilla.
 * Si el ejercicio no es dinámico, lo devuelve sin cambios.
 */
function generarVariant(ejercicio, seedStr) {
  if (!ejercicio || !ejercicio.plantilla || !seedStr) return ejercicio;
  switch (ejercicio.plantilla) {
    case PLANTILLAS.division_decimal:
      return generarDivisionDecimal(seedStr, ejercicio);
    case PLANTILLAS.simplificacion:
      return generarSimplificacion(seedStr, ejercicio);
    case PLANTILLAS.suma_mismo_denominador:
      return generarSumaMismoDenominador(seedStr, ejercicio);
    case PLANTILLAS.suma_carita:
      return generarSumaCarita(seedStr, ejercicio);
    default:
      return ejercicio;
  }
}

/**
 * Instancia (si corresponde) un ejercicio para un usuario y una tarea.
 * @param {object} ejercicio  documento del ejercicio (debe traer su `id`)
 * @param {string} uid        uid del usuario autenticado
 * @param {string|null} tareaId id de la tarea en curso
 */
function instanciarEjercicio(ejercicio, uid, tareaId) {
  if (!ejercicio || !ejercicio.plantilla) return ejercicio;
  const semilla = `${uid}:${tareaId || 'libre'}:${ejercicio.id}`;
  return generarVariant(ejercicio, semilla);
}

/* ------------------------------------------------------------------ *
 * MATCHER DE SOLICITUDES — traduce el cuadro de texto libre del
 * estudiante ("quiero repasar fracciones", "práctica de verbo to be"...)
 * a plantillas concretas del catálogo. Si no matchea, usamos plantillas
 * recomendadas por materia (fallback amable).
 * ------------------------------------------------------------------ */

const SINONIMOS_MAT = {
  ope: ['suma', 'resta', 'operacion', 'operaciones', 'sumar', 'restar', 'calculo', 'calcular'],
  tabla: ['tabla', 'tablas', 'multiplicar', 'multiplicacion'],
  comp: ['comparar', 'comparacion', 'mayor', 'menor', 'igual', 'ordena'],
  neg: ['negativo', 'negativos', 'numeros negativos', 'enteros'],
  frac_suma: ['fraccion', 'fracciones', 'suma de fracciones', 'mismo denominador', 'denominador'],
  frac_multi: ['multiplicacion de fracciones', 'multiplicar fracciones'],
  frac_simpl: ['simplificar', 'simplificacion', 'forma irreducible'],
  frac_dec: ['decimal', 'decimales', 'fraccion a decimal'],
  prop_impro: ['propia', 'impropias', 'propia o impropia'],
  cosecha: ['problema', 'problemas', 'cosecha', 'naranjas', 'huerta']
};

const SINONIMOS_ING = {
  tobe: ['to be', 'verbo to be', 'am is are', 'am', 'is', 'are', 'afirmativo'],
  ayan: ['a an', 'articulos', 'article', 'an'],
  plural: ['plural', 'plurales', 'sustantivos'],
  poses: ['posesivo', 'posesivos', 'my your his'],
  there: ['there is', 'there are', 'hay'],
  presente: ['presente simple', 'simple present', 'present simple', 'tercera persona'],
  vocab: ['vocabulario', 'vocabulary', 'palabras', 'clase']
};

/** Devuelve los IDs de plantilla que coinciden con la solicitud/texto. */
function matchPlantillasPorSolicitud(solicitud, materia) {
  const sinonimos = materia === 'ingles' ? SINONIMOS_ING : SINONIMOS_MAT;
  const txt = String(solicitud || '').toLowerCase();
  const matches = [];
  for (const [id, keys] of Object.entries(sinonimos)) {
    if (keys.some(k => txt.includes(k))) matches.push(id);
  }
  if (matches.length) return matches;
  // Fallback: plantillas recomendadas por materia
  return materia === 'ingles'
    ? ['tobe', 'ayan', 'plural', 'vocab']
    : ['ope', 'tabla', 'frac_suma', 'comp'];
}

/** Genera `cantidad` ejercicios procedurales (sin tocar el banco). */
function generarTareaProcedural(materia, solicitud, cantidad = 10, seedStr = '') {
  console.log(`[GEN] ${materia} ${solicitud || 'none'} seed=${seedStr || 'procedural'} → procedural`);
  const rng = mulberry32(hashString(seedStr || `${materia}:${Date.now()}:${Math.random()}`));
  const idsMatch = matchPlantillasPorSolicitud(solicitud, materia);
  let plantillas = (materia === 'ingles' ? TEMPLATES_ING : TEMPLATES_MAT)
    .filter(t => idsMatch.includes(t.id));
  // Si la solicitud pide un tema específico que no está en el catálogo, no inventamos otros temas
  if (!plantillas.length && solicitud && solicitud.trim().length > 0) {
    console.log(`[GEN] ${materia} ${solicitud || 'none'} seed=${seedStr || 'procedural'} → NO MATCH, no se inventan temas`);
    return []; // No generamos ejercicios de otro tema
  }
  if (!plantillas.length) plantillas = (materia === 'ingles' ? TEMPLATES_ING : TEMPLATES_MAT);

  const ejercicios = [];
  const usados = new Set();
  const dificultad = 1;
  let i = 0;
  while (ejercicios.length < cantidad && i < cantidad * 30) {
    i += 1;
    const tpl = plantillas[i % plantillas.length];
    let ej = null;
    try { ej = tpl.fn(rng, dificultad, i); } catch (_) { continue; }
    if (!ej || !ej.enunciado || ej.respuestaCorrecta === undefined || ej.respuestaCorrecta === '') continue;
    const clave = ej.enunciado + '|' + (Array.isArray(ej.respuestaCorrecta) ? ej.respuestaCorrecta.join(',') : ej.respuestaCorrecta);
    if (usados.has(clave)) continue;
    usados.add(clave);
    ejercicios.push({
      id: `gen-${materia === 'ingles' ? 'i' : 'm'}-${String(ejercicios.length + 1)}-${hashString(seedStr + ':' + i) % 100000}`,
      materia,
      tema: ej.tema || 'General',
      tipo: ej.tipo || 'texto',
      enunciado: ej.enunciado,
      respuestaCorrecta: ej.respuestaCorrecta,
      ...(Array.isArray(ej.opciones) ? { opciones: ej.opciones } : {}),
      pistaError: ej.pistaError || 'Vuelve a revisar el procedimiento paso a paso.',
      metodologia: materia === 'ingles' ? 'Opción Múltiple / Gramática' : 'Estándar / Directo',
      origen: 'auto'
    });
  }

  // Si no alcanzamos, completar con cualquier plantilla de la materia
  if (ejercicios.length < cantidad) {
    const resto = (materia === 'ingles' ? TEMPLATES_ING : TEMPLATES_MAT);
    i = 0;
    while (ejercicios.length < cantidad && i < cantidad * 20) {
      i += 1;
      const tpl = resto[i % resto.length];
      let ej = null;
      try { ej = tpl.fn(rng, dificultad, i + ejercicios.length); } catch (_) { continue; }
      if (!ej || !ej.enunciado || ej.respuestaCorrecta === undefined) continue;
      const clave = ej.enunciado + '|' + ej.respuestaCorrecta;
      if (usados.has(clave)) continue;
      usados.add(clave);
      ejercicios.push({
        id: `gen-${materia === 'ingles' ? 'i' : 'm'}-${String(ejercicios.length + 1)}-${hashString(seedStr + ':' + i) % 100000}`,
        materia,
        tema: ej.tema || 'General',
        tipo: ej.tipo || 'texto',
        enunciado: ej.enunciado,
        respuestaCorrecta: ej.respuestaCorrecta,
        ...(Array.isArray(ej.opciones) ? { opciones: ej.opciones } : {}),
        pistaError: ej.pistaError || 'Vuelve a revisar el procedimiento paso a paso.',
        metodologia: materia === 'ingles' ? 'Opción Múltiple / Gramática' : 'Estándar / Directo',
        origen: 'auto'
      });
    }
  }

  console.log(`[GEN] ${materia} ${solicitud || 'none'} origin=procedural cantidad=${ejercicios.length} tema=${ejercicios[0]?.tema || 'mixed'}`);
  return ejercicios.slice(0, cantidad);
}

/** Título legible para una tarea autogenerada según materia/solicitud. */
function tituloAuto(materia, solicitud = '') {
  const base = materia === 'ingles' ? 'Desafío de Inglés' : 'Desafío de Matemáticas';
  if (solicitud) {
    const corta = String(solicitud).trim().split(/\s+/).slice(0, 6).join(' ');
    return `Desafío Cosecha: ${corta} 🍊`;
  }
  return `${base} 🍊`;
}

module.exports = {
  PLANTILLAS,
  TEMPLATES_MAT,
  TEMPLATES_ING,
  mulberry32,
  hashString,
  mcd,
  mcm,
  generarVariant,
  instanciarEjercicio,
  matchPlantillasPorSolicitud,
  generarTareaProcedural,
  tituloAuto
};