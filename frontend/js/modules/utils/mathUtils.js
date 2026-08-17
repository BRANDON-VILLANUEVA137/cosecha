// js/utils/mathUtils.js
export function polarCoords(cx, cy, r, grados) {
  const a = ((grados - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function arcSVG(cx, cy, r, inicioGrad, finGrad) {
  const s = polarCoords(cx, cy, r, finGrad);
  const e = polarCoords(cx, cy, r, inicioGrad);
  const grande = (finGrad - inicioGrad <= 180) ? '0' : '1';
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${grande} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

export function graficaMeta(ej) {
  if (ej.grafica && ej.grafica.denominador) {
    return {
      numerador: Math.max(1, Number(ej.grafica.numerador) || 1),
      denominador: Math.max(1, Number(ej.grafica.denominador) || 1),
      forma: ej.grafica.forma === 'circulo' ? 'circulo' : 'rectangulo'
    };
  }
  const m = String(ej.enunciado || '').match(/(\d+)\s*\/\s*(\d+)/);
  return {
    numerador: m ? Number(m[1]) : 1,
    denominador: m ? Number(m[2]) : 1,
    forma: 'rectangulo'
  };
}