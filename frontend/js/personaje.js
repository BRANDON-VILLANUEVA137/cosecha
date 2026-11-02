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
     Del catálogo usa: shape y color (torso, cabeza, accesorio),
     dicebearOptions.facialExpression (avatar) y variante (perfil). */
  INK: '#1C130D',
  _uid: 0,

  // Oscurece un color #RRGGBB (sombreado plano de dos tonos)
  _oscuro(hex, f) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#00000033';
    const n = parseInt(m[1], 16);
    const c = v => Math.max(0, Math.round(v * (1 - f))).toString(16).padStart(2, '0');
    return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255);
  },
  _claro(hex, f) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const c = v => Math.min(255, Math.round(v + (255 - v) * f)).toString(16).padStart(2, '0');
    return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255);
  },

  BUSTO: 'M26 200 Q26 150 72 142 L128 142 Q174 150 174 200Z',

  // ---- Pelo ----
  _peloAtras(tipo, c, ink) {
    if (tipo === 'largo') return `<path d="M52 72 Q44 132 62 146 L138 146 Q156 132 148 72 Q100 18 52 72Z" fill="${c}" ${ink}/>`;
    if (tipo === 'afro') return `<ellipse cx="100" cy="58" rx="64" ry="56" fill="${c}" ${ink}/>`;
    if (tipo === 'mono') return `<circle cx="100" cy="20" r="17" fill="${c}" ${ink}/><path d="M86 22 Q100 12 114 22" stroke="${this._claro(c, .35)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (tipo === 'trenzas') {
      let t = '';
      for (const x of [52, 148]) {
        t += `<path d="M${x} 90 Q${x + (x < 100 ? -8 : 8)} 120 ${x} 150" stroke="${this.INK}" stroke-width="22" fill="none" stroke-linecap="round"/>`;
        t += `<path d="M${x} 90 Q${x + (x < 100 ? -8 : 8)} 120 ${x} 150" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
        for (let y = 104; y <= 144; y += 14) t += `<path d="M${x - 8} ${y} L${x + 8} ${y + 6}" stroke="${this._oscuro(c, .35)}" stroke-width="3" stroke-linecap="round"/>`;
      }
      return t;
    }
    if (tipo === 'coletas') {
      let t = '';
      for (const x of [40, 160]) t += `<ellipse cx="${x}" cy="84" rx="15" ry="26" fill="${c}" ${ink}/>`;
      return t;
    }
    return '';
  },
  _peloFrente(tipo, c, ink) {
    const brillo = `<path d="M72 46 Q88 36 108 38" stroke="${this._claro(c, .4)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (tipo === 'calvo') return `<path d="M64 56 Q100 40 136 56" stroke="${this._claro('#FFD9A8', .5)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>`;
    if (tipo === 'rizado') return `<path d="M54 80 Q38 52 62 38 Q70 18 100 22 Q130 18 138 38 Q162 52 146 80 Q142 56 100 54 Q58 56 54 80Z" fill="${c}" ${ink}/>${brillo}`;
    if (tipo === 'afro') return `<path d="M56 74 Q60 40 100 38 Q140 40 144 74 Q132 54 100 54 Q68 54 56 74Z" fill="${c}" ${ink}/>${brillo}`;
    if (tipo === 'mohicano') {
      return `<path d="M82 52 L86 14 L94 34 L100 6 L106 34 L114 14 L118 52Q100 44 82 52Z" fill="${c}" ${ink}/>`;
    }
    if (tipo === 'coletas') {
      return `<path d="M55 78 Q56 28 100 26 Q144 28 145 78 Q134 50 100 50 Q66 50 55 78Z" fill="${c}" ${ink}/>${brillo}<circle cx="52" cy="62" r="6" fill="#E8742A" stroke="${this.INK}" stroke-width="3"/><circle cx="148" cy="62" r="6" fill="#E8742A" stroke="${this.INK}" stroke-width="3"/>`;
    }
    // corto, largo, trenzas, mono
    return `<path d="M55 78 Q56 28 100 26 Q144 28 145 78 Q134 50 100 50 Q66 50 55 78Z" fill="${c}" ${ink}/>${brillo}`;
  },

  // ---- Cara ----
  _cara(expr) {
    const I = this.INK;
    const ceja = (d) => `<path d="${d}" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const ojo = (x, r) => `<circle cx="${x}" cy="82" r="${r}" fill="${I}"/><circle cx="${x - 1.5}" cy="80.5" r="1.4" fill="#fff"/>`;
    const cerrado = (x, arriba) => `<path d="M${x - 8} 82 Q${x} ${arriba ? 74 : 90} ${x + 8} 82" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const rubor = `<circle cx="76" cy="96" r="5" fill="#E8742A" opacity=".25"/><circle cx="124" cy="96" r="5" fill="#E8742A" opacity=".25"/>`;
    const nariz = `<path d="M100 88 Q105 96 99 98" stroke="${this._oscuro('#FFD9A8', .45)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    const sonrisa = `<path d="M84 102 Q100 118 116 102" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    let o = '', b = '', m = sonrisa;
    switch (expr) {
      case 'serious':
        o = ojo(84, 4.5) + ojo(116, 4.5); b = ceja('M74 70 L92 74') + ceja('M126 70 L108 74');
        m = `<path d="M88 106 L112 106" stroke="${I}" stroke-width="3.5" stroke-linecap="round"/>`; break;
      case 'surprised':
        o = ojo(84, 5.5) + ojo(116, 5.5); b = ceja('M74 68 Q84 60 94 68') + ceja('M106 68 Q116 60 126 68');
        m = `<ellipse cx="100" cy="108" rx="7" ry="9" fill="${I}"/>`; break;
      case 'wink':
        o = ojo(84, 4.5) + cerrado(116, true); b = ceja('M76 70 Q84 66 92 70');
        m = `<path d="M84 102 Q100 118 116 102 Q100 108 84 102Z" fill="#fff" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/>`; break;
      case 'laugh':
        o = cerrado(84, true) + cerrado(116, true); b = ceja('M74 68 Q84 62 92 68') + ceja('M108 68 Q116 62 126 68');
        m = `<path d="M80 100 Q100 132 120 100Z" fill="${I}"/><path d="M90 116 Q100 108 110 116 Q100 124 90 116Z" fill="#F28BB0"/>`; break;
      case 'cool':
        o = ojo(84, 4.5) + ojo(116, 4.5); b = ceja('M74 72 Q84 66 92 70') + ceja('M108 68 Q118 60 128 66');
        m = `<path d="M86 104 Q104 114 120 98" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`; break;
      case 'sleepy':
        o = cerrado(84, false) + cerrado(116, false); b = ceja('M76 72 Q84 70 92 72');
        m = `<ellipse cx="100" cy="108" rx="5" ry="4" fill="${I}"/><path d="M128 52 L140 52 L128 64 L140 64" stroke="${I}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; break;
      case 'angry':
        o = ojo(84, 4) + ojo(116, 4); b = ceja('M72 64 L94 74') + ceja('M128 64 L106 74');
        m = `<path d="M86 108 Q100 98 114 108" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`; break;
      case 'love': {
        const c = '#D8344A';
        const corazon = x => `<path d="M${x} 88 C${x - 11} 79 ${x - 9} 71 ${x} 76 C${x + 9} 71 ${x + 11} 79 ${x} 88Z" fill="${c}" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/>`;
        o = corazon(84) + corazon(116); b = ceja('M76 66 Q84 62 92 66') + ceja('M108 66 Q116 62 124 66'); break;
      }
      default:
        o = ojo(84, 4.5) + ojo(116, 4.5); b = ceja('M76 70 Q84 66 92 70') + ceja('M108 70 Q116 66 124 70');
    }
    return rubor + nariz + o + b + m;
  },

  // ---- Torso: lo que va DETRÁS del cuerpo (capa) y la prenda ----
  _torsoAtras(shape, c, ink) {
    if (shape === 'capa') return `<path d="M18 200 Q8 148 52 128 L148 128 Q192 148 182 200Z" fill="${this._oscuro(c, .12)}" ${ink}/>`;
    return '';
  },
  _torso(shape, c, ink, id) {
    const I = this.INK, sh = this._oscuro(c, 0.2);
    const clip = `<clipPath id="busto-${id}"><path d="${this.BUSTO}"/></clipPath>`;
    const recortado = (inner) => `${clip}<g clip-path="url(#busto-${id})">${inner}</g>`;
    switch (shape) {
      case 'buso': {
        const cap = this._oscuro(c, 0.12);
        return `<path d="M66 146 Q100 126 134 146 Q128 174 100 178 Q72 174 66 146Z" fill="${cap}" ${ink}/>`
          + `<path d="M70 182 L130 182 L138 200 L62 200Z" fill="${sh}" ${ink}/>`
          + `<path d="M92 158 L90 176 M108 158 L110 176" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`;
      }
      case 'sueter':
        return `<path d="M30 192 L170 192 M28 198 L172 198" stroke="${sh}" stroke-width="4"/>`
          + `<path d="M44 164 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8" fill="none" stroke="${this._oscuro(c, .35)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
          + `<path d="M82 144 Q100 160 118 144" fill="none" stroke="${sh}" stroke-width="7" stroke-linecap="round"/>`;
      case 'chaleco':
        return `<path d="${this.BUSTO}" fill="#F4F4F4"/>`
          + `<path d="M62 146 L90 144 L98 200 L40 200 Q38 162 62 146Z" fill="${c}" ${ink}/>`
          + `<path d="M138 146 L110 144 L102 200 L160 200 Q162 162 138 146Z" fill="${c}" ${ink}/>`
          + `<circle cx="86" cy="170" r="3" fill="${I}"/><circle cx="114" cy="170" r="3" fill="${I}"/>`;
      case 'camisa': {
        let l = '';
        for (let x = 30; x < 180; x += 16) l += `<path d="M${x} 140 L${x} 204" stroke="${sh}" stroke-width="5" opacity=".55"/>`;
        for (let y = 148; y < 204; y += 16) l += `<path d="M20 ${y} L180 ${y}" stroke="${sh}" stroke-width="5" opacity=".55"/>`;
        return recortado(l)
          + `<path d="M100 150 L100 200" stroke="${I}" stroke-width="2.5"/>`
          + `<path d="M84 142 L100 158 L90 150Z M116 142 L100 158 L110 150Z" fill="${this._claro(c, .35)}" ${ink}/>`
          + `<circle cx="100" cy="172" r="2.6" fill="${I}"/><circle cx="100" cy="188" r="2.6" fill="${I}"/>`;
      }
      case 'rayas': {
        let l = '';
        for (let y = 150; y < 204; y += 14) l += `<rect x="20" y="${y}" width="160" height="7" fill="${sh}"/>`;
        return recortado(l) + `<path d="M84 143 Q100 160 116 143" fill="none" stroke="${sh}" stroke-width="7" stroke-linecap="round"/>`;
      }
      case 'overol':
        return `<path d="${this.BUSTO}" fill="#FFF3D6"/>`
          + `<path d="M62 200 L66 168 Q68 156 80 154 L120 154 Q132 156 134 168 L138 200Z" fill="${c}" ${ink}/>`
          + `<path d="M70 156 L82 142 L94 142 L82 160Z M130 156 L118 142 L106 142 L118 160Z" fill="${c}" ${ink}/>`
          + `<rect x="86" y="170" width="28" height="16" rx="3" fill="${sh}" ${ink}/>`
          + `<circle cx="84" cy="150" r="3.4" fill="#FFC93C" stroke="${I}" stroke-width="2"/><circle cx="116" cy="150" r="3.4" fill="#FFC93C" stroke="${I}" stroke-width="2"/>`;
      case 'chaqueta':
        return `<path d="M84 143 L100 176 L116 143Z" fill="#F4F4F4"/>`
          + `<path d="M72 142 L100 184 L82 200 L52 158Z" fill="${sh}" ${ink}/><path d="M128 142 L100 184 L118 200 L148 158Z" fill="${sh}" ${ink}/>`
          + `<path d="M100 184 L100 200" stroke="${I}" stroke-width="3"/><circle cx="100" cy="196" r="3" fill="#C0C0C0" stroke="${I}" stroke-width="1.5"/>`;
      case 'capa':
        return `<path d="${this.BUSTO}" fill="#F4F4F4"/>`
          + `<path d="M64 146 Q100 160 136 146" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`
          + `<circle cx="72" cy="150" r="5" fill="#FFC93C" stroke="${I}" stroke-width="2.5"/><circle cx="128" cy="150" r="5" fill="#FFC93C" stroke="${I}" stroke-width="2.5"/>`
          + `<path d="M100 164 L105 176 L118 176 L108 183 L112 196 L100 188 L88 196 L92 183 L82 176 L95 176Z" fill="#FFC93C" ${ink}/>`;
      case 'bata':
        return `<path d="${this.BUSTO}" fill="${c}"/>`
          + `<path d="M84 143 L100 182 L116 143Z" fill="#6FA8DC"/>`
          + `<path d="M76 143 L96 192 L82 200 L54 156Z" fill="${this._oscuro(c, .08)}" ${ink}/><path d="M124 143 L104 192 L118 200 L146 156Z" fill="${this._oscuro(c, .08)}" ${ink}/>`
          + `<rect x="120" y="172" width="22" height="22" rx="3" fill="none" stroke="${I}" stroke-width="3"/><path d="M128 172 L128 164 M134 172 L134 166" stroke="#3E8E74" stroke-width="3" stroke-linecap="round"/>`;
      case 'vestido': {
        let r = '';
        for (let x = 72; x <= 128; x += 11) r += `<circle cx="${x}" cy="${146 + Math.abs(x - 100) * 0.12}" r="6" fill="${this._claro(c, .35)}" ${ink}/>`;
        return `<path d="M76 143 Q100 176 124 143Z" fill="#FFD9A8"/>${r}`
          + `<path d="M30 190 L170 190 L172 200 L28 200Z" fill="${sh}" ${ink}/>`;
      }
      case 'uniforme':
        return `<path d="M84 143 L100 176 L116 143Z" fill="#F4F4F4"/>`
          + `<path d="M72 142 L100 190 L84 200 L54 158Z" fill="${sh}" ${ink}/><path d="M128 142 L100 190 L116 200 L146 158Z" fill="${sh}" ${ink}/>`
          + `<path d="M96 150 L104 150 L107 186 L100 194 L93 186Z" fill="#C4452D" ${ink}/>`
          + `<circle cx="132" cy="176" r="6" fill="#FFC93C" stroke="${I}" stroke-width="2.5"/>`;
      case 'astronauta':
        return `<path d="${this.BUSTO}" fill="#F4F4F4"/>`
          + `<path d="M62 146 Q100 166 138 146" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>`
          + `<rect x="78" y="170" width="44" height="24" rx="5" fill="${c}" ${ink}/><circle cx="90" cy="182" r="4" fill="#F4F4F4"/><circle cx="104" cy="182" r="4" fill="#FFC93C"/><rect x="112" y="178" width="6" height="8" fill="#F4F4F4"/>`
          + `<rect x="144" y="164" width="18" height="12" rx="2" fill="#3E7CB1" stroke="${I}" stroke-width="2.5" transform="rotate(12 153 170)"/>`;
      default: // camiseta
        return `<path d="M84 143 Q100 162 116 143" fill="none" stroke="${sh}" stroke-width="7" stroke-linecap="round"/>`;
    }
  },

  // ---- Prendas de cabeza ----
  _cabeza(shape, c, ink) {
    const I = this.INK, cs = this._oscuro(c, 0.2);
    switch (shape) {
      case 'gorro':
        return `<path d="M56 62 Q54 20 100 20 Q146 20 144 62Z" fill="${c}" ${ink}/><path d="M52 60 L148 60 L148 74 Q100 82 52 74Z" fill="${cs}" ${ink}/><circle cx="100" cy="16" r="10" fill="${c}" ${ink}/>`;
      case 'sombrero':
        return `<path d="M70 56 Q70 18 100 18 Q130 18 130 56Z" fill="${c}" ${ink}/><path d="M70 50 L130 50" stroke="${cs}" stroke-width="7"/><ellipse cx="100" cy="58" rx="68" ry="12" fill="${c}" ${ink}/>`;
      case 'rizeta':
        return `<path d="M66 44 L40 30 L42 60Z" fill="${c}" ${ink}/><path d="M66 44 L92 30 L90 60Z" fill="${c}" ${ink}/><circle cx="66" cy="45" r="7" fill="${cs}" ${ink}/>`;
      case 'tiara':
        return `<path d="M62 50 L70 24 L86 40 L100 16 L114 40 L130 24 L138 50Z" fill="${c}" ${ink}/><circle cx="100" cy="36" r="4.5" fill="#E8742A" stroke="${I}" stroke-width="2.5"/>`;
      case 'gorra':
        return `<path d="M58 62 Q58 22 100 22 Q142 22 142 62Z" fill="${c}" ${ink}/><path d="M100 60 Q150 54 166 70 Q140 74 100 68Z" fill="${cs}" ${ink}/><circle cx="100" cy="22" r="4" fill="${cs}" stroke="${I}" stroke-width="2.5"/>`;
      case 'orejas':
        return `<path d="M58 52 Q100 22 142 52" stroke="${I}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M58 52 Q100 22 142 52" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`
          + `<path d="M58 50 L50 14 L84 36Z" fill="${c}" ${ink}/><path d="M142 50 L150 14 L116 36Z" fill="${c}" ${ink}/>`
          + `<path d="M58 42 L56 24 L72 36Z M142 42 L144 24 L128 36Z" fill="#F28BB0"/>`;
      case 'mago':
        return `<ellipse cx="100" cy="56" rx="56" ry="11" fill="${c}" ${ink}/><path d="M70 54 Q82 30 104 4 Q108 -2 112 6 Q126 34 130 54Z" fill="${c}" ${ink}/>`
          + `<path d="M72 48 Q100 56 128 48" stroke="${cs}" stroke-width="7" fill="none"/><circle cx="96" cy="34" r="4" fill="#FFC93C"/><circle cx="110" cy="22" r="3" fill="#FFC93C"/><circle cx="104" cy="44" r="2.5" fill="#FFC93C"/>`;
      case 'bandana':
        return `<path d="M55 64 Q54 28 100 28 Q146 28 145 64 Q100 54 55 64Z" fill="${c}" ${ink}/>`
          + `<circle cx="80" cy="44" r="3" fill="#fff"/><circle cx="104" cy="40" r="3" fill="#fff"/><circle cx="126" cy="48" r="3" fill="#fff"/>`
          + `<path d="M144 60 L168 50 L162 72Z" fill="${c}" ${ink}/>`;
      case 'corona':
        return `<path d="M62 50 L66 20 L84 36 L100 12 L116 36 L134 20 L138 50Z" fill="${c}" ${ink}/><path d="M62 44 L138 44 L138 56 L62 56Z" fill="${cs}" ${ink}/>`
          + `<circle cx="66" cy="20" r="4" fill="#D8344A" stroke="${I}" stroke-width="2"/><circle cx="100" cy="12" r="4.5" fill="#3E7CB1" stroke="${I}" stroke-width="2"/><circle cx="134" cy="20" r="4" fill="#D8344A" stroke="${I}" stroke-width="2"/>`;
      case 'casco':
        return `<path d="M56 62 Q58 22 100 22 Q142 22 144 62Z" fill="${c}" ${ink}/><path d="M50 58 L150 58 L150 68 L50 68Z" fill="${cs}" ${ink}/>`
          + `<path d="M100 22 L100 58" stroke="${cs}" stroke-width="6"/><circle cx="100" cy="40" r="9" fill="#FFF3A0" stroke="${I}" stroke-width="3"/>`;
      case 'flores': {
        const pts = [[62, 52, '#F28BB0'], [78, 38, '#FFFFFF'], [100, 32, c], [122, 38, '#FFFFFF'], [138, 52, '#F28BB0']];
        return pts.map(([x, y, col]) => `<g stroke="${I}" stroke-width="2">${[0, 72, 144, 216, 288].map(a => `<circle cx="${x + 6 * Math.cos(a * Math.PI / 180)}" cy="${y + 6 * Math.sin(a * Math.PI / 180)}" r="4.5" fill="${col}"/>`).join('')}<circle cx="${x}" cy="${y}" r="3.6" fill="#FFC93C"/></g>`).join('');
      }
      case 'chef':
        return `<path d="M62 62 L62 40 Q50 36 56 22 Q66 8 82 16 Q92 2 108 12 Q126 6 138 20 Q148 36 138 42 L138 62Z" fill="${c}" ${ink}/><path d="M62 52 L138 52" stroke="${cs}" stroke-width="4"/>`;
      case 'birrete':
        return `<path d="M72 50 L72 68 Q100 80 128 68 L128 50Z" fill="${cs}" ${ink}/><path d="M36 40 L100 20 L164 40 L100 60Z" fill="${c}" ${ink}/>`
          + `<path d="M100 40 L150 46 L150 70" stroke="#FFC93C" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="145" y="68" width="10" height="14" rx="2" fill="#FFC93C" stroke="${I}" stroke-width="2"/>`;
      default: return '';
    }
  },

  // ---- Accesorios ----
  _accesorio(a, ink) {
    const I = this.INK, c = a.color || '#6B4226', id = a.id || '';
    switch (a.shape) {
      case 'lentes': {
        const solar = /sol/i.test(id), lente = solar ? I : 'rgba(255,255,255,.35)';
        return `<circle cx="84" cy="82" r="14" fill="${lente}" stroke="${c}" stroke-width="4"/><circle cx="116" cy="82" r="14" fill="${lente}" stroke="${c}" stroke-width="4"/><path d="M98 82 L102 82 M70 80 L58 78 M130 80 L142 78" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
      }
      case 'bigote':
        return `<path d="M78 96 Q90 88 100 95 Q110 88 122 96 Q112 104 100 99 Q88 104 78 96Z" fill="${c}" ${ink}/>`;
      case 'barba': {
        const y = /sabi/i.test(id) ? 160 : 140;
        return `<path d="M58 90 Q58 ${y - 6} 100 ${y} Q142 ${y - 6} 142 90 Q132 114 100 114 Q68 114 58 90Z" fill="${c}" ${ink}/><path d="M84 102 Q100 118 116 102" stroke="${I}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      }
      case 'audifonos':
        return `<path d="M54 84 Q54 26 100 26 Q146 26 146 84" stroke="${I}" stroke-width="11" fill="none"/><path d="M54 84 Q54 26 100 26 Q146 26 146 84" stroke="${c}" stroke-width="6" fill="none"/>`
          + `<rect x="44" y="70" width="17" height="30" rx="7" fill="${c}" ${ink}/><rect x="139" y="70" width="17" height="30" rx="7" fill="${c}" ${ink}/>`;
      case 'corbatin':
        return `<path d="M100 154 L76 142 L76 166Z" fill="${c}" ${ink}/><path d="M100 154 L124 142 L124 166Z" fill="${c}" ${ink}/><circle cx="100" cy="154" r="6" fill="${this._oscuro(c, .25)}" ${ink}/>`;
      case 'bufanda':
        return `<path d="M68 134 Q100 168 132 134 L136 154 Q100 184 64 154Z" fill="${c}" ${ink}/><path d="M108 160 L132 156 L138 198 L112 200Z" fill="${c}" ${ink}/><path d="M112 176 L136 172 M113 188 L137 184" stroke="${this._oscuro(c, .3)}" stroke-width="4"/>`;
      case 'parche':
        return `<path d="M58 64 L142 98" stroke="${I}" stroke-width="3"/><ellipse cx="116" cy="82" rx="14" ry="12" fill="${I}"/>`;
      case 'pecas': {
        const pts = [[72, 92], [80, 96], [76, 100], [124, 92], [120, 96], [128, 100], [92, 90], [108, 90]];
        return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${c}"/>`).join('');
      }
      case 'antifaz':
        return `<path d="M52 76 Q76 64 100 76 Q124 64 148 76 Q150 98 124 96 Q112 94 100 88 Q88 94 76 96 Q50 98 52 76Z" fill="${c}" ${ink}/>`
          + `<ellipse cx="84" cy="82" rx="10" ry="7" fill="#F4F4F4" stroke="${I}" stroke-width="2.5"/><ellipse cx="116" cy="82" rx="10" ry="7" fill="#F4F4F4" stroke="${I}" stroke-width="2.5"/><circle cx="84" cy="82" r="4" fill="${I}"/><circle cx="116" cy="82" r="4" fill="${I}"/>`;
      case 'aretes':
        return `<circle cx="57" cy="96" r="5" fill="${c}" ${ink}/><circle cx="143" cy="96" r="5" fill="${c}" ${ink}/><path d="M57 101 L57 110 M143 101 L143 110" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><circle cx="57" cy="112" r="4" fill="${c}" ${ink}/><circle cx="143" cy="112" r="4" fill="${c}" ${ink}/>`;
      case 'collar':
        return `<path d="M78 144 Q100 178 122 144" stroke="${c}" stroke-width="3.5" fill="none"/><circle cx="100" cy="170" r="7" fill="${c}" ${ink}/><circle cx="100" cy="170" r="2.6" fill="#D8344A"/>`;
      default: return '';
    }
  },

  renderSVG(equipo, prendas, size) {
    equipo = equipo || {};
    prendas = prendas || [];
    const INK = this.INK;
    const ink = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
    const get = id => (id ? this.pieza(prendas, id) : null);
    this._uid += 1;
    const uid = this._uid;

    // Piel y pelo vienen del perfil elegido
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
    const conCuerpoBlanco = ['capa', 'chaleco', 'astronauta', 'overol', 'bata'].includes(torso.shape);
    const cuerpoColor = ['capa', 'chaleco', 'astronauta'].includes(torso.shape) ? '#F4F4F4'
      : torso.shape === 'overol' ? '#FFF3D6' : tC;

    let s = '';
    s += this._torsoAtras(torso.shape, tC, ink);
    s += this._peloAtras(v.pelo, pelo, ink);

    // busto
    s += `<path d="${this.BUSTO}" fill="${cuerpoColor}"/>`;
    if (!conCuerpoBlanco || torso.shape === 'bata') s += `<path d="M148 150 Q174 160 174 200 L144 200 Q154 172 148 150Z" fill="${tSombra}"/>`;
    s += this._torso(torso.shape, tC, ink, uid);
    s += `<path d="${this.BUSTO}" fill="none" ${ink}/>`;

    // cuello
    s += `<path d="M86 122 L86 146 Q100 156 114 146 L114 122Z" fill="${piel}" ${ink}/><path d="M104 126 L114 124 L114 146 Q108 150 104 150Z" fill="${pielSombra}"/>`;
    // cabeza
    s += `<circle cx="57" cy="84" r="9" fill="${piel}" ${ink}/><circle cx="143" cy="84" r="9" fill="${piel}" ${ink}/>`;
    s += `<ellipse cx="100" cy="80" rx="43" ry="47" fill="${piel}"/>`;
    s += `<path d="M130 44 C148 70 146 100 124 124 C140 100 138 66 122 44Z" fill="${pielSombra}"/>`;
    s += `<ellipse cx="100" cy="80" rx="43" ry="47" fill="none" ${ink}/>`;
    // cara y pelo
    s += this._cara(expr);
    s += this._peloFrente(v.pelo, pelo, ink);
    if (v.glasses) {
      s += `<circle cx="84" cy="82" r="13" fill="none" stroke="#1E3A40" stroke-width="3"/><circle cx="116" cy="82" r="13" fill="none" stroke="#1E3A40" stroke-width="3"/><path d="M97 82 L103 82" stroke="#1E3A40" stroke-width="3"/>`;
    }
    if (acc) s += this._accesorio(acc, ink);
    if (cabeza) s += this._cabeza(cabeza.shape, cabeza.color || '#FFC93C', ink);

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
    p6: { skin: '#E8B88D', hair: '#8B5A2B', camisa: '#6B6B8A', pelo: 'rizado', glasses: true },
    p7: { skin: '#8D5524', hair: '#1C130D', camisa: '#E8742A', pelo: 'trenzas', glasses: false },
    p8: { skin: '#C68642', hair: '#2A1D12', camisa: '#3E8E74', pelo: 'afro', glasses: false },
    p9: { skin: '#FFD9A8', hair: '#C4452D', camisa: '#FFC93C', pelo: 'mono', glasses: false },
    p10: { skin: '#A66A3F', hair: '#3A2A1E', camisa: '#4A6FA5', pelo: 'calvo', glasses: false },
    p11: { skin: '#E8B88D', hair: '#1E3A40', camisa: '#E8631B', pelo: 'coletas', glasses: true },
    p12: { skin: '#F8C89D', hair: '#3E7CB1', camisa: '#6B6B8A', pelo: 'mohicano', glasses: false }
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
