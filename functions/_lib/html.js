import { FORM, SITE } from './config.js';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function h(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i >= values.length) return out + str;
    const v = values[i];
    return out + str + (v && v.__safe ? String(v) : escapeHtml(v));
  }, '');
}

export function raw(html) {
  const s = new String(html);
  s.__safe = true;
  return s;
}

export function spread(text) {
  // spaces become empty <i> so flex can stretch them. that means textContent
  // loses the spaces, which is why the callers also set data-plain
  return [...String(text)]
    .map((ch) => (ch === ' ' ? '<i></i>' : `<span>${escapeHtml(ch)}</span>`))
    .join('');
}

// what a link to this site unfurls into, in a tweet or a group chat. a page
// overrides any of it; most do not need to
const CARD = {
  title: 'FR\u00d8M HERE \u2014\u2014\u2014> T\u00d8 HERE',
  description: 'Make your own identification card and put yourself on the map. '
    + 'Every subject who got out of Dema, and where they came from.',
  image: '/images/og.png',
};

// `index` is off everywhere by default -- the record pages carry people's
// names. the front door has nothing on it worth hiding, and a page nobody
// can index is a page nobody can preview either
export function layout({
  title, body, bodyClass = '', back = true, head = '', social = {}, index = false,
}) {
  const card = { ...CARD, ...social };
  const abs = (u) => (/^https?:/.test(u) ? u : SITE + u);
  const meta = `<meta property="og:type" content="website">
<meta property="og:site_name" content="DEMA ARCHIVES">
<meta property="og:title" content="${escapeHtml(card.title)}">
<meta property="og:description" content="${escapeHtml(card.description)}">
<meta property="og:image" content="${escapeHtml(abs(card.image))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(card.title)}">
<meta name="twitter:description" content="${escapeHtml(card.description)}">
<meta name="twitter:image" content="${escapeHtml(abs(card.image))}">
`;

  const home = back
    ? `<p class="colophon__back"><a href="/incident">&larr; INCIDENT REPORT ${FORM.statute}</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${index ? '' : '<meta name="robots" content="noindex">\n'}
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
${meta}${head}<link rel="stylesheet" href="/styles.css">
</head>
<body class="${escapeHtml(bodyClass)}">
<div class="sheet">
${body}
  <footer class="colophon">
    ${home}<p class="colophon__who"><a href="/about">WHO FILED THIS &mdash;&gt;</a></p>
  </footer>
</div>
</body>
</html>`;
}

export function htmlResponse(markup, { status = 200, headers = {} } = {}) {
  return new Response(markup, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...headers,
    },
  });
}
