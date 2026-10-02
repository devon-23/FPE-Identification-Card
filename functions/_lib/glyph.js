import { BISHOPS } from './lore.js';

const SEGMENTS = BISHOPS.length;

function block(cx, cy, r0, r1, a0, a1) {
  const at = (r, a) => [
    (cx + r * Math.cos(a)).toFixed(2),
    (cy + r * Math.sin(a)).toFixed(2),
  ];
  const [x0, y0] = at(r1, a0);
  const [x1, y1] = at(r1, a1);
  const [x2, y2] = at(r0, a1);
  const [x3, y3] = at(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

export function cityMark(bishopIdx, { className = 'mark', allLit = false } = {}) {
  const step = (Math.PI * 2) / SEGMENTS;
  const gap = step * 0.1;
  const origin = -Math.PI / 2 - step / 2;
  // the -step/2 puts section 1 at the top. took me way too long
  const out = [];

  for (let i = 0; i < SEGMENTS; i++) {
    const a0 = i * step + origin + gap / 2;
    const a1 = (i + 1) * step + origin - gap / 2;
    const lit = allLit || i === bishopIdx ? ' mark__wall--lit' : '';
    out.push(`<path class="mark__wall${lit}" data-seg="${i}" d="${block(50, 50, 25, 44, a0, a1)}"/>`);
  }

  return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle class="mark__inner" cx="50" cy="50" r="19"/>
      ${out.join('')}
    </svg>`;
}
