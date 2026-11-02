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

  /* ================= Muñeco entintado (SVG propio) =================
     Dibuja busto + ropa según lo equipado. Sin servicios externos.
     Usa del catálogo: shape y color (torso, cabeza, accesorio),
     dicebearOptions.facialExpression (avatar) y variante (perfil). */
  INK: '#1C130D',

  // Oscurece un color #RRGGBB (para sombreado plano de dos tonos)
  _oscuro(hex, f) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#00000033';
    const n = parseInt(m[1], 16);
    const c = v => Math.max(0, Math.round(v * (1 - f))).toString(16).padStart(2, '0');
    return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255);
  },

  renderSVG(equipo, prendas, size) {
    equipo = equipo || {};
    prendas = prendas || [];
    const INK = this.INK;
    const ink = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
    const get = id => (id ? this.pieza(prendas, id) : null);

    // Piel y pelo vienen del "perfil" elegido (variante OpenPeeps)
    const perfil = get(equipo.perfil);
    const v = this.OPENPEEPS_VARIANTES[(perfil && perfil.variante) || 'p1'] || this.OPENPEEPS_VARIANTES.p1;
    const piel = v.skin, pielSombra = this._oscuro(v.skin, 0.14), pelo = v.hair;

    const torso = get(equipo.torso) || { shape: 'camiseta', color: '#F4F4F4' };
    const cabeza = get(equipo.cabeza);
    const acc = get(equipo.accesorio);
    const avatar = get(equipo.avatar);
    const expr = (avatar && avatar.dicebearOptions && avatar.dicebearOptions.facialExpression) || 'smile';

    const tC = torso.color || '#F4F4F4';
    const tSombra = this._oscuro(tC, 0.2);
    let s = '';

    // --- pelo trasero (largo)
    if (v.pelo === 'largo') {
      s += `<path d="M52 72 Q44 132 62 146 L138 146 Q156 132 148 72 Q100 18 52 72Z" fill="${pelo}" ${ink}/>`;
    }

    // --- busto (cuerpo)
    s += `<path d="M26 200 Q26 150 72 142 L128 142 Q174 150 174 200Z" fill="${tC}"/>`;
    s += `<path d="M148 150 Q174 160 174 200 L144 200 Q154 172 148 150Z" fill="${tSombra}"/>`;

    // --- prenda según forma
    const f = torso.shape;
    if (f === 'buso') {
      const cap = this._oscuro(tC, 0.12);
      s += `<path d="M66 146 Q100 126 134 146 Q128 174 100 178 Q72 174 66 146Z" fill="${cap}" ${ink}/>`;
      s += `<path d="M70 182 L130 182 L138 200 L62 200Z" fill="${tSombra}" ${ink}/>`;
      s += `<path d="M92 158 L90 176 M108 158 L110 176" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    } else if (f === 'sueter') {
      s += `<path d="M30 192 L170 192 M28 198 L172 198" stroke="${tSombra}" stroke-width="4"/>`;
      s += `<path d="M44 164 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8" fill="none" stroke="${this._oscuro(tC, 0.35)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M82 144 Q100 160 118 144" fill="none" stroke="${tSombra}" stroke-width="7" stroke-linecap="round"/>`;
    } else if (f === 'chaleco') {
      s += `<path d="M26 200 Q26 150 72 142 L128 142 Q174 150 174 200Z" fill="#F4F4F4"/>`;
      s += `<path d="M62 146 L90 144 L98 200 L40 200 Q38 162 62 146Z" fill="${tC}" ${ink}/>`;
      s += `<path d="M138 146 L110 144 L102 200 L160 200 Q162 162 138 146Z" fill="${tC}" ${ink}/>`;
      s += `<circle cx="86" cy="170" r="3" fill="${INK}"/><circle cx="114" cy="170" r="3" fill="${INK}"/>`;
    } else { // camiseta
      s += `<path d="M84 143 Q100 162 116 143" fill="none" stroke="${tSombra}" stroke-width="7" stroke-linecap="round"/>`;
    }
    s += `<path d="M26 200 Q26 150 72 142 L128 142 Q174 150 174 200" fill="none" ${ink}/>`;

    // --- cuello
    s += `<path d="M86 122 L86 146 Q100 156 114 146 L114 122Z" fill="${piel}" ${ink}/>`;
    s += `<path d="M104 126 L114 124 L114 146 Q108 150 104 150Z" fill="${pielSombra}"/>`;

    // --- cabeza
    s += `<circle cx="57" cy="84" r="9" fill="${piel}" ${ink}/><circle cx="143" cy="84" r="9" fill="${piel}" ${ink}/>`;
    s += `<ellipse cx="100" cy="80" rx="43" ry="47" fill="${piel}"/>`;
    s += `<path d="M130 44 C148 70 146 100 124 124 C140 100 138 66 122 44Z" fill="${pielSombra}"/>`;
    s += `<ellipse cx="100" cy="80" rx="43" ry="47" fill="none" ${ink}/>`;

    // --- cara
    const eyeR = expr === 'surprised' ? 5.5 : 4.5;
    s += `<circle cx="84" cy="82" r="${eyeR}" fill="${INK}"/><circle cx="116" cy="82" r="${eyeR}" fill="${INK}"/>`;
    s += `<circle cx="82.5" cy="80.5" r="1.4" fill="#fff"/><circle cx="114.5" cy="80.5" r="1.4" fill="#fff"/>`;
    s += `<circle cx="76" cy="96" r="5" fill="#E8742A" opacity=".25"/><circle cx="124" cy="96" r="5" fill="#E8742A" opacity=".25"/>`;
    if (expr === 'serious') {
      s += `<path d="M74 70 L92 74 M126 70 L108 74" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
      s += `<path d="M88 106 L112 106" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
    } else if (expr === 'surprised') {
      s += `<path d="M74 68 Q84 60 94 68 M106 68 Q116 60 126 68" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      s += `<ellipse cx="100" cy="108" rx="7" ry="9" fill="${INK}"/>`;
    } else {
      s += `<path d="M84 102 Q100 118 116 102" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    }

    // --- pelo frontal
    if (v.pelo === 'rizado') {
      s += `<path d="M54 80 Q38 52 62 38 Q70 18 100 22 Q130 18 138 38 Q162 52 146 80 Q142 56 100 54 Q58 56 54 80Z" fill="${pelo}" ${ink}/>`;
    } else {
      s += `<path d="M55 78 Q56 28 100 26 Q144 28 145 78 Q134 50 100 50 Q66 50 55 78Z" fill="${pelo}" ${ink}/>`;
    }

    // --- gafas del perfil (variante con lentes)
    if (v.glasses) {
      s += `<circle cx="84" cy="82" r="13" fill="none" stroke="#1E3A40" stroke-width="3"/><circle cx="116" cy="82" r="13" fill="none" stroke="#1E3A40" stroke-width="3"/><path d="M97 82 L103 82" stroke="#1E3A40" stroke-width="3"/>`;
    }

    // --- accesorio
    if (acc) {
      const c = acc.color || '#6B4226';
      if (acc.shape === 'lentes') {
        const solar = /sol/i.test(acc.id || '');
        const lente = solar ? `${INK}` : 'rgba(255,255,255,.35)';
        s += `<circle cx="84" cy="82" r="14" fill="${lente}" stroke="${c}" stroke-width="4"/><circle cx="116" cy="82" r="14" fill="${lente}" stroke="${c}" stroke-width="4"/>`;
        s += `<path d="M98 82 L102 82 M70 80 L58 78 M130 80 L142 78" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
      } else if (acc.shape === 'bigote') {
        s += `<path d="M78 96 Q90 88 100 95 Q110 88 122 96 Q112 104 100 99 Q88 104 78 96Z" fill="${c}" ${ink}/>`;
      } else if (acc.shape === 'barba') {
        const larga = /sabi/i.test(acc.id || '');
        const y = larga ? 160 : 140;
        s += `<path d="M58 90 Q58 ${y - 6} 100 ${y} Q142 ${y - 6} 142 90 Q132 114 100 114 Q68 114 58 90Z" fill="${c}" ${ink}/>`;
        s += `<path d="M84 102 Q100 118 116 102" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      }
    }

    // --- prenda de cabeza
    if (cabeza) {
      const c = cabeza.color || '#FFC93C', cs = this._oscuro(c, 0.2);
      if (cabeza.shape === 'gorro') {
        s += `<path d="M56 62 Q54 20 100 20 Q146 20 144 62Z" fill="${c}" ${ink}/>`;
        s += `<path d="M52 60 L148 60 L148 74 Q100 82 52 74Z" fill="${cs}" ${ink}/>`;
        s += `<circle cx="100" cy="16" r="10" fill="${c}" ${ink}/>`;
      } else if (cabeza.shape === 'sombrero') {
        s += `<path d="M70 56 Q70 18 100 18 Q130 18 130 56Z" fill="${c}" ${ink}/>`;
        s += `<path d="M70 50 L130 50" stroke="${cs}" stroke-width="7"/>`;
        s += `<ellipse cx="100" cy="58" rx="68" ry="12" fill="${c}" ${ink}/>`;
      } else if (cabeza.shape === 'rizeta') {
        s += `<path d="M66 44 L40 30 L42 60Z" fill="${c}" ${ink}/><path d="M66 44 L92 30 L90 60Z" fill="${c}" ${ink}/><circle cx="66" cy="45" r="7" fill="${cs}" ${ink}/>`;
      } else if (cabeza.shape === 'tiara') {
        s += `<path d="M62 50 L70 24 L86 40 L100 16 L114 40 L130 24 L138 50Z" fill="${c}" ${ink}/>`;
        s += `<circle cx="100" cy="36" r="4.5" fill="#E8742A" stroke="${INK}" stroke-width="2.5"/>`;
      }
    }

    const dim = size ? `width="${size}" height="${size}"` : 'width="100%" height="100%"';
    return `<svg viewBox="0 0 200 200" ${dim} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tu personaje" class="avatar-svg">${s}</svg>`;
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

  // ---------- Vistas previas del Armario y la Tienda ----------
  // Cada prenda se ve puesta en el muñeco; marcos y fondos se dibujan aparte.
  preview(prendas, prenda) {
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const cat = prenda.categoria;
    if (cat === 'perfil') {
      return `<div class="swatch-inline">${this.renderOpenPeeps(prenda.variante || 'p1', 60)}</div>`;
    }
    if (cat === 'marco') {
      return `<div class="swatch-inline"><svg viewBox="0 0 64 64" width="60" height="60" role="img" aria-label="${esc(prenda.nombre)}"><rect x="6" y="6" width="52" height="52" rx="14" fill="#FFF8E1" stroke="${esc(prenda.color || '#8B5A2B')}" stroke-width="8"/><rect x="2.5" y="2.5" width="59" height="59" rx="17" fill="none" stroke="${this.INK}" stroke-width="3"/></svg></div>`;
    }
    if (cat === 'fondo') {
      return `<div class="swatch-inline"><div style="width:60px;height:60px;border-radius:14px;border:3px solid ${this.INK};background:${esc(prenda.gradiente || prenda.color || '#ddd')};"></div></div>`;
    }
    const equipo = { perfil: 'perfil-1', [cat]: prenda.id };
    return `<div class="swatch-inline">${this.renderSVG(equipo, prendas, 64)}</div>`;
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
