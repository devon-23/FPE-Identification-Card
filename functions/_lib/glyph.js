// The perimeter mark: a walled ring seen from above.
//
// Drawn from geometry, not traced from anything. One segment of every ring is
// breached, and which one is a pure function of the designation -- so each
// record carries the same wall broken in its own place.

export const SEGMENTS = 18;

function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export const breachIndex = (id) => hash('breach' + id) % SEGMENTS;

/** One block of the wall, as an annular sector. */
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
 * Every segment is drawn; the breached one carries its own class so the
 * wall can open and close from CSS alone. That lets the live preview break
 * the wall the moment a record stops being blank, with no scripting.
 */
export function perimeterMark(id, { className = 'mark' } = {}) {
  const CX = 50, CY = 50, R0 = 27, R1 = 43;
  const step = (Math.PI * 2) / SEGMENTS;
  const gap = step * 0.22;              // mortar between blocks
  const breach = breachIndex(id);

  const walls = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const a0 = i * step - Math.PI / 2 + gap / 2;
    const a1 = (i + 1) * step - Math.PI / 2 - gap / 2;
    const cls = i === breach ? 'mark__wall mark__wall--gap' : 'mark__wall';
    walls.push(`<path class="${cls}" d="${block(CX, CY, R0, R1, a0, a1)}"/>`);
  }

  // The gap is marked, not merely absent: a hairline where the wall gave way.
  const a = (breach + 0.5) * step - Math.PI / 2;
  const bx0 = (CX + (R0 - 4) * Math.cos(a)).toFixed(2);
  const by0 = (CY + (R0 - 4) * Math.sin(a)).toFixed(2);
  const bx1 = (CX + (R1 + 4) * Math.cos(a)).toFixed(2);
  const by1 = (CY + (R1 + 4) * Math.sin(a)).toFixed(2);

  return `<svg class="${className}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle class="mark__inner" cx="50" cy="50" r="21"/>
      ${walls.join('')}
      <line class="mark__breach" x1="${bx0}" y1="${by0}" x2="${bx1}" y2="${by1}"/>
    </svg>`;
}
