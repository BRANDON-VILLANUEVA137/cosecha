/**
 * Inyección (seed) de 17 tareas y sus 170 ejercicios (Inglés y Matemáticas).
 *
 * Lee backend/data/db.json y agrega:
 *   - 30 ejercicios de inglés (IDs fijos i23..i52) → Verbo to be: afirmativo, negativo y preguntas.
 *   - 60 ejercicios de inglés (IDs fijos i53..i112) → artículos a/an, sustantivos plurales,
 *     adjetivos posesivos, there is/there are, presente simple y vocabulario de clase.
 *   - 70 ejercicios de matemáticas (IDs fijos m33..m102) → suma mismo denominador, suma
 *     diferente denominador, división, propias/impropias, fracción → decimal, simplificación
 *     e introducción a los números negativos.
 *   - 10 ejercicios extra de matemáticas (IDs fijos m103..m112) → práctica adicional de números negativos.
 *   - 17 tareas de docente (colección "tareas") asignadas a docente-001, cada una con sus
 *     10 ejercicios (referencias con orden).
 *
 * Es IDEMPOTENTE: si un ID ya existe, se omite (no duplica).
 * Los temas con `sobrescribir: true` reemplazan el contenido de los IDs ya existentes
 * (se usan para renovar los ejercicios de las tareas publicadas).
 *
 * Para subirlos a Firestore real, ejecuta después:
 *   node seed.js
 * (requiere credenciales de Firebase configuradas).
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

/** Genera una lista de IDs consecutivos: ids('m', 33, 3) → ['m33','m34','m35']. */
function ids(prefijo, desde, cantidad) {
  return Array.from({ length: cantidad }, (_, i) => `${prefijo}${desde + i}`);
}

/**
 * Cada tema define metadatos del ejercicio y sus 10 ítems
 * [enunciado, respuestaCorrecta, pistaError].
 * El tipo 'opcion_multiple' requiere `opciones` (clave + texto).
 */
