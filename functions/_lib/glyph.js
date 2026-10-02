// The city mark: nine sections of wall seen from above, one per bishop.
//
// Drawn from geometry, not traced from anything. The section belonging to the
// record's assigned bishop is lit, so the mark says who holds the subject
// without needing to be read.

import { BISHOPS } from './lore.js';

export const SEGMENTS = BISHOPS.length;   // nine

/** One section of wall, as an annular sector. */
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

/**
 * @param bishopIdx  index into BISHOPS; that section is lit
 */
export function cityMark(bishopIdx, { className = 'mark', allLit = false } = {}) {
  const CX = 50, CY = 50, R0 = 25, R1 = 44;
  const step = (Math.PI * 2) / SEGMENTS;
  const gap = step * 0.1;               // mortar between sections

  const sections = [];
  // Section 0 is centred on twelve o'clock, which puts a seam at the bottom
  // and leaves two sections straddling it -- nine does not divide evenly.
  const origin = -Math.PI / 2 - step / 2;
  for (let i = 0; i < SEGMENTS; i++) {
    const a0 = i * step + origin + gap / 2;
    const a1 = (i + 1) * step + origin - gap / 2;
    const lit = allLit || i === bishopIdx ? ' mark__wall--lit' : '';
    sections.push(`<path class="mark__wall${lit}" d="${block(CX, CY, R0, R1, a0, a1)}"/>`);
  }

  return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle class="mark__inner" cx="50" cy="50" r="19"/>
      ${sections.join('')}
    </svg>`;
}
