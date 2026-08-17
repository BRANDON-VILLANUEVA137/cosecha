/**
 * PERSONAJE — dibuja un muñeco de papel (SVG) según el equipo puesto.
 * Recibe el equipo y el catálogo de prendas ya cargado.
 */
const Personaje = {
  ICONS_CATEGORIA: {
    cabeza: { gorro: '🧢', sombrero: '👒' },
    torso: { camiseta: '👕', buso: '🧥' },
    piernas: { pantalon_largo: '👖', pantalon_corto: '🩳' },
    calzado: { tenis: '👟', botas: '👢' },
    accesorio: { bolso: '🎒', lentes: '🕶️' }
  },
  NOMBRE_CATEGORIA: {
    cabeza: 'Cabeza', torso: 'Torso', piernas: 'Piernas',
    calzado: 'Calzado', accesorio: 'Accesorios'
  },

  pieza(prendas, id) {
    return prendas.find(p => p.id === id) || null;
  },

  renderSVG(equipo, prendas, size) {
    size = size || 220;
    const torso = this.pieza(prendas, equipo.torso) || { shape: 'camiseta', color: '#F4F4F4' };
    const piernas = this.pieza(prendas, equipo.piernas) || { shape: 'pantalon_largo', color: '#4A6FA5' };
    const calzado = this.pieza(prendas, equipo.calzado) || { shape: 'tenis', color: '#EDEDED' };
    const cabeza = this.pieza(prendas, equipo.cabeza);
    const accesorio = this.pieza(prendas, equipo.accesorio);
    const skin = '#FFD9A8', hair = '#6B4226';

    const mangaLarga = torso.shape === 'buso';
    const shortsStyle = piernas.shape === 'pantalon_corto';
    const botasStyle = calzado.shape === 'botas';

    let svg = `<svg viewBox="0 0 220 320" width="${size}" height="${size * 320 / 220}" xmlns="http://www.w3.org/2000/svg">`;

    // hair back
    svg += `<ellipse cx="110" cy="55" rx="48" ry="40" fill="${hair}"/>`;
    // arms (skin)
    svg += `<rect x="34" y="128" width="26" height="82" rx="13" fill="${skin}"/>`;
    svg += `<rect x="160" y="128" width="26" height="82" rx="13" fill="${skin}"/>`;
    // legs (skin base)
    svg += `<rect x="76" y="228" width="26" height="76" rx="10" fill="${skin}"/>`;
    svg += `<rect x="118" y="228" width="26" height="76" rx="10" fill="${skin}"/>`;
    // pants overlay
    const pantH = shortsStyle ? 38 : 76;
    svg += `<rect x="76" y="228" width="26" height="${pantH}" rx="10" fill="${piernas.color}"/>`;
    svg += `<rect x="118" y="228" width="26" height="${pantH}" rx="10" fill="${piernas.color}"/>`;
    // shoes
    if (botasStyle) {
      svg += `<rect x="72" y="286" width="34" height="26" rx="9" fill="${calzado.color}"/>`;
      svg += `<rect x="114" y="286" width="34" height="26" rx="9" fill="${calzado.color}"/>`;
    } else {
      svg += `<ellipse cx="89" cy="304" rx="21" ry="11" fill="${calzado.color}" stroke="#00000018" stroke-width="2"/>`;
      svg += `<ellipse cx="131" cy="304" rx="21" ry="11" fill="${calzado.color}" stroke="#00000018" stroke-width="2"/>`;
    }
    // torso
    svg += `<ellipse cx="110" cy="292" rx="54" ry="12" fill="#00000010"/>`;
    svg += `<rect x="62" y="118" width="96" height="112" rx="26" fill="${torso.color}" stroke="#00000012" stroke-width="2"/>`;
    // sleeves overlay
    const sleeveH = mangaLarga ? 74 : 36;
    svg += `<rect x="34" y="128" width="26" height="${sleeveH}" rx="13" fill="${torso.color}"/>`;
    svg += `<rect x="160" y="128" width="26" height="${sleeveH}" rx="13" fill="${torso.color}"/>`;
    // hands
    svg += `<circle cx="47" cy="214" r="13" fill="${skin}"/>`;
    svg += `<circle cx="173" cy="214" r="13" fill="${skin}"/>`;
    // neck
    svg += `<rect x="98" y="98" width="24" height="22" fill="${skin}"/>`;
    // head + face
    svg += `<circle cx="110" cy="66" r="40" fill="${skin}" stroke="#E8A96B" stroke-width="2"/>`;
    svg += `<circle cx="95" cy="66" r="4.5" fill="#3A2A1E"/><circle cx="125" cy="66" r="4.5" fill="#3A2A1E"/>`;
    svg += `<rect x="96" y="96" width="28" height="10" rx="5" fill="#F4C79A"/>`;
    svg += `<circle cx="88" cy="74" r="3" fill="#F6A97A" opacity="0.35"/><circle cx="132" cy="74" r="3" fill="#F6A97A" opacity="0.35"/>`;
    svg += `<path d="M95 80 Q110 90 125 80" stroke="#B5651D" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    // hair fringe
    svg += `<path d="M70 48 Q76 22 110 21 Q144 22 150 48 Q140 34 110 34 Q80 34 70 48 Z" fill="${hair}"/>`;
    // headwear
    if (cabeza && cabeza.shape === 'gorro') {
      svg += `<ellipse cx="110" cy="40" rx="49" ry="27" fill="${cabeza.color}"/>`;
      svg += `<rect x="61" y="52" width="98" height="12" rx="6" fill="${cabeza.color}"/>`;
      svg += `<circle cx="110" cy="11" r="8" fill="${cabeza.color}"/>`;
    } else if (cabeza && cabeza.shape === 'sombrero') {
      svg += `<ellipse cx="110" cy="46" rx="72" ry="13" fill="${cabeza.color}"/>`;
      svg += `<rect x="83" y="8" width="54" height="40" rx="12" fill="${cabeza.color}"/>`;
    }
    // accesorio
    if (accesorio && accesorio.shape === 'bolso') {
      svg += `<line x1="150" y1="150" x2="120" y2="112" stroke="${accesorio.color}" stroke-width="7" stroke-linecap="round"/>`;
      svg += `<rect x="148" y="150" width="36" height="46" rx="11" fill="${accesorio.color}"/>`;
    } else if (accesorio && accesorio.shape === 'lentes') {
      svg += `<circle cx="95" cy="66" r="10" fill="none" stroke="${accesorio.color}" stroke-width="3.5"/>`;
      svg += `<circle cx="125" cy="66" r="10" fill="none" stroke="${accesorio.color}" stroke-width="3.5"/>`;
      svg += `<line x1="105" y1="66" x2="115" y2="66" stroke="${accesorio.color}" stroke-width="3.5"/>`;
    }
    svg += `</svg>`;
    return svg;
  },

  /* ================= Cosecha 2.0 ================= */

  // ---------- Rangos / Tier de marco ----------
  RANGOS: [
    { nombre: 'madera', nivel: 1, icono: '🪵', color: '#8B5A2B' },
    { nombre: 'bronce', nivel: 3, icono: '🟤', color: '#CD7F32' },
    { nombre: 'plata', nivel: 5, icono: '🏅', color: '#C0C0C0' },
    { nombre: 'oro', nivel: 8, icono: '🟡', color: '#FFD700' },
    { nombre: 'cristal', nivel: 12, icono: '🔮', color: '#87CEEB' },
    { nombre: 'citrico-legendario', nivel: 18, icono: '🍊✨', color: '#FF8C33' }
  ],

  rangoDeNivel(nivel) {
    let rango = this.RANGOS[0];
    for (const r of this.RANGOS) if (nivel >= r.nivel) rango = r;
    return rango;
  },

  // ---------- DiceBear (personaje principal) ----------
  generarUrlDiceBear(equipo, prendas, extra = {}) {
    const seed = (extra.seed || 'cosecha').toString().replace(/[^a-zA-Z0-9_-]+/g, '');
    const params = new URLSearchParams({ seed });
    const dias = (extra.racha && extra.racha.dias) || 0;
    if (dias >= 7) params.set('facialExpression', 'smile');
    else if (dias >= 3) params.set('facialExpression', 'serious');
    const orden = ['torso', 'cabeza', 'accesorio', 'avatar'];
    orden.forEach(cat => {
      const id = equipo && equipo[cat];
      if (!id) return;
      const prenda = (prendas || []).find(p => p.id === id);
      if (prenda && prenda.dicebearOptions) {
        Object.entries(prenda.dicebearOptions).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') params.set(k, v);
        });
      } else {
        // Ítem sin dicebearOptions (catálogo viejo / preview): aplicar un
        // parámetro por defecto según la categoría para una URL siempre válida.
        const param = this.PARAM_MAP && this.PARAM_MAP[cat];
        const val = param && this.PARAM_DEFAULT && this.PARAM_DEFAULT[param];
        if (param && val) params.set(param, val);
      }
    });
    return `https://api.dicebear.com/7.x/adventurer/svg?${params.toString()}`;
  },

  // ---------- Personajes (avatares elegibles por el docente) ----------
  // Cada personaje tiene un seed curado que le da su apariencia. El docente
  // lo elige visualmente (con vista previa) y ese seed queda guardado en el
  // logro del estudiante (`personaje`). En el estilo adventurer de DiceBear
  // solo el seed define la apariencia (gender es ignorado).
  PERSONAJES: [
    { id: 'personaje-mateo',     nombre: 'Mateo',     genero: 'masculino', seed: 'mateo' },
    { id: 'personaje-sam',       nombre: 'Sam',       genero: 'masculino', seed: 'sam' },
    { id: 'personaje-leo',       nombre: 'Leo',       genero: 'masculino', seed: 'leo' },
    { id: 'personaje-diego',     nombre: 'Diego',     genero: 'masculino', seed: 'diego' },
    { id: 'personaje-valentina', nombre: 'Valentina', genero: 'femenino',  seed: 'valentina' },
    { id: 'personaje-sofia',     nombre: 'Sofía',     genero: 'femenino',  seed: 'sofia' },
    { id: 'personaje-mia',       nombre: 'Mía',       genero: 'femenino',  seed: 'mia' },
    { id: 'personaje-camila',    nombre: 'Camila',    genero: 'femenino',  seed: 'camila' }
  ],

  urlDePersonaje(personaje) {
    if (!personaje || !personaje.seed) return null;
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(personaje.seed)}`;
  },

  // ---------- OpenPeeps (foto de perfil, inline) ----------
  OPENPEEPS_VARIANTES: {
    p1: { skin: '#FFD9A8', hair: '#6B4226', camisa: '#FF8C33', pelo: 'corto', glasses: false },
    p2: { skin: '#E8B88D', hair: '#3A2A1E', camisa: '#2FA88A', pelo: 'largo', glasses: false },
    p3: { skin: '#FFD9A8', hair: '#D4AF37', camisa: '#4A6FA5', pelo: 'rizado', glasses: true },
    p4: { skin: '#F8C89D', hair: '#5D4037', camisa: '#FFC93C', pelo: 'corto', glasses: false },
    p5: { skin: '#FFD9A8', hair: '#1E3A40', camisa: '#E8631B', pelo: 'largo', glasses: false },
    p6: { skin: '#E8B88D', hair: '#8B5A2B', camisa: '#6B6B8A', pelo: 'rizado', glasses: true }
  },

  renderOpenPeeps(variante, size = 120) {
    const s = this.OPENPEEPS_VARIANTES[variante] || this.OPENPEEPS_VARIANTES.p1;
    const largo = s.pelo === 'largo';
    const rizado = s.pelo === 'rizado';
    let svg = `<svg viewBox="0 0 120 150" width="${size}" height="${(size * 150) / 120}" xmlns="http://www.w3.org/2000/svg">`;
    if (largo) svg += `<path d="M26 52 Q18 90 40 104 L40 60 Q60 40 80 60 L80 104 Q102 90 94 52 Q60 30 26 52Z" fill="${s.hair}"/>`;
    else if (rizado) svg += `<path d="M24 50 Q20 30 40 26 Q60 22 80 26 Q100 30 96 50 Q100 40 80 42 Q60 44 40 42 Q20 40 24 50Z" fill="${s.hair}"/>`;
    else svg += `<path d="M26 52 Q30 26 60 24 Q90 26 94 52 Q80 34 60 34 Q40 34 26 52Z" fill="${s.hair}"/>`;
    svg += `<rect x="34" y="96" width="52" height="44" rx="16" fill="${s.camisa}"/>`;
    svg += `<rect x="22" y="104" width="12" height="24" rx="6" fill="${s.camisa}"/>`;
    svg += `<rect x="86" y="104" width="12" height="24" rx="6" fill="${s.camisa}"/>`;
    svg += `<circle cx="60" cy="62" r="34" fill="${s.skin}"/>`;
    svg += `<circle cx="26" cy="62" r="6" fill="${s.skin}"/><circle cx="94" cy="62" r="6" fill="${s.skin}"/>`;
    svg += `<circle cx="48" cy="60" r="3" fill="#3A2A1E"/><circle cx="72" cy="60" r="3" fill="#3A2A1E"/>`;
    svg += `<path d="M50 74 Q60 82 70 74" stroke="#B5651D" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    if (s.glasses) {
      svg += `<circle cx="48" cy="60" r="8" fill="none" stroke="#1E3A40" stroke-width="2"/><circle cx="72" cy="60" r="8" fill="none" stroke="#1E3A40" stroke-width="2"/><line x1="56" y1="60" x2="64" y2="60" stroke="#1E3A40" stroke-width="2"/>`;
    }
    svg += `</svg>`;
    return svg;
  },

  // ---------- Tabs del armario (combina categorías) ----------
  TABS_ARMARIO: [
    { id: 'avatar', ico: '👤', label: 'Avatar Base' },
    { id: 'marco', ico: '🖼️', label: 'Marcos de Perfil' },
    { id: 'cabeza', ico: '🧢', label: 'Cabeza / Acceso' },
    { id: 'torso', ico: '👕', label: 'Torso / Ropa' },
    { id: 'fondo', ico: '🌅', label: 'Fondos de Tarjeta' }
  ],
  CATEGORIAS_POR_TAB: {
    avatar: ['perfil', 'avatar'],
    marco: ['marco'],
    cabeza: ['cabeza', 'accesorio'],
    torso: ['torso'],
    fondo: ['fondo']
  },

  // Mapea cada categoría de personaje a un parámetro DiceBear (fallback)
  PARAM_MAP: { torso: 'clothing', cabeza: 'hat', accesorio: 'accessories', avatar: 'facialExpression' },
  PARAM_DEFAULT: { clothing: 'shirt', hat: 'beanie', accessories: 'glasses', facialExpression: 'smile' },
  EMOJI_CATEGORIA: { cabeza: '🧢', torso: '👕', accesorio: '🕶️', avatar: '🙂', perfil: '🧑' },

  // ---------- Open Peeps (Armario y Tienda) ----------
  preview(prendas, prenda) {
    // Para el Armario y Tienda: Renderizado exclusivo con Open Peeps
    // Si la prenda tiene una variante de Open Peeps, la usamos.
    // De lo contrario, simulamos la vista previa con Open Peeps.
    return `<div class="swatch-inline">${this.renderOpenPeeps(prenda.variante || 'p1', 60)}</div>`;
  },

  emojiDe(cat, prenda) {
    const o = prenda.dicebearOptions || {};
    if (o.hat) return '🧢';
    if (o.clothing) return '👕';
    if (o.accessories) return '🕶️';
    if (o.facialHair) return '🧔';
    if (o.facialExpression) return '🙂';
    return this.EMOJI_CATEGORIA[cat] || '🎁';
  }
};
Personaje.XP_PARA_NIVEL = function(n) {
  if (n <= 1) return 0;
  return Math.round(100 * n * (n - 1) / 2);
};

// ✅ Exponer Personaje en window para que los módulos (ESM) puedan acceder a él.
// Sin esto, `const Personaje = window.Personaje;` en los módulos queda `undefined`
// (los `const`/`let` globales de un script clásico NO son propiedades de window).
window.Personaje = Personaje;