const TEMAS = [
  {
    materia: 'ingles',
    tema: 'Verbo to be · Afirmativo',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 23, 10),
    items: [
      ['He ___ my best friend. (am / is / are)', 'is', '"He" es singular → usa "is".'],
      ['These books ___ very interesting. (am / is / are)', 'are', 'Los libros son plural (they) → usa "are".'],
      ['I ___ twelve years old. (am / is / are)', 'am', 'La primera persona (I) siempre usa "am".'],
      ['Sara ___ in the kitchen. (am / is / are)', 'is', '"Sara" = she (singular) → usa "is".'],
      ['The birds ___ singing in the tree. (am / is / are)', 'are', 'Los pájaros son varios (they) → usa "are".'],
      ['We ___ from Colombia. (am / is / are)', 'are', '"We" (nosotros) → usa "are".'],
      ['It ___ a beautiful flower. (am / is / are)', 'is', '"It" (singular) → usa "is".'],
      ['Pedro and Luis ___ cousins. (am / is / are)', 'are', 'Dos personas = plural (they) → usa "are".'],
      ['That ___ my favorite movie. (am / is / are)', 'is', '"That" (singular) → usa "is".'],
      ['You ___ a great student. (am / is / are)', 'are', '"You" siempre usa "are".']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Verbo to be · Negativo',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 33, 10),
    items: [
      ["He ___ a doctor; he is a nurse. (am not / isn't / aren't)", "isn't", '"He" (singular) → usa "isn\'t".'],
      ["The children ___ in the classroom. (am not / isn't / aren't)", "aren't", 'Los niños son plural (they) → usa "aren\'t".'],
      ['I ___ from Spain; I am from Mexico. (am not / isn\'t / aren\'t)', 'am not', 'Primera persona (I) → usa "am not".'],
      ["She ___ very happy with the result. (am not / isn't / aren't)", "isn't", '"She" (singular) → usa "isn\'t".'],
      ["We ___ ready for the trip. (am not / isn't / aren't)", "aren't", '"We" (plural) → usa "aren\'t".'],
      ["This ___ my pen; mine is blue. (am not / isn't / aren't)", "isn't", '"This" (singular) → usa "isn\'t".'],
      ["The dogs ___ in the garden. (am not / isn't / aren't)", "aren't", 'Los perros son varios (they) → usa "aren\'t".'],
      ["You ___ late; you arrived on time. (am not / isn't / aren't)", "aren't", '"You" → usa "aren\'t".'],
      ["My brother ___ at work today. (am not / isn't / aren't)", "isn't", '"My brother" es singular (he) → usa "isn\'t".'],
      ['I ___ angry; I am just tired. (am not / isn\'t / aren\'t)', 'am not', 'Primera persona (I) → usa "am not".']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Verbo to be · Preguntas',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 43, 10),
    items: [
      ['___ she your cousin? (Am / Is / Are)', 'is', 'Con "she" (singular) → "Is".'],
      ['___ we invited to the party? (Am / Is / Are)', 'are', 'Con "we" (plural) → "Are".'],
      ['___ I in your team? (Am / Is / Are)', 'am', 'Con el sujeto "I" la pregunta comienza con "Am".'],
      ['___ it raining outside? (Am / Is / Are)', 'is', 'Con "it" (singular) → "Is".'],
      ['___ you from Ecuador? (Am / Is / Are)', 'are', 'Con "you" la pregunta usa "Are".'],
      ['___ they playing soccer? (Am / Is / Are)', 'are', 'Con "they" (plural) → "Are".'],
      ['___ your parents at home? (Am / Is / Are)', 'are', '"Your parents" son varios (they) → "Are".'],
      ['___ he the new teacher? (Am / Is / Are)', 'is', 'Con "he" (singular) → "Is".'],
      ['___ the movie good? (Am / Is / Are)', 'is', '"The movie" es singular (it) → "Is".'],
      ['___ we best friends? (Am / Is / Are)', 'are', 'Con "we" (plural) → "Are".']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones · Suma mismo denominador',
    tipo: 'fraccion',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('m', 33, 10),
    items: [
      ['3/7 + 2/7 = ?', '5/7', 'Denominador igual: suma los numeradores (3+2=5).'],
      ['5/9 + 3/9 = ?', '8/9', 'Denominador igual: suma los numeradores (5+3=8).'],
      ['4/11 + 6/11 = ?', '10/11', 'Denominador igual: suma solo los numeradores (4+6=10).'],
      ['7/13 + 2/13 = ?', '9/13', 'Denominador igual: suma solo los numeradores (7+2=9).'],
      ['10/21 + 5/21 = ?', '15/21', 'Denominador igual: suma solo los numeradores (10+5=15).'],
      ['4/5 + 3/5 = ?', '7/5', 'Denominador igual: suma los numeradores (4+3=7).'],
      ['2/9 + 7/9 = ?', '9/9', 'Denominador igual: suma los numeradores (2+7=9).'],
      ['8/17 + 5/17 = ?', '13/17', 'Denominador igual: suma solo los numeradores (8+5=13).'],
      ['3/14 + 6/14 = ?', '9/14', 'Denominador igual: suma solo los numeradores (3+6=9).'],
      ['12/25 + 8/25 = ?', '20/25', 'Denominador igual: suma solo los numeradores (12+8=20).']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones · Suma diferente denominador (carita sonriente)',
    tipo: 'fraccion',
    metodologia: 'Paso a Paso (Carita Sonriente)',
    sobrescribir: true,
    ids: ids('m', 43, 10),
    items: [
      ['1/3 + 1/4 = ?', '7/12', 'Carita sonriente: (1×4 + 3×1)/(3×4) = 7/12.'],
      ['2/7 + 1/2 = ?', '11/14', 'Carita sonriente: (2×2 + 7×1)/(7×2) = 11/14.'],
      ['3/5 + 2/9 = ?', '37/45', 'Carita sonriente: (3×9 + 5×2)/(5×9) = 37/45.'],
      ['1/6 + 3/8 = ?', '26/48', 'Carita sonriente: (1×8 + 6×3)/(6×8) = 26/48.'],
      ['4/7 + 1/3 = ?', '19/21', 'Carita sonriente: (4×3 + 7×1)/(7×3) = 19/21.'],
      ['5/8 + 3/4 = ?', '44/32', 'Carita sonriente: (5×4 + 8×3)/(8×4) = 44/32.'],
      ['2/9 + 5/6 = ?', '57/54', 'Carita sonriente: (2×6 + 9×5)/(9×6) = 57/54.'],
      ['3/10 + 2/5 = ?', '35/50', 'Carita sonriente: (3×5 + 10×2)/(10×5) = 35/50.'],
      ['1/4 + 5/12 = ?', '32/48', 'Carita sonriente: (1×12 + 4×5)/(4×12) = 32/48.'],
      ['7/9 + 1/2 = ?', '23/18', 'Carita sonriente: (7×2 + 9×1)/(9×2) = 23/18.']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones · División',
    tipo: 'fraccion',
    metodologia: 'Estándar / Directo',
    ids: ids('m', 53, 10),
    items: [
      ['9/3 ÷ 3/3 = ?', '27/9', 'Multiplica en cruz: (9×3)/(3×3) = 27/9.'],
      ['9/3 ÷ 3/1 = ?', '9/9', 'Multiplica en cruz: (9×1)/(3×3) = 9/9.'],
      ['4/1 ÷ 5/3 = ?', '12/5', 'Multiplica en cruz: (4×3)/(1×5) = 12/5.'],
      ['6/5 ÷ 2/3 = ?', '18/10', 'Multiplica en cruz: (6×3)/(5×2) = 18/10.'],
      ['8/3 ÷ 4/3 = ?', '24/12', 'Multiplica en cruz: (8×3)/(3×4) = 24/12.'],
      ['7/2 ÷ 1/4 = ?', '28/2', 'Multiplica en cruz: (7×4)/(2×1) = 28/2.'],
      ['10/6 ÷ 5/2 = ?', '20/30', 'Multiplica en cruz: (10×2)/(6×5) = 20/30.'],
      ['3/4 ÷ 9/8 = ?', '24/36', 'Multiplica en cruz: (3×8)/(4×9) = 24/36.'],
      ['5/1 ÷ 2/5 = ?', '25/2', 'Multiplica en cruz: (5×5)/(1×2) = 25/2.'],
      ['12/7 ÷ 3/14 = ?', '168/21', 'Multiplica en cruz: (12×14)/(7×3) = 168/21.']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones · Propias e impropias',
    tipo: 'opcion_multiple',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    opciones: [
      { clave: 'propia', texto: 'Propia' },
      { clave: 'impropia', texto: 'Impropia' }
    ],
    ids: ids('m', 63, 10),
    items: [
      ['¿Es propia o impropia? 4/9', 'propia', 'Propia: 4 < 9.'],
      ['¿Es propia o impropia? 13/5', 'impropia', 'Impropia: 13 > 5.'],
      ['¿Es propia o impropia? 7/12', 'propia', 'Propia: 7 < 12.'],
      ['¿Es propia o impropia? 9/4', 'impropia', 'Impropia: 9 > 4.'],
      ['¿Es propia o impropia? 2/13', 'propia', 'Propia: 2 < 13.'],
      ['¿Es propia o impropia? 21/8', 'impropia', 'Impropia: 21 > 8.'],
      ['¿Es propia o impropia? 15/16', 'propia', 'Propia: 15 < 16.'],
      ['¿Es propia o impropia? 31/30', 'impropia', 'Impropia: 31 > 30.'],
      ['¿Es propia o impropia? 3/20', 'propia', 'Propia: 3 < 20.'],
      ['¿Es propia o impropia? 7/7', 'impropia', 'Impropia: el numerador (7) es igual al denominador (7).']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones → decimales',
    tipo: 'decimal',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('m', 73, 10),
    items: [
      ['Convierte la fracción 3/5 a número decimal.', 0.6, 'Divide: 3 ÷ 5 = 0.6.'],
      ['Convierte la fracción 7/10 a número decimal.', 0.7, 'Divide: 7 ÷ 10 = 0.7.'],
      ['Convierte la fracción 3/8 a número decimal.', 0.375, 'Divide: 3 ÷ 8 = 0.375.'],
      ['Convierte la fracción 5/4 a número decimal.', 1.25, 'Divide: 5 ÷ 4 = 1.25.'],
      ['Convierte la fracción 7/2 a número decimal.', 3.5, 'Divide: 7 ÷ 2 = 3.5.'],
      ['Convierte la fracción 9/8 a número decimal.', 1.125, 'Divide: 9 ÷ 8 = 1.125.'],
      ['Convierte la fracción 4/5 a número decimal.', 0.8, 'Divide: 4 ÷ 5 = 0.8.'],
      ['Convierte la fracción 11/4 a número decimal.', 2.75, 'Divide: 11 ÷ 4 = 2.75.'],
      ['Convierte la fracción 19/10 a número decimal.', 1.9, 'Divide: 19 ÷ 10 = 1.9.'],
      ['Convierte la fracción 13/5 a número decimal.', 2.6, 'Divide: 13 ÷ 5 = 2.6.']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Fracciones · Simplificación (forma irreducible)',
    tipo: 'fraccion_simplificada',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('m', 83, 10),
    items: [
      ['Simplifica 9/15 a su forma irreducible.', '3/5', 'Divide entre su mcd (el de 9 y 15 es 3): 9/15 = 3/5.'],
      ['Simplifica 14/35 a su forma irreducible.', '2/5', 'Divide entre su mcd (el de 14 y 35 es 7): 14/35 = 2/5.'],
      ['Simplifica 6/14 a su forma irreducible.', '3/7', 'Divide entre su mcd (el de 6 y 14 es 2): 6/14 = 3/7.'],
      ['Simplifica 16/24 a su forma irreducible.', '2/3', 'Divide entre su mcd (el de 16 y 24 es 8): 16/24 = 2/3.'],
      ['Simplifica 25/35 a su forma irreducible.', '5/7', 'Divide entre su mcd (el de 25 y 35 es 5): 25/35 = 5/7.'],
      ['Simplifica 8/20 a su forma irreducible.', '2/5', 'Divide entre su mcd (el de 8 y 20 es 4): 8/20 = 2/5.'],
      ['Simplifica 21/36 a su forma irreducible.', '7/12', 'Divide entre su mcd (el de 21 y 36 es 3): 21/36 = 7/12.'],
      ['Simplifica 15/40 a su forma irreducible.', '3/8', 'Divide entre su mcd (el de 15 y 40 es 5): 15/40 = 3/8.'],
      ['Simplifica 24/30 a su forma irreducible.', '4/5', 'Divide entre su mcd (el de 24 y 30 es 6): 24/30 = 4/5.'],
      ['Simplifica 28/49 a su forma irreducible.', '4/7', 'Divide entre su mcd (el de 28 y 49 es 7): 28/49 = 4/7.']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Números Negativos · Introducción',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    ids: ids('m', 93, 10),
    items: [
      ['Escribe el símbolo que representa a los números negativos.', '-', 'El signo de los números negativos es MENOS (-), se escribe antes del número, por ejemplo: -5.'],
      ['Determina si el número -15 es mayor o menor que 0. (escribe: mayor o menor)', 'menor', 'En la recta numérica, -15 está a la izquierda del cero, por lo tanto es MENOR que 0.'],
      ['Indica qué número de la recta numérica no es ni positivo ni negativo.', '0', 'El cero (0) es el elemento neutro: no tiene signo y no es positivo ni negativo.'],
      ['¿De qué lado de la recta numérica (izquierda o derecha) se ubican los números negativos?', 'izquierda', 'Los números negativos van a la IZQUIERDA del cero; los positivos, a la derecha.'],
      ['En la recta numérica, ¿el -2 está a la derecha o a la izquierda del -4?', 'derecha', 'En la recta, -2 está más cerca del cero que -4, por lo tanto -2 queda a la DERECHA de -4.'],
      ['¿Cuál número está más cerca del cero: -1 o -5?', '-1', 'Compara los valores absolutos: |-1| = 1 y |-5| = 5; el más pequeño es -1, así que está más cerca del cero.'],
      ['Coloca el signo mayor que (>) o menor que (<) según corresponda: -3 ___ -1', '<', 'En la recta, -3 está a la izquierda de -1, por lo tanto -3 < -1: el signo es <.'],
      ['Ordena de menor a mayor los valores -4, 3, -1, 0 y -6. (escríbelos separados por comas y espacios)', '-6, -4, -1, 0, 3', 'En la recta numérica, de menor a mayor quedan: -6, -4, -1, 0, 3.'],
      ['Expresa con un número negativo una deuda de 50 dólares.', '-50', 'Una deuda es dinero que se debe, por eso se representa con signo negativo: -50.'],
      ['El termómetro marcó 3 grados bajo cero. ¿Qué número negativo lo representa?', '-3', 'Bajo cero significa menor que 0; "3 grados bajo cero" se escribe como -3.']
    ]
  },
  {
    materia: 'matematicas',
    tema: 'Números Negativos · Práctica Extra',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    ids: ids('m', 103, 10),
    items: [
      ['Escribe el símbolo que se coloca antes de un número negativo.', '-', 'El signo negativo es MENOS (-), por ejemplo: -8.'],
      ['Determina si el número -29 es mayor o menor que 0. (escribe: mayor o menor)', 'menor', 'En la recta numérica, -29 está a la izquierda del cero, por lo tanto es MENOR que 0.'],
      ['El número que separa a los positivos de los negativos en la recta numérica es...', '0', 'El cero (0) es el elemento neutro: no es positivo ni negativo.'],
      ['¿De qué lado de la recta numérica (izquierda o derecha) del cero están los números como -7 y -12?', 'izquierda', 'Los números negativos se ubican a la IZQUIERDA del cero.'],
      ['En la recta numérica, ¿el -6 está a la derecha o a la izquierda del -9?', 'derecha', '-6 está más cerca del cero que -9, por lo tanto queda a la DERECHA de -9.'],
      ['¿Cuál número está más cerca del cero: -3 o -8?', '-3', 'Compara los valores absolutos: |-3| = 3 y |-8| = 8; -3 está más cerca del cero.'],
      ['Coloca el signo mayor que (>) o menor que (<) según corresponda: -7 ___ -2', '<', 'En la recta, -7 está a la izquierda de -2, por lo tanto -7 < -2: el signo es <.'],
      ['Ordena de menor a mayor los valores -8, 2, -5, 0 y -10. (escríbelos separados por comas y espacios)', '-10, -8, -5, 0, 2', 'En la recta numérica, de menor a mayor quedan: -10, -8, -5, 0, 2.'],
      ['Un cliente retiró 120 dólares y su cuenta quedó en deuda. ¿Qué número negativo representa esa deuda?', '-120', 'Una deuda es dinero que se debe, por eso se representa con signo negativo: -120.'],
      ['En el Polo Sur el termómetro marcó 18 grados bajo cero. ¿Qué número negativo lo representa?', '-18', '18 grados bajo cero se escribe con signo negativo: -18.']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Artículos · A y An',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 53, 10),
    items: [
      ['I have ___ apple. (a / an)', 'an', 'Antes de una palabra que empieza con vocal (a, e, i, o, u) se usa "an": an apple.'],
      ['She is eating ___ banana. (a / an)', 'a', 'Banana empieza con consonante (b) → se usa "a".'],
      ['This is ___ orange. (a / an)', 'an', 'Orange empieza con vocal (o) → se usa "an".'],
      ['He has ___ dog. (a / an)', 'a', 'Dog empieza con consonante (d) → se usa "a".'],
      ['It is ___ umbrella. (a / an)', 'an', 'Umbrella empieza con vocal (u) → se usa "an".'],
      ['We need ___ pencil. (a / an)', 'a', 'Pencil empieza con consonante (p) → se usa "a".'],
      ['I see ___ elephant. (a / an)', 'an', 'Elephant empieza con vocal (e) → se usa "an".'],
      ['My mom is ___ teacher. (a / an)', 'a', 'Teacher empieza con consonante (t) → se usa "a".'],
      ['That is ___ egg. (a / an)', 'an', 'Egg empieza con vocal (e) → se usa "an".'],
      ['She wears ___ red dress. (a / an)', 'a', 'El artículo mira la primera letra de la siguiente palabra; "red" empieza con consonante (r) → se usa "a".']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Sustantivos plurales',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 63, 10),
    items: [
      ['Escribe el plural de: book', 'books', 'A la mayoría de los sustantivos solo se les agrega una -s: book → books.'],
      ['Escribe el plural de: box', 'boxes', 'Los sustantivos que terminan en s, x, ch o sh agregan -es: box → boxes.'],
      ['Escribe el plural de: child', 'children', '"Child" es irregular: su plural es children (niños).'],
      ['Escribe el plural de: city', 'cities', 'Cuando termina en consonante + y, se cambia la y por i y se agrega -es: city → cities.'],
      ['Escribe el plural de: dog', 'dogs', 'A la mayoría de los sustantivos solo se les agrega una -s: dog → dogs.'],
      ['Escribe el plural de: person', 'people', '"Person" es irregular: su plural es people (personas).'],
      ['Escribe el plural de: brush', 'brushes', 'Las palabras que terminan en sh agregan -es: brush → brushes.'],
      ['Escribe el plural de: man', 'men', '"Man" es irregular: su plural es men (hombres).'],
      ['Escribe el plural de: tomato', 'tomatoes', 'Los sustantivos que terminan en -o como tomato agregan -es: tomato → tomatoes.'],
      ['Escribe el plural de: foot', 'feet', '"Foot" es irregular: su plural es feet (pies).']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Adjetivos posesivos',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 73, 10),
    items: [
      ['This is ___ book. It belongs to me. (my / mine)', 'my', '"My" se usa antes de un sustantivo para indicar que es mío: my book.'],
      ['___ name is Ana. (Her / His)', 'her', 'Ana es ella (she) → su nombre es "her name".'],
      ['Pedro has a bike. ___ bike is red. (His / Her)', 'his', 'Pedro es él (he) → su bicicleta es "his bike".'],
      ['We live in this house. ___ house is big. (Our / Their)', 'our', 'Con "we" (nosotros) → nuestra casa es "our house".'],
      ["The cat is washing ___ face. (its / it's)", 'its', 'Para animales y cosas se usa "its" (su): its face.'],
      ['___ parents are doctors. They work at the hospital. (Their / There)', 'their', 'Con "they" (ellos) → sus padres son "their parents".'],
      ["You forgot ___ backpack. (your / you're)", 'your', 'Con "you" (tú) → tu mochila es "your backpack".'],
      ['María loves ___ dog. (her / his)', 'her', 'María es ella (she) → su perro es "her dog".'],
      ['The students do ___ homework every night. (their / our)', 'their', 'The students = they → su tarea es "their homework".'],
      ['___ uncle is very funny. (My / Mine)', 'my', '"My" siempre va antes de un sustantivo: my uncle.']
    ]
  },
  {
    materia: 'ingles',
    tema: 'There is / There are',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 83, 10),
    items: [
      ['___ a cat on the roof. (there is / there are)', 'there is', 'Un solo gato (singular) → "There is a cat".'],
      ['___ three apples on the table. (there is / there are)', 'there are', 'Tres manzanas (plural) → "There are three apples".'],
      ['___ a park near my house. (there is / there are)', 'there is', 'Un parque (singular) → "There is a park".'],
      ['___ many stars in the sky. (there is / there are)', 'there are', 'Muchas estrellas (plural) → "There are many stars".'],
      ['___ milk in the fridge. (there is / there are)', 'there is', 'La leche es incontable y singular → "There is milk".'],
      ['___ two dogs in the yard. (there is / there are)', 'there are', 'Dos perros (plural) → "There are two dogs".'],
      ['___ a book on the desk. (there is / there are)', 'there is', 'Un libro (singular) → "There is a book".'],
      ['___ some eggs in the basket. (there is / there are)', 'there are', 'Varios huevos (plural) → "There are some eggs".'],
      ['___ a beautiful garden downtown. (there is / there are)', 'there is', 'Un jardín (singular) → "There is a garden".'],
      ['___ four windows in the classroom. (there is / there are)', 'there are', 'Cuatro ventanas (plural) → "There are four windows".']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Presente simple · -s en tercera persona',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 93, 10),
    items: [
      ['She ___ soccer on weekends. (play / plays)', 'plays', 'Con he/she/it el verbo agrega -s: she plays.'],
      ['My father ___ at a bank. (work / works)', 'works', 'My father = he → el verbo lleva -s: works.'],
      ['He ___ TV every night. (watch / watches)', 'watches', 'Los verbos que terminan en ch agregan -es: he watches.'],
      ['The bird ___ very high. (fly / flies)', 'flies', 'Los verbos que terminan en consonante + y cambian la y por -ies: it flies.'],
      ['Maria ___ ice cream. (like / likes)', 'likes', 'Maria = she → el verbo agrega -s: likes.'],
      ['My brother ___ to school by bus. (go / goes)', 'goes', 'El verbo "go" en tercera persona es "goes".'],
      ['The dog ___ in the park. (run / runs)', 'runs', 'The dog = it → el verbo agrega -s: runs.'],
      ['She ___ English every day. (study / studies)', 'studies', 'Termina en consonante + y → cambia a -ies: studies.'],
      ['Tom ___ a book at night. (read / reads)', 'reads', 'Tom = he → el verbo agrega -s: reads.'],
      ['My mom ___ delicious food. (cook / cooks)', 'cooks', 'My mom = she → el verbo agrega -s: cooks.']
    ]
  },
  {
    materia: 'ingles',
    tema: 'Vocabulario · Objetos de clase',
    tipo: 'texto',
    metodologia: 'Estándar / Directo',
    sobrescribir: true,
    ids: ids('i', 103, 10),
    items: [
      ['¿Cómo se dice "lápiz" en inglés?', 'pencil', 'Lápiz en inglés es "pencil".'],
      ['¿Cómo se dice "libro" en inglés?', 'book', 'Libro en inglés es "book".'],
      ['¿Cómo se dice "silla" en inglés?', 'chair', 'Silla en inglés es "chair".'],
      ['¿Cómo se dice "mochila" en inglés?', 'backpack', 'Mochila en inglés es "backpack".'],
      ['¿Cómo se dice "borrador" en inglés?', 'eraser', 'Borrador en inglés es "eraser".'],
      ['¿Cómo se dice "tablero" en inglés?', 'board', 'Tablero en inglés es "board".'],
      ['¿Cómo se dice "regla" en inglés?', 'ruler', 'Regla en inglés es "ruler".'],
      ['¿Cómo se dice "cuaderno" en inglés?', 'notebook', 'Cuaderno en inglés es "notebook".'],
      ['¿Cómo se dice "mesa" en inglés?', 'table', 'Mesa en inglés es "table".'],
      ['¿Cómo se dice "crayones" en inglés?', 'crayons', 'Crayones en inglés es "crayons".']
    ]
  }
];

/** Una tarea por tema, publicada y asignada al docente-001 (UID del seed-auth). */
const TAREAS = [
  {
    id: 't-ing-verbo-to-be-afirmativo',
    titulo: 'Verbo To Be — Afirmativo',
    descripcion: 'Completa cada oración con la forma correcta del verbo to be: am, is o are.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('i', 23, 10)
  },
  {
    id: 't-ing-verbo-to-be-negativo',
    titulo: 'Verbo To Be — Negativo',
    descripcion: "Completa cada oración con la forma negativa del verbo to be: am not, isn't o aren't.",
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('i', 33, 10)
  },
  {
    id: 't-ing-verbo-to-be-preguntas',
    titulo: 'Verbo To Be — Preguntas',
    descripcion: 'Completa cada pregunta con Am, Is o Are.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('i', 43, 10)
  },
  {
    id: 't-ing-articulos-a-an',
    titulo: 'Artículos — A y An',
    descripcion: 'Completa cada oración con el artículo correcto: a (consonante) o an (vocal).',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 53, 10)
  },
  {
    id: 't-ing-sustantivos-plurales',
    titulo: 'Sustantivos Plurales',
    descripcion: 'Escribe el plural de cada sustantivo aplicando las reglas (-s, -es, -ies) y los plurales irregulares.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 63, 10)
  },
  {
    id: 't-ing-adjetivos-posesivos',
    titulo: 'Adjetivos Posesivos',
    descripcion: 'Elige el adjetivo posesivo correcto: my, your, his, her, its, our o their.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 73, 10)
  },
  {
    id: 't-ing-there-is-there-are',
    titulo: 'There Is / There Are',
    descripcion: 'Completa cada oración con there is (singular) o there are (plural) para hablar de lo que existe.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 83, 10)
  },
  {
    id: 't-ing-presente-simple',
    titulo: 'Presente Simple — Tercera Persona',
    descripcion: 'Completa las oraciones conjugando el verbo en presente simple con he, she o it (agrega -s, -es o -ies).',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 93, 10)
  },
  {
    id: 't-ing-vocabulario-objetos-de-clase',
    titulo: 'Vocabulario — Objetos de Clase',
    descripcion: 'Traduce al inglés el nombre de los objetos que encuentras todos los días en el salón de clase.',
    materia: 'ingles',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-09-01T00:00:00.000Z',
    fechaActualizacion: '2026-09-01T00:00:00.000Z',
    ejercicios: ids('i', 103, 10)
  },
  {
    id: 't-mat-suma-mismo-denominador',
    titulo: 'Suma de Fracciones — Mismo Denominador',
    descripcion: 'Suma las fracciones. Cuando el denominador es igual, solo se suman los numeradores.',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 33, 10)
  },
  {
    id: 't-mat-suma-diferente-denominador',
    titulo: 'Suma de Fracciones — Diferente Denominador',
    descripcion: 'Suma las fracciones aplicando la regla de la carita sonriente (multiplicación en cruz).',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Paso a Paso (Carita Sonriente)',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 43, 10)
  },
  {
    id: 't-mat-division-fracciones',
    titulo: 'División de Fracciones',
    descripcion: 'Divide las fracciones: multiplica la primera por el inverso de la segunda (multiplicación en cruz).',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 53, 10)
  },
  {
    id: 't-mat-propia-e-impropia',
    titulo: 'Fracciones Propias e Impropias',
    descripcion: 'Indica si cada fracción es propia (numerador menor que el denominador) o impropia (numerador mayor o igual).',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 63, 10)
  },
  {
    id: 't-mat-fraccion-a-decimal',
    titulo: 'Conversión de Fracciones a Decimales',
    descripcion: 'Divide el numerador entre el denominador para obtener el número decimal de cada fracción.',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 73, 10)
  },
  {
    id: 't-mat-simplificacion-fracciones',
    titulo: 'Simplificación de Fracciones',
    descripcion: 'Simplifica cada fracción hasta su forma irreducible, dividiendo numerador y denominador entre su máximo común divisor (mcd).',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-21T00:00:00.000Z',
    fechaActualizacion: '2026-08-21T00:00:00.000Z',
    ejercicios: ids('m', 83, 10)
  },
  {
    id: 't-mat-introduccion-numeros-negativos',
    titulo: 'Introducción a los Números Negativos',
    descripcion: 'Aprende a usar el signo menos, ubicar números negativos en la recta numérica, compararlos con el cero y ordenarlos de menor a mayor.',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-30T00:00:00.000Z',
    fechaActualizacion: '2026-08-30T00:00:00.000Z',
    ejercicios: ids('m', 93, 10)
  },
  {
    id: 't-mat-numeros-negativos-practica',
    titulo: 'Números Negativos — Práctica Extra',
    descripcion: 'Repasa la recta numérica, la comparación con el cero y el orden de los números negativos con una práctica adicional.',
    materia: 'matematicas',
    docenteId: 'docente-001',
    estado: 'publicada',
    metodologia: 'Estándar / Directo',
    fechaCreacion: '2026-08-30T00:00:00.000Z',
    fechaActualizacion: '2026-08-30T00:00:00.000Z',
    ejercicios: ids('m', 103, 10)
  }
];

function inyectar() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ No se encontró backend/data/db.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.ejercicios) data.ejercicios = {};
  if (!data.tareas) data.tareas = {};

  let agregados = 0;

  // 1) Ejercicios nuevos (uno por ítem de cada tema).
  //    Temas con `sobrescribir: true` reemplazan el contenido de IDs existentes.
  TEMAS.forEach((tema) => {
    tema.items.forEach(([enunciado, respuesta, pista], idx) => {
      const id = tema.ids[idx];
      const existente = data.ejercicios[id];
      if (existente && !tema.sobrescribir) {
        console.log(`ℹ️  ${id} ya existe, se omite.`);
        return;
      }
      data.ejercicios[id] = {
        materia: tema.materia,
        tema: tema.tema,
        enunciado: enunciado,
        tipo: tema.tipo,
        respuestaCorrecta: respuesta,
        pistaError: pista,
        metodologia: tema.metodologia,
        ...(tema.opciones ? { opciones: tema.opciones } : {})
      };
      agregados += 1;
      console.log(`${existente ? '🔄 actualizado' : '✅ añadido'} ${id} → ${enunciado} = ${respuesta}`);
    });
  });

  // 2) Tareas nuevas (una por tema, con el orden de sus ejercicios)
  let tareas = 0;
  TAREAS.forEach(({ ejercicios, ...tarea }) => {
    if (data.tareas[tarea.id]) {
      console.log(`ℹ️  Tarea ${tarea.id} ya existe, se omite.`);
      return;
    }
    data.tareas[tarea.id] = {
      ...tarea,
      ejercicios: ejercicios.map((ejercicioId, idx) => ({
        ejercicioId,
        orden: idx + 1,
        fechaAgregado: tarea.fechaCreacion
      }))
    };
    tareas += 1;
    console.log(`✅ tarea ${tarea.id} → ${ejercicios.length} ejercicios`);
  });

  if (agregados || tareas) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n🎉 Inyección completada: ${agregados} ejercicio(s) y ${tareas} tarea(s).`);
    console.log('➡️  Para subirlos a Firestore real, ejecuta:  node seed.js');
  } else {
    console.log('\nℹ️  No se agregó nada (todo ya estaba).');
  }
}

inyectar();