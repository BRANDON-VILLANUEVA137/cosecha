/**
 * CAPA DE DATOS — simula Firestore con un archivo JSON en disco.
 * En producción se reemplaza por el SDK de Firestore real.
 * db.collection('x').doc(id).set({...}) → mismas firmas que el SDK real.
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

class MockFirestore {
  constructor() {
    this._read();
  }

  _read() {
    if (fs.existsSync(DB_FILE)) {
      this.data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
      this.data = this._seed();
      this._write();
    }
  }

  _write() {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
  }

  collection(name) {
    if (!this.data[name]) this.data[name] = {};
    const self = this;
    return {
      doc(id) {
        id = id || 'id_' + Math.random().toString(36).slice(2, 9);
        return {
          id,
          set(obj) { self.data[name][id] = obj; self._write(); return { id, ...obj }; },
          get() { return self.data[name][id]; },
          update(patch) { self.data[name][id] = { ...(self.data[name][id] || {}), ...patch }; self._write(); }
        };
      },
      all() { return Object.entries(self.data[name]).map(([id, v]) => ({ id, ...v })); },
      where(field, val) { return this.all().filter(d => d[field] === val); }
    };
  }

  _seed() {
    const seed = { ejercicios: {}, prendas: {}, logros: {} };

    // ---- Ejercicios: Matemáticas (fracciones) ----
    seed.ejercicios['m1'] = { materia: 'matematicas', tema: 'Fracciones · mismo denominador', enunciado: '6/6 + 9/6 = ?', tipo: 'fraccion', respuestaCorrecta: '15/6', pistaError: 'Si el denominador es igual, se deja igual y solo se suman los numeradores.' };
    seed.ejercicios['m2'] = { materia: 'matematicas', tema: 'Fracciones · mismo denominador', enunciado: '22/25 + 15/25 = ?', tipo: 'fraccion', respuestaCorrecta: '37/25', pistaError: 'Revisa si sumaste correctamente los numeradores (el denominador no cambia).' };
    seed.ejercicios['m3'] = { materia: 'matematicas', tema: 'Fracciones · Carita Sonriente', enunciado: '2/5 + 3/10 = ?', tipo: 'fraccion', respuestaCorrecta: '7/10', pistaError: 'Denominador diferente: aplica la regla de la carita sonriente (multiplica en cruz) antes de sumar.' };
    seed.ejercicios['m4'] = { materia: 'matematicas', tema: 'Fracciones · Carita Sonriente', enunciado: '3/8 + 5/4 = ?', tipo: 'fraccion', respuestaCorrecta: '13/8', pistaError: 'Recuerda multiplicar en cruz los numeradores con el denominador contrario, y los denominadores entre sí.' };
    seed.ejercicios['m5'] = { materia: 'matematicas', tema: 'Multiplicación de fracciones', enunciado: '3/5 x 2/7 = ?', tipo: 'fraccion', respuestaCorrecta: '6/35', pistaError: 'En la multiplicación no se busca denominador común: numerador por numerador, denominador por denominador.' };

    // ---- Ejercicios: Inglés ----
    seed.ejercicios['i1'] = { materia: 'ingles', tema: 'Verbo to be', enunciado: 'My brother ___ happy. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'is', pistaError: '"My brother" es él (singular) → usa la forma para he/she/it.' };
    seed.ejercicios['i2'] = { materia: 'ingles', tema: 'Verbo to be', enunciado: 'Sofía and Pedro ___ friends. (am / is / are)', tipo: 'texto', respuestaCorrecta: 'are', pistaError: 'Cuando son varias personas (plural), el verbo to be usa la forma para we/they/you.' };
    seed.ejercicios['i3'] = { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"The dog and the cat" → ¿qué pronombre los reemplaza?', tipo: 'texto', respuestaCorrecta: 'they', pistaError: 'Son varios (animales/cosas en plural) → el pronombre para varios es "they".' };
    seed.ejercicios['i4'] = { materia: 'ingles', tema: 'Pronombres personales', enunciado: '"Maria and I" → ¿qué pronombre los reemplaza?', tipo: 'texto', respuestaCorrecta: 'we', pistaError: 'Cuando "yo" está incluido junto con otra persona, el pronombre es "we" (nosotros).' };

    // ---- Prendas (catálogo del armario) ----
    seed.prendas['camiseta-basica'] = { categoria: 'torso', shape: 'camiseta', nombre: 'Camiseta blanca', color: '#F4F4F4', origen: 'base', condicion: null };
    seed.prendas['pantalon-basico'] = { categoria: 'piernas', shape: 'pantalon_largo', nombre: 'Jean básico', color: '#4A6FA5', origen: 'base', condicion: null };
    seed.prendas['tenis-basico'] = { categoria: 'calzado', shape: 'tenis', nombre: 'Tenis blancos', color: '#EDEDED', origen: 'base', condicion: null };

    seed.prendas['buso-naranja'] = { categoria: 'torso', shape: 'buso', nombre: 'Buso Cosecha', color: '#FF8C33', origen: 'matematicas', condicion: { valor: 2 } };
    seed.prendas['gorro-citrico'] = { categoria: 'cabeza', shape: 'gorro', nombre: 'Gorro Cítrico', color: '#FFC93C', origen: 'matematicas', condicion: { valor: 4 } };
    seed.prendas['bolso-mandarina'] = { categoria: 'accesorio', shape: 'bolso', nombre: 'Bolso Mandarina', color: '#E8631B', origen: 'matematicas', condicion: { valor: 6 } };
    seed.prendas['botas-cosecha'] = { categoria: 'calzado', shape: 'botas', nombre: 'Botas Cosecha', color: '#2FA88A', origen: 'matematicas', condicion: { valor: 8 } };

    seed.prendas['camiseta-global'] = { categoria: 'torso', shape: 'camiseta', nombre: 'Camiseta Global', color: '#2FA88A', origen: 'ingles', condicion: { valor: 2 } };
    seed.prendas['sombrero-explorador'] = { categoria: 'cabeza', shape: 'sombrero', nombre: 'Sombrero Explorador', color: '#C99A12', origen: 'ingles', condicion: { valor: 4 } };
    seed.prendas['lentes-sol'] = { categoria: 'accesorio', shape: 'lentes', nombre: 'Lentes de Sol', color: '#1E6E7C', origen: 'ingles', condicion: { valor: 6 } };
    seed.prendas['short-aventura'] = { categoria: 'piernas', shape: 'pantalon_corto', nombre: 'Short Aventura', color: '#1E6E7C', origen: 'ingles', condicion: { valor: 8 } };

    seed.logros['estudiante_demo'] = {
      aciertosMatematicas: 0, aciertosIngles: 0, intentos: 0,
      desbloqueadas: ['camiseta-basica', 'pantalon-basico', 'tenis-basico'],
      equipo: { cabeza: null, torso: 'camiseta-basica', piernas: 'pantalon-basico', calzado: 'tenis-basico', accesorio: null },
      historial: []
    };

    return seed;
  }
}

const db = new MockFirestore();
module.exports = db;