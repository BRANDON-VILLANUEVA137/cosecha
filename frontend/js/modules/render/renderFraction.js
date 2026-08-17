// js/render/renderFraction.js
import { state } from '../state.js';
import { formatMathText, escapeHtml } from '../utils/formatters.js';
import { arcSVG, graficaMeta } from '../utils/mathUtils.js';

export function renderControlGrafica(ej, materia) {
  const key = String(ej.id);
  const meta = graficaMeta(ej);
  const total = Math.min(Math.max(meta.denominador, 1), 24);
  const selSet = new Set(state.graficaSel[key] || []);
  const esCirculo = meta.forma === 'circulo';
  const idCount = 'fracCount_' + key;

  let canvas = '';
  if (esCirculo) {
    const sectores = [];
    for (let i = 0; i < total; i += 1) {
      const ini = (360 / total) * i;
      const fin = (360 / total) * (i + 1);
      const d = arcSVG(100, 100, 92, ini, fin);
      sectores.push(`<path class="seg-fra ${selSet.has(i) ? 'sel' : ''}" data-widget-part data-frac-key="${key}" data-idx="${i}" d="${d}"></path>`);
    }
    canvas = `<svg viewBox="0 0 200 200" class="fig-fra svg-circulo">${sectores.join('')}</svg>`;
  } else {
    const ancho = (520 / total).toFixed(1);
    const rects = [];
    for (let i = 0; i < total; i += 1) {
      rects.push(`<rect class="seg-fra ${selSet.has(i) ? 'sel' : ''}" data-widget-part data-frac-key="${key}" data-idx="${i}" x="${(i * Number(ancho)).toFixed(1)}" y="0" width="${ancho}" height="66" rx="4"></rect>`);
    }
    canvas = `<svg viewBox="0 0 520 66" class="fig-fra svg-rectangulo">${rects.join('')}</svg>`;
  }

  return `
    <div class="grafica-sele" data-frac-key="${key}" data-den="${total}">
      <div class="grafica-toolbar">
        <span class="tag mat">Colorea ${meta.numerador} de ${total}</span>
        <span class="grafica-contador" id="${idCount}">Coloreadas: ${selSet.size}/${total}</span>
        <div class="graph-pills">
          <button type="button" class="ghost ${!esCirculo ? 'active' : ''}" data-frac-shape="rectangulo" data-frac-key="${key}">▭ Rectángulo</button>
          <button type="button" class="ghost ${esCirculo ? 'active' : ''}" data-frac-shape="circulo" data-frac-key="${key}">◯ Círculo</button>
        </div>
      </div>
      ${canvas}
      <div class="answer-row">
        <button class="primary" data-check="${ej.id}" data-materia="${materia}">Comprobar</button>
      </div>
    </div>
  `;
}

export function renderFractionGraphic(numerador, denominador, tipoFigura = 'rectangulo') {
  const safeNum = Math.max(1, Math.floor(Number(numerador) || 0));
  const safeDen = Math.max(1, Math.floor(Number(denominador) || 0));
  const totalFigures = Math.ceil(safeNum / safeDen);
  const fullFigures = Math.floor(safeNum / safeDen);
  const remainder = safeNum % safeDen;

  const figuras = [];
  for (let i = 0; i < totalFigures; i += 1) {
    const filled = i < fullFigures ? safeDen : (i === fullFigures ? remainder : 0);
    const isCircle = tipoFigura === 'circulo';
    const pieces = [];

    if (isCircle) {
      const pct = safeDen > 0 ? (filled / safeDen) * 100 : 0;
      pieces.push(`<div class="shape-circle-fill" style="background:conic-gradient(var(--primario) ${pct}%, rgba(255,140,51,.18) ${pct}% 100%);"></div>`);
    } else {
      for (let index = 0; index < safeDen; index += 1) {
        pieces.push(`<div class="shape-slice ${index < filled ? 'filled' : ''}"></div>`);
      }
    }

    figuras.push(`
      <div class="fraction-figure-card">
        <div class="shape-container ${isCircle ? 'circle' : 'rectangle'}">${pieces.join('')}</div>
        <div class="figure-label">${isCircle ? 'Círculo' : 'Rectángulo'} ${i + 1}</div>
      </div>`);
  }

  return `<div class="fraction-canvas">${figuras.join('')}</div>`;
}

export function renderFractionPreview() {
  const area = document.getElementById('fractionGraphicArea');
  if (!area) return;

  const preview = state.currentFractionPreview || { numerador: 2, denominador: 5, tipo: 'rectangulo' };
  const title = `${preview.numerador}/${preview.denominador}`;
  area.innerHTML = `
    <div class="fraction-preview-card">
      <div class="fraction-preview-title">
        <strong>${title}</strong>
        <span>${preview.tipo === 'circulo' ? 'Vista circular' : 'Vista rectangular'}</span>
      </div>
      ${renderFractionGraphic(preview.numerador, preview.denominador, preview.tipo)}
    </div>`;
}