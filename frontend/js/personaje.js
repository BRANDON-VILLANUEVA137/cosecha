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
  }
};